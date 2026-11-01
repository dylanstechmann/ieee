# Digital selection and interface ledger — v5

**Status:** agent-selected candidates and synthetic engineering requirements only. No final component, supplier order, fabrication release or physical approval. Values are dated 2026-10-31.

## Current digital decision

The #4754 / 80 mm / machined-bracket mule remains the balanced baseline because it passes the archived arithmetic screen and nominal deck checks, uses the COTS 80 mm wheel and avoids #4753's archived Backorder label. This is a reversible engineering choice, not a measured optimum. #4753 remains the speed alternative; #4755 requires a motor-gap redesign. All 76.2 mm wheel configurations require caster/deck revision under the current nominal geometry.

Hard geometry/arithmetic gates are applied before any simulation comparison. The sweep does not collapse unlike objectives into a single winner and does not treat synthetic current, energy or tracking as a component rating.

## Controller / sensing

| Interface | Digital requirement | Open evidence |
|---|---|---|
| Drive control | 2 independent bidirectional channels | Actual driver/controller compatibility and control scheduler |
| Encoder inputs | 2 quadrature channels | unselected; verify motor encoder datasheet and controller IO |
| Modeled control rate | 240 Hz | digital model rate, not a hardware requirement or validated scheduler |
| Fault handling | Encoder delay/dropout scenarios; software review | Real watchdog, safe output state and recovery are unimplemented/unvalidated |

## Driver / power / mechanism

| Area | Current digital baseline | Must not be inferred |
|---|---|---|
| Driver | two independent bidirectional channels; synthetic 3 A model limit | unselected synthetic model parameter; continuous, peak, thermal, braking and supply compatibility unresolved |
| Power | 12 V arithmetic source with resistance/sag | unselected arithmetic bus; battery chemistry, charger, fuse, wiring, switch and policy unresolved |
| Mechanism | passive geometry first | unselected; actuator requirements remain conditional on capture concept and measured loads |

The motor model uses archived no-load RPM, extrapolated stall current/torque and output encoder counts. Linear interpolation is a modeling approximation. Maximum-efficiency current is not a universal driver rating. Positive-only energy accumulation assumes no battery regeneration and is not a battery capacity calculation.

## Selection sequence

1. Preserve nominal geometry failures as review cases, not silent passes.
2. Compare all 18 configurations across six scenarios and 2/4/6 kg synthetic mass cases.
3. Use seeded sensitivity coverage to expose fragile assumptions; do not interpret its quantiles as real probabilities.
4. Convert candidate interface requirements into source-backed driver/controller/power research in the next work package.
5. Keep actual purchasing, fabrication and energization gated separately from this agent-led digital analysis.
