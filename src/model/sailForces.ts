import { boat, type BoatData } from './boat';
import { DEG, interpTable, knToMps } from './angles';
import type { Controls } from './controls';
import type { RigState } from './sim';

/**
 * Sail forces from the apparent wind (PHASE2_SPEC 6.3). A teaching model: lift and drag
 * coefficients of a soft sail against its angle of attack (`physics.sails`), scaled by the
 * solver's fill. Pure.
 */
export interface SailForce {
  areaM2: number;
  /** The angle of attack used for the coefficients (90 when sailing by the lee). */
  aoaDeg: number;
  fill: number;
  liftN: number;
  dragN: number;
  /** Along the boat, + = forwards. */
  driveN: number;
  /** Across the boat, a magnitude towards leeward. */
  sideN: number;
  /** Height of the sail's centre of effort above the waterline. */
  ceHeightM: number;
}

export interface SailForces {
  main: SailForce;
  jib: SailForce;
  driveN: number;
  sideN: number;
  /** Heeling moment about the waterline (Nm). Negative when the wind is from starboard. */
  heelMomentNm: number;
  /** Air drag of hull and rig; negative when the wind is from ahead (it pushes the boat back). */
  windageN: number;
}

/** Heights of the centres of effort (a third of the way up a triangle), computed once. */
export function ceHeights(data: BoatData = boat): { main: number; jib: number } {
  const { main, jib } = data.sails;
  const gooseneckY = data.rig.boom.gooseneck[1] ?? 0;
  const jibY = (point: readonly number[]) => point[1] ?? 0;
  return {
    main: (2 * (gooseneckY + main.tackHeightAboveBoom) + main.headY) / 3,
    jib: (jibY(jib.tack) + jibY(jib.head) + jibY(jib.clewTrimmedRef)) / 3,
  };
}

interface SailInput {
  areaM2: number;
  furled: boolean;
  byTheLee: boolean;
  aoaDeg: number;
  fill: number;
  ceHeightM: number;
}

function oneSail(
  sail: SailInput,
  q: number,
  beta: number,
  heelFactor: number,
  data: BoatData,
): SailForce {
  const { liftByAoaDeg, dragByAoaDeg, floggingDragCoefficient } = data.physics.sails;
  const area = sail.furled ? 0 : sail.areaM2;
  const alpha = sail.byTheLee ? 90 : Math.min(90, sail.aoaDeg);
  const f = sail.fill;
  const cl = interpTable(liftByAoaDeg, alpha) * f;
  const cd = interpTable(dragByAoaDeg, alpha) * f + floggingDragCoefficient * (1 - f);
  const lift = q * area * cl * heelFactor;
  const drag = q * area * cd * heelFactor;
  return {
    areaM2: area,
    aoaDeg: alpha,
    fill: f,
    liftN: lift,
    dragN: drag,
    driveN: lift * Math.sin(beta) - drag * Math.cos(beta),
    sideN: lift * Math.cos(beta) + drag * Math.sin(beta),
    ceHeightM: sail.ceHeightM,
  };
}

export function sailForces(
  rig: RigState,
  controls: Controls,
  awsKn: number,
  awaDeg: number,
  heelDeg: number,
  data: BoatData = boat,
): SailForces {
  void controls; // the rig already holds the applied controls
  const { main, jib } = data.sails;
  const ce = ceHeights(data);
  const q = 0.5 * data.physics.constants.airDensityKgM3 * knToMps(awsKn, data) ** 2;
  const beta = Math.abs(awaDeg) * DEG;
  const cosHeel = Math.cos(heelDeg * DEG);
  const k = cosHeel * cosHeel;
  const s = rig.solution;
  const j = rig.jibSolution;
  const mainForce = oneSail(
    {
      areaM2: (main.officialAreaM2 * rig.applied.mainFurl) / 100,
      furled: s.furled,
      byTheLee: s.byTheLee,
      aoaDeg: s.aoaDeg,
      fill: s.fill,
      ceHeightM: ce.main,
    },
    q,
    beta,
    k,
    data,
  );
  const jibForce = oneSail(
    {
      areaM2: jib.officialAreaM2 * j.unfurled,
      furled: j.furled,
      byTheLee: j.byTheLee,
      aoaDeg: j.aoaDeg,
      fill: j.fill,
      ceHeightM: ce.jib,
    },
    q,
    beta,
    k,
    data,
  );
  const sideN = mainForce.sideN + jibForce.sideN;
  const clr = data.physics.hull.clrDepthM;
  const heelMomentNm =
    -Math.sign(awaDeg) *
    (mainForce.sideN * (mainForce.ceHeightM + clr) + jibForce.sideN * (jibForce.ceHeightM + clr));
  const windageN =
    -q * data.physics.windage.areaM2 * data.physics.windage.dragCoefficient * Math.cos(beta);
  return {
    main: mainForce,
    jib: jibForce,
    driveN: mainForce.driveN + jibForce.driveN,
    sideN,
    heelMomentNm,
    windageN,
  };
}
