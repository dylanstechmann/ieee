# Hardware Studio, Order A procurement, mechanism prototypes and confirmation handoff — October 31, 2026

## Latest: team concept input v7 (evening, October 31)

**Trigger.** The owner asked how to improve on `/workspace/hardwareCompetition/hardwareCompetition/`. That folder holds 40 WhatsApp photos from the October 21 team meeting:
- team concept document pp. 5–8, the §4.1 "What / How" table;
- the GM1 **Rev 2.0** printout, with margin notes;
- arena build-guide slides.

The team's table still uses Rev 2.0 scoring. Nothing in this project had been written for the team.

**Delivered (agent-run; no organizer contact, purchases or physical tests):**
- `derived/team-brief-v7/TEAM-BRIEF.md`, plus a private artifact page at <https://claude.ai/artifact/Wx9GdrpGQKhbB6mRP6C44A>; rebuild the HTML with `tools/build-team-brief-page-v7.py` (needs uv with `markdown`).
  - Updates the table row by row to V3, keeping the team's ideas, and lists rows to delete.
  - Answers the margin questions from rule text: R17 IR lasers, R19 radio to the pit, R01 one Robot unit (no garage robot), and camera-mast expansion after the start.
  - Adds sensing facts:
    - white center line, pit boxes and start area on a black floor, with gray walls;
    - walls about 3.5 in and divider about 1.5 in if nominal lumber stands on edge, so a top-mounted 2D LiDAR scans over them (figure `sensor-planes.png`, drawn by `tools/sensor-plane-figure-v7.py`);
    - a 10 × 10 in square base sweeps 14.1 in when spinning, so a round base is proposed as a Q&A item.
  - Covers the best-of-3 qualification format, the 5-page Engineering Portfolio and 10-minute interview rules, and eight Q&A questions.
- `derived/apriltag-41h12-v7/` (`tools/apriltag-41h12-v7.py`):
  - The organizer sheet decodes only as tagStandard41h12 IDs 1–3 (Hamming 0). OpenCV 5.0.0 ArUco has no 41h12 dictionary.
  - The detected quad is 5/9 of the printed pattern. Pose with that edge is within 0.5%; with the printed width it is 1.80× too far.
  - Sweep: 7,040 synthetic detections with zero wrong IDs. Ranges, glare (5% coverage gives 7/24 decodes) and defocus are in the README.
  - pupil-apriltags 1.0.4.post11 segfaults in `Detector.__del__`; the script caches detectors and exits with `os._exit`.
  - Deterministic: two runs gave identical reports. Sealed by `tools/verify-apriltag-41h12-v7.js --seal`.
- `derived/tournament-v7/` (`tools/tournament-v7.js`):
  - Exact phase-chain score distributions, best-of-3 and second-best order statistics, head-to-head odds and break-even pit-stall risk.
  - Illustrative presets: break-even stall 22.8% for a single match versus 49.0% for best-of-3; 41.5% per-match reliability gives 80% for at least one success in three.
  - Ten tests, including an independent Monte Carlo cross-check.
- `tests/team-brief-v7.test.js` fails if the brief's quoted figures drift from the tools or reports, or if the HTML page is stale.
- `software/match_logic.py` plus `software/test_match_logic.py` (13 Python unittest tests, run with uv) and `software/README.md`: an I/O-free state machine.
  - Starts on the flag only after seeing it down and then confirmed up; a missed frame resets the count. A switch start holds still for 5 s.
  - Picks the pit box by tag vote; without a reliable read it uses a fallback box, since an exchange in a wrong box still earns 12 + 20.
  - Counts laps only after 85% of a lap's distance, and ignores crossings around the pit.
  - Raises the school flag when the final lap begins: on leaving the pit if the stop follows lap 2.
  - Runs the exchange with a 20 s budget, one retry and a bail-out; auto-stops at 178 s; latches the e-stop.
  - It has not run on a robot.
- The artifact page was republished once (version 1793486767-9575) after the flag-timing, fallback-box and Q3 edits.

**Validation:** see the README top note for the full-suite count. All 16 artifact verifiers were run. Fifteen pass, including the new AprilTag verifier. `verify-planner-diagnostics-v3.js` still fails on its documented stale `tools/avoidance-v3.js` input hash; that file was last modified 2026-10-30, before this work, and was left alone.

**Next for the owner:**
1. Review the brief and share the page with the team, or paste rows into the team's Word table.
2. Post the eight Q&A questions after searching existing answers.
3. Measure wall and divider heights and a printed tag on a built field.
4. Tell the team about the tagStandard41h12 / OpenCV gap before anyone writes perception code.

## Earlier today: source-audited stopping sensitivity and Integration Studio v6.1

The follow-up audit found that original v6 motor fitting ignored archived 0.2 A no-load current and implied 1.91–2.59 A. Straight-coast distances were highly sensitive to a no-load-loss alternative. Original files and evidence are preserved in `/workspace/ieee/ieee/derived/audits/2026-10-31-stopping-v6-prepair/` (28 hashed files); no Git metadata or agent-attribution claim was created.

Current `/workspace/ieee/ieee/share/Mule-Integration-Studio-v6.html` is v6.1 with **56 selected-#4754 trajectories** and two explicit passive assumptions. The full stopping report has **168 cases**. Neither model matches all archived points; ranges are assumption spread, not confidence bounds or measured motor behavior. An exact three-endpoint nonreciprocal fit was rejected for four-quadrant use after negative-loss witnesses. Source discrepancies and rationale: `/workspace/ieee/ieee/derived/audits/2026-10-31-stopping-v6-prepair/README.md` and `motor_source_audit` in the stopping report.

The stopping verifier recomputes all **168 refinement cases**. All residuals decrease and stop classifications remain unchanged; maximum coarse residual 0.00308924 J and maximum stop-distance refinement delta 0.00000488173 m. This is numerical evidence only.

Owner visual review corrected the mechanism presentation: the tire now remains stationary while the complete robot approaches. Source-relative contacts are unchanged; the sample-union box is recomputed in tire-fixed coordinates. Direct offline `file://` browser validation covers **162 mechanism cases / 486 sampled frames**, with actual tire-mesh stationarity and complete-robot offset assertions, plus **56 stopping combinations / 168 samples** and actual controls. No external requests, zero JavaScript/page errors and four recorded ReadPixels warnings. Raw records and tool logs are sealed; six screenshots inspected, including approach start/middle/end. Node separately checks all 2,970 mechanism frames.

**Final: 202 tests passed, zero failures/cancellations/skips on Node v24.18.1; all 14 relevant artifact verifiers passed.** Planner-diagnostics remains excluded for its historical stale-source mismatch. Logs are in the audit package. No purchases, fabrication, hardware release or physical trials. Next digital work remains candidate-specific driver/fault truth tables, returned-energy/protection requirements and integrated mechanism behavior, without treating the model spread as measured data. Earlier sections below are historical checkpoints.

## Previous: initial stopping dynamics and Integration Studio v6

Completed `/workspace/ieee/ieee/share/Mule-Integration-Studio-v6.html`: separate 28-trajectory stopping and 162-case mechanism workspaces, real organizer STL visual geometry, concave fork, collision/reservation boxes and conditional electronics XY footprints. Unknown heights and illustrative placement are explicit; no grip, wiring or mounting pass. Existing packages remain preserved by hashes.

Stopping report: `/workspace/ieee/ieee/derived/stopping-dynamics-v6/README.md`. 84 cases, fixed 12 V reciprocal output-equivalent endpoint fit, inferred mechanical losses, signed source power and generic driven/coast/short-brake/active-stop states. No driver mapping or battery absorption qualification. 7680 Hz integration, 240 Hz held control, 30 Hz telemetry; integration-rate current extrema. Full-grid half-timestep refinement reduces every energy residual, preserves classifications and gives maximum stop-distance delta 0.00000488173 m. Largest coarse energy residual 0.0030502412 J. Numerical agreement is not physical accuracy.

**195 tests passed, 0 failed/skipped on Node v24.18.1; 14 relevant artifact verifiers passed.** Historical planner-diagnostics mismatch remains excluded. Browser localhost review covered 162 mechanism selections and 28 stopping combinations, zero JavaScript errors, four recorded ReadPixels GPU-stall performance warnings and three inspected/hashed screenshots. Direct file navigation not tested. Rebuilds changing standalone HTML require fresh browser evidence. Details and reproduction: `/workspace/ieee/ieee/derived/integration-studio-v6/README.md`.

Next work remains conditional: source-specific driver truth tables and reset/fault behavior, endpoint-fit/measured-loss review, energy sink/protection design and mounting/actuator requirements. No hardware release, purchases or physical trials. Earlier dated sections below are historical checkpoints, not current implementation status. No Git metadata at this project path; no commit made.

## Mechanism-envelope v6 — October 31, 2026

Completed the geometric comparison at /workspace/ieee/ieee/derived/mechanism-envelope-v6/: three concepts, flat/upright tire poses, nine E04 offsets/yaws and three synthetic dimensional cases produce 162 cases / 2,970 samples. Organizer STL outer radius is derived from all 5,380 facets; nominal bore remains a design callout. Flat annular/profile checks and upright AABB broad phase retain offset pin conflicts, upright pin-axis incompatibility, intended jaw interference and cable/sensor reservations. No capture, retention or legality pass; no mechanism selected.

Offline self-contained review.html supplies synchronized top/side sample views. Browser tool blocked file://, so validation used a temporary localhost server: all 162 final-case combinations rendered, zero console errors/warnings, three screenshots agent-inspected and hashed. Ten new focused tests pass. Full regression on Node v24.18.1: **177 tests passed, 0 failed/skipped**. All **12 relevant artifact verifiers pass**; historical planner-diagnostics remains excluded for its previously documented stale-source mismatch. Existing simulators, v3 coupons and electrical package preserved by hashes. Coast/brake model variants and 3D Integration Studio remain subsequent work. No purchases, fabrication or physical trials.

## Electrical selection v6 — October 31, 2026

Validation on Node v24.18.1: **167 tests passed, 0 failed/skipped** (eight new tests). All **11 relevant artifact verifiers pass**. Historical planner-diagnostics verifier was deliberately excluded because its unrelated stale-source mismatch remains unresolved. Existing viewer/browser-evidence hashes are unchanged; no browser recapture required.

Completed the approved first electrical work package: `/workspace/ieee/ieee/electrical-selection-v6.json`, deterministic generator/verifier and eight tests. Read `/workspace/ieee/ieee/derived/electrical-selection-v6/README.md`, requirements.md and candidates.md. Fifteen manufacturer/reference files were archived with URL, actual retrieval time, byte count and SHA-256; the Pico 2 product-page HTTP 403 is retained as a failed fetch (datasheet is archived). No stock quantity, landed quote or delivery is promised.

Encoder rates use existing quadrature CPR without another factor of four. #4754 is 11,200 edges/s/motor at archived 12 V no-load; 2x design allowance is 22,400, not a measured maximum. The proposed GPIO reservation totals 20, with six of Pico 2’s 26 left before pin-multiplexing review. Proposed PIO counting, 240 Hz control and 30 Hz telemetry remain uncompiled/unbenchmarked.

Pico 2 is a reversible digital controller preference; Teensy 4.1 is an expansion alternative. Two G2 18v17 boards are preferred only for a packaging/protection study; default ~40 A current chopping is not motor protection or the v5 3 A clipping. MC33926 remains the single-board/lower-cost alternative conditional on characterized current, thermal duty and protection. DRV8833 is rejected for the 12 V bus; obsolete VNH5019 #2502 is excluded. A 3S 4.2 V/cell chemistry case reaches 12.6 V, and motor overvoltage remains unresolved even when a driver voltage screen is conditional. Logic buffering/regulation are circuit candidates, not wiring releases.

All unknown continuous/startup current, battery capacity, charger/BMS, fuse, wire, switch, transient, mechanism and physical-setup values remain unresolved. V5 and earlier viewers are unchanged and hashed. Mechanism-envelope comparison, coast/brake variants, firmware and Integration Studio remain subsequent work. No purchases, fabrication, energization, charging or physical trials.

## Current procurement package

Owner planning assumptions: FAU tools/space, new-purchase capability, $500–$1,000 initial budget, $750 working target and $1,000 cap. Exact FAU supervision, battery/charging, training, storage and test-space rules remain unverified. No order has been placed.

Read `derived/order-a-procurement-v4/README.md` and `order-a-bom.md`. Selected digital mule: two Pololu #4754 70:1 12 V 37D encoder gearmotors, machined brackets, 6 mm hubs, 80 mm silicone-tired wheels, two casters and required wheel fasteners. Required-parts subtotal **$177.25** before shipping/tax/unpriced items; stamped-bracket alternative **$163.30**. Caster screws/nuts are included in each caster kit and were removed as duplicate purchases. #4753 is the speed/backorder alternative; #4755 is the higher-torque/lower-speed alternative. Advertised free USA shipping over $100 is only a policy snapshot, not a landed quote.

Twenty-two hashed sources and four motor/bracket/caster STEP models are in `sources/hardware-2026-10-31/pololu/`. The explicit 80 mm mule gate is 72.765640 RPM and 0.144624 N·m per side; the 3-inch baseline remains unchanged. All three candidates pass arithmetic and encoder screens but require E02/E03. Later driver/battery/controller/mechanism purchases remain gated.

Seven procurement tests and `tools/verify-order-a-procurement-v4.js` pass. The baseline is selected for digital work, not ordered. Before checkout, refresh live stock/landed price and place Order A only; do not add driver, battery, controller or mechanism parts.

## Current mule build and interactive studio

Read `/workspace/ieee/ieee/derived/drivetrain-mule-v4/README.md` and open `/workspace/ieee/ieee/share/Mule-Studio-v4.html`. The selected 5 mm deck has a true-scale drill sheet, closed undrilled STL and 18 reversible motor/wheel/support configurations. Nominal geometry: 176 mm track, 186 mm drive width, 8 mm motor gap, 3 mm wheel/deck clearance and −0.075 mm caster contact. Verify received parts before fabrication.

Mule Studio renders 75 default scene meshes/18,752 triangles and twelve conceptual leads. It exposes the #4755 3 mm body-gap and 76.2 mm wheel −1.975 mm caster warnings. Browser default/top/substitution evidence has zero JavaScript errors. `derived/drivetrain-mule-v4/` also contains 18 blank E02 rows, 450 blank E03 rows and a strict measurement analyzer; no physical result is implied.

Latest project total: **137 tests, 0 failed/skipped**, with all eight artifact verifiers passing. Next physical gates are authorized owner checkout, receipt inspection/E02A, approved provisional bench setup, E02B, low-energy commissioning, then E03 and final driver/power review. Digital mechanism/electrical research may continue in parallel.

## Mule Dynamics Studio v5 follow-up — October 31, 2026

Open `/workspace/ieee/ieee/share/Mule-Dynamics-Studio-v5.html`; read `/workspace/ieee/ieee/derived/mule-dynamics-v5/README.md` and `selection-requirements.md`. This is the next digital work package, not a modification to Robot Lab v3/v4 or Mule Studio v0.4.

The new coupled synthetic model has independent motor electrical states, voltage/current saturation, source sag, planar longitudinal/yaw motion, no-slip/traction-cap switching, caster scrub, PI/heading control and encoder quantization/delay/dropout. It runs at 240 Hz and shares 30 Hz samples with detailed 3D geometry, telemetry and plots. Coverage: 324 configuration/mass/scenario cases and 48 seeded sensitivity runs. Current baseline remains #4754/80 mm; all selections remain reversible and unpriced later-stage interfaces remain unselected.

Browser evidence covers default cruise, spin, asymmetric traction, exploded mode, playback, one-sample stepping, substitutions, mass and X-ray. Default: 100 meshes/32,960 triangles; spin: 99/23,360; exploded: zero leads/phase markers. Four screenshots visually reviewed; zero JavaScript errors and four WebGL ReadPixels warnings. Twelve focused tests cover analytical no-slip dynamics, determinism, convergence, saturation, faults, energy and rendering consistency.

Latest full suite on Node v24.18.1: **159 passed, 0 failed/skipped**. The new artifact verifier passes. All ten relevant artifact verifiers pass (nine existing relevant checks plus the new v5 verifier); the historical planner-diagnostics stale `tools/avoidance-v3.js` mismatch remains unrelated and unresolved.

Next digital work: source-backed driver/controller/power candidate matrices, then mechanism-envelope comparison. Next physical gates remain authorized checkout, receipt/E02A, approved bench setup, E02B, commissioning and E03. Do not turn synthetic current/energy/friction into a purchase or physical rating.

## Bench readiness follow-up — October 31, 2026

Agent-run digital preparation only; no purchases, fabrication, setup approval or physical results.
Read `/workspace/ieee/ieee/derived/drivetrain-mule-v4/bench-readiness.md` next. The dependency chain is facility/resources → receipt/E02A → approved provisional bench setup → E02B characterization → low-energy commissioning → E03 and final driver/power review. This resolves the circular driver gate: provisional bench equipment requires independent documented approval; the final robot driver remains dependent on measured operating/transient evidence.

New blank equipment, session and fit-review records separate nominal/reference limits from actual repeats, uncertainty and reviewer disposition. Null setup limits and approval fields mean blocked. No fabrication release follows from manifold STL or nominal contact arithmetic.

Measurement schema revision 2 requires attempted-row provenance and explicit completed/aborted/excluded status. Unique identities/slots are enforced; excluded/aborted attempts remain visible and do not count. Replacement references must point to a retained aborted/excluded attempt in the same slot. Full analysis rejects incomplete matrices; `--progress` never emits gate verdicts or driver screens. CLI outputs preserve raw inputs and existing reports and record input/config/analyzer hashes. Legacy logs require honest migration, not invented provenance. Referenced calibration, raw files and approvals are not automatically verified.

E03 now evaluates absolute straight drift and treats spin slip/protection faults as qualifying-cell failures; diagnostic mass cells have null pass status rather than implied qualification. Existing numeric engineering targets and the 3-inch simulators are unchanged.

Validation on Node v24.18.1: **147 tests passed, 0 failed/skipped**, including 10 new readiness tests. All eight previously used artifact verifiers pass. Extended checking also passes connected-navigation verification; planner-diagnostics verification fails on a stale `tools/avoidance-v3.js` input hash. Neither that source nor its historical diagnostic package was changed by this follow-up; the mismatch is left visible rather than rewriting unrelated navigation evidence. Nine of ten discovered artifact verifiers pass. The earlier 137-test result is historical.

The standalone Mule Studio and mechanical preview hashes are unchanged, so existing screenshot evidence remains fresh; no new browser capture was performed. A malformed extra receipt CSV field was corrected and blank receipt/inspection parsing is now tested. Workspace Git metadata remains absent; the owner confirmed this session is the only IEEE editor. No commit was made.

## Current high-fidelity viewer

Use `/workspace/ieee/ieee/share/Robot-Lab-v4.html`; V3 is preserved. The offline Hardware Studio expands 30 systems into 481 detailed robot/cable instances with beveled components, populated PCBs, motors/wheels, fasteners, material-aware shading and soft shadows. It includes 23 routed cable meshes, 11 connectors and 44 pins with exact endpoint checks, selectable nets, live modeled current, wiring/labels/X-ray layers and close-up cameras.

The 120 Hz planar route solver remains the mechanical baseline. A labeled electrical observer adds RPM, torque, current, bus sag, power, energy and SOC; modeled E-stop removes bus power and blocks play. No feedback into traction/motion, vendor-certified geometry, selected BOM, production harness, calibrated electrical dynamics or physical validation is claimed. Encoder/additional sensor/mechanism wiring and all purchase/safety gates remain open.

Direct offline browser evidence and four screenshots are saved in `derived/robot-lab-v4/`. Latest full suite: **116 passed, 0 failed/skipped**, Node v24.18.1; v3/v4 lab, hardware, mechanism and confirmation verifiers all pass. Rebuild with `node tools/build-robot-lab-v4.js` and verify with `node tools/verify-robot-lab-v4.js`.

## Current geometry-prototype package

`/workspace/ieee/ieee/derived/mechanism-prototyping-v3/README.md` contains reproducible E01/E04 geometry coupons: three chamfered bore gauges, one passive-fork approach coupon and nine true-scale offset/yaw sheets with 50 mm calibration lines. Four STL meshes pass closed-manifold/nondegenerate/outward-volume checks; seven new tests and the independent verifier pass. SVG previews and one alignment case were rendered through `file://` and visually inspected; see `visual-validation.json` and saved PNGs. No physical prints, fits or mechanism trials.

Latest full suite: **104 passed, 0 failed/skipped** on Node v24.18.1. Passive capture is still only a candidate; all coupons require actual-dimension measurement and the common E04 comparison before any architecture selection.

## Current hardware-engineering package

## Current hardware-engineering package

`/workspace/ieee/ieee/derived/hardware-development-v3/README.md` now provides quantitative drivetrain requirements, mass/friction/battery sensitivities, an eight-row component screen and six repeatable experiment protocols. At the labeled 4 kg scenario (not measured mass), output screening is 76.394 loaded RPM and 0.137754 N·m per side; encoder quantization gate is 189 counts/wheel revolution. Current, pack, tire mass and tire-actuator torque remain measurement-gated.

Owner input worksheet: `derived/hardware-development-v3/owner-input.md`. The three tire architectures remain passive fork, guided bore capture and OD gripper; no final mechanism, 3S pack or component SKU is selected. Seven new tests and `tools/verify-hardware-development-v3.js` pass. Latest full suite: **97 passed, 0 failed/skipped** on Node v24.18.1. No purchases, hardware tests or organizer contact.

## Reviewed questions and interactive concept lab

## Reviewed questions and interactive concept lab

The owner-requested Q1–Q3 clarity revisions are saved in `confirmation-questions-v3.json`; the packet and verifier were regenerated successfully. Wording now asks concrete pit-access, internal-marking and lap/finish-counting cases without implying organizer review or submission.

Open `/workspace/ieee/ieee/share/Robot-Lab-v3.html` directly in a browser. Agent-built offline lab: eight assembly stages, 30 conceptual parts, deterministic scrub/rewind/speed controls, selectable components and question copying. Field mode advances 120-Hz planar differential-drive physics with full-footprint collision rejection and route feedback, rendered in WebGL. South/north nominal empty-control routes complete in 54.07/81.65 seconds under concept limits; not complete missions, predictions or legal approvals.

Guide: `/workspace/ieee/ieee/robot-lab-v3/README.md`. Screenshots, browser-check record and hashes: `/workspace/ieee/ieee/derived/robot-lab-v3/`. Playwright verified play/pause, stepping, both routes, 4×, rewind, reset and inspection; direct `file://` load has WebGL and no application error. Full suite **90 passed, 0 failed/skipped** on Node v24.18.1; robot-lab and packet verifiers pass. No external libraries, purchases, hardware tests, organizer contact or new rule/geometry assumptions added.

## Prior confirmation-packet handoff

## Approved offline follow-up

Owner reports checking Discord and finding nothing new; no export, exact time,
channel scope or organizer answer supplied. Stored separately from the historical
agent-unreviewed source snapshot. No new Discord/online checks performed.
Readable rule/section references added, including G02's existing +/-1-in tolerance
and G03 starting volume. Q6 narrowed to tolerance application/datum questions.
Consolidated organizer/manufacturer/physical/assumption evidence and seven future
acceptance specifications; all dimensions unsupported by evidence remain null,
all seven questions unresolved and acceptance cases specified-not-executed.
No planner/config/report changes. Git metadata is absent at this project path;
owner confirmed other running sessions are not editing IEEE before changes began.

Follow-up validation on Node v24.18.1: **81 passed, 0 failed/skipped** using
`node --test tests/*.test.js`; 8 packet tests pass independently. Generator and
packet verifier pass. Acceptance cases are future specifications, not executed
legality/physical tests. Historical 77-test results below describe the prior handoff.

Agent-assisted work for the owner's hobby/learning robot project. No organizer
messages, purchases or physical tests. No navigation-policy or uncertainty changes.

## Source refresh completed

The official competition page is accessible through the local browser and HTTP
fetch, despite the separate search-browser fetch being robots-blocked. Inspected
the collapsed hardware tab, not just the visible registration text. Downloaded
GM1, GM2, arena CAD ZIP, tire ZIP and supplemental arena build-guide PDF; all five
are byte-identical to previous archives. New snapshot and hashes are under
`/workspace/ieee/ieee/sources/confirmation-2026-10-31/`.

The current hardware tab identifies official Discord Q&A as the clarification
channel. The public invitation resolves, but the unauthenticated page exposes
account creation/login, not channel messages. No account created, server joined,
credentials read or external message sent. **Q&A remains unreviewed.**

GM1 paragraphs 142 and 145–153 establish the official-answer channel and C00
hierarchy. Source extraction retains the literal `???` in the Q&A hierarchy line
and the mismatched C02 cross-reference rather than silently correcting the manual.

## Delivered

`/workspace/ieee/ieee/derived/confirmation-packet-v3/README.md` is the entry point.

- Seven unsent question groups: access, boundaries/envelope, laps, obstacle
  allocation/containment, vehicle dimensions, datums/tolerances, exchange/parking.
- Two route-derived diagrams in SVG and PNG: south approach and experimental
  north approach, comparable empty-control variant-aware routes to pit box 1.
- Explicit spatial arrows, selected full chassis footprints and body-heading
  ticks. Start-area traversal is visible. No invented official finish line,
  vehicle placement, mechanism sweep or complete three-lap claim.
- Exact source excerpts, null-answer evidence ledger, source/artifact hash manifest,
  reproducible local generator and independent verifier.
- Measurement/answer acceptance checklist; evidence is not promoted to legal
  constraints without official provenance and regression review.

## Validation

Node v24.18.1: `node --test tests/*.test.js` — **77 passed, 0 failed/skipped**.
`node tools/verify-confirmation-packet-v3.js` exits zero: download/page hashes,
archive equality, seven unresolved states, indexed excerpts and exact diagrams.
Both actual SVGs rendered through installed local headless Chromium and visually
inspected at 1320×1040. Historical reports/config hashes unchanged. No installs.

## Next external dependency

Owner reviews the packet, searches existing official #qna answers, and supplies
relevant messages with permalink/date/GDC role/context or chooses to post the
draft questions. Do not supply account credentials. No answer means unresolved.
Actual measurements await organizer documentation or approved specimens; no
physical dimensions or official legal corridor were confirmed by this task.