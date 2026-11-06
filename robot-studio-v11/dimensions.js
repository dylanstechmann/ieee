'use strict';

// Pure configuration logic: changing a candidate is not a physical measurement.
// Millimetres throughout. No historical artifact is modified by these functions.
const FIELDS = Object.freeze([
  'wheelDiameterMm', 'wheelWidthMm', 'halfTrackMm', 'deckThicknessMm',
  'gearboxCenterAboveMountMm', 'shaftOffsetMm', 'casterHeightMm',
  'casterSpacerMm',
]);

function validate(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Configuration required');
  for (const key of ['id', 'partId', 'revision', 'basis']) {
    if (typeof config[key] !== 'string' || !config[key].trim()) throw new Error(`${key} required`);
  }
  if (!config.dimensions || typeof config.dimensions !== 'object') throw new Error('Dimensions required');
  for (const key of Object.keys(config.dimensions)) {
    if (!FIELDS.includes(key)) throw new Error(`Unknown dimension: ${key}`);
  }
  for (const key of FIELDS) {
    const value = config.dimensions[key];
    if (!Number.isFinite(value) || value < 0 || (value === 0 && !['shaftOffsetMm', 'casterSpacerMm'].includes(key))) {
      throw new Error(`Invalid millimetre dimension: ${key}`);
    }
  }
  if (config.dimensions.halfTrackMm <= config.dimensions.wheelWidthMm / 2) throw new Error('Wheel track is too narrow');
  return config;
}

function resolve(config) {
  validate(config);
  const d = config.dimensions;
  const axleHeightMm = d.wheelDiameterMm / 2;
  const shaftAboveMountMm = d.gearboxCenterAboveMountMm - d.shaftOffsetMm;
  const deckTopMm = axleHeightMm - shaftAboveMountMm;
  const deckBottomMm = deckTopMm - d.deckThicknessMm;
  const casterRiserMm = deckBottomMm - d.casterSpacerMm - d.casterHeightMm;
  return {
    configurationId: config.id, revision: config.revision, basis: config.basis,
    axleHeightMm, shaftAboveMountMm, deckTopMm, deckBottomMm, casterRiserMm,
    trackMm: d.halfTrackMm * 2,
    overallWheelWidthMm: d.halfTrackMm * 2 + d.wheelWidthMm,
    checks: [
      { id: 'deck-above-floor', pass: deckBottomMm > 0 },
      { id: 'positive-caster-riser', pass: casterRiserMm >= 0 },
    ],
    qualification: 'dimension-stack-only; not a complete fit or hardware validation',
  };
}

function revise(config, change) {
  validate(config);
  if (!change || !['measurement', 'substitution', 'hypothesis'].includes(change.kind)) throw new Error('Revision kind required');
  for (const key of ['id', 'revision', 'basis']) {
    if (typeof change[key] !== 'string' || !change[key].trim()) throw new Error(`${key} required`);
  }
  if (change.id === config.id || change.revision === config.revision) throw new Error('New identity and revision required');
  if (change.kind === 'substitution' && (!change.partId || change.partId === config.partId)) throw new Error('Substitution needs a distinct part identity');
  if (change.kind !== 'substitution' && change.partId && change.partId !== config.partId) throw new Error('Use substitution to change part identity');
  if (change.kind === 'measurement' && (typeof change.measurementId !== 'string' || !change.measurementId.trim())) throw new Error('Measurement record required');
  const next = {
    id: change.id, partId: change.partId || config.partId, revision: change.revision,
    basis: change.basis, parentId: config.id, kind: change.kind,
    measurementId: change.measurementId || null,
    dimensions: { ...config.dimensions, ...change.dimensions },
  };
  validate(next);
  return next;
}

module.exports = { FIELDS, validate, resolve, revise };