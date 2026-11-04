"""Maneuver v10: speed profiles, the firmware following them on the corrected plant, and a route library.

Agent-run synthetic study for the owner's hobby/learning project. Four parts:
- timing: lap and mission times from time-optimal speed profiles under each planning envelope;
- tracking: the firmware loop (Runner, DriveShaper, wheel PI) following a lap on the corrected drivetrain
  model at every envelope condition, then with the EKF in the loop at a range of speed caps;
- passing: which line to take past vehicles. Every lane assignment is driven at several wall margins, and
  each driven path is checked against random placements of vehicles of several sizes;
- library: route tables for every configuration and pit box, for the robot.
The plant has wheel slip but no sideways skid, parameters are placeholders and the map is perfect, so this
compares options; it does not predict on-field results. Vehicle lanes are assumed known.

Usage: python -I tools/evaluate-maneuver-v10.py
"""
import hashlib
import json
import math
import pathlib
import random
import statistics
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path[:0] = [str(ROOT / "software"), str(ROOT / "firmware"), str(ROOT / "firmware" / "pico2")]
from host_tests.route_follow import follow  # noqa: E402
from stockcar import lapmodel, mission, profile, routes  # noqa: E402
from stockcar.estimator import Estimator  # noqa: E402
from stockcar.field import Field  # noqa: E402
from stockcar.geometry import rectangle, separation  # noqa: E402
from stockcar.obstacles import GUIDE_PLUSH, center_range, footprint  # noqa: E402
from stockcar.passage import free_center_intervals  # noqa: E402
from stockcar.sensors import Band, SensorSuite  # noqa: E402

OUT = ROOT / "derived" / "maneuver-v10"
DATE = "2026-11-04"
STATUS = "agent-run synthetic study; not a robot test"
ENVELOPES = ("conservative", "nominal", "aggressive")
VOLTS, FRICTIONS, MASSES = (10.5, 11.1, 12.0), (0.15, 0.25, 0.35), (3.0, 4.0, 5.0)
WEAK, TYPICAL, STRONG = (10.5, 0.15, 5.0), (11.1, 0.25, 4.0), (12.0, 0.35, 3.0)
SPEED_CAPS = (8.0, 10.0, 12.0, 14.0, 16.0, None)
SEEDS = (100, 101, 102)
MARGINS = (1.25, 1.5, 2.0, 2.5, 3.0)
SIZES = (1.0, 0.8, 0.6, 0.4)
PLACEMENTS = 16
WALL_POINTS, VEHICLE_POINTS = 15, 25     # per lap, V3 score table
LIBRARY_MARGIN = 3.0                     # the closest margin with no wall contact in the driven laps
LIBRARY_EVERY = 2                        # keep every second point: 1 in spacing
ESTIMATOR_DT_S = 0.05
WAIT_S = 5.0
INPUTS = ["tools/evaluate-maneuver-v10.py", "software/stockcar/profile.py", "software/stockcar/routes.py", "software/stockcar/tracker.py",
          "software/stockcar/mission.py", "software/stockcar/dynamics.py", "software/stockcar/envelope.py", "software/stockcar/sensors.py",
          "software/stockcar/estimator.py", "software/stockcar/supervisor.py", "software/stockcar/passage.py", "software/stockcar/field.py",
          "software/stockcar/obstacles.py", "software/stockcar/geometry.py", "software/stockcar/lapmodel.py",
          "software/stockcar/tests/fixtures/dynamics-golden-v10.json", "firmware/host_tests/route_follow.py", "firmware/host_tests/plant_hal.py",
          "firmware/host_tests/fakes.py", "firmware/pico2/runner.py", "firmware/pico2/drive.py", "firmware/pico2/motor.py", "firmware/pico2/safety.py",
          "firmware/pico2/telemetry.py", "firmware/pico2/config.py", "derived/envelope-v10/report.json", "derived/organizer-cad-v10/field-v10.json"]


def r3(value):
    return round(value, 3)


def clearance(path, barriers):
    return min(separation(rectangle(x, y, h, 10.0, 10.0), b) for x, y, h in path for b in barriers)


def table_clearance(table, barriers):
    return clearance(list(zip(table["x"], table["y"], table["heading"])), barriers)


def estimator_for(field, barriers, table, seed, vehicles=()):
    """The EKF on simulated sensors, after the 5 s start wait, as the tracker's source of pose."""
    start = (table["x"][0], table["y"][0], table["heading"][0])
    suite = SensorSuite(random.Random(seed), field, barriers, list(vehicles))
    est = Estimator(start, Band(field), barriers)

    def estimate(x, y, heading, v, rate):
        meas = suite.measure((x, y, heading), v, rate, ESTIMATOR_DT_S)
        est.predict(meas["encoder_delta"], meas["gyro"], ESTIMATOR_DT_S)
        est.correct(meas)
        return est.pose()

    for _ in range(round(WAIT_S / ESTIMATOR_DT_S)):
        estimate(*start, 0.0, 0.0)
    return estimate


def mission_routes(field, box):
    sim = mission.MissionSim("aggressive", "nominal", field=field)
    sim.build_routes(mission.Layout([], box, True))
    return sim.routes


def timing(field, planning, half_track):
    rows = []
    for name in ENVELOPES:
        lim = profile.limits(planning[name], half_track)
        lap = profile.build(routes.lap(routes.lane_lines()), lim)
        missions = []
        for box in (1, 2, 3):
            r = mission_routes(field, box)
            legs = sum(routes.pit_table(r[k].pts, planning[name], half_track)["time_s"] for k in ("ENTER", "TO_PIT", "EXIT_PIT", "PARK"))
            missions.append(legs + 3 * lap["time_s"] + lapmodel.EXCHANGE_S + 2 * planning[name]["spin_90_s"])
        rows.append({"envelope": name, "lap_s": r3(lap["time_s"]), "top_speed_in_s": r3(max(lap["speed"])), "uturn_speed_in_s": r3(min(lap["speed"][20:-20])),
                     "mission_s_low": r3(min(missions)), "mission_s_high": r3(max(missions))})
    return rows


def tracking_grid(barriers, planning, half_track):
    rows = []
    for name in ENVELOPES:
        table = profile.build(routes.lap(routes.lane_lines()), profile.limits(planning[name], half_track))
        for volts in VOLTS:
            for friction in FRICTIONS:
                for mass in MASSES:
                    run = follow(table, (volts, friction, mass), planning[name])
                    rows.append({"envelope": name, "source_v": volts, "friction": friction, "mass_kg": mass, "finished": run["done"], "planned_s": r3(table["time_s"]), "time_s": r3(run["time_s"]),
                                 "rms_cross_track_in": r3(run["rms_cross_track_in"]), "max_cross_track_in": r3(run["max_cross_track_in"]),
                                 "max_heading_error_deg": r3(math.degrees(run["max_heading_error_rad"])), "max_slip_in_s": r3(run["max_slip_in_s"]),
                                 "peak_supply_a": r3(run["peak_supply_a"]), "clearance_in": r3(clearance(run["path"], barriers))})
    return rows


def speed_sweep(field, barriers, planning, half_track):
    rows = []
    for cap in SPEED_CAPS:
        table = profile.build(routes.lap(routes.lane_lines()), profile.limits(planning["nominal"], half_track, cap))
        for label, condition in (("typical", TYPICAL), ("weak", WEAK)):
            runs = [follow(table, condition, planning["nominal"], estimator=estimator_for(field, barriers, table, seed)) for seed in SEEDS]
            rows.append({"cap_in_s": cap, "plant": label, "finished": sum(r["done"] for r in runs), "runs": len(runs), "lap_s": r3(statistics.mean(r["time_s"] for r in runs)),
                         "max_cross_track_in": r3(max(r["max_cross_track_in"] for r in runs)), "clearance_in": r3(min(clearance(r["path"], barriers) for r in runs))})
    return rows


def pit_legs(field, barriers, planning, half_track):
    """Each pit leg as the simulator draws it, then rounded and slowed: on every plant, and with the EKF steering."""
    rows = []
    envelope = planning["conservative"]
    for box in (1, 2, 3):
        r = mission_routes(field, box)
        for leg in ("ENTER", "TO_PIT", "EXIT_PIT") if box == 1 else ("TO_PIT", "EXIT_PIT"):
            sharp = profile.build(r[leg].pts, profile.limits(envelope, half_track))
            runs = [follow(sharp, TYPICAL, envelope)]
            rounded = routes.pit_table(r[leg].pts, envelope, half_track)
            driven = [follow(rounded, c, envelope) for c in (WEAK, TYPICAL, STRONG)]
            driven += [follow(rounded, TYPICAL, envelope, estimator=estimator_for(field, barriers, rounded, seed)) for seed in SEEDS]
            for form, table, group in (("sharp corners, full speed", sharp, runs), ("rounded, 8 in/s", rounded, driven)):
                rows.append({"box": box, "leg": leg, "form": form, "runs": len(group), "finished": sum(x["done"] for x in group), "planned_s": r3(table["time_s"]),
                             "time_s": r3(max(x["time_s"] for x in group)), "max_cross_track_in": r3(max(x["max_cross_track_in"] for x in group)),
                             "clearance_in": r3(min(clearance(x["path"], barriers) for x in group))})
    return rows


def placements(field, config, scale, rng):
    """Random vehicles of one size in a configuration's lanes, drawn as stockcar.mission draws them."""
    shape = {**GUIDE_PLUSH, "length_in": GUIDE_PLUSH["length_in"] * scale, "width_in": GUIDE_PLUSH["width_in"] * scale}
    quads = field.quadrants("offsets")
    layouts = []
    for _ in range(PLACEMENTS):
        polys = []
        for quadrant in routes.QUADRANTS:
            lane = config[quadrant]
            if lane is None:
                continue
            side = "low" if quadrant.startswith("low") else "high"
            allowed = None
            while allowed is None:
                yaw = rng.choice((0.0, math.pi / 2))
                allowed = center_range(quads[quadrant], side, lane, shape, yaw)
            polys.append((side, footprint(shape, rng.uniform(*allowed[0]), rng.uniform(*allowed[1]), yaw)))
        layouts.append(polys)
    return layouts


def touches(robots, polys):
    for _, poly in polys:
        x0, x1 = min(p[0] for p in poly) - 7.1, max(p[0] for p in poly) + 7.1
        y0, y1 = min(p[1] for p in poly) - 7.1, max(p[1] for p in poly) + 7.1
        for x, y, robot in robots:
            if x0 <= x <= x1 and y0 <= y <= y1 and separation(robot, poly) < 0:
                return True
    return False


def gap_exists(field, polys):
    return all(free_center_intervals(field.corridor(side), poly) for side, poly in polys)


def passing(field, barriers, planning, half_track):
    lim = profile.limits(planning["conservative"], half_track)
    policies = [("lanes", None)] + [(f"far side, {m} in", m) for m in MARGINS]
    tallies = {(p, s): {"laps": 0, "clear_of_vehicles": 0, "clear_of_walls": 0, "clear_of_both": 0} for p, _ in policies for s in SIZES}
    bound = {s: [0, 0] for s in SIZES}
    drives = {p: {"laps": 0, "unfinished": 0, "wall_contact_laps": 0, "least_clearance_in": math.inf, "planned_clearance_in": math.inf, "lap_s": []} for p, _ in policies}
    for index, config in enumerate(routes.configurations()):
        rng = random.Random(1000 + index)
        layouts = {s: placements(field, config, s, rng) for s in SIZES}
        for s in SIZES:
            bound[s][0] += sum(gap_exists(field, polys) for polys in layouts[s])
            bound[s][1] += len(layouts[s])
        scene = [poly for _, poly in layouts[1.0][0]]
        for label, margin in policies:
            lines = routes.lane_lines() if margin is None else routes.lines_for(field, config, margin)
            table = profile.build(routes.lap(lines), lim)
            d = drives[label]
            d["planned_clearance_in"] = min(d["planned_clearance_in"], table_clearance(table, barriers))
            for seed in SEEDS:
                run = follow(table, TYPICAL, planning["conservative"], estimator=estimator_for(field, barriers, table, seed, scene))
                gap = clearance(run["path"], barriers)
                d["laps"] += 1
                d["unfinished"] += not run["done"]
                d["wall_contact_laps"] += gap < 0
                d["least_clearance_in"] = min(d["least_clearance_in"], gap)
                d["lap_s"].append(run["time_s"])
                robots = [(x, y, rectangle(x, y, h, 10.0, 10.0)) for x, y, h in run["path"][::2]]
                for s in SIZES:
                    t = tallies[label, s]
                    for polys in layouts[s]:
                        clear = not touches(robots, polys)
                        t["laps"] += 1
                        t["clear_of_vehicles"] += clear
                        t["clear_of_walls"] += gap >= 0
                        t["clear_of_both"] += clear and gap >= 0
    rows = []
    for (label, scale), t in tallies.items():
        vehicles, walls = t["clear_of_vehicles"] / t["laps"], t["clear_of_walls"] / t["laps"]
        rows.append({"policy": label, "size_scale": scale, "laps": t["laps"], "clear_of_vehicles": r3(vehicles), "clear_of_walls": r3(walls), "clear_of_both": r3(t["clear_of_both"] / t["laps"]),
                     "points_per_lap": r3(WALL_POINTS * walls + VEHICLE_POINTS * vehicles)})
    driven = [{"policy": p, **{k: v for k, v in d.items() if k != "lap_s"}, "least_clearance_in": r3(d["least_clearance_in"]), "planned_clearance_in": r3(d["planned_clearance_in"]),
               "lap_s_median": r3(statistics.median(d["lap_s"]))} for p, d in drives.items()]
    gaps = [{"size_scale": s, "layouts": n, "every_vehicle_has_a_gap": r3(k / n)} for s, (k, n) in bound.items()]
    return {"rows": rows, "driven": driven, "gaps": gaps}


def compact(table):
    keep = slice(None, None, LIBRARY_EVERY)
    ends = {k: table[k][-1] for k in ("x", "y", "heading", "curvature", "speed")}
    out = {"step_in": round(table["step_in"] * LIBRARY_EVERY, 6), "time_s": r3(table["time_s"])}
    for key, digits in (("x", 2), ("y", 2), ("heading", 3), ("curvature", 4), ("speed", 2)):
        out[key] = [round(v, digits) for v in table[key][keep]]
        if (len(table["x"]) - 1) % LIBRARY_EVERY:
            out[key].append(round(ends[key], digits))
    return out


def library(field, planning, half_track):
    lim = profile.limits(planning["conservative"], half_track)
    laps = {"lanes": compact(profile.build(routes.lap(routes.lane_lines()), lim))}
    lines = {}
    for config in routes.configurations():
        name = routes.key(config)
        lines[name] = {q: round(y, 3) for q, y in routes.lines_for(field, config, LIBRARY_MARGIN).items()}
        laps[name] = compact(profile.build(routes.lap(lines[name]), lim))
    pit = {}
    for box in (1, 2, 3):
        r = mission_routes(field, box)
        pit[str(box)] = {leg: compact(routes.pit_table(r[leg].pts, planning["conservative"], half_track)) for leg in ("TO_PIT", "EXIT_PIT")}
    return {"date": DATE, "status": STATUS, "envelope": "conservative", "margin_in": LIBRARY_MARGIN, "units": "inches, radians, seconds", "key": "low_west, low_east, high_west, high_east: o outer, i inner, - empty",
            "lines": lines, "enter": compact(routes.pit_table(mission_routes(field, 1)["ENTER"].pts, planning["conservative"], half_track)), "laps": laps, "pit": pit}


def main():
    envelope = json.loads((ROOT / "derived" / "envelope-v10" / "report.json").read_text(encoding="utf-8"))
    planning, half_track = envelope["planning_envelopes"], envelope["half_track_in"]
    field = Field()
    barriers = field.barriers()
    times = timing(field, planning, half_track)
    grid = tracking_grid(barriers, planning, half_track)
    sweep = speed_sweep(field, barriers, planning, half_track)
    pit = pit_legs(field, barriers, planning, half_track)
    pass_study = passing(field, barriers, planning, half_track)
    routes_out = library(field, planning, half_track)
    per_envelope = []
    for name in ENVELOPES:
        rows = [r for r in grid if r["envelope"] == name]
        per_envelope.append({"envelope": name, "conditions": len(rows), "finished": sum(r["finished"] for r in rows), "max_cross_track_in": max(r["max_cross_track_in"] for r in rows),
                             "max_heading_error_deg": max(r["max_heading_error_deg"] for r in rows), "least_clearance_in": min(r["clearance_in"] for r in rows),
                             "max_slip_in_s": max(r["max_slip_in_s"] for r in rows), "peak_supply_a": max(r["peak_supply_a"] for r in rows)})
    report = {"date": DATE, "status": STATUS, "scoring": {"wall_points_per_lap": WALL_POINTS, "vehicle_points_per_lap": VEHICLE_POINTS}, "timing": times, "tracking": per_envelope, "tracking_grid": grid,
              "speed_sweep": sweep, "pit_legs": pit, "passing": pass_study}
    lines = ["# Maneuver v10: summary", "", f"{DATE}. Agent-run synthetic study. The plant has wheel slip but no sideways skid, parameters are placeholders, the map is perfect and vehicle lanes are assumed known.", "",
             "## Timing", "", "| Envelope | Lap (s) | Top speed (in/s) | U-turn speed (in/s) | Clean mission (s) |", "|---|---:|---:|---:|---:|"]
    lines += [f"| {r['envelope']} | {r['lap_s']} | {r['top_speed_in_s']} | {r['uturn_speed_in_s']} | {r['mission_s_low']}–{r['mission_s_high']} |" for r in times]
    lines += ["", "## Tracking: firmware loop on the plant, all 27 conditions", "", "| Envelope | Finished | Worst cross-track (in) | Worst heading error (deg) | Least clearance (in) | Worst slip (in/s) | Peak supply (A) |", "|---|---:|---:|---:|---:|---:|---:|"]
    lines += [f"| {r['envelope']} | {r['finished']}/{r['conditions']} | {r['max_cross_track_in']} | {r['max_heading_error_deg']} | {r['least_clearance_in']} | {r['max_slip_in_s']} | {r['peak_supply_a']} |" for r in per_envelope]
    lines += ["", "## Speed cap, EKF in the loop", "", "| Cap (in/s) | Plant | Finished | Lap (s) | Worst cross-track (in) | Least clearance (in) |", "|---:|---|---:|---:|---:|---:|"]
    lines += [f"| {r['cap_in_s'] or 'none'} | {r['plant']} | {r['finished']}/{r['runs']} | {r['lap_s']} | {r['max_cross_track_in']} | {r['clearance_in']} |" for r in sweep]
    lines += ["", "## Pit legs, conservative envelope", "", "Rounded legs ran on the weak, typical and strong plants and with the EKF steering on three seeds; the table gives the worst of those runs.", "",
              "| Box | Leg | Form | Finished | Slowest time (s) | Worst cross-track (in) | Least driven clearance (in) |", "|---:|---|---|---:|---:|---:|---:|"]
    lines += [f"| {r['box']} | {r['leg']} | {r['form']} | {r['finished']}/{r['runs']} | {r['time_s']} | {r['max_cross_track_in']} | {r['clearance_in']} |" for r in pit]
    lines += ["", "## Passing: which line, driven with the EKF in the loop", "", "| Policy | Laps | Unfinished | Laps with wall contact | Least driven clearance (in) | Planned clearance (in) | Median lap (s) |", "|---|---:|---:|---:|---:|---:|---:|"]
    lines += [f"| {r['policy']} | {r['laps']} | {r['unfinished']} | {r['wall_contact_laps']} | {r['least_clearance_in']} | {r['planned_clearance_in']} | {r['lap_s_median']} |" for r in pass_study["driven"]]
    lines += ["", f"Each driven lap is checked against {PLACEMENTS} random placements per configuration. Points per lap are {WALL_POINTS} x clear of walls + {VEHICLE_POINTS} x clear of vehicles.", "",
              "| Vehicle size (share of guide size) | Policy | Clear of vehicles | Clear of walls | Clear of both | Points per lap |", "|---:|---|---:|---:|---:|---:|"]
    lines += [f"| {r['size_scale']} | {r['policy']} | {r['clear_of_vehicles']} | {r['clear_of_walls']} | {r['clear_of_both']} | {r['points_per_lap']} |" for r in sorted(pass_study["rows"], key=lambda r: -r["size_scale"])]
    lines += ["", "Upper bound with perfect knowledge: the share of layouts where every vehicle leaves a 10.5 in gap beside it.", "", "| Vehicle size | Layouts | Every vehicle has a gap |", "|---:|---:|---:|"]
    lines += [f"| {r['size_scale']} | {r['layouts']} | {r['every_vehicle_has_a_gap']} |" for r in pass_study["gaps"]]
    lines.append("")
    OUT.mkdir(parents=True, exist_ok=True)
    files = {"report.json": json.dumps(report, indent=1) + "\n", "route-library.json": json.dumps(routes_out, separators=(",", ":")) + "\n", "summary.md": "\n".join(lines)}
    for name, text in files.items():
        (OUT / name).write_text(text, encoding="utf-8")
    manifest = {"date": DATE, "status": STATUS, "input_hashes": {f: hashlib.sha256((ROOT / f).read_bytes()).hexdigest() for f in INPUTS},
                "output_hashes": {n: hashlib.sha256(t.encode("utf-8")).hexdigest() for n, t in files.items()}}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("wrote", OUT.relative_to(ROOT))


if __name__ == "__main__":
    main()
