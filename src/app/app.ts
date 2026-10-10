import { createScene, type SceneView } from '../render3d/scene';
import { createCameraBar } from '../ui/cameraBar';
import { createDebugOverlay, type FrameTimes } from '../ui/debugOverlay';
import {
  clearSceneError,
  installErrorBanner,
  showSceneError,
  webglAvailable,
} from '../ui/errorBoundary';
import { t } from '../ui/i18n';
import { createInfoCard } from '../ui/infoCard';
import { createLabels3d, type Labels3d } from '../ui/labels3d';
import { createLayout } from '../ui/layout';
import { createPanel } from '../ui/panel';
import { createPauseButton } from '../ui/pauseButton';
import { ropesTabShows } from '../ui/ropesTab';
import { createWindIndicator } from '../ui/windIndicator';
import { defaultDetail } from '../model/settings';
import { createStore } from './store';
import { parseUrlState } from './urlState';
import { startUrlSync } from './urlSync';

/** How often the FPS figure is refreshed, ms. */
const FPS_WINDOW_MS = 500;

/** Wires store, layout, panel, 3D view and the main loop together. */
export function startApp(host: HTMLElement): void {
  document.title = t('app.title');
  const store = createStore(
    parseUrlState(window.location.search, defaultDetail(window.screen.width, window.screen.height)),
  );
  startUrlSync(store);

  const layout = createLayout(host);
  const reportError = installErrorBanner(layout.root);
  const panel = createPanel(layout.panel, store);
  const debug = createDebugOverlay(layout.view, store);

  // Error boundary (M5): without WebGL, or if the 3D view fails, a message takes its place and
  // the panel, the wind chip and Pause keep working.
  let scene: SceneView | undefined;
  if (!webglAvailable()) {
    showSceneError(layout.view, 'scene.unsupported');
  } else {
    try {
      scene = createScene(layout.view, store);
    } catch (error) {
      showSceneError(layout.view, 'scene.unsupported', error);
    }
  }

  // Under the view's own buttons and cards.
  const labels: Labels3d | undefined = scene ? createLabels3d(layout.view, store) : undefined;
  createWindIndicator(layout.view, store);
  createPauseButton(layout.view, store);
  const card = createInfoCard(layout, store, {
    shownInPanel: (partId) => panel.activeTab() === 'ropes' && ropesTabShows(partId),
  });
  panel.onTabChange(() => card.refresh());
  if (scene) {
    // The phone can take the graphics memory back (many tabs, low memory): say so until it
    // returns.
    scene.canvas.addEventListener('webglcontextlost', () =>
      showSceneError(layout.view, 'scene.lost'),
    );
    scene.canvas.addEventListener('webglcontextrestored', () => clearSceneError(layout.view));
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
  // Frame times for the debug overlay (M5 performance pass), summed over the FPS window.
  const sums = { worstFrameMs: 0, stepMs: 0, drawMs: 0 };
  let times: FrameTimes | undefined;
  const loop = (now: number) => {
    requestAnimationFrame(loop);
    if (last !== undefined) sums.worstFrameMs = Math.max(sums.worstFrameMs, now - last);
    // The rig moves towards the controls (lagged ropes, smoothed boom), then it is drawn.
    const start = performance.now();
    try {
      store.dispatch({ type: 'step', dt: last === undefined ? 0 : (now - last) / 1000 });
    } catch (error) {
      reportError(error);
    }
    last = now;
    const stepped = performance.now();
    if (scene) {
      try {
        scene.render(now);
        labels?.update(store.getState().settings.labels ? scene.labelPoints() : []);
      } catch (error) {
        // A 3D view that fails while running stops; the panel keeps working (M5).
        scene = undefined;
        showSceneError(layout.view, 'scene.failed', error);
      }
    }
    sums.stepMs += stepped - start;
    sums.drawMs += performance.now() - stepped;
    frames += 1;
    if (now - windowStart >= FPS_WINDOW_MS) {
      fps = (frames * 1000) / (now - windowStart);
      times = {
        worstFrameMs: sums.worstFrameMs,
        stepMs: sums.stepMs / frames,
        drawMs: sums.drawMs / frames,
      };
      Object.assign(sums, { worstFrameMs: 0, stepMs: 0, drawMs: 0 });
      frames = 0;
      windowStart = now;
    }
    debug.update(
      fps,
      layout.viewport(),
      { device: window.devicePixelRatio || 1, render: scene?.pixelRatio ?? 0 },
      scene?.stats(),
      times,
    );
  };
  requestAnimationFrame(loop);
}
