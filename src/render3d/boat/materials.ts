import * as THREE from 'three';
import { SCENE } from '../sceneConfig';

/** Base materials of the boat. partMesh() clones them so each part can be highlighted alone. */
export interface BoatMaterials {
  hull: THREE.Material;
  deck: THREE.Material;
  teak: THREE.Material;
  coachroof: THREE.Material;
  dark: THREE.Material;
  appendage: THREE.Material;
  spar: THREE.Material;
  wire: THREE.Material;
  fitting: THREE.Material;
  optionalFitting: THREE.Material;
  block: THREE.Material;
  sail: THREE.Material;
}

export function createMaterials(): BoatMaterials {
  const c = SCENE.boat;
  // Double-sided: hull, deck and sails are open surfaces; three.js flips the normal for back
  // faces, so lighting stays right whichever side is seen.
  const lambert = (color: string, extra: THREE.MeshLambertMaterialParameters = {}) =>
    new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide, ...extra });
  return {
    hull: lambert(c.hull),
    deck: lambert(c.deck),
    teak: lambert(c.teak),
    coachroof: lambert(c.coachroof),
    dark: lambert(c.dark),
    appendage: lambert(c.appendage),
    spar: lambert(c.spar),
    wire: lambert(c.wire),
    fitting: lambert(c.fitting),
    optionalFitting: lambert(c.fitting, {
      transparent: true,
      opacity: c.optionalOpacity,
      depthWrite: false,
    }),
    block: lambert(c.block),
    sail: lambert(c.sail, { transparent: true, opacity: c.sailOpacity }),
  };
}
