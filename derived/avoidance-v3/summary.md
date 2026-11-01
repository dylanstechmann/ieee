# Ideal avoidance results

Agent-run hypothetical probes; nominal planning only, not hardware or competition qualification.

| Probe | Wall | Routes found | Sampled uncertainty passes / cases | Nominal positive interval bounds |
|---|---|---:|---:|---:|
| empty-control | inside-nominal | 3/3 | 117/117 | 3/3 |
| empty-control | inside-three-quarter | 3/3 | 117/117 | 3/3 |
| empty-control | outside | 3/3 | 117/117 | 3/3 |
| upper-lane-blocker | inside-nominal | 3/3 | 129/129 | 3/3 |
| upper-lane-blocker | inside-three-quarter | 3/3 | 129/129 | 3/3 |
| upper-lane-blocker | outside | 3/3 | 105/129 | 3/3 |
| pit-gate-blocker | inside-nominal | 3/3 | 126/129 | 3/3 |
| pit-gate-blocker | inside-three-quarter | 3/3 | 99/129 | 3/3 |
| pit-gate-blocker | outside | 3/3 | 90/129 | 3/3 |

Failed searches have no completed route and are excluded from uncertainty counts; inspect repairs for failure reason. A nominal detour is not a robust or legal mission.
