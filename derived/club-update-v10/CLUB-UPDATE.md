# Club update v10: from studies to the first physical tests

November 3, 2026 · IEEE SoutheastCon 2027 Stock Car Race · hobby/learning project, AI-assisted planning and software

This updates the November 3 club package (`derived/club-package-v9/CLUB-PRESENTATION.md`) after a full review of the repository. Nothing has been bought, built or tested yet. The goal for the next two weeks is to change that.

## Three corrections to the club package

1. **Every real match has three obstacles, passed on every lap.** The simulator's "nominal" runs had none, so its clean three-lap result does not describe any legal match. Obstacle handling is the core of every lap, not an extra.
2. **The obstacle stand-in was too small.** The simulator used a circle about 4.6 in across, and the planner a 2 in square. The organizer's guide shows a plush vehicle of about 8.55 x 8.2 in. With vehicles that size, a 10 in robot may not always have a contact-free gap; that is now the most important software study.
3. **"20 of 20 episodes" overstated the evidence.** The seed only picked the pit box, so the 20 runs were three deterministic runs (one per box) repeated. The next simulator version adds real variation.

The review also found that the reinforcement-learning interface cannot yet be driven by a policy, and that the simulator does not use the motor model. Both are fixed in the next software version; no learning is planned before real sensor data exists.

## New finding: obstacle size decides the 75 obstacle points

The agent-run passability atlas (`derived/passability-atlas-v10/`) uses the organizer CAD field and the guide's 8.55 x 8.2 in plush vehicle.

- **Contact-free passes are rare.** A 10 in robot can pass a vehicle without contact in only 0–47% of its possible placements. With both quadrants of one straight occupied, almost no sampled layout is passable.
- **The round base helps little here.** It needs only 0.5–1 in less room for a lane change.

Buying and measuring the official vehicle set (it is on the organizer's list) and asking QA03 are therefore the most valuable next steps. If some contact is unavoidable, the robot needs a policy for touching gently instead of stopping.

The follow-up lap study (`derived/lap-study-v10/`) adds three points:

- **Contact-free laps:** with guide-size vehicles, all three can be passed cleanly in only 0–2.5% of random layouts.
- **Mission time:** with arc turns instead of stop-and-spin, a full mission takes about 81 s at 12 in/s, so time is not the problem.
- **The exchange:** attempting it is worth about 45 expected points, at an assumed 70% success.

The priorities that follow: reliable laps and parking first, then the exchange, and treat the obstacle bonus as a bonus.

The drivetrain study (`derived/envelope-v10/`, synthetic) adds three more:

- **Turns set the speed:** top speed is about 21–24 in/s, but in a 7.5 in U-turn the outer wheel runs 1.5 times faster than the robot's center. That makes 12 in/s workable and 16 in/s not.
- **Measure friction:** grip, not the motors, limits acceleration and braking, so friction from the E03 floor trials is the number the design most needs.
- **Plan for peak current:** a mission's drive energy is tiny, but peak drive current can reach about 6 A.

The estimation study (`derived/estimation-v10/`, synthetic) adds two more:

- **Low range sensors carry localization:** with them the simulated robot stays within about an inch of the truth. Reflectance alone can also finish, which gives a fallback if range sensing disappoints on real paint.
- **Calibrate the gyro:** its bias and its scale both matter. Measure the scale once on the bench with ten full turns against a floor mark, and hold still during the 5 s start wait to measure the bias.

## Next two weeks

| When | Who | What |
|---|---|---|
| Nov 4–7 | Rules lead | Search the official Discord Q&A, then post the open questions from `derived/qa-pack-v10/PASTE.md` (batch 1 first). Record everything in `qa/answers-ledger.json`. |
| Nov 5–7 | Owner / club | Decide purchases: Order A drivetrain parts ($177.25 archived price) and the practice-field materials from the organizer list ($182.39, which already includes the paint, the start flag and the official obstacle set; brushes and tape are extra, under $35). Ask FAU about space, printers, supervision and battery policy. |
| Nov 9–15 | Mechanical lead + volunteers | Build the 4 x 8 ft practice field from `derived/practice-field-v10/`, then measure it as built. |
| On arrival | Mechanical + bench leads | Caliper-check the motors, brackets, hubs, wheels and casters with `derived/drivetrain-mule-v10/templates/` before printing the corrected mule deck. |
| From Nov 16 | Tire lead | Print tire replicas and test the three pickup concepts on a repeatable fixture. |

## Dates that cannot move

- Competition registration: Jan 1 to Mar 1, 2027; every competitor needs IEEE membership.
- Conference registration: by Mar 31, 2027; there is no late registration.
- Hardware room opens Apr 15; competition Apr 17. Three qualification matches, and only the best one counts.

The gates between now and April are in `BACKCAST-2026-11.md`.

## What the AI agent is building next

These are digital; each is labeled agent-run and is not hardware validation:
- the Q&A pack;
- a practice-field build packet;
- the corrected shaft-down mule deck with drill template;
- bench firmware and test scripts for the Pico 2;
- a corrected simulator with realistic obstacles;
- a passability study for square and round robots;
- a faster arc-based lap planner;
- tire-fixture and full-size mockup drawings.

The agent does not buy parts or contact the organizers.
