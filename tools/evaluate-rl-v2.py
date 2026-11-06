"""Compare the trained policy against the classical baseline and the random policy on the evaluation
seeds, and seal ``derived/rl-v2``.

Agent-run synthetic study. ``classical`` delegates to the supervised planner, ``random`` emits uniform
actions, and ``learned`` is the linear policy trained by ``tools/train-rl-policy.py`` (weights read
from ``derived/rl-v2/trained-weights.json``). Total reward, steps, completion, contact steps and the
score-like are recorded for each on the reserved evaluation seeds 100-119.

Usage: uv run --no-project --python 3.12 python -B -I tools/evaluate-rl-v2.py
"""
import hashlib
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "software"))
from stockcar import mission  # noqa: E402
from stockcar import policies  # noqa: E402

OUT = ROOT / "derived" / "rl-v2"
DATE = "2026-11-06"
SEEDS = list(mission.MissionEnv.EVAL)
MAX_STEPS = 4000
INPUTS = ["tools/evaluate-rl-v2.py", "software/stockcar/policies.py",
          "software/stockcar/mission.py", "software/stockcar/supervisor.py",
          "software/stockcar/lapmodel.py", "software/stockcar/passage.py",
          "software/stockcar/field.py", "software/stockcar/obstacles.py",
          "software/stockcar/geometry.py", "software/stockcar/sensors.py",
          "software/stockcar/estimator.py", "derived/organizer-cad-v10/field-v10.json",
          "derived/rl-v2/trained-weights.json", "derived/rl-v2/training.json"]


def load_weights():
    return json.loads((OUT / "trained-weights.json").read_text(encoding="utf-8"))["weights"]


def run_one(seed, make_policy):
    policy = make_policy(seed)
    env = mission.MissionEnv(evaluation=True)
    obs, _meta = env.reset(seed)
    total_reward = 0.0
    steps = 0
    info = None
    for _ in range(MAX_STEPS):
        obs, reward, done, _truncated, info = env.step(policy(obs))
        total_reward += reward
        steps += 1
        if done:
            break
    return info, total_reward, steps


def cell(name, make_policy):
    runs = [run_one(seed, make_policy) for seed in SEEDS]
    completed = sum(1 for info, _, _ in runs if info["state"] == "DONE")
    rewards = [r for _, r, _ in runs]
    scores = [info["score_like"] for info, _, _ in runs]
    step_counts = [s for _, _, s in runs]
    wall = sum(sum(info["wall_contact_steps"]) for info, _, _ in runs)
    vehicle = sum(sum(info["vehicle_contact_steps"]) for info, _, _ in runs)
    return {"policy": name, "runs": len(runs), "completed": completed,
            "mean_total_reward": round(sum(rewards) / len(rewards), 3),
            "mean_score_like": round(sum(scores) / len(scores), 2),
            "mean_steps": round(sum(step_counts) / len(step_counts), 1),
            "max_steps": max(step_counts),
            "total_vehicle_contact_steps": vehicle,
            "total_wall_contact_steps": wall}


def main():
    learned_weights = load_weights()
    factories = {
        "classical": lambda seed: policies.make("classical", seed),
        "random": lambda seed: policies.make("random", seed),
        "learned": lambda seed: policies.LearnedPolicy(learned_weights),
    }
    results = [cell(name, factory) for name, factory in factories.items()]
    OUT.mkdir(parents=True, exist_ok=True)
    report = {"version": "0.2.0", "date": DATE,
              "status": "agent-run; one linear policy trained by CEM, none matched to a hardware robot",
              "max_steps": MAX_STEPS, "seeds": SEEDS, "results": results}
    summary = ["# RL v2: trained linear policy vs the classical baseline and random", "",
               f"{DATE}. Agent-run synthetic study over the reserved evaluation seeds 100-119. "
               "`classical` delegates to the supervised planner; `random` emits uniform actions; and "
               "`learned` is a 38-weight linear policy trained by the cross-entropy method "
               "(`tools/train-rl-policy.py`) on training seeds %s only." % ", ".join(str(s) for s in json.loads((OUT / "training.json").read_text(encoding="utf-8"))["train_seeds"]), "",
               "| policy | completed | mean total reward | mean score-like | mean steps | max steps | vehicle contact steps | wall contact steps |",
               "|---|---:|---:|---:|---:|---:|---:|---:|"]
    for r in results:
        summary.append(f"| {r['policy']} | {r['completed']}/{r['runs']} | {r['mean_total_reward']} | "
                       f"{r['mean_score_like']} | {r['mean_steps']} | {r['max_steps']} | "
                       f"{r['total_vehicle_contact_steps']} | {r['total_wall_contact_steps']} |")
    summary += ["", "The learned policy is the first trained result; it is compared verbatim and is "
                "not expected to match the supervised planner. Training details and the curve are in "
                "`training.json`; the weights are in `trained-weights.json`."]
    files = {"report.json": json.dumps(report, indent=1) + "\n",
             "summary.md": "\n".join(summary) + "\n"}
    for name, text in files.items():
        (OUT / name).write_text(text, encoding="utf-8")
    manifest = {"date": DATE, "status": report["status"],
                "input_hashes": {f: hashlib.sha256((ROOT / f).read_bytes()).hexdigest() for f in INPUTS},
                "output_hashes": {n: hashlib.sha256(t.encode("utf-8")).hexdigest() for n, t in files.items()}}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(results)} policies, {sum(r['runs'] for r in results)} runs")


if __name__ == "__main__":
    main()