import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import registry from '../content/registry/parts.json';
import { boat } from '../src/model/boat';
import { buildBoat } from '../src/render3d/boat';

/** The 3D model can be built without WebGL, so its structure is tested here. */
describe('static boat model (M1)', () => {
  const model = buildBoat();
  const meshes: THREE.Mesh[] = [];
  model.root.traverse((object) => {
    if (object instanceof THREE.Mesh) meshes.push(object);
  });
  const partIds = new Set(meshes.map((mesh) => mesh.userData.partId as string));
  const registryIds = new Set(registry.entries.map((entry) => entry.id));

  it('every mesh carries a registry id, so every visible part can be identified', () => {
    for (const mesh of meshes) expect(registryIds, mesh.name).toContain(mesh.userData.partId);
  });

  it('builds the parts listed in PHASE1_SPEC 6.1 (without ropes and wind: M2)', () => {
    const expected = [
      'part_hull',
      'part_deck',
      'part_coachroof',
      'part_cockpit',
      'part_keel',
      'part_rudder',
      'part_saildrive',
      'part_mast',
      'part_spreader',
      'part_shroud',
      'part_forestay',
      'part_backstay',
      'part_boom',
      'fit_self_tacking_track',
      'fit_self_tacking_car',
      'helm_port',
      'helm_starboard',
      'winch_primary_port',
      'winch_primary_starboard',
      'clutch_bank_a',
      'clutch_bank_b',
      'clutch_jib_roll',
      'fit_mainsheet_boom_blocks',
      'fit_mainsheet_deck_blocks',
      'part_jib_furler',
      'part_main_furling_gearbox',
      'sail_main',
      'sail_jib',
    ];
    for (const id of expected) expect(partIds, id).toContain(id);
  });

  it('no geometry has NaN positions', () => {
    for (const mesh of meshes) {
      const positions = mesh.geometry.getAttribute('position');
      for (let i = 0; i < positions.count * 3; i += 1) {
        expect(Number.isFinite(positions.array[i]), mesh.name).toBe(true);
      }
    }
  });

  it('overall size matches the data: length overall, beam, draft and mast height', () => {
    const box = new THREE.Box3().setFromObject(model.root);
    expect(box.max.x - box.min.x).toBeCloseTo(boat.hull.bowFittingTipX - boat.hull.transomX, 1);
    expect(box.max.z - box.min.z).toBeCloseTo(boat.dimensions.beam, 1);
    expect(-box.min.y).toBeCloseTo(boat.dimensions.draft, 1);
    expect(box.max.y).toBeCloseTo(boat.rig.mast.topY, 1);
  });

  it('hull spans stem to transom and sits on the waterline', () => {
    const hull = meshes.find((mesh) => mesh.userData.partId === 'part_hull');
    expect(hull).toBeDefined();
    const box = new THREE.Box3().setFromObject(hull as THREE.Mesh);
    expect(box.max.x).toBeCloseTo(boat.hull.stemX, 1);
    expect(box.min.x).toBeCloseTo(boat.hull.transomX, 1);
    expect(box.min.y).toBeCloseTo(-boat.hull.canoeBody.maxDepthBelowWL, 2);
  });

  it('mast, boom and wheels are where the data puts them', () => {
    const find = (id: string) => {
      const mesh = meshes.find((candidate) => candidate.userData.partId === id);
      return new THREE.Box3().setFromObject(mesh as THREE.Mesh);
    };
    const mast = find('part_mast');
    expect((mast.min.x + mast.max.x) / 2).toBeCloseTo(boat.rig.mast.x, 2);
    expect(mast.max.y).toBeCloseTo(boat.rig.mast.topY, 2);
    const boom = find('part_boom');
    expect(boom.max.x - boom.min.x).toBeCloseTo(boat.rig.boom.length, 2);
    expect(boom.max.x).toBeCloseTo(boat.rig.boom.gooseneck[0] ?? 0, 2);
    for (const helm of boat.cockpitHardware.helms) {
      const pivot = model.wheelPivots.find((p) => p.name === `${helm.id}Pivot`);
      expect(pivot?.position.x).toBeCloseTo(helm.x, 6);
      expect(pivot?.position.z).toBeCloseTo(helm.z, 6);
    }
  });

  it('rope-free M1: no rope meshes yet', () => {
    for (const id of partIds) expect(id.startsWith('rope_'), id).toBe(false);
  });

  it('optional sails are data-driven: the gennaker is not built while disabled', () => {
    expect(boat.sails.gennaker.enabled).toBe(false);
    expect(partIds.has('sail_gennaker')).toBe(false);
  });
});
