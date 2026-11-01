# Session state and handoff — October 29, 2026 (afternoon/evening pass)

Purpose: compact but complete handoff so work can continue after context compaction. Written by the coding agent (agent-assisted analysis; owner review still required for anything marked human-confirm). The project folder is **not** a git repository, so files on disk are the only state.

## Mission context

IEEE SoutheastCon 2027 hardware competition (Stock Car Race, Daytona Beach, April 2027). This project phase: a source-traceable rules/scoring/field/tire baseline for strategy, CAD, simulation and construction. Current rules snapshot: `CURRENT-RULES-2026-10-29.md` (GM1 V3 + GM2 V3). Historical V2 comparison: `REFERENCE-BASELINE.md` (superseded as rules). The strategy/architecture baseline is done (`STRATEGY-AND-ARCHITECTURE.md`), and the Blender 3D field model is archived in `derived/ieee-field-v3/`. A sampled navigation baseline now exists; drivetrain-constrained maneuvers remain next. Official Discord Q&A is pending. Resource clarification (October 30, 2026): no robot parts; ~$100 is an initial preference, not a hard cap, and exceeding it is acceptable for this one-off experimental device. School lab access is possible but unconfirmed; home tool inventory is unknown. Team and an agreed spending ceiling remain unknown. See `/workspace/ieee/ieee/RESOURCES-AND-BUDGET.md`.

## What this pass accomplished

1. Rendered the archived arena build guide PDF (22 pages) to `derived/arena-guide-pages/` (hash-checked input; renderer `tools/render-arena-guide.py`, run with `uv --with pypdfium2 --with pillow`).
2. Built a pixel-trace layout (`drawing-layout-v3.json` → `derived/drawing-layout-v3/`), then a dimension-constrained layout (`constrained-field-v3.json` → `derived/constrained-field-v3/`), each with tests.
3. Established that the `.f3d` Fusion archives use ZIP **"method 93"** compression that Python `zipfile` and Info-ZIP cannot decode — local extraction is blocked; only 2-byte stored config members are readable. Native Fusion geometry remains unopened.
4. Transcribed all key organizer images with a vision model (OpenRouter, `google/gemini-2.5-flash`, owner-supplied key used only via environment variable — verified absent from all repo files). Raw transcripts + provenance: `derived/vision-transcripts/2026-10-29/` (16 files + README). Reusable tool: `tools/vision-transcribe.py`.
5. Corrected the record: an earlier fabricated "caliper 27.11/40.3" reading was withdrawn and replaced with genuinely transcribed values (see `GEOMETRY-AND-CONCEPTS.md`, "Correction of record").
6. Ran a multi-model consensus pass (google/gemini-2.5-flash, qwen/qwen3-vl-235b-a22b-instruct, nvidia/nemotron-3.5-super-vl, anthropic/claude-sonnet-5.5) over every ambiguous label and all six tire panels: settled the octagon diagonal (9¾ in), the 17-in span, the 12¼-in top flat, and mm tire units (calipers 68.2 / 27.1 / 40.3); transcripts 17–27.
7. Ran an 8×-zoom resolution pass (adding openai/gpt-5.2; transcripts 28–32): fourth caliper panel = **≈14.1 mm radial wall thickness** (design 13.94; 4/5 models); octagon = **single 9¾ label, symmetric, no 6¾ anywhere** (Gemini's 6¾ was its known small-digit failure); render 27.2-vs-27.6 genuinely unreadable — STL 27.600 governs. Created `VERIFIED-FACTS.md` as the RAG-friendly quick reference.
8. Ran the strategy/architecture pass: built `tools/strategy-v3.js` (expected-score scenarios + improvement ranking) and `tools/mission-timeline-v3.js` (path/time budget) with 14 new tests (22/22 total), and wrote `STRATEGY-AND-ARCHITECTURE.md`. Key findings: neutral EV ≈ 300/390; reliability ranks above every mechanism (+5.00 EV per +0.05 on pFinish); the clock is not the discriminator (default mission 103 s vs 165-s threshold; required cruise ≈ 4.8 in/s); and callout-derived pinch zones (≈11-in lanes, ≈8.4–8.7-in end strips) make strict outside-the-marking laps impossible for a minimum-legal 10×10 robot → marking must be advisory paint (new #1 Q&A question); recommended 10.0-in-wide differential chassis, vertical 3-tine bore grab, reflectance+encoder+tag+ToF sensing, lap-2 pit stop with bail-out.
9. Built the parametric 3D field in Blender (5.1.2 via MCP, runs on the **Windows host**): base 96×48, 1×4 walls inside-mounted per trace evidence (end walls *assumed*), center divider 1×2×36, pit divider 1×1×16, callout-derived octagon marking, checkered 15/15.02-in openings, 3 pit boxes + start box from trace vertices, 4 illustrative 16×16 obstacle quadrants, AprilTag placeholders (poses unverified), two 10×10-in robot-envelope ghosts (lane fit + right-strip pinch), and a tire pair revolved from the real STL's extracted z,r silhouette (OD 68.2 / bore 40.2 / thickness 27.6 mm — matches verified STL extents). Ran the wall-mounting clearance sweep: **end strips never fit a 10-in-minimum robot in any scenario** (right 7.73–8.73 in, left mouth 7.91–8.41 in); **top lane 9.91 in** with nominal 1-in walls inside — 10.16 in with actual ¾-in stock, 10.91 in outside-mounted → wall mounting + installed lumber size became Q&A items #2/#3. Rendered top/three-quarter/pinch-closeup views + saved `field-v3.blend` + model manifest to `C:\Users\AyeBayBay\ieee-field-v3\` (Blender cannot see the container FS — superseded, see item 10).
10. Confirmed the repo is directly visible from the Windows host at `C:\Users\AyeBayBay\Projects\other5\workspace\` (the container `/workspace` is that folder) — re-imported the **real Spare Tire v2 STL** into the field model (replacing the silhouette-revolve pair; extents 68.18 × 27.60 × 68.19 mm verified; red in start box, blue in middle pit box, both lie-flat assumed) and re-rendered all views **directly into the repo** at `derived/ieee-field-v3/`. No more copy handoffs. API quirks learned: `stl_import(global_scale=...)` is silently ineffective in Blender 5.1.2 — scale the object by 0.001 instead; `matrix_world` reads stale until a depsgraph update, so always `view_layer.update()` before verification prints.

## Verified facts (with sources; confidence noted)

| Fact | Value | Source / confidence |
|---|---|---|
| Board divisions | 96 × 48 in; racecourse **68 in**, pit **28 in** | V3 drawing transcription + guide pages; high |
| Side walls | callout **1"×4"×96"**, painted grey (PPG1036-2); background black (PPG1011-7) | transcriptions + BOM; callout ≠ installed size |
| Center divider (V3) | **1"×2"×36"** | Confirmed 4 ways: full-image vision, divider-zoom vision, template-OCR glyph fragments, GM2 revision history; high |
| Center divider (pre-V3) | **1"×1"×36"** | June-2026 guide (pp. 3–4 render) + V2 drawing transcriptions; high — proves the V3 change |
| Pit divider | **1"×1"×16"** | transcriptions; high |
| Pit boxes | three **12 in** boxes, **3 in** gaps, edge spans **6½ / 1½ in** | transcriptions; medium-high (small digits) |
| Pit transition spans | **15 in** and **15.02 in**; right-edge cluster **2 / 17 / 12 / 6½ in** (17-in confirmed 4/4 with a pixel-scale check) | transcriptions + consensus; endpoints/reference surfaces unresolved; note 15+16+15.02 = 46.02 ≠ 48 outside width |
| Octagonal track marking | top flat **12¼ in** (4/4), vertical sides **36¾ in**, diagonals **9¾ in** (consensus), **15 in** offset near top | multi-model consensus 2026-10-29 (transcripts 17/18/26/27) |
| AprilTags | family **41h12**, tags numbered **1–3**, size **68 mm** (≈2.68 in — corrects the guide's ~4×4-in estimate); magnetic attachment per guide legend | `image5.jpg` transcription (image shared with V2); high |
| Tire units | **millimetres (confirmed)**: multi-model panel reads — calipers **27.1 / 40.3 / 68.2 / ≈14.1 mm with mm indicators lit**, sketch **Ø40.30 → inner circle** (3/3), render **27.2 mm** (3/3, STL 27.600 governs); STL mesh 68.184 / 27.600 / bore ≈ 40.25 / wall ≈ 13.94 | consensus evidence; printed tolerances unmeasured |
| Obstacle quadrants | four quadrants, two per lane either side of the center divider; Appendix E text: 16 × 16 in, 2 in from side and center rails, 4 in gap; three obstacles | `image8.tmp` = PowerPoint screenshot of a photo of the physical model with orange Q1–Q4 overlays — visually confirms the arrangement; coordinates still unverified |
| Drawing provenance | "2027 IEEE SouthEast-Con Field Assembled", created by D'Jhan Cooper (spelling uncertain), 6/12/2026, sheet 1/2 | title-block transcriptions (V2 + guide) |
| Scoring (GM2 V3 §3.6) | nominal **390** robot-task points + 10 publicity; strict <2:45 for the 30-pt bonus; calculator `tools/score-v3.js` + tests all pass | manual + tested tool; disputed interpretations still scenario-based |

Open rule questions (unchanged, need official Q&A): start-flag raise/lower contradiction, tire retention/placement wording, pit-stop dwell requirements, >75% parking measurement, publicity applicability, minimum-envelope contraction (V2 sentence absent in V3).

## Files in this repository (state of record)

* `CURRENT-RULES-2026-10-29.md` — current V3 rules snapshot incl. verified geometry section (updated this pass)
* `GEOMETRY-AND-CONCEPTS.md` — master geometry/evidence doc: corrections of record, vision-transcribed callouts, layout models, concepts, gates (updated this pass)
* `field-v3.parameters.json` — parameterized field/tire spec, evidence-dated, nulls where unverified (updated this pass)
* `VERIFIED-FACTS.md` — one-page RAG-friendly quick reference of every verified number with sources and open items
* `STRATEGY-AND-ARCHITECTURE.md` — match-flow reconstruction, pinch-zone geometry, scoring tiers, EV scenarios, timeline feasibility, architecture matrix, risk register, rule-ambiguity dependencies
* `constrained-field-v3.json` + `tools/constrained-field-v3.js` + `derived/constrained-field-v3/` — dimension-constrained planning layout (12-in boxes, 3-in gaps, 28/68 split, 36/16 divider axes) with SVG/JSON output
* `drawing-layout-v3.json` + `tools/render-drawing-layout.js` + `derived/drawing-layout-v3/` — raw pixel-trace layout (illustrative only)
* `tools/score-v3.js`, `tests/score-v3.test.js`, `examples/score-v3-full.json` — provisional V3 scoring calculator (inputs are adjudicated credits, not sensor events)
* `tools/inspect-tire-stl.js` — reproducible STL mesh analysis (5,380 triangles, slices, bore ≈ 40.25 units)
* `tools/render-arena-guide.py` — hash-checked PDF renderer (22 pages)
* `tools/vision-transcribe.py` — OpenRouter vision caller (key from environment only)
* `tools/multimodel-vision.py` — multi-model vision consensus caller (OpenRouter; key from environment only); used for the 2nd/3rd-pass consensus reads (transcripts 17–32)
* `tools/strategy-v3.js` / `tools/mission-timeline-v3.js` — expected-score and mission-time models (presets, overridable via JSON; 14 new tests)
* `derived/ieee-field-v3/` — Blender field renders (top/three-quarter/right-strip pinch), `field-v3.blend` (real Spare Tire v2 STL imported), `field-v3-model.json` manifest — saved directly from Blender via the host mirror path
* `derived/vision-transcripts/2026-10-29/` — 16 raw transcripts + README with prompts, model, cross-checks, caveats
* `derived/arena-guide-pages/`, `derived/GM2-V3.1/media/`, `derived/GM1-V3/media/`, `derived/GM2-V2/media/`, `derived/organizer-cad/` — rendered/extracted sources
* `sources/manifest.json`, `sources/organizer-2026-10-29/manifest.json` — archived originals with SHA-256
* `README.md`, `RULES-AND-SOURCES.md`, `BACKCAST.md`, `EXECUTION.md`, `PHOTO-INVENTORY.md` — navigation and older plans (older plans are not evidence of completed work)

## Environment and tooling notes (saves rediscovery)

* Use **`uv run --no-project --with pypdfium2 --with pillow python ...`** for imaging/PDF work — the uv Python is complete. The **system `python3` has a broken stdlib** (no `shutil`, no `ctypes`); avoid it.
* No `pdftoppm`/`gs`/`mutool`/FreeCAD/assimp installed; `unzip` lists but **cannot extract method-93 members**.
* Vision API: OpenRouter works (`google/gemini-2.5-flash` used; `nvidia/nemotron-3.5-super-vl` also available for second opinions). Pass the key as an env var inline per command; **never write it to any file** (verified clean).
* V3 drawing zoom crops used (×3 LANCZOS): pit-left (0,690,230,764), pit-right (370,555,475,764), octagon-top (150,55,380,170), paint-grey (0,180,135,275), 15.02-span (320,485,470,545), divider (290,248,412,298).
* Terminal quirks: `run_commands` output capture is flaky — **redirect to /tmp files, then `cat`/`sed` or `read_files`**; `read_files` returns "[outdated]" on re-reads — print via `sed -n` instead. Commands must stay **under ~12,000 chars** (long heredocs get truncated). Plan mode blocks `mkdir`/`sed -i` but allows `cat > /tmp/...` redirection. Editor tool quirk: editing an **existing** file requires `old_text` (a marker comment like `<!-- __X__ -->` makes chunked appends reliable); single edits are capped ~6,000 chars. `search_codebase` can time out — prefer `grep` via `run_commands`.
* Blender MCP specifics: Blender 5.1.2 runs on the **Windows host**, and the repo is directly visible at `C:\Users\AyeBayBay\Projects\other5\workspace\...` — save renders/blends **directly into the repo** through that mirror path. API quirks: `stl_import(global_scale=...)` silently ignored (scale the object 0.001 instead); `matrix_world`/`dimensions` stale until `view_layer.update()`; `read_files` on the PNGs fails in some model contexts (no image input) — the owner is the visual check for renders. The addon's viewport screenshot (`look`) fails host-side ("Screenshot file was not created") — verify geometry numerically via bounds prints instead.
* Ephemeral /tmp tools from this pass (recreate if needed): `/tmp/imgtool.py` (ASCII region/label renderer), `/tmp/ocrtool4.py` (template OCR with box/rotate/line-removal), `/tmp/vcall.py` (superseded by `tools/vision-transcribe.py`), `/tmp/multimodel.py` (preserved as `tools/multimodel-vision.py`).
* Blender MCP was connected but untouched; no scene changes. Not a git repo — no commits exist.

## How to resume (ranked next steps)

**Diagnostic follow-up (October 30):** See
`/workspace/ieee/ieee/derived/planner-diagnostics-v3/README.md` and `summary.md`.
48 fixed-contract failed-leg searches at 2/1-in grids: 1 nominal recovery (upper,
inside-¾-in wall, 1-in grid), 6 endpoint blocks, 41 grid exhaustion, no budget stops.
Recovered leg extends to three routes, each failing 28/43 perturbations; not robust.
Pit searches still fail. All 486 constant-pose contract checks for prior completed
empty controls pass. Directional edge-cache bug fixed; optional progress-aware
search mechanism/strict-partition experimental audit added but NOT adopted as an
official or full-mission contract. Original reports preserved. 65 tests pass.
Next: real obstacle/Q&A geometry and explicit transition/motion alternatives; no
physical infeasibility claim, relaxed uncertainty, purchases or hardware validation.

**Contract update (October 30, 2026):** New
`/workspace/ieee/ieee/tools/contract-navigation-v3.js` and
`/workspace/ieee/ieee/route-contract-v3.json` define provisional center-region phases,
three ordered spatial gates, and bounded pit staging x=18/16/15-in candidates.
Modes: constrained nominal and constrained enumerated-variant interval checks.
Artifacts/limitations: `/workspace/ieee/ieee/derived/contract-navigation-v3/README.md`.
Each mode completes 9/27 routes (empty control only); 351/1,125 scheduled sampled
cases pass and 774 are untested due to search failure, not observed contacts.
Upper-blocker searches grid-exhaust on leg 4; pit-blocker leg 12. Variant-aware
pit x=18 is endpoint-blocked; x=16/15 still grid-exhaust. All historical blocker
detours fail this engineering contract, not an official legality adjudication.
Historical complete ledger: 96/1,125 failures = 24 center-divider + 33 pit-divider +
39 obstacle first collisions. Baseline SHA retained; older artifacts not overwritten.
Corrected strategy's "marking must be advisory" claim. Next: review restrictive
region/gate assumptions and actual obstacle placements/Q&A before expanding the
motion set or modifying fixed checkpoints. No purchases, hardware or physical tests.
Validation: Node v24.18.1; 56 passed, 0 failed, 0 skipped. Verified 18 SVGs,
18 completed route evaluations/contracts, summary and full 96-entry baseline ledger.

**Avoidance update (October 30, 2026):** Added bounded cardinal grid planning in
`/workspace/ieee/ieee/tools/avoidance-v3.js`, settings in
`/workspace/ieee/ieee/avoidance-v3.json`, results/limits in
`/workspace/ieee/ieee/derived/avoidance-v3/README.md`. All 27 nominal combinations
produce forward/reverse/spin paths with preserved ordered checkpoint poses,
remapped docking index, and positive interval clearance bounds >0.05 in. Sampled
uncertainty: 1,029/1,125 pass; 96 fail. Baseline 10x10 only; hypothetical blockers;
no full mission, hardware or official obstacle verification. Planner has no lane-side
or lap-state constraints, so geometric detours can be mission-illegal. Grid/budget
failures are explicitly not physical infeasibility claims. Next: lap/lane constraints,
actual geometry measurements, and justified uncertainty-aware planning. No purchases.
Latest full suite: Node v24.18.1, 50 passed / 0 failed / 0 skipped; 27 nominal
route artifacts and nine SVGs checked against current code and inputs.

**Packaging/obstacle stress update (October 30, 2026):** Added
`/workspace/ieee/ieee/tools/navigation-stress-v3.js`, configurable hypothetical
envelope/layout probes in `/workspace/ieee/ieee/navigation-stress-v3.json`, and nine
new tests. Results and limits: `/workspace/ieee/ieee/derived/navigation-stress-v3/README.md`.
Matrix: 16 combinations, 144 nominal route/wall checks, 6,048 sampled uncertainty
cases. Empty-control stress passes: 10x10 = 351/351; 12x10 = 195/351; 10x12 = 216/351;
12x12 = 60/351. Larger centered rectangles conservatively enclose hypothetical
one-sided extensions, not measured mechanisms. Both blocker probes collide with
every fixed nominal route; avoidance is unimplemented. All nominal 10x10 baseline
intervals have positive geometric separation bounds (worst lower bound ~0.762 in),
but uncertainty paths remain sampled only (worst sampled baseline ~0.262 in).
No new physical measurements, legality decisions, purchases, or drivetrain selection.
Latest full suite: Node v24.18.1, 44 passed / 0 failed / 0 skipped.
Next: obtain measured obstacle/placement and mechanism extents; model actual outlines
and deployment; add drivetrain-feasible avoidance before hardware selection.

**Differential-drive update (October 30, 2026):** Connected ideal forward/reverse/spin
routes now live in `/workspace/ieee/ieee/tools/differential-drive-v3.js` with provisional
inputs in `/workspace/ieee/ieee/differential-drive-v3.json`. Artifacts and full limits:
`/workspace/ieee/ieee/derived/differential-drive-v3/README.md`. Nine nominal combinations
and 351 enumerated stress cases pass on the obstacle-free baseline; worst sampled
clearance is 0.262 in. No actual drivetrain or mechanism is qualified. Next: measured
obstacle cases and mechanism-inclusive footprint variants before component selection.

**Resources update (October 30, 2026):** School-lab, home-supported, and hybrid
options are documented in `/workspace/ieee/ieee/RESOURCES-AND-BUDGET.md`. Confirm access
and inventory before pricing a bill of materials. No purchases or new spending
ceiling were authorized; the earlier illustrative $100 allocation is not a BOM.

**Navigation update (2026-10-29):** Agent added `/workspace/ieee/ieee/tools/navigation-v3.js`,
`/workspace/ieee/ieee/navigation-v3.json`, and tests. Artifacts and limitations are in
`/workspace/ieee/ieee/derived/navigation-v3/`. The obstacle-free original loop (x=38-in
return) collides under a 1-in center-divider shift; x=36-in return is a candidate
improvement. Routes allow sideways translation and are not drivetrain-feasible or
mission-legality validation. Next simulator work is measured obstacle cases and
drivetrain-constrained connected maneuvers, after the relevant hardware/Q&A inputs.
Earlier statements that the marking "must be advisory" are an inference, not an
organizer ruling; keep the markings-excluded model conditional.

1. **Check on real hardware**: AprilTag 68-mm print size, TPU tire tolerances vs design (68.18 / 27.60 / 40.30 / 13.94 mm), obstacle-toy size, installed wall/divider stock. All drawing-label ambiguities are now settled by multi-model consensus (9¾ single-label diagonals, 17-in span, 12¼ top flat, mm units, ≈14.1-mm wall read); the only unreadable item is the render's 27.2-vs-27.6 digit, with the STL's 27.600 governing.
2. **Fusion path**: open the two `.f3d` files in Fusion (method-93 blocks local extraction), or in a later act-mode pass try a method-93-capable archive tool; export STEP + dimensioned drawings; reconcile divider/walls/pit geometry and tire units with the transcribed callouts.
3. **Official Q&A** (Discord): flag operation, tire retention/exchange boundaries, pit dwell, parking measurement, publicity, envelope contraction. Keep scenarios parameterized until answered.
4. **Physical measurements**: TPU tire (OD/thickness/bore vs 68.18/27.6/40.3 mm), obstacle toy, wall/divider installed stock, tag poses.
5. **Blender field is done — next build steps** (see `STRATEGY-AND-ARCHITECTURE.md` §9): (a) ✓ done — `derived/ieee-field-v3/` holds the 3 renders, `field-v3.blend` (real Spare Tire v2 STL version), `field-v3-model.json`; (b) 2D waypoint/pit-docking simulator with ±1-in variation — gate numbers now quantified: end strips 7.7–8.7 in never fit a 10-in robot, top lane 9.91–10.91 in depending on wall mounting; (c) bench program (tire-grab pose matrix, reflectance samples, tag detection, taped-lane turning); (d) official Q&A now led by "is the octagon marking advisory?", then "walls inside or outside the 96×48 footprint + actual lumber size?", then ">75% parking measurement"; (e) chassis CAD only after the lane-clearance answers — the 10.0-in width target stands but top-lane fit depends on the wall answers.