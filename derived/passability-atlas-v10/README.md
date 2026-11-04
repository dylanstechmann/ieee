# Passability atlas v10

2026-11-03 · agent-run geometric study for the owner's hobby/learning project.

**Scope.** Perfect knowledge of a nominal field: the organizer CAD from June 2026, in `../organizer-cad-v10/`. The obstacle is the organizer guide's approximate plush vehicle, 8.55 x 8.2 in; the official vehicles are unmeasured. There is no sensing, no control error and no rules ruling.

**Question.** Can a 10 in robot pass the Appendix E obstacles without touching them, keeping 0.25 in clear on each side?

## What it found

1. **Vehicle size decides almost everything.**
   - A single vehicle leaves a 10.5 in gap on one side only when it sits near a quadrant edge.
   - Across every placement on a 0.25 in grid, the share that can be passed without contact ranges from **0% to 47%**, depending on how Appendix E is read and on vehicle yaw. Every reading gives 0% for a vehicle turned 45 degrees (Part A).
   - When both quadrants of a straightaway are occupied, 128–140 of 144 sampled layouts per reading leave no contact-free gap beside at least one vehicle (Part B).
2. **A round base helps only a little.**
   - On straight passes a round and a square 10 in robot are equally wide.
   - To change lanes between two vehicles on opposite sides, the round footprint needed about 0.5 in less free length between them with the vehicles straight (10.5 vs 11.0 in), and about 1.0 in less with them turned 90 degrees (10.8 vs 11.8 in) (Part C, bisection to 0.5 in).
   - In the sampled Part B layouts, the two footprints passed exactly the same cases.
3. **So the decisions are:**
   - **Measure the official obstacle set first.** It is on the organizer's materials list at $35.95. Ask QA03: exact vehicles, whether a vehicle can sit mid-quadrant, orientation, reference faces.
   - **Plan a contact policy.** If contact is unavoidable for some layouts, that lap's 25-point obstacle bonus is lost, but stopping or timing out costs far more. The supervisor should choose the gentlest contact or the cheapest detour by expected points.
   - QA01 (round base) still matters for turning and spinning room, but it matters less for obstacles than earlier notes suggested.

## Files

| File | Contents |
|---|---|
| `summary.md` | Tables for Parts A, B and C |
| `atlas.json` | Every row and case. Part B records how each case was decided: `gap-blocked` (exact), `straight` (exact) or `planned` (hybrid-A* search) |
| `manifest.json` | Input hashes (the stockcar modules, the field, the tool) and output hashes |

## Limits

- The vehicle size is an approximation from the guide, not a measurement.
- Part B samples placements; it is not exhaustive.
- The planner works on a 0.5 in / 15 degree lattice. A "not passable" result from a search means the lattice found no path, not proof that none exists.
- The corridor is the CAD's nominal 22.5 in. A V3 1 x 2 divider or real lumber changes it by a fraction of an inch, and Part A covers those divider variants.

## Run

```sh
uv run --no-project --python 3.12 python -B -I tools/atlas-v10.py   # about 15 minutes
node tools/verify-passability-atlas-v10.js [--reproduce]            # hashes and consistency; --reproduce re-plans a sample
```
