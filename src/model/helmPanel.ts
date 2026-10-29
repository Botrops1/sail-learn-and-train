import { boat } from './boat';
import type { BoatData } from './boat';
import type { AutopilotState } from './autopilot';
import type { EngineState } from './engine';
import type { BoatState } from './motion';
import type { RigState } from './sim';
import type { ThrustDir, ThrusterState } from './thrusters';

export type { ThrustDir };

/** What the helm panel shows (PHASE9_SPEC 8.3); `panelReadings` fills it from the app's state (M63). */
export interface PanelReadings {
  headingDeg: number; // [0, 360)
  awaDeg: number; // (−180, 180], + from starboard
  awsKn: number;
  rpm: number;
  running: boolean;
  leverPct: number; // −100 … 100, + ahead
  bow: ThrustDir; // −1 to port, +1 to starboard, 0 let go
  stern: ThrustDir;
  autopilot: 'off' | 'heading' | 'wind';
  /** The keypad's display line. */
  courseText: string;
}

/** The panel with the boat at rest: 0° heading, no wind, engine stopped, standing by. */
export const PANEL_AT_REST: Readonly<PanelReadings> = {
  headingDeg: 0,
  awaDeg: 0,
  awsKn: 0,
  rpm: 0,
  running: false,
  leverPct: 0,
  bow: 0,
  stern: 0,
  autopilot: 'off',
  courseText: 'STANDBY',
};

/** The five parts of the app's state the panel reads. */
export type PanelSource = {
  boat: BoatState;
  rig: RigState;
  engine: EngineState;
  thrusters: ThrusterState;
  autopilot: AutopilotState;
};

/** The keypad's display line: STANDBY, HDG 045°, WIND 40° S (starboard) or WIND 135° P (port). */
export function courseText(autopilot: AutopilotState): string {
  if (autopilot.mode === 'off') return 'STANDBY';
  const t = Math.round(autopilot.targetDeg);
  if (autopilot.mode === 'heading') {
    return `HDG ${String(((t % 360) + 360) % 360).padStart(3, '0')}°`;
  }
  const whole = t === 0 ? 0 : t;
  return `WIND ${Math.abs(whole)}° ${whole >= 0 ? 'S' : 'P'}`;
}

/** What the panel shows for this state. Reads only; never changes the state. */
export function panelReadings(state: PanelSource): PanelReadings {
  return {
    headingDeg: ((state.boat.headingDeg % 360) + 360) % 360,
    awaDeg: state.rig.wind.awaDeg,
    awsKn: state.rig.wind.awsKn,
    rpm: state.engine.rpm,
    running: state.engine.running,
    leverPct: state.engine.leverPct,
    bow: state.thrusters.bow,
    stern: state.thrusters.stern,
    autopilot: state.autopilot.mode,
    courseText: courseText(state.autopilot),
  };
}

/** Rounded values: two readings with the same key draw the same face. One key per face. */
export function readingsKeys(r: PanelReadings): {
  compass: string;
  wind: string;
  tachometer: string;
  keypad: string;
} {
  return {
    compass: String(Math.round(r.headingDeg) % 360),
    wind: `${Math.round(r.awaDeg)}|${Math.round(r.awsKn * 10)}`,
    tachometer: `${Math.round(r.rpm / 10)}|${r.running}`,
    keypad: `${r.autopilot}|${r.courseText}`,
  };
}

/** The engine lever's swing on the panel: + ahead. */
export function leverAngleDeg(leverPct: number, data: BoatData = boat): number {
  return (leverPct / 100) * data.modelDetail.helmPedestal.faces.lever.maxDeg;
}

/** A thruster joystick's lean: + to starboard. */
export function joystickTiltDeg(dir: ThrustDir, data: BoatData = boat): number {
  return dir * data.modelDetail.helmPedestal.faces.joysticks.maxTiltDeg;
}

/** The tachometer needle: radians from the left end of the half-circle scale (the Engine section's TACH). */
export function tachNeedleRad(rpm: number): number {
  return Math.PI * (1 - Math.min(Math.max(rpm, 0), 3000) / 3000);
}
