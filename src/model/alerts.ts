import { boat } from './boat';
import type { ContactReport, ContactState } from './contact';
import type { GybeReport } from './gybe';
import { fenderHintShown, type HarbourState } from './harbour';
import type { BoatState } from './motion';
import { tailSpec, type RealisticState } from './realistic';
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
  'sailWorn',
  'anchorAlarm',
  'contact',
  'ropeSlipping',
  'winchCutOut',
  'clutchOnRunning',
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
  // The entry is the worn sail's own (`alertLearnId`); this one is the fallback.
  sailWorn: { learnId: 'sail_main', severity: 'warning' },
  anchorAlarm: { learnId: 'term_scope', severity: 'danger' },
  // M55: the entry's own learn id and severity come from its report (`alertLearnId`, `contactSeverity`); these are the fallbacks.
  contact: { learnId: 'fit_fender', severity: 'warning' },
  ropeSlipping: { learnId: 'fit_winch', severity: 'warning' },
  winchCutOut: { learnId: 'fit_winch', severity: 'warning' },
  clutchOnRunning: { learnId: 'fit_clutch', severity: 'warning' },
};

/** The two sails that can wear out, and the Learn entry of each. */
export type WornSail = 'main' | 'jib';
export const SAIL_LEARN: Readonly<Record<WornSail, string>> = {
  main: 'sail_main',
  jib: 'sail_jib',
};

/** The sail that is worn out from flapping (the worse one if both are), or null (M37, issue #88). */
export function wornSail(damage: Readonly<Record<WornSail, number>>): WornSail | null {
  const warnAt = boat.physics.trim.flogging.warnAt;
  if (Math.max(damage.main, damage.jib) < warnAt) return null;
  return damage.main >= damage.jib ? 'main' : 'jib';
}

/** Warnings that can come and go every second: written again only after `repeatGapS`. */
const FLICKERING: readonly AlertKind[] = ['byTheLee', 'overpowered'];
/** M55: the rope and winch warnings of Realistic mode: written again only after `ropeRepeatGapS`, per kind and rope or winch. */
const ROPE_REPEATING: readonly AlertKind[] = ['ropeSlipping', 'winchCutOut', 'clutchOnRunning'];

/** M55: the tag chip of an entry (the Status section's filter and the chip on each row). */
export const ALERT_TAGS = ['danger', 'damage', 'sail', 'rope', 'gear', 'steering'] as const;
export type AlertTag = (typeof ALERT_TAGS)[number];

export interface AlertEntry {
  /** 1, 2, 3 … in the order written; never reused, so the centre can tell what is new. */
  n: number;
  kind: AlertKind;
  /** The rig's clock when it happened, seconds (the app's time: Pause stops it). */
  atS: number;
  severity: AlertSeverity;
  /** Only for `gybe`: the numbers the report says. */
  report?: GybeReport;
  /** Only for `sailWorn`: which sail wore out. */
  sail?: WornSail;
  /** Only for `contact` (M55): the damage report. */
  contact?: ContactReport;
  /** `ropeSlipping` and `clutchOnRunning` (M55): the rope's registry id. */
  rope?: string;
  /** Only for `winchCutOut` (M55): the winch id. */
  winch?: string;
}

/** The Learn entry an entry's "?" opens: a worn sail opens its own sail, a hit its own part or word. */
export function alertLearnId(entry: AlertEntry): string {
  if (entry.kind === 'sailWorn' && entry.sail) return SAIL_LEARN[entry.sail];
  if (entry.kind === 'contact' && entry.contact) {
    if (entry.contact.obstacleId === 'propeller') return 'part_saildrive';
    if (entry.contact.obstacleId === 'bottom') return 'term_grounding';
  }
  return ALERT_INFO[entry.kind].learnId;
}

/** M55: the tag of an entry. */
export function alertTag(entry: AlertEntry): AlertTag {
  switch (entry.kind) {
    case 'gybe':
      return entry.report?.accidental ? 'danger' : 'steering';
    case 'tack':
    case 'tookWheel':
      return 'steering';
    case 'byTheLee':
    case 'roundUp':
    case 'anchorAlarm':
      return 'danger';
    case 'overpowered':
    case 'sailWorn':
      return 'sail';
    case 'fendersOut':
      return 'gear';
    case 'contact':
      return 'damage';
    case 'ropeSlipping':
    case 'winchCutOut':
    case 'clutchOnRunning':
      return 'rope';
  }
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
  sailDamage: Readonly<Record<WornSail, number>>;
  /** M46: the anchor; its alarm is an alert. */
  anchor?: { alarm: boolean };
  /** M55: the damage reports. */
  contact: ContactState;
  /** M55: the rope and winch warnings of Realistic mode. */
  realistic: RealisticState;
}

const { historyMax, repeatGapS, ropeRepeatGapS, overpoweredAfterS } = boat.physics.alerts;
const { warnAt } = boat.physics.trim.flogging;

/** M55: a damage report's severity: the propeller and a hard hit are dangers, a torn-off fender and a touch warnings, a fender that took it only news. */
function contactSeverity(report: ContactReport): AlertSeverity {
  if (report.obstacleId === 'propeller') return 'danger';
  if (report.obstacleId === 'fender') return 'warning';
  switch (report.severity) {
    case 'knock':
    case 'hit':
      return 'danger';
    case 'touch':
    case 'bump':
      return 'warning';
    default:
      return 'info';
  }
}

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
  if (!previous.anchor?.alarm && next.anchor?.alarm) kinds.push('anchorAlarm');
  return kinds;
}

/** The sails that wear out between two states: each one once as it passes `warnAt` (a repair, then wear again, is a new event). */
function sailsWorn(previous: AlertSource, next: AlertSource): WornSail[] {
  return (['main', 'jib'] as const).filter(
    (sail) => previous.sailDamage[sail] < warnAt && next.sailDamage[sail] >= warnAt,
  );
}

/** M55: the damage reports that are new, oldest first (Clear or a new place empties the list and adds nothing). */
function newReports(previous: AlertSource, next: AlertSource): ContactReport[] {
  if (previous.contact.reports === next.contact.reports) return [];
  const known = new Set(previous.contact.reports);
  return next.contact.reports.filter((r) => !known.has(r)).reverse();
}

/** M55: the ropes whose tail starts slipping on its winch drum. */
function slippingRopes(previous: AlertSource, next: AlertSource): string[] {
  if (previous.realistic.reports === next.realistic.reports) return [];
  const ropes: string[] = [];
  for (const [key, report] of Object.entries(next.realistic.reports)) {
    if (report.note !== 'slipping' || previous.realistic.reports[key]?.note === 'slipping')
      continue;
    const rope = tailSpec(key)?.ropeId;
    if (rope) ropes.push(rope);
  }
  return ropes;
}

/** M55: the winches whose motor cuts out under too much load. */
function cutOutWinches(previous: AlertSource, next: AlertSource): string[] {
  if (previous.realistic.winches === next.realistic.winches) return [];
  return Object.entries(next.realistic.winches)
    .filter(([id, winch]) => winch.cutOut && !previous.realistic.winches[id]?.cutOut)
    .map(([id]) => id);
}

/** M55: a clutch was shut on a running rope (a new notice, also when the old one had the same key). */
function closedOnRunningStarted(previous: AlertSource, next: AlertSource): boolean {
  return (
    next.realistic.notice !== previous.realistic.notice &&
    next.realistic.notice?.key === 'closedOnRunning'
  );
}

/**
 * The log after the step from `previous` to `next`: the same object when nothing started,
 * otherwise with the new entries added at the end and the oldest dropped past `historyMax`.
 */
export function recordAlerts(log: AlertLog, previous: AlertSource, next: AlertSource): AlertLog {
  const atS = next.rig.timeS;
  let entries = log.entries;
  let written = log.written;
  /** Adds an entry unless a repeating kind was written too recently (`gap` seconds, same key). */
  const add = (entry: Omit<AlertEntry, 'n' | 'atS'>): void => {
    const gap = FLICKERING.includes(entry.kind)
      ? repeatGapS
      : ROPE_REPEATING.includes(entry.kind)
        ? ropeRepeatGapS
        : 0;
    if (gap > 0) {
      const key = entry.rope ?? entry.winch ?? '';
      const last = [...entries]
        .reverse()
        .find((e) => e.kind === entry.kind && (e.rope ?? e.winch ?? '') === key);
      if (last && atS - last.atS < gap) return;
    }
    written += 1;
    entries = [...entries, { ...entry, n: written, atS }].slice(-historyMax);
  };
  for (const kind of started(previous, next)) {
    const report = kind === 'gybe' ? (next.rig.lastGybe ?? undefined) : undefined;
    const entry: Omit<AlertEntry, 'n' | 'atS'> = { kind, severity: severityOf(kind, report) };
    if (report) entry.report = report;
    add(entry);
  }
  for (const report of newReports(previous, next)) {
    add({ kind: 'contact', severity: contactSeverity(report), contact: report });
  }
  for (const rope of slippingRopes(previous, next)) {
    add({ kind: 'ropeSlipping', severity: 'warning', rope });
  }
  for (const winch of cutOutWinches(previous, next)) {
    add({ kind: 'winchCutOut', severity: 'warning', winch });
  }
  if (closedOnRunningStarted(previous, next)) {
    const tail = next.realistic.notice?.tail;
    const rope = tail ? tailSpec(tail)?.ropeId : undefined;
    add(
      rope
        ? { kind: 'clutchOnRunning', severity: 'warning', rope }
        : { kind: 'clutchOnRunning', severity: 'warning' },
    );
  }
  for (const sail of sailsWorn(previous, next)) {
    add({ kind: 'sailWorn', severity: 'warning', sail });
  }
  return written === log.written ? log : { entries, written };
}

/** `m:ss` of the app's time, for the list ("0:42"). */
export function alertTimeText(atS: number): string {
  const total = Math.max(0, Math.floor(atS));
  const seconds = total % 60;
  return `${Math.floor(total / 60)}:${seconds < 10 ? '0' : ''}${seconds}`;
}
