'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {build}=require('../tools/constrained-field-v3');
const {checkRoute,makeField}=require('../tools/navigation-v3');
const {primitives,routesFor,study}=require('../tools/differential-drive-v3');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const source=read('constrained-field-v3.json'),model=build(source,read(source.trace_file));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('differential primitives reject sideways and mixed motion',()=>{
  assert.throws(()=>primitives([[0,0,0],[0,1,0]],8),/lateral/);
  assert.throws(()=>primitives([[0,0,0],[1,0,90]],8),/simultaneous/);
  assert.throws(()=>primitives([[0,0,0],[1,0,0]],0),/wheel track/);
  assert.throws(()=>primitives([[0,0,0],[Infinity,0,0]],8),/pose/);
});
test('signed wheel distances reproduce forward, reverse, spin and wrap',()=>{
  const result=primitives([[0,0,0],[10,0,0],[5,0,0],[5,0,90],[5,2,90]],8);
  assert.deepEqual(result.segments.map(s=>s.kind),['forward','reverse','spin','forward']);
  close(result.segments[1].left_wheel_travel_in,-5);
  close(result.segments[2].left_wheel_travel_in,-2*Math.PI);close(result.segments[2].right_wheel_travel_in,2*Math.PI);
  close(result.translation_in,17);close(result.absolute_rotation_deg,90);
  close(primitives([[0,0,350],[0,0,10]],8).segments[0].rotation_deg,20);
});
test('docking checkpoint is evaluated before withdrawal, not at route end',()=>{
  const navigation=read('navigation-v3.json'),drive=read('differential-drive-v3.json');
  const route=routesFor(model,drive)[1],field=makeField(model,navigation,navigation.wall_scenarios[0]);
  const target=model.features.find(f=>f.id===route.target_id).vertices_in;
  const r=checkRoute(route,navigation.robot,field,navigation.sampling,[0,0,0],target);
  close(r.docking_overlap_fraction,1);
  const end=checkRoute({...route,docking_waypoint_index:undefined},navigation.robot,field,navigation.sampling,[0,0,0],target);
  close(end.docking_overlap_fraction,0);
  assert.throws(()=>checkRoute({...route,docking_waypoint_index:999},navigation.robot,field,navigation.sampling,[0,0,0],target),/docking waypoint/);
});
test('connected routes have valid primitives, a reverse withdrawal and identical race endpoint',()=>{
  const config=read('differential-drive-v3.json'),before=JSON.stringify(model);
  const routes=routesFor(model,config);assert.equal(routes.length,3);
  for (const route of routes) {
    const k=primitives(route.waypoints,config.wheel_track_in);
    assert.ok(k.segments.some(s=>s.kind==='reverse'));
    assert.equal(k.segments[route.docking_waypoint_index].kind,'reverse');
    assert.deepEqual(route.waypoints.at(-1),[36,36,0]);
  }
  assert.equal(JSON.stringify(model),before);
  assert.throws(()=>routesFor(model,{...config,upper_lane_y_in:1}),/ordered/);
});
test('differential study retains uncertainty and removes obsolete lateral-motion assumption',()=>{
  const nav=read('navigation-v3.json'),drive=read('differential-drive-v3.json'),before=JSON.stringify(nav);
  const r=study(model,nav,drive);assert.equal(r.scenarios.length,9);
  assert.equal(JSON.stringify(nav),before);
  assert.ok(r.assumptions.every(n=>!n.includes('Waypoint interpolation permits sideways')));
  assert.ok(r.scenarios.every(s=>s.sweep.cases===39));
  assert.ok(r.scenarios.every(s=>s.nominal.collision_free&&s.sweep.failures===0));
  assert.ok(r.scenarios.every(s=>s.sweep.min_sampled_clearance_in>0.25));
  assert.ok(r.scenarios.every(s=>s.nominal.docking_overlap_fraction>0.99));
  assert.match(r.policy.kinematics,/No dynamic/);
});
test('wheel commands reconstruct each endpoint with ideal centered-axle kinematics',()=>{
  const drive=read('differential-drive-v3.json');
  for (const route of routesFor(model,drive)) for (const segment of route.kinematics.segments) {
    const a=route.waypoints[segment.from_waypoint],b=route.waypoints[segment.to_waypoint];
    const distance=(segment.left_wheel_travel_in+segment.right_wheel_travel_in)/2;
    const angle=(segment.right_wheel_travel_in-segment.left_wheel_travel_in)/drive.wheel_track_in;
    close(a[0]+distance*Math.cos(a[2]*Math.PI/180),b[0]);
    close(a[1]+distance*Math.sin(a[2]*Math.PI/180),b[1]);
    close(Math.sin(a[2]*Math.PI/180+angle),Math.sin(b[2]*Math.PI/180));
    close(Math.cos(a[2]*Math.PI/180+angle),Math.cos(b[2]*Math.PI/180));
  }
});