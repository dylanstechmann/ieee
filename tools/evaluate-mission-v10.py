"""Evaluate the v10 mission simulator on the reserved evaluation seeds (100-119).

Agent-run synthetic evaluation for the owner's hobby/learning project. Conditions: empty field,
guide-size vehicles placed aligned, and vehicles at random yaw (offsets reading). Each runs with the
aggressive and safe presets at the v9 (8 in/s) and nominal (12 in/s) speed settings. Kinematic robot,
perfect knowledge, assumed lap and pit routes (QA05/QA06). Not a robot test or a score prediction.

Usage: python -I tools/evaluate-mission-v10.py
"""
import hashlib
import json
import pathlib
import statistics
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "software"))
from stockcar import mission  # noqa: E402

OUT = ROOT / "derived" / "mission-v10"
DATE = "2026-11-04"
SEEDS = list(mission.MissionEnv.EVAL)
CONDITIONS = {"empty": {"obstacles": False}, "aligned_vehicles": {"obstacles": True, "yaw_mode": "aligned"},
              "random_yaw_vehicles": {"obstacles": True, "yaw_mode": "random"}}
PRESETS = ("aggressive", "safe")
ENVELOPES = ("v9", "nominal")
INPUTS = ["tools/evaluate-mission-v10.py", "software/stockcar/mission.py", "software/stockcar/supervisor.py",
          "software/stockcar/lapmodel.py", "software/stockcar/passage.py", "software/stockcar/field.py",
          "software/stockcar/obstacles.py", "software/stockcar/geometry.py", "derived/organizer-cad-v10/field-v10.json"]


def summarize(runs):
    fin = [r["finish_s"] for r in runs if r["finish_s"] is not None]
    return {
        "runs": len(runs),
        "completed": sum(r["state"] == "DONE" for r in runs),
        "parked": sum(r["parked"] for r in runs),
        "exchange_done": sum(r["exchange_result"] == "done" for r in runs),
        "finish_s_median": round(statistics.median(fin), 2) if fin else None,
        "finish_s_max": round(max(fin), 2) if fin else None,
        "under_165_s": sum(f < 165 for f in fin),
        "vehicle_contact_free_runs": sum(all(c == 0 for c in r["vehicle_contact_steps"]) for r in runs),
        "laps_with_wall_contact": sum(sum(1 for c in r["wall_contact_steps"] if c) for r in runs),
        "mean_score_like": round(statistics.mean(r["score_like"] for r in runs), 2),
    }


def main():
    results = []
    for cname, kwargs in CONDITIONS.items():
        for preset in PRESETS:
            for env in ENVELOPES:
                runs = [mission.run(seed, preset=preset, envelope=env, **kwargs) for seed in SEEDS]
                results.append({"condition": cname, "preset": preset, "envelope": env, "summary": summarize(runs), "runs": runs})
    lines = [
        "# Mission v10 evaluation: summary",
        "",
        f"{DATE}. Agent-run synthetic evaluation on the reserved evaluation seeds 100-119. Each seed gives a different random layout, assigned box and exchange outcome (70% success). Kinematic robot, perfect knowledge, guide-size vehicles, and assumed lap and pit routes (QA05, QA06).",
        "",
        "| Condition | Preset | Speed | Completed | Parked | Finish median / max (s) | Under 165 s | Vehicle-contact-free runs | Laps with wall contact | Mean score-like |",
        "|---|---|---|---:|---:|---|---:|---:|---:|---:|",
    ]
    for r in results:
        s = r["summary"]
        lines.append(f"| {r['condition']} | {r['preset']} | {r['envelope']} | {s['completed']}/{s['runs']} | {s['parked']} | {s['finish_s_median']} / {s['finish_s_max']} | {s['under_165_s']} | {s['vehicle_contact_free_runs']} | {s['laps_with_wall_contact']} | {s['mean_score_like']} |")
    lines += [
        "",
        "## Reading this",
        "",
        "- **Empty field:** shows the route, follower and supervisor working end to end. The v9 simulator needed 151-162 s at 8 in/s; v10's arc laps finish well inside 165 s.",
        "- **With guide-size vehicles:** almost no run is contact-free, matching the lap study. The contact policy keeps the robot moving, so finishing, parking and the exchange are unaffected. Wall contacts come from lane transitions near walls when a vehicle blocks the inner lane, a real geometric squeeze.",
        "- **Score-like totals** are event arithmetic on simulated runs, not referee results.",
        "",
    ]
    OUT.mkdir(parents=True, exist_ok=True)
    evaluation = {"version": "0.10.0", "date": DATE, "status": "agent-run synthetic evaluation; not hardware, not legality",
                  "seeds": SEEDS, "results": results}
    files = {"evaluation.json": json.dumps(evaluation, indent=1) + "\n", "summary.md": "\n".join(lines)}
    for name, text in files.items():
        (OUT / name).write_text(text, encoding="utf-8")
    manifest = {"date": DATE, "status": evaluation["status"],
                "input_hashes": {f: hashlib.sha256((ROOT / f).read_bytes()).hexdigest() for f in INPUTS},
                "output_hashes": {n: hashlib.sha256(t.encode("utf-8")).hexdigest() for n, t in files.items()}}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("wrote", OUT.relative_to(ROOT), sum(r["summary"]["runs"] for r in results), "runs")


if __name__ == "__main__":
    main()
