# The mission driver's logic against a scripted supervisor and tracker, then real whole missions.
import json
import math
import os
import pathlib
import sys
import tempfile
import unittest

from host_tests import full_mission
from host_tests.plant_hal import ROOT
from mission_driver import FACING_RAD, LEAST_SPIN_RATE_RAD_S, RECOVER_SPEED_IN_S, SPIN_RATE_RAD_S, MissionDriver
import route_store

sys.path.insert(0, os.path.join(ROOT, "tools"))
import build_pico_bundle  # noqa: E402
import micropython_lint  # noqa: E402


def out(state, motion="lap", laps=0, box=2, scale=1.0):
    return {"state": state, "motion": motion, "laps": laps, "assigned_box": box, "speed_scale": scale}


class ScriptedSupervisor:
    def __init__(self, *outs):
        self.outs = list(outs)
        self.seen = []

    def update(self, now, obs):
        self.seen.append(obs)
        return self.outs.pop(0) if len(self.outs) > 1 else self.outs[0]


class ScriptedTracker:
    def __init__(self, table):
        self.table = table
        self.done = False

    def command(self, x, y, heading):
        return 10.0, 0.5, self.done


def driver(supervisor, heading=0.0, in_box=None):
    loaded = []

    def load(name):
        loaded.append(name)
        return {"heading": [heading]}

    d = MissionDriver(supervisor, load, ScriptedTracker, "lanes", in_box=in_box)
    d.loaded = loaded
    return d


POSE = (10.0, 10.0, 0.0)


class DriverTests(unittest.TestCase):
    def test_holds_still_while_waiting_and_in_the_exchange(self):
        for state, motion in (("WAIT_START", "hold"), ("SWITCH_HOLD", "hold"), ("EXCHANGE", "exchange"), ("DONE", "stop"), ("STOPPED", "stop")):
            d = driver(ScriptedSupervisor(out(state, motion)))
            self.assertEqual(d.step(0.0, POSE, 0.0, {}), (0.0, 0.0))
            self.assertEqual(d.loaded, [])

    def test_each_phase_loads_its_route(self):
        for state, box, name in (("ENTER", 2, "enter"), ("LAP", 2, "lanes"), ("TO_PIT", 3, "to_pit_3"), ("PARK", 1, "to_pit_1"), ("EXIT_PIT", 2, "exit_pit_2")):
            d = driver(ScriptedSupervisor(out(state, box=box)))
            d.step(0.0, POSE, 0.0, {})
            self.assertEqual(d.loaded, [name])

    def test_a_route_is_loaded_once_per_leg(self):
        d = driver(ScriptedSupervisor(out("LAP")))
        for t in range(5):
            d.step(float(t), POSE, 0.0, {})
        self.assertEqual(d.loaded, ["lanes"])

    def test_completing_a_lap_restarts_the_lap_route(self):
        d = driver(ScriptedSupervisor(out("LAP", laps=0), out("LAP", laps=1)))
        d.step(0.0, POSE, 0.0, {})
        first = d.tracker
        d.step(1.0, POSE, 0.0, {})
        self.assertIsNot(d.tracker, first)
        self.assertEqual(d.loaded, ["lanes", "lanes"])

    def test_finishing_a_route_reports_arrival_once_the_supervisor_asks(self):
        for state, key in (("ENTER", "checker_crossing"), ("LAP", "checker_crossing"), ("EXIT_PIT", "checker_crossing"), ("TO_PIT", "at_pit_box")):
            s = ScriptedSupervisor(out(state))
            d = driver(s)
            d.step(0.0, POSE, 0.0, {})
            self.assertNotIn(key, s.seen[-1])
            d.tracker.done = True
            self.assertEqual(d.step(1.0, POSE, 0.0, {}), (0.0, 0.0))
            d.step(2.0, POSE, 0.0, {})
            self.assertTrue(s.seen[-1][key])

    def test_parking_is_judged_by_the_callback(self):
        for answer in (True, False):
            s = ScriptedSupervisor(out("PARK"))
            d = driver(s, in_box=lambda pose, box: answer)
            d.step(0.0, POSE, 0.0, {})
            d.tracker.done = True
            d.step(1.0, POSE, 0.0, {})
            d.step(2.0, POSE, 0.0, {})
            self.assertEqual(s.seen[-1]["in_assigned_box"], answer)

    def test_passes_observations_and_odometry_through(self):
        s = ScriptedSupervisor(out("LAP"))
        driver(s).step(0.0, POSE, 1.5, {"tag_id": 3})
        self.assertEqual((s.seen[0]["tag_id"], s.seen[0]["odometry_m"]), (3, 1.5))

    def test_spins_the_short_way_before_a_route_that_starts_facing_elsewhere(self):
        d = driver(ScriptedSupervisor(out("EXIT_PIT")), heading=2.0)
        self.assertEqual(d.step(0.0, POSE, 0.0, {}), (0.0, SPIN_RATE_RAD_S))
        d = driver(ScriptedSupervisor(out("EXIT_PIT")), heading=-2.0)
        self.assertEqual(d.step(0.0, POSE, 0.0, {}), (0.0, -SPIN_RATE_RAD_S))

    def test_the_spin_slows_near_the_end_then_the_route_begins(self):
        d = driver(ScriptedSupervisor(out("EXIT_PIT")), heading=1.0)
        d.step(0.0, POSE, 0.0, {})
        _, near = d.step(1.0, (10.0, 10.0, 0.8), 0.0, {})
        self.assertAlmostEqual(near, 0.6)
        _, last = d.step(2.0, (10.0, 10.0, 1.0 - FACING_RAD - 0.01), 0.0, {})
        self.assertEqual(last, LEAST_SPIN_RATE_RAD_S)
        self.assertEqual(d.step(3.0, (10.0, 10.0, 1.0), 0.0, {}), (10.0, 0.5))

    def test_a_small_start_error_is_left_to_the_tracker(self):
        d = driver(ScriptedSupervisor(out("LAP")), heading=0.2)
        self.assertEqual(d.step(0.0, POSE, 0.0, {}), (10.0, 0.5))

    def test_heading_error_during_a_route_never_starts_a_spin(self):
        d = driver(ScriptedSupervisor(out("LAP")))
        d.step(0.0, POSE, 0.0, {})
        self.assertEqual(d.step(1.0, (10.0, 10.0, 3.0), 0.0, {}), (10.0, 0.5))

    def test_recovery_backs_up(self):
        d = driver(ScriptedSupervisor(out("LAP"), out("LAP", motion="recover")))
        d.step(0.0, POSE, 0.0, {})
        self.assertEqual(d.step(1.0, POSE, 0.0, {}), (RECOVER_SPEED_IN_S, 0.0))

    def test_preset_speed_scale_keeps_the_turn_radius(self):
        d = driver(ScriptedSupervisor(out("LAP", scale=0.5)))
        self.assertEqual(d.step(0.0, POSE, 0.0, {}), (5.0, 0.25))


class RouteFileTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.folder = tempfile.TemporaryDirectory()
        cls.names = build_pico_bundle.build(cls.folder.name)
        cls.routes = os.path.join(cls.folder.name, "routes")
        with open(build_pico_bundle.LIBRARY, encoding="utf-8") as f:
            cls.library = json.load(f)

    @classmethod
    def tearDownClass(cls):
        cls.folder.cleanup()

    def test_every_route_the_driver_asks_for_exists(self):
        expected = {"enter", "lanes"} | set(self.library["lines"]) | {f"{leg}_{box}" for leg in ("to_pit", "exit_pit") for box in (1, 2, 3)}
        self.assertEqual(set(self.names), expected)

    def test_a_route_survives_packing(self):
        table = route_store.load(os.path.join(self.routes, "lanes.rt"))
        source = self.library["laps"]["lanes"]
        self.assertAlmostEqual(table["step_in"], source["step_in"], places=5)
        for column in route_store.COLUMNS:
            self.assertEqual(len(table[column]), len(source[column]))
            for a, b in zip(table[column], source[column]):
                self.assertAlmostEqual(a, b, places=4)

    def test_rejects_a_file_that_is_not_a_route(self):
        bad = os.path.join(self.folder.name, "bad.rt")
        with open(bad, "wb") as f:
            f.write(b"not a route file")
        with self.assertRaises(ValueError):
            route_store.load(bad)

    def test_rejects_a_truncated_route(self):
        with open(os.path.join(self.routes, "lanes.rt"), "rb") as f:
            data = f.read()
        bad = os.path.join(self.folder.name, "short.rt")
        with open(bad, "wb") as f:
            f.write(data[:-40])
        with self.assertRaises(ValueError):
            route_store.load(bad)

    def test_the_bundle_stays_within_micropython(self):
        self.assertEqual(micropython_lint.lint(self.folder.name), [])

    def test_routes_are_small_enough_for_the_board(self):
        sizes = [p.stat().st_size for p in pathlib.Path(self.routes).glob("*.rt")]
        self.assertLess(sum(sizes), 150 * 1024)     # of 4 MB flash
        self.assertLess(max(sizes), 6 * 1024)       # one route in RAM, of 520 KB

    def test_main_does_not_start_a_mission(self):
        with open(os.path.join(self.folder.name, "main.py"), encoding="utf-8") as f:
            self.assertNotIn("mission", f.read().lower())


class WholeMissionTests(unittest.TestCase):
    NOMINAL = (11.1, 0.25, 4.0)

    @classmethod
    def setUpClass(cls):
        cls.folder = tempfile.TemporaryDirectory()
        build_pico_bundle.write_routes(cls.folder.name)
        with open(os.path.join(ROOT, "derived", "envelope-v10", "report.json"), encoding="utf-8") as f:
            cls.envelope = json.load(f)["planning_envelopes"]["conservative"]

    @classmethod
    def tearDownClass(cls):
        cls.folder.cleanup()

    def mission(self, **kwargs):
        return full_mission.run(self.folder.name, "lanes", kwargs.pop("box", 1), self.NOMINAL, self.envelope, 100, **kwargs)

    def test_clean_mission_finishes_and_parks(self):
        r = self.mission()
        self.assertEqual((r["state"], r["laps"], r["exchange"], r["parked"]), ("DONE", 3, "done", True))
        self.assertEqual((r["wall_contact_laps"], r["recoveries"], r["safety_stopped"]), (0, 0, False))
        self.assertGreater(r["spin_s"], 1.0)
        self.assertLess(r["finish_s"], 165.0)

    def test_a_failed_exchange_still_finishes(self):
        r = self.mission(box=3, exchange_works=False)
        self.assertEqual((r["state"], r["exchange"], r["parked"]), ("DONE", "bailed out", True))

    def test_drive_only_preset_skips_the_exchange(self):
        r = self.mission(box=2, preset="drive_only")
        self.assertEqual((r["state"], r["exchange"], r["parked"]), ("DONE", "skipped", True))


if __name__ == "__main__":
    unittest.main()
