import { DEG, wrap180, wrap360 } from './angles';

/**
 * Where the sun is and when it rises and sets (PHASE3_SPEC 9.3): the equations of the NOAA solar
 * calculator, after Meeus, "Astronomical Algorithms". Accuracy is about 1–2 minutes. Pure.
 */
export interface SunPosition {
  elevationDeg: number;
  azimuthDeg: number;
}

export interface SunTimes {
  noonUtcMs: number;
  sunriseUtcMs: number | null;
  sunsetUtcMs: number | null;
  polar: 'none' | 'day' | 'night';
}

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
/** The sun's disc fully below the horizon, with refraction (Wikipedia, Sunrise equation). */
export const SUNRISE_ZENITH_DEG = 90.833;

const rad = (deg: number) => deg * DEG;
const deg = (radians: number) => radians / DEG;

interface SolarTerms {
  /** Declination, radians. */
  declination: number;
  /** Equation of time, minutes. */
  equationOfTimeMin: number;
}

function solarTerms(utcMs: number): SolarTerms {
  const jd = utcMs / DAY_MS + 2_440_587.5;
  const t = (jd - 2_451_545) / 36_525;
  const l0 = wrap360(280.46646 + t * (36000.76983 + 0.0003032 * t));
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const mr = rad(m);
  const c =
    Math.sin(mr) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * mr) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * mr) * 0.000289;
  const omega = 125.04 - 1934.136 * t;
  const lambda = l0 + c - 0.00569 - 0.00478 * Math.sin(rad(omega));
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - 0.001813 * t))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(rad(omega));
  const declination = Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lambda)));
  const y = Math.tan(rad(eps) / 2) ** 2;
  const l0r = rad(l0);
  const equationOfTimeMin =
    4 *
    deg(
      y * Math.sin(2 * l0r) -
        2 * e * Math.sin(mr) +
        4 * e * y * Math.sin(mr) * Math.cos(2 * l0r) -
        0.5 * y * y * Math.sin(4 * l0r) -
        1.25 * e * e * Math.sin(2 * mr),
    );
  return { declination, equationOfTimeMin };
}

/** The sun's height and compass direction (0 = north, clockwise) at a time and place. */
export function sunPosition(utcMs: number, latitudeDeg: number, longitudeDeg: number): SunPosition {
  const { declination, equationOfTimeMin } = solarTerms(utcMs);
  const phi = rad(latitudeDeg);
  // Fractional minutes of the UTC day, so the sun moves smoothly.
  const minutes = (((utcMs % DAY_MS) + DAY_MS) % DAY_MS) / MINUTE_MS;
  const trueSolarTime = minutes + equationOfTimeMin + 4 * longitudeDeg;
  const hourAngle = wrap180(trueSolarTime / 4 - 180);
  const ha = rad(hourAngle);
  const cosZenith = Math.min(
    1,
    Math.max(
      -1,
      Math.sin(phi) * Math.sin(declination) + Math.cos(phi) * Math.cos(declination) * Math.cos(ha),
    ),
  );
  const elevationDeg = 90 - deg(Math.acos(cosZenith));
  const azimuthDeg = wrap360(
    deg(
      Math.atan2(
        Math.sin(ha),
        Math.cos(ha) * Math.sin(phi) - Math.tan(declination) * Math.cos(phi),
      ),
    ) + 180,
  );
  return { elevationDeg, azimuthDeg };
}

/** Solar noon, sunrise and sunset of a calendar date (UTC midnight of that date) at a place. */
export function sunTimes(
  year: number,
  month: number,
  day: number,
  latitudeDeg: number,
  longitudeDeg: number,
): SunTimes {
  const day0 = Date.UTC(year, month - 1, day);
  let noonMin = 720 - 4 * longitudeDeg;
  for (let i = 0; i < 2; i++) {
    noonMin = 720 - 4 * longitudeDeg - solarTerms(day0 + noonMin * MINUTE_MS).equationOfTimeMin;
  }
  const noonUtcMs = day0 + noonMin * MINUTE_MS;
  const { declination } = solarTerms(noonUtcMs);
  const phi = rad(latitudeDeg);
  const arg =
    Math.cos(rad(SUNRISE_ZENITH_DEG)) / (Math.cos(phi) * Math.cos(declination)) -
    Math.tan(phi) * Math.tan(declination);
  if (arg > 1) return { noonUtcMs, sunriseUtcMs: null, sunsetUtcMs: null, polar: 'night' };
  if (arg < -1) return { noonUtcMs, sunriseUtcMs: null, sunsetUtcMs: null, polar: 'day' };
  const hourAngleDeg = deg(Math.acos(arg));
  return {
    noonUtcMs,
    sunriseUtcMs: day0 + (noonMin - 4 * hourAngleDeg) * MINUTE_MS,
    sunsetUtcMs: day0 + (noonMin + 4 * hourAngleDeg) * MINUTE_MS,
    polar: 'none',
  };
}
