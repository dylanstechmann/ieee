'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('../tools/drivetrain-mule-v4'),A=require('../tools/mule-measurements-v4'),{buildReport:buildOrder}=require('../tools/order-a-procurement-v4');
const root=path.resolve(__dirname,'..'),config=JSON.parse(fs.readFileSync(path.join(root,'drivetrain-mule-v4.json'),'utf8')),order=buildOrder(JSON.parse(fs.readFileSync(path.join(root,'order-a-procurement-v4.json'),'utf8'))),derived=M.derive(config,order);
const provenance=r=>Object.assign(r,{session_id:'SYNTHETIC_SESSION',configuration_id:'SYNTHETIC_HARDWARE',recorded_at:'2026-10-31T12:00:00Z',operator_id:'SYNTHETIC_OPERATOR',instrument_ids:'SYNTHETIC_INSTRUMENTS',calibration_check_id:'SYNTHETIC_CALIBRATION',setup_record_id:'SYNTHETIC_SETUP',control_revision:'SYNTHETIC_CONTROL',warmup_record_id:'SYNTHETIC_WARMUP',uncertainty_record_id:'SYNTHETIC_UNCERTAINTY',raw_observation_ref:'SYNTHETIC_RAW',attempt_status:'completed'});
const close=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const toCsv=(header,rows)=>header+'\n'+rows.map(r=>header.split(',').map(k=>r[k]??'').join(',')).join('\n')+'\n';
test('selected rigid geometry meets nominal contact, clearance and envelope checks',()=>{
  const g=derived.geometry;assert.equal(g.wheel_track_mm,176);assert.equal(g.overall_drive_width_mm,186);assert.equal(g.deck_top_z_mm,21.6);assert.equal(g.deck_bottom_z_mm,16.6);close(g.caster_height_with_selected_spacer_mm,16.675);close(g.caster_contact_z_mm,-.075);assert.equal(g.motor_body_center_gap_mm,8);assert.equal(g.wheel_deck_lateral_clearance_mm,3);close(g.motor_hole_edge_ligament_mm,4.3);assert.equal(g.overall_height_mm,80);
});
test('18 reversible motor/wheel/support variants retain arithmetic and encoder screens',()=>{
  assert.equal(derived.configurations.length,18);assert.equal(new Set(derived.configurations.map(x=>x.id)).size,18);for(const x of derived.configurations){assert.equal(x.arithmetic_screen_pass,true);assert.equal(x.physical_validation,false);assert.ok(x.encoder_quantum_in<.05);}
  const selected=derived.configurations.find(x=>x.motor_id==='M70'&&x.wheel_diameter_mm===80&&x.support_configuration==='dual-front-rear');close(selected.speed_margin,1.786558);close(selected.torque_margin,2.169854);
});
test('drill pattern is dimensioned, true-scale and separates optional ballast marks',()=>{
  assert.equal(M.motorHoles(config).length,6);assert.equal(M.casterHoles(config).length,4);const svg=M.drillSvg(config);assert.match(svg,/width="190mm" height="160mm"/);assert.match(svg,/data-calibration-mm="50"/);assert.equal((svg.match(/class="motor"/g)||[]).length,6);assert.equal((svg.match(/class="caster"/g)||[]).length,4);assert.match(svg,/OPTIONAL BALLAST MARKS — NOT RELEASED HOLES/);assert.ok(M.motorHoles(config).every(p=>Math.abs(p.y)===74&&Math.abs(p.x)<=14.8));
});
test('deck blank is closed manifold with exact box volume and bounds',()=>{
  const mesh=M.buildArtifacts(config).report.mesh;close(mesh.signed_volume_mm3,190*160*5);assert.deepEqual(mesh.bounds_mm,{min:[-95,-80,0],max:[95,80,5]});assert.equal(mesh.triangles,12);assert.equal(mesh.boundary_edges,0);assert.equal(mesh.nonmanifold_edges,0);assert.equal(mesh.degenerate_triangles,0);
});
test('artifacts are deterministic, offline and preserve blank physical evidence',()=>{
  const a=M.buildArtifacts(config),b=M.buildArtifacts(config);assert.deepEqual(a,b);assert.equal(a.report.physical_trials_completed,0);assert.equal(a.report.printed_parts_inspected,0);assert.equal(a.files['E03-trials.csv'].trim().split('\n').length,451);assert.equal(a.files['E02-characterization.csv'].trim().split('\n').length,19);assert.match(a.files['preview.html'],/Selected digital baseline/);assert.ok(!/<script[^>]+src=|<link[^>]+href=/i.test(a.files['preview.html']));
  for(const[file,text]of Object.entries(a.files))assert.equal(fs.readFileSync(path.join(root,'derived/drivetrain-mule-v4',file),'utf8'),text,file);
});
test('invalid substitutions cannot silently generate a failed nominal build',()=>{
  let c=structuredClone(config);c.caster.selected_spacer_mm=0;assert.throws(()=>M.derive(c,order),/caster contact/);c=structuredClone(config);c.drive.wheel_center_y_mm=82;assert.throws(()=>M.derive(c,order),/wheel\/deck clearance/);c=structuredClone(config);c.deck.width_mm=150;assert.throws(()=>M.derive(c,order),/clearance|ligament/);c=structuredClone(config);c.drive.wheel_radius_mm=38.1;assert.throws(()=>M.derive(c,order),/inconsistent/);
});
test('E03 analyzer refuses placeholders and computes measured support gates',()=>{
  const logs=M.blankLogs(config),header=logs.e03.split('\n')[0];assert.throws(()=>A.summarizeE03(logs.e03,config),/incomplete matrix/);const rows=A.parseCsv(logs.e03);for(const r of rows){provenance(r);r.surface_id='FAU_TILE_A';r.duration_s='2';r.slip_observed='false';r.thermal_or_protection_fault='false';if(r.run_type==='straight'){r.drift_mm='10';r.max_speed_in_s='9';}else r.spin_error_deg='4';}
  const summary=A.summarizeE03(toCsv(header,rows),config);assert.equal(summary.trial_count,450);assert.equal(summary.cells.length,9);assert.equal(summary.all_4kg_cells_pass,true);assert.equal(summary.qualifying_support_configurations_at_4kg.length,3);
  for(const r of rows.filter(x=>x.support_configuration==='dual-front-rear'&&x.mass_kg==='4'&&x.run_type==='straight').slice(0,2))r.drift_mm='30';const failed=A.summarizeE03(toCsv(header,rows),config);assert.equal(failed.all_4kg_cells_pass,false);assert.ok(!failed.qualifying_support_configurations_at_4kg.includes('dual-front-rear'));
});
test('E02 analyzer computes measured summaries and CSV parser handles quoted notes',()=>{
  const logs=M.blankLogs(config),header=logs.e02.split('\n')[0],rows=A.parseCsv(logs.e02);assert.throws(()=>A.summarizeE02(logs.e02),/incomplete matrix/);for(const r of rows){provenance(r);Object.assign(r,{bus_v:'12',driver_id:'BENCH_DRIVER_A',rpm:'130',torque_nm:'0.3',current_a:'0.8',temperature_c:'40',thermal_or_protection_fault:'false'});}const summary=A.summarizeE02(toCsv(header,rows));assert.equal(summary.trial_count,18);assert.equal(summary.cells.length,6);assert.equal(summary.minimum_driver_continuous_current_screen_a,1);assert.match(summary.screen_basis,/peak, stall/);
  assert.deepEqual(A.parseCsv('id,notes\n1,"fault, observed"\n'),[{id:'1',notes:'fault, observed'}]);
});
