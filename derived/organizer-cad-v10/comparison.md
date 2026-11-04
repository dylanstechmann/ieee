# Organizer CAD versus the earlier traced layout

2026-11-03. Agent-run comparison. The traced layout is `derived/constrained-field-v3/layout.json`, from an image trace of the V3 drawing. The CAD is the organizer's June 2026 Fusion file. Neither is a measurement of a built field.

| Feature | Traced x range x y range (in) | CAD x range x y range (in) |
|---|---|---|
| Pit box 1 | 1.017–13.017 x 3.045–15.045 | 1–13 x 3–15 |
| Pit box 2 | 1.017–13.017 x 18.045–30.045 | 1–13 x 18–30 |
| Pit box 3 | 1.017–13.017 x 33.045–45.045 | 1–13 x 33–45 |
| Start box | 14.378–26.378 x 32.918–44.918 | 13.479–25.479 x 33–45 |
| Center divider (traced axis vs CAD body) | 43.87–79.87 x 24.073–24.073 | 44–80 x 23.5–24.5 |
| Pit divider (traced axis vs CAD body) | 28–28 x 16.073–32.073 | 26.479–27.999 x 16.026–31.979 |

## Clearances from the CAD

| Clearance | CAD (in) | Earlier estimate |
|---|---:|---|
| Side corridor, wall face to divider face | 22.5 | about 22 |
| Side lane, wall face to marking outer edge | 10.53 | 10.98 (VERIFIED-FACTS.md) |
| Inner lane, marking inner edge to divider face | 11.071 | — |
| Race end, marking outer edge to end wall face | 6.995 | 8.73 |
| Pit end, pit divider face to marking outer edge | 7.841 | 8.41 |
| Race end, divider end to end wall face | 15 | about 15 |
| Pit end, pit divider face to divider end | 16.001 | about 15.4 |
| Pit openings beside the pit divider | 15.026 and 15.021 | 15 and 15.02 (V3 callouts) |

## What changes

- **Marking.** The marking band is 0.899 in wide, and its chamfers are not 45°. The outer ring runs x 35.84–88.005, y 11.53–36.47.
- **End strips.** Between the marking and the end walls they are narrower than the earlier estimates, so a 10 in robot cannot turn at either end without crossing the marking. Whether that is allowed is QA04.
- **Center divider.** In the CAD it is 1 x 1 x 36 in, while the V3 drawing says 1 x 2 x 36. Both variants stay in `field-v10.json`.
- **Pit divider.** Its race-side face is at x = 28.0, about 0.5 in west of the earlier simulator rectangle (27.5–28.5). The simulator was therefore slightly conservative on the race side.
