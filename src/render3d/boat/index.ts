import * as THREE from 'three';
import { defaultControls, type Controls } from '../../model/controls';
import { carPoint, jibClew } from '../../model/jib';
import { drawnPose, ropeDrawings, type RopeDrawing, type WinchWrap } from '../../model/ropePaths';
import { jibInputFor, jibSailGrid, mainSailGrid, mainSailInputFor } from '../../model/sailShape';
import { boat } from '../../model/boat';
import type { Detail } from '../../model/settings';
import { initialRig, type RigState } from '../../model/sim';
import type { ThrusterState } from '../../model/thrusters';
import { wheelTurnDeg } from '../../model/steering';
import { buildWindex } from '../wind';
import { buildKeel, buildRudder, buildSaildrive } from './appendages';
import { buildBowGear } from './bowGear';
import { buildCockpitHardware } from './cockpitHardware';
import { buildDeckGear } from './deckGear';
import { buildFenders } from './fenders';
import { buildHelmPedestals, type PanelStats } from './helmPedestal';
import { PANEL_AT_REST, type PanelReadings } from '../../model/helmPanel';
import type { Vec3 } from '../../model/vec3';
import { buildThrusters } from './thrusters';
import { buildHull } from './hull';
import { createMaterials } from './materials';
import { buildMooringFittings } from './mooringFittings';
import { buildRig } from './rig';
import { buildRopes, type RopeStats, type RopeView } from './ropes';
import { buildSailMesh } from './sailMesh';
import { buildTelltales } from './telltales';
import { buildWinchHandle } from './winchHandle';
import type { HandlePose } from '../../model/handlePose';
import { blanketFactor, NO_DAMAGE, type SailDamage } from '../../model/trim';

export interface BoatModel {
  root: THREE.Group;
  boomPivot: THREE.Group;
  /**
   * Shows the rig as solved: boom pose, sail shapes, the jib car, ropes and the masthead
   * indicator.
   * With `ropeView`, ropes far from the camera are drawn thick enough to see. `winches`: the
   * ropes put on the winches in Realistic mode (M5); without it, Easy mode's drawing. `damage`
   * (M9): a torn sail shows its tear.
   */
  update(
    rig: RigState,
    controls: Controls,
    ropeView?: RopeView,
    flashing?: ReadonlySet<string>,
    winches?: readonly WinchWrap[],
    damage?: SailDamage,
  ): void;
  rudderPivot: THREE.Group;
  wheelPivots: THREE.Group[];
  /** The ropes as drawn by the last update (labels in 3D sit on them, M5). */
  ropeDrawings(): readonly RopeDrawing[];
  /** M60: what the last update drew (a browser-check hook). */
  ropeStats(): RopeStats;
  /** M33: hangs the fenders over the side (true) or puts them back in the locker (false). */
  setFendersOut(out: boolean): void;
  /** M41: shows the water jets of the thrusters that run. */
  setThrusters(t: ThrusterState): void;
  /** M46: shows the anchor in the bow roller (true) or hides it while the anchor is down (false). */
  setAnchorStowed(stowed: boolean): void;
  /** M50: draws the winch handle at `pose`; hidden when `pose` is null (carried) or `show` is false. */
  setHandle(pose: HandlePose | null, show: boolean): void;
  /** M63: once a frame: the panels' visibility, lever, joysticks and faces (9.4). `eye` is the camera in the boat frame. */
  updatePanel(readings: PanelReadings, eye: Vec3, nowMs: number): void;
  /** M63: what the panel last drew and posed (debug hook). */
  panelStats(): PanelStats;
  /** M62: shows every panel instrument whatever the distance (the spotlight, 8.4); false hands it back. */
  revealPanels(on: boolean): void;
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
  const mainInput = mainSailInputFor(rig, controls, rig.wind);
  const jibInput = jibInputFor(rig, controls, rig.wind);
  const mainSail = buildSailMesh('sail_main', materials, mainSailGrid(mainInput));
  const jibSail = buildSailMesh('sail_jib', materials, jibSailGrid(jibInput));
  let drawings = ropeDrawings(rig);
  const ropes = buildRopes(drawings, detail);
  const windex = buildWindex(materials);
  const telltales = buildTelltales(materials);
  const fenders = buildFenders(materials, detail);
  const thrusters = buildThrusters(materials, detail);
  const handle = buildWinchHandle(materials);
  const pedestals = buildHelmPedestals(materials, detail);
  pedestals.show(PANEL_AT_REST);
  root.add(
    ...buildHull(materials, detail),
    buildKeel(materials),
    rudderPivot,
    buildSaildrive(materials),
    ...rigParts.objects,
    ...hardware.objects,
    ...pedestals.objects,
    ...buildDeckGear(materials, detail),
    ...buildBowGear(materials, detail),
    ...buildMooringFittings(materials, detail),
    ...fenders.objects,
    ...thrusters.objects,
    handle.group,
    mainSail.mesh,
    jibSail.mesh,
    ...ropes.objects,
    windex.pivot,
    ...telltales.objects,
  );

  const update = (
    next: RigState,
    nextControls: Controls,
    ropeView?: RopeView,
    flashing?: ReadonlySet<string>,
    winches?: readonly WinchWrap[],
    damage: SailDamage = NO_DAMAGE,
  ) => {
    rigParts.setBoomPose(drawnPose(next));
    const main = mainSailInputFor(next, nextControls, next.wind);
    const mainGrid = mainSailGrid(main);
    mainSail.update(mainGrid, shown(main.unfurled));
    // On a run the main takes the jib's wind (PT-37): the jib is drawn emptier, flapping.
    const drawnJib = jibInputFor(next, nextControls, next.wind);
    const jib = { ...drawnJib, fill: drawnJib.fill * blanketFactor(next.wind.awaDeg) };
    const jibGrid = jibSailGrid(jib);
    jibSail.update(jibGrid, shown(jib.unfurled));
    telltales.update(
      next,
      next.wind.awaDeg,
      { grid: mainGrid, leeSide: main.side, shown: shown(main.unfurled) },
      { grid: jibGrid, leeSide: jib.side, shown: shown(jib.unfurled) },
      damage,
      next.timeS,
    );
    rigParts.setCarZ(carPoint(jibClew(jib.phiDeg, jib.unfurled))[2]);
    drawings = ropeDrawings(next, boat, winches);
    ropes.update(drawings, ropeView, flashing);
    windex.update(next.wind.awaDeg);
    // Wheel and rudder (PHASE1_SPEC 6.1, 4): + = rudder's back edge to starboard (a turn
    // around y), wheels turned clockwise as seen from behind them (a turn around x).
    rudderPivot.rotation.y = (next.applied.rudder * Math.PI) / 180;
    const wheel = (wheelTurnDeg(next.applied.rudder) * Math.PI) / 180;
    for (const pivot of hardware.wheelPivots) pivot.rotation.x = wheel;
    root.updateMatrixWorld(true);
  };
  update(rig, controls);
  const anchorMeshes: THREE.Object3D[] = [];
  root.traverse((object) => {
    if ((object.userData as { partId?: string }).partId === 'fit_anchor') anchorMeshes.push(object);
  });
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
    ropeDrawings: () => drawings,
    ropeStats: () => ropes.stats(),
    setFendersOut: fenders.setOut,
    setThrusters: thrusters.setState,
    setHandle: handle.set,
    updatePanel: pedestals.update,
    panelStats: pedestals.stats,
    revealPanels: pedestals.reveal,
    setAnchorStowed: (stowed) => {
      for (const mesh of anchorMeshes) mesh.visible = stowed;
    },
  };
}
