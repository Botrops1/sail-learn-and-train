import * as THREE from 'three';
import { boat } from '../../model/boat';
import { channelPath, sprayhoodHalfWidth, sprayhoodTopY } from '../../model/deckVolumes';
import { halfBeamAt, sheerAt } from '../../model/hullShape';
import type { Detail } from '../../model/settings';
import type { Vec3 } from '../../model/vec3';
import type { BoatMaterials } from './materials';
import { asThin, cylinderBetween, partMesh, pushQuad, triangles, type PickSegment } from './parts';

/** Sprayhood, line channels and lifelines (PHASE1_SPEC 6.1; M3b shapes in deckVolumes.ts). */
export function buildDeckGear(materials: BoatMaterials, detail: Detail = 'high'): THREE.Object3D[] {
  return [
    ...buildSprayhood(materials, detail),
    buildLineChannels(materials),
    ...buildLifelines(materials, detail),
  ];
}

/**
 * Sprayhood (M3b): a fabric shell over the companionway and the front of the cockpit, just
 * aft of the mainsheet deck blocks. Arched across, its front slopes up as a windscreen with
 * clear windows; its side edges rest on the covered line channels; open at the back, with a
 * stainless frame bow along the open end.
 */
function buildSprayhood(materials: BoatMaterials, detail: Detail): THREE.Object3D[] {
  const hood = boat.modelDetail.sprayhood;
  const alongSteps = detail === 'high' ? 18 : 10;
  const acrossSteps = detail === 'high' ? 28 : 16;
  const point = (i: number, j: number): Vec3 => {
    const x = hood.frontX + ((hood.aftX - hood.frontX) * i) / alongSteps;
    const s = -1 + (2 * j) / acrossSteps;
    return [x, sprayhoodTopY(x, s), s * sprayhoodHalfWidth(x)];
  };
  const fabric: number[] = [];
  const glass: number[] = [];
  const windowEnd = hood.frontX - hood.windscreenLength * 0.92;
  for (let i = 0; i < alongSteps; i += 1) {
    for (let j = 0; j < acrossSteps; j += 1) {
      const p00 = point(i, j);
      const midX = (p00[0] + point(i + 1, j)[0]) / 2;
      const midS = Math.abs(-1 + (2 * (j + 0.5)) / acrossSteps);
      const isWindow =
        midX < hood.frontX - 0.06 && midX > windowEnd && midS < hood.windowHalfWidthFraction;
      pushQuad(
        isWindow ? glass : fabric,
        p00,
        point(i + 1, j),
        point(i + 1, j + 1),
        point(i, j + 1),
      );
    }
  }
  const aftArch: Vec3[] = Array.from({ length: acrossSteps + 1 }, (_, j) => point(alongSteps, j));
  const frameGeometries: THREE.BufferGeometry[] = [];
  for (let j = 0; j < aftArch.length - 1; j += 1) {
    frameGeometries.push(
      cylinderBetween(aftArch[j] as Vec3, aftArch[j + 1] as Vec3, hood.frameTubeRadius, 6),
    );
  }
  const crown: PickSegment[] = [
    [point(0, acrossSteps / 2), point(alongSteps, acrossSteps / 2)],
    [aftArch[0] as Vec3, aftArch[acrossSteps / 2] as Vec3],
    [aftArch[acrossSteps / 2] as Vec3, aftArch[acrossSteps] as Vec3],
  ];
  const hoodMesh = partMesh('fit_sprayhood', [triangles(fabric)], materials.fabric, crown);
  const windows = partMesh('fit_sprayhood', [triangles(glass)], materials.glass);
  windows.renderOrder = 1;
  return [hoodMesh, windows, partMesh('fit_sprayhood', frameGeometries, materials.fitting)];
}

/**
 * Covered line channels (M3b): a low gelcoat cover along each channel path, from just aft of
 * the mast foot to the clutch banks. Its cross-section is offset in z like the rope lanes, so
 * every lane stays under it. Open at both ends, where the lines go in and come out.
 */
function buildLineChannels(materials: BoatMaterials): THREE.Object3D {
  const channel = boat.rig.lineLead.channel;
  const half = channel.width / 2;
  const h = channel.coverHeight;
  const bevel = Math.min(half / 3, h);
  // Cross-section: [z offset, height above the floor], a low hump closed underneath.
  const profile: [number, number][] = [
    [-half, 0],
    [-half + bevel, h],
    [half - bevel, h],
    [half, 0],
  ];
  const positions: number[] = [];
  const segments: PickSegment[] = [];
  for (const side of [1, -1] as const) {
    const path = channelPath(side);
    const ring = (p: Vec3): Vec3[] => profile.map(([dz, dy]) => [p[0], p[1] + dy, p[2] + dz]);
    for (let i = 0; i < path.length - 1; i += 1) {
      const a = ring(path[i] as Vec3);
      const b = ring(path[i + 1] as Vec3);
      for (let k = 0; k < profile.length; k += 1) {
        const next = (k + 1) % profile.length;
        pushQuad(positions, a[k] as Vec3, b[k] as Vec3, b[next] as Vec3, a[next] as Vec3);
      }
      const lift = (p: Vec3): Vec3 => [p[0], p[1] + h, p[2]];
      segments.push([lift(path[i] as Vec3), lift(path[i + 1] as Vec3)]);
    }
  }
  return partMesh('fit_line_channels', [triangles(positions)], materials.gelcoat, segments);
}

/**
 * Stainless stanchions with a foot along both deck edges, carrying an upper and a lower
 * lifeline (dark, covered wire as in the photos). On the reference boat the jib furling line
 * runs along the stanchion bases.
 */
function buildLifelines(materials: BoatMaterials, detail: Detail): THREE.Object3D[] {
  const l = boat.modelDetail.lifelines;
  const radial = detail === 'high' ? 10 : 6;
  const count = Math.max(2, Math.round((l.fwdX - l.aftX) / l.stanchionSpacing) + 1);
  const posts: THREE.BufferGeometry[] = [];
  const wires: THREE.BufferGeometry[] = [];
  const segments: PickSegment[] = [];
  const at = (p: Vec3, height: number): Vec3 => [p[0], p[1] + height, p[2]];
  const sides = ([1, -1] as const).map((side) =>
    Array.from({ length: count }, (_, i): Vec3 => {
      const x = l.aftX + ((l.fwdX - l.aftX) * i) / (count - 1);
      return [x, sheerAt(x), side * (halfBeamAt(x) - l.inset)];
    }),
  );
  for (const bases of sides) {
    bases.forEach((basePoint, i) => {
      const topPoint = at(basePoint, l.height);
      posts.push(cylinderBetween(basePoint, topPoint, l.stanchionDiameter / 2, radial));
      // Foot: a short wider tube where the stanchion meets the deck.
      posts.push(
        cylinderBetween(basePoint, at(basePoint, l.footHeight), l.footDiameter / 2, radial),
      );
      segments.push([basePoint, topPoint]);
      const next = bases[i + 1];
      if (!next) return;
      for (const height of [l.height, l.lowerWireHeight]) {
        const a = at(basePoint, height);
        const b = at(next, height);
        wires.push(cylinderBetween(a, b, l.wireRadius, 5));
        segments.push([a, b]);
      }
    });
  }
  return [
    asThin(partMesh('part_lifelines', posts, materials.fitting, segments)),
    asThin(partMesh('part_lifelines', wires, materials.dark)),
  ];
}
