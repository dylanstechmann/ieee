'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {checkInputHashes} = require('../tools/input-supersession');
const root = path.resolve(__dirname, '..');

const record = {superseded_inputs: [{file: 'tools/a.js', sealed_sha256: 'old', current_sha256: 'new'}]};
const hashes = {'tools/a.js': 'old', 'data.json': 'same'};

test('a recorded supersession is accepted only at its exact hashes', () => {
  assert.deepEqual(checkInputHashes(hashes, f => ({'tools/a.js': 'new', 'data.json': 'same'}[f]), record), {accepted: ['tools/a.js'], stale: []});
});

test('a further edit after the recorded one is stale again', () => {
  const result = checkInputHashes(hashes, f => ({'tools/a.js': 'newer', 'data.json': 'same'}[f]), record);
  assert.deepEqual(result.accepted, []);
  assert.deepEqual(result.stale.map(s => s.file), ['tools/a.js']);
});

test('a record cannot excuse a different sealed hash or another file', () => {
  assert.equal(checkInputHashes({'tools/a.js': 'other', 'data.json': 'same'}, f => ({'tools/a.js': 'new', 'data.json': 'same'}[f]), record).stale.length, 1);
  assert.deepEqual(checkInputHashes(hashes, f => ({'tools/a.js': 'new', 'data.json': 'changed'}[f]), record).stale.map(s => s.file), ['data.json']);
  assert.equal(checkInputHashes(hashes, f => ({'tools/a.js': 'new', 'data.json': 'same'}[f]), null).stale.length, 1);
});

test('the planner-diagnostics record matches the sealed report and names one input', () => {
  const real = JSON.parse(fs.readFileSync(path.join(root, 'derived/audits/2026-11-03-planner-diagnostics-v3-input-supersession/record.json'), 'utf8'));
  const report = JSON.parse(fs.readFileSync(path.join(root, 'derived/planner-diagnostics-v3/report.json'), 'utf8'));
  assert.equal(real.superseded_inputs.length, 1);
  const entry = real.superseded_inputs[0];
  assert.equal(entry.file, 'tools/avoidance-v3.js');
  assert.equal(report.input_hashes[entry.file], entry.sealed_sha256);
  assert.match(entry.current_sha256, /^[0-9a-f]{64}$/);
  assert.equal(entry.pre_change_source_available, false);
});
