'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('passability atlas verifier passes', () => {
  const out = execFileSync(process.execPath, [path.join(root, 'tools/verify-passability-atlas-v10.js')], {encoding: 'utf8'});
  assert.match(out, /Verified passability atlas/);
});
