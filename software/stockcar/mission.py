"""Mission simulator v10: a closed loop on the organizer CAD field.

Agent-written for the owner's hobby/learning project. Kinematic robot, perfect knowledge, guide-size
obstacles and a v10 supervisor. Units are inches and seconds in the field-v10 frame.

Route model (an assumption; the lap and pit rules are open questions QA05 and QA06):
- counterclockwise loop: low straight eastbound and high straight westbound, joined by 7.5 in arcs
  centered on the divider ends;
- the lap gate is the west arc apex (36.5, 24), heading south; entering the course and leaving the
  pit both merge there through the high opening;
- the pit and parking are reached through the low opening.
Lane choice on each straight follows stockcar.passage: a clean common line if one exists, otherwise
an S-curve lane change, otherwise the line with the fewest blocked vehicles (contact policy:
continue gently rather than stop). Every wall or vehicle contact is recorded against the lap in
progress. Points are credited only for events that actually happened.
"""
import math
import random

from stockcar import lapmodel
from stockcar.field import Field
from stockcar.geometry import axis_rect, rectangle, separation, wrap
from stockcar.obstacles import GUIDE_PLUSH, center_range, footprint
from stockcar.passage import common_line, free_center_intervals
from stockcar.supervisor import Supervisor

R_TURN = 7.5
GATE = (44.0 - R_TURN, 24.0)
LOW_LANE, HIGH_LANE = 24.0 - R_TURN, 24.0 + R_TURN
STEP = 0.5


class Route:
    def __init__(self, points):
        self.pts = points
        self.s = [0.0]
        for (x0, y0), (x1, y1) in zip(points, points[1:]):
            self.s.append(self.s[-1] + math.hypot(x1 - x0, y1 - y0))
        self.length = self.s[-1]

    def nearest(self, x, y, start, window=60):
        best, best_d = start, math.inf
        for i in range(start, min(len(self.pts), start + window)):
            d = (self.pts[i][0] - x) ** 2 + (self.pts[i][1] - y) ** 2
            if d < best_d:
                best, best_d = i, d
        return best

    def at(self, s):
        if s >= self.length:
            return self.pts[-1]
        lo, hi = 0, len(self.s) - 1
        while hi - lo > 1:
            mid = (lo + hi) // 2
            if self.s[mid] <= s:
                lo = mid
            else:
                hi = mid
        t = (s - self.s[lo]) / max(1e-9, self.s[hi] - self.s[lo])
        return (self.pts[lo][0] + t * (self.pts[hi][0] - self.pts[lo][0]), self.pts[lo][1] + t * (self.pts[hi][1] - self.pts[lo][1]))


def line(p0, p1):
    n = max(1, int(math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / STEP))
    return [(p0[0] + (p1[0] - p0[0]) * k / n, p0[1] + (p1[1] - p0[1]) * k / n) for k in range(1, n + 1)]


def arc(center, a0, a1):
    n = max(2, int(abs(a1 - a0) * R_TURN / STEP))
    return [(center[0] + R_TURN * math.cos(a0 + (a1 - a0) * k / n), center[1] + R_TURN * math.sin(a0 + (a1 - a0) * k / n)) for k in range(1, n + 1)]


def straight(x0, x1, y_start, lanes, y_end):
    """Straight from x0 to x1 that blends from y_start into the lane plan and back out to y_end.

    lanes: list of (x_from, x_to, y) in travel order; blends are cosine S-curves.
    """
    sign = 1 if x1 > x0 else -1
    pts = []
    x = x0
    while (x1 - x) * sign > 1e-9:
        x = x + sign * STEP if (x1 - x) * sign > STEP else x1
        y = lane_y(x, x0, x1, y_start, lanes, y_end)
        pts.append((x, y))
    return pts


def _blend(t):
    t = min(1.0, max(0.0, t))
    return (1 - math.cos(math.pi * t)) / 2


def lane_y(x, x0, x1, y_start, lanes, y_end, blend=12.0):
    sign = 1 if x1 > x0 else -1
    d = (x - x0) * sign
    total = (x1 - x0) * sign
    targets = [y_start]
    for xa, xb, y in lanes:
        targets.append(y)
    targets.append(y_end)
    # piecewise: entry blend over the first `blend` inches, exit blend over the last `blend` inches,
    # and lane-to-lane blends centered at the boundary between consecutive lane spans
    y = lanes[0][2]
    if d < blend:
        return y_start + (lanes[0][2] - y_start) * _blend(d / blend)
    if total - d < blend:
        return lanes[-1][2] + (y_end - lanes[-1][2]) * _blend(1 - (total - d) / blend)
    for (xa, xb, ya), (xc, xd, yb) in zip(lanes, lanes[1:]):
        boundary = (xb + xc) / 2
        width = max(2.0, abs(xc - xb))
        u = ((x - boundary) * sign + width / 2) / width
        if u <= 0:
            return y if ya == lanes[0][2] else ya
        if u < 1:
            return ya + (yb - ya) * _blend(u)
        y = yb
    return y


class Layout:
    def __init__(self, vehicles, assigned_box, exchange_success):
        self.vehicles = vehicles
        self.assigned_box = assigned_box
        self.exchange_success = exchange_success
        self.polys = [footprint(GUIDE_PLUSH, v["cx"], v["cy"], v["yaw"]) for v in vehicles]


def random_layout(rng, field, reading="offsets", yaw_mode="aligned", p_exchange=0.7, obstacles=True):
    vehicles = []
    if obstacles:
        quads = field.quadrants(reading)
        names = list(quads)
        empty = rng.choice(names)
        for name in names:
            if name == empty:
                continue
            side = "low" if name.startswith("low") else "high"
            lane = rng.choice(("outer", "inner"))
            for _ in range(20):
                yaw = rng.choice((0.0, math.pi / 2)) if yaw_mode == "aligned" else rng.uniform(0, math.pi)
                allowed = center_range(quads[name], side, lane, GUIDE_PLUSH, yaw)
                if allowed:
                    break
            vehicles.append({"quadrant": name, "side": side, "cx": rng.uniform(*allowed[0]), "cy": rng.uniform(*allowed[1]), "yaw": yaw})
    return Layout(vehicles, rng.choice((1, 2, 3)), rng.random() < p_exchange)


def lane_plan(field, layout, side, default_y):
    """Lanes for one straight in travel order (low side eastbound, high side westbound)."""
    band = field.corridor(side)
    polys = [p for p, v in zip(layout.polys, layout.vehicles) if v["side"] == side]
    if side == "high":
        order = sorted(range(len(polys)), key=lambda i: -min(q[0] for q in polys[i]))
    else:
        order = sorted(range(len(polys)), key=lambda i: min(q[0] for q in polys[i]))
    polys = [polys[i] for i in order]
    x0, x1 = (44.0, 80.0) if side == "low" else (80.0, 44.0)
    if not polys:
        return [(x0, x1, default_y)], "clear", 0
    intervals = [free_center_intervals(band, p) for p in polys]

    def pick(ivs):
        best = None
        for lo, hi in ivs:
            y = min(max(default_y, lo), hi)
            if best is None or abs(y - default_y) < abs(best - default_y):
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


class MissionSim:
    def __init__(self, preset="aggressive", envelope="nominal", field=None, footprint_kind="square"):
        self.field = field or Field()
        self.env = lapmodel.ENVELOPES[envelope]
        self.preset = preset
        self.footprint_kind = footprint_kind
        self.barriers = self.field.barriers()
        self.dt = 0.05
        self.v_max = self.env["cruise"] * 1.25
        self.w_max = self.env["spin_rad_s"]
        self.a_max = 24.0
        self.alpha_max = 8.0

    # -- routes --------------------------------------------------------------
    def build_routes(self, layout):
        low_lanes, self.low_mode, low_blocked = lane_plan(self.field, layout, "low", LOW_LANE)
        high_lanes, self.high_mode, high_blocked = lane_plan(self.field, layout, "high", HIGH_LANE)
        self.planned_contacts = low_blocked + high_blocked
        loop = arc((44.0, 24.0), math.pi, 1.5 * math.pi)
        loop += straight(44.0, 80.0, LOW_LANE, low_lanes, LOW_LANE)
        loop += arc((80.0, 24.0), -0.5 * math.pi, 0.5 * math.pi)
        loop += straight(80.0, 44.0, HIGH_LANE, high_lanes, HIGH_LANE)
        loop += arc((44.0, 24.0), 0.5 * math.pi, math.pi)
        start = ((self.field.start_box[0] + self.field.start_box[2]) / 2, (self.field.start_box[1] + self.field.start_box[3]) / 2)
        box = self.field.pit_boxes[layout.assigned_box]
        # target 7.6 in from the end wall face so a square robot can spin in the box (7.07 in sweep radius)
        bc = (box[0] + 7.6, (box[1] + box[3]) / 2)
        # Pit transit lanes keep turning room: y = 38.5 leaves 1.4 in under the north wall for a square
        # turned 45 degrees, and every box is entered along a straight westward run so the robot arrives
        # aligned and can spin in place inside the box.
        high_exit = [(31.0, 39.25), (34.0, 36.5), (35.8, 33.0), (36.5, 29.0), GATE]
        enter = [start] + _poly([start, (24.0, 39.25)] + high_exit)
        lane_x = 16.6
        approach = [(lane_x, 9.0)] + ([] if layout.assigned_box == 1 else [(lane_x, bc[1])]) + [bc]
        to_box = _poly([GATE, (36.5, 16.0), (34.0, 11.0), (28.0, 9.0)] + approach)
        from_box = _poly([bc, (lane_x, bc[1]), (lane_x, 39.25), (24.0, 39.25)] + high_exit)
        self.routes = {"ENTER": Route(enter), "LAP": Route([GATE] + loop), "TO_PIT": Route([GATE] + to_box),
                       "EXIT_PIT": Route(from_box), "PARK": Route([GATE] + to_box)}
        self.lap_length_in = self.routes["LAP"].length

    # -- simulation ----------------------------------------------------------
    def reset(self, layout):
        self.layout = layout
        self.build_routes(layout)
        self.sup = Supervisor(self.preset, lap_length_m=self.lap_length_in * 0.0254, stop_at_s=lapmodel.AUTO_STOP_S)
        r = self.routes["ENTER"]
        x, y = r.pts[0]
        self.state = {"x": x, "y": y, "th": 0.0, "v": 0.0, "w": 0.0}
        self.t = 0.0
        self.odometry_in = 0.0
        self.route_name = None
        self.route_index = 0
        self.route_done = False
        self.contact_cooldown = 0.0
        self.wall_contacts = [0, 0, 0]
        self.vehicle_contacts = [0, 0, 0]
        self.events = {}
        self.exchange_started = None
        self.parked = False
        self.out = self.sup.update(0.0, {})
        return self.observe()

    def _set_route(self, name):
        if name != self.route_name:
            self.route_name = name
            self.route_index = 0
            self.route_done = False

    def _footprint(self, x, y, th):
        if self.footprint_kind == "round":
            return [(x + 5 * math.cos(2 * math.pi * k / 24) / math.cos(math.pi / 24), y + 5 * math.sin(2 * math.pi * k / 24) / math.cos(math.pi / 24)) for k in range(24)]
        return rectangle(x, y, th, 10.0, 10.0)

    def target(self, lookahead=4.0):
        r = self.routes[self.route_name]
        s = r.s[self.route_index] + lookahead
        return r.at(s), r.length - r.s[self.route_index]

    def classical_action(self):
        if self.out["motion"] in ("hold", "stop", "exchange") or self.route_name is None or self.route_done:
            return (0.0, 0.0)
        (tx, ty), remaining = self.target()
        s = self.state
        alpha = wrap(math.atan2(ty - s["y"], tx - s["x"]) - s["th"])
        scale = self.out.get("speed_scale", 1.0)
        v = self.env["cruise"] * scale
        v = min(v, math.sqrt(2 * self.a_max * 0.5 * max(0.0, remaining)) + 0.5)
        # Slow for sharp route corners (more than 0.45 rad between consecutive 2.5 in chords ahead; the
        # 7.5 in U-turn arcs turn about 0.33 rad per chord and keep cruise speed) and for large steering errors.
        r = self.routes[self.route_name]
        s0 = r.s[self.route_index]
        a0, a1, a2 = r.at(s0), r.at(s0 + 2.5), r.at(s0 + 5.0)
        turn = abs(wrap(math.atan2(a2[1] - a1[1], a2[0] - a1[0]) - math.atan2(a1[1] - a0[1], a1[0] - a0[0])))
        if turn > 0.45 or abs(alpha) > math.radians(30):
            v = min(v, 0.4 * self.env["cruise"])
        if self.contact_cooldown > 0:
            v *= 0.5
        if abs(alpha) > math.radians(60):
            return (0.0, math.copysign(1.0, alpha))
        w = 2 * v * math.sin(alpha) / 4.0
        return (v / self.v_max, max(-1.0, min(1.0, w / self.w_max)))

    def step(self, action=None):
        if self.out["state"] in ("DONE", "STOPPED"):
            return self.observe(), 0.0, True, self.info()
        a = self.classical_action() if action is None else action
        s = self.state
        tv = max(-1.0, min(1.0, a[0])) * self.v_max
        tw = max(-1.0, min(1.0, a[1])) * self.w_max
        s["v"] += max(-self.a_max * self.dt, min(self.a_max * self.dt, tv - s["v"]))
        s["w"] += max(-self.alpha_max * self.dt, min(self.alpha_max * self.dt, tw - s["w"]))
        th_mid = s["th"] + s["w"] * self.dt / 2
        dx, dy = s["v"] * math.cos(th_mid) * self.dt, s["v"] * math.sin(th_mid) * self.dt
        s["x"] += dx
        s["y"] += dy
        s["th"] = wrap(s["th"] + s["w"] * self.dt)
        self.odometry_in += math.hypot(dx, dy)
        self.t += self.dt
        self.contact_cooldown = max(0.0, self.contact_cooldown - self.dt)
        new_contacts = self._contacts()
        progress = self._advance_route()
        reward = progress / 10.0 - 0.002 - 2.0 * new_contacts + self._mission() / 100.0
        done = self.out["state"] in ("DONE", "STOPPED")
        return self.observe(), reward, done, self.info()

    def _contacts(self):
        lap = min(self.sup.laps, 2)
        poly = self._footprint(self.state["x"], self.state["y"], self.state["th"])
        new = 0
        if any(separation(poly, b) < 0 for b in self.barriers):
            if self.wall_contacts[lap] == 0:
                new += 1
            self.wall_contacts[lap] += 1
        if any(separation(poly, p) < 0 for p in self.layout.polys):
            if self.vehicle_contacts[lap] == 0:
                new += 1
            self.vehicle_contacts[lap] += 1
            self.contact_cooldown = lapmodel.CONTACT_PENALTY_S
        return new

    def _advance_route(self):
        if self.route_name is None or self.route_done:
            return 0.0
        r = self.routes[self.route_name]
        old = r.s[self.route_index]
        self.route_index = r.nearest(self.state["x"], self.state["y"], self.route_index)
        end = r.pts[-1]
        if self.route_index >= len(r.pts) - 2 and math.hypot(self.state["x"] - end[0], self.state["y"] - end[1]) < 1.0:
            self.route_done = True
        return r.s[self.route_index] - old

    def _mission(self):
        obs = {"odometry_m": self.odometry_in * 0.0254, "tag_id": self.layout.assigned_box}
        if self.out["state"] == "WAIT_START":
            obs["flag_up"] = self.t > 0.6
            if self.t <= 0.6:
                obs["flag_up"] = False
        state = self.out["state"]
        points = 0.0
        if state in ("ENTER", "LAP") and self.route_done:
            obs["checker_crossing"] = True
        if state == "TO_PIT" and self.route_done:
            obs["at_pit_box"] = True
        if state == "EXCHANGE":
            if self.exchange_started is None:
                self.exchange_started = self.t
            if self.t - self.exchange_started >= lapmodel.EXCHANGE_S:
                if self.layout.exchange_success:
                    obs["exchange_done"] = True
                else:
                    obs["exchange_failed"] = True
                self.exchange_started = None
        if state == "EXIT_PIT" and self.route_done:
            obs["checker_crossing"] = True
        if state == "PARK" and self.route_done:
            box = self.field.pit_boxes[self.layout.assigned_box]
            self.parked = overlap_fraction(self._footprint(self.state["x"], self.state["y"], self.state["th"]), box) > 0.75
            obs["in_assigned_box"] = self.parked
        before = dict(self.out)
        self.out = self.sup.update(self.t, obs)
        after = self.out
        if before["state"] == "WAIT_START" and after["state"] == "ENTER":
            self.events["green_start"] = self.t
            points += 10
        if before["state"] == "ENTER" and after["state"] == "LAP":
            self.events["entered"] = self.t
            points += 25
        if after["laps"] > before["laps"]:
            self.events[f"lap_{after['laps']}"] = self.t
        if before.get("exchange_result") is None and after.get("exchange_result") == "done":
            points += 65
        if after["state"] == "DONE" and before["state"] != "DONE":
            self.events["parked"] = self.t
        if after["state"] != state or self.route_name is None:
            self._route_for_state(after["state"])
        elif after["state"] == "LAP" and after["laps"] > before["laps"]:
            self.route_index = 0  # next lap: run the loop again from the gate
            self.route_done = False
        return points

    def _route_for_state(self, state):
        mapping = {"ENTER": "ENTER", "LAP": "LAP", "TO_PIT": "TO_PIT", "EXIT_PIT": "EXIT_PIT", "PARK": "PARK"}
        if state in mapping:
            self._set_route(mapping[state])
            if state == "LAP":
                self.route_index = 0
                self.route_done = False

    def observe(self):
        s = self.state
        if self.route_name:
            (tx, ty), remaining = self.target()
        else:
            (tx, ty), remaining = (s["x"], s["y"]), 0.0
        c, sn = math.cos(-s["th"]), math.sin(-s["th"])
        rx, ry = tx - s["x"], ty - s["y"]
        lx, ly = c * rx - sn * ry, sn * rx + c * ry
        nearest = min([math.hypot(v["cx"] - s["x"], v["cy"] - s["y"]) for v in self.layout.vehicles] or [96.0])
        phases = ("WAIT_START", "SWITCH_HOLD", "ENTER", "LAP", "TO_PIT", "EXCHANGE", "EXIT_PIT", "PARK", "DONE", "STOPPED")
        return [s["x"] / 96, s["y"] / 48, math.sin(s["th"]), math.cos(s["th"]), s["v"] / self.v_max, s["w"] / self.w_max,
                lx / 10, ly / 10, math.atan2(ly, lx) / math.pi, min(1.0, remaining / 200),
                phases.index(self.out["state"]) / 9, self.out["laps"] / 3, self.layout.assigned_box / 3,
                1.0 if self.out["flag_servo"] == "up" else 0.0, self.t / 180, min(1.0, nearest / 48),
                self.out.get("speed_scale", 1.0), 1.0 if self.contact_cooldown > 0 else 0.0]

    def info(self):
        laps = self.out["laps"]
        finish = self.events.get("lap_3")
        score = 0
        score += 10 if "green_start" in self.events else 0
        score += 25 if "entered" in self.events else 0
        if finish is not None and finish <= lapmodel.AUTO_STOP_S:
            score += 100 + (30 if finish < lapmodel.BONUS_S else 0)
        score += 15 if self.parked else 0
        score += 65 if self.out.get("exchange_result") == "done" else 0
        score += sum(15 for i in range(laps) if self.wall_contacts[i] == 0)
        score += sum(25 for i in range(laps) if self.vehicle_contacts[i] == 0)
        score += 25 if self.out["flag_servo"] == "up" and laps == 3 else 0
        return {"state": self.out["state"], "time_s": round(self.t, 2), "laps": laps, "assigned_box": self.layout.assigned_box,
                "lane_modes": [self.low_mode, self.high_mode], "planned_contact_vehicles": self.planned_contacts,
                "wall_contact_steps": list(self.wall_contacts), "vehicle_contact_steps": list(self.vehicle_contacts),
                "exchange_result": self.out.get("exchange_result"), "parked": self.parked,
                "finish_s": None if finish is None else round(finish, 2), "events_s": {k: round(v, 2) for k, v in self.events.items()},
                "score_like": score, "stop_reason": self.out.get("stop_reason"), "lap_length_in": round(self.lap_length_in, 2)}


def _poly(waypoints):
    pts = []
    for a, b in zip(waypoints, waypoints[1:]):
        pts += line(a, b)
    return pts


def overlap_fraction(poly, box):
    """Area fraction of polygon `poly` inside axis-aligned box (x0, y0, x1, y1), by polygon clipping."""
    def clip(points, inside, intersect):
        out = []
        for i, cur in enumerate(points):
            prev = points[i - 1]
            if inside(cur):
                if not inside(prev):
                    out.append(intersect(prev, cur))
                out.append(cur)
            elif inside(prev):
                out.append(intersect(prev, cur))
        return out

    def area(points):
        return abs(sum(points[i - 1][0] * p[1] - p[0] * points[i - 1][1] for i, p in enumerate(points))) / 2

    x0, y0, x1, y1 = box
    pts = list(poly)
    for axis, bound, keep_below in ((0, x0, False), (0, x1, True), (1, y0, False), (1, y1, True)):
        if not pts:
            break

        def inside(p, axis=axis, bound=bound, keep_below=keep_below):
            return p[axis] <= bound if keep_below else p[axis] >= bound

        def intersect(p, q, axis=axis, bound=bound):
            t = (bound - p[axis]) / (q[axis] - p[axis])
            return (p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1]))

        pts = clip(pts, inside, intersect)
    total = area(list(poly))
    return 0.0 if not pts or total == 0 else area(pts) / total


def run(seed, preset="aggressive", envelope="nominal", obstacles=True, reading="offsets", yaw_mode="aligned", max_steps=4000):
    rng = random.Random(seed)
    sim = MissionSim(preset, envelope)
    layout = random_layout(rng, sim.field, reading, yaw_mode, obstacles=obstacles)
    sim.reset(layout)
    for _ in range(max_steps):
        _, _, done, info = sim.step()
        if done:
            return info
    return sim.info()


class MissionEnv:
    """Gymnasium-style wrapper. Training seeds 0-99 and evaluation seeds 100-119 are kept apart."""

    TRAIN = range(0, 100)
    EVAL = range(100, 120)

    def __init__(self, evaluation=False, preset="aggressive", envelope="nominal", obstacles=True):
        self.evaluation = evaluation
        self.sim = MissionSim(preset, envelope)
        self.obstacles = obstacles

    def reset(self, seed):
        allowed = self.EVAL if self.evaluation else self.TRAIN
        if seed not in allowed:
            raise ValueError(f"seed {seed} is outside the {'evaluation' if self.evaluation else 'training'} range")
        layout = random_layout(random.Random(seed), self.sim.field, obstacles=self.obstacles)
        return self.sim.reset(layout), {"seed": seed}

    def step(self, action):
        obs, reward, done, info = self.sim.step(action)
        return obs, reward, done, False, info
