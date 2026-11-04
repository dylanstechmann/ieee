#!/usr/bin/env node
'use strict';
// Builds derived/competition-mockup-v10: true-scale square and round 10 in base plates that reuse the
// mule's motors, brackets and wheels, a side-view envelope inside the 12 in starting cube, a sizing-box
// cut list for inspection rehearsal, and a swept-turn test procedure. Agent-prepared for the owner's
// hobby/learning project. This is a mockup for fit and turning tests, not competition CAD.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const OUT = 'derived/competition-mockup-v10';
const MULE = 'derived/drivetrain-mule-v10/geometry.json';
const DATE = '2026-11-03';
const IN = 25.4;
const BASE = 10 * IN;        // 254 mm: GM1 R01 minimum, 10 x 10 in for the bottom 3 in
const CUBE = 12 * IN;        // 304.8 mm starting cube
const MIN_BAND = 3 * IN;     // 76.2 mm
const WHEEL_CLEAR = 3;       // mm around each wheel in the plate slot
const CASTER_X = 100;        // mm from center, front and rear
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
const r3 = v => Math.round(v * 1000) / 1000 + 0;

function geometry() {
  const mule = JSON.parse(fs.readFileSync(path.join(root, MULE), 'utf8'));
  const wheelR = mule.stack.wheel_radius_mm;
  const wheelW = mule.inputs.wheel_width_mm;
  const wheelY = mule.lateral.wheel_center_mm;
  const slot = {x0: -wheelR - WHEEL_CLEAR, x1: wheelR + WHEEL_CLEAR, y0: wheelY - wheelW / 2 - WHEEL_CLEAR, y1: wheelY + wheelW / 2 + WHEEL_CLEAR};
  const half = BASE / 2;
  const checks = {
    overall_width_mm: mule.lateral.overall_width_mm,
    wheels_inside_square_base: slot.y1 <= half,
    wheel_slot_outer_ligament_square_mm: r3(half - slot.y1),
    wheels_inside_round_base: Math.hypot(slot.x1, slot.y1) <= half,
    wheel_slot_corner_radius_mm: r3(Math.hypot(slot.x1, slot.y1)),
    plate_height_band_mm: [mule.deck.bottom_above_floor_mm, mule.deck.top_above_floor_mm],
    plate_inside_min_size_band: mule.deck.top_above_floor_mm <= MIN_BAND,
  };
  return {mule, wheelR, wheelW, wheelY, slot, checks,
          motorHoles: mule.holes.motor, casterX: CASTER_X, casterHoleSpacing: mule.riser.hole_spacing_mm,
          casterHoleD: mule.holes.caster[0].diameter, riserMm: mule.riser.height_mm};
}

function plateSvg(g, shape) {
  const m = 20;
  const S = BASE;
  const X = x => r3(x + S / 2);
  const Y = y => r3(S / 2 - y);
  const outline = shape === 'square'
    ? `<rect x="0" y="0" width="${S}" height="${S}" fill="none" stroke="#000" stroke-width="0.4"/>`
    : `<circle cx="${S / 2}" cy="${S / 2}" r="${S / 2}" fill="none" stroke="#000" stroke-width="0.4"/>`;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${S + 2 * m}mm" height="${S + 2 * m + 30}mm" viewBox="${-m} ${-m - 30} ${S + 2 * m} ${S + 2 * m + 30}" font-family="sans-serif" font-size="3.4">`,
    `<text x="0" y="-38">Competition mockup base, ${shape}, 254 mm (10 in). TRUE SCALE: print at 100% (tile if needed); check the 100 mm bar.</text>`,
    '<text x="0" y="-33">Mockup for fit and turning tests, not competition CAD. A round base meeting R01 is open question QA01.</text>',
    '<line x1="0" y1="-25" x2="100" y2="-25" stroke="#000" stroke-width="0.4"/><text x="102" y="-24">100 mm</text>',
    outline,
  ];
  for (const side of [-1, 1]) {
    const y0 = side > 0 ? g.slot.y0 : -g.slot.y1;
    const y1 = side > 0 ? g.slot.y1 : -g.slot.y0;
    parts.push(`<rect x="${X(g.slot.x0)}" y="${Y(y1)}" width="${r3(g.slot.x1 - g.slot.x0)}" height="${r3(y1 - y0)}" fill="none" stroke="#c60" stroke-width="0.35"/>`);
  }
  parts.push(`<text x="${X(g.slot.x0)}" y="${Y(g.slot.y1) - 2}" fill="#c60">wheel slot ${r3(g.slot.x1 - g.slot.x0)} x ${r3(g.slot.y1 - g.slot.y0)} mm (80 mm wheel + ${WHEEL_CLEAR} mm clearance)</text>`);
  for (const h of g.motorHoles) parts.push(`<circle cx="${X(h.x)}" cy="${Y(h.y)}" r="${h.diameter / 2}" fill="none" stroke="#c00" stroke-width="0.3"/>`);
  parts.push(`<text x="${X(-14.8)}" y="${Y(g.motorHoles[3].y) + 6}" fill="#c00">bracket holes as mule v10 (±${g.motorHoles[3].y} mm)</text>`);
  for (const x of [-g.casterX, g.casterX]) for (const s of [-1, 1]) parts.push(`<circle cx="${X(x)}" cy="${Y(s * g.casterHoleSpacing / 2)}" r="${g.casterHoleD / 2}" fill="none" stroke="#00c" stroke-width="0.3"/>`);
  parts.push(`<text x="${X(-g.casterX) + 3}" y="${Y(0) - 10}" fill="#00c">caster ±${g.casterX} mm, riser ${g.riserMm} mm as mule</text>`);
  parts.push(`<line x1="${X(0)}" y1="-4" x2="${X(0)}" y2="${S + 4}" stroke="#888" stroke-width="0.2" stroke-dasharray="2 1.5"/>`);
  parts.push(`<text x="0" y="${S + 8}">Axle line at x = 0; +x toward the front (mechanism side). Origin at the plate center.</text>`);
  parts.push('</svg>');
  return parts.join('\n') + '\n';
}

function sideSvg(g) {
  // Side view at 1:2 for orientation (not true scale): x forward, z up, in mm.
  const s = 0.5;
  const W = CUBE;
  const P = v => r3(v * s);
  const Z = z => r3((CUBE - z) * s);
  const box = (x0, z0, x1, z1, attrs) => `<rect x="${P(x0 + W / 2)}" y="${Z(z1)}" width="${P(x1 - x0)}" height="${P(z1 - z0)}" ${attrs}/>`;
  const zones = [
    ['battery bay (placeholder 140 x 50 mm side)', -70, 30, 70, 80, '#7a7'],
    ['tire mechanism envelope (front 120 mm)', 7, 0, 152, 150, '#c80'],
    ['electronics (Pico 2, driver, regulator)', -110, 80, 40, 130, '#77c'],
    ['camera mast to 300 mm (only if vision is needed)', -20, 130, 10, 300, '#999'],
    ['school flag + servo (raised after the start)', -140, 230, -110, 300, '#c55'],
    ['visible e-stop on top', 30, 140, 70, 175, '#d00'],
  ];
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -40 ${P(W) + 260} ${P(CUBE) + 90}" width="${P(W) + 280}mm" height="${P(CUBE) + 100}mm" font-family="sans-serif" font-size="4">`,
    '<text x="0" y="-26">Side view, 1:2 (not true scale). Grey square: the 12 in (304.8 mm) starting cube. Green band: the 3 in where the body must be at least 10 x 10 in.</text>',
    '<text x="0" y="-18">Zones are space allowances for the concept review, not selected parts.</text>',
    box(-W / 2, 0, W / 2, CUBE, 'fill="none" stroke="#666" stroke-width="0.6"'),
    box(-W / 2, 0, W / 2, MIN_BAND, 'fill="#dfd" stroke="none"'),
    box(-BASE / 2, g.mule.deck.bottom_above_floor_mm, BASE / 2, g.mule.deck.top_above_floor_mm, 'fill="#333"'),
    `<circle cx="${P(W / 2)}" cy="${Z(g.wheelR)}" r="${P(g.wheelR)}" fill="none" stroke="#000" stroke-width="0.6"/>`,
  ];
  zones.forEach(([label, x0, z0, x1, z1, color], i) => {
    parts.push(box(x0, z0, x1, z1, `fill="none" stroke="${color}" stroke-width="0.6" stroke-dasharray="3 2"`));
    parts.push(`<text x="${P(W) + 12}" y="${10 + i * 10}" fill="${color}">${label}</text>`);
  });
  parts.push(`<text x="0" y="${P(CUBE) + 14}">Base plate at ${g.mule.deck.bottom_above_floor_mm}–${g.mule.deck.top_above_floor_mm} mm (inside the 76.2 mm band). Wheel: 80 mm. Robot ID label on a side face, readable from 6 ft (R10).</text>`);
  parts.push('</svg>');
  return parts.join('\n') + '\n';
}

function sizingBox() {
  const t = 6;
  return [
    ['part', 'quantity', 'length_mm', 'width_mm', 'note'],
    ['side wall', 2, r3(CUBE), r3(CUBE), `${t} mm sheet; inside dimension 304.8 mm`],
    ['end wall', 2, r3(CUBE + 2 * t), r3(CUBE), 'overlaps the side walls'],
    ['top (optional)', 1, r3(CUBE + 2 * t), r3(CUBE + 2 * t), 'leave off to lower the box over the robot'],
    ['minimum-size template', 1, r3(BASE), r3(BASE), 'the lower 3 in of the body must cover this square (or the round reading, if QA01 allows)'],
  ].map(r => r.join(',')).join('\n') + '\n';
}

function procedure(g) {
  return [
    '# Swept-turn and lane-change tests with the mockup',
    '',
    'Run these on the practice field (`derived/practice-field-v10/`). Mount the base plate on the mule, or push it by hand on its casters and wheels, and record every attempt, including failures.',
    '',
    '1. **Starting cube.** Lower the sizing box over the mockup with all mechanisms in their starting position. Note any contact. Also check that the lower 3 in cover the 10 x 10 in template.',
    '2. **U-turns.** Drive around each end of the center divider on an arc of about 7.5 in radius (the CAD hand check allows 6.0–9.3 in). Measure the closest approach to the end wall and the pit divider. Repeat with the divider shifted 1 in (variation drills D3 and D4).',
    '3. **Spinning in place.** Spin in the middle of each corridor. A square base sweeps a 14.1 in circle; note the clearance to the wall and the divider.',
    '4. **Lane change.** Tape two 8.55 x 8.2 in vehicle footprints on opposite sides of a corridor, or use the official vehicles once measured. Vary the free length between them in 0.5 in steps and record the shortest length that passes without contact. Compare with the atlas (about 11.0 in square, 10.5 in round, vehicles straight).',
    '5. **Contact behavior.** With the vehicles placed where the atlas finds no gap, record what a gentle push does: does the vehicle move or tip, and does it disturb the field? This informs the contact policy.',
    '',
    `Reference geometry: the plate sits ${g.mule.deck.bottom_above_floor_mm}–${g.mule.deck.top_above_floor_mm} mm above the floor; the overall wheel width is ${g.checks.overall_width_mm} mm inside the 254 mm base.`,
    '',
  ].join('\n');
}

function readme(g) {
  const c = g.checks;
  return [
    '# Competition-size mockup (v10)',
    '',
    `${DATE} · agent-prepared for the owner's hobby/learning project. **A mockup for fit, sizing and turning tests, not competition CAD.** It reuses the shaft-down mule's motors, brackets, wheels and caster risers (\`derived/drivetrain-mule-v10/\`).`,
    '',
    '| File | Use |',
    '|---|---|',
    '| `base-square-1to1.svg`, `base-round-1to1.svg` | True-scale 254 mm base plates with wheel slots, the mule bracket holes and caster holes. Laser-cut or print in tiles. |',
    '| `side-envelope.svg` | 1:2 side view: the 12 in cube, the 3 in minimum-size band, and allowances for the battery, mechanism, electronics, camera mast, flag and e-stop |',
    '| `sizing-box-cut-list.csv` | A 12 in inside-dimension box and a 10 in template for inspection rehearsal (GM1 Appendix A) |',
    '| `swept-turn-procedure.md` | Turning, spinning, lane-change and contact tests on the practice field |',
    '',
    '## Checks (arithmetic on mule-v10 geometry)',
    '',
    `- **Overall wheel width:** ${c.overall_width_mm} mm, inside the 254 mm base. Wheel slots leave a ${c.wheel_slot_outer_ligament_square_mm} mm outer ligament on the square plate.`,
    `- **Round plate:** the slot corners reach ${c.wheel_slot_corner_radius_mm} mm from center against the 127 mm radius, so the slots ${c.wheels_inside_round_base ? 'fit inside' : 'break through the edge'}.`,
    `- **Plate height:** ${c.plate_height_band_mm.join('–')} mm above the floor, inside the 76.2 mm band where R01 requires at least 10 x 10 in.`,
    '',
    'Open questions:',
    '- the round reading of R01 (QA01);',
    '- whether the body may contract (QA01);',
    '- the mechanism package, which waits for the E04 tire tests.',
    '',
  ].join('\n');
}

function build() {
  const g = geometry();
  const files = {
    'base-square-1to1.svg': plateSvg(g, 'square'),
    'base-round-1to1.svg': plateSvg(g, 'round'),
    'side-envelope.svg': sideSvg(g),
    'sizing-box-cut-list.csv': sizingBox(),
    'swept-turn-procedure.md': procedure(g),
    'README.md': readme(g),
  };
  const inputs = ['tools/competition-mockup-v10.js', MULE];
  files['manifest.json'] = JSON.stringify({
    date: DATE, status: 'agent-prepared mockup drawings; not competition CAD, not fabricated',
    checks: g.checks,
    input_hashes: Object.fromEntries(inputs.map(f => [f, sha256(fs.readFileSync(path.join(root, f)))])),
    output_hashes: Object.fromEntries(Object.entries(files).map(([f, t]) => [f, sha256(t)])),
  }, null, 2) + '\n';
  return {files, g};
}

module.exports = {build, OUT, BASE};

if (require.main === module) {
  const {files, g} = build();
  fs.mkdirSync(path.join(root, OUT), {recursive: true});
  for (const [f, t] of Object.entries(files)) fs.writeFileSync(path.join(root, OUT, f), t);
  console.log(JSON.stringify({wrote: OUT, checks: g.checks}, null, 2));
}
