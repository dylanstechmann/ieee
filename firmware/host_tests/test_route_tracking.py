# The firmware loop following a whole lap on the corrected drivetrain model. Plant parameters are
# placeholders, so these check behavior, not predicted performance.
import json
import math
import os
import random
import unittest

from host_tests.plant_hal import ROOT
from host_tests.route_follow import follow
from stockcar import mission, profile, routes
from stockcar.field import Field
from stockcar.geometry import rectangle, separation

WORST = (10.5, 0.15, 5.0)
NOMINAL = (11.1, 0.25, 4.0)
BEST = (12.0, 0.35, 3.0)


class RouteTrackingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with open(os.path.join(ROOT, "derived", "envelope-v10", "report.json"), encoding="utf-8") as f:
            report = json.load(f)
        cls.envelopes = report["planning_envelopes"]
        cls.half_track = report["half_track_in"]
        sim = mission.MissionSim("aggressive", "nominal")
        sim.reset(mission.random_layout(random.Random(100), sim.field, obstacles=False))
        cls.lap = sim.routes["LAP"].pts

    def table(self, envelope):
        return profile.build(self.lap, profile.limits(self.envelopes[envelope], self.half_track))

    def test_conservative_lap_on_every_plant(self):
        table = self.table("conservative")
        for condition in (WORST, NOMINAL, BEST):
            result = follow(table, condition, self.envelopes["conservative"])
            self.assertTrue(result["done"])
            self.assertFalse(result["stopped"])
            self.assertLess(result["max_cross_track_in"], 0.6)
            self.assertLess(result["time_s"], table["time_s"] + 1.5)

    def test_rounded_pit_legs_stay_clear_where_sharp_ones_do_not(self):
        field = Field()
        barriers = field.barriers()
        envelope = self.envelopes["conservative"]

        def driven_clearance(table):
            path = follow(table, NOMINAL, envelope)["path"]
            return min(separation(rectangle(x, y, h, 10.0, 10.0), b) for x, y, h in path for b in barriers)

        sim = mission.MissionSim("aggressive", "nominal", field=field)
        sim.build_routes(mission.Layout([], 1, True))
        leg = sim.routes["EXIT_PIT"].pts
        self.assertLess(driven_clearance(profile.build(leg, profile.limits(envelope, self.half_track))), 0.0)
        self.assertGreater(driven_clearance(routes.pit_table(leg, envelope, self.half_track)), 1.0)

    def test_finishes_where_the_route_ends(self):
        table = self.table("conservative")
        x, y, _ = follow(table, NOMINAL, self.envelopes["conservative"])["path"][-1]
        self.assertLess(math.hypot(x - table["x"][-1], y - table["y"][-1]), 0.6)

    def test_too_fast_for_the_floor_slips_more_but_still_finishes(self):
        careful = follow(self.table("conservative"), WORST, self.envelopes["conservative"])
        reckless = follow(self.table("aggressive"), WORST, self.envelopes["aggressive"])
        self.assertTrue(reckless["done"])
        self.assertGreater(reckless["max_slip_in_s"], careful["max_slip_in_s"] + 1.0)

    def test_estimator_stands_in_for_the_truth(self):
        seen = []

        def nudged(x, y, heading, v, yaw_rate):
            seen.append(v)
            return x, y + 0.2, heading

        table = self.table("conservative")
        result = follow(table, NOMINAL, self.envelopes["conservative"], estimator=nudged)
        self.assertTrue(result["done"])
        self.assertGreater(len(seen), 100)
        self.assertGreater(max(seen), 10.0)
        true_y = [p[1] for p in result["path"]]
        self.assertLess(min(true_y), min(table["y"]) - 0.05)   # it steers the 0.2 in offset out, so the truth sits below the route


if __name__ == "__main__":
    unittest.main()
