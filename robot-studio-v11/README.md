# Integrated offline robot study

Open `/workspace/ieee/ieee/share/Showcase-v11.html` directly in a WebGL2/WASM-capable
browser. No server, account, network request, or sibling studio file is needed.
Scroll to **3D studio**. It assembles the proposed robot, then automatically runs
the live physics mission. Use the workspace selector for inspection or the old
competition-field replay. The default 4× rate shortens the approximately 371 s
nominal simulated mission to roughly 93 s of playback plus assembly time on a
machine able to keep up. Pausing or scrolling away suspends progress; there is no
wall-clock catch-up. 12× requires more CPU. A slow browser can run below that rate.

## What is implemented

- Editable CadQuery purchased-part exterior studies and custom deck/risers;
  STEP/STL, hashed manifest, 19-instance assembled GLB/placement study.
- Animated seating of groups; rendered wheel rotation and fork travel.
- Embedded Rapier **0.12.0** WASM; 1/120 s fixed steps, force-limited differential
  drive, inertia and static obstacle contacts, fully dynamic compound ring tire.
- Known-map grid planning around solid miniature couches; ordered pose gates
  count laps. Targets are not interpolated into chassis poses.
- Explicit source/destination rail fixtures, fork fingers, side walls and raised
  lip. Tire pickup requires elevation and persistent fork contact. Carrying and
  release are checked from tire position/contact state. No dynamic tire pose
  writes, pickup parenting, weld, or hidden successful replay.
- Three laps, source pickup after lap 1, two carried laps, placement and parking.
- Editable mass, traction, friction, torque, speed, lift force and source offset;
  a changed assumption starts a fresh world. Missing-tire, weak-lift,
  misalignment, slippery and obstructed scenarios. Run JSON download.
- Historical Python traces kept separate. No historical mission result is
  transferred to this assembly. Catalog keeps archived price/pack quantities
  distinct from installed quantities. Third-party license text is embedded.

## Important scope boundaries

This is an **agent-authored hobby/learning study, not the whole validated robot
engineering system**. The successful live arena is **4.86 × 2.48 m**, not the
organizer's smaller competition field. Miniature couches are fictional demo
props. Existing competition geometry/replay is available separately and is not
live qualified. Navigation knows the map and has no camera perception. The
controller is the same JavaScript in browser and headless tests, **not a port
of, or parity proof for, the existing embedded firmware**.

The chassis is constrained to a level plane; traction is an applied-force model,
not independent rolling-wheel suspension. It cannot tip. The fork is ideal
kinematic position control with a payload-weight force gate, not an articulated
torque-controlled actuator/compliance model. Its contacts resolve dynamically
against the tire, but positional actuation is not a bound on collision forces.
The nominal run has obstacle/fixture bumps; it is not a collision-free
qualification. The tire's final fixture support can be tilted. A run passing
does not certify robustness outside its exact assumptions.

Battery and controller are generic packaging reservations, not selected parts.
Lift hardware is hypothetical. Motor shaft mating-length discrepancy, omitted
mounting details and the historic 7.8 mm versus 8 mm motor-gap gate remain open.
No purchase-ready wiring, electrical safety analysis, hardware test, calibrated
friction/mass/inertia, final BOM, or competition scoring certification is claimed.
The GLB export covers the core CAD instances, not the procedural mechanism,
spacers and electronics reservations. Full arbitrary browser CadQuery editing
is not implemented: source edits regenerate in Python, while wheel diameter is
an explicitly labeled browser hypothesis preview.

## Build and test

Existing external cache paths are defaults; set `STUDIO_BUILD_DIR` to an npm
prefix containing three 0.170.0 and esbuild 0.24.0, and `STUDIO_PHYSICS_DIR` to a
prefix containing @dimforge/rapier3d-compat 0.12.0. Build rejects another Rapier
version. Dependency code and licenses are bundled into the HTML. Browser testing
supports `PLAYWRIGHT_PATH` and `CHROMIUM_PATH` for another local installation.

```sh
cd /workspace/ieee/ieee
uv run --offline --no-project --python 3.12 --with cadquery==2.8.0 python -B tools/build-cad-v11.py
node tools/export-assembly-v11.js
node tools/build-showcase-v11.js
node --test tests/live-physics-v11.test.js tests/showcase-v11.test.js tests/studio-dimensions-v11.test.js
node tools/check-live-v11.js
node tools/check-showcase-v11-browser.js
node tools/check-all.js --json /tmp/ieee-v11-full-check.json
```

`derived/showcase-v11/live-validation.json` records exact physical inputs,
outcomes, contacts, timestamps and events, including failures. Browser validation
uses offline `file:` loading and advances the identical live model to completion;
it also waits for assembly-to-live transition in real animation frames. These
are agent-run tests, not owner-reviewed hardware evidence.