# Parity of the on-board EKF port against the host filter. A recorded SensorSuite sequence is replayed
# through both; gate decisions and counters must match, and pose must agree within a small tolerance
# (sqrt vs hypot and wrap vs remainder differ in the last float bits). Board constants must equal host.
import math
import os
import random
import sys
import unittest

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
if os.path.join(ROOT, "software") not in sys.path:
    sys.path.insert(0, os.path.join(ROOT, "software"))

import estimator as board_est  # noqa: E402  (firmware/pico2/estimator.py)
import field_tables as ft  # noqa: E402                       (generated firmware tables)
from stockcar import estimator as host_est_module  # noqa: E402
from stockcar import sensors as host_sensors  # noqa: E402
from stockcar.estimator import Estimator  # noqa: E402
from stockcar.field import Field  # noqa: E402
from stockcar.sensors import Band, SensorSuite  # noqa: E402

DT = 0.05
START = (25.0, 39.0, 0.0)


def _drive():
    field = Field()
    band = Band(field)
    barriers = field.barriers()
    suite = SensorSuite(random.Random(7), field, barriers, [])
    x, y, th = START
    meas = []
    for i in range(300):
        w = 0.0 if i < 120 else 0.25   # straight, then a gentle turn to cross the marking band
        meas.append(suite.measure((x, y, th), 12.0, w, DT))
        th_mid = th + w * DT / 2
        x += 12.0 * math.cos(th_mid) * DT
        y += 12.0 * math.sin(th_mid) * DT
        th = (th + w * DT) % (2 * math.pi)
    return band, barriers, meas


def _replay(cls, band, barriers, meas):
    est = cls(START, band, barriers)
    poses = [est.pose()]
    for m in meas:
        est.predict(m["encoder_delta"], m["gyro"], DT)
        est.correct(m)
        poses.append(est.pose())
    return est, poses


class EstimatorPortTests(unittest.TestCase):
    def setUp(self):
        self.band, self.barriers, self.meas = _drive()

    def test_constants_match_the_host(self):
        self.assertEqual(ft.COUNTS_PER_REV, host_sensors.COUNTS_PER_REV)
        self.assertEqual(ft.WHEEL_RADIUS_IN, host_sensors.WHEEL_RADIUS_IN)
        self.assertEqual(ft.TOF_MAX_IN, host_sensors.TOF_MAX_IN)
        self.assertEqual(ft.GYRO_NOISE_RAD_S, host_est_module.GYRO_NOISE_RAD_S)
        self.assertEqual(ft.LINE_NOISE_IN, host_est_module.LINE_NOISE_IN)
        self.assertEqual(ft.SHALLOWEST_CROSSING, host_est_module.SHALLOWEST_CROSSING)
        self.assertEqual([tuple(o) for o in ft.REFLECTANCE_OFFSETS], host_sensors.REFLECTANCE_OFFSETS)
        self.assertEqual([tuple(s) for s in ft.TOF_SENSORS], host_sensors.TOF_SENSORS)

    def test_pose_matches_within_tolerance(self):
        host, host_poses = _replay(Estimator, self.band, self.barriers, self.meas)
        board, board_poses = _replay(board_est.EstimatorBoard, self.band, self.barriers, self.meas)
        for hp, bp in zip(host_poses, board_poses):
            self.assertLess(abs(hp[0] - bp[0]), 1e-6, "x within tolerance")
            self.assertLess(abs(hp[1] - bp[1]), 1e-6, "y within tolerance")
            self.assertLess(abs(hp[2] - bp[2]), 1e-6, "heading within tolerance")

    def test_counts_and_gate_decisions_match(self):
        host, _ = _replay(Estimator, self.band, self.barriers, self.meas)
        board, _ = _replay(board_est.EstimatorBoard, self.band, self.barriers, self.meas)
        for attr in ("line_updates", "line_skipped", "bias_updates", "range_updates", "range_rejected"):
            self.assertEqual(getattr(board, attr), getattr(host, attr), attr)


if __name__ == "__main__":
    unittest.main()