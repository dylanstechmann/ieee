# Mechanism-envelope comparison v6

**Agent-run synthetic geometry study for a hobby/learning project. Not capture, retention, production CAD or physical validation.**

Open /workspace/ieee/ieee/derived/mechanism-envelope-v6/review.html directly: offline top/side sample review (not 3D Integration Studio). Compare three concepts, flat/upright poses, nine E04 offsets/yaws and three synthetic dimensional cases: **162 cases / 2970 samples**. Approach step 5 mm; actuation step 0.125. No continuous collision certificate.

## Tire evidence and coordinates

Organizer source: /workspace/ieee/ieee/derived/organizer-cad/Spare Tire v2.stl; original archive sources/organizer-2026-10-29/Spare-Tire-v2.zip. 5380 STL facets. Axis extents 68.184139 × 27.6 × 68.19207 mm; enclosing radial diameter 68.215853 mm from centered X/Z vertices. STL Y becomes flat thickness axis/global Z. Outer circular cylinder encloses vertices; nominal 40.3 mm bore remains a design callout, not a mesh-verified or physical minimum.

Global +X is forward, +Y lateral, +Z up; tire rests on Z=0. Fixed robot; relative tire translates 60 mm toward target X=145. Tire offset is lateral; yaw rotates tire about Z, NOT robot heading error. Flat circular envelope is invariant to yaw. Upright bore axis is horizontal [cos(yaw),sin(yaw),0]. No tilt dynamics or pose correction.

## Comparison (flat, nominal dimensions)

| Concept | E04 cases | Cases with unintended proxy overlaps | Cases with intended jaw overlaps | Axis boundary |
|---|---:|---:|---:|---|
| Passive fork/cradle coupon | 9 | 6 | 0 | no validated acquisition/retention |
| Vertical guided-bore pin concept | 9 | 6 | 0 | vertical pin; incompatible with upright bore |
| Parallel OD jaw concept | 9 | 9 | 9 | no validated acquisition/retention |

These counts are geometric conflicts, not success rates. Flat profiles use analytic radial-range versus annulus and extrusion-Z overlap checks. Upright uses outer AABB broad phase (bore filled): only potential conflicts. Robot and reserved-space conflicts also use AABB broad phase. Touching boundaries without penetration are not flagged. Fork derives unchanged coupon polygon; placement/height, OD jaws and vertical stage are synthetic. No floor ramp, mounting, structural model or forces have been designed.

The bore pin is retracted above a flat tire during approach and lowered after alignment. Its single vertical stroke is a concept assumption; stage structure/control unresolved. OD jaws start open and close with 2 mm diametral rigid overlap: intended contact only, not a force or grip result. No physical tire motion response is solved. Keep-outs reveal packaging questions rather than disappear on favorable cases.

## Interfaces, complexity and recovery

### Passive fork/cradle coupon

Conceptual actuator lower bound: 0, not a selected actuator. Reverse approach is a geometric possibility only; no retained load, release or jam recovery demonstrated.

- Floor-to-coupon acquisition and tire lifting/compliance
- Mounting from low coupon to deck
- Retention, reverse motion and release

### Vertical guided-bore pin concept

Conceptual actuator lower bound: 1, not a selected actuator. Retract vertical pin before reversing; force detection, position confirmation and jam recovery unimplemented.

- Vertical stage, drive, loads and pin mounting
- Bore-axis alignment and actual bore minimum
- Upright tire needs reorientation or a different pin axis

### Parallel OD jaw concept

Conceptual actuator lower bound: 1, not a selected actuator. Open jaws before reversing; synchronized jaws, force limit and release confirmation unimplemented.

- Actuator/transmission and grip-force requirement
- Flexible tire deformation, friction and retention
- Jaw mounting, tire lifting and release

Electrical interface source: /workspace/ieee/ieee/electrical-selection-v6.json. Its four-GPIO mechanism allowance does not size or power an actuator. No sensor/controller timing, limit switches, force limits or safe recovery is qualified. Sensor/cable/electronics keep-outs are illustrative and are not installed vendor geometry.

## Envelope and decision

Rule limit: null. Null means not evaluated; legality remains unresolved even if a configured XYZ box passes. Full assembly/path boxes include tire and conservative wheel/motor bounds. Sampled swept boxes enclose all samples, not occupied volume or continuous sweeps.

**No mechanism selected.** Keep passive fork as the lowest-actuation experiment baseline, not a reliability winner. Guided bore needs flat-axis alignment and vertical-stage work; OD gripping needs force/compliance/retention evidence. Upright cases retain their axis and broad-phase limitations. Preserve every conflict/unknown.

- Approach is relative kinematics: tire translates toward a fixed robot; no contact dynamics or tire movement response is solved.
- Flat tire uses a circular annular extrusion enclosing the STL outer radius with nominal design-callout bore. Tread and internal details are not collision geometry; nominal bore is not mesh-certified or measured.
- Yaw rotates the tire around global Z; flat circular proxy is yaw invariant. This is not yaw error of the robot approach heading, nor tire roll or tipping.
- Upright tire is an outer-cylinder AABB broad phase, including its empty bore; overlap means potential interference, not proven contact.
- Finite approach/actuation samples are not continuous swept collision certification. Swept AABB unions are enclosing boxes, not occupied solids.
- Plus/minus 1 mm dimensional cases are synthetic sensitivity inputs, not manufacturing tolerances or measured probabilities.
- Intended OD jaw interference remains a rigid-proxy conflict, not a successful grip or a load/retention prediction.
- Actuator counts are conceptual lower bounds; mechanisms, sensors, harness, structural capacity and mounting remain unresolved.
- No purchases, fabrication, physical trials, complete mechanism CAD, competition legality or physical setup approval.

## Reproduce

From /workspace/ieee/ieee: node tools/mechanism-envelope-v6.js; node tools/verify-mechanism-envelope-v6.js; node --test tests/mechanism-envelope-v6.test.js. report.json contains full samples; summary.csv retains every case. Existing v3 coupons and v4/v5 viewers are unchanged. Coast/brake variants and Integration Studio remain subsequent work.
