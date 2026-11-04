'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('practice-field packet verifier passes', () => {
  const out = execFileSync(process.execPath, [path.join(root, 'tools/verify-practice-field-v10.js')], {encoding: 'utf8'});
  assert.match(out, /Verified practice-field packet: 60 layout coordinates/);
});

test('the materials list already includes the obstacle set, paint and start flag', () => {
  const {build} = require('../tools/practice-field-v10');
  const csv = build().files['materials.csv'];
  for (const item of ['Toy vehicle obstacle set', 'Black paint', 'Green start flag', 'checkerboard']) assert.match(csv, new RegExp(item));
  assert.match(csv, /182\.39/);
});
