#!/usr/bin/env node
'use strict';
// Verifies derived/estimation-v10: hashes, the evaluation matrix and run-level consistency.
// Regenerate with: uv run --no-project --python 3.12 python -B -I tools/evaluate-estimation-v10.py
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'derived/estimation-v10');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
for (const [f, h] of Object.entries(manifest.input_hashes)) assert.equal(sha(fs.readFileSync(path.join(root, f))), h, `stale input ${f}; rerun tools/evaluate-estimation-v10.py`);
for (const [f, h] of Object.entries(manifest.output_hashes)) assert.equal(sha(fs.readFileSync(path.join(dir, f))), h, `output ${f} changed`);

const ev = JSON.parse(fs.readFileSync(path.join(dir, 'evaluation.json'), 'utf8'));
assert.equal(ev.results.length, 2 * 4, 'two conditions x four sensing modes');
for (const r of ev.results) {
  assert.equal(r.runs.length, 20);
  for (const run of r.runs) {
    assert.ok(run.estimation, 'every run is controlled from an estimate');
    assert.ok(run.estimation.rms_position_error_in <= run.estimation.max_position_error_in + 1e-9);
  }
  assert.equal(r.summary.completed, r.runs.filter(x => x.state === 'DONE').length);
}
const full = ev.results.find(r => r.condition === 'empty' && r.sensing === 'full').summary;
const odo = ev.results.find(r => r.condition === 'empty' && r.sensing === 'odometry_only').summary;
console.log(`Verified estimation v10: 160 runs; empty field full sensing ${full.completed}/20 (median RMS ${full.rms_position_error_in_median} in), odometry only ${odo.completed}/20 (median RMS ${odo.rms_position_error_in_median} in).`);
