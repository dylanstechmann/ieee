"""Exact straight-line passage tests for a robot driving along a straightaway (x direction)."""


def free_center_intervals(band, obstacle, robot_width=10.0, margin=0.25):
    """y intervals where a straight-driving robot center clears one obstacle polygon, with margins."""
    oy0 = min(p[1] for p in obstacle)
    oy1 = max(p[1] for p in obstacle)
    half = robot_width / 2 + margin
    lo, hi = band[0] + half, band[1] - half
    out = []
    if oy0 - half >= lo:
        out.append((lo, min(hi, oy0 - half)))
    if oy1 + half <= hi:
        out.append((max(lo, oy1 + half), hi))
    return [iv for iv in out if iv[0] <= iv[1]]


def common_line(interval_sets):
    """True if one y value lies in an allowed interval of every obstacle (a straight line clears all)."""
    candidates = [(lo, hi) for lo, hi in interval_sets[0]] if interval_sets else []
    for intervals in interval_sets[1:]:
        merged = []
        for a0, a1 in candidates:
            for b0, b1 in intervals:
                lo, hi = max(a0, b0), min(a1, b1)
                if lo <= hi:
                    merged.append((lo, hi))
        candidates = merged
    return bool(candidates)
