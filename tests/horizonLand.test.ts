import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { area } from '../src/model/area';
import { DEG } from '../src/model/angles';
import {
  HORIZON_LAYERS,
  horizonProfile,
  ridgeHeightDeg,
  type HorizonRidge,
} from '../src/model/horizonLand';
import { buildHorizonLand } from '../src/render3d/horizonLand';
import { SCENE } from '../src/render3d/sceneConfig';

const ridges = area.horizonLand.ridges;
const north = ridges.find((r) => r.name === 'mountains north') as HorizonRidge;

describe('horizon land data (M104)', () => {
  it('every ridge is well formed', () => {
    expect(ridges.length).toBeGreaterThan(0);
    for (const r of ridges) {
      expect(HORIZON_LAYERS).toContain(r.layer);
      expect(r.toDeg).toBeGreaterThan(r.fromDeg);
      expect(r.toDeg - r.fromDeg).toBeLessThan(360);
      expect(r.rippleDeg).toBeGreaterThanOrEqual(0);
      let last = r.fromDeg;
      for (const [bearing, height] of r.peaks) {
        expect(bearing).toBeGreaterThan(last);
        expect(bearing).toBeLessThan(r.toDeg);
        expect(height).toBeGreaterThanOrEqual(0);
        expect(height).toBeLessThanOrEqual(8);
        last = bearing;
      }
    }
  });
});

describe('ridgeHeightDeg', () => {
  it('is 0 at and outside both ends', () => {
    for (const r of ridges) {
      for (const b of [r.fromDeg, r.toDeg, r.fromDeg - 5, r.toDeg + 5]) {
        expect(ridgeHeightDeg(r, b)).toBe(0);
      }
    }
  });

  it('at a peak is the peak height plus the ripple', () => {
    const ripple =
      north.rippleDeg * (0.6 * Math.sin(23 * 375 * DEG) + 0.4 * Math.sin(61 * 375 * DEG));
    expect(ridgeHeightDeg(north, 375)).toBeCloseTo(5.6 + ripple, 6);
  });

  it('is never negative', () => {
    for (const r of ridges) {
      for (let b = r.fromDeg - 1; b <= r.toDeg + 1; b += 0.1) {
        expect(ridgeHeightDeg(r, b)).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('horizonProfile', () => {
  const far = horizonProfile(ridges, 'far');
  const near = horizonProfile(ridges, 'near');

  it('matches the prototype values', () => {
    expect(far).toHaveLength(360);
    expect(far[0]).toBeCloseTo(5.12, 2);
    expect(far[15]).toBeCloseTo(5.509, 2);
    expect(Math.max(...far)).toBeCloseTo(5.582, 2);
    expect(far.indexOf(Math.max(...far))).toBe(19);
    expect(far[125]).toBeCloseTo(2.509, 2);
    expect(near[0]).toBeCloseTo(1.3, 2);
    expect(near[180]).toBeCloseTo(1.3, 2);
    expect(Math.max(...near)).toBeCloseTo(1.695, 2);
    expect(near.indexOf(Math.max(...near))).toBe(349);
  });

  it('leaves open sea to the south-west (215°–240°)', () => {
    for (let i = 215; i <= 240; i += 1) {
      expect(far[i]).toBe(0);
      expect(near[i]).toBe(0);
    }
  });

  it('takes a coarser step and rejects one that does not divide 360', () => {
    const coarse = horizonProfile(ridges, 'far', 2);
    expect(coarse).toHaveLength(180);
    expect(coarse[7]).toBe(far[14]);
    expect(() => horizonProfile(ridges, 'far', 7)).toThrow();
    expect(() => horizonProfile(ridges, 'far', 0)).toThrow();
  });
});

describe('buildHorizonLand', () => {
  const land = buildHorizonLand();
  const R = SCENE.horizonLand.far.radiusM;
  const vertex = (layer: 'far' | 'near', i: number) => {
    const p = land.layers[layer].geometry.getAttribute('position');
    return new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
  };

  it('has two meshes of 722 vertices and 720 triangles', () => {
    for (const layer of HORIZON_LAYERS) {
      const mesh = land.layers[layer];
      expect(mesh.geometry.getAttribute('position').count).toBe(722);
      expect((mesh.geometry.getIndex()?.count ?? 0) / 3).toBe(720);
      expect(mesh.userData.partId).toBe('env_distant_land');
      expect((mesh.material as THREE.MeshBasicMaterial).fog).toBe(false);
    }
  });

  it('puts the vertices on the ring: x north, z east', () => {
    const foot = vertex('far', 180);
    expect(foot.x).toBeCloseTo(0, 3);
    expect(foot.y).toBe(0);
    expect(foot.z).toBeCloseTo(R, 3);
    const top = vertex('far', 31);
    expect(Math.abs(top.x - R * Math.cos(15 * DEG))).toBeLessThan(0.2);
    expect(Math.abs(top.z - R * Math.sin(15 * DEG))).toBeLessThan(0.2);
    expect(Math.abs(top.y - R * Math.tan(5.509 * DEG))).toBeLessThan(0.2);
  });

  it('keeps to the compass and follows the camera', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(12, 5, -7);
    const horizon = new THREE.Color('#d6e7f2');
    land.update(camera, 90, horizon, 0);
    land.object.updateMatrixWorld(true);
    expect(land.object.position.toArray()).toEqual([12, 0, -7]);
    const east = land.layers.far.localToWorld(vertex('far', 180));
    expect(east.x).toBeCloseTo(12 + R, 3);
    expect(east.z).toBeCloseTo(-7, 3);
    land.update(camera, 0, horizon, 0);
    land.object.updateMatrixWorld(true);
    const ahead = land.layers.far.localToWorld(vertex('far', 0));
    expect(ahead.x).toBeCloseTo(12 + R, 3);
    const starboard = land.layers.far.localToWorld(vertex('far', 180));
    expect(starboard.z).toBeCloseTo(-7 + R, 3);
  });

  it('turns dark at night and is paler when far', () => {
    const camera = new THREE.PerspectiveCamera();
    const horizon = new THREE.Color('#d6e7f2');
    land.update(camera, 0, horizon, 1);
    const expected = horizon.clone().multiplyScalar(SCENE.horizonLand.nightShade).getHex();
    for (const layer of HORIZON_LAYERS) {
      expect((land.layers[layer].material as THREE.MeshBasicMaterial).color.getHex()).toBe(
        expected,
      );
    }
    land.update(camera, 0, horizon, 0);
    const distance = (layer: 'far' | 'near') => {
      const c = (land.layers[layer].material as THREE.MeshBasicMaterial).color;
      return Math.abs(c.r - horizon.r) + Math.abs(c.g - horizon.g) + Math.abs(c.b - horizon.b);
    };
    expect(distance('far')).toBeLessThan(distance('near'));
  });
});
