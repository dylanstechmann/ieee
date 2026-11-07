#!/usr/bin/env node
'use strict';
// Verifies derived/rl-v3/<world> — the world named by software/stockcar/DEFAULT_WORLD, or an explicit
// first argument. It checks input/output hashes and the trained-policy study's structure, i.e.
// reproducibility and that every field is present and in range. It does not assert a hoped-for
// direction: the learned policy is reported as measured against the classical baseline.
// Regenerate with: uv run --no-project --python 3.12 python -B -I tools/evaluate-world.py --world <world>
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const world = (process.argv[2] || fs.readFileSync(path.join(root, 'software/stockcar/DEFAULT_WORLD'), 'utf8')).trim();
const dir = path.join(root, 'derived/rl-v3', world);
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
assert.equal(manifest.world, world, `manifest world mismatch: ${manifest.world} != ${world}`);
for (const [f, h] of Object.entries(manifest.input_hashes)) assert.equal(sha(fs.readFileSync(path.join(root, f))), h, `stale input ${f}; rerun tools/evaluate-world.py --world ${world}`);
for (const [f, h] of Object.entries(manifest.output_hashes)) assert.equal(sha(fs.readFileSync(path.join(dir, f))), h, `output ${f} changed`);

const report = JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8'));
assert.equal(report.world, world, 'report world mismatch');
assert.deepEqual(report.seeds, Array.from({length: 20}, (_, i) => 100 + i), 'reserved evaluation seeds 100-119');
assert.equal(report.max_steps, 4000, 'max_steps documented');

const names = report.results.map(r => r.policy).slice().sort();
assert.deepEqual(names, ['classical', 'learned', 'random'], 'classical, learned and random cells');
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

const weights = JSON.parse(fs.readFileSync(path.join(dir, 'trained-weights.json'), 'utf8')).weights;
assert.equal(weights.length, 38, '38 learned weights');
for (const w of weights) assert.equal(typeof w, 'number', 'weights are numbers');

const training = JSON.parse(fs.readFileSync(path.join(dir, 'training.json'), 'utf8'));
assert.equal(training.world, world, 'training metadata world matches');
assert.equal(training.weight_count, 38, 'training metadata reports 38 weights');
assert.ok(Array.isArray(training.curve) && training.curve.length > 0, 'training curve present');
assert.ok(Array.isArray(training.train_seeds) && training.train_seeds.length > 0, 'train seeds present');

const worlds = JSON.parse(fs.readFileSync(path.join(root, 'software/stockcar/worlds.json'), 'utf8'));
const spec = worlds.worlds[world];
assert.ok(spec, `world ${world} present in worlds.json`);
if (spec.lane_rule === 'enforced') {
  for (const r of report.results) {
    assert.ok(Number.isInteger(r.total_lane_violations) && r.total_lane_violations >= 0,
      `${r.policy}: lane violations are non-negative integers`);
    assert.ok(Number.isInteger(r.total_lane_violation_steps) && r.total_lane_violation_steps >= 0,
      `${r.policy}: lane violation steps are non-negative integers`);
    assert.ok(r.total_lane_violations <= r.runs * r.max_steps * 2,
      `${r.policy}: lane violations within total-run bounds`);
    assert.ok(r.total_lane_violation_steps <= r.runs * r.max_steps,
      `${r.policy}: lane violation steps within total-run bounds`);
    assert.ok(Number.isInteger(r.runs_with_lane_plan_fallback) && r.runs_with_lane_plan_fallback >= 0
      && r.runs_with_lane_plan_fallback <= r.runs,
      `${r.policy}: lane-plan fallback runs in [0, runs]`);
  }
}

console.log(`Verified world ${world}: classical / random / learned across 20 evaluation seeds; trained weights and curve recorded as measured.`);