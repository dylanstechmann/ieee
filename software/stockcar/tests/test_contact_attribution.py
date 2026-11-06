import random
import types
import unittest

from stockcar import mission
from stockcar.contact_attribution import attribute, phase_of
from stockcar.geometry import rectangle
from stockcar.mission_sensed import SensedMissionSim


def _fake(route_name="LAP", low_mode="lane_hold", high_mode="lane_hold"):
    return types.SimpleNamespace(route_name=route_name, low_mode=low_mode, high_mode=high_mode)


class PhaseOfTests(unittest.TestCase):
    def test_off_straight_outside_the_lap(self):
        self.assertEqual(phase_of(_fake(route_name="ENTER"), 50.0, 16.0), "off_straight")
        self.assertEqual(phase_of(_fake(route_name=None), 50.0, 16.0), "off_straight")

    def test_arcs_outside_the_straightaways(self):
        self.assertEqual(phase_of(_fake(), 40.0, 20.0), "arc")      # west arc
        self.assertEqual(phase_of(_fake(), 85.0, 28.0), "arc")      # east arc

    def test_low_entry_exit_and_lane_zones(self):
        sim = _fake()
        self.assertEqual(phase_of(sim, 50.0, 16.0), "entry_blend")  # low, x < 56
        self.assertEqual(phase_of(sim, 75.0, 16.0), "exit_blend")   # low, x > 68
        self.assertEqual(phase_of(sim, 62.0, 16.0), "lane_hold")    # low, lane zone, non-change mode

    def test_high_entry_exit_and_lane_zones(self):
        sim = _fake()
        self.assertEqual(phase_of(sim, 75.0, 32.0), "entry_blend")  # high, x > 68
        self.assertEqual(phase_of(sim, 50.0, 32.0), "exit_blend")   # high, x < 56
        self.assertEqual(phase_of(sim, 62.0, 32.0), "lane_hold")    # high, lane zone

    def test_lane_change_only_when_the_straight_switches_lanes(self):
        self.assertEqual(phase_of(_fake(low_mode="lane_change"), 62.0, 16.0), "lane_change")
        self.assertEqual(phase_of(_fake(high_mode="lane_change"), 62.0, 32.0), "lane_change")
        for mode in ("clear", "clean", "contact"):
            self.assertEqual(phase_of(_fake(low_mode=mode), 62.0, 16.0), "lane_hold")


class _OverlapSim:
    """Minimal simulator surface for the synthetic attribution cases."""

    def __init__(self, x, y, th, lap=0, vehicle_poly=None):
        self.route_name = "LAP"
        self.low_mode = self.high_mode = "lane_hold"
        self.state = {"x": x, "y": y, "th": th}
        self.laps = lap
        self.sup = types.SimpleNamespace(laps=lap)
        self.vehicle_poly = vehicle_poly or rectangle(50.0, 16.0, 0.0, 8.55, 8.2)

    def _footprint(self, x, y, th):
        return rectangle(x, y, th, 10.0, 10.0)


class _VehicleLayout:
    def __init__(self, poly):
        self.vehicles = [{"quadrant": "low_west", "side": "low", "cx": 50.0, "cy": 16.0, "yaw": 0.0}]
        self.polys = [poly]


class AttributionTests(unittest.TestCase):
    def test_no_record_when_clear_of_vehicles(self):
        sim = _OverlapSim(62.0, 16.0, 0.0)
        layout = _VehicleLayout(rectangle(50.0, 16.0, 0.0, 8.55, 8.2))
        self.assertEqual(attribute(sim, layout), [])

    def test_one_record_per_overlapped_vehicle_with_phase(self):
        poly = rectangle(50.0, 16.0, 0.0, 8.55, 8.2)
        sim = _OverlapSim(50.0, 16.0, 0.0, lap=1, vehicle_poly=poly)  # robot centred on the vehicle
        records = attribute(sim, _VehicleLayout(poly))
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["quadrant"], "low_west")
        self.assertEqual(records[0]["vehicle"], 0)
        self.assertEqual(records[0]["lap"], 1)
        self.assertEqual(records[0]["phase"], "entry_blend")  # x=50 on the low straight

    def test_counts_match_the_simulators_vehicle_contact_steps(self):
        # A full mission: the number of frames with >=1 record must equal the simulator's own counts.
        for seed in (100, 103):
            sim = SensedMissionSim()
            layout = mission.random_layout(random.Random(seed), sim.field)
            sim.reset(layout)
            seen = [0, 0, 0]
            for _ in range(4000):
                _, _, done, _ = sim.step()
                records = attribute(sim, layout)
                if records:
                    seen[min(sim.sup.laps, 2)] += 1
                if done:
                    break
            self.assertEqual(seen, list(sim.vehicle_contacts), "per-lap contact frames must match")


if __name__ == "__main__":
    unittest.main()