# Ruleset worlds — one branch per rule combination

Each open organizer question (QA01–QA10, `derived/qa-pack-v10/QUESTIONS.md`) is cast as a "working
assumption." A **world** is one coherent cast of those assumptions, versioned in
`software/stockcar/ruleset.py` and mirrored in `software/stockcar/worlds.json`. A world branch ships
the shared codebase with `software/stockcar/DEFAULT_WORLD` set to its name and, for a functional
world, its own five-file `derived/rl-v3/<world>/` seal. Six worlds are functional; the `enforced`
and `small` worlds are structural placeholders whose simulator semantics are deliberately deferred.
A ruling can promote only a green functional branch to `main` after the owner approves it.

Agent-written for the owner's hobby/learning project. Nothing here is an organizer ruling or a
competition score.

## The five dimensions that vary

| dimension | values | question |
|---|---|---|
| `lap` | `gate` (route progress at the west apex) · `line` (literal checkered band) | QA06 |
| `direction` | `ccw` · `cw` | QA06 |
| `body` | `square10` · `round10` | QA01 |
| `lane_rule` | `advisory` · `enforced` | QA04 |
| `obstacle` | `align` · `yaw` · `small` | QA03 |

Pinned identically in every world (reliability/timing/margins, not strategy): AprilTag pose (QA02),
pit openings (QA05), 75% parking (QA07), start flag (QA08), wall tolerances (QA09), publicity (QA10).

## The eight worlds

| branch / world | what makes it unique | varies on | implementation status |
|---|---|---|---|
| `world-ccw-line-sq-adv-align` | **Primary best guess.** A lap finishes at the literal checkered start/finish band; CCW oval, square 10 in body, advisory lanes, aligned guide-plush obstacles. | QA01, QA03, QA04, QA06 | Functional — own five-file RL-v3 seal |
| `world-ccw-gate-sq-adv-align` | Current-code model: laps counted by route progress at the west-arc gate, not the literal line. | QA01, QA03, QA04, QA06 | Functional — own five-file RL-v3 seal |
| `world-ccw-line-rd-adv-align` | Round 10 in body (QA01 round-base ruling) on the primary line world. | QA01, QA03, QA04, QA06 | Functional — own five-file RL-v3 seal |
| `world-ccw-gate-rd-adv-align` | Round body on the gate lap model; isolates QA01 (body) from QA06 (lap). | QA01, QA03, QA04, QA06 | Functional — own five-file RL-v3 seal |
| `world-ccw-line-sq-adv-yaw` | Obstacles at random yaw (QA03 worst-feasibility case). | QA01, QA03, QA04, QA06 | Functional — own five-file RL-v3 seal |
| `world-ccw-line-sq-enf-align` | Enforced lanes (QA04: stay in lane, no crossing the white line). | QA01, QA03, QA04, QA06 | Structural placeholder — no seal; simulator raises `NotImplementedError` |
| `world-cw-line-sq-adv-align` | Clockwise lap direction (QA06 CW ruling). | QA01, QA03, QA04, QA06 | Functional — own five-file RL-v3 seal |
| `world-ccw-line-sq-adv-small` | Smaller official toy obstacle (QA03 small-toy ruling; dimensions remain an unverified placeholder). | QA01, QA03, QA04, QA06 | Structural placeholder — no seal; simulator raises `NotImplementedError` |

All eight branches exist structurally so every cast of the dimensions has an explicit branch. The
functional set is exactly the six sealed rows; `enf-align` and `adv-small` intentionally fail
`tools/verify-world.js` until their semantics are decided, implemented in unpinned world modules, and
newly sealed. This is deferred work, not a failed release of those two branches.

## Close-out behavior

Each functional branch carries only its own seal and a branch-local `DEFAULT_WORLD`. Placeholder
branches carry the inherited documentation, their own `DEFAULT_WORLD`, no RL-v3 directory, and the
existing constructor errors. Do not create empty/fake seals or weaken verification to make a
placeholder appear green.

## Promotion

When an organizer ruling arrives, identify the matching world and ask the owner before touching
`main`. For one of the six functional worlds, confirm `DEFAULT_WORLD`, re-run `node
tools/check-all.js` on the branch tip, and only then fast-forward `main` to that tip. A structural
placeholder is not promotable: decide QA04/QA03 semantics first, implement them in unpinned world
modules, add tests, seal and verify its own RL-v3 artifact, and run the full gate.