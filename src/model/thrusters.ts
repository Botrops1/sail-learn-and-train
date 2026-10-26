import { interpTable, mpsToKn } from './angles';
import { boat as hanse508, type BoatData } from './boat';
import { keelLineAt, sectionPoint } from './hullShape';
import { addForces, forceAt, type ExternalForces } from './lowSpeed';
import type { BoatState } from './motion';

/**
 * The bow and stern thrusters (PHASE7_SPEC 7.3): a small sideways propeller at each end, worked
 * with a left-right joystick while it is held. `-1` pushes that end to port, `+1` to starboard,
 * `0` is off. They push well when the boat is nearly stopped and little once she moves
 * (PT-33). Pure.
 */
export type ThrustDir = -1 | 0 | 1;

export interface ThrusterState {
  bow: ThrustDir;
  stern: ThrustDir;
}

export const THRUSTERS_OFF: Readonly<ThrusterState> = { bow: 0, stern: 0 };

/** The share of the thrust left at this boat speed (`speedFactorByKn`, by |speed| in knots). */
export function thrusterSpeedFactor(speedMps: number, data: BoatData = hanse508): number {
  return interpTable(data.physics.thrusters.speedFactorByKn, mpsToKn(Math.abs(speedMps), data));
}

/** Whether this boat has a thruster at that end (`hull.thrusters` lists 0, 1 or 2 of them, M57). */
export function hasThruster(end: 'bow' | 'stern', data: BoatData = hanse508): boolean {
  return data.hull.thrusters.some((thruster) => thruster.end === end);
}

/** The ends this boat has a thruster at, bow first. */
export function thrusterEnds(data: BoatData = hanse508): ('bow' | 'stern')[] {
  return (['bow', 'stern'] as const).filter((end) => hasThruster(end, data));
}

/** The x of a thruster on the centreline, boat frame (from `hull.thrusters`). */
export function thrusterX(end: 'bow' | 'stern', data: BoatData = hanse508): number {
  const found = data.hull.thrusters.find((thruster) => thruster.end === end);
  if (!found) throw new Error(`no ${end} thruster in the boat data`);
  return found.x;
}

/** The thrusters' push on the boat now (a missing one adds nothing), at their x on the centreline, boat frame. */
export function thrusterForces(
  t: ThrusterState,
  boat: BoatState,
  data: BoatData = hanse508,
): ExternalForces {
  const { bowThrustN, sternThrustN } = data.physics.thrusters;
  const f = thrusterSpeedFactor(boat.speedMps, data);
  const parts: ExternalForces[] = [];
  if (hasThruster('bow', data)) {
    parts.push(forceAt(thrusterX('bow', data), 0, 0, t.bow * bowThrustN * f, data));
  }
  if (hasThruster('stern', data)) {
    parts.push(forceAt(thrusterX('stern', data), 0, 0, t.stern * sternThrustN * f, data));
  }
  return addForces(...parts);
}

/**
 * Where a thruster's tunnel is, boat frame: halfway between the waterline and the hull bottom at
 * its x (owner, PR #99: both thrusters are tunnels through the hull, a hole on each side).
 */
export function thrusterTunnelPlace(
  end: 'bow' | 'stern',
  data: BoatData = hanse508,
): {
  x: number;
  y: number;
  diameter: number;
  /** Half the hull's width at the tunnel's height: the tunnel's openings are at z = ±halfWidth. */
  halfWidthM: number;
} {
  const tunnel = data.hull.thrusters.find((thruster) => thruster.end === end);
  if (!tunnel) throw new Error(`no ${end} thruster in the boat data`);
  const y = keelLineAt(tunnel.x, data) / 2;
  // sectionPoint runs from the keel line (s = 0) up to the deck edge (s = 1): find the s at y.
  let low = 0;
  let high = 1;
  for (let i = 0; i < 40; i += 1) {
    const mid = (low + high) / 2;
    if (sectionPoint(tunnel.x, mid, data)[0] < y) low = mid;
    else high = mid;
  }
  return {
    x: tunnel.x,
    y,
    diameter: tunnel.diameter,
    halfWidthM: sectionPoint(tunnel.x, (low + high) / 2, data)[1],
  };
}
