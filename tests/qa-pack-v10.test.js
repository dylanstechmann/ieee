'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const path = require('node:path');
const Q = require('../tools/qa-pack-v10');
const root = path.resolve(__dirname, '..');

test('Q&A pack verifier passes', () => {
  const out = execFileSync(process.execPath, [path.join(root, 'tools/verify-qa-pack-v10.js')], {encoding: 'utf8'});
  assert.match(out, /Verified 10 questions/);
});

test('a quote that is not at its cited line is rejected', () => {
  const pack = Q.loadPack();
  pack.questions[0].citations[0].quote = 'This sentence is not in the manual.';
  assert.ok(Q.validatePack(pack).some(p => p.includes('quote not found')));
});

test('every earlier question must stay mapped', () => {
  const pack = Q.loadPack();
  pack.questions = pack.questions.map(q => ({...q, supersedes: (q.supersedes || []).filter(id => id !== 'Q1')}));
  assert.ok(Q.validatePack(pack).some(p => p.includes('Q1')));
});

test('answered ledger entries need the answer, date and respondent role', () => {
  const pack = Q.loadPack();
  const ledger = Q.ledgerTemplate(pack);
  assert.deepEqual(Q.validateLedger(pack, ledger), []);
  ledger.entries[0].status = 'answered';
  ledger.entries[0].posted_at = '2026-11-05';
  const problems = Q.validateLedger(pack, ledger);
  assert.ok(problems.some(p => p.includes('answer_text')));
  ledger.entries[0].status = 'decided-by-ai';
  assert.ok(Q.validateLedger(pack, ledger).some(p => p.includes('status must be one of')));
});

test('paste messages stay under the Discord limit and keep manual references', () => {
  const pack = Q.loadPack();
  for (const m of Q.pasteMessages(pack)) {
    assert.ok(m.text.length <= 1900, `${m.id} is ${m.text.length} characters`);
    assert.match(m.text, /Manual references/);
  }
});
