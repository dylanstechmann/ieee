#!/usr/bin/env node
'use strict';
// Writes software/stockcar/tests/fixtures/dynamics-golden-v10.json: the exact inputs and JavaScript
// results of the dynamics-v9 model (tools/mule-dynamics-v5.js with the v9 config) for its six
// scenarios. The Python port (software/stockcar/dynamics.py) is tested against this file, and a Node
// test rebuilds it in memory so it can never drift from the JavaScript model.
const fs = require('node:fs');
const path = require('node:path');
const Dynamics = require('./mule-dynamics-v5');
const MuleBuild = require('./build-mule-studio-v4');
const V9 = require('./dynamics-v9');

const root = path.resolve(__dirname, '..');
const OUT = 'software/stockcar/tests/fixtures/dynamics-golden-v10.json';

function build() {
  const config = V9.buildConfig();
  const mule = MuleBuild.buildData();
  const selection = {...mule.selected};
  const cases = config.scenarios.map(s => {
    const input = Dynamics.parameters(config, mule, selection, config.vehicle.mass_kg, s.id);
    const result = Dynamics.simulate(input);
    return {scenario: input.scenario, motor: input.motor, mass: input.mass, overrides: input.overrides,
            metrics: result.metrics, final_sample: result.samples[result.samples.length - 1]};
  });
  const model = {numerics: config.numerics, vehicle: config.vehicle, electrical: config.electrical, control: config.control};
  return JSON.stringify({source: 'tools/mule-dynamics-v5.js with tools/dynamics-v9.js buildConfig()', model, cases}, null, 1) + '\n';
}

module.exports = {build, OUT};

if (require.main === module) {
  fs.mkdirSync(path.dirname(path.join(root, OUT)), {recursive: true});
  fs.writeFileSync(path.join(root, OUT), build());
  console.log(`Wrote ${OUT}`);
}
