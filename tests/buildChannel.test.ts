import { describe, expect, it } from 'vitest';
import { makeBuildInfo } from '../src/app/buildInfo';
import { parseBuildEnv, versionLine } from '../src/app/buildChannel';
import { t } from '../src/ui/i18n';

describe('parseBuildEnv (PHASE_LAUNCH_SPEC 7.2)', () => {
  it('a release needs a version like v1.2.3', () => {
    expect(parseBuildEnv('release', 'v0.9.0')).toEqual({ channel: 'release', version: 'v0.9.0' });
    for (const bad of ['0.9.0', undefined, 'v1.2', 'v1.2.3-beta', '']) {
      expect(() => parseBuildEnv('release', bad), String(bad)).toThrow(
        'APP_CHANNEL=release needs APP_VERSION like v1.2.3',
      );
    }
  });

  it('next has no version, even when one is given', () => {
    expect(parseBuildEnv('next', 'v1.0.0')).toEqual({ channel: 'next', version: '' });
  });

  it('anything else is a preview', () => {
    expect(parseBuildEnv(undefined, undefined)).toEqual({ channel: 'preview', version: '' });
    expect(parseBuildEnv('prod', 'v1.0.0')).toEqual({ channel: 'preview', version: '' });
    expect(parseBuildEnv('', '')).toEqual({ channel: 'preview', version: '' });
  });
});

describe('versionLine', () => {
  const base = { version: '', shortHash: 'abc1234', date: '2026-11-10' };

  it('picks the key and parameters of each channel', () => {
    expect(versionLine({ ...base, channel: 'release', version: 'v0.9.0' })).toEqual({
      key: 'footer.release',
      params: { version: 'v0.9.0', hash: 'abc1234', date: '2026-11-10' },
    });
    expect(versionLine({ ...base, channel: 'next' })).toEqual({
      key: 'footer.next',
      params: { hash: 'abc1234', date: '2026-11-10' },
    });
    expect(versionLine({ ...base, channel: 'preview' })).toEqual({
      key: 'footer.version',
      params: { hash: 'abc1234', date: '2026-11-10' },
    });
  });

  it('reads as the About line in English', () => {
    const line = (channel: 'release' | 'next' | 'preview') => {
      const v = versionLine({ ...base, channel, version: channel === 'release' ? 'v0.9.0' : '' });
      return t(v.key, v.params);
    };
    expect(line('release')).toBe('Version v0.9.0 · abc1234 · 2026-11-10');
    expect(line('next')).toBe('Test version (next) · abc1234 · 2026-11-10');
    expect(line('preview')).toBe('Version abc1234 · 2026-11-10');
  });
});

describe('makeBuildInfo', () => {
  it('keeps the old fields and defaults to a preview', () => {
    expect(makeBuildInfo('abcdef123', '2026-11-10')).toEqual({
      shortHash: 'abcdef1',
      date: '2026-11-10',
      channel: 'preview',
      version: '',
    });
  });

  it('carries the channel and version', () => {
    expect(makeBuildInfo('abcdef123', '2026-11-10', 'release', 'v0.9.0')).toMatchObject({
      channel: 'release',
      version: 'v0.9.0',
    });
  });
});
