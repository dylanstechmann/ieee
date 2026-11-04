# Envelope v10: what the drivetrain can do, and what limits it

2026-11-04 · agent-run synthetic study for the owner's hobby/learning project. **Friction, mass, inertia, source resistance, the 3 A driver limit and the controller gains are placeholders, so these numbers rank options and size margins. They are not measurements.** Tables are in `summary.md`.

## Why this exists

The lap and mission studies assumed their speed limits. This study derives limits from motor physics. To do that, it had to port the dynamics-v9 model to Python, and full-command runs exposed faults in that model.

## The model

`software/stockcar/dynamics.py` holds two versions:
- **`step` / `simulate`:** a faithful port of `tools/mule-dynamics-v5.js`. It matches the JavaScript on all six v9 scenarios, including the full final state (`tools/dynamics-golden-v10.js` writes the fixture, and a Node test keeps it in sync).
- **`step_v10`:** the same controller and parameters, with five corrections. With the corrections switched off and no wheel slipping, it reduces to the v5 results.

| v5 behavior | Effect | Correction |
|---|---|---|
| Wheel slip never closes once the force drops under the grip limit | At full command the robot locks at 0.374 m/s with its wheels 0.247 m/s faster | A contact solve lets each wheel stick, slip and recover. Top speed is about 0.62 m/s at 12 V. |
| The 4.17 ms step sits at the stability limit of a slipping wheel (motor time constant about 2.1 ms) | After a stop command the wheel flips between +6.9 and −7.7 rad/s every step, at ±3 A, for the rest of the run | Physics substeps of 0.42 ms |
| Duty is scaled by the supply voltage, which cancels it | Top speed ignores the supply. At full command, 9 V even comes out faster than 12 V. | Motor ratings hold at the rated 12 V |
| The motor's 0.2 A no-load current is left out | Cruise current reads 0.116 A, below what the motor draws spinning freely | No-load current becomes a friction torque; cruise is about 0.31 A |
| Sag and energy use motor current | Supply current is overstated at part duty | Supply current is duty x motor current |

`ERRATA-2026-11.md` lists what this changes in the sealed v9 report. The corrected launch and stop rates match hand calculations from friction and rolling resistance, and `tools/verify-envelope-v10.js` recomputes them independently.

## What it found

**1. In a turn, the outer wheel is the speed limit, not straight-line top speed.**
- On an arc the outer wheel runs at (radius + half track) / radius times the center speed: 1.53 times on a 7.5 in U-turn.
- Top speed is 21.0–24.3 in/s across the conditions, but keeping 20% wheel headroom limits a 7.5 in U-turn to about 11–13 in/s.
- 12 in/s works: the outer wheel needs 18.4 in/s, 88% of the lowest top speed. Mission replays at 12 in/s saturate a wheel for at most 0.1% of the time.
- 16 in/s does not: the outer wheel needs 24.5 in/s, more than the top speed in all 27 conditions. Replays at 16 in/s saturate a wheel for 4–16% of the mission, and the heading error reaches 2.8 rad (median across seeds, worst condition) without path feedback.
- So the lap study's 16 in/s row cannot be driven through its own U-turns. Its conclusion survives: with U-turns slowed to fit, clean missions take about 56–62 s, well under the 165 s bonus.

**2. Grip limits acceleration and braking, not the motors.**
- In all 27 conditions, launch and stopping rates match the friction calculation.
- Grip lets each wheel transmit at most about 0.27 N·m (friction 0.35, 5 kg), against the motor's 2.65 N·m extrapolated stall torque.
- Nothing here argues for changing the 70:1 motors. It argues for measuring friction, which the E03 floor trials do.

**3. Friction changes the picture more than voltage or mass.**
- At friction 0.15, the mission simulator's 8 rad/s² yaw acceleration exceeds even the raw limit (about 6.6 rad/s²).
- Replays in the worst condition (friction 0.15, 10.5 V, 5 kg) show 1.6–4% wheel slip, and about 1 rad of heading error at 12 in/s.
- Replays at the nominal condition (friction 0.25) show 0.5–1.2% slip, and 0.15 rad at 12 in/s.
- The sensor models assumed 2% slip, so that assumption looks about right. If friction turns out that low, the firmware limits below are what should keep slip down, though they have been tested only on launches and arc entries, not on whole missions.

**4. Drive energy is tiny; plan for peak current instead.**
- Drive motors use about 0.04–0.05 Wh per mission. That leaves out electronics and any mechanism.
- Missions peak near 1.5 A of supply current.
- Full-command spins reach the assumed 3 A limit on both motors, 6 A of supply. Launches reach that too if the wheels are about 10 times heavier than the v9 value, and they may be: a 70:1 gearbox multiplies the unmeasured rotor inertia by 4,900.
- So size the fuse and battery wiring for at least 6 A plus electronics, and for the current limit the chosen driver actually has. A blocked wheel would also hold at that limit. Battery choice looks set by peak current, voltage sag and swap speed, not capacity.

**5. Wheel inertia hardly matters for speed.** From 1 to 30 times the v9 value, top speed, launch rate and stopping distance barely move, because grip sets them. Only the current changes (`summary.md`).

**6. The integral term must be released on a stop.** The v9 controller keeps it, so after a stop at low voltage the wheel creeps for seconds at a few mm/s. The firmware already clears it, and this confirms that was needed.

## What changed in the firmware

`firmware/pico2/drive.py` now sits between motion requests and the wheel speed loop, using the conservative envelope in `config.py`:
- **Acceleration limits**, shared between speed and yaw changes. Each limit is safe alone, but together they can overload the outer wheel.
- **Radius-keeping wheel limit:** it slows down rather than widen the turn when the outer wheel runs out of speed.

`firmware/host_tests/test_plant_in_the_loop.py` runs the real control loop against this model. In those tests, shaping cuts launch slip on low friction from about 7 in/s to under 0.1 in/s, for about 0.2 s of extra launch time. On a 7.5 in arc requested at 16 in/s, it holds the radius at 7.5 in, where raw wheel targets drift to 8–8.4 in. Measured encoder speed is noisy (one count is 10.7 rpm per tick), but the true wheel speed stays steady, and the loop stays stable across 1–30 times the wheel inertia.

## Limits

- **Planar model:** no lateral tire model, so the lateral limit is only a friction bound. No load transfer, and static and sliding friction are equal.
- **Friction range:** 0.15–0.35 is the v9 placeholder. Rubber or TPU on paint could differ a lot.
- **Usable shares:** the 80% and 70% planning margins are judgment calls.
- **Geometry:** mule values (202 mm track, 80 mm wheels). The competition robot's track will set its own arc limits.
- **Replays:** the wheel loop is closed but the path loop is not, so the heading numbers show what a path follower must correct, not a mission result. Replays use the mission simulator's commands, without the new shaping.
- **Battery:** a constant 0.25 Ω source. No chemistry or discharge curve.
- **Not modeled:** motor heating, gearbox backlash, driver dead time, and the controller's real timing.

Replace the placeholders with E02 and E03 results before drawing hardware conclusions.

## Run

```sh
uv run --no-project --python 3.12 python -B -I tools/envelope-v10.py   # about 6 minutes
node tools/verify-envelope-v10.js
```
