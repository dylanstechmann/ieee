"""Small deterministic mission simulator and optional Gymnasium environment.

This is a synthetic training harness, not a legal route, calibrated robot model,
or physical validation. The classical controller follows explicit line segments;
it never turns toward a later segment before reaching the current endpoint.
"""

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IN = 0.0254
PHASES = ('WAIT_START', 'ENTER', 'LAP', 'TO_PIT', 'EXCHANGE', 'EXIT_PIT', 'PARK', 'DONE', 'STOPPED')


def wrap(a):
    return math.atan2(math.sin(a), math.cos(a))


def clamp(x, lo, hi):
    return max(lo, min(hi, x))


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def center(vertices):
    return (sum(p[0] for p in vertices) / len(vertices) * IN,
            sum(p[1] for p in vertices) / len(vertices) * IN)


def load_spec():
    config = json.loads((ROOT / 'mission-v9.json').read_text())
    layout = json.loads((ROOT / config['source_layout']).read_text())
    return config, layout


def lap_route(layout):
    features = {f['id']: f for f in layout['features']}
    div = features['center_divider_axis']['vertices_in']
    cx = (div[0][0] + div[1][0]) / 2
    cy = div[0][1]
    # Rounded outer corridor. These are training hypotheses, not official lanes.
    points = [(cx + 20, cy + 17), (cx + 26, cy + 17),
              (cx + 27, cy + 16), (cx + 28, cy + 14),
              (cx + 28, cy - 14), (cx + 27, cy - 16),
              (cx + 20, cy - 17), (cx - 24.5, cy - 17),
              (cx - 33, cy - 17), (cx - 33, cy - 12), (cx - 33, cy + 17)]
    return [(x * IN, y * IN) for x, y in points]


def route_length(points):
    return sum(dist(points[i], points[(i + 1) % len(points)]) for i in range(len(points)))


class MissionSim:
    def __init__(self, config=None, layout=None):
        self.config, self.layout = load_spec() if config is None else (config, layout)
        self.features = {f['id']: f for f in self.layout['features']}
        self.lap = lap_route(self.layout)
        self.lap_length = route_length(self.lap)
        self.start = center(self.features['start_box']['vertices_in'])
        self.boxes = {i: center(self.features[f'pit_box_{i}']['vertices_in']) for i in (1, 2, 3)}
        self.entry_route = [(0.80, self.start[1]), self.lap[0]]
        self.rng = None
        self.state = None

    def _random(self):
        self.rng = (self.rng * 1664525 + 1013904223) & 0xffffffff
        return self.rng / 4294967296

    def reset(self, seed=0, options=None):
        options = options or {}
        self.rng = seed & 0xffffffff
        self.assigned_box = options.get('assigned_box', 1 + seed % 3)
        self.exchange_success = options.get('exchange_success', True)
        self.traction = options.get('traction', 0.85 + 0.3 * self._random())
        self.obstacle_enabled = options.get('obstacle_enabled', True)
        self.noise = options.get('noise', True)
        self.obstacle = self._obstacle(seed)
        start_x, start_y, start_yaw = options.get('start_pose', (self.start[0] + 0.05, self.start[1], 0.0))
        self.state = {
            't': 0.0, 'x': start_x, 'y': start_y, 'yaw': start_yaw,
            'v': 0.0, 'yaw_rate': 0.0, 'phase': 'WAIT_START', 'phase_t': 0.0,
            'lap': 0, 'segment': 0, 'lap_start_distance': 0.0, 'segment_start_distance': 0.0,
            'distance': 0.0, 'entered': False, 'green_start': False,
            'wall_contacts': [0, 0, 0], 'obstacle_contacts': [0, 0, 0],
            'exchange_attempt': 0, 'exchange_result': None, 'tire_drop': 'none',
            'tire_pickup': 'none', 'blue_retained': False, 'flag_up': False,
            'finish_seconds': None, 'parked': False, 'stop_reason': None,
            'collisions': 0, 'reward_events': [], 'entry_index': 0, 'exit_index': 0,
        }
        return self.observation()

    def _obstacle(self, seed):
        div = self.features['center_divider_axis']['vertices_in']
        cx = (div[0][0] + div[1][0]) / 2 * IN
        cy = div[0][1] * IN
        side = 1 if seed % 2 else -1
        return (cx + (-0.25 if seed % 3 else 0.25), cy + side * 0.30)

    def _go(self, phase):
        self.state['phase'] = phase
        self.state['phase_t'] = 0.0

    def _event(self, name, value=0.0):
        self.state['reward_events'].append({'t': round(self.state['t'], 3), 'event': name, 'value': value})

    def _target(self):
        s = self.state
        if s['phase'] in ('TO_PIT', 'PARK'):
            return self.boxes[self.assigned_box]
        if s['phase'] == 'EXIT_PIT':
            return self.entry_route[s['exit_index']]
        if s['phase'] == 'ENTER':
            return self.entry_route[s['entry_index']]
        return self.lap[(s['segment'] + 1) % len(self.lap)]

    def classical_action(self):
        s = self.state
        if s['phase'] in ('WAIT_START', 'EXCHANGE', 'DONE', 'STOPPED'):
            return (0.0, 0.0)
        tx, ty = self._target()
        desired = math.atan2(ty - s['y'], tx - s['x'])
        error = wrap(desired - s['yaw'])
        distance = math.hypot(tx - s['x'], ty - s['y'])
        c = self.config['control']
        speed = c['approach_speed_m_s'] if s['phase'] != 'LAP' else c['cruise_speed_m_s']
        speed = min(speed, math.sqrt(2 * c['max_acceleration_m_s2'] * max(0, distance - 0.025)))
        speed *= clamp(1.0 - abs(error) / 1.5, 0.0, 1.0)
        if distance > 0.01 and abs(error) < 0.35:
            speed = max(speed, 0.035)
        if abs(error) > 0.85:
            speed = 0.0
        yaw_rate = clamp(c['heading_gain'] * error, -c['max_yaw_rate_rad_s'], c['max_yaw_rate_rad_s'])
        return speed / c['max_speed_m_s'], yaw_rate / c['max_yaw_rate_rad_s']

    def observation(self):
        s = self.state
        tx, ty = self._target()
        dx, dy = tx - s['x'], ty - s['y']
        noise = self.config['mission']['observation_noise_m'] if self.noise else 0.0
        nx, ny = ((self._random() - 0.5) * 2 * noise for _ in range(2)) if self.noise else (0.0, 0.0)
        angle = wrap(math.atan2(dy, dx) - s['yaw'])
        return [s['x'] + nx, s['y'] + ny, math.sin(s['yaw']), math.cos(s['yaw']),
                s['v'] / self.config['control']['max_speed_m_s'],
                s['yaw_rate'] / self.config['control']['max_yaw_rate_rad_s'],
                math.cos(angle), math.sin(angle), clamp(math.hypot(dx, dy) / 2.5, 0, 1),
                s['lap'] / 3, PHASES.index(s['phase']) / (len(PHASES) - 1),
                self.assigned_box / 3, s['exchange_attempt'] / self.config['mission']['exchange_attempts'],
                float(s['blue_retained']), float(s['flag_up']), s['t'] / 180,
                clamp(dist((s['x'], s['y']), self.obstacle) / 1.5, 0, 1) if self.obstacle_enabled else 1.0,
                self.traction]

    def _contact(self, nx, ny):
        s = self.state
        c, f = self.config['control'], self.config['field']
        hx, hy = c['footprint_m'][0] / 2, c['footprint_m'][1] / 2
        if c.get('footprint_shape') == 'round':
            ex = ey = hx
        else:
            co, si = math.cos(s['yaw']), math.sin(s['yaw'])
            ex, ey = abs(co) * hx + abs(si) * hy, abs(si) * hx + abs(co) * hy
        hit_wall = nx - ex < f['wall_margin_m'] or nx + ex > 96 * IN - f['wall_margin_m'] or ny - ey < f['wall_margin_m'] or ny + ey > 48 * IN - f['wall_margin_m']
        div = self.features['center_divider_axis']['vertices_in']
        x0, x1 = sorted([div[0][0] * IN, div[1][0] * IN])
        hit_divider = x0 - ex < nx < x1 + ex and abs(ny - div[0][1] * IN) < ey + f['center_divider_width_m'] / 2
        pd = self.features['pit_divider_axis']['vertices_in']
        y0, y1 = sorted([pd[0][1] * IN, pd[1][1] * IN])
        hit_pit = y0 - ey < ny < y1 + ey and abs(nx - pd[0][0] * IN) < ex + f['pit_divider_width_m'] / 2
        radius = math.hypot(hx, hy)
        hit_obstacle = self.obstacle_enabled and dist((nx, ny), self.obstacle) < radius + f['obstacle_radius_m']
        if hit_wall or hit_divider or hit_pit or hit_obstacle:
            s['collisions'] += 1
            lap = min(s['lap'], 2)
            if hit_obstacle:
                s['obstacle_contacts'][lap] += 1
            else:
                s['wall_contacts'][lap] += 1
            s['x'], s['y'] = s['previous_x'], s['previous_y']
            s['v'] = 0.0
            s['stop_reason'] = 'collision'
            self._go('STOPPED')
            return True
        return False

    def _advance_segment(self):
        s = self.state
        target = self.lap[(s['segment'] + 1) % len(self.lap)]
        previous = self.lap[s['segment']]
        length = dist(previous, target)
        vx, vy = target[0] - previous[0], target[1] - previous[1]
        projected = ((s['x'] - previous[0]) * vx + (s['y'] - previous[1]) * vy) / (length * length)
        traveled = s['distance'] - s['segment_start_distance']
        if dist((s['x'], s['y']), target) < 0.06 and traveled >= 0.75 * length:
            s['segment_start_distance'] = s['distance']
            s['segment'] = (s['segment'] + 1) % len(self.lap)
            if s['segment'] == 0 and s['distance'] - s['lap_start_distance'] >= 0.85 * self.lap_length:
                s['lap'] += 1
                s['lap_start_distance'] = s['distance']
                self._event('lap_complete', 100 if s['lap'] > 3 else 0)
                if s['lap'] > 3:
                    s['finish_seconds'] = s['t']
                    self._go('PARK')
                elif s['lap'] == self.config['mission']['pit_after_lap'] + 1:
                    self._go('TO_PIT')

    def _mission(self):
        s = self.state
        if s['phase'] == 'WAIT_START':
            if s['phase_t'] >= self.config['mission']['flag_confirm_frames'] * self.config['dt_s']:
                s['green_start'] = True
                self._go('ENTER')
                self._event('green_start', 10)
        elif s['phase'] == 'ENTER':
            target = self.entry_route[s['entry_index']]
            if dist((s['x'], s['y']), target) < 0.12:
                if s['entry_index'] < len(self.entry_route) - 1:
                    s['entry_index'] += 1
                else:
                    s['entered'] = True
                    s['lap'] = 1
                    s['segment'] = 0
                    s['lap_start_distance'] = s['distance']
                    s['segment_start_distance'] = s['distance']
                    self._go('LAP')
                    self._event('entered_course', 25)
        elif s['phase'] == 'LAP':
            self._advance_segment()
        elif s['phase'] in ('TO_PIT', 'PARK'):
            box = self.boxes[self.assigned_box]
            if dist((s['x'], s['y']), box) < self.config['mission']['pit_box_center_tolerance_m']:
                s['v'] = 0.0
                if s['phase'] == 'PARK':
                    s['parked'] = True
                    self._go('DONE')
                    self._event('parked_assigned', 15)
                else:
                    s['exchange_attempt'] = 1
                    self._go('EXCHANGE')
        elif s['phase'] == 'EXCHANGE':
            if s['phase_t'] >= self.config['mission']['exchange_duration_s']:
                if self.exchange_success:
                    s['exchange_result'] = 'done'
                    s['tire_drop'] = 'assigned'
                    s['tire_pickup'] = 'assigned'
                    s['blue_retained'] = True
                    self._event('tire_exchange', 65)
                else:
                    s['exchange_result'] = 'bailed_out'
                    self._event('exchange_bailout', 0)
                self._go('EXIT_PIT')
        elif s['phase'] == 'EXIT_PIT':
            target = self.entry_route[s['exit_index']]
            if dist((s['x'], s['y']), target) < 0.12:
                if s['exit_index'] < len(self.entry_route) - 1:
                    s['exit_index'] += 1
                else:
                    s['flag_up'] = True
                    self._event('school_flag', 25)
                    self._go('LAP')

    def step(self, action=None):
        s = self.state
        if s['phase'] in ('DONE', 'STOPPED'):
            return self.observation(), 0.0, True, self.info()
        if action is None:
            action = self.classical_action()
        if len(action) != 2 or not all(math.isfinite(x) for x in action):
            raise ValueError('action must contain two finite values')
        c, dt = self.config['control'], self.config['dt_s']
        target_v = clamp(float(action[0]), -1, 1) * c['max_speed_m_s'] * self.traction
        target_w = clamp(float(action[1]), -1, 1) * c['max_yaw_rate_rad_s'] * self.traction
        s['v'] += clamp(target_v - s['v'], -c['max_acceleration_m_s2'] * dt, c['max_acceleration_m_s2'] * dt)
        s['yaw_rate'] += clamp(target_w - s['yaw_rate'], -c['max_yaw_acceleration_rad_s2'] * dt, c['max_yaw_acceleration_rad_s2'] * dt)
        s['previous_x'], s['previous_y'] = s['x'], s['y']
        next_yaw = wrap(s['yaw'] + s['yaw_rate'] * dt)
        dx = s['v'] * math.cos((s['yaw'] + next_yaw) / 2) * dt
        dy = s['v'] * math.sin((s['yaw'] + next_yaw) / 2) * dt
        s['x'] += dx
        s['y'] += dy
        s['yaw'] = next_yaw
        s['distance'] += math.hypot(dx, dy)
        s['t'] += dt
        s['phase_t'] += dt
        collided = self._contact(s['x'], s['y'])
        self._mission()
        if s['t'] >= self.config['auto_stop_s'] and s['phase'] not in ('DONE', 'STOPPED'):
            s['stop_reason'] = 'auto_stop'
            self._go('STOPPED')
        reward = math.hypot(dx, dy) - 0.002 - (0.08 if collided else 0.0)
        if s['phase'] == 'EXCHANGE':
            reward -= 0.002
        if s['phase'] == 'DONE':
            reward += 5.0
        if s['phase'] == 'STOPPED':
            reward -= 2.0
        return self.observation(), reward, s['phase'] in ('DONE', 'STOPPED'), self.info()

    def info(self):
        s = self.state
        clean_wall = [n == 0 for n in s['wall_contacts']]
        clean_obstacle = [n == 0 for n in s['obstacle_contacts']]
        score = ((25 if s['entered'] else 0) + (100 if s['finish_seconds'] is not None else 0)
                 + (30 if s['finish_seconds'] is not None and s['finish_seconds'] < 165 else 0)
                 + (10 if s['green_start'] else 0) + (15 if s['parked'] else 0)
                 + ({'none': 0, 'assigned': 25, 'other': 12}[s['tire_drop']])
                 + ({'none': 0, 'assigned': 40, 'other': 20}[s['tire_pickup']] if s['blue_retained'] else 0)
                 + sum(clean_wall) * 15 + sum(clean_obstacle) * 25 + (25 if s['flag_up'] else 0))
        return {'phase': s['phase'], 'time_s': round(s['t'], 3), 'laps_completed': max(0, s['lap'] - 1),
                'assigned_box': self.assigned_box, 'entered': s['entered'], 'finish_seconds': s['finish_seconds'],
                'parked': s['parked'], 'exchange_result': s['exchange_result'], 'blue_retained': s['blue_retained'],
                'collisions': s['collisions'], 'wall_contacts': s['wall_contacts'], 'obstacle_contacts': s['obstacle_contacts'],
                'score_like_total': score, 'score_status': 'synthetic event arithmetic, not referee adjudication',
                'pose': [s['x'], s['y'], s['yaw']], 'target': self._target(), 'events': s['reward_events']}


class MissionEnv:
    def __init__(self, config=None, layout=None, seed=0, evaluation=False):
        self.sim = MissionSim(config, layout)
        self.seed = seed
        self.evaluation = evaluation
        self.episode = 0
        try:
            from gymnasium import spaces
            import numpy as np
            self.action_space = spaces.Box(-1.0, 1.0, shape=(2,), dtype=np.float32)
            self.observation_space = spaces.Box(-np.inf, np.inf, shape=(18,), dtype=np.float32)
        except ImportError:
            self.action_space = self.observation_space = None

    def reset(self, *, seed=None, options=None):
        if seed is not None:
            self.seed = seed
        episode_seed = self.seed if self.evaluation else self.seed + self.episode
        self.episode += 1
        obs = self.sim.reset(episode_seed, options)
        return self._array(obs), {'seed': episode_seed}

    def step(self, action):
        obs, reward, done, info = self.sim.step(action)
        return self._array(obs), reward, done, False, info

    def _array(self, obs):
        try:
            import numpy as np
            return np.asarray(obs, dtype=np.float32)
        except ImportError:
            return obs


def evaluate(seeds=range(100, 120), options=None):
    rows = []
    for seed in seeds:
        sim = MissionSim()
        sim.reset(seed, options)
        done = False
        while not done:
            _, _, done, info = sim.step()
        rows.append({'seed': seed, **info})
    return rows


if __name__ == '__main__':
    rows = evaluate()
    print(json.dumps({'episodes': len(rows), 'completed': sum(r['phase'] == 'DONE' for r in rows),
                      'mean_score_like': sum(r['score_like_total'] for r in rows) / len(rows),
                      'total_collisions': sum(r['collisions'] for r in rows), 'results': rows}, indent=2))
