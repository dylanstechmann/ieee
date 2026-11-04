# Practice-field build packet (v10)

2026-11-03 · agent-prepared for the owner's hobby/learning project. **Nothing here has been built or measured.** The geometry comes from the organizer's June 2026 arena CAD (`derived/organizer-cad-v10/`). The method follows the organizer build guide (`sources/SEC-2027-Arena-Build-Guide.pdf`, pages 5–8) and the materials list in GM2 V3 Appendix B.

## Files

| File | Use |
|---|---|
| `materials.csv` | Organizer list, quantities and prices |
| `cut-list.csv` | Wall and divider lengths |
| `coordinates.csv` | Every corner and marking vertex, in inches from the datum |
| `layout-plan.svg` | Plan drawing; for orientation only. Lay out from `coordinates.csv`, not by scaling the drawing. |
| `asbuilt-template.json` | Measurement record. Copy it to `measurements/field-asbuilt-<date>.json` and fill it in. |
| `variation-drills.csv` | +/-1 in placement drills (G02) |

## Cost

The organizer list totals **$182.39**, and it already includes the paint, the green start flag, the checkerboard roll and the official toy-vehicle obstacle set. Brushes, rollers, trays and double-sided tape are extra; the organizer estimates under $35. Prices are archived, not quotes.

## Datum and frame

- **Datum:** the corner of the board at the pit end and the low-y side.
- **x:** along the 96 in edge toward the race end.
- **y:** along the 48 in edge, toward pit box 3 and the start box.
- Measure along the board edges with a tape, square from the edge, and mark in pencil.

## Build steps

1. **Prepare.** Sand and clean the board (guide p. 5).
2. **Paint white first.** Paint the white areas: the marking band, the three pit boxes and the start box. White covers raw wood more easily than dark colors (guide p. 5).
3. **Mark the layout.** When the white is dry, mark the layout in pencil from `coordinates.csv`: the 8 outer and 8 inner marking vertices, the pit boxes and the start box. The CAD marking band is 0.899 in wide. The organizer's own build used 1 in masking tape over white paint (GM2 Appendix B note), so `marking_tape_centerline` gives the tape centerline.
4. **Paint the background.** Mask the white areas with tape and paint the background black. Remove the tape while the paint is still slightly tacky (guide p. 5).
5. **Paint the walls and dividers.** Paint them gray, separately, before installing them (guide p. 5).
6. **Install the walls and dividers.**
   - Fasten the walls flush with the board edges, inside the board. With 1 in CAD walls the inner faces are at y = 1 and 47 and x = 1 and 95; real 3/4 in lumber puts them 1/4 in further out.
   - Place the dividers temporarily with double-sided tape and check them against `coordinates.csv`.
   - Then transfer their positions to the underside, drill pilot holes, and screw up into them from underneath (guide p. 7).
   - For the variation drills, leave the dividers on tape until the drills are done.
7. **Lay the checker strips.** Apply them across both pit openings, x 25–29, cut to the measured opening. The guide measures the 15 in opening between the divider and the wall (p. 8); the CAD gives 15.026 and 15.021 in.
8. **Mount the extras.**
   - Print the AprilTag sheet and check the printed size with calipers.
   - Place a start-flag stand-in near the pit divider; the exact mount is open (QA08).
   - Keep the obstacle set beside the field.
9. **Record the as-built field.** Fill in the as-built template: three measurements per item, the instrument, who measured and the date. Add photos. These numbers replace the CAD values in the simulator, as a dated, reviewed change.

## Variation drills (7)

G02 allows each element to sit up to 1 in from its nominal position. `variation-drills.csv` lists shifts to rehearse with temporary mounting, so routes and sensing are tested against more than one field.

## Still open

- **Center divider:** the CAD has 1 x 1 x 36, the V3 drawing 1 x 2 x 36. If using 1 x 2 lumber, record how it is oriented.
- **Marking width:** 0.9 in in CAD, about 1 in with the organizer's masking-tape method.
- **AprilTag and start-flag positions** are not in the CAD (QA02, QA08).
- **Obstacle placement rules** (QA03).
- **Size and storage:** the field is a single 4 x 8 ft sheet. Plan storage before building; the organizer provides practice fields at the event, but a team may not bring its own into the pit area (G00).
