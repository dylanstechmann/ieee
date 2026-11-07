# Implementation Plan

## STATUS & OPEN DECISION (2026-11-07 — read this first)

Steps 1–6 are **DONE** on `world-ccw-line-sq-adv-align` (HEAD `f691e18`, pushed): `ruleset.py`/`worlds.json`/`DEFAULT_WORLD`, `world_routes.py` (CW mirror), `mission_worlds.py` (`WorldMissionSim`/`WorldMissionEnv`), `docs/worlds.md`, Step 6 tooling (`train-world.py`, `evaluate-world.py`, `verify-world.js`, `worlds.test.js`), and a sealed `derived/rl-v3/world-ccw-line-sq-adv-align/`. `check-all` 43/43 green. Six branches cut; `enforced` + `small` not cut (raise `NotImplementedError`).

**The scope below is NOT yet settled.** The owner deferred the `enforced`/`small` semantics ("idk"); my forced defaults are shaky (full critique in `SESSION-STATE-2026-11-07.md`):
- **Recommended immediate scope: Step 7 only** — stamp the 6 functional branches (gate-sq, line-rd, gate-rd, yaw, cw) with the tooling + their own seals. Defer `enforced`/`small` to a deliberate follow-up.
- **`enforced` (QA04)** is genuinely ambiguous (which white line? hard in-lane constraint vs crossing-penalty?). A hard constraint would make it near-always-fail (a 10 in robot confined to an ~11 in lane can't pass an 8.2 in obstacle sitting in it). The crossing-penalty default in this plan bolts a penalty onto the advisory route and measures the wrong thing. Do NOT rush this.
- **`small` (QA03)** is narrower than QA03 (which is toy *interpretation*, not just size); the `obstacle: small` axis is a simplification. Real toy 6.5 × 3.25 in (placeholder is 8 × 4).

Treat the `enforced`/`small` sections below as **deferred design reference, not approved scope**. Confirm scope with the owner before implementing anything.

[Overview]

Goal: finish the ruleset-world branch strategy by (a) implementing the two deferred worlds — `enforced` lanes (QA04) and `small` obstacle (QA03) — in unpinned simulator code, and (b) stamping all eight world branches with the Step 6 training/eval/verify tooling and a per-world sealed RL artifact, so every rule combination is a buildable, `check-all`-green branch awaiting a ruling.

Context: Steps 1–6 are complete on `world-ccw-line-sq-adv-align` (primary): `ruleset.py`/`worlds.json`/`DEFAULT_WORLD`, `world_routes.py` (CW mirror), `mission_worlds.py` (`WorldMissionSim`/`WorldMissionEnv`), `docs/worlds.md`, the per-world tooling (`train-world.py`, `evaluate-world.py`, `verify-world.js`, `worlds.test.js`), and a sealed `derived/rl-v3/world-ccw-line-sq-adv-align/` (learned 17/20 vs classical 20/20). Six world branches exist; `enforced` and `small` raise `NotImplementedError`. `mission.py`, `routes.py`, `field.py`, `obstacles.py`, `supervisor.py`, `lapmodel.py`, `passage.py`, `geometry.py`, `sensors*.py`, `estimator.py` and `field-v10.json` are hashed by existing sealed verifiers and must stay byte-identical; all new behavior lands in unpinned files. The prior strategy plan is preserved in git history (commit `49af83c`).

Decisions (owner deferred the internal semantics; these are engineering defaults, documented and reversible):
- QA04 "enforced" = crossing-penalty model. The white line is painted, not a barrier; the robot may physically cross but each crossing is logged and penalized in reward. The route stays advisory so violations are measurable. (A "hard in-lane route constraint" is noted as a future option, not built now.)
- QA03 "small" = the real official toy (6.5 × 3.25 in, per QA03), replacing the 8 × 4 placeholder. `ruleset.SMALL_TOY` is updated; the primary seal is regenerated because `ruleset.py` is one of its hashed inputs.
- Scope = all eight worlds. Sibling branches are re-cut from the fully-scaffolded primary so each carries identical code and differs only by `DEFAULT_WORLD` + its own `derived/rl-v3/<world>/`.

[Types]

- `WorldSettings` — unchanged shape; `lane_rule ∈ {advisory, enforced}`, `obstacle ∈ {align, yaw, small}`, `shape` = `GUIDE_PLUSH` or `SMALL_TOY`.
- `SMALL_TOY` — `{id: "small_toy", length_in: 6.5, width_in: 3.25, source: "QA03 toy car (3.25 × 6.5 × 2 in)"}` (was the 8 × 4 placeholder).
- `MarkingBand` — per-side `(y_lo, y_hi)` white-line band derived from `field.data["clearances_in"]`: low `[walls[1]+10.53, center_divider[1]−11.071]`, high `[center_divider[3]+11.071, walls[3]−10.53]` (≈0.9 in wide; a 10 in robot centred in either lane clears it).
- `WorldLayout` — duck-types `mission.Layout` (`vehicles`, `assigned_box`, `exchange_success`, `polys`) with `polys` built from a caller-supplied `shape` instead of the pinned `GUIDE_PLUSH`.
- `info()` additions (enforced worlds only): `lane_violation_steps: [int, int, int]` and `lane_violations: int` (total entries).
- `WorldResult` seal — unchanged five-file package per world.

[Files]

New (unpinned):
- `software/stockcar/world_geometry.py` — `marking_bands(field)` and `footprint_on_marking(poly, bands)`.
- `software/stockcar/world_layouts.py` — `WorldLayout` + `world_random_layout(...)`, a shape-parameterized mirror of `mission.random_layout`.

Modified (unpinned):
- `software/stockcar/ruleset.py` — update `SMALL_TOY` to 6.5 × 3.25.
- `software/stockcar/mission_worlds.py` — remove the two `NotImplementedError`s; add enforced crossing detection/penalty/telemetry; route `small` through `world_layouts`.
- `software/stockcar/tests/test_worlds.py` — enforced + small tests; extend the pinned-file SHA guard to `field.py`/`obstacles.py`.
- `software/stockcar/tests/test_ruleset.py` — assert the small-toy dimensions.
- `docs/worlds.md` — note enforced = crossing-penalty, small = real toy.
- `implementation_plan.md` — this plan.

Re-cut branches (force-update from primary): the existing five (`gate-sq`, `line-rd`, `gate-rd`, `yaw`, `cw`) plus two new (`enf`, `small`).

Regenerated seals: `derived/rl-v3/<world>/` for all eight worlds (primary regenerated due to the `ruleset.py` change).

[Functions]

- `world_geometry.marking_bands(field) -> dict` — reads `field.data["clearances_in"]["side_lane_wall_face_to_marking_outer_edge"]` (10.53) and `["inner_lane_marking_inner_edge_to_divider_face"]` (11.071); combines with `field.walls`/`field.center_divider` to return `{"low": (y0, y1), "high": (y0, y1)}`.
- `world_geometry.footprint_on_marking(poly, bands) -> bool` — true if any vertex y lies in either band.
- `world_layouts.world_random_layout(rng, field, shape, reading="offsets", yaw_mode="aligned", p_exchange=0.7, obstacles=True)` — logic mirror of `mission.random_layout` with `GUIDE_PLUSH` → `shape`.
- `WorldMissionSim._lane_violation()` — footprint vs marking bands; on entry increments `lane_violation_steps[lap]` and `lane_violations`.
- `WorldMissionSim._mission()` (override) — when `lane_rule == "enforced"`, call `_lane_violation()`, then `super()._mission()`.
- `WorldMissionSim.step()` (override) — `super().step()`, then subtract `LANE_VIOLATION_PENALTY` (2.0) per new violation entry.
- `WorldMissionSim.info()` (override) — add `lane_violation_steps`/`lane_violations` for enforced worlds.
- `WorldMissionEnv.reset()` — when `world["shape"] is not GUIDE_PLUSH`, build the layout via `world_random_layout(..., shape=world["shape"])` wrapped in `WorldLayout`; otherwise keep `mission.random_layout` unchanged (align/yaw worlds keep byte-identical behavior + seals).

[Classes]

- `WorldLayout` (new, `world_layouts.py`) — mirrors `mission.Layout`; `polys = [footprint(shape, v["cx"], v["cy"], v["yaw"]) for v in vehicles]`.
- `WorldMissionSim` (modified) — gains `lane_violation_steps`, `lane_violations`, `prev_on_marking`, `marking_bands`; enforced overrides; small-layout routing.
- `WorldMissionEnv` (modified) — `reset()` shape branch.

[Dependencies]

None new (stdlib only). `world_geometry`/`world_layouts` import `stockcar.geometry` and `stockcar.obstacles` (already present). No third-party RL framework.

[Testing]

- `test_worlds.py` additions:
  - enforced: an in-lane route logs 0 violations; a synthetic crossing logs ≥1 and reduces reward; `info()` carries `lane_violation_steps`; the enforced world still completes 3 laps.
  - small: `WorldLayout.polys` use the 6.5 × 3.25 footprint (smaller extent than `GUIDE_PLUSH`); `world_random_layout` places obstacles; the small world completes 3 laps.
  - regression: extend the `mission.py` SHA-256 guard to also pin `field.py` and `obstacles.py`.
- `test_ruleset.py`: add a dimensions assertion for `SMALL_TOY` (6.5 × 3.25).
- Gate after each step: `node tools/check-all.js` green (verify-world + worlds.test.js + python suites); each sealed `derived/rl-v3/<world>/` re-verifies.

[Implementation Order]

1. On primary: add `world_geometry.py` + `world_layouts.py`; update `ruleset.SMALL_TOY`; extend `mission_worlds.py` (enforced + small); extend tests. Gate: focused python tests green; `mission.py`/`field.py`/`obstacles.py` byte-identical.
2. Regenerate the primary seal (`evaluate-world.py --world world-ccw-line-sq-adv-align`) since `ruleset.py` changed. Gate: `verify-world.js` + `check-all` green. Commit + push primary.
3. Stamp the seven siblings: for each world W, `git checkout -B W primary`, set `DEFAULT_WORLD=W`, `git rm -r` the primary seal, `train-world.py --world W` + `evaluate-world.py --world W`, `check-all`, commit, `push -f`. Gate: each branch's `check-all` green.
4. Optional (Step 8): strengthen the policy (nonlinear MLP / larger CEM) per compute budget; re-seal affected worlds.
5. Promotion (Step 9): on a ruling, confirm the matching branch's `DEFAULT_WORLD`, re-run `check-all`, fast-forward `main` — ask the owner first.

Owner decisions baked in: all eight worlds; enforced = crossing-penalty; small = real 6.5 × 3.25 toy; siblings re-cut from primary.