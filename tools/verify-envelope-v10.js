#!/usr/bin/env node
'use strict';
// Verifies derived/envelope-v10: hashes, then recomputes the physics and lap-model claims here with
// hand formulas, independently of the Python that produced them.
// Regenerate with: uv run --no-project --python 3.12 python -B -I tools/envelope-v10.py
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'derived/envelope-v10');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
for (const [f, h] of Object.entries(manifest.input_hashes)) assert.equal(sha(fs.readFileSync(path.join(root, f))), h, `stale input ${f}; rerun tools/envelope-v10.py`);
for (const [f, h] of Object.entries(manifest.output_hashes)) assert.equal(sha(fs.readFileSync(path.join(dir, f))), h, `output ${f} changed`);

const report = JSON.parse(fs.readFileSync(path.join(dir, 'report.json'), 'utf8'));
const golden = JSON.parse(fs.readFileSync(path.join(root, 'software/stockcar/tests/fixtures/dynamics-golden-v10.json'), 'utf8'));
const {vehicle} = golden.model, motor = golden.cases[0].motor, radius = golden.cases[0].overrides.wheel_radius_m;
const g = 9.81, inPerM = 1 / 0.0254, near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= tol, `${label}: ${a} vs ${b}`);

// Steady full-duty speed: friction plus rolling load set the current, which sets the sag and the speed.
function topSpeed(volts, mass) {
  const noLoad = 0.2, kt = motor.stall_torque / (motor.stall_current - noLoad), ideal = motor.no_load_omega / (1 - noLoad / motor.stall_current);
  const current = vehicle.rolling_resistance_coefficient * mass * g * radius / 2 / kt + noLoad;
  const bus = volts - golden.model.electrical.source_resistance_ohm * 2 * current;
  return ideal * (bus / 12 - current / motor.stall_current) * radius;
}

// The v5 column must be the sealed model's results, and the artifacts it documents must be there.
assert.equal(report.model_comparison.length, 6);
report.model_comparison.forEach((row, i) => assert.deepEqual(row.v5, golden.cases[i].metrics));
const scenario = id => report.model_comparison.find(r => r.scenario === id);
assert.ok(scenario('brake-hold').v5.saturation_samples > 0 && scenario('brake-hold').v10.saturation_samples === 0, 'brake-hold chatter removed');
assert.ok(scenario('asymmetric-traction').v10.final_yaw_error_rad < 0.01 && scenario('encoder-dropout').v10.final_yaw_error_rad < 0.01, 'heading recovers once slip can close');

assert.equal(report.conditions.length, 27, 'three voltages x three frictions x three masses');
for (const c of report.conditions) {
  const label = `${c.source_voltage_v} V, friction ${c.friction}, ${c.mass_kg} kg`;
  near(c.launch.top_speed_m_s, topSpeed(c.source_voltage_v, c.mass_kg), 0.001, `top speed ${label}`);
  near(c.launch.accel_m_s2, (c.friction * vehicle.driven_weight_fraction - vehicle.rolling_resistance_coefficient) * g, 0.15, `launch ${label}`);
  near(c.brake.decel_m_s2, (c.friction * vehicle.driven_weight_fraction + vehicle.rolling_resistance_coefficient) * g, 0.3, `brake ${label}`);
  near(c.spin.peak_yaw_rate_rad_s, 2 * c.launch.top_speed_m_s / vehicle.track_m, 0.4, `spin ${label}`);
  assert.ok(c.launch.final_slip_m_s < 1e-5, `slip closes ${label}`);
  assert.ok(c.brake.residual_speed_m_s < 0.005, `stop settles ${label}`);
}
const creep = report.stop_without_integral_release;
assert.ok(creep.stop_time_s > 3 * Math.max(...report.conditions.map(c => c.brake.stop_time_s)), 'keeping the integral through a stop creeps');

const usable = report.usable, plans = report.planning_envelopes;
const lowest = pick => Math.min(...report.conditions.map(pick));
near(plans.conservative.cruise_in_s, usable.speed * lowest(c => c.launch.top_speed_m_s) * inPerM, 1e-3, 'conservative cruise');
near(plans.conservative.accel_in_s2, usable.accel * lowest(c => c.launch.accel_m_s2) * inPerM, 1e-3, 'conservative acceleration');
near(plans.conservative.brake_in_s2, usable.brake * lowest(c => c.brake.decel_m_s2) * inPerM, 1e-3, 'conservative braking');
near(plans.conservative.spin_rad_s, usable.spin * lowest(c => c.spin.peak_yaw_rate_rad_s), 1e-3, 'conservative spin');
near(plans.conservative.lateral_in_s2, usable.lateral * lowest(c => c.friction) * vehicle.driven_weight_fraction * g * inPerM, 1e-3, 'conservative lateral');
const half = vehicle.track_m / 2 * inPerM;
near(report.half_track_in, half, 1e-5, 'half track');
for (const [name, plan] of Object.entries(plans)) {
  assert.ok(plan.uturn_in_s <= plan.cruise_in_s * 7.5 / (7.5 + half) + 1e-5, `${name} U-turn keeps the outer wheel at or below usable speed`);
  assert.ok(plan.uturn_in_s <= Math.sqrt(plan.lateral_in_s2 * 7.5) + 1e-5, `${name} U-turn is within the lateral bound`);
}
for (const row of report.arc_limits) for (const name of Object.keys(plans)) {
  near(row[name].outer_wheel_limit_in_s, plans[name].cruise_in_s * row.radius_in / (row.radius_in + half), 1e-4, `arc limit ${name} ${row.radius_in}`);
}
for (const key of Object.keys(plans.nominal)) if (key !== 'spin_90_s' && key !== 'stop_cost_s') {
  assert.ok(plans.conservative[key] <= plans.nominal[key] + 1e-9 && plans.nominal[key] <= plans.aggressive[key] + 1e-9, `envelope order ${key}`);
}

// The lap model's formulas, restated: arc plus transition, two 48 in straights, fixed mission allowances.
assert.equal(report.lap_model.length, 6);
for (const r of report.lap_model) {
  const uturn = Math.min(r.cruise_in_s, Math.sqrt(r.lat_accel_in_s2 * 7.5));
  const lap = 2 * (Math.PI * 7.5 + 6) / uturn + 96 / r.cruise_in_s;
  near(r.uturn_speed_in_s, uturn, 1e-4, `U-turn ${r.envelope}`);
  near(r.clean_lap_s, lap, 1e-3, `lap ${r.envelope}`);
  near(r.clean_mission_s, 180 / r.cruise_in_s + 3 * lap + 18, 1e-3, `mission ${r.envelope}`);
  near(r.outer_wheel_in_s, uturn * (7.5 + half) / 7.5, 1e-3, `outer wheel ${r.envelope}`);
}
const lapRow = name => report.lap_model.find(r => r.source === 'lap study' && r.envelope === name);
assert.ok(lapRow('fast').outer_wheel_in_s > report.lowest_top_speed_in_s, 'the 16 in/s U-turn needs more than the lowest top speed');
assert.ok(lapRow('nominal').outer_wheel_in_s < report.lowest_top_speed_in_s, 'the 12 in/s U-turn stays within the lowest top speed');
for (const r of report.lap_model.filter(x => x.source === 'dynamics')) assert.ok(r.outer_wheel_share_of_lowest_top_speed <= 1, `${r.envelope} U-turn is drivable`);

const limitA = golden.model.electrical.driver_current_limit_a;
for (const c of report.conditions) assert.ok(c.spin.peak_motor_current_a <= limitA + 1e-9 && c.spin.peak_supply_current_a <= 2 * limitA + 1e-9, 'spin current stays within the driver limit');
const inertia = report.inertia_sensitivity, base = inertia[0];
assert.deepEqual(inertia.map(r => r.scale), [1, 3, 10, 30]);
for (const r of inertia) {
  near(r.launch.top_speed_m_s, base.launch.top_speed_m_s, 0.002, 'inertia leaves top speed alone');
  near(r.launch.accel_m_s2, base.launch.accel_m_s2, 0.05, 'inertia leaves grip-limited acceleration alone');
  near(r.brake.stop_distance_m, base.brake.stop_distance_m, 0.002, 'inertia leaves stopping distance alone');
  assert.ok(r.launch.peak_motor_current_a <= limitA + 1e-9, 'launch current stays within the driver limit');
}
assert.ok(inertia.at(-1).launch.peak_supply_current_a > 1.5 * base.launch.peak_supply_current_a, 'heavier wheels raise the launch current');

assert.equal(report.mission_replay.length, 2 * 2 * 3, 'two speeds x two fields x three conditions');
for (const r of report.mission_replay) {
  assert.equal(r.runs.length, 5);
  assert.equal(r.peak_supply_current_a, Math.max(...r.runs.map(x => x.peak_supply_current_a)));
  for (const run of r.runs) assert.ok(run.slip_share >= 0 && run.energy_wh > 0 && run.peak_motor_current_a <= 3 + 1e-9, 'plausible replay');
}
const worst = report.mission_replay.reduce((a, b) => (b.slip_share_median > a.slip_share_median ? b : a));
console.log(`Verified envelope v10: 27 conditions and ${report.mission_replay.length * 5} mission replays; conservative cruise ${plans.conservative.cruise_in_s.toFixed(1)} in/s, acceleration ${plans.conservative.accel_in_s2.toFixed(1)} in/s²; worst median slip ${(100 * worst.slip_share_median).toFixed(2)}%.`);
