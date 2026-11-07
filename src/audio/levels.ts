import type { AppState } from '../app/store';
import { boat } from '../model/boat';
import { trimState, type SailName } from '../model/trim';
import { fetchKm, seaSize, significantHeightM, waveTrains } from '../model/waves';
import { SOUND, type SoundData } from './soundData';
import {
  VOICE_IDS,
  type SoundEvent,
  type SoundGroup,
  type SoundPrefs,
  type SoundTargets,
  type VoiceId,
  type VoiceTarget,
} from './types';

/**
 * What every voice should do now, from the app's state (PHASE_AUDIO_SPEC 3.4, 6.3). Pure: no DOM,
 * no Web Audio. The engine moves the Web Audio parameters towards these values every frame.
 */

/** Metres per second to knots (the sound only needs the unit; the boat's own conversion is in the model). */
const MPS_TO_KN = 1.943844;

export function clamp01(x: number): number {
  return Number.isNaN(x) ? 0 : Math.min(1, Math.max(0, x));
}

export function ramp(x: number, a: number, b: number): number {
  return clamp01((x - a) / (b - a));
}

const silent = (): VoiceTarget => ({ gain: 0, hz: 0, rate: 0 });

/** The name the probe records for an event (M88: its `kind`, and `contact:<severity>` for a contact). */
export function eventName(event: SoundEvent): string {
  return event.kind === 'contact' ? `contact:${event.severity}` : event.kind;
}

/**
 * `previous` is for the events (a start, a new contact report); `dtS` is for the voices of later
 * milestones and is unused so far.
 */
export function soundTargets(
  state: AppState,
  previous: AppState,
  prefs: SoundPrefs,
  _dtS: number,
  data: SoundData = SOUND,
): SoundTargets {
  const master = data.master;
  const groups = {} as Record<SoundGroup, number>;
  for (const g of ['music', 'surroundings', 'boat'] as const) {
    const pause =
      g === 'boat'
        ? state.paused
          ? 0
          : 1
        : g === 'surroundings'
          ? state.paused
            ? master.pausedSurroundings
            : 1
          : 1;
    groups[g] = prefs.on && prefs[g] ? ((master.groupGain[g] * prefs.volume) / 100) * pause : 0;
  }

  const voices = {} as Record<VoiceId, VoiceTarget>;
  for (const id of VOICE_IDS) voices[id] = silent();

  // Wind: the apparent wind at the boat (it includes the gust).
  const aws = state.rig.wind.awsKn;
  const w = data.wind;
  const windLevel = ramp(aws, w.minKn, w.maxKn) ** w.curve;
  voices.wind = {
    gain: w.gain * windLevel,
    hz: w.lowHz + (w.highHz - w.lowHz) * windLevel,
    rate: w.flutterHz,
  };

  // Whistle: the rigging singing in strong wind.
  const s = data.whistle;
  const whistleLevel = ramp(aws, s.fromKn, s.toKn);
  voices.whistle = {
    gain: s.gain * whistleLevel,
    hz: s.lowHz + (s.highHz - s.lowHz) * whistleLevel,
    rate: 0,
  };

  // Waves: louder with the significant height; the swell follows the period.
  const v = data.waves;
  const hs = significantHeightM(waveTrains(state.sea));
  const periodS = seaSize(state.sea.windKn, fetchKm(state.sea.setting)).periodS;
  const waveLevel = Math.max(v.floor, Math.min(1, Math.sqrt(hs / v.refHeightM)));
  voices.waves = { gain: v.gain * waveLevel, hz: v.lowpassHz, rate: 1 / periodS };

  // Hull: the water along the hull. Paused: the boat stands still on the screen.
  const hu = data.hull;
  const kn = Math.abs(state.boat.speedMps) * MPS_TO_KN;
  const hullLevel = state.paused ? 0 : ramp(kn, 0, hu.maxKn);
  voices.hull = {
    gain: hu.gain * hullLevel,
    hz: hu.lowHz + (hu.highHz - hu.lowHz) * hullLevel,
    rate: 0,
  };

  // Sails (M88): flap while luffing, a soft rush while full.
  const sails: readonly [SailName, VoiceId, VoiceId][] = [
    ['main', 'flapMain', 'fullMain'],
    ['jib', 'flapJib', 'fullJib'],
  ];
  const windRamp = (a: number, b: number): number => ramp(aws, a, b);
  for (const [sail, flapId, fullId] of sails) {
    const ts = trimState(sail, state.rig, state.rig.wind.awaDeg);
    const share =
      sail === 'main' ? state.rig.applied.mainFurl / 100 : state.rig.jibSolution.unfurled;
    if (ts === 'luffing') {
      const f = data.flap;
      voices[flapId] = {
        gain: f.gain * windRamp(f.fromKn, f.toKn) * share,
        hz: f.bandHz,
        rate: f.baseHz + f.perKnHz * aws,
      };
    } else if (ts === 'good' || ts === 'stalled' || ts === 'pushed') {
      const f = data.full;
      voices[fullId] = { gain: f.gain * windRamp(f.fromKn, f.toKn) * share, hz: f.bandHz, rate: 0 };
    }
  }

  // Engine (M88): the pitch follows the revs; idle and top revs come from the boat in use.
  const { running, rpm } = state.engine;
  const en = data.engine;
  const { idleRpm, maxRpm } = boat.physics.engine;
  const r = ramp(rpm, idleRpm, maxRpm);
  voices.engine = {
    gain: running
      ? en.gain * (en.idleShare + (1 - en.idleShare) * r)
      : en.gain * en.idleShare * clamp01(rpm / idleRpm),
    hz: (rpm / 60) * en.firesPerRev,
    rate: 0,
  };

  // Events: a start, and a new contact report.
  const events: SoundEvent[] = [];
  if (state.engine.running && !previous.engine.running) events.push({ kind: 'engineStart' });
  const report = state.contact.reports[0];
  if (
    report &&
    report.obstacleId !== 'propeller' &&
    !previous.contact.reports.some(
      (p) => p.atS === report.atS && p.obstacleId === report.obstacleId && p.part === report.part,
    )
  )
    events.push({ kind: 'contact', severity: report.severity });

  return { groups, voices, events };
}
