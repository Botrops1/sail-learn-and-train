/** Does this browser have Web Audio? (PHASE_AUDIO_SPEC 4.3.) Safari older than 14.1 has only `webkitAudioContext`. */

export function audioContextClass(): typeof AudioContext | undefined {
  const g = globalThis as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return g.AudioContext ?? g.webkitAudioContext;
}

export function soundSupported(): boolean {
  return typeof audioContextClass() === 'function';
}
