import { SOUND } from './soundData';
import { VOICE_IDS, type VoiceId } from './types';
import { loopingNoise, smoothTo, type Voice, type VoiceFactory } from './voice';

/**
 * The four voices of the surroundings that M87 builds (PHASE_AUDIO_SPEC 6.3): wind, the whistle
 * in the rigging, the wash of the waves and the water along the hull. All are noise through one
 * filter and a gain; wind and waves also have a slow oscillator that swells the gain.
 */

/** Noise → filter → gain → out; `slow` adds the oscillator that moves the gain (the flutter, the swell). */
function filtered(
  type: BiquadFilterType,
  q: ((data: typeof SOUND) => number) | undefined,
  slow: boolean,
): VoiceFactory {
  return (ctx, out, noise, data, id) => {
    const source = loopingNoise(ctx, noise, id, VOICE_IDS);
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    if (q) filter.Q.value = q(data); // the waves' lowpass keeps the Web Audio default
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(out);
    let swell: GainNode | undefined;
    let oscillator: OscillatorNode | undefined;
    if (slow) {
      oscillator = ctx.createOscillator();
      oscillator.type = 'sine';
      swell = ctx.createGain();
      swell.gain.value = 0;
      oscillator.connect(swell).connect(gain.gain);
      oscillator.start();
    }
    return {
      set(target) {
        const t = data.master.smoothingS;
        smoothTo(filter.frequency, Math.max(20, target.hz), ctx, t);
        // The wind's gain is the value itself with a small swell added; the waves' gain is the
        // value less half the swell, with the swell added (so its top is the value).
        const depth =
          id === 'wind' ? data.wind.flutterDepth : id === 'waves' ? data.waves.swellDepth : 0;
        const base = id === 'waves' ? target.gain * (1 - depth / 2) : target.gain;
        smoothTo(gain.gain, base, ctx, t);
        if (swell && oscillator) {
          const amount = id === 'waves' ? (target.gain * depth) / 2 : depth * target.gain;
          smoothTo(swell.gain, amount, ctx, t);
          smoothTo(oscillator.frequency, Math.max(0.01, target.rate), ctx, t);
        }
      },
    } satisfies Voice;
  };
}

export const surroundingsVoices: Partial<Record<VoiceId, VoiceFactory>> = {
  wind: filtered('bandpass', (d) => d.wind.q, true),
  whistle: filtered('bandpass', (d) => d.whistle.q, false),
  waves: filtered('lowpass', undefined, true),
  hull: filtered('bandpass', (d) => d.hull.q, false),
};
