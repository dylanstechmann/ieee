#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),Build=require('./build-stopping-dynamics-v6'),D=require('./stopping-dynamics-v6'),Refine=require('./refine-stopping-dynamics-v6');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8')),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex'),manifest=read('derived/stopping-dynamics-v6/manifest.json');
for(const group of['input_hashes','output_hashes','preserved_hashes'])for(const[f,h]of Object.entries(manifest[group]))assert.equal(hash(f),h,`${group}: ${f}`);
const built=Build.buildArtifacts();for(const[n,t]of Object.entries(built.files))assert.equal(fs.readFileSync(path.join(root,'derived/stopping-dynamics-v6',n),'utf8'),t,n);
assert.equal(built.report.case_count,168);assert.equal(built.runs.length,168);assert.equal(built.report.model_variant_count,2);
for(const audit of built.report.motor_source_audit){assert.ok(audit.reciprocal_speed_fit.implied_no_load_current_a>5*audit.source.no_load_current_a);assert.ok(audit.reciprocal_no_load_loss.zero_load_speed_error_rpm>0);assert.equal(audit.three_endpoint_fit.used_for_simulation,false);assert.ok(audit.three_endpoint_fit.passivity_witness.loss_w<0);}
for(const r of built.runs){
  assert.ok(r.samples.every(s=>Number.isFinite(s.speed_m_s)&&Number.isFinite(s.distance_m)));
  assert.ok(r.metrics.maximum_abs_energy_balance_residual_j<.01);assert.ok(r.metrics.slip_j>=-1e-8);
  for(const key of['source_resistor_j','copper_j','equivalent_viscous_j','rolling_scrub_j','slip_j'])assert.ok(r.metrics[key]>=-1e-10,`${key} ${r.scenario_id} ${r.mode}`);
  if(r.mode==='coast'){assert.equal(r.metrics.source_drawn_j,0);assert.equal(r.metrics.returned_boundary_j,0);}
  if(r.metrics.stop_time_s===null)assert.equal(r.metrics.stop_confirmed_at_s,null);
  else{assert.ok(r.metrics.stop_confirmed_at_s-r.metrics.stop_time_s>=built.config.stop.dwell_s-1e-10);assert.ok(r.metrics.stop_confirmed_at_s-r.metrics.stop_time_s<built.config.stop.dwell_s+2*built.config.numerics.dt_s);assert.ok(r.metrics.stop_distance_m>=0&&r.metrics.stop_distance_m<=r.metrics.path_distance_m);}
  if(r.mode==='driven'&&r.scenario_id!=='drive-loss')assert.equal(r.metrics.stop_time_s,null);
}
const refinement=read('derived/stopping-dynamics-v6/refinement-study.json');for(const[f,h]of Object.entries(refinement.input_hashes))assert.equal(hash(f),h,`stale refinement ${f}`);
assert.equal(refinement.cases.length,built.runs.length);assert.equal(refinement.coarse_dt_s,built.config.numerics.dt_s);assert.equal(refinement.fine_dt_s,built.config.numerics.dt_s/2);assert.equal(refinement.unchanged_control_dt_s,built.config.numerics.control_dt_s);
const fineConfig=structuredClone(built.config);fineConfig.numerics.dt_s/=2;
const seen=new Set();
for(const coarse of built.runs){
  const key=[coarse.motor_sku,coarse.model_variant,coarse.scenario_id,coarse.mode].join('|'),record=refinement.cases.find(x=>[x.motor_sku,x.model_variant,x.scenario_id,x.mode].join('|')===key);
  assert.ok(record,`missing refinement ${key}`);assert.ok(!seen.has(key),`duplicate refinement ${key}`);seen.add(key);
  const motor=built.motors.find(m=>m.sku===coarse.motor_sku&&m.model_variant===coarse.model_variant),fine=D.simulate(fineConfig,motor,coarse.scenario_id,coarse.mode);
  assert.equal(record.coarse_residual_j,coarse.metrics.maximum_abs_energy_balance_residual_j,key);
  assert.equal(record.fine_residual_j,fine.metrics.maximum_abs_energy_balance_residual_j,key);
  assert.equal(record.stop_status_unchanged,coarse.metrics.stop_status===fine.metrics.stop_status,key);
  assert.equal(record.stop_time_delta_s,Refine.nullableDelta(coarse.metrics.stop_time_s,fine.metrics.stop_time_s),key);
  assert.equal(record.stop_distance_delta_m,Refine.nullableDelta(coarse.metrics.stop_distance_m,fine.metrics.stop_distance_m),key);
  assert.equal(record.maximum_current_delta_a,Math.abs(coarse.metrics.maximum_abs_current_a-fine.metrics.maximum_abs_current_a),key);
  assert.equal(record.final_speed_delta_m_s,Math.abs(coarse.metrics.final_speed_m_s-fine.metrics.final_speed_m_s),key);
}
const summary={case_count:refinement.cases.length,all_residuals_reduced:refinement.cases.every(x=>x.fine_residual_j<x.coarse_residual_j),all_stop_statuses_unchanged:refinement.cases.every(x=>x.stop_status_unchanged),maximum_stop_time_delta_s:Math.max(...refinement.cases.map(x=>x.stop_time_delta_s??0)),maximum_stop_distance_delta_m:Math.max(...refinement.cases.map(x=>x.stop_distance_delta_m??0)),maximum_current_delta_a:Math.max(...refinement.cases.map(x=>x.maximum_current_delta_a))};
assert.deepEqual(refinement.summary,summary);assert.equal(summary.all_residuals_reduced,true);assert.equal(summary.all_stop_statuses_unchanged,true);assert.ok(summary.maximum_stop_distance_delta_m<.0001);
console.log(JSON.stringify({status:'passed',cases:built.runs.length,model_variants:built.report.model_variant_count,independently_recomputed_refinement_cases:seen.size,physical_trials:0,purchases:0,maximum_energy_residual_j:Math.max(...built.runs.map(r=>r.metrics.maximum_abs_energy_balance_residual_j)),refinement_summary:summary},null,2));