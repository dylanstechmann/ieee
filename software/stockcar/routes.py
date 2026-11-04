"""Lap routes with a chosen line past each obstacle quadrant.

A lap is set by four numbers: the robot's y as it passes each quadrant. Corners stretch to reach those
lines before the divider ends, because a vehicle can sit at the very start of a quadrant. Each quadrant
holds a vehicle in its outer or inner lane, or is empty; exactly one is empty (Appendix E), so there are
32 configurations. Same assumed route as stockcar.mission: counterclockwise from the gate at the west apex.
"""
import itertools
import math

from stockcar import profile
from stockcar.mission import GATE, HIGH_LANE, LOW_LANE, R_TURN, STEP, _blend, line

QUADRANTS = ("low_west", "low_east", "high_west", "high_east")
WEST_X, EAST_X, MIDDLE_X = 44.0, 80.0, 62.0
CHANGE_IN = 16.0     # a lane change between quadrants, centered on the gap between them
HALF_ROBOT_IN = 5.0
PIT_SMOOTHING_IN = 4.0   # the simulator's pit routes have sharp corners, which a moving robot cannot follow
PIT_SPEED_IN_S = 8.0
LETTERS = {"outer": "o", "inner": "i", None: "-"}


def _ellipse(center, ax, ay, a0, a1):
    n = max(2, int(abs(a1 - a0) * max(ax, ay) / STEP))
    return [(center[0] + ax * math.cos(a0 + (a1 - a0) * k / n), center[1] + ay * math.sin(a0 + (a1 - a0) * k / n)) for k in range(1, n + 1)]


def _from_gate(y):
    """Gate to (WEST_X, y) heading east: a straight drop and an arc, or a squeezed arc if y is close."""
    drop = GATE[1] - y
    if drop > R_TURN:
        return line(GATE, (GATE[0], y + R_TURN)) + _ellipse((WEST_X, y + R_TURN), R_TURN, R_TURN, math.pi, 1.5 * math.pi)
    return _ellipse((WEST_X, GATE[1]), R_TURN, drop, math.pi, 1.5 * math.pi)


def _to_gate(y):
    """(WEST_X, y) heading west to the gate; the mirror of _from_gate."""
    rise = y - GATE[1]
    if rise > R_TURN:
        return _ellipse((WEST_X, y - R_TURN), R_TURN, R_TURN, 0.5 * math.pi, math.pi) + line((GATE[0], y - R_TURN), GATE)
    return _ellipse((WEST_X, GATE[1]), R_TURN, rise, 0.5 * math.pi, math.pi)


def _east_turn(y_low, y_high):
    half = (y_high - y_low) / 2
    if half > R_TURN:
        top, bottom = y_high - R_TURN, y_low + R_TURN
        return (_ellipse((EAST_X, bottom), R_TURN, R_TURN, -0.5 * math.pi, 0.0) + line((EAST_X + R_TURN, bottom), (EAST_X + R_TURN, top))
                + _ellipse((EAST_X, top), R_TURN, R_TURN, 0.0, 0.5 * math.pi))
    return _ellipse((EAST_X, (y_low + y_high) / 2), R_TURN, half, -0.5 * math.pi, 0.5 * math.pi)


def _straight(x0, x1, y0, y1):
    sign = 1 if x1 > x0 else -1
    pts = []
    n = int(abs(x1 - x0) / STEP)
    for k in range(1, n + 1):
        x = x0 + sign * STEP * k
        t = ((x - MIDDLE_X) * sign + CHANGE_IN / 2) / CHANGE_IN
        pts.append((x, y0 + (y1 - y0) * _blend(t)))
    return pts


def lap(lines):
    """Lap points from the y to hold past each quadrant."""
    return ([GATE] + _from_gate(lines["low_west"]) + _straight(WEST_X, EAST_X, lines["low_west"], lines["low_east"])
            + _east_turn(lines["low_east"], lines["high_east"]) + _straight(EAST_X, WEST_X, lines["high_east"], lines["high_west"])
            + _to_gate(lines["high_west"]))


def pit_table(points, planning, half_track_in):
    """A route table for a leg in the pit area: corners rounded, speed capped."""
    return profile.build(profile.smooth(points, PIT_SMOOTHING_IN), profile.limits(planning, half_track_in, PIT_SPEED_IN_S))


def configurations():
    """Every lane assignment with exactly one empty quadrant."""
    for empty in QUADRANTS:
        others = [q for q in QUADRANTS if q != empty]
        for lanes in itertools.product(("outer", "inner"), repeat=3):
            yield {empty: None, **dict(zip(others, lanes))}


def key(config):
    """Short name, in QUADRANTS order: o outer, i inner, - empty."""
    return "".join(LETTERS[config[q]] for q in QUADRANTS)


def pass_line(field, quadrant, lane, margin):
    """The y that keeps the robot `margin` from the wall or divider on the far side from the vehicle."""
    side = "low" if quadrant.startswith("low") else "high"
    lo, hi = field.corridor(side)
    toward_high = (side == "low") == (lane == "outer")
    return hi - HALF_ROBOT_IN - margin if toward_high else lo + HALF_ROBOT_IN + margin


def lines_for(field, config, margin):
    """Far-side lines for a configuration; an empty quadrant takes its neighbor's line, avoiding a lane change."""
    y = {q: pass_line(field, q, config[q], margin) for q in QUADRANTS if config[q]}
    for quadrant, neighbor in (("low_west", "low_east"), ("low_east", "low_west"), ("high_west", "high_east"), ("high_east", "high_west")):
        if quadrant not in y:
            y[quadrant] = y[neighbor]
    return y


def lane_lines():
    """The plain lap: the 7.5 in lanes, whatever the vehicles."""
    return {"low_west": LOW_LANE, "low_east": LOW_LANE, "high_west": HIGH_LANE, "high_east": HIGH_LANE}
