import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {createLiveView} from './live-view.js';
import {resolveAssembly} from './assembly-spec.js';

const D=globalThis.STUDIO_V13,$=id=>document.getElementById(`v13-${id}`),IN=.0254;
if(!document.createElement('canvas').getContext('webgl2')){
  $('clock').textContent='Interactive 3D unavailable: this browser does not expose WebGL2, required by Three.js 0.170. Update iOS/Safari or open the served showcase in a modern browser.';
  $('stage-label').textContent='WEBGL2 UNAVAILABLE';document.body.dataset.studioError='webgl2-unavailable';
  throw Error('WebGL2 unavailable');
}
const scene=new THREE.Scene();scene.background=new THREE.Color('#202a30');
const renderer=new THREE.WebGLRenderer({canvas:$('canvas'),antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const camera=new THREE.PerspectiveCamera(42,1,.005,30),controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.enableZoom=false;
scene.add(new THREE.HemisphereLight(0xffffff,0x3b4146,2));
const sun=new THREE.DirectionalLight(0xffeedc,3);sun.position.set(1,3,2);scene.add(sun);
const pos=(x,y,z=0)=>new THREE.Vector3((x-48)*IN,z*IN,-(y-24)*IN);
const robot=new THREE.Group(),referenceField=new THREE.Group();scene.add(robot,referenceField);
const meshes=new Map(),moving=[];let live=null,mode='assembly',playing=false,cursor=0,selected=null,active=true;
let config=structuredClone(D.assembly),instanceNodes=new Map(),liftNode=null,gateNode=null,concept=null,assemblyRoot=null;
const customMaterials=new Map();
function materialFor(part){
  if(part.role==='purchased')return null;
  if(!customMaterials.has(part.id))customMaterials.set(part.id,new THREE.MeshStandardMaterial({
    color:{deck:0x315e76,riser:0x4b85a2,lift:0xe4a653,gate:0xd3bb82,'caster-spacer':0x50565b}[part.id]||0x8d9b9e,
    metalness:part.id==='wheel-screw'?.75:.05,roughness:.55}));
  return customMaterials.get(part.id);
}
function bytes(b64){return Uint8Array.from(atob(b64),c=>c.charCodeAt(0)).buffer;}
export async function loadPartLibrary(assets){
  const loader=new GLTFLoader(),library=new Map();
  for(const asset of assets){
    const gltf=await loader.parseAsync(bytes(asset.data),'');
    gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
    library.set(asset.id,gltf.scene);
  }
  return library;
}
export function createPartInstances(resolved,library){
  const root=new THREE.Group(),nodes=new Map(),parts=new Map(resolved.parts.map(p=>[p.id,p]));
  const concept=new THREE.Group();concept.name='concept';root.add(concept);
  const lift=new THREE.Group();lift.name='lift-carriage';concept.add(lift);
  const gate=new THREE.Group();gate.name='gate-slide';lift.add(gate);
  const spins={left:new THREE.Group(),right:new THREE.Group()};
  for(const [side,spin]of Object.entries(spins)){spin.name=`${side}-wheel-rotation`;spin.position.y=.04;root.add(spin);}
  for(const i of resolved.instances){
    const part=parts.get(i.partId),model=library.get(i.assetId).clone(true),node=new THREE.Group();
    node.name=i.id;node.userData={partId:i.partId,basis:i.basis,assetId:i.assetId};
    const custom=materialFor(part);if(custom)model.traverse(o=>{if(o.isMesh)o.material=custom;});
    node.add(model);let parent=root,offset=[0,0,0];
    if(i.motionGroup==='left-wheel'||i.motionGroup==='right-wheel'){
      parent=spins[i.motionGroup==='left-wheel'?'left':'right'];offset=[0,40,0];
    }else if(part.role==='proposed'){
      if(i.motionGroup==='gate')parent=gate;else if(i.motionGroup==='lift')parent=lift;else parent=concept;
    }
    node.position.set(...i.positionMm.map((v,index)=>(v-offset[index])/1000));
    node.rotation.set(...i.rotationDeg.map(v=>v*Math.PI/180));node.scale.set(1,1,1);parent.add(node);nodes.set(i.id,node);
  }
  return {root,nodes,moving:[spins.left,spins.right],concept,lift,gate,count:nodes.size};
}
function box(w,h,d,color,x,y,z,parent=scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.6}));m.position.set(x,y,z);parent.add(m);return m;}
function rect(r,color,height=.005,z=0){const p=pos((r[0]+r[2])/2,(r[1]+r[3])/2,z);return box((r[2]-r[0])*IN,height,(r[3]-r[1])*IN,color,p.x,p.y+height/2,p.z);}
rect([0,0,96,48],0x73797b,.018,-.71);for(const r of [[0,0,96,1],[0,47,96,48],[0,1,1,47],[95,1,96,47]])rect(r,0xd7d7d1,.1);
rect(D.field.features.center_divider.rect,0xc4c4be,IN);rect(D.field.features.pit_divider.rect,0xc4c4be,IN);
for(const b of D.field.features.pit_boxes)rect(b.rect,0x345465,.001,.04);rect(D.field.features.start_box.rect,0x48644b,.001,.04);
const mark=D.field.features.track_marking;
for(const key of ['outer_ring','inner_ring']){const points=[...mark[key],mark[key][0]].map(p=>pos(...p,.08));scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xeeeeee})));}
for(const object of [...scene.children])if(![robot,referenceField,sun].includes(object)&&!object.isLight)referenceField.attach(object);

function updateEvidence(){
  const variant=config.id.includes('16mm')?'bom-nominal-16mm':'vendor-cad-22mm';
  const results=D.fitResults.filter(r=>r.variant===config.id||r.variant===variant);
  const rows=results.map(r=>{const row=document.createElement('div');row.className=`v13-fit-row ${r.status}`;
    row.title=r.firstFailure?`${r.firstFailure.partA}/${r.firstFailure.partB}`:(r.note||'');
    for(const text of [`${r.status.toUpperCase()} · `,`${r.id} · `,`${r.measuredValueMm??'—'} mm\n`]){const span=document.createElement('span');span.textContent=text;row.append(span);}return row;
  });$('fit-summary').replaceChildren(...rows);
  $('stack').textContent=`${config.id}\nTrack ${config.physics.trackMm} mm · overall CAD width ${config.physics.overallWidthMm.toFixed(1)} mm · assembly ${config.assemblyHash.slice(0,12)}…\nPublished 16 mm shaft and archived 22 mm STEP remain separate. Motor-body gap 7.8 mm < 8 mm project gate: FAIL.`;
  $('variant').textContent=config.id.includes('16mm')?'BOM-nominal: detailed vendor body + replacement 16 mm D-shaft. Not unmodified vendor CAD.':'Original archived vendor CAD with 22 mm shaft; comparison only, not the selected published specification.';
}
function rebuild(){
  live?.restoreAssembly();robot.clear();moving.length=0;
  const resolved=resolveAssembly(config,{liftMm:0,gateOpen:0}),built=createPartInstances(resolved,meshes);
  assemblyRoot=built.root;robot.add(assemblyRoot);moving.push(...built.moving);instanceNodes=built.nodes;concept=built.concept;liftNode=built.lift;gateNode=built.gate;
  concept.visible=$('mechanism').checked;updateEvidence();
}
let lastFrame=null,lastFraming=null;
function frameBox(box){
  lastFrame=box.clone();const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  const vertical=THREE.MathUtils.degToRad(camera.fov),horizontal=2*Math.atan(Math.tan(vertical/2)*camera.aspect);
  const distance=Math.max(.08,size.length()/(2*Math.tan(Math.min(vertical,horizontal)/2)))*1.16;
  const direction=new THREE.Vector3(.9,.65,1).normalize();camera.position.copy(center).addScaledVector(direction,distance);camera.lookAt(center);controls.target.copy(center);controls.update();camera.updateMatrixWorld(true);
  const corners=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])corners.push(new THREE.Vector3(x,y,z).project(camera));
  const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y);lastFraming={center:center.toArray(),sizeMm:size.length()*1000,ndcBounds:[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]};return lastFraming;
}
function presentMode(value){
  $('workspace').dataset.mode=value;delete $('clock').dataset.result;
  $('stage-label').textContent={sequence:'ASSEMBLY → LIVE / NATIVE SCALE',live:'LIVE PHYSICS / CONTACT STUDY',assembly:'CAD ASSEMBLY / NATIVE SCALE',replay:'HISTORICAL REPLAY / RECORDED STATES'}[value];
}
function view(which){
  if(which==='robot'){robot.updateWorldMatrix(true,true);return frameBox(new THREE.Box3().setFromObject(robot));}
  lastFrame=null;const target=new THREE.Vector3();controls.target.copy(target);camera.position.copy(target).add(new THREE.Vector3(1.9,2.3,2.1));controls.update();
}
function select(partId){
  selected=partId;for(const button of $('parts').querySelectorAll('button'))button.classList.toggle('active',button.dataset.partId===partId);const p=config.parts.find(p=>p.id===partId);if(!p){$('detail').textContent='Select a component to inspect its evidence.';return;}
  const sources=(p.sourceIds||[]).map(id=>D.sources.find(s=>s.id===id)).filter(Boolean);
  $('detail').textContent=`${p.id}${p.sku?' · SKU #'+p.sku:''}\nRole: ${p.role} · ${p.geometryMode}\nBOM: ${p.bomId||'unselected proposed mechanism'}\n${(p.omissions||[]).join('\n')||'No additional recorded omission.'}\n${sources.map(s=>`Source: ${s.path}\nSHA-256 ${s.sha256}`).join('\n')||'Proposed custom geometry; no selected SKU.'}`;
}
for(const part of D.assembly.parts){const button=document.createElement('button');button.textContent=`${part.id}${part.sku?' #'+part.sku:''}`;button.dataset.partId=part.id;button.onclick=()=>select(part.id);$('parts').append(button);}
const ray=new THREE.Raycaster();
$('canvas').addEventListener('pointerup',event=>{const r=$('canvas').getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),camera);const hit=ray.intersectObject(robot,true)[0];if(hit){let o=hit.object;while(o&&!o.userData.partId)o=o.parent;if(o)select(o.userData.partId);}});
function focusPart(partId){
  setMode('assembly');for(const node of instanceNodes.values())node.visible=false;const node=instanceNodes.get([...instanceNodes.keys()].find(id=>id===partId||id.endsWith(`-${partId}`)||id.includes(`-${partId}-`)))||[...instanceNodes.values()].find(n=>n.userData.partId===partId);
  if(!node)throw Error(`Unknown visible part: ${partId}`);for(let o=node;o&&o!==robot;o=o.parent)o.visible=true;
  referenceField.visible=false;robot.updateWorldMatrix(true,true);const bounds=new THREE.Box3().setFromObject(node),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()).length();
  const framing=frameBox(bounds);select(node.userData.partId);
  return {node:node.name,framing,center:center.toArray(),size,camera:camera.position.toArray(),target:controls.target.toArray(),bounds:[bounds.min.toArray(),bounds.max.toArray()],robotPosition:robot.position.toArray(),worldPosition:node.getWorldPosition(new THREE.Vector3()).toArray(),visible:node.visible};
}
function showAll(){for(const node of instanceNodes.values())node.visible=true;concept.visible=$('mechanism').checked;referenceField.visible=true;return view('robot');}
function renderReplay(){
  const run=D.runs[$('scenario').value],i=Math.min(run.p.length-1,Math.floor(cursor)),p=run.p[i];robot.position.copy(pos(p[0],p[1]));robot.rotation.y=p[2]*Math.PI/180;
  const event=[...run.events].reverse().find(e=>e[0]<=run.t[i]);$('clock').textContent=`${(run.t[i]-run.start).toFixed(1)} s · ${event?event[1]:'Before start'}${run.touch[i]?' · VEHICLE OVERLAP (ghost contact)':''}`;
  $('seek').value=i;$('events').textContent=run.events.map(e=>`${e[0]<=run.t[i]?'●':'○'} ${(e[0]-run.start).toFixed(1)} s — ${e[1]}`).join('\n');
}

$('play').onclick=()=>{if(mode!=='replay')setMode('replay');playing=!playing;$('play').textContent=playing?'Pause':'Play';};
$('seek').oninput=()=>{playing=false;cursor=Number($('seek').value);$('play').textContent='Play';renderReplay();};
$('scenario').onchange=()=>{cursor=0;playing=false;$('play').textContent='Play';$('seek').max=D.runs[$('scenario').value].p.length-1;renderReplay();};
$('reset').onclick=()=>{cursor=0;playing=false;$('play').textContent='Play';if(mode==='replay')renderReplay();};
function setMode(value){
  live?.restoreAssembly();mode=value;presentMode(value);playing=false;$('play').textContent='Play';const isLive=['live','sequence'].includes(value);
  referenceField.visible=!isLive;live?.enter(value);
  if(isLive){$('mode').value=value;$('transport').hidden=true;return;}
  if(liftNode)liftNode.position.y=0;if(gateNode){gateNode.position.x=0;gateNode.visible=true;}
  robot.position.copy(value==='assembly'?pos(60,18):robot.position);if(value==='assembly'){robot.rotation.y=0;$('clock').textContent='Source-evidenced CAD assembly · no live dynamics';view('robot');}
  else{cursor=0;renderReplay();view('field');}$('mode').value=value;$('transport').hidden=mode!=='replay';
}
$('mode').onchange=()=>setMode($('mode').value);
$('close').onclick=()=>['live','sequence'].includes(mode)?live.view('robot'):view('robot');$('field').onclick=()=>['live','sequence'].includes(mode)?live.view('field'):view('field');
$('zoom').onchange=()=>{controls.enableZoom=$('zoom').checked;};
$('fullscreen').onclick=()=>{$('workspace').requestFullscreen?.();};
$('mechanism').onchange=()=>{if(concept)concept.visible=$('mechanism').checked;};
$('shaft-variant').onchange=()=>{config=structuredClone(D.assemblies[$('shaft-variant').value]);rebuild();setMode('assembly');};
const observer=new IntersectionObserver(entries=>{active=entries[0].isIntersecting;});observer.observe($('workspace'));
function resize(){const c=$('canvas'),w=c.clientWidth,h=c.clientHeight;if(w&&h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(mode==='assembly'&&lastFrame)frameBox(lastFrame);}}
new ResizeObserver(resize).observe($('canvas'));
let previous=performance.now();
function frame(now){const dt=Math.min((now-previous)/1000,.1);previous=now;if(active){live?.tick(dt);if(playing&&mode==='replay'){const run=D.runs[$('scenario').value];cursor=Math.min(run.p.length-1,cursor+dt*Number($('rate').value)/run.dt);renderReplay();if(cursor===run.p.length-1){playing=false;$('play').textContent='Play';}}controls.update();renderer.render(scene,camera);}requestAnimationFrame(frame);}
async function start(){
  const library=await loadPartLibrary(D.assets);for(const [id,model]of library)meshes.set(id,model);
  rebuild();select('motor');resize();
  live=await createLiveView({scene,robot,camera,controls,moving,mechanism:()=>concept,joints:()=>({lift:liftNode,gate:gateNode}),assemblyNodes:()=>[...instanceNodes.values()],getConfig:()=>structuredClone(config),$,onMode:value=>{mode=value;presentMode(value);$('mode').value=value;}});
  globalThis.robotStudioV13={getDiagnostics:()=>({ready:true,mode,playing:mode==='replay'?playing:live.playing,cursor,selected,assemblyId:config.id,assemblyHash:config.assemblyHash,assets:meshes.size,instanceCount:instanceNodes.size,framing:lastFraming,livePhysics:true,live:live.state,assembly:live.assemblyProgress}),setMode,advanceLive:steps=>live.advance(steps),focusPart,showAll};
  document.body.dataset.studioReady='true';setMode('sequence');requestAnimationFrame(frame);
}
start().catch(e=>{$('clock').textContent='Physics initialization failed: '+e.message;document.body.dataset.studioError=e.message;console.error(e);});


