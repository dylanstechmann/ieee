# Mule Integration Studio v6

Agent-run digital integration for a personal hobby/learning project, with AI-assisted development. **Not hardware validation, production CAD, a wiring release or a mechanism selection.**

Standalone: `/workspace/ieee/ieee/share/Mule-Integration-Studio-v6.html`.

## Workspaces

- Drivetrain: 28 selected-#4754 trajectories, four generic output modes, seven scenarios; synchronized 3D state, wheel phase, telemetry and speed overlays. Full stopping report compares all three motor candidates across 84 cases.
- Mechanism: every one of the existing 162 cases / 2,970 samples. Fixed robot and relative tire kinematics remain separate from drivetrain simulation. No contact-driven pickup is solved.
- Organizer tire: all 5,380 STL facets, centered and transformed into flat/upright poses; synthetic outer/thickness scaling only. Nominal bore remains a callout, not mesh-certified. Existing collision proxies—not the displayed STL—determine classifications.
- Fork: triangulated original concave coupon polygon, not a solid box across the throat. Pin, jaws and actuator/stage reservations remain conceptual geometry.
- Electronics: archived XY footprints for two G2 boards and Pico 2; unknown heights explicitly labeled. The 0.4 mm rendering thickness and placement are illustrative, not mounting or clearance evidence. Alternatives and blockers remain in candidate cards. No harness/protection layout is released.

## Evidence and reproduction

The standalone embeds the existing renderer, mule geometry, trajectories, mechanism report, candidate facts and STL. It requests no remote assets. Browser validation used localhost; direct `file://` operation was not tested in this session. All 162 final mechanism selections and 28 stopping selections rendered. Three screenshots were agent-inspected and hashed. Zero JavaScript errors; four repeated WebGL ReadPixels GPU-stall performance warnings are recorded, not suppressed.

From `/workspace/ieee/ieee`:

```sh
node tools/build-stopping-dynamics-v6.js
node tools/refine-stopping-dynamics-v6.js
node tools/build-integration-studio-v6.js
node --test tests/stopping-dynamics-v6.test.js tests/integration-studio-v6.test.js
node tools/verify-stopping-dynamics-v6.js
node tools/verify-integration-studio-v6.js
```

Rebuilding changed HTML requires recapturing browser evidence. Input/output hashes and screenshot hashes are checked. Existing v3/v4/v5 viewers and the mechanism/electrical evidence packages remain untouched.

## Sources and boundaries

Credits: organizer tire mesh in `/workspace/ieee/ieee/derived/organizer-cad/Spare Tire v2.stl`; archived manufacturer documents in `/workspace/ieee/ieee/sources/electrical-2026-10-31/` and the existing procurement source archive; existing project renderer, mule and mechanism generators. Candidate facts are dated October 31, 2026; no live availability/price refresh was performed.

Stopping equations and limitations: `/workspace/ieee/ieee/derived/stopping-dynamics-v6/README.md`. Full-grid half-timestep results: `/workspace/ieee/ieee/derived/stopping-dynamics-v6/refinement-study.json`. Negative source power has no qualified energy sink. Generic coast/brake states are not device truth-table mappings. Inferred loss/current parameters are not measured. Contact-projection dissipation includes numerical effects.

No purchases, fabrication, energized testing, capture/retention qualification, actuator selection or competition-legality approval occurred.