/**
 * Which kind of build this is (PHASE_LAUNCH_SPEC 3.1, 7.2): `release` (the root of the site, made
 * by the Release workflow), `next` (/next/, made from every push to main) or `preview` (a PR
 * preview and local builds). No imports from the rest of src/ and no `declare const`:
 * vite.config.ts imports this file.
 */
export type BuildChannel = 'release' | 'next' | 'preview';

export interface ChannelBuild {
  channel: BuildChannel;
  /** `v1.2.3` for a release, '' otherwise. */
  version: string;
}

/** The environment variables APP_CHANNEL and APP_VERSION. Anything unknown is a preview. */
export function parseBuildEnv(
  channel: string | undefined,
  version: string | undefined,
): ChannelBuild {
  if (channel === 'release') {
    if (version === undefined || !/^v\d+\.\d+\.\d+$/.test(version)) {
      throw new Error('APP_CHANNEL=release needs APP_VERSION like v1.2.3');
    }
    return { channel: 'release', version };
  }
  if (channel === 'next') return { channel: 'next', version: '' };
  return { channel: 'preview', version: '' };
}

export interface VersionLineInfo {
  channel: BuildChannel;
  version: string;
  shortHash: string;
  date: string;
}

/** Which Settings → About line to show, with its parameters. */
export function versionLine(info: VersionLineInfo): {
  key: 'footer.release' | 'footer.next' | 'footer.version';
  params: Record<string, string>;
} {
  if (info.channel === 'release') {
    return {
      key: 'footer.release',
      params: { version: info.version, hash: info.shortHash, date: info.date },
    };
  }
  if (info.channel === 'next') {
    return { key: 'footer.next', params: { hash: info.shortHash, date: info.date } };
  }
  return { key: 'footer.version', params: { hash: info.shortHash, date: info.date } };
}
