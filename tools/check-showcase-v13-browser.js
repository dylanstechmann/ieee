#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
function assertFraming(framing,label){assert.ok(framing,`${label}: missing framing evidence`);const [left,bottom,right,top]=framing.ndcBounds;assert.ok(left>=-1&&bottom>=-1&&right<=1&&top<=1&&right>left&&top>bottom,`${label}: projected bounds ${framing.ndcBounds}`);}
async function run(){
  const {chromium}=require(process.env.PLAYWRIGHT_PATH||path.join(os.homedir(),'.cache/node-copies/courselab-frontend/node_modules/playwright'));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||path.join(os.homedir(),'.cache/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell'),headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const out=path.join(root,'derived/showcase-v13'),shots=path.join(out,'screenshots');fs.mkdirSync(shots,{recursive:true});
  try{
    const context=await browser.newContext({offline:true,acceptDownloads:true,viewport:{width:1366,height:900}});
    const page=await context.newPage(),errors=[],external=[];
    page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
    await page.goto(`file://${root}/share/Showcase-v13.html`,{waitUntil:'load',timeout:120000});
    await page.waitForFunction(()=>document.body.dataset.studioReady==='true',null,{timeout:120000});
    await page.locator('#v13-workspace').scrollIntoViewIfNeeded();
    const initial=await page.evaluate(()=>robotStudioV13.getDiagnostics());
    assert.equal(initial.assets,17);assert.equal(initial.instanceCount,34);assert.equal(initial.livePhysics,true);assert.equal(initial.mode,'sequence');assert.equal(initial.assembly.remaining,34);
    await page.waitForTimeout(350);assert.ok((await page.evaluate(()=>robotStudioV13.getDiagnostics())).assembly.time>0);
    await page.waitForFunction(()=>robotStudioV13.getDiagnostics().mode==='live',null,{timeout:45000});
    await page.locator('#v13-mode').selectOption('replay');await page.locator('#v13-play').click();await page.waitForTimeout(400);
    assert.ok((await page.evaluate(()=>robotStudioV13.getDiagnostics())).cursor>0);
    await page.locator('#v13-scenario').selectOption('1');await page.locator('#v13-seek').fill('200');
    assert.equal((await page.evaluate(()=>robotStudioV13.getDiagnostics())).cursor,200);
    await page.locator('#v13-reset').click();assert.equal((await page.evaluate(()=>robotStudioV13.getDiagnostics())).cursor,0);
    await page.locator('#v13-mode').selectOption('assembly');
    const partIds=await page.evaluate(()=>STUDIO_V13.assembly.parts.map(p=>p.id)),partShots=[];
    for(const id of partIds){
      const focus=await page.evaluate(id=>robotStudioV13.focusPart(id),id);assertFraming(focus.framing,`${id} part framing`);assert.ok(focus.visible&&focus.size>0);assert.ok(Math.abs(focus.center[0]-focus.robotPosition[0])<.4&&Math.abs(focus.center[2]-focus.robotPosition[2])<.4,`${id} bounds must use the current assembly datum`);if(id==='motor')assert.ok(Math.abs(focus.center[0]-focus.robotPosition[0])<.02,'Motor bounds must include the current robot translation');
      await page.locator('#v13-canvas').scrollIntoViewIfNeeded();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const file=path.join(shots,`part-${id}.png`);await page.locator('#v13-canvas').screenshot({path:file});partShots.push(path.relative(root,file));
      assert.ok((await page.locator('#v13-detail').textContent()).includes(id));
    }
    const assemblyFraming=await page.evaluate(()=>robotStudioV13.showAll());assertFraming(assemblyFraming,'desktop assembly');await page.waitForTimeout(100);
    await page.locator('#v13-workspace').screenshot({path:path.join(shots,'assembly.png')});
    assert.match(await page.locator('#v13-fit-summary').textContent(),/FAIL · motor-body-gap · 7.8 mm/);assert.match(await page.locator('#v13-fit-summary').textContent(),/CONFLICT · motor-shaft-source-length/);
    await page.locator('#v13-shaft-variant').selectOption('22');
    const vendor=await page.evaluate(()=>robotStudioV13.getDiagnostics());assert.equal(vendor.assemblyId,'order-a-vendor-cad-22mm-v13');
    assert.match(await page.locator('#v13-stack').textContent(),/Track 202 mm/);assert.notEqual(vendor.assemblyHash,initial.assemblyHash);
    await page.locator('#v13-canvas').screenshot({path:path.join(shots,'assembly-vendor-22mm.png')});
    await page.locator('#v13-shaft-variant').selectOption('16');assert.equal((await page.evaluate(()=>robotStudioV13.getDiagnostics())).assemblyHash,initial.assemblyHash);
    await page.locator('#v13-mode').selectOption('live');

    await page.locator('#v11-physical-tireMass').evaluate(input=>{input.value='0.12';input.dispatchEvent(new Event('change',{bubbles:true}));});
    const edited=await page.evaluate(()=>robotStudioV13.getDiagnostics().live);assert.equal(edited.parameters.tireMass,.12);assert.equal(edited.assemblyHash,initial.assemblyHash);assert.equal(edited.time,0);
    const downloadPromise=page.waitForEvent('download');await page.locator('#v13-export-run').evaluate(button=>button.click());const download=await downloadPromise;
    const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(exported.assemblyHash,initial.assemblyHash);assert.equal(exported.state.parameters.tireMass,.12);
    await page.locator('#v11-physical-tireMass').evaluate(input=>{input.value='0.08';input.dispatchEvent(new Event('change',{bubbles:true}));});
    await page.locator('#v13-live-play').click();await page.waitForTimeout(120);await page.locator('#v13-live-play').click();
    const paused=(await page.evaluate(()=>robotStudioV13.getDiagnostics().live)).time;await page.waitForTimeout(180);assert.equal((await page.evaluate(()=>robotStudioV13.getDiagnostics().live)).time,paused);
    const live=await page.evaluate(()=>robotStudioV13.advanceLive(72000));assert.equal(live.result,'passed');assert.equal(live.laps,3);assert.ok(live.carriedSeconds>200);assert.ok(live.evidence.releaseDuration>.5);
    assert.ok(Object.keys(live.contactCounters).some(key=>/gate/.test(key)));assert.ok(live.contactSamples.every(sample=>sample.colliderA&&sample.colliderB&&sample.category));
    await page.locator('#v13-workspace').screenshot({path:path.join(shots,'live-complete.png')});
    await page.locator('#v13-live-scenario').selectOption('missing');const missing=await page.evaluate(()=>robotStudioV13.advanceLive(72000));assert.equal(missing.result,'failed');assert.match(missing.terminalReason,/Acquisition failed/);
    await page.locator('#v13-live-scenario').selectOption('nominal');await page.locator('#v13-arena').selectOption('organizer');
    const organizerInitial=await page.evaluate(()=>robotStudioV13.getDiagnostics().live);assert.equal(organizerInitial.arenaId,'organizer');assert.equal(organizerInitial.time,0);
    const organizer=await page.evaluate(()=>robotStudioV13.advanceLive(72000));assert.equal(organizer.result,'failed');assert.ok(organizer.terminalReason);
    await page.locator('#v13-workspace').screenshot({path:path.join(shots,'organizer-live.png')});
    await page.locator('#v13-arena').selectOption('demo');await page.locator('#v13-mode').selectOption('assembly');
    const resetGate=await page.evaluate(()=>robotStudioV13.focusPart('gate'));assert.ok(Math.abs(resetGate.center[0]-resetGate.robotPosition[0]-.233)<1e-7,'Assembly inspection must restore the zero-travel gate datum');await page.evaluate(()=>robotStudioV13.showAll());
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);
    const narrowFraming=(await page.evaluate(()=>robotStudioV13.getDiagnostics())).framing;assertFraming(narrowFraming,'narrow assembly');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,'Narrow page must not overflow horizontally');
    await page.locator('#v13-workspace').screenshot({path:path.join(shots,'narrow-assembly.png')});
    const legacyContext=await browser.newContext({offline:true,viewport:{width:390,height:844}});await legacyContext.addInitScript(()=>{delete window.structuredClone;delete Array.prototype.at;delete Element.prototype.replaceChildren;});
    const legacyPage=await legacyContext.newPage();await legacyPage.goto(`file://${root}/share/Showcase-v13.html`,{waitUntil:'load',timeout:120000});await legacyPage.waitForFunction(()=>document.body.dataset.studioReady==='true',null,{timeout:120000});
    const legacy=await legacyPage.evaluate(()=>robotStudioV13.getDiagnostics());assert.equal(legacy.assets,17);assert.equal(legacy.instanceCount,34);await legacyContext.close();
    const webglContext=await browser.newContext({offline:true,viewport:{width:390,height:844}});await webglContext.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl2')return null;return original.call(this,type,...args);};});
    const webglPage=await webglContext.newPage();await webglPage.goto(`file://${root}/share/Showcase-v13.html`,{waitUntil:'load',timeout:120000});await webglPage.waitForFunction(()=>document.body.dataset.studioError==='webgl2-unavailable',null,{timeout:120000});
    const webgl={error:await webglPage.evaluate(()=>document.body.dataset.studioError),message:await webglPage.locator('#v13-clock').textContent()};assert.match(webgl.message,/WebGL2/);await webglContext.close();
    const noscriptContext=await browser.newContext({offline:true,javaScriptEnabled:false,viewport:{width:390,height:844}});const noscriptPage=await noscriptContext.newPage();await noscriptPage.goto(`file://${root}/share/Showcase-v13.html`,{waitUntil:'load',timeout:120000});
    await noscriptPage.locator('#v13-workspace noscript .v13-warning').waitFor({timeout:120000});const noscript=true;await noscriptContext.close();
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    const report={schema:'showcase-v13-browser/1',htmlSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'share/Showcase-v13.html'))).digest('hex'),browser:await browser.version(),offline:true,protocol:'file:',errors,externalRequests:external,
      initial,vendor,assemblyFraming,narrowFraming,legacyApiCompatibility:{assets:legacy.assets,instanceCount:legacy.instanceCount},webgl2Diagnostic:webgl,noscriptGuidance:noscript,editedRun:{assemblyId:edited.assemblyId,assemblyHash:edited.assemblyHash,tireMass:edited.parameters.tireMass},exportedRunIdentity:{assemblyId:exported.assemblyId,assemblyHash:exported.assemblyHash,tireMass:exported.state.parameters.tireMass},organizer,live,missing,narrowOverflow:overflow,screenshots:partShots.concat(['assembly.png','assembly-vendor-22mm.png','live-complete.png','organizer-live.png','narrow-assembly.png'].map(f=>`derived/showcase-v13/screenshots/${f}`)),
      checks:['offline file load','34-instance assembly animation','historical play, seek and reset',`${partIds.length} individual part views with projected bounds`,'fit failure and shaft conflict visible','16/22 mm variant identity and track','edited run preserves assembly identity','actual run JSON download','pause freezes fixed-step world','nominal three-lap contact mission','named gate contacts','independent destination release','missing tire fails','organizer arena terminal failure','post-mission zero-joint assembly datum','narrow layout with whole-robot framing'],limitations:['software WebGL only; no real-GPU performance qualification','level-plane chassis and ideal lift/gate; organizer attempt is not competition qualification','legacy-API, WebGL2-blocked and no-JavaScript checks are Chromium simulations, not physical iPhone validation']};
    fs.writeFileSync(path.join(out,'browser-validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checks:report.checks.length,errors:errors.length,externalRequests:external.length,screenshots:report.screenshots.length,nominal:live.result,organizer:organizer.result,narrowOverflow:overflow}));
  }finally{await browser.close();}
}
module.exports={run};if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
