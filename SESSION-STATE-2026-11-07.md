# Session State — 2026-11-07 · roboticThingAvoidance (worlds)

## Goal
Implement, seal, and publish the two formerly deferred ruleset worlds — QA04 `enforced` lanes and QA03 `small` obstacles — as functional branch-local worlds while keeping all pinned inputs and the six existing seals unchanged.

## Confirmed scope
- The owner approved the planning defaults: QA04 `enforced` means lane-aware physical outer/inner routing with straightaway-only white-line marking penalties in training reward (`2.0` per new contact entry) and explicit fallback diagnostics; it is not a hard-stop rule. QA03 `small` retains the hypothetical `8 × 4 in` toy in `ruleset.SMALL_TOY`, explicitly unverified.
- Both formerly deferred constructors are now implemented in unpinned modules (`world_geometry.py`, `world_layouts.py`, `mission_worlds.py`, `world_routes.py`) with focused tests. Each branch still carries only its own five-file `derived/rl-v3/<world>/` seal.
- The six pre-existing functional seals are complete and were not retrained or regenerated. Training budgets remain intentionally non-uniform.
- Final branch-tip hashes are deliberately omitted here: committing a tip table makes the handoff stale immediately. Query Git for current tips; immutable seal commits are recorded below.

## Existing scaffold and measured seals
The shared scaffold remains on primary: `ruleset.py`/`worlds.json`, `world_routes.py`, `mission_worlds.py`, `docs/worlds.md`, `tools/train-world.py`, `tools/evaluate-world.py`, `tools/verify-world.js`, and world tests. The new semantics landed through one shared implementation commit, then each world was independently trained, evaluated, sealed, and gated on its own branch.

| world / functional branch | immutable seal commit | CEM generations | best fitness | learned eval | classical eval |
|---|---|---:|---:|---|---|
| `world-ccw-line-sq-adv-align` | `f691e18` | 10 | 74.715 | 17/20, score-like 219.5 | 20/20, score-like 267.75 |
| `world-ccw-gate-sq-adv-align` | `3e2d969` | 10 | 74.715 | 17/20, score-like 219.5 | 20/20, score-like 267.75 |
| `world-ccw-line-rd-adv-align` | `19fa738` | 3 | 28.980 | 0/20, score-like 30 | 20/20, score-like 283.5 |
| `world-ccw-gate-rd-adv-align` | `58c3a70` | 3 | 28.980 | 0/20, score-like 30 | 20/20, score-like 283.5 |
| `world-ccw-line-sq-adv-yaw` | `44ad8bd` | 10 | 99.833 | 20/20, score-like 244.75 | 20/20, score-like 282.25 |
| `world-cw-line-sq-adv-align` | `2d4e0d4` | 10 | 54.918 | 0/20, score-like 60.25 | 20/20, score-like 249.75 |

Random was 0/20, score-like 10 on every world. The round-body CEM curves are flat at the zero-weight baseline 28.980; that is recorded as measured, not as learned improvement. Every seal contains exactly five own-world files and all manifest hashes validate.

## Newly implemented world measurements
`world-ccw-line-sq-enf-align` on this branch: 10 CEM generations, best fitness 12.863, learned 0/20 with score-like 27.5, classical 20/20 with score-like 265.5, random 0/20 with score-like 10. Enforced-lane aggregates over the 20 evaluation runs were 162 new marking entries and 14,658 marking-contact steps for classical, 12 and 2,123 for learned, and 58 and 7,646 for random; every policy had 20/20 runs with at least one straightaway fallback to the baseline route. These are training-reward penalties and diagnostics only: `score_like` is unchanged. The `small` world is trained and measured independently on `world-ccw-line-sq-adv-small`.

## Branch model
- Six pre-existing functional branches: `world-ccw-line-sq-adv-align`, `world-ccw-gate-sq-adv-align`, `world-ccw-line-rd-adv-align`, `world-ccw-gate-rd-adv-align`, `world-ccw-line-sq-adv-yaw`, `world-cw-line-sq-adv-align`.
- Two newly functional branches: `world-ccw-line-sq-enf-align` (this branch) and `world-ccw-line-sq-adv-small`.
- Each branch has only its own `DEFAULT_WORLD`; no branch carries another world's seal.

## KEY CONSTRAINT (do not violate)
Pinned — hashed by existing sealed verifiers; MUST stay byte-identical: `software/stockcar/{mission.py, routes.py, field.py, obstacles.py, supervisor.py, lapmodel.py, passage.py, geometry.py, sensors.py, sensors_camera.py, estimator.py}` + `derived/organizer-cad-v10/field-v10.json`. ALL new world behavior must land in UNPINNED files (`mission_worlds.py`, `world_routes.py`, `world_geometry.py`, `world_layouts.py`). `tests/test_worlds.py` pins `mission.py` SHA-256 `346fb5c977fddaaad7d790afcb466beacb3f2beeebe01803befb9da004032678`.

Relevant facts: `random_layout` (pinned) hardcodes `GUIDE_PLUSH` and has no shape arg → `small` uses `world_layouts.world_random_layout`. `lane_plan`/`classical_action` are advisory (whole corridor) → `enforced` uses `world_routes.enforced_lane_plan`. White-line marking lives in `field-v10.json` `features.track_marking`, readable via `Field.data` WITHOUT editing `field.py`; the straight band is 0.899 in wide.

## Relevant implementation facts
- Pinned `mission.random_layout` hardcodes `GUIDE_PLUSH` and has no shape argument, so `small` uses `world_layouts.world_random_layout`, which preserves the pinned RNG-call order for `GUIDE_PLUSH` and substitutes `ruleset.SMALL_TOY` only for the small world.
- Pinned `lane_plan`/`classical_action` are advisory over the whole corridor, so `enforced` uses `world_routes.enforced_lane_plan` plus straightaway-only marking telemetry in `mission_worlds.py`. White-line data is read from `field-v10.json` through `Field.data`; the exact band is 0.899 in wide.

## Tooling usage (per world W)
- `uv run --no-project --python 3.12 python -B -I tools/train-world.py --world W` → `derived/rl-v3/W/{trained-weights,training}.json`
- `... tools/evaluate-world.py --world W` → `derived/rl-v3/W/{report,summary,manifest}.json` (seal; classical/random/learned on eval seeds 100–119)
- `node tools/verify-world.js` (reads `DEFAULT_WORLD`); `node tools/check-all.js` runs the full gate.

## Hypothetical semantics (not organizer rulings)
- **QA04 `enforced`:** implemented as lane-aware physical outer/inner routing with straightaway-only marking-contact penalties in training reward. Turns, pit routes, and end segments are excluded. If no legal physical-lane assignment exists, the baseline route is used and the fallback is reported. This is a measured enforcement model, not a hard-stop rule.
- **QA03 `small`:** implemented with `ruleset.SMALL_TOY`'s hypothetical `8 × 4 in` aligned rectangular footprint. The footprint is explicitly unverified and is not an official measurement; the `ruleset.SMALL_TOY` value is the single place to replace after a sourced ruling, followed by retraining/resealing.
- Any future ruling that changes these assumptions belongs in `world_geometry.py`, `world_layouts.py`, `ruleset.py`, and `mission_worlds.py`, with new tests and a fresh seal.

## Validation and publication
- Each branch is trained, evaluated, verified, and full-gated on its own final tip. The common semantics commit is shared; seal commits and documentation are branch-local.
- Full `check-all` must pass on both new final tips before publication. Actual counts and durations belong in the execution handoff and `/tmp/robotic-world-semantics/`, not in stale tip tables here.
- Publish only the two newly functional branch refs. Do not update `main` (`f56fb53`) without separate owner approval.

## Re-orient after compaction
Run `git log --oneline --decorate`, `git branch -avv`, `git ls-remote --heads origin 'refs/heads/world-*'`, and read `implementation_plan.md`, `docs/worlds.md`, and this file. The pinned-file constraint is the first trap: never edit `mission.py`, `routes.py`, `field.py`, `obstacles.py`, or the other pinned inputs. Confirm each branch still carries only its own seal before changing simulator code.