# Ideal differential-drive avoidance experiment

October 30, 2026. Agent-built, agent-run software experiment for the owner's
hobby/learning project; not owner hardware testing, organizer approval, or a
qualified robot design. Geometry derives from the locally archived organizer V3
drawing through the existing constrained-field model. No new official-rule review,
measurements, purchases, or hardware selections were performed.

## Reproduce and artifacts

From `/workspace/ieee/ieee`:

```sh
node tools/avoidance-v3.js
node --test tests/*.test.js
```

- Planner: `/workspace/ieee/ieee/tools/avoidance-v3.js`.
- Settings: `/workspace/ieee/ieee/avoidance-v3.json`.
- Inputs also use `/workspace/ieee/ieee/navigation-v3.json`,
  `/workspace/ieee/ieee/differential-drive-v3.json`, and
  `/workspace/ieee/ieee/navigation-stress-v3.json`.
- Results: `/workspace/ieee/ieee/derived/avoidance-v3/report.json` and
  `/workspace/ieee/ieee/derived/avoidance-v3/summary.md`.
- Nine SVGs in this directory show routes for each probe/wall combination.

## Algorithm and limits

The planner searches a finite x/y grid with four cardinal headings using A*.
The regular 2-in coordinate spacing is supplemented by exact checkpoint x/y
coordinates, so fractional pit and start poses do not get rounded. Allowed actions
are straight forward/reverse travel to neighboring coordinates and in-place
90-degree spins. Cost is translation plus mean absolute wheel travel for spins,
using the provisional 8-in track; it is not time, energy, traction, or motor sizing.
The position Manhattan heuristic is a lower bound on this search cost, but direct
valid primitives are retained and legs are solved independently; no globally
optimal full-mission claim is made.

Each edge must have a conservative between-sample clearance lower bound greater
than 0.05 in. Endpoint collision results and edge checks are cached per field.
The bound uses the existing nominal rectangle/interpolation calculation in
`/workspace/ieee/ieee/tools/navigation-stress-v3.js`; floating-point geometric
evidence is not formal verification or a hardware safety certificate.

All original route checkpoint poses are retained in order. Inserted waypoints
shift the docking index, which is remapped before evaluating overlap. Signed wheel
travel is recomputed for the full path. Failed legs return no completed route;
`endpoint-blocked`, `budget-exhausted`, and `grid-exhausted` remain separate statuses.
Search is bounded to 20,000 expansions **per leg**, not per complete experiment.
Search failure is not proof of infeasibility in continuous space, at other headings,
with curved primitives, or with another footprint.

**Checkpoint order is not lap legality.** The planner has no lane-side, homotopy,
lap-counting, start-line, tire, dwell, flag, or final-parking state constraints. A
detour may leave a presumed lane or traverse the divider's other side between
anchors. Only nominal geometric travel and the declared docking metric are checked.
Markings remain conditionally excluded, not officially declared advisory.

## October 30 results

All 27 nominal combinations (three pit routes x three wall interpretations x empty,
upper-lane-blocker, and pit-gate-blocker layouts) produce complete paths and positive
nominal interval bounds above the configured margin. All nominal docking checks
exceed 75% modeled overlap. This uses the baseline 10 x 10-in centered rectangle,
not the larger mechanism-enclosure probes from the previous study.

| Hypothetical layout | Nominal routes found | Sampled uncertainty passes |
|---|---:|---:|
| Empty control | 9/9 | 351/351 |
| Upper-lane blocker | 9/9 | 363/387 |
| Pit-gate blocker | 9/9 | 315/387 |
| Total | 27/27 | 1,029/1,125 |

The 96 failing uncertainty cases are retained in counts; representative failures
are recorded by the inherited checker. Passing paths are not replanned for each
perturbation. The uncertainty check samples constant global pose offsets and
one-at-a-time solid/target shifts; it does not bound between-sample uncertainty
paths or combine all possible deviations. The 0.05-in nominal planning threshold
is an experiment parameter, not a demonstrated physical tracking allowance.

Both blockers are hypothetical 2-in square probes with invented poses. Actual toy
geometry, placement constraints, sensing, localization, acceleration, wheel slip,
mechanism deployment, carried tires, and permitted field envelope remain open.

Validation: `node --test tests/*.test.js` on Node v24.18.1: **50 passed, 0 failed,
0 skipped**. Regressions cover detours, primitive constraints, ordered anchors,
docking-index remapping, explicit failure modes, fractional poses, and archived-field
integration. All 27 saved nominal collision/interval results and wheel commands,
nine SVGs, input snapshots, and the generated summary were independently recomputed
and compared. This does not count the 96 geometric stress failures as software-test
failures or suppress them from the report.

## Next discriminating work

1. Add lane-side / lap-state constraints before calling any detour mission-valid.
2. Obtain actual obstacle and mechanism measurements and official interpretations.
3. Plan with a justified uncertainty allowance, then recheck every candidate against
   the perturbation suite; report unresolved variants rather than promising safety.
4. Only then compare packaging and drivetrain hardware requirements. No buying yet.