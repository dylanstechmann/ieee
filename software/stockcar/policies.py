"""Pluggable policies for the RL-vs-classical evaluation harness.

A policy maps the MissionSim observation vector (18 floats, see
``stockcar.mission.MissionSim.observe``) to a ``(v_cmd, w_cmd)`` action whose components lie in
[-1, 1], or returns ``None`` to delegate to the supervised classical planner
(``MissionSim.classical_action``). Returning ``None`` is how the coherent baseline runs through the
same ``MissionEnv`` gym-style loop as any explicit policy.

This module is the extension point for a future trained policy: register a new callable in
``POLICIES`` and it becomes a cell in ``derived/rl-v1`` the next time ``tools/evaluate-rl-v1.py`` is
regenerated. Standard library only; agent-run synthetic code. No reinforcement-learning policy has
been trained.
"""
import math
import random


class Classical:
    """Coherent baseline: delegate every step to the supervised classical planner."""

    name = "classical"

    def __init__(self, seed=0):
        pass

    def __call__(self, obs):
        return None


class Random:
    """Uniform-random actions from a seeded RNG.

    Deterministic for a fixed seed, which keeps the sealed package reproducible. It exists to prove
    the ``MissionEnv`` interface is drivable by an explicit policy and that the runner's metrics
    separate a policy that does nothing useful from the baseline.
    """

    name = "random"

    def __init__(self, seed=0):
        self.rng = random.Random(seed)

    def __call__(self, obs):
        return (self.rng.uniform(-1.0, 1.0), self.rng.uniform(-1.0, 1.0))


OBS_LEN = 18


class LearnedPolicy:
    """A small linear policy (``obs -> (v, w)``) whose weights come from ``tools/train-rl-policy.py``.

    The observation is augmented with a bias and each action component is a ``tanh`` of a linear
    mapping, so actions always lie in [-1, 1]. Standard library only; the trainer searches these
    weights directly against simulated missions (cross-entropy method), so no reward function is
    hand-coded into the policy itself.
    """

    name = "learned"

    def __init__(self, weights):
        n = 2 * (OBS_LEN + 1)
        if len(weights) != n:
            raise ValueError(f"expected {n} weights, got {len(weights)}")
        self.w_v = list(weights[:OBS_LEN + 1])
        self.w_w = list(weights[OBS_LEN + 1:])

    @staticmethod
    def zero_weights():
        return [0.0] * (2 * (OBS_LEN + 1))

    def __call__(self, obs):
        z_v = self.w_v[OBS_LEN]
        z_w = self.w_w[OBS_LEN]
        for i in range(OBS_LEN):
            z_v += self.w_v[i] * obs[i]
            z_w += self.w_w[i] * obs[i]
        return (math.tanh(z_v), math.tanh(z_w))


POLICIES = {"classical": Classical, "random": Random}


def make(name, seed=0):
    """Instantiate a policy by name; extend ``POLICIES`` to add a learned policy."""
    if name not in POLICIES:
        raise KeyError(f"unknown policy {name!r}; available: {sorted(POLICIES)}")
    return POLICIES[name](seed)