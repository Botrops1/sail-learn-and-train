import { describe, expect, it } from 'vitest';
import { initialState, reduce, type AppState } from '../src/app/store';
import {
  ALERT_INFO,
  ALERT_KINDS,
  EMPTY_ALERTS,
  alertTimeText,
  recordAlerts,
  type AlertLog,
  type AlertSource,
} from '../src/model/alerts';
import { boat } from '../src/model/boat';
import type { GybeReport } from '../src/model/gybe';
import { isRegisteredPartId } from '../src/model/registry';
import { alertText } from '../src/ui/alertCentre';
import en from '../content/lang/en/ui.json';
import ru from '../content/lang/ru/ui.json';

const { historyMax, repeatGapS, overpoweredAfterS } = boat.physics.alerts;

/** A state a moment later with some rig or boat fields changed. */
function later(
  source: AlertSource,
  rig: Partial<AlertSource['rig']> = {},
  boatFields: Partial<AlertSource['boat']> = {},
  extra: Partial<AlertSource> = {},
): AlertSource {
  return {
    ...source,
    ...extra,
    rig: { ...source.rig, ...rig },
    boat: { ...source.boat, ...boatFields },
  };
}

const report = (accidental: boolean): GybeReport => ({
  accidental,
  endSpeedMps: 12.3,
  energyJ: 9700,
  peakBlocksN: 48000,
  peakRopeN: 12200,
  atS: 10,
  startDeg: 60,
  stopDeg: -60,
});

describe('M36: the alert history (issue #80)', () => {
  const start = initialState();

  it('1. nothing starts, the same log comes back', () => {
    expect(recordAlerts(EMPTY_ALERTS, start, later(start, { timeS: 5 }))).toBe(EMPTY_ALERTS);
  });

  it('2. a message is written once when it starts, not while it keeps showing', () => {
    const shown = later(start, { tackLabelS: 1.5, timeS: 3 });
    const log = recordAlerts(EMPTY_ALERTS, start, shown);
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0]).toMatchObject({ n: 1, kind: 'tack', atS: 3, severity: 'info' });
    const still = later(shown, { tackLabelS: 1.4, timeS: 3.1 });
    expect(recordAlerts(log, shown, still)).toBe(log);
  });

  it('3. a warning that comes and goes is written again only after the gap', () => {
    const lee = (s: AlertSource, on: boolean, timeS: number) =>
      later(s, { solution: { ...s.rig.solution, byTheLee: on }, timeS });
    let log: AlertLog = EMPTY_ALERTS;
    let state: AlertSource = start;
    const go = (on: boolean, timeS: number) => {
      const next = lee(state, on, timeS);
      log = recordAlerts(log, state, next);
      state = next;
    };
    go(true, 10);
    go(false, 11);
    go(true, 11 + repeatGapS - 2);
    expect(log.entries.map((e) => e.kind)).toEqual(['byTheLee']);
    go(false, 10 + repeatGapS - 1);
    go(true, 10 + repeatGapS + 1);
    expect(log.entries.map((e) => e.kind)).toEqual(['byTheLee', 'byTheLee']);
  });

  it('4. heeling a lot is written when it crosses the limit time, and a round-up when it starts', () => {
    const before = later(start, {}, { overpoweredS: overpoweredAfterS });
    const over = later(before, {}, { overpoweredS: overpoweredAfterS + 0.1 });
    expect(recordAlerts(EMPTY_ALERTS, before, over).entries[0]?.kind).toBe('overpowered');
    const turning = later(start, {}, { roundUpS: 0.5 });
    const entry = recordAlerts(EMPTY_ALERTS, start, turning).entries[0];
    expect(entry).toMatchObject({ kind: 'roundUp', severity: 'danger' });
  });

  it('5. a gybe keeps its report; an accidental one is a danger', () => {
    for (const accidental of [true, false]) {
      const r = report(accidental);
      const entry = recordAlerts(EMPTY_ALERTS, start, later(start, { lastGybe: r })).entries[0];
      if (!entry) throw new Error('no entry');
      expect(entry.kind).toBe('gybe');
      expect(entry.report).toBe(r);
      expect(entry.severity).toBe(accidental ? 'danger' : 'info');
      expect(alertText(entry)).toContain(accidental ? 'Accidental gybe' : 'Controlled gybe');
    }
  });

  it('6. the autopilot notice and the fender reminder are written when they start', () => {
    const wheel = later(start, {}, {}, { autopilotNoticeS: 3 });
    expect(recordAlerts(EMPTY_ALERTS, start, wheel).entries[0]?.kind).toBe('tookWheel');
    const out = later(start, {}, { mode: 'held' }, { harbour: { fendersOut: true } });
    expect(recordAlerts(EMPTY_ALERTS, start, out)).toBe(EMPTY_ALERTS);
    const sailing = later(out, {}, { mode: 'sailing' });
    expect(recordAlerts(EMPTY_ALERTS, out, sailing).entries[0]?.kind).toBe('fendersOut');
  });

  it('7. the history keeps the last historyMax entries; numbers never repeat', () => {
    let log: AlertLog = EMPTY_ALERTS;
    for (let i = 0; i < historyMax + 10; i += 1) {
      const a = later(start, { tackLabelS: 0, timeS: i });
      log = recordAlerts(log, a, later(a, { tackLabelS: 1, timeS: i }));
    }
    expect(log.entries).toHaveLength(historyMax);
    expect(log.written).toBe(historyMax + 10);
    expect(log.entries[0]?.n).toBe(11);
    expect(log.entries.at(-1)?.n).toBe(historyMax + 10);
  });

  it('8. the store writes entries on a step and on other actions; Reset and a link clear them', () => {
    let state: AppState = initialState({ boat: { mode: 'held' } });
    state = reduce(state, { type: 'setFenders', out: true });
    expect(state.alerts.entries).toHaveLength(0);
    state = reduce(state, { type: 'setBoatMode', mode: 'sailing' });
    expect(state.alerts.entries.map((e) => e.kind)).toEqual(['fendersOut']);
    expect(reduce(state, { type: 'reset' }).alerts).toBe(EMPTY_ALERTS);
    expect(reduce(state, { type: 'load', state: initialState() }).alerts).toBe(EMPTY_ALERTS);
    // Time passing does not write the same reminder again.
    const stepped = reduce(state, { type: 'step', dt: 0.1 });
    expect(stepped.alerts.entries.filter((e) => e.kind === 'fendersOut')).toHaveLength(1);
  });

  it('9. every kind has a registered Learn entry and a message in both languages', () => {
    for (const kind of ALERT_KINDS) {
      expect(isRegisteredPartId(ALERT_INFO[kind].learnId), kind).toBe(true);
    }
    for (const key of Object.keys(en).filter((k) => k.startsWith('alerts.'))) {
      expect(key in ru, key).toBe(true);
    }
  });

  it('10. the time reads m:ss', () => {
    expect(alertTimeText(0)).toBe('0:00');
    expect(alertTimeText(42.9)).toBe('0:42');
    expect(alertTimeText(605)).toBe('10:05');
    expect(alertTimeText(-3)).toBe('0:00');
  });
});
