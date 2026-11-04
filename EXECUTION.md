# Execution and evidence

> **Dated gates superseded by `BACKCAST-2026-11.md` (November 3, 2026).** The experiment definitions and evidence records below are kept unchanged.

## Source-audited stopping sensitivity and Integration Studio v6.1 — October 31, 2026

Agent-run AI-assisted review and digital repair for this hobby/learning project. Preserved 28 original v6 files with verified hashes under `/workspace/ieee/ieee/derived/audits/2026-10-31-stopping-v6-prepair/`; no Git metadata was created. No detectable post-handoff edit was found, so the audit does not attribute the original issue to a particular agent.

The original reciprocal motor fit used stall and no-load speed but ignored archived no-load current. Published 0.2 A compares with original implied 1.905675/2.034044/2.590308 A for #4753/#4754/#4755. Maximum-efficiency evidence also disagrees with the fit. A sensitivity probe changed straight-coast distances by 3.47×/4.49×/4.29×, so the original single-value outputs were not robust model-independent stopping estimates.

The revised study has **168 cases**: three motors × two passive reciprocal assumptions × seven scenarios × four generic modes. `reciprocal-speed-fit` retains the original assumption; `reciprocal-no-load-loss` uses kI0=bω0 but does not reproduce source no-load speed. Neither matches every source point and their spread is not a confidence bound. An exact three-endpoint nonreciprocal fit is documented but rejected for four-quadrant simulation because its loss equation has negative witnesses in the declared envelopes. No source data were silently changed.

Exports now include 56 selected-#4754 trajectories, model identities, per-motor source audits, dwell-confirmation times and sampled distance. The stopping verifier independently recomputes all 168 half-timestep cases and their summary. Every residual decreased and every stop classification remained unchanged; maximum stop-distance delta 0.00000488173 m, maximum current delta 0.00345728 A, maximum coarse energy residual 0.00308924 J. Numerical agreement is not physical accuracy.

Integration Studio v6.1 requires an assumption selection, plots solid/dashed model comparisons and displays source discrepancies and ranges. Following owner visual review, mechanism presentation now holds the tire stationary and translates the complete robot through the prescribed approach; source-relative contacts are unchanged and the sample-union box is recomputed in tire-fixed coordinates. Direct `file://` loading passed in Chromium 155 with the context offline, WebGL active, no server and no external requests. Raw machine-generated evidence covers all 162 mechanism cases at three frames (486 checks), including actual tire-mesh stationarity and complete-robot offsets, and all 56 stopping combinations at three samples (168 checks), plus actual DOM interactions. Zero JavaScript/page errors; four ReadPixels performance warnings retained. Six screenshots, including approach start/middle/end, inspected and hashed. `tools/seal-integration-studio-v6.js` deterministically rebuilds the summary from raw evidence for the verifier.

Final validation on Node v24.18.1: **202 tests passed, 0 failed/cancelled/skipped; all 14 relevant artifact verifiers passed**. Historical planner-diagnostics remains excluded for its unrelated pre-existing stale-source mismatch. Logs and verifier exit records are in the audit package. No purchases, fabrication, energized testing or physical trials. Driver truth tables, energy destination, measured E02/E03, mounting and mechanism behavior remain unresolved.

## Historical: initial stopping dynamics and Integration Studio v6 — October 31, 2026

Agent-run AI-assisted digital work for this hobby/learning project. Separate stopping engine preserves v5. Fixed 12 V reference constants, reciprocal output-equivalent motor fit with explicitly inferred viscous loss/current, signed terminal/source power, ideal current-limited driven/active-stop modes, open coast and unclipped short brake. Generic modes have no candidate-driver truth-table mapping. Returned power crosses an unresolved ideal boundary, not a qualified battery or transient model.

84 cases compare three motors × seven scenarios × four modes. Imposed initial motion is identical across modes. Initial contact switching chattered and was replaced with bounded two-contact impulse projection; integration refined to 7680 Hz, control held at 240 Hz and samples at 30 Hz. Contact-projection dissipation includes numerical effects. Maximum energy residual: 0.0030502412 J. Half-timestep refinement across all 84 cases reduces every residual, preserves stop classifications and changes stop distance by at most 0.00000488173 m; not physical accuracy evidence.

Standalone `/workspace/ieee/ieee/share/Mule-Integration-Studio-v6.html` separates 28 selected-motor stopping trajectories from the 162-case/2,970-frame mechanism study. Includes organizer STL visual geometry, original concave fork polygon, contact classifications, sample-union enclosing box, reservations and archived board XY footprints with unknown heights/illustrative placement. No solved acquisition, retention, wiring, mounting or actuator loads.

Validation on Node v24.18.1: `node --test tests/*.test.js`: **195 passed, 0 failed/skipped**. All **14 relevant artifact verifiers pass**; historical planner-diagnostics stale-source mismatch remains excluded. Browser checked 162 final mechanism selections and 28 stopping selections via localhost: zero JavaScript errors and four recorded WebGL ReadPixels GPU-stall performance warnings. Three screenshots agent-inspected and hashed. Direct file navigation not tested in this session. Existing viewer and mechanism/electrical package hashes pass. No Git metadata exists at this project path; no commit made. Owner confirmed exclusive project access despite unrelated agent sessions.

Next: review endpoint-fit loss assumptions against measured E02/E03 evidence; candidate-driver disable/brake/fault truth tables; protection/energy destination and actual mounting/actuator requirements. No purchases, fabrication or physical trials.

## Mechanism-envelope v6 — October 31, 2026

Completed the geometric comparison at /workspace/ieee/ieee/derived/mechanism-envelope-v6/: three concepts, flat/upright tire poses, nine E04 offsets/yaws and three synthetic dimensional cases produce 162 cases / 2,970 samples. Organizer STL outer radius is derived from all 5,380 facets; nominal bore remains a design callout. Flat annular/profile checks and upright AABB broad phase retain offset pin conflicts, upright pin-axis incompatibility, intended jaw interference and cable/sensor reservations. No capture, retention or legality pass; no mechanism selected.

Offline self-contained review.html supplies synchronized top/side sample views. Browser tool blocked file://, so validation used a temporary localhost server: all 162 final-case combinations rendered, zero console errors/warnings, three screenshots agent-inspected and hashed. Ten new focused tests pass. Full regression on Node v24.18.1: **177 tests passed, 0 failed/skipped**. All **12 relevant artifact verifiers pass**; historical planner-diagnostics remains excluded for its previously documented stale-source mismatch. Existing simulators, v3 coupons and electrical package preserved by hashes. Coast/brake model variants and 3D Integration Studio remain subsequent work. No purchases, fabrication or physical trials.

## Electrical selection v6 — October 31, 2026

Validation on Node v24.18.1: **167 tests passed, 0 failed/skipped** (eight new tests). All **11 relevant artifact verifiers pass**. Historical planner-diagnostics verifier was deliberately excluded because its unrelated stale-source mismatch remains unresolved. Existing viewer/browser-evidence hashes are unchanged; no browser recapture required.

Completed the approved first electrical work package: `/workspace/ieee/ieee/electrical-selection-v6.json`, deterministic generator/verifier and eight tests. Read `/workspace/ieee/ieee/derived/electrical-selection-v6/README.md`, requirements.md and candidates.md. Fifteen manufacturer/reference files were archived with URL, actual retrieval time, byte count and SHA-256; the Pico 2 product-page HTTP 403 is retained as a failed fetch (datasheet is archived). No stock quantity, landed quote or delivery is promised.

Encoder rates use existing quadrature CPR without another factor of four. #4754 is 11,200 edges/s/motor at archived 12 V no-load; 2x design allowance is 22,400, not a measured maximum. The proposed GPIO reservation totals 20, with six of Pico 2’s 26 left before pin-multiplexing review. Proposed PIO counting, 240 Hz control and 30 Hz telemetry remain uncompiled/unbenchmarked.

Pico 2 is a reversible digital controller preference; Teensy 4.1 is an expansion alternative. Two G2 18v17 boards are preferred only for a packaging/protection study; default ~40 A current chopping is not motor protection or the v5 3 A clipping. MC33926 remains the single-board/lower-cost alternative conditional on characterized current, thermal duty and protection. DRV8833 is rejected for the 12 V bus; obsolete VNH5019 #2502 is excluded. A 3S 4.2 V/cell chemistry case reaches 12.6 V, and motor overvoltage remains unresolved even when a driver voltage screen is conditional. Logic buffering/regulation are circuit candidates, not wiring releases.

All unknown continuous/startup current, battery capacity, charger/BMS, fuse, wire, switch, transient, mechanism and physical-setup values remain unresolved. V5 and earlier viewers are unchanged and hashed. Mechanism-envelope comparison, coast/brake variants, firmware and Integration Studio remain subsequent work. No purchases, fabrication, energization, charging or physical trials.

## Order A procurement research — October 31, 2026

Owner planning inputs now assume FAU tools/space, new-purchase capability and a $500–$1,000 initial budget ($750 working target). These are not lab approvals or purchase authorization.

`derived/order-a-procurement-v4/README.md` is the sourced first-experiment package. It compares Pololu #4753/#4754/#4755 and selects two #4754 70:1 encoder gearmotors as the digital mule baseline, with #4753 and #4755 retained as alternatives. The mechanical baseline includes brackets, hubs, 80 mm silicone-tired wheels, casters and required wheel fasteners: **$177.25 before shipping, tax and unpriced consumables**. Each caster already includes screws/nuts, so unnecessary 25-packs were removed. Stamped brackets reduce the priced subtotal to **$163.30**. The advertised free-USA-shipping-over-$100 policy is recorded, but no landed quote or delivery promise is claimed.

Twenty-two hashed source records include manufacturer pages, performance data, dimension diagrams and motor/bracket/caster STEP models. The 80 mm mule screen is 72.765640 RPM and 0.144624 N·m per side; it does not alter the 3-inch Robot Lab baseline. Maximum-efficiency/no-load data and arithmetic screens are not E02/E03 validation. No driver, battery, controller or mechanism actuator is selected, and no order has been placed.

Seven new tests cover wheel arithmetic, motor/encoder screens, totals, reserves, evidence, CAD signatures and not-ordered status. Regenerate with `node tools/order-a-procurement-v4.js`; verify with `node tools/verify-order-a-procurement-v4.js`.

## Selected mule build and Mule Studio — October 31, 2026

`derived/drivetrain-mule-v4/README.md` advances the selected baseline without waiting for unresolved club/FAU preferences. It derives a 190 × 160 × 5 mm deck, 176 mm track, 186 mm drive width, 8 mm motor-body gap, 3 mm wheel/deck clearance and −0.075 mm nominal caster contact from archived bracket/caster drawings. The undrilled STL is closed/manifold; the true-scale drill SVG has a 50 mm calibration gate and unreleased ballast marks.

Eighteen motor/wheel/support configurations remain reversible. The offline `/workspace/ieee/ieee/share/Mule-Studio-v4.html` renders the mule, twelve conceptual leads and variant consequences. It flags the #4755 3 mm body gap and 76.2 mm wheel's −1.975 mm caster mismatch. Default/top/substitution screenshots and diagnostics are in `derived/mule-studio-v4/`; the default scene has 75 meshes/18,752 triangles and browser review recorded zero JavaScript errors.

`tools/mule-measurements-v4.js` analyzes completed E02/E03 CSV logs and rejects placeholders or incomplete cells. The package includes 18 blank E02 rows and 450 blank E03 rows; no physical results are fabricated. Fourteen new tests cover the mule and studio. Latest full suite: **137 passed, 0 failed/skipped**; all eight artifact verifiers pass.

## Mule Dynamics Studio v5 — October 31, 2026

Agent-led digital selection and simulation continues without converting missing human review into physical approval. `mule-dynamics-v5.json` separates manufacturer values, synthetic parameters and open component requirements. `derived/mule-dynamics-v5/selection-requirements.md` keeps #4754/80 mm as the reversible baseline, #4753 as the availability-limited speed alternative, #4755 behind a motor-gap redesign and all current 76.2 mm variants behind caster/deck revision.

`tools/mule-dynamics-v5.js` implements SI-unit 240 Hz planar longitudinal/yaw dynamics with independent motor current/torque states, driver/current saturation, resistive source sag, no-slip/traction-cap switching, caster scrub, PI/heading control and encoder quantization/delay/dropout. Six complete nominal trajectories use 30 Hz shared samples. The generated matrix contains **324 cases** (18 configurations × 3 masses × 6 scenarios) and **48 deterministic sensitivity runs**. Ensemble quantiles are scenario summaries, not measured probabilities.

Open `/workspace/ieee/ieee/share/Mule-Dynamics-Studio-v5.html` directly. The offline viewer reuses the preserved procedural geometry/renderer and adds shared-state telemetry, speed/current plots, wheel phase and slip/saturation overlays, deterministic playback/scrubbing, cameras, X-ray and exploded views. Passive-fork and electronics volumes are conceptual only. Default cruise: 100 mesh instances/32,960 triangles; final spin: 99/23,360 after removal of degenerate stationary path geometry. Four full-page screenshots were visually inspected. Direct `file://` review recorded zero JavaScript errors and WebGL ReadPixels performance warnings only. Quarter-speed playback, one-sample stepping, substitutions, mass and X-ray controls passed.

Numerical tests cover an independent one-step effective-inertia/no-slip calculation, rest/zero energy, determinism, finite states, current limiting, positive-only energy monotonicity, traction/dropout differentiation, time-step refinement with preserved real encoder delay, geometry-review retention and scene/sample consistency. Full suite on Node v24.18.1: **159 passed, 0 failed/skipped**. All ten relevant artifact verifiers pass; the unrelated historical planner-diagnostics stale-source mismatch remains documented below. No purchase, fabrication or physical validation occurred.

## Bench-readiness and measurement audit — October 31, 2026

Agent-authored digital readiness work adds `/workspace/ieee/ieee/derived/drivetrain-mule-v4/bench-readiness.md`, blank equipment/session records and a received-part fit review. Gates distinguish provisional bench equipment approval from final robot driver selection; null safety/setup values remain unresolved. No specific driver, battery or hardware procedure is approved.

Measurement schema revision 2 adds operator/session/time, configuration/control, instrument/calibration, setup, warmup/uncertainty and raw-record references. Explicit attempt states preserve aborted/excluded attempts and replacements. The analyzer rejects duplicate identities/slots, invalid coordinates, mixed configurations/control revisions and incomplete qualifying matrices. Progress reporting cannot issue passes or driver screens. Exclusive CLI output creation and input/config/analyzer hashes preserve traceability; reference presence is not verification.

Regression coverage includes retained failures, replacements, provenance, partial reports and raw/output preservation. E03 fixes signed-drift and spin-fault omissions; diagnostic mass cells are no longer marked passed. Nominal geometry, viewer output and simulator behavior remain unchanged. Validation on Node v24.18.1: **147 passed, 0 failed/skipped**. All eight previously used artifact verifiers pass; connected-navigation also passes. An extended planner-diagnostics check fails on its pre-existing stale avoidance-source hash; that unrelated source/package was not changed. Total discovered verifiers: nine pass, one stale historical package. Hardware manifest was regenerated after budget-document edits. Viewer/preview hashes are unchanged; existing screenshot evidence remains fresh without recapture.

## Hardware Studio v0.4 — October 31, 2026

Open `/workspace/ieee/ieee/share/Robot-Lab-v4.html`. This offline high-fidelity successor preserves V3 while adding 481 detailed robot/cable instances, material-aware PBR-style shading, soft shadows, 23 exact-endpoint cable meshes, wiring/labels/X-ray layers and close-up inspection. The 30-system assembly and two conditional routes remain deterministic.

The field mode adds motor RPM, torque, current, bus sag, power, energy and scenario SOC, plus a functional modeled E-stop. Electrical telemetry is a one-way observer driven by planar motion; it is not a calibrated motor/battery model and does not size wire, fuses or components. Detailed parts are candidate form-factor proxies, not vendor-certified geometry or an approved purchase list. Encoder/additional sensor/mechanism harness design remains open.

Twelve new tests cover geometry, matrix finiteness, wiring endpoints/meshes, both routes, electrical replay and E-stop. Direct `file://` rendering and all browser interaction checks pass with zero JavaScript errors. Evidence and screenshots are in `/workspace/ieee/ieee/derived/robot-lab-v4/`; guide in `robot-lab-v4/README.md`. Latest full suite: **116 passed, 0 failed/skipped**; all five artifact verifiers pass.

## Mechanism geometry-prototype kit — October 31, 2026

`/workspace/ieee/ieee/derived/mechanism-prototyping-v3/README.md` is the entry point for input-independent E01/E04 geometry work. It contains three nominal bore gauges (39.0/39.4/39.8 mm), a 4 mm passive-fork coupon with a 70.184 mm nominal throat, nine 120 mm true-scale alignment sheets and a nine-cell trial matrix. All four STLs pass closed edge-two-manifold, nondegenerate and positive-volume checks; analytic gauge volumes agree within faceting tolerance. Preview and alignment SVGs were directly rendered and visually inspected. No print, fit, mechanism or physical trial is claimed.

Seven new tests and `tools/verify-mechanism-prototyping-v3.js` pass. Latest full suite: **104 passed, 0 failed/skipped**, Node v24.18.1. `visual-validation.json` records the digital rendering checks. This package does not select the passive mechanism or replace actual-tire measurements.

## Hardware requirements and bench-planning package — October 31, 2026

`/workspace/ieee/ieee/derived/hardware-development-v3/README.md` is the entry point. The deterministic generator calculates 2–6 kg drivetrain sensitivity, friction sensitivity, battery-energy scenarios and encoder quantization; eight component requirements and six physical experiment protocols are generated from `hardware-development-v3.json`. At the labeled 4 kg scenario: 76.394 loaded RPM and 0.137754 N·m per side after stated margins. No motor current, battery pack, tire mass or actuator torque is guessed.

Owner next input: `/workspace/ieee/ieee/derived/hardware-development-v3/owner-input.md`. Candidate comparison: `component-selection.md`; protocols and trial log: `experiment-plan.md` and `trial-log-template.csv`. Seven new arithmetic/artifact tests and the independent verifier pass. Latest full suite: **97 passed, 0 failed/skipped**, Node v24.18.1. No components selected, hardware tested or purchases made.

## Interactive robot concept lab — October 31, 2026

Open `/workspace/ieee/ieee/share/Robot-Lab-v3.html`; no server or dependencies are required. The lab combines a deterministic eight-stage/30-part assembly with a 120-Hz planar differential-drive simulation rendered in WebGL. It supports pause, single-step, speed control, deterministic rewind/replay, camera orbit/top/follow, part inspection and question copying. South and experimental north empty-control routes complete in 54.07 s and 81.65 s respectively under the concept parameters; these are not race predictions or legal missions.

Guide: `/workspace/ieee/ieee/robot-lab-v3/README.md`. Evidence: `/workspace/ieee/ieee/derived/robot-lab-v3/`. Agent-run Playwright checks passed for transport controls, both routes, inspection and reset; direct `file://` loading works. Full suite: **90 passed, 0 failed/skipped**, Node v24.18.1. No 3D rigid-body, slip, sensor, obstacle, scoring or hardware qualification is claimed.

## Confirmation packet — October 31, 2026

See `/workspace/ieee/ieee/derived/confirmation-packet-v3/README.md` and
`/workspace/ieee/ieee/SESSION-STATE-2026-10-31.md`. Five official downloads re-fetched
and byte-identical; Q&A messages unreviewed behind account access. Two actual-route
diagrams rendered and inspected; seven focused questions remain unsent/unresolved.
77 tests pass on Node v24.18.1; packet hash/excerpt/diagram verification passes.
No changes to planner assumptions, no hardware trial or organizer communication.

## Navigation study — October 30, 2026

Completed agent-run source audit, board-grid decoupling, geometry supplements and
connected pit-construction comparison. See `/workspace/ieee/ieee/SESSION-STATE-2026-10-30.md`
and `/workspace/ieee/ieee/derived/connected-navigation-v3/README.md`. Independent
artifact verification passes: 24 alignment records, 36 rendered SVG sources and 72
complete-route recomputations. Suite: 73 passed, zero failures/skips on Node v24.18.1.
North-access success is conditional on an alternate engineering corridor, not
official legality. Original pit regions still have no complete blocker routes;
do not buy hardware or relax uncertainty based on this study. Next: establish
actual obstacle envelope, placement and legal pit access before motion refinement.

> **Historical plan:** V2 scoring, tire, and dwell assumptions below require reconciliation with `CURRENT-RULES-2026-10-29.md`; the October milestones are past, not evidence of completed work.

Use this file to convert [the backcast](BACKCAST.md) into owned work. Proposed experiments and targets are engineering choices; official requirements remain in [the rule ledger](RULES-AND-SOURCES.md).

## Resources and budget — October 30, 2026 update

Use `/workspace/ieee/ieee/RESOURCES-AND-BUDGET.md` for school-lab and home-build
options, access checks, and separate robot/tool/field/spares cost accounting.
The owner has no robot parts yet. The initial ~$100 preference is not a hard cap;
exceeding it is acceptable for this experimental, one-off competition device.
No replacement ceiling, purchases, or lab permissions have been approved.
Confirm school access and home inventory before building a priced bill of materials.
The earlier conversational $100 allocation is not a validated purchasing baseline.

## First experiments

**Diagnostic follow-up (October 30):**
`/workspace/ieee/ieee/derived/planner-diagnostics-v3/README.md` records 48 fixed-contract
failed-leg searches. A 1-in grid recovers one nominal upper passage but its three
complete routes each fail 28/43 perturbations. Pit searches remain unresolved.
No larger search budget was needed; all stops were endpoint or grid exhaustion.
Do not replace the historical route comparison with a hardware-success claim.

**Route-contract update (October 30):**
`/workspace/ieee/ieee/derived/contract-navigation-v3/README.md` compares the historical
avoidance paths with provisional center-region/gate constraints and finite
uncertainty-aware edge checks. Blocker routes exhaust the constrained grid; do not
promote the older nominal detours as valid lap routes. No physical tests completed.

**Digital sensitivity study (October 30, 2026):**
`/workspace/ieee/ieee/derived/navigation-stress-v3/README.md` records hypothetical
mechanism-envelope and obstacle probes of the connected differential-drive paths,
including nominal between-sample clearance bounds. This is agent-run analysis,
not completion of the physical navigation/docking experiment below. Obtain measured
obstacles and mechanism extents before promoting candidates or selecting hardware.

| Experiment | Deadline | Measurement and decision |
|---|---|---|
| Lower-body envelope and swept turn | Oct 15 | Check minimum and maximum dimensions, payload and turning clearance against measured course/pit geometry; reject infeasible chassis before fabrication |
| Tire exchange bench fixture | Start Oct 15; decision Nov 12 | Begin with 20 trials, then at least 50 varied trials per finalist mechanism; log drop/pick success, tire identity, jams, time and required alignment; do not label this full-system reliability |
| AprilTag and legal-start detection | Oct 22 | Include all current tag assignments, viewing angles, lighting and no-start conditions; record missed reads and false starts; adjust placement/exposure or sensing method |
| Navigation and docking | Nov 12 | Randomize field deviations within official tolerances; measure contacts, docking error and actual robot overlap with assigned area |
| End-to-end mission | Dec 17 stretch; Jan 14 latest | Cold boot and randomized field; record every task, both finish-crossing time and final-parking time, and all failures |
| Route and mechanism optimization | Jan 28–Mar 4 | Paired randomized comparison to baseline; assess scores, time, failure modes and uncertainty before promoting changes |
| Independent-board transfer | Feb 18 | Use a separately constructed board and different operator; determine whether calibration and perception transfer |
| Release acceptance | Mar 4–Apr 1 | Log all frozen-build attempts and stress coverage; minimum 100 successful trials without failures for the simple zero-failure bound; stretch 300 |

A test count is a sampling plan, not a substitute for a pass criterion. Establish the criterion before running the experiment. Give every failure a cause, owner and next discriminating experiment.

## Formal run protocol

1. Record build ID, hardware configuration, rule revision and field configuration. Declare the intended score before the run.
2. Reset the field and game elements independently of the robot operator. Balance coverage across assigned spots and vary legal obstacle layouts; include cold boots and realistic battery conditions.
3. Follow competition setup and randomization restrictions. Allow only permitted technician actions. Use referee-style start and video scoring.
4. Record every started attempt, including failures. Separate diagnostic tests from declared formal trials before the run; neither should be silently discarded.
5. Independently score each task and compare it with robot telemetry. Record finish-crossing time separately from final-park and idle time.
6. Update the build-specific dataset. Include raw sample count, successes, failure causes, minimum/median/P10 score, median/P95 time, and one-sided exact confidence bound when making reliability claims. Use a documented quantile convention, such as nearest rank.

Store telemetry onboard during matches and retrieve it during permitted access afterward. GM1 R19 prohibits off-robot communication during a match, including external telemetry; turn wireless devices off when the robot is not competing.

Allocate at least **12 balanced full missions per testing week** once integrated. During the four weeks from March 4 to April 1, reserve roughly **25 formal trials/week** for the 100-run floor or **75/week** for the 300-run stretch, plus diagnostic, stress and rehearsal time. Translate those counts into actual field bookings using measured reset/run duration. Capacity shortfalls should be visible by February 18.

Do not infer independent success probability from repetitions of one layout. Include all three V2 assigned spots, varied obstacle configurations, a second field, bright/dim lighting, low-but-valid and fresh batteries, different start poses, camera contamination/occlusion cases and payload tolerances. Also test the preview's possible 3–4 obstacles as exploratory scenarios, clearly separated from V2 formal scoring.

## Risk register

Initial priorities reflect engineering judgment, not measured probabilities. Replace them as evidence arrives.

| Risk | Initial priority | Early observable signal | Mitigation and owner |
|---|---|---|---|
| Competition/category or eligibility mistaken | Critical | No confirmed charter or advisor/branch connection by Oct 15 | Team lead verifies Main/Open route and registration requirements |
| Revised rules change design or priorities | High | New manual/Q&A; currently ambiguous organizer preview | Rules lead reviews weekly and diffs official changes; keep start sensing and obstacle policy adaptable |
| Robot minimum size or swept volume blocks pit access | Critical | CAD/fixture collision or insufficient stop-area overlap | Mechanical lead measures geometry before committing chassis |
| Tire exchange loses substantial points | Critical | Jams, wrong tire, pickup failure, uncertain scoring position | Mechanical/controls leads use actual geometry and Q&A; choose by varied trials |
| Local navigation succeeds only on familiar field | Critical | Failure on displaced walls, new lighting or second board | Autonomy/test leads use closed-loop sensing and early field variation |
| False start or bad assignment | High | Sensor false trigger, ambiguous read, state change before legal start | Controls lead tests armed/no-start behavior and independent assignment confirmation |
| Integration slips past January | Critical | Subsystems lack shared interfaces or a full mission | Integration lead runs weekly combined tests and simplifies peripheral work |
| Battery/software state changes between matches | High | Brownout, boot variability, drift after repeated runs | Electrical/test leads rehearse cold boots, sequestration, charging restrictions and prestaging |
| Lab availability, exams or procurement consume testing time | High | Missed field slots or unquoted lead times | Team lead reserves space, buys time through standard parts, and assigns backups |
| Publicity credit or elimination tie interpretation assumed | Medium | No official answer or contradictory date | Rules/logistics lead obtains clarification early; avoid reliance on disputed points |

## Weekly review

Hold a 30-minute evidence review at the end of each week. Report current gate, build ID, all attempts, points lost by task, three largest risks, next experiment and its owner. Check official manuals/Q&A for updates and record the check even when nothing changes. Update actual team hours and field availability.

Select next work by **measured points lost, elimination failure risk, and critical-path impact**. Preserve a working full-mission release before attempting a substantial improvement. Log the reason to accept or reject a candidate.

## Run record template

Copy this block into a dated team log. Do not fill it with invented results.

```text
Run ID / date / operator / independent scorer:
Formal acceptance, stress, candidate comparison, or diagnostic (declare first):
Software build / hardware configuration / governing rule revision:
Field ID / obstacle configuration / assigned spot / lighting / battery:
Cold boot? Start pose? Calibration applied?
Legal setup and start? Any cards or prohibited interaction?
Course entry / completed laps:
Pit stop after which lap / dwell time / assigned-area overlap:
Carried tire dropped where? Distinct fresh tire picked up? Evidence:
Gray-wall contacts by lap / obstacle contacts by lap:
Flag raised during final lap? Evidence:
Finish-crossing time / assigned-final-park time / safe-idle time:
Fixed robot-task points / speed bonus / confirmed publicity / deductions:
Total score / success against declared acceptance criteria:
Video and telemetry locations:
Failure cause / next experiment / owner:
```

## Decision record template

```text
Decision / date / owner:
Options and current baseline:
Relevant official rules and unresolved interpretation:
Hypothesis and criterion declared before testing:
Matched trial data, all failures, and limits of sample:
Chosen option and expected competitive benefit:
New risks, cost and schedule impact:
Evidence that must be repeated:
Revisit trigger:
```

## Competition preparation

By March 18, rehearse one complete match day with score review, sequestering, limited access/charging and two-minute preparation. Verify the exact current organizer procedures before the rehearsal. Train more than one technician.

Pack build/configuration manifests, offline installers and code releases, known-good backups, matched spare wear parts, fasteners, sensing mounts, tools, allowed batteries/chargers, inspection measurements, videos of disputed scoring tasks and rule references. Resolve battery transport restrictions with the actual carrier when travel is booked.

Complete registration by the internal **February 15** target, ahead of the published March 1 deadline. Check the publicity deadline directly with organizers; the currently posted year is inconsistent. Capture confirmations and official Q&A answers locally. At the event, record scores promptly and follow the current scoring-question deadline and reinspection requirements.
