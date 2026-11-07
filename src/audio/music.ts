import { mulberry32 } from '../model/random';
import { midiToHz, musicEvents, musicShape, START_CURSOR, type MusicCursor } from './musicScore';
import type { SoundData } from './soundData';
import { smoothTo } from './voice';

/**
 * The generated music (PHASE_AUDIO_SPEC 10.4, with the owner's variability request on the M91 PR): a slow pad of sines and triangles that changes
 * chord every 8–14 s, and now and then a single soft note, all through one low-pass filter and an
 * echo. The notes come from `musicEvents` (pure, in `musicScore.ts`); this file only plays them.
 * Web Audio: never imported by tests.
 */

export interface Music {
  /** Called every running frame while the music group is audible, with the frame's real seconds. */
  frame(dtS: number): void;
}

interface Pad {
  gain: GainNode;
  oscillators: OscillatorNode[];
}

/** Disconnects every node once the last oscillator has ended. */
function freeWhenDone(oscillators: OscillatorNode[], others: AudioNode[]): void {
  let remaining = oscillators.length;
  for (const osc of oscillators) {
    osc.onended = () => {
      osc.disconnect();
      remaining -= 1;
      if (remaining === 0) for (const node of others) node.disconnect();
    };
  }
}

export function createMusic(
  ctx: AudioContext,
  out: AudioNode,
  data: SoundData,
  onEvent: (name: string) => void,
  lookaheadS: number = data.master.lookaheadS,
): Music {
  const m = data.music;
  const rng = mulberry32(m.seed);

  // One bus: low-pass → out (dry); low-pass → delay → wet → out; delay → feedback → delay.
  const bus = ctx.createBiquadFilter();
  bus.type = 'lowpass';
  bus.frequency.value = m.lowpassHz;
  bus.connect(out);
  const delay = ctx.createDelay(Math.max(1, m.delayS * 2));
  delay.delayTime.value = m.delayS;
  const wet = ctx.createGain();
  wet.gain.value = m.delayMix;
  const feedback = ctx.createGain();
  feedback.gain.value = m.delayFeedback;
  bus.connect(delay);
  delay.connect(wet).connect(out);
  delay.connect(feedback).connect(delay);

  let clockS = 0;
  let cursor: MusicCursor = START_CURSOR;
  let pad: Pad | undefined;

  function playChord(at: number, midi: number[]): void {
    if (pad) {
      pad.gain.gain.setTargetAtTime(0, at, m.padReleaseS / 3);
      for (const osc of pad.oscillators) osc.stop(at + m.padReleaseS * 2);
    }
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(m.padGain / midi.length, at + m.padAttackS);
    gain.connect(bus);
    const oscillators: OscillatorNode[] = [];
    for (const note of midi) {
      for (const [type, cents] of [
        ['triangle', m.padDetuneCents],
        ['sine', -m.padDetuneCents],
      ] as const) {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = midiToHz(note);
        osc.detune.value = cents;
        osc.connect(gain);
        osc.start(at);
        oscillators.push(osc);
      }
    }
    freeWhenDone(oscillators, [gain]);
    pad = { gain, oscillators };
  }

  function playNote(at: number, midi: number): void {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(m.noteGain, at + 0.01);
    gain.gain.setTargetAtTime(0, at + 0.01, m.noteDecayS / 3);
    gain.connect(bus);
    const upper = ctx.createGain();
    upper.gain.value = 0.25;
    upper.connect(gain);
    const base = ctx.createOscillator();
    base.frequency.value = midiToHz(midi);
    base.connect(gain);
    const octave = ctx.createOscillator();
    octave.frequency.value = midiToHz(midi + 12);
    octave.connect(upper);
    const end = at + 0.01 + 2 * m.noteDecayS;
    for (const osc of [base, octave]) {
      osc.start(at);
      osc.stop(end);
    }
    freeWhenDone([base, octave], [upper, gain]);
  }

  return {
    frame(dtS) {
      const dt = Math.max(0, dtS);
      // The sound slowly gets brighter and darker (a pure function of the music's own clock).
      smoothTo(bus.frequency, musicShape(clockS, data).lowpassHz, ctx, 2);
      const result = musicEvents(rng, clockS, clockS + dt + lookaheadS, cursor, data);
      cursor = result.cursor;
      for (const event of result.events) {
        const at = ctx.currentTime + Math.max(0, event.atS - clockS);
        if (event.kind === 'chord') {
          playChord(at, event.midi);
          onEvent(`chord:${event.midi[0]}`);
        } else {
          playNote(at, event.midi[0] ?? 0);
          onEvent(`note:${event.midi[0]}`);
        }
      }
      clockS += dt;
    },
  };
}
