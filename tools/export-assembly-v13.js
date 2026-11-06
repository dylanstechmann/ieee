#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),cache=process.env.STUDIO_BUILD_DIR||path.join(os.homedir(),'.cache/ieee-studio-v7-build');
const {resolveAssembly,buildColliderRegistry}=require('../robot-studio-v13/assembly-spec');
async function run(){
  const THREE=await import(path.join(cache,'node_modules/three/build/three.module.js'));
  const {GLTFLoader}=await import(path.join(cache,'node_modules/three/examples/jsm/loaders/GLTFLoader.js'));
  const {GLTFExporter}=await import(path.join(cache,'node_modules/three/examples/jsm/exporters/GLTFExporter.js'));
  globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result=`data:${blob.type};base64,${Buffer.from(b).toString('base64')}`;this.onloadend?.();});}};
  const spec=JSON.parse(fs.readFileSync(path.join(root,'derived/cad-v13/assembly-spec.json')));
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'derived/cad-v13/manifest.json')));
  const assets=new Map(manifest.assets.map(a=>[a.id,a])),library=new Map(),loader=new GLTFLoader();
  for(const [id,asset]of assets){
    const bytes=fs.readFileSync(path.join(root,'derived/cad-v13/parts',asset.glb));
    const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');library.set(id,gltf.scene);
  }
  const resolved=resolveAssembly(spec,{liftMm:0,gateOpen:0}),scene=new THREE.Scene();scene.name=spec.id;
  for(const instance of resolved.instances){
    const group=new THREE.Group();group.name=instance.id;group.userData={partId:instance.partId,assetId:instance.assetId,basis:instance.basis};
    group.add(library.get(instance.assetId).clone(true));group.position.set(...instance.positionM);group.rotation.set(...instance.rotationRad);group.scale.set(1,1,1);scene.add(group);
  }
  const glb=await new GLTFExporter().parseAsync(scene,{binary:true}),out=path.join(root,'derived/showcase-v13');
  fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'assembly.glb'),Buffer.from(glb));
  const hash=x=>crypto.createHash('sha256').update(x).digest('hex'),glbHash=hash(Buffer.from(glb));
  const inputFiles=['derived/cad-v13/manifest.json','derived/cad-v13/assembly-spec.json','robot-studio-v13/assembly-spec.js','tools/export-assembly-v13.js'];
  const assemblyManifest={...spec,glbSha256:glbHash,nodeCount:resolved.instances.length,
    inputHashes:Object.fromEntries(inputFiles.map(f=>[f,hash(fs.readFileSync(path.join(root,f)))]))};
  fs.writeFileSync(path.join(out,'assembly-manifest.json'),JSON.stringify(assemblyManifest,null,2)+'\n');
  fs.writeFileSync(path.join(out,'collision-study.json'),JSON.stringify({schema:'collision-study-v13/1',assemblyId:spec.id,assemblyHash:spec.assemblyHash,
    colliders:buildColliderRegistry(resolved),qualification:'named reduced-order cuboids; not exact mesh collision or hardware qualification'},null,2)+'\n');
  console.log(JSON.stringify({instances:resolved.instances.length,assets:library.size,glbSha256:glbHash}));
}
module.exports={run};if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
