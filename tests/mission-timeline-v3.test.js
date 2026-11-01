'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { missionTimeline, DEFAULTS } = require('../tools/mission-timeline-v3.js');

const near = (a, b, tol = 0.02) => assert.ok(Math.abs(a - b) <= tol, `expected ~${b}, got ${a}`);

test('default mission matches hand-checked arithmetic', () => {
  const r = missionTimeline();
  near(r.lapPerimeterIn, 158.99); // 137 + 2*PI*3.5
  near(r.totalPathIn, 552.97);    // 3 laps + start + park + pit detour
  near(r.movingTimeS, 69.12);
  assert.equal(r.overheadS, 19);  // 2 + 3 + 6*2 + 2
  near(r.totalMissionS, 103.12);
  near(r.marginTo165S, 61.88);
  near(r.marginTo180S, 76.88);
  near(r.requiredCruiseInPerS.for150S, 4.77);
  near(r.requiredCruiseInPerS.for165S, 4.22);
});

test('required cruise inverts the model', () => {
  const r = missionTimeline();
  const cruise = r.requiredCruiseInPerS.for150S;
  const at = missionTimeline({ cruiseInPerS: cruise });
  near(at.totalMissionS, 150, 0.2); // requiredCruise is rounded to 2 decimals
  assert.ok(at.marginTo165S > 15);
});

test('defaults are conservative: every default mission clears both thresholds', () => {
  const r = missionTimeline();
  assert.ok(r.marginTo165S > 0, 'default mission should clear the strict 2:45 bonus');
  assert.ok(r.marginTo180S > 0, 'default mission should clear 3:00');
});

test('even a 20% slower cruise with a 10 s slower exchange still clears 2:45', () => {
  const r = missionTimeline({ cruiseInPerS: DEFAULTS.cruiseInPerS * 0.8, pitDwellS: DEFAULTS.pitDwellS + 10 });
  assert.ok(r.marginTo165S > 0, `expected positive margin, got ${r.marginTo165S}`);
});

test('unreachable targets return null required cruise', () => {
  const r = missionTimeline({ pitDwellS: 160 });
  assert.equal(r.requiredCruiseInPerS.for140S, null);
  assert.equal(r.requiredCruiseInPerS.for150S, null);
  assert.equal(r.requiredCruiseInPerS.for165S, null);
});

test('parameters propagate and validate', () => {
  const r = missionTimeline({ laps: 4, cruiseInPerS: 10 });
  assert.equal(r.parameters.laps, 4);
  assert.ok(r.totalPathIn > missionTimeline().totalPathIn);
  assert.throws(() => missionTimeline({ cruiseInPerS: 0 }), TypeError);
  assert.throws(() => missionTimeline({ laps: 2.5 }), TypeError);
  assert.throws(() => missionTimeline({ warpDrive: 1 }), TypeError);
  assert.throws(() => missionTimeline(null), TypeError);
});