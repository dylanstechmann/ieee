#!/usr/bin/env node
'use strict';
// Verifies Robot Studio v7 without rebuilding it (the build needs the npm toolchain in
// ~/.cache/ieee-studio-v7-build): input/output hashes, measured assembly invariants,
// part provenance, offline HTML and browser evidence.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), out = 'derived/robot-studio-v7';
const read = (f) => fs.readFileSync(path.join(root, f));
const json = (f) => JSON.parse(read(f).toString('utf8'));
const hash = (f) => crypto.createHash('sha256').update(read(f)).digest('hex');

function verify() {
  const build = json(`${out}/build-manifest.json`);
  for (const [f, h] of Object.entries(build.input_hashes)) assert.equal(hash(f), h, `stale build input ${f}`);
  assert.equal(hash(build.output.file), build.output.sha256, 'share/Robot-Studio-v7.html does not match the build manifest');
  assert.deepEqual(build.toolchain, { three: '0.170.0', esbuild: '0.24.0' });

  const parts = json(`${out}/parts.json`).parts;
  assert.deepEqual(parts.map((p) => p.id), ['motor', 'bracket', 'hub', 'wheel', 'caster']);
  for (const p of parts) {
    assert.equal(hash(p.step), p.step_sha256, `vendor STEP changed: ${p.step}`);
    assert.equal(hash(`${out}/${p.glb}`), p.glb_sha256, `mesh changed: ${p.glb}`);
    assert.equal(p.provenance, 'vendor CAD (Pololu STEP)');
  }
  const src = json('sources/hardware-2026-11-01/pololu/manifest.json');
  for (const d of src.downloads) {
    const f = fs.existsSync(path.join(root, 'sources/hardware-2026-11-01/pololu', d.file)) ? `sources/hardware-2026-11-01/pololu/${d.file}` : `sources/hardware-2026-11-01/pololu/step/${d.file}`;
    assert.equal(hash(f), d.sha256, `archived download changed: ${d.file}`);
  }

  const a = json(`${out}/assembly.json`), m = a.measurements, s = a.assembly;
  assert.equal(m.motor.shaft_offset, 7);
  assert.deepEqual(m.motor.shaft_diameter_and_flat, [6, 5.4]);
  assert.equal(m.motor.gearbox_diameter, 36.8);
  assert.equal(m.bracket.gearbox_center_above_mount_face, 18.4);
  assert.equal(m.bracket.slot_runs_perpendicular_to_mount_face, true);
  assert.equal(m.bracket.tapped_hole_depth_from_motor_side_face, 3.25);
  assert.deepEqual([m.hub.flange_radius, m.hub.flange_thickness, m.hub.collar_radius, m.hub.bore_radius], [12.7, 5, 6, 3]);
  assert.equal(m.wheel.outer_diameter, 80);
  assert.deepEqual([s.lateral_stack_mm.wheel_center, s.lateral_stack_mm.track, s.lateral_stack_mm.overall_width], [101, 202, 212]);
  assert.deepEqual([s.kit_nominal_mm.track, s.kit_nominal_mm.deck_top, s.kit_nominal_mm.bracket_tapped_hole_lateral_from_cad], [176, 21.6, 77.25]);
  const lift = Object.fromEntries(s.configurations.map((c) => [c.id, c.wheel_lift_above_casters_mm]));
  assert.deepEqual(lift, { 'kit-as-drawn': 7.09, 'shaft-up': -1.08, 'shaft-down': 0 });

  const html = read(build.output.file).toString('utf8');
  assert.ok(!/<script[^>]+src=/i.test(html) && !/<link[^>]+href=/i.test(html), 'page must be self-contained');
  assert.match(html, /SPDX-License-Identifier: MIT/, 'three.js license header missing from the bundle');
  for (const id of ['motor', 'bracket', 'hub', 'wheel', 'caster']) assert.ok(html.includes(read(`${out}/parts/${id}.glb`).toString('base64').slice(0, 2000)), `${id} mesh not embedded`);

  const ev = json(`${out}/browser-validation.json`);
  assert.equal(ev.html_sha256, build.output.sha256, 'browser evidence is for a different build');
  assert.equal(ev.screenshots.length, 6);
  for (const shot of ev.screenshots) {
    assert.equal(shot.exit, 0);
    assert.equal(shot.page_console_or_uncaught_lines, 0, `page errors in ${shot.file}`);
    assert.equal(hash(`${out}/screenshots/${shot.file}`), shot.sha256, `screenshot changed: ${shot.file}`);
  }
  return { status: 'passed', parts: parts.length, track_mm: s.lateral_stack_mm.track, kit_wheel_gap_mm: lift['kit-as-drawn'], screenshots: ev.screenshots.length, html_bytes: build.output.bytes };
}

module.exports = { verify };
if (require.main === module) console.log(JSON.stringify(verify(), null, 2));
