import unittest

from stockcar import policies


OBS = [0.5] * 19


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


class RegistryTests(unittest.TestCase):
    def test_make_returns_a_callable_and_rejects_unknown_names(self):
        self.assertIsNone(policies.make("classical", 0)(OBS))
        self.assertEqual(len(policies.make("random", 0)(OBS)), 2)
        with self.assertRaises(KeyError):
            policies.make("not-a-policy")