import { boat as hanse508, type BoatData } from './boat';
import { contactForces, type FenderSet, type Obstacle } from './contact';
import { addForces, type ExternalForces } from './lowSpeed';
import type { BoatState } from './motion';
import { thrusterForces, type ThrusterState } from './thrusters';

/** What pushes the boat from outside this frame (PHASE7_SPEC 4.3 step 4). Grows with each milestone. */
export interface HarbourInputs {
  thrusters: ThrusterState;
  /** M43: what the hull can bump into (the marina's quay, wall, pontoon and yachts; none in open water). */
  obstacles: readonly Obstacle[];
  /** M43: the fenders between the hull and an obstacle. */
  fenders: FenderSet;
}

/**
 * The external force function for one frame, called every substep by `stepBoat`
 * (`MotionInputs.external`): the thrusters and contact now; lines, ground and chain join later.
 */
export function harbourForces(
  inputs: HarbourInputs,
  data: BoatData = hanse508,
): (boat: BoatState) => ExternalForces {
  return (boat) =>
    addForces(
      thrusterForces(inputs.thrusters, boat, data),
      contactForces(boat, inputs.obstacles, inputs.fenders, data),
    );
}
