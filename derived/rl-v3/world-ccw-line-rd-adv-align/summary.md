# RL v3: trained linear policy vs the classical baseline and random (world-ccw-line-rd-adv-align)

2026-11-07. Agent-run synthetic study over the reserved evaluation seeds 100-119 for ruleset world `world-ccw-line-rd-adv-align`. `classical` delegates to the supervised planner; `random` emits uniform actions; and `learned` is a 38-weight linear policy trained by the cross-entropy method (`tools/train-world.py`) on training seeds only.

| policy | completed | mean total reward | mean score-like | mean steps | max steps | vehicle contact steps | wall contact steps |
|---|---:|---:|---:|---:|---:|---:|---:|
| classical | 20/20 | 46.677 | 283.5 | 1660.2 | 1819 | 9772 | 25 |
| random | 0/20 | -8.203 | 10.0 | 3575.0 | 3575 | 7591 | 26414 |
| learned | 0/20 | 8.371 | 30.0 | 2689.3 | 3575 | 7237 | 24784 |

The learned policy is reported as measured against the supervised planner and is not expected to match or beat it. Training details and the curve are in `training.json`; the weights are in `trained-weights.json`.
