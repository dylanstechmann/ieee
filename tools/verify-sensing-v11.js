#!/usr/bin/env node
'use strict';
// Verifies derived/sensing-v11: input/output hashes and the characterisation of the camera models.
// Regenerate with: uv run --no-project --python 3.12 python -B -I tools/evaluate-sensing-v11.py
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'derived/sensing-v11');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
for (const [f, h] of Object.entries(manifest.input_hashes)) assert.equal(sha(fs.readFileSync(path.join(root, f))), h, `stale input ${f}; rerun tools/evaluate-sensing-v11.py`);
for (const [f, h] of Object.entries(manifest.output_hashes)) assert.equal(sha(fs.readFileSync(path.join(dir, f))), h, `output ${f} changed`);

const report = JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8'));
assert.ok(report.tag_pose_in && report.flag_pose_in, 'assumed tag/flag poses recorded');
const vis = report.visibility;
assert.ok(vis.samples > 0, 'visibility sweep ran');
assert.ok(vis.tag_read_fraction > 0 && vis.tag_read_fraction < 1, 'tag read fraction is non-trivial');
assert.ok(vis.flag_view_fraction > 0 && vis.flag_view_fraction < 1, 'flag view fraction is non-trivial');
assert.ok(vis.tag_range_in.max <= 36.0, 'tag is only read inside the 36 in camera range cap');
assert.deepEqual(report.lap_line, {low: 1, high: 1, gap: 0}, 'one rising edge per checkered opening and none in the divider gap');
console.log(`Verified sensing v11: ${vis.samples} poses; tag read ${vis.tag_read_fraction.toFixed(3)} (range ${vis.tag_range_in.min}-${vis.tag_range_in.max} in), flag ${vis.flag_view_fraction.toFixed(3)}; lap line ${JSON.stringify(report.lap_line)}.`);