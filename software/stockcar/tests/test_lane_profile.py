import unittest

from stockcar.lane_profile import lateral_profile

LOW, HIGH = 16.5, 31.5


def _y_at(points, x):
    return min(points, key=lambda p: abs(p[0] - x))[1]


class LateralProfileTests(unittest.TestCase):
    def test_no_vehicles_reproduces_the_plain_lane(self):
        out = lateral_profile(44.0, 80.0, LOW, LOW, [])
        self.assertTrue(out["feasible"])
        self.assertEqual(out["infeasible_vehicles"], [])
        for _, y in out["points"]:
            self.assertAlmostEqual(y, LOW, places=6)

    def test_points_sample_x0_plus_step_to_x1(self):
        out = lateral_profile(44.0, 80.0, LOW, LOW, [])
        xs = [x for x, _ in out["points"]]
        self.assertAlmostEqual(xs[0], 44.5, places=6)
        self.assertAlmostEqual(xs[-1], 80.0, places=6)
        self.assertEqual(len(xs), 72)

    def test_lane_is_reached_by_the_padded_near_edge(self):
        # one vehicle spanning x 60..66 with a far-side lane; blend_in=8 leaves room before x=60
        out = lateral_profile(44.0, 80.0, LOW, LOW, [(60.0, 66.0, HIGH)])
        self.assertTrue(out["feasible"])
        self.assertAlmostEqual(_y_at(out["points"], 60.0), HIGH, places=3)
        self.assertAlmostEqual(_y_at(out["points"], 66.0), HIGH, places=3)
        # before the blend starts it still sits in the entry lane
        self.assertAlmostEqual(_y_at(out["points"], 46.0), LOW, places=3)

    def test_vehicle_at_the_arc_exit_is_infeasible(self):
        # near edge right at x0=44 leaves no room to reach the lane first
        out = lateral_profile(44.0, 80.0, LOW, LOW, [(44.0, 50.0, HIGH)], min_blend_in=2.0)
        self.assertFalse(out["feasible"])
        self.assertEqual(out["infeasible_vehicles"], [0])

    def test_too_tight_a_gap_below_min_blend_is_infeasible(self):
        out = lateral_profile(44.0, 80.0, LOW, LOW, [(44.5, 50.0, HIGH)], blend_in=8.0, min_blend_in=2.0)
        self.assertFalse(out["feasible"])
        self.assertEqual(out["infeasible_vehicles"], [0])

    def test_high_straight_travel_order_reverses(self):
        # high straight runs westbound: x0=80 -> x1=44
        out = lateral_profile(80.0, 44.0, HIGH, HIGH, [(66.0, 60.0, LOW)])
        self.assertTrue(out["feasible"])
        self.assertAlmostEqual(_y_at(out["points"], 66.0), LOW, places=3)
        self.assertAlmostEqual(_y_at(out["points"], 60.0), LOW, places=3)

    def test_vehicle_near_the_exit_still_closes_smoothly_onto_the_exit_lane(self):
        # a vehicle whose padded far edge ends near x1 must not leave a near-vertical exit jump
        out = lateral_profile(44.0, 80.0, LOW, LOW, [(70.0, 76.0, HIGH)], blend_in=8.0)
        ys = [y for _, y in out["points"]]
        largest = max(abs(b - a) for a, b in zip(ys, ys[1:]))
        self.assertLess(largest, 4.0, "no jump greater than a gentle blend permits")
        self.assertAlmostEqual(ys[-1], LOW, places=3)


if __name__ == "__main__":
    unittest.main()