'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const M = require('../tools/drivetrain-mule-v10');
const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'drivetrain-mule-v10.json'), 'utf8'));

test('mule v10 verifier passes', () => {
  const out = execFileSync(process.execPath, [path.join(root, 'tools/verify-drivetrain-mule-v10.js')], {encoding: 'utf8'});
  assert.match(out, /Verified mule v10/);
});

test('caliper measurements change the riser and the holes, not the method', () => {
  const measured = {date: '2026-11-20', measured_by: 'SYNTHETIC-TEST', values: {caster_height_mm: 13.0, shaft_offset_mm: 7.2}};
  const g = M.resolve(config, measured);
  // deck top = 40 - (18.4 - 7.2) = 28.8; bottom 23.8; riser = 23.8 - 3.175 - 13.0 = 7.625
  assert.equal(g.deck.top_above_floor_mm, 28.8);
  assert.equal(g.riser.height_mm, 7.63);
  assert.match(g.basis, /SYNTHETIC-TEST/);
  assert.ok(Math.abs(g.checks.find(c => c.id === 'caster-contact').value_mm) <= 0.005);
});

test('unknown or invalid measurements are rejected', () => {
  assert.throws(() => M.resolve(config, {values: {deck_color: 3}}), /unknown measurement/);
  assert.throws(() => M.resolve(config, {values: {caster_height_mm: -1}}), /positive number/);
});

test('the v10 analyzer reports progress on a blank E02 log without issuing passes', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mule-v10-'));
  try {
    const output = path.join(temp, 'progress.json');
    execFileSync(process.execPath, [path.join(root, 'tools/mule-measurements-v10.js'), '--kind', 'E02', '--input', path.join(root, 'derived/drivetrain-mule-v10/templates/E02-characterization.csv'), '--output', output, '--progress']);
    const summary = JSON.parse(fs.readFileSync(output, 'utf8'));
    assert.match(summary.status, /progress-only/);
    assert.equal(summary.provenance.config_file, 'drivetrain-mule-v10.json');
  } finally {
    fs.rmSync(temp, {recursive: true, force: true});
  }
});
