# Stopping dynamics v6

**Agent-run synthetic hobby/learning study. No driver, battery, mechanism or hardware qualification.**

84 cases: three archived motor candidates × seven initial-state scenarios × four generic output modes. V5 remains unchanged.

## Model

12 V reference fixes R=12/Istall and reciprocal k=stall torque/Istall. Viscous output-equivalent loss b=k(12-kω₀)/(Rω₀) fits the archived no-load endpoint while maintaining τ=kI and back-EMF=kω. This is an illustrative passive endpoint fit, not measured winding resistance, gearbox efficiency or no-load current. The implied current is in report.json. Coast opens the circuit but retains inferred mechanical loss. Dynamic brake shorts it and is not current-clipped. Active stop runs PI zero-wheel-speed control at 240 Hz. Driven mode holds the initial wheel targets as a control comparison. Initial motion is imposed identically for each mode.

Signed terminal power determines signed source current. The resistive-source operating point is solved on a bounded high-voltage branch; unsupported cases throw instead of inventing a voltage. Current limiting in driven modes adjusts ideal terminal voltage (including quadrant changes). Negative source power is returned to an **unresolved ideal boundary**, not accepted battery charge or safe voltage prediction.

Energy ledger: source net = Δ kinetic + source resistance + equivalent motor copper + inferred viscous loss + rolling/scrub + contact-projection dissipation + numerical residual. Explicit integration residual is retained, not silently balanced. Current extrema are collected at integration rate (7680 Hz), not telemetry rate (30 Hz). No PWM/substep peak certification. Control is held at 240 Hz when refining integration.

Stop requires |v|≤0.005 m/s, |yaw rate|≤0.02 rad/s and both |wheel speeds|≤0.125 rad/s continuously for 0.2 s; reported time/distance are the beginning of the first qualifying dwell. Driven cases can explicitly fail to stop. Drive loss transitions every requested mode to ideal coast at 0.25 s; it is not a device reset truth table.

## Artifacts and reproduction

- report.json: all case metrics and motor assumptions.
- summary.csv: comparison table.
- nominal-simulations.json: selected #4754 trajectories for synchronized playback.
- manifest.json: exact input/output and preserved-package hashes.

From /workspace/ieee/ieee: node tools/build-stopping-dynamics-v6.js; node --test tests/stopping-dynamics-v6.test.js; node tools/verify-stopping-dynamics-v6.js.

## Limits

- Agent-run hobby/learning study; not calibrated, measured, a safety function or a physical release.
- Output-equivalent reciprocal motor constant and inferred viscous loss fit archived 12 V endpoints; resistance and loss are not measured winding or gearbox values. Implied no-load current is reported, not a manufacturer rating.
- No inductance, switching ripple, brush drop, driver losses, thermal states, static friction, lateral dynamics, compliance or impact.
- Coast is an ideal open circuit; dynamic brake is an ideal short. No mapping to any candidate driver inputs, disable or fault states is qualified.
- Current clipping adjusts terminal voltage as an ideal four-quadrant actuator; it does not configure a hardware limiter. Dynamic-brake current is NOT clipped.
- Negative source power crosses an ideal unresolved boundary; no battery charge acceptance, capacitor voltage, transient clamp or safe bus prediction.
- Drive loss is a synthetic transition to coast, not a candidate driver's documented reset/fault behavior.
- Synthetic friction and inertia; bounded contact-impulse longitudinal/yaw model, no lateral tire physics. Contact dissipation includes timestep-dependent projection loss; refinement is required. Initial speed is imposed, not acquired by a preceding run.
