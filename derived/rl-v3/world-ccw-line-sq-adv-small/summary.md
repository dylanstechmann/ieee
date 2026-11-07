# RL v3: trained linear policy vs the classical baseline and random (world-ccw-line-sq-adv-small)

2026-11-07. Agent-run synthetic study over the reserved evaluation seeds 100-119 for ruleset world `world-ccw-line-sq-adv-small`. `classical` delegates to the supervised planner; `random` emits uniform actions; and `learned` is a 38-weight linear policy trained by the cross-entropy method (`tools/train-world.py`) on training seeds only.

| policy | completed | mean total reward | mean score-like | mean steps | max steps | vehicle contact steps | wall contact steps |
|---|---:|---:|---:|---:|---:|---:|---:|
| classical | 20/20 | 45.217 | 270.0 | 1599.6 | 1769 | 7409 | 277 |
| random | 0/20 | -8.203 | 10.0 | 3575.0 | 3575 | 6709 | 32881 |
| learned | 17/20 | 37.627 | 216.5 | 3120.0 | 3575 | 8607 | 27642 |

The learned policy is reported as measured against the supervised planner and is not expected to match or beat it. Training details and the curve are in `training.json`; the weights are in `trained-weights.json`.

The QA03 obstacle footprint is the hypothetical 8 × 4 in toy in `ruleset.SMALL_TOY`, explicitly unverified; it is not an official measurement.
