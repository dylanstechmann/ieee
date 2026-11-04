# Bench kit (Order B, first part): what the firmware assumes

2026-11-03 · agent-prepared input for an owner decision. Nothing is ordered.

Prices are the archived single-unit snapshots in `derived/electrical-selection-v6/candidates.md`, not quotes.

## Why this matters now

The firmware's pin map and the E02 bench script cannot be wired or run until a motor driver is chosen. The electrical package screened four drivers and qualified none.

| Candidate | Board cost | Fit with this firmware | Open items from the electrical package |
|---|---:|---|---|
| Pololu #1213 Dual MC33926 (one board, two channels) | $39.95 | Needs its own input truth table: brake and coast states, disable pins, inverted inputs | 5 A peak is below the 5.5 A stall extrapolation; current limit, analog feedback scaling and thermal duty need review |
| Two Pololu #2991 G2 18v17 (one per motor) | $89.90 | Closest to the firmware's PWM + direction + enable + fault + current-sense assumption | Default ~40 A chopping does not protect 5.5 A-stall motors; no MOSFET over-temperature shutdown; braking transients |

**Before wiring either:**
- confirm each control pin's function and logic level on the archived product pages (`sources/electrical-2026-10-31/driver-1213.html`, `driver-2991.html`);
- set `firmware/pico2/config.py` and `hal.py` to match;
- have the bench/electrical lead sign off the result.

## Minimum kit for E02 (wheels off the ground)

| Item | Status |
|---|---|
| Raspberry Pi Pico 2 with headers | Provisional controller (electrical v6); price not archived |
| One driver option from the table above | Owner choice |
| 5 V to 3.3 V level shifting for the four encoder lines (SN74LVC245A was the screened candidate) | Required: encoders are 5 V logic |
| Latching e-stop wired to cut motor power, plus a sense contact to the Pico (GP16) | Required by GM1 R04 and for safe bench work |
| Inline fuse and holder, rated by the bench lead from the supply limit and wire gauge | Required |
| Current-limited bench supply (FAU), leads, connectors | Inventory first |

The logic regulator (Pololu #2858, $26.95), the battery, the charger and the battery management all wait until E02 measures the real currents.

## What E02 will decide

E02 measures speed and current against duty at three bus voltages. Those measurements settle:
- whether the MC33926's limits are acceptable;
- what current limit and fuse the competition robot needs;
- the feed-forward constants for `motor.py`.
