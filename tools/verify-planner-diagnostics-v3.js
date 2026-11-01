#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {diagnosticSvg,summary,auditUncertainty}=require('./planner-diagnostics-v3');
const {checkContract,evaluate}=require('./contract-navigation-v3');
const {build}=require('./constrained-field-v3');
const {makeField}=require('./navigation-v3');
const {primitives}=require('./differential-drive-v3');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const r=read('derived/planner-diagnostics-v3/report.json'),manifest=read('derived/planner-diagnostics-v3/baseline-manifest.json');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
for(const [f,expected] of Object.entries(r.input_hashes))assert.equal(hash(path.join(root,f)),expected,`stale input ${f}`);
for(const [f,expected] of Object.entries(manifest.files))if(f.includes('/derived/')||f.endsWith('.json'))assert.equal(hash(f),expected,`historical input/artifact changed ${f}`);
assert.equal(r.results.length,48);
for(const row of r.results){assert.equal(fs.readFileSync(path.join(root,'derived/planner-diagnostics-v3',row.id+'.svg'),'utf8'),diagnosticSvg(row));assert.ok(row.search.diagnostics.expanded_samples.length<=500);assert.ok(Object.values(row.search.diagnostics.examples).every(a=>a.length<=3));if(row.search.status==='grid-exhausted')assert.equal(row.search.diagnostics.frontier_entries,0);}
assert.equal(fs.readFileSync(path.join(root,'derived/planner-diagnostics-v3/summary.md'),'utf8'),summary(r));
const source=read('constrained-field-v3.json'),model=build(source,read(source.trace_file));
for(const extension of r.extensions){if(!extension.route)continue;assert.ok(checkContract(extension.route,require('./differential-drive-v3').routesFor(model,r.inputs.drive).find(o=>o.id===extension.original_route),r.inputs.contract).valid);const row=r.results.find(row=>row.id===extension.source),nav=structuredClone(r.inputs.navigation);nav.obstacles.push(...r.inputs.stress.obstacle_cases.find(o=>o.id===row.obstacle_case).obstacles);const field=makeField(model,nav,nav.wall_scenarios.find(w=>w.id===row.wall));assert.deepEqual(extension.route.kinematics,primitives(extension.route.waypoints,r.inputs.planner.wheel_track_in));assert.deepEqual(extension.evaluation,evaluate(extension.route,field,nav,model.features.find(f=>f.id===extension.route.target_id).vertices_in));}
assert.deepEqual(r.perturbed_contract_audit,auditUncertainty(read('derived/contract-navigation-v3/report.json'),r.inputs.contract));
console.log('Verified current input hashes, preserved baseline inputs/artifacts, 48 SVGs, summary, full recovered-route evaluations and 486 pose-contract checks.');