# Fixed-contract failure investigation — October 30, 2026

Agent-built/run software investigation for the owner's hobby and learning project.
Archived V3 geometry and hypothetical obstacles only; no owner measurements,
hardware tests, official Q&A review, purchases or legal-lap determination.

## Reproduce and preserved reference

From `/workspace/ieee/ieee`:

```sh
node tools/planner-diagnostics-v3.js
node tools/verify-planner-diagnostics-v3.js
node --test tests/*.test.js
```

`/workspace/ieee/ieee/derived/planner-diagnostics-v3/baseline-manifest.json` records
the pre-edit input/code/artifact hashes and 56-test baseline. Historical avoidance
and contract-navigation reports are not overwritten. Config is
`/workspace/ieee/ieee/planner-diagnostics-v3.json`. No dependencies were installed.

## Experiment and result

48 failed-leg searches: 2 probes × 3 wall scenarios × 2 planning modes × 2 grids,
with three staging candidates for the pit probe and one for the upper probe.
Grid spacing is the only geometric-search setting varied: 2 in versus 1 in.
The same phase regions, 10×10-in footprint, uncertainty, task coordinates and
0.05-in interval margin remain. The grid originates at each wall inset, so changing
wall scenario changes grid alignment as well as board clearance; results need not
be monotone across wall scenarios.

- **1 found:** upper blocker, nominal planning, inside-¾-in wall, 1-in grid.
- **6 endpoint-blocked:** variant-aware pit x=18, all walls and both grids.
- **41 grid-exhausted:** remaining searches.
- **0 budget-exhausted:** no larger-budget retry was warranted.

The recovered leg extends to all three complete pit routes under the same original
contract, but each fails **28/43** sampled perturbations and has **28/43** unresolved
or colliding interval variants. Across these three extensions, only **45/129**
sampled cases pass. Do not promote the finer-grid path as robust navigation.
These extension results are separate from the historical comparison denominators.

## Diagnostics and geometry

`report.json` contains rejection counts and up to three examples per rejection
category, reached-state counts, frontier size at termination, and the first 500
expanded poses. It includes the first limiting uncertainty variant and interval
where applicable. Categories separate boundary/divider/obstacle contact, nominal
pose margin, nominal interval bound, phase restriction and uncertainty rejection.
Counts are ordered first-rejection events after cost pruning, including repeated
cached checks—not independent collision trials, exhaustive cause counts or proof
that the largest count is the sole bottleneck. Geometry checks precede policies.
The first 500 poses are not a complete frontier/coverage map.

Straight cardinal square-footprint analysis gives these useful bounds:

- Upper passage below the probe requires center y strictly between approximately
  **29.623 and 29.95 in**, including the configured margin. The recovered path uses
  y=29.75 in; the other tested grid alignments miss that thin straight corridor.
  This does not certify access or turns; full path checks do that separately.
- Below the pit probe, center y would need to be both greater than **5.05–6.05 in**
  (depending on wall inset) and less than **2.95 in**. That straight cardinal gap is
  empty for the baseline square.
- Above the pit probe, straight passage needs center y>15.05 in; the phase caps
  center y at 16 in. A full-spin circumradius gives a sufficient clearance threshold
  y>17.121 in from the probe top, outside that phase. This is not a necessary
  condition for every partial turn/lateral location, nor a physical-impossibility
  proof. The connected cardinal searches remain exhausted at both tested grids.

## Contract audit and hardening

All 18 previously completed empty-control plans pass their **486 constant-pose**
contract checks. Perturbed expected anchors are shifted with the route so the
audit tests phase/gate adherence rather than exact nominal localization. Element
shifts do not change center-based contract checks; docking and physical clearance
remain separate evidence. This is finite perturbation coverage, not drift safety.

Fixed a generic planner bug: edge caching now respects direction. A custom policy
can accept A→B and reject B→A without reverse-cache contamination. Added malformed
route-template checks and first-limiting-variant diagnostic helpers.

`/workspace/ieee/ieee/tools/route-progress-v3.js` introduces an **optional experimental
strict partition-crossing policy**, with next-gate, last-strict-side and contact-span
state included in search keys. It rejects crossing the next gate's partition
outside its span, gate-line sliding out of span, reverse crossings and oscillation.
Co-located upper/lower gates are handled without requiring both at once.

This policy is deliberately NOT silently substituted for the existing finite-gate
contract or wired into full mission planning. It is validated on synthetic detour
fixtures and audits the completed empty controls. The fixed original phase/leg
template is still used in the 48 diagnostic experiments. No official lap state,
three-lap mission, phase-transition optimizer or tire/flag/dwell behavior exists.

## Validation and limits

Node v24.18.1: **65 passed, 0 failed, 0 skipped**. New tests cover directional caches,
bounded diagnostics, budget/frontier distinction, malformed experiments/templates,
uncertainty evidence, explicit checks of accepted shortcut edges, gate bypass,
contact sliding, oscillation, and search with progress state.

48 generated SVGs show region/gates, start/goal footprints, bounded expansions,
representative rejection locations and any found leg. Local headless Chromium
rendered the actual upper recovered-path and pit failed-search SVGs for visual
inspection. Other views are machine-checked, not all visually inspected.

`/workspace/ieee/ieee/tools/verify-planner-diagnostics-v3.js` checks current recorded
input hashes, historical input/artifact preservation, all SVGs/summary, recomputed
complete-route perturbation evaluations and the 486 pose-contract audit cases.

No higher-resolution claim, alternate region, new motion primitive or broader
staging optimization was introduced. Next engineering gate: clarify actual
obstacle geometry/placement and contract boundaries; then compare explicitly named
transition/staging or motion alternatives with full-route perturbation checks.
Do not enlarge a region, reduce uncertainty or move a task anchor silently.