'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { verify } = require('../tools/verify-apriltag-41h12-v7');

test('sealed AprilTag 41h12 package verifies against its manifest and quoted figures', () => {
  const r = verify();
  assert.equal(r.status, 'passed');
  assert.deepEqual(r.tags, [1, 2, 3]);
  assert.equal(r.sweep_detections, 7040);
  assert.equal(r.opencv_has_41h12, false);
  assert.equal(r.physical_trials, 0);
});
