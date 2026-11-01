import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { presentationFrame, shiftBox, sampledPresentationBox, tireVertices } from './study-core.js';

const D = globalThis.STUDIO_DATA;
const IN = 0.0254, MM = 0.001;
const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
const fieldPos = (x, y, h = 0) => new THREE.Vector3((x - 48) * IN, h * IN, -(y - 24) * IN);
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#9fa8ae');
scene.fog = new THREE.Fog('#9fa8ae', 5, 12);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.6;
const camera = new THREE.PerspectiveCamera(38, 1, 0.002, 40);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.495;
scene.add(new THREE.HemisphereLight('#ffffff', '#6f767b', 0.22));
const sun = new THREE.DirectionalLight('#fff4e8', 3.3);
sun.position.set(-1.1, 2.7, 1.3);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -1.7, right: 1.7, top: 1.1, bottom: -1.1, near: 0.5, far: 7 });
sun.shadow.bias = -0.00015;
sun.shadow.normalBias = 0.0015;
scene.add(sun);
const fill = new THREE.DirectionalLight('#dfe8ff', 0.55);
fill.position.set(1.6, 1.2, -1.4);
scene.add(fill);
const phys = (o) => new THREE.MeshPhysicalMaterial(o);
function canvasTexture(w, h, draw, nearest = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  if (nearest) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; }
  t.anisotropy = 8; return t;
}
const M = {
  black: phys({ color: '#0d0e0f', roughness: 0.86 }), white: phys({ color: '#eeeeea', roughness: 0.74 }),
  gray: phys({ color: '#c4c9c8', roughness: 0.8 }), floor: phys({ color: '#80878b', roughness: 0.95 }),
  aluminum: phys({ color: '#d0d4d7', metalness: 1, roughness: 0.42 }),
  machined: phys({ color: '#d9dcdf', metalness: 1, roughness: 0.26 }),
  steel: phys({ color: '#5d6166', metalness: 1, roughness: 0.38 }),
  chrome: phys({ color: '#eceef0', metalness: 1, roughness: 0.05 }),
  plastic: phys({ color: '#141516', roughness: 0.5 }), silicone: phys({ color: '#121213', roughness: 0.93 }),
  deck: phys({ color: '#3a3d41', roughness: 0.62 }), riser: phys({ color: '#2f6f9f', roughness: 0.6 }),
  tpu: phys({ color: '#2d63d4', roughness: 0.55, clearcoat: 0.25 }),
  green: phys({ color: '#159447', roughness: 0.85, side: THREE.DoubleSide }),
  dowel: phys({ color: '#d8c39a', roughness: 0.7 }),
};
const PART_INFO = {};
function tag(obj, id, info) { obj.traverse((o) => { o.userData.partId = id; }); if (info) PART_INFO[id] = info; return obj; }
const field = new THREE.Group(); scene.add(field);
const LAYOUT = D.layout, lay = Object.fromEntries(LAYOUT.features.map((f) => [f.id, f]));
const DIV_Y = lay.center_divider_axis.vertices_in[0][1];
const DIV_X0 = lay.center_divider_axis.vertices_in[0][0], DIV_X1 = lay.center_divider_axis.vertices_in[1][0];
const OCT_CX = (DIV_X0 + DIV_X1) / 2;
function flat(pts, material) {
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2((x - 48) * IN, (y - 24) * IN)));
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s), material); m.rotation.x = -Math.PI / 2; m.position.y = 0.0002; m.receiveShadow = true; return m;
}
function box(w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w * IN, h * IN, d * IN), material);
  m.position.copy(fieldPos(x, y, z)); m.castShadow = true; m.receiveShadow = true; return m;
}
const tagMat = phys({ roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08 });
function setTag(id) {
  tagMat.map = canvasTexture(176, 176, (g) => {
    g.fillStyle = '#f2f2ef'; g.fillRect(0, 0, 176, 176); g.fillStyle = '#101010';
    D.tagBits[id].forEach((row, r) => row.forEach((b, c) => { if (b) g.fillRect((c + 1) * 16, (r + 1) * 16, 16, 16); }));
  }, true); tagMat.needsUpdate = true;
}
function buildField() {
  const board = new THREE.Mesh(new THREE.BoxGeometry(96 * IN, 23 / 32 * IN, 48 * IN), M.black);
  board.position.y = -23 / 32 * IN / 2; board.receiveShadow = true;
  field.add(tag(board, 'board', { name: 'GM2 V3 field base, 96 × 48 in', badge: 'dim', note: 'Drawing callouts and constrained layout; not a measured physical field.' }));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), M.floor); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.019; floor.receiveShadow = true; scene.add(floor);
  const white = new THREE.Group();
  for (const id of ['pit_box_1', 'pit_box_2', 'pit_box_3', 'start_box']) white.add(flat(lay[id].vertices_in, M.white));
  const oct = (d) => { const k = Math.SQRT2 - 1, a = 18.375 + d * k, b = 6.125 + d * k, X = 25.269 + d, Y = 13.019 + d; return [[a, -Y], [X, -b], [X, b], [a, Y], [-a, Y], [-X, b], [-X, -b], [-a, -Y]].map(([x, y]) => [OCT_CX + x, DIV_Y + y]); };
  const outer = new THREE.Shape(oct(0.5).map(([x, y]) => new THREE.Vector2((x - 48) * IN, (y - 24) * IN)));
  outer.holes.push(new THREE.Path(oct(-0.5).reverse().map(([x, y]) => new THREE.Vector2((x - 48) * IN, (y - 24) * IN))));
  const line = new THREE.Mesh(new THREE.ShapeGeometry(outer), M.white); line.rotation.x = -Math.PI / 2; line.position.y = 0.0002; white.add(line);
  field.add(tag(white, 'white', { name: 'White field markings', badge: 'dim', note: 'Paint geometry is not an official lap corridor. Earlier navigation found pinch-zone conflicts; official Q&A remains unresolved.' }));
  const walls = new THREE.Group();
  walls.add(box(96, 3.5, 0.75, M.gray, 48, 0.375, 1.75), box(96, 3.5, 0.75, M.gray, 48, 47.625, 1.75), box(0.75, 3.5, 46.5, M.gray, 0.375, 24, 1.75), box(0.75, 3.5, 46.5, M.gray, 95.625, 24, 1.75));
  walls.add(box(36, 1.5, 0.75, M.gray, OCT_CX, DIV_Y, 0.75));
  const pd = lay.pit_divider_axis.vertices_in; walls.add(box(0.75, 0.75, 16, M.gray, 28, (pd[0][1] + pd[1][1]) / 2, 0.375));
  field.add(tag(walls, 'walls', { name: 'Walls and dividers', badge: 'approx', note: 'Heights and mounting assume nominal lumber on edge. Measure a built field; do not use these stand-ins as a clearance certificate.' }));
  const tower = new THREE.Group(); tower.add(box(0.75, 6, 4, M.gray, 26.9, 30, 3));
  const tagMesh = new THREE.Mesh(new THREE.PlaneGeometry(68 * MM * 11 / 9, 68 * MM * 11 / 9), tagMat);
  tagMesh.position.copy(fieldPos(26.52, 30, 2.6)); tagMesh.rotation.y = -Math.PI / 2; tower.add(tagMesh);
  flagPivot.position.copy(fieldPos(27.45, 30, 6));
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * IN, 0.12 * IN, 5 * IN, 12), M.dowel); rod.position.y = 2.5 * IN;
  cloth = new THREE.Mesh(new THREE.PlaneGeometry(3.6 * IN, 2.6 * IN, 12, 6), M.green); cloth.geometry.translate(1.8 * IN, 0, 0); cloth.position.y = 3.6 * IN; cloth.rotation.y = -Math.PI / 2;
  flagPivot.add(rod, cloth); flagPivot.rotation.z = Math.PI; tower.add(flagPivot);
  field.add(tag(tower, 'tower', { name: 'Start flag and tagStandard41h12', badge: 'approx', note: 'Exact decoded tag bits; mount and flag geometry are approximate. AprilTag 3—not OpenCV ArUco—decoded the organizer tags. Pose uses the inner 5/9 edge.' }));
  const cars = new THREE.Group();
  for (const [x, y, color] of [[OCT_CX - 10, 42.2, '#2b5fd9'], [OCT_CX + 10, 17.4, '#f08a24'], [OCT_CX - 10, 5.9, '#d6332e']]) {
    const g = new THREE.Group(), paint = phys({ color, roughness: 0.32, clearcoat: 0.7 });
    const b = new THREE.Mesh(new RoundedBoxGeometry(4.6 * IN, 1.7 * IN, 3 * IN, 3, 0.55 * IN), paint); b.position.y = 1.35 * IN;
    const cab = new THREE.Mesh(new RoundedBoxGeometry(2.5 * IN, 1.4 * IN, 2.6 * IN, 3, 0.5 * IN), paint); cab.position.set(-0.35 * IN, 2.6 * IN, 0); g.add(b, cab); g.position.copy(fieldPos(x, y)); cars.add(g);
  }
  field.add(tag(cars, 'cars', { name: 'Toy-car stand-ins', badge: 'approx', note: 'Car models, dimensions and exact placements are not published. Three obstacles are required; these are illustrative only.' }));
}
const flagPivot = new THREE.Group(); let cloth;
const tireGroup = new THREE.Group();
function buildTire() {
  const geo = new STLLoader().parse(bytes(D.tireStl)); geo.scale(MM, MM, MM); geo.computeBoundingBox();
  const bb = geo.boundingBox; geo.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, M.tpu); m.castShadow = true; m.receiveShadow = true;
  tireGroup.add(tag(m, 'tire', { name: 'Organizer spare-tire STL', badge: 'cad', note: '68.2 mm OD, 40.3 mm nominal bore, 27.6 mm thick. Printed tolerances and field orientation remain unmeasured.' })); field.add(tireGroup);
}
function placeTire(id) { const v = lay[`pit_box_${id}`].vertices_in; tireGroup.position.copy(fieldPos((v[0][0] + v[2][0]) / 2 - 4, (v[0][1] + v[2][1]) / 2 - 4)); }
const A = D.assembly, meas = A.measurements, KIT = D.kit;
const robot = new THREE.Group(), body = new THREE.Group(); robot.add(body); scene.add(robot);
const spin = { right: new THREE.Group(), left: new THREE.Group() };
const parts = {}, PART_META = Object.fromEntries(D.partsMeta.map((p) => [p.id, p]));
const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
function finishFor(id, color) {
  if (id === 'bracket') return M.aluminum; if (id === 'hub') return M.machined;
  if (id === 'wheel') return lum(color) > 0.02 ? M.plastic : M.silicone;
  if (id === 'caster') return lum(color) > 0.5 ? M.chrome : M.plastic;
  const hsl = color.getHSL({});
  if (hsl.s > 0.45 && hsl.l > 0.08) return phys({ color: color.clone(), metalness: hsl.h > 0.06 && hsl.h < 0.12 ? 1 : 0, roughness: 0.38 });
  if (lum(color) > 0.35) return phys({ color: color.clone().lerp(new THREE.Color('#c9cdd2'), 0.6), metalness: 1, roughness: 0.3 });
  return phys({ color: '#303234', metalness: 0.6, roughness: 0.45 });
}
async function loadPart(id) {
  const gltf = await new GLTFLoader().parseAsync(bytes(D.parts[id]), '');
  gltf.scene.traverse((o) => { if (o.isMesh) { o.material = finishFor(id, o.material.color || new THREE.Color('#888')); o.castShadow = true; o.receiveShadow = true; } }); return gltf.scene;
}
const mat4 = (rows) => new THREE.Matrix4().set(...rows.flat());
function instance(id, matrix, label = id) { const h = new THREE.Group(); const p = parts[id].clone(true); p.matrixAutoUpdate = false; p.matrix.copy(matrix); h.add(p); h.traverse((o) => { o.userData.partId = label; }); return h; }
function buildRobot(cfg) {
  body.clear(); spin.right.clear(); spin.left.clear();
  const mm = (v) => v * MM, gch = mm(cfg.gearbox_center_height_mm), axle = mm(cfg.axle_height_mm), up = cfg.shaft_direction === 'up' ? -1 : 1;
  const [mgx, mgy] = meas.motor.gearbox_center_xy.map(mm), mface = mm(meas.motor.gearbox_face_z), stack = A.assembly.lateral_stack_mm, faceY = mm(stack.gearbox_face);
  const motorM = mat4([[up, 0, 0, -up * mgx], [0, up, 0, -up * mgy + gch], [0, 0, 1, faceY - mface], [0, 0, 0, 1]]);
  const [bgx, bgy] = meas.bracket.gearbox_center_xy.map(mm), bz0 = mm(meas.bracket.z_range[0]);
  const bracketM = mat4([[1, 0, 0, -bgx], [0, 1, 0, -bgy + gch], [0, 0, 1, faceY - bz0], [0, 0, 0, 1]]);
  const hubM = mat4([[1, 0, 0, 0], [0, -1, 0, 0], [0, 0, -1, mm(stack.hub_flange_face + meas.hub.z_range[0])], [0, 0, 0, 1]]);
  const wheelM = mat4([[0, 0, 1, 0], [0, 1, 0, 0], [-1, 0, 0, mm(stack.wheel_center)], [0, 0, 0, 1]]);
  for (const side of ['right', 'left']) {
    const S = side === 'right' ? new THREE.Matrix4() : new THREE.Matrix4().makeRotationY(Math.PI);
    body.add(instance('motor', S.clone().multiply(motorM)), instance('bracket', S.clone().multiply(bracketM)));
    const sg = spin[side]; sg.position.set(0, axle, 0); const holder = new THREE.Group(); holder.matrixAutoUpdate = false; holder.matrix.copy(S); holder.add(sg); sg.add(instance('hub', hubM), instance('wheel', wheelM)); body.add(holder);
  }
  const width = cfg.id === 'kit-as-drawn' ? KIT.deck.width_mm : 172, holeZ = cfg.id === 'kit-as-drawn' ? 74 : 77.25, L = KIT.deck.length_mm;
  const shape = new THREE.Shape(); shape.moveTo(mm(-L / 2), mm(-width / 2)); shape.lineTo(mm(L / 2), mm(-width / 2)); shape.lineTo(mm(L / 2), mm(width / 2)); shape.lineTo(mm(-L / 2), mm(width / 2)); shape.closePath();
  const hole = (x, z, d) => { const p = new THREE.Path(); p.absarc(mm(x), mm(-z), mm(d / 2), 0, Math.PI * 2, true); shape.holes.push(p); };
  for (const z of [holeZ, -holeZ]) for (const x of [-14.8, 0, 14.8]) hole(x, z, KIT.deck.motor_hole_diameter_mm);
  for (const x of KIT.caster.positions_x_mm) { for (const z of [-KIT.caster.mount_hole_spacing_mm / 2, KIT.caster.mount_hole_spacing_mm / 2]) hole(x, z, KIT.deck.caster_hole_diameter_mm); if (cfg.caster_mode === 'through-deck') hole(x, 0, 14.5); }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: mm(KIT.deck.thickness_mm), bevelEnabled: true, bevelSize: mm(0.6), bevelThickness: mm(0.6), bevelSegments: 2, curveSegments: 24 }); geo.rotateX(-Math.PI / 2);
  const deck = new THREE.Mesh(geo, M.deck); deck.position.y = mm(cfg.deck_top_mm - KIT.deck.thickness_mm); deck.castShadow = true; deck.receiveShadow = true; tag(deck, 'deck'); body.add(deck);
  const czmin = mm(meas.caster.ball_bottom_z);
  for (const x of KIT.caster.positions_x_mm) {
    body.add(instance('caster', mat4([[0, 1, 0, mm(x)], [0, 0, 1, mm(cfg.caster_ball_bottom_mm) - czmin], [1, 0, 0, 0], [0, 0, 0, 1]])));
    if (cfg.caster_mode !== 'through-deck') {
      const top = cfg.deck_top_mm - KIT.deck.thickness_mm;
      if (cfg.caster_riser_mm > 0) { const r = new THREE.Mesh(new THREE.BoxGeometry(mm(17), mm(cfg.caster_riser_mm), mm(24)), M.riser); r.position.set(mm(x), mm(top - cfg.caster_riser_mm / 2), 0); tag(r, 'riser'); body.add(r); }
      const sp = new THREE.Mesh(new THREE.BoxGeometry(mm(15.2), mm(cfg.caster_spacer_mm), mm(20.3)), M.plastic); sp.position.set(mm(x), mm(top - cfg.caster_riser_mm - cfg.caster_spacer_mm / 2), 0); tag(sp, 'caster'); body.add(sp);
    }
  }
  body.position.y = mm(-Math.min(cfg.wheel_bottom_mm, cfg.caster_ball_bottom_mm));
  return { half: mm(stack.wheel_center), radius: mm(meas.wheel.outer_diameter / 2) };
}
function catalogue() {
  for (const id of ['motor', 'bracket', 'hub', 'wheel', 'caster']) { const p = PART_META[id]; PART_INFO[id] = { name: `${p.name} (#${p.sku}) × 2`, badge: 'cad', note: `Pololu vendor STEP; SHA-256 ${p.step_sha256.slice(0, 12)}…; ${p.triangles.toLocaleString()} triangles. ${id === 'motor' ? 'Output shaft is 7 mm off the gearbox center.' : ''}` }; }
  Object.assign(PART_INFO, {
    deck: { name: 'Proposed mule deck', badge: 'dim', note: 'Corrected alternatives use a proposed 172 mm width and measured bracket-hole plane. Not fabrication released; measure received parts.' },
    riser: { name: 'Proposed caster risers', badge: 'dim', note: '6.91 mm printed risers in the shaft-down alternative. Not structurally or physically validated.' },
  });
}
const CONFIGS = A.assembly.configurations;
let current = CONFIGS.find((c) => c.id === (params.get('config') || 'shaft-down')) || CONFIGS[2], geom;
function applyConfig(c) {
  current = c; geom = buildRobot(c);
  const gap = c.wheel_lift_above_casters_mm;
  $('config-status').textContent = gap > 0.5 ? `Kit as drawn: drive wheels ${gap.toFixed(2)} mm above the supporting casters. Do not fabricate.` : gap < -0.5 ? `Shaft-up alternative: ${(-gap).toFixed(2)} mm caster clearance; fore/aft rocking remains.` : 'Shaft-down proposal: nominal wheel/caster contact. Verify received parts before fabrication.';
  $('config-status').className = `status${gap > 0.5 ? ' bad' : ' warn'}`; $('play').disabled = gap > 0.5; resetDrive();
}
const VIEWS = {
  hero: { title: 'Robot', at: [0, 0.045, 0], from: [-0.36, 0.2, 0.34], local: true },
  motor: { title: 'Motor', at: [0, 0.045, 0.045], from: [0.13, 0.12, 0.11], local: true },
  contact: { title: 'Contact', at: [0, 0.006, 0.101], from: [0.085, 0.022, 0.235], local: true },
  field: { title: 'Field', at: [0.1, 0, 0], from: [-1.25, 1.35, 1.7] },
  top: { title: 'Top', at: [0, 0, 0], from: [0, 3.3, 0.001] },
  follow: { title: 'Follow', follow: true },
  study: { title: 'Study', at: [0.06, 0.025, 0], from: [0.42, 0.3, 0.48] },
};
let follow = false;
function setView(id) {
  const v = VIEWS[id] || VIEWS.hero; follow = Boolean(v.follow);
  document.querySelectorAll('#views button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === id)));
  if (follow) return;
  const at = new THREE.Vector3(...v.at), from = new THREE.Vector3(...v.from);
  if (v.local) { robot.updateMatrixWorld(true); robot.localToWorld(at); robot.localToWorld(from); }
  controls.target.copy(at); camera.position.copy(from);
}
let outline = null;
function select(id, focus = false) {
  document.querySelectorAll('.part').forEach((el) => el.classList.toggle('sel', el.dataset.id === id));
  const info = PART_INFO[id]; $('detail').replaceChildren();
  if (outline) { scene.remove(outline); outline = null; }
  if (!info) return;
  const b = document.createElement('b'), p = document.createElement('p'); b.textContent = info.name; p.textContent = info.note; $('detail').append(b, p);
  const bounds = new THREE.Box3(); scene.updateMatrixWorld(true); scene.traverse((o) => { if (o.isMesh && o.userData.partId === id) bounds.expandByObject(o); });
  if (!bounds.isEmpty()) { outline = new THREE.Box3Helper(bounds, '#46c37b'); scene.add(outline); if (focus) { const c = bounds.getCenter(new THREE.Vector3()); controls.target.copy(c); camera.position.copy(c).add(new THREE.Vector3(0.15, 0.1, 0.18)); } }
}
const ray = new THREE.Raycaster(); let downAt;
canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 4) return;
  const r = canvas.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), camera);
  const hit = ray.intersectObjects([robot, field], true).find((h) => h.object.userData.partId); if (hit) select(hit.object.userData.partId);
});
let assigned = 2;
function setAssigned(id) { assigned = id; setTag(id); placeTire(id); $('tag').value = String(id); }
const P = (x, y) => fieldPos(x, y, 0), wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
function routes() {
  const b = lay[`pit_box_${assigned}`].vertices_in, bx = (b[0][0] + b[2][0]) / 2, by = (b[0][1] + b[2][1]) / 2, s = lay.start_box.vertices_in, sx = (s[0][0] + s[2][0]) / 2, sy = (s[0][1] + s[2][1]) / 2, c = OCT_CX, y0 = DIV_Y;
  const lap = [[c - 25.3, y0 + 6.2], [c - 21.5, y0 + 10.5], [c - 17.5, y0 + 7.4], [c - 10, y0 + 6.8], [c - 2.5, y0 + 7.6], [c + 4.5, y0 + 12.6], [c + 18.4, y0 + 13], [c + 23.6, y0 + 9.6], [c + 25.3, y0 + 3], [c + 25.3, y0 - 3], [c + 23.6, y0 - 9.6], [c + 17.5, y0 - 16.6], [c + 10, y0 - 17.9], [c + 2.6, y0 - 16.6], [c - 2.6, y0 - 9.2], [c - 10, y0 - 6.5], [c - 17.5, y0 - 7.6], [c - 23.6, y0 - 7.3]];
  const toBox = [[c - 29, y0 + 12], [31, sy + 1], [22, sy], [bx + 9, by + 2], [bx + 1.5, by + 0.5]];
  const A0 = [[sx, sy], [sx + 7, sy], [31.5, sy], [c - 28.5, y0 + 9.5]], mA = { lap1: A0.length };
  A0.push(...lap); mA.lap2 = A0.length; A0.push(...lap); mA.lap2end = A0.length; A0.push(...toBox);
  const B = [[bx + 1.5, by + 0.5], [bx + 9, by + 3], [20, sy - 0.5], [31, sy + 1], [c - 28, y0 + 10]], mB = { lap3: B.length };
  B.push(...lap); mB.lap3end = B.length; B.push(...toBox); return [{ pts: A0, idx: mA }, { pts: B, idx: mB }];
}
let segs = [];
function buildPath() { segs = routes().map(({ pts, idx }) => { const curve = new THREE.CatmullRomCurve3(pts.map((q) => P(...q)), false, 'centripetal'); curve.arcLengthDivisions = 3000; const L = curve.getLengths(3000), n = pts.length - 1; return { curve, total: curve.getLength(), marks: Object.fromEntries(Object.entries(idx).map(([k, i]) => [k, L[Math.round(i / n * 3000)]])) }; }); }
function poseAt(seg, s) { const g = segs[seg], u = Math.min(Math.max(s / g.total, 0), 1), t = g.curve.getTangentAt(u); return { p: g.curve.getPointAt(u), heading: Math.atan2(-t.z, t.x) }; }
const sim = {};
function resetDrive() {
  buildPath(); Object.assign(sim, { started: false, paused: false, flagT: 0, seg: 0, s: 0, v: 0, theta: { right: 0, left: 0 }, dwell: 0, done: false, laps: 0, phase: 'Illustrative drive—not a legal mission' });
  const { p, heading } = poseAt(0, 0); sim.heading = heading; robot.position.copy(p); robot.rotation.y = heading; flagPivot.rotation.z = Math.PI; updateHud();
}
function curvatureAt(seg, s) { const total = segs[seg].total; return Math.abs(wrap(poseAt(seg, Math.min(s + 0.03, total)).heading - poseAt(seg, Math.max(s - 0.03, 0)).heading)) / 0.06; }
function turnWheels(ds, dpsi) { sim.theta.right += (ds + dpsi * geom.half) / geom.radius; sim.theta.left += (ds - dpsi * geom.half) / geom.radius; }
function stepSim(dt) {
  sim.flagT += dt; flagPivot.rotation.z = Math.PI * (1 - Math.min(1, sim.flagT / 0.6));
  if (sim.done || sim.flagT < 0.7) return;
  if (sim.flagT - 0.6 >= 178) { sim.done = true; sim.v = 0; sim.phase = 'Illustration auto-stop'; return; }
  if (sim.dwell > 0) {
    const f = Math.min(1, (4 - sim.dwell + dt) / 3), h = sim.spinFrom + sim.spinBy * f * f * (3 - 2 * f); turnWheels(0, wrap(h - sim.heading)); sim.heading = h; robot.rotation.y = h; sim.dwell -= dt; sim.phase = 'Illustrative pit pause—no tire mechanism';
    if (sim.dwell <= 0) { sim.seg = 1; sim.s = 0; } return;
  }
  const g = segs[sim.seg], remain = g.total - sim.s;
  if (remain < 0.002) { sim.v = 0; if (sim.seg === 0) { sim.dwell = 4; sim.spinFrom = sim.heading; sim.spinBy = wrap(poseAt(1, 0.02).heading - sim.heading); sim.laps = 2; } else { sim.done = true; sim.laps = 3; sim.phase = 'Illustration parked—not a legality result'; } return; }
  const target = Math.min(0.3, Math.sqrt(1.2 * remain), Math.sqrt(0.55 / Math.max(curvatureAt(sim.seg, sim.s), 1e-3)));
  sim.v = target > sim.v ? Math.min(target, sim.v + 0.6 * dt) : Math.max(target, sim.v - 1.2 * dt);
  const ds = Math.min(Math.max(sim.v * dt, 0.00002), remain); sim.s += ds;
  const { p, heading } = poseAt(sim.seg, sim.s); turnWheels(ds, wrap(heading - sim.heading)); sim.heading = heading; robot.position.copy(p); robot.rotation.y = heading;
  const m = g.marks;
  if (sim.seg === 0) { sim.laps = sim.s >= m.lap2end ? 2 : sim.s >= m.lap2 ? 1 : 0; sim.phase = sim.s < m.lap1 ? 'Illustrative entry' : sim.s < m.lap2 ? 'Illustrative lap 1' : sim.s < m.lap2end ? 'Illustrative lap 2' : 'Illustrative pit approach'; }
  else { sim.laps = sim.s >= m.lap3end ? 3 : 2; sim.phase = sim.s < m.lap3 ? 'Illustrative rejoin' : sim.s < m.lap3end ? 'Illustrative lap 3' : 'Illustrative parking'; }
}
function updateHud() {
  const study = workspace !== 'assembly';
  const t = study && studyResult() ? studyResult().samples[studyIndex].t : sim.started ? Math.max(0, sim.flagT - 0.6) : 0;
  $('clock').textContent = `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
  $('lap').textContent = study ? '—' : `${sim.laps} / 3`;
  $('phase').textContent = study ? workspace === 'stopping' ? 'Recorded stopping study' : workspace === 'mechanism' ? 'Recorded mechanism study' : 'Evidence review' : sim.phase;
  $('speedo').textContent = study && workspace === 'stopping' && studyResult() ? studyResult().samples[studyIndex].speed_m_s.toFixed(3) : study ? '—' : sim.v.toFixed(2);
}
const studyGroup = new THREE.Group(); scene.add(studyGroup); studyGroup.visible = false;
const studyMats = {
  deck: phys({ color: '#4b5964', transparent: true, opacity: 0.48, roughness: 0.7 }),
  motor: phys({ color: '#8c989f', transparent: true, opacity: 0.6, metalness: 0.5 }),
  wheel: phys({ color: '#22282d', transparent: true, opacity: 0.65 }),
  mechanism: phys({ color: '#e19a48', roughness: 0.55 }),
  unintended: phys({ color: '#ef6c54', roughness: 0.55 }),
  intended: phys({ color: '#e7c34f', roughness: 0.55 }),
  tire: phys({ color: '#315ba5', roughness: 0.7 }),
  proxy: new THREE.MeshBasicMaterial({ color: '#63d5c4', wireframe: true, transparent: true, opacity: 0.42 }),
  swept: new THREE.MeshBasicMaterial({ color: '#c08fec', wireframe: true, transparent: true, opacity: 0.5 }),
};
function studyBox(b, offset, material, id) {
  const size = b.max.map((v, i) => (v - b.min[i]) * MM), m = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  m.position.set(...b.min.map((v, i) => (v + b.max[i]) / 2 * MM + offset[i] * MM)); m.userData.studyPart = id; return m;
}
function clearStudy() { studyGroup.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }); studyGroup.clear(); }
function buildMechanism() {
  clearStudy();
  const c = D.mechanism.cases[caseIndex], p = presentationFrame(c, studyIndex), f = p.frame, off = p.offset;
  for (const b of D.mechanism.obstacles) {
    const id = b.id, mat = id === 'deck' ? studyMats.deck : id.startsWith('motor') ? studyMats.motor : studyMats.wheel;
    studyGroup.add(studyBox(shiftBox(b, off), [0, 0, 0], mat, id));
  }
  for (const part of f.parts) {
    const contact = f.contacts.find((x) => x.part === part.id), mat = contact ? contact.intended_contact ? studyMats.intended : studyMats.unintended : studyMats.mechanism;
    if (part.polygon) {
      const shape = new THREE.Shape(); part.polygon.forEach(([x, y], i) => i ? shape.lineTo(x * MM, -y * MM) : shape.moveTo(x * MM, -y * MM)); shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: (part.box.max[2] - part.box.min[2]) * MM, bevelEnabled: false }); geo.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, mat); m.position.set(off[0] * MM, part.box.min[2] * MM + off[2] * MM, off[1] * MM); m.castShadow = true; studyGroup.add(m);
    } else {
      const b = shiftBox(part.box, off), h = (b.max[2] - b.min[2]) * MM;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(part.radius * MM, part.radius * MM, h, 32), mat); m.position.set((b.min[0] + b.max[0]) / 2 * MM, (b.min[2] + b.max[2]) / 2 * MM, (b.min[1] + b.max[1]) / 2 * MM); m.castShadow = true; studyGroup.add(m);
    }
  }
  const verts = tireVertices(D, c), geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(verts.flat(), 3)); geo.computeVertexNormals();
  const tire = new THREE.Mesh(geo, studyMats.tire); tire.position.set(...p.reference.map((v) => v * MM)); tire.castShadow = true; studyGroup.add(tire);
  if ($('proxies').checked) {
    studyGroup.add(studyBox(shiftBox(f.tire_box, off), [0, 0, 0], studyMats.proxy));
    for (const b of D.mechanism.obstacles.filter((o) => !['deck', 'wheel--1', 'wheel-1', 'motor--1', 'motor-1'].includes(o.id))) studyGroup.add(studyBox(shiftBox(b, off), [0, 0, 0], studyMats.proxy));
  }
  if ($('swept').checked) studyGroup.add(studyBox(sampledPresentationBox(c), [0, 0, 0], studyMats.swept));
  $('telemetry').textContent = `${c.id}\n${f.phase}; approach ${f.approach_fraction.toFixed(3)}, actuation ${f.actuation_fraction.toFixed(3)}\nStationary-tire presentation; robot offset mm: ${off.map((v) => v.toFixed(2)).join(', ')}\nContacts: ${JSON.stringify(f.contacts)}\nRobot conflicts: ${JSON.stringify(f.robot_conflicts)}\nTire/robot potential overlaps: ${JSON.stringify(f.tire_robot_potential_overlaps)}\nAcquisition: ${c.summary.acquisition_status}; retention: ${c.summary.retention_status}; physical trials: ${c.summary.physical_trials}`;
}
let workspace = 'assembly', scenario = 'straight', modelVariant = D.stoppingConfig.model_variants[0], mode = 'coast', caseIndex = 0, studyIndex = 0, studyPlaying = false, studyClock = 0;
function studyResult() { return workspace === 'stopping' ? D.stopping.runs.find((r) => r.scenario_id === scenario && r.mode === mode && r.model_variant === modelVariant) : null; }
function studyCount() { return workspace === 'stopping' ? studyResult().samples.length : D.mechanism.cases[caseIndex].frames.length; }
function resetStudy() { studyIndex = 0; studyClock = 0; studyPlaying = false; $('study-play').textContent = 'Play'; $('timeline').max = String(studyCount() - 1); $('timeline').value = '0'; }
function drawChart() {
  const ctx = $('chart').getContext('2d'), w = 700, h = 340, pad = 42;
  const selected = D.stopping.runs.filter((r) => r.scenario_id === scenario && r.model_variant === modelVariant), alternate = D.stopping.runs.filter((r) => r.scenario_id === scenario && r.model_variant !== modelVariant), all = [...selected, ...alternate];
  const duration = D.stoppingConfig.scenarios.find((s) => s.id === scenario).duration_s, max = Math.max(0.01, ...all.flatMap((r) => r.samples.map((s) => Math.abs(s.speed_m_s)))) * 1.1;
  const x = (t) => pad + t / duration * (w - 2 * pad), y = (v) => h / 2 - v / max * (h / 2 - 40), colors = ['#7cbbf2', '#65dcc0', '#e6ba62', '#ef8c83'];
  ctx.fillStyle = '#10181e'; ctx.fillRect(0, 0, w, h); ctx.font = '15px system-ui';
  for (const [runs, dashed] of [[alternate, true], [selected, false]]) for (const r of runs) { const j = D.stoppingConfig.modes.indexOf(r.mode); ctx.strokeStyle = colors[j]; ctx.globalAlpha = dashed ? 0.35 : 1; ctx.lineWidth = !dashed && r.mode === mode ? 3 : 1; ctx.setLineDash(dashed ? [5, 5] : []); ctx.beginPath(); r.samples.forEach((s, i) => i ? ctx.lineTo(x(s.t), y(s.speed_m_s)) : ctx.moveTo(x(s.t), y(s.speed_m_s))); ctx.stroke(); }
  ctx.globalAlpha = 1; ctx.setLineDash([]); selected.forEach((r) => { const j = D.stoppingConfig.modes.indexOf(r.mode); ctx.fillStyle = colors[j]; ctx.fillText(r.mode, pad + j * 155, 20); });
  ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x(studyResult().samples[studyIndex].t), 26); ctx.lineTo(x(studyResult().samples[studyIndex].t), h - 30); ctx.stroke();
  ctx.fillStyle = '#c5d4df'; ctx.fillText('Solid: selected assumption; dashed: alternative', pad, h - 12);
}
function updateStudy() {
  if (workspace === 'stopping') {
    const r = studyResult(), s = r.samples[studyIndex], m = r.metrics, audit = D.stopping.motor_source_audit.find((a) => a.sku === r.motor_sku);
    $('telemetry').textContent = `${r.scenario_id}; ${r.mode}; ${r.model_variant}\nt=${s.t.toFixed(3)} s; speed=${s.speed_m_s.toFixed(5)} m/s; yaw rate=${s.yaw_rate_rad_s.toFixed(5)} rad/s\nCurrent L/R: ${s.current_a.map((v) => v.toFixed(4)).join(' / ')} A; ideal bus=${s.bus_v.toFixed(3)} V\nStop: ${m.stop_status}\nDwell-entry time: ${m.stop_time_s ?? 'not reached'} s; distance: ${m.stop_distance_m ?? 'not reached'} m\nPublished no-load current: ${audit.source.no_load_current_a} A; speed-fit implied: ${audit.reciprocal_speed_fit.implied_no_load_current_a.toFixed(3)} A\nHistorical track: 176 mm; vendor-CAD track: 202 mm\nNo driver truth-table mapping, accepted energy sink or physical validation.`;
    drawChart();
  } else if (workspace === 'mechanism') buildMechanism();
  $('timeline').value = String(studyIndex); $('sample').textContent = `Sample ${studyIndex + 1}/${studyCount()}`; updateHud();
}
function setWorkspace(next) {
  workspace = next; studyPlaying = false;
  for (const name of ['assembly', 'stopping', 'mechanism', 'evidence']) {
    $(`${name}-controls`) && ($(`${name}-controls`).hidden = workspace !== name);
    document.querySelector(`[data-workspace="${name}"]`).setAttribute('aria-pressed', String(workspace === name));
  }
  $('study-transport').hidden = !['stopping', 'mechanism'].includes(workspace);
  $('drive-controls').hidden = workspace !== 'assembly'; $('catalogue').hidden = workspace !== 'assembly';
  $('telemetry-panel').hidden = !['stopping', 'mechanism'].includes(workspace); $('evidence-panel').hidden = workspace !== 'evidence';
  robot.visible = workspace === 'assembly'; field.visible = workspace === 'assembly'; studyGroup.visible = workspace === 'mechanism';
  if (workspace === 'stopping' || workspace === 'mechanism') { resetStudy(); updateStudy(); setView('study'); }
  else if (workspace === 'assembly') { resetDrive(); setView('hero'); }
  updateHud();
}
function addOption(id, value, label) { const o = document.createElement('option'); o.value = value; o.textContent = label; $(id).append(o); }
function buildEvidence() {
  const entries = [
    ['What survived', 'All earlier HTML studios, source archives, calculations, handoffs and the pre-repair v6 backup remain on disk. The current project is now under local Git; earlier file states are not retroactively recoverable as Git commits.'],
    ['Rules and field', 'Kimi-era multi-model document review established the V3 scoring and field baseline. V3 gives 390 nominal robot points plus 10 publicity. Official Discord Q&A remains unreviewed; flag, pit, parking, obstacle and envelope questions are not settled.'],
    ['Navigation', 'Earlier planners exposed pinch-zone and pit-access problems. Their successful cases are conditional geometric studies—not legal routes, robust autonomy or physical results. The v8 drive is deliberately labeled an illustration.'],
    ['Vendor CAD', 'Claude v7 added valuable measured Pololu geometry: 7 mm shaft offset, 202 mm stock track and a 7.09 mm support mismatch in the kit-as-drawn. These are CAD findings, not caliper measurements of received parts.'],
    ['Stopping', 'v6.1 retains 56 selected-motor trajectories and two conflicting motor-loss assumptions. Neither matches every manufacturer point. Their spread is not a confidence bound; the 176 mm track must be corrected in a future dynamics revision.'],
    ['Mechanism', 'All 162 cases / 2,970 frames are retained. The old three-tine recommendation is not a selected winner: passive fork, guided bore and OD gripper all require physical acquisition and retention trials.'],
    ['Perception and software', 'AprilTag 3 decoded tagStandard41h12 IDs 1–3; OpenCV ArUco has no 41h12 dictionary. The 13-test match-logic reference and synthetic perception study have not run on a robot.'],
    ['Next engineering gate', 'Choose and measure the mule geometry; regenerate dynamics with one canonical assembly; build a legal-envelope competition mockup; test the real tire mechanism and closed-loop navigation. Do not start by making another isolated viewer.'],
  ];
  for (const [title, text] of entries) { const e = document.createElement('div'); e.className = 'evidence'; const b = document.createElement('b'), p = document.createElement('p'); b.textContent = title; p.textContent = text; e.append(b, p); $('evidence-panel').append(e); }
}
function buildUI() {
  for (const c of CONFIGS) addOption('config', c.id, c.label); $('config').value = current.id;
  for (const s of D.stoppingConfig.scenarios) addOption('scenario', s.id, s.id);
  for (const m of D.stopping.model_variants) addOption('model', m.id, m.id === 'reciprocal-speed-fit' ? 'Speed fit · published I₀ conflict' : 'No-load-loss sensitivity · speed conflict');
  for (const m of D.stoppingConfig.modes) addOption('mode', m, m); $('mode').value = mode;
  D.mechanism.cases.forEach((c, i) => addOption('case', String(i), `${c.concept_id} · ${c.orientation} · ${c.tolerance_id} · ${c.offset_mm} mm / ${c.yaw_deg}°`));
  for (const [id, v] of Object.entries(VIEWS)) { const b = document.createElement('button'); b.textContent = v.title; b.dataset.view = id; b.onclick = () => setView(id); $('views').append(b); }
  for (const [id, info] of Object.entries(PART_INFO)) { const el = document.createElement('div'); el.className = 'part'; el.dataset.id = id; el.tabIndex = 0; const n = document.createElement('span'), badge = document.createElement('span'), s = document.createElement('span'); n.textContent = info.name; badge.className = `badge b-${info.badge}`; badge.textContent = { cad: 'Vendor CAD', dim: 'From dimensions', approx: 'Approximate' }[info.badge]; s.className = 's'; s.textContent = info.note.slice(0, 100); el.append(n, badge, s); el.onclick = () => select(id, true); el.onkeydown = (e) => { if (e.key === 'Enter') select(id, true); }; $('parts').append(el); }
  $('config').onchange = (e) => applyConfig(CONFIGS.find((c) => c.id === e.target.value));
  $('tag').onchange = (e) => { setAssigned(Number(e.target.value)); resetDrive(); };
  $('play').onclick = () => { sim.started = true; sim.paused = !sim.paused; $('play').textContent = sim.paused ? 'Resume illustration' : 'Pause illustration'; };
  $('reset').onclick = () => { resetDrive(); $('play').textContent = 'Start illustration'; };
  document.querySelectorAll('[data-workspace]').forEach((b) => b.onclick = () => setWorkspace(b.dataset.workspace));
  for (const [id, fn] of [['scenario', (v) => scenario = v], ['model', (v) => modelVariant = v], ['mode', (v) => mode = v], ['case', (v) => caseIndex = Number(v)]]) $(id).onchange = (e) => { fn(e.target.value); resetStudy(); updateStudy(); };
  for (const id of ['proxies', 'swept']) $(id).onchange = updateStudy;
  const seek = (i) => { studyPlaying = false; $('study-play').textContent = 'Play'; studyIndex = Math.max(0, Math.min(studyCount() - 1, i)); studyClock = studyIndex; updateStudy(); };
  $('timeline').oninput = (e) => seek(Number(e.target.value)); $('back').onclick = () => seek(studyIndex - 1); $('next').onclick = () => seek(studyIndex + 1); $('restart').onclick = () => seek(0);
  $('study-play').onclick = () => { studyPlaying = !studyPlaying; if (studyIndex === studyCount() - 1 && studyPlaying) studyIndex = 0; studyClock = studyIndex; $('study-play').textContent = studyPlaying ? 'Pause' : 'Play'; };
  buildEvidence();
}
function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
window.addEventListener('resize', resize);
const clock = new THREE.Clock(); let acc = 0, studyAcc = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (workspace === 'assembly' && sim.started && !sim.paused) { acc += dt * Number($('speed').value); while (acc >= 1 / 240) { stepSim(1 / 240); acc -= 1 / 240; } }
  if (studyPlaying && ['stopping', 'mechanism'].includes(workspace)) { studyAcc += dt * (workspace === 'stopping' ? 30 : 6); const next = Math.min(studyCount() - 1, Math.floor(studyClock + studyAcc)); if (next !== studyIndex) { studyIndex = next; updateStudy(); } studyClock += studyAcc; studyAcc = 0; if (studyIndex === studyCount() - 1) { studyPlaying = false; $('study-play').textContent = 'Play'; } }
  spin.right.rotation.z = -sim.theta.right; spin.left.rotation.z = sim.theta.left;
  if (follow && workspace === 'assembly') { const back = new THREE.Vector3(-0.42, 0.24, 0.12); robot.localToWorld(back); camera.position.lerp(back, 0.08); controls.target.lerp(robot.position.clone().add(new THREE.Vector3(0, 0.05, 0)), 0.15); }
  controls.update(); renderer.render(scene, camera); updateHud();
  if (params.get('validate') === '1') setTimeout(frame, 0);
  else requestAnimationFrame(frame);
}
async function main() {
  for (const id of ['motor', 'bracket', 'hub', 'wheel', 'caster']) parts[id] = await loadPart(id);
  catalogue(); buildField(); buildTire(); setAssigned(Number(params.get('tag') || 2)); buildUI(); applyConfig(current); resize();
  setWorkspace(['assembly', 'stopping', 'mechanism', 'evidence'].includes(params.get('workspace')) ? params.get('workspace') : 'assembly');
  setView(params.get('view') || (workspace === 'assembly' ? 'hero' : 'study'));
  if (params.get('panels') === '0') for (const id of ['left', 'right', 'hud']) $(id).style.display = 'none';
  const t = Number(params.get('t') || 0); if (t > 0 && workspace === 'assembly' && !$('play').disabled) { sim.started = true; for (let i = 0; i < t * 240; i++) stepSim(1 / 240); sim.paused = true; }
  if (params.get('case')) { caseIndex = Math.max(0, Math.min(D.mechanism.cases.length - 1, Number(params.get('case')))); $('case').value = String(caseIndex); resetStudy(); updateStudy(); }
  if (params.get('sample')) { studyIndex = Math.max(0, Math.min(studyCount() - 1, Number(params.get('sample')))); updateStudy(); }
  document.body.dataset.ready = 'true'; requestAnimationFrame(frame);
}
globalThis.robotStudioV8 = {
  getDiagnostics: () => ({ workspace, ready: document.body.dataset.ready === 'true', config: current.id, caseIndex, studyIndex, scenario, mode, modelVariant, stoppingRuns: D.stopping.runs.length, mechanismCases: D.mechanism.cases.length, trackMm: A.assembly.lateral_stack_mm.track, historicalTrackMm: D.stoppingConfig.vehicle.track_m * 1000, meshes: renderer.info.render, finite: [...robot.position, ...studyGroup.position].every(Number.isFinite) }),
  setWorkspace, selectCase: (i, sample = 0) => { setWorkspace('mechanism'); caseIndex = i; $('case').value = String(i); resetStudy(); studyIndex = sample; updateStudy(); },
  selectStopping: (s, m, v, i = 0) => { setWorkspace('stopping'); scenario = s; mode = m; modelVariant = v; $('scenario').value = s; $('mode').value = m; $('model').value = v; resetStudy(); studyIndex = i; updateStudy(); },
};
main().catch((e) => { console.error(e); document.body.dataset.error = String(e); });
