'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {validateConfig,driveCase,batteryCases,buildReport,renderReadme,renderComponents,renderExperiments}=require('../tools/hardware-development-v3');
const root=path.resolve(__dirname,'..'),config=JSON.parse(fs.readFileSync(path.join(root,'hardware-development-v3.json'),'utf8'));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('4 kg drive scenario matches independent hand arithmetic',()=>{
  const d=driveCase(config.analysis_assumptions,4),r=3*0.0254/2;
  close(d.top_wheel_rpm,10*0.0254/r*60/(2*Math.PI));
  close(d.total_tractive_force_n,4*24*0.0254+0.03*4*9.81);
  close(d.nominal_per_side_torque_nm,3.6156*r/2);
  close(d.design_per_side_torque_nm,3.6156*r);close(d.required_loaded_rpm_with_margin,76.394373);
  close(d.required_friction_coefficient_at_driven_weight_fraction,(24*0.0254+0.03*9.81)/(0.8*9.81));
  assert.equal(buildReport(config).encoder_counts_per_wheel_rev_min,Math.ceil(Math.PI*3/0.05));
});

test('torque scales with mass and invalid mass is rejected',()=>{
  const a=config.analysis_assumptions,two=driveCase(a,2),six=driveCase(a,6);
  assert.ok(Math.abs(six.design_per_side_torque_nm-two.design_per_side_torque_nm*3)<2e-6,'mass scaling within report rounding precision');
  assert.throws(()=>driveCase(a,0),/mass/);assert.throws(()=>driveCase(a,NaN),/mass/);
});

test('friction sensitivity exposes low-traction failure instead of hiding it',()=>{
  const r=buildReport(config);assert.deepEqual(r.friction_cases.map(x=>x.meets_concept_acceleration),[false,true,true]);
  assert.ok(r.friction_cases[0].traction_limited_acceleration_in_s2<24);
});

test('battery cases preserve energy and show voltage-dependent capacity without selecting a pack',()=>{
  const b=batteryCases(config.analysis_assumptions);
  assert.deepEqual(b.map(x=>x.average_electrical_w),[6,12,24]);close(b[1].measured_window_energy_wh,6);close(b[1].nameplate_energy_wh_with_reserve,9.375);
  close(b[1].capacity_ah_by_voltage_scenario['7.4'],9.375/7.4);close(b[1].capacity_ah_by_voltage_scenario['11.1'],9.375/11.1);
  assert.match(buildReport(config).limitations.join(' '),/current.*not guessed/);
});

test('configuration validation rejects hidden changes to assumptions and experiments',()=>{
  const before=JSON.stringify(config);assert.equal(validateConfig(config),config.analysis_assumptions);assert.equal(JSON.stringify(config),before);
  let c=structuredClone(config);c.analysis_assumptions.drivetrain_efficiency=1.1;assert.throws(()=>buildReport(c),/fractions/);
  c=structuredClone(config);c.analysis_assumptions.design_mass_kg=7;assert.throws(()=>buildReport(c),/sensitivity/);
  c=structuredClone(config);c.experiments[1].id=c.experiments[0].id;assert.throws(()=>buildReport(c),/unique experiments/);
});

test('requirements retain measurement gates and all architecture alternatives',()=>{
  const r=buildReport(config);assert.equal(r.requirements.length,8);assert.equal(r.experiments.length,6);
  assert.deepEqual(r.architectures.tire_handling.map(x=>x.id),['PASSIVE-FORK','BORE-CAPTURE','OD-GRIPPER']);
  assert.match(r.requirements.find(x=>x.id==='DRIVER-01').status,/blocked/);
  assert.match(r.requirements.find(x=>x.id==='TIRE-01').evidence,/no 80 g/);
  assert.ok(!/supplier[^ ]* selected/i.test(JSON.stringify(r)));
});

test('generated documents and blank measurement templates match the pure report',()=>{
  const r=buildReport(config),out=path.join(root,'derived/hardware-development-v3');
  assert.equal(JSON.parse(fs.readFileSync(path.join(out,'report.json'),'utf8')).design_case.required_loaded_rpm_with_margin,r.design_case.required_loaded_rpm_with_margin);
  assert.equal(fs.readFileSync(path.join(out,'README.md'),'utf8'),renderReadme(r));
  assert.equal(fs.readFileSync(path.join(out,'component-selection.md'),'utf8'),renderComponents(r));
  assert.equal(fs.readFileSync(path.join(out,'experiment-plan.md'),'utf8'),renderExperiments(r));
  const measured=JSON.parse(fs.readFileSync(path.join(out,'measurement-template.json'),'utf8'));
  assert.equal(measured.robot_mass_kg,null);assert.equal(measured.motor_stall_current_a_at_max_voltage,null);
});
