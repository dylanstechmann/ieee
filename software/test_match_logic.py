"""Host tests for match_logic.py (standard library only).

  uv run --no-project --python 3.12 python -I -m unittest discover -s software -v
"""
import unittest

import match_logic as m


def run(logic, script):
    """script: iterable of (t, obs); returns the last output."""
    out = None
    for t, obs in script:
        out = logic.update(t, obs)
    return out


def armed_logic(**cfg):
    logic = m.MatchLogic(**cfg)
    run(logic, [(i * 0.033, {'flag_up': False, 'tag_id': 3}) for i in range(10)])
    return logic


def frames(t0, n, **obs):
    return [(t0 + i * 0.033, dict(obs)) for i in range(n)]


class StartTests(unittest.TestCase):
    def test_flag_never_seen_down_never_starts(self):
        logic = m.MatchLogic()
        out = run(logic, frames(0, 50, flag_up=True))
        self.assertEqual(out['state'], m.WAIT_START)
        self.assertEqual(out['motion'], 'hold')

    def test_green_blip_and_missed_frames_do_not_start(self):
        logic = armed_logic()
        script = (frames(1.0, 2, flag_up=True) + frames(1.1, 1, flag_up=None) + frames(1.2, 2, flag_up=True)
                  + frames(1.3, 1, flag_up=False))
        self.assertEqual(run(logic, script)['state'], m.WAIT_START)
        self.assertEqual(run(logic, frames(2.0, 2, flag_up=True))['state'], m.WAIT_START)
        out = run(logic, frames(2.1, 1, flag_up=True))
        self.assertEqual(out['state'], m.ENTER)
        self.assertEqual(logic.start_kind, 'flag')

    def test_switch_start_holds_still_for_five_seconds(self):
        logic = m.MatchLogic()
        run(logic, [(1.0, {'start_switch': True})])
        self.assertEqual(logic.update(5.9, {})['motion'], 'hold')
        self.assertEqual(logic.update(6.0, {})['state'], m.ENTER)
        self.assertEqual(logic.start_kind, 'switch')


class TagTests(unittest.TestCase):
    def start_with_votes(self, votes):
        logic = m.MatchLogic()
        run(logic, [(i * 0.033, {'flag_up': False, 'tag_id': v}) for i, v in enumerate(votes + [None] * 10)])
        run(logic, frames(1.0, 3, flag_up=True))
        return logic

    def test_majority_with_enough_reads_wins(self):
        logic = self.start_with_votes([2, 2, 3, 2])
        self.assertEqual((logic.assigned_box, logic.box_source), (2, 'tag'))

    def test_too_few_or_tied_reads_fall_back(self):
        for votes in ([], [1, 1], [1, 1, 1, 3, 3, 3]):
            logic = self.start_with_votes(votes)
            self.assertEqual((logic.assigned_box, logic.box_source), (2, 'fallback'), votes)

    def test_late_reads_before_the_pit_replace_the_fallback(self):
        logic = self.start_with_votes([])
        run(logic, [(2.0, {'checker_crossing': True, 'odometry_m': 0.0})])
        run(logic, [(2.1 + i * 0.1, {'tag_id': 1}) for i in range(3)])
        run(logic, [(10.0, {'checker_crossing': True, 'odometry_m': 4.1}),
                    (20.0, {'checker_crossing': True, 'odometry_m': 8.2})])
        self.assertEqual(logic.state, m.TO_PIT)
        self.assertEqual((logic.assigned_box, logic.box_source), (1, 'tag'))


class RaceTests(unittest.TestCase):
    def started(self, **cfg):
        logic = armed_logic(**cfg)
        run(logic, frames(1.0, 3, flag_up=True))
        run(logic, [(2.0, {'checker_crossing': True, 'odometry_m': 0.3})])
        self.assertEqual(logic.state, m.LAP)
        return logic

    def test_short_crossings_are_ignored(self):
        logic = self.started()
        logic.update(5.0, {'checker_crossing': True, 'odometry_m': 1.0})
        self.assertEqual(logic.laps, 0)
        logic.update(9.0, {'checker_crossing': True, 'odometry_m': 0.3 + 3.44})
        self.assertEqual(logic.laps, 1)

    def test_full_mission_with_pit_after_lap_two(self):
        logic = self.started()
        run(logic, [(15.0, {'checker_crossing': True, 'odometry_m': 4.4}),
                    (15.4, {'checker_crossing': True, 'odometry_m': 4.6})])
        self.assertEqual(logic.laps, 1)
        out = run(logic, [(28.0, {'checker_crossing': True, 'odometry_m': 8.5})])
        self.assertEqual((out['state'], out['flag_servo']), (m.TO_PIT, 'down'))
        run(logic, [(29.0, {'checker_crossing': True, 'odometry_m': 8.7}), (33.0, {'at_pit_box': True})])
        self.assertEqual(logic.state, m.EXCHANGE)
        run(logic, [(40.0, {'exchange_done': True})])
        out = run(logic, [(44.0, {'checker_crossing': True, 'odometry_m': 10.0})])
        self.assertEqual((out['state'], out['flag_servo'], out['laps']), (m.LAP, 'up', 2))
        out = run(logic, [(58.0, {'checker_crossing': True, 'odometry_m': 14.1})])
        self.assertEqual((out['state'], out['motion'], out['laps']), (m.PARK, 'to_box', 3))
        out = run(logic, [(63.0, {'in_assigned_box': True})])
        self.assertEqual((out['state'], out['motion'], out['exchange_result']), (m.DONE, 'stop', 'done'))
        self.assertEqual(logic.update(70.0, {'checker_crossing': True, 'odometry_m': 30})['state'], m.DONE)

    def test_pit_after_lap_one_raises_flag_when_lap_two_completes(self):
        logic = self.started(pit_after_lap=1)
        run(logic, [(15.0, {'checker_crossing': True, 'odometry_m': 4.4}), (18.0, {'at_pit_box': True}),
                    (25.0, {'exchange_done': True}), (28.0, {'checker_crossing': True, 'odometry_m': 5.5})])
        self.assertEqual((logic.state, logic.flag_up), (m.LAP, False))
        out = run(logic, [(42.0, {'checker_crossing': True, 'odometry_m': 9.6})])
        self.assertEqual((out['laps'], out['flag_servo'], out['state']), (2, 'up', m.LAP))

    def test_exchange_retries_then_bails_out(self):
        logic = self.started(exchange_budget_s=20.0, exchange_attempts=2)
        run(logic, [(15.0, {'checker_crossing': True, 'odometry_m': 4.4}),
                    (28.0, {'checker_crossing': True, 'odometry_m': 8.5}), (30.0, {'at_pit_box': True})])
        self.assertEqual(logic.update(49.9, {})['exchange_attempt'], 1)
        self.assertEqual(logic.update(50.0, {})['exchange_attempt'], 2)
        out = logic.update(55.0, {'exchange_failed': True})
        self.assertEqual((out['state'], out['exchange_result']), (m.EXIT_PIT, 'bailed out'))


class SafetyTests(unittest.TestCase):
    def test_auto_stop_two_seconds_before_three_minutes(self):
        logic = armed_logic()
        run(logic, [(1.0 + 0.25 * i, {'flag_up': True}) for i in range(3)])  # exact binary times
        self.assertEqual(logic.t0, 1.5)
        self.assertEqual(logic.update(179.25, {})['state'], m.ENTER)
        out = logic.update(179.5, {})
        self.assertEqual((out['state'], out['motion']), (m.STOPPED, 'stop'))

    def test_estop_wins_and_latches(self):
        logic = armed_logic()
        run(logic, frames(1.0, 3, flag_up=True))
        self.assertEqual(logic.update(3.0, {'estop': True})['motion'], 'stop')
        self.assertEqual(logic.update(4.0, {'checker_crossing': True})['state'], m.STOPPED)

    def test_bad_settings_are_rejected(self):
        with self.assertRaises(ValueError):
            m.MatchLogic(lap_lenght_m=4.0)
        with self.assertRaises(ValueError):
            m.MatchLogic(pit_after_lap=3)


if __name__ == '__main__':
    unittest.main()
