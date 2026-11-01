#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const buildDir = process.env.STUDIO_BUILD_DIR || path.join(os.homedir(), '.cache', 'ieee-studio-v7-build');
const rel = (f) => path.join(root, f);
const read = (f) => fs.readFileSync(rel(f));
const json = (f) => JSON.parse(fs.readFileSync(path.isAbsolute(f) ? f : rel(f), 'utf8'));
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex');
const PARTS = ['motor', 'bracket', 'hub', 'wheel', 'caster'];
const INPUTS = [
  'robot-studio-v8/index.html', 'robot-studio-v8/app.js', 'robot-studio-v8/study-core.js',
  'tools/build-robot-studio-v8.js', 'derived/robot-studio-v7/parts.json',
  'derived/robot-studio-v7/assembly.json', 'drivetrain-mule-v4.json',
  'derived/constrained-field-v3/layout.json', 'derived/apriltag-41h12-v7/report.json',
  'derived/organizer-cad/Spare Tire v2.stl', 'stopping-dynamics-v6.json',
  'derived/stopping-dynamics-v6/nominal-simulations.json', 'derived/mechanism-envelope-v6/report.json',
  ...PARTS.map((p) => `derived/robot-studio-v7/parts/${p}.glb`),
];

function bundle() {
  const esbuild = require(path.join(buildDir, 'node_modules', 'esbuild'));
  const result = esbuild.buildSync({
    entryPoints: [rel('robot-studio-v8/app.js')], bundle: true, format: 'iife', minify: true,
    write: false, nodePaths: [path.join(buildDir, 'node_modules')], target: 'es2020',
    legalComments: 'inline', logLevel: 'error',
  });
  const versions = Object.fromEntries(['three', 'esbuild'].map((n) => [n, json(path.join(buildDir, 'node_modules', n, 'package.json')).version]));
  return { code: result.outputFiles[0].text, versions };
}

function data() {
  const tire = read('derived/organizer-cad/Spare Tire v2.stl');
  const vertices = [];
  for (let i = 0; i < tire.readUInt32LE(80); i += 1) {
    for (let j = 0; j < 3; j += 1) vertices.push([0, 1, 2].map((k) => tire.readFloatLE(96 + i * 50 + j * 12 + k * 4)));
  }
  const kit = json('drivetrain-mule-v4.json');
  return {
    parts: Object.fromEntries(PARTS.map((p) => [p, read(`derived/robot-studio-v7/parts/${p}.glb`).toString('base64')])),
    partsMeta: json('derived/robot-studio-v7/parts.json').parts,
    assembly: json('derived/robot-studio-v7/assembly.json'),
    kit: { deck: kit.deck, caster: kit.caster },
    layout: json('derived/constrained-field-v3/layout.json'),
    tagBits: Object.fromEntries(json('derived/apriltag-41h12-v7/report.json').organizer_sheet.tags.map((t) => [t.id, t.bits_black_is_1])),
    tireStl: tire.toString('base64'), tireVertices: vertices,
    stoppingConfig: json('stopping-dynamics-v6.json'),
    stopping: json('derived/stopping-dynamics-v6/nominal-simulations.json'),
    mechanism: json('derived/mechanism-envelope-v6/report.json'),
  };
}

function build() {
  const { code, versions } = bundle();
  if (versions.three !== '0.170.0' || versions.esbuild !== '0.24.0') throw new Error(`Unexpected toolchain ${JSON.stringify(versions)}`);
  const embedded = JSON.stringify(data()).replace(/</g, '\\u003c');
  let html = read('robot-studio-v8/index.html').toString('utf8');
  html = html.replace('<script id="data-placeholder"></script>', () => `<script>globalThis.STUDIO_DATA=${embedded};</script>`);
  html = html.replace('<script id="app-placeholder"></script>', () => `<script>${code.replace(/<\/script/gi, '<\\/script')}</script>`);
  return { html, versions, bundleBytes: Buffer.byteLength(code) };
}

function generate() {
  const { html, versions, bundleBytes } = build();
  const target = 'share/Robot-Studio-v8.html';
  fs.mkdirSync(rel('derived/robot-studio-v8'), { recursive: true });
  fs.writeFileSync(rel(target), html);
  const manifest = {
    schema: 'robot-studio-v8-build/1',
    status: 'consolidated digital study; no physical validation or fabrication release',
    toolchain: versions,
    input_hashes: Object.fromEntries(INPUTS.map((f) => [f, hash(read(f))])),
    output: { file: target, bytes: Buffer.byteLength(html), sha256: hash(html), bundle_bytes: bundleBytes },
  };
  fs.writeFileSync(rel('derived/robot-studio-v8/build-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

module.exports = { build, generate, data, INPUTS };
if (require.main === module) console.log(JSON.stringify(generate().output, null, 2));
