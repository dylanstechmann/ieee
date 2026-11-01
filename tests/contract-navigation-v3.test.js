'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {createPlanner}=require('../tools/avoidance-v3');
const {intervalBounds}=require('../tools/navigation-stress-v3');
const {checkRoute}=require('../tools/navigation-v3');
const {validateContract,regionPolicy,gateTrace,variants,uncertaintyPolicy,evaluate,planCandidate,checkContract}=require('../tools/contract-navigation-v3');
const {build}=require('../tools/constrained-field-v3');
const {routesFor}=require('../tools/differential-drive-v3');
const read=f=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'..',f),'utf8'));
const sampling={translation_step_in:0.25,rotation_step_deg:2},robot={length_in:1,width_in:1};
const config={grid_step_in:1,clearance_margin_in:0.01,max_expansions:2000,wheel_track_in:0.8};
const gates=[{id:'a',axis:0,value:4,span:[0,10],direction:1},{id:'b',axis:0,value:8,span:[0,10],direction:1}];
test('directional gate order rejects reverse crossings, oscillation and missing gates',()=>{
  assert.equal(gateTrace([[2,5,0],[6,5,0],[10,5,0]],gates).valid,true);
  assert.equal(gateTrace([[10,5,180],[2,5,180]],gates).valid,false);
  assert.equal(gateTrace([[2,5,0],[6,5,0],[2,5,180],[10,5,0]],gates).valid,false);
  assert.equal(gateTrace([[2,5,0],[2,5,90]],gates).valid,false);
  assert.equal(gateTrace([[2,5,0],[4,5,0],[4,5,90],[6,5,0],[10,5,0]],gates).valid,true);
  assert.equal(gateTrace([[2,5,0],[4,5,0],[2,5,180]],gates).events.length,0);
  assert.equal(gateTrace([[2,5,180],[10,5,180]],gates).valid,true); // spatial progress while reversing
  assert.equal(gateTrace([[2,5,0],[4,5,0],[4,12,90],[6,12,0]],gates).events.length,0); // leave outside gate span
});
test('phase-specific planner rejects a wrong-side shortcut without cache leakage',()=>{
  const field={bounds:[0,0,12,12],solids:[{id:'block',vertices_in:[[5,4],[7,4],[7,9],[5,9]]}]};
  const anchors=[[2,6,0],[10,6,0]],region=regionPolicy([0,5,12,12]);
  const unrestricted=createPlanner(robot,field,sampling,config,anchors).search(...anchors);
  const constrained=createPlanner(robot,field,sampling,config,anchors,region).search(...anchors);
  assert.equal(unrestricted.status,'found');assert.equal(constrained.status,'found');
  assert.ok(constrained.waypoints.every(p=>region.pose(p)));
  assert.ok(constrained.waypoints.some(p=>p[1]>9));
  const impossible=createPlanner(robot,field,sampling,config,anchors,regionPolicy([0,5,12,8])).search(...anchors);
  assert.equal(impossible.status,'grid-exhausted');
  assert.equal(region.edge([2,6,0],[10,4,0]),false);
});
test('uncertainty mode rejects nominally clear shifted-obstacle edges',()=>{
  const field={bounds:[0,0,12,12],solids:[{id:'probe',vertices_in:[[5,4],[6,4],[6,5],[5,5]]}]};
  const a=[2,6,0],b=[9,6,0],u={position_error_in:0,heading_error_deg:0,element_shift_in:1};
  assert.ok(intervalBounds({waypoints:[a,b]},robot,field,sampling).positive_bound_for_all_intervals);
  const p=uncertaintyPolicy(robot,field,sampling,u,0.01);assert.equal(p.edge(a,b),false);
  const r=createPlanner(robot,field,sampling,config,[a,b],p).search(a,b);
  assert.equal(r.status,'found');assert.ok(r.waypoints.some(q=>q[1]!==6));
  for(const v of variants(field,u))assert.ok(intervalBounds({waypoints:r.waypoints.map(p=>p.map((n,i)=>n+v.error[i]))},robot,v.field,sampling).positive_bound_for_all_intervals);
});
test('complete evaluation records every failure and retains interval-only unresolved cases',()=>{
  const field={bounds:[-5,-5,5,5],solids:[{id:'thin',vertices_in:[[0.09,-1],[0.11,-1],[0.11,1],[0.09,1]]}]};
  const route={waypoints:[[0,0,0],[0.25,0,0]]},small={length_in:0.02,width_in:0.02};
  const nav={robot:small,sampling,uncertainty:{position_error_in:0,heading_error_deg:0,element_shift_in:0}};
  const e=evaluate(route,field,nav,null);
  assert.equal(e.sampled_failures,0);assert.ok(e.interval_unresolved_count>0);
  const collision=evaluate({...route,waypoints:[[0.1,0,0],[0.1,0,90]]},field,nav,null);
  assert.equal(collision.failures.length,collision.cases);assert.ok(collision.failures.every(f=>f.categories.includes('obstacle')));
  assert.equal(checkRoute(route,small,field,sampling).collision_free,true);
});
test('contract validates configuration and original field circuit, docking remains fixed',()=>{
  const c=read('route-contract-v3.json');validateContract(c);
  assert.throws(()=>validateContract({...c,leg_phases:['missing']}),/25 leg/);
  assert.throws(()=>validateContract({...c,pit_staging_x_candidates_in:[18,18]}),/unique/);
  const source=read('constrained-field-v3.json'),model=build(source,read(source.trace_file)),drive=read('differential-drive-v3.json');
  const original=routesFor(model,drive)[0];
  const route={...original,anchor_waypoint_indices:original.waypoints.map((_,i)=>i)};
  assert.equal(checkContract(route,original,c).valid,true);
  assert.equal(checkContract({...route,docking_waypoint_index:1},original,c).valid,false);
  const altered=structuredClone(route);altered.waypoints[5][1]=12;
  assert.equal(checkContract(altered,original,c).valid,false);
});
test('constrained baseline planning preserves ordered anchors, inputs and valid gates',()=>{
  const source=read('constrained-field-v3.json'),model=build(source,read(source.trace_file));
  const nav=read('navigation-v3.json'),drive=read('differential-drive-v3.json'),c=read('route-contract-v3.json');
  const {makeField}=require('../tools/navigation-v3'),field=makeField(model,nav,nav.wall_scenarios[0]),original=routesFor(model,drive)[0];
  const before=JSON.stringify([original,field,nav,c]);
  const r=planCandidate(original,field,nav,read('avoidance-v3.json'),c,'constrained-nominal');
  assert.equal(r.status,'found');assert.equal(r.contract.valid,true);
  assert.equal(r.route.waypoints[r.route.docking_waypoint_index][0],original.waypoints[original.docking_waypoint_index][0]);
  assert.equal(JSON.stringify([original,field,nav,c]),before);
});