# RL v2: trained linear policy vs the classical baseline and random

2026-11-06. Agent-run synthetic study over the reserved evaluation seeds 100-119. `classical` delegates to the supervised planner; `random` emits uniform actions; and `learned` is a 38-weight linear policy trained by the cross-entropy method (`tools/train-rl-policy.py`) on training seeds 0, 1, 2, 3 only.

| policy | completed | mean total reward | mean score-like | mean steps | max steps | vehicle contact steps | wall contact steps |
|---|---:|---:|---:|---:|---:|---:|---:|
| classical | 20/20 | 44.534 | 267.75 | 1681.6 | 1841 | 10829 | 793 |
| random | 0/20 | -8.203 | 10.0 | 3575.0 | 3575 | 8439 | 32881 |
| learned | 20/20 | 41.307 | 240.75 | 1573.4 | 1840 | 5595 | 11032 |

The learned policy is the first trained result; it is compared verbatim and is not expected to match the supervised planner. Training details and the curve are in `training.json`; the weights are in `trained-weights.json`.
