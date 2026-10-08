declare const __BUILD_HASH__: string;
declare const __BUILD_DATE__: string;

export interface BuildInfo {
  /** First 7 characters of the commit hash, as GitHub shows it. */
  shortHash: string;
  /** Build date, YYYY-MM-DD (UTC). */
  date: string;
}

export function makeBuildInfo(hash: string, date: string): BuildInfo {
  return { shortHash: hash.slice(0, 7), date };
}

/** Injected at build time by vite.config.ts. */
export const BUILD_INFO: BuildInfo = makeBuildInfo(__BUILD_HASH__, __BUILD_DATE__);

export const REPO_URL = 'https://github.com/Botrops1/sail-learn-and-train';
