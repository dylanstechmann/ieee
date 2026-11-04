#!/usr/bin/env node
'use strict';
// Verifies derived/full-mission-v10: hashes, the mission matrix, summaries and every score, recomputed here
// from each mission's raw fields. Regenerate with:
// uv run --no-project --python 3.12 python -B -I tools/evaluate-full-mission-v10.py
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'derived/full-mission-v10');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
for (const [f, h] of Object.entries(manifest.input_hashes)) assert.equal(sha(fs.readFileSync(path.join(root, f))), h, `stale input ${f}; rerun tools/evaluate-full-mission-v10.py`);
for (const [f, h] of Object.entries(manifest.output_hashes)) assert.equal(sha(fs.readFileSync(path.join(dir, f))), h, `output ${f} changed`);

const report = JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8'));
const {clean, vehicles, library, paths} = report.missions;
assert.equal(clean.length, 3 * 3 * 3, 'three boxes, three plants, three seeds');
assert.equal(vehicles.length, 20);
assert.equal(library.length, 32);
assert.equal(new Set(library.map(r => r.lap)).size, 32, 'every library lap ran');
assert.equal(paths.length, 4 * 3, 'four branches on three boxes');
for (const box of [1, 2, 3]) assert.equal(clean.filter(r => r.box === box).length, 9);

// Score table: start 10, entry 25, finish 100, under 2:45 30, park 15, exchange 65, per lap 15 and 25, flag 25.
// A flag raised is not recorded per mission, so it is implied by three laps, as the supervisor raises it before lap 3.
function score(r) {
  let s = 35;
  if (r.finish_s !== null && r.finish_s <= 178) s += 100 + (r.finish_s < 165 ? 30 : 0);
  if (r.parked) s += 15;
  if (r.exchange === 'done') s += 65;
  s += 15 * (r.laps - Math.min(r.laps, r.wall_contact_laps)) + 25 * (r.laps - Math.min(r.laps, r.vehicle_contact_laps));
  if (r.laps === 3) s += 25;
  return s;
}
const all = [...clean, ...vehicles, ...library, ...paths];
for (const r of all) {
  assert.equal(r.score_like, score(r), `score ${JSON.stringify(r).slice(0, 120)}`);
  assert.ok(r.score_like <= 390, 'no score beats the V3 robot total');
  assert.ok(r.wall_contact_laps <= 3 && r.vehicle_contact_laps <= 3);
  if (r.finish_s !== null) assert.ok(r.finish_s <= r.mission_s + 1e-9, 'the finish comes before parking');
}

const summary = name => report.summaries.find(s => s.set === name);
for (const [name, rows] of Object.entries({clean, vehicles, library, paths})) {
  const s = summary(name);
  assert.equal(s.missions, rows.length);
  assert.equal(s.done, rows.filter(r => r.state === 'DONE').length);
  assert.equal(s.parked, rows.filter(r => r.parked).length);
  assert.equal(s.laps_with_wall_contact, rows.reduce((t, r) => t + r.wall_contact_laps, 0));
  assert.equal(s.laps_with_vehicle_contact, rows.reduce((t, r) => t + r.vehicle_contact_laps, 0));
  assert.equal(s.least_clearance_in, Math.min(...rows.map(r => r.least_clearance_in)));
  assert.ok(Math.abs(s.mean_score_like - rows.reduce((t, r) => t + r.score_like, 0) / rows.length) < 0.006);
}

// What the README states.
for (const r of [...clean, ...library, ...paths]) {
  assert.equal(r.state, 'DONE', `${r.box} ${r.lap || r.branch || r.plant}`);
  assert.equal(r.laps, 3);
  assert.ok(r.parked);
  assert.equal(r.safety_stopped, false);
  assert.equal(r.recoveries, 0);
}
for (const r of clean) {
  assert.equal(r.exchange, 'done');
  assert.equal(r.score_like, 390, 'empty field, no contact');
}
for (const r of paths.filter(x => x.branch === 'exchange fails')) assert.equal(r.exchange, 'bailed out');
for (const r of paths.filter(x => x.branch === 'drive-only preset')) assert.equal(r.exchange, 'skipped');
for (const r of vehicles) assert.equal(r.state, 'DONE');
assert.equal(summary('clean').laps_with_wall_contact, 0);
assert.equal(summary('library').laps_with_wall_contact, 0);
assert.ok(summary('clean').least_clearance_in > 0);

const c = summary('clean');
const v = summary('vehicles');
console.log(`Verified full mission v10: ${all.length} missions; clean ${c.done}/${c.missions} done, median finish ${c.median_finish_s} s; guide-size vehicles ${v.done}/${v.missions} done, mean score-like ${v.mean_score_like}.`);
