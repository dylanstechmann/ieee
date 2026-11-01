/* Browser application. All state and sources are visible in the bundled HTML. */
(function () {
  'use strict';
  const data = globalThis.ROBOT_LAB_DATA, Core = globalThis.RobotLabCore;
  const $ = id => document.getElementById(id), canvas = $('view');
  if (!data || !Core || !globalThis.RobotLabRenderer) throw new Error('Robot lab scripts did not load in the required order.');
  let renderer;
  try { renderer = globalThis.RobotLabRenderer.createRenderer(canvas); }
  catch (error) { $('webgl-error').hidden = false; $('webgl-error').textContent = error.message; console.error(error); }
  let mode = 'assembly', playing = false, speed = 1, assemblyTime = 0, selectedPart = null, follow = false;
  let sim = Core.createSimulation(data, 'south'), lastStage = -1, lastEventCount = 0;
  const cameras = {
    assembly:{target:[0,0,3], distance:44, yaw:-0.85, pitch:0.82},
    simulation:{target:[48,24,0], distance:128, yaw:-1.12, pitch:1.0}
  };
  const partInstance = (p, position, yaw = 0, colorOverride = null) => ({id:p.id, mesh:p.kind, pos:position,
    rot:[...(p.rot || [0,0,0])].map((v, i) => i === 2 ? v + yaw : v), scale:p.size,
    color:colorOverride || p.color, selected:selectedPart === p.id});
  const box = (pos, scale, color, rot = [0,0,0]) => ({mesh:'box', pos, scale, color, rot});
  function lineBox(a, b, width, color, z = 0.06) {
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
    if (length < 1e-7) return null;
    return box([(a[0]+b[0])/2,(a[1]+b[1])/2,z], [length,width,0.045], color, [0,0,Math.atan2(dy,dx)]);
  }
  function outline(vertices, color, width = 0.18, z = 0.06) {
    return vertices.map((p, i) => lineBox(p, vertices[(i+1)%vertices.length], width, color, z)).filter(Boolean);
  }
  function assemblyScene() {
    const frame = Core.assemblyFrame(data.model, assemblyTime), items = [box([0,0,-0.35],[36,34,0.5],'#172433')];
    for (let x = -16; x <= 16; x += 4) items.push(box([x,0,-0.07],[0.035,32,0.025],'#304156'));
    for (let y = -16; y <= 16; y += 4) items.push(box([0,y,-0.07],[32,0.035,0.025],'#304156'));
    for (const p of frame.parts) items.push(partInstance(p, p.position));
    return {items, frame};
  }
  function robotItems(state) {
    const c = Math.cos(state.theta), s = Math.sin(state.theta);
    return data.model.parts.map(p => {
      const local = p.pos, position = [state.x + local[0]*c - local[1]*s, state.y + local[0]*s + local[1]*c, local[2]];
      const color = p.id === 'carried-tire' ? (state.tire === 'blue' ? '#408bd5' : '#d84f57') : null;
      return partInstance(p, position, state.theta, color);
    });
  }
  function fieldScene() {
    const items = [box([48,24,-0.36],[96,48,0.719],'#313b44')];
    items.push(box([48,0.5,2],[96,1,4],'#7b838a'), box([48,47.5,2],[96,1,4],'#7b838a'),
      box([0.5,24,2],[1,48,4],'#7b838a'), box([95.5,24,2],[1,48,4],'#7b838a'));
    for (let x = 5; x < 96; x += 5) items.push(box([x,24,0.012],[0.025,46,0.02],'#46515b'));
    for (let y = 4; y < 48; y += 4) items.push(box([48,y,0.012],[94,0.025,0.02],'#46515b'));
    for (const solid of data.field.solids) {
      const xs = solid.vertices_in.map(p => p[0]), ys = solid.vertices_in.map(p => p[1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys), center = solid.id.includes('center');
      items.push(box([(minX+maxX)/2,(minY+maxY)/2,center?1:0.75],[maxX-minX,maxY-minY,center?2:1.5],'#69737b'));
    }
    for (const f of data.field.features.filter(f => f.kind === 'marking')) {
      const start = f.id === 'start_box'; items.push(...outline(f.vertices_in, start?'#ab8cdb':'#e5e9e8',0.22));
    }
    const trace = data.field.features.find(f => f.id === 'track_marking_trace');
    items.push(...outline(trace.vertices_in,'#a2a9aa',0.45));
    const route = data.routes[$('route').value];
    for (let i = 1; i < route.waypoints.length; i++) {
      const a = route.waypoints[i-1], b = route.waypoints[i], line = lineBox(a,b,0.22,route.id === 'north'?'#e69b55':'#48c3b1',0.09);
      if (line) items.push(line);
    }
    const target = data.field.features.find(f => f.id === route.target_id), cx = (target.vertices_in[0][0]+target.vertices_in[2][0])/2, cy = (target.vertices_in[0][1]+target.vertices_in[2][1])/2;
    const tire = {id:'field-tire',kind:'torus',size:[1.068,1.068,1.068],rot:[0,0,0]};
    if (sim.state.tire === 'red') items.push(partInstance(tire,[cx,cy,0.3],0,'#408bd5'));
    else items.push(partInstance(tire,[cx+1.8,cy,0.3],0,'#d84f57'));
    items.push(...robotItems(sim.state));
    items.push(...outline(Core.robotPolygon(sim.state.x,sim.state.y,sim.state.theta),'#d5f249',0.14,0.11));
    if (sim.state.collision) { const p = sim.state.collision; items.push(...outline(Core.robotPolygon(p.x,p.y,p.theta),'#ff5964',0.3,0.15)); }
    return {items};
  }

  data.model.stages.forEach((stage, i) => {
    const button = document.createElement('button'); button.textContent = `${i+1} · ${stage.id}`; button.dataset.stage = i;
    button.title = stage.title; button.addEventListener('click', () => { setPlaying(false); assemblyTime = Core.assemblyFrame(data.model,0).starts[i]; });
    $('stage-list').appendChild(button);
  });
  for (const p of data.model.parts) {
    const button = document.createElement('button'); button.textContent = p.name; button.dataset.part = p.id;
    button.addEventListener('click', () => selectPart(p.id)); $('part-list').appendChild(button);
  }
  function selectPart(id) {
    selectedPart = selectedPart === id ? null : id;
    for (const b of document.querySelectorAll('[data-part]')) b.classList.toggle('active', b.dataset.part === selectedPart);
    const p = data.model.parts.find(p => p.id === selectedPart), detail = $('part-detail');
    detail.replaceChildren();
    const title = document.createElement('h3'), text = document.createElement('p');
    if (p) {
      title.textContent = p.name; text.textContent = p.description || `${data.model.stages[p.stage-1].description} This is a conceptual ${p.kind} with assumed placement and dimensions.`;
      $('question-suggestion').textContent = `Ask about ${p.name}, its assumed geometry, or what evidence would be needed to select real hardware.`;
      $('question-input').value = `In the Robot Lab, explain the ${p.name}: what is assumed, what would it do, and what should we test before choosing a real part?`;
    } else {
      title.textContent = 'Why this concept?'; text.textContent = 'Small differential-drive motions match the existing forward/reverse/spin route studies. Every component remains a placeholder until packaging, sensing and physical tests select real hardware.';
      const stage = Core.assemblyFrame(data.model,assemblyTime).stage;
      $('question-suggestion').textContent = 'Select a part or stage, then copy a question with its context.';
      $('question-input').value = `During “${stage.title}” in the Robot Lab: ${stage.question}`;
    }
    detail.append(title,text);
  }
  function setPlaying(value) {
    if (value && mode === 'simulation' && (sim.state.status === 'completed' || sim.state.status === 'collision')) sim.reset();
    playing = value; $('play').textContent = playing ? '❚❚ Pause' : '▶ Play'; $('view-status').textContent = playing ? `Running · ${speed}×` : 'Paused';
  }
  function resetCamera() {
    follow = false;
    const c = mode === 'assembly' ? cameras.assembly : cameras.simulation;
    Object.assign(c, mode === 'assembly' ? {target:[0,0,3],distance:44,yaw:-0.85,pitch:0.82} : {target:[48,24,0],distance:128,yaw:-1.12,pitch:1.0});
  }
  function setMode(next) {
    setPlaying(false); mode = next; selectedPart = null; selectPart(null); resetCamera();
    for (const name of ['assembly','simulation']) {
      $(`tab-${name}`).classList.toggle('active', name === mode); $(`tab-${name}`).setAttribute('aria-selected', String(name === mode)); $(`${name}-panel`).hidden = name !== mode;
    }
    $('timeline').max = mode === 'assembly' ? Core.assemblyFrame(data.model,0).total : 120;
    $('view-badge').textContent = mode === 'assembly' ? 'EXPLODED ASSEMBLY' : 'EMPTY-FIELD PHYSICS · NOT A LEGAL MISSION';
    $('viewer-legend').textContent = mode === 'assembly' ? '30 conceptual parts · official tire proportions · dimensions otherwise assumed' : 'Teal/orange guide path · green full footprint · grey walls/dividers · no obstacles';
    $('transport-note').textContent = mode === 'assembly' ? 'Assembly is deterministic: scrub to any point without losing component state.' : 'Live physics while playing. Scrub/rewind resets and deterministically re-simulates to that time.';
    $('question-suggestion').textContent = mode === 'assembly' ? 'Select a part or stage, then copy a question with its context.' : 'Ask about the controller, collision model, route assumptions, or a telemetry value.';
    if (mode === 'simulation') $('question-input').value = 'In the Robot Lab field simulation, explain which physics and route assumptions most limit what this run proves.';
  }
  function seekSimulation(time) {
    const target = Core.clamp(time,0,120); sim.reset(); if (target > 0) sim.step(target); lastEventCount = 0;
  }
  function reset() { setPlaying(false); if (mode === 'assembly') assemblyTime = 0; else sim.reset(); }
  function stepBy(delta) {
    setPlaying(false);
    if (mode === 'assembly') assemblyTime = Core.clamp(assemblyTime+delta,0,Core.assemblyFrame(data.model,0).total);
    else if (delta < 0) seekSimulation(sim.state.time+delta); else sim.step(delta);
  }
  for (const button of document.querySelectorAll('[data-mode]')) button.addEventListener('click', () => setMode(button.dataset.mode));
  $('play').addEventListener('click', () => setPlaying(!playing)); $('reset').addEventListener('click', reset);
  $('back').addEventListener('click', () => stepBy(-1)); $('forward').addEventListener('click', () => stepBy(1));
  $('speed').addEventListener('change', () => { speed = Number($('speed').value); if (playing) $('view-status').textContent = `Running · ${speed}×`; });
  $('timeline').addEventListener('input', () => { setPlaying(false); const t = Number($('timeline').value); if (mode === 'assembly') assemblyTime = t; else seekSimulation(t); });
  $('route').addEventListener('change', () => { setPlaying(false); sim = Core.createSimulation(data,$('route').value); lastEventCount = 0; resetCamera(); });

  for (const button of document.querySelectorAll('[data-camera]')) button.addEventListener('click', () => {
    const c = cameras[mode], action = button.dataset.camera;
    if (action === 'reset') resetCamera();
    if (action === 'top') { follow = false; c.pitch = 1.52; c.yaw = -Math.PI/2; c.distance = mode === 'assembly' ? 43 : 128; c.target = mode === 'assembly' ? [0,0,2] : [48,24,0]; }
    if (action === 'follow') { follow = mode === 'simulation'; if (follow) { c.distance = 30; c.pitch = 0.82; } }
  });
  let drag = null;
  canvas.addEventListener('pointerdown', e => { drag = {x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:0}; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return; const dx = e.clientX-drag.lastX, dy = e.clientY-drag.lastY; drag.moved += Math.abs(dx)+Math.abs(dy); drag.lastX=e.clientX; drag.lastY=e.clientY;
    const c = cameras[mode]; c.yaw -= dx*0.008; c.pitch = Core.clamp(c.pitch+dy*0.008,0.12,1.53); follow = false;
  });
  canvas.addEventListener('pointerup', e => {
    if (drag && drag.moved < 6 && renderer && mode === 'assembly') {
      const rect = canvas.getBoundingClientRect(), x = e.clientX-rect.left, y = e.clientY-rect.top;
      let best = null;
      for (const p of Core.assemblyFrame(data.model,assemblyTime).parts) {
        const screen = renderer.project(p.position); if (!screen) continue;
        const distance = Math.hypot(screen.x-x,screen.y-y); if (distance < 42 && (!best || distance < best.distance)) best = {id:p.id,distance};
      }
      if (best) selectPart(best.id);
    }
    drag = null;
  });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('wheel', e => { e.preventDefault(); const c = cameras[mode]; c.distance = Core.clamp(c.distance*Math.exp(e.deltaY*0.001),8,240); }, {passive:false});
  $('fullscreen').addEventListener('click', async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.querySelector('.viewer-card').requestFullscreen(); }
    catch { $('view-status').textContent = 'Fullscreen unavailable'; }
  });
  $('copy-question').addEventListener('click', async () => {
    const text = $('question-input').value.trim() || $('question-suggestion').textContent;
    let copied = false;
    try { await navigator.clipboard.writeText(text); copied = true; }
    catch { $('question-input').value = text; $('question-input').select(); copied = document.execCommand('copy'); }
    $('copy-status').textContent = copied ? 'Copied' : 'Select and copy manually';
  });
  document.addEventListener('keydown', e => {
    if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
    if (e.key.toLowerCase() === 'r') reset();
    if (e.key === 'ArrowLeft') { e.preventDefault(); stepBy(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); stepBy(1); }
  });
  function updateAssembly(frame) {
    $('timeline').value = frame.time; $('time').textContent = `${Core.formatTime(frame.time)} / ${Core.formatTime(frame.total)}`;
    $('step-count').textContent = `Step ${frame.stageIndex+1} of ${data.model.stages.length} · ${frame.assembledCount}/${frame.parts.length} parts seated`;
    if (lastStage !== frame.stageIndex) {
      lastStage = frame.stageIndex; $('stage-title').textContent = frame.stage.title; $('stage-description').textContent = frame.stage.description;
      for (const b of document.querySelectorAll('[data-stage]')) b.classList.toggle('active',Number(b.dataset.stage) === lastStage);
      if (!selectedPart) { $('question-suggestion').textContent = frame.stage.question; $('question-input').value = `During “${frame.stage.title}” in the Robot Lab: ${frame.stage.question}`; }
    }
  }
  function updateSimulation() {
    const s = sim.state, command = sim.commands[Math.min(s.commandIndex,sim.commands.length-1)];
    $('timeline').value = s.time; $('time').textContent = `${Core.formatTime(s.time)} / 02:00.0`;
    $('sim-status').textContent = s.dwell > 0 ? `Dock dwell ${s.dwell.toFixed(1)} s` : s.status;
    $('sim-time').textContent = `${s.time.toFixed(1)} s`; $('sim-pose').textContent = `${s.x.toFixed(1)}, ${s.y.toFixed(1)} in · ${Core.deg(s.theta).toFixed(0)}°`;
    $('sim-speed').textContent = `${s.v.toFixed(1)} in/s`; $('sim-distance').textContent = `${s.distance.toFixed(1)} in`;
    $('sim-command').textContent = `${Math.min(s.commandIndex+1,sim.commands.length)}/${sim.commands.length} · ${command ? command.kind : 'done'}`;
    $('sim-tire').textContent = s.tire === 'blue' ? 'Blue · conceptual pickup' : 'Red preload'; $('sim-progress').textContent = `${Math.round(sim.progress*100)}%`;
    if (lastEventCount !== s.events.length) {
      lastEventCount = s.events.length; $('event-log').replaceChildren();
      for (const event of s.events) { const li = document.createElement('li'); li.textContent = `${event.time.toFixed(1)} s — ${event.message}`; $('event-log').appendChild(li); }
      $('event-log').scrollTop = $('event-log').scrollHeight;
    }
  }
  let previous = performance.now();
  function tick(now) {
    const dt = Math.min(0.05,Math.max(0,(now-previous)/1000)); previous = now;
    if (playing) {
      if (mode === 'assembly') {
        const total = Core.assemblyFrame(data.model,0).total; assemblyTime = Math.min(total,assemblyTime+dt*speed); if (assemblyTime >= total) setPlaying(false);
      } else { sim.step(dt*speed); if (sim.state.status === 'completed' || sim.state.status === 'collision') setPlaying(false); }
    }
    if (mode === 'simulation' && follow) cameras.simulation.target = [sim.state.x,sim.state.y,1.8];
    const scene = mode === 'assembly' ? assemblyScene() : fieldScene();
    if (renderer) renderer.render(scene.items,cameras[mode]);
    if (mode === 'assembly') updateAssembly(scene.frame); else updateSimulation();
    requestAnimationFrame(tick);
  }
  globalThis.robotLab = {getDiagnostics:() => ({mode,playing,speed,assemblyTime,selectedPart,
    stage:Core.assemblyFrame(data.model,assemblyTime).stageIndex,
    assembled:Core.assemblyFrame(data.model,assemblyTime).assembledCount,
    simulation:{time:sim.state.time,status:sim.state.status,x:sim.state.x,y:sim.state.y,theta:sim.state.theta,
      tire:sim.state.tire,commandIndex:sim.state.commandIndex,commands:sim.commands.length,events:sim.state.events.length},
    canvas:{width:canvas.width,height:canvas.height},webgl:Boolean(renderer)})};
  setMode('assembly'); requestAnimationFrame(tick);
})();
