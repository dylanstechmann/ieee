# Concept design review (G2, Sun Dec 13): prep sheet

2026-11-04 · agent-prepared for the club; decisions belong to the team.

The concept review chooses the competition robot's architecture, so that Order B/C can be placed by about Dec 14, ahead of holiday lead times. This sheet lists:
- what must be decided;
- the evidence that exists today (agent-run analyses are marked "synthetic");
- what is still missing;
- the cautious default if Q&A answers have not arrived by **Dec 1**.

## Decisions

| Decision | Evidence now | Still needed (by whom) | Default if silent |
|---|---|---|---|
| **Drivetrain** (motors, ratio, wheels) | Synthetic (`derived/envelope-v10/`): 70:1 #4754 top speed is about 21–24 in/s with 80 mm wheels at 10.5–12 V. Grip, not motor torque, limits acceleration and braking. On a 7.5 in U-turn the outer wheel sets the limit: about 11–13 in/s with 20% headroom, so 12 in/s works and 16 in/s does not. Clean missions still take about 60 s, far under 165 s. | E02 bench speed and current; E03 floor trials, especially the measured friction (owner/club). Calibration from `tools/bench/fit_motor.py`. | Reuse the mule drivetrain |
| **Base shape** (square or round 10 in) | Synthetic atlas: a round base needs only 0.5–1 in less room to change lanes, and is equal on straight passes. It spins within 10 in instead of 14.1 in. | QA01 answer. Mockup turning tests (`derived/competition-mockup-v10/swept-turn-procedure.md`). | Square 10 x 10 in, never contracting |
| **Tire mechanism** | Envelope study: the passive fork has the fewest actuators and no reserved-space conflicts. | E04 round 1 results (`derived/tire-fixture-v10/`), and the tire mass from printed replicas (club). | Up to two finalists carried into CAD |
| **Obstacle strategy** | Synthetic: with guide-size vehicles, contact-free laps in only 0–2.5% of layouts. | The official vehicles measured (owner); QA03 answer. | Laps first; take the least-contact line when no gap exists; never stall |
| **Sensors** | Synthetic estimation study: low ToF ranging to walls and dividers keeps pose error well under an inch; reflectance with naive edge matching, or odometry alone, drifts by inches. Line and checker detection is still needed for laps (QA06). Low range sensing also picks the clean side of each vehicle. Camera for the AprilTag unless QA02 allows a switch. | Reflectance, ToF and camera bench tests on real field paint (P6). | Reflectance array + 2–4 low ToF + camera |
| **Compute** | Pico 2 boots in under 1 s, which suits sequestration. A vision computer adds boot time and a failure point. | QA02 (tag) and QA08 (flag) answers; camera bench test. | Pico 2 + a small vision board only if the camera is required |
| **Power** | No battery is selected. Sequestration forbids charging, so plan spare packs. Synthetic: the drive uses only about 0.05 Wh per mission, so peak current matters more than capacity. Size for at least 6 A of drive current plus electronics, and for the chosen driver's real current limit. | E02 currents; FAU battery policy (owner); electronics and mechanism loads. | Fused pack, hardware e-stop, spare packs |

## Bring to the review

1. **Parts:**
   - E02A caliper measurements (`measurements/mule/<date>/e02a.json`), with the regenerated deck revision;
   - E02 bench logs and a calibration JSON; E03 floor-trial results.
2. **Field and obstacles:**
   - as-built field measurements (`measurements/field-asbuilt-<date>.json`);
   - the official obstacle vehicles measured: length, width, height;
   - mockup test results: U-turns, spins, lane change, contact behavior.
3. **Mechanism:** E04 round 1 sheets, analyzed (`tools/analyze_e04_v10.py`).
4. **Rules:** the Q&A ledger (`qa/answers-ledger.json`) with every answer received.
5. **Budget:** spent so far, plus the proposed Order B/C against the $750 target and $1,000 cap.

## After the review

- **Order B/C:** place the orders by about Dec 14.
- **Agent work:** update the CAD (competition chassis v1), the simulator (measured field, vehicles and motor calibration) and the firmware pin map for the chosen driver.
- **Gate G3 (Jan 10):** fabrication release.
