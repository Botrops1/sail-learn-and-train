import { createScene, type SceneView } from '../render3d/scene';
import { createDebugOverlay } from '../ui/debugOverlay';
import { el } from '../ui/dom';
import { t } from '../ui/i18n';
import { createLayout } from '../ui/layout';
import { createPanel } from '../ui/panel';
import { createStore } from './store';
import { parseUrlState } from './urlState';
import { startUrlSync } from './urlSync';

/** How often the FPS figure is refreshed, ms. */
const FPS_WINDOW_MS = 500;

/** Wires store, layout, panel, 3D view and the main loop together. */
export function startApp(host: HTMLElement): void {
  document.title = t('app.title');
  const store = createStore(parseUrlState(window.location.search));
  startUrlSync(store);

  const layout = createLayout(host);
  createPanel(layout.panel, store);
  const debug = createDebugOverlay(layout.view, store);

  let scene: SceneView | undefined;
  try {
    scene = createScene(layout.view);
  } catch (error) {
    console.warn('3D view unavailable:', error);
    layout.view.append(el('p', { class: 'scene-error' }, [t('scene.unavailable')]));
  }

  if (scene) {
    const view = scene;
    const resize = () => view.resize(layout.view.clientWidth, layout.view.clientHeight);
    new ResizeObserver(resize).observe(layout.view);
    resize();
  }

  let frames = 0;
  let windowStart = performance.now();
  let fps = 0;
  const loop = (now: number) => {
    scene?.render();
    frames += 1;
    if (now - windowStart >= FPS_WINDOW_MS) {
      fps = (frames * 1000) / (now - windowStart);
      frames = 0;
      windowStart = now;
    }
    debug.update(fps, layout.viewport(), {
      device: window.devicePixelRatio || 1,
      render: scene?.pixelRatio ?? 0,
    });
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
