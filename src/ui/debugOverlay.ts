import { BUILD_INFO } from '../app/buildInfo';
import type { Store } from '../app/store';
import { el } from './dom';
import { t } from './i18n';
import type { Viewport } from './layout';

export interface PixelRatio {
  /** What the device reports. */
  device: number;
  /** What the 3D renderer uses (capped). */
  render: number;
}

export interface DebugOverlay {
  /** Called once per rendered frame with the measured frames per second. */
  update(fps: number, viewport: Viewport, pixelRatio: PixelRatio): void;
}

/** Debug overlay (PHASE1_SPEC 9.3). Off by default; `?debug=1` or the View tab turns it on. */
export function createDebugOverlay(host: HTMLElement, store: Store): DebugOverlay {
  const box = el('pre', { class: 'debug', 'data-testid': 'debug-overlay', 'aria-live': 'off' });
  host.append(box);

  const applyVisibility = () => {
    box.hidden = !store.getState().settings.debug;
  };
  store.subscribe(applyVisibility);
  applyVisibility();

  let lastText = '';
  return {
    update(fps, viewport, pixelRatio) {
      if (box.hidden) return;
      const { camera, settings, selection } = store.getState();
      const rows: [string, string][] = [
        [t('debug.fps'), fps.toFixed(0)],
        [t('debug.layout'), t(viewport.mode === 'side' ? 'layout.side' : 'layout.stacked')],
        [t('debug.viewport'), `${viewport.width}×${viewport.height}`],
        [t('debug.aspect'), (viewport.width / viewport.height).toFixed(2)],
        [t('debug.dpr'), `${pixelRatio.device.toFixed(2)} → ${pixelRatio.render.toFixed(2)}`],
        [t('debug.cam'), camera.preset],
        [t('debug.selection'), selection ?? '–'],
        [t('debug.step'), `${settings.step} %`],
        [t('debug.build'), `${BUILD_INFO.shortHash} ${BUILD_INFO.date}`],
      ];
      const text = rows.map(([label, value]) => `${label.padEnd(12)}${value}`).join('\n');
      if (text !== lastText) {
        box.textContent = text;
        lastText = text;
      }
    },
  };
}
