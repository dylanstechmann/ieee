# Ruleset worlds — one branch per rule combination

Each open organizer question (QA01–QA10, `derived/qa-pack-v10/QUESTIONS.md`) is cast as a "working
assumption." A **world** is one coherent cast of those assumptions, versioned in
`software/stockcar/ruleset.py` and mirrored in `software/stockcar/worlds.json`. A world branch ships
the shared codebase with `software/stockcar/DEFAULT_WORLD` set to its name and its own
`derived/rl-v3/<world>/` artifacts. When a ruling lands, the matching branch is fast-forwarded onto
`main` (after the owner approves).

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

| branch / world | what makes it unique | varies on |
|---|---|---|
| `world-ccw-line-sq-adv-align` | **Primary best guess.** A lap finishes at the literal checkered start/finish band; CCW oval, square 10 in body, advisory lanes, aligned guide-plush obstacles. | QA01, QA03, QA04, QA06 |
| `world-ccw-gate-sq-adv-align` | Current-code model: laps counted by route progress at the west-arc gate, not the literal line. | QA01, QA03, QA04, QA06 |
| `world-ccw-line-rd-adv-align` | Round 10 in body (QA01 round-base ruling) on the primary line world. | QA01, QA03, QA04, QA06 |
| `world-ccw-gate-rd-adv-align` | Round body on the gate lap model; isolates QA01 (body) from QA06 (lap). | QA01, QA03, QA04, QA06 |
| `world-ccw-line-sq-adv-yaw` | Obstacles at random yaw (QA03 worst-feasibility case). | QA01, QA03, QA04, QA06 |
| `world-ccw-line-sq-enf-align` | Enforced lanes (QA04: stay in lane, no crossing the white line). | QA01, QA03, QA04, QA06 |
| `world-cw-line-sq-adv-align` | Clockwise lap direction (QA06 CW ruling). | QA01, QA03, QA04, QA06 |
| `world-ccw-line-sq-adv-small` | Smaller official toy obstacle (QA03 small-toy ruling; placeholder size). | QA01, QA03, QA04, QA06 |

`#4` (`gate-rd`) and `#8` (`small`) are the lowest-priority; dropping them gives six worlds.

## Promotion

When an answer arrives, confirm the corresponding branch's `DEFAULT_WORLD`, re-run
`node tools/check-all.js`, then fast-forward `main` to that branch — with the owner's approval first,
per the standing habit.