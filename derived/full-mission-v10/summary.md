# Full mission v10: summary

2026-11-04. Agent-run synthetic study, conservative envelope. The camera, start flag and lap line are not modeled, the plant has no sideways skid, and a touched vehicle neither resists nor moves.

| Set | Missions | Done | Parked | Laps with wall contact | Laps with vehicle contact | Least clearance (in) | Worst pose error (in) | Median finish (s) | Mean score-like |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| clean | 27 | 27 | 27 | 0 | 0 | 0.32 | 0.966 | 58.2 | 390 |
| vehicles | 20 | 20 | 20 | 0 | 60 | 0.33 | 1.09 | 58.83 | 285.75 |
| library | 32 | 32 | 32 | 0 | 0 | 0.261 | 1.863 | 63.38 | 390 |
| paths | 12 | 12 | 12 | 0 | 0 | 0.352 | 0.365 | 62.9 | 357.5 |

## Supervisor branches

| Set | Missions | Done | Parked | Laps with wall contact | Laps with vehicle contact | Least clearance (in) | Worst pose error (in) | Median finish (s) | Mean score-like |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| safe preset | 3 | 3 | 3 | 0 | 0 | 0.502 | 0.36 | 67.55 | 390 |
| drive-only preset | 3 | 3 | 3 | 0 | 0 | 0.352 | 0.3 | 59.45 | 325 |
| exchange fails | 3 | 3 | 3 | 0 | 0 | 0.416 | 0.365 | 66.65 | 325 |
| pit after lap 1 | 3 | 3 | 3 | 0 | 0 | 0.38 | 0.365 | 58.75 | 390 |
