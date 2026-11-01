#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {buildArtifacts}=require('./mechanism-prototyping-v3');
const root=path.resolve(__dirname,'..'),out=path.join(root,'derived/mechanism-prototyping-v3');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8')),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const config=read('mechanism-prototyping-v3.json'),manifest=read('derived/mechanism-prototyping-v3/manifest.json');
for(const [file,expected] of Object.entries(manifest.input_hashes))assert.equal(hash(path.join(root,file)),expected,`stale input ${file}`);
for(const [file,expected] of Object.entries(manifest.output_hashes))assert.equal(hash(path.join(out,file)),expected,`changed output ${file}`);
const {files,report}=buildArtifacts(config);
for(const [file,text] of Object.entries(files))assert.equal(fs.readFileSync(path.join(out,file),'utf8'),text,`regenerated output differs ${file}`);
assert.equal(report.physical_trials_completed,0);assert.equal(report.printed_parts_inspected,0);
for(const mesh of report.meshes){assert.equal(mesh.boundary_edges,0);assert.equal(mesh.nonmanifold_edges,0);assert.equal(mesh.degenerate_triangles,0);assert.ok(mesh.signed_volume_mm3>0);}
console.log(JSON.stringify({status:'passed',scope:'computational-geometry-and-print-scale-artifacts-only',closed_meshes:report.meshes.length,alignment_templates:report.alignment_cases.length,physical_trials:0,printed_parts_inspected:0,production_cad:false,validated_mechanism:false},null,2));
