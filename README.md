# IEEE 2027 hardware competition

> **Robot Studio v7 (November 1, 2026):** open `/workspace/ieee/ieee/share/Robot-Studio-v7.html` (private page: <https://claude.ai/artifact/Ux6aG1Vkz2i4yW4avsNGhs>). It renders the Order A mule from **Pololu's own CAD** for the motor, bracket, hub, wheel and caster, with physically based materials and studio lighting, on the GM2 V3 field (exact AprilTag bits and the organizer tire STL). It includes an illustrative drive and a provenance badge on every part. Guide: `derived/robot-studio-v7/README.md`; handoff: `SESSION-STATE-2026-11-01.md`.
>
> **The vendor CAD contradicts the mule kit.** The gearmotor's output shaft is 7.0 mm off center, so the kit's 21.6 mm deck would leave the **drive wheels 7.09 mm off the floor**. The bracket holes sit 3.25 mm outboard of the drill template, and stock parts give a **202 mm track, not 176 mm**. Corrected layouts are proposed in the studio; nothing sealed was changed.
>
> **219 tests pass on Node v24.18.1; 16 of 17 artifact verifiers pass** (planner-diagnostics: known stale hash, diagnosed as harmless in the handoff). New verified facts are in `VERIFIED-FACTS-ADDENDUM.md`, because `VERIFIED-FACTS.md` is a pinned input of sealed packages and must not be edited.

> **Team concept input v7 (October 31, 2026):** `/workspace/ieee/ieee/derived/team-brief-v7/TEAM-BRIEF.md` updates the team handout's §4.1 "What / How" table, which was photographed in `/workspace/hardwareCompetition/hardwareCompetition/` and still uses Rev 2.0 scoring, to the V3 manuals. It keeps the team's ideas, adds rule references and answers the margin questions (IR lasers, wireless, garage robot, camera mast). It also adds new rows, best-of-3 strategy, judging rules and eight questions for the official Q&A. Private shareable page: <https://claude.ai/artifact/Wx9GdrpGQKhbB6mRP6C44A>; rebuild it with `tools/build-team-brief-page-v7.py`. Two agent-run packages back the brief:
> - `derived/apriltag-41h12-v7/`: the organizer tags decode as tagStandard41h12 IDs 1–3. OpenCV ArUco has no 41h12. Pose estimation must use the inner 5/9 edge. The package includes a 7,040-detection synthetic range, glare and defocus sweep; sealed, with a verifier.
> - `derived/tournament-v7/`: exact single-match score distributions with best-of-3 and head-to-head statistics; the probabilities are illustrative.
>
> `software/match_logic.py` is a portable, I/O-free reference for the team's start, tag-vote, lap-count, school-flag, pit-budget and auto-stop rows. It has 13 Python unit tests; run them with `uv run --no-project --python 3.12 python -I -m unittest discover -s software`.
>
> **218 tests pass on Node v24.18.1** (202 before this work, plus 16 new). 15 of 16 artifact verifiers pass; `verify-planner-diagnostics-v3.js` still fails on its documented stale `tools/avoidance-v3.js` hash from before this work. No organizer contact, purchases or physical tests.

> **Integration Studio + stopping sensitivity v6.1:** Open `/workspace/ieee/ieee/share/Mule-Integration-Studio-v6.html` directly. Separate workspaces combine 56 selected-motor trajectories, two explicit motor-loss assumptions, all 162 stationary-tire mechanism cases, the organizer tire mesh and conditional electrical footprints. The 168-case report and source audit retain published no-load/max-efficiency discrepancies; neither model matches every source point and their spread is not a confidence bound. Guide: `/workspace/ieee/ieee/derived/integration-studio-v6/README.md`; audit: `/workspace/ieee/ieee/derived/audits/2026-10-31-stopping-v6-prepair/README.md`. **202 tests and 14 relevant artifact verifiers pass on Node v24.18.1.** Direct offline browser evidence covers 486 mechanism-frame and 168 stopping-sample checks with zero JavaScript errors and four recorded WebGL performance warnings. No driver mapping, energy-sink qualification, mechanism selection or physical validation.

> **Mechanism-envelope v6:** `/workspace/ieee/ieee/derived/mechanism-envelope-v6/README.md` compares three concepts over 162 geometric cases. Self-contained `review.html` provides top/side approach and actuation views. Conflicts and unknowns are retained; no capture/retention validation or mechanism selection.

> **Electrical selection v6:** `/workspace/ieee/ieee/derived/electrical-selection-v6/README.md` contains source-backed electrical requirements, three encoder-rate calculations and twelve conditional driver/power screens. Pico 2 is a provisional controller preference; driver protection and all physical releases remain unresolved. Its historical artifacts are preserved; see the newer mechanism and Integration Studio packages above.

> **Mule Dynamics Studio v5:** Open `/workspace/ieee/ieee/share/Mule-Dynamics-Studio-v5.html` for the offline coupled planar simulation and detailed 3D viewer. It shares 240 Hz motor/traction/control state with telemetry and plots, covers 324 variant/scenario cases plus 48 seeded sensitivity runs, and retains explicit synthetic assumptions. Selection/interface ledger: `/workspace/ieee/ieee/derived/mule-dynamics-v5/selection-requirements.md`. Not calibrated physics, a final BOM or physical validation.
>
> **Bench readiness:** `/workspace/ieee/ieee/derived/drivetrain-mule-v4/bench-readiness.md` defines receipt, provisional bench-setup approval, characterization and commissioning gates. Blank equipment/session/fit records and provenance-aware logs support auditable attempts; `--progress` reports incomplete work without issuing passes. No setup, fabrication or hardware validation is approved.

> **Mechanism geometry-prototype kit, October 31, 2026:** `/workspace/ieee/ieee/derived/mechanism-prototyping-v3/README.md` contains three bore-alignment gauges, a passive-fork test coupon and nine true-scale E04 alignment sheets. All four generated meshes pass closed-manifold/degenerate/volume checks; SVGs were visually inspected. These are low-force geometry coupons, not validated mechanisms or production CAD. **159 project tests pass on Node v24.18.1.**
>
> **Hardware engineering package:** `/workspace/ieee/ieee/derived/hardware-development-v3/README.md` contains tested drivetrain calculations, eight component-selection gates, three tire-mechanism alternatives and six repeatable experiments. At the labeled 4 kg scenario the output-side screen is 76.4 loaded RPM and 0.138 N·m per side; this is not a selected motor or mass estimate. Start with `owner-input.md`. No final competition parts are selected, purchased or physically tested; the reversible Order A mule baseline is below.
>
> **Selected Order A baseline:** `/workspace/ieee/ieee/derived/order-a-procurement-v4/README.md` selects two Pololu #4754 70:1 units for the digital mule, retaining 50:1/100:1 alternatives. Required parts are **$177.25 before shipping, tax and unpriced consumables**, with 22 hashed source records, datasheets and motor/bracket/caster STEP models. FAU access and a $500–$1,000 budget are planning assumptions; no parts are ordered or physically validated.
>
> **Mule build kit + Mule Studio:** `/workspace/ieee/ieee/derived/drivetrain-mule-v4/README.md` contains the nominal 190 × 160 × 5 mm deck, true-scale drill template, closed STL blank, 18 motor/wheel/support configurations and blank E02/E03 logs. Open `/workspace/ieee/ieee/share/Mule-Studio-v4.html` for the interactive offline 3D variant viewer. Browser evidence covers 75 default scene meshes, 12 conceptual leads, substitution warnings and zero JavaScript errors. Nothing is printed, ordered or physically tested.
>
> **Hardware Studio v0.4:** Open `/workspace/ieee/ieee/share/Robot-Lab-v4.html` directly in a WebGL-capable browser. The offline upgrade adds detailed material/shadow-rendered hardware, 23 inspectable cable meshes across 11 connectors, wiring/labels/X-ray layers, close-up cameras and live motor/electrical telemetry with a modeled E-stop. These are candidate form-factor proxies and an illustrative electrical observer—not vendor-certified parts, a released BOM, production wiring or calibrated physics. Guide: `/workspace/ieee/ieee/robot-lab-v4/README.md`. Direct `file://` rendering and the full interaction matrix pass. V3 remains preserved.
>
> **Confirmation packet:** `/workspace/ieee/ieee/derived/confirmation-packet-v3/README.md` contains the reviewed Q1–Q3 wording, annotated route diagrams, seven unsent organizer question groups and an unresolved evidence ledger. The owner reported finding nothing new on Discord; no organizer answer or permission is inferred. Handoff: `/workspace/ieee/ieee/SESSION-STATE-2026-10-31.md`.

> **Navigation experiment, October 30, 2026:** `/workspace/ieee/ieee/SESSION-STATE-2026-10-30.md` and `/workspace/ieee/ieee/derived/connected-navigation-v3/README.md` record agent-run grid-alignment and connected-pit comparisons for this hobby/learning project. Original-region pit-blocker searches still fail; explicitly experimental north access passes 387/387 enumerated cases when planned with variant-aware checks, but official access legality and actual obstacle geometry remain unresolved. Nominal shortcuts can reduce robustness even on empty controls. **73 tests pass; no hardware qualification or purchase.** Archived obstacle audit: `/workspace/ieee/ieee/OBSTACLE-REFERENCE-2026-10-30.md`.

> **Preliminary engineering work:** See [GEOMETRY-AND-CONCEPTS.md](GEOMETRY-AND-CONCEPTS.md), `field-v3.parameters.json`, and the tested provisional score calculator under `tools/score-v3.js`. The archived arena guide has been rendered, and organizer images were transcribed with a vision model on 2026-10-29 (see `derived/vision-transcripts/2026-10-29/`), confirming the V3 1×2×36 divider callout, 41h12/68 mm AprilTags, and millimetre-scale tire evidence. Unknown endpoints remain unset and the native Fusion model has not been opened.

> **Updated October 29, 2026:** The organizer now links V3 manuals. Start with [CURRENT-RULES-2026-10-29.md](CURRENT-RULES-2026-10-29.md). The V2 scoring totals and references further down this file are historical and must not be used as the current score model. The original V3 manuals, field CAD archive, and tire STL archive are in `sources/organizer-2026-10-29/`.

> **Session handoff (2026-10-29):** [SESSION-STATE-2026-10-29.md](SESSION-STATE-2026-10-29.md) records verified findings, open items, tooling notes, and ranked resume steps for continuing after a context reset. Quick-reference numbers: [VERIFIED-FACTS.md](VERIFIED-FACTS.md). Strategy baseline: [STRATEGY-AND-ARCHITECTURE.md](STRATEGY-AND-ARCHITECTURE.md).

> **Source review, October 29, 2026:** See [REFERENCE-BASELINE.md](REFERENCE-BASELINE.md) and [PHOTO-INVENTORY.md](PHOTO-INVENTORY.md) for source-backed V2 details and unresolved differences with the user-supplied GM2 extract. The plan and deadlines below date from October 8 and have not been updated to establish present status. Current official rules and Q&A have not been independently verified in this review. The source review and derived extraction were AI-assisted.

**Mission: win first place in the selected 2027 hardware competition category.**

**Open the website:** [Road to Daytona](https://ieee-road-to-daytona-2027.noble-robin-5115.chatgpt.site). It presents the backcast, winner research, scoring priorities and build/test program without needing to read these files.

This project starts with backcasting: define the winning outcome, identify what must be true immediately before it, and work backward to actions that can begin today.

Prepared **October 8, 2026**. Working assumption: **IEEE SoutheastCon 2027, Stock Car Race**, in Daytona Beach, Florida. The conference runs April 15–18; the organizer currently schedules hardware rounds for April 17 and the final that evening. There are **27 weeks until the conference opens**. [Official competition information](https://ieeesoutheastcon.org/student-competitions/).

The user has not yet confirmed the competition, school/team, Main versus Open category, resources, or existing robot. These are planning assumptions, not established facts. Winning remains a future outcome; this folder contains the plan for pursuing it.

## Start here

### Sampled navigation study (October 29, 2026)

**Failure diagnostics (October 30):**
`/workspace/ieee/ieee/derived/planner-diagnostics-v3/README.md` documents fixed-contract
2/1-in grid comparisons, bounded search rejection evidence and experimental
progress-state checks. One nominal upper-route recovery is not uncertainty-robust;
pit approaches remain unresolved. Prior artifacts are preserved.

**Provisional route contract (October 30):**
`/workspace/ieee/ieee/derived/contract-navigation-v3/README.md` records ordered
phase/gate restrictions, bounded staging candidates, complete baseline failure
diagnosis and enumerated-variant planning. Under that engineering contract the
empty controls pass but blocker searches do not complete; no legal-lap or hardware
qualification is claimed. Run `node tools/contract-navigation-v3.js` from
`/workspace/ieee/ieee` to regenerate.

**Ideal avoidance experiment (October 30):**
`/workspace/ieee/ieee/derived/avoidance-v3/README.md` documents bounded cardinal
forward/reverse/spin planning around hypothetical blockers. Regenerate with
`node tools/avoidance-v3.js` from `/workspace/ieee/ieee`. Nominal detours do not
establish robust navigation or legal lap sequences.

**Packaging/obstacle probes (October 30):**
`/workspace/ieee/ieee/derived/navigation-stress-v3/README.md` explains hypothetical
envelope/obstacle sweeps and nominal between-sample clearance bounds. Run
`node tools/navigation-stress-v3.js` from `/workspace/ieee/ieee`. These are fixed-route
sensitivity tests, not measured obstacles, avoidance planning, or hardware validation.

**October 30 extension:** `/workspace/ieee/ieee/derived/differential-drive-v3/README.md`
documents connected ideal forward/reverse/spin routes without sideways movement.
Regenerate with `node tools/differential-drive-v3.js` from `/workspace/ieee/ieee`.
These remain obstacle-free sampled geometry checks, not validated hardware or legal
complete missions. Resources/budget: `/workspace/ieee/ieee/RESOURCES-AND-BUDGET.md`.

Agent-built geometric baseline: `/workspace/ieee/ieee/derived/navigation-v3/README.md`.
Run `node tools/navigation-v3.js` from `/workspace/ieee/ieee` to regenerate the JSON
report and SVG paths. Includes rotated footprints, wall interpretations, deterministic
pose errors, one-at-a-time element shifts, and docking overlap. This is obstacle-free
by default, allows sideways translation, and is neither hardware validation nor an
official interpretation of markings or parking rules.

1. Read [BACKCAST.md](BACKCAST.md) for the backward chain, dated gates, winning strategy, and first week.
2. Read [RULES-AND-SOURCES.md](RULES-AND-SOURCES.md) before committing to dimensions, mechanisms, or scoring assumptions.
3. Use [EXECUTION.md](EXECUTION.md) to run experiments, review risks, and record evidence.
4. Consult the archived [official manuals and arena guide](sources/) alongside the current organizer page and official Q&A.

## Strategy

Under the currently posted V2 rules, reliable completion of every scoring task has much greater value than small speed gains. Build a legal robot that repeatedly completes clean laps, the assigned pit stop, a genuine tire exchange, the final-lap flag action, and the assigned finish. Optimize speed after the complete mission works on varied fields.

Current V2 has **345 nominal fixed robot-task points**, another **10 publicity points** subject to confirmation of how they apply, and a time bonus. Those figures are an engineering baseline, not a prediction of the winning score. The organizer has announced possible changes but explicitly says to continue using V2 until revised rules are published.

## First commitment

By **October 15**, identify the category and team lead, obtain official Q&A access, inventory resources, reserve recurring field time, set a budget, and start a physical pit/tire experiment. By **October 22**, have a usable practice field and evidence that the highest-risk tasks are feasible.

The first deadline is an experiment and a decision, not a polished chassis.
