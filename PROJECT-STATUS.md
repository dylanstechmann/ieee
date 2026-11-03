# IEEE project status and lineage

Updated November 3, 2026. Personal hobby/learning project with AI-assisted research and software. No purchases, fabrication, physical robot trials or organizer contact are recorded.

**Club package:** `derived/club-package-v9/CLUB-PRESENTATION.md`, with the rule/Q&A ledger and conditional parts list. The updated synthetic mission completes three clean obstacle-free laps and parks in 20/20 episodes; all finish before 165 s. Nine obstacle probes yield three entry safe stops, three collision-free detour attempts that time out at 178 s, and three off-route completions. No avoidance mission is qualified. No RL policy has been trained. See `derived/mission-v9/README.md`.

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
- The historical `verify-planner-diagnostics-v3.js` still fails because `tools/avoidance-v3.js` changed after that package was sealed. The November 1 handoff documents an in-memory reproduction of the sealed report except for that hash; this audit did not reseal the package or its downstream manifest.

## What is not established

- No final competition chassis, tire mechanism, driver, battery, actuator or wiring release.
- No calibrated dynamics, legal complete mission, robust obstacle avoidance or physical reliability estimate.
- No measured received parts, real camera performance, installed field geometry or official answers to the eight team Q&A items.

## Version history and preservation

This folder had **no Git repository before November 1, 2026**. Earlier session documents explicitly confirm that. The local Git history begins with a snapshot of the files present at consolidation; it is not a reconstruction of earlier edits or proof of which agent made them.

A full pre-consolidation backup is stored one level above this project at `../ieee-pre-consolidation-2026-11-01.tar.gz`, SHA-256 `3f918631e432b49ec6a9f1e414a842aefac02ffea725e4b4f67ecc594c82b551`.

The `website/` directory retains its own independent local Git history. Its deployment files are also tracked in the parent project without importing or deleting its nested metadata.

No private IEEE GitHub repository was found when the account was checked. Local Git does not by itself create a private remote or off-machine backup.

## Next work in priority order

1. **Timeout diagnosed; no shortcut qualified.** The detoured lap takes 44.40 s versus 32.35 s nominal, adding 38 inches and four spins. The final lap starts at 141.80 s and auto-stops at 178 s with two laps complete. Reverse-entry/rejoin candidates intersect the divider; the existing end-gap bypass remains the only checked local route. See `derived/mission-v9/README.md`. Retain the timeout; do not tune the same fixed bypass repeatedly.
2. Resolve official Q&A and measure a built field, actual obstacles and printed tags. Use those measurements for a broader route/maneuver study rather than assuming this hypothetical blocker.
3. Physically verify the proposed mule geometry through the documented bench gates; dynamics-v9 is corrected-track but uncalibrated.
4. Build a legal-envelope competition mockup and real tire fixture; compare acquisition, retention, release and bail-out behavior.
5. Replace perfect simulated knowledge with real sensing, then train/evaluate RL only against a coherent classical baseline. Keep dated portfolio evidence.

The detailed handoffs remain in `SESSION-STATE-2026-10-29.md`, `SESSION-STATE-2026-10-30.md`, `SESSION-STATE-2026-10-31.md` and `SESSION-STATE-2026-11-01.md`. Older plans and V2 references are historical, not current status.
