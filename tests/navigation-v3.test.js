'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {build}=require('../tools/constrained-field-v3');
const {footprint,intersects,distance,overlapFraction,samples,makeField,checkPose,checkRoute,runStudy,svg}=require('../tools/navigation-v3');
const root=path.resolve(__dirname,'..');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const source=read('constrained-field-v3.json'),model=build(source,read(source.trace_file));
const robot={length_in:10,width_in:10}, sampling={translation_step_in:0.25,rotation_step_deg:2};
const square=(x,y,size)=>[[x,y],[x+size,y],[x+size,y+size],[x,y+size]];
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('rotated footprint checks all corners and validates dimensions',()=>{
  const f=footprint([10,20,90],{length_in:12,width_in:8});close(Math.min(...f.map(p=>p[0])),6);close(Math.max(...f.map(p=>p[1])),26);
  const field={bounds:[0,0,20,20],solids:[]};
  assert.equal(checkPose([6,6,0],robot,field).hits.length,0);
  assert.deepEqual(checkPose([6,6,45],robot,field).hits,['board_or_wall']);
  assert.throws(()=>footprint([0,0,0],{length_in:-1,width_in:10}),/positive/);
  assert.throws(()=>footprint([NaN,0,0],robot),/pose/);
});
test('SAT distinguishes separated, touching, crossing and contained solids',()=>{
  const a=square(0,0,10);
  assert.equal(intersects(a,square(11,0,2)),false);close(distance(a,square(11,0,2)),1);
  assert.equal(intersects(a,square(10,2,2)),true);
  assert.equal(intersects(a,square(2,2,2)),true);
  assert.equal(intersects(footprint([0,0,45],robot),square(6,0,2)),true);
  close(distance(a,square(13,14,1)),5);
});
test('polygon clipping gives plan-area overlap including strict 75 percent',()=>{
  const a=square(0,0,10);
  close(overlapFraction(a,square(0,0,12)),1);close(overlapFraction(a,square(20,0,12)),0);
  close(overlapFraction(a,square(2.5,0,10)),0.75);
  close(overlapFraction(footprint([0,0,45],robot),square(-20,-20,40)),1);
  const r=checkRoute({waypoints:[[5,5,0],[5,5,0]]},robot,{bounds:[-20,-20,40,40],solids:[]},sampling,[0,0,0],square(2.5,0,10));
  assert.equal(r.docking_over_75_percent,false);
});
test('path interpolation wraps headings and catches intermediate translation and rotation collisions',()=>{
  const p=samples([[0,0,350],[0,0,10]],sampling);close(p[p.length-1][2],370);assert.equal(p.length,11);
  const field={bounds:[-30,-30,30,30],solids:[{id:'thin',vertices_in:square(-0.1,-0.1,0.2)}]};
  const small={length_in:1,width_in:1};
  const result=checkRoute({waypoints:[[-10,0,0],[10,0,0]]},small,field,sampling);
  assert.equal(result.collision_free,false);assert.ok(result.first_collision.sample>0);
  const rotate=checkRoute({waypoints:[[6,6,0],[6,6,90]]},robot,{bounds:[0,0,20,20],solids:[]},sampling);
  assert.equal(rotate.collision_free,false);
  assert.throws(()=>samples([[0,0,0],[1,1,1]],{translation_step_in:0,rotation_step_deg:1}),/positive/);
  assert.throws(()=>samples([[0,0,0]],sampling),/two waypoints/);
});
test('field wall scenarios and source divider poses propagate without mutation',()=>{
  const config=read('navigation-v3.json'),before=JSON.stringify(model);
  const inside=makeField(model,config,config.wall_scenarios[0]),outside=makeField(model,config,config.wall_scenarios[2]);
  assert.deepEqual(inside.bounds,[1,1,95,47]);assert.deepEqual(outside.bounds,[0,0,96,48]);
  const divider=inside.solids.find(s=>s.id==='center_divider_axis');close(divider.vertices_in[1][0]-divider.vertices_in[0][0],36);
  close(divider.vertices_in[0][1],23.573);
  assert.equal(checkPose([60,24,0],robot,inside).hits.includes('center_divider_axis'),true);
  assert.equal(JSON.stringify(model),before);
});
test('configurable obstacle polygons are collision solids; invalid polygons rejected',()=>{
  const c=read('navigation-v3.json');c.obstacles=[{id:'test-obstacle',vertices_in:square(35,8,2)}];
  assert.ok(checkPose([38,9,0],robot,makeField(model,c,c.wall_scenarios[0])).hits.includes('test-obstacle'));
  c.obstacles[0].vertices_in.reverse();assert.throws(()=>makeField(model,c,c.wall_scenarios[0]),/counterclockwise/);
  c.obstacles[0].vertices_in=[[0,0],[3,0],[1,1],[3,3],[0,3]];assert.throws(()=>makeField(model,c,c.wall_scenarios[0]),/convex/);
});
test('study reports nominal collisions, uncertainty cases and honest SVG scope',()=>{
  const c=read('navigation-v3.json'),before=JSON.stringify(c),report=runStudy(model,c);
  assert.equal(report.scenarios.length,27);assert.equal(JSON.stringify(c),before);
  const exit=report.scenarios.find(r=>r.wall==='inside-nominal'&&r.route==='start-exit');
  assert.equal(exit.nominal.collision_free,true);assert.equal(exit.sweep.cases,35);
  assert.ok(report.scenarios.filter(r=>r.route==='divider-loop').every(r=>r.sweep.failures>0));
  assert.ok(report.scenarios.filter(r=>r.route==='divider-loop-wider-return').every(r=>r.sweep.failures===0));
  const docking=report.scenarios.find(r=>r.wall==='inside-nominal'&&r.route==='dock-pit_box_2');
  assert.equal(docking.nominal.collision_free,true);close(docking.nominal.docking_overlap_fraction,1);assert.equal(docking.sweep.cases,39);
  assert.match(report.policy.guarantee,/not continuous/);assert.match(svg(report,model),/NOT hardware validation/);
  c.uncertainty.heading_error_deg=-1;assert.throws(()=>runStudy(model,c),/nonnegative/);
});