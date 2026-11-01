#!/usr/bin/env node
'use strict';
// Verifies the sealed AprilTag 41h12 v7 package without re-running the Python
// experiment (that needs uv and network access). `--seal` rewrites manifest.json.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), out = 'derived/apriltag-41h12-v7';
const hash = (f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex');
const INPUTS = ['derived/GM2-V3.1/media/image5.jpg', 'sources/organizer-2026-10-29/Game-Manual-2027-2-V3-1.docx', 'tools/apriltag-41h12-v7.py'];
const OUTPUTS = ['report.json', 'organizer-sheet-detections.png', 'synthetic-examples.png', 'README.md'].map((f) => `${out}/${f}`);

function seal() {
  const m = { schema: 'apriltag-41h12-v7-manifest/1', input_hashes: Object.fromEntries(INPUTS.map((f) => [f, hash(f)])),
    output_hashes: Object.fromEntries(OUTPUTS.map((f) => [f, hash(f)])) };
  fs.writeFileSync(path.join(root, out, 'manifest.json'), `${JSON.stringify(m, null, 1)}\n`);
  return m;
}

function verify() {
  const m = JSON.parse(fs.readFileSync(path.join(root, out, 'manifest.json'), 'utf8'));
  for (const key of ['input_hashes', 'output_hashes']) for (const [f, h] of Object.entries(m[key])) assert.equal(hash(f), h, `stale ${key}: ${f}`);
  assert.deepEqual(Object.keys(m.output_hashes).sort(), [...OUTPUTS].sort());
  const r = JSON.parse(fs.readFileSync(path.join(root, out, 'report.json'), 'utf8'));
  assert.equal(r.schema, 'apriltag-41h12-v7/1');
  assert.match(r.status, /no physical camera/);
  assert.equal(r.inputs.sheet_sha256, m.input_hashes[INPUTS[0]]);
  assert.equal(r.inputs.manual_sha256, m.input_hashes[INPUTS[1]]);
  assert.equal(r.checks.length, 8);
  for (const c of r.checks) assert.equal(c.passed, true, c.check);
  assert.equal(r.library_support.opencv_aruco_has_41h12, false);
  assert.ok(!r.library_support.opencv_aruco_dictionaries.some((n) => n.includes('41')));
  assert.deepEqual(r.organizer_sheet.families_tried.tagStandard41h12, [1, 2, 3]);
  for (const [fam, ids] of Object.entries(r.organizer_sheet.families_tried)) if (fam !== 'tagStandard41h12') assert.deepEqual(ids, [], fam);
  for (const t of r.organizer_sheet.tags) {
    assert.equal(t.hamming, 0);
    assert.ok(Math.abs(t.quad_to_full_ratio - 5 / 9) < 0.01);
    assert.equal(t.bits_black_is_1.length, 9);
    assert.equal(t.black_ring_cells_black, t.black_ring_cells_total);
  }
  assert.equal(r.sweep_rows.length, 704);
  assert.equal(r.sweep_rows.reduce((a, x) => a + x.wrong_id_detections, 0), 0);
  const lim = (cam, yaw, q) => r.sweep_summary.find((s) => s.camera === cam && s.yaw_deg === yaw && s.quad_decimate === q).reliable_to_m;
  // Figures quoted in README.md and the team brief.
  assert.equal(lim('VGA-60', 0, 1), 1.83);
  assert.equal(lim('VGA-60', 60, 1), 1.339);
  assert.equal(lim('HD-70', 0, 1), 3.421);
  assert.equal(lim('HD-70', 0, 2), 2.502);
  assert.equal(lim('HD-70', 60, 2), 1.565);
  for (const s of r.sweep_summary) assert.ok(s.reliable_from_m === 0.15 && s.reliable_to_m >= 0.6, `start-box band ${s.camera}`);
  for (const row of r.pose_check.rows) {
    assert.ok(Math.abs(row.inner_5_cell_edge - 1) < 0.006, 'pose with 5-cell edge');
    assert.ok(Math.abs(row.printed_9_cell_width - 1.8) < 0.01, 'pose with printed width');
  }
  const glare = r.glare_check.rows.map((x) => x.correct_id);
  assert.deepEqual(glare, [24, 7, 5, 0, 0]);
  return { status: 'passed', tags: [1, 2, 3], sweep_detections: r.sweep_rows.reduce((a, x) => a + x.attempts, 0), wrong_id: 0,
    opencv_has_41h12: false, physical_trials: 0 };
}

module.exports = { verify, seal };
if (require.main === module) {
  if (process.argv.includes('--seal')) seal();
  console.log(JSON.stringify(verify(), null, 2));
}
