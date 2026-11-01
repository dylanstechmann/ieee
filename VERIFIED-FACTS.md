# Verified facts — quick reference (RAG-friendly)

One-page index of every number established and how it was verified, as of **2026-10-29**. Evidence base: multi-model vision consensus (gemini-2.5-flash, qwen3-vl-235b-a22b, nemotron-3.5-super-vl, claude-sonnet-5.5, gpt-5.2; transcripts in `derived/vision-transcripts/2026-10-29/`), STL mesh analysis, organizer GM1/GM2 V3 manuals, the rendered June-2026 arena-guide PDF, and template-OCR cross-checks. Anything **not** listed here is not yet verified — see `SESSION-STATE-2026-10-29.md` for open items.

## Field (inches; from the GM2 V3 drawing, cross-checked against the June-2026 guide and V2 drawings)

* Board: **96 × 48 in**, 23/32-in plywood base; racecourse length **68 in**, pit length **28 in**; element placement tolerance **±1 in** (G02).
* Side walls: callout **1"×4"×96"**, painted **grey** (PPG1036-2); background painted **black** (PPG1011-7).
* Center divider: **36 in** long, callout **1"×2"×36" in V3** (changed from 1"×1"×36" in the June-2026/V2 drawings — GM2 revision history confirms the replacement).
* Pit divider: **1"×1"×16"**.
* Pit boxes: **three**, each **12 in** wide, **3-in** gaps, edge spans **6½** and **1½ in**.
* Pit transition spans: **15 in** and **15.02 in**; right-edge cluster **2 / 17 / 12 / 6½ in** at the checkered start/finish transition (17-in verified 4/4 with a pixel-scale check).
* Octagonal track marking: top flat **12¼ in**; long sides **36¾ in**; chamfered corners **9¾ in** (single label, symmetric; no 6¾ exists); **15-in** offset near the racecourse end.
* **Derived pinch zones** (from the verified callouts; labeled assumptions — equal 45° chamfers, marking centered at x≈62, the midpoint of the 68-in race length): top/bottom lanes ≈**10.98 in**, right strip ≈**8.73 in**, left mouth ≈**8.41 in**; all ±1-in placement tolerance plus trace error. Since GM1 V3 mandates a minimum 10×10-in robot, strict outside-the-marking laps are geometrically impossible → the marking is treated as **advisory paint** pending official Q&A. Derivations and consequences: `STRATEGY-AND-ARCHITECTURE.md` §1.
* **3D wall-mounting sweep** (Blender model, assumption-labeled — wall mounting and installed lumber size unverified): with walls inside the 96×48 footprint the clearances shrink by the wall thickness — right strip **7.73 in** (nominal 1-in) / **7.98 in** (actual ¾-in), left mouth to pit-divider face **7.91 in**, top lane **9.91 in** (nominal, i.e. below the 10-in robot minimum) vs **10.16 in** (¾-in) vs **10.91 in** (walls outside). End strips never fit a minimum-legal robot in any scenario; lanes fit only with ¾-in or outside-mounted walls. Checker openings always fit (15.08/14.94 in). Model + renders: `derived/ieee-field-v3/`.
* Obstacle quadrants (Appendix E): **four** quadrants, **16 × 16 in**, **2 in** from side and center rails, **4-in** longitudinal gap; two per lane either side of the divider (photo-confirmed); **three obstacles** placed in lanes.
* AprilTags: family **41h12**, printed size **68 mm**, numbered **1–3**, magnetically attached at the pit wall; die roll maps tag 1/2/3 → pit box 1/2/3 (Appendix G).

## Spare tire (millimetres; organizer STL + Appendix D images)

* Units: **millimetres** — confirmed by lit mm indicators on caliper photos plus a 3-way value match with the STL mesh.
* Outer diameter: **68.18 mm** (STL 68.184; caliper 68.2).
* Axial thickness: **27.60 mm** (STL 27.600; caliper 27.1; render label unreadable 27.2-vs-27.6 — STL governs).
* Bore: **Ø40.30 mm** (CAD sketch callout → inner circle, 3/3; caliper 40.3; STL-sampled 40.25).
* Radial wall: **≈13.94 mm design** ((68.184 − 40.30)/2); printed-part caliper **≈14.1 mm** (4/5 models).
* TPU material; "IEEE" embossed on the top face; **red** = preloaded drop-off tire, **blue** = fresh pickup tire (one of each per match, Appendix G).

## Scoring (GM2 V3 §3.6; calculator `tools/score-v3.js`, tests pass)

* Nominal robot-task max **390** + **10** publicity: enter course 25; finish ≤3 min 100; **<2:45 bonus 30** (strict); green-flag start 10; end in assigned box 15; drop red tire assigned/other **25/12**; pick different blue tire assigned/other **40/20**; no gray-wall contact **15/lap**; no obstacle contact **25/lap**; school flag on final lap 25; publicity contest 10.
* Early start: **−2** plus Yellow Card plus loss of green-start credit. Red Card: match score **0**.
* Three laps; pit stop after lap 1 or 2; **>75% of the robot** in the assigned box for box-credit conditions (§3.3 — measurement method still a Q&A item).

## Robot constraints (GM1 V3)

* Start: **12 × 12 × 12 in** max; minimum **10 × 10 in** footprint for the first **3 in** of height (V2's "may not contract" sentence is absent in V3 — Q&A item); **one robot unit**; **≤12 kg**; **5-s static** after a switch start (referee-controlled start exempt); clearly marked e-stop; power distribution **≤30 V**; no off-robot communication during the match; no strobes or visible-light lasers.

## Still open (do not treat as verified)

* Installed lumber cross-sections and exact marking/tag endpoints — need the Fusion export (method-93 ZIP blocks local extraction) or a physical field.
* Official Q&A: start-flag operation (raise/lower wording conflicts), pit dwell/retention boundaries, parking measurement, publicity applicability, envelope contraction.
* Physical prints: TPU tire tolerances vs design (68.18 / 27.60 / 40.30 / 13.94 mm), 68-mm tags, obstacle toys.

Pointers: full detail in `GEOMETRY-AND-CONCEPTS.md`; rules snapshot `CURRENT-RULES-2026-10-29.md`; parameters `field-v3.parameters.json`; transcripts `derived/vision-transcripts/2026-10-29/`; session log `SESSION-STATE-2026-10-29.md`; scoring tool `tools/score-v3.js`.