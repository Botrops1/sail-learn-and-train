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
  /** Unit vector towards the sun at its true height (also below the horizon), for the sky dome. */
  skyDirection: THREE.Vector3;
  /** 0 … 1: how much direct sunlight there is. */
  sun: number;
  /** 0.25 … 1: how much sky light there is. */
  sky: number;
  /** 0 … 1: how warm (orange) the sunlight is. */
  warm: number;
  /** 0 … 1: how dark the night is. */
  night: number;
}

/** Unit vector towards the sun in the boat frame (x forward, y up, z starboard). */
export function sunDirectionAt(
  elevationDeg: number,
  azimuthDeg: number,
  headingDeg: number,
): THREE.Vector3 {
  const el = elevationDeg * DEG;
  const east = Math.sin(azimuthDeg * DEG) * Math.cos(el);
  const north = Math.cos(azimuthDeg * DEG) * Math.cos(el);
  const [x, z] = mapToBoat(east, north, headingDeg);
  return new THREE.Vector3(x, Math.sin(el), z).normalize();
}

export function daylighting(
  elevationDeg: number,
  azimuthDeg: number,
  headingDeg: number,
): Daylighting {
  const d = SCENE.daylight;
  // The light and the shadow never come from below the water.
  const lit = Math.max(elevationDeg, d.minLightElevationDeg);
  return {
    sunDirection: sunDirectionAt(lit, azimuthDeg, headingDeg),
    skyDirection: sunDirectionAt(elevationDeg, azimuthDeg, headingDeg),
    sun: smoothstep(d.sunFromDeg, d.sunToDeg, elevationDeg),
    sky: d.skyFloor + (1 - d.skyFloor) * smoothstep(d.skyFromDeg, d.skyToDeg, elevationDeg),
    warm: 1 - smoothstep(d.warmFromDeg, d.warmToDeg, elevationDeg),
    night: 1 - smoothstep(d.nightFromDeg, d.nightToDeg, elevationDeg),
  };
}
