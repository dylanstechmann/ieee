import json
import math
import pathlib
import unittest

from stockcar import dynamics

FIXTURE = pathlib.Path(__file__).resolve().parent / "fixtures" / "dynamics-golden-v10.json"
# The corrected step with every correction switched off except the contact solve.
REDUCED = {"voltage_reference": "source", "no_load_friction": False, "supply_current": "motor", "substeps": 1}


def golden():
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def scenario_input(data, case):
    return {"model": data["model"], "scenario": case["scenario"], "motor": case["motor"], "mass": case["mass"], "overrides": case["overrides"]}


def straight_input(data, duration_s=3.0, source_v=12.0, friction=0.35, **scenario):
    case = data["cases"][0]
    overrides = {**case["overrides"], "source_voltage_v": source_v, "friction_left": friction, "friction_right": friction}
    return {"model": data["model"], "motor": case["motor"], "mass": 4.0, "overrides": overrides,
            "scenario": {"id": "test", "duration_s": duration_s, **scenario}}


def full_launch(data, **kwargs):
    return straight_input(data, target_speed_m_s=2.0, acceleration_m_s2=20.0, **kwargs)


class GoldenTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = golden()

    def assert_close(self, got, want, label):
        if isinstance(want, list):
            for a, b in zip(got, want):
                self.assert_close(a, b, label)
        elif isinstance(want, bool):
            self.assertEqual(got, want, label)
        else:
            self.assertAlmostEqual(got, want, delta=2e-6, msg=label)

    def test_python_port_matches_javascript_for_all_scenarios(self):
        for case in self.data["cases"]:
            result = dynamics.simulate(scenario_input(self.data, case))
            for key, want in case["metrics"].items():
                self.assert_close(result["metrics"][key], want, f"{case['scenario']['id']} {key}")
            self.assertEqual(set(result["samples"][-1]), set(case["final_sample"]))
            for key, want in case["final_sample"].items():
                self.assert_close(result["samples"][-1][key], want, f"{case['scenario']['id']} final {key}")

    def test_corrected_step_reduces_to_v5_while_no_wheel_slips(self):
        for case in self.data["cases"]:
            if case["metrics"]["maximum_abs_slip_m_s"] > 0:
                continue
            got = dynamics.simulate(scenario_input(self.data, case), REDUCED)["metrics"]
            for key, want in case["metrics"].items():
                self.assertAlmostEqual(got[key], want, delta=2e-6, msg=f"{case['scenario']['id']} {key}")


class CorrectedModelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = golden()
        cls.no_load_speed = cls.data["cases"][0]["motor"]["no_load_omega"] * 0.04

    def run_v10(self, inp, variant=dynamics.V10):
        return dynamics.simulate(inp, variant)

    def test_v5_slip_never_recovers_and_v10_slip_does(self):
        v5 = dynamics.simulate(full_launch(self.data))["samples"][-1]
        v10 = self.run_v10(full_launch(self.data))["samples"][-1]
        self.assertGreater(abs(v5["slip_m_s"][0]), 0.2, "documented v5 artifact")
        self.assertLess(v5["speed_m_s"], 0.65 * self.no_load_speed)
        self.assertLess(abs(v10["slip_m_s"][0]), 1e-6)
        self.assertGreater(v10["speed_m_s"], 0.9 * self.no_load_speed)
        self.assertLess(v10["speed_m_s"], self.no_load_speed)

    def test_top_speed_follows_supply_voltage(self):
        high = self.run_v10(full_launch(self.data, source_v=12.0))["samples"][-1]["speed_m_s"]
        low = self.run_v10(full_launch(self.data, source_v=10.5))["samples"][-1]["speed_m_s"]
        self.assertAlmostEqual(low / high, 10.5 / 12.0, delta=0.03)

    def test_stop_settles_without_chatter(self):
        case = self.data["cases"][5]
        self.assertEqual(case["scenario"]["id"], "brake-hold")
        v5 = dynamics.simulate(scenario_input(self.data, case))["samples"]
        v10 = self.run_v10(scenario_input(self.data, case))["samples"]
        self.assertGreater(max(abs(x["current_a"][0]) for x in v5[-30:]), 2.9, "documented v5 artifact")
        self.assertLess(max(abs(x["current_a"][0]) for x in v10[-30:]), 0.3)
        self.assertLess(max(abs(x["wheel_omega_rad_s"][0]) for x in v10[-30:]), 0.2)
        self.assertLess(abs(v10[-1]["speed_m_s"]), 0.005)

    def test_lower_friction_slows_the_launch(self):
        def time_to_half(friction):
            samples = self.run_v10(full_launch(self.data, friction=friction))["samples"]
            return next(x["t"] for x in samples if x["speed_m_s"] >= 0.5 * self.no_load_speed)
        self.assertGreater(time_to_half(0.15), 1.5 * time_to_half(0.35))

    def test_substeps_have_converged(self):
        base = self.run_v10(full_launch(self.data, friction=0.15))["samples"]
        fine = self.run_v10(full_launch(self.data, friction=0.15), {**dynamics.V10, "substeps": 40})["samples"]
        for a, b in zip(base[::10], fine[::10]):
            self.assertAlmostEqual(a["speed_m_s"], b["speed_m_s"], delta=0.005)

    def test_cruise_motor_current_includes_the_no_load_current(self):
        final = self.run_v10(straight_input(self.data, target_speed_m_s=0.2032, acceleration_m_s2=0.35))["samples"][-1]
        self.assertGreater(final["current_a"][0], dynamics.NO_LOAD_CURRENT_A)
        self.assertLess(final["current_a"][0], 0.4)

    def test_uneven_friction_recovers_after_the_ramp(self):
        case = self.data["cases"][3]
        self.assertEqual(case["scenario"]["id"], "asymmetric-traction")
        result = self.run_v10(scenario_input(self.data, case))
        self.assertLess(max(abs(s) for s in result["samples"][-1]["slip_m_s"]), 1e-6)
        self.assertLess(result["metrics"]["final_yaw_error_rad"], case["metrics"]["final_yaw_error_rad"])
        self.assertTrue(math.isfinite(result["metrics"]["energy_wh"]))


if __name__ == "__main__":
    unittest.main()
