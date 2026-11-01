#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {buildReport}=require('./order-a-procurement-v4');
const root=path.resolve(__dirname,'..'),out=path.join(root,'derived/order-a-procurement-v4'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8')),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const config=read('order-a-procurement-v4.json'),manifest=read('derived/order-a-procurement-v4/manifest.json');
for(const[file,expected]of Object.entries(manifest.input_hashes))assert.equal(hash(path.join(root,file)),expected,`stale input ${file}`);
for(const[file,expected]of Object.entries(manifest.output_hashes))assert.equal(hash(path.join(out,file)),expected,`changed output ${file}`);
const report=buildReport(config);assert.deepEqual(read('derived/order-a-procurement-v4/report.json'),report,'generated report differs from source calculations');
assert.equal(report.totals.priced_order_a_subtotal_usd,177.25);assert.equal(report.totals.shipping_tax_landed_total_usd,null);assert.equal(report.budget.contingency_within_working_target_usd,112.75);assert.equal(report.source_manifest.files.length,22);
for(const source of report.source_manifest.files){assert.equal(hash(path.join(root,source.path)),source.sha256,`source hash ${source.path}`);assert.equal(fs.statSync(path.join(root,source.path)).size,source.bytes,`source size ${source.path}`);}
for(const m of report.candidates){assert.equal(m.max_efficiency_point_exceeds_both_gates,true);assert.equal(m.mule_80mm.max_efficiency_point_exceeds_both_gates,true);assert.equal(m.encoder_gate_pass,true);}
const base=path.join(root,'sources/hardware-2026-10-31/pololu');for(const name of['pololu-37d-metal-gearmotors-rev-1-2.pdf','37d-metal-gearmotors-dimension-diagram.pdf','1995-37D-machined-bracket.pdf','953-ball-caster-dimension-diagram.pdf'])assert.equal(fs.readFileSync(path.join(base,name),'utf8').slice(0,5),'%PDF-');assert.equal(fs.readFileSync(path.join(base,'37d-gearmotor-3d-models.zip'),'utf8').slice(0,2),'PK');for(const name of['37d-gearmotor-50-70-encoder.step','37d-gearmotor-100-131-150-encoder.step','1995-machined-bracket.step','953-ball-caster.step'])assert.match(fs.readFileSync(path.join(base,'step',name),'utf8'),/^ISO-10303-21;/);
assert.match(fs.readFileSync(path.join(out,'README.md'),'utf8'),/No parts have been ordered/);assert.match(fs.readFileSync(path.join(out,'order-a-bom.md'),'utf8'),/not ordered/);
console.log(JSON.stringify({status:'passed',recommendation:report.recommendation.motor_id,priced_subtotal_usd:report.totals.priced_order_a_subtotal_usd,landed_total:'unquoted',candidates:report.candidates.map(x=>({sku:x.sku,max_efficiency_rpm:x.max_efficiency.rpm,max_efficiency_torque_nm:x.max_efficiency.torque_nm,availability:x.availability})),archived_sources:report.source_manifest.files.length,ordered:false,hardware_validated:false},null,2));
