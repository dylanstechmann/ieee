# Tire-handling test kit (E04), v10

2026-11-03 · agent-prepared for the owner's hobby/learning project. No mechanism is selected, built or tested.

| File | Use |
|---|---|
| `pit-box-corner-1to1.svg` | True-scale tire target: nominal center, ±12.7 mm offset grid, ±10° approach lines. Print it and tape it into a practice pit box. |
| `doe-round1.csv` | Round 1 run sheet: 3 concepts x (L9 array x 5 repeats + 5 nominal) = 50 runs each, 150 in all. This fixes the 45-versus-50 gap in the v3 E04 matrix. |
| `doe-round2-template.csv` | 50 confirmation runs for the finalist, at the worst cells found in round 1 |
| `print-notes.md` | Making and measuring tire replicas from the organizer STL |

The L9 array varies lateral offset, longitudinal offset and approach yaw at three levels each. Every pair of levels appears once, so main effects can be estimated from 9 cells instead of 27.

## How to run a session

1. Copy the sheet to `measurements/tire/<date>/`. These templates stay blank.
2. Randomize the run order: shuffle the rows, and record the seed or method in `notes`.
3. For each run, place the tire on the marked cross and approach along the marked line. Record:
   - `acquired` (true or false);
   - `retained_after_shake`: one lap-profile shake, meaning the same acceleration, spin and stop sequence each time;
   - `released_in_box`;
   - `bailout_clean`: after a failed pickup, the mechanism reset without jamming;
   - `cycle_time_s`.
4. Log failures as data, never as reruns. A rerun gets a new row with a note.
5. Analyze with `python -I tools/analyze_e04_v10.py <filled sheet>`. It reports success rates with Wilson 95% intervals, per-cell rates, main effects and the E04 acceptance check.

## E04 acceptance (from `derived/hardware-development-v3/experiment-plan.md`)

At least 48/50 pickups, at least 4/5 in every alignment cell, 20/20 retention and 20/20 release.

Passing E04 on a fixture is evidence for that fixture and those replicas only. It is not proof on the competition field.
