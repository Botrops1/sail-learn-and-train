import { area, type AreaData } from './area';
import { wrap180 } from './angles';
import { boat, type BoatData } from './boat';
import { localParts } from './clock';
import type { Controls } from './controls';
import { sunTimes } from './sun';
import {
  isLocalWind,
  smoothstep,
  windAt,
  type LocalWindId,
  type WindModeState,
  type WindNow,
} from './windModes';

/**
 * The Adriatic's local winds (M94, PHASE10_SPEC 24): the summer day (the maestral by day, the
 * burin by night), the bura and the jugo. Each is a mean wind that follows the clock on board,
 * plus a gust size; the true wind adds Phase 2's gusty pattern to that mean. Pure.
 */
export type LocalWindsData = AreaData['localWinds'];

/** One point of a scripted wind (M97): local time "HH:MM", where it comes from, knots, gust %. */
export interface WindKey {
  at: string;
  fromDeg: number;
  kn: number;
  gustPct: number;
}

/** The mean wind of a clock wind and how big its gusts are (% of the mean). */
export interface WindMean {
  dirDeg: number;
  twsKn: number;
  gustPct: number;
}

const HOUR_MS = 3_600_000;
const RAD = Math.PI / 180;

/** The local hour (hours and fractions) of a moment (PHASE10_SPEC 23.3). */
export function localHourOf(utcMs: number, areaData: AreaData = area): number {
  const p = localParts(utcMs, areaData);
  return p.hour + p.minute / 60 + p.second / 3600;
}

/** The factor (0 … 1) of the night: 0 by day, 1 in the dark, with a ramp of `rampH` hours. */
function nightFactor(
  utcMs: number,
  sunriseUtcMs: number | null,
  sunsetUtcMs: number | null,
  rampH: number,
): number {
  if (sunriseUtcMs === null || sunsetUtcMs === null) return 0;
  return utcMs >= sunsetUtcMs
    ? smoothstep(sunsetUtcMs, sunsetUtcMs + rampH * HOUR_MS, utcMs)
    : 1 - smoothstep(sunriseUtcMs, sunriseUtcMs + rampH * HOUR_MS, utcMs);
}

/**
 * The mean wind of a local wind at a moment (PHASE10_SPEC 24.3). `sizeKn` is the strength slider;
 * `patternS` the seconds since the wind was chosen (the bura and the jugo rise over `riseS`).
 */
export function localWindMean(
  id: LocalWindId,
  sizeKn: number,
  utcMs: number,
  patternS: number,
  areaData: AreaData = area,
): WindMean {
  const winds = areaData.localWinds;
  const calm = winds.calmKn;
  const p = localParts(utcMs, areaData);
  const h = p.hour + p.minute / 60 + p.second / 3600;
  const t = sunTimes(
    p.year,
    p.month,
    p.day,
    areaData.position.latitudeDeg,
    areaData.position.longitudeDeg,
  );
  switch (id) {
    case 'summer': {
      const { seaBreeze, landBreeze } = winds.summer;
      const sunsetUtc = t.sunsetUtcMs;
      const sunriseUtc = t.sunriseUtcMs;
      // The sea breeze: up from startH to peakH, held, down from fallFromH to sunset.
      const sunsetH = sunsetUtc === null ? 24 : h + (sunsetUtc - utcMs) / HOUR_MS;
      const f =
        smoothstep(seaBreeze.startH, seaBreeze.peakH, h) *
        (1 - smoothstep(seaBreeze.fallFromH, Math.max(sunsetH, seaBreeze.fallFromH + 0.5), h));
      // The land breeze: rises after sunset, blows until sunrise, then dies.
      let g = 0;
      if (sunsetUtc !== null && sunriseUtc !== null) {
        g =
          utcMs >= sunsetUtc
            ? smoothstep(
                sunsetUtc + landBreeze.riseFromSunsetH * HOUR_MS,
                sunsetUtc + landBreeze.fullFromSunsetH * HOUR_MS,
                utcMs,
              )
            : 1 -
              smoothstep(sunriseUtc, sunriseUtc + landBreeze.fallAfterSunriseH * HOUR_MS, utcMs);
      }
      const ks = sizeKn * f;
      const kl = landBreeze.kn * g;
      const ds = seaBreeze.fromDeg * RAD;
      const dl = landBreeze.fromDeg * RAD;
      // Directions add as vectors (where the wind comes from), not as angles.
      const x = ks * Math.sin(ds) + kl * Math.sin(dl);
      const y = ks * Math.cos(ds) + kl * Math.cos(dl);
      const m = Math.hypot(x, y);
      return {
        dirDeg: m < 0.1 ? seaBreeze.fromDeg : wrap180(Math.atan2(x, y) / RAD),
        twsKn: Math.max(calm, m),
        gustPct: ks + kl > 0 ? (seaBreeze.gustPct * ks + landBreeze.gustPct * kl) / (ks + kl) : 0,
      };
    }
    case 'bura': {
      const b = winds.bura;
      const n = nightFactor(utcMs, t.sunriseUtcMs, t.sunsetUtcMs, b.nightRampH);
      return {
        dirDeg: b.fromDeg,
        twsKn: Math.max(
          calm,
          sizeKn * (1 + (b.nightPct / 100) * n) * smoothstep(0, b.riseS, patternS),
        ),
        gustPct: b.gustPct,
      };
    }
    case 'jugo': {
      const j = winds.jugo;
      return {
        dirDeg: j.fromDeg,
        twsKn: Math.max(calm, sizeKn * smoothstep(0, j.riseS, patternS)),
        gustPct: j.gustPct,
      };
    }
  }
}

const DAY_MIN = 1440;

function minutesOf(at: string): number {
  const [h = '0', m = '0'] = at.split(':');
  return Number(h) * 60 + Number(m);
}

/**
 * The mean wind of a scripted wind (M97, PHASE10_SPEC 27.3): the points' values, joined in a
 * straight line (the direction the shorter way round), read from the first point's local time
 * onwards. Before the first point and after the last it holds that point's values.
 */
export function scriptMean(
  points: readonly WindKey[],
  utcMs: number,
  areaData: AreaData = area,
): WindMean {
  const first = points[0];
  if (first === undefined) return { dirDeg: 0, twsKn: 0, gustPct: 0 };
  const start = minutesOf(first.at);
  const off = points.map((point) => (minutesOf(point.at) - start + DAY_MIN) % DAY_MIN);
  const p = localParts(utcMs, areaData);
  const now = p.hour * 60 + p.minute + p.second / 60;
  const x = (now - start + DAY_MIN) % DAY_MIN;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const offA = off[i - 1];
    const offB = off[i];
    if (a === undefined || b === undefined || offA === undefined || offB === undefined) continue;
    if (x > offB) continue;
    const u = (x - offA) / (offB - offA);
    return {
      dirDeg: wrap180(a.fromDeg + u * wrap180(b.fromDeg - a.fromDeg)),
      twsKn: a.kn + u * (b.kn - a.kn),
      gustPct: a.gustPct + u * (b.gustPct - a.gustPct),
    };
  }
  const last = points[points.length - 1] ?? first;
  // After the last point, and for x = 0 on a one-point script: its values.
  return { dirDeg: last.fromDeg, twsKn: last.kn, gustPct: last.gustPct };
}

/**
 * The mean wind: a clock wind's own mean, for any other mode the controls' wind (PHASE10_SPEC
 * 24.3). `script` is for the scripted wind (M97); without one the controls' wind is the mean.
 */
export function windMean(
  windMode: WindModeState,
  controls: Controls,
  utcMs: number,
  timeS: number,
  script: readonly WindKey[] | null,
  areaData: AreaData = area,
): WindMean {
  if (windMode.mode === 'scripted' && script !== null) {
    return scriptMean(script, utcMs, areaData);
  }
  if (isLocalWind(windMode.mode)) {
    return localWindMean(
      windMode.mode,
      windMode.size,
      utcMs,
      Math.max(0, timeS - windMode.startS),
      areaData,
    );
  }
  return { dirDeg: controls.ctl_wind_dir, twsKn: controls.ctl_wind_speed, gustPct: 0 };
}

/**
 * The true wind: a clock wind's mean with its gusts (Phase 2's gusty pattern), any other mode
 * exactly as before (PHASE10_SPEC 24.3).
 */
export function trueWind(
  windMode: WindModeState,
  controls: Controls,
  utcMs: number,
  timeS: number,
  script: readonly WindKey[] | null,
  areaData: AreaData = area,
  data: BoatData = boat,
): WindNow {
  if (!isLocalWind(windMode.mode) && !(windMode.mode === 'scripted' && script !== null)) {
    return windAt(controls.ctl_wind_dir, controls.ctl_wind_speed, windMode, timeS, data);
  }
  const m = windMean(windMode, controls, utcMs, timeS, script, areaData);
  return windAt(
    m.dirDeg,
    m.twsKn,
    {
      mode: m.gustPct > 0 ? 'gusty' : 'steady',
      seed: windMode.seed,
      size: m.gustPct > 0 ? m.gustPct : 0,
      startS: windMode.startS,
    },
    timeS,
    data,
  );
}
