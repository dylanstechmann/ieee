# Mission v9 — synthetic classical baseline and RL interface

November 3, 2026. AI-assisted software for the owner's hobby/learning project. **Not a legal route, calibrated robot model, physical test or trained RL result.**

## Review notes (November 3, 2026)

An agent review found these limits. v9 stays frozen, because `derived/robot-studio-v8/build-manifest.json` pins `evaluation.json`; the fixes go into the next simulator version.

- **20 seeds, 3 runs.** The seed only chooses the pit box (`assigned_box = 1 + seed % 3`, `software/mission_v9.py:295`), and nominal evaluation disables noise and obstacles. The 20 evaluation seeds are therefore 3 deterministic runs repeated.
- **No obstacles in the nominal case.** Every legal match has three obstacles, passed on every lap.
- **Obstacle stand-in too small.** The stand-in is a circle of radius 0.058 m (about 4.6 in), and the detour planner uses a 2 in square; the organizer guide's plush vehicle is about 8.55 x 8.2 in.
- **Lap time.** Nominal laps take 29.60–29.65 s for every box: an in-memory re-run on November 3 gave laps ending at 37.45, 67.10 and 141.4–141.8 s. The 32.35 s figure below was wrong, so the detour costs about 14.8 s per lap.
- **RL interface cannot be driven by a policy.**
  - `PathFollower.settled` only accumulates inside the classical controller (`mission_v9.py:150-154`), and route advancement checks it (`:435-438`). Actions passed to `MissionEnv.step(action)` therefore never complete a segment.
  - The observation drops the target heading and the segment type (`:341`).
  - The reward is distance moved minus penalties (`:464`), not the shaping that `mission-v9.json` describes.
- **`software/match_logic.py` is not used here,** and its lap length (4.04 m) differs from this route's (3.81 m).
- **Logic issues.**
  - The `final_lap` slice is a no-op (`:202`, `:219-220`).
  - PARK's first waypoint (36, 12) in differs from where PARK starts (36, 36) in.
  - The school flag is raised on pit exit even when `pit_after_lap` is 1 (`:408-411`).
  - The score-like total credits clean laps that were never driven; the entry-blocker probe scores 130 (`:474`).

## What was recovered

The broken waypoint prototype is preserved unchanged as `prototype-before-reset.py`; do not import it. The replacement reuses `derived/differential-drive-v3/report.json`, whose conservative 10 × 10 in rectangular forward/reverse/spin routes had already passed sampled geometry checks. It does not use the unapproved round-base assumption.

The controller tracks one primitive at a time using along-track projection and cross-track error. Arrival requires projected endpoint progress, lateral tolerance and low speed followed by a settle interval. Lap completion is route-state based, not accumulated distance. Collision and auto-stop latch once. The terminal target remains readable after route completion.

## Verified result

`evaluation.json` is generated from 20 reserved nominal evaluation seeds (100–119), with no obstacles or observation noise:

- 20/20 complete three laps and the synthetic exchange with zero contacts.
- 20/20 park before the 178 s auto-stop; all three assignments pass with zero contacts.
- 20/20 cross before the strict 165 s bonus threshold. Per-assignment completion times are 153.85 s (box 1), 161.50 s (box 2), and 150.95 s (box 3).
- Nine obstacle probes produce three entry-blocker safe stops, three upper-lane detour attempts that auto-stop at 178 s, and three off-route completions, with zero collisions. No obstacle avoidance mission is qualified.

The shortened pit approach uses the upper approach lane and a 35-inch turn column; box 2 parking goes around the north side of the pit divider. These are conditional geometric choices, not organizer-approved access or lap rulings. `avoidance-scenarios.json` retains a local upper-lane bypass found by the existing JavaScript planner. Python checks its entry/rejoin poses and every sampled transition, merges collinear grid steps, and rejoins the original lap. It completes two laps and the exchange without contacts, but the third lap exceeds the unchanged 178 s auto-stop. This is a connected detour with a retained timeout failure, not a successful avoidance claim.

### Timeout diagnosis (November 3)

The phase trace for seed 100 (box 2) shows the first two detoured laps completing at 52.25 s and 96.75 s, the exchange at 122.00 s, and the final lap starting at 141.80 s. The final lap reaches its lower-lane return at 171.40 s and auto-stops at 178.00 s with two laps complete. The nominal lap is about 29.6 s (29.60–29.65 s; corrected on November 3 from an earlier 32.35 s); the detoured lap is 44.40 s. The detour adds 38 inches of translation and four 90-degree spins (188 inches and 720 degrees total, versus 150 inches and 360 degrees nominally).

The existing planner's wheel-travel objective and a time-weighted candidate comparison select the same four-turn local bypass. Candidate reverse-entry and reverse-rejoin shortcuts were checked with the unchanged 10 × 10-inch footprint and sampled transitions: they intersect the center divider except at the existing end gaps. The divider spans x=43.87–79.87 inches at y=24.073 inches; the upper-lane obstacle blocks the direct straight. Thus this investigation found no valid shorter local route, not evidence that no route exists. No deadline, speed, footprint, obstacle or divider constraint was relaxed. The next route study must use measured obstacle/field geometry and a broader route/maneuver model, not repeated tuning of this fixed bypass.

### Bounded broader-maneuver study (November 3)

A follow-up study tested a reverse-first bypass from the upper join into the lower lane, crossing below the hypothetical blocker and rejoining at the far end. With the unchanged 10 × 10-inch footprint and sampled collision checks, lower-lane crossing heights from 9–17 inches were geometrically clear for the tested entry column. This removes the extra entry translation and can remove one redundant far-end spin, but it does not produce a complete parked mission under the unchanged 178 s auto-stop. The best tested controller/route combinations reached three laps and the exchange but still timed out during parking; reducing the settle interval alone did not fix that result. A direct lower-lane parking approach was also tested and timed out. These are negative synthetic results, not proof of physical infeasibility or a legal-route ruling.

The production follower, fixed local bypass, nominal 20/20 parking baseline and retained three detour timeouts are unchanged. Do not repeatedly tune this hypothetical obstacle. The next useful gate is measured field/obstacle geometry and a time-aware maneuver/controller model validated against a real or more faithful robot, followed by realistic sensing.

`trace-box-1.json` records the actual state/pose sequence for seed 100 with box 1 explicitly assigned. These are synthetic perfect-knowledge results, not reliability estimates or official score predictions.

## Run

From `/workspace/ieee/ieee`:

```sh
uv run --no-project --python 3.12 python -I -m unittest discover -s software -v
node tools/plan-mission-v9-avoidance.js
uv run --no-project --python 3.12 python -I tools/evaluate-mission-v9.py
```

The simulator and tests use the Python standard library. `MissionEnv` has Gymnasium-style `reset()` and `step()` returning 18 observations, reward, terminated, truncated and info. If Gymnasium/NumPy are installed it creates two-dimensional Box action and 18-dimensional Box observation spaces; otherwise it returns lists and leaves those space attributes `None`. No ML dependency was installed and no PPO training occurred.

Seeds 0–99 are reserved for future training; 100–119 are nominal evaluation. Do not train on the evaluation set. A future trained result must save its actual configuration/model and separate held-out evaluation.

## Next engineering gates

1. Diagnose the retained detour timeout from its phase trace; do not extend the deadline or repeatedly tune the same route. Preserve the nominal regression gate.
2. Resolve official pit/lap/finish/envelope questions and measure the installed field.
3. Add route-aware persistent obstacle avoidance using published/measured obstacle envelopes. Retain failure cases.
4. Replace perfect pose/target knowledge with real sensing, calibration, noise and dropout models.
5. Only then train and compare RL against the classical baseline. Keep safety, E-stop and mission supervision outside the learned policy.

The tire exchange is a timed event, not contact mechanics. The score-like arithmetic is not referee adjudication. No real robot, camera, mechanism or power system has been validated.
