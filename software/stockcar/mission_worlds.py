"""Ruleset-world simulator: ``MissionSim`` with the ten open-question assumptions pulled from
``stockcar.ruleset`` instead of hard-coded.

``WorldMissionSim`` builds the same v10 routes as ``MissionSim`` for the counterclockwise worlds and
mirrors the lap loop about the field centerline for the clockwise world. When a world's ``lap`` mode
is ``"line"`` it arms ``LapLineDetector`` and records every literal checkered start/finish-band
crossing, plus a ``finish_line`` event at the pit-exit crossing. Lap *counting* itself stays "by
route progress" (the QA06 working assumption); which band crossing stops the clock is provisional
until QA06 is answered, so the finish-line data is recorded alongside — not instead of — the baseline
lap/finish numbers.

The formerly deferred settings are implemented here: ``"enforced"`` lanes add lane-aware lap routing,
straightaway white-line contact telemetry, and a reward-only marking penalty; ``"small"`` obstacles use
the QA03 hypothetical toy footprint from ``ruleset.SMALL_TOY``. Both remain synthetic assumptions, not
organizer rulings.

Agent-written for the owner's hobby/learning project; synthetic only.
"""
import math
import random

from stockcar import mission, ruleset, world_geometry, world_layouts, world_routes
from stockcar.sensors_camera import LapLineDetector


class WorldMissionSim(mission.MissionSim):
    def __init__(self, world=None, preset=None, envelope=None, field=None, sensing=False):
        name = world if isinstance(world, str) else ruleset.default_name()
        self.world = ruleset.get(name)
        self.world_name = name
        super().__init__(self.world["preset"], self.world["envelope"], field, self.world["footprint_kind"], sensing)
        self.lap_line = None
        self.prev_pose = None
        self.band_crossings = []
        self.finish_line_t = None
        self.enforced = self.world["lane_rule"] == "enforced"
        self.marking_bands = world_geometry.straight_marking_bands(self.field) if self.enforced else None
        self.lane_violations = 0
        self.lane_violations_by_lap = [0, 0, 0]
        self.lane_violation_steps = [0, 0, 0]
        self._lane_contact_prev = set()
        self._lane_penalty_pending = 0.0
        self.lane_plan_diag = {}

    def reset(self, layout, sensor_seed=0):
        out = super().reset(layout, sensor_seed=sensor_seed)
        self.lap_line = LapLineDetector(self.field) if self.world["lap"] == "line" else None
        self.prev_pose = (self.state["x"], self.state["y"], self.state["th"])
        self.band_crossings = []
        self.finish_line_t = None
        self.lane_violations = 0
        self.lane_violations_by_lap = [0, 0, 0]
        self.lane_violation_steps = [0, 0, 0]
        self._lane_contact_prev = set()
        self._lane_penalty_pending = 0.0
        return out

    def build_routes(self, layout):
        super().build_routes(layout)
        if self.enforced:
            low_plan = world_routes.enforced_lane_plan(self.field, layout, "low", mission.LOW_LANE)
            high_plan = world_routes.enforced_lane_plan(self.field, layout, "high", mission.HIGH_LANE)
            loop = mission.arc((44.0, 24.0), math.pi, 1.5 * math.pi)
            loop += mission.straight(44.0, 80.0, mission.LOW_LANE, low_plan["lanes"], mission.LOW_LANE)
            loop += mission.arc((80.0, 24.0), -0.5 * math.pi, 0.5 * math.pi)
            loop += mission.straight(80.0, 44.0, mission.HIGH_LANE, high_plan["lanes"], mission.HIGH_LANE)
            loop += mission.arc((44.0, 24.0), 0.5 * math.pi, math.pi)
            self.routes["LAP"] = mission.Route([mission.GATE] + loop)
            self.lap_length_in = self.routes["LAP"].length
            self.low_mode, self.high_mode = low_plan["mode"], high_plan["mode"]
            self.planned_contacts = low_plan["blocked"] + high_plan["blocked"]
            self.lane_plan_diag = {"low": low_plan, "high": high_plan}
        elif self.world["direction"] == "cw":
            cy = (mission.LOW_LANE + mission.HIGH_LANE) / 2.0
            pts = [(x, 2 * cy - y) for x, y in self.routes["LAP"].pts]
            self.routes["LAP"] = mission.Route(pts)

    def _update_lane_contacts(self):
        if not self.enforced:
            return 0.0
        poly = self._footprint(self.state["x"], self.state["y"], self.state["th"])
        names = world_geometry.marking_contacts(poly, self.marking_bands)
        lap = min(self.sup.laps, 2)
        if names:
            self.lane_violation_steps[lap] += 1
        penalty = 0.0
        for name in names:
            if name not in self._lane_contact_prev:
                self.lane_violations += 1
                self.lane_violations_by_lap[lap] += 1
                penalty += 2.0
        self._lane_contact_prev = set(names)
        self._lane_penalty_pending += penalty
        return penalty

    def _mission(self):
        if self.enforced:
            self._update_lane_contacts()
        if self.lap_line is not None:
            now = (self.state["x"], self.state["y"], self.state["th"])
            if self.lap_line.detect(now, self.prev_pose):
                low = self.lap_line.low
                opening = "low" if low[0] <= self.state["y"] <= low[1] else "high"
                self.band_crossings.append({"t": round(self.t, 3), "state": self.out["state"], "opening": opening})
                if self.out["state"] == "EXIT_PIT" and self.finish_line_t is None:
                    self.finish_line_t = self.t
                    self.events["finish_line"] = self.t
        points = super()._mission()
        self.prev_pose = (self.state["x"], self.state["y"], self.state["th"])
        return points

    def step(self, action=None):
        self._lane_penalty_pending = 0.0
        obs, reward, done, info = super().step(action)
        if self.enforced:
            reward -= self._lane_penalty_pending
            self._lane_penalty_pending = 0.0
        return obs, reward, done, info

    def info(self):
        info = super().info()
        info["world"] = self.world_name
        info["lap_mode"] = self.world["lap"]
        info["direction"] = self.world["direction"]
        info["body"] = self.world["body"]
        if self.lap_line is not None:
            info["band_crossings"] = list(self.band_crossings)
            info["finish_line_s"] = round(self.finish_line_t, 3) if self.finish_line_t is not None else None
        if self.enforced:
            info["lane_violations"] = self.lane_violations
            info["lane_violations_by_lap"] = list(self.lane_violations_by_lap)
            info["lane_violation_steps"] = list(self.lane_violation_steps)
            info["lane_plan"] = self.lane_plan_diag
        return info


class WorldMissionEnv:
    """Gymnasium-style wrapper, mirroring ``mission.MissionEnv``. Training 0-99 / evaluation 100-119."""

    TRAIN = range(0, 100)
    EVAL = range(100, 120)

    def __init__(self, world=None, evaluation=False):
        self.evaluation = evaluation
        self.world_name = world if isinstance(world, str) else ruleset.default_name()
        self.sim = WorldMissionSim(self.world_name)

    def reset(self, seed):
        allowed = self.EVAL if self.evaluation else self.TRAIN
        if seed not in allowed:
            raise ValueError(f"seed {seed} is outside the {'evaluation' if self.evaluation else 'training'} range")
        w = self.sim.world
        if w["shape"]["id"] == "guide_plush":
            layout = mission.random_layout(random.Random(seed), self.sim.field,
                                           reading=w["reading"], yaw_mode=w["yaw_mode"], obstacles=True)
        else:
            layout = world_layouts.world_random_layout(random.Random(seed), self.sim.field, w["shape"],
                                                       reading=w["reading"], yaw_mode=w["yaw_mode"],
                                                       obstacles=True)
        return self.sim.reset(layout, sensor_seed=seed), {"seed": seed, "world": self.world_name}

    def step(self, action):
        obs, reward, done, info = self.sim.step(action)
        return obs, reward, done, False, info


def run_world(world, seed, max_steps=4000):
    """Run one world mission to completion (or step cap) and return the info dict."""
    env = WorldMissionEnv(world)
    env.reset(seed)
    for _ in range(max_steps):
        _, _, done, _trunc, info = env.step(None)   # None delegates to the classical planner
        if done:
            return info
    return info