#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),cache=process.env.STUDIO_BUILD_DIR||path.join(os.homedir(),'.cache/ieee-studio-v7-build');
const {assemblyInstances}=require('../robot-studio-v11/assembly');
async function run(){
  const THREE=await import(path.join(cache,'node_modules/three/build/three.module.js'));
  const {STLLoader}=await import(path.join(cache,'node_modules/three/examples/jsm/loaders/STLLoader.js'));
  const {GLTFExporter}=await import(path.join(cache,'node_modules/three/examples/jsm/exporters/GLTFExporter.js'));
  // GLTFExporter uses the standard FileReader interface; Node supplies Blob.
  globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result=`data:${blob.type};base64,${Buffer.from(b).toString('base64')}`;this.onloadend?.();});}};
  const data=JSON.parse(fs.readFileSync(path.join(root,'derived/cad-v11/manifest.json')));
  const geom=JSON.parse(fs.readFileSync(path.join(root,'derived/drivetrain-mule-v10/geometry.json')));
  const config={id:'historical-mule-reference',partId:'pololu-1430',revision:'nominal-v10',basis:'archived CAD-derived; no physical measurement',dimensions:{wheelDiameterMm:80,wheelWidthMm:10,halfTrackMm:geom.lateral.wheel_center_mm,deckThicknessMm:geom.deck.thickness_mm,gearboxCenterAboveMountMm:geom.inputs.gearbox_center_above_mount_face_mm,shaftOffsetMm:geom.inputs.shaft_offset_mm,casterHeightMm:geom.inputs.caster_height_mm,casterSpacerMm:geom.inputs.caster_spacer_mm}};
  const manifest=assemblyInstances(config),scene=new THREE.Scene(),loader=new STLLoader();
  const assets=new Map(data.assets.map(a=>[a.id,a]));
  for(const i of manifest.instances){
    const bytes=fs.readFileSync(path.join(root,'derived/cad-v11',assets.get(i.assetId).stl));
    const geometry=loader.parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
    geometry.scale(.001,.001,.001);geometry.rotateX(-Math.PI/2);
    const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:i.partId==='wheel'?0x252b30:0x7994a3,roughness:.6}));
    mesh.name=i.id;mesh.position.set(...i.position);mesh.rotation.y=i.rotationY;mesh.scale.set(...i.scale);mesh.userData={partId:i.partId,motion:i.motion};scene.add(mesh);
  }
  for(const p of manifest.primitives){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(...p.size),new THREE.MeshStandardMaterial({color:p.color,roughness:.6}));mesh.name=p.id;mesh.position.set(...p.position);mesh.userData={partId:p.partId,motion:p.motion,basis:p.basis};scene.add(mesh);
  }
  const out=path.join(root,'derived/showcase-v12');fs.mkdirSync(out,{recursive:true});
  const glb=await new GLTFExporter().parseAsync(scene,{binary:true});fs.writeFileSync(path.join(out,'assembly.glb'),Buffer.from(glb));
  manifest.glbSha256=crypto.createHash('sha256').update(Buffer.from(glb)).digest('hex');
  manifest.inputHashes=Object.fromEntries(['robot-studio-v11/assembly.js','robot-studio-v11/assembly-primitives.js','robot-studio-v11/dimensions.js','derived/cad-v11/manifest.json','derived/drivetrain-mule-v10/geometry.json'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')]));
  fs.writeFileSync(path.join(out,'assembly-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  fs.writeFileSync(path.join(out,'collision-study.json'),JSON.stringify({schema:'collision-study-v12/1',units:'m',assemblyId:manifest.configurationId,primitives:manifest.primitives.map(p=>({...p,shape:'cuboid'})),chassis:{shape:'cuboid',halfExtents:[.095,.025,.106],position:[0,.04,0],basis:'conservative whole-chassis contact approximation; not a mesh union'},qualification:'geometry study only; electronics/mast are not all active physical colliders'},null,2)+'\n');
  console.log(`Exported ${manifest.instances.length} CAD meshes + ${manifest.primitives.length} procedural components to GLB and collision study`);
}
module.exports={run};if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});