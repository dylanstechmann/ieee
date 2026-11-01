#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {build} = require('./constrained-field-v3');
const root = path.resolve(__dirname, '..');
const EPS = 1e-9;
const rect = (x,y,l,w) => [[x,y],[x+l,y],[x+l,y+w],[x,y+w]];
const cross = (a,b,c) => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function positive(n, name, zero=false) {
  if (!Number.isFinite(n) || (zero ? n<0 : n<=0)) throw new Error(`${name} must be finite and ${zero?'nonnegative':'positive'}`);
}
function polygon(p) {
  if (!Array.isArray(p) || p.length<3 || p.some(v=>!Array.isArray(v)||v.length!==2||v.some(n=>!Number.isFinite(n)))) throw new Error('finite convex polygon required');
  // All vertices must be on the left of every edge (CCW convex input).
  if (area(p)<=EPS || p.some((a,i)=>p.some(v=>cross(a,p[(i+1)%p.length],v)<-EPS))) throw new Error('nondegenerate counterclockwise convex polygon required');
}
function footprint(pose, robot) {
  if (!Array.isArray(pose)||pose.length!==3||pose.some(n=>!Number.isFinite(n))) throw new Error('pose must be [x,y,heading_deg]');
  positive(robot.length_in,'robot length'); positive(robot.width_in,'robot width');
  const a=pose[2]*Math.PI/180, c=Math.cos(a), s=Math.sin(a);
  return rect(-robot.length_in/2,-robot.width_in/2,robot.length_in,robot.width_in).map(([x,y])=>[pose[0]+x*c-y*s,pose[1]+x*s+y*c]);
}
function intersects(a,b) {
  for (const p of [a,b]) for (let i=0;i<p.length;i++) {
    const v=p[i], w=p[(i+1)%p.length], axis=[v[1]-w[1],w[0]-v[0]];
    const pa=a.map(q=>q[0]*axis[0]+q[1]*axis[1]), pb=b.map(q=>q[0]*axis[0]+q[1]*axis[1]);
    if (Math.max(...pa)<Math.min(...pb)-EPS || Math.max(...pb)<Math.min(...pa)-EPS) return false;
  }
  return true; // Touching counts as collision.
}
function pointDistance(p,a,b) {
  const dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy;
  const t=den ? Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)) : 0;
  return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
}
function distance(a,b) {
  if (intersects(a,b)) return 0;
  return Math.min(...a.flatMap(v=>b.map((w,i)=>pointDistance(v,w,b[(i+1)%b.length]))),...b.flatMap(v=>a.map((w,i)=>pointDistance(v,w,a[(i+1)%a.length]))));
}
function area(p) { return p.length<3 ? 0 : p.reduce((sum,v,i)=>sum+v[0]*p[(i+1)%p.length][1]-v[1]*p[(i+1)%p.length][0],0)/2; }
function overlapFraction(subject, clip) {
  let out=subject;
  for (let i=0;i<clip.length;i++) {
    const a=clip[i],b=clip[(i+1)%clip.length],input=out; out=[];
    for (let j=0;j<input.length;j++) {
      const p=input[j],q=input[(j+1)%input.length],cp=cross(a,b,p),cq=cross(a,b,q);
      if (cp>=-EPS) out.push(p);
      if ((cp>=-EPS)!==(cq>=-EPS)) { const t=cp/(cp-cq); out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]); }
    }
  }
  return Math.max(0,Math.min(1,area(out)/area(subject)));
}
function samples(waypoints, sampling) {
  if (!Array.isArray(waypoints)||waypoints.length<2) throw new Error('at least two waypoints required');
  for (const p of waypoints) if (!Array.isArray(p)||p.length!==3||p.some(n=>!Number.isFinite(n))) throw new Error('invalid waypoint');
  positive(sampling.translation_step_in,'translation step'); positive(sampling.rotation_step_deg,'rotation step');
  const result=[waypoints[0]];
  for (let i=1;i<waypoints.length;i++) {
    const a=waypoints[i-1],b=waypoints[i],angle=((b[2]-a[2])%360+540)%360-180;
    const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/sampling.translation_step_in),Math.ceil(Math.abs(angle)/sampling.rotation_step_deg));
    if (n>100000) throw new Error('sampling budget exceeded');
    for (let j=1;j<=n;j++) result.push([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n,a[2]+angle*j/n]);
  }
  return result;
}
function makeField(model, config, wall) {
  positive(wall.inset_in,'wall inset',true); positive(config.divider_thickness_in,'divider thickness');
  const d=model.dimensions,t=config.divider_thickness_in;
  if (wall.inset_in*2>=Math.min(d.board_length,d.board_width)) throw new Error('wall inset consumes board');
  const solids=model.features.filter(f=>f.kind==='divider_axis').map(f=>{
    const [a,b]=f.vertices_in;
    return {id:f.id,vertices_in:a[1]===b[1]?rect(a[0],a[1]-t/2,b[0]-a[0],t):rect(a[0]-t/2,a[1],t,b[1]-a[1])};
  });
  for (const o of config.obstacles) { if (typeof o.id!=='string') throw new Error('obstacle id required'); polygon(o.vertices_in); solids.push(o); }
  return {bounds:[wall.inset_in,wall.inset_in,d.board_length-wall.inset_in,d.board_width-wall.inset_in],solids};
}
function checkPose(p,robot,field) {
  const f=footprint(p,robot), [x0,y0,x1,y1]=field.bounds;
  let clearance=Math.min(...f.flatMap(([x,y])=>[x-x0,y-y0,x1-x,y1-y]));
  const hits=clearance<=EPS?['board_or_wall']:[];
  for (const s of field.solids) {
    const gap=distance(f,s.vertices_in); clearance=Math.min(clearance,gap);
    if (intersects(f,s.vertices_in)) hits.push(s.id);
  }
  return {hits,clearance_in:clearance};
}
function checkRoute(route,robot,field,sampling,error=[0,0,0],target=null) {
  const poses=samples(route.waypoints,sampling).map(p=>p.map((n,i)=>n+error[i]));
  let first=null,min=Infinity,colliding=0;
  poses.forEach((p,i)=>{
    const c=checkPose(p,robot,field); min=Math.min(min,c.clearance_in);
    if (c.hits.length) { colliding++; if (!first) first={sample:i,pose:p,hits:c.hits}; }
  });
  let dockIndex=poses.length-1;
  if (route.docking_waypoint_index!==undefined) {
    const i=route.docking_waypoint_index;
    if (!Number.isInteger(i)||i<1||i>=route.waypoints.length) throw new Error('invalid docking waypoint index');
    dockIndex=samples(route.waypoints.slice(0,i+1),sampling).length-1;
  }
  const docking=target ? overlapFraction(footprint(poses[dockIndex],robot),target) : null;
  return {sample_count:poses.length,collision_free:!first,colliding_samples:colliding,first_collision:first,min_sampled_clearance_in:min,docking_overlap_fraction:docking,docking_over_75_percent:docking===null?null:docking>0.75};
}
function routesFor(model) {
  const start=model.features.find(f=>f.id==='start_box').vertices_in;
  const sx=(start[0][0]+start[2][0])/2,sy=(start[0][1]+start[2][1])/2;
  const routes=[{id:'start-exit',waypoints:[[sx,sy,0],[38,sy,0]]},
    {id:'divider-loop',waypoints:[[38,12,0],[87,12,0],[87,12,90],[87,36,90],[87,36,180],[38,36,180],[38,36,270],[38,12,270],[38,12,360]]}];
  routes.push({id:'divider-loop-wider-return',waypoints:routes[1].waypoints.map(p=>[p[0]===38?36:p[0],p[1],p[2]])});
  for (const box of model.features.filter(f=>f.id.startsWith('pit_box_'))) {
    const [a,,b]=box.vertices_in,cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2;
    routes.push({id:`dock-${box.id}`,target_id:box.id,waypoints:[[38,9,180],[18,9,180],[18,cy,180],[cx,cy,180]]});
    routes.push({id:`back-out-${box.id}`,waypoints:[[cx,cy,180],[18,cy,180],[18,9,180],[38,9,180]]});
  }
  return routes;
}
function runStudy(model,config,routes=routesFor(model)) {
  footprint([0,0,0],config.robot);
  for (const [k,v] of Object.entries(config.uncertainty)) positive(v,k,true);
  for (const k of ['element_shift_in','position_error_in','heading_error_deg']) positive(config.uncertainty[k],k,true);
  const u=config.uncertainty,scenarios=[];
  for (const wall of config.wall_scenarios) {
    const base=makeField(model,config,wall);
    for (const route of routes) {
      const target=model.features.find(f=>f.id===route.target_id)?.vertices_in;
      const nominal=checkRoute(route,config.robot,base,config.sampling,[0,0,0],target);
      const variants=[];
      for (const dx of [-u.position_error_in,0,u.position_error_in]) for (const dy of [-u.position_error_in,0,u.position_error_in]) for (const da of [-u.heading_error_deg,0,u.heading_error_deg]) {
        variants.push({id:`pose:${dx},${dy},${da}`,field:base,error:[dx,dy,da],target});
      }
      for (let i=0;i<base.solids.length;i++) for (const axis of [0,1]) for (const sign of [-1,1]) {
        const field=structuredClone(base); field.solids[i].vertices_in.forEach(p=>p[axis]+=sign*u.element_shift_in);
        variants.push({id:`shift:${field.solids[i].id}:${axis}:${sign}`,field,error:[0,0,0],target});
      }
      if (target) for (const axis of [0,1]) for (const sign of [-1,1]) {
        const shifted=target.map(p=>p.map((n,i)=>n+(i===axis?sign*u.element_shift_in:0)));
        variants.push({id:`target-shift:${axis}:${sign}`,field:base,error:[0,0,0],target:shifted});
      }
      let failures=0,worst=Infinity,minOverlap=1; const examples=[];
      for (const v of variants) {
        const r=checkRoute(route,config.robot,v.field,config.sampling,v.error,v.target);
        worst=Math.min(worst,r.min_sampled_clearance_in);
        if (r.docking_overlap_fraction!==null) minOverlap=Math.min(minOverlap,r.docking_overlap_fraction);
        if (!r.collision_free || r.docking_over_75_percent===false) { failures++; if (examples.length<5) examples.push({variant:v.id,...r}); }
      }
      scenarios.push({wall:wall.id,route:route.id,nominal,sweep:{cases:variants.length,failures,min_sampled_clearance_in:worst,min_docking_overlap_fraction:target?minOverlap:null,failure_examples:examples}});
    }
  }
  return {status:config.status,units:'inches and degrees',provenance:'Agent-run kinematic geometry study using constrained-field-v3.json and field-v3.parameters.json; not owner hardware testing.',policy:{...config.sampling,touching_is_collision:true,guarantee:'Finite sampled poses only; not continuous collision certification. Min clearance is measured at samples, not a penetration depth.',overlap:'Robot plan-area fraction within target polygon; >75% is a study metric, not an official parking interpretation.',scope:'No dynamics, traction, sensing, lap legality, flag operation or tire manipulation. Empty obstacle list is an obstacle-free baseline. One-at-a-time element shifts and constant pose-error combinations are not exhaustive.'},assumptions:config.notes,config,routes,scenarios};
}
function svg(report,model) {
  const config=report.config,wall=config.wall_scenarios[0],field=makeField(model,config,wall);
  const pts=p=>p.map(([x,y])=>`${x},${48-y}`).join(' ');
  let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-3 -10 102 76" width="1224" height="912"><rect x="0" y="0" width="96" height="48" fill="#182330"/>';
  for (const f of model.features.filter(f=>f.kind==='marking')) s+=`<polygon points="${pts(f.vertices_in)}" fill="none" stroke="#95a4b4" stroke-width=".2"/>`;
  for (const f of field.solids) s+=`<polygon points="${pts(f.vertices_in)}" fill="#e3a66c"/>`;
  const b=field.bounds;s+=`<rect x="${b[0]}" y="${48-b[3]}" width="${b[2]-b[0]}" height="${b[3]-b[1]}" fill="none" stroke="#e3a66c" stroke-width=".2"/>`;
  const colors=['#68dbff','#ef91ff','#85e89d','#ffdf70','#ffa58a','#b3a5ff','#7de2d1','#d0d0d0'];
  report.routes.forEach((route,i)=>{
    const color=colors[i%colors.length],poses=samples(route.waypoints,config.sampling);
    s+=`<polyline points="${pts(route.waypoints)}" fill="none" stroke="${color}" stroke-width=".3"/>`;
    poses.forEach((p,j)=>{
      const hit=checkPose(p,config.robot,field).hits.length;
      if (hit || j%40===0 || j===poses.length-1) s+=`<polygon points="${pts(footprint(p,config.robot))}" fill="${hit?'#ff4545':'none'}" fill-opacity=".12" stroke="${hit?'#ff4545':color}" stroke-width=".08"/>`;
    });
  });
  s+=`<g font-family="sans-serif" font-size="1.7" fill="#182330"><text x="0" y="-6">V3 sampled navigation study — ${config.robot.length_in} × ${config.robot.width_in} in — NOT hardware validation</text><text x="0" y="-3">First configured wall scenario; red footprints: sampled collisions; markings excluded conditionally.</text>`;
  report.routes.forEach((r,i)=>{s+=`<text x="${i<5?0:49}" y="${52+(i%5)*2.3}">${i+1}. ${r.id}</text>`;});
  return s+`<text x="0" y="65">${config.obstacles.length?'Configured obstacle probes.':'Obstacle-free baseline.'} See report.json for wall / pose / element-shift sweeps.</text></g></svg>\n`;
}
module.exports={footprint,intersects,distance,overlapFraction,samples,makeField,checkPose,checkRoute,routesFor,runStudy,svg};
if (require.main===module) {
  const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
  const source=read('constrained-field-v3.json'),model=build(source,read(source.trace_file)),config=read('navigation-v3.json');
  const parameters=read('field-v3.parameters.json');
  if (model.dimensions.board_length!==parameters.base.length || model.dimensions.board_width!==parameters.base.width || model.dimensions.center_divider_length!==parameters.center_divider.length_nominal) throw new Error('field source dimensions disagree');
  const report=runStudy(model,config),out=path.join(root,'derived/navigation-v3');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(path.join(out,'paths.svg'),svg(report,model));
  console.log(`Wrote ${out}`);
  for (const r of report.scenarios) console.log(`${r.wall} / ${r.route}: nominal ${r.nominal.collision_free?'clear':'COLLISION'}; sweep failures ${r.sweep.failures}/${r.sweep.cases}; sampled clearance ${r.nominal.min_sampled_clearance_in.toFixed(3)} in`);
}