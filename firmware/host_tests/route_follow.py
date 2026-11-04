# The firmware loop (Runner, DriveShaper, WheelSpeedController) following a route table on the corrected
# drivetrain model, with stockcar.tracker steering. Shared by the host tests and tools/evaluate-maneuver-v10.py.
# The plant has wheel slip but no sideways skid, and its parameters are placeholders, so this tests behavior.
import math

import config
from drive import DriveShaper
from host_tests.plant_hal import PlantHal
from runner import Runner
from stockcar.tracker import Tracker

IN = 0.0254
RECORD_EVERY = 4     # true pose at 50 Hz
RAD_S_TO_RPM = 60 / (2 * math.pi)


def shaper_for(planning):
    """The firmware shaper with one planning envelope's limits instead of config.py's conservative ones."""
    wheel_rpm = planning["cruise_in_s"] * IN / config.WHEEL_RADIUS_M * RAD_S_TO_RPM
    return DriveShaper(wheel_rpm, planning["accel_in_s2"] * IN, planning["brake_in_s2"] * IN, planning["yaw_accel_rad_s2"],
                       config.WHEEL_RADIUS_M, config.HALF_TRACK_M)


def follow(table, condition, planning, estimator=None, estimator_period_ticks=10, limit_s=60.0):
    """Drives one route. condition is (source V, friction, mass kg).

    estimator: optional callable(x, y, heading, v, yaw_rate) -> (x, y, heading), given the true motion and
    called every estimator_period_ticks; the tracker then steers from its answer. Otherwise it uses the truth.
    Returns whether the route finished, its time, the true poses, tracking errors and plant peaks.
    """
    hal = PlantHal(*condition)
    runner = Runner(hal, mode="DRIVE", telemetry_capacity=10)
    runner.shaper = shaper_for(planning)
    assert runner.arm()
    tracker = Tracker(table)
    x0, y0, h0 = table["x"][0], table["y"][0], table["heading"][0]
    cos0, sin0 = math.cos(h0), math.sin(h0)
    state = hal.state
    deadline = hal.ticks_us() + runner.period_us
    path = []
    squares, worst, worst_heading, slip = 0.0, 0.0, 0.0, 0.0
    done = False
    speed = rate = 0.0
    ticks = int(limit_s * config.CONTROL_HZ)
    tick = 0
    for tick in range(ticks):
        px, py = state["x"] / IN, state["y"] / IN
        x, y, heading = x0 + cos0 * px - sin0 * py, y0 + sin0 * px + cos0 * py, h0 + state["yaw"]
        if estimator is None:
            speed, rate, done = tracker.command(x, y, heading)
        elif tick % estimator_period_ticks == 0:
            speed, rate, done = tracker.command(*estimator(x, y, heading, state["v"] / IN, state["yaw_rate"]))
        if tick % RECORD_EVERY == 0:
            path.append((x, y, heading))
        if done:
            break
        runner.drive(speed * IN, rate)
        deadline = runner.wait_next(deadline)
        hal._advance()
        across = tracker.errors[1]
        squares += across * across
        worst = max(worst, abs(across))
        worst_heading = max(worst_heading, abs(tracker.errors[2]))
        slip = max(slip, max(abs(s) for s in state["slip"]) / IN)
    return {"done": done, "time_s": tick / config.CONTROL_HZ, "path": path, "rms_cross_track_in": math.sqrt(squares / max(1, tick)),
            "max_cross_track_in": worst, "max_heading_error_rad": worst_heading, "max_slip_in_s": slip,
            "peak_supply_a": state["peak_supply_a"], "stopped": runner.safety.stopped}
