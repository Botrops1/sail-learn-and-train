/** Timing helpers for pulse and Poisson voices (PHASE_AUDIO_SPEC 3.4). Pure. */

const MAX_PULSES = 40;
const MAX_POISSON = 8;

/**
 * The pulses of one frame: `phase` advances by `ratePerS · dtS`, and one offset (seconds from the
 * frame's start) is returned for every whole number crossed. At most 40; the phase still advances.
 */
export function pulses(
  phase: number,
  ratePerS: number,
  dtS: number,
): { offsetsS: number[]; phase: number } {
  if (!(ratePerS > 0) || !(dtS > 0)) return { offsetsS: [], phase };
  const p = phase + ratePerS * dtS;
  const whole = Math.floor(p);
  const offsetsS: number[] = [];
  for (let k = 1; k <= whole && offsetsS.length < MAX_PULSES; k += 1) {
    offsetsS.push((k - phase) / ratePerS);
  }
  return { offsetsS, phase: p - whole };
}

/** The events of a Poisson process within one frame, in order (at most 8). */
export function poissonTimes(rng: () => number, ratePerS: number, dtS: number): number[] {
  if (!(ratePerS > 0) || !(dtS > 0)) return [];
  const times: number[] = [];
  let t = -Math.log(1 - rng()) / ratePerS;
  while (t < dtS) {
    if (times.length < MAX_POISSON) times.push(t);
    t += -Math.log(1 - rng()) / ratePerS;
  }
  return times;
}
