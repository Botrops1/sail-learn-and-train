import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { FIGURE_LEG_M } from '../src/model/figurePose';
import { buildBoat } from '../src/render3d/boat';
import { buildCaptain } from '../src/render3d/people/captain';
import { BONE_NAMES } from '../src/render3d/people/figureMesh';
import { SCENE } from '../src/render3d/sceneConfig';

describe('M111 captain figure', () => {
  const high = buildCaptain('high');
  const low = buildCaptain('low');

  it('9. stays inside the triangle limits at both details', () => {
    expect(high.triangles()).toBeGreaterThanOrEqual(8000);
    expect(high.triangles()).toBeLessThanOrEqual(13500);
    expect(low.triangles()).toBeGreaterThanOrEqual(1500);
    expect(low.triangles()).toBeLessThanOrEqual(4000);
  });

  for (const [name, model] of [
    ['high', high],
    ['low', low],
  ] as const) {
    it(`10. (${name}) is one skinned mesh with the bones and attributes of the spec`, () => {
      const skinned: THREE.SkinnedMesh[] = [];
      model.object.traverse((o) => {
        if (o instanceof THREE.SkinnedMesh) skinned.push(o);
      });
      expect(skinned).toHaveLength(1);
      const mesh = skinned[0] as THREE.SkinnedMesh;
      expect(mesh.frustumCulled).toBe(false);
      expect(mesh.skeleton.bones.map((b) => b.name)).toEqual([...BONE_NAMES]);
      for (const attr of ['position', 'normal', 'color', 'skinIndex', 'skinWeight']) {
        expect(mesh.geometry.getAttribute(attr), attr).toBeDefined();
      }
      const w = mesh.geometry.getAttribute('skinWeight');
      for (let i = 0; i < w.count; i += 1) {
        expect([w.getX(i), w.getY(i), w.getZ(i), w.getW(i)]).toEqual([1, 0, 0, 0]);
      }
      expect(mesh.userData).toEqual({ partId: 'person_captain', noPick: true });
      const proxy = model.object.children.find((c) => c !== mesh) as THREE.Mesh;
      expect(proxy.userData.partId).toBe('person_captain');
      expect((proxy.material as THREE.Material).visible).toBe(false);
      expect(proxy.visible).toBe(true);
    });

    it(`11. (${name}) stands on y = 0 and is 1.78 to 1.88 m tall at rest`, () => {
      const mesh = model.object.children.find(
        (c) => c instanceof THREE.SkinnedMesh,
      ) as THREE.SkinnedMesh;
      mesh.geometry.computeBoundingBox();
      const box = mesh.geometry.boundingBox as THREE.Box3;
      expect(Math.abs(box.min.y)).toBeLessThanOrEqual(0.02);
      expect(box.max.y - box.min.y).toBeGreaterThan(1.78);
      expect(box.max.y - box.min.y).toBeLessThan(1.88);
    });
  }

  it('12. the boat holds the captain, who casts a shadow while his tap area does not', () => {
    const model = buildBoat();
    const captain = model.root.getObjectByName('captain');
    expect(captain).toBeDefined();
    captain?.traverse((o) => {
      if (o instanceof THREE.SkinnedMesh) expect(o.castShadow).toBe(true);
      else if (o instanceof THREE.Mesh) expect(o.castShadow).toBe(false);
    });
  });

  it('13. the walk keeps the feet on the ground: the legs add up to the figure', () => {
    expect(Math.abs(SCENE.people.body.thigh + SCENE.people.body.shin - FIGURE_LEG_M)).toBeLessThan(
      1e-9,
    );
  });

  it('turns and poses without throwing, and the first update snaps to the pose', () => {
    const model = buildCaptain('low');
    const placement = { feet: [1, 2, 3], faceDeg: 90, pose: 'steer', walkedM: 0 } as const;
    model.update(placement, false, 3, 0);
    expect(model.object.position.toArray()).toEqual([1, 2, 3]);
    expect(model.object.rotation.y).toBeCloseTo(0, 9);
    model.update({ ...placement, faceDeg: -90 }, true, 3.1, 0.05);
    expect(model.object.visible).toBe(false);
    // 360 deg/s over 0.05 s: 18 degrees towards the new facing, the short way
    expect(Math.abs(model.object.rotation.y)).toBeCloseTo((18 * Math.PI) / 180, 6);
  });
});
