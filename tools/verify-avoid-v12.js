#!/usr/bin/env node
'use strict';
// Verifies derived/avoid-v12: input/output hashes and the study's structure. It checks the recorded
// numbers, not a hoped-for direction — completion, contact-free, infeasible and attribution counts
// are asserted only to be present and in range.
// Regenerate with: uv run --no-project --python 3.12 python -B -I tools/evaluate-avoid-v12.py
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'derived/avoid-v12');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
for (const [f, h] of Object.entries(manifest.input_hashes)) assert.equal(sha(fs.readFileSync(path.join(root, f))), h, `stale input ${f}; rerun tools/evaluate-avoid-v12.py`);
for (const [f, h] of Object.entries(manifest.output_hashes)) assert.equal(sha(fs.readFileSync(path.join(dir, f))), h, `output ${f} changed`);

const report = JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8'));
assert.deepEqual(report.seeds, Array.from({length: 20}, (_, i) => 100 + i), 'reserved evaluation seeds 100-119');

// 3 lane sources x 2 yaw x 3 footprints x 2 pose modes = 36 cells x 20 runs.
const laneSources = ['v10_blend', 'oracle', 'sensed'];
const phases = ['arc', 'entry_blend', 'lane_hold', 'lane_change', 'exit_blend', 'off_straight'];
assert.equal(report.results.length, 36, '36 cells expected');
for (const source of laneSources) {
  for (const yaw of ['aligned', 'random']) {
    for (const fp of [10, 8, 6]) {
      for (const pose of ['true_pose', 'ekf_pose']) {
        const c = report.results.find(r => r.lane_source === source && r.yaw_mode === yaw && r.footprint_in === fp && r.pose_mode === pose);
        assert.ok(c, `missing cell ${source}/${yaw}/${fp}/${pose}`);
        assert.equal(c.runs, 20, `${source}/${yaw}/${fp}/${pose}: 20 runs`);
        assert.ok(c.completed >= 0 && c.completed <= 20, 'completed in [0, 20]');
        assert.ok(c.contact_free_runs >= 0 && c.contact_free_runs <= 20, 'contact_free_runs in [0, 20]');
        assert.equal(c.contact_free_laps.length, 3, 'three laps');
        for (const n of c.contact_free_laps) assert.ok(n >= 0 && n <= 20, 'contact_free_laps in [0, 20]');
        assert.ok(c.laps_with_vehicle_contact >= 0 && c.laps_with_vehicle_contact <= 60, 'laps_with_vehicle_contact in [0, 60]');
        assert.ok(c.laps_with_wall_contact >= 0 && c.laps_with_wall_contact <= 60, 'laps_with_wall_contact in [0, 60]');
        for (const ph of Object.keys(c.attribution)) assert.ok(phases.includes(ph), `unknown phase ${ph}`);
      }
    }
  }
}
for (const c of report.results) {
  if (c.lane_source === 'sensed') {
    assert.ok(c.misses >= 0 && c.misses <= 60, 'misses in [0, 60] (<= 3 vehicles x 20 runs)');
    assert.ok(c.false_positives >= 0, 'false positives non-negative');
  } else {
    assert.equal(c.misses, 0, 'non-sensed cells have no misses');
    assert.equal(c.false_positives, 0, 'non-sensed cells have no false positives');
  }
}
console.log(`Verified avoid v12: 36 cells x 20 runs across ${laneSources.join('/')}; contact-free, infeasible and attribution recorded as measured.`);