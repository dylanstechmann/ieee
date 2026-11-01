# Order A drivetrain mule — selected prototype baseline

**Status: selected for digital prototyping; not ordered, printed, fabricated or physically validated.** This package advances the owner's hobby/learning project while keeping club/FAU substitutions reversible.

## Baseline

- Two Pololu #4754 70:1 12 V 37D encoder gearmotors; 4480 output counts/revolution
- 80 × 10 mm silicone-tired wheels, 6 mm hubs and machined #1995 brackets
- Two #953 metal-ball casters for dual-, front-only and rear-only E03 comparisons
- Required priced Order A subtotal: **$177.25** before shipping, tax and unpriced fixture/consumables
- Deck blank: **190 × 160 × 5 mm**

## Derived nominal geometry

| Check | Value |
|---|---:|
| Wheel track | 176 mm |
| Overall drive width | 186 mm |
| Deck top / bottom Z | 21.6 / 16.6 mm |
| Caster height with 1/8-inch spacer | 16.675 mm |
| Nominal caster contact Z | -0.075 mm |
| Motor-body center gap | 8 mm |
| Wheel/deck lateral clearance | 3 mm |
| Motor-hole edge ligament | 4.3 mm |

The bracket's 18.4 mm shaft-center height and the caster's 13.5 mm body/14.7 mm hole spacing come from archived manufacturer drawings. The 0.075 mm nominal caster preload is rigid arithmetic, not a flatness or traction guarantee.

## Build artifacts

- [Nominal assembly layout](assembly-layout.svg): top and side geometry
- [True-scale deck drill template](deck-drill-template.svg): print at **100% / actual size**, verify the 50 mm line, then check received parts before drilling
- [Motor/wheel comparison](motor-wheel-comparison.svg): all six motor/wheel arithmetic screens
- `stl/mule-deck-blank.stl`: closed, undrilled deck blank; not a released print job
- `configuration-matrix.json`: 18 motor/wheel/support configurations
- `received-parts.csv`, `E02A-inspection.csv`, `E02-characterization.csv`, `E03-trials.csv`: blank physical-evidence logs
- [Experiment workflow](experiment-workflow.md): inspection, measurement and substitution process

## Required hold points

1. Refresh stock and landed price before owner checkout; no order is recorded here.
2. Inspect received motor, bracket, hub, wheel and caster geometry. Confirm screw engagement and the actual hub/wheel stack-up.
3. Do not drill optional ballast marks until a fixture and fasteners are chosen.
4. Complete E02A before driver selection; use E02B/E03 measurements for power and support decisions.
5. Keep the 80 mm mule separate from the existing 3-inch route baseline until a measured configuration is promoted.

## Reproduce

From `/workspace/ieee/ieee`:

```sh
node tools/drivetrain-mule-v4.js
node tools/verify-drivetrain-mule-v4.js
node --test tests/drivetrain-mule-v4.test.js
```

The generator is offline and deterministic. Manufacturer STEP files remain in the source archive; the SVG/STL mule pieces are agent-authored nominal geometry, not vendor-certified or production CAD.

## Bench and fit readiness

Read `bench-readiness.md` before planning energized work. Blank `equipment-readiness.csv`, `session-record.json` and `fit-review.csv` are preparation records, not approvals. Logs use provenance schema revision 2; use `--progress` for incomplete, non-qualifying reports. Keep actual sessions separate from generated templates.
