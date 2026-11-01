#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'derived/hardware-development-v3');
const round=(n,p=6)=>Number(n.toFixed(p));
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function validateConfig(c) {
  if (!c||c.status!=='agent-built-requirements-and-experiment-plan-no-components-selected-no-hardware-tested') throw new Error('explicit concept/experiment status required');
  const a=c.analysis_assumptions;
  for (const key of ['wheel_diameter_in','wheel_track_in','max_forward_in_s','cruise_in_s','acceleration_in_s2','rolling_resistance_coefficient','driven_weight_fraction','drivetrain_efficiency','design_torque_factor','speed_margin_factor','gravity_m_s2','design_mass_kg','odometry_quantum_in','test_window_min','usable_battery_fraction','energy_reserve_factor'])
    if (!Number.isFinite(a[key])||a[key]<=0) throw new Error(`positive finite ${key} required`);
  if (a.driven_weight_fraction>1||a.drivetrain_efficiency>1||a.usable_battery_fraction>1) throw new Error('fractions must not exceed one');
  for (const key of ['mass_cases_kg','friction_cases','battery_voltage_cases_v','average_electrical_power_cases_w'])
    if (!Array.isArray(a[key])||!a[key].length||a[key].some(v=>!Number.isFinite(v)||v<=0)) throw new Error(`positive array ${key} required`);
  if (!a.mass_cases_kg.includes(a.design_mass_kg)) throw new Error('design mass must be a sensitivity case');
  if (!Array.isArray(c.experiments)||c.experiments.length!==6||new Set(c.experiments.map(e=>e.id)).size!==6) throw new Error('six unique experiments required');
  for (const group of ['drivetrain','tire_handling']) if (!c.architectures[group].length) throw new Error(`${group} architectures required`);
  return a;
}
function validateNumber(v,name) { if(!Number.isFinite(v)||v<=0) throw new Error(`positive finite ${name} required`); }
function driveCase(a,massKg) {
  validateNumber(massKg,'mass');
  const radius=a.wheel_diameter_in*0.0254/2,speed=a.max_forward_in_s*0.0254,cruise=a.cruise_in_s*0.0254,accel=a.acceleration_in_s2*0.0254;
  const omega=speed/radius,totalForce=massKg*accel+a.rolling_resistance_coefficient*massKg*a.gravity_m_s2;
  const perSideTorque=totalForce*radius/2,designTorque=perSideTorque*a.design_torque_factor;
  return {
    mass_kg:massKg,wheel_radius_m:round(radius),top_speed_m_s:round(speed),cruise_speed_m_s:round(cruise),
    top_wheel_rpm:round(omega*60/(2*Math.PI)),cruise_wheel_rpm:round(cruise/radius*60/(2*Math.PI)),
    required_loaded_rpm_with_margin:round(omega*60/(2*Math.PI)*a.speed_margin_factor),
    acceleration_force_n:round(massKg*accel),rolling_force_n:round(a.rolling_resistance_coefficient*massKg*a.gravity_m_s2),
    total_tractive_force_n:round(totalForce),nominal_per_side_torque_nm:round(perSideTorque),design_per_side_torque_nm:round(designTorque),
    conservative_mechanical_w_per_side_with_torque_margin:round(designTorque*omega),
    minimum_motor_mechanical_w_per_side_at_assumed_efficiency:round(designTorque*omega/a.drivetrain_efficiency),
    required_friction_coefficient_at_driven_weight_fraction:round((accel+a.rolling_resistance_coefficient*a.gravity_m_s2)/(a.driven_weight_fraction*a.gravity_m_s2))
  };
}
function batteryCases(a) {
  return a.average_electrical_power_cases_w.map(power=>({
    average_electrical_w:power,measured_window_energy_wh:round(power*a.test_window_min/60),
    nameplate_energy_wh_with_reserve:round(power*a.test_window_min/60*a.energy_reserve_factor/a.usable_battery_fraction),
    capacity_ah_by_voltage_scenario:Object.fromEntries(a.battery_voltage_cases_v.map(v=>[String(v),round(power*a.test_window_min/60*a.energy_reserve_factor/a.usable_battery_fraction/v)]))
  }));
}
function buildReport(c) {
  const a=validateConfig(c),cases=a.mass_cases_kg.map(m=>driveCase(a,m)),design=cases.find(d=>d.mass_kg===a.design_mass_kg);
  const encoderCounts=Math.ceil(Math.PI*a.wheel_diameter_in/a.odometry_quantum_in);
  const friction=a.friction_cases.map(mu=>({assumed_mu:mu,traction_limited_acceleration_in_s2:round(Math.max(0,(mu*a.driven_weight_fraction-a.rolling_resistance_coefficient)*a.gravity_m_s2/0.0254)),meets_concept_acceleration:(mu*a.driven_weight_fraction-a.rolling_resistance_coefficient)*a.gravity_m_s2>=a.acceleration_in_s2*0.0254}));
  const requirements=[
    {id:'MOTOR-01',component:'Two motor/gearbox assemblies',requirement:`Per side: loaded output >= ${design.required_loaded_rpm_with_margin} RPM and >= ${design.design_per_side_torque_nm} N m at the ${a.design_mass_kg} kg scenario; verify actual motor curves and hot operation.`,evidence:'Concept calculation + E02; margins are assumptions, not vendor ratings.',status:'ready-for-candidate-screening-not-selected'},
    {id:'ENC-01',component:'Wheel-speed feedback',requirement:`At least ${encoderCounts} effective counts per wheel revolution for <= ${a.odometry_quantum_in} in ideal distance quantization; account for gearbox ratio and all decoder edges.`,evidence:'Geometry calculation; slip/odometry accuracy still requires E03.',status:'ready-for-candidate-screening-not-selected'},
    {id:'DRIVER-01',component:'Two-channel motor driver',requirement:'Continuous per-channel rating >= 1.25x measured hot continuous current; peak/supply ratings cover measured motor stall and transients at maximum intended pack voltage.',evidence:'Blocked on actual motor and E02; no defensible current number yet.',status:'blocked-on-measurement'},
    {id:'POWER-01',component:'Battery, distribution, fuse and wiring',requirement:'Energy from measured average power over the intended test/match window with 0.8 usable fraction and 1.25 reserve scenario; current/fuse/wire ratings from measured load; distribution <=30 V.',evidence:'GM1 R02/R16 limit + E02/E03/E05; voltage cases are not a pack selection.',status:'blocked-on-measurement-and-policy'},
    {id:'ESTOP-01',component:'Emergency power removal',requirement:'Clearly marked, accessible emergency stop and supervised power-off verification with no unintended drive output.',evidence:'GM1 R03-R04 + E05.',status:'requirement-only-not-tested'},
    {id:'TIRE-01',component:'Tire capture actuator and structure',requirement:'Size from measured tire/mechanism mass, bore/OD clearance, friction/deformation, moment arms and jam loads; meet E04 acquisition, retention and release gates.',evidence:'Official STL geometry + E01/E04; no 80 g mass assumption or servo torque selected.',status:'blocked-on-measurement-and-architecture'},
    {id:'STRUCT-01',component:'Chassis/support/fasteners',requirement:'Full intended configuration measured <=12 kg; starting/configuration envelope and full mechanism sweep inspected; survives E03 without loosening or wheel contact.',evidence:'GM1 R01/R02 + E03/E05; no final dimensions/material selected.',status:'blocked-on-architecture-and-measurement'},
    {id:'CONTROL-01',component:'Controller and power conversion',requirement:'Enough encoder, motor, mechanism and chosen sensor interfaces with measured regulator margins and brownout-free E02-E05 logs.',evidence:'Interface count follows selected architecture and sensor experiments.',status:'blocked-on-architecture-and-measurement'}
  ];
  return {version:c.version,date:c.date,status:c.status,sources:c.sources,assumptions:a,assumption_notes:c.assumption_notes,
    drive_cases:cases,design_case:design,encoder_counts_per_wheel_rev_min:encoderCounts,friction_cases:friction,battery_cases:batteryCases(a),requirements,architectures:c.architectures,experiments:c.experiments,
    limitations:['No physical measurements, vendor datasheets, prices or hardware trials are included.','Torque is a straight-line two-drive-wheel scenario; caster scrub, impacts and turning torque require measurement.','Battery current, motor-driver current and actuator torque are intentionally not guessed.','Experiment gates are engineering proposals, not organizer rules, legal interpretations or score predictions.']};
}
const cell=v=>String(v).replaceAll('|','\\|').replaceAll('\n',' ');
function renderReadme(r) {
  const d=r.design_case,a=r.assumptions;
  const massRows=r.drive_cases.map(x=>`| ${x.mass_kg} | ${x.total_tractive_force_n} | ${x.nominal_per_side_torque_nm} | ${x.design_per_side_torque_nm} | ${x.minimum_motor_mechanical_w_per_side_at_assumed_efficiency} |`).join('\n');
  const batteryRows=r.battery_cases.map(x=>`| ${x.average_electrical_w} | ${x.measured_window_energy_wh} | ${x.nameplate_energy_wh_with_reserve} | ${Object.entries(x.capacity_ah_by_voltage_scenario).map(([v,ah])=>`${ah} Ah @ ${v} V`).join('<br>')} |`).join('\n');
  const frictionRows=r.friction_cases.map(x=>`| ${x.assumed_mu} | ${x.traction_limited_acceleration_in_s2} | ${x.meets_concept_acceleration?'yes':'no'} |`).join('\n');
  return `# Hardware development requirements — October 31, 2026

Agent-built engineering package for the owner's hobby/learning project. **No component, battery chemistry, supplier or final mechanism is selected; no hardware has been tested or purchased.**

## Decision summary

Start with an instrumented two-driven-wheel mule and compare the passive fork, guided bore capture and OD gripper under the same E04 matrix. This is a prototype sequence, not an architecture freeze. The earlier 3S battery and three-tine ideas remain preliminary concepts; this report does not select them.

At the **${a.design_mass_kg} kg arithmetic scenario** (not a mass estimate), two ideal driven wheels, ${a.wheel_diameter_in}-in wheel diameter, ${a.max_forward_in_s} in/s top speed and ${a.acceleration_in_s2} in/s² acceleration:

- Top/cruise wheel speed: **${d.top_wheel_rpm} / ${d.cruise_wheel_rpm} RPM**.
- Candidate screening speed with ${a.speed_margin_factor}× margin: **${d.required_loaded_rpm_with_margin} loaded RPM per gearbox**.
- Nominal accelerating torque: **${d.nominal_per_side_torque_nm} N m per side**.
- Screening torque with ${a.design_torque_factor}× factor: **${d.design_per_side_torque_nm} N m per side**.
- Ideal encoder quantization gate: **${r.encoder_counts_per_wheel_rev_min} effective counts per wheel revolution**.
- Required straight-line friction coefficient under the ${a.driven_weight_fraction} driven-weight-fraction assumption: **${d.required_friction_coefficient_at_driven_weight_fraction}**. Turning/caster scrub is not included.

These are output-side requirements. Do not compare them with a bare motor shaft rating or treat no-load RPM as loaded RPM.

## Mass sensitivity

| Mass scenario (kg) | Total tractive force (N) | Nominal N m/side | 2× screening N m/side | Minimum motor mechanical W/side at assumed efficiency |
|---:|---:|---:|---:|---:|
${massRows}

The power column combines the margined torque with top wheel speed and divides by the assumed ${a.drivetrain_efficiency} drivetrain efficiency; it is a conservative calculation envelope, **not measured electrical power or a battery-current calculation**.

## Friction sensitivity

| Assumed tire/board μ | Straight-line traction-limited acceleration (in/s²) | Meets ${a.acceleration_in_s2} in/s² concept acceleration? |
|---:|---:|---|
${frictionRows}

Normal force on the driven axle, caster scrub and impacts can dominate these ideal results. E03 must measure them.

## Battery energy scenarios, not pack choices

For a ${a.test_window_min}-minute window, ${a.usable_battery_fraction} usable fraction and ${a.energy_reserve_factor} reserve factor:

| Average total electrical power scenario (W) | Window energy (Wh) | Nameplate Wh with reserve | Arithmetic capacity by voltage scenario |
|---:|---:|---:|---|
${batteryRows}

Battery current cannot be inferred safely from these average-energy cases. Select driver, peak/stall capacity, pack, fuse, wire, connectors and charger only from actual motor/load data and approved policies. Power distribution must remain within the documented 30 V maximum; neither 7.4 V nor 11.1 V is selected here.

## Work sequence

1. **E00:** owner records tools/access/policies.
2. **E01:** characterize the actual tire and label any STL print as a surrogate.
3. **E02/E03:** screen and measure the drivetrain before selecting driver or battery.
4. **E04:** run the common tire-mechanism bake-off; use the [geometry coupon kit](../mechanism-prototyping-v3/README.md).
5. **E05:** verify docking recovery and supervised emergency power removal.

See [owner-input.md](owner-input.md), [component-selection.md](component-selection.md), [experiment-plan.md](experiment-plan.md), [report.json](report.json), and [trial-log-template.csv](trial-log-template.csv). All acceptance gates are proposed engineering targets, not official rules or claims of competition performance.
`;
}
function renderComponents(r) {
  const rows=r.requirements.map(x=>`| ${x.id} | ${cell(x.component)} | ${cell(x.requirement)} | ${cell(x.evidence)} | ${x.status} |`).join('\n');
  return `# Component-selection matrix\n\nThis is a requirements screen, **not a shopping list**. No supplier, price, compatibility or purchase approval is recorded.\n\n| ID | Component | Minimum requirement / gate | Evidence needed | Status |\n|---|---|---|---|---|\n${rows}\n\n## Architecture candidates\n\n${['drivetrain','tire_handling'].map(group=>`### ${group}\n\n${r.architectures[group].map(x=>`- **${x.id} — ${x.name}** (${x.status}): ${x.benefit} Risk: ${x.risk} Decision: ${x.decision_test}`).join('\n')}`).join('\n\n')}\n`;
}
function renderExperiments(r) {
  return `# Physical experiment plan\n\nNo experiments below have been run. Perform energized or mechanical tests only with suitable supervision, secured fixtures and applicable lab/battery procedures. Gates are agent-proposed engineering criteria.\n\n${r.experiments.map(e=>`## ${e.id} — ${e.title}\n\n- **Purpose:** ${e.purpose}\n- **Method:** ${e.method}\n- **Sample/repeats:** ${e.sample}\n- **Pass gate:** ${e.pass_gate}\n- **Output:** ${e.output}\n`).join('\n')}\n`;
}
function generate(c) {
  const r=buildReport(c);fs.mkdirSync(out,{recursive:true});
  const measurement={status:'blank-template-no-measurements',date:null,measured_by:null,equipment_ids:[],robot_mass_kg:null,wheel_diameter_mm:null,driven_weight_fraction:null,rolling_resistance_coefficient:null,friction_coefficient:null,tire_mass_g:null,tire_material:null,tire_pose_classes:[],average_electrical_w:null,hot_continuous_current_a_per_side:null,motor_stall_current_a_at_max_voltage:null,bus_voltage_min_nominal_max_v:[null,null,null],notes:'Replace nulls only with dated physical measurements and equipment IDs; do not edit derived report values directly.'};
  const files={
    'report.json':JSON.stringify(r,null,2)+'\n','README.md':renderReadme(r),'component-selection.md':renderComponents(r),'experiment-plan.md':renderExperiments(r),
    'measurement-template.json':JSON.stringify(measurement,null,2)+'\n',
    'owner-input.md':'# Owner input for the first hardware screen\n\n## Owner-provided planning assumptions — October 31, 2026\n\n- FAU tools and space, including 3D printers and soldering equipment, are assumed available. Exact equipment, training, hours, storage, fees and supervision remain unverified.\n- New component purchases are expected; existing or borrowable equipment is not a design constraint.\n- Initial prototyping budget: $500–$1,000. Working planning target: $750; maximum planning cap: $1,000.\n- These are owner-provided planning assumptions, not purchase authorization, an order record or evidence of lab approval.\n\n## Remaining facility and policy details\n\n- Staff contact and required authorization/training:\n- Available scale / calipers / multimeter / bench supply and equipment IDs:\n- Lab hours, storage, material charges and printing procedures:\n- Battery/charging policies and required supervision:\n- Secured, permitted test space and field-like surface:\n- Deadline or session constraints:\n\n## Current research and purchase record\n\n- Sourced Order A research: `/workspace/ieee/ieee/derived/order-a-procurement-v4/README.md`.\n- Selected required-parts subtotal: $177.25 before shipping, tax and unpriced consumables; no parts ordered.\n- Actual owner approvals, supplier orders, receipts and received-part measurements:\n\nUnknown is acceptable. Do not buy parts merely to complete this form. Update the dated record when assumptions or approvals change.\n',
    'trial-log-template.csv':'experiment_id,run_id,date,operator,architecture_id,hardware_version,surface,tire_id,mass_kg,bus_v,pose_class,offset_mm,yaw_deg,command,outcome,time_s,current_peak_a,temp_max_c,notes\n'
  };
  for(const [name,text] of Object.entries(files))fs.writeFileSync(path.join(out,name),text);
  const inputFiles=['hardware-development-v3.json','tools/hardware-development-v3.js',...c.sources];
  const manifest={date:c.date,status:c.status,input_hashes:Object.fromEntries(inputFiles.map(f=>[f,hash(path.join(root,f))])),output_hashes:Object.fromEntries(Object.keys(files).map(f=>[f,hash(path.join(out,f))]))};
  fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  return {report:r,manifest,files};
}
module.exports={validateConfig,driveCase,batteryCases,buildReport,renderReadme,renderComponents,renderExperiments,generate};
if(require.main===module){
  const c=JSON.parse(fs.readFileSync(path.join(root,'hardware-development-v3.json'),'utf8')),r=generate(c).report;
  console.log(`Wrote ${out}`);
  console.log(`${r.assumptions.design_mass_kg} kg scenario: ${r.design_case.required_loaded_rpm_with_margin} RPM and ${r.design_case.design_per_side_torque_nm} N m per side; ${r.requirements.length} component gates; ${r.experiments.length} experiments; no components selected.`);
}
