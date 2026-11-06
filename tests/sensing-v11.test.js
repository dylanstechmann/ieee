'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('sensing v11 verifier passes', () => {
  const out = execFileSync(process.execPath, [path.join(root, 'tools/verify-sensing-v11.js')], {encoding: 'utf8'});
  assert.match(out, /Verified sensing v11: 5580 poses/);
});