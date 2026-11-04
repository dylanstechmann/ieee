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

Usage: python -I tools/evaluate-estimation-v10.py
"""
import hashlib
import json
import pathlib
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
INPUTS = ["tools/evaluate-estimation-v10.py", "software/stockcar/mission.py", "software/stockcar/sensors.py",
          "software/stockcar/estimator.py", "software/stockcar/supervisor.py", "software/stockcar/passage.py",
          "software/stockcar/field.py", "software/stockcar/obstacles.py", "software/stockcar/geometry.py",
          "software/stockcar/lapmodel.py", "derived/organizer-cad-v10/field-v10.json"]


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
    lines = [
        "# Estimation v10: summary",
        "",
        f"{DATE}. Agent-run synthetic evaluation, seeds 100-119. The robot steers from an EKF estimate; contacts and parking use the true pose. Sensor parameters are placeholders (encoder slip 2%, gyro bias 0.01 rad/s, ToF noise 0.3 in, 5% dropout) and the map is perfect.",
        "",
        "| Condition | Sensing | Completed | Parked | Laps with wall contact | Median RMS error (in) | Worst max error (in) | Worst heading error (deg) | Mean score-like |",
        "|---|---|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for r in results:
        s = r["summary"]
        lines.append(f"| {r['condition']} | {r['sensing']} | {s['completed']}/20 | {s['parked']} | {s['laps_with_wall_contact']} | {s['rms_position_error_in_median']} | {s['max_position_error_in_worst']} | {s['max_heading_error_deg_worst']} | {s['mean_score_like']} |")
    lines += [
        "",
        "## Reading this",
        "",
        "- **Low range sensing against walls and dividers carries the estimate in this model.** With ranges, errors stay well under an inch; odometry alone drifts by many inches over a mission.",
        "- **Reflectance with naive nearest-edge matching is not enough by itself.** The band is 0.9 in wide, so once the error passes about half an inch a crossing can be matched to the wrong edge. Line sensing still matters for lap and finish detection and could be used better, for example with crossing-event logic at known places.",
        "- **The model is optimistic about ranging:** perfect map, clean returns, gating of vehicle hits. Bench tests on real field paint, divider faces and the official vehicles (P6) decide the real sensor suite.",
        "",
    ]
    OUT.mkdir(parents=True, exist_ok=True)
    data = {"version": "0.10.0", "date": DATE, "status": "agent-run synthetic evaluation; not on-robot accuracy", "seeds": SEEDS, "results": results}
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
