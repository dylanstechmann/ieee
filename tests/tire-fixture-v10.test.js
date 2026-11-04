'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('tire-fixture kit verifier passes', () => {
  const out = execFileSync(process.execPath, [path.join(root, 'tools/verify-tire-fixture-v10.js')], {encoding: 'utf8'});
  assert.match(out, /150 round-1 runs \(50 per concept/);
});
