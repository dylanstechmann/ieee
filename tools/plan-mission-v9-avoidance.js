#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { build } = require('./constrained-field-v3');
const { makeField } = require('./navigation-v3');
const { createPlanner } = require('./avoidance-v3');
const { routesFor } = require('./differential-drive-v3');

const root = path.resolve(__dirname, '..');
const read = f => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
const source = read('constrained-field-v3.json');
const model = build(source, read(source.trace_file));
const navigation = read('navigation-v3.json');
const drive = read('differential-drive-v3.json');
const config = { ...read('avoidance-v3.json'), max_expansions: 3000 };
const route = routesFor(model, drive)[0];
const anchors = [...route.waypoints];
for (const x of [9, 18, 35, 36, 87]) for (const y of [9, 12, 36, 38.918]) {
  for (const heading of [0, 90, 180, 270]) anchors.push([x, y, heading]);
}
const scenarios = [
  { id: 'off-route-control', kind: 'off-route', center_in: [60, 45] },
  { id: 'entry-blocker', kind: 'entry-blocker', center_in: [36, 36] },
  { id: 'upper-lane-blocker', kind: 'upper-lane-blocker', center_in: [60, 36] },
];
for (const scenario of scenarios) {
  if (scenario.kind !== 'upper-lane-blocker') continue;
  const nav = structuredClone(navigation);
  nav.obstacles.push({ id: scenario.id, vertices_in: [[59,35],[61,35],[61,37],[59,37]] });
  const field = makeField(model, nav, nav.wall_scenarios[0]);
  const planner = createPlanner(nav.robot, field, nav.sampling, config, anchors);
  const legs = [[route.waypoints[4], route.waypoints[5]], [route.waypoints[5], route.waypoints[7]], [route.waypoints[7], route.waypoints[9]]];
  const points = [route.waypoints[4]];
  const searches = [];
  for (const [start, goal] of legs) {
    const result = planner.search(start, goal);
    searches.push({ status: result.status, expanded: result.expanded });
    if (result.status !== 'found') throw new Error(`No ${scenario.id} route: ${result.status}`);
    points.push(...result.waypoints.slice(1));
  }
  scenario.lap_waypoints = points;
  scenario.searches = searches;
  scenario.evidence = 'Hypothetical 2-inch square probe from navigation-stress-v3, not a measured vehicle or legal placement.';
}
const output = {
  status: 'agent-planned-hypothetical-probes-not-hardware-or-legal-route-validation',
  planner: 'Existing bounded cardinal A* with positive nominal interval clearance. Offline geometry only; the Python mission currently stops on blocked routes and does not replay this detour.',
  scenarios,
  input_hashes: Object.fromEntries(['constrained-field-v3.json', 'navigation-v3.json', 'differential-drive-v3.json', 'avoidance-v3.json', 'tools/avoidance-v3.js'].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')])),
};
const out = path.join(root, 'derived/mission-v9');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'avoidance-scenarios.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(scenarios.map(s => ({ id: s.id, kind: s.kind, searches: s.searches })), null, 2));
