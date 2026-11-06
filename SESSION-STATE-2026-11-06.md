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

## Next

Track 1 continued (per `implementation_plan.md`): a sensed **vehicle** detection + avoidance layer and
sealed `derived/sensing-v11/` / `derived/full-mission-v11/` packages; then Track 2 (board-side estimator).
The lap-line model exists but is not yet wired into the mission, because the v10 route transitions key
`checker_crossing` off route completion rather than the literal checkered line — that needs a route
refactor and its own validation.