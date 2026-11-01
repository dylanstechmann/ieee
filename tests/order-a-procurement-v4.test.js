'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {validateConfig,gateForWheel,buildReport,renderReadme,renderMotors,renderBom,csv}=require('../tools/order-a-procurement-v4');
const root=path.resolve(__dirname,'..'),config=JSON.parse(fs.readFileSync(path.join(root,'order-a-procurement-v4.json'),'utf8')),hardware=JSON.parse(fs.readFileSync(path.join(root,'hardware-development-v3.json'),'utf8')),report=buildReport(config);
const close=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);

test('80 mm mule gates are independently derived without altering the 3-inch baseline',()=>{
  const g=gateForWheel(hardware,80);close(g.required_loaded_rpm_with_margin,(.254/.04)*60/(2*Math.PI)*1.2);close(report.gates.mule_80mm.required_loaded_rpm_with_margin,72.76564);close(report.gates.mule_80mm.design_per_side_torque_nm,report.gates.baseline_3in.design_per_side_torque_nm*(80/76.2));close(report.gates.baseline_3in.required_loaded_rpm_with_margin,76.394373);assert.equal(hardware.analysis_assumptions.wheel_diameter_in,3);
});

test('all three manufacturer maximum-efficiency points pass arithmetic and encoder screens',()=>{
  for(const m of report.candidates){assert.equal(m.max_efficiency_point_exceeds_both_gates,true,m.sku);assert.equal(m.mule_80mm.max_efficiency_point_exceeds_both_gates,true,m.sku);assert.equal(m.encoder_gate_pass,true,m.sku);assert.ok(m.output_cpr>=189);assert.ok(m.mule_80mm.encoder_quantum_in<.05);}
  close(report.candidates.find(x=>x.sku==='4754').max_efficiency.torque_nm,3.2*.0980665);assert.match(report.candidates.find(x=>x.sku==='4753').availability,/Backorder/);
});

test('Order A and alternative totals preserve unpriced exclusions',()=>{
  assert.equal(report.totals.priced_order_a_subtotal_usd,177.25);assert.equal(report.totals.shipping_tax_landed_total_usd,null);assert.equal(report.totals.shipping_snapshot.advertised_policy,'Free shipping in USA over $100');assert.equal(report.totals.shipping_snapshot.quoted_shipping_usd,null);assert.deepEqual(report.totals.unpriced_lines,['A-FAU-FIXTURE','A-BENCH-CONSUMABLES']);
  assert.equal(report.alternatives.find(x=>x.id==='ALT-STAMPED').subtotal_usd,163.30);assert.equal(report.alternatives.find(x=>x.id==='ALT-3IN-PRINTED').subtotal_usd,168.50);assert.equal(report.bom.find(x=>x.id==='A-MOTOR').extended_price_usd,121.90);assert.equal(report.bom.some(x=>x.id==='A-CASTER-SCREWS'||x.id==='A-CASTER-NUTS'),false);
});

test('budget reserves remain within the working target and hard cap',()=>{
  assert.equal(report.budget.later_reserve_total_usd,460);assert.equal(report.budget.contingency_within_working_target_usd,112.75);assert.equal(report.budget.additional_room_to_hard_cap_usd,250);const spent=report.totals.priced_order_a_subtotal_usd+report.budget.later_reserve_total_usd+report.budget.contingency_within_working_target_usd;close(spent,750);assert.ok(report.budget.contingency_within_working_target_usd>=0);
});

test('archived sources cover every motor, priced line, alternative, datasheet and STEP model',()=>{
  assert.equal(report.source_manifest.files.length,22);assert.equal(report.source_manifest.network_refresh,false);for(const s of report.source_manifest.files){assert.ok(fs.existsSync(path.join(root,s.path)),s.path);assert.match(s.sha256,/^[0-9a-f]{64}$/);assert.ok(s.bytes>0);}
  const covered=new Set(report.source_manifest.files.map(x=>x.path));for(const source of [...config.candidates.map(x=>x.source),...config.bom.filter(x=>x.source).map(x=>x.source),...config.alternatives.filter(x=>x.source).map(x=>x.source)])assert.ok(covered.has(source),source);
});

test('manufacturer snapshots support the transcribed M70 data and CAD files have valid signatures',()=>{
  const html=fs.readFileSync(path.join(root,'sources/hardware-2026-10-31/pololu/product-4754-specs.html'),'utf8');for(const text of['130 rpm','60.95','70:1','64 CPR'])assert.ok(html.includes(text),text);const overview=fs.readFileSync(path.join(root,'sources/hardware-2026-10-31/pololu/product-4754-resources.html'),'utf8');assert.match(overview,/4480(?:&nbsp;|\s)CPR/);
  const caster=fs.readFileSync(path.join(root,'sources/hardware-2026-10-31/pololu/product-953-overview.html'),'utf8');assert.ok(caster.includes('two included #2 screws'));assert.ok(caster.includes('7/16'));assert.ok(caster.includes('nuts'));const hub=fs.readFileSync(path.join(root,'sources/hardware-2026-10-31/pololu/product-1083-overview.html'),'utf8');assert.ok(hub.includes('four #4-40 set screws'));assert.ok(hub.includes('not included'));
  const base=path.join(root,'sources/hardware-2026-10-31/pololu');for(const name of['pololu-37d-metal-gearmotors-rev-1-2.pdf','37d-metal-gearmotors-dimension-diagram.pdf','1995-37D-machined-bracket.pdf','953-ball-caster-dimension-diagram.pdf'])assert.equal(fs.readFileSync(path.join(base,name),'utf8').slice(0,5),'%PDF-');assert.equal(fs.readFileSync(path.join(base,'37d-gearmotor-3d-models.zip'),'utf8').slice(0,2),'PK');for(const name of['37d-gearmotor-50-70-encoder.step','37d-gearmotor-100-131-150-encoder.step','1995-machined-bracket.step','953-ball-caster.step'])assert.match(fs.readFileSync(path.join(base,'step',name),'utf8'),/^ISO-10303-21;/);
});

test('validation and generated documents retain the research/not-ordered boundary',()=>{
  assert.equal(validateConfig(config),config);let c=structuredClone(config);c.bom.find(x=>x.id==='A-MOTOR').sku='4753';assert.throws(()=>buildReport(c),/primary motor/);c=structuredClone(config);c.owner_assumptions.initial_budget_usd.working_target=100;assert.throws(()=>buildReport(c),/budget/);
  assert.match(renderReadme(report),/No parts have been ordered/);assert.match(renderReadme(report),/\$177\.25/);assert.match(renderMotors(report),/72\.76564/);assert.match(renderBom(report),/\$163\.30/);assert.equal(csv(report).trim().split('\n').length,9);assert.equal(report.status,'selected-mule-baseline-not-ordered-not-hardware-validated');
});
