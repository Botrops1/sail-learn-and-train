import type { ThrustDir } from './thrusters';

export type { ThrustDir };

/** What the helm panel shows (PHASE9_SPEC 8.3). M63 adds `panelReadings`, which fills it from the app's state. */
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
