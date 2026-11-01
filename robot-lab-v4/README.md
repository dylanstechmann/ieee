# Stock Car Robot Lab — Hardware Studio v0.4

Open **`/workspace/ieee/ieee/share/Robot-Lab-v4.html`** directly in a WebGL-capable browser. The standalone file works offline without a server, packages, fonts, external models or accounts. V3 remains preserved at `share/Robot-Lab-v3.html`.

## What changed

- Thirty inspectable systems expand into **481 detailed robot/cable mesh instances**; the completed assembly view contains 500 meshes including its work surface and grid.
- Beveled aluminum structure, gearmotor cans/gearboxes/shafts, rotating wheels and hubs, fasteners, battery straps/connector, populated PCBs, finned heatsink, camera lens, sensors, passive fork, official-proportion spare tire and corrugated conduit.
- Metallic/roughness materials, procedural brushed-metal/rubber/PCB variation, camera lighting and a **1024² PCF shadow map**. This is real-time PBR-style rendering, not ray tracing or vendor-certified CAD.
- **23 smooth cable meshes, 11 connectors and 44 pins**, with exact geometric endpoint validation. Select a cable to highlight it and inspect its net, endpoints and live modeled current.
- Wiring, labels and X-ray layers; orbit/top/follow/detail cameras; deterministic assembly and fixed-step field replay.
- Live motor RPM, output torque, current, bus sag, power, accumulated energy and scenario state of charge. A modeled E-stop removes bus power and blocks playback until reset.

## Controls

Use **Play/Pause**, the timeline, **−1/+1 s**, **0.25×–4×**, stage buttons and the component list. Drag to orbit and scroll to zoom. **Detail** is the close inspection preset. In field mode, scrubbing resets and deterministically re-simulates pose, wheel angle, energy and electrical state at 120 Hz. **R** resets; **Space** plays/pauses; arrow keys step.

## Electrical scenario — not a component specification

The observer is driven by the existing planar route solver. It uses an illustrative **11.1 V bus, 2.2 Ah capacity, 100:1 gearbox, 900 RPM/V motor, 4 kg mass and 0.06 kg·m² yaw inertia**. It computes wheel/motor speed, scenario torque/current, resistive bus sag, duty demand, positive supply power and energy. Negative phase current is shown; battery regeneration is not assumed.

The electrical observer **does not feed back into motion**, motor control, traction or collisions. Duty/current saturation is only a scenario warning. These are not vendor curves, measured values, selected parts, thermal results, fuse/wire ratings or battery qualification.

## Hardware and wiring boundary

The detailed parts are agent-authored **COTS-form-factor visualization proxies**, not manufacturer models. Robot Lab v4 preserves its independent 3-inch illustrative baseline; it is not the selected Order A mule. See `/workspace/ieee/ieee/share/Mule-Studio-v4.html` for the selected 80 mm mule and reversible hardware variants. No parts are ordered. Before releasing production hardware or later-stage purchases, complete E00, measure the actual tire and drivetrain loads, and verify current datasheets, mechanical drawings, connector pinouts and school battery/safety policies.

Cable routes demonstrate packaging and net relationships. They are not a complete production harness: encoder and additional sensor/mechanism connections remain to be designed. Wire diameter is visual only. Grounding, fusing, emergency power removal, strain relief, bend radius, connector ratings and regulatory/rule compliance need engineering review and supervised testing.

The field remains an empty conditional study. No 3D rigid-body contacts, suspension, wheel slip, calibrated motor dynamics, sensor detection/noise, tire mechanism dynamics, obstacles, scoring, lap adjudication or legal mission is claimed.

## Evidence and rebuild

Saved evidence:

- `derived/robot-lab-v4/assembly-complete.png`
- `derived/robot-lab-v4/hardware-detail.png`
- `derived/robot-lab-v4/field-power.png`
- `derived/robot-lab-v4/field-detail.png`
- `derived/robot-lab-v4/browser-validation.json`
- `derived/robot-lab-v4/manifest.json`

From `/workspace/ieee/ieee`:

```sh
node tools/build-robot-lab-v4.js
node tools/verify-robot-lab-v4.js
node --test tests/robot-lab-v4.test.js
node --test tests/*.test.js
```

Validation on Node v24.18.1: **159 project tests passed, 0 failed/skipped**, including 12 v4 tests. Direct offline browser rendering and the interaction matrix passed with zero JavaScript errors. Agent-built visualization and analysis for the owner's hobby/learning project; no physical validation or purchase is implied.
