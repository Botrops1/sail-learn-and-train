import * as THREE from 'three';
import { boat } from '../../model/boat';
import type { Detail } from '../../model/settings';
import { onWinchDrum, type RopeDrawing } from '../../model/ropePaths';
import { smoothDrawings, transportFrames, type DrawnStrand } from '../../model/ropeSmooth';
import type { Vec3 } from '../../model/vec3';
import { SCENE } from '../sceneConfig';
import { asThin, partMesh, type PartUserData, type PickSegment } from './parts';
import { braidNormalTexture } from './textures';

/**
 * Ropes drawn as thin tubes (PHASE1_SPEC 8.7) in their teaching colour (7.3), with a stripe
 * pattern that slides along the rope as it is hauled or eased. Buffers are made once and
 * refilled every frame. Each rope is one mesh with its registry id (`rope_*`).
 */
export interface RopeMeshes {
  objects: THREE.Mesh[];
  /** M60: what the last update drew (a browser-check hook, `__sailDebug.ropeStats`). */
  stats(): RopeStats;
  /** `flashing`: ropes running out now, drawn in the flash colour (Realistic mode). */
  update(drawings: RopeDrawing[], view?: RopeView, flashing?: ReadonlySet<string>): void;
}

/** M60: counts over every rope as last drawn. */
export interface RopeStats {
  strands: number;
  /** Drawn points over all strands (the rounded corners and the whipping points included). */
  points: number;
  /** Strands with a whipped tail. */
  whipped: number;
  radialSegments: number;
  /** False if any position written in the last update is not a finite number. */
  finite: boolean;
  /** True when the rope materials have the braid normal map (High). */
  braid: boolean;
}

/**
 * Where the camera is, so ropes far away can be drawn thicker than their 3D radius and stay
 * visible on a phone (at least `SCENE.ropes.minScreenWidthPx` across).
 */
export interface RopeView {
  eye: Vec3;
  /** Size of one screen pixel (CSS px), in metres, at 1 m from the camera. */
  metresPerPixelAt1m: number;
}

/**
 * Tube radius at a point: the data's radius (the thinner `drumRenderRadius` on a winch drum,
 * M34), or more if that would be too thin on screen.
 */
function radiusAt(p: Vec3, view: RopeView | undefined): number {
  const radius = onWinchDrum(p)
    ? boat.modelDetail.winchRope.drumRenderRadius
    : boat.visual.ropeRenderRadius;
  return screenRadius(radius, p, view);
}

/** `radius`, or more if that would be thinner than `minScreenWidthPx` on screen at point `p` (world frame). M44: the mooring lines use it too. */
export function screenRadius(radius: number, p: Vec3, view: RopeView | undefined): number {
  if (!view) return radius;
  const distanceToEye = Math.hypot(p[0] - view.eye[0], p[1] - view.eye[1], p[2] - view.eye[2]);
  const minimum = (SCENE.ropes.minScreenWidthPx / 2) * view.metresPerPixelAt1m * distanceToEye;
  return Math.max(radius, minimum);
}

type ColorKey = keyof typeof SCENE.ropes.colors;

function colorKeyOf(id: string): ColorKey {
  const rope = boat.ropes.list.find((candidate) => candidate.id === id);
  const key = rope?.colorKey;
  if (!key || !(key in SCENE.ropes.colors)) throw new Error(`No rope colour for ${id}.`);
  return key as ColorKey;
}

/** A light rope with darker bands every `stripePeriodM` (multiplied with the rope colour). */
function stripeTexture(): THREE.DataTexture {
  const { stripeTexels, stripeDarkTexels, stripeDarkness } = SCENE.ropes;
  const data = new Uint8Array(stripeTexels * 4);
  for (let i = 0; i < stripeTexels; i += 1) {
    const value = i < stripeTexels - stripeDarkTexels ? 255 : Math.round(255 * stripeDarkness);
    data.set([value, value, value, 255], i * 4);
  }
  const texture = new THREE.DataTexture(data, stripeTexels, 1);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

interface RopeMesh {
  mesh: THREE.Mesh<THREE.BufferGeometry>;
  material: THREE.MeshLambertMaterial;
  colorKey: ColorKey;
  /** Drawn points per strand and where the whipping starts, as built. */
  layout: string;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
}

/** What `buildRopes` chose once: the tube's number of sides. */
interface Tube {
  radial: number;
}

function layoutOf(strands: readonly DrawnStrand[]): string {
  return strands.map((strand) => `${strand.points.length}:${strand.whipFrom ?? ''}`).join();
}

/** Vertices of one strand: `radial + 1` per ring (the last repeats the first, for the texture), then two cap centres. */
function strandVertices(count: number, tube: Tube): number {
  return count * (tube.radial + 1) + 2;
}

function buildGeometry(
  strands: readonly DrawnStrand[],
  tube: Tube,
): {
  geometry: THREE.BufferGeometry;
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
} {
  const { radial } = tube;
  const stride = radial + 1;
  // Each strand: its rings, then the centres of its two end caps (M34, sealed rope ends).
  const vertexCount = strands.reduce((sum, s) => sum + strandVertices(s.points.length, tube), 0);
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const colors = new Float32Array(vertexCount * 3).fill(1);
  const indices: number[] = [];
  let base = 0;
  for (const strand of strands) {
    const count = strand.points.length;
    for (let i = 0; i < count - 1; i += 1) {
      for (let j = 0; j < radial; j += 1) {
        const a = base + i * stride + j;
        const b = a + 1;
        const c = a + stride;
        const d = b + stride;
        indices.push(a, b, c, b, d, c);
      }
    }
    const startCentre = base + count * stride;
    const last = base + (count - 1) * stride;
    for (let j = 0; j < radial; j += 1) {
      indices.push(startCentre, base + j + 1, base + j);
      indices.push(startCentre + 1, last + j, last + j + 1);
    }
    // The whipped rings and the end cap's centre get the whipping colour (once, here).
    if (strand.whipFrom !== null) {
      const whip = new THREE.Color(SCENE.ropes.whipColour);
      const from = base + strand.whipFrom * stride;
      for (let k = from; k < startCentre; k += 1) whip.toArray(colors, k * 3);
      whip.toArray(colors, (startCentre + 1) * 3);
    }
    base += strandVertices(count, tube);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  return { geometry, positions, normals, uvs };
}

/**
 * Writes one drawn strand's tube into the buffers, starting at vertex `base`. Returns false if
 * a position came out not finite.
 */
function writeStrand(
  rope: RopeMesh,
  base: number,
  strand: DrawnStrand,
  view: RopeView | undefined,
  tube: Tube,
): boolean {
  const { radial } = tube;
  const stride = radial + 1;
  const period = SCENE.ropes.stripePeriodM;
  const points = strand.points;
  const frames = transportFrames(points);
  let check = 0;
  let arc = 0;
  let startRadius = 0;
  let radius = 0;
  let u = 0;
  for (let i = 0; i < points.length; i += 1) {
    const p = points[i] as Vec3;
    const frame = frames[i] as { tangent: Vec3; normal: Vec3 };
    if (i > 0) {
      const prev = points[i - 1] as Vec3;
      arc += Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]);
    }
    const n = frame.normal;
    const t = frame.tangent;
    // b = t × n
    const bx = t[1] * n[2] - t[2] * n[1];
    const by = t[2] * n[0] - t[0] * n[2];
    const bz = t[0] * n[1] - t[1] * n[0];
    u = (arc + strand.feed) / period;
    radius = radiusAt(p, view);
    if (i === 0) startRadius = radius;
    for (let j = 0; j <= radial; j += 1) {
      const angle = (2 * Math.PI * (j % radial)) / radial;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const rx = n[0] * c + bx * s;
      const ry = n[1] * c + by * s;
      const rz = n[2] * c + bz * s;
      const k = base + i * stride + j;
      const x = p[0] + rx * radius;
      const y = p[1] + ry * radius;
      const z = p[2] + rz * radius;
      rope.positions[k * 3] = x;
      rope.positions[k * 3 + 1] = y;
      rope.positions[k * 3 + 2] = z;
      rope.normals[k * 3] = rx;
      rope.normals[k * 3 + 1] = ry;
      rope.normals[k * 3 + 2] = rz;
      rope.uvs[k * 2] = u;
      rope.uvs[k * 2 + 1] = j / radial;
      check += x + y + z;
    }
  }
  // Sealed ends (M34): a centre vertex half a radius beyond each end ring makes a rounded tip.
  const first = points[0] as Vec3;
  const last = points[points.length - 1] as Vec3;
  const startCentre = base + points.length * stride;
  const put = (k: number, p: Vec3, dir: Vec3, sign: number, r: number, uCoord: number) => {
    const x = p[0] + sign * dir[0] * r * 0.5;
    const y = p[1] + sign * dir[1] * r * 0.5;
    const z = p[2] + sign * dir[2] * r * 0.5;
    rope.positions[k * 3] = x;
    rope.positions[k * 3 + 1] = y;
    rope.positions[k * 3 + 2] = z;
    rope.normals[k * 3] = sign * dir[0];
    rope.normals[k * 3 + 1] = sign * dir[1];
    rope.normals[k * 3 + 2] = sign * dir[2];
    rope.uvs[k * 2] = uCoord;
    rope.uvs[k * 2 + 1] = 0.5;
    check += x + y + z;
  };
  put(
    startCentre,
    first,
    (frames[0] as { tangent: Vec3 }).tangent,
    -1,
    startRadius,
    strand.feed / period,
  );
  put(
    startCentre + 1,
    last,
    (frames[frames.length - 1] as { tangent: Vec3 }).tangent,
    1,
    radius,
    u,
  );
  return Number.isFinite(check);
}

function pickSegments(strands: readonly DrawnStrand[]): PickSegment[] {
  const segments: PickSegment[] = [];
  for (const strand of strands) {
    for (let i = 1; i < strand.points.length; i += 1) {
      segments.push([strand.points[i - 1] as Vec3, strand.points[i] as Vec3]);
    }
  }
  return segments;
}

export function buildRopes(initial: RopeDrawing[], detail: Detail = 'high'): RopeMeshes {
  const texture = stripeTexture();
  const high = detail === 'high';
  const tube: Tube = {
    radial: high ? SCENE.ropes.radialSegmentsHigh : SCENE.ropes.radialSegmentsLow,
  };
  // One shared braid normal map at High (M60), repeating once per `braid.periodM` along the rope.
  const braid = high ? braidNormalTexture() : undefined;
  braid?.repeat.set(
    SCENE.ropes.stripePeriodM / SCENE.ropes.braid.periodM,
    SCENE.ropes.braid.aroundRepeats,
  );
  const ropes = new Map<string, RopeMesh>();
  let latest = { strands: 0, points: 0, whipped: 0, finite: true };

  const create = (drawing: ReturnType<typeof smoothDrawings>[number]): RopeMesh => {
    const built = buildGeometry(drawing.strands, tube);
    const colorKey = colorKeyOf(drawing.id);
    const base = new THREE.MeshLambertMaterial({
      color: SCENE.ropes.colors[colorKey],
      map: texture,
      vertexColors: true,
      ...(braid ? { normalMap: braid } : {}),
    });
    const mesh = asThin(
      partMesh(drawing.id, [built.geometry], base),
    ) as THREE.Mesh<THREE.BufferGeometry>;
    mesh.renderOrder = 2;
    return {
      mesh,
      material: mesh.material as THREE.MeshLambertMaterial,
      colorKey,
      layout: layoutOf(drawing.strands),
      positions: built.positions,
      normals: built.normals,
      uvs: built.uvs,
    };
  };

  const update = (drawings: RopeDrawing[], view?: RopeView, flashing?: ReadonlySet<string>) => {
    const drawn = smoothDrawings(drawings);
    let strands = 0;
    let points = 0;
    let whipped = 0;
    let finite = true;
    for (const drawing of drawn) {
      const rope = ropes.get(drawing.id);
      if (!rope) continue;
      const layout = layoutOf(drawing.strands);
      // A rope put on or taken off a winch, or wrapped with another turn (Realistic mode, M5),
      // has a new number of points: new buffers then. Otherwise they are reused every frame.
      if (layout !== rope.layout) {
        const built = buildGeometry(drawing.strands, tube);
        rope.mesh.geometry.dispose();
        rope.mesh.geometry = built.geometry;
        rope.layout = layout;
        rope.positions = built.positions;
        rope.normals = built.normals;
        rope.uvs = built.uvs;
      }
      let base = 0;
      for (const strand of drawing.strands) {
        if (!writeStrand(rope, base, strand, view, tube)) finite = false;
        base += strandVertices(strand.points.length, tube);
        strands += 1;
        points += strand.points.length;
        if (strand.whipFrom !== null) whipped += 1;
      }
      const geometry = rope.mesh.geometry;
      for (const name of ['position', 'normal', 'uv'])
        geometry.getAttribute(name).needsUpdate = true;
      // Recomputed when next needed (picking), so a moved rope is still found.
      geometry.boundingSphere = null;
      geometry.boundingBox = null;
      (rope.mesh.userData as PartUserData).pickSegments = pickSegments(drawing.strands);
      rope.material.color.set(
        flashing?.has(drawing.id)
          ? SCENE.ropes.running
          : drawing.state === 'fighting'
            ? SCENE.ropes.fighting
            : SCENE.ropes.colors[rope.colorKey],
      );
    }
    latest = { strands, points, whipped, finite };
  };

  for (const drawing of smoothDrawings(initial)) ropes.set(drawing.id, create(drawing));
  update(initial);
  return {
    objects: [...ropes.values()].map((rope) => rope.mesh),
    update,
    stats: () => ({ ...latest, radialSegments: tube.radial, braid: braid !== undefined }),
  };
}
