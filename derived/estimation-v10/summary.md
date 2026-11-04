# Estimation v10: summary

2026-11-04. Agent-run synthetic evaluation, seeds 100-119. The robot steers from an EKF estimate; contacts and parking use the true pose. Sensor parameters are placeholders (encoder slip 2%, gyro bias 0.01 rad/s, ToF noise 0.3 in, 5% dropout) and the map is perfect.

| Condition | Sensing | Completed | Parked | Laps with wall contact | Median RMS error (in) | Worst max error (in) | Worst heading error (deg) | Mean score-like |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| empty | full | 20/20 | 20 | 0 | 0.114 | 0.701 | 1.59 | 367.25 |
| empty | ranges_only | 20/20 | 20 | 0 | 0.117 | 0.689 | 1.71 | 367.25 |
| empty | lines_only | 0/20 | 0 | 52 | 7.412 | 51.577 | 123.26 | 313.25 |
| empty | odometry_only | 2/20 | 2 | 44 | 8.253 | 52.417 | 97.73 | 320.75 |
| aligned_vehicles | full | 20/20 | 20 | 26 | 0.126 | 0.774 | 1.98 | 266.25 |
| aligned_vehicles | ranges_only | 20/20 | 20 | 26 | 0.124 | 0.799 | 2.24 | 266.25 |
| aligned_vehicles | lines_only | 8/20 | 8 | 56 | 4.671 | 46.703 | 92.48 | 234.75 |
| aligned_vehicles | odometry_only | 0/20 | 0 | 49 | 10.619 | 57.234 | 126.09 | 234 |

## Reading this

- **Low range sensing against walls and dividers carries the estimate in this model.** With ranges, errors stay well under an inch; odometry alone drifts by many inches over a mission.
- **Reflectance with naive nearest-edge matching is not enough by itself.** The band is 0.9 in wide, so once the error passes about half an inch a crossing can be matched to the wrong edge. Line sensing still matters for lap and finish detection and could be used better, for example with crossing-event logic at known places.
- **The model is optimistic about ranging:** perfect map, clean returns, gating of vehicle hits. Bench tests on real field paint, divider faces and the official vehicles (P6) decide the real sensor suite.
