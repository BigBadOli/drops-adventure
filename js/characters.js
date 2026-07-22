// Procedural low-poly playable characters. All three share a rig interface:
// { group, armL, armR, legL, legR, head, boa?, cask?, mats, dance, height }
// Face points -z (matches the sim's heading math). Height ~1.7 world units.
import * as THREE from "../vendor/three.module.js";

export const CHAR_IDS = ["rave", "mountain", "goat"];
export const MUSIC_STYLE = { rave: "rave", mountain: "folk", goat: "polka" };

function mat(color, rough = 0.85) {
  const m = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: rough, metalness: 0 });
  m.emissive.setHex(color); m.emissiveIntensity = 0.06;
  return m;
}
function mesh(geo, m, x, y, z, parent) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}

function buildRave() {
  const group = new THREE.Group();
  const mats = [];
  const M = c => { const m2 = mat(c); mats.push(m2); return m2; };
  const skin = M(0xf0b98f), hairPink = M(0xff5fb0), outfit = M(0xff2f92),
    shorts = M(0x8a2be2), boots = M(0xff8ad0), glove = M(0xffe14d), dark = M(0x3a2b45);

  // legs (pivot at hip so they can kick)
  const legL = new THREE.Group(), legR = new THREE.Group();
  for (const [pivot, sx] of [[legL, -1], [legR, 1]]) {
    pivot.position.set(sx * 0.14, 0.64, 0);
    mesh(new THREE.CapsuleGeometry(0.085, 0.3, 3, 6), skin, 0, -0.26, 0, pivot);
    const boot = mesh(new THREE.SphereGeometry(0.13, 8, 6), boots, 0, -0.55, -0.03, pivot);
    boot.scale.set(1, 0.75, 1.5);
    group.add(pivot);
  }
  // hot-pants + sparkly skirt
  mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.2, 10), shorts, 0, 0.66, 0, group);
  mesh(new THREE.CylinderGeometry(0.22, 0.36, 0.14, 10), outfit, 0, 0.58, 0, group);
  // crop top torso + bare midriff
  mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.14, 10), skin, 0, 0.82, 0, group);
  const top = mesh(new THREE.CapsuleGeometry(0.21, 0.16, 4, 10), outfit, 0, 1.02, 0, group);
  top.scale.set(1, 0.9, 0.85);
  // arms
  const armL = new THREE.Group(), armR = new THREE.Group();
  for (const [pivot, sx] of [[armL, -1], [armR, 1]]) {
    pivot.position.set(sx * 0.3, 1.14, 0);
    mesh(new THREE.CapsuleGeometry(0.065, 0.24, 3, 6), skin, 0, -0.18, 0, pivot);
    mesh(new THREE.SphereGeometry(0.09, 8, 6), glove, 0, -0.36, 0, pivot);
    pivot.rotation.z = sx * -0.15;
    group.add(pivot);
  }
  // fluffy pink boa — ring of puffballs around the neck
  const boa = new THREE.Group();
  boa.position.y = 1.24;
  const boaFluff = M(0xff9ad5);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const p = mesh(new THREE.IcosahedronGeometry(0.085, 0), boaFluff,
      Math.cos(a) * 0.24, Math.sin(i * 2.1) * 0.035, Math.sin(a) * 0.24, boa);
    p.scale.setScalar(0.85 + ((i * 37) % 10) * 0.045);
  }
  // dangling boa ends
  mesh(new THREE.IcosahedronGeometry(0.08, 0), boaFluff, -0.2, -0.16, -0.14, boa);
  mesh(new THREE.IcosahedronGeometry(0.07, 0), boaFluff, -0.24, -0.32, -0.12, boa);
  group.add(boa);
  // head, hair buns, shades
  const head = new THREE.Group();
  head.position.set(0, 1.48, 0);
  mesh(new THREE.SphereGeometry(0.22, 12, 10), skin, 0, 0, 0, head);
  const cap = mesh(new THREE.SphereGeometry(0.23, 12, 10), hairPink, 0, 0.05, 0.05, head);
  cap.scale.set(1, 0.82, 0.9);
  mesh(new THREE.SphereGeometry(0.11, 8, 6), hairPink, -0.18, 0.2, 0.04, head);
  mesh(new THREE.SphereGeometry(0.11, 8, 6), hairPink, 0.18, 0.2, 0.04, head);
  const shades = mesh(new THREE.BoxGeometry(0.3, 0.07, 0.1), dark, 0, 0.03, -0.18, head);
  shades.rotation.x = 0.08;
  group.add(head);
  group.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { group, armL, armR, legL, legR, head, boa, mats, dance: "rave", height: 1.7 };
}

function buildMountain() {
  const group = new THREE.Group();
  const mats = [];
  const M = c => { const m2 = mat(c); mats.push(m2); return m2; };
  const skin = M(0xe8a877), flannel = M(0xc0392b), flannelD = M(0x7f2019),
    pants = M(0x5a5142), boots = M(0x4a352a), packG = M(0x3e6b4f), tan = M(0xd9c496),
    beardM = M(0x8a5a2b), capM = M(0xd97b29);

  const legL = new THREE.Group(), legR = new THREE.Group();
  for (const [pivot, sx] of [[legL, -1], [legR, 1]]) {
    pivot.position.set(sx * 0.15, 0.62, 0);
    mesh(new THREE.CapsuleGeometry(0.11, 0.28, 3, 6), pants, 0, -0.24, 0, pivot);
    const boot = mesh(new THREE.SphereGeometry(0.14, 8, 6), boots, 0, -0.52, -0.04, pivot);
    boot.scale.set(1, 0.7, 1.5);
    group.add(pivot);
  }
  // barrel chest flannel + darker plaid straps + belt
  const body = mesh(new THREE.CapsuleGeometry(0.3, 0.3, 4, 10), flannel, 0, 0.95, 0, group);
  body.scale.set(1, 1, 0.9);
  mesh(new THREE.CylinderGeometry(0.305, 0.325, 0.08, 10), flannelD, 0, 0.95, 0, group);
  mesh(new THREE.CylinderGeometry(0.29, 0.31, 0.09, 10), boots, 0, 0.68, 0, group);
  const armL = new THREE.Group(), armR = new THREE.Group();
  for (const [pivot, sx] of [[armL, -1], [armR, 1]]) {
    pivot.position.set(sx * 0.38, 1.16, 0);
    mesh(new THREE.CapsuleGeometry(0.09, 0.24, 3, 6), flannel, 0, -0.18, 0, pivot);
    mesh(new THREE.SphereGeometry(0.1, 8, 6), skin, 0, -0.38, 0, pivot);
    pivot.rotation.z = sx * -0.18;
    group.add(pivot);
  }
  // big green backpack with tan bedroll strapped on top
  mesh(new THREE.BoxGeometry(0.46, 0.5, 0.26), packG, 0, 1.0, 0.42, group);
  mesh(new THREE.BoxGeometry(0.3, 0.16, 0.1), tan, 0, 0.88, 0.57, group);
  const roll = mesh(new THREE.CapsuleGeometry(0.13, 0.34, 4, 8), tan, 0, 1.36, 0.44, group);
  roll.rotation.z = Math.PI / 2;
  for (const sx of [-1, 1]) {
    const cap2 = mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.05, 8), packG, sx * 0.16, 1.36, 0.44, group);
    cap2.rotation.z = Math.PI / 2;
  }
  // head with mighty beard + cap
  const head = new THREE.Group();
  head.position.set(0, 1.52, 0);
  mesh(new THREE.SphereGeometry(0.22, 12, 10), skin, 0, 0, 0, head);
  const beard = mesh(new THREE.ConeGeometry(0.16, 0.34, 8), beardM, 0, -0.18, -0.12, head);
  beard.rotation.x = Math.PI + 0.35;
  mesh(new THREE.SphereGeometry(0.05, 6, 5), skin, 0, 0.0, -0.22, head); // nose
  const brim = mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.09, 10), capM, 0, 0.16, 0.02, head);
  brim.rotation.x = 0.06;
  mesh(new THREE.SphereGeometry(0.2, 10, 8), capM, 0, 0.24, 0.03, head).scale.set(1, 0.6, 1);
  group.add(head);
  group.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { group, armL, armR, legL, legR, head, mats, dance: "stomp", height: 1.75 };
}

function buildGoat() {
  const group = new THREE.Group();
  const mats = [];
  const M = c => { const m2 = mat(c); mats.push(m2); return m2; };
  const fur = M(0xece3d2), furD = M(0xcfc4ae), hoof = M(0x4a4038),
    horn = M(0xb9b09e), wood = M(0x9a6b3f), band = M(0x4f3620), nose = M(0x3a2f2a);

  const legL = new THREE.Group(), legR = new THREE.Group();
  for (const [pivot, sx] of [[legL, -1], [legR, 1]]) {
    pivot.position.set(sx * 0.13, 0.6, 0);
    mesh(new THREE.CapsuleGeometry(0.08, 0.26, 3, 6), furD, 0, -0.22, 0, pivot);
    mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.12, 6), hoof, 0, -0.46, 0, pivot);
    group.add(pivot);
  }
  // shaggy body — two overlapping capsules, slight forward lean
  const body = mesh(new THREE.CapsuleGeometry(0.27, 0.3, 4, 10), fur, 0, 0.94, 0.02, group);
  body.rotation.x = 0.1;
  const shag = mesh(new THREE.IcosahedronGeometry(0.28, 0), fur, 0, 0.8, 0.06, group);
  shag.scale.set(1, 0.75, 1);
  // stubby tail
  const tail = mesh(new THREE.ConeGeometry(0.07, 0.18, 6), furD, 0, 1.02, 0.3, group);
  tail.rotation.x = -1.0;
  // front "arms"
  const armL = new THREE.Group(), armR = new THREE.Group();
  for (const [pivot, sx] of [[armL, -1], [armR, 1]]) {
    pivot.position.set(sx * 0.3, 1.12, -0.02);
    mesh(new THREE.CapsuleGeometry(0.07, 0.22, 3, 6), fur, 0, -0.16, 0, pivot);
    mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.1, 6), hoof, 0, -0.34, 0, pivot);
    pivot.rotation.z = sx * -0.14;
    group.add(pivot);
  }
  // wine cask slung on the chest — horizontal barrel + neck strap
  const cask = new THREE.Group();
  cask.position.set(0, 0.98, -0.3);
  const barrel = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.3, 10), wood, 0, 0, 0, cask);
  barrel.rotation.z = Math.PI / 2;
  const belly = mesh(new THREE.SphereGeometry(0.145, 10, 8), wood, 0, 0, 0, cask);
  belly.scale.set(1.15, 1, 1);
  for (const sx of [-0.1, 0.1]) {
    const ring = mesh(new THREE.TorusGeometry(0.135, 0.016, 6, 12), band, sx, 0, 0, cask);
    ring.rotation.y = Math.PI / 2;
  }
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 6), band, 0, 0.15, 0, cask); // spigot cap
  const strap = mesh(new THREE.TorusGeometry(0.21, 0.02, 6, 14), band, 0, 0.32, 0.13, cask);
  strap.rotation.x = 1.15;
  group.add(cask);
  // goat head — muzzle, chin beard, floppy ears, curved horns
  const head = new THREE.Group();
  head.position.set(0, 1.5, -0.04);
  mesh(new THREE.SphereGeometry(0.19, 10, 8), fur, 0, 0, 0, head);
  const muzzle = mesh(new THREE.BoxGeometry(0.15, 0.13, 0.2), fur, 0, -0.05, -0.2, head);
  muzzle.rotation.x = 0.15;
  mesh(new THREE.BoxGeometry(0.08, 0.05, 0.06), nose, 0, -0.03, -0.3, head);
  const beard = mesh(new THREE.ConeGeometry(0.05, 0.18, 6), furD, 0, -0.19, -0.2, head);
  beard.rotation.x = Math.PI - 0.35;
  for (const sx of [-1, 1]) {
    const ear = mesh(new THREE.SphereGeometry(0.07, 6, 5), furD, sx * 0.2, 0.02, 0.02, head);
    ear.scale.set(1.6, 0.55, 0.8);
    ear.rotation.z = sx * -0.45;
    const h = mesh(new THREE.TorusGeometry(0.13, 0.035, 6, 10, 2.3), horn, sx * 0.1, 0.14, 0.05, head);
    h.rotation.set(0.5, sx * 0.5, sx * -1.5); // sweep up and back
  }
  group.add(head);
  group.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { group, armL, armR, legL, legR, head, cask, mats, dance: "pronk", height: 1.65 };
}

export function buildCharacter(id) {
  if (id === "rave") return buildRave();
  if (id === "mountain") return buildMountain();
  return buildGoat();
}
