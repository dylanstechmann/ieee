# Mule Integration Studio v6.1

Agent-run digital integration for a personal hobby/learning project, with AI-assisted development. **Not hardware validation, production CAD, a wiring release or a mechanism selection.**

Standalone: `/workspace/ieee/ieee/share/Mule-Integration-Studio-v6.html`.

## Workspaces

- Drivetrain: 56 selected-#4754 trajectories, two explicit motor-loss assumptions, four generic output modes and seven scenarios; synchronized 3D state, wheel phase, telemetry and speed overlays. Full stopping report compares all three motor candidates across 168 cases. Solid/dashed curves expose assumption sensitivity; spread is not a confidence bound.
- Mechanism: every one of the existing 162 cases / 2,970 samples. A stationary-tire presentation shows the complete robot approaching; source-relative contact classifications and actuation are preserved. This is prescribed relative kinematics, not drivetrain simulation or a contact-driven pickup.
- Organizer tire: all 5,380 STL facets, centered and transformed into flat/upright poses; synthetic outer/thickness scaling only. Nominal bore remains a callout, not mesh-certified. Existing collision proxies—not the displayed STL—determine classifications.
- Fork: triangulated original concave coupon polygon, not a solid box across the throat. Pin, jaws and actuator/stage reservations remain conceptual geometry.
- Electronics: archived XY footprints for two G2 boards and Pico 2; unknown heights explicitly labeled. The 0.4 mm rendering thickness and placement are illustrative, not mounting or clearance evidence. Alternatives and blockers remain in candidate cards. No harness/protection layout is released.

## Motor-source uncertainty

The original speed fit ignored archived 0.2 A no-load current and implied about 1.91–2.59 A across the candidates. The Studio now exposes that discrepancy and a second passive no-load-loss sensitivity. Neither model matches every archived operating point; their output spread is not a confidence interval or hardware prediction. An exact three-endpoint nonreciprocal fit is excluded from four-quadrant simulation because it has negative-loss witnesses. Full evidence: `/workspace/ieee/ieee/derived/audits/2026-10-31-stopping-v6-prepair/README.md` and `motor_source_audit` in the stopping report.


## Evidence and reproduction

The standalone embeds the existing renderer, mule geometry, trajectories, mechanism report, candidate facts, motor-source audit and STL. It requests no remote assets. Chromium loaded the standalone directly through `file://` with its context set offline; no localhost server or external request was used. All 162 mechanism cases rendered at beginning/middle/end frames (486 browser checks), and all 56 stopping combinations rendered at beginning/middle/end samples (168 checks). Node tests separately exercise all 2,970 mechanism frames. Actual DOM controls were checked, including model selection and frame-synchronized display options. Every sampled mechanism frame also verifies actual tire-mesh stationarity and complete-robot translation. Six screenshots were agent-inspected and hashed, including approach start/middle/end views. Zero JavaScript/page errors; four repeated WebGL ReadPixels GPU-stall performance warnings are recorded, not suppressed.

`browser-raw.json` contains the per-case results. `browser-console-tool.txt` and `browser-network-tool.txt` preserve tool-observed console/network output. `browser-validation.json` is generated from those records, not handwritten aggregate claims. The original v6 package and its older evidence are preserved under `derived/audits/2026-10-31-stopping-v6-prepair/baseline/`.

From `/workspace/ieee/ieee`:

```sh
node tools/build-stopping-dynamics-v6.js
node tools/refine-stopping-dynamics-v6.js
node tools/build-integration-studio-v6.js
node tools/seal-integration-studio-v6.js
node --test tests/stopping-dynamics-v6.test.js tests/stopping-dynamics-v6-source-audit.test.js tests/integration-studio-v6.test.js
node tools/verify-stopping-dynamics-v6.js
node tools/verify-integration-studio-v6.js
```

Rebuilding changed HTML requires recapturing browser evidence. Input/output hashes and screenshot hashes are checked. Existing v3/v4/v5 viewers and the mechanism/electrical evidence packages remain untouched.

## Sources and boundaries

Credits: organizer tire mesh in `/workspace/ieee/ieee/derived/organizer-cad/Spare Tire v2.stl`; archived manufacturer documents in `/workspace/ieee/ieee/sources/electrical-2026-10-31/` and the existing procurement source archive; existing project renderer, mule and mechanism generators. Candidate facts are dated October 31, 2026; no live availability/price refresh was performed.

Stopping equations and limitations: `/workspace/ieee/ieee/derived/stopping-dynamics-v6/README.md`. Full-grid half-timestep results: `/workspace/ieee/ieee/derived/stopping-dynamics-v6/refinement-study.json`. Negative source power has no qualified energy sink. Generic coast/brake states are not device truth-table mappings. Inferred loss/current parameters are not measured. Contact-projection dissipation includes numerical effects.

No purchases, fabrication, energized testing, capture/retention qualification, actuator selection or competition-legality approval occurred.