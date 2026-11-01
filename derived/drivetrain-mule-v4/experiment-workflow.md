# Mule measurement and substitution workflow

No physical trials have been performed. Energized tests require suitable supervision, secured fixtures and applicable FAU procedures.

## Readiness gates

Read `bench-readiness.md` and complete the blank equipment/session/fit records. R0 facility/resources → R1 receipt/E02A → R2 approved provisional bench setup → R3 E02B → R4 low-energy commissioning → R5 E03/power review. A provisional bench driver is an approved test-setup choice; the final robot driver remains gated by measured operating and transient evidence. Null setup limits mean blocked.

## E02A — receipt and unpowered baseline

1. Record every SKU, quantity, lot/serial identifier and visible defect in `received-parts.csv`.
2. Measure wheel diameter/width, shaft, bracket hole pattern, hub stack-up and caster height/spacers. Use repeated measurements and actual instrument IDs.
3. Assemble without forcing fits. Confirm the 3.5 mm maximum motor-hole screw engagement, free wheel rotation, deck clearance and both support configurations.
4. Record winding resistance and encoder pinout only with approved equipment. Do not infer driver ratings from stall extrapolation.
5. Complete every applicable row in `E02A-inspection.csv`; blanks and failures remain visible.

## E02B — motor/driver characterization

Use `E02-characterization.csv`. Record actual minimum/nominal/maximum intended bus voltages, driver ID/settings, speed, torque, current and temperature for three runs per motor/operating point after a repeatable warmup. The template has 18 rows and no fabricated voltage values.

Review final driver continuous and peak requirements from measured hot current and separately captured transients; the CSV continuous-current screen cannot establish peak ratings. Do not buy a battery until the bus and load cases are reviewed.

## E03 — support, traction and control matrix

For each support configuration (dual-front-rear, front-only, rear-only), mass (2/4/6 kg) and documented surface:

- 10 straight runs over 1 m; at 4 kg require at least 9/10 with drift ≤ 25 mm and all commanded runs reaching 8 in/s without slip/thermal faults.
- 20 left and 20 right 180-degree spins; median absolute error ≤ 5°.
- Log every attempt, including hot runs, slip, faults and exclusions. `E03-trials.csv` contains 450 blank rows for one surface.

Analyze a completed surface log with:

```sh
node tools/mule-measurements-v4.js --input E03-trials.csv --output E03-summary.json
```

The analyzer refuses incomplete matrices or invented pass verdicts. Every attempted row requires provenance and explicit completed/aborted/excluded status. Retain failures and raw records; see `bench-readiness.md` for replacement and exclusion rules.

For an incomplete log use `node tools/mule-measurements-v4.js --kind E03 --input SESSION.csv --output NEW-progress.json --progress`. Progress never issues a pass or driver screen. Outputs cannot overwrite existing files. Do not store physical observations in generated blank templates.

## Substitution process

Edit `drivetrain-mule-v4.json` or the Order A candidate selection only as a dated revision. Regenerate the gates, clearances, configuration matrix, drawings and costs. Club/FAU preferences and measured substitutions must preserve the prior baseline and its evidence rather than silently rewriting it.
