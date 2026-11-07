"""White-line straightaway geometry for the ruleset worlds.

The organizer CAD marking is a 0.899 in horizontal band along each straightaway. This module extracts
the exact low/high quads from ``field-v10.json``, derives the physical outer/inner lane bands, and
tests convex robot footprints against those marking quads. The rounded/end marking segments are
intentionally excluded: the enforced-lane rule is a straightaway-only assumption, not a hard stop.

Agent-written for the owner's hobby/learning project; synthetic only.
"""
from stockcar.geometry import axis_rect, separation

MARKING_EDGE_LOW = 1
MARKING_EDGE_HIGH = 5
CONTACT_EPS = 1e-9


def _edge(ring, index):
    a, b = ring[index], ring[(index + 1) % len(ring)]
    return a, b


def _horizontal_quad(field, edge_index, low):
    tm = field.data["features"]["track_marking"]
    outer, inner = tm["outer_ring"], tm["inner_ring"]
    if len(outer) != 8 or len(inner) != 8:
        raise ValueError("track_marking rings must have eight vertices")
    (ox0, oy0), (ox1, oy1) = _edge(outer, edge_index)
    (ix0, iy0), (ix1, iy1) = _edge(inner, edge_index)
    if abs(oy0 - oy1) > 1e-9 or abs(iy0 - iy1) > 1e-9:
        raise ValueError(f"track_marking edge {edge_index} is not horizontal")
    if low and not (ox0 < ox1 and ix0 < ix1):
        raise ValueError("low straight edge must run eastward")
    if not low and not (ox0 > ox1 and ix0 > ix1):
        raise ValueError("high straight edge must run westward")
    if max(abs(ox0 - ix0), abs(ox1 - ix1)) > 0.01:
        raise ValueError("outer/inner straight edges have mismatched x extents")
    x0, x1 = min(ox0, ox1, ix0, ix1), max(ox0, ox1, ix0, ix1)
    if low:
        y0, y1 = oy0, iy0
    else:
        y0, y1 = iy0, oy0
    if y1 - y0 <= 0:
        raise ValueError("marking band width must be positive")
    expected = tm["band_width_in"]
    if abs((y1 - y0) - expected) > 0.01:
        raise ValueError("marking band width does not match track_marking metadata")
    return axis_rect(x0, y0, x1, y1)


def straight_marking_bands(field):
    """Exact low/high straight marking quads as four-vertex polygons."""
    low = _horizontal_quad(field, MARKING_EDGE_LOW, True)
    high = _horizontal_quad(field, MARKING_EDGE_HIGH, False)
    if low[0][1] >= low[2][1] or high[0][1] >= high[2][1]:
        raise ValueError("marking quads must be non-degenerate")
    return {"low": low, "high": high}


def lane_bands(field):
    """Physical y intervals for each side's outer/inner lane, excluding the marking bands."""
    bands = straight_marking_bands(field)
    walls, divider = field.walls, field.center_divider
    low_outer = (walls[1], bands["low"][0][1])
    low_inner = (bands["low"][2][1], divider[1])
    high_inner = (divider[3], bands["high"][0][1])
    high_outer = (bands["high"][2][1], walls[3])
    for name, (a, b) in (("low.outer", low_outer), ("low.inner", low_inner),
                         ("high.inner", high_inner), ("high.outer", high_outer)):
        if a >= b:
            raise ValueError(f"degenerate lane band {name}")
    return {"low": {"outer": low_outer, "inner": low_inner},
            "high": {"outer": high_outer, "inner": high_inner}}


def marking_contacts(poly, bands):
    """Names of straight marking bands touched or overlapped by a convex footprint polygon."""
    names = []
    for name in ("low", "high"):
        if separation(poly, bands[name]) <= CONTACT_EPS:
            names.append(name)
    return names


def lane_center_intervals(field, side, lane, robot_width=10.0, margin=0.25):
    """Center-y interval for a robot footprint wholly inside one physical lane, or () if empty."""
    if side not in ("low", "high"):
        raise ValueError(side)
    if lane not in ("outer", "inner"):
        raise ValueError(lane)
    band = lane_bands(field)[side][lane]
    half = robot_width / 2 + margin
    lo, hi = band[0] + half, band[1] - half
    return (lo, hi) if lo <= hi else ()