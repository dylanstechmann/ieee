# Maneuver v10: following routes on the corrected plant, and which line to take

2026-11-04 · agent-run synthetic study for the owner's hobby/learning project. **It compares options inside a simplified model. It is not a robot test or a score prediction.**

## Questions

- How fast can the robot go around the field within the drivetrain limits?
- Can the firmware's real control loop follow those routes?
- With vehicles on the track, which line earns the most points?

## Method

- **Speed:** `software/stockcar/profile.py` finds the fastest speed along a route within the planning envelopes of `../envelope-v10/`: the faster wheel's speed, lateral acceleration, yaw limits and a grip budget shared by cornering and speed changes.
- **Steering:** `software/stockcar/tracker.py` follows a route with Kanayama's tracking law. It stays inside the MicroPython subset, so the same file can move to the robot.
- **Driving:** `firmware/host_tests/route_follow.py` runs the firmware's own loop (`Runner`, `DriveShaper`, wheel PI) on the corrected drivetrain model. Some runs steer from the truth and some from the EKF on simulated sensors, after a 5 s start wait.
- **Lines:** `software/stockcar/routes.py` sets a lap by the y it holds past each quadrant. Three vehicles in four quadrants, each in an outer or inner lane, give 32 configurations.
  - "Lanes" is the plain 7.5 in lap, whatever the vehicles.
  - "Far side" passes each vehicle on the side away from it, a set margin from the wall or divider.
- **Passing runs:** all 32 configurations were driven at each of six policies on three sensor seeds, with the EKF steering. Each driven lap was then checked against 16 random placements per configuration, at four vehicle sizes.
- **Points per lap:** 15 for no wall contact plus 25 for no vehicle contact, from the V3 score table. The center divider counts as a wall here, which is an assumption.

## What it found

See `summary.md` for every table.

1. **The firmware loop can follow a lap.** It finished on all 27 plant conditions at all three envelopes, with a worst cross-track error of 0.32–0.43 in and at least 1.6 in of clearance. With the EKF steering, clearance stayed at 1.43–1.64 in at every speed cap from 8 in/s up, so speed barely changes tracking.
2. **Laps are quick and time is not binding.** A conservative lap takes about 9.1 s. A clean mission takes about 60–63 s, including the 8 s exchange and the slower pit legs below, against the 165 s bonus.
3. **Keep the conservative envelope until friction is measured.** At friction 0.15 the nominal envelope slipped 4.9–6.9 in/s, against at most 0.7 in/s for conservative. Tracking looks fine anyway, but the plant has no sideways skid, so that says little about real cornering.
4. **The pit routes as drawn could not be driven.** Their sharp corners gave about 3 in of cross-track error on four of seven legs, and two legs hit a wall (−0.95 and −0.07 in), though their planned clearance looked fine. The kinematic mission simulator hid this, because its follower cuts corners and spins in place. Rounding the corners over 4 in and capping pit speed at 8 in/s fixed it: 42 of 42 runs finished, with at worst 0.56 in of cross-track error and at least 1.07 in of clearance.
5. **With guide-size vehicles, no line avoids contact, so stay off the walls.** At most 0.1% of laps cleared every vehicle under any policy. Plain lanes scored best, at 15 points per lap, because far-side lines bring wall contact for nothing:

   | Policy | Laps with wall contact (of 96) | Least driven clearance | Median lap |
   |---|---:|---:|---:|
   | Lanes | 0 | 1.30 in | 9.6 s |
   | Far side, 1.25 in | 31 | −0.96 in | 11.2 s |
   | Far side, 1.5 in | 31 | −0.83 in | 11.4 s |
   | Far side, 2.0 in | 13 | −0.36 in | 11.2 s |
   | Far side, 2.5 in | 3 | −0.21 in | 11.3 s |
   | Far side, 3.0 in | 0 | 0.48 in | 11.2 s |

   Driven clearance runs about 1 in below planned clearance at the tighter margins, more than the cross-track error explains. The likely cause is the square's corners swinging in the squeezed turns; this study did not isolate it.
6. **Vehicle size decides whether dodging pays.**

   | Vehicle size (share of guide size) | About | Lanes, points per lap | Best far side, points per lap | Laps clear of vehicles at best far side | Layouts where every vehicle leaves a gap |
   |---:|---|---:|---:|---:|---:|
   | 1.0 | 8.6 x 8.2 in | 15.0 | 15.0 | 0% | 4% |
   | 0.8 | 6.8 x 6.6 in | 15.0 | 15.0 | 0% | 17% |
   | 0.6 | 5.1 x 4.9 in | 15.1 | 15.5 | 4% | 37% |
   | 0.4 | 3.4 x 3.3 in | 15.8 | 19.0 | 18% | 72% |

   The last column is a perfect-knowledge upper bound. Even at the smallest size, fixed far-side lines reach only about a quarter of it, so harvesting those points would need the robot to measure where each vehicle actually is.

## What this suggests

- **Default to plain lanes until the official vehicles are measured.** Compare their size with the table above.
- **Test contact on the practice field.** This study treats a touch as harmless. The lanes line can meet a vehicle head-on, and pushing one is not modeled. If a vehicle jams or stalls the robot, a glancing line may be worth it whatever the points.
- **Use rounded, slow pit legs,** and judge routes by driven clearance, not planned clearance.

## Route library

`route-library.json` (141 KB) holds tables for the robot at the conservative envelope: the plain lap, a lap for each of the 32 configurations at a 3.0 in margin, the entry, and pit legs for each box. 3.0 in is the closest margin with no wall contact in the 96 driven laps. Keys list `low_west, low_east, high_west, high_east`, with `o` outer, `i` inner and `-` empty.

**The firmware does not load these yet**, and `tracker.py` has passed the MicroPython lint but has not run on MicroPython.

## Limits

- **Vehicle lanes are assumed known.** Finding vehicles with the robot's own sensors is not yet modeled.
- **No sideways skid in the plant,** and encoders see body motion, so wheel slip never reaches the estimator.
- **Pushing or jamming vehicles is not modeled.**
- Placeholder friction, mass, motor and sensor values, and a perfect nominal CAD map.
- Vehicle sizes are scaled copies of the guide's plush vehicle, not measurements.
- Three seeds and 16 placements per configuration, so treat contact rates as rough.
- Routes were driven one at a time, not chained into a mission. The spin inside the pit box was not driven; its time is added from the envelope study.
- Clean-mission times assume the simulator's route, which depends on open questions QA05 and QA06.

## Run

```sh
uv run --no-project --python 3.12 python -B -I tools/evaluate-maneuver-v10.py   # about 12 minutes
node tools/verify-maneuver-v10.js   # hashes, driven clearances, and library routes rechecked with independent geometry
```
