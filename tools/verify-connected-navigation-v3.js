#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {build}=require('./constrained-field-v3'),{makeField,svg}=require('./navigation-v3'),{routesFor,primitives}=require('./differential-drive-v3');
const {summarize,candidateAudit,passageCoordinates}=require('./connected-navigation-v3'),{evaluate,checkContract}=require('./contract-navigation-v3');
const {metrics,summary:metricSummary}=require('./connected-candidate-summary-v3');
// Some sealed v3 records contain an accidentally duplicated absolute repository root.
const root=path.resolve(__dirname,'..'),resolve=f=>{const absolute=path.isAbsolute(f)?f:path.join(root,f),nested=path.join(root,path.basename(root));return absolute===nested?root:absolute.startsWith(nested+path.sep)?path.join(root,path.relative(nested,absolute)):absolute;},read=f=>JSON.parse(fs.readFileSync(resolve(f),'utf8')),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(resolve(f))).digest('hex');
const r=read('derived/connected-navigation-v3/report.json'),manifest=read('derived/connected-navigation-v3/baseline-manifest.json'),source=read('constrained-field-v3.json'),model=build(source,read(source.trace_file));
const sourceAudit=read('derived/connected-navigation-v3/obstacle-source-audit.json');assert.equal(hash(sourceAudit.source),sourceAudit.sha256);assert.equal(hash(sourceAudit.appendix_image.path),sourceAudit.appendix_image.sha256);
const xml=require('node:child_process').execFileSync('unzip',['-p',resolve(sourceAudit.source),'word/document.xml'],{encoding:'utf8',maxBuffer:8000000});
const paragraphs=[...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].map(m=>[...m[0].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(m=>m[1]).join(''));
for(const p of sourceAudit.paragraphs)assert.equal(paragraphs[p.index],p.text);
assert.ok(xml.includes('r:id="rId24"'));assert.ok(xml.includes('r:embed="rId30"'));
for(const [f,h] of Object.entries(r.input_hashes))assert.equal(hash(f),h,`stale ${f}`);
for(const [f,h] of Object.entries(manifest.files))if(f.includes('/derived/')||f.endsWith('.json'))assert.equal(hash(f),h,`changed reference ${f}`);
assert.equal(r.alignment.length,24);assert.equal(r.results.length,36);let completed=0;
for(const row of r.results){
  const field=makeField(model,row.config,row.config.wall_scenarios[0]);assert.deepEqual(row.supplement,passageCoordinates(field,row.config.robot,r.inputs.planner.clearance_margin_in));
  assert.equal(fs.readFileSync(path.join(root,'derived/connected-navigation-v3',`${row.obstacle_case}-${row.wall}-${row.mode}-${row.policy}.svg`),'utf8'),svg({config:row.config,routes:row.plans.filter(p=>p.route).map(p=>p.route)},model));
  for(const p of row.plans){if(!p.route){assert.equal(p.evaluation,null);continue;}completed++;const original=routesFor(model,r.inputs.drive).find(o=>o.id===p.original_route),route=p.route;
    assert.deepEqual(route.waypoints[0],original.waypoints[0]);assert.deepEqual(route.waypoints.at(-1),original.waypoints.at(-1));assert.deepEqual(route.waypoints[route.docking_waypoint_index],original.waypoints[original.docking_waypoint_index]);assert.deepEqual(route.kinematics,primitives(route.waypoints,r.inputs.planner.wheel_track_in));
    if(row.policy==='original-fixed')assert.ok(checkContract(route,original,r.inputs.contract).valid);
    assert.deepEqual(p.perturbed_contract,candidateAudit(p,original,field,row.config,r.inputs.contract,r.inputs.config,row.policy));assert.deepEqual(p.evaluation,evaluate(route,field,row.config,model.features.find(f=>f.id===original.target_id).vertices_in));
  }
}
assert.equal(fs.readFileSync(path.join(root,'derived/connected-navigation-v3/summary.md'),'utf8'),summarize(r));
const candidateMetrics=read('derived/connected-navigation-v3/candidate-metrics.json');assert.equal(candidateMetrics.source_sha256,hash(path.join(root,'derived/connected-navigation-v3/report.json')));assert.deepEqual(candidateMetrics.rows,metrics(r));assert.equal(fs.readFileSync(path.join(root,'derived/connected-navigation-v3/candidate-metrics.md'),'utf8'),metricSummary(candidateMetrics.rows));
console.log(`Verified input/reference hashes, 24 alignment records, 36 SVGs and comparison rows, ${completed} complete routes with fixed task poses, wheel commands, contract audits and recomputed perturbation evaluations.`);