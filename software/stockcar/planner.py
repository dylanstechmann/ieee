"""Hybrid-A* search along one straightaway for a differential-drive footprint.

States are continuous (x, y, heading); duplicates are pruned on a 0.5 in / 15 degree grid.
Primitives: 1 in forward or reverse, 15 degree arcs of radius 8 or 16 in, and 15 degree spins in
place. Every primitive is swept in small steps and checked against the corridor band and the
obstacle polygons, so a square footprint pays for its 14.1 in diagonal when it rotates.
Perfect knowledge of the geometry; a feasibility probe, not a controller.
"""
import heapq
import itertools
import math

from stockcar.geometry import circle_polygon_distance, extent, rectangle, separation

TH = math.pi / 12  # 15 degrees


class Footprint:
    def __init__(self, kind, size=10.0):
        if kind not in ("square", "round"):
            raise ValueError(kind)
        self.kind = kind
        self.size = size

    def clearance(self, x, y, th, band, obstacles):
        """Smallest clearance to the band edges and obstacles (negative = contact)."""
        y_lo, y_hi = band
        if self.kind == "round":
            r = self.size / 2
            best = min(y - r - y_lo, y_hi - (y + r))
            for poly in obstacles:
                best = min(best, circle_polygon_distance(x, y, r, poly))
            return best
        poly = rectangle(x, y, th, self.size, self.size)
        py0, py1 = extent(poly, 1)
        best = min(py0 - y_lo, y_hi - py1)
        for obs in obstacles:
            best = min(best, separation(poly, obs))
        return best


def _primitives():
    prims = [("straight", 1.0, 0.0), ("straight", -1.0, 0.0), ("spin", 0.0, TH), ("spin", 0.0, -TH)]
    for radius in (8.0, 16.0):
        for sign in (1, -1):
            prims.append(("arc", radius, sign * TH))
    return prims


PRIMITIVES = _primitives()


def _poses(x, y, th, prim, step_len=0.25, step_ang=math.radians(5)):
    kind, a, b = prim
    if kind == "straight":
        n = max(1, int(math.ceil(abs(a) / step_len)))
        return [(x + a * k / n * math.cos(th), y + a * k / n * math.sin(th), th) for k in range(1, n + 1)], abs(a)
    if kind == "spin":
        n = max(1, int(math.ceil(abs(b) / step_ang)))
        return [(x, y, th + b * k / n) for k in range(1, n + 1)], 0.0
    radius, dth = a, b
    length = radius * abs(dth)
    n = max(int(math.ceil(length / step_len)), int(math.ceil(abs(dth) / step_ang)), 1)
    out = []
    for k in range(1, n + 1):
        t = dth * k / n
        # arc about a center offset to the left (dth > 0) or right of the heading
        sx = math.sin(th + t) - math.sin(th)
        sy = -math.cos(th + t) + math.cos(th)
        out.append((x + radius * sx * (1 if dth > 0 else -1), y + radius * sy * (1 if dth > 0 else -1), th + t))
    return out, length


def plan(footprint, band, obstacles, x_start, x_goal, margin=0.25, xy_res=0.5, start_step=0.5,
         spin_cost_per_rad=6.0, max_expansions=80000):
    """Search from heading-east starts at x_start (any lateral position) to x >= x_goal heading east."""
    y_lo, y_hi = band
    half = footprint.size / 2
    starts = []
    y = y_lo + half + margin
    while y <= y_hi - half - margin + 1e-9:
        if footprint.clearance(x_start, y, 0.0, band, obstacles) >= margin:
            starts.append((x_start, y, 0.0))
        y += start_step
    heap = []
    best = {}
    order = itertools.count()  # tiebreaker so equal-cost entries never compare states or parents
    for s in starts:
        key = (round(s[0] / xy_res), round(s[1] / xy_res), 0)
        best[key] = 0.0
        heapq.heappush(heap, (max(0.0, x_goal - s[0]), 0.0, next(order), s, None))
    parents = {}
    expansions = 0
    while heap and expansions < max_expansions:
        f, g, _, state, parent = heapq.heappop(heap)
        x, y, th = state
        key = (round(x / xy_res), round(y / xy_res), round(th / TH) % 24)
        if g > best.get(key, math.inf) + 1e-9:
            continue
        parents[key] = (parent, state)
        if x >= x_goal and abs(math.remainder(th, 2 * math.pi)) <= TH / 2 + 1e-9:
            path = []
            k = key
            while k is not None:
                parent_key, s = parents[k]
                path.append(s)
                k = parent_key
            path.reverse()
            clearance = min(footprint.clearance(px, py, pth, band, obstacles) for px, py, pth in path)
            return {"found": True, "cost": round(g, 3), "expansions": expansions, "waypoints": len(path),
                    "min_clearance_in": round(clearance, 3)}
        expansions += 1
        for prim in PRIMITIVES:
            poses, length = _poses(x, y, th, prim)
            ok = True
            for px, py, pth in poses:
                if px < x_start - 2.0 or px > x_goal + 4.0 or footprint.clearance(px, py, pth, band, obstacles) < margin:
                    ok = False
                    break
            if not ok:
                continue
            nx, ny, nth = poses[-1]
            nth = math.remainder(nth, 2 * math.pi)
            cost = g + length + spin_cost_per_rad * abs(prim[2] if prim[0] == "spin" else 0.0)
            nkey = (round(nx / xy_res), round(ny / xy_res), round(nth / TH) % 24)
            if cost + 1e-9 < best.get(nkey, math.inf):
                best[nkey] = cost
                heapq.heappush(heap, (cost + max(0.0, x_goal - nx), cost, next(order), (nx, ny, nth), key))
    return {"found": False, "cost": None, "expansions": expansions, "exhausted": not heap,
            "starts": len(starts), "min_clearance_in": None}
