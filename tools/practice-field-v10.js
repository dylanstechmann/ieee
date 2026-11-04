#!/usr/bin/env node
'use strict';
// Builds derived/practice-field-v10: a practice-field build packet (materials, layout coordinates,
// plan drawing, as-built measurement template, +/-1 in variation drills) from the organizer CAD
// geometry in derived/organizer-cad-v10/field-v10.json and the GM2 Appendix B materials list.
// Agent-prepared for the owner's hobby/learning project; nothing here has been built or measured.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const OUT = 'derived/practice-field-v10';
const FIELD = 'derived/organizer-cad-v10/field-v10.json';
const DATE = '2026-11-03';
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
const r3 = v => Math.round(v * 1000) / 1000 + 0;

// GM2 V3 Appendix B, extracted paragraph lines 266-337 of derived/GM2-V3.1-paragraphs.txt.
const MATERIALS = [
  ['Field floor: 23/32 in x 4 ft x 8 ft RTD sheathing (SYP)', 35.48, 1],
  ['1 x 4 x 8 ft furring strip (walls)', 3.34, 3],
  ['1 x 2 x 8 ft furring strip (dividers)', 1.53, 1],
  ['Wood screws, #8 x 1-5/8 in star drive, 1 lb box', 10.98, 2],
  ['Black paint ONYX PPG1011-7, 1 gal flat', 25.98, 1],
  ['Gray paint Winter Chill PPG1036-2, 1 qt flat', 12.98, 1],
  ['White paint Delicate White PPG1001-1, 1 qt flat', 12.98, 1],
  ['Start-line checkerboard adhesive roll', 9.19, 1],
  ['Green start flag', 13.54, 1],
  ['Toy vehicle obstacle set (the official obstacles)', 35.95, 1],
  ['Masking tape, 1 in', 2.78, 1],
];
const MATERIALS_TOTAL = 182.39;

function loadField() {
  return JSON.parse(fs.readFileSync(path.join(root, FIELD), 'utf8'));
}

function pairRings(outer, inner) {
  // Both rings are sorted by angle about the same center, so vertices pair by position.
  return outer.map((p, i) => [r3((p[0] + inner[i][0]) / 2), r3((p[1] + inner[i][1]) / 2)]);
}

function coordinates(field) {
  const f = field.features;
  const rows = [['feature', 'point', 'x_in', 'y_in', 'note']];
  const add = (feature, point, x, y, note = '') => rows.push([feature, point, r3(x), r3(y), note]);
  const rectRows = (feature, r, note) => {
    add(feature, 'corner_low_x_low_y', r[0], r[1], note);
    add(feature, 'corner_high_x_low_y', r[2], r[1]);
    add(feature, 'corner_high_x_high_y', r[2], r[3]);
    add(feature, 'corner_low_x_high_y', r[0], r[3]);
  };
  const w = f.walls.inner_faces;
  rectRows('wall_inner_faces', [w.x_min, w.y_min, w.x_max, w.y_max], 'CAD nominal 1 in walls inside the board edge');
  rectRows('center_divider', f.center_divider.rect, 'CAD 1 x 1 x 36; V3 drawing says 1 x 2 x 36');
  rectRows('pit_divider', f.pit_divider.rect, 'CAD footprint');
  f.pit_boxes.forEach(b => rectRows(`pit_box_${b.box}`, b.rect, 'white 12 in square'));
  rectRows('start_box', f.start_box.rect, 'white 12 in square');
  rectRows('checker_band_low_y', [f.checker_band.x[0], f.checker_band.low_y[0], f.checker_band.x[1], f.checker_band.low_y[1]], 'checker strip across the low-y pit opening');
  rectRows('checker_band_high_y', [f.checker_band.x[0], f.checker_band.high_y[0], f.checker_band.x[1], f.checker_band.high_y[1]], 'checker strip across the high-y pit opening');
  f.track_marking.outer_ring.forEach((p, i) => add('marking_outer_edge', `v${i + 1}`, p[0], p[1], i === 0 ? 'outer edge of the white band' : ''));
  f.track_marking.inner_ring.forEach((p, i) => add('marking_inner_edge', `v${i + 1}`, p[0], p[1], i === 0 ? 'inner edge of the white band' : ''));
  pairRings(f.track_marking.outer_ring, f.track_marking.inner_ring).forEach((p, i) => add('marking_tape_centerline', `v${i + 1}`, p[0], p[1], i === 0 ? 'centerline for the 1 in masking-tape method' : ''));
  return rows.map(r => r.map(v => (typeof v === 'string' && /[,"]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(',')).join('\n') + '\n';
}

function materialsCsv() {
  const rows = [['item', 'unit_price_usd', 'quantity', 'line_total_usd']];
  let total = 0;
  for (const [item, price, qty] of MATERIALS) {
    const line = Math.round(price * qty * 100) / 100;
    total += line;
    rows.push([`"${item}"`, price.toFixed(2), qty, line.toFixed(2)]);
  }
  rows.push(['"Organizer list total (GM2 Appendix B)"', '', '', (Math.round(total * 100) / 100).toFixed(2)]);
  rows.push(['"Brushes, rollers, trays, double-sided tape (organizer estimate: under $35)"', '', '', '']);
  return {csv: rows.map(r => r.join(',')).join('\n') + '\n', total: Math.round(total * 100) / 100};
}

function cutList(field) {
  const f = field.features;
  const w = f.walls.inner_faces;
  const center = f.center_divider.rect;
  const pit = f.pit_divider.rect;
  return [
    ['part', 'stock', 'quantity', 'cad_length_in', 'note'],
    ['side wall', '1 x 4 x 8 ft', 2, 96, 'full board length, on edge, flush with the long board edges'],
    ['end wall', '1 x 4 x 8 ft (one strip gives both)', 2, r3(w.y_max - w.y_min), 'between the side walls; with actual 3/4 in lumber cut 46 1/2 in so the walls stay flush with the board edges'],
    ['center divider', '1 x 2 x 8 ft', 1, r3(center[2] - center[0]), 'V3 drawing 1 x 2 x 36; the June CAD shows a 1 x 1 section'],
    ['pit divider', '1 x 2 x 8 ft (same strip)', 1, r3(pit[3] - pit[1]), 'V3 drawing 1 x 1 x 16; CAD footprint 1.52 x 15.95 in, 1 in tall'],
  ].map(r => r.map(v => (typeof v === 'string' && /[,"]/.test(v) ? `"${v}"` : v)).join(',')).join('\n') + '\n';
}

function asBuiltTemplate(field) {
  const f = field.features;
  const item = (id, what, nominal) => ({id, what, nominal_in: nominal, measured_in: [null, null, null], instrument: null, measured_by: null, date: null, notes: null});
  const w = f.walls.inner_faces;
  return {
    schema: 'practice-field-asbuilt/v1',
    status: 'template; copy to measurements/field-asbuilt-<date>.json and fill in',
    datum: 'pit-end edge of the board at the low-y side (x = 0, y = 0); measure along the board edges',
    items: [
      item('board_length', 'board length along x', 96),
      item('board_width', 'board width along y', 48),
      item('wall_actual_thickness', 'actual wall lumber thickness', 0.75),
      item('wall_actual_height', 'actual wall lumber height', 3.5),
      item('wall_face_y_low', 'low-y wall inner face, measured at x = 48', w.y_min),
      item('wall_face_y_high', 'high-y wall inner face, measured at x = 48', w.y_max),
      item('wall_face_x_race_end', 'race-end wall inner face, measured at y = 24', w.x_max),
      item('wall_face_x_pit_end', 'pit-end wall inner face, measured at y = 24', w.x_min),
      item('center_divider_x_start', 'center divider west end x', f.center_divider.rect[0]),
      item('center_divider_x_end', 'center divider east end x', f.center_divider.rect[2]),
      item('center_divider_low_face_y', 'center divider low-y face', f.center_divider.rect[1]),
      item('center_divider_actual_width', 'divider actual width', null),
      item('center_divider_actual_height', 'divider actual height', null),
      item('pit_divider_race_face_x', 'pit divider race-side face x', f.pit_divider.rect[2]),
      item('pit_divider_y_start', 'pit divider low-y end', f.pit_divider.rect[1]),
      item('pit_divider_y_end', 'pit divider high-y end', f.pit_divider.rect[3]),
      ...f.pit_boxes.map(b => item(`pit_box_${b.box}_low_corner`, `pit box ${b.box} low-x low-y corner (x then y)`, [b.rect[0], b.rect[1]])),
      item('start_box_low_corner', 'start box low-x low-y corner (x then y)', [f.start_box.rect[0], f.start_box.rect[1]]),
      ...f.track_marking.outer_ring.map((p, i) => item(`marking_outer_v${i + 1}`, `marking outer edge vertex ${i + 1} (x then y)`, p)),
      item('marking_band_width', 'white band width', f.track_marking.band_width_in),
      item('apriltag_printed_size', 'printed tag outer black square, mm (68 mm nominal; pose uses the inner 5/9)', null),
      item('obstacle_car_1', 'official obstacle vehicle 1: length, width, height', null),
      item('obstacle_car_2', 'official obstacle vehicle 2: length, width, height', null),
      item('obstacle_car_3', 'official obstacle vehicle 3: length, width, height', null),
    ],
  };
}

function drills(field) {
  const f = field.features;
  const rows = [['drill', 'element', 'change_in', 'purpose']];
  const add = (...r) => rows.push(r.map(v => (typeof v === 'string' && /[,"]/.test(v) ? `"${v}"` : v)));
  add('D1', 'center divider', '+1 in toward high y', 'narrow the high-y corridor by 1 in (G02)');
  add('D2', 'center divider', '-1 in toward low y', 'narrow the low-y corridor by 1 in');
  add('D3', 'center divider', '+1 in toward the race end', 'shorten the race-end turn gap to 14 in');
  add('D4', 'pit divider', '+1 in toward the race end', 'shorten the pit-end turn gap to 15 in');
  add('D5', 'center divider + pit divider', 'D3 and D4 together', 'worst-case end gaps at both ends');
  add('D6', 'obstacles', 'each vehicle moved 1 in within its quadrant', 'obstacle passes with placement error');
  add('D7', 'AprilTag and start flag', 'mount +/-1 in', 'tag reading and start detection with placement error');
  return {csv: rows.map(r => r.join(',')).join('\n') + '\n', count: rows.length - 1, centerX: f.center_divider.rect};
}

function plan(field) {
  const f = field.features;
  const s = 10;
  const X = x => r3(x * s);
  const Y = y => r3((48 - y) * s);
  const rect = (r, attrs) => `<rect x="${X(r[0])}" y="${Y(r[3])}" width="${r3((r[2] - r[0]) * s)}" height="${r3((r[3] - r[1]) * s)}" ${attrs}/>`;
  const label = (x, y, text, anchor = 'start') => `<text x="${X(x)}" y="${Y(y)}" text-anchor="${anchor}">${text}</text>`;
  const w = f.walls.inner_faces;
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-30 -50 1020 600" width="1020" height="600" font-family="sans-serif" font-size="10">`,
    rect([0, 0, 96, 48], 'fill="#22262c" stroke="#555"'),
    rect([0, 0, 96, w.y_min], 'fill="#9aa0a6"'), rect([0, w.y_max, 96, 48], 'fill="#9aa0a6"'),
    rect([0, 0, w.x_min, 48], 'fill="#9aa0a6"'), rect([w.x_max, 0, 96, 48], 'fill="#9aa0a6"'),
    `<polygon points="${f.track_marking.outer_ring.map(p => `${X(p[0])},${Y(p[1])}`).join(' ')}" fill="#eee"/>`,
    `<polygon points="${f.track_marking.inner_ring.map(p => `${X(p[0])},${Y(p[1])}`).join(' ')}" fill="#22262c"/>`,
    ...f.pit_boxes.map(b => rect(b.rect, 'fill="#eee"')),
    rect(f.start_box.rect, 'fill="#eee"'),
    rect([f.checker_band.x[0], f.checker_band.low_y[0], f.checker_band.x[1], f.checker_band.low_y[1]], 'fill="#777" stroke="#000"'),
    rect([f.checker_band.x[0], f.checker_band.high_y[0], f.checker_band.x[1], f.checker_band.high_y[1]], 'fill="#777" stroke="#000"'),
    rect(f.center_divider.rect, 'fill="#ff963c"'), rect(f.pit_divider.rect, 'fill="#ff963c"'),
    '<g fill="#fff" font-size="11">',
    ...f.track_marking.outer_ring.map((p, i) => {
      const end = p[0] < 40 || p[0] > 85;
      const dx = end ? (p[0] < 40 ? 2.2 : -2.2) : 0;
      const dy = end ? 0 : (p[1] > 24 ? 1.2 : -2.2);
      return label(p[0] + dx, p[1] + dy, `v${i + 1}`, end ? (p[0] < 40 ? 'start' : 'end') : 'middle');
    }),
    label(f.center_divider.rect[0] + 18, f.center_divider.rect[1] - 2, 'center divider', 'middle'),
    label(f.pit_divider.rect[0] - 0.8, 24, 'pit divider', 'end'),
    '</g><g fill="#222" font-size="11">',
    ...f.pit_boxes.map(b => label((b.rect[0] + b.rect[2]) / 2, (b.rect[1] + b.rect[3]) / 2, `pit box ${b.box}`, 'middle')),
    label((f.start_box.rect[0] + f.start_box.rect[2]) / 2, (f.start_box.rect[1] + f.start_box.rect[3]) / 2, 'start box', 'middle'),
    '</g>',
    `<text x="0" y="-32" font-size="12">Practice-field layout from the organizer CAD (June 2026), inches. Datum: pit-end board edge at low y. Not a measured field.</text>`,
    `<text x="0" y="-16">Walls are inside the board edge; inner faces at x ${w.x_min} and ${w.x_max}, y ${w.y_min} and ${w.y_max} with 1 in walls (3/4 in lumber gives 0.75 / 95.25 / 47.25).</text>`,
    `<text x="0" y="505">x = 0 (pit end)</text><text x="960" y="505" text-anchor="end">x = 96 (race end)</text>`,
    `<line x1="0" y1="520" x2="${X(12)}" y2="520" stroke="#000"/><text x="0" y="534">12 in at this scale. Lay out from coordinates.csv (every corner and marking vertex v1-v8), not by scaling this drawing.</text>`,
    '</svg>',
  ];
  return out.join('\n') + '\n';
}

function readme(field, total, drillCount) {
  const f = field.features;
  return [
    '# Practice-field build packet (v10)',
    '',
    `${DATE} · agent-prepared for the owner's hobby/learning project. **Nothing here has been built or measured.** The geometry comes from the organizer's June 2026 arena CAD (\`derived/organizer-cad-v10/\`). The method follows the organizer build guide (\`sources/SEC-2027-Arena-Build-Guide.pdf\`, pages 5–8) and the materials list in GM2 V3 Appendix B.`,
    '',
    '## Files',
    '',
    '| File | Use |',
    '|---|---|',
    '| `materials.csv` | Organizer list, quantities and prices |',
    '| `cut-list.csv` | Wall and divider lengths |',
    '| `coordinates.csv` | Every corner and marking vertex, in inches from the datum |',
    '| `layout-plan.svg` | Plan drawing; for orientation only. Lay out from `coordinates.csv`, not by scaling the drawing. |',
    '| `asbuilt-template.json` | Measurement record. Copy it to `measurements/field-asbuilt-<date>.json` and fill it in. |',
    '| `variation-drills.csv` | +/-1 in placement drills (G02) |',
    '',
    '## Cost',
    '',
    `The organizer list totals **$${total.toFixed(2)}**, and it already includes the paint, the green start flag, the checkerboard roll and the official toy-vehicle obstacle set. Brushes, rollers, trays and double-sided tape are extra; the organizer estimates under $35. Prices are archived, not quotes.`,
    '',
    '## Datum and frame',
    '',
    '- **Datum:** the corner of the board at the pit end and the low-y side.',
    '- **x:** along the 96 in edge toward the race end.',
    '- **y:** along the 48 in edge, toward pit box 3 and the start box.',
    '- Measure along the board edges with a tape, square from the edge, and mark in pencil.',
    '',
    '## Build steps',
    '',
    '1. **Prepare.** Sand and clean the board (guide p. 5).',
    '2. **Paint white first.** Paint the white areas: the marking band, the three pit boxes and the start box. White covers raw wood more easily than dark colors (guide p. 5).',
    `3. **Mark the layout.** When the white is dry, mark the layout in pencil from \`coordinates.csv\`: the 8 outer and 8 inner marking vertices, the pit boxes and the start box. The CAD marking band is ${f.track_marking.band_width_in} in wide. The organizer's own build used 1 in masking tape over white paint (GM2 Appendix B note), so \`marking_tape_centerline\` gives the tape centerline.`,
    '4. **Paint the background.** Mask the white areas with tape and paint the background black. Remove the tape while the paint is still slightly tacky (guide p. 5).',
    '5. **Paint the walls and dividers.** Paint them gray, separately, before installing them (guide p. 5).',
    '6. **Install the walls and dividers.**',
    '   - Fasten the walls flush with the board edges, inside the board. With 1 in CAD walls the inner faces are at y = 1 and 47 and x = 1 and 95; real 3/4 in lumber puts them 1/4 in further out.',
    '   - Place the dividers temporarily with double-sided tape and check them against `coordinates.csv`.',
    '   - Then transfer their positions to the underside, drill pilot holes, and screw up into them from underneath (guide p. 7).',
    '   - For the variation drills, leave the dividers on tape until the drills are done.',
    `7. **Lay the checker strips.** Apply them across both pit openings, x ${f.checker_band.x[0]}–${f.checker_band.x[1]}, cut to the measured opening. The guide measures the 15 in opening between the divider and the wall (p. 8); the CAD gives ${f.pit_openings.map(o => o.width_in).join(' and ')} in.`,
    '8. **Mount the extras.**',
    '   - Print the AprilTag sheet and check the printed size with calipers.',
    '   - Place a start-flag stand-in near the pit divider; the exact mount is open (QA08).',
    '   - Keep the obstacle set beside the field.',
    '9. **Record the as-built field.** Fill in the as-built template: three measurements per item, the instrument, who measured and the date. Add photos. These numbers replace the CAD values in the simulator, as a dated, reviewed change.',
    '',
    `## Variation drills (${drillCount})`,
    '',
    'G02 allows each element to sit up to 1 in from its nominal position. `variation-drills.csv` lists shifts to rehearse with temporary mounting, so routes and sensing are tested against more than one field.',
    '',
    '## Still open',
    '',
    '- **Center divider:** the CAD has 1 x 1 x 36, the V3 drawing 1 x 2 x 36. If using 1 x 2 lumber, record how it is oriented.',
    '- **Marking width:** 0.9 in in CAD, about 1 in with the organizer\'s masking-tape method.',
    '- **AprilTag and start-flag positions** are not in the CAD (QA02, QA08).',
    '- **Obstacle placement rules** (QA03).',
    '- **Size and storage:** the field is a single 4 x 8 ft sheet. Plan storage before building; the organizer provides practice fields at the event, but a team may not bring its own into the pit area (G00).',
    '',
  ].join('\n');
}

function build() {
  const field = loadField();
  const materials = materialsCsv();
  if (Math.abs(materials.total - MATERIALS_TOTAL) > 0.005) throw new Error(`materials total ${materials.total} differs from the organizer total ${MATERIALS_TOTAL}`);
  const drill = drills(field);
  const files = {
    'materials.csv': materials.csv,
    'cut-list.csv': cutList(field),
    'coordinates.csv': coordinates(field),
    'layout-plan.svg': plan(field),
    'asbuilt-template.json': JSON.stringify(asBuiltTemplate(field), null, 2) + '\n',
    'variation-drills.csv': drill.csv,
    'README.md': readme(field, materials.total, drill.count),
  };
  const inputs = [FIELD, 'tools/practice-field-v10.js'];
  const manifest = {
    date: DATE,
    status: 'agent-prepared build packet; not built or measured',
    input_hashes: Object.fromEntries(inputs.map(f => [f, sha256(fs.readFileSync(path.join(root, f)))])),
    output_hashes: Object.fromEntries(Object.entries(files).map(([f, text]) => [f, sha256(text)])),
  };
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  return {files, field, materialsTotal: materials.total};
}

module.exports = {build, OUT, MATERIALS_TOTAL};

if (require.main === module) {
  const {files, materialsTotal} = build();
  const dest = path.join(root, OUT);
  fs.mkdirSync(dest, {recursive: true});
  for (const [file, text] of Object.entries(files)) fs.writeFileSync(path.join(dest, file), text);
  console.log(`Wrote ${Object.keys(files).length} files to ${OUT}; organizer materials total $${materialsTotal.toFixed(2)}`);
}
