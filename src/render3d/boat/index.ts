import * as THREE from 'three';
import { defaultControls, type Controls } from '../../model/controls';
import { carPoint, jibClew } from '../../model/jib';
import { drawnPose, ropeDrawings } from '../../model/ropePaths';
import { jibInputFor, jibSailGrid, mainSailGrid, mainSailInputFor } from '../../model/sailShape';
import { boat } from '../../model/boat';
import type { Detail } from '../../model/settings';
import { initialRig, type RigState } from '../../model/sim';
import { buildWindex } from '../wind';
import { buildKeel, buildRudder, buildSaildrive } from './appendages';
import { buildCockpitHardware } from './cockpitHardware';
import { buildDeckGear } from './deckGear';
import { buildHull } from './hull';
import { createMaterials } from './materials';
import { buildRig } from './rig';
import { buildRopes, type RopeView } from './ropes';
import { buildSailMesh } from './sailMesh';

export interface BoatModel {
  root: THREE.Group;
  boomPivot: THREE.Group;
  /**
   * Shows the rig as solved: boom pose, sail shapes, the jib car, ropes and the masthead
   * indicator.
   * With `ropeView`, ropes far from the camera are drawn thick enough to see.
   */
  update(rig: RigState, controls: Controls, ropeView?: RopeView): void;
  rudderPivot: THREE.Group;
  wheelPivots: THREE.Group[];
}

/**
 * The Hanse 508 (PHASE1_SPEC 6.1), built from primitives using content/boat/hanse508.json.
 * Every mesh carries a registry id in userData.partId. Works without WebGL (pure geometry), so
 * tests can inspect it. `update` moves the boom and the jib car, reshapes the sails and redraws
 * the ropes.
 */
export function buildBoat(
  controls: Controls = defaultControls(),
  rig: RigState = initialRig(controls),
  detail: Detail = 'high',
): BoatModel {
  const materials = createMaterials(detail);
  const root = new THREE.Group();
  root.name = 'boat';
  const rigParts = buildRig(materials, detail);
  const rudderPivot = buildRudder(materials);
  const hardware = buildCockpitHardware(materials, detail);
  // A sail rolled away below the point where it stops pushing (PT-14) is not drawn.
  const shown = (unfurled: number) => unfurled * 100 >= boat.visual.solver.furledBelowPct;
  const mainInput = mainSailInputFor(rig, controls);
  const jibInput = jibInputFor(rig, controls);
  const mainSail = buildSailMesh('sail_main', materials, mainSailGrid(mainInput));
  const jibSail = buildSailMesh('sail_jib', materials, jibSailGrid(jibInput));
  const ropes = buildRopes(ropeDrawings(rig));
  const windex = buildWindex(materials);
  root.add(
    ...buildHull(materials),
    buildKeel(materials),
    rudderPivot,
    buildSaildrive(materials),
    ...rigParts.objects,
    ...hardware.objects,
    ...buildDeckGear(materials, detail),
    mainSail.mesh,
    jibSail.mesh,
    ...ropes.objects,
    windex.pivot,
  );

  const update = (next: RigState, nextControls: Controls, ropeView?: RopeView) => {
    rigParts.setBoomPose(drawnPose(next));
    const main = mainSailInputFor(next, nextControls);
    mainSail.update(mainSailGrid(main), shown(main.unfurled));
    const jib = jibInputFor(next, nextControls);
    jibSail.update(jibSailGrid(jib), shown(jib.unfurled));
    rigParts.setCarZ(carPoint(jibClew(jib.phiDeg, jib.unfurled))[2]);
    ropes.update(ropeDrawings(next), ropeView);
    windex.update(nextControls.ctl_wind_dir);
    root.updateMatrixWorld(true);
  };
  update(rig, controls);
  // Sun shadows (drawn at high detail only): everything casts; thin ropes and see-through
  // windows do not catch shadows.
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const id = (object.userData as { partId?: string }).partId ?? '';
    object.castShadow = !object.material.transparent || id.startsWith('sail_');
    object.receiveShadow = !id.startsWith('rope_') && !object.material.transparent;
  });
  return {
    root,
    boomPivot: rigParts.boomPivot,
    update,
    rudderPivot,
    wheelPivots: hardware.wheelPivots,
  };
}
