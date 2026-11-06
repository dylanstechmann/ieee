'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const spec=require('../derived/cad-v13/assembly-spec.json');
const vendor=require('../derived/cad-v13/assembly-vendor-22mm.json');
const {validateAssemblySpec,resolveAssembly,cadPointToRender,buildColliderRegistry}=require('../robot-studio-v13/assembly-spec');
const copy=()=>structuredClone(spec);

test('v13 selected assembly is valid, unscaled and source-distinct',()=>{
  assert.equal(validateAssemblySpec(spec),spec);assert.notEqual(spec.assemblyHash,vendor.assemblyHash);
  assert.equal(spec.instances.filter(i=>i.partId==='wheel-screw').length,12);
  assert.equal(spec.physics.trackMm,190);assert.equal(vendor.physics.trackMm,202);
  assert.ok(spec.parts.every(p=>!['battery-reservation','controller-reservation'].includes(p.id)));
});

test('datum transforms preserve units and joint travel',()=>{
  assert.deepEqual(cadPointToRender([1000,-20,3]),[1,-.02,.003]);
  const closed=resolveAssembly(spec,{liftMm:150,gateOpen:0}),open=resolveAssembly(spec,{liftMm:150,gateOpen:1});
  const a=closed.instances.find(i=>i.id==='gate'),b=open.instances.find(i=>i.id==='gate');
  assert.equal(a.positionM[0],.233);assert.equal(b.positionM[0],.287);
  assert.equal(a.positionM[1],.182);assert.equal(b.positionM[1],.182);
  assert.equal(closed.instances.find(i=>i.id==='tray-back').positionM[1],.197);
  assert.equal(buildColliderRegistry(open).filter(c=>c.id!=='chassis').length,6);
});

test('invalid specs, joints and purchased-part scaling are rejected',()=>{
  for(const mutate of [
    s=>{s.instances[0].scale=[1,1.1,1];},
    s=>{s.instances[0].partId='unknown';},
    s=>{s.instances.push(structuredClone(s.instances[0]));},
    s=>{s.joints[0].childInstanceId='missing';},
    s=>{s.joints[0].axis=[0,2,0];},
    s=>{s.physics.gateTravelMm=0;}
  ]){const bad=copy();mutate(bad);assert.throws(()=>validateAssemblySpec(bad));}
  assert.throws(()=>resolveAssembly(spec,{gateOpen:1.2}));assert.throws(()=>resolveAssembly(spec,{liftMm:-1}));
});

test('resolved outputs do not mutate the source specification',()=>{
  const before=JSON.stringify(spec),resolved=resolveAssembly(spec,{liftMm:150,gateOpen:0});
  resolved.instances[0].positionMm[0]=99;assert.equal(JSON.stringify(spec),before);
});
