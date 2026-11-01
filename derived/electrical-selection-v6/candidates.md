# Conditional electrical candidate matrix — v6

2026-10-31. Digital comparison only. Hard documented failures are rejected; unknowns never become passes. Current ratings retain manufacturer qualifiers. Prices are archived single-unit USD snapshots before shipping/tax, not quotes.

## Drivers

| Candidate | Boards for two motors | Bus operating screen | Advertised continuous / peak A per channel | Board cost | Decision |
|---|---:|---|---|---:|---|
| Pololu #1213 Dual MC33926 | 1 | 5–28 V | 3 / 5 | $39.95 | lower-cost-conditional-alternative |
| Two Pololu #2991 G2 18v17 | 2 | 6.5–24 V | 17 / not promoted | $44.95 | preferred-packaging-study-candidate-not-qualified |
| Pololu #2130 DRV8833 | 1 | 2.7–10.8 V | 1.2 / 2 | $10.95 | reject-for-12v-bus |
| Pololu #2502 Dual VNH5019 ash02a | 1 | 5.5–24 V | 12 / 30 | unknown | exclude-discontinued |

### Pololu #1213 Dual MC33926

Source: sources/electrical-2026-10-31/driver-1213.html. Active; add-to-cart/backorders allowed, stock and lead time unverified. almost 3 A per channel; thermal conditions and enclosure derating must be checked; peak: few seconds; not a repeatable startup rating. Dimensions: null (null means unresolved, not zero).

- 5 A peak is below the archived 5.5 A stall extrapolation; unrestricted startup/stall is not qualified
- No qualified 3 A limit: v5 current clipping does not configure this board
- Pin truth table, disable/brake/coast behavior, analog scaling and thermal duty require design review

### Two Pololu #2991 G2 18v17

Source: sources/electrical-2026-10-31/driver-2991.html. Active and Preferred; add-to-cart/backorders allowed, quantity and lead time unverified. manufacturer room-temperature test, no heat sink/forced airflow; MOSFET temperature and enclosure derating remain unresolved; peak: no startup-duration rating promoted. Dimensions: [33.02,20.32,null] (null means unresolved, not zero).

- Default ~40 A chopping does not protect these 5.5 A extrapolated-stall motors; low-setting accuracy is explicitly poor
- No MOSFET over-temperature shutdown; fault output is not a motor thermal safeguard
- External protection/current-limit design, braking bus transients and enable/reset states remain unresolved
- Two boards, capacitors, connectors and protection increase cost/area

### Pololu #2130 DRV8833

Source: sources/electrical-2026-10-31/driver-2130.html. Active and Preferred; quantity unverified. manufacturer carrier rating, not measured in robot; peak: not continuous. Dimensions: null (null means unresolved, not zero).

- 10.8 V operating maximum is below both 12 V and the 12.6 V full-charge scenario

### Pololu #2502 Dual VNH5019 ash02a

Source: sources/electrical-2026-10-31/driver-2502.html. Discontinued; replacement must be separately researched. historical board specification, not robot thermal qualification; peak: not continuous. Dimensions: null (null means unresolved, not zero).

- Do not order an obsolete board or transfer its specifications to its replacement without review

Two G2 boards cost $89.90 before protection/connectors. Prefer them only for a packaging/protection study because their documented board capability avoids the MC33926's peak-versus-stall shortfall. They are not simplest overall, not proven motor protection and not approved. If measured current and a validated limiter fit the MC33926 thermal/peak envelope, its single board and lower cost can reverse this preference. The obsolete VNH5019 is retained as an exclusion, not a shopping suggestion.

## Controllers

### Raspberry Pi Pico 2 (non-wireless)

preferred-digital-controller; 150 MHz, 520 KiB SRAM, 26 accessible GPIO counted, 6 left after the provisional reservation. Flash MiB: 4. Dimensions mm: [51,21,null]. Price: unknown; manufacturer product-page archive request returned HTTP 403; no landed/current price asserted. datasheet archived; supplier quantity/lead time not checked.

Two PIO state machines, one per encoder, on consecutive A/B pin pairs; reference example only, no firmware compiled or flashed. Sources: sources/electrical-2026-10-31/pico2-datasheet.pdf, sources/electrical-2026-10-31/pico-quadrature.pio. PIO example and license are archived unchanged; no firmware has been executed.

- 5 V encoder A/B must be conditioned to 3.3 V
- Proposed pin budget is not an assigned/multiplexing-audited pin map
- Compile/bench throughput, counter wrap, noise, scheduler and reset behavior unverified
- Check current RP2350 errata and power sequencing before hardware integration

### PJRC Teensy 4.1

higher-capability-alternative; 600 MHz, 1024 KiB SRAM, 42 accessible GPIO counted, 22 left after the provisional reservation. Flash MiB: not normalized. Dimensions mm: null. Price: unknown; PJRC directs purchasing to SparkFun; exact variant, price and stock not archived. Manufacturer now SparkFun per PJRC; exact SKU procurement unresolved.

Encoder library with interrupt-capable A/B pins; two-encoder load and other interrupts must be benchmarked. Sources: sources/electrical-2026-10-31/teensy41.html, sources/electrical-2026-10-31/teensy-encoder.html. PIO example and license are archived unchanged; no firmware has been executed.

- Digital and analog pins are not 5 V tolerant
- VIN/USB backfeed prevention must follow board guidance
- No measured interrupt throughput, assigned pin map or deterministic firmware

Pico 2 is the provisional controller preference for low-complexity dedicated counting, not a benchmark winner. Teensy remains a capability/expansion alternative. Timing failure, pin conflicts, errata, availability or debugging needs can reverse this choice.

## Logic rail

Pololu #2858 D24V22F5: 5 V output, 5.3–36 V input; 2.5 A at 24 V input; actual continuous current depends on input voltage and thermal dissipation. $26.95 archived unit price. Rationed (Active and Preferred); backorders allowed; no quantity or delivery verified. Footprint/envelope 17.8 × 17.8 × 8 mm. Source: sources/electrical-2026-10-31/regulator-2858.html.

- Logic/sensor load budget, dropout, startup, noise and thermal performance at actual bus unqualified
- Not a motor-bus regulator or a battery charger
- USB/external supply backfeed and enable sequencing require separate design

## Power architecture matrix

| Scenario | Nominal motor bus | Maximum steady bus | Decision boundary |
|---|---:|---:|---|
| regulated-12v | 12 V | 12 V | ideal regulated motor-bus study; output tolerance, current rating and braking-energy absorption unresolved |
| 3s-4v2-direct | 11.1 V | 12.6 V | conditional arithmetic for a 4.2 V/cell Li-ion/Li-polymer chemistry only, not all lithium cells; no pack, BMS or charger selected |
| 3s-regulated-motor | 12 V | 12 V | hypothetical buck-boost motor bus from 3S; converter current, efficiency, dropout and reverse-energy behavior unknown |

No pack minimum, transient ceiling, capacity, discharge rating, BMS, charger, fuse, wire gauge or disconnect rating is known. A regulated supply/converter may not absorb braking energy; neither supply regulation nor a BMS establishes transient safety. Keep motor energy paths separate from a regulated logic/encoder rail. Current sensing, isolation/backfeed, transient suppression and hardware disable remain unresolved design tasks. No shopping subtotal is presented as a complete robot cost.

## Source attribution

Manufacturer pages/datasheets and Raspberry Pi/PJRC reference software informed agent-run calculations; owner review is not claimed. Copyright and software licenses remain with their publishers. index.json records source URLs, actual retrieval timestamps and byte hashes; one blocked product-page fetch is recorded as failed, not archived.

- Pololu #1213 Dual MC33926: sources/electrical-2026-10-31/driver-1213.html
- Two Pololu #2991 G2 18v17: sources/electrical-2026-10-31/driver-2991.html
- Pololu #2130 DRV8833: sources/electrical-2026-10-31/driver-2130.html
- Pololu #2502 Dual VNH5019 ash02a: sources/electrical-2026-10-31/driver-2502.html
- Raspberry Pi Pico 2 (non-wireless): sources/electrical-2026-10-31/pico2-datasheet.pdf; decoder reference sources/electrical-2026-10-31/pico-quadrature.pio
- PJRC Teensy 4.1: sources/electrical-2026-10-31/teensy41.html; decoder reference sources/electrical-2026-10-31/teensy-encoder.html
