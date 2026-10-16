import type { Store } from '../app/store';
import { el } from './dom';
import { t } from './i18n';
import type { LayoutShell } from './layout';
import { MINI_MAP, drawMiniMap } from './mapView';
import type { Sheet } from './sheet';

export interface MiniMap {
  /** Redraws when the mini-map shows and the last draw is old enough (call every frame). */
  update(nowMs: number): void;
  /** Hides the mini-map for good (the 3D view failed). */
  hide(): void;
}

/**
 * The mini-map (M28, PHASE5_SPEC 9.4): a small north-up map in the corner of the 3D view while
 * the boat is Sailing, just above the chip row. A tap opens the full map. It shows only when the
 * setting is on, the camera is not on the map, and (on a phone) the sheet is not at full height.
 * It sets `data-mini-map` on the view while it shows, so the info card can keep clear of it.
 */
export function createMiniMap(
  view: HTMLElement,
  store: Store,
  layout: LayoutShell,
  sheet: Sheet,
): MiniMap {
  const canvas = el('canvas', { 'data-testid': 'mini-map-canvas' });
  const button = el(
    'button',
    {
      type: 'button',
      class: 'mini-map',
      'data-testid': 'mini-map',
      'aria-label': t('minimap.open'),
    },
    [canvas],
  );
  button.hidden = true;
  view.append(button);
  const context = canvas.getContext('2d');

  let hiddenForGood = false;
  let shown = false;
  let lastDrawMs = -Infinity;
  let dpr = 1;
  /** The width the canvas was last sized for, CSS px (the canvas is square). */
  let sizedFor = 0;

  const shouldShow = (): boolean => {
    if (hiddenForGood) return false;
    const state = store.getState();
    return (
      state.settings.miniMap &&
      state.boat.mode === 'sailing' &&
      state.camera.preset !== 'map' &&
      !sheet.atFull()
    );
  };

  /** Sizes the canvas to its CSS width. Reads the layout, so never once per frame. */
  const resize = () => {
    if (!shown) return;
    const width = canvas.clientWidth;
    dpr = Math.min(window.devicePixelRatio || 1, MINI_MAP.maxDpr);
    if (width > 0 && width !== sizedFor) {
      sizedFor = width;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = canvas.width;
    }
  };

  /** Applies the visibility rule and the `data-mini-map` attribute (no layout read). */
  const applyVisibility = () => {
    const show = shouldShow();
    if (show === shown) return;
    shown = show;
    button.hidden = !show;
    view.toggleAttribute('data-mini-map', show);
    if (show) {
      // A mini-map that has just appeared is drawn at the next frame, not after the pause.
      lastDrawMs = -Infinity;
      resize();
    }
  };

  /** The size changes only with the layout or the sheet's height (PHASE5_SPEC 10.4). */
  const refresh = () => {
    applyVisibility();
    resize();
  };

  store.subscribe((state, previous) => {
    if (
      state.camera.preset !== previous.camera.preset ||
      state.boat.mode !== previous.boat.mode ||
      state.settings.miniMap !== previous.settings.miniMap
    ) {
      applyVisibility();
    }
  });
  layout.onChange(refresh);
  sheet.onChange(refresh);

  button.addEventListener('click', () => {
    store.dispatch({ type: 'setCameraPreset', preset: 'map' });
    // The mini-map hides itself; the focus goes to the Close chip that took its place.
    view.querySelector<HTMLElement>('[data-testid="map-close"]')?.focus();
  });

  // The words are never drawn here; `mapLayout` only needs a width.
  const width = (text: string) => text.length * 7;

  applyVisibility();
  return {
    update(nowMs) {
      applyVisibility();
      if (!shown || !context || sizedFor === 0 || nowMs - lastDrawMs < 1000 / MINI_MAP.maxFps) {
        return;
      }
      lastDrawMs = nowMs;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawMiniMap(context, store.getState(), sizedFor, width);
    },
    hide() {
      hiddenForGood = true;
      applyVisibility();
    },
  };
}
