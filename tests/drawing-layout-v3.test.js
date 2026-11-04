'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
// The committed layout.json is a pinned input of several sealed packages, so the test regenerates
// into a temporary directory and requires byte-identical output instead of rewriting the file.
test('layout regenerates byte-identically with mapped and bounded features', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'drawing-layout-v3-'));
  try {
    execFileSync(process.execPath, [path.join(root, 'tools/render-drawing-layout.js'), '--out', temp]);
    for (const file of ['layout.json', 'layout.svg']) {
      assert.equal(fs.readFileSync(path.join(temp, file), 'utf8'), fs.readFileSync(path.join(root, 'derived/drawing-layout-v3', file), 'utf8'), `${file} differs from the committed copy`);
    }
    const x = JSON.parse(fs.readFileSync(path.join(temp, 'layout.json'), 'utf8'));
    assert.match(x.status, /not-verified/);
    assert.equal(x.features.length, 9);
    for (const f of x.features) for (const [a, b] of f.vertices_in) assert.ok(a >= 0 && a <= 96 && b >= 0 && b <= 48);
    const divider = x.features.find(f => f.id === 'center_divider_axis').vertices_in;
    assert.ok(Math.abs(Math.abs(divider[0][0] - divider[1][0]) - 36) < 1);
    const svg = fs.readFileSync(path.join(temp, 'layout.svg'), 'utf8');
    assert.match(svg, /NOT verified CAD/);
  } finally {
    fs.rmSync(temp, {recursive: true, force: true});
  }
});
