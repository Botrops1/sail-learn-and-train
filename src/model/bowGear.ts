import { boat, type BoatData } from './boat';
import { sheerAt } from './hullShape';
import { vec3, type Vec3 } from './vec3';

/**
 * The bow gear (M31): the chain's links and the anchor's fluke as numbers, so the 3D builder
 * only turns them into meshes and the tests can check them. Boat frame: x forward, y up,
 * z starboard. Data: `deckFittings.bowRoller`, `anchor`, `chain` and `windlass`.
 */

/** The deck height under the windlass (sheerAt(windlass.x)). */
export function windlassBaseY(data: BoatData = boat): number {
  return sheerAt(data.deckFittings.windlass.x, data);
}

/** Chain links: centre, direction along the chain (unit), and the turn about it (0 or π/2, alternating). */
export function chainLinks(data: BoatData = boat): { centre: Vec3; along: Vec3; turn: number }[] {
  const { pitch } = data.deckFittings.chain;
  const from = vec3(data.deckFittings.chain.from);
  const to = vec3(data.deckFittings.chain.to);
  const delta: Vec3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const length = Math.hypot(...delta);
  const count = Math.max(2, Math.round(length / pitch));
  const along: Vec3 = [delta[0] / length, delta[1] / length, delta[2] / length];
  return Array.from({ length: count }, (_, i) => {
    const f = (i + 0.5) / count;
    const centre: Vec3 = [from[0] + delta[0] * f, from[1] + delta[1] * f, from[2] + delta[2] * f];
    return { centre, along, turn: i % 2 === 0 ? 0 : Math.PI / 2 };
  });
}

/** The anchor's fluke: two triangles, each [crown, wing, tip]; the starboard half first, then the port half (mirrored wing). */
export function anchorFluke(data: BoatData = boat): [Vec3, Vec3, Vec3][] {
  const crown = vec3(data.deckFittings.anchor.crown);
  const wing = vec3(data.deckFittings.anchor.flukeWing);
  const tipOffset = vec3(data.deckFittings.anchor.flukeTip);
  const plus = (o: Vec3): Vec3 => [crown[0] + o[0], crown[1] + o[1], crown[2] + o[2]];
  const tip = plus(tipOffset);
  return [
    [crown, plus(wing), tip],
    [crown, plus([wing[0], wing[1], -wing[2]]), tip],
  ];
}
