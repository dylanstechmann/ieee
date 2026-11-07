# Implementation Plan — Ruleset "worlds" for the open rule questions

[Overview]

Goal: consolidate the ten open organizer assumptions (QA01–QA10) into one versioned, single-source ruleset (`stockcar.ruleset`) so that every plausible combination of rule answers is a named, cheaply-built "world" branch; build and validate the best-guess world first, stamp out the rest with near-zero per-branch work, and only then train the RL policy per world.

Context: the v10 simulator hard-codes ten "working assumption" decisions across scattered files (`mission.py`'s route model, `supervisor.DEFAULTS`, `field.quadrants`, `obstacles.GUIDE_PLUSH`, `sensors_camera`'s TAG/FLAG poses). The owner wants to prepare for whichever answers the organizers eventually give — without contacting them — by making one branch per combination and fast-forwarding `main` to whichever branch a ruling later validates. The full cross-product of the five high-impact dimensions is 72 worlds, but most differ only across low/medium-impact knobs (QA02/07/08/09/10) that change reliability/timing/margins rather than strategy, so a **curated set of 8 named worlds** is the chosen scope. `mission.py` is a pinned input of five sealed packages and will not be edited; worlds reach it through the existing subclass/constructor seam, so it stays byte-identical.

Approved (2026-11-06): curated 8-world scope; primary/best-guess is **`world-ccw-line-sq-adv-align`** (the checkered band is the finish line, per QA06); build the seams first so the remaining worlds are cheap, then train.

[Types]

Dependency-free (stdlib Python + JSON at tool boundaries). Data-shape contracts only.

- `WorldName` — one of the 8 kebab-case keys, e.g. `world-ccw-line-sq-adv-align`.
- `WorldSettings` — a dict with exactly these keys/values:
  - `lap`: `"gate"` | `"line"` — where a lap/finish registers (route gate vs the literal checkered band).
  - `lap_mode`: `"drive"` | `"all"` — only when `lap == "line"`; `drive` suppresses band crossings during the pit detour, `all` counts every crossing.
  - `direction`: `"ccw"` | `"cw"`.
  - `body`: `"square10"` | `"round10"` (maps to `footprint_kind` and `footprint_in`).
  - `lane_rule`: `"advisory"` | `"enforced"`.
  - `obstacle`: `"align"` | `"yaw"` | `"small"` — obstacle shape/yaw/size.
  - `reading`: `"offsets"` | `"sixteen_from_wall"` | `"six_other"` (QA03; `"offsets"` in all 8).
  - `yaw_mode`: `"aligned"` | `"random"`.
  - Pinned (identical in all worlds): `tag_pose`, `flag_pose`, `flag_mode = "raise"`, `pit_fraction = 0.75`, wall/divider tolerance variants, `preset`, `envelope`.
  - Derived helpers: `footprint_kind`, `footprint_in`, obstacle `shape` dict.
- `WorldDeps` — `WorldName` → QA-item list, e.g. `world-ccw-line-sq-adv-align` → `[QA01, QA03, QA04, QA06]`.
- `WorldResult` (per-world seal) — the sim's `info()` dict plus `world`, `policy_weights_file`, and train/eval seeds; the verifier compares recorded numbers, not a direction.
[Files]

New:

- `software/stockcar/ruleset.py` — `WORLDS` (the 8 presets), `get(name)`, `get_default()` (reads `software/stockcar/DEFAULT_WORLD`), `deps(name)`. Single source of truth.
- `software/stockcar/DEFAULT_WORLD` — one-line file; each world branch sets it to its own name.
- `software/stockcar/worlds.json` — machine-readable name↔settings↔QA table (for `verify-world.js`).
- `software/stockcar/mission_worlds.py` — `WorldMissionSim(MissionSim)` and `WorldMissionEnv` (train 0–99 / eval 100–119).
- `software/stockcar/mission_worlds.py` — `WorldMissionSim(MissionSim)` and `WorldMissionEnv` (train 0–99 / eval 100–119).
- `software/stockcar/world_routes.py` — `lap_points(direction)` CCW/CW mirror (kept out of the pinned `routes.py`).
- `software/stockcar/tests/test_ruleset.py`, `software/stockcar/tests/test_worlds.py`.
- `docs/worlds.md` — the human-readable table: branch name, one-line uniqueness, the 5 dimension values, QA items (the "name the combinations" deliverable).
- `tools/train-world.py` (`--world`, `--out`), `tools/evaluate-world.py` (`--world`, `--out`).
- `tools/verify-world.js` + `tests/worlds.test.js`.
- `derived/rl-v3/<world>/` — per-world sealed package (report/summary/manifest/weights); only the DEFAULT world's package exists on a given branch.

Modified:

- `software/stockcar/routes.py` — **left byte-identical**: it is a pinned input of the sealed `full-mission-v10`/`maneuver-v10` packages, so the CW mirror lives in the new `world_routes.py` instead (corrected from the original draft, which wrongly planned an additive edit here).
- `tools/train-rl-policy.py`, `tools/evaluate-rl-v2.py` — left frozen; `derived/rl-v2` stays reproducible. New tools are additive.
- `tools/check-all.js` — default steps untouched; `tests/worlds.test.js` joins the node suite but only asserts (a) the 8 worlds validate, (b) `get_default() == DEFAULT_WORLD`, (c) the primary world completes 3 laps. It must NOT require all 8 derived packages (each branch has only its own).

Archived: `implementation_plan.md` → `docs/plans/implementation-plan-v15-history.md` (done).

Branch plumbing: a world branch is the **shared codebase** with `DEFAULT_WORLD` set to its name and its `derived/rl-v3/<world>/` committed. Code is identical across worlds, so per-branch work = one line + one regeneration.

[Functions]

- `ruleset.get(name)` → validated `WorldSettings`; `KeyError` unknown, `ValueError` malformed.
- `ruleset.get_default()` → `WorldSettings` for the name in `DEFAULT_WORLD`.
- `ruleset.deps(name)` → QA-item list.
- `world_routes.lap_points(direction)` → `[pts]` plain-lap oval for CCW/CW (CCW reuses `routes.lap(lane_lines())`; CW the y-reflected mirror), keeping the pinned `routes.py` untouched.
- `WorldMissionSim.build_routes(layout)` (override) → ENTER/LAP/TO_PIT/EXIT_PIT/PARK from `lap_lines(...)`, the world footprint, and corridor bounds for `enforced`.
- `WorldMissionSim._mission()` (override) → mirrors `MissionSim._mission()` but keys the lap/finish signal per `lap`: `gate` uses route completion as today; `line` arms `LapLineDetector` and fires `checker_crossing` on a rising band crossing filtered by `lap_mode` and the supervisor's `lap_length_m`/`lap_tolerance` guard.
- `tools/train-world.py main()` → `--world`, `--out`; CEM hyperparameters identical to `train-rl-policy.py` (POPULATION 16, ELITE 4, GENERATIONS 10, TRAIN_SEEDS [0,1,2,3], MAX_STEPS 1200); writes `trained-weights.json` + `training.json`.
- `tools/evaluate-world.py main()` → `Classical` + `LearnedPolicy` + `Random` through `WorldMissionEnv` over eval seeds 100–119; seals report/summary/manifest.
- `tools/verify-world.js` → checks the sealed package, report numbers, and branch↔`DEFAULT_WORLD` consistency.
[Classes]

- `WorldMissionSim(MissionSim)` — `__init__(self, world=None, preset="aggressive", envelope="nominal", field=None, **overrides)`; `world` defaults to `ruleset.get_default()`; forwards `footprint_kind`/`footprint_in`, obstacle shape, reading/yaw to `MissionSim.__init__` and `random_layout`; overrides `build_routes` and `_mission` only. `step`/`observe`/`info`/sensing/estimation are inherited unchanged.
- `WorldMissionEnv` — `__init__(self, world=None, evaluation=False, **kw)`; mirrors `MissionEnv` (`TRAIN = range(0,100)`, `EVAL = range(100,120)`); `reset(seed)`/`step(action)` delegate to `WorldMissionSim` with the world's `random_layout` args.

[Dependencies]

No new third-party packages. Stdlib Python + the existing Node verifier pattern. The owner's laptop/cloud budget maps to re-running `tools/train-world.py` with larger `--generations`/`--population`, or a future nonlinear `LearnedPolicyMLP` in `software/stockcar/policies.py` (still CEM-trained in stdlib so sealed artifacts stay reproducible). No external RL framework initially.

[Testing]

- `test_ruleset.py`: all 8 names present and valid; unknown world → `KeyError`; `get_default()` matches `DEFAULT_WORLD`; pinned knobs identical across worlds; QA-deps map covers every world.
- `test_worlds.py`: (1) **regression** — `mission.py` SHA-256 unchanged; (2) CW loop is a mirror of CCW (y→48−y reflection, within 1e-9); (3) the primary world completes 3 laps on seeds 0–3 and registers the finish at a band crossing; (4) `lap_mode="drive"` suppresses band crossings during TO_PIT/EXIT_PIT; (5) `round10` vs `square10` footprint radius differs as expected.
- `tests/worlds.test.js`: node-suite contract — 8 worlds validate, DEFAULT world completes a mission, and its sealed package (if present) re-verifies.
- Regression guard: `node tools/check-all.js` stays green after the scaffolding lands, with `software`/node test counts only increasing.
- Validation boundary (stated in every sealed package): synthetic simulator + host-test evidence only — not a rules ruling, competition score, or physical validation.

[Implementation Order]

1. Add `ruleset.py` + `DEFAULT_WORLD` + `worlds.json` + `test_ruleset.py`. Gate: `check-all` green; `mission.py` byte-identical.
2. Add CW mirror + line-aware geometry to `routes.py` (additive only). Gate: mirror-equality test; existing verifiers green.
3. Add `mission_worlds.py` + `test_worlds.py`, proving the primary world completes 3 laps with the finish at the checkered band.
4. Write `docs/worlds.md`. Commit steps 1–4 after `secrets-guard`.
5. Cut the branches from `main`, primary first: `world-ccw-line-sq-adv-align`, then `world-ccw-gate-sq-adv-align`, `world-ccw-line-rd-adv-align`, `world-ccw-gate-rd-adv-align`, `world-ccw-line-sq-adv-yaw`, `world-ccw-line-sq-enf-align`, `world-cw-line-sq-adv-align`, `world-ccw-line-sq-adv-small`. Each sets `DEFAULT_WORLD` to its name (`#4` and `#8` optional; dropping them gives 6).
6. On the primary branch: add `train-world.py` + `evaluate-world.py` + `verify-world.js` + `tests/worlds.test.js`; train `LearnedPolicy`; seal `derived/rl-v3/world-ccw-line-sq-adv-align/`; run `check-all`; push.
7. Stamp out the remaining 7: set `DEFAULT_WORLD`, regenerate its `derived/rl-v3/<world>/` via `train-world.py` + `evaluate-world.py`, run `check-all`, push. (Step 6 does the real work once.)
8. Optional, after compute-budget confirmation: strengthen the policy (nonlinear MLP / larger CEM), re-compared against `Classical` per world.
9. Promotion: when a ruling lands, confirm the matching branch's `DEFAULT_WORLD`, re-run `check-all`, and fast-forward `main` to that branch — ask the owner first, per the standing habit.

Owner decisions baked in: curated 8-world scope; primary = `world-ccw-line-sq-adv-align`; scaffolding/seams first, training after.