"""Attribute each vehicle-contact step of a simulated mission to the route phase where it happened.

The counterclockwise lap has two 7.5 in arcs (west at x=44, east at x=80) and two straightaways whose
`mission.straight`/`lane_y` build a 12 in entry blend, a lane zone, and a 12 in exit blend. This module
maps a robot pose to that phase so a study can say *where* contacts happen instead of only counting
them. Diagnostic only: the simulator's own `wall_contacts`/`vehicle_contacts` stay the authority.

Agent-written for the owner's hobby/learning project; synthetic only.
"""
from stockcar.geometry import separation

# Constants mirrored from the pinned v10 source (mission.py) so every value is traceable to it.
WEST_X, EAST_X = 44.0, 80.0      # straightaway endpoints; the west/east arcs live outside these
CENTER_Y = 24.0                  # divider centre: below = low (eastbound) straight, above = high
BLEND_IN = 12.0                  # mission.lane_y(..., blend=12.0)

PHASES = ("arc", "entry_blend", "lane_hold", "lane_change", "exit_blend", "off_straight")


def phase_of(sim, x, y):
    """The lap phase a robot at (x, y) is driving through, or ``off_straight`` off the LAP route.

    Entry/exit blend bounds follow ``lane_y`` exactly: on the low straight the entry blend is the first
    12 in of eastbound travel (x < 56) and the exit blend the last 12 in (x > 68); on the high straight
    the travel direction reverses, so entry is x > 68 and exit x < 56. The lane zone between them is a
    ``lane_change`` only when that straightaway's plan actually switches lanes.
    """
    if sim.route_name != "LAP":
        return "off_straight"
    if x < WEST_X or x > EAST_X:
        return "arc"
    if y < CENTER_Y:              # low, eastbound
        if x < WEST_X + BLEND_IN:
            return "entry_blend"
        if x > EAST_X - BLEND_IN:
            return "exit_blend"
        mode = sim.low_mode
    else:                         # high, westbound
        if x > EAST_X - BLEND_IN:
            return "entry_blend"
        if x < WEST_X + BLEND_IN:
            return "exit_blend"
        mode = sim.high_mode
    return "lane_change" if mode == "lane_change" else "lane_hold"


def attribute(sim, layout):
    """``ContactRecord`` for each vehicle the robot's footprint overlaps this frame.

    One record per overlapped vehicle, so a single step can hold several records if two vehicles
    interpenetrate the robot at once. Summed counts therefore follow the per-step truth, and the
    per-step (non-empty frame) count equals the simulator's ``vehicle_contact_steps``.
    """
    out = []
    if sim.route_name is None:
        return out
    poly = sim._footprint(sim.state["x"], sim.state["y"], sim.state["th"])
    phase = phase_of(sim, sim.state["x"], sim.state["y"])
    lap = min(sim.sup.laps, 2)
    for i, v in enumerate(layout.vehicles):
        if separation(poly, layout.polys[i]) < 0:
            out.append({
                "route": sim.route_name,
                "vehicle": i,
                "quadrant": v.get("quadrant"),
                "x_in": round(sim.state["x"], 2),
                "y_in": round(sim.state["y"], 2),
                "phase": phase,
                "lap": lap,
            })
    return out