#!/usr/bin/env node
'use strict';
// Rebuilds derived/competition-mockup-v10 in memory, compares every file, and checks the fit facts.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const M = require('./competition-mockup-v10');

const root = path.resolve(__dirname, '..');
const {files, g} = M.build();
for (const [f, t] of Object.entries(files)) assert.equal(fs.readFileSync(path.join(root, M.OUT, f), 'utf8'), t, `${M.OUT}/${f} is stale; run node tools/competition-mockup-v10.js`);
assert.ok(g.checks.wheels_inside_square_base && g.checks.wheels_inside_round_base, 'wheel slots must stay inside both bases');
assert.ok(g.checks.plate_inside_min_size_band, 'the base plate must lie inside the bottom 3 in');
assert.ok(g.checks.overall_width_mm <= M.BASE, 'the drivetrain must fit inside the 10 in base');
assert.match(files['base-square-1to1.svg'], /width="294mm"/, 'true-scale SVG in millimetres');
console.log(`Verified competition mockup: wheels (overall ${g.checks.overall_width_mm} mm) inside both 254 mm bases, plate at ${g.checks.plate_height_band_mm.join('-')} mm inside the 3 in band.`);
