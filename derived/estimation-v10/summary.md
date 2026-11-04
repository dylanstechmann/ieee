# Estimation v10: summary

2026-11-04. Agent-run synthetic evaluation, seeds 100-119. The robot steers from an EKF estimate; contacts and parking use the true pose. Sensor parameters are placeholders (encoder slip 2%, gyro bias 0.01 rad/s, gyro scale 1%, ToF noise 0.3 in, 5% dropout) and the map is perfect. The estimator matches each line crossing to a ring by direction and color, and learns the gyro bias whenever both wheels are still.

| Condition | Sensing | Completed | Parked | Laps with wall contact | Median RMS error (in) | Worst max error (in) | Worst heading error (deg) | Mean score-like |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| empty | full | 20/20 | 20 | 0 | 0.122 | 0.712 | 1.4 | 367.25 |
| empty | ranges_only | 20/20 | 20 | 0 | 0.12 | 0.789 | 1.67 | 367.25 |
| empty | lines_only | 15/20 | 15 | 11 | 0.774 | 14.204 | 18.67 | 355.25 |
| empty | odometry_only | 6/20 | 6 | 31 | 3.451 | 19.266 | 22.52 | 333.5 |
| aligned_vehicles | full | 20/20 | 20 | 26 | 0.124 | 0.771 | 2.19 | 266.25 |
| aligned_vehicles | ranges_only | 20/20 | 20 | 26 | 0.126 | 0.797 | 2.55 | 266.25 |
| aligned_vehicles | lines_only | 18/20 | 18 | 32 | 0.621 | 17.97 | 23.07 | 260.25 |
| aligned_vehicles | odometry_only | 3/20 | 3 | 52 | 4.699 | 20.865 | 23.49 | 234 |

## Ablation, empty field

"Calibrated scale" leaves 10% of the gyro scale error. "5 s wait" holds the robot still before the mission. The odometry rows above "stillness" switch stillness updates off.

| Sensing | Variant | Completed | Median RMS error (in) | Worst max error (in) | Median heading error (deg) | Worst heading error (deg) |
|---|---|---:|---:|---:|---:|---:|
| odometry_only | all errors | 2/20 | 8.253 | 52.417 | 32.41 | 97.73 |
| odometry_only | no gyro bias | 6/20 | 3.524 | 15.82 | 6.72 | 19.64 |
| odometry_only | no gyro scale error | 3/20 | 8.74 | 55.708 | 32.42 | 102.21 |
| odometry_only | no wheel scale error | 1/20 | 9.196 | 52.274 | 32.72 | 100.54 |
| odometry_only | no gyro bias or scale error | 19/20 | 0.914 | 4.152 | 2.41 | 5.27 |
| odometry_only | none of the three | 19/20 | 0.89 | 3.81 | 2.29 | 4.19 |
| odometry_only | stillness | 6/20 | 3.451 | 19.266 | 9.52 | 22.52 |
| odometry_only | stillness, 5 s wait | 5/20 | 4.062 | 16.859 | 7.29 | 21.02 |
| odometry_only | stillness, calibrated scale | 10/20 | 1.733 | 13.395 | 8.07 | 17.45 |
| odometry_only | stillness, 5 s wait, calibrated scale | 13/20 | 1.433 | 6.934 | 5.02 | 11.37 |
| lines_only | ring, stillness, calibrated scale | 16/20 | 0.435 | 17.368 | 2.32 | 27.15 |
| lines_only | ring, stillness, 5 s wait, calibrated scale | 20/20 | 0.514 | 5.522 | 2.28 | 6.83 |
| lines_only | nearest | 0/20 | 7.412 | 51.577 | 20.38 | 123.26 |
| lines_only | nearest, stillness | 7/20 | 2.651 | 11.8 | 7.21 | 16.7 |
| lines_only | nearest, stillness, 5 s wait | 9/20 | 2.267 | 11.045 | 6.0 | 16.66 |
| lines_only | ring | 10/20 | 2.087 | 31.17 | 7.32 | 77.51 |
| lines_only | ring, stillness | 15/20 | 0.774 | 14.204 | 4.15 | 18.67 |
| lines_only | ring, stillness, 5 s wait | 15/20 | 0.726 | 24.668 | 3.73 | 36.68 |
| full | nearest | 20/20 | 0.114 | 0.701 | 1.02 | 1.59 |
| full | nearest, stillness | 20/20 | 0.115 | 0.723 | 0.95 | 1.64 |
| full | nearest, stillness, 5 s wait | 20/20 | 0.116 | 0.837 | 0.91 | 3.12 |
| full | ring | 20/20 | 0.121 | 0.729 | 1.01 | 1.72 |
| full | ring, stillness | 20/20 | 0.122 | 0.712 | 0.91 | 1.4 |
| full | ring, stillness, 5 s wait | 20/20 | 0.112 | 0.811 | 0.93 | 1.68 |

The model is optimistic about ranging: perfect map, clean returns, gating of vehicle hits. Bench tests on real field paint, divider faces and the official vehicles (P6) decide the real sensor suite. See `README.md` for what these rows suggest.
