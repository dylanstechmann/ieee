# Physical experiment plan

No experiments below have been run. Perform energized or mechanical tests only with suitable supervision, secured fixtures and applicable lab/battery procedures. Gates are agent-proposed engineering criteria.

## E00 — Inventory and metrology gate

- **Purpose:** Record school/home access, tools, measurement capability and battery policies before proposing spend.
- **Method:** Owner records available scale, calipers, multimeter, bench supply, fabrication and supervised test space; unknown is acceptable.
- **Sample/repeats:** One dated inventory and access record.
- **Pass gate:** Enough measurement and supervision identified for E01–E05; otherwise borrow or revise the experiment before buying parts.
- **Output:** Actual measured inputs and resource constraints.

## E01 — Tire geometry and material characterization

- **Purpose:** Separate official STL geometry from physical-tire mass, friction, compliance and pose.
- **Method:** Inspect/measure the official tire when accessible. An organizer-STL print may test geometry only and must be labeled a surrogate with its own measured mass/material.
- **Sample/repeats:** Three repeated measurements per dimension; five mass readings; actual tire and surrogate recorded separately.
- **Pass gate:** Versioned dimensions/mass/material and permitted initial-pose set exist before mechanism freeze.
- **Output:** Mechanism input sheet; no friction transfer from a printed surrogate to the official tire.

## E02 — Motor/gearbox bench characterization

- **Purpose:** Measure candidate output speed, torque/current and thermal behavior instead of trusting nominal RPM.
- **Method:** Use supervised instrumentation and a safe fixture at min/nominal/max intended bus voltage; record loaded speed, continuous current, peak/stall data from the actual motor/driver combination.
- **Sample/repeats:** Three runs per operating point after a repeatable warmup; log voltage, current, speed, torque and temperature.
- **Pass gate:** At measured design mass, loaded output meets calculated RPM/torque margins and driver limits with no thermal or protection fault.
- **Output:** Measured motor curves and evidence for driver, fuse and wire ratings.

## E03 — Ballasted rolling-chassis traction and control

- **Purpose:** Test two-wheel drive plus support under changing mass and surface conditions.
- **Method:** Instrumented mule with full-footprint ballast at 2, 4 and 6 kg; straight 1 m runs and left/right 180-degree spins on documented field-like surfaces.
- **Sample/repeats:** Ten straight runs and twenty spins per direction per mass/surface cell; include hot repeated runs.
- **Pass gate:** At 4 kg, at least 9/10 straight runs drift no more than 25 mm over 1 m; all commanded runs reach 8 in/s cruise without slip/thermal faults; median spin error no more than 5 degrees and every trial is logged.
- **Output:** Measured traction, tracking, spin error and current; decide 2WD-CASTER versus fallback.

## E04 — Tire-mechanism bake-off

- **Purpose:** Compare all three capture concepts under identical placement, alignment and retention conditions.
- **Method:** Vary lateral offset -12.7/0/+12.7 mm, yaw -10/0/+10 degrees, and documented pose class. Add tilt/upright only as diagnostic cases until official poses are known. Use the same approach and fixture for each concept.
- **Sample/repeats:** Per candidate and officially required pose class: five attempts at each of nine alignment cells plus five nominal repeats (50 total), then twenty retention and twenty release attempts for qualifying concepts.
- **Pass gate:** For every officially required pose class: at least 48/50 acquisitions overall and 4/5 in each alignment cell; 20/20 retention through acceleration and both spin directions; 20/20 releases; no tire damage or uncontrolled jam. Unknown-pose failures remain visible.
- **Output:** Architecture decision based on success, recovery, mass, volume and measured actuator loads.

## E05 — Integrated docking, recovery and power-off review

- **Purpose:** Prove that a failed exchange can end cleanly and that power/safety integration is testable.
- **Method:** Run instrumented low-speed docking, inject acquisition failures, and conduct supervised power-isolation, fuse/wiring and emergency-stop reviews on a secured fixture.
- **Sample/repeats:** Thirty dock cycles and ten injected failures; repeat after hot operation.
- **Pass gate:** At least 28/30 docks complete; 10/10 failed acquisitions retreat within the 20 s engineering bail-out; emergency power removal passes every supervised trial with no unintended drive output.
- **Output:** Reliability record and updated component requirements, not a scoring adjudication.

