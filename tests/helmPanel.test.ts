import { describe, expect, it } from 'vitest';
import { initialState } from '../src/app/store';
import {
  courseText,
  joystickTiltDeg,
  leverAngleDeg,
  panelReadings,
  PANEL_AT_REST,
  readingsKeys,
  tachNeedleRad,
  type PanelReadings,
  type PanelSource,
} from '../src/model/helmPanel';
import type { AutopilotState } from '../src/model/autopilot';

/** M63 (PHASE9_SPEC 9.6): what the helm panel shows for the app's state. */
const source = (patch: Partial<PanelSource> = {}): PanelSource => {
  const s = initialState();
  return {
    boat: s.boat,
    rig: s.rig,
    engine: s.engine,
    thrusters: s.thrusters,
    autopilot: s.autopilot,
    ...patch,
  };
};
const heading = (headingDeg: number) =>
  panelReadings(source({ boat: { ...source().boat, headingDeg } }));
const ap = (mode: AutopilotState['mode'], targetDeg: number): AutopilotState => ({
  mode,
  targetDeg,
  integralDeg: 0,
});
const reading = (patch: Partial<PanelReadings>): PanelReadings => ({ ...PANEL_AT_REST, ...patch });

describe('helmPanel (M63)', () => {
  it('1. readings come from the state', () => {
    const base = source();
    const r = panelReadings({ ...base, boat: { ...base.boat, headingDeg: 123.4 } });
    expect(r.headingDeg).toBeCloseTo(123.4, 9);
    expect(r.awaDeg).toBe(base.rig.wind.awaDeg);
    expect(r.awsKn).toBe(base.rig.wind.awsKn);
    expect(r.autopilot).toBe(base.autopilot.mode);
  });

  it('2. the heading is normalised', () => {
    expect(heading(-10).headingDeg).toBeCloseTo(350, 9);
    expect(heading(370).headingDeg).toBeCloseTo(10, 9);
    expect(heading(0).headingDeg).toBe(0);
  });

  it('3. courseText', () => {
    expect(courseText(ap('off', 0))).toBe('STANDBY');
    expect(courseText(ap('heading', 45.4))).toBe('HDG 045°');
    expect(courseText(ap('heading', 359.6))).toBe('HDG 000°');
    expect(courseText(ap('heading', 7))).toBe('HDG 007°');
    expect(courseText(ap('wind', 40))).toBe('WIND 40° S');
    expect(courseText(ap('wind', -135.2))).toBe('WIND 135° P');
    expect(courseText(ap('wind', 0))).toBe('WIND 0° S');
    expect(courseText(ap('wind', -0.4))).toBe('WIND 0° S');
  });

  it('4. engine and thrusters are copied', () => {
    const base = source();
    const r = panelReadings({
      ...base,
      engine: { ...base.engine, running: true, rpm: 1850, leverPct: 66 },
      thrusters: { bow: 1, stern: -1 },
    });
    expect(r).toMatchObject({ running: true, rpm: 1850, leverPct: 66, bow: 1, stern: -1 });
  });

  it('5. readingsKeys round', () => {
    const k = readingsKeys;
    expect(k(reading({ headingDeg: 90.2 })).compass).toBe(k(reading({ headingDeg: 90.4 })).compass);
    expect(k(reading({ headingDeg: 90.2 })).compass).not.toBe(
      k(reading({ headingDeg: 91.0 })).compass,
    );
    expect(k(reading({ headingDeg: 359.7 })).compass).toBe('0');
    expect(k(reading({ rpm: 1851 })).tachometer).toBe(k(reading({ rpm: 1849 })).tachometer);
    expect(k(reading({ rpm: 1851 })).tachometer).not.toBe(k(reading({ rpm: 1866 })).tachometer);
    expect(k(reading({ awsKn: 12.31 })).wind).toBe(k(reading({ awsKn: 12.34 })).wind);
    expect(k(reading({ awsKn: 12.31 })).wind).not.toBe(k(reading({ awsKn: 12.36 })).wind);
  });

  it('6. lever angle and joystick tilt', () => {
    expect(leverAngleDeg(100)).toBeCloseTo(45, 9);
    expect(leverAngleDeg(-100)).toBeCloseTo(-45, 9);
    expect(leverAngleDeg(66)).toBeCloseTo(29.7, 9);
    expect(leverAngleDeg(0)).toBe(0);
    expect(joystickTiltDeg(1)).toBe(25);
    expect(joystickTiltDeg(-1)).toBe(-25);
    expect(joystickTiltDeg(0)).toBe(0);
  });

  it('7. tachNeedleRad', () => {
    expect(tachNeedleRad(0)).toBeCloseTo(Math.PI, 9);
    expect(tachNeedleRad(1500)).toBeCloseTo(Math.PI / 2, 9);
    expect(tachNeedleRad(3000)).toBeCloseTo(0, 9);
    expect(tachNeedleRad(4000)).toBeCloseTo(0, 9);
    expect(tachNeedleRad(-50)).toBeCloseTo(Math.PI, 9);
  });
});
