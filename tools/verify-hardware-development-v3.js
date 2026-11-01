#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {buildReport,renderReadme,renderComponents,renderExperiments}=require('./hardware-development-v3');
const root=path.resolve(__dirname,'..'),out=path.join(root,'derived/hardware-development-v3');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const config=read('hardware-development-v3.json'),manifest=read('derived/hardware-development-v3/manifest.json');
for(const [file,expected] of Object.entries(manifest.input_hashes))assert.equal(hash(path.join(root,file)),expected,`stale input ${file}`);
for(const [file,expected] of Object.entries(manifest.output_hashes))assert.equal(hash(path.join(out,file)),expected,`changed output ${file}`);
const r=buildReport(config);
assert.deepEqual(read('derived/hardware-development-v3/report.json'),r);
assert.equal(fs.readFileSync(path.join(out,'README.md'),'utf8'),renderReadme(r));
assert.equal(fs.readFileSync(path.join(out,'component-selection.md'),'utf8'),renderComponents(r));
assert.equal(fs.readFileSync(path.join(out,'experiment-plan.md'),'utf8'),renderExperiments(r));
const measurement=read('derived/hardware-development-v3/measurement-template.json');
assert.equal(measurement.status,'blank-template-no-measurements');assert.equal(measurement.robot_mass_kg,null);assert.equal(measurement.hot_continuous_current_a_per_side,null);
assert.equal(r.requirements.find(x=>x.id==='DRIVER-01').status,'blocked-on-measurement');
console.log(JSON.stringify({status:'passed',scope:'requirements-and-experiment-artifacts-only',design_mass_scenario_kg:r.assumptions.design_mass_kg,loaded_rpm_screen:r.design_case.required_loaded_rpm_with_margin,design_torque_nm_per_side:r.design_case.design_per_side_torque_nm,requirements:r.requirements.length,experiments:r.experiments.length,hardware_tested:false,components_selected:false},null,2));
