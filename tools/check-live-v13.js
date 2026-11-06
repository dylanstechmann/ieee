#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const R=require(path.join(process.env.STUDIO_PHYSICS_DIR||path.join(os.homedir(),'.cache/node-copies/courselab-frontend'),'node_modules/@dimforge/rapier3d-compat'));
const {LiveMission}=require('../robot-studio-v13/physics');
const assembly=require('../derived/cad-v13/assembly-spec.json');
const ready=R.init();
async function runCase({id,parameters={},arenaId='demo',fieldData=null,maxSteps=72001}){
  await ready;const mission=new LiveMission(R,parameters,{assembly,arenaId,fieldData,profileId:'v13-jointed-gate'});
  try{for(let i=0;i<maxSteps&&mission.result==='running';i++)mission.step(false);return {id,...mission.snapshot()};}
  finally{mission.dispose();}
}
async function run(){
  const fieldData=JSON.parse(fs.readFileSync(path.join(root,'derived/organizer-cad-v10/field-v10.json')));
  const cases=[
    {id:'nominal'},{id:'missing',parameters:{tirePresent:false}},{id:'weak',parameters:{liftForce:.2}},
    {id:'misaligned',parameters:{tireOffset:.14}},{id:'organizer',arenaId:'organizer',fieldData},
    {id:'demo-heavy-tire',parameters:{tireMass:.12}}
  ];
  const runs=[];for(const options of cases){const result=await runCase(options);runs.push(result);console.log(options.id,result.result,result.time.toFixed(2),result.terminalReason);}
  if(runs[0].result!=='passed'||runs.slice(1,4).some(r=>r.result!=='failed'))throw Error('V13 live outcome regression');
  const inputs=['robot-studio-v13/physics.js','robot-studio-v13/assembly-spec.js','robot-studio-v11/arenas.js',
    'derived/cad-v13/assembly-spec.json','derived/cad-v13/manifest.json','derived/organizer-cad-v10/field-v10.json',
    'robot-studio-v13/physical-evidence.json'];
  const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
  const report={schema:'live-study-v13/1',agentRun:true,engine:'Rapier 0.12.0',physicsProfile:'v13-jointed-gate',
    inputHashes:Object.fromEntries(inputs.map(f=>[f,hash(f)])),runs,
    limitations:JSON.parse(fs.readFileSync(path.join(root,'robot-studio-v13/physical-evidence.json'))).limitations};
  fs.writeFileSync(path.join(root,'derived/showcase-v13/live-validation.json'),JSON.stringify(report,null,2)+'\n');
}
module.exports={run,runCase};if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
