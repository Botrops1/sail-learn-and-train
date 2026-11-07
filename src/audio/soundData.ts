import data from '../../content/audio/sounds.json';
import type { Severity } from '../model/contact';
import type { PlaceId } from '../model/places';
import type { TrafficId } from '../model/marina';
import type { Daylight } from '../model/clock';
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
  winchMotor: {
    gain: number;
    baseHz: number;
    speedHz: number;
    refSpeedMps: number;
    strainDrop: number;
    q: number;
  };
  winchClicks: {
    gain: number;
    perMetre: number;
    maxRate: number;
    gearboxPerTurn: number;
    clickHz: number;
    clickS: number;
  };
  easyRopes: { refPctPerS: number; clicksPerPct: number };
  cutOut: { gain: number; hz: number; s: number };
  ropeRun: { gain: number; refSpeedMps: number; lowHz: number; highHz: number; q: number };
  windlass: { gain: number; upHz: number; downHz: number; q: number };
  chain: { gain: number; perMetre: number; maxRate: number; clickHz: number; clickS: number };
  anchorClank: { gain: number; hz: number; s: number };
  thruster: { gain: number; bowHz: number; sternHz: number; q: number; rampS: number };
  halyards: {
    baseRate: number;
    perKnRate: number;
    traffic: Record<TrafficId, number>;
    gain: number;
    hzA: number;
    hzB: number;
    s: number;
  };
  lapping: {
    place: Record<PlaceId, number>;
    gain: number;
    rate: number;
    lowpassHz: number;
    attackS: number;
    s: number;
  };
  gulls: {
    perMinute: Record<PlaceId, number>;
    gain: Record<PlaceId, number>;
    fromHz: number;
    toHz: number;
    noteS: number;
    gapS: number;
    notesMin: number;
    notesMax: number;
    bandHz: number;
    q: number;
    attackS: number;
  };
  smallBirds: {
    perMinute: Record<PlaceId, number>;
    gain: number;
    fromHz: number;
    toHz: number;
    chirpS: number;
    gapS: number;
    chirpsMin: number;
    chirpsMax: number;
  };
  birdLight: Record<Daylight, number>;
  birdWind: { fromKn: number; share: number };
  music: {
    seed: number;
    scale: number[];
    chords: number[][];
    chordEveryS: number[];
    padAttackS: number;
    padReleaseS: number;
    padGain: number;
    padDetuneCents: number;
    noteEveryS: number[];
    noteOctaves: number[];
    noteGain: number;
    noteDecayS: number;
    restShare: number;
    delayS: number;
    delayFeedback: number;
    delayMix: number;
    lowpassHz: number;
    /** The filter's darkest cutoff; `lowpassHz` is its brightest. */
    lowpassMinHz: number;
    /** Two slow periods (seconds) whose mix moves the cutoff between the two. */
    brightnessPeriodsS: number[];
    /** The note intervals are multiplied by a number that drifts between these (busy … sparse). */
    intervalScale: number[];
    intervalPeriodS: number;
    /** Key changes: semitones from D, a different one each time. */
    keys: number[];
    keyEveryS: number[];
    firstKeyChangeS: number;
  };
}

export const SOUND: SoundData = data;
