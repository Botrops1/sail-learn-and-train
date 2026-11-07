import type { SoundData } from './soundData';
import type { VoiceId, VoiceTarget } from './types';

/**
 * The contract every voice follows (PHASE_AUDIO_SPEC 3.6). Web Audio: never imported by tests.
 */
export interface Voice {
  /** Every running frame, with the voice's target (all kinds). */
  set(target: VoiceTarget): void;
  /** Pulse and Poisson voices: one burst or call starting at `at` (context time). */
  fire?(at: number, target: VoiceTarget, rng: () => number): void;
}

export type VoiceFactory = (
  ctx: AudioContext,
  out: AudioNode,
  noise: AudioBuffer,
  data: SoundData,
  id: VoiceId,
) => Voice;

const last = new WeakMap<AudioParam, number>();

/**
 * Moves `param` to `value` with setTargetAtTime(value, now, timeS), unless |value − last| ≤
 * 0.005 · max(1, |last|), where `last` is the value this function last set on that param
 * (`AudioParam.value` does not show automation). So a gain moves in steps of at least 0.005, a
 * frequency or rate by at least 0.5 %.
 */
export function smoothTo(
  param: AudioParam,
  value: number,
  ctx: BaseAudioContext,
  timeS: number,
): void {
  const before = last.get(param);
  if (before !== undefined && Math.abs(value - before) <= 0.005 * Math.max(1, Math.abs(before)))
    return;
  last.set(param, value);
  param.setTargetAtTime(value, ctx.currentTime, timeS);
}

/** The one envelope of the app: 0 at `at`, linear to `peak` by `at + attackS`, then setTargetAtTime(0, at + attackS, decayS / 3). */
export function burst(
  param: AudioParam,
  at: number,
  peak: number,
  attackS: number,
  decayS: number,
): void {
  param.setValueAtTime(0, at);
  param.linearRampToValueAtTime(peak, at + attackS);
  param.setTargetAtTime(0, at + attackS, decayS / 3);
}

/** How many one-shot sounds are playing (a whole gull call is one); a voice raises it in `fire` and lowers it when its last node ends. */
export const oneShots = { active: 0 };

/** A noise source looping on the shared buffer, started at this voice's own offset. */
export function loopingNoise(
  ctx: AudioContext,
  noise: AudioBuffer,
  id: VoiceId,
  order: readonly VoiceId[],
): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = noise;
  source.loop = true;
  source.start(0, (order.indexOf(id) * 0.37) % noise.duration);
  return source;
}
