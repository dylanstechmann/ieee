# One whole mission on the simulated robot: supervisor, mission driver, packed routes, path tracker, EKF
# on simulated sensors, and the firmware loop on the corrected drivetrain model. Shared by the host tests
# and tools/evaluate-full-mission-v10.py. Contacts, parking and score are judged from the true pose.
# Not modeled: the camera and start flag (the tag and flag are simply given), the lap line (reaching a
# route's end stands in for crossing it), sideways skid, and pushing vehicles.
import math
import os
import random

import config
import route_store
from host_tests.plant_hal import PlantHal
from host_tests.route_follow import IN, RECORD_EVERY, shaper_for
from mission_driver import MissionDriver
from runner import Runner
from stockcar import lapmodel
from stockcar.estimator import Estimator
from stockcar.field import Field
from stockcar.geometry import rectangle, separation
from stockcar.mission import overlap_fraction
from stockcar.sensors import Band, SensorSuite
from stockcar.supervisor import Supervisor
from stockcar.tracker import Tracker

ESTIMATOR_TICKS = 10         # 20 Hz at the 200 Hz control rate
ESTIMATOR_DT_S = 0.05
FLAG_DOWN_S = 5.0            # the robot sits still, and the filter learns the gyro bias
LIMIT_S = 200.0
INCHES_PER_COUNT = 2 * math.pi * config.WHEEL_RADIUS_M / IN / config.COUNTS_PER_OUTPUT_REV


def footprint(x, y, heading):
    return rectangle(x, y, heading, 10.0, 10.0)


def parked_share(field, box, x, y, heading):
    return overlap_fraction(footprint(x, y, heading), field.pit_boxes[box])


def run(routes_dir, lap_route, box, condition, planning, seed, vehicles=(), exchange_works=True, preset="aggressive", pit_after_lap=2):
    """Runs a mission and returns what happened. vehicles are polygons; box is the true assigned box."""
    field = Field()
    barriers = field.barriers()

    def route(name):
        return route_store.load(os.path.join(routes_dir, name + ".rt"))

    hal = PlantHal(*condition)
    runner = Runner(hal, mode="DRIVE", telemetry_capacity=10)
    runner.shaper = shaper_for(planning)
    assert runner.arm()
    enter, lap = route("enter"), route(lap_route)
    x0, y0, h0 = enter["x"][0], enter["y"][0], enter["heading"][0]
    cos0, sin0 = math.cos(h0), math.sin(h0)
    supervisor = Supervisor(preset, lap_length_m=(len(lap["x"]) - 1) * lap["step_in"] * IN, stop_at_s=lapmodel.AUTO_STOP_S, pit_after_lap=pit_after_lap)
    driver = MissionDriver(supervisor, route, Tracker, lap_route, in_box=lambda pose, b: parked_share(field, b, *pose) > 0.75)
    suite = SensorSuite(random.Random(seed), field, barriers, list(vehicles))
    estimator = Estimator((x0, y0, h0), Band(field), barriers)
    state = hal.state
    deadline = hal.ticks_us() + runner.period_us
    speed = rate = 0.0
    odometry_in = 0.0
    last_counts = runner.last_counts
    exchange_started = None
    samples = []
    worst_error = 0.0
    spin_s = 0.0
    tick = 0
    for tick in range(int(LIMIT_S * config.CONTROL_HZ)):
        t = tick / config.CONTROL_HZ
        px, py = state["x"] / IN, state["y"] / IN
        x, y, heading = x0 + cos0 * px - sin0 * py, y0 + sin0 * px + cos0 * py, h0 + state["yaw"]
        if tick % ESTIMATOR_TICKS == 0:
            meas = suite.measure((x, y, heading), state["v"] / IN, state["yaw_rate"], ESTIMATOR_DT_S)
            estimator.predict(meas["encoder_delta"], meas["gyro"], ESTIMATOR_DT_S)
            estimator.correct(meas)
            pose = estimator.pose()
            worst_error = max(worst_error, math.hypot(pose[0] - x, pose[1] - y))
            counts = runner.last_counts
            odometry_in += (abs(counts[0] - last_counts[0]) + abs(counts[1] - last_counts[1])) / 2 * INCHES_PER_COUNT
            last_counts = counts
            obs = {"flag_up": t >= FLAG_DOWN_S, "tag_id": box}
            if driver.out is not None and driver.out["state"] == "EXCHANGE":
                exchange_started = t if exchange_started is None else exchange_started
                if t - exchange_started >= lapmodel.EXCHANGE_S:
                    obs["exchange_done" if exchange_works else "exchange_failed"] = True
                    exchange_started = None
            speed, rate = driver.step(t, pose, odometry_in * IN, obs)
            spin_s += ESTIMATOR_DT_S if driver.spin else 0.0
            if driver.out["state"] in ("DONE", "STOPPED"):
                break
        if tick % RECORD_EVERY == 0:
            samples.append((x, y, heading, supervisor.laps))
        runner.drive(speed * IN, rate)
        deadline = runner.wait_next(deadline)
        hal._advance()
    return judge(field, barriers, driver, supervisor, samples, vehicles, box, t, worst_error, spin_s, state, runner)


def judge(field, barriers, driver, supervisor, samples, vehicles, box, t, worst_error, spin_s, state, runner):
    out = driver.out
    walls, cars = [0, 0, 0], [0, 0, 0]
    gap = math.inf
    for x, y, heading, laps in samples[::2]:
        body = footprint(x, y, heading)
        lap = min(laps, 2)
        nearest = min(separation(body, b) for b in barriers)
        gap = min(gap, nearest)
        walls[lap] += nearest < 0
        cars[lap] += any(separation(body, v) < 0 for v in vehicles)
    x, y, heading, _ = samples[-1]
    parked = parked_share(field, box, x, y, heading) > 0.75
    finish = next((float(when) for when, text in supervisor.events if text == "lap 3 complete"), None)
    start = next((float(when) for when, text in supervisor.events if text == "green flag confirmed"), None)
    finish_s = None if finish is None or start is None else finish - start
    laps = out["laps"]
    score = 10 + 25 if start is not None else 0
    if finish_s is not None and finish_s <= lapmodel.AUTO_STOP_S:
        score += 100 + (30 if finish_s < lapmodel.BONUS_S else 0)
    score += 15 if parked else 0
    score += 65 if out["exchange_result"] == "done" else 0
    score += sum(15 for i in range(laps) if walls[i] == 0) + sum(25 for i in range(laps) if cars[i] == 0)
    score += 25 if out["flag_servo"] == "up" and laps == 3 else 0
    return {"state": out["state"], "stop_reason": out["stop_reason"], "laps": laps, "finish_s": None if finish_s is None else round(finish_s, 2), "mission_s": round(t - (start or 0.0), 2),
            "exchange": out["exchange_result"], "recoveries": out["recoveries"], "parked": parked, "parked_share": round(parked_share(field, box, x, y, heading), 3), "box": box,
            "wall_contact_laps": sum(1 for c in walls if c), "vehicle_contact_laps": sum(1 for c in cars if c), "least_clearance_in": round(gap, 3),
            "max_position_error_in": round(worst_error, 3), "spin_s": round(spin_s, 2), "peak_supply_a": round(state["peak_supply_a"], 3), "score_like": score,
            "safety_stopped": runner.safety.stopped}
