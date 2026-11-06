import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {LiveMission,DEFAULTS,DT} from './physics.js';

// Presentation is a consumer of plant state; it never moves the dynamic tire.
export async function createLiveView({scene,robot,camera,controls,moving,mechanism,getConfig,$,onMode}) {
  await RAPIER.init();
  const arena=new THREE.Group();scene.add(arena);arena.visible=false;
  const material=(color,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness:.65,metalness});
  const meshBox=(w,h,d,color,x,y,z,parent=arena)=>{
    const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));o.position.set(x,y,z);parent.add(o);return o;
  };
  let mission=null,state=null,playing=false,assemblyTime=0,activeMode='assembly',accumulator=0,follow=false,collision=false;
  let tireMesh=null,debugLines=null,pathLine=null,poses=[],lastRenderSeconds=-1,assemblyDuration=0,runIdentity=null;
  const overrides={};
  const rows=[['chassisMass','Chassis mass','kg',.2,8,.05],['tireMass','Tire mass','kg',.01,3,.01],
    ['traction','Wheel / floor traction','μ',.001,1.5,.01],['tireFriction','Tire / tray friction','μ',0,2,.05],
    ['motorTorque','Available torque per motor','N·m',.001,1,.01],['liftForce','Lift force limit','N',0,30,.5],
    ['maxSpeed','Cruise speed cap','m/s',.05,.5,.01],['tireOffset','Source tire lateral offset','m',-.15,.15,.01]];
  for(const [key,label,unit,min,max,step] of rows){
    const wrap=document.createElement('label');wrap.className='v11-parameter';
    const text=document.createElement('span');text.textContent=`${label} (${unit})`;
    const input=document.createElement('input');input.type='number';input.min=min;input.max=max;input.step=step;input.value=DEFAULTS[key];input.id=`v11-physical-${key}`;
    input.onchange=()=>{const v=Number(input.value);if(!Number.isFinite(v)||v<min||v>max){input.value=overrides[key]??DEFAULTS[key];return;}overrides[key]=v;reset();};
    wrap.append(text,input);$('parameters').append(wrap);
  }
  function clearArena(){arena.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.dispose();}}});arena.clear();}
  function buildArena(){
    clearArena();meshBox(mission.arena.board.width,.04,mission.arena.board.depth,0x36464c,0,-.02,0);
    const grid=new THREE.GridHelper(mission.arena.board.width,24,0x657776,0x42555b);grid.position.y=.001;arena.add(grid);
    for(const o of mission.visualObstacles){
      if(o.kind==='couch'){
        const sofa=new THREE.Group();sofa.position.set(o.x,0,o.z);arena.add(sofa);
        meshBox(o.hx*2,.07,o.hz*2,0x9a6a48,0,.055,0,sofa);
        meshBox(o.hx*2,.09,.03,0xb38560,0,.115,-o.hz+.015,sofa);
        for(const s of [-1,1])meshBox(.025,.11,o.hz*2,0x795139,s*(o.hx-.0125),.085,0,sofa);
        for(const s of [-1,1])meshBox(.06,.012,.12,0xcc9c71,s*.04,.097,.01,sofa);
      }else meshBox(o.hx*2,o.height,o.hz*2,o.kind==='wall'?0x8e9fa3:0x657b85,o.x,o.height/2,o.z);
    }
    for(const [p,color,label]of [[mission.source,0xd6ad64,'PICKUP'],[mission.destination,0x6bbda1,'DELIVERY']]){
      meshBox(.24,.002,.22,color,p.x,.002,p.z);
      for(const s of [-1,1])meshBox(.114,.018,.008,0xccccbb,p.x,.009,p.z+s*.044);
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;
      const ctx=canvas.getContext('2d');ctx.fillStyle='#dbe3df';ctx.font='bold 28px monospace';ctx.textAlign='center';ctx.fillText(label,128,42);
      const texture=new THREE.CanvasTexture(canvas);const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));sprite.position.set(p.x,.30,p.z);sprite.scale.set(.35,.0875,1);arena.add(sprite);
    }
    // Draw the nominal lap loop. Planning detours around inflated couch footprints.
    const points=[...mission.loop,mission.loop[0]].map(p=>new THREE.Vector3(p.x,.005,p.z));
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineDashedMaterial({color:0xa9c9c2,dashSize:.04,gapSize:.025}));line.computeLineDistances();arena.add(line);
    tireMesh=new THREE.Mesh(new THREE.TorusGeometry(.039,.011,10,28),material(0x15191b));tireMesh.rotation.x=Math.PI/2;
    const tireGroup=new THREE.Group();tireGroup.add(tireMesh);tireMesh=tireGroup;arena.add(tireMesh);
    debugLines=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.65}));arena.add(debugLines);
    pathLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xe5ad50}));arena.add(pathLine);
  }
  function snapshotAssembly(){
    restoreAssembly();poses=robot.children.map((o,i)=>({o,position:o.position.clone(),rotation:o.quaternion.clone(),index:i}));assemblyDuration=poses.length*.48+1.5;
  }
  function restoreAssembly(){for(const p of poses){p.o.position.copy(p.position);p.o.quaternion.copy(p.rotation);p.o.visible=true;}poses=[];}
  function assemble(t){
    const count=poses.length;
    for(const p of poses){const stage=p.index*.48,u=THREE.MathUtils.clamp((t-stage)/1.5,0,1),e=u*u*(3-2*u);
      p.o.position.copy(p.position);p.o.position.y+=(1-e)*(.18+(p.index%3)*.05);p.o.position.x+=(1-e)*(p.index%2?-.17:.17);
      p.o.quaternion.copy(p.rotation);p.o.rotateY((1-e)*.7*(p.index%2?1:-1));p.o.visible=t>stage-.5;
    }
    const duration=count*.48+1.5;
    $('assembly-status').textContent=t<duration?`Assembly sequence · ${Math.min(count,Math.floor(t/.48)+1)} / ${count} groups seated`:'Assembly complete · starting live mission';
    return t>=duration;
  }
  function parameters(){
    const scenario=$('live-scenario').value;
    return {...overrides,wheelRadius:Number($('diameter').value)/2000,
      ...(scenario==='missing'?{tirePresent:false}:{}),...(scenario==='weak'?{liftForce:.2}:{}),
      ...(scenario==='slippery'?{traction:.015,tireFriction:.05}:{}),...(scenario==='blocked'?{blocked:true}:{}),
      ...(scenario==='misaligned'?{tireOffset:.14}:{})};
  }
  function reset(){
    mission?.dispose();const config=getConfig();mission=new LiveMission(RAPIER,parameters(),{arenaId:$('arena').value,fieldData:globalThis.STUDIO_V11.field});state=mission.snapshot();playing=false;accumulator=0;
    runIdentity={assemblyId:config.id,assemblyRevision:config.revision,arenaId:mission.arena.id,physicalModelRevision:'contact-evidence-v12/1',parameterProfileId:'editable-assumptions-v12/1'};
    buildArena();lastRenderSeconds=-1;$('live-play').textContent='Run mission';sync();
    $('live-model').textContent=`${JSON.stringify(runIdentity)}\n${mission.arena.label}: ${mission.arena.board.width.toFixed(4)} × ${mission.arena.board.depth.toFixed(4)} m. ${mission.arena.provenance}.\nNew run · ${JSON.stringify(state.parameters)}`;
  }
  function view(which){
    if(which==='robot'){controls.target.copy(robot.position).add(new THREE.Vector3(0,.08,0));camera.position.copy(controls.target).add(new THREE.Vector3(.55,.40,.60));}
    else{controls.target.set(-.15,0,0);camera.position.set(2.8,3.8,3.8);}controls.update();
  }
  function enter(mode){
    restoreAssembly();activeMode=mode;arena.visible=['live','sequence'].includes(mode);playing=false;
    if(mode==='sequence'){
      reset();snapshotAssembly();assemblyTime=0;playing=true;robot.position.set(mission.arena.start.x,0,mission.arena.start.z);robot.rotation.y=0;
      view('robot');assemble(0);$('assembly-status').hidden=false;
    }else if(mode==='live'){reset();sync();view('field');$('assembly-status').hidden=true;}
    else{$('assembly-status').hidden=true;}
    $('live-controls').hidden=!arena.visible;
    $('live-play').textContent=playing?'Pause':'Run mission';
  }
  function sync(){
    if(!state)return;
    if(activeMode!=='sequence'||!poses.length){
      robot.position.set(state.robot.x,state.robot.y,state.robot.z);robot.rotation.set(0,state.robot.yaw,0);
      moving.forEach((o,i)=>{o.rotation.z=(state.wheelAngles[i]??0)*(i===0?-1:1);});
      if(mechanism()){
        mechanism().position.y=state.lift;
        const gate=mechanism().getObjectByName('gate');if(gate)gate.visible=state.lift>.025;
      }
    }
    if(state.tire){tireMesh.visible=true;tireMesh.position.set(state.tire.x,state.tire.y,state.tire.z);tireMesh.quaternion.set(state.tire.rotation.x,state.tire.rotation.y,state.tire.rotation.z,state.tire.rotation.w);}else tireMesh.visible=false;
    $('clock').textContent=`LIVE · ${state.time.toFixed(1)} s · ${state.phase.replace(/-/g,' ')} · laps ${state.laps}/3 · ${state.result.toUpperCase()}`;
    $('live-telemetry').textContent=`${mission.arena.label} · ${runIdentity.assemblyId}\nL / R commands ${state.command.left.toFixed(3)} / ${state.command.right.toFixed(3)} m/s\nLift ${(state.lift*1000).toFixed(0)} mm · tire height ${state.tire?(state.tire.y*1000).toFixed(0):'absent'} mm\nCarried ${state.carriedSeconds.toFixed(1)} s · obstacle contacts ${state.contacts}\nContinuous pickup support ${state.evidence.supportDuration.toFixed(3)} s · independent fixture release ${state.evidence.releaseDuration.toFixed(3)} s\nFixed step 1/120 s · no tire attachment or pose writes`;
    $('events').textContent=state.events.map(e=>`${e.time.toFixed(2)} s — ${e.message}`).join('\n');
    if(collision){const debug=mission.world.debugRender();debugLines.geometry.dispose();debugLines.geometry=new THREE.BufferGeometry();debugLines.geometry.setAttribute('position',new THREE.BufferAttribute(debug.vertices,3));debugLines.geometry.setAttribute('color',new THREE.BufferAttribute(debug.colors,4));}
    debugLines.visible=collision;
    if(Math.floor(state.time*4)!==lastRenderSeconds){pathLine.geometry.dispose();pathLine.geometry=new THREE.BufferGeometry().setFromPoints([state.robot,...state.path].map(p=>new THREE.Vector3(p.x,.008,p.z)));lastRenderSeconds=Math.floor(state.time*4);}
    if(follow){controls.target.lerp(robot.position.clone().add(new THREE.Vector3(0,.08,0)),.08);}
  }
  function tick(dt){
    if(!arena.visible||!playing)return;
    const rate=Number($('live-rate').value);
    if(activeMode==='sequence'&&poses.length){assemblyTime+=dt*Math.min(rate,2);if(assemble(assemblyTime)){restoreAssembly();activeMode='live';onMode('live');view('field');$('assembly-status').textContent='Assembly complete → live physics mission';}else return;}
    accumulator+=dt*rate;let steps=0;
    while(accumulator>=DT&&steps<480&&mission.result==='running'){mission.step(false);accumulator-=DT;steps++;}
    state=mission.snapshot();
    if(steps===480)accumulator=Math.min(accumulator,DT*480);
    if(state.result!=='running'){playing=false;$('live-play').textContent='Run finished — reset to repeat';}
    sync();
  }
  $('live-play').onclick=()=>{if(state.result!=='running')reset();playing=!playing;$('live-play').textContent=playing?'Pause':'Resume';};
  $('live-reset').onclick=()=>{restoreAssembly();reset();if(activeMode==='sequence')enter('sequence');};
  $('live-scenario').onchange=()=>{reset();if(activeMode==='sequence')enter('sequence');};
  $('arena').onchange=()=>{restoreAssembly();reset();if(activeMode==='sequence')enter('sequence');else view('field');};
  $('follow').onchange=()=>{follow=$('follow').checked;};$('colliders').onchange=()=>{collision=$('colliders').checked;sync();};
  $('export-run').onclick=()=>{
    const report={schema:'live-mission-v12/1',generatedBy:'agent-authored digital study, not physical qualification',...runIdentity,
      physicalProfile:'editable-assumptions-v12/1',engine:'Rapier 0.12.0',fixedStep:DT,state:mission.snapshot(),limitations:globalThis.STUDIO_V11.physicalEvidence.limitations};
    const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='robot-live-run.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  reset();
  return {enter,tick,view,reset,restoreAssembly,get state(){return {...state,identity:runIdentity};},get playing(){return playing;},
    advance:steps=>{restoreAssembly();for(let i=0;i<steps&&mission.result==='running';i++)mission.step(false);state=mission.snapshot();sync();return state;},
    get assemblyProgress(){return {time:assemblyTime,remaining:poses.length,duration:assemblyDuration};},dispose:()=>mission?.dispose()};
}