import { area, type AreaData } from './area';
import { boat as hanse508, type BoatData } from './boat';
import { contactForces, type FenderSet, type Obstacle } from './contact';
import { addForces, type ExternalForces } from './lowSpeed';
import { lineForces, type MooringLine } from './mooringLines';
import type { BoatState } from './motion';
import type { PlaceId } from './places';
import { groundForces, landObstacles } from './seabed';
import { thrusterForces, type ThrusterState } from './thrusters';

const NO_LINES: readonly MooringLine[] = [];

/** What pushes the boat from outside this frame (PHASE7_SPEC 4.3 step 4). Grows with each milestone. */
export interface HarbourInputs {
  thrusters: ThrusterState;
  /** M43: what the hull can bump into (the marina's quay, wall, pontoon and yachts; none in open water). */
  obstacles: readonly Obstacle[];
  /** M43: the fenders between the hull and an obstacle. */
  fenders: FenderSet;
  /** M44: the mooring lines that are on (none when left out). */
  lines?: readonly MooringLine[];
  /** M45: the place; the bay adds the bottom and the land (the marina's obstacles come in `obstacles`). Open water when left out. */
  place?: PlaceId;
}

/**
 * The external force function for one frame, called every substep by `stepBoat`
 * (`MotionInputs.external`): the thrusters, contact, mooring lines and, in the bay, the bottom
 * and the land now; the chain joins later.
 */
export function harbourForces(
  inputs: HarbourInputs,
  data: BoatData = hanse508,
  areaData: AreaData = area,
): (boat: BoatState) => ExternalForces {
  const bay = inputs.place === 'bay';
  const obstacles = bay ? [...inputs.obstacles, ...landObstacles(areaData)] : inputs.obstacles;
  return (boat) =>
    addForces(
      thrusterForces(inputs.thrusters, boat, data),
      contactForces(boat, obstacles, inputs.fenders, data),
      lineForces(inputs.lines ?? NO_LINES, boat, data),
      ...(bay ? [groundForces(boat, areaData, data)] : []),
    );
}
