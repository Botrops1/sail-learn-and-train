import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SOUND_PREFS,
  onSoundPrefs,
  parseSoundPrefs,
  setSoundPrefs,
} from '../src/audio/prefs';

describe('sound prefs (M87)', () => {
  it('a volume that is not a finite number takes the default', () => {
    expect(parseSoundPrefs('{"volume":"loud"}').volume).toBe(70);
    expect(parseSoundPrefs('{"volume":null}').volume).toBe(70);
  });

  it('missing or bad text gives the defaults', () => {
    expect(parseSoundPrefs(null)).toEqual(DEFAULT_SOUND_PREFS);
    expect(parseSoundPrefs('nope')).toEqual(DEFAULT_SOUND_PREFS);
    expect(parseSoundPrefs('[1,2]')).toEqual(DEFAULT_SOUND_PREFS);
  });

  it('clamps and rounds the volume, keeps the other fields', () => {
    expect(parseSoundPrefs('{"on":true,"volume":250}')).toEqual({
      ...DEFAULT_SOUND_PREFS,
      on: true,
      volume: 100,
    });
    const odd = parseSoundPrefs('{"volume":-3,"music":"yes"}');
    expect(odd.volume).toBe(0);
    expect(odd.music).toBe(true);
    expect(parseSoundPrefs('{"volume":42.6}').volume).toBe(43);
  });

  it('setSoundPrefs calls a listener once, synchronously; the unsubscribe stops it; no storage in node', () => {
    const seen: boolean[] = [];
    const off = onSoundPrefs((p) => seen.push(p.on));
    expect(() => setSoundPrefs({ on: true })).not.toThrow();
    expect(seen).toEqual([true]);
    off();
    setSoundPrefs({ on: false });
    expect(seen).toEqual([true]);
  });

  it('setSoundPrefs clamps the volume', () => {
    expect(setSoundPrefs({ volume: 500 }).volume).toBe(100);
    expect(setSoundPrefs({ volume: Number.NaN }).volume).toBe(70);
    setSoundPrefs({ volume: 70 });
  });
});
