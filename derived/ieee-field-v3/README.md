# Blender 3D field model — GM2 V3 (provisional)

Agent-built 2026-10-29 (Cline via Blender MCP on the owner's machine; owner review still
required for anything marked assumed). This is planning support for a student hobby/learning
project — not a rules ruling or construction-grade CAD.

Sources: `../../constrained-field-v3.json`, `../../field-v3.parameters.json`,
`../drawing-layout-v3/layout.json`, organizer `Spare Tire v2.stl` (real mesh imported).

## Contents

- `field-v3-top.png` — orthographic top view of the full 96×48-in layout
- `field-v3-threequarter.png` — three-quarter perspective (wall/divider heights visible)
- `field-v3-rightstrip-pinch.png` — close-up: 10×10-in robot envelope vs the right end strip
- `field-v3.blend` — the model (Blender 5.1); objects named by their dims, organized in
  collections (Field_Base, Field_Walls, Field_Dividers, Field_Markings, Field_Quadrants,
  Field_Tags, Field_Tires, Robot_Envelope)
- `field-v3-model.json` — build manifest + clearance sweep numbers

## Verified vs assumed

Verified dims (see `../../VERIFIED-FACTS.md`): base 96×48; walls 1×4×96 grey; center divider
1×2×36 (V3); pit divider 1×1×16; octagon callouts 12¼/36¾/9¾/15-in; pit boxes 12-in with 3-in
gaps; checker openings 15/15.02; AprilTags 41h12 68 mm; tire 68.18/27.60 mm, bore Ø40.30.

Assumed (flagged in object names): end walls exist (1×4×48); walls inside-mounted at nominal
1-in (trace evidence: pit box at x≈1.017); marking line width 0.5 in; marking centered at
x=62; obstacle-quadrant placements; AprilTag poses; tires lie flat (bore up); envelope
height 6 in.

## Key output — clearance sweep vs the 10-in minimum robot (GM1 V3 R01)

| Clearance | 1-in walls inside | ¾-in walls inside | Walls outside |
|---|---:|---:|---:|
| Bottom lane | 10.05 ✓ | 10.30 ✓ | 11.05 ✓ |
| Top lane | 9.91 ✗ | 10.16 ✓ | 10.91 ✓ |
| Right strip | 7.73 ✗ | 7.98 ✗ | 8.73 ✗ |
| Left mouth | 7.91–8.41 ✗ | ✗ | ✗ |

End strips never fit a minimum-legal robot in any scenario → the octagon marking must be
advisory paint (Q&A #1); wall mounting + installed lumber size are Q&A items #2/#3.