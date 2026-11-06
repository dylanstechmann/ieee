import math
import unittest

from stockcar import policies


OBS = [0.5] * 18


class ClassicalTests(unittest.TestCase):
    def test_delegates_to_the_classical_planner(self):
        p = policies.Classical(seed=0)
        self.assertIsNone(p(OBS))
        self.assertIsNone(p([0.0] * 19))


class RandomTests(unittest.TestCase):
    def test_returns_normalised_two_component_actions(self):
        p = policies.Random(seed=7)
        for _ in range(200):
            v, w = p(OBS)
            self.assertTrue(-1.0 <= v <= 1.0)
            self.assertTrue(-1.0 <= w <= 1.0)

    def test_deterministic_within_a_seed(self):
        a = [policies.Random(seed=3)(OBS) for _ in range(50)]
        b = [policies.Random(seed=3)(OBS) for _ in range(50)]
        self.assertEqual(a, b)

    def test_different_seeds_diverge(self):
        a = [policies.Random(seed=3)(OBS) for _ in range(20)]
        b = [policies.Random(seed=4)(OBS) for _ in range(20)]
        self.assertNotEqual(a, b)


class LearnedPolicyTests(unittest.TestCase):
    def test_rejects_wrong_weight_count(self):
        with self.assertRaises(ValueError):
            policies.LearnedPolicy([0.0] * 7)

    def test_zero_weights_are_40_and_policy_is_constant_zero(self):
        weights = policies.LearnedPolicy.zero_weights()
        self.assertEqual(len(weights), 38)
        p = policies.LearnedPolicy(weights)
        v, w = p(OBS)
        self.assertAlmostEqual(v, 0.0, places=6)
        self.assertAlmostEqual(w, 0.0, places=6)

    def test_actions_stay_in_bounds_for_large_weights(self):
        p = policies.LearnedPolicy([100.0] + [0.0] * 37)
        v, w = p(OBS)
        self.assertTrue(-1.0 <= v <= 1.0)
        self.assertTrue(-1.0 <= w <= 1.0)

    def test_forward_matches_hand_computation(self):
        # bias-only weights: w_v bias = 0.4, w_w bias = -0.4 (the 18th and 37th entries)
        weights = [0.0] * 38
        weights[18] = 0.4
        weights[37] = -0.4
        p = policies.LearnedPolicy(weights)
        v, w = p(OBS)
        self.assertAlmostEqual(v, math.tanh(0.4), places=6)
        self.assertAlmostEqual(w, math.tanh(-0.4), places=6)

    def test_deterministic_for_fixed_weights(self):
        p = policies.LearnedPolicy([0.01 * i for i in range(38)])
        self.assertEqual(p(OBS), p(OBS))


class RegistryTests(unittest.TestCase):
    def test_make_returns_a_callable_and_rejects_unknown_names(self):
        self.assertIsNone(policies.make("classical", 0)(OBS))
        self.assertEqual(len(policies.make("random", 0)(OBS)), 2)
        with self.assertRaises(KeyError):
            policies.make("not-a-policy")