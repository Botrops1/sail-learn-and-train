import { boat, type BoatData } from './boat';
import { stationWinch, type RealisticState, type StationId } from './realistic';
import type { HelmWheel, RopesMode } from './settings';
import type { Vec3 } from './vec3';

/**
 * The captain on board (PHASE_PEOPLE_SPEC 7.3): the deck points where he can stand and where
 * he stands for the mode, the station and the wheel. Pure: no DOM, no three.js.
 */

export interface DeckPoint {
  id: string;
  at: Vec3;
  /** 1 starboard, −1 port, 0 a point on (or near) the centreline that has no side. */
  side: 1 | -1 | 0;
  /** Out of the cockpit, on the side deck, coachroof or foredeck: M112's windward rule applies. */
  deck: boolean;
  /** Only the spots where the captain stops have one. */
  faceDeg: number | null;
}

export type FigurePose = 'stand' | 'steer' | 'work' | 'walk';

export interface CaptainInput {
  ropesMode: RopesMode;
  realistic: RealisticState;
  helmWheel: HelmWheel;
}

export interface CaptainPlacement {
  /** Where the feet stand, boat frame. */
  feet: Vec3;
  faceDeg: number;
  pose: FigurePose;
  /** Metres walked in the current walk (0 when standing): the stride's phase. */
  walkedM: number;
}

interface PointData {
  at: readonly number[];
  sided?: boolean;
  deck?: boolean;
  faceDeg?: number;
}

const cache = new WeakMap<BoatData, Record<string, DeckPoint>>();

/** Every deck point by id, sided points expanded to `<id>_s` and `<id>_p`. */
export function deckPoints(data: BoatData = boat): Record<string, DeckPoint> {
  const cached = cache.get(data);
  if (cached) return cached;
  const result: Record<string, DeckPoint> = {};
  const points = data.people.points as Record<string, PointData>;
  for (const [id, p] of Object.entries(points)) {
    const x = p.at[0] ?? 0;
    const y = p.at[1] ?? 0;
    const z = p.at[2] ?? 0;
    const deck = p.deck === true;
    const faceDeg = typeof p.faceDeg === 'number' ? p.faceDeg : null;
    if (p.sided === true) {
      result[`${id}_s`] = { id: `${id}_s`, at: [x, y, z], side: 1, deck, faceDeg };
      result[`${id}_p`] = {
        id: `${id}_p`,
        at: [x, y, -z],
        side: -1,
        deck,
        faceDeg: faceDeg === null || faceDeg === 0 ? faceDeg : -faceDeg,
      };
    } else {
      result[id] = { id, at: [x, y, z], side: 0, deck, faceDeg };
    }
  }
  cache.set(data, result);
  return result;
}

/** The point id where the captain stands at a Realistic station. */
export function stationSpot(station: StationId, helmSide: 1 | -1, data: BoatData = boat): string {
  const spot = (data.people.stationSpots as Record<string, string>)[station] ?? 'helm';
  if (spot in deckPoints(data)) return spot;
  return `${spot}${helmSide === 1 ? '_s' : '_p'}`;
}

export function captainPlacement(input: CaptainInput, data: BoatData = boat): CaptainPlacement {
  const helmSide = input.helmWheel === 'starboard' ? 1 : -1;
  const station: StationId = input.ropesMode === 'easy' ? 'helm' : input.realistic.station;
  const id = stationSpot(station, helmSide, data);
  const point = deckPoints(data)[id];
  if (!point) throw new Error(`captainPlacement: no deck point ${id}`);

  let pose: FigurePose = 'stand';
  if (input.ropesMode === 'easy' || id.startsWith('helm_')) {
    pose = 'steer';
  } else if (id.startsWith('winch_')) {
    const w = stationWinch(station, data);
    if (w !== null && input.realistic.winches[w]?.button === true) pose = 'work';
  }
  return { feet: point.at, faceDeg: point.faceDeg ?? 0, pose, walkedM: 0 };
}
