"""Vehicle avoidance: pick the side of a blocked lane with room and shift laterally around it.

Pure functions over the field corridor and a single vehicle footprint, unit-tested in isolation and
reusable by the `mission_sensed.py` subclass — so the pinned v10 source files stay byte-identical.

Agent-written for the owner's hobby/learning project; synthetic only.
"""
from stockcar.obstacles import GUIDE_PLUSH, footprint
from stockcar.passage import common_line, free_center_intervals

# Straightaway x travel bounds and lane centres, mirroring mission.py (low eastbound, high westbound).
_STRAIGHT_X = {"low": (44.0, 80.0), "high": (80.0, 44.0)}


def plan_straight(field, vehicles, side, default_y, robot_width=10.0, margin=0.25):
    """(lanes, mode, blocked) lane plan for one straightaway, from the *given* vehicle positions.

    `vehicles` is a list of ``{cx, cy, yaw[, shape]}`` dicts already on `side` (guide-size by default).
    The decision order and return shape mirror ``mission.lane_plan`` exactly so a sensed mission can swap
    this in behind an opt-in ``replan_lanes`` flag without touching the pinned v10 source:

    - ``clear``: one common line clears every vehicle;
    - ``lane_change``: an S-curve threads between vehicles in travel order;
    - ``contact``: at least one vehicle leaves no ``robot_width`` gap, so the robot must thread it.

    ``robot_width``/``margin`` parametrise the assumed footprint (the same values ``passage`` uses). At the
    defaults (10.0 / 0.25) this reproduces ``lane_plan`` byte-for-byte, which is the intended
    parity regression check. A smaller width is the one lever that turns ``contact`` straights
    back into passable ones — quantified in ``derived/avoid-v11/``.
    """
    band = field.corridor(side)
    x0, x1 = _STRAIGHT_X[side]
    if not vehicles:
        return [(x0, x1, default_y)], "clear", 0
    pairs = [(v, footprint(v.get("shape", GUIDE_PLUSH), v["cx"], v["cy"], v["yaw"])) for v in vehicles]
    if side == "high":
        pairs.sort(key=lambda it: -min(q[0] for q in it[1]))
    else:
        pairs.sort(key=lambda it: min(q[0] for q in it[1]))
    polys = [it[1] for it in pairs]
    intervals = [free_center_intervals(band, p, robot_width=robot_width, margin=margin) for p in polys]

    def pick(ivs, preferred=default_y):
        best = None
        for lo, hi in ivs:
            y = min(max(preferred, lo), hi)
            if best is None or abs(y - preferred) < abs(best - preferred):
                best = y
        return best

    if all(intervals) and common_line(intervals):
        merged = intervals[0]
        for ivs in intervals[1:]:
            merged = [(max(a, c), min(b, d)) for a, b in merged for c, d in ivs if max(a, c) <= min(b, d)]
        return [(x0, x1, pick(merged))], "clean", 0
    if all(intervals):
        spans = []
        for p, ivs in zip(polys, intervals):
            xs = [q[0] for q in p]
            spans.append((min(xs), max(xs), pick(ivs)))
        lanes = [(s[0], s[1], s[2]) if side == "low" else (s[1], s[0], s[2]) for s in spans]
        return lanes, "lane_change", 0
    blocked = sum(1 for ivs in intervals if not ivs)
    open_ivs = [ivs for ivs in intervals if ivs]
    y = pick(open_ivs[0]) if open_ivs else default_y
    return [(x0, x1, y)], "contact", blocked


class AvoidancePlanner:
    """Per-straight avoidance decision from given vehicle positions (see `plan_straight`)."""

    def __init__(self, field, robot_width=10.0, margin=0.25):
        self.field = field
        self.robot_width = robot_width
        self.margin = margin

    def plan_straight(self, vehicles, side, default_y):
        return plan_straight(self.field, vehicles, side, default_y, self.robot_width, self.margin)


def plan_shift(corridor, shape, cx, cy, yaw, preferred_y):
    """(avoid_y, side) — the centre of the widest open lateral band past one vehicle, preferring the band
    nearest `preferred_y` so the robot deviates only as much as needed. Returns (None, None) when the
    vehicle leaves no passable band (it spans the corridor).

    `corridor` is the (y_low, y_high) free straightaway band; `shape` is an obstacle dict with
    length_in/width_in (GUIDE_PLUSH-compatible).
    """
    pts = footprint(shape, cx, cy, yaw)
    oy0 = min(p[1] for p in pts)
    oy1 = max(p[1] for p in pts)
    lo, hi = corridor
    bands = [("low", lo, oy0), ("high", oy1, hi)]
    best = None
    for name, a, b in bands:
        if b - a <= 0:
            continue
        center = (a + b) / 2
        if best is None or abs(center - preferred_y) < abs(best[0] - preferred_y):
            best = (center, name)
    return best if best is not None else (None, None)


def shifted_target(points, target_dy):
    """Apply a lateral offset `target_dy` to a route point list on a straightaway (adds to each y)."""
    return [(x, y + target_dy) for x, y in points]