import { BUILD_INFO } from '../app/buildInfo';
import { compassDeg, mpsToKn, wrap180 } from '../model/angles';
import { autopilotHeadingDeg } from '../model/autopilot';
import type { RopeStatus } from '../model/boomSolver';
import type { Store } from '../app/store';
import { daylight } from '../model/clock';
import { area } from '../model/area';
import { sunPosition } from '../model/sun';
import { significantHeightM, waveTrains } from '../model/waves';
import { el } from './dom';
import { t, type StringKey } from './i18n';
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

/** Debug overlay (PHASE1_SPEC 9.3). Off by default; `?debug=1` or Settings turns it on. */
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
      const {
        camera,
        settings,
        selection,
        rig,
        boat,
        motion,
        autopilot,
        wind,
        windMode,
        engine,
        sea,
        clock,
      } = store.getState();
      const trains = waveTrains(sea);
      const mainTrain = trains[0];
      const sol = rig.solution;
      const jib = rig.jibSolution;
      const deg = (value: number) => `${value.toFixed(1)}°`;
      const signed = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}`;
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
        [
          t('debug.windMode'),
          `${windMode.mode} seed ${windMode.seed} size ${windMode.size} ×${settings.timeScale} t ${(rig.timeS - windMode.startS).toFixed(0)} s`,
        ],
        [t('debug.apparent'), `${rig.wind.awaDeg.toFixed(1)}° / ${rig.wind.awsKn.toFixed(2)} kn`],
        [
          t('debug.forces'),
          motion
            ? `${(motion.forces.driveN / 1000).toFixed(2)} / ${(motion.forces.sideN / 1000).toFixed(2)} / ${(motion.resistance.totalN / 1000).toFixed(2)} kN`
            : '–',
        ],
        [t('debug.heel'), `${boat.heelDeg.toFixed(1)}° ${boat.heelRateDegS.toFixed(1)}°/s`],
        [
          t('debug.moments'),
          motion
            ? `${(motion.heelMomentNm / 1000).toFixed(1)} / ${(motion.rightingMomentNm / 1000).toFixed(1)}`
            : '–',
        ],
        [
          t('debug.helm'),
          motion ? `${motion.grip.toFixed(2)} / ${motion.effectiveRudderDeg.toFixed(1)}°` : '–',
        ],
        [
          t('debug.autopilot'),
          autopilot.mode === 'off'
            ? 'off'
            : `${wrap180(autopilotHeadingDeg(autopilot, wind.dirDeg) - boat.headingDeg).toFixed(1)}° / ${autopilot.integralDeg.toFixed(2)}`,
        ],
        [
          t('debug.engine'),
          engine.running
            ? `${engine.gear} ${engine.rpm.toFixed(0)} rpm lv ${engine.leverPct}`
            : 'stopped',
        ],
        [t('debug.build'), `${BUILD_INFO.shortHash} ${BUILD_INFO.date}`],
        [
          t('debug.waves'),
          mainTrain
            ? `Hs ${significantHeightM(trains).toFixed(2)} m · Tp ${mainTrain.periodS.toFixed(1)} s · from ${String(Math.round(compassDeg(sea.dirDeg)) % 360).padStart(3, '0')}°`
            : '–',
        ],
        [t('debug.sun'), sunText(clock.utcMs)],
        [
          t('debug.waveMotion'),
          `heave ${boat.waves.heaveM.toFixed(2)} m · pitch ${boat.waves.pitchDeg.toFixed(1)}° · roll ${boat.waves.rollDeg.toFixed(1)}°`,
        ],
        [
          t('debug.wavePush'),
          motion
            ? `resistance ${(motion.waveResistanceN / 1000).toFixed(2)} kN · yaw ${signed(motion.waveYawDeg)}° · sails sideways ${motion.rigSideMps.toFixed(1)} m/s`
            : '–',
        ],
      ];
      const text = rows.map(([label, value]) => `${label.padEnd(12)}${value}`).join('\n');
      if (text !== lastText) {
        box.textContent = text;
        lastText = text;
      }
    },
  };
}

/** `elev 68.6° az 180.0° · Day`: where the sun is at the time on board. */
function sunText(utcMs: number): string {
  const { elevationDeg, azimuthDeg } = sunPosition(
    utcMs,
    area.position.latitudeDeg,
    area.position.longitudeDeg,
  );
  return `elev ${elevationDeg.toFixed(1)}° az ${azimuthDeg.toFixed(1)}° · ${t(`clock.light.${daylight(elevationDeg)}` as StringKey).split(' (')[0] ?? ''}`;
}
