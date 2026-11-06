# Session state — 2026-11-06, track 0 (repository reconciliation and release)

Agent-run housekeeping for the owner's hobby/learning project. No purchases, fabrication, organizer contact, or physical work.

## What changed

The working tree was on `next-phase-v10`, which had diverged from `main` (2 commits
ahead, 2 behind), and a large set of v11–v13 showcase/CAD artifacts (`cad-v13/`,
`derived/cad-v13/`, `docs/mechanical-readiness-v13.md`, a refined
`share/Showcase-v13.html`, updated `README.md`/`AGENTS.md`, `tools/*v13*`,
`tests/*v13*.test.js`, …) was uncommitted/untracked.

- `.gitignore` now excludes `*.tar.gz`, so the 92 MB
  `ieee-pre-consolidation-2026-11-01.tar.gz` backup stays out of git (the tracked
  `website-release.tar.gz` is unaffected).
- Committed the working-tree v13 refinements (`4442b80`).
- Merged `main` into the branch, resolving the single `README.md` conflict in favour
  of the richer current text (`ecdbc7f`).
- Fast-forwarded `main` to `ecdbc7f`; `next-phase-v10` points at the same commit.
- Pushed `main` to `origin/main` (`635a46e..ecdbc7f`).

## Validation

- `node tools/check-all.js --json /tmp/track0-check.json` → **PASS**, 36 steps:
  55 Node test files (289 tests), all 32 artifact verifiers (including the new
  `verify-cad-v13`), `software` Python (138), firmware host tests (67), and the
  working-tree-unchanged check. 170.3 s.
- `secrets-guard --worktree` reports one hit — a **false positive**: the substring
  "BSAGBb" on line 423 of `share/Showcase-v10.html` is inside a
  `data:image/png;base64,` data URI, not a real key. No rotation needed; the scanner
  regex matches base64 bytes. No other hits.

## Commit hashes

- `f4ce87e` gitignore: exclude archive tarballs
- `4442b80` consolidate v11-v13 source-evidenced showcase: CAD sources, derived artifacts, docs, tests and tools
- `ecdbc7f` merge main: reconcile v13 showcase release and shared release habit (now `main` and `origin/main`)

## Next

Track 1 — fully-sensed, obstacle-aware mission simulator (per `implementation_plan.md`):
camera/AprilTag, start-flag and lap-line sensor models, vehicle collision detection, and a
sensed-obstacle avoidance layer, producing sealed `derived/sensing-v11/` and
`derived/full-mission-v11/` packages. The sealed v10 outputs must remain byte-identical.