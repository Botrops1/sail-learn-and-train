import { describe, expect, it } from 'vitest';
import { initialState, reduce, type AppState } from '../src/app/store';
import {
  ALERT_INFO,
  ALERT_KINDS,
  ALERT_TAGS,
  EMPTY_ALERTS,
  SAIL_LEARN,
  alertLearnId,
  alertTag,
  alertTimeText,
  wornSail,
  recordAlerts,
  type AlertLog,
  type AlertSource,
} from '../src/model/alerts';
import { boat } from '../src/model/boat';
import type { GybeReport } from '../src/model/gybe';
import type { ContactReport } from '../src/model/contact';
import { DEFAULT_HARBOUR } from '../src/model/harbour';
import { tailSpecs, winchIds, type TailReport, type WinchState } from '../src/model/realistic';
import { isRegisteredPartId } from '../src/model/registry';
import { alertText } from '../src/ui/alertCentre';
import { damageText } from '../src/ui/damageReport';
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
    const out = later(
      start,
      {},
      { mode: 'held' },
      { harbour: { ...DEFAULT_HARBOUR, fendersOut: true } },
    );
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

describe('M37: the worn-sail alert (issue #88)', () => {
  const start = initialState();
  const { warnAt } = boat.physics.trim.flogging;
  const worn = (main: number, jib: number) => ({ sailDamage: { main, jib } });

  it('1. a sail passing the warning level is written once, with its sail', () => {
    const before = later(start, {}, {}, worn(warnAt - 0.01, 0));
    const after = later(before, { timeS: 4 }, {}, worn(warnAt, 0));
    const log = recordAlerts(EMPTY_ALERTS, before, after);
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0]).toMatchObject({ kind: 'sailWorn', sail: 'main', severity: 'warning' });
    // Still worn a moment later: nothing new.
    const still = later(after, { timeS: 5 }, {}, worn(warnAt + 0.2, 0));
    expect(recordAlerts(log, after, still)).toBe(log);
  });

  it('2. the second sail is its own entry; a repair and new wear is a new event', () => {
    const one = later(start, {}, {}, worn(warnAt + 0.1, 0));
    const both = later(one, {}, {}, worn(warnAt + 0.1, warnAt));
    let log = recordAlerts(EMPTY_ALERTS, one, both);
    expect(log.entries.map((e) => e.sail)).toEqual(['jib']);
    const repaired = later(both, {}, {}, worn(0, 0));
    expect(recordAlerts(log, both, repaired)).toBe(log);
    log = recordAlerts(log, repaired, later(repaired, {}, {}, worn(warnAt, 0)));
    expect(log.entries.map((e) => e.sail)).toEqual(['jib', 'main']);
  });

  it('3. already worn when the page opens: nothing is written', () => {
    const state = later(start, {}, {}, worn(warnAt + 0.3, 0));
    expect(recordAlerts(EMPTY_ALERTS, state, later(state, { timeS: 1 }))).toBe(EMPTY_ALERTS);
  });

  it('4. wornSail names the worse sail (the main when they are equal) or none', () => {
    expect(wornSail({ main: warnAt - 0.01, jib: 0 })).toBeNull();
    expect(wornSail({ main: warnAt, jib: warnAt })).toBe('main');
    expect(wornSail({ main: warnAt, jib: warnAt + 0.2 })).toBe('jib');
  });

  it('5. the entry opens its sail in Learn and says which sail in both languages', () => {
    const entry = (sail: 'main' | 'jib') =>
      recordAlerts(
        EMPTY_ALERTS,
        later(start, {}, {}, worn(0, 0)),
        later(start, {}, {}, worn(sail === 'main' ? warnAt : 0, sail === 'jib' ? warnAt : 0)),
      ).entries[0];
    const main = entry('main');
    const jib = entry('jib');
    expect(main && alertLearnId(main)).toBe('sail_main');
    expect(jib && alertLearnId(jib)).toBe('sail_jib');
    for (const id of Object.values(SAIL_LEARN)) expect(isRegisteredPartId(id), id).toBe(true);
    expect(main && alertText(main)).toBe(en['alert.sailWorn.main']);
    expect(jib && alertText(jib)).toBe(en['alert.sailWorn.jib']);
    for (const key of ['alert.sailWorn.main', 'alert.sailWorn.jib'] as const) {
      expect(key in ru, key).toBe(true);
    }
  });

  it('6. the store state is a source: a step that wears a sail out writes the entry', () => {
    const state: AppState = initialState();
    const damaged: AppState = { ...state, sailDamage: { main: warnAt, jib: 0 } };
    const log = recordAlerts(state.alerts, state, damaged);
    expect(log.entries.map((e) => e.kind)).toEqual(['sailWorn']);
  });
});

describe('M55: damage, rope and winch entries and the tags (issue #109)', () => {
  const start = initialState();
  const { ropeRepeatGapS } = boat.physics.alerts;
  const hit = (obstacleId: string, severity: ContactReport['severity']): ContactReport => ({
    atS: 4,
    obstacleId,
    partId: 'part_hull',
    part: 'bow',
    impactMps: 1.2,
    fender: false,
    severity,
  });
  const withReports = (s: AppState, reports: ContactReport[]): AppState => ({
    ...s,
    contact: { ...s.contact, reports },
  });
  const kinds = (log: AlertLog) => log.entries.map((e) => e.kind);

  it('1. a new damage report is one contact entry: a danger tagged Damage, with the report', () => {
    const r = hit('quay', 'hit');
    const log = recordAlerts(EMPTY_ALERTS, start, withReports(start, [r]));
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0]).toMatchObject({ kind: 'contact', severity: 'danger' });
    expect(log.entries[0]?.contact).toBe(r);
    expect(log.entries[0] && alertTag(log.entries[0])).toBe('damage');
  });

  it('2. the report decides the severity and the Learn entry; Clear writes nothing', () => {
    const sev = (r: ContactReport) =>
      recordAlerts(EMPTY_ALERTS, start, withReports(start, [r])).entries[0];
    expect(sev(hit('quay', 'touch'))?.severity).toBe('warning');
    expect(sev(hit('quay', 'bump'))?.severity).toBe('warning');
    expect(sev(hit('quay', 'knock'))?.severity).toBe('danger');
    expect(sev(hit('quay', 'fender'))?.severity).toBe('info');
    const bottom = sev(hit('bottom', 'hit'));
    expect(bottom && alertLearnId(bottom)).toBe('term_grounding');
    const quay = sev(hit('quay', 'hit'));
    expect(quay && alertLearnId(quay)).toBe('fit_fender');
    const before = withReports(start, [hit('quay', 'hit')]);
    expect(recordAlerts(EMPTY_ALERTS, before, withReports(start, []))).toBe(EMPTY_ALERTS);
  });

  it('3. two new reports at once are two entries, oldest first; a lost fender is a warning', () => {
    const lost = hit('fender', 'touch');
    const second = hit('quay', 'hit');
    // `reports` is newest first.
    const log = recordAlerts(EMPTY_ALERTS, start, withReports(start, [second, lost]));
    expect(log.entries.map((e) => e.contact)).toEqual([lost, second]);
    expect(log.entries[0]?.severity).toBe('warning');
    // The one already known is not written again.
    const more = hit('quay', 'bump');
    const next = withReports(start, [more, second, lost]);
    const again = recordAlerts(log, withReports(start, [second, lost]), next);
    expect(again.entries.map((e) => e.contact)).toEqual([lost, second, more]);
  });

  it('4. a fouled propeller is a danger that opens the saildrive', () => {
    const log = recordAlerts(EMPTY_ALERTS, start, withReports(start, [hit('propeller', 'touch')]));
    expect(log.entries[0]?.severity).toBe('danger');
    expect(log.entries[0] && alertLearnId(log.entries[0])).toBe('part_saildrive');
  });

  const tail = tailSpecs()[0];
  const slipping = (s: AppState, on: boolean, timeS: number, key = tail?.key ?? ''): AppState => {
    const report = {
      ...(s.realistic.reports[key] ?? {}),
      note: on ? 'slipping' : null,
    } as TailReport;
    return {
      ...s,
      rig: { ...s.rig, timeS },
      realistic: { ...s.realistic, reports: { ...s.realistic.reports, [key]: report } },
    };
  };

  it('5. a slipping rope is written once, again only after the gap, per rope', () => {
    const a = slipping(start, true, 20);
    let log = recordAlerts(EMPTY_ALERTS, start, a);
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0]).toMatchObject({ kind: 'ropeSlipping', rope: tail?.ropeId });
    expect(log.entries[0] && alertTag(log.entries[0])).toBe('rope');
    // Still slipping: nothing new. Stops and starts 5 s later: still inside the gap.
    expect(recordAlerts(log, a, slipping(a, true, 21))).toBe(log);
    const off = slipping(a, false, 24);
    expect(recordAlerts(log, a, off)).toBe(log);
    const again5 = slipping(off, true, 20 + 5);
    expect(recordAlerts(log, off, again5)).toBe(log);
    const again10 = slipping(off, true, 20 + ropeRepeatGapS);
    log = recordAlerts(log, off, again10);
    expect(kinds(log)).toEqual(['ropeSlipping', 'ropeSlipping']);
    // Another rope 1 s later is its own entry.
    const other = tailSpecs().find((s) => s.ropeId !== tail?.ropeId);
    expect(other).toBeDefined();
    const second = slipping(again10, true, 20 + ropeRepeatGapS + 1, other?.key);
    const log2 = recordAlerts(log, again10, second);
    expect(log2.entries.at(-1)).toMatchObject({ kind: 'ropeSlipping', rope: other?.ropeId });
  });

  it('6. a winch cutting out is written with its id', () => {
    const id = winchIds()[0] ?? '';
    const winch = start.realistic.winches[id];
    expect(winch).toBeDefined();
    const next: AppState = {
      ...start,
      realistic: {
        ...start.realistic,
        winches: { ...start.realistic.winches, [id]: { ...(winch as WinchState), cutOut: true } },
      },
    };
    const log = recordAlerts(EMPTY_ALERTS, start, next);
    expect(log.entries[0]).toMatchObject({ kind: 'winchCutOut', winch: id, severity: 'warning' });
    expect(recordAlerts(log, next, next)).toBe(log);
  });

  it('7. shutting a clutch on a running rope is written when the notice appears', () => {
    const notice = { key: 'closedOnRunning', tail: tail?.key ?? null } as const;
    const next: AppState = { ...start, realistic: { ...start.realistic, notice } };
    const log = recordAlerts(EMPTY_ALERTS, start, next);
    expect(log.entries[0]).toMatchObject({ kind: 'clutchOnRunning', rope: tail?.ropeId });
    // The same notice object again: nothing.
    expect(recordAlerts(log, next, { ...next, rig: { ...next.rig, timeS: 1 } })).toBe(log);
    // Another notice with the same key within the gap: not written again.
    const renewed: AppState = {
      ...next,
      rig: { ...next.rig, timeS: 3 },
      realistic: { ...next.realistic, notice: { ...notice } },
    };
    expect(recordAlerts(log, next, renewed)).toBe(log);
  });

  it('9. the texts: a hit says its report, a rope its name, a winch its side; both languages', () => {
    const r = hit('quay', 'hit');
    const contact = recordAlerts(EMPTY_ALERTS, start, withReports(start, [r])).entries[0];
    expect(contact && alertText(contact)).toBe(damageText(r));
    const slip = recordAlerts(EMPTY_ALERTS, start, slipping(start, true, 20)).entries[0];
    expect(slip && alertText(slip)).toContain(': slipping on the winch drum. Add a turn.');
    expect(slip && alertText(slip).startsWith(': ')).toBe(false);
    const sides = winchIds().map((winch) =>
      alertText({ n: 1, kind: 'winchCutOut', atS: 0, severity: 'warning', winch }),
    );
    expect(sides.some((text) => text.includes('port winch'))).toBe(true);
    expect(sides.some((text) => text.includes('starboard winch'))).toBe(true);
    for (const key of [
      'alert.ropeSlipping',
      'alert.winchCutOut',
      'alert.clutchOnRunning',
    ] as const) {
      expect(key in ru, key).toBe(true);
    }
  });

  it('8. every kind has a tag; the tags of the kinds', () => {
    const entry = (kind: (typeof ALERT_KINDS)[number], extra = {}) => ({
      n: 1,
      kind,
      atS: 0,
      severity: 'info' as const,
      ...extra,
    });
    expect(alertTag(entry('gybe', { report: report(true) }))).toBe('danger');
    expect(alertTag(entry('gybe', { report: report(false) }))).toBe('steering');
    expect(alertTag(entry('overpowered'))).toBe('sail');
    expect(alertTag(entry('fendersOut'))).toBe('gear');
    expect(alertTag(entry('roundUp'))).toBe('danger');
    expect(alertTag(entry('tack'))).toBe('steering');
    for (const kind of ALERT_KINDS) expect(ALERT_TAGS).toContain(alertTag(entry(kind)));
  });
});

describe('Phase 8, M59: fendersIn', () => {
  it('is written once when the hint starts, tagged gear, and not again at once', () => {
    const base = initialState({
      harbour: { ...DEFAULT_HARBOUR, place: 'marina' },
      boat: { eastM: 2.8, northM: 1450, headingDeg: 180, speedMps: -0.5 },
    });
    // 1450 + the transom's offset is more than 15 m from the rings: no hint yet.
    const far = base;
    const near = {
      ...far,
      boat: { ...far.boat, northM: 1481.4 },
    };
    const log = recordAlerts(EMPTY_ALERTS, far, near);
    expect(log.entries.map((e) => e.kind)).toEqual(['fendersIn']);
    const [entry] = log.entries;
    if (!entry) throw new Error('no entry');
    expect(alertTag(entry)).toBe('gear');
    expect(entry.severity).toBe('info');
    expect(alertText(entry)).toBe(en['harbour.fenders.inHint']);
    // Still true on the next step: nothing new.
    expect(recordAlerts(log, near, near)).toBe(log);
    // True again within repeatGapS: not written; after it: written.
    const away = { ...near, boat: { ...near.boat, northM: 1450 } };
    expect(recordAlerts(log, away, near).entries).toHaveLength(1);
    const much = { ...near, rig: { ...near.rig, timeS: near.rig.timeS + repeatGapS + 1 } };
    expect(recordAlerts(log, away, much).entries).toHaveLength(2);
  });
});
