"""Planar geometry for footprints and obstacles: convex polygons, separating-axis tests, circles."""
import math


def wrap(angle):
    return (angle + math.pi) % (2 * math.pi) - math.pi


def rectangle(cx, cy, yaw, length, width):
    """Corners of a length x width rectangle centered at (cx, cy), long side along yaw."""
    c, s = math.cos(yaw), math.sin(yaw)
    hl, hw = length / 2, width / 2
    return [(cx + c * x - s * y, cy + s * x + c * y) for x, y in ((hl, hw), (-hl, hw), (-hl, -hw), (hl, -hw))]


def axis_rect(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def regular_polygon(cx, cy, radius, sides=24):
    """Polygon circumscribing a circle, so it never under-represents the disc."""
    r = radius / math.cos(math.pi / sides)
    return [(cx + r * math.cos(2 * math.pi * k / sides), cy + r * math.sin(2 * math.pi * k / sides)) for k in range(sides)]


def extent(points, axis):
    values = [p[axis] for p in points]
    return min(values), max(values)


def _axes(poly):
    out = []
    for i in range(len(poly)):
        x0, y0 = poly[i]
        x1, y1 = poly[(i + 1) % len(poly)]
        dx, dy = x1 - x0, y1 - y0
        n = math.hypot(dx, dy)
        if n > 0:
            out.append((-dy / n, dx / n))
    return out


def _project(poly, axis):
    values = [p[0] * axis[0] + p[1] * axis[1] for p in poly]
    return min(values), max(values)


def separation(a, b):
    """Largest separating gap between convex polygons a and b (> 0 apart, <= 0 overlapping)."""
    best = -math.inf
    for axis in _axes(a) + _axes(b):
        a0, a1 = _project(a, axis)
        b0, b1 = _project(b, axis)
        gap = max(b0 - a1, a0 - b1)
        if gap > best:
            best = gap
    return best


def intersects(a, b, margin=0.0):
    return separation(a, b) < margin


def circle_polygon_distance(cx, cy, radius, poly):
    """Distance from a disc to a convex polygon (negative when they overlap)."""
    inside = True
    best = math.inf
    for i in range(len(poly)):
        x0, y0 = poly[i]
        x1, y1 = poly[(i + 1) % len(poly)]
        dx, dy = x1 - x0, y1 - y0
        cross = dx * (cy - y0) - dy * (cx - x0)
        if cross < 0:
            inside = False
        t = max(0.0, min(1.0, ((cx - x0) * dx + (cy - y0) * dy) / (dx * dx + dy * dy)))
        d = math.hypot(cx - (x0 + t * dx), cy - (y0 + t * dy))
        best = min(best, d)
    if inside:
        return -best - radius
    return best - radius
