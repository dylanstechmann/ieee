"""Evaluate the RL-vs-classical harness: the classical baseline against a random policy.

Agent-run synthetic study on the reserved evaluation seeds 100-119. Both policies drive the
``MissionEnv`` gym-style interface — ``classical`` delegates to the supervised planner, ``random``
emits uniform actions — and total reward, step count, completion, contact steps and the score-like
are recorded per step for each. This is the scaffold a trained policy will later drop into; no
reinforcement-learning policy has been trained.

Usage: uv run --no-project --python 3.12 python -B -I tools/evaluate-rl-v1.py
"""
import hashlib
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "software"))
from stockcar import mission  # noqa: E402
from stockcar import policies  # noqa: E402

OUT = ROOT / "derived" / "rl-v1"
DATE = "2026-11-06"
SEEDS = list(mission.MissionEnv.EVAL)
MAX_STEPS = 4000
POLICY_NAMES = ["classical", "random"]
INPUTS = ["tools/evaluate-rl-v1.py", "software/stockcar/policies.py",
          "software/stockcar/mission.py", "software/stockcar/supervisor.py",
          "software/stockcar/lapmodel.py", "software/stockcar/passage.py",
          "software/stockcar/field.py", "software/stockcar/obstacles.py",
          "software/stockcar/geometry.py", "software/stockcar/sensors.py",
          "software/stockcar/estimator.py", "derived/organizer-cad-v10/field-v10.json"]


def run_one(seed, name):
    policy = policies.make(name, seed)
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


def cell(name):
    runs = [run_one(seed, name) for seed in SEEDS]
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
    results = [cell(name) for name in POLICY_NAMES]
    OUT.mkdir(parents=True, exist_ok=True)
    report = {"version": "0.1.0", "date": DATE,
              "status": "agent-run evaluation scaffold; no RL policy has been trained",
              "max_steps": MAX_STEPS, "seeds": SEEDS, "results": results}
    summary = ["# RL v1: classical baseline vs a random policy (scaffold)", "",
               f"{DATE}. Agent-run synthetic harness over the reserved evaluation seeds 100-119. "
               "`classical` delegates to the supervised planner; `random` emits uniform actions. "
               "Total reward, steps, completion, contact steps and the score-like are recorded for "
               "both, so a trained policy can later be compared against the same baseline.", "",
               "| policy | completed | mean total reward | mean score-like | mean steps | max steps | vehicle contact steps | wall contact steps |",
               "|---|---:|---:|---:|---:|---:|---:|---:|"]
    for r in results:
        summary.append(f"| {r['policy']} | {r['completed']}/{r['runs']} | {r['mean_total_reward']} | "
                       f"{r['mean_score_like']} | {r['mean_steps']} | {r['max_steps']} | "
                       f"{r['total_vehicle_contact_steps']} | {r['total_wall_contact_steps']} |")
    summary += ["", "No reinforcement-learning policy has been trained. `random` proves the "
                "`MissionEnv` interface is drivable by an explicit action and that the metrics "
                "separate it from the baseline. Register a learned policy in "
                "`software/stockcar/policies.py` and regenerate to compare it here."]
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