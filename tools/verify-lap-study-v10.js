#!/usr/bin/env node
'use strict';
// Verifies derived/lap-study-v10: input and output hashes, layout counts, internal consistency of
// contact-free flags and aggregates. Regenerate with: uv run --no-project --python 3.12 python -B -I tools/lap-study-v10.py
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'derived/lap-study-v10');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
for (const [f, h] of Object.entries(manifest.input_hashes)) assert.equal(sha(fs.readFileSync(path.join(root, f))), h, `stale input ${f}; rerun tools/lap-study-v10.py`);
for (const [f, h] of Object.entries(manifest.output_hashes)) assert.equal(sha(fs.readFileSync(path.join(dir, f))), h, `output ${f} changed`);

const study = JSON.parse(fs.readFileSync(path.join(dir, 'study.json'), 'utf8'));
assert.equal(study.cells.length, 6, 'three quadrant readings x two yaw modes');
let layouts = 0;
for (const cell of study.cells) {
  assert.equal(cell.layouts.length, cell.aggregate.layouts);
  let free = 0;
  for (const row of cell.layouts) {
    layouts++;
    assert.equal(row.straights.length, 2);
    assert.equal(row.straights.reduce((n, s) => n + s.vehicles, 0), 3, 'three vehicles per layout');
    assert.equal(row.contact_free, row.straights.every(s => s.mode !== 'contact'));
    if (row.contact_free) free++;
    for (const env of Object.keys(study.envelopes)) assert.ok(row.by_envelope[env].mission_s > 0);
  }
  assert.ok(Math.abs(free / cell.layouts.length - cell.aggregate.contact_free_share) < 0.0006, 'contact-free share must match the layouts');
}
const shares = study.cells.map(c => `${c.reading}/${c.yaw_mode} ${(100 * c.aggregate.contact_free_share).toFixed(1)}%`).join(', ');
console.log(`Verified lap study: ${layouts} layouts; contact-free laps ${shares}.`);
