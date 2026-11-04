# IEEE SoutheastCon 2027 Stock Car Race robot

A personal hobby and learning project for the IEEE SoutheastCon 2027 hardware competition (Daytona Beach; hardware matches on April 17, 2027).

Most planning, simulation and software here were developed with AI assistance across many sessions. Analyses run by an AI agent are labeled as agent-run; physical work is only claimed when the owner records it. **Nothing in this repository is a validated competition robot.**

## Status — November 3, 2026

- **Physical work: none yet.** No parts are ordered, no practice field is built, no organizer Q&A has been posted and no robot has been tested.
- **Rules:** the V3.0 manuals are reviewed. The score model is 390 robot points + 10 publicity. V3.1 (start-flag details) is announced but not posted.
- **Hardware:** a drivetrain test mule (Order A, $177.25 researched) has been checked against Pololu's own CAD. That check found a 7 mm motor-shaft offset that the original mule kit missed. The corrected shaft-down mule deck is drawn in `derived/drivetrain-mule-v10/`, with a drill template, STEP/STL and caliper-driven regeneration; it is not yet printed. No competition chassis exists yet.
- **Software:** a synthetic mission simulator (`software/mission_v9.py`) and I/O-free match logic (`software/match_logic.py`) exist.

  **Known limits of the simulator** (found in the November 3 review):
  - Its "nominal" runs have no obstacles, but every real match has three.
  - Its obstacle stand-in is about half the size of the organizer's vehicle.
  - Its 20 evaluation seeds are 3 deterministic runs.
  - Its RL interface cannot yet be driven by a policy.

  The v10 simulator (`derived/mission-v10/`) fixes these.

## Start here

| To... | Open |
|---|---|
| See the plan, gates and dates to April | `BACKCAST-2026-11.md` |
| Build the practice field | `derived/practice-field-v10/` (materials, layout coordinates, as-built template), from the organizer CAD in `derived/organizer-cad-v10/` |
| Build the drivetrain mule | `derived/drivetrain-mule-v10/` (shaft-down deck, risers, fit report, inspection templates) |
| Prepare the first bench session | `firmware/README.md` (Pico 2 MicroPython skeleton, not yet flashed) and `firmware/ORDER-B-BENCH-KIT.md` |
| See which sensors keep the robot localized (simulation) | `derived/estimation-v10/README.md` |
| See what the drivetrain can do, and what limits it (simulation) | `derived/envelope-v10/README.md` (agent-run, synthetic) |
| Know whether obstacles can be passed | `derived/passability-atlas-v10/README.md` (agent-run geometry; vehicle size decides it) |
| See lap times, contact rates and expected score over random layouts | `derived/lap-study-v10/README.md` (agent-run, synthetic) |
| Build a full-size mockup and sizing box | `derived/competition-mockup-v10/README.md` |
| Test tire pickup concepts | `derived/tire-fixture-v10/` (1:1 target, DOE sheets, `tools/analyze_e04_v10.py`) |
| Post the official Q&A questions | `derived/qa-pack-v10/QUESTIONS.md` and `PASTE.md`; record answers in `qa/answers-ledger.json` |
| Prepare the Dec 13 concept review | `derived/club-update-v10/CDR-PREP.md` |
| Read the short club summary | `derived/club-update-v10/CLUB-UPDATE.md` (corrections and next two weeks) and `derived/club-package-v9/CLUB-PRESENTATION.md` |
| Understand status and lineage | `PROJECT-STATUS.md` |
| Check rules and numbers | `CURRENT-RULES-2026-10-29.md`, `VERIFIED-FACTS.md` + `VERIFIED-FACTS-ADDENDUM.md`, `ERRATA-2026-11.md` |
| View the robot and field in 3D, offline | `share/Robot-Studio-v8.html` (guide: `derived/robot-studio-v8/README.md`) |
| Read older announcements and the October plan | `HISTORY.md` |

## Run the checks

```sh
node tools/check-all.js          # about 5 minutes
node tools/check-all.js --full   # adds a 3-minute reproduction check
```

`check-all` runs:
- the Node test suite;
- every `tools/verify-*.js` artifact verifier;
- the Python suites (CPython 3.12 through uv);
- a check that the run left the working tree unchanged.

It was tested with Node v24.18.1, uv 0.13 and CPython 3.12.16. It checks software and reproducibility, not robot performance. `npm test` runs only the Node tests.

## Repository map

| Path | Contents |
|---|---|
| `derived/<name>-vN/` | Versioned packages. Most are sealed by a `manifest.json` of input and output hashes and checked by `tools/verify-<name>-vN.js`. To change one, add a new version. |
| `tools/` | Generators, verifiers, `check-all.js` |
| `tests/` | Node tests |
| `software/` | Python mission simulator and match logic, with tests |
| `firmware/` | Pico 2 MicroPython skeleton (bench and safety layer) with CPython host tests; not flashed |
| `schemas/` | Shared data formats (telemetry v1) |
| `share/` | Offline HTML studios (v4–v8) |
| `sources/` | Archived organizer and vendor files with hashes |
| `derived/audits/` | Dated audits, including the November 3 baseline |
| `*-vN.json` (root) | Inputs to the matching packages |
| `SESSION-STATE-*.md` | Dated handoffs |
| `website/` | Older "Road to Daytona" site (separate git history). It still shows V2 scoring and is historical. |

## House rules for people and agents

- **Never edit pinned files**; record corrections in `VERIFIED-FACTS-ADDENDUM.md`, `ERRATA-2026-11.md` or a new package version. Pinned files:
  - `VERIFIED-FACTS.md`, `RULES-AND-SOURCES.md`, `GEOMETRY-AND-CONCEPTS.md`, `STRATEGY-AND-ARCHITECTURE.md`, `RESOURCES-AND-BUDGET.md`, `CURRENT-RULES-2026-10-29.md`;
  - any output listed in a package manifest.

  Sealed manifests pin these, and an edit silently breaks verifiers.
- Run `node tools/check-all.js` after any change, including documentation.
- Keep negative results. Never relax a rule, size or time limit to make a route pass.
- Agents do not buy parts or contact the organizers. Label agent-run work, and claim physical results only from recorded measurements.

## Credits

- **Rules, field and game elements:** the IEEE SoutheastCon 2027 hardware competition organizers. Game Manuals 1 and 2 (V3.0), the arena build guide, the arena Fusion 360 file and the spare-tire CAD/STL are archived with hashes in `sources/`.
- **Drivetrain CAD and data:** Pololu product pages, datasheets and STEP models (`sources/hardware-2026-10-31/`, `sources/hardware-2026-11-01/`, `sources/electrical-2026-10-31/`).
- **Software used:**
  - AprilTag 3, through `pupil-apriltags`;
  - three.js and esbuild for the studios;
  - cascadio and trimesh for STEP conversion;
  - Blender for the field model;
  - Playwright with headless Chromium for browser checks;
  - Node.js, Python and uv.
- **AI assistance:**
  - AI coding assistants, including Claude (Anthropic), produced most of the analysis, software and documentation across many sessions.
  - The project history names other assistants for some earlier work.
  - The October 29 drawing transcription used a panel of vision models (Gemini, Qwen, Nemotron, Claude and GPT), listed in `tools/multimodel-vision.py`.

  The owner reviews and decides; agent output is labeled as such.
