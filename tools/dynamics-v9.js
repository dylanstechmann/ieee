#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Dynamics = require('./mule-dynamics-v5');
const MuleBuild = require('./build-mule-studio-v4');

const root = path.resolve(__dirname, '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const hash = (f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex');

function buildConfig() {
  const baseline = read('robot-baseline-v9.json');
  const old = read('mule-dynamics-v5.json');
  const config = JSON.parse(JSON.stringify(old));
  config.version = '0.9.0';
  config.date = baseline.date;
  config.sources = { canonical: 'robot-baseline-v9.json', inherited_model: 'tools/mule-dynamics-v5.js', vendor_assembly: baseline.mule.source };
  config.vehicle = { ...config.vehicle, ...baseline.shared_parameters, track_m: baseline.mule.track_m, wheel_radius_m: baseline.mule.wheel_radius_m };
  config.electrical = { ...config.electrical, source_voltage_v: baseline.shared_parameters.source_voltage_v, source_resistance_ohm: baseline.shared_parameters.source_resistance_ohm, driver_current_limit_a: baseline.shared_parameters.driver_current_limit_a };
  config.geometry_status = '202 mm vendor-CAD track; proposed shaft-down mule; received parts not measured';
  config.limitations = [...old.limitations, 'Only the track and canonical shared parameters are updated from v5. The old mechanism envelopes and stopping datasets are not regenerated or declared compatible with a competition chassis.'];
  return config;
}

function buildArtifacts() {
  const config = buildConfig(), mule = MuleBuild.buildData();
  Dynamics.validate(config);
  const selection = { ...mule.selected };
  const runs = config.scenarios.map((s) => Dynamics.simulate(Dynamics.parameters(config, mule, selection, config.vehicle.mass_kg, s.id)));
  const ensemble = [];
  const random = Dynamics.rng(config.sweep.ensemble_seed), ranges = config.sweep.ensemble_ranges;
  for (let i = 0; i < config.sweep.ensemble_runs; i += 1) {
    const overrides = {};
    for (const [key, [lo, hi]] of Object.entries(ranges)) overrides[key] = key === 'encoder_delay_steps' ? Math.round(lo + (hi - lo) * random()) : lo + (hi - lo) * random();
    const mass = overrides.mass_kg; delete overrides.mass_kg;
    const result = Dynamics.simulate(Dynamics.parameters(config, mule, selection, mass, 'cruise', overrides));
    ensemble.push({ run: i, ...overrides, mass_kg: mass, ...result.metrics });
  }
  const report = {
    version: config.version, status: config.status, geometry_status: config.geometry_status,
    track_m: config.vehicle.track_m, previous_track_m: 0.176,
    nominal_metrics: Object.fromEntries(runs.map((r) => [r.scenario_id, r.metrics])),
    ensemble: { seed: config.sweep.ensemble_seed, run_count: ensemble.length, status: 'synthetic deterministic scenarios, not measured probabilities', runs: ensemble },
    physical_trials_completed: 0, components_purchased: 0, limitations: config.limitations,
  };
  return { config, report, nominal: { version: config.version, status: config.status, selection, runs } };
}

function generate() {
  const built = buildArtifacts(), out = path.join(root, 'derived/dynamics-v9');
  fs.mkdirSync(out, { recursive: true });
  const files = { 'config.json': built.config, 'nominal-simulations.json': built.nominal, 'report.json': built.report };
  for (const [name, data] of Object.entries(files)) fs.writeFileSync(path.join(out, name), `${JSON.stringify(data, null, 2)}\n`);
  const inputs = ['robot-baseline-v9.json', 'mule-dynamics-v5.json', 'tools/dynamics-v9.js', 'tools/mule-dynamics-v5.js', 'tools/build-mule-studio-v4.js', 'drivetrain-mule-v4.json', 'order-a-procurement-v4.json', 'hardware-development-v3.json', 'derived/robot-studio-v7/assembly.json'];
  const manifest = { status: built.config.status, input_hashes: Object.fromEntries(inputs.map((f) => [f, hash(f)])), output_hashes: Object.fromEntries(Object.keys(files).map((f) => [`derived/dynamics-v9/${f}`, hash(`derived/dynamics-v9/${f}`)])) };
  fs.writeFileSync(path.join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return { ...built, manifest };
}

module.exports = { buildConfig, buildArtifacts, generate };
if (require.main === module) { const r = generate(); console.log(JSON.stringify({ track_m: r.config.vehicle.track_m, runs: r.nominal.runs.length, ensemble: r.report.ensemble.run_count }, null, 2)); }
