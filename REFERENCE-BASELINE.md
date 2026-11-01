# Source-backed engineering baseline

> **Superseded as current rules:** The organizer's October 29, 2026 page links GM1 V3 and GM2 V3. See `CURRENT-RULES-2026-10-29.md`. Everything below is the archived V2 comparison, not the current scoring or confirmed current rule language.

Agent-assisted source review, 2026-10-29. This is a planning reference, not a competition ruling. The source originals and official Q&A take precedence. Current rules have not been independently checked since the prior 2026-10-08 research. The pasted GM2 in the conversation has no original file, revision, or verified provenance; do not call it a newer official version without evidence.

## Sources and extraction

| ID | Source | Scope / confidence |
|---|---|---|
| GM1-V2 | `sources/Game-Manual-2027-1-V2.docx` | Revision 2.0, 2026-06-15; SHA-256 `9c747cbccc4c46e9f8efb60d4dccedaa59f810eced6078546428b05cc1bd0235` |
| GM2-V2 | `sources/Game-Manual-2027-2-V2.docx` | Revision 2.0, 2026-06-15; SHA-256 `8250af0571814c51598cd959b500b7eda636f2a963e212b58c49df6ce7be0c0c` |
| GUIDE | `sources/SEC-2027-Arena-Build-Guide.pdf` | SHA-256 `82cd41b28fe6ba3f0bae452ea37491fcd551eb922263cef5649a77bec6dc5e4a`; original PDF not rendered here: reviewed photographed slides instead. |
| PHOTOS | `/workspace/hardwareCompetition/hardwareCompetition/` | 40 JPEGs; map in `PHOTO-INVENTORY.md`. Includes GM1 printout, arena guide slides, and team concepts. Handwriting and team concepts are not official rules. |
| CHAT-GM2 | User-supplied text in conversation | Source file, version, and dates unverified; contains material absent from archived V2. Keep separately attributable. |

Run `node /workspace/ieee/ieee/tools/extract-sources.js` to regenerate `derived/GM1-V2-paragraphs.txt`, `derived/GM2-V2-paragraphs.txt`, and embedded media. Text flattens tables and omits headers, drawings, formatting, relationships, and potentially other Word content; consult originals. All 11 media files were extracted. Six standard GM2 images inspected; `.wdp` was extracted but not rendered. GM1 inspection checklist and GM2 scoring/BOM are actual Word tables, not images; this corrects the earlier assumption that the scoring table was only an image.

## Robot and game requirements, archived V2

| ID | Source | Baseline and required evidence |
|---|---|---|
| R01 | GM1 §5.2.1 | Starting maximum 12 × 12 × 12 in; minimum 10 × 10 in for 3 in above surface; that portion may not contract at any time. Expansion after start permitted. Measure every intended start configuration and confirm interpretation at inspection. |
| R01/R02 | GM1 §5.2.1 | One Robot Unit; heaviest configuration ≤12 kg. Inspect all intended mechanisms and decorations. |
| R03/R04 | GM1 §5.2.1 | Manual switch start requires ≥5 s static following command; referee-controlled mechanism is exempt. Clearly marked, accessible emergency stop must halt actions safely and quickly. |
| R05–R12 | GM1 §5.2.1 | Avoid unsafe/sharp materials, uncontained liquids, hydraulics, field damage and launching; remove by hand without tools. Pneumatics subject to 100 psi and inspection. |
| R14–R19 | GM1 §§5.2.2–5.2.4 | Distribution ≤30 V, appropriately rated wiring; visible lasers and strobes prohibited. Onboard computation and autonomy; no off-robot communications during match except game-required exceptions. |
| GM2 §3.4, G02 | GM2-V2 | Three-minute match; random assigned AprilTag and course obstacles; field/game-element positioning tolerance ±1 in. Full setup sequence and post-randomization interactions require clarification. |
| GM2 §3.3 | GM2-V2 | More than 75% of robot must be in the pit spot for both the mandatory pit stop and end-of-race stop; the exact measurement method needs official clarification. CHAT-GM2 describes this criterion for the end of race only. |
| Inspection | GM1 §§6–7, Appendix A | Present all configurations and mechanisms; rehearse inspection, sequestering, battery restrictions and two-minute pre-stage. |

These are excerpts, not a complete safety or legality checklist. See `RULES-AND-SOURCES.md` and original manuals for full conditions.

## Scoring: GM2-V2 §3.6 only

| Achievement | Points / conditions |
|---|---|
| Enter course | 25 |
| Finish three laps by 180 s | 100; check how finish crossing and subsequent final parking interact |
| Time | 1 per full 10 seconds saved below 180; examples 2:54 = 0, 2:49 = 1 |
| Green-flag start | 10; early start removes this credit; G05 adds −2 and Yellow Card |
| Pit stop after lap 1 or 2 | 15, or 10 if moving in under 2 seconds |
| Stop in assigned pit area | 15 |
| Drop tire in pit area | 25 |
| Pick up different fresh tire | 40 |
| End in assigned area | 15 |
| No gray-wall contact / no vehicle contact | 10 / 15 per lap, respectively |
| Raise school flag on last lap | 25 |
| Enter publicity contest | 10; application to match score requires clarification |

Nominal fixed sum: 345 robot points + 10 publicity; time bonus separate. This is not an achieved or guaranteed score. GM2-V2 §3.6 and CHAT-GM2 Appendix G differ in detail; no combined score model is approved. Referee rulings and current Q&A may override the archive.

## Field geometry: evidence, not a finalized CAD model

Primary image: `derived/GM2-V2/media/image3.png` (GM2 field drawing, sheet 1/2). `image4.png` is an overview; `image5.jpg` shows tags labeled `41h12`, IDs 1–3 and `68mm`; `image6.JPG` shows a tire, not a dimensioned tire specification. Actual AprilTag family and printed sizing should be checked against official assets before manufacturing.

| Feature | Recorded value | Source and qualification |
|---|---|---|
| Base | 4 × 8 ft, 23/32 in sheathing | GM2-V2 §3.2 and Appendix B; nominal lumber and actual extents must be distinguished. |
| Overall width | 48 in | GM2-V2 embedded image3, dimension endpoints must be checked in original drawing. |
| Longitudinal labeled sections | 28 in and 68 in | image3; boundary line endpoints need confirmation; do not substitute for a complete coordinate layout. |
| Central divider | 1 × 1 × 36 in label, 36 in length | image3; nominal lumber versus actual cross-section unresolved. |
| Pit divider | 1 × 1 × 16 in label | image3; location, height, and actual thickness require verified drawing. |
| Markings | 12 in boxes, 3 in gaps shown; 15 in and 16 in dimensions also shown | image3; several endpoints and physical-versus-painted boundaries require confirmation before CAD. |
| Obstacles | Plush toy vehicles in arena guide photos | `PHOTO-INVENTORY.md`; dimensions/placement and version applicability require verification. |
| Tolerance | ±1 in positioning | GM2-V2 G02; do not assume this is a tolerance for every material or shape dimension. |

The source drawing also displays values including 36¾ in, 9¾ in and 12½ in; interpretation and attachment points need confirmation, not guessed coordinates. The guide photograph of the full drawing is lower resolution than the embedded image. No native CAD file or spare-tire mesh is present in this source folder. The later chat text mentions 16-in obstacle quadrants and red/blue tires, but those are not established V2 facts.

## Field materials: GM2-V2 Appendix B

1 sheet 23/32-in 4 × 8-ft sheathing; three 1 × 4 × 8-ft furring strips; one 1 × 2 × 8-ft furring strip; two boxes of wood screws; black PPG1011-7, gray PPG1036-2 and white PPG1001-1 paints; checkered adhesive roll; green start flag; toy vehicle obstacle set; masking tape. Double-sided tape, brushes, rollers and trays are separately mentioned. V2 printed total is $182.39; prices are historical and omit the separately estimated supplies. Guide slides use different listed prices and tape descriptions; do not treat them as current purchase quotes or silently combine versions.

## Differences and open gates

1. **Provenance:** obtain the original file matching CHAT-GM2 (revision/date/hash). Its appendices E–G and detailed red/blue tire rules are absent from the extracted archived GM2-V2. Absence from the flattened text alone is not proof of absence from every embedded object; inspect the original Word document too.
2. **Tire scoring:** CHAT-GM2 states 25/40 points in assigned pit, 12/20 in another pit, blue tire retained until crossing; archived V2 §3.6 states 25/40 in pit area without those same detailed conditions. Determine which governs and reconcile with other rules.
3. **Start flag:** CHAT-GM2 introduction says lowered, its match-play sequence says raised. GUIDE photos describe a prototype and say final details will follow. Confirm actual triggering, physical location and applicable revision.
4. **Pit stop and robot position:** GM2-V2 §3.3 specifies more than 75% in the pit spot for both the mandatory pit stop and final stop. CHAT-GM2 Appendix G says the robot need not enter the assigned box for tire exchange; separately confirm whether assigned-stop credit requires robot entry and whether a two-second stop applies.
5. **Field:** obtain native organizer CAD and tire STL; validate sizes, tag family, orientation, obstacle locations, wall thickness, lane clearances and physical field tolerances before fabrication or simulation sign-off.
6. **Competition updates:** review current official manual revisions and Discord Q&A; no current online/Q&A verification was performed in this pass.
7. **Project assumptions:** confirm team/category, resources, build status and field access. October 8 plan's October 15/22 deadlines are past and are not evidence of completion.
8. **Obstacle count:** GM2-V2 §3.1 says two obstacles; CHAT-GM2 says three. Model these as separate scenarios pending authoritative revision confirmation.

Until resolved, keep simulation parameters and score scenarios revision-labeled; avoid presenting inferred behavior, handwritten notes, team ideas or guide slides as binding rules.