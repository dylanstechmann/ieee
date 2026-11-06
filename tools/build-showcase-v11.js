#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f));
const json=f=>JSON.parse(read(f));
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const inputs=['share/Showcase-v10.html','share/Mission-Replay-v10.html','share/Mission-Replay-v10-bail-out.html','robot-studio-v11/app.js','robot-studio-v11/live-view.js','robot-studio-v11/physics.js','robot-studio-v11/arenas.js','robot-studio-v11/assembly-primitives.js','robot-studio-v11/physical-evidence.json','robot-studio-v11/dimensions.js','robot-studio-v11/panel.html','cad-v11/parts.json','derived/cad-v11/manifest.json','derived/organizer-cad-v10/field-v10.json','derived/drivetrain-mule-v10/geometry.json','tools/build-showcase-v11.js'];
function build(options={version:'v12'}){
  if(options.version!=='v12')throw Error('This builder emits v12; historical v11 is preserved');
  const manifest=json('derived/cad-v11/manifest.json'),g=json('derived/drivetrain-mule-v10/geometry.json');
  const runs=['share/Mission-Replay-v10.html','share/Mission-Replay-v10-bail-out.html'].map(f=>{
    const match=read(f).toString().match(/const D=(\{[^\n]+\});/);if(!match)throw Error(`No reference trace in ${f}`);return JSON.parse(match[1]);
  });
  const assets=manifest.assets.map(a=>{const file=`derived/cad-v11/${a.stl}`,bytes=read(file);if(hash(bytes)!==a.sha256)throw Error(`Stale CAD ${file}`);return {...a,data:bytes.toString('base64')};});
  const data={assets,parts:json('cad-v11/parts.json').parts,runs,field:json('derived/organizer-cad-v10/field-v10.json'),config:{id:'historical-mule-reference',partId:'pololu-1430',revision:'nominal-v10',basis:'historical CAD-derived stack; not physically measured',dimensions:{wheelDiameterMm:80,wheelWidthMm:10,halfTrackMm:g.lateral.wheel_center_mm,deckThicknessMm:g.deck.thickness_mm,gearboxCenterAboveMountMm:g.inputs.gearbox_center_above_mount_face_mm,shaftOffsetMm:g.inputs.shaft_offset_mm,casterHeightMm:g.inputs.caster_height_mm,casterSpacerMm:g.inputs.caster_spacer_mm}}};
  const cache=process.env.STUDIO_BUILD_DIR||path.join(os.homedir(),'.cache/ieee-studio-v7-build');
  const physicsCache=process.env.STUDIO_PHYSICS_DIR||path.join(os.homedir(),'.cache/node-copies/courselab-frontend');
  const rapier=jsonExternal(path.join(physicsCache,'node_modules/@dimforge/rapier3d-compat/package.json'));
  if(rapier.version!=='0.12.0')throw Error('Expected pinned Rapier 0.12.0');
  data.physicalEvidence=json('robot-studio-v11/physical-evidence.json');
  const licenseFiles=[path.join(cache,'node_modules/three/LICENSE'),path.join(physicsCache,'node_modules/@dimforge/rapier3d-compat/LICENSE')];
  data.thirdPartyLicenses=licenseFiles.map(f=>({name:path.basename(path.dirname(f)),text:fs.readFileSync(f,'utf8')}));
  const procurement=json('order-a-procurement-v4.json');
  data.candidateBom=procurement.items||procurement.bom||[];
  const esbuild=require(path.join(cache,'node_modules/esbuild'));
  data.dependencyVersions={three:jsonExternal(path.join(cache,'node_modules/three/package.json')).version,esbuild:esbuild.version,rapier:rapier.version};
  data.dependencyHashes=Object.fromEntries([
    ['three',path.join(cache,'node_modules/three/build/three.module.js')],
    ['esbuild',path.join(cache,'node_modules/esbuild/lib/main.js')],
    ['rapier',path.join(physicsCache,'node_modules/@dimforge/rapier3d-compat/rapier.cjs.js')],
  ].map(([id,f])=>[id,hash(fs.readFileSync(f))]));
  if(data.dependencyVersions.three!=='0.170.0'||esbuild.version!=='0.24.0')throw Error('Pinned Three.js/esbuild version mismatch');
  const code=esbuild.buildSync({entryPoints:[path.join(root,'robot-studio-v11/app.js')],bundle:true,format:'iife',minify:true,write:false,nodePaths:[path.join(cache,'node_modules'),path.join(physicsCache,'node_modules')],target:'es2020',legalComments:'inline'}).outputFiles[0].text;
  const style=`<style>#v11-workspace{background:#172127;color:#e5e9e8;border:1px solid #52616b;border-radius:12px;overflow:hidden;margin:28px 0}#v11-workspace:fullscreen{overflow:auto}#v11-canvas{display:block;width:100%;height:580px;touch-action:pan-y}.v11-toolbar,#v11-transport{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:14px}#v11-workspace button,#v11-workspace select,#v11-workspace input{font:inherit;padding:6px;background:#293b45;color:#fff;border:1px solid #60707b;border-radius:4px}#v11-workspace button{cursor:pointer}#v11-workspace button:focus-visible,#v11-workspace input:focus-visible{outline:3px solid #e4a653}#v11-seek{flex:1;min-width:130px}.v11-columns{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:20px}#v11-parts{display:flex;gap:6px;flex-wrap:wrap}#v11-workspace pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.7 monospace;max-height:260px;overflow:auto}#v11-clock{padding:10px 18px;color:#e4a653}.v11-warning{padding:18px;border-top:1px solid #9e783b;font-size:13px!important}#v11-stack,#v11-variant{font-size:13px!important;padding:10px 0}@media(max-width:720px){.v11-columns{grid-template-columns:1fr}#v11-canvas{height:420px}}@media print{#v11-canvas{display:none}}</style>`;
  const script=`<script>globalThis.STUDIO_V11=${JSON.stringify(data).replace(/</g,'\\u003c')};</script><script>try{${code.replace(/<\/script/gi,'<\\/script')}}catch(e){document.getElementById('v11-clock').textContent='Interactive view unavailable: '+e.message;document.body.dataset.studioError=e.message;}</script>`;
  let html=read('share/Showcase-v10.html').toString();
  const narrow='<style>#v11-workspace [hidden]{display:none!important}#v11-live-telemetry,#v11-assembly-status,#v11-live-model{padding:12px 18px}#v11-parameters{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:18px}.v11-parameter{display:flex;justify-content:space-between;gap:12px}.v11-parameter input{width:90px}#v11-workspace details{padding:16px}#v11-workspace summary{cursor:pointer;color:#e4a653}@media(max-width:720px){.status-chip{display:none}table{display:block;max-width:100%;overflow-x:auto}.v11-columns>*{min-width:0}#v11-workspace select{max-width:100%}#v11-parameters{grid-template-columns:1fr}}</style>';
  for(const anchor of ['</head>','<section id="physics">','</main>','</body>'])if(!html.includes(anchor))throw Error('Missing showcase insertion anchor: '+anchor);
  html=html.replace('</head>',style+narrow+'</head>').replace('<section id="physics">',read('robot-studio-v11/panel.html').toString()+'\n<section id="physics">');
  html=html.replace('<a href="#physics">Physics</a>','<a href="#studio-v11">3D studio</a>\n      <a href="#physics">Physics</a>');
  html=html.replace(/<h3 class="sub reveal">Open the studios \(offline, same folder\)<\/h3>[\s\S]*?<\/div>/,'<h3 class="sub reveal">Everything above works in this one file</h3><p>The integrated workspace includes assembly animation, editable assumptions, live demo and organizer-field attempts, and both historical mission traces. Older standalone studios remain separate development artifacts, not requirements for this document.</p>');
  const evidence='<section id="v11-evidence"><div class="wrap"><p class="eyebrow">Assumptions, attribution and limits</p><h2>A digital study, <em>not a hardware certificate.</em></h2><p>'+data.physicalEvidence.massBudgetNote+'</p><ul>'+data.physicalEvidence.limitations.map(s=>'<li>'+s+'</li>').join('')+'</ul><h3>Software and reference credits</h3><ul>'+data.physicalEvidence.credits.map(s=>'<li>'+s+'</li>').join('')+'</ul><p>Live assembly and controller are agent-authored for this personal hobby/learning project. No claims of physical testing, purchases, solo authorship or owner-reviewed validation are made.</p></div></section>';
  const licenses='<section><div class="wrap"><details><summary>Embedded third-party software licenses</summary>'+data.thirdPartyLicenses.map(l=>'<h3>'+l.name+'</h3><pre style="white-space:pre-wrap;overflow-wrap:anywhere">'+l.text.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</pre>').join('')+'</details></div></section>';
  const catalog='<section><div class="wrap"><h2>Candidate parts <em>and quantities.</em></h2><p>Retained October 31, 2026 procurement snapshot, not a current quote or purchase recommendation. Installed drivetrain: 2 motors, 2 brackets, 2 hubs, 2 wheels and 2 casters. Prices below are per purchasing unit; a pair is not priced twice. Electronics and the proposed lift are unresolved reservations.</p><table><thead><tr><th>Candidate</th><th>SKU</th><th>Purchase qty / unit</th><th>Snapshot USD</th><th>Evidence</th></tr></thead><tbody>'+data.candidateBom.map(p=>'<tr><td>'+p.name+'</td><td>'+p.sku+'</td><td>'+p.qty+' '+p.unit+'</td><td>'+(p.unit_price_usd??'unpriced')+'</td><td>'+(p.source??'No specific component selected')+'</td></tr>').join('')+'</tbody></table></div></section>';
  html=html.replace('</main>',()=>catalog+evidence+licenses+'</main>');
  html=html.replace('</body>',()=>script+'</body>');
  return {html,manifest,dependencies:{versions:data.dependencyVersions,sha256:data.dependencyHashes},assetFiles:manifest.assets.flatMap(a=>[`derived/cad-v11/${a.stl}`])};
}
function generate(options={version:'v12'}){const b=build(options);fs.writeFileSync(path.join(root,'share/Showcase-v12.html'),b.html);fs.mkdirSync(path.join(root,'derived/showcase-v12'),{recursive:true});const m={schema:'showcase-v12-build/1',dependencies:b.dependencies,status:'integrated assembly sequence and live reduced-order contact mission; not competition or physical qualification',inputs:Object.fromEntries([...inputs,...b.assetFiles,'robot-studio-v11/assembly.js','order-a-procurement-v4.json'].map(f=>[f,hash(read(f))])),output:{file:'share/Showcase-v12.html',sha256:hash(b.html),bytes:Buffer.byteLength(b.html)}};fs.writeFileSync(path.join(root,'derived/showcase-v12/build-manifest.json'),JSON.stringify(m,null,2)+'\n');console.log(JSON.stringify(m.output));return m;}
function jsonExternal(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
module.exports={build,generate};if(require.main===module)generate();