import { area, type AreaData } from './area';
import { boat as hanse508, type BoatData } from './boat';
import type { Obstacle } from './contact';
import {
  forceAt,
  NO_FORCES,
  pointToMap,
  pointVelocity,
  vectorToBoat,
  type ContactHit,
  type ExternalForces,
  type HullPart,
} from './lowSpeed';
import { insidePolygon, rectPolygon } from './marina';
import type { BoatState } from './motion';

/**
 * The bay's depth map and bottom (M45, PHASE7_SPEC 11.3): how deep the water is at a map point,
 * what the bottom is made of, and the force of the bottom on a keel that is too deep for it. Pure.
 */
export type SeabedType = 'sand' | 'mud' | 'weed' | 'rock';

/** The distance from (x, y) to the nearest edge of a closed polygon. */
function distanceToEdges(polygon: readonly [number, number][], x: number, y: number): number {
  let best = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [ax, ay] = polygon[j] as [number, number];
    const [bx, by] = polygon[i] as [number, number];
    const ex = bx - ax;
    const ey = by - ay;
    const len2 = ex * ex + ey * ey;
    const u = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / len2));
    best = Math.min(best, Math.hypot(x - (ax + u * ex), y - (ay + u * ey)));
  }
  return best;
}

function inBasin(eastM: number, northM: number, areaData: AreaData): boolean {
  const b = areaData.marina.basin;
  return eastM >= b.west && eastM <= b.east && northM >= b.south && northM <= b.north;
}

/**
 * Water depth in metres at a map point (≤ 0 = land): the marina's basin is `marina.depthM`; the
 * bay's land rises inland; water gets deeper with the distance from the coast up to
 * `openDepthM`; a hidden rock rises as a smooth mound so a keel that meets it is pushed off its
 * side instead of being stopped by a wall.
 */
export function depthAt(eastM: number, northM: number, areaData: AreaData = area): number {
  if (inBasin(eastM, northM, areaData)) return areaData.marina.depthM;
  const bay = areaData.bay;
  const b = distanceToEdges(bay.coast, eastM, northM);
  if (insidePolygon(bay.coast, eastM, northM)) {
    return -Math.min(bay.landMaxHeightM, bay.landSlope * b);
  }
  const natural = Math.min(areaData.openDepthM, bay.slope * b);
  let depth = natural;
  for (const rock of bay.rocks) {
    const r = Math.hypot(eastM - rock.eastM, northM - rock.northM);
    if (r >= rock.radiusM) continue;
    const mound = rock.topDepthM + (natural - rock.topDepthM) * (r / rock.radiusM) ** 2;
    depth = Math.min(depth, mound);
  }
  return depth;
}

/** What the bottom is made of at a map point. */
export function seabedAt(eastM: number, northM: number, areaData: AreaData = area): SeabedType {
  const bay = areaData.bay;
  for (const rock of bay.rocks) {
    if (Math.hypot(eastM - rock.eastM, northM - rock.northM) <= rock.radiusM) return 'rock';
  }
  const inLand = insidePolygon(bay.coast, eastM, northM);
  if (inLand || distanceToEdges(bay.coast, eastM, northM) <= bay.rockShoreM) return 'rock';
  for (const patch of bay.weed) {
    if (Math.hypot(eastM - patch.eastM, northM - patch.northM) <= patch.radiusM) return 'weed';
  }
  if (inBasin(eastM, northM, areaData)) return areaData.marina.seabed;
  return 'sand';
}

/** The horizontal gradient of the depth (towards deeper water), by central differences of `gradientStepM`. */
export function depthGradient(
  eastM: number,
  northM: number,
  areaData: AreaData = area,
  data: BoatData = hanse508,
): [number, number] {
  const h = data.physics.ground.gradientStepM;
  return [
    (depthAt(eastM + h, northM, areaData) - depthAt(eastM - h, northM, areaData)) / (2 * h),
    (depthAt(eastM, northM + h, areaData) - depthAt(eastM, northM - h, areaData)) / (2 * h),
  ];
}

/** A point of our hull that can touch the bottom: boat frame x, and the depth it needs. */
export interface GroundPoint {
  x: number;
  needM: number;
  part: HullPart;
}

const pointCache = new WeakMap<BoatData, GroundPoint[]>();

/** The deepest points of our hull, boat frame: the keel's bulb and the bottom of the rudder. */
export function groundPoints(data: BoatData = hanse508): GroundPoint[] {
  const found = pointCache.get(data);
  if (found) return found;
  const built: GroundPoint[] = [
    { x: data.physics.ground.keelX, needM: data.dimensions.draft, part: 'keel' },
    { x: data.hull.rudder.stockX, needM: -data.hull.rudder.bottomY, part: 'stern' },
  ];
  pointCache.set(data, built);
  return built;
}

/**
 * The bottom's push on every point of the hull that is deeper than the water: a spring in
 * proportion to how deep it is in, along the slope towards deeper water, with friction against
 * the way it moves and a little damping. Called every substep (PHASE7_SPEC 3.4).
 */
export function groundForces(
  boat: BoatState,
  areaData: AreaData = area,
  data: BoatData = hanse508,
): ExternalForces {
  const g = data.physics.ground;
  const parts: ExternalForces[] = [];
  const contacts: ContactHit[] = [];
  for (const point of groundPoints(data)) {
    const [east, north] = pointToMap(boat, point.x, 0);
    const pen = point.needM - depthAt(east, north, areaData);
    if (pen <= 0) continue;
    const n = g.stiffnessNPerM * pen;
    const [gradE, gradN] = depthGradient(east, north, areaData, data);
    const gradient = Math.hypot(gradE, gradN);
    const slope = Math.min(g.maxSlope, gradient);
    const push = gradient < 1e-6 ? 0 : (n * slope) / gradient;
    const [ve, vn] = pointVelocity(boat, point.x, 0, data);
    const speed = Math.hypot(ve, vn);
    const drag = (g.friction * n) / Math.max(speed, 0.05) + g.dampingNsPerM;
    const [fx, fz] = vectorToBoat(
      push * gradE - drag * ve,
      push * gradN - drag * vn,
      boat.headingDeg,
    );
    parts.push(forceAt(point.x, 0, fx, fz, data));
    contacts.push({
      key: `bottom:${point.part}`,
      obstacleId: 'bottom',
      partId: 'env_seabed',
      part: point.part,
      approachMps: speed,
      fender: false,
    });
  }
  if (parts.length === 0) return NO_FORCES;
  let surgeN = 0;
  let sideN = 0;
  let momentNm = 0;
  for (const part of parts) {
    surgeN += part.surgeN;
    sideN += part.sideN;
    momentNm += part.momentNm;
  }
  return { surgeN, sideN, momentNm, contacts };
}

const landCache = new WeakMap<AreaData, Obstacle[]>();

/** The bay's land as obstacles for `contactForces` (id `land`, `env_shore`); the same list for the same area. */
export function landObstacles(areaData: AreaData = area): Obstacle[] {
  const found = landCache.get(areaData);
  if (found) return found;
  const built = areaData.bay.landObstacles.map((rect): Obstacle => ({
    id: 'land',
    partId: 'env_shore',
    polygon: rectPolygon(rect),
  }));
  landCache.set(areaData, built);
  return built;
}
