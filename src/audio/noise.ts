import { mulberry32 } from '../model/random';
import { SOUND } from './soundData';

/**
 * One mono buffer of white noise from the seeded generator (PHASE_AUDIO_SPEC 4.2). Every noise
 * voice loops this buffer from its own start offset, so they do not sound alike.
 */
export function noiseBuffer(
  ctx: BaseAudioContext,
  seconds = 2,
  seed = SOUND.master.noiseSeed,
): AudioBuffer {
  const length = Math.max(1, Math.round(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const rng = mulberry32(seed);
  for (let i = 0; i < length; i += 1) data[i] = rng() * 2 - 1;
  return buffer;
}
