#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out='derived/integration-studio-v6';
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8')),text=f=>fs.readFileSync(path.join(root,f),'utf8'),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
const runKey=r=>[r.scenario_id??r.scenario,r.mode,r.model_variant].join('|');
function buildValidation(){
  const raw=read(`${out}/browser-raw.json`),mechanism=read('derived/mechanism-envelope-v6/report.json'),stopping=read('derived/stopping-dynamics-v6/nominal-simulations.json');
  assert.equal(raw.schema_version,1);assert.equal(raw.protocol,'file:');assert.equal(raw.offline,true);assert.deepEqual(raw.failures,[]);assert.deepEqual(raw.page_errors,[]);assert.equal(raw.physical_trials,0);
  assert.ok(raw.standalone.endsWith('/share/Mule-Integration-Studio-v6.html'));assert.equal(raw.network_requests.length,1);assert.equal(raw.network_requests[0].url,raw.standalone);
  const expectedCases=new Map(mechanism.cases.map((c,i)=>[c.id,{c,i}]));
  assert.equal(raw.mechanism_results.length,mechanism.cases.length);assert.equal(new Set(raw.mechanism_results.map(r=>r.case_id)).size,mechanism.cases.length);
  for(const result of raw.mechanism_results){
    const expected=expectedCases.get(result.case_id);assert.ok(expected,`unknown browser case ${result.case_id}`);assert.equal(result.case_index,expected.i);
    const last=expected.c.frames.length-1;assert.deepEqual(result.frames.map(f=>f.index),[0,Math.floor(last/2),last]);
    for(const frame of result.frames){assert.equal(frame.phase,expected.c.frames[frame.index].phase);assert.ok(Object.values(frame.checks).every(Boolean),`${result.case_id} frame ${frame.index}`);for(const key of['tire_stationary','robot_moves_together','robot_offset_exact','presentation_frame'])assert.equal(frame.checks[key],true,`${result.case_id} ${key}`);}
  }
  const expectedRuns=new Map(stopping.runs.map(r=>[runKey(r),r]));assert.equal(raw.stopping_results.length,stopping.runs.length);assert.equal(new Set(raw.stopping_results.map(runKey)).size,stopping.runs.length);
  for(const result of raw.stopping_results){
    const expected=expectedRuns.get(runKey(result));assert.ok(expected,`unknown stopping run ${runKey(result)}`);
    const last=expected.samples.length-1;assert.deepEqual(result.frames.map(f=>f.index),[0,Math.floor(last/2),last]);assert.equal(result.stop_time_s,expected.metrics.stop_time_s);assert.equal(result.stop_distance_m,expected.metrics.stop_distance_m);
    for(const frame of result.frames){assert.equal(frame.t,expected.samples[frame.index].t);assert.ok(Object.values(frame.checks).every(Boolean),`${runKey(result)} frame ${frame.index}`);}
  }
  const requiredInteractions=['model-select','mode-select','timeline-seek','play-pause','previous-next','restart','workspace-case-select','display-options','camera-controls'];
  assert.deepEqual(new Set(raw.interactions.map(x=>x.name)),new Set(requiredInteractions));for(const x of raw.interactions)assert.equal(x.passed,true,x.name);
  const errors=raw.console_messages.filter(x=>x.type==='error'),warnings=raw.console_messages.filter(x=>x.type==='warning');assert.deepEqual(errors,[]);
  for(const x of warnings)assert.ok(x.text.includes('GPU stall due to ReadPixels'),`unclassified browser warning: ${x.text}`);
  const consoleTool=text(`${out}/browser-console-tool.txt`),networkTool=text(`${out}/browser-network-tool.txt`);assert.ok(consoleTool.includes(`Total messages: ${raw.console_messages.length} (Errors: 0, Warnings: ${warnings.length})`));assert.ok(networkTool.includes('[200] OK'));
  const screenshots=['stopping-review','bore-review','upright-review','approach-start','approach-mid','approach-final'].map(n=>{const p=`${out}/integration-${n}.png`;return{path:p,sha256:hash(p),agent_inspected:true};});
  return{
    schema_version:1,date:raw.captured_at.slice(0,10),captured_at:raw.captured_at,
    status:warnings.length?'passed-with-recorded-webgl-performance-warnings':'passed',
    method:'direct file URI with Chromium context offline; no localhost server',protocol:raw.protocol,offline_context:raw.offline,
    standalone:'share/Mule-Integration-Studio-v6.html',standalone_sha256:hash('share/Mule-Integration-Studio-v6.html'),browser:raw.browser,
    javascript_errors:errors.length+raw.page_errors.length,browser_warnings:warnings.length,warning_details:[...new Set(warnings.map(x=>x.text))],
    mechanism_cases_reviewed:raw.mechanism_results.length,mechanism_sampled_frames:raw.mechanism_results.reduce((n,r)=>n+r.frames.length,0),mechanism_presentation:'stationary-tire-presentation-with-complete-robot-approach',
    stopping_combinations_reviewed:raw.stopping_results.length,stopping_sampled_frames:raw.stopping_results.reduce((n,r)=>n+r.frames.length,0),
    interactions:raw.interactions,failures:raw.failures,network_requests:raw.network_requests,external_requests:[],physical_trials:0,purchases:0,
    raw_evidence:{path:`${out}/browser-raw.json`,sha256:hash(`${out}/browser-raw.json`)},
    console_tool:{path:`${out}/browser-console-tool.txt`,sha256:hash(`${out}/browser-console-tool.txt`)},
    network_tool:{path:`${out}/browser-network-tool.txt`,sha256:hash(`${out}/browser-network-tool.txt`)},
    source_hashes:{'derived/mechanism-envelope-v6/report.json':hash('derived/mechanism-envelope-v6/report.json'),'derived/stopping-dynamics-v6/nominal-simulations.json':hash('derived/stopping-dynamics-v6/nominal-simulations.json')},
    seal_tool_sha256:hash('tools/seal-integration-studio-v6.js'),screenshots
  };
}
function generate(){const evidence=buildValidation();fs.writeFileSync(path.join(root,out,'browser-validation.json'),JSON.stringify(evidence,null,2)+'\n');return evidence;}
module.exports={buildValidation,generate,runKey};if(require.main===module){const e=generate();console.log(JSON.stringify({status:e.status,mechanism_cases:e.mechanism_cases_reviewed,stopping_combinations:e.stopping_combinations_reviewed,warnings:e.browser_warnings,physical_trials:e.physical_trials},null,2));}
