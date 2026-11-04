# Tournament-aware score model (v7) — October 31, 2026

Agent-run planning arithmetic for the owner's hobby/learning project. Every probability below is an illustrative assumption. Nothing here is a measurement or a prediction of a real Match.

## Why it exists

`tools/strategy-v3.js` ranks engineering work by single-Match expected value. The event does not rank that way:

- **Qualification** (GM1 V3 §4.7.1): each Team plays three Qualification Matches, and only the **best** score counts. Ties break on the second-best, then the third-best score.
- **Elimination** (GM1 V3 §3.3.1, §4.8–4.9): single head-to-head Matches, where the higher score wins. The top six seeds advance directly; seeds 7–10 play in for the last two places, and the final is at the Awards Banquet.

A best-of-three ranking rewards a high ceiling more than a high average. This model makes that trade-off computable. ("Best-of-3" in this package means the highest of the three Qualification Match scores, not a best-of-three series.)

## Model

`tools/tournament-v7.js` treats a Match as an ordered phase chain:

1. Start: green flag 10, early start −2, or switch start 0.
2. Enter the course (25).
3. Three laps, each with independent clean-wall (15) and clean-obstacle (25) credits.
4. An optional pit exchange after lap 1 or 2 (drop 25/12, pickup 40/20, tire retention).
5. The school flag (25) at the start of lap 3.
6. Finish ≤ 3:00 (100), < 2:45 (30), and park in the assigned box (15).

A failed phase (stall, lost, off course) ends the run with the credits already earned. A Red Card zeroes the Match. The output is the exact single-Match score distribution, from which the model derives:
- best-of-3 and second-best-of-3 order statistics;
- head-to-head win, tie and loss odds;
- the break-even pit-stall probability.

Publicity (10) is excluded because it does not depend on the robot.

```
node tools/tournament-v7.js            # print the summary
node tools/tournament-v7.js --write    # regenerate report.json and summary.md
node --test tests/tournament-v7.test.js
```

Ten tests cover:
- normalization;
- the 390-point all-success case, cross-checked against `tools/score-v3.js`;
- Red Card, early-start and pit-stall bookkeeping;
- agreement with an independent seeded Monte Carlo sampler (120,000 runs per preset);
- closed-form order statistics and head-to-head symmetry;
- break-even bisection;
- input validation;
- that the written report is current.

## Results with the illustrative presets

| Profile | Single-Match mean | Best-of-3 mean | P(best-of-3 ≥ 300) |
|---|---:|---:|---:|
| drive-only (no exchange attempt) | 249.3 | 306.1 | 0.788 |
| full mission, pit after lap 2 | 269.5 | 348.5 | 0.948 |
| full mission, pit after lap 1 | 268.8 | 348.3 | 0.948 |

What the structure implies (these hold for the presets and are worth re-checking with measured probabilities):

- **Attempting the exchange tolerates more pit risk in qualification.** A run-ending stall in the pit can be up to 22.8% likely before the full mission's single-Match mean drops to the drive-only mean. For the best-of-3 mean, the break-even stall risk is 49.0%; for P(best-of-3 ≥ 300) it is 42.0%.
- **Modest reliability is enough to post one great run.** At 41.5% per-Match chance of a given outcome, the chance of at least one in three Matches is 80%; at 53.6%, it is 90%.
- **Pit after lap 2 is weakly better than after lap 1.** A pit stall then costs fewer banked laps. Retention is modeled once per pickup, so carry distance is not penalized; a measured per-lap drop rate would widen the gap.
- **Eliminations are single Matches,** so they reward reliability against a specific opponent. In one head-to-head, the full-mission preset beats drive-only 65.8% of the time, ties 2.6% and loses 31.6%.
- **Switching modes is limited.** A Team can switch between a full-mission and a safer software mode between Matches. Hardware can be added, removed or reconfigured only if it was presented at Inspection (GM1 V3 §6.1).

## Not established

- Real per-phase probabilities: they need bench and practice-field trials.
- Whether skipping the exchange still yields finish credit. V3 §3.1 says the robot "will" make a pit stop, but the scoring table awards only tire credits. Ask the official Q&A before planning a drive-only mode.
- Whether pickup credit survives a stall while the tire is still held. The model assumes retained only with probability `pRetain`.
- Correlation between Matches (the same failure repeating) and learning between Matches. Both would change the best-of-3 advantage.
