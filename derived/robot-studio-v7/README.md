# Robot Studio v7 — Order A mule from vendor CAD (November 1, 2026)

Open `/workspace/ieee/ieee/share/Robot-Studio-v7.html` in a browser that supports WebGL. It is one offline file (4.3 MB).

The studio renders the Order A drivetrain mule from **Pololu's own CAD models** of every powered or rolling part on the parts list, and places it on the GM2 V3 field. Agent-built visualization for the owner's hobby/learning project. The shapes are vendor geometry; the surface finishes are chosen to match product photos, not measured; the drive is a kinematic illustration.

## What is exact and what is not

| Item | Source | Status |
|---|---|---|
| #4754 gearmotor with encoder | Pololu STEP `37d-gearmotor-50-70-encoder.step` (one model covers 50:1 and 70:1) | Vendor CAD |
| #1995 machined bracket | Pololu STEP `1995-machined-bracket.step` | Vendor CAD |
| #1083 hub (6 mm, #4-40) | Pololu STEP, archived 2026-11-01 | Vendor CAD |
| #1430 wheel 80 × 10 mm, black | Pololu STEP (from `pololu-wheel-80x10mm.zip`), archived 2026-11-01 | Vendor CAD |
| #953 ball caster | Pololu STEP `953-ball-caster.step` | Vendor CAD |
| Spare tire | Organizer `Spare Tire v2.stl` | Organizer CAD |
| Deck, screws, risers | Mule kit dimensions (`drivetrain-mule-v4.json`) and this package's measurements | Built from dimensions |
| Field base, white paint, walls, dividers | V3 drawing callouts and the project layout (`derived/constrained-field-v3/layout.json`) | Built from dimensions; wall and divider heights assume nominal lumber on edge |
| AprilTag | Exact 41h12 bit patterns decoded from the organizer sheet | Pattern exact; mount position assumed |
| Flag tower, toy cars, checker tape size | Not dimensioned in GM2 V3 | Approximate stand-ins |

Every part has a provenance badge in the studio's parts panel. Click a part to see its source file, SHA-256 prefix, triangle count and measured size.

## What the vendor CAD showed about the mule kit

`tools/robot-studio-v7-parts.py` measures the CAD and writes `assembly.json`. Four results disagree with the mule kit in `derived/drivetrain-mule-v4/`, which treated the gearmotor's output shaft as centered on the gearbox.

| Quantity | Vendor CAD / Pololu drawing | Mule kit |
|---|---|---|
| Output shaft position | **7.0 mm off the gearbox center**; Pololu's drawing also gives 7.0 | Centered |
| Shaft height above the #1995 bracket's mounting edge | **25.4 mm** (shaft away from the deck) or **11.4 mm** (toward it). The gearbox center is 18.4 mm up, and the slot that clears the shaft boss runs perpendicular to the edge. | 18.4 mm |
| Bracket tapped holes | **3.25 mm** outboard of the gearbox face, mid-thickness of the 6.5 mm bracket (±77.25 mm from center) | Drill template puts them at the face (±74 mm) |
| Wheel position with stock hub and wheel | Hub collar inboard, flange flush with the 22 mm shaft tip, wheel's flat face on the flange: **wheel center 101 mm, track 202 mm, overall width 212 mm** | Wheel center 88 mm, track 176 mm |

What follows from these, for 80 mm wheels:

- **Built exactly as drawn** (deck top 21.6 mm, shaft up), the axle sits at 47 mm and the **drive wheels hang 7.09 mm above the floor**, so the mule rests on its casters. Shaft down instead leaves the casters hanging about 7 mm instead.
- **Shaft up with the deck top at 14.6 mm** leaves too little room for under-deck casters (9.6 mm below a 5 mm deck against a 13.5 mm caster). With the casters mounted through the deck, the balls clear the floor by 1.08 mm, so the mule rocks slightly fore and aft.
- **Shaft down with the deck top at 28.6 mm**, a 6.91 mm printed riser under each caster and the kit's 1/8 in spacer gives 0.00 mm contact. This is the studio's default view.
- **The 160 mm deck is too narrow** for the measured hole positions: about 1 mm of plastic outside each Ø3.4 hole, with the bracket overhanging the edge by 0.5 mm. The corrected layouts use a proposed 172 mm deck.
- **The 176 mm track** is also used by the v5 and v6 simulators. It should become about 202 mm, or the wheel stack needs a shorter shaft engagement, which is a machining choice.

These are geometric results from vendor CAD and drawings, not measurements of received parts. Check them with calipers at receipt (E02A) before printing a deck. The kit's sealed files were not changed.

## Rendering

- three.js 0.170.0 (MIT; license header kept in the bundle), bundled with esbuild 0.24.0.
- Physically based materials: bead-blasted and machined aluminum, steel, chrome ball, silicone tire, FR-4 encoder board, printed PLA with layer lines, matte field paint, laminated tag clear-coat.
- Image-based studio lighting with a key light, 4096-pixel soft shadows and ACES tone mapping.
- The mule drives an illustrative two-segment path: start box, laps 1–2 around the cars, a 4 s stop in the assigned pit box with an in-place turn, lap 3, then park. Wheel rotation follows differential-drive kinematics and the measured 202 mm track.
- The drive is not the v5 dynamics model and not a legal-lap plan. The mule has no tire mechanism, and the drive is disabled for the kit-as-drawn assembly.

## Rebuild and check

```
uv run --no-project --python 3.12 --with cascadio==0.1.1 --with trimesh==5.2.0 --with numpy --with scipy \
    --with networkx python -I tools/robot-studio-v7-parts.py
(cd ~/.cache/ieee-studio-v7-build && npm install three@0.170.0 esbuild@0.24.0)
node tools/build-robot-studio-v7.js
node tools/verify-robot-studio-v7.js
```

URL parameters for screenshots: `?view=hero|motor|wheel|caster|contact|field|top|follow`, `config=kit-as-drawn|shaft-up|shaft-down`, `t=<seconds of match>`, `tag=1|2|3`, `panels=0`.

`browser-validation.json` records six headless-Chromium renders of the final build: SwiftShader WebGL over `file://`, zero page console or uncaught errors, and screenshots inspected and hashed. Clicking, keyboard focus and real-GPU frame rate were not checked.

## Not established

- Received-part dimensions and tolerances; real surface finishes and colors.
- Whether the team keeps the mule kit's deck concept. The corrections above are options for the owner, not selected designs.
- Field details GM2 V3 doesn't give: tower and flag geometry, tag height, car models, checker tape size, wall mounting.
