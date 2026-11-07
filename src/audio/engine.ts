import type { Store } from '../app/store';
import { mulberry32 } from '../model/random';
import { boatVoices, playEvent as playBoatEvent, type BoatEvent } from './boatVoices';
import { gearVoices, playEvent as playGearEvent, type GearEvent } from './gearVoices';
import { eventName, soundTargets } from './levels';
import { noiseBuffer } from './noise';
import { getSoundPrefs, onSoundPrefs } from './prefs';
import { poissonTimes, pulses } from './pulses';
import { SOUND } from './soundData';
import { surroundingsVoices } from './surroundingsVoices';
import { audioContextClass, soundSupported } from './support';
import {
  VOICE_GROUP,
  VOICE_IDS,
  VOICE_KIND,
  PROBE_NAME,
  type SoundGroup,
  type SoundTargets,
  type VoiceId,
} from './types';
import { oneShots, smoothTo, type Voice, type VoiceFactory } from './voice';

/**
 * The sound engine (PHASE_AUDIO_SPEC 4.2): creates the Web Audio graph in the first tap or key
 * press after Sound is switched on, and every frame moves the voices towards what `soundTargets`
 * says. Never imported by tests (no `AudioContext` in node).
 */

export interface SoundEngine {
  /** Called by app.ts once per frame, after drawing, with the frame's real seconds. */
  frame(realDtS: number): void;
  /** True when this browser has Web Audio. */
  readonly supported: boolean;
}

interface SoundProbe {
  context(): 'none' | AudioContextState;
  targets(): SoundTargets | null;
  events(): string[];
}

const GROUPS: readonly SoundGroup[] = ['music', 'surroundings', 'boat'];
const PROBE_KEEP = 50;
/** The voice files; the later milestones add theirs (boatVoices, gearVoices, placeVoices). */
const FACTORIES: Partial<Record<VoiceId, VoiceFactory>> = {
  ...surroundingsVoices,
  ...boatVoices,
  ...gearVoices,
};

/**
 * The events a browser accepts as "the learner did something" for starting sound. A finger touching
 * down (`pointerdown`, `touchstart`) does not count on a phone, the finger lifting does (`pointerup`,
 * `touchend`); a mouse press and a key press count (M87 review).
 */
const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'keydown'] as const;

const hidden = (): boolean => document.visibilityState === 'hidden';

export function createSoundEngine(store: Store): SoundEngine {
  const supported = soundSupported();
  const recorded: string[] = [];
  let ctx: AudioContext | undefined;
  let groupNodes: Record<SoundGroup, GainNode> | undefined;
  let noise: AudioBuffer | undefined;
  const voices = new Map<VoiceId, Voice>();
  const rngs = new Map<VoiceId, () => number>();
  const phases = new Map<VoiceId, number>();
  let previous = store.getState();
  let latest: SoundTargets | null = null;
  let failed = false;
  let listening = false;

  const record = (name: string): void => {
    recorded.push(name);
    if (recorded.length > PROBE_KEEP) recorded.shift();
  };

  // The check hook: always set, changes nothing (PHASE_AUDIO_SPEC 4.2).
  const probe: SoundProbe = {
    context: () => (ctx ? ctx.state : 'none'),
    targets: () => latest,
    events: () => [...recorded],
  };
  (window as unknown as { __sailSound?: SoundProbe }).__sailSound = probe;

  function build(context: AudioContext): void {
    const master = context.createGain();
    master.gain.value = 1;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.01;
    compressor.release.value = 0.25;
    compressor.connect(master).connect(context.destination);
    const nodes = {} as Record<SoundGroup, GainNode>;
    for (const g of GROUPS) {
      const node = context.createGain();
      node.gain.value = 0;
      node.connect(compressor);
      nodes[g] = node;
    }
    groupNodes = nodes;
    noise = noiseBuffer(context);
    for (const id of VOICE_IDS) {
      const factory = FACTORIES[id];
      if (!factory) continue;
      voices.set(id, factory(context, nodes[VOICE_GROUP[id]], noise, SOUND, id));
      rngs.set(id, mulberry32(SOUND.master.noiseSeed + VOICE_IDS.indexOf(id)));
      phases.set(id, 0);
    }
  }

  /** Create or resume the context. Only called from a tap, a key press, a setting change made in one, or the page coming back. */
  function start(): void {
    const prefs = getSoundPrefs();
    if (!prefs.on || !supported || failed || hidden()) return;
    try {
      if (!ctx) {
        const Context = audioContextClass();
        if (!Context) return;
        ctx = new Context();
        ctx.addEventListener('statechange', syncListeners);
        build(ctx);
      }
      if (ctx.state !== 'running') void ctx.resume().catch(() => undefined);
    } catch (error) {
      failed = true;
      console.error(error);
    }
    syncListeners();
  }

  function stop(): void {
    if (ctx && ctx.state === 'running') void ctx.suspend().catch(() => undefined);
  }

  // A tap or key press anywhere starts the sound again when it was left on (browsers allow sound only then).
  const onGesture = (): void => start();
  function syncListeners(): void {
    const want = getSoundPrefs().on && supported && !failed && (!ctx || ctx.state !== 'running');
    if (want === listening) return;
    listening = want;
    const method = want ? 'addEventListener' : 'removeEventListener';
    for (const type of GESTURES) document[method](type, onGesture, true);
  }

  if (supported) {
    onSoundPrefs((prefs) => {
      if (prefs.on) start();
      else stop();
      syncListeners();
    });
    document.addEventListener('visibilitychange', () => {
      if (hidden()) stop();
      else if (getSoundPrefs().on && ctx) void ctx.resume().catch(() => undefined);
    });
    syncListeners();
  }

  function run(realDtS: number): void {
    if (!ctx || !groupNodes) return;
    const state = store.getState();
    const dt = Math.min(0.1, Math.max(0, realDtS));
    const targets = soundTargets(state, previous, getSoundPrefs(), dt);
    latest = targets;
    previous = state;
    const t = SOUND.master.smoothingS;
    for (const g of GROUPS) smoothTo(groupNodes[g].gain, targets.groups[g], ctx, t);
    const now = ctx.currentTime + SOUND.master.lookaheadS;
    for (const [id, voice] of voices) {
      const target = targets.voices[id];
      const kind = VOICE_KIND[id];
      if (kind === 'continuous') {
        voice.set(target);
      } else if (kind === 'pulse') {
        let rate = target.rate;
        const jitter = jitterOf(id);
        const rng = rngs.get(id);
        if (!rng) continue;
        if (jitter > 0) rate *= 1 + jitter * (2 * rng() - 1);
        const result = pulses(phases.get(id) ?? 0, rate, dt);
        phases.set(id, result.phase);
        voice.set(target);
        for (const offset of result.offsetsS) voice.fire?.(now + offset, target, rng);
      } else {
        voice.set(target);
        const rng = rngs.get(id);
        if (!rng) continue;
        const name = PROBE_NAME[id];
        for (const offset of poissonTimes(rng, target.rate, dt)) {
          if (oneShots.active >= SOUND.master.maxOneShots) continue;
          voice.fire?.(now + offset, target, rng);
          if (name) record(name);
        }
      }
    }
    // Events are played by the voice file that owns them, into the boat bus; one past the cap is dropped.
    for (const event of targets.events) {
      if (oneShots.active >= SOUND.master.maxOneShots || !noise) continue;
      if (event.kind === 'cutOut' || event.kind === 'anchorDown' || event.kind === 'anchorUp')
        playGearEvent(ctx, groupNodes.boat, noise, event satisfies GearEvent, SOUND);
      else playBoatEvent(ctx, groupNodes.boat, noise, event satisfies BoatEvent, SOUND);
      record(eventName(event));
    }
  }

  return {
    supported,
    frame(realDtS) {
      if (!ctx || ctx.state !== 'running' || failed) {
        previous = store.getState();
        return;
      }
      try {
        run(realDtS);
      } catch (error) {
        // Said once; the sound stops and the app keeps running.
        console.error(error);
        failed = true;
        stop();
      }
    },
  };
}

/** A pulse voice's `jitter` (the two flaps share `flap.jitter`), 0 for the others. */
function jitterOf(id: VoiceId): number {
  return id === 'flapMain' || id === 'flapJib' ? SOUND.flap.jitter : 0;
}
