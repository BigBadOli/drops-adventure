// Drops Adventure — low-poly island walking game (Three.js renderer).
// Built on the Glow Isle mode-S skeleton: fixed 60 Hz timestep, seeded RNG
// split logic/visual. Pickups are wiggling Drops gummies; capturing one by
// day triggers a character dance, by night a comet-and-fireworks sky show.
import * as THREE from "../vendor/three.module.js";
import { STR } from "../strings.js";
import { PAL, SKY_KEYS, FOG_NEAR, FOG_FAR, GUMMY_FLAVORS, GUMMY_COLORS, DROPS_BRAND } from "./style.js";
import { buildCharacter, CHAR_IDS, MUSIC_STYLE } from "./characters.js";
import { makeMusic } from "./music.js";

// ---------- config (design/thresholds.md) ----------
const CFG = {
  islandR: 60, playableR: 50.5, spawnMargin: 8, // hard wall on dry sand — no wading
  spawnPoints: 30, activeNodes: 12, respawn: 10,
  barMax: 100, drain: 1.6, sprintMult: 2.5, refill: 20,
  walk: 5, sprint: 8, collectR: 1.45,
  dayLen: 120, jumpV: 4.6, gravity: 12,
  camDist: 7.2, camSens: 0.0023,
  danceLen: 2.6, showLen: 4.5,
};
const Q = new URLSearchParams(location.search);
const DEV = Q.has("dev");
const SMOKE = Q.has("smoke");
const IDLE = Q.has("idle"); // contrast route: bot stands still — must die
const TICK = Q.has("tick"); // QA: drive the loop from setInterval (headless/virtual-time runs)
const START_T = parseFloat(Q.get("t") || "0"); // time-of-day jump (verification)
const BASE_SEED = parseInt(Q.get("seed") || "1337", 10);

// ---------- seeded RNG ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- deterministic terrain noise (same for every seed) ----------
function hash2(ix, iz) {
  let h = (ix * 374761393 + iz * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) / 4294967296);
}
function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return (a + (b - a) * sx) * (1 - sz) + (c + (d - c) * sx) * sz;
}
function fbm(x, z) {
  return vnoise(x, z) * 0.6 + vnoise(x * 2.3 + 7, z * 2.3 + 3) * 0.3 + vnoise(x * 5.1 + 13, z * 5.1 + 11) * 0.1;
}
function terrainH(x, z) {
  const r = Math.hypot(x, z);
  const t = Math.min(r / CFG.islandR, 1);
  let h = 3.4 * Math.pow(Math.cos(t * Math.PI * 0.5), 1.15);
  h += fbm(x * 0.09, z * 0.09) * 0.9 * Math.max(0, 1 - t * 1.15);
  if (r > 50) h -= (r - 50) * 0.24;
  return h;
}

// ---------- renderer / scene ----------
const canvas = document.getElementById("game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const DPR_CAP = 1.5; // §7.5
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaadfee);
scene.fog = new THREE.Fog(0xaadfee, FOG_NEAR, FOG_FAR);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
function resize() {
  const dpr = Math.min(devicePixelRatio || 1, DPR_CAP);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize); addEventListener("orientationchange", resize); resize();

// lights
const sun = new THREE.DirectionalLight(0xfff3dd, 1.9);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024); // §7.5
sun.shadow.camera.left = -75; sun.shadow.camera.right = 75;
sun.shadow.camera.top = 75; sun.shadow.camera.bottom = -75;
sun.shadow.camera.near = 10; sun.shadow.camera.far = 260;
sun.shadow.bias = -0.0006;
scene.add(sun); scene.add(sun.target);
const hemi = new THREE.HemisphereLight(0xbfe3ee, 0x6f9e54, 0.5);
scene.add(hemi);

// stars (night + sky-show flare)
const starGeo = new THREE.BufferGeometry();
{
  const rng = mulberry32(4242);
  const pos = new Float32Array(400 * 3);
  for (let i = 0; i < 400; i++) {
    const a = rng() * Math.PI * 2, e = 0.12 + rng() * 0.85, r = 210;
    pos[i * 3] = Math.cos(a) * Math.cos(e) * r;
    pos[i * 3 + 1] = Math.sin(e) * r;
    pos[i * 3 + 2] = Math.sin(a) * Math.cos(e) * r;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
}
const starMat = new THREE.PointsMaterial({ color: 0xdfe8ff, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false });
scene.add(new THREE.Points(starGeo, starMat));

// Drops logo floating high in the sky, like a kite — well above the water
// (fog-free so it reads at distance). Azimuth drifts to follow wherever the
// camera is currently looking — a logo fixed at one absolute world bearing
// would end up out of frame the moment the player turns, since the mouse
// now free-orbits. Height is a fixed constant rather than projected along
// the camera's own downward-tilted view ray (that blows up: at 200 units
// out, even a mild tilt sends a ray-projected point tens of units
// underwater). H=40 sits above the horizon on purpose: it's out of frame
// under the default gameplay pitch (~0.42 rad, looking slightly down at
// the character) and only comes into view once the player tilts the
// camera upward — a discoverable sky detail, not something stuck in the
// default view.
let logoSprite = null;
let logoYaw = 0.6;
const LOGO_DIST = 200, LOGO_H = 40;
{
  new THREE.TextureLoader().load("./assets/img/drops-logo.png", tex => {
    tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.9, fog: false, depthWrite: false });
    logoSprite = new THREE.Sprite(m);
    logoSprite.scale.set(52, 52 * 461 / 1103, 1);
    scene.add(logoSprite);
  });
}

// ---------- terrain ----------
{
  const geo = new THREE.PlaneGeometry(150, 150, 110, 110);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const cGrass = new THREE.Color(PAL.grass), cGrassD = new THREE.Color(PAL.grassDark);
  const cSand = new THREE.Color(PAL.sand), cWet = new THREE.Color(PAL.sandWet), cSea = new THREE.Color(PAL.seafloor);
  const tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const h = terrainH(x, z);
    p.setY(i, h);
    const r = Math.hypot(x, z);
    const n = fbm(x * 0.22 + 31, z * 0.22 + 17);
    if (h < -0.6) tmp.copy(cSea).lerp(cWet, Math.max(0, 1 + h * 0.35));
    else if (r > 50 || h < 0.42) tmp.copy(cSand).lerp(cWet, n * 0.7);
    else tmp.copy(cGrass).lerp(cGrassD, n);
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 });
  const terrain = new THREE.Mesh(geo, mat);
  terrain.receiveShadow = true;
  scene.add(terrain);
}

// water
{
  const geo = new THREE.CircleGeometry(320, 48);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: PAL.water, roughness: 0.3, metalness: 0.08, emissive: 0x0d3a42, emissiveIntensity: 0.5 });
  const water = new THREE.Mesh(geo, mat);
  water.position.y = -0.35;
  scene.add(water);
}

// ---------- vegetation (instanced — one draw call per swarm, §7.5) ----------
const colliders = []; // {x,z,r}
{
  const rng = mulberry32(777); // static layout — players learn the island
  const dummy = new THREE.Object3D();
  function scatter(count, rMin, rMax, minGap) {
    const pts = [];
    let guard = 0;
    while (pts.length < count && guard++ < 4000) {
      const a = rng() * Math.PI * 2, r = rMin + rng() * (rMax - rMin);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.hypot(x, z) < 5) continue;
      if (pts.every(q => (q.x - x) ** 2 + (q.z - z) ** 2 > minGap * minGap)) pts.push({ x, z, s: 0.8 + rng() * 0.55, rot: rng() * Math.PI * 2 });
    }
    return pts;
  }
  const pinePts = scatter(52, 8, 47, 3.2), leafPts = scatter(34, 8, 46, 3.4), rockPts = scatter(42, 6, 52, 2.6);

  function makeInstanced(geo, mat, pts, yFn, collideR) {
    const m = new THREE.InstancedMesh(geo, mat, pts.length);
    m.castShadow = true;
    pts.forEach((pt, i) => {
      dummy.position.set(pt.x, yFn(pt), pt.z);
      dummy.rotation.set(0, pt.rot, 0);
      dummy.scale.setScalar(pt.s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      if (collideR) colliders.push({ x: pt.x, z: pt.z, r: collideR * pt.s });
    });
    scene.add(m);
    return m;
  }
  const flat = (c, rough = 0.9) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: rough, metalness: 0 });
  const ground = pt => terrainH(pt.x, pt.z) - 0.08;
  makeInstanced(new THREE.ConeGeometry(1.15, 2.8, 7), flat(PAL.pine), pinePts, pt => ground(pt) + 1.9 * pt.s, 0.75);
  makeInstanced(new THREE.CylinderGeometry(0.16, 0.24, 1.0, 6), flat(PAL.trunk), pinePts, pt => ground(pt) + 0.45 * pt.s, 0);
  const leafGeo = new THREE.IcosahedronGeometry(1.5, 0); leafGeo.scale(1, 0.85, 1);
  makeInstanced(leafGeo, flat(PAL.leaf), leafPts, pt => ground(pt) + 1.95 * pt.s, 0.75);
  makeInstanced(new THREE.CylinderGeometry(0.18, 0.26, 1.1, 6), flat(PAL.trunk), leafPts, pt => ground(pt) + 0.5 * pt.s, 0);
  const rockGeo = new THREE.IcosahedronGeometry(0.9, 0); rockGeo.scale(1.15, 0.75, 1);
  makeInstanced(rockGeo, flat(PAL.rock, 0.98), rockPts, pt => ground(pt) + 0.25 * pt.s, 0.95);
}

// ---------- gummy nodes ----------
const nodePts = [];   // 30 spawn points (per-run seed)
const nodeState = []; // {active, respawnAt}
const nodeColor = []; // gummy color index per spawn point
let logicRng = mulberry32(BASE_SEED);
function layoutNodes(seed) {
  logicRng = mulberry32(seed);
  nodePts.length = 0; nodeState.length = 0; nodeColor.length = 0;
  let guard = 0;
  while (nodePts.length < CFG.spawnPoints && guard++ < 5000) {
    const a = logicRng() * Math.PI * 2, r = 8 + logicRng() * 42;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (nodePts.every(q => (q.x - x) ** 2 + (q.z - z) ** 2 > 36) &&
        colliders.every(c => (c.x - x) ** 2 + (c.z - z) ** 2 > 5.3)) nodePts.push({ x, z });
  }
  // shuffled round-robin flavor deal — every one of the 11 colors spawns
  for (let i = 0; i < nodePts.length; i++) {
    nodeState.push({ active: false, respawnAt: 0 });
    nodeColor.push(i % GUMMY_FLAVORS.length);
  }
  for (let i = nodeColor.length - 1; i > 0; i--) {
    const j = (logicRng() * (i + 1)) | 0;
    [nodeColor[i], nodeColor[j]] = [nodeColor[j], nodeColor[i]];
  }
  const idx = [...nodePts.keys()];
  for (let n = 0; n < CFG.activeNodes && idx.length; n++) {
    const k = idx.splice((logicRng() * idx.length) | 0, 1)[0];
    nodeState[k].active = true;
  }
  // tint each halo + gummy instance to its flavor color
  for (let i = 0; i < nodePts.length; i++) {
    tmpC.setHex(GUMMY_COLORS[nodeColor[i]]);
    gummies.setColorAt(i, tmpC);
    halos[i].material.color.setHex(GUMMY_COLORS[nodeColor[i]]);
  }
  if (gummies.instanceColor) gummies.instanceColor.needsUpdate = true;
}

// sugar-speckle canvas texture — multiplies each instance's flavor color
function sugarTex() {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, 64, 64);
  const rng = mulberry32(99);
  for (let i = 0; i < 240; i++) {
    const v = 210 + (rng() * 45) | 0;
    g.fillStyle = rng() > 0.5 ? `rgba(255,255,255,0.9)` : `rgb(${v},${v},${v})`;
    const s = 1 + rng() * 2.2;
    g.fillRect(rng() * 64, rng() * 64, s, s);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// gummy cube: 1/5 of the ~1.7-unit characters
const GUMMY_SIZE = 0.34;
const gummyGeo = new THREE.BoxGeometry(GUMMY_SIZE, GUMMY_SIZE, GUMMY_SIZE, 2, 2, 2);
const gummyMat = new THREE.MeshStandardMaterial({
  color: 0xffffff, map: sugarTex(), flatShading: true,
  roughness: 0.45, metalness: 0, emissive: 0xffffff, emissiveIntensity: 0.12,
});
const gummies = new THREE.InstancedMesh(gummyGeo, gummyMat, CFG.spawnPoints);
gummies.castShadow = true;
scene.add(gummies);
const tmpC = new THREE.Color();
{ // init all instances hidden (nodePts may be shorter than spawnPoints)
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(0.0001, 0.0001, 0.0001), p = new THREE.Vector3(0, -50, 0);
  m.compose(p, q, s);
  for (let i = 0; i < CFG.spawnPoints; i++) { gummies.setMatrixAt(i, m); gummies.setColorAt(i, tmpC.setHex(0xffffff)); }
}

// glow halo texture (white — tinted per-gummy by sprite material color)
function radialTex(inner, outer) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, inner); grad.addColorStop(1, outer);
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const haloTex = radialTex("rgba(255,255,255,0.9)", "rgba(255,255,255,0)");
const halos = [];
for (let i = 0; i < CFG.spawnPoints; i++) {
  const sm = new THREE.SpriteMaterial({ map: haloTex, color: 0xffffff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const s = new THREE.Sprite(sm);
  s.scale.setScalar(2.4);
  s.visible = false;
  scene.add(s); halos.push(s);
}

// ---------- particle pools (§7.5 no per-frame alloc) ----------
const dotTex = radialTex("rgba(255,255,255,1)", "rgba(255,255,255,0)");
function makeBurstPool(count, parts, size) {
  const pool = [];
  for (let b = 0; b < count; b++) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(parts * 3), 3));
    const m = new THREE.PointsMaterial({ map: dotTex, color: 0xffffff, size, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    scene.add(pts);
    pool.push({ pts, vel: new Float32Array(parts * 3), life: 0, max: 0.7, parts, gravity: 5.5 });
  }
  return pool;
}
const bursts = makeBurstPool(4, 26, 0.5);        // ground pickup / confetti pops
const fireworks = makeBurstPool(6, 48, 2.6);     // night-show explosions near the horizon
let burstIdx = 0, fwIdx = 0;
const fxRng = mulberry32(20260720);
function firePool(pool, idx, x, y, z, colorHex, speed, up, life, gravity) {
  const b = pool[idx % pool.length];
  const p = b.pts.geometry.attributes.position.array;
  for (let i = 0; i < b.parts; i++) {
    p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z;
    const a = fxRng() * Math.PI * 2, e = fxRng() * Math.PI - Math.PI / 2, sp = speed * (0.5 + fxRng() * 0.85);
    b.vel[i * 3] = Math.cos(a) * Math.cos(e) * sp;
    b.vel[i * 3 + 1] = Math.sin(e) * sp * 0.9 + up;
    b.vel[i * 3 + 2] = Math.sin(a) * Math.cos(e) * sp;
  }
  b.pts.geometry.attributes.position.needsUpdate = true;
  b.pts.material.color.setHex(colorHex);
  b.life = life; b.max = life; b.gravity = gravity;
  b.pts.material.opacity = 0.95;
}
function spawnBurst(x, y, z, colorHex) {
  firePool(bursts, burstIdx++, x, y, z, colorHex, 2.4, 1.4, 0.7, 5.5);
}
function spawnFirework(x, y, z, colorHex) {
  firePool(fireworks, fwIdx++, x, y, z, colorHex, 12, 2.0, 1.5, 2.2);
}
function updatePool(pool, dt) {
  for (const b of pool) {
    if (b.life <= 0) continue;
    b.life -= dt;
    const p = b.pts.geometry.attributes.position.array;
    for (let i = 0; i < b.parts; i++) {
      p[i * 3] += b.vel[i * 3] * dt; p[i * 3 + 1] += b.vel[i * 3 + 1] * dt; p[i * 3 + 2] += b.vel[i * 3 + 2] * dt;
      b.vel[i * 3 + 1] -= b.gravity * dt;
    }
    b.pts.geometry.attributes.position.needsUpdate = true;
    b.pts.material.opacity = Math.max(0, 0.95 * (b.life / b.max));
  }
}

// ---------- comets (night sky show) ----------
const COMETS = 6, CTRAIL = 14;
const comets = [];
for (let i = 0; i < COMETS; i++) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(CTRAIL * 3), 3));
  const m = new THREE.PointsMaterial({ map: dotTex, color: 0xcfe6ff, size: 3.4, sizeAttenuation: false, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  scene.add(pts);
  comets.push({ pts, head: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0, max: 2.2 });
}
let cometIdx = 0;
function spawnComet() {
  const c = comets[cometIdx++ % COMETS];
  // low elevation — comets streak just above the horizon, in the view cone
  const viewAz = Math.atan2(-Math.cos(camYaw), -Math.sin(camYaw));
  const a = viewAz + (fxRng() - 0.5) * 1.8, e = 0.16 + fxRng() * 0.26, r = 195;
  c.head.set(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
  const dir = fxRng() > 0.5 ? 1 : -1;
  c.vel.set(-Math.sin(a) * dir, -(0.05 + fxRng() * 0.14), Math.cos(a) * dir).normalize().multiplyScalar(55 + fxRng() * 35);
  const p = c.pts.geometry.attributes.position.array;
  for (let i = 0; i < CTRAIL; i++) { p[i * 3] = c.head.x; p[i * 3 + 1] = c.head.y; p[i * 3 + 2] = c.head.z; }
  c.pts.material.color.setHex(fxRng() > 0.4 ? 0xcfe6ff : GUMMY_COLORS[(fxRng() * GUMMY_COLORS.length) | 0]);
  c.life = c.max;
}
function updateComets(dt) {
  for (const c of comets) {
    if (c.life <= 0) { c.pts.material.opacity = 0; continue; }
    c.life -= dt;
    c.head.addScaledVector(c.vel, dt);
    const p = c.pts.geometry.attributes.position.array;
    for (let i = CTRAIL - 1; i > 0; i--) {
      p[i * 3] = p[(i - 1) * 3]; p[i * 3 + 1] = p[(i - 1) * 3 + 1]; p[i * 3 + 2] = p[(i - 1) * 3 + 2];
    }
    p[0] = c.head.x; p[1] = c.head.y; p[2] = c.head.z;
    c.pts.geometry.attributes.position.needsUpdate = true;
    c.pts.material.opacity = Math.min(1, (c.life / c.max) * 1.6) * 0.9;
  }
}

// ---------- player rig (chosen on the select screen) ----------
const player = new THREE.Group();
scene.add(player);
let rig = null, selectedChar = null;
function setCharacter(id) {
  selectedChar = id;
  if (rig) player.remove(rig.group);
  rig = buildCharacter(id);
  player.add(rig.group);
}
// select-screen previews: the three heroes lined up on the meadow facing camera
const previewRigs = CHAR_IDS.map((id, i) => {
  const r = buildCharacter(id);
  const x = (i - 1) * 2.0, z = -3.6 + Math.abs(i - 1) * 0.3;
  r.group.position.set(x, terrainH(x, z), z);
  r.group.rotation.y = Math.PI + (i - 1) * -0.25; // face the camera
  scene.add(r.group);
  return r;
});
function setPreviewVisible(v) { for (const r of previewRigs) r.group.visible = v; }

// ---------- input (physical codes §1; gamepad; pointer lock) ----------
const keys = new Set();
const BIND = { KeyW: "f", KeyS: "b", KeyA: "l", KeyD: "r", ArrowUp: "f", ArrowDown: "b", ArrowLeft: "l", ArrowRight: "r", ShiftLeft: "sprint", ShiftRight: "sprint", Space: "jump", KeyR: "restart", KeyC: "chchar", KeyM: "mute", Digit1: "c1", Digit2: "c2", Digit3: "c3" };
addEventListener("keydown", e => {
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON")) return; // typing initials / focused button
  const c = BIND[e.code];
  if (!c) return;
  if (c === "restart") { if (!e.repeat && (state === "play" || state === "over" || state === "menu")) startPlay(); e.preventDefault(); return; }
  if (c === "chchar") { if (!e.repeat && state !== "select") gotoSelect(); return; }
  if (c === "mute") { if (!e.repeat) toggleMute(); return; }
  if (c === "c1" || c === "c2" || c === "c3") {
    if (state === "select") pickCharacter(CHAR_IDS["c1c2c3".indexOf(c) / 2 | 0]);
    return;
  }
  keys.add(c);
  if (c === "jump") e.preventDefault();
});
addEventListener("keyup", e => {
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON")) return;
  const c = BIND[e.code]; if (c) keys.delete(c);
});
let camYaw = 0, camPitch = 0.42, locked = false;
canvas.addEventListener("click", () => { if (state === "play" && !locked && !SMOKE) canvas.requestPointerLock(); });
document.addEventListener("pointerlockchange", () => {
  locked = document.pointerLockElement === canvas;
  if (!locked && state === "play" && !SMOKE) openMenu(); // Esc from lock = pause menu
  else if (locked && state === "play") hideOverlay();
});
addEventListener("mousemove", e => {
  // mouse is always live during play — pointer lock (click) just hides the
  // cursor for uncapped turning. movementX/Y deltas work either way.
  if (state !== "play") return;
  if (!locked && !el.overlay.classList.contains("hidden")) return; // paused card up
  camYaw -= (e.movementX || 0) * CFG.camSens;
  camPitch = Math.min(1.15, Math.max(-0.3, camPitch + (e.movementY || 0) * CFG.camSens));
});
function gamepadInput(out) {
  out.gx = 0; out.gy = 0; out.sprint = false;
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of gps) {
    if (!gp) continue;
    const dz = v => Math.abs(v) > 0.16 ? v : 0;
    out.gx = dz(gp.axes[0] || 0); out.gy = dz(gp.axes[1] || 0);
    camYaw -= dz(gp.axes[2] || 0) * 0.045;
    camPitch = Math.min(1.15, Math.max(-0.3, camPitch + dz(gp.axes[3] || 0) * 0.035));
    if (gp.buttons[7] && gp.buttons[7].value > 0.3) out.sprint = true;
    if (gp.buttons[0] && gp.buttons[0].pressed) out.jump = true;
    const start = gp.buttons[9] && gp.buttons[9].pressed;
    if (start && !out._start) out.restart = true; // edge-triggered
    out._start = start;
  }
  return out;
}

// ---------- audio: procedural per-character music + sampled sfx ----------
const audio = { ctx: null, buffers: {}, music: null, muted: false };
try { audio.muted = localStorage.getItem("drops_muted") === "1"; } catch (e) {}
function initAudio() {
  if (audio.ctx) return;
  try {
    audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = audio.ctx.createGain(); master.gain.value = audio.muted ? 0 : 0.9; master.connect(audio.ctx.destination);
    audio.master = master;
    audio.music = makeMusic(audio.ctx, master);
    const load = (name, url) => fetch(url)
      .then(r => { if (!r.ok) throw new Error(name); return r.arrayBuffer(); })
      .then(ab => audio.ctx.decodeAudioData(ab))
      .then(buf => { audio.buffers[name] = buf; })
      .catch(() => {});
    load("pickup", "./assets/audio/sfx-pickup.mp3");
    load("over", "./assets/audio/sfx-gameover.mp3");
  } catch (e) { /* no audio device — game remains playable */ }
}
const muteBtn = document.getElementById("muteBtn");
function applyMute() {
  if (audio.master) audio.master.gain.value = audio.muted ? 0 : 0.9;
  muteBtn.textContent = audio.muted ? "🔇" : "🔊";
  muteBtn.classList.toggle("muted", audio.muted);
  try { localStorage.setItem("drops_muted", audio.muted ? "1" : "0"); } catch (e) {}
}
function toggleMute() { audio.muted = !audio.muted; applyMute(); }
muteBtn.addEventListener("click", () => { toggleMute(); muteBtn.blur(); });
applyMute();
const charBtn = document.getElementById("charBtn");
charBtn.addEventListener("click", () => { if (state !== "select") gotoSelect(); charBtn.blur(); });

// ---------- leaderboard: live global board (Pages Function + KV) with a
// ---------- localStorage fallback for offline/local play ----------
const LB_MAX = 8;
const LB_API = "/api/scores";
function lbLoad() { try { return JSON.parse(localStorage.getItem("drops_lb") || "[]"); } catch (e) { return []; } }
function lbStore(list) { try { localStorage.setItem("drops_lb", JSON.stringify(list)); } catch (e) {} }
function lbAdd(n, s, t) {
  const l = lbLoad();
  l.push({ n, s, t });
  l.sort((a, b) => b.t - a.t || b.s - a.s);
  lbStore(l.slice(0, LB_MAX));
}
function lbSubmit(entry) {
  return fetch(LB_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entry) })
    .catch(() => {}); // offline/local dev — the local board already has it
}
async function lbRefresh(hl) {
  try {
    const r = await fetch(LB_API, { cache: "no-store" });
    if (!r.ok) return;
    const list = await r.json();
    const box = document.getElementById("lbBox");
    if (box && Array.isArray(list) && list.length) box.innerHTML = lbTableHtml(list, hl, true);
  } catch (e) { /* keep the local table */ }
}
function lbTableHtml(l, hl, live) {
  if (!l.length) return `<div class="dim">${STR.lbEmpty}</div>`;
  return `<div class="lbTitle">${STR.lbTitle}${live ? " 🌐" : ""}</div><div class="lb">` + l.slice(0, LB_MAX).map((e, i) =>
    `<div class="lbRow${hl && e.n === hl.n && e.t === hl.t ? " hl" : ""}">` +
    `<span>${i + 1}</span><b>${e.n}</b><span>${e.s} 🍬</span><span>${fmtTime(e.t)}${e.t < 60 ? STR.seconds : ""}</span></div>`).join("") + `</div>`;
}
function playSfx(name, gain) {
  if (!audio.ctx || !audio.buffers[name]) return;
  const src = audio.ctx.createBufferSource(); src.buffer = audio.buffers[name];
  const g = audio.ctx.createGain(); g.gain.value = gain;
  src.connect(g); g.connect(audio.master); src.start();
}

// ---------- HUD / overlay ----------
const el = {
  stats: document.getElementById("stats"), energyFill: document.getElementById("energyFill"),
  energyWrap: document.getElementById("energyWrap"), energyLabel: document.getElementById("energyLabel"),
  overlay: document.getElementById("overlay"), card: document.getElementById("card"),
  cycleLabel: document.getElementById("cycleLabel"), cycleFill: document.getElementById("cycleFill"),
  cycleDot: document.getElementById("cycleDot"), dev: document.getElementById("dev"),
};
el.energyLabel.textContent = STR.energy;
if (DEV) el.dev.style.display = "block";

// flavor toast — name + effect pop while the hero celebrates
const toastEl = document.getElementById("toast"),
  toastName = document.getElementById("toastName"),
  toastFx = document.getElementById("toastFx");
function showToast(fi) {
  const f = GUMMY_FLAVORS[fi];
  const hex = "#" + f.color.toString(16).padStart(6, "0");
  toastName.textContent = f.name;
  toastFx.textContent = f.effect;
  toastName.style.background = `linear-gradient(135deg, ${hex}e6, ${hex})`;
  toastName.style.boxShadow = `0 0 28px ${hex}`;
  toastEl.classList.remove("pop");
  void toastEl.offsetWidth; // restart the CSS animation
  toastEl.classList.add("pop");
}
function showOverlay(kind, data) {
  el.overlay.classList.remove("hidden");
  el.card.classList.toggle("wide", kind === "select" || kind === "flavors");
  if (kind === "select") {
    const cardHtml = CHAR_IDS.map((id, i) => {
      const c = STR.chars[id];
      return `<div class="charCard" data-char="${id}"><div class="key">${i + 1}</div>
        <div class="cname">${c.name}</div><div class="csub">${c.sub}</div><div class="cdesc">${c.desc}</div></div>`;
    }).join("");
    const heading = runActive
      ? `<h1>${STR.switchTitle}</h1><div class="tag">${STR.switchHint}</div>`
      : `<h1>${STR.title}</h1><div class="tag">${STR.tagline}</div>`;
    el.card.innerHTML = `${heading}
      <div class="chooseLabel">${STR.choose}</div>
      <div class="cards">${cardHtml}</div>
      <div class="how">${STR.howtoMove} · ${STR.howtoLook} · ${STR.howtoSprint} · ${STR.howtoJump}<br>${STR.howtoGoal}</div>
      <div class="cta">${STR.clickToPlay}</div>`;
    el.card.querySelectorAll(".charCard").forEach(cardEl => {
      cardEl.addEventListener("click", ev => {
        ev.stopPropagation();
        pickCharacter(cardEl.dataset.char);
      });
    });
  } else if (kind === "flavors") {
    const rows = GUMMY_FLAVORS.map(f => {
      const hex = "#" + f.color.toString(16).padStart(6, "0");
      return `<div class="flavRow"><span class="flavCube" style="background:linear-gradient(135deg, ${hex}, ${hex}cc); box-shadow:0 0 10px ${hex}80"></span>
        <span class="flavName">${f.name}</span><span class="flavFx">${f.effect}</span></div>`;
    }).join("");
    el.card.innerHTML = `<h1>${STR.flavorsTitle}</h1><div class="tag">${STR.flavorsTag}</div>
      <div class="flavGrid">${rows}</div>
      <button id="flavCloseBtn" class="ctaBtn">${STR.close}</button>`;
    el.card.querySelector("#flavCloseBtn").addEventListener("click", ev => { ev.stopPropagation(); closeFlavors(); });
  } else if (kind === "menu") {
    el.card.innerHTML = `<h1>${STR.title}</h1><div class="tag">${STR.tagline}</div>
      <div class="how">${STR.howtoMove} · ${STR.howtoLook} · ${STR.howtoSprint} · ${STR.howtoJump}<br>
      ${STR.howtoGoal}<br><br>${STR.menuHint}</div>
      <button id="resumeBtn" class="ctaBtn">${STR.resume}</button>`;
    el.card.querySelector("#resumeBtn").addEventListener("click", ev => { ev.stopPropagation(); closeMenu(); });
  } else if (kind === "over") {
    const entering = !data.saved;
    const mid = entering
      ? `<div class="lbEnter">${STR.lbEnter}</div>
         <div class="lbForm"><input id="lbInit" maxlength="3" autocomplete="off" spellcheck="false" placeholder="AAA">
         <button id="lbSaveBtn" class="ctaBtn" style="margin-top:0">${STR.lbSave}</button></div>`
      : `<div id="lbBox">${lbTableHtml(lbLoad(), data.justSaved, false)}</div>`;
    el.card.innerHTML = `<h1>${data.stopped ? STR.runOver : STR.gameOver}</h1>
      <div class="big">${STR.finalScore}: <b>${data.score}</b> · ${STR.finalTime}: <b>${data.time}${STR.seconds}</b></div>
      ${mid}
      <button id="againBtn" class="ctaBtn">${STR.playAgain}</button>
      <div class="dim" style="margin-top:8px">${STR.restartHint}</div>`;
    el.card.querySelector("#againBtn").addEventListener("click", ev => { ev.stopPropagation(); startPlay(); });
    if (entering) {
      const inp = el.card.querySelector("#lbInit");
      const save = () => {
        const n = (inp.value.toUpperCase().replace(/[^A-Z0-9]/g, "") || "???").padEnd(3, "•").slice(0, 3);
        lbAdd(n, data.score, data.time);
        const justSaved = { n, t: data.time };
        lbSubmit({ n, s: data.score, t: data.time }).then(() => lbRefresh(justSaved));
        showOverlay("over", { ...data, saved: true, justSaved });
      };
      el.card.querySelector("#lbSaveBtn").addEventListener("click", ev => { ev.stopPropagation(); save(); });
      inp.addEventListener("keydown", ev => { if (ev.key === "Enter") save(); ev.stopPropagation(); });
      inp.addEventListener("input", () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3); });
      setTimeout(() => inp.focus(), 50);
    } else {
      lbRefresh(data.justSaved); // swap in the live global board when reachable
    }
  }
}
function hideOverlay() { el.overlay.classList.add("hidden"); }
function fmtTime(s) { const m = (s / 60) | 0, ss = (s % 60) | 0; return m > 0 ? `${m}:${String(ss).padStart(2, "0")}` : `${ss}`; }

// ---------- game state ----------
let state = "select", runCount = 0;
let bar, score, survived, simT, px, pz, py, vy, vx, vz, heading, jumpY, grounded, walkCycle, respawnQ, collected;
let danceT = 0;        // sim: seconds of boogie left (day capture)
let showT = 0;         // presentation: seconds of sky show left (night capture)
let showFxT = 0;       // spawn cadence accumulator for comets/fireworks
let confettiT = 0;     // dance confetti cadence
let best = 0;
try { best = +(localStorage.getItem("drops_best") || 0); } catch (e) {}
function resetRun() {
  runCount++;
  layoutNodes(BASE_SEED + runCount - 1);
  bar = CFG.barMax; score = 0; survived = START_T; simT = START_T; collected = 0;
  px = 0; pz = 0; py = terrainH(0, 0); vx = 0; vz = 0; vy = 0; jumpY = 0; grounded = true;
  heading = 0; walkCycle = 0; camYaw = 0; camPitch = 0.42;
  danceT = 0; showT = 0; showFxT = 0; confettiT = 0;
  respawnQ = [];
  // hook (§3.4): guarantee a gummy ~8 m ahead of spawn
  let nearest = 0, nd = 1e9;
  for (let i = 0; i < nodePts.length; i++) {
    const d = nodePts[i].x ** 2 + nodePts[i].z ** 2;
    if (nodeState[i].active && d < nd) { nd = d; nearest = i; }
  }
  if (nd > 100) {
    nodeState[nearest].active = false;
    let bestI = -1, bd = 1e9;
    for (let i = 0; i < nodePts.length; i++) {
      const d = (nodePts[i].x) ** 2 + (nodePts[i].z + 8) ** 2;
      if (d < bd) { bd = d; bestI = i; }
    }
    if (bestI >= 0) nodeState[bestI].active = true;
  }
}
let runActive = false; // a run survives hero swaps and menu pauses
function startPlay() {
  if (!rig) setCharacter(CHAR_IDS[0]);
  resetRun();
  runActive = true;
  state = "play";
  setPreviewVisible(false);
  hideOverlay();
  initAudio();
  if (audio.music) { audio.music.setGain(0.14); audio.music.start(MUSIC_STYLE[selectedChar]); }
  updateButtons();
  if (!SMOKE) canvas.requestPointerLock();
}
function resumePlay() { // continue the in-flight run (hero may have changed)
  state = "play";
  setPreviewVisible(false);
  hideOverlay();
  initAudio();
  if (audio.music) { audio.music.setGain(0.14); audio.music.start(MUSIC_STYLE[selectedChar]); }
  updateButtons();
}
function pickCharacter(id) {
  if (selectedChar !== id || !rig) setCharacter(id);
  if (runActive) resumePlay(); else startPlay();
}
function gotoSelect() { // hero picker; an active run is paused, not reset
  state = "select";
  if (document.pointerLockElement) document.exitPointerLock();
  if (audio.music) audio.music.stop();
  setPreviewVisible(true);
  if (!runActive) { camYaw = 0; camPitch = 0.42; }
  showOverlay("select");
  updateButtons();
}
function openMenu() { // pause + intro panel
  if (state !== "play") return;
  state = "menu";
  if (document.pointerLockElement) document.exitPointerLock();
  showOverlay("menu");
  updateButtons();
}
function closeMenu() {
  state = "play";
  hideOverlay();
  updateButtons();
}
function gameOver(stopped) {
  state = "over";
  runActive = false;
  playSfx("over", 0.42);
  if (audio.music) audio.music.setGain(0.05);
  const t = Math.round(survived);
  if (t > best) { best = t; try { localStorage.setItem("drops_best", String(best)); } catch (e) {} }
  if (document.pointerLockElement) document.exitPointerLock();
  showOverlay("over", { score, time: t, best, stopped });
  updateButtons();
}
el.overlay.addEventListener("click", () => {
  // game-over card has its own buttons (initials entry must stay clickable)
  if (state === "play" && !locked) canvas.requestPointerLock();
});
const menuBtn = document.getElementById("menuBtn"), stopBtn = document.getElementById("stopBtn"), flavBtn = document.getElementById("flavBtn");
menuBtn.addEventListener("click", () => { openMenu(); menuBtn.blur(); });
stopBtn.addEventListener("click", () => { if (state === "play" || state === "menu") gameOver(true); stopBtn.blur(); });
let flavorsFrom = "select"; // where to return when the flavors page closes
function openFlavors() {
  if (state === "flavors" || state === "over") return;
  flavorsFrom = state;
  state = "flavors"; // pauses the sim, like the menu
  if (document.pointerLockElement) document.exitPointerLock();
  showOverlay("flavors");
  updateButtons();
}
function closeFlavors() {
  state = flavorsFrom;
  if (state === "play") hideOverlay();
  else showOverlay(state === "menu" ? "menu" : "select");
  updateButtons();
}
flavBtn.addEventListener("click", () => { openFlavors(); flavBtn.blur(); });
function updateButtons() {
  menuBtn.style.display = state === "play" ? "flex" : "none";
  stopBtn.style.display = state === "play" || state === "menu" ? "flex" : "none";
  charBtn.style.display = state === "select" || state === "flavors" ? "none" : "flex";
  flavBtn.style.display = state === "over" ? "none" : "flex";
}

// ---------- sky / day-night ----------
const skyCol = new THREE.Color(), sunCol = new THREE.Color(), tmpA = new THREE.Color(), tmpB = new THREE.Color();
let nightFactor = 0;
function updateSky(phase) {
  let i = 0;
  while (i < SKY_KEYS.length - 2 && SKY_KEYS[i + 1].p <= phase) i++;
  const a = SKY_KEYS[i], b = SKY_KEYS[i + 1];
  const f = Math.min(1, Math.max(0, (phase - a.p) / (b.p - a.p)));
  tmpA.setHex(a.sky); tmpB.setHex(b.sky); skyCol.copy(tmpA).lerp(tmpB, f);
  tmpA.setHex(a.sun); tmpB.setHex(b.sun); sunCol.copy(tmpA).lerp(tmpB, f);
  sun.intensity = a.sunI + (b.sunI - a.sunI) * f;
  hemi.intensity = a.hemi + (b.hemi - a.hemi) * f;
  starMat.opacity = a.stars + (b.stars - a.stars) * f;
  scene.background.copy(skyCol);
  scene.fog.color.copy(skyCol);
  sun.color.copy(sunCol);
  // sun travels across the sky; at night a low cool "moon" replaces it
  const dayT = Math.min(1, Math.max(0, phase / 0.583));
  const nightT = Math.min(1, Math.max(0, (phase - 0.6) / 0.34));
  const isNight = phase > 0.583 && phase < 0.94;
  const elv = isNight ? 0.35 + Math.sin(nightT * Math.PI) * 0.45 : 0.25 + Math.sin(dayT * Math.PI) * 0.85;
  const az = phase * Math.PI * 2 + 0.6;
  sun.position.set(Math.cos(az) * 120, Math.max(0.12, Math.sin(elv)) * 110, Math.sin(az) * 120);
  nightFactor = isNight ? Math.min(1, nightT * 3) * Math.min(1, (0.94 - phase) * 8) : 0;
  gummyMat.emissiveIntensity = 0.12 + nightFactor * 0.4;
  const rigGlow = 0.06 + nightFactor * 0.3;
  if (rig) for (const m of rig.mats) m.emissiveIntensity = rigGlow;
  // night sky show: dazzling pulsing light, stars flare
  if (showT > 0) {
    const s = Math.min(1, showT / 1.2); // fade out over the last second
    const pulse = 0.6 + 0.4 * Math.sin(simT * 9);
    hemi.intensity += s * 0.5 * pulse;
    sun.intensity += s * 0.3;
    starMat.opacity = Math.min(1, starMat.opacity + s * (0.55 + 0.35 * Math.sin(simT * 13)));
    starMat.size = 1.4 + s * pulse * 1.3;
  } else starMat.size = 1.4;
  if (logoSprite) logoSprite.material.opacity = 0.55 + nightFactor * 0.45 + (showT > 0 ? 0.2 : 0);
}

// ---------- sim (fixed dt; player-visible state only) ----------
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(1, 1, 1), tmpE = new THREE.Euler();
const padState = { gx: 0, gy: 0, sprint: false, jump: false, restart: false };
let botWish = null;
function step(dt) {
  simT += dt; survived += dt;

  // --- input → wish direction (camera-relative) ---
  gamepadInput(padState);
  if (padState.restart) { padState.restart = false; startPlay(); return; }
  let ix = (keys.has("r") ? 1 : 0) - (keys.has("l") ? 1 : 0) + padState.gx;
  let iy = (keys.has("b") ? 1 : 0) - (keys.has("f") ? 1 : 0) + padState.gy;
  let sprint = keys.has("sprint") || padState.sprint;
  if (botWish) { ix = botWish.x; iy = botWish.z; sprint = botWish.sprint; }
  if (danceT > 0) { danceT -= dt; ix = 0; iy = 0; sprint = false; } // boogie lock
  const il = Math.hypot(ix, iy);
  let wx = 0, wz = 0;
  if (il > 0.01) {
    ix /= Math.max(1, il); iy /= Math.max(1, il);
    if (botWish) { wx = ix; wz = iy; }
    else {
      const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);
      const rx = -fz, rz = fx;
      wx = fx * -iy + rx * ix; wz = fz * -iy + rz * ix;
    }
  }
  const moving = il > 0.01;
  const spd = sprint && moving ? CFG.sprint : CFG.walk;
  vx += (wx * spd - vx) * Math.min(1, 10 * dt);
  vz += (wz * spd - vz) * Math.min(1, 10 * dt);
  px += vx * dt; pz += vz * dt;

  // colliders (trees/rocks) — circle push-out
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    const dx = px - c.x, dz = pz - c.z, d2 = dx * dx + dz * dz, rr = c.r + 0.5;
    if (d2 < rr * rr && d2 > 1e-6) {
      const d = Math.sqrt(d2);
      px = c.x + (dx / d) * rr; pz = c.z + (dz / d) * rr;
    }
  }
  // island bound — the water blocks
  const pr = Math.hypot(px, pz);
  if (pr > CFG.playableR) { px *= CFG.playableR / pr; pz *= CFG.playableR / pr; }

  // hop (cosmetic verb — never required to reach a node)
  if ((keys.has("jump") || padState.jump) && grounded && danceT <= 0) { vy = CFG.jumpV; grounded = false; }
  padState.jump = false;
  if (!grounded) {
    jumpY += vy * dt; vy -= CFG.gravity * dt;
    if (jumpY <= 0) { jumpY = 0; vy = 0; grounded = true; }
  }

  // --- the one bar ---
  bar -= CFG.drain * (sprint && moving ? CFG.sprintMult : 1) * dt;
  if (bar <= 0) { bar = 0; gameOver(); return; }

  // --- collect: day → dance, night → sky show ---
  for (let i = 0; i < nodePts.length; i++) {
    if (!nodeState[i].active) continue;
    const dx = px - nodePts[i].x, dz = pz - nodePts[i].z;
    if (dx * dx + dz * dz < CFG.collectR * CFG.collectR) {
      nodeState[i].active = false;
      respawnQ.push({ at: simT + CFG.respawn, idx: i });
      bar = Math.min(CFG.barMax, bar + CFG.refill);
      score++; collected++;
      const col = GUMMY_COLORS[nodeColor[i]];
      spawnBurst(nodePts[i].x, terrainH(nodePts[i].x, nodePts[i].z) + 1.0, nodePts[i].z, col);
      playSfx("pickup", 0.3);
      showToast(nodeColor[i]);
      if (nightFactor > 0.4) { showT = CFG.showLen; showFxT = 0; }
      else { danceT = CFG.danceLen; confettiT = 0; }
    }
  }
  // --- respawns ---
  for (let i = respawnQ.length - 1; i >= 0; i--) {
    if (respawnQ[i].at <= simT) {
      let idx = -1, guard = 0;
      while (guard++ < 40) {
        const k = (logicRng() * nodePts.length) | 0;
        if (!nodeState[k].active && !respawnQ.some(q => q.idx === k && q !== respawnQ[i])) { idx = k; break; }
      }
      if (idx >= 0) nodeState[idx].active = true;
      respawnQ.splice(i, 1);
    }
  }

  // --- player presentation state: hero faces the way they're walking ---
  // (keys steer/turn the character — S turns them around to walk toward the
  // camera; the mouse only orbits the camera to look around for gummies)
  const speed2 = Math.hypot(vx, vz);
  if (speed2 > 0.3) {
    const target = Math.atan2(-vx, -vz);
    let d = target - heading;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    heading += d * Math.min(1, 12 * dt);
  }
  walkCycle += speed2 * dt * 2.2;
  py = terrainH(px, pz);
}

// ---------- character animation (walk + per-style dance) ----------
function animateRig(r, realDt) {
  const speed = Math.hypot(vx, vz);
  const lean = Math.min(1, speed / CFG.sprint);
  let bounce = Math.abs(Math.sin(walkCycle * 3)) * 0.06 * Math.min(1, speed / CFG.walk);
  r.group.rotation.y = 0;
  r.group.rotation.z = 0;
  if (r.head) { r.head.rotation.x = 0; r.head.rotation.z = 0; }

  if (danceT > 0) {
    const ph = (CFG.danceLen - danceT) * 6;
    if (r.dance === "rave") {
      // arms up, waving; hips bouncing; a full spin mid-boogie
      r.armL.rotation.set(0, 0, -2.5 + Math.sin(ph * 1.8) * 0.5);
      r.armR.rotation.set(0, 0, 2.5 - Math.cos(ph * 1.8) * 0.5);
      r.legL.rotation.x = Math.sin(ph * 2) * 0.5;
      r.legR.rotation.x = -Math.sin(ph * 2) * 0.5;
      r.group.rotation.y = Math.sin(ph * 0.55) * Math.PI;
      bounce = Math.abs(Math.sin(ph * 1.6)) * 0.22;
      if (r.head) r.head.rotation.z = Math.sin(ph * 1.8) * 0.25;
    } else if (r.dance === "stomp") {
      // hearty side-to-side folk stomp, fists pumping
      r.armL.rotation.set(-1.1 + Math.sin(ph) * 0.7, 0, -0.4);
      r.armR.rotation.set(-1.1 - Math.sin(ph) * 0.7, 0, 0.4);
      r.legL.rotation.x = Math.max(0, Math.sin(ph)) * 0.9;
      r.legR.rotation.x = Math.max(0, -Math.sin(ph)) * 0.9;
      r.group.rotation.z = Math.sin(ph) * 0.14;
      bounce = Math.abs(Math.sin(ph)) * 0.14;
    } else {
      // goat pronk: stiff-legged hops + headbanging, cask swinging
      r.armL.rotation.x = 0.5; r.armR.rotation.x = 0.5;
      r.legL.rotation.x = -0.4; r.legR.rotation.x = -0.4;
      bounce = Math.abs(Math.sin(ph * 1.4)) * 0.34;
      if (r.head) r.head.rotation.x = Math.sin(ph * 2.8) * 0.55;
      if (r.cask) r.cask.rotation.x = Math.sin(ph * 2.8) * 0.3;
      r.group.rotation.y = Math.sin(ph * 0.4) * 0.6;
    }
  } else {
    const swing = Math.sin(walkCycle * 3) * 0.55 * lean;
    r.armL.rotation.set(swing, 0, -0.15 + (grounded ? 0 : -0.9));
    r.armR.rotation.set(-swing, 0, 0.15 + (grounded ? 0 : 0.9));
    r.legL.rotation.x = -swing * 1.1;
    r.legR.rotation.x = swing * 1.1;
    if (r.cask) r.cask.rotation.x = swing * 0.15;
  }
  if (r.boa) { r.boa.rotation.y += realDt * 0.6; r.boa.rotation.z = Math.sin(walkCycle * 2 + performance.now() * 0.002) * 0.07; }
  return bounce;
}

// ---------- per-frame presentation ----------
let prevShow = 0;
function present(realDt) {
  const phase = (simT % CFG.dayLen) / CFG.dayLen;
  updateSky(phase);

  // logo eases toward the camera's current bearing so it reliably drifts
  // back into frame instead of staying lost behind the player
  if (logoSprite) {
    let d = camYaw - logoYaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    logoYaw += d * Math.min(1, 0.8 * realDt);
    // negated: sin/cos(yaw) is the camera's OFFSET direction (behind the
    // player); the logo sits where the camera actually looks (through the
    // player and onward), the opposite way
    const fx = -Math.sin(logoYaw), fz = -Math.cos(logoYaw);
    logoSprite.position.set(px + fx * LOGO_DIST, LOGO_H, pz + fz * LOGO_DIST);
  }

  if (state === "select") {
    // heroes idling on the meadow behind the picker cards
    const t = performance.now() * 0.001;
    previewRigs.forEach((r, i) => {
      const bob = Math.sin(t * 2 + i * 2.1) * 0.04;
      r.group.position.y = terrainH(r.group.position.x, r.group.position.z) + Math.abs(bob);
      r.armL.rotation.z = -0.2 + Math.sin(t * 1.7 + i) * 0.12;
      r.armR.rotation.z = 0.2 - Math.sin(t * 1.7 + i) * 0.12;
      if (r.boa) r.boa.rotation.y += realDt * 0.5;
      if (r.head) r.head.rotation.y = Math.sin(t * 0.7 + i * 1.3) * 0.3;
    });
    camera.position.lerp(tmpV2.set(0, terrainH(0, 0) + 1.85, 0.6), Math.min(1, 6 * realDt));
    camera.lookAt(0, terrainH(0, -3.6) + 1.05, -3.6);
  } else if (rig) {
    const bounce = animateRig(rig, realDt);
    player.position.set(px, py + jumpY + bounce, pz);
    player.rotation.y = heading;
    rig.group.rotation.x = (danceT > 0 ? 0 : Math.min(1, Math.hypot(vx, vz) / CFG.sprint) * 0.14);
  }

  // gummies: wiggle (squash-stretch + wobble spin); inactive hidden
  for (let i = 0; i < nodePts.length; i++) {
    const n = nodePts[i], on = nodeState[i].active;
    if (on) {
      const h = terrainH(n.x, n.z) + 0.55 + Math.sin(simT * 2 + i * 1.7) * 0.1;
      tmpV.set(n.x, h, n.z);
      tmpE.set(Math.sin(simT * 6.1 + i * 2.3) * 0.14, simT * 1.4 + i, Math.sin(simT * 7.3 + i) * 0.12);
      tmpQ.setFromEuler(tmpE);
      const sq = Math.sin(simT * 6.3 + i * 2) * 0.09;
      tmpS.set(1 - sq * 0.6, 1 + sq, 1 - sq * 0.6).multiplyScalar(1 + nightFactor * 0.1);
      tmpM.compose(tmpV, tmpQ, tmpS);
      gummies.setMatrixAt(i, tmpM);
      halos[i].position.set(n.x, h, n.z);
      halos[i].scale.setScalar(2.1 + Math.sin(simT * 2.6 + i) * 0.3 + nightFactor * 0.7);
      halos[i].material.opacity = 0.4 + nightFactor * 0.45;
      halos[i].visible = true;
    } else {
      tmpS.setScalar(0.0001); tmpQ.identity(); tmpV.set(0, -50, 0);
      tmpM.compose(tmpV, tmpQ, tmpS);
      gummies.setMatrixAt(i, tmpM);
      halos[i].visible = false;
    }
  }
  gummies.instanceMatrix.needsUpdate = true;
  updatePool(bursts, realDt);
  updatePool(fireworks, realDt);
  updateComets(realDt);

  // night sky show: comets streak + fireworks pop while the timer runs
  if (showT > 0) {
    if (prevShow <= 0) { spawnComet(); spawnComet(); } // opening volley
    showT -= realDt;
    showFxT -= realDt;
    if (showFxT <= 0) {
      showFxT = 0.5;
      spawnComet();
      // fireworks bloom low over the sea near the horizon, biased into the
      // camera's view cone so the show is always on screen
      const viewAz = Math.atan2(-Math.cos(camYaw), -Math.sin(camYaw));
      const a = viewAz + (fxRng() - 0.5) * 1.6, r = 60 + fxRng() * 55;
      const palette = fxRng() > 0.5 ? GUMMY_COLORS : DROPS_BRAND;
      spawnFirework(px + Math.cos(a) * r, 10 + fxRng() * 9, pz + Math.sin(a) * r,
        palette[(fxRng() * palette.length) | 0]);
    }
  }
  prevShow = showT;
  // dance confetti pops around the boogieing hero
  if (danceT > 0 && state === "play") {
    confettiT -= realDt;
    if (confettiT <= 0) {
      confettiT = 0.45;
      spawnBurst(px + (fxRng() - 0.5) * 1.6, py + 1.3 + fxRng() * 0.6, pz + (fxRng() - 0.5) * 1.6,
        GUMMY_COLORS[(fxRng() * GUMMY_COLORS.length) | 0]);
    }
  }

  if (state === "select") return; // select camera set above

  // camera (pulls in when a tree/rock blocks the line of sight)
  tmpV.set(px, py + jumpY + 1.55, pz);
  const cp = Math.cos(camPitch), sp = Math.sin(camPitch);
  let camD = CFG.camDist;
  const dirX = Math.sin(camYaw) * cp, dirZ = Math.cos(camYaw) * cp;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    const rx = c.x - tmpV.x, rz = c.z - tmpV.z;
    const t = rx * dirX + rz * dirZ; // projection onto the view ray
    if (t < 1.0 || t > camD) continue;
    const cx = tmpV.x + dirX * t, cz = tmpV.z + dirZ * t;
    const d2 = (c.x - cx) ** 2 + (c.z - cz) ** 2, rr = c.r + 1.0;
    if (d2 < rr * rr) camD = Math.max(2.2, Math.min(camD, t - rr));
  }
  tmpV2.set(tmpV.x + Math.sin(camYaw) * cp * camD, tmpV.y + sp * camD, tmpV.z + Math.cos(camYaw) * cp * camD);
  const minY = Math.max(terrainH(tmpV2.x, tmpV2.z) + 0.5, 0.35);
  if (tmpV2.y < minY) tmpV2.y = minY;
  camera.position.lerp(tmpV2, Math.min(1, 14 * realDt));
  camera.lookAt(tmpV);
}

// ---------- HUD (throttled) ----------
let hudT = 0;
function updateHUD(realDt) {
  hudT -= realDt;
  if (hudT > 0) return;
  hudT = 0.15;
  el.energyFill.style.transform = `scaleX(${bar / CFG.barMax})`;
  el.energyWrap.classList.toggle("low", bar < 25);
  const phase = (simT % CFG.dayLen) / CFG.dayLen;
  const isNight = phase > 0.583 && phase < 0.94;
  el.cycleLabel.textContent = isNight ? STR.night : STR.day;
  // bar grows 0→100% across the CURRENT phase, then the label flips
  const NIGHT_A = 0.583, NIGHT_B = 0.94, DAY_LEN = 1 - (NIGHT_B - NIGHT_A);
  const prog = isNight
    ? (phase - NIGHT_A) / (NIGHT_B - NIGHT_A)
    : ((phase >= NIGHT_B ? phase - NIGHT_B : phase + (1 - NIGHT_B)) / DAY_LEN);
  el.cycleFill.style.width = `${Math.min(100, prog * 100).toFixed(1)}%`;
  const dot = isNight ? "#8fa8d8" : "#ffd9a0";
  el.cycleDot.style.background = dot; el.cycleDot.style.boxShadow = `0 0 10px ${dot}`;
  el.stats.innerHTML = `${STR.score}: <b>${score}</b><br>${STR.time}: <b>${fmtTime(survived)}</b>${best > 0 ? `<br>${STR.best}: <b>${fmtTime(best)}</b>` : ""}`;
}

// ---------- smoke route (§13.5): bot plays the reference route ----------
const smoke = { frames: 0, tReal: 0, warmup: 3, minFps: 1e9, sumFps: 0, buckets: 0, curBucket: 0, curT: 0, maxCalls: 0, maxTris: 0, done: false, stepMs: 0, stepN: 0, presMs: 0, presN: 0 };
function smokeBot() {
  if (IDLE) { botWish = { x: 0, z: 0, sprint: false }; return; }
  let bi = -1, bd = 1e9;
  for (let i = 0; i < nodePts.length; i++) {
    if (!nodeState[i].active) continue;
    const d = (nodePts[i].x - px) ** 2 + (nodePts[i].z - pz) ** 2;
    if (d < bd) { bd = d; bi = i; }
  }
  if (bi < 0) { botWish = null; return; }
  const dx = nodePts[bi].x - px, dz = nodePts[bi].z - pz, d = Math.sqrt(bd);
  botWish = { x: dx / d, z: dz / d, sprint: d > 18 && bar > 25 };
  camYaw += (Math.atan2(-dx, -dz) - camYaw) * 0.02;
}
function smokeTick(realDt) {
  if (smoke.done) return;
  smoke.tReal += realDt; smoke.curT += realDt; smoke.curBucket++;
  if (smoke.curT >= 1) {
    if (smoke.tReal > smoke.warmup) {
      const fps = smoke.curBucket / smoke.curT;
      smoke.sumFps += fps; smoke.buckets++;
      if (fps < smoke.minFps) smoke.minFps = fps;
    }
    smoke.curT = 0; smoke.curBucket = 0;
  }
  smoke.maxCalls = Math.max(smoke.maxCalls, renderer.info.render.calls);
  smoke.maxTris = Math.max(smoke.maxTris, renderer.info.render.triangles);
  if (IDLE ? (state === "over" || simT - START_T >= 150) : (simT - START_T >= 45 || state === "over")) {
    smoke.done = true;
    window.__SMOKE = {
      avgFps: +(smoke.sumFps / Math.max(1, smoke.buckets)).toFixed(1),
      minFps: +smoke.minFps.toFixed(1),
      drawCallsMax: smoke.maxCalls, trisMax: smoke.maxTris,
      avgStepMs: +(smoke.stepMs / Math.max(1, smoke.stepN)).toFixed(3),
      avgPresentMs: +(smoke.presMs / Math.max(1, smoke.presN)).toFixed(3),
      collected, bar: +bar.toFixed(1), alive: state === "play", simT: +simT.toFixed(1),
    };
    document.title = "SMOKE " + JSON.stringify(window.__SMOKE);
    console.log("[SMOKE]", JSON.stringify(window.__SMOKE));
  }
}

// ---------- main loop (fixed timestep; pause on blur) ----------
const STEP = 1000 / 60;
let acc = 0, last = performance.now(), paused = false;
addEventListener("blur", () => { paused = true; });
addEventListener("focus", () => { paused = false; last = performance.now(); });
let fpsFrames = 0, fpsAt = performance.now(), fpsNow = 0;
function frame(now) {
  if (!TICK) requestAnimationFrame(frame);
  if (paused) return;
  const realDt = Math.min(0.1, (now - last) / 1000);
  acc += now - last; last = now;
  if (state === "play") {
    if (SMOKE) smokeBot();
    let guard = 0;
    const t0 = SMOKE ? performance.now() : 0;
    while (acc >= STEP && guard++ < 5) {
      step(STEP / 1000);
      acc -= STEP;
      if (state !== "play") { acc = 0; break; }
    }
    if (SMOKE) { smoke.stepMs += performance.now() - t0; smoke.stepN += guard; }
    const t1 = SMOKE ? performance.now() : 0;
    present(realDt);
    if (SMOKE) { smoke.presMs += performance.now() - t1; smoke.presN++; }
    updateHUD(realDt);
  } else {
    acc = 0;
    present(realDt);
  }
  renderer.render(scene, camera);
  if (SMOKE) { smoke.frames++; smokeTick(realDt); }
  if (DEV && (fpsFrames++, now - fpsAt >= 500)) {
    fpsNow = Math.round(fpsFrames * 1000 / (now - fpsAt)); fpsFrames = 0; fpsAt = now;
    el.dev.textContent = `${fpsNow} fps | draws ${renderer.info.render.calls} | tris ${renderer.info.render.triangles} | seed ${BASE_SEED + runCount - 1} | bar ${bar === undefined ? "-" : bar.toFixed(0)}`;
  }
}

// boot
resetRun();
runCount = 0; // the boot layout run doesn't count against the seed sequence
state = "select";
camera.position.set(0, terrainH(0, 0) + 1.85, 0.6);
camera.lookAt(0, terrainH(0, -3.6) + 1.05, -3.6);
if (DEV || SMOKE) {
  window.__setCam = (yaw, pitch) => { camYaw = yaw; if (pitch !== undefined) camPitch = pitch; };
  // QA: trigger capture FX directly (visual verification without waiting on sim)
  window.__fx = {
    show: () => { showT = CFG.showLen; showFxT = 0; },
    dance: () => { danceT = CFG.danceLen; confettiT = 0; },
    kill: () => { bar = 0.01; }, // next sim step triggers game over
    debug: () => {
      let local = null, inView = null;
      if (logoSprite) {
        const p = logoSprite.position.clone();
        camera.worldToLocal(p); // three.js camera looks down -z
        local = p.toArray();
        const vFov = camera.fov * Math.PI / 180, hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
        inView = p.z < 0 && Math.abs(Math.atan2(p.x, -p.z)) < hFov / 2 && Math.abs(Math.atan2(p.y, -p.z)) < vFov / 2;
      }
      return { camYaw, camPitch, logoYaw, logoPos: logoSprite ? logoSprite.position.toArray() : null, camPos: camera.position.toArray(), px, pz, local, inView,
        opacity: logoSprite?.material.opacity, visible: logoSprite?.visible, aspect: camera.aspect, nightFactor };
    },
    magnet: () => { // teleport onto the nearest active gummy (capture test)
      let bi = -1, bd = 1e9;
      for (let i = 0; i < nodePts.length; i++) {
        if (!nodeState[i].active) continue;
        const d = (nodePts[i].x - px) ** 2 + (nodePts[i].z - pz) ** 2;
        if (d < bd) { bd = d; bi = i; }
      }
      if (bi >= 0) { px = nodePts[bi].x; pz = nodePts[bi].z; }
    },

    // step the sim n frames and render once (QA in throttled/hidden tabs)
    tick: (n = 60) => {
      for (let i = 0; i < n && state === "play"; i++) step(1 / 60);
      present(1 / 60);
      renderer.render(scene, camera);
      updateHUD(1);
      return { px: +px.toFixed(2), pz: +pz.toFixed(2), heading: +heading.toFixed(2), bar: +bar.toFixed(1), score };
    },
  };
}
if (SMOKE) { setCharacter(Q.get("char") || "rave"); startPlay(); }
else { showOverlay("select"); updateButtons(); }
if (TICK) setInterval(() => frame(performance.now()), 1000 / 60);
else requestAnimationFrame(frame);
