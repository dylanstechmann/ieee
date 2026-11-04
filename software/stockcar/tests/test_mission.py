import random
import unittest

from stockcar import mission
from stockcar.geometry import axis_rect


class MissionTests(unittest.TestCase):
    def test_empty_field_mission_completes_cleanly(self):
        info = mission.run(100, obstacles=False)
        self.assertEqual(info["state"], "DONE")
        self.assertEqual(info["laps"], 3)
        self.assertTrue(info["parked"])
        self.assertEqual(info["wall_contact_steps"], [0, 0, 0])
        self.assertEqual(info["vehicle_contact_steps"], [0, 0, 0])
        self.assertLess(info["finish_s"], 165)

    def test_contact_policy_keeps_going(self):
        info = mission.run(103, obstacles=True)
        self.assertEqual(info["state"], "DONE")
        self.assertGreater(sum(info["vehicle_contact_steps"]), 0)
        self.assertIn("contact", info["lane_modes"])

    def test_deterministic(self):
        self.assertEqual(mission.run(107, obstacles=True), mission.run(107, obstacles=True))

    def test_external_actions_complete_the_mission(self):
        # The v9 environment could not advance segments from external actions; v10 decides arrival from
        # the robot state, so a policy that outputs the same commands completes the mission.
        env = mission.MissionEnv(evaluation=False, obstacles=False)
        env.reset(seed=3)
        done, info = False, None
        for _ in range(4000):
            action = env.sim.classical_action()
            _, _, done, _, info = env.step(action)
            if done:
                break
        self.assertEqual(info["state"], "DONE")
        self.assertEqual(info["laps"], 3)

    def test_seed_partition_is_enforced(self):
        with self.assertRaises(ValueError):
            mission.MissionEnv(evaluation=False).reset(seed=105)
        with self.assertRaises(ValueError):
            mission.MissionEnv(evaluation=True).reset(seed=5)

    def test_no_points_for_laps_not_driven(self):
        info = mission.run(100, obstacles=False, max_steps=200)
        self.assertLess(info["laps"], 3)
        self.assertLessEqual(info["score_like"], 25 + 10 + info["laps"] * (15 + 25))

    def test_overlap_fraction(self):
        self.assertAlmostEqual(mission.overlap_fraction(axis_rect(0, 0, 2, 2), (1, 0, 3, 2)), 0.5)
        self.assertEqual(mission.overlap_fraction(axis_rect(0, 0, 1, 1), (5, 5, 6, 6)), 0.0)

    def test_random_layouts_have_three_vehicles(self):
        sim = mission.MissionSim()
        layout = mission.random_layout(random.Random(1), sim.field)
        self.assertEqual(len(layout.vehicles), 3)
        self.assertIn(layout.assigned_box, (1, 2, 3))


if __name__ == "__main__":
    unittest.main()
