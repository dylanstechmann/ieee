"""Evaluate the avoiding-mission simulator across lane sources, footprints, yaw and pose modes.

Agent-run synthetic study on the reserved evaluation seeds 100-119. Three lane sources — `v10_blend`
(fixed 12 in blends, truth), `oracle` (vehicle-timed `lane_profile` blends, truth) and `sensed`
(vehicle-timed blends from the range-ring map) — are swept over footprints 10/8/6 in, aligned and
random vehicle yaw, and control on the true pose or the EKF estimate. Reports contact-free laps by lap
number, contact-free runs, wall contacts, completions, infeasible vehicles, attribution by phase, and
(for `sensed`) detection misses and false positives. Lap 1 is a discovery lap for `sensed`, so
lap-level numbers carry the result, not run-level rates.

Usage: uv run --no-project --python 3.12 python -B -I tools/evaluate-avoid-v12.py
"""
import collections
import hashlib
import json
import pathlib
import random
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "software"))
from stockcar import mission  # noqa: E402
from stockcar.contact_attribution import attribute  # noqa: E402
from stockcar.mission_avoid import AvoidingMissionSim  # noqa: E402

OUT = ROOT / "derived" / "avoid-v12"
DATE = "2026-11-06"
SEEDS = list(mission.MissionEnv.EVAL)
LANE_SOURCES = ["v10_blend", "oracle", "sensed"]
YAW_MODES = {"aligned": "aligned", "random": "random"}
FOOTPRINTS = [10.0, 8.0, 6.0]
POSE_MODES = {"true_pose": False, "ekf_pose": True}
MATCH_IN = 6.0            # coarse sensed-vs-truth match radius (sees only the near face)
INPUTS = ["tools/evaluate-avoid-v12.py", "software/stockcar/mission_avoid.py",
          "software/stockcar/mission_sensed.py", "software/stockcar/mission.py",
          "software/stockcar/supervisor.py", "software/stockcar/lapmodel.py",
          "software/stockcar/passage.py", "software/stockcar/field.py",
          "software/stockcar/obstacles.py", "software/stockcar/geometry.py",
          "software/stockcar/sensors_camera.py", "software/stockcar/sensors.py",
          "software/stockcar/estimator.py", "software/stockcar/avoidance.py",
          "software/stockcar/collision.py", "software/stockcar/contact_attribution.py",
          "software/stockcar/lane_profile.py", "software/stockcar/sensors_vehicle.py",
          "derived/organizer-cad-v10/field-v10.json"]


def run_one(seed, lane_source, footprint_in, yaw_mode, sensing):
    rng = random.Random(seed)
    sim = AvoidingMissionSim(sensing=sensing, footprint_in=footprint_in, lane_source=lane_source)
    layout = mission.random_layout(rng, sim.field, reading="offsets", yaw_mode=yaw_mode, obstacles=True)
    sim.reset(layout, sensor_seed=seed)
    phase_counts = collections.Counter()
    for _ in range(4000):
        _, _, done, info = sim.step()
        for rec in attribute(sim, layout):
            phase_counts[rec["phase"]] += 1
        if done:
            break
    misses = false_positives = 0
    if lane_source == "sensed":
        truth = [(v["cx"], v["cy"]) for v in layout.vehicles]
        sensed = [(v["cx"], v["cy"]) for v in sim.vmap.vehicles()]
        misses = sum(1 for cx, cy in truth
                     if not any((cx - sx) ** 2 + (cy - sy) ** 2 < MATCH_IN ** 2 for sx, sy in sensed))
        false_positives = sum(1 for sx, sy in sensed
                              if not any((cx - sx) ** 2 + (cy - sy) ** 2 < MATCH_IN ** 2 for cx, cy in truth))
    return info, phase_counts, misses, false_positives


def cell(lane_source, yaw_mode, footprint_in, pose_mode, sensing):
    runs = [run_one(seed, lane_source, footprint_in, yaw_mode, sensing) for seed in SEEDS]
    infos = [r[0] for r in runs]
    phase = collections.Counter()
    misses = fps = 0
    for _, pc, m, f in runs:
        phase.update(pc)
        misses += m
        fps += f
    contact_free_laps = [0, 0, 0]
    laps_with_vehicle = laps_with_wall = 0
    contact_free_runs = completed = 0
    infeasible = 0.0
    for info in infos:
        completed += info["state"] == "DONE"
        vc = info["vehicle_contact_steps"]
        wc = info["wall_contact_steps"]
        contact_free_runs += all(c == 0 for c in vc)
        laps_with_vehicle += sum(1 for c in vc if c)
        laps_with_wall += sum(1 for c in wc if c)
        for lap in range(3):
            contact_free_laps[lap] += vc[lap] == 0
        infeasible += info["infeasible_vehicles"]
    return {
        "lane_source": lane_source, "yaw_mode": yaw_mode, "footprint_in": footprint_in,
        "pose_mode": pose_mode, "runs": len(runs), "completed": completed,
        "contact_free_runs": contact_free_runs, "contact_free_laps": contact_free_laps,
        "laps_with_vehicle_contact": laps_with_vehicle, "laps_with_wall_contact": laps_with_wall,
        "mean_infeasible_vehicles": round(infeasible / len(runs), 2),
        "attribution": dict(sorted(phase.items())),
        "misses": misses, "false_positives": fps,
    }


def main():
    results = []
    for lane_source in LANE_SOURCES:
        for yaw_key, yaw_mode in YAW_MODES.items():
            for footprint_in in FOOTPRINTS:
                for pose_mode, sensing in POSE_MODES.items():
                    results.append(cell(lane_source, yaw_key, footprint_in, pose_mode, sensing))
    OUT.mkdir(parents=True, exist_ok=True)
    report = {"version": "0.12.0", "date": DATE,
              "status": "agent-run synthetic study; poses/footprints/blends and vehicle size are assumptions",
              "seeds": SEEDS, "results": results}
    summary = ["# Avoiding v12: fixed blends vs vehicle-timed blends vs sensed", "",
               f"{DATE}. Agent-run synthetic study (seeds 100-119). `v10_blend` keeps the pinned 12 in "
               "entry/exit blends; `oracle` and `sensed` reach each lane before the vehicle's padded near "
               "edge (`lane_profile`), the latter from the range-ring map. Lap 1 is a discovery lap for "
               "`sensed`.", "",
               "| lane_source | yaw | footprint | pose | completed | contact-free runs | contact-free laps (1/2/3) | laps w/ vehicle | laps w/ wall | mean infeasible |",
               "|---|---|---|---:|---:|---:|---:|---:|---:|---:|"]
    for r in results:
        cl = "/".join(str(n) for n in r["contact_free_laps"])
        summary.append(f"| {r['lane_source']} | {r['yaw_mode']} | {r['footprint_in']} | {r['pose_mode']} | {r['completed']}/{r['runs']} | {r['contact_free_runs']} | {cl} | {r['laps_with_vehicle_contact']} | {r['laps_with_wall_contact']} | {r['mean_infeasible_vehicles']} |")
    files = {"report.json": json.dumps(report, indent=1) + "\n", "summary.md": "\n".join(summary) + "\n"}
    for name, text in files.items():
        (OUT / name).write_text(text, encoding="utf-8")
    manifest = {"date": DATE, "status": report["status"],
                "input_hashes": {f: hashlib.sha256((ROOT / f).read_bytes()).hexdigest() for f in INPUTS},
                "output_hashes": {n: hashlib.sha256(t.encode("utf-8")).hexdigest() for n, t in files.items()}}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(results)} cells, {sum(r['runs'] for r in results)} runs")


if __name__ == "__main__":
    main()