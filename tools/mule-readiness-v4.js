'use strict';
const {provenanceColumns}=require('./mule-measurements-v4');
function appendProvenance(text){
  const lines=text.trimEnd().split('\n');
  return lines.map((line,i)=>line+','+(i===0?provenanceColumns.join(','):provenanceColumns.map(()=> '').join(','))).join('\n')+'\n';
}
function readinessArtifacts(c,g){
  const fitChecks=[
    ['motor-gap','motor body center gap',g.motor_body_center_gap_mm,'mm','engineering nominal minimum',c.gates.minimum_motor_body_gap_mm],
    ['wheel-clearance','wheel/deck lateral clearance',g.wheel_deck_lateral_clearance_mm,'mm','engineering nominal minimum',c.gates.minimum_wheel_deck_lateral_clearance_mm],
    ['caster-contact','caster contact Z',g.caster_contact_z_mm,'mm','engineering nominal absolute tolerance',c.gates.caster_contact_tolerance_mm],
    ['caster-height','caster plus selected spacer',g.caster_height_with_selected_spacer_mm,'mm','manufacturer drawing arithmetic',''],
    ['hole-ligament','motor-hole edge ligament',g.motor_hole_edge_ligament_mm,'mm','engineering nominal minimum',c.gates.minimum_motor_hole_edge_ligament_mm],
    ['screw-engagement','motor mounting screw penetration',3.5,'mm','archived manufacturer maximum',3.5],
    ['hub-stack','hub wheel axial stack-up','','mm','unknown; inspect received parts',''],
    ['free-rotation','free rotation and no binding','','text','assembly inspection',''],
    ['cable-exit','cable exit and strain relief space','','mm','unknown; setup review required',''],
    ['ballast-restraint','ballast restraint and fastener selection','','text','unreleased; approval required',''],
    ['bench-restraint','fixture attachment and restraint','','text','unreleased; setup approval required',''],
    ['support-contact','wheel loading and tipping in each support configuration','','text','nominal contact is not traction evidence','']
  ];
  const fitHeader=['check_id','quantity','nominal_value','unit','basis','reference_limit','part_serials','instrument_id','calibration_check_id','repeat_1','repeat_2','repeat_3','uncertainty','measured_result','disposition','reviewer','reviewed_at','evidence_ref'];
  const equipment=['dimensional measurement','mass measurement','electrical measurement','encoder observation','speed and duration measurement','torque measurement fixture','temperature measurement','approved bench power and current limiting','provisional bench driver','disconnect and protection','secured fixture and permitted test area'];
  const blankCsv=(header,rows)=>header.join(',')+'\n'+rows.map(r=>header.map((_,i)=>r[i]??'').join(',')).join('\n')+'\n';
  return{
    'fit-review.csv':blankCsv(fitHeader,fitChecks),
    'equipment-readiness.csv':blankCsv(['capability','equipment_id','owned_or_borrowed','available','range_resolution','calibration_check_ref','procedure_ref','training_supervision_ref','reviewer','reviewed_at','notes'],equipment.map(x=>[x])),
    'session-record.json':JSON.stringify({status:'blank-template-not-approved-not-executed',session_id:null,configuration_id:null,operator_id:null,supervisor_or_reviewer:null,facility_permission_ref:null,setup_record_id:null,setup_approval_ref:null,instrument_ids:[],calibration_check_id:null,control_revision:null,warmup_record_id:null,uncertainty_record_id:null,raw_observation_refs:[],surface_description_ref:null,measurement_methods:{rpm:null,torque_nm:null,current_a:null,transient_current_a:null,temperature_c:null,duration_s:null,drift_mm:null,spin_error_deg:null},stop_conditions:{source_limits_ref:null,approved_bus_range_v:null,current_limit_a:null,temperature_limit_c:null,maximum_test_duration_s:null,disconnect_check_ref:null,mechanical_stop_conditions:null,fault_response_ref:null},approval:{reviewer:null,reviewed_at:null,decision:null}},null,2)+'\n',
    'bench-readiness.md':`# Mule bench readiness — planning record, not authorization

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
`
  };
}
module.exports={appendProvenance,readinessArtifacts};