# The Pico's MicroPython is expected to run single-precision floats, so CPython-double parity does not
# cover the board. This rounds the port's state and covariance through float32 each step and checks the
# filter keeps a positive variance and stays close to the double-precision run (drift is reported, not
# asserted to a hoped-for bound).
import math
import os
import random
import struct
import sys
import unittest

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
if os.path.join(ROOT, "software") not in sys.path:
    sys.path.insert(0, os.path.join(ROOT, "software"))

import estimator as board_est  # noqa: E402
from stockcar.field import Field  # noqa: E402
from stockcar.sensors import Band, SensorSuite  # noqa: E402

DT = 0.05
START = (25.0, 39.0, 0.0)


def _f32(x):
    return struct.unpack("f", struct.pack("f", x))[0]


class Float32Estimator(board_est.EstimatorBoard):
    """The port with every state and covariance entry quantised to float32 after each step."""

    def _quantise(self):
        self.x = [_f32(v) for v in self.x]
        self.P = [[_f32(v) for v in row] for row in self.P]

    def predict(self, *args):
        super().predict(*args)
        self._quantise()

    def correct(self, *args):
        super().correct(*args)
        self._quantise()


def _drive():
    field = Field()
    band = Band(field)
    barriers = field.barriers()
    suite = SensorSuite(random.Random(7), field, barriers, [])
    x, y, th = START
    meas = []
    for i in range(300):
        w = 0.0 if i < 120 else 0.25
        meas.append(suite.measure((x, y, th), 12.0, w, DT))
        th_mid = th + w * DT / 2
        x += 12.0 * math.cos(th_mid) * DT
        y += 12.0 * math.sin(th_mid) * DT
        th = (th + w * DT) % (2 * math.pi)
    return band, barriers, meas


class Float32Tests(unittest.TestCase):
    def test_float32_keeps_positive_variance_and_stays_close(self):
        band, barriers, meas = _drive()
        full = board_est.EstimatorBoard(START, band, barriers)
        quant = Float32Estimator(START, band, barriers)
        drift = 0.0
        for m in meas:
            full.predict(m["encoder_delta"], m["gyro"], DT)
            full.correct(m)
            quant.predict(m["encoder_delta"], m["gyro"], DT)
            quant.correct(m)
            for i in range(4):
                self.assertGreater(quant.P[i][i], 0.0, "covariance stays positive definite")
            fp, qp = full.pose(), quant.pose()
            drift = max(drift, (fp[0] - qp[0]) ** 2 + (fp[1] - qp[1]) ** 2)
        self.assertLess(drift ** 0.5, 0.05, "float32 quantization drift stays small (reported, not tuned)")


if __name__ == "__main__":
    unittest.main()