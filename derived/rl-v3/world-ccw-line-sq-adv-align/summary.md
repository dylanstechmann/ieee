# RL v3: trained linear policy vs the classical baseline and random (world-ccw-line-sq-adv-align)

2026-11-07. Agent-run synthetic study over the reserved evaluation seeds 100-119 for ruleset world `world-ccw-line-sq-adv-align`. `classical` delegates to the supervised planner; `random` emits uniform actions; and `learned` is a 38-weight linear policy trained by the cross-entropy method (`tools/train-world.py`) on training seeds only.

| policy | completed | mean total reward | mean score-like | mean steps | max steps | vehicle contact steps | wall contact steps |
|---|---:|---:|---:|---:|---:|---:|---:|
| classical | 20/20 | 44.534 | 267.75 | 1681.6 | 1841 | 10829 | 793 |
| random | 0/20 | -8.203 | 10.0 | 3575.0 | 3575 | 8439 | 32881 |
| learned | 17/20 | 35.205 | 219.5 | 2888.8 | 3575 | 8212 | 25675 |

The learned policy is reported as measured against the supervised planner and is not expected to match or beat it. Training details and the curve are in `training.json`; the weights are in `trained-weights.json`.
