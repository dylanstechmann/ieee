# On-board EKF, a MicroPython-safe port of software/stockcar/estimator.py. Same state, predict and
# correct as the host filter; `geom.wrap` stands in for `math.remainder` and `geom.hypot2` for
# `math.hypot`, so the last float bits can differ. Static map data comes from field_tables.py.
import math

import field_tables as ft
import geom


class Band:
    """The white octagonal marking band from the generated tables."""
    def __init__(self):
        self.outer = [tuple(p) for p in ft.BAND_OUTER]
        self.inner = [tuple(p) for p in ft.BAND_INNER]


class EstimatorBoard:
    def __init__(self, pose, band=None, barriers=None, pos_sd=0.5, heading_sd=0.03, bias_sd=0.02):
        self.x = [pose[0], pose[1], pose[2], 0.0]
        self.P = geom.mat(4, 4)
        for i, s in enumerate((pos_sd, pos_sd, heading_sd, bias_sd)):
            self.P[i][i] = s * s
        self.band = band if band is not None else Band()
        self.barriers = barriers if barriers is not None else ft.BARRIERS
        self.matching = "ring"
        self.use_stillness = True
        self.before = self.after = tuple(pose)
        self.line_updates = 0
        self.line_skipped = 0
        self.bias_updates = 0
        self.range_updates = 0
        self.range_rejected = 0

    def pose(self):
        return self.x[0], self.x[1], self.x[2]

    def predict(self, encoder_delta, gyro, dt):
        per_count = 2 * math.pi * ft.WHEEL_RADIUS_IN / ft.COUNTS_PER_REV
        ds = (encoder_delta[0] + encoder_delta[1]) / 2 * per_count
        x, y, th, b = self.x
        dth = (gyro - b) * dt
        mid = th + dth / 2
        self.x = [x + ds * math.cos(mid), y + ds * math.sin(mid), geom.wrap(th + dth), b]
        self.before, self.after = (x, y, th), tuple(self.x[:3])
        F = [[1, 0, -ds * math.sin(mid), ds * math.sin(mid) * dt / 2],
             [0, 1, ds * math.cos(mid), -ds * math.cos(mid) * dt / 2],
             [0, 0, 1, -dt],
             [0, 0, 0, 1]]
        q_s = (0.02 * abs(ds) + per_count) ** 2
        Q = [[q_s, 0, 0, 0], [0, q_s, 0, 0],
             [0, 0, (0.02 * dt) ** 2 + (0.002 * abs(dth)) ** 2, 0], [0, 0, 0, (1e-4) ** 2]]
        self.P = geom.add(geom.mul(geom.mul(F, self.P), geom.transpose(F)), Q)

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
        S = geom.mul(geom.mul(H, self.P), geom.transpose(H))[0][0] + r_var
        innov = z - h0
        if innov * innov > gate * gate * S:
            return False
        K = [row[0] / S for row in geom.mul(self.P, geom.transpose(H))]
        self.x = [self.x[i] + K[i] * innov for i in range(4)]
        self.x[2] = geom.wrap(self.x[2])
        KH = [[K[i] * H[0][j] for j in range(4)] for i in range(4)]
        I_KH = [[(1.0 if i == j else 0.0) - KH[i][j] for j in range(4)] for i in range(4)]
        self.P = geom.mul(I_KH, self.P)
        return True

    def _crossing(self, offset, turned_white):
        start = geom.to_world(self.before, offset)
        end = geom.to_world(self.after, offset)
        mx, my = end[0] - start[0], end[1] - start[1]
        length = geom.hypot2(mx, my)
        if length < 1e-6:
            return None
        nx, ny = geom.outward_normal(end, self.band.outer)
        along = (mx * nx + my * ny) / length
        if abs(along) < ft.SHALLOWEST_CROSSING:
            return None
        ring = self.band.inner if (along > 0) == turned_white else self.band.outer
        return ring, (-mx / 2, -my / 2), ft.LINE_NOISE_IN ** 2 + length * length / 12

    def _line_update(self, offset, turned_white):
        crossing = self._crossing(offset, turned_white)
        if crossing is None:
            self.line_skipped += 1
            return False
        ring, (bx, by), r_var = crossing

        def h(s):
            px, py = geom.to_world((s[0], s[1], s[2]), offset)
            return geom.ring_distance((px + bx, py + by), ring)

        return self._update(h, 0.0, r_var, gate=3.0)

    def correct(self, meas, use_lines=True, use_ranges=True):
        if self.use_stillness and tuple(meas.get("encoder_delta", (1, 1))) == (0, 0):
            self.bias_updates += self._update(lambda s: s[3], meas["gyro"], ft.GYRO_NOISE_RAD_S ** 2, gate=4.0)
        for k in (meas.get("line_changes", []) if use_lines else []):
            self.line_updates += self._line_update(ft.REFLECTANCE_OFFSETS[k], meas["white"][k])
        for (fx, fy, a), r in zip(ft.TOF_SENSORS, meas.get("tof", []) if use_ranges else []):
            if r is None:
                continue

            def h(s, fx=fx, fy=fy, a=a):
                origin = geom.to_world((s[0], s[1], s[2]), (fx, fy))
                return geom.ray_cast(origin, s[2] + a, self.barriers, ft.TOF_MAX_IN)

            ok = self._update(h, r, 0.3 ** 2, gate=3.0)
            self.range_updates += ok
            self.range_rejected += not ok