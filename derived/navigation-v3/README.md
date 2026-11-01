# V3 sampled navigation baseline

Agent-built and agent-tested on October 29, 2026 for this personal learning project.
No physical robot tests or owner review are implied. Geometry credit: archived organizer
GM2 V3 drawing via the project's provisional constrained layout and parameter files.

From `/workspace/ieee/ieee`, run:

```sh
node tools/navigation-v3.js
node --test tests/*.test.js
```

Configuration: `/workspace/ieee/ieee/navigation-v3.json`.
Outputs: `/workspace/ieee/ieee/derived/navigation-v3/report.json` and
`/workspace/ieee/ieee/derived/navigation-v3/paths.svg` (open in a browser).

## What is checked

- Full rotated 10 × 10-in footprint, with touching treated as collision.
- Wall/board boundaries, 1-in assumed divider footprints, optional convex obstacles.
- Independent start exit, two candidate divider loops, three pit approaches and back-outs.
- Samples spaced at most 0.25 in translation and 2 degrees rotation.
- Three wall interpretations: inside 1-in, inside 0.75-in, outside the board.
- Constant pose errors: all combinations of -0.5/0/+0.5 in x/y and -3/0/+3 degrees.
- Separately, each solid shifted +/-1 in along each axis. Docking target boxes are
  also shifted individually. These are not simultaneous worst-case field perturbations.
- Docking robot-plan-area overlap, with a strict >75% study threshold. This does not
  settle the organizer's parking measurement or pit-stop scoring interpretation.

## Initial finding

The original loop returns at x=38 in. Its nominal sampled clearance is 0.870 in,
but shifting the center divider 1 in toward that leg causes collision in all three
wall scenarios. A candidate return at x=36 in passes the enumerated cases. This is
a route adjustment worth testing, not a continuous safety certificate.

The docking paths pass this obstacle-free, finite test set. They permit sideways
translation at fixed heading: they are **not differential-drive trajectories**.
No drivetrain has been selected or qualified. The maneuvers are not stitched into a
legal complete mission. No traction, acceleration, localization, sensor, flag, tire
handling, obstacle placement distribution, or 3D overhangs are modeled.

## Reading the artifacts

The SVG overlays nominal routes and periodic footprint outlines for inside nominal
walls; red footprints indicate sampled collisions. It is not an uncertainty-envelope
plot. The JSON contains all three wall scenarios, nominal results, case counts,
worst sampled clearance, minimum docking overlap, and up to five failure examples
per route/scenario. A zero clearance can mean contact or penetration; it is not a
penetration-depth measurement. Finite samples may miss between-sample contact.

Markings are excluded from collision solids **conditionally**, not declared advisory
by an official ruling. Confirm wall construction and marking interpretation before
using this study for chassis decisions. Optional obstacles must be supplied as
counterclockwise convex polygons in inches (`{id, vertices_in}`); default is empty.