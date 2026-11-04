# Estimation v10: steering from estimated pose, with sensor ablations

2026-11-04 · agent-run synthetic evaluation for the owner's hobby/learning project. **This ranks sensing options inside a simplified model; it does not predict on-field accuracy.**

## Setup

The v10 mission simulator runs on seeds 100–119. The robot steers and judges route progress from an extended Kalman filter, `software/stockcar/estimator.py`, while contacts and parking are judged from the true pose. **The robot still gets the true vehicle positions for its lane plan**, so this study removes perfect knowledge of the robot's own pose, not of the obstacles.

The sensors (`software/stockcar/sensors.py`) use placeholder parameters:
- **Wheel encoders:** x1 decoding (1120 counts per output revolution), with 2% random scale error per wheel.
- **Gyro:** bias 0.01 rad/s, uncalibrated; 1% scale error; noise.
- **Reflectance array:** eight sensors under the front edge that see the white 0.9 in marking band.
- **Range sensors:** four low ToF sensors, 40 in range, 0.3 in noise, 5% dropout. Readings that hit unmapped vehicles are gated out.

**Filter corrections:**
- **Line crossings:** a reflectance sensor that changes state has just crossed one ring of the band. Whether it turned white, and which way it was moving, says which ring. Crossings too shallow to read are skipped.
- **Ranges:** ToF readings are compared with ray casts against the mapped walls and dividers.
- **Stillness:** when neither wheel moved, the gyro reading is its bias plus noise.

## Results (`summary.md`)

| Sensing | Empty field completed | Median position error (RMS) | Worst position error |
|---|---:|---:|---:|
| All sensors | 20/20 | 0.12 in | 0.7 in |
| ToF ranges only | 20/20 | 0.12 in | 0.8 in |
| Reflectance only | 15/20 | 0.77 in | 14.2 in |
| Reflectance only, with a calibrated gyro scale and a 5 s wait | 20/20 | 0.51 in | 5.5 in |
| Odometry only | 6/20 | 3.5 in | 19.3 in |

With guide-size vehicles, all sensors or ranges only again complete 20/20 at about 0.12 in RMS. Wall contacts in those runs come from the obstacle squeeze, not estimation.

Twenty seeds cannot separate small differences. Reflectance only finished 15/20 on the empty field and 18/20 with vehicles, and nothing suggests vehicles help it. Read a gap of a few runs as no difference.

## What it suggests

1. **Low range sensing against walls and dividers carries localization** in this model. No other change moved these rows: every variant with ranges finishes 20/20 at about 0.12 in.
   - It must sit below the 1 in divider (the V3 1 x 2 may be taller), see the walls, and reject returns from vehicles.
   - Validate it on the real field before relying on it (P6 bench tests).
2. **Reflectance can be a real fallback, used properly.** Matching each crossing to the right ring took reflectance-only runs from 0/20 at 7.4 in to 10/20 at 2.1 in, and stillness took them to 15/20 at 0.77 in. Adding a calibrated gyro scale and a 5 s wait finished 20/20. Only the combination did: each of those two alone stayed at 15–16/20. This matters if ToF disappoints on real paint and dividers.
3. **Both gyro errors matter; wheel scale barely does.** Removing one error at a time from odometry-only runs:

   | Removed | Completed | Median position error | Median heading error |
   |---|---:|---:|---:|
   | Nothing | 2/20 | 8.3 in | 32° |
   | Gyro bias | 6/20 | 3.5 in | 7° |
   | Gyro scale error | 3/20 | 8.7 in | 32° |
   | Wheel scale error | 1/20 | 9.2 in | 33° |
   | Gyro bias and gyro scale error | 19/20 | 0.9 in | 2° |

   Bias is the largest single source, but removing it alone leaves 6/20. An earlier version of this README said calibrating bias at the start "would sharply reduce drift" and left out scale; the error is reduced, but finishing needs both.
4. **So calibrate both, cheaply.**
   - **Bias:** the filter learns it whenever the wheels are still, which on its own matches a perfectly calibrated bias (6/20 at 3.5 in). Keep the robot still and average during the 5 s start wait; the wait helps only together with scale calibration.
   - **Scale:** measure it once on the bench. Spin the robot ten full turns against a floor mark and compare the integrated gyro angle: 0.1% of ten turns is 3.6°, so this is easy to reach. The study's "calibrated" rows leave 10% of an assumed 1% error.
   - Neither reaches the perfect-gyro row: the learned bias is itself noisy. A real gyro sampled faster than this model's 20 Hz should average better.

## Limits

- **True vehicle positions in the lane plan.** Finding vehicles with the same sensors is not yet modeled.
- A perfect map with nominal CAD geometry.
- Idealized ToF beams with no multipath or surface effects.
- No latency.
- Placeholder noise values, including the 1% scale error and the size of the calibration's residual.
- One simple filter.
- The ablation runs only on the empty field.

Replace the parameters with measured ones, from the E02/E03 benches and the sensor bench, before drawing hardware conclusions.

## Log replay

`tools/replay-log.py` reruns a mission log (`schemas/mission-log-v1.json`) through the estimator and supervisor. With the logged settings it reproduces a simulated mission exactly, and `--sensing` asks what another sensing mode would have done on the same log. Real logs can use the same path once the robot writes them.

## Run

```sh
uv run --no-project --python 3.12 python -B -I tools/evaluate-estimation-v10.py   # about 12 minutes
node tools/verify-estimation-v10.js
```
