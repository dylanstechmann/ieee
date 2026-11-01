#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {build}=require('./constrained-field-v3');
const {checkPose,checkRoute,makeField,svg}=require('./navigation-v3');
const {routesFor,primitives}=require('./differential-drive-v3');
const {createPlanner}=require('./avoidance-v3');
const {intervalBounds}=require('./navigation-stress-v3');
const root=path.resolve(__dirname,'..');
const heading=a=>((a%360)+360)%360;

function validateContract(c) {
  if(!c.phase_regions||!Array.isArray(c.leg_phases)||c.leg_phases.length!==25)throw new Error('25 leg phases required for V3 route template');
  for(const [name,r] of Object.entries(c.phase_regions))if(!/^[a-z-]+$/.test(name)||!Array.isArray(r)||r.length!==4||r.some(n=>!Number.isFinite(n))||r[0]>=r[2]||r[1]>=r[3])throw new Error('finite nonempty rectangular phase regions required');
  if(c.leg_phases.some(p=>!c.phase_regions[p]))throw new Error('unknown phase');
  if(!Array.isArray(c.gates)||!c.gates.length||new Set(c.gates.map(g=>g.id)).size!==c.gates.length)throw new Error('unique gates required');
  for(const g of c.gates)if(!/^[a-z-]+$/.test(g.id)||![0,1].includes(g.axis)||!Number.isFinite(g.value)||![1,-1].includes(g.direction)||!Array.isArray(g.span)||g.span.length!==2||g.span.some(n=>!Number.isFinite(n))||g.span[0]>=g.span[1])throw new Error('invalid gate');
  if(!Array.isArray(c.pit_staging_x_candidates_in)||!c.pit_staging_x_candidates_in.length||c.pit_staging_x_candidates_in.length>10||c.pit_staging_x_candidates_in.some(x=>!Number.isFinite(x)||x<=0||x>=28)||new Set(c.pit_staging_x_candidates_in).size!==c.pit_staging_x_candidates_in.length)throw new Error('bounded unique staging candidates required');
  if(!Array.isArray(c.planning_modes)||c.planning_modes.some(m=>!['constrained-nominal','constrained-variants'].includes(m))||!c.planning_modes.length||new Set(c.planning_modes).size!==c.planning_modes.length)throw new Error('unique known planning modes required');
}
function inside(p,r){return p[0]>=r[0]-1e-9&&p[0]<=r[2]+1e-9&&p[1]>=r[1]-1e-9&&p[1]<=r[3]+1e-9;}
// Center translation is affine, so endpoint containment in this convex rectangle
// covers every interpolated center, including spins. Not footprint containment.
function regionPolicy(rect){return {pose:p=>inside(p,rect),edge:(a,b)=>inside(a,rect)&&inside(b,rect)};}
function gateTrace(points,gates) {
  const events=[];
  for(const gate of gates){
    let last=null,contact=null;
    for(let i=0;i<points.length;i++){
      const p=points[i],d=p[gate.axis]-gate.value;
      if(Math.abs(d)<1e-9){contact=p;continue;} // Keep last strict side through landings/spins.
      const side=Math.sign(d);
      if(last&&side!==last.side){
        const a=last.pose,t=(gate.value-a[gate.axis])/(p[gate.axis]-a[gate.axis]);
        const other=1-gate.axis,cross=contact?contact[other]:a[other]+t*(p[other]-a[other]);
        if(cross>=gate.span[0]-1e-9&&cross<=gate.span[1]+1e-9)events.push({gate:gate.id,direction:side,segment:i-1,fraction:t,other_coordinate:cross});
      }
      last={pose:p,side};contact=null;
    }
  }
  events.sort((a,b)=>a.segment-b.segment||a.fraction-b.fraction);
  const violations=[];
  events.forEach((event,i)=>{const expected=gates[i];if(!expected||event.gate!==expected.id||event.direction!==expected.direction)violations.push({kind:'unexpected-gate-crossing',event,expected:expected?.id??null});});
  if(events.length!==gates.length)violations.push({kind:'gate-count',expected:gates.length,actual:events.length});
  return {valid:!violations.length,events,violations};
}
function checkContract(route,original,c) {
  if(!route||!original||!Array.isArray(route.waypoints)||!Array.isArray(original.waypoints)||original.waypoints.length!==c.leg_phases.length+1||route.waypoints.some(p=>!Array.isArray(p)||p.length!==3||p.some(n=>!Number.isFinite(n))))return {valid:false,violations:[{kind:'route-template'}],gates:null};
  const violations=[],indices=route.anchor_waypoint_indices;
  if(!indices||indices.length!==original.waypoints.length||indices[0]!==0||indices.at(-1)!==route.waypoints.length-1||indices.some((n,i)=>!Number.isInteger(n)||n<0||n>=route.waypoints.length||(i>0&&n<=indices[i-1])))return {valid:false,violations:[{kind:'anchor-map'}],gates:null};
  for(let i=0;i<indices.length;i++){
    const p=route.waypoints[indices[i]],q=original.waypoints[i];
    if(Math.hypot(p[0]-q[0],p[1]-q[1])>1e-8||Math.abs(heading(p[2])-heading(q[2]))>1e-8)violations.push({kind:'anchor-mismatch',anchor:i});
  }
  if(route.docking_waypoint_index!==indices[original.docking_waypoint_index])violations.push({kind:'docking-index'});
  for(let leg=0;leg<c.leg_phases.length;leg++){
    const phase=c.leg_phases[leg],rect=c.phase_regions[phase];
    for(let i=indices[leg];i<=indices[leg+1];i++)if(!inside(route.waypoints[i],rect)){violations.push({kind:'phase-region',leg,phase,waypoint:i});break;}
  }
  const gates=gateTrace(route.waypoints,c.gates);violations.push(...gates.violations);
  return {valid:!violations.length,violations,gates};
}
function variants(base,u,target=null) {
  for(const k of ['element_shift_in','position_error_in','heading_error_deg'])if(!Number.isFinite(u[k])||u[k]<0)throw new Error('nonnegative finite uncertainty required');
  const out=[];
  for(const dx of [-u.position_error_in,0,u.position_error_in])for(const dy of [-u.position_error_in,0,u.position_error_in])for(const da of [-u.heading_error_deg,0,u.heading_error_deg])out.push({id:`pose:${dx},${dy},${da}`,field:base,error:[dx,dy,da],target});
  for(let i=0;i<base.solids.length;i++)for(const axis of [0,1])for(const sign of [-1,1]){
    const field=structuredClone(base);field.solids[i].vertices_in.forEach(p=>p[axis]+=sign*u.element_shift_in);
    out.push({id:`shift:${base.solids[i].id}:${axis}:${sign}`,field,error:[0,0,0],target});
  }
  if(target)for(const axis of [0,1])for(const sign of [-1,1])out.push({id:`target-shift:${axis}:${sign}`,field:base,error:[0,0,0],target:target.map(p=>p.map((n,i)=>n+(i===axis?sign*u.element_shift_in:0)))});
  return out;
}
const transformed=(points,error)=>points.map(p=>p.map((n,i)=>n+error[i]));
function uncertaintyPolicy(robot,base,sampling,u,margin) {
  const cases=variants(base,u),radius=Math.hypot(robot.length_in,robot.width_in)/2;
  // Sufficient shortcut for all enumerated constant offsets or separate shifts.
  // Not a replacement for explicit checks when clearance is below this threshold.
  const displacement=Math.max(Math.SQRT2*u.position_error_in+2*radius*Math.sin(Math.min(180,u.heading_error_deg)*Math.PI/360),u.element_shift_in);
  const safePose=p=>cases.every(v=>{const c=checkPose(transformed([p],v.error)[0],robot,v.field);return !c.hits.length&&c.clearance_in>margin;});
  const policy={
    pose:p=>checkPose(p,robot,base).clearance_in>margin+displacement||safePose(p),
    edge:(a,b)=>{
      const nominal=intervalBounds({waypoints:[a,b]},robot,base,sampling);
      if(nominal.min_clearance_lower_bound_in>margin+displacement)return true;
      return cases.every(v=>intervalBounds({waypoints:transformed([a,b],v.error)},robot,v.field,sampling).min_clearance_lower_bound_in>margin);
    }
  };
  policy.poseReason=p=>{
    for(const v of cases){const check=checkPose(transformed([p],v.error)[0],robot,v.field);if(check.hits.length||check.clearance_in<=margin)return {kind:'uncertainty-pose',variant:v.id,check};}
    return null;
  };
  policy.edgeReason=(a,b)=>{
    for(const v of cases){const bounds=intervalBounds({waypoints:transformed([a,b],v.error)},robot,v.field,sampling);if(bounds.min_clearance_lower_bound_in<=margin)return {kind:'uncertainty-interval',variant:v.id,bounds};}
    return null;
  };
  return policy;
}
function classify(r) {
  const categories=[];
  if(!r.collision_free)for(const hit of r.first_collision.hits)categories.push(hit==='board_or_wall'?'outer-boundary':hit==='center_divider_axis'?'center-divider':hit==='pit_divider_axis'?'pit-divider':'obstacle');
  if(r.docking_over_75_percent===false)categories.push('docking-overlap');
  return [...new Set(categories)];
}
function evaluate(route,field,nav,target,withIntervals=true) {
  const nominal=checkRoute(route,nav.robot,field,nav.sampling,[0,0,0],target);
  const cases=variants(field,nav.uncertainty,target),failures=[],unresolved=[];
  for(const v of cases){
    const r=checkRoute(route,nav.robot,v.field,nav.sampling,v.error,v.target),categories=classify(r);
    const bounds=withIntervals?intervalBounds({waypoints:transformed(route.waypoints,v.error)},nav.robot,v.field,nav.sampling):null;
    if(categories.length)failures.push({variant:v.id,categories,first_collision:r.first_collision,docking_overlap_fraction:r.docking_overlap_fraction});
    if(bounds&&!bounds.positive_bound_for_all_intervals)unresolved.push({variant:v.id,...bounds});
  }
  return {nominal,nominal_interval_bounds:intervalBounds(route,nav.robot,field,nav.sampling),cases:cases.length,sampled_failures:failures.length,failures,interval_unresolved_count:withIntervals?unresolved.length:null,interval_unresolved:withIntervals?unresolved:null};
}
function failureLedger(baseline,model) {
  const entries=[];let cases=0;
  for(const row of baseline.results){const nav=row.report.config,field=makeField(model,nav,nav.wall_scenarios[0]);
    for(const route of row.report.routes){const target=model.features.find(f=>f.id===route.target_id).vertices_in,e=evaluate(route,field,nav,target,false);cases+=e.cases;
      for(const f of e.failures){const n=f.first_collision?.sample;let count=0,segment=null;
        if(n!==undefined){const {samples}=require('./navigation-v3');for(let i=1;i<route.waypoints.length;i++){count+=samples(route.waypoints.slice(i-1,i+1),nav.sampling).length-1;if(n<=count){segment=i-1;break;}}}
        entries.push({obstacle_case:row.obstacle_case,wall:row.wall,route:route.id,segment,...f});
      }
    }
  }
  const byCategory={};for(const e of entries)for(const k of e.categories)byCategory[k]=(byCategory[k]??0)+1;
  return {cases,failed_cases:entries.length,by_category:byCategory,entries,scope:'Complete first-collision/docking record for every failed variant. Later contacts within the same variant are not enumerated. Interval checks not rerun for historical baseline ledger.'};
}
function planCandidate(original,field,nav,config,c,mode) {
  const robust=mode==='constrained-variants'?uncertaintyPolicy(nav.robot,field,nav.sampling,nav.uncertainty,config.clearance_margin_in):null;
  const planners=new Map(),points=[original.waypoints[0]],indices=[0],legs=[];
  for(let leg=0;leg<25;leg++){
    const phase=c.leg_phases[leg];
    if(!planners.has(phase)){
      const region=regionPolicy(c.phase_regions[phase]);
      planners.set(phase,createPlanner(nav.robot,field,nav.sampling,config,original.waypoints,{
        pose:p=>region.pose(p)&&(!robust||robust.pose(p)),edge:(a,b)=>region.edge(a,b)&&(!robust||robust.edge(a,b))
      }));
    }
    const r=planners.get(phase).search(original.waypoints[leg],original.waypoints[leg+1]);
    legs.push({leg,phase,status:r.status,expanded:r.expanded});
    if(r.status!=='found')return {status:r.status,failed_leg:leg,legs,route:null};
    points.push(...r.waypoints.slice(1));indices.push(points.length-1);
  }
  const route={...original,id:`contract-${original.id}`,waypoints:points,anchor_waypoint_indices:indices,docking_waypoint_index:indices[original.docking_waypoint_index],kinematics:primitives(points,config.wheel_track_in)};
  const contract=checkContract(route,original,c);
  return contract.valid?{status:'found',legs,route,contract}:{status:'contract-rejected',legs,route:null,contract};
}
function comparisonSummary(r) {
  const lines=['# Route-contract comparison','','Provisional center-region/gate contract; not official lap legality or hardware validation.','',
    '| Mode | Probe | Wall | Completed / attempted | Sampled pass / scheduled | Untested (search failures) | Interval-clear / tested |','|---|---|---|---:|---:|---:|---:|'];
  for(const row of r.baseline_audit??[])lines.push(`| historical-nominal (${row.contract_passes}/3 contract-valid) | ${row.obstacle_case} | ${row.wall} | 3/3 | ${row.sampled_passes}/${row.cases} | 0 | not recomputed |`);
  for(const row of r.results){let scheduled=0,passes=0,untested=0,clear=0,tested=0;
    for(const p of row.plans){scheduled+=p.scheduled_cases;if(!p.evaluation){untested+=p.scheduled_cases;continue;}passes+=p.evaluation.cases-p.evaluation.sampled_failures;tested+=p.evaluation.cases;clear+=p.evaluation.cases-p.evaluation.interval_unresolved_count;}
    lines.push(`| ${row.mode} | ${row.obstacle_case} | ${row.wall} | ${row.plans.filter(p=>p.status==='found').length}/${row.plans.length} | ${passes}/${scheduled} | ${untested} | ${clear}/${tested} |`);
  }
  lines.push('','Unplanned cases remain in scheduled denominator, not counted as measured collisions. Interval-clear counts address geometry only; docking is a separate sampled metric. Historical baseline: '+r.baseline_ledger.failed_cases+' failed / '+r.baseline_ledger.cases+' cases.','');return lines.join('\n');
}
function runComparison(model,nav,drive,stress,config,c,baseline) {
  validateContract(c);const results=[];
  for(const mode of c.planning_modes)for(const id of config.obstacle_case_ids)for(const wall of nav.wall_scenarios){
    const probe=stress.obstacle_cases.find(p=>p.id===id);if(!probe||probe.evidence!=='hypothetical')throw new Error('hypothetical probe required');
    const navigation=structuredClone(nav);navigation.obstacles.push(...probe.obstacles);navigation.wall_scenarios=[wall];
    const field=makeField(model,navigation,wall),plans=[];
    for(const base of routesFor(model,drive)){
      const attempts=[];let selected=null;
      for(const x of c.pit_staging_x_candidates_in){
        const original=routesFor(model,{...drive,pit_staging_x_in:x}).find(r=>r.id===base.id);
        const attempt=planCandidate(original,field,navigation,config,c,mode);
        attempts.push({staging_x_in:x,status:attempt.status,failed_leg:attempt.failed_leg??null,legs:attempt.legs,contract:attempt.contract??null});
        if(attempt.status==='found'){selected={...attempt,original,staging_x_in:x};break;}
      }
      const target=model.features.find(f=>f.id===base.target_id).vertices_in,scheduled=variants(field,navigation.uncertainty,target).length;
      plans.push(selected?{...selected,attempts,scheduled_cases:scheduled,evaluation:evaluate(selected.route,field,navigation,target)}:{status:'no-candidate-completed',route:null,attempts,scheduled_cases:scheduled,evaluation:null});
    }
    results.push({mode,obstacle_case:id,wall:wall.id,config:navigation,plans});
    console.log(`${mode} / ${id} / ${wall.id}: ${plans.filter(p=>p.status==='found').length}/${plans.length} completed`);
  }
  const baselineAudit=baseline.results.map(row=>{
    const audits=row.report.routes.map(route=>({route:route.id,...checkContract(route,routesFor(model,drive).find(o=>route.id===`avoid-${o.id}`),c)}));
    return {obstacle_case:row.obstacle_case,wall:row.wall,contract_passes:audits.filter(a=>a.valid).length,audits,cases:row.report.scenarios.reduce((n,s)=>n+s.sweep.cases,0),sampled_passes:row.report.scenarios.reduce((n,s)=>n+s.sweep.cases-s.sweep.failures,0)};
  });
  return {status:'agent-run-provisional-route-contract-comparison',inputs:{navigation:nav,drive,stress,planner:config,contract:c},baseline_audit:baselineAudit,baseline_ledger:failureLedger(baseline,model),results};
}
function contractSvg(row,model,c) {
  let image=svg({config:row.config,routes:row.plans.filter(p=>p.route).map(p=>p.route)},model);
  let overlay='<g fill="none" stroke="#009999" stroke-width=".15" stroke-dasharray=".6 .4">';
  for(const r of Object.values(c.phase_regions))overlay+=`<rect x="${r[0]}" y="${48-r[3]}" width="${r[2]-r[0]}" height="${r[3]-r[1]}"/>`;
  overlay+='</g><g stroke="#ff0088" stroke-width=".5">';
  for(const g of c.gates)overlay+=g.axis===0?`<line x1="${g.value}" y1="${48-g.span[0]}" x2="${g.value}" y2="${48-g.span[1]}"/>`:`<line x1="${g.span[0]}" y1="${48-g.value}" x2="${g.span[1]}" y2="${48-g.value}"/>`;
  overlay+='</g><text x="0" y="69" font-family="sans-serif" font-size="1.6">Dashed: center regions; magenta: ordered spatial gates. Provisional, not legal lap validation.</text>';
  return image.replace('</svg>',overlay+'</svg>');
}
module.exports={validateContract,regionPolicy,gateTrace,checkContract,variants,uncertaintyPolicy,evaluate,failureLedger,planCandidate,runComparison,comparisonSummary,contractSvg};
if(require.main===module){
  const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8')),source=read('constrained-field-v3.json'),model=build(source,read(source.trace_file));
  const baselinePath=path.join(root,'derived/avoidance-v3/report.json'),bytes=fs.readFileSync(baselinePath),baseline=JSON.parse(bytes);
  const report=runComparison(model,read('navigation-v3.json'),read('differential-drive-v3.json'),read('navigation-stress-v3.json'),read('avoidance-v3.json'),read('route-contract-v3.json'),baseline);
  report.baseline_source={path:baselinePath,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
  const out=path.join(root,'derived/contract-navigation-v3');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(out,'summary.md'),comparisonSummary(report));
  fs.writeFileSync(path.join(out,'baseline-failure-ledger.json'),JSON.stringify(report.baseline_ledger,null,2)+'\n');
  for(const row of report.results)fs.writeFileSync(path.join(out,`${row.mode}-${row.obstacle_case}-${row.wall}.svg`),contractSvg(row,model,report.inputs.contract));
  console.log(comparisonSummary(report));
}