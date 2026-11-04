'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {build, OUT} = require('../tools/dynamics-golden-v10');
const root = path.resolve(__dirname, '..');

test('dynamics golden fixture matches the JavaScript model', () => {
  assert.equal(fs.readFileSync(path.join(root, OUT), 'utf8'), build());
});

test('dynamics golden fixture covers the six v9 scenarios', () => {
  const data = JSON.parse(build());
  assert.deepEqual(data.cases.map(c => c.scenario.id), ['cruise', 'spin', 'low-voltage', 'asymmetric-traction', 'encoder-dropout', 'brake-hold']);
});
