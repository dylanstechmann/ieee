# Electrical selection v6 — requirements and conditional candidates

Agent-built hobby/learning engineering package; **no final hardware release**. V5 viewer/dynamics and older simulators remain unchanged.

- requirements.md: encoder edge-rate calculations, proposed GPIO/timing, voltage/current evidence boundaries and mechanism-interface unknowns.
- candidates.md: driver/controller/power matrix, conditional preferences, rejections and reversal evidence.
- report.json: machine-readable screens; conditional is not pass.
- manifest.json: input/output and preserved-viewer hashes.
- ../../sources/electrical-2026-10-31/index.json: archived manufacturer provenance and failed fetches.

Regenerate from /workspace/ieee/ieee: node tools/electrical-selection-v6.js
Verify: node tools/verify-electrical-selection-v6.js
Test: node --test tests/electrical-selection-v6.test.js

Scope completed: electrical requirements/candidate comparison. Mechanism-envelope study, coast/brake variants and Integration Studio remain subsequent work. No new browser bundle or physical measurement was created.
