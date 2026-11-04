#!/usr/bin/env node
'use strict';
// Verifies derived/maneuver-v10: hashes, row counts, and the route library, whose clearances, limits and
// times are recomputed here without the Python geometry. Regenerate with:
// uv run --no-project --python 3.12 python -B -I tools/evaluate-maneuver-v10.py
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'derived/maneuver-v10');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
for (const [f, h] of Object.entries(manifest.input_hashes)) assert.equal(sha(fs.readFileSync(path.join(root, f))), h, `stale input ${f}; rerun tools/evaluate-maneuver-v10.py`);
for (const [f, h] of Object.entries(manifest.output_hashes)) assert.equal(sha(fs.readFileSync(path.join(dir, f))), h, `output ${f} changed`);

const report = JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8'));
const library = JSON.parse(fs.readFileSync(path.join(dir, 'route-library.json'), 'utf8'));
const envelope = JSON.parse(fs.readFileSync(path.join(root, 'derived/envelope-v10/report.json'), 'utf8'));
const planning = envelope.planning_envelopes;

// Report structure and arithmetic.
assert.equal(report.timing.length, 3);
assert.equal(report.tracking_grid.length, 3 * 27, 'three envelopes on 27 conditions');
for (const t of report.tracking) {
  const rows = report.tracking_grid.filter(r => r.envelope === t.envelope);
  assert.equal(t.finished, rows.filter(r => r.finished).length);
  assert.equal(t.max_cross_track_in, Math.max(...rows.map(r => r.max_cross_track_in)));
  assert.equal(t.least_clearance_in, Math.min(...rows.map(r => r.clearance_in)));
}
assert.equal(report.speed_sweep.length, 6 * 2);
const {rows, driven, gaps} = report.passing;
assert.equal(driven.length, 6, 'plain lanes and five margins');
assert.equal(rows.length, 6 * 4, 'six policies and four vehicle sizes');
for (const d of driven) assert.equal(d.laps, 32 * 3, `${d.policy}: 32 configurations, 3 seeds`);
for (const r of rows) {
  assert.equal(r.laps, 32 * 3 * 16, `${r.policy}: every driven lap meets 16 placements`);
  assert.ok(Math.abs(r.points_per_lap - (15 * r.clear_of_walls + 25 * r.clear_of_vehicles)) < 0.03, `${r.policy} points`);
  assert.ok(r.clear_of_both <= Math.min(r.clear_of_walls, r.clear_of_vehicles) + 1e-9);
  const d = driven.find(x => x.policy === r.policy);
  assert.ok(Math.abs(r.clear_of_walls - (1 - d.wall_contact_laps / d.laps)) < 0.001, `${r.policy} wall share`);
  const bound = gaps.find(g => g.size_scale === r.size_scale);
  assert.ok(bound.layouts === 32 * 16);
}
for (let i = 1; i < gaps.length; i++) assert.ok(gaps[i].every_vehicle_has_a_gap >= gaps[i - 1].every_vehicle_has_a_gap, 'smaller vehicles leave more gaps');

// What was actually driven: a route that only looks clear on paper does not count.
const rounded = report.pit_legs.filter(r => r.form.startsWith('rounded'));
assert.equal(rounded.length, 7, 'enter, and two legs for each of three boxes');
for (const r of rounded) {
  assert.equal(r.finished, r.runs, `box ${r.box} ${r.leg} finished`);
  assert.ok(r.clearance_in > 0.5, `box ${r.box} ${r.leg} driven clearance ${r.clearance_in}`);
  assert.ok(r.max_cross_track_in < 1, `box ${r.box} ${r.leg} cross-track ${r.max_cross_track_in}`);
}
assert.ok(report.pit_legs.some(r => r.form.startsWith('sharp') && r.clearance_in < 0), 'the sharp-corner failure stays on the record');
const chosen = driven.find(d => parseFloat(d.policy.replace('far side, ', '')) === library.margin_in);
assert.ok(chosen, 'the library margin was driven');
assert.equal(chosen.wall_contact_laps, 0, 'the library margin drove clean');
assert.equal(chosen.unfinished, 0);
assert.ok(chosen.least_clearance_in > 0);
for (const t of report.tracking) assert.equal(t.finished, t.conditions, `${t.envelope} finishes on every condition`);

// Field walls, read from the organizer CAD extraction rather than the Python field model.
const field = JSON.parse(fs.readFileSync(path.join(root, 'derived/organizer-cad-v10/field-v10.json'), 'utf8'));
const f = field.features;
const box = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const {x_min, x_max, y_min, y_max} = f.walls.inner_faces;
const walls = [box(x_min - 5, y_min - 5, x_max + 5, y_min), box(x_min - 5, y_max, x_max + 5, y_max + 5), box(x_min - 5, y_min, x_min, y_max),
  box(x_max, y_min, x_max + 5, y_max), box(...f.center_divider.rect), box(...f.pit_divider.rect)];

// Separating-axis gap between convex polygons: positive when apart, negative when they overlap.
function gap(a, b) {
  let best = -Infinity;
  for (const [p, q] of [[a, b], [b, a]]) {
    for (let i = 0; i < p.length; i++) {
      const [x0, y0] = p[i];
      const [x1, y1] = p[(i + 1) % p.length];
      const len = Math.hypot(x1 - x0, y1 - y0);
      const nx = (y1 - y0) / len, ny = (x0 - x1) / len;
      const project = poly => poly.map(([x, y]) => x * nx + y * ny);
      const pa = project(p), pb = project(q);
      best = Math.max(best, Math.min(...pb) - Math.max(...pa), Math.min(...pa) - Math.max(...pb));
    }
  }
  return best;
}
const robot = (x, y, h) => [[5, 5], [-5, 5], [-5, -5], [5, -5]].map(([u, v]) => [x + u * Math.cos(h) - v * Math.sin(h), y + u * Math.sin(h) + v * Math.cos(h)]);

const lim = planning.conservative;
const half = envelope.half_track_in;
function checkRoute(name, r, keepClear) {
  const n = r.x.length;
  for (const k of ['y', 'heading', 'curvature', 'speed']) assert.equal(r[k].length, n, `${name} ${k} length`);
  let time = 0;
  let least = Infinity;
  for (let i = 0; i < n; i++) {
    assert.ok(r.speed[i] <= lim.cruise_in_s + 0.01, `${name} speed`);
    assert.ok(r.speed[i] * (1 + Math.abs(r.curvature[i]) * half) <= lim.cruise_in_s + 0.05, `${name} faster wheel at ${i}`);
    assert.ok(r.speed[i] ** 2 * Math.abs(r.curvature[i]) <= lim.lateral_in_s2 + 0.3, `${name} lateral at ${i}`);
    if (i) {
      const d = Math.hypot(r.x[i] - r.x[i - 1], r.y[i] - r.y[i - 1]);
      assert.ok(d < r.step_in * 1.5 + 0.02, `${name} gap at ${i}`);
      time += 2 * d / Math.max(1e-6, r.speed[i] + r.speed[i - 1]);
    }
    if (keepClear) for (const w of walls) least = Math.min(least, gap(robot(r.x[i], r.y[i], r.heading[i]), w));
  }
  assert.equal(r.speed[0], 0, `${name} starts from rest`);
  assert.equal(r.speed[n - 1], 0, `${name} ends at rest`);
  assert.ok(Math.abs(time - r.time_s) / r.time_s < 0.08, `${name} time ${time} vs ${r.time_s}`);
  return least;
}

assert.equal(Object.keys(library.lines).length, 32);
assert.equal(Object.keys(library.laps).length, 33, 'plain lanes and 32 configurations');
let least = Infinity;
for (const [name, r] of Object.entries(library.laps)) least = Math.min(least, checkRoute(`lap ${name}`, r, true));
assert.ok(least > 0.5, `library laps keep clear of the walls and divider: ${least}`);
const pitRoutes = [['enter', library.enter]];
for (const [box_, legs] of Object.entries(library.pit)) for (const [leg, r] of Object.entries(legs)) pitRoutes.push([`box ${box_} ${leg}`, r]);
for (const [name, r] of pitRoutes) {
  assert.ok(checkRoute(name, r, true) > 0.5, `${name} keeps clear of the walls`);
  assert.ok(Math.max(...r.speed) <= 8.01, `${name} keeps the pit speed limit`);
}

// The plain lap's U-turn speed must be the envelope study's own outer-wheel limit.
const plain = library.laps.lanes;
const turn = Math.min(...plain.speed.slice(10, -10));
assert.ok(Math.abs(turn - lim.uturn_in_s) < 0.2, `U-turn speed ${turn} vs envelope ${lim.uturn_in_s}`);

const size = fs.statSync(path.join(dir, 'route-library.json')).size;
const conservative = report.tracking.find(t => t.envelope === 'conservative');
console.log(`Verified maneuver v10: ${report.tracking_grid.length} tracked laps, ${driven.reduce((s, d) => s + d.laps, 0)} driven passing laps, ${Object.keys(library.laps).length} library laps (least clearance ${least.toFixed(2)} in, ${Math.round(size / 1024)} KB); conservative worst cross-track ${conservative.max_cross_track_in} in.`);
