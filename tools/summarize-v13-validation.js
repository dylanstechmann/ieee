#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const fit=read('derived/cad-v13/fit-results.json'),live=read('derived/showcase-v13/live-validation.json'),browser=read('derived/showcase-v13/browser-validation.json');
const assembly=read('derived/showcase-v13/assembly-manifest.json'),cad=read('derived/cad-v13/manifest.json'),build=read('derived/showcase-v13/build-manifest.json');
const statuses=fit.results.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{});
const mission=r=>({id:r.id,result:r.result,timeS:r.time,laps:r.laps,terminalReason:r.terminalReason,carriedS:r.carriedSeconds,peakTireHeightM:r.peakTireHeight,supportDurationS:r.evidence.supportDuration,releaseDurationS:r.evidence.releaseDuration});
const summary={schema:'showcase-v13-validation-summary/1',generatedBy:'agent-authored deterministic projection of saved reports; not physical qualification',
  html:{file:'share/Showcase-v13.html',sha256:build.output.sha256,bytes:build.output.bytes},
  cad:{assets:cad.assets.length,sources:cad.sources.length,instances:assembly.nodeCount,assemblyId:assembly.id,assemblyHash:assembly.assemblyHash,fitStatuses:statuses,gateTravelSamples:fit.gateTravelSamples,qualification:fit.qualification},
  headless:{engine:live.engine,physicsProfile:live.physicsProfile,runs:live.runs.map(mission)},
  browser:{browser:browser.browser,htmlSha256:browser.htmlSha256,offline:browser.offline,protocol:browser.protocol,checks:browser.checks,errorCount:browser.errors.length,externalRequestCount:browser.externalRequests.length,narrowOverflow:browser.narrowOverflow,screenshots:browser.screenshots,nominal:mission(browser.live),organizer:mission(browser.organizer),limitations:browser.limitations},
  fullCheck:null,limitations:['A digital pass is not received-part metrology, manufacturing approval, actuator sizing, competition scoring or hardware qualification.','Known motor-gap and shaft-source failures remain visible; organizer acquisition fails.']};
const checkPath=process.argv[2];if(checkPath){const full=JSON.parse(fs.readFileSync(path.resolve(checkPath),'utf8')),node=full.steps.find(s=>s.stage==='node');summary.fullCheck={source:path.resolve(checkPath),verdict:full.verdict,seconds:full.seconds,node:node?.counts,python:full.steps.filter(s=>s.stage==='python').map(s=>({name:s.name,status:s.status,counts:s.counts})),verifiers:{total:full.steps.filter(s=>s.stage==='verifier').length,passed:full.steps.filter(s=>s.stage==='verifier'&&s.status==='PASS').length},treeUnchanged:full.tree.unchanged,started:full.started};}
if(browser.htmlSha256!==build.output.sha256)throw Error('Browser report and current HTML differ');
for(const shot of browser.screenshots){const file=path.join(root,shot);if(!fs.existsSync(file)||fs.statSync(file).size<10000)throw Error(`Missing or blank-looking screenshot: ${shot}`);}
fs.writeFileSync(path.join(root,'derived/showcase-v13/validation-summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({fit:statuses,headless:summary.headless.runs.map(r=>[r.id,r.result]),browserChecks:browser.checks.length,fullCheck:summary.fullCheck?.verdict||'not supplied'}));
