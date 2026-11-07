# RL v3: trained linear policy vs the classical baseline and random (world-ccw-line-sq-enf-align)

2026-11-07. Agent-run synthetic study over the reserved evaluation seeds 100-119 for ruleset world `world-ccw-line-sq-enf-align`. `classical` delegates to the supervised planner; `random` emits uniform actions; and `learned` is a 38-weight linear policy trained by the cross-entropy method (`tools/train-world.py`) on training seeds only.

| policy | completed | mean total reward | mean score-like | mean steps | max steps | vehicle contact steps | wall contact steps | lane violations | lane violation steps | lane-plan fallback runs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| classical | 20/20 | 28.081 | 265.5 | 1679.6 | 1841 | 10727 | 1118 | 162 | 14658 | 20 |
| random | 0/20 | -14.003 | 10.0 | 3575.0 | 3575 | 8439 | 32881 | 58 | 7646 | 20 |
| learned | 0/20 | 0.448 | 27.5 | 964.1 | 2362 | 4671 | 8945 | 12 | 2123 | 20 |

The learned policy is reported as measured against the supervised planner and is not expected to match or beat it. Training details and the curve are in `training.json`; the weights are in `trained-weights.json`.

Enforced-lane marking contacts are training-reward penalties only: the competition-like `score_like` is unchanged. `lane violations` counts new straightaway white-line contact entries; `lane violation steps` counts steps in contact; fallback runs fell back to the baseline route because no legal physical-lane assignment existed.
