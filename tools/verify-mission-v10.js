#!/usr/bin/env node
'use strict';
// Verifies derived/mission-v10: input and output hashes, the evaluation matrix, and run-level
// consistency. Regenerate with: uv run --no-project --python 3.12 python -B -I tools/evaluate-mission-v10.py
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'derived/mission-v10');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
for (const [f, h] of Object.entries(manifest.input_hashes)) assert.equal(sha(fs.readFileSync(path.join(root, f))), h, `stale input ${f}; rerun tools/evaluate-mission-v10.py`);
for (const [f, h] of Object.entries(manifest.output_hashes)) assert.equal(sha(fs.readFileSync(path.join(dir, f))), h, `output ${f} changed`);

const ev = JSON.parse(fs.readFileSync(path.join(dir, 'evaluation.json'), 'utf8'));
assert.deepEqual(ev.seeds, Array.from({length: 20}, (_, i) => 100 + i), 'evaluation seeds must be the reserved 100-119');
assert.equal(ev.results.length, 3 * 2 * 2, 'three conditions x two presets x two speed settings');
let runs = 0;
for (const r of ev.results) {
  assert.equal(r.runs.length, 20);
  for (const run of r.runs) {
    runs++;
    if (run.state === 'DONE') assert.equal(run.laps, 3, 'a completed run has three laps');
    assert.ok(run.score_like <= 400, 'score-like total cannot exceed the 390 + 10 nominal maximum');
    if (r.condition === 'empty') assert.deepEqual(run.vehicle_contact_steps, [0, 0, 0], 'no vehicles, no vehicle contacts');
  }
  assert.equal(r.summary.completed, r.runs.filter(x => x.state === 'DONE').length);
}
const empty = ev.results.filter(r => r.condition === 'empty');
console.log(`Verified mission v10: ${runs} runs on seeds 100-119; empty-field completion ${empty.map(r => r.summary.completed).join('/')} of 20; vehicle runs contact-free ${ev.results.filter(r => r.condition !== 'empty').map(r => r.summary.vehicle_contact_free_runs).join('/')}.`);
