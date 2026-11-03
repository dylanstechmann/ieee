# Stock Car Race — engineering progress and next build gate

November 3, 2026 · IEEE SoutheastCon 2027 hobby/learning project · AI-assisted research and software

**Purpose:** decide the first physical experiments and assign club work. This is not a finished robot, a legal-route ruling or a request to buy a complete parts list.

## 1. What we have

- A preserved, locally versioned engineering history. Earlier Kimi-era analysis and Claude's v7 CAD/renderer are consolidated in `share/Robot-Studio-v8.html`; neither replaced the source archive.
- V3 rule review: nominal **390 robot-task points + 10 publicity**. Finishing, the time bonus and three clean laps are worth 250; the tire exchange is worth 65.
- Vendor-CAD findings: **202 mm** stock wheel track, **7 mm** motor-shaft offset and **7.09 mm** wheel/support mismatch in the original mule layout. These are not measurements of received parts.
- Organizer tire geometry and 162 mechanism cases / 2,970 frames; no winning mechanism has been physically demonstrated.
- AprilTag 3 decodes **tagStandard41h12 IDs 1–3**. OpenCV ArUco does not provide that dictionary. Pose uses the inner 5/9 edge; measure the printed scale.

## 2. What the new software actually does

`software/mission_v9.py` reuses the earlier forward/reverse/spin geometry. It checks a conservative **10 × 10 in rectangular** footprint against walls/dividers, follows one primitive at a time, and has explicit entry, lap, pit, exchange, exit, parking and stop states.

Twenty seeded **obstacle-free, perfect-knowledge synthetic** episodes:

| Result | Count | Meaning |
|---|---:|---|
| Three laps with zero contacts | 20/20 | Software route-following result only |
| Timed exchange event succeeds | 20/20 | Not a physical tire pickup |
| Parks before 178 s auto-stop | 20/20 | All three assignments; synthetic conditional routes |
| Finish before strict 2:45 bonus | 20/20 | Software timing only; not referee adjudication |
| Obstacle probes: safe stop / off-route completion | 6 / 3 | Zero contacts; no avoidance qualified |

Shortened pit and parking approaches removed the nominal timeout without shrinking the robot, removing walls or extending the deadline. They remain conditional on official pit-access and lap interpretations. The upper-lane offline detour is retained as investigation evidence, but blocked routes currently stop safely rather than avoid the obstacle.

**No RL policy has been trained.** `MissionEnv` supplies an 18-value observation and two normalized actions with Gymnasium-compatible reset/step when Gymnasium is installed. The standard-library simulator and tests need no ML packages. Training is premature until the classical task, obstacle handling and sensing assumptions are coherent.

## 3. Recommended architecture to prototype

- **Mule first:** two encoder gearmotors, corrected support geometry, restrained low-energy bench characterization. It is not the competition chassis.
- **Competition mockup:** conservative 10 × 10 in lower-body rectangle within the 12 in starting cube; packaging is unresolved. Do not assume a round base is legal without Q&A.
- **Localization:** wheel encoders plus downward reflectance sensing of white markings; IMU as a candidate aid, not a substitute for field references.
- **Perception:** AprilTag 3-compatible camera; low wall/obstacle sensing below divider height. A top-mounted 2D LiDAR may scan above the important geometry.
- **Mission supervisor:** preserve the existing flag confirmation, tag vote, lap-distance guard, pit time budget, bail-out, E-stop and auto-stop concepts.
- **Tire handling:** compare passive fork, guided bore and OD gripper on the same fixture. Retain the blue tire through the finish; bail out rather than strand the robot.

## 4. Club work assignments

| Owner | Next deliverable | Acceptance evidence |
|---|---|---|
| Rules lead | Review official Q&A; send the already-drafted unanswered questions | Dated answer archive and rule ledger; no inferred permissions |
| Mechanical lead | Measure any received parts; review shaft-down mule and full-footprint mockup | Dimensioned fit record; no fabrication release before review |
| Bench/electrical lead | Inventory facility, supervision, instruments and battery policy | Approved bounded setup; measured voltage/current/speed/temperature |
| Tire-mechanism lead | Print/machine small test coupons and build a repeatable tire fixture | Acquisition, retention, release and bail-out logs, including failures |
| Software lead | Connect the retained detour with explicit route state; replace perfect pose with sensor inputs | Replayable all-box and obstacle tests, including safe-stop failures and field logs |
| Portfolio lead | Preserve decisions, raw trials and photographs | Material for the five-page portfolio and ten-minute interview |

## 5. Purchase decision

Order A is a **$177.25 experiment BOM before shipping/tax/unpriced items**, not a complete robot. See `PARTS-AND-BUDGET.md`. Do not combine every researched alternative into one order.

Purchase gates:

1. Confirm club/FAU inventory, access, measurement tools and supervision.
2. Review the CAD correction against actual received parts before deck fabrication.
3. Approve a bounded bench setup before energizing motors; measure before choosing final driver/power.
4. Resolve envelope/pit Q&A and test a full-size mockup before competition-chassis fabrication.
5. Select battery, charger, protection, actuators and sensors only from measured loads and an integrated design.

## 6. RL plan after the baseline gate

1. Preserve the all-box parking baseline; validate its conditional pit/access assumptions and measured actuator capability.
2. Obtain obstacle dimensions/placement rules; connect the retained detour with explicit route state and test failure cases.
3. Add realistic sensor observations, dropout and calibration data. Keep mission logic independent of the learned controller.
4. Train PPO or another baseline only in the documented training seed range; save code, configuration, seeds and model artifacts.
5. Evaluate untouched seeds against the classical controller: completion, contacts, time, exchange and parking separately.
6. Test incremental real-robot skills with a supervised, bounded setup. Simulation success is not transfer evidence.

## Bottom line

We have a useful consolidated engineering baseline and a real software test harness, not a finished competition robot. The next highest-value work is **Q&A + measured mule + full-footprint/tire experiments**, while software connects obstacle detours and replaces perfect knowledge with sensing. Spend to retire those risks, not to make the rendering more impressive.
