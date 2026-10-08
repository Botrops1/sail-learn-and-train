import { describe, expect, it } from 'vitest';
import { BUILD_INFO, makeBuildInfo } from '../src/app/buildInfo';

describe('build info', () => {
  it('short hash is the first 7 characters, as GitHub shows commits', () => {
    expect(makeBuildInfo('0123456789abcdef', '2026-10-08').shortHash).toBe('0123456');
  });

  it('is injected at build time', () => {
    expect(BUILD_INFO.shortHash.length).toBeGreaterThan(0);
    expect(BUILD_INFO.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
