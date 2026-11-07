# RL v3: trained linear policy vs the classical baseline and random (world-cw-line-sq-adv-align)

2026-11-07. Agent-run synthetic study over the reserved evaluation seeds 100-119 for ruleset world `world-cw-line-sq-adv-align`. `classical` delegates to the supervised planner; `random` emits uniform actions; and `learned` is a 38-weight linear policy trained by the cross-entropy method (`tools/train-world.py`) on training seeds only.

| policy | completed | mean total reward | mean score-like | mean steps | max steps | vehicle contact steps | wall contact steps |
|---|---:|---:|---:|---:|---:|---:|---:|
| classical | 20/20 | 41.912 | 249.75 | 1793.0 | 1958 | 11347 | 1044 |
| random | 0/20 | -8.203 | 10.0 | 3575.0 | 3575 | 8439 | 32881 |
| learned | 0/20 | 12.481 | 60.25 | 3575.0 | 3575 | 7429 | 45771 |

The learned policy is reported as measured against the supervised planner and is not expected to match or beat it. Training details and the curve are in `training.json`; the weights are in `trained-weights.json`.
