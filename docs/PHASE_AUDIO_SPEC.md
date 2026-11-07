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
- **One way to drive a voice.** Every frame, `soundTargets` (pure) returns for each voice a `VoiceTarget { gain, hz, rate }`; the engine moves each Web Audio parameter towards it with `param.setTargetAtTime(value, ctx.currentTime, data.master.smoothingS)`, and only when the value changed by more than 0.5 % (a gain step of 0.005, a frequency or rate change of 0.5 %), so the automation list does not grow every frame. One-shot sounds (a thump, a click, a gull) are `SoundEvent`s or pulses scheduled by the engine.
- **The frame's real time.** The engine is driven with the frame's real seconds (`raw` in `app.ts`, capped at 0.1 s), not the simulation's `dt`: on Pause the wind still blows; at ×16 a click is still a click.
- **Randomness** (gulls, halyard taps, music notes, flap jitter) comes from `mulberry32` (`src/model/random.ts`) with the seeds in the data file, never `Math.random`, so a browser check sees the same sequence.
- **Storage.** The key is `sail-learn.sound` (JSON); every read and write is wrapped in `try`/`catch` through `globalThis.localStorage?.`, as `src/ui/timeBar.ts` does. A browser that blocks storage plays sound for the visit and starts silent on the next.
- **Autoplay rule.** Browsers let a page start sound only inside a tap or key press. The `AudioContext` is created (or resumed) only in such a handler: the Sound switch, the speaker chip, or, when Sound was left on, the first `pointerdown` or `keydown` anywhere on the page. Until then nothing plays, and nothing says so (the switch shows On).
- **iPhone silent switch.** Safari mutes Web Audio while the ring/silent switch is on silent. The app does not override it (no `navigator.audioSession`): the owner's checklists say so.

### 3.2 Shared helpers (new, M87)

| Name | File | Signature | Behaviour |
|---|---|---|---|
| `SOUND` | `src/audio/soundData.ts` (pure) | `const SOUND: SoundData` | `content/audio/sounds.json`, typed (the type grows each milestone) |
| `DEFAULT_SOUND_PREFS` | `src/audio/prefs.ts` (pure) | `SoundPrefs` | `{ on: false, music: true, surroundings: true, boat: true, volume: 70 }` |
| `parseSoundPrefs` | `src/audio/prefs.ts` | `(text: string \| null) => SoundPrefs` | JSON → prefs; each missing or wrong-typed field takes its default; `volume` rounded and clamped to 0–100; bad JSON → defaults |
| `getSoundPrefs` | `src/audio/prefs.ts` | `() => SoundPrefs` | The prefs now (read from storage once, on first call) |
| `setSoundPrefs` | `src/audio/prefs.ts` | `(patch: Partial<SoundPrefs>) => SoundPrefs` | Merges, clamps, writes storage, then calls every listener **synchronously** (so the engine can start inside the same tap) |
| `onSoundPrefs` | `src/audio/prefs.ts` | `(listener: (prefs: SoundPrefs) => void) => () => void` | Subscribe; returns the unsubscribe |
| `soundTargets` | `src/audio/levels.ts` (pure) | `(state: AppState, previous: AppState, prefs: SoundPrefs, dtS: number, data?: SoundData) => SoundTargets` | 3.4 and each milestone |
| `pulses` | `src/audio/pulses.ts` (pure) | `(phase: number, ratePerS: number, dtS: number) => { offsetsS: number[]; phase: number }` | 3.4 |
| `poissonTimes` | `src/audio/pulses.ts` (pure) | `(rng: () => number, ratePerS: number, dtS: number) => number[]` | 3.4 |
| `createSoundEngine` | `src/audio/engine.ts` | `(store: Store) => SoundEngine` | 4.2 |

```ts
// src/audio/levels.ts
export type SoundGroup = 'music' | 'surroundings' | 'boat';
export interface SoundPrefs { on: boolean; music: boolean; surroundings: boolean; boat: boolean; volume: number }
export interface VoiceTarget { gain: number; hz: number; rate: number } // unused fields are 0
export type VoiceId = 'wind' | 'whistle' | 'waves' | 'hull'; // M88–M90 add theirs to this union
export type SoundEvent = never; // M88 makes it a union of objects with `kind`
export interface SoundTargets {
  groups: Record<SoundGroup, number>;
  voices: Record<VoiceId, VoiceTarget>;
  events: SoundEvent[];
}
export const VOICE_GROUP: Record<VoiceId, SoundGroup>; // which bus each voice plays through
```

`SoundPrefs` is defined in `levels.ts` and re-exported by `prefs.ts`.

### 3.3 Sources

- Web Audio API: MDN "Web Audio API", "AudioContext" (`resume`, `suspend`, `state`), "AudioParam.setTargetAtTime", "BiquadFilterNode", "AudioBufferSourceNode" (`loop`), "Autoplay guide for media and Web Audio APIs" (a context starts only from a user gesture).
- Page Visibility: MDN "Document: visibilitychange event".
- iOS: WebKit's notes on Web Audio and the ring/silent switch (Safari 16.4 release notes, `navigator.audioSession`; not used, 3.1).
- Sound design facts used as assumptions (no copied text): a four-stroke engine fires once every two turns per cylinder, so a 4-cylinder engine fires twice per turn (`firesPerRev`); a winch's pawls click as the drum turns in the hauling direction; an anchor chain rattles once per link over the gypsy. The engine's cylinder count is an assumption (`docs/BOAT_REFERENCE.md`, M88).

### 3.4 Shared formulas (M87)

- `clamp01(x) = min(1, max(0, x))`; `ramp(x, a, b) = clamp01((x − a) / (b − a))`.
- **Groups:** `groups[g] = prefs.on && prefs[g] ? data.master.groupGain[g] · prefs.volume / 100 · pause(g) : 0`, where `pause('boat') = state.paused ? 0 : 1`, `pause('surroundings') = state.paused ? data.master.pausedSurroundings : 1`, `pause('music') = 1`.
- When `prefs.on` is false, `soundTargets` still returns every voice (the engine is suspended anyway); tests call it with `on: true`.
- **`pulses(phase, rate, dtS)`:** `p = phase + rate · dtS`; one offset for every whole number crossed: for `k = 1 … floor(p)`, `offsetsS.push((k − phase) / rate)`; returns `phase: p − floor(p)`. `rate ≤ 0` or `dtS ≤ 0` → `{ offsetsS: [], phase }`. At most 40 offsets (a cap; the rest are dropped, the phase still advances).
- **`poissonTimes(rng, rate, dtS)`:** events of a Poisson process within the frame: `t = −ln(1 − rng()) / rate`; while `t < dtS`, push `t` and add another `−ln(1 − rng()) / rate`. `rate ≤ 0` → `[]`. At most 8.
- The engine schedules a pulse or event at `ctx.currentTime + data.master.lookaheadS + offset`.

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
| M87 | `content/audio/sounds.json`, `src/audio/soundData.ts`, `src/audio/levels.ts`, `src/audio/prefs.ts`, `src/audio/pulses.ts`, `src/audio/engine.ts`, `src/audio/support.ts`, `src/audio/noise.ts`, `src/audio/surroundingsVoices.ts`, `src/ui/soundSettings.ts`, `src/ui/soundChip.ts`, `tests/soundLevels.test.ts`, `tests/soundPrefs.test.ts`, `scripts/shots-m87.mjs` | `src/app/app.ts`, `src/ui/settingsMenu.ts`, `src/style.css`, `content/lang/{en,ru}/ui.json`, `scripts/shots.mjs` (registration), `.github/ci-times.json`, `docs/CODE_MAP.md` |
| M88 | `src/audio/boatVoices.ts`, `scripts/shots-m88.mjs` | `content/audio/sounds.json`, `src/audio/levels.ts`, `src/audio/soundData.ts`, `src/audio/engine.ts`, `tests/soundLevels.test.ts`, `scripts/shots.mjs`, `.github/ci-times.json`, `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md` |
| M89 | `src/audio/gearVoices.ts`, `scripts/shots-m89.mjs` | as M88, without `BOAT_REFERENCE.md` unless a value is boat-specific |
| M90 | `src/audio/placeVoices.ts`, `scripts/shots-m90.mjs` | as M88 |
| M91 | `src/audio/music.ts` (Web Audio), `src/audio/musicScore.ts` (pure), `tests/musicScore.test.ts`, `scripts/shots-m91.mjs` | `content/audio/sounds.json`, `src/audio/soundData.ts`, `src/audio/engine.ts`, `scripts/shots.mjs`, `.github/ci-times.json`, `docs/CODE_MAP.md` |

Each milestone adds its live group to `.github/ci-times.json` (`"m87": 300` until its time is known; the test of PHASE_LAUNCH_SPEC 6.6 fails otherwise).

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
- **Start:** `onSoundPrefs` and a capture-phase `pointerdown` and `keydown` listener on `document` (kept while `prefs.on` and the context is not `running`; removed once it runs). In the handler: if `prefs.on` and `supported` and not hidden: create the context the first time (`new (window.AudioContext ?? window.webkitAudioContext)()`), build the graph and the voices, then `ctx.resume()`. When `prefs.on` becomes false: `ctx.suspend()`.
- **Hidden:** `document.addEventListener('visibilitychange', …)`: hidden → `suspend()`; visible and `prefs.on` → `resume()`.
- **`frame(realDtS)`:** if there is no context, or it is not `running`, only keep `previous = store.getState()` and return. Else `dt = min(0.1, max(0, realDtS))`, `targets = soundTargets(state, previous, getSoundPrefs(), dt)`, set the group gains and voice params (3.1), schedule the frame's pulses and events, store `previous = state`. The whole body is in `try`/`catch`: on the first error, `console.error` once, suspend the context and stop updating (the app keeps running).
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
- After `createAlertCentre(…)`: `createSoundChip(chipRow, sound.supported);` (it inserts itself before the gear, so the row on a computer reads: mode chip, camera chip, sound chip, gear; the alert chip on a phone stays directly before the gear as M51 placed it).
- In `loop`, after the `debug.update(…)` call: `sound.frame(raw)` where `raw` is the frame's seconds computed at the top of the loop (move `raw` out of the `try` block into a `const` before it). `frame` catches its own errors.
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

- **wind** (surroundings): `aws = state.rig.wind.awsKn` (the apparent wind at the boat; it includes the gust, because `state.wind.twsKn` does). `level = ramp(aws, minKn, maxKn) ^ curve`. `gain = wind.gain · level`, `hz = lowHz + (highHz − lowHz) · level`, `rate = flutterHz`. Voice: noise → `BiquadFilterNode` `bandpass` (frequency `hz`, Q `wind.q`) → gain; the engine multiplies the gain by `1 + flutterDepth · sin(2π · rate · t)` with an `OscillatorNode` (sine, `rate` Hz) through a `GainNode` (`flutterDepth · gain`) into the voice gain's `gain` param.
- **whistle** (surroundings; the rigging singing in strong wind): `w = ramp(aws, whistle.fromKn, whistle.toKn)`; `gain = whistle.gain · w`, `hz = lowHz + (highHz − lowHz) · w`, `rate = 0`. Voice: noise → bandpass (`hz`, Q `whistle.q`) → gain.
- **waves** (surroundings): `hs = significantHeightM(waveTrains(state.sea))`, `periodS = seaSize(state.sea.windKn, fetchKm(state.sea.setting)).periodS` (`src/model/waves.ts`). `level = max(waves.floor, min(1, sqrt(hs / refHeightM)))`. `gain = waves.gain · level`, `hz = waves.lowpassHz`, `rate = 1 / periodS`. Voice: noise → `lowpass` (`hz`) → gain, with the swell: gain × `(1 − swellDepth / 2) + (swellDepth / 2) · sin(2π · rate · t)` (an oscillator as for the wind's flutter).
- **hull** (surroundings; the water along the hull): `kn = |state.boat.speedMps| · 1.943844`, `h = ramp(kn, 0, hull.maxKn)`; `gain = hull.gain · h`, `hz = lowHz + (highHz − lowHz) · h`, `rate = 0`. Voice: noise → bandpass (`hz`, Q `hull.q`) → gain. Held still: speed 0 → silent.
- Edge cases: no wind (`aws = 0`) → wind and whistle 0; flat sea (`hs = 0`) → waves at the floor (0.027, a faint lap); Pause → the groups (3.4), the voices unchanged.

### 6.4 Settings → Sound (`src/ui/soundSettings.ts`)

`buildSoundField(): HTMLElement`, placed in `buildSettingsBody` (`src/ui/settingsMenu.ts`) **right after `languageGroup`**. A `fieldset class="field sound-setting"` with `data-testid="sound-setting"`:

1. `legend` `sound.label`; `p.hint` `sound.hint`.
2. The main switch, the same markup as the Clock switch (`label.toggle` with a checkbox `id="sound-toggle"`, `data-testid="sound-switch"`, text `sound.on`).
3. Three switches in the same markup, indented under it (`class="toggle sound-group"`, `margin-inline-start: 24px`): `sound-music` (`sound.music`), `sound-surroundings` (`sound.surroundings`, with `p.hint` `sound.surroundings.hint`), `sound-boat` (`sound.boat`, with `p.hint` `sound.boat.hint`). They stay usable while Sound is off (they say what plays once it is on).
4. Volume: `label` `sound.volume` for `input type="range" id="sound-volume" min="0" max="100" step="5"` (`data-testid="sound-volume"`), the engine lever's slider look (the app's default `input[type=range]` styling), full width, height ≥ 44 px (`min-height: var(--touch)`), and the value as text after it (`sound.volumeValue`, e.g. "70 %").
5. Without Web Audio (`!soundSupported()`): every input `disabled`, and `p.hint` `sound.unsupported` after the legend.

Each input's `change` (the range's `input`) calls `setSoundPrefs({ … })`; `onSoundPrefs` keeps every input in step (the chip can change `on`). No store action: the setting is not app state (3.1).

### 6.5 The speaker chip (`src/ui/soundChip.ts`, computer only)

`createSoundChip(row: HTMLElement, supported: boolean): HTMLButtonElement`: a `button type="button" class="view-chip sound-chip"`, `data-testid="sound-chip"`, inserted before `row.querySelector('[data-testid="settings-button"]')`, square like the gear (`.sound-chip { width: var(--touch); height: var(--touch); padding: 0; }`). Hidden on a phone: add `html[data-layout='stacked'] .sound-chip` to the M51 rule that hides the mode chip and the gear. Not built when `!supported`.

- Icon: an inline SVG, 24 × 24, `currentColor`, built like `gearIcon()`: a speaker (a rectangle and a triangle) with two arcs when on, with an × instead of the arcs when off. No emoji, no image file.
- `aria-pressed` = `prefs.on`; `aria-label` and `title` = `sound.chipOn` when on ("Sound on: tap to mute"), `sound.chipOff` when off ("Sound off: tap to play").
- Tap → `setSoundPrefs({ on: !getSoundPrefs().on })`. It follows `onSoundPrefs`.
- Spacing: the gear keeps `margin-left: 0` (the right-aligned row of M38/M52); the chips sit `gap` apart as the row already spaces them. Check: no overlap with the gear or the camera chip at 1024 × 768 and 1440 × 900.

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
- `parseSoundPrefs(null)` and `parseSoundPrefs('nope')` equal `DEFAULT_SOUND_PREFS`; `parseSoundPrefs('{"on":true,"volume":250}')` → `on: true, volume: 100`, the rest default; `'{"volume":-3,"music":"yes"}'` → `volume: 0, music: true` (the default, the value was not a boolean); `'{"volume":42.6}'` → 43.
- `setSoundPrefs({ on: true })` calls a listener once with `on: true`, synchronously (before `setSoundPrefs` returns); the unsubscribe stops it. In node `localStorage` is missing: it must not throw.

`tests/soundLevels.test.ts` (states from `createStore` / the existing test helpers, with `rig.wind`, `sea`, `boat.speedMps` set by spreading; `prefs = { ...DEFAULT_SOUND_PREFS, on: true }`):
- Wind: `aws` 2 → `wind.gain` 0; 35 → 0.5 and `hz` 1200; 18.5 → gain 0.2872 ± 0.001, `hz` 816.9 ± 0.5; 40 → 0.5 (clamped).
- Whistle: 20 → 0; 27.5 → gain 0.06, `hz` 1250; 35 → 0.12.
- Gust: the same state with `rig.wind.awsKn` raised from 12 to 18 → `wind.gain` higher (strictly).
- Waves: `sea = { setting: 'open', windKn: 15, dirDeg: 0 }` → `hs` 1.48 (prototype), gain 0.316 ± 0.005, `rate` 0.156 ± 0.003 (period 6.4 s); `'flat'` → gain 0.027 ± 0.0005; `'coastal'`, 15 kn → gain 0.214 ± 0.005 (`hs` 0.68).
- Hull: 0 m/s → 0; 2.315 m/s (4.5 kn) → gain 0.15 ± 0.001, `hz` 1200 ± 1; 6 m/s (11.7 kn) → 0.3.
- Groups: `on: false` → all three 0; `on: true`, volume 70 → `surroundings` 0.7, `boat` 0.7, `music` 0.231 ± 0.0005; `paused: true` → `surroundings` 0.35, `boat` 0, `music` 0.231; `music: false` → `music` 0.
- `pulses(0, 10, 0.25)` → 2 offsets `[0.1, 0.2]`, phase 0.5; `pulses(0.5, 10, 0.2)` → offsets `[0.05, 0.15]`, phase 0.5 (±1e-9); `pulses(0.2, 0, 1)` → `[]`, phase 0.2; a rate of 1,000 for 1 s → 40 offsets.
- `poissonTimes(mulberry32(1), 0, 1)` → `[]`; over 1,000 frames of 0.05 s at rate 2 the count is 100 ± 20; every time is in `[0, dtS)`.

### 6.8 Browser checks (`scripts/shots-m87.mjs`, group `m87`, registered in `shots.mjs`)

Export `liveM87Checks(onTestClock)` and `M87_SCENES` (none: `[]`). Every label starts with `m87-`. Read the probe with `page.evaluate(() => window.__sailSound…)`.

1. **Phone 390 × 844**, `?v=1&m=easy`: open Settings (`openSettings(page)`, `scripts/ui.mjs`); `sound-setting` visible right after the Language block; `sound-switch` unchecked; `probe.context()` is `'none'`; screenshot `m87-settings-phone.png`. No `sound-chip` visible.
2. Tap `sound-switch`: within 2 s `probe.context()` is `'running'` and `targets()` is not null; `localStorage['sail-learn.sound']` has `"on":true`.
3. **Wind follows the wind** (test clock): `?v=1&m=easy&ws=5` vs `?v=1&m=easy&ws=25` (`ws` is `ctl_wind_speed`), Sound switched on as in 2: after `page.waitForTimeout(1000)`, `targets().voices.wind.gain` is higher at 25 kn than at 5 kn, and `whistle.gain` is 0 at 5 kn and > 0 at 25 kn.
4. **Pause:** with sound on, tap the time bar's Pause: `targets().groups.boat === 0`, `groups.surroundings` is half its value before.
5. **Hidden:** `page.evaluate` a `visibilitychange` with `document.visibilityState` overridden to `'hidden'` (`Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })`, then dispatch the event): `context()` becomes `'suspended'`; set it back to `'visible'` and dispatch: `'running'`.
6. **Remembered:** a new page in the same context at `?v=1&m=easy`: `context()` is `'none'` until a tap anywhere on the 3D view; after the tap, `'running'`.
7. **Computer 1440 × 900:** `sound-chip` visible, directly before the gear, not overlapping it (boxes); `aria-pressed="false"` with sound off; tap it → `aria-pressed="true"`, `context()` `'running'`, and Settings' `sound-switch` checked. Screenshot `m87-chip-wide.png`. Same layout check at 1024 × 768.
8. Russian (`lang=ru`): the Sound block shows, no missing-string marks.

Run `SHOTS_ONLY=general,m25,m38,m87` locally (the chip row and the settings); put `CI groups: m25, m38, m52` in the PR description. Add `"m87": 300` to `.github/ci-times.json`.

### 6.9 Done when / not in M87

Checks and tests pass; the owner hears on the phone: silence at first, then wind and waves after switching Sound on, louder in strong wind and swelling in gusts, quieter on Pause, stopped when the app is in the background. Not in M87: any boat sound, birds, the marina, music (later milestones; their switches are already there and simply have nothing to play yet).

---

## 7. M88: Sails, engine and bumps

**Independent review: not needed** (sound only; reads existing state; the gap check covers it).

### 7.1 Files

As 4.1. Voices in `src/audio/boatVoices.ts`.

### 7.2 Data (add to `content/audio/sounds.json`, verbatim; **tunable**)

```json
"flap": { "fromKn": 3, "toKn": 25, "gain": 0.4, "baseHz": 2, "perKnHz": 0.15, "bandHz": 1800, "q": 1.2, "attackS": 0.005, "decayS": 0.06, "jitter": 0.2, "seed": 88 },
"full": { "fromKn": 4, "toKn": 30, "gain": 0.12, "bandHz": 500, "q": 0.6 },
"engine": { "firesPerRev": 2, "gain": 0.35, "idleShare": 0.45, "lowpassBaseHz": 300, "lowpassPerHz": 6, "subGain": 0.5, "startS": 0.9, "startFromHz": 140, "startToHz": 220, "startGain": 0.25 },
"contact": {
  "thumpHz": 65, "noiseLowpassHz": 400,
  "gain": { "fender": 0.25, "touch": 0.35, "bump": 0.6, "knock": 0.8, "hit": 1 },
  "decayS": { "fender": 0.25, "touch": 0.15, "bump": 0.25, "knock": 0.35, "hit": 0.5 },
  "squeakFromHz": 320, "squeakToHz": 210, "squeakS": 0.25, "squeakGain": 0.15
}
```

`docs/BOAT_REFERENCE.md`: one assumption row: "Engine sound (M88): a 4-cylinder four-stroke diesel, so the engine fires twice per turn (`sounds.json` `engine.firesPerRev`); 800 rpm → 26.7 Hz, 2,500 rpm → 83.3 Hz | **Assumption** (sound only)".

### 7.3 Formulas (add to `soundTargets`; `VoiceId` adds `'flapMain' | 'flapJib' | 'fullMain' | 'fullJib' | 'engine'`, all group `boat`)

- `aws = state.rig.wind.awsKn`. For `sail` in `main`, `jib`: `ts = trimState(sail, state.rig, state.rig.wind.awaDeg)` (`src/model/trim.ts`); `share` = `state.rig.applied.mainFurl / 100` for the main, `state.rig.jibSolution.unfurled` for the jib (both 0–1, 1 = all out).
- **flap** (`flapMain`, `flapJib`): when `ts === 'luffing'`: `gain = flap.gain · ramp(aws, fromKn, toKn) · share`, `rate = baseHz + perKnHz · aws`, `hz = bandHz`; otherwise all 0. Voice: noise → bandpass (`hz`, Q) → a gain driven by pulses: the voice's base gain stays 0; for each `pulses()` offset (rate × (1 ± `jitter` · (rng() · 2 − 1)), rng from `mulberry32(flap.seed)`) the engine schedules on the voice gain `setValueAtTime(0, t)`, `linearRampToValueAtTime(gain, t + attackS)`, `setTargetAtTime(0, t + attackS, decayS / 3)`. A torn sail (`isTorn(state.sailDamage, sail)`) flaps as it is (no extra).
- **full** (`fullMain`, `fullJib`): when `ts` is `good`, `stalled` or `pushed`: `gain = full.gain · ramp(aws, fromKn, toKn) · share`, `hz = bandHz`; `furled`, `blanketed`, `luffing` → 0. Voice: noise → bandpass → gain.
- **engine**: `{ running, rpm } = state.engine`; idle and max from `boat.physics.engine` (`idleRpm` 800, `maxRpm` 2500; read through the boat in use, `src/model/boat.ts` `boat`). `r = ramp(rpm, idleRpm, maxRpm)`; `hz = rpm / 60 · firesPerRev`; running: `gain = engine.gain · (idleShare + (1 − idleShare) · r)`; not running: `gain = engine.gain · idleShare · clamp01(rpm / idleRpm)` (the run-down as rpm falls to 0). Voice: a `sawtooth` oscillator at `hz` plus a `square` oscillator at `hz / 2` (gain `subGain`) → `lowpass` at `lowpassBaseHz + lowpassPerHz · hz` (Q 1) → gain.
- `SoundEvent` becomes `{ kind: 'contact'; severity: Severity } | { kind: 'engineStart' }` (`Severity` from `src/model/contact.ts`). Events:
  - `engineStart` when `state.engine.running && !previous.engine.running`. Sound: a sawtooth sweeping `startFromHz` → `startToHz` over `startS` (exponential ramp), bandpass 400 Hz Q 1, gain `startGain` with a 0.05 s attack and a 0.2 s release; group boat.
  - `contact` when `state.contact.reports[0] !== undefined && state.contact.reports[0] !== previous.contact.reports[0]`, with that report's `severity`. Sound: a sine at `thumpHz` and noise → lowpass `noiseLowpassHz`, both through one gain: 0.005 s attack to `contact.gain[severity]`, then `setTargetAtTime(0, …, decayS[severity] / 3)`, stopped after `decayS · 2`; `fender` also plays the squeak: a sine `squeakFromHz` → `squeakToHz` over `squeakS`, gain `squeakGain`. Group boat.
- Probe event names: `'engineStart'`, `'contact:<severity>'`.

### 7.4 Tests (`tests/soundLevels.test.ts`)

Build states with a solved rig: use the existing helper the Phase 2 tests use to make a sailing state (`grep -n "export function" tests/*Helpers*.ts tests/helpers*.ts`; if none fits, `createStore` + dispatch `step` 20 times at 0.05 s with the controls set), then read `trimState` from the state itself so the test does not hard-code the trim:
- A state whose main `trimState` is `luffing` at `aws` 15 kn, main all out: `flapMain.gain` = 0.4 · (12/22) = 0.218 ± 0.002, `rate` 4.25 ± 0.01; `fullMain.gain` 0.
- A state whose main is `good` at 15 kn: `flapMain` 0, `fullMain.gain` = 0.12 · (11/26) = 0.0508 ± 0.001.
- Main furled (`applied.mainFurl` 0): `flapMain` and `fullMain` 0.
- Engine: running at 800 rpm → `gain` 0.1575, `hz` 26.67 ± 0.01; 2500 rpm → 0.35, 83.33 ± 0.01; stopped at 400 rpm → 0.0788 ± 0.0005; stopped at 0 → 0.
- Events: `previous.engine.running` false, `state.engine.running` true → `[{ kind: 'engineStart' }]`; the same state twice → no events. A new contact report of severity `bump` → one `contact` event with `bump`; the same `reports[0]` object in both → none.

### 7.5 Browser checks (`scripts/shots-m88.mjs`, group `m88`)

Test clock; Sound switched on by tapping `sound-switch` (phone) as M87's check 2 (put a helper `soundOn(page)` in `scripts/ui.mjs` that opens Settings, taps the switch if unchecked, closes Settings and waits for `context() === 'running'`; M89–M91 use it).
1. `?v=1&m=easy&ws=15&ms=100` (`ms` is `ctl_mainsheet`; check in `src/app/urlState.ts` which end of the range is let out, and use that end): `targets().voices.flapMain.gain > 0`. Sheet in to the "good" trim (the Easy preset or key the Phase 2 checks use): `flapMain.gain` 0 and `fullMain.gain > 0`.
2. Engine: Start (the Engine section's Start button), lever to 60 %: `probe.events()` contains `engineStart`; `voices.engine.hz` higher at 60 % than at 0 % after 2 s each.
3. Contact: the marina link the M43 checks use for a bump (`grep -n "bump" scripts/shots-m43.mjs`): after the bump, `events()` contains a `contact:` entry.
4. Phone 390 × 844 screenshot `m88-sound-phone.png` of Settings → Sound (unchanged layout).

Run `SHOTS_ONLY=m87,m88`. Add `"m88": 300`.

### 7.6 Done when / not in M88

Checks and tests pass; on the phone: let the mainsheet out in 15 kn and hear the sail flap, sheet in and it goes quiet with a soft rush; start the engine and hear it rise with the lever; bump the pontoon and hear the thump. Not in M88: winches, ropes, the anchor, the thrusters (M89).

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

### 8.3 Formulas (`VoiceId` adds `'winchMotor' | 'winchClicks' | 'ropeRun' | 'windlass' | 'chain' | 'thrusterBow' | 'thrusterStern'`, all group `boat`)

Realistic ropes (`state.settings.ropesMode === 'realistic'`), over `Object.values(state.realistic.winches)` (`WinchState`, `src/model/realistic.ts`):
- **winchMotor:** the winches with `button && !cutOut`; none → 0. Else take the one with the largest `|drumSpeed|`: `s = clamp01(|drumSpeed| / refSpeedMps)`; `gain = winchMotor.gain`, `hz = (baseHz + speedHz · s) · (1 − strainDrop · clamp01(strain ?? 0))`. Voice: sawtooth at `hz` → bandpass (`hz`, Q 4) → gain.
- **winchClicks:** `rate = min(maxRate, Σ max(0, drumSpeed) · perMetre)` (the pawls click only when the drum turns in the hauling direction, `drumSpeed > 0`, by motor or handle) `+ (handleReport?.at === 'gearbox' ? |handleReport.turnsPerS| · gearboxPerTurn : 0)`, capped again at `maxRate`; `gain = rate > 0 ? winchClicks.gain : 0`. Voice: pulses; each click a noise burst → highpass `clickHz` → gain, 0.001 s attack, `clickS` decay.
- **ropeRun:** over `Object.values(state.realistic.reports)` (`TailReport`) whose `motion` is `'running'` or `'easing'`: `v = max |speedMps|`; `x = clamp01(v / refSpeedMps)`; `gain = ropeRun.gain · x`, `hz = lowHz + (highHz − lowHz) · x`. Voice: noise → bandpass → gain.
- Event `{ kind: 'cutOut' }` when any winch's `cutOut` turns from false to true (same id in `previous`). Sound: a square at `cutOut.hz` for `cutOut.s`, gain `cutOut.gain`. Probe name `'cutOut'`.

Easy ropes (`ropesMode === 'easy'`): the winches are electric and unseen. `keys = ['mainsheet', 'vang', 'toppingLift', 'mainFurl', 'jibSheet', 'jibFurl']` of `AppliedControls` (`src/model/sim.ts`; values in %): `movePct = dtS > 0 ? Σ |state.rig.applied[k] − previous.rig.applied[k]| / dtS : 0`; `x = clamp01(movePct / easyRopes.refPctPerS)`; `winchMotor`: `gain = winchMotor.gain · x`, `hz = baseHz + speedHz · x`; `winchClicks`: `rate = min(maxRate, movePct · clicksPerPct)`, `gain` as above; `ropeRun` 0.

Both modes:
- **windlass:** `on = state.anchor.windlass !== 'off' && !state.anchor.cutOut`; `gain = on ? windlass.gain : 0`, `hz = windlass === 'up' ? upHz : downHz`. Voice: sawtooth → bandpass (Q 3) → gain.
- **chain:** `v = dtS > 0 ? |state.anchor.chainOutM − previous.anchor.chainOutM| / dtS : 0`; `rate = min(maxRate, v · perMetre)`; `gain = rate > 0 ? chain.gain : 0`. Voice: pulses; each a noise burst → bandpass `clickHz` (Q 3), `clickS` decay.
- Events `{ kind: 'anchorDown' }` when `previous.anchor.phase === 'stowed' && state.anchor.phase !== 'stowed'`, `{ kind: 'anchorUp' }` when it becomes `'stowed'` from another phase. Sound: a sine at `anchorClank.hz` and one at `anchorClank.hz · 1.48`, `anchorClank.s` decay. Probe names `'anchorDown'`, `'anchorUp'`.
- **thrusterBow / thrusterStern:** `state.thrusters.bow !== 0` → `gain = thruster.gain`, `hz = bowHz` (stern: `sternHz`); else 0. The engine uses `setTargetAtTime` with `rampS / 3` for this voice (a motor spinning up). Voice: sawtooth + noise → bandpass (Q 2) → gain.

`SoundEvent` adds `{ kind: 'cutOut' } | { kind: 'anchorDown' } | { kind: 'anchorUp' }`.

### 8.4 Tests

- Realistic: one winch with `button: true, cutOut: false, drumSpeed: 0.25, strain: 0.5` → `winchMotor.gain` 0.22, `hz` = (320 + 450) · 0.875 = 673.75 ± 0.5; `winchClicks.rate` 7.5; with `drumSpeed: −0.25` (easing) → `rate` 0, motor still on. `cutOut` false → true → one `cutOut` event.
- Handle at the gearbox, `turnsPerS: 1.5` → `winchClicks.rate` 18.
- A tail report `motion: 'running', speedMps: −0.5` → `ropeRun.gain` 0.1, `hz` 2250.
- Easy: `mainsheet` moved by 0.5 % in `dtS` 0.05 → `movePct` 10 → `winchMotor.gain` 0.11, `winchClicks.rate` 10. No move → both 0.
- Windlass `up` → `hz` 120, gain 0.25; `cutOut: true` → 0. Chain from 10.0 to 10.1 m in 0.05 s → 2 m/s → `rate` 30 (capped from 50).
- `phase` `stowed` → `hanging` → `anchorDown`; `bottom` → `stowed` → `anchorUp`.
- `thrusters.bow = 1` → `thrusterBow.gain` 0.3, `thrusterStern.gain` 0.

### 8.5 Browser checks (`scripts/shots-m89.mjs`, group `m89`)

Test clock, `soundOn(page)` (M88).
1. Realistic ropes at the starboard station (the M4c check's link: `grep -n "m4c-" scripts/shots-m4c.mjs | head`): hold the winch button for 1 s (`page.waitForTimeout`): during the hold `voices.winchMotor.gain > 0` and `winchClicks.rate > 0`; after release both 0.
2. Easy, `?v=1&m=easy`: press the mainsheet's + step five times: within 1 s `winchClicks.rate > 0` at some poll.
3. Anchor: the bay link the M46 checks use; hold Down for 2 s: `voices.windlass.gain > 0`, `chain.rate > 0`, `events()` has `anchorDown`.
4. Thrusters (Harbour mode, the M41 link): hold the bow joystick to port: `voices.thrusterBow.gain > 0`; let go: 0 after 0.5 s.

Run `SHOTS_ONLY=m87,m89`. Add `"m89": 300`.

### 8.6 Done when / not in M89

Checks and tests pass; on the phone: the winch hums and clicks when you press its button, the clicks speed with the drum, a sheet eased runs out with a hiss; in Easy the sheets' + and − give a short winch sound; the windlass hums and the chain rattles; the thrusters hum while held. Not in M89: the marina, birds, music.

---

## 9. M90: Marina and birds

**Independent review: not needed** (sound only).

### 9.1 Files

As 4.1. Voices in `src/audio/placeVoices.ts`.

### 9.2 Data (add, verbatim; **tunable**)

```json
"halyards": { "baseRate": 0.3, "perKnRate": 0.08, "traffic": { "busy": 1, "half": 0.6, "empty": 0.25 }, "gain": 0.12, "hzA": 2100, "hzB": 3400, "s": 0.08, "seed": 90 },
"lapping": { "place": { "marina": 1, "bay": 0.6, "open": 0 }, "gain": 0.15, "rate": 0.5, "lowpassHz": 700, "s": 0.6, "seed": 91 },
"gulls": { "perMinute": { "marina": 3, "bay": 2.5, "open": 0.5 }, "gain": { "marina": 0.2, "bay": 0.18, "open": 0.1 }, "fromHz": 1500, "toHz": 950, "noteS": 0.22, "gapS": 0.1, "notesMin": 2, "notesMax": 4, "bandHz": 1800, "q": 2, "seed": 92 },
"smallBirds": { "perMinute": { "marina": 2, "bay": 4, "open": 0 }, "gain": 0.08, "fromHz": 3800, "toHz": 5200, "chirpS": 0.06, "gapS": 0.07, "chirpsMin": 3, "chirpsMax": 6, "seed": 93 },
"birdLight": { "day": 1, "golden": 1, "twilight": 0.5, "night": 0 },
"birdWind": { "fromKn": 25, "share": 0.3 }
```

### 9.3 Formulas (`VoiceId` adds `'halyards' | 'lapping' | 'gulls' | 'smallBirds'`, all group `surroundings`; `rate` is events per second)

- `place = state.harbour.place` (`'open' | 'marina' | 'bay'`), `tws = state.wind.twsKn`.
- **halyards** (only in the marina): `rate = place === 'marina' ? (baseRate + perKnRate · tws) · traffic[state.harbour.traffic] : 0`; `gain = rate > 0 ? halyards.gain : 0`. Engine: `poissonTimes(mulberry32(halyards.seed), rate, dt)`; each tap: two sines at `hzA` and `hzB · (0.95 + 0.1 · rng())`, gain `halyards.gain · (0.5 + 0.5 · rng())`, decay `s`.
- **lapping:** `share = lapping.place[place]`; `gain = lapping.gain · share`, `rate = share > 0 ? lapping.rate : 0`, `hz = lowpassHz`. Engine: `poissonTimes` at `rate`; each lap noise → lowpass → gain, 0.15 s attack, `s` decay.
- **Light:** `light = birdLight[daylight(sunPosition(state.clock.utcMs, area.position.latitudeDeg, area.position.longitudeDeg).elevationDeg)]` (`src/model/clock.ts`, `src/model/sun.ts`, `src/model/area.ts`). **Wind:** `windShare = tws > birdWind.fromKn ? birdWind.share : 1`.
- **gulls:** `rate = gulls.perMinute[place] / 60 · light · windShare`; `gain = rate > 0 ? gulls.gain[place] : 0`. Engine: `poissonTimes` at `rate` (rng `mulberry32(gulls.seed)`); each call is `n = notesMin + floor(rng() · (notesMax − notesMin + 1))` notes, each a sawtooth sweeping `fromHz · (0.9 + 0.2 · rng())` → `toHz` (exponential) over `noteS`, bandpass `bandHz` Q `q`, 0.02 s attack, release to 0 at the note's end; `gapS` between notes. Probe name `'gull'` (once per call).
- **smallBirds:** `rate = smallBirds.perMinute[place] / 60 · light · windShare`; `gain = rate > 0 ? smallBirds.gain : 0`. Each call `n` chirps (`chirpsMin`–`chirpsMax`), a sine sweeping `fromHz` → `toHz · (0.9 + 0.2 · rng())` over `chirpS`, `gapS` apart. Probe name `'chirp'`.
- Night (`light` 0) → no birds; the halyards and the lapping go on.

### 9.4 Tests

- Marina, busy, 10 kn → `halyards.rate` 1.1 ± 0.001; empty → 0.275; open water → 0.
- `lapping.gain`: marina 0.15, bay 0.09, open 0.
- Noon on 1 June (the default clock), marina, 10 kn → `gulls.rate` 0.05 (3/min), `smallBirds.rate` 0.0333 ± 0.0005; bay → 0.0417 ± 0.0005 and 0.0667 ± 0.0005; open → 0.00833 ± 0.0001 and 0.
- The same at 01:00 local on 2 June (`clock.utcMs` for 23:00 UTC on 1 June; `daylight` gives `'night'`: assert that first) → both 0.
- Marina at 30 kn → `gulls.rate` 0.015.

### 9.5 Browser checks (`scripts/shots-m90.mjs`, group `m90`)

Test clock, `soundOn(page)`.
1. Marina link (the M42 checks' marina link, busy traffic): `voices.halyards.rate > 0`, `lapping.gain > 0`; after `page.waitForTimeout(60000)` (test clock: app time, fast), `events()` holds at least one `'gull'` or `'chirp'`.
2. Open water at noon: `halyards.rate === 0`.
3. Marina at night (the clock link key the Phase 3 clock checks use, set to 01:00): `gulls.rate === 0` and `smallBirds.rate === 0`.

Run `SHOTS_ONLY=m87,m90`. Add `"m90": 300`.

### 9.6 Done when / not in M90

Checks and tests pass; on the phone: in the marina the halyards tap on the masts and the water laps, gulls call now and then, small birds chirp; in open water only a distant gull now and then; at night no birds. Not in M90: music; rain (out of scope).

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
export function musicEvents(rng: () => number, fromS: number, toS: number, cursor: MusicCursor, data?: SoundData): { events: MusicEvent[]; cursor: MusicCursor };
export interface MusicCursor { nextChordS: number; nextNoteS: number; chord: number; lastNote: number }
export const START_CURSOR: MusicCursor = { nextChordS: 0, nextNoteS: 2, chord: 0, lastNote: 2 };
```

- **Chords:** at `nextChordS` (within `[fromS, toS)`), emit `{ kind: 'chord', midi: chords[chord] }`; the next chord is a different one: `chord = (chord + 1 + floor(rng() · (chords.length − 1))) % chords.length`; `nextChordS += a + rng() · (b − a)` with `[a, b] = chordEveryS`.
- **Notes:** at `nextNoteS`: with probability `restShare` nothing (a rest); else a step from the last note of −2, −1, +1 or +2 scale degrees (equal chances), kept inside `0 … scale.length − 1` by reflecting, plus an octave from `noteOctaves` (`rng() < 0.5` → the first); emit `{ kind: 'note', midi: [scale[i] + octave] }`; `lastNote = i`; `nextNoteS += a + rng() · (b − a)` with `noteEveryS`.
- Loop until both next times are ≥ `toS`. The time is the music's own clock (real seconds while the music group plays; it stands still while the context is suspended).

### 10.4 `src/audio/music.ts` (Web Audio)

`createMusic(ctx: AudioContext, out: AudioNode, data: SoundData): { frame(dtS: number): void }`, created by the engine with the music group as `out`; `frame` runs `musicEvents` over `[t, t + dt + lookaheadS)` and plays them at `ctx.currentTime + (atS − t)`:
- **Pad (chord):** per note two oscillators, `triangle` and `sine` detuned by `±padDetuneCents`, through one gain: `linearRamp` to `padGain / midi.length` over `padAttackS`, held until the next chord, then `setTargetAtTime(0, …, padReleaseS / 3)`; stopped `padReleaseS · 2` later.
- **Note:** a sine plus a sine an octave up at a quarter of the gain, 0.01 s attack to `noteGain`, `setTargetAtTime(0, …, noteDecayS / 3)`.
- Everything through `BiquadFilterNode` `lowpass` `lowpassHz`, then dry to `out` and through a `DelayNode` (`delayS`) with a feedback gain (`delayFeedback`) and a wet gain (`delayMix`) to `out`.
- Probe names: `'chord:<first midi>'`, `'note:<midi>'`.
- Music plays only while `targets.groups.music > 0` (the engine skips `music.frame` otherwise, so no notes pile up).

### 10.5 Tests (`tests/musicScore.test.ts`)

- `musicEvents(mulberry32(155), 0, 600, START_CURSOR)`: chords every 8–14 s (count 43–75), never the same chord twice in a row; every note's midi in `{62, 64, 66, 69, 71, 74, 76, 78, 81, 83}`; consecutive sounding notes at most 2 scale degrees apart (octave aside); note count between 600/6 · 0.6 and 600/2 · 0.9 (60–270).
- The same seed and times give the same events (deterministic); splitting `[0, 600)` into frames of 0.05 s gives the same events as one call.

### 10.6 Browser checks (`scripts/shots-m91.mjs`, group `m91`)

Test clock (the music clock is real-time: wait with `page.realWaitForTimeout(12000)`), `soundOn(page)`: `events()` holds at least one `'chord:'` and one `'note:'`; switch `sound-music` off: no new `'chord:'`/`'note:'` events in the next 10 s (real).

Run `SHOTS_ONLY=m87,m91`. Add `"m91": 300`.

### 10.7 Done when / not in M91

Checks and tests pass; on the phone: with Sound on, a quiet, slow music under the wind, never the same twice; Music off in Settings stops it within a few seconds while the rest goes on. The PR says `Closes #155`. Not in M91: a choice of tunes, a music volume of its own (the group gain is fixed at a third, `master.groupGain.music`).

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
