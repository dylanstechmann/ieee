#!/usr/bin/env node
'use strict';
const {spawnSync}=require('node:child_process'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const result=spawnSync('uv',['run','--offline','--no-project','--python','3.12','--with','cadquery==2.8.0','--with','cascadio==0.1.1','--with','trimesh==5.2.0','python','-B','tools/verify-cad-v13.py'],{cwd:root,stdio:'inherit'});
if(result.error){console.error(result.error.message);process.exitCode=1;}else process.exitCode=result.status??1;
