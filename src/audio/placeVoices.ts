import type { VoiceId } from './types';
import { burst, track, type VoiceFactory } from './voice';

/**
 * The voices of the marina and the birds that M90 builds (PHASE_AUDIO_SPEC 9.3): halyards tapping on
 * the masts, water lapping, gulls and small birds. All four are Poisson voices: the engine draws when
 * a call happens, and each `fire` builds its own short nodes, which count as one one-shot until the
 * last of them ends. All are generated: oscillators and the shared noise through filters and short
 * envelopes.
 */

/** Starts every node at `at` and stops it `lengthS` later. */
function startAll(nodes: AudioScheduledSourceNode[], at: number, lengthS: number): void {
  for (const node of nodes) {
    node.start(at);
    node.stop(at + lengthS);
  }
}

/** A halyard tapping the mast: two short sines (a ring of metal), the second's pitch and the loudness vary. */
const halyards: VoiceFactory = (ctx, out, _noise, data) => {
  const h = data.halyards;
  return {
    set() {
      // Nothing between calls: the engine draws the taps.
    },
    fire(at, target, rng) {
      const a = rng();
      const b = rng();
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(out);
      const sines = [h.hzA, h.hzB * (0.95 + 0.1 * a)].map((hz) => {
        const sine = ctx.createOscillator();
        sine.type = 'sine';
        sine.frequency.value = hz;
        sine.connect(gain);
        return sine;
      });
      burst(gain.gain, at, target.gain * (0.5 + 0.5 * b), 0.002, h.s);
      startAll(sines, at, 0.002 + 2 * h.s);
      track(sines);
    },
  };
};

/** A small slap of water against the hull: low noise swelling and fading. */
const lapping: VoiceFactory = (ctx, out, noise, data) => {
  const l = data.lapping;
  return {
    set() {
      // Nothing between calls.
    },
    fire(at, target, rng) {
      const source = ctx.createBufferSource();
      source.buffer = noise;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = target.hz > 0 ? target.hz : l.lowpassHz;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      source.connect(filter).connect(gain).connect(out);
      burst(gain.gain, at, target.gain, l.attackS, l.s);
      // `start(when, offset)`, so each slap is a different piece of the noise.
      const offset = (rng() * 1.5) % noise.duration;
      const length = l.attackS + 2 * l.s;
      source.start(at, offset);
      source.stop(at + length);
      track([source]);
    },
  };
};

/** A gull's call: two to four falling notes, each a sawtooth sweeping down through a bandpass. */
const gulls: VoiceFactory = (ctx, out, _noise, data) => {
  const g = data.gulls;
  return {
    set() {
      // Nothing between calls.
    },
    fire(at, target, rng) {
      const n = g.notesMin + Math.floor(rng() * (g.notesMax - g.notesMin + 1));
      const oscillators: OscillatorNode[] = [];
      for (let k = 0; k < n; k += 1) {
        const r = rng();
        const start = at + k * (g.noteS + g.gapS);
        const saw = ctx.createOscillator();
        saw.type = 'sawtooth';
        saw.frequency.setValueAtTime(g.fromHz * (0.9 + 0.2 * r), start);
        saw.frequency.exponentialRampToValueAtTime(g.toHz, start + g.noteS);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = g.bandHz;
        filter.Q.value = g.q;
        const gain = ctx.createGain();
        gain.gain.value = 0;
        saw.connect(filter).connect(gain).connect(out);
        burst(gain.gain, start, target.gain, g.attackS, g.noteS);
        saw.start(start);
        saw.stop(start + g.attackS + 2 * g.noteS);
        oscillators.push(saw);
      }
      track(oscillators);
    },
  };
};

/** A small bird: three to six short rising chirps, each a sine sweeping up. */
const smallBirds: VoiceFactory = (ctx, out, _noise, data) => {
  const s = data.smallBirds;
  return {
    set() {
      // Nothing between calls.
    },
    fire(at, target, rng) {
      const n = s.chirpsMin + Math.floor(rng() * (s.chirpsMax - s.chirpsMin + 1));
      const oscillators: OscillatorNode[] = [];
      for (let k = 0; k < n; k += 1) {
        const r = rng();
        const start = at + k * (s.chirpS + s.gapS);
        const sine = ctx.createOscillator();
        sine.type = 'sine';
        sine.frequency.setValueAtTime(s.fromHz, start);
        sine.frequency.exponentialRampToValueAtTime(s.toHz * (0.9 + 0.2 * r), start + s.chirpS);
        const gain = ctx.createGain();
        gain.gain.value = 0;
        sine.connect(gain).connect(out);
        burst(gain.gain, start, target.gain, 0.005, s.chirpS);
        sine.start(start);
        sine.stop(start + 0.005 + 2 * s.chirpS);
        oscillators.push(sine);
      }
      track(oscillators);
    },
  };
};

export const placeVoices: Partial<Record<VoiceId, VoiceFactory>> = {
  halyards,
  lapping,
  gulls,
  smallBirds,
};
