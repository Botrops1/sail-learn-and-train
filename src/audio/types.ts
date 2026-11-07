/**
 * Sound types shared by the pure files and the Web Audio files (PHASE_AUDIO_SPEC 3.2). Pure: no DOM,
 * no Web Audio, so levels.ts, prefs.ts and soundData.ts import from here without a cycle.
 */

import type { Severity } from '../model/contact';

export type SoundGroup = 'music' | 'surroundings' | 'boat';

export interface SoundPrefs {
  on: boolean;
  music: boolean;
  surroundings: boolean;
  boat: boolean;
  /** The overall volume, 0–100. */
  volume: number;
  /** The volume of each group, 0–100, on top of the overall one (a balance control). */
  musicVolume: number;
  surroundingsVolume: number;
  boatVolume: number;
}

/** The `SoundPrefs` field that holds a group's volume. */
export const GROUP_VOLUME_KEY = {
  music: 'musicVolume',
  surroundings: 'surroundingsVolume',
  boat: 'boatVolume',
} as const satisfies Record<SoundGroup, keyof SoundPrefs>;

/** What one voice should do now; unused fields are 0. */
export interface VoiceTarget {
  gain: number;
  hz: number;
  rate: number;
}

/** M88–M90 append their voices, in their order. */
export const VOICE_IDS = [
  'wind',
  'whistle',
  'waves',
  'hull',
  'flapMain',
  'flapJib',
  'fullMain',
  'fullJib',
  'engine',
  'winchMotor',
  'winchClicks',
  'ropeRun',
  'windlass',
  'chain',
  'thrusterBow',
  'thrusterStern',
  'halyards',
  'lapping',
  'gulls',
  'smallBirds',
] as const;
export type VoiceId = (typeof VOICE_IDS)[number];
export type VoiceKind = 'continuous' | 'pulse' | 'poisson';

/** A one-shot sound the engine plays once (M88: the engine's start and a hull contact; M89: a winch cutting out, the anchor going down or up). */
export type SoundEvent =
  | { kind: 'contact'; severity: Severity }
  | { kind: 'engineStart' }
  | { kind: 'cutOut' }
  | { kind: 'anchorDown' }
  | { kind: 'anchorUp' };

export interface SoundTargets {
  groups: Record<SoundGroup, number>;
  voices: Record<VoiceId, VoiceTarget>;
  events: SoundEvent[];
}

/** Which bus each voice plays through. */
export const VOICE_GROUP: Record<VoiceId, SoundGroup> = {
  wind: 'surroundings',
  whistle: 'surroundings',
  waves: 'surroundings',
  hull: 'surroundings',
  flapMain: 'boat',
  flapJib: 'boat',
  fullMain: 'boat',
  fullJib: 'boat',
  engine: 'boat',
  winchMotor: 'boat',
  winchClicks: 'boat',
  ropeRun: 'boat',
  windlass: 'boat',
  chain: 'boat',
  thrusterBow: 'boat',
  thrusterStern: 'boat',
  halyards: 'surroundings',
  lapping: 'surroundings',
  gulls: 'surroundings',
  smallBirds: 'surroundings',
};

/** How the engine drives each voice (PHASE_AUDIO_SPEC 3.6). */
export const VOICE_KIND: Record<VoiceId, VoiceKind> = {
  wind: 'continuous',
  whistle: 'continuous',
  waves: 'continuous',
  hull: 'continuous',
  flapMain: 'pulse',
  flapJib: 'pulse',
  fullMain: 'continuous',
  fullJib: 'continuous',
  engine: 'continuous',
  winchMotor: 'continuous',
  winchClicks: 'pulse',
  ropeRun: 'continuous',
  windlass: 'continuous',
  chain: 'pulse',
  thrusterBow: 'continuous',
  thrusterStern: 'continuous',
  halyards: 'poisson',
  lapping: 'poisson',
  gulls: 'poisson',
  smallBirds: 'poisson',
};

/** Poisson voices whose calls the probe records (M90: gulls → 'gull', smallBirds → 'chirp'). */
export const PROBE_NAME: Partial<Record<VoiceId, string>> = { gulls: 'gull', smallBirds: 'chirp' };
