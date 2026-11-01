# Provisional route contract and uncertainty-aware planning

October 30, 2026. Agent-built and agent-run engineering study for the owner's
hobby/learning project, not owner physical testing or official rules adjudication.
Uses locally archived V3-derived field geometry; no current organizer/Q&A review,
actual obstacle measurements, hardware selection or purchasing was performed.

## Reproduce

From `/workspace/ieee/ieee`:

```sh
node tools/contract-navigation-v3.js
node --test tests/*.test.js
```

The full comparison may take several minutes. Search budget is per leg and each
candidate staging sequence is a separate attempt. No additional packages required.

- Configuration: `/workspace/ieee/ieee/route-contract-v3.json`.
- Code: `/workspace/ieee/ieee/tools/contract-navigation-v3.js`.
- Machine-readable comparison: `/workspace/ieee/ieee/derived/contract-navigation-v3/report.json`.
- Complete baseline failed-variant ledger: `/workspace/ieee/ieee/derived/contract-navigation-v3/baseline-failure-ledger.json`.
- Comparison table: `/workspace/ieee/ieee/derived/contract-navigation-v3/summary.md`.
- Eighteen SVGs: one per mode/layout/wall, with phase-region/gate overlays.

## Contract, not an official lap definition

Ordered regions restrict the robot **center**, not its full footprint or painted
track containment: west transition, upper side, far turn, lower side, pit mouth,
pit interior, withdrawal and re-entry. Each leg belongs to one convex rectangle.
Affine translation and stationary spins remain in a rectangle if endpoints do;
the physical footprint is independently checked against solids/board boundaries.
The phase is fixed per planner instance so cached edge checks cannot leak between
phases. Regions and gate locations are engineering assumptions from the archived
divider model, not organizer-provided allowable navigation corridors.

Three ordered directional spatial gates require outbound upper travel, far-end
transition, then inbound lower travel. Repeated/out-of-order/reverse crossings
fail; in-place spins and merely touching a gate do not earn progress. Reversing
the chassis while moving in the required spatial direction is allowed. No official
checkered-line lap state, full three-lap mission, pit dwell, tire/flag action,
start signal or final parking is implemented.

Start, race anchors and docking pose remain fixed. Only the pit-staging x-coordinate
varies, using the configured list 18, 16, 15 in. Each candidate is checked as an
entire connected route, including arrival, docking, withdrawal and re-entry. A
failure at any leg discards that candidate. The first complete contract-valid
candidate is selected, not necessarily the globally shortest or most robust one.
All attempts and their failure legs/statuses are retained. No task anchor is moved
to force a pass; this is not a general joint staging optimizer.

## Planning and evidence levels

`constrained-nominal` requires the declared regions plus positive nominal interval
clearance >0.05 in. `constrained-variants` additionally checks the inherited finite
constant-pose combinations and separate one-at-a-time element shifts at pose/edge
acceptance. When nominal clearance exceeds a conservative displacement bound, an
edge can bypass explicit variant checks; otherwise every variant is checked with
the same interval bound. This shortcut bounds constant rigid pose offsets and
separate solid shifts, not arbitrary odometry drift or simultaneous deviations.

Post-planning evaluation independently reruns all sampled collision/docking checks
and interval bounds on enumerated geometry variants. Shifted docking targets are
checked for overlap after planning, not used to generate detours. Region/gate
admissibility is nominal only; robustness of contract compliance under pose errors
is not established. Interval bounds are floating-point sufficient separation tests,
not formally verified certificates or hardware tracking budgets.

Cases with search failures stay in the scheduled uncertainty denominator as
**untested**, not as actual collision trials. `endpoint-blocked`, `grid-exhausted`,
`budget-exhausted` and `contract-rejected` remain distinguishable in attempts. Grid
exhaustion does not prove no continuous physical path exists. Cardinal heading,
fixed checkpoints, finite grid, phase regions and clearance thresholds can all
exclude feasible alternatives.

## Baseline preservation and diagnosis

The previous avoidance report is not overwritten. Its SHA-256 is recorded in the
new report; expected historical baseline is
`86c864ca5bffea2437a4a640b639184cbbc51e3284e6c5ec7de7fc5c1aa8db9a`.
It contains 96 failed / 1,125 sampled variants. The new ledger recomputes every
variant and records the first collision, object/category, sample, route segment,
pose and docking result. It records **every failed variant**, not every subsequent
contact in that variant. Historical interval failures are not inferred from the
sampled ledger. Historical paths are also audited against the new contract.

The earlier categorical claim that markings "must be advisory" was corrected in
`/workspace/ieee/ieee/STRATEGY-AND-ARCHITECTURE.md`. Geometric clearance conflict is
an organizer-clarification question, not permission to cross painted boundaries.

## Next gate

### October 30 results

| Mode | Empty-control routes completed | Blocker routes completed | Sampled pass / scheduled variants |
|---|---:|---:|---:|
| Historical unconstrained nominal | 9/9 | 18/18 | 1,029/1,125 |
| Constrained nominal | 9/9 | 0/18 | 351/1,125 (774 untested) |
| Constrained enumerated-variant | 9/9 | 0/18 | 351/1,125 (774 untested) |

All historical blocker routes fail the new engineering contract audit; all nine
historical empty-control routes pass. Thus the old detours cannot be promoted as
valid solutions under this contract despite being nominally collision-free.

In each constrained mode, all 351 tested empty-control perturbations also have
positive interval geometry bounds and passing docking overlap. The blocker routes
fail before a complete candidate exists; their 774 scheduled variants are untested,
not 774 observed contacts. Upper-blocker attempts exhaust the grid on leg 4 (upper
outbound). Pit-blocker attempts exhaust the grid on leg 12 (pit-mouth approach).
For variant-aware pit planning, staging x=18 is endpoint-blocked on that leg;
x=16 and x=15 eliminate that endpoint conflict but still exhaust the grid. No
staging candidate completes. These results diagnose the finite cardinal/region
experiment, not physical impossibility or official layout illegality.

The complete historical ledger groups first collisions into 24 center-divider,
33 pit-divider, and 39 obstacle failures, totaling 96. Docking is not the cause
of these historical failures. Code tests and representative open-field fixtures
also demonstrate valid constrained and uncertainty-aware detours, so the planner
is not merely rejecting every non-straight case.

The exact generated SVGs could not be opened by the isolated browser service
(workspace filesystem unavailable and local preview connection refused). A
representative baseline centerline was reconstructed from saved coordinates and
visually checked with the divider/gates; it is not a visual inspection of all
generated SVGs. Generated SVG text is verified separately against the renderer.

Validation: Node v24.18.1, `node --test tests/*.test.js`: **56 passed, 0 failed,
0 skipped**. All 18 SVGs and the comparison summary match their current renderers;
all 18 completed route evaluations/contracts and the complete 96-entry historical
failure ledger were independently recomputed and compared. No physical tests ran.

Inspect exact search/contract failures before modifying geometry. Compare actual
obstacle placement rules and measured footprints with these hypothetical 2-in
square probes. Review phase and gate assumptions against official lap/track Q&A.
Do not shrink uncertainty, move fixed task poses or relax a region silently to
obtain a success count. No hardware qualification or purchases follow from this run.