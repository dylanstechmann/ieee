# Avoiding v12: fixed blends vs vehicle-timed blends vs sensed

2026-11-06. Agent-run synthetic study (seeds 100-119). `v10_blend` keeps the pinned 12 in entry/exit blends; `oracle` and `sensed` reach each lane before the vehicle's padded near edge (`lane_profile`), the latter from the range-ring map. Lap 1 is a discovery lap for `sensed`.

| lane_source | yaw | footprint | pose | completed | contact-free runs | contact-free laps (1/2/3) | laps w/ vehicle | laps w/ wall | mean infeasible |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| v10_blend | aligned | 10.0 | true_pose | 20/20 | 0 | 0/0/0 | 60 | 24 | 0.0 |
| v10_blend | aligned | 10.0 | ekf_pose | 20/20 | 0 | 0/0/0 | 60 | 26 | 0.0 |
| v10_blend | aligned | 8.0 | true_pose | 20/20 | 0 | 0/0/0 | 60 | 18 | 0.0 |
| v10_blend | aligned | 8.0 | ekf_pose | 20/20 | 0 | 0/0/0 | 60 | 19 | 0.0 |
| v10_blend | aligned | 6.0 | true_pose | 20/20 | 0 | 0/0/0 | 60 | 0 | 0.0 |
| v10_blend | aligned | 6.0 | ekf_pose | 20/20 | 0 | 0/0/0 | 60 | 0 | 0.0 |
| v10_blend | random | 10.0 | true_pose | 20/20 | 0 | 0/0/0 | 60 | 9 | 0.0 |
| v10_blend | random | 10.0 | ekf_pose | 20/20 | 0 | 0/0/0 | 60 | 9 | 0.0 |
| v10_blend | random | 8.0 | true_pose | 20/20 | 0 | 0/0/0 | 60 | 9 | 0.0 |
| v10_blend | random | 8.0 | ekf_pose | 20/20 | 0 | 0/0/0 | 60 | 8 | 0.0 |
| v10_blend | random | 6.0 | true_pose | 20/20 | 0 | 0/0/0 | 60 | 9 | 0.0 |
| v10_blend | random | 6.0 | ekf_pose | 20/20 | 0 | 0/0/0 | 60 | 8 | 0.0 |
| oracle | aligned | 10.0 | true_pose | 20/20 | 0 | 0/0/0 | 60 | 21 | 2.2 |
| oracle | aligned | 10.0 | ekf_pose | 20/20 | 0 | 0/0/0 | 60 | 22 | 2.2 |
| oracle | aligned | 8.0 | true_pose | 20/20 | 0 | 0/0/0 | 60 | 18 | 1.65 |
| oracle | aligned | 8.0 | ekf_pose | 20/20 | 0 | 0/0/0 | 60 | 18 | 1.65 |
| oracle | aligned | 6.0 | true_pose | 20/20 | 0 | 0/0/0 | 60 | 6 | 1.3 |
| oracle | aligned | 6.0 | ekf_pose | 20/20 | 0 | 0/0/0 | 60 | 6 | 1.3 |
| oracle | random | 10.0 | true_pose | 20/20 | 0 | 0/0/0 | 60 | 3 | 2.7 |
| oracle | random | 10.0 | ekf_pose | 20/20 | 0 | 0/0/0 | 60 | 4 | 2.7 |
| oracle | random | 8.0 | true_pose | 20/20 | 0 | 0/0/0 | 60 | 6 | 2.45 |
| oracle | random | 8.0 | ekf_pose | 20/20 | 0 | 0/0/0 | 60 | 6 | 2.45 |
| oracle | random | 6.0 | true_pose | 20/20 | 0 | 0/0/0 | 60 | 6 | 2.05 |
| oracle | random | 6.0 | ekf_pose | 20/20 | 0 | 0/0/0 | 60 | 6 | 2.05 |
| sensed | aligned | 10.0 | true_pose | 19/20 | 0 | 0/0/1 | 59 | 7 | 7.75 |
| sensed | aligned | 10.0 | ekf_pose | 18/20 | 0 | 0/0/1 | 59 | 8 | 7.85 |
| sensed | aligned | 8.0 | true_pose | 16/20 | 0 | 0/0/2 | 58 | 13 | 7.9 |
| sensed | aligned | 8.0 | ekf_pose | 16/20 | 0 | 0/0/1 | 59 | 8 | 8.05 |
| sensed | aligned | 6.0 | true_pose | 14/20 | 0 | 0/0/4 | 56 | 6 | 8.0 |
| sensed | aligned | 6.0 | ekf_pose | 14/20 | 0 | 0/0/5 | 55 | 4 | 8.05 |
| sensed | random | 10.0 | true_pose | 18/20 | 0 | 0/0/2 | 58 | 15 | 8.7 |
| sensed | random | 10.0 | ekf_pose | 18/20 | 0 | 0/0/2 | 58 | 14 | 8.35 |
| sensed | random | 8.0 | true_pose | 18/20 | 0 | 0/0/1 | 59 | 13 | 8.75 |
| sensed | random | 8.0 | ekf_pose | 17/20 | 0 | 0/0/1 | 59 | 11 | 8.45 |
| sensed | random | 6.0 | true_pose | 18/20 | 0 | 0/0/1 | 59 | 7 | 9.0 |
| sensed | random | 6.0 | ekf_pose | 16/20 | 0 | 0/0/2 | 58 | 5 | 8.45 |
