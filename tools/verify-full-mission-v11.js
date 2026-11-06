#!/usr/bin/env node
'use strict';
// Verifies derived/full-mission-v11: input/output hashes and the sensed-vs-truth mission comparison.
// Regenerate with: uv run --no-project --python 3.12 python -B -I tools/evaluate-full-mission-v11.py
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'derived/full-mission-v11');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
for (const [f, h] of Object.entries(manifest.input_hashes)) assert.equal(sha(fs.readFileSync(path.join(root, f))), h, `stale input ${f}; rerun tools/evaluate-full-mission-v11.py`);
for (const [f, h] of Object.entries(manifest.output_hashes)) assert.equal(sha(fs.readFileSync(path.join(dir, f))), h, `output ${f} changed`);

const report = JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8'));
assert.deepEqual(report.seeds, Array.from({length: 20}, (_, i) => 100 + i), 'reserved evaluation seeds 100-119');
assert.equal(report.results.length, 9, 'three conditions x three sensing paths');

const byKey = new Map(report.results.map(r => [`${r.condition}/${r.path}`, r]));
for (const condition of ['empty', 'aligned_vehicles', 'random_yaw_vehicles']) {
  const truth = byKey.get(`${condition}/truth`);
  const sensed = byKey.get(`${condition}/sensed`);
  assert.ok(truth && sensed, `truth and sensed paths exist for ${condition}`);
  assert.equal(truth.runs.length, 20);
  assert.equal(sensed.runs.length, 20);
  // Camera sensing must not change mission outcomes versus ground truth.
  assert.deepEqual(sensed.summary, truth.summary, `sensed must match truth for ${condition}`);
  for (const r of truth.runs) if (r.state === 'DONE') assert.equal(r.laps, 3, 'completed runs have three laps');
}

// Empty field: no vehicles, so every path is contact-free and sensed_stop is the same as sensed.
const emptyStop = byKey.get('empty/sensed_stop');
assert.equal(emptyStop.summary.contact_free_runs, 20, 'no vehicles implies contact-free');
assert.equal(emptyStop.summary.completed, 20, 'empty field completes');

// With vehicles, stop-on-contact halts at the first contact instead of scraping through all three laps.
for (const condition of ['aligned_vehicles', 'random_yaw_vehicles']) {
  const stop = byKey.get(`${condition}/sensed_stop`);
  assert.equal(stop.summary.completed, 0, `${condition}: stop-on-contact never completes`);
  assert.equal(stop.summary.laps_with_vehicle_contact, 20, `${condition}: exactly one contact per run (halt on first)`);
}
console.log(`Verified full mission v11: sensed matches truth on all conditions; stop-on-contact halts at the first vehicle contact (${report.results.filter(r => r.path === 'sensed_stop' && r.condition !== 'empty').map(r => r.summary.laps_with_vehicle_contact).join('/')} vs truth ${report.results.filter(r => r.path === 'truth' && r.condition !== 'empty').map(r => r.summary.laps_with_vehicle_contact).join('/')} contact laps).`);