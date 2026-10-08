import * as THREE from 'three';
import { defaultControls, type Controls } from '../../model/controls';
import { drawnPose, ropeDrawings } from '../../model/ropePaths';
import type { MainSailShapeInput } from '../../model/sailShape';
import { initialRig, type RigState } from '../../model/sim';
import { buildWindex } from '../wind';
import { buildKeel, buildRudder, buildSaildrive } from './appendages';
import { buildCockpitHardware } from './cockpitHardware';
import { buildDeckGear } from './deckGear';
import { buildHull } from './hull';
import { buildMainSail } from './mainSail';
import { createMaterials } from './materials';
import { buildRig } from './rig';
import { buildRopes, type RopeView } from './ropes';
import { buildJib } from './sails';

export interface BoatModel {
  root: THREE.Group;
  boomPivot: THREE.Group;
  /**
   * Shows the rig as solved: boom pose, mainsail shape, ropes and the masthead indicator.
   * With `ropeView`, ropes far from the camera are drawn thick enough to see.
   */
  update(rig: RigState, controls: Controls, ropeView?: RopeView): void;
  rudderPivot: THREE.Group;
  wheelPivots: THREE.Group[];
}

function sailInput(rig: RigState, controls: Controls): MainSailShapeInput {
  return {
    pose: drawnPose(rig),
    unfurled: rig.applied.mainFurl / 100,
    fill: rig.fill,
    side: rig.solution.side,
    windSpeedKn: controls.ctl_wind_speed,
    timeS: rig.timeS,
  };
}

/**
 * The Hanse 508 (PHASE1_SPEC 6.1), built from primitives using content/boat/hanse508.json.
 * Every mesh carries a registry id in userData.partId. Works without WebGL (pure geometry), so
 * tests can inspect it. `update` moves the boom, reshapes the main and redraws the ropes.
 */
export function buildBoat(
  controls: Controls = defaultControls(),
  rig: RigState = initialRig(controls),
): BoatModel {
  const materials = createMaterials();
  const root = new THREE.Group();
  root.name = 'boat';
  const rigParts = buildRig(materials);
  const rudderPivot = buildRudder(materials);
  const hardware = buildCockpitHardware(materials);
  const mainSail = buildMainSail(materials, sailInput(rig, controls));
  const ropes = buildRopes(ropeDrawings(rig));
  const windex = buildWindex(materials);
  root.add(
    ...buildHull(materials),
    buildKeel(materials),
    rudderPivot,
    buildSaildrive(materials),
    ...rigParts.objects,
    ...hardware.objects,
    ...buildDeckGear(materials),
    mainSail.mesh,
    buildJib(materials),
    ...ropes.objects,
    windex.pivot,
  );

  const update = (next: RigState, nextControls: Controls, ropeView?: RopeView) => {
    rigParts.setBoomPose(drawnPose(next));
    mainSail.update(sailInput(next, nextControls));
    ropes.update(ropeDrawings(next), ropeView);
    windex.update(nextControls.ctl_wind_dir);
    root.updateMatrixWorld(true);
  };
  update(rig, controls);
  return {
    root,
    boomPivot: rigParts.boomPivot,
    update,
    rudderPivot,
    wheelPivots: hardware.wheelPivots,
  };
}
