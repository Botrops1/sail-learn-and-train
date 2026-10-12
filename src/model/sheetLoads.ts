import { boat, type BoatData } from './boat';
import type { SailForces } from './sailForces';
import type { RigState } from './sim';

/**
 * Loads on the two sheets from the sail forces (PHASE2_SPEC 8.3). They use the apparent wind, so
 * a gust or a faster boat raises them. Pure.
 */
export interface SheetLoads {
  mainSailForceN: number;
  jibSailForceN: number;
  /** Total pull on the boom's sheet blocks. */
  mainSheetBlocksN: number;
  /** Pull on the main sheet's rope (the tail the crew holds). */
  mainSheetRopeN: number;
  jibSheetRopeN: number;
}

/** Distance from the boom's sheet blocks to the sail's centre of effort along the foot (m). */
function mainCeDistanceM(rig: RigState, data: BoatData): number {
  return (
    data.sails.main.footLength *
    (rig.applied.mainFurl / 100) *
    data.physics.loads.mainCeAlongFootFraction
  );
}

/** The main sail force acting at its centre of effort, as a load at the boom blocks' lever (N). */
export function mainSailForceAtBlocksN(
  rig: RigState,
  forces: SailForces,
  data: BoatData = boat,
): number {
  const force = Math.hypot(forces.main.liftN, forces.main.dragN);
  return (force * mainCeDistanceM(rig, data)) / data.rig.mainsheet.boomDistance;
}

export function sheetLoads(rig: RigState, forces: SailForces, data: BoatData = boat): SheetLoads {
  const mainSailForceN = Math.hypot(forces.main.liftN, forces.main.dragN);
  const jibSailForceN = Math.hypot(forces.jib.liftN, forces.jib.dragN);
  const mainTaut = rig.solution.mainsheet.state === 'taut';
  const mainSheetBlocksN = mainTaut ? mainSailForceAtBlocksN(rig, forces, data) : 0;
  const mainSheetRopeN = mainSheetBlocksN / (2 * data.rig.mainsheet.partsPerSide);
  const jibTaut = rig.jibSolution.sheet.state === 'taut';
  const jibSheetRopeN = jibTaut
    ? (jibSailForceN * data.physics.loads.jibSheetLoadFraction) / data.sails.jib.sheet.purchase
    : 0;
  return { mainSailForceN, jibSailForceN, mainSheetBlocksN, mainSheetRopeN, jibSheetRopeN };
}
