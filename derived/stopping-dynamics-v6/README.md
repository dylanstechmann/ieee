# Stopping dynamics v6.1

**Agent-run synthetic hobby/learning study. No driver, battery, mechanism or hardware qualification.**

168 cases: three archived motor candidates × two explicit loss assumptions × seven initial-state scenarios × four generic output modes. The original v6 package is preserved under derived/audits/2026-10-31-stopping-v6-prepair/; v5 remains unchanged.

## Source discrepancy and sensitivity models

The archived source lists no-load speed, no-load current, stall extrapolation and a maximum-efficiency point. The original reciprocal fit used stall and no-load speed but ignored published no-load current. Both simulation variants now retain the same R=12/Istall and reciprocal k=stall torque/Istall:

- reciprocal-speed-fit: the original passive viscous-loss fit. Its implied no-load current conflicts with the published value.
- reciprocal-no-load-loss: uses published no-load current to set loss torque kI₀=bω₀. It is passive, but its zero-load steady speed at 12 V does not reproduce the published no-load speed.

These are **assumption cases, not confidence bounds or alternative hardware selections**. report.json contains per-motor source discrepancies, including maximum-efficiency current comparisons. An exact stall/no-load-current/no-load-speed fit requires ke≠kt; its loss equation I²R+(ke-kt)ωI+bω² has a negative-loss witness inside each stated operating envelope. That fit is rejected for four-quadrant simulation rather than silently assigning the negative loss elsewhere.

Coast opens the circuit but retains the selected inferred mechanical loss. Dynamic brake is an unclipped ideal short. Active stop runs PI zero-wheel-speed control at 240 Hz. Driven mode holds initial wheel targets except during synthetic drive loss. Initial motion is imposed identically across modes for each motor/model/scenario.

## Electrical and numerical boundaries

Signed terminal power determines signed source current. The resistive-source operating point uses a bounded high-voltage branch; unsupported cases throw. Current limiting adjusts ideal terminal voltage, including quadrant changes. Negative source power crosses an **unresolved ideal boundary**, not accepted battery charge or a safe voltage prediction.

Energy ledger: source net = Δ kinetic + source resistance + equivalent motor copper + inferred viscous loss + rolling/scrub + contact-projection dissipation + numerical residual. Residuals remain visible. Current extrema use the 7680 Hz integration rate, not 30 Hz telemetry; no PWM/substep peak certification. Refinement holds control at 240 Hz.

Stop requires |v|≤0.005 m/s, |yaw rate|≤0.02 rad/s and both |wheel speeds|≤0.125 rad/s continuously for 0.2 s. stop_time_s and stop_distance_m refer to dwell entry; stop_confirmed_at_s records dwell completion. This is not a safety stop. Drive loss transitions every requested mode to ideal coast at 0.25 s, not a device reset truth table.

## Artifacts and reproduction

- report.json: 168 case metrics, both motor models and source-data audits.
- summary.csv: comparison table including model variant.
- nominal-simulations.json: 56 selected-#4754 trajectories and model-source evidence.
- refinement-study.json: independently checked half-timestep comparison.
- manifest.json: exact input/output and preserved-package hashes.

From /workspace/ieee/ieee:

    node tools/build-stopping-dynamics-v6.js
    node tools/refine-stopping-dynamics-v6.js
    node --test tests/stopping-dynamics-v6.test.js tests/stopping-dynamics-v6-source-audit.test.js
    node tools/verify-stopping-dynamics-v6.js

## Limits

- Agent-run hobby/learning study; not calibrated, measured, a safety function or a physical release.
- Two passive reciprocal assumption cases are compared: a stall/no-load-speed fit and a no-load-current loss sensitivity. Neither reproduces every archived operating point. Published no-load current and maximum-efficiency discrepancies are retained in motor_source_audit. An exact three-endpoint nonreciprocal fit is rejected for four-quadrant simulation when its loss equation has a negative witness; assumption spread is not a confidence bound.
- No inductance, switching ripple, brush drop, driver losses, thermal states, static friction, lateral dynamics, compliance or impact.
- Coast is an ideal open circuit; dynamic brake is an ideal short. No mapping to any candidate driver inputs, disable or fault states is qualified.
- Current clipping adjusts terminal voltage as an ideal four-quadrant actuator; it does not configure a hardware limiter. Dynamic-brake current is NOT clipped.
- Negative source power crosses an ideal unresolved boundary; no battery charge acceptance, capacitor voltage, transient clamp or safe bus prediction.
- Drive loss is a synthetic transition to coast, not a candidate driver's documented reset/fault behavior.
- Synthetic friction and inertia; bounded contact-impulse longitudinal/yaw model, no lateral tire physics. Contact dissipation includes timestep-dependent projection loss; refinement is required. Initial speed is imposed, not acquired by a preceding run.
