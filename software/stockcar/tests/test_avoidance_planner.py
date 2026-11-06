import random
import unittest

from stockcar import mission
from stockcar.avoidance import AvoidancePlanner, plan_straight
from stockcar.field import Field
from stockcar.obstacles import GUIDE_PLUSH


class PlanStraightTests(unittest.TestCase):
    def setUp(self):
        self.field = Field()

    def _layout(self, seed):
        return mission.random_layout(random.Random(seed), self.field, obstacles=True)

    def test_empty_side_is_clear_at_the_default_lane(self):
        lanes, mode, blocked = plan_straight(self.field, [], "low", mission.LOW_LANE)
        self.assertEqual(mode, "clear")
        self.assertEqual(blocked, 0)
        self.assertEqual(lanes, [(44.0, 80.0, mission.LOW_LANE)])

    def test_matches_lane_plan_byte_for_byte_at_the_default_footprint(self):
        for seed in range(100, 110):
            layout = self._layout(seed)
            for side, dflt in (("low", mission.LOW_LANE), ("high", mission.HIGH_LANE)):
                veh = [v for v in layout.vehicles if v["side"] == side]
                self.assertEqual(plan_straight(self.field, veh, side, dflt),
                                 mission.lane_plan(self.field, layout, side, dflt))

    def test_inner_lane_vehicle_blocks_a_ten_inch_robot_but_not_a_six_inch_one(self):
        # A guide vehicle (8.55 in tall at yaw 90 deg) centred at y=14 in the low corridor leaves no
        # 10 in-wide gap, but a 6 in robot threads the 8.7 in band to the wall.
        veh = [{"cx": 60.0, "cy": 14.0, "yaw": 1.5707963267948966, "shape": GUIDE_PLUSH}]
        lanes, mode, blocked = plan_straight(self.field, veh, "low", mission.LOW_LANE)
        self.assertEqual(mode, "contact")
        self.assertEqual(blocked, 1)
        lanes6, mode6, blocked6 = plan_straight(self.field, veh, "low", mission.LOW_LANE, robot_width=6.0)
        self.assertEqual(mode6, "clean")
        self.assertEqual(blocked6, 0)

    def test_planner_object_pins_robot_width(self):
        planner = AvoidancePlanner(self.field, robot_width=6.0)
        veh = [{"cx": 60.0, "cy": 14.0, "yaw": 1.5707963267948966, "shape": GUIDE_PLUSH}]
        self.assertEqual(planner.plan_straight(veh, "low", mission.LOW_LANE)[1], "clean")


if __name__ == "__main__":
    unittest.main()