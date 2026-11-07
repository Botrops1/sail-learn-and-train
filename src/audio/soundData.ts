import data from '../../content/audio/sounds.json';
import type { SoundGroup } from './types';

/** `content/audio/sounds.json`, typed. Every number is tunable (PHASE_AUDIO_SPEC 6.2). The type grows each milestone. */
export interface SoundData {
  master: {
    groupGain: Record<SoundGroup, number>;
    pausedSurroundings: number;
    smoothingS: number;
    lookaheadS: number;
    maxOneShots: number;
    noiseSeed: number;
  };
  wind: {
    minKn: number;
    maxKn: number;
    curve: number;
    gain: number;
    lowHz: number;
    highHz: number;
    q: number;
    flutterHz: number;
    flutterDepth: number;
  };
  whistle: {
    fromKn: number;
    toKn: number;
    gain: number;
    lowHz: number;
    highHz: number;
    q: number;
  };
  waves: {
    refHeightM: number;
    floor: number;
    gain: number;
    lowpassHz: number;
    swellDepth: number;
  };
  hull: { maxKn: number; gain: number; lowHz: number; highHz: number; q: number };
}

export const SOUND: SoundData = data;
