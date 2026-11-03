# Mission v9 — synthetic classical baseline and RL interface

November 3, 2026. AI-assisted software for the owner's hobby/learning project. **Not a legal route, calibrated robot model, physical test or trained RL result.**

## What was recovered

The broken waypoint prototype is preserved unchanged as `prototype-before-reset.py`; do not import it. The replacement reuses `derived/differential-drive-v3/report.json`, whose conservative 10 × 10 in rectangular forward/reverse/spin routes had already passed sampled geometry checks. It does not use the unapproved round-base assumption.

The controller tracks one primitive at a time using along-track projection and cross-track error. Arrival requires projected endpoint progress, lateral tolerance and low speed followed by a settle interval. Lap completion is route-state based, not accumulated distance. Collision and auto-stop latch once. The terminal target remains readable after route completion.

## Verified result

`evaluation.json` is generated from 20 reserved nominal evaluation seeds (100–119), with no obstacles or observation noise:

- 20/20 complete three laps and the synthetic exchange with zero contacts.
- 6/20 park before the 178 s auto-stop: all box-1 episodes. Boxes 2 and 3 time out during final parking.
- 13/20 cross before the strict 165 s bonus threshold; box 3 is later but within 180 s.
- Three explicit obstacle probes all collide. This baseline has no obstacle avoidance.

`trace-box-1.json` records the actual state/pose sequence for seed 100 with box 1 explicitly assigned. These are synthetic perfect-knowledge results, not reliability estimates or official score predictions.

## Run

From `/workspace/ieee/ieee`:

```sh
uv run --no-project --python 3.12 python -I -m unittest discover -s software -v
uv run --no-project --python 3.12 python -I tools/evaluate-mission-v9.py
```

The simulator and tests use the Python standard library. `MissionEnv` has Gymnasium-style `reset()` and `step()` returning 18 observations, reward, terminated, truncated and info. If Gymnasium/NumPy are installed it creates two-dimensional Box action and 18-dimensional Box observation spaces; otherwise it returns lists and leaves those space attributes `None`. No ML dependency was installed and no PPO training occurred.

Seeds 0–99 are reserved for future training; 100–119 are nominal evaluation. Do not train on the evaluation set. A future trained result must save its actual configuration/model and separate held-out evaluation.

## Next engineering gates

1. Reduce repeated turn/settle cost or redesign the pit/finish maneuver using valid differential-drive geometry and measured actuator capability. All three assignments must park before auto-stop; do not simply extend the deadline.
2. Resolve official pit/lap/finish/envelope questions and measure the installed field.
3. Add route-aware persistent obstacle avoidance using published/measured obstacle envelopes. Retain failure cases.
4. Replace perfect pose/target knowledge with real sensing, calibration, noise and dropout models.
5. Only then train and compare RL against the classical baseline. Keep safety, E-stop and mission supervision outside the learned policy.

The tire exchange is a timed event, not contact mechanics. The score-like arithmetic is not referee adjudication. No real robot, camera, mechanism or power system has been validated.
