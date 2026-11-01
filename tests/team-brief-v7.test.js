'use strict';

// The team brief quotes figures from three agent-run models; these checks fail
// when a model changes without the brief (and its HTML page) being updated.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const brief = read('derived/team-brief-v7/TEAM-BRIEF.md');
const has = (text) => assert.ok(brief.includes(text), `brief should say: ${text}`);

test('scoring and timeline figures match the tested tools', () => {
  const { perfectScoreCrossCheck } = require('../tools/tournament-v7');
  assert.equal(perfectScoreCrossCheck(), 390);
  has('**390 robot points, plus 10 for publicity**');
  has('250 of the 390');
  const timeline = require('../tools/mission-timeline-v3');
  const t = timeline.missionTimeline({});
  assert.equal(Math.round(t.totalMissionS), 103);
  assert.equal(Math.round(t.totalPathIn * 0.0254), 14);
  assert.equal(Math.round(t.requiredCruiseInPerS.for165S * 10) / 10, 4.2);
  has('about 103 s');
  has('about 14 m');
  has('About 4.2 in/s');
});

test('tournament figures match the tournament report', () => {
  const r = JSON.parse(read('derived/tournament-v7/report.json'));
  assert.equal(Math.round(r.break_even_pit_stall.single_match_mean * 100), 23);
  assert.equal(Math.round(r.break_even_pit_stall.best_of_3_mean * 100), 49);
  assert.equal(Math.round(r.per_match_probability_needed['0.8'] * 100), 42);
  has('below about 23%');
  has('rises to about 49%');
  has('succeeds 42% of the time, there is an 80% chance');
});

test('AprilTag figures match the sealed AprilTag report', () => {
  const r = JSON.parse(read('derived/apriltag-41h12-v7/report.json'));
  const lim = (cam, yaw, q) => r.sweep_summary.find((s) => s.camera === cam && s.yaw_deg === yaw && s.quad_decimate === q).reliable_to_m;
  assert.equal(lim('VGA-60', 0, 1).toFixed(1), '1.8');
  assert.equal(lim('VGA-60', 60, 1).toFixed(1), '1.3');
  assert.equal(lim('HD-70', 0, 1).toFixed(1), '3.4');
  for (const [cam, yaw] of [['VGA-60', 0], ['VGA-60', 60], ['HD-70', 0]]) {
    const cut = 1 - lim(cam, yaw, 2) / lim(cam, yaw, 1);
    assert.ok(cut >= 0.14 && cut <= 0.3, `${cam} ${yaw} decimate cut ${cut}`);
  }
  assert.ok(r.pose_check.rows.every((x) => Math.abs(x.printed_9_cell_width - 1.8) < 0.01));
  assert.equal((0.068 * 5 / 9 * 1000).toFixed(1), '37.8');
  has('about 1.8 m head-on and 1.3 m at 60° off-axis');
  has('about 3.4 m');
  has('about 15–30%');
  has('37.8 mm');
  has('overestimates distance by 1.8×');
  has('**tagStandard41h12**');
});

test('footprint geometry quoted in the brief is right', () => {
  assert.equal((10 * Math.SQRT2).toFixed(1), '14.1');
  const rad = (20 * Math.PI) / 180;
  assert.equal((10 * Math.cos(rad) + 10 * Math.sin(rad)).toFixed(1), '12.8');
  has('sweeps a 14.1 in circle');
  has('about 12.8 in wide');
});

test('brief keeps its disclosures and the HTML page is current', () => {
  has('Prepared with AI assistance');
  has('agent-run');
  has('was **not** reviewed');
  const page = read('derived/team-brief-v7/page/index.html');
  for (const h of brief.match(/^## .+$/gm)) {
    const text = h.slice(3).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    assert.ok(page.includes(text) || page.includes(h.slice(3)), `page is missing heading: ${h}`);
  }
  for (const img of ['organizer-sheet-detections.png', 'sensor-planes.png']) {
    assert.ok(fs.existsSync(path.join(root, 'derived/team-brief-v7/page', img)), img);
  }
});
