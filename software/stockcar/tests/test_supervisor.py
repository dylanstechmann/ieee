import pathlib
import random
import sys
import unittest

from stockcar.supervisor import DONE, ENTER, LAP, STOPPED, Supervisor

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
from match_logic import MatchLogic  # noqa: E402  (software/match_logic.py)

SHARED = ('state', 'flag_servo', 'laps', 'assigned_box', 'box_source', 'exchange_attempt', 'exchange_result', 'elapsed_s')


def scripted_run(seed):
    """A random but plausible observation stream: flag start, laps, pit, exchange, park."""
    rng = random.Random(seed)
    obs_stream = []
    t = 0.0
    odo = 0.0
    for _ in range(12):
        obs_stream.append((t, {'flag_up': False, 'tag_id': rng.choice([1, 2, 3, None])}))
        t += 0.05
    for _ in range(3):
        obs_stream.append((t, {'flag_up': True, 'tag_id': 2}))
        t += 0.05
    for step in range(3000):
        odo += 0.01
        obs = {'odometry_m': odo}
        if step % 404 == 403 or step == 20:
            obs['checker_crossing'] = True
        if rng.random() < 0.002:
            obs['checker_crossing'] = True  # spurious crossing
        if step in (1300, 1301):
            obs['at_pit_box'] = True
        if step == 1500:
            obs['exchange_failed'] = True
        if step == 1700:
            obs['exchange_done'] = True
        if step > 2700:
            obs['in_assigned_box'] = True
        obs_stream.append((t, obs))
        t += 0.05
    return obs_stream


class SupervisorTests(unittest.TestCase):
    def test_matches_match_logic_on_shared_outputs(self):
        for seed in range(5):
            a, b = MatchLogic(), Supervisor('aggressive', stall_s=1e9)
            for t, obs in scripted_run(seed):
                out_a, out_b = a.update(t, obs), b.update(t, obs)
                self.assertEqual({k: out_a[k] for k in SHARED}, {k: out_b[k] for k in SHARED}, f'seed {seed} at t={t}')

    def test_presets(self):
        self.assertEqual(Supervisor('safe').cfg['exchange_attempts'], 1)
        self.assertFalse(Supervisor('drive_only').cfg['attempt_exchange'])
        with self.assertRaises(ValueError):
            Supervisor('reckless')

    def test_drive_only_skips_exchange(self):
        s = Supervisor('drive_only', pit_after_lap=1)
        s.state, s.laps, s.t0 = 'TO_PIT', 1, 0.0
        out = s.update(10.0, {'at_pit_box': True, 'odometry_m': 5.0})
        self.assertEqual(out['state'], 'EXIT_PIT')
        self.assertEqual(out['exchange_result'], 'skipped')

    def test_stall_triggers_recovery_then_stop(self):
        s = Supervisor('safe', stall_s=1.0, recover_s=0.5, max_recoveries=2)
        s.state, s.t0 = LAP, 0.0
        t, outputs = 0.0, []
        while t < 10 and s.state != STOPPED:
            outputs.append(s.update(t, {'odometry_m': 1.0}))
            t += 0.05
        self.assertIn('recover', [o['motion'] for o in outputs])
        self.assertEqual(s.state, STOPPED)
        self.assertEqual(s.stop_reason, 'stalled')

    def test_progress_resets_watchdog(self):
        s = Supervisor('safe', stall_s=1.0)
        s.state, s.t0 = ENTER, 0.0
        odo = 0.0
        for k in range(200):
            odo += 0.005  # 0.1 m/s
            out = s.update(k * 0.05, {'odometry_m': odo})
        self.assertEqual(out['recoveries'], 0)

    def test_estop_and_auto_stop(self):
        s = Supervisor()
        s.state, s.t0 = LAP, 0.0
        self.assertEqual(s.update(178.0, {})['stop_reason'], 'auto_stop')
        s = Supervisor()
        s.state, s.t0 = LAP, 0.0
        self.assertEqual(s.update(1.0, {'estop': True})['state'], STOPPED)
        self.assertNotEqual(s.update(2.0, {})['state'], DONE)


if __name__ == '__main__':
    unittest.main()
