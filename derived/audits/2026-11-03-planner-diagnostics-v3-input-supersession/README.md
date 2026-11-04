# Planner-diagnostics v3: recorded input supersession

November 3, 2026. Agent-run audit for the owner's hobby/learning project. The sealed `derived/planner-diagnostics-v3` package was not changed.

## Problem

`tools/verify-planner-diagnostics-v3.js` had failed since October 30. Its sealed `report.json` records `tools/avoidance-v3.js` at SHA-256 `239992278bf2…`, but the file was edited about 16 minutes after the report was written and now hashes to `299014f3a808…`. The pre-edit source survives nowhere: git history starts November 1. Resealing would cascade, because `derived/connected-navigation-v3/baseline-manifest.json` pins this report.

## Resolution

`record.json` documents the change. Through `tools/input-supersession.js`, the verifier accepts this one input only when both conditions hold:
- the sealed report still records `239992278bf2…`;
- the current file hashes to exactly `299014f3a808…`.

Every other input stays strict, and any further edit to `tools/avoidance-v3.js` fails again. `tests/input-supersession.test.js` covers the acceptance rule and its rejections.

## Evidence that the outputs did not change

```sh
node tools/verify-planner-diagnostics-v3.js --reproduce
```

Run on 2026-11-03 with Node v24.18.1. This mode re-runs `runDiagnostics` with the current sources and re-attaches the sealed `input_hashes` last. Result:
- `report.json` byte-identical;
- `summary.md` byte-identical;
- all 48 SVGs byte-identical;
- wall time 3 min 9 s.

The default verifier mode, without `--reproduce`, takes about 13 s and is what `node tools/check-all.js` runs; `--full` adds the reproduction.

This establishes that the edit did not affect this package's outputs. It does not reconstruct the edit itself.
