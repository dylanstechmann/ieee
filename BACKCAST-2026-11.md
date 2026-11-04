# Backcast, November 2026 re-baseline

November 3, 2026 · IEEE SoutheastCon 2027 Stock Car Race · personal hobby/learning project, AI-assisted planning.

This replaces the dated gates in `BACKCAST.md` and `EXECUTION.md` (October 8, written for the V2 manuals). Those files stay as history. On November 3 the robot was still entirely digital: no parts ordered, no field built, no Q&A posted and no physical trials. The October 15 and October 22 gates were missed, and the November 12 design-selection gate cannot be met as written.

The dates below are planning targets, not commitments made by the club. Event dates come from the organizer page, re-checked on November 3, 2026.

## Fixed dates

| Date | Days left | Event |
|---|---:|---|
| Fri 2027-01-01 | 59 | Competition registration opens (free; every competitor must be an IEEE member) |
| Mon 2027-03-01 | 118 | Competition registration closes; internal target Feb 15 |
| Wed 2027-03-31 | 148 | Conference registration closes with no late option (student member $135); hotel block deadline |
| Thu 2027-04-15, 12:00 | 163 | Hardware room opens; check-in Thu–Fri; inspection Thu night and Fri; judging interviews Thu or Fri |
| Fri 2027-04-16, 20:00 | 164 | Promotional-design (t-shirt) entries due at the front desk |
| Sat 2027-04-17 | 165 | Three qualification matches (the best single score counts), top 8 single elimination, finals at the banquet |

"Days left" counts from November 3, 2026. V3.1 of the manuals (Appendix F, start-flag details) is announced but not posted; check the organizer page weekly.

## Gates

| Gate | Target date | Passes when |
|---|---|---|
| G0 Unblocked | Sun Nov 15 | Q&A searched and posted, with answers archived in `qa/answers-ledger.json`. Order A, the official obstacle set and field materials ordered by the owner. FAU space, printer, supervision and battery policy recorded in `OWNER-INPUT-2026-11.md`. |
| G1 Risks measured | Sun Dec 6 | Practice field built and measured as built. Mule assembled after the E02A caliper check; E02 bench characterization done under an approved setup; E03 floor trials started. Tire-mechanism DOE round 1 and sensor bench round 1 done. |
| G2 Concept design review | Sun Dec 13 | Drivetrain confirmed from measurements. At most two tire-mechanism finalists. Sensor suite and compute topology chosen. Body shape per the Q&A answer, or the conservative 10 x 10 in square. Mass and power budgets. A full-footprint mockup driven on the field. Order B/C placed by about Dec 14 because of holiday lead times. |
| G3 Fabrication release | Sun Jan 10 | Competition robot CAD v1 released. Schematic and harness plan. Mule running firmware with closed-loop wheel control and odometry. Team registered. |
| G4 Alpha | Sun Feb 7 | Robot v1 completes at least one logged autonomous mission (three laps, an exchange attempt and parking) on the practice field with three obstacles placed. |
| G5 Freeze | Sun Mar 14 | Mechanical design frozen. At least 30 logged full-mission runs over randomized box and obstacle placements. In safe mode, the last 20 runs include at least 16 clean full missions (Wilson 95% lower bound about 0.58). |
| G6 Acceptance | Sun Apr 4 | Mock inspection with the GM1 Appendix A checklist: 12 in sizing box, mass, e-stop, start switch, ID readable at 6 ft. Ten consecutive runs on a re-laid field with +/-1 in shifts. Spares kit. Portfolio printed (5 pages plus cover). Interview rehearsed. Promotional shirt ready. |

## If the Q&A stays silent

If the key questions are unanswered by **Dec 1**, the concept review designs to the conservative reading:
- square 10 x 10 in lower body that never contracts;
- the robot reads the AprilTag and senses obstacles itself;
- the robot body enters the box for the exchange;
- avoid crossing markings where it costs nothing.

Alternatives stay parameterized so a later answer can be adopted without redesign.

## Critical path

Q&A (envelope, obstacles, pit) plus the passability study → concept review Dec 13 → Order B/C before the holidays → CAD v1 Jan 10 → fabrication → alpha Feb 7 → reliability campaign → freeze Mar 14.

## Reduced-availability windows (assumptions; check the FAU calendar)

- US Thanksgiving, Thu Nov 26.
- Fall finals in early to mid December.
- Dec 18 to Jan 3, reduced work (carried over from `BACKCAST.md`).
- Spring break in March.

## Weekly rhythm

A 30-minute evidence review each week: what was measured, what failed, which decision is next. Keep raw logs and dated photos for the portfolio, including failures.

The full plan, including the agent's software and CAD workstreams, is summarized in `derived/club-update-v10/CLUB-UPDATE.md`.
