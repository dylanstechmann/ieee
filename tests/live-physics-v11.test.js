'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const os=require('node:os');
const R=require(path.join(process.env.STUDIO_PHYSICS_DIR||path.join(os.homedir(),'.cache/node-copies/courselab-frontend'),'node_modules/@dimforge/rapier3d-compat'));
const {LiveMission,validateParameters,planPath}=require('../robot-studio-v11/physics');
const ready=R.init();
async function run(parameters={}){await ready;const m=new LiveMission(R,parameters);try{let s;for(let i=0;i<72001;i++){s=m.step();if(s.result!=='running')return s;}throw Error('No terminal result');}finally{m.dispose();}}
test('nominal live mission makes three laps and physically lifts, carries and releases tire',async()=>{
  const s=await run();assert.equal(s.result,'passed');assert.equal(s.laps,3);
  assert.ok(s.peakTireHeight>.14);assert.ok(s.carriedSeconds>100);assert.ok(s.tire.y<.065);
  assert.ok(s.events.some(e=>e.message.includes('Contact-supported')));assert.ok(s.events.some(e=>e.message.includes('independently supported')));
  assert.ok(s.evidence.supportDuration>.5);assert.ok(s.evidence.releaseDuration>.5);assert.equal(s.evidence.destinationSupport,true);assert.equal(s.evidence.finite,true);
});
test('missing tire cannot produce acquisition success',async()=>{const s=await run({tirePresent:false});assert.equal(s.result,'failed');assert.equal(s.carriedSeconds,0);assert.ok(s.events.at(-1).message.includes('Acquisition failed'));});
test('underpowered lift visibly stalls instead of teleporting payload',async()=>{const s=await run({liftForce:.2});assert.equal(s.result,'failed');assert.ok(s.events.at(-1).message.includes('Lift stalled'));});
test('misaligned source cannot be declared captured by elapsed time',async()=>{const s=await run({tireOffset:.14});assert.equal(s.result,'failed');assert.equal(s.carriedSeconds,0);});
test('bad physical values cannot silently enter runs',()=>{for(const p of [{tireMass:NaN},{liftForce:-1},{traction:0},{unknown:2}])assert.throws(()=>validateParameters(p));});
test('planner detours rather than crossing an inflated obstruction',()=>{
  const p=planPath({x:-.6,z:0},{x:.6,z:0},[{x:0,z:0,hx:.1,hz:.1}]);assert.ok(p.length);assert.ok(p.some(q=>Math.abs(q.z)>.25));
});
test('terminal states stay fixed, snapshots do not alias paths, and disposal is idempotent',async()=>{
  await ready;const m=new LiveMission(R);try{
    const s=m.snapshot(),x=m.goal.x;s.goal.x=99;s.path[0].x=99;assert.equal(m.goal.x,x);assert.notEqual(m.path[0].x,99);
    m.fail('Synthetic safety stop');const stopped=m.snapshot();for(let i=0;i<10;i++)m.step(false);
    assert.equal(m.time,stopped.time);assert.equal(m.result,'failed');assert.equal(m.snapshot().terminalReason,'Synthetic safety stop');
  }finally{m.dispose();m.dispose();}assert.throws(()=>m.step(),/disposed/);
});
test('interrupted acquisition contact cannot accumulate into a pickup pass',async()=>{
  await ready;const m=new LiveMission(R);try{
    m.phase='lift';m.phaseStart=0;m.lift=m.parameters.liftHeight;m.liftTarget=m.lift;
    // Stub contact/height evidence only in this unit test to isolate the gate;
    // actual contact physics is exercised by the full nominal mission above.
    m.tire.translation=()=>({x:m.chassis.translation().x+.164,y:.16,z:m.chassis.translation().z});
    for(let cycle=0;cycle<5;cycle++){
      m.supportContact=()=>true;for(let i=0;i<40;i++)m.controller();assert.equal(m.phase,'lift');
      m.supportContact=()=>false;m.controller();assert.equal(m.supportSteps,0);assert.equal(m.supportDuration,0);
    }
    m.supportContact=()=>true;for(let i=0;i<61;i++)m.controller();assert.equal(m.phase,'source-backout');
  }finally{m.dispose();}
});