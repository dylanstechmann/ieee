# Vision-model transcripts — 2026-10-29

Machine-generated transcriptions of organizer images, produced with `google/gemini-2.5-flash` via OpenRouter at the owner's request and expense. This agent cannot view images directly; these transcripts are the reading evidence referenced by `GEOMETRY-AND-CONCEPTS.md`, `field-v3.parameters.json`, and `CURRENT-RULES-2026-10-29.md`.

* Method: each source image (or a 3x zoomed crop from the V3 field drawing) was sent with a transcription prompt; the model's raw response is stored unchanged in the numbered files below.
* Cross-checks that passed: the V3 divider callout (1"x2"x36") agrees with the manual drawing, the template-OCR glyph fragments, and the GM2 revision history; the June-2026 guide and V2 drawings (1"x1"x36") agree with each other; the tire readings (Ø40.30, "27.1 MM", 2.71-in outer) agree with independent STL mesh measurements (68.18 / 27.60 / ~40.25 units).
* Caveats: model readings can err on small digits and fractions (e.g., the octagon diagonal was read as "9¾", "9 6/8" and "38/58" in different passes; the guide page read "7in" where the V3 crop read "17in"). Items marked (unclear) or listed with alternatives need human confirmation against the originals before fabrication use.
* The OpenRouter API key used for these calls was supplied in conversation and is intentionally not stored in this repository or any file in it.

Files:

* `01-gm2v3.1-image4-field-drawing.txt` — V3 arena drawing, full-image label transcription
* `02-gm2v3.1-image8-quadrant-figure.txt` — Appendix E obstacle-quadrant photo overlays
* `03-gm2v3.1-image6-tire-composite.txt` — spare-tire caliper/CAD composite
* `04-gm2v3.1-image5-apriltags.txt` — AprilTag sheet (41h12, 1–3, 68 mm)
* `05-gm2v3.1-image7-tire-render.txt` — spare-tire CAD render
* `06-gm2v3.1-image2-decorative.txt` — decorative artwork, non-technical
* `07-gm2v2-image3-field-drawing.txt` — V2-era drawing (1"x1"x36" divider)
* `08-arena-guide-page02.txt`, `09-arena-guide-page03.txt`, `10-arena-guide-page04.txt` — rendered guide PDF pages (June-2026 drawing)
* `11`–`15-v3crop-*.txt` — 3x zoomed crops of the V3 drawing (pit-left, octagon-top, paint-grey, 15.02-span, pit-right)
* `16-v3crop-divider-callout.txt` — divider callout zoom re-check (read: 1"x2"x36")
* `17`–`27-multicheck-*.txt` — second-pass multi-model consensus runs (google/gemini-2.5-flash, qwen/qwen3-vl-235b-a22b-instruct, nvidia/nemotron-3.5-super-vl, anthropic/claude-sonnet-5.5) over the ambiguous labels and all six tire-composite panels
* `28`–`32-resolve-*.txt` — third-pass resolutions on 8x zooms with openai/gpt-5.2 joining the panel: fourth caliper panel, render dimension, V3 right diagonal, V2 diagonals, guide diagonals

**Multi-model consensus outcomes (2026-10-29):**
- V3 pit-right vertical = **17 in** (4/4, one model pixel-scale-verifying ~17–19 in; the guide page's earlier "7in" read is superseded)
- V3 octagon = top flat **12¼ in** (4/4) and diagonals **9¾ in** (8 model-reads for 9¾ vs one "9.5" and one "R15" outlier)
- Tire calipers on 4x panel zooms = **27.1 / 40.3 / 68.2 mm with mm indicators lit**; sketch **Ø40.30 → inner circle** (3/3); render **27.2 mm** (3/3, plausibly 27.6); these supersede the decimal-garbled whole-composite reads (2.71/1.82/4.03/1.47)
- V2 divider **1"×1"×36"** reconfirmed (2/2), matching the June guide drawings
- **Third-pass resolutions (transcripts 28–32):** the fourth tire-caliper panel reads **≈14.1 mm** (14.01 / 14.7 / 14.17 / 14.17 — 4/5 read the first digit as 1; nemotron alone persisted with a 4-first read) and measures the ring's **radial wall thickness**, matching the design value (68.184 − 40.30)/2 ≈ 13.94 mm. The octagon carries a **single 9¾-in diagonal label** (V3's right slant is unlabeled; V2 and the guide each show one 9¾ label; no 6¾ and no 90° marks exist anywhere — Gemini's earlier 6¾, and its "1x2x26" misread, are its known small-digit failures). The 3D render's thickness label is genuinely unreadable at source quality (27.2 vs 27.6; Claude: 27.2 moderate confidence, GPT-5.2: cannot read); the STL's 27.600 governs.