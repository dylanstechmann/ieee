#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const {build}=require('./constrained-field-v3'),{makeField,footprint}=require('./navigation-v3');
const root=path.resolve(__dirname,'..'),out=path.join(root,'derived/confirmation-packet-v3');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8')),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function paragraphs(file){
  const xml=cp.execFileSync('unzip',['-p',file,'word/document.xml'],{encoding:'utf8',maxBuffer:12000000});
  return [...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)].map(m=>[...m[0].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(m=>m[1]).join(''));
}
function validateQuestions(q){
  if(q.status!=='draft-not-sent-no-organizer-answers'||!Array.isArray(q.questions)||!q.questions.length)throw Error('unsent question set required');
  const ids=new Set();for(const v of q.questions){if(ids.has(v.id)||!/^Q[1-9]\d*$/.test(v.id)||v.status!=='unresolved'||v.answer!==null||!v.question||!v.model_effect||!v.source_refs?.length||v.source_refs.some(s=>!/^GM[12]:\d+$/.test(s)))throw Error('unique unresolved questions with source refs required');ids.add(v.id);}
}
function choose(report,policy){
  const row=report.results.find(r=>r.obstacle_case==='empty-control'&&r.wall==='inside-nominal'&&r.mode==='constrained-variants'&&r.policy===policy),plan=row?.plans.find(p=>p.route?.target_id==='pit_box_1');
  if(!plan?.segment_indices||plan.status!=='found')throw Error(`complete pit_box_1 reference route missing: ${policy}`);
  return {row,plan};
}
function validateBaseline(b,q){
  const review=b.owner_review;
  if(review?.status!=='owner-reported-no-new-information'||review.agent_reviewed_messages!==false||review.legality_confirmed!==false||!review.statement||review.checked_at!==null)throw Error('owner report must not imply agent review, exact check time or legality');
  const ids=new Set(q.questions.map(x=>x.id)),cases=new Set(),geometry=new Set();
  for(const ref of q.questions.flatMap(x=>x.source_refs))if(!b.source_labels?.[ref])throw Error(`readable source label required: ${ref}`);
  for(const item of b.geometry_evidence||[]){
    if(!item.id||geometry.has(item.id)||!['organizer-specified','manufacturer-documented','physically-measured','engineering-assumption'].includes(item.category)||item.dimensions_in!==null||!item.unknown||!item.question_ids?.length||item.question_ids.some(id=>!ids.has(id)))throw Error('invalid geometry evidence');
    if(['manufacturer-documented','physically-measured'].includes(item.category)&&(item.fact!==null||item.source_refs.length))throw Error('unsupported envelope evidence');
    if(item.category==='organizer-specified'&&(!item.fact||!item.source_refs.length))throw Error('organizer evidence requires sources');
    for(const ref of item.source_refs)if(!b.source_labels[ref])throw Error('geometry source label required');
    geometry.add(item.id);
  }
  for(const category of ['organizer-specified','manufacturer-documented','physically-measured','engineering-assumption'])if(!b.geometry_evidence?.some(x=>x.category===category))throw Error('missing geometry category');
  for(const c of b.acceptance_cases||[]){
    if(!c.id||cases.has(c.id)||c.status!=='specified-not-executed'||!c.required_evidence||!c.positive_case||!c.negative_case||!c.affected_contract||!c.question_ids?.length||c.question_ids.some(id=>!ids.has(id)))throw Error('invalid acceptance specification');
    cases.add(c.id);
  }
  for(const id of ids)if(!b.acceptance_cases?.some(c=>c.question_ids.includes(id)))throw Error(`missing acceptance coverage: ${id}`);
}
// Render actual stored waypoints; arrows describe SPATIAL travel, not body heading.
// No invented finish-line geometry or obstacle placement is drawn.
function diagram(model,report,policy,label){
  const {row,plan}=choose(report,policy),route=plan.route,field=makeField(model,row.config,row.config.wall_scenarios[0]),i=plan.segment_indices;
  const S=10,X=48,Y=720,xy=p=>[X+p[0]*S,Y-p[1]*S],point=p=>xy(p).map(n=>n.toFixed(2)).join(','),poly=p=>p.map(point).join(' ');
  const text=(x,y,t,attrs='')=>`<text x="${x}" y="${y}" ${attrs}>${escape(t)}</text>`;
  const line=(a,b,attrs)=>`<line x1="${xy(a)[0]}" y1="${xy(a)[1]}" x2="${xy(b)[0]}" y2="${xy(b)[1]}" ${attrs}/>`;
  const parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1040" viewBox="0 0 1320 1040"><title>${escape(label)} — clarification request, not legal route</title><desc>Actual stored empty-control route; 10 by 10 inch robot sampled footprints. Field geometry and internal boundaries are provisional. North and south are diagram labels only. Official finish line is not located by this model. No official obstacles drawn.</desc><defs><marker id="in" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#086fbd"/></marker><marker id="out" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="#b34500"/></marker></defs><style>text{font:15px sans-serif;fill:#172b3a} .small{font-size:13px} .heading{font-size:23px;font-weight:bold}</style><rect width="1320" height="1040" fill="white"/>`,text(40,35,`${label}: ${policy==='experimental-north-pit-access'?'alternate north-end access':'original-region south-end access'}`,'class="heading"'),text(40,63,'DRAFT FOR Q&A — source-backed permission NOT established; not a three-lap mission or hardware test.'),text(40,87,'Actual empty-control, variant-aware example to pit box 1; route choices and geometry are engineering assumptions.'),text(40,111,'Local coordinates in inches: x → race end, y ↑ on this sheet. “North/south” are not official field names.')];
  parts.push(`<rect x="${X}" y="${Y-480}" width="960" height="480" fill="#f5f7f9" stroke="#172b3a" stroke-width="2"/>`);
  for(const f of model.features.filter(f=>f.kind==='marking')){
    parts.push(`<polygon points="${poly(f.vertices_in)}" fill="${f.id==='start_box'?'#e4d9f8':'#e3e9ed'}" stroke="#657684"/>`);
    const a=xy(f.vertices_in[0]);parts.push(text(a[0]+3,a[1]-7,f.id.replaceAll('_',' '),'class="small"'));
  }
  const trace=model.features.find(f=>f.id==='track_marking_trace');parts.push(`<polygon points="${poly(trace.vertices_in)}" fill="none" stroke="#91999f" stroke-dasharray="6 5" stroke-width="2"/>`);
  for(const solid of field.solids)parts.push(`<polygon points="${poly(solid.vertices_in)}" fill="#4b5560"/>`);
  const pt=xy([28,24]);parts.push(text(pt[0]-145,pt[1], 'pit divider (traced x=28)','class="small"'));
  parts.push(text(X+500,Y-250,'center divider','class="small"'));
  const groups=[{name:'Race construction',from:0,to:i[12],color:'#6a737c',width:2},{name:'Pit arrival',from:i[12],to:i[13],color:'#086fbd',width:4},{name:'Withdrawal',from:i[13],to:i[14],color:'#b34500',width:3},{name:'Race re-entry',from:i[14],to:i[15],color:'#68707c',width:2}];
  for(const g of groups){
    parts.push(`<polyline data-phase="${g.name}" points="${poly(route.waypoints.slice(g.from,g.to+1))}" fill="none" stroke="${g.color}" stroke-width="${g.width}" ${g.name==='Withdrawal'?'stroke-dasharray="8 5"':''}/>`);
    let distance=0;for(let n=g.from+1;n<=g.to;n++){
      const a=route.waypoints[n-1],b=route.waypoints[n],len=Math.hypot(b[0]-a[0],b[1]-a[1]);distance+=len;
      if((g.name==='Pit arrival'||g.name==='Withdrawal')&&len>0&&distance>=7){parts.push(line(a,b,`stroke="${g.color}" stroke-width="3" marker-end="url(#${g.name==='Pit arrival'?'in':'out'})"`));distance=0;}
    }
  }
  // Sparse key footprints include full extent at dock and every pit rotation.
  const selected=new Set([0,i[12],i[13],i[14],i[15]]);
  for(let n=i[12]+1;n<=i[14];n++)if(route.waypoints[n][2]!==route.waypoints[n-1][2])selected.add(n);
  for(const n of selected){const p=route.waypoints[n];parts.push(`<polygon data-footprint-index="${n}" points="${poly(footprint(p,row.config.robot))}" fill="none" stroke="#1a7b60" stroke-opacity="0.55" stroke-width="1"/>`);const rad=p[2]*Math.PI/180;parts.push(line(p,[p[0]+3*Math.cos(rad),p[1]+3*Math.sin(rad)],'stroke="#1a7b60" stroke-width="1.5"'));}
  for(const [name,n] of [['S',0],['M',i[12]],['D',i[13]],['R',i[15]]]){const p=xy(route.waypoints[n]);parts.push(`<circle cx="${p[0]}" cy="${p[1]}" r="8" fill="white" stroke="#172b3a"/>`,text(p[0]-5,p[1]+5,name,'class="small"'));}
  for(const y of [0,12,24,36,48])parts.push(text(13,Y-y*S+5,String(y),'class="small"'));
  for(const x of [0,24,48,72,96])parts.push(text(X+x*S-6,Y+23,String(x),'class="small"'));
  const nx=1040;['Q1: Which access end(s) allowed?','Q2: Do dashed markings bound','the full robot or guide motion?','Q3: Official finish line and lap','counting direction UNLOCATED.','Q4–Q6: No official obstacle','positions or shapes assumed.','Q7: Is entering the box needed','for exchange, or only parking?'].forEach((t,n)=>parts.push(text(nx,265+n*25,t,'class="small"')));
  parts.push(text(50,165,'NORTH END (local label)', 'font-weight="bold"'),text(50,760,'SOUTH END (local label)','font-weight="bold"'),text(45,805,'Legend: blue solid = arrival; orange dashed = withdrawal (often overlaps arrival); grey = retained race/re-entry.'),text(45,829,'Green polygons = selected 10×10-in chassis footprints; short green lines = body heading, not travel direction.'),text(45,853,'S = start; M = retained mouth pose; D = unchanged dock; R = final race staging. Spins/reverse travel occur.'),text(45,877,'Dashed grey track outline is a low-resolution trace, NOT an official legal boundary. No finish-line location inferred.'),text(45,901,'No tire/mechanism extension or official vehicle envelope shown; those must be specified before qualification.'),text(45,925,'Source geometry: archived GM2 V3 drawing + constrained-field-v3.json; wall scenario inside-nominal.'),text(45,949,'Both illustrations deliberately use the empty control: no claim that a square pit blocker is an official placement.'),text(45,973,'Agent-prepared clarification illustration — no organizer answer received or external message sent.'),'</svg>');
  return {svg:parts.join('\n')+'\n',metadata:{policy,label,obstacle_case:row.obstacle_case,wall:row.wall,mode:row.mode,route_id:route.id,target_id:route.target_id,segment_indices:i,docking_waypoint_index:route.docking_waypoint_index,footprint_indices:[...selected],robot:row.config.robot,official_finish_line:null}};
}
function generate(){
  const q=read('confirmation-questions-v3.json');validateQuestions(q);const baseline=read('confirmation-baseline-v3.json');validateBaseline(baseline,q);const report=read('derived/connected-navigation-v3/report.json'),source=read('constrained-field-v3.json'),model=build(source,read(source.trace_file)),snapshot=read(q.source_snapshot),base=path.dirname(q.source_snapshot);
  const documents={GM1:paragraphs(path.join(root,base,'Game-Manual-2027-1-V3.docx')),GM2:paragraphs(path.join(root,base,'Game-Manual-2027-2-V3-1.docx'))},refs=[...new Set([...q.questions.flatMap(x=>x.source_refs),'GM1:142','GM1:145','GM1:147','GM1:148','GM1:149','GM1:150','GM1:151','GM1:152','GM1:153'])];
  const excerpts=refs.map(ref=>{const [doc,index]=ref.split(':');if(!documents[doc][+index])throw Error(`missing excerpt ${ref}`);return {ref,paragraph_index:+index,text:documents[doc][+index],source_file:path.join(base,doc==='GM1'?'Game-Manual-2027-1-V3.docx':'Game-Manual-2027-2-V3-1.docx')};});
  const ledger={date:q.date,status:'unresolved-owner-reported-no-new-information',published_files:snapshot.files.map(f=>({file:f.file,sha256:f.sha256,byte_identical_to_archive:f.byte_identical_to_archive})),qa:snapshot.qa,owner_review:baseline.owner_review,geometry_evidence:baseline.geometry_evidence,items:q.questions.map(x=>({id:x.id,topic:x.topic,status:x.status,answer:x.answer,source_refs:x.source_refs,model_effect:x.model_effect,answer_provenance:null,required_regression_review:true}))};
  const draft=['# Draft organizer clarification request — NOT SENT','','We are studying the 2027 Stock Car Race manuals currently posted as V3.0. Our two attached engineering illustrations ask about permitted paths; neither is a claim of legality or a complete three-lap plan. Please cite an existing official #qna answer if these questions are already resolved.','', 'Attachments: diagram-A-south.svg and diagram-B-north.svg (actual stored empty-control paths, selected full chassis footprints, local coordinate labels). Use accompanying PNG copies if SVG attachments are unsupported.','',...q.questions.flatMap(x=>[`## ${x.id} — ${x.topic}`,'',x.question,'',`References: ${x.source_refs.join(', ')} (see source-excerpts.json for extracted paragraphs).`,'']), 'Please identify applicable manual/Q&A revision and any qualifications to the answers. The attached traced field is provisional; a marked official drawing would be preferable.','', 'Agent-assisted draft for the owner to review and post. No claim of team affiliation, hardware validation or organizer endorsement.',''].join('\n');
  let readable=draft;for(const x of q.questions)readable=readable.replace(`References: ${x.source_refs.join(', ')} (see source-excerpts.json for extracted paragraphs).`,`References: ${x.source_refs.map(ref=>`${baseline.source_labels[ref]} [${ref}]`).join('; ')}. Bracketed identifiers are extraction indices, not printed page numbers.`);
  fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'questions-to-organizer.md'),readable);fs.writeFileSync(path.join(out,'source-excerpts.json'),JSON.stringify({extraction:'zero-based w:p paragraphs, concatenated w:t including empty paragraphs; XML entities retained',excerpts},null,2)+'\n');fs.writeFileSync(path.join(out,'evidence-ledger.json'),JSON.stringify(ledger,null,2)+'\n');
  fs.writeFileSync(path.join(out,'acceptance-specification.json'),JSON.stringify({status:'specified-not-executed',scope:'Future source-backed regression requirements; no planner qualification or policy change',cases:baseline.acceptance_cases},null,2)+'\n');
  const geometryDoc=['# Geometry evidence ledger','','Agent-prepared offline consolidation; no new measurements or manufacturer documents. Dimensions remain unknown; Appendix E spans describe placement regions, not toy footprints. G02 already publishes +/-1-in tolerance; application and datums still require interpretation.','',...baseline.geometry_evidence.flatMap(x=>[`## ${x.id} — ${x.category}`,'',x.fact||'No qualifying evidence supplied.',`Unknown: ${x.unknown}`,`Questions: ${x.question_ids.join(', ')}.`,...x.source_refs.map(ref=>`- ${baseline.source_labels[ref]} [${ref}]`),''])].join('\n');
  fs.writeFileSync(path.join(out,'geometry-evidence.md'),geometryDoc);
  const diagrams=[];for(const [policy,label,file] of [['selectable-original-regions','Diagram A','diagram-A-south.svg'],['experimental-north-pit-access','Diagram B','diagram-B-north.svg']]){const d=diagram(model,report,policy,label);fs.writeFileSync(path.join(out,file),d.svg);diagrams.push({file,...d.metadata});}
  fs.writeFileSync(path.join(out,'diagram-metadata.json'),JSON.stringify(diagrams,null,2)+'\n');
  const inputs=['tools/confirmation-packet-v3.js','confirmation-questions-v3.json','confirmation-baseline-v3.json',q.source_snapshot,path.join(base,'Game-Manual-2027-1-V3.docx'),path.join(base,'Game-Manual-2027-2-V3-1.docx'),'constrained-field-v3.json',source.trace_file,'derived/connected-navigation-v3/report.json','tools/navigation-v3.js','tools/constrained-field-v3.js'];
  const artifacts=['questions-to-organizer.md','source-excerpts.json','evidence-ledger.json','acceptance-specification.json','geometry-evidence.md','diagram-A-south.svg','diagram-B-north.svg','diagram-metadata.json'];const manifest={date:q.date,provenance:q.scope,external_communication:'none',input_hashes:Object.fromEntries(inputs.map(f=>[f,hash(fs.readFileSync(path.join(root,f)))])),artifact_hashes:Object.fromEntries(artifacts.map(f=>[f,hash(fs.readFileSync(path.join(out,f)))]))};fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
module.exports={paragraphs,validateQuestions,validateBaseline,choose,diagram,generate};
if(require.main===module){generate();console.log(`Wrote ${out}`);}