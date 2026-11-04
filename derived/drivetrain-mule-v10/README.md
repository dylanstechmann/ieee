# Drivetrain mule v10: shaft-down deck

2026-11-03 · agent-prepared for the owner's hobby/learning project.

**Nothing here is ordered, printed or tested.** This replaces the v4 kit's deck geometry without changing the sealed v4 package. Pololu's CAD shows the v4 kit as drawn would leave the wheels 7.09 mm off the floor.

## The layout

- The motor's output shaft is 7 mm off the gearbox center. With the shaft pointing **down** in the #1995 bracket, the axle sits 11.4 mm above the bracket's mounting face.
- The bracket sits on top of the deck, so the deck top is 28.6 mm above the floor for 80 mm wheels.
- Printed risers of 6.91 mm under the casters bring the caster balls to the floor.
- The deck is 190 x 172 x 5 mm, 12 mm wider than v4. That keeps a 7.05 mm ligament outside the motor holes at ±77.25 mm (v4 had them at ±74).
- The track is 202 mm, not 176.

The owner delegated the layout choice. Shaft-down was chosen because:
- the casters touch exactly in CAD, where shaft-up leaves 1.08 mm of rocking;
- risers are cheap to reprint after measurement;
- the mule is a test rig, not the competition chassis.

## Files

| File | Contents |
|---|---|
| `geometry.json` | Resolved geometry, holes and checks |
| `fit-report.md` | Stack-up and checks, including one flagged project rule: motor gap 7.8 mm vs 8 mm |
| `deck-drill-template.svg` | True-scale drill template with a 100 mm check bar |
| `cad/` | STEP and STL for the deck and one caster riser, built with CadQuery 2.8.0 (STEP header timestamps normalized) |
| `templates/` | Received parts, E02A inspection (corrected nominals), E02A measurement JSON, fit review; E02 and E03 logs copied unchanged from v4 |

Fill in copies under `measurements/mule/<date>/`, never these templates. Analyze bench logs with `node tools/mule-measurements-v10.js --kind E02|E03 --input FILE --output NEW_FILE [--progress]`.

## Regenerate

```sh
node tools/drivetrain-mule-v10.js --cad        # nominal package; --cad needs uv and CadQuery 2.8.0
node tools/verify-drivetrain-mule-v10.js       # checks text outputs, STL geometry and hashes; no CadQuery needed
```
