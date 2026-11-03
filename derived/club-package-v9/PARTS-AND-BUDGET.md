# Conditional parts list and budget — November 3, 2026

**No purchase has been made or authorized by this document.** Prices are archived research snapshots, not live quotes. Owner planning target: $750 within a $500–$1,000 prototyping range; this is not a complete-robot cost estimate.

## Order A — reversible drivetrain experiment

Source: `derived/order-a-procurement-v4/order-a-bom.md` and its hashed supplier archive.

| Item | Quantity | Archived extended price | Gate |
|---|---:|---:|---|
| Pololu #4754 70:1 37D 12 V gearmotor with encoder | 2 | $121.90 | Confirm speed/torque experiment and availability |
| Pololu #1995 machined 37D brackets | 2 | $25.90 | Measure motor/bracket fit and screw engagement |
| Pololu #1083 universal 6 mm hubs, 2-pack | 1 | $12.95 | Verify hub/wheel stack-up |
| Pololu #1430 80 × 10 mm wheels, pair | 1 | $8.75 | Mule candidate; traction unmeasured |
| Pololu #953 1/2-inch ball caster kits | 2 | $5.90 | Correct support height after measurement |
| Pololu #1962 #4-40 × 1/2-inch screws, 25-pack | 1 | $1.85 | Verify actual hub/wheel fastening |
| Printed deck, ballast fixture and adapters | 1 set | Unpriced | Facility access and fit review required |
| Wire, insulation, bench connections/accessories | Allowance | Unpriced | Inventory first |
| **Priced subtotal** | | **$177.25** | Plus shipping, tax and unpriced lines |

The vendor CAD supports a proposed shaft-down mule with a 190 × 172 × 5 mm deck, 28.6 mm deck top and 6.91 mm caster risers. It is a **proposal**, not a fabrication release. The original kit-as-drawn leaves the wheels 7.09 mm above the supporting casters. Measure received parts and review screw penetration, support and free rotation before cutting/printing a release.

## Order B — bounded bench and control experiment, not yet priced

| Needed capability | Candidate/source status | Evidence required before purchase |
|---|---|---|
| Motor driver | #1213 dual MC33926 lower-cost alternative; two #2991 G2 18v17 packaging/protection study candidate | Approved setup, actual motor operating/transient current, current limiting, braking behavior, thermal review |
| Controller | Raspberry Pi Pico 2 provisional preference; Teensy 4.1 alternative | Pin map, encoder conditioning, compute/scheduler test, availability |
| Logic supply | Pololu #2858 5 V regulator researched at $26.95 | Actual logic/sensor load, thermal/dropout/backfeed review |
| Bench supply, disconnect, fuse/protection, instrumentation | Not selected | Facility inventory and supervised experiment approval |
| Battery, charger, BMS, wiring and hardware disable | Not selected | Chemistry/pack policy, load/Transient measurements, energy budget, reviewed charging/storage procedure |

**Do not infer that a driver board's advertised current rating protects the motor.** The archived 5.5 A stall extrapolation is not a continuous rating. A regulated supply or BMS does not by itself absorb braking energy. No battery/charger combination is released.

## Order C — sensing and mission experiments, conditional

| Capability | Candidate approach | Purchase gate |
|---|---|---|
| White-line/checker/box detection | Downward reflectance array | Bench contrast and height tests on actual field materials |
| Assigned-box recognition | Camera plus AprilTag 3 `tagStandard41h12` detector | Real lens/glare/range test; measured printed tag scale |
| Low wall/obstacle detection | Low ToF/ranging or low scanning sensor; exact part unresolved | Actual obstacle dimensions, mounting height, blind-zone and false-positive tests |
| Heading aid | IMU optional | Drift and calibration experiment; not a stand-alone localization claim |
| Tire handling | Passive fork first comparison; guided-bore/OD-gripper alternatives | Common fixture acquisition/retention/release/bail-out results before actuator selection |
| School flag | Wired onboard servo/mechanism | Packaging, power, inspected configuration and reliable final-lap trigger |
| Structure/mockup | Full 10 × 10 in footprint and 12 in starting-cube mockup | Q&A, measured field corridors, mechanism packaging and support review |

## Budget ledger

| Category | Current amount | Status |
|---|---:|---|
| Order A priced mechanical experiment | $177.25 | Researched, not ordered |
| Order B bench/control/power | Unknown | Do not buy as a bundle yet |
| Order C sensing/mechanism/mockup | Unknown | Select from experiments and Q&A |
| Shipping, tax, consumables, spares | Unknown | Obtain actual quotes |
| Field/test fixtures | Unknown | Scope with club; full field not automatically required |
| Event registration/travel | Unknown | Separate from robot budget |

A complete robot BOM cannot be priced honestly yet. The next club decision is whether Order A and an approved bounded bench experiment are the right first spend, not approval of a fictitious final total.
