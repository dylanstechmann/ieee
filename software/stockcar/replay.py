"""Records mission logs (schemas/mission-log-v1.json) and reruns them offline.

A log holds what the robot's software receives each tick. Replay feeds it through a fresh estimator and
supervisor, so a recorded run can be reproduced exactly or tried with other sensing options. The
simulator writes these logs today; real robot logs need the same fields.
"""
import json
import random

from stockcar import lapmodel, mission
from stockcar.estimator import Estimator
from stockcar.field import Field
from stockcar.sensors import Band
from stockcar.supervisor import Supervisor

VERSION = 1
SENSING = ("full", "lines_only", "ranges_only", "odometry_only")
HEADER_KEYS = ("v", "log", "start_pose", "dt_s", "preset", "lap_length_m", "stop_at_s", "sensing")
RECORD_KEYS = ("v", "seq", "t_s", "enc", "gyro", "white", "changes", "tof", "obs", "state", "pose")


class Recorder:
    """Sits between a mission simulator and its sensors and supervisor, keeping what passes through."""

    def __init__(self, sim):
        self.sim = sim
        self.records = []
        self.reading = None
        self._measure, self._update = sim.sensors.measure, sim.sup.update
        sim.sensors.measure, sim.sup.update = self.measure, self.update
        self.header = {"v": VERSION, "log": "mission", "start_pose": list(sim.pose()), "dt_s": sim.dt, "preset": sim.preset,
                       "lap_length_m": sim.lap_length_in * 0.0254, "stop_at_s": lapmodel.AUTO_STOP_S, "sensing": sim.sensing}

    def measure(self, *args):
        self.reading = self._measure(*args)
        return self.reading

    def update(self, now, obs):
        out = self._update(now, obs)
        m = self.reading
        self.records.append({"v": VERSION, "seq": len(self.records), "t_s": now, "enc": list(m["encoder_delta"]), "gyro": m["gyro"], "white": m["white"],
                             "changes": m["line_changes"], "tof": m["tof"], "obs": dict(obs), "state": out["state"], "pose": list(self.sim.pose())})
        return out


def record_mission(seed, sensing="full", obstacles=True, preset="aggressive", envelope="nominal", max_steps=4000):
    sim = mission.MissionSim(preset, envelope, sensing=sensing)
    sim.reset(mission.random_layout(random.Random(seed), sim.field, "offsets", "aligned", obstacles=obstacles), sensor_seed=seed)
    recorder = Recorder(sim)
    for _ in range(max_steps):
        if sim.step()[2]:
            break
    return recorder.header, recorder.records


def dumps(header, records):
    return "".join(json.dumps(x, separators=(",", ":")) + "\n" for x in [header] + records)


def loads(text):
    items = [json.loads(line) for line in text.splitlines() if line.strip()]
    return items[0], items[1:]


def _is_number(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def _is_pose(x):
    return isinstance(x, list) and len(x) == 3 and all(_is_number(v) for v in x)


def validate(header, records):
    """Problems found in a log; an empty list means it can be replayed."""
    problems = []
    if set(header) != set(HEADER_KEYS):
        return [f"header keys differ: {sorted(set(header) ^ set(HEADER_KEYS))}"]
    if header["v"] != VERSION or header["log"] != "mission":
        problems.append("header is not a version 1 mission log")
    if not _is_pose(header["start_pose"]):
        problems.append("header start_pose must be three numbers")
    if not (_is_number(header["dt_s"]) and header["dt_s"] > 0):
        problems.append("header dt_s must be positive")
    if header["sensing"] not in SENSING:
        problems.append("header sensing is not a known mode")
    for n, r in enumerate(records):
        label = f"record {n}"
        if set(r) != set(RECORD_KEYS):
            problems.append(f"{label}: keys differ: {sorted(set(r) ^ set(RECORD_KEYS))}")
            continue
        if r["seq"] != n:
            problems.append(f"{label}: seq is {r['seq']}")
        if not (isinstance(r["enc"], list) and len(r["enc"]) == 2 and all(isinstance(x, int) and not isinstance(x, bool) for x in r["enc"])):
            problems.append(f"{label}: enc must be two integers")
        if not _is_number(r["gyro"]):
            problems.append(f"{label}: gyro must be a number")
        if not (isinstance(r["white"], list) and all(isinstance(x, bool) for x in r["white"])):
            problems.append(f"{label}: white must be booleans")
        elif not all(isinstance(k, int) and 0 <= k < len(r["white"]) for k in r["changes"]):
            problems.append(f"{label}: changes must index white")
        if not (isinstance(r["tof"], list) and all(x is None or _is_number(x) for x in r["tof"])):
            problems.append(f"{label}: tof must be numbers or null")
        if not isinstance(r["obs"], dict):
            problems.append(f"{label}: obs must be an object")
        if not (r["pose"] is None or _is_pose(r["pose"])):
            problems.append(f"{label}: pose must be null or three numbers")
    return problems


def replay(header, records, sensing=None, configure=None):
    """Reruns a log. Pass sensing to try another mode and configure(estimator) to change its options."""
    mode = sensing or header["sensing"]
    field = Field()
    est = Estimator(tuple(header["start_pose"]), Band(field), field.barriers())
    if configure:
        configure(est)
    sup = Supervisor(header["preset"], lap_length_m=header["lap_length_m"], stop_at_s=header["stop_at_s"])
    sup.update(0.0, {})
    poses, states = [], []
    for r in records:
        reading = {"encoder_delta": r["enc"], "gyro": r["gyro"], "white": r["white"], "line_changes": r["changes"], "tof": r["tof"]}
        est.predict(r["enc"], r["gyro"], header["dt_s"])
        est.correct(reading, use_lines=mode in ("full", "lines_only"), use_ranges=mode in ("full", "ranges_only"))
        poses.append(list(est.pose()))
        states.append(sup.update(r["t_s"], r["obs"])["state"])
    return {"poses": poses, "states": states, "estimator": est}


def compare(records, result):
    """How far a replay is from what the log recorded."""
    logged = [(r["pose"], p) for r, p in zip(records, result["poses"]) if r["pose"] is not None]
    gap = max((max(abs(a - b) for a, b in zip(x, y)) for x, y in logged), default=None)
    state_mismatches = sum(1 for r, s in zip(records, result["states"]) if r["state"] is not None and r["state"] != s)
    return {"largest_pose_difference": gap, "state_mismatches": state_mismatches}
