import type { AppState } from '../app/store';
import { area } from '../model/area';
import { boat } from '../model/boat';
import { daylight } from '../model/clock';
import { sunPosition } from '../model/sun';
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

/** The ropes whose movement the unseen electric winches of Easy ropes follow (AppliedControls, in %). */
const EASY_KEYS = ['mainsheet', 'vang', 'toppingLift', 'mainFurl', 'jibSheet', 'jibFurl'] as const;

/**
 * `previous` is for the events (a start, a new contact report, a cut-out, the anchor) and for what
 * moves (Easy ropes, the chain); `dtS` is the frame's real seconds.
 */
export function soundTargets(
  state: AppState,
  previous: AppState,
  prefs: SoundPrefs,
  dtS: number,
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

  // Winches and ropes (M89): by the ropes mode; the other mode's branch is silent.
  const events: SoundEvent[] = [];
  const gear = data.winchClicks;
  if (state.settings.ropesMode === 'realistic') {
    const winches = Object.entries(state.realistic.winches);
    const m = data.winchMotor;
    // Motor: the working winch whose drum turns fastest (a stalled drum still hums at baseHz).
    let best: (typeof winches)[number][1] | undefined;
    for (const [, w] of winches)
      if (w.button && !w.cutOut && (!best || Math.abs(w.drumSpeed) > Math.abs(best.drumSpeed)))
        best = w;
    if (best) {
      const x = clamp01(Math.abs(best.drumSpeed) / m.refSpeedMps);
      voices.winchMotor = {
        gain: m.gain,
        hz: (m.baseHz + m.speedHz * x) * (1 - m.strainDrop * clamp01(best.strain ?? 0)),
        rate: 0,
      };
    }
    // Clicks: the pawls click only when a drum turns the hauling way; the handle at the gearbox clicks too.
    const hr = state.realistic.handleReport;
    const drumRate = Math.min(
      gear.maxRate,
      winches.reduce((sum, [, w]) => sum + Math.max(0, w.drumSpeed), 0) * gear.perMetre,
    );
    const rate = Math.min(
      gear.maxRate,
      drumRate + (hr?.at === 'gearbox' ? Math.abs(hr.turnsPerS) * gear.gearboxPerTurn : 0),
    );
    voices.winchClicks = { gain: rate > 0 ? gear.gain : 0, hz: 0, rate };
    // A rope running or easing out with a hiss.
    const rr = data.ropeRun;
    let fastest = 0;
    for (const report of Object.values(state.realistic.reports))
      if (report.motion === 'running' || report.motion === 'easing')
        fastest = Math.max(fastest, Math.abs(report.speedMps));
    const x = clamp01(fastest / rr.refSpeedMps);
    voices.ropeRun = { gain: rr.gain * x, hz: rr.lowHz + (rr.highHz - rr.lowHz) * x, rate: 0 };
    for (const [key, w] of winches)
      if (w.cutOut && previous.realistic.winches[key]?.cutOut === false)
        events.push({ kind: 'cutOut' });
  } else if (state.settings.ropesMode === 'easy') {
    // The electric winches are unseen: they follow how fast the controls move (real seconds, so Pause is silent).
    let moved = 0;
    for (const key of EASY_KEYS)
      moved += Math.abs(state.rig.applied[key] - previous.rig.applied[key]);
    const movePct = dtS > 0 ? moved / dtS : 0;
    const x = clamp01(movePct / data.easyRopes.refPctPerS);
    const m = data.winchMotor;
    voices.winchMotor = { gain: m.gain * x, hz: m.baseHz + m.speedHz * x, rate: 0 };
    const rate = Math.min(gear.maxRate, movePct * data.easyRopes.clicksPerPct);
    voices.winchClicks = { gain: rate > 0 ? gear.gain : 0, hz: 0, rate };
  }

  // The anchor windlass and its chain (both ropes modes).
  const a = state.anchor;
  const wl = data.windlass;
  voices.windlass = {
    gain: a.windlass !== 'off' && !a.cutOut ? wl.gain : 0,
    hz: a.windlass === 'up' ? wl.upHz : wl.downHz,
    rate: 0,
  };
  const ch = data.chain;
  const chainRate = Math.min(
    ch.maxRate,
    (dtS > 0 ? Math.abs(a.chainOutM - previous.anchor.chainOutM) / dtS : 0) * ch.perMetre,
  );
  voices.chain = { gain: chainRate > 0 ? ch.gain : 0, hz: 0, rate: chainRate };
  if (previous.anchor.phase === 'stowed' && a.phase !== 'stowed')
    events.push({ kind: 'anchorDown' });
  else if (previous.anchor.phase !== 'stowed' && a.phase === 'stowed')
    events.push({ kind: 'anchorUp' });

  // The thrusters hum while held.
  const th = data.thruster;
  if (state.thrusters.bow !== 0) voices.thrusterBow = { gain: th.gain, hz: th.bowHz, rate: 0 };
  if (state.thrusters.stern !== 0)
    voices.thrusterStern = { gain: th.gain, hz: th.sternHz, rate: 0 };

  // The marina and the birds (M90): rates are calls per second, gain is the peak of one call.
  const place = state.harbour.place;
  const tws = state.wind.twsKn;
  const ha = data.halyards;
  const haRate =
    place === 'marina' ? (ha.baseRate + ha.perKnRate * tws) * ha.traffic[state.harbour.traffic] : 0;
  voices.halyards = { gain: haRate > 0 ? ha.gain : 0, hz: 0, rate: haRate };
  const la = data.lapping;
  const share = la.place[place];
  voices.lapping = {
    gain: la.gain * share,
    hz: la.lowpassHz,
    rate: share > 0 ? la.rate : 0,
  };
  const { latitudeDeg, longitudeDeg } = area.position;
  const light =
    data.birdLight[
      daylight(sunPosition(state.clock.utcMs, latitudeDeg, longitudeDeg).elevationDeg)
    ];
  const windShare = tws > data.birdWind.fromKn ? data.birdWind.share : 1;
  const gu = data.gulls;
  const guRate = (gu.perMinute[place] / 60) * light * windShare;
  voices.gulls = { gain: guRate > 0 ? gu.gain[place] : 0, hz: 0, rate: guRate };
  const sb = data.smallBirds;
  const sbRate = (sb.perMinute[place] / 60) * light * windShare;
  voices.smallBirds = { gain: sbRate > 0 ? sb.gain : 0, hz: 0, rate: sbRate };

  // Events: a start, and a new contact report.
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
