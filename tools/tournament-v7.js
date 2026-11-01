#!/usr/bin/env node
'use strict';

// Tournament-aware score model for the GM2 V3 Stock Car Race (rules snapshot
// 2026-10-04 manuals, archived 2026-10-29). GM1 V3 §4.7.1 ranks Qualification
// by each Team's BEST of three Matches (ties broken by second- and third-best);
// Elimination Matches are single head-to-head Matches (GM1 V3 §3.3.1, §4.8–4.9).
//
// A Match is modeled as an ordered phase chain. A failed phase (stall, lost,
// off course) ends the run and keeps credits already earned; credits within a
// phase are independent. The output is the exact single-Match score
// distribution, from which best-of-3 order statistics, head-to-head odds and
// break-even pit-stall risks follow. Every probability is a planning
// assumption to be replaced by bench measurements. Publicity (10) is excluded:
// it does not depend on robot behavior. Not a rules engine or a prediction.
//
// Usage: node tools/tournament-v7.js [--write]

const fs = require('node:fs');
const path = require('node:path');
const { score } = require('./score-v3');

const RULE_SET = 'GM2-V3-2026-10-04 + GM1-V3-2026-09-18';

const PROB_KEYS = ['pGreenStart', 'pEarlyStart', 'pEnter', 'pFlag', 'pFinishInTime', 'pUnder245', 'pPark',
  'pRedCard', 'pDropAssigned', 'pDropOther', 'pPickupAssigned', 'pPickupOther', 'pRetain', 'pPitComplete'];
const LAP_KEYS = ['pLapComplete', 'pWallClean', 'pObstacleClean'];

function validate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('profile must be an object');
  const p = {};
  for (const k of PROB_KEYS) {
    const v = input[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1) throw new TypeError(`${k} must be a number in [0, 1]`);
    p[k] = v;
  }
  for (const k of LAP_KEYS) {
    const v = input[k];
    if (!Array.isArray(v) || v.length !== 3 || v.some((x) => typeof x !== 'number' || !Number.isFinite(x) || x < 0 || x > 1)) {
      throw new TypeError(`${k} must contain exactly three numbers in [0, 1]`);
    }
    p[k] = [...v];
  }
  if (typeof input.attemptExchange !== 'boolean') throw new TypeError('attemptExchange must be a boolean');
  if (![1, 2].includes(input.pitAfterLap)) throw new TypeError('pitAfterLap must be 1 or 2');
  p.attemptExchange = input.attemptExchange;
  p.pitAfterLap = input.pitAfterLap;
  for (const [a, b] of [['pGreenStart', 'pEarlyStart'], ['pDropAssigned', 'pDropOther'], ['pPickupAssigned', 'pPickupOther']]) {
    if (p[a] + p[b] > 1 + 1e-12) throw new TypeError(`${a} + ${b} must not exceed 1`);
  }
  return p;
}

// Exact distribution of one Match score as a Map score -> probability.
function matchDistribution(profile) {
  const p = validate(profile);
  let alive = new Map([[0, 1]]);
  const done = new Map();
  const add = (m, s, pr) => { if (pr > 0) m.set(s, (m.get(s) ?? 0) + pr); };
  const step = (branches) => {
    const next = new Map();
    for (const [s, pr] of alive) for (const b of branches) add(b.continues ? next : done, s + b.points, pr * b.p);
    alive = next;
  };
  const go = (pr, points) => ({ p: pr, points, continues: true });
  const stop = (pr) => ({ p: pr, points: 0, continues: false });

  step([go(p.pGreenStart, 10), go(p.pEarlyStart, -2), go(1 - p.pGreenStart - p.pEarlyStart, 0)]);
  step([go(p.pEnter, 25), stop(1 - p.pEnter)]);
  for (let lap = 0; lap < 3; lap += 1) {
    if (lap === 2) step([go(p.pFlag, 25), go(1 - p.pFlag, 0)]);
    const c = p.pLapComplete[lap], w = p.pWallClean[lap], o = p.pObstacleClean[lap];
    step([go(c * w * o, 40), go(c * w * (1 - o), 15), go(c * (1 - w) * o, 25), go(c * (1 - w) * (1 - o), 0), stop(1 - c)]);
    if (p.attemptExchange && lap + 1 === p.pitAfterLap) {
      step([go(p.pDropAssigned, 25), go(p.pDropOther, 12), go(1 - p.pDropAssigned - p.pDropOther, 0)]);
      const pa = p.pPickupAssigned * p.pRetain, po = p.pPickupOther * p.pRetain;
      step([go(pa, 40), go(po, 20), go(1 - pa - po, 0)]);
      step([go(p.pPitComplete, 0), stop(1 - p.pPitComplete)]);
    }
  }
  const f = p.pFinishInTime, u = p.pUnder245, k = p.pPark;
  step([go(f * u * k, 145), go(f * u * (1 - k), 130), go(f * (1 - u) * k, 115), go(f * (1 - u) * (1 - k), 100), go(1 - f, 0)]);
  for (const [s, pr] of alive) add(done, s, pr);
  const out = new Map();
  for (const [s, pr] of done) add(out, s, pr * (1 - p.pRedCard));
  add(out, 0, p.pRedCard);
  return new Map([...out.entries()].sort((a, b) => a[0] - b[0]));
}

const sorted = (dist) => [...dist.entries()].sort((a, b) => a[0] - b[0]);
const mean = (dist) => sorted(dist).reduce((a, [s, pr]) => a + s * pr, 0);

function cdf(dist) {
  let acc = 0;
  return sorted(dist).map(([s, pr]) => { acc += pr; return [s, Math.min(1, acc)]; });
}

// Distribution of the k-th best of n iid Matches (k = 1 is the maximum).
function orderStatistic(dist, n = 3, k = 1) {
  if (!Number.isInteger(n) || n < 1 || !Number.isInteger(k) || k < 1 || k > n) throw new RangeError('need 1 <= k <= n');
  const choose = (a, b) => { let r = 1; for (let i = 1; i <= b; i += 1) r = (r * (a - b + i)) / i; return r; };
  const atMost = (F) => { // P(k-th best <= s) = P(at least n-k+1 of n are <= s)
    let total = 0;
    for (let j = n - k + 1; j <= n; j += 1) total += choose(n, j) * F ** j * (1 - F) ** (n - j);
    return total;
  };
  const out = new Map();
  let prev = 0;
  for (const [s, F] of cdf(dist)) { const g = atMost(F); out.set(s, Math.max(0, g - prev)); prev = g; }
  return out;
}

const atLeast = (dist, threshold) => sorted(dist).filter(([s]) => s >= threshold).reduce((a, [, pr]) => a + pr, 0);

function quantile(dist, q) {
  for (const [s, F] of cdf(dist)) if (F >= q - 1e-12) return s;
  return sorted(dist).at(-1)[0];
}

function headToHead(a, b) {
  const bc = cdf(b);
  const below = (x) => { let r = 0; for (const [s, F] of bc) { if (s < x) r = F; else break; } return r; };
  let win = 0, tie = 0;
  for (const [s, pr] of sorted(a)) { win += pr * below(s); tie += pr * (b.get(s) ?? 0); }
  return { win, tie, loss: Math.max(0, 1 - win - tie) };
}

// Largest pit-stall risk (1 - pPitComplete) at which `exchange` still matches
// `baseline` on the chosen metric; bisection on a monotone function.
function breakEvenPitStall(exchange, baseline, metric) {
  const target = metric(matchDistribution(baseline));
  const value = (stall) => metric(matchDistribution({ ...exchange, pPitComplete: 1 - stall }));
  if (value(0) <= target) return 0;
  if (value(1) >= target) return 1;
  let lo = 0, hi = 1;
  for (let i = 0; i < 60; i += 1) { const mid = (lo + hi) / 2; if (value(mid) >= target) lo = mid; else hi = mid; }
  return lo;
}

// Per-Match probability needed so at least one of n Matches reaches an outcome.
const perMatchForAtLeastOnce = (target, n = 3) => 1 - (1 - target) ** (1 / n);

// Illustrative planning presets — NOT measurements. Replace with bench data.
const DRIVE_ONLY = Object.freeze({
  pGreenStart: 0.90, pEarlyStart: 0.03, pEnter: 0.97,
  pLapComplete: [0.95, 0.95, 0.95], pWallClean: [0.85, 0.85, 0.85], pObstacleClean: [0.75, 0.75, 0.75],
  pFlag: 0.92, pFinishInTime: 0.99, pUnder245: 0.95, pPark: 0.80, pRedCard: 0.01,
  attemptExchange: false, pitAfterLap: 2,
  pDropAssigned: 0, pDropOther: 0, pPickupAssigned: 0, pPickupOther: 0, pRetain: 1, pPitComplete: 1,
});
const FULL_MISSION = Object.freeze({
  ...DRIVE_ONLY, attemptExchange: true, pUnder245: 0.85,
  pDropAssigned: 0.80, pDropOther: 0.08, pPickupAssigned: 0.60, pPickupOther: 0.10, pRetain: 0.90, pPitComplete: 0.90,
});
const PROFILES = Object.freeze({
  'drive-only': DRIVE_ONLY,
  'full-mission-pit-after-lap-2': FULL_MISSION,
  'full-mission-pit-after-lap-1': Object.freeze({ ...FULL_MISSION, pitAfterLap: 1 }),
});

function summarize(dist) {
  const best = orderStatistic(dist, 3, 1), second = orderStatistic(dist, 3, 2);
  const r = (x) => Math.round(x * 1000) / 1000;
  return {
    single_match: { mean: r(mean(dist)), median: quantile(dist, 0.5), p10: quantile(dist, 0.1), p90: quantile(dist, 0.9),
      p_at_least: Object.fromEntries([200, 250, 300, 330].map((t) => [t, r(atLeast(dist, t))])) },
    best_of_3: { mean: r(mean(best)), median: quantile(best, 0.5), p10: quantile(best, 0.1),
      p_at_least: Object.fromEntries([200, 250, 300, 330].map((t) => [t, r(atLeast(best, t))])) },
    second_best_of_3_tiebreak: { mean: r(mean(second)), median: quantile(second, 0.5) },
  };
}

function analyze() {
  const dists = Object.fromEntries(Object.entries(PROFILES).map(([k, v]) => [k, matchDistribution(v)]));
  const r = (x) => Math.round(x * 10000) / 10000;
  const h2h = headToHead(dists['full-mission-pit-after-lap-2'], dists['drive-only']);
  const bestMean = (d) => mean(orderStatistic(d, 3, 1));
  const top = (d) => atLeast(orderStatistic(d, 3, 1), 300);
  return {
    schema: 'tournament-v7/1',
    rule_set: RULE_SET,
    status: 'agent-run planning arithmetic with illustrative probabilities; not measured, not a prediction',
    format: {
      qualification: 'three Matches; rank by best score, ties by second then third best (GM1 V3 §4.7.1)',
      elimination: 'single head-to-head Matches; higher score wins (GM1 V3 §3.3.1); seeds 7-10 play in (§4.9)',
    },
    profiles: PROFILES,
    results: Object.fromEntries(Object.entries(dists).map(([k, d]) => [k, summarize(d)])),
    head_to_head_single_match: { a: 'full-mission-pit-after-lap-2', b: 'drive-only',
      win: r(h2h.win), tie: r(h2h.tie), loss: r(h2h.loss) },
    break_even_pit_stall: {
      meaning: 'largest probability of stalling in the pit (run over) at which the full-mission profile still equals drive-only',
      single_match_mean: r(breakEvenPitStall(FULL_MISSION, DRIVE_ONLY, mean)),
      best_of_3_mean: r(breakEvenPitStall(FULL_MISSION, DRIVE_ONLY, bestMean)),
      best_of_3_p_at_least_300: r(breakEvenPitStall(FULL_MISSION, DRIVE_ONLY, top)),
    },
    per_match_probability_needed: Object.fromEntries([0.5, 0.8, 0.9, 0.95].map((t) => [`${t}`, r(perMatchForAtLeastOnce(t))])),
    notes: [
      'Probabilities are conditional on reaching each phase; a failed phase ends the run with credits already earned.',
      'Pickup credit is kept only if the blue tire is still held (pRetain); retention after a pit stall is an interpretation.',
      'Skipping the exchange assumes the race still counts without tire credits; confirm in official Q&A before relying on it.',
      'Publicity (10) is excluded. Matches are treated as independent; learning between Matches is not modeled.',
      'Only mechanisms presented at Inspection may be added, removed or reconfigured between Matches (GM1 V3 §6.1).',
    ],
  };
}

function summaryMarkdown(report) {
  const rows = Object.entries(report.results).map(([k, v]) => `| ${k} | ${v.single_match.mean.toFixed(1)} | ${v.single_match.p_at_least[300].toFixed(3)} | ${v.best_of_3.mean.toFixed(1)} | ${v.best_of_3.p_at_least[300].toFixed(3)} | ${v.second_best_of_3_tiebreak.mean.toFixed(1)} |`);
  const be = report.break_even_pit_stall, h = report.head_to_head_single_match;
  return [
    '# Tournament model v7 — generated summary', '',
    `${report.status}. Rules: ${report.rule_set}. Regenerate with \`node tools/tournament-v7.js --write\`.`, '',
    '| Profile (illustrative) | Single-match mean | P(single >= 300) | Best-of-3 mean | P(best-of-3 >= 300) | 2nd-best mean |',
    '|---|---:|---:|---:|---:|---:|', ...rows, '',
    `Break-even pit-stall probability (full mission vs drive-only): single-match mean ${be.single_match_mean}, best-of-3 mean ${be.best_of_3_mean}, best-of-3 P(>=300) ${be.best_of_3_p_at_least_300}.`, '',
    `Single head-to-head (full mission vs drive-only): win ${h.win}, tie ${h.tie}, loss ${h.loss}.`, '',
    'Per-match probability needed for at least one success in three Matches: ' +
      Object.entries(report.per_match_probability_needed).map(([t, p]) => `${Math.round(Number(t) * 100)}% -> ${p}`).join('; ') + '.', '',
    ...report.notes.map((n) => `- ${n}`), '',
  ].join('\n');
}

// Cross-check helper: the all-success profile must equal score-v3's 390 maximum.
function perfectScoreCrossCheck() {
  return score({ enteredCourse: true, greenStart: true, earlyStart: false, finishedInAssignedBox: true, flagOnFinalLap: true,
    publicity: false, redCard: false, cleanWallLaps: [true, true, true], cleanObstacleLaps: [true, true, true],
    tireDrop: 'assigned', tirePickup: 'assigned', finishSeconds: 150 }).total;
}

module.exports = { matchDistribution, orderStatistic, headToHead, breakEvenPitStall, perMatchForAtLeastOnce,
  mean, atLeast, quantile, analyze, summaryMarkdown, perfectScoreCrossCheck, PROFILES, validate };

if (require.main === module) {
  try {
    const args = process.argv.slice(2);
    if (args.some((a) => a !== '--write')) throw new Error('Usage: node tools/tournament-v7.js [--write]');
    const report = analyze();
    if (args.includes('--write')) {
      const out = path.join(__dirname, '..', 'derived', 'tournament-v7');
      fs.mkdirSync(out, { recursive: true });
      fs.writeFileSync(path.join(out, 'report.json'), `${JSON.stringify(report, null, 1)}\n`);
      fs.writeFileSync(path.join(out, 'summary.md'), summaryMarkdown(report));
    }
    console.log(summaryMarkdown(report));
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
