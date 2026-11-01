# Phase 10 specification: exercises (part 10a: the coach and the first sailing exercises)

Status: **planned (part 10a), recommended answers recorded; merging the planning PR accepts them** · Last updated: 2026-10-30

Read [`ROADMAP.md`](ROADMAP.md) first, then this file. Phase 10 builds on everything the app already does: the sailing model of Phase 2 (`src/model/motion.ts`, `trim.ts`, `gybe.ts`, `autopilot.ts`, `windModes.ts`), Realistic mode (`src/model/realistic.ts`), the modes and sections of Phase 5 (`src/app/appMode.ts`, `src/ui/modes.ts`, `src/ui/panel.ts`), the harbour of Phase 7, the alert history of M36 and M55 (`src/model/alerts.ts`), and the link (`src/app/urlState.ts`). The catalogue of exercises and failure modes is [`EXERCISES.md`](EXERCISES.md); the owner's answers are in the ROADMAP decisions log (2026-10-30, "Phase 10 plan").

**Phase 10 has three parts** (owner, planning chat 2026-10-30): **10a** (this spec, M66–M71): the exercise coach and the first sailing exercises; **10b**: harbour and anchor exercises, with a more detailed marina and harbour design (planned with `/plan 10b`); **10c**: wind and clock (scripted wind, the Adriatic winds, each exercise's start time, the night time-lapse of the bay anchoring; `/plan 10c`). Parts 10b and 10c add their milestone sections to this file and bring sections 0–5 up to date.

## 0. How to use this spec (for the coding agent)

- Do **one milestone** (sections 6–11), on the branch your session gives you, in one PR titled `M<N>: <name>`. Read sections 0–5 first every time; they apply to all milestones. Then read only your milestone's section. Milestones are built in order (M66 → M67 → … → M71); each needs the ones before it merged.
- Build order inside a milestone: data → pure helpers + tests → store/URL → UI → browser checks → docs.
- **Numbers are final.** Every band and threshold here was prototyped on 2026-10-30 against the real model (3.5 says how). Exercise numbers live in `content/exercises/exercises.json`; presentation numbers in the CSS. A number marked **tunable** may be changed only if a check fails after you have checked your code against 3.4 "common mistakes": change it, report before and after in the PR, and never widen a test band. A band that still fails is a question for the owner in the PR.
- **Text is data.** Every English string in this spec is final: copy it exactly. Russian strings are AI drafts (CLAUDE.md): write them yourself following PHASE4_SPEC 3.3, mark them `draft` (`ui.json` keys need nothing more; `content/lang/ru/exercises.json` carries `"$status": "draft"`), and run `npm run review-doc -- ru` after any change to `content/lang/ru/*.json` (the review document lists `ui.json` and the glossary; exercises join it in M66, 6.6).
- **Signatures, test ids, CSS classes.** Function names, signatures, `data-testid`s and classes named here are required, so milestones fit together and the browser checks find things. Keep them; add private helpers freely.
- **Write back.** If you decide something this spec leaves open, write it into your milestone's section under "Decided in the M<N> PR".
- **Everything earlier keeps working.** Every unit test stays green, every PHYSICS_TRUTHS test passes, every old link opens the same boat, wind, place and camera. Outside Exercises mode nothing changes.
- **No sailing physics changes in this phase.** No formula of `src/model` that moves the boat, the rig or the ropes changes. The exercises only **read** the state the model already makes; where the model shows something a sailor would not expect, the exercise works with it and the PR names it (3.5 lists what the prototype found).
- Sailing terms in UI text get a short explanation the first time they appear on a screen (CLAUDE.md); the texts given here already do.

## 1. Goal

The app teaches by doing: pick an exercise, it sets everything up, tells you what to do one step at a time, ticks each step off when the boat shows you did it, and afterwards explains what happened.

What the learner should feel:

> **I know what to try next, and I find out why it went wrong.** I choose "Tacking". The boat appears sailing close to the wind and a card tells me what I see, what is happening, the right action and the typical mistake. I tap Start. A line at the top says "1/4 · Tack with the autopilot…"; "How?" shows me which button. When I get it right the step ticks itself off. When I make a mistake, time stops and the card tells me what went wrong, why, and what to do; I can carry on or go back to the last waypoint. At the end a short debrief lists what I did and what the boat did.

## 2. Scope

### In scope (part 10a)

1. **Exercises mode and the coach** (M66): a fifth mode, Exercises; an Exercises section with the list; a setup card per exercise (the four-part format, the ropes choice, the steps); Start; steps checked against the state every frame, with a hold time; a step line over the 3D view; "How?"; the conditions locked while an exercise runs; a done card and a tick per exercise remembered on the device; the exercise's start link (`ex=`). First exercise: trim through the points of sail.
2. **Mistakes and waypoints** (M67): mistakes detected from the alert history and from conditions held for a time; "Pause when I make a mistake" (owner, answer 3); a mistake card (what went wrong, why, what to do); a waypoint at the start and at every step passed; Back to the last waypoint; a link per waypoint (owner, answer 6); serious mistakes that stop the exercise.
3. **Debrief** (M68): a log of the learner's actions and the boat's events; the debrief timeline with the actions just before each mistake; summary line.
4. **Tacking, getting out of irons and gybing** (M69): three exercises; checks on tacks and gybes and the boom angle.
5. **Gusts and too much wind** (M70): two exercises; a gust counter; checks on how far each sail is rolled out.
6. **Setting and furling the sails** (M71): two exercises in Realistic ropes; **Alone or With crew** (owner, answer 8); the engine in checks; sign-off of part 10a.

### Out of scope (part 10a)

- Harbour and anchor exercises, a more detailed marina (part 10b); scripted wind, the Adriatic winds, an exercise's own start time, the time-lapse (part 10c).
- Man overboard, coming alongside with springs, sailing onto an anchor (owner, answer 10: "Ideas" in ROADMAP).
- Scores or points (owner, answer 4: a tick and the best time on this device only); progress in the setup file or online.
- New 3D objects (course marks, arrows) and sounds.
- Any change to the sailing, rig, rope or Realistic physics.
- Changing the conditions during an exercise (owner, answer 5).

If something here looks necessary, stop and ask in the PR.

## 3. Conventions and shared helpers

### 3.1 Conventions

| Topic | Convention |
|---|---|
| True wind angle | `twaSignedDeg(source) = wrap180(source.wind.dirDeg − source.boat.headingDeg)` (`wrap180` from `src/model/angles.ts`): (−180, 180], **+ = wind from starboard**. A check's `twaDeg` range is on the **absolute** value; its `tack` is the sign: `'starboard'` = `twaSignedDeg > 0`, `'port'` = `< 0`. |
| Speed | `speedKn = mpsToKn(boat.speedMps)`, **signed** (negative = going backwards). |
| Heel, boom | `heelDeg` checks `Math.abs(boat.heelDeg)`; `boomDeg` checks `Math.abs(rig.solution.thetaDeg)` (the boom's angle from the centreline). |
| Trim | `sailTrim(sail, rig, motion.awaDeg).state` (`src/model/trim.ts`). With `motion === null` (the first frame after a load) every check fails. |
| Rope values | `controls` (`ctl_*`, 0 = hauled in / rolled up, 100 = eased / rolled out; `ctl_rudder` −35 … 35, + = to starboard). Realistic mode moves `controls` too (`stepRealistic`), so the same checks work in both rope modes. **Main out** = `rig.applied.mainFurl` (what the rig has: in Easy ropes it follows the control with a 0.4 s lag, `visual.controlResponseTimeS`; in Realistic ropes it is the control); **jib out** = `100 × rig.jibSolution.unfurled` (what is reached: the jib sheet can stop the furl, PT-13). |
| Start speed | A start link without `bs` starts her Sailing at her steady speed for that wind and trim (PHASE2_SPEC 6.4); `bs=0` starts her stopped. |
| Time | An exercise has its own clock, `run.elapsedS`: the sum of `next.rig.timeS − previous.rig.timeS` over the frames since Start (0 while paused; the time bar's speed-up counts). Times shown as `m:ss` with `alertTimeText` (`src/model/alerts.ts`). |
| Ranges | `[min, max]`, both ends included; `99` and `-99` stand for "no limit". |
| Bands in tests | "Within N s" is app time from the step's start (`elapsedS − stepStartS`), stepping `reduce(state, { type: 'step', dt: 0.05 })` with real `step` actions; the actions of a step are dispatched at its start unless the test says "each frame". |
| New alert entries | The entries of `next.alerts.entries` with `n > run.seenAlertN`; afterwards `run.seenAlertN = next.alerts.written`. Entries in the first `settings.settleS` (1 s) after Start or a Back are skipped (the rig settles after a load). |
| Ids | Exercise, step and mistake ids are kebab-case (`points-of-sail`, `close-hauled`). They are data ids, not registry ids (they draw nothing). |
| Steps in the UI | `run.step` is a 0-based index; the screen says "Step {n} of {total}" with n = index + 1. A **waypoint** is the state at the start of a step: waypoint 0 is Start. |
| Touch targets | At least 44 × 44 px (`--touch`). |
| Language | Every visible DOM string through `t()`, in both `ui.json` files, same keys, same order; exercise texts through `exerciseText` (3.2). |

### 3.2 Shared helpers

| Helper | File | Signature | Behaviour |
|---|---|---|---|
| `EXERCISES`, `exerciseDef` | `src/model/exercises.ts` (M66) | `EXERCISES: readonly ExerciseDef[]`; `exerciseDef(id: string): ExerciseDef \| undefined` | The exercises of `content/exercises/exercises.json`, in file order. |
| `EXERCISE_SETTINGS` | `src/model/exercises.ts` (M66) | `ExerciseSettings` | The file's `settings`. |
| `twaSignedDeg` | `src/model/exercises.ts` (M66) | `twaSignedDeg(source: Pick<CheckSource, 'wind' \| 'boat'>): number` | 3.1. |
| `checkPasses` | `src/model/exercises.ts` (M66; fields added in M69, M70, M71) | `checkPasses(check: ExerciseCheck, source: CheckSource, context: CheckContext): boolean` | Every field given must hold (4.4). |
| `exerciseText` | `src/model/exercises.ts` (M66) | `exerciseText(id: string, language: string): ExerciseText` | The texts of one exercise in a language (`import.meta.glob('/content/lang/*/exercises.json', { eager: true })`, as `glossary.ts` loads the glossaries), English where the language has none. |
| `newRun` | `src/app/exerciseRun.ts` (M66) | `newRun(id: string, step: number, options: ExerciseOptions): ExerciseRun` | A run in `setup` at that step (4.1). |
| `stepExercise` | `src/app/exerciseRun.ts` (M66; extended in M67–M71) | `stepExercise(previous: AppState, next: AppState, def?: ExerciseDef): AppState` | One frame of the coach (4.2). `def` defaults to `exerciseDef(next.exercise.id)`; tests pass their own. |
| `exerciseStartLink` | `src/app/urlState.ts` (M66) | `exerciseStartLink(id: string, state: AppState, ropes: RopesMode): string` | The short link of an exercise's start (4.3). |
| `readProgress`, `recordDone` | `src/app/exerciseProgress.ts` (M66) | 6.3 | The ticks and best times on this device. |
| `restoreWaypoint` | `src/app/exerciseRun.ts` (M67) | `restoreWaypoint(state: AppState, step: number): AppState` | 7.3. |
| `logAction` | `src/app/exerciseRun.ts` (M68) | `logAction(previous: AppState, next: AppState, action: Action): AppState` | 8.3. |
| `debriefRows` | `src/model/debrief.ts` (M68) | `debriefRows(log: readonly ExerciseLogEntry[], settings?: ExerciseSettings): DebriefRow[]` | 8.3. |
| `exercisePauseBlocked` | `src/app/exerciseRun.ts` (M71) | `exercisePauseBlocked(state: AppState): boolean` | 11.3. |

### 3.3 Sources

The exercises follow the beginner syllabus topics named in ROADMAP Phase 10 (RYA Competent Crew, ASA 101): points of sail and sail trim, tacking, gybing (controlled and accidental), getting out of irons, gusts, reducing sail, setting and stowing sails. Every sailing statement in the exercise texts rests on a PHYSICS_TRUTHS rule: PT-21 (no-go zone, irons), PT-22 (easing as you bear away), PT-23 (stall), PT-24 and PT-26 (accidental gybe), PT-25, PT-29 and PT-32 (heel, easing, round-up), PT-28 (self-tacking jib), PT-13 (jib furling needs an eased sheet), PT-12 (in-mast furling), PT-35 (no speed, no steering; astern the rudder works the other way), PT-38 (flogging), PT-45 (a gust shows on the water). Two new rules come with this part, added to `docs/PHYSICS_TRUTHS.md` ("Phase 10 rules") by the planning PR: **PT-58** (M69: haul the main in before a gybe; source-checked, Wikipedia *Jibe*) and **PT-59** (M71: roll an in-mast main in and out with the bow close to the wind; `to-verify`, the candidate Seldén manual does not open from the build environment). The milestone PRs add their tests and test links.

### 3.4 Common mistakes (check these first when something fails)

- **Absolute angle vs tack.** `twaDeg` ranges are on `Math.abs(twaSignedDeg)`; the side is `tack`. A step "turn 20° away from the wind" on starboard tack is the autopilot's "to port" (`turnDeg` −10, which in Wind mode raises the target angle: `adjustAutopilot` does `targetDeg − turnDeg`).
- **New alerts are `n > seenAlertN`,** not `>=` (the prototype counted one entry every frame with `>=`).
- **The hold.** `holdS = passes ? holdS + dt : 0`; the step is done when `passes && holdS >= step.holdS`. A step with `holdS: 0` is done on the first frame it passes; a frame with `dt === 0` (paused) changes nothing.
- **Motion is null after a load.** `checkPasses` returns false while `source.motion === null`; never read `motion!.awaDeg`.
- **Paused is not stopped.** While paused (`dt === 0`) `stepExercise` returns `next` unchanged: no time, no hold, no mistakes, no events (and no alert can be written while time stands still).
- **Actions in this spec are written short:** `setControls { ctl_mainsheet: 12 }` = `{ type: 'setControls', values: { ctl_mainsheet: 12 } }`; `autopilot { turnDeg: -10 }` = `{ type: 'autopilot', command: { turnDeg: -10 } }`; `autopilot 'tack'` = `{ type: 'autopilot', command: 'tack' }`; `engine 'stop'`, `engine { leverPct: 0 }` likewise; a Realistic gesture `clutch a2 open` = `{ type: 'realistic', action: { type: 'clutch', key: 'a2', open: true } }`, `station port` = `{ type: 'station', station: 'port' }`; with W = `winch_primary_starboard` and P = `winch_primary_port`: "`a3` on W" = `onWinch` with `key: 'a3'` (it goes on the winch of the station you are at), then `turn` `{ winch: W, delta: 1 }` three times, then `selfTailer` `{ winch: W, into: true }`; `button W held` / `released` = `button` `{ winch: W, held: true / false }`; `offWinch W` = `offWinch` `{ winch: W }`; `start` = `{ type: 'exercise', command: 'start' }`. Clutch keys (`content/boat/hanse508.json` clutch banks): `a1` Main sheet (starboard), `a2` Main furling "in", `a3` Main furling "out", `a5` Genoa sheet, `b3` Main outhaul (port), `r1` JIB ROLL (port).
- **Locked actions.** While `state.exercise !== null`, the actions of 4.2 that change the conditions are ignored in `reduceAction`; `setControls` drops only the keys `ctl_wind_dir` and `ctl_wind_speed` and applies the rest.
- **`m=exercise` keeps the ropes mode,** like Learn and Harbour. Only the places where `learn || harbour` means "keeps the ropes mode" use `keepsRopesMode(mode)` (4.1): `store.ts` (`initialState`'s `appMode` override, `setRopesMode`, `setAppMode`) and `urlState.ts` (parsing and writing `m`). Everywhere else (the info card's "shown in the panel" rule, `panel.ts`, `quickRow.ts`, `realisticPanel.ts`, `thrusterPanel.ts`, `urlSync.ts`) Exercises mode is neither Learn nor Harbour: the panel, the quick row and the stations behave as in the ropes mode itself (Easy or Realistic), with one exception: the info card's "More" (`showLearn` in `app.ts`) uses `panel.showLearnEntry` in Exercises mode as it does in Harbour, so reading an entry does not end the run. The Learn entry's **Try it** buttons (`learn-try-*`, which switch to the ropes mode) and the Realistic stations' **Practice** button (`real.practice.button` in `realisticPanel.ts`, which loads a scene) are hidden during a run, as "Show it working" is.
- **A waypoint holds a whole `AppState`** with `exercise: null` (never a run inside a run). Restoring one keeps the viewer's own settings, the camera, the alert history and the run's log (7.3).
- **The boat object is shared** (PHASE8_SPEC 3.4): read `boat.…` at call time.
- **Russian drafts** go into `content/lang/ru/exercises.json` with every key of the English file; `tests/languages.test.ts` checks the keys (6.7 test 2).

### 3.5 How the numbers were made

A throwaway Vitest file (2026-10-30) opened each exercise's start link with `parseUrlState`, stepped `reduce(state, { type: 'step', dt: 0.05 })`, applied a scripted "good run" (the actions each milestone's test 1 lists), evaluated the checks exactly as 4.4 says, and recorded how long each step took and which alerts came. Results (app seconds per step; the bands in the milestone tests are these values plus a margin):

| Exercise | Steps (seconds) | Total | Alerts in the good run |
|---|---|---|---|
| points-of-sail | 5.1, 14.8, 14.0, 15.3, 18.2 | 67 | none |
| tacking | 57.3, 15.5, 47.7, 24.1 | 145 | two `tack` |
| irons | 1.0, 52.9, 26.8 | 81 | none |
| gybing | 3.3, 16.3, 5.0, 16.0 | 41 | `byTheLee`, `gybe` (controlled), `byTheLee`, `gybe` (accidental) |
| gusts (ease 45 % while the wind is over 16.8 kn, else 25 %) | 141.0, 5.0 | 146 | none (with the policy kept in step 2) |
| reduce-sail (start: heel 19.1°, main luffing; jib sheet back to 75 % with the main roll-in) | 2.9, 2.0, 10.0 | 15 | none (final heel 17.4°; jib sheet left at 100 %: 11.6°, but the jib flogs) |
| set-sails (Realistic gestures) | 7.7, 20.3, 31.2, 45.8, 5.0 | 110 | rope warnings from the script's clumsy gestures (11.7) |
| furl-sails (Realistic gestures) | 2.0, 31.2, 13.8, 21.4 | 68 | one `tack` (she swings through head to wind) |

What the prototype found about the model (the exercises are built around it; each is a known limitation in the milestone's PR):

- **The self-tacking jib reads "stalled" on every reach** (true wind angle 90° and more) whatever its sheet, because its car cannot go further out than the track's end. Steps from the beam reach on check the jib sheet (eased to 90 % or more), not the jib's trim.
- **The main reads "stalled" from about 120° to 150° true wind angle even fully eased** (the boom stops at the shrouds at 72°); from 150° it reads "pushed". Broad-reach and run steps check the main sheet (85 % or more).
- **A partly rolled jib reads "stalled" at every sheet below 100 % and "luffing" at 100 %.** The reduce-sail exercise checks only how far the jib is out.
- **Tacks are slow**: the autopilot's tack from 6 kn takes about 34 s and leaves her at about 2 kn; by hand, the wheel must stay over (−25°) until the wind is 35° on the other bow, about 30 s; centring it at head to wind leaves her in irons (the exercise's mistake).
- **A gybe is controlled only with the main sheet at about 10 % or less** (boom within 20°: `physics.gybe.controlledMaxBoomDeg`); at 15 % it is reported accidental. The haul-main step asks for the boom within 16°.
- **In irons with the wheel centred she drifts straight back and never falls off**; with the wheel hard over (30°) the bow falls off to 35° in about 53 s.
- **Gusts** (15 kn mean, `wm=gusty&seed=1&wg=40`, close reach, main sheet 25 %): gusts over 18 kn (20 % above the mean) start at 35, 105, 141 and 158 s. Holding the sheet: heel up to 36.6° and five `overpowered` alerts in 240 s; easing to 45 % while the wind is over 16.8 kn: heel at most 22.5°, no alert.
- **In irons from close-hauled**: turning the Wind autopilot 40° towards the wind stops her; the `in-irons` condition (true wind within 20°, speed 1 kn or less, for 5 s) fires 41.4 s after the turn.

### 3.6 Browser-check conventions (every milestone)

- Each milestone has `scripts/shots-m<N>.mjs`, registered in `scripts/shots.mjs` (import, `SCENES`, `liveGroups`) with names written without the prefix, as Phases 5–9.
- **What `openPage` adds:** Phase 10 labels (`m66` … `m71`) are treated like Phase 9 ones. The M66 PR replaces `6[0-5]` with `6\d|7[01]` in each of the five regular expressions of `openPage` that contain it (`scripts/shots.mjs`: the `held`, `sea`, `clock` and `mm` defaults and the "older checks open Ropes" rule).
- **Test clock** for every live check that waits for app time (CLAUDE.md): `openPage(viewport, label, query, { testClock: true })`; wait with `page.waitForTimeout`, never `waitForFunction`.
- **Driving an exercise:** with `debug=1`, `app.ts` exposes `window.__sailExercise = { dispatch(action), state(), read() }` (M66, 6.5): `dispatch` is `store.dispatch`, `state` returns the run (waypoints as a count), `read` the boat's numbers. Checks use it for the boat-handling actions of a good run (rope values, autopilot, engine, Realistic gestures) and tap the exercise's own buttons (Start, How?, Carry on, Back, Stop) as a learner would. `scripts/ui.mjs` gets `TAB_OF_JS.exercises = 'controls'` and a helper `exerciseLine(page)` (the text of `exercise-line`).
- **CI** (`.github/workflows/ci.yml`): the M66 PR adds a matrix part `live, M66-M71` (after the last `live, M6…` part, same shape) with `env: SHOTS_NO_SCENES=1 SHOTS_NO_TAPS=1 SHOTS_ONLY=m66,m67,m68,m69,m70,m71` (a name with no group yet is skipped) and appends `,m66,m67,m68,m69,m70,m71` to the `SHOTS_SKIP` list of the part `live, M30 on`. A good run of an exercise takes up to three minutes of app time; on the test clock `page.waitForTimeout` moves the app on at once, so this costs real time only for the frames drawn.

### 3.7 General rules for every milestone

- **Changing an older check.** A milestone changes an older browser check or unit test only where its section names it, and only the lines that test what it changes (a list of sections, a mode count). Say in the PR which and why.
- **Strings.** New keys go into both `ui.json` files after the keys of the same prefix (`exercise.*` after `mode.*`; `debrief.*` after `exercise.*`). `tests/languages.test.ts` stays green.
- **Exercise texts.** `content/lang/en/exercises.json` is the source (`"$status": "source"`); `content/lang/ru/exercises.json` the draft (`"$status": "draft"`), same keys in the same order.
- **Accessibility.** Every new button has an accessible name; the audit (`scripts/a11y-audit.mjs`, `auditPage`) runs with each new card shown.
- **Code map.** Every PR that adds, removes or renames a file, or moves a responsibility, updates `docs/CODE_MAP.md`.
- **No new dependencies.**

## 4. Architecture

### 4.1 New state

```ts
// src/app/appMode.ts (M66)
export const APP_MODES = ['learn', 'easy', 'realistic', 'harbour', 'exercise'] as const;
/** Learn, Harbour and Exercises keep the ropes mode as it is (PHASE10_SPEC 4.1). */
export function keepsRopesMode(mode: AppMode): boolean; // 'learn' | 'harbour' | 'exercise'

// src/app/store.ts (M66)
export interface AppState {
  // … as today, and:
  /** The exercise in progress (M66), or null. In the link as `ex` (and, from M67, `exw`, `exp`; M71 `exc`). */
  exercise: ExerciseRun | null;
}
// InitialOverrides gains `exercise?: ExerciseRun | null` (default null).
```

```ts
// src/model/exercises.ts (M66)
export type Range = readonly [number, number];
export type ExerciseGroup = 'sailing' | 'wind' | 'sails';
/** The section "Show the controls" opens (a subset of the panel's section ids). */
export type ExerciseOpens = 'ropes' | 'autopilot' | 'engine' | 'sails';
export type ExerciseEvent = 'tack' | 'tackByHand' | 'controlledGybe' | 'accidentalGybe'; // M69
export interface ExerciseCheck {
  twaDeg?: Range; tack?: 'port' | 'starboard';
  mainTrim?: readonly TrimState[]; jibTrim?: readonly TrimState[];
  controls?: Partial<Record<ControlId, Range>>;
  speedKn?: Range; heelDeg?: Range;
  boomDeg?: Range; event?: ExerciseEvent;            // M69
  gusts?: number; mainOutPct?: Range; jibOutPct?: Range; // M70
  engine?: { running?: boolean; gear?: 'ahead' | 'neutral' | 'astern' }; // M71
}
export interface ExerciseStep { id: string; opens: ExerciseOpens; holdS: number; check: ExerciseCheck }
export type MistakeTrigger =
  | { alert: AlertKind; accidental?: boolean }
  | { condition: ExerciseCheck; forS: number };
export interface ExerciseMistake { id: string; serious: boolean; steps?: readonly string[]; on: MistakeTrigger }
export interface ExerciseDef {
  id: string; group: ExerciseGroup; ropes: RopesMode; crew: boolean; start: string;
  steps: readonly ExerciseStep[]; mistakes: readonly ExerciseMistake[];
}
export interface ExerciseSettings {
  settleS: number; mistakeRepeatGapS: number; mistakeShowS: number;
  causeWindowS: number; causeMax: number; controlMergeS: number; logMax: number;
  gust: { risePct: number; rearmPct: number };
}
/** What the checks read; `AppState` has all of it. */
export interface CheckSource {
  wind: WindNow; boat: BoatState; motion: MotionReport | null; rig: RigState;
  controls: Controls; engine: EngineState;
}
export interface CheckContext { events: readonly ExerciseEvent[]; gusts: number }
export interface ExerciseText {
  title: string; summary: string; see: string; happening: string; action: string; mistake: string; done: string;
  steps: Readonly<Record<string, { goal: string; how: string }>>;
  mistakes: Readonly<Record<string, { what: string; why: string; fix: string }>>;
}
/** The log the debrief is made from (M66 writes start, step, finish; M67 mistake, back; M68 action, event). */
export type ExerciseLogEntry =
  | { kind: 'start'; atS: number; step: number }
  | { kind: 'step'; atS: number; step: number; stepId: string }
  | { kind: 'finish'; atS: number }
  | { kind: 'mistake'; atS: number; step: number; mistakeId: string; serious: boolean }
  | { kind: 'back'; atS: number; step: number }
  | { kind: 'event'; atS: number; entry: AlertEntry }
  | { kind: 'action'; atS: number; action: LoggedAction };
export type LoggedAction =
  | { type: 'control'; id: ControlId; from: number; to: number }
  | { type: 'autopilot'; command: 'off' | 'heading' | 'wind' | 'tack'; turnDeg?: undefined }
  | { type: 'autopilot'; command: 'turn'; turnDeg: number }
  | { type: 'engine'; command: 'start' | 'stop' }
  | { type: 'engine'; command: 'lever'; leverPct: number }
  | { type: 'realistic'; gesture: RealisticAction['type']; target: string | null };
```

```ts
// src/app/exerciseRun.ts (M66: the whole type; the fields marked M67-M71 are created empty and used from then)
export type RunStatus = 'setup' | 'running' | 'mistake' | 'failed' | 'done';
export interface ExerciseOptions { pauseOnMistake: boolean; crew: 'alone' | 'crew' }
export const DEFAULT_OPTIONS: Readonly<ExerciseOptions> = { pauseOnMistake: true, crew: 'alone' };
export interface ExerciseWaypoint { step: number; atS: number; state: AppState }
export interface ExerciseRun {
  id: string;
  status: RunStatus;
  options: ExerciseOptions;
  /** 0-based index of the current step; = steps.length when done. */
  step: number;
  /** The step the run was set up at (0, or a waypoint link's step, M67). */
  startStep: number;
  elapsedS: number;
  /** elapsedS when the current step began, and when the run last started or went back (settle time). */
  stepStartS: number;
  settleFromS: number;
  holdS: number;
  seenAlertN: number;
  events: readonly ExerciseEvent[];        // M69
  gusts: number; gustArmed: boolean;       // M70
  conditionS: Readonly<Record<string, number>>;  // M67
  lastMistakeS: Readonly<Record<string, number>>; // M67
  mistake: Extract<ExerciseLogEntry, { kind: 'mistake' }> | null; // M67
  waypoints: readonly ExerciseWaypoint[];  // M67
  log: readonly ExerciseLogEntry[];
}
```

UI state (not in the store): none, except the device's progress in `localStorage` (`sail-learn.exercises`, M66).

### 4.2 Actions and the order of work

New action (M66; commands added in M67): `{ type: 'exercise'; command: ExerciseCommand }`,

```ts
export type ExerciseCommand =
  | 'start' | 'stop'                         // M66
  | { ropes: RopesMode }                     // M66, only in setup
  | 'continue' | { back: number }            // M67
  | { options: Partial<ExerciseOptions> };   // M67 (pauseOnMistake), M71 (crew); only in setup
```

- **Choosing an exercise** is a `load`: the UI dispatches `{ type: 'load', state: parseUrlState(exerciseStartLink(id, state, def.ropes), state.settings.detail) }`; the link puts the run in `setup` (4.3).
- **Locked while `state.exercise !== null`** (ignored in `reduceAction`, returning `state`): `setWindMode`, `setWindSize`, `newWindPattern`, `setSeaSetting`, `setClock`, `goToPlace`, `setMarinaLayout`, `setTraffic`, `setBoatMode`, `setRopesMode`; `setControls` drops `ctl_wind_dir` and `ctl_wind_speed` (and returns `state` if nothing is left).
- **Ending a run:** `setAppMode` to any mode but `exercise` sets `exercise: null`; `reset` gives `exercise: null` (its defaults); a `load` brings its own (`null` for an ordinary link).
- **Order in `reduce`** (`src/app/store.ts`): `reduceAction` → `recordAlerts` (as today, but skipped for `exercise` actions, as for `load` and `reset`: a Back restores another rig and must not write a false gybe or tack) → **if `action.type === 'step'` and `next.exercise?.status === 'running'`: `next = stepExercise(state, next)`** → (M68) **if `next.exercise` is running or in `mistake` and the action is one of 8.3's: `next = logAction(state, next, action)`** (`state` is the state before the action, for the `from` values).
- **Inside `stepExercise`**, per frame with `dt = next.rig.timeS − previous.rig.timeS > 0`: (1) `elapsedS += dt`; (2) new alert entries → (M68) `event` log entries, (M69) events, (M67) alert mistakes; (3) (M70) the gust counter; (4) (M67) condition mistakes; (5) if a mistake stopped the run, return; (6) the step's check and hold; on passing: log `step`, (M67) push a waypoint, next step (or `done`).

### 4.3 URL keys

| Key | Milestone | Values | Default | Written |
|---|---|---|---|---|
| `m` | M66 | adds `exercise` | (follows the ropes mode) | when `appMode === 'exercise'` |
| `ex` | M66 | an exercise id | none | while `state.exercise !== null` |
| `mode` | M66 | `easy`, `realistic` (existing key) | `easy` | in an exercise link **always** (so a link of an exercise whose default is Realistic, opened in Easy, stays Easy) |
| `exw` | M67 | 0 … steps − 1 | none (the start) | in a waypoint link: the step the waypoint starts |
| `exp` | M67 | `0` | pause on mistakes (no key) | when `pauseOnMistake` is false |
| `exc` | M71 | `1` | alone (no key) | when `crew === 'crew'` |

- **The start link** (M66): `exerciseStartLink(id, state, ropes)` is built key by key (not through `serializeUrlState`): `v=1`, then `boat=<id>` when the boat is not the Hanse 508 (as M58 writes it), `m=exercise`, `ex=<id>`, `mode=<ropes>`, then the viewer's own keys from `state` with the same rules as `serializeUrlState`: `cam` (and `hw`/`hl` with the Helm camera), `step`, `detail`, `lang` when not English, `lb` when not the default, `mm=0` when off, `debug=1` when on; from M67 `exp=0` and from M71 `exc=1` when the run's options say so (from the list, with no run yet, the defaults: no key). No `sel`, `learn` or boat-state keys. In M66, `serializeUrlState(state)` returns the start link (with the run's ropes and options) whenever `state.exercise !== null`; M67 changes this for a run that has waypoints (7.4).
- **Parsing `ex`** (known id, no `exw`): start from `def.start`'s keys; for each of `cam`, `hw`, `hl`, `step`, `detail`, `lang`, `lb`, `mm`, `debug`, `mode` that the link has, set it (overriding `def.start`); with no `mode` in the link or `def.start`, the ropes mode is `def.ropes`. Parse that query, then `appMode: 'exercise'`, `paused: true`, `exercise: newRun(id, 0, options)` (`options` = `DEFAULT_OPTIONS`, changed by `exp`/`exc` from M67/M71). An unknown id is ignored (an ordinary link; with `m=exercise` it opens the list).
- **Old links** have none of these keys: nothing changes. `m=exercise` alone opens Exercises mode with the list.

### 4.4 Data: `content/exercises/exercises.json` and the checks

One file, language-neutral, created in M66 with the `settings` and the first exercise; each later milestone appends its exercises to `exercises` (and nothing else changes). Shape (the `settings` are final and **tunable** only as section 0 says):

```json
{
  "$comment": "PHASE10_SPEC 4.4: the exercises, language-neutral. Texts are in content/lang/<code>/exercises.json by the same ids. Start links are ordinary app links (urlState.ts keys); checks and mistakes are read by src/model/exercises.ts.",
  "schemaVersion": 1,
  "settings": {
    "settleS": 1,
    "mistakeRepeatGapS": 10,
    "mistakeShowS": 6,
    "causeWindowS": 30,
    "causeMax": 3,
    "controlMergeS": 3,
    "logMax": 400,
    "gust": { "risePct": 20, "rearmPct": 10 }
  },
  "exercises": []
}
```

`checkPasses(check, source, context)` is true when every field given holds (and false while `source.motion === null`):

| Field | Holds when | From |
|---|---|---|
| `twaDeg` | `Math.abs(twaSignedDeg(source))` in range | M66 |
| `tack` | `'starboard'`: `twaSignedDeg > 0`; `'port'`: `< 0` | M66 |
| `mainTrim`, `jibTrim` | `sailTrim(sail, rig, motion.awaDeg).state` is one of the list | M66 |
| `controls` | every `controls[id]` given is in its range | M66 |
| `speedKn` | `mpsToKn(boat.speedMps)` in range (signed) | M66 |
| `heelDeg` | `Math.abs(boat.heelDeg)` in range | M66 |
| `boomDeg` | `Math.abs(rig.solution.thetaDeg)` in range | M69 |
| `event` | `context.events` includes it (events since the step began) | M69 |
| `gusts` | `context.gusts >= gusts` (gusts since the step began) | M70 |
| `mainOutPct` | `rig.applied.mainFurl` in range | M70 |
| `jibOutPct` | `100 × rig.jibSolution.unfurled` in range | M70 |
| `engine` | `engine.running === running` when given, `engine.gear === gear` when given | M71 |

A milestone that adds a field also adds it to the loader's check (tests reject an unknown field: 6.7 test 1).

Texts: `content/lang/<code>/exercises.json`: `{ "$status": "source" | "draft", "<exercise id>": ExerciseText, … }`, in the order of the data file.

### 4.5 Files by milestone

A summary; each milestone's own "Files" list is the complete one and wins where they differ.

| Milestone | New | Changed (main) |
|---|---|---|
| M66 | `content/exercises/exercises.json`, `content/lang/en/exercises.json`, `content/lang/ru/exercises.json`, `src/model/exercises.ts`, `src/app/exerciseRun.ts`, `src/app/exerciseProgress.ts`, `src/ui/exercisePanel.ts`, `src/ui/exerciseLine.ts`, `tests/exercises.test.ts`, `tests/exerciseRun.test.ts`, `tests/exerciseProgress.test.ts`, `scripts/shots-m66.mjs` | `src/app/appMode.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/app/app.ts`, `src/ui/modes.ts`, `src/ui/panel.ts`, `src/ui/sectionLayout.ts`, `src/ui/learnTab.ts`, `src/ui/clockPanel.ts`, `src/style.css`, both `ui.json`, `scripts/review-doc.mjs`, `tests/modes.test.ts`, `tests/urlState.test.ts`, `tests/store.test.ts`, `tests/languages.test.ts`, `scripts/shots.mjs`, `scripts/ui.mjs`, `.github/workflows/ci.yml` |
| M67 | `scripts/shots-m67.mjs` | `src/app/exerciseRun.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/ui/exercisePanel.ts`, `src/ui/exerciseLine.ts`, `src/style.css`, both `ui.json`, `tests/exerciseRun.test.ts`, `tests/urlState.test.ts` |
| M68 | `src/model/debrief.ts`, `src/ui/exerciseDebrief.ts`, `tests/debrief.test.ts`, `scripts/shots-m68.mjs` | `src/app/exerciseRun.ts`, `src/app/store.ts`, `src/ui/exercisePanel.ts`, `src/style.css`, both `ui.json`, `tests/exerciseRun.test.ts` |
| M69 | `scripts/shots-m69.mjs` | `content/exercises/exercises.json`, both `exercises.json` texts, `src/model/exercises.ts`, `src/app/exerciseRun.ts`, `tests/exercises.test.ts`, `tests/physicsTruths10.test.ts` (new), `docs/PHYSICS_TRUTHS.md` (PT-58 test link) |
| M70 | `scripts/shots-m70.mjs` | `content/exercises/exercises.json`, both `exercises.json` texts, `src/model/exercises.ts`, `src/app/exerciseRun.ts`, both `ui.json`, `tests/exercises.test.ts` |
| M71 | `scripts/shots-m71.mjs` | `content/exercises/exercises.json`, both `exercises.json` texts, `src/model/exercises.ts`, `src/app/exerciseRun.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/ui/exercisePanel.ts`, `src/ui/timeBar.ts`, both `ui.json`, `tests/exercises.test.ts`, `tests/exerciseRun.test.ts`, `tests/physicsTruths10.test.ts`, `docs/PHYSICS_TRUTHS.md` |

## 5. Milestones overview

Each milestone is one PR, small enough to check on a phone in 15 minutes. **Independent review: required** means the owner runs `/review <PR>` (new Code session, Opus, medium effort) as soon as the PR opens, before testing it on the phone.

| Milestone | Section | What the owner sees | Rules tested | Depends on | Independent review |
|---|---|---|---|---|---|
| M66 | 6 | An Exercises mode with a list; "Trim through the points of sail" with its setup card, steps that tick themselves off, a step line over the 3D view, "How?", a done card and a tick in the list | PT-22 | Phase 9 | **required** (new shared state, a new mode, URL keys, the step order in `reduce`, locked actions) |
| M67 | 7 | Mistakes stop time and explain themselves; "Back to the last waypoint"; a link per waypoint | PT-26 | M66 | **required** (restoring a whole state, links that carry a run, mistakes read from shared state) |
| M68 | 8 | A debrief at the end: what you did, what the boat did, and the actions just before each mistake | none | M67 | **required** (logs every learner action in `reduce`; a wrong cause teaches the wrong thing) |
| M69 | 9 | Tacking, Getting out of irons, Gybing (controlled and accidental) | PT-21, PT-28, PT-35, PT-58 (new) | M68 | **required** (a new rule; the checks decide what counts as a good tack or gybe) |
| M70 | 10 | Gusts: ease the main; Too much wind: roll the sails in | PT-25, PT-13 | M69 | not needed (data, texts and two check fields read from existing state; the rules are tested by earlier phases) |
| M71 | 11 | Setting and furling the sails in Realistic ropes, Alone or With crew; sign-off of part 10a | PT-12, PT-59 (new) | M70 | **required** (a new rule; Pause blocked in a mode; Realistic gestures) |

---

## 6. M66: Exercises mode and the coach

**Independent review: required** (new shared state, a new mode, URL keys, the step order in `reduce`, locked actions).

### 6.1 Files

New: `content/exercises/exercises.json`, `content/lang/en/exercises.json`, `content/lang/ru/exercises.json`, `src/model/exercises.ts`, `src/app/exerciseRun.ts`, `src/app/exerciseProgress.ts`, `src/ui/exercisePanel.ts`, `src/ui/exerciseLine.ts`, `tests/exercises.test.ts`, `tests/exerciseRun.test.ts`, `tests/exerciseProgress.test.ts`, `scripts/shots-m66.mjs`.

Changed: `src/app/appMode.ts` (`exercise`, `keepsRopesMode`), `src/app/store.ts` (`exercise` state, the action, locked actions, `stepExercise` in `reduce`, `setAppMode`), `src/app/urlState.ts` (`m=exercise`, `ex`, `exerciseStartLink`, the exercise link in `serializeUrlState`), `src/app/app.ts` (the step line, `__sailExercise`), `src/ui/modes.ts` (`exercises` section, the `exercise` mode row, `TAB_OF`, `sectionAvailable`), `src/ui/panel.ts` (builds the section; locked note on Conditions and Place), `src/ui/sectionLayout.ts` (`exercises` in `DEFAULT_WIDE_LAYOUT`), `src/ui/learnTab.ts` (no "Show it working" during a run), `src/ui/clockPanel.ts` (Now / Noon / Set a time disabled during a run), `src/app/app.ts` (the info card's `showLearn` in Exercises mode, 3.4), `src/ui/realisticPanel.ts` (Practice hidden during a run), `src/style.css`, both `ui.json`, `scripts/review-doc.mjs` (an Exercises part), `docs/review/ru.md` (regenerated), `tests/modes.test.ts`, `tests/urlState.test.ts`, `tests/store.test.ts`, `tests/languages.test.ts` (a test that both `exercises.json` files have the same keys in the same order), `content/lang/latin-words.json` (only if the Russian Latin scan flags a word the texts quote from the boat or the instruments, such as `JIB ROLL` or `GUST`), `scripts/shots.mjs`, `scripts/ui.mjs`, `.github/workflows/ci.yml`, `docs/CODE_MAP.md`. **Older checks that count the modes:** `scripts/shots-m38.mjs` (the picker's four choices and their names) and `scripts/shots-m27.mjs` (the Russian mode names) get the fifth mode, Exercises (`Упражнения` in the Russian draft), and nothing else changes in them.

### 6.2 Data

`content/exercises/exercises.json`: the file of 4.4 with this first exercise in `exercises`:

```json
{
  "id": "points-of-sail",
  "group": "sailing",
  "ropes": "easy",
  "crew": false,
  "start": "?wd=0&ws=12&hdg=315&ms=30&js=30&ap=wind&apt=45&sea=flat",
  "steps": [
    { "id": "close-hauled", "opens": "ropes", "holdS": 5, "check": { "twaDeg": [38, 52], "tack": "starboard", "mainTrim": ["good"], "jibTrim": ["good"] } },
    { "id": "close-reach", "opens": "autopilot", "holdS": 5, "check": { "twaDeg": [58, 72], "tack": "starboard", "mainTrim": ["good"], "jibTrim": ["good"] } },
    { "id": "beam-reach", "opens": "autopilot", "holdS": 5, "check": { "twaDeg": [85, 100], "tack": "starboard", "mainTrim": ["good"], "controls": { "ctl_jib_sheet": [90, 100] } } },
    { "id": "broad-reach", "opens": "autopilot", "holdS": 5, "check": { "twaDeg": [125, 145], "tack": "starboard", "controls": { "ctl_mainsheet": [85, 100], "ctl_jib_sheet": [90, 100] } } },
    { "id": "run", "opens": "autopilot", "holdS": 10, "check": { "twaDeg": [155, 170], "tack": "starboard", "controls": { "ctl_mainsheet": [85, 100] } } }
  ],
  "mistakes": [
    { "id": "accidental-gybe", "serious": false, "on": { "alert": "gybe", "accidental": true } },
    { "id": "by-the-lee", "serious": false, "on": { "alert": "byTheLee" } },
    { "id": "in-irons", "serious": false, "on": { "condition": { "twaDeg": [0, 20], "speedKn": [-99, 1] }, "forS": 5 } }
  ]
}
```

The mistakes are data from M66 and are read from M67 on (M66 loads and checks them, and ignores them while running).

`content/lang/en/exercises.json` (`"$status": "source"` first, then):

```json
"points-of-sail": {
  "title": "Trim through the points of sail",
  "summary": "Turn from close to the wind to a run, easing the sails as you go.",
  "see": "You are sailing close to the wind (close-hauled) on starboard tack: the wind comes over the right side of the bow. The front edge of the mainsail is flapping.",
  "happening": "A sail works like a wing only when the wind meets it at the right angle. As you turn away from the wind (bear away), the wind comes more from the side and then from behind, so each sail has to be let out further.",
  "action": "Each time you bear away, ease (let out) the sheets: the main until it stops being stalled, the jib all the way on a reach. On a run, let the main right out.",
  "mistake": "Turning away without easing: the sails stall (the air stops flowing smoothly over them), she heels and slows. Turning too far on a run: the wind gets behind the main and throws the boom across (an accidental gybe).",
  "done": "You sailed every point of sail from close-hauled to a run. The rule: the further from the wind, the further out the sails.",
  "steps": {
    "close-hauled": { "goal": "Close-hauled: haul the main in until it stops flapping.", "how": "In Ropes, tap − on Main sheet until it reads about 12 %. Watch the Sails section: both sails read Good when they are trimmed." },
    "close-reach": { "goal": "Close reach: turn 20° away from the wind, then ease the main.", "how": "In Autopilot, tap “10° to port” twice: the wind comes from starboard, so port is away from it. Then ease Main sheet to about 25 %." },
    "beam-reach": { "goal": "Beam reach: wind from the side. Ease the main and let the jib sheet right out.", "how": "Tap “10° to port” three more times. Ease Main sheet to about 50 % and Jib sheet to 100 %. On a reach the self-tacking jib (it changes sides by itself) cannot go out far enough to read Good: let its sheet right out." },
    "broad-reach": { "goal": "Broad reach: wind from behind the side. Let the main right out.", "how": "Tap “10° to port” four more times. Ease Main sheet to 85 % or more: the boom stops at the shrouds (the wires that hold the mast up), so the main cannot go further out." },
    "run": { "goal": "Run: wind from behind. Hold the course for 10 seconds without a gybe.", "how": "Tap “10° to port” three more times, to about 165° from the wind. Do not go further: with the wind dead behind or on the other side, the boom can swing across by itself." }
  },
  "mistakes": {
    "accidental-gybe": { "what": "The boom swung across by itself (an accidental gybe).", "why": "The wind got behind the mainsail from the other side: she turned past dead downwind.", "fix": "Turn back towards the wind until it is about 160° off the bow. On a run, never steer past dead downwind." },
    "by-the-lee": { "what": "You are sailing by the lee: the wind comes from the side the boom is on.", "why": "She turned past dead downwind, so the boom can gybe at any moment.", "fix": "Turn 10–20° back towards the wind straight away." },
    "in-irons": { "what": "She has stopped, pointing into the wind (in irons).", "why": "She turned towards the wind instead of away from it: no sail works with the wind straight ahead.", "fix": "Turn away from the wind with the Wind autopilot’s “10° to port”; if she does not answer, do the Getting out of irons exercise." }
  }
}
```

`content/lang/ru/exercises.json`: `"$status": "draft"` and a draft of every key (section 0).

### 6.3 Model and app logic

**`src/model/exercises.ts`** (pure; imports only `src/model/*` types and the JSON): the types of 4.1, `EXERCISES`, `EXERCISE_SETTINGS`, `exerciseDef`, `twaSignedDeg`, `checkPasses` (the M66 fields of 4.4), `exerciseText`. The loader keeps the file as typed (`as unknown as …`); the checks of the data live in `tests/exercises.test.ts`.

**`src/app/exerciseRun.ts`** (pure; imports `import type { AppState, Action } from './store'` only as types):

```ts
export function newRun(id: string, step: number, options: ExerciseOptions): ExerciseRun;
// status 'setup', startStep = step, elapsedS 0, stepStartS 0, settleFromS 0, holdS 0, seenAlertN 0,
// events [], gusts 0, gustArmed true, conditionS {}, lastMistakeS {}, mistake null, waypoints [], log [].
export function startRun(state: AppState): AppState;        // the 'start' command (below)
export function stepExercise(previous: AppState, next: AppState, def?: ExerciseDef): AppState;
```

- **`start`** (only from `setup`; otherwise no change): `paused: false`; run: `status 'running'`, `stepStartS = settleFromS = elapsedS`, `holdS 0`, `seenAlertN = state.alerts.written`, log `{ kind: 'start', atS: elapsedS, step }`.
- **`stepExercise`** (M66 part): `dt = next.rig.timeS − previous.rig.timeS`; if `dt <= 0` return `next`. `elapsedS += dt`; `seenAlertN = next.alerts.written`. `const step = def.steps[run.step]`; `passes = checkPasses(step.check, next, { events: run.events, gusts: run.gusts })`; `holdS = passes ? holdS + dt : 0`. If `passes && holdS >= step.holdS`: log `{ kind: 'step', atS: elapsedS, step: run.step, stepId: step.id }`; `step += 1`; `holdS 0`; `stepStartS = elapsedS`; `events []`; `gusts 0`; if `step === def.steps.length`: `status 'done'`, log `{ kind: 'finish', atS: elapsedS }`, and the state's `paused: true` (time stops on the done card).
- **`stop`**: `exercise: null`, `paused: false` (the boat stays as it is; Exercises mode shows the list).
- **`{ ropes }`** (only in `setup`): `settings.ropesMode = ropes` through `withTimeRule`, `appMode` stays `exercise`.
- **Locked actions** and **ending a run**: 4.2.
- **`setAppMode` to `exercise`** from another mode: `appMode: 'exercise'`, ropes mode kept, `exercise` stays null (the list).

**`src/app/exerciseProgress.ts`** (the device's ticks; `localStorage` through `globalThis.localStorage` in `try/catch`, as `boatStore.ts`):

```ts
export const PROGRESS_KEY = 'sail-learn.exercises';
export interface ExerciseProgress { v: 1; done: Readonly<Record<string, { bestS: number; at: string }>> }
export function parseProgress(text: string | null): ExerciseProgress;   // junk or null → { v: 1, done: {} }
export function withDone(p: ExerciseProgress, id: string, elapsedS: number, dateIso: string): ExerciseProgress; // keeps the smaller bestS; at = the date of the best
export function readProgress(): ExerciseProgress;
export function recordDone(id: string, elapsedS: number): ExerciseProgress; // reads, withDone with today's date (YYYY-MM-DD), writes, returns
```

### 6.4 Store and URL

- `AppState.exercise` (4.1), `InitialOverrides.exercise`, `initialState` → `exercise: overrides.exercise ?? null`.
- `appMode.ts`: `exercise` appended to `APP_MODES`, `keepsRopesMode` (4.1); `store.ts` (`setRopesMode`, `setAppMode`) and `urlState.ts` use it.
- `urlState.ts`: `m=exercise` parsed and written (4.3; it drops `learn=` as `m=harbour` does); `ex` parsed (4.3: known id → start state in `setup`, `paused: true`); `exerciseStartLink` exported; `serializeUrlState(state)` returns `exerciseStartLink(state.exercise.id, state, state.settings.ropesMode)` whenever `state.exercise !== null`.
- Old links: unchanged (4.3).

### 6.5 UI (`src/ui/exercisePanel.ts`, `src/ui/exerciseLine.ts`)

**Mode.** The mode picker lists Exercises fifth (`mode-choice-exercise`): `mode.exercise` "Exercises", `mode.exercise.desc` "For practising step by step. Pick an exercise: it sets up the boat and the wind, shows each step and ticks it off when you get it right." The mode chip reads "Mode: Exercises ▾" (wide) and "Exercises ▾" (side) as for the other modes.

**Section.** `SectionId` `'exercises'` (appended to `SECTION_IDS` after `'mode'`), title `t('exercise.label')`, `TAB_OF.exercises = 'controls'`, `explain: true` with `<p class="hint explain">` `t('exercise.hint')`; `sectionAvailable('exercises', state)` is `state.appMode === 'exercise'`. Mode rows: the new row `exercise.order` is `['mode', 'exercises', 'ropes', 'helm', 'sails', 'autopilot', 'engine', 'learn', 'conditions', 'place', 'anchor', 'harbour', 'status', 'settings']`; every other row gets `'exercises'` just before `'settings'`. `DEFAULT_WIDE_LAYOUT`: `exercises` first in column 0 (`completeLayout` adds it to a saved layout; check that it does, and if it appends at the end, leave that). In Exercises mode the panel opens the Exercises section on entering the mode and on every `load` that carries a run (the phone shows the Controls tab).

`createExercisePanel(store: Store, panel: { showSection(id: SectionId): void }, layout: () => LayoutKind, sheet: Sheet): HTMLElement[]` (built once with the other sections when the app starts, so its `store.subscribe` always runs) builds one `div.exercise-panel` (`data-testid="exercise-panel"`) and re-renders it only when the **render key** changes: `${run?.id}|${run?.status}|${run?.step}|${Math.ceil(remaining hold s)}|${ropesMode}|${language}` (no re-render per frame). Its content by state (phone size first; the same in a column on a computer):

1. **No run: the list.** For each group that has exercises, in the order `sailing`, `wind`, `sails`: `h3.section-title` `t('exercise.group.<group>')` and one row per exercise: a full-width button `exercise-item-<id>` (min height 44 px) holding the title (bold), the summary (`.hint`), and, when the device has it done, `<span class="exercise-tick" data-testid="exercise-tick-<id>">` `t('exercise.doneBest', { time })` ("✓ best 1:07"). A tap dispatches the `load` of 4.2 (the section stays open; on a phone the sheet stays where it is).
2. **`setup`: the setup card** (`exercise-setup`): `h3` title; the four parts as `h4` + `p`: `t('exercise.see')` / `see`, `t('exercise.happening')` / `happening`, `t('exercise.action')` / `action`, `t('exercise.mistake')` / `mistake`; **Ropes**: `t('exercise.ropes')` and two toggle buttons `exercise-ropes-easy`, `exercise-ropes-realistic` (`aria-pressed`, labels `t('mode.easy')`, `t('mode.realistic')`), dispatching `{ ropes }`, with `t('exercise.ropes.hint')` under them; **Steps**: an `ol.exercise-steps` of every step's goal; buttons **Start** (`exercise-start`, the accent style of the Repair and Share buttons; on a phone it also lowers the sheet to peek with `sheet.setHeight('peek')`, so the boat shows) and **Back to the list** (`exercise-list`, dispatches `stop`).
3. **`running`: the step card** (`exercise-step`): `t('exercise.stepOf', { n, total })`; `h3` the goal; while `run.holdS > 0` (the check passes and the hold is not over), `<p data-testid="exercise-hold">` `t('exercise.hold', { s })` (`s` = `Math.ceil(step.holdS − run.holdS)`; a step with `holdS: 0` never shows it); **How?** (`exercise-how`, `aria-expanded`) shows `<p data-testid="exercise-how-text">` the step's `how` and a button **Show the controls** (`exercise-open`) that calls `panel.showSection(section)` with `section = step.opens`, except that `engine` and `autopilot` become `helm` when `sectionAvailable(step.opens, state, layout())` is false (in Realistic ropes both live in the Helm section); the steps as `ol.exercise-steps` with done steps ticked (`li.done`, "✓" before the text) and the current one bold; **Stop the exercise** (`exercise-stop`) as a two-tap button (`createConfirmButton` from `settingsMenu.ts`: `t('exercise.stop')`, `t('exercise.stopConfirm')`).
4. **`done`: the done card** (`exercise-done`): `h3` `t('exercise.finished')`; `t('exercise.time', { time })`; the exercise's `done` text; buttons **Try again** (`exercise-again`: in M66 dispatches the `load` of the start link again, with the run's ropes) and **Back to the list** (`exercise-list`, `stop`). When the run turns `done` the panel calls `recordDone(id, elapsedS)` once (on the transition, in its `store.subscribe`).

**Locked sections.** While `state.exercise !== null`, the Conditions and Place sections' bodies get `inert` and, first in each, `<p class="hint" data-testid="exercise-locked-conditions">` (and `…-place`) `t('exercise.locked')`. The clock card's Now, Noon and Set a time buttons are `disabled` with the same text under them. In `learnTab.ts` the "Show it working" block (`learn-show-me`) is hidden while a run exists (it would load a scene and end the run).

**Step line** (`createExerciseLine(top: HTMLElement, store: Store, onOpen: () => void): void`, `app.ts` calls it after `createClockPanel` with `top` = `.view-top` and `onOpen = () => panel.showSection('exercises')`): one `button.exercise-line` (`data-testid="exercise-line"`), appended last to `.view-top`, `flex: 1 1 100%` (a row of its own under the strip and the time bar), max two lines of text then an ellipsis (`display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden`), 15 px text on the strip's background and border, min height 44 px. Hidden (`hidden`) unless a run exists and its status is not `setup`. Text: running: `t('exercise.line', { n, total, goal })` ("2/5 · Close reach: turn 20° away …"), with `t('exercise.lineHold', { s })` appended while holding; done: `t('exercise.lineDone', { time })`. A tap calls `onOpen` (`panel.showSection('exercises')`, which on a phone chooses the Controls tab and raises a sheet at peek to half, as `showSection` does today). The line counts in `trackTopHeight` (the camera frames the boat below it), as everything in `.view-top` does.

**Debug hook** (`app.ts`, only with `settings.debug`): `window.__sailExercise = { dispatch, state, read }`: `dispatch: (action) => store.dispatch(action)`; `state: () => store.getState().exercise` with `waypoints` replaced by their count (`{ ...run, waypoints: run.waypoints.length }`, so `page.evaluate` does not copy whole states); `read: () => ({ twsKn, twaDeg, speedKn, heelDeg, controls, jibOutPct, engineRunning, gear, paused })` from the current state (`twaDeg` = `twaSignedDeg`, `speedKn` signed, `jibOutPct` = `100 × rig.jibSolution.unfurled`).

Visual design: follow the Status section and the Learn entry (`h3.section-title`, `.hint`, the existing button styles and `--touch`); the setup card's four parts are plain headed paragraphs, not coloured boxes; no icons except the "✓" character; the step line looks like the instrument strip (same background, radius and shadow), not like an alert (no orange or red in M66).

### 6.6 Strings

| Key | English |
|---|---|
| `mode.exercise` | Exercises |
| `mode.exercise.desc` | For practising step by step. Pick an exercise: it sets up the boat and the wind, shows each step and ticks it off when you get it right. |
| `exercise.label` | Exercises |
| `exercise.hint` | Each exercise sets up the boat, the wind and the place, then shows one step at a time. A step ticks itself off when the boat shows you did it. |
| `exercise.group.sailing` | Sailing skills |
| `exercise.doneBest` | ✓ best {time} |
| `exercise.see` | What you see |
| `exercise.happening` | What is happening |
| `exercise.action` | The right action |
| `exercise.mistake` | The typical mistake |
| `exercise.ropes` | Ropes |
| `exercise.ropes.hint` | Easy: every rope is a slider. Realistic: clutches and winches, as on the boat. |
| `exercise.steps` | Steps |
| `exercise.start` | Start |
| `exercise.list` | Back to the list |
| `exercise.stepOf` | Step {n} of {total} |
| `exercise.how` | How? |
| `exercise.open` | Show the controls |
| `exercise.hold` | Good. Hold it: {s} s |
| `exercise.stop` | Stop the exercise |
| `exercise.stopConfirm` | Tap again to stop |
| `exercise.locked` | Set by the exercise. |
| `exercise.finished` | Well done! |
| `exercise.time` | Time: {time} |
| `exercise.again` | Try again |
| `exercise.line` | {n}/{total} · {goal} |
| `exercise.lineHold` | · hold {s} s |
| `exercise.lineDone` | Done ✓ {time} · tap for the summary |

Russian: drafts (section 0). `scripts/review-doc.mjs`: the review document gets a part "Exercises" listing every key of `exercises.json` with the English and the Russian text, in the file order, after the `ui.json` part; `docs/review/ru.md` regenerated. The part's heading comes from a new key `exercisesHeading` in each language's `WORDING` of `review-doc.mjs` (`'## Exercises'`, `'## Упражнения'`), like `uiHeading`.
- **Pause during a run** is allowed in M66 (only M71's Alone blocks it); the time bar's speed-up is allowed too, and the exercise time is app time, so speeding up does not shorten it.

### 6.7 Tests

`tests/exercises.test.ts`:

1. **Data.** Ids unique; step ids unique per exercise; every `opens` is one of `ExerciseOpens`; every check and condition uses only the fields of 4.4 known so far, with ranges `[min, max]`, `min <= max`; every mistake's `alert` is in `ALERT_KINDS`; every `steps` filter names a step of that exercise; `group` and `ropes` valid; every `start` link parses and `parseUrlState(start)` gives `controls.ctl_wind_speed` and `ctl_wind_dir` equal to its `ws` and `wd`.
2. **Texts.** Every exercise, step and mistake id has every text key in `en` and `ru`, and both files have the same keys in the same order; no text is empty; an exercise with no mistakes has `"mistakes": {}`.
3. **`twaSignedDeg`**: wind 0, heading 315 → +45; heading 45 → −45; heading 180 → 180.
4. **`checkPasses`** table: `twaDeg` on the absolute value (−45 passes `[38, 52]`); `tack` by sign; trim from `sailTrim`; `controls` ranges inclusive at both ends; `speedKn` signed (−1 passes `[-99, 1]`, 2 does not); `motion: null` → false; an empty check `{}` → true when motion exists.

`tests/exerciseRun.test.ts` (step 0.05 s with `reduce`; actions dispatched with `reduce` at a step's start):

1. **PT-22 good run** (points-of-sail): load the start link (`parseUrlState(exerciseStartLink('points-of-sail', initialState(), 'easy'))`), `start`, then per step: (1) `setControls { ctl_mainsheet: 12 }`; (2) `autopilot { turnDeg: -10 }` twice, `setControls { ctl_mainsheet: 25 }`; (3) `turnDeg -10` three times, `{ ctl_mainsheet: 50, ctl_jib_sheet: 100 }`; (4) `turnDeg -10` four times, `{ ctl_mainsheet: 100 }`; (5) `turnDeg -10` three times. Each step passes within (prototype + margin) **15, 30, 30, 30, 35 s** (prototype 5.1, 14.8, 14.0, 15.3, 18.2); then `status 'done'`, `paused true`, `elapsedS` in **[60, 100]** (prototype 67), the log is `start`, five `step`, `finish`. Named "PT-22 bearing away eases the sails: the points-of-sail exercise passes when the sheets are eased step by step".
2. **No trim, no pass:** the same start, `start`, 60 s without actions → still step 0 (the main stays luffing).
3. **Paused:** `setPaused true`, 10 s of steps → `elapsedS`, `holdS` and `step` unchanged.
4. **Locked:** during the run `setControls { ctl_wind_speed: 20, ctl_mainsheet: 50 }` → wind speed still 12, main sheet 50; `setWindMode`, `goToPlace`, `setSeaSetting`, `setClock`, `setBoatMode`, `setRopesMode` each return the same state object.
5. **Ending:** `setAppMode easy` → `exercise null`, appMode `easy`; `reset` → `exercise null`; `stop` → `exercise null`, appMode `exercise`.
6. **Setup:** after the load the run is `setup`, `paused true`; `{ ropes: 'realistic' }` sets `settings.ropesMode` and keeps `appMode 'exercise'`; `start` → `running`, `paused false`; `start` again → no change.

`tests/urlState.test.ts`: `m=exercise` round-trips; `?m=exercise&ex=points-of-sail` → run in `setup` at step 0, twa +45, main sheet 30, `paused true`; `serializeUrlState` of a running run → contains `m=exercise`, `ex=points-of-sail`, `mode=easy` and no `ms=`; `ex=nonsense` → `exercise null`; an old link (`?wd=60&ws=12`) → `exercise null`, appMode `easy`.

`tests/exerciseProgress.test.ts`: `parseProgress(null)` and of junk → empty; `withDone` keeps the smaller `bestS` and its date; two ids kept apart.

`tests/modes.test.ts`: every row has every section once (with `exercises`); `sectionAvailable('exercises')` only in `exercise`.

### 6.8 Browser checks (`scripts/shots-m66.mjs`, test clock)

Scenes (phone and desktop, `sheet: 'half'` on the phone, `section: 'exercises'`): `exercise-list` (`?m=exercise`), `exercise-setup` (`?m=exercise&ex=points-of-sail`), `exercise-setup-ru` (the same with `lang=ru`).

Live:

1. **Mode:** open `?wd=60&ws=12`, choose Exercises in the mode picker (phone: Mode tab; computer: the mode chip) → the Exercises section shows `exercise-item-points-of-sail` with the title.
2. **Setup:** tap it → `exercise-setup` shows the four headings and the five steps, `exercise-ropes-easy` pressed; the address bar has `ex=points-of-sail` and `mode=easy`; app time stands still (`__sailExercise.state().elapsedS` 0 after 3 s).
3. **Locked:** Conditions shows `exercise-locked-conditions` and its body has the `inert` attribute; `__sailExercise.dispatch({ type: 'setControls', values: { ctl_wind_speed: 20 } })` leaves the wind at 12 kn.
4. **Run:** tap `exercise-start` → `exercise-line` visible with "1/5 · Close-hauled: haul the main in until it stops flapping."; drive test 1's actions with `__sailExercise.dispatch`, waiting with `page.waitForTimeout` until the line shows the next step (at most the test-1 band per step); after step 5: `exercise-done` with "Well done!" and a time; `exercise-line` reads "Done ✓ …".
5. **Tick:** tap `exercise-list` → `exercise-tick-points-of-sail` reads "✓ best m:ss"; reload the page → the tick is still there.
6. **How?:** start again, tap `exercise-how` → `exercise-how-text` visible; tap `exercise-open` → the Ropes section is open (phone: the Controls tab is chosen).
7. **Stop:** tap `exercise-stop` twice → the list; Conditions has no locked note.
8. **Mode change ends it:** start, then choose Easy in the mode picker → `exercise-line` hidden, `__sailExercise.state()` null.
9. **Line tap:** during a run on the phone with the sheet at peek, tap `exercise-line` → the sheet shows the Exercises section.
10. `auditPage` with the list, the setup card and the step card shown (phone and desktop); the Russian setup card has no overflow (the script's layout checks) and passes the Latin scan.

### 6.9 Done when

Exercises mode shows the list, the setup card and a running exercise with ticking steps, the line, How?, the done card and the tick on a phone and a computer; links with `ex=` open the setup card; old links unchanged; typecheck, lint, tests, build, and `SHOTS_ONLY=m66,m27,m29,m35,m51,m52,m54` pass locally, then CI.

### 6.10 Not in M66

Mistakes, waypoints and their links (M67); the debrief (M68); any exercise other than points-of-sail; Alone/With crew (M71).

### 6.11 Decided in the M66 PR

Recommended; merging accepts it.

- **`exercises` leads column 0 of `DEFAULT_WIDE_LAYOUT`**, so a layout saved before M66 gets the Exercises section at the end of column 0 (`completeLayout` appends it). Only `tests/sectionLayout.test.ts` changed for it (the first two sections after moving Sails to the top are now Sails and Exercises). The section is hidden outside Exercises mode.
- **`tests/glossary.test.ts` and `tests/languages.test.ts`**: the review document has one more part (so the count of `##` headings is groups + 2), and `exercise.line` (only placeholders and a dot) joins the Russian strings that equal English.
- **`:root[data-exercise]`** is set by `app.ts` while a run exists; one CSS rule hides what would load a scene (Learn's "Show it working" and "Try it", Realistic's Practice) through `data-hide-in-exercise`.
- **The shots script** needs `SHOTS_CHROMIUM=/opt/pw-browsers/chromium` in this cloud environment (the repo's pinned Playwright looks for another browser build); CI is unchanged.

**After the owner's first test of the PR (comments of 2026-10-31).** Built in this PR:

- **The part card stays away in Exercises mode** (`infoCard.ts`): it covered the step line and the wind. Tapping a part still selects it (the strip, the quick row).
- **The wheel moved from the Ropes list to the Steering section** (Easy ropes; owner: "otherwise not logical"). The Autopilot section is now titled "Steering" (`steering.label`, the section id stays `autopilot`) and holds the wheel's slider with its − / + buttons above the autopilot block (`createSteeringPanel`). A wheel selected in the 3D view opens Steering in Easy ropes (it opens Helm in Realistic ropes, as before). `ropesTabShows` is false for the wheel. Older checks `shots-m4a.mjs` and `shots-m6.mjs` changed for this (they open the Steering section).
- **The autopilot texts name the real buttons**: "tap −10" (its screen-reader name is "10° to port"), not "tap “10° to port”".
- **A hint window over the 3D view** (`src/ui/exerciseCoach.ts`, under the step line): the step's How text and the targets to reach, one row per field of the step's check (`checkTargets`, `targetReading` in `model/exercises.ts`): "○ Wind 38–52° from the bow · now 45°", "✓ Mainsail: Good · now Good". A row turns ✓ while it holds. "Hide hint" folds it to one button; the choice is kept on this device (`sail-learn.coach`). The panel's How? stays. Only the fields M66 reads have a target row; M69–M71 add the rows for theirs (boom angle, events, gusts, how far each sail is out, the engine) with their strings.
- **Unused sections are hidden while an exercise is loaded** (new data field `sections` on each exercise; `sectionAvailable` in `modes.ts`). Points of sail keeps Ropes, Helm, Sails, Autopilot (Steering), Conditions and Learn; Engine, Place, Anchor, Harbour gear and Status are hidden. The setup card says what is set by the exercise ("the wind, the waves and the clock") and lists the hidden sections. Conditions stays visible, locked, because it is where the wind is read (recommended; merging accepts it).
- **Review items:** the Russian exercise texts are in the stray-Latin and curly-quote scan (`tests/languages.test.ts`); the accessibility audit also runs with the exercise list on screen. Item 1 (the Resume button during setup) goes to M67's pause work; items 4 and 5 stay as they are.

Not built, answered in the PR: a picture of the target position per step (the live targets give the same help, see the PR question), and the owner's layout idea for the bottom row.

---

## 7. M67: Mistakes and waypoints

**Independent review: required** (restoring a whole state, links that carry a run, mistakes read from shared state every frame).

Owner, answers 3 and 6 (2026-10-30): a setting at the start to **pause when you make a mistake**, so you can read the guidance; **waypoints** in every exercise, and while paused after a mistake you can **jump back to the last waypoint you reached** (this is the Try again); **waypoint links**.

### 7.1 Files

New: `scripts/shots-m67.mjs`. Changed: `src/app/exerciseRun.ts`, `src/app/store.ts` (the new commands), `src/app/urlState.ts` (`exw`, `exp`, `waypointLink`), `src/ui/exercisePanel.ts`, `src/ui/exerciseLine.ts`, `src/style.css`, both `ui.json`, `docs/review/ru.md`, `tests/exerciseRun.test.ts`, `tests/urlState.test.ts`, `scripts/shots.mjs`, `docs/CODE_MAP.md`.

### 7.2 Data

None new: the `mistakes` of points-of-sail (6.2) start to work.

### 7.3 Model and app logic (`src/app/exerciseRun.ts`)

**Mistakes in `stepExercise`** (after `elapsedS += dt`, before the step check; `stepId = def.steps[run.step].id`; a mistake **applies** when it has no `steps` or its `steps` include `stepId`; it **may fire** when `elapsedS − (lastMistakeS[id] ?? −Infinity) >= settings.mistakeRepeatGapS`):

- **Alert mistakes:** skip all new entries while `elapsedS − settleFromS < settings.settleS`. Otherwise, for each new entry (oldest first) and each applying mistake with `on.alert === entry.kind` (and, when `on.accidental` is given, `entry.report?.accidental === on.accidental`) that may fire: fire it.
- **Condition mistakes:** for each applying mistake with `on.condition`: if `checkPasses(on.condition, next, context)`: when `(conditionS[id] ?? 0) >= 0` (a missing entry counts as 0), `conditionS[id] = (conditionS[id] ?? 0) + dt`, and when that reaches `on.forS` and it may fire, fire it and set `conditionS[id] = −1` (it fires once per spell); when `conditionS[id] === −1` it stays. If the condition does not hold, or the mistake does not apply to the current step: `conditionS[id] = 0`.
- **Fire:** `entry = { kind: 'mistake', atS: elapsedS, step: run.step, mistakeId: id, serious }`; push it to the log; `lastMistakeS[id] = elapsedS`. For the **first** mistake of the frame only: `run.mistake = entry`, and `serious` → `status 'failed'` and the state's `paused: true`; otherwise `options.pauseOnMistake` → `status 'mistake'` and `paused: true`; otherwise the status stays `running`. When the status changed, `stepExercise` returns without checking the step this frame.

**Waypoints:**

- `snapshot(s: AppState): AppState` = `{ ...s, exercise: null, paused: false }`.
- At `start` (after the `start` log entry): push `{ step: run.step, atS: elapsedS, state: snapshot(the started state) }`. A run has at most one waypoint per step, so at most `steps.length` waypoints.
- When a step passes and another follows: push `{ step: <the new step>, atS: elapsedS, state: snapshot(next) }`. (No waypoint for `done`.)

**Commands** (in `store.ts`, through `exerciseRun.ts`):

- **`continue`** (only from `mistake`): `status 'running'`, `mistake: null`, `paused: false`.
- **`{ back: step }`** → `restoreWaypoint(state, step)` (from `running`, `mistake`, `failed` or `done`; a step with no waypoint: no change):

```ts
export function restoreWaypoint(state: AppState, step: number): AppState {
  const run = state.exercise;
  const wp = run?.waypoints.find((w) => w.step === step);
  if (!run || !wp) return state;
  // Times stamped inside the waypoint's state (rig.lastGybe.atS, contact reports, track points)
  // keep their older values: accepted (they only decide what old reports still show).
  return {
    ...wp.state,
    // App time never runs backwards (the alert history's repeat gaps compare times): the rig keeps
    // today's clock and the wind pattern is shifted so it replays as it was at the waypoint.
    rig: { ...wp.state.rig, timeS: state.rig.timeS },
    windMode: { ...wp.state.windMode, startS: wp.state.windMode.startS + (state.rig.timeS - wp.state.rig.timeS) },
    settings: state.settings,      // the viewer's settings (language, detail, time bar …); the ropes mode cannot change during a run
    camera: state.camera,
    selection: null,
    learn: state.learn,
    appMode: 'exercise',
    alerts: state.alerts,          // the history goes on
    paused: false,
    exercise: {
      ...run, status: 'running', step, holdS: 0,
      stepStartS: run.elapsedS, settleFromS: run.elapsedS, seenAlertN: state.alerts.written,
      events: [], gusts: 0, gustArmed: true, conditionS: {}, lastMistakeS: {}, mistake: null,
      waypoints: run.waypoints.filter((w) => w.step <= step),
      log: [...run.log, { kind: 'back', atS: run.elapsedS, step }],
    },
  };
}
```

- **`{ options: { pauseOnMistake } }`** (only in `setup`): sets `run.options.pauseOnMistake`.
- **Try again** (done card) and **Start again** (failed card) start a fresh run, as in M66: the UI dispatches the `load` of the run's setup link (`exerciseStartLink(id, state, ropes)` with the options when `startStep === 0`, else `waypointLink(state, run.waypoints[0])`), so `elapsedS` starts at 0 again. **Back** keeps `elapsedS` running (the time shown includes the detour).
- **Progress** (`recordDone`) is written only for a run with `startStep === 0` (a run from a waypoint link did not do every step; an `exw=0` link is the start and counts).
- **Pause while a card decides:** `setPaused` returns `state` while the status is `mistake` or `failed` (the card's buttons decide; the time bar's Pause is `disabled` then); in `done` it works.
- `reduce` skips `recordAlerts` for every `exercise` action (4.2).

### 7.4 URL

- `export function waypointLink(state: AppState, wp: ExerciseWaypoint): string`: take `serializeUrlState({ ...wp.state, settings: state.settings, camera: state.camera, appMode: 'exercise', exercise: null, selection: null, learn: null })`, then set `ex=<run.id>`, `exw=<wp.step>`, `mode=<ropes>` and (when off) `exp=0` on it.
- `serializeUrlState(state)` with a run: **with waypoints** → `waypointLink(state, <the last waypoint>)`; **in `setup` with `startStep > 0`** (a waypoint link was opened) → the same form built from the current state (`wp = { step: startStep, atS: 0, state }`); otherwise the start link of M66 (with `exp=0` when off).
- **Parsing `exw=n`** (with a known `ex`, `n` a whole number, `0 <= n < steps.length`): the state is `parseUrlState` of the link's own keys (the waypoint's full state; `def.start` is not used), then `appMode: 'exercise'`, `paused: true`, `exercise: newRun(id, n, options)`. An `exw` out of range is ignored (the start link's behaviour). `exp=0` → `pauseOnMistake: false` in both forms. `exw` without a known `ex` is ignored. A waypoint link is the waypoint's state **as a link carries it** (the keys `serializeUrlState` writes): a wind pattern restarts at the waypoint (its `startS` is 0 there), sail wear and the alert history are not carried; in-session Back restores the exact state. Settings → Share and the address bar give this link during a run, by design.

### 7.5 UI

- **Setup card:** a row with a native checkbox `exercise-pause-on-mistake` (checked by default, 44 px row, the label `t('exercise.pauseOnMistake')`) and `t('exercise.pauseHint')` under it, dispatching `{ options }`. For a run with `startStep > 0`, `<p data-testid="exercise-from-step">` `t('exercise.fromStep', { n: startStep + 1 })` above Start.
- **Mistake card** (`status 'mistake'`; `exercise-mistake`, above the step card, with the warning colour of the alert card as its left border, 4 px): `h3` `t('exercise.wentWrong')`, then the mistake's `what`; `h4` `t('exercise.why')` and `why`; `h4` `t('exercise.fix')` and `fix`; buttons **Carry on** (`exercise-continue`, `continue`) and **Back** (`exercise-back`, label `t('exercise.backTo', { n: last.step + 1 })` or, for waypoint 0 of a run started at Start, `t('exercise.backToStart')`), dispatching `{ back: last.step }` (`last` = the last waypoint).
- **Failed card** (`status 'failed'`; `exercise-failed`, the danger colour as its border; shown with the waypoints block and without the step card): `h3` `t('exercise.stopped')`, then what / why / fix as above; buttons **Back** (`exercise-back`), **Start again** (`exercise-restart`, `t('exercise.restart')`, the fresh run of 7.3), **Back to the list** (`exercise-list`).
- **Colours:** "warning" is the `.alert-chip` warning colour (`#b85c00` on `#fff3e0`), "danger" its danger colour (`#c8102e`); define them once as CSS variables `--exercise-warning`, `--exercise-danger` and use them only for the cards' 4 px left border and the line's border; the cards' background and text are the section's own (as the Status section's blocks).
- **Mistake card and step card together:** in `mistake` the mistake card is above the step card, whose hold text is frozen (time stands still).
- **Not pausing:** while `run.mistake` exists and `elapsedS − run.mistake.atS < settings.mistakeShowS`, the line shows `t('exercise.lineMistake', { what })` with the class `exercise-line-mistake` (warning-colour border); the step card shows `<p data-testid="exercise-last-mistake">` `t('exercise.lastMistake', { what })` and a **Why?** button (`exercise-last-why`, `aria-expanded`) that shows why and fix.
- **Line while paused by a mistake:** `t('exercise.linePaused', { what })` (class `exercise-line-paused`, the danger colour border); failed: `t('exercise.lineStopped', { what })`.
- **Waypoints block** in the step card, the mistake card, the failed card and the done card (after the steps list, or after the card's buttons): `h4` `t('exercise.waypoints')` and one row per waypoint, newest first: its name (`t('exercise.waypointStart')` for step 0 of a run started at Start, else `t('exercise.waypointStep', { n: step + 1 })`), a button **Go back** (`exercise-waypoint-back-<step>`, `{ back: step }`, 44 px) and a link **Link** (`a`, `exercise-waypoint-link-<step>`, `href` = `location.origin + location.pathname + waypointLink(state, wp)`), so a long press on a phone copies it.
- **Done card:** Try again (`exercise-again`) starts the fresh run of 7.3.
- **Accessible names:** each Go back button is named `t('exercise.waypointBackTo', { name })` and each Link `t('exercise.waypointLinkTo', { name })`, with `name` the row's name, so the rows can be told apart.
- **Open/closed state** of How?, Why? and (M68) So far lives in the panel's closure, survives re-renders and resets when the step changes.
- The render key adds `waypoints.length`, `run.mistake?.atS`, `options.pauseOnMistake` and whether the last mistake is still shown (`elapsedS − mistake.atS < mistakeShowS`).

### 7.6 Strings

| Key | English |
|---|---|
| `exercise.pauseOnMistake` | Pause when I make a mistake |
| `exercise.pauseHint` | Time stops and the card tells you what went wrong, so you can read it before you go on. |
| `exercise.fromStep` | This link starts at step {n}. |
| `exercise.wentWrong` | What went wrong |
| `exercise.why` | Why |
| `exercise.fix` | What to do |
| `exercise.continue` | Carry on |
| `exercise.backTo` | Back to the start of step {n} |
| `exercise.backToStart` | Back to the start |
| `exercise.stopped` | The exercise stopped |
| `exercise.lineMistake` | Mistake: {what} |
| `exercise.linePaused` | Paused: {what} |
| `exercise.lineStopped` | Stopped: {what} |
| `exercise.lastMistake` | Last mistake: {what} |
| `exercise.lastWhy` | Why? |
| `exercise.waypoints` | Waypoints |
| `exercise.waypointStart` | Start |
| `exercise.waypointStep` | Start of step {n} |
| `exercise.waypointBack` | Go back |
| `exercise.waypointLink` | Link |
| `exercise.waypointBackTo` | Go back to: {name} |
| `exercise.waypointLinkTo` | Link to: {name} |
| `exercise.restart` | Start again |

### 7.7 Tests

`tests/exerciseRun.test.ts` (as 6.7; "the good run" = 6.7 test 1's actions):

1. **PT-26 by the lee and accidental gybe:** the good run's steps 1–4, then in step 5 `turnDeg -10` six times (step 5's 10 s hold cannot pass on the way: the prototype turns through 155–170° in 3.3 s) (to 195° from the wind's first side, 15° by the lee) → a `by-the-lee` mistake within **25 s** of the turn: `status 'mistake'`, `paused true`, `run.mistake.mistakeId 'by-the-lee'`; `continue` → `running`; an `accidental-gybe` mistake within **35 s** of the turn counted in app time (prototype, without the pause: `byTheLee` 13.1 s, the accidental `gybe` 21.4 s after the turn). Named "PT-26 running past dead downwind gybes the boom: the exercise reports by the lee, then the gybe".
2. **Without pausing:** the same with `{ options: { pauseOnMistake: false } }` in setup → `status` stays `running` and `paused` false throughout; the log has both mistakes; `run.mistake` is the gybe.
3. **Repeat gap** (built states: `next` = `previous` with `rig.timeS + 0.05` and one more `byTheLee` entry): two entries 5 s of `elapsedS` apart → one mistake; 11 s apart → two.
4. **Condition (in irons):** start, the good run's step 1, then `autopilot { turnDeg: 10 }` four times → `in-irons` within **[30, 60] s** (prototype 41.4 s).
5. **Steps filter and serious** (a test `def` passed to `stepExercise`, steps `a` and `b` with checks that never pass, mistake `{ id: 'x', serious: true, steps: ['b'], on: { alert: 'tack' } }`): a `tack` entry in step `a` → nothing; with `run.step` 1 → `status 'failed'`, `paused true`; `continue` → no change.
6. **Settle:** a new entry 0.5 s after `start` → ignored; 1.5 s after → counted.
7. **Waypoints:** after `start` one waypoint (step 0); after step 1 passes, two (0 and 1), and waypoint 1's state has `ctl_mainsheet 12`. Go on to step 3, then `{ back: 1 }` → `step 1`, `ctl_mainsheet 12`, `|twaSignedDeg|` within 1° of the snapshot's, two waypoints, the log ends with `back`, `alerts` is the same object as before, `camera` and `settings.language` kept, `status 'running'`, `paused false`.
8. `{ back: 4 }` with no such waypoint → the same state object; `{ back: 0 }` from `done` and from `failed` → `running` at step 0; after a Back `rig.timeS` is not smaller than before and no new alert entry was written by the Back itself; after the Back, run until a new `byTheLee` alert comes at least 6 s of app time after the previous `byTheLee` entry: it is written and fires the mistake (the history's 5 s repeat gap compares forward-running times).
9. **Pause:** in `mistake`, `setPaused false` returns the same state.

`tests/urlState.test.ts`: a running run with two waypoints → the link has `exw=1`, `ms=12` and `mode=easy`; parsing it → `setup`, `step 1`, `startStep 1`, `ctl_mainsheet 12`, `paused true`; serializing that setup state gives the same `exw=1` link; `exp=0` round-trips; `exw=9` on points-of-sail → the start (step 0, main sheet 30).

### 7.8 Browser checks (`scripts/shots-m67.mjs`, test clock)

Scenes: `exercise-mistake` (phone and desktop, `section: 'exercises'`): live shot after check 1.

Live:

1. **Pause on a mistake:** `?m=exercise&ex=points-of-sail&debug=1`, Start, drive the good run to step 5 with `__sailExercise.dispatch`, then turn six times −10 → `exercise-mistake` shows its three texts ("You are sailing by the lee…"), the line reads "Paused: …", app time stands still for 3 s.
2. **Carry on** → running; the next mistake (the gybe) shows the card again.
3. **Back:** tap `exercise-back` → step 5 again (`exercise-line` "5/5 · …"), the boat back at about 135° from the wind (`__sailExercise.read().twaDeg`), no card.
4. **Waypoint link:** read `exercise-waypoint-link-3`'s `href`, open it in a new page → the setup card with `exercise-from-step` "This link starts at step 4."; Start → the line reads "4/5 · …".
5. **Not pausing:** a new start with `exercise-pause-on-mistake` unticked; cause the by-the-lee mistake → the line shows "Mistake: …" with `exercise-line-mistake`, time goes on; after 6 s of app time the line shows the step again.
6. **Try again** from the done card → setup at step 1 with the fresh start position (main sheet 30) and time 0:00 after Start.
7. `auditPage` with the mistake card and the waypoint block shown (phone, desktop). The failed card (no serious mistake in part 10a's data) is covered by unit test 5 only.

### 7.9 Done when

Mistakes pause (or flash when the box is unticked) with what / why / what to do; Back to a waypoint and waypoint links work; the good run of M66 still passes; typecheck, lint, tests, build and `SHOTS_ONLY=m66,m67` pass, then CI.

### 7.11 Decided in the M67 PR (owner test and independent review; the owner accepted every recommendation)

- The four Steering buttons show a caption under the number ("10° port", "1° port", "1° stbd", "10° stbd"; Russian draft), so a learner can tell them apart.
- Each mistake text has a `name` (en, ru draft). The setup card lists the exercise's mistakes under the "Pause when I make a mistake" box ("In this exercise: …"); EXERCISES.md has "When an exercise pauses".
- The accidental-gybe "What to do" says the step cannot pass from there and to tap Back; the by-the-lee text names the +10 button.
- The time bar's Pause button is dimmed when switched off (like the other time buttons).
- Not built, later: a solid marina or a "too close to the harbour" mistake (`/plan 10b`); the autopilot line on the minimap (ROADMAP Ideas); a page icon in `index.html`.

### 7.10 Not in M67

The action log and the debrief (M68); serious mistakes in the exercises' data (none in part 10a: the serious ones, a hard hit or running aground, come with the harbour exercises of part 10b); waypoints in the list (only in a run).

### 7.11 Decided in the M67 PR

Recommended; merging accepts it.

- **The time bar's Pause is also `disabled` in `setup`** (and `setPaused false` is ignored there): until Start, time stands still, so the "Resume" button cannot start the clock before the run (item 1 of the M66 review, which M66 left to this milestone). Pause itself still works in `running` and `done`.
- **The panel's tick is written only for a run with `startStep === 0`** (a waypoint link's run did not do every step), as 7.3 says; it is the same `store.subscribe` that already wrote it.
- **`exerciseStartLink` writes `exp=0`** from the current run's options, so Try again and Start again keep the box as it was; the list (no run) writes none.
- **A waypoint run's Try again / Start again** loads the link of the run's first waypoint (`restartLink` in `exercisePanel.ts`).
- **Mistakes with several in one frame:** every one is logged, only the first sets `run.mistake` and the status (7.3).

---

## 8. M68: Debrief

**Independent review: required** (every learner action is logged inside `reduce`; a wrong cause teaches the wrong thing).

EXERCISES.md: every exercise ends with a debrief, "a short timeline of what the user did, what the boat did, and, if something went wrong, which action caused it".

### 8.1 Files

New: `src/model/debrief.ts`, `src/ui/exerciseDebrief.ts`, `tests/debrief.test.ts`, `scripts/shots-m68.mjs`. Changed: `src/app/exerciseRun.ts` (`logAction`, event entries), `src/app/store.ts` (calls `logAction`), `src/ui/exercisePanel.ts` (the debrief in the cards, "So far"), `src/style.css`, both `ui.json`, `docs/review/ru.md`, `tests/exerciseRun.test.ts`, `scripts/shots.mjs`, `docs/CODE_MAP.md`.

### 8.2 Data

None new: `settings.logMax` (400), `causeWindowS` (30), `causeMax` and `controlMergeS` exist since M66 (4.4; **tunable**). The cause window is 30 s because an accidental gybe can come 21 s after the turn that caused it (3.5, 7.7 test 1).

### 8.3 Model and app logic

**Event entries** (`stepExercise`): every new alert entry that is not skipped by the settle rule (7.3) is logged as `{ kind: 'event', atS: elapsedS, entry }`, before the mistakes it may fire (so a mistake row follows its event).

**`logAction(previous, next, action)`** (`src/app/exerciseRun.ts`; `reduce` calls it after `stepExercise` for every action but `step`, only when `next.exercise?.status` is `running` or `mistake`). `t = next.exercise.elapsedS`; `last` = the last log entry. Values are rounded to whole numbers before comparing. **Logged only if it changed something:** `setControls` per id whose rounded value changed; `autopilot` when `next.autopilot !== previous.autopilot`; `engine` when `next.engine !== previous.engine`; `realistic` when `next.controls !== previous.controls` or some key of `next.realistic` other than `notice` differs (`!==`) from `previous.realistic`'s (a refused gesture only sets a notice). `last` is the last log entry of any kind (an event or a step in between starts a new entry). A merged `control` that ends at its `from`, or a merged `turn` that sums to 0, is removed.

| Action | Logged as | Merged into `last` when (`t − last.atS <= settings.controlMergeS`) |
|---|---|---|
| `setControls` | per control id in `action.values` except `ctl_wind_dir`, `ctl_wind_speed`, whose value changed: `{ type: 'control', id, from: previous.controls[id], to: next.controls[id] }` | `last` is a `control` of the same id: its `to` and `atS` are replaced |
| `autopilot` `'off' \| 'heading' \| 'wind' \| 'tack'` | `{ type: 'autopilot', command }` | never |
| `autopilot { turnDeg }` | `{ type: 'autopilot', command: 'turn', turnDeg }` | `last` is a `turn`: `turnDeg` is added, `atS` replaced |
| `engine 'start' \| 'stop'` | `{ type: 'engine', command }` | never |
| `engine { leverPct }` | `{ type: 'engine', command: 'lever', leverPct }` | `last` is a `lever`: `leverPct` and `atS` replaced |
| `realistic` (all but `clearNotice`) | `{ type: 'realistic', gesture: action.action.type, target, on }` with `target` = the action's `key`, `winch`, `station`, `to` or `null` (first that exists, in that order), `on` = `open` (clutch), `into` (self-tailer), `held` (button) or `undefined` | `last` is the same gesture with the same target and the same `on`: `atS` replaced |

So `LoggedAction`'s realistic variant (4.1) gains `on?: boolean`. Nothing else is logged (camera, selection, Pause, sections). When the log is longer than `settings.logMax`, the oldest `action` entry is removed (other entries are never removed; a run has few of them).

**`src/model/debrief.ts`** (pure):

```ts
export interface DebriefRow {
  entry: ExerciseLogEntry;
  /** For a mistake: the learner's actions in the causeWindowS seconds before it (at most causeMax, oldest first). */
  causes: readonly Extract<ExerciseLogEntry, { kind: 'action' }>[];
}
export function debriefRows(log: readonly ExerciseLogEntry[], settings: ExerciseSettings = EXERCISE_SETTINGS): DebriefRow[];
export interface DebriefSummary { timeS: number; stepsDone: number; total: number; mistakes: number }
export function debriefSummary(log: readonly ExerciseLogEntry[], total: number, elapsedS: number): DebriefSummary;
```

- `debriefRows`: one row per log entry, in log order; a mistake's `causes` are the `action` entries with `mistake.atS − causeWindowS <= atS` that stand before the mistake in the log (see 8.10), the last `causeMax` of them.
- `debriefSummary`: `timeS` = the `finish` entry's `atS`, else `elapsedS` (the run's clock now); `stepsDone` = the number of different `step` values among `step` entries; `mistakes` = the number of `mistake` entries.

### 8.4 UI (`src/ui/exerciseDebrief.ts`, `src/ui/exercisePanel.ts`)

`createDebrief(run: ExerciseRun, def: ExerciseDef): HTMLElement` (texts in `currentLanguage()` through `t()` and `exerciseText`; times with `alertTimeText`) (`div.exercise-debrief`, `data-testid="exercise-debrief"`):

- `h4` `t('debrief.title')`, then `<p data-testid="debrief-summary">` `t('debrief.summary', { time, done, total, mistakes })`.
- A toggle **Show my actions** (`debrief-actions-toggle`, label `t('debrief.actions')`, `aria-pressed`, off at first; its state lives in the panel's closure and survives re-renders): off, the list shows every row but `action` rows; on, all rows.
- `ol.debrief-list` (`data-testid="debrief-list"`), each row `<li data-testid="debrief-row" data-kind="<kind>">` with the time (`alertTimeText(atS)`, in a `span.debrief-time`) and the text:

| Kind | Text | Look |
|---|---|---|
| `start` | `t('debrief.start')` (step 0) or `t('debrief.startAt', { n: step + 1 })` | plain |
| `step` | `<span class="debrief-tick">✓</span>` (accent colour) then `t('debrief.step', { n: step + 1, goal })` | plain |
| `finish` | `t('debrief.finish')` | bold |
| `back` | `t('debrief.back', { n: step + 1 })` | plain |
| `event` | `alertText(entry.entry)` (`src/ui/alertCentre.ts`) | grey |
| `mistake` | the mistake's `what`, then a `p` with `why`, a `p` with `fix`, then `t('debrief.justBefore')` and a nested list of the causes' texts, or `t('debrief.noCause', { s: causeWindowS })` when there are none | left border in the warning colour (danger for a serious one) |
| `action` | the action's text (below) | small, grey |

Action texts: `control` → `t('debrief.control', { name, from, to })` with `name` = `t(<key>)`, keys `ctl_mainsheet` → `control.mainsheet`, `ctl_jib_sheet` → `control.jibSheet`, `ctl_vang` → `control.vang`, `ctl_topping_lift` → `control.toppingLift`, `ctl_main_furl` → `control.mainFurl`, `ctl_jib_furl` → `control.jibFurl`; `ctl_rudder` → `t('debrief.wheel', { from, to })` with signed whole degrees (+ = to starboard, as the Wheel control shows them). `autopilot` → `t('debrief.ap.<command>')` for off, heading, wind, tack; `turn` → `t('debrief.ap.turnPort', { deg })` for `turnDeg < 0`, `t('debrief.ap.turnStarboard', { deg })` otherwise (`deg` = `Math.abs(turnDeg)`). `engine` → `t('debrief.engine.start' | '.stop')`, `t('debrief.engine.lever', { pct })`. `realistic` → the key by gesture: `station` → `debrief.rope.station`; `clutch` → `clutchOpen` / `clutchClose` by `on`; `onWinch`; `offWinch`; `turn`; `selfTailer` → `selfTailerIn` / `selfTailerOut`; `button` → `buttonHeld` / `buttonLet`; `ease`; `pull`; `handle`; `crank`; `gearbox` (all under `debrief.rope.`), with `{ label, side, station }`, where `label` = `tailSpec(target)?.label ?? target ?? ''` (the words printed on the boat), `side` = `t('side.port.gen')` / `t('side.starboard.gen')` from a winch id ending in `_port` / `_starboard`, `station` = `t('debrief.station.<id>')`.

In the panel: the **done** and **failed** cards show `createDebrief` under their buttons; the **step card** and the **mistake card** get a button **So far** (`exercise-so-far`, `t('exercise.soFar')`, `aria-expanded`) that shows `createDebrief` of the log until now. The debrief re-renders only with the panel's render key, which adds `run.log.length` while the debrief is shown.

### 8.5 Strings

| Key | English |
|---|---|
| `exercise.soFar` | So far |
| `debrief.title` | Debrief |
| `debrief.summary` | Time {time} · {done} of {total} steps · mistakes: {mistakes} |
| `debrief.actions` | Show my actions |
| `debrief.start` | Started |
| `debrief.startAt` | Started at step {n} |
| `debrief.step` | Step {n}: {goal} |
| `debrief.finish` | Finished |
| `debrief.back` | Went back to the start of step {n} |
| `debrief.justBefore` | Just before, you: |
| `debrief.noCause` | You did nothing in the {s} seconds before: the wind or the boat's course did it. |
| `debrief.control` | {name}: {from} → {to} % |
| `debrief.wheel` | Wheel: {from}° → {to}° |
| `debrief.ap.off` | Autopilot: Standby (you steer) |
| `debrief.ap.heading` | Autopilot: Heading |
| `debrief.ap.wind` | Autopilot: Wind |
| `debrief.ap.tack` | Autopilot: Tack |
| `debrief.ap.turnPort` | Autopilot: {deg}° to port |
| `debrief.ap.turnStarboard` | Autopilot: {deg}° to starboard |
| `debrief.engine.start` | Engine started |
| `debrief.engine.stop` | Engine stopped |
| `debrief.engine.lever` | Engine lever: {pct} % |
| `debrief.station.port` | port |
| `debrief.station.starboard` | starboard |
| `debrief.station.helm` | helm |
| `debrief.station.mast` | mast |
| `debrief.station.bow` | bow |
| `debrief.rope.station` | Went to the {station} station |
| `debrief.rope.clutchOpen` | Opened the clutch: {label} |
| `debrief.rope.clutchClose` | Closed the clutch: {label} |
| `debrief.rope.onWinch` | Put on the winch: {label} |
| `debrief.rope.offWinch` | Took the rope off the {side} winch |
| `debrief.rope.turn` | Changed the turns on the {side} winch |
| `debrief.rope.selfTailerIn` | Into the self-tailer ({side} winch) |
| `debrief.rope.selfTailerOut` | Out of the self-tailer ({side} winch) |
| `debrief.rope.buttonHeld` | Held the {side} winch button |
| `debrief.rope.buttonLet` | Let go of the {side} winch button |
| `debrief.rope.ease` | Eased: {label} |
| `debrief.rope.pull` | Pulled by hand: {label} |
| `debrief.rope.handle` | Moved the winch handle |
| `debrief.rope.crank` | Cranked the winch handle |
| `debrief.rope.gearbox` | Turned the mast gearbox switch |

`pull` with no target uses `debrief.rope.pull` with `label` = `t('debrief.rope.nothing')`.

| Key | English |
|---|---|
| `debrief.rope.nothing` | nothing (let go) |

(`exercise.soFar` goes after the other `exercise.*` keys; `debrief.rope.nothing` after `debrief.rope.pull`.)

### 8.6 Tests

`tests/debrief.test.ts`:

1. **Causes** (window 15 and max 3 passed as `settings`): actions at 1, 5, 12 and 20 s and a mistake at 22 s → causes at 12 and 20; actions at 8, 9, 10, 11 and a mistake at 12 → causes 9, 10, 11; a mistake with no action in the window → `causes` empty.
2. **Summary:** a log with `step` 0, `step` 1, `back` to 1, `step` 1 again, `finish` at 80 → `stepsDone` 2, `timeS` 80; two mistakes → `mistakes` 2.

`tests/exerciseRun.test.ts`:

3. **Merging:** during a run, `setControls { ctl_mainsheet: 25 }` then 1 s later `{ ctl_mainsheet: 20 }` (start 30) → one entry 30 → 20; 4 s later `{ ctl_mainsheet: 15 }` → a second entry 20 → 15; a wind key is never logged; six `autopilot { turnDeg: -10 }` in one frame → one entry `turnDeg −60`; a `realistic` clutch open on `a2` → `{ gesture: 'clutch', target: 'a2', on: true }`.
4. **Not logged:** actions in `setup`, `done` or `failed`; `select`, `setCameraPreset`, `setPaused`; an action that changes nothing.
5. **Causes in a real run:** M67 test 1's drive with `pauseOnMistake: false` → the log has `event` entries for `byTheLee` and the accidental `gybe`, each before its mistake; with the default settings (30 s) the causes of **both** mistake rows end with the autopilot `turn` of −60 (the gybe comes about 21 s after it).
6. **logMax:** 450 control changes 4 s apart → the log has 400 entries and still starts with `start`.

### 8.7 Browser checks (`scripts/shots-m68.mjs`, test clock)

Scenes: `exercise-debrief` (phone and desktop): live shot of the done card after check 1.

Live:

1. **Done with a mistake:** points-of-sail with `exercise-pause-on-mistake` unticked; the good run's steps 1–4, then in step 5 turn −10 six times (the `by-the-lee` and `accidental-gybe` mistakes of M67 test 1, about 22 s); tap `exercise-waypoint-back-4` ("Start of step 5") and finish with the good run's step 5 → the done card shows `debrief-summary` "… 5 of 5 steps · mistakes: 2"; both `mistake` rows show "Just before, you:" and "Autopilot: 60° to port", and there is a `back` row.
2. **Actions toggle:** `debrief-actions-toggle` → `action` rows appear ("Main sheet: 30 → 12 %").
3. **So far:** during a run, `exercise-so-far` shows the debrief with the steps done.
4. Russian: the done card in `lang=ru` has no overflow; `auditPage` with the debrief open (phone, desktop).

### 8.8 Done when

Every finished, stopped or running exercise can show its debrief, with the actions just before each mistake; typecheck, lint, tests, build and `SHOTS_ONLY=m66,m67,m68` pass, then CI.

### 8.9 Not in M68

Saving or sharing a debrief; a debrief in the link (a link starts a run, it does not carry its history).

### 8.10 Decided in the M68 PR (recommended; merging accepts it)

- **One "So far" button at a time.** While a mistake card is shown the step card is shown under it; only the mistake card carries "So far" then, so there is one `exercise-so-far` on screen. The failed card shows the debrief itself.
- **Open "So far" stays open** across steps and mistakes until the run ends or goes back to setup; "Show my actions" is kept the same way (in the panel's closure, so a new step does not reset it).
- **`createDebrief(run, def, view?)`** takes an optional third argument, the switch's state (`{ showActions }`), so the panel can keep it; without it the switch starts off. The toggle re-draws only the list.
- **Causes come from before the mistake in the log (owner, review items 1, 2 and 5).** `debriefRows` takes only actions that stand before the mistake's position in the log (and within the window), not every action with a time up to the mistake's: with "Pause when I make a mistake" the clock stands still, so what the learner does on the mistake card carries the mistake's time but is not its cause. "Show my actions" is reset to off when the run goes back to setup, like "So far". Test 4 also covers `done`.
- **The wheel** is written with a sign (`+10` to starboard, `-10` to port); a control change from the Realistic ropes (`controls` moved by a gesture) is logged only as the gesture, because the log records what the learner did, not what the rope then did.
- **The M66 test 1 line that lists the log's kinds** now ignores `action` entries (the run logs the sheet changes between the steps). No other older test changed.
- **CI part split:** the part `live, M66-M71` ran over the 45-minute job limit (the M68 group alone takes about 20 minutes at its pace), so it is now two parts: `live, M66-M67` and `live, M68-M71` (milestones M69 to M71 may need their own part again).
- **Russian** debrief strings are AI drafts like all of `ui.json`; `docs/review/ru.md` is regenerated.

---

## 9. M69: Tacking, getting out of irons, gybing

**Independent review: required** (a new rule, PT-58; the checks decide what counts as a good tack and a controlled gybe).

### 9.1 Files

New: `tests/physicsTruths10.test.ts`, `scripts/shots-m69.mjs`. Changed: `content/exercises/exercises.json` (three exercises), both `exercises.json` texts, `src/model/exercises.ts` (`boomDeg`, `event`), `src/app/exerciseRun.ts` (events), `tests/exercises.test.ts`, `tests/exerciseRun.test.ts`, `docs/PHYSICS_TRUTHS.md` (PT-58's test), `docs/review/ru.md`, `scripts/shots.mjs`, `docs/CODE_MAP.md`.

### 9.2 Data (appended to `exercises`, in this order)

```json
{
  "id": "tacking", "group": "sailing", "ropes": "easy", "crew": false,
  "start": "?wd=0&ws=12&hdg=315&ms=12&js=30&ap=wind&apt=45&sea=flat",
  "steps": [
    { "id": "tack-autopilot", "opens": "autopilot", "holdS": 5, "check": { "event": "tack", "tack": "port", "twaDeg": [38, 55], "speedKn": [4, 99] } },
    { "id": "tack-by-hand", "opens": "autopilot", "holdS": 0, "check": { "event": "tackByHand", "tack": "starboard" } },
    { "id": "centre-wheel", "opens": "ropes", "holdS": 5, "check": { "tack": "starboard", "twaDeg": [30, 60], "speedKn": [2, 99], "controls": { "ctl_rudder": [-5, 5] } } },
    { "id": "pick-up-speed", "opens": "autopilot", "holdS": 5, "check": { "tack": "starboard", "twaDeg": [38, 55], "speedKn": [4, 99], "mainTrim": ["good"], "jibTrim": ["good"] } }
  ],
  "mistakes": [
    { "id": "in-irons", "serious": false, "on": { "condition": { "twaDeg": [0, 20], "speedKn": [-99, 1] }, "forS": 5 } }
  ]
},
{
  "id": "irons", "group": "sailing", "ropes": "easy", "crew": false,
  "start": "?wd=0&ws=12&hdg=0&bs=0&ms=10&js=10&ap=off&sea=flat",
  "steps": [
    { "id": "ease-sheets", "opens": "ropes", "holdS": 1, "check": { "controls": { "ctl_mainsheet": [40, 100], "ctl_jib_sheet": [40, 100] } } },
    { "id": "wheel-over", "opens": "ropes", "holdS": 0, "check": { "twaDeg": [35, 90] } },
    { "id": "sail-away", "opens": "ropes", "holdS": 5, "check": { "twaDeg": [30, 60], "speedKn": [3, 99], "mainTrim": ["good"], "jibTrim": ["good"], "controls": { "ctl_rudder": [-5, 5] } } }
  ],
  "mistakes": []
},
{
  "id": "gybing", "group": "sailing", "ropes": "easy", "crew": false,
  "start": "?wd=0&ws=12&hdg=195&ms=100&js=50&ap=wind&apt=165&sea=flat",
  "steps": [
    { "id": "haul-main", "opens": "ropes", "holdS": 2, "check": { "boomDeg": [0, 16], "tack": "starboard" } },
    { "id": "gybe", "opens": "autopilot", "holdS": 3, "check": { "event": "controlledGybe", "tack": "port", "twaDeg": [150, 175] } },
    { "id": "ease-main", "opens": "ropes", "holdS": 5, "check": { "tack": "port", "twaDeg": [150, 175], "controls": { "ctl_mainsheet": [85, 100] } } },
    { "id": "accidental", "opens": "autopilot", "holdS": 0, "check": { "event": "accidentalGybe" } }
  ],
  "mistakes": [
    { "id": "accidental-gybe", "serious": false, "steps": ["haul-main", "gybe", "ease-main"], "on": { "alert": "gybe", "accidental": true } }
  ]
}
```

(The Wheel is in the Ropes section in Easy ropes, so the wheel steps open `ropes`.)

### 9.3 Model and app logic

- `checkPasses` gains `boomDeg` and `event` (4.4).
- **Events** (`stepExercise`, with the new alert entries that pass the settle rule, before the mistakes; an entry inside the settle time is not an event either): a `tack` entry adds `'tack'`, and also `'tackByHand'` when `next.autopilot.mode === 'off'`; a `gybe` entry adds `'accidentalGybe'` when `entry.report?.accidental`, else `'controlledGybe'`. `run.events` is emptied when a step passes, at `start` and at a Back (7.3 already does). A tack "by hand" means with the autopilot on Standby; the step's text says so. `ExerciseEvent` exists as a type since M66 (4.1); M69 makes the events happen.

### 9.4 Texts (`content/lang/en/exercises.json`, appended)

```json
"tacking": {
  "title": "Tacking",
  "summary": "Turn the bow through the wind, first with the autopilot, then by hand.",
  "see": "You are sailing close-hauled on starboard tack: the wind comes over the right side of the bow.",
  "happening": "To reach a place upwind a sailing boat zigzags: she tacks (turns her bow through the wind) from one side to the other. The self-tacking jib changes sides by itself, so only the wheel is needed.",
  "action": "Turn steadily and keep turning until the wind is about 40° on the other side of the bow, then straighten up and let her speed up before you point higher.",
  "mistake": "Turning too slowly, or straightening up while the bow still points into the wind: she stops head to wind (in irons) and will not steer.",
  "done": "You tacked with the autopilot and by hand. Keep the wheel over until the wind is well on the new side, then let her speed up.",
  "steps": {
    "tack-autopilot": { "goal": "Tack with the autopilot, then let her speed up to 4 knots.", "how": "In Autopilot, tap Tack. The autopilot turns her through the wind and holds the same angle on the other side. Wait until the speed on the strip reads 4 knots or more." },
    "tack-by-hand": { "goal": "Now tack back by hand: autopilot to Standby, wheel hard to port.", "how": "In Autopilot, tap Standby. In Ropes, set Wheel to −25° (to port: the wind now comes from port, so port is towards it) and keep it there while the bow crosses the wind." },
    "centre-wheel": { "goal": "When the wind is 35° on the new side, centre the wheel.", "how": "Watch the wind angle on the strip. When it reads about 35° from starboard, set Wheel to 0°. Centring earlier leaves her stuck head to wind." },
    "pick-up-speed": { "goal": "Sail close-hauled and let her speed up to 4 knots.", "how": "In Autopilot, tap Wind (it holds the angle she has now), then “10° to port” once, to about 45° from the wind. Both sails should read Good." }
  },
  "mistakes": {
    "in-irons": { "what": "She has stopped head to wind (in irons).", "why": "The turn was too slow, or the wheel came back to the centre before the bow was through the wind. With the wind straight ahead no sail works, and with no speed the rudder does nothing.", "fix": "Ease both sheets, put the wheel hard over and wait while she drifts back: the Getting out of irons exercise shows how." }
  }
},
"irons": {
  "title": "Getting out of irons",
  "summary": "She has stopped head to wind. Get her sailing again.",
  "see": "The bow points straight into the wind. Both sails flap, she has no speed and the wheel does nothing.",
  "happening": "With the wind straight ahead no sail can work (the no-go zone). The wind pushes her slowly backwards, and going backwards the rudder works the other way round: it turns the bow away from the wind.",
  "action": "Let both sheets out, put the wheel hard over and hold it while she drifts back. When the wind is about 40° on the bow, centre the wheel and sheet in.",
  "mistake": "Sheeting in hard, or waiting with the wheel in the middle: she stays head to wind.",
  "done": "She is sailing again. Going backwards the rudder turns the bow the other way: hold the wheel over and be patient.",
  "steps": {
    "ease-sheets": { "goal": "Let both sheets out to 40 % or more.", "how": "In Ropes, set Main sheet and Jib sheet to about 60 %." },
    "wheel-over": { "goal": "Put the wheel hard over and wait until the wind is 35° or more on the bow.", "how": "In Ropes, set Wheel to +30° and keep it there. She drifts backwards and the bow slowly falls away from the wind. This takes about a minute." },
    "sail-away": { "goal": "Centre the wheel, sheet in and sail away at 3 knots or more.", "how": "Set Wheel to 0°, Main sheet to about 12 % and Jib sheet to about 30 %. Both sails should read Good." }
  },
  "mistakes": {}
},
"gybing": {
  "title": "Gybing: controlled and accidental",
  "summary": "Turn the stern through the wind with the main hauled in, then see what an accidental gybe does.",
  "see": "You are on a run (the wind from behind) on starboard tack, with the main let right out.",
  "happening": "In a gybe the stern crosses the wind and the boom swings to the other side. With the main let out, the boom crosses the whole cockpit fast and stops with a bang. Hauled in first, it only moves a little.",
  "action": "Haul the main in until the boom is near the centre, turn until the wind is on the other side, then let the main out again.",
  "mistake": "Turning through the wind with the main still out, or steering past dead downwind without meaning to: the boom slams across (an accidental gybe). This boat has no preventer (a line that would hold the boom out).",
  "done": "A controlled gybe moves the boom a short way, slowly. An accidental one swings it across fast, with a big load on the main sheet and on anyone in its way. Haul in first.",
  "steps": {
    "haul-main": { "goal": "Haul the main in until the boom is near the centre.", "how": "In Ropes, set Main sheet to 5 %. The boom comes within 16° of the centre line." },
    "gybe": { "goal": "Gybe: turn until the wind is on the other side.", "how": "In Autopilot, tap Gybe (the Tack button reads Gybe on a run). She turns through the wind and the boom crosses a short way." },
    "ease-main": { "goal": "Let the main right out on the new side.", "how": "In Ropes, set Main sheet to 85 % or more." },
    "accidental": { "goal": "Now see an accidental gybe on purpose: turn 30° further from the wind, past dead downwind.", "how": "In Autopilot, tap Heading, then “10° to starboard” three times: she turns from 15° short of dead downwind to 15° past it. The wind gets behind the main from the wrong side and throws the boom across. Watch the gybe report: the boom’s speed and the load on the main sheet." }
  },
  "mistakes": {
    "accidental-gybe": { "what": "The boom crossed by itself (an accidental gybe).", "why": "The main was still out when the stern crossed the wind, or she was steered past dead downwind.", "fix": "Haul the main in before you gybe. On a run keep the wind on the side away from the boom: never sail by the lee." }
  }
}
```

(The Tack button reads "Gybe" when the wind is behind the beam: `autopilotPanel.ts` uses `autopilot.gybe` for `|twa| >= 90`.)

### 9.5 PHYSICS_TRUTHS

PT-58 (added by the planning PR to `docs/PHYSICS_TRUTHS.md`, "Phase 10 rules", source-checked against Wikipedia, *Jibe*): "**A controlled gybe starts with the main hauled in:** haul the main sheet in before the stern crosses the wind, so the boom only moves a short way, and ease it out once she is on the new tack. With the main left out the boom swings right across, fast, with a large load on the main sheet (PT-24)." The M69 PR fills in its test link (`tests/physicsTruths10.test.ts`).

### 9.6 Tests

`tests/physicsTruths10.test.ts`:

1. **PT-58:** `?wd=0&ws=12&hdg=195&ms=5&js=50&ap=wind&apt=165&sea=flat`, 15 s, `autopilot 'tack'`, 30 s → `rig.lastGybe` is not null, its `accidental` false and `peakRopeN` below **1,000 N** (prototype 0.4 kN); the same with `ms=100` → `accidental` true and `peakRopeN` above **2,000 N** (prototype 3.0 kN).

`tests/exerciseRun.test.ts` (good runs as 6.7 test 1, each from its start link and `start`; bands are the prototype's times plus a margin):

2. **PT-28 tacking good run:** (1) `autopilot 'tack'`; (2) `autopilot 'off'`, `setControls { ctl_rudder: -25 }`; (3) each frame, once `twaSignedDeg > 35` and the wheel is not 0, `setControls { ctl_rudder: 0 }`; (4) `autopilot 'wind'`, `autopilot { turnDeg: -10 }`. Steps within **90, 30, 75, 45 s** (prototype 57.3, 15.5, 47.7, 24.1); no mistake.
3. **Tacking, centred too early:** test 2's step 1, then step 2's actions, then `ctl_rudder 0` as soon as `|twaSignedDeg| < 5` → the `in-irons` mistake within **60 s** of centring (prototype: stuck at 10° from the wind, −1.0 kn).
4. **PT-35 irons good run:** (1) `{ ctl_mainsheet: 60, ctl_jib_sheet: 60 }`; (2) `{ ctl_rudder: 30 }`; (3) `{ ctl_rudder: 0, ctl_mainsheet: 12, ctl_jib_sheet: 30 }`. Steps within **5, 80, 50 s** (prototype 1.0, 52.9, 26.8). Named "PT-35 no speed, no steering: going backwards with the wheel over, the bow falls off".
5. **Irons without the wheel:** step 1's action, then 90 s with the wheel at 0 → still at step 1 (`wheel-over` not passed; prototype: she drifts straight back).
6. **Gybing good run:** (1) `{ ctl_mainsheet: 5 }`; (2) `autopilot 'tack'`; (3) `{ ctl_mainsheet: 100 }`; (4) `autopilot 'heading'`, `autopilot { turnDeg: 10 }` three times. Steps within **10, 30, 15, 35 s** (prototype 3.3, 16.3, 5.0, 16.0); no mistake (the step-4 gybe is outside the mistake's `steps`).
7. **Gybing with the main out:** in step 1, `autopilot 'tack'` without hauling in → the `accidental-gybe` mistake within **30 s**.

`tests/exercises.test.ts`: test 1 accepts `boomDeg` and `event` (and `event` only with one of the four events).

### 9.7 Browser checks (`scripts/shots-m69.mjs`, test clock)

Scenes: `exercise-tacking-setup`, `exercise-gybing-setup` (phone and desktop, `section: 'exercises'`).

Live (each from `?m=exercise&ex=<id>&debug=1`, Start, then the good run's actions with `__sailExercise.dispatch`):

1. **Tacking:** the line steps through 1/4 … 4/4 and the done card shows; in step 2, How? contains "Standby" and "−25°" (with the minus sign U+2212, as written in 9.4).
2. **Irons:** the good run reaches the done card; after step 2 the boat's `|twa|` is 35° or more.
3. **Gybing:** the good run reaches the done card (step 4 passes the frame the gybe comes); the gybe report (`gybe-report`) is visible in the alert stack at the same time as the done card (it shows for `physics.gybe.reportS`, 8 s).
4. **Gybing mistake:** a new run, `autopilot 'tack'` in step 1 → the mistake card names the accidental gybe.
5. The list shows the three new exercises under "Sailing skills" in the data order; `auditPage` with each setup card; Russian setup cards fit.

### 9.8 Done when

The three exercises work on a phone and a computer from their links; PT-58's test passes; earlier exercises unchanged; typecheck, lint, tests, build and `SHOTS_ONLY=m66,m67,m68,m69` pass, then CI.

### 9.9 Not in M69

A tack or gybe drill on time; tacking with a genoa on winches (this boat has a self-tacking jib).

### 9.10 Decided in the M69 PR

(empty)

---

## 10. M70: Gusts and too much wind

**Independent review: not needed** (data, texts and three check fields that read existing state; the rules they rest on are tested by Phase 2).

### 10.1 Files

New: `scripts/shots-m70.mjs`. Changed: `content/exercises/exercises.json` (two exercises), both `exercises.json` texts, `src/model/exercises.ts` (`gusts`, `mainOutPct`, `jibOutPct`), `src/app/exerciseRun.ts` (the gust counter), both `ui.json` (`exercise.group.wind`), `docs/review/ru.md`, `tests/exercises.test.ts`, `tests/exerciseRun.test.ts`, `scripts/shots.mjs`, `docs/CODE_MAP.md`.

### 10.2 Data (appended to `exercises`)

```json
{
  "id": "gusts", "group": "wind", "ropes": "easy", "crew": false,
  "start": "?wd=0&ws=15&hdg=300&ms=25&js=50&ap=wind&apt=60&sea=flat&wm=gusty&seed=1&wg=40",
  "steps": [
    { "id": "three-gusts", "opens": "ropes", "holdS": 0, "check": { "gusts": 3 } },
    { "id": "trim-back", "opens": "ropes", "holdS": 5, "check": { "twaDeg": [50, 70], "mainTrim": ["good"], "jibTrim": ["good"] } }
  ],
  "mistakes": [
    { "id": "overpowered", "serious": false, "on": { "alert": "overpowered" } },
    { "id": "round-up", "serious": false, "on": { "alert": "roundUp" } }
  ]
},
{
  "id": "reduce-sail", "group": "wind", "ropes": "easy", "crew": false,
  "start": "?wd=0&ws=22&hdg=300&ms=40&js=30&ap=wind&apt=60&sea=flat",
  "steps": [
    { "id": "jib-in", "opens": "ropes", "holdS": 2, "check": { "jibOutPct": [0, 45] } },
    { "id": "main-in", "opens": "ropes", "holdS": 2, "check": { "mainOutPct": [50, 65] } },
    { "id": "settle", "opens": "ropes", "holdS": 10, "check": { "mainOutPct": [50, 65], "jibOutPct": [0, 45], "mainTrim": ["good"], "heelDeg": [0, 20] } }
  ],
  "mistakes": [
    { "id": "overpowered", "serious": false, "on": { "alert": "overpowered" } },
    { "id": "round-up", "serious": false, "on": { "alert": "roundUp" } },
    { "id": "sail-worn", "serious": false, "on": { "alert": "sailWorn" } }
  ]
}
```

### 10.3 Model and app logic

- `checkPasses` gains `gusts`, `mainOutPct`, `jibOutPct` (4.4).
- **Gust counter** (`stepExercise`, every frame with `dt > 0`, before the mistakes): `mean = next.controls.ctl_wind_speed`; `rise = mean × (1 + gust.risePct / 100)`; `rearm = mean × (1 + gust.rearmPct / 100)`. If `gustArmed && next.wind.twsKn >= rise`: `gusts += 1`, `gustArmed = false`; else if `!gustArmed && next.wind.twsKn <= rearm`: `gustArmed = true`. `newRun` sets `gusts: 0`, `gustArmed: true`. `startRun` (the `start` command, in `exerciseRun.ts`), the frame a step passes and `restoreWaypoint` set `gusts = 0`, `gustArmed = wind.twsKn <= rearm` from the state they produce (a gust already blowing is not counted); `continue` changes neither. The strip's GUST badge shows from `windModes.gustBadgeFraction` (1.1 × the mean, 16.5 kn here); the counter counts only gusts that reach 1.2 × the mean (18 kn), so a weak gust shows GUST and is not counted: the step's text asks for three gusts, and the line's step does not change until the third strong one has come. `store.ts` needs no change (the start and Back code live in `exerciseRun.ts`).

### 10.4 Texts (appended)

```json
"gusts": {
  "title": "Gusts: ease the main",
  "summary": "Keep her upright through three gusts by easing the main.",
  "see": "You are on a close reach in 15 knots of wind with gusts. A gust shows on the water as a darker patch coming towards you.",
  "happening": "In a gust the wind is stronger for a few seconds: the sails push harder, she heels more and wants to turn into the wind (weather helm). Easing the main spills the extra wind.",
  "action": "When a gust hits, ease the main sheet by about 20 %; when it has passed, sheet in again.",
  "mistake": "Holding the main sheet tight in a gust: she heels past 25°, slows down and can turn into the wind by herself (a round-up).",
  "done": "Easing the main in a gust keeps her upright and steering. The dark patch on the water warns you a few seconds before it arrives.",
  "steps": {
    "three-gusts": { "goal": "Get through three gusts: ease the main in each one, sheet in after.", "how": "Watch the strip: GUST shows while a gust blows (from about 16.5 knots). In Ropes, set Main sheet to about 45 % when it shows, and back to about 25 % when it has gone. Three strong gusts take about two and a half minutes." },
    "trim-back": { "goal": "Trim both sails to Good.", "how": "Main sheet about 25 %, Jib sheet about 50 %. Both sails should read Good; ease the main again if a gust comes." }
  },
  "mistakes": {
    "overpowered": { "what": "She heeled too far (more than 25°).", "why": "The main sheet was too tight for the wind: the sails pushed harder than the keel could hold her upright.", "fix": "Ease the main sheet as soon as the gust hits; sheet in again when it has passed." },
    "round-up": { "what": "She turned into the wind by herself (a round-up).", "why": "Too much heel with a tight main: the rudder lost its grip and the sails turned her into the wind.", "fix": "Ease the main straight away and she comes back under control. In the next gust, ease earlier." }
  }
},
"reduce-sail": {
  "title": "Too much wind: roll the sails in",
  "summary": "In 22 knots, roll in part of the jib and the main until she sails upright.",
  "see": "22 knots of wind on a close reach. The main is eased until it flaps, to keep her upright; she heels about 20°.",
  "happening": "With full sails she heels too much in this wind. On this boat both sails roll up (the jib round the forestay, the main into the mast), so making them smaller takes a minute and nobody has to go on deck.",
  "action": "Ease the jib sheet and roll the jib in to about 40 %; roll the main in to about 60 %; then sheet the main in until it works.",
  "mistake": "Pulling the jib in with its sheet still tight: the jib will not roll. And sails left flapping in strong wind wear out quickly.",
  "done": "Smaller sails, less heel, and she sails almost as fast. Roll in early, before the wind gets up.",
  "steps": {
    "jib-in": { "goal": "Roll the jib in to 45 % or less: ease its sheet first.", "how": "In Ropes, set Jib sheet to 100 %, then Jib out to 40 %. Then set Jib sheet to about 75 % so the jib stops flapping. With the sheet tight the jib stops rolling." },
    "main-in": { "goal": "Roll the main in to between 50 and 65 %.", "how": "In Ropes, set Mainsail out to 60 %." },
    "settle": { "goal": "Sheet the main in until it reads Good, with less than 20° of heel.", "how": "In Ropes, set Main sheet to about 35 % and hold it for 10 seconds. (A partly rolled jib reads Stalled in the app at any sheet: leave its sheet at about 75 %.)" }
  },
  "mistakes": {
    "overpowered": { "what": "She heeled too far (more than 25°).", "why": "Too much sail for this wind, or the main sheet pulled in too far.", "fix": "Ease the main sheet now, then roll in more sail." },
    "round-up": { "what": "She turned into the wind by herself (a round-up).", "why": "Too much heel: the rudder lost its grip and the sails turned her into the wind.", "fix": "Ease the main straight away, then roll in more sail." },
    "sail-worn": { "what": "A sail is worn from flapping.", "why": "A sail left flapping (flogging) in strong wind wears out fast.", "fix": "Sheet the flapping sail in until it stops, or roll it in." }
  }
}
```

### 10.5 Strings

| Key | English |
|---|---|
| `exercise.group.wind` | Wind and weather |

### 10.6 Tests

`tests/exerciseRun.test.ts`:

1. **PT-25 gusts good run:** every frame, `ctl_mainsheet` 45 while `wind.twsKn > 16.5` (the GUST badge: 15 × `gustBadgeFraction`), else 25, in both steps (the prototype switched at 16.8 kn; easing earlier only lowers the heel). Step 1 passes between **130 and 160 s** (prototype 141.0; the gusts come at 35, 105, 141, 158 s with seed 1), step 2 within **20 s**; no mistake; the largest `|heelDeg|` stays below **24°** (prototype 22.5). Named "PT-25 heel grows with wind force: easing the main in the gusts keeps her under 25°".
2. **Gusts, sheet held:** `pauseOnMistake: false`, no actions for 240 s → at least one `overpowered` mistake, the first within **60 s** of Start (prototype 37 s); the largest heel above **30°** (prototype 36.6). A `round-up` is not asserted (at 15 kn the prototype had none).
3. **Gust counter** (built states): wind 15 → 18.1 (a gust: count 1) → 17.0 (still above 16.5: not re-armed) → 18.5 (no count) → 16.4 (re-armed) → 18.0 (count 2).
4. **reduce-sail good run:** (1) `{ ctl_jib_sheet: 100 }`, then `{ ctl_jib_furl: 40 }`; (2) `{ ctl_jib_sheet: 75, ctl_main_furl: 60 }`; (3) `{ ctl_mainsheet: 35 }`. Steps within **10, 10, 20 s** (prototype 2.9, 2.0, 10.0); the final `|heelDeg|` below **19.5°** (prototype 17.4); no mistake.
5. **PT-13 jib furling needs an eased sheet:** reduce-sail, `{ ctl_jib_furl: 40 }` with the sheet left at 30 %, 30 s → jib out (`100 × jibSolution.unfurled`) still **80 % or more** (prototype 88) and step 1 not passed.

### 10.7 Browser checks (`scripts/shots-m70.mjs`, test clock)

Scenes: `exercise-gusts-setup`, `exercise-reduce-setup` (phone and desktop).

Live:

1. **Gusts:** Start, drive the easing policy with `__sailExercise.dispatch` every 0.5 s of app time (reading `__sailExercise.read().twsKn`) → done card, no mistake row in the debrief.
2. **Gusts, held:** a new run with the box ticked, no actions → the mistake card "She heeled too far (more than 25°)." within 60 s of app time.
3. **reduce-sail:** the good run → done card; with the actions toggle on the debrief lists "Jib sheet: 30 → 100 %" and "Jib sheet: 100 → 75 %".
4. The list shows "Wind and weather" with both; `auditPage` with each setup card; Russian fits.

### 10.8 Done when

Both exercises work from their links on a phone and a computer; typecheck, lint, tests, build and `SHOTS_ONLY=m66,m67,m68,m69,m70` pass, then CI.

### 10.9 Not in M70

Scripted winds and the Adriatic winds (part 10c); reefing by slab (this boat furls).

### 10.10 Decided in the M70 PR

(empty)

---

## 11. M71: Setting and furling the sails, Alone or With crew (sign-off of part 10a)

**Independent review: required** (a new rule, PT-59; Pause blocked in a mode; Realistic gestures in the checks).

Owner, answer 8 (2026-10-30): **Alone** means Pause is off during the exercise, so you set the autopilot before you leave the wheel for a winch, as a single-hander does; **With crew** keeps Pause, so you can stop time and set up several people's work. You are at one station at a time in both (Realistic mode, as today). Answer 7: each exercise has its default ropes mode, and the learner can change it on the setup card.

### 11.1 Files

New: `scripts/shots-m71.mjs`. Changed: `content/exercises/exercises.json` (two exercises), both `exercises.json` texts, `src/model/exercises.ts` (`engine`), `src/app/exerciseRun.ts` (`exercisePauseBlocked`, the `crew` option), `src/app/store.ts` (`setPaused` blocked), `src/app/urlState.ts` (`exc`), `src/ui/exercisePanel.ts` (the crew choice), `src/ui/timeBar.ts` (Pause off while blocked), `src/style.css`, both `ui.json`, `docs/WORKFLOW.md` (ticks), `docs/review/ru.md`, `tests/exercises.test.ts`, `tests/exerciseRun.test.ts`, `tests/physicsTruths10.test.ts`, `tests/urlState.test.ts`, `docs/PHYSICS_TRUTHS.md` (PT-59's row exists since the planning PR, `to-verify`: the M71 PR adds the test file to its "How to see it"), `scripts/shots.mjs`, `docs/CODE_MAP.md`, `docs/ROADMAP.md` (part 10a done).

### 11.2 Data (appended to `exercises`)

```json
{
  "id": "set-sails", "group": "sails", "ropes": "realistic", "crew": true,
  "start": "?wd=0&ws=12&hdg=0&bs=0&ms=30&js=100&mf=0&jf=0&eng=1&lv=30&ap=hdg&apt=0&sea=flat&mode=realistic",
  "steps": [
    { "id": "head-to-wind", "opens": "engine", "holdS": 3, "check": { "twaDeg": [0, 20], "engine": { "running": true, "gear": "ahead" }, "speedKn": [0.5, 5] } },
    { "id": "main-out", "opens": "ropes", "holdS": 2, "check": { "mainOutPct": [90, 100] } },
    { "id": "bear-away", "opens": "autopilot", "holdS": 5, "check": { "twaDeg": [50, 75], "mainTrim": ["good"] } },
    { "id": "jib-out", "opens": "ropes", "holdS": 5, "check": { "jibOutPct": [90, 100], "jibTrim": ["good"] } },
    { "id": "engine-off", "opens": "engine", "holdS": 5, "check": { "engine": { "running": false }, "speedKn": [4, 99] } }
  ],
  "mistakes": [
    { "id": "main-off-wind", "serious": false, "steps": ["main-out"], "on": { "condition": { "twaDeg": [35, 180], "mainOutPct": [5, 95] }, "forS": 3 } },
    { "id": "winch-cut-out", "serious": false, "on": { "alert": "winchCutOut" } },
    { "id": "rope-slipping", "serious": false, "on": { "alert": "ropeSlipping" } },
    { "id": "clutch-on-running", "serious": false, "on": { "alert": "clutchOnRunning" } }
  ]
},
{
  "id": "furl-sails", "group": "sails", "ropes": "realistic", "crew": true,
  "start": "?wd=0&ws=12&hdg=300&ms=25&js=50&eng=0&ap=wind&apt=60&sea=flat&mode=realistic",
  "steps": [
    { "id": "engine-on", "opens": "engine", "holdS": 2, "check": { "engine": { "running": true, "gear": "neutral" } } },
    { "id": "jib-in", "opens": "ropes", "holdS": 2, "check": { "jibOutPct": [0, 5] } },
    { "id": "head-to-wind", "opens": "autopilot", "holdS": 3, "check": { "twaDeg": [0, 20], "engine": { "running": true, "gear": "ahead" }, "speedKn": [0.5, 99] } },
    { "id": "main-in", "opens": "ropes", "holdS": 2, "check": { "mainOutPct": [0, 5], "twaDeg": [0, 30] } }
  ],
  "mistakes": [
    { "id": "main-off-wind", "serious": false, "steps": ["main-in"], "on": { "condition": { "twaDeg": [35, 180], "mainOutPct": [5, 95] }, "forS": 3 } },
    { "id": "winch-cut-out", "serious": false, "on": { "alert": "winchCutOut" } },
    { "id": "rope-slipping", "serious": false, "on": { "alert": "ropeSlipping" } },
    { "id": "clutch-on-running", "serious": false, "on": { "alert": "clutchOnRunning" } }
  ]
}
```

The `opens` of these steps: `ropes` (the stations), `engine` and `autopilot` (in Realistic ropes "Show the controls" opens the Helm section for both, 6.5).

### 11.3 Model and app logic

- `checkPasses` gains `engine` (4.4).
- **Crew option** `{ options: { crew } }` (only in `setup`; on a def with `crew: false` it changes nothing). `exc=1` on such a def is ignored. With Easy ropes the option is kept but has no effect.
- `export function exercisePauseBlocked(state: AppState): boolean` = `state.exercise?.status === 'running' && state.exercise.options.crew === 'alone' && state.settings.ropesMode === 'realistic' && exerciseDef(state.exercise.id)?.crew === true`.
- `store.ts`: `setPaused { paused: true }` returns `state` while `exercisePauseBlocked(state)`; `paused: false` is allowed except in `mistake` and `failed`, where M67's rule (7.3) decides. The coach's own pause on a mistake (7.3) and the done card's pause still happen.

### 11.4 URL

`exc=1` (4.3): `crew: 'crew'`; written when the crew option is `crew`; parsed in the start and the waypoint form.

### 11.5 UI

- **Setup card:** for a def with `crew: true` and Realistic ropes chosen, a row **Crew** (`t('exercise.crew')`) with two toggle buttons `exercise-crew-alone`, `exercise-crew-crew` (`aria-pressed`, `t('exercise.crew.alone')`, `t('exercise.crew.crew')`) and `t('exercise.crew.hint')`. With Easy ropes the row is hidden (and the option has no effect).
- **Time bar** (`timeBar.ts`, importing `exercisePauseBlocked` from `src/app/exerciseRun.ts`; its refresh key gains `blocked`): while `exercisePauseBlocked(state) && !state.paused`, the Pause button is `disabled` with the accessible name and title `t('exercise.alonePause')`. Its `title` and `aria-label` go back to the usual `pause.pauseAria` / `pause.resumeAria` when it is enabled again. While the run is `running` and paused (a load or a waypoint link keeps time still until Start, which unpauses) it is the Resume button and enabled. In `mistake` and `failed` it is disabled by M67's rule (the card's buttons decide). The speed-up buttons stay as they are.
- **Step card:** while blocked, `<p class="hint" data-testid="exercise-alone-note">` `t('exercise.aloneNote')` under the goal.

### 11.6 Texts and strings

```json
"set-sails": {
  "title": "Setting the sails",
  "summary": "Motor head to wind, roll the main out, bear away, roll the jib out and stop the engine.",
  "see": "You are motoring slowly with both sails rolled up and the bow pointing into the wind. The ropes are Realistic: clutches and winches, as on the boat.",
  "happening": "The main rolls out of the mast. With the bow into the wind it comes out without filling, so it is easy to winch. Once it is out, turning away from the wind fills it. The jib unrolls round the forestay as its sheet is pulled.",
  "action": "Keep her head to wind with the engine slow ahead; roll the main out; bear away to a close reach; roll the jib out with its sheet; stop the engine.",
  "mistake": "Rolling the main out with the wind on the side: the half-unrolled sail fills and loads the furling gear. Or holding a winch button after the sail is out: the winch cuts out.",
  "done": "The sails are set and the engine is off. The main comes out head to wind; then bear away and set the jib.",
  "steps": {
    "head-to-wind": { "goal": "Motor slowly with the bow into the wind (within 20°).", "how": "The engine runs slow ahead and the autopilot holds the heading. Nothing to do yet: watch the wind angle on the strip." },
    "main-out": { "goal": "Roll the main out (90 % or more) while the bow points into the wind.", "how": "Go to the starboard station. Open the left “Main furling” clutch (the line that rolls the sail in) so it can run out. Put the right “Main furling” line on the winch: three turns, into the self-tailer, then hold the winch button. Let go when the main is out." },
    "bear-away": { "goal": "Turn to a close reach (50–75° from the wind) with the main reading Good.", "how": "Close the left “Main furling” clutch and take the line off the winch. In the Helm section, set the autopilot to Wind and tap “10° to port” six times. The main sheet at 30 % is about right." },
    "jib-out": { "goal": "Roll the jib out and sheet it to Good.", "how": "At the port station, open the JIB ROLL clutch. At the starboard station, put the Genoa sheet on the winch (three turns, self-tailer) and hold the button: the jib unrolls as the sheet comes in. Let go when the jib reads Good. Close JIB ROLL when the jib has stopped moving." },
    "engine-off": { "goal": "Stop the engine and sail at 4 knots or more.", "how": "In the Helm section, put the engine lever in neutral, then tap Stop." }
  },
  "mistakes": {
    "main-off-wind": { "what": "The main was rolled out with the wind on the side.", "why": "With the bow 35° or more off the wind, the half-unrolled sail fills and loads the furling gear and the mast.", "fix": "Stop winching, turn back into the wind (within 20°), then roll it out the rest of the way." },
    "winch-cut-out": { "what": "The winch cut out.", "why": "The button was held after the rope had stopped (the sail was fully out or in, or a clutch held the other line), or the load was too high.", "fix": "Let go of the button when the sail is out. Check that the line on the other side is free to run." },
    "rope-slipping": { "what": "A rope slipped on the winch drum.", "why": "Too few turns on the winch for the load.", "fix": "Add a turn on the winch." },
    "clutch-on-running": { "what": "A clutch was closed on a running rope.", "why": "The rope was still moving under load, and the clutch can damage it.", "fix": "Let the rope stop first (let go of the button), then close the clutch." }
  }
},
"furl-sails": {
  "title": "Furling the sails",
  "summary": "Start the engine, roll the jib in, turn head to wind and roll the main in.",
  "see": "You are sailing on a close reach with both sails out and the engine off. The ropes are Realistic.",
  "happening": "Rolling up is setting in reverse. The jib rolls round the forestay when its furling line is pulled and its sheet is free. The main rolls into the mast best with the bow into the wind, when it carries no load.",
  "action": "Start the engine and leave it in neutral; free the jib sheet and winch the jib furling line in; motor slowly head to wind; free the outhaul and the main's “out” line, then winch its “in” line.",
  "mistake": "Pulling a furling line while the sheet or the outhaul still holds the sail: it will not roll, and the winch strains or cuts out.",
  "done": "Both sails are rolled up and you are motoring. Jib first, then the main head to wind.",
  "steps": {
    "engine-on": { "goal": "Start the engine and leave it in neutral.", "how": "In the Helm section, tap Start. Leave the lever in the middle (neutral)." },
    "jib-in": { "goal": "Roll the jib in completely (5 % or less).", "how": "At the starboard station, open the Genoa sheet clutch so the sheet can run. At the port station, put JIB ROLL on the winch (three turns, self-tailer) and hold the button until the jib is rolled up." },
    "head-to-wind": { "goal": "Motor slow ahead and turn the bow into the wind (within 20°).", "how": "Put the engine lever slow ahead (about 30 %). Set the autopilot to Heading and tap “10° to starboard” six times." },
    "main-in": { "goal": "Roll the main into the mast (5 % or less) with the bow into the wind.", "how": "Take JIB ROLL off the port winch and open the Main outhaul clutch there. At the starboard station, open the right “Main furling” clutch (the line that lets the sail out), put the left “Main furling” line on the winch (three turns, self-tailer) and hold the button until the main is in." }
  },
  "mistakes": {
    "main-off-wind": { "what": "The main was rolled in with the wind on the side.", "why": "With the bow 35° or more off the wind the sail is loaded while it rolls, which strains the furling gear and can crease the sail inside the mast.", "fix": "Stop winching, turn back into the wind (within 20°), then roll it in the rest of the way." },
    "winch-cut-out": { "what": "The winch cut out.", "why": "The button was held after the rope had stopped, or the sheet or outhaul still held the sail.", "fix": "Let go of the button; free the sheet or the outhaul, then winch again." },
    "rope-slipping": { "what": "A rope slipped on the winch drum.", "why": "Too few turns on the winch for the load.", "fix": "Add a turn on the winch." },
    "clutch-on-running": { "what": "A clutch was closed on a running rope.", "why": "The rope was still moving under load, and the clutch can damage it.", "fix": "Let the rope stop first, then close the clutch." }
  }
}
```

| Key | English |
|---|---|
| `exercise.group.sails` | Setting and furling the sails |
| `exercise.crew` | Crew |
| `exercise.crew.alone` | Alone |
| `exercise.crew.crew` | With crew |
| `exercise.crew.hint` | Alone: no Pause, so set the autopilot before you leave the wheel. With crew: Pause stops time while you set up several people's work. |
| `exercise.alonePause` | Alone: no Pause in this exercise |
| `exercise.aloneNote` | Alone: one station at a time and no Pause. The autopilot steers while you work the ropes. |

### 11.7 Tests

Realistic gestures are `{ type: 'realistic', action }` with the winches `winch_primary_starboard` (W) and `winch_primary_port` (P); "on the winch" means `onWinch key`, `turn +1` three times, `selfTailer into`.

`tests/exerciseRun.test.ts`:

1. **PT-12 set-sails good run (Realistic, alone, `{ options: { pauseOnMistake: false } }` in setup, so a rope warning does not stop the script):** (1) nothing; (2) `station starboard`, `clutch a2 open`, `a3` on W, `button W held`; each frame, once `ctl_main_furl >= 99`, `button W released`; (3) once `ctl_main_furl` is 100 or 5 s of step 3 have passed: `clutch a2 closed`, `offWinch W`, `autopilot 'wind'` (it takes the angle she has, about 0°), `turnDeg −10` six times in the same frame (target 60°, starboard tack); (4) `station port`, `clutch r1 open`, `station starboard`, `a5` on W, `button W held`; each frame, once `ctl_jib_sheet < 50`, `button W released`; (5) `engine { leverPct: 0 }`, `engine 'stop'`. Steps within **15, 40, 60, 80, 10 s** (prototype 7.7, 20.3, 31.2, 45.8, 5.0); no `main-off-wind`. The script leaves JIB ROLL open (closing it is in the text, not in the test). Rope warnings (`winch-cut-out`, `clutch-on-running`) may come from the script's timing: the test lists them in its name's comment and the PR says how many; if a cleaner order of the same gestures avoids them, use it and record it under 11.10.
2. **furl-sails good run** (`pauseOnMistake: false` as test 1): (1) `engine 'start'`; (2) `station starboard`, `clutch a5 open`, `station port`, `r1` on P, `button P held`; each frame, once `jibSolution.unfurled <= 0.01`, release; (3) `engine { leverPct: 30 }`, `autopilot 'heading'`, `turnDeg +10` six times; (4) `offWinch P`, `clutch b3 open`, `station starboard`, `clutch a3 open`, `a2` on W, `button W held`; each frame, once `ctl_main_furl <= 1`, release. Steps within **5, 60, 30, 45 s** (prototype 2.0, 31.2, 13.8, 21.4); no `main-off-wind`.
3. **Alone blocks Pause:** set-sails, Realistic, alone, `start` → `setPaused true` returns the same state; `exercisePauseBlocked` true; after a mistake (a built `winchCutOut` entry passed to `stepExercise`, as M67 test 3 builds entries: status `mistake`, paused by the coach) → false; `continue` → true again. **With crew** (`{ options: { crew: 'crew' } }` in setup) → `setPaused true` pauses. In Easy ropes (`{ ropes: 'easy' }`) → never blocked.

`tests/physicsTruths10.test.ts`:

4. **PT-59** (named "PT-59 roll the main out head to wind: rolling it out 60° off the wind is reported"): set-sails, Realistic, `start`; once step 1 has passed, `turnDeg −60` (the autopilot is already on Heading), 20 s (about 60° from the wind), then step 2's gestures → the `main-off-wind` mistake within **10 s** of the button.

`tests/urlState.test.ts`: `exc=1` round-trips in the start and the waypoint form; `?m=exercise&ex=set-sails&mode=easy` opens set-sails with Easy ropes.

### 11.8 Browser checks (`scripts/shots-m71.mjs`, test clock)

Scenes: `exercise-set-sails-setup` (phone and desktop; the crew row shown).

Live:

1. **Setup:** `?m=exercise&ex=set-sails` → `exercise-ropes-realistic` and `exercise-crew-alone` pressed; tap `exercise-ropes-easy` → the crew row is hidden; tap Realistic again → it is back.
2. **Alone:** Start → the time bar's Pause is disabled with "Alone: no Pause in this exercise"; `exercise-alone-note` shows.
3. **Good run:** test 1's gestures through `__sailExercise.dispatch` → the done card; the debrief (actions on) lists "Opened the clutch: Main furling".
4. **With crew:** a new run with `exercise-crew-crew` → Pause works and stops app time.
5. **furl-sails:** test 2's gestures → done card.
6. The list shows "Setting and furling the sails" with both; `auditPage` with each setup card; Russian fits.

### 11.9 Done when, and sign-off of part 10a

Both exercises work from their links on a phone and a computer, Alone and With crew; typecheck, lint, tests, build and `SHOTS_ONLY=m66,m67,m68,m69,m70,m71` pass, then CI; every item of section 12 is ticked in the PR; ROADMAP's Phase 10 row says "10a done, 10b and 10c planned".

### 11.10 Decided in the M71 PR

(empty)

---

## 12. Definition of Done (part 10a)

- [ ] Exercises mode, the list, the setup card, the step line, How?, the done card and the tick work on a 390 × 844 phone and a 1,440 × 900 computer (M66).
- [ ] Mistakes pause (or flash) with what went wrong, why and what to do; Back to the last waypoint; waypoint links open at their step (M67).
- [ ] The debrief shows the steps, the boat's events, the mistakes and the actions just before each (M68).
- [ ] The eight exercises (points-of-sail, tacking, irons, gybing, gusts, reduce-sail, set-sails, furl-sails) each pass their good-run test and work from their links (M66–M71).
- [ ] Alone blocks Pause in the Realistic exercises; With crew does not (M71).
- [ ] PT-58 and PT-59 have tests named after them; every earlier PHYSICS_TRUTHS test passes.
- [ ] Old links open as before; outside Exercises mode nothing changed.
- [ ] Every new string is in both `ui.json` files; both `exercises.json` files have every key; the Russian review document is regenerated.
- [ ] `docs/CODE_MAP.md`, `docs/WORKFLOW.md` (the checklists ticked on the phone) and `docs/ROADMAP.md` are up to date.

## 13. Decisions and open questions

### 13.1 Owner's answers (planning chat, 2026-10-30)

1. Phase 10 in three parts: 10a coach and sailing exercises, 10b harbour and anchor (with a more detailed marina and harbour design), 10c wind and clock. **Owner: yes**, and 10b gets a more detailed marina and harbour.
2. Guidance: a step card that ticks itself off, with a "How?" button. **Owner: agree.**
3. Mistakes: **owner:** a setting at the start to pause on a mistake, to read the guidance; waypoints, and while paused after a mistake a jump back to the last waypoint reached (this covers Try again). Serious mistakes (a hard hit, running aground, a torn sail) stop the exercise.
4. No points: a tick and the best time on this device. **Owner: yes.**
5. Conditions locked during an exercise; Exercises is a mode of its own with its own setup. **Owner: agree.**
6. An exercise's link starts it from the beginning; **owner: yes, and waypoint links too.**
7. Each exercise sets Easy or Realistic ropes; **owner: yes, and the learner can change it on the setup card.**
8. Alone = no Pause; With crew = Pause. **Owner: yes.**
9. The current step as a line at the top of the 3D view, opening the card. **Owner: yes.**
10. Man overboard, alongside with springs, sailing onto an anchor: later ("Ideas"). **Owner: yes.**

### 13.2 Recommended (merging the planning PR accepts them)

- **Pause on mistakes is ticked by default** (recommended; merging accepts it): a beginner reads the explanation first; an experienced learner unticks it.
- **A waypoint link starts with the boat exactly as at that waypoint, but with no history before it** (recommended; merging accepts it): a link carries a state, not a log, so its debrief starts at that step.
- **Back keeps the alert history and the debrief log** (recommended; merging accepts it): the debrief then shows the mistake and the way back, which is what the learner should see.
- **Leaving Exercises mode ends the exercise** (recommended; merging accepts it): Learn and the camera work inside Exercises mode, so there is no need to leave it mid-exercise; "Show it working" (which loads a scene) is hidden during a run.
- **Part 10a has no serious mistakes in its data** (recommended; merging accepts it): the serious ones (a hard hit, running aground) belong to the harbour exercises of part 10b; a torn sail needs minutes of flogging and is caught earlier as "sail worn".
- **The checks follow the model as it is** (recommended; merging accepts it): the self-tacking jib reads "stalled" on reaches, the main reads "stalled" from about 120° to 150° even fully eased, a partly rolled jib never reads "Good" (3.5). The exercises check the sheets there, and the texts say why. Changing the trim model is a separate question for later.
- **Part 10b outline** (one line each, planned with `/plan 10b`): a more detailed marina and harbour (owner); leaving the berth (stern-to, lazy line and stern lines off, prop walk); entering and mooring stern-to with traffic levels and fenders; turning in the boat's own length; picking up and leaving a mooring buoy; anchoring in the bay with a line to the shore; stern-to with the anchor; serious mistakes (a hard hit, running aground, a line round the propeller).
- **Part 10c outline:** scripted wind; the Adriatic winds (Maestral, Bura, Jugo; sources needed); each exercise's own start date and time; the night time-lapse test for the bay anchoring; the Exercises list grouped by place.

### 13.3 Known limitations (part 10a)

- In Easy ropes the main rolls out in about two seconds (the rig's 0.4 s lag), too fast for the 3-second `main-off-wind` rule: in Easy, a single jump of "Mainsail out" off the wind is not caught. Realistic ropes catch it.
- The "How?" texts are written for the exercise's default ropes mode (Easy for the sailing exercises, Realistic for setting and furling). With the other mode chosen on the setup card the checks work the same, but a text such as "In Ropes, tap − on Main sheet" describes the other mode's controls (recommended; merging accepts it: one text per step keeps the texts short; texts per mode can come later if the owner wants them).
- The exercises have no target marks in 3D; the strip's wind angle is the guide.
