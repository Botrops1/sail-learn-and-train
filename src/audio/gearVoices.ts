import type { SoundData } from './soundData';
import { VOICE_IDS, type SoundEvent, type VoiceId } from './types';
import { burst, loopingNoise, smoothTo, track, type VoiceFactory } from './voice';

/**
 * The gear's voices that M89 builds (PHASE_AUDIO_SPEC 8.3): the winch motor and its ratchet clicks,
 * a rope running out, the anchor windlass and its chain, the thrusters, and the one-shot events (a
 * winch cutting out, the anchor going down or up). All are generated: noise through filters,
 * oscillators, short envelopes.
 */

/** The events this file plays. */
export type GearEvent = Extract<SoundEvent, { kind: 'cutOut' | 'anchorDown' | 'anchorUp' }>;

/**
 * A voice of an oscillator and/or noise through a bandpass that follows the target's `hz` to a gain.
 * `osc` adds a sawtooth at that `hz`, `noise` adds the shared noise, both at equal gain. A target
 * with `hz` 0 leaves the pitch where it was (only the gain falls).
 */
function bandVoice(
  osc: boolean,
  noiseToo: boolean,
  section: (data: SoundData) => { q: number },
  smoothing: (data: SoundData) => number = (data) => data.master.smoothingS,
): VoiceFactory {
  return (ctx, out, noise, data, id) => {
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = section(data).q;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    filter.connect(gain).connect(out);
    let saw: OscillatorNode | undefined;
    if (osc) {
      saw = ctx.createOscillator();
      saw.type = 'sawtooth';
      saw.connect(filter);
      saw.start();
    }
    if (noiseToo) loopingNoise(ctx, noise, id, VOICE_IDS).connect(filter);
    return {
      set(target) {
        const t = smoothing(data);
        if (target.hz > 0) {
          smoothTo(filter.frequency, target.hz, ctx, t);
          if (saw) smoothTo(saw.frequency, target.hz, ctx, t);
        }
        smoothTo(gain.gain, target.gain, ctx, t);
      },
    };
  };
}

/** Noise → filter → a gain at 0; `fire` opens it for one click (a pulse voice, 3.6). */
function clickVoice(
  filterType: BiquadFilterType,
  settings: (data: SoundData) => { hz: number; q: number; attackS: number; decayS: number },
): VoiceFactory {
  return (ctx, out, noise, data, id) => {
    const s = settings(data);
    const source = loopingNoise(ctx, noise, id, VOICE_IDS);
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = s.hz;
    filter.Q.value = s.q;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(out);
    return {
      set() {
        // Nothing to move between clicks.
      },
      fire(at, target) {
        burst(gain.gain, at, target.gain, s.attackS, s.decayS);
      },
    };
  };
}

export const gearVoices: Partial<Record<VoiceId, VoiceFactory>> = {
  winchMotor: bandVoice(true, false, (d) => d.winchMotor),
  winchClicks: clickVoice('highpass', (d) => ({
    hz: d.winchClicks.clickHz,
    q: 1,
    attackS: 0.001,
    decayS: d.winchClicks.clickS,
  })),
  ropeRun: bandVoice(false, true, (d) => d.ropeRun),
  windlass: bandVoice(true, false, (d) => d.windlass),
  chain: clickVoice('bandpass', (d) => ({
    hz: d.chain.clickHz,
    q: 3,
    attackS: 0.002,
    decayS: d.chain.clickS,
  })),
  thrusterBow: bandVoice(
    true,
    true,
    (d) => d.thruster,
    (d) => d.thruster.rampS / 3,
  ),
  thrusterStern: bandVoice(
    true,
    true,
    (d) => d.thruster,
    (d) => d.thruster.rampS / 3,
  ),
};

/** Plays one event into `out` (the boat bus), starting after the engine's lookahead. */
export function playEvent(
  ctx: AudioContext,
  out: AudioNode,
  _noise: AudioBuffer,
  event: GearEvent,
  data: SoundData,
): void {
  const at = ctx.currentTime + data.master.lookaheadS;
  const gain = ctx.createGain();
  gain.connect(out);
  const oscillators: OscillatorNode[] = [];
  if (event.kind === 'cutOut') {
    const c = data.cutOut;
    const square = ctx.createOscillator();
    square.type = 'square';
    square.frequency.value = c.hz;
    square.connect(gain);
    oscillators.push(square);
    burst(gain.gain, at, c.gain, 0.002, c.s);
    stopAll(oscillators, at, 0.002 + 2 * c.s);
  } else {
    // The anchor's clank: a sine and one a fifth-ish above (×1.48), like metal on metal.
    const k = data.anchorClank;
    for (const ratio of [1, 1.48]) {
      const sine = ctx.createOscillator();
      sine.type = 'sine';
      sine.frequency.value = k.hz * ratio;
      sine.connect(gain);
      oscillators.push(sine);
    }
    burst(gain.gain, at, k.gain, 0.002, k.s);
    stopAll(oscillators, at, 0.002 + 2 * k.s);
  }
  track(oscillators);
}

function stopAll(oscillators: OscillatorNode[], at: number, lengthS: number): void {
  for (const node of oscillators) {
    node.start(at);
    node.stop(at + lengthS);
  }
}
