#!/usr/bin/env node
'use strict';
// Verifies derived/qa-pack-v10: every manual quote appears at its cited paragraph line, every earlier
// question maps to a new one, paste text fits Discord, outputs match a fresh build, and the live answer
// ledger (qa/answers-ledger.json) is well formed. Drafts only: nothing here is an organizer answer.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const Q = require('./qa-pack-v10');

const root = path.resolve(__dirname, '..');
const pack = Q.loadPack();
const problems = Q.validatePack(pack);
assert.deepEqual(problems, [], problems.join('\n'));
for (const [file, text] of Object.entries(Q.build(pack))) {
  assert.equal(fs.readFileSync(path.join(root, Q.OUT, file), 'utf8'), text, `${Q.OUT}/${file} is stale; run node tools/qa-pack-v10.js`);
}
const ledgerPath = path.join(root, Q.LEDGER);
assert.ok(fs.existsSync(ledgerPath), `missing ${Q.LEDGER}`);
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const ledgerProblems = Q.validateLedger(pack, ledger);
assert.deepEqual(ledgerProblems, [], ledgerProblems.join('\n'));
const citations = pack.questions.reduce((n, q) => n + q.citations.length, 0);
const answered = ledger.entries.filter(e => ['answered', 'already-answered'].includes(e.status)).length;
console.log(`Verified ${pack.questions.length} questions, ${citations} manual quotes at their cited lines, ${Object.keys(pack.previous_question_sets).length} earlier items mapped, paste limits, outputs and the answer ledger (${answered} answered).`);
