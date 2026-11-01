# Hardware development requirements — October 31, 2026

Agent-built engineering package for the owner's hobby/learning project. **No component, battery chemistry, supplier or final mechanism is selected; no hardware has been tested or purchased.**

## Decision summary

Start with an instrumented two-driven-wheel mule and compare the passive fork, guided bore capture and OD gripper under the same E04 matrix. This is a prototype sequence, not an architecture freeze. The earlier 3S battery and three-tine ideas remain preliminary concepts; this report does not select them.

At the **4 kg arithmetic scenario** (not a mass estimate), two ideal driven wheels, 3-in wheel diameter, 10 in/s top speed and 24 in/s² acceleration:

- Top/cruise wheel speed: **63.661977 / 50.929582 RPM**.
- Candidate screening speed with 1.2× margin: **76.394373 loaded RPM per gearbox**.
- Nominal accelerating torque: **0.068877 N m per side**.
- Screening torque with 2× factor: **0.137754 N m per side**.
- Ideal encoder quantization gate: **189 effective counts per wheel revolution**.
- Required straight-line friction coefficient under the 0.8 driven-weight-fraction assumption: **0.115176**. Turning/caster scrub is not included.

These are output-side requirements. Do not compare them with a bare motor shaft rating or treat no-load RPM as loaded RPM.

## Mass sensitivity

| Mass scenario (kg) | Total tractive force (N) | Nominal N m/side | 2× screening N m/side | Minimum motor mechanical W/side at assumed efficiency |
|---:|---:|---:|---:|---:|
| 2 | 1.8078 | 0.034439 | 0.068877 | 0.918362 |
| 3 | 2.7117 | 0.051658 | 0.103316 | 1.377544 |
| 4 | 3.6156 | 0.068877 | 0.137754 | 1.836725 |
| 5 | 4.5195 | 0.086096 | 0.172193 | 2.295906 |
| 6 | 5.4234 | 0.103316 | 0.206632 | 2.755087 |

The power column combines the margined torque with top wheel speed and divides by the assumed 0.5 drivetrain efficiency; it is a conservative calculation envelope, **not measured electrical power or a battery-current calculation**.

## Friction sensitivity

| Assumed tire/board μ | Straight-line traction-limited acceleration (in/s²) | Meets 24 in/s² concept acceleration? |
|---:|---:|---|
| 0.1 | 19.311024 | no |
| 0.2 | 50.208661 | yes |
| 0.4 | 112.003937 | yes |

Normal force on the driven axle, caster scrub and impacts can dominate these ideal results. E03 must measure them.

## Battery energy scenarios, not pack choices

For a 30-minute window, 0.8 usable fraction and 1.25 reserve factor:

| Average total electrical power scenario (W) | Window energy (Wh) | Nameplate Wh with reserve | Arithmetic capacity by voltage scenario |
|---:|---:|---:|---|
| 6 | 3 | 4.6875 | 0.633446 Ah @ 7.4 V<br>0.422297 Ah @ 11.1 V |
| 12 | 6 | 9.375 | 1.266892 Ah @ 7.4 V<br>0.844595 Ah @ 11.1 V |
| 24 | 12 | 18.75 | 2.533784 Ah @ 7.4 V<br>1.689189 Ah @ 11.1 V |

Battery current cannot be inferred safely from these average-energy cases. Select driver, peak/stall capacity, pack, fuse, wire, connectors and charger only from actual motor/load data and approved policies. Power distribution must remain within the documented 30 V maximum; neither 7.4 V nor 11.1 V is selected here.

## Work sequence

1. **E00:** owner records tools/access/policies.
2. **E01:** characterize the actual tire and label any STL print as a surrogate.
3. **E02/E03:** screen and measure the drivetrain before selecting driver or battery.
4. **E04:** run the common tire-mechanism bake-off; use the [geometry coupon kit](../mechanism-prototyping-v3/README.md).
5. **E05:** verify docking recovery and supervised emergency power removal.

See [owner-input.md](owner-input.md), [component-selection.md](component-selection.md), [experiment-plan.md](experiment-plan.md), [report.json](report.json), and [trial-log-template.csv](trial-log-template.csv). All acceptance gates are proposed engineering targets, not official rules or claims of competition performance.
