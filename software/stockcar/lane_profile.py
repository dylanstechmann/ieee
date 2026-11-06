"""Vehicle-aware lateral profile for one straightaway.

`mission.straight`/`lane_y` blend into and out of every lane over a fixed 12 in, so a vehicle sitting
near an arc exit is swept through by the incoming blend. This module replaces that with blends timed to
each vehicle: the robot reaches the lane it needs by the vehicle's padded near edge and holds it past
the padded far edge. A vehicle whose lane cannot be reached in time (for example one right at the arc
exit) is reported as infeasible rather than silently driven through.

Pure and unit-tested; the pinned v10 source files are untouched.

Agent-written for the owner's hobby/learning project; synthetic only.
"""
import math

STEP = 0.5  # same sampling as mission.straight


def _blend(t):
    t = min(1.0, max(0.0, t))
    return (1 - math.cos(math.pi * t)) / 2


def _y_at(pieces, d):
    for d0, d1, y0, y1 in pieces:
        if d0 - 1e-9 <= d <= d1 + 1e-9:
            span = max(1e-9, d1 - d0)
            return y0 + (y1 - y0) * _blend((d - d0) / span)
    return pieces[-1][3] if pieces else 0.0


def lateral_profile(x0, x1, y_start, y_end, spans, blend_in=8.0, min_blend_in=2.0):
    """Lateral profile over the straight [x0, x1], reaching each span's lane before its near edge.

    `spans` are ``(x_near, x_far, y)`` in travel order, with ``x_near``/``x_far`` already padded by half
    the robot length plus margin. The robot holds the previous lane until the previous span's far edge,
    blends across the gap to the next lane (finishing at its near edge), and holds it to the far edge.
    A gap shorter than ``min_blend_in`` marks that span infeasible; the blend is still drawn over
    whatever room exists so the profile stays defined.

    Returns ``{"points", "feasible", "infeasible_vehicles"}``; ``points`` match `mission.straight`'s
    sampling (x from x0+STEP to x1) so it can replace ``straight(...)`` in a route builder.
    """
    sign = 1 if x1 > x0 else -1
    total = abs(x1 - x0)

    def dpos(x):
        return (x - x0) * sign

    def xpos(d):
        return x0 + sign * d

    items = sorted((dpos(xn), dpos(xf), y, i) for i, (xn, xf, y) in enumerate(spans))
    infeasible = []
    pieces = []
    prev_d, prev_y = 0.0, y_start
    for near, far, y, idx in items:
        near = max(0.0, min(total, near))
        far = max(near, min(total, far))
        if near - prev_d < min_blend_in:
            # Not enough room to reach the lane before the vehicle: report it infeasible and blend as
            # best we can over the whole span, so the route stays continuous and still moves toward
            # the lane (reaching it by the far edge) instead of jumping or driving at the wrong lane.
            infeasible.append(idx)
            if far > prev_d:
                pieces.append((prev_d, far, prev_y, y))
            prev_d, prev_y = far, y
            continue
        # Hold the previous lane until the last `blend_in` inches before the near edge, then blend so
        # the lane is reached at the near edge. Too little room to move is an infeasible span.
        blend_len = min(blend_in, near - prev_d)
        blend_start = near - blend_len
        if blend_start > prev_d:
            pieces.append((prev_d, blend_start, prev_y, prev_y))  # keep the previous lane
        if near > blend_start:
            pieces.append((blend_start, near, prev_y, y))          # blend into the lane
        if far > near:
            pieces.append((near, far, y, y))                       # hold across the vehicle
        prev_d, prev_y = far, y
    if total > prev_d:
        pieces.append((prev_d, total, prev_y, y_end))
    if not pieces:
        pieces.append((0.0, total, y_start, y_end))

    n = max(1, round(total / STEP))
    points = [(xpos(total * k / n), _y_at(pieces, total * k / n)) for k in range(1, n + 1)]
    # Reserve `blend_in` for a gentle exit onto y_end, whatever the last vehicle's padded tail does —
    # otherwise a vehicle hugging the straightaway end leaves a near-vertical exit the follower can't
    # track. The exit re-blends from the sampled y just before the zone so the route stays continuous.
    exit_n = max(1, round(blend_in / STEP))
    if len(points) > exit_n:
        anchor_y = points[-exit_n - 1][1]
        for j in range(exit_n):
            idx = len(points) - exit_n + j
            t = (j + 1) / exit_n
            points[idx] = (points[idx][0], anchor_y + (y_end - anchor_y) * _blend(t))
    return {"points": points, "feasible": not infeasible, "infeasible_vehicles": infeasible}