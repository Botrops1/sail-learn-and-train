import { SOUND, type SoundData } from './soundData';

/**
 * The notes of the generated music (PHASE_AUDIO_SPEC 10.3). Pure: a seeded generator, a cursor
 * and a time span in, the events of that span out. One call over a long span gives the same events
 * as many calls over consecutive short ones.
 */

export interface MusicEvent {
  atS: number;
  kind: 'chord' | 'note';
  /** MIDI numbers (60 = middle C). */
  midi: number[];
}

export interface MusicCursor {
  nextChordS: number;
  nextNoteS: number;
  /** Index of the chord that plays next. */
  chord: number;
  /** Index in the scale of the last sounding note. */
  lastNote: number;
}

export const START_CURSOR: MusicCursor = { nextChordS: 0, nextNoteS: 2, chord: 0, lastNote: 2 };

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

/**
 * The events with `atS` in `[fromS, toS)` and the cursor after them. Events come out sorted by
 * `atS` (a chord first when a chord and a note fall at the same time). `fromS` is only the caller's
 * frame start: the cursor already says what comes next.
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
  let { nextChordS, nextNoteS, chord, lastNote } = cursor;
  const n = m.scale.length;
  for (;;) {
    const isChord = nextChordS <= nextNoteS;
    const atS = isChord ? nextChordS : nextNoteS;
    if (atS >= toS) break;
    if (isChord) {
      events.push({ atS, kind: 'chord', midi: [...(m.chords[chord] ?? [])] });
      chord = (chord + 1 + Math.floor(rng() * (m.chords.length - 1))) % m.chords.length;
      const [a = 0, b = 0] = m.chordEveryS;
      nextChordS += a + rng() * (b - a);
    } else {
      if (rng() >= m.restShare) {
        const step = STEPS[Math.floor(rng() * 4)] ?? 1;
        const index = reflect(lastNote + step, n);
        const octave = (rng() < 0.5 ? m.noteOctaves[0] : m.noteOctaves[1]) ?? 0;
        events.push({ atS, kind: 'note', midi: [(m.scale[index] ?? 0) + octave] });
        lastNote = index;
      }
      const [a = 0, b = 0] = m.noteEveryS;
      nextNoteS += a + rng() * (b - a);
    }
  }
  return { events, cursor: { nextChordS, nextNoteS, chord, lastNote } };
}
