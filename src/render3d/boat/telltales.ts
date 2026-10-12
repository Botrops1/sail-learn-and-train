import * as THREE from 'three';
import { boat } from '../../model/boat';
import { requirePartId } from '../../model/registry';
import type { Side } from '../../model/boomSolver';
import type { SailGrid } from '../../model/sailShape';
import type { RigState } from '../../model/sim';
import { sailTrim, type SailDamage, type SailName } from '../../model/trim';
import { SCENE } from '../sceneConfig';
import type { BoatMaterials } from './materials';
import { asThin, partMesh } from './parts';

const DEG = Math.PI / 180;

type Motion = 'streaming' | 'lifting' | 'stalled';

/** What the telltales and the tear mark of one sail are drawn for. */
export interface SailDraw {
  grid: SailGrid;
  /** The leeward side of the sail (+1 = starboard): the sail curves towards it. */
  leeSide: Side;
  /** False while the sail is rolled away. */
  shown: boolean;
}

export interface Telltales {
  objects: THREE.Object3D[];
  update(
    rig: RigState,
    awaDeg: number,
    main: SailDraw,
    jib: SailDraw,
    damage: SailDamage,
    timeS: number,
  ): void;
}

interface Ribbon {
  mesh: THREE.Mesh;
  face: Side;
  heightIndex: number;
  /** Smoothed angle and wiggle amplitude, degrees; the wiggle's phase, radians. */
  angleDeg: number;
  wiggleDeg: number;
  phase: number;
}

interface SailTelltales {
  sail: SailName;
  ribbons: Ribbon[];
  tear: THREE.Mesh;
  tearPositions: Float32Array;
}

const _p = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _r0 = new THREE.Vector3();
const _r1 = new THREE.Vector3();
const _from = new THREE.Vector3();
const _to = new THREE.Vector3();
const _t = new THREE.Vector3();
const _u = new THREE.Vector3();
const _n = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();

function pointOf(grid: SailGrid, row: number, column: number, out: THREE.Vector3) {
  const p = grid.points[row * (grid.columns + 1) + column] ?? [0, 0, 0];
  return out.set(p[0], p[1], p[2]);
}

/** A point of the grid row at height fraction `h` (interpolated between rows), column `j`. */
function rowPoint(grid: SailGrid, h: number, j: number, out: THREE.Vector3): THREE.Vector3 {
  const r = Math.min(grid.rows, Math.max(0, h * grid.rows));
  const i0 = Math.min(grid.rows - 1, Math.floor(r));
  pointOf(grid, i0, j, _r0);
  pointOf(grid, i0 + 1, j, _r1);
  return out.copy(_r0).lerp(_r1, r - i0);
}

interface Frame {
  position: THREE.Vector3;
  /** Along the chord, aft; up the sail in its plane; across the sail towards starboard. */
  chord: THREE.Vector3;
  up: THREE.Vector3;
  normal: THREE.Vector3;
}

/**
 * Where a ribbon is fixed: `distanceM` aft of the luff along the chord of the row at height
 * fraction `h`, with the sail's plane there. Read from the drawn grid, so it follows the sail's
 * curve, twist and flapping.
 */
function attachment(grid: SailGrid, h: number, distanceM: number, frame: Frame): void {
  let walked = 0;
  let j = 0;
  for (; j < grid.columns; j += 1) {
    rowPoint(grid, h, j, _from);
    rowPoint(grid, h, j + 1, _to);
    const step = _from.distanceTo(_to);
    if (walked + step >= distanceM || j === grid.columns - 1) {
      const f = step > 1e-9 ? Math.min(1, (distanceM - walked) / step) : 0;
      frame.position.copy(_from).lerp(_to, f);
      frame.chord.copy(_to).sub(_from).normalize();
      break;
    }
    walked += step;
  }
  // Up the sail: the next row minus the previous one at this column.
  const r = Math.min(grid.rows, Math.max(0, h * grid.rows));
  const i0 = Math.min(grid.rows - 1, Math.floor(r));
  pointOf(grid, i0, j, _r0);
  pointOf(grid, i0 + 1, j, _r1);
  _u.copy(_r1).sub(_r0);
  _u.addScaledVector(frame.chord, -_u.dot(frame.chord));
  if (_u.lengthSq() < 1e-12) _u.set(0, 1, 0);
  frame.up.copy(_u).normalize();
  frame.normal.crossVectors(frame.chord, frame.up).normalize();
  // The normal points to starboard (+z), so a face's side is known whichever way the sail leans.
  if (frame.normal.z < 0) frame.normal.negate();
}

function ribbonGeometry(): THREE.BufferGeometry {
  const c = SCENE.telltales;
  const geometry = new THREE.PlaneGeometry(c.lengthM, c.widthM);
  geometry.translate(c.lengthM / 2, 0, 0);
  return geometry;
}

function tearMesh(
  partId: string,
  columns: number,
  material: THREE.Material,
): { mesh: THREE.Mesh; positions: Float32Array } {
  // Two strips (one each side of the sail), a quad per zig-zag segment.
  const vertices = columns * 2 * 4;
  const positions = new Float32Array(vertices * 3);
  const indices: number[] = [];
  for (let q = 0; q < columns * 2; q += 1) {
    const v = q * 4;
    indices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  const mesh = new THREE.Mesh(geometry, material);
  // The tear is part of its sail: a tap on it identifies the sail.
  mesh.userData = { partId: requirePartId(partId) };
  mesh.name = `${partId}_tear`;
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.visible = false;
  return { mesh, positions };
}

/**
 * Telltales (PHASE2_SPEC 9.3): three ribbons at 25, 50 and 75 % of each sail's height on each
 * face, and a dark zig-zag across a torn sail. Pure presentation: the states come from
 * `sailTrim`, the positions from the sail grids the boat draws.
 */
export function buildTelltales(materials: BoatMaterials): Telltales {
  const c = SCENE.telltales;
  const heights = boat.physics.trim.telltaleHeights;
  const geometry = ribbonGeometry();
  const colors = { [-1]: materials.telltalePort, [1]: materials.telltaleStarboard } as const;
  const objects: THREE.Object3D[] = [];
  const sails: SailTelltales[] = (['main', 'jib'] as const).map((sail) => {
    const ribbons: Ribbon[] = [];
    heights.forEach((_, heightIndex) => {
      for (const face of [-1, 1] as const) {
        // Not a "small part" (no round hit area): a ribbon is tiny and hangs in the air in front
        // of the sail, so a fingertip-sized area would steal taps from the parts behind it.
        const mesh = asThin(partMesh('part_telltale', [geometry.clone()], colors[face]));
        mesh.matrixAutoUpdate = false;
        mesh.visible = false;
        objects.push(mesh);
        ribbons.push({ mesh, face, heightIndex, angleDeg: 0, wiggleDeg: 0, phase: 0 });
      }
    });
    const tear = tearMesh(
      sail === 'main' ? 'sail_main' : 'sail_jib',
      boat.visual.mainSail.columns,
      materials.tear,
    );
    objects.push(tear.mesh);
    return { sail, ribbons, tear: tear.mesh, tearPositions: tear.positions };
  });

  const frame: Frame = {
    position: new THREE.Vector3(),
    chord: new THREE.Vector3(),
    up: new THREE.Vector3(),
    normal: new THREE.Vector3(),
  };
  let lastTimeS: number | undefined;

  const placeTear = (entry: SailTelltales, grid: SailGrid) => {
    const t = c.tear;
    const columns = grid.columns;
    const row = t.heightFraction * grid.rows;
    const i0 = Math.min(grid.rows - 1, Math.floor(row));
    const points: THREE.Vector3[] = [];
    const normals: THREE.Vector3[] = [];
    for (let j = 0; j <= columns; j += 1) {
      // Alternate between two heights across the sail: a jagged line.
      const f = j % 2 === 0 ? 0.5 - t.zigzagRows / 2 : 0.5 + t.zigzagRows / 2;
      pointOf(grid, i0, j, _a);
      pointOf(grid, i0 + 1, j, _b);
      points.push(_a.clone().lerp(_b, f));
      const chord = pointOf(grid, i0, Math.min(columns, j + 1), _x).sub(
        pointOf(grid, i0, Math.max(0, j - 1), _y),
      );
      const up = _b.clone().sub(_a);
      const normal = new THREE.Vector3().crossVectors(chord, up).normalize();
      if (normal.z < 0) normal.negate();
      normals.push(normal);
    }
    let v = 0;
    const write = (p: THREE.Vector3) => {
      entry.tearPositions[v] = p.x;
      entry.tearPositions[v + 1] = p.y;
      entry.tearPositions[v + 2] = p.z;
      v += 3;
    };
    for (const side of [1, -1] as const) {
      for (let j = 0; j < columns; j += 1) {
        const a = points[j] as THREE.Vector3;
        const b = points[j + 1] as THREE.Vector3;
        const na = normals[j] as THREE.Vector3;
        const nb = normals[j + 1] as THREE.Vector3;
        const along = _t.copy(b).sub(a).normalize();
        const across = _n
          .crossVectors(along, na)
          .normalize()
          .multiplyScalar(t.widthM / 2);
        const offA = na.clone().multiplyScalar(side * t.liftM);
        const offB = nb.clone().multiplyScalar(side * t.liftM);
        write(a.clone().add(offA).add(across));
        write(a.clone().add(offA).sub(across));
        write(b.clone().add(offB).add(across));
        write(b.clone().add(offB).sub(across));
      }
    }
    const attribute = entry.tear.geometry.getAttribute('position');
    attribute.needsUpdate = true;
    entry.tear.geometry.boundingSphere = null;
  };

  const update: Telltales['update'] = (rig, awaDeg, main, jib, damage, timeS) => {
    const dt = lastTimeS === undefined ? 0 : Math.max(0, Math.min(0.1, timeS - lastTimeS));
    lastTimeS = timeS;
    const follow = 1 - Math.exp(-dt / c.changeTimeS);
    for (const entry of sails) {
      const draw = entry.sail === 'main' ? main : jib;
      const trim = sailTrim(entry.sail, rig, awaDeg);
      const distance = entry.sail === 'main' ? c.mainFromLuffM : c.jibFromLuffM;
      const visible = draw.shown && trim.telltales.length > 0;
      for (const ribbon of entry.ribbons) {
        ribbon.mesh.visible = visible;
        if (!visible) continue;
        const tell = trim.telltales[ribbon.heightIndex];
        if (!tell) continue;
        // The windward face shows the windward telltale, the leeward face the leeward one.
        const motion: Motion =
          ribbon.face === draw.leeSide
            ? tell.leeward === 'stalled'
              ? 'stalled'
              : 'streaming'
            : tell.windward === 'lifting'
              ? 'lifting'
              : 'streaming';
        const look = c[motion];
        ribbon.angleDeg += (look.baseDeg - ribbon.angleDeg) * follow;
        ribbon.wiggleDeg += (look.wiggleDeg - ribbon.wiggleDeg) * follow;
        ribbon.phase += 2 * Math.PI * look.frequencyHz * dt;
        const angle =
          (ribbon.angleDeg + ribbon.wiggleDeg * Math.sin(ribbon.phase + ribbon.heightIndex * 1.3)) *
          DEG;
        attachment(draw.grid, heights[ribbon.heightIndex] ?? 0.5, distance, frame);
        // x along the ribbon (the chord turned up by `angle` in the sail's plane), z off the face.
        _x.copy(frame.chord)
          .multiplyScalar(Math.cos(angle))
          .addScaledVector(frame.up, Math.sin(angle));
        _y.copy(frame.up)
          .multiplyScalar(Math.cos(angle))
          .addScaledVector(frame.chord, -Math.sin(angle));
        _z.crossVectors(_x, _y);
        _m.makeBasis(_x, _y, _z);
        _m.setPosition(
          _p.copy(frame.position).addScaledVector(frame.normal, ribbon.face * c.offFaceM),
        );
        ribbon.mesh.matrix.copy(_m);
        ribbon.mesh.matrixWorldNeedsUpdate = true;
      }
      const torn = draw.shown && damage[entry.sail] >= 1;
      entry.tear.visible = torn;
      if (torn) placeTear(entry, draw.grid);
    }
  };
  return { objects, update };
}
