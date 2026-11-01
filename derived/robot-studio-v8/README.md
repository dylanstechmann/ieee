# Robot Studio v8 — consolidated digital study

Open `share/Robot-Studio-v8.html` directly in a WebGL-capable browser. It is a single offline HTML file. This is AI-assisted engineering for the owner's hobby/learning project, not hardware validation, a competition-legality ruling or a fabrication release.

## What it consolidates

- **Assembly + field:** Robot Studio v7's three.js renderer and Pololu vendor CAD for the Order A motor, bracket, hub, wheel and caster; organizer tire STL; decoded tagStandard41h12 bits; dimensioned and explicitly approximate field elements.
- **Stopping:** the unchanged v6.1 selected-#4754 dataset: 56 trajectories, seven scenarios, four generic output modes and two motor-loss assumptions. Both assumptions conflict with some manufacturer data; their spread is not a confidence interval.
- **Mechanism:** the unchanged v6 dataset: 162 cases and 2,970 frames for passive fork, guided-bore and OD-gripper concepts. The stationary-tire presentation retains the source-relative contacts. No acquisition, retention or mechanism selection is claimed.
- **Evidence:** the earlier multi-model document review, navigation limitations, AprilTag findings and unresolved physical/Q&A gates are summarized in the application.

The original v3–v7 viewers and sealed packages are preserved. v8 does not overwrite them or silently rewrite their inputs.

## Important compatibility boundary

Vendor CAD gives a **202 mm track** and exposes a **7.09 mm wheel/support mismatch** in the kit-as-drawn. The historical v5/v6 dynamics and mechanism packages use a **176 mm track** and the old mule envelope. v8 displays those studies with an explicit warning; it does **not** present them as corrected dynamics or mount the old mechanism on the corrected CAD assembly.

The shaft-down assembly is a proposed CAD correction, not a released deck. Measure received parts, review fit and choose a configuration before fabrication. The mule is not the competition robot: the latter needs a legal lower-body envelope, full sensing, tire handling and mission integration.

The assembly drive is a kinematic illustration, not a legal-lap plan or the v5 dynamics model. Earlier navigation packages remain conditional geometric studies, not validated autonomous missions.

## Rebuild and verify

From `/workspace/ieee/ieee`:

```sh
node tools/build-robot-studio-v8.js
node tools/check-robot-studio-v8-browser.js
node tools/verify-robot-studio-v8.js
node --test tests/robot-studio-v8.test.js
```

The build uses the already-installed three.js 0.170.0 and esbuild 0.24.0 toolchain in `~/.cache/ieee-studio-v7-build`. The browser script uses the existing Playwright installation and Chromium headless shell; `PLAYWRIGHT_PATH` and `CHROMIUM_PATH` can override their locations. It loads the standalone through `file://` with an offline browser context, exercises actual controls, renders every mechanism case at three samples and every stopping run, and captures screenshots. Browser evidence is hash-bound to the final HTML.

Useful URL parameters: `workspace=assembly|stopping|mechanism|evidence`, `view=hero|motor|contact|field|top|follow|study`, `config=kit-as-drawn|shaft-up|shaft-down`, `case=0..161`, `sample=N`, `tag=1|2|3`, `panels=0`.

## Validation recorded

`browser-validation.json` is bound to the delivered HTML by SHA-256. Offline Chromium completed 486 mechanism-frame checks (every case at its actual first, middle and final samples), 56 stopping-run checks and actual workspace/select/step interactions. It captured four screenshots with zero JavaScript errors, zero console warnings and no external requests. Real-GPU frame rate, mobile layout and physical behavior were not tested. The Node verifier independently checks deterministic rebuilding, all 2,970 source-relative presentation frames, tire-mesh finiteness, provenance hashes and browser evidence.

## Evidence still needed

- Official Q&A and current manual check; no organizer response is inferred.
- Received-part measurements and an approved bench setup.
- A canonical corrected robot assembly feeding future dynamics, navigation and rendering.
- A legal-envelope competition mockup, real tire acquisition/retention trials and closed-loop field tests.
- Real camera/optics, tag glare, obstacle geometry and installed field measurements.
