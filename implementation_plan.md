# Implementation Plan — IEEE SoutheastCon 2027 Stock Car Race

[Overview]

Goal: advance the `/workspace/ieee` robot project from its current state — a mature optimizer-and-simulator that still *tells* the robot where vehicles are and passes through them — to a fully-sensed, obstacle-aware simulation, port the estimator onto the board, and untangle the repository so that all of it is safe, reproducible, and reviewable. Everything in this plan is simulation and host-tested code, analysis, and documentation run on the computer. It does **not** order parts, contact the organizers, post Q&A, or flash a board; those stay owner actions that this plan only *prepares*.

Scope and context (2026-11-06):

- The platform already exists and is mature: `software/stockcar/` (v10 simulator — `field.py`, `obstacles.py`, `planner.py`, `routes.py`, `tracker.py`, `supervisor.py`, `sensors.py`, `estimator.py`, `mission.py`), `firmware/pico2/` (Pico 2 MicroPython skeleton, host-tested only), 55 Node test files, 32 artifact verifiers, and `tools/check-all.js`.
- The project's own top "known limits" (README §Status) are, in priority order: (1) the full-mission model passes straight through vehicles; (2) the camera, start flag, and lap line are not modeled, so the robot is told its pit box and start; (3) nothing runs on a board and the EKF estimator is host-only.
- The git working tree is on `next-phase-v10`, which has **diverged from `main`** (2 commits ahead, 2 behind). A large set of v13 showcase artifacts (`cad-v13/`, `derived/cad-v13/`, `docs/mechanical-readiness-v13.md`, a refined `share/Showcase-v13.html`, updated `README.md`/`AGENTS.md`, several `tools/*v13*`, several `tests/*v13*.test.js`) is uncommitted on the wrong branch.
- Next competition gates (`BACKCAST-2026-11.md`): **G0 Unblocked** Sun Nov 15; **G1 Risks measured** Sun Dec 6; **G2 CDR** Sun Dec 13. The unanswered Q&A items **QA03 (obstacle vehicles)** and **QA02 (AprilTag/pit box)** sit directly on the critical path to CDR, and the lap study (`derived/lap-study-v10/`) already shows contact-free laps exist in only 0–2.5% of layouts at guide vehicle size — the single biggest unresolved navigation risk.

High-level approach — four tracks, sequenced by dependency and critical path:

- **Track 0 — repository hygiene and release.** Reconcile `main`/`next-phase-v10`, commit the untracked v13 refinements, and prove `node tools/check-all.js` passes so every later change lands on a clean baseline.
- **Track 1 — fully-sensed, obstacle-aware mission simulator.** Model the camera (AprilTag), start flag, and lap-line sensors, add vehicle collision detection, and add a sensed-vehicle avoidance layer so the robot drives from its own sensors instead of ground-truth vehicle positions. This directly de-risks QA02/QA03 before CDR. Outputs a new versioned study `derived/full-mission-v11/` (and a sensor-model study `derived/sensing-v11/`).
- **Track 2 — on-board estimation and sensing.** Port the 4-state EKF to MicroPython, add gyro/reflectance/ToF/camera HAL stubs, and wire `main.mission()` so the board can localize in host tests. De-risks G3 fabrication (Jan 10) and G4 alpha (Feb 7).
- **Track 3 — prepared artifacts.** An RL-vs-classical evaluation scaffold and a refreshed owner-facing summary; deferred until Tracks 0–2 land, and mostly owner-facing.

House rules obeyed throughout (AGENTS.md / README): never edit pinned files; never edit sealed v10 package outputs — add a new versioned package; every generated package gets a `manifest.json` of input/output hashes, a `tools/verify-<name>.js` verifier, and a `tests/<name>.test.js` regression; retain negative results; label all agent-run output; run `node tools/check-all.js` after any change. Because the context window is compacted between sessions, each track is an independent, committable unit with a `SESSION-STATE-*.md` handoff.

[Types]

The simulator and on-board firmware are dependency-free, MicroPython-compatible Python (no dataclasses, `typing`, numpy, or `enum` on board), with JSON at the tool boundary. Types are therefore **data-shape contracts** rather than classes. Additions:

1. **`Meas` envelope extensions** — the dict returned by `software/stockcar/sensors.py::SensorSuite.measure`. In addition to the current `encoder_delta`, `gyro`, `white`, `line_changes`, `tof`, add:
   - `tag_id: int|None` — AprilTag ID (1–3) decoded this tick, `None` when not seen.
   - `tag_range_in: float|None`, `tag_bearing_rad: float|None` — camera-relative range/bearing to the tag.
   - `flag_visible: bool`, `flag_up: bool|None` — start-flag detector (`None` = not visible).
   - `lap_line_crossed: bool` — rising edge from the downward checkered-line detector for this tick, *distinct* from `line_changes` (which tracks the white octagon band).
   - `vehicle_tof: list[float|None]` — a forward/quartering obstacle-sensor ring ray-cast against vehicles only (not walls), separate from `tof` (walls+vehicles, consumed by the estimator). This is what lets the robot *sense* obstacles that the estimator deliberately rejects.
   - Unknown/occluded is always `None`, never fabricated — matching the existing sensor convention (`tof_dropout`, `gyro_noise`, etc.).

2. **`ObstacleReading = (range_in: float|None, bearing_rad: float|None)`** — the parsed output of the obstacle ring; the input to the slow-zone / S-curve avoidance policy.

3. **`CameraParams = {pos_in, yaw_rad, fov_rad, max_range_in, min_decodable_sin}`** — configurable camera mount and detection envelope. Values are documented assumptions (QA02 open); tag pose comes from a new field accessor below.

4. **On-board estimator state** — `x = [x_in, y_in, heading_rad, gyro_bias_rad_s]` and `P` (4×4 list-of-lists) reproduced from `software/stockcar/estimator.py::Estimator`. The firmware port keeps identical semantics; a golden test requires a host replay through both implementations to agree to within float round-off.

5. **Mission-log schema evolution** — extend `schemas/mission-log-v1.json` additively with an optional `sensing` block, or add `schemas/sensed-mission-v1.json`. Decided in Track 1 so `tools/replay-log.py` and the sealed v10 logs stay valid (never mutate the sealed schema in place).

6. **`ObstacleHandle = {mode: 'clear'|'slow'|'s_curve'|'blocked', plan_y: float|null, contacts: int}`** — the avoidance layer's per-straight decision, echoing the `lane_plan` return shape in `mission.py` but fed by sensed rather than true positions.

7. **`FieldGeometry` accessors (additive)** — `april_tag_pose()`, `start_flag_pose()`, `checkered_openings()`, `start_line()` on `software/stockcar/field.py::Field`, each returning `None` where the organizer placement is open (QA02/QA08) rather than a guessed value.

[Files]

New files (full paths, purpose):

- `software/stockcar/sensors_camera.py` — camera/AprilTag, start-flag, and checkered-lap-line detector models. Kept separate from `sensors.py` so the wheel/gyro/reflectance/ToF suite stays MicroPython-portable and the vision models (which need field geometry) can stay host-side cleanly.
- `software/stockcar/avoidance.py` — the sensed-obstacle avoidance layer: parses `vehicle_tof` into `ObstacleReading`, decides per-straight `ObstacleHandle` (clear / slow / S-curve / blocked), and emits the lateral plan consumed by `MissionSim.build_routes`.
- `software/stockcar/collision.py` — swept robot-footprint vs vehicle-footprint contact detection (SAT reuse from `geometry.py`), so a mission that would intersect a vehicle is recorded (and, in `hard` mode, stops) rather than passing through silently.
- `software/stockcar/tests/test_sensing_camera.py` — unit tests for the new sensors (tag decode envelope, flag arm/up semantics matching `Supervisor`, lap-line edge detection).
- `software/stockcar/tests/test_avoidance.py` — avoidance-layer behavior across the seeded layouts (clear, one vehicle, blocked), with negative cases (no contact-free line) asserted, not relaxed.
- `derived/sensing-v11/README.md`, `derived/sensing-v11/report.json`, `derived/sensing-v11/manifest.json` — the sensor-model study package, sealed.
- `derived/full-mission-v11/README.md`, `derived/full-mission-v11/report.json`, `derived/full-mission-v11/manifest.json` — the obstacle-aware, fully-sensed full-mission study package, sealed.
- `tools/sensing-v11.js` — generator for the sensing study.
- `tools/full-mission-v11.js` — generator for the mission study (reuses the `software/stockcar` Python path via a runner, like the v10 generator does).
- `tools/verify-sensing-v11.js` and `tools/verify-full-mission-v11.js` — artifact verifiers (auto-discovered by `tools/check-all.js`, which globs `tools/verify-*.js`).
- `tests/sensing-v11.test.js` and `tests/full-mission-v11.test.js` — Node regressions for the verifiers.
- `firmware/pico2/estimator.py` — MicroPython port of the EKF (`predict`, `correct`, `pose`), with inlined 4×4 matrix helpers and inlined `stockcar.sensors` geometry bits (`to_world`, `ray_cast`, `ring_distance`, `outward_normal`) or a small `firmware/pico2/geom.py`.
- `firmware/pico2/sensors.py` — on-board sensor reading: gyro/IMU (I2C on the reserved `PINS["i2c_sda"/"i2c_scl"]`), reflectance array, obstacle ToF ring, and a camera/tag and flag interface behind a HAL boundary (stubbed; real drivers follow after Order B hardware is chosen).
- `firmware/pico2/pose.py` — converts `(encoder_delta, gyro)` + line/range corrections into the pose used by `tracker.py`; a thin wrapper around the ported `estimator.py`.
- `firmware/host_tests/test_estimator_port.py` — golden parity: the firmware EKF matches `software/stockcar/estimator.py` on recorded sequences.
- `firmware/host_tests/test_mission_on_board.py` — runs `main.mission()` against `host_tests/plant_hal.py` with the estimator inline (whole lap / whole mission).
- `SESSION-STATE-2026-11-06.md` — dated handoff written at the end of the session.

Modified files:

- `software/stockcar/field.py` — add `april_tag_pose()`, `start_flag_pose()`, `checkered_openings()`, `start_line()` returning `None` where open.
- `software/stockcar/sensors.py` — add the `vehicle_tof` obstacle-sensor ring and its constants (front/quartering rays), keeping the existing estimator-facing `tof` untouched so sealed estimation work is unaffected.
- `software/stockcar/mission.py` — `MissionSim.__init__` gains `sense_obstacles` and `collision_mode`; `build_routes` sources lane plans from `avoidance.py` when `sense_obstacles`; the step loop calls `collision.check`; `observe()`/`info()` gain sensed/collision fields; `run()` and `MissionEnv` gain the same options.
- `software/stockcar/supervisor.py` — no behavior change (it already consumes `flag_up`/`tag_id`/`checker_crossing`); only the *source* of those fields changes from ground truth to sensed. Add a couple of clarifying doc lines and, if needed, nothing else.
- `firmware/pico2/config.py` — add sensor pins/params (IMU I2C already reserved, reflectance/ToF/camera stubs) as provisional placeholders, flagged for bench lead review exactly like the existing map.
- `firmware/pico2/hal.py` — add `read_gyro()`, `read_reflectance()`, `read_vehicle_ranges()`, `read_camera()` (stubbed) so `PicoHal` and `host_tests/fakes.py` share the same interface.
- `firmware/pico2/main.py` — add `mission()` entry that builds the runner + estimator + tracker + supervisor + route store chain; defaults remain `idle()` (safe boot unchanged).
- `firmware/host_tests/fakes.py` — mirror the new HAL methods with the plant model.
- `README.md` — add "Start here" rows for `derived/full-mission-v11/` and `derived/sensing-v11/`; update the "known limits" bullets so they are honest about what v11 now covers.
- `docs/plans/` — this document's predecessor was archived to `docs/plans/implementation-plan-v13-history.md` (done before writing this file).

Files to delete or move: none (sealed v10 outputs and historical HTML are preserved verbatim per house rules).

[Functions]

New functions (name — signature — file — purpose):

- `CameraModel.__init__(self, params)`, `CameraModel.read(self, pose, tag_pose) -> (tag_id|None, range_in|None, bearing_rad|None)` — `software/stockcar/sensors_camera.py` — decode the tag when the camera envelope (FOV, max range, viewing-angle threshold) admits it; return `None`s otherwise.
- `StartFlagModel.read(self, pose, flag_pose) -> (visible, up)` — `sensors_camera.py` — visibility + raised/lowered state from camera view.
- `LapLineDetector.detect(self, pose, prev_pose) -> bool` — `sensors_camera.py` — rising-edge crossing of the checkered opening in the travel direction.
- `obstacle_ring(pose, vehicles, rays) -> list[float|None]` — `sensors.py` — ray-cast against vehicles only (the `vehicle_tof` measurement).
- `plan_straight(field, sensed_vehicles, side, default_y) -> ObstacleHandle` — `avoidance.py` — choose clear/slow/S-curve/blocked and a lateral plan from sensed ranges, never from true layout.
- `check_step(robot_poly, vehicles, mode) -> contacts` — `collision.py` — swept contact count for the tick; `hard` mode returns a stop signal.
- `Field.april_tag_pose()`, `Field.start_flag_pose()`, `Field.checkered_openings()`, `Field.start_line()` — `field.py` — geometry accessors that return `None` where organizer placement is open.
- `est_port.mat(n, m)`, `est_port.mul(a, b)`, `est_port.transpose(a)`, `est_port.add(a, b)` — `firmware/pico2/estimator.py` (or `geom.py`) — inlined float matrix helpers replacing `estimator.py`'s `_mat/_mul/_t/_add`.
- `EstimatorBoard.predict(encoder_delta, gyro, dt)`, `EstimatorBoard.correct(meas, use_lines, use_ranges)`, `EstimatorBoard.pose()` — `firmware/pico2/estimator.py` — the ported EKF with surviving counters (`line_updates`, `range_rejected`, etc.) for the golden test.
- `main.mission(preset="safe", routes_dir="...")` — `firmware/pico2/main.py` — build and run the on-board mission chain; boot default stays `idle()`.
- `hal.read_gyro()`, `hal.read_reflectance()`, `hal.read_vehicle_ranges()`, `hal.read_camera()` — `firmware/pico2/hal.py` + `host_tests/fakes.py` — stubbed sensor interfaces.

Modified functions:

- `SensorSuite.measure(self, pose, v, w, dt)` — `sensors.py` — append `vehicle_tof` (and optionally `tag/flag/lap` fields if the models are injected) while keeping existing keys byte-stable.
- `MissionSim.__init__(self, preset, envelope, field, footprint_kind, sensing, sense_obstacles, collision_mode)` — `mission.py` — new options with validation.
- `MissionSim.build_routes(self, layout)` — `mission.py` — when `sense_obstacles`, call `avoidance.plan_straight` instead of `lane_plan`; keep the truth-based `lane_plan` path for regression comparison.
- `MissionSim.step(...)` — `mission.py` — call `collision.check_step`; record `vehicle_contacts` from geometry rather than the "continue gently" planner assumption.
- `MissionSim.observe()` / `MissionSim.info()` — `mission.py` — add sensed/collision fields to the RL observation and the report.
- `supervisor.py` — no functional change; only confirm the sensed `flag_up`/`tag_id`/`checker_crossing` feed the existing `DEFAULTS` logic (`flag_confirm_frames`, `tag_votes_needed`, lap-count guard at `lap_tolerance`).

Removed functions: none. `lane_plan` and the v10 paths stay, frozen behind the new flags, so the sealed `derived/full-mission-v10/` and `derived/mission-v10/` outputs remain reproducible.

[Classes]

New classes:

- `CameraModel` (`software/stockcar/sensors_camera.py`) — methods `read(pose, tag_pose)`; config from `CameraParams`; pure geometry + noise, no I/O.
- `StartFlagModel` (`sensors_camera.py`) — mirrors `Supervisor`'s down-to-arm / up-to-start frame semantics (`flag_down_frames_to_arm`, `flag_confirm_frames`) at the sensing layer so the sim exercises the same counts a deployed camera would.
- `LapLineDetector` (`sensors_camera.py`) — stateful edge detector with a travel-direction guard.
- `AvoidancePlanner` (`avoidance.py`) — holds the slow-zone/S-curve policy thresholds; `plan_straight` is its main entry.
- `CollisionModel` (`collision.py`) — holds the robot footprint kind and `hard|soft` contact policy; `check_step` returns per-tick contacts.
- `EstimatorBoard` (`firmware/pico2/estimator.py`) — ported 4-state EKF; methods `predict`, `correct`, `pose`; exposes the same counters as `Estimator` for parity.

Modified classes:

- `SensorSuite` (`sensors.py`) — gains an obstacle-sensor ring and (optionally injected) vision models; the estimator-facing paths are unchanged.
- `MissionSim` (`mission.py`) — new constructor options and a sensed-avoidance route build; the v10 truth path remains selectable for regression.
- `Field` (`field.py`) — additive geometry accessors only.
- `Supervisor`, `Estimator`, `Tracker`, `SensorSuite` semantics — unchanged on the host (Track 1 must not disturb the sealed estimation/maneuver/full-mission v10 results; every new behavior is behind an opt-in flag).

No classes removed.

[Dependencies]

No new third-party packages. Constraints and integration notes:

- Host simulator and tests: existing standard-library Python 3.12 via `uv`, existing Node v24 for the JS tools/verifiers — nothing added. CadQuery/cascadio/trimesh/Playwright are **not** needed by this phase (they belonged to the v13 CAD/showcase work).
- On-board firmware port must pass `tools/micropython_lint.py` and remain import-light: no numpy, dataclasses, typing, or `enum`; matrices are fixed-size list-of-list float ops with explicit `N=4`.
- Sensor/tag/camera hardware drivers are **stubbed** behind `hal.py`; real drivers are intentionally deferred until Order B hardware (driver, IMU, ToF, camera) is chosen and the bench lead reviews the pin map — this keeps the firmware honest (README: "not flashed, not run on hardware").
- `tools/check-all.js` auto-discovers `tools/verify-*.js`, so the two new verifiers are picked up with no harness change; the new Python tests live under `software/stockcar/tests/` and `firmware/host_tests/`, both already wired into `check-all`.

[Testing]

Test file requirements and validation strategy (each track is proven before it is committed):

Track 0 (hygiene):

- Run `node tools/check-all.js --json /tmp/ieee-v13.json` from the reconciled tree; require `RESULT: PASS` (all 55 Node test files, all 32 verifiers, both Python suites, and tree-unchanged). Any pre-existing failure is recorded and not silently papered over.
- Run `secrets-guard --staged` before the commit; a scan of changed sources for accidental credentials.
- Confirm `git log` shows `main` containing both the v13 showcase commit and the newly committed refinements, and `next-phase-v10` reconciled (or archived) with no orphaned valuable work.

Track 1 (sensing + obstacle-aware mission):

- `software/stockcar/tests/test_sensing_camera.py`: tag decode only inside the envelope (range/FOV/viewing-angle cutoffs), `None` outside; flag arm needs `flag_down_frames_to_arm` down-frames then `flag_confirm_frames` up-frames (mirrors `test_supervisor.py`); lap-line edge fires only in the travel direction.
- `software/stockcar/tests/test_avoidance.py`: seeded layouts — clear (no vehicle detected → `clear`), one detected vehicle with an open lane (`slow` or `s_curve`), and an undetected/blocked case (`blocked`); the "no contact-free gap" case is asserted as a genuine negative result (0–2.5% layouts), never relaxed to make a route pass (matches the lap-study finding).
- Regression: re-run `derived/full-mission-v10` and `derived/mission-v10` generation through their verifiers and confirm byte-identical outputs — proving the v10 truth path is untouched.
- New sealed packages `derived/sensing-v11/` and `derived/full-mission-v11/` with `manifest.json`; `tools/verify-sensing-v11.js` and `tools/verify-full-mission-v11.js` reproduce them; `tests/sensing-v11.test.js` and `tests/full-mission-v11.test.js` assert the manifests and key summary numbers (mission counts, contact rates, finishes, and the honest "vehicles still sensed imperfectly" caveats).
- The full-mission-v11 report must state, explicitly: contact-free finish rate, per-lap vehicle-contact counts, and which sensing path (ToF-only, camera-only, full) completed — including failures. Do not present a sensed result as the old "91/91 no wall contact" upper bound.

Track 2 (on-board estimator):

- `firmware/host_tests/test_estimator_port.py`: golden parity — feed recorded `(encoder_delta, gyro, meas)` sequences through both `software/stockcar/estimator.py::Estimator` and `firmware/pico2/estimator.py::EstimatorBoard`, assert `pose()` and counters agree to a stated float tolerance.
- `tools/micropython_lint.py` passes on every new `firmware/pico2/*.py` file.
- `firmware/host_tests/test_mission_on_board.py`: `main.mission()` against `host_tests/plant_hal.py` completes a lap and a whole mission with the estimator inline; safety invariants unchanged (boots to IDLE, latched stops).
- Existing `firmware/host_tests/*` (67 tests) and `software/stockcar/tests/*` remain green via `node tools/check-all.js`.

Tracking the overall effort across compacted context windows: each track ends with an update to a `SESSION-STATE-*.md` handoff and a single `check-all` run whose JSON summary is committed alongside the change, so the next session can resume without re-deriving state.

Validation boundaries (stated in every derived package, per house rules): results are synthetic simulator/host-test evidence; they are not physical robot validation, a legal-rules ruling, or a competition score. No purchase, organizer contact, or flashing occurs.

[Implementation Order]

Numbered steps, sequenced to minimize conflict and land every unit verifiably:

**Track 0 — repository hygiene (foundation; do first).**

1. Reconcile the branches. Confirm which commits are unique to `next-phase-v10` (the Showcase-v10 overview commit and the MCP-servers commit) versus `main` (the v13 showcase commit and the release-habit doc), then bring both unique sets onto `main` without rewriting published history. Archive `next-phase-v10` as a named historical branch rather than leaving a divergent live branch.
2. Stage the untracked v13 refinements onto `main`: `cad-v13/`, `derived/cad-v13/`, `derived/showcase-v13/`, `robot-studio-v11/` + `v13/`, `share/Showcase-v11|v12|v13.html`, `share/HOST-V13.txt`, `docs/mechanical-readiness-v13.md`, `docs/plans/*`, `tools/*v13*`, `tests/*v13*.test.js` (and the v11/v12 counterparts), plus the updated `README.md`/`AGENTS.md`.
3. Run `node tools/check-all.js` from the reconciled tree and require PASS; fix only genuine breakage (e.g., a referenced file moved by the archive step), never by editing sealed outputs.
4. Run `secrets-guard --staged`, then commit and push to `main`. Write `SESSION-STATE-2026-11-06.md` recording the final commit hashes and the check-all JSON path.

**Track 1 — fully-sensed, obstacle-aware simulator (highest technical leverage; before the Dec 13 CDR).**

5. Add `Field` geometry accessors (`april_tag_pose`, `start_flag_pose`, `checkered_openings`, `start_line`) returning `None` where open.
6. Add the `vehicle_tof` obstacle ring to `SensorSuite` + `obstacle_ring` (the estimator-facing `tof` path stays untouched).
7. Implement `sensors_camera.py` (`CameraModel`, `StartFlagModel`, `LapLineDetector`) with `test_sensing_camera.py`.
8. Implement `collision.py` and wire `check_step` into `MissionSim.step`, gated behind `collision_mode`.
9. Implement `avoidance.py` (`AvoidancePlanner.plan_straight`) and gate `build_routes` behind `sense_obstacles`; keep `lane_plan` as the regression path. Add `test_avoidance.py`.
10. Generate and seal `derived/sensing-v11/` (`tools/sensing-v11.js`, `tools/verify-sensing-v11.js`, `tests/sensing-v11.test.js`).
11. Generate and seal `derived/full-mission-v11/` (`tools/full-mission-v11.js`, `tools/verify-full-mission-v11.js`, `tests/full-mission-v11.test.js`); report contact-free rates, per-lap contacts, and per-sensing-path completions including failures.
12. Confirm the sealed v10 outputs reproduce byte-identically (no regression), update `README.md` and the session handoff, commit.

**Track 2 — on-board estimation and sensing (de-risks G3/G4 in Jan–Feb).**

13. Port the EKF to `firmware/pico2/estimator.py` (+ inlined matrix/geometry helpers), passing `tools/micropython_lint.py`.
14. Add golden parity `firmware/host_tests/test_estimator_port.py` against the host `Estimator`.
15. Add sensor HAL stubs (`read_gyro`, `read_reflectance`, `read_vehicle_ranges`, `read_camera`) to `hal.py`/`fakes.py`, and `firmware/pico2/sensors.py`/`pose.py`.
16. Wire `main.mission()` (safe `idle()` boot unchanged) and add `firmware/host_tests/test_mission_on_board.py` (lap + whole mission through `plant_hal.py`).
17. Run `node tools/check-all.js`, commit, update the handoff. Real drivers stay deferred to Order B + bench-lead review.

**Track 3 — prepared artifacts (deferred; owner-facing).**

18. Add an RL-vs-classical evaluation scaffold (`MissionEnv` + a policy-runner + a short report) only after Tracks 1–2 land, per the strategy's "only against a coherent classical baseline" rule.
19. Refresh the owner-facing public summary (README "Status", `PROJECT-STATUS.md`) to describe v11 work and the still-open physical gates; propose (not execute) the Q&A posting text in `derived/qa-pack-v10/` if the owner asks.
20. Final `node tools/check-all.js`, `secrets-guard`, and a dated `SESSION-STATE` close-out.

Ordering rationale: Track 0 gives a clean, reproducible base so Tracks 1–2 commit cleanly; Track 1 addresses the biggest technical risk (QA03/QA02) before the Dec 13 CDR; Track 2 layers the same math onto the board for the fabrication/alpha gates; Track 3 only adds polish and defers anything owner- or hardware-blocked.