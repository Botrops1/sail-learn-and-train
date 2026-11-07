import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../src/model/random';
import {
  intervalScale,
  midiToHz,
  musicEvents,
  musicShape,
  START_CURSOR,
  type MusicEvent,
} from '../src/audio/musicScore';
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
    const bare = (c: MusicEvent | undefined): number[] =>
      (c?.midi ?? []).map((n) => n - (c?.key ?? 0));
    for (let i = 1; i < chords.length; i += 1) {
      expect(bare(chords[i])).not.toEqual(bare(chords[i - 1]));
      const gap = (chords[i]?.atS ?? 0) - (chords[i - 1]?.atS ?? 0);
      expect(gap).toBeGreaterThanOrEqual(SOUND.music.chordEveryS[0] ?? 0);
      expect(gap).toBeLessThanOrEqual(SOUND.music.chordEveryS[1] ?? 0);
    }
    for (const c of chords) expect(SOUND.music.chords).toContainEqual(bare(c));
  });

  it('keeps every note in the scale of its key (two octaves), moving at most two degrees', () => {
    expect(notes.length).toBeGreaterThanOrEqual(60);
    expect(notes.length).toBeLessThanOrEqual(270);
    let last = -1;
    for (const n of notes) {
      expect(n.midi).toHaveLength(1);
      const bareNote = (n.midi[0] ?? 0) - n.key;
      expect(NOTES.has(bareNote)).toBe(true);
      const degree = SCALE.findIndex((s) => (bareNote - s) % 12 === 0);
      expect(degree).toBeGreaterThanOrEqual(0);
      if (last >= 0) expect(Math.abs(degree - last)).toBeLessThanOrEqual(2);
      last = degree;
    }
  });

  it('comes out sorted by time, and the first chord is the first in the list', () => {
    for (let i = 1; i < events.length; i += 1) {
      expect(events[i]?.atS).toBeGreaterThanOrEqual(events[i - 1]?.atS ?? 0);
    }
    expect(events[0]).toMatchObject({
      kind: 'chord',
      atS: 0,
      midi: SOUND.music.chords[0],
      key: 0,
    });
  });

  it('keeps the first key until the first change, then changes key only at a chord (owner request)', () => {
    const keys = SOUND.music.keys;
    const first = SOUND.music.firstKeyChangeS;
    const [every0 = 0, every1 = 0] = SOUND.music.keyEveryS;
    let key = 0;
    let lastChange = 0;
    const changes: number[] = [];
    for (const e of events) {
      expect(keys).toContain(e.key);
      if (e.kind === 'note') expect(e.key).toBe(key);
      else if (e.key !== key) {
        changes.push(e.atS);
        // The first change is at the first chord at or after the first time, the later ones
        // 150 to 270 s after the one before (plus the wait for the next chord).
        if (changes.length === 1) expect(e.atS).toBeGreaterThanOrEqual(first);
        else expect(e.atS - lastChange).toBeGreaterThanOrEqual(every0);
        expect(e.atS - lastChange).toBeLessThanOrEqual(Math.max(first, every1) + 14 + 14);
        lastChange = e.atS;
        key = e.key;
      }
    }
    expect(changes.length).toBeGreaterThanOrEqual(2);
    expect(new Set(events.map((e) => e.key)).size).toBeGreaterThanOrEqual(3);
    for (const e of events.filter((x) => x.atS < first)) expect(e.key).toBe(0);
  });

  it('notes get busier and sparser over the visit', () => {
    const long = musicEvents(mulberry32(SOUND.music.seed), 0, 1800, START_CURSOR).events;
    const per100 = Array.from(
      { length: 18 },
      (_, i) =>
        long.filter((e) => e.kind === 'note' && e.atS >= i * 100 && e.atS < (i + 1) * 100).length,
    );
    expect(Math.max(...per100) / Math.max(1, Math.min(...per100))).toBeGreaterThan(1.5);
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

describe('musicShape and intervalScale (owner request)', () => {
  const [min, max] = [SOUND.music.lowpassMinHz, SOUND.music.lowpassHz];
  const [lo = 0, hi = 0] = SOUND.music.intervalScale;

  it('keeps the brightness between its darkest and brightest, and uses most of the range', () => {
    let a = Infinity;
    let b = 0;
    for (let t = 0; t < 3000; t += 1) {
      const hz = musicShape(t).lowpassHz;
      expect(hz).toBeGreaterThanOrEqual(min);
      expect(hz).toBeLessThanOrEqual(max);
      a = Math.min(a, hz);
      b = Math.max(b, hz);
    }
    expect(b - a).toBeGreaterThan(0.9 * (max - min));
  });

  it('is slow: no big jump in a second, and not repeating after one period', () => {
    for (let t = 0; t < 600; t += 1) {
      expect(Math.abs(musicShape(t + 1).lowpassHz - musicShape(t).lowpassHz)).toBeLessThan(
        0.05 * (max - min),
      );
    }
    const [period = 83] = SOUND.music.brightnessPeriodsS;
    expect(Math.abs(musicShape(period).lowpassHz - musicShape(0).lowpassHz)).toBeGreaterThan(1);
  });

  it('is the same every time for the same time', () => {
    expect(musicShape(123.4)).toEqual(musicShape(123.4));
    expect(intervalScale(55)).toBe(intervalScale(55));
  });

  it('keeps the note intervals between busy and sparse', () => {
    let a = Infinity;
    let b = 0;
    for (let t = 0; t < 3000; t += 1) {
      const x = intervalScale(t);
      expect(x).toBeGreaterThanOrEqual(lo - 1e-9);
      expect(x).toBeLessThanOrEqual(hi + 1e-9);
      a = Math.min(a, x);
      b = Math.max(b, x);
    }
    expect(b - a).toBeGreaterThan(0.9 * (hi - lo));
  });
});

describe('midiToHz', () => {
  it('maps 69 to 440 Hz and 60 to middle C', () => {
    expect(midiToHz(69)).toBe(440);
    expect(midiToHz(60)).toBeCloseTo(261.6256, 3);
    expect(midiToHz(81)).toBeCloseTo(880, 6);
  });
});
