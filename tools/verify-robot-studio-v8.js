#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { build, data } = require('./build-robot-studio-v8');
const { presentationFrame, sampledPresentationBox, tireVertices, studySummary } = require('../robot-studio-v8/study-core');

const root = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f));
const json = (f) => JSON.parse(read(f).toString('utf8'));
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex');

function verify({ browser = true } = {}) {
  const manifest = json('derived/robot-studio-v8/build-manifest.json');
  for (const [file, expected] of Object.entries(manifest.input_hashes)) assert.equal(hash(read(file)), expected, `Stale input: ${file}`);
  assert.equal(hash(read(manifest.output.file)), manifest.output.sha256, 'HTML differs from manifest');
  assert.equal(build().html, read(manifest.output.file).toString('utf8'), 'HTML is not reproducible');
  const d = data(), summary = studySummary(d);
  assert.deepEqual(summary, { stoppingRuns: 56, mechanismCases: 162, mechanismFrames: 2970, historicalTrackMm: 176, vendorTrackMm: 202, physicalTrials: 0 });
  assert.equal(d.stoppingConfig.vehicle.track_m, 0.176, 'Historical track must remain explicit');
  assert.equal(d.assembly.assembly.lateral_stack_mm.track, 202);
  assert.equal(d.assembly.assembly.configurations[0].wheel_lift_above_casters_mm, 7.09);
  for (const c of d.mechanism.cases) {
    const p = presentationFrame(c, 0);
    assert.deepEqual(p.offset, [0, 0, 0]);
    const swept = sampledPresentationBox(c);
    for (let i = 0; i < c.frames.length; i += 1) {
      const q = presentationFrame(c, i);
      assert.deepEqual(q.reference, c.frames[0].tire_center_mm);
      for (let axis = 0; axis < 3; axis += 1) {
        assert.ok(swept.min[axis] <= q.frame.assembly_box.min[axis] + q.offset[axis]);
        assert.ok(swept.max[axis] >= q.frame.assembly_box.max[axis] + q.offset[axis]);
      }
    }
    const vertices = tireVertices(d, c);
    assert.equal(vertices.length, 16140);
    assert.ok(vertices.flat().every(Number.isFinite));
  }
  const html = read(manifest.output.file).toString('utf8');
  assert.ok(!/<script[^>]+src=/i.test(html) && !/<link[^>]+href=/i.test(html), 'Studio must be self-contained');
  assert.match(html, /SPDX-License-Identifier: MIT/);
  for (const text of ['Historical v6.1 data uses a 176 mm track', 'not a legal route', 'no physical validation']) assert.ok(html.toLowerCase().includes(text.toLowerCase()), `Missing boundary: ${text}`);
  let browserChecks = null;
  if (browser) {
    const evidence = json('derived/robot-studio-v8/browser-validation.json');
    assert.equal(evidence.html_sha256, manifest.output.sha256, 'Browser evidence is stale');
    assert.deepEqual(evidence.errors, []);
    assert.deepEqual(evidence.externalRequests, []);
    assert.equal(evidence.mechanismChecks.length, 486);
    assert.equal(evidence.stoppingChecks.length, 56);
    assert.equal(evidence.stoppingInteraction.scenario, 'turning');
    assert.equal(evidence.stoppingInteraction.mode, 'dynamic-brake');
    assert.equal(evidence.stoppingInteraction.studyIndex, 1);
    assert.equal(evidence.mechanismInteraction.caseIndex, 5);
    assert.equal(evidence.mechanismInteraction.studyIndex, 1);
    for (const shot of evidence.screenshots) assert.equal(hash(read(`derived/robot-studio-v8/${shot.file}`)), shot.sha256);
    browserChecks = { mechanism: evidence.mechanismChecks.length, stopping: evidence.stoppingChecks.length, screenshots: evidence.screenshots.length };
  }
  return { status: 'passed', ...summary, browserChecks };
}

module.exports = { verify };
if (require.main === module) console.log(JSON.stringify(verify({ browser: !process.argv.includes('--no-browser') }), null, 2));
