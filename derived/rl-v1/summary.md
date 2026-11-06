# RL v1: classical baseline vs a random policy (scaffold)

2026-11-06. Agent-run synthetic harness over the reserved evaluation seeds 100-119. `classical` delegates to the supervised planner; `random` emits uniform actions. Total reward, steps, completion, contact steps and the score-like are recorded for both, so a trained policy can later be compared against the same baseline.

| policy | completed | mean total reward | mean score-like | mean steps | max steps | vehicle contact steps | wall contact steps |
|---|---:|---:|---:|---:|---:|---:|---:|
| classical | 20/20 | 44.534 | 267.75 | 1681.6 | 1841 | 10829 | 793 |
| random | 0/20 | -8.203 | 10.0 | 3575.0 | 3575 | 8439 | 32881 |

No reinforcement-learning policy has been trained. `random` proves the `MissionEnv` interface is drivable by an explicit action and that the metrics separate it from the baseline. Register a learned policy in `software/stockcar/policies.py` and regenerate to compare it here.
