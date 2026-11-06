import random
import unittest

from stockcar import mission
from stockcar.avoidance import plan_shift, shifted_target
from stockcar.collision import ContactRecorder, check, overlapping
from stockcar.geometry import rectangle
from stockcar.mission_sensed import SensedMissionSim
from stockcar.obstacles import GUIDE_PLUSH


class CollisionTests(unittest.TestCase):
    def test_overlapping_indexes_interpenetrating_polygons(self):
        box = rectangle(0.0, 0.0, 0.0, 10.0, 10.0)
        near = rectangle(8.0, 0.0, 0.0, 10.0, 10.0)          # overlaps the box
        clear = rectangle(30.0, 0.0, 0.0, 10.0, 10.0)        # clear
        self.assertEqual(overlapping(box, [near, clear]), [0])

    def test_check_flags_wall_and_vehicle_hits(self):
        box = rectangle(0.0, 0.0, 0.0, 10.0, 10.0)
        wall = rectangle(6.0, 0.0, 0.0, 10.0, 10.0)          # overlaps -> wall
        vehicle = rectangle(40.0, 0.0, 0.0, 10.0, 10.0)      # clear
        self.assertEqual(check(box, [wall], [vehicle]), (True, False))
        self.assertEqual(check(box, [vehicle], [wall]), (False, True))

    def test_contact_recorder_counts_new_and_ongoing_per_lap(self):
        rec = ContactRecorder()
        self.assertEqual(rec.tick(0, False, True, 0.05), 1)   # new vehicle contact, lap 0
        self.assertEqual(rec.tick(0, False, True, 0.05), 0)   # ongoing, not new
        self.assertEqual(rec.vehicle_contacts[0], 2)
        self.assertGreater(rec.cooldown, 0.0)
        rec2 = ContactRecorder()
        self.assertEqual(rec2.tick(1, True, False, 0.05), 1)  # new wall contact, lap 1
        self.assertEqual(rec2.wall_contacts[1], 1)


class AvoidanceTests(unittest.TestCase):
    def test_plan_shift_prefers_the_clear_side_nearest_the_lane(self):
        # Vehicle (8.2 in wide at yaw 0) centred at y=24 spans y in [19.9, 28.1];
        # prefer the high side, whose gap centre is at 37.55.
        avoid_y, side = plan_shift((1.0, 47.0), GUIDE_PLUSH, 45.0, 24.0, 0.0, 30.0)
        self.assertEqual(side, "high")
        self.assertAlmostEqual(avoid_y, 37.55, places=2)

    def test_plan_shift_returns_none_when_no_band_is_open(self):
        self.assertEqual(plan_shift((19.9, 28.0), GUIDE_PLUSH, 45.0, 24.0, 0.0, 24.0), (None, None))

    def test_shifted_target_offsets_each_waypoint(self):
        pts = [(10.0, 24.0), (20.0, 24.0)]
        self.assertEqual(shifted_target(pts, 3.5), [(10.0, 27.5), (20.0, 27.5)])


class CollisionStopTests(unittest.TestCase):
    def _prep(self, collision_stops):
        sim = SensedMissionSim(collision_stops=collision_stops)
        layout = mission.random_layout(random.Random(7), sim.field, obstacles=False)
        sim.reset(layout)
        sim.out["motion"] = "drive"
        sim._set_route("ENTER")
        return sim

    def test_collision_stops_halts_after_a_recorded_vehicle_contact(self):
        moving = self._prep(False)
        stopped = self._prep(True)
        # Both drive normally before any contact.
        self.assertNotEqual(moving.classical_action(), (0.0, 0.0))
        self.assertNotEqual(stopped.classical_action(), (0.0, 0.0))
        moving.vehicle_contacts[0] = 1
        stopped.vehicle_contacts[0] = 1
        self.assertNotEqual(moving.classical_action(), (0.0, 0.0))   # v10: continue gently
        self.assertEqual(stopped.classical_action(), (0.0, 0.0))     # v11: halt on contact


if __name__ == "__main__":
    unittest.main()