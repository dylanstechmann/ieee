# Order A Mule Studio v0.4

Open `/workspace/ieee/ieee/share/Mule-Studio-v4.html` directly in a WebGL-capable browser. The standalone file is offline; no server, packages, accounts, external models or fonts are required.

## What it does

- Visualizes the selected #4754 / 80 mm / machined-bracket mule with a 5 mm deck, hubs, support casters and twelve conceptual motor/encoder leads.
- Exposes 18 configurations: three motor ratios, 80/76.2 mm wheels and dual/front/rear support.
- Recalculates speed/torque margins, encoder quantization and nominal geometry for each selection.
- Flags the longer #4755 motor's 3 mm body gap and the 76.2 mm wheel's −1.975 mm caster-contact mismatch instead of silently accepting them.
- Provides orbit/detail/top cameras, X-ray deck and exploded separation. Exploding hides leads rather than leaving false connections.

## Evidence boundary

This is an agent-authored digital prototype for the owner's hobby/learning project. It is not vendor-certified CAD, a fabrication release, a supplier order, a production harness or physical validation. Driver, battery and controller remain unselected. Verify received parts and complete E02/E03 before promoting a configuration.

## Rebuild and verify

From `/workspace/ieee/ieee`:

```sh
node tools/build-mule-studio-v4.js
node tools/verify-mule-studio-v4.js
node --test tests/mule-studio-v4.test.js
```

Saved evidence is under `/workspace/ieee/ieee/derived/mule-studio-v4/`: default/top/substitution screenshots, browser diagnostics and input/output freshness hashes. Browser validation recorded zero JavaScript errors; two WebGL ReadPixels performance warnings occurred during screenshots.
