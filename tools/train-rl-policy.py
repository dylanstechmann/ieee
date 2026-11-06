"""Train the project's first RL policy with the cross-entropy method, dependency-free.

A cross-entropy method (CEM) searches the 40 weights of a linear ``LearnedPolicy`` directly against
simulated missions on a fixed set of training seeds, maximising total episode reward. The resulting
weights and training metadata are written to ``derived/rl-v2/`` so ``tools/evaluate-rl-v2.py`` can
compare the learned policy against the classical baseline and the random policy on the held-out
evaluation seeds 100-119. No gradients or third-party RL library are used.

Usage: uv run --no-project --python 3.12 python -B -I tools/train-rl-policy.py
"""
import json
import pathlib
import random
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "software"))
from stockcar import mission  # noqa: E402
from stockcar.policies import LearnedPolicy  # noqa: E402

OUT = ROOT / "derived" / "rl-v2"
DATE = "2026-11-06"
MASTER_SEED = 20261106
POPULATION = 16            # sampled candidates per generation (the current mean is evaluated too)
ELITE = 4
GENERATIONS = 10
TRAIN_SEEDS = [0, 1, 2, 3]   # training seeds; evaluation seeds 100-119 are never touched
MAX_STEPS = 1200           # a step budget cap; episodes also self-terminate on the supervisor's auto-stop
INIT_STD = 0.5
MIN_STD = 0.05


def episode_reward(weights, seed):
    policy = LearnedPolicy(weights)
    env = mission.MissionEnv(evaluation=False)   # training seeds live in 0..99
    obs, _meta = env.reset(seed)
    total = 0.0
    for _ in range(MAX_STEPS):
        obs, reward, done, _truncated, _info = env.step(policy(obs))
        total += reward
        if done:
            break
    return total


def fitness(weights):
    return sum(episode_reward(weights, seed) for seed in TRAIN_SEEDS)


def main():
    rng = random.Random(MASTER_SEED)
    n = len(LearnedPolicy.zero_weights())
    mean = LearnedPolicy.zero_weights()
    std = [INIT_STD] * n
    best_weights = list(mean)
    best_fitness = fitness(mean)
    curve = []

    for generation in range(GENERATIONS):
        candidates = [best_weights] + [
            [mean[j] + rng.gauss(0.0, std[j]) for j in range(n)]
            for _ in range(POPULATION)
        ]
        scored = sorted(((fitness(c), c) for c in candidates), key=lambda item: -item[0])
        if scored[0][0] > best_fitness:
            best_fitness, best_weights = scored[0][0], list(scored[0][1])
        elite = [c for _, c in scored[:ELITE]]
        mean = [sum(c[j] for c in elite) / ELITE for j in range(n)]
        variance = [sum((c[j] - mean[j]) ** 2 for c in elite) / ELITE for j in range(n)]
        std = [max(MIN_STD, v ** 0.5) for v in variance]
        curve.append({"generation": generation, "best_fitness": round(best_fitness, 3),
                      "mean_fitness": round(scored[0][0], 3)})
        print(f"generation {generation}: best fitness {best_fitness:.3f}", flush=True)

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "trained-weights.json").write_text(json.dumps({"weights": [round(w, 6) for w in best_weights]}),
                                               encoding="utf-8")
    training = {"date": DATE, "method": "cross-entropy method (CEM)", "master_seed": MASTER_SEED,
                "population": POPULATION, "elite": ELITE, "generations": GENERATIONS,
                "train_seeds": TRAIN_SEEDS, "max_steps": MAX_STEPS,
                "best_fitness": round(best_fitness, 3), "weight_count": n, "curve": curve}
    (OUT / "training.json").write_text(json.dumps(training, indent=1) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: best fitness {best_fitness:.3f} over {len(TRAIN_SEEDS)} train seeds")


if __name__ == "__main__":
    main()