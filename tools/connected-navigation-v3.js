#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {build}=require('./constrained-field-v3');
const {samples,makeField,svg}=require('./navigation-v3');
const {routesFor,primitives}=require('./differential-drive-v3');
const {createPlanner}=require('./avoidance-v3');
const {regionPolicy,uncertaintyPolicy,planCandidate,evaluate,variants,gateTrace}=require('./contract-navigation-v3');
const {createProgress,auditProgress}=require('./route-progress-v3');
const root=path.resolve(__dirname,'..');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
function validate(config){
  if(!Number.isFinite(config.grid_step_in)||config.grid_step_in<=0||!Number.isInteger(config.max_expansions)||config.max_expansions<=0)throw new Error('positive grid and integer budget required');
  if(!Array.isArray(config.grid_origins_in)||!config.grid_origins_in.length||config.grid_origins_in.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n))))throw new Error('finite grid origins required');
  if(!Array.isArray(config.modes)||!config.modes.length||config.modes.some(m=>!['constrained-nominal','constrained-variants'].includes(m)))throw new Error('known modes required');
  if(!Array.isArray(config.policies)||!config.policies.length||config.policies.some(p=>!['original-fixed','selectable-original-regions','experimental-north-pit-access'].includes(p)))throw new Error('known policies required');
  const r=config.experimental_north_access_rect_in;if(!Array.isArray(r)||r.length!==4||r.some(n=>!Number.isFinite(n))||r[0]>=r[2]||r[1]>=r[3])throw new Error('finite ordered access rectangle required');
}
// Midpoints of strictly positive axis-aligned gaps, including robot half-extent
// and nominal margin. They only supplement search; interval checks decide safety.
function passageCoordinates(field,robot,margin){
  const records=[];
  for(const axis of [0,1]){
    const other=1-axis,half=axis===0?robot.length_in/2:robot.width_in/2;
    const boxes=field.solids.map(s=>({id:s.id,lo:Math.min(...s.vertices_in.map(p=>p[axis])),hi:Math.max(...s.vertices_in.map(p=>p[axis])),otherLo:Math.min(...s.vertices_in.map(p=>p[other])),otherHi:Math.max(...s.vertices_in.map(p=>p[other]))}));
    const surfaces=[{id:'board-low',hi:field.bounds[axis],otherLo:-Infinity,otherHi:Infinity},...boxes];
    const tops=[...boxes,{id:'board-high',lo:field.bounds[axis+2],otherLo:-Infinity,otherHi:Infinity}];
    for(const a of surfaces)for(const b of tops){
      if(a.id===b.id||a.otherLo>b.otherHi||b.otherLo>a.otherHi)continue;
      const low=a.hi+half+margin,high=b.lo-half-margin;
      if(low<high&&Number.isFinite(low)&&Number.isFinite(high))records.push({axis,between:[a.id,b.id],open_interval_in:[low,high],coordinate_in:(low+high)/2});
    }
  }
  return {coordinates:[0,1].map(axis=>[...new Set(records.filter(r=>r.axis===axis).map(r=>r.coordinate_in))]),records};
}
function unionPolicy(rects,sampling){
  const regions=rects.map(regionPolicy),pose=p=>regions.some(r=>r.pose(p));
  // Include every rectangle boundary crossing of affine center translation.
  // Endpoints alone are insufficient for nonconvex unions. Spins don't move center.
  const edge=(a,b)=>{
    const ts=[0,1];for(const r of rects)for(const axis of [0,1])if(b[axis]!==a[axis])for(const v of [r[axis],r[axis+2]]){const t=(v-a[axis])/(b[axis]-a[axis]);if(t>0&&t<1)ts.push(t);}
    ts.sort((a,b)=>a-b);const checks=[...ts,...ts.slice(1).map((t,i)=>(t+ts[i])/2)];
    return checks.every(t=>pose([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),a[2]]));
  };
  return {pose,edge};
}
function combine(region,robust,progress){return {pose:p=>region.pose(p)&&(!robust||robust.pose(p)),edge:(a,b)=>region.edge(a,b)&&(!robust||robust.edge(a,b)),...(progress?{progress}:{})};}
function segmentSearch(original,start,goal,robot,field,nav,planner,region,mode,gates=null){
  const robust=mode==='constrained-variants'?uncertaintyPolicy(robot,field,nav.sampling,nav.uncertainty,planner.clearance_margin_in):null;
  return createPlanner(robot,field,nav.sampling,planner,[...original.waypoints,start,goal],combine(region,robust,gates?createProgress(gates):null)).search(start,goal);
}
function checkpointRoles(original){return original.waypoints.map((pose,index)=>({index,pose,role:index===0?'fixed-start':index===original.docking_waypoint_index?'fixed-dock':index===original.waypoints.length-1?'fixed-final-race-staging':index<=12?'retained-race-construction':'selectable-pit-construction'}));}
function planConnected(original,field,nav,planner,c,policyName,mode,config){
  if(policyName==='original-fixed')return planCandidate(original,field,nav,planner,c,mode);
  const points=[[...original.waypoints[0]]],legs=[],indices=[0],append=r=>{points.push(...r.waypoints.slice(1));indices.push(points.length-1);};
  // Race construction unchanged; integrate required progress at the relevant leg.
  for(let leg=0;leg<12;leg++){
    const gateIndex=({4:0,6:1,8:2})[leg],gate=gateIndex===undefined?null:[c.gates[gateIndex]];
    const r=segmentSearch(original,original.waypoints[leg],original.waypoints[leg+1],nav.robot,field,nav,planner,regionPolicy(c.phase_regions[c.leg_phases[leg]]),mode,gate);
    legs.push({segment:`race-${leg}`,status:r.status,expanded:r.expanded});
    if(r.status!=='found')return {status:r.status,failed_segment:`race-${leg}`,legs,route:null};append(r);
  }
  const north=policyName==='experimental-north-pit-access';
  const rects=north?[config.experimental_north_access_rect_in]:[c.phase_regions['pit-mouth'],c.phase_regions.pit];
  const region=unionPolicy(rects,nav.sampling),dock=original.waypoints[original.docking_waypoint_index],mouth=original.waypoints[12],returnPose=[mouth[0],mouth[1],0];
  const pitDivider=field.solids.find(s=>s.id==='pit_divider_axis'),x=(Math.min(...pitDivider.vertices_in.map(p=>p[0]))+Math.max(...pitDivider.vertices_in.map(p=>p[0])))/2;
  const span=north?[Math.max(...pitDivider.vertices_in.map(p=>p[1])),field.bounds[3]]:[field.bounds[1],c.phase_regions['pit-mouth'][3]];
  const gates=[{id:north?'north-entry':'south-entry',axis:0,value:x,span,direction:-1},{id:north?'north-exit':'south-exit',axis:0,value:x,span,direction:1}];
  const arrival=segmentSearch(original,mouth,dock,nav.robot,field,nav,planner,region,mode,[gates[0]]);
  legs.push({segment:'pit-arrival',status:arrival.status,expanded:arrival.expanded});if(arrival.status!=='found')return {status:arrival.status,failed_segment:'pit-arrival',legs,route:null};append(arrival);const docking_waypoint_index=points.length-1;
  const departure=segmentSearch(original,dock,returnPose,nav.robot,field,nav,planner,region,mode,[gates[1]]);
  legs.push({segment:'pit-withdrawal',status:departure.status,expanded:departure.expanded});if(departure.status!=='found')return {status:departure.status,failed_segment:'pit-withdrawal',legs,route:null};append(departure);
  const finish=segmentSearch(original,returnPose,original.waypoints.at(-1),nav.robot,field,nav,planner,regionPolicy(c.phase_regions.west),mode);
  legs.push({segment:'race-reentry',status:finish.status,expanded:finish.expanded});if(finish.status!=='found')return {status:finish.status,failed_segment:'race-reentry',legs,route:null};append(finish);
  const route={id:`connected-${original.id}`,target_id:original.target_id,waypoints:points,docking_waypoint_index,kinematics:primitives(points,planner.wheel_track_in)};
  const race=gateTrace(points,c.gates),arrivalAudit=auditProgress(points.slice(indices[12],indices[13]+1),[gates[0]]),departureAudit=auditProgress(points.slice(indices[13],indices[14]+1),[gates[1]]),pit={valid:arrivalAudit.valid&&departureAudit.valid,arrival:arrivalAudit,departure:departureAudit};
  if(!race.valid||!pit.valid)return {status:'contract-rejected',legs,route:null,race,pit};
  return {status:'found',legs,route,contract:{race,pit,policy:policyName},pit_gates:gates,segment_indices:indices,checkpoint_roles:checkpointRoles(original)};
}
function candidateAudit(candidate,original,field,nav,c,config,policy){
  if(!candidate.route)return null;
  const route=candidate.route,failures=[];
  for(const v of variants(field,nav.uncertainty)){
    const p=route.waypoints.map(q=>q.map((n,i)=>n+v.error[i]));
    const race=gateTrace(p,c.gates);let valid=race.valid;
    if(candidate.pit_gates){
      const rects=policy==='experimental-north-pit-access'?[config.experimental_north_access_rect_in]:[c.phase_regions['pit-mouth'],c.phase_regions.pit],region=unionPolicy(rects,nav.sampling),indices=candidate.segment_indices;
      const pitPoints=p.slice(indices[12],indices[14]+1);valid=valid&&auditProgress(p.slice(indices[12],indices[13]+1),[candidate.pit_gates[0]]).valid&&auditProgress(p.slice(indices[13],indices[14]+1),[candidate.pit_gates[1]]).valid&&pitPoints.every(region.pose)&&pitPoints.slice(1).every((q,i)=>region.edge(pitPoints[i],q));
      for(let leg=0;leg<12;leg++)valid=valid&&p.slice(indices[leg],indices[leg+1]+1).every(regionPolicy(c.phase_regions[c.leg_phases[leg]]).pose);
      valid=valid&&p.slice(indices[14]).every(regionPolicy(c.phase_regions.west).pose);
    }else{
      const {checkContract}=require('./contract-navigation-v3');valid=checkContract({...route,waypoints:p},{...original,waypoints:original.waypoints.map(q=>q.map((n,i)=>n+v.error[i]))},c).valid;
    }
    if(!valid)failures.push(v.id);
  }
  return {cases:variants(field,nav.uncertainty).length,failures,scope:'Constant-pose phase/gate checks, separate from physical clearance and docking; shifted solids do not move engineering gates.'};
}
function summarize(r){
  const lines=['# Connected pit construction study','','Agent-run hypothetical regression probes; alternate north access is not an official rule interpretation.','', '| Probe | Wall | Mode | Policy | Complete routes | Sampled pass / tested | Interval clear / tested |','|---|---|---|---|---:|---:|---:|'];
  for(const row of r.results){const tested=row.plans.filter(p=>p.evaluation);const cases=tested.reduce((n,p)=>n+p.evaluation.cases,0);lines.push(`| ${row.obstacle_case} | ${row.wall} | ${row.mode} | ${row.policy} | ${tested.length}/3 | ${tested.reduce((n,p)=>n+p.evaluation.cases-p.evaluation.sampled_failures,0)}/${cases} | ${tested.reduce((n,p)=>n+p.evaluation.cases-p.evaluation.interval_unresolved_count,0)}/${cases} |`);}
  lines.push('','Search failures are untested, not collision trials. Full race plus arrival, unchanged docking, withdrawal and reentry required. Wheel travel is distance, not time.','');return lines.join('\n');
}
function run(model,nav,drive,stress,planner,c,config){
  validate(config);const results=[],alignment=[];
  for(const wall of nav.wall_scenarios){
    const n=structuredClone(nav);n.obstacles.push(...stress.obstacle_cases.find(p=>p.id==='upper-lane-blocker').obstacles);const field=makeField(model,n,wall),original=routesFor(model,drive)[0];
    for(const origin of config.grid_origins_in)for(const supplemented of [false,true])for(const mode of config.modes){
      const supplement=passageCoordinates(field,n.robot,planner.clearance_margin_in),cfg={...planner,grid_step_in:config.grid_step_in,grid_origin_in:origin,max_expansions:config.max_expansions,...(supplemented?{extra_coordinates_in:supplement.coordinates}:{})};
      const search=segmentSearch(original,original.waypoints[4],original.waypoints[5],n.robot,field,n,cfg,regionPolicy(c.phase_regions.upper),mode,[c.gates[0]]);
      alignment.push({wall:wall.id,origin,supplemented,mode,status:search.status,expanded:search.expanded,waypoints:search.waypoints,supplement:supplemented?supplement:null});console.log('alignment',wall.id,origin,supplemented,mode,search.status);
    }
  }
  for(const id of ['empty-control','pit-gate-blocker'])for(const wall of nav.wall_scenarios)for(const mode of config.modes)for(const policy of config.policies){
    const n=structuredClone(nav);n.wall_scenarios=[wall];n.obstacles.push(...stress.obstacle_cases.find(p=>p.id===id).obstacles);const field=makeField(model,n,wall),supplement=passageCoordinates(field,n.robot,planner.clearance_margin_in);
    const cfg={...planner,grid_step_in:config.grid_step_in,grid_origin_in:config.grid_origins_in[0],max_expansions:config.max_expansions,extra_coordinates_in:supplement.coordinates},plans=[];
    for(const original of routesFor(model,drive)){
      const candidate=planConnected(original,field,n,cfg,c,policy,mode,config);
      plans.push({...candidate,original_route:original.id,evaluation:candidate.route?evaluate(candidate.route,field,n,model.features.find(f=>f.id===original.target_id).vertices_in):null,perturbed_contract:candidateAudit(candidate,original,field,n,c,config,policy)});
    }
    results.push({obstacle_case:id,wall:wall.id,mode,policy,config:n,planner:cfg,supplement,plans});console.log('complete',id,wall.id,mode,policy,plans.filter(p=>p.route).length);
  }
  return {status:config.status,provenance:'Agent-built and agent-run archived-geometry hobby study, not owner physical measurements or official lap legality.',inputs:{navigation:nav,drive,stress,planner,contract:c,config},alignment,results};
}
module.exports={validate,passageCoordinates,unionPolicy,checkpointRoles,planConnected,candidateAudit,summarize,run};
if(require.main===module){
  const source=read('constrained-field-v3.json'),model=build(source,read(source.trace_file));const report=run(model,read('navigation-v3.json'),read('differential-drive-v3.json'),read('navigation-stress-v3.json'),read('avoidance-v3.json'),read('route-contract-v3.json'),read('connected-navigation-v3.json'));
  const files=['constrained-field-v3.json',source.trace_file,'navigation-v3.json','differential-drive-v3.json','navigation-stress-v3.json','avoidance-v3.json','route-contract-v3.json','connected-navigation-v3.json','tools/avoidance-v3.js','tools/route-progress-v3.js','tools/connected-navigation-v3.js','tools/contract-navigation-v3.js'];report.input_hashes=Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')]));
  const out=path.join(root,'derived/connected-navigation-v3');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(out,'summary.md'),summarize(report));for(const row of report.results)fs.writeFileSync(path.join(out,`${row.obstacle_case}-${row.wall}-${row.mode}-${row.policy}.svg`),svg({config:row.config,routes:row.plans.filter(p=>p.route).map(p=>p.route)},model));
}