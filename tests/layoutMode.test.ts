import { describe, expect, it } from 'vitest';
import { isWide, layoutModeFor } from '../src/ui/layoutMode';

describe('layout mode (PHASE1_SPEC 5.1)', () => {
  it('portrait phone 390×844 is stacked', () => {
    expect(layoutModeFor(390, 844)).toBe('stacked');
  });

  it('landscape phone 844×390 is side by side', () => {
    expect(layoutModeFor(844, 390)).toBe('side');
  });

  it('foldable inner screens ~720×830 and ~880×830 are side by side', () => {
    expect(layoutModeFor(720, 830)).toBe('side');
    expect(layoutModeFor(880, 830)).toBe('side');
  });

  it('screenshot sizes 820×1000 and 1440×900 are side by side', () => {
    expect(layoutModeFor(820, 1000)).toBe('side');
    expect(layoutModeFor(1440, 900)).toBe('side');
  });

  it('switches at 700 px width', () => {
    expect(layoutModeFor(699, 600)).toBe('stacked');
    expect(layoutModeFor(700, 600)).toBe('side');
  });

  it('switches at aspect 0.8 even when wide', () => {
    expect(layoutModeFor(800, 1001)).toBe('stacked');
    expect(layoutModeFor(800, 1000)).toBe('side');
  });

  it('degenerate sizes fall back to stacked', () => {
    expect(layoutModeFor(0, 0)).toBe('stacked');
    expect(layoutModeFor(Number.NaN, 500)).toBe('stacked');
  });
});

describe('wide layout (PHASE5_SPEC 10.2)', () => {
  it('side by side from 1,280 px wide', () => {
    expect(isWide(1440, 'side')).toBe(true);
    expect(isWide(1280, 'side')).toBe(true);
    expect(isWide(1279, 'side')).toBe(false);
  });

  it('never when stacked', () => {
    expect(isWide(1440, 'stacked')).toBe(false);
  });
});
