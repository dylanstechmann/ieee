'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const path = require('node:path');
const F = require('../tools/f3d-reader');
const root = path.resolve(__dirname, '..');

test('organizer CAD verifier passes', () => {
  const out = execFileSync(process.execPath, [path.join(root, 'tools/verify-organizer-cad-v10.js')], {encoding: 'utf8'});
  assert.match(out, /Verified organizer CAD extraction/);
});

test('the ZIP reader rejects data that is not an archive', () => {
  assert.throws(() => F.readZip(Buffer.from('not a zip file at all, just text')), /not a ZIP archive/);
});

test('the ASM reader rejects unknown streams and unknown tags', () => {
  assert.throws(() => F.readSab(Buffer.from('something else entirely')), /not an ASM BinaryFile4/);
  const bad = Buffer.concat([Buffer.from('ASM BinaryFile4'), Buffer.alloc(16), Buffer.from([0xff])]);
  assert.throws(() => F.readSab(bad), /unknown ASM tag 0xff/);
});

test('field clearances keep the end strips narrower than the 10 in minimum robot', () => {
  const field = require('../derived/organizer-cad-v10/field-v10.json');
  assert.ok(field.clearances_in.race_end_marking_outer_edge_to_end_wall_face < 10);
  assert.ok(field.clearances_in.pit_end_pit_divider_face_to_marking_outer_edge < 10);
  assert.ok(field.clearances_in.race_end_divider_end_to_end_wall_face >= 14);
  assert.match(field.source.note, /1 x 2 x 36/);
});
