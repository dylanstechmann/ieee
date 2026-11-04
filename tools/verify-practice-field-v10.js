#!/usr/bin/env node
'use strict';
// Rebuilds derived/practice-field-v10 in memory, compares every file, and checks the packet's
// internal consistency. An agent-prepared build packet; nothing has been built or measured.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {build, OUT, MATERIALS_TOTAL} = require('./practice-field-v10');

const root = path.resolve(__dirname, '..');
const {files, field, materialsTotal} = build();
for (const [file, text] of Object.entries(files)) assert.equal(fs.readFileSync(path.join(root, OUT, file), 'utf8'), text, `${OUT}/${file} is stale; run node tools/practice-field-v10.js`);
assert.equal(materialsTotal, MATERIALS_TOTAL);

const rows = files['coordinates.csv'].trim().split('\n').slice(1).map(line => line.split(','));
assert.equal(rows.length, 60);
const w = field.features.walls.inner_faces;
for (const r of rows) {
  const x = Number(r[2]);
  const y = Number(r[3]);
  assert.ok(Number.isFinite(x) && Number.isFinite(y), `bad coordinate row ${r.join(',')}`);
  assert.ok(x >= w.x_min - 1e-9 && x <= w.x_max + 1e-9 && y >= w.y_min - 1e-9 && y <= w.y_max + 1e-9, `${r[0]} ${r[1]} lies outside the wall faces`);
}
const boxes = field.features.pit_boxes.map(b => b.rect).concat([field.features.start_box.rect]);
for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
  const [a, b] = [boxes[i], boxes[j]];
  assert.ok(a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1], 'pit or start boxes overlap');
}
const template = JSON.parse(files['asbuilt-template.json']);
assert.ok(template.items.length >= 30);
assert.ok(template.items.every(item => item.measured_in.every(v => v === null)), 'the template must not contain measurements');
assert.match(files['README.md'], /Nothing here has been built or measured/);
console.log(`Verified practice-field packet: ${rows.length} layout coordinates inside the wall faces, ${template.items.length} as-built items, materials $${materialsTotal.toFixed(2)} (organizer list).`);
