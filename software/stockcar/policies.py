"""Pluggable policies for the RL-vs-classical evaluation harness.

A policy maps the MissionSim observation vector (19 floats, see
``stockcar.mission.MissionSim.observe``) to a ``(v_cmd, w_cmd)`` action whose components lie in
[-1, 1], or returns ``None`` to delegate to the supervised classical planner
(``MissionSim.classical_action``). Returning ``None`` is how the coherent baseline runs through the
same ``MissionEnv`` gym-style loop as any explicit policy.

This module is the extension point for a future trained policy: register a new callable in
``POLICIES`` and it becomes a cell in ``derived/rl-v1`` the next time ``tools/evaluate-rl-v1.py`` is
regenerated. Standard library only; agent-run synthetic code. No reinforcement-learning policy has
been trained.
"""
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


POLICIES = {"classical": Classical, "random": Random}


def make(name, seed=0):
    """Instantiate a policy by name; extend ``POLICIES`` to add a learned policy."""
    if name not in POLICIES:
        raise KeyError(f"unknown policy {name!r}; available: {sorted(POLICIES)}")
    return POLICIES[name](seed)