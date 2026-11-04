"""Obstacle shapes and placements under GM2 Appendix E (three quadrant readings, QA03)."""
import math

from stockcar.geometry import extent, rectangle

GUIDE_PLUSH = {"id": "guide_plush", "length_in": 8.55, "width_in": 8.2,
               "source": "organizer build guide p. 11, approximate; not a measured vehicle"}
V9_CIRCLE = {"id": "v9_circle", "radius_in": 0.058 / 0.0254, "source": "mission-v9 stand-in, historical only"}


def footprint(shape, cx, cy, yaw):
    if "radius_in" in shape:
        r = shape["radius_in"]
        return [(cx + r * math.cos(2 * math.pi * k / 24) / math.cos(math.pi / 24),
                 cy + r * math.sin(2 * math.pi * k / 24) / math.cos(math.pi / 24)) for k in range(24)]
    return rectangle(cx, cy, yaw, shape["length_in"], shape["width_in"])


def lane_band(quadrant, side, lane):
    """y band of a quadrant half. 'outer' is the half nearer the side wall, 'inner' nearer the divider."""
    x0, y0, x1, y1 = quadrant
    mid = (y0 + y1) / 2
    near_wall_is_low = side == "low"
    if lane == "outer":
        return (y0, mid) if near_wall_is_low else (mid, y1)
    if lane == "inner":
        return (mid, y1) if near_wall_is_low else (y0, mid)
    raise ValueError(lane)


def center_range(quadrant, side, lane, shape, yaw):
    """Allowed obstacle centers: center inside the lane half, footprint wholly inside the quadrant."""
    x0, y0, x1, y1 = quadrant
    pts = footprint(shape, 0.0, 0.0, yaw)
    hx = max(abs(p[0]) for p in pts)
    hy = max(abs(p[1]) for p in pts)
    b0, b1 = lane_band(quadrant, side, lane)
    cx0, cx1 = x0 + hx, x1 - hx
    cy0, cy1 = max(b0, y0 + hy), min(b1, y1 - hy)
    if cx0 > cx1 + 1e-9 or cy0 > cy1 + 1e-9:
        return None
    return (cx0, cx1), (cy0, cy1)


def grid(lo, hi, step):
    n = max(0, int(math.floor((hi - lo) / step + 1e-9)))
    return [lo + k * step for k in range(n + 1)] + ([hi] if hi - (lo + n * step) > 1e-9 else [])


def placements(quadrant, side, lane, shape, yaws=(0.0, math.pi / 2), step=0.25):
    out = []
    for yaw in yaws:
        rng = center_range(quadrant, side, lane, shape, yaw)
        if rng is None:
            continue
        for cx in grid(rng[0][0], rng[0][1], step):
            for cy in grid(rng[1][0], rng[1][1], step):
                out.append((cx, cy, yaw))
    return out


def straight_pass_gap(corridor, shape, cx, cy, yaw):
    """Widest free lateral gap beside one obstacle for a robot driving straight along x."""
    y_lo, y_hi = corridor
    oy0, oy1 = extent(footprint(shape, cx, cy, yaw), 1)
    return max(oy0 - y_lo, y_hi - oy1)
