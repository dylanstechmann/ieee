# Session State — 2026-11-07 · roboticThingAvoidance (worlds)

## Goal
Prepare `roboticThingAvoidance` for multiple rule interpretations: one named "world" branch per combination of the open organizer questions (QA01–QA10), with per-world RL training artifacts. Primary world first, then stamp the rest. A ruling later fast-forwards `main` to the matching branch (owner approves).

## DONE (all committed + pushed on `world-ccw-line-sq-adv-align`, HEAD `f691e18`)
Steps 1–6 complete on primary:
- `software/stockcar/ruleset.py` + `DEFAULT_WORLD` + `worlds.json` + `tests/test_ruleset.py` (8 worlds; `deps()` = QA01/03/04/06; `mission.py` SHA-256 pinned as a regression guard).
- `software/stockcar/world_routes.py` — CW mirror of `routes.lap`. NOTE `routes.py` is a PINNED input of `full-mission-v10`/`maneuver-v10`; kept byte-identical.
- `software/stockcar/mission_worlds.py` (`WorldMissionSim`/`WorldMissionEnv`) + `tests/test_worlds.py`. Primary completes 3 laps, finish at the checkered band (QA06).
- `docs/worlds.md` — the 8-world named table.
- Step 6 tooling: `tools/train-world.py`, `tools/evaluate-world.py`, `tools/verify-world.js`, `tests/worlds.test.js` (all stdlib; `verify-world.js` auto-run by `check-all`, reads `DEFAULT_WORLD`).
- Sealed `derived/rl-v3/world-ccw-line-sq-adv-align/` (report/summary/manifest/trained-weights/training). Results: classical 20/20 (score 267.75), learned 17/20 (219.5), random 0/20; train best fitness 74.715.
- `check-all` green 43/43 (node 296 pass, verify-world, python software 218, firmware 72).

## Branches (heads)
- `world-ccw-line-sq-adv-align` `f691e18` — PRIMARY: Step 1–6 + sealed artifact + tooling.
- `world-ccw-gate-sq-adv-align` `108fb7c`, `world-ccw-line-rd-adv-align` `ab361ee`, `world-ccw-gate-rd-adv-align` `70ef6e2`, `world-ccw-line-sq-adv-yaw` `d639daf`, `world-cw-line-sq-adv-align` `02f0479` — siblings cut from `9578e60`; each has its own `DEFAULT_WORLD` but NOT yet Step 6 tooling or a seal.
- `enforced` (`world-ccw-line-sq-enf-align`) + `small` (`world-ccw-line-sq-adv-small`) — NOT cut; `mission_worlds` raises `NotImplementedError`.

## KEY CONSTRAINT (do not violate)
Pinned — hashed by existing sealed verifiers; MUST stay byte-identical: `software/stockcar/{mission.py, routes.py, field.py, obstacles.py, supervisor.py, lapmodel.py, passage.py, geometry.py, sensors.py, sensors_camera.py, estimator.py}` + `derived/organizer-cad-v10/field-v10.json`. ALL new world behavior must land in UNPINNED files (`mission_worlds.py`, `world_routes.py`, and the planned `world_geometry.py` / `world_layouts.py`). `tests/test_worlds.py` pins `mission.py` SHA-256 `346fb5c977fddaaad7d790afcb466beacb3f2beeebe01803befb9da004032678`.

Relevant facts: `random_layout` (pinned) hardcodes `GUIDE_PLUSH` and has no shape arg → "small" needs a world-specific layout generator. `lane_plan`/`classical_action` are advisory (whole corridor) → "enforced" needs new logic. White-line marking lives in `field-v10.json` `clearances_in` (`side_lane_wall_face_to_marking_outer_edge` 10.53 / `inner_lane_marking_inner_edge_to_divider_face` 11.071), readable via `Field.data` WITHOUT editing `field.py`; band ≈0.9 in wide.

## Tooling usage (per world W)
- `uv run --no-project --python 3.12 python -B -I tools/train-world.py --world W` → `derived/rl-v3/W/{trained-weights,training}.json`
- `... tools/evaluate-world.py --world W` → `derived/rl-v3/W/{report,summary,manifest}.json` (seal; classical/random/learned on eval seeds 100–119)
- `node tools/verify-world.js` (reads `DEFAULT_WORLD`); `node tools/check-all.js` runs the full gate.

## OPEN DECISION (ask owner on return) — immediate scope
- **Option A (RECOMMENDED): Step 7 only** — stamp the 6 functional siblings (gate-sq, line-rd, gate-rd, yaw, cw): for each W, `git checkout -B W primary`, set `DEFAULT_WORLD=W`, `git rm -r` primary's seal, `train-world.py --world W` + `evaluate-world.py --world W`, `check-all`, commit, `push -f`. ~15 min compute. Defer `enforced`/`small`.
- **Option B: all 8** — also implement `enforced` + `small` now. NOT recommended to rush: semantics are ambiguous and two forced defaults are shaky (below).

`enforced` (QA04) ambiguity — decide before implementing: which white line (outer/inner mid-corridor marking)? and hard in-lane route constraint vs crossing-penalty? Hard constraint is more faithful to "must stay in lane" but makes it near-always-fail (10 in robot in an ~11 in lane can't pass an 8.2 in obstacle). My initial crossing-penalty pick (penalty on the advisory route) measures the wrong thing.

`small` (QA03) ambiguity — narrower than QA03 (toy *interpretation*, not just size); `obstacle: small` axis is a simplification. Real toy 6.5 × 3.25 in; placeholder 8 × 4.

## Next (after owner confirms scope)
- Option A → run Step 7 (6 worlds), then STOP + report. `enforced`/`small` become a separate, deliberate work item once semantics are pinned.
- Option B → pin `enforced`/`small` semantics first (which line; hard vs penalty), then implement in `world_geometry.py`/`world_layouts.py`/`mission_worlds.py`, then stamp all 8.
- Optional Step 8 (policy strengthening: nonlinear MLP / larger CEM) and Step 9 (promotion, ask owner first) after that.

## Files (this session)
- Rewrote `implementation_plan.md` — detailed remaining-work plan; its STATUS header flags the open decision; its `enforced`/`small` sections are DEFERRED DESIGN REFERENCE, not approved scope.
- This checkpoint: `SESSION-STATE-2026-11-07.md`.

## Re-orient after compaction
`git log --oneline` (HEAD `f691e18`), `git branch -a`, then read `implementation_plan.md` (STATUS header), `docs/worlds.md`, and this file. The pinned-file constraint is the #1 trap — never edit `mission.py`/`routes.py`/`field.py`/`obstacles.py`. Confirm the 6-vs-8 scope with the owner before writing code.