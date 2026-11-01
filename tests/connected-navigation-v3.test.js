'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createPlanner}=require('../tools/avoidance-v3');
const {auditProgress}=require('../tools/route-progress-v3');
const {validate,passageCoordinates,unionPolicy,planConnected,candidateAudit}=require('../tools/connected-navigation-v3');
const {build}=require('../tools/constrained-field-v3'),{makeField}=require('../tools/navigation-v3'),{routesFor}=require('../tools/differential-drive-v3');
const fs=require('node:fs'),path=require('node:path'),read=f=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'..',f),'utf8'));
const robot={length_in:1,width_in:1},sampling={translation_step_in:.25,rotation_step_deg:2},cfg={grid_step_in:1,grid_origin_in:[0,0],clearance_margin_in:.05,wheel_track_in:.8,max_expansions:2000};
test('board grid origin is independent of wall inset and extra coordinates remain exact',()=>{
  const anchors=[[2,2,0],[8,2,0]],axes=[];
  for(const inset of [0,.75,1])axes.push(createPlanner(robot,{bounds:[inset,inset,12-inset,12-inset],solids:[]},sampling,{...cfg,extra_coordinates_in:[[],[5.375]]},anchors).gridAxes());
  for(const axis of axes){assert.ok(axis[1].includes(5.375));assert.deepEqual(axis[0].filter(x=>x>=2&&x<=8),[2,3,4,5,6,7,8]);}
  assert.throws(()=>createPlanner(robot,{bounds:[0,0,12,12],solids:[]},sampling,{...cfg,grid_origin_in:[NaN,0]},anchors),/origin/);
});
test('geometry supplements derive positive gap midpoints, not fixed magic coordinates',()=>{
  const field={bounds:[0,0,12,12],solids:[{id:'a',vertices_in:[[3,4],[9,4],[9,5],[3,5]]},{id:'b',vertices_in:[[3,7],[9,7],[9,8],[3,8]]}]};
  const r=passageCoordinates(field,robot,.05),gap=r.records.find(r=>r.axis===1&&r.between.join(',')==='a,b');assert.equal(gap.coordinate_in,6);assert.deepEqual(gap.open_interval_in,[5.55,6.45]);
});
test('nonconvex corridor union checks intermediate center, not just endpoints',()=>{
  const p=unionPolicy([[0,0,2,2],[4,0,6,2]],sampling);assert.ok(p.pose([1,1,0]));assert.ok(p.pose([5,1,0]));assert.equal(p.edge([1,1,0],[5,1,0]),false);
  assert.ok(unionPolicy([[0,0,3,2],[2,0,6,2]],sampling).edge([1,1,0],[5,1,0]));
});
test('selectable pit construction preserves start, dock and final pose with independent checks',()=>{
  const source=read('constrained-field-v3.json'),model=build(source,read(source.trace_file)),nav=read('navigation-v3.json'),drive=read('differential-drive-v3.json'),c=read('route-contract-v3.json'),config=read('connected-navigation-v3.json');
  const original=routesFor(model,drive)[0],field=makeField(model,nav,nav.wall_scenarios[0]),before=JSON.stringify([original,field,nav]);
  const planner={...read('avoidance-v3.json'),grid_step_in:1,grid_origin_in:[0,0],extra_coordinates_in:passageCoordinates(field,nav.robot,.05).coordinates};
  const result=planConnected(original,field,nav,planner,c,'selectable-original-regions','constrained-nominal',config);
  assert.equal(result.status,'found');assert.deepEqual(result.route.waypoints[0],original.waypoints[0]);assert.deepEqual(result.route.waypoints[result.route.docking_waypoint_index],original.waypoints[original.docking_waypoint_index].map((n,i)=>i===2?((n%360)+360)%360:n));assert.deepEqual(result.route.waypoints.at(-1),original.waypoints.at(-1));
  assert.ok(result.contract.pit.valid);assert.equal(candidateAudit(result,original,field,nav,c,config,'selectable-original-regions').failures.length,0);assert.equal(JSON.stringify([original,field,nav]),before);
});
test('malformed connected experiments are refused',()=>{
  const c=read('connected-navigation-v3.json');validate(c);assert.throws(()=>validate({...c,grid_origins_in:[[0,NaN]]}),/origins/);assert.throws(()=>validate({...c,policies:['unknown']}),/policies/);
});
test('failed reentry cannot promote a successful arrival and withdrawal to a complete route',()=>{
  const source=read('constrained-field-v3.json'),model=build(source,read(source.trace_file)),nav=read('navigation-v3.json'),drive=read('differential-drive-v3.json'),c=read('route-contract-v3.json'),config=read('connected-navigation-v3.json'),original=routesFor(model,drive)[0],field=makeField(model,nav,nav.wall_scenarios[0]);
  // A deliberately out-of-corridor required final pose; dock remains unchanged.
  original.waypoints[original.waypoints.length-1]=[50,9,0];
  const r=planConnected(original,field,nav,{...read('avoidance-v3.json'),grid_step_in:1,grid_origin_in:[0,0]},c,'selectable-original-regions','constrained-nominal',config);
  assert.notEqual(r.status,'found');assert.equal(r.route,null);assert.equal(r.failed_segment,'race-reentry');assert.ok(r.legs.some(l=>l.segment==='pit-withdrawal'&&l.status==='found'));
});
test('co-located race partitions accept ordered upper then lower crossings',()=>{
  const gates=require('../route-contract-v3.json').gates;
  assert.ok(auditProgress([[36,36,0],[87,36,0],[87,12,270],[36,12,180]],gates).valid);
  assert.equal(auditProgress([[36,12,0],[87,12,0],[87,36,90],[36,36,180]],gates).valid,false);
});
test('candidate metrics preserve untested outcomes and do not infer elapsed time',()=>{
  const {metrics,summary}=require('../tools/connected-candidate-summary-v3');
  const rows=metrics({results:[{obstacle_case:'fixture',wall:'wall',mode:'nominal',policy:'original-fixed',plans:[{original_route:'dock',status:'grid-exhausted',route:null,evaluation:null}]}]});
  assert.equal(rows.length,1);assert.equal(rows[0].sampled_failures,null);assert.equal(rows[0].absolute_wheel_travel_in,null);assert.ok(!('elapsed_time_s' in rows[0]));assert.match(summary(rows),/untested/);
});