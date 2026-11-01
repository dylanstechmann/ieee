#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),Build=require('./build-integration-studio-v6');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8')),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex'),manifest=read('derived/integration-studio-v6/manifest.json');
for(const group of['input_hashes','output_hashes'])for(const[f,h]of Object.entries(manifest[group]))assert.equal(hash(f),h,`${group}: ${f}`);
assert.equal(fs.readFileSync(path.join(root,'share/Mule-Integration-Studio-v6.html'),'utf8'),Build.buildHtml());
const evidence=read('derived/integration-studio-v6/browser-validation.json');assert.equal(evidence.status,'passed-with-recorded-webgl-performance-warning');assert.equal(evidence.javascript_errors,0);assert.equal(evidence.mechanism_cases_reviewed,162);assert.equal(evidence.standalone_sha256,hash('share/Mule-Integration-Studio-v6.html'));for(const s of evidence.screenshots)assert.equal(hash(s.path),s.sha256);
console.log(JSON.stringify({status:'passed',mechanism_cases:162,stopping_trajectories:28,javascript_errors:0,browser_warnings:evidence.browser_warnings,physical_trials:0},null,2));