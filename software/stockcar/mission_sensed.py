"""Sensed-mission simulator: the v10 `MissionSim` with the AprilTag (pit box) and the start flag fed
through camera models instead of ground truth, plus an optional stop-on-vehicle-contact safety layer.

This is a subclass, not an edit of `software/stockcar/mission.py`, because that file is a pinned input
of the sealed envelope/estimation/full-mission/maneuver/mission v10 packages and must stay byte-identical.

Agent-written for the owner's hobby/learning project; synthetic only.
"""
import math
import random

from stockcar import lapmodel
from stockcar.avoidance import plan_straight
from stockcar.geometry import rectangle
from stockcar.mission import GATE, HIGH_LANE, LOW_LANE, MissionSim, Route, _poly, arc, overlap_fraction, random_layout, straight
from stockcar.sensors_camera import CameraModel, StartFlagModel


class SensedMissionSim(MissionSim):
    """MissionSim whose supervisor sees the pit box and start flag only through the camera models.

    `_mission()` deliberately mirrors `MissionSim._mission()` byte-for-byte except for the two sensed
    observations; the route, exchange, parking and event logic is the unchanged v10 behaviour.

    `collision_stops=True` halts the robot the frame after any vehicle contact instead of the v10
    "continue gently" policy.

    `replan_lanes=True` builds the lap lanes from `avoidance.plan_straight` (the vehicle positions in the
    layout) instead of `lane_plan`, and `footprint_in` overrides the assumed square robot size — the two
    levers that `derived/avoid-v11/` sweeps to find why contact-free runs are so rare. Until a real vehicle
    sensor exists (Track 1d) both planners receive the same ground-truth positions."""

    def __init__(self, preset="aggressive", envelope="nominal", field=None, footprint_kind="square",
                 sensing=False, collision_stops=False, replan_lanes=False, footprint_in=None):
        super().__init__(preset, envelope, field, footprint_kind, sensing)
        self.collision_stops = collision_stops
        self.replan_lanes = replan_lanes
        self.footprint_in = footprint_in

    def _footprint(self, x, y, th):
        if self.footprint_in is not None:
            if self.footprint_kind == "round":
                r = self.footprint_in / 2
                return [(x + r * math.cos(2 * math.pi * k / 24) / math.cos(math.pi / 24),
                         y + r * math.sin(2 * math.pi * k / 24) / math.cos(math.pi / 24)) for k in range(24)]
            return rectangle(x, y, th, self.footprint_in, self.footprint_in)
        return super()._footprint(x, y, th)

    def build_routes(self, layout):
        if not self.replan_lanes:
            super().build_routes(layout)
            return
        # Mirrors MissionSim.build_routes with lane_plan swapped for the avoidance planner; the
        # loop/enter/pit/park geometry is the unchanged (QA05/QA06-assumed) v10 route.
        width = self.footprint_in if self.footprint_in is not None else 10.0
        low_lanes, self.low_mode, low_blocked = plan_straight(
            self.field, [v for v in layout.vehicles if v["side"] == "low"], "low", LOW_LANE, robot_width=width)
        high_lanes, self.high_mode, high_blocked = plan_straight(
            self.field, [v for v in layout.vehicles if v["side"] == "high"], "high", HIGH_LANE, robot_width=width)
        self.planned_contacts = low_blocked + high_blocked
        loop = arc((44.0, 24.0), math.pi, 1.5 * math.pi)
        loop += straight(44.0, 80.0, LOW_LANE, low_lanes, LOW_LANE)
        loop += arc((80.0, 24.0), -0.5 * math.pi, 0.5 * math.pi)
        loop += straight(80.0, 44.0, HIGH_LANE, high_lanes, HIGH_LANE)
        loop += arc((44.0, 24.0), 0.5 * math.pi, math.pi)
        start = ((self.field.start_box[0] + self.field.start_box[2]) / 2, (self.field.start_box[1] + self.field.start_box[3]) / 2)
        box = self.field.pit_boxes[layout.assigned_box]
        bc = (box[0] + 7.6, (box[1] + box[3]) / 2)
        high_exit = [(31.0, 39.25), (34.0, 36.5), (35.8, 33.0), (36.5, 29.0), GATE]
        enter = [start] + _poly([start, (24.0, 39.25)] + high_exit)
        lane_x = 16.6
        approach = [(lane_x, 9.0)] + ([] if layout.assigned_box == 1 else [(lane_x, bc[1])]) + [bc]
        to_box = _poly([GATE, (36.5, 16.0), (34.0, 11.0), (28.0, 9.0)] + approach)
        from_box = _poly([bc, (lane_x, bc[1]), (lane_x, 39.25), (24.0, 39.25)] + high_exit)
        self.routes = {"ENTER": Route(enter), "LAP": Route([GATE] + loop), "TO_PIT": Route([GATE] + to_box),
                       "EXIT_PIT": Route(from_box), "PARK": Route([GATE] + to_box)}
        self.lap_length_in = self.routes["LAP"].length

    def classical_action(self):
        if self.collision_stops:
            lap = min(self.sup.laps, 2)
            if self.vehicle_contacts[lap] > 0:
                return (0.0, 0.0)
        return super().classical_action()

    def reset(self, layout, sensor_seed=0):
        out = super().reset(layout, sensor_seed)
        self.cam = CameraModel(layout.assigned_box)
        self.flag = StartFlagModel()
        return out

    def _mission(self):
        obs = {"odometry_m": self.odometry_in * 0.0254}
        # The supervisor gets what the cameras see, not the ground truth. A missed tag read is None
        # (the supervisor falls back after failing its majority vote); a missed flag frame is
        # (False, None), which does not advance the arm/confirm counters.
        tid, _, _ = self.cam.read((self.state["x"], self.state["y"], self.state["th"]))
        obs["tag_id"] = tid
        _, up = self.flag.read((self.state["x"], self.state["y"], self.state["th"]), self.t > 0.6)
        obs["flag_up"] = up
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
            self.events["lap_%d" % after["laps"]] = self.t
        if before.get("exchange_result") is None and after.get("exchange_result") == "done":
            points += 65
        if after["state"] == "DONE" and before["state"] != "DONE":
            self.events["parked"] = self.t
        if after["state"] != state or self.route_name is None:
            self._route_for_state(after["state"])
        elif after["state"] == "LAP" and after["laps"] > before["laps"]:
            self.route_index = 0
            self.route_done = False
        return points


def run_sensed(seed, preset="aggressive", envelope="nominal", obstacles=True, reading="offsets",
               yaw_mode="aligned", max_steps=4000, sensing=False, collision_stops=False,
               replan_lanes=False, footprint_in=None):
    """Run one sensed mission to completion and return the info dict, mirroring mission.run()."""
    rng = random.Random(seed)
    sim = SensedMissionSim(preset, envelope, sensing=sensing, collision_stops=collision_stops,
                           replan_lanes=replan_lanes, footprint_in=footprint_in)
    layout = random_layout(rng, sim.field, reading, yaw_mode, obstacles=obstacles)
    sim.reset(layout, sensor_seed=seed)
    for _ in range(max_steps):
        _, _, done, info = sim.step()
        if done:
            return info
    return sim.info()