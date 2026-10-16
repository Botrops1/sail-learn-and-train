import { boat, type BoatData } from './boat';
import { ropeBinBox } from './ropeBin';
import { vec3, type Vec3 } from './vec3';

/**
 * M34 (owner, PR #81): the backstay runs from the masthead down to a block low on the stay, and
 * from the block two ends go down in a V into the top of the two rope boxes, where they end
 * inside the box, a little in front of its aft face and below its top. Positions in the boat frame (x forward, y up, z starboard), metres.
 */
export interface BackstayRig {
  top: Vec3;
  block: Vec3;
  /** The two ends: starboard first, then port. */
  legs: [Vec3, Vec3];
}

export function backstayRig(data: BoatData = boat): BackstayRig {
  const stay = data.rig.backstay;
  const end = (side: 1 | -1): Vec3 => {
    const box = ropeBinBox(side, data);
    return [box.aftX + stay.legInsetM, box.topY - stay.legDropM, box.centre.z];
  };
  return { top: vec3(stay.top), block: vec3(stay.block), legs: [end(1), end(-1)] };
}
