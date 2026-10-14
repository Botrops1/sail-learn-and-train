import { area, type AreaData } from './area';

/**
 * The on-board clock (PHASE3_SPEC 9.3). Pure: only `Date.UTC` and the `getUTC…` methods, never
 * the device's time zone. `utcMs` is milliseconds since 1970-01-01 UTC; local time is for display
 * and the link.
 */
export interface ClockState {
  utcMs: number;
}

export interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number;
  offsetMin: number;
  summer: boolean;
}

const MINUTE_MS = 60_000;
/** The link accepts years from 1900 to 2100 only. */
export const CLOCK_MIN_YEAR = 1900;
export const CLOCK_MAX_YEAR = 2100;

/** Sun heights (degrees above the horizon) where the light changes name. */
export const DAY_FROM_DEG = 6;
export const GOLDEN_FROM_DEG = 0;
/** Civil twilight ends when the sun is 6° below the horizon. */
export const TWILIGHT_FROM_DEG = -6;

/** 01:00 UTC on the last Sunday of `month` (1–12) in `year`, as UTC ms. */
export function lastSundayUtcMs(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one.
  const last = new Date(Date.UTC(year, month, 0));
  const back = last.getUTCDay();
  return Date.UTC(year, month - 1, last.getUTCDate() - back, 1);
}

export function isSummerTime(utcMs: number, areaData: AreaData = area): boolean {
  if (areaData.timeZone.summerTime !== 'EU') return false;
  const year = new Date(utcMs).getUTCFullYear();
  return utcMs >= lastSundayUtcMs(year, 3) && utcMs < lastSundayUtcMs(year, 10);
}

export function localParts(utcMs: number, areaData: AreaData = area): LocalParts {
  const summer = isSummerTime(utcMs, areaData);
  const offsetMin = summer
    ? areaData.timeZone.summerOffsetMin
    : areaData.timeZone.standardOffsetMin;
  const d = new Date(utcMs + offsetMin * MINUTE_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
    weekday: d.getUTCDay(),
    offsetMin,
    summer,
  };
}

/**
 * A local date and time as UTC ms. A time that does not exist on the spring-forward night
 * (02:00–02:59) comes out an hour later; on the autumn night 02:00–02:59 means the first
 * (summer-time) one.
 */
export function utcFromLocal(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  areaData: AreaData = area,
): number {
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  const summerUtc = wall - areaData.timeZone.summerOffsetMin * MINUTE_MS;
  if (isSummerTime(summerUtc, areaData)) return summerUtc;
  return wall - areaData.timeZone.standardOffsetMin * MINUTE_MS;
}

/** The clock at the start (`clock.defaultLocal` of the area, local time). */
export function defaultClockUtcMs(areaData: AreaData = area): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(areaData.clock.defaultLocal);
  if (!match) throw new Error(`clock.defaultLocal "${areaData.clock.defaultLocal}" is not valid`);
  const [year, month, day, hour, minute] = match.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
  ];
  return utcFromLocal(year, month, day, hour, minute, areaData);
}

const pad = (value: number, width: number) => String(value).padStart(width, '0');

/** The link's form of a time: local `YYYYMMDDHHmm` (seconds are dropped). */
export function clockParam(utcMs: number, areaData: AreaData = area): string {
  const p = localParts(utcMs, areaData);
  return `${pad(p.year, 4)}${pad(p.month, 2)}${pad(p.day, 2)}${pad(p.hour, 2)}${pad(p.minute, 2)}`;
}

/** A `YYYYMMDDHHmm` local time as UTC ms, or null if it is not 12 digits or not a real time. */
export function parseClockParam(value: string, areaData: AreaData = area): number | null {
  if (!/^\d{12}$/.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const hour = Number(value.slice(8, 10));
  const minute = Number(value.slice(10, 12));
  if (year < CLOCK_MIN_YEAR || year > CLOCK_MAX_YEAR || hour > 23 || minute > 59) return null;
  // A date that does not round-trip (30 February) is not a date.
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return utcFromLocal(year, month, day, hour, minute, areaData);
}

/** Whether the state may hold this time: finite and a local year from 1900 to 2100. */
export function isClockTime(utcMs: number, areaData: AreaData = area): boolean {
  if (!Number.isFinite(utcMs)) return false;
  // Outside the Date range `localParts` would be NaN.
  if (Math.abs(utcMs) > 8.64e15 - 86_400_000) return false;
  const { year } = localParts(utcMs, areaData);
  return year >= CLOCK_MIN_YEAR && year <= CLOCK_MAX_YEAR;
}

export type Daylight = 'day' | 'golden' | 'twilight' | 'night';

export function daylight(sunElevationDeg: number): Daylight {
  if (sunElevationDeg >= DAY_FROM_DEG) return 'day';
  if (sunElevationDeg >= GOLDEN_FROM_DEG) return 'golden';
  if (sunElevationDeg >= TWILIGHT_FROM_DEG) return 'twilight';
  return 'night';
}
