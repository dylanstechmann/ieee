#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const R=require(path.join(process.env.STUDIO_PHYSICS_DIR||path.join(os.homedir(),'.cache/node-copies/courselab-frontend'),'node_modules/@dimforge/rapier3d-compat'));
const {LiveMission}=require('../robot-studio-v11/physics');
async function run(){await R.init();const scenarios={nominal:{},missing:{tirePresent:false},weak:{liftForce:.2},misaligned:{tireOffset:.14},slippery:{traction:.015,tireFriction:.05},blocked:{blocked:true}};
  const runs=[];
  for(const [id,p]of Object.entries(scenarios)){
    const m=new LiveMission(R,p);try{for(let i=0;i<72001&&m.result==='running';i++)m.step(false);const s=m.snapshot();runs.push({id,...s});console.log(id,s.result,s.time.toFixed(2),s.events.at(-1).message);}finally{m.dispose();}
  }
  const fieldData=JSON.parse(fs.readFileSync(path.join(root,'derived/organizer-cad-v10/field-v10.json')));
  for(const [id,p]of Object.entries({organizer:{},'organizer-low-speed':{maxSpeed:.12},'demo-low-speed':{maxSpeed:.18},'demo-heavy-tire':{tireMass:.12}})){
    const m=new LiveMission(R,p,{arenaId:id.startsWith('organizer')?'organizer':'demo',fieldData});
    try{for(let i=0;i<72001&&m.result==='running';i++)m.step(false);const s=m.snapshot();runs.push({id,...s});console.log(id,s.result,s.time.toFixed(2),s.terminalReason);}finally{m.dispose();}
  }
  if(runs[0].result!=='passed'||runs.slice(1,4).some(r=>r.result!=='failed'))throw Error('Live outcome regression');
  const inputs=['robot-studio-v11/physics.js','robot-studio-v11/arenas.js','derived/organizer-cad-v10/field-v10.json','robot-studio-v11/physical-evidence.json','robot-studio-v11/assembly.js','robot-studio-v11/assembly-primitives.js','derived/cad-v11/manifest.json'];
  const report={schema:'live-study-v12/1',agentRun:true,engine:'Rapier 0.12.0',inputHashes:Object.fromEntries(inputs.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')])),runs,limitations:JSON.parse(fs.readFileSync(path.join(root,'robot-studio-v11/physical-evidence.json'))).limitations};
  fs.writeFileSync(path.join(root,'derived/showcase-v12/live-validation.json'),JSON.stringify(report,null,2)+'\n');
}
module.exports={run};if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});