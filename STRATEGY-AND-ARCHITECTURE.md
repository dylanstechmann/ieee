# Strategy and architecture — GM2 V3 mission (provisional)

Agent-assisted analysis, 2026-10-29, built on the verified baseline in `VERIFIED-FACTS.md`, `CURRENT-RULES-2026-10-29.md`, `field-v3.parameters.json` and `constrained-field-v3.json`. This is planning support for a student hobby/learning project — not a rules ruling, a qualification, or a claim about a real match. Every disputed rule stays parameterized (§8); every number below traces to the verified baseline or to a labeled output of `tools/strategy-v3.js` / `tools/mission-timeline-v3.js` (22/22 tests pass, 2026-10-29).

## 1. How the match works (working reconstruction)

Frame: x=0 pit end → x=96 race end, y=0 left → y=48 right (proposed frame from `field-v3.parameters.json`; not organizer-provided).

```
PRESTART (start box, red tire preloaded)
  → GREEN FLAG → ENTER via a checkered opening (+25)
  → LAP 1 → PIT APPROACH → EXCHANGE (drop red in assigned box +25; pick blue from assigned box +40)
  → LAP 2 → raise flag at LAP 3 start (+25) → LAP 3
  → FINAL PARK (>75% in assigned box +15). Clock: final crossing <2:45 strict (+30), ≤3:00 (+100).
  Per-lap credits: no gray-wall contact 15, no obstacle contact 25.
```

**Physical vs painted (key finding).** The only physical barriers are the outer walls (1×4 stock), the center divider (1×2×36, along y≈24, x≈43.7–80) and the pit divider (1×1×16, at x≈28.3, y≈16–32). The octagonal track marking is **paint**; the two 15/15.02-in checkered openings flank the pit divider, and a lap crosses the checkered line at the pit mouth once per circuit.

**Pinch-zone geometry** (derived from vision-verified callouts, assuming equal 45° chamfers and the marking centered at x≈62, the midpoint of the 68-in race length; trace cross-check 61.94; all ±1-in field tolerance plus trace error):

| Zone | Width | Derivation |
|---|---:|---|
| Top/bottom lanes (wall to marking side) | ≈10.98 in | (48 − (12¼ + 2·9¾·sin45°)) / 2 |
| Right strip (marking flat to right wall) | ≈8.73 in | 96 − (62 + (36¾ + 2·9¾·sin45°)/2) |
| Left mouth (transition line to marking flat) | ≈8.41 in | (62 − (36¾ + 2·9¾·sin45°)/2) − 28.3 |

**3D sweep addendum (Blender model, 2026-10-29 — `derived/ieee-field-v3/`):** the end strips never fit under any wall-mounting scenario (right strip 7.73–8.73 in; left mouth 7.91–8.41 in to the transition line / pit-divider face), and the **top lane itself falls to 9.91 in** if the 1×4 walls are nominal 1-in lumber mounted inside the 96×48 footprint — 10.16 in with actual ¾-in stock, 10.91 in if walls sit outside. Wall mounting + installed lumber size are Q&A items #2/#3; checker openings always fit (14.94/15.08 in).

**Headline constraint — corrected October 30:** The archived GM1 V3 R01 gives a **minimum 10×10-in envelope**, while the modeled end strips (≈8.4–8.7 in) are narrower. Under the current dimensional and marking-containment assumptions this is a clearance conflict, **not evidence that the marking is officially advisory**. Installed geometry, allowed track overlap and minimum-envelope behavior require organizer clarification. Conditional engineering proposals, not approved rules interpretations:

* Use a **10.0-in nominal baseline width** for analysis; manufacturing tolerance, actual envelope compliance and mechanism extents still need verification. No final chassis dimensions selected.
* Study paths with markings conditionally excluded; do not assume paint overlap is permitted. A geometric pass is not lap legality.
* This is the **#1 official-Q&A question** (it defines the navigation design) and the **#1 Blender/Fusion geometry gate**.
* Obstacle behavior depends on actual geometry and placement. No shallow-S-curve or ToF-verified maneuver has been demonstrated; the current software study uses ideal straight/spin primitives only.

## 2. Scoring decomposition (nominal 390 robot + 10 publicity)

| Tier | Tasks | Points | Share |
|---|---|---:|---:|
| 0 — mobility & reliability | enter 25, green start 10, finish 100, <2:45 30, flag 25 | 190 | 49% |
| 1 — contact-free driving | wall-clean 15×3, obstacle-clean 25×3 | 120 | 31% |
| 2 — tire exchange | drop red 25, pick blue 40 | 65 | 17% |
| 3 — parking | >75% in assigned box | 15 | 4% |
| off-field | publicity contest | 10 | — |

Penalties: early start −2 plus Yellow Card plus loss of the green-start credit; Red Card zeroes the match score. Tire other-location fallbacks are 12/20 (alternatives, not additions). V3 removed V2's pit-stop credits and per-10-s speed bonus; the 30-point <2:45 credit is the only time award.

## 3. Expected-score model (`tools/strategy-v3.js`)

Inputs are **unconditional per-credit probabilities** (planning assumptions until bench evidence replaces them). Outputs are linear expected values, so failure correlations do not change the totals — only the spread; in reality reliability gains compound (a DNF cascades across finish, speed, exchange, laps and parking), which this model deliberately understates.

| Scenario | Expected robot tasks | With publicity |
|---|---:|---:|
| Conservative | 237.94 | 247.94 |
| Neutral | 300.12 | 310.12 |
| Optimistic | 349.19 | 359.19 |

Neutral contributions (EV points): finish 80.0, obstacle laps 50.0, wall laps 36.75, pickup 26.0, enter 23.75, speed 22.5, flag 22.5, drop 20.0, park 12.75, green 9.0, early-start −0.1, Red-Card factor ×0.99.

Value-of-improvement ranking (neutral, +0.05 per input):

| Rank | Input | ΔEV | System-group view |
|---|---|---:|---|
| 1 | pFinish | +5.00 | mission reliability dominates |
| 2 | pPickupAssigned | +2.00 | pickup mechanism +2.00 |
| 3 | pSpeedBonus | +1.50 | — |
| 4–10 | obstacle-clean laps ×3, drop, flag, enter | +1.25 each | **obstacle avoidance +3.75 as a group → #2 system** |
| — | wall-clean laps ×3 | +0.75 each | wall clearance +2.25 → #3 system |
| — | park +0.75, green +0.50 | — | — |

**Engineering priority:** (1) mission reliability — finish 3 laps + pit + park unaided; (2) obstacle avoidance; (3) wall-clearance discipline; (4) the tire pickup; (5) parking precision; (6) the flag (nearly free — always include it). The exchange is the biggest single mechanism prize (65), but a reliable, clean-driving robot without it still banks ≈260–300 EV, while an unreliable one loses everything.

## 4. Timeline feasibility (`tools/mission-timeline-v3.js`)

Lap path: marking perimeter from callouts 2×36¾ + 2×12¼ + 4×9¾ = **137 in**; offset outward by a 3.5-in centerline → **lap ≈ 158.99 in**. Mission path: 3 laps + start leg + park leg + pit detour ≈ **552.97 in ≈ 14.05 m**.

| Metric | Value |
|---|---:|
| Total mission time (cruise 8 in/s, dwell 15 s, overhead 19 s) | **103.12 s** |
| Margin to strict 2:45 (165 s) | **+61.88 s** |
| Margin to 3:00 (180 s) | +76.88 s |
| Required cruise for a 150-s mission | **4.77 in/s (0.12 m/s)** |
| Cruise −20% → 120.40 s; dwell +10 s → 113.12 s | both still clear 2:45 |
| No obstacle slowdowns | 91.12 s |

**Conclusion: the clock is not the discriminator.** A slow stroll (≈5 in/s) banks the 30-point bonus with margin. The 120 contact-free points and the 65-point exchange are where matches are won. Design implications:

* Cruise at 60–70% of top speed for control margin; invest in precision, not power.
* **Exchange bail-out policy:** budget the exchange at ~20 s with one in-pit retry; if pickup still fails, drop whatever is held and resume laps — keeps enter+finish+speed+laps+park+flag ≈ 300 EV instead of jamming the match.
* Pit stop after **lap 2** by default (blue tire carried only on lap 3 — less exposure to loss); lap-1 variant stays a parameter if retry time matters more.
* Conservative assumption baked in: the parking leg is charged inside the 165-s budget because the finish-line-vs-parking measurement is unresolved (§8).

## 5. Architecture — recommended baseline and alternatives

All selections are proposals gated by bench tests; nothing here is a decision until the discriminating experiment in the last column is run (concepts register per `GEOMETRY-AND-CONCEPTS.md`).

**October 31 requirements update:** `/workspace/ieee/ieee/derived/hardware-development-v3/README.md` supplies the current quantitative motor/encoder screens and common E00–E05 experiment gates. The 3–5 kg and ~80 g values below are unmeasured estimates, not selection inputs; the 3S battery and three-tine mechanism remain concepts, not choices. Use measured mass, current, tire properties and the new owner-input worksheet before sourcing parts.

**A. Drivetrain — differential skid-steer (recommended).** Two encoder gearmotors + rear skid/caster; footprint **10.0 W × 11.5–12 L × ≤12 H in**; ≤ 12-kg limit trivial (est. 3–5 kg); cruise 8–12 in/s closed-loop, top ~15 in/s. Alternatives: 4WD skid if traction tests fail; steering chassis rejected (turning radius vs lanes and pit box). *Test:* full-footprint mockup turning both directions in a taped 11-in lane and both end strips.

**B. Tire handling — vertical 3-tine expanding grab (recommended baseline).** Tire facts: OD 68.18, thickness 27.60, bore Ø40.30, wall 13.94 mm, TPU, est. ~80 g from mesh volume; tires are expected to lie flat in boxes (bore vertical — verify on the real field). Mechanism: servo-driven mast lowers three tines into the bore, tines expand beneath the tire (retention by geometry, no clamp needed at ~80 g), lift ~1 in, carry over the deck, lower + collapse to release into the box. The same grab holds the red tire preloaded at start (fits the 12-in cube with margin). Alternatives: passive ramp-scoop + drop door (fewer parts, pose-sensitive on TPU friction); active OD gripper (more DoF, jam/weight risk). *Test:* ≥50 trials per option across a pose matrix (±0.5-in offsets, rotations, flat/tilted) before freezing.

**C. Sensing stack (all parameterized pending venue tests).** 2–4× reflectance sensors on the marking edge for lane keeping (marking color unverified; background is black PPG1011-7 — calibrate at venue); wheel encoders for odometry, lap-length crosscheck (≈159 in) and checkered-crossing validation (state + distance window rejects pit-entry crossings); one camera for AprilTag 41h12 (68 mm, tags 1–3, magnetic on the pit wall) to identify the assigned box — the die-roll mapping changes per match, so read the tag live, with a manual selector fallback settable during the 5-s static; 2× short-range ToF for obstacle/wall clearance (alarm thresholds 1.5 in to obstacles, 0.5 in to walls). IMU optional for heading sanity.

**D. Obstacle policy.** Obstacle quadrants are parameterized zones (16-in squares, 2-in offsets, 4-in gaps, two per lane, three obstacles among four quadrants; poses unknown, ±1 in). Policy: slow to ~4 in/s inside zones, scan with ToF, pass with a shallow S-curve excursion over the marking edge (§1 corollary), never contact, resume line. If setup inspection is permitted, map poses before the run.

**E. Flag.** Servo mast on the top deck; raise at lap-3 start (after two validated crossings); keep raised (conservative against the §3.1-vs-§3.4.2 raise/lower contradiction; the scoring table says "during final lap"). Cost ~2 oz and one PWM pin — always include (+25).

**F. Power & safety.** 3S LiPo (≤12.6 V, within the 30-V distribution limit), fused, prominently marked hard e-stop cutting battery power; 5-s static lockout for switch starts; fully autonomous after the green flag (no off-robot comms during the match).

## 6. Match software — state machine and bail-outs

```
PRESTART → AWAIT_GREEN → ENTER → LAP{1..3} ⇄ PIT_APPROACH → EXCHANGE → FINAL_PARK → DONE
Guards: checkered crossings validated by sensor + odometry window (±15% of lap length);
        pit-entry crossings masked by state; watchdog: no odometry progress 5 s → back up, re-align.
Timers: EXCHANGE budget 20 s, one in-pit retry, then bail-out (drop held tire, resume laps);
        lap-count watchdog; green-start lockout until flag/switch release.
```

* **Lap counting** is the highest-stakes software function: enter/finish/speed/flag all key off it. Dual evidence (reflectance crossing + encoder distance) before incrementing.
* **Pit-stop lap** (1 or 2) is a single mission parameter; default 2 (§4).
* **Bail-outs always preserve the reliability tier:** a failed exchange or a missed box must degrade to a clean driving mission (~190–300 EV), never to a stuck robot.

## 7. Risk register (top 10)

| # | Risk | EV at stake | Mitigation | Gate |
|---|---|---|---|---|
| 1 | Lane/marking clearances differ from callouts (trace error, installed stock) | whole navigation design | Blender field from constrained geometry + Fusion export + physical measure; keep width 10.0 in | before chassis cut |
| 2 | Obstacle poses unknown (3 of 4 quadrants, ±1 in) | 75 | slow-zone policy, ToF scan, S-curve excursion, never contact | sim + bench |
| 3 | Tire pose/friction unknown (TPU, flat vs tilted) | 65 | grab bench matrix ≥50 trials; verify on real field | mechanism freeze |
| 4 | Rule ambiguities (flag, retention, pit dwell, parking, contraction) | up to ~90 swing | §8 parameterization; Q&A before design freeze | Q&A |
| 5 | Green-start jump | 12+ | start lockout until green; 5-s static if switch start | bench |
| 6 | Lap-count miscount (pit-entry crossing double-count) | timing + laps | crossing validation by state + odometry window; dual sensor | bench |
| 7 | Blue-tire loss on lap 3 | 40 | geometric retention, carry pose, slow zones | bench |
| 8 | Exchange jam eats clock | 30 + 100 | 20-s budget + bail-out (§6); cruise margin +61.9 s (§4) | bench |
| 9 | E-stop/inspection failure → Red Card | whole match | checklist, ≤30 V bus, marked switch, test protocol | every session |
| 10 | Venue lighting breaks camera/reflectance | park + box ID | venue calibration routine; odometry fallback (boxes at fixed coordinates) | venue day |

## 8. Rule-ambiguity dependencies (parameterized until official Q&A)

| Ambiguity | Design parameter | Conservative default |
|---|---|---|
| Lap definition: is the octagon marking advisory? | waypoints, excursion policy | stay outside where it fits; minimal overlap; Q&A first |
| Flag: §3.1 says lowered, §3.4.2 says raised | flag timing | raise at lap-3 start, keep raised |
| Tire pickup boundary + retention wording | grab behavior, carry pose | pick only inside assigned box; retain by geometry |
| Pit dwell / assigned stop (V3 table silent) | pit-stop duration | stop in box; no minimum dwell assumed |
| Parking: what ">75%" measures | park tolerance | target box center ±1 in (10×12 robot in 12×12 box) |
| Envelope contraction (V2 sentence absent in V3) | mechanism stowage | never below 10×10 at any time |
| Finish clock vs parking | timeline budget | parking charged inside 165 s (§4) |
| Publicity applicability | — | enter the contest early (10 pts, cheap) |

## 9. Next steps (ranked)

1. **Blender parametric field** from `constrained-field-v3.json` + `field-v3.parameters.json`, importing the real tire STL — verify pinch zones (§1), obstacle quadrants and pit layout against the trace; archive renders.
2. **2D waypoint/pit-docking simulator** with ±1-in field variation — tune offsets, cruise speeds, pit approach; consume the timeline model.
3. **Bench program:** tire-grab pose matrix (§5B), reflectance on paint samples, tag detection range/angles, taped 11-in lane turning trials.
4. **Official Q&A** (§8 list, led by the marking-advisory question) + Fusion export path for authoritative geometry.
5. **Chassis CAD** only after gate 1 clears; keep the 10.0-in width target until the lane check.

## Reproducibility

```
node tools/strategy-v3.js neutral        # or conservative | optimistic | path/to/input.json
node tools/mission-timeline-v3.js        # defaults; override via JSON file
node --test tests/*.test.js               # 22 tests (score 8 + strategy 9 + timeline 5)
```

Scenario inputs live in `tools/strategy-v3.js` (`PRESETS`) and `examples/strategy-v3-neutral.json`. Replace every planning probability with bench measurements as they arrive; the model is linear, so updates are trivial.