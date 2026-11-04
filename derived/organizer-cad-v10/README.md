# Organizer arena CAD, extracted (v10)

November 3, 2026. Agent-run extraction for the owner's hobby/learning project.

**This is CAD geometry from a design file, not a measured field.** The B-rep inside the organizer's Fusion file is dated June 14, 2026, before the V3 manuals; it shows a 1 x 1 x 36 in center divider where the V3 drawing calls out 1 x 2 x 36.

## How it was read

`derived/organizer-cad/2027 IEEE SoutheastCon Arena_Fusion360.f3d` is a ZIP archive whose members use compression method 93 (Zstandard). Earlier notes said it could not be opened here; Node 24's `zlib.zstdDecompressSync` decodes it.

- `tools/f3d-reader.js` reads the archive in memory with size limits and treats it as untrusted data: member names are never used as paths, and nothing from it is executed.
- It tokenizes the ASM binary B-rep ("ASM BinaryFile4", units cm).
- For each body it collects the vertices reachable through the B-rep's pointers.
- `tools/organizer-cad-v10.js` maps the bodies into the project frame:
  - x runs 0–96 in from the pit end;
  - y runs 0–48 in across, with pit box 1 at low y;
  - pit boxes, start box and dividers land within 0.9 in of the earlier traced layout, with no mirroring.
- Field features are identified by body index, and each identification is checked against the body's measured size.

## Outputs

| File | Contents |
|---|---|
| `field-v10.json` | Field geometry in inches, as listed below |
| `comparison.md` | CAD versus the traced layout and the earlier clearance estimates |
| `field-plan.svg` | Plan view |
| `bodies.json` | All 76 bodies with bounding boxes and classification |
| `members.json` | Archive members with hashes, for both `.f3d` files |
| `tire-bodies.json` | The tire file's bodies: sketches and profiles only. Its largest profile is 13.95 x 27.10 mm, against the STL's 27.60 mm thickness. Vertex boxes cannot measure a revolved tire's outside or bore diameter. |
| `preview.png` | The thumbnail stored in the archive |

`field-v10.json` contains:
- board, wall faces, center and pit dividers, pit boxes, start box, checkered band, pit openings;
- the 8 + 8 vertices of the track marking;
- three readings of the obstacle quadrants;
- divider variants;
- clearances.

## Main results

| Clearance | Inches |
|---|---:|
| Wall face to divider face (side corridor) | 22.5 |
| Wall face to marking outer edge (side lane) | 10.53 |
| Marking outer edge to race-end wall | 6.995 |
| Pit divider face to marking outer edge (pit end) | 7.841 |
| Divider end to race-end wall | 15.0 |
| Pit divider face to divider end | 16.0 |
| Pit openings | 15.026 and 15.021 |

- **Walls:** 1 in thick (nominal), 4 in tall, inside the board.
- **Marking:** a band 0.9 in wide. Its chamfers are not 45°.
- **End strips:** both are narrower than a 10 in robot, so turning at the ends crosses the marking. Whether that is allowed is Q&A item QA04.

## Not established

- **Unplaced elements:** an 11 in post sits at the CAD origin with an identity transform, probably an unplaced component such as the flag tower. The AprilTag and start-flag positions are not placed in the B-rep.
- **Dimensions:** actual lumber (3/4 in walls), the V3 1 x 2 divider and the +/-1 in placement tolerance are not reflected here.
- **Obstacle quadrants** are computed from the Appendix E text. The text does not fit the geometry exactly, so three readings are kept (QA03).

## Run

```sh
node tools/organizer-cad-v10.js          # regenerate
node tools/verify-organizer-cad-v10.js   # re-derive from the .f3d bytes and compare
```
