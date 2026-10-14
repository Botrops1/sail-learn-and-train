import * as THREE from 'three';
import { smoothstep, DEG } from '../model/angles';
import { mapToBoat } from '../model/mapFrame';
import { SCENE } from './sceneConfig';

/**
 * The sun's light on the boat (PHASE3_SPEC 9.6): where the light comes from in the boat frame and
 * how strong the sun, the sky light and the night are for a sun height.
 */
export interface Daylighting {
  /** Unit vector towards the sun in the boat frame (x forward, y up, z starboard). */
  sunDirection: THREE.Vector3;
  /** 0 … 1: how much direct sunlight there is. */
  sun: number;
  /** 0.25 … 1: how much sky light there is. */
  sky: number;
  /** 0 … 1: how warm (orange) the sunlight is. */
  warm: number;
  /** 0 … 1: how dark the night is. */
  night: number;
}

export function daylighting(
  elevationDeg: number,
  azimuthDeg: number,
  headingDeg: number,
): Daylighting {
  const d = SCENE.daylight;
  // The light and the shadow never come from below the water.
  const lit = Math.max(elevationDeg, d.minLightElevationDeg) * DEG;
  const east = Math.sin(azimuthDeg * DEG) * Math.cos(lit);
  const north = Math.cos(azimuthDeg * DEG) * Math.cos(lit);
  const [x, z] = mapToBoat(east, north, headingDeg);
  return {
    sunDirection: new THREE.Vector3(x, Math.sin(lit), z).normalize(),
    sun: smoothstep(d.sunFromDeg, d.sunToDeg, elevationDeg),
    sky: d.skyFloor + (1 - d.skyFloor) * smoothstep(d.skyFromDeg, d.skyToDeg, elevationDeg),
    warm: 1 - smoothstep(d.warmFromDeg, d.warmToDeg, elevationDeg),
    night: 1 - smoothstep(d.nightFromDeg, d.nightToDeg, elevationDeg),
  };
}
