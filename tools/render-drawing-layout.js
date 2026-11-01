#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const input = JSON.parse(fs.readFileSync(path.join(root, 'drawing-layout-v3.json'), 'utf8'));
const p = input.source_pixels, b = input.board_inches;
function convert([u,v]) { return [(p.board_bottom-v)*b.length_x/(p.board_bottom-p.board_top), (u-p.board_left)*b.width_y/(p.board_right-p.board_left)]; }
function rounded(n) { return Math.round(n*1000)/1000; }
const features = input.features.map(f => ({id:f.id, kind:f.kind, shape:f.shape, vertices_in:f.pixels.map(pt=>convert(pt).map(rounded))}));
for (const f of features) for (const [x,y] of f.vertices_in) if (x<0||x>b.length_x||y<0||y>b.width_y) throw new Error(`Feature outside board: ${f.id}`);
const model = {status:input.status, source:input.source, frame:input.frame, trace_method:input.trace_method, board_inches:b, features, omissions:input.omissions, drawing_callouts_in:input.drawing_callouts_in};
const dest = path.join(root, 'derived/drawing-layout-v3'); fs.mkdirSync(dest,{recursive:true});
fs.writeFileSync(path.join(dest,'layout.json'), JSON.stringify(model,null,2)+'\n');
const colors = {marking:'#dddddd', physical_centerline:'#ff963c'};
const points = f => f.vertices_in.map(([x,y])=>`${x},${48-y}`).join(' ');
let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-8 -10 112 65" width="1120" height="650"><rect x="0" y="0" width="96" height="48" fill="#20252d" stroke="#aaa" stroke-width="0.4"/>`;
for (const f of features) svg += `<${f.shape === 'line' ? 'polyline' : 'polygon'} points="${points(f)}" fill="${f.shape === 'line' ? 'none' : (f.id.includes('box')?'#44576b':'none')}" stroke="${colors[f.kind]}" stroke-width="${f.kind==='physical_centerline'?0.5:0.25}"/>`;
svg += '<g font-family="sans-serif" font-size="2.2" fill="#151515"><text x="0" y="-5">V3 field: approximate image trace — NOT verified CAD or construction drawing</text><text x="0" y="53">Pit end x=0</text><text x="70" y="53">Race end x=96 in →</text><text x="0" y="57">Orange: divider axes (not thickness); white: markings. Board: 96 × 48 in.</text></g></svg>';
fs.writeFileSync(path.join(dest,'layout.svg'),svg+'\n');
console.log(`Wrote ${features.length} traced features to ${dest}`);