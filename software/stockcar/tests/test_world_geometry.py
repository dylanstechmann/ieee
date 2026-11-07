import unittest

from stockcar import mission, world_geometry, world_routes
from stockcar.field import Field
from stockcar.geometry import axis_rect, rectangle
from stockcar.mission import HIGH_LANE, LOW_LANE


class MarkingGeometryTests(unittest.TestCase):
    def setUp(self):
        self.field = Field()
        self.bands = world_geometry.straight_marking_bands(self.field)

    def test_exact_straight_quads(self):
        self.assertEqual(self.bands["low"], axis_rect(43.6, 11.53, 80.246, 12.429))
        self.assertEqual(self.bands["high"], axis_rect(43.6, 35.57, 80.245, 36.47))

    def test_physical_lane_bands_and_clearances(self):
        lanes = world_geometry.lane_bands(self.field)
        self.assertEqual(lanes["low"]["outer"], (1.0, 11.53))
        self.assertEqual(lanes["low"]["inner"], (12.429, 23.5))
        self.assertEqual(lanes["high"]["inner"], (24.5, 35.57))
        self.assertEqual(lanes["high"]["outer"], (36.47, 47.0))
        self.assertAlmostEqual(lanes["low"]["outer"][1] - lanes["low"]["outer"][0], 10.53, places=3)
        self.assertAlmostEqual(lanes["low"]["inner"][1] - lanes["low"]["inner"][0], 11.071, places=3)

    def test_plain_centers_overlap_and_shifted_centers_clear(self):
        low_plain = rectangle(60.0, LOW_LANE, 0.0, 10.0, 10.0)
        high_plain = rectangle(60.0, HIGH_LANE, 0.0, 10.0, 10.0)
        self.assertIn("low", world_geometry.marking_contacts(low_plain, self.bands))
        self.assertIn("high", world_geometry.marking_contacts(high_plain, self.bands))
        low_inner = rectangle(60.0, 17.9645, 0.0, 10.0, 10.0)
        high_inner = rectangle(60.0, 30.0355, 0.0, 10.0, 10.0)
        self.assertEqual(world_geometry.marking_contacts(low_inner, self.bands), [])
        self.assertEqual(world_geometry.marking_contacts(high_inner, self.bands), [])

    def test_edge_crossing_without_vertices_inside_is_detected(self):
        crossing = rectangle(60.0, 12.0, 0.0, 10.0, 10.0)
        self.assertEqual(world_geometry.marking_contacts(crossing, self.bands), ["low"])

    def test_touching_counts_as_contact(self):
        touching = axis_rect(50.0, 10.0, 70.0, 11.53)
        self.assertEqual(world_geometry.marking_contacts(touching, self.bands), ["low"])

    def test_end_and_rounded_segments_are_excluded(self):
        end_touch = axis_rect(35.0, 20.0, 36.0, 22.0)
        self.assertEqual(world_geometry.marking_contacts(end_touch, self.bands), [])

    def test_lane_center_intervals_and_errors(self):
        self.assertAlmostEqual(world_geometry.lane_center_intervals(self.field, "low", "inner")[0], 17.679, places=3)
        self.assertAlmostEqual(world_geometry.lane_center_intervals(self.field, "low", "outer")[1], 6.28, places=3)
        self.assertEqual(world_geometry.lane_center_intervals(self.field, "low", "inner", robot_width=12.0), ())
        with self.assertRaises(ValueError):
            world_geometry.lane_center_intervals(self.field, "middle", "inner")
        with self.assertRaises(ValueError):
            world_geometry.lane_center_intervals(self.field, "low", "far")


class EnforcedLanePlanTests(unittest.TestCase):
    def setUp(self):
        self.field = Field()

    @staticmethod
    def layout(*vehicles):
        return mission.Layout(list(vehicles), 1, True)

    def test_empty_layout_keeps_the_default_lane(self):
        plan = world_routes.enforced_lane_plan(self.field, self.layout(), "low", LOW_LANE)
        self.assertEqual(plan["lanes"], [(44.0, 80.0, LOW_LANE)])
        self.assertEqual(plan["mode"], "clean")
        self.assertFalse(plan["fallback"])

    def test_common_inner_lane_is_preferred(self):
        layout = self.layout({"quadrant": "low_west", "side": "low", "cx": 60.0, "cy": 6.265, "yaw": 0.0})
        plan = world_routes.enforced_lane_plan(self.field, layout, "low", LOW_LANE)
        self.assertEqual(plan["mode"], "clean")
        self.assertEqual(plan["lane_assignments"], ["inner"])
        self.assertEqual(plan["planned_lane_changes"], 0)
        self.assertGreaterEqual(plan["lanes"][0][2], 17.679)
        self.assertLessEqual(plan["lanes"][0][2], 18.25)

    def test_two_vehicles_choose_the_minimum_lane_change_assignment(self):
        layout = self.layout(
            {"quadrant": "low_west", "side": "low", "cx": 55.0, "cy": 17.9645, "yaw": 0.0},
            {"quadrant": "low_east", "side": "low", "cx": 70.0, "cy": 6.265, "yaw": 0.0},
        )
        plan = world_routes.enforced_lane_plan(self.field, layout, "low", LOW_LANE)
        self.assertEqual(plan["mode"], "lane_change")
        self.assertEqual(plan["lane_assignments"], ["outer", "inner"])
        self.assertEqual(plan["planned_lane_changes"], 2)
        self.assertEqual([(a, b) for a, b, _ in plan["lanes"]], [(50.725, 59.275), (65.725, 74.275)])

    def test_high_straight_spans_are_in_westbound_order(self):
        layout = self.layout({"quadrant": "high_east", "side": "high", "cx": 70.0, "cy": 30.0355, "yaw": 0.0})
        plan = world_routes.enforced_lane_plan(self.field, layout, "high", HIGH_LANE)
        self.assertEqual(plan["mode"], "clean")
        self.assertGreater(plan["lanes"][0][0], plan["lanes"][0][1])

    def test_impossible_obstacle_reports_fallback(self):
        layout = self.layout({"quadrant": "low_west", "side": "low", "cx": 60.0, "cy": 12.0, "yaw": 0.0})
        plan = world_routes.enforced_lane_plan(self.field, layout, "low", LOW_LANE)
        self.assertTrue(plan["fallback"])
        self.assertEqual(plan["mode"], "fallback")
        self.assertEqual(plan["infeasible_vehicles"], 1)
        self.assertIn("baseline_mode", plan)

    def test_invalid_side_raises(self):
        with self.assertRaises(ValueError):
            world_routes.enforced_lane_plan(self.field, self.layout(), "middle", LOW_LANE)


if __name__ == "__main__":
    unittest.main()