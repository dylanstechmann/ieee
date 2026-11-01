'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
test('layout regenerates with mapped and bounded features', () => {
  execFileSync(process.execPath, [path.join(root, 'tools/render-drawing-layout.js')]);
  const x = JSON.parse(require('node:fs').readFileSync(path.join(root, 'derived/drawing-layout-v3/layout.json')));
  assert.match(x.status, /not-verified/);
  assert.equal(x.features.length, 9);
  for (const f of x.features) for (const [a,b] of f.vertices_in) assert.ok(a >= 0 && a <= 96 && b >= 0 && b <= 48);
  const divider = x.features.find(f => f.id === 'center_divider_axis').vertices_in;
  assert.ok(Math.abs(Math.abs(divider[0][0]-divider[1][0])-36)<1);
  const svg = require('node:fs').readFileSync(path.join(root,'derived/drawing-layout-v3/layout.svg'),'utf8');
  assert.match(svg, /NOT verified CAD/);
});