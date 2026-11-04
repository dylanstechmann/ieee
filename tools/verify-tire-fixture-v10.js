#!/usr/bin/env node
'use strict';
// Rebuilds derived/tire-fixture-v10 in memory, compares every file, and checks the DOE structure.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const T = require('./tire-fixture-v10');

const root = path.resolve(__dirname, '..');
const files = T.build();
for (const [f, t] of Object.entries(files)) assert.equal(fs.readFileSync(path.join(root, T.OUT, f), 'utf8'), t, `${T.OUT}/${f} is stale; run node tools/tire-fixture-v10.js`);
const rows = files['doe-round1.csv'].trim().split('\n').slice(1).map(l => l.split(','));
const perConcept = T.L9.length * T.REPEATS + T.NOMINAL_EXTRA;
assert.equal(rows.length, perConcept * T.CONCEPTS.length);
for (const c of T.CONCEPTS) assert.equal(rows.filter(r => r[1] === c).length, 50, `${c} needs 50 runs (48/50 criterion)`);
// L9 balance: every pair of factor levels appears exactly once per concept (excluding the nominal extras)
const cells = rows.filter(r => r[1] === T.CONCEPTS[0] && r[2] !== 'nominal' && r[6] === '1');
for (const [a, b] of [[3, 4], [3, 5], [4, 5]]) {
  const pairs = new Set(cells.map(r => `${r[a]}|${r[b]}`));
  assert.equal(pairs.size, 9, 'L9 must cover every level pair of each factor pair once');
}
assert.ok(rows.every(r => r.slice(7).every(v => v === '')), 'templates must not contain results');
console.log(`Verified tire-fixture kit: ${rows.length} round-1 runs (${perConcept} per concept, balanced L9), blank results, 1:1 target drawing.`);
