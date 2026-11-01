'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { expectedScore, POINTS, PRESETS } = require('../tools/strategy-v3.js');

const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `expected ~${b}, got ${a}`);

test('points table matches the GM2 V3 3.6 scoring snapshot', () => {
  assert.deepEqual({ ...POINTS }, {
    enter: 25, finish: 100, speedBonus: 30, greenStart: 10, park: 15,
    dropAssigned: 25, pickupAssigned: 40, wallLap: 15, obstacleLap: 25,
    flag: 25, publicity: 10, earlyStartPenalty: -2,
  });
});

test('a perfect-credit profile yields the nominal 390 robot-task points', () => {
  const r = expectedScore({
    pEnter: 1, pGreenStart: 1, pEarlyStart: 0, pFinish: 1, pSpeedBonus: 1,
    pParkAssigned: 1, pDropAssigned: 1, pPickupAssigned: 1, pFlag: 1,
    pPublicity: 1, pRedCard: 0, pWallCleanLaps: [1, 1, 1], pObstacleCleanLaps: [1, 1, 1],
  });
  near(r.expectedRobotTasks, 390);
  near(r.expectedWithPublicity, 400);
  near(r.contributions.wallLaps, 45);
  near(r.contributions.obstacleLaps, 75);
  near(r.contributions.finish, 100);
});

test('an all-zero profile yields zero', () => {
  const r = expectedScore({});
  assert.equal(r.expectedRobotTasks, 0);
  assert.equal(r.expectedWithPublicity, 0);
});

test('preset expected values match hand arithmetic', () => {
  near(expectedScore(PRESETS.neutral).expectedRobotTasks, 300.12);
  near(expectedScore(PRESETS.neutral).expectedWithPublicity, 310.12);
  near(expectedScore(PRESETS.conservative).expectedRobotTasks, 237.94);
  near(expectedScore(PRESETS.optimistic).expectedRobotTasks, 349.19);
});

test('presets are ordered conservative < neutral < optimistic', () => {
  const c = expectedScore(PRESETS.conservative).expectedRobotTasks;
  const n = expectedScore(PRESETS.neutral).expectedRobotTasks;
  const o = expectedScore(PRESETS.optimistic).expectedRobotTasks;
  assert.ok(c < n && n < o, `expected ${c} < ${n} < ${o}`);
});

test('neutral ranking puts mission completion first', () => {
  const r = expectedScore(PRESETS.neutral);
  assert.equal(r.improvementRanking[0].input, 'pFinish');
  near(r.improvementRanking[0].deltaEVForPlusDelta, 5.0);
});

test('red card handling', () => {
  const zeroed = expectedScore({ pRedCard: 1, pPublicity: 1 });
  assert.equal(zeroed.expectedRobotTasks, 0);
  assert.equal(zeroed.expectedWithPublicity, 10); // publicity assumed to survive
  const half = expectedScore({ pFinish: 1, pRedCard: 0.5 });
  near(half.expectedRobotTasks, 50);
});

test('validation rejects bad inputs', () => {
  assert.throws(() => expectedScore({ pEnter: 1.5 }), TypeError);
  assert.throws(() => expectedScore({ pWallCleanLaps: [0.5, 0.5] }), TypeError);
  assert.throws(() => expectedScore({ pObstacleCleanLaps: [0.5, 0.5, 2] }), TypeError);
  assert.throws(() => expectedScore({ improvementDelta: 0 }), TypeError);
  assert.throws(() => expectedScore(null), TypeError);
});