#!/usr/bin/env node
'use strict';
// Shaft-down mule deck revision (v10): resolves the deck, hole pattern and caster risers from the
// vendor-CAD measurements (or from caliper measurements with --from-measurements), writes a fit
// report, a true-scale drill template and fresh log templates, and with --cad builds STEP/STL through
// CadQuery. Agent-prepared for the owner's hobby/learning project; nothing is ordered, printed or tested.
//
//   node tools/drivetrain-mule-v10.js --cad                 regenerate the nominal package (needs uv)
//   node tools/drivetrain-mule-v10.js --from-measurements measurements/mule/<date>/e02a.json --cad
//        writes a dated revision under derived/drivetrain-mule-v10/revisions/<date>/
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const root = path.resolve(__dirname, '..');
const CONFIG = 'drivetrain-mule-v10.json';
const ASSEMBLY = 'derived/robot-studio-v7/assembly.json';
const OUT = 'derived/drivetrain-mule-v10';
const V4_TEMPLATES = {
  'E02-characterization.csv': 'derived/drivetrain-mule-v4/E02-characterization.csv',
  'E03-trials.csv': 'derived/drivetrain-mule-v4/E03-trials.csv',
};
const CAD_FILES = ['cad/mule-deck-v10.step', 'cad/mule-deck-v10.stl', 'cad/caster-riser-v10.step', 'cad/caster-riser-v10.stl'];
const MEASURABLE = ['wheel_diameter_mm', 'wheel_width_mm', 'wheel_center_from_hub_flange_mm', 'gearbox_center_above_mount_face_mm', 'shaft_offset_mm', 'shaft_length_mm', 'bracket_hole_from_motor_face_mm', 'bracket_hole_pitch_mm', 'motor_body_length_mm', 'caster_height_mm', 'caster_spacer_mm'];

const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
const r3 = v => Math.round(v * 1000) / 1000 + 0;
const r2 = v => Math.round((v + 1e-9) * 100) / 100 + 0;

function resolve(config, measured = null) {
  const values = measured ? measured.values : {};
  for (const key of Object.keys(values)) {
    if (!MEASURABLE.includes(key)) throw new Error(`unknown measurement ${key}`);
    if (values[key] !== null && !(Number.isFinite(values[key]) && values[key] > 0)) throw new Error(`measurement ${key} must be a positive number or null`);
  }
  const n = {...config.nominal};
  for (const [key, value] of Object.entries(values)) if (value !== null) n[key] = value;
  const d = config.deck;
  const wheelRadius = n.wheel_diameter_mm / 2;
  const shaftAboveMount = n.gearbox_center_above_mount_face_mm - n.shaft_offset_mm; // shaft-down
  const deckTop = wheelRadius - shaftAboveMount;
  const deckBottom = deckTop - d.thickness_mm;
  const riserExact = deckBottom - n.caster_spacer_mm - n.caster_height_mm;
  const riser = r2(riserExact);
  const casterBallHeight = deckBottom - riser - n.caster_spacer_mm - n.caster_height_mm;
  const holeLateral = n.gearbox_face_lateral_mm + n.bracket_hole_from_motor_face_mm;
  const wheelCenter = n.gearbox_face_lateral_mm + n.shaft_length_mm + n.wheel_center_from_hub_flange_mm;
  const halfWidth = d.width_mm / 2;
  const ligament = halfWidth - (holeLateral + d.motor_hole_diameter_mm / 2);
  const wheelDeckClearance = wheelCenter - n.wheel_width_mm / 2 - halfWidth;
  const motorGap = 2 * (n.gearbox_face_lateral_mm - n.motor_body_length_mm);
  const g = config.gates;
  const motorHoles = [-1, 1].flatMap(side => [-1, 0, 1].map(k => ({x: r3(k * n.bracket_hole_pitch_mm), y: r3(side * holeLateral), diameter: d.motor_hole_diameter_mm})));
  const casterHoles = n.caster_positions_x_mm.flatMap(x => [-1, 1].map(side => ({x, y: r3(side * n.caster_hole_spacing_mm / 2), diameter: d.caster_hole_diameter_mm})));
  const checks = [
    {id: 'wheel-contact', value_mm: r3(deckTop + shaftAboveMount - wheelRadius), limit: 'axle at wheel radius', pass: Math.abs(deckTop + shaftAboveMount - wheelRadius) < 1e-9},
    {id: 'caster-contact', value_mm: r3(casterBallHeight), limit: `|value| <= ${g.caster_contact_tolerance_mm}`, pass: Math.abs(casterBallHeight) <= g.caster_contact_tolerance_mm},
    {id: 'riser-positive', value_mm: riser, limit: '> 0', pass: riser > 0},
    {id: 'motor-hole-ligament', value_mm: r3(ligament), limit: `>= ${g.minimum_motor_hole_edge_ligament_mm}`, pass: ligament >= g.minimum_motor_hole_edge_ligament_mm},
    {id: 'wheel-deck-lateral-clearance', value_mm: r3(wheelDeckClearance), limit: `>= ${g.minimum_wheel_deck_lateral_clearance_mm}`, pass: wheelDeckClearance >= g.minimum_wheel_deck_lateral_clearance_mm},
    {id: 'motor-body-gap', value_mm: r3(motorGap), limit: `>= ${g.minimum_motor_body_gap_mm} (project rule)`, pass: motorGap >= g.minimum_motor_body_gap_mm},
  ];
  return {
    layout: 'shaft-down',
    basis: measured ? `caliper measurements ${measured.date} by ${measured.measured_by}` : 'vendor-CAD nominal values (no parts measured)',
    inputs: n,
    deck: {length_mm: d.length_mm, width_mm: d.width_mm, thickness_mm: d.thickness_mm, corner_radius_mm: d.corner_radius_mm, top_above_floor_mm: r3(deckTop), bottom_above_floor_mm: r3(deckBottom)},
    stack: {wheel_radius_mm: wheelRadius, shaft_above_mount_face_mm: r3(shaftAboveMount), axle_height_mm: r3(deckTop + shaftAboveMount)},
    riser: {height_mm: riser, exact_mm: r3(riserExact), footprint_mm: config.riser.footprint_mm, hole_diameter_mm: config.riser.hole_diameter_mm, hole_spacing_mm: n.caster_hole_spacing_mm},
    holes: {motor: motorHoles, caster: casterHoles},
    lateral: {motor_hole_mm: r3(holeLateral), wheel_center_mm: r3(wheelCenter), track_mm: r3(2 * wheelCenter), overall_width_mm: r3(2 * (wheelCenter + n.wheel_width_mm / 2))},
    checks,
    all_checks_pass: checks.every(c => c.pass),
  };
}

function crossCheck(geometry, assembly) {
  const a = assembly.assembly;
  const shaftDown = a.configurations.find(c => c.id === 'shaft-down');
  const problems = [];
  if (Math.abs(geometry.lateral.motor_hole_mm - a.kit_nominal_mm.bracket_tapped_hole_lateral_from_cad) > 1e-6) problems.push('motor hole lateral differs from vendor CAD');
  if (Math.abs(geometry.lateral.track_mm - a.lateral_stack_mm.track) > 1e-6) problems.push('track differs from vendor CAD');
  if (Math.abs(geometry.deck.top_above_floor_mm - shaftDown.deck_top_mm) > 1e-6) problems.push('deck top differs from the vendor-CAD shaft-down layout');
  if (Math.abs(geometry.riser.height_mm - shaftDown.caster_riser_mm) > 0.01) problems.push('riser differs from the vendor-CAD shaft-down layout');
  return problems;
}

function drillSvg(geometry) {
  const L = geometry.deck.length_mm;
  const W = geometry.deck.width_mm;
  const X = x => r3(x + L / 2);
  const Y = y => r3(W / 2 - y);
  const m = 20;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${L + 2 * m}mm" height="${W + 2 * m + 40}mm" viewBox="${-m} ${-m - 40} ${L + 2 * m} ${W + 2 * m + 40}" font-family="sans-serif" font-size="3.2">`,
    `<text x="0" y="-48">Mule deck v10, shaft-down, ${L} x ${W} x ${geometry.deck.thickness_mm} mm. TRUE SCALE: print at 100%, no fit-to-page.</text>`,
    `<text x="0" y="-43">Proposal, not a fabrication release. Check the 100 mm bar with calipers, and measure parts (E02A) first.</text>`,
    '<g stroke="#000" stroke-width="0.3">',
    ...Array.from({length: 11}, (_, i) => `<line x1="${i * 10}" y1="-33" x2="${i * 10}" y2="${i % 5 === 0 ? -29 : -31}"/>`),
    '<line x1="0" y1="-33" x2="100" y2="-33"/>',
    '</g>',
    '<text x="0" y="-36">0</text><text x="96" y="-36">100 mm</text>',
    `<rect x="0" y="0" width="${L}" height="${W}" rx="${geometry.deck.corner_radius_mm}" fill="none" stroke="#000" stroke-width="0.35"/>`,
    `<line x1="${X(0)}" y1="-3" x2="${X(0)}" y2="${W + 3}" stroke="#888" stroke-width="0.2" stroke-dasharray="2 1.5"/>`,
    `<line x1="-3" y1="${Y(0)}" x2="${L + 3}" y2="${Y(0)}" stroke="#888" stroke-width="0.2" stroke-dasharray="2 1.5"/>`,
    `<text x="${X(0) + 1}" y="${W + 10}">axle line (x = 0)</text>`,
  ];
  for (const side of [-1, 1]) {
    const y0 = side * 74;
    const y1 = side * 80.5;
    parts.push(`<rect x="${X(-18.4)}" y="${Y(Math.max(y0, y1))}" width="36.8" height="6.5" fill="none" stroke="#2a6" stroke-width="0.25" stroke-dasharray="1.5 1"/>`);
  }
  const hole = (h, color) => [
    `<circle cx="${X(h.x)}" cy="${Y(h.y)}" r="${r3(h.diameter / 2)}" fill="none" stroke="${color}" stroke-width="0.25"/>`,
    `<line x1="${r3(X(h.x) - 2.5)}" y1="${Y(h.y)}" x2="${r3(X(h.x) + 2.5)}" y2="${Y(h.y)}" stroke="${color}" stroke-width="0.15"/>`,
    `<line x1="${X(h.x)}" y1="${r3(Y(h.y) - 2.5)}" x2="${X(h.x)}" y2="${r3(Y(h.y) + 2.5)}" stroke="${color}" stroke-width="0.15"/>`,
  ].join('');
  for (const h of geometry.holes.motor) parts.push(hole(h, '#c00'));
  for (const h of geometry.holes.caster) parts.push(hole(h, '#00c'));
  parts.push(`<text x="${X(-14.8) - 2}" y="-2.5" fill="#c00">3 x Ø${geometry.holes.motor[0].diameter} at x = -14.8 / 0 / +14.8, y = +${geometry.lateral.motor_hole_mm}</text>`);
  parts.push(`<text x="${X(-14.8) - 2}" y="${W + 5}" fill="#c00">3 x Ø${geometry.holes.motor[0].diameter} at y = -${geometry.lateral.motor_hole_mm} (bracket M3 clearance)</text>`);
  for (const x of [...new Set(geometry.holes.caster.map(h => h.x))]) {
    parts.push(`<text x="${X(x) + (x < 0 ? 3 : -3)}" y="${Y(0) - 10}" fill="#00c" text-anchor="${x < 0 ? 'start' : 'end'}">caster: 2 x Ø${geometry.holes.caster[0].diameter}, ${geometry.riser.hole_spacing_mm} mm apart, x = ${x}</text>`);
  }
  parts.push(`<text x="0" y="${W + 16}">Green dashed: bracket footprints (gearbox face at y = ±74 mm). Origin: deck center. +x toward the front caster.</text>`);
  parts.push('</svg>');
  return parts.join('\n') + '\n';
}

function e02aTemplate(geometry) {
  const n = geometry.inputs;
  const rows = [
    ['identity', 'all', 'SKUs and quantities match receipt', 'text'],
    ['wheel-diameter', 'A-WHEEL', `${n.wheel_diameter_mm} nominal`, 'mm'],
    ['wheel-width', 'A-WHEEL', `${n.wheel_width_mm} nominal`, 'mm'],
    ['shaft-length', 'A-MOTOR', `${n.shaft_length_mm} mm from the gearbox face (vendor CAD); v4 assumed 16`, 'mm'],
    ['shaft-diameter-flat', 'A-MOTOR', '6 mm D-shaft, 5.4 mm across the flat', 'mm'],
    ['shaft-offset', 'A-MOTOR', `${n.shaft_offset_mm} mm from the gearbox center (vendor CAD)`, 'mm'],
    ['gearbox-diameter', 'A-MOTOR', '36.8 nominal', 'mm'],
    ['motor-length', 'A-MOTOR', `${n.motor_body_length_mm} mm, gearbox face to encoder end`, 'mm'],
    ['bracket-height', 'A-BRACKET', `gearbox center ${n.gearbox_center_above_mount_face_mm} mm above the flat mounting face`, 'mm'],
    ['bracket-hole-pitch', 'A-BRACKET', `three M3 tapped holes at ${n.bracket_hole_pitch_mm} mm pitch`, 'mm'],
    ['bracket-hole-offset', 'A-BRACKET', `holes ${n.bracket_hole_from_motor_face_mm} mm from the motor-side face`, 'mm'],
    ['hub-stack', 'A-HUB', `wheel center ${n.wheel_center_from_hub_flange_mm} mm outboard of the hub flange face`, 'mm'],
    ['caster-height', 'A-CASTER', `${n.caster_height_mm} mm, mounting face to ball bottom`, 'mm'],
    ['caster-spacer', 'A-CASTER', `${n.caster_spacer_mm} mm selected spacer`, 'mm'],
    ['motor-engagement', 'A-MOTOR', 'no more than 3.5 mm into motor mounting holes', 'mm'],
    ['winding-resistance', 'A-MOTOR', 'record with an approved meter and temperature', 'ohm'],
    ['encoder-pinout', 'A-MOTOR', 'verify six-lead functions with approved equipment', 'text'],
  ];
  return 'check_id,part_id,requirement,instrument_id,repeat_1,repeat_2,repeat_3,unit,result,pass,notes\n'
    + rows.map(([id, part, req, unit]) => [id, part, `"${req}"`, '', '', '', '', unit, '', '', ''].join(',')).join('\n') + '\n';
}

function measurementTemplate() {
  return JSON.stringify({
    schema: 'mule-e02a-measurements/v1',
    date: null,
    measured_by: null,
    instruments: null,
    note: 'Copy to measurements/mule/<date>/e02a.json. Enter the mean of three caliper readings in mm, or leave null to keep the vendor-CAD value. Then run: node tools/drivetrain-mule-v10.js --from-measurements <file> --cad',
    values: Object.fromEntries(MEASURABLE.map(k => [k, null])),
  }, null, 2) + '\n';
}

function receivedTemplate() {
  return 'part_id,sku,quantity_expected,serial_or_lot,measured_dimensions,mass_g,inspection_status,notes\n'
    + [['A-MOTOR', '4754', '2'], ['A-BRACKET', '1995', '2'], ['A-HUB', '1083', '1 2-pack'], ['A-WHEEL', '1430', '1 pair'], ['A-CASTER', '953', '2'], ['A-WHEEL-SCREWS', '1962', '1 25-pack']]
      .map(r => [...r, '', '', '', '', ''].join(',')).join('\n') + '\n';
}

function fitReviewTemplate(geometry) {
  const rows = geometry.checks.map(c => [c.id, `"${c.limit}"`, c.value_mm, '', '', '']);
  rows.push(['screw-length-motor', '"M3 through the 5 mm deck into the bracket; at least 3 threads engaged, no contact with the gearbox"', '', '', '', '']);
  rows.push(['screw-length-caster', `"#2 screw through deck 5 + riser ${geometry.riser.height_mm} + spacer ${geometry.inputs.caster_spacer_mm} + caster flange + nut"`, '', '', '', '']);
  rows.push(['free-rotation', '"no binding; no wheel, hub or bracket contact with the deck"', '', '', '', '']);
  rows.push(['four-point-contact', '"all four contacts loaded on a flat surface; note any rocking"', '', '', '', '']);
  return 'check_id,requirement,nominal_mm,measured_mm,pass,notes\n' + rows.map(r => r.join(',')).join('\n') + '\n';
}

function fitReport(geometry) {
  const c = geometry.checks;
  return [
    '# Mule v10 fit report (shaft-down)',
    '',
    `Basis: ${geometry.basis}. **This is arithmetic on CAD values, not a fit check of real parts.**`,
    '',
    '## Stack-up (heights above the floor, mm)',
    '',
    '| Item | Value |',
    '|---|---:|',
    `| Wheel radius = axle height | ${geometry.stack.wheel_radius_mm} |`,
    `| Shaft above the bracket mounting face (gearbox center ${geometry.inputs.gearbox_center_above_mount_face_mm} − offset ${geometry.inputs.shaft_offset_mm}) | ${geometry.stack.shaft_above_mount_face_mm} |`,
    `| Deck top (bracket sits on it) | ${geometry.deck.top_above_floor_mm} |`,
    `| Deck bottom | ${geometry.deck.bottom_above_floor_mm} |`,
    `| Caster riser (printed), exact ${geometry.riser.exact_mm} | ${geometry.riser.height_mm} |`,
    `| Caster spacer + caster body | ${geometry.inputs.caster_spacer_mm} + ${geometry.inputs.caster_height_mm} |`,
    `| Caster ball bottom (0 = touching) | ${c.find(x => x.id === 'caster-contact').value_mm} |`,
    '',
    '## Lateral (mm from the centerline)',
    '',
    `Motor holes ±${geometry.lateral.motor_hole_mm}; wheel center ±${geometry.lateral.wheel_center_mm}; track ${geometry.lateral.track_mm}; overall width ${geometry.lateral.overall_width_mm}.`,
    '',
    '## Checks',
    '',
    '| Check | Value (mm) | Limit | Result |',
    '|---|---:|---|---|',
    ...c.map(x => `| ${x.id} | ${x.value_mm} | ${x.limit} | ${x.pass ? 'pass' : '**flag**'} |`),
    '',
    `The motor-body gap is ${c.find(x => x.id === 'motor-body-gap').value_mm} mm against the project's own 8 mm rule. The two encoder ends do not touch. Either accept the margin, or move both brackets outward by 0.1 mm, which widens the track to 202.2 mm. That is the mechanical lead's call.`,
    '',
    '## Before printing',
    '',
    '1. Inspect the received parts with calipers (E02A).',
    '2. Copy `templates/e02a-measurements.json` to `measurements/mule/<date>/e02a.json`, fill it in, and run `node tools/drivetrain-mule-v10.js --from-measurements <file> --cad`. This writes a dated revision with a recomputed riser height and holes.',
    '3. Print the drill template at 100% and check the 100 mm bar with calipers.',
    '4. Print one riser and check its height. Typical FDM tolerance (±0.1–0.2 mm) is larger than the computed contact error. Shim with the 1/16 in spacer option if needed.',
    '5. Review screw lengths and engagement (`templates/fit-review.csv`) before assembly.',
    '',
  ].join('\n');
}

function readme(geometry) {
  return [
    '# Drivetrain mule v10: shaft-down deck',
    '',
    '2026-11-03 · agent-prepared for the owner\'s hobby/learning project.',
    '',
    '**Nothing here is ordered, printed or tested.** This replaces the v4 kit\'s deck geometry without changing the sealed v4 package. Pololu\'s CAD shows the v4 kit as drawn would leave the wheels 7.09 mm off the floor.',
    '',
    '## The layout',
    '',
    `- The motor's output shaft is ${geometry.inputs.shaft_offset_mm} mm off the gearbox center. With the shaft pointing **down** in the #1995 bracket, the axle sits ${geometry.stack.shaft_above_mount_face_mm} mm above the bracket's mounting face.`,
    `- The bracket sits on top of the deck, so the deck top is ${geometry.deck.top_above_floor_mm} mm above the floor for 80 mm wheels.`,
    `- Printed risers of ${geometry.riser.height_mm} mm under the casters bring the caster balls to the floor.`,
    `- The deck is ${geometry.deck.length_mm} x ${geometry.deck.width_mm} x ${geometry.deck.thickness_mm} mm, 12 mm wider than v4. That keeps a ${geometry.checks.find(c => c.id === 'motor-hole-ligament').value_mm} mm ligament outside the motor holes at ±${geometry.lateral.motor_hole_mm} mm (v4 had them at ±74).`,
    `- The track is ${geometry.lateral.track_mm} mm, not 176.`,
    '',
    'The owner delegated the layout choice. Shaft-down was chosen because:',
    '- the casters touch exactly in CAD, where shaft-up leaves 1.08 mm of rocking;',
    '- risers are cheap to reprint after measurement;',
    '- the mule is a test rig, not the competition chassis.',
    '',
    '## Files',
    '',
    '| File | Contents |',
    '|---|---|',
    '| `geometry.json` | Resolved geometry, holes and checks |',
    '| `fit-report.md` | Stack-up and checks, including one flagged project rule: motor gap 7.8 mm vs 8 mm |',
    '| `deck-drill-template.svg` | True-scale drill template with a 100 mm check bar |',
    '| `cad/` | STEP and STL for the deck and one caster riser, built with CadQuery 2.8.0 (STEP header timestamps normalized) |',
    '| `templates/` | Received parts, E02A inspection (corrected nominals), E02A measurement JSON, fit review; E02 and E03 logs copied unchanged from v4 |',
    '',
    'Fill in copies under `measurements/mule/<date>/`, never these templates. Analyze bench logs with `node tools/mule-measurements-v10.js --kind E02|E03 --input FILE --output NEW_FILE [--progress]`.',
    '',
    '## Regenerate',
    '',
    '```sh',
    'node tools/drivetrain-mule-v10.js --cad        # nominal package; --cad needs uv and CadQuery 2.8.0',
    'node tools/verify-drivetrain-mule-v10.js       # checks text outputs, STL geometry and hashes; no CadQuery needed',
    '```',
    '',
  ].join('\n');
}

function textOutputs(config, assembly, measured = null) {
  const geometry = resolve(config, measured);
  const problems = measured ? [] : crossCheck(geometry, assembly);
  if (problems.length) throw new Error(problems.join('; '));
  const files = {
    'geometry.json': JSON.stringify(geometry, null, 2) + '\n',
    'fit-report.md': fitReport(geometry),
    'deck-drill-template.svg': drillSvg(geometry),
    'templates/received-parts.csv': receivedTemplate(),
    'templates/E02A-inspection.csv': e02aTemplate(geometry),
    'templates/e02a-measurements.json': measurementTemplate(),
    'templates/fit-review.csv': fitReviewTemplate(geometry),
  };
  if (!measured) {
    for (const [name, source] of Object.entries(V4_TEMPLATES)) files[`templates/${name}`] = read(source);
    files['README.md'] = readme(geometry);
  }
  return {geometry, files};
}

function runCad(outDir) {
  const script = path.join(root, 'tools', 'mule-deck-v10-cad.py');
  const result = spawnSync('uv', ['run', '--no-project', '--python', '3.12', '--with', 'cadquery==2.8.0', 'python', '-B', '-I', script, path.join(outDir, 'geometry.json'), path.join(outDir, 'cad')], {cwd: root, encoding: 'utf8'});
  if (result.status !== 0) throw new Error(`CadQuery step failed:\n${result.stdout}\n${result.stderr}`);
}

function manifestFor(dir, files, inputs) {
  const all = {...Object.fromEntries(Object.entries(files).map(([f, text]) => [f, sha256(text)]))};
  for (const f of CAD_FILES) {
    const p = path.join(dir, f);
    if (fs.existsSync(p)) all[f] = sha256(fs.readFileSync(p));
  }
  return JSON.stringify({
    date: '2026-11-03',
    status: 'agent-prepared mule revision; not ordered, printed or tested',
    input_hashes: Object.fromEntries(inputs.map(f => [f, sha256(fs.readFileSync(path.join(root, f)))])),
    output_hashes: all,
  }, null, 2) + '\n';
}

const INPUTS = [CONFIG, ASSEMBLY, 'tools/drivetrain-mule-v10.js', 'tools/mule-deck-v10-cad.py', ...Object.values(V4_TEMPLATES)];

module.exports = {resolve, crossCheck, textOutputs, manifestFor, INPUTS, CAD_FILES, OUT, CONFIG, ASSEMBLY, MEASURABLE};

if (require.main === module) {
  const args = process.argv.slice(2);
  const config = JSON.parse(read(CONFIG));
  const assembly = JSON.parse(read(ASSEMBLY));
  const mIndex = args.indexOf('--from-measurements');
  let measured = null;
  let dir = path.join(root, OUT);
  if (mIndex >= 0) {
    const file = args[mIndex + 1];
    measured = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (measured.schema !== 'mule-e02a-measurements/v1' || !/^\d{4}-\d{2}-\d{2}$/.test(measured.date || '') || !measured.measured_by) throw new Error('measurement file needs schema mule-e02a-measurements/v1, a YYYY-MM-DD date and measured_by');
    dir = path.join(root, OUT, 'revisions', measured.date);
    if (fs.existsSync(dir)) throw new Error(`${path.relative(root, dir)} already exists; revisions are never overwritten`);
  }
  const {geometry, files} = textOutputs(config, assembly, measured);
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), {recursive: true});
    fs.writeFileSync(path.join(dir, file), text);
  }
  if (args.includes('--cad')) runCad(dir);
  const inputs = measured ? INPUTS.filter(f => !f.startsWith('derived/drivetrain-mule-v4')) : INPUTS;
  fs.writeFileSync(path.join(dir, 'manifest.json'), manifestFor(dir, files, inputs));
  console.log(JSON.stringify({wrote: path.relative(root, dir), deck_top_mm: geometry.deck.top_above_floor_mm, riser_mm: geometry.riser.height_mm, track_mm: geometry.lateral.track_mm, flagged: geometry.checks.filter(c => !c.pass).map(c => c.id)}, null, 2));
}
