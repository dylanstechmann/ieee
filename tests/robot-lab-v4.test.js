'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Core=require('../robot-lab-v4/core'),Hardware=require('../robot-lab-v4/hardware');
require('../robot-lab-v4/renderer');const Renderer=globalThis.RobotLabRenderer,{buildData}=require('../tools/build-robot-lab-v4');
const root=path.resolve(__dirname,'..'),data=buildData();
const finalFrame=()=>Core.assemblyFrame(data.model,32);
const robotOptions=(state={time:0,tire:'red'})=>({showWiring:true,Core,state});

test('detailed assembly remains deterministic and seats all 30 systems',()=>{
  const mid=Core.assemblyFrame(data.model,14.2);assert.deepEqual(Core.assemblyFrame(data.model,14.2),mid);
  const end=finalFrame();assert.equal(end.assembledCount,30);assert.equal(end.total,32);assert.equal(data.model.stages.length,8);
});
test('hardware expansion creates detailed finite geometry and switchable X-ray',()=>{
  const items=Hardware.buildRobot(finalFrame().parts,data.wiring,robotOptions());assert.ok(items.length>=481);assert.equal(items.filter(o=>o.geometry).length,23);
  for(const o of items){assert.ok(o.pos.every(Number.isFinite),o.id);assert.ok(o.scale.every(n=>Number.isFinite(n)&&n>0),o.id);assert.ok(o.rot.every(Number.isFinite),o.id);}
  const hidden=Hardware.buildRobot(finalFrame().parts,data.wiring,{...robotOptions(),showWiring:false});assert.equal(hidden.filter(o=>o.geometry).length,0);assert.ok(hidden.length<items.length);
  const xray=Hardware.buildRobot(finalFrame().parts,data.wiring,{...robotOptions(),xray:true});assert.ok(xray.some(o=>o.alpha===.2));
});
test('wiring graph has exact connector-pin endpoints and complete route geometry',()=>{
  assert.deepEqual(Core.validateWiring(data.wiring,data.model),{connectors:11,wires:23,pins:44});
  const connectors=new Map(data.wiring.connectors.map(c=>[c.id,c]));
  for(const w of data.wiring.wires){assert.deepEqual(w.points[0],connectors.get(w.from[0]).pins[w.from[1]]);assert.deepEqual(w.points.at(-1),connectors.get(w.to[0]).pins[w.to[1]]);assert.ok(w.points.length>=2);}
});
test('wiring validator rejects dangling pins, disconnected geometry and duplicate wires',()=>{
  let bad=structuredClone(data.wiring);bad.wires[0].to=['NO_SUCH','PIN'];assert.throws(()=>Core.validateWiring(bad,data.model),/unknown pin/);
  bad=structuredClone(data.wiring);bad.wires[0].points[0][0]+=1;assert.throws(()=>Core.validateWiring(bad,data.model),/does not meet/);
  bad=structuredClone(data.wiring);bad.wires[1].id=bad.wires[0].id;assert.throws(()=>Core.validateWiring(bad,data.model),/invalid wire/);
});
test('cable meshes have finite positions, unit normals and valid triangle indices',()=>{
  for(const w of data.wiring.wires){const g=Hardware.tubeGeometry(w);assert.ok(g.positions.length>0);assert.equal(g.positions.length,g.normals.length);assert.ok(g.positions.every(Number.isFinite));for(let i=0;i<g.normals.length;i+=3)assert.ok(Math.abs(Math.hypot(...g.normals.slice(i,i+3))-1)<1e-6);assert.ok(g.indices.every(i=>i>=0&&i<g.positions.length/3));}
});
test('all model matrices are finite and preserve translation and scale',()=>{
  for(const rot of[[0,0,0],[.3,-.4,.7],[Math.PI/2,0,2]]){const m=Renderer.modelMatrix({pos:[1,2,3],scale:[4,5,6],rot});assert.equal(m.length,16);assert.ok(m.every(Number.isFinite));assert.deepEqual(m.slice(12,15),[1,2,3]);}
  const m=Renderer.modelMatrix({pos:[0,0,0],scale:[4,5,6],rot:[0,0,0]});assert.deepEqual([m[0],m[5],m[10],m[15]],[4,5,6,1]);
});
test('south route completes with finite electrical telemetry and energy use',()=>{
  const sim=Core.createSimulation(data,'south');sim.step(120);assert.equal(sim.state.status,'completed');assert.equal(sim.state.collision,null);assert.equal(sim.state.tire,'blue');assert.ok(Math.abs(sim.state.time-54.0666667)<.001);assert.ok(sim.state.energyWh>0);assert.ok(sim.state.electrical.soc_pct<100);assert.equal(sim.state.electrical.left_rpm,0);assert.equal(sim.state.electrical.right_rpm,0);assert.ok(Object.values(sim.state.electrical).every(v=>typeof v==='boolean'||Number.isFinite(v)));
});
test('experimental north route remains conditional with deterministic electrical state',()=>{
  const sim=Core.createSimulation(data,'north');sim.step(120);assert.equal(sim.state.status,'completed');assert.equal(sim.route.status,'stored-empty-control-route-not-a-legal-or-complete-mission');assert.ok(Math.abs(sim.state.time-81.65)<.001);assert.ok(sim.state.energyWh>0);
});
test('reset and deterministic replay include wheels, energy and electrical state',()=>{
  const a=Core.createSimulation(data,'south');a.step(20);const b=Core.createSimulation(data,'south');b.step(7);b.reset();b.step(20);
  for(const key of['x','y','theta','time','wheelLeft','wheelRight','energyWh','electrical'])assert.deepEqual(b.state[key],a.state[key],key);
  b.reset();assert.equal(b.state.energyWh,0);assert.equal(b.state.electrical.soc_pct,100);assert.equal(b.state.estop,false);
});
test('modeled emergency stop removes bus power, freezes motion and can reset',()=>{
  const sim=Core.createSimulation(data,'south');sim.step(5);const x=sim.state.x;sim.setEstop(true);sim.step(1);assert.equal(sim.state.status,'estop');assert.equal(sim.state.x,x);assert.equal(sim.state.electrical.bus_v,0);assert.equal(sim.state.electrical.power_w,0);assert.equal(Core.netCurrent('GND',sim.state),0);sim.setEstop(false);sim.step(.5);assert.equal(sim.state.status,'running');assert.ok(sim.state.electrical.bus_v>10);
});
test('wire activity maps motor, supply and logic nets without claiming wire sizing',()=>{
  const sim=Core.createSimulation(data,'south');sim.step(5);assert.ok(Math.abs(Core.netCurrent('MOTOR_L_A',sim.state))>0);assert.ok(Core.netCurrent('DRIVE+',sim.state)>0);assert.ok(Core.netCurrent('5V',sim.state)>0);assert.equal(Core.netCurrent('I2C_SDA',sim.state),0);assert.match(data.wiring.status,/not-a-wire-gauge-or-safety-release/);
});
test('standalone Hardware Studio is offline and contains every rendering and wiring layer',()=>{
  const html=fs.readFileSync(path.join(root,'share/Robot-Lab-v4.html'),'utf8');for(const token of['ROBOT_LAB_DATA','RobotLabCore','RobotLabHardware','createRenderer','uShadowMap','wire-select','sim-bus','estop'])assert.ok(html.includes(token),token);assert.ok(!/<script[^>]+src=/i.test(html));assert.ok(!/<link[^>]+href=/i.test(html));assert.ok(!/https?:\/\//i.test(html));assert.ok(html.includes('Not fabrication CAD'));assert.ok(html.includes('deterministically re-simulates'));
});
