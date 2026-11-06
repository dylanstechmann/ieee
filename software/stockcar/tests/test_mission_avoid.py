import random
import unittest

from stockcar import mission
from stockcar.mission_avoid import AvoidingMissionSim, run_avoiding
from stockcar.mission_sensed import run_sensed

_EXTRA_KEYS = ("infeasible_vehicles", "sensed_vehicles")


class _RaisingVehicles:
    """A layout whose `vehicles` attribute raises, to prove the sensed planner never reads it."""

    def __init__(self, inner):
        self.assigned_box = inner.assigned_box
        self.exchange_success = inner.exchange_success
        self.polys = inner.polys

    @property
    def vehicles(self):
        raise AssertionError("sensed lane planning must not read layout.vehicles")


class AvoidingMissionSimTests(unittest.TestCase):
    def test_v10_blend_reproduces_sensed_mission_sim_exactly(self):
        a = run_sensed(110, obstacles=True, yaw_mode="aligned", replan_lanes=True, footprint_in=10.0)
        b = run_avoiding(110, lane_source="v10_blend", footprint_in=10.0, yaw_mode="aligned")
        stripped = {k: v for k, v in b.items() if k not in _EXTRA_KEYS}
        self.assertEqual(a, stripped)

    def test_sensed_planning_never_reads_truth_vehicles(self):
        sim = AvoidingMissionSim(lane_source="sensed")
        real = mission.random_layout(random.Random(7), sim.field)
        sim.build_routes(_RaisingVehicles(real))  # must not raise the AssertionError

    def test_oracle_reports_infeasible_vehicles(self):
        info = run_avoiding(105, lane_source="oracle", footprint_in=8.0)
        self.assertIn("infeasible_vehicles", info)

    def test_sensed_mission_runs_and_reports_sensed_vehicles(self):
        info = run_avoiding(105, lane_source="sensed", footprint_in=8.0)
        self.assertIn("sensed_vehicles", info)
        self.assertIn("infeasible_vehicles", info)

    def test_unknown_lane_source_is_rejected(self):
        with self.assertRaises(ValueError):
            AvoidingMissionSim(lane_source="nonsense")


if __name__ == "__main__":
    unittest.main()