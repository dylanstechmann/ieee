# Navigation packaging / obstacle stress results

Agent-run hypothetical engineering probes; not measured field or hardware results.

| Envelope | Obstacle case | Nominal collision-free / total | Nominal docking >75% / total | Sampled stress passes / cases | Nominal positive interval bounds / total | Worst sampled clearance (in) |
|---|---|---:|---:|---:|---:|---:|
| baseline-10x10 | empty-control | 9/9 | 9/9 | 351/351 | 9/9 | 0.262 |
| baseline-10x10 | off-route-control | 9/9 | 9/9 | 387/387 | 9/9 | 0.262 |
| baseline-10x10 | upper-lane-blocker | 0/9 | 9/9 | 0/387 | 0/9 | 0.000 |
| baseline-10x10 | pit-gate-blocker | 0/9 | 9/9 | 0/387 | 0/9 | 0.000 |
| front-extension-1in | empty-control | 9/9 | 9/9 | 195/351 | 6/9 | -0.736 |
| front-extension-1in | off-route-control | 9/9 | 9/9 | 231/387 | 6/9 | -0.736 |
| front-extension-1in | upper-lane-blocker | 0/9 | 9/9 | 0/387 | 0/9 | -0.736 |
| front-extension-1in | pit-gate-blocker | 0/9 | 9/9 | 0/387 | 0/9 | -0.736 |
| side-extension-1in | empty-control | 9/9 | 9/9 | 216/351 | 9/9 | -0.355 |
| side-extension-1in | off-route-control | 9/9 | 9/9 | 252/387 | 9/9 | -0.355 |
| side-extension-1in | upper-lane-blocker | 0/9 | 9/9 | 0/387 | 0/9 | -0.355 |
| side-extension-1in | pit-gate-blocker | 0/9 | 9/9 | 0/387 | 0/9 | -0.355 |
| front-and-side-extension-1in | empty-control | 3/9 | 9/9 | 60/351 | 0/9 | -1.030 |
| front-and-side-extension-1in | off-route-control | 3/9 | 9/9 | 72/387 | 0/9 | -1.030 |
| front-and-side-extension-1in | upper-lane-blocker | 0/9 | 9/9 | 0/387 | 0/9 | -1.030 |
| front-and-side-extension-1in | pit-gate-blocker | 0/9 | 9/9 | 0/387 | 0/9 | -1.030 |

Stress pass requires sampled collision clearance AND >75% docking overlap. Nominal collision-free counts do not imply docking success. Interval bounds are nominal only; a failed bound is inconclusive unless a collision is detected. See report.json for docking, collisions, unresolved intervals, and variant failure examples.
