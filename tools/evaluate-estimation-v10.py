"""Estimation v10: closed-loop missions controlled from estimated pose, with sensor ablations.

Agent-run synthetic evaluation for the owner's hobby/learning project. On seeds 100-119, the v10
mission runs with the robot steering from an EKF estimate built from:
- all sensors (encoders, gyro, reflectance band edges, four low ToF ranges);
- band edges only;
- ranges only;
- odometry only.
Each mode runs on the empty field and with guide-size vehicles. Contacts and parking are judged
from the true pose. Sensor parameters are placeholders and the map is perfect, so this ranks
options; it does not predict on-field accuracy.

An ablation on the empty field then separates what each change is worth: which sensor errors cause
odometry drift, and how line matching, stillness updates, a pre-start wait and a calibrated gyro
scale combine.

Usage: python -I tools/evaluate-estimation-v10.py
"""
import hashlib
import json
import pathlib
import random
import statistics
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "software"))
from stockcar import mission  # noqa: E402

OUT = ROOT / "derived" / "estimation-v10"
DATE = "2026-11-04"
SEEDS = list(mission.MissionEnv.EVAL)
MODES = ("full", "ranges_only", "lines_only", "odometry_only")
CONDITIONS = {"empty": False, "aligned_vehicles": True}
CALIBRATED = 0.1    # share of the gyro scale error left after a bench calibration
ODOMETRY = "odometry_only"
LINES = "lines_only"
# label, sensing, line matching, stillness updates, pre-start wait in s, share of each sensor error left
ABLATION = [
    ("all errors", ODOMETRY, "ring", False, 0.0, {}),
    ("no gyro bias", ODOMETRY, "ring", False, 0.0, {"gyro_bias": 0.0}),
    ("no gyro scale error", ODOMETRY, "ring", False, 0.0, {"gyro_scale": 0.0}),
    ("no wheel scale error", ODOMETRY, "ring", False, 0.0, {"wheel_scale": 0.0}),
    ("no gyro bias or scale error", ODOMETRY, "ring", False, 0.0, {"gyro_bias": 0.0, "gyro_scale": 0.0}),
    ("none of the three", ODOMETRY, "ring", False, 0.0, {"gyro_bias": 0.0, "gyro_scale": 0.0, "wheel_scale": 0.0}),
    ("stillness", ODOMETRY, "ring", True, 0.0, {}),
    ("stillness, 5 s wait", ODOMETRY, "ring", True, 5.0, {}),
    ("stillness, calibrated scale", ODOMETRY, "ring", True, 0.0, {"gyro_scale": CALIBRATED}),
    ("stillness, 5 s wait, calibrated scale", ODOMETRY, "ring", True, 5.0, {"gyro_scale": CALIBRATED}),
    ("ring, stillness, calibrated scale", LINES, "ring", True, 0.0, {"gyro_scale": CALIBRATED}),
    ("ring, stillness, 5 s wait, calibrated scale", LINES, "ring", True, 5.0, {"gyro_scale": CALIBRATED}),
] + [
    (f"{matching}{', stillness' if still else ''}{', 5 s wait' if wait else ''}", sensing, matching, still, wait, {})
    for sensing in (LINES, "full") for matching in ("nearest", "ring") for still, wait in ((False, 0.0), (True, 0.0), (True, 5.0))
]
INPUTS = ["tools/evaluate-estimation-v10.py", "software/stockcar/mission.py", "software/stockcar/sensors.py",
          "software/stockcar/estimator.py", "software/stockcar/supervisor.py", "software/stockcar/passage.py",
          "software/stockcar/field.py", "software/stockcar/obstacles.py", "software/stockcar/geometry.py",
          "software/stockcar/lapmodel.py", "derived/organizer-cad-v10/field-v10.json"]


def ablated_run(seed, sensing, matching, stillness, wait_s, remaining):
    """mission.run on the empty field, with the estimator options set and sensor errors reduced first."""
    sim = mission.MissionSim("aggressive", "nominal", sensing=sensing)
    sim.reset(mission.random_layout(random.Random(seed), sim.field, "offsets", "aligned", obstacles=False), sensor_seed=seed)
    sim.est.matching, sim.est.use_stillness = matching, stillness
    sensors = sim.sensors
    sensors.gyro_bias *= remaining.get("gyro_bias", 1.0)
    sensors.gyro_scale = 1.0 + (sensors.gyro_scale - 1.0) * remaining.get("gyro_scale", 1.0)
    sensors.slip = tuple(1.0 + (k - 1.0) * remaining.get("wheel_scale", 1.0) for k in sensors.slip)
    pose = (sim.state["x"], sim.state["y"], sim.state["th"])
    for _ in range(round(wait_s / sim.dt)):
        meas = sensors.measure(pose, 0.0, 0.0, sim.dt)
        sim.est.predict(meas["encoder_delta"], meas["gyro"], sim.dt)
        sim.est.correct(meas, use_lines=False, use_ranges=False)
    for _ in range(4000):
        _, _, done, info = sim.step()
        if done:
            return info
    return sim.info()


def ablation():
    rows = []
    for label, sensing, matching, stillness, wait_s, remaining in ABLATION:
        runs = [ablated_run(seed, sensing, matching, stillness, wait_s, remaining) for seed in SEEDS]
        est = [r["estimation"] for r in runs]
        rows.append({
            "label": label, "sensing": sensing, "matching": matching, "stillness": stillness, "wait_s": wait_s, "error_remaining": remaining,
            "summary": {
                "completed": sum(r["state"] == "DONE" for r in runs),
                "rms_position_error_in_median": round(statistics.median(e["rms_position_error_in"] for e in est), 3),
                "max_position_error_in_worst": round(max(e["max_position_error_in"] for e in est), 3),
                "max_heading_error_deg_median": round(statistics.median(e["max_heading_error_deg"] for e in est), 2),
                "max_heading_error_deg_worst": round(max(e["max_heading_error_deg"] for e in est), 2),
            },
            "runs": [{"state": r["state"], **{k: e[k] for k in ("rms_position_error_in", "max_position_error_in", "max_heading_error_deg")}}
                     for r, e in zip(runs, est)],
        })
    return rows


def main():
    results = []
    for cname, obstacles in CONDITIONS.items():
        for mode in MODES:
            runs = [mission.run(seed, obstacles=obstacles, sensing=mode) for seed in SEEDS]
            est = [r["estimation"] for r in runs]
            results.append({
                "condition": cname, "sensing": mode,
                "summary": {
                    "completed": sum(r["state"] == "DONE" for r in runs),
                    "parked": sum(r["parked"] for r in runs),
                    "laps_with_wall_contact": sum(sum(1 for c in r["wall_contact_steps"] if c) for r in runs),
                    "rms_position_error_in_median": round(statistics.median(e["rms_position_error_in"] for e in est), 3),
                    "max_position_error_in_worst": round(max(e["max_position_error_in"] for e in est), 3),
                    "max_heading_error_deg_worst": round(max(e["max_heading_error_deg"] for e in est), 2),
                    "mean_score_like": round(statistics.mean(r["score_like"] for r in runs), 2),
                },
                "runs": runs,
            })
    rows = ablation()
    lines = [
        "# Estimation v10: summary",
        "",
        f"{DATE}. Agent-run synthetic evaluation, seeds 100-119. The robot steers from an EKF estimate; contacts and parking use the true pose. Sensor parameters are placeholders (encoder slip 2%, gyro bias 0.01 rad/s, gyro scale 1%, ToF noise 0.3 in, 5% dropout) and the map is perfect. The estimator matches each line crossing to a ring by direction and color, and learns the gyro bias whenever both wheels are still.",
        "",
        "| Condition | Sensing | Completed | Parked | Laps with wall contact | Median RMS error (in) | Worst max error (in) | Worst heading error (deg) | Mean score-like |",
        "|---|---|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for r in results:
        s = r["summary"]
        lines.append(f"| {r['condition']} | {r['sensing']} | {s['completed']}/20 | {s['parked']} | {s['laps_with_wall_contact']} | {s['rms_position_error_in_median']} | {s['max_position_error_in_worst']} | {s['max_heading_error_deg_worst']} | {s['mean_score_like']} |")
    lines += [
        "",
        "## Ablation, empty field",
        "",
        f"\"Calibrated scale\" leaves {CALIBRATED:.0%} of the gyro scale error. \"5 s wait\" holds the robot still before the mission. The odometry rows above \"stillness\" switch stillness updates off.",
        "",
        "| Sensing | Variant | Completed | Median RMS error (in) | Worst max error (in) | Median heading error (deg) | Worst heading error (deg) |",
        "|---|---|---:|---:|---:|---:|---:|",
    ]
    for r in rows:
        s = r["summary"]
        lines.append(f"| {r['sensing']} | {r['label']} | {s['completed']}/20 | {s['rms_position_error_in_median']} | {s['max_position_error_in_worst']} | {s['max_heading_error_deg_median']} | {s['max_heading_error_deg_worst']} |")
    lines += [
        "",
        "The model is optimistic about ranging: perfect map, clean returns, gating of vehicle hits. Bench tests on real field paint, divider faces and the official vehicles (P6) decide the real sensor suite. See `README.md` for what these rows suggest.",
        "",
    ]
    OUT.mkdir(parents=True, exist_ok=True)
    data = {"version": "0.10.0", "date": DATE, "status": "agent-run synthetic evaluation; not on-robot accuracy", "seeds": SEEDS, "results": results, "ablation": rows}
    files = {"evaluation.json": json.dumps(data, indent=1) + "\n", "summary.md": "\n".join(lines)}
    for name, text in files.items():
        (OUT / name).write_text(text, encoding="utf-8")
    manifest = {"date": DATE, "status": data["status"],
                "input_hashes": {f: hashlib.sha256((ROOT / f).read_bytes()).hexdigest() for f in INPUTS},
                "output_hashes": {n: hashlib.sha256(t.encode("utf-8")).hexdigest() for n, t in files.items()}}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("wrote", OUT.relative_to(ROOT))


if __name__ == "__main__":
    main()
