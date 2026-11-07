import { SOUND, type SoundData } from './soundData';

/**
 * The notes of the generated music (PHASE_AUDIO_SPEC 10.3, plus the variability the owner asked
 * for on the M91 PR). Pure: a seeded generator, a cursor and a time span in, the events of that span
 * out. One call over a long span gives the same events as many calls over consecutive short ones.
 *
 * What changes slowly over a visit: the key (every 2.5 to 4.5 minutes, at a chord), how busy the
 * single notes are (`intervalScale`, a pure function of the time) and how bright the sound is
 * (`musicShape`, also a pure function of the time, used by `music.ts` for the filter).
 */

export interface MusicEvent {
  atS: number;
  kind: 'chord' | 'note';
  /** MIDI numbers (60 = middle C), already in the key that is playing. */
  midi: number[];
  /** The key in semitones from D (0 = D major pentatonic and its chords), the one this event is in. */
  key: number;
}

export interface MusicCursor {
  nextChordS: number;
  nextNoteS: number;
  /** Index of the chord that plays next. */
  chord: number;
  /** Index in the scale of the last sounding note. */
  lastNote: number;
  /** When the key changes next (at the first chord at or after this time). */
  nextKeyS: number;
  /** Index in `keys` of the key playing now. */
  key: number;
}

export const START_CURSOR: MusicCursor = {
  nextChordS: 0,
  nextNoteS: 2,
  chord: 0,
  lastNote: 2,
  nextKeyS: SOUND.music.firstKeyChangeS,
  key: 0,
};

/** MIDI number to frequency in Hz (69 = A4 = 440 Hz). */
export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

const STEPS = [-2, -1, 1, 2] as const;

/** Reflects an index back into `0 … n − 1`. */
function reflect(i: number, n: number): number {
  if (i < 0) return -i;
  if (i > n - 1) return 2 * (n - 1) - i;
  return i;
}

/** A slow wave between 0 and 1: one cycle every `periodS`, starting `phase` (0–1) into it. */
function slow(tS: number, periodS: number, phase: number): number {
  return 0.5 + 0.5 * Math.sin(2 * Math.PI * (tS / periodS + phase));
}

/** `lo + (hi − lo) · x`. */
function lerp(range: number[], x: number): number {
  const [lo = 0, hi = 0] = range;
  return lo + (hi - lo) * x;
}

/**
 * How busy the notes are at time `tS`: the factor their intervals are multiplied by (small =
 * busy, large = sparse). Drifts slowly between the two ends of `intervalScale`, one cycle every
 * `intervalPeriodS`; pure, so it adds no draws.
 */
export function intervalScale(tS: number, data: SoundData = SOUND): number {
  const m = data.music;
  return lerp(m.intervalScale, slow(tS, m.intervalPeriodS, 0.1));
}

/**
 * The sound's brightness at time `tS`: the low-pass cutoff in Hz. A mix of two slow waves with
 * periods that do not divide each other, so the pattern does not come round again for hours; it
 * moves between `lowpassMinHz` (dark) and `lowpassHz` (bright). Pure.
 */
export function musicShape(tS: number, data: SoundData = SOUND): { lowpassHz: number } {
  const m = data.music;
  const [a = 83, b = 137] = m.brightnessPeriodsS;
  const x = 0.6 * slow(tS, a, 0) + 0.4 * slow(tS, b, 0.3);
  return { lowpassHz: lerp([m.lowpassMinHz, m.lowpassHz], x) };
}

/**
 * The events with `atS` in `[fromS, toS)` and the cursor after them. Events come out sorted by
 * `atS` (a chord first when a chord and a note fall at the same time). `fromS` is only the caller's
 * frame start: the cursor already says what comes next.
 *
 * Draws, in order: a chord: the next chord, the next interval, then (only when the key changes)
 * the new key and the next key interval. A note: rest or not; if it sounds, the step and the
 * octave; then the next interval.
 */
export function musicEvents(
  rng: () => number,
  _fromS: number,
  toS: number,
  cursor: MusicCursor,
  data: SoundData = SOUND,
): { events: MusicEvent[]; cursor: MusicCursor } {
  const m = data.music;
  const events: MusicEvent[] = [];
  let { nextChordS, nextNoteS, chord, lastNote, nextKeyS, key } = cursor;
  const n = m.scale.length;
  for (;;) {
    const isChord = nextChordS <= nextNoteS;
    const atS = isChord ? nextChordS : nextNoteS;
    if (atS >= toS) break;
    if (isChord) {
      const playing = m.chords[chord] ?? [];
      chord = (chord + 1 + Math.floor(rng() * (m.chords.length - 1))) % m.chords.length;
      const [a = 0, b = 0] = m.chordEveryS;
      nextChordS += a + rng() * (b - a);
      if (atS >= nextKeyS) {
        key = (key + 1 + Math.floor(rng() * (m.keys.length - 1))) % m.keys.length;
        const [ka = 0, kb = 0] = m.keyEveryS;
        nextKeyS += ka + rng() * (kb - ka);
      }
      const shift = m.keys[key] ?? 0;
      events.push({ atS, kind: 'chord', midi: playing.map((p) => p + shift), key: shift });
    } else {
      const shift = m.keys[key] ?? 0;
      if (rng() >= m.restShare) {
        const step = STEPS[Math.floor(rng() * 4)] ?? 1;
        const index = reflect(lastNote + step, n);
        const octave = (rng() < 0.5 ? m.noteOctaves[0] : m.noteOctaves[1]) ?? 0;
        events.push({
          atS,
          kind: 'note',
          midi: [(m.scale[index] ?? 0) + octave + shift],
          key: shift,
        });
        lastNote = index;
      }
      const [a = 0, b = 0] = m.noteEveryS;
      nextNoteS += (a + rng() * (b - a)) * intervalScale(atS, data);
    }
  }
  return { events, cursor: { nextChordS, nextNoteS, chord, lastNote, nextKeyS, key } };
}
