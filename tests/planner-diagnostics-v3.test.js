'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createPlanner}=require('../tools/avoidance-v3');
const {diagnosticPolicy,diagnosticSvg,validateDiagnostics}=require('../tools/planner-diagnostics-v3');
const {checkContract,uncertaintyPolicy,variants}=require('../tools/contract-navigation-v3');
const {intervalBounds}=require('../tools/navigation-stress-v3');
const {createProgress,auditProgress}=require('../tools/route-progress-v3');
const robot={length_in:1,width_in:1},sampling={translation_step_in:.25,rotation_step_deg:2};
const cfg={grid_step_in:1,clearance_margin_in:.05,wheel_track_in:.8,max_expansions:2000,diagnostics:true};
test('diagnostics retain bounded rejection evidence without changing route selection',()=>{
  const field={bounds:[0,0,12,12],solids:[{id:'block',vertices_in:[[5,0],[7,0],[7,12],[5,12]]}]},anchors=[[2,6,0],[10,6,0]];
  const p=createPlanner(robot,field,sampling,cfg,anchors,diagnosticPolicy([0,4,12,8]));
  const r=p.search(...anchors);assert.equal(r.status,'grid-exhausted');assert.ok(r.diagnostics.rejections.obstacle>0);assert.ok(r.diagnostics.rejections['phase-region']>0);assert.ok(r.diagnostics.reached_states>0);assert.equal(r.diagnostics.frontier_entries,0);
  assert.ok(Object.values(r.diagnostics.examples).every(e=>e.length<=3));assert.ok(r.diagnostics.expanded_samples.length<=500);
  assert.equal(createPlanner(robot,field,sampling,{...cfg,diagnostics:false},anchors).search(...anchors).status,r.status);
  assert.deepEqual(p.search(...anchors),r);
});
test('directional custom policy edges cannot leak through a symmetric cache',()=>{
  const field={bounds:[0,0,12,12],solids:[]},a=[2,6,0],b=[10,6,0];
  const p=createPlanner(robot,field,sampling,cfg,[a,b],{edge:(a,b)=>b[0]>=a[0]});
  assert.equal(p.search(a,b).status,'found');assert.equal(p.search(b,a).status,'grid-exhausted');
});
test('uncertainty rejection identifies first limiting variant and interval',()=>{
  const field={bounds:[0,0,12,12],solids:[{id:'probe',vertices_in:[[5,4],[6,4],[6,5],[5,5]]}]};
  const u={position_error_in:0,heading_error_deg:0,element_shift_in:1},p=uncertaintyPolicy(robot,field,sampling,u,.05);
  const e=p.edgeReason([2,6,0],[9,6,0]);assert.equal(e.kind,'uncertainty-interval');assert.match(e.variant,/shift:probe/);assert.ok(e.bounds.first_unresolved_interval);
});
test('shortcut accepted edges also pass explicit perturbation interval checks',()=>{
  const field={bounds:[0,0,30,30],solids:[]},u={position_error_in:.5,heading_error_deg:3,element_shift_in:1};
  const policy=uncertaintyPolicy(robot,field,sampling,u,.05);
  for(const [a,b] of [[[5,8,0],[20,8,0]],[[10,10,0],[10,10,90]],[[5,20,180],[20,20,180]]]){
    assert.ok(policy.edge(a,b));for(const v of variants(field,u))assert.ok(intervalBounds({waypoints:[a,b].map(p=>p.map((n,i)=>n+v.error[i]))},robot,v.field,sampling).min_clearance_lower_bound_in>.05);
  }
});
test('malformed contract route templates are explicit invalid results',()=>{
  assert.equal(checkContract(null,null,{leg_phases:[]}).valid,false);
  assert.equal(checkContract({waypoints:[[NaN,0,0]]},{waypoints:[[0,0,0]]},{leg_phases:[]}).valid,false);
});
test('budget stop is separate from empty frontier and SVG has exact evidence',()=>{
  const field={bounds:[0,0,12,12],solids:[{id:'block',vertices_in:[[5,4],[7,4],[7,8],[5,8]]}]},anchors=[[2,6,0],[10,6,0]];
  const search=createPlanner(robot,field,sampling,{...cfg,max_expansions:1},anchors).search(...anchors);
  assert.equal(search.status,'budget-exhausted');assert.ok(search.diagnostics.frontier_entries>0);
  const s=diagnosticSvg({id:'fixture',field,robot,start:anchors[0],goal:anchors[1],region:[0,0,12,12],search});assert.match(s,/budget-exhausted/);assert.match(s,/polygon/);
});
test('progress state rejects finite-gate bypass, contact sliding and oscillation',()=>{
  const gates=[{axis:0,value:6,span:[4,8],direction:1}];
  assert.ok(auditProgress([[2,6,180],[10,6,180]],gates).valid);
  assert.equal(auditProgress([[2,2,0],[10,2,0]],gates).valid,false);
  assert.equal(auditProgress([[2,6,0],[6,6,0],[6,10,90],[10,10,0]],gates).valid,false);
  assert.equal(auditProgress([[2,6,0],[10,6,0],[2,6,0]],gates).valid,false);
  assert.ok(auditProgress([[2,6,0],[6,6,0],[6,6,90],[10,6,0]],gates).valid);
});
test('search includes route progress in state and independently validates result',()=>{
  const field={bounds:[0,0,12,12],solids:[]},a=[2,2,0],b=[10,2,0],gates=[{axis:0,value:6,span:[5,8],direction:1}];
  const p=createPlanner(robot,field,sampling,cfg,[a,b],{progress:createProgress(gates)}),r=p.search(a,b);
  assert.equal(r.status,'found');assert.ok(r.waypoints.some(q=>q[1]>=5));assert.equal(r.progress.next,1);assert.ok(auditProgress(r.waypoints,gates).valid);
  assert.equal(p.search(b,a).status,'grid-exhausted');
});
test('diagnostic experiment configuration rejects malformed grids, budgets and probes',()=>{
  const c=require('../route-contract-v3.json'),stress=require('../navigation-stress-v3.json'),config=require('../planner-diagnostics-v3.json');
  validateDiagnostics(config,c,stress);
  assert.throws(()=>validateDiagnostics({...config,grid_steps_in:[1,1]},c,stress),/unique/);
  assert.throws(()=>validateDiagnostics({...config,budget_retry_expansions:1},c,stress),/budgets/);
  assert.throws(()=>validateDiagnostics({...config,failed_legs:[{leg:99,obstacle_case:'missing',staging_x_in:[18]}]},c,stress),/known/);
});