#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'derived/robot-studio-v8');
const hash = (b) => crypto.createHash('sha256').update(b).digest('hex');

async function run() {
  const playwrightPath = process.env.PLAYWRIGHT_PATH || '/home/vscode/.cache/node-copies/courselab-frontend/node_modules/playwright';
  const { chromium } = require(playwrightPath);
  const executablePath = process.env.CHROMIUM_PATH || '/home/vscode/.cache/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell';
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1000, height: 760 }, offline: true });
  const page = await context.newPage();
  const errors = [], warnings = [], externalRequests = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); if (m.type() === 'warning') warnings.push(m.text()); });
  page.on('request', (r) => { if (/^https?:/.test(r.url())) externalRequests.push(r.url()); });
  const url = `file://${path.join(root, 'share/Robot-Studio-v8.html')}`;
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => document.body.dataset.ready === 'true', { timeout: 120000 });
  const shots = [];
  async function shot(name, query = '') {
    await page.goto(`${url}${query}`, { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => document.body.dataset.ready === 'true', { timeout: 120000 });
    await page.waitForTimeout(700);
    const file = path.join(out, 'screenshots', name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await page.screenshot({ path: file, timeout: 90000 });
    shots.push({ file: `screenshots/${name}`, query, sha256: hash(fs.readFileSync(file)) });
  }
  await shot('assembly.png');
  await shot('stopping.png', '?workspace=stopping&sample=30');
  await shot('mechanism.png', '?workspace=mechanism&case=0&sample=8');
  await shot('evidence.png', '?workspace=evidence');
  await page.setViewportSize({ width: 480, height: 360 });
  await page.goto(`${url}?validate=1`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => document.body.dataset.ready === 'true', { timeout: 120000 });
  await page.locator('[data-workspace="stopping"]').click();
  await page.locator('#scenario').selectOption('turning');
  await page.locator('#mode').selectOption('dynamic-brake');
  await page.locator('#next').click();
  const stoppingInteraction = await page.evaluate(() => globalThis.robotStudioV8.getDiagnostics());
  await page.locator('[data-workspace="mechanism"]').click();
  await page.locator('#case').selectOption('5');
  await page.locator('#next').click();
  const mechanismInteraction = await page.evaluate(() => globalThis.robotStudioV8.getDiagnostics());
  const mechanismChecks = [];
  const frameCounts = await page.evaluate(() => globalThis.STUDIO_DATA.mechanism.cases.map((c) => c.frames.length));
  for (let i = 0; i < 162; i += 1) {
    if (i % 18 === 0) console.log(`Mechanism browser checks: ${i}/162`);
    for (const sample of [0, Math.floor(frameCounts[i] / 2), frameCounts[i] - 1]) {
      const result = await page.evaluate(({ i, sample }) => {
        globalThis.robotStudioV8.selectCase(i, sample);
        const d = globalThis.robotStudioV8.getDiagnostics();
        return { ...d, telemetry: document.getElementById('telemetry').textContent };
      }, { i, sample });
      if (!result.finite || result.caseIndex !== i || result.studyIndex !== sample) throw new Error(`Mechanism render failed: ${i}/${sample}`);
      mechanismChecks.push({ caseIndex: i, sample, finite: result.finite });
    }
  }
  const stoppingChecks = [];
  const runs = await page.evaluate(() => globalThis.STUDIO_DATA.stopping.runs.map((r) => [r.scenario_id, r.mode, r.model_variant]));
  for (const [scenario, mode, model] of runs) {
    const result = await page.evaluate(({ scenario, mode, model }) => {
      globalThis.robotStudioV8.selectStopping(scenario, mode, model, 30);
      return globalThis.robotStudioV8.getDiagnostics();
    }, { scenario, mode, model });
    if (!result.finite || result.studyIndex !== 30) throw new Error(`Stopping render failed: ${scenario}/${mode}/${model}`);
    stoppingChecks.push({ scenario, mode, model, finite: result.finite });
  }
  const report = {
    schema: 'robot-studio-v8-browser/1',
    html: 'share/Robot-Studio-v8.html',
    html_sha256: hash(fs.readFileSync(path.join(root, 'share/Robot-Studio-v8.html'))),
    browser: 'Playwright Chromium headless shell, SwiftShader WebGL, direct file URL, offline context',
    errors, warnings, externalRequests,
    stoppingInteraction, mechanismInteraction,
    mechanismChecks, stoppingChecks,
    screenshots: shots,
    notChecked: ['real-GPU performance', 'mobile layout', 'physical robot behavior', 'visual inspection by this tool'],
  };
  fs.writeFileSync(path.join(out, 'browser-validation.json'), `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
  if (errors.length || externalRequests.length) throw new Error(JSON.stringify({ errors, externalRequests }));
  console.log(JSON.stringify({ errors: errors.length, warnings: warnings.length, mechanismChecks: mechanismChecks.length, stoppingChecks: stoppingChecks.length, screenshots: shots.length }, null, 2));
}

run().catch((e) => { console.error(e); process.exitCode = 1; });
