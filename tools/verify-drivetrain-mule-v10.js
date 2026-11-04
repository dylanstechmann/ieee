#!/usr/bin/env node
'use strict';
// Verifies derived/drivetrain-mule-v10 without CadQuery: text outputs are rebuilt and compared, the
// manifest is recomputed, and the STL files are parsed and checked for closure, size and volume.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const M = require('./drivetrain-mule-v10');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, M.OUT);
const config = JSON.parse(fs.readFileSync(path.join(root, M.CONFIG), 'utf8'));
const assembly = JSON.parse(fs.readFileSync(path.join(root, M.ASSEMBLY), 'utf8'));
const {geometry, files} = M.textOutputs(config, assembly);
for (const [file, text] of Object.entries(files)) assert.equal(fs.readFileSync(path.join(dir, file), 'utf8'), text, `${M.OUT}/${file} is stale; run node tools/drivetrain-mule-v10.js --cad`);
for (const f of M.CAD_FILES) assert.ok(fs.existsSync(path.join(dir, f)), `missing ${f}; run node tools/drivetrain-mule-v10.js --cad`);
assert.equal(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'), M.manifestFor(dir, files, M.INPUTS), 'manifest.json is stale');

function readStl(file) {
  const buf = fs.readFileSync(file);
  const count = buf.readUInt32LE(80);
  assert.equal(buf.length, 84 + 50 * count, `${path.basename(file)} is not a binary STL`);
  const tris = [];
  for (let i = 0; i < count; i++) {
    const o = 84 + 50 * i + 12;
    tris.push([0, 1, 2].map(k => [0, 1, 2].map(a => buf.readFloatLE(o + 12 * k + 4 * a))));
  }
  return tris;
}

function stlFacts(tris) {
  const key = v => v.map(x => Math.round(x * 1e4)).join(',');
  const edges = new Map();
  let volume = 0;
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const [a, b, c] of tris) {
    volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    for (const v of [a, b, c]) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], v[k]); hi[k] = Math.max(hi[k], v[k]); }
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      const e = [key(p), key(q)].sort().join('|');
      edges.set(e, (edges.get(e) || 0) + 1);
    }
  }
  const openEdges = [...edges.values()].filter(n => n !== 2).length;
  return {volume, size: hi.map((h, k) => h - lo[k]), openEdges, triangles: tris.length};
}

const holeVolume = (holes, t) => holes.reduce((s, h) => s + Math.PI * (h.diameter / 2) ** 2 * t, 0);
const d = geometry.deck;
const r = d.corner_radius_mm;
const expectedDeck = (d.length_mm * d.width_mm - 4 * (r * r - Math.PI * r * r / 4)) * d.thickness_mm - holeVolume([...geometry.holes.motor, ...geometry.holes.caster], d.thickness_mm);
const rs = geometry.riser;
const expectedRiser = rs.footprint_mm[0] * rs.footprint_mm[1] * rs.height_mm - 2 * Math.PI * (rs.hole_diameter_mm / 2) ** 2 * rs.height_mm;
for (const [file, expectedVolume, size] of [
  ['cad/mule-deck-v10.stl', expectedDeck, [d.length_mm, d.width_mm, d.thickness_mm]],
  ['cad/caster-riser-v10.stl', expectedRiser, [rs.footprint_mm[0], rs.footprint_mm[1], rs.height_mm]],
]) {
  const facts = stlFacts(readStl(path.join(dir, file)));
  assert.equal(facts.openEdges, 0, `${file} is not closed`);
  facts.size.forEach((s, k) => assert.ok(Math.abs(s - size[k]) < 0.01, `${file} size ${facts.size} differs from ${size}`));
  assert.ok(Math.abs(facts.volume - expectedVolume) / expectedVolume < 0.002, `${file} volume ${facts.volume} differs from ${expectedVolume}`);
}
for (const f of ['cad/mule-deck-v10.step', 'cad/caster-riser-v10.step']) {
  const text = fs.readFileSync(path.join(dir, f), 'utf8');
  assert.match(text, /MANIFOLD_SOLID_BREP/);
  assert.match(text, /FILE_NAME\('[^']*','2026-11-03T00:00:00'/);
}
assert.equal(geometry.deck.top_above_floor_mm, 28.6);
assert.equal(geometry.riser.height_mm, 6.91);
assert.equal(geometry.lateral.track_mm, 202);
assert.equal(geometry.lateral.motor_hole_mm, 77.25);
assert.deepEqual(geometry.checks.filter(c => !c.pass).map(c => c.id), ['motor-body-gap']);
console.log(`Verified mule v10: deck top ${geometry.deck.top_above_floor_mm} mm, riser ${geometry.riser.height_mm} mm, track ${geometry.lateral.track_mm} mm, closed STL deck and riser, normalized STEP; flagged: motor-body-gap ${geometry.checks.find(c => c.id === 'motor-body-gap').value_mm} mm vs 8 mm rule.`);
