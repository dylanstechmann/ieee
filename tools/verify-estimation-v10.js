#!/usr/bin/env node
'use strict';
// Verifies derived/estimation-v10: hashes, the evaluation matrix, the ablation and run-level consistency.
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

const median = values => {
  const v = [...values].sort((a, b) => a - b);
  return (v[(v.length - 1) >> 1] + v[v.length >> 1]) / 2;
};
const close = (a, b, what) => assert.ok(Math.abs(a - b) < 0.0051, `${what}: ${a} vs ${b}`);
assert.equal(ev.ablation.length, 24, 'twelve odometry and calibration rows plus two six-row factorials');
assert.equal(new Set(ev.ablation.map(a => `${a.sensing}|${a.label}`)).size, ev.ablation.length, 'row labels are unique');
for (const a of ev.ablation) {
  assert.equal(a.runs.length, 20);
  const s = a.summary;
  assert.equal(s.completed, a.runs.filter(r => r.state === 'DONE').length);
  close(s.rms_position_error_in_median, median(a.runs.map(r => r.rms_position_error_in)), `${a.label} RMS median`);
  close(s.max_heading_error_deg_median, median(a.runs.map(r => r.max_heading_error_deg)), `${a.label} heading median`);
  close(s.max_position_error_in_worst, Math.max(...a.runs.map(r => r.max_position_error_in)), `${a.label} worst position`);
  close(s.max_heading_error_deg_worst, Math.max(...a.runs.map(r => r.max_heading_error_deg)), `${a.label} worst heading`);
}

// With the estimator's defaults and nothing removed, the ablation must be the study's own run, seed by seed.
const row = (sensing, label) => ev.ablation.find(a => a.sensing === sensing && a.label === label);
for (const [sensing, label] of [['odometry_only', 'stillness'], ['lines_only', 'ring, stillness'], ['full', 'ring, stillness']]) {
  const study = ev.results.find(r => r.condition === 'empty' && r.sensing === sensing);
  row(sensing, label).runs.forEach((run, i) => {
    assert.equal(run.state, study.runs[i].state, `${label} seed ${ev.seeds[i]} state`);
    for (const k of ['rms_position_error_in', 'max_position_error_in', 'max_heading_error_deg']) assert.equal(run[k], study.runs[i].estimation[k], `${label} seed ${ev.seeds[i]} ${k}`);
  });
}

// The README's findings.
const done = (sensing, label) => row(sensing, label).summary.completed;
const allErrors = done('odometry_only', 'all errors');
assert.ok(done('odometry_only', 'no gyro bias') > done('odometry_only', 'no gyro scale error'), 'bias is the largest single source');
assert.ok(done('odometry_only', 'no gyro scale error') >= allErrors && done('odometry_only', 'no gyro bias') > allErrors);
assert.ok(done('odometry_only', 'no gyro bias or scale error') >= 19, 'both gyro errors gone lets odometry finish');
assert.ok(done('lines_only', 'nearest') < done('lines_only', 'ring') && done('lines_only', 'ring') < done('lines_only', 'ring, stillness'), 'ring matching and stillness each add to line sensing');
for (const a of ev.ablation.filter(x => x.sensing === 'full')) assert.equal(a.summary.completed, 20, `${a.label} with ranges`);

const full = ev.results.find(r => r.condition === 'empty' && r.sensing === 'full').summary;
const odo = ev.results.find(r => r.condition === 'empty' && r.sensing === 'odometry_only').summary;
console.log(`Verified estimation v10: 160 runs and ${ev.ablation.length} ablation rows; empty field full sensing ${full.completed}/20 (median RMS ${full.rms_position_error_in_median} in), odometry only ${odo.completed}/20 (median RMS ${odo.rms_position_error_in_median} in).`);
