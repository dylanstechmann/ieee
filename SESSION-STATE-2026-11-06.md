# Session state — 2026-11-06, track 0 (repository reconciliation and release)

Agent-run housekeeping for the owner's hobby/learning project. No purchases, fabrication, organizer contact, or physical work.

## What changed

The working tree was on `next-phase-v10`, which had diverged from `main` (2 commits
ahead, 2 behind), and a large set of v11–v13 showcase/CAD artifacts (`cad-v13/`,
`derived/cad-v13/`, `docs/mechanical-readiness-v13.md`, a refined
`share/Showcase-v13.html`, updated `README.md`/`AGENTS.md`, `tools/*v13*`,
`tests/*v13*.test.js`, …) was uncommitted/untracked.

- `.gitignore` now excludes `*.tar.gz`, so the 92 MB
  `ieee-pre-consolidation-2026-11-01.tar.gz` backup stays out of git (the tracked
  `website-release.tar.gz` is unaffected).
- Committed the working-tree v13 refinements (`4442b80`).
- Merged `main` into the branch, resolving the single `README.md` conflict in favour
  of the richer current text (`ecdbc7f`).
- Fast-forwarded `main` to `ecdbc7f`; `next-phase-v10` points at the same commit.
- Pushed `main` to `origin/main` (`635a46e..ecdbc7f`).

## Validation

- `node tools/check-all.js --json /tmp/track0-check.json` → **PASS**, 36 steps:
  55 Node test files (289 tests), all 32 artifact verifiers (including the new
  `verify-cad-v13`), `software` Python (138), firmware host tests (67), and the
  working-tree-unchanged check. 170.3 s.
- `secrets-guard --worktree` reports one hit — a **false positive**: the substring
  "BSAGBb" on line 423 of `share/Showcase-v10.html` is inside a
  `data:image/png;base64,` data URI, not a real key. No rotation needed; the scanner
  regex matches base64 bytes. No other hits.

## Commit hashes

- `f4ce87e` gitignore: exclude archive tarballs
- `4442b80` consolidate v11-v13 source-evidenced showcase: CAD sources, derived artifacts, docs, tests and tools
- `ecdbc7f` merge main: reconcile v13 showcase release and shared release habit (now `main` and `origin/main`)

## Track 1a — sensed game-element observations (done)

Added camera-based sensor models and wired the AprilTag (pit box) and start flag into the mission so the
supervisor senses them instead of being told:

- `software/stockcar/sensors_camera.py` — `CameraModel` (tag read within a range/FOV envelope),
  `StartFlagModel` (visibility gated flag state), `LapLineDetector` (checkered-opening edge from the real
  `field-v10.json` `checker_band`). Tag/flag poses are documented assumptions (QA02/QA08 open).
- `software/stockcar/mission_sensed.py` — `SensedMissionSim(MissionSim)`: an opt-in subclass that feeds
  `tag_id`/`flag_up` through the camera models. This is a **subclass, not an edit of `mission.py`**, which
  is a pinned input of five sealed v10 packages and was left byte-identical (SHA-256 `346fb5c9…`).
- `software/stockcar/tests/test_sensing_camera.py` — unit tests plus a sensed-mission integration test that
  completes three laps and resolves its box from tag votes.

`node tools/check-all.js` passes (36/36); `software` suite is now 151 tests.

## Track 1b — vehicle collision detection and avoidance (done, part 1)

- `software/stockcar/collision.py` — `overlapping` / `check` (signed-separation polygon tests) and a
  `ContactRecorder` mirroring `MissionSim._contacts` without its side effects.
- `software/stockcar/avoidance.py` — `plan_shift` (centre of the widest open lateral band past one
  vehicle, preferring the side nearest the lane) and `shifted_target` waypoint offset helper.
- `SensedMissionSim` gained a `collision_stops` flag: the frame after any vehicle contact the robot halts
  instead of the v10 "continue gently" policy. `software` suite is now 158 tests.

## Track 1b — sealed sensing-v11 and full-mission-v11 packages (done)

- `tools/evaluate-sensing-v11.py` → `derived/sensing-v11/`: characterises the camera models (tag/flag
  read envelope from a 5,580-pose sweep) and the lap-line detector (1 rising edge per checkered opening,
  0 in the divider gap). `tools/verify-sensing-v11.js` + `tests/sensing-v11.test.js`.
- `tools/evaluate-full-mission-v11.py` → `derived/full-mission-v11/`: 180 runs (seeds 100-119 x
  empty/aligned/random-yaw x truth/sensed/sensed_stop). Key results: **sensed matches truth exactly** (the
  camera resolves the box/flag without costing the mission); with guide-size vehicles **0% of runs are
  contact-free** (all 60 laps touch a vehicle — the QA03 risk is real); `sensed_stop` halts at the first
  contact (1 contact lap/run) instead of scraping through all three. `tools/verify-full-mission-v11.js` +
  `tests/full-mission-v11.test.js`.

`node tools/check-all.js` passes 38/38.

## Important finding — sealing pins nearly every stockcar source file

Reading the sealed manifests shows the pinned v10 inputs **include** `mission.py`, `supervisor.py`,
`lapmodel.py`, `passage.py`, `field.py`, `obstacles.py`, `geometry.py`, `dynamics.py`, `envelope.py`,
`sensors.py`, `estimator.py`, `tracker.py`, `routes.py`, and most of `firmware/pico2/*.py` /
`firmware/host_tests/*.py`. So the plan's steps that say to *edit* `Field`, `SensorSuite`, `MissionSim`,
`build_routes`, etc. must instead be done as **new files + subclasses** (as `mission_sensed.py`,
`collision.py`, `avoidance.py` do). Do not edit pinned files; every new study goes in a new versioned
package.

## Next

- **Track 1c** — wire `avoidance.py` into the subclass's route target so a vehicle is routed *around*
  (not just stopped at), and re-seal `full-mission-v11` to show contact-free runs rising above 0.
- **Track 2** — EKF port to `firmware/pico2/estimator.py` (+ new host parity test) and HAL stubs; only
  unpinned firmware files (`hal.py`, `main.py`, new files) are safe to touch.
- **Track 3** — RL scaffold + owner-facing summary (deferred by design).
- The lap-line model (`LapLineDetector`) exists but stays unwired until the v10 route transitions are
  refactored, because `checker_crossing` is currently keyed off route completion, not the literal line.