# Stock Car Robot Lab — concept v0.1

Agent-built interactive visualization for the owner's hobby/learning robot project.
**This is not final robot CAD, a selected bill of materials, an official route, a complete mission, or hardware validation.**

## Open and watch

Open this self-contained file in a WebGL-capable browser:

`/workspace/ieee/ieee/share/Robot-Lab-v3.html`

It needs no installation, server, network connection, external font, library or account. All geometry, application code and simulation logic are embedded in the HTML. The source remains in `/workspace/ieee/ieee/robot-lab-v3/`.

### Assembly mode

The 32-second sequence has eight stages and 30 conceptual parts:

1. Lower frame
2. Differential drive
3. Power and emergency stop
4. Control electronics
5. Navigation sensors
6. Tire-handling fork
7. Final-lap flag
8. Wiring protection and integration inspection

Use **Play/Pause**, the time slider, **−1 s / +1 s**, and **0.25×–4×** speed. Stage buttons jump directly to a construction step. Select a component in the list—or click a visible part—to inspect its purpose and assumptions. Drag to orbit, scroll to zoom, or use the top/reset camera buttons.

Assembly playback is deterministic. Every scrubbed frame is computed from the same part definitions, so rewinding restores the exact component positions.

### Field simulation mode

Choose the conditional south or experimental north route. Press Play to advance live physics; Pause freezes all physical state. Follow centers the camera on the robot; Top shows the whole field.

The slider and rewind buttons **reset and re-simulate from the start** to the requested time using the same fixed 120-Hz step. Fast-forward advances more simulated seconds per wall-clock second without increasing the physics step size. Reset restores the initial pose and red tire.

The display includes the stored guide path, full 10 × 10-inch footprint, walls/dividers, robot pose and speed, command progress, distance, event log and conceptual red-drop/blue-pickup event. The event does not prove that the mechanism works or that the task interpretation is official.

## Asking questions

The viewer does not pretend to contain an AI assistant. Select a part or stage and use **Copy question**, then paste that context into the chat. You can also ask directly about anything visible: a component, construction step, telemetry value, collision, route assumption, or what physical test should come next.

## Physics and evidence boundary

Implemented:

- Semi-implicit unicycle/differential-drive integration with separate forward/reverse and angular limits.
- Linear/angular acceleration limits, visual wheel travel and exact arc integration for nonzero yaw rate.
- Full rectangular-footprint collision checks against the provisional outer walls and two dividers. A colliding candidate pose is rejected and the run stops with an event.
- Feedback control over compressed straight forward/reverse and in-place-spin commands from the existing connected-navigation study.
- Deterministic assembly and simulation reset/replay.

Not implemented:

- Three-dimensional rigid-body dynamics, suspension, wheel slip, motor electrical behavior, battery behavior, sensor noise or detection, tire/gripper dynamics, or continuous collision certification.
- Obstacle vehicles, field tolerance sampling, lap counting, scoring, complete three-lap missions, or official rules adjudication.
- Real component selection, structural analysis, manufacturing tolerances, wiring design, or physical safety validation.

The robot's part geometry and placement are visualization choices. Only the tire proportions and field/route source data come from the existing evidence baseline. North access and internal-marking rules remain unresolved. No purchase or hardware test is implied.

## Saved evidence

- `/workspace/ieee/ieee/derived/robot-lab-v3/assembly-complete.png`
- `/workspace/ieee/ieee/derived/robot-lab-v3/field-dock.png`
- `/workspace/ieee/ieee/derived/robot-lab-v3/browser-validation.json`
- `/workspace/ieee/ieee/derived/robot-lab-v3/manifest.json`

The reviewed Q1–Q3 wording is saved in `/workspace/ieee/ieee/confirmation-questions-v3.json` and the regenerated organizer packet. It remains a draft, not sent by the agent.

## Rebuild and verify

From `/workspace/ieee/ieee` with Node.js:

```sh
node tools/build-robot-lab-v3.js
node tools/verify-robot-lab-v3.js
node --test tests/robot-lab-v3.test.js
node --test tests/*.test.js
```

`model.json` defines parts/stages and physics parameters. `core.js` is shared by Node tests and the browser. `renderer.js` is minimal WebGL; `app.js` owns controls and scene construction. `scene-data.js` and the standalone HTML are generated outputs. No npm packages are used.

Validation on Node v24.18.1: **90 total project tests passed, 0 failed/skipped**, including nine robot-lab tests. Both artifact verifiers pass. Agent-run browser interaction checks and a direct offline `file://` load also passed.
