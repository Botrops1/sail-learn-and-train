import { boat as boatData } from '../model/boat';
import type { AppMode } from './appMode';
import { isRegisteredPartId } from '../model/registry';
import { clampControl, defaultControls, type ControlId, type Controls } from '../model/controls';
import {
  DEFAULT_CAMERA,
  DEFAULT_SETTINGS,
  type CameraPreset,
  type CameraState,
  type Detail,
  type RopesMode,
  type Settings,
  type StepSize,
} from '../model/settings';
import {
  initialRealistic,
  reduceRealistic,
  stepRealistic,
  type RealisticAction,
  type RealisticState,
} from '../model/realistic';
import { step, initialRig, type BoatMotion, type RigHistory, type RigState } from '../model/sim';
import {
  adjustAutopilot,
  engageAutopilot,
  stepAutopilot,
  tackAutopilot,
  type AutopilotState,
} from '../model/autopilot';
import { engineThrustN, initialEngine, stepEngine, type EngineState } from '../model/engine';
import { defaultClockUtcMs, isClockTime, type ClockState } from '../model/clock';
import { EMPTY_ALERTS, recordAlerts, type AlertLog } from '../model/alerts';
import { DEFAULT_HARBOUR, type HarbourState } from '../model/harbour';
import { harbourForces } from '../model/harbourForces';
import { THRUSTERS_OFF, type ThrustDir, type ThrusterState } from '../model/thrusters';
import { appendTrack, type TrackPoint } from '../model/track';
import { isTimeScale, pauseAvailable, timeSpeedAvailable } from '../model/timeScale';
import {
  defaultSeaSetting,
  initialSea,
  setSeaSetting,
  stepSea,
  isSeaSetting,
  waveTrains,
  type SeaSetting,
  type SeaState,
  type WaveTrain,
} from '../model/waves';
import { rigMotion } from '../model/waveMotion';
import {
  initialWindMode,
  isSeed,
  sizeRange,
  windAt,
  type WindModeId,
  type WindModeState,
  type WindNow,
} from '../model/windModes';
import { floggingDamage, NO_DAMAGE, type SailDamage } from '../model/trim';
import {
  initialBoat,
  steadyState,
  stepBoat,
  type BoatState,
  type MotionReport,
} from '../model/motion';

/**
 * The single app store (PHASE1_SPEC 9.1): control targets, the solved rig, the selected part,
 * camera and settings. UI dispatches actions; renderers read the state.
 */
export interface AppState {
  /** What the user has set (targets). */
  controls: Controls;
  /** What the rig is doing (solved and smoothed, advanced every frame). */
  rig: RigState;
  camera: CameraState;
  settings: Settings;
  /** Registry id of the part shown in the info card, or null. */
  selection: string | null;
  /** The entry the Learn tab shows (a registry id), or null for the list (M21) or the empty page (M20). In the link as `learn`. */
  learn: string | null;
  /** The mode (PHASE5_SPEC 4.1): 'learn' or 'harbour' (M41), or the ropes mode. In the link as `m=learn` / `m=harbour`. */
  appMode: AppMode;
  /** Realistic mode (PHASE1_SPEC 7.2.2): stations, clutches, winches. Kept while in Easy mode. */
  realistic: RealisticState;
  /** Pause (both modes): time stands still; not stored in the URL. */
  paused: boolean;
  /** The boat's motion (PHASE2_SPEC 4.1): held still or sailing, heading, speed, position. */
  boat: BoatState;
  autopilot: AutopilotState;
  /** The latest report of `stepBoat` (forces, resistance, winds), for the strip and debug. */
  motion: MotionReport | null;
  /** Seconds left to show "Autopilot on Standby: you took the wheel". */
  autopilotNoticeS: number;
  /** Where the boat has been (M7, for the map). Sailing only; not in the link. */
  track: TrackPoint[];
  /** The wind pattern on top of the mean wind the dial and slider set (M10). */
  windMode: WindModeState;
  /**
   * The true wind now (M10): the mean with the pattern applied, at the rig's clock. The dial and
   * slider show the mean (`controls`); the sails, the boat, the autopilot and the map use this.
   */
  wind: WindNow;
  /** How worn each sail is from flogging (M9, 0 … 1; 1 = torn). Not in the link. */
  sailDamage: SailDamage;
  /** The engine (M12): stopped or running, the lever, rpm and gear. */
  engine: EngineState;
  /** The sea (M14): the Waves setting and the wind the waves are made by (lagged). */
  sea: SeaState;
  /** The time on board (M17): UTC ms; runs with the simulated time, so Pause stops it. */
  clock: ClockState;
  /** Harbour gear (M33): the fenders. Phase 7 adds the windlass and the lines here. In the link as `fd`. */
  harbour: HarbourState;
  /** The bow and stern thrusters (M41): held by the learner, so never in the link. */
  thrusters: ThrusterState;
  /** The alert history (M36, issue #80): what the short messages said, kept for the notification centre. Not in the link. */
  alerts: AlertLog;
}

/** Engine commands (PHASE2_SPEC 12.3): start, stop, or the lever (−100 … 100, whole numbers). */
export type EngineCommand = 'start' | 'stop' | { leverPct: number };

/** Autopilot commands (PHASE2_SPEC 6.4). `turnDeg` + = turn the boat to starboard. */
export type AutopilotCommand = 'off' | 'heading' | 'wind' | 'tack' | { turnDeg: number };

export type Action =
  | { type: 'setStep'; step: StepSize }
  | { type: 'setDebug'; debug: boolean }
  | { type: 'setDetail'; detail: Detail }
  | { type: 'setRopesMode'; mode: RopesMode }
  /** Changes the mode; 'easy' and 'realistic' also set `settings.ropesMode` (PHASE5_SPEC 8.3). */
  | { type: 'setAppMode'; mode: AppMode }
  | { type: 'setLabels'; labels: boolean }
  /** Reset all (Settings): controls, camera, selection and settings back to the defaults. */
  | { type: 'reset' }
  | { type: 'setCameraPreset'; preset: CameraPreset }
  | { type: 'select'; partId: string | null }
  /** Open an entry in the Learn tab, or go back to the list with null. Unknown ids are refused (PHASE4_SPEC 4.1). */
  | { type: 'openLearn'; id: string | null }
  | { type: 'setControls'; values: Partial<Controls> }
  /** A clutch, winch or station action of Realistic mode. */
  | { type: 'realistic'; action: RealisticAction }
  | { type: 'setPaused'; paused: boolean }
  /** Held still (Phase 1) or Sailing (PHASE2_SPEC 6.4). */
  | { type: 'setBoatMode'; mode: 'sailing' | 'held' }
  | { type: 'autopilot'; command: AutopilotCommand }
  /** The engine (M12). */
  | { type: 'engine'; command: EngineCommand }
  /** Wind modes (M10): the pattern restarts now; its size goes to the mode's default. */
  | { type: 'setWindMode'; mode: WindModeId }
  /** The Waves setting of the Wind tab (M14): Flat, Sheltered, Coastal, Open sea. */
  | { type: 'setSeaSetting'; setting: SeaSetting }
  /** Size of the pattern: % (gusty), ° (shifty), kn (building, dying). Restarts the pattern. */
  | { type: 'setWindSize'; size: number }
  /** A new random pattern (the caller draws the seed, so the reducer stays pure). */
  | { type: 'newWindPattern'; seed: number }
  /** The time bar (M10, issue #25): a scale from `windModes.timeScales`; refused where the bar has no speed part. */
  | { type: 'setTimeScale'; scale: number }
  /** The Settings switch for the time bar's speed part. Off puts the time scale back to ×1. */
  | { type: 'setTimeBar'; timeBar: boolean }
  /** The fenders out or in the locker (M33), in every mode. */
  | { type: 'setFenders'; out: boolean }
  /** M41: a thruster joystick held to a side (-1 port, +1 starboard) or let go (0). */
  | { type: 'thruster'; which: 'bow' | 'stern'; dir: ThrustDir }
  /** Set the time on board (M17); "Now" is read from the device by the UI. */
  | { type: 'setClock'; utcMs: number }
  /** The Settings switch for the clock chip. */
  | { type: 'setClockShown'; shown: boolean }
  /** The Settings switch for the mini-map over the 3D view (M28). */
  | { type: 'setMiniMap'; miniMap: boolean }
  /** New sails: the flogging damage goes back to 0 (M9). */
  | { type: 'repairSails' }
  /** Replace the whole state (a practice scenario opened from its link, M4c). */
  | { type: 'load'; state: AppState }
  | { type: 'step'; dt: number };

export interface InitialOverrides {
  controls?: Partial<Controls>;
  camera?: Partial<CameraState>;
  settings?: Partial<Settings>;
  selection?: string | null;
  learn?: string | null;
  /** From a shared link: Learn or Harbour mode (`m=learn`, `m=harbour`); otherwise the mode follows the ropes mode. */
  appMode?: AppMode;
  /** From a shared link: rig history the controls alone do not give (see RigHistory). */
  history?: RigHistory;
  /** From a shared link: clutches, winch setup and station (Realistic mode). */
  realistic?: RealisticState;
  /** From a shared link: heading, speed, position, mode. Sailing without a speed: steady speed. */
  boat?: Partial<BoatState>;
  /** From a shared link; without it the autopilot holds the boat's heading. */
  autopilot?: AutopilotState;
  /** From a shared link: the wind mode, its seed and size. The pattern starts at time 0. */
  windMode?: Partial<WindModeState>;
  /** From a shared link: engine running and lever. */
  engine?: { running?: boolean; leverPct?: number };
  /**
   * The Waves setting (M14). Without it the water is flat, so every Phase 1 and 2 state is as it
   * was; the app passes `waves.defaultSetting` (links and Reset).
   */
  sea?: SeaSetting;
  /** The time on board (M17), UTC ms. Without it: the area's default (noon, 1 June). */
  clockUtcMs?: number;
  /** From a shared link (M33): the fenders. Without it they are in the locker. */
  harbour?: HarbourState;
}

/** The boat a link describes (PHASE2_SPEC 6.4): without a speed she starts at her steady speed. */
function boatFor(
  controls: Controls,
  overrides: Partial<BoatState> = {},
  wind?: WindNow,
  engine: EngineState = initialEngine(),
  trains: readonly WaveTrain[] = [],
): BoatState {
  const mode = overrides.mode ?? 'sailing';
  const headingDeg = overrides.headingDeg ?? 0;
  if (mode === 'held') {
    return initialBoat({
      ...overrides,
      mode,
      headingDeg,
      speedMps: 0,
      yawRateDegS: 0,
      swayMps: 0,
      heelDeg: 0,
    });
  }
  // She opens settled: at her steady speed and heel (a link may give the speed).
  const steady = steadyState(controls, headingDeg, undefined, {
    heel: true,
    engineThrustN: engineThrustN(engine),
    trains,
    ...(wind ? { windDirDeg: wind.dirDeg, twsKn: wind.twsKn } : {}),
  });
  const speedMps = overrides.speedMps ?? steady.speedMps;
  const heelDeg = overrides.heelDeg ?? steady.heelDeg;
  return initialBoat({ ...overrides, mode, headingDeg, speedMps, heelDeg });
}

/**
 * The sails' motion through the air (PHASE3_SPEC 7.3): the boat's speed plus the rig's pitching
 * along the bow, and its rolling sideways. Held still: none, exactly Phase 1.
 */
function motionOf(boat: BoatState): BoatMotion {
  if (boat.mode === 'held') {
    return { velocity: [0, 0, 0], headingDeg: boat.headingDeg, heelDeg: boat.heelDeg };
  }
  const m = rigMotion(boat.waves);
  return {
    velocity: [boat.speedMps + m.forwardMps, 0, m.sideMps],
    headingDeg: boat.headingDeg,
    heelDeg: boat.heelDeg,
  };
}

/** The true wind now for the controls' mean and a wind mode, at the rig clock `timeS`. */
function windNow(controls: Controls, windMode: WindModeState, timeS: number): WindNow {
  return windAt(controls.ctl_wind_dir, controls.ctl_wind_speed, windMode, timeS);
}

/**
 * Where the time bar has no speed part the time runs at ×1 (PHASE2_SPEC 10.3): Held still with a
 * steady wind, or the bar switched off.
 */
function withTimeRule(state: AppState): AppState {
  const { settings } = state;
  // Where Pause is replaced by the "Held still" chip (issue #34) time must not stay frozen.
  let next = state;
  if (
    state.paused &&
    !pauseAvailable(state.boat.mode, state.windMode.mode, settings.ropesMode, state.sea.setting)
  ) {
    next = { ...next, paused: false };
  }
  if (settings.timeScale === 1) return next;
  return timeSpeedAvailable(state.boat.mode, state.windMode.mode, settings.timeBar)
    ? next
    : { ...next, settings: { ...settings, timeScale: 1 } };
}

export function initialState(overrides: InitialOverrides = {}): AppState {
  const controls = { ...defaultControls(), ...overrides.controls };
  const windMode = initialWindMode(overrides.windMode);
  const wind = windNow(controls, windMode, 0);
  // Steady wind: the controls are the wind (Phase 1 and the sailing of M6-M9 exactly).
  const patterned = windMode.mode !== 'steady';
  const engine = initialEngine(overrides.engine);
  // The sea first: a Sailing boat opens at the speed she settles at in these waves.
  const sea = initialSea(overrides.sea ?? 'flat', wind);
  const boat = boatFor(
    controls,
    overrides.boat,
    patterned ? wind : undefined,
    engine,
    waveTrains(sea),
  );
  const settings = { ...DEFAULT_SETTINGS, ...overrides.settings };
  return withTimeRule({
    controls,
    // A link opens with the rig already settled for the apparent wind: no swing on load.
    rig: initialRig(
      controls,
      undefined,
      overrides.history,
      motionOf(boat),
      patterned ? wind : undefined,
    ),
    camera: { ...DEFAULT_CAMERA, ...overrides.camera },
    settings,
    selection: overrides.selection ?? null,
    learn: overrides.learn ?? null,
    appMode:
      overrides.appMode === 'learn' || overrides.appMode === 'harbour'
        ? overrides.appMode
        : settings.ropesMode,
    realistic: overrides.realistic ?? initialRealistic(),
    paused: false,
    boat,
    autopilot: overrides.autopilot ?? engageAutopilot('heading', boat, controls.ctl_wind_dir),
    motion: null,
    autopilotNoticeS: 0,
    track: [],
    windMode,
    wind,
    sailDamage: NO_DAMAGE,
    engine,
    sea,
    clock: { utcMs: overrides.clockUtcMs ?? defaultClockUtcMs() },
    harbour: overrides.harbour ?? DEFAULT_HARBOUR,
    thrusters: THRUSTERS_OFF,
    alerts: EMPTY_ALERTS,
  });
}

function withControls(controls: Controls, values: Partial<Controls>): Controls {
  const next = { ...controls };
  let changed = false;
  for (const [id, value] of Object.entries(values) as [ControlId, number | undefined][]) {
    if (value === undefined || !Number.isFinite(value)) continue;
    const clamped = clampControl(id, value);
    if (next[id] !== clamped) {
      next[id] = clamped;
      changed = true;
    }
  }
  return changed ? next : controls;
}

/** Longest frame step, seconds: a background tab must not make the rig jump. */
const MAX_STEP_S = 0.1;

/** How long "Autopilot on Standby: you took the wheel" shows, seconds. */
const AUTOPILOT_NOTICE_S = 3;

/**
 * One action on the state. Whatever it does, a message that starts because of it (a step, the
 * wheel turned, Sailing chosen with the fenders out) is written to the alert history (M36).
 */
export function reduce(state: AppState, action: Action): AppState {
  const next = reduceAction(state, action);
  // A link or Reset brings its own (empty) history.
  if (next === state || action.type === 'load' || action.type === 'reset') return next;
  const alerts = recordAlerts(next.alerts, state, next);
  return alerts === next.alerts ? next : { ...next, alerts };
}

function reduceAction(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setStep':
      return { ...state, settings: { ...state.settings, step: action.step } };
    case 'setDebug':
      return { ...state, settings: { ...state.settings, debug: action.debug } };
    case 'setDetail':
      return { ...state, settings: { ...state.settings, detail: action.detail } };
    case 'setRopesMode':
      return withTimeRule({
        ...state,
        settings: { ...state.settings, ropesMode: action.mode },
        // Out of Learn and Harbour mode, the mode is the ropes mode (PHASE5_SPEC 3.1, PHASE7_SPEC 4.4).
        appMode:
          state.appMode === 'learn' || state.appMode === 'harbour' ? state.appMode : action.mode,
      });
    case 'setAppMode': {
      if (action.mode === state.appMode) return state;
      // Learn and Harbour keep the ropes mode as it is.
      if (action.mode === 'learn' || action.mode === 'harbour') {
        return { ...state, appMode: action.mode };
      }
      return withTimeRule({
        ...state,
        appMode: action.mode,
        settings: { ...state.settings, ropesMode: action.mode },
      });
    }
    case 'setLabels':
      return { ...state, settings: { ...state.settings, labels: action.labels } };
    case 'reset': {
      // The rig keeps moving from where it is, so the boom and sails swing back visibly. The
      // debug overlay, the render detail and the language suit the device, not what is shown:
      // they stay.
      const { debug, detail, language } = state.settings;
      const defaults = initialState({
        settings: { debug, detail, language },
        sea: defaultSeaSetting(),
      });
      return {
        ...defaults,
        rig: state.rig,
        windMode: { ...defaults.windMode, startS: state.rig.timeS },
      };
    }
    case 'setCameraPreset':
      return { ...state, camera: { ...state.camera, preset: action.preset } };
    case 'select':
      return { ...state, selection: action.partId };
    case 'openLearn':
      if (action.id === state.learn) return state;
      if (action.id !== null && !isRegisteredPartId(action.id)) return state;
      return { ...state, learn: action.id };
    case 'setControls': {
      const controls = withControls(state.controls, action.values);
      if (controls === state.controls) return state;
      // Taking the wheel switches the autopilot to Standby.
      if (controls.ctl_rudder !== state.controls.ctl_rudder && state.autopilot.mode !== 'off') {
        const autopilot: AutopilotState = { ...state.autopilot, mode: 'off', integralDeg: 0 };
        return { ...state, controls, autopilot, autopilotNoticeS: AUTOPILOT_NOTICE_S };
      }
      return { ...state, controls };
    }
    case 'setBoatMode': {
      if (state.boat.mode === action.mode) return state;
      const boat: BoatState =
        action.mode === 'held'
          ? {
              ...state.boat,
              mode: 'held',
              speedMps: 0,
              yawRateDegS: 0,
              swayMps: 0,
              heelDeg: 0,
              heelRateDegS: 0,
              roundUpS: 0,
              overpoweredS: 0,
            }
          : { ...state.boat, mode: 'sailing' };
      // A new run starts a new track; held still keeps the one drawn so far.
      return withTimeRule({
        ...state,
        boat,
        track: action.mode === 'sailing' ? [] : state.track,
      });
    }
    case 'autopilot': {
      const command = action.command;
      const windDirDeg = state.wind.dirDeg;
      let autopilot = state.autopilot;
      if (command === 'off') {
        if (autopilot.mode === 'off') return state;
        autopilot = { ...autopilot, mode: 'off', integralDeg: 0 };
      } else if (command === 'heading' || command === 'wind') {
        if (autopilot.mode === command) return state;
        autopilot = engageAutopilot(command, state.boat, windDirDeg);
      } else if (command === 'tack') {
        autopilot = tackAutopilot(autopilot, state.boat, windDirDeg);
      } else {
        autopilot = adjustAutopilot(autopilot, command.turnDeg);
      }
      return autopilot === state.autopilot ? state : { ...state, autopilot };
    }
    case 'engine': {
      const command = action.command;
      const engine = state.engine;
      if (command === 'start' || command === 'stop') {
        const running = command === 'start';
        return engine.running === running ? state : { ...state, engine: { ...engine, running } };
      }
      if (!Number.isFinite(command.leverPct)) return state;
      const leverPct = Math.max(-100, Math.min(100, Math.round(command.leverPct)));
      return leverPct === engine.leverPct ? state : { ...state, engine: { ...engine, leverPct } };
    }
    case 'setWindMode': {
      if (state.windMode.mode === action.mode) return state;
      const windMode = initialWindMode({
        mode: action.mode,
        seed: state.windMode.seed,
        startS: state.rig.timeS,
      });
      return withTimeRule({
        ...state,
        windMode,
        wind: windNow(state.controls, windMode, state.rig.timeS),
      });
    }
    case 'setWindSize': {
      const range = sizeRange(state.windMode.mode);
      if (!range || !Number.isFinite(action.size)) return state;
      const size = Math.min(range.max, Math.max(range.min, Math.round(action.size)));
      const windMode = { ...state.windMode, size, startS: state.rig.timeS };
      return { ...state, windMode, wind: windNow(state.controls, windMode, state.rig.timeS) };
    }
    case 'setSeaSetting': {
      if (!isSeaSetting(action.setting) || action.setting === state.sea.setting) return state;
      return withTimeRule({ ...state, sea: setSeaSetting(state.sea, action.setting) });
    }
    case 'setClock':
      return isClockTime(action.utcMs) && action.utcMs !== state.clock.utcMs
        ? { ...state, clock: { utcMs: action.utcMs } }
        : state;
    case 'setClockShown':
      return state.settings.clock === action.shown
        ? state
        : { ...state, settings: { ...state.settings, clock: action.shown } };
    case 'setMiniMap':
      return state.settings.miniMap === action.miniMap
        ? state
        : { ...state, settings: { ...state.settings, miniMap: action.miniMap } };
    case 'newWindPattern': {
      if (state.windMode.mode === 'steady') return state;
      const seed = isSeed(action.seed) ? action.seed : state.windMode.seed;
      const windMode = { ...state.windMode, seed, startS: state.rig.timeS };
      return { ...state, windMode, wind: windNow(state.controls, windMode, state.rig.timeS) };
    }
    case 'setTimeScale':
      if (
        !isTimeScale(action.scale) ||
        state.settings.timeScale === action.scale ||
        !timeSpeedAvailable(state.boat.mode, state.windMode.mode, state.settings.timeBar)
      ) {
        return state;
      }
      return { ...state, settings: { ...state.settings, timeScale: action.scale } };
    case 'setTimeBar':
      if (state.settings.timeBar === action.timeBar) return state;
      return withTimeRule({ ...state, settings: { ...state.settings, timeBar: action.timeBar } });
    case 'repairSails':
      return state.sailDamage.main === 0 && state.sailDamage.jib === 0
        ? state
        : { ...state, sailDamage: NO_DAMAGE };
    case 'realistic': {
      let realistic = reduceRealistic(state.realistic, action.action);
      // While paused nothing runs yet: shutting the clutch then is just preparing.
      if (state.paused && realistic.notice?.key === 'closedOnRunning') {
        realistic = { ...realistic, notice: null };
      }
      return realistic === state.realistic ? state : { ...state, realistic };
    }
    case 'setFenders':
      return action.out === state.harbour.fendersOut
        ? state
        : { ...state, harbour: { ...state.harbour, fendersOut: action.out } };
    case 'thruster': {
      if (state.thrusters[action.which] === action.dir) return state;
      return { ...state, thrusters: { ...state.thrusters, [action.which]: action.dir } };
    }
    case 'setPaused':
      return state.paused === action.paused ? state : { ...state, paused: action.paused };
    case 'load':
      // A link never changes the language of the page that is open (M23: changing it reloads).
      return {
        ...action.state,
        settings: { ...action.state.settings, language: state.settings.language },
      };
    case 'step': {
      // Paused: time stands still (dt = 0), but what was prepared is shown. The time speed-up
      // (M10) multiplies the step; the boat still substeps by `integration.maxStepS`.
      const frame = Math.min(MAX_STEP_S, Math.max(0, action.dt));
      const dt = state.paused ? 0 : frame * state.settings.timeScale;
      const sailing = state.boat.mode === 'sailing';
      // The true wind at the end of this step: the mean with the wind mode's pattern.
      const wind = windNow(state.controls, state.windMode, state.rig.timeS + dt);
      const patterned = state.windMode.mode !== 'steady';
      // The waves follow the wind slowly (M14); paused (dt = 0) they stay the same object.
      const sea = stepSea(state.sea, wind, dt);
      const trains = waveTrains(sea);
      // The clock runs with the simulated time: ×16 is 16 times faster, paused it stands still.
      const clock = dt === 0 ? state.clock : { utcMs: state.clock.utcMs + dt * 1000 };
      let controls = state.controls;
      let autopilot = state.autopilot;
      // The autopilot moves the wheel's target (not through setControls: it must not switch
      // itself off).
      // Going astern the rudder turns her the other way, so a heading hold would turn her away:
      // it does not steer then (decided in the M12 PR).
      if (sailing && autopilot.mode !== 'off' && state.boat.speedMps >= 0) {
        const steered = stepAutopilot(autopilot, state.boat, wind.dirDeg, controls.ctl_rudder, dt);
        autopilot = steered.autopilot;
        controls = withControls(controls, { ctl_rudder: steered.rudderTargetDeg });
      }
      // Realistic mode: the clutches, winches and hands move the ropes, then the rig follows.
      const realistic = state.settings.ropesMode === 'realistic';
      let realisticState = state.realistic;
      if (realistic) {
        const moved = stepRealistic(state.realistic, controls, state.rig, dt);
        controls = withControls(controls, moved.values);
        realisticState = moved.state;
      }
      // The engine runs in Held still too (the boat just does not move).
      const engine = stepEngine(state.engine, dt);
      const rig = step({ controls, rig: state.rig }, dt, motionOf(state.boat), undefined, {
        instantRopes: realistic,
        wind: patterned ? wind : undefined,
        damage: state.sailDamage,
      });
      const moving = stepBoat(
        state.boat,
        {
          windDirDeg: wind.dirDeg,
          twsKn: wind.twsKn,
          rudderDeg: rig.applied.rudder,
          rig,
          controls,
          engineThrustN: engineThrustN(engine),
          damage: state.sailDamage,
          trains,
          rudderLimitDeg:
            autopilot.mode === 'off' ? undefined : boatData.physics.autopilot.maxRudderDeg,
          // Open-water sailing does no extra work: the hook is built only while a thruster runs.
          external:
            state.thrusters.bow !== 0 || state.thrusters.stern !== 0
              ? harbourForces({ thrusters: state.thrusters })
              : undefined,
        },
        dt,
      );
      return {
        ...state,
        controls,
        rig,
        realistic: realisticState,
        boat: moving.boat,
        autopilot,
        motion: moving.report,
        wind,
        autopilotNoticeS: Math.max(0, state.autopilotNoticeS - frame),
        track: sailing ? appendTrack(state.track, moving.boat, rig.timeS) : state.track,
        sailDamage: floggingDamage(state.sailDamage, rig, dt),
        engine,
        sea,
        clock,
      };
    }
  }
}

export type Listener = (state: AppState, previous: AppState) => void;

export interface Store {
  getState(): AppState;
  dispatch(action: Action): void;
  subscribe(listener: Listener): () => void;
}

export function createStore(initial: AppState): Store {
  let state = initial;
  const listeners = new Set<Listener>();
  return {
    getState: () => state,
    dispatch(action) {
      const previous = state;
      state = reduce(state, action);
      if (state !== previous) listeners.forEach((listener) => listener(state, previous));
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
