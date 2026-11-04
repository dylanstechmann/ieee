# Official Q&A clarification pack v10

2026-11-03 · IEEE SoutheastCon 2027 Stock Car Race · personal hobby/learning project, AI-assisted

**Status: draft, not posted.** These questions were prepared by an AI agent from the archived manuals. The owner or the club rules lead decides what to post. The agent does not post or contact organizers. Silence, or an AI reading of the manual, is not permission.

Manual revision: GM1 V3.0 (Game-Manual-2027-1-V3.docx) and GM2 V3.0 with October 4 revisions (Game-Manual-2027-2-V3-1.docx); organizer page re-checked 2026-11-03 still lists V3.0 and says Appendix F details will come in V3.1.

## How to use this pack

1. Search the official SoutheastCon Discord Q&A first. Record the channel, date range and search terms in `qa/answers-ledger.json` under `search_log`.
2. For any question already answered there, copy the answer into the ledger with its date and mark it `already-answered`.
3. Post batch 1 (the four questions that change the robot most), then batch 2, using `PASTE.md`.
4. Archive each answer verbatim in the ledger: date, respondent role and the manual revision it refers to.
5. Re-run `node tools/check-all.js`; the Q&A verifier checks the ledger format.

## Questions in priority order

### QA01: Minimum robot size (batch 1)

**Question.** R01 requires a minimum size of 10 in long by 10 in wide for 3 in up from the surface. (a) Does a round base 10 in in diameter satisfy this? (b) V2 added 'The Robot may not contract this portion at any time'; V3 omits that sentence. Must the 10 x 10 in lower portion be kept for the whole match?

**Manual text.**

- GM1 V3 R01 (extracted paragraph line 242): "The Robot must have a minimum size of 10 inches long by 10 inches wide for 3 inches up from the surface."
- GM1 V2 (historical) R01 (V2) (extracted paragraph line 234): "The Robot may not contract this portion at any time."

**Why it matters.** Chassis shape and every route: a square 10 x 10 in body sweeps a 14.1 in circle when it spins in place, a round 10 in body sweeps 10 in. The passability atlas finds that a round base needs only 0.5-1 in less free length for a lane change between vehicles, so its main benefit is turning room.

**Working assumption until answered.** Square 10 x 10 in lower body that never contracts.

**Replaces earlier items.** TB6

### QA02: AprilTag location and Technician settings (batch 1)

**Question.** (a) GM2 3.3 (definitions) says the AprilTag is mounted on the wall separating the pit area from the racecourse, while 3.4.1 and Appendix G say it is fastened by the starting area. Where exactly is it mounted (height and facing), and is it always visible from the start box? (b) 3.4.1 lists tag selection and obstacle placement before the Technician declares that all settings are selected, and GS01 is titled 'Interacting with Robot/Field After Randomization'. May the Technician set a switch on the robot (for example the assigned box) after the die roll, or does that forfeit the randomized-task points under GS01?

**Manual text.**

- GM2 V3 §3.3 (extracted paragraph line 170): "the Apriltag mounted to the Field on the wall separating the pit area from the racecourse will specify which pit box your Robot is assigned to."
- GM2 V3 §3.4.1 (extracted paragraph line 174): "will be selected and fastened to the wall by the starting area."
- GM2 V3 §3.4.1 (extracted paragraph line 179): "The Technician declares to the ref that all settings are selected, and the Robot is ready for match start."
- GM2 V3 G08 (extracted paragraph line 209): "the Technician is allowed to set and position the Robot in any way within the 12 inches starting cube"
- GM2 V3 GS01 (extracted paragraph line 212): "Interacting with Robot/Field After Randomization - Interactions with the Field after Randomization of the Game Elements is forbidden."

**Why it matters.** Whether the robot needs a camera and vision computer to read the tag, and whether obstacle positions must be sensed on board. A Pico-only robot boots in under a second; a camera computer adds cost, boot time and a failure point.

**Working assumption until answered.** No settings after randomization: the robot reads the tag itself and senses obstacles itself.

**Replaces earlier items.** TB7

### QA03: Obstacle vehicles and placement (batch 1)

**Question.** (a) Which exact toy vehicles are used (the Amazon 'Toy Vehicle Obstacle Set' in Appendix B), and what are their footprints? (b) Is each vehicle entirely inside its 16 x 16 in quadrant, in any orientation? (c) Does 'inner lane and outer lane' mean each vehicle sits in one half of its quadrant, and can two vehicles be on the same straightaway? (d) Appendix E measures 2 in from the side rail and 2 in from the center rail with a 16 in width, but the rails are roughly 22 in apart; which faces are the offsets measured from?

**Manual text.**

- GM2 V3 §3.1 (extracted paragraph line 127): "There will be 3 randomly placed obstacles on the course. The obstacles will be placed in different lanes."
- GM2 V3 §3.4.1 (extracted paragraph line 175): "The obstacles will be placed in quadrants on the straight aways, in the inner lane and the outer lane."
- GM2 V3 Appendix B (extracted paragraph line 321): "Toy Vehicle Obstacle Set"
- GM2 V3 Appendix E (extracted paragraph line 379): "The Quadrants will start 2 inches from the side rail and stop 2 inches from the center rail with a total width of 16 inches."

**Why it matters.** Every lap passes all three vehicles. With the organizer guide's plush vehicle (about 8.55 x 8.2 in), the agent-run passability atlas (derived/passability-atlas-v10) finds a contact-free gap for a 10 in robot in only 0-47% of placements, and in none when a vehicle is turned 45 degrees. Vehicle size and placement rules therefore decide whether the 25-point obstacle bonus is achievable at all.

**Working assumption until answered.** Vehicles about 8.55 x 8.2 in, wholly inside a quadrant, any orientation; contact-free passes are not guaranteed.

**Replaces earlier items.** Q4, Q5, TB4

### QA04: Track markings (batch 1)

**Question.** May the robot drive on or across the white track marking? At both ends the strip between the marking and the wall is about 8.4 to 8.7 in, narrower than the 10 in minimum robot. Is there any lane requirement other than the physical walls and dividers?

**Manual text.**

- GM2 V3 §3.2 (extracted paragraph line 131): "There are 2 areas on the field: the racecourse and the pit area."
- GM1 V3 R01 (extracted paragraph line 242): "The Robot must have a minimum size of 10 inches long by 10 inches wide for 3 inches up from the surface."

**Why it matters.** If the marking were a boundary, no legal robot could fit the end strips, so the answer decides which corridors routes may use.

**Working assumption until answered.** Only physical walls and dividers constrain motion; minimize marking crossings where it costs nothing.

**Replaces earlier items.** Q2, TB2

### QA05: Pit access (batch 2)

**Question.** Which checkered openings may the robot use to enter and to leave the pit area? May it enter and leave through the same opening, and may it cross the start box on the way?

**Manual text.**

- GM2 V3 Appendix G (extracted paragraph line 390): "During the pit stop the robot must enter the Pit Area and drop off the old spare tire which is red and pick up the new spare tire which is blue."
- GM2 V3 Appendix G (extracted paragraph line 393): "enter assigned Pit Box"

**Why it matters.** Fixes the pit routes and how much time the pit stop costs.

**Working assumption until answered.** Any opening, same-end use allowed; simulated routes keep this conditional.

**Replaces earlier items.** Q1, TB5

### QA06: Laps and the final lap (batch 2)

**Question.** (a) Which direction must laps run, and may the robot reverse? (b) The pit detour may cross the start/finish checkerboard extra times; how are laps counted? (c) Does the final (victory) lap begin when the robot leaves the pit after lap 2, or at the next finish-line crossing?

**Manual text.**

- GM2 V3 §3.2.2 (extracted paragraph line 149): "Robot completes three laps around the course in under 3 minutes."
- GM2 V3 §3.2.2 (extracted paragraph line 150): "Robot makes a pit stop between lap 1 and 2 or between lap 2 and 3."
- GM2 V3 §3.1 (extracted paragraph line 127): "On the final (victory) lap, if the Robots raise a flag with the school logo, colors, emblem, etc., additional points will be awarded."

**Why it matters.** Lap-counting logic and when to raise the school flag (25 points).

**Working assumption until answered.** Either direction; laps counted by route progress; flag raised on leaving the pit after lap 2 and kept up.

**Replaces earlier items.** Q3, TB3

### QA07: Tire exchange and parking (batch 2)

**Question.** (a) Appendix G says the robot does not have to enter the assigned pit box, but its sequence says 'enter assigned Pit Box'. Must any part of the robot enter the box, or may it reach in? (b) Is a pit stop required to earn the 100 points for finishing within 3 minutes? (c) Is the more-than-75%-in-box check made at the finish-line crossing or after the robot stops, and is the 2:45 / 3:00 time taken at the finish line or at parking?

**Manual text.**

- GM2 V3 Appendix G (extracted paragraph line 392): "The robot itself does not have to enter the assigned pit box during the challenge."
- GM2 V3 Appendix G (extracted paragraph line 393): "enter assigned Pit Box"
- GM2 V3 §3.3 (extracted paragraph line 160): "more than 75% of the Robot must be in the Assigned Pit Box to be awarded points."
- GM2 V3 §3.6 (extracted paragraph line 222): "Crossing the finish line in 3 minutes or less"

**Why it matters.** Mechanism reach, pit route, and whether parking time counts against the 2:45 bonus.

**Working assumption until answered.** Robot body enters the box; parking time is charged inside the 165 s bonus budget.

**Replaces earlier items.** Q7, TB3

### QA08: Start flag (batch 2)

**Question.** 3.1 says the robot begins when the green flag is lowered, but 3.4.1 and 3.4.2 say the flag is secured down and the referee raises it. Which is correct, where exactly is the flag mounted, and when will V3.1 with Appendix F be posted?

**Manual text.**

- GM2 V3 §3.1 (extracted paragraph line 127): "When the green flag is lowered, your Robot will begin."
- GM2 V3 §3.4.1 (extracted paragraph line 176): "The green start flag will be secured in the down position."
- GM2 V3 §3.4.2 (extracted paragraph line 181): "The match starts when a Referee raises the Start Flag and declares the Match started."
- GM2 V3 Appendix F (extracted paragraph line 383): "Details will be provided in Version 3.1."

**Why it matters.** Start sensing for the 10-point green-flag start; an early start costs a Yellow Card and 2 points.

**Working assumption until answered.** Detect a raise; keep the start-switch fallback with its 5 s static period.

**Replaces earlier items.** TB1

### QA09: Field tolerances and walls (batch 2)

**Question.** How is the G02 +/-1 in tolerance applied: independently per element, so a corridor could narrow by up to 2 in? Are the walls mounted inside the 4 x 8 ft board, and are they actual 3/4 in lumber or 1 in as drawn?

**Manual text.**

- GM2 V3 G02 (extracted paragraph line 202): "Competition provided Field and Game Elements will start each Match with positional tolerances that may vary by"

**Why it matters.** Clearance margins for every corridor, the U-turns and the obstacle passes.

**Working assumption until answered.** Independent +/-1 in per element; walls inside the board; test both 3/4 in and 1 in.

**Replaces earlier items.** Q6

### QA10: Team Game Elements and publicity (batch 2)

**Question.** Are Team Game Elements used in this game (TE01 and TE02 exist, but the game describes none)? Is the 10-point publicity award counted once or in every match?

**Manual text.**

- GM2 V3 TE01 (extracted paragraph line 214): "Each Team Game Element must pass Inspection before it is allowed to be used in a Match."
- GM2 V3 §3.6 (extracted paragraph line 244): "Team enters the publicity contest"

**Why it matters.** Low; affects the score model and whether any separate element is worth building.

**Working assumption until answered.** No Team Game Elements; publicity excluded from the robot-task total.

**Replaces earlier items.** TB8

## Where the earlier drafts went

| Earlier item | Description | Now covered by |
|---|---|---|
| Q1 | derived/confirmation-packet-v3/questions-to-organizer.md Q1: pit access around either end of the divider, same-end entry/exit, crossing the start box | QA05 |
| Q2 | Q2: lane or marking containment | QA04 |
| Q3 | Q3: lap direction, reversing, repeated finish crossings during the pit detour, finish-line endpoints | QA06 |
| Q4 | Q4: allocation of the 3 cars across quadrants and lanes, containment, orientation | QA03 |
| Q5 | Q5: toy models, dimensions, substitutions | QA03 |
| Q6 | Q6: reference faces for Appendix E offsets, G02 tolerance application, flag-tower projections | QA09 |
| Q7 | Q7: reach in versus enter the box, what completes a pit stop, timing of the >75% parking check | QA07 |
| TB1 | derived/team-brief-v7/TEAM-BRIEF.md section 7 item 1: start flag raised or lowered, mount, V3.1 timing | QA08 |
| TB2 | TB item 2: driving on or across the white line, lane requirement | QA04 |
| TB3 | TB item 3: enter box or reach in, pit stop needed for the finish points, lap counting around the pit, start of the final lap | QA06, QA07 |
| TB4 | TB item 4: toy models and sizes, whole car inside quadrant, two cars on one straightaway | QA03 |
| TB5 | TB item 5: checkered openings for entering and leaving the pit | QA05 |
| TB6 | TB item 6: round 10-in base and R01 | QA01 |
| TB7 | TB item 7: Technician setting the pit box after the die roll | QA02 |
| TB8 | TB item 8: Team Game Elements, publicity once or per match | QA10 |

The earlier drafts are kept unchanged in `derived/confirmation-packet-v3/` and `derived/team-brief-v7/`.
