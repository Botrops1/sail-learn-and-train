import { boat, type BoatData } from './boat';
import type { BoatState } from './motion';

/**
 * The boat's track on the map (PHASE2_SPEC 7.3): one point per `trackSampleS` of simulation
 * time, the newest `trackMaxPoints` kept. Pure; not stored in the link.
 */
export interface TrackPoint {
  eastM: number;
  northM: number;
  timeS: number;
}

/**
 * Appends the boat's position when the last point is at least `trackSampleS` older, and drops
 * the oldest points beyond `trackMaxPoints`. Returns the same array when nothing is added, so
 * a caller can tell by identity that the track did not change.
 */
export function appendTrack(
  track: readonly TrackPoint[],
  boatState: BoatState,
  timeS: number,
  data: BoatData = boat,
): TrackPoint[] {
  const { trackSampleS, trackMaxPoints } = data.physics.display;
  const last = track[track.length - 1];
  if (last && timeS - last.timeS < trackSampleS) return track as TrackPoint[];
  const point: TrackPoint = { eastM: boatState.eastM, northM: boatState.northM, timeS };
  const kept =
    track.length >= trackMaxPoints ? track.slice(track.length - trackMaxPoints + 1) : track;
  return [...kept, point];
}
