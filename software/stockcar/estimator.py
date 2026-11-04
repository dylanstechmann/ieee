"""Extended Kalman filter for (x, y, heading, gyro bias), standard library only.

Prediction uses wheel odometry for distance and the gyro for heading. Corrections:
- line edges: when a reflectance sensor changes state, that sensor sits on a known edge of the white
  marking band, so its distance to the nearest band edge is measured as zero;
- ranges: time-of-flight readings are compared with ray casts against the mapped walls and dividers.
  Readings that disagree by more than a gate (for example a vehicle, which is not in the map) are
  ignored.
A synthetic design check, not a tuned on-robot filter.
"""
import math

from stockcar.sensors import COUNTS_PER_REV, REFLECTANCE_OFFSETS, TOF_SENSORS, WHEEL_RADIUS_IN, ray_cast, to_world


def _mat(n, m, v=0.0):
    return [[v] * m for _ in range(n)]


def _mul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(len(b))) for j in range(len(b[0]))] for i in range(len(a))]


def _t(a):
    return [list(r) for r in zip(*a)]


def _add(a, b):
    return [[a[i][j] + b[i][j] for j in range(len(a[0]))] for i in range(len(a))]


class Estimator:
    def __init__(self, pose, band, barriers, pos_sd=0.5, heading_sd=0.03, bias_sd=0.02):
        self.x = [pose[0], pose[1], pose[2], 0.0]
        self.P = _mat(4, 4)
        for i, s in enumerate((pos_sd, pos_sd, heading_sd, bias_sd)):
            self.P[i][i] = s * s
        self.band = band
        self.barriers = barriers
        self.line_updates = 0
        self.range_updates = 0
        self.range_rejected = 0

    def pose(self):
        return self.x[0], self.x[1], self.x[2]

    def predict(self, encoder_delta, gyro, dt):
        per_count = 2 * math.pi * WHEEL_RADIUS_IN / COUNTS_PER_REV
        ds = (encoder_delta[0] + encoder_delta[1]) / 2 * per_count
        x, y, th, b = self.x
        dth = (gyro - b) * dt
        mid = th + dth / 2
        self.x = [x + ds * math.cos(mid), y + ds * math.sin(mid), math.remainder(th + dth, 2 * math.pi), b]
        F = [[1, 0, -ds * math.sin(mid), ds * math.sin(mid) * dt / 2],
             [0, 1, ds * math.cos(mid), -ds * math.cos(mid) * dt / 2],
             [0, 0, 1, -dt],
             [0, 0, 0, 1]]
        q_s = (0.02 * abs(ds) + per_count) ** 2
        Q = [[q_s, 0, 0, 0], [0, q_s, 0, 0], [0, 0, (0.02 * dt) ** 2 + (0.002 * abs(dth)) ** 2, 0], [0, 0, 0, (1e-4) ** 2]]
        self.P = _add(_mul(_mul(F, self.P), _t(F)), Q)

    def _update(self, h_fn, z, r_var, gate):
        h0 = h_fn(self.x)
        if h0 is None:
            return False
        H = [[0.0] * 4]
        for i, eps in enumerate((0.01, 0.01, 0.001, 0.001)):
            xp = list(self.x)
            xp[i] += eps
            hp = h_fn(xp)
            if hp is None:
                return False
            H[0][i] = (hp - h0) / eps
        S = _mul(_mul(H, self.P), _t(H))[0][0] + r_var
        innov = z - h0
        if innov * innov > gate * gate * S:
            return False
        K = [row[0] / S for row in _mul(self.P, _t(H))]
        self.x = [self.x[i] + K[i] * innov for i in range(4)]
        self.x[2] = math.remainder(self.x[2], 2 * math.pi)
        KH = [[K[i] * H[0][j] for j in range(4)] for i in range(4)]
        I_KH = [[(1.0 if i == j else 0.0) - KH[i][j] for j in range(4)] for i in range(4)]
        self.P = _mul(I_KH, self.P)
        return True

    def correct(self, meas, use_lines=True, use_ranges=True):
        for k in (meas.get("line_changes", []) if use_lines else []):
            offset = REFLECTANCE_OFFSETS[k]
            ok = self._update(lambda s: self.band.edge_distance(to_world((s[0], s[1], s[2]), offset)), 0.0, 0.15 ** 2, gate=3.0)
            self.line_updates += ok
        for (fx, fy, a), r in zip(TOF_SENSORS, meas.get("tof", []) if use_ranges else []):
            if r is None:
                continue

            def h(s, fx=fx, fy=fy, a=a):
                return ray_cast(to_world((s[0], s[1], s[2]), (fx, fy)), s[2] + a, self.barriers)

            ok = self._update(h, r, 0.3 ** 2, gate=3.0)
            self.range_updates += ok
            self.range_rejected += not ok
