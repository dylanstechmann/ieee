import hashlib
import math
import pathlib
import unittest

from stockcar import mission, mission_worlds, world_routes
from stockcar.mission import GATE, HIGH_LANE, LOW_LANE

MISSION_PY_SHA256 = "346fb5c977fddaaad7d790afcb466beacb3f2beeebe01803befb9da004032678"
PINNED_SHA256 = {
    "field.py": "67516673e3eee0ee5decb2186eacffce21723abc0bbf4f43db0a9b8e08029b68",
    "obstacles.py": "9caa806ed4a555df08721ca3cb9e74c7aeb65f9dbdadbc265fd20a74cf8776b1",
    "routes.py": "a8ea9b641d44e204250d5fb8c98c0a1b638320f46f32ea7f0adb7302154c567f",
}


class LapPointsTests(unittest.TestCase):
    def test_ccw_starts_and_ends_at_the_gate(self):
        pts = world_routes.lap_points("ccw")
        self.assertEqual((pts[0][0], pts[0][1]), (GATE[0], GATE[1]))
        self.assertAlmostEqual(pts[-1][0], GATE[0], places=9)
        self.assertAlmostEqual(pts[-1][1], GATE[1], places=9)

    def test_cw_is_the_centerline_mirror_of_ccw(self):
        ccw = world_routes.lap_points("ccw")
        cw = world_routes.lap_points("cw")
        cy = (LOW_LANE + HIGH_LANE) / 2.0
        self.assertEqual(len(cw), len(ccw))
        for (x, y), (mx, my) in zip(cw, ccw):
            self.assertAlmostEqual(x, mx, places=9, msg="x unchanged by the y-reflection")
            self.assertAlmostEqual(y, 2 * cy - my, places=9, msg="y reflected about the centerline")
        # It is the same length but not the same path (turns the opposite sense).
        self.assertFalse(all(abs(a[1] - b[1]) < 1e-9 for a, b in zip(cw, ccw)))

    def test_unknown_direction_raises(self):
        with self.assertRaises(ValueError):
            world_routes.lap_points("nope")


class WorldMissionSimTests(unittest.TestCase):
    def test_pinned_sources_unchanged(self):
        root = pathlib.Path(__file__).resolve().parents[2]
        expected = dict(PINNED_SHA256, **{"mission.py": MISSION_PY_SHA256})
        for name, digest in expected.items():
            p = root / "stockcar" / name
            self.assertEqual(hashlib.sha256(p.read_bytes()).hexdigest(), digest, msg=name)

    def test_primary_world_completes_three_laps_with_finish_line(self):
        info = mission_worlds.run_world("world-ccw-line-sq-adv-align", 0)
        self.assertEqual(info["world"], "world-ccw-line-sq-adv-align")
        self.assertEqual(info["laps"], 3)
        self.assertIsNotNone(info.get("finish_line_s"))
        self.assertGreaterEqual(len(info.get("band_crossings", [])), 3)

    def test_gate_world_has_no_finish_line_telemetry(self):
        info = mission_worlds.run_world("world-ccw-gate-sq-adv-align", 0)
        self.assertEqual(info["laps"], 3)
        self.assertNotIn("finish_line_s", info)

    def test_round_and_square_footprint_radii_differ(self):
        sq = mission_worlds.WorldMissionSim("world-ccw-gate-sq-adv-align")
        rd = mission_worlds.WorldMissionSim("world-ccw-gate-rd-adv-align")
        sq_r = max(math.hypot(x, y) for x, y in sq._footprint(0.0, 0.0, 0.0))
        rd_r = max(math.hypot(x, y) for x, y in rd._footprint(0.0, 0.0, 0.0))
        self.assertGreater(sq_r, rd_r + 1.0)
        self.assertAlmostEqual(rd_r, 5.0, delta=0.1)


class DeferredWorldSemanticsTests(unittest.TestCase):
    def test_formerly_deferred_worlds_construct(self):
        enf = mission_worlds.WorldMissionSim("world-ccw-line-sq-enf-align")
        small = mission_worlds.WorldMissionSim("world-ccw-line-sq-adv-small")
        self.assertTrue(enf.enforced)
        self.assertFalse(small.enforced)
        self.assertEqual(small.world["shape"]["id"], "small_toy")

    def test_enforced_seed_zero_completes_with_lane_telemetry(self):
        info = mission_worlds.run_world("world-ccw-line-sq-enf-align", 0)
        self.assertEqual(info["state"], "DONE")
        self.assertEqual(info["laps"], 3)
        self.assertIn("lane_violations", info)
        self.assertEqual(len(info["lane_violation_steps"]), 3)
        self.assertIn("lane_plan", info)
        self.assertEqual(set(info["lane_plan"]), {"low", "high"})

    def test_small_seed_zero_uses_the_hypothetical_toy(self):
        env = mission_worlds.WorldMissionEnv("world-ccw-line-sq-adv-small")
        env.reset(0)
        self.assertEqual(env.sim.layout.shape["id"], "small_toy")
        info = mission_worlds.run_world("world-ccw-line-sq-adv-small", 0)
        self.assertEqual(info["state"], "DONE")
        self.assertEqual(info["laps"], 3)

    def test_lane_penalty_is_reward_only(self):
        sim = mission_worlds.WorldMissionSim("world-ccw-line-sq-enf-align")
        sim.reset(mission.Layout([], 1, True))
        sim.state.update({"x": 60.0, "y": 17.9645, "th": 0.0})
        self.assertEqual(sim._update_lane_contacts(), 0.0)
        sim.state.update({"x": 60.0, "y": 12.0, "th": 0.0})
        self.assertEqual(sim._update_lane_contacts(), 2.0)
        self.assertEqual(sim.lane_violations, 1)
        self.assertEqual(sum(sim.lane_violation_steps), 1)
        self.assertEqual(sim._update_lane_contacts(), 0.0)
        self.assertEqual(sim.lane_violations, 1)
        self.assertEqual(sum(sim.lane_violation_steps), 2)
        sim.state.update({"x": 60.0, "y": 17.9645, "th": 0.0})
        self.assertEqual(sim._update_lane_contacts(), 0.0)
        sim.state.update({"x": 60.0, "y": 12.0, "th": 0.0})
        self.assertEqual(sim._update_lane_contacts(), 2.0)
        self.assertEqual(sim.lane_violations, 2)

    def test_seed_partition_is_enforced_for_deferred_worlds(self):
        with self.assertRaises(ValueError):
            mission_worlds.WorldMissionEnv("world-ccw-line-sq-enf-align", evaluation=False).reset(seed=105)
        with self.assertRaises(ValueError):
            mission_worlds.WorldMissionEnv("world-ccw-line-sq-adv-small", evaluation=True).reset(seed=5)


if __name__ == "__main__":
    unittest.main()