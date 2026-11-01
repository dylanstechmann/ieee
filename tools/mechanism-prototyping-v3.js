#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'derived/mechanism-prototyping-v3');
const EPS=1e-10;
const round=(n,p=6)=>Number(n.toFixed(p));
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const polygonArea=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2;
function triangulate(poly) {
  if(poly.length<3||polygonArea(poly)<=EPS)throw new Error('CCW nondegenerate polygon required');
  const remaining=poly.map((_,i)=>i),triangles=[];
  const cross2=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const inside=(p,a,b,c)=>{
    const values=[cross2(a,b,p),cross2(b,c,p),cross2(c,a,p)];
    return values.every(v=>v>=-EPS);
  };
  let guard=0;
  while(remaining.length>3){
    let clipped=false;
    for(let i=0;i<remaining.length;i++){
      const ia=remaining[(i+remaining.length-1)%remaining.length],ib=remaining[i],ic=remaining[(i+1)%remaining.length];
      const a=poly[ia],b=poly[ib],c=poly[ic];
      if(cross2(a,b,c)<=EPS)continue;
      if(remaining.some(j=>j!==ia&&j!==ib&&j!==ic&&inside(poly[j],a,b,c)))continue;
      triangles.push([ia,ib,ic]);remaining.splice(i,1);clipped=true;break;
    }
    if(!clipped)throw new Error('polygon triangulation failed; check self-intersection/collinearity');
    if(++guard>poly.length)throw new Error('polygon triangulation guard');
  }
  triangles.push(remaining);return triangles;
}
function prism(poly,z0,height) {
  if(!(height>0))throw new Error('positive prism height required');
  const vertices=[],faces=[],n=poly.length,triangles=triangulate(poly);
  for(const z of [z0,z0+height])for(const p of poly)vertices.push([p[0],p[1],z]);
  for(const t of triangles){faces.push([t[2],t[1],t[0]],[t[0]+n,t[1]+n,t[2]+n]);}
  for(let i=0;i<n;i++){const j=(i+1)%n;faces.push([i,j,i+n],[j,j+n,i+n]);}
  return {vertices,faces};
}
function lathe(profile,segments) {
  if(!Number.isInteger(segments)||segments<12)throw new Error('at least 12 lathe segments required');
  const vertices=[],faces=[],rings=[];
  for(const [r,z] of profile){
    if(r<0||!Number.isFinite(z))throw new Error('invalid lathe profile');
    if(r===0){rings.push([vertices.length]);vertices.push([0,0,z]);}
    else{const ring=[];for(let i=0;i<segments;i++){const a=i/segments*2*Math.PI;ring.push(vertices.length);vertices.push([r*Math.cos(a),r*Math.sin(a),z]);}rings.push(ring);}
  }
  for(let k=0;k<rings.length-1;k++){
    const a=rings[k],b=rings[k+1];
    if(a.length===1){for(let i=0;i<segments;i++)faces.push([a[0],b[(i+1)%segments],b[i]]);}
    else if(b.length===1){for(let i=0;i<segments;i++)faces.push([a[i],a[(i+1)%segments],b[0]]);}
    else for(let i=0;i<segments;i++){const j=(i+1)%segments;faces.push([a[i],a[j],b[i]],[a[j],b[j],b[i]]);}
  }
  return {vertices,faces};
}
function meshStats(mesh) {
  const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]},edges=new Map();
  for(const v of mesh.vertices)for(let k=0;k<3;k++){bounds.min[k]=Math.min(bounds.min[k],v[k]);bounds.max[k]=Math.max(bounds.max[k],v[k]);}
  let volume=0,degenerate=0,minArea=Infinity;
  for(const f of mesh.faces){
    const [a,b,c]=f.map(i=>mesh.vertices[i]),ab=sub(b,a),ac=sub(c,a),normal=cross(ab,ac),area=Math.hypot(...normal)/2;
    if(area<EPS)degenerate++;minArea=Math.min(minArea,area);volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
    for(let i=0;i<3;i++){const x=f[i],y=f[(i+1)%3],key=[Math.min(x,y),Math.max(x,y)].join(':');edges.set(key,(edges.get(key)||0)+1);}
  }
  return {vertices:mesh.vertices.length,triangles:mesh.faces.length,edges:edges.size,boundary_edges:[...edges.values()].filter(n=>n===1).length,nonmanifold_edges:[...edges.values()].filter(n=>n>2).length,degenerate_triangles:degenerate,min_triangle_area_mm2:round(minArea),signed_volume_mm3:round(volume),bounds_mm:{min:bounds.min.map(v=>round(v)),max:bounds.max.map(v=>round(v))}};
}
function assertMesh(mesh) {
  const s=meshStats(mesh);
  if(s.boundary_edges||s.nonmanifold_edges||s.degenerate_triangles||s.signed_volume_mm3<=0)throw new Error(`invalid closed mesh ${JSON.stringify(s)}`);
  return s;
}
function forkPolygon(c) {
  const f=c.fork,t=c.tire_source.outer_diameter_mm/2+f.throat_clearance_mm;
  if(!(f.rear_x_mm<f.inner_back_x_mm&&f.inner_back_x_mm<f.throat_x_mm&&f.throat_x_mm<f.front_x_mm))throw new Error('ordered fork X stations required');
  if(!(f.outer_half_width_mm>f.mouth_half_width_mm&&f.mouth_half_width_mm>t))throw new Error('ordered fork widths required');
  return [
    [f.rear_x_mm,-f.outer_half_width_mm],[f.front_x_mm,-f.outer_half_width_mm],[f.front_x_mm,-f.mouth_half_width_mm],
    [f.throat_x_mm,-t],[f.inner_back_x_mm,-t],[f.inner_back_x_mm,t],[f.throat_x_mm,t],
    [f.front_x_mm,f.mouth_half_width_mm],[f.front_x_mm,f.outer_half_width_mm],[f.rear_x_mm,f.outer_half_width_mm]
  ];
}
function forkMesh(c) { return prism(forkPolygon(c),0,c.fork.thickness_mm); }
function gaugeMesh(c,diameter) {
  const m=c.mesh,bore=c.tire_source.bore_diameter_mm,r=diameter/2;
  if(!(diameter>0&&diameter<bore))throw new Error('gauge diameter must be positive and below nominal bore');
  if(!(m.gauge_tip_chamfer_mm>0&&m.gauge_tip_chamfer_mm<r&&m.gauge_tip_chamfer_mm<m.gauge_stem_length_mm))throw new Error('invalid gauge chamfer');
  const h=m.gauge_handle_length_mm,z=h+m.gauge_stem_length_mm;
  return lathe([[0,0],[m.gauge_handle_diameter_mm/2,0],[m.gauge_handle_diameter_mm/2,h],[r,h],[r,z-m.gauge_tip_chamfer_mm],[r-m.gauge_tip_chamfer_mm,z],[0,z]],m.segments);
}
function stlText(name,mesh) {
  const lines=[`solid ${name}`];
  for(const f of mesh.faces){
    const [a,b,c]=f.map(i=>mesh.vertices[i]),n=cross(sub(b,a),sub(c,a)),length=Math.hypot(...n),normal=n.map(v=>v/length);
    lines.push(`  facet normal ${normal.map(v=>v.toExponential(8)).join(' ')}`,'    outer loop');
    for(const v of [a,b,c])lines.push(`      vertex ${v.map(x=>x.toFixed(7)).join(' ')}`);
    lines.push('    endloop','  endfacet');
  }
  lines.push(`endsolid ${name}`);return lines.join('\n')+'\n';
}
function tagName(n) { return String(n).replace('-','m').replace('.','p'); }
function alignmentCases(c) {
  const a=c.alignment_template,cases=[];
  for(const offset of a.lateral_offsets_mm)for(const yaw of a.yaw_angles_deg){
    const id=`offset-${tagName(offset)}_yaw-${tagName(yaw)}`;
    cases.push({id,offset_mm:offset,yaw_deg:yaw,attempts:a.attempts_per_cell,file:`alignment/E04_${id}.svg`});
  }
  return cases;
}
function alignmentSvg(c,testCase) {
  const a=c.alignment_template,t=c.tire_source,size=a.page_size_mm,center=size/2,cy=center-testCase.offset_mm,r=t.outer_diameter_mm/2,bore=t.bore_diameter_mm/2;
  const angle=testCase.yaw_deg*Math.PI/180,x2=center+27*Math.cos(angle),y2=cy-27*Math.sin(angle),cal=a.calibration_line_mm;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}mm" height="${size}mm" viewBox="0 0 ${size} ${size}" data-offset-mm="${testCase.offset_mm}" data-yaw-deg="${testCase.yaw_deg}" data-calibration-mm="${cal}">
<rect width="${size}" height="${size}" fill="white"/><g fill="none" stroke="#152333" stroke-width="0.25">
<circle id="tire-outer" cx="${center}" cy="${cy}" r="${r}"/><circle id="tire-bore" cx="${center}" cy="${cy}" r="${bore}" stroke-dasharray="1 1"/>
<line id="robot-centerline" x1="5" y1="${center}" x2="115" y2="${center}" stroke="#237a8c" stroke-dasharray="3 2"/>
<line id="yaw-witness" x1="${center}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="#c34d38" stroke-width="0.5"/>
<circle cx="${center}" cy="${cy}" r="0.8" fill="#c34d38"/>
<path d="M 5 ${center-2} v 4 M 5 ${center} h 5 M 10 ${center-2} v 4"/>
<path d="M 10 110 h ${cal} M 10 108 v 4 M ${10+cal} 108 v 4" stroke-width="0.5"/>
</g><g font-family="sans-serif" fill="#152333" font-size="3">
<text x="5" y="6" font-size="4">E04 ${testCase.id} — 100% / ACTUAL SIZE</text>
<text x="5" y="11">Offset ${testCase.offset_mm} mm (+ = robot-left/page up); yaw ${testCase.yaw_deg}° CCW</text>
<text x="96" y="6" font-size="2.2">Ø${t.outer_diameter_mm} / bore Ø${t.bore_diameter_mm}</text>
<text x="10" y="106">MEASURE: line below = ${cal} mm. Reject print if scale differs.</text>
<text x="10" y="117">Geometry template only — not a mechanism or rules approval.</text>
</g></svg>
`;
}
function validateConfig(c) {
  if(!c||c.status!=='agent-generated-geometry-coupons-not-validated-mechanisms-not-production-cad')throw new Error('explicit prototype status required');
  if(hash(path.join(root,c.tire_source.path))!==c.tire_source.sha256)throw new Error('official tire source hash mismatch');
  for(const key of ['outer_diameter_mm','bore_diameter_mm','thickness_mm'])if(!(c.tire_source[key]>0))throw new Error(`positive tire ${key} required`);
  if(c.tire_source.bore_diameter_mm>=c.tire_source.outer_diameter_mm)throw new Error('bore must be smaller than tire OD');
  if(c.mesh.segments<24||c.mesh.gauge_diameters_mm.some(d=>d<=0||d>=c.tire_source.bore_diameter_mm))throw new Error('invalid gauge configuration');
  if(alignmentCases(c).length!==9)throw new Error('nine alignment cases required');
  if(c.alignment_template.attempts_per_cell!==5||c.alignment_template.nominal_repeat_attempts!==5)throw new Error('E04 allocation must be 5 per cell plus 5 nominal repeats');
  assertMesh(forkMesh(c));for(const d of c.mesh.gauge_diameters_mm)assertMesh(gaugeMesh(c,d));
  return true;
}
function previewSvg(c) {
  const poly=forkPolygon(c),pathData=poly.map((p,i)=>`${i?'L':'M'} ${p[0]} ${p[1]}`).join(' ')+' Z',r=c.tire_source.outer_diameter_mm/2;
  const max=Math.max(...c.mesh.gauge_diameters_mm),z=c.mesh.gauge_handle_length_mm+c.mesh.gauge_stem_length_mm;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="560" viewBox="0 0 240 125"><rect width="240" height="125" fill="#0c1724"/><g font-family="sans-serif" fill="#e6edf4"><text x="10" y="10" font-size="5">Geometry coupon preview — schematic, not print scale</text><text x="10" y="110" font-size="3.5">Passive fork top view · tire shown at nominal throat center</text><text x="140" y="110" font-size="3.5">Largest bore gauge side view</text></g><g transform="translate(65 58) scale(1 -1)"><path d="${pathData}" fill="#d57b43" stroke="#ffd0a5" stroke-width="0.5"/><circle cx="${c.fork.throat_x_mm}" cy="0" r="${r}" fill="#4b89aa55" stroke="#8cd8f2" stroke-width="0.4"/><circle cx="${c.fork.throat_x_mm}" cy="0" r="${c.tire_source.bore_diameter_mm/2}" fill="#0c1724" stroke="#8cd8f2" stroke-width="0.3"/><path d="M ${c.fork.throat_x_mm} 0 h 27" stroke="#ef6464" stroke-width="0.4"/></g><g transform="translate(175 92) scale(1.8 -1.8)"><rect x="${-c.mesh.gauge_handle_diameter_mm/2}" y="0" width="${c.mesh.gauge_handle_diameter_mm}" height="${c.mesh.gauge_handle_length_mm}" fill="#758da4"/><path d="M ${-max/2} ${c.mesh.gauge_handle_length_mm} h ${max} v ${c.mesh.gauge_stem_length_mm-c.mesh.gauge_tip_chamfer_mm} l ${-c.mesh.gauge_tip_chamfer_mm} ${c.mesh.gauge_tip_chamfer_mm} h ${-max+2*c.mesh.gauge_tip_chamfer_mm} l ${-c.mesh.gauge_tip_chamfer_mm} ${-c.mesh.gauge_tip_chamfer_mm} Z" fill="#a8b9c9"/></g><g fill="#9cb3c6" font-family="sans-serif" font-size="3"><text x="140" y="17">${max} mm stem · ${z} mm overall</text><text x="10" y="121">LOW-FORCE GEOMETRY TEST ONLY — NO RETENTION OR MECHANISM CLAIM</text></g></svg>\n`;
}
function renderReadme(c,report) {
  const gauges=report.meshes.filter(m=>m.kind==='bore-gauge').map(m=>`| ${m.nominal_diameter_mm} | ${m.diametral_clearance_mm} | ${m.radial_clearance_mm} | \`${m.file}\` |`).join('\n');
  const cases=report.alignment_cases.map(x=>`| ${x.offset_mm} | ${x.yaw_deg} | ${x.attempts} | \`${x.file}\` |`).join('\n');
  return `# Mechanism geometry-prototype kit — October 31, 2026\n\nAgent-generated coupons for E01/E04. **These are low-force geometry tests, not complete grippers, final robot CAD, validated fits or competition-legal mechanisms.** No files have been printed or physically tested.\n\n## Tire geometry baseline\n\nSource: \`${c.tire_source.path}\`, SHA-256 \`${c.tire_source.sha256}\`. Inputs: **${c.tire_source.outer_diameter_mm} mm OD, ${c.tire_source.bore_diameter_mm} mm nominal bore, ${c.tire_source.thickness_mm} mm thickness**. The bore is not a certified manufactured minimum. Material, friction, mass, compliance and tolerances remain unmeasured.\n\n## Bore-alignment gauges\n\nEach STL is in millimetres, with a ${c.mesh.gauge_stem_length_mm} mm stem, 2 mm tip chamfer and ${c.mesh.gauge_handle_length_mm} mm handle/flange. Clearance below is arithmetic from the nominal bore, **not a fit recommendation**.\n\n| Gauge Ø (mm) | Nominal diametral clearance (mm) | Nominal radial clearance (mm) | STL |\n|---:|---:|---:|---|\n${gauges}\n\nMeasure the printed gauge and actual tire. Use gentle hand alignment only; never force a gauge or use it as a capture actuator. Record actual dimensions in the E01 measurement sheet.\n\n## Passive-fork coupon\n\n\`stl/passive-fork-coupon.stl\`: ${c.fork.thickness_mm} mm thick, 70 × 90 mm outer bounds. The nominal throat width is **${c.tire_source.outer_diameter_mm+2*c.fork.throat_clearance_mm} mm** (${c.fork.throat_clearance_mm} mm radial clearance per side); mouth width is ${2*c.fork.mouth_half_width_mm} mm. This coupon tests approach/contact geometry only. It has no proven retention, release, mounting, actuator or structural capacity.\n\nSee [coupon-preview.svg](coupon-preview.svg). Use the same E04 pose matrix for every candidate; do not compare this fixed coupon against a differently positioned alternative.\n\n## True-scale E04 alignment sheets\n\nPrint SVGs at **100% / actual size**, not “fit to page.” Measure the 50 mm calibration line before every session and reject a mis-scaled sheet. Positive offset is robot-left/page up; yaw is CCW. Mark a surrogate tire’s witness line if yaw is being tested.\n\n| Lateral offset (mm) | Yaw (°) | Attempts in cell | File |\n|---:|---:|---:|---|\n${cases}\n\nFive attempts per cell plus five nominal repeats give 50 attempts per candidate per officially required pose class. Unknown pose classes remain diagnostic. Record every attempt in \`E04-trial-matrix.csv\` and the hardware package’s main trial log.\n\n## Geometry verification\n\nAll four STL meshes are closed, edge-two-manifold, nondegenerate and have positive outward signed volume in the computational checks. These checks do not certify slicer output, printability, tolerances, material strength, fit, safety or mechanism performance. Re-run:\n\n\`\`\`sh\nnode tools/mechanism-prototyping-v3.js\nnode tools/verify-mechanism-prototyping-v3.js\nnode --test tests/mechanism-prototyping-v3.test.js\n\`\`\`\n`;
}
function buildArtifacts(c) {
  validateConfig(c);const files={},meshes=[];
  const fork=forkMesh(c),forkStats=assertMesh(fork),forkFile='stl/passive-fork-coupon.stl';
  files[forkFile]=stlText('passive_fork_coupon',fork);
  meshes.push({kind:'passive-fork',file:forkFile,nominal_throat_width_mm:round(c.tire_source.outer_diameter_mm+2*c.fork.throat_clearance_mm),...forkStats});
  for(const d of c.mesh.gauge_diameters_mm){
    const mesh=gaugeMesh(c,d),file=`stl/bore-gauge-${tagName(d)}.stl`;
    files[file]=stlText(`bore_gauge_${tagName(d)}`,mesh);
    meshes.push({kind:'bore-gauge',file,nominal_diameter_mm:d,diametral_clearance_mm:round(c.tire_source.bore_diameter_mm-d),radial_clearance_mm:round((c.tire_source.bore_diameter_mm-d)/2),...assertMesh(mesh)});
  }
  const cases=alignmentCases(c);for(const testCase of cases)files[testCase.file]=alignmentSvg(c,testCase);
  const report={version:c.version,date:c.date,status:c.status,tire_source:c.tire_source,physical_trials_completed:0,printed_parts_inspected:0,
    geometry_check_scope:'Closed edge-two-manifold, nondegenerate triangles and positive signed volume only; not slicer, print, fit or mechanism validation.',meshes,alignment_cases:cases,limitations:c.limitations};
  files['report.json']=JSON.stringify(report,null,2)+'\n';files['README.md']=renderReadme(c,report);files['coupon-preview.svg']=previewSvg(c);
  files['E04-trial-matrix.csv']='case_id,lateral_offset_mm,yaw_deg,required_attempts,pose_class,architecture_id,trial_log_reference\n'+cases.map(x=>`${x.id},${x.offset_mm},${x.yaw_deg},${x.attempts},,,`).join('\n')+'\n';
  return {files,report};
}
function generate(c) {
  const {files,report}=buildArtifacts(c);
  for(const [name,text] of Object.entries(files)){const target=path.join(out,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,text);}
  const inputFiles=['mechanism-prototyping-v3.json','tools/mechanism-prototyping-v3.js',c.tire_source.path,'hardware-development-v3.json','VERIFIED-FACTS.md'];
  const manifest={date:c.date,status:c.status,input_hashes:Object.fromEntries(inputFiles.map(f=>[f,hash(path.join(root,f))])),output_hashes:Object.fromEntries(Object.keys(files).map(f=>[f,hash(path.join(out,f))]))};
  fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');return {files,report,manifest};
}
module.exports={polygonArea,triangulate,prism,lathe,meshStats,assertMesh,forkPolygon,forkMesh,gaugeMesh,stlText,alignmentCases,alignmentSvg,validateConfig,previewSvg,renderReadme,buildArtifacts,generate};
if(require.main===module){
  const c=JSON.parse(fs.readFileSync(path.join(root,'mechanism-prototyping-v3.json'),'utf8')),r=generate(c);
  console.log(`Wrote ${out}`);console.log(`${r.report.meshes.length} closed prototype meshes, ${r.report.alignment_cases.length} true-scale alignment templates; no prints or physical trials.`);
  for(const m of r.report.meshes)console.log(`${m.file}: ${m.triangles} triangles, volume ${m.signed_volume_mm3} mm^3, boundary ${m.boundary_edges}, nonmanifold ${m.nonmanifold_edges}`);
}
