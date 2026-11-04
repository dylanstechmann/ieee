#!/usr/bin/env node
'use strict';
// Analyzer for mule E02/E03 bench logs against a chosen config (default drivetrain-mule-v10.json).
// It reuses the analysis functions of tools/mule-measurements-v4.js unchanged: that file is pinned by
// the sealed drivetrain-mule-v4 manifest, and its own command line is hard-wired to the v4 config.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {summarizeE02, summarizeE03} = require('./mule-measurements-v4');

const USAGE = 'usage: node tools/mule-measurements-v10.js --kind E02|E03 --input FILE --output NEW_FILE [--progress] [--config FILE]';

function main(argv) {
  const get = name => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : null;
  };
  const input = get('--input');
  const output = get('--output');
  const kind = get('--kind') || 'E03';
  const configPath = get('--config') || path.join(__dirname, '..', 'drivetrain-mule-v10.json');
  const known = ['--kind', '--input', '--output', '--progress', '--config'];
  if (!input || !output || !['E02', 'E03'].includes(kind) || argv.some(a => a.startsWith('--') && !known.includes(a))) throw new Error(USAGE);
  if (path.resolve(input) === path.resolve(output)) throw new Error('output must not overwrite raw input');
  const configText = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(configText);
  const options = {progress: argv.includes('--progress')};
  const text = fs.readFileSync(input, 'utf8');
  const summary = kind === 'E03' ? summarizeE03(text, config, options) : summarizeE02(text, options);
  summary.provenance.config_file = path.basename(configPath);
  summary.provenance.config_sha256 = crypto.createHash('sha256').update(configText).digest('hex');
  summary.provenance.analyzer_sha256 = crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex');
  summary.provenance.analysis_core_sha256 = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, 'mule-measurements-v4.js'))).digest('hex');
  fs.writeFileSync(output, JSON.stringify(summary, null, 2) + '\n', {flag: 'wx'});
  return summary;
}

module.exports = {main};

if (require.main === module) {
  const summary = main(process.argv.slice(2));
  console.log(`Wrote ${summary.status}; ${summary.trial_count} completed trials; no independent hardware qualification.`);
}
