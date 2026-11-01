'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createPlanner,repairRoute,runAvoidance,summary}=require('../tools/avoidance-v3');
const {primitives}=require('../tools/differential-drive-v3');
const {intervalBounds}=require('../tools/navigation-stress-v3');
const robot={length_in:1,width_in:1},sampling={translation_step_in:0.25,rotation_step_deg:2};
const config={grid_step_in:1,clearance_margin_in:0.05,max_expansions:2000,wheel_track_in:0.8};
const field={bounds:[0,0,12,12],solids:[{id:'block',vertices_in:[[5,4],[7,4],[7,8],[5,8]]}]};
test('planner detours with legal primitives and positive interval bounds',()=>{
  const a=[2,6,0],b=[10,6,0],before=JSON.stringify([field,robot,config]);
  const p=createPlanner(robot,field,sampling,config,[a,b]),r=p.search(a,b);
  assert.equal(r.status,'found');assert.ok(r.waypoints.some(q=>q[1]!==6));
  assert.deepEqual(r.waypoints[0],a);assert.deepEqual(r.waypoints.at(-1),b);
  assert.ok(primitives(r.waypoints,config.wheel_track_in).translation_in>8);
  assert.ok(intervalBounds(r,robot,field,sampling).min_clearance_lower_bound_in>config.clearance_margin_in);
  assert.equal(JSON.stringify([field,robot,config]),before);
  assert.deepEqual(p.search(a,b).waypoints,r.waypoints);
});
test('repair preserves ordered anchors and docking index after added waypoints',()=>{
  const route={id:'test',waypoints:[[2,6,0],[10,6,0],[10,8,90]],docking_waypoint_index:1};
  const planner=createPlanner(robot,field,sampling,config,route.waypoints);
  const r=repairRoute(route,planner,config.wheel_track_in);assert.equal(r.status,'found');
  assert.ok(r.route.docking_waypoint_index>1);
  assert.deepEqual(r.route.waypoints[r.route.docking_waypoint_index],[10,6,0]);
  r.route.anchor_waypoint_indices.forEach((i,j)=>assert.deepEqual(r.route.waypoints[i],route.waypoints[j]));
});
test('budget, blocked endpoint and disconnected grid return explicit failures',()=>{
  const a=[2,6,0],b=[10,6,0];
  assert.equal(createPlanner(robot,field,sampling,{...config,max_expansions:1},[a,b]).search(a,b).status,'budget-exhausted');
  const blocked=[6,6,0];assert.equal(createPlanner(robot,field,sampling,config,[a,blocked]).search(a,blocked).status,'endpoint-blocked');
  const split={bounds:[0,0,12,12],solids:[{id:'wall',vertices_in:[[5,0],[7,0],[7,12],[5,12]]}]};
  const p=createPlanner(robot,split,sampling,config,[a,b]);assert.equal(p.search(a,b).status,'grid-exhausted');
  const r=repairRoute({id:'failed',waypoints:[a,b]},p,config.wheel_track_in);assert.equal(r.route,null);assert.equal(r.failed_leg,0);
});
test('direct reverse, wrapped heading and fractional anchors remain exact',()=>{
  const a=[3.125,2.75,360],b=[1.875,2.75,0],open={bounds:[0,0,12,12],solids:[]};
  const r=createPlanner(robot,open,sampling,config,[a,b]).search(a,b);
  assert.equal(r.expanded,0);assert.deepEqual(r.waypoints,[[3.125,2.75,0],b]);
  assert.equal(primitives(r.waypoints,0.8).segments[0].kind,'reverse');
});
test('planner refuses invalid grid, noncardinal poses and unregistered endpoints',()=>{
  const a=[2,2,0],b=[3,2,0];
  assert.throws(()=>createPlanner(robot,field,sampling,{...config,grid_step_in:0},[a,b]),/positive finite/);
  assert.throws(()=>createPlanner(robot,field,sampling,config,[[2,2,45]]),/cardinal/);
  assert.throws(()=>createPlanner(robot,field,sampling,{...config,grid_step_in:0.0001},[a,b]),/budget/);
  assert.throws(()=>createPlanner(robot,field,sampling,config,[a,b]).search(a,[4,2,0]),/configured anchors/);
});
test('archived-field blocker integration retains docking, uncertainty and input provenance',()=>{
  const fs=require('node:fs'),path=require('node:path'),{build}=require('../tools/constrained-field-v3');
  const read=f=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'..',f),'utf8'));
  const source=read('constrained-field-v3.json'),model=build(source,read(source.trace_file));
  const nav=read('navigation-v3.json'),drive=read('differential-drive-v3.json'),stress=read('navigation-stress-v3.json');
  nav.wall_scenarios=nav.wall_scenarios.slice(0,1);
  const c={...read('avoidance-v3.json'),obstacle_case_ids:['upper-lane-blocker']},before=JSON.stringify([model,nav,drive,stress,c]);
  const r=runAvoidance(model,nav,drive,stress,c),row=r.results[0];
  assert.equal(row.repairs.length,3);assert.ok(row.repairs.every(p=>p.status==='found'));
  assert.ok(row.repairs.every(p=>p.legs.some(l=>l.expanded>0)));
  assert.ok(row.report.scenarios.every(s=>s.nominal.collision_free&&s.nominal.docking_over_75_percent));
  assert.ok(row.report.scenarios.every(s=>s.nominal_interval_bounds.min_clearance_lower_bound_in>c.clearance_margin_in));
  assert.ok(row.report.scenarios.every(s=>s.sweep.cases===43));
  assert.match(summary(r),/3\/3/);assert.equal(JSON.stringify([model,nav,drive,stress,c]),before);
  assert.throws(()=>runAvoidance(model,nav,drive,stress,{...c,obstacle_case_ids:['missing']}),/known safe hypothetical/);
});