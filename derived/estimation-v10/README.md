# Estimation v10: steering from estimated pose, with sensor ablations

2026-11-04 · agent-run synthetic evaluation for the owner's hobby/learning project. **This ranks sensing options inside a simplified model; it does not predict on-field accuracy.**

## Setup

The v10 mission simulator runs on seeds 100–119. The robot steers and judges route progress from an extended Kalman filter, `software/stockcar/estimator.py`, while contacts and parking are judged from the true pose.

The sensors (`software/stockcar/sensors.py`) use placeholder parameters:
- **Wheel encoders:** x1 decoding (1120 counts per output revolution), with 2% random slip per wheel.
- **Gyro:** bias 0.01 rad/s, uncalibrated; 1% scale error; noise.
- **Reflectance array:** eight sensors under the front edge that see the white 0.9 in marking band.
- **Range sensors:** four low ToF sensors, 40 in range, 0.3 in noise, 5% dropout. Readings that hit unmapped vehicles are gated out.

**Filter corrections:** a reflectance transition puts that sensor on the nearest band edge, and ToF readings are compared with ray casts against the mapped walls and dividers.

## Results (`summary.md`)

| Sensing | Empty field completed | Median position error (RMS) |
|---|---:|---:|
| All sensors | 20/20 | 0.11 in |
| ToF ranges only | 20/20 | 0.12 in |
| Reflectance edges only | 0/20 | 7.4 in |
| Odometry only | 2/20 | 8.3 in |

With guide-size vehicles the pattern holds: all sensors or ranges only complete 20/20 at about 0.12 in RMS. Wall contacts in those runs come from the obstacle squeeze, not estimation.

## What it suggests

1. **Low range sensing against walls and dividers carries localization** in this model.
   - It must sit below the 1 in divider (the V3 1 x 2 may be taller), see the walls, and reject returns from vehicles.
   - Validate it on the real field before relying on it (P6 bench tests).
2. **Reflectance alone, used naively, fails.**
   - The band's two edges are only 0.9 in apart, so after about half an inch of drift a crossing can be matched to the wrong edge and the filter diverges.
   - Line sensing is still needed for lap and finish detection. A smarter use would match crossing events against expected positions along the route, which is future work.
3. **Calibrate the gyro bias at the start.** Most odometry-only heading drift comes from the assumed 0.01 rad/s bias. The robot sits still before the start (5 s with a start switch), which is enough to measure the bias. That one step would sharply reduce drift.

## Limits

- A perfect map with nominal CAD geometry.
- Idealized ToF beams with no multipath or surface effects.
- No latency.
- Placeholder noise values.
- One simple filter.

Replace the parameters with measured ones, from the E02/E03 benches and the sensor bench, before drawing hardware conclusions.

## Run

```sh
uv run --no-project --python 3.12 python -B -I tools/evaluate-estimation-v10.py   # about 3 minutes
node tools/verify-estimation-v10.js
```
