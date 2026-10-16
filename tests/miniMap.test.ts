import { describe, expect, it } from 'vitest';
import { createStore, initialState } from '../src/app/store';
import { DEFAULT_SETTINGS } from '../src/model/settings';
import { sceneSettings } from '../src/app/urlSync';
import { t } from '../src/ui/i18n';
import { MINI_MAP, drawMiniMap, mapToScreen, miniMapViewport } from '../src/ui/mapView';

/** PHASE5_SPEC 9.6, tests 1, 2 and 4 (the link tests are in urlState.test.ts). */
describe('M28 mini-map', () => {
  it('centres the boat in a square, north-up canvas at 5 m per pixel', () => {
    const state = initialState();
    const view = miniMapViewport(state, 96);
    expect(view).toMatchObject({
      centreXPx: 48,
      centreYPx: 48,
      metresPerPx: 5,
      upDeg: 0,
      widthPx: 96,
      heightPx: 96,
    });
    const at = (east: number, north: number) => mapToScreen(east, north, view);
    expect(at(0, 0)).toEqual({ x: 48, y: 48 });
    expect(at(0, 200)).toMatchObject({ x: 48, y: 8 });
    expect(at(200, 0)).toMatchObject({ x: 88, y: 48 });
    expect(at(0, -200)).toMatchObject({ x: 48, y: 88 });
    expect(at(-200, 0)).toMatchObject({ x: 8, y: 48 });
    const wide = miniMapViewport(state, 160);
    expect(mapToScreen(0, 200, wide)).toMatchObject({ x: 80, y: 40 });
  });

  it('follows the boat: she stays in the middle and the start moves', () => {
    const base = initialState();
    const moved = { ...base, boat: { ...base.boat, eastM: 120, northM: -40 } };
    const view = miniMapViewport(moved, 96);
    expect(view.centreEastM).toBe(120);
    expect(view.centreNorthM).toBe(-40);
    expect(mapToScreen(0, 0, view)).toEqual({ x: 24, y: 40 });
  });

  it('sizes are the spec numbers', () => {
    expect(MINI_MAP.sizePx).toEqual({ stacked: 96, side: 160 });
    expect(MINI_MAP.maxFps).toBe(10);
  });

  it('settings a scene opening keeps: the mini-map stays as the viewer set it', () => {
    const merged = sceneSettings(
      { ...DEFAULT_SETTINGS, miniMap: false, detail: 'low' },
      DEFAULT_SETTINGS,
    );
    expect(merged.miniMap).toBe(false);
    expect(merged.detail).toBe('low');
  });

  it('setMiniMap changes only the setting, and keeps the same state when unchanged', () => {
    const store = createStore(initialState());
    const start = store.getState();
    expect(start.settings.miniMap).toBe(true);
    store.dispatch({ type: 'setMiniMap', miniMap: true });
    expect(store.getState()).toBe(start);
    store.dispatch({ type: 'setMiniMap', miniMap: false });
    const off = store.getState();
    expect(off.settings.miniMap).toBe(false);
    expect(off.controls).toBe(start.controls);
    store.dispatch({ type: 'setMiniMap', miniMap: false });
    expect(store.getState()).toBe(off);
    store.dispatch({ type: 'reset' });
    expect(store.getState().settings.miniMap).toBe(true);
  });

  it('draws no labels, no heading line and no no-go zone: only the "N" is text', () => {
    const texts: string[] = [];
    const dashes: number[][] = [];
    const ctx = new Proxy(
      {},
      {
        get: (_target, name: string) => {
          if (name === 'fillText' || name === 'strokeText') {
            return (text: string) => {
              if (name === 'fillText') texts.push(text);
            };
          }
          if (name === 'setLineDash') return (dash: number[]) => dashes.push(dash);
          return () => undefined;
        },
        set: () => true,
      },
    ) as unknown as CanvasRenderingContext2D;
    drawMiniMap(ctx, initialState(), 92, (text) => text.length * 7);
    expect(texts).toEqual([t('wind.dial.north')]);
    expect(dashes.filter((dash) => dash.length > 0)).toEqual([]);
  });
});
