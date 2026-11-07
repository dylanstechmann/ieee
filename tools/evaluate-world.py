"""Compare the trained policy against the classical baseline and the random policy on the evaluation
seeds for one ruleset world, and seal ``derived/rl-v3/<world>``.

Agent-run synthetic study. ``classical`` delegates to the supervised planner, ``random`` emits uniform
actions, and ``learned`` is the linear policy trained by ``tools/train-world.py`` (weights read from
``derived/rl-v3/<world>/trained-weights.json``). Total reward, steps, completion, contact steps and the
score-like are recorded for each on the reserved evaluation seeds 100-119.

Usage:
  uv run --no-project --python 3.12 python -B -I tools/evaluate-world.py --world world-ccw-line-sq-adv-align
"""
import argparse
import hashlib
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "software"))
from stockcar import policies, ruleset  # noqa: E402
from stockcar.mission_worlds import WorldMissionEnv  # noqa: E402

DATE = "2026-11-07"
MAX_STEPS = 4000


def world_inputs(world):
    """Every non-tool dependency whose change should invalidate the seal."""
    return ["tools/evaluate-world.py", "software/stockcar/policies.py",
            "software/stockcar/mission.py", "software/stockcar/mission_worlds.py",
            "software/stockcar/world_routes.py", "software/stockcar/world_geometry.py",
            "software/stockcar/world_layouts.py", "software/stockcar/ruleset.py",
            "software/stockcar/worlds.json", "software/stockcar/DEFAULT_WORLD",
            "software/stockcar/supervisor.py", "software/stockcar/lapmodel.py",
            "software/stockcar/passage.py", "software/stockcar/field.py",
            "software/stockcar/obstacles.py", "software/stockcar/geometry.py",
            "software/stockcar/sensors.py", "software/stockcar/sensors_camera.py",
            "software/stockcar/estimator.py", "derived/organizer-cad-v10/field-v10.json",
            f"derived/rl-v3/{world}/trained-weights.json",
            f"derived/rl-v3/{world}/training.json"]


def load_weights(out):
    return json.loads((out / "trained-weights.json").read_text(encoding="utf-8"))["weights"]


def _lane_steps(info):
    value = info.get("lane_violation_steps", 0)
    return sum(value) if isinstance(value, (list, tuple)) else int(value)


def _lane_fallback(info):
    plan = info.get("lane_plan") or {}
    return any(isinstance(side, dict) and side.get("fallback") for side in plan.values())


def run_one(seed, make_policy, world):
    policy = make_policy(seed)
    env = WorldMissionEnv(world, evaluation=True)
    obs, _meta = env.reset(seed)
    total_reward = 0.0
    steps = 0
    info = None
    for _ in range(MAX_STEPS):
        obs, reward, done, _trunc, info = env.step(policy(obs))
        total_reward += reward
        steps += 1
        if done:
            break
    return info, total_reward, steps


def cell(name, make_policy, world, seeds):
    runs = [run_one(seed, make_policy, world) for seed in seeds]
    completed = sum(1 for info, _, _ in runs if info["state"] == "DONE")
    rewards = [r for _, r, _ in runs]
    scores = [info["score_like"] for info, _, _ in runs]
    step_counts = [s for _, _, s in runs]
    wall = sum(sum(info["wall_contact_steps"]) for info, _, _ in runs)
    vehicle = sum(sum(info["vehicle_contact_steps"]) for info, _, _ in runs)
    out = {"policy": name, "runs": len(runs), "completed": completed,
           "mean_total_reward": round(sum(rewards) / len(rewards), 3),
           "mean_score_like": round(sum(scores) / len(scores), 2),
           "mean_steps": round(sum(step_counts) / len(step_counts), 1),
           "max_steps": max(step_counts),
           "total_vehicle_contact_steps": vehicle,
           "total_wall_contact_steps": wall}
    if ruleset.get(world)["lane_rule"] == "enforced":
        out["total_lane_violations"] = sum(int(info.get("lane_violations", 0)) for info, _, _ in runs)
        out["total_lane_violation_steps"] = sum(_lane_steps(info) for info, _, _ in runs)
        out["runs_with_lane_plan_fallback"] = sum(1 for info, _, _ in runs if _lane_fallback(info))
    return out


def main():
    ap = argparse.ArgumentParser(description="Evaluate classical/random/learned on one world and seal it.")
    ap.add_argument("--world", default=None,
                    help="world name (default: software/stockcar/DEFAULT_WORLD)")
    args = ap.parse_args()
    world = args.world or ruleset.default_name()
    if world not in ruleset.world_names():
        raise SystemExit(f"unknown world {world!r}; available: {ruleset.world_names()}")

    out = ROOT / "derived" / "rl-v3" / world
    seeds = list(WorldMissionEnv.EVAL)
    learned_weights = load_weights(out)
    factories = {
        "classical": lambda seed: policies.make("classical", seed),
        "random": lambda seed: policies.make("random", seed),
        "learned": lambda seed: policies.LearnedPolicy(learned_weights),
    }
    results = [cell(name, factory, world, seeds) for name, factory in factories.items()]
    out.mkdir(parents=True, exist_ok=True)
    report = {"version": "0.1.0", "date": DATE, "world": world,
              "status": "agent-run; one linear policy trained by CEM, none matched to a hardware robot",
              "max_steps": MAX_STEPS, "seeds": seeds, "results": results}
    spec = ruleset.get(world)
    enforced = spec["lane_rule"] == "enforced"
    header = ["| policy | completed | mean total reward | mean score-like | mean steps | max steps | vehicle contact steps | wall contact steps |"]
    divider = ["|---|---:|---:|---:|---:|---:|---:|---:|"]
    if enforced:
        header[0] = header[0] + " lane violations | lane violation steps | lane-plan fallback runs |"
        divider[0] += "---:|---:|---:|"
    summary = ["# RL v3: trained linear policy vs the classical baseline and random "
               f"({world})", "",
               f"{DATE}. Agent-run synthetic study over the reserved evaluation seeds 100-119 "
               f"for ruleset world `{world}`. `classical` delegates to the supervised planner; "
               "`random` emits uniform actions; and `learned` is a 38-weight linear policy trained "
               "by the cross-entropy method (`tools/train-world.py`) on training seeds only.", ""]
    summary += header + divider
    for r in results:
        row = (f"| {r['policy']} | {r['completed']}/{r['runs']} | {r['mean_total_reward']} | "
               f"{r['mean_score_like']} | {r['mean_steps']} | {r['max_steps']} | "
               f"{r['total_vehicle_contact_steps']} | {r['total_wall_contact_steps']} |")
        if enforced:
            row += (f" {r['total_lane_violations']} | {r['total_lane_violation_steps']} | "
                    f"{r['runs_with_lane_plan_fallback']} |")
        summary.append(row)
    summary += ["", "The learned policy is reported as measured against the supervised planner and "
                "is not expected to match or beat it. Training details and the curve are in "
                "`training.json`; the weights are in `trained-weights.json`."]
    if enforced:
        summary += ["", "Enforced-lane marking contacts are training-reward penalties only: the "
                    "competition-like `score_like` is unchanged. `lane violations` counts new "
                    "straightaway white-line contact entries; `lane violation steps` counts steps "
                    "in contact; fallback runs fell back to the baseline route because no legal "
                    "physical-lane assignment existed."]
    if spec["obstacle"] == "small":
        summary += ["", "The QA03 obstacle footprint is the hypothetical 8 × 4 in toy in "
                    "`ruleset.SMALL_TOY`, explicitly unverified; it is not an official measurement."]
    files = {"report.json": json.dumps(report, indent=1) + "\n",
             "summary.md": "\n".join(summary) + "\n"}
    for name, text in files.items():
        (out / name).write_text(text, encoding="utf-8")
    manifest = {"date": DATE, "status": report["status"], "world": world,
                "input_hashes": {f: hashlib.sha256((ROOT / f).read_bytes()).hexdigest()
                                 for f in world_inputs(world)},
                "output_hashes": {n: hashlib.sha256(t.encode("utf-8")).hexdigest()
                                  for n, t in files.items()}}
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)}: world {world}, "
          f"{len(results)} policies, {sum(r['runs'] for r in results)} runs")


if __name__ == "__main__":
    main()