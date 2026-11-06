"""Avoiding-mission simulator: vehicles are sensed (or taken as an oracle) and routed around.

`AvoidingMissionSim` extends `SensedMissionSim` with a `lane_source`:

- ``v10_blend`` — the status quo: `plan_straight` from the given vehicle positions with the pinned
  `mission.straight` 12 in entry/exit blends. Reproduces `SensedMissionSim` byte-for-byte.
- ``oracle`` — the given (true) vehicle positions, but the straightaways use `lane_profile`, whose
  blends are timed to each vehicle (reaching its lane before the padded near edge) instead of the
  fixed 12 in blend. Tests the blend hypothesis under perfect knowledge.
- ``sensed`` — plan only from what the range ring (`sensors_vehicle`) has seen. Lap 1 is a discovery
  lap on the plain lanes; once the map has vehicles, later laps replan around them.

Pinned v10 source files are untouched: everything here is new files, subclass overrides and pure
helpers. Agent-written for the owner's hobby/learning project; synthetic only.
"""
import math
import random

from stockcar.lane_profile import lateral_profile
from stockcar.mission import GATE, HIGH_LANE, LOW_LANE, Route, _poly, arc, random_layout, straight
from stockcar.mission_sensed import SensedMissionSim
from stockcar.obstacles import GUIDE_PLUSH, footprint as _obstacle_footprint
from stockcar.passage import free_center_intervals
from stockcar.sensors_vehicle import VehicleMap, scan

CORRIDOR_MARGIN_IN = 0.25      # same margin `passage`/`plan_straight` use


class AvoidingMissionSim(SensedMissionSim):
    """`SensedMissionSim` that plans straightaway lanes from truth (``oracle``) or senses (``sensed``)."""

    def __init__(self, preset="aggressive", envelope="nominal", field=None, footprint_kind="square",
                 sensing=False, footprint_in=None, lane_source="v10_blend", blend_in=8.0, min_blend_in=2.0):
        if lane_source not in ("v10_blend", "oracle", "sensed"):
            raise ValueError(f"unknown lane_source {lane_source}")
        # replan_lanes=True keeps plan_straight wired so v10_blend matches SensedMissionSim exactly.
        super().__init__(preset, envelope, field, footprint_kind, sensing,
                         collision_stops=False, replan_lanes=True, footprint_in=footprint_in)
        self.lane_source = lane_source
        self.blend_in = blend_in
        self.min_blend_in = min_blend_in
        self.vmap = VehicleMap()
        self.scan_rng = random.Random(0)
        self.infeasible_vehicles = 0

    # -- lane source plumbing -------------------------------------------------
    def _width(self):
        return self.footprint_in if self.footprint_in is not None else 10.0

    def _pick_lane_y(self, band, poly, default_y):
        ivs = free_center_intervals(band, poly, robot_width=self._width(), margin=CORRIDOR_MARGIN_IN)
        best = None
        for lo, hi in ivs:
            y = min(max(default_y, lo), hi)
            if best is None or abs(y - default_y) < abs(best - default_y):
                best = y
        return best if best is not None else default_y

    def _spans(self, side, polys):
        """Padded (x_near, x_far, y) spans in travel order for `lane_profile`."""
        band = self.field.corridor(side)
        default = LOW_LANE if side == "low" else HIGH_LANE
        half = self._width() / 2 + CORRIDOR_MARGIN_IN
        if side == "low":
            order = sorted(range(len(polys)), key=lambda i: min(q[0] for q in polys[i]))
        else:
            order = sorted(range(len(polys)), key=lambda i: -min(q[0] for q in polys[i]))
        spans = []
        for i in order:
            p = polys[i]
            xs = [q[0] for q in p]
            if side == "low":
                xnear, xfar = min(xs) - half, max(xs) + half
            else:
                xnear, xfar = max(xs) + half, min(xs) - half  # westbound: near edge is the larger x
            spans.append((xnear, xfar, self._pick_lane_y(band, p, default)))
        return spans

    def _profile_or_plain(self, x0, x1, y_start, spans, y_end):
        if not spans:
            return straight(x0, x1, y_start, [(x0, x1, y_start)], y_end)
        out = lateral_profile(x0, x1, y_start, y_end, spans, blend_in=self.blend_in,
                              min_blend_in=self.min_blend_in)
        self.infeasible_vehicles += len(out["infeasible_vehicles"])
        return out["points"]

    def _loop(self, low_spans, high_spans):
        return (arc((44.0, 24.0), math.pi, 1.5 * math.pi)
                + self._profile_or_plain(44.0, 80.0, LOW_LANE, low_spans, LOW_LANE)
                + arc((80.0, 24.0), -0.5 * math.pi, 0.5 * math.pi)
                + self._profile_or_plain(80.0, 44.0, HIGH_LANE, high_spans, HIGH_LANE)
                + arc((44.0, 24.0), 0.5 * math.pi, math.pi))

    def _set_lap_route(self, low_spans, high_spans):
        self.routes["LAP"] = Route([GATE] + self._loop(low_spans, high_spans))
        self.lap_length_in = self.routes["LAP"].length
        self.low_mode = "clear" if not low_spans else "profile"
        self.high_mode = "clear" if not high_spans else "profile"
        self.planned_contacts = self.infeasible_vehicles

    # -- routes ---------------------------------------------------------------
    def build_routes(self, layout):
        self.infeasible_vehicles = 0
        if self.lane_source == "v10_blend":
            super().build_routes(layout)   # truth + plan_straight + fixed blends (SensedMissionSim)
            return
        if self.lane_source == "oracle":
            low_polys = [_obstacle_footprint(GUIDE_PLUSH, v["cx"], v["cy"], v["yaw"])
                         for v in layout.vehicles if v["side"] == "low"]
            high_polys = [_obstacle_footprint(GUIDE_PLUSH, v["cx"], v["cy"], v["yaw"])
                          for v in layout.vehicles if v["side"] == "high"]
        else:  # sensed starts with no knowledge — discovery lap 1 on the plain lanes
            low_polys, high_polys = [], []
        low_spans = self._spans("low", low_polys)
        high_spans = self._spans("high", high_polys)
        self._build_pit_routes(layout)
        self._set_lap_route(low_spans, high_spans)

    def _build_pit_routes(self, layout):
        # Shared pit/enter/park geometry, identical to mission.py (route model assumptions QA05/QA06).
        start = ((self.field.start_box[0] + self.field.start_box[2]) / 2,
                 (self.field.start_box[1] + self.field.start_box[3]) / 2)
        box = self.field.pit_boxes[layout.assigned_box]
        bc = (box[0] + 7.6, (box[1] + box[3]) / 2)
        high_exit = [(31.0, 39.25), (34.0, 36.5), (35.8, 33.0), (36.5, 29.0), GATE]
        enter = [start] + _poly([start, (24.0, 39.25)] + high_exit)
        lane_x = 16.6
        approach = [(lane_x, 9.0)] + ([] if layout.assigned_box == 1 else [(lane_x, bc[1])]) + [bc]
        to_box = _poly([GATE, (36.5, 16.0), (34.0, 11.0), (28.0, 9.0)] + approach)
        from_box = _poly([bc, (lane_x, bc[1]), (lane_x, 39.25), (24.0, 39.25)] + high_exit)
        self.routes = {"ENTER": Route(enter), "LAP": None, "TO_PIT": Route([GATE] + to_box),
                       "EXIT_PIT": Route(from_box), "PARK": Route([GATE] + to_box)}

    # -- sensing and replanning ----------------------------------------------
    def reset(self, layout, sensor_seed=0):
        out = super().reset(layout, sensor_seed)
        self.vmap = VehicleMap()
        self.scan_rng = random.Random(sensor_seed)
        # NB: do not zero infeasible_vehicles here — build_routes (via super().reset) already set it.
        return out

    def _sense(self):
        pose = (self.state["x"], self.state["y"], self.state["th"])
        self.vmap.add(scan(pose, self.barriers, self.layout.polys, self.scan_rng), pose)

    def _replan(self):
        vehs = self.vmap.vehicles()
        low_polys = [_obstacle_footprint(GUIDE_PLUSH, v["cx"], v["cy"], v["yaw"]) for v in vehs if v["side"] == "low"]
        high_polys = [_obstacle_footprint(GUIDE_PLUSH, v["cx"], v["cy"], v["yaw"]) for v in vehs if v["side"] == "high"]
        self.infeasible_vehicles = 0
        self._set_lap_route(self._spans("low", low_polys), self._spans("high", high_polys))

    def step(self, action=None):
        prev_laps = self.out["laps"]
        if self.lane_source == "sensed" and self.out["state"] not in ("DONE", "STOPPED"):
            self._sense()
        out = super().step(action)
        if self.lane_source == "sensed" and self.out["laps"] > prev_laps:
            self._replan()   # a new lap just started: rebuild the lap from the freshly sensed map
        return out

    def info(self):
        info = super().info()
        info["infeasible_vehicles"] = self.infeasible_vehicles
        if self.lane_source == "sensed":
            info["sensed_vehicles"] = len(self.vmap.vehicles())
        return info


def run_avoiding(seed, lane_source="v10_blend", footprint_in=None, yaw_mode="aligned", sensing=False,
                 max_steps=4000, obstacles=True, blend_in=8.0, min_blend_in=2.0):
    """Run one avoiding mission to completion and return the info dict (mirrors `run_sensed`)."""
    rng = random.Random(seed)
    sim = AvoidingMissionSim(sensing=sensing, footprint_in=footprint_in, lane_source=lane_source,
                             blend_in=blend_in, min_blend_in=min_blend_in)
    layout = random_layout(rng, sim.field, reading="offsets", yaw_mode=yaw_mode, obstacles=obstacles)
    sim.reset(layout, sensor_seed=seed)
    for _ in range(max_steps):
        _, _, done, info = sim.step()
        if done:
            return info
    return sim.info()