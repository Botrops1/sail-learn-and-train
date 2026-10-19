import { boat as hanse508, type BoatData } from './boat';
import type { ExternalForces } from './lowSpeed';
import type { BoatState } from './motion';
import { thrusterForces, type ThrusterState } from './thrusters';

/** What pushes the boat from outside this frame (PHASE7_SPEC 4.3 step 4). Grows with each milestone. */
export interface HarbourInputs {
  thrusters: ThrusterState;
}

/**
 * The external force function for one frame, called every substep by `stepBoat`
 * (`MotionInputs.external`): the thrusters now; contact, lines, ground and chain join later.
 */
export function harbourForces(
  inputs: HarbourInputs,
  data: BoatData = hanse508,
): (boat: BoatState) => ExternalForces {
  return (boat) => thrusterForces(inputs.thrusters, boat, data);
}
