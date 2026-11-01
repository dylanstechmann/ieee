#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),B=require('./mechanism-envelope-v6');
const root=path.resolve(__dirname,'..'),out='derived/mechanism-envelope-v6',read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8')),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
function verify(){
  const m=read(`${out}/manifest.json`);for(const key of['input_hashes','output_hashes','preserved_hashes'])for(const [f,h]of Object.entries(m[key]))assert.equal(hash(f),h,`stale ${key}: ${f}`);
  const built=B.buildArtifacts();for(const [name,text]of Object.entries(built.files))assert.equal(fs.readFileSync(path.join(root,out,name),'utf8'),text,`regenerate ${name}`);
  const r=built.report;assert.equal(r.case_count,162);assert.equal(r.physical_trials,0);assert.equal(r.selected_mechanism,null);assert.equal(new Set(r.cases.map(x=>x.id)).size,r.case_count);
  for(const row of r.cases){assert.equal(row.summary.acquisition_status,'not-evaluated');assert.equal(row.summary.retention_status,'not-evaluated');for(const f of row.frames){for(const b of[f.tire_box,f.assembly_box,...f.parts.map(x=>x.box)])assert.ok(b.min.every((v,i)=>Number.isFinite(v)&&Number.isFinite(b.max[i])&&b.max[i]>v));}if(row.orientation==='upright'&&row.concept_id==='guided-bore')assert.equal(row.summary.pin_axis_status,'incompatible-with-upright-bore-axis');}
  assert.ok(!/<script[^>]+src=|<link[^>]+href=/i.test(built.files['review.html']));
  const evidence=read(`${out}/browser-validation.json`);assert.equal(evidence.review_html_sha256,hash(`${out}/review.html`),'stale browser evidence');assert.equal(evidence.console_errors,0);assert.equal(evidence.interaction_cases,r.case_count);assert.deepEqual(evidence.checked_case_ids,r.cases.map(x=>x.id));assert.equal(evidence.file_protocol,'blocked-by-browser-tool-not-validated');for(const s of evidence.screenshots)assert.equal(hash(`${out}/${s.file}`),s.sha256,`changed screenshot ${s.file}`);
  return {status:'passed',cases:r.case_count,samples:r.sample_count,source_triangles:r.source_tire.mesh_envelope.triangles,preserved_artifacts:Object.keys(m.preserved_hashes).length,physical_trials:0,selected_mechanism:null};
}
module.exports={verify};if(require.main===module)console.log(JSON.stringify(verify(),null,2));