"""Ruleset-world simulator: ``MissionSim`` with the ten open-question assumptions pulled from
``stockcar.ruleset`` instead of hard-coded.

``WorldMissionSim`` builds the same v10 routes as ``MissionSim`` for the counterclockwise worlds and
mirrors the lap loop about the field centerline for the clockwise world. When a world's ``lap`` mode
is ``"line"`` it arms ``LapLineDetector`` and records every literal checkered start/finish-band
crossing, plus a ``finish_line`` event at the pit-exit crossing. Lap *counting* itself stays "by
route progress" (the QA06 working assumption); which band crossing stops the clock is provisional
until QA06 is answered, so the finish-line data is recorded alongside — not instead of — the baseline
lap/finish numbers.

The ``"enforced"`` lane rule, the ``"small"`` obstacle and full clockwise/obstacle-mirrored fidelity
are stamped out per-world in the later branch step (see ``docs/worlds.md``), so those settings raise
``NotImplementedError`` here rather than silently behaving like their baseline.

Agent-written for the owner's hobby/learning project; synthetic only.
"""
import random

from stockcar import mission, ruleset
from stockcar.sensors_camera import LapLineDetector


class WorldMissionSim(mission.MissionSim):
    def __init__(self, world=None, preset=None, envelope=None, field=None, sensing=False):
        name = world if isinstance(world, str) else ruleset.default_name()
        self.world = ruleset.get(name)
        self.world_name = name
        if self.world["lane_rule"] == "enforced":
            raise NotImplementedError("enforced lanes land in the world-ccw-line-sq-enf-align branch step")
        if self.world["obstacle"] == "small":
            raise NotImplementedError("small obstacle lands in the world-ccw-line-sq-adv-small branch step")
        super().__init__(self.world["preset"], self.world["envelope"], field, self.world["footprint_kind"], sensing)
        self.lap_line = None
        self.prev_pose = None
        self.band_crossings = []
        self.finish_line_t = None

    def reset(self, layout, sensor_seed=0):
        out = super().reset(layout, sensor_seed=sensor_seed)
        self.lap_line = LapLineDetector(self.field) if self.world["lap"] == "line" else None
        self.prev_pose = (self.state["x"], self.state["y"], self.state["th"])
        self.band_crossings = []
        self.finish_line_t = None
        return out

    def build_routes(self, layout):
        super().build_routes(layout)
        if self.world["direction"] == "cw":
            cy = (mission.LOW_LANE + mission.HIGH_LANE) / 2.0
            pts = [(x, 2 * cy - y) for x, y in self.routes["LAP"].pts]
            self.routes["LAP"] = mission.Route(pts)

    def _mission(self):
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

    def info(self):
        info = super().info()
        info["world"] = self.world_name
        info["lap_mode"] = self.world["lap"]
        info["direction"] = self.world["direction"]
        info["body"] = self.world["body"]
        if self.lap_line is not None:
            info["band_crossings"] = list(self.band_crossings)
            info["finish_line_s"] = round(self.finish_line_t, 3) if self.finish_line_t is not None else None
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
        layout = mission.random_layout(random.Random(seed), self.sim.field,
                                       reading=w["reading"], yaw_mode=w["yaw_mode"], obstacles=True)
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