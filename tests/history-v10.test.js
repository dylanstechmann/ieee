'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

// The README rewritten on 2026-11-03 must survive verbatim in HISTORY.md.
const PRESERVED_README_SHA256 = '69faaf0d5bc08209d2a34719eb2bd5f29ef96c11ba3925a41f676b8f1581fd9e';

test('HISTORY.md preserves the November 3 README byte for byte', () => {
  const history = fs.readFileSync(path.join(root, 'HISTORY.md'), 'utf8');
  const begin = '<!-- BEGIN README 2026-11-03 -->\n';
  const end = '<!-- END README 2026-11-03 -->';
  const start = history.indexOf(begin);
  const stop = history.indexOf(end);
  assert.ok(start >= 0 && stop > start, 'preservation markers missing');
  const block = history.slice(start + begin.length, stop);
  assert.equal(crypto.createHash('sha256').update(block).digest('hex'), PRESERVED_README_SHA256);
  assert.ok(history.includes(PRESERVED_README_SHA256), 'recorded hash missing from HISTORY.md');
});

test('the current README points to the history and the current plan', () => {
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  for (const target of ['HISTORY.md', 'BACKCAST-2026-11.md', 'PROJECT-STATUS.md', 'tools/check-all.js', 'ERRATA-2026-11.md']) {
    assert.ok(readme.includes(target), `README does not mention ${target}`);
    assert.ok(fs.existsSync(path.join(root, target)), `${target} does not exist`);
  }
  assert.match(readme, /hobby and learning project/);
  assert.match(readme, /AI assistance/);
});
