import { createScene, type SceneView } from '../render3d/scene';
import { createCameraChip, createViewBottom } from '../ui/cameraChip';
import { createDebugOverlay, type FrameTimes } from '../ui/debugOverlay';
import {
  clearSceneError,
  installErrorBanner,
  showSceneError,
  webglAvailable,
} from '../ui/errorBoundary';
import { el } from '../ui/dom';
import { currentLanguage, setLanguage, t } from '../ui/i18n';
import { createInfoCard } from '../ui/infoCard';
import { createLabels3d, type Labels3d } from '../ui/labels3d';
import { createLayout } from '../ui/layout';
import { createMapView } from '../ui/mapView';
import { createMiniMap, type MiniMap } from '../ui/miniMap';
import { createModeChip } from '../ui/modeChip';
import { createPanel } from '../ui/panel';
import { createSettingsContent, createSettingsMenu } from '../ui/settingsMenu';
import { createSheet } from '../ui/sheet';
import { createAlertCentre } from '../ui/alertCentre';
import { createClockPanel } from '../ui/clockPanel';
import { createTimeBar, topClearance, trackTopHeight } from '../ui/timeBar';
import { ropesTabShows } from '../ui/ropesTab';
import { createInstrumentStrip } from '../ui/instrumentStrip';
import { createWindIndicator } from '../ui/windIndicator';
import { defaultDetail } from '../model/settings';
import { createStore } from './store';
import { parseUrlState } from './urlState';
import { startUrlSync } from './urlSync';

/** How often the FPS figure is refreshed, ms. */
const FPS_WINDOW_MS = 500;

/** Wires store, layout, panel, 3D view and the main loop together. */
export function startApp(host: HTMLElement): void {
  // The language first: every element below is built once with t() (PHASE4_SPEC 9.3).
  const initial = parseUrlState(
    window.location.search,
    defaultDetail(window.screen.width, window.screen.height),
  );
  setLanguage(initial.settings.language);
  document.documentElement.lang = currentLanguage();
  document.title = t('app.title');
  const store = createStore(initial);
  startUrlSync(store);

  const layout = createLayout(host);
  const reportError = installErrorBanner(layout.root);
  // The top area (strip, time bar, clock) is built first: the sheet sizes itself below it. It
  // joins the view further down, in its old place among the overlays.
  const top = el('div', { class: 'view-top', 'data-testid': 'view-top' });
  const sheet = createSheet(layout, layout.view, top);
  // The settings are built once: the Settings section holds them on the wide layout (M38), the
  // gear's dialog everywhere else.
  const settingsContent = createSettingsContent(store);
  const panel = createPanel(layout.panel, store, sheet, layout, settingsContent);
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
  // The bird's-eye map (M7) takes the 3D view's place while the camera is on Map. It needs no
  // WebGL, but without the camera chip there is no way back, so it comes with the 3D view.
  const map = scene ? createMapView(layout.view, store) : undefined;
  // The mini-map (M28) sits over the 3D view while Sailing; it needs the 3D view and the sheet.
  const miniMap: MiniMap | undefined = scene
    ? createMiniMap(layout.view, store, layout, sheet)
    : undefined;
  // The chip row at the bottom of the view (M25): the gear always (the settings work without
  // WebGL), the camera chip only with the 3D view. On the wide layout (M38) the gear and the mode
  // chip are hidden: Mode and Settings are sections of the panel there.
  const chipRow = createViewBottom(layout.view);
  createSettingsMenu(chipRow, layout.root, settingsContent, layout);
  // The mode chip comes first in the row, with or without WebGL.
  createModeChip(chipRow, store);
  // The top of the view: the instrument strip and the time bar (Pause), side by side or, where
  // the view is too narrow for both, the bar under the strip.
  layout.view.append(top);
  createInstrumentStrip(
    top,
    store,
    () => panel.showSection('conditions'),
    panel.showLearnEntry,
    layout,
  );
  // Right of the strip (M37): the time bar, with the clock and Attention chips under it. On a
  // phone both wrappers vanish (`display: contents`) and their children join the top row.
  const topRight = el('div', { class: 'top-right', 'data-testid': 'top-right' });
  const topChips = el('div', { class: 'top-chips' });
  topRight.append(topChips);
  top.append(topRight);
  createTimeBar(topRight, store);
  createClockPanel(topChips, layout.view, store);
  // The camera frames the boat below the time bar; `resize` is set once the scene exists.
  let reframe = () => {};
  trackTopHeight(layout.view, top, () => reframe());
  createWindIndicator(layout.view, store);
  const card = createInfoCard(layout, store, {
    shownInPanel: (partId) =>
      (panel.shows('ropes') &&
        ropesTabShows(partId) &&
        store.getState().appMode !== 'learn' &&
        store.getState().appMode !== 'harbour') ||
      (panel.shows('learn') && store.getState().learn === partId),
    atPeek: sheet.atPeek,
    atFull: sheet.atFull,
    showLearn: panel.openLearnEntry,
  });
  panel.onChange(() => card.refresh());
  sheet.onChange(() => {
    card.refresh();
    reframe();
  });
  // Whether the card stays away depends on the open entry (the Learn section shows the same part).
  store.subscribe((state, previous) => {
    if (state.learn !== previous.learn) card.refresh();
  });
  if (scene) {
    // The phone can take the graphics memory back (many tabs, low memory): say so until it
    // returns.
    scene.canvas.addEventListener('webglcontextlost', () =>
      showSceneError(layout.view, 'scene.lost'),
    );
    scene.canvas.addEventListener('webglcontextrestored', () => clearSceneError(layout.view));
    if (map) createCameraChip(chipRow, store, map);
    const view = scene;
    const resize = () => {
      const viewBox = layout.view.getBoundingClientRect();
      const stacked = layout.viewport().mode === 'stacked';
      // Stacked: the boat is framed above the sheet and the chip row (PHASE5_SPEC 3.3); side by
      // side the panel is beside the view, so only the chip row covers it.
      const inset = stacked
        ? sheet.cameraInset()
        : viewBox.bottom - chipRow.getBoundingClientRect().top;
      view.resize(
        layout.view.clientWidth,
        layout.view.clientHeight,
        inset,
        stacked,
        // Stacked (phones): the strip spans the view's width, so the boat is framed below the
        // whole top area, also in Held still where the time bar sits beside the strip.
        stacked ? Math.ceil(top.offsetTop + top.offsetHeight + 4) : topClearance(top),
      );
    };
    reframe = resize;
    new ResizeObserver(resize).observe(layout.view);
    resize();
  }
  // The history of the short alerts (M36, issue #80). After the camera chip, so that its button
  // stands between the camera chip and the gear in the chip row.
  createAlertCentre(topChips, chipRow, layout.view, store, layout, panel.showLearnEntry);

  let frames = 0;
  let windowStart = performance.now();
  let fps = 0;
  let last: number | undefined;
  // Frame times for the debug overlay (M5 performance pass), summed over the FPS window.
  const sums = { worstFrameMs: 0, stepMs: 0, drawMs: 0 };
  let times: FrameTimes | undefined;
  let stepFailed = false;
  const loop = (now: number) => {
    requestAnimationFrame(loop);
    if (last !== undefined) sums.worstFrameMs = Math.max(sums.worstFrameMs, now - last);
    // The rig moves towards the controls (lagged ropes, smoothed boom), then it is drawn.
    const start = performance.now();
    try {
      store.dispatch({ type: 'step', dt: last === undefined ? 0 : (now - last) / 1000 });
    } catch (error) {
      // Said once (console and banner), not every frame.
      if (!stepFailed) console.error(error);
      stepFailed = true;
      reportError(error);
    }
    last = now;
    const stepped = performance.now();
    if (map?.shown()) {
      // The map shows: no 3D drawing (saves the battery), no labels in 3D.
      labels?.update([]);
      try {
        map.update(now);
      } catch (error) {
        // A map that fails to draw gives the 3D view back; the panel keeps working.
        console.error(error);
        reportError(error);
        store.dispatch({ type: 'setCameraPreset', preset: 'side-port' });
      }
    } else if (scene) {
      try {
        scene.render(now);
        labels?.update(store.getState().settings.labels ? scene.labelPoints() : []);
      } catch (error) {
        // A 3D view that fails while running stops; the panel keeps working (M5).
        scene = undefined;
        labels?.update([]);
        miniMap?.hide();
        showSceneError(layout.view, 'scene.failed', error);
      }
      try {
        miniMap?.update(now);
      } catch (error) {
        // A mini-map that fails to draw goes away; the 3D view keeps working.
        console.error(error);
        reportError(error);
        miniMap?.hide();
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
