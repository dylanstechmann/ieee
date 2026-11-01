#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const crypto=require('node:crypto'),path=require('node:path');
const provenanceColumns=['session_id','configuration_id','recorded_at','operator_id','instrument_ids','calibration_check_id','setup_record_id','control_revision','warmup_record_id','uncertainty_record_id','raw_observation_ref','attempt_status','exclusion_reason','replaces_trial_id'];
const round=(n,p=6)=>Number(n.toFixed(p));
function parseCsv(text){
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){const ch=text[i];if(quoted){if(ch==='"'&&text[i+1]==='"'){field+='"';i++;}else if(ch==='"')quoted=false;else field+=ch;}else if(ch==='"')quoted=true;else if(ch===','){row.push(field);field='';}else if(ch==='\n'){row.push(field.replace(/\r$/,''));if(row.some(x=>x!==''))rows.push(row);row=[];field='';}else field+=ch;}
  if(quoted)throw new Error('unterminated CSV quote');if(field||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
  if(rows.length<2)throw new Error('CSV header and data rows required');const headers=rows[0];if(new Set(headers).size!==headers.length)throw new Error('duplicate CSV headers');
  return rows.slice(1).map((values,index)=>{if(values.length!==headers.length)throw new Error(`CSV row ${index+2} has ${values.length}/${headers.length} fields`);return Object.fromEntries(headers.map((h,i)=>[h,values[i]]));});
}
const number=(row,key)=>{const n=Number(row[key]);if(typeof row[key]!=='string'||!row[key].trim()||!Number.isFinite(n))throw new Error(`${row.trial_id}: numeric ${key} required`);return n;};
const bool=(row,key)=>{if(row[key]!=='true'&&row[key]!=='false')throw new Error(`${row.trial_id}: ${key} must be true or false`);return row[key]==='true';};
const median=values=>{const a=[...values].sort((x,y)=>x-y),m=a.length/2;return a.length%2?a[Math.floor(m)]:(a[m-1]+a[m])/2;};
function measuredE03(text,config){
  const rows=parseCsv(text),surface=rows[0]?.surface_id;if(!surface||surface==='DOCUMENT_SURFACE')throw new Error('document an actual surface ID before analysis');
  if(rows.some(r=>r.surface_id!==surface))throw new Error('one surface per analysis file');const groups=new Map();
  for(const r of rows){const key=`${r.support_configuration}|${r.mass_kg}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
  if(groups.size!==9)throw new Error(`nine support/mass cells required; found ${groups.size}`);const cells=[];
  for(const[key,cell]of groups){const[support,massText]=key.split('|'),mass=Number(massText),straight=cell.filter(r=>r.run_type==='straight'),left=cell.filter(r=>r.run_type==='spin'&&r.direction==='left'),right=cell.filter(r=>r.run_type==='spin'&&r.direction==='right');
    if(cell.length!==50||straight.length!==10||left.length!==20||right.length!==20)throw new Error(`${key}: expected 10 straight, 20 left and 20 right trials`);
    let speedFaultPass=true;const drift=[];for(const r of straight){number(r,'duration_s');const d=number(r,'drift_mm'),speed=number(r,'max_speed_in_s'),slip=bool(r,'slip_observed'),fault=bool(r,'thermal_or_protection_fault');drift.push(d);if(speed<config.gates.cruise_speed_in_s||slip||fault)speedFaultPass=false;}
     let spinFaultPass=true;const spins=[...left,...right].map(r=>{number(r,'duration_s');const slip=bool(r,'slip_observed'),fault=bool(r,'thermal_or_protection_fault');if(slip||fault)spinFaultPass=false;return Math.abs(number(r,'spin_error_deg'));});
     const driftPasses=drift.filter(d=>Math.abs(d)<=config.gates.maximum_straight_drift_mm).length,medianSpin=median(spins),gateApplies=mass===config.gates.e03_mass_kg;
     const pass=gateApplies?(driftPasses>=config.gates.minimum_straight_passes&&speedFaultPass&&spinFaultPass&&medianSpin<=config.gates.median_spin_error_deg):null;
     cells.push({support_configuration:support,mass_kg:mass,trial_count:cell.length,straight_drift_passes:driftPasses,max_straight_drift_mm:Math.max(...drift.map(Math.abs)),all_straight_speed_and_fault_checks_pass:speedFaultPass,all_spin_fault_checks_pass:spinFaultPass,median_absolute_spin_error_deg:round(medianSpin),gate_applies:gateApplies,diagnostic_only:!gateApplies,pass});
  }
  cells.sort((a,b)=>a.support_configuration.localeCompare(b.support_configuration)||a.mass_kg-b.mass_kg);return{status:'physical-measurements-analyzed-not-independent-validation',surface_id:surface,trial_count:rows.length,cells,qualifying_support_configurations_at_4kg:cells.filter(x=>x.gate_applies&&x.pass).map(x=>x.support_configuration),all_4kg_cells_pass:cells.filter(x=>x.gate_applies).every(x=>x.pass)};
}
function measuredE02(text){
  const rows=parseCsv(text);if(rows.length!==18)throw new Error(`18 E02 rows required; found ${rows.length}`);const groups=new Map();let maxCurrent=0;
  for(const r of rows){const bus=number(r,'bus_v');if(bus<=0)throw new Error(`${r.trial_id}: positive bus voltage required`);if(!r.driver_id)throw new Error(`${r.trial_id}: driver ID required`);const rpm=number(r,'rpm'),torque=number(r,'torque_nm'),current=number(r,'current_a'),temp=number(r,'temperature_c');bool(r,'thermal_or_protection_fault');maxCurrent=Math.max(maxCurrent,Math.abs(current));const key=`${r.motor}|${r.bus_case}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push({rpm,torque,current,temp,bus,driver:r.driver_id,fault:r.thermal_or_protection_fault==='true'});}
  if(groups.size!==6)throw new Error('six motor/bus cells required');const cells=[];
  for(const[key,values]of groups){if(values.length!==3)throw new Error(`${key}: three runs required`);const[motor,bus_case]=key.split('|'),mean=k=>round(values.reduce((s,x)=>s+x[k],0)/values.length);cells.push({motor,bus_case,driver_ids:[...new Set(values.map(x=>x.driver))],run_count:3,mean_bus_v:mean('bus'),mean_rpm:mean('rpm'),mean_torque_nm:mean('torque'),mean_current_a:mean('current'),maximum_temperature_c:Math.max(...values.map(x=>x.temp)),any_fault:values.some(x=>x.fault)});}
  return{status:'measured-e02-summary-not-a-component-rating',trial_count:18,cells,minimum_driver_continuous_current_screen_a:round(1.25*maxCurrent),screen_basis:'1.25 times maximum recorded per-motor current; peak, stall, transients, thermal and supply limits still require engineering review.'};
}
function csv(rows){
  const headers=Object.keys(rows[0]),quote=value=>`"${String(value??'').replaceAll('"','""')}"`;
  return headers.map(quote).join(',')+'\n'+rows.map(r=>headers.map(h=>quote(r[h])).join(',')).join('\n')+'\n';
}
function expectedSlots(kind,config){
  const slots=[];
  if(kind==='E02'){for(const motor of['left','right'])for(const bus of['minimum','nominal','maximum'])for(let run=1;run<=3;run++)slots.push(`${motor}|${bus}|${run}`);}
  else for(const s of config.support_configurations)for(const mass of config.mass_cases_kg){
    for(let n=1;n<=config.gates.straight_runs_per_cell;n++)slots.push(`${s.id}|${mass}|straight|forward|${n}`);
    for(const direction of['left','right'])for(let n=1;n<=config.gates.spin_runs_per_direction_per_cell;n++)slots.push(`${s.id}|${mass}|spin|${direction}|${n}`);
  }
  return slots;
}
const slotFor=(r,kind)=>kind==='E02'?`${r.motor}|${r.bus_case}|${r.run}`:`${r.support_configuration}|${r.mass_kg}|${r.run_type}|${r.direction}|${r.repeat}`;
function required(r,key){if(typeof r[key]!=='string'||!r[key].trim()||/^(DOCUMENT_SURFACE|TBD|TODO|UNKNOWN|PLACEHOLDER)$/i.test(r[key].trim()))throw new Error(`${r.trial_id}: documented ${key} required`);}
function analyze(text,kind,config,{progress=false}={}){
  const rows=parseCsv(text),expected=expectedSlots(kind,config),allowed=new Set(expected),ids=new Map(),completed=[],occupied=new Set();
  for(const key of provenanceColumns)if(!(key in rows[0]))throw new Error(`missing provenance column ${key}; migrate legacy logs without inventing measurements`);
  for(const r of rows){required(r,'trial_id');if(ids.has(r.trial_id))throw new Error(`duplicate trial_id ${r.trial_id}`);ids.set(r.trial_id,r);}
  for(const r of rows){
    const slot=slotFor(r,kind);if(!allowed.has(slot))throw new Error(`${r.trial_id}: invalid ${kind} trial slot ${slot}`);
    const state=r.attempt_status||'planned';if(!['planned','completed','aborted','excluded'].includes(state))throw new Error(`${r.trial_id}: invalid attempt_status`);
    if(state==='planned'){
      const measurementKeys=kind==='E02'?['bus_v','rpm','torque_nm','current_a','temperature_c','thermal_or_protection_fault']:['duration_s','drift_mm','spin_error_deg','max_speed_in_s','slip_observed','thermal_or_protection_fault'];
      if(measurementKeys.some(k=>r[k]?.trim()))throw new Error(`${r.trial_id}: measurements require explicit attempt_status`);
      continue;
    }
    for(const key of provenanceColumns.filter(k=>!['attempt_status','exclusion_reason','replaces_trial_id'].includes(k)))required(r,key);
    if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(r.recorded_at)||!Number.isFinite(Date.parse(r.recorded_at)))throw new Error(`${r.trial_id}: recorded_at requires ISO timestamp with timezone`);
    if(kind==='E03')required(r,'surface_id');
    if(r.replaces_trial_id){const prior=ids.get(r.replaces_trial_id);if(!prior||!['aborted','excluded'].includes(prior.attempt_status)||slotFor(prior,kind)!==slot)throw new Error(`${r.trial_id}: replacement must reference an aborted/excluded attempt in the same slot`);}
    if(state!=='completed'){required(r,'exclusion_reason');continue;}
    if(r.exclusion_reason?.trim())throw new Error(`${r.trial_id}: completed attempts cannot carry an exclusion_reason`);
    if(occupied.has(slot))throw new Error(`duplicate completed trial slot ${slot}`);occupied.add(slot);
    if(kind==='E02'){
      if(number(r,'bus_v')<=0)throw new Error(`${r.trial_id}: positive bus voltage required`);required(r,'driver_id');
      for(const k of['rpm','torque_nm','current_a','temperature_c'])number(r,k);bool(r,'thermal_or_protection_fault');
    }else{
      if(number(r,'duration_s')<=0)throw new Error(`${r.trial_id}: positive duration required`);
      bool(r,'slip_observed');bool(r,'thermal_or_protection_fault');
      if(r.run_type==='straight'){number(r,'drift_mm');if(number(r,'max_speed_in_s')<0)throw new Error(`${r.trial_id}: nonnegative speed required`);}
      else number(r,'spin_error_deg');
    }
    completed.push(r);
  }
  const configurationIds=[...new Set(completed.map(r=>r.configuration_id))],surfaceIds=[...new Set(rows.filter(r=>r.attempt_status&&r.attempt_status!=='planned').map(r=>r.surface_id))];
  if(configurationIds.length>1)throw new Error('one hardware configuration_id per analysis file; support/mass variants are separate columns');
  if(new Set(completed.map(r=>r.control_revision)).size>1)throw new Error('one control_revision per analysis file');
  if(kind==='E03'&&surfaceIds.length>1)throw new Error('one surface per analysis file');
  const missing=expected.filter(s=>!occupied.has(s)),attempts=rows.filter(r=>['aborted','excluded'].includes(r.attempt_status)).map(r=>({trial_id:r.trial_id,attempt_status:r.attempt_status,reason:r.exclusion_reason,slot:slotFor(r,kind)}));
  const provenance={input_sha256:crypto.createHash('sha256').update(text).digest('hex'),session_ids:[...new Set(completed.map(r=>r.session_id))],configuration_ids:configurationIds,raw_observation_refs:[...new Set(completed.map(r=>r.raw_observation_ref))],references_verified:false};
  const audit={planned_slot_count:expected.length,completed_slot_count:completed.length,missing_slots:missing,retained_noncompleted_attempts:attempts,logged_attempt_count:rows.filter(r=>r.attempt_status&&r.attempt_status!=='planned').length,provenance};
  if(progress)return{status:'progress-only-not-qualification',qualification_issued:false,trial_count:completed.length,...audit,completed_fault_count:completed.filter(r=>r.thermal_or_protection_fault==='true'||r.slip_observed==='true').length};
  if(missing.length)throw new Error(`${kind}: incomplete matrix; ${missing.length} required slots missing; use --progress for a non-qualifying report`);
  const summary=kind==='E02'?measuredE02(csv(completed)):measuredE03(csv(completed),config);
  return{...summary,qualification_issued:false,...audit,limitations:'Agent-run arithmetic on supplied records, not independent physical validation. Referenced setup approvals, calibration and raw files require human review. Exclusions and replacements require review before accepting any gate result.'};
}
const summarizeE02=(text,options)=>analyze(text,'E02',null,options);
const summarizeE03=(text,config,options)=>analyze(text,'E03',config,options);
if(require.main===module){
  const args=process.argv.slice(2),get=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:null;},input=get('--input'),output=get('--output'),kind=get('--kind')||'E03';
  if(!input||!output||!['E02','E03'].includes(kind)||args.some(a=>a.startsWith('--')&&!['--kind','--input','--output','--progress'].includes(a)))throw new Error('usage: node tools/mule-measurements-v4.js --kind E02|E03 --input FILE --output NEW_FILE [--progress]');
  if(path.resolve(input)===path.resolve(output))throw new Error('output must not overwrite raw input');
  const configText=fs.readFileSync(`${__dirname}/../drivetrain-mule-v4.json`,'utf8'),config=JSON.parse(configText),text=fs.readFileSync(input,'utf8'),options={progress:args.includes('--progress')},summary=kind==='E03'?summarizeE03(text,config,options):summarizeE02(text,options);
  summary.provenance.config_sha256=crypto.createHash('sha256').update(configText).digest('hex');summary.provenance.analyzer_sha256=crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex');
  fs.writeFileSync(output,JSON.stringify(summary,null,2)+'\n',{flag:'wx'});console.log(`Wrote ${output}: ${summary.status}; ${summary.trial_count} completed ${kind} trials; no independent hardware qualification.`);
}
module.exports={parseCsv,summarizeE02,summarizeE03,provenanceColumns};
