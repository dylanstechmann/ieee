#!/usr/bin/env node
'use strict';
// One-command project check: the Node test suite, every tools/verify-*.js artifact
// verifier, the Python suites, and a working-tree cleanliness check.
// Agent-built tooling for the owner's hobby/learning project. It checks software and
// artifact reproducibility, not physical robot performance.
const {spawn, spawnSync} = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const has = name => argv.includes(name);
const option = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : fallback;
};
const repeated = name => argv.flatMap((a, i) => (a === name && i + 1 < argv.length ? [argv[i + 1]] : []));

const USAGE = `Usage: node tools/check-all.js [options]

Runs, from the repository root:
  1. node --test on every tests/*.test.js file (explicit list, TAP reporter)
  2. every tools/verify-*.js verifier in a parallel pool
  3. the Python unittest suites through uv (CPython 3.12, -B -I)
  4. a check that the run left tracked and untracked files unchanged

Options:
  --full                 also run expensive reproduction checks
                         (verify-planner-diagnostics-v3.js --reproduce, about 2 min)
  --jobs N               parallel verifier processes (default: min(6, CPU count))
  --skip TEXT            skip verifiers whose file name contains TEXT (repeatable)
  --no-node | --no-verifiers | --no-python   leave out a whole stage
  --verifier-timeout S   seconds per verifier before it is killed (default 900)
  --json FILE            write a machine-readable summary to FILE
  --log-dir DIR          write each step's full output to DIR
  --help                 show this text

Exit status is 0 only when every selected step passes and the tree is unchanged.
Skipped stages and verifiers are reported as skipped, never as passed.`;

if (has('--help')) {
  console.log(USAGE);
  process.exit(0);
}

const full = has('--full');
const jobs = Math.max(1, Number(option('--jobs', Math.min(6, os.cpus().length))) || 1);
const verifierTimeoutMs = Math.max(1, Number(option('--verifier-timeout', 900)) || 900) * 1000;
const skips = repeated('--skip');
const jsonOut = option('--json', null);
const logDir = option('--log-dir', null);
const OUTPUT_LIMIT = 8 * 1024 * 1024;

const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');

function git(...args) {
  return spawnSync('git', ['-c', `safe.directory=${root}`, ...args], {cwd: root, maxBuffer: 512 * 1024 * 1024});
}

function treeState() {
  const diff = git('diff', '--no-ext-diff', '--binary', 'HEAD');
  const untracked = git('ls-files', '--others', '--exclude-standard', '-z');
  if (diff.status !== 0 || untracked.status !== 0) return {available: false};
  return {
    available: true,
    diff_sha256: sha256(diff.stdout),
    untracked: untracked.stdout.toString('utf8').split('\0').filter(Boolean).sort(),
  };
}

function run(name, command, args, timeoutMs) {
  return new Promise(resolve => {
    const started = Date.now();
    const chunks = [];
    let size = 0;
    let timedOut = false;
    let child;
    const finish = (code, error) => resolve({
      name, code, timedOut, error: error ? String(error.message || error) : null,
      seconds: Math.round((Date.now() - started) / 100) / 10,
      output: Buffer.concat(chunks).toString('utf8'),
    });
    try {
      child = spawn(command, args, {cwd: root, env: process.env});
    } catch (error) {
      finish(null, error);
      return;
    }
    const collect = data => {
      if (size < OUTPUT_LIMIT) {
        chunks.push(data);
        size += data.length;
      }
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    const timer = timeoutMs ? setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs) : null;
    child.on('error', error => { if (timer) clearTimeout(timer); finish(null, error); });
    child.on('close', code => { if (timer) clearTimeout(timer); finish(code, null); });
  });
}

async function pool(items, worker, size) {
  const results = new Array(items.length);
  let next = 0;
  const lanes = Array.from({length: Math.min(size, items.length)}, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(lanes);
  return results;
}

const lastLine = text => text.split('\n').map(line => line.trim()).filter(Boolean).pop() || '';
const tail = (text, count = 30) => text.split('\n').slice(-count).join('\n');

// A one-line description of a step's output: the first error line for failures, a compact
// rendering for verifiers that print a JSON summary, otherwise the last non-empty line.
function describe(text, passed) {
  if (!passed) {
    const errorLine = text.split('\n').map(line => line.trim()).find(line => /error|assert|stale|mismatch|fail/i.test(line));
    if (errorLine) return errorLine;
  }
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    try {
      const value = JSON.parse(trimmed);
      return Object.entries(value).slice(0, 4).map(([k, v]) => {
        if (Array.isArray(v)) return `${k}: ${v.length} items`;
        if (v && typeof v === 'object') return `${k}: {${Object.keys(v).length} keys}`;
        return `${k}: ${v}`;
      }).join(', ');
    } catch (error) {
      // Not a single JSON document; fall through to the last line.
    }
  }
  return lastLine(text);
}

function statusOf(result) {
  if (result.error) return 'ERROR';
  if (result.timedOut) return 'TIMEOUT';
  return result.code === 0 ? 'PASS' : 'FAIL';
}

async function nodeStage() {
  const files = fs.readdirSync(path.join(root, 'tests')).filter(f => f.endsWith('.test.js')).sort().map(f => path.join('tests', f));
  const result = await run(`node --test (${files.length} files)`, process.execPath, ['--test', '--test-reporter=tap', ...files], 60 * 60 * 1000);
  const count = key => {
    const match = result.output.match(new RegExp(`^# ${key} (\\d+)$`, 'm'));
    return match ? Number(match[1]) : null;
  };
  const counts = {tests: count('tests'), pass: count('pass'), fail: count('fail'), skipped: count('skipped'), todo: count('todo'), cancelled: count('cancelled')};
  let status = statusOf(result);
  if (status === 'PASS' && (counts.pass === null || counts.pass === 0)) status = 'NO-TESTS';
  const detail = counts.tests === null ? lastLine(result.output)
    : `${counts.pass} pass, ${counts.fail} fail, ${counts.skipped} skipped, ${counts.todo} todo, ${counts.cancelled} cancelled`;
  return {...result, stage: 'node', status, counts, detail};
}

async function verifierStage() {
  const all = fs.readdirSync(path.join(root, 'tools')).filter(f => /^verify-.+\.js$/.test(f)).sort();
  const selected = all.filter(f => !skips.some(s => f.includes(s)));
  const skipped = all.filter(f => !selected.includes(f)).map(f => ({name: f.replace(/\.js$/, ''), stage: 'verifier', status: 'SKIPPED', seconds: 0, detail: 'skipped by --skip', output: ''}));
  const results = await pool(selected, async file => {
    // Never pass --seal: some verifiers rewrite their manifest when sealing.
    const args = [path.join('tools', file)];
    if (full && file === 'verify-planner-diagnostics-v3.js') args.push('--reproduce');
    const result = await run(file.replace(/\.js$/, '') + (args.length > 1 ? ' --reproduce' : ''), process.execPath, args, verifierTimeoutMs);
    const status = statusOf(result);
    return {...result, stage: 'verifier', status, detail: result.error || describe(result.output, status === 'PASS')};
  }, jobs);
  return [...results, ...skipped].sort((a, b) => a.name.localeCompare(b.name));
}

function pythonSuites() {
  const suites = [{name: 'python: software', start: 'software', top: 'software'}];
  if (fs.existsSync(path.join(root, 'firmware', 'host_tests'))) {
    suites.push({name: 'python: firmware host tests', start: 'firmware/host_tests', top: 'firmware'});
  }
  return suites;
}

async function pythonStage() {
  return pool(pythonSuites(), async suite => {
    const args = ['run', '--no-project', '--python', '3.12', 'python', '-B', '-I', '-m', 'unittest', 'discover', '-s', suite.start, '-t', suite.top, '-v'];
    const result = await run(suite.name, 'uv', args, 30 * 60 * 1000);
    const ran = result.output.match(/^Ran (\d+) tests? in/m);
    const skipped = result.output.match(/skipped=(\d+)/);
    let status = statusOf(result);
    if (status === 'PASS' && (!ran || Number(ran[1]) === 0)) status = 'NO-TESTS';
    const detail = ran ? `${ran[1]} tests${skipped ? `, ${skipped[1]} skipped` : ''}, ${lastLine(result.output)}` : (result.error || lastLine(result.output));
    return {...result, stage: 'python', status, counts: {tests: ran ? Number(ran[1]) : null, skipped: skipped ? Number(skipped[1]) : 0}, detail};
  }, 2);
}

function pythonVersion() {
  const probe = spawnSync('uv', ['run', '--no-project', '--python', '3.12', 'python', '-B', '-I', '-c', 'import sys; print(sys.version.split()[0])'], {cwd: root, encoding: 'utf8'});
  return probe.status === 0 ? probe.stdout.trim() : 'unavailable';
}

function printTable(rows) {
  const width = Math.max(30, ...rows.map(r => r.name.length));
  console.log(`${'STEP'.padEnd(width)}  ${'STATUS'.padEnd(8)}  ${'TIME'.padStart(7)}  DETAIL`);
  for (const r of rows) {
    const detail = (r.detail || '').replace(/\s+/g, ' ').slice(0, 110);
    console.log(`${r.name.padEnd(width)}  ${r.status.padEnd(8)}  ${(r.seconds.toFixed(1) + 's').padStart(7)}  ${detail}`);
  }
}

async function main() {
  const started = new Date();
  console.log(`check-all ${started.toISOString()} | node ${process.version} | root ${root}${full ? ' | --full' : ''}`);
  const before = treeState();
  const rows = [];

  if (!has('--no-node')) rows.push(await nodeStage());
  else rows.push({name: 'node --test', stage: 'node', status: 'SKIPPED', seconds: 0, detail: 'skipped by --no-node', output: ''});

  const [verifiers, python] = await Promise.all([
    has('--no-verifiers') ? Promise.resolve([{name: 'verifiers', stage: 'verifier', status: 'SKIPPED', seconds: 0, detail: 'skipped by --no-verifiers', output: ''}]) : verifierStage(),
    has('--no-python') ? Promise.resolve([{name: 'python', stage: 'python', status: 'SKIPPED', seconds: 0, detail: 'skipped by --no-python', output: ''}]) : pythonStage(),
  ]);
  rows.push(...verifiers, ...python);

  const after = treeState();
  const unchanged = before.available && after.available && before.diff_sha256 === after.diff_sha256
    && JSON.stringify(before.untracked) === JSON.stringify(after.untracked);
  const created = after.available && before.available ? after.untracked.filter(f => !before.untracked.includes(f)) : [];
  rows.push({
    name: 'working tree unchanged by the run', stage: 'tree', seconds: 0, output: '',
    status: !before.available || !after.available ? 'ERROR' : unchanged ? 'PASS' : 'FAIL',
    detail: !before.available || !after.available ? 'git state unavailable'
      : unchanged ? 'tracked diff and untracked file list identical before and after'
        : `tree changed during the run${created.length ? `; new untracked: ${created.slice(0, 5).join(', ')}` : '; tracked files differ'}`,
  });

  console.log('');
  printTable(rows);
  const failing = rows.filter(r => !['PASS', 'SKIPPED'].includes(r.status));
  const skippedRows = rows.filter(r => r.status === 'SKIPPED');
  for (const r of failing) {
    if (!r.output) continue;
    console.log(`\n--- ${r.name}: ${r.status} (last 30 lines) ---\n${tail(r.output)}`);
  }
  const seconds = Math.round((Date.now() - started.getTime()) / 100) / 10;
  const verdict = failing.length ? 'FAIL' : 'PASS';
  console.log(`\nRESULT: ${verdict} | ${rows.length - failing.length - skippedRows.length} passed, ${failing.length} not passing, ${skippedRows.length} skipped | ${seconds}s`);

  if (logDir) {
    fs.mkdirSync(logDir, {recursive: true});
    for (const r of rows) if (r.output) fs.writeFileSync(path.join(logDir, r.name.replace(/[^A-Za-z0-9._-]+/g, '_') + '.log'), r.output);
  }
  if (jsonOut) {
    const summary = {
      tool: 'tools/check-all.js', started: started.toISOString(), seconds, verdict, full,
      node: process.version, python: has('--no-python') ? 'not run' : pythonVersion(),
      tree: {before_diff_sha256: before.diff_sha256 || null, after_diff_sha256: after.diff_sha256 || null, unchanged, new_untracked: created},
      steps: rows.map(({output, error, timedOut, code, ...rest}) => ({...rest, exit_code: code === undefined ? null : code})),
    };
    fs.writeFileSync(jsonOut, JSON.stringify(summary, null, 2) + '\n');
  }
  process.exitCode = failing.length ? 1 : 0;
}

main().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 2;
});
