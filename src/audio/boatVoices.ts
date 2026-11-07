import type { SoundData } from './soundData';
import { VOICE_IDS, type SoundEvent, type VoiceId } from './types';
import { burst, loopingNoise, oneShots, smoothTo, type Voice, type VoiceFactory } from './voice';

/**
 * The boat's voices that M88 builds (PHASE_AUDIO_SPEC 7.3): the sails flapping (pulses) or full
 * (a soft rush), the engine, and the one-shot events (the engine's start, a hull contact). All are
 * generated: noise through filters, oscillators, short envelopes.
 */

/** Noise → bandpass → gain; `pulse` keeps the gain at 0 until `fire` opens it for one flap. */
function band(
  pulse: boolean,
  section: (data: SoundData) => { q: number; attackS?: number; decayS?: number },
): VoiceFactory {
  return (ctx, out, noise, data, id) => {
    const source = loopingNoise(ctx, noise, id, VOICE_IDS);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = section(data).q;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(out);
    const voice: Voice = {
      set(target) {
        const t = data.master.smoothingS;
        if (target.hz > 0) smoothTo(filter.frequency, target.hz, ctx, t);
        if (!pulse) smoothTo(gain.gain, target.gain, ctx, t);
      },
    };
    if (pulse) {
      const { attackS = 0.005, decayS = 0.06 } = section(data);
      voice.fire = (at, target) => burst(gain.gain, at, target.gain, attackS, decayS);
    }
    return voice;
  };
}

/** A sawtooth at the firing rate plus a square an octave lower, through a lowpass that opens with the pitch. */
const engineVoice: VoiceFactory = (ctx, out, _noise, data) => {
  const saw = ctx.createOscillator();
  saw.type = 'sawtooth';
  saw.frequency.value = 1;
  const square = ctx.createOscillator();
  square.type = 'square';
  square.frequency.value = 1;
  const sub = ctx.createGain();
  sub.gain.value = data.engine.subGain;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 1;
  filter.frequency.value = data.engine.lowpassBaseHz;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  saw.connect(filter);
  square.connect(sub).connect(filter);
  filter.connect(gain).connect(out);
  saw.start();
  square.start();
  return {
    set(target) {
      const t = data.master.smoothingS;
      const hz = Math.max(1, target.hz);
      smoothTo(saw.frequency, hz, ctx, t);
      smoothTo(square.frequency, Math.max(1, hz / 2), ctx, t);
      smoothTo(
        filter.frequency,
        data.engine.lowpassBaseHz + data.engine.lowpassPerHz * target.hz,
        ctx,
        t,
      );
      smoothTo(gain.gain, target.gain, ctx, t);
    },
  };
};

export const boatVoices: Partial<Record<VoiceId, VoiceFactory>> = {
  flapMain: band(true, (d) => d.flap),
  flapJib: band(true, (d) => d.flap),
  fullMain: band(false, (d) => d.full),
  fullJib: band(false, (d) => d.full),
  engine: engineVoice,
};

/** Counts the sound as one one-shot until the last of its nodes has ended. */
function track(nodes: AudioScheduledSourceNode[]): void {
  oneShots.active += 1;
  let remaining = nodes.length;
  for (const node of nodes) {
    node.onended = () => {
      node.disconnect();
      remaining -= 1;
      if (remaining === 0) oneShots.active -= 1;
    };
  }
}

/** Plays one event into `out` (the boat bus), starting after the engine's lookahead. */
export function playEvent(
  ctx: AudioContext,
  out: AudioNode,
  noise: AudioBuffer,
  event: SoundEvent,
  data: SoundData,
): void {
  const at = ctx.currentTime + data.master.lookaheadS;
  if (event.kind === 'engineStart') {
    const e = data.engine;
    const saw = ctx.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.setValueAtTime(e.startFromHz, at);
    saw.frequency.exponentialRampToValueAtTime(e.startToHz, at + e.startS);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 1;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(e.startGain, at + 0.05);
    gain.gain.setValueAtTime(e.startGain, at + e.startS);
    gain.gain.linearRampToValueAtTime(0, at + e.startS + 0.2);
    saw.connect(filter).connect(gain).connect(out);
    saw.start(at);
    saw.stop(at + e.startS + 0.25);
    track([saw]);
    return;
  }
  const c = data.contact;
  const peak = c.gain[event.severity];
  const decayS = c.decayS[event.severity];
  const gain = ctx.createGain();
  burst(gain.gain, at, peak, 0.005, decayS);
  gain.connect(out);
  const thump = ctx.createOscillator();
  thump.type = 'sine';
  thump.frequency.value = c.thumpHz;
  thump.connect(gain);
  const rumble = ctx.createBufferSource();
  rumble.buffer = noise;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = c.noiseLowpassHz;
  rumble.connect(lowpass).connect(gain);
  const end = at + 0.005 + 2 * decayS;
  thump.start(at);
  rumble.start(at);
  thump.stop(end);
  rumble.stop(end);
  const nodes: AudioScheduledSourceNode[] = [thump, rumble];
  if (event.severity === 'fender') {
    const squeak = ctx.createOscillator();
    squeak.type = 'sine';
    squeak.frequency.setValueAtTime(c.squeakFromHz, at);
    squeak.frequency.exponentialRampToValueAtTime(c.squeakToHz, at + c.squeakS);
    const squeakGain = ctx.createGain();
    burst(squeakGain.gain, at, c.squeakGain, 0.02, c.squeakS);
    squeak.connect(squeakGain).connect(out);
    squeak.start(at);
    squeak.stop(at + 0.02 + 2 * c.squeakS);
    nodes.push(squeak);
  }
  track(nodes);
}
