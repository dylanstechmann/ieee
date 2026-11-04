'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('envelope verifier passes', () => {
  const out = execFileSync(process.execPath, [path.join(root, 'tools/verify-envelope-v10.js')], {encoding: 'utf8'});
  assert.match(out, /Verified envelope v10: 27 conditions and 60 mission replays/);
});
