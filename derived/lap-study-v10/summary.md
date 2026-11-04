# Lap study v10: summary

2026-11-03. Agent-run synthetic study: 200 seeded random Appendix E layouts per row, on the organizer CAD field, with guide-size plush vehicles (about 8.55 x 8.2 in) and a 10 x 10 in robot keeping 0.25 in clear. Perfect knowledge and no control error. Time and score assumptions are in `software/stockcar/lapmodel.py`; the exchange succeeds with probability 0.7 when attempted.

## Contact-free laps

| Quadrant reading | Vehicle yaw | Layouts with contact-free laps | Straights: clean line / lane change / contact |
|---|---|---:|---|
| offsets | aligned | 2.5% (5 of 200) | 77 / 4 / 319 |
| offsets | random | 0.0% (0 of 200) | 11 / 0 / 389 |
| sixteen_from_wall | aligned | 0.0% (0 of 200) | 49 / 0 / 351 |
| sixteen_from_wall | random | 0.0% (0 of 200) | 4 / 0 / 396 |
| sixteen_from_divider | aligned | 0.5% (1 of 200) | 53 / 0 / 347 |
| sixteen_from_divider | random | 0.0% (0 of 200) | 4 / 0 / 396 |

## Mission time and expected score by speed setting

| Quadrant reading | Yaw | Speed | Mission median (s) | Mission max (s) | Under 165 s | Mean score, exchange attempted | Mean score, drive only |
|---|---|---|---:|---:|---:|---:|---:|
| offsets | aligned | v9 (8 in/s) | 107.671 | 130.763 | 100.0% | 297.375 | 251.875 |
| offsets | aligned | nominal (12 in/s) | 80.781 | 93.175 | 100.0% | 297.375 | 251.875 |
| offsets | aligned | fast (16 in/s) | 67.336 | 74.382 | 100.0% | 297.375 | 251.875 |
| offsets | random | v9 (8 in/s) | 112.171 | 112.171 | 100.0% | 295.5 | 250 |
| offsets | random | nominal (12 in/s) | 85.281 | 85.281 | 100.0% | 295.5 | 250 |
| offsets | random | fast (16 in/s) | 71.836 | 71.836 | 100.0% | 295.5 | 250 |
| sixteen_from_wall | aligned | v9 (8 in/s) | 107.671 | 112.171 | 100.0% | 295.5 | 250 |
| sixteen_from_wall | aligned | nominal (12 in/s) | 80.781 | 85.281 | 100.0% | 295.5 | 250 |
| sixteen_from_wall | aligned | fast (16 in/s) | 67.336 | 71.836 | 100.0% | 295.5 | 250 |
| sixteen_from_wall | random | v9 (8 in/s) | 112.171 | 112.171 | 100.0% | 295.5 | 250 |
| sixteen_from_wall | random | nominal (12 in/s) | 85.281 | 85.281 | 100.0% | 295.5 | 250 |
| sixteen_from_wall | random | fast (16 in/s) | 71.836 | 71.836 | 100.0% | 295.5 | 250 |
| sixteen_from_divider | aligned | v9 (8 in/s) | 107.671 | 112.171 | 100.0% | 295.875 | 250.375 |
| sixteen_from_divider | aligned | nominal (12 in/s) | 80.781 | 85.281 | 100.0% | 295.875 | 250.375 |
| sixteen_from_divider | aligned | fast (16 in/s) | 67.336 | 71.836 | 100.0% | 295.875 | 250.375 |
| sixteen_from_divider | random | v9 (8 in/s) | 112.171 | 112.171 | 100.0% | 295.5 | 250 |
| sixteen_from_divider | random | nominal (12 in/s) | 85.281 | 85.281 | 100.0% | 295.5 | 250 |
| sixteen_from_divider | random | fast (16 in/s) | 71.836 | 71.836 | 100.0% | 295.5 | 250 |

## Reading this

- **Contact-free laps depend on vehicle size.** With guide-size vehicles they are the exception: most layouts force at least one contact per lap, and the same layout repeats on all three laps. Measure the official vehicles before investing in obstacle avoidance.
- **Time is not the binding constraint once laps use arcs instead of stop-and-spin.** Even at the v9 cruise speed the modeled missions finish well under 165 s. The v9 timeouts came from its stop-spin-settle route, not from the motors.
- **Score-like numbers are planning arithmetic,** not predictions. They assume clean walls, a working start, parking and a raised flag.
