import * as THREE from 'three';
import { defaultControls, type Controls } from '../../model/controls';
import { gennakerDrawing, STOWED, type GennakerSetup } from '../../model/gennaker';
import { carPoint, jibClew } from '../../model/jib';
import {
  drawnPose,
  ropeDrawings,
  type DrawnSailor,
  type RopeDrawing,
  type WinchWrap,
} from '../../model/ropePaths';
import { jibInputFor, jibSailGrid, mainSailGrid, mainSailInputFor } from '../../model/sailShape';
import { boat, hasFeature, isDinghy } from '../../model/boat';
import type { CaptainPlacement } from '../../model/people';
import type { Detail } from '../../model/settings';
import { initialRig, type RigState } from '../../model/sim';
import type { ThrusterState } from '../../model/thrusters';
import { wheelTurnDeg } from '../../model/steering';
import { buildWindex } from '../wind';
import { buildCaptain } from '../people/captain';
import { buildKeel, buildRudder, buildSaildrive } from './appendages';
import { buildBowGear } from './bowGear';
import { buildCockpitHardware } from './cockpitHardware';
import { buildDeckGear } from './deckGear';
import { buildDinghyParts } from './dinghy';
import { buildFenders } from './fenders';
import { buildGennaker } from './gennaker';
import { buildHelmPedestals, type PanelStats } from './helmPedestal';
import { PANEL_AT_REST, type PanelReadings } from '../../model/helmPanel';
import type { Vec3 } from '../../model/vec3';
import { buildThrusters } from './thrusters';
import { buildHull } from './hull';
import { createMaterials } from './materials';
import { buildMooringFittings } from './mooringFittings';
import { buildRig } from './rig';
import { buildRopes, type RopeStats, type RopeView } from './ropes';
import { buildSmallFittings } from './smallFittings';
import { buildSailMesh } from './sailMesh';
import { buildTelltales } from './telltales';
import { buildWinchHandle } from './winchHandle';
import { buildPictures } from '../pictures';
import type { PictureId } from '../../model/pictures';
import type { HandlePose } from '../../model/handlePose';
import { blanketFactor, NO_DAMAGE, type SailDamage } from '../../model/trim';

/** A fully rigged gennaker: what the meshes are built for (the parts it does not draw are hidden). */
const RIGGED: GennakerSetup = { stage: 4, side: 1, crossS: 0, crossFromDeg: 0 };

/** What the viewer asks to see besides the boat as the rig solves it (M109, M110). */
export interface BoatView {
  /** A picture of a sail this boat does not carry (Learn's Show it working), drawn on the boat. */
  picture: PictureId | null;
  /** M110: the traveller picture's car, −100…100 (the picture's boom is drawn for it). */
  travellerCarPct?: number;
  /**
   * M110: the boom's swing drawn instead of the rig's (the traveller picture), or null. The model's
   * rig is not changed; only what is drawn follows.
   */
  boomYawDeg?: number | null;
  /** M113: the dinghy's centreboard, 0 (up) … 100 (down); 100 when missing. */
  boardPct?: number;
  /** M115: where the dinghy's sailor sits and his hands as drawn (the sheet and the tiller extension follow them). */
  sailor?: DrawnSailor & { handAft?: Vec3 };
}

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
    gennaker?: GennakerSetup,
    view?: BoatView,
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
  /** M111: places and poses the captain; `t` and `dt` in seconds, `hidden` in the Helm view of his own wheel. */
  setCaptain(placement: CaptainPlacement, hidden: boolean, t: number, dt: number): void;
  /** M116: the captain (the dinghy's sailor) moves into `frame` (a group that is not rolled, for a capsize) or, with null, back onto the boat. */
  setCaptainFrame(frame: THREE.Object3D | null): void;
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
  const dinghy = isDinghy() ? buildDinghyParts(materials) : null;
  const rigParts = buildRig(materials, detail);
  const rudderPivot = buildRudder(materials);
  if (dinghy) rudderPivot.add(dinghy.tiller);
  // What a boat has (PHASE_DINGHY_SPEC 7.5): a builder runs only when its feature is on.
  const hardware =
    hasFeature('winches') || hasFeature('wheel')
      ? buildCockpitHardware(materials, detail)
      : { objects: [], wheelPivots: [] };
  // A sail rolled away below the point where it stops pushing (PT-14) is not drawn.
  const shown = (unfurled: number) => unfurled * 100 >= boat.visual.solver.furledBelowPct;
  const mainInput = mainSailInputFor(rig, controls, rig.wind);
  const jibInput = jibInputFor(rig, controls, rig.wind);
  const mainSail = buildSailMesh('sail_main', materials, mainSailGrid(mainInput));
  const jibSail = hasFeature('jib')
    ? buildSailMesh('sail_jib', materials, jibSailGrid(jibInput))
    : null;
  let drawings = ropeDrawings(rig);
  // The gennaker's four lines get their mesh when their rigging step first draws them.
  const ropes = buildRopes(drawings, detail, (mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    root.add(mesh);
  });
  const gennakerParts = hasFeature('gennaker')
    ? buildGennaker(materials, detail)
    : { objects: [], update: () => undefined };
  const pictures = hasFeature('gennaker')
    ? buildPictures(materials, detail)
    : { objects: [], update: () => undefined };
  const windex = buildWindex(materials);
  const telltales = buildTelltales(materials);
  const fenders = hasFeature('harbour')
    ? buildFenders(materials, detail)
    : { objects: [], setOut: () => undefined };
  const thrusters = buildThrusters(materials, detail);
  const handle = hasFeature('winches')
    ? buildWinchHandle(materials)
    : { group: new THREE.Group(), set: () => undefined };
  const pedestals = hasFeature('wheel')
    ? buildHelmPedestals(materials, detail)
    : {
        objects: [],
        setEye: () => undefined,
        show: () => undefined,
        update: () => undefined,
        stats: (): PanelStats => ({
          latest: PANEL_AT_REST,
          drawn: PANEL_AT_REST,
          redraws: 0,
          pose: { leverDeg: 0, bowDeg: 0, sternDeg: 0 },
        }),
        reveal: () => undefined,
      };
  pedestals.show(PANEL_AT_REST);
  root.add(
    ...buildHull(materials, detail),
    ...(isDinghy() ? [] : [buildKeel(materials)]),
    rudderPivot,
    ...(hasFeature('engine') ? [buildSaildrive(materials)] : []),
    ...rigParts.objects,
    ...hardware.objects,
    ...pedestals.objects,
    ...(dinghy ? dinghy.objects : []),
    ...(hasFeature('cabin') ? buildDeckGear(materials, detail) : []),
    ...(detail === 'high' && hasFeature('cabin') ? buildSmallFittings(materials) : []),
    ...(hasFeature('anchor') ? buildBowGear(materials, detail) : []),
    ...(hasFeature('harbour') ? buildMooringFittings(materials, detail) : []),
    ...fenders.objects,
    ...thrusters.objects,
    handle.group,
    mainSail.mesh,
    ...(jibSail ? [jibSail.mesh] : []),
    ...ropes.objects,
    ...gennakerParts.objects,
    ...pictures.objects,
    windex.pivot,
    ...telltales.objects,
  );

  // The mainsheet's deck blocks, hidden while the traveller picture shows (filled below).
  const deckBlockMeshes: THREE.Object3D[] = [];
  const update = (
    next: RigState,
    nextControls: Controls,
    ropeView?: RopeView,
    flashing?: ReadonlySet<string>,
    winches?: readonly WinchWrap[],
    damage: SailDamage = NO_DAMAGE,
    gennakerSet: GennakerSetup = STOWED,
    view: BoatView = { picture: null },
  ) => {
    // While a picture shows, the gennaker's parts and lines are hidden (11.5): drawn as stowed.
    const gennaker = view.picture === null ? gennakerSet : STOWED;
    // The traveller picture draws the boom, the main and the boom's ropes for its own swing (12.3).
    const yaw = view.boomYawDeg ?? null;
    const drawnRig: RigState =
      yaw === null
        ? next
        : { ...next, theta: { value: yaw, velocity: 0 }, psi: { value: 0, velocity: 0 } };
    rigParts.setBoomPose(drawnPose(drawnRig));
    const main = mainSailInputFor(drawnRig, nextControls, next.wind);
    const mainGrid = mainSailGrid(main);
    mainSail.update(mainGrid, shown(main.unfurled));
    // On a run the main takes the jib's wind (PT-37): the jib is drawn emptier, flapping.
    const drawnJib = jibInputFor(next, nextControls, next.wind);
    const jib = { ...drawnJib, fill: drawnJib.fill * blanketFactor(next.wind.awaDeg) };
    const jibGrid = jibSailGrid(jib);
    // A boat with no jib draws none and its telltales stay hidden (M113).
    const jibShown = jibSail !== null && shown(jib.unfurled);
    jibSail?.update(jibGrid, jibShown);
    telltales.update(
      next,
      next.wind.awaDeg,
      { grid: mainGrid, leeSide: main.side, shown: shown(main.unfurled) },
      { grid: jibGrid, leeSide: jib.side, shown: jibShown },
      damage,
      next.timeS,
    );
    rigParts.setCarZ(carPoint(jibClew(jib.phiDeg, jib.unfurled))[2]);
    // The traveller replaces the German mainsheet and its deck blocks while its picture shows.
    const traveller = view.picture === 'traveller';
    for (const mesh of deckBlockMeshes) mesh.visible = !traveller;
    drawings = ropeDrawings(drawnRig, boat, winches, gennaker, view.sailor);
    if (traveller) drawings = drawings.filter((drawing) => drawing.id !== 'rope_mainsheet');
    ropes.update(drawings, ropeView, flashing);
    // The sail and the sock move every frame while it is set; at the other stages the parts only
    // change with the rigging step, so a still frame is not redrawn.
    const moving = gennaker.stage === 4 || drawnGennaker.stage === 4;
    if (moving || gennaker.stage !== drawnGennaker.stage || gennaker.side !== drawnGennaker.side) {
      drawnGennaker = gennaker;
      gennakerParts.update(
        gennakerDrawing(gennaker, next.gennaker),
        next.gennaker,
        next.wind.awsKn,
        next.timeS,
      );
    }
    pictures.update(view.picture, next.wind.awaDeg, view.travellerCarPct ?? 0);
    windex.update(next.wind.awaDeg);
    // Wheel and rudder (PHASE1_SPEC 6.1, 4): + = rudder's back edge to starboard (a turn
    // around y), wheels turned clockwise as seen from behind them (a turn around x).
    rudderPivot.rotation.y = (next.applied.rudder * Math.PI) / 180;
    dinghy?.setBoard(view.boardPct ?? 100);
    if (dinghy && view.sailor?.handAft) {
      dinghy.aimExtension(view.sailor.handAft, next.applied.rudder);
    }
    const wheel = (wheelTurnDeg(next.applied.rudder) * Math.PI) / 180;
    for (const pivot of hardware.wheelPivots) pivot.rotation.x = wheel;
    root.updateMatrixWorld(true);
  };
  let drawnGennaker: GennakerSetup = RIGGED;
  update(rig, controls);
  const anchorMeshes: THREE.Object3D[] = [];
  root.traverse((object) => {
    const partId = (object.userData as { partId?: string }).partId;
    if (partId === 'fit_anchor') anchorMeshes.push(object);
    if (partId === 'fit_mainsheet_deck_blocks') deckBlockMeshes.push(object);
  });
  // Sun shadows (drawn at high detail only): everything casts; thin ropes and see-through
  // windows do not catch shadows.
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const id = (object.userData as { partId?: string }).partId ?? '';
    object.castShadow = !object.material.transparent || id.startsWith('sail_');
    object.receiveShadow = !id.startsWith('rope_') && !object.material.transparent;
  });
  // The captain joins after the shadow pass above, which would give his tap area shadows. On the
  // dinghy he is its sailor (M115).
  const captain = buildCaptain(detail);
  captain.object.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = object instanceof THREE.SkinnedMesh;
    object.receiveShadow = false;
  });
  root.add(captain.object);
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
    setCaptain: captain.update,
    setCaptainFrame: (frame) => {
      const parent = frame ?? root;
      if (captain.object.parent !== parent) parent.add(captain.object);
    },
    setAnchorStowed: (stowed) => {
      for (const mesh of anchorMeshes) mesh.visible = stowed;
    },
  };
}
