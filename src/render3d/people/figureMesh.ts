import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Detail } from '../../model/settings';
import { SCENE } from '../sceneConfig';

/**
 * The captain: the owner's mockup (docs/mockups/sailor-draft.html) ported to one skinned mesh
 * with vertex colours (PHASE_PEOPLE_SPEC 7.6). The mockup's group tree is built first, at rest
 * and with the figure's root at the origin; each joint group becomes a bone and every part is
 * baked into one geometry, weighted fully to the nearest joint above it. He is 1.75 m tall
 * without his cap, stands on y = 0 and faces +z (the mockup's frame; `captain.ts` turns him).
 */

export const BONE_NAMES = [
  'root',
  'torso',
  'neck',
  'browHolder_l',
  'brow_l',
  'browHolder_r',
  'brow_r',
  'shoulder_l',
  'elbow_l',
  'shoulder_r',
  'elbow_r',
  'hip_l',
  'knee_l',
  'ankle_l',
  'hip_r',
  'knee_r',
  'ankle_r',
] as const;
export type BoneName = (typeof BONE_NAMES)[number];

export interface FigureMesh {
  mesh: THREE.SkinnedMesh;
  bones: Record<BoneName, THREE.Bone>;
}

interface Section {
  y: number;
  rx: number;
  rz: number;
  x?: number;
  z?: number;
}
interface Ball {
  pos: THREE.Vector3;
  r: number;
}
type Vec3Tuple = [number, number, number];

const Z_AXIS = new THREE.Vector3(0, 0, 1);

function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Linear value of a section field at height y. */
function secAt(secs: readonly Section[], y: number, key: 'rx' | 'rz' | 'z'): number {
  for (let i = 1; i < secs.length; i += 1) {
    const a = secs[i - 1];
    const b = secs[i];
    if (!a || !b) continue;
    if (y <= b.y || i === secs.length - 1) {
      const t = Math.min(1, Math.max(0, (y - a.y) / (b.y - a.y || 1)));
      const av = a[key] ?? 0;
      return av + ((b[key] ?? 0) - av) * t;
    }
  }
  return 0;
}

export function buildFigureMesh(detail: Detail): FigureMesh {
  const low = detail === 'low';
  const C = SCENE.people.colours;
  const D = SCENE.people.body;
  const HD = SCENE.people.head;
  const hipY = D.ankleY + D.shin + D.thigh;

  /** Half the segments, rounded up, but not below `min` (Low detail, 7.6 rule 7). */
  const seg = (n: number, min: number) => (low ? Math.max(min, Math.ceil(n / 2)) : n);
  const sphere = (r: number, w: number, h: number) =>
    new THREE.SphereGeometry(r, seg(w, 6), seg(h, 3));
  const cylinder = (
    rt: number,
    rb: number,
    h: number,
    radial: number,
    open: boolean,
    thetaStart: number,
    thetaLength: number,
  ) => new THREE.CylinderGeometry(rt, rb, h, seg(radial, 6), 1, open, thetaStart, thetaLength);
  const torus = (r: number, tube: number, tubeSeg: number, round: number) =>
    new THREE.TorusGeometry(r, tube, seg(tubeSeg, 3), seg(round, 6));

  /** A joint or plain group; a joint carries the name of its bone. */
  const pivot = (parent: THREE.Object3D, pos: Vec3Tuple = [0, 0, 0], bone?: BoneName) => {
    const g = new THREE.Group();
    g.position.set(...pos);
    if (bone) g.userData.bone = bone;
    parent.add(g);
    return g;
  };
  const add = (
    parent: THREE.Object3D,
    geom: THREE.BufferGeometry,
    colour: number,
    pos: Vec3Tuple = [0, 0, 0],
    rot: Vec3Tuple = [0, 0, 0],
    scl: Vec3Tuple = [1, 1, 1],
  ) => {
    const m = new THREE.Mesh(geom);
    m.position.set(...pos);
    m.rotation.set(...rot);
    m.scale.set(...scl);
    m.userData.colour = colour;
    parent.add(m);
    return m;
  };

  /**
   * A smooth body part lofted through oval cross-sections, bottom first. Each section is
   * { y, rx, rz, x?, z? } (half width, half depth, centre offset).
   */
  const loft = (
    secs: readonly Section[],
    radialWanted: number,
    caps: { top?: boolean; bottom?: boolean } = {},
  ) => {
    const radial = seg(radialWanted, 6);
    const pos: number[] = [];
    const idx: number[] = [];
    for (const s of secs) {
      for (let j = 0; j < radial; j += 1) {
        const a = (j / radial) * Math.PI * 2;
        pos.push((s.x ?? 0) + Math.sin(a) * s.rx, s.y, (s.z ?? 0) + Math.cos(a) * s.rz);
      }
    }
    for (let i = 0; i < secs.length - 1; i += 1) {
      for (let j = 0; j < radial; j += 1) {
        const a = i * radial + j;
        const b = i * radial + ((j + 1) % radial);
        const c = a + radial;
        const d = b + radial;
        idx.push(a, b, c, b, d, c);
      }
    }
    const addCap = (s: Section, top: boolean) => {
      const base = pos.length / 3;
      pos.push(s.x ?? 0, s.y, s.z ?? 0);
      for (let j = 0; j < radial; j += 1) {
        const a = (j / radial) * Math.PI * 2;
        pos.push((s.x ?? 0) + Math.sin(a) * s.rx, s.y, (s.z ?? 0) + Math.cos(a) * s.rz);
      }
      for (let j = 0; j < radial; j += 1) {
        const p = base + 1 + j;
        const q = base + 1 + ((j + 1) % radial);
        if (top) idx.push(base, p, q);
        else idx.push(base, q, p);
      }
    };
    const first = secs[0];
    const last = secs[secs.length - 1];
    if (caps.top && last) addCap(last, true);
    if (caps.bottom && first) addCap(first, false);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };

  /* ---------- the head: an egg with a narrower jaw ---------- */
  const headPoint = (d: THREE.Vector3) => {
    const k = d.y < 0 ? Math.pow(-d.y, 1.3) : 0;
    return new THREE.Vector3(
      HD.a * d.x * (1 - 0.22 * k),
      HD.b * d.y,
      HD.c * d.z * (1 - 0.16 * k) + 0.012 * k * Math.max(d.z, 0),
    );
  };
  const headNormal = (d: THREE.Vector3) => {
    const k = d.y < 0 ? Math.pow(-d.y, 1.3) : 0;
    return new THREE.Vector3(
      d.x / (HD.a * (1 - 0.22 * k)),
      d.y / HD.b,
      d.z / (HD.c * (1 - 0.16 * k)),
    ).normalize();
  };
  /** Direction on the head from an angle round it (0 = front, + = his left) and a height e. */
  const dirOf = (alpha: number, e: number) => {
    const rho = Math.sqrt(Math.max(0, 1 - e * e));
    return new THREE.Vector3(Math.sin(alpha) * rho, e, Math.cos(alpha) * rho);
  };
  const headGeometry = () => {
    const g = sphere(1, 26, 18);
    const p = g.attributes.position;
    const n = g.attributes.normal;
    if (!p || !n) throw new Error('figureMesh: sphere without attributes');
    const d = new THREE.Vector3();
    for (let i = 0; i < p.count; i += 1) {
      d.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
      const q = headPoint(d);
      const m = headNormal(d);
      p.setXYZ(i, q.x, q.y, q.z);
      n.setXYZ(i, m.x, m.y, m.z);
    }
    return g;
  };

  const figure = new THREE.Group();
  figure.userData.bone = 'root';
  const rnd = rng(11);

  /* ---------- torso: the jacket body, one smooth shape ---------- */
  const TS: Section[] = [
    { y: -0.1, rx: 0.182, rz: 0.125 },
    { y: 0.02, rx: 0.17, rz: 0.116 },
    { y: 0.14, rx: 0.15, rz: 0.108 },
    { y: 0.28, rx: 0.172, rz: 0.122, z: 0.004 },
    { y: 0.4, rx: 0.18, rz: 0.12 },
    { y: 0.46, rx: 0.182, rz: 0.104 },
    { y: 0.505, rx: 0.14, rz: 0.088 },
    { y: 0.55, rx: 0.07, rz: 0.062 },
  ];
  /** Front surface of the torso at sideways x and height y. */
  const surfZ = (x: number, y: number) => {
    const rx = secAt(TS, y, 'rx');
    const rz = secAt(TS, y, 'rz');
    const z0 = secAt(TS, y, 'z');
    return z0 + rz * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2));
  };

  /* ---------- legs: hip, knee, ankle on each side (+x is his left) ---------- */
  for (const side of [1, -1] as const) {
    const s = side === 1 ? 'l' : 'r';
    const hip = pivot(figure, [side * 0.09, hipY, 0], `hip_${s}`);
    add(hip, sphere(0.084, 12, 8), C.trousers);
    add(
      hip,
      loft(
        [
          { y: -0.45, rx: 0.062, rz: 0.066 },
          { y: -0.3, rx: 0.072, rz: 0.078 },
          { y: -0.12, rx: 0.084, rz: 0.088 },
          { y: 0, rx: 0.084, rz: 0.084 },
        ],
        14,
      ),
      C.trousers,
    );
    const knee = pivot(hip, [0, -D.thigh, 0], `knee_${s}`);
    add(knee, sphere(0.062, 12, 8), C.trousers);
    add(
      knee,
      loft(
        [
          { y: -0.4, rx: 0.05, rz: 0.054 },
          { y: -0.28, rx: 0.056, rz: 0.06 },
          { y: -0.12, rx: 0.064, rz: 0.068 },
          { y: 0, rx: 0.062, rz: 0.064 },
        ],
        14,
        { bottom: true },
      ),
      C.trousers,
    );
    const ankle = pivot(knee, [0, -D.shin, 0], `ankle_${s}`);
    add(ankle, sphere(1, 12, 8), C.shoe, [0, -0.04, 0.05], [0, 0, 0], [0.05, 0.045, 0.13]); // leather deck shoe
    add(ankle, sphere(1, 12, 6), C.sole, [0, -0.07, 0.052], [0, 0, 0], [0.053, 0.012, 0.136]); // pale sole
  }

  const torso = pivot(figure, [0, hipY, 0], 'torso');
  add(
    torso,
    loft(
      [
        { y: -0.14, rx: 0.15, rz: 0.105 },
        { y: -0.04, rx: 0.16, rz: 0.112 },
      ],
      18,
    ),
    C.trousers,
  ); // pelvis under the jacket
  add(torso, loft(TS, 22, { top: true, bottom: true }), C.jacket);

  // epaulettes with four gold bars: a captain
  for (const side of [1, -1] as const) {
    const ep = pivot(torso, [side * 0.14, 0.488, 0]);
    ep.rotation.z = -side * 0.28;
    add(ep, new THREE.BoxGeometry(0.1, 0.01, 0.052), C.jacketLight);
    for (let i = 0; i < 4; i += 1) {
      add(ep, new THREE.BoxGeometry(0.006, 0.012, 0.054), C.gold, [
        side * (-0.034 + i * 0.016),
        0.001,
        0,
      ]);
    }
  }

  // neck
  const neck = pivot(torso, [0, D.neckUp, 0], 'neck');
  add(
    neck,
    loft(
      [
        { y: -0.05, rx: 0.052, rz: 0.054 },
        { y: 0.07, rx: 0.05, rz: 0.052 },
      ],
      14,
    ),
    C.skin,
  );

  // jacket details: zip, pocket flaps and a stand-up collar
  for (let i = 0; i < 18; i += 1) {
    const y = -0.09 + i * 0.03;
    add(
      torso,
      new THREE.BoxGeometry(0.01, 0.034, 0.004),
      C.zip,
      [0, y + 0.015, surfZ(0, y + 0.015) + 0.001],
      [-0.02, 0, 0],
    );
  }
  for (const side of [1, -1] as const) {
    const x = side * 0.085;
    const y = 0.04;
    add(
      torso,
      new THREE.BoxGeometry(0.075, 0.026, 0.008),
      C.jacketLight,
      [x, y, surfZ(x, y) + 0.003],
      [0, side * 0.5, 0],
    );
  }
  add(
    torso,
    loft(
      [
        { y: 0.5, rx: 0.066, rz: 0.068 },
        { y: 0.575, rx: 0.062, rz: 0.062 },
      ],
      16,
    ),
    C.jacket,
    [0, 0, 0.004],
  ); // stand-up collar

  /* ---------- arms: shoulder and elbow on each side, sleeves with gold cuff stripes ---------- */
  const UP: Section[] = [
    { y: -0.3, rx: 0.043, rz: 0.045 },
    { y: -0.15, rx: 0.048, rz: 0.05 },
    { y: -0.02, rx: 0.052, rz: 0.053 },
    { y: 0.0, rx: 0.05, rz: 0.05 },
  ];
  const FORE: Section[] = [
    { y: -0.27, rx: 0.037, rz: 0.039 },
    { y: -0.2, rx: 0.038, rz: 0.041 },
    { y: -0.08, rx: 0.042, rz: 0.046 },
    { y: 0.0, rx: 0.044, rz: 0.046 },
  ];
  for (const side of [1, -1] as const) {
    const s = side === 1 ? 'l' : 'r';
    const sh = pivot(torso, [side * 0.188, 0.462, 0], `shoulder_${s}`);
    add(sh, sphere(0.05, 14, 10), C.jacket);
    add(sh, loft(UP, 14), C.jacket);
    const el = pivot(sh, [0, -0.3, 0], `elbow_${s}`);
    add(el, sphere(0.046, 12, 8), C.jacket);
    add(el, loft(FORE, 14, { bottom: true }), C.jacket);
    for (const y of [-0.215, -0.235]) {
      const r = secAt(FORE, y, 'rx') + 0.001;
      add(
        el,
        torus(r, 0.0028, 4, 18),
        C.gold,
        [0, y, 0],
        [Math.PI / 2, 0, 0],
        [1, secAt(FORE, y, 'rz') / secAt(FORE, y, 'rx'), 1],
      );
    }
    // the hand: a flat mitten and a thumb, no fingers
    add(el, sphere(1, 12, 10), C.skin, [0, -0.332, 0.002], [0, 0, 0], [0.036, 0.08, 0.02]);
    add(
      el,
      sphere(1, 8, 6),
      C.skin,
      [side * 0.005, -0.31, 0.026],
      [0.3, 0, 0],
      [0.012, 0.036, 0.013],
    );
  }

  /* ---------- head ---------- */
  const head = pivot(neck, [0, D.headUp, 0.008]);
  add(head, headGeometry(), C.skin);
  for (const s of [1, -1]) {
    add(
      head,
      sphere(1, 8, 6),
      C.skin,
      [s * (HD.a - 0.002), -0.006, -0.006],
      [0, 0, 0],
      [0.011, 0.03, 0.02],
    ); // ears
  }
  const place = (obj: THREE.Object3D, d: THREE.Vector3, push = 0) => {
    const n = headNormal(d);
    obj.position.copy(headPoint(d)).addScaledVector(n, push);
    obj.quaternion.setFromUnitVectors(Z_AXIS, n);
  };

  // eyes and nose are left out on purpose; big black eyebrows: a row of overlapping balls
  for (const s of [1, -1] as const) {
    const side = s === 1 ? 'l' : 'r';
    const holder = new THREE.Group();
    holder.userData.bone = `browHolder_${side}`;
    place(holder, dirOf(s * 0.5, 0.25), 0.004);
    holder.rotateZ(s * 0.1);
    const brow = pivot(holder, [0, 0, 0], `brow_${side}`);
    for (let i = 0; i < 7; i += 1) {
      const u = i / 6 - 0.5; // -0.5 .. 0.5
      const r = 0.0115 + 0.0025 * (1 - Math.abs(u) * 2);
      const rx = rnd() * 6;
      const ry = rnd() * 6;
      add(
        brow,
        sphere(1, 6, 4),
        C.hair,
        [u * 0.068, 0.006 * (1 - (u * 2) ** 2), 0],
        [rx, ry, 0],
        [r * 1.35, r, r * 1.1],
      );
    }
    head.add(holder);
  }

  // hair and beard: black curls made of many small round balls
  const balls: Ball[] = [];
  const ball = (alpha: number, e: number, r: number, out = 0.4) => {
    const d = dirOf(alpha, e);
    balls.push({ pos: headPoint(d).addScaledVector(headNormal(d), r * out), r });
  };
  const mouthDir = new THREE.Vector3(0.12, -0.42, 0.9).normalize();
  const mouth = headPoint(mouthDir);
  let rowNo = 0;
  /** Balls along a ring at height e from angle a0 to a1: equal gaps, one size, the next ring shifted half a gap. */
  const ring = (e: number, a0: number, a1: number, step: number, r: number, out: number) => {
    const rho = Math.max(Math.sqrt(1 - e * e), 0.25);
    const n = Math.max(1, Math.round((a1 - a0) / (step / (0.09 * rho))));
    const da = (a1 - a0) / n;
    const shift = 0.25 + 0.5 * (rowNo % 2);
    for (let k = 0; k < n; k += 1) {
      const a = a0 + (k + shift) * da;
      if (headPoint(dirOf(a, e)).distanceTo(mouth) < 0.026) continue; // the beard leaves a gap at the mouth
      ball(a, e, r, out);
    }
  };
  const row = (e: number, amin: number, amax: number, step: number, r: number, out: number) => {
    ring(e, amin, amax, step, r, out);
    ring(e, -amax, -amin, step, r, out);
    rowNo += 1;
  };
  // beard: jaw, chin, moustache, sideburns
  for (const e of [-0.96, -0.8, -0.64, -0.48, -0.34]) row(e, 0, 1.95, 0.031, 0.02, 0.4);
  row(-0.2, 0.12, 1.6, 0.031, 0.02, 0.4);
  row(-0.06, 1.1, 1.6, 0.031, 0.02, 0.4);
  for (let k = 0; k < 3; k += 1) {
    // the beard hangs below the chin
    const n = [5, 3, 1][k] ?? 1;
    for (let i = 0; i < n; i += 1) {
      const x = n === 1 ? 0 : (i / (n - 1) - 0.5) * 0.07 * (1 - k * 0.35);
      balls.push({
        pos: new THREE.Vector3(x, -HD.b - 0.004 - k * 0.02, 0.03 + k * 0.006),
        r: 0.02 - k * 0.003,
      });
    }
  }
  // hair: sides and back (the cap hides the crown, which is left out)
  for (const e of [0.46, 0.28, 0.1, -0.08]) row(e, 1.0, Math.PI + 0.01, 0.031, 0.02, 0.45);

  const ballGeo = low ? new THREE.OctahedronGeometry(1, 0) : new THREE.SphereGeometry(1, 7, 5);
  const hairBalls = new THREE.InstancedMesh(ballGeo, new THREE.MeshBasicMaterial(), balls.length);
  {
    const o = new THREE.Object3D();
    balls.forEach((b, i) => {
      o.position.copy(b.pos);
      o.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6);
      o.scale.setScalar(b.r);
      o.updateMatrix();
      hairBalls.setMatrixAt(i, o.matrix);
    });
  }
  hairBalls.userData.colour = C.hair;
  head.add(hairBalls);

  // captain's cap: white crown, dark blue band with a thin gold line, black peak
  const cap = pivot(head, [0, 0.016, -0.004]);
  cap.rotation.set(-0.05, 0, 0.04);
  add(
    cap,
    loft(
      [
        { y: 0.055, rx: 0.085, rz: 0.104 },
        { y: 0.095, rx: 0.088, rz: 0.107 },
      ],
      24,
    ),
    C.capBand,
  );
  add(
    cap,
    loft(
      [
        { y: 0.095, rx: 0.088, rz: 0.107 },
        { y: 0.116, rx: 0.114, rz: 0.134 },
        { y: 0.136, rx: 0.12, rz: 0.14 },
        { y: 0.15, rx: 0.114, rz: 0.134 },
        { y: 0.158, rx: 0.1, rz: 0.118 },
      ],
      24,
      { top: true },
    ),
    C.capWhite,
  );
  add(
    cap,
    torus(1, 0.04, 4, 24),
    C.gold,
    [0, 0.093, 0],
    [Math.PI / 2, 0, 0],
    [0.0885, 0.1075, 0.09],
  ); // thin gold line on the band
  const visor = pivot(cap, [0, 0.062, 0.085]);
  visor.rotation.x = 0.14;
  add(
    visor,
    cylinder(1, 1, 0.006, 24, false, -Math.PI / 2, Math.PI),
    C.visor,
    [0, 0, 0],
    [0, 0, 0],
    [0.09, 1, 0.09],
  );

  /* ---------- bones: one per joint group, at its rest transform ---------- */
  figure.updateMatrixWorld(true);
  const groups = {} as Record<BoneName, THREE.Object3D>;
  figure.traverse((o) => {
    const name = o.userData.bone as BoneName | undefined;
    if (name) groups[name] = o;
  });
  const bones = {} as Record<BoneName, THREE.Bone>;
  for (const name of BONE_NAMES) {
    const bone = new THREE.Bone();
    bone.name = name;
    bones[name] = bone;
  }
  const jointAbove = (o: THREE.Object3D): BoneName | null => {
    let p = o.parent;
    while (p) {
      const name = p.userData.bone as BoneName | undefined;
      if (name) return name;
      p = p.parent;
    }
    return null;
  };
  for (const name of BONE_NAMES) {
    const group = groups[name];
    const parentName = jointAbove(group);
    const m = new THREE.Matrix4().copy(group.matrixWorld);
    if (parentName) {
      m.premultiply(new THREE.Matrix4().copy(groups[parentName].matrixWorld).invert());
      bones[parentName].add(bones[name]);
    }
    m.decompose(bones[name].position, bones[name].quaternion, bones[name].scale);
  }

  /* ---------- one geometry: every part, in figure space, weighted to its bone ---------- */
  const parts: THREE.BufferGeometry[] = [];
  const colour = new THREE.Color();
  const boneIndex = new Map<string, number>(BONE_NAMES.map((n, i) => [n, i]));
  const bake = (mesh: THREE.Mesh, g: THREE.BufferGeometry) => {
    const plain = g.index ? g.toNonIndexed() : g;
    for (const name of Object.keys(plain.attributes)) {
      if (name !== 'position' && name !== 'normal') plain.deleteAttribute(name);
    }
    const n = plain.attributes.position?.count ?? 0;
    colour.set(mesh.userData.colour as number);
    const bone = boneIndex.get(jointAbove(mesh) ?? 'root') ?? 0;
    const rgb = new Float32Array(n * 3);
    const skinIndex = new Uint16Array(n * 4);
    const skinWeight = new Float32Array(n * 4);
    for (let i = 0; i < n; i += 1) {
      rgb.set([colour.r, colour.g, colour.b], i * 3);
      skinIndex[i * 4] = bone;
      skinWeight[i * 4] = 1;
    }
    plain.setAttribute('color', new THREE.BufferAttribute(rgb, 3));
    plain.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
    plain.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
    parts.push(plain);
  };
  figure.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    if (o instanceof THREE.InstancedMesh) {
      const m = new THREE.Matrix4();
      for (let i = 0; i < o.count; i += 1) {
        o.getMatrixAt(i, m);
        const g = o.geometry.clone().applyMatrix4(m).applyMatrix4(o.matrixWorld);
        bake(o, g);
      }
      return;
    }
    bake(o, o.geometry.clone().applyMatrix4(o.matrixWorld));
  });
  const geometry = mergeGeometries(parts, false);
  if (!geometry) throw new Error('figureMesh: the parts did not merge');

  const material = low
    ? new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })
    : new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.8,
        metalness: 0,
        side: THREE.DoubleSide,
      });
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name = 'captain_body';
  mesh.add(bones.root);
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(BONE_NAMES.map((n) => bones[n])));
  mesh.frustumCulled = false;
  return { mesh, bones };
}
