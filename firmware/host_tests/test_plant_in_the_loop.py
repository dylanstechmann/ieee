# The real control loop (Runner, WheelSpeedController, DriveShaper) against the corrected drivetrain
# model. Plant parameters are placeholders, so these check behavior, not predicted performance.
import json
import math
import os
import statistics
import unittest

import config
from drive import DriveShaper
from host_tests.plant_hal import ROOT, PlantHal
from runner import Runner

IN = 0.0254
WORST = (10.5, 0.15, 5.0)
NOMINAL = (11.1, 0.25, 4.0)
BEST = (12.0, 0.35, 3.0)


def rpm(speed_m_s):
    return speed_m_s / config.WHEEL_RADIUS_M * 60 / (2 * math.pi)


def run(condition, seconds, tick, inertia_scale=1.0):
    hal = PlantHal(*condition, inertia_scale=inertia_scale)
    runner = Runner(hal, mode="DRIVE", telemetry_capacity=10)
    assert runner.arm()
    rows = []
    deadline = hal.ticks_us() + runner.period_us
    for n in range(int(seconds * config.CONTROL_HZ)):
        tick(runner, n / config.CONTROL_HZ)
        deadline = runner.wait_next(deadline)
        hal._advance()
        s = hal.state
        rows.append({"t": n / config.CONTROL_HZ, "v": s["v"] / IN, "w": s["yaw_rate"], "slip": max(abs(x) for x in s["slip"]) / IN,
                     "wheel_rpm": s["omega"][0] * 60 / (2 * math.pi), "measured_rpm": runner.rpm[0]})
    return runner, rows


def wheels(speed, yaw_rate):
    half = config.HALF_TRACK_M
    return rpm(speed - half * yaw_rate), rpm(speed + half * yaw_rate)


class SpeedLoopTests(unittest.TestCase):
    def test_holds_speed_despite_encoder_quantization(self):
        for condition in (WORST, NOMINAL, BEST):
            runner, rows = run(condition, 3.0, lambda r, t: r.step((rpm(12 * IN), rpm(12 * IN)), True))
            tail = [x for x in rows if x["t"] >= 2.0]
            self.assertFalse(runner.safety.stopped)
            self.assertAlmostEqual(statistics.mean(x["v"] for x in tail), 12.0, delta=0.1)
            self.assertLess(statistics.pstdev(x["wheel_rpm"] for x in tail), 1.0)
            self.assertGreater(statistics.pstdev(x["measured_rpm"] for x in tail), 2.0, "one count is 10.7 rpm per tick")

    def test_stays_stable_across_the_unknown_wheel_inertia(self):
        for scale in (1, 10, 30):
            _, rows = run(NOMINAL, 3.0, lambda r, t: r.drive(12 * IN, 0.0), inertia_scale=scale)
            tail = [x for x in rows if x["t"] >= 2.0]
            self.assertAlmostEqual(statistics.mean(x["v"] for x in tail), 12.0, delta=0.1)
            self.assertLess(statistics.pstdev(x["v"] for x in tail), 0.1)
            self.assertLess(max(x["v"] for x in rows), 13.0)

    def test_commanded_stop_leaves_no_creep(self):
        _, rows = run(NOMINAL, 4.0, lambda r, t: r.drive(12 * IN if t < 2.0 else 0.0, 0.0))
        self.assertLess(max(abs(x["v"]) for x in rows if x["t"] >= 2.6), 0.01)


class ShapingTests(unittest.TestCase):
    def test_ramp_removes_launch_slip_on_low_friction(self):
        _, raw = run(WORST, 2.0, lambda r, t: r.step((rpm(12 * IN), rpm(12 * IN)), True))
        _, shaped = run(WORST, 2.0, lambda r, t: r.drive(12 * IN, 0.0))
        self.assertGreater(max(x["slip"] for x in raw), 5.0)
        self.assertLess(max(x["slip"] for x in shaped), 0.1)
        self.assertAlmostEqual(shaped[-1]["v"], 12.0, delta=0.2)

    def test_keeps_the_turn_radius_when_the_outer_wheel_runs_out(self):
        speed = 16 * IN
        rate = speed / (7.5 * IN)
        for condition in (NOMINAL, WORST):
            _, raw = run(condition, 5.0, lambda r, t: r.step(wheels(speed, rate), True))
            _, shaped = run(condition, 5.0, lambda r, t: r.drive(speed, rate))

            def radius(rows):
                tail = [x for x in rows if x["t"] >= 3.0]
                return statistics.mean(x["v"] for x in tail) / statistics.mean(x["w"] for x in tail)
            self.assertGreater(radius(raw), 7.9)
            self.assertAlmostEqual(radius(shaped), 7.5, delta=0.05)

    def test_shared_grip_budget_limits_slip_entering_an_arc(self):
        speed = 12 * IN
        _, rows = run(WORST, 3.0, lambda r, t: r.drive(speed, speed / (7.5 * IN)))
        self.assertLess(max(x["slip"] for x in rows), 1.0)


class ShaperUnitTests(unittest.TestCase):
    def shaper(self):
        return DriveShaper(100.0, 0.6, 1.0, 4.5, 0.04, 0.1)

    def test_scaling_preserves_the_radius_and_the_wheel_limit(self):
        s = self.shaper()
        for _ in range(2000):
            left, right = s.step(1.0, 2.0, 0.005)
        self.assertAlmostEqual(max(abs(left), abs(right)), 100.0, places=6)
        self.assertAlmostEqual(s.speed / s.yaw_rate, 0.5, places=6)

    def test_speed_ramps_up_and_down_at_their_own_rates(self):
        s = self.shaper()
        s.step(1.0, 0.0, 0.1)
        self.assertAlmostEqual(s.speed, 0.06)
        s.step(0.0, 0.0, 0.01)
        self.assertAlmostEqual(s.speed, 0.05)

    def test_reversing_brakes_through_zero(self):
        s = self.shaper()
        s.speed = 0.2
        s.step(-0.2, 0.0, 0.01)
        self.assertAlmostEqual(s.speed, 0.19)

    def test_speed_and_yaw_changes_share_one_budget(self):
        s = self.shaper()
        s.step(1.0, 2.0, 0.1)
        self.assertAlmostEqual(s.speed / 0.06 + s.yaw_rate / 0.45, 1.0)

    def test_reset_clears_the_ramp(self):
        s = self.shaper()
        s.step(1.0, 1.0, 0.1)
        s.reset()
        self.assertEqual(s.step(0.0, 0.0, 0.1), (0.0, 0.0))


class ConfiguredLimitTests(unittest.TestCase):
    def test_configured_limits_stay_inside_the_conservative_envelope(self):
        with open(os.path.join(ROOT, "derived", "envelope-v10", "report.json"), encoding="utf-8") as f:
            plan = json.load(f)["planning_envelopes"]["conservative"]
        self.assertLessEqual(config.MAX_ACCEL_M_S2 / IN, plan["accel_in_s2"])
        self.assertLessEqual(config.MAX_BRAKE_M_S2 / IN, plan["brake_in_s2"])
        self.assertLessEqual(config.MAX_YAW_ACCEL_RAD_S2, plan["yaw_accel_rad_s2"])
        self.assertLessEqual(config.MAX_WHEEL_RPM * 2 * math.pi / 60 * config.WHEEL_RADIUS_M / IN, plan["cruise_in_s"])


if __name__ == "__main__":
    unittest.main()
