# Electrical interface requirements — v6

Agent-run digital study for a hobby/learning project. 2026-10-31. **Not a wiring, purchase, fabrication or energized-test release.**

## Counts and timing

Two bidirectional motor channels and two A/B encoders. Proposed 20-GPIO reservation: encoder_ab: 4; motor_pwm: 2; motor_direction: 2; motor_enable: 2; driver_fault: 2; current_adc: 2; mechanism_reserve: 4; i2c_reserve: 2. Counts do not assign pins, verify ADC/PWM multiplexing, or select a mechanism actuator. Additional motor truth-table inputs can change the budget.

240 Hz control and 30 Hz telemetry are proposed targets, not firmware measurements. Memory gate: counters plus bounded control/telemetry buffers; no trajectory playback requirement and no invented RAM minimum. Measure worst-case execution time, interrupt/PIO servicing, counter wrap and reset/fault handling before firmware qualification.

| Motor | Archived output CPR | 12 V no-load RPM | Edges/s/motor | A cycles/s | 2x edges/s/motor | 2-motor 2x edges/s |
|---|---:|---:|---:|---:|---:|---:|
| #4753 | 3200 | 200 | 10666.666667 | 2666.666667 | 21333.333333 | 42666.666667 |
| #4754 | 4480 | 150 | 11200 | 2800 | 22400 | 44800 |
| #4755 | 6533 | 100 | 10888.333333 | 2722.083333 | 21776.666667 | 43553.333333 |

2x archived 12 V no-load rate is a digital design allowance, not a measured maximum; overspeed/back-driving can exceed it. Output CPR already includes four edges; do not multiply again. The 2x allowance is not a maximum physical rate. Preserve rounded archived ratio/count values. Motor reference: sources/electrical-2026-10-31/motor-4754.html; candidate-specific numbers remain in order-a-procurement-v4.json and its archived sources.

## Logic and power interfaces

Encoder supply range is 3.5–20 V; use 5 V as a proposed encoder rail (two encoders: up to 20 mA total per manufacturer maximum). A/B outputs swing to Vcc, not open-collector signals fixed by controller pull-ups. The common digital interface targets 3.3 V. Teensy explicitly disallows 5 V inputs; do not infer Pico 2 input tolerance from its output-logic voltage alone. This study deliberately conditions all four lines to 3.3 V pending pin-specific RP2350/power-sequencing review.

TI SN74LVC245A at 3.3 V is only a circuit candidate. Four encoder lines only, fixed encoder-to-controller direction, defined OE and unused inputs; Review VIH/VIL, output loading, decoupling, connector ground/reference and power sequencing; No pull-up-only conversion: motor outputs swing to encoder Vcc; Do not connect motor power or analog current feedback through this digital buffer; No package/breakout SKU, price or final schematic selected. See sources/electrical-2026-10-31/sn74lvc245a.pdf. Driver analog current outputs require independent ADC range/noise review, not this digital buffer. Open-drain fault pull-ups, common reference, grounding/noise strategy, defined enable states, watchdog and USB isolation remain schematic tasks.

## Current and voltage evidence

- Required continuous current, startup duration and qualified driver limit are **null**.
- Archived stall extrapolation: #4753: 5.5 A; #4754: 5.5 A; #4755: 5.5 A; not continuous ratings.
- V5 synthetic clipping: 3 A; maximum recorded sample: 3 A. Sample extrema can miss integration peaks. Neither sizes drivers, fuses, wire or batteries.
- Positive-only simulation energy omits calibrated battery/thermal/regenerative behavior; no capacity inference.
- 3S at an assumed 4.2 V full-charge/cell is 12.6 V, not 11.1 V. Chemistry-specific assumption; sources/electrical-2026-10-31/bq24610.pdf is a charger reference, not a selected pack or charging design. Motor exposure above the 12 V reference remains open even if a driver passes its voltage screen.

## Mechanism interfaces and physical gates

passive fork/cradle, guided bore and OD gripper remain alternatives; loads, tire pose, retention, sensors, recovery and actuator interfaces unresolved. Reserve four GPIO only as a revisable allowance; no servo voltage/current, actuator torque or acquisition sensor is selected.

- No purchasing, fabrication, energization, charging or physical setup approval
- E02/E03 motor characterization and approved bench equipment remain required
- Continuous current, stall exposure, temperature and current-limit calibration are not measured
- Battery/BMS/charger, fuse, wire gauge, switch, connectors, capacitor and transient suppression remain unselected
- Actual tire loads, compliance, retention and mechanism actuator remain unknown
- Mechanism-envelope study, coast/brake dynamics variants and Integration Studio are subsequent work, not implemented here
