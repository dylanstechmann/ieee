#!/usr/bin/env node
'use strict';
// Re-derives derived/organizer-cad-v10 from the organizer .f3d bytes and checks every output byte for
// byte, plus the key field facts. CAD geometry from a June 2026 design file; not a measured field.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {build, OUT} = require('./organizer-cad-v10');

const root = path.resolve(__dirname, '..');
const {files, binaries, field} = build();
for (const [file, text] of Object.entries(files)) assert.equal(fs.readFileSync(path.join(root, OUT, file), 'utf8'), text, `${OUT}/${file} is stale; run node tools/organizer-cad-v10.js`);
for (const [file, data] of Object.entries(binaries)) assert.ok(fs.readFileSync(path.join(root, OUT, file)).equals(data), `${OUT}/${file} differs`);

const f = field.features;
assert.deepEqual(f.board.rect, [0, 0, 96, 48]);
assert.deepEqual(f.walls.inner_faces, {x_min: 1, x_max: 95, y_min: 1, y_max: 47});
assert.equal(f.walls.thickness_in, 1);
assert.deepEqual(f.center_divider.rect, [44, 23.5, 80, 24.5]);
assert.equal(f.pit_boxes.length, 3);
for (const b of f.pit_boxes) assert.deepEqual([b.rect[2] - b.rect[0], b.rect[3] - b.rect[1]], [12, 12]);
assert.ok(f.pit_openings.every(o => Math.abs(o.width_in - 15) < 0.05), 'pit openings should be about 15 in, matching the V3 callouts');
assert.equal(f.track_marking.outer_ring.length, 8);
assert.equal(f.track_marking.inner_ring.length, 8);
assert.ok(Math.abs(f.track_marking.band_width_in - 0.9) < 0.01);
assert.equal(f.checker_band.squares, 30);
const bodies = JSON.parse(files['bodies.json']).bodies;
assert.equal(bodies.filter(b => b.classification === 'unclassified-solid').length, 0);
console.log(`Verified organizer CAD extraction: ${bodies.length} bodies, ${bodies.filter(b => !['sketch-or-construction'].includes(b.classification)).length} classified solids; walls at x ${f.walls.inner_faces.x_min}-${f.walls.inner_faces.x_max} / y ${f.walls.inner_faces.y_min}-${f.walls.inner_faces.y_max} in; pit openings ${f.pit_openings.map(o => o.width_in).join(' and ')} in.`);
