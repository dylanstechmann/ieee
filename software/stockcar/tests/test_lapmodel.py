import math
import unittest

from stockcar import lapmodel as L


class LapModelTests(unittest.TestCase):
    def test_uturn_time_is_speed_limited(self):
        env = L.ENVELOPES["v9"]
        expected = (math.pi * L.UTURN_RADIUS_IN + L.UTURN_TRANSITION_IN) / min(env["cruise"], math.sqrt(env["lat_accel"] * L.UTURN_RADIUS_IN))
        self.assertAlmostEqual(L.uturn_time(env), expected)

    def test_clean_lap_at_v9_cruise_beats_the_v9_stop_and_spin_lap(self):
        env = L.ENVELOPES["v9"]
        lap = L.lap_time(env, [{"mode": "straight"}, {"mode": "straight"}])
        self.assertLess(lap, 29.6)  # v9's stop-spin-settle lap took 29.6 s at the same cruise speed

    def test_lane_change_and_contact_cost_time(self):
        env = L.ENVELOPES["nominal"]
        base = L.straight_time(env, "straight")
        self.assertGreater(L.straight_time(env, "lane_change", path_cost_in=60.0), base)
        self.assertAlmostEqual(L.straight_time(env, "contact", contacts=2), base + 2 * L.CONTACT_PENALTY_S)

    def test_score_rules(self):
        self.assertEqual(L.expected_score(150.0, True, p_exchange=1.0), 25 + 10 + 45 + 25 + 100 + 15 + 30 + 75 + 65)
        self.assertEqual(L.expected_score(170.0, False, exchange=False), 25 + 10 + 45 + 25 + 100 + 15)
        self.assertEqual(L.expected_score(200.0, False, exchange=False), 25 + 10 + 45 + 25)


if __name__ == "__main__":
    unittest.main()
