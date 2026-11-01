'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { verify } = require('../tools/verify-robot-studio-v7');

test('Robot Studio v7 build, vendor-CAD provenance, assembly findings and browser evidence verify', () => {
  const r = verify();
  assert.equal(r.status, 'passed');
  assert.equal(r.parts, 5);
  assert.equal(r.track_mm, 202);
  assert.equal(r.kit_wheel_gap_mm, 7.09);
  assert.equal(r.screenshots, 6);
});
