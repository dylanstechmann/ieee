import math
import unittest

from stockcar.field import Field
from stockcar.geometry import axis_rect, circle_polygon_distance, rectangle, separation
from stockcar.obstacles import GUIDE_PLUSH, center_range, footprint, placements, straight_pass_gap
from stockcar.planner import Footprint, plan


class GeometryTests(unittest.TestCase):
    def test_separation_of_squares(self):
        a = axis_rect(0, 0, 1, 1)
        self.assertAlmostEqual(separation(a, axis_rect(2, 0, 3, 1)), 1.0)
        self.assertLess(separation(a, axis_rect(0.5, 0.5, 2, 2)), 0)

    def test_rotated_square_width(self):
        poly = rectangle(0, 0, math.radians(15), 10, 10)
        width = max(p[1] for p in poly) - min(p[1] for p in poly)
        self.assertAlmostEqual(width, 10 * (math.cos(math.radians(15)) + math.sin(math.radians(15))), places=9)

    def test_circle_polygon_distance(self):
        box = axis_rect(0, 0, 2, 2)
        self.assertAlmostEqual(circle_polygon_distance(5, 1, 1, box), 2.0)
        self.assertLess(circle_polygon_distance(1, 1, 0.5, box), 0)


class FieldTests(unittest.TestCase):
    def test_cad_corridors_and_quadrants(self):
        f = Field()
        self.assertEqual(f.corridor("low"), (1, 23.5))
        self.assertEqual(f.corridor("high"), (24.5, 47))
        q = f.quadrants("offsets")
        self.assertEqual(q["low_west"], (44, 3, 60, 21.5))
        self.assertEqual(q["high_east"], (64, 26.5, 80, 45))

    def test_variants_change_corridors(self):
        self.assertEqual(Field(divider="v3_1x2_flat_actual").corridor("low"), (1, 23.25))
        self.assertEqual(Field(wall_thickness=0.75).corridor("low")[0], 0.75)
        with self.assertRaises(ValueError):
            Field(divider="nonsense")


class ObstacleTests(unittest.TestCase):
    def test_placements_stay_inside_quadrant_and_lane(self):
        q = Field().quadrants("sixteen_from_wall")["low_west"]
        for cx, cy, yaw in placements(q, "low", "outer", GUIDE_PLUSH, step=1.0):
            pts = footprint(GUIDE_PLUSH, cx, cy, yaw)
            self.assertTrue(all(q[0] - 1e-9 <= p[0] <= q[2] + 1e-9 and q[1] - 1e-9 <= p[1] <= q[3] + 1e-9 for p in pts))
            self.assertLessEqual(cy, (q[1] + q[3]) / 2 + 1e-9)

    def test_lane_half_too_small_is_reported(self):
        tiny = (0, 0, 16, 7)  # a 3.5 in lane half cannot hold the center of an 8.2 in wide car fully inside
        self.assertIsNone(center_range(tiny, "low", "outer", GUIDE_PLUSH, 0.0))

    def test_straight_pass_gap(self):
        self.assertAlmostEqual(straight_pass_gap((1, 23.5), GUIDE_PLUSH, 50, 7.1, 0.0), 23.5 - (7.1 + 4.1))


class PlannerTests(unittest.TestCase):
    def test_empty_corridor_is_passable(self):
        result = plan(Footprint("square"), (1, 23.5), [], 40, 60)
        self.assertTrue(result["found"])

    def test_blocked_corridor_is_not_passable(self):
        wall = axis_rect(50, 1, 52, 23.5)
        self.assertFalse(plan(Footprint("round"), (1, 23.5), [wall], 40, 60)["found"])

    def test_round_jogs_where_square_cannot_rotate(self):
        # 12.5 in corridor: a 10 x 10 square is 12.25 in wide at 15 degrees, so with 0.25 in margins it
        # cannot rotate at all. The blocks force a ~2 in sideways jog between x = 25 and 33; a 10 in disc
        # can spin in place and jog (by hand: feasible near x = 29), the square cannot.
        band = (0.0, 12.5)
        blocks = [axis_rect(20, 0, 25, 1.75), axis_rect(33, 10.75, 38, 12.5)]
        self.assertFalse(plan(Footprint("square"), band, blocks, 15, 45)["found"])
        self.assertTrue(plan(Footprint("round"), band, blocks, 15, 45)["found"])


if __name__ == "__main__":
    unittest.main()
