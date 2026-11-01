#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {build}=require('./constrained-field-v3');
const {makeField,footprint}=require('./navigation-v3');
const {routesFor}=require('./differential-drive-v3');
const {createPlanner}=require('./avoidance-v3');
const {regionPolicy,uncertaintyPolicy,validateContract,checkContract,variants,planCandidate,evaluate}=require('./contract-navigation-v3');
const {auditProgress}=require('./route-progress-v3');
const root=path.resolve(__dirname,'..');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
function diagnosticPolicy(rect,robust=null){
  const region=regionPolicy(rect);
  return {
    pose:p=>region.pose(p)&&(!robust||robust.pose(p)),
    edge:(a,b)=>region.edge(a,b)&&(!robust||robust.edge(a,b)),
    poseReason:p=>!region.pose(p)?{kind:'phase-region',region:rect}:robust?.poseReason(p),
    edgeReason:(a,b)=>!region.edge(a,b)?{kind:'phase-region',region:rect}:robust?.edgeReason(a,b)
  };
}
function validateDiagnostics(config,c,stress){
  if(!Array.isArray(config.grid_steps_in)||!config.grid_steps_in.length||config.grid_steps_in.some(n=>!Number.isFinite(n)||n<=0)||new Set(config.grid_steps_in).size!==config.grid_steps_in.length)throw new Error('unique positive grid steps required');
  if(!Number.isInteger(config.max_expansions)||config.max_expansions<1||!Number.isInteger(config.budget_retry_expansions)||config.budget_retry_expansions<config.max_expansions)throw new Error('ordered positive integer budgets required');
  if(!Array.isArray(config.failed_legs)||!config.failed_legs.length)throw new Error('failed-leg probes required');
  for(const p of config.failed_legs)if(!Number.isInteger(p.leg)||p.leg<0||p.leg>=c.leg_phases.length||!stress.obstacle_cases.some(o=>o.id===p.obstacle_case&&o.evidence==='hypothetical')||!Array.isArray(p.staging_x_in)||!p.staging_x_in.length||p.staging_x_in.some(x=>!c.pit_staging_x_candidates_in.includes(x)))throw new Error('known hypothetical failed leg and configured staging required');
}
function diagnosticSvg(row){
  const pts=p=>p.map(([x,y])=>`${x},${48-y}`).join(' '),r=row.region;
  let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -8 100 62" width="1000" height="620"><rect width="96" height="48" fill="#182330"/>';
  for(const solid of row.field.solids)s+=`<polygon points="${pts(solid.vertices_in)}" fill="#dba66b"/>`;
  const b=row.field.bounds;s+=`<rect x="${b[0]}" y="${48-b[3]}" width="${b[2]-b[0]}" height="${b[3]-b[1]}" fill="none" stroke="white" stroke-width=".2"/>`;
  s+=`<rect x="${r[0]}" y="${48-r[3]}" width="${r[2]-r[0]}" height="${r[3]-r[1]}" fill="none" stroke="#00bbbb" stroke-width=".3"/>`;
  for(const g of row.gates??[])s+=g.axis===0?`<line x1="${g.value}" y1="${48-g.span[0]}" x2="${g.value}" y2="${48-g.span[1]}" stroke="#ff77dd" stroke-width=".25"/>`:`<line x1="${g.span[0]}" y1="${48-g.value}" x2="${g.span[1]}" y2="${48-g.value}" stroke="#ff77dd" stroke-width=".25"/>`;
  for(const p of row.search.diagnostics.expanded_samples)s+=`<circle cx="${p[0]}" cy="${48-p[1]}" r=".15" fill="#99bbff"/>`;
  for(const [i,p] of [row.start,row.goal].entries())s+=`<polygon points="${pts(footprint(p,row.robot))}" fill="none" stroke="${i?'#ffdd66':'#66ffaa'}" stroke-width=".3"/>`;
  for(const examples of Object.values(row.search.diagnostics.examples))for(const e of examples){const p=e.pose??e.to;if(p)s+=`<circle cx="${p[0]}" cy="${48-p[1]}" r=".35" fill="#ff6666"/>`;}
  if(row.search.waypoints)s+=`<polyline points="${pts(row.search.waypoints)}" fill="none" stroke="#66ffff" stroke-width=".3"/>`;
  return s+`<g font-family="sans-serif" font-size="1.5"><text x="0" y="-5">${row.id}</text><text x="0" y="-2">${row.search.status}; ${row.search.expanded} expansions. First 500 expansions only.</text><text x="0" y="51">Agent-run failed-leg diagnostic; fixed provisional contract; NOT hardware or lap validation.</text></g></svg>\n`;
}
function auditUncertainty(baseline,c){
  const rows=[];
  for(const row of baseline.results)for(const p of row.plans)if(p.route){
    const failures=[];
    // Geometry variants without pose error do not alter center-region/gate checks.
    const cases=variants({bounds:[0,0,96,48],solids:[]},row.config.uncertainty);
    for(const v of cases){const route={...p.route,waypoints:p.route.waypoints.map(q=>q.map((n,i)=>n+v.error[i]))},original={...p.original,waypoints:p.original.waypoints.map(q=>q.map((n,i)=>n+v.error[i]))};const result=checkContract(route,original,c);if(!result.valid)failures.push({variant:v.id,violations:result.violations});}
    rows.push({mode:row.mode,obstacle_case:row.obstacle_case,wall:row.wall,route:p.route.id,pose_cases:cases.length,failures,partition_audit:auditProgress(p.route.waypoints,c.gates)});
  }
  return rows;
}
function runDiagnostics(model,nav,drive,stress,planner,c,config,baseline){
  validateContract(c);validateDiagnostics(config,c,stress);const results=[];
  for(const probe of config.failed_legs)for(const wall of nav.wall_scenarios)for(const mode of c.planning_modes)for(const staging of probe.staging_x_in)for(const step of config.grid_steps_in){
    const n=structuredClone(nav);n.obstacles.push(...stress.obstacle_cases.find(p=>p.id===probe.obstacle_case).obstacles);
    const field=makeField(model,n,wall),original=routesFor(model,{...drive,pit_staging_x_in:staging})[0],phase=c.leg_phases[probe.leg],region=c.phase_regions[phase],start=original.waypoints[probe.leg],goal=original.waypoints[probe.leg+1];
    const robust=mode==='constrained-variants'?uncertaintyPolicy(n.robot,field,n.sampling,n.uncertainty,planner.clearance_margin_in):null;
    const policy=diagnosticPolicy(region,robust),cfg={...planner,grid_step_in:step,max_expansions:config.max_expansions,diagnostics:true};
    const search=createPlanner(n.robot,field,n.sampling,cfg,original.waypoints,policy).search(start,goal);
    const row={id:`${probe.obstacle_case}-${wall.id}-${mode}-x${staging}-grid${step}`,mode,obstacle_case:probe.obstacle_case,wall:wall.id,leg:probe.leg,staging_x_in:staging,grid_step_in:step,region,gates:c.gates,robot:n.robot,field,start,goal,search};
    if(search.status==='budget-exhausted')row.budget_retry=createPlanner(n.robot,field,n.sampling,{...cfg,max_expansions:config.budget_retry_expansions},original.waypoints,policy).search(start,goal);
    results.push(row);console.log(row.id,search.status,search.expanded);
  }
  const extensions=[];
  for(const row of results.filter(row=>row.search.status==='found')){
    const n=structuredClone(nav);n.wall_scenarios=nav.wall_scenarios.filter(w=>w.id===row.wall);n.obstacles.push(...stress.obstacle_cases.find(p=>p.id===row.obstacle_case).obstacles);
    for(const original of routesFor(model,{...drive,pit_staging_x_in:row.staging_x_in})){
      const candidate=planCandidate(original,row.field,n,{...planner,grid_step_in:row.grid_step_in},c,row.mode);
      extensions.push({source:row.id,original_route:original.id,...candidate,evaluation:candidate.route?evaluate(candidate.route,row.field,n,model.features.find(f=>f.id===original.target_id).vertices_in):null});
    }
  }
  const passage_analysis=nav.wall_scenarios.map(wall=>{
    const half=nav.robot.width_in/2,margin=planner.clearance_margin_in;
    const dividerY=model.features.find(f=>f.id==='center_divider_axis').vertices_in[0][1]+nav.divider_thickness_in/2;
    const radius=Math.hypot(nav.robot.length_in,nav.robot.width_in)/2;
    return {wall:wall.id,upper_below_probe:{nominal_center_y_open_interval:[dividerY+half+margin,35-half-margin],scope:'Straight cardinal square-footprint translation between center divider top face and probe bottom. Necessary gap, not a connected path certificate.'},pit_below_probe:{nominal_center_y_open_interval:[wall.inset_in+half+margin,8-half-margin]},pit_above_probe:{center_y_min_in:10+half+margin,phase_center_y_max_in:c.phase_regions['pit-mouth'][3],turn_radius_in:radius,turn_center_y_min_to_clear_probe_top_in:10+radius+margin,scope:'Circumradius gives sufficient full-spin clearance from horizontal probe face, not necessity for arbitrary turns or lateral offsets.'}};
  });
  return {status:config.status,provenance:'Agent-run fixed-contract diagnosis using archived geometry; not owner measurements, physical impossibility proof or official legality.',config,inputs:{navigation:nav,drive,stress,planner,contract:c},results,extensions,passage_analysis,perturbed_contract_audit:auditUncertainty(baseline,c)};
}
function summary(r){
  const lines=['# Fixed-contract search diagnostics','','Failed legs only; not full-route success or independent collision trials.','', '| Probe | Wall | Mode | Staging x | Grid | Status | Expanded | Reached | Rejection counts |','|---|---|---|---:|---:|---|---:|---:|---|'];
  for(const row of r.results)lines.push(`| ${row.obstacle_case} | ${row.wall} | ${row.mode} | ${row.staging_x_in} | ${row.grid_step_in} | ${row.search.status} | ${row.search.expanded} | ${row.search.diagnostics.reached_states} | ${Object.entries(row.search.diagnostics.rejections).map(([k,n])=>`${k}: ${n}`).join('; ')} |`);
  lines.push('','## Complete-route extensions of recovered legs','','| Original route | Status | Sampled failures / evaluated cases | Interval unresolved / evaluated cases |','|---|---|---:|---:|');
  for(const e of r.extensions)lines.push(`| ${e.original_route} | ${e.status} | ${e.evaluation?`${e.evaluation.sampled_failures}/${e.evaluation.cases}`:'untested'} | ${e.evaluation?`${e.evaluation.interval_unresolved_count}/${e.evaluation.cases}`:'untested'} |`);
  lines.push('','Uncertainty contract audits: '+r.perturbed_contract_audit.reduce((n,a)=>n+a.failures.length,0)+' failing constant-pose cases / '+r.perturbed_contract_audit.reduce((n,a)=>n+a.pose_cases,0)+'. These are separate from collision/docking evaluation.','');return lines.join('\n');
}
module.exports={diagnosticPolicy,diagnosticSvg,validateDiagnostics,auditUncertainty,runDiagnostics,summary};
if(require.main===module){
  const source=read('constrained-field-v3.json'),model=build(source,read(source.trace_file)),r=runDiagnostics(model,read('navigation-v3.json'),read('differential-drive-v3.json'),read('navigation-stress-v3.json'),read('avoidance-v3.json'),read('route-contract-v3.json'),read('planner-diagnostics-v3.json'),read('derived/contract-navigation-v3/report.json'));
  r.input_hashes=Object.fromEntries(['constrained-field-v3.json',source.trace_file,'navigation-v3.json','differential-drive-v3.json','navigation-stress-v3.json','avoidance-v3.json','route-contract-v3.json','planner-diagnostics-v3.json','tools/avoidance-v3.js','tools/contract-navigation-v3.js','tools/planner-diagnostics-v3.js','tools/route-progress-v3.js'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')]));
  const out=path.join(root,'derived/planner-diagnostics-v3');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(r,null,2)+'\n');fs.writeFileSync(path.join(out,'summary.md'),summary(r));for(const row of r.results)fs.writeFileSync(path.join(out,row.id+'.svg'),diagnosticSvg(row));
}