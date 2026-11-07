"""World route geometry — helpers that build on ``stockcar.routes`` without editing it.

``stockcar.routes`` is a pinned input of the sealed ``full-mission-v10`` and ``maneuver-v10``
packages, so the ruleset worlds add their route variants here instead of modifying that file.

Agent-written for the owner's hobby/learning project; synthetic only.
"""
from stockcar import routes


def lap_points(direction="ccw"):
    """Plain-lap waypoints (the 7.5 in lanes, no obstacle response) in field inches.

    ``ccw`` is the v10 route model: gate at the west apex, low straight eastbound, high straight
    westbound. ``cw`` mirrors it about the field centerline ``y = (LOW_LANE + HIGH_LANE) / 2``, run
    clockwise, so the two directions sweep the same corridor pair in opposite senses.
    """
    if direction not in ("ccw", "cw"):
        raise ValueError(f"unknown direction {direction!r}")
    pts = routes.lap(routes.lane_lines())
    if direction == "cw":
        cy = (routes.LOW_LANE + routes.HIGH_LANE) / 2.0
        return [(x, 2 * cy - y) for x, y in pts]
    return pts