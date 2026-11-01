'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
const M=require('../tools/drivetrain-mule-v4'),A=require('../tools/mule-measurements-v4');
const root=path.resolve(__dirname,'..'),config=JSON.parse(fs.readFileSync(path.join(root,'drivetrain-mule-v4.json'),'utf8'));
const csv=rows=>{const keys=Object.keys(rows[0]),q=x=>`"${String(x??'').replaceAll('"','""')}"`;return keys.map(q).join(',')+'\n'+rows.map(r=>keys.map(k=>q(r[k])).join(',')).join('\n')+'\n';};
function fixture(kind){
  const rows=A.parseCsv(M.blankLogs(config)[kind.toLowerCase()]);
  for(const r of rows){
    Object.assign(r,{session_id:'SYNTHETIC_SESSION',configuration_id:'SYNTHETIC_HARDWARE',recorded_at:'2026-10-31T12:00:00Z',operator_id:'SYNTHETIC_OPERATOR',instrument_ids:'SYNTHETIC_INSTRUMENTS',calibration_check_id:'SYNTHETIC_CALIBRATION',setup_record_id:'SYNTHETIC_SETUP',control_revision:'SYNTHETIC_CONTROL',warmup_record_id:'SYNTHETIC_WARMUP',uncertainty_record_id:'SYNTHETIC_UNCERTAINTY',raw_observation_ref:'SYNTHETIC_RAW',attempt_status:'completed',thermal_or_protection_fault:'false'});
    if(kind==='E02')Object.assign(r,{bus_v:'12',driver_id:'SYNTHETIC_DRIVER',rpm:'130',torque_nm:'.3',current_a:'.8',temperature_c:'40'});
    else{Object.assign(r,{surface_id:'SYNTHETIC_SURFACE',duration_s:'2',slip_observed:'false'});if(r.run_type==='straight')Object.assign(r,{drift_mm:'10',max_speed_in_s:'9'});else r.spin_error_deg='4';}
  }
  return rows;
}
test('blank progress is non-qualifying and full analysis refuses it',()=>{
  for(const kind of['E02','E03']){const text=M.blankLogs(config)[kind.toLowerCase()],run=opts=>kind==='E02'?A.summarizeE02(text,opts):A.summarizeE03(text,config,opts),p=run({progress:true});assert.equal(p.trial_count,0);assert.equal(p.qualification_issued,false);assert.equal(p.missing_slots.length,kind==='E02'?18:450);assert.ok(!('cells'in p));assert.ok(!('all_4kg_cells_pass'in p));assert.ok(!('minimum_driver_continuous_current_screen_a'in p));assert.throws(()=>run(),/incomplete matrix/);}
});
test('completed progress still cannot issue a gate result or driver screen',()=>{
  for(const kind of['E02','E03']){const text=csv(fixture(kind)),p=kind==='E02'?A.summarizeE02(text,{progress:true}):A.summarizeE03(text,config,{progress:true});assert.equal(p.missing_slots.length,0);assert.equal(p.status,'progress-only-not-qualification');assert.ok(!('cells'in p));assert.equal(p.provenance.references_verified,false);assert.match(p.provenance.input_sha256,/^[a-f0-9]{64}$/);}
});
test('legacy and missing provenance cannot silently become physical evidence',()=>{
  const rows=fixture('E02');delete rows[0].session_id;assert.throws(()=>A.summarizeE02(csv(rows)),/missing provenance column/);
  for(const key of A.provenanceColumns.filter(k=>!['exclusion_reason','replaces_trial_id'].includes(k))){const r=fixture('E02');r[0][key]='';assert.throws(()=>A.summarizeE02(csv(r)),/required|attempt_status/);}
});
test('duplicate identities slots and invalid matrix coordinates are rejected',()=>{
  for(const kind of['E02','E03']){const run=r=>kind==='E02'?A.summarizeE02(csv(r)):A.summarizeE03(csv(r),config);let rows=fixture(kind);rows[1].trial_id=rows[0].trial_id;assert.throws(()=>run(rows),/duplicate trial_id/);rows=fixture(kind);rows[1]={...rows[0],trial_id:'SYNTHETIC_DUPLICATE'};assert.throws(()=>run(rows),/duplicate completed trial slot/);rows=fixture(kind);rows[0][kind==='E02'?'motor':'support_configuration']='invented';assert.throws(()=>run(rows),/invalid.*trial slot/);}
});
test('aborted attempts remain visible and valid replacements fill only their own slots',()=>{
  const rows=fixture('E02'),replacement={...rows[0],trial_id:'SYNTHETIC_REPLACEMENT',replaces_trial_id:rows[0].trial_id};rows[0].attempt_status='aborted';rows[0].exclusion_reason='SYNTHETIC fixture interruption';rows.push(replacement);
  const summary=A.summarizeE02(csv(rows));assert.equal(summary.trial_count,18);assert.equal(summary.logged_attempt_count,19);assert.equal(summary.retained_noncompleted_attempts.length,1);assert.equal(summary.qualification_issued,false);
  replacement.replaces_trial_id='missing';assert.throws(()=>A.summarizeE02(csv(rows)),/replacement/);replacement.replaces_trial_id=rows[1].trial_id;assert.throws(()=>A.summarizeE02(csv(rows)),/replacement/);
});
test('excluded attempts do not fill slots and require documented reasons',()=>{
  const rows=fixture('E03');rows[0].attempt_status='excluded';assert.throws(()=>A.summarizeE03(csv(rows),config,{progress:true}),/exclusion_reason/);rows[0].exclusion_reason='SYNTHETIC review pending';const p=A.summarizeE03(csv(rows),config,{progress:true});assert.equal(p.completed_slot_count,449);assert.equal(p.retained_noncompleted_attempts.length,1);assert.throws(()=>A.summarizeE03(csv(rows),config),/incomplete matrix/);
});
test('spin faults and signed straight drift cannot pass qualifying cells',()=>{
  const rows=fixture('E03'),cell=rows.filter(r=>r.mass_kg==='4'&&r.support_configuration==='dual-front-rear');cell.find(r=>r.run_type==='spin').thermal_or_protection_fault='true';let summary=A.summarizeE03(csv(rows),config);assert.equal(summary.all_4kg_cells_pass,false);assert.equal(summary.cells.find(r=>r.mass_kg===2).pass,null);
  cell.find(r=>r.run_type==='spin').thermal_or_protection_fault='false';for(const r of cell.filter(r=>r.run_type==='straight').slice(0,2))r.drift_mm='-30';summary=A.summarizeE03(csv(rows),config);assert.equal(summary.all_4kg_cells_pass,false);
});
test('invalid numbers timestamps and mixed configurations or control revisions fail',()=>{
  for(const [key,value,pattern]of[['rpm','  ',/numeric/],['recorded_at','yesterday',/timestamp/],['configuration_id','OTHER',/one hardware/],['control_revision','OTHER',/one control/]]){const rows=fixture('E02');rows[0][key]=value;assert.throws(()=>A.summarizeE02(csv(rows)),pattern);}
  const rows=fixture('E03');rows[0].duration_s='0';assert.throws(()=>A.summarizeE03(csv(rows),config),/positive duration/);
});
test('readiness artifacts preserve unknowns and separate references from measured fit',()=>{
  const built=M.buildArtifacts(config),session=JSON.parse(built.files['session-record.json']);assert.equal(session.approval.decision,null);assert.equal(session.stop_conditions.current_limit_a,null);assert.deepEqual(session.instrument_ids,[]);
  assert.equal(A.parseCsv(built.files['received-parts.csv']).length,6);assert.equal(A.parseCsv(built.files['E02A-inspection.csv']).length,12);
  for(const file of['fit-review.csv','equipment-readiness.csv'])for(const row of A.parseCsv(built.files[file]))assert.equal(row.reviewed_at,'');
  const fit=A.parseCsv(built.files['fit-review.csv']);assert.equal(fit.find(r=>r.check_id==='hub-stack').nominal_value,'');assert.ok(fit.every(r=>r.measured_result===''));assert.match(built.files['bench-readiness.md'],/No circular driver gate/);assert.match(built.files['experiment-workflow.md'],/provisional bench/);
});
test('CLI creates traceable progress exclusively without modifying raw input',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mule-readiness-synthetic-'));try{const input=path.join(temp,'SYNTHETIC.csv'),output=path.join(temp,'progress.json'),text=M.blankLogs(config).e02;fs.writeFileSync(input,text);const args=[path.join(root,'tools/mule-measurements-v4.js'),'--kind','E02','--input',input,'--output',output,'--progress'];let run=spawnSync(process.execPath,args,{encoding:'utf8'});assert.equal(run.status,0,run.stderr);const saved=fs.readFileSync(output,'utf8'),p=JSON.parse(saved);assert.match(p.provenance.config_sha256,/^[a-f0-9]{64}$/);assert.match(p.provenance.analyzer_sha256,/^[a-f0-9]{64}$/);run=spawnSync(process.execPath,args,{encoding:'utf8'});assert.notEqual(run.status,0);assert.equal(fs.readFileSync(output,'utf8'),saved);assert.equal(fs.readFileSync(input,'utf8'),text);args[args.indexOf('--output')+1]=input;run=spawnSync(process.execPath,args,{encoding:'utf8'});assert.notEqual(run.status,0);assert.match(run.stderr,/must not overwrite raw input/);}finally{fs.rmSync(temp,{recursive:true,force:true});}
});