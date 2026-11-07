"""World route geometry — helpers that build on ``stockcar.routes`` without editing it.

``stockcar.routes`` is a pinned input of the sealed ``full-mission-v10`` and ``maneuver-v10``
packages, so the ruleset worlds add their route variants here instead of modifying that file.

Agent-written for the owner's hobby/learning project; synthetic only.
"""
import itertools

from stockcar import mission, routes, world_geometry
from stockcar.passage import free_center_intervals


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


# -- enforced-lane planning ---------------------------------------------------


def _intersection(interval_sets):
    candidates = list(interval_sets[0]) if interval_sets else []
    for intervals in interval_sets[1:]:
        merged = []
        for a0, a1 in candidates:
            for b0, b1 in intervals:
                lo, hi = max(a0, b0), min(a1, b1)
                if lo <= hi:
                    merged.append((lo, hi))
        candidates = merged
    return candidates


def _pick(intervals, default_y):
    best = None
    for lo, hi in intervals:
        y = min(max(default_y, lo), hi)
        if best is None or abs(y - default_y) < abs(best - default_y):
            best = y
    return best


def _default_lane(field, side, default_y):
    best_lane, best_key = None, None
    for lane in ("outer", "inner"):
        iv = world_geometry.lane_center_intervals(field, side, lane)
        if iv:
            y = _pick([iv], default_y)
        else:
            band = world_geometry.lane_bands(field)[side][lane]
            y = (band[0] + band[1]) / 2
        key = (abs(y - default_y), lane)
        if best_key is None or key < best_key:
            best_lane, best_key = lane, key
    return best_lane


def _lane_changes(assign, default_lane):
    changes = 1 if assign[0] != default_lane else 0
    changes += sum(a != b for a, b in zip(assign, assign[1:]))
    return changes


def _spans(items, ys, side):
    out = []
    for item, y in zip(items, ys):
        if side == "low":
            out.append((item["x0"], item["x1"], y))
        else:
            out.append((item["x1"], item["x0"], y))
    return out


def enforced_lane_plan(field, layout, side, default_y):
    """Plan one enforced straightaway and report feasibility/fallback diagnostics."""
    if side not in ("low", "high"):
        raise ValueError(side)
    default_lane = _default_lane(field, side, default_y)
    x0, x1 = (routes.WEST_X, routes.EAST_X) if side == "low" else (routes.EAST_X, routes.WEST_X)
    bands = world_geometry.lane_bands(field)[side]
    polys = [p for p, v in zip(layout.polys, layout.vehicles) if v["side"] == side]
    if side == "high":
        polys.sort(key=lambda p: -min(q[0] for q in p))
    else:
        polys.sort(key=lambda p: min(q[0] for q in p))
    items = []
    for poly in polys:
        xs = [q[0] for q in poly]
        items.append({"x0": min(xs), "x1": max(xs), "poly": poly,
                      "options": {lane: free_center_intervals(bands[lane], poly) for lane in ("outer", "inner")}})

    def result(lanes, mode, blocked, changes, infeasible, fallback, extra=None):
        out = {"lanes": lanes, "mode": mode, "blocked": blocked,
               "planned_lane_changes": changes, "infeasible_vehicles": infeasible,
               "fallback": fallback, "default_lane": default_lane}
        if extra:
            out.update(extra)
        return out

    if not items:
        return result([(x0, x1, default_y)], "clean", 0, 0, 0, False)

    individually_infeasible = sum(1 for item in items if not any(item["options"].values()))
    if individually_infeasible:
        base_lanes, base_mode, base_blocked = mission.lane_plan(field, layout, side, default_y)
        return result(base_lanes, "fallback", base_blocked, 0, individually_infeasible, True,
                      {"baseline_mode": base_mode})

    for lane in ("outer", "inner"):
        merged = _intersection([item["options"][lane] for item in items])
        if merged:
            y = _pick(merged, default_y)
            changes = _lane_changes([lane] * len(items), default_lane)
            return result([(x0, x1, y)], "clean", 0, changes, 0, False,
                          {"lane_assignments": [lane] * len(items)})

    best = None
    for assign in itertools.product(("outer", "inner"), repeat=len(items)):
        ys = []
        feasible = True
        for item, lane in zip(items, assign):
            y = _pick(item["options"][lane], default_y)
            if y is None:
                feasible = False
                break
            ys.append(y)
        if not feasible:
            continue
        changes = _lane_changes(list(assign), default_lane)
        key = (changes, sum(abs(y - default_y) for y in ys), tuple(assign))
        if best is None or key < best[0]:
            best = (key, list(assign), ys)
    if best is None:
        base_lanes, base_mode, base_blocked = mission.lane_plan(field, layout, side, default_y)
        return result(base_lanes, "fallback", base_blocked, 0, individually_infeasible, True,
                      {"baseline_mode": base_mode, "infeasible_lane_assignments": True})
    key, assign, ys = best
    return result(_spans(items, ys, side), "lane_change", 0, key[0], 0, False,
                  {"lane_assignments": assign})