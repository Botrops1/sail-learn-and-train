import { describe, expect, it } from 'vitest';
import { consoleWidthOf, layoutModeFor } from '../src/ui/layoutMode';

describe('layout rule (PHASE_CONSOLE_SPEC 7.3)', () => {
  it('a portrait phone 390×844 is stacked', () => {
    expect(layoutModeFor(390, 844)).toBe('stacked');
  });

  it('a phone held sideways 844×390 is stacked (too low)', () => {
    expect(layoutModeFor(844, 390)).toBe('stacked');
  });

  it('a foldable inner screen and the screenshot sizes are console', () => {
    expect(layoutModeFor(904, 840)).toBe('console');
    expect(layoutModeFor(820, 1000)).toBe('console');
    expect(layoutModeFor(1440, 900)).toBe('console');
  });

  it('needs 800 px width and 560 px height', () => {
    expect(layoutModeFor(799, 700)).toBe('stacked');
    expect(layoutModeFor(800, 700)).toBe('console');
    expect(layoutModeFor(1000, 559)).toBe('stacked');
    expect(layoutModeFor(1000, 560)).toBe('console');
  });

  it('is stacked when the window is taller than 1.25 times its width', () => {
    expect(layoutModeFor(800, 1001)).toBe('stacked');
    expect(layoutModeFor(800, 1000)).toBe('console');
  });

  it('degenerate sizes fall back to stacked', () => {
    expect(layoutModeFor(0, 0)).toBe('stacked');
    expect(layoutModeFor(Number.NaN, 700)).toBe('stacked');
  });

  it('the console is wide from 1,280 px', () => {
    expect(consoleWidthOf(1280)).toBe('wide');
    expect(consoleWidthOf(1279)).toBe('narrow');
    expect(consoleWidthOf(904)).toBe('narrow');
  });
});
