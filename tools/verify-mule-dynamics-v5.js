#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const Build=require('./build-mule-dynamics-studio-v5'),D=require('./mule-dynamics-v5');
const root=path.resolve(__dirname,'..'),out=path.join(root,'derived/mule-dynamics-v5'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8')),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const config=read('mule-dynamics-v5.json'),manifest=read('derived/mule-dynamics-v5/manifest.json');D.validate(config);
for(const[file,expected]of Object.entries(manifest.input_hashes))assert.equal(hash(path.join(root,file)),expected,`stale input ${file}`);
for(const[file,expected]of Object.entries(manifest.output_hashes))assert.equal(hash(path.join(root,file)),expected,`changed output ${file}`);
const built=Build.buildArtifacts(config);for(const[name,text]of Object.entries(built.files))assert.equal(fs.readFileSync(path.join(out,name),'utf8'),text,name);assert.deepEqual(read('derived/mule-dynamics-v5/report.json'),built.report);
assert.equal(built.analysis.case_count,324);assert.equal(built.analysis.ensemble.run_count,48);assert.equal(built.report.physical_trials_completed,0);assert.equal(built.report.components_purchased,0);
for(const run of built.nominal.runs){let energy=0;for(const sample of run.samples){assert.ok(sample.energy_wh>=energy);energy=sample.energy_wh;for(const current of sample.current_a)assert.ok(Math.abs(current)<=config.electrical.driver_current_limit_a+1e-6);for(const value of[sample.x_m,sample.y_m,sample.yaw_rad,sample.speed_m_s,sample.bus_v])assert.ok(Number.isFinite(value));}}
const html=fs.readFileSync(path.join(root,'share/Mule-Dynamics-Studio-v5.html'),'utf8');assert.ok(!/<script[^>]+src=|<link[^>]+href=/i.test(html));assert.ok(!/<(?:script|img|link)[^>]+(?:src|href)=["']https?:/i.test(html));
const evidence=read('derived/mule-dynamics-v5/browser-validation.json');assert.match(evidence.status,/^passed/);assert.equal(evidence.console.javascript_errors,0);assert.equal(evidence.standalone_sha256,hash(path.join(root,evidence.standalone)),'browser evidence is stale');assert.equal(evidence.default.sample_count,181);assert.equal(evidence.default.phase_count,2);assert.ok(evidence.asymmetric_traction.metrics.maximum_abs_slip_m_s>.02);for(const shot of evidence.screenshots)assert.equal(hash(path.join(out,shot.file)),shot.sha256,`changed screenshot ${shot.file}`);
console.log(JSON.stringify({status:'passed',standalone:evidence.standalone,cases:built.analysis.case_count,sensitivity_runs:built.analysis.ensemble.run_count,nominal_trajectories:built.nominal.runs.length,browser_errors:0,screenshots:evidence.screenshots.length,physical_trials:0,purchased_components:0},null,2));
