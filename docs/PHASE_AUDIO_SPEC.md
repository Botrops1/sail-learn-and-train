# Sound: wind, waves, the boat, the surroundings and music (M87–M91)

Extra milestones for issue #155 (background audio), planned with the owner on 2026-11-07 (`/plan issue 155`; owner: "accept all", plus bird sounds and a sound button over the 3D view on a computer). Every sound is made by the app in the browser with the Web Audio API: no sound files, no samples, nothing to license, nothing more to download. Sound is **off** until the learner switches it on; then wind, waves, the boat and the surroundings follow what the app shows, and a quiet generated music plays under them.

## 0. How to use this spec (for the coding agent)

- Do **one milestone** per PR, titled `M<N>: <name>`, in order **M87 → M88 → M89 → M90 → M91**, each after the one before is merged. Every milestone needs M87 (the sound engine, the settings and the data file).
- Read sections 0–5 of this file, then your milestone's section. Do not read the other milestone sections.
- Build order inside a milestone: data → pure helpers + tests → audio voices → UI → browser checks → docs.
- **Numbers are final.** Every number in `content/audio/sounds.json` (verbatim in each milestone's section) is **tunable**: change one only when the owner's phone check or a browser check shows it is wrong, and say before and after in the PR. Never write a sound number in code: the formulas read the data file.
- **Text is data.** Every English string here is final: copy it exactly. Russian strings are AI drafts (CLAUDE.md): write them yourself following PHASE4_SPEC 3.3, and run `npm run review-doc -- ru` after any change to `content/lang/ru/*.json`.
- **Names are required.** File names, function names, signatures, types, `data-testid`s, voice ids, event names and storage keys named here are required, so milestones fit together. Add private helpers freely.
- **Write back.** If you decide something this spec leaves open, write it into your milestone's section under "Decided in the M<N> PR".
- **Everything earlier keeps working.** Every unit test, PHYSICS_TRUTHS test and browser check stays green; every old link opens as before. **No sailing physics changes, no `AppState` change, no URL change** anywhere in this spec: sound only reads the state.
- **The PRs say `Part of #155`**; M91's PR says `Closes #155`.

## 1. Goal

A learner who switches Sound on hears the boat's world: wind that rises with the wind speed and swells in gusts, waves whose wash grows with the sea, water along the hull as the boat speeds up (M87); sails flapping when they luff and a soft rush when they are full, the engine whose pitch follows the revs, a thump when the hull touches something (M88); winches (motor hum, ratchet clicks), a rope running out, the anchor windlass and chain, the thrusters (M89); in the marina halyards tapping on masts and water lapping, and birds by day: gulls everywhere, small birds near land (M90); and a calm, never-repeating music (M91). Settings has one Sound block: Sound on/off, Music, Surroundings, Boat sounds and Volume; on a computer a speaker button over the 3D view switches Sound on and off (M87).

## 2. Scope

### In scope

- The sound engine (`src/audio/`), the device setting (stored in `localStorage`, never in the link), the Settings block and the computer's speaker chip (M87).
- The voices listed in each milestone's section, all generated (noise through filters, oscillators, short envelopes).
- Behaviour on Pause (boat sounds stop, surroundings at half, music goes on), when the tab or app is hidden (everything stops), at ×4 and ×16 (sounds play at normal speed).

### Out of scope

- **Rain** (owner, 2026-11-07): the app has no rain to show; it comes with a later weather phase.
- Recorded samples (owner: generated only; a sound that turns out badly can be swapped for a public-domain recording later, one at a time, in its own PR).
- Sound that changes with where the camera is (the learner is always "on board": the same sound from every view and on the map).
- Spoken hints, alarm beeps (the anchor alarm and the alerts stay visual), vibration.
- A speaker button on a phone (owner: the phone's chip row is full; Settings only).
- Sound in the setup file (M56): the sound setting stays on the device, like the folded time bar.

## 3. Conventions and shared helpers

### 3.1 Conventions

- **Units.** Gains are linear 0–1 (1 = full scale of the voice). Frequencies in Hz. Rates in events (pulses) per second. Times in seconds. Wind in knots, boat speed converted from m/s with `1.943844`.
- **Two halves.** `src/audio/levels.ts` (and the other files marked *pure* below) are pure TypeScript: no DOM, no Web Audio, testable in Vitest's node environment; they may import `src/model` and `import type` from `src/app/store`. Everything that touches `AudioContext` is in `src/audio/engine.ts` and the voice files, which are never imported by tests.
- **One way to drive a voice.** Every frame, `soundTargets` (pure) returns for each voice a `VoiceTarget { gain, hz, rate }`; the engine moves each Web Audio parameter towards it with `param.setTargetAtTime(value, ctx.currentTime, data.master.smoothingS)`, and only when the value changed by more than 0.5 % (a gain step of 0.005, a frequency or rate change of 0.5 %), so the automation list does not grow every frame. One-shot sounds (a thump, a click, a gull) are `SoundEvent`s, pulses or Poisson calls scheduled by the engine; 3.6 is the contract every voice follows.
- **The frame's real time.** The engine is driven with the frame's real seconds (`raw` in `app.ts`, capped at 0.1 s), not the simulation's `dt`: on Pause the wind still blows; at ×16 a click is still a click.
- **Randomness** (gulls, halyard taps, music notes, flap jitter) comes from `mulberry32` (`src/model/random.ts`), never `Math.random`, so a browser check sees the same sequence: one generator per voice, `mulberry32(data.master.noiseSeed + VOICE_IDS.indexOf(id))`, made when the voice is built; the music has its own (`mulberry32(data.music.seed)`, M91).
- **Storage.** The key is `sail-learn.sound` (JSON); every read and write is wrapped in `try`/`catch` through `globalThis.localStorage?.`, as `src/ui/timeBar.ts` does. A browser that blocks storage plays sound for the visit and starts silent on the next. The visibility test reads `document.visibilityState` (not `document.hidden`).
- **Autoplay rule.** Browsers let a page start sound only inside a tap or key press. The `AudioContext` is created (or resumed) only in such a handler: the Sound switch, the speaker chip, or, when Sound was left on, the first `pointerdown`, `pointerup`, `touchend` or `keydown` anywhere on the page (M87 review: a finger touching down does not count as a tap on a phone, the finger lifting does). Until then nothing plays, and nothing says so (the switch shows On).
- **iPhone silent switch.** Safari mutes Web Audio while the ring/silent switch is on silent. The app does not override it (no `navigator.audioSession`): the owner's checklists say so.

### 3.2 Shared helpers (new, M87)

| Name | File | Signature | Behaviour |
|---|---|---|---|
| `SOUND` | `src/audio/soundData.ts` (pure) | `const SOUND: SoundData` | `content/audio/sounds.json`, typed (the type grows each milestone) |
| `DEFAULT_SOUND_PREFS` | `src/audio/prefs.ts` (pure) | `SoundPrefs` | `{ on: false, music: true, surroundings: true, boat: true, volume: 50, musicVolume: 100, surroundingsVolume: 100, boatVolume: 100 }` (volume 70 and no group volumes until the M91 PR, owner request) |
| `parseSoundPrefs` | `src/audio/prefs.ts` | `(text: string \| null) => SoundPrefs` | JSON → prefs; each missing or wrong-typed field takes its default; `volume` rounded and clamped to 0–100; bad JSON → defaults |
| `getSoundPrefs` | `src/audio/prefs.ts` | `() => SoundPrefs` | The prefs now (read from storage once, on first call) |
| `setSoundPrefs` | `src/audio/prefs.ts` | `(patch: Partial<SoundPrefs>) => SoundPrefs` | Merges, clamps, writes storage, then calls every listener **synchronously** (so the engine can start inside the same tap) |
| `onSoundPrefs` | `src/audio/prefs.ts` | `(listener: (prefs: SoundPrefs) => void) => () => void` | Subscribe; returns the unsubscribe |
| `soundTargets` | `src/audio/levels.ts` (pure) | `(state: AppState, previous: AppState, prefs: SoundPrefs, dtS: number, data: SoundData = SOUND) => SoundTargets` | 3.4 and each milestone; boat values (engine rpm) come from the `boat` in use (`src/model/boat.ts`) |
| `soundSupported`, `audioContextClass` | `src/audio/support.ts` | `() => boolean`, `() => typeof AudioContext \| undefined` | `globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext`; supported = that is a function |
| `pulses` | `src/audio/pulses.ts` (pure) | `(phase: number, ratePerS: number, dtS: number) => { offsetsS: number[]; phase: number }` | 3.4 |
| `poissonTimes` | `src/audio/pulses.ts` (pure) | `(rng: () => number, ratePerS: number, dtS: number) => number[]` | 3.4 |
| `createSoundEngine` | `src/audio/engine.ts` | `(store: Store) => SoundEngine` | 4.2 |

```ts
// src/audio/types.ts (pure; levels.ts, prefs.ts and soundData.ts import from here, so there is no import cycle)
export type SoundGroup = 'music' | 'surroundings' | 'boat';
export interface SoundPrefs { on: boolean; music: boolean; surroundings: boolean; boat: boolean; volume: number; musicVolume: number; surroundingsVolume: number; boatVolume: number } // the last three: M91 PR, owner request
export interface VoiceTarget { gain: number; hz: number; rate: number } // unused fields are 0
export const VOICE_IDS = ['wind', 'whistle', 'waves', 'hull'] as const; // M88–M90 append theirs, in their order
export type VoiceId = (typeof VOICE_IDS)[number];
export type VoiceKind = 'continuous' | 'pulse' | 'poisson';
export type SoundEvent = never; // M88 makes it a union of objects with `kind`
export interface SoundTargets {
  groups: Record<SoundGroup, number>;
  voices: Record<VoiceId, VoiceTarget>;
  events: SoundEvent[];
}
export const VOICE_GROUP: Record<VoiceId, SoundGroup>; // which bus each voice plays through
export const VOICE_KIND: Record<VoiceId, VoiceKind>;   // how the engine drives it (3.6)
export const PROBE_NAME: Partial<Record<VoiceId, string>>; // Poisson voices whose calls the probe records (M90: gulls → 'gull', smallBirds → 'chirp')
```

M87: `VOICE_GROUP` = all four `surroundings`; `VOICE_KIND` = all four `continuous`; `PROBE_NAME` = `{}`. `levels.ts` also exports `eventName(event: SoundEvent): string` (M88: the event's `kind`, and `contact:<severity>` for a contact). `SoundData` (in `soundData.ts`) types the maps by these unions, e.g. `groupGain: Record<SoundGroup, number>`, `contact.gain: Record<Severity, number>`.

### 3.3 Sources

- Web Audio API: MDN "Web Audio API", "AudioContext" (`resume`, `suspend`, `state`), "AudioParam.setTargetAtTime", "BiquadFilterNode", "AudioBufferSourceNode" (`loop`), "Autoplay guide for media and Web Audio APIs" (a context starts only from a user gesture).
- Page Visibility: MDN "Document: visibilitychange event".
- iOS: WebKit's notes on Web Audio and the ring/silent switch (Safari 16.4 release notes, `navigator.audioSession`; not used, 3.1).
- Sound design facts used as assumptions (no copied text): a four-stroke engine fires once every two turns per cylinder, so a 4-cylinder engine fires twice per turn (`firesPerRev`); a winch's pawls click as the drum turns in the hauling direction; an anchor chain rattles once per link over the gypsy. The engine's cylinder count is an assumption (`docs/BOAT_REFERENCE.md`, M88).

### 3.4 Shared formulas (M87)

- `clamp01(x) = min(1, max(0, NaN-safe x))` (`NaN` → 0); `ramp(x, a, b) = clamp01((x − a) / (b − a))`.
- **Groups:** `groups[g] = prefs.on && prefs[g] ? data.master.groupGain[g] · prefs.volume / 100 · prefs[g + 'Volume'] / 100 · pause(g) : 0` (the group volume factor: M91 PR, owner request), where `pause('boat') = state.paused ? 0 : 1`, `pause('surroundings') = state.paused ? data.master.pausedSurroundings : 1`, `pause('music') = 1`.
- When `prefs.on` is false, `soundTargets` still returns every voice (the engine is suspended anyway); tests call it with `on: true`.
- **`pulses(phase, rate, dtS)`:** `p = phase + rate · dtS`; one offset for every whole number crossed: for `k = 1 … floor(p)`, `offsetsS.push((k − phase) / rate)`; returns `phase: p − floor(p)`. `rate ≤ 0` or `dtS ≤ 0` → `{ offsetsS: [], phase }`. At most 40 offsets (a cap; the rest are dropped, the phase still advances).
- **`poissonTimes(rng, rate, dtS)`:** events of a Poisson process within the frame: `t = −ln(1 − rng()) / rate`; while `t < dtS`, push `t` and add another `−ln(1 − rng()) / rate`. `rate ≤ 0` → `[]`. At most 8.
- The engine schedules a pulse or event at `ctx.currentTime + data.master.lookaheadS + offset`.

### 3.6 Voices: the contract (M87 builds it; every later voice follows it)

```ts
// src/audio/voice.ts (Web Audio)
export interface Voice {
  /** Every running frame, with the voice's target (all kinds). */
  set(target: VoiceTarget): void;
  /** Pulse and Poisson voices: one burst or call starting at `at` (context time). */
  fire?(at: number, target: VoiceTarget, rng: () => number): void;
}
export type VoiceFactory = (ctx: AudioContext, out: AudioNode, noise: AudioBuffer, data: SoundData, id: VoiceId) => Voice;
/**
 * Moves `param` to `value` with setTargetAtTime(value, now, timeS), unless |value − last| ≤ 0.005 · max(1, |last|),
 * where `last` is the value this function last set on that param (a module-level WeakMap<AudioParam, number>;
 * AudioParam.value does not show automation). So a gain moves in steps of at least 0.005, a frequency or rate by at least 0.5 %.
 */
export function smoothTo(param: AudioParam, value: number, ctx: AudioContext, timeS: number): void;
/** The one envelope of the app: 0 at `at`, linear to `peak` by `at + attackS`, then setTargetAtTime(0, at + attackS, decayS / 3). */
export function burst(param: AudioParam, at: number, peak: number, attackS: number, decayS: number): void;
```

- Each voice file exports one map, `surroundingsVoices`, `boatVoices`, `gearVoices`, `placeVoices: Partial<Record<VoiceId, VoiceFactory>>`; the engine merges them when it builds the graph (`out` = the voice's group bus) and skips an id with no factory.
- The factory uses `id` for its noise start offset (`VOICE_IDS.indexOf(id) · 0.37 s`) and, for Poisson voices, nothing else (the engine owns the generators).
- **continuous**: built once (sources started, `loop = true`), `set` moves its params with `smoothTo(…, data.master.smoothingS)` unless the voice's section says another time.
- **pulse** (flap, winch clicks, chain): built once like a continuous voice (looping noise → filter → a gain at 0); the engine keeps the voice's `phase` (start 0) and, each running frame, calls `pulses(phase, rate, dt)` (rate after the voice's own jitter: only a voice whose data section has `jitter` (the flaps) draws one `rng()` per running frame, also when its rate is 0, and uses `rate · (1 + jitter · (2 · rng() − 1))`; the others draw nothing here), then `fire(now + lookaheadS + offset)` for each offset. `fire` calls `burst` on the voice's gain with `peak = target.gain`. Pulses create no nodes and do not count towards `maxOneShots`.
- **poisson** (halyards, lapping, gulls, small birds): `set` only stores the target; each running frame the engine calls `poissonTimes(rng, target.rate, dt)` (the voice's generator), then `fire` for each time in order; each `fire` builds its own short nodes (from the shared noise buffer or oscillators) into the voice's out, peak = `target.gain` times the variation the section gives, and counts as **one** one-shot (a whole gull call is one) until its last node ends. At `maxOneShots` the fire is skipped (the rng draws still happen, so the sequence does not shift).
- **Draw order per voice and frame:** the jitter draw, then `poissonTimes`' draws, then each `fire`'s own draws in time order.
- **"Decay `s`"** in any section means `burst` with that `decayS` (attack 0.005 s unless the section gives one); nodes are stopped at `at + attackS + 2 · decayS`. A sweep is `exponentialRampToValueAtTime` (never to 0).
- **Events** (`SoundEvent`) are one-shots too, played by the voice file that owns them (`playEvent(ctx, out, noise, event, data)` exported from the same file) and counted towards `maxOneShots`.
- **The probe** has one recorder, `record(name)`, keeping the last 50; it records `eventName(event)` for every event played, `PROBE_NAME[id]` for every Poisson fire that has one (halyards and lapping are never recorded, so they cannot push the birds out of the list), and the music's names (M91 passes `record` as `onEvent`).

### 3.5 Common mistakes (check these first when something fails)

- Creating the `AudioContext` at start-up, outside a tap: Chrome logs a warning and keeps it `suspended`; Safari never starts it. Create or resume only in a gesture handler (3.1).
- `setValueAtTime`/`setTargetAtTime` every frame with the same value: thousands of automation events, then crackles on a phone. Use the 0.5 % rule (3.1).
- A new `AudioBufferSourceNode` per frame: leaks. Continuous voices are built once; one-shots are disconnected in `onended`.
- `Math.random` in a voice: browser checks cannot repeat it (3.1).
- Reading `state.paused` as the only pause: Held still (`state.boat.mode === 'held'`) is not paused; the wind and the winches still sound there, the hull rush is 0 because the speed is 0.
- Degrees vs radians in a sweep; `exponentialRampToValueAtTime` to 0 throws (ramp to 0.0001, then stop).
- Forgetting the tab: `visibilitychange` → hidden suspends the context; visible resumes it only if `prefs.on`.
- A unit test importing `src/audio/engine.ts` fails in node (no `AudioContext`): tests import only the pure files.

## 4. Architecture

### 4.1 Files by milestone

| Milestone | New | Changed |
|---|---|---|
| M87 | `content/audio/sounds.json`, `src/audio/soundData.ts`, `src/audio/levels.ts`, `src/audio/prefs.ts`, `src/audio/pulses.ts`, `src/audio/types.ts`, `src/audio/engine.ts`, `src/audio/support.ts`, `src/audio/voice.ts`, `src/audio/noise.ts`, `src/audio/surroundingsVoices.ts`, `src/ui/soundSettings.ts`, `src/ui/soundChip.ts`, `tests/soundLevels.test.ts`, `tests/soundPrefs.test.ts`, `scripts/shots-m87.mjs` | `src/app/app.ts`, `src/ui/settingsMenu.ts`, `src/style.css`, `content/lang/{en,ru}/ui.json`, `scripts/shots.mjs` (registration), `scripts/ui.mjs` (`soundOn`, `soundProbe`), `.github/ci-times.json`, `docs/CODE_MAP.md`, `docs/ROADMAP.md` (decisions row) |
| M88 | `src/audio/boatVoices.ts`, `scripts/shots-m88.mjs` | `content/audio/sounds.json`, `src/audio/types.ts`, `src/audio/levels.ts`, `src/audio/soundData.ts`, `src/audio/engine.ts` (merge the new map), `tests/soundLevels.test.ts`, `scripts/shots.mjs`, `.github/ci-times.json`, `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md` |
| M89 | `src/audio/gearVoices.ts`, `scripts/shots-m89.mjs` | as M88, without `BOAT_REFERENCE.md` |
| M90 | `src/audio/placeVoices.ts`, `scripts/shots-m90.mjs` | as M88, without `BOAT_REFERENCE.md` |
| M91 | `src/audio/music.ts` (Web Audio), `src/audio/musicScore.ts` (pure), `tests/musicScore.test.ts`, `scripts/shots-m91.mjs` | `content/audio/sounds.json`, `src/audio/soundData.ts`, `src/audio/engine.ts`, `scripts/shots.mjs`, `.github/ci-times.json`, `docs/CODE_MAP.md` |

Every milestone also adds a ROADMAP decisions-log row and "Decided in the M<N> PR" notes in its section (CLAUDE.md). Each milestone adds its live group to `.github/ci-times.json` (`"m87": 300` until its time is known; the test of PHASE_LAUNCH_SPEC 6.6 fails otherwise).

### 4.2 The engine (`src/audio/engine.ts`, M87)

```ts
export interface SoundEngine {
  /** Called by app.ts once per frame, after drawing, with the frame's real seconds. */
  frame(realDtS: number): void;
  /** True when this browser has Web Audio (`AudioContext` or `webkitAudioContext`). */
  readonly supported: boolean;
}
export function createSoundEngine(store: Store): SoundEngine;
```

- **Graph:** `ctx.destination ← master (GainNode, 1) ← DynamicsCompressorNode (threshold −18 dB, knee 12, ratio 4, attack 0.01, release 0.25: keeps many voices from clipping a phone speaker) ← three group GainNodes (music, surroundings, boat)`. Each voice connects to its group (`VOICE_GROUP`).
- **Noise:** `src/audio/noise.ts` `noiseBuffer(ctx, seconds = 2, seed = data.master.noiseSeed)` fills one mono buffer with white noise from `mulberry32` once; every noise voice is an `AudioBufferSourceNode` with `loop = true` on that buffer, each started at a different offset (`voiceIndex · 0.37 s`) so they do not sound alike.
- **The probe** (`window.__sailSound`, below) is set when `createSoundEngine` runs, before any start.
- **Start:** `onSoundPrefs` and a capture-phase `pointerdown`, `pointerup`, `touchend` and `keydown` listener on `document` (kept while `prefs.on` and the context is not `running`; removed once it runs). In the handler: if `prefs.on` and `supported` and not hidden: create the context the first time (`new (audioContextClass()!)()`), build the graph and the voices, then `ctx.resume()`. When `prefs.on` becomes false: `ctx.suspend()`.
- **Hidden:** `document.addEventListener('visibilitychange', …)`: hidden → `suspend()`; visible and `prefs.on` → `resume()`.
- **`frame(realDtS)`:** if there is no context, or it is not `running`, only keep `previous = store.getState()` and return (so the first running frame compares with the frame before, and a link that opens with the engine running plays no start sound). Else `dt = min(0.1, max(0, realDtS))`, `targets = soundTargets(state, previous, getSoundPrefs(), dt)`, set the group gains and voice params (3.1), schedule the frame's pulses and events, store `previous = state`. The whole body is in `try`/`catch`: on the first error, `console.error` once, suspend the context and stop updating (the app keeps running).
- **One-shots:** at most `data.master.maxOneShots` playing at once; a new one past the cap is dropped.
- **Check hook:** `(window as unknown as { __sailSound?: SoundProbe }).__sailSound = probe`, always set (the checks need it on previews and releases alike; it changes nothing):

```ts
interface SoundProbe {
  context(): 'none' | AudioContextState; // 'none' before the first start
  targets(): SoundTargets | null;        // the latest frame's, null before the first running frame
  events(): string[];                    // the last 50 played, oldest first: 'contact:bump', 'engineStart', 'gull', 'note:62' …
}
```

### 4.3 App wiring (`src/app/app.ts`, M87)

- After `createSettingsMenu(…)`: `const sound = createSoundEngine(store);`.
- After `createAlertCentre(…)` (the camera chip is made earlier, in the `scene` block): `if (sound.supported) createSoundChip(chipRow);` (it inserts itself before `[data-testid="settings-button"]`, so the row on a computer reads: mode chip, camera chip, sound chip, gear; on a phone the chip is in the row but hidden by CSS; it may sit between the alert chip and the hidden gear until the alert centre places its chip again, which is harmless because the gear is hidden there).
- In `loop`: move `const raw = last === undefined ? 0 : (now - last) / 1000;` from inside the first `try` to the line right after `requestAnimationFrame(loop);` (the `try` keeps using it; `last = now` stays where it is). After the `debug.update(…)` call add `sound.frame(raw);`. `frame` catches its own errors.
- `createSettingsContent(store, showWelcome)` keeps its signature. Whether the browser has Web Audio is one function, `soundSupported(): boolean` in `src/audio/support.ts` (pure apart from reading `window`: `typeof globalThis.AudioContext === 'function' || typeof (globalThis as { webkitAudioContext?: unknown }).webkitAudioContext === 'function'`), used by the engine (`supported`), by `buildSoundField` and by `app.ts` for the chip.

## 5. Milestones overview

| Milestone | Section | What the owner sees and hears | Depends on | Independent review |
|---|---|---|---|---|
| M87 | 6 | Settings → Sound (on/off, Music, Surroundings, Boat sounds, Volume); a speaker chip on a computer; wind that rises with the wind and swells in gusts, the wash of the waves, water along the hull | M86 | **required** (a new part running every frame; the phones' autoplay rules; the app wiring and the chip row) |
| M88 | 7 | Sails flapping when they luff, a soft rush when full; the engine following the revs, its start; a thump when the hull touches something, softer on a fender | M87 | not needed (sound only; reads existing state) |
| M89 | 8 | Winch motor hum and ratchet clicks, a rope running out, the windlass and the chain, the thrusters' hum | M88 | not needed (sound only) |
| M90 | 9 | In the marina halyards tapping and water lapping; gulls by day everywhere, small birds near land, none at night | M89 | not needed (sound only) |
| M91 | 10 | Quiet generated music that never repeats, under the other sounds | M90 | not needed (sound only) |

---

## 6. M87: Sound on, wind and waves

**Independent review: required** (a new part that runs every frame, the browsers' autoplay rules, and changes to `app.ts` and the chip row).

### 6.1 Files

As 4.1.

### 6.2 Data: `content/audio/sounds.json` (verbatim; every value **tunable**)

```json
{
  "master": {
    "groupGain": { "music": 0.33, "surroundings": 1, "boat": 1 },
    "pausedSurroundings": 0.5,
    "smoothingS": 0.08,
    "lookaheadS": 0.05,
    "maxOneShots": 12,
    "noiseSeed": 155
  },
  "wind": {
    "minKn": 2, "maxKn": 35, "curve": 0.8, "gain": 0.5,
    "lowHz": 300, "highHz": 1200, "q": 0.7,
    "flutterHz": 0.23, "flutterDepth": 0.15
  },
  "whistle": { "fromKn": 20, "toKn": 35, "gain": 0.12, "lowHz": 900, "highHz": 1600, "q": 25 },
  "waves": { "refHeightM": 3, "floor": 0.06, "gain": 0.45, "lowpassHz": 600, "swellDepth": 0.4 },
  "hull": { "maxKn": 9, "gain": 0.3, "lowHz": 900, "highHz": 1500, "q": 0.8 }
}
```

`src/audio/soundData.ts`: `import data from '../../content/audio/sounds.json'` (as `src/model/boat.ts` imports the boat file), `export interface SoundData { … }` matching the JSON, `export const SOUND: SoundData = data`. A test checks every number is finite and every gain is in 0–1.

### 6.3 Formulas (`soundTargets`, pure)

- **wind** (surroundings): `aws = state.rig.wind.awsKn` (the apparent wind at the boat; it includes the gust, because `state.wind.twsKn` does). `level = ramp(aws, minKn, maxKn) ^ curve`. `gain = wind.gain · level`, `hz = lowHz + (highHz − lowHz) · level`, `rate = flutterHz`. Voice: noise → `BiquadFilterNode` `bandpass` (frequency `hz`, Q `wind.q`) → gain; the flutter: the voice gain's own value is `gain` (via `smoothTo`), and an `OscillatorNode` (sine, `rate` Hz) through a `GainNode` whose gain is `flutterDepth · gain` (also via `smoothTo`) is connected into that `gain` param, so the result is `gain · (1 + flutterDepth · sin(2π · rate · t))`.
- **whistle** (surroundings; the rigging singing in strong wind): `w = ramp(aws, whistle.fromKn, whistle.toKn)`; `gain = whistle.gain · w`, `hz = lowHz + (highHz − lowHz) · w`, `rate = 0`. Voice: noise → bandpass (`hz`, Q `whistle.q`) → gain.
- **waves** (surroundings): `hs = significantHeightM(waveTrains(state.sea))`, `periodS = seaSize(state.sea.windKn, fetchKm(state.sea.setting)).periodS` (`src/model/waves.ts`). `level = max(waves.floor, min(1, sqrt(hs / refHeightM)))`. `gain = waves.gain · level`, `hz = waves.lowpassHz`, `rate = 1 / periodS`. Voice: noise → `lowpass` (`hz`) → gain, with the swell built as the wind's flutter: the voice gain's value is `gain · (1 − swellDepth / 2)`, the oscillator (`rate` Hz) through a gain of `gain · swellDepth / 2`.
- **hull** (surroundings; the water along the hull): `kn = |state.boat.speedMps| · 1.943844`, `h = ramp(kn, 0, hull.maxKn)`; `gain = hull.gain · h`, `hz = lowHz + (highHz − lowHz) · h`, `rate = 0`. Voice: noise → bandpass (`hz`, Q `hull.q`) → gain. Held still: speed 0 → silent. **Paused: 0** (the boat stands still on the screen).
- Edge cases: no wind (`aws = 0`) → wind and whistle 0; flat sea (`hs = 0`) → waves at the floor (0.027, a faint lap); Pause → the groups (3.4); the voices unchanged except the hull (0).

### 6.4 Settings → Sound (`src/ui/soundSettings.ts`)

`buildSoundField(): HTMLElement`, placed in `buildSettingsBody` (`src/ui/settingsMenu.ts`) **right after `languageGroup`**. A `fieldset class="field sound-setting"` with `data-testid="sound-setting"`:

1. `legend` `sound.label`; `p.hint` `sound.hint`.
2. The main switch, the same markup as the Clock switch: a `div.field` holding `label.toggle` (for a checkbox `id="sound-toggle"`, `data-testid="sound-switch"`, text `sound.on`).
3. Three switches, each its own `div.field sound-group` (CSS `.sound-group { margin-inline-start: 24px; }`) holding `label.toggle` and, after the label, its `p.hint`: `sound-music` (`id="sound-music-toggle"`, `sound.music`, no hint), `sound-surroundings` (`id="sound-surroundings-toggle"`, `sound.surroundings`, hint `sound.surroundings.hint`), `sound-boat` (`id="sound-boat-toggle"`, `sound.boat`, hint `sound.boat.hint`); the `data-testid`s are on the checkboxes. They stay usable while Sound is off (they say what plays once it is on).
4. Volume: a `div.field` with `label` `sound.volume` for `input type="range" id="sound-volume" min="0" max="100" step="5"` (`data-testid="sound-volume"`), the app's default `input[type=range]` styling (no new slider look), `width: 100%`, `min-height: var(--touch)`, and the value as text after it in a `span` (`data-testid="sound-volume-value"`, `sound.volumeValue`, e.g. "70 %").
5. Without Web Audio (`!soundSupported()`): every input `disabled`, and `p.hint` `sound.unsupported` after the legend.

Each input's `change` (the range's `input`) calls `setSoundPrefs({ … })`; `onSoundPrefs` keeps every input in step (the chip can change `on`). No store action: the setting is not app state (3.1). The listeners are never removed (the Settings body is built once).

### 6.5 The speaker chip (`src/ui/soundChip.ts`, computer only)

`createSoundChip(row: HTMLElement): HTMLButtonElement`: a `button type="button" class="view-chip sound-chip"`, `data-testid="sound-chip"`, inserted before `row.querySelector('[data-testid="settings-button"]')`, square like the gear (`.sound-chip { width: var(--touch); height: var(--touch); padding: 0; }`). Hidden on a phone: add `html[data-layout='stacked'] .sound-chip` to the M51 rule in `src/style.css` (`html[data-layout='stacked'] .mode-chip, html[data-layout='stacked'] .settings-button { display: none; }`). Not built when Web Audio is missing (4.3).

- Icon: an inline SVG, 24 × 24, `currentColor`, built like `gearIcon()`: a speaker (a rectangle and a triangle) with two arcs when on, with an × instead of the arcs when off. No emoji, no image file.
- `aria-pressed` = `prefs.on`; `aria-label` and `title` = `sound.chipOn` when on ("Sound on: tap to mute"), `sound.chipOff` when off ("Sound off: tap to play").
- Tap → `setSoundPrefs({ on: !getSoundPrefs().on })`. It follows `onSoundPrefs`.
- Spacing: `.sound-chip { margin-left: 0; }`. The row is right-aligned (`.view-bottom { justify-content: flex-end; }` and the later `.settings-button { margin-left: 0; }`, the M38/M52 block near the end of `style.css`), and its `gap` spaces the chips. Check: no overlap with the gear or the camera chip at 1024 × 768 and 1440 × 900.

### 6.6 Strings (`content/lang/en/ui.json`, a new block; Russian drafts in `ru`)

- `"sound.label": "Sound"`
- `"sound.hint": "Wind, waves, the boat and quiet music, all made by the app. Off until you switch it on; this device remembers it."`
- `"sound.on": "Sound on"`
- `"sound.music": "Music"`
- `"sound.surroundings": "Surroundings"`
- `"sound.surroundings.hint": "Wind, waves, the marina and birds."`
- `"sound.boat": "Boat sounds"`
- `"sound.boat.hint": "Sails, the engine, winches, the anchor chain and bumps."`
- `"sound.volume": "Volume"`
- `"sound.volumeValue": "{value} %"`
- `"sound.unsupported": "This browser cannot play the app's sound."`
- `"sound.chipOn": "Sound on: tap to mute"`
- `"sound.chipOff": "Sound off: tap to play"`

No registry ids (nothing is drawn or tappable in 3D).

### 6.7 Tests

`tests/soundPrefs.test.ts`:
- `parseSoundPrefs('{"volume":"loud"}')` and `'{"volume":null}'` → volume 70 (not a finite number → default).
- `parseSoundPrefs(null)` and `parseSoundPrefs('nope')` equal `DEFAULT_SOUND_PREFS`; `parseSoundPrefs('{"on":true,"volume":250}')` → `on: true, volume: 100`, the rest default; `'{"volume":-3,"music":"yes"}'` → `volume: 0, music: true` (the default, the value was not a boolean); `'{"volume":42.6}'` → 43.
- `setSoundPrefs({ on: true })` calls a listener once with `on: true`, synchronously (before `setSoundPrefs` returns); the unsubscribe stops it. In node `localStorage` is missing: it must not throw.

`tests/soundLevels.test.ts` (states from `initialState()` in `tests/motionHelpers.ts`, with `rig.wind`, `sea`, `boat.speedMps` set by spreading, e.g. `{ ...s, rig: { ...s.rig, wind: { ...s.rig.wind, awsKn: 18.5 } } }`; `previous` = the same state unless the test says otherwise; `prefs = { ...DEFAULT_SOUND_PREFS, on: true }`):
- Wind: `aws` 2 → `wind.gain` 0; 35 → 0.5 and `hz` 1200; 18.5 → gain 0.2872 ± 0.001, `hz` 816.9 ± 0.5; 40 → 0.5 (clamped).
- Whistle: 20 → 0; 27.5 → gain 0.06, `hz` 1250; 35 → 0.12.
- Gust: the same state with `rig.wind.awsKn` raised from 12 to 18 → `wind.gain` higher (strictly).
- Waves: `sea = { setting: 'open', windKn: 15, dirDeg: 0 }` → `hs` 1.48 (prototype), gain 0.316 ± 0.005, `rate` 0.156 ± 0.003 (period 6.4 s); `'flat'` → gain 0.027 ± 0.0005; `'coastal'`, 15 kn → gain 0.214 ± 0.005 (`hs` 0.68).
- Hull: 0 m/s → 0; 2.315 m/s (4.5 kn) → gain 0.15 ± 0.001, `hz` 1200 ± 1; 6 m/s (11.7 kn) → 0.3; 2.315 m/s with `paused: true` → 0.
- Groups: `on: false` → all three 0; `on: true`, volume 70 → `surroundings` 0.7, `boat` 0.7, `music` 0.231 ± 0.0005; `paused: true` → `surroundings` 0.35, `boat` 0, `music` 0.231; `music: false` → `music` 0.
- `pulses(0, 10, 0.25)` → 2 offsets `[0.1, 0.2]`, phase 0.5; `pulses(0.5, 10, 0.2)` → offsets `[0.05, 0.15]`, phase 0.5 (±1e-9); `pulses(0.2, 0, 1)` → `[]`, phase 0.2; a rate of 1,000 for 1 s → 40 offsets.
- `poissonTimes(mulberry32(1), 0, 1)` → `[]`; over 1,000 frames of 0.05 s at rate 2 the count is 100 ± 20; every time is in `[0, dtS)`.

### 6.8 Browser checks (`scripts/shots-m87.mjs`, group `m87`, registered in `shots.mjs`)

Export `liveM87Checks(onTestClock)` (registered as `m87: () => liveM87Checks(onTestClock)`, as the M4b group is; M88–M91 register theirs the same way); no scenes. **Labels:** `openPage` (`scripts/shots.mjs`) treats labels of the newer milestones by regexes whose alternation ends in `|8\d)` (lines 483–516); add `|9\d` after each `8\d` so `m90-` and `m91-` labels are treated as `m8x` ones (no `held=1`, `sea=flat`, … appended). Every label starts with `m87-`. Add two helpers to `scripts/ui.mjs`, used by M87–M91: `soundProbe(page)` → `page.evaluate(() => { const p = window.__sailSound; return { context: p.context(), targets: p.targets(), events: p.events() }; })`, and `soundOn(page)` → `openSettings(page)`, check `sound-switch` if unchecked, `closeSettings(page)`, then poll (with `page.waitForTimeout(100)`, at most 30 times) until `soundProbe(page).context === 'running'`. Headless Chromium runs an `AudioContext` after a click without extra flags; if it does not, add `--autoplay-policy=no-user-gesture-required` to the launch in `shots.mjs` and say so in the PR.

1. **Phone 390 × 844**, `?v=1`: open Settings (`openSettings(page)`, `scripts/ui.mjs`); `sound-setting` visible right after the Language block; `sound-switch` unchecked; `probe.context()` is `'none'`; screenshot `m87-settings-phone.png`. No `sound-chip` visible.
2. Tap `sound-switch`: within 2 s `probe.context()` is `'running'` and `targets()` is not null; `localStorage['sail-learn.sound']` has `"on":true`.
3. **Wind follows the wind** (test clock): `?v=1&ws=5` vs `?v=1&ws=25` (`ws` is `ctl_wind_speed`), Sound switched on as in 2: after `page.waitForTimeout(1000)`, `targets().voices.wind.gain` is higher at 25 kn than at 5 kn, and `whistle.gain` is 0 at 5 kn and > 0 at 25 kn.
4. **Pause:** with sound on, tap the time bar's Pause: `targets().groups.boat === 0`, `groups.surroundings` is half its value before.
5. **Hidden:** `page.evaluate` a `visibilitychange` with `document.visibilityState` overridden to `'hidden'` (`Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })`, then dispatch the event): `context()` becomes `'suspended'`; set it back to `'visible'` and dispatch: `'running'`.
6. **Remembered:** `page.reload()` (the stored setting survives, a new `AudioContext` does not): `context()` is `'none'` until a tap anywhere on the 3D view; after the tap, `'running'`.
7. **Computer 1440 × 900:** `sound-chip` visible, directly before the gear, not overlapping it (boxes); `aria-pressed="false"` with sound off; tap it → `aria-pressed="true"`, `context()` `'running'`, and Settings' `sound-switch` checked. Screenshot `m87-chip-wide.png`. Same layout check at 1024 × 768.
8. Russian (`lang=ru`): the Sound block shows, no missing-string marks.

Run `SHOTS_ONLY=general,m25,m38,m51,m52,m87` locally (the chip row, the alert chip and the settings); put `CI groups: m25, m38, m51, m52` in the PR description. Add `"m87": 300` to `.github/ci-times.json`.

### 6.9 Done when / not in M87

Checks and tests pass; the owner hears on the phone: silence at first, then wind and waves after switching Sound on, louder in strong wind and swelling in gusts, quieter on Pause, stopped when the app is in the background. Not in M87: any boat sound, birds, the marina, music (later milestones; their switches are already there and simply have nothing to play yet).


**Decided in the M87 PR** (recommended; merging accepts it):

- The whistle's loudness: a narrow band of noise (Q 25) is quiet, so `whistle.gain` 0.12 gives about 0.09 at 25 kn. It is left as specified and tuned after the owner's phone test.
- After a reload with Sound left on, nothing plays until the first tap or key press, and nothing says so (as 3.1 says). No banner.
- The waves' low-pass filter keeps the Web Audio default Q (no number in the data for it); the other filters use their `q` from the data file.
- `voice.ts` also exports `oneShots` (a counter a voice raises while a one-shot plays; the engine skips a `fire` at `maxOneShots`) and `loopingNoise` (the looping noise source at the voice's start offset). The engine already drives pulse and Poisson voices and the probe's recorder; no M87 voice uses them, so that code is first exercised in M88.
- `soundTargets` takes `previous` and `dtS` as the spec says; M87 does not use them (the event voices of M88 do).
- The browser checks open the pages that do not depend on app time on the real clock (`openPlain` = `openPage` of `shots.mjs`, passed with `onTestClock` to `liveM87Checks`), because the audio context runs in real time; the wind and Pause checks use the test clock. Headless Chromium started the audio context after a click without extra flags. `"m87"` in `ci-times.json` is 47 (measured), not 300.
- **Review (owner: accept all):** (1) the engine also listens for `pointerup` and `touchend` (a phone does not accept a finger touching down as a tap that may start sound; all four listeners are removed together once the sound runs), and a check does a lone `pointerup` and a lone `touchend` after a reload; (2) the result of the wider local run is in the PR's Tests section; (3) `smoothTo` stays as specified (a step of 0.005 or less is skipped; about −50 dB, not audible); (4) **to do in M88**, which builds the first pulse voices: drop the `rng ?? Math.random` fallback in `engine.ts` (the generator always exists, so the fallback is never used).
- The old M52 check "mode chip, camera chip, gear, 8 px apart" now counts the speaker chip that sits between the camera chip and the gear on a computer.
- `tests/languages.test.ts` lists `sound.volumeValue` among the Russian strings equal to English (a placeholder and a percent sign only).

---

## 7. M88: Sails, engine and bumps

**Independent review: not needed** (sound only; reads existing state; the gap check covers it).

### 7.1 Files

As 4.1. Voices in `src/audio/boatVoices.ts`.

### 7.2 Data (add to `content/audio/sounds.json`, verbatim; **tunable**)

```json
"flap": { "fromKn": 3, "toKn": 25, "gain": 0.4, "baseHz": 2, "perKnHz": 0.15, "bandHz": 1800, "q": 1.2, "attackS": 0.005, "decayS": 0.06, "jitter": 0.2 },
"full": { "fromKn": 4, "toKn": 30, "gain": 0.12, "bandHz": 500, "q": 0.6 },
"engine": { "firesPerRev": 2, "gain": 0.35, "idleShare": 0.45, "lowpassBaseHz": 300, "lowpassPerHz": 6, "subGain": 0.5, "startS": 0.9, "startFromHz": 140, "startToHz": 220, "startGain": 0.25 },
"contact": {
  "thumpHz": 65, "noiseLowpassHz": 400,
  "gain": { "fender": 0.25, "touch": 0.35, "bump": 0.6, "knock": 0.8, "hit": 1 },
  "decayS": { "fender": 0.25, "touch": 0.15, "bump": 0.25, "knock": 0.35, "hit": 0.5 },
  "squeakFromHz": 320, "squeakToHz": 210, "squeakS": 0.25, "squeakGain": 0.15
}
```

`docs/BOAT_REFERENCE.md`, section 5 (Assumptions), a new row at the end of its table: "Engine sound (M88): a 4-cylinder four-stroke diesel, so the engine fires twice per turn (`sounds.json` `engine.firesPerRev`); 800 rpm → 26.7 Hz, 2,500 rpm → 83.3 Hz | **Assumption** (sound only)".

### 7.3 Formulas (add to `soundTargets`; `VOICE_IDS` appends `'flapMain', 'flapJib', 'fullMain', 'fullJib', 'engine'`, all group `boat`; kinds: the two flaps `pulse`, the rest `continuous`)

Imports: `trimState`, `type SailName` from `src/model/trim.ts`; `boat` from `src/model/boat.ts`; `type Severity` from `src/model/contact.ts`.

- `aws = state.rig.wind.awsKn`. For `sail` in `main`, `jib`: `ts = trimState(sail, state.rig, state.rig.wind.awaDeg)` (`src/model/trim.ts`); `share` = `state.rig.applied.mainFurl / 100` for the main, `state.rig.jibSolution.unfurled` for the jib (both 0–1, 1 = all out).
- **flap** (`flapMain`, `flapJib`): when `ts === 'luffing'`: `gain = flap.gain · ramp(aws, fromKn, toKn) · share`, `rate = baseHz + perKnHz · aws`, `hz = bandHz`; otherwise all 0. Voice: a pulse voice (3.6): noise → bandpass (`hz`, Q `flap.q`) → a gain at 0; `fire` = `burst(gain, at, target.gain, flap.attackS, flap.decayS)`; jitter `flap.jitter`. A torn sail flaps like any other (no extra rule).
- **full** (`fullMain`, `fullJib`): when `ts` is `good`, `stalled` or `pushed`: `gain = full.gain · ramp(aws, fromKn, toKn) · share`, `hz = bandHz`; `furled`, `blanketed`, `luffing` → 0. Voice: noise → bandpass → gain.
- **engine**: `{ running, rpm } = state.engine`; idle and max from `boat.physics.engine` (`idleRpm` 800, `maxRpm` 2500; read through the boat in use, `src/model/boat.ts` `boat`). `r = ramp(rpm, idleRpm, maxRpm)`; `hz = rpm / 60 · firesPerRev`; running: `gain = engine.gain · (idleShare + (1 − idleShare) · r)`; not running: `gain = engine.gain · idleShare · clamp01(rpm / idleRpm)` (the run-down as rpm falls to 0). Voice: a `sawtooth` oscillator at `max(1, hz)` plus a `square` oscillator at `max(1, hz / 2)` (gain `subGain`) → `lowpass` at `lowpassBaseHz + lowpassPerHz · hz` (Q 1) → gain; the oscillators run from the start and are never stopped (gain 0 when the engine is off); frequencies move with `smoothTo` like the gains.
- `SoundEvent` becomes `{ kind: 'contact'; severity: Severity } | { kind: 'engineStart' }` (`Severity` from `src/model/contact.ts`). Events:
  - `engineStart` when `state.engine.running && !previous.engine.running`. Sound: a sawtooth sweeping `startFromHz` → `startToHz` over `startS` (exponential ramp), bandpass 400 Hz Q 1, gain `startGain` with a 0.05 s attack and a 0.2 s release; group boat.
  - `contact` when a **new** report arrived: `r = state.contact.reports[0]` exists, `r.obstacleId !== 'propeller'` (the line round the propeller has its own report, `withPropellerReport`, and no thump), and no report in `previous.contact.reports` has the same `atS`, `obstacleId` and `part` (a repeat bounce is merged into the old report, which keeps its `atS`, so it gives no second thump; Clear empties the list and gives none). The event carries `r.severity`. Sound: a sine at `thumpHz` and noise → lowpass `noiseLowpassHz`, both through one gain: 0.005 s attack to `contact.gain[severity]`, then `setTargetAtTime(0, …, decayS[severity] / 3)`, stopped after `decayS · 2`; `fender` also plays the squeak: a sine `squeakFromHz` → `squeakToHz` over `squeakS`, gain `squeakGain`. Group boat.
- Probe event names: `'engineStart'`, `'contact:<severity>'`.

### 7.4 Tests (`tests/soundLevels.test.ts`)

Build states with `tests/motionHelpers.ts`: `run(initialState({ controls: trimmed(15, 90, ms, 50) }), 3)` (prototype: `ms` 100 → main `luffing`, `ms` 40 → `good`, main all out), then set `rig.wind.awsKn` to 15 by spreading so the numbers below hold, and assert `trimState('main', s.rig, s.rig.wind.awaDeg)` first:
- The `ms` 100 state (`luffing`), main all out: `flapMain.gain` = 0.4 · (12/22) = 0.218 ± 0.002, `rate` 4.25 ± 0.01; `fullMain.gain` 0.
- The `ms` 40 state (`good`): `flapMain` 0, `fullMain.gain` = 0.12 · (11/26) = 0.0508 ± 0.001.
- The `ms` 100 state with `rig.applied.mainFurl` set to 0 by spreading: `flapMain` and `fullMain` 0 (the share is 0).
- Engine (set `engine` by spreading, e.g. `{ ...s.engine, running: false, rpm: 400 }`): running at 800 rpm → `gain` 0.1575, `hz` 26.67 ± 0.01; 2500 rpm → 0.35, 83.33 ± 0.01; stopped at 400 rpm → 0.0788 ± 0.0005; stopped at 0 → 0.
- Events: `previous.engine.running` false, `state.engine.running` true → `[{ kind: 'engineStart' }]`; the same state twice → no events. A new contact report of severity `bump` (`previous` with `reports: []`) → one `contact` event with `bump`; the same report merged to `knock` (a new object, same `atS`, `obstacleId`, `part`) → none; a propeller report → none.

### 7.5 Browser checks (`scripts/shots-m88.mjs`, group `m88`)

Phone 390 × 844, test clock, `soundOn(page)` and `soundProbe(page)` (M87, `scripts/ui.mjs`).
1. `?wd=90&ws=15&ms=100&mf=100&jf=0` (`ms` 100 = sheet all out; `mf=100` main out; `jf=0` jib rolled away): after `page.waitForTimeout(2000)`, `voices.flapMain.gain > 0`. Then `?wd=90&ws=15&ms=40&mf=100&jf=0` (a new page): `flapMain.gain === 0` and `fullMain.gain > 0` (prototype: `good`).
2. Engine: `?ws=0`, `showSection(page, 'engine')`, tap `engine-startstop`: within 2 s `events` contains `engineStart`. Then `?ws=0&eng=1&lv=0` and `?ws=0&eng=1&lv=60` (new pages, 2 s each): `voices.engine.hz` is higher at 60.
3. Contact: the M43 bump run (`scripts/shots-m43.mjs` lines 45–55: `?pl=marina&m=harbour&ws=0&cam=top&tx=16`, `setSheet(page, 'peek')`, six taps on `quick-lever-more`, then a poll every 100 ms of app time with `page.waitForTimeout`, at most 15 s; copy its `poll` helper, it is not exported) with `soundOn` before the taps: within the poll, `events` gets a `contact:` entry.
4. Phone 390 × 844 screenshot `m88-sound-phone.png` of Settings → Sound (unchanged layout).

Run `SHOTS_ONLY=m88` (plus `m87` if `ui.mjs`'s helpers changed). Add `"m88": 300`.

### 7.6 Done when / not in M88

Checks and tests pass; on the phone: let the mainsheet out in 15 kn and hear the sail flap, sheet in and it goes quiet with a soft rush; start the engine and hear it rise with the lever; bump the pontoon and hear the thump. Not in M88: winches, ropes, the anchor, the thrusters (M89).

**Decided in the M88 PR** (recommended; merging accepts it):

- The flap, the engine and the thump are left as specified and tuned after the owner's phone test (nothing in the numbers is changed). `"m88"` in `ci-times.json` is 38 (measured), not 300.
- `playEvent(ctx, out, noise, event, data)` starts the sound at `ctx.currentTime + data.master.lookaheadS` itself; the engine calls it into the boat bus, skips an event at `maxOneShots` (it is then not recorded) and records `eventName(event)` for each one played. An event, with its squeak, counts as one one-shot.
- The two flap voices share `flap.jitter`; the engine looks it up by voice id (`jitterOf`), since the voice ids (`flapMain`, `flapJib`) are not data sections. A flap's filter keeps its last frequency while the sail is not luffing (target `hz` 0); the gain is 0 then.
- The `rng ?? Math.random` fallback in the engine's pulse branch is gone (M87 review item 4): a voice without a generator is skipped.
- The browser checks run on the test clock; the M87 `soundOn` and `soundProbe` helpers did not change.
- Browser check 1 uses `?v=1&wd=90&ws=15&ms=100&mf=100` and `…&ms=40&mf=100` **without `jf=0`** (7.5 has it): with the jib rolled away the boat sails at about 1.2 kn and her apparent wind is 80°, and a main with the sheet all out is then `good`, not `luffing`; with the jib out, as in the unit-test states of 7.4, `ms` 100 luffs and `ms` 40 is `good`. The formulas are unchanged.

---

## 8. M89: Winches, ropes, anchor and thrusters

**Independent review: not needed** (sound only).

### 8.1 Files

As 4.1. Voices in `src/audio/gearVoices.ts`.

### 8.2 Data (add, verbatim; **tunable**)

```json
"winchMotor": { "gain": 0.22, "baseHz": 320, "speedHz": 900, "refSpeedMps": 0.5, "strainDrop": 0.25, "q": 4 },
"winchClicks": { "gain": 0.18, "perMetre": 30, "maxRate": 40, "gearboxPerTurn": 12, "clickHz": 3200, "clickS": 0.012 },
"easyRopes": { "refPctPerS": 20, "clicksPerPct": 1 },
"cutOut": { "gain": 0.3, "hz": 180, "s": 0.08 },
"ropeRun": { "gain": 0.2, "refSpeedMps": 1, "lowHz": 1500, "highHz": 3000, "q": 1.5 },
"windlass": { "gain": 0.25, "upHz": 120, "downHz": 140, "q": 3 },
"chain": { "gain": 0.3, "perMetre": 25, "maxRate": 30, "clickHz": 1400, "clickS": 0.03 },
"anchorClank": { "gain": 0.35, "hz": 900, "s": 0.3 },
"thruster": { "gain": 0.3, "bowHz": 240, "sternHz": 200, "q": 2, "rampS": 0.15 }
```

### 8.3 Formulas (`VOICE_IDS` appends `'winchMotor', 'winchClicks', 'ropeRun', 'windlass', 'chain', 'thrusterBow', 'thrusterStern'`, all group `boat`; kinds: `winchClicks` and `chain` `pulse`, the rest `continuous`)

The Realistic branch runs only when `state.settings.ropesMode === 'realistic'` and the Easy branch only when it is `'easy'`, in every app mode. Every oscillator in this section runs at the voice's `hz`; where a voice mixes an oscillator and noise, both go at equal gain into its filter (each voice has its own noise source on the shared buffer).

Realistic ropes (`state.settings.ropesMode === 'realistic'`), over `Object.values(state.realistic.winches)` (`WinchState`, `src/model/realistic.ts`):
- **winchMotor:** the winches with `button && !cutOut`; none → 0. Else take the one with the largest `|drumSpeed|` (its own `strain`): `s = clamp01(|drumSpeed| / refSpeedMps)`; `gain = winchMotor.gain` (a stalled drum still hums, at `baseHz`), `hz = (baseHz + speedHz · s) · (1 − strainDrop · clamp01(strain ?? 0))`. Voice: sawtooth at `hz` → bandpass (`hz`, Q `winchMotor.q`) → gain.
- **winchClicks:** `rate = min(maxRate, Σ max(0, drumSpeed) · perMetre)` (the pawls click only when the drum turns in the hauling direction: `stepRealistic` drives the drum clockwise, `drumSpeed > 0`, by motor or handle; a rope running out the wrong way spins it backwards, no clicks) `+ (handleReport?.at === 'gearbox' ? |handleReport.turnsPerS| · gearboxPerTurn : 0)`, capped again at `maxRate`; `gain = rate > 0 ? winchClicks.gain : 0`. Voice: pulse (3.6); noise → highpass `clickHz` → gain; `fire` = `burst(…, target.gain, 0.001, clickS)`.
- **ropeRun:** over `Object.values(state.realistic.reports)` (`TailReport`) whose `motion` is `'running'` or `'easing'` (`hauling`, `held`, `slack`, `loose` are silent here): `v = max |speedMps|`; `x = clamp01(v / refSpeedMps)`; `gain = ropeRun.gain · x`, `hz = lowHz + (highHz − lowHz) · x`. Voice: noise → bandpass (`hz`, Q `ropeRun.q`) → gain.
- Event `{ kind: 'cutOut' }` when any winch's `cutOut` turns from false to true (same id in `previous`). Sound: a square at `cutOut.hz`, `burst(…, cutOut.gain, 0.002, cutOut.s)`. Probe name `'cutOut'`.

Easy ropes (`ropesMode === 'easy'`): the winches are electric and unseen. `dtS` is the frame's real time, so on Pause (`applied` does not move) and at ×4 (it moves four times faster) the sound follows what is seen. `keys = ['mainsheet', 'vang', 'toppingLift', 'mainFurl', 'jibSheet', 'jibFurl']` of `AppliedControls` (`src/model/sim.ts`; values in %): `movePct = dtS > 0 ? Σ |state.rig.applied[k] − previous.rig.applied[k]| / dtS : 0`; `x = clamp01(movePct / easyRopes.refPctPerS)`; `winchMotor`: `gain = winchMotor.gain · x`, `hz = baseHz + speedHz · x`; `winchClicks`: `rate = min(maxRate, movePct · clicksPerPct)`, `gain` as above; `ropeRun` 0.

Both modes:
- **windlass:** `on = state.anchor.windlass !== 'off' && !state.anchor.cutOut`; `gain = on ? windlass.gain : 0`, `hz = windlass === 'up' ? upHz : downHz`. Voice: sawtooth → bandpass (`hz`, Q `windlass.q`) → gain. (The windlass's own cut-out has no sound.)
- **chain:** `v = dtS > 0 ? |state.anchor.chainOutM − previous.anchor.chainOutM| / dtS : 0`; `rate = min(maxRate, v · perMetre)`; `gain = rate > 0 ? chain.gain : 0`. Voice: pulse (3.6); noise → bandpass `clickHz` (Q 3, fixed) → gain; `fire` = `burst(…, target.gain, 0.002, clickS)`.
- Events `{ kind: 'anchorDown' }` when `previous.anchor.phase === 'stowed' && state.anchor.phase !== 'stowed'`, `{ kind: 'anchorUp' }` when it becomes `'stowed'` from another phase. Sound: a sine at `anchorClank.hz` and one at `anchorClank.hz · 1.48` through one gain, `burst(…, anchorClank.gain, 0.002, anchorClank.s)`. Probe names `'anchorDown'`, `'anchorUp'`.
- **thrusterBow / thrusterStern:** `state.thrusters.bow !== 0` → `gain = thruster.gain`, `hz = bowHz` (stern: `sternHz`); else 0. Its `set` uses `smoothTo(…, thruster.rampS / 3)` instead of `smoothingS` (a motor spinning up). Voice: sawtooth + noise → bandpass (`hz`, Q `thruster.q`) → gain.

`SoundEvent` adds `{ kind: 'cutOut' } | { kind: 'anchorDown' } | { kind: 'anchorUp' }`.

### 8.4 Tests

- Set `settings.ropesMode` by spreading: `'realistic'` for the Realistic cases, `'easy'` for the Easy ones.
- Realistic: one winch with `button: true, cutOut: false, drumSpeed: 0.25, strain: 0.5` → `winchMotor.gain` 0.22, `hz` = (320 + 450) · 0.875 = 673.75 ± 0.5; `winchClicks.rate` 7.5; with `drumSpeed: −0.25` (easing) → `rate` 0, motor still on. `cutOut` false → true → one `cutOut` event.
- Handle at the gearbox, `turnsPerS: 1.5` → `winchClicks.rate` 18.
- A tail report `motion: 'running', speedMps: 0.5` (+ = running out) → `ropeRun.gain` 0.1, `hz` 2250.
- Easy: `mainsheet` moved by 0.5 % in `dtS` 0.05 → `movePct` 10 → `winchMotor.gain` 0.11, `winchClicks.rate` 10. No move → both 0.
- Windlass `up` → `hz` 120, gain 0.25; `cutOut: true` → 0. Chain from 10.0 to 10.1 m in 0.05 s → 2 m/s → `rate` 30 (capped from 50).
- `previous.anchor.phase` `stowed`, `state` `hanging` → `anchorDown`; `previous` `hanging`, `state` `stowed` → `anchorUp` (states set by spreading).
- `thrusters.bow = 1` → `thrusterBow.gain` 0.3, `thrusterStern.gain` 0.

### 8.5 Browser checks (`scripts/shots-m89.mjs`, group `m89`)

Phone 390 × 844, `soundOn(page)` and `soundProbe(page)` (M87).
1. **Winch** (opened and wrapped exactly as `scripts/shots-m4c.mjs` opens its phone winch checks, including the wrapper around line 110 that sets the sheet to `full` and the camera to `map`): `?mode=realistic&wd=90&ws=20&js=30&st=starboard&wsb=a5.4.t&sel=rope_jib_sheet&cam=helm`; hold the starboard winch's button as `scripts/shots-m4c.mjs` lines 139–152 do (import `touchTools` from `shots-m4b.mjs`; copy `finger`, `centreOn` and `drawing` from `shots-m4c.mjs`, they are not exported), 700 ms: during the hold `voices.winchMotor.gain > 0` or `events` has `cutOut`; after `f.up` and 500 ms, `winchMotor.gain === 0`.
2. **Easy** (test clock): `?wd=90&ws=12&ms=40&sel=rope_mainsheet`; press `getByRole('button', { name: 'More: Mainsheet' })` five times, `page.waitForTimeout(200)` after each, reading `soundProbe` after each: `winchClicks.rate > 0` at least once.
3. **Anchor** (test clock): the M46 `LET_GO` link `?pl=bay&m=harbour&pe=-1640.0&pn=0.0&hdg=270&wd=-90&ws=10&tx=4`; `await holdWindlass(page, 'down', 2000)` (`scripts/ui.mjs`), then `soundProbe`: `events` has `anchorDown` (the windlass and chain levels are covered by 8.4; never run a second test-clock wait in parallel with the hold).
4. **Thrusters** (test clock): `?m=harbour&wd=0&ws=0&mf=0&jf=0&js=100&bs=0&ap=off&eng=1&lv=0&cam=top&tx=4` (M41's `AWAY`); `holdThruster(page, 'bow', -1, 1000, 'section', async () => …)` reading `voices.thrusterBow.gain > 0` during the hold; 500 ms after, 0.

Run `SHOTS_ONLY=m89`. Add `"m89": 300`.

### 8.6 Done when / not in M89 (write "Decided in the M89 PR" notes under this heading)

Checks and tests pass; on the phone: the winch hums and clicks when you press its button, the clicks speed with the drum, a sheet eased runs out with a hiss; in Easy the sheets' + and − give a short winch sound; the windlass hums and the chain rattles; the thrusters hum while held. Not in M89: the marina, birds, music.

**Decided in the M89 PR** (recommended; merging accepts it):

- The winch, rope, windlass, chain, anchor and thruster sounds are left as specified and tuned after the owner's phone test (nothing in the numbers is changed). `"m89"` in `ci-times.json` is the measured time (13 s), not 300.
- `gearVoices.ts` exports its own `playEvent` for `cutOut`, `anchorDown` and `anchorUp`; `boatVoices.ts` keeps `engineStart` and `contact`; the engine hands each event to the file that owns it. Both count an event as one one-shot with the shared `track` helper, which moved to `voice.ts`.
- A band voice keeps its last pitch while its target `hz` is 0 (the winch motor, the rope, the thrusters): only the gain falls to 0.
- The winch motor and the thrusters share one band voice builder (an oscillator and/or noise through a bandpass); the windlass is the same without noise.
- Browser check 2 (Easy) presses `More: Main sheet` in the quick row (sheet at `peek`; the button is not called "Mainsheet") and reads the probe every 50 ms of app time for 200 ms after each press and takes the largest value: the sheet moves only for a moment after a press, so a single read after 200 ms can miss it.

---

## 9. M90: Marina and birds

**Independent review: not needed** (sound only).

### 9.1 Files

As 4.1. Voices in `src/audio/placeVoices.ts`.

### 9.2 Data (add, verbatim; **tunable**)

```json
"halyards": { "baseRate": 0.3, "perKnRate": 0.08, "traffic": { "busy": 1, "half": 0.6, "empty": 0.25 }, "gain": 0.12, "hzA": 2100, "hzB": 3400, "s": 0.08 },
"lapping": { "place": { "marina": 1, "bay": 0.6, "open": 0 }, "gain": 0.15, "rate": 0.5, "lowpassHz": 700, "attackS": 0.15, "s": 0.6 },
"gulls": { "perMinute": { "marina": 3, "bay": 2.5, "open": 0.5 }, "gain": { "marina": 0.2, "bay": 0.18, "open": 0.1 }, "fromHz": 1500, "toHz": 950, "noteS": 0.22, "gapS": 0.1, "notesMin": 2, "notesMax": 4, "bandHz": 1800, "q": 2, "attackS": 0.02 },
"smallBirds": { "perMinute": { "marina": 2, "bay": 4, "open": 0 }, "gain": 0.08, "fromHz": 3800, "toHz": 5200, "chirpS": 0.06, "gapS": 0.07, "chirpsMin": 3, "chirpsMax": 6 },
"birdLight": { "day": 1, "golden": 1, "twilight": 0.5, "night": 0 },
"birdWind": { "fromKn": 25, "share": 0.3 }
```

### 9.3 Formulas (`VOICE_IDS` appends `'halyards', 'lapping', 'gulls', 'smallBirds'`, all group `surroundings`, all kind `poisson` (3.6); `PROBE_NAME` = `{ gulls: 'gull', smallBirds: 'chirp' }`; `rate` is calls per second, `gain` the peak of one call)

Imports: `area` from `src/model/area.ts`, `daylight` from `src/model/clock.ts`, `sunPosition` from `src/model/sun.ts`.

- `place = state.harbour.place` (`'open' | 'marina' | 'bay'`), `tws = state.wind.twsKn`.
- **halyards** (only in the marina): `rate = place === 'marina' ? (baseRate + perKnRate · tws) · traffic[state.harbour.traffic] : 0`; `gain = rate > 0 ? halyards.gain : 0`. `fire`: draws `a = rng()` then `b = rng()`; two sines at `hzA` and `hzB · (0.95 + 0.1 · a)` through one gain, `burst(…, target.gain · (0.5 + 0.5 · b), 0.002, halyards.s)`.
- **lapping:** `share = lapping.place[place]`; `gain = lapping.gain · share`, `rate = share > 0 ? lapping.rate : 0`, `hz = lowpassHz`. `fire`: its own noise source (shared buffer, start offset `rng() · 1.5` s) → lowpass `hz` → gain, `burst(…, target.gain, lapping.attackS, lapping.s)`.
- **Light:** `light = birdLight[daylight(sunPosition(state.clock.utcMs, area.position.latitudeDeg, area.position.longitudeDeg).elevationDeg)]` (`src/model/clock.ts`, `src/model/sun.ts`, `src/model/area.ts`). **Wind:** `windShare = tws > birdWind.fromKn ? birdWind.share : 1`.
- **gulls:** `rate = gulls.perMinute[place] / 60 · light · windShare`; `gain = rate > 0 ? gulls.gain[place] : 0`. `fire`: draws `n = notesMin + floor(rng() · (notesMax − notesMin + 1))`, then one `rng()` per note for its start pitch; note `k` starts at `at + k · (noteS + gapS)`: a sawtooth sweeping `fromHz · (0.9 + 0.2 · r)` → `toHz` (exponential) over `noteS`, bandpass `bandHz` Q `q`, `burst(…, target.gain, gulls.attackS, noteS)`. The whole call is one one-shot. Probe name `'gull'` once per call.
- **smallBirds:** `rate = smallBirds.perMinute[place] / 60 · light · windShare`; `gain = rate > 0 ? smallBirds.gain : 0`. `fire`: draws `n` (`chirpsMin`–`chirpsMax`, as the gulls), then one `rng()` per chirp; chirp `k` at `at + k · (chirpS + gapS)`: a sine sweeping `fromHz` → `toHz · (0.9 + 0.2 · r)` over `chirpS`, `burst(…, target.gain, 0.005, chirpS)`. One one-shot per call; probe name `'chirp'`.
- Night (`light` 0) → no birds; the halyards and the lapping go on.

### 9.4 Tests

States from `initialState()` (`tests/motionHelpers.ts`; its clock is the default, noon local on 1 June), with `harbour`, `wind` and `clock` set by spreading (`wind: { ...s.wind, twsKn: 10 }`).

- Marina, busy, 10 kn → `halyards.rate` 1.1 ± 0.001; empty → 0.275; open water → 0.
- `lapping.gain`: marina 0.15, bay 0.09, open 0.
- Noon on 1 June (the default clock), marina, 10 kn → `gulls.rate` 0.05 (3/min), `smallBirds.rate` 0.0333 ± 0.0005; bay → 0.0417 ± 0.0005 and 0.0667 ± 0.0005; open → 0.00833 ± 0.0001 and 0.
- The same with `clock: { utcMs: Date.UTC(2026, 5, 1, 23, 0) }` (01:00 local on 2 June; assert `daylight(…)` is `'night'` first) → both 0.
- Marina at 30 kn → `gulls.rate` 0.015.

### 9.5 Browser checks (`scripts/shots-m90.mjs`, group `m90`)

Phone 390 × 844, test clock, `soundOn(page)` and `soundProbe(page)`.
1. `?pl=marina&tr=busy&m=harbour&ws=10&cam=map` (the map view skips the 3D drawing, so app time runs faster): `voices.halyards.rate > 0`, `lapping.gain > 0`; then `page.waitForTimeout(1000)` 90 times, reading `soundProbe` after each, until `events` holds a `'gull'` or a `'chirp'` (expected 5 calls a minute between them: the chance of none in 90 s is under 1 %; with the fixed seeds the result is the same every run).
2. `?ws=10&cam=map` (open water, noon): `halyards.rate === 0`, `gulls.rate > 0`.
3. `?pl=marina&tr=busy&m=harbour&ws=10&clk=202606020100&cam=map`: `gulls.rate === 0` and `smallBirds.rate === 0`, `halyards.rate > 0`.

Run `SHOTS_ONLY=m90`. Add `"m90": 300`.

### 9.6 Done when / not in M90 (write "Decided in the M90 PR" notes under this heading)

Checks and tests pass; on the phone: in the marina the halyards tap on the masts and the water laps, gulls call now and then, small birds chirp; in open water only a distant gull now and then; at night no birds. Not in M90: music; rain (out of scope).

**Decided in the M90 PR** (recommended; merging accepts it):

- The halyards, lapping, gull and small-bird sounds are left as specified and tuned after the owner's phone test (nothing in the numbers is changed). `"m90"` in `ci-times.json` is the measured time (13 s), not 300.
- `placeVoices.ts` has the four Poisson voices; each call builds its own oscillators or noise source and counts as one one-shot with the shared `track` helper. The lapping slap reads a different piece of the shared noise each time (`start(at, offset)`, offset `rng() · 1.5` s).
- Browser check 1 reads the probe once per second of app time for up to 90 s and stops at the first `gull` or `chirp`.

---

## 10. M91: Music

**Independent review: not needed** (sound only).

### 10.1 Files

As 4.1. `src/audio/musicScore.ts` (pure) chooses the notes; `src/audio/music.ts` plays them.

### 10.2 Data (add, verbatim; **tunable**)

```json
"music": {
  "seed": 155,
  "scale": [62, 64, 66, 69, 71],
  "chords": [[50, 57, 62, 66], [47, 54, 62, 66], [43, 50, 59, 62], [45, 52, 61, 64]],
  "chordEveryS": [8, 14],
  "padAttackS": 3, "padReleaseS": 5, "padGain": 0.18, "padDetuneCents": 6,
  "noteEveryS": [2, 6], "noteOctaves": [0, 12], "noteGain": 0.12, "noteDecayS": 2.5, "restShare": 0.25,
  "delayS": 0.45, "delayFeedback": 0.35, "delayMix": 0.3, "lowpassHz": 2500
}
```

The notes are MIDI numbers (60 = middle C; `hz = 440 · 2^((midi − 69) / 12)`): the scale is D-major pentatonic (D E F♯ A B), the chords D, Bm, G and A in low, wide spacing.

### 10.3 `src/audio/musicScore.ts` (pure)

```ts
export interface MusicEvent { atS: number; kind: 'chord' | 'note'; midi: number[] }
export function musicEvents(rng: () => number, fromS: number, toS: number, cursor: MusicCursor, data: SoundData = SOUND): { events: MusicEvent[]; cursor: MusicCursor };
export interface MusicCursor { nextChordS: number; nextNoteS: number; chord: number; lastNote: number }
export const START_CURSOR: MusicCursor = { nextChordS: 0, nextNoteS: 2, chord: 0, lastNote: 2 };
```

- **Chords:** at `nextChordS` (within `[fromS, toS)`), emit `{ kind: 'chord', midi: chords[chord] }`; the next chord is a different one: `chord = (chord + 1 + floor(rng() · (chords.length − 1))) % chords.length`; `nextChordS += a + rng() · (b − a)` with `[a, b] = chordEveryS`.
- **Notes:** at `nextNoteS`: with probability `restShare` nothing (a rest); else a step from the last note of −2, −1, +1 or +2 scale degrees (equal chances), kept inside `0 … scale.length − 1` by reflecting, plus an octave from `noteOctaves` (`rng() < 0.5` → the first); emit `{ kind: 'note', midi: [scale[i] + octave] }`; `lastNote = i`; `nextNoteS += a + rng() · (b − a)` with `noteEveryS`.
- **Order:** loop: take the earlier of `nextChordS` and `nextNoteS` (the chord first when equal); stop when it is ≥ `toS`; else handle it. So the events come out sorted by `atS`, and one call over `[0, 600)` gives the same events as many calls over consecutive frames. `fromS` is only the caller's frame start (every `atS` is ≥ it because the cursor moves forward).
- **Draws, in order:** a chord: one `rng()` for the next chord, one for the next interval. A note: one `rng()` for rest or not; if it sounds, one for the step (`floor(rng() · 4)` → −2, −1, +1, +2), one for the octave; then one for the next interval.
- **Reflecting:** `i < 0` → `−i`; `i > n − 1` → `2 · (n − 1) − i` (`n = scale.length`).
- The time is the music's own clock: the sum of the `dtS` given to `frame` (the frame's real seconds, so on the test clock it is app time); it stands still while the music group is 0 or the context is suspended.

### 10.4 `src/audio/music.ts` (Web Audio)

`createMusic(ctx: AudioContext, out: AudioNode, data: SoundData, onEvent: (name: string) => void): { frame(dtS: number): void }`, created by the engine with the other voices, with the music group as `out` and the probe's recorder as `onEvent` (its generator `mulberry32(data.music.seed)` is made inside, so every visit plays the same piece from its start); `frame` runs `musicEvents` over `[t, t + dt + lookaheadS)` and plays them at `ctx.currentTime + (atS − t)`:
- **Pad (chord):** per note two oscillators, `triangle` detuned `+padDetuneCents` and `sine` detuned `−padDetuneCents`, through one gain: `linearRamp` to `padGain / midi.length` over `padAttackS`, held until the next chord: `createMusic` keeps the playing pad's gain and oscillators, and when the next chord starts it calls `setTargetAtTime(0, at, padReleaseS / 3)` on that gain and stops its oscillators at `at + padReleaseS · 2`.
- **Note:** a sine plus a sine an octave up at a quarter of the gain, 0.01 s attack to `noteGain`, `setTargetAtTime(0, …, noteDecayS / 3)`.
- Wiring: pads and notes → one `BiquadFilterNode` `lowpass` `lowpassHz` → `out` (dry), and lowpass → `DelayNode` (`delayS`) → wet gain (`delayMix`) → `out`, with delay → feedback gain (`delayFeedback`) → delay.
- Probe names: `'chord:<first midi>'`, `'note:<midi>'`.
- Music plays only while `targets.groups.music > 0` (the engine skips `music.frame` otherwise, so no notes pile up).

### 10.5 Tests (`tests/musicScore.test.ts`)

- `musicEvents(mulberry32(155), 0, 600, START_CURSOR)`: chords every 8–14 s (count 43–75), never the same chord twice in a row; every note's midi in `{62, 64, 66, 69, 71, 74, 76, 78, 81, 83}`; consecutive sounding notes at most 2 scale degrees apart (octave aside); note count between 600/6 · 0.6 and 600/2 · 0.9 (60–270).
- The same seed and times give the same events (deterministic); splitting `[0, 600)` into frames of 0.05 s gives the same events as one call.

### 10.6 Browser checks (`scripts/shots-m91.mjs`, group `m91`)

Phone 390 × 844, test clock, `?ws=10&cam=map`, `soundOn(page)`: `page.waitForTimeout(1000)` 12 times (app time drives the music clock); `events` holds at least one `'chord:'` and one `'note:'`. Then `openSettings(page)`, uncheck `sound-music`, `closeSettings(page)`; count the `'chord:'` and `'note:'` entries, `page.waitForTimeout(1000)` 10 times, count again: the same (if the list was full at 50, compare its last entry instead).

Run `SHOTS_ONLY=m91`. Add `"m91": 300`.

### 10.7 Done when / not in M91 (write "Decided in the M91 PR" notes under this heading)

Checks and tests pass; on the phone: with Sound on, a quiet, slow music under the wind, never the same twice; Music off in Settings stops it within a few seconds while the rest goes on. The PR says `Closes #155`. Not in M91: a choice of tunes. (A volume of its own for the music was excluded here; the owner asked for one volume slider per group on the M91 PR, see below.)

**Decided in the M91 PR** (recommended; merging accepts it):

- The music is left as specified and tuned after the owner's phone test (no number is changed). `"m91"` in `ci-times.json` is the measured time (13 s), not 300.
- `musicEvents` emits the chord at `chords[cursor.chord]` and then picks the next one, so the first chord of every visit is D (`chords[0]`); `START_CURSOR` is unchanged. The JSON pairs (`chordEveryS`, `noteEveryS`, `noteOctaves`) are typed `number[]` (a JSON import cannot be a tuple).
- The music's one-shot nodes (pad oscillators and notes) are not counted towards `maxOneShots`: they are few, long and quiet, and counting them would let the music starve the gulls and the clicks.
- **Owner request on the M91 PR (volume balance):** Settings → Sound has, under each of the three switches (Music, Surroundings, Boat sounds), its own 0–100 slider (`sound-music-volume`, `sound-surroundings-volume`, `sound-boat-volume`, each with `…-value` text), and the overall slider is now labelled "Overall volume" and starts at 50 (was 70). A group slider starts at 100 and multiplies on top of the overall volume and the group's fixed gain, so it can only turn a group down; the balance is set by turning the others down or the overall one up. A device that saved an overall volume earlier keeps it; the group sliders start at 100 there. Still a device preference: not in the link or the setup file.
- **Owner request on the M91 PR (variability: "yes, add this"):** the music now changes slowly over a visit, so it feels like it evolves. All of it is deterministic (the seed plus the music's own clock), and all numbers are in the `music` block (tunable): `lowpassMinHz` 900, `brightnessPeriodsS` [83, 137], `intervalScale` [0.6, 1.6], `intervalPeriodS` 211, `keys` [0, 5, 7, −2], `keyEveryS` [150, 270], `firstKeyChangeS` 180.
  - **Brightness:** `musicShape(tS)` (pure) gives the low-pass cutoff: two slow waves of 83 s and 137 s (weights 0.6 and 0.4, so the pattern does not come round again for hours) between `lowpassMinHz` (dark) and `lowpassHz` (bright, the old fixed value). `music.ts` moves the filter to it every frame with `smoothTo(…, 2 s)`.
  - **Busy and sparse:** `intervalScale(tS)` (pure) is a slow wave of 211 s between 0.6 and 1.6; each note interval is multiplied by it at the time of the note. No extra random draws.
  - **Key changes:** from `firstKeyChangeS` on, at the first chord at or after `nextKeyS`, the key moves to a different one of `keys` (semitones from D: D, G, A, C), and `nextKeyS` advances by a random `keyEveryS`. Chords and notes are transposed by the key in effect; the chord list and the scale stay as in 10.2. `MusicCursor` gets `nextKeyS` and `key`, `START_CURSOR` has `nextKeyS: 180, key: 0`, and every `MusicEvent` carries `key` (the semitones in effect). Draws: after a chord's two, a key change adds two (the new key, the next key interval). The first 180 s are always in D; the first chord of a visit is still D.
  - This replaces the guarantee in 10.5 that every note is in `{62 … 83}`: now every note is in that set once the event's `key` is subtracted (the lowest chord note is 41, the highest note 90). `tests/musicScore.test.ts` checks the key rules, the density swing and `musicShape`/`intervalScale`.
- `createMusic` takes a fifth argument, the look-ahead, defaulting to `master.lookaheadS`; a note due in the frame plays at `currentTime + (atS − clock)`.

---

## 11. Planning decisions (owner, 2026-11-07: "accept all", plus birds and the computer's sound button)

1. **Sound is off on a first visit** and switched on in Settings (then remembered on that device): surprise sound on a phone in public is unwelcome, and phones refuse sound before a tap anyway.
2. **Generated sound only**, no recorded samples: no files, no licence check, works offline; a sound that turns out badly can be replaced by a public-domain recording later, one at a time.
3. **No rain** until a weather phase can show it.
4. **Once on, all three groups are on**; music at a third of the other sounds.
5. **Pause:** boat sounds stop, surroundings at half, music goes on; ×4 and ×16 play sounds at normal speed.
6. **Settings → Sound** on every layout, and (owner) **a speaker chip over the 3D view on a computer** (side and wide layouts), none on a phone.
7. **Birds** (owner): gulls in every place (rarer and quieter in open water), small birds near land (marina and bay), by day only, fewer in strong wind.
8. **The sound numbers live in `content/audio/sounds.json`** (recommended; merging accepts it), not in the boat file: they are not about the boat (only the engine's firing rate is, recorded as an assumption in `BOAT_REFERENCE.md`); the CLAUDE.md rule "no magic numbers in code" is kept.
9. **Sound is not app state and not in the link or the setup file** (recommended; merging accepts it): it is a device preference like the folded time bar; a shared link must never start sound on someone else's phone.
