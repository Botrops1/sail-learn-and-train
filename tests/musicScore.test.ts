import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/model/random';
import { midiToHz, musicEvents, START_CURSOR, type MusicEvent } from '../src/audio/musicScore';
import { SOUND } from '../src/audio/soundData';

const NOTES = new Set([62, 64, 66, 69, 71, 74, 76, 78, 81, 83]);
const SCALE = SOUND.music.scale;

function run(): MusicEvent[] {
  return musicEvents(mulberry32(SOUND.music.seed), 0, 600, START_CURSOR).events;
}

describe('musicEvents (M91)', () => {
  const events = run();
  const chords = events.filter((e) => e.kind === 'chord');
  const notes = events.filter((e) => e.kind === 'note');

  it('plays a chord every 8–14 s, never the same one twice in a row', () => {
    expect(chords.length).toBeGreaterThanOrEqual(43);
    expect(chords.length).toBeLessThanOrEqual(75);
    for (let i = 1; i < chords.length; i += 1) {
      expect(chords[i]?.midi).not.toEqual(chords[i - 1]?.midi);
      const gap = (chords[i]?.atS ?? 0) - (chords[i - 1]?.atS ?? 0);
      expect(gap).toBeGreaterThanOrEqual(SOUND.music.chordEveryS[0] ?? 0);
      expect(gap).toBeLessThanOrEqual(SOUND.music.chordEveryS[1] ?? 0);
    }
    for (const c of chords) expect(SOUND.music.chords).toContainEqual(c.midi);
  });

  it('keeps every note in the scale (two octaves), moving at most two degrees', () => {
    expect(notes.length).toBeGreaterThanOrEqual(60);
    expect(notes.length).toBeLessThanOrEqual(270);
    let last = -1;
    for (const n of notes) {
      expect(n.midi).toHaveLength(1);
      expect(NOTES.has(n.midi[0] ?? 0)).toBe(true);
      const degree = SCALE.findIndex((s) => ((n.midi[0] ?? 0) - s) % 12 === 0);
      expect(degree).toBeGreaterThanOrEqual(0);
      if (last >= 0) expect(Math.abs(degree - last)).toBeLessThanOrEqual(2);
      last = degree;
    }
  });

  it('comes out sorted by time, and the first chord is the first in the list', () => {
    for (let i = 1; i < events.length; i += 1) {
      expect(events[i]?.atS).toBeGreaterThanOrEqual(events[i - 1]?.atS ?? 0);
    }
    expect(events[0]).toMatchObject({ kind: 'chord', atS: 0, midi: SOUND.music.chords[0] });
  });

  it('is deterministic for the same seed and times', () => {
    expect(run()).toEqual(events);
  });

  it('gives the same events in frames of 0.05 s as in one call', () => {
    const rng = mulberry32(SOUND.music.seed);
    let cursor = START_CURSOR;
    const framed: MusicEvent[] = [];
    for (let i = 0; i < 12000; i += 1) {
      const from = i * 0.05;
      const result = musicEvents(rng, from, (i + 1) * 0.05, cursor);
      cursor = result.cursor;
      framed.push(...result.events);
    }
    // Floating-point sums of 0.05 may differ from the exact bound by one frame at the very end.
    expect(framed.length).toBe(events.length);
    for (let i = 0; i < events.length; i += 1) {
      expect(framed[i]?.atS).toBe(events[i]?.atS);
      expect(framed[i]?.midi).toEqual(events[i]?.midi);
    }
  });

  it('reflects a step off either end of the scale back into it', () => {
    const edge = SCALE.length - 1;
    for (const lastNote of [0, edge]) {
      for (let seed = 1; seed < 60; seed += 1) {
        const rng = mulberry32(seed);
        const { events: out, cursor } = musicEvents(rng, 0, 10, {
          ...START_CURSOR,
          nextChordS: 100,
          lastNote,
        });
        for (const e of out) expect(NOTES.has(e.midi[0] ?? 0)).toBe(true);
        expect(cursor.lastNote).toBeGreaterThanOrEqual(0);
        expect(cursor.lastNote).toBeLessThanOrEqual(edge);
      }
    }
  });
});

describe('midiToHz', () => {
  it('maps 69 to 440 Hz and 60 to middle C', () => {
    expect(midiToHz(69)).toBe(440);
    expect(midiToHz(60)).toBeCloseTo(261.6256, 3);
    expect(midiToHz(81)).toBeCloseTo(880, 6);
  });
});
