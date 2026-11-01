'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { verify } = require('../tools/verify-robot-studio-v8');
const { presentationFrame, sampledPresentationBox } = require('../robot-studio-v8/study-core');
const mechanism = require('../derived/mechanism-envelope-v6/report.json');

test('Robot Studio v8 reproduces and retains both engineering lineages', () => {
  const result = verify();
  assert.equal(result.status, 'passed');
  assert.equal(result.stoppingRuns, 56);
  assert.equal(result.mechanismCases, 162);
  assert.equal(result.mechanismFrames, 2970);
  assert.equal(result.historicalTrackMm, 176);
  assert.equal(result.vendorTrackMm, 202);
  assert.equal(result.browserChecks.mechanism, 486);
});

test('stationary-tire presentation preserves the source-relative mechanism study', () => {
  for (const c of mechanism.cases) {
    const first = presentationFrame(c, 0);
    const last = presentationFrame(c, c.frames.length - 1);
    assert.deepEqual(first.offset, [0, 0, 0]);
    assert.deepEqual(last.reference, first.reference);
    assert.deepEqual(last.frame.tire_center_mm.map((v, i) => v + last.offset[i]), first.reference);
    const swept = sampledPresentationBox(c);
    assert.ok(swept.max.every((v, i) => v >= swept.min[i]));
  }
});
