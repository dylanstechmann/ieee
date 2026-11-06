import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { resolve } from './dimensions.js';
import {createLiveView} from './live-view.js';
import {assemblyInstances} from './assembly.js';

const D = globalThis.STUDIO_V11;
const $ = id => document.getElementById(`v11-${id}`);
const IN = 0.0254, MM = 0.001;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#202a30');
const renderer = new THREE.WebGLRenderer({ canvas: $('canvas'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const camera = new THREE.PerspectiveCamera(42, 1, 0.005, 30);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.enableZoom = false;
scene.add(new THREE.HemisphereLight(0xffffff, 0x3b4146, 2));
const sun = new THREE.DirectionalLight(0xffeedc, 3); sun.position.set(1, 3, 2); scene.add(sun);
const pos = (x,y,z=0) => new THREE.Vector3((x-48)*IN,z*IN,-(y-24)*IN);
const colors = {deck:0x315e76,riser:0x4b85a2,motor:0x92999b,shaft:0xdadbd6,hub:0xcbd0d3,wheel:0x222426,tire:0x121314,rim:0x30363b,bracket:0xb7bfc1,caster:0x4c5458,ball:0xd5dbdf};
const meshes = new Map(), robot = new THREE.Group(), moving = [];
scene.add(robot);
let selected = null, playing = false, cursor = 0, mode = 'assembly', active = true, live = null;
let config = structuredClone(D.config);
function box(w,h,d,color,x,y,z,parent=scene) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshStandardMaterial({color,roughness:0.6}));
  mesh.position.set(x,y,z); parent.add(mesh); return mesh;
}
function rect(r,color,height=0.005,z=0) {
  const p=pos((r[0]+r[2])/2,(r[1]+r[3])/2,z);
  return box((r[2]-r[0])*IN,height,(r[3]-r[1])*IN,color,p.x,p.y+height/2,p.z);
}
const referenceField=new THREE.Group();scene.add(referenceField);
rect([0,0,96,48],0x73797b,0.018,-0.71);
for(const r of [[0,0,96,1],[0,47,96,48],[0,1,1,47],[95,1,96,47]])rect(r,0xd7d7d1,0.1);
rect(D.field.features.center_divider.rect,0xc4c4be,IN);
rect(D.field.features.pit_divider.rect,0xc4c4be,IN);
for(const b of D.field.features.pit_boxes)rect(b.rect,0x345465,0.001,0.04);
rect(D.field.features.start_box.rect,0x48644b,0.001,0.04);
const mark=D.field.features.track_marking;
for(const key of ['outer_ring','inner_ring']) {
  const points=[...mark[key],mark[key][0]].map(p=>pos(...p,0.08));
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xeeeeee})));
}
const loader = new STLLoader();
for(const object of [...scene.children])if(object!==robot&&object!==referenceField&&!object.isLight)referenceField.attach(object);
for(const asset of D.assets) {
  const bytes=Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0));
  const geometry=loader.parse(bytes.buffer);
  geometry.scale(MM,MM,MM); geometry.rotateX(-Math.PI/2); geometry.computeVertexNormals();
  meshes.set(asset.id,geometry);
}
const ray = new THREE.Raycaster();
function instance(part,component,parent,at=[0,0,0],rotate=0) {
  const mesh=new THREE.Mesh(meshes.get(`${part}-${component}`),new THREE.MeshStandardMaterial({
    color:colors[component]??colors[part]??0xaaaaaa,metalness:['tire','rim','deck','riser'].includes(component)||['wheel','deck','riser'].includes(part)?0.05:0.7,roughness:0.5}));
  mesh.position.set(...at);mesh.rotation.y=rotate;mesh.userData.partId=part;parent.add(mesh);return mesh;
}
function rebuild() {
  live?.restoreAssembly();
  robot.traverse(o=>{if(o.isMesh){o.material.dispose();if(![...meshes.values()].includes(o.geometry))o.geometry.dispose();}}); robot.clear(); moving.length=0;
  const g=resolve(config),d=config.dimensions;
  const placement=new Map(assemblyInstances(config).instances.map(i=>[i.id,i]));
  instance('deck','body',robot,placement.get('deck').position);
  for(const side of [-1,1]) {
    const holder=new THREE.Group();holder.position.set(...placement.get(`${side<0?'left':'right'}-motor-housing`).position);holder.rotation.y=side<0?Math.PI:0;robot.add(holder);
    instance('motor','housing',holder);instance('motor','shaft',holder);instance('bracket','body',holder);
    const wheel=new THREE.Group();wheel.position.set(...placement.get(`${side<0?'left':'right'}-wheel-tire`).position);wheel.rotation.y=side<0?Math.PI:0;robot.add(wheel);
    const rotation=new THREE.Group();wheel.add(rotation);moving.push(rotation);
    const tire=instance('wheel','tire',rotation);const rim=instance('wheel','rim',rotation);
    for(const m of [tire,rim])m.scale.set(d.wheelDiameterMm/80,d.wheelDiameterMm/80,1);
    instance('hub','body',rotation,[0,0,5*MM]);
  }
  for(const x of [-75,75]) {
    const r=instance('riser','body',robot,[x*MM,(g.deckBottomMm-g.casterRiserMm)*MM,0]);
    r.scale.y=g.casterRiserMm/6.91;
    instance('caster','body',robot,[x*MM,0,0]);instance('caster','ball',robot,[x*MM,0,0]);
  }
  const mechanism=new THREE.Group();robot.add(mechanism);mechanism.name='concept';
  for(const p of assemblyInstances(config).primitives){
    const parent=['lift','gate'].includes(p.motion)?mechanism:robot;
    const m=box(...p.size,p.color,...p.position,parent);m.name=p.id;m.userData.partId=p.partId;
  }
  mechanism.visible=$('mechanism').checked;
  $('stack').textContent=`Track ${g.trackMm.toFixed(1)} mm · axle ${g.axleHeightMm.toFixed(1)} mm · deck top ${g.deckTopMm.toFixed(2)} mm · riser ${g.casterRiserMm.toFixed(3)} mm. ${g.checks.every(c=>c.pass)?'Support arithmetic passes.':'SUPPORT CHECK FAILED.'} Motor mating length remains unresolved.`;
}
function view(which) {
  const target=which==='field'?new THREE.Vector3():robot.position.clone().add(new THREE.Vector3(0,.04,0));
  controls.target.copy(target);camera.position.copy(target).add(which==='field'?new THREE.Vector3(1.9,2.3,2.1):new THREE.Vector3(.38,.28,.42));controls.update();
}
function select(partId) {
  selected=partId;
  const p=D.parts.find(p=>p.id===partId);
  const reservations={'battery-reservation':'Generic battery packaging reservation, assumed 180 g. No battery chemistry, SKU, current rating, protection or charger is selected. Not a purchase-ready design.',
    'controller-reservation':'Generic controller packaging reservation, included in assumed 100 g electronics allowance. No specific board, driver, sensor or wiring is selected.',
    lift:'Proposed 150 mm travel lift and captive fork tray, assumed 8 N actuator force budget. Generic editable mechanism, not a selected actuator or mechanically qualified lift.'};
  $('detail').textContent=p?`${p.name}${p.sku?' · SKU '+p.sku:''}\nSource: ${p.evidence}\n${p.limitations.join('\n')}\nParameters (mm): ${JSON.stringify(p.parameters)}`:reservations[partId]||'Select a component to inspect its parameters and limitations.';
}
for(const part of D.parts) {
  const button=document.createElement('button');button.textContent=`${part.name}${part.sku?' #'+part.sku:''}`;
  button.onclick=()=>select(part.id);$('parts').append(button);
}
$('canvas').addEventListener('pointerup',event=>{
  const r=$('canvas').getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),camera);
  const hit=ray.intersectObject(robot,true)[0];if(hit)select(hit.object.userData.partId);
});
function renderReplay() {
  const run=D.runs[$('scenario').value],i=Math.min(run.p.length-1,Math.floor(cursor)),p=run.p[i];
  robot.position.copy(pos(p[0],p[1]));robot.rotation.y=p[2]*Math.PI/180;
  const event=[...run.events].reverse().find(e=>e[0]<=run.t[i]);
  $('clock').textContent=`${(run.t[i]-run.start).toFixed(1)} s · ${event?event[1]:'Before start'}${run.touch[i]?' · VEHICLE OVERLAP (ghost contact)':''}`;
  $('seek').value=i;
  $('events').textContent=run.events.map(e=>`${e[0]<=run.t[i]?'●':'○'} ${(e[0]-run.start).toFixed(1)} s — ${e[1]}`).join('\n');
}
$('play').onclick=()=>{if(mode!=='replay')setMode('replay');playing=!playing;$('play').textContent=playing?'Pause':'Play';};
$('seek').oninput=()=>{playing=false;cursor=Number($('seek').value);$('play').textContent='Play';renderReplay();};
$('scenario').onchange=()=>{cursor=0;playing=false;$('play').textContent='Play';$('seek').max=D.runs[$('scenario').value].p.length-1;renderReplay();};
$('reset').onclick=()=>{cursor=0;playing=false;$('play').textContent='Play';if(mode==='replay')renderReplay();};
function setMode(value) {
  live?.restoreAssembly();
  mode=value;playing=false;$('play').textContent='Play';
  const isLive=['live','sequence'].includes(mode);referenceField.visible=!isLive;
  live?.enter(mode);
  if(isLive){$('mode').value=value;$('transport').hidden=true;return;}
  if(robot.getObjectByName('concept'))robot.getObjectByName('concept').position.y=0;
  if(mode==='assembly'){robot.position.copy(pos(60,18));robot.rotation.y=0;$('clock').textContent='Editable CAD assembly · no live dynamics';view('robot');}
  else {cursor=0;renderReplay();view('field');}
  $('mode').value=value; $('transport').hidden=mode!=='replay';
}
$('mode').onchange=()=>setMode($('mode').value);
$('close').onclick=()=>['live','sequence'].includes(mode)?live.view('robot'):view('robot');$('field').onclick=()=>['live','sequence'].includes(mode)?live.view('field'):view('field');
$('zoom').onchange=()=>{controls.enableZoom=$('zoom').checked;};
$('mechanism').onchange=()=>{robot.getObjectByName('concept').visible=$('mechanism').checked;};
$('diameter').onchange=()=>{
  const value=Number($('diameter').value);if(!Number.isFinite(value)||value<60||value>100){$('diameter').value=config.dimensions.wheelDiameterMm;return;}
  if(value===config.dimensions.wheelDiameterMm)return;
  playing=false;config={...config,id:'hypothetical-wheel-variant',revision:'browser-preview',basis:'hypothetical wheel-size preview; original mesh profile reused; not the purchased SKU',dimensions:{...config.dimensions,wheelDiameterMm:value}};
  rebuild();setMode('assembly');$('variant').textContent='Hypothetical wheel-size preview. Shape is scaled only for this explicitly custom variant. Replay remains historical and is NOT recomputed.';
};
$('restore').onclick=()=>{config=structuredClone(D.config);$('diameter').value=80;$('variant').textContent='Historical nominal dimensions; no received parts measured.';rebuild();setMode('assembly');};
$('fullscreen').onclick=()=>{$('workspace').requestFullscreen?.();};
const observer=new IntersectionObserver(entries=>{active=entries[0].isIntersecting;});observer.observe($('workspace'));
function resize(){const c=$('canvas');const w=c.clientWidth,h=c.clientHeight;if(w&&h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}}
new ResizeObserver(resize).observe($('canvas'));
let previous=performance.now();
function frame(now){const dt=Math.min((now-previous)/1000,.1);previous=now;
  if(active){live?.tick(dt);if(playing&&mode==='replay'){const run=D.runs[$('scenario').value];cursor=Math.min(run.p.length-1,cursor+dt*Number($('rate').value)/run.dt);renderReplay();if(cursor===run.p.length-1){playing=false;$('play').textContent='Play';}}
    controls.update();renderer.render(scene,camera);}
  requestAnimationFrame(frame);
}
$('seek').max=D.runs[0].p.length-1;rebuild();select('motor');resize();
async function start(){
  live=await createLiveView({scene,robot,camera,controls,moving,mechanism:()=>robot.getObjectByName('concept'),getConfig:()=>structuredClone(config),$,
    onMode:value=>{mode=value;$('mode').value=value;}});
  globalThis.robotStudioV11={getDiagnostics:()=>({ready:true,mode,playing:mode==='replay'?playing:live.playing,cursor,selected,configurationId:config.id,assets:meshes.size,stack:resolve(config),livePhysics:true,live:live.state,assembly:live.assemblyProgress}),setMode,advanceLive:steps=>live.advance(steps)};
  document.body.dataset.studioReady='true';setMode('sequence');requestAnimationFrame(frame);
}
start().catch(e=>{$('clock').textContent='Physics initialization failed: '+e.message;document.body.dataset.studioError=e.message;});