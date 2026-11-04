# Mission v10: closed-loop simulator and evaluation

2026-11-04 · agent-written simulator and agent-run evaluation for the owner's hobby/learning project. **Synthetic: a kinematic robot with perfect knowledge, not a robot test or a score prediction.**

## What changed from v9

| v9 problem | v10 |
|---|---|
| The RL interface could not be driven by a policy | Route arrival is decided from the robot's state. A test drives a full mission through `MissionEnv.step(action)`. |
| 20 seeds were 3 deterministic runs | Each seed draws its own layout, assigned box and exchange outcome. The training seeds (0–99) and evaluation seeds (100–119) are enforced. |
| No obstacles in the nominal case; stand-in about half size | Three guide-size vehicles in Appendix E quadrants, random lanes, positions and yaw |
| `match_logic.py` unused | The v10 supervisor (`software/stockcar/supervisor.py`) drives every phase |
| Stop-spin-settle route (29.6 s laps at 8 in/s) | Arc laps (7.5 in U-turns), pure-pursuit steering, corner slowdowns |
| Points credited for laps never driven | Points only for events that happened; contacts counted per lap |
| Old traced field | Organizer CAD field (`../organizer-cad-v10/`) |

`software/mission_v9.py` and `derived/mission-v9/` stay frozen, because Robot Studio v8 pins them.

## Assumptions to replace with answers and measurements

- **Route:** a counterclockwise lap with the lap gate at the west U-turn apex. The pit is reached through the low opening and left through the high opening (QA05, QA06).
- **Contact policy:** when no gap exists, drive the line that blocks the fewest vehicles, at half speed for 1.5 s after a contact, and never stop for an obstacle.
- **Exchange:** an 8 s timed event with a 70% success chance drawn once per seed. A second attempt therefore cannot rescue a failure, so the safe and aggressive presets score alike here.
- **Speeds and robot:** 8 or 12 in/s cruise, a 10 x 10 in square, and no slip, sensing error or latency.

## Results

See `summary.md`.

- **Empty field:** 20/20 missions complete with no contacts, a median finish of 55 s at 12 in/s and all parked.
- **Guide-size vehicles:** 20/20 complete and park, but no run is contact-free.
  - Some laps also touch a wall, where a lane transition squeezes past a vehicle in the inner lane.
  - Mean score-like totals are about 268–282, against about 367 on the empty field.

## Run

```sh
uv run --no-project --python 3.12 python -B -I tools/evaluate-mission-v10.py   # about 1.5 minutes
node tools/verify-mission-v10.js
```
