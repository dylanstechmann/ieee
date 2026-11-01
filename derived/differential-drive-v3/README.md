# Ideal differential-drive route study

October 30, 2026. Agent-built, agent-run geometric analysis for the owner's learning
project; no physical robot, owner hardware test, or organizer approval is implied.
Geometry derives from the archived organizer drawing through the project's
`/workspace/ieee/ieee/constrained-field-v3.json` and source trace.

## Reproduce

From `/workspace/ieee/ieee`:

```sh
node tools/differential-drive-v3.js
node --test tests/*.test.js
```

- Drive inputs: `/workspace/ieee/ieee/differential-drive-v3.json`.
- Shared footprint/field/sweep inputs: `/workspace/ieee/ieee/navigation-v3.json`.
- Artifacts: `/workspace/ieee/ieee/derived/differential-drive-v3/report.json` and
  `/workspace/ieee/ieee/derived/differential-drive-v3/paths.svg`.
- Tests: `/workspace/ieee/ieee/tests/differential-drive-v3.test.js`.

## What changed from the earlier geometric paths

Translations are parallel to the robot body heading, forward or reverse. Every
heading change occurs with the axle midpoint stationary. The code rejects sideways
translation and simultaneous translation/rotation; this is a restricted primitive
set, not a general differential-drive path planner.

For each assumed assigned pit box, a connected route includes start exit, one
illustrative circuit around the center divider, pit approach, docking checkpoint,
reverse withdrawal, and return to race staging. Robot pose does not teleport between
these stages. Docking overlap is measured at the checkpoint, not at the final route
endpoint after withdrawal. No tire action or stop-duration credit is inferred.

The report includes signed left/right wheel travel for every primitive. Wheel track
is provisionally 8 in, and axle midpoint is assumed at footprint center. These are
calculation inputs, not selected hardware. Wheel rotation, motor speed/torque, battery
runtime, slip, caster clearance, and achievable acceleration are not established.

## Baseline results

With a 10 x 10-in footprint and no obstacles, all nine nominal combinations (three
pit boxes x three wall interpretations) clear sampled collisions and have 100%
robot-plan-area overlap at docking. All 351 enumerated stress cases also pass.

| Wall interpretation | Worst sampled clearance across tested cases |
|---|---:|
| Inside, nominal 1-in | 0.262 in |
| Inside, 0.75-in | 0.512 in |
| Outside board | 0.523 in |

These small margins are not manufacturing allowances or guaranteed tracking budgets.
The analysis samples at 0.25-in translation / 2-degree rotation and may miss contact
between samples. Touching counts as collision. The uncertainty sweep uses constant
global x/y and heading perturbations plus separate one-at-a-time element shifts;
it does not integrate odometry errors or combine all construction deviations.

## Unresolved gates

- Default obstacles remain empty; use measured representative obstacle geometry
  before claiming obstacle handling. No avoidance planner has been implemented.
- Markings are excluded conditionally, not declared advisory by an official ruling.
- End walls, installed divider thickness/poses, and pit origins remain assumptions.
- The circuit direction/start pose and checkpoint overlap are study choices, not
  proof of legal lap ordering, parking interpretation, pit dwell, or a full mission.
- The actual footprint must include mechanisms, wiring, wheel/caster protrusions,
  and carried tire geometry; the rectangular baseline does not establish those.
- No mecanum comparison, chassis purchase, motor selection, or final drivetrain
  decision has been made.

Next: test measured obstacle cases and packaging variants, examine the tight turns,
then specify wheel/motor/mechanism requirements for a sourced bill of materials.
Resource options remain in `/workspace/ieee/ieee/RESOURCES-AND-BUDGET.md`.