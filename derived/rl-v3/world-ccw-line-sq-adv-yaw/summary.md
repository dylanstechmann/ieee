# RL v3: trained linear policy vs the classical baseline and random (world-ccw-line-sq-adv-yaw)

2026-11-07. Agent-run synthetic study over the reserved evaluation seeds 100-119 for ruleset world `world-ccw-line-sq-adv-yaw`. `classical` delegates to the supervised planner; `random` emits uniform actions; and `learned` is a 38-weight linear policy trained by the cross-entropy method (`tools/train-world.py`) on training seeds only.

| policy | completed | mean total reward | mean score-like | mean steps | max steps | vehicle contact steps | wall contact steps |
|---|---:|---:|---:|---:|---:|---:|---:|
| classical | 20/20 | 44.958 | 282.25 | 1644.9 | 1887 | 11306 | 350 |
| random | 0/20 | -8.103 | 10.0 | 3575.0 | 3575 | 7661 | 32881 |
| learned | 20/20 | 39.593 | 244.75 | 1891.7 | 2172 | 8580 | 12949 |

The learned policy is reported as measured against the supervised planner and is not expected to match or beat it. Training details and the curve are in `training.json`; the weights are in `trained-weights.json`.
