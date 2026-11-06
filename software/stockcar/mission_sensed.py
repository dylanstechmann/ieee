"""Sensed-mission simulator: the v10 `MissionSim` with the AprilTag (pit box) and the start flag fed
through camera models instead of ground truth.

This is a subclass, not an edit of `software/stockcar/mission.py`, because that file is a pinned input
of the sealed envelope/estimation/full-mission/maneuver/mission v10 packages and must stay byte-identical.

Agent-written for the owner's hobby/learning project; synthetic only.
"""
import random

from stockcar import lapmodel
from stockcar.mission import MissionSim, overlap_fraction, random_layout
from stockcar.sensors_camera import CameraModel, StartFlagModel


class SensedMissionSim(MissionSim):
    """MissionSim whose supervisor sees the pit box and start flag only through the camera models.

    `_mission()` deliberately mirrors `MissionSim._mission()` byte-for-byte except for the two sensed
    observations; the route, exchange, parking and event logic is the unchanged v10 behaviour."""

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
               yaw_mode="aligned", max_steps=4000, sensing=False):
    """Run one sensed mission to completion and return the info dict, mirroring mission.run()."""
    rng = random.Random(seed)
    sim = SensedMissionSim(preset, envelope, sensing=sensing)
    layout = random_layout(rng, sim.field, reading, yaw_mode, obstacles=obstacles)
    sim.reset(layout, sensor_seed=seed)
    for _ in range(max_steps):
        _, _, done, info = sim.step()
        if done:
            return info
    return sim.info()