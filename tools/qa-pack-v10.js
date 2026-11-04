#!/usr/bin/env node
'use strict';
// Builds derived/qa-pack-v10 from qa-pack-v10.json: the deduplicated official Q&A questions,
// Discord-ready text, an answer-ledger template and a manifest. Agent-prepared drafts for the
// owner's hobby/learning project; the agent never posts them or contacts organizers.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const SOURCE = 'qa-pack-v10.json';
const OUT = 'derived/qa-pack-v10';
const LEDGER = 'qa/answers-ledger.json';
const DISCORD_LIMIT = 1900;
const LEDGER_STATUSES = ['not-posted', 'already-answered', 'posted', 'answered', 'withdrawn'];

const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
const docLabel = doc => ({GM1: 'GM1 V3', GM2: 'GM2 V3', GM1v2: 'GM1 V2 (historical)'}[doc] || doc);

function loadPack() {
  return JSON.parse(read(SOURCE));
}

function paragraphLines(pack) {
  const lines = {};
  for (const [doc, file] of Object.entries(pack.sources)) lines[doc] = read(file).split('\n');
  return lines;
}

function validatePack(pack) {
  const problems = [];
  const lines = paragraphLines(pack);
  const ids = new Set();
  const ranks = new Set();
  for (const q of pack.questions) {
    if (ids.has(q.id)) problems.push(`duplicate id ${q.id}`);
    ids.add(q.id);
    if (ranks.has(q.rank)) problems.push(`duplicate rank ${q.rank}`);
    ranks.add(q.rank);
    if (![1, 2].includes(q.batch)) problems.push(`${q.id}: batch must be 1 or 2`);
    for (const key of ['topic', 'question', 'design_impact', 'interim_assumption']) {
      if (typeof q[key] !== 'string' || !q[key].trim()) problems.push(`${q.id}: missing ${key}`);
    }
    if (!Array.isArray(q.citations) || q.citations.length === 0) problems.push(`${q.id}: no citations`);
    for (const c of q.citations || []) {
      if (typeof c.section !== 'string' || !c.section) problems.push(`${q.id}: citation ${c.doc} line ${c.line} needs a manual section label`);
      const text = (lines[c.doc] || [])[c.line - 1];
      if (text === undefined) problems.push(`${q.id}: ${c.doc} line ${c.line} does not exist`);
      else if (!text.includes(c.quote)) problems.push(`${q.id}: quote not found at ${c.doc} line ${c.line}: "${c.quote}"`);
    }
  }
  const expectedRanks = pack.questions.map((_, i) => i + 1);
  if (JSON.stringify([...ranks].sort((a, b) => a - b)) !== JSON.stringify(expectedRanks)) problems.push('ranks must run 1..N without gaps');
  const mapped = new Set(pack.questions.flatMap(q => q.supersedes || []));
  for (const old of Object.keys(pack.previous_question_sets)) {
    if (!mapped.has(old)) problems.push(`earlier item ${old} is not mapped to any new question`);
  }
  for (const q of pack.questions) for (const old of q.supersedes || []) {
    if (!(old in pack.previous_question_sets)) problems.push(`${q.id}: supersedes unknown item ${old}`);
  }
  for (const message of pasteMessages(pack)) {
    if (message.text.length > DISCORD_LIMIT) problems.push(`${message.id}: paste text is ${message.text.length} characters (limit ${DISCORD_LIMIT})`);
  }
  return problems;
}

function ordered(pack) {
  return [...pack.questions].sort((a, b) => a.rank - b.rank);
}

function citationLine(c) {
  return `${docLabel(c.doc)} ${c.section} (extracted paragraph line ${c.line}): "${c.quote}"`;
}

function pasteMessages(pack) {
  return ordered(pack).map(q => {
    const byDoc = {};
    for (const c of q.citations.filter(x => x.doc !== 'GM1v2')) (byDoc[c.doc] = byDoc[c.doc] || []).includes(c.section) || byDoc[c.doc].push(c.section);
    const refs = Object.entries(byDoc).map(([doc, sections]) => `${doc} ${sections.join(', ')}`).join('; ');
    const text = `[${q.id}] ${q.topic}\n${q.question}\n(Manual references, V3.0: ${refs}.)`;
    return {id: q.id, batch: q.batch, text};
  });
}

function questionsMarkdown(pack) {
  const out = [
    '# Official Q&A clarification pack v10',
    '',
    `${pack.date} · IEEE SoutheastCon 2027 Stock Car Race · personal hobby/learning project, AI-assisted`,
    '',
    '**Status: draft, not posted.** These questions were prepared by an AI agent from the archived manuals. The owner or the club rules lead decides what to post. The agent does not post or contact organizers. Silence, or an AI reading of the manual, is not permission.',
    '',
    `Manual revision: ${pack.manual_revision}`,
    '',
    '## How to use this pack',
    '',
    '1. Search the official SoutheastCon Discord Q&A first. Record the channel, date range and search terms in `qa/answers-ledger.json` under `search_log`.',
    '2. For any question already answered there, copy the answer into the ledger with its date and mark it `already-answered`.',
    '3. Post batch 1 (the four questions that change the robot most), then batch 2, using `PASTE.md`.',
    '4. Archive each answer verbatim in the ledger: date, respondent role and the manual revision it refers to.',
    '5. Re-run `node tools/check-all.js`; the Q&A verifier checks the ledger format.',
    '',
    '## Questions in priority order',
    '',
  ];
  for (const q of ordered(pack)) {
    out.push(`### ${q.id}: ${q.topic} (batch ${q.batch})`, '');
    out.push(`**Question.** ${q.question}`, '');
    out.push('**Manual text.**', '');
    for (const c of q.citations) out.push(`- ${citationLine(c)}`);
    out.push('', `**Why it matters.** ${q.design_impact}`, '');
    out.push(`**Working assumption until answered.** ${q.interim_assumption}`, '');
    out.push(`**Replaces earlier items.** ${(q.supersedes || []).join(', ')}`, '');
  }
  out.push('## Where the earlier drafts went', '', '| Earlier item | Description | Now covered by |', '|---|---|---|');
  for (const [old, description] of Object.entries(pack.previous_question_sets)) {
    const now = ordered(pack).filter(q => (q.supersedes || []).includes(old)).map(q => q.id).join(', ');
    out.push(`| ${old} | ${description.replace(/\|/g, '/')} | ${now} |`);
  }
  out.push('', 'The earlier drafts are kept unchanged in `derived/confirmation-packet-v3/` and `derived/team-brief-v7/`.', '');
  return out.join('\n');
}

function pasteMarkdown(pack) {
  const out = [
    '# Paste-ready Discord text',
    '',
    'Post one message per question, after searching for existing answers. Each message stays under Discord\'s 2,000-character limit. Keep the manual references; they help the referees answer precisely.',
    '',
  ];
  for (const batch of [1, 2]) {
    out.push(`## Batch ${batch}`, '');
    for (const m of pasteMessages(pack).filter(x => x.batch === batch)) {
      out.push('```text', m.text, '```', '');
    }
  }
  return out.join('\n');
}

function ledgerTemplate(pack) {
  return {
    schema: 'qa-answers-ledger/v1',
    pack: `${OUT}/QUESTIONS.md`,
    manual_revision: pack.manual_revision,
    statuses: LEDGER_STATUSES,
    search_log: [],
    entries: ordered(pack).map(q => ({
      id: q.id, topic: q.topic, status: 'not-posted', posted_at: null, channel: null, message_link: null,
      answer_text: null, answered_at: null, respondent_role: null, manual_revision_cited: null, notes: null,
    })),
  };
}

function validateLedger(pack, ledger) {
  const problems = [];
  const ids = new Set(pack.questions.map(q => q.id));
  if (ledger.schema !== 'qa-answers-ledger/v1') problems.push('ledger schema must be qa-answers-ledger/v1');
  if (!Array.isArray(ledger.search_log)) problems.push('ledger search_log must be a list');
  for (const s of ledger.search_log || []) {
    for (const key of ['searched_at', 'channel', 'date_range', 'terms']) if (!s[key]) problems.push(`search_log entry missing ${key}`);
  }
  if (!Array.isArray(ledger.entries)) return problems.concat('ledger entries must be a list');
  const seen = new Set();
  for (const e of ledger.entries) {
    if (!ids.has(e.id)) problems.push(`ledger entry for unknown question ${e.id}`);
    if (seen.has(e.id)) problems.push(`duplicate ledger entry ${e.id}`);
    seen.add(e.id);
    if (!LEDGER_STATUSES.includes(e.status)) problems.push(`${e.id}: status must be one of ${LEDGER_STATUSES.join(', ')}`);
    if (['posted', 'answered'].includes(e.status) && !e.posted_at) problems.push(`${e.id}: posted_at required once posted`);
    if (['answered', 'already-answered'].includes(e.status)) {
      for (const key of ['answer_text', 'answered_at', 'respondent_role']) if (!e[key]) problems.push(`${e.id}: ${key} required for status ${e.status}`);
    }
  }
  for (const id of ids) if (!seen.has(id)) problems.push(`ledger has no entry for ${id}`);
  return problems;
}

function build(pack) {
  const files = {
    'QUESTIONS.md': questionsMarkdown(pack),
    'PASTE.md': pasteMarkdown(pack),
    'ledger-template.json': JSON.stringify(ledgerTemplate(pack), null, 2) + '\n',
  };
  const inputs = [SOURCE, 'tools/qa-pack-v10.js', ...Object.values(pack.sources)];
  const manifest = {
    date: pack.date,
    status: 'agent-prepared Q&A drafts; not posted; not organizer answers',
    input_hashes: Object.fromEntries(inputs.map(f => [f, sha256(fs.readFileSync(path.join(root, f)))])),
    output_hashes: Object.fromEntries(Object.entries(files).map(([f, text]) => [f, sha256(text)])),
  };
  files['manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  return files;
}

module.exports = {SOURCE, OUT, LEDGER, loadPack, validatePack, validateLedger, ledgerTemplate, pasteMessages, build};

if (require.main === module) {
  const pack = loadPack();
  const problems = validatePack(pack);
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  const dest = path.join(root, OUT);
  fs.mkdirSync(dest, {recursive: true});
  for (const [file, text] of Object.entries(build(pack))) fs.writeFileSync(path.join(dest, file), text);
  const ledgerPath = path.join(root, LEDGER);
  if (!fs.existsSync(ledgerPath)) {
    fs.mkdirSync(path.dirname(ledgerPath), {recursive: true});
    fs.writeFileSync(ledgerPath, JSON.stringify(ledgerTemplate(pack), null, 2) + '\n');
    console.log(`Created the live answer ledger ${LEDGER}`);
  }
  console.log(`Wrote ${pack.questions.length} questions to ${OUT}`);
}
