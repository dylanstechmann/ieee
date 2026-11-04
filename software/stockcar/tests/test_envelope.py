import json
import math
import pathlib
import unittest

from stockcar import envelope as E
from stockcar import lapmodel

FIXTURE = pathlib.Path(__file__).resolve().parent / "fixtures" / "dynamics-golden-v10.json"


class ManeuverTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.golden = json.loads(FIXTURE.read_text(encoding="utf-8"))
        cls.vehicle = cls.golden["model"]["vehicle"]
        cls.motor = cls.golden["cases"][0]["motor"]
        cls.driven = cls.vehicle["driven_weight_fraction"]
        cls.rolling = cls.vehicle["rolling_resistance_coefficient"]

    def test_launch_matches_the_traction_hand_calculation(self):
        for friction in (0.15, 0.35):
            run = E.launch(self.golden, 4.0, 12.0, friction)
            self.assertAlmostEqual(run["accel_m_s2"], (friction * self.driven - self.rolling) * E.G, delta=0.1)
            self.assertLess(run["final_slip_m_s"], 1e-6)

    def test_top_speed_scales_with_supply_voltage(self):
        no_load = self.motor["no_load_omega"] * 0.04
        for volts in (10.5, 12.0):
            top = E.launch(self.golden, 4.0, volts, 0.25)["top_speed_m_s"]
            self.assertAlmostEqual(top / (no_load * volts / 12.0), 1.0, delta=0.03)

    def test_stop_matches_the_traction_hand_calculation_and_settles(self):
        run = E.brake(self.golden, 4.0, 12.0, 0.25, 0.4)
        self.assertAlmostEqual(run["decel_m_s2"], (0.25 * self.driven + self.rolling) * E.G, delta=0.15)
        self.assertLess(run["residual_speed_m_s"], E.STOPPED_M_S)

    def test_keeping_the_integral_through_a_stop_makes_the_wheel_creep(self):
        released = E.brake(self.golden, 3.0, 10.5, 0.15, 0.42)
        kept = E.brake(self.golden, 3.0, 10.5, 0.15, 0.42, release_integral=False)
        self.assertLess(released["stop_time_s"], 0.5)
        self.assertGreater(kept["stop_time_s"], 3 * released["stop_time_s"])

    def test_spin_rate_is_set_by_wheel_top_speed(self):
        top = E.launch(self.golden, 4.0, 12.0, 0.35)["top_speed_m_s"]
        peak = E.spin(self.golden, 4.0, 12.0, 0.35)["peak_yaw_rate_rad_s"]
        self.assertAlmostEqual(peak / (2 * top / self.vehicle["track_m"]), 1.0, delta=0.1)

    def test_replay_tracks_a_gentle_command(self):
        commands = [(min(12.0, 24.0 * 0.05 * n), 0.0) for n in range(100)]
        result = E.replay(self.golden, commands, 0.05, 12.0, 0.25, 4.0)
        self.assertLess(result["slip_share"], 1e-3)
        self.assertLess(result["rms_speed_error_in_s"], 1.0)
        self.assertGreater(result["energy_wh"], 0.0)
        self.assertLess(result["max_heading_gap_rad"], 0.01)
        self.assertEqual(result["saturated_share"], 0.0)

    def test_replay_reports_saturation_when_the_outer_wheel_is_out_of_reach(self):
        radius_in, half_in = 7.5, self.vehicle["track_m"] / 2 * E.IN_PER_M
        def arc(speed, commands=60):
            return E.replay(self.golden, [(speed, speed / radius_in)] * commands, 0.05, 11.1, 0.35, 4.0)
        reach = E.launch(self.golden, 4.0, 11.1, 0.35)["top_speed_m_s"] * E.IN_PER_M
        limit = E.arc_speed_limit(reach, half_in, radius_in)
        self.assertLess(arc(0.9 * limit)["saturated_share"], 0.2)
        self.assertGreater(arc(1.1 * limit)["saturated_share"], 0.8)
        # Within reach the heading gap is only the start-up lag; out of reach it keeps growing.
        self.assertAlmostEqual(arc(0.9 * limit, 120)["max_heading_gap_rad"], arc(0.9 * limit)["max_heading_gap_rad"], delta=0.02)
        self.assertGreater(arc(1.1 * limit, 120)["max_heading_gap_rad"], 1.5 * arc(1.1 * limit)["max_heading_gap_rad"])

    def test_replay_reports_slip_when_commands_exceed_grip(self):
        commands = [(0.0, 0.0)] * 4 + [(20.0, 0.0)] * 40
        gentle = E.replay(self.golden, [(min(20.0, 1.0 * n), 0.0) for n in range(44)], 0.05, 12.0, 0.15, 4.0)
        harsh = E.replay(self.golden, commands, 0.05, 12.0, 0.15, 4.0)
        self.assertGreater(harsh["slip_share"], gentle["slip_share"])


class PlanningTests(unittest.TestCase):
    @staticmethod
    def row(volts, friction, mass, scale):
        return {"source_voltage_v": volts, "friction": friction, "mass_kg": mass, "launch": {"top_speed_m_s": 0.5 * scale, "accel_m_s2": 1.0 * scale},
                "brake": {"decel_m_s2": 1.5 * scale}, "spin": {"peak_yaw_rate_rad_s": 5.0 * scale, "yaw_accel_rad_s2": 8.0 * scale}}

    def test_envelopes_are_ordered_and_fit_the_lap_model(self):
        rows = [self.row(10.5, 0.15, 5.0, 0.8), self.row(*E.NOMINAL, 1.0), self.row(*E.AGGRESSIVE, 1.2)]
        plans = E.envelopes(rows, {"driven_weight_fraction": 0.8, "track_m": 0.202})
        for key in plans["nominal"]:
            self.assertLessEqual(plans["conservative"][key], plans["nominal"][key])
            self.assertLessEqual(plans["nominal"][key], plans["aggressive"][key])
        env = E.lapmodel_envelope(plans["nominal"])
        self.assertEqual(set(env), set(lapmodel.ENVELOPES["nominal"]))
        self.assertGreater(lapmodel.lap_time(env, [{"mode": "straight"}, {"mode": "straight"}]), 0.0)

    def test_outer_wheel_sets_the_uturn_speed_and_reaches_the_lap_model(self):
        vehicle = {"driven_weight_fraction": 0.8, "track_m": 0.202}
        plan = E.planning(self.row(*E.AGGRESSIVE, 1.2), vehicle)
        self.assertAlmostEqual(plan["uturn_in_s"], plan["cruise_in_s"] * 7.5 / (7.5 + 0.101 * E.IN_PER_M))
        env = E.lapmodel_envelope(plan)
        self.assertAlmostEqual(lapmodel.uturn_time(env), (math.pi * 7.5 + 6.0) / plan["uturn_in_s"])

    def test_spin_time_uses_a_triangle_when_the_rate_is_out_of_reach(self):
        self.assertAlmostEqual(E.spin_time(math.pi, 2.0, 4.0), math.pi / 2 + 0.5)
        self.assertAlmostEqual(E.spin_time(0.25, 2.0, 4.0), 0.5)

    def test_stop_cost_adds_both_ramps(self):
        self.assertAlmostEqual(E.stop_cost_s(12.0, 24.0, 12.0), 0.25 + 0.5)

    def test_count_stops_needs_real_movement_between_stops(self):
        self.assertEqual(E.count_stops([0, 0.05, 0, 5, 12, 12, 3, 0.05, 0, 0, 0.5, 0, 8, 0]), 2)


if __name__ == "__main__":
    unittest.main()
