#!/usr/bin/env node
'use strict';

// Expected-score model for the GM2 V3 mission (rules snapshot 2026-10-29).
// Inputs are human-estimated, unconditional success probabilities for each
// adjudicated credit in tools/score-v3.js; outputs are expected robot-task
// points, a per-credit contribution table, and a value-of-improvement
// ranking to guide engineering effort. This is planning arithmetic, not a
// rules engine, a referee, or a claim about any real match result.
//
// Usage: node strategy-v3.js [preset-name | input.json]

const fs = require('node:fs');

const POINTS = Object.freeze({
  enter: 25,
  finish: 100,
  speedBonus: 30,
  greenStart: 10,
  park: 15,
  dropAssigned: 25,
  pickupAssigned: 40,
  wallLap: 15,
  obstacleLap: 25,
  flag: 25,
  publicity: 10,
  earlyStartPenalty: -2,
});

const prob = (v, name) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) {
    throw new TypeError(`${name} must be a number in [0, 1]`);
  }
  return v;
};

const laps3 = (v, name) => {
  if (!Array.isArray(v) || v.length !== 3) {
    throw new TypeError(`${name} must contain exactly three numbers in [0, 1]`);
  }
  return v.map((x, i) => prob(x, `${name}[${i}]`));
};

function expectedScore(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input must be an object');
  const p = {
    pEnter: prob(input.pEnter ?? 0, 'pEnter'),
    pGreenStart: prob(input.pGreenStart ?? 0, 'pGreenStart'),
    pEarlyStart: prob(input.pEarlyStart ?? 0, 'pEarlyStart'),
    pFinish: prob(input.pFinish ?? 0, 'pFinish'),
    pSpeedBonus: prob(input.pSpeedBonus ?? 0, 'pSpeedBonus'),
    pParkAssigned: prob(input.pParkAssigned ?? 0, 'pParkAssigned'),
    pDropAssigned: prob(input.pDropAssigned ?? 0, 'pDropAssigned'),
    pPickupAssigned: prob(input.pPickupAssigned ?? 0, 'pPickupAssigned'),
    pFlag: prob(input.pFlag ?? 0, 'pFlag'),
    pPublicity: prob(input.pPublicity ?? 0, 'pPublicity'),
    pRedCard: prob(input.pRedCard ?? 0, 'pRedCard'),
    pWallCleanLaps: laps3(input.pWallCleanLaps ?? [0, 0, 0], 'pWallCleanLaps'),
    pObstacleCleanLaps: laps3(input.pObstacleCleanLaps ?? [0, 0, 0], 'pObstacleCleanLaps'),
  };
  const delta = prob(input.improvementDelta ?? 0.05, 'improvementDelta');
  if (delta <= 0) throw new TypeError('improvementDelta must be positive');

  const contributions = {
    enter: POINTS.enter * p.pEnter,
    greenStart: POINTS.greenStart * p.pGreenStart,
    earlyStartPenalty: POINTS.earlyStartPenalty * p.pEarlyStart,
    finish: POINTS.finish * p.pFinish,
    speedBonus: POINTS.speedBonus * p.pSpeedBonus,
    park: POINTS.park * p.pParkAssigned,
    dropAssigned: POINTS.dropAssigned * p.pDropAssigned,
    pickupAssigned: POINTS.pickupAssigned * p.pPickupAssigned,
    wallLaps: POINTS.wallLap * p.pWallCleanLaps.reduce((a, b) => a + b, 0),
    obstacleLaps: POINTS.obstacleLap * p.pObstacleCleanLaps.reduce((a, b) => a + b, 0),
    flag: POINTS.flag * p.pFlag,
    publicity: POINTS.publicity * p.pPublicity,
  };
  const robotTasks = Object.entries(contributions)
    .filter(([k]) => k !== 'publicity')
    .reduce((a, [, v]) => a + v, 0);
  const redCardFactor = 1 - p.pRedCard; // Red Card zeroes the match score; publicity assumed to survive it.
  const round2 = (x) => Math.round(x * 100) / 100;

  const rankEntry = (name, current, points) => ({
    input: name,
    currentValue: current,
    deltaEVForPlusDelta: round2(points * Math.min(delta, 1 - current)),
  });
  const ranking = [
    rankEntry('pEnter', p.pEnter, POINTS.enter),
    rankEntry('pGreenStart', p.pGreenStart, POINTS.greenStart),
    rankEntry('pFinish', p.pFinish, POINTS.finish),
    rankEntry('pSpeedBonus', p.pSpeedBonus, POINTS.speedBonus),
    rankEntry('pParkAssigned', p.pParkAssigned, POINTS.park),
    rankEntry('pDropAssigned', p.pDropAssigned, POINTS.dropAssigned),
    rankEntry('pPickupAssigned', p.pPickupAssigned, POINTS.pickupAssigned),
    rankEntry('pFlag', p.pFlag, POINTS.flag),
    ...p.pWallCleanLaps.map((v, i) => rankEntry(`pWallCleanLaps[${i}]`, v, POINTS.wallLap)),
    ...p.pObstacleCleanLaps.map((v, i) => rankEntry(`pObstacleCleanLaps[${i}]`, v, POINTS.obstacleLap)),
  ].sort((a, b) => b.deltaEVForPlusDelta - a.deltaEVForPlusDelta);

  return {
    ruleSet: 'GM2-V3-2026-10-04',
    expectedRobotTasks: round2(robotTasks * redCardFactor),
    expectedWithPublicity: round2(robotTasks * redCardFactor + contributions.publicity),
    contributions,
    redCardFactor,
    improvementDelta: delta,
    improvementRanking: ranking,
    notes: [
      'All probabilities are unconditional over the whole match; if your estimates are conditional on finishing, scale dependent credits by pFinish before using them here.',
      'Expected value is linear in each probability, so correlation between failures does not change these totals, only the spread. Reliability gains compound in ways this table understates.',
      'Tire credits assume the assigned box (25/40); other-location fallbacks are 12/20 and are not modeled.',
      'Publicity is assumed to survive a Red Card; the Red Card is assumed to zero only the match score.',
      'Not a rules engine; referee decisions and official Q&A govern.',
    ],
  };
}

// Scenario presets. These are planning assumptions, not measurements; each
// number should be replaced by bench-test estimates as evidence arrives.
const PRESETS = {
  conservative: {
    pEnter: 0.90, pGreenStart: 0.85, pEarlyStart: 0.10, pFinish: 0.65, pSpeedBonus: 0.55,
    pParkAssigned: 0.70, pDropAssigned: 0.60, pPickupAssigned: 0.50, pFlag: 0.75,
    pPublicity: 1.0, pRedCard: 0.02,
    pWallCleanLaps: [0.75, 0.65, 0.60], pObstacleCleanLaps: [0.55, 0.45, 0.45],
  },
  neutral: {
    pEnter: 0.95, pGreenStart: 0.90, pEarlyStart: 0.05, pFinish: 0.80, pSpeedBonus: 0.75,
    pParkAssigned: 0.85, pDropAssigned: 0.80, pPickupAssigned: 0.65, pFlag: 0.90,
    pPublicity: 1.0, pRedCard: 0.01,
    pWallCleanLaps: [0.85, 0.80, 0.80], pObstacleCleanLaps: [0.70, 0.65, 0.65],
  },
  optimistic: {
    pEnter: 0.98, pGreenStart: 0.95, pEarlyStart: 0.03, pFinish: 0.92, pSpeedBonus: 0.90,
    pParkAssigned: 0.93, pDropAssigned: 0.90, pPickupAssigned: 0.85, pFlag: 0.95,
    pPublicity: 1.0, pRedCard: 0.005,
    pWallCleanLaps: [0.93, 0.92, 0.92], pObstacleCleanLaps: [0.85, 0.82, 0.82],
  },
};

module.exports = { expectedScore, POINTS, PRESETS };

if (require.main === module) {
  try {
    if (process.argv.length > 3) throw new Error('Usage: node strategy-v3.js [preset-name | input.json]');
    const arg = process.argv[2] ?? 'neutral';
    const input = PRESETS[arg] ?? JSON.parse(fs.readFileSync(arg, 'utf8'));
    console.log(JSON.stringify(expectedScore(input), null, 2));
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}