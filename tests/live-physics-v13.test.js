'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const R=require(path.join(process.env.STUDIO_PHYSICS_DIR||path.join(os.homedir(),'.cache/node-copies/courselab-frontend'),'node_modules/@dimforge/rapier3d-compat'));
const {LiveMission}=require('../robot-studio-v13/physics');
const ready=R.init();
async function run(parameters={}){await ready;const m=new LiveMission(R,parameters);try{for(let i=0;i<72001&&m.result==='running';i++)m.step(false);return m.snapshot();}finally{m.dispose();}}

test('nominal v13 mission passes with continuous gate and independent release',async()=>{
  const s=await run();assert.equal(s.result,'passed');assert.equal(s.laps,3);assert.equal(s.profileId,'v13-jointed-gate');
  assert.equal(s.parameters.track,.19);assert.ok(s.peakTireHeight>.17);assert.ok(s.carriedSeconds>200);
  assert.ok(s.evidence.releaseDuration>.5);assert.equal(s.evidence.destinationSupport,true);assert.equal(s.evidence.loadBearingSupport,false);
  assert.ok(Object.keys(s.contactCounters).length>0);assert.ok(s.contactSamples.every(c=>c.colliderA&&c.colliderB&&c.category));
});

test('missing, weak and misaligned v13 cases cannot pass',async()=>{
  for(const [parameters,reason]of [[{tirePresent:false},'Acquisition failed'],[{liftForce:.2},'Lift stalled'],[{tireOffset:.14},'Acquisition failed']]){
    const s=await run(parameters);assert.equal(s.result,'failed');assert.ok(s.terminalReason.includes(reason));assert.equal(s.carriedSeconds,0);
  }
});

test('gate collider remains present and above floor throughout horizontal travel',async()=>{
  await ready;const m=new LiveMission(R);try{for(const open of [0,.25,.5,.75,1]){m.gateOpen=open;m.updateGate();m.world.step();const p=m.frontGate.translation(),parent=m.fork.translation();assert.ok(p.y>0);assert.ok(Math.abs(p.x-parent.x-(.233+open*.054))<1e-7,'Rapier translation uses float32 precision');assert.ok(Math.abs(p.y-parent.y-m.frontGateBase.y)<1e-7);}const source=fs.readFileSync(path.join(__dirname,'../robot-studio-v13/physics.js'),'utf8');assert.ok(!/this\.tire\.set(?:Translation|Rotation)/.test(source));assert.ok(!/retry/i.test(source));}finally{m.dispose();}
});

test('open-gate-only contact is not load-bearing support',async()=>{
  await ready;const m=new LiveMission(R);const original=m.world.contactPair;try{m.tire={};m.tireColliders=[{}];m.frontGate={};m.forkColliders=[m.frontGate];m.world.contactPair=(a,b,cb)=>cb({numContacts:()=>1});assert.equal(m.supportContact(),false);assert.equal(m.gateContact(),true);}finally{m.world.contactPair=original;m.dispose();}
});

test('terminal snapshots retain identity and disposal remains idempotent',async()=>{
  await ready;const m=new LiveMission(R);try{m.fail('Synthetic stop');const s=m.snapshot();assert.equal(s.result,'failed');assert.equal(s.assemblyId,m.assembly.id);assert.equal(s.assemblyHash,m.assembly.assemblyHash);for(let i=0;i<10;i++)m.step(false);assert.equal(m.snapshot().time,s.time);}finally{m.dispose();m.dispose();}assert.throws(()=>m.step(),/disposed/);
});
