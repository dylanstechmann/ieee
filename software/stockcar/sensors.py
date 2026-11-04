"""Sensor models for the v10 simulator: wheel encoders, gyro, a downward reflectance array and low
time-of-flight range sensors. Parameters are placeholders until bench measurements replace them.
Agent-written for the owner's hobby/learning project; synthetic only.
"""
import math

WHEEL_RADIUS_IN = 40.0 / 25.4
TRACK_IN = 202.0 / 25.4
COUNTS_PER_REV = 1120          # firmware x1 decoding (64 CPR / 4 x 70:1)
REFLECTANCE_OFFSETS = [(4.5, -2.1 + 0.6 * k) for k in range(8)]   # (forward, left) in the robot frame
TOF_SENSORS = [(5.0, 2.0, math.radians(30)), (5.0, -2.0, math.radians(-30)), (0.0, 5.0, math.radians(90)), (0.0, -5.0, math.radians(-90))]
TOF_MAX_IN = 40.0


def point_in_convex(p, poly):
    sign = 0
    for i in range(len(poly)):
        x0, y0 = poly[i]
        x1, y1 = poly[(i + 1) % len(poly)]
        c = (x1 - x0) * (p[1] - y0) - (y1 - y0) * (p[0] - x0)
        if c != 0:
            s = 1 if c > 0 else -1
            if sign and s != sign:
                return False
            sign = s
    return True


def segment_distance(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    t = max(0.0, min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
    return math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))


def ring_distance(p, ring):
    return min(segment_distance(p, ring[i], ring[(i + 1) % len(ring)]) for i in range(len(ring)))


def outward_normal(p, ring):
    """Unit normal, pointing away from the ring's center, of the ring edge nearest to p."""
    i = min(range(len(ring)), key=lambda k: segment_distance(p, ring[k], ring[(k + 1) % len(ring)]))
    a, b = ring[i], ring[(i + 1) % len(ring)]
    nx, ny = b[1] - a[1], a[0] - b[0]
    length = math.hypot(nx, ny)
    cx, cy = sum(q[0] for q in ring) / len(ring), sum(q[1] for q in ring) / len(ring)
    away = 1 if nx * (a[0] - cx) + ny * (a[1] - cy) > 0 else -1
    return away * nx / length, away * ny / length


class Band:
    """The white octagonal marking band between the outer and inner rings of the CAD field."""

    def __init__(self, field):
        m = field.data["features"]["track_marking"]
        self.outer = [tuple(p) for p in m["outer_ring"]]
        self.inner = [tuple(p) for p in m["inner_ring"]]
        self.edges = [(ring[i], ring[(i + 1) % len(ring)]) for ring in (self.outer, self.inner) for i in range(len(ring))]

    def white(self, p):
        return point_in_convex(p, self.outer) and not point_in_convex(p, self.inner)

    def edge_distance(self, p):
        return min(segment_distance(p, a, b) for a, b in self.edges)


def ray_cast(origin, angle, polygons, max_range=TOF_MAX_IN):
    """Distance along a ray to the nearest polygon edge, or None beyond max_range."""
    ox, oy = origin
    dx, dy = math.cos(angle), math.sin(angle)
    best = None
    for poly in polygons:
        for i in range(len(poly)):
            ax, ay = poly[i]
            bx, by = poly[(i + 1) % len(poly)]
            ex, ey = bx - ax, by - ay
            den = dx * ey - dy * ex
            if abs(den) < 1e-12:
                continue
            t = ((ax - ox) * ey - (ay - oy) * ex) / den
            u = ((ax - ox) * dy - (ay - oy) * dx) / den
            if t >= 0 and 0 <= u <= 1 and (best is None or t < best):
                best = t
    return best if best is not None and best <= max_range else None


def to_world(pose, offset):
    x, y, th = pose
    fx, fy = offset[0], offset[1]
    return (x + fx * math.cos(th) - fy * math.sin(th), y + fx * math.sin(th) + fy * math.cos(th))


class SensorSuite:
    def __init__(self, rng, field, barriers, vehicles, gyro_bias_sd=0.01, gyro_noise=0.02, slip_sd=0.02,
                 tof_noise=0.3, tof_dropout=0.05):
        self.rng = rng
        self.band = Band(field)
        self.barriers = barriers
        self.vehicles = vehicles
        self.gyro_bias = rng.gauss(0.0, gyro_bias_sd)
        self.gyro_scale = 1.0 + rng.gauss(0.0, 0.01)
        self.gyro_noise = gyro_noise
        self.slip = (1.0 + rng.gauss(0.0, slip_sd), 1.0 + rng.gauss(0.0, slip_sd))
        self.tof_noise = tof_noise
        self.tof_dropout = tof_dropout
        self.wheel_travel = [0.0, 0.0]
        self.counts = [0, 0]
        self.last_white = None

    def measure(self, pose, v, w, dt):
        travel = (v * dt - w * TRACK_IN / 2 * dt, v * dt + w * TRACK_IN / 2 * dt)
        out = {}
        new_counts = []
        for k in range(2):
            self.wheel_travel[k] += travel[k] * self.slip[k]
            new_counts.append(int(math.floor(self.wheel_travel[k] / (2 * math.pi * WHEEL_RADIUS_IN) * COUNTS_PER_REV)))
        out["encoder_delta"] = (new_counts[0] - self.counts[0], new_counts[1] - self.counts[1])
        self.counts = new_counts
        out["gyro"] = w * self.gyro_scale + self.gyro_bias + self.rng.gauss(0.0, self.gyro_noise)
        white = [self.band.white(to_world(pose, o)) for o in REFLECTANCE_OFFSETS]
        out["white"] = white
        out["line_changes"] = [k for k in range(len(white)) if self.last_white is not None and white[k] != self.last_white[k]]
        self.last_white = white
        ranges = []
        for fx, fy, a in TOF_SENSORS:
            origin = to_world(pose, (fx, fy))
            if self.rng.random() < self.tof_dropout:
                ranges.append(None)
                continue
            r = ray_cast(origin, pose[2] + a, self.barriers + self.vehicles)
            ranges.append(None if r is None else r + self.rng.gauss(0.0, self.tof_noise))
        out["tof"] = ranges
        return out
