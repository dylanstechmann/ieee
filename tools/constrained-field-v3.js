#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

function build(config, trace) {
  const d = config.dimensions, a = config.assumptions;
  for (const [group, obj] of [['dimensions', d], ['assumptions', a]]) {
    if (!obj || typeof obj !== 'object') throw new TypeError(`${group} required`);
    for (const [key, value] of Object.entries(obj)) if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new TypeError(`${group}.${key} must be a finite nonnegative number`);
  }
  const requiredD = ['board_length','board_width','pit_length','race_length','pit_box_width','pit_box_depth','pit_box_gap','center_divider_length','pit_divider_length'];
  const requiredA = ['pit_box_near_x','first_box_near_y','center_divider_mid_x','center_divider_y','pit_divider_mid_y','start_box_near_x','start_box_near_y','start_box_width','start_box_depth'];
  for (const key of requiredD) if (!(d[key] > 0)) throw new Error(`positive ${key} required`);
  for (const key of requiredA) if (!(key in a)) throw new Error(`${key} required`);
  if (Math.abs(d.pit_length + d.race_length - d.board_length) > 1e-9) throw new Error('pit + race length must equal board length');
  const rect = (x,y,depth,width) => [[x,y],[x+depth,y],[x+depth,y+width],[x,y+width]];
  const feature = (id, kind, vertices, provenance) => ({id,kind,vertices_in:vertices,provenance});
  const features = [];
  for (let i=0;i<3;i++) features.push(feature(`pit_box_${i+1}`,'marking',rect(a.pit_box_near_x,a.first_box_near_y+i*(d.pit_box_width+d.pit_box_gap),d.pit_box_depth,d.pit_box_width),'12-inch width and 3-inch gap: V3 drawing; depth and origin assumed'));
  features.push(feature('start_box','marking',rect(a.start_box_near_x,a.start_box_near_y,a.start_box_depth,a.start_box_width),'trace origin and 12-inch square assumed'));
  features.push(feature('center_divider_axis','divider_axis',[[a.center_divider_mid_x-d.center_divider_length/2,a.center_divider_y],[a.center_divider_mid_x+d.center_divider_length/2,a.center_divider_y]],'36-inch length: V3 drawing; axis center trace-derived'));
  features.push(feature('pit_divider_axis','divider_axis',[[d.pit_length,a.pit_divider_mid_y-d.pit_divider_length/2],[d.pit_length,a.pit_divider_mid_y+d.pit_divider_length/2]],'16-inch length and 28-inch division: V3 drawing; alignment and axis center assumed'));
  const track = trace.features.find(f=>f.id==='track_marking_outer_edge');
  if (!track) throw new Error('trace track_marking_outer_edge missing');
  features.push(feature('track_marking_trace','trace',track.vertices_in,'unconstrained image trace; not dimensioned'));
  for (const f of features) for (const point of f.vertices_in) {
    if (!Array.isArray(point) || point.length !== 2 || point.some(n => !Number.isFinite(n)) || point[0]<0 || point[0]>d.board_length || point[1]<0 || point[1]>d.board_width) throw new Error(`${f.id} has invalid or out-of-board vertex`);
  }
  if (a.pit_box_near_x+d.pit_box_depth > d.pit_length || a.start_box_near_x+a.start_box_depth > d.pit_length) throw new Error('box crosses assumed pit/race transition');
  return {status:config.status,source:config.source,units:config.units,frame:config.frame,dimensions:d,assumptions:a,features,limitations:config.limitations};
}
function svg(model) {
  const d=model.dimensions, w=d.board_width, l=d.board_length;
  const points = f => f.vertices_in.map(([x,y])=>`${x},${w-y}`).join(' ');
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-3 -9 ${l+6} ${w+22}" width="1200" height="840"><rect x="0" y="0" width="${l}" height="${w}" fill="#20252d" stroke="#777" stroke-width=".3"/><line x1="${d.pit_length}" x2="${d.pit_length}" y1="0" y2="${w}" stroke="#5988a6" stroke-dasharray="1 1" stroke-width=".25"/>`;
  for (const f of model.features) {
    const line=f.kind==='divider_axis', color=line?'#ff9f43':f.kind==='trace'?'#f4d35e':'#e6eef5';
    s+=`<${line?'polyline':'polygon'} points="${points(f)}" fill="${f.kind==='marking'?'#465b6b':'none'}" stroke="${color}" stroke-width="${line?'.5':'.25'}"${f.kind==='trace'?' stroke-dasharray="1 1"':''}/>`;
  }
  s+=`<g font-family="sans-serif" font-size="1.8" fill="#161616"><text x="0" y="-5">V3 provisional constrained layout — NOT verified CAD / NOT for construction</text><text x="0" y="${w+4}">Pit x=0</text><text x="${d.pit_length-4}" y="${w+4}">x=${d.pit_length} (assumed transition)</text><text x="${l-15}" y="${w+4}">x=${l} in →</text><text x="0" y="${w+8}">Boxes ${d.pit_box_width} × ${d.pit_box_depth} in (depth assumed); gaps ${d.pit_box_gap} in; center divider ${d.center_divider_length} in.</text><text x="0" y="${w+11}">Orange: divider axes; dashed yellow: unconstrained trace; dashed blue: assumed transition.</text><text x="0" y="${w+14}">Wall thickness, rail width and clearances NOT modeled. See layout JSON for assumptions.</text></g></svg>`;
  return s+'\n';
}
module.exports={build,svg};
if (require.main===module) {
  const config=JSON.parse(fs.readFileSync(path.join(root,'constrained-field-v3.json')));
  const trace=JSON.parse(fs.readFileSync(path.join(root,config.trace_file)));
  const model=build(config,trace), out=path.join(root,'derived/constrained-field-v3');
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'layout.json'),JSON.stringify(model,null,2)+'\n');
  fs.writeFileSync(path.join(out,'layout.svg'),svg(model));
  console.log(`Wrote constrained layout to ${out}`);
}