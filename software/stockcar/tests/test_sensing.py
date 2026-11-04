import math
import random
import unittest

from stockcar import mission
from stockcar.estimator import Estimator
from stockcar.field import Field
from stockcar.geometry import axis_rect
from stockcar.sensors import Band, REFLECTANCE_OFFSETS, SensorSuite, outward_normal, ray_cast, ring_distance, to_world


def crossing_estimator(start, end):
    """An estimator whose last prediction moved the robot from start to end, heading 0."""
    field = Field()
    est = Estimator(end, Band(field), field.barriers())
    est.before, est.after = start, end
    return est


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

    def test_ring_geometry(self):
        band = Band(Field())
        self.assertAlmostEqual(ring_distance((60.0, 11.53), band.inner) * ring_distance((60.0, 11.53), band.outer), 0.0, places=6)
        self.assertAlmostEqual(ring_distance((60.0, 11.53), band.inner) + ring_distance((60.0, 11.53), band.outer), 0.9, delta=0.02)
        self.assertEqual(tuple(round(c, 6) for c in outward_normal((60.0, 11.5), band.outer)), (0.0, -1.0))
        self.assertEqual(tuple(round(c, 6) for c in outward_normal((60.0, 36.5), band.outer)), (0.0, 1.0))

    def test_measure_reports_which_sensors_are_white(self):
        field = Field()
        s = SensorSuite(random.Random(3), field, field.barriers(), [])
        pose = (55.5, 11.1, 0.0)
        white = s.measure(pose, 0.0, 0.0, 0.05)["white"]
        self.assertEqual(white, [s.band.white(to_world(pose, o)) for o in REFLECTANCE_OFFSETS])


class EstimatorTests(unittest.TestCase):
    def test_range_updates_pull_a_wrong_estimate_back(self):
        field = Field()
        est = Estimator((60.0, 13.0, 0.0), Band(field), field.barriers(), pos_sd=2.0)
        truth = (60.0, 12.0, 0.0)
        suite = SensorSuite(random.Random(2), field, field.barriers(), [], tof_noise=0.05, tof_dropout=0.0)
        for _ in range(20):
            est.correct(suite.measure(truth, 0.0, 0.0, 0.05))
        self.assertLess(abs(est.pose()[1] - truth[1]), 0.3)

    def test_crossing_direction_and_color_pick_the_ring(self):
        offset = REFLECTANCE_OFFSETS[0]
        toward_wall = ((60.0, 12.5, 0.0), (60.0, 12.0, 0.0))     # low side: moving outward is moving to lower y
        toward_divider = ((60.0, 12.0, 0.0), (60.0, 12.5, 0.0))
        for motion, turned_white, name in ((toward_wall, True, "inner"), (toward_wall, False, "outer"),
                                           (toward_divider, True, "outer"), (toward_divider, False, "inner")):
            est = crossing_estimator(*motion)
            self.assertIs(est._crossing(offset, turned_white)[0], getattr(est.band, name))

    def test_crossing_steps_back_to_the_middle_of_the_tick(self):
        est = crossing_estimator((60.0, 12.6, 0.0), (60.0, 12.0, 0.0))
        _, step, r_var = est._crossing(REFLECTANCE_OFFSETS[0], True)
        self.assertAlmostEqual(step[0], 0.0)
        self.assertAlmostEqual(step[1], 0.3)
        self.assertAlmostEqual(r_var, 0.1 ** 2 + 0.6 ** 2 / 12)

    def test_grazing_and_motionless_crossings_are_skipped(self):
        offset = REFLECTANCE_OFFSETS[0]
        grazing = crossing_estimator((60.0, 12.0, 0.0), (61.0, 11.99, 0.0))
        self.assertIsNone(grazing._crossing(offset, True))
        self.assertFalse(grazing._line_update(offset, True))
        self.assertEqual(grazing.line_skipped, 1)
        self.assertIsNone(crossing_estimator((60.0, 12.0, 0.0), (60.0, 12.0, 0.0))._crossing(offset, True))

    def test_ring_matching_corrects_an_error_that_fools_nearest_edge(self):
        # The sensor truly turned white at the inner ring, but a 0.7 in drift puts the estimate nearer the outer ring.
        offset = (0.0, 0.0)
        band = Band(Field())
        inner_y = 12.43
        self.assertLess(ring_distance((60.0, inner_y), band.inner), 0.02)
        moved = {}
        for matching in ("nearest", "ring"):
            est = crossing_estimator((60.0, inner_y - 0.65, 0.0), (60.0, inner_y - 0.7, 0.0))
            est.matching = matching
            self.assertTrue(est._line_update(offset, True))
            moved[matching] = est.pose()[1] - (inner_y - 0.7)
        self.assertLess(moved["nearest"], 0.0)      # pulled further from the truth, toward the outer ring
        self.assertGreater(moved["ring"], 0.3)      # pulled back toward the inner ring

    def test_stillness_learns_the_gyro_bias(self):
        field = Field()
        est = Estimator((60.0, 12.0, 0.0), Band(field), field.barriers())
        rng = random.Random(4)
        for _ in range(200):
            est.correct({"encoder_delta": (0, 0), "gyro": 0.015 + rng.gauss(0.0, 0.02)}, use_lines=False, use_ranges=False)
        self.assertEqual(est.bias_updates, 200)
        self.assertAlmostEqual(est.x[3], 0.015, delta=0.005)

    def test_moving_or_disabled_stillness_leaves_the_bias_alone(self):
        field = Field()
        moving = Estimator((60.0, 12.0, 0.0), Band(field), field.barriers())
        moving.correct({"encoder_delta": (0, 1), "gyro": 0.5}, use_lines=False, use_ranges=False)
        disabled = Estimator((60.0, 12.0, 0.0), Band(field), field.barriers())
        disabled.use_stillness = False
        disabled.correct({"encoder_delta": (0, 0), "gyro": 0.015}, use_lines=False, use_ranges=False)
        self.assertEqual((moving.bias_updates, moving.x[3]), (0, 0.0))
        self.assertEqual((disabled.bias_updates, disabled.x[3]), (0, 0.0))

    def test_stillness_gate_rejects_a_robot_turning_on_slipping_wheels(self):
        field = Field()
        est = Estimator((60.0, 12.0, 0.0), Band(field), field.barriers())
        est.correct({"encoder_delta": (0, 0), "gyro": 2.0}, use_lines=False, use_ranges=False)
        self.assertEqual((est.bias_updates, est.x[3]), (0, 0.0))

    def test_sensing_mission_completes_with_small_error(self):
        info = mission.run(100, obstacles=False, sensing="full")
        self.assertEqual(info["state"], "DONE")
        self.assertLess(info["estimation"]["max_position_error_in"], 1.5)

    def test_unknown_sensing_mode_rejected(self):
        with self.assertRaises(ValueError):
            mission.MissionSim(sensing="telepathy")


if __name__ == "__main__":
    unittest.main()
