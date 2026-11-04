# IEEE project status and lineage

Updated November 3, 2026. Personal hobby/learning project with AI-assisted research and software. No purchases, fabrication, physical robot trials or organizer contact are recorded.

**November 3 review (agent-run):** the plan, gates and dates to April are in `BACKCAST-2026-11.md`; the Q&A questions to post are in `derived/qa-pack-v10/`; corrections to pinned documents are in `ERRATA-2026-11.md`; and the club summary is `derived/club-update-v10/CLUB-UPDATE.md`. The findings, each fixed in the next packages:
- **Obstacles missing from the nominal case.** Every legal match has three obstacles, passed on every lap, but the "nominal" v9 runs have none.
- **Obstacle stand-in too small.** The v9 stand-in is a 4.6 in circle (a 2 in square in the planner); the organizer guide's vehicle is about 8.55 x 8.2 in.
- **20/20 overstated.** The 20 evaluation seeds are 3 deterministic runs, one per pit box.
- **Simulator defects.**
  - The RL interface cannot be driven by a policy.
  - The simulator ignores the motor model.
  - `match_logic.py` is not used by the simulator.
  - Nominal laps take 29.60–29.65 s, not 32.35 s.

**Club package:** `derived/club-package-v9/CLUB-PRESENTATION.md`, with the rule/Q&A ledger and conditional parts list. The updated synthetic mission completes three clean obstacle-free laps and parks in all 20 evaluation seeds, which are 3 distinct deterministic configurations (one per pit box); all finish before 165 s. Nine obstacle probes yield three entry safe stops, three collision-free detour attempts that time out at 178 s, and three off-route completions. No avoidance mission is qualified. No RL policy has been trained. See `derived/mission-v9/README.md`.

## Start here

Open **`share/Robot-Studio-v8.html`** for the consolidated offline studio. Its guide is `derived/robot-studio-v8/README.md`.

v8 combines rather than replaces the earlier work:

| Earlier contribution | Status in v8 |
|---|---|
| Multi-model GM1/GM2 V3 document interpretation and field geometry | Retained as source-backed findings with unresolved Q&A and measurement gates |
| Navigation and scoring models | Retained as conditional studies; not legal routes or measured performance |
| Mule dynamics, stopping and electrical screening | Original data retained; old 176 mm track is explicitly incompatible with vendor-CAD 202 mm track |
| Tire-mechanism comparison | All 162 cases / 2,970 frames retained; no mechanism selected |
| Claude v7 vendor CAD and AprilTag analysis | Retained; useful CAD correction and library/geometry findings |
| v7 realistic renderer | Reused for the assembly/field workspace |

## What is actually established

- Archived GM1/GM2 V3 manuals support the nominal **390 robot points + 10 publicity** scoring model. Official Discord Q&A has not been reviewed.
- Multi-model image transcription and mesh analysis support the documented field/tire baseline. This is not a measured physical field or print-tolerance certification.
- Pololu CAD supports a **7 mm motor-shaft offset**, **202 mm stock wheel track**, and a **7.09 mm support mismatch** in the original mule kit. These are CAD measurements, not received-part measurements.
- AprilTag 3 decodes the organizer sheet as **tagStandard41h12 IDs 1–3**. OpenCV ArUco has no 41h12 dictionary. Pose uses the inner **5/9** edge; the physical print scale is unmeasured.
- The Node suite and artifact verifiers check software and reproducibility, not physical robot success.
- All 18 artifact verifiers pass as of November 3 (`node tools/check-all.js`).
- `verify-planner-diagnostics-v3.js` passes again through a recorded input supersession. `tools/avoidance-v3.js` changed after that package was sealed; `--reproduce` regenerates the report, summary and 48 SVGs byte-identically. No sealed bytes changed. See `derived/audits/2026-11-03-planner-diagnostics-v3-input-supersession/`.

## What is not established

- No final competition chassis, tire mechanism, driver, battery, actuator or wiring release.
- No calibrated dynamics, legal complete mission, robust obstacle avoidance or physical reliability estimate.
- No measured received parts, real camera performance, installed field geometry or official answers to the eight team Q&A items.

## Version history and preservation

This folder had **no Git repository before November 1, 2026**. Earlier session documents explicitly confirm that. The local Git history begins with a snapshot of the files present at consolidation; it is not a reconstruction of earlier edits or proof of which agent made them.

A full pre-consolidation backup is stored one level above this project at `../ieee-pre-consolidation-2026-11-01.tar.gz`, SHA-256 `3f918631e432b49ec6a9f1e414a842aefac02ffea725e4b4f67ecc594c82b551`.

The `website/` directory retains its own independent local Git history. Its deployment files are also tracked in the parent project without importing or deleting its nested metadata.

A private GitHub remote now exists (`github.com/dylanstechmann/ieee`). `main` was pushed on November 3, and next-phase work is on the `next-phase-v10` branch until the owner merges it. (Earlier notes saying no remote existed predate it.)

## Next work in priority order

**Superseded on November 3 by `BACKCAST-2026-11.md`.** The order there is:
- **Physical (owner and club):** post the Q&A; decide Order A, the obstacle set and field materials; build and measure the practice field; caliper-check parts and build the mule; run the tire-mechanism DOE.
- **Agent:** done so far: a one-command check (`node tools/check-all.js`); the Q&A pack and corrections; the organizer CAD extraction (`derived/organizer-cad-v10/`); the practice-field packet (`derived/practice-field-v10/`); and the shaft-down mule deck (`derived/drivetrain-mule-v10/`). Next: tire-fixture and mockup packets; bench firmware; the v10 simulator with realistic obstacles; a passability study and a faster arc-based lap planner.

The list below is the earlier plan, kept for reference.

1. **Timeout diagnosed; broader maneuver study remains unqualified.** The detoured lap takes 44.40 s versus about 29.6 s nominal (earlier notes said 32.35 s; an in-memory re-run on November 3 gives 29.60–29.65 s for every box), adding 38 inches and four spins. The final lap starts at 141.80 s and auto-stops at 178 s with two laps complete. Reverse-entry/rejoin candidates intersect the divider; a bounded reverse-first lower-lane study was geometrically clear but still timed out during parking, even with reduced settling or a direct parking approach. See `derived/mission-v9/README.md`. The production baseline and three detour timeouts are unchanged; do not tune the same hypothetical bypass repeatedly.
2. Resolve official Q&A and measure a built field, actual obstacles and printed tags. Use those measurements for a broader route/maneuver study rather than assuming this hypothetical blocker.
3. Physically verify the proposed mule geometry through the documented bench gates; dynamics-v9 is corrected-track but uncalibrated.
4. Build a legal-envelope competition mockup and real tire fixture; compare acquisition, retention, release and bail-out behavior.
5. Replace perfect simulated knowledge with real sensing, then train/evaluate RL only against a coherent classical baseline. Keep dated portfolio evidence.

The detailed handoffs remain in `SESSION-STATE-2026-10-29.md`, `SESSION-STATE-2026-10-30.md`, `SESSION-STATE-2026-10-31.md` and `SESSION-STATE-2026-11-01.md`. Older plans and V2 references are historical, not current status.
