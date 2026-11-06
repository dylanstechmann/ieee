'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {build}=require('../tools/build-showcase-v13'),root=path.resolve(__dirname,'..');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),read=f=>fs.readFileSync(path.join(root,f));

test('v13 showcase rebuilds exactly with detailed assets and no legacy approximate-studio controls',()=>{
  const html=read('share/Showcase-v13.html').toString();assert.equal(build().html,html);
  for(const text of ['id="v13-canvas"','globalThis.STUDIO_V13=','Published 16 mm','Vendor CAD 22 mm','Fit results','continuous collidable gate'])assert.ok(html.includes(text),text);
  assert.ok(!html.includes('id="v11-canvas"'));assert.ok(!html.includes('id="v13-diameter"'));
  for(const meta of ['name="apple-mobile-web-app-capable" content="yes"','name="apple-mobile-web-app-title" content="Pit Wall V13"'])assert.ok(html.includes(meta),meta);
  assert.ok(read('share/HOST-V13.txt').toString().includes('Host once, then send a link'));
});

test('CAD source and asset hashes remain fresh',()=>{
  const manifest=require('../derived/cad-v13/manifest.json');assert.equal(manifest.assets.length,17);
  for(const [file,expected]of Object.entries(manifest.inputHashes))assert.equal(hash(read(file)),expected,file);
  for(const source of manifest.sources)assert.equal(hash(read(source.path)),source.sha256,source.id);
  for(const asset of manifest.assets)assert.equal(hash(read(`derived/cad-v13/parts/${asset.glb}`)),asset.glbSha256,asset.id);
});

test('assembly GLB and named collider registry share one identity',()=>{
  const manifest=require('../derived/showcase-v13/assembly-manifest.json'),bytes=read('derived/showcase-v13/assembly.glb');
  assert.equal(bytes.toString('utf8',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
  assert.equal(hash(bytes),manifest.glbSha256);assert.equal(manifest.nodeCount,34);
  for(const [file,expected]of Object.entries(manifest.inputHashes))assert.equal(hash(read(file)),expected,file);
  const collision=require('../derived/showcase-v13/collision-study.json');assert.equal(collision.assemblyHash,manifest.assemblyHash);
  assert.equal(collision.colliders.length,7);assert.equal(collision.colliders.filter(c=>c.motionGroup==='gate').length,1);
});

test('fit report and focused live outcomes preserve failures and source conflicts',()=>{
  const fit=require('../derived/cad-v13/fit-results.json');
  assert.equal(fit.results.filter(r=>r.id==='motor-body-gap'&&r.status==='fail').length,2);
  assert.equal(fit.results.filter(r=>r.id==='motor-shaft-source-length'&&r.status==='conflict').length,2);
  assert.equal(fit.results.filter(r=>r.id==='gate-travel-clearance'&&r.status==='pass').length,2);
  const live=require('../derived/showcase-v13/live-validation.json');
  assert.equal(live.runs.find(r=>r.id==='nominal').result,'passed');assert.equal(live.runs.find(r=>r.id==='demo-heavy-tire').result,'passed');
  assert.equal(live.runs.find(r=>r.id==='organizer').result,'failed');
  for(const id of ['missing','weak','misaligned'])assert.equal(live.runs.find(r=>r.id===id).result,'failed');
});


test('browser evidence and build manifest match the final HTML and screenshots',()=>{
  const html=read('share/Showcase-v13.html'),browser=require('../derived/showcase-v13/browser-validation.json'),build=require('../derived/showcase-v13/build-manifest.json');
  assert.equal(browser.htmlSha256,hash(html));assert.equal(build.output.sha256,hash(html));assert.deepEqual(browser.errors,[]);assert.deepEqual(browser.externalRequests,[]);
  assert.equal(browser.checks.length,16);assert.equal(browser.screenshots.length,16);assert.equal(browser.live.result,'passed');assert.equal(browser.organizer.result,'failed');assert.equal(browser.narrowOverflow,false);
  for(const key of ['assemblyFraming','narrowFraming']){const [left,bottom,right,top]=browser[key].ndcBounds;assert.ok(left>=-1&&bottom>=-1&&right<=1&&top<=1&&right>left&&top>bottom,key);}
  assert.equal(browser.legacyApiCompatibility.assets,17);assert.equal(browser.legacyApiCompatibility.instanceCount,34);
  assert.equal(browser.webgl2Diagnostic.error,'webgl2-unavailable');assert.match(browser.webgl2Diagnostic.message,/WebGL2/);assert.equal(browser.noscriptGuidance,true);
  for(const [file,expected]of Object.entries(build.inputs))assert.equal(hash(read(file)),expected,file);
  for(const shot of browser.screenshots)assert.ok(fs.statSync(path.join(root,shot)).size>=10000,shot);
});

test('historical v12 HTML remains byte-for-byte preserved',()=>{
  assert.equal(hash(read('share/Showcase-v12.html')),'2d334c7e2f8f0007dc3b21fdbd3a1b668f8b5e8d4da1b2b444a05d39a30f372b');
});
