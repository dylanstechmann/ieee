'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const D=require('../tools/stopping-dynamics-v6');
const Build=require('../tools/build-stopping-dynamics-v6');
const config=require('../stopping-dynamics-v6.json');
const candidates=require('../order-a-procurement-v4.json').candidates;
const close=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b} within ${t}`);

test('motor audit retains published no-load and maximum-efficiency evidence',()=>{
  assert.equal(candidates.length,3);
  for(const candidate of candidates){
    const audit=D.auditMotorCandidate(candidate,12);
    assert.equal(audit.source.no_load_current_a,candidate.no_load_current_a);
    assert.equal(audit.source.max_efficiency_current_a,candidate.max_efficiency.current_a);
    assert.ok(audit.reciprocal_speed_fit.implied_no_load_current_a>5*candidate.no_load_current_a);
    assert.ok(audit.reciprocal_no_load_loss.zero_load_speed_error_rpm>0);
    assert.equal(audit.three_endpoint_fit.used_for_simulation,false);
    assert.ok(audit.three_endpoint_fit.passivity_witness.loss_w<0);
    close(audit.three_endpoint_fit.endpoint_residuals.no_load_current_a,0);
    close(audit.three_endpoint_fit.endpoint_residuals.no_load_speed_rad_s,0);
    close(audit.three_endpoint_fit.endpoint_residuals.stall_torque_nm,0);
  }
});

test('no-load-loss sensitivity is reciprocal and fits loss torque without hiding speed error',()=>{
  for(const candidate of candidates){
    const motor=D.motorModel(candidate,12,'reciprocal-no-load-loss');
    assert.equal(motor.model_variant,'reciprocal-no-load-loss');
    close(motor.k_nm_a,motor.k_v_s_rad);
    close(motor.viscous_loss_nm_s_rad*motor.no_load_omega_rad_s,motor.k_nm_a*candidate.no_load_current_a);
    close(motor.loss_fit_reference_current_a,candidate.no_load_current_a);
    assert.ok(Math.abs(motor.zero_load_steady_omega_rad_s-motor.no_load_omega_rad_s)>1);
  }
});

test('loss assumptions materially change stopping distances and remain labeled sensitivity cases',()=>{
  const candidate=candidates.find(c=>c.sku==='4754');
  const speed=D.motorModel(candidate,12,'reciprocal-speed-fit');
  const noLoad=D.motorModel(candidate,12,'reciprocal-no-load-loss');
  const a=D.simulate(config,speed,'straight','coast'),b=D.simulate(config,noLoad,'straight','coast');
  assert.ok(b.metrics.stop_distance_m>2*a.metrics.stop_distance_m);
  assert.notEqual(a.model_variant,b.model_variant);
});

test('zero-force zero-loss coast conserves motion and energy',()=>{
  const c=structuredClone(config);
  c.vehicle.rolling_resistance_coefficient=0;c.vehicle.caster_scrub_nm=0;
  c.scenarios=c.scenarios.map(s=>({...s,friction:[0,0]}));
  const motor={...D.motorModel(candidates[1]),viscous_loss_nm_s_rad:0};
  const r=D.simulate(c,motor,'straight','coast');
  close(r.samples.at(-1).speed_m_s,c.scenarios[0].initial_speed_m_s);
  close(r.metrics.final_kinetic_j,r.metrics.initial_kinetic_j);
  close(r.metrics.slip_j,0);close(r.metrics.final_energy_balance_residual_j,0);
});

test('report compares two assumptions over 168 cases and exports 56 selected-motor trajectories',()=>{
  const built=Build.buildArtifacts();
  assert.equal(built.report.case_count,168);
  assert.equal(built.report.model_variant_count,2);
  assert.equal(built.report.motor_source_audit.length,3);
  assert.equal(built.report.sensitivity_status,'assumption-cases-not-confidence-bounds-or-hardware-validation');
  assert.equal(built.runs.filter(r=>r.motor_sku==='4754').length,56);
  for(const candidate of candidates)for(const scenario of config.scenarios)for(const mode of config.modes){
    const cases=built.report.cases.filter(r=>r.motor_sku===candidate.sku&&r.scenario_id===scenario.id&&r.mode===mode);
    assert.equal(cases.length,2);
    assert.deepEqual(new Set(cases.map(r=>r.model_variant)),new Set(config.model_variants));
  }
});
