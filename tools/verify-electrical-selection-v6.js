#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const B=require('./electrical-selection-v6'),root=path.resolve(__dirname,'..'),out='derived/electrical-selection-v6';
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8')),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
function verify(){
  const c=read('electrical-selection-v6.json'),m=read(`${out}/manifest.json`);B.validate(c);
  for(const group of['input_hashes','output_hashes','preserved_hashes'])for(const[f,h]of Object.entries(m[group]))assert.equal(hash(f),h,`stale ${group}: ${f}`);
  const index=read(`${c.source_directory}/index.json`),archived=index.sources.filter(x=>x.status==='archived');
  for(const s of archived){const f=`${c.source_directory}/${s.file}`;assert.equal(hash(f),s.sha256,`changed source: ${f}`);assert.equal(fs.statSync(path.join(root,f)).size,s.bytes);if(s.file.endsWith('.pdf'))assert.equal(fs.readFileSync(path.join(root,f)).subarray(0,4).toString(),'%PDF');}
  const names=new Set(archived.map(x=>x.file));
  for(const candidate of [...c.drivers,...c.controllers,c.encoder_conditioner,c.logic_regulator])assert.ok(names.has(candidate.source),`unarchived candidate source ${candidate.source}`);
  for(const x of c.controllers)assert.ok(names.has(x.encoder_source));
  const built=B.buildArtifacts(c);for(const[name,text]of Object.entries(built.files))assert.equal(fs.readFileSync(path.join(root,out,name),'utf8'),text,`regenerate ${name}`);
  assert.equal(built.report.physical_trials,0);assert.equal(built.report.purchases,0);assert.equal(built.report.conditional_preferences.final_components_selected,false);
  for(const field of['continuous_current_a_per_motor','startup_current_duration_s','qualified_driver_current_limit_a','battery_capacity_ah','fuse_rating_a','wire_gauge_awg','mechanism_actuator'])assert.equal(c.requirements[field],null,`unqualified ${field}`);
  for(const d of built.report.driver_power_screens)assert.notEqual(d.voltage_logic_status,'passed');
  return {status:'passed',archived_sources:archived.length,failed_fetches:index.sources.filter(x=>x.status==='failed').length,encoder_candidates:built.report.encoder_rates.length,driver_power_screens:built.report.driver_power_screens.length,preserved_artifacts:Object.keys(m.preserved_hashes).length,physical_trials:0,purchases:0};
}
module.exports={verify};if(require.main===module)console.log(JSON.stringify(verify(),null,2));