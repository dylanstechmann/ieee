# Stopping Dynamics v6 source audit and repair baseline

Agent-run AI-assisted review of a personal hobby/learning project. Digital analysis only; no purchasing, fabrication, energization or physical trials.

## Baseline and attribution

`baseline-hashes.json` records 28 files copied before edits. Every copied file was hashed and compared with its source. `baseline/` retains the original 84-case report, 28-trajectory Studio, sources, tests, screenshots and handoff notes. The project has no Git metadata, so this is a file backup, not a commit or attribution of changes to a particular agent. No post-handoff file modification was detected during the read-only review.

## Confirmed source discrepancy

The archived Pololu pages and `order-a-procurement-v4.json` provide no-load speed, no-load current, stall extrapolation and maximum-efficiency points. Original `motorModel()` used stall and no-load speed, but ignored no-load current.

| Motor | Published I0 | Original fitted I0 | Published max-efficiency current | Original torque-implied current at that speed/torque |
|---|---:|---:|---:|---:|
| #4753 | 0.200 A | 1.905675 A | 0.660 A | 2.291298 A |
| #4754 | 0.200 A | 2.034044 A | 0.680 A | 2.414690 A |
| #4755 | 0.200 A | 2.590308 A | 0.720 A | 2.932980 A |

The original equations behaved as written; the problem was treating their output as a sufficiently neutral quantitative comparison while leaving available contradictory evidence outside the tests.

## Sensitivity, not a replacement truth model

Two passive reciprocal assumptions are now simulated. Both retain R=12/Istall and k=stall torque/Istall:

- `reciprocal-speed-fit`: original stall/no-load-speed loss fit; its no-load current conflicts with the source.
- `reciprocal-no-load-loss`: sets kI0=bω0 from published no-load current; its zero-load speed at 12 V does not match the source.

Straight-coast sensitivity results:

| Motor | Speed-fit dwell-entry distance | No-load-loss dwell-entry distance | Ratio |
|---|---:|---:|---:|
| #4753 | 15.020968 mm | 52.183245 mm | 3.4740× |
| #4754 | 9.511984 mm | 42.669521 mm | 4.4859× |
| #4755 | 7.234223 mm | 31.038414 mm | 4.2905× |

These are assumption cases, not statistical bounds or hardware predictions. The no-load-loss alternative is not presented as a validated correction.

An exact stall/no-load-current/no-load-speed fit requires ke≠kt. Its loss expression I²R+(ke−kt)ωI+bω² has a negative-loss witness inside each declared |ω|≤ω0, |I|≤Istall envelope. Witness losses are −0.018473 W, −0.322337 W and −1.846811 W for #4753/#4754/#4755 respectively. That fit is therefore recorded but rejected for four-quadrant simulation. The source data are not declared wrong; the simple model class is insufficient to reconcile them passively.

## Corrections and checks

- Expanded the study to 168 cases: 3 motors × 2 assumptions × 7 scenarios × 4 modes.
- Export 56 selected-#4754 trajectories with model identities and source audits.
- Retain stop dwell-entry time/distance and add explicit dwell-confirmation time and sampled distance.
- Recompute every half-timestep case in the verifier; do not trust summary booleans.
- Studio requires an assumption selection, plots both assumptions and displays source discrepancies/ranges.
- Owner visual review led to a stationary-tire presentation: the complete robot approaches, source-relative contacts remain unchanged, and sample-union geometry is recomputed in tire-fixed coordinates. Actual scene positions are checked in Node and browser evidence.
- Browser evidence contains 162 unique mechanism cases at three frames each and 56 unique stopping combinations at three samples each, plus actual DOM interactions.
- Direct `file://` rendering was checked with Chromium offline and no external requests. Four ReadPixels performance warnings were retained; zero JavaScript/page errors occurred.
- Raw browser records, console/network output, screenshot hashes and source hashes are sealed. `tools/seal-integration-studio-v6.js` regenerates the summary checked by the verifier.

## Ruled out during review

Three stopped `driven` cases are intentional `drive-loss` scenarios. Current source records stop distance at dwell entry, as documented. A failed immediate display-option diagnostic was a test-harness animation-frame race; the frame-synchronized rerun passed and its note remains in evidence. An initial focused-test strict floating-point equality failure was corrected with a tolerance before the baseline handoff.

## Remaining gates

No measured E02/E03 data, candidate-driver coast/brake/fault mapping, accepted returned-energy destination, final driver/battery/protection selection, mechanism selection or mounting clearance is established. Future driver and mechanism integration must not treat the two-assumption spread as measured motor behavior.
