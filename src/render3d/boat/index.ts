import * as THREE from 'three';
import { buildKeel, buildRudder, buildSaildrive } from './appendages';
import { buildCockpitHardware } from './cockpitHardware';
import { buildDeckGear } from './deckGear';
import { buildHull } from './hull';
import { createMaterials } from './materials';
import { buildRig } from './rig';
import { buildSails } from './sails';
import type { BoomPose } from '../../model/rigGeometry';

export interface BoatModel {
  root: THREE.Group;
  boomPivot: THREE.Group;
  /** Swings and pitches the boom (the rigid vang strut follows). Static at θ = ψ = 0 in M1. */
  setBoomPose(pose: BoomPose): void;
  rudderPivot: THREE.Group;
  wheelPivots: THREE.Group[];
}

/**
 * The static Hanse 508 (PHASE1_SPEC 6.1, milestone M1), built from primitives using
 * content/boat/hanse508.json. Every mesh carries a registry id in userData.partId.
 * Works without WebGL (pure geometry), so tests can inspect it.
 */
export function buildBoat(): BoatModel {
  const materials = createMaterials();
  const root = new THREE.Group();
  root.name = 'boat';
  const rig = buildRig(materials);
  const rudderPivot = buildRudder(materials);
  const hardware = buildCockpitHardware(materials);
  root.add(
    ...buildHull(materials),
    buildKeel(materials),
    rudderPivot,
    buildSaildrive(materials),
    ...rig.objects,
    ...hardware.objects,
    ...buildDeckGear(materials),
    ...buildSails(materials),
  );
  root.updateMatrixWorld(true);
  return {
    root,
    boomPivot: rig.boomPivot,
    setBoomPose: (pose) => {
      rig.setBoomPose(pose);
      root.updateMatrixWorld(true);
    },
    rudderPivot,
    wheelPivots: hardware.wheelPivots,
  };
}
