#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {build}=require('./constrained-field-v3');
const {footprint,runStudy,svg}=require('./navigation-v3');
const root=path.resolve(__dirname,'..');
const delta=(a,b)=>((b-a)%360+540)%360-180;

// Reject lateral translation and simultaneous translate/rotate. This restricted
// primitive set is realizable by ideal differential drive but is not a planner.
function primitives(waypoints,wheelTrack) {
  if (!Number.isFinite(wheelTrack)||wheelTrack<=0) throw new Error('positive finite wheel track required');
  if (!Array.isArray(waypoints)||waypoints.length<2) throw new Error('two waypoints required');
  for (const p of waypoints) footprint(p,{length_in:1,width_in:1});
  const segments=[];
  for (let i=1;i<waypoints.length;i++) {
    const a=waypoints[i-1],b=waypoints[i],dx=b[0]-a[0],dy=b[1]-a[1],angle=delta(a[2],b[2]),length=Math.hypot(dx,dy);
    const heading=a[2]*Math.PI/180;
    let left,right,kind;
    if (length>1e-8) {
      if (Math.abs(angle)>1e-8) throw new Error(`segment ${i}: simultaneous translation and rotation unsupported`);
      const lateral=-dx*Math.sin(heading)+dy*Math.cos(heading);
      if (Math.abs(lateral)>1e-8) throw new Error(`segment ${i}: lateral translation forbidden`);
      left=right=dx*Math.cos(heading)+dy*Math.sin(heading);
      kind=left>=0?'forward':'reverse';
    } else {
      right=wheelTrack*angle*Math.PI/360; left=-right;
      kind=Math.abs(angle)>1e-8?'spin':'hold';
    }
    segments.push({from_waypoint:i-1,to_waypoint:i,kind,translation_in:length,rotation_deg:angle,left_wheel_travel_in:left,right_wheel_travel_in:right});
  }
  return {segments,translation_in:segments.reduce((s,p)=>s+p.translation_in,0),absolute_rotation_deg:segments.reduce((s,p)=>s+Math.abs(p.rotation_deg),0),absolute_wheel_travel_in:segments.reduce((s,p)=>s+Math.abs(p.left_wheel_travel_in)+Math.abs(p.right_wheel_travel_in),0)};
}

function routesFor(model,config) {
  for (const key of ['wheel_track_in','return_column_in','far_turn_column_in','lower_lane_y_in','upper_lane_y_in','pit_gate_y_in','pit_staging_x_in']) if (!Number.isFinite(config[key])||config[key]<=0) throw new Error(`positive finite ${key} required`);
  if (config.return_column_in>=config.far_turn_column_in || config.lower_lane_y_in>=config.upper_lane_y_in) throw new Error('ordered circuit coordinates required');
  const start=model.features.find(f=>f.id==='start_box').vertices_in;
  const sx=(start[0][0]+start[2][0])/2,sy=(start[0][1]+start[2][1])/2;
  const x=config.return_column_in,far=config.far_turn_column_in,lo=config.lower_lane_y_in,hi=config.upper_lane_y_in,gate=config.pit_gate_y_in,stage=config.pit_staging_x_in;
  return model.features.filter(f=>f.id.startsWith('pit_box_')).map(box=>{
    const cx=(box.vertices_in[0][0]+box.vertices_in[2][0])/2,cy=(box.vertices_in[0][1]+box.vertices_in[2][1])/2;
    // Explicit spin waypoints make every translation parallel to the body axis.
    const waypoints=[[sx,sy,0],[x,sy,0],[x,sy,-90],[x,hi,-90],[x,hi,0],
      [far,hi,0],[far,hi,-90],[far,lo,-90],[far,lo,-180],[x,lo,-180],
      [x,lo,-90],[x,gate,-90],[x,gate,-180],[stage,gate,-180],
      [stage,gate,90],[stage,cy,90],[stage,cy,180],[cx,cy,180]];
    const docking_waypoint_index=waypoints.length-1;
    waypoints.push([stage,cy,180],[stage,cy,-90],[stage,gate,-90],[stage,gate,0],
      [x,gate,0],[x,gate,90],[x,hi,90],[x,hi,0]);
    const route={id:`differential-${box.id}`,target_id:box.id,docking_waypoint_index,waypoints};
    route.kinematics=primitives(waypoints,config.wheel_track_in);
    return route;
  });
}
function study(model,navigation,drive) {
  const routes=routesFor(model,drive),config=structuredClone(navigation);
  config.status=drive.status;
  config.notes=config.notes.filter(n=>!n.includes('Waypoint interpolation permits sideways'));
  config.notes.push(...drive.notes);
  const report=runStudy(model,config,routes);
  report.drive_config=drive;
  report.policy.kinematics='Ideal straight forward/reverse and in-place spin only. Wheel travel uses a centered axle and configured track. No dynamic/hardware validation.';
  return report;
}
module.exports={primitives,routesFor,study};
if (require.main===module) {
  const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
  const source=read('constrained-field-v3.json'),model=build(source,read(source.trace_file));
  const report=study(model,read('navigation-v3.json'),read('differential-drive-v3.json'));
  const out=path.join(root,'derived/differential-drive-v3');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(path.join(out,'paths.svg'),svg(report,model));
  for (const s of report.scenarios) console.log(`${s.wall} / ${s.route}: nominal ${s.nominal.collision_free?'clear':'COLLISION'}, overlap ${(s.nominal.docking_overlap_fraction*100).toFixed(1)}%, sweep ${s.sweep.failures}/${s.sweep.cases} failures, worst sampled clearance ${s.sweep.min_sampled_clearance_in.toFixed(3)} in`);
  console.log(`Wrote ${out}`);
}