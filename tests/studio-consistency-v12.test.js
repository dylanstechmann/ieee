'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createArena,fieldPoint}=require('../robot-studio-v11/arenas');
const {planPath}=require('../robot-studio-v11/physics');
const {assemblyPrimitives}=require('../robot-studio-v11/assembly-primitives');
const field=require('../derived/organizer-cad-v10/field-v10.json');
const manifest=require('../derived/showcase-v12/assembly-manifest.json');
const config={id:manifest.configurationId,revision:manifest.revision,partId:'pololu-1430',basis:'historical exterior study',dimensions:{wheelDiameterMm:80,wheelWidthMm:10,halfTrackMm:101,deckThicknessMm:3,gearboxCenterAboveMountMm:19,shaftOffsetMm:2,casterHeightMm:12,casterSpacerMm:3}};

test('organizer arena uses archived SI dimensions, not the enlarged demonstration',()=>{
  const a=createArena('organizer',field),demo=createArena();
  assert.ok(Math.abs(a.board.width-2.4384)<1e-12);assert.ok(Math.abs(a.board.depth-1.2192)<1e-12);
  assert.equal(a.barriers[4].hx,36*.0127);assert.equal(a.barriers[4].hz,.0127);assert.equal(a.couches.length,0);
  assert.ok(demo.board.width>a.board.width);assert.deepEqual(fieldPoint(48,24),{x:0,z:-0});
  assert.throws(()=>createArena('unknown'));assert.throws(()=>createArena('organizer'));
});
test('planner rejects nonfinite and unreachable exact endpoints',()=>{
  assert.throws(()=>planPath({x:NaN,z:0},{x:0,z:0},[]));
  assert.deepEqual(planPath({x:0,z:0},{x:4,z:0},[]),[]);
  assert.deepEqual(planPath({x:4,z:0},{x:0,z:0},[]),[]);
  assert.deepEqual(planPath({x:-.6,z:0},{x:0,z:0},[{x:0,z:0,hx:.1,hz:.1}]),[]);
});
test('shared procedural study has unique positive components and disclosed reservations',()=>{
  const p=assemblyPrimitives(config);assert.equal(p.length,11);assert.equal(new Set(p.map(x=>x.id)).size,p.length);
  for(const r of p){assert.ok(r.size.every(v=>Number.isFinite(v)&&v>0));assert.ok(r.position.every(Number.isFinite));assert.ok(r.basis);}
  assert.match(p.find(r=>r.id==='battery-reservation').basis,/no selected SKU/);
  const q=assemblyPrimitives({...config,dimensions:{...config.dimensions,wheelDiameterMm:84}});
  assert.ok(Math.abs(q.find(r=>r.id==='battery-reservation').position[1]-p.find(r=>r.id==='battery-reservation').position[1]-.002)<1e-12);
});
test('GLB contains complete core plus procedural components with matching collision study',()=>{
  const bytes=fs.readFileSync(path.resolve(__dirname,'../derived/showcase-v12/assembly.glb'));
  const length=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+length).toString());
  assert.equal(gltf.nodes.length,manifest.instances.length+manifest.primitives.length);
  const collision=require('../derived/showcase-v12/collision-study.json');
  assert.deepEqual(collision.primitives.map(({shape,...p})=>p),manifest.primitives);
  for(const p of manifest.primitives)assert.ok(gltf.nodes.some(n=>n.name===p.id));
});