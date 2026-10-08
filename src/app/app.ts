import { createScene, type SceneView } from '../render3d/scene';
import { createCameraBar } from '../ui/cameraBar';
import { createDebugOverlay } from '../ui/debugOverlay';
import { el } from '../ui/dom';
import { t } from '../ui/i18n';
import { createInfoCard } from '../ui/infoCard';
import { createLayout } from '../ui/layout';
import { createPanel } from '../ui/panel';
import { ropesTabShows } from '../ui/ropesTab';
import { createWindIndicator } from '../ui/windIndicator';
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
  const panel = createPanel(layout.panel, store);
  const debug = createDebugOverlay(layout.view, store);

  let scene: SceneView | undefined;
  try {
    scene = createScene(layout.view, store);
  } catch (error) {
    console.warn('3D view unavailable:', error);
    layout.view.append(el('p', { class: 'scene-error' }, [t('scene.unavailable')]));
  }

  if (scene) {
    createWindIndicator(layout.view, store);
    const card = createInfoCard(layout, store, {
      shownInPanel: (partId) => panel.activeTab() === 'ropes' && ropesTabShows(partId),
    });
    panel.onTabChange(() => card.refresh());
    const cameraBar = createCameraBar(layout.view, store);
    const view = scene;
    const resize = () => {
      const viewBox = layout.view.getBoundingClientRect();
      const inset = viewBox.bottom - cameraBar.getBoundingClientRect().top;
      const stacked = layout.viewport().mode === 'stacked';
      view.resize(layout.view.clientWidth, layout.view.clientHeight, inset, stacked);
    };
    new ResizeObserver(resize).observe(layout.view);
    resize();
  }

  let frames = 0;
  let windowStart = performance.now();
  let fps = 0;
  let last: number | undefined;
  const loop = (now: number) => {
    // The rig moves towards the controls (lagged ropes, smoothed boom), then it is drawn.
    store.dispatch({ type: 'step', dt: last === undefined ? 0 : (now - last) / 1000 });
    last = now;
    scene?.render(now);
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
