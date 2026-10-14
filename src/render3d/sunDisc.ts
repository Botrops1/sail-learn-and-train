import * as THREE from 'three';
import { smoothstep } from '../model/angles';
import { sunDirectionAt } from './daylight';
import { SCENE } from './sceneConfig';

/**
 * The sun as a soft disc in the sky (decided in the M17 PR; M18's sky dome replaces it): a sprite
 * that always sits `distanceM` from the camera in the sun's real direction, so it cannot be
 * walked towards. It fades out as the sun sets and is gone below the horizon.
 */
export interface SunDisc {
  object: THREE.Sprite;
  update(
    camera: THREE.Camera,
    elevationDeg: number,
    azimuthDeg: number,
    headingDeg: number,
    warm: number,
  ): void;
}

/** A radial falloff: a bright core and a long soft halo, in white (the sprite's colour tints it). */
function discTexture(): THREE.DataTexture {
  const size = 128;
  const core = SCENE.daylight.sunDisc.coreShare;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const r = Math.hypot((x + 0.5) / size - 0.5, (y + 0.5) / size - 0.5) * 2;
      const halo = Math.pow(Math.max(0, 1 - r), 2.5) * 0.6;
      const disc = 1 - smoothstep(core * 0.8, core, r);
      const value = Math.min(1, halo + disc);
      const i = (y * size + x) * 4;
      data.fill(255, i, i + 3);
      data[i + 3] = Math.round(value * 255);
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function buildSunDisc(): SunDisc {
  const c = SCENE.daylight.sunDisc;
  const material = new THREE.SpriteMaterial({
    map: discTexture(),
    transparent: true,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.frustumCulled = false;
  const size = 2 * c.distanceM * Math.tan((c.sizeDeg / 2) * (Math.PI / 180));
  sprite.scale.set(size, size, 1);
  const white = new THREE.Color(0xffffff);
  const warmSun = new THREE.Color(SCENE.daylight.warmSun);
  const direction = new THREE.Vector3();
  return {
    object: sprite,
    update(camera, elevationDeg, azimuthDeg, headingDeg, warm) {
      const opacity = smoothstep(c.fadeFromDeg, c.fadeToDeg, elevationDeg);
      sprite.visible = opacity > 0;
      if (!sprite.visible) return;
      direction.copy(sunDirectionAt(elevationDeg, azimuthDeg, headingDeg));
      sprite.position.copy(camera.position).addScaledVector(direction, c.distanceM);
      material.opacity = opacity;
      material.color.copy(white).lerp(warmSun, warm);
    },
  };
}
