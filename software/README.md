# Match logic reference (v7)

`match_logic.py` is the decision layer for one Stock Car Race match under the V3 manuals. You call `MatchLogic.update(now_s, obs)` every control tick and drive the robot from what it returns. It does no I/O, so it can sit inside a ROS 2 node, a MicroPython loop on a microcontroller, or a simulator. Agent-written for team discussion; it has not run on a robot.

```
uv run --no-project --python 3.12 python -B -I -m unittest discover -s software -v   # 33 tests (13 here, 20 for mission_v9)
```

Or run every project check with `node tools/check-all.js` from the repository root.

**November 3 review:** `mission_v9.py` does not use this module yet; the two disagree on lap length (4.04 m here, 3.81 m in the simulator). The review notes in `../derived/mission-v9/README.md` list the simulator's known defects. The next simulator version is planned to use one supervisor evolved from this file.

## What it decides

| Team table row | Behavior | Default |
|---|---|---|
| Start on the green flag | Arms only after seeing the flag **down**, then needs consecutive "up" frames. A missed frame resets the count, because an early start costs a Yellow Card. A start switch instead holds still for 5 s (GM1 R03). | 10 down frames to arm, 3 up frames |
| Read the AprilTag | Majority vote of tag reads before the pit stop, with a minimum vote count. Without a reliable read it uses a fallback box (see below). | 3 votes, box 2 |
| Count laps | A checkered-line crossing counts only after at least 85% of a lap's distance since the last counted crossing, so double crossings near the pit mouth are rejected. Crossings while going into or leaving the pit are ignored. | 4.04 m lap |
| Pit stop | After lap 1 or 2: go to the box, then the exchange, with a time budget per attempt, one retry, then a bail-out that finishes the laps anyway. | after lap 2, 20 s × 2 |
| School flag | Raised when the final lap begins: on leaving the pit if the stop follows lap 2, otherwise at the second counted crossing. It stays up. | — |
| Park | After lap 3, drive to the assigned box and stop once inside. | — |
| Auto-stop | Stops everything 178 s after the start (GM2 §3.4.3; nothing after 3:00 scores, G06). The emergency-stop input latches a stop. | 178 s |

Why the fallback box guesses instead of skipping the exchange: an exchange in the wrong box still earns 12 + 20 points, and the right box (1 chance in 3) earns 25 + 40 + 15. That is about 48 points on average, against 0 for skipping.

## What it needs from the rest of the robot

- `flag_up` per camera frame: True, False, or None when the flag isn't visible.
- `tag_id`: 1–3 or None.
- `odometry_m` (cumulative path length) and a `checker_crossing` edge event from a downward sensor.
- `at_pit_box`, `exchange_done` / `exchange_failed` from the mechanism, `in_assigned_box`, and `estop`.

The hardware e-stop must still cut power on its own (GM1 R04); the `estop` input only mirrors it in software.

## Open questions that change this logic

How the referee counts laps around the pit detour, when the final lap begins if the stop follows lap 2, and which openings are legal for entering and leaving the pit. These are questions 3 and 5 in `../derived/team-brief-v7/TEAM-BRIEF.md`. Every number in `DEFAULTS` is a starting point to tune on a practice field.

## `stockcar/` package (v10, November 3)

Standard-library Python for the next simulator generation, built against the organizer CAD field (`../derived/organizer-cad-v10/field-v10.json`). Agent-written; synthetic results only.

| Module | Contents |
|---|---|
| `geometry.py` | Convex polygons, separating-axis distances, circle–polygon distance |
| `field.py` | Wall faces, dividers (CAD 1 x 1 or V3 1 x 2 variants), corridors, and the obstacle quadrants under three Appendix E readings |
| `obstacles.py` | Guide plush vehicle (about 8.55 x 8.2 in) and the old v9 circle, lane-constrained placements, straight-pass gap |
| `planner.py` | Hybrid-A* along one straightaway for a square 10 x 10 in or round 10 in footprint (swept checks, so rotation costs the square its diagonal) |
| `profile.py` | Fastest speed along a route within the drivetrain limits, and corner rounding |
| `routes.py` | Laps set by the line held past each quadrant, the 32 lane configurations, and rounded, slower pit legs |
| `tracker.py` | Kanayama path tracking; passes the MicroPython lint so it can move to the robot |
| `supervisor.py` | `match_logic.py` plus pre-match presets (aggressive / safe / drive-only) and a no-progress watchdog; matches `match_logic` on shared outputs and passes the MicroPython lint |

The passability atlas built from these modules is in `../derived/passability-atlas-v10/`. `mission.py` is the v10 closed-loop mission simulator and RL environment, with results in `../derived/mission-v10/`. `sensors.py` and `estimator.py` (encoders, gyro, reflectance band, low ToF, EKF; results in `../derived/estimation-v10/`) let it steer from estimated pose. `replay.py` records a mission to the log format in `../schemas/mission-log-v1.json` and reruns a log through the estimator and supervisor; `../tools/replay-log.py` is its command line. A rerun with the logged settings reproduces a simulated mission exactly, and `--sensing` tries another sensing mode on the same log. Results for `profile.py`, `routes.py` and `tracker.py` are in `../derived/maneuver-v10/`. `passage.py` holds the exact lane tests, and `lapmodel.py` the lap-study time and score assumptions. `mission_v9.py` stays frozen.
