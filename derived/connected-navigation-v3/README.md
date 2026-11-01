# Connected pit construction / grid-alignment study

October 30, 2026. Agent-built and agent-run software work for the owner's personal
hobby/learning project. Uses archived V3 rules/geometry and hypothetical regression
probes. No owner physical measurements, official Q&A response, hardware selection,
purchases, sensing/control validation or official lap determination.

## Reproduce

From `/workspace/ieee/ieee`:

```sh
node tools/connected-navigation-v3.js
node tools/connected-candidate-summary-v3.js
node tools/verify-connected-navigation-v3.js
node --test tests/*.test.js
```

The full study is CPU-bound and can take many minutes, especially variant-aware
connected searches and independent route checks. The search budget is per segment,
not per whole experiment. No packages were installed. Tests run directly in the
available Linux environment on Node v24.18.1; no Docker nesting or physical tests.

## Source audit first

Read `/workspace/ieee/ieee/OBSTACLE-REFERENCE-2026-10-30.md` and
`/workspace/ieee/ieee/derived/connected-navigation-v3/obstacle-source-audit.json`.
Archived Appendix E's 16-in dimensions describe placement quadrants, **not obstacle
vehicle size**. The linked toy-set identity does not establish installed footprint,
orientation or tolerances. Lane allocation, rail reference faces and containment
interpretations remain unresolved. No official three-car scenario is invented.

## Preserved baseline

`baseline-manifest.json` records the pre-edit code/input/report hashes and passing
65-test baseline. Historical avoidance, contract and diagnostic reports are not
overwritten. Their results are historical runs of their recorded code versions;
old freshness verifiers can correctly report stale code after shared planner
changes. The new verifier checks historical input/report preservation separately
from new current-code hashes.

## Experiment A: separate grid alignment from wall geometry

24 upper-leg searches: three wall scenarios × two explicit board-reference origins
([0,0] and [0.5,0.5] in) × geometry supplements off/on × nominal/variant-aware mode.
Both origins use a 1-in grid; wall inset changes physical bounds, not grid origin.
Exact route anchors are retained. The historical wall-origin behavior is preserved
when a caller omits the new grid-origin option.

Geometry supplements enumerate axis-aligned open gaps between overlapping solid
bounding boxes or board faces, offset by half the cardinal robot extent plus the
0.05-in margin. Their midpoints become candidate grid coordinates. This is a
candidate generator, not configuration-space completeness, an arbitrary-heading
clearance guarantee or safety certification. Every accepted pose/edge still passes
the independent physical and interval checks. Positive gaps under heading error
are not assumed; variant-aware checks decide those separately.

## Experiment B: selectable pit construction

36 comparison rows / 108 full-route attempts: empty control and pit-blocker probe ×
three walls × nominal/variant-aware modes × three policies. Expensive full-route
comparisons use origin [0,0] with supplements, not both origins.

1. **original-fixed:** preserve the original ordered construction waypoints and
   contract; staging remains x=18 for this controlled comparison. This does not
   replace the earlier separate x=18/16/15 study.
2. **selectable-original-regions:** preserve original race construction through
   the pit-mouth staging pose. Search directly from there to the unchanged assigned
   dock, then back to race staging using the union of original pit-mouth and pit
   regions. Intermediate pit spin/staging poses are no longer mandatory.
3. **experimental-north-pit-access:** same tasks, but use an explicitly different
   west-side access rectangle and require crossing the pit-divider partition north
   of its end on both entry and exit. This is an alternate engineering assumption,
   NOT an official permitted path or silently enlarged original contract.

Arrival and withdrawal each require their own directional gate state. They reset
at the explicit docking task: entry and exit gates share a partition, so naïvely
treating them as two independently simultaneous gates in one list would mistake
one crossing for an out-of-order crossing of the other. Their independent audits
are composed at the unchanged dock. The full race gate trace is checked afterward.

Start, dock position/heading, and final race staging remain unchanged. Race events
are integrated in search on their relevant leg using the existing progress-state
mechanism. Race construction waypoints remain fixed in this pass; it is not a
fully free mission planner or global phase-transition optimizer. Regions are
robot-center constraints; physical footprints are checked independently. Union
containment checks all center/rectangle-boundary crossing intervals, not just
endpoints, so paths cannot jump a nonconvex gap.

Every arrival must also withdraw and re-enter the race. A failed later segment
returns no completed route. Search failure remains untested, not a collision trial.

## Evidence and candidate comparison

`report.json` retains every outcome, failure segment and expansion count. Complete
routes contain independent nominal and perturbation collision/docking checks,
interval-clearance checks, and separate perturbed phase/gate audits. Construction
roles and segment indices identify what was fixed and what was selectable.

`candidate-metrics.json` and `candidate-metrics.md` tabulate all attempted complete
routes, including unplanned outcomes, reverse distance, spins, wheel travel and
separate evidence failure counts. Their source-report hash is verified. The docking
minimum metric uses nominal plus retained failed-variant records only; the inherited
evaluator does not retain every passing variant's overlap. Do not call it a sweep
minimum. All passing docking variants still exceed the configured >75% threshold.

Wheel-command segments retain forward/reverse/spin type, travel and rotation.
They support comparisons of distance, reverse travel and turn complexity, not
elapsed time, motor feasibility or match score. No weighted winner is selected:
different access policies are not legally interchangeable, and a shorter path can
have worse robustness. Read `summary.md` alongside detailed failures, not alone.

The inherited finite uncertainty is unchanged: constant pose offsets and separate
one-at-a-time element/target shifts, not integrated odometry drift or simultaneous
adversarial field errors. Phase/gate checks and collision/docking checks are reported
separately. Shifted solids do not shift engineering gate definitions.

## Remaining gates

Obtain actual obstacle dimensions/placement interpretations and legal pit access.
Only then promote a particular corridor assumption. No smaller footprint, reduced
uncertainty, finer-heading or curved-motion primitive was introduced merely to
manufacture a passing result. A nominal or hypothetical alternate-corridor success
does not demonstrate a legal reliable competition robot.