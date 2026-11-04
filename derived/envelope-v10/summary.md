# Envelope v10 summary

2026-11-04. Agent-run synthetic study of the corrected dynamics model (`software/stockcar/dynamics.py`, `step_v10`). Friction, mass, inertia, resistance and gains are placeholders, so these numbers rank options and size margins; they are not measurements.

## v5 model against the corrected model

| Scenario | Final speed m/s (v5 → v10) | Final yaw error rad | Peak slip m/s | Peak sampled current A | Saturated samples | Energy Wh |
|---|---|---|---|---|---|---|
| cruise | 0.203 → 0.203 | 0.000 → 0.000 | 0.000 → 0.000 | 0.12 → 0.31 | 0 → 0 | 0.0022 → 0.0034 |
| spin | 0.000 → 0.000 | 0.006 → 0.007 | 0.000 → 0.000 | 0.05 → 0.25 | 0 → 0 | 0.0005 → 0.0010 |
| low-voltage | 0.203 → 0.200 | 0.000 → 0.000 | 0.000 → 0.000 | 0.12 → 0.30 | 0 → 0 | 0.0018 → 0.0033 |
| asymmetric-traction | 0.208 → 0.203 | 0.389 → 0.000 | 0.103 → 0.060 | 0.50 → 0.52 | 0 → 0 | 0.0022 → 0.0035 |
| encoder-dropout | 0.231 → 0.203 | 0.120 → 0.000 | 0.058 → 0.000 | 0.33 → 0.38 | 0 → 0 | 0.0022 → 0.0035 |
| brake-hold | 0.006 → 0.001 | 0.000 → 0.000 | 0.270 → 0.018 | 3.00 → 0.31 | 89 → 0 | 0.0273 → 0.0017 |

## Limits across 27 conditions

Supply (10.5, 11.1, 12.0) V, friction (0.15, 0.25, 0.35), mass (3.0, 4.0, 5.0) kg. Nominal is 11.1 V, friction 0.25, 4.0 kg.

| Quantity | Lowest | Nominal | Highest |
|---|---:|---:|---:|
| Top speed, in/s | 21.0 | 22.3 | 24.3 |
| Launch acceleration, m/s² | 0.88 | 1.67 | 2.45 |
| Time to 90% of top speed, s | 0.20 | 0.31 | 0.63 |
| Stopping deceleration, m/s² | 1.46 | 2.26 | 3.05 |
| Stopping distance from 80% of top speed, in | 1.11 | 1.77 | 3.29 |
| Peak yaw rate, rad/s | 5.33 | 5.65 | 6.13 |
| Yaw acceleration, rad/s² | 6.59 | 12.21 | 17.70 |
| Peak motor current in a launch, A | 1.45 | 1.67 | 1.99 |
| Peak supply current in a launch, both motors, A | 2.54 | 2.94 | 3.51 |
| Peak motor current in a full-command spin, A | 3.00 | 3.00 | 3.00 |
| Peak supply current in a full-command spin, both motors, A | 6.00 | 6.00 | 6.00 |

## Planning envelopes

Usable shares of each limit: {'speed': 0.8, 'accel': 0.7, 'brake': 0.7, 'spin': 0.7, 'lateral': 0.7}. Conservative takes the lowest of every quantity across all conditions. Lateral is a friction bound (share x friction x driven weight fraction x g) because the model has no lateral tire model.

| Envelope | Cruise in/s | 7.5 in U-turn in/s | Accel in/s² | Brake in/s² | Spin rad/s | Yaw accel rad/s² | Lateral in/s² | 90° spin s | Time lost per stop and restart s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| conservative | 16.8 | 11.0 | 24.3 | 40.3 | 3.73 | 4.6 | 32.4 | 1.17 | 0.55 |
| nominal | 17.9 | 11.7 | 46.0 | 62.1 | 3.95 | 8.5 | 54.1 | 0.86 | 0.34 |
| aggressive | 19.5 | 12.7 | 67.6 | 82.1 | 4.29 | 12.0 | 75.7 | 0.72 | 0.26 |

Stops above release the controller integral, as the firmware does. Keeping it at 10.5 V, friction 0.15, 5.0 kg, the wheel takes 1.30 s to fall below 5 mm/s and is still moving at 3.5 mm/s 2.5 s after the command.

## Speed limits on an arc

The outer wheel runs at (radius + half track) / radius times the center speed, with a half track of 3.98 in. Each cell is outer-wheel limit / lateral limit, in in/s of center speed, using each envelope's usable shares. The lower number binds.

| Arc radius in | Conservative | Nominal | Aggressive |
|---:|---:|---:|---:|
| 6 | 10.1 / 14.0 | 10.7 / 18.0 | 11.7 / 21.3 |
| 7.5 | 11.0 / 15.6 | 11.7 / 20.1 | 12.7 / 23.8 |
| 9.3 | 11.8 / 17.4 | 12.5 / 22.4 | 13.6 / 26.5 |
| 12 | 12.6 / 19.7 | 13.4 / 25.5 | 14.6 / 30.1 |

## Lap model with each envelope

Clean laps (no vehicles), from `software/stockcar/lapmodel.py`, which changes speed instantly and keeps a fixed allowance for spins and settling. The lowest top speed across all conditions is 21.0 in/s; an outer-wheel share above 100% cannot be driven at that condition.

| Source | Envelope | Cruise in/s | U-turn in/s | Outer wheel in/s | Share of lowest top speed | Clean lap s | Mission s |
|---|---|---:|---:|---:|---:|---:|---:|
| lap study | v9 | 8.0 | 8.0 | 12.2 | 58% | 19.4 | 98.7 |
| lap study | nominal | 12.0 | 12.0 | 18.4 | 88% | 12.9 | 71.8 |
| lap study | fast | 16.0 | 16.0 | 24.5 | 117% | 9.7 | 58.3 |
| dynamics | conservative | 16.8 | 11.0 | 16.8 | 80% | 11.1 | 62.1 |
| dynamics | nominal | 17.9 | 11.7 | 17.9 | 85% | 10.4 | 59.4 |
| dynamics | aggressive | 19.5 | 12.7 | 19.5 | 93% | 9.6 | 56.0 |

## Mission simulator limits against the envelopes

| Limit | Mission simulator | Conservative usable | Nominal usable |
|---|---:|---:|---:|
| Linear acceleration, in/s² | 24.0 | 24.3 | 46.0 |
| Yaw acceleration, rad/s² | 8.0 | 4.6 | 8.5 |
| Yaw rate, rad/s (12 in/s envelope) | 2.5 | 3.7 | 4.0 |
| Outer wheel in a 7.5 in U-turn at 12 in/s, in/s | 18.4 | 16.8 | 17.9 |
| Outer wheel in a 7.5 in U-turn at 16 in/s, in/s | 24.5 | 16.8 | 17.9 |

## Sensitivity to wheel inertia

Nominal condition, full-command launch. The v9 value is 0.00035 kg·m² and leaves out the motor rotor, which a 70:1 gearbox multiplies by 4,900. Grip sets the speeds and distances, so they barely move; the current does.

| Wheel inertia scale | Top speed in/s | Launch accel m/s² | Stopping distance in | Peak motor A | Peak supply A |
|---:|---:|---:|---:|---:|---:|
| 1x | 22.3 | 1.67 | 1.77 | 1.67 | 2.94 |
| 3x | 22.3 | 1.67 | 1.77 | 2.31 | 4.23 |
| 10x | 22.3 | 1.67 | 1.78 | 3.00 | 6.00 |
| 30x | 22.3 | 1.67 | 1.81 | 3.00 | 6.00 |

## Mission replay through the plant

Commanded speed and yaw rate from v10 missions (seeds 100–104) drive the wheel-speed loop. The path loop is not closed, so this measures what the plant does with those commands. Worst is 10.5 V, friction 0.15, 5.0 kg; best is 12.0 V, friction 0.35, 3.0 kg.

| Mission cruise in/s | Field | Condition | Slip share | Saturated time | RMS speed error in/s | Heading gap rad | Peak motor A | Peak supply A | Energy Wh | Stops |
|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 12 | empty | worst | 1.57% | 0.1% | 0.61 | 1.04 | 1.36 | 1.19 | 0.041 | 1–1 |
| 12 | empty | nominal | 0.53% | 0.0% | 0.26 | 0.15 | 1.45 | 1.40 | 0.040 | 1–1 |
| 12 | empty | best | 0.40% | 0.0% | 0.19 | 0.07 | 1.53 | 1.40 | 0.038 | 1–1 |
| 12 | aligned_vehicles | worst | 2.20% | 0.1% | 0.59 | 0.87 | 1.36 | 1.23 | 0.046 | 1–1 |
| 12 | aligned_vehicles | nominal | 0.75% | 0.0% | 0.26 | 0.15 | 1.45 | 1.40 | 0.044 | 1–1 |
| 12 | aligned_vehicles | best | 0.57% | 0.0% | 0.20 | 0.10 | 1.52 | 1.40 | 0.042 | 1–1 |
| 16 | empty | worst | 2.76% | 16.1% | 1.16 | 2.76 | 1.36 | 1.29 | 0.041 | 1–1 |
| 16 | empty | nominal | 0.79% | 14.5% | 0.56 | 1.20 | 1.46 | 1.36 | 0.040 | 1–1 |
| 16 | empty | best | 0.61% | 9.1% | 0.31 | 0.13 | 1.52 | 1.40 | 0.038 | 1–1 |
| 16 | aligned_vehicles | worst | 3.98% | 7.6% | 1.06 | 2.19 | 1.36 | 1.29 | 0.046 | 1–3 |
| 16 | aligned_vehicles | nominal | 1.18% | 6.7% | 0.50 | 0.51 | 1.46 | 1.39 | 0.045 | 1–3 |
| 16 | aligned_vehicles | best | 0.90% | 3.9% | 0.31 | 0.14 | 1.52 | 1.47 | 0.043 | 1–3 |
