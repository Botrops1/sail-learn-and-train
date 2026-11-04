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

Every exercise works on a 390 × 844 phone in portrait, with no zooming and no folding of panel sections. During an exercise, the controls the current step needs sit in one **step bar** over the bottom of the 3D view (M79). The screen stays clear: on a phone the hint is folded, the time bar is folded, the 3D labels are off, and the camera keeps the yacht in the middle of the part of the 3D view left free, moving softly when something opens or closes (M80). Every exercise can also be **watched**: the app sails it step by step and stops after each step; and each step has **Show me**, which plays that one step and then rewinds so the learner can try it (M81). In Realistic ropes the bar shows the rope station's controls for *Setting the sails* and *Furling the sails* (M82).

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
- **Time:** pilots read the run's own clock (`run.elapsedS`, `run.stepStartS`), never the frame time, so they act the same at every frame rate.

### 3.2 Shared helpers (new)

| Name | File | Signature | Behaviour |
|---|---|---|---|
| `BarRowId` | `src/app/exerciseBar.ts` | `type BarRowId = string` | A row id as in 3.1. |
| `isBarRowId` | same | `(id: string) => boolean` | True for every form of 3.1 with a known control id, line code, station id and winch id (from the boat data). |
| `barRowsFor` | same | `(def: ExerciseDef, step: number, ropes: RopesMode) => BarRowId[]` | M79: the step's `bar`; with `ropes === 'realistic'` the `control:` rows of ropes (every control except `ctl_rudder`) are replaced by **one** `ropes` row (the placeholder, 6.5), placed where the first of them was. M82: when the step has `barRealistic` and `ropes === 'realistic'`, that list instead. |
| `barRowOf` | same | `(action: Action) => BarRowId[]` | The rows an action works: `setControls` → `control:<id>` for each key; `autopilot` `'off' \| 'heading' \| 'wind'` → `autopilot:mode`, `{ turnDeg }` → `autopilot:turn`, `'tack'` → `autopilot:tack`; `engine` → `engine`; `thruster` → `thrusters`; `line` → `line:<code>`; `setFenders` → `fenders`; `windlass` → `windlass`; (M82) `realistic` `clutch` → `clutch:<station>:<key>`, `onWinch` / `turn` / `selfTailer` / `button` / `offWinch` → the `winch:` row of that winch (any rope key); anything else → `[]`. |
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
- Keys stealing typing: the bar's keys ignore events whose target is an `input`, `select`, `textarea` or `[contenteditable]`, events with Ctrl, Alt or Meta, and do nothing while a chip card or menu is open (`chipMenu.ts` keeps the one open overlay).
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

No new field in `AppState` (nothing new travels in links or waypoints). New UI state:

```ts
// src/ui/exerciseDemo.ts (M81): what the app is playing, if anything. Not in the link.
export type DemoKind = 'watch' | 'showMe';
export interface DemoState {
  kind: DemoKind;
  /** showMe: the step being shown; watch: unused (-1). */
  step: number;
  pilot: Pilot;
  /** The learner's own `pauseOnStep`, put back when the demo ends. */
  learnerPauseOnStep: boolean;
  /** The card over the bar: none, a finished step (watch), or "Now you" (showMe). */
  card: 'none' | 'stepDone' | 'nowYou';
}
```

`src/app/exerciseProgress.ts` (M81): `ExerciseProgress` gets `watched: Readonly<Record<string, { at: string }>>` (a missing field reads as `{}`; `v` stays 1); `recordWatched(id: string): ExerciseProgress`.

### 4.2 Actions and the order of work

- **M81:** a new action `{ type: 'demo'; actions: Action[] }`. `reduce` is split: the body of today's `reduce` without its last line (the `logAction` call) becomes `reduceUnlogged(state, action)`; `reduce(state, action)` = `reduceUnlogged` and then, as today, `logAction` for a non-`step` action while `next.exercise !== null`. `case 'demo'` (handled at the top of `reduce`, before anything else): `action.actions.reduce((s, a) => reduceUnlogged(s, a), state)`; a nested `demo` inside is ignored. Alerts are still recorded (inside `reduceUnlogged`).
- **Frame order (M81):** in `app.ts`'s frame loop, `demoFrame(store)` runs **before** the `step` dispatch: when a demo exists, the run's status is `running`, `state.paused` is false and the step is the one being played, it dispatches `{ type: 'demo', actions: pilotActions(demo.pilot, state) }` when that list is not empty.

### 4.3 URL keys

No new keys. **Labels (M80, owner):** in Exercises mode the 3D labels are off by default: `defaultLabels(ropes, appMode)` (`src/model/settings.ts`) returns `false` when `appMode === 'exercise'`, else as today (`ropes !== 'realistic'`). `lb` is written when the labels differ from that default, as today. **Old links:** an exercise link without `lb` opened with labels on in Easy ropes; it now opens with them off (owner's decision); a link with `lb=1` keeps them on. Entering or leaving Exercises mode (`setAppMode`) sets `settings.labels` to the new mode's default, as `withRopesMode` does for the ropes mode.

### 4.4 Data (`content/exercises/exercises.json`)

Each step gets `"bar": BarRowId[]` (M79, required, 0–4 rows, the order shown top to bottom). M82 adds `"barRealistic": BarRowId[]` to the steps of `set-sails` and `furl-sails`. `src/model/exercises.ts`: `ExerciseStep` gets `bar: readonly string[]` and `barRealistic?: readonly string[]` (strings, so `src/model` does not import app code; `isBarRowId` checks them in the tests).

### 4.5 Files by milestone

| Milestone | New | Changed |
|---|---|---|
| M79 | `src/app/exerciseBar.ts`, `src/ui/exerciseBar.ts`, `tests/exerciseBar.test.ts`, `scripts/shots-m79.mjs` | `content/exercises/exercises.json`, `src/model/exercises.ts`, `src/app/app.ts`, `src/ui/thrusterPanel.ts`, `src/ui/enginePanel.ts`, `src/style.css`, `content/lang/{en,ru}/ui.json`, `scripts/shots.mjs`, `.github/workflows/ci.yml`, `docs/CODE_MAP.md` |
| M80 | `scripts/shots-m80.mjs` | `src/render3d/cameraRig.ts`, `src/render3d/sceneConfig.ts`, `src/render3d/scene.ts` (debug hook), `src/ui/exerciseCoach.ts`, `src/ui/timeBar.ts`, `src/model/settings.ts`, `src/app/urlState.ts`, `src/app/store.ts`, tests, `scripts/shots.mjs`, `ci.yml`, `docs/CODE_MAP.md` |
| M81 | `src/app/exercisePilots.ts`, `src/ui/exerciseDemo.ts`, `tests/exercisePilots.test.ts`, `scripts/shots-m81.mjs` | `tests/harbourPilot.ts` (re-exports), `src/app/store.ts`, `src/app/app.ts`, `src/app/exerciseProgress.ts`, `src/ui/exercisePanel.ts`, `src/ui/exerciseLine.ts`, `src/ui/exerciseBar.ts`, `src/ui/exerciseResume.ts`, strings, `scripts/shots.mjs`, `ci.yml`, `docs/CODE_MAP.md` |
| M82 | `scripts/shots-m82.mjs` | `exercises.json`, `src/app/exerciseBar.ts`, `src/ui/exerciseBar.ts`, `src/app/exercisePilots.ts`, tests, strings, `scripts/shots.mjs`, `ci.yml`, `docs/CODE_MAP.md`, issue #165 |

Each milestone gets its **own CI part** in `ci.yml` (`SHOTS_ONLY=m<N>`, added to the first part's `SHOTS_SKIP` list), as M77/M78 do.

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

Nothing new. The rows dispatch the existing actions. Thruster keys: `thrusterPanel.ts`'s A / D / J / L keys work when `appMode === 'harbour'` **or** while a run is active whose current step's bar has `thrusters` (today Harbour only).

### 6.5 UI (`src/ui/exerciseBar.ts`)

`createExerciseBar(view: HTMLElement, store: Store, layout: Layout, sheet: Sheet, panel: { showSection(id: SectionId): void }, onStackResize: () => void): void`, called in `app.ts` right after `createExerciseResume`. It appends to `view` one `div.exercise-stack` (`data-testid="exercise-stack"`) holding (M81 adds the demo card first) one `section.exercise-bar` (`data-testid="exercise-bar"`, `aria-label` = `t('exercise.bar.aria')`).

**Placement (owner: "over the 3D, looks cleaner"; "D agree").**

- `.exercise-stack`: `position: absolute; z-index: 8; bottom: calc(var(--view-bottom-inset, 0px) + 8px); display: flex; flex-direction: column; gap: 8px`. Stacked: `left: 8px; right: 8px`. Side and wide: `left: 50%; transform: translateX(-50%); width: min(560px, calc(100% - 16px))`.
- A `ResizeObserver` on the stack sets `--exercise-stack-h` on `layout.view` to `stack.offsetHeight + 8` px when the stack shows anything, else `0px`, and calls `onStackResize` (`app.ts` passes its `reframe`).
- Every CSS rule in `src/style.css` whose `bottom:` uses `--view-bottom-inset` for an element inside the 3D view (the chip row `.view-bottom`, the mini-map, `.exercise-resume`, the info card, and any other found by `grep -n "view-bottom-inset" src/style.css`), except `.exercise-stack`, adds `+ var(--exercise-stack-h, 0px)`. So the chip row, the mini-map, Resume and the info card sit **above** the bar on every layout.
- **Camera:** in `app.ts` `resize()`, the stacked inset becomes `sheet.cameraInset() + stackPx`, where `stackPx` is the number in `--exercise-stack-h` (0 when hidden); side and wide need nothing (their inset is measured to the chip row's top, which now sits above the stack).
- **When it shows:** `barShown(state)`, and on the stacked layout only while `sheet.height() === 'peek'` (it hides while the sheet is at half or full and comes back at peek). Hidden: `hidden` attribute on the bar (the stack measures 0).

**Look.** Like the instrument strip and the quick row: the strip's background, radius and shadow; `padding: 6px 8px 8px`; rows separated by a 1 px line in the strip's border colour; text 15 px, the small line 12 px in the hint colour. Buttons: the existing `.step-button` style at `min-width: var(--bar-touch); min-height: var(--bar-touch)` (48 px); text buttons (`Let go`, `Start`, …) the existing `.action-button` style at the same height. No new colours, no icons beyond the characters given here; not a card with a coloured header, not a floating toolbar of round icon buttons.

**Head row** (`div.exercise-bar-head`, min height 36 px): `span` `t('exercise.bar.label')` ("This step", hint colour, flex 1) and a button **All controls** (`exercise-bar-all`, `t('exercise.bar.all')`, compact 36 px high) that calls `panel.showSection(section)` with the same mapping as the step card's "Show the controls" (`exercisePanel.ts`: `step.opens`, `engine`/`autopilot` → `helm` and `anchor` → `ropes` when not available). M81 adds Show me here.

**Rows** (`div.bar-row`, `data-row="<BarRowId>"`, `data-testid="bar-row-<id with ':' replaced by '-'>"`, e.g. `bar-row-control-ctl_mainsheet`; layout: a name block `div.bar-row-name` (flex 1, the name in 15 px and `small` under it) and the buttons on the right). Each row's content:

| Row | Name / small line | Buttons (left to right) and what they dispatch |
|---|---|---|
| `control:<id>` | `t(controlView(id).name)` / `t('exercise.bar.sheet')` for `ctl_mainsheet`, `ctl_jib_sheet`, `ctl_vang`, `ctl_topping_lift`; `t('exercise.bar.furl')` for `ctl_main_furl`, `ctl_jib_furl`; `t('exercise.bar.rudder')` for `ctl_rudder` | `stepButton('−', …)`, the value `span.bar-value` = `valueText(controlView(id), value)` (min width 64 px, centred, bold, tabular figures), `stepButton('+', …)`; each dispatches `setControls` with `snapControl(id, value ∓/± settings.step, settings.step)`, as `quickRow.ts` |
| `autopilot:turn` | `t('exercise.bar.autopilot')` / the mode: `t('exercise.bar.ap.off')`, `t('exercise.bar.ap.heading', { deg })` (`Math.round(targetDeg)`), `t('exercise.bar.ap.wind', { deg, side })` (`Math.round(Math.abs(targetDeg))`, `side` = `sideLetter(targetDeg)` from `autopilotPanel.ts`) | `◀ {L}°` (`bar-ap-port`, aria `t('exercise.bar.ap.portAria', { deg: L })`) → `{ type: 'autopilot', command: { turnDeg: −L } }`; `{L}° ▶` (`bar-ap-starboard`) → `{ turnDeg: +L }`; `L` = `physics.autopilot.largeStepDeg`. Both disabled in Standby or Held still, as in the Steering section |
| `autopilot:mode` | `t('exercise.bar.autopilot')` / the same mode text | three toggle buttons with the Steering section's own strings for Standby, Heading and Wind (`aria-pressed`; testids `bar-ap-off`, `bar-ap-heading`, `bar-ap-wind`) → `'off'`, `'heading'`, `'wind'` |
| `autopilot:tack` | `t('exercise.bar.autopilot')` / the same mode text | one button with the Steering section's Tack / Gybe label and rule (Gybe when \|TWA\| ≥ 90°) (`bar-ap-tack`) → `'tack'`; disabled as there |
| `engine` | `t('exercise.bar.engine')` / `leverText(leverPct)`, and ` · ` + `rpmText(state)` while running | `t('exercise.bar.astern')` "◀ Astern" (`bar-lever-astern`) and `t('exercise.bar.ahead')` "Ahead ▶" (`bar-lever-ahead`), each a `stepButton` (hold repeats) → `{ type: 'engine', command: { leverPct: clamp(leverPct ∓/± 5, −100, 100) } }`, disabled while the engine is off; then the Start/Stop button: `enginePanel.ts`'s private `startStopButton` is exported as `createStartStopButton(store, suffix = '')` with `data-testid="engine-startstop${suffix}"`; the bar uses `'-bar'` |
| `thrusters` | `t('exercise.bar.thrusters')` / `thrusterStatusText(state)` | `createThrusterPair(store, 'bar')`: a new `JoystickVariant` `'bar'` (testid suffix `-bar`, class `.thruster-pair-bar`, the `'quick'` variant's look at 48 px high). The row is left out when `!hasAnyThruster()` |
| `line:<code>` | `createLineRow(store, code, '-bar')` as it is (its own name, status and buttons) | as in Harbour gear |
| `fenders` | `t('exercise.bar.fenders')` / `fenderStatusText(state)` | `t('exercise.bar.fendersIn')` "In" and `t('exercise.bar.fendersOut')` "Out" (`bar-fenders-in`, `bar-fenders-out`, `aria-pressed`) → `{ type: 'setFenders', out }` |
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

### 6.7 Tests (`tests/exerciseBar.test.ts`)

- Every step of every exercise has `bar` with 0–4 entries, each `isBarRowId`; no row twice in a step.
- `isBarRowId`: true for `control:ctl_mainsheet`, `line:ll`, `thrusters`; false for `control:ctl_nope`, `line:xx`, `autopilot:left`, `''`.
- `barRowsFor(points-of-sail, 2, 'easy')` = its `bar`; with `'realistic'` = `['autopilot:turn', 'ropes']`; `barRowsFor(tacking, 1, 'realistic')` keeps `control:ctl_rudder`.
- `barRowOf`: `setControls { ctl_mainsheet, ctl_jib_sheet }` → both control rows; `autopilot { turnDeg: -10 }` → `autopilot:turn`; `'wind'` → `autopilot:mode`; `'tack'` → `autopilot:tack`; `engine 'start'` → `engine`; `thruster` → `thrusters`; `line { code: 'sl' }` → `line:sl`; `setFenders` → `fenders`; `windlass` → `windlass`; `step` → `[]`.
- `barShown`: false with no run, in `setup`, `done`, `failed`; true in `running` and `mistake`.

### 6.8 Browser checks (`scripts/shots-m79.mjs`, test clock)

Scenes (phone first; links are the exercise start links plus `debug=1`; Start tapped, then the step reached through `__sailExercise.dispatch` of the pilot-free actions of PHASE10_SPEC's checks):

- `m79-phone-pos-step2`: Points of sail at step 2, 390 × 844.
- `m79-phone-leave-step4`: Leaving the berth at step 4.
- `m79-phone-anchor-step5`: Anchoring with a line ashore at step 5 (four rows).
- `m79-wide-pos-step3` and `m79-side-leave-step4`.

Live checks (390 × 844 unless named):

1. **Points of sail by taps only:** Start; then only taps on the bar (`bar-row-control-ctl_mainsheet` buttons, `bar-ap-port`, the jib sheet row); every step done within its limit (8.6's table); the done card shows. No `__sailExercise.dispatch` after Start.
2. **Leaving the berth by taps only:** `line-ll-letGo-bar`, both stern lines, `bar-lever-ahead` three taps, then hold the `-bar` joysticks (bow to starboard, stern to port) until the heading is 255–285°, release, `bar-lever-ahead`; done.
3. **Layout:** with the bar shown, its box is inside the viewport, does not overlap the chip row, the mini-map or the sheet (bounding boxes), and the page does not scroll; at half sheet the bar is hidden and comes back at peek.
4. **Realistic placeholder:** Points of sail with `mode=realistic`: the row `bar-row-ropes` shows; `bar-ropes-stations` opens the Ropes section.
5. **Keys (1440 × 900):** Points of sail step 1: `1`, `ArrowLeft` × 4 → the main sheet down 4 steps; `Space` on Leaving the berth step 1 lets go the lazy line.
6. **All controls** opens the step's section; the accessibility audit (`a11y-audit.mjs`) with the bar shown at phone and wide size; Russian (`lang=ru`) bar fits without overflow.

### 6.9 Done when

Every exercise shows its bar at each step; checks 1–6 pass; `npm run typecheck`, `lint`, `test`, `build` pass; CODE_MAP lists the new files.

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

- Split `setViewport`'s body after the clamping into `applyViewport(width, height, inset, top)` (the projection, the lens and the preset or focus refit, exactly as today).
- `setViewport(width, height, bottomInset, options, topInset)` clamps as today into `(inset, top)`; then: if `width` or `height` differs from the current viewport, or no viewport was applied yet, call `applyViewport` at once (a rotation or resize jumps, as today); else start an **ease** `{ from: { inset, top } now shown, to: the new pair, start: now }` (a new ease starts from the values shown at that moment).
- `update(now)`: before the existing tween code, while an ease runs: `k = easeInOut(min(1, (now − start) / (viewportEaseS × 1000)))`, `applyViewport(width, height, lerp(from.inset, to.inset, k), lerp(from.top, to.top, k))`; the ease ends at `k = 1`. A preset view stays fitted throughout (applyViewport refits it); a camera moved by hand (`free` after a drag) keeps its pose, only the projection's centre moves.
- The free area is everything the 3D view shows between the bottom of `.view-top` (the strip, the time bar, the step line and the hint when open) and the top of the lowest overlay stack (the sheet, the step bar, M81's card, the chip row) — the insets `app.ts` already passes, plus M79's stack. Nothing else changes in `app.ts` except that the hint's opening and closing (`.view-top` resizes) already calls `reframe` through `trackTopHeight`.
- Debug hook (`scene.ts`, only with `debug=1`): `window.__sailCamera = { freeArea(): { top: number; bottom: number }, boatBox(): { top: number; bottom: number; left: number; right: number } }`: the eased area in CSS px from the view's top, and the hull and rig's projected bounding box (the boat group's `Box3` corners through the camera) in the same pixels.

### 7.4 The hint folded on a phone (`src/ui/exerciseCoach.ts`, owner)

On the stacked layout the hint window starts **folded** when a run starts and whenever the step changes; the learner's tap opens it until the next step; nothing is written to `sail-learn.coach` on the stacked layout. On side and wide nothing changes (the remembered choice, open by default).

### 7.5 The time bar folded during a run on a phone (`src/ui/timeBar.ts`)

On the stacked layout, while a run is active, the bar shows **folded** (the existing folded form beside the strip) unless the learner unfolds it during this run; that choice is not written to `sail-learn.timeBarFolded` and is forgotten when the run ends or a new run starts. Outside a run, and on side and wide, the saved fold decides as today.

### 7.6 Labels off in exercises (4.3)

`defaultLabels(ropes: RopesMode, appMode: AppMode = 'easy'): boolean` → `appMode === 'exercise' ? false : ropes !== 'realistic'`. Every caller passes the app mode (`urlState.ts` parse and serialize, `withRopesMode`, the new `setAppMode` rule). The Settings switch keeps working in an exercise (on → `lb=1` in the link).

### 7.7 Tests

- `defaultLabels`: `('easy','exercise')` false, `('easy','easy')` true, `('realistic','learn')` false.
- Exercise start link of points-of-sail (no `lb`) parses with `settings.labels === false`; with `lb=1` true; serialize of an exercise state with labels on writes `lb=1`; `setAppMode` from exercise to easy turns them on (Easy ropes).
- Every existing urlState test still passes (none of them is an exercise link with labels on; if one is, it gets `lb=1` and the PR says so).

### 7.8 Browser checks (`scripts/shots-m80.mjs`, test clock)

1. **Phone, Points of sail step 1:** the hint is folded (`exercise-coach-toggle` `aria-expanded="false"`), the time bar folded, no 3D label visible; `__sailCamera.boatBox()` lies inside `freeArea()`, its vertical centre within 15 % of the free area's height of the free area's centre.
2. **Soft move:** tap the hint open; 100 ms later `freeArea().top` lies strictly between its value before and after; 500 ms later it equals the final value (±1 px) and check 1's centring holds again. The same when the sheet goes from peek to half and back.
3. **Next step folds it again;** the time bar unfolded by a tap stays unfolded until the run ends; `localStorage['sail-learn.timeBarFolded']` unchanged.
4. **Wide (1440 × 900):** the hint open by default, labels off, the boat centred in the free area above the bar.
5. **Old links:** Easy mode link (no exercise) shows labels as before; the M64 Helm camera checks and the M26 sheet framing checks still pass (run `SHOTS_ONLY=m26,m64,m80`).

### 7.9 Done when / not in M80

Checks pass; the framing eases in every mode on a sheet move and on the hint; nothing else of the camera changes. Not in M80: Watch's card (M81 puts it in the stack, so it is framed by the same rule).

---

## 8. M81: Watch and Show me

**Independent review: required** (a new store action and a split of `reduce`; pilots for 14 exercises; progress and debrief must ignore the app's own actions).

### 8.1 Files

As 4.5. `tests/harbourPilot.ts` becomes `export * from '../src/app/exercisePilots';` so the existing tests keep their imports.

### 8.2 Data

None. `content/exercises/exercises.json` is unchanged unless the coverage test (8.6) adds a row.

### 8.3 Pilots (`src/app/exercisePilots.ts`)

Move every helper and pilot from `tests/harbourPilot.ts` here unchanged (`Pilot`, `H`, `lever`, `rudder`, `line`, `thr`, `windlass`, `stern`, `bow`, `clamp`, `wrap180`, `setFenders`, `leavePilot`, `enterPilot`, `turnPilot`, `buoyPilot`, `anchorPilot`, M78's `sternAnchorPilot` and its constants), with two changes:

1. **Recording.** The module's `A = (s, a) => { recording?.push(a); return reduce(s, a); }`, with `let recording: Action[] | null = null;` set and cleared only by `pilotActions` (3.2). Every helper goes through `A`.
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

### 8.4 Store (`src/app/store.ts`)

The `demo` action and the split of `reduce` as 4.2. `{ type: 'exercise', command: { back } }` must also work while the run's status is `done` (Show me on the last step, 8.5); if it does not today, accept it there, as for `running`.

### 8.5 UI

**`src/ui/exerciseDemo.ts`** (new): `createExerciseDemo(store: Store, layout: Layout): ExerciseDemo` with

```ts
export interface ExerciseDemo {
  /** The demo now, or null. */
  now(): DemoState | null;
  watch(): void;                 // from the setup card
  showMe(): void;                // from the bar, while running
  next(): void;                  // the card's Next step
  tryIt(): void;                 // the card's Let me try it
  nowYou(): void;                // the card's Back to the start of the step
  end(): void;                   // put the learner's pauseOnStep back, card none, demo null
  onChange(cb: () => void): void;
  frame(): void;                 // demoFrame (4.2), called by app.ts each frame before `step`
}
```

- `watch()`: `learnerPauseOnStep` = the run's option; dispatch `{ type: 'exercise', command: { options: { pauseOnStep: true } } }` then `'start'`; `demo = { kind: 'watch', step: -1, pilot: pilotFor(id, run.options.level, ropesMode), card: 'none' }`.
- `frame()`: as 4.2; for `watch` every step is played; for `showMe` only `demo.step`.
- When the store shows the run's step increase (or the status turn `done`) during a demo: `card = 'stepDone'` (watch) or `'nowYou'` (showMe). For watch on the last step, the status `done` ends the demo after `recordWatched(id)` (the done card shows, 8.5 below).
- `next()`: card none; `setPaused false` (the step pause of `pauseOnStep` lets time go on; the next step plays).
- `tryIt()` (watch, after step k is done): dispatch `{ back: k }` (k = the finished step), then `end()`: the learner does step k and goes on alone.
- `showMe()` (running, step k, a pilot exists): `learnerPauseOnStep` = option; dispatch `{ options: { pauseOnStep: true } }`, `{ back: k }`; `demo = { kind: 'showMe', step: k, pilot: pilotFor(…), card: 'none' }`.
- `nowYou()`: dispatch `{ back: demo.step }`, then `end()`.
- `end()` dispatches `{ options: { pauseOnStep: learnerPauseOnStep } }`. Stop, a `load`, Try again, leaving Exercises mode or a status `failed` also call `end()` (no option dispatch after a load).
- A mistake during a demo shows the normal mistake card; Carry on continues the demo.

**Setup card** (`exercisePanel.ts`): a new button **Watch it** (`exercise-watch`, `t('exercise.watch')`, the accent style) beside Start, which now reads `t('exercise.start')` = "Do it myself" (English and Russian changed). Order: stacked: Watch it, Do it myself; side and wide: Do it myself, Watch it. Watch it is hidden when `pilotFor(id, level, ropes)` is null. On a phone Watch it lowers the sheet to peek, as Start does.

**Step line** (`exerciseLine.ts`): during a demo the text starts with `t('exercise.watching')` ("Watching · ", watch) or `t('exercise.showing')` ("Showing · ", showMe), in the accent colour (`span.exercise-line-demo`).

**Bar** (`src/ui/exerciseBar.ts`): the head gets a button **▶ Show me** (`exercise-bar-showme`, `t('exercise.bar.showMe')`) while a run is `running`, no demo runs and a pilot exists; side/wide key `Enter` presses it. During a demo the head's label reads `t('exercise.bar.demoLabel')`, every bar button is `disabled`, and each action the demo dispatches flashes its rows (`barRowOf`): class `bar-row-flash` for 600 ms (an outline of 3 px in the warning colour the Attention badge uses and a light fill of it; no animation beyond that).

**Demo card** (`div.exercise-demo-card`, `data-testid="exercise-demo-card"`, first child of `.exercise-stack`, so it sits above the bar and is framed like it, M80): styled like the step card (`h3` and `p` and buttons):

- `stepDone`: `h3` `t('exercise.demo.stepDone', { n })` ("✓ Step 2 done"); `p` the finished step's `how` text; buttons **Next step** (`exercise-demo-next`, accent; on the last step it is not shown because the done card follows) and **Let me try it** (`exercise-demo-try`).
- `nowYou`: `h3` `t('exercise.demo.nowYouTitle')`; `p` `t('exercise.demo.nowYou')`; button **Back to the start of the step** (`exercise-demo-back`, accent).

The Resume button over the 3D view (`exerciseResume.ts`) is hidden while the demo card shows.

**Done card and list.** A watched run's done card has `t('exercise.demo.doIt')` "Now do it myself" (`exercise-demo-doit`, accent: the `load` of Try again, without a demo) before Try again; no tick and no best time are recorded. The list shows `span.exercise-watched` (`data-testid="exercise-watched-<id>"`) `t('exercise.watched')` "Watched" (hint colour) for an exercise watched and not done (a done one shows only its tick).

### 8.6 Strings and limits

```json
"exercise.start": "Do it myself",
"exercise.watch": "Watch it",
"exercise.watching": "Watching · ",
"exercise.showing": "Showing · ",
"exercise.watched": "Watched",
"exercise.bar.showMe": "▶ Show me",
"exercise.bar.demoLabel": "The app is doing this step",
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

- **Good runs:** for each of the eight sailing exercises (Easy, level easy), `goodRun` (move it from `harbourExercises.test.ts` into this file and export it) ends `done`, no mistake, each step within 8.6's limits. The existing harbour good-run tests keep passing with the moved pilots.
- **Show me from every step:** for all 14 exercises (harbour at every level they have), run the pilot's good run keeping each step's starting state; from each, a fresh `pilotFor(…)` finishes that step within its limit with no mistake (harbour: the existing per-step limits, enter-berth Hard step 2 ≤ 121 s).
- **Coverage** (the phone promise): during each good run, every action `pilotActions` returns maps through `barRowOf` to rows that are all in `barRowsFor(def, step, 'easy')` of the step it was sent in, or of the next step (a pilot may start the next step's work early: `enterPilot` takes the lazy line as soon as both stern lines are on). The prototype found no other miss with 6.2's rows. A miss fails with the exercise, step and row; fix it by adding the row to the step's `bar` (≤ 4 rows), and list it in the PR.
- **The demo action:** `reduce(state, { type: 'demo', actions: [setControls] })` equals applying the action, but `run.log` gains no `action` entry; a normal `setControls` still logs.
- **Progress:** `recordWatched` then `readProgress().watched[id]` is set; an old stored value without `watched` reads as `{}`; `done` unchanged.
- `pilotFor('points-of-sail', 'easy', 'realistic')` is null; `pilotFor('leave-berth', 'hard', 'realistic')` is not.

### 8.8 Browser checks (`scripts/shots-m81.mjs`, test clock, 390 × 844)

1. **Watch Reduce sail:** Watch it; the step line starts "Watching ·"; after step 1 the demo card "✓ Step 1 done" with the step's How text; Next step twice more; the done card with "Now do it myself"; the list shows `exercise-watched-reduce-sail` and no tick.
2. **Watch Gybing:** done within 70 s of app time; the bar flashed `bar-row-control-ctl_mainsheet` at least once (class seen).
3. **Show me, Points of sail step 2:** Do it myself; finish step 1 by taps; Show me; the line starts "Showing ·"; the Now you card appears; Back to the start of the step → the run is at step 2, the main sheet back at the step's starting value, the bar enabled, Show me visible; the learner then finishes step 2 by taps.
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

**Station switch** (`div.bar-stations`, shown above the rows when the step's list has a `clutch:` or `winch:` row): one toggle per station that has a row in this step, in the order port, starboard (testids `bar-station-port`, `bar-station-starboard`, the station's existing name strings), `aria-pressed` = `state.realistic.station` is that one; a tap dispatches `{ type: 'realistic', action: { type: 'station', station } }`. A station with a row this step shows a dot (`span.bar-station-dot`, 8 px, the warning colour of the Attention badge) while the learner is at another station. Only rope rows of the station the learner is at show; non-rope rows (`engine`, `autopilot:*`) always show. With the learner at a station that has no row this step: `p.bar-nothing` `t('exercise.bar.otherStation')`.

| Row | Name / small line | Buttons |
|---|---|---|
| `clutch:<station>:<key>` | the clutch's label as printed on the boat (`boatLabelsFor`, as the station drawing) / `t('exercise.bar.clutchOpen')` or `t('exercise.bar.clutchClosed')` | one button `t('exercise.bar.open')` / `t('exercise.bar.close')` (`bar-clutch-<key>`) → `{ type: 'clutch', key, open: !open }` |
| `winch:<station>:<winch>:<key>` | the winch's name / what is on it: `t('exercise.bar.winchEmpty')`, or the rope's name + ` · ` + `t('exercise.bar.turns', { n })` + (tailed: ` · ` + `t('exercise.bar.tailed')`) | the next gesture the learner needs, as one or two buttons (testid `bar-winch-<winch>-<what>`): empty → `t('exercise.bar.onWinch', { rope })` (`onWinch { key }`); on, fewer than 3 turns → `t('exercise.bar.addTurn')` (`turn { winch, delta: 1 }`) and `t('exercise.bar.offWinch')` (`offWinch { winch }`); 3 turns or more, not tailed → `t('exercise.bar.tail')` (`selfTailer { winch, into: true }`); tailed → **hold** `t('exercise.bar.hold')` (`button { winch, held: true }`, release `held: false`, 3.4) and `t('exercise.bar.offWinch')`. A different rope on this winch than `key`: `t('exercise.bar.offWinch')` only |

The rest of Realistic mode (the handle, easing by hand, the mast, the bow) stays in the panel.

`barRowOf` (3.2) adds the `realistic` gestures. `pilotFor` returns, with `ropes === 'realistic'`, the Realistic pilots below for `set-sails` and `furl-sails`.

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
        return once(s, 'b', (x) => turns(ap(real(real(x, { type: 'clutch', key: 'a2', open: false }), { type: 'offWinch', winch: W }), 'wind'), 6, -10));
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
        s = once(s, 'b', (x) => real(onWinch(real(real(real(real(x, { type: 'offWinch', winch: P }), { type: 'clutch', key: 'b3', open: true }), { type: 'station', station: 'starboard' }), { type: 'clutch', key: 'a3', open: true }), 'a2', W), { type: 'button', winch: W, held: true }));
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
"exercise.bar.winchEmpty": "Nothing on the winch",
"exercise.bar.turns": "{n} turns",
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

1. **Setting the sails, Realistic, Alone, by taps only:** every step through the bar (the station switch, Open, Put … on, + Turn × 3, Into the self-tailer, hold, release when the strip's main reads 100 %, …); done; within the limits.
2. **Watch Furling the sails, Realistic:** done; the station switch flashed.
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

### 11.3 Known limitations

- The `how` texts still say "In Ropes …" or "Open Harbour gear …"; true, but on a phone the bar is quicker. A later text pass can shorten them.
- Watch of the long harbour exercises takes minutes of app time (Anchoring with a line ashore about 6 minutes); the time bar's speed-up works during Watch.
