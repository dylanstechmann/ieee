# Field geometry, tire study and concept tradeoffs

Agent-assisted preliminary analysis, 2026-10-29. This is not verified Fusion geometry, manufacturing advice, or a rules ruling. See `field-v3.parameters.json` for a proposed coordinate frame and explicitly null unresolved parameters. Source priority is current official rules and Q&A over the supporting field model.

## What is actually established

| Item | Evidence | Limitation |
|---|---|---|
| Nominal board | 96 × 48 in, 23/32-in sheathing, GM2 V3 §3.2 | Nominal sheet; installed wall geometry not derived. |
| Center divider | `derived/GM2-V3.1/media/image4.JPG` labels 1 × 2 × 36 in | Actual lumber cross-section, orientation and placement require native CAD and physical confirmation. Older V2 drawing says 1 × 1. |
| Track and pit | V3 figure shows start area, 3 pit boxes, center divider and checkered transitions | Drawing labels are not enough to unambiguously recover all polygons or clearance. |
| Obstacles | GM2 V3 §3.1: three; Appendix E describes 16-in quadrants | Exact coordinate rectangles and obstacle dimensions not established here. |
| Setup tolerance | GM2 V3 G02 ±1 in positional tolerance | Stress-test element locations without assuming every feature may independently vary by this amount. |
| Tire outer extent | Organizer STL: 68.184 × 27.600 × 68.192 model units; 5,380 triangles, Y axis thickness | STL has no units. Dimensions are mesh bounding-box extents, not fitted diameter or manufacturing dimensions. |
| Tire hole | Mesh vertex radial sampling at the flat end gives a minimum radius near 20.15 model units about X=Z=0 | This suggests a roughly 40.3-unit bore at sampled vertices, but is **not a clearance-certified minimum bore**: mesh facets, axial profile, printing and deformation matter. Nominal center assumption unverified. |

### Reproducible tire cross sections

Run `node /workspace/ieee/ieee/tools/inspect-tire-stl.js '/workspace/ieee/ieee/derived/organizer-cad/Spare Tire v2.stl'`. The input SHA-256 is `e04ac6ac4874902f0aa7a4383f738e04d0f0b0b88f553b85f008d66de448e2df`. At the seven sampled Y planes (1%, 10%, 25%, 50%, 75%, 90%, 99% of thickness), the minimum intersection-vertex radii about the bounding-box center are approximately 20.141, 20.136, 20.130, 20.127, 20.131, 20.137 and 21.671 model units. Maximum sampled radii are approximately 32.738, 34.108, 34.108, 34.108, 34.108, 34.080 and 31.162. These are discrete edge-intersection samples, not fitted circles or a continuous minimum clearance; the center is estimated from X/Z bounds. The 99% slice may reflect top-face details or mesh features, so it should not be treated as a full bore dimension. The model's rounded outer edge is consistent with the smaller outer radii near its ends; only native CAD can establish the design radii and units.

### Obstacle placement text

GM2 V3 Appendix E states four equal quadrants, each 16 in wide, starting 2 in from the side rail and ending 2 in from the center rail. In the longitudinal direction each extends 16 in from an end of the center rail, with 4 in between. This text is recorded as written: its orientation, measurement reference surfaces and interaction with the current drawing need confirmation before converting it to coordinates. Three obstacles are specified by §3.1; four quadrants does not imply four obstacles.

The checked STL is `derived/organizer-cad/Spare Tire v2.stl`. Use it as a shape reference only until the native CAD file is opened and a printed part is measured. **Correction of record (2026-10-29):** an earlier revision of this file claimed caliper readings of "approximately 27.11 and 40.3" in the Appendix D composite image. Those numbers were never actually read from the image — this agent cannot view images directly, and the values were pattern-matched from mesh measurements. They are withdrawn. A multi-model vision pass on 4× panel zooms of `derived/GM2-V3.1/media/image6.png` (2026-10-29; transcripts 20–25 in `derived/vision-transcripts/2026-10-29/`) reads the composite as: caliper displays **27.1** (top-left), **40.3** (top-middle) and **68.2** (top-right) with the **mm indicator lit**, a CAD sketch callout **Ø40.30 pointing to the inner circle** (3/3 unanimous), and a 3D render dimension **27.2 mm** (3/3; plausibly 27.6 misread). A fourth caliper panel was settled by an 8× re-read with five models (transcript 28): it displays **≈14.1 mm** (14.01 / 14.7 / 14.17 / 14.17 — 4/5 read the first digit as 1; nemotron alone persisted with a 4-first read) and measures the ring's **radial wall thickness**, matching the design value (68.184 − 40.30)/2 ≈ 13.94 mm. (The earlier whole-composite pass misread these displays as 2.71/1.82/4.03/1.47 — decimal-garbled low-resolution reads, superseded.) Together with the STL mesh extents (68.184 × 27.600 × 68.192 units; sampled bore ≈ 40.25), the readings triangulate the design: **outer ≈ 68.18 mm (caliper 68.2), thickness = 27.60 mm (caliper 27.1, render 27.2), bore = Ø40.30 mm (caliper 40.3)** — and with lit mm indicators on multiple panels, **STL model units = millimetres** is confirmed, not merely suggested. This remains model-and-image evidence, not an organizer statement; printed TPU tolerances are still unmeasured. (The 3D render's thickness label reads 27.2 mm at best reading but is too small to resolve 2-vs-6; the STL's 27.600 governs.) Companion images: `image7.JPG` is a CAD render of the same ring with "IEEE" embossed on its top face; `image2.png` is decorative artwork, not technical content.

The `.f3d` files are ZIP containers, but most members — including every BREP and OGS mesh blob and the embedded previews — use a ZIP compression method ("method 93") that neither Python's `zipfile` nor Info-ZIP can decode in this environment; only trivial stored configuration members (2-byte JSON `{}`) are readable. A ZIP listing is therefore not a dimensional inspection, local extraction is blocked without a newer archive tool, and Fusion-compatible geometry has not been opened/exported. Blender connectivity was confirmed but no Blender scene was changed and Blender cannot directly validate Fusion geometry merely by opening the STL.

### Vision-transcribed callouts (2026-10-29)

Transcripts with prompts and model provenance are in `derived/vision-transcripts/2026-10-29/` (machine-generated readings via google/gemini-2.5-flash, cross-checked against the revision history, the V2 drawing and the rendered guide PDF where possible; small digits and fractions still merit human confirmation).

**V3 field drawing (`derived/GM2-V3.1/media/image4.JPG`)**, labels as transcribed:

* Board and racecourse: **48 in**, **68 in**, **28 in**; side wall callout **1"×4"×96"**; **Paint Grey** (walls) and **Paint Black** (background areas) callouts.
* Octagonal track marking: top flat **12¼ in** (4/4 unanimous), vertical sides **36¾ in**, diagonals **9¾ in** (multi-model consensus: 4/4 on the octagon crop, 2/4 on the extreme zoom — one "9.5" and one "R15" outlier — and 2/2 on the V2 drawing), **15 in** offset near the top.
* Center divider: length **36** with callout **1"×2"×36"** — the V3-specific change; the June-2026 guide drawing and the V2 drawing both show **1"×1"×36"**, and GM2's revision history records the drawing replacement.
* Pit area: three **12 in** boxes with **3 in** gaps, edge spans **6½ in** and **1½ in**, pit divider **1"×1"×16"**, transition spans **15 in** and **15.02 in**, and a right-edge cluster **2 in / 17 in / 12 in / 6½ in** around the checkered start/finish transition (the 17-in vertical is a 4/4 multi-model read, one model pixel-scale-verifying ~17–19 in).
* **Apriltag** / **Apriltags** callouts at the pit edge; title block (June drawing family): "2027 IEEE SouthEast-Con Field Assembled", created by D'Jhan Cooper (spelling uncertain), 6/12/2026, sheet 1/2.

**AprilTags (`image5.jpg`, shared by V2 and V3.1):** tag family **41h12**, tags numbered **1, 2, 3**, each **68 mm**. This corrects the earlier "~4 × 4 in" rough estimate: the tag square is 68 mm ≈ 2.68 in. Appendix G's die-roll assignment (tags 1/2/3 ↔ pit boxes 1/2/3) is consistent with three numbered tags.

**Obstacle quadrants (`image8.tmp`):** a PowerPoint screenshot of a **photograph of the physical course model**, with orange rectangular overlays labeled **Quadrant 1–4** — two quadrants per lane either side of the center divider, toy vehicles placed inside quadrant boxes, and no dimension text in the figure. It visually confirms Appendix E's two-lane arrangement; Appendix E's 16-in/2-in/4-in text remains the dimensional source.

**Spare tire:** multi-model consensus (see the correction above) — calipers **68.2 / 27.1 / 40.3 mm** with mm indicators lit, sketch **Ø40.30 → inner circle** (3/3), render **27.2 mm** (3/3); STL mesh 68.184 / 27.600 / bore ≈ 40.25 → units are **millimetres**; outer ≈ 68.18 mm, thickness = 27.60 mm, bore = Ø40.30 mm nominal.

### Original guide rendered and compared

The archived, hash-checked PDF was rendered in full (22 pages) with PDFium, using a temporary `uv` environment. Reproduce with `uv run --no-project --with pypdfium2 --with pillow python /workspace/ieee/ieee/tools/render-arena-guide.py`; images are in `derived/arena-guide-pages/`. This guide is supplemental and its drawing is dated June 12, 2026; it predates the September V3 revision.

| Source and location | Observation | V3 comparison / confidence |
|---|---|---|
| Guide pp. 3–4 | Drawing calls out 48 in width, 68 in racecourse and 28 in pit length; center board 1 × 1 × 36 in; pit divider 1 × 1 × 16 in. | V3 drawing (`derived/GM2-V3.1/media/image4.JPG`) shows 48, 68 and 28 and 1 × 1 × 16, but changes center board callout to **1 × 2 × 36**. Drawing labels are nominal, not measured installed lumber. |
| Guide pp. 3–4 | Three pit boxes labeled 12 in, separated by 3 in, with checkered openings around a 16-in divider; 15 in callout at one opening. | V3 drawing also depicts 12-in boxes and 3-in gaps; the other opening is labeled 15.02 in. Do not treat these callouts as verified unobstructed clearances without resolving which surfaces the extensions measure. |
| Guide p. 11 | Plush vehicle dimensions approximately 8.55 × 8.2 × 4.5 in, attributed to guide's selected toy. | Supplemental estimate, not measured sample, manufacturing tolerance, or a license to fix all obstacle shapes; V3 specifies three obstacles. |
| Guide p. 12 | Approximately 4 × 4 in AprilTags shown on the walls at start and pits. | Supplemental estimate and layout illustration; tag family, exact size, pose and placement remain unverified against official physical field. |
| Guide pp. 9–10, 13 | Flag tower is a prototype; guide asserts a two-second stop for tire exchange. | Do not promote prototype or old stop wording to V3 rules. V3 start action and pit stop interpretation require Q&A. |

The guide's image and V3 drawing clarify the overall arrangement, but they do not establish an exact 3D model, actual stock thickness, minimum lane clearance, or all marking endpoints. In particular, using nominal drawing sizes as precise physical wall locations would invent tolerances.

### Approximate drawing layout

`drawing-layout-v3.json` contains manually selected pixel coordinates from the V3 field illustration. `node /workspace/ieee/ieee/tools/render-drawing-layout.js` transforms them into `derived/drawing-layout-v3/layout.json` and `layout.svg`, using the illustrated outside board corners as a 96 × 48 in rectangle. The coordinate system has x=0 at the pit end, x=96 at the race end, and y increasing from left to right in the source image. The SVG is a top-view illustration, not a collision model: gray outlines are markings, orange lines are divider axes, and wall and divider thicknesses are not modeled. Three decimals in the generated JSON are for reproducibility, **not measurement precision**.

The image-based trace places the three pit markings approximately at x=1–13 in and y=3–15, 18–30, and 33–45 in; the start box at x=14–26, y=33–45; and the center-divider axis at approximately x=44–80, y=24. These are image-derived estimates, not verified measurement endpoints. Compare to the explicitly labeled 12 in box width, 3 in gaps, 36 in center divider, and 28/68 in pit/race split. Raster size, line width, picking uncertainty, board edge interpretation, nominal stock, and distortion are not quantified. No clearance calculation or field build should use these as measured truth.

### Dimension-constrained planning layout

`constrained-field-v3.json` separates named dimensions from trace-based or interpretive assumptions. Generate `derived/constrained-field-v3/layout.svg` and `layout.json` by running `node /workspace/ieee/ieee/tools/constrained-field-v3.js` after the trace generator. This model enforces board 96 × 48, pit/race lengths 28 + 68, pit-box widths 12 and gaps 3, and divider-axis lengths 36 and 16 inches. The pit-box origins and center divider position are traced estimates; treating pit-box depth and start box as 12-inch squares and the 16-inch divider axis as centered on x=28 are explicit assumptions. The oval-like track is still the unconstrained raster trace, shown dashed yellow. The model validates box bounds and the assumed split but is not a complete constraint solver or a collision model.

Important unresolved conflict: the drawing labels opposite pit-transition spans 15 and 15.02 in and a 16-in divider, whereas 15 + 16 + 15.02 = 46.02 in, not the 48-in outside width. The span endpoints appear related to inside wall faces, but their exact reference surfaces and rounding are not sufficiently verified. No wall thickness is derived by dividing this remainder, and the drawing callouts are not represented as confirmed passage clearances. The center-divider stock callout (1 × 2) is likewise not converted into an exact installed cross-section. Confirm all of these using Fusion and the physical field before fabrication or clearance analysis.

### Fusion extraction investigation

Both `.f3d` archives were listed: each contains Fusion-specific design blobs, `.smb`/`.smbh` BREP entries and OGS scene mesh blobs, but **no embedded STEP, STL, OBJ, or IGES**. No FreeCAD or Assimp executable was found on the system. Merely extracting the proprietary blobs does not yield a verified, unit-bearing CAD model; no conversion was achieved here. The separate organizer tire STL is usable for dimensionless mesh sampling, not for confirming Fusion's unit scale. A Fusion-capable installation must open each archive and export STEP with units and a dimensioned drawing; compare its center divider with the V3 manual because the arena file may predate that revision.

**Evidence requested from a Fusion-capable operator:** open each archived `.f3d` in Fusion, export a STEP for each without changing geometry, and supply screenshots or a dimensioned drawing identifying the document units, tire outer diameter, thickness and bore, as well as the field's board, actual divider cross-section and locations. Record the source `.f3d` names and any import/export warnings. A STEP file alone may encode geometry units but will not necessarily preserve design history, named parameters or evidence of the unit settings; retain screenshots and originals too. We have not performed or verified this export.

## Engineering concepts to test, not selections

| Concept | Potential benefit | Risks / discriminating experiment |
|---|---|---|
| Differential drive, fixed chassis | Simple turn-in-place control and common drivetrains | Tire scrub and turning envelope near obstacles; test a full-footprint mockup against measured lanes and both turn directions. |
| Steering-based chassis | Potentially smoother rolling turns | Turning radius and reversing may constrain pit entry and obstacle passage; measure swept footprint on the actual field. |
| Passive release + guided tire capture | Fewer powered moving parts | Sensitive to alignment, tire orientation and TPU friction; bench-test varied placement and 50+ trials, recording all attempts. |
| Active gripper or capture mechanism | Can accommodate a wider range of poses | Adds volume, weight, power, potential jams and compliance risks; compare against passive mechanism with identical placements. |
| Camera + wheel odometry + local range sensing | Complementary tag recognition and obstacle clearance | Sensitive to lighting, surface slip and field geometry; quantify missed detections, drift and false-start rate. Sensor legality and details need current Q&A. |

Do not pick a chassis based on nominal lane width alone: calculate the full swept envelope of the minimum-size robot and its tire-handling mechanism after field dimensions and obstacle positions are verified. Keep robot footprint, obstacle poses, wall/marking geometry and tire contact properties parameterized.

## Score tool

Run `node /workspace/ieee/ieee/tools/score-v3.js /workspace/ieee/ieee/examples/score-v3-full.json`; run tests with `node --test /workspace/ieee/ieee/tests/score-v3.test.js`. Inputs are **already-adjudicated credits**, not sensor events or legality determinations. A user must only mark laps actually completed and clean, verify distinct tire identity and retention, final parking, publicity applicability, and time conditions. `finishSeconds` is null if no eligible finish, otherwise 0–180 seconds; the 165-second speed threshold is strict. Red Card sets the match score to zero. Non-assigned tire credit assumes the caller has decided the location is eligible; table and Appendix G differ. The tool intentionally does not resolve these uncertainties or infer scoring from raw geometry.

## Next evidence gates

1. Open the organizer `.f3d` files in Fusion (local extraction is blocked by their "method 93" ZIP compression) and export dimensioned geometry with units and named features; compare with the V3 drawing and physical stock.
2. Record the endpoints of the 15/15.02-in transition spans against physical wall faces. All small-digit ambiguities are settled by multi-model consensus: octagon diagonals 9¾ (single label, symmetric), the 17-in right-edge span, the 12¼-in top flat, tire mm units, and the fourth caliper's ≈14.1-mm wall read; only the render label's 27.2-vs-27.6 digit remains unreadable at source quality, with the STL's 27.600 governing.
3. Measure a physical TPU tire and obstacle car; identify tolerances, friction and deformation under actual loads, and check the 68 mm AprilTag print size on the real field.
4. Confirm AprilTag poses (magnetic pit attachment per the guide legend) and obstacle placement coordinates against official Q&A and the physical field.
5. Obtain official Q&A for flag operation, pit exchange/retention, parking, enclosure, and lower-body minimum. A provisional scoring tool is not a referee.