# Maneuver v10: summary

2026-11-04. Agent-run synthetic study. The plant has wheel slip but no sideways skid, parameters are placeholders, the map is perfect and vehicle lanes are assumed known.

## Timing

| Envelope | Lap (s) | Top speed (in/s) | U-turn speed (in/s) | Clean mission (s) |
|---|---:|---:|---:|---:|
| conservative | 9.123 | 16.781 | 10.966 | 59.757–62.926 |
| nominal | 8.284 | 17.862 | 11.672 | 56.169–59.338 |
| aggressive | 7.574 | 19.456 | 12.714 | 53.649–56.819 |

## Tracking: firmware loop on the plant, all 27 conditions

| Envelope | Finished | Worst cross-track (in) | Worst heading error (deg) | Least clearance (in) | Worst slip (in/s) | Peak supply (A) |
|---|---:|---:|---:|---:|---:|---:|
| conservative | 27/27 | 0.315 | 8.13 | 1.62 | 0.718 | 0.692 |
| nominal | 27/27 | 0.394 | 8.529 | 1.646 | 6.926 | 0.725 |
| aggressive | 27/27 | 0.426 | 9.484 | 1.614 | 10.06 | 0.803 |

## Speed cap, EKF in the loop

| Cap (in/s) | Plant | Finished | Lap (s) | Worst cross-track (in) | Least clearance (in) |
|---:|---|---:|---:|---:|---:|
| 8.0 | typical | 3/3 | 15.267 | 0.318 | 1.642 |
| 8.0 | weak | 3/3 | 15.35 | 0.294 | 1.575 |
| 10.0 | typical | 3/3 | 12.467 | 0.351 | 1.49 |
| 10.0 | weak | 3/3 | 12.567 | 0.27 | 1.47 |
| 12.0 | typical | 3/3 | 10.733 | 0.327 | 1.534 |
| 12.0 | weak | 3/3 | 10.817 | 0.255 | 1.481 |
| 14.0 | typical | 3/3 | 9.8 | 0.342 | 1.471 |
| 14.0 | weak | 3/3 | 9.9 | 0.318 | 1.439 |
| 16.0 | typical | 3/3 | 9.2 | 0.341 | 1.457 |
| 16.0 | weak | 3/3 | 9.3 | 0.308 | 1.457 |
| none | typical | 3/3 | 8.833 | 0.327 | 1.471 |
| none | weak | 3/3 | 8.917 | 0.331 | 1.434 |

## Pit legs, conservative envelope

Rounded legs ran on the weak, typical and strong plants and with the EKF steering on three seeds; the table gives the worst of those runs.

| Box | Leg | Form | Finished | Slowest time (s) | Worst cross-track (in) | Least driven clearance (in) |
|---:|---|---|---:|---:|---:|---:|
| 1 | ENTER | sharp corners, full speed | 1/1 | 3.355 | 0.665 | 1.659 |
| 1 | ENTER | rounded, 8 in/s | 6/6 | 4.14 | 0.438 | 1.29 |
| 1 | TO_PIT | sharp corners, full speed | 1/1 | 4.66 | 0.418 | 1.985 |
| 1 | TO_PIT | rounded, 8 in/s | 6/6 | 5.495 | 0.282 | 1.094 |
| 1 | EXIT_PIT | sharp corners, full speed | 1/1 | 13.23 | 2.923 | -0.951 |
| 1 | EXIT_PIT | rounded, 8 in/s | 6/6 | 8.69 | 0.475 | 1.294 |
| 2 | TO_PIT | sharp corners, full speed | 1/1 | 8.87 | 2.99 | 0.51 |
| 2 | TO_PIT | rounded, 8 in/s | 6/6 | 6.7 | 0.559 | 1.066 |
| 2 | EXIT_PIT | sharp corners, full speed | 1/1 | 8.07 | 2.808 | 1.401 |
| 2 | EXIT_PIT | rounded, 8 in/s | 6/6 | 6.79 | 0.553 | 1.302 |
| 3 | TO_PIT | sharp corners, full speed | 1/1 | 12.525 | 3.045 | -0.07 |
| 3 | TO_PIT | rounded, 8 in/s | 6/6 | 8.605 | 0.493 | 1.076 |
| 3 | EXIT_PIT | sharp corners, full speed | 1/1 | 4.5 | 0.621 | 1.668 |
| 3 | EXIT_PIT | rounded, 8 in/s | 6/6 | 5.44 | 0.34 | 1.263 |

## Passing: which line, driven with the EKF in the loop

| Policy | Laps | Unfinished | Laps with wall contact | Least driven clearance (in) | Planned clearance (in) | Median lap (s) |
|---|---:|---:|---:|---:|---:|---:|
| lanes | 96 | 0 | 0 | 1.304 | 1.456 | 9.6 |
| far side, 1.25 in | 96 | 0 | 31 | -0.964 | 0.09 | 11.225 |
| far side, 1.5 in | 96 | 0 | 31 | -0.831 | 0.371 | 11.35 |
| far side, 2.0 in | 96 | 0 | 13 | -0.358 | 0.938 | 11.15 |
| far side, 2.5 in | 96 | 0 | 3 | -0.207 | 1.451 | 11.25 |
| far side, 3.0 in | 96 | 0 | 0 | 0.484 | 1.451 | 11.15 |

Each driven lap is checked against 16 random placements per configuration. Points per lap are 15 x clear of walls + 25 x clear of vehicles.

| Vehicle size (share of guide size) | Policy | Clear of vehicles | Clear of walls | Clear of both | Points per lap |
|---:|---|---:|---:|---:|---:|
| 1.0 | lanes | 0.0 | 1.0 | 0.0 | 15.0 |
| 1.0 | far side, 1.25 in | 0.001 | 0.677 | 0.001 | 10.173 |
| 1.0 | far side, 1.5 in | 0.0 | 0.677 | 0.0 | 10.156 |
| 1.0 | far side, 2.0 in | 0.0 | 0.865 | 0.0 | 12.969 |
| 1.0 | far side, 2.5 in | 0.0 | 0.969 | 0.0 | 14.531 |
| 1.0 | far side, 3.0 in | 0.0 | 1.0 | 0.0 | 15.0 |
| 0.8 | lanes | 0.002 | 1.0 | 0.002 | 15.049 |
| 0.8 | far side, 1.25 in | 0.04 | 0.677 | 0.033 | 11.165 |
| 0.8 | far side, 1.5 in | 0.027 | 0.677 | 0.022 | 10.824 |
| 0.8 | far side, 2.0 in | 0.006 | 0.865 | 0.006 | 13.115 |
| 0.8 | far side, 2.5 in | 0.002 | 0.969 | 0.002 | 14.58 |
| 0.8 | far side, 3.0 in | 0.0 | 1.0 | 0.0 | 15.0 |
| 0.6 | lanes | 0.005 | 1.0 | 0.005 | 15.114 |
| 0.6 | far side, 1.25 in | 0.126 | 0.677 | 0.104 | 13.298 |
| 0.6 | far side, 1.5 in | 0.094 | 0.677 | 0.077 | 12.5 |
| 0.6 | far side, 2.0 in | 0.056 | 0.865 | 0.055 | 14.368 |
| 0.6 | far side, 2.5 in | 0.04 | 0.969 | 0.04 | 15.54 |
| 0.6 | far side, 3.0 in | 0.018 | 1.0 | 0.018 | 15.439 |
| 0.4 | lanes | 0.031 | 1.0 | 0.031 | 15.765 |
| 0.4 | far side, 1.25 in | 0.344 | 0.677 | 0.26 | 18.75 |
| 0.4 | far side, 1.5 in | 0.303 | 0.677 | 0.228 | 17.741 |
| 0.4 | far side, 2.0 in | 0.215 | 0.865 | 0.197 | 18.34 |
| 0.4 | far side, 2.5 in | 0.177 | 0.969 | 0.174 | 18.958 |
| 0.4 | far side, 3.0 in | 0.135 | 1.0 | 0.135 | 18.369 |

Upper bound with perfect knowledge: the share of layouts where every vehicle leaves a 10.5 in gap beside it.

| Vehicle size | Layouts | Every vehicle has a gap |
|---:|---:|---:|
| 1.0 | 512 | 0.043 |
| 0.8 | 512 | 0.172 |
| 0.6 | 512 | 0.371 |
| 0.4 | 512 | 0.719 |
