import type { AppState } from '../app/store';
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
  return event;
}

/**
 * `previous` and `dtS` are for the event voices of M88 and later; M87 has none, so they are unused.
 */
export function soundTargets(
  state: AppState,
  _previous: AppState,
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

  return { groups, voices, events: [] };
}
