'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {build}=require('../tools/build-showcase-v11');
const root=path.resolve(__dirname,'..');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
test('new showcase rebuilds exactly and embeds CAD, traces and runtime',()=>{
  const built=build(),html=fs.readFileSync(path.join(root,'share/Showcase-v12.html'),'utf8');
  assert.equal(built.html,html);
  for(const text of ['id="v11-canvas"','globalThis.STUDIO_V11=','Live physics arena','Original simulated mission','Exchange bail-out','No tire parenting'])assert.ok(html.includes(text),text);
  assert.ok(!/href="(?:Robot-Studio|Mission-Replay)[^"]*\.html"/.test(html),'No required sibling studio navigation');
});
test('CAD manifest assets and source hashes remain fresh',()=>{
  const manifest=require('../derived/cad-v11/manifest.json');
  assert.equal(manifest.assets.length,10);
  for(const [file,expected]of Object.entries(manifest.inputHashes))assert.equal(hash(fs.readFileSync(path.join(root,file))),expected,file);
  for(const a of manifest.assets){
    assert.ok(a.volumeMm3>0);assert.ok(a.boundsMm.every(Number.isFinite));
    assert.equal(hash(fs.readFileSync(path.join(root,'derived/cad-v11',a.stl))),a.sha256);
    assert.equal(hash(fs.readFileSync(path.join(root,'derived/cad-v11',a.step))),a.stepSha256);
  }
});
test('assembly export binds placements and a valid binary glTF to source hashes',()=>{
  const manifest=require('../derived/showcase-v12/assembly-manifest.json');
  const bytes=fs.readFileSync(path.join(root,'derived/showcase-v12/assembly.glb'));
  assert.equal(bytes.toString('utf8',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
  assert.equal(hash(bytes),manifest.glbSha256);assert.equal(manifest.instances.length,19);
  for(const [file,h]of Object.entries(manifest.inputHashes))assert.equal(hash(fs.readFileSync(path.join(root,file))),h,file);
});