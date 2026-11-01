#!/usr/bin/env node
'use strict';

// Mission timeline feasibility model for the GM2 V3 stock-car mission
// (rules snapshot 2026-10-29). Converts the dimension-constrained field
// (constrained-field-v3.json / field-v3.parameters.json) plus drivetrain
// and pit-stop parameters into total mission time, margins against the
// strict 165-second (2:45) and 180-second (3:00) thresholds, and the cruise
// speed required to hit a target time. Geometry inputs are provisional;
// every default is overridable. This is planning arithmetic, not a
// qualification of any real run.
//
// Lap path model: the robot laps outside the octagonal marking. Offsetting
// a convex polygon outward by o gives perimeter P + 2*PI*o. Marking
// perimeter from verified callouts: 2*36.75 + 2*12.25 + 4*9.75 = 137 in.
//
// Usage: node mission-timeline-v3.js [input.json]   (defaults if omitted)

const fs = require('node:fs');

const DEFAULTS = Object.freeze({
  markingPerimeterIn: 137, // from vision-verified callouts; see STRATEGY-AND-ARCHITECTURE.md
  laneOffsetIn: 3.5,       // robot centerline offset outward from the marking
  laps: 3,
  startLegIn: 20,          // start box -> first checkered crossing
  parkLegIn: 20,           // final crossing -> parked in the assigned box
  pitDetourIn: 36,         // extra in/out distance for the mid-match pit stop
  pitDwellS: 15,           // stationary exchange time (drop red + pick blue)
  cruiseInPerS: 8,         // sustained cruise speed, inches per second
  startOverheadS: 2,       // spin-up and initial alignment
  pitManeuverOverheadS: 3, // slow-in / slow-out at the pit mouth
  obstacleSlowdowns: 6,    // obstacle-zone passes at reduced speed
  obstacleSlowPenaltyS: 2,
  finalOverheadS: 2,       // final alignment and stop
});

const num = (v, name, positiveOnly) => {
  const ok = typeof v === 'number' && Number.isFinite(v) && (positiveOnly ? v > 0 : v >= 0);
  if (!ok) throw new TypeError(`${name} must be a finite ${positiveOnly ? 'positive' : 'non-negative'} number`);
  return v;
};

function missionTimeline(overrides = {}) {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
    throw new TypeError('overrides must be an object');
  }
  const p = { ...DEFAULTS };
  for (const [k, v] of Object.entries(overrides)) {
    if (!(k in DEFAULTS)) throw new TypeError(`unknown parameter "${k}"`);
    p[k] = v;
  }
  num(p.markingPerimeterIn, 'markingPerimeterIn', true);
  num(p.laneOffsetIn, 'laneOffsetIn', false);
  num(p.startLegIn, 'startLegIn', false);
  num(p.parkLegIn, 'parkLegIn', false);
  num(p.pitDetourIn, 'pitDetourIn', false);
  num(p.pitDwellS, 'pitDwellS', false);
  num(p.cruiseInPerS, 'cruiseInPerS', true);
  num(p.startOverheadS, 'startOverheadS', false);
  num(p.pitManeuverOverheadS, 'pitManeuverOverheadS', false);
  num(p.obstacleSlowdowns, 'obstacleSlowdowns', false);
  num(p.obstacleSlowPenaltyS, 'obstacleSlowPenaltyS', false);
  num(p.finalOverheadS, 'finalOverheadS', false);
  if (!Number.isInteger(p.laps) || p.laps < 1) throw new TypeError('laps must be an integer >= 1');

  const lapPerimeterIn = p.markingPerimeterIn + 2 * Math.PI * p.laneOffsetIn;
  const totalPathIn = p.laps * lapPerimeterIn + p.startLegIn + p.parkLegIn + p.pitDetourIn;
  const overheadS = p.startOverheadS + p.pitManeuverOverheadS
    + p.obstacleSlowdowns * p.obstacleSlowPenaltyS + p.finalOverheadS;
  const movingS = totalPathIn / p.cruiseInPerS;
  const totalS = movingS + p.pitDwellS + overheadS;
  const round2 = (x) => Math.round(x * 100) / 100;
  const requiredCruiseFor = (targetS) =>
    targetS <= p.pitDwellS + overheadS ? null : totalPathIn / (targetS - p.pitDwellS - overheadS);
  const timeAt = (cruise, dwell = p.pitDwellS) => totalPathIn / cruise + dwell + overheadS;

  return {
    ruleSet: 'GM2-V3-2026-10-04',
    lapPerimeterIn: round2(lapPerimeterIn),
    totalPathIn: round2(totalPathIn),
    movingTimeS: round2(movingS),
    pitDwellS: p.pitDwellS,
    overheadS,
    totalMissionS: round2(totalS),
    marginTo165S: round2(165 - totalS),
    marginTo180S: round2(180 - totalS),
    requiredCruiseInPerS: {
      for140S: requiredCruiseFor(140) === null ? null : round2(requiredCruiseFor(140)),
      for150S: requiredCruiseFor(150) === null ? null : round2(requiredCruiseFor(150)),
      for165S: requiredCruiseFor(165) === null ? null : round2(requiredCruiseFor(165)),
    },
    sensitivity: {
      cruise20pctSlowerS: round2(timeAt(p.cruiseInPerS * 0.8)),
      cruise20pctFasterS: round2(timeAt(p.cruiseInPerS * 1.2)),
      dwellPlus10S: round2(timeAt(p.cruiseInPerS, p.pitDwellS + 10)),
      noObstacleSlowdownsS: round2(totalS - p.obstacleSlowdowns * p.obstacleSlowPenaltyS),
    },
    parameters: p,
    notes: [
      'Geometry from vision-verified callouts (marking perimeter 137 in); the marking is assumed drivable paint, so the offset path is a navigation choice, not a hard boundary - see STRATEGY-AND-ARCHITECTURE.md.',
      'The 165-second threshold is strict (less than 2:45); 180 seconds permits equality. Whether the clock stops at the final checkered crossing or after parking is an open Q&A; this model conservatively includes the parking leg.',
      'Not a qualification of any real run; referee decisions and official Q&A govern.',
    ],
  };
}

module.exports = { missionTimeline, DEFAULTS };

if (require.main === module) {
  try {
    if (process.argv.length > 3) throw new Error('Usage: node mission-timeline-v3.js [input.json]');
    const input = process.argv.length === 3 ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) : {};
    console.log(JSON.stringify(missionTimeline(input), null, 2));
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}