"""Speed, acceleration, stopping and spin limits from the corrected dynamics model.

For each condition (supply voltage, friction, mass) it runs a full-command launch, a stop from cruise
and a full-command spin through dynamics.step_v10, then derives planning envelopes that the lap model
accepts. On an arc the outer wheel outruns the robot's center, so an arc's speed limit is usually set by
that wheel, not by straight-line top speed. `replay` drives the same plant with a commanded mission trace.

The friction, mass and inertia values are placeholders until the E02 and E03 trials replace them, and
the planar model has no lateral tire model, so the lateral limit is a friction bound.
"""
import math

from . import dynamics as D
from . import lapmodel

IN_PER_M = 1 / 0.0254
G = 9.81
VOLTAGES_V = (10.5, 11.1, 12.0)
FRICTIONS = (0.15, 0.25, 0.35)
MASSES_KG = (3.0, 4.0, 5.0)
NOMINAL = (11.1, 0.25, 4.0)
AGGRESSIVE = (12.0, 0.35, 3.0)
REFERENCE_MASS_KG = 4.0    # the v9 yaw inertia belongs to this mass; it scales with mass here
USABLE = {"speed": 0.8, "accel": 0.7, "brake": 0.7, "spin": 0.7, "lateral": 0.7}   # share of each limit the plan may use
STOPPED_M_S = 0.005
MOVING_IN_S = 1.0
HELD_IN_S = 0.1


def vehicle_input(golden, mass, source_v, friction, scenario):
    case = golden["cases"][0]
    yaw_inertia = golden["model"]["vehicle"]["yaw_inertia_kg_m2"] * mass / REFERENCE_MASS_KG
    overrides = {**case["overrides"], "source_voltage_v": source_v, "friction_left": friction, "friction_right": friction, "yaw_inertia_kg_m2": yaw_inertia}
    return {"model": golden["model"], "motor": case["motor"], "mass": mass, "scenario": scenario, "overrides": overrides}


def _trace(inp, variant):
    """Keeps every control step, for timing finer than the sample rate."""
    dt = inp["model"]["numerics"]["dt_s"]
    state = D.initial_state()
    rows = []
    for _ in range(D.js_round(inp["scenario"]["duration_s"] / dt)):
        D.step_v10(state, inp, dt, variant)
        rows.append({"t": state["t"], "v": state["v"], "x": state["x"], "yaw_rate": state["yaw_rate"], "slip": max(abs(s) for s in state["slip"])})
    return state, rows


def _crossing(rows, key, level):
    return next(r for r in rows if abs(r[key]) >= level)


def launch(golden, mass, source_v, friction, variant=D.V10):
    """Full command from rest. Acceleration is measured between 10% and 50% of top speed."""
    scenario = {"id": "launch", "duration_s": 3.0, "target_speed_m_s": 2.0, "acceleration_m_s2": 20.0}
    state, rows = _trace(vehicle_input(golden, mass, source_v, friction, scenario), variant)
    top = rows[-1]["v"]
    low, half, near = (_crossing(rows, "v", share * top) for share in (0.1, 0.5, 0.9))
    return {"top_speed_m_s": D.r6(top), "accel_m_s2": D.r6((half["v"] - low["v"]) / (half["t"] - low["t"])),
            "time_to_90_pct_s": D.r6(near["t"]), "distance_to_90_pct_m": D.r6(near["x"]), "peak_slip_m_s": D.r6(max(r["slip"] for r in rows)),
            "final_slip_m_s": D.r6(rows[-1]["slip"]), "peak_motor_current_a": D.r6(state["peak_motor_a"]), "peak_supply_current_a": D.r6(state["peak_supply_a"])}


def brake(golden, mass, source_v, friction, speed_m_s, variant=D.V10, release_integral=True):
    """Reaches speed_m_s on a gentle ramp, holds it for a second, then commands zero.

    The firmware clears the integral on a stop. With release_integral=False the v9 controller keeps it,
    and the wheel creeps long after the robot has effectively stopped.
    """
    ramp = 0.5
    stop_at = speed_m_s / ramp + 1.0
    scenario = {"id": "brake", "duration_s": stop_at + 2.5, "target_speed_m_s": speed_m_s, "acceleration_m_s2": ramp, "stop_at_s": stop_at,
                "release_integral_at_stop": release_integral}
    _, rows = _trace(vehicle_input(golden, mass, source_v, friction, scenario), variant)
    after = [r for r in rows if r["t"] >= stop_at]
    start = after[0]
    stop = next(r for r in after if abs(r["v"]) <= STOPPED_M_S)
    tail = [abs(r["v"]) for r in rows[-120:]]
    return {"from_speed_m_s": D.r6(start["v"]), "stop_time_s": D.r6(stop["t"] - start["t"]), "stop_distance_m": D.r6(stop["x"] - start["x"]),
            "decel_m_s2": D.r6(start["v"] / (stop["t"] - start["t"])), "peak_slip_m_s": D.r6(max(r["slip"] for r in after)), "residual_speed_m_s": D.r6(max(tail))}


def spin(golden, mass, source_v, friction, variant=D.V10):
    """Wheels commanded far past their reach in opposite directions, so the plant sets the rate."""
    reach = 4 * golden["cases"][0]["motor"]["no_load_omega"]
    scenario = {"id": "full-spin", "duration_s": 1.5, "wheel_targets_rad_s": [-reach, reach]}
    state, rows = _trace(vehicle_input(golden, mass, source_v, friction, scenario), variant)
    peak = max(abs(r["yaw_rate"]) for r in rows)
    low, half = _crossing(rows, "yaw_rate", 0.1 * peak), _crossing(rows, "yaw_rate", 0.5 * peak)
    return {"peak_yaw_rate_rad_s": D.r6(peak), "yaw_accel_rad_s2": D.r6((abs(half["yaw_rate"]) - abs(low["yaw_rate"])) / (half["t"] - low["t"])),
            "peak_motor_current_a": D.r6(state["peak_motor_a"]), "peak_supply_current_a": D.r6(state["peak_supply_a"])}


def condition(golden, source_v, friction, mass, variant=D.V10):
    run = launch(golden, mass, source_v, friction, variant)
    return {"source_voltage_v": source_v, "friction": friction, "mass_kg": mass, "launch": run,
            "brake": brake(golden, mass, source_v, friction, USABLE["speed"] * run["top_speed_m_s"], variant),
            "spin": spin(golden, mass, source_v, friction, variant)}


def grid(golden, variant=D.V10):
    return [condition(golden, v, f, m, variant) for v in VOLTAGES_V for f in FRICTIONS for m in MASSES_KG]


def spin_time(angle_rad, rate, accel):
    """Rest-to-rest spin on a trapezoid, or a triangle when the rate is never reached."""
    if angle_rad >= rate * rate / accel:
        return angle_rad / rate + rate / accel
    return 2 * math.sqrt(angle_rad / accel)


def stop_cost_s(cruise, accel, brake_decel):
    """Time one full stop and restart adds over an instant speed change."""
    return cruise / (2 * accel) + cruise / (2 * brake_decel)


def arc_speed_limit(wheel_limit_in_s, half_track_in, radius_in):
    """Center speed at which the outer wheel of an arc reaches wheel_limit_in_s."""
    return wheel_limit_in_s * radius_in / (radius_in + half_track_in)


def planning(row, vehicle):
    """The share of one condition's limits that a plan may use (in/s units, like the lap model)."""
    cruise = USABLE["speed"] * row["launch"]["top_speed_m_s"] * IN_PER_M
    accel = USABLE["accel"] * row["launch"]["accel_m_s2"] * IN_PER_M
    decel = USABLE["brake"] * row["brake"]["decel_m_s2"] * IN_PER_M
    rate = USABLE["spin"] * row["spin"]["peak_yaw_rate_rad_s"]
    yaw_accel = USABLE["spin"] * row["spin"]["yaw_accel_rad_s2"]
    lateral = USABLE["lateral"] * row["friction"] * vehicle["driven_weight_fraction"] * G * IN_PER_M
    radius = lapmodel.UTURN_RADIUS_IN
    uturn = min(cruise, math.sqrt(lateral * radius), arc_speed_limit(cruise, vehicle["track_m"] / 2 * IN_PER_M, radius))
    return {"cruise_in_s": cruise, "uturn_in_s": uturn, "accel_in_s2": accel, "brake_in_s2": decel, "spin_rad_s": rate, "yaw_accel_rad_s2": yaw_accel, "lateral_in_s2": lateral}


def envelopes(rows, vehicle):
    """Conservative takes the lowest of every quantity across the rows; the others are single conditions."""
    plans = [planning(r, vehicle) for r in rows]
    conservative = {key: min(p[key] for p in plans) for key in plans[0]}

    def at(target):
        return next(p for r, p in zip(rows, plans) if (r["source_voltage_v"], r["friction"], r["mass_kg"]) == target)
    return {"conservative": conservative, "nominal": at(NOMINAL), "aggressive": at(AGGRESSIVE)}


def lapmodel_envelope(plan):
    """The lap model takes one arc limit, as lateral acceleration, so the U-turn speed is expressed that way."""
    return {"cruise": plan["cruise_in_s"], "lane_change": plan["cruise_in_s"] / 2,
            "lat_accel": plan["uturn_in_s"] ** 2 / lapmodel.UTURN_RADIUS_IN, "spin_rad_s": plan["spin_rad_s"]}


def count_stops(speeds_in_s):
    """Moving-to-held transitions in a commanded speed trace."""
    stops, moving = 0, False
    for speed in speeds_in_s:
        if abs(speed) >= MOVING_IN_S:
            moving = True
        elif moving and abs(speed) <= HELD_IN_S:
            stops += 1
            moving = False
    return stops


def replay(golden, commands, command_dt_s, source_v, friction, mass, variant=D.V10):
    """Drives the plant with (speed in/s, yaw rate rad/s) commands, one per command_dt_s.

    The wheel-speed loop is closed here, but the path loop is not, so the heading gap is the open-loop
    error a path follower would have to remove. Slip share is wheel slip distance over travel distance;
    saturated share is the time either wheel asks for more than full duty or the current limit.
    """
    scenario = {"id": "replay", "duration_s": len(commands) * command_dt_s, "wheel_targets_rad_s": [0.0, 0.0]}
    inp = vehicle_input(golden, mass, source_v, friction, scenario)
    radius = inp["overrides"]["wheel_radius_m"]
    half = golden["model"]["vehicle"]["track_m"] / 2
    dt = golden["model"]["numerics"]["dt_s"]
    per_command = D.js_round(command_dt_s / dt)
    state = D.initial_state()
    ideal_yaw = 0.0
    squares, worst, slip_m, travel_m, gap = 0.0, 0.0, 0.0, 0.0, 0.0
    saturated = 0
    for speed_in_s, rate in commands:
        speed = speed_in_s / IN_PER_M
        scenario["wheel_targets_rad_s"] = [(speed - half * rate) / radius, (speed + half * rate) / radius]
        for _ in range(per_command):
            D.step_v10(state, inp, dt, variant)
            error = (speed - state["v"]) * IN_PER_M
            squares += error * error
            worst = max(worst, abs(error))
            slip_m += (abs(state["slip"][0]) + abs(state["slip"][1])) / 2 * dt
            travel_m += (abs(state["v"] - half * state["yaw_rate"]) + abs(state["v"] + half * state["yaw_rate"])) / 2 * dt
            ideal_yaw += rate * dt
            gap = max(gap, abs(D.wrap(state["yaw"] - ideal_yaw)))
            saturated += any(state["saturated"])
    steps = len(commands) * per_command
    return {"duration_s": D.r6(state["t"]), "rms_speed_error_in_s": D.r6(math.sqrt(squares / steps)), "max_speed_error_in_s": D.r6(worst),
            "slip_share": D.r6(slip_m / travel_m if travel_m else 0.0), "saturated_share": D.r6(saturated / steps), "max_heading_gap_rad": D.r6(gap),
            "energy_wh": D.r6(state["energy_j"] / 3600),
            "peak_motor_current_a": D.r6(state["peak_motor_a"]), "peak_supply_current_a": D.r6(state["peak_supply_a"])}
