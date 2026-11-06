#!/usr/bin/env node
'use strict';
// Verifies derived/avoid-v11: input/output hashes and the footprint-sensitivity decomposition.
// Regenerate with: uv run --no-project --python 3.12 python -B -I tools/evaluate-avoid-v11.py
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'derived/avoid-v11');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
for (const [f, h] of Object.entries(manifest.input_hashes)) assert.equal(sha(fs.readFileSync(path.join(root, f))), h, `stale input ${f}; rerun tools/evaluate-avoid-v11.py`);
for (const [f, h] of Object.entries(manifest.output_hashes)) assert.equal(sha(fs.readFileSync(path.join(dir, f))), h, `output ${f} changed`);

const report = JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8'));
assert.deepEqual(report.seeds, Array.from({length: 20}, (_, i) => 100 + i), 'reserved evaluation seeds 100-119');
assert.equal(report.results.length, 12, 'six footprints x two conditions');

for (const condition of ['aligned_vehicles', 'random_yaw_vehicles']) {
  const cells = report.results.filter(r => r.condition === condition).sort((a, b) => b.footprint_in - a.footprint_in);
  assert.equal(cells.length, 6, `six footprints for ${condition}`);
  for (const c of cells) {
    assert.equal(c.summary.completed, 20, `${condition}: avoidance never stops a run`);
    assert.equal(c.summary.contact_free_runs, 0, `${condition}: contact-free stays 0 (honest negative result)`);
  }
  // The planner's blocked-straight count must not rise as the assumed footprint shrinks.
  for (let i = 1; i < cells.length; i++) {
    assert.ok(cells[i].summary.mean_planned_blocked <= cells[i - 1].summary.mean_planned_blocked,
      `${condition}: planned-blocked must be non-increasing as footprint shrinks`);
  }
}
const aligned = report.results.filter(r => r.condition === 'aligned_vehicles');
assert.ok(aligned.find(r => r.footprint_in === 10.0).summary.mean_planned_blocked > 0, '10 in robot flags blocked straights');
assert.equal(aligned.find(r => r.footprint_in === 6.0).summary.mean_planned_blocked, 0, '6 in robot flags none');
console.log(`Verified avoid v11: planned-blocked falls ${aligned.find(r => r.footprint_in === 10.0).summary.mean_planned_blocked} -> ${aligned.find(r => r.footprint_in === 6.0).summary.mean_planned_blocked} as footprint shrinks, yet contact-free stays 0 (entry/exit blends).`);