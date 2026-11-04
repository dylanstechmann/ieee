#!/usr/bin/env node
'use strict';
// Reads the organizer's Fusion arena file (ZIP members compressed with Zstandard, B-rep in ASM binary
// form) and derives field geometry in the project frame. Agent-run extraction for the owner's
// hobby/learning project: CAD geometry from a June 2026 design file, not a measured field.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const F = require('./f3d-reader');

const root = path.resolve(__dirname, '..');
const OUT = 'derived/organizer-cad-v10';
const ARENA = 'derived/organizer-cad/2027 IEEE SoutheastCon Arena_Fusion360.f3d';
const TIRE = 'derived/organizer-cad/Spare Tire v2.f3d';
const TRACED = 'derived/constrained-field-v3/layout.json';
const DATE = '2026-11-03';

const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
const r3 = v => Math.round(v * 1000) / 1000 + 0; // + 0 turns -0 into 0

// Project frame (inches): x from the pit-end board edge toward the race end (0-96), y across the board
// (0-48, pit box 1 at low y), z up from the board underside. The CAD origin is the board center with
// its y axis along the board, so x = y_cad + 48 and y = x_cad + 24. Pit boxes, start box, dividers
// and walls land within 0.9 in of the earlier traced layout with this mapping, without mirroring.
function toProject(p, mmPerUnit) {
  const inch = mmPerUnit / 25.4;
  return [r3(p[1] * inch + 48), r3(p[0] * inch + 24), r3(p[2] * inch)];
}

// Bodies with non-zero thickness, identified by index in this file (its hash is pinned) and checked
// against their measured size in inches [x, y, z] so a different file cannot be misread silently.
const FEATURES = [
  {id: 'board', body: 161, size: [96, 48, 0.079], role: 'floor plate (the CAD plate is 2 mm; the physical sheet is 23/32 in)'},
  {id: 'racecourse_floor_layer', body: 150, size: [68, 48, 0.039], role: 'racecourse floor layer under the race walls'},
  {id: 'race_walls', body: 38, size: [68, 48, 4], role: 'side and end walls around the racecourse'},
  {id: 'pit_walls_a', body: 9, size: [28, 46.995, 4], role: 'pit-area walls'},
  {id: 'pit_walls_b', body: 8, size: [28, 1, 4], role: 'pit-area side wall'},
  {id: 'center_divider', body: 37, size: [36, 1, 1], role: 'center divider (1 x 1 x 36 in CAD)'},
  {id: 'center_divider_top_layer', body: 5, size: [36, 1, 0.004], role: 'top face layer of the center divider'},
  {id: 'center_divider_floor_layer', body: 152, size: [36, 1, 0.039], role: 'floor layer under the center divider'},
  {id: 'pit_divider', body: 35, size: [1.52, 15.953, 1], role: 'pit divider between the pit area and the racecourse'},
  {id: 'pit_box_1', body: 2, size: [12, 12, 0.004], role: 'pit box 1 marking'},
  {id: 'pit_box_2', body: 3, size: [12, 12, 0.004], role: 'pit box 2 marking'},
  {id: 'pit_box_3', body: 1, size: [12, 12, 0.004], role: 'pit box 3 marking'},
  {id: 'pit_box_1_copy', body: 61, size: [12, 12, 0.004], role: 'identical second copy of pit box 1'},
  {id: 'pit_box_2_copy', body: 62, size: [12, 12, 0.004], role: 'identical second copy of pit box 2'},
  {id: 'pit_box_3_copy', body: 60, size: [12, 12, 0.004], role: 'identical second copy of pit box 3'},
  {id: 'start_box', body: 40, size: [12, 12, 0.012], role: 'start box marking'},
  {id: 'track_marking', body: 6, size: [52.165, 24.94, 0.004], role: 'octagonal track marking band'},
  {id: 'track_marking_race_end_flat', body: 151, size: [0.9, 12.272, 0.039], role: 'race-end flat of the marking'},
  {id: 'unplaced_post', body: 164, size: [0.442, 1.015, 11], role: '11 in post at the CAD origin; identity transform, so probably an unplaced component (the flag tower?)'},
];
const CHECKER_SQUARES = {first: 100, last: 129, size: [1.333, 1.5, 0.008]};

function bodiesOf(sab) {
  const list = [];
  sab.entities.forEach((e, index) => {
    if (e.name !== 'body') return;
    const {points, transform} = F.bodyPoints(sab.entities, index);
    const m = F.transformMatrix(sab.entities, transform);
    if (!F.isIdentity(m)) throw new Error(`body ${index} has a non-identity transform; not supported`);
    const pts = points.map(p => toProject(p, sab.mm_per_unit));
    if (!pts.length) { list.push({index, vertices: 0}); return; }
    const lo = [0, 1, 2].map(a => Math.min(...pts.map(p => p[a])));
    const hi = [0, 1, 2].map(a => Math.max(...pts.map(p => p[a])));
    list.push({index, vertices: pts.length, lo, hi, size: hi.map((h, a) => r3(h - lo[a])), pts});
  });
  return list;
}

function classify(bodies) {
  const byIndex = new Map(bodies.map(b => [b.index, b]));
  const assigned = new Map();
  for (const f of FEATURES) {
    const b = byIndex.get(f.body);
    if (!b || !b.size) throw new Error(`expected body ${f.body} for ${f.id}`);
    f.size.forEach((s, a) => {
      if (Math.abs(b.size[a] - s) > 0.002) throw new Error(`${f.id}: body ${f.body} size ${b.size} differs from ${f.size}`);
    });
    assigned.set(f.body, f.id);
  }
  for (let i = CHECKER_SQUARES.first; i <= CHECKER_SQUARES.last; i++) {
    const b = byIndex.get(i);
    if (!b || CHECKER_SQUARES.size.some((s, a) => Math.abs(b.size[a] - s) > 0.002)) throw new Error(`checker square body ${i} unexpected`);
    assigned.set(i, 'checker_square');
  }
  return bodies.map(b => {
    const thickness = b.size ? b.size[2] : 0;
    const feature = assigned.get(b.index) || (thickness < 1e-6 ? 'sketch-or-construction' : 'unclassified-solid');
    return {index: b.index, vertices: b.vertices, lo: b.lo || null, hi: b.hi || null, size: b.size || null, classification: feature};
  });
}

const rect = b => [b.lo[0], b.lo[1], b.hi[0], b.hi[1]];
const uniq = values => [...new Set(values)].sort((a, b) => a - b);

function fieldModel(bodies, classified, sab, arenaHash) {
  const get = id => bodies.find(b => b.index === FEATURES.find(f => f.id === id).body);
  const raceWalls = get('race_walls');
  const pitWalls = get('pit_walls_a');
  const xs = uniq(raceWalls.pts.map(p => p[0]));
  const ys = uniq(raceWalls.pts.map(p => p[1]));
  const pitXs = uniq(pitWalls.pts.map(p => p[0]));
  const pitYs = uniq(pitWalls.pts.map(p => p[1]));
  const center = get('center_divider');
  const pitDivider = get('pit_divider');
  const marking = get('track_marking');
  const bottom = marking.pts.filter(p => p[2] < marking.lo[2] + 1e-6);
  const outerSet = bottom.filter(p => [marking.lo[0], marking.hi[0]].includes(p[0]) || [marking.lo[1], marking.hi[1]].includes(p[1]));
  const innerSet = bottom.filter(p => !outerSet.includes(p));
  const ring = set => {
    const cx = set.reduce((s, p) => s + p[0], 0) / set.length;
    const cy = set.reduce((s, p) => s + p[1], 0) / set.length;
    return set.map(p => [p[0], p[1]]).sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
  };
  const outer = ring(outerSet);
  const inner = ring(innerSet);
  if (outer.length !== 8 || inner.length !== 8) throw new Error('marking rings did not resolve to 8 + 8 vertices');
  const squares = bodies.filter(b => b.index >= CHECKER_SQUARES.first && b.index <= CHECKER_SQUARES.last);
  const checkerX = [Math.min(...squares.map(b => b.lo[0])), Math.max(...squares.map(b => b.hi[0]))];
  const lowSquares = squares.filter(b => b.hi[1] <= 24);
  const highSquares = squares.filter(b => b.lo[1] >= 24);
  const checkerLowY = [Math.min(...lowSquares.map(b => b.lo[1])), Math.max(...lowSquares.map(b => b.hi[1]))];
  const checkerHighY = [Math.min(...highSquares.map(b => b.lo[1])), Math.max(...highSquares.map(b => b.hi[1]))];
  const wallFaces = {x_min: pitXs[1], x_max: xs[xs.length - 2], y_min: ys[1], y_max: ys[ys.length - 2]};
  const wallThickness = r3(ys[1] - ys[0]);
  const dividerRect = rect(center);
  const pitRect = rect(pitDivider);
  const markingOuter = {x: [marking.lo[0], marking.hi[0]], y: [marking.lo[1], marking.hi[1]]};
  const markingInnerY = uniq(inner.map(p => p[1]));
  const markingInnerX = uniq(inner.map(p => p[0]));
  const bandWidth = r3(markingInnerY[0] - markingOuter.y[0]);
  const openings = [
    {id: 'low_y', y: [wallFaces.y_min, pitRect[1]], width_in: r3(pitRect[1] - wallFaces.y_min)},
    {id: 'high_y', y: [pitRect[3], wallFaces.y_max], width_in: r3(wallFaces.y_max - pitRect[3])},
  ];
  const corridor = r3(dividerRect[1] - wallFaces.y_min);
  const quadrantX = [[dividerRect[0], r3(dividerRect[0] + 16)], [r3(dividerRect[2] - 16), dividerRect[2]]];
  return {
    version: '0.10.0',
    date: DATE,
    status: 'agent-derived CAD geometry from the organizer June 2026 Fusion file; not a measured field, not a rules ruling',
    frame: {
      units: 'in',
      origin: 'pit-end edge of the board, at the low-y side',
      x: 'along the board toward the race end, 0-96',
      y: 'across the board, 0-48; pit box 1 is at low y',
      z: 'up from the underside of the CAD floor plate',
      cad_mapping: 'x = y_cad + 48, y = x_cad + 24 (CAD origin at the board center, units cm)',
    },
    source: {
      file: ARENA,
      sha256: arenaHash,
      brep_product: sab.product,
      brep_version: sab.version,
      brep_timestamp: sab.timestamp,
      note: 'The B-rep is dated June 14, 2026, before the V3 manuals (Sept 18 / Oct 4). The V3 drawing calls out a 1 x 2 x 36 center divider; this CAD has 1 x 1 x 36.',
    },
    features: {
      board: {rect: rect(get('board')), note: 'CAD floor plate; the physical field uses a 23/32 in x 4 ft x 8 ft sheet (GM2 3.2)'},
      walls: {
        inner_faces: wallFaces,
        pit_area_side_face_y_min: pitYs[1],
        thickness_in: wallThickness,
        height_in: r3(raceWalls.size[2]),
        mounting: 'inside the board edge',
        note: 'CAD uses nominal 1 x 4 dimensions; actual 1 x 4 lumber is 3/4 x 3 1/2 in, which would widen each corridor by up to 1/4 in per wall',
      },
      center_divider: {
        rect: dividerRect,
        height_in: r3(center.size[2]),
        variants: [
          {id: 'cad_1x1', width_in: 1, height_in: 1, source: 'organizer CAD (June 2026)'},
          {id: 'v3_1x2_on_edge_actual', width_in: 0.75, height_in: 1.5, source: 'V3 drawing callout 1 x 2 x 36, actual lumber standing on edge'},
          {id: 'v3_1x2_flat_actual', width_in: 1.5, height_in: 0.75, source: 'V3 drawing callout 1 x 2 x 36, actual lumber lying flat'},
        ],
      },
      pit_divider: {rect: pitRect, height_in: r3(pitDivider.size[2])},
      pit_boxes: ['pit_box_1', 'pit_box_2', 'pit_box_3'].map((id, i) => ({box: i + 1, rect: rect(get(id))})),
      start_box: {rect: rect(get('start_box'))},
      checker_band: {x: checkerX, low_y: checkerLowY, high_y: checkerHighY, square_in: [CHECKER_SQUARES.size[0], CHECKER_SQUARES.size[1]], squares: squares.length},
      pit_openings: openings,
      track_marking: {outer_ring: outer, inner_ring: inner, band_width_in: bandWidth, outer_extent: markingOuter, inner_extent: {x: [markingInnerX[0], markingInnerX[markingInnerX.length - 1]], y: [markingInnerY[0], markingInnerY[markingInnerY.length - 1]]}},
      obstacle_quadrants: {
        source: 'GM2 Appendix E text applied to this geometry; quadrants are not in the CAD',
        x_ranges: quadrantX,
        gap_between_in: r3(quadrantX[1][0] - quadrantX[0][1]),
        corridor_wall_face_to_divider_face_in: corridor,
        interpretations: [
          {id: 'offsets', low_side_y: [r3(wallFaces.y_min + 2), r3(dividerRect[1] - 2)], high_side_y: [r3(dividerRect[3] + 2), r3(wallFaces.y_max - 2)], note: '2 in from the side wall face and 2 in from the divider face; width ' + r3(corridor - 4) + ' in, not the stated 16 in'},
          {id: 'sixteen_from_wall', low_side_y: [r3(wallFaces.y_min + 2), r3(wallFaces.y_min + 18)], high_side_y: [r3(wallFaces.y_max - 18), r3(wallFaces.y_max - 2)], note: '16 in wide starting 2 in from the side wall face'},
          {id: 'sixteen_from_divider', low_side_y: [r3(dividerRect[1] - 18), r3(dividerRect[1] - 2)], high_side_y: [r3(dividerRect[3] + 2), r3(dividerRect[3] + 18)], note: '16 in wide ending 2 in from the divider face'},
        ],
        open_question: 'QA03 in derived/qa-pack-v10',
      },
      unplaced_post: {size_in: get('unplaced_post').size, note: 'At the CAD origin with an identity transform; its real placement (probably the start-flag tower) is not recoverable from the B-rep alone'},
    },
    clearances_in: {
      side_corridor_wall_face_to_divider_face: corridor,
      side_lane_wall_face_to_marking_outer_edge: r3(markingOuter.y[0] - wallFaces.y_min),
      inner_lane_marking_inner_edge_to_divider_face: r3(dividerRect[1] - markingInnerY[0]),
      race_end_marking_outer_edge_to_end_wall_face: r3(wallFaces.x_max - markingOuter.x[1]),
      pit_end_pit_divider_face_to_marking_outer_edge: r3(markingOuter.x[0] - pitRect[2]),
      race_end_divider_end_to_end_wall_face: r3(wallFaces.x_max - dividerRect[2]),
      pit_end_pit_divider_face_to_divider_end: r3(dividerRect[0] - pitRect[2]),
    },
    open_items: [
      'Divider size: CAD 1 x 1 x 36 versus the V3 callout 1 x 2 x 36 (variants above).',
      'Actual lumber (3/4 in walls) versus the CAD nominal 1 in.',
      'AprilTag position and the start-flag tower position are not placed in the B-rep (QA02, QA08).',
      'Obstacle quadrant reference faces (QA03).',
      'Placement tolerance of +/-1 in per element (G02, QA09).',
    ],
  };
}

function svg(field) {
  const f = field.features;
  const s = 10;
  const X = x => r3(x * s);
  const Y = y => r3((48 - y) * s);
  const rectSvg = (r, attrs) => `<rect x="${X(r[0])}" y="${Y(r[3])}" width="${r3((r[2] - r[0]) * s)}" height="${r3((r[3] - r[1]) * s)}" ${attrs}/>`;
  const poly = (pts, attrs) => `<polygon points="${pts.map(p => `${X(p[0])},${Y(p[1])}`).join(' ')}" ${attrs}/>`;
  const w = f.walls.inner_faces;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -40 1000 580" width="1000" height="580" font-family="sans-serif" font-size="11">`,
    rectSvg(f.board.rect, 'fill="#1d2127" stroke="#888"'),
    rectSvg([0, 0, 96, w.y_min], 'fill="#9aa0a6"'), rectSvg([0, w.y_max, 96, 48], 'fill="#9aa0a6"'),
    rectSvg([0, 0, w.x_min, 48], 'fill="#9aa0a6"'), rectSvg([w.x_max, 0, 96, 48], 'fill="#9aa0a6"'),
    poly(f.track_marking.outer_ring, 'fill="#e8e8e8"'), poly(f.track_marking.inner_ring, 'fill="#1d2127"'),
    rectSvg([f.checker_band.x[0], f.checker_band.low_y[0], f.checker_band.x[1], f.checker_band.low_y[1]], 'fill="url(#chk)"'),
    rectSvg([f.checker_band.x[0], f.checker_band.high_y[0], f.checker_band.x[1], f.checker_band.high_y[1]], 'fill="url(#chk)"'),
    ...f.pit_boxes.map(b => rectSvg(b.rect, 'fill="none" stroke="#fff" stroke-width="2"')),
    rectSvg(f.start_box.rect, 'fill="none" stroke="#7fd37f" stroke-width="2"'),
    rectSvg(f.center_divider.rect, 'fill="#ff963c"'), rectSvg(f.pit_divider.rect, 'fill="#ff963c"'),
    ...f.obstacle_quadrants.x_ranges.flatMap(xr => {
      const q = f.obstacle_quadrants.interpretations[0];
      return [rectSvg([xr[0], q.low_side_y[0], xr[1], q.low_side_y[1]], 'fill="none" stroke="#e05555" stroke-dasharray="6 4"'),
        rectSvg([xr[0], q.high_side_y[0], xr[1], q.high_side_y[1]], 'fill="none" stroke="#e05555" stroke-dasharray="6 4"')];
    }),
    `<defs><pattern id="chk" width="13.33" height="15" patternUnits="userSpaceOnUse"><rect width="13.33" height="15" fill="#fff"/><rect width="6.67" height="7.5" fill="#000"/><rect x="6.67" y="7.5" width="6.67" height="7.5" fill="#000"/></pattern></defs>`,
    `<text x="0" y="-24">Organizer CAD (June 2026) in the project frame, inches. Agent-derived; not a measured field.</text>`,
    `<text x="0" y="-8">Orange: dividers. White: marking and pit boxes. Green: start box. Dashed red: obstacle quadrants (offset reading).</text>`,
    `<text x="0" y="500">x = 0 (pit end)</text><text x="860" y="500">x = 96 (race end)</text>`,
    `<line x1="0" y1="510" x2="${X(12)}" y2="510" stroke="#000"/><text x="0" y="525">12 in</text>`,
    '</svg>',
  ];
  return parts.join('\n') + '\n';
}

function comparison(field, traced) {
  const f = field.features;
  const feature = id => traced.features.find(x => x.id === id);
  const bbox = v => [Math.min(...v.map(p => p[0])), Math.min(...v.map(p => p[1])), Math.max(...v.map(p => p[0])), Math.max(...v.map(p => p[1]))].map(r3);
  const rows = [
    ['Pit box 1', bbox(feature('pit_box_1').vertices_in), f.pit_boxes[0].rect],
    ['Pit box 2', bbox(feature('pit_box_2').vertices_in), f.pit_boxes[1].rect],
    ['Pit box 3', bbox(feature('pit_box_3').vertices_in), f.pit_boxes[2].rect],
    ['Start box', bbox(feature('start_box').vertices_in), f.start_box.rect],
    ['Center divider (traced axis vs CAD body)', bbox(feature('center_divider_axis').vertices_in), f.center_divider.rect],
    ['Pit divider (traced axis vs CAD body)', bbox(feature('pit_divider_axis').vertices_in), f.pit_divider.rect],
  ];
  const fmt = r => `${r[0]}–${r[2]} x ${r[1]}–${r[3]}`;
  const c = field.clearances_in;
  return [
    '# Organizer CAD versus the earlier traced layout',
    '',
    `${DATE}. Agent-run comparison. The traced layout is \`${TRACED}\`, from an image trace of the V3 drawing. The CAD is the organizer's June 2026 Fusion file. Neither is a measurement of a built field.`,
    '',
    '| Feature | Traced x range x y range (in) | CAD x range x y range (in) |',
    '|---|---|---|',
    ...rows.map(([name, a, b]) => `| ${name} | ${fmt(a)} | ${fmt(b)} |`),
    '',
    '## Clearances from the CAD',
    '',
    '| Clearance | CAD (in) | Earlier estimate |',
    '|---|---:|---|',
    `| Side corridor, wall face to divider face | ${c.side_corridor_wall_face_to_divider_face} | about 22 |`,
    `| Side lane, wall face to marking outer edge | ${c.side_lane_wall_face_to_marking_outer_edge} | 10.98 (VERIFIED-FACTS.md) |`,
    `| Inner lane, marking inner edge to divider face | ${c.inner_lane_marking_inner_edge_to_divider_face} | — |`,
    `| Race end, marking outer edge to end wall face | ${c.race_end_marking_outer_edge_to_end_wall_face} | 8.73 |`,
    `| Pit end, pit divider face to marking outer edge | ${c.pit_end_pit_divider_face_to_marking_outer_edge} | 8.41 |`,
    `| Race end, divider end to end wall face | ${c.race_end_divider_end_to_end_wall_face} | about 15 |`,
    `| Pit end, pit divider face to divider end | ${c.pit_end_pit_divider_face_to_divider_end} | about 15.4 |`,
    `| Pit openings beside the pit divider | ${f.pit_openings.map(o => o.width_in).join(' and ')} | 15 and 15.02 (V3 callouts) |`,
    '',
    '## What changes',
    '',
    `- **Marking.** The marking band is ${f.track_marking.band_width_in} in wide, and its chamfers are not 45°. The outer ring runs x ${f.track_marking.outer_extent.x.join('–')}, y ${f.track_marking.outer_extent.y.join('–')}.`,
    '- **End strips.** Between the marking and the end walls they are narrower than the earlier estimates, so a 10 in robot cannot turn at either end without crossing the marking. Whether that is allowed is QA04.',
    '- **Center divider.** In the CAD it is 1 x 1 x 36 in, while the V3 drawing says 1 x 2 x 36. Both variants stay in `field-v10.json`.',
    '- **Pit divider.** Its race-side face is at x = 28.0, about 0.5 in west of the earlier simulator rectangle (27.5–28.5). The simulator was therefore slightly conservative on the race side.',
    '',
  ].join('\n');
}

function build() {
  const arenaBytes = fs.readFileSync(path.join(root, ARENA));
  const tireBytes = fs.readFileSync(path.join(root, TIRE));
  const arenaMembers = F.readZip(arenaBytes);
  const tireMembers = F.readZip(tireBytes);
  const brep = arenaMembers.find(m => /Breps\.BlobParts\/BREP\.[^/]+\.smb$/.test(m.name));
  const sab = F.readSab(brep.data);
  if (sab.mm_per_unit !== 10) throw new Error(`unexpected units: ${sab.mm_per_unit} mm per unit`);
  const bodies = bodiesOf(sab);
  const classified = classify(bodies);
  const unclassified = classified.filter(b => b.classification === 'unclassified-solid');
  if (unclassified.length) throw new Error(`unclassified solid bodies: ${unclassified.map(b => b.index).join(', ')}`);
  const field = fieldModel(bodies, classified, sab, sha256(arenaBytes));
  const traced = JSON.parse(fs.readFileSync(path.join(root, TRACED), 'utf8'));
  const memberList = (file, members) => ({file, members: members.map(m => ({name: m.name, method: m.method, size: m.size, sha256: sha256(m.data)}))});
  const tireBrep = tireMembers.find(m => /Breps\.BlobParts\/BREP\.[^/]+\.smb$/.test(m.name));
  const tireSab = F.readSab(tireBrep.data);
  const tireBodies = bodiesOf(tireSab).filter(b => b.size).map(b => ({index: b.index, vertices: b.vertices, size_mm: b.size.map(v => r3(v * 25.4))}));
  const preview = arenaMembers.find(m => m.name.endsWith('Previews/small.png'));
  const files = {
    'members.json': JSON.stringify([memberList(ARENA, arenaMembers), memberList(TIRE, tireMembers)], null, 2) + '\n',
    'bodies.json': JSON.stringify({file: ARENA, frame: field.frame, brep_timestamp: sab.timestamp, bodies: classified}, null, 2) + '\n',
    'tire-bodies.json': JSON.stringify({file: TIRE, brep_timestamp: tireSab.timestamp, note: 'Vertex bounding boxes in mm. Curved solids keep few vertices, so these do not measure the tire OD or bore; most bodies are sketches and profiles.', bodies: tireBodies}, null, 2) + '\n',
    'field-v10.json': JSON.stringify(field, null, 2) + '\n',
    'field-plan.svg': svg(field),
    'comparison.md': comparison(field, traced),
  };
  const binaries = {'preview.png': preview.data};
  const inputs = [ARENA, TIRE, TRACED, 'tools/f3d-reader.js', 'tools/organizer-cad-v10.js'];
  const manifest = {
    date: DATE,
    status: 'agent-derived CAD geometry; not a measured field',
    input_hashes: Object.fromEntries(inputs.map(f => [f, sha256(fs.readFileSync(path.join(root, f)))])),
    output_hashes: Object.fromEntries([...Object.entries(files), ...Object.entries(binaries)].map(([f, data]) => [f, sha256(data)])),
  };
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  return {files, binaries, field};
}

module.exports = {build, OUT};

if (require.main === module) {
  const {files, binaries, field} = build();
  const dest = path.join(root, OUT);
  fs.mkdirSync(dest, {recursive: true});
  for (const [file, text] of Object.entries(files)) fs.writeFileSync(path.join(dest, file), text);
  for (const [file, data] of Object.entries(binaries)) fs.writeFileSync(path.join(dest, file), data);
  console.log(JSON.stringify({wrote: OUT, clearances_in: field.clearances_in, openings: field.features.pit_openings.map(o => o.width_in)}, null, 2));
}
