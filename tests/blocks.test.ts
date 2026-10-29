import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { boat } from '../src/model/boat';
import { blockGeometry, blockMeshes, boxAt, roundedBoxAt } from '../src/render3d/boat/parts';
import { createMaterials } from '../src/render3d/boat/materials';

const box = (geometries: THREE.BufferGeometry[]): THREE.Box3 => {
  const out = new THREE.Box3();
  for (const g of geometries) {
    g.computeBoundingBox();
    out.union(g.boundingBox as THREE.Box3);
  }
  return out;
};

describe('M61 blocks', () => {
  const g = blockGeometry([0, 0, 0], [0, 0, 1], 0.07, [0, 1, 0]);

  it('has two cheeks, a sheave the rope sits in and a shackle on the towards side', () => {
    const cheeks = box(g.cheeks);
    expect(cheeks.min.z).toBeCloseTo(-0.036, 7);
    expect(cheeks.max.z).toBeCloseTo(0.036, 7);
    expect(cheeks.max.x).toBeCloseTo(0.07, 6);
    expect(cheeks.max.y).toBeCloseTo(0.07, 6);
    // Two plates with a gap between them.
    const plate = box(g.cheeks.slice(0, 1));
    expect(plate.min.z).toBeCloseTo(0.028, 7);
    expect(plate.max.z).toBeCloseTo(0.036, 7);
    const sheave = box(g.sheave);
    expect(sheave.max.z).toBeCloseTo(0.027, 7);
    expect(sheave.max.x).toBeCloseTo(0.0546, 6);
    expect(sheave.max.y).toBeCloseTo(0.0546, 6);
    const shackle = box(g.fittings.slice(1));
    expect(shackle.max.y).toBeGreaterThan(0.109);
    expect(shackle.max.y).toBeLessThan(0.113);
  });

  it('lets the drawn rope run between the cheeks', () => {
    const gap = 2 * boat.visual.ropeRenderRadius + boat.modelDetail.block.cheekClearanceM;
    expect(gap / 2 - boat.visual.ropeRenderRadius).toBeGreaterThanOrEqual(0.002);
  });

  it('puts the shackle on the side it is told', () => {
    const side = blockGeometry([0, 0, 0], [0, 1, 0], 0.07, [1, 0, 0]);
    expect(box(side.fittings.slice(1)).min.x).toBeGreaterThan(0);
  });

  it('makes one mesh per material with the part id, and no shackle when turned off', () => {
    const materials = createMaterials('high');
    const meshes = blockMeshes('fit_mainsheet_deck_blocks', [g], materials, {
      hitPoints: [[0, 0, 0]],
    });
    expect(meshes).toHaveLength(3);
    for (const mesh of meshes) {
      expect(mesh.userData.partId).toBe('fit_mainsheet_deck_blocks');
      expect(mesh.userData.hitPoints).toEqual([[0, 0, 0]]);
    }
    expect(
      blockGeometry([0, 0, 0], [0, 0, 1], 0.07, [0, 1, 0], 12, { shackle: false }).fittings,
    ).toHaveLength(1);
  });
});

describe('M61 roundedBoxAt', () => {
  it('rounds the edges at High and is a plain box at Low', () => {
    const high = roundedBoxAt([1, 2, 3], [0.4, 0.2, 0.1], 0.03, 'high');
    high.computeBoundingBox();
    const b = high.boundingBox as THREE.Box3;
    expect(b.min.toArray()).toEqual([
      expect.closeTo(0.8, 6),
      expect.closeTo(1.9, 6),
      expect.closeTo(2.95, 6),
    ]);
    expect(b.max.toArray()).toEqual([
      expect.closeTo(1.2, 6),
      expect.closeTo(2.1, 6),
      expect.closeTo(3.05, 6),
    ]);
    // Non-indexed in the pinned three: three vertices per triangle.
    expect(high.getAttribute('position').count / 3).toBeGreaterThan(12);
    const low = roundedBoxAt([1, 2, 3], [0.4, 0.2, 0.1], 0.03, 'low');
    expect(low.getAttribute('position').count).toBe(
      boxAt([1, 2, 3], [0.4, 0.2, 0.1]).getAttribute('position').count,
    );
  });
});
