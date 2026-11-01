#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
  const date=new Date().toISOString().slice(0,10),out=path.join(root,'sources',`confirmation-${date}`);fs.mkdirSync(out,{recursive:true});
  const prior=JSON.parse(fs.readFileSync(path.join(root,'sources/organizer-2026-10-29/manifest.json'))),page=prior.organizer_page;
  async function fetchFile(url,file){const r=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error(`${r.status} ${url}`);const b=Buffer.from(await r.arrayBuffer());fs.writeFileSync(path.join(out,file),b);return {file,source_url:url,final_url:r.url,retrieved_at:new Date().toISOString(),bytes:b.length,sha256:sha(b)};}
  const pageRecord=await fetchFile(page,'student-competitions.html'),html=fs.readFileSync(path.join(out,pageRecord.file),'utf8');
  const files=await Promise.all(prior.files.concat([{file:'SEC-2027-Arena-Build-Guide.pdf',source_url:'https://ieeesoutheastcon.org/wp-content/uploads/sites/755/SEC-2027-Arena-Build-Guide.pdf'}]).map(async p=>{
    if(!html.includes(p.source_url))throw Error(`Expected official link missing: ${p.file}`);
    const r=await fetchFile(p.source_url,p.file),old=p.sha256??sha(fs.readFileSync(path.join(root,'sources',p.file)));return {...r,previous_sha256:old,byte_identical_to_archive:r.sha256===old};
  }));
  const manifest={retrieved_date:date,organizer_page:page,page:pageRecord,files,qa:{status:'not-reviewed',channel:'Official SoutheastCon Discord Q&A, identified by current hardware tab',invite:'https://discord.gg/cuqdFvQFe8',observed:'Public invite resolves to IEEE SoutheastCon - Official Discord; channel messages not available without account/login. No account created, server joined, messages sent or credentials accessed.'}};
  fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest,null,2));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});