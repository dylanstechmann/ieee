import hashlib
import math
import pathlib
import unittest

from stockcar import mission_worlds, world_routes
from stockcar.mission import GATE, HIGH_LANE, LOW_LANE

MISSION_PY_SHA256 = "346fb5c977fddaaad7d790afcb466beacb3f2beeebe01803befb9da004032678"


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
    def test_mission_py_unchanged(self):
        p = pathlib.Path(__file__).resolve().parents[2] / "stockcar" / "mission.py"
        self.assertEqual(hashlib.sha256(p.read_bytes()).hexdigest(), MISSION_PY_SHA256)

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


if __name__ == "__main__":
    unittest.main()