# Exercises on a phone: the step bar, Watch and Show me (M79–M82)

Extra milestones of Phase 10 for issue #165 item 1 (the launch blocker "exercises must work on a normal phone"), planned with the owner on 2026-11-04 from the mockup [`docs/mockups/exercise-controls.html`](mockups/exercise-controls.html). The issue's PC request #161 is covered for the exercises (the same bar on the computer); camera handling (#145) is left for its own plan.

## 0. How to use this spec (for the coding agent)

- Do **one milestone** (sections 6–9) per PR, titled `M<N>: <name>`, in order M79 → M80 → M81 → M82, each after the one before is merged. **M79 needs M78 merged** (its exercise *Stern-to on your own anchor* gets a bar too).
- Read sections 0–5 of this file, then your milestone's section. You also need, from [`PHASE10_SPEC.md`](PHASE10_SPEC.md), only: 4.1 (the run state), 4.2 (the order of work), 4.4 (the exercise data), 6.5 (the Exercises UI) and 3.6 (browser-check conventions). Do not read the other sections of PHASE10_SPEC.
- Build order inside a milestone: data → pure helpers + tests → store → UI → browser checks → docs.
- **Numbers are final.** Time limits come from the prototype of 2026-11-04 (section 3.5). A number marked **tunable** may be changed only if a check fails after you have checked your code against 3.4: change it, report the before and after in the PR, and never widen a test limit. A limit that still fails is a question for the owner in the PR.
- **Text is data.** Every English string here is final: copy it exactly. Russian strings are AI drafts (CLAUDE.md): write them yourself following PHASE4_SPEC 3.3, and run `npm run review-doc -- ru` after any change to `content/lang/ru/*.json`.
- **Names are required.** Function names, signatures, `data-testid`s, CSS classes and data keys named here are required, so milestones fit together and the browser checks find things. Add private helpers freely.
- **Write back.** If you decide something this spec leaves open, write it into your milestone's section under "Decided in the M<N> PR".
- **Everything earlier keeps working.** Every unit test and PHYSICS_TRUTHS test stays green; every old link opens the same boat, wind, place and camera (except the one owner decision in 4.3: an exercise link without `lb` now opens with the 3D labels off). Outside Exercises mode nothing changes, except the soft camera framing of M80 (all modes).
- **No sailing physics changes.** No formula in `src/model` that moves the boat, the rig or the ropes changes. The pilots (M81) only dispatch the actions a learner could.

## 1. Goal

Every exercise works on a 390 × 844 phone in portrait, with no zooming and no folding of panel sections. During an exercise, the controls the current step needs sit in one **step bar** over the bottom of the 3D view (M79). The screen stays clear: on a phone the hint and the time bar are folded; on every screen the 3D labels are off in exercises; and the camera keeps the yacht in the middle of the part of the 3D view left free, moving softly when something opens or closes (M80). Every exercise can also be **watched**: the app sails it step by step and stops after each step; and each step has **Show me**, which plays that one step and then rewinds so the learner can try it (M81). In Realistic ropes the bar shows the rope station's controls for *Setting the sails* and *Furling the sails* (M82).

## 2. Scope

### In scope

- The step bar on every layout (phone over the 3D above the sheet; side and wide at the bottom of the 3D view), its rows for the Easy ropes, the wheel, the autopilot, the engine, the thrusters, the mooring lines, the fenders and the windlass; keys on a computer (M79).
- A clear phone screen during a run: hint folded, time bar folded, labels off by default in exercises; soft camera framing in all modes (M80).
- Watch, Show me, the pilots for all 14 exercises in Easy ropes, the "Watched" mark (M81).
- Realistic rope rows (station switch, clutches, winches) for *Setting the sails* and *Furling the sails*, their Realistic pilots, Watch in Realistic ropes for these two, and the sign-off of issue #165 item 1 (M82).

### Out of scope

- Camera handling and gestures (#145); a re-layout of the computer screen outside exercises (the rest of #161).
- Changes to the exercises' steps, checks, mistakes or texts (the `how` texts still name the panel sections; they stay true, because the panel keeps every control).
- Realistic rope rows for the other exercises: run in Realistic ropes, their rope rows show one "Ropes: work them at the stations" row (6.5) that opens the Ropes section as today.
- A step-by-step explanation text per step for Watch (the card shows the step's existing `how` text).
- Watch for exercises run in Realistic ropes other than *Setting the sails* and *Furling the sails*.

## 3. Conventions and shared helpers

### 3.1 Conventions

- **Layouts:** `LayoutKind` = `'stacked' | 'side' | 'wide'` (`src/ui/modes.ts`); "phone" means `stacked`; "computer" means `side` or `wide`. Read it as `panel.ts` does (`layout.viewport()`), react to `layout.onChange`.
- **A run is active** when `state.exercise !== null` and its status is `running` or `mistake`. The bar shows only while a run is active (and, on the stacked layout, only while the sheet is at `peek`, like the quick row).
- **Row ids** (`BarRowId`, a string): `control:<ControlId>`, `autopilot:turn`, `autopilot:mode`, `autopilot:tack`, `engine`, `thrusters`, `line:<LineCode>`, `fenders`, `windlass`; from M82 also `clutch:<StationId>:<clutch key>` and `winch:<StationId>:<winch id>:<rope key>`. At most **4 rows** per step.
- **Touch targets:** every bar button at least 48 × 48 px (`--bar-touch: 48px`, owner: "normal").
- **Control steps:** a control row's − / + move by `settings.step` (1 or 5) through `snapControl(id, value ± step, step)` (`src/model/controls.ts`), with press-and-hold repeat (`stepButton`, `src/ui/stepper.ts`). The engine row's lever moves by **5** % per tap (`BAR_LEVER_STEP_PCT = 5`, a constant in `exerciseBar.ts`; the neutral band is ±10 %, `physics.engine.neutralBandPct`, so two taps from neutral give slow ahead at 15 %, as the pilots use).
- **Signs:** `ctl_rudder` −° = wheel to port; autopilot `{ turnDeg: −10 }` = 10° to port. Control values of sheets are % eased (− hauls in); furling controls are % unfurled (− rolls in).
- **Time:** pilots read the run's own clock (`run.elapsedS`, `run.stepStartS`), never the frame time; the app runs a demo in parts of at most 0.05 s (4.2), the step the pilots were tuned at.

### 3.2 Shared helpers (new)

| Name | File | Signature | Behaviour |
|---|---|---|---|
| `BarRowId` | `src/app/exerciseBar.ts` | `type BarRowId = string` | A row id as in 3.1. |
| `isBarRowId` | same | `(id: string) => boolean` | True for every form of 3.1 with a known control id, line code, station id and winch id (from the boat data). |
| `barRowsFor` | same | `(def: ExerciseDef, step: number, ropes: RopesMode) => BarRowId[]` | M79: the step's `bar`; with `ropes === 'realistic'` the `control:` rows of ropes (every control except `ctl_rudder`) are replaced by **one** `ropes` row (the placeholder, 6.5), placed where the first of them was. M82: when `ropes === 'realistic'` and the step has a `barRealistic` key (an empty list included), that list as it is, with no placeholder. Harbour bars hold no rope rows, so Realistic ropes changes nothing there. |
| `barRowOf` | same | `(action: Action) => BarRowId[]` | The rows an action works: `setControls` → `control:<id>` for each key; `autopilot` `'off' \| 'heading' \| 'wind'` → `autopilot:mode`, `{ turnDeg }` → `autopilot:turn`, `'tack'` → `autopilot:tack`; `engine` → `engine`; `thruster` → `thrusters`; `line` → `line:<code>`; `setFenders` → `fenders`; `windlass` → `windlass`; (M82) `realistic` `clutch` → `clutch:<station>:<key>`, `onWinch` / `turn` / `selfTailer` / `button` / `offWinch` → the `winch:` row of that winch (any rope key), `station` → `stations` (the station switch's `data-row`, never in the data, so `isBarRowId('stations')` stays false); anything else → `[]`. |
| `pilotFor` | `src/app/exercisePilots.ts` (M81) | `(id: string, level: ExerciseLevel, ropes: RopesMode) => Pilot \| null` | A fresh pilot (new closure state) for the exercise, or null where none exists (3.5). |
| `pilotActions` | same | `(pilot: Pilot, state: AppState) => Action[]` | Calls `pilot(state, state.exercise.elapsedS)` while recording every action the pilot's helpers apply; returns them in order (the computed state is dropped: dispatching the same actions reproduces it, because `reduce` is pure). |

### 3.3 Sources

No sailing facts are added. The pilots follow the steps' existing `how` texts and the good runs of PHASE10_SPEC (3.5 there); the bar shows the same controls the panel does.

### 3.4 Common mistakes (check these first when something fails)

- A bar row built once per frame: build each row once and `refresh(state)` it on `store.subscribe` (as `ropeControls.ts` does); rebuild the row list only when the **render key** `${run.id}|${run.step}|${ropesMode}|${layoutKind}|${language}` changes.
- Duplicate `data-testid`s: the bar's copies of shared controls take the suffix `-bar` (thruster joysticks, line rows, the Start/Stop button, the windlass buttons).
- A hold button that sticks: every hold row (thrusters, windlass, winch button) releases on `pointerup`, `pointercancel`, `pointerleave`, on `blur` of the window and on `visibilitychange`, as `thrusterPanel.ts` does.
- The chip row, the mini-map, the Resume button or the info card hidden behind the bar: every CSS `bottom:` that uses `--view-bottom-inset` inside the 3D view also adds `var(--exercise-stack-h, 0px)` (6.5).
- The camera framing the boat behind the bar: the stacked layout's bottom inset adds the stack's height (6.5); a ResizeObserver on the stack calls the app's `reframe`.
- Keys stealing typing or firing twice: the bar's keys ignore events whose target is an `input`, `select`, `textarea`, `button`, `a` or `[contenteditable]` (a focused button handles its own keys), events with Ctrl, Alt or Meta, and do nothing while a chip card or menu is open (a new `export function overlayOpen(): boolean` in `chipMenu.ts`, true while its one open menu or registered card is open).
- A pilot that acts on frame time or keeps phases across steps: Show me starts a **fresh** pilot at a step's start (M81); a pilot must be able to start at any step (3.5).
- Watch's own actions in the debrief or in the progress: they go through the `demo` action (M81), which `reduce` does not log; `recordDone` is skipped for a watched run.
- Russian text: AI draft, `"$status"` stays `draft` where the file has one.

### 3.5 How the numbers were made (prototype, 2026-11-04)

A throwaway Vitest file ran each exercise's start link through `parseUrlState(exerciseStartLink(…))`, `reduce(…, start)`, then the pilot and `reduce(…, { type: 'step', dt: 0.05 })` every 0.05 s (the loop of `tests/harbourExercises.test.ts` `goodRun`), with the real model on `main` at `f99155c` plus M78's exercise. Then, for **Show me**, it took the state at each step's start, made a fresh pilot and ran until the step was done. Results (app seconds per step; Easy ropes, level Easy unless named; no mistake in any run):

| Exercise | Good run, per step | Fresh pilot from each step |
|---|---|---|
| points-of-sail | 5.1, 14.8, 14.1, 15.3, 18.2 | 5, 15, 14, 15, 18 |
| tacking | 57.3, 15.5, 47.7, 24.1 | 57, 16, 48, 24 |
| irons | 1.0, 52.9, 26.8 | 1, 53, 27 |
| gybing | 3.4, 15.4, 5.0, 15.9 | 3, 15, 5, 16 |
| gusts | 141.1, 8.0 | 141, 8 |
| reduce-sail | 3.5, 2.8, 10.0 | 4, 3, 10 |
| set-sails (Easy) | 7.8, 2.9, 38.0, 6.0, 5.0 | 8, 3, 38, 6, 5 |
| furl-sails (Easy) | 2.0, 3.2, 13.6, 3.2 | 2, 3, 14, 3 |
| set-sails (Realistic, Alone) | 7.8, 20.4, 32.8, 45.8, 5.0 | 8, 20, 33, 46, 5 |
| furl-sails (Realistic, Alone) | 2.0, 31.3, 13.8, 21.4 | 2, 31, 14, 21 |
| leave-berth easy / normal / hard | 1, 1, 34.6, 25.3 / 1, 1, 35.0, 26.1 / 1, 1, 26.3, 26.4 | same ±1 |
| enter-berth easy / normal / hard | 1, 83.1, 82.6, 1.3, 20, 26.1 / 1, 72.1, 85.9, 1.3, 20, 20.1 / 1, 75, 97.8, 1.3, 20, 8.6 | with the entry phases of 8.3: 1, 83, 83, 1, 20, 26 / 1, 72, 86, 1, 20, 20 / 1, 75, 98, 1, 20, 9 |
| turn-own-length | 21.6, 34.1 | 22, 34 |
| mooring-buoy | 115.1, 1, 10, 1, 38.8 | 115, 1, 10, 1, 39 |
| anchor-shore | 76.9, 24.2, 70.1, 41.1, 59.3, 78.7 | 77, 24, 70, 41, 59, 80 |

What the prototype found: `enterPilot` keeps a phase across steps, so a fresh pilot at step 2 (reverse in) did not finish on Hard within 400 s; with an **entry phase** chosen from the step it starts at (8.3) every step finishes. Every other pilot already works from any step. *Stern-to on your own anchor* (M78) was not on `main`; its pilot's state lives inside one step, so a fresh pilot works from any step (the M81 test checks it).

**Limits** for the tests: each step's limit is `ceil(1.2 × prototype + 3)` s, written out in 8.6.

## 4. Architecture

### 4.1 New state

**M81** adds two fields to `ExerciseRun` (`src/app/exerciseRun.ts`); they are not written to links (a loaded run has the defaults) and are kept by `restoreWaypoint` except as said in 4.2:

```ts
/** What the app is playing: null (the learner), 'watch' (the whole run) or 'showMe' (one step). */
demo: 'watch' | 'showMe' | null;
/** showMe: the step being shown; else -1. */
demoStep: number;
```

`newRun` sets `null` and `-1`. The pilot itself (a closure) is UI state in `src/ui/exerciseDemo.ts` (8.5), never in `AppState`.

`src/app/exerciseProgress.ts` (M81): `ExerciseProgress` gets `watched: Readonly<Record<string, { at: string }>>`; `parseProgress` reads it (missing or bad → `{}`), and `withDone`, `recordDone` and the new `recordWatched(id: string): ExerciseProgress` all keep both maps (`v` stays 1); a stored value with only one of the two keeps it (the other reads as `{}`). `recordDone` does not clear `watched`.

### 4.2 Actions and the order of work

- **M81, the `demo` action:** `{ type: 'demo'; actions: Action[] }`. Today's `reduce` is renamed `reduceUnlogged` with its last line (the `logAction` call) removed; everything else stays in it (the early return for `next === state`, `load`, `reset`, `exercise`; `recordAlerts`; `stepExercise` on `step`). The new `reduce(state, action)`: for `demo`, `action.actions.reduce((s, a) => (a.type === 'step' || a.type === 'demo' ? s : reduceUnlogged(s, a)), state)`; for every other action, `next = reduceUnlogged(state, action)`; then, exactly as today, return `next` unlogged when `next === state` or the action is `load`, `reset`, `exercise` or `step`; else `logAction(state, next, action)` while `next.exercise !== null`.
- **M81, the `demo` exercise command:** `{ type: 'exercise', command: { demo: 'watch' | 'showMe' | null } }`, handled in `reduceAction`'s `exercise` case:
  - `'watch'`: only in `setup`: `demo = 'watch'` (the UI then dispatches `'start'`).
  - `'showMe'`: only while `running`: `restoreWaypoint(state, run.step)` (back to the current step's start), then `demo = 'showMe'`, `demoStep = run.step`.
  - `null`: in any status: `demo = null`, `demoStep = -1`.
  - **`{ back }`** (any caller: the demo cards, the mistake card's Go back, the waypoint rows) also sets `demo = null`, `demoStep = -1`: going back always ends a demo.
- **M81, the step pause of a demo:** in `stepExercise`, where a step is finished, `stopTime = run.options.pauseOnStep || run.demo !== null` (time stops after every step the app played; the learner's own option is untouched, so no `exs` appears in links).
- **M81, frame order** (`app.ts`): today the loop dispatches `{ type: 'step', dt: raw }` and the reducer clamps `raw` to `MAX_STEP_S` (0.1) and multiplies it by `settings.timeScale`. While `run.demo !== null` and the run is `running`, `app.ts` instead computes `scale = min(settings.timeScale, 4)`, `appDt = min(raw, MAX_STEP_S) × scale` (export `MAX_STEP_S` from `store.ts`), `n = max(1, ceil(appDt / 0.05))`, and `n` times: `demo.frame()`, then `dispatch({ type: 'step', dt: appDt / n / settings.timeScale })` (the reducer's multiplication brings each part back to `appDt / n` ≤ 0.05 s app seconds). The pilots were tuned at 0.05 s (3.5); at 0.25 s three harbour pilots failed in the prototype. So a demo plays at ×4 at most; while it is capped, the time bar shows under its buttons `p.hint` `t('exercise.demo.capped')` (its refresh key adds `run.demo`).

### 4.3 URL keys

No new keys. **Labels (M80, owner):** in Exercises mode the 3D labels are off by default, on every layout. `defaultLabels(ropes: RopesMode, appMode: AppMode = 'easy')` (`src/model/settings.ts`) returns `false` when `appMode === 'exercise'`, else `ropes !== 'realistic'` as today. The rules, all in M80:

- **Parse** (`parseUrlState`): the existing line that applies `defaultLabels(ropesMode)` for a link with `mode=` and no `lb` stays as it is; after the state is built (both the normal branch and the `exw` waypoint branch), if `appMode === 'exercise'` and the link has no `lb`, `settings.labels = false` (this last rule wins). Other links: as today. `initialState` is not changed (no exercise starts from it without a link).
- **Serialize** (both places in `urlState.ts` that compare with `defaultLabels`, the exercise start link and `serializeUrlState`): compare with `defaultLabels(state.settings.ropesMode, state.appMode)`; `lb` is written when they differ.
- **`setAppMode`** (`store.ts`): when the old or the new mode is `'exercise'`, after the existing code has built the new state (either branch; note that `withRopesMode` returns the settings unchanged when the ropes mode stays the same), set `settings.labels = defaultLabels(newState.settings.ropesMode, action.mode)` explicitly; a manual choice is overwritten, as a ropes-mode change does today. Between other modes: as today.
- **`withRopesMode(settings, ropes, appMode: AppMode = 'easy')`**: the labels follow `defaultLabels(ropes, appMode)`; `setRopesMode` passes `state.appMode` (in an exercise the ropes choice keeps the labels off).
- **Old links:** an exercise link without `lb` opened with labels on in Easy ropes; it now opens with them off (owner's decision); a link with `lb=1` keeps them on. Links outside Exercises mode are unchanged.

### 4.4 Data (`content/exercises/exercises.json`)

Each step gets `"bar": BarRowId[]` (M79, required, 0–4 rows, the order shown top to bottom). M82 adds `"barRealistic": BarRowId[]` to the steps of `set-sails` and `furl-sails`. `src/model/exercises.ts`: `ExerciseStep` gets `bar: readonly string[]` and `barRealistic?: readonly string[]` (strings, so `src/model` does not import app code; `isBarRowId` checks them in the tests).

### 4.5 Files by milestone

| Milestone | New | Changed |
|---|---|---|
| M79 | `src/app/exerciseBar.ts`, `src/ui/exerciseBar.ts`, `tests/exerciseBar.test.ts`, `scripts/shots-m79.mjs` | `content/exercises/exercises.json`, `src/model/exercises.ts`, `src/app/app.ts`, `src/ui/thrusterPanel.ts`, `src/ui/enginePanel.ts`, `src/style.css`, `content/lang/{en,ru}/ui.json`, `scripts/shots.mjs`, `.github/workflows/ci.yml`, `docs/CODE_MAP.md` |
| M80 | `scripts/shots-m80.mjs`, `tests/exerciseScreen.test.ts` | `src/render3d/cameraRig.ts`, `src/render3d/sceneConfig.ts`, `src/render3d/scene.ts` (debug hook), `src/ui/exerciseCoach.ts`, `src/ui/timeBar.ts`, `src/app/app.ts` (the two calls get `layout`), `src/model/settings.ts`, `src/app/urlState.ts`, `src/app/store.ts`, `scripts/shots.mjs`, `ci.yml`, `docs/CODE_MAP.md` |
| M81 | `src/app/exercisePilots.ts`, `src/ui/exerciseDemo.ts`, `tests/exercisePilots.test.ts`, `scripts/shots-m81.mjs` | `tests/harbourPilot.ts` (re-exports, `goodRun`), `tests/harbourExercises.test.ts`, `src/app/store.ts`, `src/app/exerciseRun.ts`, `src/app/app.ts`, `src/ui/timeBar.ts` (the ×4 cap), `src/app/exerciseProgress.ts`, `src/ui/exercisePanel.ts`, `src/ui/exerciseLine.ts`, `src/ui/exerciseBar.ts`, `src/ui/exerciseResume.ts`, strings, `scripts/shots.mjs`, `ci.yml`, `docs/CODE_MAP.md` |
| M82 | `scripts/shots-m82.mjs` | `exercises.json`, `src/model/exercises.ts`, `src/app/exerciseBar.ts`, `src/ui/exerciseBar.ts`, `src/app/exercisePilots.ts`, `tests/exerciseBar.test.ts`, `tests/exercisePilots.test.ts`, strings, `scripts/shots.mjs`, `ci.yml`, `docs/CODE_MAP.md` |

Each milestone gets its **own CI part** in `ci.yml` (`SHOTS_ONLY=m<N>`, added to the first part's `SHOTS_SKIP` list), as M77/M78 do, and adds its group to the test-clock rules of `openPage` in `scripts/shots.mjs` where they list milestone groups (they match `m7\d` today; M80–M82 extend them to their own names).

## 5. Milestones overview

| Milestone | Section | What the owner sees | Rules tested | Depends on | Independent review |
|---|---|---|---|---|---|
| M79 | 6 | During an exercise, the step's controls in one bar over the 3D view (phone: above the panel; computer: at the bottom of the 3D view, with keys) | none | M78 | **required** (new data on every step, a layout change shared by every mode's chip row, global keys) |
| M80 | 7 | A clear phone screen in an exercise: the hint and the time bar folded, no labels; the yacht stays in the middle of the free part, moving softly | none | M79 | **required** (the camera framing of every mode changes; the labels default changes old exercise links) |
| M81 | 8 | "Watch it": the app sails the exercise and stops after each step; "Show me" plays one step and rewinds; a "Watched" mark | none | M80 | **required** (a new store action and a split of `reduce`; pilots for 14 exercises; progress and debrief must ignore the app's own actions) |
| M82 | 9 | Realistic ropes in the bar for Setting and Furling the sails (stations, clutches, winches), also in Watch; sign-off of issue #165 item 1 | none | M81 | not needed (UI rows dispatching the existing Realistic gestures; data; the pilots are tested) |

---

## 6. M79: The step bar

**Independent review: required** (new data on every step, a layout change shared by every mode's chip row, global keys).

### 6.1 Files

As 4.5. `src/app/exerciseBar.ts` is pure (no DOM); `src/ui/exerciseBar.ts` is the DOM part.

### 6.2 Data (`content/exercises/exercises.json`, one `bar` per step, verbatim)

| Exercise | Step `bar`s, in step order |
|---|---|
| points-of-sail | `["control:ctl_mainsheet"]`, `["autopilot:turn","control:ctl_mainsheet"]`, `["autopilot:turn","control:ctl_mainsheet","control:ctl_jib_sheet"]`, `["autopilot:turn","control:ctl_mainsheet"]`, `["autopilot:turn","control:ctl_mainsheet"]` |
| tacking | `["autopilot:tack"]`, `["autopilot:mode","control:ctl_rudder"]`, `["control:ctl_rudder"]`, `["autopilot:mode","autopilot:turn"]` |
| irons | `["control:ctl_mainsheet","control:ctl_jib_sheet"]`, `["control:ctl_rudder"]`, `["control:ctl_rudder","control:ctl_mainsheet","control:ctl_jib_sheet"]` |
| gybing | `["control:ctl_mainsheet"]`, `["autopilot:tack"]`, `["control:ctl_mainsheet"]`, `["autopilot:mode","autopilot:turn"]` |
| gusts | `["control:ctl_mainsheet"]`, `["control:ctl_mainsheet","control:ctl_jib_sheet"]` |
| reduce-sail | `["control:ctl_jib_sheet","control:ctl_jib_furl"]`, `["control:ctl_jib_sheet","control:ctl_main_furl"]`, `["control:ctl_mainsheet"]` |
| set-sails | `[]`, `["control:ctl_main_furl"]`, `["autopilot:mode","autopilot:turn","control:ctl_mainsheet"]`, `["control:ctl_jib_furl","control:ctl_jib_sheet"]`, `["engine"]` |
| furl-sails | `["engine"]`, `["control:ctl_jib_sheet","control:ctl_jib_furl"]`, `["engine","autopilot:mode","autopilot:turn"]`, `["control:ctl_main_furl"]` |
| leave-berth | `["line:ll"]`, `["line:sp","line:ss"]`, `["engine","control:ctl_rudder"]`, `["engine","thrusters","control:ctl_rudder"]` |
| enter-berth | `["fenders","engine"]`, `["engine","thrusters"]`, `["engine","thrusters"]`, `["engine","line:sp","line:ss","thrusters"]`, `["line:ll","thrusters"]`, `["line:ll","engine","thrusters"]` |
| turn-own-length | `["control:ctl_rudder","engine"]`, `["control:ctl_rudder","engine","thrusters"]` |
| mooring-buoy | `["engine","control:ctl_rudder"]`, `["line:bl","engine","control:ctl_rudder"]`, `["engine"]`, `["line:bl"]`, `["engine"]` |
| anchor-shore | `["engine","thrusters"]`, `["windlass","engine"]`, `["windlass","engine","thrusters"]`, `["engine","windlass","thrusters"]`, `["windlass","engine","thrusters","line:sl"]`, `["line:sl","engine"]` |
| stern-to-anchor | `["engine","thrusters"]`, `["windlass"]`, `["engine","windlass","thrusters"]`, `["line:sp","line:ss","thrusters"]`, `["windlass","thrusters"]` |

M81's coverage test (8.6) checks these against the pilots; it may add a row (never above 4), and the M81 PR lists any it added.

### 6.3 Pure part (`src/app/exerciseBar.ts`)

`BarRowId`, `isBarRowId`, `barRowsFor`, `barRowOf` as 3.2 (in M79 `barRowOf` maps every action named there except `realistic`). `export const BAR_LEVER_STEP_PCT = 5;` `export const BAR_MAX_ROWS = 4;` `export function barShown(state: AppState): boolean` = a run is active (3.1).

### 6.4 Store and URL

Nothing new. The rows dispatch the existing actions. Thruster keys: `thrusterPanel.ts`'s A / D / J / L keys work when `appMode === 'harbour'` **or** while a run is active and `barRowsFor(exerciseDef(run.id), run.step, ropesMode)` includes `thrusters` (today Harbour only).

### 6.5 UI (`src/ui/exerciseBar.ts`)

`createExerciseBar(view: HTMLElement, store: Store, layout: LayoutShell, sheet: Sheet, panel: { showSection(id: SectionId): void }, onStackResize: () => void): void`, called in `app.ts` right after `createExerciseResume`. It appends to `view` one `div.exercise-stack` (`data-testid="exercise-stack"`) holding (M81 adds the demo card first) one `section.exercise-bar` (`data-testid="exercise-bar"`, `aria-label` = `t('exercise.bar.aria')`).

**Placement (owner: "over the 3D, looks cleaner"; "D agree").**

- `.exercise-stack`: `position: absolute; z-index: 8; bottom: calc(var(--view-bottom-inset, 0px) + 8px); display: flex; flex-direction: column; gap: 8px`. Stacked: `left: 8px; right: 8px`. Side and wide: `left: 50%; transform: translateX(-50%); width: min(560px, calc(100% - 16px))`.
- A `ResizeObserver` on the stack sets `--exercise-stack-h` on `layout.view` to `stack.offsetHeight + 8` px when the stack shows anything, else `0px`, and calls `onStackResize` (`app.ts` passes its `reframe`).
- Every CSS rule in `src/style.css` whose `bottom:` uses `--view-bottom-inset` for an element inside the 3D view (the chip row `.view-bottom`, the mini-map, `.exercise-resume`, the info card, and any other found by `grep -n "view-bottom-inset" src/style.css`), except `.exercise-stack`, adds `+ var(--exercise-stack-h, 0px)`. So the chip row, the mini-map, Resume and the info card sit **above** the bar on every layout.
- **Camera:** in `app.ts` `resize()`, the stacked inset becomes `sheet.cameraInset() + stackPx`, where `stackPx` is the number in `--exercise-stack-h` (0 when hidden); side and wide need nothing (their inset is measured to the chip row's top, which now sits above the stack).
- **When it shows:** `barShown(state)`, and on the stacked layout only while `sheet.height() === 'peek'` (it hides while the sheet is at half or full and comes back at peek). Hidden: `hidden` attribute on the bar (the stack measures 0).

**Look.** Like the instrument strip and the quick row: the strip's background, radius and shadow; `padding: 6px 8px 8px`; rows separated by a 1 px line in the strip's border colour; text 15 px, the small line 12 px in the hint colour. Buttons: the existing `.step-button` style at `min-width: var(--bar-touch); min-height: var(--bar-touch)` (48 px); text buttons (`Let go`, `Start`, …) the existing `.action-button` style at the same height. No new colours, no icons beyond the characters given here; not a card with a coloured header, not a floating toolbar of round icon buttons.

**Head row** (`div.exercise-bar-head`, min height 44 px): `span` `t('exercise.bar.label')` ("This step", hint colour, flex 1) and a button **All controls** (`exercise-bar-all`, `t('exercise.bar.all')`, 44 px high) that calls `panel.showSection(section)` with the same mapping as the step card's "Show the controls" (`exercisePanel.ts`: `step.opens`, `engine`/`autopilot` → `helm` and `anchor` → `ropes` when not available). M81 adds Show me here.

**Rows** (`div.bar-row`, `data-row="<BarRowId>"`, `data-testid="bar-row-<id with ':' replaced by '-'>"`, e.g. `bar-row-control-ctl_mainsheet`; layout: a name block `div.bar-row-name` (flex 1, the name in 15 px and `small` under it) and the buttons on the right). Each row's content:

| Row | Name / small line | Buttons (left to right) and what they dispatch |
|---|---|---|
| `control:<id>` | `t(controlView(id).name)` / `t('exercise.bar.sheet')` for `ctl_mainsheet`, `ctl_jib_sheet`, `ctl_vang`, `ctl_topping_lift`; `t('exercise.bar.furl')` for `ctl_main_furl`, `ctl_jib_furl`; `t('exercise.bar.rudder')` for `ctl_rudder` | `stepButton('−', …)`, the value `span.bar-value` = `valueText(controlView(id), value)` (min width 64 px, centred, bold, tabular figures), `stepButton('+', …)`; each dispatches `setControls` with `snapControl(id, value ∓/± settings.step, settings.step)`, as `quickRow.ts` |
| `autopilot:turn` | `t('exercise.bar.autopilot')` / the mode: `t('exercise.bar.ap.off')`, `t('exercise.bar.ap.heading', { deg })` (`Math.round(targetDeg)`), `t('exercise.bar.ap.wind', { deg, side })` (`Math.round(Math.abs(targetDeg))`, `side` = `sideLetter(targetDeg)` from `autopilotPanel.ts`) | `◀ {L}°` (`bar-ap-port`, aria `t('exercise.bar.ap.portAria', { deg: L })`) → `{ type: 'autopilot', command: { turnDeg: −L } }`; `{L}° ▶` (`bar-ap-starboard`) → `{ turnDeg: +L }`; `L` = `physics.autopilot.largeStepDeg`. Both disabled in Standby or Held still, as in the Steering section |
| `autopilot:mode` | `t('exercise.bar.autopilot')` / the same mode text | three toggle buttons with the Steering section's own strings for Standby, Heading and Wind (`aria-pressed`; testids `bar-ap-off`, `bar-ap-heading`, `bar-ap-wind`) → `'off'`, `'heading'`, `'wind'` |
| `autopilot:tack` | `t('exercise.bar.autopilot')` / the same mode text | one button with the Steering section's Tack / Gybe label and rule (Gybe when \|TWA\| ≥ 90°) (`bar-ap-tack`) → `'tack'`; disabled as there |
| `engine` | `t('exercise.bar.engine')` / `leverText(leverPct)`, and ` · ` + `rpmText(state.engine.rpm)` while running | `t('exercise.bar.astern')` "◀ Astern" (`bar-lever-astern`) and `t('exercise.bar.ahead')` "Ahead ▶" (`bar-lever-ahead`), each a `stepButton` (hold repeats) → `{ type: 'engine', command: { leverPct: clamp(leverPct ∓/± 5, −100, 100) } }`, disabled while the engine is off; then the Start/Stop button: `enginePanel.ts`'s private `startStopButton` is exported as `createStartStopButton(store, suffix = '')` with `data-testid="engine-startstop${suffix}"`; the bar uses `'-bar'` |
| `thrusters` | `t('exercise.bar.thrusters')` / `thrusterStatusText(state)` | `createThrusterPair(store, 'bar')`: a new `JoystickVariant` `'bar'` (testid suffix `-bar`, class `.thruster-pair-bar`, the `'quick'` variant's look at 48 px high). The row is left out when `!hasAnyThruster()` |
| `line:<code>` | `createLineRow(store, code, '-bar')` as it is (its own name, status and buttons) | as in Harbour gear |
| `fenders` | `t('exercise.bar.fenders')` / `fenderStatusText(state.harbour)` | `t('exercise.bar.fendersIn')` "In" and `t('exercise.bar.fendersOut')` "Out" (`bar-fenders-in`, `bar-fenders-out`, `aria-pressed`) → `{ type: 'setFenders', out }` |
| `windlass` | `t('exercise.bar.windlass')` / `anchorStatusText(state)` | the Anchor section's two hold buttons' strings ("Chain out ▼", "Chain in ▲"), testids `windlass-down-bar`, `windlass-up-bar`: `pointerdown` → `{ type: 'windlass', motion: 'down' \| 'up' }`, release (3.4) → `'off'`; keyboard Space / Enter hold the same way |
| `ropes` (placeholder, Realistic ropes without `barRealistic`) | `t('exercise.bar.ropesRealistic')` / — | `t('exercise.bar.stations')` "Stations" (`bar-ropes-stations`) → `panel.showSection('ropes')` |

A step with no rows shows `p.bar-nothing` `t('exercise.bar.nothing')` under the head.

**Keys (side and wide only, owner).** On the side and wide layouts each row shows its number (`span.bar-key` "1", "2", …, small, before the name) and the bar ends with `p.bar-keys` `t('exercise.bar.keys')`. One `document` `keydown`/`keyup` listener (added once; ignored per 3.4 and while the bar is hidden or on the stacked layout): `1`–`4` select a row (`.bar-row-selected`: the row's background in the selected-section colour; row 1 is selected when a step starts); `ArrowLeft` or `-` presses the selected row's **first** button, `ArrowRight`, `+` or `=` its **last** button, `Space` its first button; for a hold button (windlass, a joystick half) keydown starts the hold and keyup ends it. `preventDefault` on the keys it uses. The thrusters row keeps A / D / J / L (6.4); its number key does nothing more.

**Accessibility.** The bar is a `section` with its `aria-label`; each row is `role="group"` with `aria-labelledby` its name; values change with `aria-live="off"` (the strip already announces).

### 6.6 Strings (`content/lang/en/ui.json`, appended in this order; Russian drafts in `ru`)

```json
"exercise.bar.aria": "Controls for this step",
"exercise.bar.label": "This step",
"exercise.bar.all": "All controls",
"exercise.bar.nothing": "Nothing to do in this step: watch.",
"exercise.bar.keys": "Keys: 1–4 choose a row · ← → change it · Space: its first button",
"exercise.bar.sheet": "− hauls in · + lets out",
"exercise.bar.furl": "− rolls in · + rolls out",
"exercise.bar.rudder": "− to port · + to starboard",
"exercise.bar.autopilot": "Autopilot",
"exercise.bar.ap.off": "Standby: you steer",
"exercise.bar.ap.heading": "Holds the heading {deg}°",
"exercise.bar.ap.wind": "Holds the wind at {deg}° {side}",
"exercise.bar.ap.portAria": "Turn {deg}° to port",
"exercise.bar.ap.starboardAria": "Turn {deg}° to starboard",
"exercise.bar.engine": "Engine",
"exercise.bar.astern": "◀ Astern",
"exercise.bar.ahead": "Ahead ▶",
"exercise.bar.thrusters": "Thrusters",
"exercise.bar.fenders": "Fenders",
"exercise.bar.fendersIn": "In",
"exercise.bar.fendersOut": "Out",
"exercise.bar.windlass": "Anchor chain",
"exercise.bar.ropesRealistic": "Ropes: work them at the stations",
"exercise.bar.stations": "Stations"
```

### 6.6a Details (decided in the planning PR after the builder check)

1. **M78 first:** if `stern-to-anchor` is not in `exercises.json`, stop and say so in the session; do not build M79 without it.
2. **Engine row:** small line `leverText(state.engine.leverPct)` and, while running, ` · ` + `rpmText(state.engine.rpm)`. `enginePanel.ts` exports `createStartStopButton(store: Store, suffix = '')`, returning what the private `startStopButton` returns today (`{ button, note, update }`, with `data-testid="engine-startstop${suffix}"`); the bar puts `button` last in the row, `note` under the row's small line, and calls `update` the way the Engine section does on each store change.
3. **Fenders row:** `fenderStatusText(state.harbour)`.
4. **Windlass row:** `anchorPanel.ts` exports its `holdButton` unchanged (add `anchorPanel.ts` to M79's files); the bar calls it with `'down'` / `'up'`, testids `windlass-down-bar` / `windlass-up-bar`, and the same `partId` the Anchor section passes; labels `t('anchor.down')`, `t('anchor.up')`.
5. **All controls:** move the inline mapping of "Show the controls" in `exercisePanel.ts` into `export function controlsSectionFor(step: ExerciseStep, state: AppState, kind: LayoutKind): SectionId` (same file), used by the step card as `controlsSectionFor(step, state, layout())` and by the bar as `controlsSectionFor(step, state, layoutKindOf(layout.viewport()))` (add `exercisePanel.ts` to M79's files). The button is 44 px high.
6. **Layout:** the parameter type is `LayoutShell` (`src/ui/layout.ts`, what `createLayout` returns). Add `export function layoutKindOf(viewport: Viewport): LayoutKind` to `src/ui/modes.ts` (`viewport.wide ? 'wide' : viewport.mode`; `Viewport` imported from `./layout`); `panel.ts`'s private `layoutKindNow` uses it; the bar, the coach and the time bar call `layoutKindOf(layout.viewport())` and listen to `layout.onChange`.
7. **`onStackResize`:** `app.ts` passes `() => reframe()` (its `reframe` is assigned later, in the branch that builds the 3D view; without WebGL it stays a no-op, which is right: there is nothing to frame).
8. **Autopilot rows:** heading text `Math.round(((targetDeg % 360) + 360) % 360)`; the turn buttons' text is built as `` `◀ ${L}°` `` and `` `${L}° ▶` `` (no string key: a character and a number); every autopilot button in the bar is disabled in Held still, as the Steering section does; in Realistic ropes the autopilot and engine rows work as in Easy (their actions need no station; the prototype ran them so).
9. **Thrusters:** every `variant === 'quick'` branch in `thrusterPanel.ts` treats `'bar'` the same way (look, hold and release behaviour), except the testid suffix (`-bar`). Testids `thruster-bow-bar-port`, `thruster-bow-bar-starboard`, `thruster-stern-bar-port`, `thruster-stern-bar-starboard`; CSS: the `'quick'` variant's rules copied for `.thruster-pair-bar`, 48 px high. The row is not drawn on a boat with no thruster; `isBarRowId('thrusters')` is still true.
10. **Keys per row** (these replace 6.5's general first/last/Space rule; a key not listed does nothing on that row; each row object carries `keys: { left?(down: boolean): void; right?(down: boolean): void; space?(down: boolean): void }`, dispatching the row's actions directly, not synthetic clicks; `down` false only matters for holds): control ← − / → + (Space nothing); `autopilot:turn` ← ◀ / → ▶; `autopilot:mode` ← / → move the pressed mode one place (Standby, Heading, Wind); `autopilot:tack` Space; `engine` ← Astern / → Ahead / Space Start or Stop; `thrusters` none (A / D / J / L); `line:<code>` ← its first enabled button, → its last enabled one, Space the first; `fenders` ← In / → Out; `windlass` ← hold Chain out / → hold Chain in (keyup releases; dispatched directly as `{ type: 'windlass', motion }`, not through `holdButton`, whose own ArrowUp / ArrowDown keys on the focused button stay as they are); `ropes` Space opens the stations. The selection goes back to row 1 at every render-key change and is clamped to the rows shown.
11. **Thruster keys (6.4):** active while `barShown(state)` and `barRowsFor(def, run.step, ropesMode)` includes `thrusters`, whether or not the bar is visible.
12. **Order from the bottom up:** the sheet (stacked), the stack (M81's card above the bar), then the chip row and the mini-map. **CSS:** every `bottom:` declaration in `src/style.css` that uses `--view-bottom-inset` (the chip row in all its blocks, the mini-map, `.exercise-resume`, `.info-area`, the chip cards, the map's scale, zoom and hint) adds `+ var(--exercise-stack-h, 0px)`; `height:` rules that use it are left as they are. Tokens: `.exercise-stack { --bar-touch: 48px; }`; bar background `var(--surface)`, borders `var(--line)`, the selected row `var(--accent-soft)`, the hint colour `var(--muted)`.
13. **Visibility on a phone** follows `sheet.onChange` (after the sheet has settled); when the bar hides, the stack's ResizeObserver sets the height to `0px` and calls `onStackResize`.
14. **Aria strings** for the step buttons (appended to 6.6): `"exercise.bar.lessAria": "Less: {name}"`, `"exercise.bar.moreAria": "More: {name}"`, `"exercise.bar.asternAria": "Engine lever 5 % towards astern"`, `"exercise.bar.aheadAria": "Engine lever 5 % towards ahead"`.
15. **`isBarRowId` in M79** accepts only the M79 forms (M82 adds `clutch:` and `winch:`). Test fixtures in `tests/` that build an `ExerciseStep` get `bar: []`.
16. **Tap runs (6.8):** the links carry `step=1`; for each step tap − / + until the row's value reads the value the pilot sets (8.3), and ◀ / ▶ as many times as the pilot turns; the engine: three taps of Ahead give slow ahead (15 %). Limits: Points of sail 10, 21, 20, 22, 25 s per step (8.6); Leaving the berth 5, 5, 45, 34 s (8.7). The scenes of 6.8 are screenshots taken during these runs at the named steps (`m79-phone-pos-step2`, `m79-phone-leave-step4`), plus `m79-phone-anchor-step1` (Anchoring at its start), `m79-wide-pos-step1` (1440 × 900) and `m79-side-leave-step1` (the side viewport of `shots.mjs`). Check 5's Space on Leaving the berth step 1 presses the lazy line row's first enabled button, Let go (the start link has the lazy line on). Check 6's "fits": no element inside `exercise-bar` has `scrollWidth > clientWidth`.

### 6.7 Tests (`tests/exerciseBar.test.ts`)

- Every step of every exercise has `bar` with 0–4 entries, each `isBarRowId`; no row twice in a step.
- `isBarRowId`: true for `control:ctl_mainsheet`, `line:ll`, `thrusters`; false for `control:ctl_nope`, `line:xx`, `autopilot:left`, `''`.
- `barRowsFor(points-of-sail, 2, 'easy')` = its `bar`; with `'realistic'` = `['autopilot:turn', 'ropes']`; `barRowsFor(tacking, 1, 'realistic')` keeps `control:ctl_rudder`.
- `barRowOf`: `setControls { ctl_mainsheet, ctl_jib_sheet }` → both control rows; `autopilot { turnDeg: -10 }` → `autopilot:turn`; `'wind'` → `autopilot:mode`; `'tack'` → `autopilot:tack`; `engine 'start'` → `engine`; `thruster` → `thrusters`; `line { code: 'sl' }` → `line:sl`; `setFenders` → `fenders`; `windlass` → `windlass`; `step` → `[]`.
- `barShown`: false with no run, in `setup`, `done`, `failed`; true in `running` and `mistake`.

### 6.8 Browser checks (`scripts/shots-m79.mjs`, test clock)

Scenes: as 6.6a item 16.

Live checks (390 × 844 unless named):

1. **Points of sail by taps only:** Start; then only taps on the bar (`bar-row-control-ctl_mainsheet` buttons, `bar-ap-port`, the jib sheet row); every step done within its limit (8.6's table); the done card shows. No `__sailExercise.dispatch` after Start.
2. **Leaving the berth by taps only:** `line-ll-letGo-bar`, both stern lines, `bar-lever-ahead` three taps, then hold the `-bar` joysticks (bow to starboard, stern to port) until the heading is 255–285°, release, `bar-lever-ahead`; done.
3. **Layout:** with the bar shown, its box is inside the viewport, does not overlap the chip row, the mini-map or the sheet (bounding boxes), and the page does not scroll; at half sheet the bar is hidden and comes back at peek.
4. **Realistic placeholder:** Points of sail with `mode=realistic`: the row `bar-row-ropes` shows; `bar-ropes-stations` opens the Ropes section.
5. **Keys (1440 × 900):** Points of sail step 1: `1`, `ArrowLeft` × 4 → the main sheet down 4 steps; `Space` on Leaving the berth step 1 lets go the lazy line.
6. **All controls** opens the step's section; the accessibility audit (`a11y-audit.mjs`) with the bar shown at phone and wide size; Russian (`lang=ru`) bar fits without overflow.

### 6.9 Done when

Every exercise shows its bar at each step; checks 1–6 pass; `npm run typecheck`, `lint`, `test`, `build` pass; CODE_MAP lists the new files.

### 6.11 Decided in the M79 PR (recommended; merging accepts it)

1. **Space on a line row** takes the line when Take is shown, else lets it go (the row's one main action). The general rule "first enabled button" would press Ease on a line that is on, so the Space check of 6.8 (Leaving the berth step 1) would not let the lazy line go. ← and → keep the first and the last enabled button.
2. **Leaving the berth tap run (6.8 check 2):** the engine lever goes back to neutral (three Astern taps) before the thrusters turn her, and three Ahead taps (15 %) follow, as `leavePilot` does; one tap (5 %) stays inside the neutral band. Measured seconds per step: 1, 1, 34, 2.8 (limits 5, 5, 45, 34). Points of sail: 5.2, 14.8, 14, 15.3, 18.2 (limits 10, 21, 20, 22, 25).
3. **Rows are built once and kept** (a cache by row id); the render key only rebuilds the list, the numbers and the selection.
4. **Held keys:** a tap row repeats while its key is held; the windlass hold starts once.
5. **Windlass row** uses the Anchor section's part id (`fit_anchor_windlass`).
6. **Small text is 13 px**, not 12 px: the accessibility audit refuses text under 13 px.
7. **Browser checks:** the scenes of 6.6a item 16 are screenshots taken inside the live checks (`M79_SCENES` is empty); Chromium was started with `SHOTS_CHROMIUM=/opt/pw-browsers/chromium` in the cloud session.

8. **Independent review and owner answers (PR 168; owner: "accept all from review")**: (a) the bar's two joysticks carry "Bow" / "Stern" under them, so a beginner knows which is which; (b) the phone's alert card (`.alert-centre`) `max-height` also subtracts the stack's height, so a long card never slides under the top strip; (c) the browser checks look at the bar in the side-by-side layout too (820 × 1000, `m79-side-leave-step1`), and the 1440 × 900 shot of Leaving the berth is `m79-wide-leave-step1`; (d) Space on the engine row and ← / → on a line row press the row's button instead of sending the action (same effect), left as it is; (e) the hint and the bar together crowd a phone's view until M80 folds the hint, left as it is.

9. **Owner test on a computer (PR 168; recommended; merging accepts it):** (a) on the side and wide layouts the bar no longer pushes the chip row and the mini-map up: with room (at least 400 px between the mini-map and the chips, e.g. a 2200 px screen) the bar stands in the same bottom row between them (`data-place="row"`); with less room (a 1440 px screen) it stands over that row, which stays where it was (`data-place="above"`); `--exercise-stack-h` is 0 there, and the camera inset counts the bar's top; on a phone nothing changes; (b) the anchor chain row shows the length out ("Chain in the water · 12 m") as the Anchor section does; (c) the two thrusters on a phone are hard to hold with two thumbs while also steering: a global rework (latching thrusters) is a question for the owner (PR 168), not part of M79.

### 6.10 Not in M79

The camera's soft movement, the folded hint and time bar, the labels default (M80); Watch and Show me (M81); Realistic rope rows (M82).

---

## 7. M80: A clear exercise screen

**Independent review: required** (the camera framing of every mode changes; the labels default changes old exercise links).

### 7.1 Files

As 4.5.

### 7.2 Data (`src/render3d/sceneConfig.ts`, `SCENE.camera`)

`viewportEaseS: 0.35` (**tunable**, 0.25–0.5): how long the framing takes to follow a change of the free area.

### 7.3 Camera (`src/render3d/cameraRig.ts`): the yacht in the middle of the free part, moving softly (owner)

- **Split.** `setViewport`'s body after the clamping becomes `applyViewport(width: number, height: number, inset: number, top: number): void` (the projection, the lens and the preset or focus refit, exactly as today, including what it does today while `interacting`, while a `tween` runs, or with a `focus`). `options` (`{ ...presetOptions, helm }`) is set at once in `setViewport`, never eased.
- **Ease.** `setViewport(width, height, bottomInset, options, topInset)` clamps as today (`maxBottomInsetShare`, `maxTopInsetShare`, `minFreePx`) into the pair `(inset, top)`; the ease always runs on these **clamped** values. A private flag `applied` (false until the first `applyViewport`). If `!applied`, or `width` or `height` differs from the viewport shown: cancel any ease and `applyViewport` at once (the first frame, a rotation or a resize jump, as today). Else start an ease `{ from: the (inset, top) shown now, to: the new pair, start: performance.now() }` (the same clock the tweens use; a new ease starts from the values shown at that moment).
- **Gestures and tweens:** a gesture (`interacting`) does not cancel an ease (`applyViewport` already skips the refit while interacting, so only the projection moves); while a preset tween runs, `applyViewport` writes `tween.to` as today and the tween moves the pose, so both end together. A sheet snap starts one ease from `sheet.onChange` (fired once, after the sheet has settled; `cameraInset()` is the settled value).
- **`update(now)`:** first, while an ease runs: `k = easeInOut(min(1, (now − start) / (SCENE.camera.viewportEaseS × 1000)))`, `applyViewport(width, height, lerp(from.inset, to.inset, k), lerp(from.top, to.top, k))`; at `k = 1` the ease ends. Then the existing tween code, unchanged. A preset view stays fitted throughout; a camera moved by hand keeps its pose, only the framing centre moves.
- **What the free area is.** The insets `app.ts` already passes: the top is the bottom of `.view-top` (strip, time bar, step line, the hint when open); the bottom inset is, stacked, `sheet.cameraInset()` + M79's stack height (6.5), and, side and wide, `viewBox.bottom − chipRow.top`, where the chip row already sits above M79's stack. The hint opening resizes `.view-top`, whose `trackTopHeight` already calls `reframe`; a sheet snap calls it through `sheet.onChange` once per snap; the stack's ResizeObserver (6.5) calls it too. No other change in `app.ts` for the camera.
- **New rig method** `freeArea(): { top: number; bottom: number }`: the eased area now shown, as y coordinates in CSS px from the view's top (`top`, and `height − inset`).
- **Debug hook** (`scene.ts`, only with `debug=1`): `window.__sailCamera = { freeArea: () => rig.freeArea(), boatBox: () => … }`. `boatBox()` returns `{ top, bottom, left, right }` in the same CSS px: the eight corners of `new Box3().setFromObject(boatModel.root)` (the current `boatModel`, read at call time: it is rebuilt on a detail change) (the whole boat model: hull, rig, sails, ropes; the 3D labels are DOM and do not count) projected with the camera (`Vector3.project`, which includes the view offset), mapped to CSS px with the view's `clientWidth` / `clientHeight` (`y = (1 − ndc.y) / 2 × clientHeight`).

### 7.4 The hint folded on a phone (`src/ui/exerciseCoach.ts`, owner)

`createExerciseCoach(top: HTMLElement, store: Store, layout: LayoutShell): void` (`app.ts` passes its `layout`). On the stacked layout the hint shows **folded** at a **run start** (the store moves `exercise.status` from `setup` to `running`, or a `load` brings a run that is already `running`) and at every **step change** (`run.step` differs from the previous state's); a tap opens it until the next of these; a `mistake` → `running` return keeps what it was. Nothing is written to `sail-learn.coach` on the stacked layout. On side and wide the remembered value (read once at creation, open by default) decides, as today; turning the device from stacked to side shows the remembered value, back to stacked the folded rule again. A language change reloads the page (M23), so it starts again from these rules. In `setup` the hint is not shown (as today).

### 7.5 The time bar folded during a run on a phone (`src/ui/timeBar.ts`)

`createTimeBar(host: HTMLElement, store: Store, layout: LayoutShell): HTMLElement` (`app.ts` passes its `layout`). Only where the fold button exists today (the speed part is available; where it is not, nothing changes): on the stacked layout, while a run's status is `running` or `mistake`, the bar shows **folded** unless the learner has tapped it open during this run (a separate private flag `runUnfolded`, reset at every run start as 7.4 defines it and when the run ends; the saved `folded` variable is not touched); that tap is not written to `sail-learn.timeBarFolded`. Outside a run, and on side and wide, the saved fold decides as today.

### 7.6 Labels off in exercises

As 4.3 (all of it is M80).

### 7.7 Tests (`tests/exerciseScreen.test.ts`)

- `defaultLabels`: `('easy','exercise')` false, `('easy','easy')` true, `('realistic','learn')` false.
- The points-of-sail start link (no `lb`) parses with `settings.labels === false`; with `lb=1` true; a waypoint link (`exw=1`) without `lb` false; serializing an exercise state with labels on writes `lb=1`, with labels off writes no `lb`.
- `setAppMode`: exercise → easy (Easy ropes) turns the labels on; easy → exercise turns them off; learn → harbour leaves them as they were; `setRopesMode` to Easy inside an exercise keeps them off.
- `grep -rln "m=exercise" tests/` and run those files: any test whose expected link or state has labels on gets `lb=1` added; list each in the PR.

### 7.8 Browser checks (`scripts/shots-m80.mjs`, test clock)

1. **Phone, Points of sail step 1:** `exercise-coach-toggle` has `aria-expanded="false"`; `time-fold` has `aria-expanded="false"`; the 3D label layer of `src/ui/labels3d.ts` shows no label; `__sailCamera.boatBox()`'s vertical centre lies within 15 % of the free area's height of the free area's centre, and its top and bottom lie within the free area ±8 px.
2. **Soft move:** read `freeArea().top`, tap the hint open; after `page.waitForTimeout(100)` it lies strictly between the old and the final value; after `page.waitForTimeout(500)` it equals the final value ±1 px, and check 1's centring holds. The same for `freeArea().bottom` with `setSheet(page, 'half')` and back to `'peek'` (`scripts/ui.mjs`).
3. **Next step** folds the hint again. `time-fold` tapped open stays open until the run ends (Stop), and the next Start shows it folded; `localStorage['sail-learn.timeBarFolded']` is unchanged throughout.
4. **Wide (1440 × 900):** the hint open, no label, the centring of check 1 above the bar.
5. **Earlier checks:** run `SHOTS_ONLY=m26,m64,m80` locally (the sheet framing and the Helm camera checks); both keep passing.

**Tunable:** if check 2's 100 ms reading is already final, raise `viewportEaseS` within 0.25–0.5; if 500 ms is not enough, lower it.

### 7.10 Decided in the M80 PR (recommended; merging accepts it)

1. `defaultLabels` and `withRopesMode` take the app mode as a plain `string` (default `'easy'`), not `AppMode`: the lint rule keeps `src/model` from importing app code (PHASE1_SPEC 9.1).
2. The exercise start link (`exerciseStartLink`) compares `lb` with the Exercises default whatever the mode of the state it is built from, so a link made from Easy mode with labels on still carries `lb=1`.
3. The browser check reads the 100 ms framing from the test clock: the ease starts one frame after the tap (the hint's `ResizeObserver` fires on the next frame), so the 100 ms reading is only just past the start (230 → 231 px), the 600 ms reading is final. `viewportEaseS` stays at 0.35.
4. The hint folded on a phone uses `run.id`, `run.step` and the previous status; a `mistake` → `running` return at the same step keeps what the learner had.
5. In the check the run is ended with the `stop` command (the Stop button asks twice) and started again from the exercise list.
6. `shots.mjs` label rules (`held`, flat sea, clock chip, mini-map, …) get `8\d` so labels with "m80" and later behave like the Phase 10 ones.
7. Independent review, owner: "fix all 5": (a) on a phone the open hint's body is limited to the share the camera counts as covered (`maxTopInsetShare`, 40 %) and its list scrolls inside, and the browser check also compares the yacht with the real lower edge of `.view-top`; (b) the `?m=exercise` link (no `ex=`) opens with the labels off too (the rule is in the general parse); (c) the PR description's links carry the real number; (d) `setViewport` does not restart a glide for the target it is already heading to; (e) WORKFLOW says "Show hint".

### 7.9 Done when / not in M80

Checks and tests pass; the framing eases in every mode on a sheet snap and on the hint; nothing else of the camera changes. Not in M80: Watch's card (M81 puts it in the stack, so the same rule frames it).

---

## 8. M81: Watch and Show me

**Independent review: required** (a new store action and a split of `reduce`; pilots for 14 exercises; progress and debrief must ignore the app's own actions).

### 8.1 Files

As 4.5. `tests/harbourPilot.ts` keeps only test helpers: `export * from '../src/app/exercisePilots';` plus `goodRun` (moved there from `harbourExercises.test.ts`, which imports it from there), with the signature `goodRun(id: string, level: ExerciseLevel, pilot: Pilot, limitS: number, ropes: RopesMode = 'easy', options: Partial<ExerciseOptions> = {})` (options dispatched in `setup` before `start`, as `{ options }`), and `runFrom(state: AppState, pilot: Pilot, until: (s: AppState) => boolean, limitS: number): { state: AppState; timeS: number; mistakes: number }` (the same 0.05 s loop from a given state, the pilot called with `t = state.exercise.elapsedS`, as `pilotActions` does).

### 8.2 Data

None. `content/exercises/exercises.json` is unchanged unless the coverage test (8.6) adds a row.

### 8.3 Pilots (`src/app/exercisePilots.ts`)

Move every helper and pilot from `tests/harbourPilot.ts` here unchanged (`Pilot`, `H`, `lever`, `rudder`, `line`, `thr`, `windlass`, `stern`, `bow`, `clamp`, `wrap180`, `setFenders`, `leavePilot`, `enterPilot`, `turnPilot`, `buoyPilot`, `anchorPilot`, M78's `sternAnchorPilot` and its constants), with two changes:

1. **Recording.** The module's `A = (s: AppState, a: Action): AppState => { const next = reduce(s, a); if (recording && next !== s) recording.push(a); return next; }` (an action the store refuses is not recorded), with `let recording: Action[] | null = null;` set and cleared only by `pilotActions` (3.2), which returns `[]` when `state.exercise` is null. Every helper goes through `A`. Imports: `reduce`, `Action`, `AppState`, `AutopilotCommand`, `EngineCommand` from `./store`; `ControlId` from `../model/controls`; `twaSignedDeg`, `boatPoint`, `ExerciseLevel` from `../model/exercises`; `RealisticAction` from `../model/realistic` (M82); the rest as `tests/harbourPilot.ts` imports today. The `16.5` in `gustsPilot` becomes `const GUSTS_EASE_ABOVE_KN = 16.5; // the GUST badge's threshold in this exercise (1.1 × 15 kn)` (a pilot's script value, not boat data).
2. **Entry phase of `enterPilot`** (3.5): `let phase = -1;` and, first thing on the first call, `if (phase === -1) phase = [0, 0, 4, 6, 6, 8][s.exercise.step] ?? 0;`.

**New: the sailing pilots (Easy ropes)**, verbatim from the prototype:

```ts
const ctl = (s: AppState, values: Partial<Record<ControlId, number>>): AppState =>
  Object.entries(values).some(([k, v]) => s.controls[k as ControlId] !== v)
    ? A(s, { type: 'setControls', values })
    : s;
const ap = (s: AppState, command: AutopilotCommand) => A(s, { type: 'autopilot', command });
const eng = (s: AppState, command: EngineCommand) => A(s, { type: 'engine', command });
/** Seconds since the current step began (run time, 3.1). */
const inStep = (s: AppState) => (s.exercise ? s.exercise.elapsedS - s.exercise.stepStartS : 0);
/** Runs `fn` once per (step, key): the pilot's one-off taps. */
function onceMaker() {
  const done = new Set<string>();
  return (s: AppState, key: string, fn: (s: AppState) => AppState) => {
    const k = `${s.exercise?.step}:${key}`;
    if (done.has(k)) return s;
    done.add(k);
    return fn(s);
  };
}
const turns = (s: AppState, n: number, deg: number) => {
  for (let i = 0; i < n; i += 1) s = ap(s, { turnDeg: deg });
  return s;
};

export function pointsOfSailPilot(): Pilot {
  const once = onceMaker();
  return (s) => {
    switch (s.exercise?.step) {
      case 0: return ctl(s, { ctl_mainsheet: 12 });
      case 1: return ctl(once(s, 't', (x) => turns(x, 2, -10)), { ctl_mainsheet: 25 });
      case 2: return ctl(once(s, 't', (x) => turns(x, 3, -10)), { ctl_mainsheet: 50, ctl_jib_sheet: 100 });
      case 3: return ctl(once(s, 't', (x) => turns(x, 4, -10)), { ctl_mainsheet: 100 });
      case 4: return once(s, 't', (x) => turns(x, 3, -10));
      default: return s;
    }
  };
}
export function tackingPilot(): Pilot {
  const once = onceMaker();
  return (s) => {
    switch (s.exercise?.step) {
      case 0: return once(s, 'tack', (x) => ap(x, 'tack'));
      case 1: return ctl(once(s, 'off', (x) => ap(x, 'off')), { ctl_rudder: -25 });
      case 2: return twaSignedDeg(s) > 35 ? ctl(s, { ctl_rudder: 0 }) : s;
      case 3: return once(s, 'w', (x) => ap(ap(x, 'wind'), { turnDeg: -10 }));
      default: return s;
    }
  };
}
export function ironsPilot(): Pilot {
  return (s) => {
    switch (s.exercise?.step) {
      case 0: return ctl(s, { ctl_mainsheet: 60, ctl_jib_sheet: 60 });
      case 1: return ctl(s, { ctl_rudder: 30 });
      case 2: return ctl(s, { ctl_rudder: 0, ctl_mainsheet: 12, ctl_jib_sheet: 30 });
      default: return s;
    }
  };
}
export function gybingPilot(): Pilot {
  const once = onceMaker();
  return (s) => {
    switch (s.exercise?.step) {
      case 0: return ctl(s, { ctl_mainsheet: 5 });
      case 1: return once(s, 'g', (x) => ap(x, 'tack'));
      case 2: return ctl(s, { ctl_mainsheet: 100 });
      case 3: return once(s, 'h', (x) => turns(ap(x, 'heading'), 3, 10));
      default: return s;
    }
  };
}
/** The GUST badge shows above 1.1 × the mean wind (16.5 kn here): ease the main while it shows. */
export function gustsPilot(): Pilot {
  return (s) => {
    switch (s.exercise?.step) {
      case 0: return ctl(s, { ctl_mainsheet: s.wind.twsKn > 16.5 ? 45 : 25 });
      case 1: return ctl(s, { ctl_mainsheet: 35 });
      default: return s;
    }
  };
}
export function reduceSailPilot(): Pilot {
  return (s) => {
    switch (s.exercise?.step) {
      case 0:
        return inStep(s) < 0.5
          ? ctl(s, { ctl_jib_sheet: 100 })
          : ctl(s, { ctl_jib_sheet: 100, ctl_jib_furl: 40 });
      case 1: return ctl(s, { ctl_jib_sheet: 75, ctl_main_furl: 60 });
      case 2: return ctl(s, { ctl_mainsheet: 35 });
      default: return s;
    }
  };
}
export function setSailsPilot(): Pilot {
  const once = onceMaker();
  return (s) => {
    switch (s.exercise?.step) {
      case 1: return ctl(s, { ctl_main_furl: 100 });
      case 2: return once(s, 'w', (x) => turns(ap(x, 'wind'), 6, -10));
      case 3: return ctl(s, { ctl_jib_furl: 100, ctl_jib_sheet: 30 });
      case 4: return once(s, 'e', (x) => eng(eng(x, { leverPct: 0 }), 'stop'));
      default: return s;
    }
  };
}
export function furlSailsPilot(): Pilot {
  const once = onceMaker();
  return (s) => {
    switch (s.exercise?.step) {
      case 0: return once(s, 'e', (x) => eng(x, 'start'));
      case 1: return ctl(s, { ctl_jib_sheet: 100, ctl_jib_furl: 0 });
      case 2: return once(s, 'h', (x) => turns(ap(eng(x, { leverPct: 30 }), 'heading'), 6, 10));
      case 3: return ctl(s, { ctl_main_furl: 0 });
      default: return s;
    }
  };
}
```

`pilotFor(id, level, ropes)`: harbour exercises (group `harbour`) ignore `ropes`: `leave-berth` → `leavePilot(level)`, `enter-berth` → `enterPilot(level)`, `turn-own-length` → `turnPilot()`, `mooring-buoy` → `buoyPilot()`, `anchor-shore` → `anchorPilot()`, `stern-to-anchor` → `sternAnchorPilot()`. The eight others: with `ropes === 'easy'` the matching function above; with `'realistic'` `null` (M82 adds two). Unknown id → `null`.

### 8.4 Store (`src/app/store.ts`, `src/app/exerciseRun.ts`)

As 4.1 and 4.2: the three run fields, the `demo` action, the `demo` command, the step pause of a demo. `{ back }` already works in `done` (`restoreWaypoint` has no status check); `{ back }` ends a demo (4.2), so the cards need no second dispatch.

### 8.5 UI

**Who builds what.** `app.ts` creates `const demo = createExerciseDemo(store)` before the bar and passes it to `createExerciseBar(…, demo)` (a new last parameter); the frame loop calls it (4.2). Everything else reads `run.demo` from the store, so the panel, the line and Resume need no new parameter.

**`src/ui/exerciseDemo.ts`** (new):

```ts
export interface ExerciseDemo {
  /** Called by app.ts before each 0.05 s part of a frame while run.demo !== null (4.2). */
  frame(): void;
  /** The rows each dispatched demo batch worked (barRowOf of its actions), for the bar's flash. */
  onActions(cb: (rows: BarRowId[]) => void): void;
}
export function createExerciseDemo(store: Store): ExerciseDemo;
```

It keeps one `pilot: Pilot | null`. In its `store.subscribe`: when `run.demo` turns from null to non-null, it makes a fresh `pilotFor(run.id, run.options.level, state.settings.ropesMode)`; when `run.demo` turns null or the run ends, `pilot = null` and it releases every hold the pilot may have left: one `{ type: 'demo', actions }` with `{ type: 'thruster', which, dir: 0 }` for each thruster not at 0, `{ type: 'windlass', motion: 'off' }` when the windlass moves, and (M82) `{ type: 'realistic', action: { type: 'button', winch, held: false } }` for each winch whose `button` is true. `frame()`: when `pilot`, the run is `running`, `!state.paused`, and (`demo === 'watch'` or `run.step === run.demoStep`): `actions = pilotActions(pilot, state)`; if not empty, dispatch `{ type: 'demo', actions }` and call the `onActions` listeners with the union of `barRowOf` of the actions.

**The cards are read from the state** (no card state of their own). `div.exercise-demo-card` (`data-testid="exercise-demo-card"`, first child of `.exercise-stack`, so the M80 framing counts it), styled like the step card (`h3`, `p`, buttons in the accent and plain styles):

- **Step done (Watch):** `run.demo === 'watch'`, status `running`, `run.stepPause`: `h3` `t('exercise.demo.stepDone', { n: run.step })` (the 1-based number of the step just finished), `p` that step's `how` text, buttons **Next step** (`exercise-demo-next`, `t('exercise.demo.next')`: `setPaused false`) and **Let me try it** (`exercise-demo-try`, `t('exercise.demo.try')`: `{ back: run.step − 1 }`, which ends the demo). When time goes on by any other way (Resume, the time bar), `stepPause` turns false and the card goes.
- **Now you (Show me):** `run.demo === 'showMe'` and (`run.step > run.demoStep` or status `done`): `h3` `t('exercise.demo.nowYouTitle')`, `p` `t('exercise.demo.nowYou')`, button **Back to the start of the step** (`exercise-demo-back`, `t('exercise.demo.back')`: `{ back: run.demoStep }`, which ends the demo). Until then the row buttons stay disabled (intended: the learner does the step from its start).
- `src/ui/exerciseBar.ts` builds the cards (it owns the stack) and reads `run.demo` from the store. On a phone the stack, cards included, shows only while the sheet is at peek (as the bar). The stack shows when the bar shows **or** a card shows (so the Now-you card also shows on the last step, while the status is `done`; the panel's done card waits in the panel, and is replaced by the step card after Back). The Resume button over the 3D view (`exerciseResume.ts`) is hidden while a demo card shows.

**Setup card** (`exercisePanel.ts`): a button **Watch it** (`exercise-watch`, `t('exercise.watch')`, accent style) beside Start, which now reads `t('exercise.start')` = "Do it myself" (English and Russian changed; `exercise.start` has no other caller than the two Start buttons, check with `grep`). Order: stacked: Watch it, Do it myself; side and wide: Do it myself, Watch it. Watch it dispatches `{ demo: 'watch' }` then `'start'` (and on a phone lowers the sheet to peek, as Start does). It is hidden when `pilotFor(id, level, ropes)` is null. A waypoint setup (`startStep > 0`) offers it too: the demo plays from that step.

**Step line** (`exerciseLine.ts`): while `run.demo` is `'watch'` or `'showMe'`, every line text gets the prefix `t('exercise.watching')` or `t('exercise.showing')` in `span.exercise-line-demo` (accent colour), also before the paused-after-step and mistake texts.

**Bar** (`src/ui/exerciseBar.ts`): the head gets **▶ Show me** (`exercise-bar-showme`, `t('exercise.bar.showMe')`: `{ demo: 'showMe' }`) while the run is `running`, `run.demo === null` and `pilotFor(…)` is not null; key `Enter` presses it on side and wide (with M79's key filter: not when focus is on a button). During a demo the head's label reads `t('exercise.bar.demoLabel')`, the row buttons are `disabled`, the bar's keys do nothing, and the head shows **Stop watching** (`exercise-bar-stopdemo`, `t('exercise.bar.stopDemo')`: `{ demo: null }` — the learner goes on by hand from where the boat is) in place of Show me. `demo.onActions(rows)`: each row whose id is in `rows` gets class `bar-row-flash` for 600 ms (outline 3 px `var(--exercise-warning)` and a light fill of it; no other animation); a rebuild drops it.

**Mistakes during a demo:** the normal mistake card; Carry on lets the pilot go on from where the boat is; a `failed` run ends as any failed run (the stack hides; Try again loads a fresh run without a demo).

**Done and progress** (`exercisePanel.ts`, where it calls `recordDone` today, under the same `startStep === 0` guard): when the run turns `done`: `run.demo === 'watch'` → `recordWatched(id)` only; `run.demo === 'showMe'` → nothing (the learner has not done the last step; Back follows); else `recordDone(id, elapsedS)` as today (a run where Show me was used counts with its whole time, demo seconds included; a best time is the lowest, so such a time rarely wins). A watched run's done card has **Now do it myself** (`exercise-demo-doit`, `t('exercise.demo.doIt')`, accent: the `load` of Try again, which starts with `demo: null`) before Try again. The list shows `span.exercise-watched` (`data-testid="exercise-watched-<id>"`, `t('exercise.watched')`, hint colour) for an exercise in `watched` and not in `done`; the list is built again whenever it is shown (the run becomes null), so it reads the progress then.

**Debrief:** the demo's own actions are not in the log (the `demo` action is not logged); the step, event and back entries of a demo are, and the debrief shows them as today (11.2, 6).

### 8.6 Strings and limits

```json
"exercise.start": "Do it myself",
"exercise.watch": "Watch it",
"exercise.watching": "Watching · ",
"exercise.showing": "Showing · ",
"exercise.watched": "Watched",
"exercise.bar.showMe": "▶ Show me",
"exercise.bar.demoLabel": "The app is doing this step",
"exercise.bar.stopDemo": "Stop watching",
"exercise.demo.capped": "While the app plays the exercise, time runs at ×4 at most.",
"exercise.demo.stepDone": "✓ Step {n} done",
"exercise.demo.next": "Next step",
"exercise.demo.try": "Let me try it",
"exercise.demo.nowYouTitle": "Now you",
"exercise.demo.nowYou": "The boat goes back to where this step started. Then it is your turn.",
"exercise.demo.back": "Back to the start of the step",
"exercise.demo.doIt": "Now do it myself"
```

(`exercise.start` replaces the existing value; the others are appended after the M79 keys.)

**Step limits** (s, `ceil(1.2 × prototype + 3)`, 3.5) for the sailing pilots; the harbour pilots keep the limits of their existing tests:

| Exercise | Limits per step |
|---|---|
| points-of-sail | 10, 21, 20, 22, 25 |
| tacking | 72, 22, 61, 32 |
| irons | 5, 67, 36 |
| gybing | 8, 22, 9, 23 |
| gusts | 173, 13 |
| reduce-sail | 8, 7, 15 |
| set-sails (Easy) | 13, 7, 49, 11, 9 |
| furl-sails (Easy) | 6, 7, 20, 7 |

### 8.7 Tests (`tests/exercisePilots.test.ts`)

- **Good runs:** for each of the eight sailing exercises (Easy, level easy), `goodRun` (from `tests/harbourPilot.ts`, 8.1) ends `done`, no mistake, each step within 8.6's limits. The existing harbour good-run tests keep passing with the moved pilots.
- **Show me from every step:** for all 14 exercises (harbour at every level they have), run the good run and keep the state at each step's start; from each: `reduce(s, { type: 'exercise', command: { demo: 'showMe' } })`, a fresh `pilotFor(…)`, and `runFrom` until `run.step > k` or `done`: within the step's limit, no mistake, and `run.stepPause` true at the end. Harbour per-step limits (s, `ceil(1.2 × max(good run, fresh) + 3)` from 3.5): leave-berth easy 5, 5, 45, 34 / normal 5, 5, 45, 35 / hard 5, 5, 35, 35; enter-berth easy 5, 103, 103, 5, 27, 35 / normal 5, 90, 107, 5, 28, 28 / hard 5, 93, 121, 5, 27, 14; turn-own-length 29, 44; mooring-buoy 142, 5, 15, 5, 50; anchor-shore 96, 33, 88, 53, 75, 99; stern-to-anchor: measured in the M81 PR with the same formula and written under "Decided in the M81 PR". Sailing: 8.6.
- **Commands:** `{ demo: 'watch' }` is refused outside `setup`; `{ demo: 'showMe' }` outside `running`; `showMe` puts the boat back at the current step's waypoint and sets `demoStep`; `stepExercise` with `demo !== null` sets `stepPause` and `paused` even with `pauseOnStep` false; `{ demo: null }` clears both fields; a link of a run with a demo has no new key.
- **Coverage** (the phone promise): during each good run (driven through `pilotActions` and the `demo` action, as the app does), every action `pilotActions` returns maps through `barRowOf` to rows that are all in `barRowsFor(def, step, 'easy')` of the step it was sent in, or of the next step (a pilot may start the next step's work early: `enterPilot` takes the lazy line as soon as both stern lines are on). The prototype found no other miss with 6.2's rows. A miss fails with the exercise, step and row; fix it by adding the row to the step's `bar` (≤ 4 rows), and list it in the PR.
- **The demo action:** `reduce(state, { type: 'demo', actions: [setControls] })` equals applying the action, but `run.log` gains no `action` entry; a normal `setControls` still logs.
- **Progress:** `recordWatched` then `readProgress().watched[id]` is set; an old stored value without `watched` reads as `{}`; one with only `watched` keeps it; `recordDone` keeps `watched`.
- **Back ends a demo:** `{ back: k }` during `watch` or `showMe` leaves `demo === null`.
- `pilotFor('points-of-sail', 'easy', 'realistic')` is null; `pilotFor('leave-berth', 'hard', 'realistic')` is not.

### 8.8 Browser checks (`scripts/shots-m81.mjs`, test clock, 390 × 844)

1. **Watch Reduce sail:** Watch it; the step line starts "Watching ·"; after step 1 the demo card "✓ Step 1 done" with the step's How text; Next step twice more; the done card with "Now do it myself"; the list shows `exercise-watched-reduce-sail` and no tick.
2. **Watch Gybing:** tap Next step after each card; done within 70 s of app time; polling every 200 ms with `page.waitForTimeout`, `bar-row-control-ctl_mainsheet` was seen with `bar-row-flash` at least once.
3. **Show me, Points of sail step 2** (link with `step=1`): Do it myself; finish step 1 by taps (main sheet to 12); Show me; the line starts "Showing ·"; the Now you card appears; Back to the start of the step → the run is at step 2, `bar-row-control-ctl_mainsheet`'s value reads 12 % again, the bar enabled, Show me visible; the learner then finishes step 2 by taps.
4. **Let me try it** in Watch Leaving the berth after step 1: the run is back at step 1 (the lazy line on again), no demo.
5. **Debrief:** after check 3's run is done, "Show my actions" lists none of the demo's main-sheet moves of step 2 (only the learner's).
6. Accessibility audit with the demo card shown; Russian card fits.

### 8.9 Done when / not in M81

Checks and tests pass; Watch works for all 14 exercises in Easy ropes (the unit tests prove the runs; checks 1–2 the screen). Not in M81: Realistic-rope pilots and rows (M82).

---

## 9. M82: Realistic ropes in the bar (sign-off of issue #165 item 1)

**Independent review: not needed** (UI rows dispatching the existing Realistic gestures; data; the pilots are tested).

### 9.1 Files

As 4.5.

### 9.2 Data (`barRealistic`, verbatim)

| Exercise | Step `barRealistic`s, in step order |
|---|---|
| set-sails | `[]`, `["clutch:starboard:a2","winch:starboard:winch_primary_starboard:a3"]`, `["clutch:starboard:a2","winch:starboard:winch_primary_starboard:a3","autopilot:mode","autopilot:turn"]`, `["clutch:port:r1","winch:starboard:winch_primary_starboard:a5"]`, `["engine"]` |
| furl-sails | `["engine"]`, `["clutch:starboard:a5","winch:port:winch_primary_port:r1"]`, `["engine","autopilot:mode","autopilot:turn"]`, `["winch:port:winch_primary_port:r1","clutch:port:b3","clutch:starboard:a3","winch:starboard:winch_primary_starboard:a2"]` |

`isBarRowId` checks that the clutch key and the winch id exist at that station in the boat data (as `realisticPanel.ts` finds them).

### 9.3 Rows (`src/ui/exerciseBar.ts`)

**Station switch** (`div.bar-stations`, `data-row="stations"`, shown above the rows when the step's list has a `clutch:` or `winch:` row): two toggles, port then starboard (9.3a item 3) (testids `bar-station-port`, `bar-station-starboard`, the station's existing name strings), `aria-pressed` = `state.realistic.station` is that one; a tap dispatches `{ type: 'realistic', action: { type: 'station', station } }`. A station with a row this step shows a dot (`span.bar-station-dot`, 8 px, the warning colour of the Attention badge) while the learner is at another station. Only rope rows of the station the learner is at show; non-rope rows (`engine`, `autopilot:*`) always show. With the learner at a station that has no row this step: `p.bar-nothing` `t('exercise.bar.otherStation')`.

| Row | Name / small line | Buttons |
|---|---|---|
| `clutch:<station>:<key>` | the clutch's label and tag (9.3a item 1) / `t('exercise.bar.clutchOpen')` or `t('exercise.bar.clutchClosed')` | one button `t('exercise.bar.open')` / `t('exercise.bar.close')` (`bar-clutch-<key>`) → `{ type: 'clutch', key, open: !open }` |
| `winch:<station>:<winch>:<key>` | the winch's name / what is on it: `t('real.winch.empty')`, or the rope's name (9.3a item 1) + ` · ` + `t('exercise.bar.turns', { n })` + (tailed: ` · ` + `t('exercise.bar.tailed')`) | the next gesture the learner needs, as one or two buttons (the full rule, including a rope on the wrong way, is 9.3a item 4): empty → `t('exercise.bar.onWinch', { rope })` (`onWinch { key }`); on, fewer than 3 turns → `t('exercise.bar.addTurn')` (`turn { winch, delta: 1 }`) and `t('exercise.bar.offWinch')` (`offWinch { winch }`); 3 turns or more, not tailed → `t('exercise.bar.tail')` (`selfTailer { winch, into: true }`); tailed → **hold** `t('exercise.bar.hold')` (`button { winch, held: true }`, release `held: false` by 3.4's hold-button rule) and `t('exercise.bar.offWinch')`. A different rope on this winch than `key`: `t('exercise.bar.offWinch')` only |

The rest of Realistic mode (the handle, easing by hand, the mast, the bow) stays in the panel.

`barRowOf` (3.2) adds the `realistic` gestures. `pilotFor` returns, with `ropes === 'realistic'`, the Realistic pilots below for `set-sails` and `furl-sails`.

### 9.3a Details (decided in the planning PR after the builder check)

1. **Names:** from `tailSpecs()` (`TailSpec.label` and its furl / unfurl tag), as `stationDrawing.ts` builds them: a clutch row's name is the clutch's printed label plus, where the station drawing adds one, its tag (`real.tag.furl` "rolls in" / `real.tag.unfurl` "rolls out"), joined with ` · ` (so a2 and a3 differ: "Main furling · rolls in", "Main furling · rolls out"); the same text is `{rope}` in "Put {rope} on" and in the winch's small line. A winch's name: `t('real.winch.port')` or `t('real.winch.starboard')` by its station. The station toggles use `t('real.station.port')` and `t('real.station.starboard')`.
2. **State:** a clutch is open when `state.realistic.open[key]`; the learner's station is `state.realistic.station`; a winch's state is `state.realistic.winches[winchId]` (`tail`, `turns`, `selfTailer`, `button`, `cutOut`). Every row dispatches `{ type: 'realistic', action: { … } }`; `turn` uses `delta: 1`.
3. **Station switch:** shows both Port and Starboard whenever the step has a `clutch:` or `winch:` row; the dot (`var(--exercise-warning)`) on each that has a row this step and is not the learner's station; at the helm, mast or bow no toggle is pressed. Rows shown: the rope rows of the learner's station, then the other rows; `bar-nothing` with `t('exercise.bar.otherStation')` shows (above the other rows) only when the step has rope rows and none at the learner's station.
4. **Winch row buttons** (testids `bar-winch-<winchId>-on`, `-turn`, `-off`, `-tail`, `-hold`; row testid by the 6.5 rule, e.g. `bar-row-winch-starboard-winch_primary_starboard-a3`): no rope → **Put {rope} on**; another rope than the row's → **Off**; the row's rope with `turns < 0` → **Off** only (it went on the wrong way: take it off and start again); `0 ≤ turns < 3` → **+ Turn** and **Off**; `turns ≥ 3`, not tailed → **Into the self-tailer** and **Off**; tailed → **Hold ▲** and **Off**. The 3 is `BAR_TURNS_BEFORE_TAILER = 3` in `exerciseBar.ts` (a teaching default of the bar, the turns PHASE1_SPEC's Realistic mode asks before tailing; not boat data). With `cutOut` the small line adds ` · ` + `t('exercise.bar.cutOut')`.
5. **Keys:** a clutch row: Space toggles; a winch row: ← its first button, → its last, Space its first, a hold by keydown/keyup; the station switch has no key (the learner taps it, or uses the panel).
6. **Notices:** while `state.realistic.notice` is not null, or the handle is carried (`state.realistic.handle.place === 'carried'`), `p.bar-notice` under the rows shows the same text the Realistic panel shows (`noticeText(notice)` from `stationDrawing.ts`, or `t('real.notice.handleInHand')`).
7. **`barRealistic: []`** (set-sails step 0) wins over the placeholder: the bar shows `bar-nothing` (the step needs nothing: the start state passes it).
8. **Watch flash:** `barRowOf` maps a `station` gesture to the id `stations`; the bar flashes the station switch for it like a row.
9. **Pilots' stations:** `setSailsRealisticPilot` step 2 first walks to starboard (`{ type: 'station', station: 'starboard' }` at the start of its once-block), and `furlSailsRealisticPilot` step 3 first walks to port, so Show me works from wherever the learner stood. Station changes act at once (the prototype walked and worked in the same frame). The pilots ignore the crew choice; the tests run Alone (`goodRun(…, 'realistic', { crew: 'alone' })`).
10. **The PR** says `Part of #165` (not `Closes`: #165 is the whole launch checklist, closing it would close every other item); the agent does not edit the issue; the owner ticks item 1.

### 9.4 Realistic pilots (`src/app/exercisePilots.ts`, verbatim from the prototype)

```ts
const real = (s: AppState, action: RealisticAction) => A(s, { type: 'realistic', action });
const W = 'winch_primary_starboard';
const P = 'winch_primary_port';
const onWinch = (s: AppState, key: string, winch: string) => {
  s = real(s, { type: 'onWinch', key });
  for (let i = 0; i < 3; i += 1) s = real(s, { type: 'turn', winch, delta: 1 });
  return real(s, { type: 'selfTailer', winch, into: true });
};
export function setSailsRealisticPilot(): Pilot {
  const once = onceMaker();
  return (s) => {
    switch (s.exercise?.step) {
      case 1: {
        s = once(s, 'a', (x) => real(onWinch(real(real(x, { type: 'station', station: 'starboard' }), { type: 'clutch', key: 'a2', open: true }), 'a3', W), { type: 'button', winch: W, held: true }));
        if (s.controls.ctl_main_furl >= 99) s = once(s, 'r', (x) => real(x, { type: 'button', winch: W, held: false }));
        return s;
      }
      case 2:
        if (inStep(s) < 2) return s;
        return once(s, 'b', (x) => turns(ap(real(real(real(x, { type: 'station', station: 'starboard' }), { type: 'clutch', key: 'a2', open: false }), { type: 'offWinch', winch: W }), 'wind'), 6, -10));
      case 3: {
        s = once(s, 'c', (x) => real(onWinch(real(real(real(x, { type: 'station', station: 'port' }), { type: 'clutch', key: 'r1', open: true }), { type: 'station', station: 'starboard' }), 'a5', W), { type: 'button', winch: W, held: true }));
        if (s.controls.ctl_jib_sheet < 50) s = once(s, 'r', (x) => real(x, { type: 'button', winch: W, held: false }));
        return s;
      }
      case 4: return once(s, 'e', (x) => eng(eng(x, { leverPct: 0 }), 'stop'));
      default: return s;
    }
  };
}
export function furlSailsRealisticPilot(): Pilot {
  const once = onceMaker();
  return (s) => {
    switch (s.exercise?.step) {
      case 0: return once(s, 'e', (x) => eng(x, 'start'));
      case 1: {
        s = once(s, 'a', (x) => real(onWinch(real(real(real(x, { type: 'station', station: 'starboard' }), { type: 'clutch', key: 'a5', open: true }), { type: 'station', station: 'port' }), 'r1', P), { type: 'button', winch: P, held: true }));
        if (100 * s.rig.jibSolution.unfurled <= 1) s = once(s, 'r', (x) => real(x, { type: 'button', winch: P, held: false }));
        return s;
      }
      case 2: return once(s, 'h', (x) => turns(ap(eng(x, { leverPct: 30 }), 'heading'), 6, 10));
      case 3: {
        s = once(s, 'b', (x) => real(onWinch(real(real(real(real(real(x, { type: 'station', station: 'port' }), { type: 'offWinch', winch: P }), { type: 'clutch', key: 'b3', open: true }), { type: 'station', station: 'starboard' }), { type: 'clutch', key: 'a3', open: true }), 'a2', W), { type: 'button', winch: W, held: true }));
        if (s.controls.ctl_main_furl <= 1) s = once(s, 'r', (x) => real(x, { type: 'button', winch: W, held: false }));
        return s;
      }
      default: return s;
    }
  };
}
```

(Run with `options.crew = 'alone'`; With crew gives the same result. Format them with Prettier.)

### 9.5 Strings (appended)

```json
"exercise.bar.otherStation": "Nothing at this station for this step. The dot shows where to go.",
"exercise.bar.clutchOpen": "Open: the rope can run",
"exercise.bar.clutchClosed": "Closed: holds the rope",
"exercise.bar.open": "Open",
"exercise.bar.close": "Close",
"exercise.bar.turns": "Turns: {n}",
"exercise.bar.cutOut": "the motor cut out: ease the load",
"exercise.bar.tailed": "in the self-tailer",
"exercise.bar.onWinch": "Put {rope} on",
"exercise.bar.addTurn": "+ Turn",
"exercise.bar.offWinch": "Off",
"exercise.bar.tail": "Into the self-tailer",
"exercise.bar.hold": "Hold ▲"
```

### 9.6 Tests and limits

- Data: every `barRealistic` row `isBarRowId`; ≤ 4 rows.
- Good runs, Realistic, Alone (limits, s): set-sails `13, 28, 43, 58, 9`; furl-sails `6, 41, 20, 29`; no mistake.
- Show me from every step for both (same limits); coverage against `barRowsFor(def, step, 'realistic')` (a `station` gesture is covered by the station switch and counts as covered; the autopilot and engine rows as in 8.7).
- `barRowOf` for `clutch`, `onWinch`, `turn`, `selfTailer`, `button`, `offWinch`.

### 9.7 Browser checks (`scripts/shots-m82.mjs`, test clock, 390 × 844) and sign-off

1. **Setting the sails, Realistic, Alone, by taps only:** every step through the bar (the station switch, Open, Put … on, + Turn × 3, Into the self-tailer, hold `bar-winch-winch_primary_starboard-hold` (pointer down) and release it (pointer up) when `__sailExercise.read().controls.ctl_main_furl >= 99` (step 2) or `ctl_jib_sheet < 50` (step 4), as the pilot does); done; within the limits.
2. **Watch Furling the sails, Realistic:** tap Next step after each card; done; the station switch (`bar-stations`) was seen with `bar-row-flash`.
3. **Sign-off of issue #165 item 1** (the issue's "done when"): a list in the PR, one line per exercise (14), naming the unit test that proves its good run through the bar's controls (8.7 coverage plus the good runs) and the browser check that ran it on a phone (M79 1–2, M81 1–3, M82 1–2); the owner's phone check of WORKFLOW's M82 list; the issue's box for item 1 is ticked in the PR description by "Closes" only if the owner agrees (it is a checklist issue, so the PR says `Part of #165`, not `Closes`).

### 9.8 Done when / not in M82

Checks and tests pass; the PR has the sign-off list. Not in M82: Realistic rows for other exercises; the handle, easing by hand, the mast and bow stations in the bar.

---

## 10. Definition of Done (M79–M82)

- Every exercise is completed through the bar on a 390 × 844 phone in portrait in Easy ropes (and in Realistic ropes for Setting and Furling the sails) without folding a section; proved by the coverage tests and the browser checks.
- The controls a step needs are in the bar; "All controls" still opens the panel.
- Watch and Show me work for every exercise in Easy ropes and for the two Realistic ones.
- The computer has the same bar at the bottom of the 3D view, with keys.
- Every older test and browser check keeps passing.

## 11. Decisions

### 11.1 Owner's answers (planning chat, 2026-11-04)

1. Both ways on a phone: **Watch** and **Do it**; Watch first on a phone.
2. **Show me this step** inside Do it: yes.
3. Watch stops after each step and waits for Next.
4. Watch does not tick an exercise done; a separate "Watched" mark.
5. Realistic ropes in the bar: yes, after the mockup (M82, for the two Realistic exercises).
6. The same bar on the computer, with keys (#161 for exercises).
7. Camera handling (#145): out of this plan.
8. Mockup first: done (`docs/mockups/exercise-controls.html`), tried on the owner's phone.
9. No 3D hint arrow, no "phone-friendly" tag.
- Mockup answers: **A** the bar over the 3D, above the panel ("looks cleaner"); **B** normal buttons (48 px); **C** the hint folded on a phone; **D** the computer's bar at the bottom of the 3D view; **E** with windows over the 3D the yacht stays in the middle of the visible part with soft zoom movements; the 3D labels off by default in exercises.

### 11.2 Recommended (merging the planning PR accepts them)

1. The bar sits under the chip row, the mini-map and Resume on every layout (they move up above it), so nothing overlaps on a narrow computer view. *Recommended; merging accepts it.*
2. The Watch card shows the finished step's existing How text instead of a new explanation per step (no 70 new texts and Russian drafts). *Recommended; merging accepts it.*
3. The soft framing applies in every mode (a sheet drag eases too), not only in exercises: one rule, and a rotation still jumps. *Recommended; merging accepts it.*
4. On a phone the time bar folds during a run (it gives the 3D view a row back); a tap unfolds it for that run. *Recommended; merging accepts it.*
5. Exercises other than Setting and Furling the sails, run in Realistic ropes, keep their rope work in the panel (one "Stations" row in the bar) and have no Watch. *Recommended; merging accepts it.*
6. Show me's rewinds appear as "went back" lines in the debrief (the existing Back entry); the demo's own actions do not. *Recommended; merging accepts it.*
7. While the app plays (Watch, Show me) time runs at ×4 at most: the pilots act in small steps, and faster play made three harbour pilots fail in the prototype. *Recommended; merging accepts it.*
8. Going back (Go back, a waypoint) during Watch or Show me ends it; the learner goes on by hand. *Recommended; merging accepts it.*

### 11.3 Known limitations

- The `how` texts still say "In Ropes …" or "Open Harbour gear …"; true, but on a phone the bar is quicker. A later text pass can shorten them.
- Watch of the long harbour exercises takes minutes of app time (Anchoring with a line ashore about 6 minutes); the time bar's speed-up works during Watch.
