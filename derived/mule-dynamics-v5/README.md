# Mule Dynamics Studio v5 — digital selection and planar simulation

**Agent-selected digital candidates; synthetic planar study; not hardware validated.** Existing Robot Lab v3/v4 and Mule Studio v0.4 are preserved.

Open `/workspace/ieee/ieee/share/Mule-Dynamics-Studio-v5.html` directly in a WebGL-capable browser. It is offline and contains its own scripts, data, procedural geometry and styles.

## Analysis coverage

- 324 recorded cases: 18 motor/wheel/support configurations × 3 mass scenarios × 6 operating/fault scenarios.
- Fixed-step 240 Hz integration and 30 Hz shared-state samples.
- 48 deterministic seeded sensitivity runs; seed 731. These are not measured distributions.
- Independent motor current/torque states, driver/current saturation, resistive source sag, no-slip/traction-cap switching, caster scrub, encoder quantization/delay/dropout and PI/heading control.

The default cruise and spin are limiting/nominal software cases, not physical performance evidence. Asymmetric traction, low voltage, encoder dropout and active braking expose model sensitivity. Diagnostic flags are deliberately retained.

## Artifacts

- `selection-requirements.md`: candidate rationale and unselected interface requirements.
- `simulation-matrix.json`: complete sweep and sensitivity ensemble metrics.
- `nominal-simulations.json`: shared-state trajectories for the selected baseline.
- `report.json`: provenance, scope and summary.
- `manifest.json`: input/output SHA-256 freshness.

## Model boundary

Planar longitudinal/yaw dynamics use a switching no-slip/traction-cap approximation. There is no suspension, lateral tire model, flexible carcass, impact or general rigid-body contact solver. Motor curves are linear approximations from archived no-load/extrapolated-stall values. Mass, inertia, friction, scrub, resistance, current limit and control gains are synthetic. Positive-only supply energy is not battery qualification.

Passive-fork and electronics volumes in the viewer are conceptual envelopes. Rendering is procedural nominal geometry, not vendor-certified CAD. No purchase, fabrication, setup approval or physical trial is implied.

## Reproduce

```sh
node tools/build-mule-dynamics-studio-v5.js
node tools/verify-mule-dynamics-v5.js
node --test tests/mule-dynamics-v5.test.js
```
