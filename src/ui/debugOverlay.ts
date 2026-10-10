import { BUILD_INFO } from '../app/buildInfo';
import { mpsToKn, wrap180 } from '../model/angles';
import { autopilotHeadingDeg } from '../model/autopilot';
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

/** What the last frame cost the graphics card (M3b). */
export interface RenderStats {
  calls: number;
  triangles: number;
}

/**
 * Where a frame's time goes (M5 performance pass), averaged over the FPS window, milliseconds:
 * the longest gap between two frames, and the main thread's work per frame for the model and
 * panel (`step`, the store's frame step with every listener) and for the 3D view (`draw`,
 * including the labels).
 */
export interface FrameTimes {
  worstFrameMs: number;
  stepMs: number;
  drawMs: number;
}

export interface DebugOverlay {
  /** Called once per rendered frame with the measured frames per second. */
  update(
    fps: number,
    viewport: Viewport,
    pixelRatio: PixelRatio,
    render?: RenderStats,
    times?: FrameTimes,
  ): void;
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
    update(fps, viewport, pixelRatio, render, times) {
      if (box.hidden) return;
      const { camera, settings, selection, rig, boat, motion, autopilot, controls } =
        store.getState();
      const sol = rig.solution;
      const jib = rig.jibSolution;
      const deg = (value: number) => `${value.toFixed(1)}°`;
      const rope = (name: string, status: RopeStatus) =>
        `${name} ${status.state}${status.state === 'slack' ? ` ${status.slack.toFixed(2)} m` : ''}`;
      const rows: [string, string][] = [
        // Nothing measured yet in the first half second.
        [t('debug.fps'), fps > 0 ? fps.toFixed(0) : '–'],
        [
          t('debug.worstFrame'),
          times
            ? `${times.worstFrameMs.toFixed(0)} ms (${(1000 / Math.max(1, times.worstFrameMs)).toFixed(0)} fps)`
            : '–',
        ],
        [
          t('debug.work'),
          times ? `step ${times.stepMs.toFixed(1)} · 3D ${times.drawMs.toFixed(1)} ms` : '–',
        ],
        [t('debug.layout'), t(viewport.mode === 'side' ? 'layout.side' : 'layout.stacked')],
        [t('debug.viewport'), `${viewport.width}×${viewport.height}`],
        [t('debug.aspect'), (viewport.width / viewport.height).toFixed(2)],
        [t('debug.dpr'), `${pixelRatio.device.toFixed(2)} → ${pixelRatio.render.toFixed(2)}`],
        [t('debug.detail'), settings.detail],
        [t('debug.calls'), render ? String(render.calls) : '–'],
        [t('debug.triangles'), render ? String(render.triangles) : '–'],
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
        [
          t('debug.motion'),
          `${mpsToKn(boat.speedMps).toFixed(2)} kn ${boat.yawRateDegS.toFixed(1)}°/s`,
        ],
        [t('debug.winds'), `${rig.wind.twaDeg.toFixed(0)}° / ${rig.wind.twsKn.toFixed(1)} kn`],
        [t('debug.apparent'), `${rig.wind.awaDeg.toFixed(1)}° / ${rig.wind.awsKn.toFixed(2)} kn`],
        [
          t('debug.forces'),
          motion
            ? `${(motion.forces.driveN / 1000).toFixed(2)} / ${(motion.forces.sideN / 1000).toFixed(2)} / ${(motion.resistance.totalN / 1000).toFixed(2)} kN`
            : '–',
        ],
        [
          t('debug.autopilot'),
          autopilot.mode === 'off'
            ? 'off'
            : `${wrap180(autopilotHeadingDeg(autopilot, controls.ctl_wind_dir) - boat.headingDeg).toFixed(1)}° / ${autopilot.integralDeg.toFixed(2)}`,
        ],
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
