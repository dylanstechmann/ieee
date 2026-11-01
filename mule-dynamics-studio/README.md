# Mule Dynamics Studio v5

Open `/workspace/ieee/ieee/share/Mule-Dynamics-Studio-v5.html` directly in a WebGL-capable browser. The standalone HTML is offline and embeds its data, dynamics, procedural geometry, renderer, styles and controls.

## Shared model and view

- Two independent motor current/torque states with voltage saturation, a synthetic per-channel current limit and resistive source sag.
- Planar longitudinal/yaw dynamics with switching no-slip and independent traction-cap approximations.
- PI wheel-speed control, heading control, encoder quantization/delay and a scripted left-encoder dropout.
- Six cruise/spin/low-voltage/asymmetric-traction/dropout/braking scenarios and three mass scenarios across 18 configurations.
- Fixed 240 Hz integration and 30 Hz sampled state shared by 3D geometry, telemetry and plots.
- Timeline scrubbing, deterministic playback, orbit/follow/top/detail cameras, X-ray, exploded view, path and conceptual-envelope toggles.

Orange wheels represent modeled slip. Gold phase markers rotate with wheel state and become red at saturation. Passive-fork and electronics volumes are explicitly conceptual, not selected hardware. Exploded mode removes conceptual leads, envelopes and phase attachments.

## Evidence boundary

This is an agent-built synthetic planar study for the owner's hobby/learning project. Mass, inertia, friction, caster scrub, source resistance, driver current limit and control gains are assumptions. Motor curves are linear approximations from archived no-load/extrapolated-stall values. The model has no suspension, lateral tire model, flexible tire, impact or general 3D contact solver. It is not a calibrated electrical/thermal model or physical validation.

The #4754 / 80 mm mule remains a reversible digital candidate. Driver, controller, battery, charger, actuator and final mechanism remain unselected. No purchase, fabrication, setup approval, physical trial or competition legality is implied.

## Rebuild and evidence

From `/workspace/ieee/ieee`:

```sh
node tools/build-mule-dynamics-studio-v5.js
node tools/verify-mule-dynamics-v5.js
node --test tests/mule-dynamics-v5.test.js
```

Generated reports and four reviewed browser screenshots are under `/workspace/ieee/ieee/derived/mule-dynamics-v5/`. The manifest tracks input/output hashes; browser evidence tracks the standalone HTML and screenshot hashes. Recapture browser evidence after any associated output change.
