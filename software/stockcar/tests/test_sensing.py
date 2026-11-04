import math
import random
import unittest

from stockcar import mission
from stockcar.estimator import Estimator
from stockcar.field import Field
from stockcar.geometry import axis_rect
from stockcar.sensors import Band, SensorSuite, ray_cast


class SensorTests(unittest.TestCase):
    def test_band_white_and_black(self):
        band = Band(Field())
        self.assertTrue(band.white((60.0, 11.9)))    # inside the 0.9 in band along the low side
        self.assertFalse(band.white((60.0, 20.0)))   # inside the inner ring
        self.assertFalse(band.white((60.0, 5.0)))    # outside the outer ring
        self.assertAlmostEqual(band.edge_distance((60.0, 11.53)), 0.0, places=6)

    def test_ray_cast(self):
        box = axis_rect(10, -1, 12, 1)
        self.assertAlmostEqual(ray_cast((0, 0), 0.0, [box]), 10.0)
        self.assertIsNone(ray_cast((0, 0), math.pi, [box]))

    def test_encoder_counts_follow_motion(self):
        field = Field()
        s = SensorSuite(random.Random(1), field, field.barriers(), [], slip_sd=0.0)
        total = [0, 0]
        for _ in range(100):
            d = s.measure((50.0, 12.0, 0.0), 10.0, 0.0, 0.05)["encoder_delta"]
            total[0] += d[0]
            total[1] += d[1]
        expected = 50.0 / (2 * math.pi * 40.0 / 25.4) * 1120  # 50 in of straight travel
        self.assertAlmostEqual(total[0], expected, delta=2)
        self.assertAlmostEqual(total[1], expected, delta=2)


class EstimatorTests(unittest.TestCase):
    def test_range_updates_pull_a_wrong_estimate_back(self):
        field = Field()
        est = Estimator((60.0, 13.0, 0.0), Band(field), field.barriers(), pos_sd=2.0)
        truth = (60.0, 12.0, 0.0)
        suite = SensorSuite(random.Random(2), field, field.barriers(), [], tof_noise=0.05, tof_dropout=0.0)
        for _ in range(20):
            est.correct(suite.measure(truth, 0.0, 0.0, 0.05))
        self.assertLess(abs(est.pose()[1] - truth[1]), 0.3)

    def test_sensing_mission_completes_with_small_error(self):
        info = mission.run(100, obstacles=False, sensing="full")
        self.assertEqual(info["state"], "DONE")
        self.assertLess(info["estimation"]["max_position_error_in"], 1.5)

    def test_unknown_sensing_mode_rejected(self):
        with self.assertRaises(ValueError):
            mission.MissionSim(sensing="telepathy")


if __name__ == "__main__":
    unittest.main()
