#!/usr/bin/env node
'use strict';
// Verifies derived/rl-v1: input/output hashes and the scaffold's structure. It checks
// reproducibility and that every measured field is present and in range; it does not assert a
// hoped-for direction.
// Regenerate with: uv run --no-project --python 3.12 python -B -I tools/evaluate-rl-v1.py
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'derived/rl-v1');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
for (const [f, h] of Object.entries(manifest.input_hashes)) assert.equal(sha(fs.readFileSync(path.join(root, f))), h, `stale input ${f}; rerun tools/evaluate-rl-v1.py`);
for (const [f, h] of Object.entries(manifest.output_hashes)) assert.equal(sha(fs.readFileSync(path.join(dir, f))), h, `output ${f} changed`);

const report = JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8'));
assert.deepEqual(report.seeds, Array.from({length: 20}, (_, i) => 100 + i), 'reserved evaluation seeds 100-119');
assert.equal(report.max_steps, 4000, 'max_steps is the documented step cap');

const names = report.results.map(r => r.policy).slice().sort();
assert.deepEqual(names, ['classical', 'random'], 'classical and random cells expected');
for (const r of report.results) {
  assert.equal(r.runs, 20, `${r.policy}: 20 runs`);
  assert.ok(r.completed >= 0 && r.completed <= 20, 'completed in [0, 20]');
  assert.ok(r.mean_steps >= 0 && r.mean_steps <= 4000, 'mean_steps in [0, 4000]');
  assert.ok(r.max_steps >= 0 && r.max_steps <= 4000, 'max_steps in [0, 4000]');
  assert.ok(r.total_vehicle_contact_steps >= 0, 'vehicle contact steps non-negative');
  assert.ok(r.total_wall_contact_steps >= 0, 'wall contact steps non-negative');
  assert.equal(typeof r.mean_total_reward, 'number', 'mean total reward numeric');
  assert.equal(typeof r.mean_score_like, 'number', 'mean score-like numeric');
}
console.log('Verified rl v1: classical vs random across 20 evaluation seeds; structure and reproducibility recorded as measured.');