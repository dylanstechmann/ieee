# Vendor-CAD Robot Studio v7 and mule-kit geometry findings — November 1, 2026

Agent-run work for the owner's hobby/learning project. No purchases, printing or physical measurement.

## Scope correction

The owner clarified that the request "improve what's in my hardwareCompetition folder" meant this `ieee` folder. The October 31 work (team brief v7, AprilTag check, tournament model, `software/match_logic.py`) was already here. The only file outside this folder is a pointer `README.md` in `/workspace/hardwareCompetition/hardwareCompetition/`. The owner may want it removed; it has not been removed.

The owner then asked for simulations that look more realistic and detailed, with parts that look exactly like the parts list.

## Delivered

### Robot Studio v7

`share/Robot-Studio-v7.html` is one offline file, also published privately at <https://claude.ai/artifact/Ux6aG1Vkz2i4yW4avsNGhs>; guide in `derived/robot-studio-v7/README.md`.

- **Vendor CAD for every powered or rolling Order A part.** The #4754 motor, #1995 bracket and #953 caster use STEP files archived on October 31. The #1083 hub and #1430 wheel STEP files were downloaded today from pololu.com into `sources/hardware-2026-11-01/pololu/`, with a manifest of URLs, retrieval times and SHA-256 hashes.
- **Conversion and measurement:** `tools/robot-studio-v7-parts.py` (cascadio 0.1.1 / trimesh 5.2.0) produces the meshes plus `parts.json` and `assembly.json`.
- **Rendering:** three.js 0.170.0 with physically based materials, image-based lighting and soft shadows.
- **Field:** built from V3 callouts and the project layout. It includes the exact AprilTag bits, the organizer tire STL, and approximate stand-ins for the tower, flag and cars.
- **Assemblies:** a selector for three layouts (kit as drawn, shaft up, shaft down).
- **Drive:** an illustrative two-segment drive with differential-drive wheel spin.
- **Parts panel:** provenance badges (vendor CAD, from dimensions, approximate) on every part.
- **Checks:** `tools/verify-robot-studio-v7.js` and `tests/robot-studio-v7.test.js`. Six headless SwiftShader renders of the final build had zero page errors; `browser-validation.json` records the screenshots and their hashes.

### Findings about the mule kit

`derived/drivetrain-mule-v4` treated the output shaft as centered; Pololu's CAD and drawing put it 7.0 mm off center.

| Item | Kit | Vendor CAD |
|---|---|---|
| Shaft height above the #1995 bracket's mounting edge | 18.4 mm | 25.4 mm (shaft up) or 11.4 mm (shaft down) |
| Result if built as drawn (deck top 21.6 mm, shaft up) | — | Drive wheels sit 7.09 mm above the floor |
| Bracket tapped holes (lateral) | ±74 mm | ±77.25 mm; on a 160 mm deck that leaves about 1 mm ligament and the bracket overhangs 0.5 mm |
| Track with stock hub and wheel | 176 mm | 202 mm (overall 212 mm) |

The 176 mm track also feeds the v5 and v6 simulators. Viable corrections:

- **Shaft down:** deck top 28.6 mm with 6.91 mm printed caster risers, giving 0.00 mm caster contact. This is the studio default.
- **Shaft up:** deck top 14.6 mm with casters through the deck, which leaves 1.08 mm of rocking.
- **Either way:** a deck about 172 mm wide.

The sealed mule-kit files were not changed. Treat these results as CAD geometry and confirm them with calipers at receipt (E02A) before printing a deck.

### Planner-diagnostics stale hash, diagnosed

Re-running `runDiagnostics` in memory with current sources reproduces the sealed `report.json` byte-for-byte, apart from its input-hash field, along with `summary.md` and all 48 SVGs. The later `tools/avoidance-v3.js` edit does not affect that package.

Resealing was not done. `derived/connected-navigation-v3/baseline-manifest.json` pins the planner-diagnostics report, so regenerating it would break that verifier and require a cascade of reseals. Leave this to the owner.

## Correction to the October 31 record

On October 31, `VERIFIED-FACTS.md` was edited after the verifiers ran. That file is a pinned input of `hardware-development-v3` and `mechanism-prototyping-v3`, so their verifiers became stale. The "15 of 16 verifiers pass" note held only until that edit.

Fixed today: the file was restored to its original bytes (SHA-256 `874305c7…`, matching both manifests), and the October 31 and November 1 additions moved to `VERIFIED-FACTS-ADDENDUM.md`.

## Validation

- Node v24.18.1: **219 tests passed**, 0 failed.
- All 17 artifact verifiers were run: **16 pass**. `verify-planner-diagnostics-v3.js` fails on its known stale hash (below).
- `node tools/verify-robot-studio-v7.js`: passed.
- `software/` Python tests: 13 passed (run with uv).
- `verify-planner-diagnostics-v3.js`: still fails on the known stale hash, as above.

## Next steps

1. **Owner decisions:** choose shaft-up or shaft-down; approve regenerating the mule kit (deck height and width, hole positions, caster stack) and updating the v5/v6 track from 176 to 202 mm; measure the parts on receipt.
2. **Studio:** use the corrected mule geometry in the dynamics model (v5) so the realistic studio and the physics share one robot. Add the competition robot (10 × 10 in minimum footprint) once its concept is chosen.
3. **README:** restructure it as a current entry point. Its "Strategy" and "First commitment" sections still describe V2 and October 8 plans.
