'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {validateQuestions,validateBaseline,choose,diagram,paragraphs}=require('../tools/confirmation-packet-v3'),{build}=require('../tools/constrained-field-v3');
const read=f=>JSON.parse(fs.readFileSync(path.resolve(__dirname,'..',f),'utf8'));
test('confirmation questions remain unique, unresolved and unsent',()=>{
  const q=read('confirmation-questions-v3.json');validateQuestions(q);assert.equal(q.questions.length,7);
  assert.throws(()=>validateQuestions({...q,status:'sent'}),/unsent/);
  assert.throws(()=>validateQuestions({...q,questions:[q.questions[0],q.questions[0]]}),/unique/);
  assert.throws(()=>validateQuestions({...q,questions:[{...q.questions[0],answer:'permitted'}]}),/unresolved/);
});
test('reference selection refuses missing route and uses comparable empty controls',()=>{
  const r=read('derived/connected-navigation-v3/report.json');
  for(const policy of ['selectable-original-regions','experimental-north-pit-access']){const {row,plan}=choose(r,policy);assert.equal(row.obstacle_case,'empty-control');assert.equal(plan.route.target_id,'pit_box_1');assert.ok(plan.contract.pit.valid);}
  assert.throws(()=>choose(r,'invented'),/missing/);
});
test('diagrams contain actual pit paths, full footprints and no fabricated official finish line',()=>{
  const r=read('derived/connected-navigation-v3/report.json'),source=read('constrained-field-v3.json'),model=build(source,read(source.trace_file));
  for(const policy of ['selectable-original-regions','experimental-north-pit-access']){
    const d=diagram(model,r,policy,'Fixture'),p=choose(r,policy).plan;
    assert.equal(d.metadata.official_finish_line,null);assert.ok(d.metadata.footprint_indices.includes(p.route.docking_waypoint_index));
    assert.match(d.svg,/data-phase="Pit arrival"/);assert.match(d.svg,/data-phase="Withdrawal"/);assert.match(d.svg,/data-footprint-index/);assert.match(d.svg,/not a three-lap mission/);assert.match(d.svg,/No finish-line location inferred/);assert.match(d.svg,/not travel direction/);
    assert.equal((d.svg.match(/<svg /g)||[]).length,1);assert.ok(d.svg.endsWith('</svg>\n'));
  }
});
test('freshly retrieved GM2 excerpts match indexed archived facts',()=>{
  const p=paragraphs(path.resolve(__dirname,'../sources/confirmation-2026-10-31/Game-Manual-2027-2-V3-1.docx'));
  assert.match(p[118],/3 randomly placed obstacles/);assert.match(p[148],/inside edge/);assert.match(p[362],/16 inches/);assert.match(p[373],/does not have to enter/);
});
test('owner Discord report cannot become agent review or legality confirmation',()=>{
  const q=read('confirmation-questions-v3.json'),b=read('confirmation-baseline-v3.json');validateBaseline(b,q);
  for(const field of ['agent_reviewed_messages','legality_confirmed'])assert.throws(()=>validateBaseline({...b,owner_review:{...b.owner_review,[field]:true}},q),/owner report/);
  assert.throws(()=>validateBaseline({...b,owner_review:{...b.owner_review,checked_at:'2026-10-31T00:00:00Z'}},q),/exact check time/);
});
test('baseline requires readable references and acceptance coverage for every unresolved question',()=>{
  const q=read('confirmation-questions-v3.json'),b=read('confirmation-baseline-v3.json');
  assert.throws(()=>validateBaseline({...b,source_labels:{}},q),/source label/);
  assert.throws(()=>validateBaseline({...b,acceptance_cases:b.acceptance_cases.slice(1)},q),/coverage/);
  assert.throws(()=>validateBaseline({...b,acceptance_cases:b.acceptance_cases.map((x,i)=>i?x:{...x,status:'passed'})},q),/acceptance/);
  assert.throws(()=>validateBaseline({...b,acceptance_cases:[...b.acceptance_cases,b.acceptance_cases[0]]},q),/acceptance/);
});
test('geometry ledger keeps unsupported manufacturer and measured dimensions unknown',()=>{
  const q=read('confirmation-questions-v3.json'),b=read('confirmation-baseline-v3.json');
  for(const category of ['manufacturer-documented','physically-measured']){
    const item=b.geometry_evidence.find(x=>x.category===category);assert.equal(item.fact,null);assert.equal(item.dimensions_in,null);
    assert.throws(()=>validateBaseline({...b,geometry_evidence:b.geometry_evidence.map(x=>x===item?{...x,dimensions_in:[16,16]}:x)},q),/geometry/);
    assert.throws(()=>validateBaseline({...b,geometry_evidence:b.geometry_evidence.map(x=>x===item?{...x,fact:'verified'}:x)},q),/unsupported/);
  }
});
test('published tolerance and starting volume references are checked against archived manual',()=>{
  const p=paragraphs(path.resolve(__dirname,'../sources/confirmation-2026-10-31/Game-Manual-2027-2-V3-1.docx')),q=read('confirmation-questions-v3.json');
  assert.match(p[192],/G02.*Playing Field Tolerances/);assert.match(p[192],/1 inch/);assert.match(p[193],/dimensional and location/);assert.match(p[194],/G03.*12 inches x 12 inches x 12 inches/);
  assert.ok(q.questions.find(x=>x.id==='Q6').source_refs.includes('GM2:192'));
  assert.match(q.questions.find(x=>x.id==='Q6').question,/already specifies/);
});