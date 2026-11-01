# Encoder-gearmotor comparison — 2026-10-31

Research snapshot only; no motor is ordered or physically validated. Manufacturer maximum-efficiency and no-load data are not robot load measurements. Stall values are theoretical extrapolations and are not continuous ratings.

## Arithmetic gates at the 4 kg scenario

| Wheel case | Loaded RPM with 1.2× margin | N·m per side with 2× torque factor | Minimum output CPR |
|---|---:|---:|---:|
| 3-inch baseline | 76.394373 | 0.137754 | 189 |
| 80 mm mule | 72.76564 | 0.144624 | 189 |

The 80 mm values are a separate mule variant calculated from the existing assumptions. They do not change the 3-inch Robot Lab baseline.

## Candidates

| Motor | No-load RPM @12 V | RPM at max efficiency | N·m at max efficiency | 80 mm speed / torque margin at that point | Output CPR | Unit price | Page availability |
|---|---:|---:|---:|---:|---:|---:|---|
| #4753 (50:1) | 200 | 180 | 0.215746 | 2.473695× / 1.491774× | 3200 | $60.95 | Backorder shown; backorders allowed; no ship date verified |
| #4754 (70:1) | 150 | 130 | 0.313813 | 1.786558× / 2.169853× | 4480 | $60.95 | Add to cart shown; backorders allowed; stock quantity and ship date not verified |
| #4755 (102.08:1) | 100 | 87 | 0.411879 | 1.195619× / 2.847932× | 6533 | $60.95 | Add to cart shown; backorders allowed; stock quantity and ship date not verified |

All three maximum-efficiency points exceed both arithmetic screens, and all encoders exceed the 189-count gate. This does **not** prove loaded speed, continuous temperature, traction or reliability. E02/E03 remains required.

## Recommendation

**#4754 / 70:1** is the balanced Order A candidate: 130 RPM and 3.2 kg·cm at maximum efficiency, 4480 output CPR and 205 g per motor. #4753 favors speed but was explicitly marked Backorder; #4755 favors torque but has only 87 RPM at maximum efficiency. All share 6 mm D-shafts and the 37D mounting family.

## Encoder interface

The 64 motor-shaft counts are measured using both edges of both channels. Output-shaft CPR already accounts for the ratio. Leads are 20 cm and terminate in a 1×6 female 0.1-inch header. Hall-sensor Vcc is 3.5–20 V at up to 10 mA; outputs swing approximately 0 V to Vcc.

| Wire | Function |
|---|---|
| red | motor power |
| black | motor power |
| green | encoder GND |
| blue | encoder Vcc |
| yellow | encoder A output |
| white | encoder B output |

Controller input voltage compatibility and actual decoding rate still require review. No proprietary encoder cable is required for the first bench fixture.

## Archived engineering sources

- `sources/hardware-2026-10-31/pololu/pololu-37d-metal-gearmotors-rev-1-2.pdf`
- `sources/hardware-2026-10-31/pololu/37d-metal-gearmotors-dimension-diagram.pdf`
- `sources/hardware-2026-10-31/pololu/step/37d-gearmotor-50-70-encoder.step`
- `sources/hardware-2026-10-31/pololu/step/37d-gearmotor-100-131-150-encoder.step`

The STEP models are shared ratio-family geometry. Verify current drawings and received parts before manufacturing. Exact hashes and source URLs are in `source-manifest.json`.
