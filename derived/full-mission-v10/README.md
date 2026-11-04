# Full mission v10: whole missions on the simulated robot

2026-11-04 · agent-run synthetic study for the owner's hobby/learning project. **Nothing here has run on a board or a field. It shows the software pieces work together in a simplified model; it does not predict a match result.**

## What runs

Each mission chains everything the robot's software has so far:

- the supervisor (`software/stockcar/supervisor.py`), deciding each phase;
- the mission driver (`firmware/pico2/mission_driver.py`), turning phases into routes and spins;
- packed route files read by `firmware/pico2/route_store.py`, as they would be on the board;
- the path tracker (`software/stockcar/tracker.py`);
- the EKF on simulated sensors;
- the firmware loop on the corrected drivetrain model.

Contacts, parking and score are judged from the true pose. All runs use the conservative envelope.

| Set | Missions | What varies |
|---|---:|---|
| Clean | 27 | Three boxes, three plants, three sensor seeds, empty field |
| Vehicles | 20 | The evaluation layouts (seeds 100–119) with guide-size vehicles, on the plain lap |
| Library | 32 | Every far-side library lap in a whole mission, empty field |
| Paths | 12 | Safe and drive-only presets, a failing exchange, and the pit after lap 1, on each box |

## What it found

See `summary.md` for the tables.

1. **The pieces work together.** All 91 missions finished, parked and made no wall contact. No safety stop fired. The median clean finish is 58 s, and library laps finish in 59–67 s, against the 165 s bonus.
2. **The other supervisor branches work too.** A failed exchange bails out after two attempts and still finishes (about 67 s). Drive-only skips the exchange, and the pit can come after lap 1 or lap 2.
3. **Plain lanes need no vehicle knowledge, and in this model beat the perfect-knowledge lane plan.** On the same 20 layouts the plain lap averages 285.75 score-like points, against 266.25 in `../estimation-v10/`. The 19.5-point gap is exactly that plan's 26 wall-contact laps. Read point 1 of the limits below before relying on this number.
4. **The tightest moment is the spin in the pit box.** A 10 in square reaches 7.07 in at its corners, and the route stops 7.6 in from the end wall. At about 45° the corner came within 0.27–0.61 in of the wall in the runs traced, against 1.23 in anywhere on the plain lap's course. No run touched, but real pose errors are unknown.
   - **Cheap fix:** stop about 0.4 in further from the wall. The robot sits about 91–96% inside the box now, and more than 75% is required. The target is in `software/stockcar/mission.py`, so changing it means rerunning the studies that pin that file.
   - **Design option:** a round base has no corner to swing (QA01).
5. **Far-side laps have less margin.** One library mission reached 1.86 in of pose error and 0.26 in of clearance at the west turn, though the median pose error across library missions is 0.47 in. Each library lap ran once, so this is a warning, not a rate.

## Limits

1. **The robot passes straight through vehicles.** A touched vehicle neither resists nor moves, and all 60 laps in the vehicles set touched one. A real robot would push, deflect or jam. So 285.75 is an upper bound for that line, and it says nothing about whether the robot keeps going. Contact trials with the official vehicles matter more than any further simulation of this.
2. **The camera, start flag and lap line are not modeled.** The tag and flag are simply given, and reaching a route's end stands in for crossing the lap line, which depends on QA05 and QA06.
3. **The estimator is host-only.** It is not in the Pico bundle: it has not been ported to MicroPython (it uses `math.remainder`, which MicroPython's `math` lacks), and its speed on a Pico is unknown. The sensors it needs are not chosen, so `main.py` deliberately cannot start a mission.
4. **Nothing has run on MicroPython.** The bundle passes a static lint only.
5. **No sideways skid,** and encoders see body motion, so wheel slip never reaches the estimator.
6. Placeholder friction, mass, motor and sensor values, a perfect nominal map, and the assumed route. The exchange is a timed stand-in, not a mechanism.
7. Recovery from a real stall is tested only with a scripted supervisor, because nothing in this model blocks the robot.

## Run

```sh
uv run --no-project --python 3.12 python -B -I tools/evaluate-full-mission-v10.py   # about 10 minutes
node tools/verify-full-mission-v10.js   # hashes, the mission matrix, and every score recomputed from raw fields
```

`tools/build_pico_bundle.py OUT_DIR` builds the folder of firmware, shared logic and route files for the board.
