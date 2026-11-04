# Lap study v10

2026-11-03 · agent-run synthetic study for the owner's hobby/learning project.

**Scope.** Perfect knowledge, no control error, guide-size plush vehicles (about 8.55 x 8.2 in; the official vehicles are unmeasured), the organizer CAD field, and explicit time and score assumptions in `software/stockcar/lapmodel.py`. **It is not a robot test or a score prediction.**

## Question

Over many random Appendix E layouts:
- how often can a 10 x 10 in robot complete laps without touching any vehicle?
- how long do laps and missions take at different speeds?
- what does that do to the expected score?

## Method

- **Layouts:** 200 seeded random layouts for each quadrant reading (3) and vehicle-yaw mode (aligned 0/90 degrees, or random), 1200 in total. Each picks the empty quadrant, the lanes, the positions and the yaws.
- **Each straightaway is decided exactly where possible:**
  - **contact** when some vehicle leaves no 10.5 in gap;
  - **clean line** when one straight line clears every vehicle;
  - otherwise hybrid-A* checks a **lane change**.

  Layouts are static, so the outcome repeats on all three laps. Any contact in a lap loses that lap's 25-point obstacle bonus.
- **Times:** U-turns are 7.5 in arcs limited by lateral acceleration. Straights run at cruise speed and lane changes at half speed; each contact adds 1.5 s. Entry, the pit visit, parking, an 8 s exchange and 10 s of fixed stops are added.
- **Speed settings:** 8 in/s (the v9 simulator), 12 in/s and 16 in/s. The motors' no-load speed with 80 mm wheels is about 24.7 in/s.

## What it found

See `summary.md` for the tables.

1. **Contact-free laps are rare with guide-size vehicles:** 0–2.5% of layouts, depending on the reading. Most straights force a contact. Unless the official vehicles are smaller, the 75 obstacle points are a bonus, not a plan. Measuring the official set comes first.
2. **Time is not binding once laps use arcs.** Median missions take about 108 s at 8 in/s, 81 s at 12 in/s and 67 s at 16 in/s, all under the 165 s bonus threshold. The v9 timeouts came from its stop-spin-settle route.
3. **The exchange is worth about 45 expected points** at an assumed 70% success: about 296 points against 250 for driving only. Reliable laps and parking come first, then the exchange.

## Run

```sh
uv run --no-project --python 3.12 python -B -I tools/lap-study-v10.py   # about 15 minutes
node tools/verify-lap-study-v10.js                                       # hashes, counts, internal consistency
```
