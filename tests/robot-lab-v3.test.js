'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Core = require('../robot-lab-v3/core');
const {buildData} = require('../tools/build-robot-lab-v3');
const root = path.resolve(__dirname, '..');
const data = buildData();

test('assembly is deterministic, scrub-able and seats every conceptual part', () => {
  const model = data.model, total = Core.assemblyFrame(model,0).total;
  assert.equal(model.stages.length,8); assert.equal(model.parts.length,30); assert.equal(total,32);
  assert.equal(Core.assemblyFrame(model,0).assembledCount,0);
  const mid = Core.assemblyFrame(model,14.2);
  assert.ok(mid.assembledCount > 0 && mid.assembledCount < model.parts.length);
  assert.deepEqual(Core.assemblyFrame(model,14.2),mid);
  const end = Core.assemblyFrame(model,999);
  assert.equal(end.time,total); assert.equal(end.assembledCount,30);
  for (const p of end.parts) assert.deepEqual(p.position,p.pos);
  assert.equal(Core.assemblyFrame(model,-5).time,0);
  assert.throws(() => Core.assemblyFrame(model,NaN),/finite/);
});

test('concept parts remain below the starting-height ceiling without claiming envelope compliance', () => {
  for (const p of data.model.parts) {
    const height = p.kind === 'cylinder' ? p.size[2] : p.kind === 'box' ? p.size[2] : p.size[2] * 0.5136;
    assert.ok(p.pos[2] - height/2 >= -0.01,`${p.id} below board`);
    assert.ok(p.pos[2] + height/2 < 12,`${p.id} above conceptual ceiling`);
  }
});

test('stored routes compile to drive-compatible commands with an exact dock event', () => {
  for (const [id,count] of [['south',23],['north',31]]) {
    const route = data.routes[id], compiled = Core.compileRoute(route);
    assert.equal(compiled.commands.length,count);
    assert.ok(compiled.commands.every(c => ['translate','spin'].includes(c.kind)));
    assert.equal(compiled.commands[compiled.dockCommandIndex].toWaypoint,route.docking_waypoint_index);
    assert.ok(compiled.commands.every(c => c.toWaypoint > 0));
  }
  assert.throws(() => Core.compileRoute({waypoints:[[0,0,0],[1,1,0]],docking_waypoint_index:1}),/non-drive-compatible/);
});

test('south route completes with collision-free live integration and ordered task events', () => {
  const sim = Core.createSimulation(data,'south'); sim.step(120);
  assert.equal(sim.state.status,'completed'); assert.equal(sim.state.collision,null);
  assert.equal(sim.state.tire,'blue'); assert.equal(sim.state.commandIndex,sim.commands.length);
  assert.ok(Math.abs(sim.state.time-54.0666667) < 0.001);
  assert.deepEqual(sim.state.events.map(e => e.type),['reset','exchange','complete']);
  assert.ok(sim.state.events[1].message.includes('legality is unresolved'));
});

test('experimental north route completes without being promoted to legal', () => {
  const sim = Core.createSimulation(data,'north'); sim.step(120);
  assert.equal(sim.state.status,'completed'); assert.equal(sim.state.collision,null);
  assert.equal(sim.state.tire,'blue'); assert.ok(Math.abs(sim.state.time-81.65) < 0.001);
  assert.equal(sim.route.status,'stored-empty-control-route-not-a-legal-or-complete-mission');
});

test('reset and deterministic re-simulation reproduce the same physical state', () => {
  const a = Core.createSimulation(data,'south'); a.step(20);
  const b = Core.createSimulation(data,'south'); b.step(7); b.reset(); b.step(20);
  for (const key of ['x','y','theta','time','distance','commandIndex','tire']) assert.deepEqual(b.state[key],a.state[key],key);
  b.reset(); assert.equal(b.state.time,0); assert.equal(b.state.tire,'red'); assert.equal(b.state.commandIndex,0);
});

test('full-footprint collisions reject wall and divider poses', () => {
  assert.equal(Core.collisionAt(data,20.378,38.918,0),null);
  assert.equal(Core.collisionAt(data,1,24,0),'outer-wall');
  assert.equal(Core.collisionAt(data,95,24,0),'outer-wall');
  assert.equal(Core.collisionAt(data,61.87,24.073,0),'center_divider_axis');
  assert.equal(Core.collisionAt(data,28.32,24.073,0),'pit_divider_axis');
});

test('simulation rejects invalid routes and non-finite or excessive time steps', () => {
  const sim = Core.createSimulation(data,'south');
  assert.throws(() => Core.createSimulation(data,'invented'),/unknown route/);
  assert.throws(() => sim.step(NaN),/finite/); assert.throws(() => sim.step(-1),/between/); assert.throws(() => sim.step(121),/between/);
});

test('standalone lab is offline and contains all application layers', () => {
  const html = fs.readFileSync(path.join(root,'share/Robot-Lab-v3.html'),'utf8');
  assert.ok(html.includes('ROBOT_LAB_DATA')); assert.ok(html.includes('RobotLabCore')); assert.ok(html.includes('createRenderer'));
  assert.ok(!/<script[^>]+src=/i.test(html)); assert.ok(!/<link[^>]+href=/i.test(html)); assert.ok(!/https?:\/\//i.test(html));
  assert.ok(html.includes('Not fabrication CAD')); assert.ok(html.includes('deterministically re-simulates'));
});
