"""Host tests for the synthetic v9 route follower; no hardware or legality claims."""
import math
import unittest

import mission_v9 as m


def run_until(sim, phases, limit=5000):
    for _ in range(limit):
        _, _, done, info = sim.step()
        if info['phase'] in phases or done:
            return info
    raise AssertionError(f'phase did not reach {phases}: {sim.info()}')


class GeometryTests(unittest.TestCase):
    def setUp(self):
        self.sim = m.MissionSim()
        self.sim.reset(0)

    def test_rectangle_collision_includes_rotation_and_touching(self):
        self.assertEqual(self.sim.contact(self.sim.start), [])
        self.assertIn('board_or_wall', self.sim.contact((0.1, 0.1, 0)))
        self.assertIn('center_divider_axis', self.sim.contact((1.5, 0.6114, 0)))
        self.assertIn('pit_divider_axis', self.sim.contact((28 * m.IN, 24 * m.IN, 0)))

    def test_every_source_route_segment_is_collision_free(self):
        for box in (1, 2, 3):
            self.sim.assigned_box = box
            for begin, end in [('start', 'join'), ('pit', 'join'), ('join', 'pit'), ('join', 'join'), ('join', 'park')]:
                route = self.sim._route(begin, end)
                samples = m.sample_route(route, 0.003, 0.01)
                failures = [(p, self.sim.contact(p)) for p in samples if self.sim.contact(p)]
                self.assertEqual(failures, [], f'{box} {begin}-{end}')
                if begin == end == 'join':
                    self.assertEqual(route[0], route[-1])

    def test_overlap_is_strictly_greater_than_75_percent(self):
        box = self.sim.boxes[1]
        self.assertGreater(m.overlap_fraction(box, box), 0.99)
        self.assertLess(m.overlap_fraction(m.rectangle(0, 0, 1, 1), m.rectangle(0.4, 0, 1, 1)), 0.75)


class FollowerTests(unittest.TestCase):
    def setUp(self):
        self.config = m.load_spec()[0]['control']

    def test_short_segment_does_not_freeze_or_skip(self):
        follower = m.PathFollower([(0, 0, 0), (0.002, 0, 0)], self.config)
        for _ in range(100):
            action = follower.action((0.002, 0, 0, 0, 0), 0.05)
            if follower.settled >= self.config['settle_time_s']:
                break
        self.assertEqual(action, (0, 0))
        self.assertTrue(follower.advance())

    def test_short_segment_brakes_before_crossing_target(self):
        follower = m.PathFollower([(0, 0, 0), (0.0741, 0, 0)], self.config)
        action = follower.action((0.075, 0, 0, 0.1, 0), 0.05)
        self.assertEqual(action[0], 0)
        self.assertEqual(follower.settled, 0)

    def test_premature_projection_does_not_advance(self):
        follower = m.PathFollower([(0, 0, 0), (1, 0, 0)], self.config)
        follower.action((0.999, 0.02, 0, 0, 0), 0.05)
        self.assertEqual(follower.settled, 0)
        self.assertEqual(follower.index, 0)

    def test_spin_requires_heading_and_low_rate(self):
        follower = m.PathFollower([(0, 0, 0), (0, 0, math.pi / 2)], self.config)
        follower.action((0, 0, math.pi / 2, 0, 1), 0.05)
        self.assertEqual(follower.settled, 0)
        for _ in range(6):
            follower.action((0, 0, math.pi / 2, 0, 0), 0.05)
        self.assertTrue(follower.advance())

    def test_equivalent_pi_headings_do_not_create_a_turn(self):
        primitives = m.route_primitives([(1, 0, math.pi), (0, 0, -math.pi)])
        self.assertEqual(primitives[0]['kind'], 'forward')
        self.assertEqual(primitives[0]['length'], 1)

    def test_invalid_primitives_rejected(self):
        with self.assertRaisesRegex(ValueError, 'lateral'):
            m.route_primitives([(0, 0, 0), (0, 1, 0)])
        with self.assertRaisesRegex(ValueError, 'simultaneous'):
            m.route_primitives([(0, 0, 0), (1, 0, 1)])


class MissionTests(unittest.TestCase):
    def test_entry_then_one_lap_without_false_join_count(self):
        sim = m.MissionSim()
        sim.reset(0)
        info = run_until(sim, {'LAP'})
        self.assertEqual((info['entered'], info['laps_completed']), (True, 0))
        info = run_until(sim, {'TO_PIT'})
        self.assertEqual((info['laps_completed'], info['collisions']), (2, 0))

    def test_clean_laps_and_parking_all_boxes(self):
        for box in (1, 2, 3):
            sim = m.MissionSim()
            sim.reset(0, {'assigned_box': box})
            info = run_until(sim, {'DONE', 'STOPPED'})
            self.assertEqual(info['laps_completed'], 3)
            self.assertEqual(info['collisions'], 0, info)
            self.assertEqual(info['exchange_result'], 'done')
            self.assertLess(info['finish_seconds'], 165)
            self.assertEqual(info['phase'], 'DONE', info)
            self.assertTrue(info['parked'])
            self.assertGreater(info['parking_overlap'], 0.75)
            self.assertLess(info['time_s'], sim.config['auto_stop_s'])

    def test_failed_exchange_bails_out_and_finishes(self):
        sim = m.MissionSim()
        sim.reset(0, {'exchange_success': False})
        info = run_until(sim, {'DONE', 'STOPPED'})
        self.assertEqual(info['exchange_result'], 'bailed_out')
        self.assertFalse(info['blue_retained'])
        self.assertEqual(info['laps_completed'], 3)

    def test_collision_latches_and_counts_once(self):
        sim = m.MissionSim()
        sim.reset(0)
        sim.state.update(x=0.1, y=0.1)
        with self.assertRaisesRegex(ValueError, 'collides'):
            sim.reset(0, {'start_pose': (0.1, 0.1, 0)})
        _, _, done, info = sim.step((1, 0))
        self.assertTrue(done)
        self.assertEqual(info['collisions'], 1)
        _, _, _, again = sim.step((1, 0))
        self.assertEqual(again['collisions'], 1)
        self.assertEqual(again['stop_reason'], 'collision')

    def test_auto_stop_latches(self):
        sim = m.MissionSim()
        sim.reset(0)
        sim.state['t'] = sim.config['auto_stop_s'] - sim.config['dt_s']
        _, _, done, info = sim.step((0, 0))
        self.assertTrue(done)
        self.assertEqual(info['stop_reason'], 'auto_stop')

    def test_obstacle_contact_is_separate(self):
        sim = m.MissionSim()
        sim.reset(0, {'obstacle_enabled': True, 'obstacle': (1.0, 0.8)})
        sim.state.update(x=1.0, y=0.8)
        _, _, _, info = sim.step((0, 0))
        self.assertEqual(info['obstacle_contacts'], [1, 0, 0])
        self.assertEqual(info['wall_contacts'], [0, 0, 0])


class EnvironmentTests(unittest.TestCase):
    def test_gymnasium_compatible_api_and_seed_partition(self):
        env = m.MissionEnv(seed=100, evaluation=True)
        obs, info = env.reset()
        self.assertEqual(len(obs), 18)
        self.assertTrue(all(math.isfinite(x) for x in obs))
        self.assertEqual(info['seed'], 100)
        obs, reward, terminated, truncated, info = env.step([0, 0])
        self.assertEqual(len(obs), 18)
        self.assertTrue(math.isfinite(reward))
        self.assertFalse(truncated)
        self.assertIn('phase', info)
        obs, info = env.reset(seed=101)
        self.assertEqual(info['seed'], 101)
        with self.assertRaises(ValueError):
            env.step([float('nan'), 0])

    def test_blocked_entry_stops_without_collision(self):
        sim = m.MissionSim()
        sim.reset(0, {'obstacle_enabled': True, 'obstacle': (36 * m.IN, 36 * m.IN)})
        info = run_until(sim, {'DONE', 'STOPPED'})
        self.assertEqual(info['stop_reason'], 'obstacle_no_safe_route')
        self.assertEqual(info['avoidance_status'], 'no_route')
        self.assertEqual(info['collisions'], 0)

    def test_upper_lane_probe_stops_before_blocked_lap(self):
        sim = m.MissionSim()
        sim.reset(0, {'obstacle_enabled': True, 'obstacle': (60 * m.IN, 36 * m.IN)})
        info = run_until(sim, {'DONE', 'STOPPED'})
        self.assertEqual(info['avoidance_status'], 'no_route')
        self.assertEqual(info['stop_reason'], 'obstacle_no_safe_route')
        self.assertEqual(info['collisions'], 0, info)
        self.assertEqual(info['laps_completed'], 0)

    def test_off_route_probe_does_not_add_detour(self):
        sim = m.MissionSim()
        sim.reset(0, {'obstacle_enabled': True, 'obstacle': (60 * m.IN, 45 * m.IN)})
        info = run_until(sim, {'DONE', 'STOPPED'})
        self.assertEqual(info['avoidance_status'], 'not_needed')
        self.assertEqual(info['collisions'], 0)
        self.assertTrue(info['parked'])


if __name__ == '__main__':
    unittest.main()
