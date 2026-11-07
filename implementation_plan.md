# Implementation Plan

[Overview]

Implement and publish the two remaining ruleset worlds—`world-ccw-line-sq-enf-align` and `world-ccw-line-sq-adv-small`—with explicit hypothetical semantics, focused regression coverage, independently trained/evaluated five-file RL-v3 seals, and passing full gates on both final branch tips.

The published baseline is eight synchronized branches: six functional sealed worlds and two structural placeholders. The placeholders start at `b6611e7adaa8c6ac50d9b60fcbe401f58508c981` (`enf-align`) and `556a5cd1598d06973ed5b2f5bd18bced7e366693` (`adv-small`). This work changes only those two branches. The other six world branches and `main` (`f56fb53c6d8dba72d5f00b8d8dbae5eff4b7f42c`) remain untouched; promotion is a separate owner decision.

Two planning defaults must be confirmed when this plan is approved:
- **QA04 `enforced`:** model only the two horizontal straightaway marking strips. Build lane-aware routes that prefer a legal common lane and then minimize lane changes, but preserve execution when no legal route exists by falling back to the baseline route and reporting that fallback. Measure footprint/strip contact, subtract `2.0` training-reward units per new contact entry, and keep `score_like` unchanged. End-turn marking segments and pit routes are excluded. This is not a hard-stop rule or an organizer ruling.
- **QA03 `small`:** retain the existing hypothetical `8.0 × 4.0 in` aligned rectangular toy, explicitly labeled unverified. Do not substitute the unsourced `6.5 × 3.25 in` alternative or call either footprint an official measurement. `ruleset.SMALL_TOY` remains the single value to replace after a sourced ruling, followed by retraining/resealing.

All behavior lands in unpinned world modules. No existing seal is regenerated, no training budget or seed partition changes, no policy architecture changes, and no new sensed-vehicle/avoidance-planner fidelity is claimed. Both seals use the existing 38-weight CEM policy, ten generations, training seeds 0–3, and evaluation seeds 100–119. Poor performance or frequent lane violations is evidence, not a reason to weaken assertions.

[Types]

- Keep `ruleset.get(name)`'s existing dictionary schema and world names unchanged. `lane_rule == "enforced"` selects straightaway marking semantics; `obstacle == "small"` selects `SMALL_TOY`. Observations remain 18 floats, actions remain `(v_cmd, w_cmd)` in `[-1, 1]`, and learned weights remain 38 numbers.
- `straight_marking_bands(field)` returns `{"low": quad, "high": quad}`. Each quad contains four `(x, y)` vertices from the corresponding outer/inner ring edges in `field.data["features"]["track_marking"]`. Only ring edges 1 (low straight) and 5 (high straight) are included; the six rounded/end segments are excluded.
- `lane_bands(field)` returns physical y intervals `{"low": {"outer": (y0, y1), "inner": (y0, y1)}, "high": ...}` using wall/divider faces and exact straight marking edges. These are geometry inputs, not center positions.
- The enforced planner returns `{"lanes": [(x0, x1, y), ...], "mode": str, "blocked": int, "planned_lane_changes": int, "infeasible_vehicles": int, "fallback": bool}`. `lanes` remains compatible with `mission.straight`; `blocked` retains the base simulator's planned-contact meaning.
- Enforced telemetry adds `lane_violations` (new-contact entries), `lane_violation_steps` (three per-lap counters), and serializable per-side planning diagnostics. Reward penalty and competition-like score remain separate.
- Enforced evaluation cells add nonnegative `total_lane_violations`, `total_lane_violation_steps`, and `runs_with_lane_plan_fallback`. No existing report field is removed or reinterpreted. Each world keeps the five-file seal schema: `trained-weights.json`, `training.json`, `report.json`, `summary.md`, and `manifest.json`.

[Files]

New files on both placeholder branches through one common implementation commit:
- `/workspace/roboticThingAvoidance/software/stockcar/world_geometry.py`: exact straight-marking extraction, physical lane bands, convex footprint/strip contact, and lane-center interval helpers.
- `/workspace/roboticThingAvoidance/software/stockcar/world_layouts.py`: shape-parameterized `WorldLayout` and RNG-compatible random layout generation without editing pinned `mission.py`.
- `/workspace/roboticThingAvoidance/software/stockcar/tests/test_world_geometry.py`: marking geometry, lane interval, and enforced planner unit tests.
- `/workspace/roboticThingAvoidance/software/stockcar/tests/test_world_layouts.py`: baseline RNG equivalence, small-shape placement, footprint, and determinism tests.

Modified files in the common commit:
- `/workspace/roboticThingAvoidance/software/stockcar/mission_worlds.py`: enable both default constructors; add enforced route replacement, contact telemetry/reward, and small-layout selection while retaining existing behavior for other worlds.
- `/workspace/roboticThingAvoidance/software/stockcar/world_routes.py`: add deterministic enforced-lane planning using existing `passage` and `mission` helpers.
- `/workspace/roboticThingAvoidance/software/stockcar/ruleset.py`: retain `SMALL_TOY` at 8 × 4 in and make its hypothetical source wording explicit; add no new world dimension.
- `/workspace/roboticThingAvoidance/software/stockcar/worlds.json`: describe the exact enforced penalty scope and hypothetical 8 × 4 small toy while keeping dimensions and dependency mappings synchronized.
- `/workspace/roboticThingAvoidance/software/stockcar/tests/test_worlds.py`: add constructor, mission, telemetry, penalty, small-world, seed-partition, and pinned-source regression tests.
- `/workspace/roboticThingAvoidance/software/stockcar/tests/test_ruleset.py`: assert the 8 × 4 placeholder and mirrored semantics without weakening existing checks.
- `/workspace/roboticThingAvoidance/tools/evaluate-world.py`: hash both new modules, aggregate enforced lane diagnostics, and state selected semantics in generated summaries.
- `/workspace/roboticThingAvoidance/tools/verify-world.js`: require valid nonnegative enforced-lane aggregates in addition to all existing hash/schema checks.
- `/workspace/roboticThingAvoidance/implementation_plan.md`: carry this approved plan into the common commit.

Branch-final documentation and generated artifacts:
- `/workspace/roboticThingAvoidance/docs/worlds.md`: replace each branch's own placeholder status only after its seal exists; document straightaway-only penalties, fallback reporting, and the hypothetical 8 × 4 footprint. For the other deferred world, say its implementation and seal live on its named branch—never imply a second local seal.
- `/workspace/roboticThingAvoidance/SESSION-STATE-2026-11-07.md`: record implementation state, measured training/evaluation/lane outcomes, validation commands, and remaining assumptions without self-stale final-tip tables.
- `/workspace/roboticThingAvoidance/derived/rl-v3/world-ccw-line-sq-enf-align/`: generated only by the existing trainer/evaluator on the enforced branch.
- `/workspace/roboticThingAvoidance/derived/rl-v3/world-ccw-line-sq-adv-small/`: generated only by the existing trainer/evaluator on the small branch.

`tools/train-world.py`, `tests/worlds.test.js`, dependency manifests (`package.json`/`pyproject.toml`), and the six existing world branches require no edits. Do not modify any pinned input: `software/stockcar/{mission.py,routes.py,field.py,obstacles.py,supervisor.py,lapmodel.py,passage.py,geometry.py,sensors.py,sensors_camera.py,estimator.py}` or `derived/organizer-cad-v10/field-v10.json`. No other pinned package is regenerated.

[Functions]

New pure geometry functions in `software/stockcar/world_geometry.py`:
- `straight_marking_bands(field) -> dict`: read outer/inner ring vertices and return low/high horizontal quads; validate the expected eight-vertex rings and straight-edge orientation instead of silently accepting malformed field data.
- `lane_bands(field) -> dict`: derive outer/inner physical y intervals from `field.walls`, `field.center_divider`, and the exact low/high marking quads.
- `marking_contacts(poly, bands) -> list[str]`: use pinned `geometry.separation` on convex polygons and count touching/overlap with a documented epsilon, not a vertex-only test. Return deterministic band names.
- `lane_center_intervals(field, side, lane, robot_width=10.0, margin=0.25) -> tuple`: clip a robot-center interval to the selected physical lane using the same width/margin convention as `passage.free_center_intervals`; return an empty interval when the lane cannot contain that footprint.

New planning function in `software/stockcar/world_routes.py`:
- `enforced_lane_plan(field, layout, side, default_y) -> dict`: order obstacles in travel direction and evaluate `free_center_intervals` within each physical outer/inner lane. Prefer one common legal lane across every obstacle. Otherwise enumerate feasible lane assignments (at most two vehicles per straight) and choose the fewest entry/inter-vehicle lane changes, then least deviation from `default_y`, with lexical tie-breaking. Build spans exactly as `mission.lane_plan` does. If any obstacle has no legal interval or no assignment is feasible, return the baseline `mission.lane_plan` route with `fallback=True` and explicit infeasible counts so the run remains measurable rather than falsely legal.

New layout function in `software/stockcar/world_layouts.py`:
- `world_random_layout(rng, field, shape, reading="offsets", yaw_mode="aligned", p_exchange=0.7, obstacles=True) -> WorldLayout`: mirror `mission.random_layout` control flow and RNG-call order, replacing only `GUIDE_PLUSH` with `shape` in `center_range` and footprint construction. With `GUIDE_PLUSH`, its vehicles, box, exchange result, polygons, and RNG state must match the pinned baseline exactly.

Modified functions:
- `WorldMissionSim.__init__` in `mission_worlds.py`: remove the two default-path `NotImplementedError` guards, initialize enforced marking/counter state, and retain all other constructor settings.
- `WorldMissionSim.build_routes(layout)`: call the base builder, then for enforced worlds replace only `routes["LAP"]` using `enforced_lane_plan` plus existing `mission.arc`/`mission.straight`; recompute lap length, planned contacts, and diagnostics. Preserve the existing CW mirror and all pit routes. Advisory/yaw behavior remains unchanged.
- `WorldMissionSim.reset(layout, sensor_seed=0)`: reset lane contact state and diagnostics after base reset without changing seed handling.
- `WorldMissionSim._update_lane_contacts() -> float`: inspect the true robot footprint after motion, increment per-step counters on any straight-strip contact, count only false→true entries as new violations, and return `2.0` for a new entry or `0.0` otherwise.
- `WorldMissionSim._mission()`: invoke `_update_lane_contacts` for enforced worlds before the existing lap-line/supervisor logic.
- `WorldMissionSim.step(action=None)`: subtract the pending lane penalty from the base reward after `super().step`, clear it, and return telemetry containing the just-updated counters. Never alter `score_like`.
- `WorldMissionSim.info()`: expose enforced telemetry/planning diagnostics and preserve all existing fields.
- `WorldMissionEnv.reset(seed)`: keep `mission.random_layout` for `GUIDE_PLUSH` worlds; call `world_random_layout` only when the world's shape differs. Keep the existing train/evaluation seed guards.
- `tools/evaluate-world.py:world_inputs(world)`: add `world_geometry.py` and `world_layouts.py` while keeping `world_routes.py` mandatory. `cell(...)` aggregates enforced lane fields and summary generation explains reward-only penalties/fallbacks or the 8 × 4 hypothetical shape as appropriate.
- `tools/verify-world.js`: for the enforced world, require finite integer lane aggregates within total-run/step bounds and a nonnegative fallback-run count; retain all existing hash, seed, weight, and result checks.

[Classes]

- Add `WorldLayout(mission.Layout)` in `world_layouts.py` with `__init__(self, vehicles, assigned_box, exchange_success, shape)`. Call the base constructor for common attributes, store `shape`, and replace `polys` with `obstacles.footprint(shape, ...)` for every vehicle. This preserves the interface consumed by `MissionSim` without changing `mission.Layout`.
- Modify `WorldMissionSim(mission.MissionSim)` as specified above. Do not add a second simulator or fork base physics/contact logic.
- Modify `WorldMissionEnv` only for shape-aware layout creation. No class is removed and no migration is required.

[Dependencies]

No new packages or version changes. Python remains standard-library-only under CPython 3.12 through `uv`; JavaScript remains Node built-ins. Reuse existing `stockcar.geometry`, `obstacles`, `passage`, `mission`, and `random` functionality. Do not alter `package.json`, `package-lock.json`, or `pyproject.toml`. The two new Python modules become explicit RL-v3 manifest inputs so later semantic edits invalidate both new seals as intended.

[Testing]

Focused tests before training, from the repository root:
- `uv run --no-project --python 3.12 python -B -I -m unittest discover -s software/stockcar/tests -t software -p 'test_world*.py' -v`
- Require all existing world/ruleset tests plus the new tests to pass with no skips. Do not run `tests/worlds.test.js` before a seal exists and call it a pass; its missing-manifest failure is expected only during intermediate construction.

Geometry/planner requirements:
- Validate exact low/high straight quads and physical lane intervals against the pinned CAD values, including 10.53 in and 11.071 in clearances where applicable.
- Show the plain low/high centers overlap the marking, shifted legal inner centers do not, a polygon edge crossing is detected even with no vertex inside, touching is counted, and rounded/end marking segments do not create straightaway penalties.
- Test empty/common-lane/minimum-change planning, deterministic ties, high-side reverse travel order, and impossible-obstacle fallback with explicit diagnostics. Never assert that a fallback route is legal.

Layout requirements:
- For several fixed seeds, compare `world_random_layout(..., GUIDE_PLUSH)` with `mission.random_layout` for vehicles, assigned box, exchange result, polygons, and subsequent RNG state.
- Assert the small world creates three deterministic 8 × 4 aligned rectangles wholly inside allowed quadrant/center ranges, uses shape polygons in `layout.polys`, and is strictly smaller than `GUIDE_PLUSH` in both dimensions. Check an empty-obstacle layout and invalid side/lane errors.

Simulation requirements:
- Construct both formerly deferred worlds successfully and run seed 0 to three laps. Verify the primary seed-0 regression and existing gate/round/CW tests still pass on each modified branch.
- For enforced synthetic poses, prove a legal pose returns zero penalty, first contact returns 2.0, persistent contact increments steps without another entry penalty, and `info()` exposes counters/fallback diagnostics without changing `score_like`. Verify small layout selection only occurs for the small shape and training/evaluation seed rejection remains unchanged.
- Extend pinned-source guards beyond the existing `mission.py` SHA-256 check to cover at least `field.py`, `obstacles.py`, and `routes.py`; separately require `git diff --exit-code 6cf5a2228762f7a9ca652da674af877e57c21df0 -- <all pinned inputs>` on both final branches.

Training and sealing, once per world with the existing defaults and no skip/tuning flags:
- `uv run --no-project --python 3.12 python -B -I tools/train-world.py --world WORLD`
- `uv run --no-project --python 3.12 python -B -I tools/evaluate-world.py --world WORLD`
- `node tools/verify-world.js WORLD`
- Require ten recorded CEM generations, 38 weights, three policies × 20 held-out runs, valid input/output hashes, and exactly five own-world files. Record learned/classical/random completion, score-like, contact metrics, best fitness, and—only for enforced—lane penalties/fallbacks. Do not require learned superiority or hide zero-completion results.

Final gate on each committed final tip, sequentially, with logs outside the repository:
- `node tools/check-all.js --json /tmp/robotic-world-semantics/WORLD.json --log-dir /tmp/robotic-world-semantics/WORLD-logs`
- Require exit 0, `RESULT: PASS`, no skipped stages/verifiers, and unchanged tree. Record actual pass count and duration. Run `node tools/verify-world.js WORLD` again after the gate and confirm `DEFAULT_WORLD`, one own five-file seal, no other seal, clean status, and unchanged pinned files.
- Run `secrets-guard --staged` before every commit and scan every newly introduced/changed text artifact before each push. The historical `share/Showcase-v10.html` PNG-base64 false positive is documented in `/tmp/robotic-world-closeout/secrets-scope-note.md`; do not print or copy the matched substring, edit the pinned showcase, or treat scoped scanning as a new secret waiver.

[Implementation Order]

1. **Start-state preflight.** On primary, require `implementation_plan.md` to be the only dirty path and no other agent process to be operating on the tree. Confirm local/remote placeholder tips still equal `b6611e7adaa8c6ac50d9b60fcbe401f58508c981` and `556a5cd1598d06973ed5b2f5bd18bced7e366693`, both have empty RL-v3 trees and correct defaults, all six existing world tips match origin, and local/remote `main` is still `f56fb53`. Record the exact starting state under `/tmp/robotic-world-semantics/`; create no repository output there.

2. **Build the common semantics commit `B` on enforced.** Switch to `world-ccw-line-sq-enf-align`, carrying only this plan edit. Add `world_geometry.py`, `world_layouts.py`, their tests, the planner and simulator changes, manifest/verifier support, and ruleset/world-description updates specified above. Run focused tests, verify both constructors and seed-0 missions, and require all pinned inputs to remain byte-identical. Inspect the complete diff for accidental changes to advisory/yaw behavior. Stage the exact common paths, inspect `git diff --cached --check`, run `secrets-guard --staged`, and commit `worlds: implement deferred lane and small-obstacle semantics`. Do not train, create a seal, or run/present the full gate as green yet.

3. **Propagate only `B` to small.** Switch to `world-ccw-line-sq-adv-small` and cherry-pick the recorded `B` hash. Resolve no conflict by weakening a test or changing a pinned file; stop on any conflict. Confirm the small default remains `world-ccw-line-sq-adv-small`, RL-v3 is still empty, the common code is patch-equivalent to enforced, and focused tests also pass here. The branches should now differ only in `DEFAULT_WORLD` and commit ancestry, not in semantic implementation.

4. **Train, seal, document, and gate enforced.** Return to the enforced branch. Run the existing trainer and evaluator with defaults; inspect all 60 evaluation episodes and lane diagnostics. Update `docs/worlds.md` and `SESSION-STATE-2026-11-07.md` with the actual measured outcomes and explicit hypothetical semantics. Require exactly five generated files under `derived/rl-v3/world-ccw-line-sq-enf-align/`, run `node tools/verify-world.js world-ccw-line-sq-enf-align`, stage only the seal and final documentation, scan staged content, and commit `world(world-ccw-line-sq-enf-align): seal straightaway-lane semantics`. Run the full unskipped gate on that committed tip. Any code, tool, test, generated artifact, or documentation correction requires a new commit and another final-tip gate.

5. **Train, seal, document, and gate small.** Switch to small. Run the same default trainer/evaluator, inspect all results, and update the same two documents with measured small-world results and a reference to the independently validated enforced branch without copying unverified results or inventing head hashes. Require exactly five own-world files and no enforced seal. Verify, scan, commit `world(world-ccw-line-sq-adv-small): seal hypothetical small-toy semantics`, then run the full unskipped gate on the committed tip. A crash, missing seal, stale hash, skipped check, or unexpected diff stops publication; merely disappointing measured performance does not get tuned away.

6. **Cross-branch audit before publication.** Require both final tips to be descendants of their current origin placeholder tips, so both pushes are ordinary fast-forwards. Check clean trees, correct defaults, five own seal files and zero other seal files, valid manifests, identical common implementation content, unchanged pinned inputs, unchanged six sibling world refs, and unchanged `main`. Re-run live `git ls-remote --heads origin`; stop if either placeholder moved from its recorded start hash or `main` changed. Run the scoped secrets scan on every changed/new file on each branch.

7. **Publish only the two branches.** Push enforced ordinarily as `git push origin world-ccw-line-sq-enf-align:refs/heads/world-ccw-line-sq-enf-align`, then small the same way. No force push is needed or permitted. Re-read remote refs after each push; if the first succeeds and the second fails, report the exact partial state and do not retry with force.

8. **Final verification and handoff.** Return to primary and require a clean tree. Verify local/remote equality for both new tips, exactly eight world branches with the original six heads unchanged, six original seals untouched plus the two new seals, correct placeholder-to-functional documentation, and `main=f56fb53`. Report both final heads, actual gate counts/durations, measured CEM and classical/random/learned outcomes, enforced lane violations/fallbacks, the explicit QA04/QA03 assumptions, and `/tmp/robotic-world-semantics/` logs. Do not promote either world to `main` without a new owner-approved action.

Failure policy: stop on conflicts, unexpected source diffs, focused/full test failures, training/evaluation errors, stale seals, remote movement, or push rejection. Never create fake seals, skip `verify-world`, weaken assertions, silently change the chosen semantics, regenerate an existing world's seal, or broaden publication to another branch.