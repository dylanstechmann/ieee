"""Full mission v10: whole missions on the simulated robot, from the packed routes the board would use.

Agent-run synthetic study for the owner's hobby/learning project. Each mission chains the supervisor,
mission driver, route files, path tracker, EKF on simulated sensors and the firmware loop on the corrected
drivetrain model, including the spin in the pit box. Four sets:
- clean: every box on the weak, typical and strong plants, on the empty field;
- vehicles: the 20 evaluation layouts with guide-size vehicles, on the plain lap, which ignores them;
- library: every library lap in a whole mission, on the empty field;
- paths: the supervisor's other branches (presets, a failing exchange, the pit after lap 1).
The camera, start flag and lap line are not modeled, so the tag, flag and lap crossing are given. The plant
has no sideways skid, and a vehicle does not resist or move when touched. Not a robot test.

Usage: python -I tools/evaluate-full-mission-v10.py
"""
import hashlib
import json
import pathlib
import random
import statistics
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path[:0] = [str(ROOT / "software"), str(ROOT / "firmware"), str(ROOT / "firmware" / "pico2"), str(ROOT / "tools")]
import build_pico_bundle  # noqa: E402
from host_tests import full_mission  # noqa: E402
from stockcar import mission, routes  # noqa: E402
from stockcar.field import Field  # noqa: E402

OUT = ROOT / "derived" / "full-mission-v10"
DATE = "2026-11-04"
STATUS = "agent-run synthetic study; not a robot test"
PLANTS = {"weak": (10.5, 0.15, 5.0), "typical": (11.1, 0.25, 4.0), "strong": (12.0, 0.35, 3.0)}
CLEAN_SEEDS = (100, 101, 102)
LAYOUT_SEEDS = range(100, 120)
BRANCHES = {"safe preset": {"preset": "safe"}, "drive-only preset": {"preset": "drive_only"}, "exchange fails": {"exchange_works": False}, "pit after lap 1": {"pit_after_lap": 1}}
INPUTS = ["tools/evaluate-full-mission-v10.py", "tools/build_pico_bundle.py", "firmware/host_tests/full_mission.py", "firmware/host_tests/route_follow.py", "firmware/host_tests/plant_hal.py",
          "firmware/host_tests/fakes.py", "firmware/pico2/mission_driver.py", "firmware/pico2/route_store.py", "firmware/pico2/runner.py", "firmware/pico2/drive.py", "firmware/pico2/motor.py",
          "firmware/pico2/safety.py", "firmware/pico2/telemetry.py", "firmware/pico2/config.py", "software/stockcar/tracker.py", "software/stockcar/supervisor.py", "software/stockcar/estimator.py",
          "software/stockcar/sensors.py", "software/stockcar/dynamics.py", "software/stockcar/envelope.py", "software/stockcar/mission.py", "software/stockcar/routes.py", "software/stockcar/lapmodel.py",
          "software/stockcar/field.py", "software/stockcar/geometry.py", "software/stockcar/obstacles.py", "software/stockcar/passage.py", "software/stockcar/tests/fixtures/dynamics-golden-v10.json",
          "derived/maneuver-v10/route-library.json", "derived/envelope-v10/report.json", "derived/organizer-cad-v10/field-v10.json"]


def summarize(name, rows):
    finished = [r for r in rows if r["finish_s"] is not None]
    return {"set": name, "missions": len(rows), "done": sum(r["state"] == "DONE" for r in rows), "parked": sum(r["parked"] for r in rows), "safety_stops": sum(r["safety_stopped"] for r in rows),
            "recoveries": sum(r["recoveries"] for r in rows), "laps_with_wall_contact": sum(r["wall_contact_laps"] for r in rows), "laps_with_vehicle_contact": sum(r["vehicle_contact_laps"] for r in rows),
            "least_clearance_in": min(r["least_clearance_in"] for r in rows), "worst_position_error_in": max(r["max_position_error_in"] for r in rows),
            "median_finish_s": round(statistics.median(r["finish_s"] for r in finished), 2) if finished else None, "slowest_mission_s": max(r["mission_s"] for r in rows),
            "mean_score_like": round(statistics.mean(r["score_like"] for r in rows), 2)}


def main():
    envelope = json.loads((ROOT / "derived" / "envelope-v10" / "report.json").read_text(encoding="utf-8"))["planning_envelopes"]["conservative"]
    field = Field()
    sets = {}
    with tempfile.TemporaryDirectory() as folder:
        build_pico_bundle.write_routes(folder)

        def drive(lap, box, plant, seed, **kwargs):
            return full_mission.run(folder, lap, box, PLANTS[plant], envelope, seed, **kwargs)

        sets["clean"] = [{"plant": p, "seed": s, **drive("lanes", b, p, s)} for b in (1, 2, 3) for p in PLANTS for s in CLEAN_SEEDS]
        vehicles = []
        for seed in LAYOUT_SEEDS:
            layout = mission.random_layout(random.Random(seed), field)
            vehicles.append({"seed": seed, **drive("lanes", layout.assigned_box, "typical", seed, vehicles=layout.polys, exchange_works=layout.exchange_success)})
        sets["vehicles"] = vehicles
        sets["library"] = [{"lap": routes.key(c), "seed": 100 + i, **drive(routes.key(c), 1 + i % 3, "typical", 100 + i)} for i, c in enumerate(routes.configurations())]
        sets["paths"] = [{"branch": name, **drive("lanes", box, "typical", 100, **kwargs)} for name, kwargs in BRANCHES.items() for box in (1, 2, 3)]
    summaries = [summarize(name, rows) for name, rows in sets.items()]
    branches = [summarize(name, [r for r in sets["paths"] if r["branch"] == name]) for name in BRANCHES]
    report = {"date": DATE, "status": STATUS, "summaries": summaries, "branches": branches, "missions": sets}
    head = "| Set | Missions | Done | Parked | Laps with wall contact | Laps with vehicle contact | Least clearance (in) | Worst pose error (in) | Median finish (s) | Mean score-like |"
    rule = "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|"

    def line(s):
        return f"| {s['set']} | {s['missions']} | {s['done']} | {s['parked']} | {s['laps_with_wall_contact']} | {s['laps_with_vehicle_contact']} | {s['least_clearance_in']} | {s['worst_position_error_in']} | {s['median_finish_s']} | {s['mean_score_like']} |"

    lines = ["# Full mission v10: summary", "", f"{DATE}. Agent-run synthetic study, conservative envelope. The camera, start flag and lap line are not modeled, the plant has no sideways skid, and a touched vehicle neither resists nor moves.", "",
             head, rule] + [line(s) for s in summaries] + ["", "## Supervisor branches", "", head, rule] + [line(s) for s in branches] + [""]
    OUT.mkdir(parents=True, exist_ok=True)
    files = {"report.json": json.dumps(report, indent=1) + "\n", "summary.md": "\n".join(lines)}
    for name, text in files.items():
        (OUT / name).write_text(text, encoding="utf-8")
    manifest = {"date": DATE, "status": STATUS, "input_hashes": {f: hashlib.sha256((ROOT / f).read_bytes()).hexdigest() for f in INPUTS},
                "output_hashes": {n: hashlib.sha256(t.encode("utf-8")).hexdigest() for n, t in files.items()}}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("wrote", OUT.relative_to(ROOT))


if __name__ == "__main__":
    main()
