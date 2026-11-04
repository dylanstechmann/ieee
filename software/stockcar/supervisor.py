"""Mission supervisor v10: match_logic.py plus pre-match presets and a no-progress watchdog.

Pure logic with no I/O, in the MicroPython-compatible subset (no dataclasses, typing or enum), so
the same file can run on the robot and in the simulator. Default settings reproduce
software/match_logic.py on its shared outputs (tests/test_supervisor.py checks this).

Additions:
- preset: 'aggressive' (match_logic behavior), 'safe' (one exchange attempt, slower) or
  'drive_only' (visit the pit but skip the exchange). The Technician chooses it before
  randomization (G08); choosing after randomization is open question QA02.
- progress watchdog: in a driving state, no odometry progress for stall_s requests 'recover'
  motion for recover_s. After max_recoveries the robot stops ('stalled').
"""

WAIT_START = 'WAIT_START'
SWITCH_HOLD = 'SWITCH_HOLD'
ENTER = 'ENTER'
LAP = 'LAP'
TO_PIT = 'TO_PIT'
EXCHANGE = 'EXCHANGE'
EXIT_PIT = 'EXIT_PIT'
PARK = 'PARK'
DONE = 'DONE'
STOPPED = 'STOPPED'

MOTION = {WAIT_START: 'hold', SWITCH_HOLD: 'hold', ENTER: 'enter', LAP: 'lap', TO_PIT: 'to_pit',
          EXCHANGE: 'exchange', EXIT_PIT: 'exit_pit', PARK: 'to_box', DONE: 'stop', STOPPED: 'stop'}
DRIVING = (ENTER, LAP, TO_PIT, EXIT_PIT, PARK)

DEFAULTS = {
    'flag_confirm_frames': 3,
    'flag_down_frames_to_arm': 10,
    'switch_hold_s': 5.0,
    'lap_length_m': 4.04,
    'lap_tolerance': 0.15,
    'pit_after_lap': 2,
    'exchange_budget_s': 20.0,
    'exchange_attempts': 2,
    'attempt_exchange': True,
    'speed_scale': 1.0,
    'stop_at_s': 178.0,
    'tag_votes_needed': 3,
    'fallback_box': 2,
    'stall_s': 5.0,
    'stall_min_progress_m': 0.02,
    'recover_s': 2.0,
    'max_recoveries': 3,
}

PRESETS = {
    'aggressive': {},
    'safe': {'exchange_attempts': 1, 'speed_scale': 0.85},
    'drive_only': {'attempt_exchange': False, 'speed_scale': 0.85},
}


class Supervisor:
    def __init__(self, preset='aggressive', **overrides):
        if preset not in PRESETS:
            raise ValueError('unknown preset ' + str(preset))
        unknown = set(overrides) - set(DEFAULTS)
        if unknown:
            raise ValueError('unknown settings: ' + ', '.join(sorted(unknown)))
        self.cfg = dict(DEFAULTS)
        self.cfg.update(PRESETS[preset])
        self.cfg.update(overrides)
        if self.cfg['pit_after_lap'] not in (1, 2):
            raise ValueError('pit_after_lap must be 1 or 2')
        self.preset = preset
        self.state = WAIT_START
        self.t0 = None
        self.start_kind = None
        self.laps = 0
        self.flag_up = False
        self.tag_votes = {}
        self.assigned_box = None
        self.box_source = None
        self.down_frames = 0
        self.up_frames = 0
        self.armed = False
        self.lap_ref_m = 0.0
        self.exchange_started = None
        self.exchange_attempt = 0
        self.exchange_result = None
        self.progress_t = None
        self.progress_odo = None
        self.recover_until = None
        self.recoveries = 0
        self.stop_reason = None
        self.events = []

    def update(self, now, obs):
        if self.state in (DONE, STOPPED):
            return self._out(now)
        if obs.get('estop'):
            self._stop(now, 'estop', 'e-stop')
            return self._out(now)
        if self.t0 is not None and now - self.t0 >= self.cfg['stop_at_s']:
            self._stop(now, 'auto_stop', 'auto-stop before 3:00')
            return self._out(now)
        self._vote(obs.get('tag_id'))
        self._watch_progress(now, obs)
        if self.state in (DONE, STOPPED):
            return self._out(now)
        getattr(self, '_' + self.state.lower())(now, obs)
        return self._out(now)

    def _wait_start(self, now, obs):
        if obs.get('start_switch'):
            self._start(now, 'switch')
            self._go(now, SWITCH_HOLD, 'start switch pressed; holding still for %.1f s' % self.cfg['switch_hold_s'])
            return
        flag = obs.get('flag_up')
        if flag is True and self.armed:
            self.up_frames += 1
            if self.up_frames >= self.cfg['flag_confirm_frames']:
                self._start(now, 'flag')
                self._go(now, ENTER, 'green flag confirmed')
            return
        self.up_frames = 0
        if flag is False:
            self.down_frames += 1
            if not self.armed and self.down_frames >= self.cfg['flag_down_frames_to_arm']:
                self.armed = True
                self._log(now, 'flag seen down; start detector armed')

    def _switch_hold(self, now, obs):
        if now - self.t0 >= self.cfg['switch_hold_s']:
            self._go(now, ENTER, 'static period over')

    def _enter(self, now, obs):
        if obs.get('checker_crossing'):
            self.lap_ref_m = obs.get('odometry_m', 0.0)
            self._go(now, LAP, 'entered the course; lap 1 begins')

    def _lap(self, now, obs):
        if not obs.get('checker_crossing'):
            return
        odo = obs.get('odometry_m', 0.0)
        need = (1 - self.cfg['lap_tolerance']) * self.cfg['lap_length_m']
        if odo - self.lap_ref_m < need:
            self._log(now, 'crossing ignored after %.2f m (< %.2f m)' % (odo - self.lap_ref_m, need))
            return
        self.laps += 1
        self.lap_ref_m = odo
        self._log(now, 'lap %d complete' % self.laps)
        if self.laps == 3:
            self._go(now, PARK, 'race finished; parking in box %s' % self.assigned_box)
        elif self.laps == self.cfg['pit_after_lap']:
            self._resolve_box(now)
            self._go(now, TO_PIT, 'heading to pit box %s' % self.assigned_box)
        elif self.laps == 2:
            self._raise_flag(now)

    def _to_pit(self, now, obs):
        if obs.get('checker_crossing'):
            self._log(now, 'crossing ignored on the way into the pit')
        if obs.get('at_pit_box'):
            if not self.cfg['attempt_exchange']:
                self.exchange_result = 'skipped'
                self._go(now, EXIT_PIT, 'drive-only preset: exchange skipped')
                return
            self.exchange_attempt = 1
            self.exchange_started = now
            self._go(now, EXCHANGE, 'at pit box %s; exchange attempt 1' % self.assigned_box)

    def _exchange(self, now, obs):
        if obs.get('exchange_done'):
            self.exchange_result = 'done'
            self._go(now, EXIT_PIT, 'exchange done; keep the blue tire to the finish')
        elif obs.get('exchange_failed') or now - self.exchange_started >= self.cfg['exchange_budget_s']:
            if self.exchange_attempt < self.cfg['exchange_attempts']:
                self.exchange_attempt += 1
                self.exchange_started = now
                self._log(now, 'exchange attempt %d' % self.exchange_attempt)
            else:
                self.exchange_result = 'bailed out'
                self._go(now, EXIT_PIT, 'exchange abandoned; finishing the laps')

    def _exit_pit(self, now, obs):
        if obs.get('checker_crossing'):
            self.lap_ref_m = obs.get('odometry_m', 0.0)
            self._go(now, LAP, 'back on the course; lap %d begins' % (self.laps + 1))
            if self.laps == 2:
                self._raise_flag(now)

    def _park(self, now, obs):
        if obs.get('in_assigned_box'):
            self._go(now, DONE, 'parked in box %s' % self.assigned_box)

    def _watch_progress(self, now, obs):
        if self.state not in DRIVING or 'odometry_m' not in obs:
            self.progress_t = None
            return
        odo = obs['odometry_m']
        if self.progress_t is None or abs(odo - self.progress_odo) >= self.cfg['stall_min_progress_m']:
            self.progress_t, self.progress_odo = now, odo
            return
        if self.recover_until is not None:
            if now < self.recover_until:
                return
            self.recover_until = None
            self.progress_t, self.progress_odo = now, odo
            return
        if now - self.progress_t >= self.cfg['stall_s']:
            self.recoveries += 1
            if self.recoveries > self.cfg['max_recoveries']:
                self._stop(now, 'stalled', 'no progress after %d recoveries' % self.cfg['max_recoveries'])
                return
            self.recover_until = now + self.cfg['recover_s']
            self._log(now, 'no progress for %.1f s; recovery %d' % (self.cfg['stall_s'], self.recoveries))

    def _start(self, now, kind):
        self.t0 = now
        self.start_kind = kind
        self._resolve_box(now)

    def _raise_flag(self, now):
        if not self.flag_up:
            self.flag_up = True
            self._log(now, 'final lap: school flag raised')

    def _vote(self, tag_id):
        if tag_id in (1, 2, 3) and self.state in (WAIT_START, SWITCH_HOLD, ENTER, LAP):
            self.tag_votes[tag_id] = self.tag_votes.get(tag_id, 0) + 1

    def _resolve_box(self, now):
        if self.box_source == 'tag':
            return
        ranked = sorted(self.tag_votes.items(), key=lambda kv: -kv[1])
        best = ranked[0] if ranked else (None, 0)
        runner_up = ranked[1][1] if len(ranked) > 1 else 0
        if best[1] >= self.cfg['tag_votes_needed'] and best[1] > runner_up:
            self.assigned_box, self.box_source = best[0], 'tag'
            self._log(now, 'pit box %d from %d tag reads' % (best[0], best[1]))
        elif self.box_source is None:
            self.assigned_box, self.box_source = self.cfg['fallback_box'], 'fallback'
            self._log(now, 'no reliable tag read; using fallback box %d' % self.assigned_box)

    def _stop(self, now, reason, why):
        self.stop_reason = reason
        self._go(now, STOPPED, why)

    def _go(self, now, state, why):
        self.state = state
        self._log(now, why)

    def _log(self, now, text):
        self.events.append((round(now, 3), text))

    def _out(self, now):
        recovering = self.recover_until is not None and self.state in DRIVING
        return {'state': self.state, 'motion': 'recover' if recovering else MOTION[self.state],
                'flag_servo': 'up' if self.flag_up else 'down', 'laps': self.laps,
                'assigned_box': self.assigned_box, 'box_source': self.box_source,
                'exchange_attempt': self.exchange_attempt, 'exchange_result': self.exchange_result,
                'elapsed_s': None if self.t0 is None else round(now - self.t0, 3),
                'speed_scale': self.cfg['speed_scale'], 'recoveries': self.recoveries,
                'stop_reason': self.stop_reason, 'preset': self.preset}
