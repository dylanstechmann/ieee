#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f)),json=f=>JSON.parse(read(f));
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const inputs=['share/Showcase-v10.html','share/Mission-Replay-v10.html','share/Mission-Replay-v10-bail-out.html',
  'robot-studio-v13/app.js','robot-studio-v13/live-view.js','robot-studio-v13/physics.js','robot-studio-v13/assembly-spec.js',
  'robot-studio-v11/arenas.js','robot-studio-v13/physical-evidence.json','robot-studio-v13/panel.html','robot-studio-v13/panel.css',
  'cad-v13/bom-evidence.json','cad-v13/assembly-layout.json','derived/cad-v13/manifest.json',
  'derived/cad-v13/assembly-spec.json','derived/cad-v13/assembly-vendor-22mm.json','derived/cad-v13/fit-results.json',
  'derived/organizer-cad-v10/field-v10.json','tools/build-showcase-v13.js','order-a-procurement-v4.json'];
function build(){
  const manifest=json('derived/cad-v13/manifest.json'),assembly=json('derived/cad-v13/assembly-spec.json');
  const vendor=json('derived/cad-v13/assembly-vendor-22mm.json'),fit=json('derived/cad-v13/fit-results.json');
  const runs=['share/Mission-Replay-v10.html','share/Mission-Replay-v10-bail-out.html'].map(f=>{
    const match=read(f).toString().match(/const D=(\{[^\n]+\});/);if(!match)throw Error(`No reference trace in ${f}`);return JSON.parse(match[1]);});
  const assets=manifest.assets.map(a=>{const file=`derived/cad-v13/parts/${a.glb}`,bytes=read(file);if(hash(bytes)!==a.glbSha256)throw Error(`Stale CAD ${file}`);
    return {id:a.id,geometryMode:a.geometryMode,qualification:a.qualification,boundsMm:a.boundsMm,data:bytes.toString('base64')};});
  const data={assets,assembly,assemblies:{16:assembly,22:vendor},sources:manifest.sources,fitResults:fit.results,runs,
    field:json('derived/organizer-cad-v10/field-v10.json'),physicalEvidence:json('robot-studio-v13/physical-evidence.json'),candidateBom:json('order-a-procurement-v4.json').bom};
  const cache=process.env.STUDIO_BUILD_DIR||path.join(os.homedir(),'.cache/ieee-studio-v7-build');
  const physicsCache=process.env.STUDIO_PHYSICS_DIR||path.join(os.homedir(),'.cache/node-copies/courselab-frontend');
  const rapier=jsonExternal(path.join(physicsCache,'node_modules/@dimforge/rapier3d-compat/package.json'));
  if(rapier.version!=='0.12.0')throw Error('Expected pinned Rapier 0.12.0');
  const licenseFiles=[path.join(cache,'node_modules/three/LICENSE'),path.join(physicsCache,'node_modules/@dimforge/rapier3d-compat/LICENSE')];
  data.thirdPartyLicenses=licenseFiles.map(f=>({name:path.basename(path.dirname(f)),text:fs.readFileSync(f,'utf8')}));
  const esbuild=require(path.join(cache,'node_modules/esbuild'));
  data.dependencyVersions={three:jsonExternal(path.join(cache,'node_modules/three/package.json')).version,esbuild:esbuild.version,rapier:rapier.version};
  data.dependencyHashes=Object.fromEntries([
    ['three',path.join(cache,'node_modules/three/build/three.module.js')],['esbuild',path.join(cache,'node_modules/esbuild/lib/main.js')],
    ['rapier',path.join(physicsCache,'node_modules/@dimforge/rapier3d-compat/rapier.cjs.js')]].map(([id,f])=>[id,hash(fs.readFileSync(f))]));
  if(data.dependencyVersions.three!=='0.170.0'||esbuild.version!=='0.24.0')throw Error('Pinned Three.js/esbuild mismatch');
  const code=esbuild.buildSync({entryPoints:[path.join(root,'robot-studio-v13/app.js')],bundle:true,format:'iife',minify:true,
    write:false,nodePaths:[path.join(cache,'node_modules'),path.join(physicsCache,'node_modules')],target:'es2020',legalComments:'inline'}).outputFiles[0].text;
  const style='<style>'+read('robot-studio-v13/panel.css').toString()+'</style>';
  const hostedMeta='<meta name="theme-color" content="#10191d"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Pit Wall V13">';
  const compatibility=`<script>(function(){if(!Array.prototype.at){Object.defineProperty(Array.prototype,'at',{configurable:true,writable:true,value:function(index){var length=this.length,relative=index==null?0:Math.trunc(Number(index));if(relative<0)relative+=length;return relative>=0&&relative<length?this[relative]:undefined;}});}if(typeof window.structuredClone!=='function'){window.structuredClone=function(value){return JSON.parse(JSON.stringify(value));};}if(!Element.prototype.replaceChildren){Element.prototype.replaceChildren=function(){var first=this.firstChild;while(first){this.removeChild(first);first=this.firstChild;}for(var i=0;i<arguments.length;i++){var node=arguments[i];this.appendChild(typeof node==='string'?document.createTextNode(node):node);}};}if(typeof window.ResizeObserver==='undefined'){window.ResizeObserver=function(){this.observe=function(){};this.unobserve=function(){};this.disconnect=function(){};};}if(typeof window.IntersectionObserver==='undefined'){window.IntersectionObserver=function(){this.observe=function(){};this.unobserve=function(){};this.disconnect=function(){};};}})();</script>`;
  const script=`<script>globalThis.STUDIO_V13=${JSON.stringify(data).replace(/</g,'\\u003c')};</script>`+compatibility+`<script>try{${code.replace(/<\/script/gi,'<\\/script')}}catch(e){const clock=document.getElementById('v13-clock');document.body.dataset.studioError=document.body.dataset.studioError||e.message;if(!clock.textContent)clock.textContent='Interactive view unavailable: '+e.message;}</script>`;
  let html=read('share/Showcase-v10.html').toString();
  for(const anchor of ['</head>','<section id="physics">','</main>','</body>'])if(!html.includes(anchor))throw Error('Missing showcase insertion anchor: '+anchor);
  html=html.replace('</head>',hostedMeta+style+'</head>').replace('<section id="physics">',read('robot-studio-v13/panel.html').toString()+'\n<section id="physics">');
  html=html.replace('<a href="#physics">Physics</a>','<a href="#studio-v13">3D studio</a>\n      <a href="#physics">Physics</a>');
  html=html.replace(/<h3 class="sub reveal">Open the studios \(offline, same folder\)<\/h3>[\s\S]*?<\/div>/,'<h3 class="sub reveal">Everything above works in this one file</h3><p>The integrated workspace includes source-evidenced parts, fit results, assembly animation, editable assumptions, live contact missions and historical traces. No network or sibling studio is required.</p>');
  const evidence='<section id="v13-evidence"><div class="wrap"><p class="eyebrow">Assumptions, attribution and limits</p><h2>A digital study, <em>not a hardware certificate.</em></h2><p>'+data.physicalEvidence.massBudgetNote+'</p><ul>'+data.physicalEvidence.limitations.map(s=>'<li>'+s+'</li>').join('')+'</ul><h3>Open-source software and reference credits</h3><ul>'+data.physicalEvidence.credits.map(s=>'<li>'+s+'</li>').join('')+'</ul><p>Agent-authored for this personal hobby/learning project. No claims of physical testing, purchases, solo authorship or owner-reviewed validation.</p></div></section>';
  const licenses='<section><div class="wrap"><details><summary>Embedded third-party software licenses</summary>'+data.thirdPartyLicenses.map(l=>'<h3>'+l.name+'</h3><pre style="white-space:pre-wrap;overflow-wrap:anywhere">'+l.text.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</pre>').join('')+'</details></div></section>';
  const catalog='<section><div class="wrap"><h2>Selected parts <em>and evidence.</em></h2><p>The October 31, 2026 procurement snapshot is not a current quote or purchase record. Detailed drivetrain geometry uses archived manufacturer STEP references at native scale. The default motor is a disclosed 16 mm BOM-nominal derivative. Electronics and lift actuators remain unselected.</p><table><thead><tr><th>Candidate</th><th>SKU</th><th>Purchase qty / unit</th><th>Snapshot USD</th><th>Evidence</th></tr></thead><tbody>'+data.candidateBom.map(p=>'<tr><td>'+p.name+'</td><td>'+p.sku+'</td><td>'+p.qty+' '+p.unit+'</td><td>'+(p.unit_price_usd??'unpriced')+'</td><td>'+(p.source??'No specific component selected')+'</td></tr>').join('')+'</tbody></table></div></section>';
  html=html.replace('</main>',()=>catalog+evidence+licenses+'</main>').replace('</body>',()=>script+'</body>');
  return {html,manifest,dependencies:{versions:data.dependencyVersions,sha256:data.dependencyHashes},
    assetFiles:manifest.assets.map(a=>`derived/cad-v13/parts/${a.glb}`)};
}

function generate(){
  const b=build();fs.writeFileSync(path.join(root,'share/Showcase-v13.html'),b.html);fs.mkdirSync(path.join(root,'derived/showcase-v13'),{recursive:true});
  const m={schema:'showcase-v13-build/1',dependencies:b.dependencies,
    status:'source-evidenced assembly and reduced-order continuous-joint contact mission; not competition or physical qualification',
    inputs:Object.fromEntries([...inputs,...b.assetFiles].map(f=>[f,hash(read(f))])),
    output:{file:'share/Showcase-v13.html',sha256:hash(b.html),bytes:Buffer.byteLength(b.html)}};
  fs.writeFileSync(path.join(root,'derived/showcase-v13/build-manifest.json'),JSON.stringify(m,null,2)+'\n');console.log(JSON.stringify(m.output));return m;
}
function jsonExternal(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
module.exports={build,generate};if(require.main===module)generate();
