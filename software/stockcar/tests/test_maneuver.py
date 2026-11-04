import math
import unittest

from stockcar import mission, profile, routes
from stockcar.field import Field
from stockcar.geometry import rectangle, separation
from stockcar.tracker import Tracker, wrap

LIMITS = {"top": 16.0, "wheel": 16.0, "half_track": 4.0, "lateral": 40.0, "yaw_rate": 4.0, "yaw_accel": 6.0, "accel": 24.0, "brake": 40.0}


def straight(length):
    return [(float(x), 0.0) for x in range(int(length) + 1)]


def circle(radius, turn, n=400):
    return [(radius * math.sin(turn * k / n), radius * (1 - math.cos(turn * k / n))) for k in range(n + 1)]


class ProfileTests(unittest.TestCase):
    def test_resample_is_even_and_keeps_the_ends(self):
        pts, step = profile.resample([(0.0, 0.0), (3.0, 0.0), (3.0, 4.2)])
        self.assertEqual(pts[0], (0.0, 0.0))
        self.assertAlmostEqual(pts[-1][0], 3.0)
        self.assertAlmostEqual(pts[-1][1], 4.2)
        gaps = [math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(pts, pts[1:])]
        self.assertAlmostEqual(step, 7.2 / len(gaps))
        self.assertLessEqual(max(gaps), step + 1e-9)

    def test_smoothing_rounds_a_corner_and_keeps_the_ends(self):
        corner = [(0.0, 0.0), (20.0, 0.0), (20.0, 20.0)]
        pts = profile.smooth(corner, 4.0)
        self.assertEqual(pts[0], (0.0, 0.0))
        self.assertAlmostEqual(pts[-1][0], 20.0)
        self.assertAlmostEqual(pts[-1][1], 20.0)
        nearest = min(math.hypot(x - 20.0, y) for x, y in pts)
        self.assertGreater(nearest, 0.5)
        self.assertLess(nearest, 3.0)
        kappa = profile.curvatures(profile.headings(pts), 0.5)
        self.assertLess(max(abs(k) for k in kappa), 0.5)

    def test_smoothing_leaves_a_straight_line_alone(self):
        for x, y in profile.smooth(straight(30), 4.0):
            self.assertAlmostEqual(y, 0.0)
            self.assertLessEqual(x, 30.0)

    def test_headings_stay_continuous_past_half_a_turn(self):
        pts, _ = profile.resample(circle(7.5, 1.5 * 2 * math.pi))
        heads = profile.headings(pts)
        self.assertLess(max(abs(b - a) for a, b in zip(heads, heads[1:])), 0.2)
        self.assertAlmostEqual(heads[-1], 1.5 * 2 * math.pi, delta=0.1)

    def test_curvature_of_a_circle(self):
        pts, step = profile.resample(circle(7.5, math.pi))
        kappa = profile.curvatures(profile.headings(pts), step)
        mid = kappa[len(kappa) // 2]
        self.assertAlmostEqual(mid, 1 / 7.5, places=3)
        pts, step = profile.resample([(x, -y) for x, y in circle(7.5, math.pi)])
        self.assertAlmostEqual(profile.curvatures(profile.headings(pts), step)[len(pts) // 2], -1 / 7.5, places=3)

    def test_straight_run_matches_the_closed_form_trapezoid(self):
        table = profile.build(straight(100), LIMITS)
        v, a, b = 16.0, 24.0, 40.0
        cruise = 100 - v * v / (2 * a) - v * v / (2 * b)
        self.assertAlmostEqual(table["time_s"], v / a + v / b + cruise / v, delta=0.1)
        self.assertEqual((table["speed"][0], table["speed"][-1]), (0.0, 0.0))
        self.assertAlmostEqual(max(table["speed"]), v)

    def test_faster_wheel_sets_the_arc_speed(self):
        table = profile.build(circle(7.5, 2 * math.pi), LIMITS)
        mid = table["speed"][len(table["speed"]) // 2]
        self.assertAlmostEqual(mid, 16.0 / (1 + 4.0 / 7.5), delta=0.01)

    def test_each_limit_can_bind(self):
        arc = [1 / 7.5] * 20
        for key, value, expected in (("lateral", 10.0, math.sqrt(10.0 * 7.5)), ("yaw_rate", 1.0, 7.5), ("top", 5.0, 5.0)):
            caps = profile.speed_caps(arc, {**LIMITS, key: value}, 0.5)
            self.assertAlmostEqual(caps[10], expected, places=6)

    def test_a_sudden_change_of_curvature_caps_speed_by_yaw_acceleration(self):
        ramp = [0.01 * k for k in range(20)]
        caps = profile.speed_caps(ramp, {**LIMITS, "lateral": 1e9, "wheel": 1e9, "top": 1e9, "yaw_rate": 1e9}, 0.5)
        self.assertAlmostEqual(caps[10], math.sqrt(6.0 / 0.02), places=6)

    def test_speed_changes_stay_within_their_limits(self):
        table = profile.build(circle(7.5, math.pi) + [(x, 15.0) for x in range(-1, -40, -1)], LIMITS)
        step = table["step_in"]
        for a, b in zip(table["speed"], table["speed"][1:]):
            change = (b * b - a * a) / (2 * step)
            self.assertLessEqual(change, 24.0 + 1e-6)
            self.assertGreaterEqual(change, -40.0 - 1e-6)

    def test_cornering_takes_grip_from_speed_changes(self):
        self.assertLess(profile._share(10.0, 0.3, LIMITS), profile._share(10.0, 0.0, LIMITS))
        self.assertEqual(profile._share(20.0, 0.3, LIMITS), profile.LEAST_GRIP_SHARE)


class RouteTests(unittest.TestCase):
    def setUp(self):
        self.field = Field()

    def clearance(self, lines):
        table = profile.build(routes.lap(lines), LIMITS)
        barriers = self.field.barriers()
        return min(separation(rectangle(x, y, h, 10.0, 10.0), b) for x, y, h in zip(table["x"], table["y"], table["heading"]) for b in barriers)

    def test_a_lap_closes_at_the_gate_without_gaps(self):
        for lines in (routes.lane_lines(), routes.lines_for(self.field, next(routes.configurations()), 2.0)):
            pts = routes.lap(lines)
            self.assertEqual(pts[0], mission.GATE)
            self.assertAlmostEqual(pts[-1][0], mission.GATE[0], places=6)
            self.assertAlmostEqual(pts[-1][1], mission.GATE[1], places=6)
            self.assertLess(max(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(pts, pts[1:])), 1.0)

    def test_plain_lap_is_the_simulators_lap(self):
        sim = mission.MissionSim("aggressive", "nominal", field=self.field)
        sim.build_routes(mission.Layout([], 1, True))
        length = sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(routes.lap(routes.lane_lines()), routes.lap(routes.lane_lines())[1:]))
        self.assertAlmostEqual(length, sim.routes["LAP"].length, delta=0.1)

    def test_thirty_two_configurations_with_one_empty_quadrant(self):
        configs = list(routes.configurations())
        self.assertEqual(len(configs), 32)
        self.assertEqual(len({routes.key(c) for c in configs}), 32)
        for c in configs:
            self.assertEqual(sum(v is None for v in c.values()), 1)

    def test_the_line_passes_on_the_far_side_from_the_vehicle(self):
        f = self.field
        self.assertEqual(routes.pass_line(f, "low_west", "outer", 2.0), 23.5 - 5 - 2)     # vehicle by the wall: pass by the divider
        self.assertEqual(routes.pass_line(f, "low_east", "inner", 2.0), 1 + 5 + 2)        # vehicle by the divider: pass by the wall
        self.assertEqual(routes.pass_line(f, "high_west", "outer", 2.0), 24.5 + 5 + 2)
        self.assertEqual(routes.pass_line(f, "high_east", "inner", 2.0), 47 - 5 - 2)

    def test_an_empty_quadrant_takes_its_neighbors_line(self):
        config = {"low_west": None, "low_east": "inner", "high_west": "outer", "high_east": "outer"}
        lines = routes.lines_for(self.field, config, 2.0)
        self.assertEqual(lines["low_west"], lines["low_east"])

    def test_the_line_is_held_across_the_whole_straight(self):
        config = {"low_west": "inner", "low_east": "inner", "high_west": None, "high_east": "outer"}
        lines = routes.lines_for(self.field, config, 2.0)
        low = [p for p in routes.lap(lines) if 44.0 <= p[0] <= 80.0 and p[1] < 24.0]
        self.assertTrue(all(abs(p[1] - lines["low_west"]) < 1e-9 for p in low))

    def test_a_lane_change_reaches_both_lines_between_the_quadrants(self):
        config = {"low_west": "outer", "low_east": "inner", "high_west": None, "high_east": "outer"}
        lines = routes.lines_for(self.field, config, 2.0)
        pts = routes.lap(lines)
        y_at = {x: next(p[1] for p in pts if abs(p[0] - x) < 1e-9 and p[1] < 24.0) for x in (50.0, 62.0, 74.0)}
        self.assertAlmostEqual(y_at[50.0], lines["low_west"])
        self.assertAlmostEqual(y_at[74.0], lines["low_east"])
        self.assertAlmostEqual(y_at[62.0], (lines["low_west"] + lines["low_east"]) / 2)

    def test_every_configuration_clears_the_walls_at_two_inches(self):
        for config in routes.configurations():
            self.assertGreater(self.clearance(routes.lines_for(self.field, config, 2.0)), 0.5, routes.key(config))

    def test_hugging_too_closely_clips_a_corner(self):
        worst = min(self.clearance(routes.lines_for(self.field, c, 0.5)) for c in routes.configurations())
        self.assertLess(worst, 0.0)


class TrackerTests(unittest.TestCase):
    def setUp(self):
        self.table = profile.build(straight(60) + [(60 + x, y) for x, y in circle(10.0, math.pi)[1:]] + [(60.0 - x, 20.0) for x in range(1, 60)], LIMITS)

    def drive(self, x, y, heading, dt=0.01, seconds=40.0):
        """A kinematic robot that does exactly what the tracker asks."""
        tracker = Tracker(self.table)
        worst_late = 0.0
        for n in range(int(seconds / dt)):
            v, w, done = tracker.command(x, y, heading)
            if done:
                return tracker, worst_late, n * dt
            heading += w * dt / 2
            x, y = x + v * math.cos(heading) * dt, y + v * math.sin(heading) * dt
            heading += w * dt / 2
            if n * dt > 3.0:
                worst_late = max(worst_late, abs(tracker.errors[1]))
        self.fail("route not finished")

    def test_wrap(self):
        self.assertAlmostEqual(wrap(3 * math.pi / 2), -math.pi / 2)
        self.assertAlmostEqual(wrap(-3 * math.pi / 2), math.pi / 2)

    def test_on_the_route_it_returns_the_feed_forward(self):
        t = self.table
        i = 40
        tracker = Tracker(t, preview_s=0.0)
        tracker.index = i
        v, w, done = tracker.command(t["x"][i], t["y"][i], t["heading"][i])
        self.assertFalse(done)
        self.assertAlmostEqual(v, t["speed"][i])
        self.assertAlmostEqual(w, t["speed"][i] * t["curvature"][i])

    def test_error_to_the_side_steers_back(self):
        t = self.table
        tracker = Tracker(t)
        tracker.index = 40
        _, right_of_route, _ = tracker.command(t["x"][40], t["y"][40] - 1.0, 0.0)
        tracker.index = 40
        _, left_of_route, _ = tracker.command(t["x"][40], t["y"][40] + 1.0, 0.0)
        self.assertGreater(right_of_route, 0.0)
        self.assertLess(left_of_route, 0.0)

    def test_finishes_the_route_on_target(self):
        tracker, _, seconds = self.drive(0.0, 0.0, 0.0)
        self.assertEqual(tracker.index, len(self.table["x"]) - 1)
        self.assertLess(seconds, self.table["time_s"] + 3.0)

    def test_recovers_from_a_starting_offset(self):
        _, clean, _ = self.drive(0.0, 0.0, 0.0)
        _, late, _ = self.drive(0.0, 1.5, 0.2)
        self.assertLess(late, clean + 0.05)


if __name__ == "__main__":
    unittest.main()
