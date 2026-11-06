#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {diagnosticSvg,summary,auditUncertainty,runDiagnostics}=require('./planner-diagnostics-v3');
const {checkContract,evaluate}=require('./contract-navigation-v3');
const {build}=require('./constrained-field-v3');
const {makeField}=require('./navigation-v3');
const {primitives}=require('./differential-drive-v3');
// Some sealed v3 records contain an accidentally duplicated absolute repository root, and the repo
// was renamed ieee -> roboticThingAvoidance, so historical /workspace/ieee prefixes are remapped to
// wherever the repository now lives.
const root=path.resolve(__dirname,'..'),resolve=f=>{if(!path.isAbsolute(f))return path.join(root,f);const nested=path.join(root,path.basename(root));if(f===nested)return root;if(f.startsWith(nested+path.sep))return path.join(root,path.relative(nested,f));const old=f.match(/^\/workspace\/ieee(?:\/ieee)?\/(.*)$/);return old?path.join(root,old[1]):f;},read=f=>JSON.parse(fs.readFileSync(resolve(f),'utf8'));
const reportPath=path.join(root,'derived/planner-diagnostics-v3/report.json');
const r=read('derived/planner-diagnostics-v3/report.json'),manifest=read('derived/planner-diagnostics-v3/baseline-manifest.json');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(resolve(f))).digest('hex');
// A dated supersession record accepts one documented input change (tools/avoidance-v3.js, edited after
// sealing) only at its exact recorded hashes; every other input stays strict. See the record for why.
const supersession=read('derived/audits/2026-11-03-planner-diagnostics-v3-input-supersession/record.json');
const {accepted,stale}=require('./input-supersession').checkInputHashes(r.input_hashes,f=>hash(f),supersession);
for(const s of stale)assert.equal(s.current,s.sealed,`stale input ${s.file}`);
for(const [f,expected] of Object.entries(manifest.files))if(f.includes('/derived/')||f.endsWith('.json'))assert.equal(hash(f),expected,`historical input/artifact changed ${f}`);
assert.equal(r.results.length,48);
for(const row of r.results){assert.equal(fs.readFileSync(path.join(root,'derived/planner-diagnostics-v3',row.id+'.svg'),'utf8'),diagnosticSvg(row));assert.ok(row.search.diagnostics.expanded_samples.length<=500);assert.ok(Object.values(row.search.diagnostics.examples).every(a=>a.length<=3));if(row.search.status==='grid-exhausted')assert.equal(row.search.diagnostics.frontier_entries,0);}
assert.equal(fs.readFileSync(path.join(root,'derived/planner-diagnostics-v3/summary.md'),'utf8'),summary(r));
const source=read('constrained-field-v3.json'),model=build(source,read(source.trace_file));
for(const extension of r.extensions){if(!extension.route)continue;assert.ok(checkContract(extension.route,require('./differential-drive-v3').routesFor(model,r.inputs.drive).find(o=>o.id===extension.original_route),r.inputs.contract).valid);const row=r.results.find(row=>row.id===extension.source),nav=structuredClone(r.inputs.navigation);nav.obstacles.push(...r.inputs.stress.obstacle_cases.find(o=>o.id===row.obstacle_case).obstacles);const field=makeField(model,nav,nav.wall_scenarios.find(w=>w.id===row.wall));assert.deepEqual(extension.route.kinematics,primitives(extension.route.waypoints,r.inputs.planner.wheel_track_in));assert.deepEqual(extension.evaluation,evaluate(extension.route,field,nav,model.features.find(f=>f.id===extension.route.target_id).vertices_in));}
assert.deepEqual(r.perturbed_contract_audit,auditUncertainty(read('derived/contract-navigation-v3/report.json'),r.inputs.contract));
let reproduced=false;
if(process.argv.includes('--reproduce')){
  // Full in-memory regeneration (about 2 minutes): the same call as the generator's main block, with
  // its progress logging silenced and the sealed input_hashes re-attached last so key order matches.
  const freshSource=read('constrained-field-v3.json'),freshModel=build(freshSource,read(freshSource.trace_file)),log=console.log;
  let rebuilt;
  console.log=()=>{};
  try{rebuilt=runDiagnostics(freshModel,read('navigation-v3.json'),read('differential-drive-v3.json'),read('navigation-stress-v3.json'),read('avoidance-v3.json'),read('route-contract-v3.json'),read('planner-diagnostics-v3.json'),read('derived/contract-navigation-v3/report.json'));}
  finally{console.log=log;}
  rebuilt.input_hashes=r.input_hashes;
  assert.equal(JSON.stringify(rebuilt,null,2)+'\n',fs.readFileSync(reportPath,'utf8'),'in-memory regeneration differs from the sealed report.json');
  assert.equal(summary(rebuilt),fs.readFileSync(path.join(root,'derived/planner-diagnostics-v3/summary.md'),'utf8'),'regenerated summary.md differs');
  for(const row of rebuilt.results)assert.equal(diagnosticSvg(row),fs.readFileSync(path.join(root,'derived/planner-diagnostics-v3',row.id+'.svg'),'utf8'),`regenerated ${row.id}.svg differs`);
  reproduced=true;
}
console.log('Verified current input hashes'+(accepted.length?` (recorded supersession accepted for ${accepted.join(', ')})`:'')+', preserved baseline inputs/artifacts, 48 SVGs, summary, full recovered-route evaluations and 486 pose-contract checks'+(reproduced?'; full in-memory regeneration byte-identical.':'.'));
