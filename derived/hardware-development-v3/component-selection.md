# Component-selection matrix

This is a requirements screen, **not a shopping list**. No supplier, price, compatibility or purchase approval is recorded.

| ID | Component | Minimum requirement / gate | Evidence needed | Status |
|---|---|---|---|---|
| MOTOR-01 | Two motor/gearbox assemblies | Per side: loaded output >= 76.394373 RPM and >= 0.137754 N m at the 4 kg scenario; verify actual motor curves and hot operation. | Concept calculation + E02; margins are assumptions, not vendor ratings. | ready-for-candidate-screening-not-selected |
| ENC-01 | Wheel-speed feedback | At least 189 effective counts per wheel revolution for <= 0.05 in ideal distance quantization; account for gearbox ratio and all decoder edges. | Geometry calculation; slip/odometry accuracy still requires E03. | ready-for-candidate-screening-not-selected |
| DRIVER-01 | Two-channel motor driver | Continuous per-channel rating >= 1.25x measured hot continuous current; peak/supply ratings cover measured motor stall and transients at maximum intended pack voltage. | Blocked on actual motor and E02; no defensible current number yet. | blocked-on-measurement |
| POWER-01 | Battery, distribution, fuse and wiring | Energy from measured average power over the intended test/match window with 0.8 usable fraction and 1.25 reserve scenario; current/fuse/wire ratings from measured load; distribution <=30 V. | GM1 R02/R16 limit + E02/E03/E05; voltage cases are not a pack selection. | blocked-on-measurement-and-policy |
| ESTOP-01 | Emergency power removal | Clearly marked, accessible emergency stop and supervised power-off verification with no unintended drive output. | GM1 R03-R04 + E05. | requirement-only-not-tested |
| TIRE-01 | Tire capture actuator and structure | Size from measured tire/mechanism mass, bore/OD clearance, friction/deformation, moment arms and jam loads; meet E04 acquisition, retention and release gates. | Official STL geometry + E01/E04; no 80 g mass assumption or servo torque selected. | blocked-on-measurement-and-architecture |
| STRUCT-01 | Chassis/support/fasteners | Full intended configuration measured <=12 kg; starting/configuration envelope and full mechanism sweep inspected; survives E03 without loosening or wheel contact. | GM1 R01/R02 + E03/E05; no final dimensions/material selected. | blocked-on-architecture-and-measurement |
| CONTROL-01 | Controller and power conversion | Enough encoder, motor, mechanism and chosen sensor interfaces with measured regulator margins and brownout-free E02-E05 logs. | Interface count follows selected architecture and sensor experiments. | blocked-on-architecture-and-measurement |

## Architecture candidates

### drivetrain

- **2WD-CASTER — Two encoder gearmotors plus low-scrub support** (first-mule-candidate): Simple forward/reverse/spin control and two motor channels. Risk: Caster scrub, unequal wheel loading and turn odometry error. Decision: E02/E03 against traction, straightness and spin-error gates.
- **4WD-SKID — Four driven wheels** (fallback-not-selected): More driven contact area and redundancy against a light wheel. Risk: More scrub, current, mass and control channels; does not automatically improve turning. Decision: Test only if two-wheel mule cannot meet traction or loading gates.

### tire_handling

- **PASSIVE-FORK — Passive capture fork/cradle and release** (prototype-for-comparison): Fewest actuators and simple failure recovery. Risk: Alignment, initial pose and TPU friction sensitivity; current lab shape is not a proven mechanism. Decision: E04 identical placement matrix and retention/release trials.
- **BORE-CAPTURE — Guided expanding-bore capture with lift** (prototype-for-comparison): Uses the documented bore and can retain geometrically rather than relying only on clamp friction. Risk: Requires pose/access confirmation, alignment, tine clearance, lift volume and jam recovery. Decision: E04 after physical bore and access measurements; no unverified 80 g tire-mass assumption.
- **OD-GRIPPER — Active outside-diameter gripper** (fallback-for-comparison): Does not require insertion into the bore and may tolerate more poses. Risk: More sweep, clamp load, control and possible interference with box or robot envelope. Decision: E04 with measured tire deformation and full swept-envelope checks.
