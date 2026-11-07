import data from '../../content/audio/sounds.json';
import type { Severity } from '../model/contact';
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
  flap: {
    fromKn: number;
    toKn: number;
    gain: number;
    baseHz: number;
    perKnHz: number;
    bandHz: number;
    q: number;
    attackS: number;
    decayS: number;
    jitter: number;
  };
  full: { fromKn: number; toKn: number; gain: number; bandHz: number; q: number };
  engine: {
    firesPerRev: number;
    gain: number;
    idleShare: number;
    lowpassBaseHz: number;
    lowpassPerHz: number;
    subGain: number;
    startS: number;
    startFromHz: number;
    startToHz: number;
    startGain: number;
  };
  contact: {
    thumpHz: number;
    noiseLowpassHz: number;
    gain: Record<Severity, number>;
    decayS: Record<Severity, number>;
    squeakFromHz: number;
    squeakToHz: number;
    squeakS: number;
    squeakGain: number;
  };
}

export const SOUND: SoundData = data;
