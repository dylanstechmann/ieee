import random
import unittest

from stockcar.geometry import axis_rect, rectangle
from stockcar.sensors_vehicle import VehicleMap, classify, scan

WALL = axis_rect(20.0, -10.0, 21.0, 10.0)           # a wall face at x=20
NEAR = rectangle(12.5, 0.0, 0.0, 8.55, 8.2)         # a vehicle whose near edge is x~8.2
FAR = rectangle(25.0, 0.0, 0.0, 8.55, 8.2)          # a vehicle behind the wall (near edge x~20.7)
FORWARD = [(0.0, 0.0, 0.0)]


class ClassifyTests(unittest.TestCase):
    def test_no_reading_is_not_a_vehicle(self):
        self.assertFalse(classify(None, 30.0))

    def test_a_return_much_closer_than_the_wall_is_a_vehicle(self):
        self.assertTrue(classify(25.0, 30.0))

    def test_a_return_matching_the_wall_is_not_a_vehicle(self):
        self.assertFalse(classify(29.0, 30.0))

    def test_a_return_where_no_wall_is_expected_is_a_vehicle(self):
        self.assertTrue(classify(20.0, None))


class ScanTests(unittest.TestCase):
    def test_walls_alone_produce_no_vehicle_hits(self):
        out = scan((0.0, 0.0, 0.0), [WALL], [], random.Random(0), rays=FORWARD, noise=0.0, dropout=0.0)
        self.assertEqual(len(out), 1)
        self.assertIsNotNone(out[0])
        self.assertFalse(out[0]["is_vehicle"])

    def test_a_vehicle_nearer_than_the_wall_is_a_hit(self):
        out = scan((0.0, 0.0, 0.0), [WALL], [NEAR], random.Random(0), rays=FORWARD, noise=0.0, dropout=0.0)
        self.assertTrue(out[0]["is_vehicle"])
        self.assertLess(out[0]["range_in"], out[0]["expected_in"])

    def test_a_vehicle_farther_than_the_wall_is_not_a_hit(self):
        # the wall occludes the far vehicle, so the ray returns the wall distance, not the vehicle
        out = scan((0.0, 0.0, 0.0), [WALL], [FAR], random.Random(0), rays=FORWARD, noise=0.0, dropout=0.0)
        self.assertFalse(out[0]["is_vehicle"])

    def test_dropout_reports_none_never_a_fabricated_range(self):
        out = scan((0.0, 0.0, 0.0), [WALL], [NEAR], random.Random(0), rays=FORWARD, noise=0.0, dropout=1.0)
        self.assertEqual(out, [None])


class VehicleMapTests(unittest.TestCase):
    def _hit(self, x, y, vehicle=True):
        return {"is_vehicle": vehicle, "world_xy": (x, y)}

    def test_a_vehicle_needs_the_minimum_hit_count(self):
        vm = VehicleMap(min_hits=3, cluster_in=6.0)
        pose = (0.0, 0.0, 0.0)
        vm.add([self._hit(10.0, 16.0)], pose)
        vm.add([self._hit(10.2, 16.1)], pose)
        self.assertEqual(vm.vehicles(), [])          # two hits still below the minimum
        vm.add([self._hit(10.1, 15.9)], pose)
        self.assertEqual(len(vm.vehicles()), 1)

    def test_non_vehicle_hits_are_ignored(self):
        vm = VehicleMap(min_hits=1, cluster_in=6.0)
        vm.add([self._hit(10.0, 16.0, vehicle=False)], (0.0, 0.0, 0.0))
        self.assertEqual(vm.vehicles(), [])

    def test_a_confirmed_vehicle_reports_side_and_hits(self):
        vm = VehicleMap(min_hits=2, cluster_in=6.0)
        pose = (0.0, 0.0, 0.0)
        vm.add([self._hit(60.0, 32.0)], pose)
        vm.add([self._hit(60.4, 32.2)], pose)
        (v,) = vm.vehicles()
        self.assertEqual(v["side"], "high")          # cy above the divider centre
        self.assertEqual(v["hits"], 2)


if __name__ == "__main__":
    unittest.main()