# Section 4.1 "Questions for Machine Design": update to the V3 manuals

November 4, 2026 · Dylan Stechmann · offered for team discussion

The October 21 concept draft cites Game Manual 2 Rev. 2.0, and V3.0 changes the scoring, adds a third obstacle and answers several margin questions. Each row below keeps the team's ideas and adds what V3 says. Nothing here is a team decision.

**Sources and limits.** Prepared with AI assistance (Anthropic's Claude) from the organizer's files: Game Manual 1 (GM1) V3.0, Game Manual 2 (GM2) V3.0 with its October 4 revisions, the arena build guide and CAD, the tag sheet and the tire model. The organizer's page still listed V3.0 on November 4. The official Discord Q&A outranks the manuals (GM1 C00) and was not reviewed. "Sim" marks agent-run simulation on placeholder values: a lead to check, not a measurement. Field dimensions are nominal CAD from June 2026, before V3, and the field may vary by ±1 in (G02). QA01–QA10 are the open rule questions listed at the end; none has been posted.

## Scoring: what changed from Rev. 2.0

| Item | Rev. 2.0 | V3.0 |
|---|---|---|
| Speed bonus | 1 point per full 10 s under 3:00 | 30 if under 2:45 |
| Enter pit, correct pit, 2 s wait | +15, +15, −5 | Removed |
| Drop a tire | 25 | Red tire: 25 in the assigned box, 12 elsewhere |
| Pick up a tire | 40 | A different blue tire: 40 from the assigned box, 20 from elsewhere; lost if dropped before the finish line |
| No gray-wall contact | 10 per lap | 15 per lap |
| No obstacle contact | 15 per lap, 2 obstacles | 25 per lap, 3 obstacles |

Unchanged: enter the course 25, finish within 3:00 100, green-flag start 10, end in the assigned box 15, school flag 25, publicity 10. The V3 robot maximum is 390 points, plus 10 for publicity.

## The table, row by row

| What (V3 points) | The team's ideas | What V3 adds |
|---|---|---|
| **Start on the green flag** (10) | Detect the flag's color (RGB) with a camera and wait about 1 s after detection to avoid early starts; enter coordinates to start at a near-perfect distance (B). | The referee raises the flag (GM2 §3.4.2), though §3.1 says "lowered" (QA08). Appendix F awaits V3.1, so keep the detector easy to change. An early start loses the 10, costs 2 more and draws a Yellow Card (G05); a late start has no penalty, so err late. A second Yellow Card becomes a Red Card, which zeroes that match (C03). Fallback: a marked start switch with a 5 s static wait (R03), which likely gives up the 10. |
| **Read the AprilTag** (enables 15 + 25 + 40) | A QR-code-like reader using the camera; a ROS-based AprilTag library (B). | The tags are tagStandard41h12, IDs 1–3 (decoded from the organizer's sheet with the AprilTag 3 detector). OpenCV's ArUco module has no 41h12 dictionary, so use AprilTag 3: C `apriltag`, Python `pupil-apriltags` or a ROS wrapper. One tag is set by a die roll; GM2 places it both on the pit wall (§3.3) and by the start area (§3.4.1) (QA02). For pose, the tag size is the inner 5 of the 9 printed cells. Sim: glare over 5–10% of the tag usually broke decoding, so vote over several frames. If the read fails, a guessed box still averages about 48 points when the exchange works. A switch set by the Technician is risky until QA02 is answered (R19, GS01). |
| **Enter the racecourse** (25) | Recognize the checkered pattern with the camera; at the start, find the entry checkers and drive forward; maybe compute the start-to-flag distance with ROS. | The start box, checkered band and walls are fixed to ±1 in (G02), so a scripted move on encoders and a gyro may be enough. A downward light sensor can see the checkers as the crossing cue. The two openings beside the pit divider are about 15 in wide; which ones may be used is open (QA05). |
| **Three laps within 3:00** (100); **under 2:45** (+30) | LiDAR to stay away from the black painted walls and obstacles, with PID or something better; LiDAR plus an object-detection library, standard or ROS; look at the Rover's implementation (B); speed up after passing obstacles and plan corners (B). | The walls are gray and the floor is black; the center line, pit boxes and start area are white, which suits a reflectance array. Walls are about 3.5–4 in tall and the center divider about 1–1.5 in (CAD against V3's 1 x 2 callout; measure a built field), so a LiDAR on top scans over them. Options: a low front slot, low side ToF sensors, or a camera angled down. Nominal lanes are about 10.5 in outside the marking and 11 in inside it. The end strips are 7–8 in, narrower than any legal robot, so turns cross the marking; V3 states no lane rule, but that is unconfirmed (QA04). Sim: with arc turns, a clean mission takes about 60 s, so accuracy matters more than speed. |
| **Drop the red tire** (25 assigned box, 12 other); **pick up a different blue tire** (40 / 20) | Rough sketches in the shared Teams files. | Sequence (Appendix G): after lap 1 or 2, drop the red tire, pick up a different blue one, leave, and keep it to the finish line. Appendix G says the robot need not enter the box, but its sequence line says "enter assigned Pit Box" (QA07). The red tire starts within the 12 in cube (Appendix G, R01). The tire is TPU, 68.2 mm across with a 40.3 mm bore, 27.6 mm thick (organizer model). Its mass and how it sits in the box are not stated. Suggested: pit after lap 2, with a budget of about 20 s and a bail-out, because a stuck robot loses more than the exchange's 65. |
| **Re-enter the racecourse** | Reuse the initial-entrance algorithm, together with the robot knowing the pit stop is complete (B). | The same scripted move in reverse fits, once QA05 says which opening is legal. Sim: sharp pit corners could not be followed at speed; rounded corners at about 8 in/s cleared every run. |
| **No obstacle contact** (25 per lap); **no gray-wall contact** (15 per lap) | LiDAR to stay away from the walls and obstacles, with PID; the same detection algorithm for avoiding obstacles (B). | Clean laps are 120 of the 390 points. Three vehicles sit in four 16 x 16 in quadrants (Appendix E) and are passed every lap. Their size decides this row: the organizer's guide shows a plush vehicle about 8.55 x 8.2 in, and the official set (Appendix B, $35.95) is unmeasured. Sim at that size: a 10 in robot had a contact-free lap in 0–2.5% of layouts, and hugging a wall only added wall contact. Dodging starts to pay near half that size. Pushing a vehicle is not modeled, so contact trials with the real set matter most (QA03). Assume the center divider counts as a wall: the build guide paints it gray. |
| **Raise the school flag on the final lap** (25) | Maybe a wireless command to a servo, which raises the question of wireless with game objects on the field; count the laps finished and raise it on the last lap. | The flag is part of the robot, so wire the servo; wireless is allowed between components of the robot itself (R19). Raise it when the last lap begins and keep it up; when that lap begins is open (QA06). Confirm each crossing with encoder distance so the pit detour is not counted twice. |
| **End in the assigned pit box** (15) | Store the pit tag in memory and return to it when the laps are finished. | "In" means more than 75% of the robot inside the 12 x 12 in box, boundary excluded (GM2 §3.3). A robot just over 10 in has about 1 in of slack each way. A downward sensor can confirm white. Sim: the tightest moment of a whole mission was a square base spinning in the box, 0.27–0.61 in from the wall. A round base has no corner to swing, if it qualifies (QA01). |
| **Auto-stop at 3:00** (not scored, "highly suggested") | Needs a timer. | Start the timer on the start event and stop all motion a second or two before 3:00 (GM2 §3.4.3). Actions after time expires do not score (G06). The emergency stop must still halt everything (R04, G04). |
| **Rows to delete** | "Enter Pit Area between laps +15", "correct pit from AprilTag +15", "wait two seconds before exit or −5". | None of these is in V3. |

## Rows to add

| What | What V3 requires |
|---|---|
| Size and mass | At most 12 x 12 x 12 in at the start with the red tire loaded, at least 10 x 10 in for the bottom 3 in (R01), and at most 12 kg in the heaviest configuration (R02). A square 10 in base sweeps a 14.1 in circle when it spins. Whether a round 10 in base qualifies, and whether the lower portion may contract, is open (QA01). |
| Start and stop | A clearly marked emergency stop that halts everything (R04), and a clearly marked start switch if one is used (R03). |
| Identification and safety | Team identification readable from 6 ft (R10); no sharp edges or hydraulics (R05); power distribution at 30 V or less (R16); no strobes or visible-light lasers (R17). |
| One self-contained robot | One Robot unit (R01), and no communication with anything outside it (R19, G07). |
| Removal and inspection | Removable by hand without tools (R09). Only mechanisms present at inspection may be added, removed or reconfigured between matches (GM1 §6). |
| Match-day logistics | Robots stay off and cannot be charged in sequestration, and teams get 2 minutes to collect them when called (GM1 §7). Plan for a fast power-on and self-check. |
| Judging | A 5-page Engineering Portfolio and a ten-minute interview (GM1 §4.4, §9). The handout's "Engineering Notebook" row can become this portfolio. |

## Margin questions

| Question | What V3 says |
|---|---|
| "What about IR lasers?" | R17 bans strobe lights and visible-light lasers, and focused light must not pose safety risks. Infrared ToF sensors and LiDAR are not banned by that text. Choose eye-safe parts and bring the datasheet to inspection. |
| "No RF to its pit?" and wireless to game objects | Correct, none. R19 bars communication with anything not contained in the robot at the start, and G07 bars external signals during a match. |
| A second robot or a self-driving garage | R01 says "The game does not permit more than one Robot unit", and GM1 defines a Robot Unit by "individual Autonomy or self-actuation". As written, that appears to exclude a garage that drives itself. |
| A telescoping camera | Allowed on the robot: robots may expand after the start (R01, G03), as long as nothing reaches outside the field perimeter (S01). |
| A trailer | A passive towed part would be part of the one robot, so it must fit in the 12 in cube, and it makes the turns harder. |
| "Bonus points for creativity during Judging" | Match scoring has none. Design is judged separately in the Robot Design Challenge awards (GM1 §9). |

## Open rule questions (drafted, none posted)

QA01 minimum size and round base · QA02 tag location and Technician settings · QA03 vehicle models, sizes and placement · QA04 driving on the marking · QA05 pit openings · QA06 lap direction and counting · QA07 exchange and parking · QA08 start flag · QA09 field tolerances · QA10 Team Game Elements and publicity.
