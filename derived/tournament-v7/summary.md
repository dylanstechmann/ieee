# Tournament model v7 — generated summary

agent-run planning arithmetic with illustrative probabilities; not measured, not a prediction. Rules: GM2-V3-2026-10-04 + GM1-V3-2026-09-18. Regenerate with `node tools/tournament-v7.js --write`.

| Profile (illustrative) | Single-match mean | P(single >= 300) | Best-of-3 mean | P(best-of-3 >= 300) | 2nd-best mean |
|---|---:|---:|---:|---:|---:|
| drive-only | 249.3 | 0.404 | 306.1 | 0.788 | 269.2 |
| full-mission-pit-after-lap-2 | 269.5 | 0.627 | 348.5 | 0.948 | 289.5 |
| full-mission-pit-after-lap-1 | 268.8 | 0.627 | 348.3 | 0.948 | 288.5 |

Break-even pit-stall probability (full mission vs drive-only): single-match mean 0.2279, best-of-3 mean 0.4899, best-of-3 P(>=300) 0.4201.

Single head-to-head (full mission vs drive-only): win 0.6578, tie 0.0263, loss 0.3159.

Per-match probability needed for at least one success in three Matches: 50% -> 0.2063; 80% -> 0.4152; 90% -> 0.5358; 95% -> 0.6316.

- Probabilities are conditional on reaching each phase; a failed phase ends the run with credits already earned.
- Pickup credit is kept only if the blue tire is still held (pRetain); retention after a pit stall is an interpretation.
- Skipping the exchange assumes the race still counts without tire credits; confirm in official Q&A before relying on it.
- Publicity (10) is excluded. Matches are treated as independent; learning between Matches is not modeled.
- Only mechanisms presented at Inspection may be added, removed or reconfigured between Matches (GM1 V3 §6.1).
