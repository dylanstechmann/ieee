#!/usr/bin/env node
'use strict';
// Builds derived/tire-fixture-v10: a repeatable E04 tire-handling test kit. It contains a 1:1 pit-box
// corner with tire targets, a pose jig, round-1 DOE run sheets (L9 x 5 repeats + 5 nominal = 50 per
// concept), a round-2 template and print notes for organizer-STL tire replicas. Agent-prepared for the
// owner's hobby/learning project; no mechanism is selected or tested.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const OUT = 'derived/tire-fixture-v10';
const DATE = '2026-11-03';
const TIRE_STL = 'derived/organizer-cad/Spare Tire v2.stl';
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
const CONCEPTS = ['passive_fork', 'guided_bore', 'od_gripper'];
const LEVELS = {lateral_offset_mm: [-12.7, 0, 12.7], longitudinal_offset_mm: [-12.7, 0, 12.7], approach_yaw_deg: [-10, 0, 10]};
// Taguchi L9(3^3): each pair of factor levels appears exactly once.
const L9 = [[0, 0, 0], [0, 1, 1], [0, 2, 2], [1, 0, 1], [1, 1, 2], [1, 2, 0], [2, 0, 2], [2, 1, 0], [2, 2, 1]];
const REPEATS = 5;
const NOMINAL_EXTRA = 5;
const TIRE = {od_mm: 68.18, thickness_mm: 27.6, bore_mm: 40.3};
const BOX_MM = 304.8;

const RESULT_COLUMNS = ['acquired', 'retained_after_shake', 'released_in_box', 'bailout_clean', 'cycle_time_s', 'tire_id', 'tire_mass_g', 'operator_id', 'recorded_at', 'notes'];

function round1() {
  const header = ['run_id', 'concept', 'cell', ...Object.keys(LEVELS), 'repeat', ...RESULT_COLUMNS];
  const rows = [header];
  for (const concept of CONCEPTS) {
    let n = 0;
    L9.forEach((levels, cell) => {
      for (let r = 1; r <= REPEATS; r++) {
        n++;
        rows.push([`${concept}-${String(n).padStart(2, '0')}`, concept, `L9-${cell + 1}`, ...Object.values(LEVELS).map((v, i) => v[levels[i]]), r, ...RESULT_COLUMNS.map(() => '')]);
      }
    });
    for (let r = 1; r <= NOMINAL_EXTRA; r++) {
      n++;
      rows.push([`${concept}-${String(n).padStart(2, '0')}`, concept, 'nominal', 0, 0, 0, REPEATS + r, ...RESULT_COLUMNS.map(() => '')]);
    }
  }
  return rows.map(r => r.join(',')).join('\n') + '\n';
}

function round2Template() {
  const header = ['run_id', 'concept', 'cell', ...Object.keys(LEVELS), 'repeat', ...RESULT_COLUMNS];
  const rows = [header];
  for (let n = 1; n <= 50; n++) rows.push([`final-${String(n).padStart(2, '0')}`, '', '', '', '', '', n, ...RESULT_COLUMNS.map(() => '')]);
  return rows.map(r => r.join(',')).join('\n') + '\n';
}

function cornerSvg() {
  // 1:1 in mm: the corner of a 12 in pit box with the nominal tire target and the 3 x 3 offset grid.
  const W = 220;
  const H = 220;
  const cx = 110;
  const cy = 110;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W + 20}mm" height="${H + 70}mm" viewBox="-10 -40 ${W + 20} ${H + 70}" font-family="sans-serif" font-size="3.2">`,
    '<text x="0" y="-30">Pit-box tire target, TRUE SCALE (print at 100%). Check the 100 mm bar with calipers.</text>',
    '<text x="0" y="-25">Grey: tire outline at the nominal center. Crosses: the 3 x 3 offset grid (±12.7 mm). Agent-prepared; not an organizer drawing.</text>',
    '<line x1="0" y1="-15" x2="100" y2="-15" stroke="#000" stroke-width="0.4"/><text x="102" y="-14">100 mm</text>',
    `<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="#888" stroke-width="0.3" stroke-dasharray="3 2"/>`,
    `<text x="2" y="${H + 6}">Dashed: 220 mm square inside the ${BOX_MM} mm (12 in) pit box; align it to the box corner nearest the robot's approach.</text>`,
    `<circle cx="${cx}" cy="${cy}" r="${TIRE.od_mm / 2}" fill="#ddd" stroke="#555" stroke-width="0.4"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${TIRE.bore_mm / 2}" fill="#fff" stroke="#555" stroke-width="0.4"/>`,
  ];
  for (const dx of LEVELS.lateral_offset_mm) for (const dy of LEVELS.longitudinal_offset_mm) {
    const x = cx + dx;
    const y = cy - dy;
    parts.push(`<line x1="${x - 3}" y1="${y}" x2="${x + 3}" y2="${y}" stroke="#c00" stroke-width="0.3"/><line x1="${x}" y1="${y - 3}" x2="${x}" y2="${y + 3}" stroke="#c00" stroke-width="0.3"/>`);
  }
  for (const yaw of LEVELS.approach_yaw_deg) {
    const a = (90 + yaw) * Math.PI / 180;
    const x2 = cx + Math.cos(a) * 100;
    const y2 = cy + Math.sin(a) * 100;
    parts.push(`<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="#06c" stroke-width="0.3" stroke-dasharray="2 1"/>`);
    parts.push(`<text x="${(x2 + 1).toFixed(2)}" y="${(y2 - 1).toFixed(2)}" fill="#06c">${yaw}°</text>`);
  }
  parts.push(`<text x="2" y="${H + 12}">Blue: robot approach lines at -10, 0 and +10 degrees. The tire lies flat (bore vertical), as assumed until the field confirms it.</text>`);
  parts.push('</svg>');
  return parts.join('\n') + '\n';
}

function stlInfo() {
  const buf = fs.readFileSync(path.join(root, TIRE_STL));
  const ascii = buf.subarray(0, 5).toString() === 'solid' && buf.length !== 84 + 50 * buf.readUInt32LE(80);
  return {file: TIRE_STL, sha256: sha256(buf), format: ascii ? 'ascii' : 'binary', triangles: ascii ? null : buf.readUInt32LE(80)};
}

function printNotes(info) {
  return [
    '# Tire replica print notes',
    '',
    `Source mesh: \`${info.file}\` (organizer STL, millimetres, sha256 ${info.sha256.slice(0, 16)}…, ${info.triangles} triangles). Official tires are TPU (GM2 Appendix D).`,
    '',
    '1. Print at least four TPU replicas (2 red, 2 blue if filament allows) and two PLA replicas as a rigid control.',
    '2. Record for every replica:',
    '   - an ID;',
    '   - the material, infill and wall count;',
    '   - its mass, weighed on a scale with a known check weight. The official tire mass is unmeasured; solid TPU by mesh volume would be about 77–79 g.',
    '   - OD, thickness and bore, measured with calipers, three times each.',
    `3. Compare the measurements with the nominal ${TIRE.od_mm} / ${TIRE.thickness_mm} / ${TIRE.bore_mm} mm. Note that the organizer CAD profile shows 27.10 mm thick, the STL 27.60 mm.`,
    '4. Use the same replica IDs in the DOE sheets (`tire_id`). A replica that is clearly off-size is retired, and the reason recorded, rather than silently swapped.',
    '',
  ].join('\n');
}

function readme(info) {
  const perConcept = L9.length * REPEATS + NOMINAL_EXTRA;
  return [
    '# Tire-handling test kit (E04), v10',
    '',
    `${DATE} · agent-prepared for the owner's hobby/learning project. No mechanism is selected, built or tested.`,
    '',
    '| File | Use |',
    '|---|---|',
    '| `pit-box-corner-1to1.svg` | True-scale tire target: nominal center, ±12.7 mm offset grid, ±10° approach lines. Print it and tape it into a practice pit box. |',
    `| \`doe-round1.csv\` | Round 1 run sheet: ${CONCEPTS.length} concepts x (L9 array x ${REPEATS} repeats + ${NOMINAL_EXTRA} nominal) = ${perConcept} runs each, ${perConcept * CONCEPTS.length} in all. This fixes the 45-versus-50 gap in the v3 E04 matrix. |`,
    '| `doe-round2-template.csv` | 50 confirmation runs for the finalist, at the worst cells found in round 1 |',
    '| `print-notes.md` | Making and measuring tire replicas from the organizer STL |',
    '',
    'The L9 array varies lateral offset, longitudinal offset and approach yaw at three levels each. Every pair of levels appears once, so main effects can be estimated from 9 cells instead of 27.',
    '',
    '## How to run a session',
    '',
    '1. Copy the sheet to `measurements/tire/<date>/`. These templates stay blank.',
    '2. Randomize the run order: shuffle the rows, and record the seed or method in `notes`.',
    '3. For each run, place the tire on the marked cross and approach along the marked line. Record:',
    '   - `acquired` (true or false);',
    '   - `retained_after_shake`: one lap-profile shake, meaning the same acceleration, spin and stop sequence each time;',
    '   - `released_in_box`;',
    '   - `bailout_clean`: after a failed pickup, the mechanism reset without jamming;',
    '   - `cycle_time_s`.',
    '4. Log failures as data, never as reruns. A rerun gets a new row with a note.',
    '5. Analyze with `python -I tools/analyze_e04_v10.py <filled sheet>`. It reports success rates with Wilson 95% intervals, per-cell rates, main effects and the E04 acceptance check.',
    '',
    '## E04 acceptance (from `derived/hardware-development-v3/experiment-plan.md`)',
    '',
    'At least 48/50 pickups, at least 4/5 in every alignment cell, 20/20 retention and 20/20 release.',
    '',
    'Passing E04 on a fixture is evidence for that fixture and those replicas only. It is not proof on the competition field.',
    '',
  ].join('\n');
}

function build() {
  const info = stlInfo();
  const files = {
    'pit-box-corner-1to1.svg': cornerSvg(),
    'doe-round1.csv': round1(),
    'doe-round2-template.csv': round2Template(),
    'print-notes.md': printNotes(info),
    'README.md': readme(info),
  };
  const inputs = ['tools/tire-fixture-v10.js', TIRE_STL];
  files['manifest.json'] = JSON.stringify({
    date: DATE, status: 'agent-prepared test kit; no mechanism tested',
    input_hashes: Object.fromEntries(inputs.map(f => [f, sha256(fs.readFileSync(path.join(root, f)))])),
    output_hashes: Object.fromEntries(Object.entries(files).map(([f, t]) => [f, sha256(t)])),
  }, null, 2) + '\n';
  return files;
}

module.exports = {build, OUT, CONCEPTS, L9, REPEATS, NOMINAL_EXTRA};

if (require.main === module) {
  const files = build();
  fs.mkdirSync(path.join(root, OUT), {recursive: true});
  for (const [f, t] of Object.entries(files)) fs.writeFileSync(path.join(root, OUT, f), t);
  console.log(`Wrote ${Object.keys(files).length} files to ${OUT}`);
}
