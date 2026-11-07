import unittest

from stockcar import routes
from stockcar.mission import GATE


class LapPointsTests(unittest.TestCase):
    def test_ccw_starts_and_ends_at_the_gate(self):
        pts = routes.lap_points("ccw")
        self.assertEqual((pts[0][0], pts[0][1]), (GATE[0], GATE[1]))
        self.assertAlmostEqual(pts[-1][0], GATE[0], places=9)
        self.assertAlmostEqual(pts[-1][1], GATE[1], places=9)

    def test_cw_is_the_centerline_mirror_of_ccw(self):
        ccw = routes.lap_points("ccw")
        cw = routes.lap_points("cw")
        cy = (routes.LOW_LANE + routes.HIGH_LANE) / 2.0
        self.assertEqual(len(cw), len(ccw))
        for (x, y), (mx, my) in zip(cw, ccw):
            self.assertAlmostEqual(x, mx, places=9, msg="x unchanged by the y-reflection")
            self.assertAlmostEqual(y, 2 * cy - my, places=9, msg="y reflected about the centerline")
        # It is the same length but not the same path (turns the opposite sense).
        self.assertFalse(all(abs(a[1] - b[1]) < 1e-9 for a, b in zip(cw, ccw)))

    def test_unknown_direction_raises(self):
        with self.assertRaises(ValueError):
            routes.lap_points("nope")


if __name__ == "__main__":
    unittest.main()