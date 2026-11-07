# Ruleset worlds — one branch per rule combination

Each open organizer question (QA01–QA10, `derived/qa-pack-v10/QUESTIONS.md`) is cast as a "working
assumption." A **world** is one coherent cast of those assumptions, versioned in
`software/stockcar/ruleset.py` and mirrored in `software/stockcar/worlds.json`. A world branch ships
the shared codebase with `software/stockcar/DEFAULT_WORLD` set to its name and, for a functional
world, its own five-file `derived/rl-v3/<world>/` seal. The formerly deferred `enforced` and `small`
semantics are now implemented in unpinned world modules; each branch still ships only its own seal.
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
| `world-ccw-line-sq-enf-align` | Enforced lanes (QA04): lane-aware physical outer/inner routing, straightaway-only white-line marking penalties in training reward, and explicit fallback diagnostics. Not a hard-stop rule. | QA01, QA03, QA04, QA06 | Functional on its named branch — implementation and seal live there; this branch carries no enforced seal |
| `world-cw-line-sq-adv-align` | Clockwise lap direction (QA06 CW ruling). | QA01, QA03, QA04, QA06 | Functional — own five-file RL-v3 seal |
| `world-ccw-line-sq-adv-small` | Hypothetical QA03 smaller official toy: the explicitly unverified 8 × 4 in placeholder footprint in `ruleset.SMALL_TOY`, not an official measurement. | QA01, QA03, QA04, QA06 | Functional on this branch — own five-file RL-v3 seal |

All eight branches exist structurally so every cast of the dimensions has an explicit branch. Each
branch carries only its own `DEFAULT_WORLD` and its own seal: this branch ships `world-ccw-line-sq-adv-small`;
`world-ccw-line-sq-enf-align` is implemented and independently sealed on its named branch. The
common semantics live in `world_geometry.py`, `world_layouts.py`, `mission_worlds.py`, and
`world_routes.py`; no pinned input is modified.

## Close-out behavior

Each functional branch carries only its own seal and a branch-local `DEFAULT_WORLD`. This branch has
no `world-ccw-line-sq-enf-align` seal; that world's implementation and seal live on its named branch.
Do not create empty/fake seals or weaken verification to make a branch appear green.

## Promotion

When an organizer ruling arrives, identify the matching world and ask the owner before touching
`main`. For a functional world, confirm `DEFAULT_WORLD`, re-run `node tools/check-all.js` on the
branch tip, and only then fast-forward `main` to that tip. The `enforced` and `small` worlds are now
implemented and sealed on their named branches, but their semantics remain hypothetical QA04/QA03
assumptions: any ruling that changes them requires code/tests updates and a fresh seal before
promotion.