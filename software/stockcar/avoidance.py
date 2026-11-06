"""Sensed-vehicle avoidance: pick the side of a blocked lane with room and shift laterally around it.

Pure functions over the field corridor and a single vehicle footprint, unit-tested in isolation and
reusable by the `mission_sensed.py` subclass — so the pinned v10 source files stay byte-identical.

Agent-written for the owner's hobby/learning project; synthetic only.
"""
from stockcar.obstacles import footprint


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