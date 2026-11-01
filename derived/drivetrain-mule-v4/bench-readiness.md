# Mule bench readiness — planning record, not authorization

Agent-authored preparation for the owner's hobby/learning project. No energized tests, equipment approvals, fabrication releases or purchases are recorded. Read archived manufacturer evidence and applicable facility procedures; this checklist is not a substitute for supervision or a complete safety procedure.

## Dependency gates

| Gate | Required evidence | Enables | Does not enable |
|---|---|---|---|
| R0 access and resources | Facility permission, supervision, equipment inventory and approved procedures | Prepare an approved experiment | Unsupervised or energized work |
| R1 receipt / E02A | SKU and serial inventory, repeated dimensional measurements, fit review and manufacturer limits | Review geometry and provisional bench setup | Final driver or fabrication release |
| R2 provisional bench setup | Reviewed driver/supply compatibility using archived ratings, intended operating envelope, protection, disconnect, fixture, instruments and explicit stop conditions | Only the bounded characterization covered by that approval | Robot driver qualification, stall testing or battery selection |
| R3 motor characterization / E02B | Approved R2 setup and raw voltage, load, speed, current, thermal and fault records | Review operating requirements and candidate final driver | Automatic final component rating from the 1.25× screen |
| R4 low-energy commissioning | Reviewed R3 findings, permitted restrained setup, encoder/motor directions, control revision and disconnect checks | Approved incremental E03 trials | Full-matrix execution without trial-specific review |
| R5 E03 and power review | Complete traceable support/traction/control results, current/transient evidence and policy review | Human-reviewed support and final driver/power decisions | Independent qualification or official competition legality |

**No circular driver gate:** the provisional bench driver is an experiment instrument/setup choice. Its approval uses documented manufacturer limits and an intentionally bounded test envelope, not results from a test that has not happened. If no suitable setup can be approved, remain blocked. Final robot driver selection follows R3/R5 review. E02A alone cannot establish hot operating current or transient ratings. No bench driver, battery, controller or actuator is selected by this package.

## Before a bench session

1. Complete equipment-readiness.csv with actual IDs, ranges/resolution, availability, calibration/check references and training/supervision. Missing tools remain missing; do not turn this into an automatic shopping list.
2. Copy session-record.json into a separately named session directory outside generated templates. A reviewer must define actual permitted bus/load ranges, current/temperature/time limits, restraint, disconnect and fault response from applicable documentation. Null limits mean not ready; this software supplies no universal safe limits.
3. Document measurement methods: speed/counting interval, torque fixture and lever arm/calibration, current sampling bandwidth and transient capture, temperature location, warmup criterion and ambient conditions. Define uncertainty and sign conventions. Do not extrapolate a stall or peak rating from the continuous-current screen.
4. Review fit-review.csv using actual received-part measurements and instrument IDs. Keep optional ballast holes, deck material/process and fixture attachments unreleased until reviewed.
5. Review stop conditions before energizing: stop for conditions outside the approved envelope, failed restraint/disconnect checks, binding, unexpected motion, abnormal heating or protection faults. Follow the approved facility fault procedure, not improvised continued trials.

## Measurement and evidence rules

- Use mm, kg, V, A, N m, degrees C and seconds as defined by measurement-schema.json; speed is in/s and angular error is degrees. Drift/error may be signed; gates use absolute error.
- A hardware configuration_id fixes motor/wheel, driver and relevant hardware revision. Support/mass cases remain explicit row columns. Record control_revision for each attempt; configuration or control changes require a new reviewed comparison, not silent pooling.
- Each attempt gets a unique trial_id and explicit attempt_status: completed, aborted or excluded. Unattempted template rows stay blank (interpreted as planned). Never delete an unsuccessful attempt.
- Aborted/excluded attempts require an exclusion_reason and the same provenance as completed attempts; retain available readings and raw observations. They never count toward completion. A replacement has a new trial_id, the same slot and replaces_trial_id referencing the retained aborted/excluded attempt. Exclusions need human review; repeated failures cannot be washed out by retesting.
- Completed faulty trials stay completed and affect gate results. Do not exclude an inconvenient failure just to obtain a pass. More than one completed attempt for a slot is rejected; plan a separate matrix/session for additional completed replicates.
- Copy actual observations into a new log, not into the generated blank templates. Store photos, instrument exports and notes under immutable raw-observation references. Synthetic examples belong only in test fixtures or explicitly named scratch files.
- Every attempted row requires session/operator/time (ISO timestamp with timezone), equipment/calibration, approved setup, configuration/control revision, warmup/uncertainty and raw-observation references. The analyzer checks presence, not the existence, truth or approval of those references.
- Preserve the source CSV. CLI summaries use exclusive creation, include raw-input/config/analyzer hashes and cannot overwrite existing files. For a corrected record, preserve the original and document a dated revision.
- Partial reporting uses --progress and never issues gate passes or driver screens, even when all slots happen to be complete. Full analysis rejects missing slots and retains an exclusion/abort audit. Physical acceptance always requires human review.

## Fit review and fabrication hold

fit-review.csv separates nominal/reference values from measured repeats, uncertainty, disposition, reviewer and evidence. Blank received dimensions or unsupported tolerances remain unknown. The 3.5 mm motor screw penetration maximum is from the archived manufacturer evidence; the deck's other numeric gates are engineering nominal checks, not certified fabrication tolerances.

Review motor/bracket orientation, screw engagement, hub/wheel stack-up, free rotation, actual caster/spacer height, wheel/deck/body clearances, cable strain relief, ballast restraint and bench attachment. Evaluate contact and tipping for every proposed support case. A closed STL or favorable nominal contact Z is not structural, traction or manufacturing approval. Approve a dated fabrication revision only after received-part fit and material/process/fixture review.
