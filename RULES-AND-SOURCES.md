# Rules, sources and unresolved decisions

> **Superseded October 29, 2026:** The organizer links V3 manuals and V2 scoring below is historical. See [CURRENT-RULES-2026-10-29.md](CURRENT-RULES-2026-10-29.md) for the V3 source snapshot and unresolved interpretations.

> **October 29 source review:** [REFERENCE-BASELINE.md](REFERENCE-BASELINE.md) records the archived V2 source checks, figure inspection, and conflicts with an unverified user-supplied GM2 extract. This document's time-sensitive claims and dated milestones remain historical until rechecked against official sources and Q&A.

Verified **October 8, 2026** against the organizer page and downloaded manuals. This ledger is a planning aid; the actual official text and official rulings govern. Team/category remains unconfirmed.

## Governing documents

| Source | Status and purpose |
|---|---|
| [Organizer Student Competitions page](https://ieeesoutheastcon.org/student-competitions/) | Current dates, materials and notices; fetched directly because the web search reader could not fetch it |
| [Game Manual 1 V2](https://ieeesoutheastcon.org/wp-content/uploads/sites/755/Game-Manual-2027-1-V2.docx) / [local copy](sources/Game-Manual-2027-1-V2.docx) | Revision 2.0, June 15, 2026; eligibility, tournament, construction, inspection and procedures |
| [Game Manual 2 V2](https://ieeesoutheastcon.org/wp-content/uploads/sites/755/Game-Manual-2027-2-V2.docx) / [local copy](sources/Game-Manual-2027-2-V2.docx) | Revision 2.0, June 15, 2026; Stock Car Race gameplay and scoring |
| [Arena Build Guide](https://ieeesoutheastcon.org/wp-content/uploads/sites/755/SEC-2027-Arena-Build-Guide.pdf) / [local copy](sources/SEC-2027-Arena-Build-Guide.pdf) | Supplemental guide archived; drawing dimensions have not yet been inspected for this plan |
| [Arena Fusion 360 ZIP](https://ieeesoutheastcon.org/wp-content/uploads/sites/755/2027-IEEE-SoutheastCon-Arena_Fusion360.zip) and [spare-tire ZIP](https://ieeesoutheastcon.org/wp-content/uploads/sites/755/Spare-Tire-v2.zip) | Organizer-linked construction references; not downloaded or dimensionally validated |
| [Official Discord](https://discord.gg/cuqdFvQFe8) | Q&A access point; Q&A history has not been accessed |
| [Conference registration](https://ieeesoutheastcon.org/registration/) | Current page says registration is not open |

GM1 **C00** prioritizes head-referee decisions, official Q&A, GM2 text, then GM1 text above supporting resources. Acquire current Q&A before closing the requirements gate. Archive hashes are in [sources/manifest.json](sources/manifest.json); a local copy is not proof that rules remain current.

## Current V2 scoring baseline

Source: GM2 **§3.6**. Clean-contact credits are per lap; publicity eligibility/application needs clarification.

| Achievement | Points |
|---|---:|
| Enter course | 25 |
| Finish three laps within 180 seconds | 100 |
| Each full ten seconds saved below 180 | +1 |
| Green-flag start | 10 |
| Pit stop after lap 1 or 2, at least two seconds | 15 |
| Correct assigned pit stop | 15 |
| Drop carried tire in pit area | 25 |
| Pick up a different fresh tire | 40 |
| End in assigned spot | 15 |
| Avoid gray-wall contact | 10/lap |
| Avoid vehicle-obstacle contact | 15/lap |
| Raise school flag on final lap | 25 |
| Enter publicity contest | 10 |

The fixed sum is **355**, including **345 robot-task points**. Score speed separately: `floor((180 - finish_crossing_seconds) / 10)` for a qualifying finish time, subject to any official clarification. At 120 s, the bonus is six and a complete nominal score is 361 with publicity, or 351 without it. This is arithmetic, not an achieved result. A theoretical 17-point bonus ceiling would require finishing in ten seconds or less and is not a practical target.

Moving before the required dwell earns ten rather than fifteen generic pit-stop points (§3.6). An early start loses green-start credit and incurs −2 and a Yellow Card (**G05**). Contacts lose the applicable clean-lap credits; V2 does not specify a separate per-contact deduction. A Red Card produces a zero match score and elimination loss (**GM1 C03**); another Yellow Card can escalate to Red.

## Requirements to tests

| Rule/source | Verified baseline | Evidence required before release |
|---|---|---|
| GM1 §3.2 | Main: one team per Region 3 university; all members undergraduate students there. Open: no origin restrictions. Both register. | Named category, roster, school/branch eligibility and organizer confirmation where needed |
| Organizer page | Student competitors must be IEEE members and conference registered | Membership and event confirmations |
| GM1 R01 | Starting robot maximum 12 × 12 × 12 in; minimum 10 in long × 10 in wide for first 3 in above surface; lower portion cannot contract; one robot unit | Dimensioned inspection rehearsal including every intended configuration; do not infer a solid lower prism |
| GM1 R02, R16 | Maximum 12 kg; power distribution at or below 30 V | Measured heaviest configuration and electrical review |
| GM1 R03–R04 | Manual start requires five seconds stillness; accessible marked emergency stop required | Start timing and emergency-stop drill |
| GM1 R18–R19; GM2 G07 | All processing onboard; no sending or receiving off-robot communication during a match except game-required interfaces. Internal wireless permitted; wireless devices off when not competing | Full mission with permitted interfaces only; local logging and radio-state checks |
| GM2 §3.1, §3.3 | Three laps; pit after first or second; three assigned spots; more than 75% of robot in assigned spot for stop/end credit | Independent lap, dwell, assignment and area-overlap scoring |
| GM2 G02 | Field/game-element positional tolerance ±1 in | Varied-field clearance and docking trials |
| GM2 G08, GS01 | Setup/randomization interaction restrictions | Technician rehearsal and Q&A clarification |
| GM1 §§6–7 | Inspect intended configurations; reinspect significant changes; sequestering restricts access and charging; two-minute prestaging | Mock inspection, battery/sequestering and setup rehearsal |
| GM1 C02 | Scoring questions within ten minutes | Match score review procedure and designated team representative |

## Tournament and dates

GM1 **§§4.7.1–4.9** ranks qualifying teams on their best of three scores, then second/third scores and rock-paper-scissors for qualifying ties. Top six advance directly; ranks 7–10 play for the last two seeds. Eight-team seeded single elimination follows. Ordinary elimination-score ties and applicability to the selected category need confirmation.

The [organizer page](https://ieeesoutheastcon.org/student-competitions/) currently lists:

- **January 1, 2027:** hardware registration opens.
- **March 1:** hardware registration closes; use February 15 as the internal submission deadline.
- **April 15, noon:** hardware room opens for check-in/practice.
- **April 17, by 8 a.m.:** rounds begin; final at the evening banquet.
- **April 15–18:** conference, Hilton Daytona Beach Oceanfront Resort.

## Preview is not the current rule set

The organizer anticipates **3–4 obstacles**, a start flag on the outer rail, and a live banquet final. It also mentions a **30-point maximum for completing the course in under three minutes**, without explaining whether that replaces the current completion award, changes the speed bonus, or both. The notice says to continue using posted V2 until revised manuals are published. Its expected revision dates conflict: late September in the notice, late July in the dates list.

Do not invent a revised maximum score. Test extra-obstacle robustness as an exploratory scenario; keep official scoring on V2 until new governing text or official Q&A establishes the change.

## Questions that must be resolved

These are proposed questions for the team to bring to official Q&A. They have not been sent or answered.

| Question | Needed by | Reason |
|---|---|---|
| Is SoutheastCon Stock Car Race the intended competition, and which category/eligibility route applies? | Oct 15 | Establish the actual winning outcome and entry path |
| What revisions and binding Q&A supersede posted V2? How does the preview's 30-point wording affect scoring? | Oct 22; revisit on updates | Avoid optimizing an obsolete objective |
| What exact tire placement, retention, identity and pickup conditions earn credit? Must exchange occur while stationary? | Nov 12 | Determines mechanism and dwell strategy |
| What does the referee start physically do, and what changes with the outer-rail relocation? | Nov 12 | Manual has raised/lowered wording inconsistencies |
| Which robot/field actions are allowed after randomization? | Oct 22 | Protect assignment and obstacle-related points |
| How is the final-lap flag judged, including any applicable dimensions? | Nov 12 | Determines mechanism and scoring evidence |
| Is finish crossing timed separately from final parking, and when must final parking be complete? | Jan 14 | Set mission timing and acceptance criteria |
| How are ordinary elimination-score ties resolved? Does the bracket differ for Main/Open? | Feb 18 | Determines final strategy and rehearsal |
| Does publicity credit apply to every round, which entry qualifies, and which robot receives it? | Feb 15 | Do not rely on unconfirmed points |
| What is the correct publicity submission deadline? | Feb 15 | Promotional page says April 16, 8 PM EST, **2026**, but winners April 17, **2027**; a 2027 submission deadline is unconfirmed |

The organizer says one publicity design entry credits only one robot, defaulting to Main. Keep publicity credit separate until application and the deadline are confirmed.
