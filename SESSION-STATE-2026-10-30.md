# Navigation extension handoff — October 30, 2026

Agent-built/agent-run personal hobby and learning study, not owner hardware tests.
This extends `/workspace/ieee/ieee/SESSION-STATE-2026-10-29.md`; historical reports
and the 1,029/1,125 avoidance result are preserved, not silently regenerated.

## Implemented

- Froze the 65-test pre-edit baseline and key hashes in
  `/workspace/ieee/ieee/derived/connected-navigation-v3/baseline-manifest.json`.
- Audited archived GM2 narrative, materials hyperlink and Appendix E including the
  `.tmp`-named PNG. Three toy obstacles and four illustrated placement quadrants
  do not specify actual installed vehicle dimensions or legal coordinate polygons.
- Added optional board-referenced grid origins and geometry-derived supplementary
  coordinates to the shared cardinal planner. Existing callers retain old defaults.
- Implemented a separately named connected pit planner with fixed start/dock/end,
  retained race construction, selectable pit construction, per-leg gate progress,
  independent nominal and perturbed contracts, physical interval checks and docking.
- Compared original fixed staging, selectable original regions, and explicitly
  experimental north access. No official permission for north access is asserted.
- Added all-candidate maneuver/evidence tables and a fresh-artifact verifier.

## Results

### Upper-leg alignment: 24 searches

Both board origins without supplements: 12/12 grid exhausted (nominal and variants).
With geometry-derived supplements: all six nominal wall/origin cases found; all
six variant-aware cases grid exhausted. Thus the nominal passage is not dependent
on the accidental wall-offset lattice, but uncertainty still blocks these searches.
These leg experiments do not produce complete upper-blocker mission candidates.

### Full comparisons: 108 route attempts in 36 rows

- **72 complete routes**, **27 grid-exhausted**, **9 endpoint-blocked**. No budget
  exhaustion. Search exhaustion is not proof of physical infeasibility.
- **Empty controls:** all 54 routes complete. For each policy/mode there are 351
  evaluated variants. Original-fixed passes all 351 in either mode. Nominal
  selectable-original-regions has 93/351 physical/interval failures; nominal north
  access has 162/351. Variant-aware versions have zero sampled failures and zero
  unresolved intervals for each policy's 351 cases. All engineering contract audits
  pass. This retains the negative finding that nominal optimization can make an
  empty control less robust, even without changing task poses.
- **Pit blocker / original-fixed or selectable-original-regions:** 0/9 complete
  in either mode for either policy. Each policy/mode's 387 scheduled variants remain
  untested. Freeing pit construction alone did not resolve the original corridor.
- **Pit blocker / experimental north access:** 9/9 complete in each mode. Nominal
  candidates fail 138/387 sampled variants, with 138 unresolved interval cases.
  Variant-aware candidates pass 387/387, all with positive interval bounds and
  unchanged docking >75%; perturbed engineering contracts have zero failures.
  This is conditional success under the north-access engineering assumption and
  the finite enumerated model, not official legality or hardware robustness.

Variant-aware north candidates require approximately 736–905 in of summed absolute
wheel travel, 86–152 in reverse center travel and 12–16 spins depending on dock/wall.
These are ideal kinematic distances/complexity, not time or dynamics estimates.

## Verification and artifacts

`/workspace/ieee/ieee/derived/connected-navigation-v3/README.md` documents exact
reproduction, scope and limitations. The report, summary, 36 SVGs, input hashes and
candidate metrics are separate from earlier studies. Representative original-region
empty control and variant-aware north/blocker SVGs were rendered with local headless
Chromium and visually inspected. Render labels do not claim hardware validation.

The suite `node --test tests/*.test.js` on Node v24.18.1 passes **73 tests, zero
failures/skips**. No packages installed. Linux direct commands, not nested Docker.
`node tools/verify-connected-navigation-v3.js` exits zero after independently
recomputing all 72 complete-route evaluations, checking 36 exact SVGs, candidate
metric tables, frozen reference hashes and archived-source text/image hashes.
System Python lacks standard-library modules here; DOCX extraction instead used
`unzip` plus dependency-free Node XML text matching.

## Remaining work / cautions

1. Get official lap/marking and pit-entry/exit interpretations, actual vehicle
   footprints/orientations/tolerances, rail faces and three-obstacle allocation.
2. The planner still retains race construction waypoints and a specific mouth
   pose; no fully free task/phase planner or alternate docking task was introduced.
3. Required entry/exit events reset at the dock and are audited separately because
   the two opposite gates share one partition. No hidden out-of-order gate bypass.
4. Docking still assumes the original robot pose even though archived Appendix G
   says the robot need not itself enter the pit box for the tire task. Mechanism
   reach/transfer envelopes remain unknown; no relaxed docking claim is made.
5. All obstacles in this study remain hypothetical square probes. No official
   three-car coverage, online rule freshness review, physical test or purchase.
6. No finer headings/curves added: first settle access interpretation and actual
   geometry rather than optimize a provisional mission into apparent success.
7. Historical reports remain valid as archived runs. Shared planner edits make old
   code-hash freshness checks stale; the new verifier separately checks frozen
   report/config preservation and current experiment hashes.