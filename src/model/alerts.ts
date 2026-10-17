import { boat } from './boat';
import type { GybeReport } from './gybe';
import { fenderHintShown, type HarbourState } from './harbour';
import type { BoatState } from './motion';
import type { RigState } from './sim';

/**
 * The alert history (M36, issue #80): every short message that shows over the 3D view for a few
 * seconds is also written here, so it can be read again after it has gone. Pure: `recordAlerts`
 * compares two states and adds an entry when a message starts. The store keeps the log and the
 * notification centre (`ui/alertCentre.ts`) shows it.
 */
export const ALERT_KINDS = [
  'gybe',
  'tack',
  'byTheLee',
  'overpowered',
  'roundUp',
  'tookWheel',
  'fendersOut',
] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export type AlertSeverity = 'info' | 'warning' | 'danger';

/** What the notification centre needs to know about one kind: its Learn entry and its colour. */
export interface AlertKindInfo {
  /** The registry id the "?" button opens in the Learn section. */
  learnId: string;
  severity: AlertSeverity;
}

export const ALERT_INFO: Readonly<Record<AlertKind, AlertKindInfo>> = {
  gybe: { learnId: 'term_gybe', severity: 'info' },
  tack: { learnId: 'term_tacking', severity: 'info' },
  byTheLee: { learnId: 'term_gybe', severity: 'warning' },
  overpowered: { learnId: 'term_heel', severity: 'warning' },
  roundUp: { learnId: 'term_round_up', severity: 'danger' },
  tookWheel: { learnId: 'fit_autopilot_control', severity: 'info' },
  fendersOut: { learnId: 'fit_fender', severity: 'info' },
};

/** Warnings that can come and go every second: written again only after `repeatGapS`. */
const FLICKERING: readonly AlertKind[] = ['byTheLee', 'overpowered'];

export interface AlertEntry {
  /** 1, 2, 3 … in the order written; never reused, so the centre can tell what is new. */
  n: number;
  kind: AlertKind;
  /** The rig's clock when it happened, seconds (the app's time: Pause stops it). */
  atS: number;
  severity: AlertSeverity;
  /** Only for `gybe`: the numbers the report says. */
  report?: GybeReport;
}

export interface AlertLog {
  /** Oldest first, at most `physics.alerts.historyMax`. */
  entries: readonly AlertEntry[];
  /** How many entries were ever written (the next entry is `written + 1`). */
  written: number;
}

export const EMPTY_ALERTS: AlertLog = { entries: [], written: 0 };

/** The parts of the app state the log looks at (`AppState` has all of them). */
export interface AlertSource {
  rig: RigState;
  boat: BoatState;
  autopilotNoticeS: number;
  harbour: HarbourState;
}

const { historyMax, repeatGapS, overpoweredAfterS } = boat.physics.alerts;

/** Severity of an entry: an accidental gybe is a danger, the other kinds follow `ALERT_INFO`. */
function severityOf(kind: AlertKind, report: GybeReport | undefined): AlertSeverity {
  return kind === 'gybe' && report?.accidental ? 'danger' : ALERT_INFO[kind].severity;
}

/** The kinds that start between two states (their message was not showing, now it is). */
function started(previous: AlertSource, next: AlertSource): AlertKind[] {
  const kinds: AlertKind[] = [];
  if (next.rig.lastGybe !== null && next.rig.lastGybe !== previous.rig.lastGybe) kinds.push('gybe');
  if (previous.rig.tackLabelS <= 0 && next.rig.tackLabelS > 0) kinds.push('tack');
  if (!previous.rig.solution.byTheLee && next.rig.solution.byTheLee) kinds.push('byTheLee');
  if (
    previous.boat.overpoweredS <= overpoweredAfterS &&
    next.boat.overpoweredS > overpoweredAfterS
  ) {
    kinds.push('overpowered');
  }
  if (previous.boat.roundUpS <= 0 && next.boat.roundUpS > 0) kinds.push('roundUp');
  if (previous.autopilotNoticeS <= 0 && next.autopilotNoticeS > 0) kinds.push('tookWheel');
  const hint = (s: AlertSource) => fenderHintShown(s.harbour, s.boat.mode);
  if (!hint(previous) && hint(next)) kinds.push('fendersOut');
  return kinds;
}

/**
 * The log after the step from `previous` to `next`: the same object when nothing started,
 * otherwise with the new entries added at the end and the oldest dropped past `historyMax`.
 */
export function recordAlerts(log: AlertLog, previous: AlertSource, next: AlertSource): AlertLog {
  const atS = next.rig.timeS;
  let entries = log.entries;
  let written = log.written;
  for (const kind of started(previous, next)) {
    if (FLICKERING.includes(kind)) {
      const last = [...entries].reverse().find((entry) => entry.kind === kind);
      if (last && atS - last.atS < repeatGapS) continue;
    }
    const report = kind === 'gybe' ? (next.rig.lastGybe ?? undefined) : undefined;
    written += 1;
    const entry: AlertEntry = { n: written, kind, atS, severity: severityOf(kind, report) };
    if (report) entry.report = report;
    entries = [...entries, entry].slice(-historyMax);
  }
  return written === log.written ? log : { entries, written };
}

/** `m:ss` of the app's time, for the list ("0:42"). */
export function alertTimeText(atS: number): string {
  const total = Math.max(0, Math.floor(atS));
  const seconds = total % 60;
  return `${Math.floor(total / 60)}:${seconds < 10 ? '0' : ''}${seconds}`;
}
