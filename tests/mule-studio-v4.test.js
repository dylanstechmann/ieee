'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {buildData}=require('../tools/build-mule-studio-v4'),Core=require('../mule-studio/core');
const root=path.resolve(__dirname,'..'),data=buildData(),selected={sku:'4754',wheel_diameter_mm:80,support_configuration:'dual-front-rear'};
test('studio data links 18 configurations to the corrected selected Order A baseline',()=>{
  assert.deepEqual(buildData(),data);assert.equal(Core.validateData(data),true);assert.equal(data.matrix.configurations.length,18);assert.equal(data.order.totals.priced_order_a_subtotal_usd,177.25);assert.equal(data.selected.sku,'4754');assert.match(data.status,/not-ordered-not-hardware-validated/);
});
test('default variant has no nominal geometry warnings and expected digital margins',()=>{
  const v=Core.variant(data,selected);assert.equal(v.status,'nominal-digital-checks-pass');assert.deepEqual(v.warnings,[]);assert.equal(v.geometry.caster_contact_z_mm,-.075);assert.equal(v.geometry.motor_body_center_gap_mm,8);assert.equal(v.row.output_cpr,4480);
});
test('longer motor and 3-inch wheel expose substitution consequences',()=>{
  const motor=Core.variant(data,{...selected,sku:'4755'});assert.ok(motor.warnings.some(x=>/Motor-body gap 3 mm/.test(x)));const wheel=Core.variant(data,{...selected,wheel_diameter_mm:76.2});assert.equal(wheel.geometry.caster_contact_z_mm,-1.975);assert.ok(wheel.warnings.some(x=>/Caster contact/.test(x)));assert.equal(wheel.status,'review-required');
});
test('3D assembly has finite geometry, twelve leads and switchable supports',()=>{
  const built=Core.buildItems(data,selected,{showWiring:true});assert.equal(built.items.length,46);assert.equal(built.items.filter(x=>x.wireId).length,12);for(const o of built.items){assert.ok(o.pos.every(Number.isFinite),o.id);assert.ok(o.scale.every(n=>Number.isFinite(n)&&n>0),o.id);assert.ok(o.rot.every(Number.isFinite),o.id);}
  const front=Core.buildItems(data,{...selected,support_configuration:'front-only'},{showWiring:true});assert.equal(front.items.filter(x=>x.id&&x.id.startsWith('caster-')).length,1);const exploded=Core.buildItems(data,selected,{showWiring:true,exploded:1});assert.equal(exploded.items.filter(x=>x.wireId).length,0);
});
test('invalid variants are rejected and lead meshes are valid',()=>{
  assert.throws(()=>Core.variant(data,{...selected,sku:'bad'}),/unknown motor/);assert.throws(()=>Core.variant(data,{...selected,wheel_diameter_mm:70}),/unknown configuration/);for(const wire of Core.wires(data,Core.variant(data,selected).geometry)){const g=wire.geometry;assert.ok(g.positions.length>0);assert.ok(g.positions.every(Number.isFinite));assert.ok(g.positions.every(n=>Math.abs(n)<10));assert.equal(g.positions.length,g.normals.length);assert.ok(g.indices.every(i=>i>=0&&i<g.positions.length/3));}
});
test('standalone Mule Studio is offline and retains evidence boundaries',()=>{
  const html=fs.readFileSync(path.join(root,'share/Mule-Studio-v4.html'),'utf8');for(const token of['MULE_STUDIO_DATA','MuleStudioCore','RobotLabRenderer','motor-gap','caster-contact','exploded','show-wiring'])assert.ok(html.includes(token),token);assert.ok(!/<script[^>]+src=|<link[^>]+href=/i.test(html));assert.ok(!/<(?:script|img|link)[^>]+(?:src|href)=["']https?:/i.test(html));assert.match(html,/Not ordered · not fabrication CAD/);assert.match(html,/No supplier order, print, fabrication, driver, battery or physical validation/);
});
