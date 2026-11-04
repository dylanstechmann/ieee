#!/usr/bin/env node
'use strict';
// Verifies derived/passability-atlas-v10: input and output hashes, matrix completeness and internal
// consistency. --reproduce re-plans a few Part B cases in Python (uv) and compares the results.
// Regenerate the whole atlas with: uv run --no-project --python 3.12 python -B -I tools/atlas-v10.py
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'derived/passability-atlas-v10');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
for (const [f, h] of Object.entries(manifest.input_hashes)) assert.equal(sha(fs.readFileSync(path.join(root, f))), h, `stale input ${f}; rerun tools/atlas-v10.py`);
for (const [f, h] of Object.entries(manifest.output_hashes)) assert.equal(sha(fs.readFileSync(path.join(dir, f))), h, `output ${f} changed`);

const atlas = JSON.parse(fs.readFileSync(path.join(dir, 'atlas.json'), 'utf8'));
const need = atlas.robot_width_in + 2 * atlas.margin_in;
assert.equal(atlas.part_a_straight_pass.length, 3 * 3 * 2 * 3, 'part A must cover 3 dividers x 3 readings x 2 lanes x 3 yaws');
for (const r of atlas.part_a_straight_pass) {
  if (!r.placements) continue;
  assert.ok(r.share_passable >= 0 && r.share_passable <= 1);
  if (r.gap_max_in < need) assert.equal(r.share_passable, 0, 'no placement can pass if even the widest gap is too small');
  if (r.gap_min_in >= need) assert.equal(r.share_passable, 1, 'every placement passes if even the narrowest gap is wide enough');
}
assert.equal(atlas.part_b_two_vehicle_straights.length, 3 * 4 * 2 * 9 * 2, 'part B must cover 3 readings x 4 lane pairs x 2 yaws x 9 lateral pairs x 2 longitudinal positions');
assert.equal(atlas.part_c_lane_change_length.length, 4, 'part C must cover 2 yaws x 2 footprints');
const planned = atlas.part_b_two_vehicle_straights.filter(c => c.square);
for (const c of planned) {
  for (const k of ['square', 'round']) assert.ok(c[k].passable === null || typeof c[k].passable === 'boolean');
  if (c.method === 'gap-blocked') assert.ok(!c.square.passable && !c.round.passable, 'a blocked gap cannot be passable');
  if (c.method === 'straight') assert.ok(c.square.passable && c.round.passable, 'a straight line passes both footprints');
  assert.ok(['gap-blocked', 'straight', 'planned'].includes(c.method));
}

if (process.argv.includes('--reproduce')) {
  const searched = planned.filter(c => c.method === 'planned' && c.square.passable !== null && c.round.passable !== null);
  const sample = searched.filter((_, i) => i % Math.max(1, Math.floor(searched.length / 4)) === 0).slice(0, 4);
  const script = [
    'import json, sys',
    `sys.path.insert(0, ${JSON.stringify(path.join(root, 'software'))})`,
    'from stockcar.field import Field',
    'from stockcar.obstacles import GUIDE_PLUSH, footprint',
    'from stockcar.planner import Footprint, plan',
    'cases = json.loads(sys.stdin.read())',
    'band = Field(divider="cad_1x1").corridor("low")',
    'yaws = {"0": 0.0, "90": 1.5707963267948966}',
    'out = []',
    'for c in cases:',
    '    obs = [footprint(GUIDE_PLUSH, x, y, yaws[c["yaw_deg"]]) for x, y in c["centers_in"]]',
    '    out.append({k: plan(Footprint(k), band, obs, 38.0, 86.0, margin=0.25, max_expansions=40000)["found"] for k in ("square", "round")})',
    'print(json.dumps(out))',
  ].join('\n');
  const run = spawnSync('uv', ['run', '--no-project', '--python', '3.12', 'python', '-B', '-I', '-c', script], {input: JSON.stringify(sample), encoding: 'utf8', maxBuffer: 1 << 24});
  assert.equal(run.status, 0, run.stderr);
  const again = JSON.parse(run.stdout);
  sample.forEach((c, i) => {
    assert.equal(again[i].square, c.square.passable, 'square result did not reproduce');
    assert.equal(again[i].round, c.round.passable, 'round result did not reproduce');
  });
}
const sq = planned.filter(c => c.square.passable === true).length;
const ro = planned.filter(c => c.round.passable === true).length;
console.log(`Verified passability atlas: ${atlas.part_a_straight_pass.length} straight-pass rows, ${planned.length} two-vehicle cases (square passable ${sq}, round passable ${ro})${process.argv.includes('--reproduce') ? '; sampled cases reproduced' : ''}.`);
