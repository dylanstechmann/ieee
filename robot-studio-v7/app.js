// Robot Studio v7: the Order A mule from Pololu's own CAD on the GM2 V3 field.
// Agent-built visualization. Vendor geometry and measured assembly transforms come
// from derived/robot-studio-v7/assembly.json; finishes are chosen to match product
// photos, not measured. The drive is a kinematic, illustrative path.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const D = globalThis.STUDIO_DATA;
const IN = 0.0254;
const MM = 0.001;
const params = new URLSearchParams(location.search);
const hashName = location.hash.replace('#', '');
const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
const fieldPos = (x, y, h = 0) => new THREE.Vector3((x - 48) * IN, h * IN, -(y - 24) * IN);

// ---------- renderer, scene, lights ----------
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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
const camera = new THREE.PerspectiveCamera(38, 1, 0.004, 40);
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

// ---------- materials and procedural textures ----------
const phys = (o) => new THREE.MeshPhysicalMaterial(o);
function canvasTexture(w, h, draw, { nearest = false, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (nearest) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; }
  t.anisotropy = 8;
  return t;
}
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const plyTex = canvasTexture(512, 64, (g, w, h) => {
  const plies = ['#c9a878', '#b58e5c', '#cfae80', '#a98252', '#c39f6f'];
  plies.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, (i * h) / 5, w, h / 5 + 1); });
  for (let i = 0; i < 900; i += 1) { g.fillStyle = `rgba(70,45,20,${0.05 + rand() * 0.08})`; g.fillRect(rand() * w, rand() * h, 6 + rand() * 30, 1); }
});
const deckTex = canvasTexture(256, 256, (g, w, h) => {
  g.fillStyle = '#3a3d41';
  g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(255,255,255,${0.025 + 0.02 * (y % 4 === 0)})`; g.fillRect(0, y, w, 1); }
});
deckTex.wrapS = deckTex.wrapT = THREE.RepeatWrapping;
deckTex.repeat.set(3, 3);
const M = {
  paintBlack: phys({ color: '#0d0e0f', roughness: 0.86 }),
  paintWhite: phys({ color: '#eeeeea', roughness: 0.74 }),
  paintGray: phys({ color: '#c4c9c8', roughness: 0.8 }), // PPG1036-2 Winter Chill, approximated
  ply: phys({ map: plyTex, roughness: 0.9 }),
  floor: phys({ color: '#80878b', roughness: 0.95 }),
  aluminumBlasted: phys({ color: '#d0d4d7', metalness: 1, roughness: 0.42 }),
  aluminumMachined: phys({ color: '#d9dcdf', metalness: 1, roughness: 0.26 }),
  steelDark: phys({ color: '#5d6166', metalness: 1, roughness: 0.38 }),
  chrome: phys({ color: '#eceef0', metalness: 1, roughness: 0.05 }),
  blackPlastic: phys({ color: '#141516', roughness: 0.5 }),
  silicone: phys({ color: '#121213', roughness: 0.93 }),
  pla: phys({ map: deckTex, roughness: 0.62 }),
  plaRiser: phys({ color: '#2f6f9f', roughness: 0.6 }),
  tpuBlue: phys({ color: '#2d63d4', roughness: 0.55, clearcoat: 0.25 }),
  flagGreen: phys({ color: '#159447', roughness: 0.85, side: THREE.DoubleSide }),
  dowel: phys({ color: '#d8c39a', roughness: 0.7 }),
};

// ---------- field ----------
const field = new THREE.Group();
scene.add(field);
const flat = (pts, material, lift = 0.0002) => {
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2((x - 48) * IN, (y - 24) * IN)));
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s), material);
  m.rotation.x = -Math.PI / 2;
  m.position.y = lift;
  m.receiveShadow = true;
  return m;
};
const box = (w, h, d, material, x, y, z) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w * IN, h * IN, d * IN), material);
  m.position.copy(fieldPos(x, y, z));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};
function tag(meshOrGroup, id, info) { meshOrGroup.traverse((o) => { o.userData.partId = id; }); PART_INFO[id] = info; return meshOrGroup; }
const PART_INFO = {};
const LAYOUT = D.layout;
const lay = Object.fromEntries(LAYOUT.features.map((f) => [f.id, f]));
const DIV_Y = lay.center_divider_axis.vertices_in[0][1];
const DIV_X0 = lay.center_divider_axis.vertices_in[0][0];
const DIV_X1 = lay.center_divider_axis.vertices_in[1][0];
const OCT_CX = (DIV_X0 + DIV_X1) / 2;

function buildField() {
  const t = 23 / 32;
  const board = new THREE.Mesh(new THREE.BoxGeometry(96 * IN, t * IN, 48 * IN), [M.ply, M.ply, M.paintBlack, M.ply, M.ply, M.ply]);
  board.position.y = (-t * IN) / 2;
  board.receiveShadow = true;
  field.add(tag(board, 'board', { name: 'Field base, 23/32 in sheathing 4 × 8 ft, painted black (PPG1011-7)', badge: 'dim', note: 'GM2 V3 §3.2 and Appendix B.' }));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), M.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -t * IN - 0.0005;
  floor.receiveShadow = true;
  scene.add(floor);
  const white = new THREE.Group();
  for (const id of ['pit_box_1', 'pit_box_2', 'pit_box_3', 'start_box']) white.add(flat(lay[id].vertices_in, M.paintWhite));
  // Octagonal white center line from the drawing callouts (12.25 flat, 36.75 sides, 9.75 chamfers), 1 in wide.
  const oct = (d) => {
    const k = Math.SQRT2 - 1, a = 18.375 + d * k, b = 6.125 + d * k, X = 25.269 + d, Y = 13.019 + d;
    return [[a, -Y], [X, -b], [X, b], [a, Y], [-a, Y], [-X, b], [-X, -b], [-a, -Y]].map(([x, y]) => [OCT_CX + x, DIV_Y + y]);
  };
  const outer = new THREE.Shape(oct(0.5).map(([x, y]) => new THREE.Vector2((x - 48) * IN, (y - 24) * IN)));
  outer.holes.push(new THREE.Path(oct(-0.5).reverse().map(([x, y]) => new THREE.Vector2((x - 48) * IN, (y - 24) * IN))));
  const line = new THREE.Mesh(new THREE.ShapeGeometry(outer), M.paintWhite);
  line.rotation.x = -Math.PI / 2;
  line.position.y = 0.0002;
  line.receiveShadow = true;
  white.add(line);
  field.add(tag(white, 'white', { name: 'White paint: center line (1 in), pit boxes, start box', badge: 'dim', note: 'Octagon from the V3 drawing callouts, centred on the divider; box positions from the project layout (derived/constrained-field-v3).' }));
  const checker = (y0, y1) => {
    const len = y1 - y0;
    const tex = canvasTexture(64, Math.round(len * 32), () => {}, { nearest: true });
    const g = tex.image.getContext('2d');
    for (let r = 0; r < Math.ceil(len); r += 1) for (let c = 0; c < 2; c += 1) { g.fillStyle = (c + r) % 2 ? '#f4f4f1' : '#0c0c0c'; g.fillRect(c * 32, r * 32, 32, 32); }
    tex.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * IN, len * IN), phys({ map: tex, roughness: 0.45, clearcoat: 0.3 }));
    m.rotation.x = -Math.PI / 2;
    m.position.copy(fieldPos(28, (y0 + y1) / 2, 0.012));
    m.receiveShadow = true;
    return m;
  };
  const pd = lay.pit_divider_axis.vertices_in;
  const checkers = new THREE.Group();
  checkers.add(checker(0.75, pd[0][1]), checker(pd[1][1], 47.25));
  field.add(tag(checkers, 'checker', { name: 'Checkered start/finish tape in both openings', badge: 'approx', note: 'Openings ~15 in each side of the pit divider; tape width and square size are approximate.' }));
  const walls = new THREE.Group();
  walls.add(box(96, 3.5, 0.75, M.paintGray, 48, 0.375, 1.75), box(96, 3.5, 0.75, M.paintGray, 48, 47.625, 1.75));
  walls.add(box(0.75, 3.5, 46.5, M.paintGray, 0.375, 24, 1.75), box(0.75, 3.5, 46.5, M.paintGray, 95.625, 24, 1.75));
  field.add(tag(walls, 'walls', { name: 'Side walls: 1 × 4 on edge, gray (PPG1036-2)', badge: 'approx', note: 'Height assumes nominal lumber on edge (3.5 in); mounted inside the 96 × 48 in base (unresolved in GM2 V3).' }));
  const dividers = new THREE.Group();
  dividers.add(box(36, 1.5, 0.75, M.paintGray, OCT_CX, DIV_Y, 0.75));
  dividers.add(box(0.75, 0.75, 16, M.paintGray, 28, (pd[0][1] + pd[1][1]) / 2, 0.375));
  field.add(tag(dividers, 'dividers', { name: 'Center divider 1 × 2 × 36 in and pit divider 1 × 1 × 16 in', badge: 'approx', note: 'On-edge heights (1.5 in, 0.75 in) assume nominal lumber.' }));
  buildTower();
  buildCars();
}

// ---------- tower, AprilTag and start flag (positions approximate) ----------
const tagMat = phys({ roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08 });
function setTag(id) {
  const bits = D.tagBits[id];
  tagMat.map = canvasTexture(11 * 16, 11 * 16, (g) => {
    g.fillStyle = '#f2f2ef';
    g.fillRect(0, 0, 176, 176);
    g.fillStyle = '#101010';
    bits.forEach((row, r) => row.forEach((b, c) => { if (b) g.fillRect((c + 1) * 16, (r + 1) * 16, 16, 16); }));
  }, { nearest: true });
  tagMat.needsUpdate = true;
}
const flagPivot = new THREE.Group();
let cloth;
function buildTower() {
  const tower = new THREE.Group();
  tower.add(box(0.75, 6, 4, M.paintGray, 26.9, 30, 3));
  const side = 68 * MM * (11 / 9);
  const tagMesh = new THREE.Mesh(new THREE.PlaneGeometry(side, side), tagMat);
  tagMesh.position.copy(fieldPos(26.9 - 0.38, 30, 2.6));
  tagMesh.rotation.y = -Math.PI / 2;
  tagMesh.receiveShadow = true;
  tower.add(tag(tagMesh, 'apriltag', { name: 'AprilTag tagStandard41h12 (laminated)', badge: 'approx', note: 'Exact bit pattern decoded from the organizer sheet; mount position and height are not dimensioned in GM2 V3. Pose estimates must use the inner 5-cell edge (37.8 mm if 68 mm is the full print).' }));
  flagPivot.position.copy(fieldPos(27.45, 30, 6)); // hinge on the racecourse side, clear of the tag
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * IN, 0.12 * IN, 5 * IN, 12), M.dowel);
  rod.position.y = 2.5 * IN;
  rod.castShadow = true;
  const cg = new THREE.PlaneGeometry(3.6 * IN, 2.6 * IN, 12, 6);
  cg.translate(1.8 * IN + 0.12 * IN, 0, 0);
  cloth = new THREE.Mesh(cg, M.flagGreen);
  cloth.userData.base = Float32Array.from(cg.attributes.position.array);
  cloth.position.y = 3.6 * IN;
  cloth.rotation.y = -Math.PI / 2; // flies over the pit divider, away from the opening
  cloth.castShadow = true;
  flagPivot.add(rod, cloth);
  flagPivot.rotation.z = Math.PI; // down
  tower.add(flagPivot);
  field.add(tag(tower, 'tower', { name: 'Wall tower with green start flag', badge: 'approx', note: 'GM2 V3 §3.3 places it on the wall between the pit area and racecourse; size, height and position here are assumptions. The referee raises the flag to start (§3.4.2).' }));
}

// ---------- toy cars (approximate: models and sizes are not published) ----------
const CARS = [
  { q: 'Q3 upper straightaway, outer lane', x: OCT_CX - 10, y: 42.2, color: '#2b5fd9' },
  { q: 'Q2 lower straightaway, inner lane', x: OCT_CX + 10, y: 17.4, color: '#f08a24' },
  { q: 'Q1 lower straightaway, outer lane', x: OCT_CX - 10, y: 5.9, color: '#d6332e' },
];
function toyCar(color) {
  const g = new THREE.Group();
  const paint = phys({ color, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.2 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(4.6 * IN, 1.7 * IN, 3.0 * IN, 4, 0.55 * IN), paint);
  body.position.y = 1.35 * IN;
  const cab = new THREE.Mesh(new RoundedBoxGeometry(2.5 * IN, 1.4 * IN, 2.6 * IN, 4, 0.5 * IN), paint);
  cab.position.set(-0.35 * IN, 2.6 * IN, 0);
  const glass = new THREE.Mesh(new RoundedBoxGeometry(2.3 * IN, 0.9 * IN, 2.66 * IN, 3, 0.3 * IN), phys({ color: '#1d2a33', roughness: 0.08, metalness: 0.2 }));
  glass.position.set(-0.35 * IN, 2.72 * IN, 0);
  g.add(body, cab, glass);
  const tireMat = phys({ color: '#f1f1ee', roughness: 0.6 });
  for (const [x, z] of [[1.45, 1.35], [1.45, -1.35], [-1.45, 1.35], [-1.45, -1.35]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.72 * IN, 0.72 * IN, 0.6 * IN, 24), tireMat);
    w.rotation.x = Math.PI / 2;
    w.position.set(x * IN, 0.72 * IN, z * IN);
    g.add(w);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
function buildCars() {
  const cars = new THREE.Group();
  CARS.forEach((c) => { const car = toyCar(c.color); car.position.copy(fieldPos(c.x, c.y)); cars.add(car); });
  field.add(tag(cars, 'cars', { name: 'Toy-car obstacles (example placement)', badge: 'approx', note: 'GM2 V3 places three cars in four 16 × 16 in quadrants, in different lanes. Car models and sizes are not published; these are stand-ins.' }));
}

// ---------- spare tire from the organizer STL ----------
const tireGroup = new THREE.Group();
function buildTire() {
  const geo = new STLLoader().parse(bytes(D.tireStl));
  geo.scale(MM, MM, MM);
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  geo.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, M.tpuBlue);
  m.castShadow = true;
  m.receiveShadow = true;
  tireGroup.add(tag(m, 'tire', { name: 'Blue spare tire (organizer STL, TPU)', badge: 'cad', note: `Organizer "Spare Tire v2.stl": 68.2 mm OD, 40.3 mm bore, 27.6 mm thick. Shown lying flat in the assigned box (orientation not specified in GM2). SHA-256 ${D.tireSha256.slice(0, 12)}…` }));
  field.add(tireGroup);
}
function placeTire(boxId) {
  const v = lay[`pit_box_${boxId}`].vertices_in;
  tireGroup.position.copy(fieldPos((v[0][0] + v[2][0]) / 2 - 4, (v[0][1] + v[2][1]) / 2 - 4, 0)); // corner, clear of the parked mule
}

// ---------- robot from vendor CAD ----------
const A = D.assembly;
const meas = A.measurements;
const robot = new THREE.Group();
const body = new THREE.Group();
robot.add(body);
scene.add(robot);
const spin = { right: new THREE.Group(), left: new THREE.Group() };
let parts = {};
const PART_META = Object.fromEntries(D.partsMeta.map((p) => [p.id, p]));
const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
function finishFor(partId, color) {
  if (partId === 'bracket') return M.aluminumBlasted;
  if (partId === 'hub') return M.aluminumMachined;
  if (partId === 'wheel') return lum(color) > 0.02 ? M.blackPlastic : M.silicone;
  if (partId === 'caster') return lum(color) > 0.5 ? M.chrome : M.blackPlastic;
  const hsl = color.getHSL({});
  if (hsl.s > 0.45 && hsl.l > 0.08) {
    if (Math.abs(hsl.h - 0.33) < 0.08 && hsl.l < 0.35) return phys({ color: '#1e6a31', roughness: 0.42, clearcoat: 0.4 }); // FR-4 board
    if (hsl.h > 0.06 && hsl.h < 0.12) return phys({ color: '#c8873a', metalness: 1, roughness: 0.32 }); // brass/copper terminals
    return phys({ color: color.clone(), roughness: 0.35, clearcoat: 0.5 }); // wire insulation and connectors
  }
  if (lum(color) > 0.35) return phys({ color: color.clone().lerp(new THREE.Color('#c9cdd2'), 0.6), metalness: 1, roughness: 0.3 });
  if (lum(color) > 0.08) return phys({ color: color.clone().lerp(new THREE.Color('#8b8782'), 0.5), metalness: 0.95, roughness: 0.4 });
  return phys({ color: '#161718', roughness: 0.48 });
}
async function loadPart(id) {
  const gltf = await new GLTFLoader().parseAsync(bytes(D.parts[id]), '');
  gltf.scene.traverse((o) => {
    if (o.isMesh) {
      o.material = finishFor(id, o.material.color || new THREE.Color('#888'));
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return gltf.scene;
}
const mat4 = (rows) => new THREE.Matrix4().set(...rows.flat());
const place = (obj, m) => { obj.matrixAutoUpdate = false; obj.matrix.copy(m); return obj; };
const MIRROR = new THREE.Matrix4().makeRotationY(Math.PI);

function instance(id, matrix, label) {
  const holder = new THREE.Group();
  holder.add(place(parts[id].clone(true), matrix));
  holder.traverse((o) => { o.userData.partId = label; });
  return holder;
}
function buildRobot(cfg) {
  body.clear();
  spin.right.clear();
  spin.left.clear();
  const mm = (v) => v * MM;
  const kit = cfg.id === 'kit-as-drawn';
  const gch = mm(cfg.gearbox_center_height_mm);
  const axle = mm(cfg.axle_height_mm);
  const up = cfg.shaft_direction === 'up' ? -1 : 1;
  const [mgx, mgy] = meas.motor.gearbox_center_xy.map(mm);
  const mface = mm(meas.motor.gearbox_face_z);
  const stack = A.assembly.lateral_stack_mm;
  const faceY = mm(stack.gearbox_face);
  const motorM = mat4([[up, 0, 0, -up * mgx], [0, up, 0, -up * mgy + gch], [0, 0, 1, faceY - mface], [0, 0, 0, 1]]);
  const [bgx, bgy] = meas.bracket.gearbox_center_xy.map(mm);
  const bz0 = mm(meas.bracket.z_range[0]);
  const bracketM = mat4([[1, 0, 0, -bgx], [0, 1, 0, -bgy + gch], [0, 0, 1, faceY - bz0], [0, 0, 0, 1]]);
  const hubM = mat4([[1, 0, 0, 0], [0, -1, 0, 0], [0, 0, -1, mm(stack.hub_flange_face + meas.hub.z_range[0])], [0, 0, 0, 1]]);
  const wheelM = mat4([[0, 0, 1, 0], [0, 1, 0, 0], [-1, 0, 0, mm(stack.wheel_center)], [0, 0, 0, 1]]);
  for (const side of ['right', 'left']) {
    const S = side === 'right' ? new THREE.Matrix4() : MIRROR;
    body.add(instance('motor', S.clone().multiply(motorM), 'motor'));
    body.add(instance('bracket', S.clone().multiply(bracketM), 'bracket'));
    const sg = spin[side];
    sg.position.set(0, axle, 0);
    const holder = new THREE.Group();
    place(holder, S);
    holder.add(sg);
    sg.add(instance('hub', hubM, 'hub'), instance('wheel', wheelM, 'wheel'));
    body.add(holder);
  }
  // Deck: kit as drawn is 160 mm wide with motor holes at the gearbox face; corrected layouts use the
  // measured tapped-hole plane and a proposed 172 mm width.
  const width = kit ? KIT.deck.width_mm : 172;
  const holeZ = kit ? A.assembly.kit_nominal_mm.drill_template_motor_hole_lateral : A.assembly.kit_nominal_mm.bracket_tapped_hole_lateral_from_cad;
  const L = KIT.deck.length_mm;
  const shape = new THREE.Shape();
  shape.moveTo(mm(-L / 2), mm(-width / 2)); shape.lineTo(mm(L / 2), mm(-width / 2)); shape.lineTo(mm(L / 2), mm(width / 2)); shape.lineTo(mm(-L / 2), mm(width / 2)); shape.closePath();
  const hole = (x, z, d) => { const p = new THREE.Path(); p.absarc(mm(x), mm(-z), mm(d / 2), 0, Math.PI * 2, true); shape.holes.push(p); };
  for (const z of [holeZ, -holeZ]) for (const x of [-14.8, 0, 14.8]) hole(x, z, KIT.deck.motor_hole_diameter_mm);
  for (const x of KIT.caster.positions_x_mm) {
    for (const z of [-KIT.caster.mount_hole_spacing_mm / 2, KIT.caster.mount_hole_spacing_mm / 2]) hole(x, z, KIT.deck.caster_hole_diameter_mm);
    if (cfg.caster_mode === 'through-deck') hole(x, 0, 14.5);
  }
  const deckGeo = new THREE.ExtrudeGeometry(shape, { depth: mm(KIT.deck.thickness_mm), bevelEnabled: true, bevelSize: mm(0.6), bevelThickness: mm(0.6), bevelSegments: 2, curveSegments: 24 });
  deckGeo.rotateX(-Math.PI / 2);
  const deck = new THREE.Mesh(deckGeo, M.pla);
  deck.position.y = mm(cfg.deck_top_mm - KIT.deck.thickness_mm);
  deck.castShadow = true;
  deck.receiveShadow = true;
  deck.userData.partId = 'deck';
  body.add(deck);
  const screws = new THREE.Group();
  for (const z of [holeZ, -holeZ]) for (const x of [-14.8, 0, 14.8]) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(mm(2.75), mm(2.75), mm(3), 20), M.steelDark);
    s.position.set(mm(x), mm(cfg.deck_top_mm - KIT.deck.thickness_mm - 1.5), mm(z));
    s.castShadow = true;
    screws.add(s);
  }
  screws.traverse((o) => { o.userData.partId = 'screws'; });
  body.add(screws);
  const czmin = mm(meas.caster.ball_bottom_z);
  for (const x of KIT.caster.positions_x_mm) {
    const casterM = mat4([[0, 1, 0, mm(x)], [0, 0, 1, mm(cfg.caster_ball_bottom_mm) - czmin], [1, 0, 0, 0], [0, 0, 0, 1]]);
    body.add(instance('caster', casterM, 'caster'));
    if (cfg.caster_mode !== 'through-deck') {
      const top = cfg.deck_top_mm - KIT.deck.thickness_mm;
      if (cfg.caster_riser_mm > 0) {
        const r = new THREE.Mesh(new THREE.BoxGeometry(mm(17), mm(cfg.caster_riser_mm), mm(24)), M.plaRiser);
        r.position.set(mm(x), mm(top - cfg.caster_riser_mm / 2), 0);
        r.castShadow = true;
        r.userData.partId = 'riser';
        body.add(r);
      }
      const sp = new THREE.Mesh(new THREE.BoxGeometry(mm(15.2), mm(cfg.caster_spacer_mm), mm(20.3)), M.blackPlastic);
      sp.position.set(mm(x), mm(top - cfg.caster_riser_mm - cfg.caster_spacer_mm / 2), 0);
      sp.userData.partId = 'caster';
      body.add(sp);
    }
  }
  body.position.y = mm(-Math.min(cfg.wheel_bottom_mm, cfg.caster_ball_bottom_mm));
  const gap = cfg.wheel_bottom_mm - cfg.caster_ball_bottom_mm;
  if (gap > 0.5) { // wheels clear of the floor: show the gap under each wheel
    const red = phys({ color: '#ff5a3c', transparent: true, opacity: 0.55, roughness: 0.6 });
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (g) => {
      g.fillStyle = 'rgba(20,20,20,0.85)'; g.fillRect(0, 0, 256, 64);
      g.fillStyle = '#ffffff'; g.font = '600 30px sans-serif'; g.fillText(`${gap.toFixed(2)} mm gap`, 18, 43);
    }), depthTest: false }));
    label.scale.set(0.05, 0.0125, 1);
    for (const z of [stack.wheel_center, -stack.wheel_center]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(mm(26), mm(gap), mm(12)), red);
      m.position.set(0, mm(cfg.wheel_bottom_mm - gap / 2), mm(z));
      body.add(m);
    }
    label.position.set(0, mm(cfg.wheel_bottom_mm + 18), mm(stack.wheel_center + 14));
    body.add(label);
  }
  const half = mm(stack.wheel_center);
  return { half, radius: mm(meas.wheel.outer_diameter / 2) };
}
const KIT = D.kit;

// ---------- part catalogue for the panel ----------
function catalogue() {
  const cad = (id, extra) => {
    const p = PART_META[id];
    return { name: `${p.name} (#${p.sku}) × 2`, badge: 'cad', note: `${extra} Pololu STEP ${p.step.split('/').pop()}, SHA-256 ${p.step_sha256.slice(0, 12)}…; ${p.triangles.toLocaleString()} triangles at ${p.tessellation_tolerance_mm} mm tolerance; ${p.size_mm.join(' × ')} mm.` };
  };
  Object.assign(PART_INFO, {
    motor: cad('motor', `Output shaft measured ${meas.motor.shaft_offset} mm off the gearbox centre; face to encoder end ${meas.motor.body_length_face_to_encoder_end} mm.`),
    bracket: cad('bracket', `Gearbox centre ${meas.bracket.gearbox_center_above_mount_face} mm above the mounting edge; slot runs perpendicular to it; tapped M3 holes ${meas.bracket.tapped_hole_depth_from_motor_side_face} mm from the motor-side face.`),
    hub: cad('hub', `Flange Ø${meas.hub.flange_radius * 2} mm, collar Ø${meas.hub.collar_radius * 2} mm, 6 mm bore; flange face flush with the shaft tip.`),
    wheel: cad('wheel', `Ø${meas.wheel.outer_diameter} mm, silicone tire; flat face bolted to the hub flange puts the wheel centre ${A.assembly.lateral_stack_mm.wheel_center} mm from centre (track ${A.assembly.lateral_stack_mm.track} mm; the kit assumed ${A.assembly.kit_nominal_mm.track}).`),
    caster: cad('caster', `Height ${meas.caster.height} mm from mounting face to ball bottom.`),
    deck: { name: 'Printed deck, 190 mm long × 5 mm', badge: 'dim', note: 'Kit-as-drawn: 160 mm wide, motor holes at the gearbox face plane (±74 mm). Corrected layouts: proposed 172 mm width, holes at the measured tapped-hole plane (±77.25 mm). Material and process not selected.' },
    screws: { name: 'M3 socket screws into the bracket tapped holes', badge: 'dim', note: 'Simplified heads; lengths not selected.' },
    riser: { name: 'Printed caster risers (proposed)', badge: 'dim', note: 'Shaft-down layout only: 6.91 mm blocks plus the kit 1/8 in spacer bring the caster balls to the floor.' },
  });
}

// ---------- UI ----------
const $ = (id) => document.getElementById(id);
const CONFIGS = A.assembly.configurations;
let current = CONFIGS.find((c) => c.id === (params.get('config') || (['kit', 'up', 'down'].includes(hashName) ? { kit: 'kit-as-drawn', up: 'shaft-up', down: 'shaft-down' }[hashName] : 'shaft-down'))) || CONFIGS[2];
let geom = null;
function statusText(c) {
  if (c.wheel_lift_above_casters_mm > 0.5) return [`Drive wheels sit ${c.wheel_lift_above_casters_mm.toFixed(2)} mm above the floor: the robot rests on its casters and cannot drive. Cause: the 7.0 mm shaft offset.`, true];
  if (c.wheel_lift_above_casters_mm < -0.5) return [`Wheels on the floor; caster balls ${(-c.wheel_lift_above_casters_mm).toFixed(2)} mm clear (slight fore/aft rocking). Deck top ${c.deck_top_mm} mm, casters through the deck.`, false];
  return [`Wheels and casters both touch (${c.wheel_lift_above_casters_mm.toFixed(2)} mm). Deck top ${c.deck_top_mm} mm, ${c.caster_riser_mm} mm printed risers plus the kit 1/8 in spacer.`, false];
}
function applyConfig(c) {
  current = c;
  geom = buildRobot(c);
  const [text, bad] = statusText(c);
  $('config-status').textContent = text;
  $('config-status').classList.toggle('bad', bad);
  $('play').disabled = bad;
  resetDrive();
}
function buildUI() {
  for (const c of CONFIGS) { const o = document.createElement('option'); o.value = c.id; o.textContent = c.label; $('config').append(o); }
  $('config').value = current.id;
  $('config').addEventListener('change', (e) => {
    applyConfig(CONFIGS.find((c) => c.id === e.target.value));
    if (e.target.value === 'kit-as-drawn') setView('contact');
  });
  for (const [id, label] of Object.entries(VIEWS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label.title;
    b.dataset.view = id;
    b.addEventListener('click', () => setView(id));
    $('views').append(b);
  }
  $('play').addEventListener('click', () => { if (!sim.started) startMatch(); else sim.paused = !sim.paused; updatePlay(); });
  $('reset').addEventListener('click', () => { resetDrive(); updatePlay(); });
  $('tag').addEventListener('change', (e) => { setAssigned(Number(e.target.value)); resetDrive(); });
  const order = ['motor', 'bracket', 'hub', 'wheel', 'caster', 'deck', 'screws', 'riser', 'tire', 'apriltag', 'board', 'white', 'walls', 'dividers', 'checker', 'tower', 'cars'];
  for (const id of order) {
    const info = PART_INFO[id];
    if (!info) continue;
    const el = document.createElement('div');
    el.className = 'part';
    el.dataset.id = id;
    el.tabIndex = 0;
    el.innerHTML = `<span class="n"></span><span class="badge b-${info.badge}">${{ cad: 'Vendor CAD', dim: 'From dimensions', approx: 'Approximate' }[info.badge]}</span><span class="s"></span>`;
    el.querySelector('.n').textContent = info.name;
    el.addEventListener('click', () => select(id, true));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') select(id, true); });
    $('parts').append(el);
  }
}
function updatePlay() { $('play').textContent = !sim.started ? 'Start match' : sim.paused ? 'Resume' : 'Pause'; }

let outline = null; // Box3Helper around the selected part (world-space box, refreshed per selection)
function select(id, focus) {
  document.querySelectorAll('.part').forEach((el) => el.classList.toggle('sel', el.dataset.id === id));
  const info = PART_INFO[id];
  $('detail').innerHTML = '';
  if (outline) { scene.remove(outline); outline = null; }
  if (!info) { $('detail').innerHTML = '<p>Nothing selected.</p>'; return; }
  const h = document.createElement('div');
  h.innerHTML = `<b></b><p></p>`;
  h.querySelector('b').textContent = info.name;
  h.querySelector('p').textContent = info.note;
  $('detail').append(h);
  const boxW = new THREE.Box3();
  scene.updateMatrixWorld(true);
  scene.traverse((o) => { if (o.isMesh && o.userData.partId === id) boxW.expandByObject(o); });
  if (!boxW.isEmpty()) {
    outline = new THREE.Box3Helper(boxW, '#46c37b');
    scene.add(outline);
    if (focus) {
      const c = boxW.getCenter(new THREE.Vector3());
      const size = boxW.getSize(new THREE.Vector3()).length();
      const dir = camera.position.clone().sub(controls.target).normalize();
      controls.target.copy(c);
      camera.position.copy(c).addScaledVector(dir, Math.max(size * 1.6, 0.08));
      follow = false;
    }
  }
}
const ray = new THREE.Raycaster();
let downAt = null;
canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 4) return;
  const r = canvas.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  const hit = ray.intersectObjects([robot, field, tireGroup], true).find((h) => h.object.userData.partId);
  select(hit ? hit.object.userData.partId : null, false);
});

// ---------- camera views ----------
let follow = false;
const VIEWS = {
  hero: { title: 'Robot', at: [0, 0.045, 0], from: [-0.36, 0.2, 0.34], local: true },
  motor: { title: 'Motor + encoder', at: [0, 0.045, 0.045], from: [0.13, 0.12, 0.11], local: true },
  wheel: { title: 'Wheel + hub', at: [0, 0.04, 0.095], from: [0.15, 0.07, 0.3], local: true },
  caster: { title: 'Caster', at: [0.075, 0.012, 0.0], from: [0.2, 0.035, 0.12], local: true },
  contact: { title: 'Wheel contact', at: [0, 0.006, 0.101], from: [0.085, 0.022, 0.235], local: true },
  field: { title: 'Field', at: [0.1, 0, 0], from: [-1.25, 1.35, 1.7], local: false },
  top: { title: 'Top', at: [0, 0, 0], from: [0, 3.3, 0.001], local: false },
  follow: { title: 'Follow', follow: true },
};
function setView(id) {
  const v = VIEWS[id] || VIEWS.hero;
  document.querySelectorAll('#views button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === id)));
  follow = Boolean(v.follow);
  if (follow) return;
  const at = new THREE.Vector3(...v.at), from = new THREE.Vector3(...v.from);
  if (v.local) { robot.updateMatrixWorld(true); robot.localToWorld(at); robot.localToWorld(from); }
  controls.target.copy(at);
  camera.position.copy(from);
}

// ---------- drive: illustrative path, kinematic, wheel spin from differential kinematics ----------
// Two segments: start → laps 1–2 → pit box, then (after an in-place turn) pit → lap 3 → park.
const P = (x, y) => fieldPos(x, y, 0);
let assigned = 2;
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
function routes() {
  const b = lay[`pit_box_${assigned}`].vertices_in;
  const bx = (b[0][0] + b[2][0]) / 2, by = (b[0][1] + b[2][1]) / 2;
  const s = lay.start_box.vertices_in;
  const sx = (s[0][0] + s[2][0]) / 2, sy = (s[0][1] + s[2][1]) / 2;
  const c = OCT_CX, y0 = DIV_Y;
  const lap = [
    [c - 25.3, y0 + 6.2], [c - 21.5, y0 + 10.5], [c - 17.5, y0 + 7.4], [c - 10, y0 + 6.8], [c - 2.5, y0 + 7.6],
    [c + 4.5, y0 + 12.6], [c + 18.4, y0 + 13.0], [c + 23.6, y0 + 9.6], [c + 25.3, y0 + 3], [c + 25.3, y0 - 3],
    [c + 23.6, y0 - 9.6], [c + 17.5, y0 - 16.6], [c + 10, y0 - 17.9], [c + 2.6, y0 - 16.6],
    [c - 2.6, y0 - 9.2], [c - 10, y0 - 6.5], [c - 17.5, y0 - 7.6], [c - 23.6, y0 - 7.3],
  ];
  const toBox = [[c - 29, y0 + 12], [31, sy + 1], [22, sy], [bx + 9, by + 2], [bx + 1.5, by + 0.5]];
  const A = [[sx, sy], [sx + 7, sy], [31.5, sy], [c - 28.5, y0 + 9.5]];
  const mA = { lap1: A.length };
  A.push(...lap); mA.lap2 = A.length; A.push(...lap); mA.lap2end = A.length; A.push(...toBox);
  const B = [[bx + 1.5, by + 0.5], [bx + 9, by + 3], [20, sy - 0.5], [31, sy + 1], [c - 28, y0 + 10]];
  const mB = { lap3: B.length };
  B.push(...lap); mB.lap3end = B.length; B.push(...toBox);
  return [{ pts: A, idx: mA }, { pts: B, idx: mB }];
}
let segs = [];
function buildPath() {
  segs = routes().map(({ pts, idx }) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((q) => P(...q)), false, 'centripetal');
    curve.arcLengthDivisions = 3000;
    const L = curve.getLengths(3000), n = pts.length - 1;
    return { curve, total: curve.getLength(), marks: Object.fromEntries(Object.entries(idx).map(([k, i]) => [k, L[Math.round((i / n) * 3000)]])) };
  });
}
function poseAt(seg, s) {
  const g = segs[seg], u = Math.min(Math.max(s / g.total, 0), 1);
  const t = g.curve.getTangentAt(u);
  return { p: g.curve.getPointAt(u), heading: Math.atan2(-t.z, t.x) };
}
const sim = {};
function resetDrive() {
  buildPath();
  Object.assign(sim, { started: false, paused: false, flagT: 0, seg: 0, s: 0, v: 0, theta: { right: 0, left: 0 }, dwell: 0, done: false, laps: 0, phase: 'Waiting for flag' });
  const { p, heading } = poseAt(0, 0);
  sim.heading = heading;
  robot.position.copy(p);
  robot.rotation.y = heading;
  flagPivot.rotation.z = Math.PI;
  updateHud();
}
function startMatch() { sim.started = true; sim.paused = false; }
const VMAX = 0.3, ACC = 0.6, ALAT = 0.55, DWELL = 4;
function curvatureAt(seg, s) {
  const total = segs[seg].total;
  return Math.abs(wrap(poseAt(seg, Math.min(s + 0.03, total)).heading - poseAt(seg, Math.max(s - 0.03, 0)).heading)) / 0.06;
}
function turnWheels(ds, dpsi) {
  sim.theta.right += (ds + dpsi * geom.half) / geom.radius;
  sim.theta.left += (ds - dpsi * geom.half) / geom.radius;
}
function stepSim(dt) {
  sim.flagT += dt;
  flagPivot.rotation.z = Math.PI * (1 - Math.min(1, sim.flagT / 0.6));
  if (sim.done || sim.flagT < 0.7) return; // flag rises over 0.6 s; the detector confirms a few frames later
  if (sim.flagT - 0.6 >= 178) { sim.done = true; sim.v = 0; sim.phase = 'Auto-stop at 2:58'; return; }
  if (sim.dwell > 0) {
    const f = Math.min(1, (DWELL - sim.dwell + dt) / (DWELL * 0.75));
    const h = sim.spinFrom + sim.spinBy * (f * f * (3 - 2 * f));
    turnWheels(0, wrap(h - sim.heading));
    sim.heading = h;
    robot.rotation.y = h;
    sim.dwell -= dt;
    sim.phase = `Pit stop, box ${assigned} (no tire mechanism on the mule)`;
    if (sim.dwell <= 0) { sim.seg = 1; sim.s = 0; }
    return;
  }
  const g = segs[sim.seg];
  const remain = g.total - sim.s;
  if (remain < 0.002) {
    sim.v = 0;
    if (sim.seg === 0) { sim.dwell = DWELL; sim.spinFrom = sim.heading; sim.spinBy = wrap(poseAt(1, 0.02).heading - sim.heading); sim.laps = 2; }
    else { sim.done = true; sim.laps = 3; sim.phase = `Parked in box ${assigned}`; }
    return;
  }
  const target = Math.min(VMAX, Math.sqrt(2 * ACC * remain), Math.sqrt(ALAT / Math.max(curvatureAt(sim.seg, sim.s), 1e-3)));
  sim.v = target > sim.v ? Math.min(target, sim.v + ACC * dt) : Math.max(target, sim.v - 2 * ACC * dt);
  const ds = Math.min(Math.max(sim.v * dt, 0.00002), remain);
  sim.s += ds;
  const { p, heading } = poseAt(sim.seg, sim.s);
  turnWheels(ds, wrap(heading - sim.heading));
  sim.heading = heading;
  robot.position.copy(p);
  robot.rotation.y = heading;
  const m = g.marks;
  if (sim.seg === 0) {
    sim.laps = sim.s >= m.lap2end ? 2 : sim.s >= m.lap2 ? 1 : 0;
    sim.phase = sim.s < m.lap1 ? 'Entering course' : sim.s < m.lap2 ? 'Lap 1' : sim.s < m.lap2end ? 'Lap 2' : `To pit box ${assigned}`;
  } else {
    sim.laps = sim.s >= m.lap3end ? 3 : 2;
    sim.phase = sim.s < m.lap3 ? 'Rejoining course' : sim.s < m.lap3end ? 'Lap 3 (final)' : `Parking in box ${assigned}`;
  }
}
function updateHud() {
  const t = sim.started ? Math.max(0, sim.flagT - 0.6) : 0;
  $('clock').textContent = `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
  $('lap').textContent = `${sim.laps} / 3`;
  $('phase').textContent = sim.phase;
  $('speedo').textContent = sim.v.toFixed(2);
}
function setAssigned(id) { assigned = id; setTag(id); placeTire(id); $('tag').value = String(id); }

// ---------- main ----------
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
const clock = new THREE.Clock();
let acc = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (sim.started && !sim.paused) {
    acc += dt * Number($('speed').value);
    const h = 1 / 240;
    while (acc >= h) { stepSim(h); acc -= h; }
  }
  spin.right.rotation.z = -sim.theta.right;
  spin.left.rotation.z = sim.theta.left;
  const base = cloth.userData.base, pos = cloth.geometry.attributes.position, tt = performance.now() / 1000;
  for (let i = 0; i < pos.count; i += 1) { const x = base[i * 3]; pos.setZ(i, 0.004 * Math.sin(tt * 6 + x * 90) * (x / (3.8 * IN))); }
  pos.needsUpdate = true;
  if (follow) {
    const back = new THREE.Vector3(-0.42, 0.24, 0.12);
    robot.localToWorld(back);
    camera.position.lerp(back, 0.08);
    controls.target.lerp(robot.position.clone().add(new THREE.Vector3(0, 0.05, 0)), 0.15);
  }
  controls.update();
  renderer.render(scene, camera);
  updateHud();
  requestAnimationFrame(frame);
}

async function main() {
  for (const id of ['motor', 'bracket', 'hub', 'wheel', 'caster']) parts[id] = await loadPart(id);
  catalogue();
  buildField();
  buildTire();
  setAssigned(Number(params.get('tag') || 2));
  buildUI();
  applyConfig(current);
  resize();
  setView(params.get('view') || (VIEWS[hashName] ? hashName : 'hero'));
  if (params.get('panels') === '0') for (const id of ['left', 'right', 'hud']) $(id).style.display = 'none';
  const t = Number(params.get('t') || 0);
  if (t > 0 && !$('play').disabled) {
    startMatch();
    const h = 1 / 240;
    for (let i = 0; i < t * 240; i += 1) stepSim(h);
    sim.paused = true;
    updatePlay();
    if (params.get('view')) setView(params.get('view'));
  }
  if (params.get('select')) select(params.get('select'), false);
  document.body.dataset.ready = 'true';
  requestAnimationFrame(frame);
}
main().catch((e) => { console.error(e); document.body.dataset.error = String(e); });
