'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {build,svg}=require('../tools/constrained-field-v3');
const root=path.resolve(__dirname,'..');
const input=()=>JSON.parse(fs.readFileSync(path.join(root,'constrained-field-v3.json')));
const trace=JSON.parse(fs.readFileSync(path.join(root,'derived/drawing-layout-v3/layout.json')));
const find=(m,id)=>m.features.find(f=>f.id===id).vertices_in;
test('box, gap, divider and board constraints',()=>{
  const m=build(input(),trace), a=find(m,'pit_box_1'),b=find(m,'pit_box_2'),c=find(m,'pit_box_3');
  assert.equal(a[1][0]-a[0][0],12); assert.equal(a[3][1]-a[0][1],12);
  assert.ok(Math.abs(b[0][1]-a[3][1]-3)<1e-9); assert.ok(Math.abs(c[0][1]-b[3][1]-3)<1e-9);
  let p=find(m,'center_divider_axis'); assert.ok(Math.abs(p[1][0]-p[0][0]-36)<1e-9);
  p=find(m,'pit_divider_axis'); assert.equal(p[1][1]-p[0][1],16); assert.equal(p[0][0],28);
  assert.match(svg(m),/NOT for construction/);
});
test('assumption changes propagate and invalid configurations fail',()=>{
  const a=input(); a.assumptions.first_box_near_y=4; assert.equal(find(build(a,trace),'pit_box_1')[0][1],4);
  const b=input(); b.dimensions.race_length=67; assert.throws(()=>build(b,trace),/pit \+ race/);
  const c=input(); c.assumptions.first_box_near_y=10; assert.throws(()=>build(c,trace),/out-of-board/);
  const d=input(); delete d.assumptions.center_divider_y; assert.throws(()=>build(d,trace),/required/);
  const e=input(); e.assumptions.pit_box_near_x=25; assert.throws(()=>build(e,trace),/transition/);
});