# Conversation prep: meeting the FAU IEEE lead

2026-11-05 · for the owner only — not a handout. Companion to `derived/club-update-v10/DEMO-RUN-SHEET.md` (the 15-minute formal demo). This one is for the casual 1-on-1: what to show, what to know cold, and how to answer anything thrown at you. The formal message draft can wait; if the conversation goes well you will not need it.

## Before you leave

- Open these in tabs so nothing loads live: **`share/Showcase-v10.html`** (the front door), `share/Mission-Replay-v10.html`, `share/Mission-Replay-v10-bail-out.html`, `share/Robot-Studio-v8.html`.
- Laptop charged. The pages are offline; no wifi needed.
- Optional flex: leave `node tools/check-all.js` passing output on a tab — the project checks its own artifacts (~5 min run).
- Optional live run (needs `uv`, ~6 s): `uv run --no-project --python 3.12 python -B -I tools/demo-mission-v10.py --layout 100 --out replay.html` — generates a fresh mission replay from a seed. Delete `replay.html` after.
- Decide the sharing question in advance: the GitHub repo is **private**. If he wants access, either add him as a collaborator or just send him `Showcase-v10.html` (it is one self-contained file; the deep-dive studios are separate files in `share/`).

## The 30-second story

> "I've been watching the team and wanted to contribute something real, so I built the digital side of the Stock Car robot: the arena modeled from the organizer's own CAD, a drivetrain mule checked against Pololu's vendor CAD — which actually caught two errors before anything was printed — motor-physics speed limits, and a full mission simulator where 91 of 91 missions finish and park. Nothing physical exists yet, so what I want from the team is help turning the first build weekend into measurements. It's a hobby project; AI agents wrote a lot of the code and ran a lot of the analysis, and I label all of it."

That last sentence is deliberate. Saying it first costs nothing and buys trust with veterans.

## What to open, when

| Moment | Open | The point |
|---|---|---|
| He asks what you've been up to | `Showcase-v10.html` | One page tells the whole story: arena, parts, physics, sim. Scroll slowly; it is designed to be shown off. |
| He leans in on the field | The arena diagram (section 01) | Dimensions are extracted from the organizer's Fusion 360 B-rep, not traced. Mention the 6.995 in race-end strip. |
| He asks about hardware | Parts table + `Robot-Studio-v8.html` | Per-part vendor CAD with hashes. Then the catch (below). |
| He asks about performance | `Mission-Replay-v10.html` at 2x | Full mission with event log. Pause at "touched a vehicle" and say plainly the sim drives through it. |
| He wants robustness | `Mission-Replay-v10-bail-out.html` | Exchange fails twice → robot abandons it, finishes, still parks. Supervised fallback logic. |
| He asks "how can we use this?" | Section 06 (Next four moves) | The concrete asks. Let him pick. |

## The three things that should land with veterans

1. **The vendor-CAD catch.** "Before buying anything, I modeled the drivetrain against Pololu's own STEP files. Their gearmotor shaft sits 7 mm off the gearbox center, and the mule kit as originally drawn left the wheels 7.09 mm off the floor. The corrected deck fixes both and ships with a drill template." — This is what real mechanical work looks like, and it happened before a single part was ordered.
2. **The physics-derived speed limit.** "12 in/s, and here is why not 16: on a 7.5 in U-turn the outer wheel runs 1.53× the robot's center, and 16 in/s would need 24.5 in/s at the wheel — above the model's top speed in all 27 conditions." A concrete, falsifiable claim beats adjectives.
3. **The obstacle finding.** "If the official toy vehicles are near the guide's plush size — 8.55 by 8.2 inches — a 10-inch robot passes without contact in only 0–47% of placements, and a clean lap is nearly impossible. So measuring the real set, or a gentle-contact policy, matters more than dodging." This is a decision-relevant result the team can act on immediately.

## Numbers you can quote cold

| Number | Say it as |
|---|---|
| 91 / 91 missions finished and parked | "across four evaluation sets in simulation" |
| Median finish ≈ 58–63 s | "vs the 2:45 speed-bonus line — time is not the constraint, obstacles are" |
| 390 + 10 points | "V3.0 scoring model from the archived manuals" |
| Top speed 21.0–24.3 in/s; cruise 12 in/s | "model values, placeholder friction 0.15–0.35" |
| 0.27 N·m grip vs 2.65 N·m stall | "grip limits us, not the motors — that is why the floor trials matter" |
| Peak 6 A | "size fuse and battery wiring for 6 A plus electronics" |
| $177.25 Order A / $182.39 field | "researched, archived prices; nothing ordered" |
| AprilTag 41h12, IDs 1–3 | "decoded from the organizer's sheet with AprilTag 3" |
| Tightest moment: 0.27–0.61 in from the wall | "a square base spinning in the 12 in pit box" |
| Registration Jan 1–Mar 1; matches Apr 17 | "best of three quals counts; everyone competing needs IEEE membership" |

Provenance rules: CAD numbers are "measured from vendor/organizer CAD", sim numbers are "agent-run simulation", and **nothing is a hardware measurement** until the mule and field exist.

## If it gets technical or skeptical — honest answers

| He asks | You say |
|---|---|
| "What have you actually built?" | "Nothing physical yet. Everything digital is done so that the first purchase and first build are de-risked. That is exactly what I want help with." |
| "Is this just AI?" | "Most code and analysis were AI-assisted across many sessions — it's labeled agent-run throughout. My job was reviewing it, setting the rules of evidence, and killing overclaims. The repo's errata file exists because I did not trust earlier numbers." |
| "Why should we trust the sim?" | "You shouldn't, yet. It proves the software stack fits together and it ranked design options. Every physical parameter is a placeholder waiting on bench and floor measurements." |
| "What happens on contact with a vehicle?" | "Unknown — the sim treats obstacles as ghosts. Contact trials with the real set are the top physical test." |
| "Does the camera work?" | "Not modeled. Tag decoding was tested on the organizer's sheet and synthetics; glare broke single-frame reads over 5–10% coverage, so it votes over frames." |
| "What did you do yourself?" | Answer from what you actually reviewed and decided — claim no more. Safe true statements: you directed the work, set the evidence rules, reviewed the outputs, and own every number on the page. |
| "Can we use this?" | "That is the idea. Software, CAD and studies are all in the repo. I'd want it checked against measurements, not adopted as truth." |
| "What about the rule questions?" | "Ten are drafted with manual references and none is posted — posting is the team's call. They outrank the manuals, so they are the fastest path to a settled design." |

## Do not claim (guardrails)

- No hardware, no measurements, no reliability numbers, no "ready to compete".
- Do not say the team endorses any of this — it is offered for discussion.
- Do not quote the old v9 numbers (20/20 episodes, 32 s laps) — they were corrected in `ERRATA-2026-11.md`.
- Do not promise RL/autonomy; there is no trained policy and none is planned before real sensor data.

## Optional questions to ask (afterthoughts — pick 2 or 3)

1. "Where does the team most need another pair of hands right now?"
2. "Is anyone already working the drivetrain or field side, so this does not collide with existing work?"
3. "Who should decide about posting the rule questions to the official Q&A?"
4. "Does the club have a space/printer/battery setup for a build weekend?" (the FAU logistics question)
5. "Would a practice-field build day before finals week be useful?"

## If other members show up later

Lead with the mission replay (it is the most watchable thing), keep to 5 minutes, and repeat the limits line early. Veterans will respect the honesty more than the polish. If someone wants a file, `Showcase-v10.html` is the one to send.
