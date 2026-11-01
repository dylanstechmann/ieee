#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {build}=require('./constrained-field-v3');
const {samples,checkPose,makeField,footprint,svg}=require('./navigation-v3');
const {study}=require('./differential-drive-v3');
const root=path.resolve(__dirname,'..');
const delta=(a,b)=>((b-a)%360+540)%360-180;

function centeredEnvelope(envelope) {
  for (const key of ['front_in','rear_in','left_in','right_in']) if (!Number.isFinite(envelope[key])||envelope[key]<=0) throw new Error(`positive finite ${key} required`);
  return {length_in:2*Math.max(envelope.front_in,envelope.rear_in),width_in:2*Math.max(envelope.left_in,envelope.right_in)};
}

// Every body point moves by at most d + R*|angle| over an interval. At any
// interpolated pose the nearer endpoint is at most half that bound away.
// Positive endpoint clearance minus half-bound is a sufficient condition for
// separation throughout this modeled interval, not a hardware guarantee.
function intervalBounds(route,robot,field,sampling) {
  footprint([0,0,0],robot);
  const poses=samples(route.waypoints,sampling),checks=poses.map(p=>checkPose(p,robot,field));
  const radius=Math.hypot(robot.length_in,robot.width_in)/2;
  let lower=Infinity,unresolved=0,first=null;
  for (let i=1;i<poses.length;i++) {
    const a=poses[i-1],b=poses[i];
    const motion=Math.hypot(b[0]-a[0],b[1]-a[1])+radius*Math.abs(delta(a[2],b[2]))*Math.PI/180;
    const bound=Math.min(checks[i-1].clearance_in,checks[i].clearance_in)-motion/2;
    lower=Math.min(lower,bound);
    if (checks[i-1].hits.length||checks[i].hits.length||bound<=1e-9) {
      unresolved++;
      if (!first) first={from_sample:i-1,to_sample:i,from_pose:a,to_pose:b,clearance_lower_bound_in:bound,endpoint_hits:[checks[i-1].hits,checks[i].hits]};
    }
  }
  return {interval_count:poses.length-1,positive_bound_for_all_intervals:unresolved===0,unresolved_intervals:unresolved,min_clearance_lower_bound_in:lower,first_unresolved_interval:first};
}

function ids(items,label) {
  if (!Array.isArray(items)||!items.length) throw new Error(`nonempty ${label} required`);
  const seen=new Set();
  for (const item of items) {
    if (typeof item.id!=='string'||!/^[a-z0-9-]+$/.test(item.id)||seen.has(item.id)) throw new Error(`unique safe ${label} id required`);
    seen.add(item.id);
  }
}
function runStress(model,navigation,drive,config) {
  ids(config.envelopes,'envelope');ids(config.obstacle_cases,'obstacle case');
  const results=[];
  for (const envelope of config.envelopes) for (const obstacleCase of config.obstacle_cases) {
    if (obstacleCase.evidence!=='hypothetical') throw new Error('only explicitly hypothetical obstacle cases supported until measurement provenance is implemented');
    if (!Array.isArray(obstacleCase.obstacles)) throw new Error('obstacles array required');
    const nav=structuredClone(navigation);
    nav.robot=centeredEnvelope(envelope);
    // Never discard obstacles already supplied in the shared navigation inputs.
    nav.obstacles.push(...structuredClone(obstacleCase.obstacles));
    const report=study(model,nav,drive);
    const scenarios=report.scenarios.map(s=>{
      const wall=nav.wall_scenarios.find(w=>w.id===s.wall),route=report.routes.find(r=>r.id===s.route);
      return {...s,nominal_interval_bounds:intervalBounds(route,nav.robot,makeField(model,nav,wall),nav.sampling)};
    });
    results.push({envelope:envelope.id,obstacle_case:obstacleCase.id,robot:nav.robot,scenarios});
  }
  return {status:config.status,provenance:'Agent-run sensitivity study using archived V3-derived geometry; no owner physical measurements or hardware tests.',
    policy:{envelope:'Centered conservative rectangular enclosure about the assumed axle midpoint; not a detailed mechanism or tire model.',
      interval_bound:'Nominal modeled interpolation only: min(endpoint clearances) - (translation + circumradius * absolute rotation radians)/2. Positive values give a conservative geometric separation bound using floating-point arithmetic, not a formally verified certificate.',
      unresolved:'Nonpositive interval bounds mean unresolved or colliding, not necessarily a detected collision. Inspect sampled hits separately.',
      uncertainty:'Inherited sampled constant-pose perturbations and one-at-a-time solid/target shifts. No simultaneous full-field errors, control dynamics or sensing.',
      scope:'Hypothetical fixed-route stress cases only. No avoidance planner, official obstacle legality, mission qualification, dimensional compliance or hardware selection.'},
    assumptions:config.notes,config,navigation_config:navigation,drive_config:drive,results};
}
function summary(report) {
  const lines=['# Navigation packaging / obstacle stress results','','Agent-run hypothetical engineering probes; not measured field or hardware results.','',
    '| Envelope | Obstacle case | Nominal collision-free / total | Nominal docking >75% / total | Sampled stress passes / cases | Nominal positive interval bounds / total | Worst sampled clearance (in) |',
    '|---|---|---:|---:|---:|---:|---:|'];
  for (const r of report.results) {
    const s=r.scenarios,total=s.reduce((n,c)=>n+c.sweep.cases,0),failures=s.reduce((n,c)=>n+c.sweep.failures,0);
    lines.push(`| ${r.envelope} | ${r.obstacle_case} | ${s.filter(c=>c.nominal.collision_free).length}/${s.length} | ${s.filter(c=>c.nominal.docking_over_75_percent).length}/${s.length} | ${total-failures}/${total} | ${s.filter(c=>c.nominal_interval_bounds.positive_bound_for_all_intervals).length}/${s.length} | ${Math.min(...s.map(c=>c.sweep.min_sampled_clearance_in)).toFixed(3)} |`);
  }
  lines.push('','Stress pass requires sampled collision clearance AND >75% docking overlap. Nominal collision-free counts do not imply docking success. Interval bounds are nominal only; a failed bound is inconclusive unless a collision is detected. See report.json for docking, collisions, unresolved intervals, and variant failure examples.','');
  return lines.join('\n');
}
module.exports={centeredEnvelope,intervalBounds,runStress,summary};
if (require.main===module) {
  const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
  const source=read('constrained-field-v3.json'),model=build(source,read(source.trace_file));
  const navigation=read('navigation-v3.json'),drive=read('differential-drive-v3.json'),config=read('navigation-stress-v3.json');
  const report=runStress(model,navigation,drive,config),out=path.join(root,'derived/navigation-stress-v3');
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(path.join(out,'summary.md'),summary(report));
  // One visualization per probe for the baseline envelope; all envelopes remain
  // in the machine-readable report, without implying any route was repaired.
  for (const obstacleCase of config.obstacle_cases) {
    const nav=structuredClone(navigation);nav.robot=centeredEnvelope(config.envelopes[0]);
    nav.obstacles.push(...structuredClone(obstacleCase.obstacles));
    fs.writeFileSync(path.join(out,`${obstacleCase.id}.svg`),svg(study(model,nav,drive),model));
  }
  console.log(summary(report));console.log(`Wrote ${out}`);
}