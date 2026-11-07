/**
 * Sound types shared by the pure files and the Web Audio files (PHASE_AUDIO_SPEC 3.2). Pure: no DOM,
 * no Web Audio, so levels.ts, prefs.ts and soundData.ts import from here without a cycle.
 */

export type SoundGroup = 'music' | 'surroundings' | 'boat';

export interface SoundPrefs {
  on: boolean;
  music: boolean;
  surroundings: boolean;
  boat: boolean;
  /** 0–100. */
  volume: number;
}

/** What one voice should do now; unused fields are 0. */
export interface VoiceTarget {
  gain: number;
  hz: number;
  rate: number;
}

/** M88–M90 append their voices, in their order. */
export const VOICE_IDS = ['wind', 'whistle', 'waves', 'hull'] as const;
export type VoiceId = (typeof VOICE_IDS)[number];
export type VoiceKind = 'continuous' | 'pulse' | 'poisson';

/** M88 makes this a union of objects with `kind`. */
export type SoundEvent = never;

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
};

/** How the engine drives each voice (PHASE_AUDIO_SPEC 3.6). */
export const VOICE_KIND: Record<VoiceId, VoiceKind> = {
  wind: 'continuous',
  whistle: 'continuous',
  waves: 'continuous',
  hull: 'continuous',
};

/** Poisson voices whose calls the probe records (M90: gulls → 'gull', smallBirds → 'chirp'). */
export const PROBE_NAME: Partial<Record<VoiceId, string>> = {};
