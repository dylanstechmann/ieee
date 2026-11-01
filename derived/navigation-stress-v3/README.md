# Packaging and obstacle sensitivity study

October 30, 2026. Agent-written and agent-run study for the owner's hobby/learning
project. There are no new physical measurements, purchases, or hardware tests.
Geometry uses the archived organizer V3 drawing through the existing constrained
field model, not a new verification of current rules or official obstacle layouts.

## Reproduce

From `/workspace/ieee/ieee`:

```sh
node tools/navigation-stress-v3.js
node --test tests/*.test.js
```

- Inputs: `/workspace/ieee/ieee/navigation-stress-v3.json` plus the existing
  `/workspace/ieee/ieee/navigation-v3.json` and
  `/workspace/ieee/ieee/differential-drive-v3.json`.
- Code: `/workspace/ieee/ieee/tools/navigation-stress-v3.js`.
- Generated results: `/workspace/ieee/ieee/derived/navigation-stress-v3/summary.md`
  and `/workspace/ieee/ieee/derived/navigation-stress-v3/report.json`.
- Four SVGs in this directory visualize the first configured envelope, one per
  obstacle case. Red footprints are nominal sampled collisions, not repaired paths.

## Inputs and interpretation

Four envelopes probe the baseline and hypothetical one-inch forward and/or lateral
mechanism extensions. Front/rear/left/right extents are referenced to the assumed
axle midpoint. For this pass the collision model encloses them in a centered
rectangle with length `2 * max(front, rear)` and width `2 * max(left, right)`.
Thus a one-inch forward extension of a 10-in body becomes a conservative 12-in
length bound, not an assertion that the actual robot is 12 in long. Empty corners
can cause false rejections; actual geometry and mechanism deployment need modeling.
The bounding rectangle is also used for docking overlap, not the actual mechanism
plan area. No size-rule compliance or physically feasible packaging is established.

All obstacles are explicitly hypothetical 2-in square probes: an off-route control,
an upper-lane blocker, and a pit-gate blocker, alongside an empty control. Their
sizes/poses are neither measured toys nor approved obstacle placements. Existing
obstacles in the shared navigation input are retained in every case. The current
input validator deliberately rejects a `measured` label until a measurement/provenance
schema is implemented; do not relabel invented geometry as measured evidence.

Each combination uses three connected pit routes, three wall interpretations, and
the inherited sampled uncertainty sweeps. Routes do not change to avoid obstacles.
Reported stress pass means collision-free AND strictly over 75% modeled docking
overlap; collision-free nominal counts alone are not sufficient. Detailed nominal
docking values and first collisions are in the JSON. Stress failure examples are
limited to the first five per route/wall, as in the original study.

## Between-sample check

The nominal route additionally receives a conservative clearance lower bound for
each interpolation interval:

```text
min(endpoint clearances) - (center translation + corner radius * |rotation|)/2
```

Here rotation is in radians and corner radius is the centered rectangle's half
diagonal. Every point of the footprint is within half the stated motion bound of
its corresponding point at the nearer endpoint. Distance to fixed solids/board
boundaries therefore cannot decrease by more than this bound. Positive bounds on
every interval provide stronger separation evidence for the exact nominal model
than endpoint checks alone. Calculations use floating-point arithmetic and are not
a formally verified collision certificate or hardware safety guarantee.

A nonpositive bound is **unresolved**, not automatically a detected collision.
The tests include a thin solid between collision-free endpoints that the bound
correctly refuses to clear. Actual sampled hits are reported separately. Bounds
are computed for nominal routes only, not all uncertainty variants. No dynamics,
tracking drift, simultaneous field deviations, mechanism motion, sensing, traction,
legal mission sequence, or tire/flag manipulation is validated.

## Next gates

### October 30 run results

The matrix contains 16 envelope/layout combinations, 144 nominal route/wall
checks, and 6,048 sampled uncertainty cases. On the empty-control layout:

| Conservative envelope | Nominal collision-free | Sampled stress pass | Nominal positive interval bounds |
|---|---:|---:|---:|
| 10 x 10 in | 9/9 | 351/351 | 9/9 |
| 12 x 10 in | 9/9 | 195/351 | 6/9 |
| 10 x 12 in | 9/9 | 216/351 | 9/9 |
| 12 x 12 in | 3/9 | 60/351 | 0/9 |

All nominal docking checkpoints exceed the study's 75% overlap threshold, including
rows that collide elsewhere. The baseline's worst nominal interval lower bound is
about 0.762 in; the earlier 0.262-in clearance is the worst **sampled uncertainty**
clearance, not a bound on all uncertainty paths. Those are different metrics.
The 10 x 12-in nominal interval bound falls to about 0.008 in, illustrating
fragility even before uncertainty. The 12 x 10-in unresolved nominal intervals do
not establish actual nominal collisions; all its sampled nominal poses are clear.

Both blocker layouts produce nominal collisions in all nine routes for every
envelope, and zero sampled stress passes. The off-route control preserves baseline
success; its stress-case count is higher because added solids also receive
one-at-a-time shifts. Negative sampled clearance in some larger-envelope rows
indicates a board-boundary violation; collision with a solid otherwise reports
zero gap, not penetration depth.

Validation: `node --test tests/*.test.js` on Node v24.18.1: **44 passed, 0 failed,
0 skipped**. Thin-solid translation and corner-sweep rotation regressions demonstrate
why sampled-clear endpoints alone are insufficient. Original navigation and
differential-drive SVGs were regenerated after correcting hard-coded envelope and
obstacle-free captions; their underlying study inputs remain unchanged.

Use the generated summary to locate sensitivity, not to pick hardware from a
hypothetical pass/fail. Obtain obstacle measurements/placement constraints and actual
mechanism extents; model measured outlines and deployment states; then add a
drivetrain-feasible avoidance planner. Keep official Q&A on markings, installed
walls, and parking separate from engineering assumptions. No purchases authorized.