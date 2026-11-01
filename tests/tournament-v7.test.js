'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const T = require('../tools/tournament-v7');

const ALL = { pGreenStart: 1, pEarlyStart: 0, pEnter: 1, pLapComplete: [1, 1, 1], pWallClean: [1, 1, 1],
  pObstacleClean: [1, 1, 1], pFlag: 1, pFinishInTime: 1, pUnder245: 1, pPark: 1, pRedCard: 0,
  attemptExchange: true, pitAfterLap: 2, pDropAssigned: 1, pDropOther: 0, pPickupAssigned: 1, pPickupOther: 0,
  pRetain: 1, pPitComplete: 1 };
const total = (d) => [...d.values()].reduce((a, b) => a + b, 0);

// Independent sampler following the documented phase semantics, used only to
// cross-check the exact dynamic program.
function sample(p, rand) {
  const u = rand();
  let s = u < p.pGreenStart ? 10 : u < p.pGreenStart + p.pEarlyStart ? -2 : 0;
  if (rand() >= p.pEnter) return rand() < p.pRedCard ? 0 : s;
  s += 25;
  let alive = true;
  for (let lap = 0; lap < 3 && alive; lap += 1) {
    if (lap === 2 && rand() < p.pFlag) s += 25;
    if (rand() >= p.pLapComplete[lap]) { alive = false; break; }
    if (rand() < p.pWallClean[lap]) s += 15;
    if (rand() < p.pObstacleClean[lap]) s += 25;
    if (p.attemptExchange && lap + 1 === p.pitAfterLap) {
      const d = rand();
      s += d < p.pDropAssigned ? 25 : d < p.pDropAssigned + p.pDropOther ? 12 : 0;
      const k = rand();
      const pickup = k < p.pPickupAssigned ? 40 : k < p.pPickupAssigned + p.pPickupOther ? 20 : 0;
      if (pickup && rand() < p.pRetain) s += pickup;
      if (rand() >= p.pPitComplete) alive = false;
    }
  }
  if (alive && rand() < p.pFinishInTime) {
    s += 100;
    if (rand() < p.pUnder245) s += 30;
    if (rand() < p.pPark) s += 15;
  }
  return rand() < p.pRedCard ? 0 : s;
}

function lcg(seed) {
  let x = seed >>> 0;
  return () => { x = (Math.imul(1664525, x) + 1013904223) >>> 0; return x / 2 ** 32; };
}

test('preset distributions are normalized and bounded', () => {
  for (const [name, p] of Object.entries(T.PROFILES)) {
    const d = T.matchDistribution(p);
    assert.ok(Math.abs(total(d) - 1) < 1e-12, name);
    for (const s of d.keys()) assert.ok(s >= -2 && s <= 390, `${name} support ${s}`);
  }
  assert.equal(Math.max(...T.matchDistribution(T.PROFILES['drive-only']).keys()), 325, 'drive-only forgoes 65 tire points');
});

test('all-success profile is a point mass at the score-v3 maximum', () => {
  const d = T.matchDistribution(ALL);
  assert.deepEqual([...d.entries()], [[390, 1]]);
  assert.equal(T.perfectScoreCrossCheck(), 390);
});

test('red card, early start and a stall at entry behave as documented', () => {
  assert.deepEqual([...T.matchDistribution({ ...ALL, pRedCard: 1 }).entries()], [[0, 1]]);
  const early = T.matchDistribution({ ...ALL, pGreenStart: 0, pEarlyStart: 1, pEnter: 0 });
  assert.deepEqual([...early.entries()], [[-2, 1]]);
  const stallInPit = T.matchDistribution({ ...ALL, pPitComplete: 0 });
  assert.deepEqual([...stallInPit.entries()], [[10 + 25 + 80 + 65, 1]], 'two clean laps plus exchange are kept');
});

test('exact distribution agrees with an independent Monte Carlo sampler', () => {
  for (const [name, p] of Object.entries(T.PROFILES)) {
    const exact = T.matchDistribution(p);
    const rand = lcg(20261031);
    const n = 120000;
    let sum = 0, high = 0;
    for (let i = 0; i < n; i += 1) { const s = sample(p, rand); sum += s; if (s >= 300) high += 1; }
    assert.ok(Math.abs(sum / n - T.mean(exact)) < 1.0, `${name} mean ${sum / n} vs ${T.mean(exact)}`);
    assert.ok(Math.abs(high / n - T.atLeast(exact, 300)) < 0.01, `${name} P(>=300)`);
  }
});

test('order statistics match closed forms', () => {
  const coin = new Map([[0, 0.5], [1, 0.5]]);
  assert.ok(Math.abs(T.orderStatistic(coin, 3, 1).get(1) - 0.875) < 1e-12);
  assert.ok(Math.abs(T.orderStatistic(coin, 3, 2).get(1) - 0.5) < 1e-12);
  assert.ok(Math.abs(T.orderStatistic(coin, 3, 3).get(1) - 0.125) < 1e-12);
  const d = T.matchDistribution(T.PROFILES['drive-only']);
  for (const k of [1, 2, 3]) assert.ok(Math.abs(total(T.orderStatistic(d, 3, k)) - 1) < 1e-12);
  assert.ok(T.mean(T.orderStatistic(d, 3, 1)) > T.mean(d));
  assert.throws(() => T.orderStatistic(coin, 3, 4), RangeError);
});

test('head-to-head is symmetric for identical distributions', () => {
  const d = T.matchDistribution(T.PROFILES['full-mission-pit-after-lap-2']);
  const h = T.headToHead(d, d);
  assert.ok(Math.abs(h.win - h.loss) < 1e-12);
  assert.ok(Math.abs(h.win + h.tie + h.loss - 1) < 1e-12);
});

test('break-even pit stall equalizes the metric and is more permissive for best of three', () => {
  const full = T.PROFILES['full-mission-pit-after-lap-2'], drive = T.PROFILES['drive-only'];
  const single = T.breakEvenPitStall(full, drive, T.mean);
  const best = T.breakEvenPitStall(full, drive, (d) => T.mean(T.orderStatistic(d, 3, 1)));
  const at = (stall) => T.mean(T.matchDistribution({ ...full, pPitComplete: 1 - stall }));
  assert.ok(Math.abs(at(single) - T.mean(T.matchDistribution(drive))) < 1e-6);
  assert.ok(best > single, `best-of-3 ${best} should exceed single ${single}`);
});

test('per-match probability needed for at least one success round-trips', () => {
  for (const target of [0.5, 0.8, 0.95]) {
    const p = T.perMatchForAtLeastOnce(target, 3);
    assert.ok(Math.abs(1 - (1 - p) ** 3 - target) < 1e-12);
  }
  assert.ok(Math.abs(T.perMatchForAtLeastOnce(0.8) - 0.41520) < 1e-4);
});

test('validation rejects malformed profiles', () => {
  assert.throws(() => T.matchDistribution({ ...ALL, pEnter: 1.2 }), /pEnter/);
  assert.throws(() => T.matchDistribution({ ...ALL, pWallClean: [1, 1] }), /pWallClean/);
  assert.throws(() => T.matchDistribution({ ...ALL, pitAfterLap: 3 }), /pitAfterLap/);
  assert.throws(() => T.matchDistribution({ ...ALL, pDropAssigned: 0.7, pDropOther: 0.4 }), /pDropAssigned/);
  assert.throws(() => T.matchDistribution({ ...ALL, attemptExchange: 'yes' }), /attemptExchange/);
});

test('written report matches a fresh analysis', () => {
  const dir = path.join(__dirname, '..', 'derived', 'tournament-v7');
  const report = T.analyze();
  assert.equal(fs.readFileSync(path.join(dir, 'report.json'), 'utf8'), `${JSON.stringify(report, null, 1)}\n`);
  assert.equal(fs.readFileSync(path.join(dir, 'summary.md'), 'utf8'), T.summaryMarkdown(report));
});
