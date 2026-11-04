# 15-minute demo: run sheet

2026-11-04 · for the owner, if the team lead takes up the offer of a laptop demo. Notes for presenting, not a handout.

## Before the meeting

Open these so nothing has to load live. The two replay pages work offline in any browser.

- `derived/club-update-v10/SECTION-4.1-UPDATE.pdf`
- `derived/maneuver-v10/summary.md`, at the vehicle-size table
- `share/Mission-Replay-v10.html`: a mission with a successful exchange
- `share/Mission-Replay-v10-bail-out.html`: a mission where the exchange fails

Optional: run `node tools/check-all.js` beforehand (about 5 minutes) and leave the passing summary on screen.

## Order

| Minutes | Show | Say |
|---|---|---|
| 0–1 | Nothing yet | The limits first: a personal project, nothing built, placeholder values, and AI agents wrote most of the code and ran most of the analyses. |
| 1–5 | The PDF | The scoring table, the LiDAR height row and the AprilTag family. Ask what the team already knows, and skip it. |
| 5–8 | The size table | At guide size no line avoids contact, so plain lanes score best. Dodging starts to pay near half that size. That is why measuring the official vehicles matters most. |
| 8–11 | `Mission-Replay-v10.html` at 2x | Pause when "touching a vehicle" appears and say it plainly: the simulated robot passes straight through. Then walk the event list: tag, flag, laps, exchange, parking. |
| 11–13 | `Mission-Replay-v10-bail-out.html` | The exchange fails twice, the robot abandons it, finishes the laps and still parks. |
| 13–15 | The questions from the message | Ask how you could help, and let the lead choose what comes next. |

## Run one live (optional)

This needs `uv`, takes about 6 seconds and reproduces that layout's row in `derived/full-mission-v10/report.json`:

```sh
uv run --no-project --python 3.12 python -B -I tools/demo-mission-v10.py --layout 100 --out replay.html
```

Layouts are seeds 100–119. Leave out `--layout` for an empty field, and add `--box 1`, `2` or `3` to choose the box. Delete `replay.html` afterward so it stays out of the repository.

## If asked

| Question | Answer |
|---|---|
| What did you do yourself? | Answer from what you actually reviewed, and claim no more than the message does. |
| Has any of this run on hardware? | No. Nothing has run on a board or on MicroPython; the Pico bundle has only passed a static lint. |
| Why trust the simulation? | Don't, yet. It shows the software fits together. Friction, mass, motor and sensor values are placeholders until bench and field data replace them. |
| What happens when it hits a vehicle? | Unknown. A touched vehicle neither resists nor moves in this model, so contact trials with the real set are the next real evidence. |
| Does the camera work? | It is not modeled. The tag and flag are simply given to the software, and the tag decoding was tested only on the organizer's image and synthetic images. |
| Does the pose estimator run on the Pico? | Not yet. It is host-only, and its speed on a Pico is unknown. |
| What is the tightest moment? | A square base spinning in the pit box: 0.27–0.61 in from the wall in the runs traced. |
| Has the Discord Q&A been checked? | No. The ten questions are drafted and none is posted, because that is the team's call. |
