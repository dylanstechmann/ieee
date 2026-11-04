"""Envelope v10: speed, acceleration, stopping and spin limits from the corrected dynamics model.

Agent-run synthetic study for the owner's hobby/learning project. It:
- compares the sealed v5 model with the corrected v10 variant on the six dynamics-v9 scenarios;
- runs launch, stop and spin maneuvers over supply voltage, friction and mass;
- derives planning envelopes and passes them to the lap model;
- replays commanded v10 mission traces through the plant for slip, current and energy.
Friction, mass, inertia, resistance and gains are placeholders until E02 and E03 replace them.

Usage: python -I tools/envelope-v10.py
"""
import hashlib
import json
import math
import pathlib
import random
import statistics
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "software"))
from stockcar import dynamics as D  # noqa: E402
from stockcar import envelope as E  # noqa: E402
from stockcar import lapmodel as L  # noqa: E402
from stockcar import mission  # noqa: E402

OUT = ROOT / "derived" / "envelope-v10"
FIXTURE = ROOT / "software" / "stockcar" / "tests" / "fixtures" / "dynamics-golden-v10.json"
DATE = "2026-11-04"
SEEDS = list(mission.MissionEnv.EVAL)[:5]
MISSION_ENVELOPES = ("nominal", "fast")
FIELDS = {"empty": False, "aligned_vehicles": True}
WORST = (10.5, 0.15, 5.0)
CONDITIONS = {"worst": WORST, "nominal": E.NOMINAL, "best": E.AGGRESSIVE}
INPUTS = ["tools/envelope-v10.py", "tools/dynamics-golden-v10.js", "software/stockcar/dynamics.py", "software/stockcar/envelope.py",
          "software/stockcar/lapmodel.py", "software/stockcar/mission.py", "software/stockcar/supervisor.py", "software/stockcar/passage.py",
          "software/stockcar/field.py", "software/stockcar/obstacles.py", "software/stockcar/geometry.py",
          "software/stockcar/tests/fixtures/dynamics-golden-v10.json", "derived/organizer-cad-v10/field-v10.json"]
CLEAN = [{"mode": "straight"}, {"mode": "straight"}]
ARC_RADII_IN = (6.0, 7.5, 9.3, 12.0)   # 6.0-9.3 in is the U-turn window from the CAD hand check
INERTIA_SCALES = (1, 3, 10, 30)        # the 70:1 gearbox multiplies the unmeasured rotor inertia by 4,900


def compare_models(golden):
    rows = []
    for case in golden["cases"]:
        inp = {"model": golden["model"], "scenario": case["scenario"], "motor": case["motor"], "mass": case["mass"], "overrides": case["overrides"]}
        rows.append({"scenario": case["scenario"]["id"], "v5": case["metrics"], "v10": D.simulate(inp, D.V10)["metrics"]})
    return rows


def inertia_sensitivity(golden):
    rows = []
    volts, friction, mass = E.NOMINAL
    for scale in INERTIA_SCALES:
        vehicle = {**golden["model"]["vehicle"], "wheel_inertia_kg_m2": golden["model"]["vehicle"]["wheel_inertia_kg_m2"] * scale}
        scaled = {**golden, "model": {**golden["model"], "vehicle": vehicle}}
        run = E.launch(scaled, mass, volts, friction)
        rows.append({"scale": scale, "wheel_inertia_kg_m2": vehicle["wheel_inertia_kg_m2"], "launch": run, "brake": E.brake(scaled, mass, volts, friction, E.USABLE["speed"] * run["top_speed_m_s"])})
    return rows


def mission_commands(seed, envelope, obstacles):
    sim = mission.MissionSim("aggressive", envelope)
    layout = mission.random_layout(random.Random(seed), sim.field, "offsets", "aligned", obstacles=obstacles)
    sim.reset(layout, sensor_seed=seed)
    commands, info = [], None
    for _ in range(4000):
        _, _, done, info = sim.step()
        commands.append((sim.state["v"], sim.state["w"]))
        if done:
            break
    return commands, sim.dt, info


def replays(golden):
    results = []
    for envelope in MISSION_ENVELOPES:
        for field, obstacles in FIELDS.items():
            traces = [mission_commands(seed, envelope, obstacles) for seed in SEEDS]
            stops = [E.count_stops([c[0] for c in commands]) for commands, _, _ in traces]
            for name, (volts, friction, mass) in CONDITIONS.items():
                runs = [{"seed": seed, **E.replay(golden, commands, dt, volts, friction, mass)} for seed, (commands, dt, _) in zip(SEEDS, traces)]
                results.append({"mission_envelope": envelope, "cruise_in_s": L.ENVELOPES[envelope]["cruise"], "field": field, "condition": name,
                                "source_voltage_v": volts, "friction": friction, "mass_kg": mass, "stops": stops, "runs": runs,
                                "slip_share_median": D.r6(statistics.median(r["slip_share"] for r in runs)),
                                "rms_speed_error_median_in_s": D.r6(statistics.median(r["rms_speed_error_in_s"] for r in runs)),
                                "peak_supply_current_a": max(r["peak_supply_current_a"] for r in runs),
                                "peak_motor_current_a": max(r["peak_motor_current_a"] for r in runs),
                                "energy_wh_median": D.r6(statistics.median(r["energy_wh"] for r in runs)),
                                "saturated_share_median": D.r6(statistics.median(r["saturated_share"] for r in runs)),
                                "heading_gap_median_rad": D.r6(statistics.median(r["max_heading_gap_rad"] for r in runs)),
                                "duration_s_median": D.r6(statistics.median(r["duration_s"] for r in runs))})
    return results


def lap_rows(plans, half_in, lowest_top):
    rows = []
    sources = [("lap study", name, env) for name, env in L.ENVELOPES.items()] + [("dynamics", name, E.lapmodel_envelope(p)) for name, p in plans.items()]
    for source, name, env in sources:
        lap = L.lap_time(env, CLEAN)
        uturn = min(env["cruise"], math.sqrt(env["lat_accel"] * L.UTURN_RADIUS_IN))
        outer = uturn * (L.UTURN_RADIUS_IN + half_in) / L.UTURN_RADIUS_IN
        rows.append({"source": source, "envelope": name, "cruise_in_s": D.r6(env["cruise"]), "lat_accel_in_s2": D.r6(env["lat_accel"]), "uturn_speed_in_s": D.r6(uturn),
                     "outer_wheel_in_s": D.r6(outer), "outer_wheel_share_of_lowest_top_speed": D.r6(outer / lowest_top),
                     "clean_lap_s": D.r6(lap), "clean_mission_s": D.r6(L.mission_time(env, lap))})
    return rows


def arc_limits(plans, half_in):
    return [{"radius_in": radius, **{name: {"outer_wheel_limit_in_s": D.r6(E.arc_speed_limit(p["cruise_in_s"], half_in, radius)),
                                            "lateral_limit_in_s": D.r6(math.sqrt(p["lateral_in_s2"] * radius))} for name, p in plans.items()}} for radius in ARC_RADII_IN]


def f(x, digits=2):
    return f"{x:.{digits}f}"


def summary(data):
    lines = ["# Envelope v10 summary", "",
             f"{DATE}. Agent-run synthetic study of the corrected dynamics model (`software/stockcar/dynamics.py`, `step_v10`). Friction, mass, inertia, resistance and gains are placeholders, so these numbers rank options and size margins; they are not measurements.", "",
             "## v5 model against the corrected model", "",
             "| Scenario | Final speed m/s (v5 → v10) | Final yaw error rad | Peak slip m/s | Peak sampled current A | Saturated samples | Energy Wh |", "|---|---|---|---|---|---|---|"]
    for r in data["model_comparison"]:
        a, b = r["v5"], r["v10"]
        lines.append(f"| {r['scenario']} | {f(a['final_speed_m_s'], 3)} → {f(b['final_speed_m_s'], 3)} | {f(a['final_yaw_error_rad'], 3)} → {f(b['final_yaw_error_rad'], 3)} | {f(a['maximum_abs_slip_m_s'], 3)} → {f(b['maximum_abs_slip_m_s'], 3)} | {f(a['maximum_abs_current_a'])} → {f(b['maximum_abs_current_a'])} | {a['saturation_samples']} → {b['saturation_samples']} | {f(a['energy_wh'], 4)} → {f(b['energy_wh'], 4)} |")
    rows = data["conditions"]
    nominal = next(r for r in rows if (r["source_voltage_v"], r["friction"], r["mass_kg"]) == E.NOMINAL)

    def span(label, pick, digits=2):
        values = [pick(r) for r in rows]
        return f"| {label} | {f(min(values), digits)} | {f(pick(nominal), digits)} | {f(max(values), digits)} |"
    lines += ["", f"## Limits across {len(rows)} conditions", "", f"Supply {E.VOLTAGES_V} V, friction {E.FRICTIONS}, mass {E.MASSES_KG} kg. Nominal is {E.NOMINAL[0]} V, friction {E.NOMINAL[1]}, {E.NOMINAL[2]} kg.", "",
              "| Quantity | Lowest | Nominal | Highest |", "|---|---:|---:|---:|",
              span("Top speed, in/s", lambda r: r["launch"]["top_speed_m_s"] * E.IN_PER_M, 1),
              span("Launch acceleration, m/s²", lambda r: r["launch"]["accel_m_s2"]),
              span("Time to 90% of top speed, s", lambda r: r["launch"]["time_to_90_pct_s"]),
              span("Stopping deceleration, m/s²", lambda r: r["brake"]["decel_m_s2"]),
              span("Stopping distance from 80% of top speed, in", lambda r: r["brake"]["stop_distance_m"] * E.IN_PER_M),
              span("Peak yaw rate, rad/s", lambda r: r["spin"]["peak_yaw_rate_rad_s"]),
              span("Yaw acceleration, rad/s²", lambda r: r["spin"]["yaw_accel_rad_s2"]),
              span("Peak motor current in a launch, A", lambda r: r["launch"]["peak_motor_current_a"]),
              span("Peak supply current in a launch, both motors, A", lambda r: r["launch"]["peak_supply_current_a"]),
              span("Peak motor current in a full-command spin, A", lambda r: r["spin"]["peak_motor_current_a"]),
              span("Peak supply current in a full-command spin, both motors, A", lambda r: r["spin"]["peak_supply_current_a"]),
              "", "## Planning envelopes", "", f"Usable shares of each limit: {E.USABLE}. Conservative takes the lowest of every quantity across all conditions. Lateral is a friction bound (share x friction x driven weight fraction x g) because the model has no lateral tire model.", "",
              "| Envelope | Cruise in/s | 7.5 in U-turn in/s | Accel in/s² | Brake in/s² | Spin rad/s | Yaw accel rad/s² | Lateral in/s² | 90° spin s | Time lost per stop and restart s |", "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|"]
    for name, p in data["planning_envelopes"].items():
        lines.append(f"| {name} | {f(p['cruise_in_s'], 1)} | {f(p['uturn_in_s'], 1)} | {f(p['accel_in_s2'], 1)} | {f(p['brake_in_s2'], 1)} | {f(p['spin_rad_s'])} | {f(p['yaw_accel_rad_s2'], 1)} | {f(p['lateral_in_s2'], 1)} | {f(p['spin_90_s'])} | {f(p['stop_cost_s'])} |")
    creep = data["stop_without_integral_release"]
    lines += [f"\nStops above release the controller integral, as the firmware does. Keeping it at {WORST[0]} V, friction {WORST[1]}, {WORST[2]} kg, the wheel takes {f(creep['stop_time_s'])} s to fall below {1000 * E.STOPPED_M_S:g} mm/s and is still moving at {f(1000 * creep['residual_speed_m_s'], 1)} mm/s 2.5 s after the command.",
              "", "## Speed limits on an arc", "", f"The outer wheel runs at (radius + half track) / radius times the center speed, with a half track of {f(data['half_track_in'])} in. Each cell is outer-wheel limit / lateral limit, in in/s of center speed, using each envelope's usable shares. The lower number binds.", "",
              "| Arc radius in | Conservative | Nominal | Aggressive |", "|---:|---:|---:|---:|"]
    for r in data["arc_limits"]:
        lines.append("| " + " | ".join([f"{r['radius_in']:g}"] + [f"{f(r[n]['outer_wheel_limit_in_s'], 1)} / {f(r[n]['lateral_limit_in_s'], 1)}" for n in ("conservative", "nominal", "aggressive")]) + " |")
    lines += ["", "## Lap model with each envelope", "", f"Clean laps (no vehicles), from `software/stockcar/lapmodel.py`, which changes speed instantly and keeps a fixed allowance for spins and settling. The lowest top speed across all conditions is {f(data['lowest_top_speed_in_s'], 1)} in/s; an outer-wheel share above 100% cannot be driven at that condition.", "",
              "| Source | Envelope | Cruise in/s | U-turn in/s | Outer wheel in/s | Share of lowest top speed | Clean lap s | Mission s |", "|---|---|---:|---:|---:|---:|---:|---:|"]
    for r in data["lap_model"]:
        lines.append(f"| {r['source']} | {r['envelope']} | {f(r['cruise_in_s'], 1)} | {f(r['uturn_speed_in_s'], 1)} | {f(r['outer_wheel_in_s'], 1)} | {100 * r['outer_wheel_share_of_lowest_top_speed']:.0f}% | {f(r['clean_lap_s'], 1)} | {f(r['clean_mission_s'], 1)} |")
    lines += ["", "## Mission simulator limits against the envelopes", "", "| Limit | Mission simulator | Conservative usable | Nominal usable |", "|---|---:|---:|---:|"]
    for r in data["simulator_limits"]:
        lines.append(f"| {r['limit']} | {f(r['simulator'], 1)} | {f(r['conservative'], 1)} | {f(r['nominal'], 1)} |")
    lines += ["", "## Sensitivity to wheel inertia", "", f"Nominal condition, full-command launch. The v9 value is {data['inertia_sensitivity'][0]['wheel_inertia_kg_m2']:g} kg·m² and leaves out the motor rotor, which a 70:1 gearbox multiplies by 4,900. Grip sets the speeds and distances, so they barely move; the current does.", "",
              "| Wheel inertia scale | Top speed in/s | Launch accel m/s² | Stopping distance in | Peak motor A | Peak supply A |", "|---:|---:|---:|---:|---:|---:|"]
    for r in data["inertia_sensitivity"]:
        lines.append(f"| {r['scale']}x | {f(r['launch']['top_speed_m_s'] * E.IN_PER_M, 1)} | {f(r['launch']['accel_m_s2'])} | {f(r['brake']['stop_distance_m'] * E.IN_PER_M)} | {f(r['launch']['peak_motor_current_a'])} | {f(r['launch']['peak_supply_current_a'])} |")
    lines += ["", "## Mission replay through the plant", "", f"Commanded speed and yaw rate from v10 missions (seeds {SEEDS[0]}–{SEEDS[-1]}) drive the wheel-speed loop. The path loop is not closed, so this measures what the plant does with those commands. Worst is {WORST[0]} V, friction {WORST[1]}, {WORST[2]} kg; best is {E.AGGRESSIVE[0]} V, friction {E.AGGRESSIVE[1]}, {E.AGGRESSIVE[2]} kg.", "",
              "| Mission cruise in/s | Field | Condition | Slip share | Saturated time | RMS speed error in/s | Heading gap rad | Peak motor A | Peak supply A | Energy Wh | Stops |", "|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|"]
    for r in data["mission_replay"]:
        lines.append(f"| {r['cruise_in_s']:g} | {r['field']} | {r['condition']} | {100 * r['slip_share_median']:.2f}% | {100 * r['saturated_share_median']:.1f}% | {f(r['rms_speed_error_median_in_s'])} | {f(r['heading_gap_median_rad'])} | {f(r['peak_motor_current_a'])} | {f(r['peak_supply_current_a'])} | {f(r['energy_wh_median'], 3)} | {min(r['stops'])}–{max(r['stops'])} |")
    return "\n".join(lines) + "\n"


def main():
    golden = json.loads(FIXTURE.read_text(encoding="utf-8"))
    vehicle = golden["model"]["vehicle"]
    half_in = vehicle["track_m"] / 2 * E.IN_PER_M
    rows = E.grid(golden)
    plans = E.envelopes(rows, vehicle)
    lowest_top = min(r["launch"]["top_speed_m_s"] for r in rows) * E.IN_PER_M
    for plan in plans.values():
        plan["spin_90_s"] = E.spin_time(math.pi / 2, plan["spin_rad_s"], plan["yaw_accel_rad_s2"])
        plan["stop_cost_s"] = E.stop_cost_s(plan["cruise_in_s"], plan["accel_in_s2"], plan["brake_in_s2"])
    replay_rows = replays(golden)
    worst_row = next(r for r in rows if (r["source_voltage_v"], r["friction"], r["mass_kg"]) == WORST)
    creep = E.brake(golden, WORST[2], WORST[0], WORST[1], E.USABLE["speed"] * worst_row["launch"]["top_speed_m_s"], release_integral=False)
    sim = mission.MissionSim("aggressive", "nominal")
    limits = [{"limit": "Linear acceleration, in/s²", "simulator": sim.a_max, "conservative": plans["conservative"]["accel_in_s2"], "nominal": plans["nominal"]["accel_in_s2"]},
              {"limit": "Yaw acceleration, rad/s²", "simulator": sim.alpha_max, "conservative": plans["conservative"]["yaw_accel_rad_s2"], "nominal": plans["nominal"]["yaw_accel_rad_s2"]},
              {"limit": "Yaw rate, rad/s (12 in/s envelope)", "simulator": sim.w_max, "conservative": plans["conservative"]["spin_rad_s"], "nominal": plans["nominal"]["spin_rad_s"]}]
    for name in MISSION_ENVELOPES:
        cruise = L.ENVELOPES[name]["cruise"]
        limits.append({"limit": f"Outer wheel in a {L.UTURN_RADIUS_IN:g} in U-turn at {cruise:g} in/s, in/s", "simulator": cruise * (L.UTURN_RADIUS_IN + half_in) / L.UTURN_RADIUS_IN,
                       "conservative": plans["conservative"]["cruise_in_s"], "nominal": plans["nominal"]["cruise_in_s"]})
    rounded = {name: {k: D.r6(v) for k, v in plan.items()} for name, plan in plans.items()}
    data = {"date": DATE, "status": "agent-run synthetic study; placeholder parameters; not hardware-validated",
            "grid": {"source_voltage_v": E.VOLTAGES_V, "friction": E.FRICTIONS, "mass_kg": E.MASSES_KG}, "usable": E.USABLE, "variant": D.V10,
            "model_comparison": compare_models(golden), "conditions": rows, "planning_envelopes": rounded, "stop_without_integral_release": creep,
            "inertia_sensitivity": inertia_sensitivity(golden), "half_track_in": D.r6(half_in), "lowest_top_speed_in_s": D.r6(lowest_top), "arc_limits": arc_limits(plans, half_in),
            "lap_model": lap_rows(plans, half_in, lowest_top), "simulator_limits": [{**r, "conservative": D.r6(r["conservative"]), "nominal": D.r6(r["nominal"])} for r in limits],
            "mission_replay": replay_rows}
    OUT.mkdir(parents=True, exist_ok=True)
    files = {"report.json": json.dumps(data, indent=1) + "\n", "summary.md": summary(data)}
    for name, text in files.items():
        (OUT / name).write_text(text, encoding="utf-8")
    manifest = {"date": DATE, "status": data["status"],
                "input_hashes": {f_: hashlib.sha256((ROOT / f_).read_bytes()).hexdigest() for f_ in INPUTS},
                "output_hashes": {n: hashlib.sha256(t.encode("utf-8")).hexdigest() for n, t in files.items()}}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(files["summary.md"])


if __name__ == "__main__":
    main()
