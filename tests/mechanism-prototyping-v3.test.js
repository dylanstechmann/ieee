'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const M=require('../tools/mechanism-prototyping-v3');
const root=path.resolve(__dirname,'..'),config=JSON.parse(fs.readFileSync(path.join(root,'mechanism-prototyping-v3.json'),'utf8'));
const close=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);

test('tire source hash and dimensions remain tied to the archived official STL',()=>{
  const file=path.join(root,config.tire_source.path),hash=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  assert.equal(hash,config.tire_source.sha256);assert.equal(M.validateConfig(config),true);
  close(config.tire_source.outer_diameter_mm,68.184);close(config.tire_source.bore_diameter_mm,40.30);close(config.tire_source.thickness_mm,27.6);
});

test('fork coupon is a closed manifold with exact polygon volume and nominal clearances',()=>{
  const poly=M.forkPolygon(config),mesh=M.forkMesh(config),stats=M.assertMesh(mesh);
  close(stats.signed_volume_mm3,M.polygonArea(poly)*config.fork.thickness_mm);
  assert.deepEqual(stats.bounds_mm,{min:[-50,-45,0],max:[20,45,4]});
  assert.equal(stats.boundary_edges,0);assert.equal(stats.nonmanifold_edges,0);assert.equal(stats.degenerate_triangles,0);
  const throat=config.tire_source.outer_diameter_mm/2+config.fork.throat_clearance_mm;
  assert.ok(poly.some(p=>p[1]===throat)&&poly.some(p=>p[1]===-throat));close(throat*2,70.184);
});

test('lathed gauges have analytic volume within faceting tolerance and correct bounds',()=>{
  for(const diameter of config.mesh.gauge_diameters_mm){
    const stats=M.assertMesh(M.gaugeMesh(config,diameter)),m=config.mesh,r=diameter/2,tip=r-m.gauge_tip_chamfer_mm;
    const expected=Math.PI*(m.gauge_handle_diameter_mm/2)**2*m.gauge_handle_length_mm+Math.PI*r*r*(m.gauge_stem_length_mm-m.gauge_tip_chamfer_mm)+Math.PI*m.gauge_tip_chamfer_mm/3*(r*r+r*tip+tip*tip);
    assert.ok(Math.abs(stats.signed_volume_mm3-expected)/expected<0.001,`${diameter}: ${stats.signed_volume_mm3} vs ${expected}`);
    assert.deepEqual(stats.bounds_mm,{min:[-25,-25,0],max:[25,25,28]});assert.equal(stats.triangles,960);
  }
  assert.throws(()=>M.gaugeMesh(config,config.tire_source.bore_diameter_mm),/below nominal bore/);
});

test('concave triangulation preserves area and rejects invalid/open geometry',()=>{
  const poly=M.forkPolygon(config),triangles=M.triangulate(poly);
  const area=triangles.reduce((s,t)=>{const[a,b,c]=t.map(i=>poly[i]);return s+Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;},0);
  close(area,M.polygonArea(poly));assert.throws(()=>M.triangulate([[0,0],[2,2],[0,2],[2,0]]),/CCW|failed/);
  assert.throws(()=>M.assertMesh({vertices:[[0,0,0],[1,0,0],[0,1,0]],faces:[[0,1,2]]}),/invalid closed mesh/);
});

test('nine true-scale alignment sheets preserve offsets, yaw and calibration metadata',()=>{
  const cases=M.alignmentCases(config);assert.equal(cases.length,9);assert.equal(new Set(cases.map(x=>x.id)).size,9);
  for(const testCase of cases){
    const svg=M.alignmentSvg(config,testCase);assert.match(svg,/width="120mm" height="120mm"/);assert.match(svg,/data-calibration-mm="50"/);
    assert.match(svg,/r="34.092"/);assert.match(svg,/r="20.15"/);assert.ok(svg.includes(`cy="${60-testCase.offset_mm}"`));assert.ok(testCase.file.endsWith('.svg'));
  }
  const yaw=M.alignmentSvg(config,cases.find(x=>x.offset_mm===0&&x.yaw_deg===10));assert.match(yaw,/data-yaw-deg="10"/);assert.match(yaw,/yaw-witness/);
});

test('artifact set is deterministic, complete and contains no fabricated physical results',()=>{
  const a=M.buildArtifacts(config),b=M.buildArtifacts(config);assert.deepEqual(a,b);
  assert.equal(a.report.meshes.length,4);assert.equal(a.report.alignment_cases.length,9);assert.equal(a.report.physical_trials_completed,0);assert.equal(a.report.printed_parts_inspected,0);
  assert.equal(Object.keys(a.files).filter(f=>f.endsWith('.stl')).length,4);assert.equal(Object.keys(a.files).filter(f=>f.startsWith('alignment/')).length,9);
  assert.match(a.files['E04-trial-matrix.csv'],/required_attempts/);assert.match(a.files['README.md'],/not complete grippers/);
  for(const [file,text] of Object.entries(a.files))assert.equal(fs.readFileSync(path.join(root,'derived/mechanism-prototyping-v3',file),'utf8'),text,file);
});

test('invalid source or trial allocation cannot silently generate coupons',()=>{
  let c=structuredClone(config);c.tire_source.sha256='0'.repeat(64);assert.throws(()=>M.buildArtifacts(c),/hash mismatch/);
  c=structuredClone(config);c.alignment_template.attempts_per_cell=4;assert.throws(()=>M.buildArtifacts(c),/allocation/);
});
