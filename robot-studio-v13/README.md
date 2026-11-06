# Robot Studio v13

Agent-authored, source-evidenced CAD viewer and reduced-order Rapier contact study for the personal IEEE SoutheastCon hobby/learning project. **Nothing here is a measured, fabricated or competition-qualified robot.**

The deliverable is **`share/Showcase-v13.html`**: one self-contained offline document with embedded geometry, dependencies, licenses, provenance, fit results, historical replay and live physics. Open it with a `file:` URL; no server or network connection is required.

## Share it without a LAN

The reliable iPhone path is to **host the file once at a public static URL, then send that link**. Recipients only open the URL in Safari; they do not run a server, join a network, or install anything. `share/HOST-V13.txt` gives concise Netlify Drop, GitHub Pages, and existing-Alibaba-server options.

iOS Files, Mail and Messages previews can render the static page but do not execute the studio's JavaScript/WebGL, which is why the raw file looks incomplete there. Once the public URL is open in Safari, recipients can tap **Share → Add to Home Screen** for an app-like launch. The build now declares the iPhone web-app title and status-bar style. Safari needs WebGL2 (iOS 15 or newer); older systems show an explicit WebGL2 diagnostic instead of a silent empty canvas. Small compatibility shims cover `structuredClone`, `Array.prototype.at` and `replaceChildren` for Safari 15.0–15.3.

For development-only local preview, a temporary LAN server is still available:

```sh
cd /path/to/ieee/share
python3 -m http.server 8000
# macOS LAN address: ipconfig getifaddr en0
# Windows LAN address: ipconfig
```

Then open `http://<laptop-lan-address>:8000/Showcase-v13.html` on the iPhone. Public hosting, not this temporary server, is the intended sharing path. The compatibility cases were validated in headless Chromium with those APIs removed, not on physical iPhone hardware.

## Controls

- **Assemble → live mission:** seats all 34 part instances, then starts the live world.
- **Live physics arena:** run, pause, reset, choose the enlarged demo or organizer-CAD study, select failure scenarios, change speed, follow the robot and display collision geometry.
- **Assembly inspection:** orbit the detailed assembly at its zero-joint datum. Aspect-ratio-aware bounds keep the complete assembly or selected part in frame and refit on resize. Part buttons and rendered-part selection show source evidence and omissions.
- **Historical simulated mission:** play, seek and reset the preserved v10 traces. These traces are separate from v13 physics.
- **Shaft study:** switch between the default published **16 mm** derivative and separate archived **22 mm** vendor-CAD comparison. The change rebuilds the assembly and resets live identity.
- **Editable physical assumptions:** changing a value resets the live world. Simulation speed changes presentation rate, not the fixed **1/120 s** physics step.
- **Download run JSON:** exports the actual current state, assembly ID/hash, arena, physical profile and parameter values.

For scripted visual inspection, `robotStudioV13.focusPart('motor')` frames a part and `robotStudioV13.showAll()` restores the assembly. Both return projected bounds, and `getDiagnostics()` exposes the latest framing plus current identity, joint, contact and mission state. `advanceLive(n)` advances at most `n` fixed steps without changing the physics implementation.

## Source modules

| File | Responsibility |
|---|---|
| `app.js` | Three.js scene, detailed GLB instances, datum-correct part focus, assembly variants, replay and public diagnostics |
| `assembly-spec.js` | Validation, millimetre-to-metre resolution, joint transforms and named collider registry |
| `physics.js` | Rapier world, force-based chassis controller, ideal lift/gate, dynamic tire and contact evidence |
| `live-view.js` | Rendering consumption of physics state, assembly sequence, telemetry and run export |
| `panel.html` | Workspace controls and evidence boundary |
| `panel.css` | Responsive instrument-panel layout, status hierarchy and contained legacy-page overflow |
| `physical-evidence.json` | Assumptions, limitations and credits shared by viewer and reports |

CAD definitions are in `cad-v13/`; generated native-scale assets and assembly specifications are in `derived/cad-v13/`. Manufacturer STEP/PDF inputs are read-only references. Purchased geometry is not rescaled, and the 16 mm derivative changes only the isolated shaft region.

## Build and verify

Use the repository's existing cached/pinned tools. Build order matters because the HTML embeds generated artifacts:

```sh
uv run --offline --no-project --python 3.12 --with cadquery==2.8.0 \
  --with cascadio==0.1.1 --with trimesh==5.2.0 python -B tools/build-cad-v13.py
uv run --offline --no-project --python 3.12 --with cadquery==2.8.0 \
  --with cascadio==0.1.1 --with trimesh==5.2.0 python -B tools/check-fit-v13.py
node tools/export-assembly-v13.js
node tools/check-live-v13.js
node tools/build-showcase-v13.js
```

Read-only checks and offline browser validation:

```sh
node --test tests/assembly-spec-v13.test.js tests/showcase-v13.test.js tests/live-physics-v13.test.js
node tools/verify-cad-v13.js
node tools/check-showcase-v13-browser.js
node tools/summarize-v13-validation.js
```

The browser script uses Playwright/Chromium with networking disabled. It writes `derived/showcase-v13/browser-validation.json` and 16 screenshots. It checks all 11 selectable part types, both shaft variants, current world-matrix part framing, post-mission joint reset, run identity/download, pause, nominal completion, missing-tire and organizer failures, and narrow layout.

## Dependencies and credits

- **Three.js 0.170.0** — detailed GLB rendering and assembly export.
- **Rapier 0.12.0** — fixed-step contact simulation; identical module in browser and headless checks.
- **esbuild 0.24.0** — offline IIFE bundle generation.
- **CadQuery/OpenCASCADE, cascadio and trimesh** — open-source solid conversion and metrology.
- **Pololu** — product pages, drawings and archived manufacturer STEP geometry; manufacturer data is not relicensed as project-owned open source.
- **IEEE SoutheastCon organizers** — separate archived field reference.

Three.js and Rapier license texts are embedded in the HTML. Build dependency versions and SHA-256 hashes are in `derived/showcase-v13/build-manifest.json`.

## Evidence boundary

The nominal demo and 0.12 kg tire study pass; missing tire, weak lift, misalignment and organizer acquisition fail. The **7.8 mm motor gap still fails** the 8 mm project gate, and the **16/22 mm source conflict remains unresolved**. The 21-pose gate check is not a continuous collision certificate.

The chassis cannot tip, wheel suspension and motor electrical dynamics are absent, and lift/gate actuation is ideal. Proposed source/destination rails are not official tire hardware. No actuator sizing, structural approval, received-part metrology, scoring claim or physical validation follows from a digital pass. See `docs/mechanical-readiness-v13.md` for the full readiness assessment.
