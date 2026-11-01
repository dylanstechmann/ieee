#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {build}=require('./constrained-field-v3');
const {footprint,checkPose,makeField,runStudy,svg}=require('./navigation-v3');
const {primitives,routesFor}=require('./differential-drive-v3');
const {intervalBounds}=require('./navigation-stress-v3');
const root=path.resolve(__dirname,'..');
const heading=a=>((a%360)+360)%360;
const key=p=>p.join(',');
class Heap {
  constructor(){this.items=[];}
  push(item){const a=this.items;let i=a.length;a.push(item);while(i){const p=(i-1)>>1;if(a[p].f<=item.f)break;a[i]=a[p];i=p;}a[i]=item;}
  pop(){const a=this.items,top=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].f<a[c].f)c++;if(a[c].f>=last.f)break;a[i]=a[c];i=c;}a[i]=last;}return top;}
}
function createPlanner(robot,field,sampling,config,anchors,policy={}) {
  footprint([0,0,0],robot);
  for(const name of ['grid_step_in','clearance_margin_in','wheel_track_in']) if(!Number.isFinite(config[name])||config[name]<=0)throw new Error(`positive finite ${name} required`);
  if(!Number.isInteger(config.max_expansions)||config.max_expansions<1)throw new Error('positive integer max_expansions required');
  if(!Array.isArray(anchors)||!anchors.length)throw new Error('anchors required');
  if(config.grid_origin_in!==undefined&&(!Array.isArray(config.grid_origin_in)||config.grid_origin_in.length!==2||config.grid_origin_in.some(n=>!Number.isFinite(n))))throw new Error('finite two-coordinate grid origin required');
  if(config.extra_coordinates_in!==undefined&&(!Array.isArray(config.extra_coordinates_in)||config.extra_coordinates_in.length!==2||config.extra_coordinates_in.some(a=>!Array.isArray(a)||a.length>500||a.some(n=>!Number.isFinite(n)))))throw new Error('bounded finite extra coordinates required');
  const normalized=anchors.map(p=>{footprint(p,robot);if(Math.abs(heading(p[2])/90-Math.round(heading(p[2])/90))>1e-8)throw new Error('cardinal headings required');return [p[0],p[1],heading(p[2])];});
  const axes=[0,1].map(axis=>{
    const low=field.bounds[axis],high=field.bounds[axis+2],values=[...normalized.map(p=>p[axis]),...(config.extra_coordinates_in?.[axis]??[])];
    if(Math.ceil((high-low)/config.grid_step_in)>1000)throw new Error('grid axis budget exceeded');
    const origin=config.grid_origin_in?.[axis]??low;
    const first=origin+Math.ceil((low-origin)/config.grid_step_in)*config.grid_step_in;
    for(let v=first;v<=high;v+=config.grid_step_in)values.push(v);
    if(values.length>2000)throw new Error('supplemented grid axis budget exceeded');
    return [...new Set(values)].sort((a,b)=>a-b);
  });
  const poses=new Map(),edges=new Map();
  let diagnostics=null;
  const reject=(kind,evidence)=>{
    if(!diagnostics)return;
    diagnostics.rejections[kind]=(diagnostics.rejections[kind]??0)+1;
    const examples=diagnostics.examples[kind]??=[];
    if(examples.length<3)examples.push(evidence);
  };
  const category=id=>id==='board_or_wall'?'outer-boundary':id==='center_divider_axis'?'center-divider':id==='pit_divider_axis'?'pit-divider':'obstacle';
  function poseResult(p){
    const c=checkPose(p,robot,field);
    if(c.hits.length)return {valid:false,kind:category(c.hits[0]),evidence:{pose:p,...c}};
    if(c.clearance_in<=config.clearance_margin_in)return {valid:false,kind:'nominal-pose-margin',evidence:{pose:p,...c}};
    if(policy.pose&&!policy.pose(p)){const reason=policy.poseReason?.(p);return {valid:false,kind:reason?.kind??'pose-policy',evidence:{pose:p,...reason}};}
    return {valid:true};
  }
  // Policy is fixed for this planner instance. Never share these caches between
  // phases or uncertainty policies with different admissibility rules.
  const valid=p=>{const k=key(p);if(!poses.has(k))poses.set(k,poseResult(p));const r=poses.get(k);if(!r.valid)reject(r.kind,r.evidence);return r.valid;};
  const edge=(a,b)=>{
    // Custom policies may be directional; never reuse their reverse edge result.
    const k=`${key(a)}|${key(b)}`;
    if(!valid(a)||!valid(b))return false;
    if(!edges.has(k)){
      const bounds=intervalBounds({waypoints:[a,b]},robot,field,sampling);
      let result={valid:true};
      if(bounds.min_clearance_lower_bound_in<=config.clearance_margin_in)result={valid:false,kind:'nominal-interval-bound',evidence:{from:a,to:b,bounds}};
      else if(policy.edge&&!policy.edge(a,b)){const reason=policy.edgeReason?.(a,b);result={valid:false,kind:reason?.kind??'edge-policy',evidence:{from:a,to:b,...reason}};}
      edges.set(k,result);
    }
    const r=edges.get(k);if(!r.valid)reject(r.kind,r.evidence);return r.valid;
  };
  function search(start,goal) {
    diagnostics=config.diagnostics?{rejections:{},examples:{},expanded_samples:[],reached_states:0,frontier_entries:0}:null;
    const finish=(result,states=null,frontier=0)=>{
      if(!diagnostics)return result;
      diagnostics.reached_states=states?.size??0;diagnostics.frontier_entries=frontier;
      return {...result,diagnostics:structuredClone(diagnostics)};
    };
    const normalize=p=>[p[0],p[1],heading(p[2])];
    const a=normalize(start),b=normalize(goal);
    const progress=policy.progress;
    const stateKey=(p,s)=>progress?`${key(p)}@${JSON.stringify(s)}`:key(p);
    const initial=progress?progress.start(a):null;
    if(!normalized.some(p=>key(p)===key(a))||!normalized.some(p=>key(p)===key(b)))throw new Error('search endpoints must be configured anchors');
    if(!valid(a)||!valid(b))return finish({status:'endpoint-blocked',expanded:0,waypoints:null});
    if(key(a)===key(b)&&(!progress||progress.accept(initial)))return finish({status:'found',expanded:0,waypoints:[a,b]});
    // Preserve a valid original primitive instead of needlessly searching it.
    try{primitives([a,b],config.wheel_track_in);const next=progress?progress.advance(initial,a,b):null;if(edge(a,b)&&(!progress||(next!==null&&progress.accept(next))))return finish({status:'found',expanded:0,waypoints:[a,b],...(progress?{progress:next}:{})});}catch(e){if(!/lateral|simultaneous/.test(e.message))throw e;}
    const heuristic=p=>Math.abs(p[0]-b[0])+Math.abs(p[1]-b[1]);
    const initialKey=stateKey(a,initial),heap=new Heap(),costs=new Map([[initialKey,0]]),parents=new Map(),states=new Map([[initialKey,a]]);
    heap.push({p:a,progress:initial,g:0,f:heuristic(a)});let expanded=0;
    while(heap.items.length){
      const current=heap.pop(),p=current.p,k=stateKey(p,current.progress);if(current.g!==costs.get(k))continue;
      if(key(p)===key(b)&&(!progress||progress.accept(current.progress))){
        const points=[];let cursor=k;while(cursor!==undefined){points.push(states.get(cursor));cursor=parents.get(cursor);}points.reverse();
        return finish({status:'found',expanded,waypoints:points,...(progress?{progress:current.progress}:{})},states,heap.items.length);
      }
      if(expanded>=config.max_expansions)return finish({status:'budget-exhausted',expanded,waypoints:null},states,heap.items.length+1);
      expanded++;
      if(diagnostics&&diagnostics.expanded_samples.length<500)diagnostics.expanded_samples.push(p);
      const next=[[p[0],p[1],heading(p[2]+90)],[p[0],p[1],heading(p[2]-90)]];
      const axis=p[2]%180===0?0:1,index=axes[axis].indexOf(p[axis]);
      for(const offset of [-1,1])if(index+offset>=0&&index+offset<axes[axis].length){const q=[...p];q[axis]=axes[axis][index+offset];next.push(q);}
      for(const q of next){
        const turn=p[2]!==q[2],cost=turn?config.wheel_track_in*Math.PI/4:Math.hypot(q[0]-p[0],q[1]-p[1]);
        const nextProgress=progress?progress.advance(current.progress,p,q):null;
        if(progress&&nextProgress===null){reject('route-progress',{from:p,to:q,progress:current.progress});continue;}
        const g=current.g+cost,qk=stateKey(q,nextProgress);if(g>=(costs.get(qk)??Infinity)-1e-10||!edge(p,q))continue;
        costs.set(qk,g);parents.set(qk,k);states.set(qk,q);heap.push({p:q,progress:nextProgress,g,f:g+heuristic(q)});
      }
    }
    return finish({status:'grid-exhausted',expanded,waypoints:null},states);
  }
  return {search,gridAxes:()=>axes.map(a=>[...a]),cacheStats:()=>({poses:poses.size,edges:edges.size})};
}
function repairRoute(route,planner,wheelTrack) {
  const points=[[...route.waypoints[0]]],legs=[],anchorIndices=[0];
  for(let i=1;i<route.waypoints.length;i++){
    const r=planner.search(route.waypoints[i-1],route.waypoints[i]);
    legs.push({from_waypoint:i-1,to_waypoint:i,status:r.status,expanded:r.expanded});
    if(r.status!=='found')return {status:r.status,failed_leg:i-1,legs,route:null};
    points.push(...r.waypoints.slice(1));anchorIndices.push(points.length-1);
  }
  const result={...route,id:`avoid-${route.id}`,waypoints:points,anchor_waypoint_indices:anchorIndices};
  if(route.docking_waypoint_index!==undefined)result.docking_waypoint_index=anchorIndices[route.docking_waypoint_index];
  result.kinematics=primitives(points,wheelTrack);
  return {status:'found',legs,route:result};
}
function runAvoidance(model,navigation,drive,stress,config) {
  if(!Array.isArray(config.obstacle_case_ids)||!config.obstacle_case_ids.length||new Set(config.obstacle_case_ids).size!==config.obstacle_case_ids.length)throw new Error('unique nonempty obstacle case ids required');
  const originals=routesFor(model,drive),results=[];
  for(const id of config.obstacle_case_ids){
    const probe=stress.obstacle_cases.find(c=>c.id===id);
    if(!probe||probe.evidence!=='hypothetical'||!/^[a-z0-9-]+$/.test(id))throw new Error('known safe hypothetical obstacle case required');
    for(const wall of navigation.wall_scenarios){
      const nav=structuredClone(navigation);nav.obstacles.push(...structuredClone(probe.obstacles));nav.wall_scenarios=[wall];nav.status=config.status;
      nav.notes=nav.notes.filter(n=>!n.includes('Waypoint interpolation permits sideways'));
      nav.notes.push('Agent-planned ideal cardinal primitives; hypothetical obstacles; no hardware/mission legality validation.');
      const field=makeField(model,nav,wall),planner=createPlanner(nav.robot,field,nav.sampling,config,originals.flatMap(r=>r.waypoints));
      const repairs=originals.map(r=>repairRoute(r,planner,config.wheel_track_in)),routes=repairs.filter(r=>r.route).map(r=>r.route);
      const report=runStudy(model,nav,routes);
      for(const s of report.scenarios)s.nominal_interval_bounds=intervalBounds(routes.find(r=>r.id===s.route),nav.robot,field,nav.sampling);
      results.push({obstacle_case:id,wall:wall.id,repairs,cache:planner.cacheStats(),report});
    }
  }
  return {status:config.status,provenance:'Agent-built and agent-run planner using archived V3-derived geometry and hypothetical probes, not owner hardware tests.',config,
    policy:'Bounded cardinal grid search; preserves ordered anchors but not lap legality or homotopy. Positive nominal interval clearance margin only; uncertainty uses sampled tests without replanning. Grid/budget exhaustion is not proof of physical infeasibility. Wheel travel cost is not elapsed time. No sensing, control, dynamics, deployment or actual obstacle measurement.',
    inputs:{navigation,drive,stress},results};
}
function summary(r){
  const lines=['# Ideal avoidance results','','Agent-run hypothetical probes; nominal planning only, not hardware or competition qualification.','',
    '| Probe | Wall | Routes found | Sampled uncertainty passes / cases | Nominal positive interval bounds |','|---|---|---:|---:|---:|'];
  for(const row of r.results){const s=row.report.scenarios,total=s.reduce((n,c)=>n+c.sweep.cases,0),fail=s.reduce((n,c)=>n+c.sweep.failures,0);lines.push(`| ${row.obstacle_case} | ${row.wall} | ${s.length}/${row.repairs.length} | ${total-fail}/${total} | ${s.filter(c=>c.nominal_interval_bounds.positive_bound_for_all_intervals).length}/${s.length} |`);}
  lines.push('','Failed searches have no completed route and are excluded from uncertainty counts; inspect repairs for failure reason. A nominal detour is not a robust or legal mission.','');return lines.join('\n');
}
module.exports={createPlanner,repairRoute,runAvoidance,summary};
if(require.main===module){
  const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8')),source=read('constrained-field-v3.json'),model=build(source,read(source.trace_file));
  const r=runAvoidance(model,read('navigation-v3.json'),read('differential-drive-v3.json'),read('navigation-stress-v3.json'),read('avoidance-v3.json'));
  const out=path.join(root,'derived/avoidance-v3');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(r,null,2)+'\n');fs.writeFileSync(path.join(out,'summary.md'),summary(r));
  for(const row of r.results)fs.writeFileSync(path.join(out,`${row.obstacle_case}-${row.wall}.svg`),svg(row.report,model));
  console.log(summary(r));console.log(`Wrote ${out}`);
}