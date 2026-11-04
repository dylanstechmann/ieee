"""Speed along a fixed path, as fast as the drivetrain limits allow.

A backward and a forward pass over the sampled path, the usual method once a path's shape is fixed.
Limits come from the planning envelopes of derived/envelope-v10: the faster wheel's speed, lateral
acceleration, yaw rate, yaw acceleration, and one grip budget shared by cornering and speed changes.
Units are inches and seconds. Synthetic until the E02 and E03 trials replace the limits.
"""
import math

STEP_IN = 0.5
SMOOTHING_IN = 2.0      # curvature is read across this distance each way: the scale a robot can follow
LEAST_GRIP_SHARE = 0.2  # speed changes keep this share of their limit while cornering, so a pass cannot stall


def limits(planning, half_track_in, top_in_s=None):
    """Profile limits from one planning envelope. top_in_s caps the center speed below the wheel limit."""
    wheel = planning["cruise_in_s"]
    return {"top": min(wheel, top_in_s or wheel), "wheel": wheel, "half_track": half_track_in, "lateral": planning["lateral_in_s2"],
            "yaw_rate": planning["spin_rad_s"], "yaw_accel": planning["yaw_accel_rad_s2"],
            "accel": planning["accel_in_s2"], "brake": planning["brake_in_s2"]}


def resample(points, step=STEP_IN):
    """Evenly spaced points along a polyline, keeping both ends."""
    lengths = [math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(points, points[1:])]
    total = sum(lengths)
    n = max(1, round(total / step))
    out, seg, start = [], 0, 0.0
    for k in range(n + 1):
        s = total * k / n
        while seg < len(lengths) - 1 and start + lengths[seg] < s:
            start += lengths[seg]
            seg += 1
        t = (s - start) / lengths[seg] if lengths[seg] else 0.0
        a, b = points[seg], points[seg + 1]
        out.append((a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])))
    return out, total / n


def smooth(points, span_in, passes=2):
    """Rounds a route's corners with a moving average. The window shrinks at the ends, so they stay put."""
    pts, step = resample(points)
    reach = max(1, round(span_in / step))
    for _ in range(passes):
        out = []
        for i in range(len(pts)):
            w = min(reach, i, len(pts) - 1 - i)
            near = pts[i - w:i + w + 1]
            out.append((sum(p[0] for p in near) / len(near), sum(p[1] for p in near) / len(near)))
        pts = out
    return pts


def headings(points):
    """Continuous heading at each point; each step keeps within half a turn of the last."""
    out = []
    for a, b in zip(points, points[1:]):
        h = math.atan2(b[1] - a[1], b[0] - a[0])
        if out:
            h = out[-1] + math.remainder(h - out[-1], 2 * math.pi)
        out.append(h)
    return out + out[-1:]


def curvatures(heads, step, smoothing=SMOOTHING_IN):
    """Signed curvature at each point, from the heading change across the smoothing distance."""
    span = max(1, round(smoothing / step))
    last = len(heads) - 1
    out = []
    for i in range(len(heads)):
        a, b = max(0, i - span), min(last, i + span)
        out.append((heads[b] - heads[a]) / ((b - a) * step) if b > a else 0.0)
    return out


def speed_caps(kappa, lim, step):
    caps = []
    last = len(kappa) - 1
    for i, k in enumerate(kappa):
        bend = abs(k)
        cap = min(lim["top"], lim["wheel"] / (1 + bend * lim["half_track"]))
        if bend > 1e-9:
            cap = min(cap, math.sqrt(lim["lateral"] / bend), lim["yaw_rate"] / bend)
        change = abs(kappa[min(i + 1, last)] - kappa[max(i - 1, 0)]) / (2 * step)
        if change > 1e-9:
            cap = min(cap, math.sqrt(lim["yaw_accel"] / change))
        caps.append(cap)
    return caps


def _share(v, k, lim):
    used = v * v * abs(k) / lim["lateral"]
    return max(LEAST_GRIP_SHARE, math.sqrt(max(0.0, 1 - used * used)))


def speeds(kappa, lim, step, v_start=0.0, v_end=0.0):
    """Fastest speed at each point within the caps and the shared grip budget."""
    v = speed_caps(kappa, lim, step)
    v[0], v[-1] = min(v[0], v_start), min(v[-1], v_end)
    for i in range(len(v) - 2, -1, -1):
        v[i] = min(v[i], math.sqrt(v[i + 1] ** 2 + 2 * lim["brake"] * _share(v[i + 1], kappa[i + 1], lim) * step))
    for i in range(1, len(v)):
        v[i] = min(v[i], math.sqrt(v[i - 1] ** 2 + 2 * lim["accel"] * _share(v[i - 1], kappa[i - 1], lim) * step))
    return v


def build(points, lim, v_start=0.0, v_end=0.0):
    """The table a tracker follows: x, y, heading, curvature, speed at even steps, and the travel time."""
    pts, step = resample(points)
    heads = headings(pts)
    kappa = curvatures(heads, step)
    v = speeds(kappa, lim, step, v_start, v_end)
    return {"step_in": step, "x": [p[0] for p in pts], "y": [p[1] for p in pts], "heading": heads, "curvature": kappa, "speed": v,
            "time_s": sum(2 * step / max(1e-6, a + b) for a, b in zip(v, v[1:]))}
