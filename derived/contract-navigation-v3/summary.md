# Route-contract comparison

Provisional center-region/gate contract; not official lap legality or hardware validation.

| Mode | Probe | Wall | Completed / attempted | Sampled pass / scheduled | Untested (search failures) | Interval-clear / tested |
|---|---|---|---:|---:|---:|---:|
| historical-nominal (3/3 contract-valid) | empty-control | inside-nominal | 3/3 | 117/117 | 0 | not recomputed |
| historical-nominal (3/3 contract-valid) | empty-control | inside-three-quarter | 3/3 | 117/117 | 0 | not recomputed |
| historical-nominal (3/3 contract-valid) | empty-control | outside | 3/3 | 117/117 | 0 | not recomputed |
| historical-nominal (0/3 contract-valid) | upper-lane-blocker | inside-nominal | 3/3 | 129/129 | 0 | not recomputed |
| historical-nominal (0/3 contract-valid) | upper-lane-blocker | inside-three-quarter | 3/3 | 129/129 | 0 | not recomputed |
| historical-nominal (0/3 contract-valid) | upper-lane-blocker | outside | 3/3 | 105/129 | 0 | not recomputed |
| historical-nominal (0/3 contract-valid) | pit-gate-blocker | inside-nominal | 3/3 | 126/129 | 0 | not recomputed |
| historical-nominal (0/3 contract-valid) | pit-gate-blocker | inside-three-quarter | 3/3 | 99/129 | 0 | not recomputed |
| historical-nominal (0/3 contract-valid) | pit-gate-blocker | outside | 3/3 | 90/129 | 0 | not recomputed |
| constrained-nominal | empty-control | inside-nominal | 3/3 | 117/117 | 0 | 117/117 |
| constrained-nominal | empty-control | inside-three-quarter | 3/3 | 117/117 | 0 | 117/117 |
| constrained-nominal | empty-control | outside | 3/3 | 117/117 | 0 | 117/117 |
| constrained-nominal | upper-lane-blocker | inside-nominal | 0/3 | 0/129 | 129 | 0/0 |
| constrained-nominal | upper-lane-blocker | inside-three-quarter | 0/3 | 0/129 | 129 | 0/0 |
| constrained-nominal | upper-lane-blocker | outside | 0/3 | 0/129 | 129 | 0/0 |
| constrained-nominal | pit-gate-blocker | inside-nominal | 0/3 | 0/129 | 129 | 0/0 |
| constrained-nominal | pit-gate-blocker | inside-three-quarter | 0/3 | 0/129 | 129 | 0/0 |
| constrained-nominal | pit-gate-blocker | outside | 0/3 | 0/129 | 129 | 0/0 |
| constrained-variants | empty-control | inside-nominal | 3/3 | 117/117 | 0 | 117/117 |
| constrained-variants | empty-control | inside-three-quarter | 3/3 | 117/117 | 0 | 117/117 |
| constrained-variants | empty-control | outside | 3/3 | 117/117 | 0 | 117/117 |
| constrained-variants | upper-lane-blocker | inside-nominal | 0/3 | 0/129 | 129 | 0/0 |
| constrained-variants | upper-lane-blocker | inside-three-quarter | 0/3 | 0/129 | 129 | 0/0 |
| constrained-variants | upper-lane-blocker | outside | 0/3 | 0/129 | 129 | 0/0 |
| constrained-variants | pit-gate-blocker | inside-nominal | 0/3 | 0/129 | 129 | 0/0 |
| constrained-variants | pit-gate-blocker | inside-three-quarter | 0/3 | 0/129 | 129 | 0/0 |
| constrained-variants | pit-gate-blocker | outside | 0/3 | 0/129 | 129 | 0/0 |

Unplanned cases remain in scheduled denominator, not counted as measured collisions. Interval-clear counts address geometry only; docking is a separate sampled metric. Historical baseline: 96 failed / 1125 cases.
