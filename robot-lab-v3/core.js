/* Stock Car Robot Lab: dependency-free deterministic assembly and planar drive core. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RobotLabCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const EPS = 1e-8;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const rad = d => d * Math.PI / 180;
  const deg = r => r * 180 / Math.PI;
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const finite = (v, name) => { if (!Number.isFinite(v)) throw new Error(`${name} must be finite`); return v; };

  function validateModel(model) {
    if (!model || !Array.isArray(model.stages) || !model.stages.length || !Array.isArray(model.parts)) throw new Error('assembly stages and parts required');
    const ids = new Set();
    for (const p of model.parts) {
      if (!p.id || ids.has(p.id) || !Number.isInteger(p.stage) || !model.stages[p.stage - 1]) throw new Error('valid unique part stage required');
      if (!['box', 'cylinder', 'torus'].includes(p.kind) || p.pos.length !== 3 || p.size.length !== 3 || p.exploded.length !== 3) throw new Error(`invalid part ${p.id}`);
      [...p.pos, ...p.size, ...p.exploded].forEach((n, i) => finite(n, `${p.id}[${i}]`));
      if (p.size.some(n => n <= 0)) throw new Error(`positive part size required: ${p.id}`);
      ids.add(p.id);
    }
    let total = 0;
    for (const s of model.stages) { finite(s.duration_s, 'stage duration'); if (s.duration_s <= 0) throw new Error('positive stage duration required'); total += s.duration_s; }
    return total;
  }

  function assemblyFrame(model, time) {
    const total = validateModel(model), t = clamp(finite(time, 'assembly time'), 0, total);
    let elapsed = 0, stageIndex = model.stages.length - 1;
    const starts = model.stages.map(s => { const start = elapsed; elapsed += s.duration_s; return start; });
    if (t < total) stageIndex = model.stages.findIndex((s, i) => t < starts[i] + s.duration_s);
    const parts = model.parts.map(p => {
      const stage = model.stages[p.stage - 1], start = starts[p.stage - 1];
      const progress = smooth((t - start) / stage.duration_s);
      const position = progress === 1 ? [...p.pos] : progress === 0 ? [...p.exploded] : p.exploded.map((v, i) => v + (p.pos[i] - v) * progress);
      return {...p, progress, position};
    });
    return {time:t, total, stageIndex, stage:model.stages[stageIndex], starts,
      assembledCount:parts.filter(p => p.progress === 1).length, parts};
  }

  function compileRoute(route) {
    if (!route || !Array.isArray(route.waypoints) || route.waypoints.length < 2) throw new Error('route waypoints required');
    const commands = [], dock = route.docking_waypoint_index;
    for (let i = 1; i < route.waypoints.length; i++) {
      const a = route.waypoints[i - 1], b = route.waypoints[i];
      if (a.length !== 3 || b.length !== 3 || [...a, ...b].some(n => !Number.isFinite(n))) throw new Error('finite route poses required');
      const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy), angle = wrap(rad(b[2] - a[2]));
      const prev = commands[commands.length - 1];
      if (length > EPS) {
        const h = rad(a[2]), along = dx * Math.cos(h) + dy * Math.sin(h), lateral = -dx * Math.sin(h) + dy * Math.cos(h);
        if (Math.abs(lateral) > 1e-5 || Math.abs(along) < EPS) throw new Error(`non-drive-compatible segment ${i}`);
        const direction = Math.sign(along), heading = Math.atan2(dy, dx);
        if (prev && prev.kind === 'translate' && prev.direction === direction && prev.toWaypoint !== dock && Math.abs(wrap(prev.pathHeading - heading)) < 1e-5) {
          prev.to = [...b]; prev.length += length; prev.toWaypoint = i;
        } else commands.push({kind:'translate', from:[...a], to:[...b], direction, length, pathHeading:heading, toWaypoint:i});
      } else if (Math.abs(angle) > EPS) {
        if (prev && prev.kind === 'spin' && prev.toWaypoint !== dock && Math.hypot(prev.to[0] - a[0], prev.to[1] - a[1]) < EPS) {
          prev.to = [...b]; prev.angle = wrap(rad(b[2] - prev.from[2])); prev.toWaypoint = i;
        } else commands.push({kind:'spin', from:[...a], to:[...b], angle, toWaypoint:i});
      }
    }
    if (!commands.length) throw new Error('route contains no motion');
    const dockCommandIndex = commands.findIndex(c => c.toWaypoint === dock);
    if (!Number.isInteger(dock) || dockCommandIndex < 0) throw new Error('dock must terminate a motion command');
    return {commands, dockCommandIndex};
  }

  function robotPolygon(x, y, theta, length = 10, width = 10) {
    const c = Math.cos(theta), s = Math.sin(theta);
    return [[-length / 2, -width / 2], [length / 2, -width / 2], [length / 2, width / 2], [-length / 2, width / 2]]
      .map(([a, b]) => [x + a * c - b * s, y + a * s + b * c]);
  }

  function intersects(a, b) {
    for (const poly of [a, b]) for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length], nx = p[1] - q[1], ny = q[0] - p[0];
      const pa = a.map(v => v[0] * nx + v[1] * ny), pb = b.map(v => v[0] * nx + v[1] * ny);
      if (Math.max(...pa) <= Math.min(...pb) + EPS || Math.max(...pb) <= Math.min(...pa) + EPS) return false;
    }
    return true;
  }

  function collisionAt(data, x, y, theta) {
    const poly = robotPolygon(x, y, theta), b = data.field.bounds;
    if (poly.some(p => p[0] <= b.min_x + EPS || p[0] >= b.max_x - EPS || p[1] <= b.min_y + EPS || p[1] >= b.max_y - EPS)) return 'outer-wall';
    for (const solid of data.field.solids) if (intersects(poly, solid.vertices_in)) return solid.id;
    return null;
  }

  function createSimulation(data, routeId = 'south') {
    const route = data.routes[routeId];
    if (!route) throw new Error(`unknown route ${routeId}`);
    const compiled = compileRoute(route), commands = compiled.commands, cfg = data.model.physics;
    const initial = collisionAt(data, route.waypoints[0][0], route.waypoints[0][1], rad(route.waypoints[0][2]));
    if (initial) throw new Error(`initial route collision: ${initial}`);
    const state = {};
    function reset() {
      const p = route.waypoints[0];
      Object.assign(state, {x:p[0], y:p[1], theta:rad(p[2]), v:0, omega:0, time:0, distance:0,
        commandIndex:0, status:'ready', tire:'red', dwell:0, collision:null, wheelLeft:0, wheelRight:0,
        events:[{time:0, type:'reset', message:`${route.label} loaded; no lap or scoring claim.`}]});
    }
    reset();
    function finishCommand() {
      const command = commands[state.commandIndex];
      state.commandIndex++;
      if (command.toWaypoint === route.docking_waypoint_index) {
        state.dwell = cfg.dock_dwell_s; state.tire = 'blue';
        state.events.push({time:state.time, type:'exchange', message:'Conceptual dock reached: red drop / blue pickup event. Task legality is unresolved.'});
      }
      if (state.commandIndex >= commands.length) {
        state.status = 'completed'; state.v = state.omega = 0;
        state.events.push({time:state.time, type:'complete', message:'Stored route complete; this is not a complete three-lap mission.'});
      }
    }
    function substep(h) {
      if (state.status === 'ready') state.status = 'running';
      if (state.status === 'completed' || state.status === 'collision') return;
      state.time += h;
      if (state.dwell > 0) {
        state.dwell = Math.max(0, state.dwell - h); state.v = state.omega = 0; return;
      }
      if (state.commandIndex >= commands.length) return;
      const c = commands[state.commandIndex], maxOmega = rad(cfg.max_angular_deg_s);
      let targetV = 0, targetOmega = 0;
      if (c.kind === 'spin') {
        const error = wrap(rad(c.to[2]) - state.theta);
        if (Math.abs(error) <= rad(cfg.heading_tolerance_deg)) { finishCommand(); return; }
        targetOmega = clamp(error * 3, -maxOmega, maxOmega);
      } else {
        const dx = c.to[0] - state.x, dy = c.to[1] - state.y, remaining = Math.hypot(dx, dy);
        const finalError = wrap(rad(c.to[2]) - state.theta);
        if (remaining <= cfg.position_tolerance_in) {
          if (Math.abs(finalError) <= rad(cfg.heading_tolerance_deg)) { finishCommand(); return; }
          targetOmega = clamp(finalError * 3, -maxOmega, maxOmega);
        } else {
          const path = Math.atan2(dy, dx), desired = c.direction > 0 ? path : wrap(path + Math.PI);
          const error = wrap(desired - state.theta), maxV = c.direction > 0 ? cfg.max_forward_in_s : cfg.max_reverse_in_s;
          targetV = c.direction * Math.min(maxV, Math.max(0.8, remaining * 2.2)) * clamp(1 - Math.abs(error) / 1.2, 0.12, 1);
          targetOmega = clamp(error * 3.2, -maxOmega, maxOmega);
        }
      }
      const approach = (value, target, amount) => value + clamp(target - value, -amount, amount);
      state.v = approach(state.v, targetV, cfg.linear_accel_in_s2 * h);
      state.omega = approach(state.omega, targetOmega, rad(cfg.angular_accel_deg_s2) * h);
      const nextTheta = wrap(state.theta + state.omega * h);
      let nextX, nextY;
      if (Math.abs(state.omega) > EPS) {
        nextX = state.x + state.v / state.omega * (Math.sin(nextTheta) - Math.sin(state.theta));
        nextY = state.y - state.v / state.omega * (Math.cos(nextTheta) - Math.cos(state.theta));
      } else {
        nextX = state.x + state.v * Math.cos(state.theta) * h;
        nextY = state.y + state.v * Math.sin(state.theta) * h;
      }
      const hit = collisionAt(data, nextX, nextY, nextTheta);
      if (hit) {
        state.status = 'collision'; state.v = state.omega = 0;
        state.collision = {collider:hit, commandIndex:state.commandIndex, time:state.time, x:nextX, y:nextY, theta:nextTheta};
        state.events.push({time:state.time, type:'collision', message:`Physics stopped on ${hit}; candidate pose rejected.`});
        return;
      }
      state.distance += Math.hypot(nextX - state.x, nextY - state.y);
      state.x = nextX; state.y = nextY; state.theta = nextTheta;
      state.wheelLeft += (state.v - state.omega * cfg.wheel_track_in / 2) * h / 1.5;
      state.wheelRight += (state.v + state.omega * cfg.wheel_track_in / 2) * h / 1.5;
    }
    function step(dt) {
      finite(dt, 'simulation dt');
      if (dt < 0 || dt > 120) throw new Error('simulation dt must be between 0 and 120 seconds');
      const count = Math.ceil(dt / cfg.fixed_step_s);
      for (let i = 0; i < count; i++) substep(Math.min(cfg.fixed_step_s, dt - i * cfg.fixed_step_s));
      return state;
    }
    return {state, route, commands, reset, step,
      get progress() { return state.commandIndex / commands.length; }};
  }

  function formatTime(seconds) {
    seconds = Math.max(0, finite(seconds, 'time'));
    const m = Math.floor(seconds / 60), s = seconds - m * 60;
    return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`;
  }

  return {clamp, wrap, rad, deg, smooth, validateModel, assemblyFrame, compileRoute,
    robotPolygon, intersects, collisionAt, createSimulation, formatTime};
});
