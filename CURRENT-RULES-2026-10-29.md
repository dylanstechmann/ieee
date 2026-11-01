# Organizer-linked rules snapshot — October 29, 2026

Agent-assisted review of the organizer student-competitions page on 2026-10-29. The page identifies its current manuals as V3.0 and links `Game-Manual-2027-1-V3.docx` and `Game-Manual-2027-2-V3-1.docx`; the latter filename does not establish a 3.1 rule revision. Its revision table lists 3.0 updates dated September 18 and October 4, 2026. Downloaded originals and SHA-256 hashes are in `sources/organizer-2026-10-29/manifest.json`. Official Discord Q&A was not accessed. Head referee and official Q&A may supersede manual text; recheck before design freeze or competition.

## User-provided extract

The supplied GM2 text matches distinctive passages in the downloaded organizer-linked GM2: the three obstacles, appendices E–G, red/blue tires, 25/40 and 12/20 exchange credit, and flag raise sequence. This strongly identifies the source family but is not a byte-level comparison or proof of the source of the pasted text. The linked document gives the missing scoring table.

## Scoring — GM2 V3 §3.6

| Achievement | Points |
|---|---:|
| Enter course | 25 |
| Cross finish line in 3 minutes or less | 100 |
| Cross finish line in **less than** 2:45 | 30 |
| Start based on green flag | 10 |
| End in assigned pit box | 15 |
| Drop red tire in assigned box / other area | 25 / 12 |
| Pick up a different fresh blue tire in assigned box / other area | 40 / 20 |
| No gray-wall contact / no obstacle contact | 15 / 25 per lap |
| Raise school flag during final lap | 25 |
| Enter publicity contest | 10 |

Maximum nominal **390 robot-task points** assumes all listed robot achievements, the 30-point time bonus, and three clean laps; publicity adds 10 if applicable, for 400. This arithmetic assumes scoring categories can all be combined and does not establish a real match result or decide disputed interpretations. Different-location tire awards are alternatives, not additions. The prior V2 345-point fixed-robot score and per-10-second speed bonus are historical, not V3 scoring.

V3 Appendix G says a red tire is preloaded and a different blue tire acquired; pickup credit is removed if dropped before the finish line, while its sequence says retain it for the remainder of the match. It also says the robot itself need not enter the assigned box to perform the tire exchange, but its sequence says enter the assigned box. The scoring table says an 'area other than' the assigned box; Appendix G says another pit box. Seek Q&A before implementing boundary and retention scoring. G05 imposes Yellow Card and −2 for early start; §3.6 also eliminates green-flag-start credit.

## Significant revision changes and open questions

* **Obstacles:** V3 §3.1 and revision history say three, versus two in V2. Appendix E describes 16-inch quadrants and placement offsets; model and test against the actual official drawing and Q&A.
* **No separate pit-stop or assigned-stop award appears in V3's §3.6 table.** V2's 15+15 pit credits and two-second early-movement reduction should not be carried forward automatically. V3 still requires a pit stop and exchange between laps. Confirm any binding Q&A, dwell or assigned-stop interpretation.
* **Minimum size:** GM1 V3 R01 still says minimum 10 × 10 in for 3 in above the surface, but the explicit V2 sentence 'The Robot may not contract this portion at any time' is absent in the extracted V3 paragraph. Do not silently assert either that contraction is allowed or that the V2 sentence remains binding: ask official Q&A about application throughout the match. Maximum start volume 12 × 12 × 12 in, one robot unit and 12 kg remain in GM1 V3.
* **Start:** V3 §3.1 says flag lowered, whereas §3.4.2 explicitly describes raising the flag to start. Appendix F says details will be provided in Version 3.1. Seek clarification of action, location, motion and timing. V3 GM1 R03 still has a five-second static period for technician switch starts, with its stated exception for referee-controlled starts.
* **Preload size:** GM1 V3 R01 says game elements may extend beyond starting size, while GM2 Appendix G specifies preloaded red tire kept within R01 starting size. These must be interpreted together and clarified; design conservatively.
* **Parking:** GM2 V3 §3.3 uses more than 75% of robot in assigned box at end; what is measured and how finish-line timing relates to final parking remains unclear.
* **Eligibility and publicity:** verify current registration, category, publicity applicability, and official Q&A before using the nominal total as a tournament score.

## Geometry and assets

* `derived/GM2-V3.1/media/image4.JPG` is the downloaded GM2's field drawing. Vision transcription (2026-10-29, `derived/vision-transcripts/2026-10-29/`) confirms its **1"×2"×36"** center-divider callout, **1"×4"×96"** side walls, **1"×1"×16"** pit divider, 48/68/28-in board divisions, 12-in boxes with 3-in gaps, 36¾-in sides, 12¼-in top flat and 9¾-in diagonals (multi-model consensus), 15/15.02-in pit-transition spans with the 17-in right-edge span confirmed 4/4, and Paint Grey/Paint Black callouts. The June-2026 guide and V2 drawings show the earlier **1"×1"×36"** divider. Nominal callouts versus installed lumber sizes remain unresolved.
* AprilTag sheet (`image5.jpg`, shared with V2): family **41h12**, tags numbered **1–3**, **68 mm** square — correcting the earlier ~4×4-in estimate. Appendix G's die-roll assignment maps tags 1/2/3 to pit boxes 1/2/3.
* `derived/organizer-cad/2027 IEEE SoutheastCon Arena_Fusion360.f3d` and `Spare Tire v2.f3d` remain unopened: their members use a ZIP "method 93" compression this environment cannot decode. `Spare Tire v2.stl` (5,380 triangles, extents 68.184 × 27.600 × 68.192) is now confirmed **millimetres** by multi-model panel reads (calipers 68.2 / 27.1 / 40.3 mm with mm indicators lit; sketch Ø40.30 → inner circle, 3/3; render 27.2 mm; mesh bore ≈ 40.25); printed tolerances remain unmeasured. Do not treat this as manufacturing validation.
* The original arena PDF has been rendered and compared with the V3 drawing; see `GEOMETRY-AND-CONCEPTS.md`. GUIDE material is supplemental and represents the June-2026 design (divider 1×1×36).

## Next gates

1. Obtain and archive official Q&A; confirm flag, minimum-envelope behavior, tire exchange/retention, pit stopping, parking and publicity.
2. Open native `.f3d` assets in Fusion (their "method 93" ZIP members block local extraction) and export verified, dimensioned geometry; confirm component placements and drawing dimension endpoints. Human-confirm the vision-transcribed small digits (octagon diagonal, 6½/1½/17/2-in spans, caliper unit mode).
3. Build a versioned score model with strict 2:45 threshold, three per-lap contacts, mutually exclusive tire alternatives, and explicit unresolved parameters. Do not claim an event score until interpretations are settled.
4. Confirm actual team, existing hardware and resources, then update the October 8 backcast and testing dates. No team trials or build completion have been established.