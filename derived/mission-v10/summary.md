# Mission v10 evaluation: summary

2026-11-04. Agent-run synthetic evaluation on the reserved evaluation seeds 100-119. Each seed gives a different random layout, assigned box and exchange outcome (70% success). Kinematic robot, perfect knowledge, guide-size vehicles, and assumed lap and pit routes (QA05, QA06).

| Condition | Preset | Speed | Completed | Parked | Finish median / max (s) | Under 165 s | Vehicle-contact-free runs | Laps with wall contact | Mean score-like |
|---|---|---|---:|---:|---|---:|---:|---:|---:|
| empty | aggressive | v9 | 20/20 | 20 | 76.72 / 85.65 | 20 | 20 | 0 | 367.25 |
| empty | aggressive | nominal | 20/20 | 20 | 54.85 / 63.4 | 20 | 20 | 0 | 367.25 |
| empty | safe | v9 | 20/20 | 20 | 86.7 / 88.15 | 20 | 20 | 0 | 367.25 |
| empty | safe | nominal | 20/20 | 20 | 61.0 / 61.9 | 20 | 20 | 0 | 367.25 |
| aligned_vehicles | aggressive | v9 | 20/20 | 20 | 109.58 / 116.3 | 20 | 0 | 24 | 267.75 |
| aligned_vehicles | aggressive | nominal | 20/20 | 20 | 80.18 / 84.8 | 20 | 0 | 24 | 267.75 |
| aligned_vehicles | safe | v9 | 20/20 | 20 | 117.42 / 131.5 | 20 | 0 | 24 | 267.75 |
| aligned_vehicles | safe | nominal | 20/20 | 20 | 82.75 / 91.75 | 20 | 0 | 24 | 267.75 |
| random_yaw_vehicles | aggressive | v9 | 20/20 | 20 | 103.68 / 122.05 | 20 | 0 | 9 | 282.25 |
| random_yaw_vehicles | aggressive | nominal | 20/20 | 20 | 73.88 / 88.35 | 20 | 0 | 9 | 282.25 |
| random_yaw_vehicles | safe | v9 | 20/20 | 20 | 117.25 / 128.85 | 20 | 0 | 9 | 282.25 |
| random_yaw_vehicles | safe | nominal | 20/20 | 20 | 82.72 / 90.3 | 20 | 0 | 9 | 282.25 |

## Reading this

- **Empty field:** shows the route, follower and supervisor working end to end. The v9 simulator needed 151-162 s at 8 in/s; v10's arc laps finish well inside 165 s.
- **With guide-size vehicles:** almost no run is contact-free, matching the lap study. The contact policy keeps the robot moving, so finishing, parking and the exchange are unaffected. Wall contacts come from lane transitions near walls when a vehicle blocks the inner lane, a real geometric squeeze.
- **Score-like totals** are event arithmetic on simulated runs, not referee results.
