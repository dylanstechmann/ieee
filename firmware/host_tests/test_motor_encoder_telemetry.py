import json
import unittest

from encoder import X4Counter, decode_x4, to_int32
from host_tests.fakes import SimMotor
from motor import WheelSpeedController, rpm_from_counts
from telemetry import Telemetry


class EncoderTests(unittest.TestCase):
    def test_all_sixteen_transitions(self):
        forward = [0b00, 0b10, 0b11, 0b01]  # one full cycle in the counting direction
        for i, a in enumerate(forward):
            b = forward[(i + 1) % 4]
            self.assertEqual(decode_x4(a, b), 1)
            self.assertEqual(decode_x4(b, a), -1)
            self.assertEqual(decode_x4(a, a), 0)
        invalid = [(0b00, 0b11), (0b11, 0b00), (0b01, 0b10), (0b10, 0b01)]
        for a, b in invalid:
            self.assertIsNone(decode_x4(a, b))

    def test_counter_counts_cycles_and_errors(self):
        c = X4Counter()
        for _ in range(10):
            for ab in (0b10, 0b11, 0b01, 0b00):
                c.feed(ab)
        self.assertEqual(c.count, 40)
        c.feed(0b11)
        self.assertEqual(c.errors, 1)

    def test_int32_wrap(self):
        self.assertEqual(to_int32(0xFFFFFFFF), -1)
        self.assertEqual(to_int32(5), 5)

    def test_rpm_from_counts(self):
        self.assertAlmostEqual(rpm_from_counts(1120 // 2, 0.5, 1120), 60.0)
        self.assertEqual(rpm_from_counts(10, 0, 1120), 0.0)


class SpeedControllerTests(unittest.TestCase):
    def simulate(self, target, steps=400, dt=0.005, controller=None):
        motor = SimMotor()
        ctl = controller or WheelSpeedController()
        for _ in range(steps):
            duty = ctl.step(target, motor.rpm, dt)
            motor.advance(duty, dt)
        return motor, ctl

    def test_reaches_target_speed(self):
        motor, _ = self.simulate(80.0)
        self.assertAlmostEqual(motor.rpm, 80.0, delta=2.0)

    def test_output_is_clamped_and_integral_does_not_wind_up(self):
        motor, ctl = self.simulate(400.0, steps=600)  # beyond what the motor can reach
        self.assertLessEqual(ctl.output, 1.0)
        windup = ctl.integral
        motor2, ctl2 = self.simulate(400.0, steps=1200, controller=ctl)
        self.assertLessEqual(abs(ctl2.integral - windup), 1e-9)

    def test_slew_limit(self):
        ctl = WheelSpeedController(max_slew_per_s=4.0)
        out = ctl.step(150.0, 0.0, 0.005)
        self.assertLessEqual(out, 4.0 * 0.005 + 1e-12)

    def test_zero_target_releases_integral(self):
        _, ctl = self.simulate(80.0)
        ctl.step(0.0, 80.0, 0.005)
        self.assertEqual(ctl.integral, 0.0)


class TelemetryTests(unittest.TestCase):
    def test_ring_buffer_keeps_newest_records_in_order(self):
        log = Telemetry(capacity=3)
        for t in range(5):
            log.record(t, "BENCH", (t, -t), (0.1, 0.1), (0.1, 0.1), (1.0, 1.0), None, None, False, None, 100)
        self.assertEqual(log.dropped, 2)
        lines = []
        log.dump(lines.append, json.dumps)
        items = [json.loads(x) for x in lines]
        self.assertEqual([i["t_ms"] for i in items], [2, 3, 4])
        self.assertEqual([i["seq"] for i in items], [2, 3, 4])
        self.assertIsNone(items[0]["i_a"])
        self.assertIsNone(items[0]["stop_reason"])


if __name__ == "__main__":
    unittest.main()
