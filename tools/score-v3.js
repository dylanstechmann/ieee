#!/usr/bin/env node
'use strict';

// Provisional arithmetic over referee-style achievement decisions, not a rules engine.
const fs = require('node:fs');
const bool = (value, name) => {
  if (typeof value !== 'boolean') throw new TypeError(`${name} must be a boolean`);
  return value;
};
const choice = (value, name) => {
  if (!['none', 'assigned', 'other'].includes(value)) throw new TypeError(`${name} must be none, assigned, or other`);
  return value;
};

function score(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input must be an object');
  const required = ['enteredCourse', 'greenStart', 'earlyStart', 'finishedInAssignedBox', 'flagOnFinalLap', 'publicity', 'redCard'];
  for (const key of required) bool(input[key], key);
  for (const key of ['cleanWallLaps', 'cleanObstacleLaps']) {
    if (!Array.isArray(input[key]) || input[key].length !== 3) throw new TypeError(`${key} must contain exactly three booleans`);
    input[key].forEach((v, i) => bool(v, `${key}[${i}]`));
  }
  const drop = choice(input.tireDrop, 'tireDrop');
  const pickup = choice(input.tirePickup, 'tirePickup');
  if (input.finishSeconds !== null && (typeof input.finishSeconds !== 'number' || !Number.isFinite(input.finishSeconds) || input.finishSeconds < 0 || input.finishSeconds > 180)) throw new TypeError('finishSeconds must be null or a finite number from 0 to 180');
  if (input.redCard) return { ruleSet: 'GM2-V3-2026-10-04', total: 0, breakdown: { redCardOverride: 0 }, warnings: ['Red Card sets match score to zero; referee decisions and official Q&A govern.'] };
  const b = {
    courseEntry: input.enteredCourse ? 25 : 0,
    finish: input.finishSeconds !== null ? 100 : 0,
    speed: input.finishSeconds !== null && input.finishSeconds < 165 ? 30 : 0,
    greenStart: input.greenStart && !input.earlyStart ? 10 : 0,
    finalParking: input.finishedInAssignedBox ? 15 : 0,
    tireDrop: { none: 0, assigned: 25, other: 12 }[drop],
    tirePickup: { none: 0, assigned: 40, other: 20 }[pickup],
    wallLaps: input.cleanWallLaps.filter(Boolean).length * 15,
    obstacleLaps: input.cleanObstacleLaps.filter(Boolean).length * 25,
    finalLapFlag: input.flagOnFinalLap ? 25 : 0,
    publicity: input.publicity ? 10 : 0,
    earlyStartPenalty: input.earlyStart ? -2 : 0,
  };
  return { ruleSet: 'GM2-V3-2026-10-04', total: Object.values(b).reduce((a, x) => a + x, 0), breakdown: b, warnings: ['Inputs are adjudicated scoring credits, not raw sensor observations; retention, timing, pit boundaries, publicity, and Q&A require human review.', ...(input.earlyStart ? ['Early start also incurs a Yellow Card; escalation is not inferred.'] : [])] };
}

module.exports = { score };
if (require.main === module) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node score-v3.js input.json');
    console.log(JSON.stringify(score(JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))), null, 2));
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}