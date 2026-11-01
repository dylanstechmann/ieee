#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
function metrics(report){
  return report.results.flatMap(row=>row.plans.map(p=>{
    const k=p.route?.kinematics,e=p.evaluation;
    return {probe:row.obstacle_case,wall:row.wall,mode:row.mode,policy:row.policy,route:p.original_route,status:p.status,failed_segment:p.failed_segment??p.failed_leg??null,
      cases:e?.cases??null,sampled_failures:e?.sampled_failures??null,interval_unresolved:e?.interval_unresolved_count??null,contract_failures:p.perturbed_contract?.failures.length??null,
      nominal_clearance_lower_bound_in:e?.nominal_interval_bounds.min_clearance_lower_bound_in??null,min_docking_overlap_fraction:e?Math.min(e.nominal.docking_overlap_fraction,...e.failures.map(f=>f.docking_overlap_fraction)):null,
      translation_in:k?.translation_in??null,absolute_wheel_travel_in:k?.absolute_wheel_travel_in??null,absolute_rotation_deg:k?.absolute_rotation_deg??null,
      reverse_translation_in:k?k.segments.filter(s=>s.kind==='reverse').reduce((n,s)=>n+s.translation_in,0):null,spin_count:k?k.segments.filter(s=>s.kind==='spin').length:null};
  }));
}
function summary(rows){
  const lines=['# Complete candidate evidence and maneuver cost','','No weighted winner: alternate access assumptions are not interchangeable. Agent-run ideal geometry only; distances are not time. Docking minimum below is nominal plus failed-variant records only, NOT all passing variants.','', '| Probe | Wall | Mode | Policy | Pit route | Status | Collision/docking failures | Unresolved intervals | Contract failures | Wheel travel (in) | Reverse (in) | Spins |','|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|'];
  for(const r of rows)lines.push(`| ${r.probe} | ${r.wall} | ${r.mode} | ${r.policy} | ${r.route} | ${r.status} | ${r.sampled_failures===null?'untested':`${r.sampled_failures}/${r.cases}`} | ${r.interval_unresolved??'untested'} | ${r.contract_failures??'untested'} | ${r.absolute_wheel_travel_in?.toFixed(2)??'—'} | ${r.reverse_translation_in?.toFixed(2)??'—'} | ${r.spin_count??'—'} |`);
  return lines.join('\n')+'\n';
}
module.exports={metrics,summary};
if(require.main===module){const file=path.join(root,'derived/connected-navigation-v3/report.json'),bytes=fs.readFileSync(file),rows=metrics(JSON.parse(bytes)),out=path.dirname(file);fs.writeFileSync(path.join(out,'candidate-metrics.json'),JSON.stringify({source_sha256:crypto.createHash('sha256').update(bytes).digest('hex'),scope:'Finite ideal-path evidence, no hardware qualification or score prediction',rows},null,2)+'\n');fs.writeFileSync(path.join(out,'candidate-metrics.md'),summary(rows));console.log(`${rows.length} candidate outcomes summarized`);}