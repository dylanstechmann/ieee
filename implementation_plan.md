# Implementation Plan

## Planning baseline (2026-11-07 — pre-execution, not the final publication report)

The primary branch `world-ccw-line-sq-adv-align` is at `bcb162c`, synchronized with origin. Its RL-v3 seal was committed at `f691e18`, where `check-all` passed 43/43; `bcb162c` subsequently changed only `implementation_plan.md` and `SESSION-STATE-2026-11-07.md`. The working checkout is `world-ccw-line-rd-adv-align` at `19fa738`; the only pre-existing uncommitted path is this plan document.

All six functional worlds have local seals. The current checkout and four siblings must replace diverged origin heads; primary is a fast-forward. Live `git ls-remote` confirmed these values:

| branch | local sealed commit before close-out docs | current origin head | publication mechanism |
|---|---|---|---|
| `world-ccw-line-sq-adv-align` | `bcb162c` (seal at `f691e18`) | `bcb162c` | ordinary fast-forward push |
| `world-ccw-gate-sq-adv-align` | `3e2d969` | `108fb7c` | explicit `--force-with-lease` |
| `world-ccw-line-rd-adv-align` | `19fa738` | `ab361ee` | explicit `--force-with-lease` |
| `world-ccw-gate-rd-adv-align` | `58c3a70` | `70ef6e2` | explicit `--force-with-lease` |
| `world-ccw-line-sq-adv-yaw` | `44ad8bd` | `d639daf` | explicit `--force-with-lease` |
| `world-cw-line-sq-adv-align` | `2d4e0d4` | `02f0479` | explicit `--force-with-lease` |

Each sibling is three commits ahead and one behind its origin branch because it was re-cut from primary. No unconditional `git push -f` is permitted. The expected origin hash must be re-read immediately before publication and embedded in the lease so an unrelated remote update stops the push.

Read-only Git-object audits established that every functional branch has exactly the five expected files under `derived/rl-v3/<its-own-world>/`, no other world's seal, the correct `DEFAULT_WORLD`, and valid manifest input/output hashes. The pinned simulator inputs are byte-identical across all six. `/tmp/stamp4.log` ended `ALL_DONE 03:30:36`, with commit and `verify-world.js` success for yaw, cw, gate-rd, and line-rd; gate-sq was stamped earlier and was independently checked in the Git-object audit. Full `check-all` has not run on the five newly stamped siblings.

Training remains intentionally non-uniform and is not rerun: primary, gate-sq, yaw, and cw used 10 CEM generations; line-rd and gate-rd used 3 after remaining flat at fitness `28.980`. The measured learned outcomes are retained without claiming superiority over the classical baseline.

The two missing branches are `world-ccw-line-sq-enf-align` and `world-ccw-line-sq-adv-small`. **The owner's confirmed Option B is structural branch coverage: publish all eight, while deferring QA04 `enforced` and QA03 `small` simulation semantics.** Their existing `NotImplementedError` behavior is intentional and must not be removed in this close-out.

Pinned inputs must remain byte-identical: `software/stockcar/{mission.py, routes.py, field.py, obstacles.py, supervisor.py, lapmodel.py, passage.py, geometry.py, sensors.py, sensors_camera.py, estimator.py}` and `derived/organizer-cad-v10/field-v10.json`. `main` remains at `f56fb53`; promotion is outside this task and requires separate owner approval.

[Overview]

Complete and publish the eight-world ruleset branch strategy as six validated, sealed functional branches plus two explicitly deferred structural placeholder branches, without changing simulator behavior or `main`.

The close-out includes three mandatory documentation updates, final-tip validation, branch creation, and publication. It does **not** implement `enforced` or `small`, change training budgets, retrain policies, regenerate seals, weaken tests, or alter tool behavior. The six existing RL-v3 packages remain the exact artifacts audited during planning. Validation commands execute existing simulations; no simulator source is edited.

First create one documentation close-out commit `D` on primary containing this plan, `SESSION-STATE-2026-11-07.md`, and `docs/worlds.md`. Cherry-pick `D` onto each of the five functional siblings so no branch retains stale claims that its seal or tooling is absent. Cut both placeholders from `D`, so they inherit the same documentation, then change only `DEFAULT_WORLD` and remove the inherited primary seal. This produces a consistent final tree on every branch before validation begins.

Run full, unskipped `check-all` sequentially on primary and all five functional siblings **after** their final documentation commits. Do not publish any close-out commit until all six final functional tips pass. Placeholders receive structural/expected-failure checks instead of a green-gate claim: missing seals and `NotImplementedError` are intentional, so their full `check-all` remains red at `tests/worlds.test.js` and `tools/verify-world.js`.

Publish primary by fast-forward, siblings with explicit hash-valued `--force-with-lease`, and previously absent placeholders by ordinary non-force push. Verify all eight local and remote tips and the unchanged `main` head. The repository README budgets about five minutes per full gate, so allow roughly 35–50 minutes including six sequential gates, documentation, branch operations, and publication; do not run gates concurrently in one working tree.

[Types]

No Python, JSON-schema, or JavaScript type changes. `software/stockcar/ruleset.py` and `worlds.json` already define all eight names and dimensions and remain unchanged.

The branch-state contract is:

| state | `DEFAULT_WORLD` | `derived/rl-v3/<world>/` | simulation | release gate |
|---|---|---|---|---|
| functional (6 branches) | branch's own world | five sealed files, hashes valid | existing implementation | full `check-all` must pass |
| structural placeholder (`enf-align`, `adv-small`) | branch's own world | absent, including no inherited primary seal | existing `NotImplementedError` retained | expected red; not promotion-eligible |

[Files]

Documentation modified once on primary in close-out commit `D`, then cherry-picked to the five siblings and inherited by both placeholders:

- `/workspace/roboticThingAvoidance/implementation_plan.md` — this corrected executable plan; its hash table is explicitly a pre-execution baseline, not a permanently current branch-tip table.
- `/workspace/roboticThingAvoidance/SESSION-STATE-2026-11-07.md` — replace stale pre-stamp heads and the old Option A/B question with the confirmed structural Option B; record all six immutable seal commits, measured generation counts/results, the 6-functional + 2-placeholder model, validation/publication requirements, and deferred QA04/QA03 work. Avoid self-referential final-tip hashes that would become stale as soon as the handoff is committed.
- `/workspace/roboticThingAvoidance/docs/worlds.md` — label the six functional worlds and two structural placeholders, explain that placeholders have no seal and intentionally fail world verification, and restrict promotion to a functional green branch with owner approval. Keep organizer assumptions distinct from rulings and retain the AI-assisted hobby/learning framing.

Placeholder-only changes, relative to `D`:

- `software/stockcar/DEFAULT_WORLD` — respectively `world-ccw-line-sq-enf-align\n` and `world-ccw-line-sq-adv-small\n`.
- `derived/rl-v3/world-ccw-line-sq-adv-align/` — remove all five inherited primary seal files with `git rm -r`; do not create a replacement seal directory.

No new source, test, schema, configuration, showcase, or dependency files. No changes to `ruleset.py`, `worlds.json`, `mission_worlds.py`, `world_routes.py`, training/evaluation tools, existing functional seals, or any pinned file. Gate logs and JSON summaries go under `/tmp/robotic-world-closeout/`, never into the repository. Future semantic work in `world_geometry.py`, `world_layouts.py`, `ruleset.py`, and `mission_worlds.py` is out of scope and requires a new approved plan.

[Functions]

None added, modified, or removed. In particular, do not change `ruleset.get`, `ruleset.default_name`, `WorldMissionEnv.reset`, `run_world`, `world_inputs`, `main` in either world tool, or `main` in `check-all.js`. The existing command interfaces and 38-weight policy format remain authoritative.

[Classes]

None added, modified, or removed. `WorldMissionSim.__init__` in `software/stockcar/mission_worlds.py` retains its explicit `NotImplementedError` branches for `lane_rule == "enforced"` and `obstacle == "small"`; `WorldMissionEnv` continues to construct that simulator without a placeholder fallback.

[Dependencies]

No package, version, lockfile, Compose, or credential changes. Use the existing Git, Node.js 24, uv 0.13, and CPython 3.12 workflow; `check-all.js` invokes the Python suites through `uv run --no-project --python 3.12 python -B -I`. Run managed build/test work in the existing `ieee` project dev environment, whose `/workspace` is this repository, using the workspace controller/reservation if not already active; never start nested Docker. Reuse the repository's existing GitHub authentication without copying credentials into files or logs.

[Testing]

1. **Documentation and commit hygiene:** run `git diff --check` and the repository's secrets-guard scan (`.claude/skills/secrets-guard/scripts/scan_secrets.py --staged`) before every commit; run the worktree scan before publication. Confirm the staged set contains only the three intended documents, or only a placeholder's `DEFAULT_WORLD` plus five primary-seal deletions.
2. **Functional final-tip gate:** on primary and each of the five siblings, start with a clean tree and run `node tools/check-all.js --json /tmp/robotic-world-closeout/<world>.json --log-dir /tmp/robotic-world-closeout/<world>-logs`, capturing console output to `/tmp/robotic-world-closeout/<world>.log`. Require exit 0 and `RESULT: PASS`; record the actual pass count rather than assuming 43. Do not use `--skip`, `--no-node`, `--no-verifiers`, or `--no-python`; `--full` is not required for this docs/branch close-out.
3. **Coverage supplied by that gate:** `tests/worlds.test.js` invokes `tools/verify-world.js` for the branch's `DEFAULT_WORLD`; the verifier stage checks it again alongside every other artifact verifier; Python discovery includes `software/stockcar/tests/test_ruleset.py` and `test_worlds.py`; the final tree-state step proves the run changed no files. `test_worlds.py` also guards `mission.py` SHA-256 `346fb5c977fddaaad7d790afcb466beacb3f2beeebe01803befb9da004032678`.
4. **Seal and scope integrity:** before and after branch edits, compare each functional manifest's input/output hashes with Git-object content and verify exactly five own-world seal files and zero other RL-v3 world directories. Diff the pinned-file list against primary and require no differences. A failing gate may be diagnosed with `node tools/verify-world.js <world>`, but a targeted pass never substitutes for full `check-all`.
5. **Placeholder negative/structural checks:** assert each branch's `DEFAULT_WORLD`, assert `git ls-tree -r --name-only <branch> -- derived/rl-v3` is empty, and confirm the deferred constructor still raises `NotImplementedError`. Run `node tools/verify-world.js` as an expected-failure probe and record that it fails because the placeholder manifest is absent. Do not create empty/fake seals, catch the constructor error, or modify tests/check-all to hide the expected red result. The ruleset and hard-coded simulator tests otherwise remain valid.
6. **Publication verification:** after pushes, require exactly the eight intended `refs/heads/world-*` branches remotely, each remote hash equal to its local final tip, the correct branch-local `DEFAULT_WORLD`, and remote/local `main` still `f56fb53c6d8dba72d5f00b8d8dbae5eff4b7f42c`. Finish on primary with a clean working tree.
7. **Failure policy:** any documentation conflict, hash mismatch, unexpected source diff, gate failure, lease failure, or unexpected remote branch stops publication. Preserve the existing seals and logs, report the exact failing branch/step, and do not retrain, regenerate, relax assertions, or force through the failure without a new approved correction.

[Implementation Order]

1. **Confirm the approved starting state.** Ensure no other agent is using the working tree and the project dev reservation is active. From `/workspace/roboticThingAvoidance`, require a clean tree except for this plan edit, the six known local functional branches, no local/remote `enf-align` or `adv-small` branches, origin heads exactly as in the baseline table, and local/remote `main` at `f56fb53`. Preserve all existing commits and seals; do not use `checkout -f`, reset, clean, or rebase.
2. **Create the shared documentation commit on primary.** Run `git switch world-ccw-line-sq-adv-align`, preserving the plan edit; if Git would overwrite it, stop rather than discarding it. Complete the three document edits listed in [Files]. Stage only those paths, inspect `git diff --cached`, run `git diff --cached --check` and `uv run --no-project --python 3.12 python -B -I .claude/skills/secrets-guard/scripts/scan_secrets.py --staged`, then commit `docs: close out eight-world branch strategy`. Record the resulting hash as `D`; do not push.
3. **Propagate `D` to the five functional siblings.** In order `world-ccw-gate-sq-adv-align`, `world-ccw-line-rd-adv-align`, `world-ccw-gate-rd-adv-align`, `world-ccw-line-sq-adv-yaw`, `world-cw-line-sq-adv-align`: switch to the branch with a clean tree, run `git cherry-pick D` using the recorded hash, and confirm only the three documentation paths changed. Each branch must still differ from `D` only in `DEFAULT_WORLD` and replacement of the primary seal by its own five-file seal. Stop on any conflict or unexpected diff.
4. **Create `world-ccw-line-sq-enf-align` locally.** After reconfirming it is absent, run `git switch -c world-ccw-line-sq-enf-align D`; write `world-ccw-line-sq-enf-align\n` to `software/stockcar/DEFAULT_WORLD`; run `git rm -rq derived/rl-v3/world-ccw-line-sq-adv-align/`; stage `DEFAULT_WORLD`; inspect/check/scan the staged set; commit `world(world-ccw-line-sq-enf-align): cut structural placeholder; semantics deferred`. Do not train, evaluate, seal, or push yet.
5. **Create `world-ccw-line-sq-adv-small` locally.** Repeat step 4 from the same `D`, with `world-ccw-line-sq-adv-small` everywhere and commit message `world(world-ccw-line-sq-adv-small): cut structural placeholder; semantics deferred`. Both placeholders inherit `D` directly, so no cherry-pick or later documentation edit is needed.
6. **Run all six functional gates before any publication.** Create `/tmp/robotic-world-closeout/`. Sequentially switch to primary and the five siblings, verify clean status and own-world seal integrity, then execute the full command in [Testing], with logs unique to each world. Record final commit, actual pass count, duration, and JSON verdict. If any branch fails, stop with no close-out branch pushed.
7. **Validate placeholders as placeholders.** For each new branch, check its exact `DEFAULT_WORLD`, no tracked files under `derived/rl-v3/`, only the intended diff from `D`, retained `NotImplementedError`, and expected `verify-world.js` failure from the missing own-world manifest. Label these branches deferred; never report their expected red gate as a pass.
8. **Perform a live remote/lease preflight.** Re-read `git ls-remote --heads origin`. Require primary still `bcb162c`; the five old sibling hashes still exactly `108fb7c`, `ab361ee`, `70ef6e2`, `d639daf`, and `02f0479` respectively; both placeholder refs absent; and `main` still `f56fb53`. Any change stops the affected publication for review. Run the secrets-guard worktree scan before pushes.
9. **Publish without broad force.** Push primary normally: `git push origin world-ccw-line-sq-adv-align:refs/heads/world-ccw-line-sq-adv-align`. For each sibling, set `EXPECTED` from its just-verified old origin hash and run `git push --force-with-lease="refs/heads/$W:$EXPECTED" origin "$W:refs/heads/$W"`. Push each previously absent placeholder with ordinary `git push --set-upstream origin "$W:refs/heads/$W"`; no force is needed or allowed. Run secrets-guard before each push. If one lease fails after earlier pushes succeed, report the partial state and revalidate only what remains; never switch to `push -f`.
10. **Verify and hand off.** Switch to primary, require a clean tree, and compare every local final tip with live origin. Confirm exactly eight world branches, correct defaults, six own-world seals, two empty RL-v3 trees, unchanged pinned files, and `main` at `f56fb53`. Report a table of all eight final local/remote heads and gate results, the log directory, the six measured seal outcomes, and the two deferred semantic work items. Make no further “optional” documentation commits after the gates; any correction requires repeating the affected final-tip gate.

Owner decisions preserved: all eight branches are published; six retain their existing seals and training budgets; `enforced` and `small` are structural placeholders only; no existing seal is regenerated; no pinned file or `main` changes.