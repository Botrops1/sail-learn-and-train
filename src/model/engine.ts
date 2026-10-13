import { boat as hanse508, type BoatData } from './boat';

/**
 * The engine (PHASE2_SPEC 12): one lever for gear and throttle, a gearbox that shifts through
 * neutral, rpm that follows the lever with a lag, and the thrust that pushes the boat. A teaching
 * model: thrust = maxThrust · (rpm / maxRpm)^exponent in gear. Pure.
 */
export type Gear = 'ahead' | 'neutral' | 'astern';

export interface EngineState {
  running: boolean;
  /** −100 (full astern) … +100 (full ahead). */
  leverPct: number;
  rpm: number;
  gear: Gear;
  /** Seconds the gearbox still stays in neutral before it engages the lever's side. */
  shiftS: number;
}

export function initialEngine(start: { running?: boolean; leverPct?: number } = {}): EngineState {
  const leverPct = Math.max(-100, Math.min(100, Math.round(start.leverPct ?? 0)));
  const running = start.running ?? false;
  return {
    running,
    leverPct,
    // A link that opens with the engine running finds it already turning over.
    rpm: running ? targetRpm(leverPct) : 0,
    gear: gearOf(leverPct),
    shiftS: 0,
  };
}

/** The gear a lever position asks for. */
export function gearOf(leverPct: number, data: BoatData = hanse508): Gear {
  const band = data.physics.engine.neutralBandPct;
  if (leverPct > band) return 'ahead';
  if (leverPct < -band) return 'astern';
  return 'neutral';
}

/** Idle inside the neutral band, then up to the maximum at full lever, in both directions. */
export function targetRpm(leverPct: number, data: BoatData = hanse508): number {
  const { idleRpm, maxRpm, neutralBandPct } = data.physics.engine;
  const over = Math.abs(leverPct) - neutralBandPct;
  if (over <= 0) return idleRpm;
  return idleRpm + (Math.min(100, over) / (100 - neutralBandPct)) * (maxRpm - idleRpm);
}

/**
 * Advances the engine by `dt` seconds. The rpm lags to `targetRpm` while running (to 0 when
 * stopped). The gear follows the lever's side. Whenever the gearbox leaves a gear (to the other
 * side or into the neutral band) it goes to neutral at once and stays there for
 * `gearShiftDelayS` before any gear goes in: a finger dragging the lever through the middle
 * waits just as a jump over it does. Engaging after it has sat in neutral that long is immediate.
 */
export function stepEngine(e: EngineState, dt: number, data: BoatData = hanse508): EngineState {
  const { rpmResponseS, gearShiftDelayS } = data.physics.engine;
  const goal = e.running ? targetRpm(e.leverPct, data) : 0;
  const rpm = e.rpm + (goal - e.rpm) * (1 - Math.exp(-dt / rpmResponseS));

  const wanted = gearOf(e.leverPct, data);
  let { gear, shiftS } = e;
  if (gear !== 'neutral' && wanted !== gear) {
    // The gearbox leaves its gear (to the other gear or into the neutral band): it must now stay
    // in neutral for the shift delay, however the lever moves afterwards.
    gear = 'neutral';
    shiftS = gearShiftDelayS;
  } else if (gear === 'neutral') {
    shiftS = Math.max(0, shiftS - dt);
    if (shiftS === 0 && wanted !== 'neutral') gear = wanted;
  } else {
    shiftS = 0;
  }
  return { ...e, rpm, gear, shiftS };
}

/** Thrust along the bow in newtons, + ahead: 0 when stopped or in neutral. */
export function engineThrustN(e: EngineState, data: BoatData = hanse508): number {
  if (!e.running || e.gear === 'neutral') return 0;
  const { maxRpm, maxThrustN, thrustExponent, asternThrustFactor } = data.physics.engine;
  const thrust = maxThrustN * Math.pow(Math.max(0, e.rpm) / maxRpm, thrustExponent);
  return e.gear === 'astern' ? -asternThrustFactor * thrust : thrust;
}
