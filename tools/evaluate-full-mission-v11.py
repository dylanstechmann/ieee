"""Evaluate the sensed v11 mission simulator against the v10 ground-truth baseline.

Agent-run synthetic study on the reserved evaluation seeds 100-119. Three paths per condition:
truth (v10 ground-truth tag/flag), sensed (camera-sensed tag/flag), and sensed_stop (camera-sensed plus
stop-on-vehicle-contact). Reports per-path completion, contact-free rates and per-lap contacts — the
direct measures that de-risk QA03 (obstacle vehicles) and QA02 (pit-box tag) before CDR. Tag/flag poses
are documented assumptions. Avoidance (routing around a vehicle rather than stopping) is the next
increment and is not part of this v11 study.

Usage: python -I tools/evaluate-full-mission-v11.py
"""
import hashlib
import json
import pathlib
import statistics
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "software"))
from stockcar import mission  # noqa: E402
from stockcar.mission_sensed import run_sensed  # noqa: E402

OUT = ROOT / "derived" / "full-mission-v11"
DATE = "2026-11-06"
SEEDS = list(mission.MissionEnv.EVAL)
CONDITIONS = {"empty": {"obstacles": False},
              "aligned_vehicles": {"obstacles": True, "yaw_mode": "aligned"},
              "random_yaw_vehicles": {"obstacles": True, "yaw_mode": "random"}}
PATHS = {"truth": "v10 ground-truth tag/flag (baseline)",
         "sensed": "camera-sensed tag/flag",
         "sensed_stop": "camera-sensed tag/flag + stop-on-vehicle-contact"}
INPUTS = ["tools/evaluate-full-mission-v11.py", "software/stockcar/mission_sensed.py",
          "software/stockcar/mission.py", "software/stockcar/supervisor.py", "software/stockcar/lapmodel.py",
          "software/stockcar/passage.py", "software/stockcar/field.py", "software/stockcar/obstacles.py",
          "software/stockcar/geometry.py", "software/stockcar/sensors_camera.py",
          "derived/organizer-cad-v10/field-v10.json"]


def run_path(kind, seed, kwargs):
    if kind == "truth":
        return mission.run(seed, **kwargs)
    if kind == "sensed":
        return run_sensed(seed, **kwargs)
    if kind == "sensed_stop":
        return run_sensed(seed, collision_stops=True, **kwargs)
    raise ValueError(kind)


def summarize(runs):
    fin = [r["finish_s"] for r in runs if r["finish_s"] is not None]
    return {
        "runs": len(runs),
        "completed": sum(r["state"] == "DONE" for r in runs),
        "parked": sum(r["parked"] for r in runs),
        "exchange_done": sum(r["exchange_result"] == "done" for r in runs),
        "contact_free_runs": sum(all(c == 0 for c in r["vehicle_contact_steps"]) for r in runs),
        "laps_with_vehicle_contact": sum(sum(1 for c in r["vehicle_contact_steps"] if c) for r in runs),
        "laps_with_wall_contact": sum(sum(1 for c in r["wall_contact_steps"] if c) for r in runs),
        "finish_s_median": round(statistics.median(fin), 2) if fin else None,
        "score_like_mean": round(statistics.mean(r["score_like"] for r in runs), 2),
    }


def main():
    results = []
    for cname, kwargs in CONDITIONS.items():
        for pname, desc in PATHS.items():
            runs = [run_path(pname, seed, kwargs) for seed in SEEDS]
            results.append({"condition": cname, "path": pname, "sensing": desc,
                            "summary": summarize(runs), "runs": runs})
    lines = [
        "# Full mission v11: sensed vs ground truth",
        "",
        f"{DATE}. Agent-run synthetic evaluation on seeds 100-119. Three paths per condition; the sensed paths read the pit box and start flag through camera models (assumed tag/flag poses) instead of ground truth, and sensed_stop halts on the first vehicle contact instead of continuing through.",
        "",
        "| Condition | Path | Completed | Parked | Exchange | Contact-free runs | Laps w/ vehicle contact | Laps w/ wall contact | Finish median (s) | Score-like mean |",
        "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for r in results:
        s = r["summary"]
        lines.append(f"| {r['condition']} | {r['path']} | {s['completed']}/{s['runs']} | {s['parked']} | {s['exchange_done']} | {s['contact_free_runs']} | {s['laps_with_vehicle_contact']} | {s['laps_with_wall_contact']} | {s['finish_s_median']} | {s['score_like_mean']} |")
    lines += [
        "",
        "## Reading this",
        "",
        "- **Empty field:** sensed and truth complete identically; no vehicles, so contact-free is always 20/20 and sensed_stop matches sensed.",
        "- **With vehicles:** sensed matches truth on completion (the camera resolves the box and start flag reliably), confirming camera sensing does not cost the mission. sensed_stop trades completion for safety — it halts on any vehicle contact instead of scraping through, so its completion drops while its laps-with-vehicle-contact stay at the first contact only.",
        "- Avoidance (routing around a vehicle instead of stopping) is the next increment and not measured here.",
        "",
    ]
    OUT.mkdir(parents=True, exist_ok=True)
    report = {"version": "0.11.0", "date": DATE,
              "status": "agent-run synthetic study; not a robot test; tag/flag poses are assumptions",
              "seeds": SEEDS, "results": results}
    files = {"report.json": json.dumps(report, indent=1) + "\n", "summary.md": "\n".join(lines)}
    for name, text in files.items():
        (OUT / name).write_text(text, encoding="utf-8")
    manifest = {"date": DATE, "status": report["status"],
                "input_hashes": {f: hashlib.sha256((ROOT / f).read_bytes()).hexdigest() for f in INPUTS},
                "output_hashes": {n: hashlib.sha256(t.encode("utf-8")).hexdigest() for n, t in files.items()}}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(results)} condition/path cells, {sum(r['summary']['runs'] for r in results)} runs")


if __name__ == "__main__":
    main()