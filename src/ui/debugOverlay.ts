import { BUILD_INFO } from '../app/buildInfo';
import type { RopeStatus } from '../model/boomSolver';
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
      const { camera, settings, selection, rig } = store.getState();
      const sol = rig.solution;
      const jib = rig.jibSolution;
      const deg = (value: number) => `${value.toFixed(1)}°`;
      const rope = (name: string, status: RopeStatus) =>
        `${name} ${status.state}${status.state === 'slack' ? ` ${status.slack.toFixed(2)} m` : ''}`;
      const rows: [string, string][] = [
        [t('debug.fps'), fps.toFixed(0)],
        [t('debug.layout'), t(viewport.mode === 'side' ? 'layout.side' : 'layout.stacked')],
        [t('debug.viewport'), `${viewport.width}×${viewport.height}`],
        [t('debug.aspect'), (viewport.width / viewport.height).toFixed(2)],
        [t('debug.dpr'), `${pixelRatio.device.toFixed(2)} → ${pixelRatio.render.toFixed(2)}`],
        [t('debug.cam'), camera.preset],
        [t('debug.selection'), selection ?? '–'],
        [t('debug.step'), `${settings.step} %`],
        [t('debug.boom'), `${deg(rig.theta.value)} ${deg(rig.psi.value)}`],
        [t('debug.free'), `${deg(sol.thetaFreeDeg)} ${deg(sol.psiTargetDeg)}`],
        [t('debug.limits'), `${deg(sol.lowerDeg)} … ${deg(sol.upperDeg)}`],
        [t('debug.main'), `AoA ${deg(sol.aoaDeg)} fill ${sol.fill.toFixed(2)}`],
        [t('debug.jib'), `φ ${deg(rig.jibPhi.value)} h ${deg(jib.headingDeg)}`],
        ['', `AoA ${deg(jib.aoaDeg)} fill ${jib.fill.toFixed(2)}`],
        [t('debug.carZ'), `${jib.carZ.toFixed(2)} m  out ${(jib.unfurled * 100).toFixed(0)} %`],
        [t('debug.ropes'), rope('sheet', sol.mainsheet)],
        ['', rope('vang', sol.vang)],
        ['', rope('lift', sol.toppingLift)],
        ['', rope('jib sheet', jib.sheet)],
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
