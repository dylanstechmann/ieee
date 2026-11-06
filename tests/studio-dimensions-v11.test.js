'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validate, resolve, revise } = require('../robot-studio-v11/dimensions');
const geometry = require('../derived/drivetrain-mule-v10/geometry.json');

function baseline() {
  return {
    id: 'mule-v10-reference', partId: 'pololu-1430', revision: 'reference-1',
    basis: 'historical CAD-derived nominal stack; no received-part measurements',
    dimensions: {
      wheelDiameterMm: geometry.inputs.wheel_diameter_mm,
      wheelWidthMm: geometry.inputs.wheel_width_mm,
      halfTrackMm: geometry.lateral.wheel_center_mm,
      deckThicknessMm: geometry.deck.thickness_mm,
      gearboxCenterAboveMountMm: geometry.inputs.gearbox_center_above_mount_face_mm,
      shaftOffsetMm: geometry.inputs.shaft_offset_mm,
      casterHeightMm: geometry.inputs.caster_height_mm,
      casterSpacerMm: geometry.inputs.caster_spacer_mm,
    },
  };
}

test('dimension resolver reproduces historical stack without changing its source', () => {
  const config = baseline();
  const before = JSON.stringify(config);
  const result = resolve(config);
  assert.ok(Math.abs(result.deckTopMm - 28.6) < 1e-10);
  assert.ok(Math.abs(result.casterRiserMm - 6.905) < 1e-10);
  assert.equal(result.trackMm, 202);
  assert.equal(result.overallWheelWidthMm, 212);
  assert.equal(JSON.stringify(config), before);
});

test('received dimensions propagate to axle, deck and riser in a separate revision', () => {
  const original = baseline();
  const changed = revise(original, {
    kind: 'measurement', id: 'mule-measured', revision: 'received-1',
    basis: 'synthetic test fixture, not an actual measurement', measurementId: 'test-only',
    dimensions: { wheelDiameterMm: 82 },
  });
  assert.equal(original.dimensions.wheelDiameterMm, 80);
  assert.equal(resolve(changed).axleHeightMm - resolve(original).axleHeightMm, 1);
  assert.ok(Math.abs(resolve(changed).deckTopMm - resolve(original).deckTopMm - 1) < 1e-10);
  assert.equal(changed.parentId, original.id);
});

test('similar-looking substitute gets a distinct identity and recalculated width', () => {
  const changed = revise(baseline(), {
    kind: 'substitution', id: 'alternative', revision: 'candidate-1', partId: 'hypothetical-wheel',
    basis: 'hypothetical test candidate, not a purchase recommendation',
    dimensions: { wheelWidthMm: 14 },
  });
  assert.equal(resolve(changed).overallWheelWidthMm, 216);
  assert.equal(changed.partId, 'hypothetical-wheel');
});

test('invalid, absent and unknown dimensions cannot silently enter the model', () => {
  for (const value of [NaN, Infinity, -1, 0, '80', null]) {
    const c = baseline(); c.dimensions.wheelDiameterMm = value;
    assert.throws(() => validate(c));
  }
  const c = baseline(); c.dimensions.wheelDiameterInches = 3;
  assert.throws(() => validate(c), /Unknown dimension/);
});

test('impossible support stack remains a visible failure instead of being corrected silently', () => {
  const c = baseline(); c.dimensions.casterHeightMm = 100;
  const result = resolve(c);
  assert.ok(result.casterRiserMm < 0);
  assert.equal(result.checks.find(x => x.id === 'positive-caster-riser').pass, false);
});

test('measurements require a record and substitutions require a new product identity', () => {
  const c = baseline();
  const change = { id: 'new-config', revision: 'new-revision', basis: 'test', dimensions: {} };
  assert.throws(() => revise(c, { ...change, kind: 'measurement' }), /Measurement record/);
  assert.throws(() => revise(c, { ...change, kind: 'substitution', partId: c.partId }), /distinct part/);
  assert.throws(() => revise(c, { ...change, kind: 'hypothesis', id: c.id }), /New identity/);
});