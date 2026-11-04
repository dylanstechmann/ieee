import json
import os
import sys
import unittest

import bench_e02
from host_tests.fakes import FakeHal
from runner import Runner

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import telemetry_schema  # noqa: E402  (tools/telemetry_schema.py)


class BenchRunTests(unittest.TestCase):
    def run_bench(self, hal, steps=(0.5, 1.0)):
        runner = Runner(hal, mode="BENCH", telemetry_capacity=500)
        outcome = bench_e02.run(runner, "both", steps=steps, hold_ms=600, settle_ms=200)
        return runner, outcome

    def test_completes_and_logs_schema_valid_records(self):
        hal = FakeHal()
        runner, outcome = self.run_bench(hal)
        self.assertEqual(outcome, "completed")
        lines = []
        runner.log.dump(lines.append, json.dumps)
        self.assertGreater(len(lines), 50)
        for line in lines:
            self.assertEqual(telemetry_schema.validate(json.loads(line)), [])
        self.assertFalse(hal.enabled, "motors must be disabled after the run")
        self.assertEqual(hal.duty, (0.0, 0.0))

    def test_open_loop_speed_follows_duty(self):
        hal = FakeHal()
        runner, _ = self.run_bench(hal, steps=(0.5,))
        rpms = [json.loads(x)["rpm"][0] for x in self.lines(runner) if json.loads(x)["cmd"][0] == 0.5]
        # Simulated motor: (0.5 - 0.05) / 0.95 * 150 = 71 rpm at steady state (x1 encoder quantization).
        self.assertAlmostEqual(sum(rpms[-5:]) / 5, 71.05, delta=4.0)

    def test_estop_during_run_stops_and_latches(self):
        hal = FakeHal()
        runner = Runner(hal, mode="BENCH", telemetry_capacity=500)
        self.assertTrue(runner.arm())
        for _ in range(20):
            runner.step((0.6, 0.6), closed_loop=False)
        hal.estop = True
        runner.step((0.6, 0.6), closed_loop=False)
        self.assertEqual(runner.safety.stop_reason, "estop")
        self.assertEqual(runner.applied, (0.0, 0.0))
        self.assertFalse(hal.enabled)
        hal.estop = False
        runner.step((0.6, 0.6), closed_loop=False)
        self.assertEqual(runner.applied, (0.0, 0.0), "a latched stop must not resume by itself")

    def test_refuses_to_arm_with_estop_pressed(self):
        hal = FakeHal()
        hal.estop = True
        runner, outcome = self.run_bench(hal)
        self.assertIn("not armed", outcome)
        self.assertFalse(any(hal.enable_history))

    @staticmethod
    def lines(runner):
        out = []
        runner.log.dump(out.append, json.dumps)
        return out


if __name__ == "__main__":
    unittest.main()
