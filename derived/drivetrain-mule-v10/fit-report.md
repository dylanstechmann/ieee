# Mule v10 fit report (shaft-down)

Basis: vendor-CAD nominal values (no parts measured). **This is arithmetic on CAD values, not a fit check of real parts.**

## Stack-up (heights above the floor, mm)

| Item | Value |
|---|---:|
| Wheel radius = axle height | 40 |
| Shaft above the bracket mounting face (gearbox center 18.4 − offset 7) | 11.4 |
| Deck top (bracket sits on it) | 28.6 |
| Deck bottom | 23.6 |
| Caster riser (printed), exact 6.905 | 6.91 |
| Caster spacer + caster body | 3.175 + 13.52 |
| Caster ball bottom (0 = touching) | -0.005 |

## Lateral (mm from the centerline)

Motor holes ±77.25; wheel center ±101; track 202; overall width 212.

## Checks

| Check | Value (mm) | Limit | Result |
|---|---:|---|---|
| wheel-contact | 0 | axle at wheel radius | pass |
| caster-contact | -0.005 | |value| <= 0.25 | pass |
| riser-positive | 6.91 | > 0 | pass |
| motor-hole-ligament | 7.05 | >= 4 | pass |
| wheel-deck-lateral-clearance | 10 | >= 3 | pass |
| motor-body-gap | 7.8 | >= 8 (project rule) | **flag** |

The motor-body gap is 7.8 mm against the project's own 8 mm rule. The two encoder ends do not touch. Either accept the margin, or move both brackets outward by 0.1 mm, which widens the track to 202.2 mm. That is the mechanical lead's call.

## Before printing

1. Inspect the received parts with calipers (E02A).
2. Copy `templates/e02a-measurements.json` to `measurements/mule/<date>/e02a.json`, fill it in, and run `node tools/drivetrain-mule-v10.js --from-measurements <file> --cad`. This writes a dated revision with a recomputed riser height and holes.
3. Print the drill template at 100% and check the 100 mm bar with calipers.
4. Print one riser and check its height. Typical FDM tolerance (±0.1–0.2 mm) is larger than the computed contact error. Shim with the 1/16 in spacer option if needed.
5. Review screw lengths and engagement (`templates/fit-review.csv`) before assembly.
