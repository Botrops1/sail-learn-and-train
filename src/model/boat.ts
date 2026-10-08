import hanse508 from '../../content/boat/hanse508.json';

/** The reference boat data (content/boat/hanse508.json). Units: metres and degrees. */
export const boat = hanse508;
export type BoatData = typeof hanse508;

export interface Box3 {
  min: [number, number, number];
  max: [number, number, number];
}

/**
 * Rough bounding box of the hull in the boat frame (x forward, y up, z starboard),
 * from the transom to the stem, beam wide, from the canoe-body bottom to the highest sheer point.
 * Used for the M0 placeholder and for framing the camera.
 */
export function hullBounds(data: BoatData = boat): Box3 {
  const halfBeam = data.dimensions.beam / 2;
  const sheerTop = Math.max(...data.hull.sheerHeight.points.map((point) => point[1] ?? 0));
  return {
    min: [data.hull.transomX, -data.hull.canoeBody.maxDepthBelowWL, -halfBeam],
    max: [data.hull.stemX, sheerTop, halfBeam],
  };
}
