"""Planar mule dynamics: a faithful port of the v5 model and a corrected v10 variant.

`step` and `simulate` port tools/mule-dynamics-v5.js (the dynamics-v9 model): a linear DC motor from
the no-load speed and extrapolated stall values, a driver current limit, supply sag through the source
resistance, wheel and yaw inertia, rolling resistance, caster scrub, a traction cap, encoder
quantization, delay and dropout, and a feed-forward PI wheel-speed controller.
tests/test_dynamics.py checks them against the JavaScript results in
tests/fixtures/dynamics-golden-v10.json.

`step_v10` keeps that controller and those parameters and corrects what the v5 model gets wrong once
it leaves gentle cruise (ERRATA-2026-11.md lists what this changes in the sealed dynamics-v9 report):
- voltage: the motor ratings hold at the rated voltage, so a lower supply lowers top speed. v5 divides
  by the supply voltage, which cancels it.
- friction: the no-load current becomes a friction torque. v5 leaves it out, so its currents sit below
  what the motor draws spinning freely.
- traction: a velocity-level contact solve lets each wheel stick, slip and recover. In v5 a slip never
  closes once the force falls under the cap, and the robot stays below its wheel speed.
- integration: physics substeps resolve the free-wheel motor time constant (about 2.1 ms). The 4.17 ms
  v5 step sits at the stability limit, so a slipping wheel oscillates every step at the current limit.
- supply current: duty x motor current for sag and energy, as for a PWM H-bridge without regeneration.

Every friction, mass and inertia value is synthetic until bench measurements exist.
SI units here (m, s, kg, A, V), unlike the rest of stockcar, which works in inches.
"""
import math

# Pololu #4754 ratings @ 12 V, from sources/hardware-2026-10-31/pololu/product-4754-specs.html.
RATED_VOLTAGE_V = 12.0
NO_LOAD_CURRENT_A = 0.2
FRICTION_SMOOTHING_RAD_S = 0.5   # Coulomb friction fades to zero below this wheel speed
CONTACT_ITERATIONS = 50

V10 = {"voltage_reference": "rated", "no_load_friction": True, "supply_current": "pwm", "substeps": 10}


def clamp(x, a, b):
    return max(a, min(b, x))


def wrap(a):
    return math.atan2(math.sin(a), math.cos(a))


def js_round(x):
    """JavaScript Math.round (halves round up)."""
    return math.floor(x + 0.5)


def r6(x):
    return round(x, 6) + 0.0


def sign(x):
    return (x > 0) - (x < 0)


def command(scenario, t):
    if scenario["id"] == "spin":
        d = scenario.get("spin_duration_s") or 4
        ramp = min(1, d / 3)
        peak = math.pi / (d - ramp)
        target, rate = 0.0, 0.0
        if t < ramp:
            rate, target = peak * t / ramp, peak * t * t / (2 * ramp)
        elif t < d - ramp:
            rate, target = peak, peak * (t - ramp / 2)
        elif t < d:
            u = d - t
            rate, target = peak * u / ramp, math.pi - peak * u * u / (2 * ramp)
        else:
            target = math.pi
        return {"speed": 0.0, "yaw_target": target, "yaw_rate": rate}
    speed = min(scenario.get("target_speed_m_s") or 0, (scenario.get("acceleration_m_s2") or 0) * t)
    if scenario.get("stop_at_s") is not None and t >= scenario["stop_at_s"]:
        speed = 0.0
    return {"speed": speed, "yaw_target": 0.0, "yaw_rate": 0.0}


def initial_state():
    return {"t": 0.0, "x": 0.0, "y": 0.0, "yaw": 0.0, "v": 0.0, "yaw_rate": 0.0, "omega": [0.0, 0.0],
            "wheel_angle": [0.0, 0.0], "integral": [0.0, 0.0], "duty": [0.0, 0.0], "current": [0.0, 0.0],
            "torque": [0.0, 0.0], "bus_v": 0.0, "energy_j": 0.0, "saturated": [False, False], "slip": [0.0, 0.0],
            "encoder": [0.0, 0.0], "history": [], "frozen": None, "peak_motor_a": 0.0, "peak_supply_a": 0.0}


def _first(*values):
    for v in values:
        if v is not None:
            return v
    return None


def measured_encoders(state, motor, delay, scenario):
    h = state["history"]
    delayed = h[max(0, len(h) - 1 - delay)] if h else [0.0, 0.0]
    actual = list(state["omega"])
    cpr = motor["output_cpr"]
    start, end = scenario.get("dropout_start_s"), scenario.get("dropout_end_s")
    result = []
    for i in range(2):
        value = delayed[i]
        if i == 0 and start is not None and start <= state["t"] < end:
            value = _first(state["frozen"], value)
        result.append(js_round(value * cpr / (2 * math.pi)) * (2 * math.pi / cpr))
    if start is not None and state["t"] >= end:
        state["frozen"] = None
    elif start is not None and state["t"] >= start and state["frozen"] is None:
        state["frozen"] = actual[0]
    return result


def _controller(state, inp, dt):
    """Heading loop and wheel-speed PI: sets the duty and returns the unclamped requests."""
    scenario, motor, model = inp["scenario"], inp["motor"], inp["model"]
    o = inp.get("overrides") or {}
    v, c = model["vehicle"], model["control"]
    radius = _first(o.get("wheel_radius_m"), v["wheel_radius_m"])
    track = _first(o.get("track_m"), v["track_m"])
    target = command(scenario, state["t"])
    heading_rate = clamp(target["yaw_rate"] + c["heading_kp"] * wrap(target["yaw_target"] - state["yaw"]) - c["heading_kd"] * state["yaw_rate"], -3, 3)
    target_omega = scenario.get("wheel_targets_rad_s") or [(target["speed"] - track * heading_rate / 2) / radius, (target["speed"] + track * heading_rate / 2) / radius]
    state["encoder"] = measured_encoders(state, motor, _first(o.get("encoder_delay_steps"), c["encoder_delay_steps"]), scenario)
    if scenario.get("release_integral_at_stop") and state["t"] >= scenario["stop_at_s"]:
        state["integral"] = [0.0, 0.0]   # as firmware/pico2/motor.py does for a commanded stop
    requested = [0.0, 0.0]
    for i in range(2):
        error = target_omega[i] - state["encoder"][i]
        candidate = clamp(state["integral"][i] + error * dt, -c["integral_limit"], c["integral_limit"])
        ff = target_omega[i] / motor["no_load_omega"] if c["feedforward"] else 0.0
        raw = ff + c["speed_kp"] * error + c["speed_ki"] * candidate
        requested[i] = raw
        state["duty"][i] = clamp(raw, -1, 1)
        if abs(raw) <= 1:
            state["integral"][i] = candidate
    return requested


def step(state, inp, dt):
    """One step of the v5 model, artifacts included."""
    scenario, motor, model, mass = inp["scenario"], inp["motor"], inp["model"], inp["mass"]
    o = inp.get("overrides") or {}
    v, e = model["vehicle"], model["electrical"]
    radius = _first(o.get("wheel_radius_m"), v["wheel_radius_m"])
    track = _first(o.get("track_m"), v["track_m"])
    iw = v["wheel_inertia_kg_m2"]
    requested = _controller(state, inp, dt)
    source_v = _first(o.get("source_voltage_v"), scenario.get("source_voltage_v"), e["source_voltage_v"])
    limit = _first(o.get("driver_current_limit_a"), e["driver_current_limit_a"])
    motor_scale = _first(o.get("motor_scale"), 1)
    bus = max(e["minimum_modeled_bus_v"], state["bus_v"] or source_v)
    current = [0.0, 0.0]
    for _ in range(model["numerics"]["bus_iterations"]):
        for i in range(2):
            current[i] = clamp(motor["stall_current"] * motor_scale * (state["duty"][i] * bus / source_v - state["omega"][i] / motor["no_load_omega"]), -limit, limit)
        positive = sum(max(0.0, x) for x in current)
        bus = max(e["minimum_modeled_bus_v"], source_v - e["source_resistance_ohm"] * positive)
    for i in range(2):
        current[i] = clamp(motor["stall_current"] * motor_scale * (state["duty"][i] * bus / source_v - state["omega"][i] / motor["no_load_omega"]), -limit, limit)
    torque = [x * motor["torque_constant"] for x in current]
    m_eff = mass + 2 * iw / (radius * radius)
    i_eff = v["yaw_inertia_kg_m2"] + iw * track * track / (2 * radius * radius)
    rolling = v["rolling_resistance_coefficient"] * mass * 9.81 * math.tanh(state["v"] / 0.005)
    scrub = _first(o.get("caster_scrub_nm"), v["caster_scrub_nm"]) * math.tanh(state["yaw_rate"] / 0.02)
    dv = ((torque[0] + torque[1]) / radius - rolling) / m_eff
    dw = (track * (torque[1] - torque[0]) / (2 * radius) - scrub) / i_eff
    no_slip_alpha = [dv - track * dw / 2, dv + track * dw / 2]
    force = [torque[i] / radius - iw * no_slip_alpha[i] / radius for i in range(2)]
    normal = v["driven_weight_fraction"] * mass * 9.81 / 2
    friction = [_first(o.get("friction_left"), scenario.get("friction_left"), v["friction_coefficient"]),
                _first(o.get("friction_right"), scenario.get("friction_right"), v["friction_coefficient"])]
    cap = [sign(f) * min(abs(f), friction[i] * normal) for i, f in enumerate(force)]
    slipping = any(abs(cap[i] - force[i]) > 1e-9 for i in range(2))
    if slipping:
        dv = ((cap[0] + cap[1]) - rolling) / mass
        dw = (track * (cap[1] - cap[0]) / 2 - scrub) / v["yaw_inertia_kg_m2"]
        for i in range(2):
            state["omega"][i] += (torque[i] - cap[i] * radius) / iw * dt
    else:
        for i in range(2):
            state["omega"][i] += no_slip_alpha[i] / radius * dt
    state["v"] += dv * dt
    state["yaw_rate"] += dw * dt
    next_yaw = state["yaw"] + state["yaw_rate"] * dt
    state["x"] += state["v"] * math.cos((state["yaw"] + next_yaw) / 2) * dt
    state["y"] += state["v"] * math.sin((state["yaw"] + next_yaw) / 2) * dt
    state["yaw"] = wrap(next_yaw)
    for i in range(2):
        state["wheel_angle"][i] += state["omega"][i] * dt
        state["current"][i] = current[i]
        state["torque"][i] = torque[i]
        state["slip"][i] = state["omega"][i] * radius - (state["v"] + (1 if i else -1) * track * state["yaw_rate"] / 2)
        state["saturated"][i] = abs(requested[i]) > 1 or abs(current[i]) >= limit - 1e-8
    state["bus_v"] = bus
    state["energy_j"] += bus * sum(max(0.0, x) for x in current) * dt
    state["t"] += dt
    state["history"].append(list(state["omega"]))
    if len(state["history"]) > 32:
        state["history"].pop(0)
    return state


def _contact_forces(free_slip_rate, diagonal, off_diagonal, cap):
    """Ground forces that stop both wheels slipping, each held within its friction limit.

    Projected Gauss-Seidel on the 2 x 2 system; it is diagonally dominant, so a few passes settle it.
    """
    f = [0.0, 0.0]
    for _ in range(CONTACT_ITERATIONS):
        f0 = clamp((free_slip_rate[0] - off_diagonal * f[1]) / diagonal, -cap[0], cap[0])
        f1 = clamp((free_slip_rate[1] - off_diagonal * f0) / diagonal, -cap[1], cap[1])
        settled = abs(f0 - f[0]) + abs(f1 - f[1]) < 1e-12
        f = [f0, f1]
        if settled:
            break
    return f


def step_v10(state, inp, dt, variant=V10):
    """One control step of the corrected model; the switches in `variant` turn corrections off."""
    requested = _controller(state, inp, dt)
    plant_step(state, inp, dt, variant)
    for i in range(2):
        state["saturated"][i] = state["saturated"][i] or abs(requested[i]) > 1
    return state


def plant_step(state, inp, dt, variant=V10):
    """Advances the corrected plant one control period at the duty already in the state."""
    scenario, motor, model, mass = inp["scenario"], inp["motor"], inp["model"], inp["mass"]
    o = inp.get("overrides") or {}
    v, e = model["vehicle"], model["electrical"]
    radius = _first(o.get("wheel_radius_m"), v["wheel_radius_m"])
    half = _first(o.get("track_m"), v["track_m"]) / 2
    iw = v["wheel_inertia_kg_m2"]
    yaw_inertia = _first(o.get("yaw_inertia_kg_m2"), v["yaw_inertia_kg_m2"])
    source_v = _first(o.get("source_voltage_v"), scenario.get("source_voltage_v"), e["source_voltage_v"])
    reference_v = motor.get("rated_voltage_v", RATED_VOLTAGE_V) if variant["voltage_reference"] == "rated" else source_v
    limit = _first(o.get("driver_current_limit_a"), e["driver_current_limit_a"])
    stall = motor["stall_current"] * _first(o.get("motor_scale"), 1)
    no_load = motor.get("no_load_current_a", NO_LOAD_CURRENT_A) if variant["no_load_friction"] else 0.0
    ideal_omega = motor["no_load_omega"] / (1 - no_load / motor["stall_current"])
    kt = motor["stall_torque"] / (motor["stall_current"] - no_load)
    rolling_limit = v["rolling_resistance_coefficient"] * mass * 9.81
    scrub_limit = _first(o.get("caster_scrub_nm"), v["caster_scrub_nm"])
    normal = v["driven_weight_fraction"] * mass * 9.81 / 2
    cap = [_first(o.get("friction_left"), scenario.get("friction_left"), v["friction_coefficient"]) * normal,
           _first(o.get("friction_right"), scenario.get("friction_right"), v["friction_coefficient"]) * normal]
    diagonal = radius * radius / iw + 1 / mass + half * half / yaw_inertia
    off_diagonal = 1 / mass - half * half / yaw_inertia
    pwm = variant["supply_current"] == "pwm"
    h = dt / variant["substeps"]
    bus = max(e["minimum_modeled_bus_v"], state["bus_v"] or source_v)
    current, torque, supply = [0.0, 0.0], [0.0, 0.0], 0.0

    def motor_currents():
        for i in range(2):
            current[i] = clamp(stall * (state["duty"][i] * bus / reference_v - state["omega"][i] / ideal_omega), -limit, limit)
        return sum(max(0.0, (state["duty"][i] if pwm else 1.0) * current[i]) for i in range(2))

    for _ in range(variant["substeps"]):
        for _ in range(model["numerics"]["bus_iterations"]):
            supply = motor_currents()
            bus = max(e["minimum_modeled_bus_v"], source_v - e["source_resistance_ohm"] * supply)
        supply = motor_currents()
        for i in range(2):
            torque[i] = kt * current[i] - kt * no_load * math.tanh(state["omega"][i] / FRICTION_SMOOTHING_RAD_S)
        speed = state["v"] - h * rolling_limit * math.tanh(state["v"] / 0.005) / mass
        rate = state["yaw_rate"] - h * scrub_limit * math.tanh(state["yaw_rate"] / 0.02) / yaw_inertia
        omega = [state["omega"][i] + h * torque[i] / iw for i in range(2)]
        free_slip_rate = [(omega[0] * radius - (speed - half * rate)) / h, (omega[1] * radius - (speed + half * rate)) / h]
        f = _contact_forces(free_slip_rate, diagonal, off_diagonal, cap)
        state["v"] = speed + h * (f[0] + f[1]) / mass
        state["yaw_rate"] = rate + h * half * (f[1] - f[0]) / yaw_inertia
        next_yaw = state["yaw"] + state["yaw_rate"] * h
        state["x"] += state["v"] * math.cos((state["yaw"] + next_yaw) / 2) * h
        state["y"] += state["v"] * math.sin((state["yaw"] + next_yaw) / 2) * h
        state["yaw"] = wrap(next_yaw)
        for i in range(2):
            state["omega"][i] = omega[i] - h * f[i] * radius / iw
            state["wheel_angle"][i] += state["omega"][i] * h
        state["energy_j"] += bus * supply * h
        state["peak_motor_a"] = max(state["peak_motor_a"], abs(current[0]), abs(current[1]))
        state["peak_supply_a"] = max(state["peak_supply_a"], supply)
    for i in range(2):
        state["current"][i] = current[i]
        state["torque"][i] = torque[i]
        state["slip"][i] = state["omega"][i] * radius - (state["v"] + (1 if i else -1) * half * state["yaw_rate"])
        state["saturated"][i] = abs(current[i]) >= limit - 1e-8
    state["bus_v"] = bus
    state["t"] += dt
    state["history"].append(list(state["omega"]))
    if len(state["history"]) > 32:
        state["history"].pop(0)
    return state


def snapshot(state):
    return {"t": r6(state["t"]), "x_m": r6(state["x"]), "y_m": r6(state["y"]), "yaw_rad": r6(state["yaw"]),
            "speed_m_s": r6(state["v"]), "yaw_rate_rad_s": r6(state["yaw_rate"]),
            "wheel_omega_rad_s": [r6(x) for x in state["omega"]], "wheel_angle_rad": [r6(x) for x in state["wheel_angle"]],
            "duty": [r6(x) for x in state["duty"]], "current_a": [r6(x) for x in state["current"]],
            "torque_nm": [r6(x) for x in state["torque"]], "bus_v": r6(state["bus_v"]), "energy_wh": r6(state["energy_j"] / 3600),
            "slip_m_s": [r6(x) for x in state["slip"]], "saturated": list(state["saturated"]),
            "encoder_rad_s": [r6(x) for x in state["encoder"]]}


def simulate(inp, variant=None):
    """Runs a scenario with the v5 model, or with step_v10 when a variant is given."""
    model, scenario = inp["model"], inp["scenario"]
    dt = model["numerics"]["dt_s"]
    steps = js_round(scenario["duration_s"] / dt)
    every = js_round(model["numerics"]["sample_dt_s"] / dt)
    state = initial_state()
    samples = []
    for n in range(steps + 1):
        if n % every == 0:
            samples.append(snapshot(state))
        if n < steps:
            if variant is None:
                step(state, inp, dt)
            else:
                step_v10(state, inp, dt, variant)
    stop = scenario.get("stop_at_s")
    steady = [x for x in samples if x["t"] >= min(2, scenario["duration_s"] / 2) and (stop is None or x["t"] < stop)]
    speed_error = [abs(x["speed_m_s"] - command(scenario, x["t"])["speed"]) for x in steady]
    final_err = abs(wrap(math.pi - state["yaw"])) if scenario["id"] == "spin" else abs(wrap(state["yaw"]))
    metrics = {
        "duration_s": scenario["duration_s"], "distance_m": r6(math.hypot(state["x"], state["y"])),
        "final_speed_m_s": r6(state["v"]), "final_yaw_rad": r6(state["yaw"]), "final_yaw_error_rad": r6(final_err),
        "maximum_abs_current_a": r6(max(abs(c) for x in samples for c in x["current_a"])),
        "maximum_abs_slip_m_s": r6(max(abs(c) for x in samples for c in x["slip_m_s"])),
        "maximum_steady_speed_error_m_s": r6(max(speed_error) if speed_error else 0.0),
        "saturation_samples": sum(1 for x in samples if any(x["saturated"])),
        "energy_wh": r6(state["energy_j"] / 3600)}
    if variant is not None:
        metrics["peak_motor_current_a"] = r6(state["peak_motor_a"])
        metrics["peak_supply_current_a"] = r6(state["peak_supply_a"])
    return {"samples": samples, "metrics": metrics}
