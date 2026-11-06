# MicroPython-safe planar geometry for the on-board estimator. Mirrors the pieces of
# software/stockcar/sensors.py and geometry.py the filter needs, avoiding math.hypot/remainder/isclose
# (which the MicroPython lint forbids) in favour of `hypot2` and `wrap`.
import math


def wrap(a):
    return (a + math.pi) % (2 * math.pi) - math.pi


def hypot2(x, y):
    return math.sqrt(x * x + y * y)


def segment_distance(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    t = max(0.0, min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
    return hypot2(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))


def ring_distance(p, ring):
    return min(segment_distance(p, ring[i], ring[(i + 1) % len(ring)]) for i in range(len(ring)))


def outward_normal(p, ring):
    """Unit normal, pointing away from the ring's centre, of the ring edge nearest to p."""
    i = min(range(len(ring)), key=lambda k: segment_distance(p, ring[k], ring[(k + 1) % len(ring)]))
    a, b = ring[i], ring[(i + 1) % len(ring)]
    nx, ny = b[1] - a[1], a[0] - b[0]
    length = hypot2(nx, ny)
    cx = sum(q[0] for q in ring) / len(ring)
    cy = sum(q[1] for q in ring) / len(ring)
    away = 1 if nx * (a[0] - cx) + ny * (a[1] - cy) > 0 else -1
    return away * nx / length, away * ny / length


def to_world(pose, offset):
    x, y, th = pose
    fx, fy = offset
    return (x + fx * math.cos(th) - fy * math.sin(th), y + fx * math.sin(th) + fy * math.cos(th))


def ray_cast(origin, angle, polygons, max_range):
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
            if -1e-12 < den < 1e-12:
                continue
            t = ((ax - ox) * ey - (ay - oy) * ex) / den
            u = ((ax - ox) * dy - (ay - oy) * dx) / den
            if t >= 0 and 0 <= u <= 1 and (best is None or t < best):
                best = t
    return best if best is not None and best <= max_range else None


# 4x4 matrix helpers for the filter covariance (state is [x, y, heading, gyro bias]).
def mat(n, m, v=0.0):
    return [[v] * m for _ in range(n)]


def mul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(len(b))) for j in range(len(b[0]))] for i in range(len(a))]


def transpose(a):
    return [list(r) for r in zip(*a)]


def add(a, b):
    return [[a[i][j] + b[i][j] for j in range(len(a[0]))] for i in range(len(a))]