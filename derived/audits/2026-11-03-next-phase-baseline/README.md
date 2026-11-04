# Baseline check before the November 2026 next-phase work

November 3, 2026. Agent-run check of the unchanged repository (commit `6770864`) before any next-phase edit. It records software and artifact reproducibility only; nothing here is a physical test.

The new one-command runner was added as an untracked file and run once:

```sh
node tools/check-all.js --json check-all-baseline.json
```

Node v24.18.1 and CPython 3.12.16 (uv). Full results are in `check-all-baseline.json`.

| Stage | Result |
|---|---|
| Node tests, 32 files | 221 passed, 0 failed, 0 skipped (68.6 s) |
| Artifact verifiers | 17 of 18 passed. `verify-planner-diagnostics-v3` failed on its known stale input hash for `tools/avoidance-v3.js`. |
| Python unittest (`software/`) | 33 passed (3.5 s) |
| Working tree after the run | unchanged (tracked diff and untracked list identical) |
| Wall time | 288.5 s; `verify-connected-navigation-v3` (212.9 s) and `verify-stopping-dynamics-v6` (137.5 s) dominate |

The planner-diagnostics failure is resolved by a recorded input supersession in `../2026-11-03-planner-diagnostics-v3-input-supersession/`, without changing any sealed bytes.

The node suite regenerated `derived/drawing-layout-v3/layout.json` in place, byte-identically. That file is a pinned input of several sealed packages, so the same change set makes the test regenerate into a temporary directory and compare bytes instead.
