#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {paragraphs,diagram,validateQuestions,validateBaseline}=require('./confirmation-packet-v3'),{build}=require('./constrained-field-v3');
const root=path.resolve(__dirname,'..'),out=path.join(root,'derived/confirmation-packet-v3'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f))),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const manifest=read('derived/confirmation-packet-v3/manifest.json'),q=read('confirmation-questions-v3.json');validateQuestions(q);
for(const [f,h] of Object.entries(manifest.input_hashes))assert.equal(hash(path.join(root,f)),h,`stale input ${f}`);
for(const [f,h] of Object.entries(manifest.artifact_hashes))assert.equal(hash(path.join(out,f)),h,`changed artifact ${f}`);
const snapshot=read(q.source_snapshot),base=path.dirname(q.source_snapshot);
for(const f of [snapshot.page,...snapshot.files]){const p=path.join(root,base,f.file);assert.equal(hash(p),f.sha256);assert.equal(fs.statSync(p).size,f.bytes);}
for(const f of snapshot.files){assert.equal(f.byte_identical_to_archive,f.sha256===f.previous_sha256);const prior=path.join(root,f.file.endsWith('.pdf')?'sources':'sources/organizer-2026-10-29',f.file);assert.equal(hash(prior),f.previous_sha256);}
const ledger=read('derived/confirmation-packet-v3/evidence-ledger.json');assert.equal(ledger.items.length,7);assert.equal(ledger.qa.status,'not-reviewed');for(const item of ledger.items){assert.equal(item.status,'unresolved');assert.equal(item.answer,null);assert.equal(item.answer_provenance,null);}
const baseline=read('confirmation-baseline-v3.json');validateBaseline(baseline,q);
assert.deepEqual(ledger.owner_review,baseline.owner_review);assert.deepEqual(ledger.geometry_evidence,baseline.geometry_evidence);
assert.equal(ledger.status,'unresolved-owner-reported-no-new-information');
const acceptance=read('derived/confirmation-packet-v3/acceptance-specification.json');assert.equal(acceptance.status,'specified-not-executed');assert.deepEqual(acceptance.cases,baseline.acceptance_cases);
const draft=fs.readFileSync(path.join(out,'questions-to-organizer.md'),'utf8');for(const ref of q.questions.flatMap(x=>x.source_refs))assert.ok(draft.includes(baseline.source_labels[ref]),`missing readable reference ${ref}`);
const excerpts=read('derived/confirmation-packet-v3/source-excerpts.json'),docs=new Map();for(const e of excerpts.excerpts){if(!docs.has(e.source_file))docs.set(e.source_file,paragraphs(path.join(root,e.source_file)));assert.equal(docs.get(e.source_file)[e.paragraph_index],e.text);}
const report=read('derived/connected-navigation-v3/report.json'),source=read('constrained-field-v3.json'),model=build(source,read(source.trace_file));for(const m of read('derived/confirmation-packet-v3/diagram-metadata.json')){const d=diagram(model,report,m.policy,m.label);assert.equal(fs.readFileSync(path.join(out,m.file),'utf8'),d.svg);assert.deepEqual(m,{file:m.file,...d.metadata});}
assert.equal(manifest.external_communication,'none');console.log('Verified archived download/page hashes, archive comparisons, 7 unresolved questions, readable references, owner-report separation, geometry ledger, 7 unexecuted acceptance specifications, exact excerpts, 2 route-derived diagrams and freshness. No new online check or legality promoted.');