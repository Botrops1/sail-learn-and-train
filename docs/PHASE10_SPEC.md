# Phase 10 specification: exercises (part 10a: the coach and the first sailing exercises; part 10b: harbour and anchor; part 10c: wind and clock)

Status: **part 10a done (M66–M72); part 10b done (M73–M78); part 10c planned (M94–M98, sections 23–30)** · Last updated: 2026-11-09

Read [`ROADMAP.md`](ROADMAP.md) first, then this file. Phase 10 builds on everything the app already does: the sailing model of Phase 2 (`src/model/motion.ts`, `trim.ts`, `gybe.ts`, `autopilot.ts`, `windModes.ts`), Realistic mode (`src/model/realistic.ts`), the modes and sections of Phase 5 (`src/app/appMode.ts`, `src/ui/modes.ts`, `src/ui/panel.ts`), the harbour of Phase 7, the alert history of M36 and M55 (`src/model/alerts.ts`), and the link (`src/app/urlState.ts`). The catalogue of exercises and failure modes is [`EXERCISES.md`](EXERCISES.md); the owner's answers are in the ROADMAP decisions log (2026-10-30, "Phase 10 plan").

**Phase 10 has three parts** (owner, planning chat 2026-10-30): **10a** (this spec, M66–M71): the exercise coach and the first sailing exercises; **10b**: harbour and anchor exercises, with a more detailed marina and harbour design (planned with `/plan 10b`); **10c**: wind and clock (scripted wind, the Adriatic winds, each exercise's start time, the night time-lapse of the bay anchoring; `/plan 10c`). Parts 10b and 10c add their milestone sections to this file and bring sections 0–5 up to date. **Part 10b** (planned 2026-11-02) is sections 15–22; its additions to sections 0–5 are marked **(10b)**. **Part 10c** (planned 2026-11-09) is sections 23–30: its shared design is section 23, which every part-10c builder reads after sections 0–5; its pointers in sections 0–5 are marked **(10c)**.

## 0. How to use this spec (for the coding agent)

- Do **one milestone** (sections 6–11), on the branch your session gives you, in one PR titled `M<N>: <name>`. Read sections 0–5 first every time; they apply to all milestones. Then read only your milestone's section. Milestones are built in order (M66 → M67 → … → M71); each needs the ones before it merged. **(10b)** Part 10b: M73 → M74 → … → M78 (sections 15–20), after M72; then section 21. **(10c)** Part 10c: read sections 0–5, then section 23, then your milestone's (24–28); M94 → M98, after M93; then section 29.
- Build order inside a milestone: data → pure helpers + tests → store/URL → UI → browser checks → docs.
- **Numbers are final.** Every band and threshold here was prototyped on 2026-10-30 against the real model (3.5 says how). Exercise numbers live in `content/exercises/exercises.json`; presentation numbers in the CSS. A number marked **tunable** may be changed only if a check fails after you have checked your code against 3.4 "common mistakes": change it, report before and after in the PR, and never widen a test band. A band that still fails is a question for the owner in the PR.
- **Text is data.** Every English string in this spec is final: copy it exactly. Russian strings are AI drafts (CLAUDE.md): write them yourself following PHASE4_SPEC 3.3, mark them `draft` (`ui.json` keys need nothing more; `content/lang/ru/exercises.json` carries `"$status": "draft"`), and run `npm run review-doc -- ru` after any change to `content/lang/ru/*.json` (the review document lists `ui.json` and the glossary; exercises join it in M66, 6.6).
- **Signatures, test ids, CSS classes.** Function names, signatures, `data-testid`s and classes named here are required, so milestones fit together and the browser checks find things. Keep them; add private helpers freely.
- **Write back.** If you decide something this spec leaves open, write it into your milestone's section under "Decided in the M<N> PR".
- **Everything earlier keeps working.** Every unit test stays green, every PHYSICS_TRUTHS test passes, every old link opens the same boat, wind, place and camera. Outside Exercises mode nothing changes.
- **No sailing physics changes in this phase.** No formula of `src/model` that moves the boat, the rig or the ropes changes. **(10b)** Two exceptions, both in M73 and both owner answers (22.1): the marina's and the bay's obstacles and bottom act wherever the boat is near them (`solidAround`, 15.3), and touches of the same obstacle with the same part within 3 s are one damage report (15.3). A third, added by the refresh before M75 (owner request, 16.9a): on the Hard level the moored yachts' bow lines foul our propeller when it is over one in gear and make a report when our keel or rudder is over one (17.4). No force formula changes. **(10c)** Part 10c changes the wind (an input: local and scripted winds) and runs a time-lapse frame as slices no longer than today's longest step (23.2); no formula that moves the boat, the rig, the ropes or the anchor changes. The exercises only **read** the state the model already makes; where the model shows something a sailor would not expect, the exercise works with it and the PR names it (3.5 lists what the prototype found).
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

### In scope (part 10b) **(10b)**

1. **A more detailed marina, solid from everywhere** (M73): breakwater with an entrance and its lights, quay furniture, buildings, pontoon floats, detailed yachts drawn in batches; the marina and the bay act from every place; one damage report per bump.
2. **The harbour coach and Leaving the berth** (M74): checks on where the boat is, the lines, the fenders and the anchor; targets drawn in 3D and on the maps; contact mistakes (serious ones end the run); a Level row (`exl`); harbour actions in the debrief.
3. **Entering the berth stern-to** (M75), **Turning in her own length** and **Picking up a mooring buoy** (M76), **Anchoring with a line ashore** (M77), **Stern-to on your own anchor** and the sign-off (M78).

### Out of scope (part 10b) **(10b)**

Moving boats (owner, answer 3: Ideas); wider tight berths (22.2); exercises that start outside the harbour; man overboard, alongside with springs, sailing onto an anchor or a buoy (Ideas); the wind changing over the night, an exercise's own start time (part 10c); texts per ropes mode (13.3); a boat hook in 3D.

### In and out of scope (part 10c) **(10c)**

Section 23.2.

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
| Map **(10b)** | Positions are map metres: `eastM` (+ east), `northM` (+ north); a heading is degrees clockwise from north (090 = east). A boat with heading 180 points south, so in our berth (heading 180) her stern is to the north, at the quay. |
| Boat points **(10b)** | `boatPoint(boat, 'bow' | 'stern' | 'centre')` (16.3): bow x = `transomX + loa` = 6.95 m, stern x = `transomX` = −8.6 m, centre = the boat's origin; a point at boat x is `(eastM + x·sin h, northM + x·cos h)`. |
| Heading checks **(10b)** | `headingDeg: { to, within }` holds when `Math.abs(wrap180(heading − to)) ≤ within`. |
| Thrusters and lever **(10b)** | Thruster `+1` pushes that end to starboard, `−1` to port (`thrusters.ts`). The engine lever is −100 … 100, neutral within ±10 (`neutralBandPct`); 15 is slow ahead (idle in gear, about 3.3 kn when she gets going). |
| Lever in texts **(10b)** | The Engine section shows the lever as a slider with Astern, Neutral and Ahead and the gear in words, not a percentage, and its − / + move it by the step size (1 or 5 %); so the How texts name positions ("just past Neutral towards Ahead" = the pilots' 15, "about 40 % of the way towards Astern" = −40), never a number of taps. |
| Levels **(10b)** | `easy` (the def's `start`), `normal`, `hard` (`levels`, replacing start keys); in the link as `exl`. |

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
| `solidAround` **(10b)** | `src/model/places.ts` (M73) | `solidAround(place, eastM, northM, geometry, areaData?, data?): { marina: boolean; bay: boolean }` | Which surroundings act this frame (15.3). |
| `stepContact` merge **(10b)** | `src/model/contact.ts` (M73) | as today; `ContactState.lastTouchS` | One report per obstacle and part within `mergeS` (15.3). |
| `boatPoint`, `obstacleKind`, `resolveTarget`, `insideTarget` **(10b)** | `src/model/exercises.ts` (M74) | 16.3 | Boat points, the kind of a report's obstacle, targets as shapes. |
| `bowLines`, `bowLinesUnder`, `bowLineHits` **(10b)** | `src/model/marina.ts` (M75) | 17.4 | The moored yachts' bow lines on the map, the parts of our hull over one, and those as contact hits. |
| `shownTarget` **(10b)** | `src/app/exerciseRun.ts` (M74) | `shownTarget(state: AppState): ResolvedTarget \| null` | The outline drawn for the current step (16.3). |
| Part 10c's helpers **(10c)** | 23.4 | | `smoothstep`, `isClockWind`, `isLocalWind`, `sizeRange` (local winds), `localWindMean`, `scriptMean`, `windMean`, `trueWind`, `localHourOf`, `timeLapseAvailable`, `isTimeLapseScale`, `stepSpeedUp`, `applyStepSpeed`. |
| Pilots **(10b)** | `tests/harbourPilot.ts` (M74–M78) | `leavePilot(level)`, `enterPilot(level)`, `turnPilot()`, `buoyPilot()`, `anchorPilot()`, `sternAnchorPilot()` → `(s, t) => AppState` | The scripted good runs of the tests (16.7). |

### 3.3 Sources

The exercises follow the beginner syllabus topics named in ROADMAP Phase 10 (RYA Competent Crew, ASA 101): points of sail and sail trim, tacking, gybing (controlled and accidental), getting out of irons, gusts, reducing sail, setting and stowing sails. Every sailing statement in the exercise texts rests on a PHYSICS_TRUTHS rule: PT-21 (no-go zone, irons), PT-22 (easing as you bear away), PT-23 (stall), PT-24 and PT-26 (accidental gybe), PT-25, PT-29 and PT-32 (heel, easing, round-up), PT-28 (self-tacking jib), PT-13 (jib furling needs an eased sheet), PT-12 (in-mast furling), PT-35 (no speed, no steering; astern the rudder works the other way), PT-38 (flogging), PT-45 (a gust shows on the water). Two new rules come with this part, added to `docs/PHYSICS_TRUTHS.md` ("Phase 10 rules") by the planning PR: **PT-58** (M69: haul the main in before a gybe; source-checked, Wikipedia *Jibe*) and **PT-59** (M71: roll an in-mast main in and out with the bow close to the wind; `to-verify`, the candidate Seldén manual does not open from the build environment). The milestone PRs add their tests and test links.

**(10b)** Part 10b's exercises test PT-50, PT-51, PT-52 (M75), PT-27, PT-48, PT-33 (M76), PT-31, PT-53, PT-57 (M77), PT-31 and PT-51 (M78) through their good runs. Two new rules, added by the 10b planning PR: **PT-61** (M73: coming in from the sea, the red entrance light is on the left; source-checked, Wikipedia *Lateral mark* [44]) and **PT-62** (M76: pick up a mooring buoy heading into the wind, slowly, at the bow; `to-verify`, rya.org.uk and boatsafe.com do not open from the build environment, 2026-11-02).

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
- **(10b) Stop fully before the lines.** A boat still drifting astern at 0.1 m/s reaches the quay during the lazy line's 20 s walk (prototype: a 0.25 m/s bump). The pilots stop her (`|speed| < 0.03 m/s`, lever 0) before taking the stern lines.
- **(10b) Never in gear while a line is slack or the crew is handling one** (PT-52, `stepLines`): `crew !== null` counts as slack, so the engine stays in neutral during the lazy line's walk and the shore line's swim.
- **(10b) Pay the chain out as she backs.** Letting out a fixed amount and backing makes it either heap up or hold her (the anchor drags behind). The stern-to pilot pays out while `chainOutM < hypot(horizontal distance, depth + roller) + 4`.
- **(10b) The tight berths fit this boat exactly** (4.9 m for a 4.9 m beam): with neighbours on both sides she is wedged. No exercise uses tight berths (22.2).
- **(10b) Downwind she glides.** With the wind behind her, slow astern does not stop her: in the west wind of Entering the berth she needs the lever a third astern (−30), started 18 m before the berth (17.5; the first pilot, slow astern from 10 m, slid 21 m past and backed into the neighbour).
- **(10b) The bow lines count on Hard only** and only through `bowLinesUnder` (17.4): no force, no obstacle polygon. Easy and Normal draw them and nothing else.
- **(10b) `fender` is a severity, not a mistake.** A report with `severity: 'fender'` never matches a trigger with `severity` given (the lists of 16.2 never contain it). The obstacle kind `fender` (a torn-off fender's report) is not in any list either.
- **(10b) Mistake texts:** each exercise's `mistakes` object needs the texts of every mistake id its data lists (16.6's table plus its own); the loader check fails otherwise.

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

**(10b) Part 10b's numbers** (2026-11-02; measured again on 2026-11-03 by the refresh, 22.4, because the `wd=270` of the marina and buoy links had been dropped and those runs had the wind from 60°): a throwaway Vitest file opened each start link with `parseUrlState`, stepped `reduce(state, { type: 'step', dt: 0.05 })`, ran the scripted learner that `tests/harbourPilot.ts` writes down (16.7 and each milestone's pilot), and evaluated the new check fields exactly as 16.3 says. App seconds per step:

| Exercise | Steps (seconds) | Total | Contacts other than `fender` |
|---|---|---|---|
| leave-berth easy / normal / hard | 1.0, 1.0, 34.2, 25.1 / 1.0, 1.0, 33.6, 25.2 / 1.0, 1.0, 24.8, 23.1 | 61 / 61 / 50 | none |
| enter-berth easy / normal / hard | 1.0, 182.7, 12.9, 1.3, 20.0, 27.1 / 1.0, 109.9, 75.9, 1.2, 20.0, 37.1 / 1.0, 80.5, 118.7, 1.0, 20.0, 7.7 | 245 / 245 / 229 | none |
| turn-own-length | 17.2, 34.2 (centre at most 5.0 m from the start) | 51 | none |
| mooring-buoy | 100.8, 1.0, 10.0, 1.0, 66.2 | 179 | none |
| anchor-shore | 76.9, 24.2, 70.1, 41.1, 59.1, 78.0 (chain 61.2 m, set) | 349 | none |
| stern-to-anchor | 56.6, 14.5, 154.5, 1.0, 18.0 (chain 41.1 m, set) | 245 | none |

What the prototype found (each is built around, and named in its PR):

- **Tight berths wedge her** (3.4): leaving `ml=tight&tr=busy` failed at every throttle and wind tried (10–16 kn, lever 15 and 30).
- **Leaving with the stern lines and thrusters:** turning before the stern is clear of the neighbours' bows swings the stern into them; stopping with the stern past them (north < 1484) and spinning with both thrusters is clean at all three levels. In 14 kn at Hard she needs lever 30 to leave the berth.
- **Back-and-filling without thrusters** (short bursts ahead and astern, wheel hard over) turned her only about 25–45° in two cycles; longer bursts drifted her 30 m onto the south row. M76 uses the bursts for the first 30° and the thrusters for the rest (22.3).
- **Anchoring:** dropping at (−1600, 0) and paying out 62 m before setting ran the stern aground near the shore (a `hit` on the bottom); setting at the scope (47 m) with lever −40, then paying out to about 61 m, is clean. The scope at (−1600, 0) with 6 kn: `scopeNeededM(10.0, 6)` = 47.2 m.
- **The breakwater, the contact merge and the solid open water** were not prototyped (they do not exist yet); their tests (15.7) use hand-made inputs and the geometry formulas of 15.3, whose values are worked out there.

### 3.6 Browser-check conventions (every milestone)

- Each milestone has `scripts/shots-m<N>.mjs`, registered in `scripts/shots.mjs` (import, `SCENES`, `liveGroups`) with names written without the prefix, as Phases 5–9.
- **What `openPage` adds:** Phase 10 labels (`m66` … `m71`) are treated like Phase 9 ones. The M66 PR replaces `6[0-5]` with `6\d|7[01]` in each of the five regular expressions of `openPage` that contain it (`scripts/shots.mjs`: the `held`, `sea`, `clock` and `mm` defaults and the "older checks open Ropes" rule).
- **Test clock** for every live check that waits for app time (CLAUDE.md): `openPage(viewport, label, query, { testClock: true })`; wait with `page.waitForTimeout`, never `waitForFunction`.
- **Driving an exercise:** with `debug=1`, `app.ts` exposes `window.__sailExercise = { dispatch(action), state(), read() }` (M66, 6.5): `dispatch` is `store.dispatch`, `state` returns the run (waypoints as a count), `read` the boat's numbers. Checks use it for the boat-handling actions of a good run (rope values, autopilot, engine, Realistic gestures) and tap the exercise's own buttons (Start, How?, Carry on, Back, Stop) as a learner would. `scripts/ui.mjs` gets `TAB_OF_JS.exercises = 'controls'` and a helper `exerciseLine(page)` (the text of `exercise-line`).
- **(10b)** Labels `m73` … `m78`: the M73 PR replaces `7[0-2]` with `7\d` in the five regular expressions of `openPage` (`scripts/shots.mjs`) that contain `6\d|7[0-2]` today, and adds the CI parts of 15.8. The good runs of part 10b's exercises take up to six minutes of app time; they run on the phone only, as M69's.
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

**(10b)** Part 10b adds: `ContactState.lastTouchS` and `MarinaGeometry`'s `breakwater`, `entrance`, `lights`, `land`, `buildings` (M73, 15.3); `ExerciseOptions.level` (`DEFAULT_OPTIONS.level = 'easy'`), the check fields `target`, `headingDeg`, `quayGapM`, `berthOffsetM`, `linesOn`, `linesOff`, `linesTight`, `fendersOut`, `anchor`, the step field `show`, the def fields `levels` and `targets`, the trigger fields `severity` and `obstacle`, `CheckSource.harbour`/`lines`/`anchor`, `CheckContext.targets`, the group `harbour`, the opens `harbour` and `anchor`, and four `LoggedAction` kinds (M74, 16.3). No new action type.

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
| `exl` **(10b)** | M74 | `normal`, `hard` | `easy` (no key) | when the run's `level` is not `easy`; after `exc` (16.4) |

- **The start link** (M66): `exerciseStartLink(id, state, ropes)` is built key by key (not through `serializeUrlState`): `v=1`, then `boat=<id>` when the boat is not the Hanse 508 (as M58 writes it), `m=exercise`, `ex=<id>`, `mode=<ropes>`, then the viewer's own keys from `state` with the same rules as `serializeUrlState`: `cam` (and `hw`/`hl` with the Helm camera), `step`, `detail`, `lang` when not English, `lb` when not the default, `mm=0` when off, `debug=1` when on; from M67 `exp=0` and from M71 `exc=1` when the run's options say so (from the list, with no run yet, the defaults: no key). No `sel`, `learn` or boat-state keys. In M66, `serializeUrlState(state)` returns the start link (with the run's ropes and options) whenever `state.exercise !== null`; M67 changes this for a run that has waypoints (7.4).
- **Parsing `ex`** (known id, no `exw`): start from `def.start`'s keys; for each of `cam`, `hw`, `hl`, `step`, `detail`, `lang`, `lb`, `mm`, `debug`, `mode` that the link has, set it (overriding `def.start`); with no `mode` in the link or `def.start`, the ropes mode is `def.ropes`. Parse that query, then `appMode: 'exercise'`, `paused: true`, `exercise: newRun(id, 0, options)` (`options` = `DEFAULT_OPTIONS`, changed by `exp`/`exc` from M67/M71). An unknown id is ignored (an ordinary link; with `m=exercise` it opens the list).
- **Old links** have none of these keys: nothing changes. `m=exercise` alone opens Exercises mode with the list.
- **(10c)** `wm` gains `summer`, `bura`, `jugo`; `wg` their strength; no `wd`/`ws` while a clock wind is on; `tx` gains 60 and 240 (23.7).

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
| `target`, `headingDeg`, `quayGapM`, `berthOffsetM`, `linesOn`, `linesOff`, `linesTight`, `fendersOut`, `anchor` **(10b)** | 16.3's table | M74 |

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
| M73 **(10b)** | `src/render3d/harbourDetail.ts`, `scripts/shots-m73.mjs` | `content/areas/adriatic.json`, `content/boat/hanse508.json`, `src/model/area.ts`, `src/model/marina.ts`, `src/model/places.ts`, `src/model/contact.ts`, `src/app/store.ts`, `src/render3d/marina.ts`, `src/render3d/sceneConfig.ts`, `src/render3d/scene.ts`, `src/ui/mapView.ts`, registry, glossaries, `scripts/budget.mjs`, `.github/workflows/ci.yml`, tests (15.1) |
| M74 **(10b)** | `src/render3d/exerciseTarget.ts`, `tests/harbourPilot.ts`, `tests/harbourExercises.test.ts`, `scripts/shots-m74.mjs` | `content/exercises/exercises.json`, both texts, `src/model/exercises.ts`, `src/app/exerciseRun.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/render3d/scene.ts`, `src/ui/mapView.ts`, `src/ui/exercisePanel.ts`, `src/ui/exerciseCoach.ts`, `src/ui/exerciseDebrief.ts`, `src/style.css`, both `ui.json`, registry, glossaries, tests (16.1) |
| M75–M78 **(10b)** | `scripts/shots-m75.mjs` … `scripts/shots-m78.mjs` | `content/exercises/exercises.json`, both texts, `tests/harbourPilot.ts`, `tests/harbourExercises.test.ts`; M75 also the bow lines on Hard (17.1); M76 `tests/physicsTruths10.test.ts`, `docs/PHYSICS_TRUTHS.md`; M78 `docs/ROADMAP.md`, `README.md` |
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
| M73 **(10b)** | 15 | A detailed marina (breakwater, entrance lights, quay furniture, buildings, yachts with cabin and rig); the marina and the bay are solid from open water; a bounce makes one damage report | PT-61 (new) | M72 | **required** (contact everywhere in the shared step; the report merge; new obstacles) |
| M74 **(10b)** | 16 | "Harbour and anchor" group; Leaving the berth with Easy / Normal / Hard; a magenta target outline; touches pause, hard knocks end the run; harbour actions in the debrief | — | M73 | **required** (new checks on shared state; serious mistakes; `exl` in links; new logged actions) |
| M75 **(10b)** | 17 | Entering the berth stern-to at three levels; on Hard the neighbours' bow lines catch the keel and foul the propeller | PT-50, PT-51, PT-52 | M74 | **required** (docking speeds and the engine in neutral near lines: safety teaching; the bow lines change the shared step) |
| M76 **(10b)** | 18 | Turning in her own length; picking up and leaving a mooring buoy | PT-27, PT-48, PT-33, PT-62 (new) | M75 | **required** (a new rule; prop walk's side is an assumption, PT-27) |
| M77 **(10b)** | 19 | Anchoring in the bay with a line ashore | PT-31, PT-53, PT-57 | M76 | **required** (anchoring safety: scope, setting) |
| M78 **(10b)** | 20 | Stern-to on your own anchor; sign-off of part 10b | PT-31, PT-51 | M77 | not needed (data, texts and checks of M74–M77) |
| M94–M98 **(10c)** | 24–28 | Local winds, the time-lapse, the maestral, bura and night exercises (table in 23.9) | PT-63 … PT-66 and others (23.9) | M93 | **required** for all five (23.9) |
| M72 | 14 | The gybe's push follows the wind: the boom starts across slowly and speeds up once past the line of the wind; the accidental-gybe step and Learn say why (extra milestone, issue #149) | PT-60 (new), PT-05, PT-24, PT-26, PT-58 | M71 | **required** (a physics formula that four rules rest on, and a new rule) |

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

All recommended; merging accepts them.

- **The wheel is in Steering, not Ropes** (recommended; merging accepts it): since PR 144 the Wheel sits in the Steering section with the autopilot. The wheel steps (`tack-by-hand`, `centre-wheel`, `wheel-over`) therefore open `autopilot` and their "How?" texts say "In Steering"; the sheet steps still say "In Ropes". Nothing else in 9.4 changed.
- **Each exercise names its `sections`** (recommended; merging accepts it): `ropes, sails, autopilot, conditions, learn`, as PR 144 requires for every exercise.
- **Each mistake has a `name`** (recommended; merging accepts it), as the points-of-sail mistakes do since M67: "stopping head to wind", "an accidental gybe".
- **Events are made before the mistakes of the same frame** (`exerciseRun.ts`), from the new alert entries that pass the settle rule; a tack with the autopilot on Standby adds `tack` and `tackByHand`.
- **The browser checks run the long good runs on the phone only** (recommended; merging accepts it): a desktop-size 3D frame is about ten times slower to draw, so one desktop tacking run took 25 minutes and the group over 50 (CI's limit is 45). The desktop runs the accidental-gybe card, the list, the Russian setup cards and the audits; the done card is the same component on both sizes (M66 checks it on desktop).
- **Steps with only an event or a boom angle show fewer target rows** (known limitation): the target list in the hint window (PR 144) has no row kind for `event`, `boomDeg` or `speedKn`, so "Gybe" and "Accidental" show none and the other steps show only the wind angle and tack. The goal text carries the rest.
- **Owner requests in PR 148** (decided in the M69 PR; recommended, merging accepts it): the step line shows the hold as a ring that fills with the seconds left, and flashes green for a second (with the hint window) when a step is done; a setup option "Pause after each step" (`pauseOnStep`, off by default, link key `exs=1`, `run.stepPause`) stops time when a step is done until Resume. Not in the spec; the owner asked for them. The "gybe moves against the wind" report could not be reproduced (see the ROADMAP row); the PR asks what was seen.
- **Prototype times reproduced** in the browser (desktop): tacking steps 58, 15, 48, 24 s.

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

### 10.10 Decided in the M70 PR (recommended; merging accepts it)

- **Both exercises carry `sections`** (owner, PR 144): `["ropes", "sails", "autopilot", "conditions", "learn"]`, like the M69 exercises. The data in 10.2 predates that field.
- **Mistakes carry a `name`** (the list on the setup card): `overpowered` "heeling too far", `round-up` "a round-up", `sail-worn` "a worn sail" (Russian: "слишком большой крен", "брочинг", "изношенный парус"). The texts in 10.4 predate that field.
- **The three check fields** `gusts`, `mainOutPct` and `jibOutPct` were already read by `checkPasses` (M69 built them with the type); M70 adds the gust counter (`countGusts` in `exerciseRun.ts`) and the data test now accepts the fields.
- **The gust counter starts armed or not by the wind at that moment** (10.3): `startRun`, the frame a step passes and `restoreWaypoint` all use `gustArmedAt` (wind at or below 1.1 × the mean).
- **CI:** M69 has its own part (`live, M69`), M68 its own (`live, M68`), and M70–M71 share one (`live, M70-M71`), as the M69 review asked.
- **Older check changed:** the list check of `scripts/shots-m69.mjs` expects six exercises instead of four (the two new ones come last).
- **Step 2 of Gusts in test 1:** with the easing policy kept (45 % while the wind is over 16.5 kn), step 2 took 33 s, not the prototype's 5 s: the gust at 158 s breaks the 5 s hold (setting the sheet to 25 % at once instead overpowers her, heel 26.4°, a mistake). The test sets the main sheet to 35 % for step 2: the main reads Good there, she heels at most 22.5° and the step passes in about 8 s. The band (within 20 s) is unchanged; a learner who follows the step text still finishes, only later.
- **Review answers (PR 151; owner: "accept all")**: step 2 of Gusts ("Trim both sails to Good") now starts its "How?" with "When GUST has gone from the strip, set Main sheet to about 25 % …" (English and Russian draft), because step 1 ends in the middle of the third gust and setting 25 % at once heels her to 26.4°; the "gust already blowing" test now starts a run at 19 kn and checks the counter through `startRun` and `countGusts`; the step-1 text of Too much wind (jib sheet to 100 %) and the Russian "брочинг" stay as built.
- **A gust is easier to see coming** (owner's comment on PR 151): on the 3D water `SCENE.water.gustAmount` goes from 0.45 to 0.8 and `gustColor` from `#0b3442` to `#06202c` (the dark patch is stronger); the mini-map and the full map draw the same gust profile as bands across the wind (`drawGustBands` in `mapView.ts`): dark blue for a gust, pale for a lull, with a line on the front edge of each gust, in gusty wind only. Decided in the M70 PR (recommended; merging accepts it).
- **Known limitations (named, not fixed):** the self-tacking jib's trim and a partly rolled jib's trim read "Stalled" (3.5), so the steps check how far the sail is out, not its trim; the strip's GUST badge shows from 16.5 kn but the counter counts only gusts that reach 18 kn, so a weak gust shows GUST and is not counted.

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

### 11.10 Decided in the M71 PR (recommended; merging accepts it)

- **Panel sections.** The spec's data predates the `sections` field (PR 144). Both exercises keep `ropes`, `helm`, `sails`, `autopilot`, `engine`, `conditions` and `learn`: the Realistic stations and the Helm section are where the gestures happen, and Sails shows the trim the checks read.
- **Mistake names.** Each mistake text has the short `name` the setup card's list uses (M67), e.g. "a winch cutting out".
- **Rope warnings in the good run (changed after the review of PR 152; owner: accept all).** Test 1 waits 2 s after letting go of the main furling line before closing the clutch, which removes the `clutch-on-running` warning. While the Genoa sheet is winched the Realistic winch model cuts out twice (and slips if its clutch is opened first), so a learner who followed How? got a "winch cut out" card on step 4. `winch-cut-out` and `rope-slipping` of set-sails therefore name the steps they apply to (every step but `jib-out`); the model is not changed in this phase and an issue records it. Tests 1 and 2 now run with "Pause when I make a mistake" on, as a learner has it, and expect no mistake at all. The steps took 7.8, 20.4, 30.8, 45.8 and 5.0 s (bands 15, 40, 60, 80, 10). Furl-sails: 2.0, 31.2, 13.8 and 21.4 s.
- **The old Russian Latin-letters test** (`tests/exercises.test.ts`) now lets through the words printed on the boat (`latinAllowed()`, the list `languages.test.ts` already uses): the Russian texts name the JIB ROLL clutch as it is printed on the boat. Only this line changed.
- **The test's `engine` field** was added to the known check fields of `tests/exercises.test.ts`, and a `checkPasses` test for `engine` (running, gear) was added.
- **Pause while the coach has paused.** Alone blocks only the learner's Pause while time runs. Paused by the coach after a finished step ("Pause after each step"), the button is Resume and works.
- **Review document split.** With the two new exercises `docs/review/ru.md` passed the 450 KiB that GitHub shows as Markdown (480 KB). The exercise texts moved to `docs/review/ru-exercises.md` (`buildExercisesReviewDoc` in `scripts/review-doc.mjs`, written by the same `npm run review-doc -- ru`); `tests/glossary.test.ts` checks both files are up to date and under the limit, and expects one heading fewer in `ru.md`.
- **Crew choice ignored** for an exercise without one (`crew: false`) and `exc=1` on such a link.
- **Three requests from the owner's test of PR 152 (recommended; merging accepts it).**
  - *Labels in 3D are off by default in Realistic ropes.* `defaultLabels(ropes)` and `withRopesMode` (`settings.ts`): a link with `mode=realistic` and no `lb` opens with the labels off; `lb=1` turns them on; choosing a ropes mode in the app (the mode picker, the exercise setup card's Easy / Realistic) sets the labels to that mode's default (hidden in Realistic, shown in Easy). The `lb` key is written when the labels differ from the current mode's default. The Settings → Labels in 3D switch still decides afterwards.
  - *A Resume button over the 3D view* (`ui/exerciseResume.ts`, `exercise-resume`): "Carry on" while a mistake card stops time, "Resume" while time is stopped after a finished step ("Pause after each step"). It does the same as the panel's buttons (`continue`, `setPaused`), so on a phone the learner need not open the Exercises section. It stands in the chip row's row, between the mini-map and the chips (a phone's view is short with the sheet up, so a place higher up would cover the step line). Alone does not change this: Resume was always allowed. A failed run keeps its Restart in the panel.
  - *The mini-map stands in the bottom-left corner, in the chip row's row, on every layout* (the wide layout already did), and the chip row is right-aligned on every layout (Mode and View chips, the gear where there is one, the alert button) with its left edge clear of the mini-map (96 px on a phone, 160 px beside the panel). The info card on a phone keeps clear of the mini-map on its left side instead of its right. Reading "to the right of the settings button" as "in the right-hand corner, next to the gear" (there is no gear in the view on a phone: Settings is a tab).

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

---

## 14. M72: What pushes the boom across in a gybe (extra milestone, issue #149)

**Independent review: required** (it changes a physics formula, the gybe's push, which PT-05, PT-24, PT-26 and PT-58 rest on, and adds rule PT-60).

**Build it after M71 is merged** (M70 and M71 change the same exercise texts and `tests/physicsTruths10.test.ts`). It is not part of part 10a's Definition of Done (section 12).

**Why (issue #149, owner's screenshot on PR #148).** Today `src/model/gybe.ts` gives the swinging boom a push of fixed size **towards the new side**, whatever direction the wind comes from. On the map the wind arrow then points one way and the boom moves the other: with the boom let out and the wind a little by the lee (from the side the boom is on), the wind's real push on the sail is **outwards**, so it holds the boom out (pressure on a sail pushes it away from where the wind comes from; Wikipedia *Death roll* [42]: unstayed boats are steadier slightly by the lee). Real booms still come across: "rolling motion, slight changes in the boat heading or wind direction can cause an unexpected and surprising jibe" (Wikipedia *Jibe* [41]). Once the boom is past the **line of the wind** (the boom pointing straight at where the wind comes from), the wind does push it across.

**What M72 builds.** The push on the swinging boom has two named parts: (1) **the wind's push**, worked out every substep from the apparent wind's angle to the boom, in its true direction; (2) **the start push**, which stands for the roll, wave, gust or small turn that starts a real gybe (the app does not simulate those), and acts only until the boom is 10° past the line of the wind. The trigger (15° by the lee, `visual.gybeHysteresisDeg`, `decideSide`) does not change. With the values below, every existing test passes unchanged (prototype: all 1,244 tests of `npm test` at commit 0bbaae3, with the test helper of 14.6 item 1) and PT-24's numbers stay as M11 made them. Two texts explain it to the learner.

What the owner sees: the boom starts across more slowly (the first 57°, up to the line of the wind, take about 69 % of the swing) and then speeds up; the gybing exercise's accidental step and the Learn entry "Gybe" say why. The gybe report's numbers stay as they are.

### 14.1 Files

New: `scripts/shots-m72.mjs`. Changed: `src/model/gybe.ts`, `src/model/sim.ts` (one call), `src/app/app.ts` (two fields in the debug `read()`), `content/boat/hanse508.json` (`physics.gybe`), `content/lang/en/exercises.json`, `content/lang/ru/exercises.json`, `content/lang/en/glossary.json`, `content/lang/ru/glossary.json` (`term_gybe`), `tests/gybe.test.ts`, `tests/physicsTruths10.test.ts`, `scripts/shots.mjs` (register `m72`, and add `72` to every label regex in `openPage` that lists `7[01]`: five at commit 0bbaae3, lines 446–478, e.g. `7[01]` → `7[0-2]`; `grep -n "7\[01\]" scripts/shots.mjs`; M70 or M71 may have extended them already, so add 72 to whatever they list), `docs/PHYSICS_TRUTHS.md` (PT-60's status line only if the builder finds a source), `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md`, `docs/review/ru.md` (`npm run review-doc -- ru`).

### 14.2 Data (`content/boat/hanse508.json`, `physics.gybe`)

Delete the keys `driveCoefficient`, `driveGain`, `driveFloor`, `driveStartFraction` and `driveNote` (only `gybe.ts` reads them). Keep `normalForceCoefficient` (1.2) and every other key. Add, directly after `normalForceCoefficient`:

```json
"sailShapeGain": 1.8,
"startPushFactor": 0.85,
"startPastLineDeg": 10,
"pushNote": "assumption (M72, issue #149): the wind's push on the swinging main is worked out from the apparent wind's angle to the boom like a flat plate (normal force ½ρ·aws²·area·normalForceCoefficient·sin²(angle), pushing away from where the wind comes from), times sailShapeGain for what a flat plate leaves out (camber, twist, more wind higher up). By the lee with the boom let out, that push holds the boom out; startPushFactor (a share of the broadside push) stands for what starts a real gybe (a roll, a wave, a gust or a small turn; PT-60) and acts until the boom is startPastLineDeg past the line of the wind. Both tuned so that PT-24's numbers stay as in M11 (15 kn, ±72°: 2.1 s, 9.8 kJ, 12.2 kN). startPushFactor must stay above sin²(maxSwingDeg − gybeHysteresisDeg) = 0.70, or a boom let right out would not start across."
```

**Tunable** (only if a band of 14.6 fails after the formulas were checked against 14.3): `sailShapeGain` (1.6–2.0), `startPushFactor` (0.75–0.95), `startPastLineDeg` (5–15). Report before and after in the PR; never widen a band.

### 14.3 Model (`src/model/gybe.ts`)

Conventions (as in the rest of the rig): `thetaDeg` is the boom angle, + = to starboard, 0 = along the centreline aft (`RigState.theta`); `awaDeg` is the apparent wind angle to the bow, + = from starboard (`RigWind.awaDeg`), range (−180, 180]; torques in N·m, + = turning the boom towards starboard (θ growing). `aws` in the formulas is in m/s (`awsKn · physics.constants.knotMps`).

New exports, each with a one-line comment:

```ts
/** The line of the wind: the boom angle that points straight at where the apparent wind comes from. */
export function windLineDeg(awaDeg: number): number;
// = wrap180(180 − awaDeg)   (wrap180 from './angles'); windLineDeg(165) = 15, windLineDeg(−165) = −15, windLineDeg(180) = 0

/** The steady wind's push on the main about the mast (N·m, + = towards starboard). */
export function windTorqueNm(awaDeg: number, thetaDeg: number, awsKn: number, mainOut: number, heelDeg: number, data: BoatData = boat): number;
// k = ½ · ρ · modelledAreaM2 · mainOut · normalForceCoefficient · ceLever(mainOut) · cos²(heel)
// x = (awaDeg + thetaDeg) · DEG
// = −k · sailShapeGain · aws² · sin(x) · |sin(x)|

/** The start push (PT-60): towards the new side until the boom is startPastLineDeg past the line of the wind, then 0 (N·m). */
export function startTorqueNm(s: GybeSwing, awaDeg: number, awsKn: number, mainOut: number, heelDeg: number, data: BoatData = boat): number;
// sign = Math.sign(s.stopDeg − s.startDeg) || Math.sign(s.stopDeg) || 1   (the same expression gybeStep uses today)
// past = sign · (s.thetaDeg − windLineDeg(awaDeg))
// = past < startPastLineDeg ? sign · startPushFactor · sailShapeGain · k · aws² : 0     (k as in windTorqueNm)
```

`gybeStep` gets the apparent wind angle as its **second** parameter (one way: the caller always knows it):

```ts
export function gybeStep(s: GybeSwing, awaDeg: number, awsKn: number, mainOut: number, heelDeg: number, h: number, data: BoatData = boat): GybeSwing;
// moment = windTorqueNm(awaDeg, s.thetaDeg, …) + startTorqueNm(s, awaDeg, …) − cAir · ω · |ω|
// cAir, ω, the semi-implicit Euler step and the returned object: unchanged from today
```

Delete `driveTorque` (and its doc comment). Update the doc comments of the file header and `gybeStep` to describe the two pushes (no mention of a fixed push towards the new side). `boomInertia`, `gybeArrived`, `gybeImpact`, `gybeImpactPullN`, `dangerZone` do not change.

`src/model/sim.ts`, `stepGybe`: the one call becomes `gybeStep(swing, wind.awaDeg, wind.awsKn, mainOut, heelDeg, h, data)`. Nothing else in `sim.ts` changes (the trigger, `maxSwingS`, `minMainOut`, `minReportJ`, the weak-wind hand-over).

Both the trigger (`decideSide(input.windFromDeg, …)`, fed `wind.awaDeg` in `sim.ts`) and the new pushes use the **apparent** wind, so at the trigger the line of the wind is 15° from the centreline on the boom's old side at any boat speed.

Edge cases (all hold with the formulas as written; the tests of 14.6 check them): zero wind gives 0 for both pushes (the existing weak-wind hand-over finishes the swing); both directions are mirror images; heel reduces both pushes by cos²(heel); a main rolled part-way in (`mainOut` < 1) reduces both; paused (`dt` = 0) nothing moves. With the main hauled in (boom within 16° of the centreline) the boom starts within a few degrees of the line of the wind, so the start push acts over only a few degrees and the swing stays gentle (PT-58). The trigger angle is not changed by M72.

Prototype values (commit 0bbaae3 with these formulas; `swing()` of `tests/gybe.test.ts` in 1 ms steps, heel 0, main out, `awaDeg` 15° by the lee towards the new side):

| Case | Time | Energy | Peak rope | Boom end |
|---|---|---|---|---|
| 15 kn, +72° → −72° (today: 2.07 s, 9.73 kJ, 12.16 kN, 17.7 m/s) | 2.11 s | 9.78 kJ | 12.22 kN | 17.71 m/s |
| 8 kn / 25 kn, ±72° | 3.97 s / 1.27 s | 2.78 kJ / 27.2 kJ | 3.48 / 34.0 kN | 9.4 / 29.5 m/s |
| 15 kn, +10° → −10° (hauled in; today 1.04 kJ, 1.29 kN) | 0.57 s | 0.85 kJ | 1.06 kN | 5.2 m/s |
| 15 kn, ±72°, heel 25° / main half out | 2.33 s / 4.05 s | 8.04 / 3.25 kJ | 10.0 / 4.07 kN | |
| 15 kn, ±72°: reaching the line of the wind (+15°) | 1.454 s (0.688 of the swing) | boom rate there 112.5 °/s, at the end 162.3 °/s (ratio 0.693) | | |

In the rig (`step`, boat at rest, wind −170 → −165, as `startGybe` in `tests/gybe.test.ts`): main out, 12 kn: 2.63 s, 6.25 kJ, accidental; main sheet 5 % (hauled in): 15 kn 0.60 s, 1.26 kJ; 12 kn 0.77 s, 0.81 kJ; 6 kn 1.53 s, 0.20 kJ (still above `minReportJ`, so the controlled gybe is still reported in light wind).

### 14.4 Store, URL, UI

No new state, actions or URL keys; old links open as before. The debug hook in `src/app/app.ts` (`__sailExercise.read()`, only with `debug=1`) gains two fields for the browser check: `boomDeg: s.rig.theta.value` and `gybing: s.rig.gybing`. No layout change.

### 14.5 Texts and strings

Exact replacements (the rest of each string stays as it is). Russian is AI-drafted: `textStatus` / `$status` stay `draft`.

1. `content/lang/en/exercises.json`, `gybing.steps.accidental.how`: replace the sentence "The wind gets behind the main from the wrong side and throws the boom across." with: "At first the wind still holds the boom out; at sea a roll, a wave or a small turn starts it across (the app gives it that start), and once the boom is past the line of the wind (pointing straight at where the wind comes from), the wind throws it the rest of the way."
2. `content/lang/ru/exercises.json`, the same key: replace "Ветер попадает в грот с неправильной стороны и перебрасывает гик." with: "Сначала ветер ещё удерживает гик снаружи; в море его сдвигает с места крен, волна или небольшой поворот (в приложении этот толчок задан), а когда гик проходит линию ветра (направлен прямо туда, откуда дует ветер), ветер перебрасывает его до конца."
3. `content/lang/en/glossary.json`, `term_gybe.what`: append (after "…break gear."): " Why the boom crosses by itself: let out, it is at first held out by the wind; a roll, a wave or a small turn starts it across, and once it is past the line of the wind (pointing straight at where the wind comes from), the wind throws it."
4. `content/lang/ru/glossary.json`, `term_gybe.what`: append (after "…сломать оборудование."): " Почему гик перелетает сам: когда грот потравлен, ветер сначала удерживает гик снаружи; крен, волна или небольшой поворот сдвигают его, а когда гик проходит линию ветра (направлен прямо туда, откуда дует ветер), ветер перебрасывает его."

Then `npm run review-doc -- ru`. No new registry ids and no new `ui.json` keys.

### 14.6 Tests

1. **`tests/gybe.test.ts`, helper only:** the only `gybeStep` call in `tests/` is in `swing()` (line 21 at commit 0bbaae3). `swing()` computes `const awaDeg = stopDeg < startDeg ? 165 : -165;` (15° by the lee towards the new side, as at the trigger) and calls `gybeStep(s, awaDeg, awsKn, mainOut, heelDeg, 0.001)`. **No expectation or band in `tests/gybe.test.ts`, `tests/physicsTruths*.test.ts` or `tests/exerciseRun.test.ts` changes**; all must pass as they are (prototype: they do).
2. **New, `tests/gybe.test.ts`, `describe('M72 the two pushes (PHASE10_SPEC 14)')`:**
   - `windLineDeg`: 165 → 15, −165 → −15, 180 → 0, −90 → −90 (exact).
   - `windTorqueNm(165, 72, 15, 1, 0)` is in 6,000–6,800 N·m [6,407] and positive; `windTorqueNm(-165, -72, 15, 1, 0)` is its negative (`toBeCloseTo(…, 6)`).
   - `windTorqueNm(165, 72, 15, 1, 25)` / the upright value = cos²(25°) (`toBeCloseTo(0.8214, 3)`); with `awsKn` 0 it is 0; with `mainOut` 0.5 it is smaller than with 1.
   - `startTorqueNm` for a swing `{ thetaDeg, omegaDegS: 0, startDeg: 72, stopDeg: -72 }` with `awaDeg` 165, 15 kn, main out, heel 0: at `thetaDeg` 6 (9° past the line) it equals `startPushFactor × windTorqueNm(165, -75, 15, 1, 0)` (the broadside push, x = 90°, which is negative) to 6 places (`toBeCloseTo(…, 6)`); at `thetaDeg` 4 (11° past the line) it is 0.
   - Data: `startPushFactor` > sin²((`rig.boom.maxSwingDeg` − `visual.gybeHysteresisDeg`)°) (0.703); `sailShapeGain` > 0; `startPastLineDeg` between 0 and 30; the deleted keys are gone (`driveGain` is `undefined`).
3. **New, `tests/physicsTruths10.test.ts` (PT-60):**
   - `PT-60 by the lee with the boom let out, the steady wind holds the boom out`: `windTorqueNm(165, 72, 15, 1, 0)` > 0 (outwards, towards starboard, while the swing would go to port) and `windTorqueNm(-165, -72, 15, 1, 0)` < 0.
   - `PT-60 without a start, a boom let out is not thrown across`: with data `{ ...boat, physics: { ...boat.physics, gybe: { ...boat.physics.gybe, startPushFactor: 0 } } }`, a swing from 72 to −72 with `awaDeg` 165 at 15 kn, run exactly 8,000 steps of 1 ms (no other stop): `gybeArrived` is false after every step and `thetaDeg` ≥ 72 at the end.
   - `PT-60 once past the line of the wind, the wind throws the boom across`: `windTorqueNm(165, 10, 15, 1, 0)` < 0 and `windTorqueNm(165, -40, 15, 1, 0)` < 0 (towards port, the new side).
   - `PT-60 the start is the slow part`: the 15 kn swing from 72 to −72 (`awaDeg` 165, 1 ms steps): the time to reach `thetaDeg` ≤ 15 divided by the whole swing's time is 0.62–0.76 [0.688]; the boom rate there divided by the rate at the end is 0.60–0.78 [0.693].

### 14.7 Browser checks (`scripts/shots-m72.mjs`, test clock)

Register in `scripts/shots.mjs` (import, `SCENES` with the `m72-` prefix, `liveGroups.m72`, and the label regexes of 14.1), as `shots-m69.mjs` is. Copy into `shots-m72.mjs` the small local helpers it needs from `shots-m69.mjs` (`check`, `shot`, `open`, `howText`, `read`, `act`) with the imports they use (`node:path`, `showSection` from `./ui.mjs`); do not export them from `shots-m69.mjs`.

- **Scene** `gybing-accidental-step`: `?v=1&ms=85&js=50&vg=50&tl=100&mf=100&jf=100&rd=0&wd=0&ws=12&cam=side-port&m=exercise&step=5&detail=high&hdg=171&bs=4.8&ap=wind&apt=-171&sea=flat&clk=202606011202&ex=gybing&exw=3&mode=easy` (the waypoint link of the gybing exercise's accidental-gybe step, from issue #149; a waypoint link carries the whole state, so `exw` alone would not do).
- **Live check `m72 swing`** (phone, `openPage(phone, 'm72 swing', '?wd=170&ws=15&ms=100&js=100&held=1&sea=flat&cam=top&debug=1', { testClock: true })`): `page.waitForTimeout(1500)`; read `boomDeg`: this is the **start value** (must be < −65). Dispatch `{ type: 'setControls', values: { ctl_wind_dir: -165 } }` through `window.__sailExercise.dispatch`. Then every 100 ms (`page.waitForTimeout(100)`, up to 6 s) read `boomDeg` and `gybing`. Times count from the dispatch (sample n is at n × 100 ms). Checks: `gybing` was true at some sample; `boomDeg` > 65 at some sample at or before 4 s; no sample has `boomDeg` < start value − 3 (no outward flick); (time of the first sample with `boomDeg` ≥ −15) / (time of the first sample with `boomDeg` ≥ 65) ≥ 0.55 (prototype 0.69; the 100 ms sampling costs at most about 0.05); the `gybe-report` test id becomes visible and its text starts with "Accidental gybe!". One PNG at the first sample with `boomDeg` ≥ 0.
- **Live check `m72 texts`** (phone, test clock): open the scene's link, read How? with `howText`: its text contains "line of the wind". The same in Russian (`&lang=ru`): contains "линию ветра".
- Run `SHOTS_ONLY=m11,m13,m69,m72 npm run shots` (the groups that test gybes); CI runs the rest.

### 14.8 Other documents (in the M72 PR)

- `docs/BOAT_REFERENCE.md`: replace the row "Gybe: the wind's push (M11)" with "Gybe: the two pushes (M72)": the formulas of 14.3, the keys `normalForceCoefficient`, `sailShapeGain`, `startPushFactor`, `startPastLineDeg`, **assumptions**, and the 15 kn results of 14.3's table. Add a row "Gybe trigger (Phase 1)": 15° by the lee (`visual.gybeHysteresisDeg`), **assumption**: no source gives an angle or a time (issue #149).
- `docs/CODE_MAP.md`, the `gybe.ts` row: "Gybes: the boom's swing under the wind's push (worked out from the apparent wind's angle to the boom) and the start push that stands for a roll or wave (M72), impact energy and sheet load, the danger-zone sector. …" (keep the weak-wind sentence); add `scripts/shots-m72.mjs` to the scripts list.
- `docs/PHYSICS_TRUTHS.md`: PT-60 is added by the planning PR; M72 changes nothing there unless it finds a source.
- `docs/PHASE2_SPEC.md` keeps its M11 text about the deleted keys (it is history).

### 14.9 Done when

`npm run typecheck`, `npm run lint`, `npm test`, `npm run build` pass; every test of 14.6 passes and no existing expectation was changed; `SHOTS_ONLY=m11,m13,m69,m72` passes; the PR says `Closes #149`; the owner's checklist (WORKFLOW, M72) is in the PR with full links; the independent review is done.

### 14.10 Not in M72

- An arrow of the wind's push on the sail (option C of issue #149): during the start it would point against the boom's movement and needs its own explanation (Ideas, if the owner wants it).
- Simulating the roll, wave or turn that starts a real gybe; a different trigger angle or delay (no source gives one); a hauled-in boom crossing as soon as the wind passes its line (today it waits for the 15° trigger like a let-out boom).
- A preventer; the Chinese gybe (the top of the sail crossing first, [43]).

### 14.11 Decided in the M72 planning PR (recommended; merging accepts it)

- **Keep PT-24's numbers** with `sailShapeGain` 1.8: the first prototype, a plain flat plate that also counts the boom's own movement through the air, gave 3–7 kJ at 15 kn instead of 9.8, and Realistic mode's sheet slip, the gybe report and earlier checks rest on M11's numbers; no source says they are wrong.
- **Keep the trigger at 15° by the lee and its wait** (about 5 s in the gybing exercise): no source gives an angle or a time; the owner may ask a sailor.
- **The start push is a named stand-in**, not a simulation of rolling: it keeps the accidental gybe of the exercises, PT-05 and PT-26 as they are, and the texts say what it stands for.
- **No force arrow in M72** (14.10).
- **PT-60 is `to-verify`** until a sail-aerodynamics source confirms that the steady wind holds a let-out boom (the causes are source-checked [41]).

### 14.12 Decided in the M72 PR (recommended; merging accepts it)

- **Built exactly as 14.2–14.7 say**: the formulas, the five data values and the tests, with no tuning. The prototype's numbers came out again (15 kn, ±72°: 2.11 s, 9.78 kJ, 12.22 kN, 17.7 m/s; 8 / 25 kn: 3.96 s and 1.27 s; hauled in ±10°: 0.57 s, 0.85 kJ, 1.06 kN; heel 25°: 2.33 s, 8.04 kJ; main half out: 4.05 s, 3.25 kJ). No existing expectation changed; the only edit to an older test is the `swing()` helper in `tests/gybe.test.ts`, which now passes the apparent wind angle.
- **CI**: M72 has its own part `live, M72` (`SHOTS_ONLY=m72`) and `m72` is added to the `SHOTS_SKIP` list of the part `live, M30 on`.
- **PT-60 stays `to-verify`**: no sail-aerodynamics source was found in the build environment (the planning PR's reasoning stands).

---

# Part 10b: harbour and anchor exercises (M73–M78)

Planned on 2026-11-02 (`/plan 10b`; the owner accepted every recommendation in the planning chat: "Accept all"; ROADMAP decisions log 2026-11-02, "Phase 10 plan, part 10b"). Sections 0–5 above apply, with the part 10b additions marked **(10b)** in them. Read 0–5, then your milestone's section below, then 21 (Definition of Done of part 10b).

## 15. M73: A more detailed marina, solid from everywhere

**Independent review: required** (contact becomes solid outside the marina and the bay place, which changes the shared step; the damage report merges touches; new obstacles in a shared geometry).

What the owner sees: a rock breakwater round the marina with an entrance facing west and a red and a green light on its two heads; a quay with bollards and lamp posts, a paved strip and six low buildings behind it; a pontoon on floats; moored yachts with a deck, a cabin, a mast, a boom and a rolled jib. Sailing in open water into the marina or the bay now bumps (owner, PR 146: "I reached marina and went through it"). One bump makes one damage report.

### 15.1 Files

New: `src/render3d/harbourDetail.ts` (breakwater, lights, paved land, buildings, lamp posts, bollards, pontoon floats), `scripts/shots-m73.mjs`. Changed: `content/areas/adriatic.json` (`marina.basin.west`, `marina.breakwater`, `marina.buildings`), `content/boat/hanse508.json` (`physics.contact.mergeS`, `mergeNote`), `src/model/area.ts` (the new keys' types), `src/model/marina.ts` (breakwater, entrance, lights, land, buildings; obstacles; bounds), `src/model/places.ts` (`solidAround`), `src/model/contact.ts` (`ContactState.lastTouchS`, the merge in `stepContact`), `src/app/store.ts` (the external hook and the obstacles by `solidAround`; the initial `contact` gets `lastTouchS: {}`), `src/render3d/marina.ts` (instanced yachts), `src/render3d/sceneConfig.ts` (`SCENE.harbour` keys of 15.5), `src/render3d/scene.ts` (adds `harbourDetail`; the debug hook `marinaPartScreen`, 15.8), `src/render3d/picking.ts` (only if instanced meshes need it, 15.5), `src/ui/mapView.ts` (`drawHarbour`: breakwater, land, buildings, lights; taps), `content/registry/parts.json` (three ids), both glossaries, `docs/review/ru.md`, `scripts/budget.mjs` (marina cases), `scripts/shots.mjs`, `.github/workflows/ci.yml` (15.8), `tests/marina.test.ts`, `tests/contact.test.ts`, `tests/places.test.ts` (new), `tests/physicsTruths10.test.ts` (PT-61), `docs/PHYSICS_TRUTHS.md` (PT-61's test), `docs/BOAT_REFERENCE.md` (`mergeS` assumption; the breakwater and buildings as made-up area data), `docs/CODE_MAP.md`.

### 15.2 Data

`content/areas/adriatic.json`, in `marina`: `basin.west` changes from `-110` to `-150` (the outer harbour inside the breakwater is 5 m deep like the basin; `src/render3d/seabed.ts` draws the basin's flat bottom from it, so it follows; a test that reads `basin.west` changes with it, 3.7). New keys after `fendersHintNote`:

```json
"breakwater": {
  "$comment": "PHASE10_SPEC 15.2: a made-up rock breakwater round the marina, for teaching. A south mole behind the pontoon, a west arm whose tip lines up with the fairway's south edge, and the quay carried west as a north mole. The entrance, between the arm's tip and the north mole, faces west. Lights on the two heads: red on the north mole (on the left, port hand, coming in from the sea), green on the arm (IALA region A, PT-61).",
  "westM": -150,
  "moleWidthM": 12,
  "lightInsetM": 3,
  "landDepthM": 60
},
"buildings": [
  [-125, 1530, 18, 12, 7],
  [-90, 1528, 14, 10, 9],
  [-45, 1532, 22, 12, 6],
  [5, 1530, 16, 12, 10],
  [50, 1529, 20, 10, 7],
  [95, 1531, 18, 12, 8]
],
"buildingsNote": "PHASE10_SPEC 15.2: made-up low harbour buildings behind the quay, each [east, north, width east-west, depth north-south, wall height], metres"
```

`content/boat/hanse508.json`, `physics.contact`, after `separateS`: `"mergeS": 3,` and after `note`: `"mergeNote": "assumption (owner, PHASE10_SPEC 22.1, answer 7): touches of the same obstacle with the same part of the hull within 3 s of the last touch are one report, the worst of them, so a bounce counts once"`. **Tunable:** none of these.

### 15.3 Model

`src/model/area.ts`: `MarinaData` gains `breakwater: { westM: number; moleWidthM: number; lightInsetM: number; landDepthM: number }` and `buildings: readonly (readonly [number, number, number, number, number])[]`.

`src/model/marina.ts`, `MarinaGeometry` gains (built in `buildMarina`, with `F = quayFaceNorthM`, `b = m.breakwater`, `f` the layout's fairway):

```ts
breakwater: { south: Rect; west: Rect; north: Rect };
entrance: { eastM: number; southM: number; northM: number };
lights: { red: [number, number]; green: [number, number] };
land: Rect;
buildings: { eastM: number; northM: number; widthM: number; depthM: number; heightM: number }[];
```

- `south = { west: b.westM, east: eastEndEastM + wallWidthM, south: pontoon.south − b.moleWidthM, north: pontoon.south }`
- `west = { west: b.westM, east: b.westM + b.moleWidthM, south: south.south, north: fairway.south }`
- `north = { west: b.westM, east: westEndEastM, south: F, north: F + quayWidthM }`
- `entrance = { eastM: b.westM, southM: fairway.south, northM: F }`
- `lights.red = [b.westM + b.lightInsetM, F + b.lightInsetM]`; `lights.green = [b.westM + b.moleWidthM / 2, fairway.south − b.lightInsetM]`
- `land = { west: b.westM, east: eastEndEastM + wallWidthM, south: F + quayWidthM, north: F + quayWidthM + b.landDepthM }`
- `buildings`: the data rows in order, as named fields.

Values (tests, 15.7): medium: `south {−150, 120, 1421, 1433}`, `west {−150, −138, 1421, 1453}`, `north {−150, −110, 1500, 1515}`, entrance `{−150, 1453, 1500}`, red `[−147, 1503]`, green `[−144, 1450]`, land `{−150, 120, 1515, 1575}`; tight: south mole north 1441, entrance south 1461; spacious: south mole north 1423, entrance south 1443.

`marinaObstacles` adds, after `pontoon`: `{ id: 'breakwater-south', partId: 'env_breakwater', … }`, `breakwater-west`, `breakwater-north` (rect polygons, as the quay). `marinaBounds` takes the min/max over `quay`, `wall`, `pontoon` **and the three breakwater rects** (not the land): medium `{ west: −150, east: 120, south: 1421, north: 1515 }`.

`src/model/places.ts`:

```ts
/** Which solid surroundings act on the boat this frame (PHASE10_SPEC 15.3): the place's own, and the marina or the bay when the boat is near them from any place. */
export function solidAround(
  place: PlaceId, eastM: number, northM: number,
  geometry: MarinaGeometry, areaData: AreaData = area, data: BoatData = boat,
): { marina: boolean; bay: boolean };
```

`marina = place === 'marina' || distanceToRect(marinaBounds(geometry), eastM, northM) <= data.physics.contact.nearM`; `bay = place === 'bay' || eastM <= Math.max(...areaData.bay.coast.map((p) => p[0])) + data.physics.contact.nearM` (the coast's east-most point, −1350, plus 60 m: −1290).

`src/app/store.ts`, the `step` case, where today's `external:` expression builds the hook ("the hook is built only while a thruster runs or the boat is in a place"): compute `const solid = solidAround(state.harbour.place, state.boat.eastM, state.boat.northM, geometry)` with `geometry = marinaGeometry(state.harbour.layout, state.harbour.traffic)`; build the hook when a thruster runs, **`solid.marina || solid.bay`**, or the anchor is on the bottom (the `place !== 'open'` term is replaced by the two flags; in a place one of them is always true). Pass `obstacles: solid.marina ? marinaObstacles(geometry) : NO_OBSTACLES` and a new `HarbourInputs` field `bay: solid.bay`. `harbourForces` uses `inputs.bay ?? inputs.place === 'bay'` where it uses `inputs.place === 'bay'` today (land obstacles and `groundForces`). Lines stay as they are (only in their place: `canTake` is unchanged). Old links in open water far from both: nothing changes (no hook, as today).

`src/model/contact.ts`:

- `ContactState` gains `lastTouchS: Readonly<Record<string, number>>` (key `obstacleId:part` → the app time of its latest touching frame); `NO_CONTACT` (`src/model/contact.ts`, the initial state every other place spreads or references) has `lastTouchS: {}`; a test or file that builds a `ContactState` literal without spreading `NO_CONTACT` adds the field.
- `stepContact`: for every hit this frame, `lastTouchS[hit.key] = timeS`. A **new** touch (key not in `touching`) is **merged** when `timeS − lastTouchS_before[key] ≤ physics.contact.mergeS` (the value before this frame) and a report with the same `obstacleId` and `part` is in `reports`: take the newest such report; if `rank(newSeverity) > rank(report.severity)` (`fender` 0 < `touch` 1 < `bump` 2 < `knock` 3 < `hit` 4), replace it in the list (same index) with `{ ...report, severity: newSeverity, impactMps: Math.max(report.impactMps, hit.approachMps), fender: hit.fender }` (a new object, so `recordAlerts` writes a `contact` entry, and `withNotice` as for a new report); otherwise change nothing. A new touch that is not merged makes a new report as today. Entries with `timeS − lastTouchS[key] > mergeS` are dropped each call. When `hits`, `touching` and `lastTouchS` are all empty, return `contact` unchanged (today's early return); otherwise return a new object (dropping old entries is a change). A merged report that got worse is a new object, so the Attention history gets a second `contact` line for that bump (the escalation: a touch that became a knock); the damage list keeps one line.
- `stepFenders` is unchanged (a lost fender is never merged).

### 15.4 Store and URL

No new keys or actions. `goToPlace`, the layout and the traffic (fresh states) start with `lastTouchS: {}`. Old links open the same boat; in open water near the marina or the bay the boat is now stopped by them.

### 15.5 3D and the maps

All sizes and colours go into `SCENE.harbour` (`src/render3d/sceneConfig.ts`), added after `pontoonBelowM`:

```ts
breakwater: { colour: '#8f887b', topAboveM: 2.5, belowM: 3, shade: 0.08 },
light: { towerRadiusM: 0.6, towerM: 4, topM: 1, white: '#f2f2ee', red: '#d62828', green: '#1f9d55', emissive: 0.8 },
land: { colour: '#cfc8b8' },
building: { wall: '#efe9df', roof: '#b5523b', roofM: 2.2, windowColour: '#4a4f55', floorM: 3, windowEveryM: 3, windowWidthM: 1.2, windowHeightM: 1.0, windowSillM: 1.0 },
lamp: { everyM: 20, insetM: 8, postM: 4.5, postRadiusM: 0.08, headM: 0.4, colour: '#3a3f44' },
bollard: { radiusM: 0.15, heightM: 0.5, insetM: 1.2, colour: '#2b2b2b' },
float: { everyM: 4, lengthM: 1.2, widthM: 0.5, belowM: 0.5, outM: 0.2, colour: '#4a4f55' },
yacht: { cabinFrom: 0.35, cabinTo: 0.7, cabinWidth: 0.6, cabinM: 0.6, mastAt: 0.55, mastShare: 1.45, boomShare: 0.35, boomAboveM: 2.2, jibRadiusM: 0.1, deckColour: '#c9c5bb', rigColour: '#9aa3ab', sailColour: '#ecebe4' },
```

`src/render3d/harbourDetail.ts` (`buildHarbourDetail(areaData?): { object: THREE.Group; update(state: AppState): void }`, built and moved exactly like `marina.ts`: map positions in a group shifted with the boat each frame, rebuilt when layout or traffic change, each mesh hidden beyond `maxDrawM`):

- **Breakwater** (`env_breakwater`): one mesh for the three moles. **Each mole is a box** over its rect from `−belowM` to `topAboveM` (vertical sides; the three boxes overlap at the corners, which is fine with one material; `slopeM` is not used and is left out of `SCENE`). Vertex colours: `colour` times `1 + shade · (2r − 1)` per vertex with `r` from `mulberry32(73)` (`src/model/random.ts`), for a rough rock look. Contact uses the same rect (15.3).
- **Lights** (`env_harbour_light`): at `lights.red` and `lights.green`, standing on the mole top (y = `breakwater.topAboveM`), no light source (the emissive colour only): a white cylinder (`towerRadiusM`, `towerM`) and a top band (radius + 0.05, `topM`) in red or green with `emissive` of the same colour at `emissive` intensity.
- **Land** (`env_quay`): a box over `land`, top at `quayHeightM`, `land.colour`.
- **Buildings** (`env_harbour_building`): walls one `InstancedMesh` of boxes (centre, width, depth, height from data, standing on the land's top); roofs one `InstancedMesh` of a pitched prism (ridge east–west, `roofM` high, `roof` colour); windows: one `InstancedMesh` of thin dark boxes (`windowColour`, 0.05 m thick) on each building's **south face** (towards the harbour): one row per floor (`floor(heightM / floorM)` rows, the row's sill `windowSillM` above the floor), one window every `windowEveryM` along the width starting `windowEveryM / 2` from the west corner, each `windowWidthM` × `windowHeightM`. No texture. At Low detail the windows are left out.
- **Lamp posts** (`env_quay`): every `everyM` along the quay from `breakwater.westM + everyM / 2` to `eastEndEastM`, at `F + insetM` north: a post and a head (two `InstancedMesh`es).
- **Bollards** (`env_quay`): one at each of `geometry.rings`, `insetM` north of the quay face (one `InstancedMesh`).
- **Rings** (`src/render3d/marina.ts`, `env_quay_ring`): today 25 separate meshes; they become **one `InstancedMesh`** (same geometry, material and positions).
- **Pontoon floats** (`env_quay`): boxes `lengthM` long (along the pontoon) and `widthM` wide, from `−belowM` up to the water line (y = 0), every `everyM` along both long edges of the pontoon, sticking out `outM` beyond the edge so they show from the side (one `InstancedMesh`).
- **Moored yachts** (`src/render3d/marina.ts`): the per-yacht meshes become **one `InstancedMesh` per yacht type** (three), each with one merged geometry in the yacht's own frame (x from the stern 0 … L, y up, z to starboard) with vertex colours: the hull (the `yachtOutline` extruded from `−hullBelowM` to `hullAboveM`, `hullColour`), the deck (its top face, `deckColour`), the cabin (a box from `cabinFrom·L` to `cabinTo·L`, `cabinWidth·B` wide, `cabinM` high, `hullColour`), the mast (a cylinder of `mastRadiusM`, 8 sides, at `mastAt·L`, `mastShare·L` high above the deck, `rigColour`), the boom (a cylinder of `mastRadiusM` from the mast aft by `boomShare·L`, `boomAboveM` above the deck), the rolled jib (a cylinder of `jibRadiusM` from (x = L, y = `hullAboveM`) to (x = `mastAt·L`, y = `hullAboveM + 0.9·mastShare·L`), `sailColour`). The hull geometry is today's (`buildYacht`: the outline as a `THREE.Shape`, `ExtrudeGeometry` with no bevel, rotated to stand vertical); build each type's geometry once around its own outline at the origin (stern at 0, heading 0) and give each instance the translation and rotation that put it where today's `buildYacht` puts that yacht's hull (berth position, `headingDeg`). The deck line (`LineLoop`) is dropped (the deck colour shows the edge); `mesh.userData.partId = 'env_moored_yacht'` (a tap names "Moored yacht", as today). If `picking.ts` reads `userData` from the hit object only, nothing changes; if it needs the instance, it uses `hit.instanceId` only to keep the tap working (no per-yacht selection).

**Maps** (`drawHarbour` in `src/ui/mapView.ts`, both the full map and the mini-map; `marinaScreen` gains the breakwater rects, the land, the buildings and the lights in screen coordinates; the colours are added to `mapView.ts`'s own `COLOURS` table with the hex values of `SCENE.harbour` — `breakwater` `#8f887b`, `land` `#cfc8b8`, `roof` `#b5523b`, `lightRed` `#d62828`, `lightGreen` `#1f9d55` — `mapView.ts` does not import `SCENE`): before the quay, fill `land` with `land.colour` and each building's footprint with `building.roof`; fill the three breakwater rects with `breakwater.colour`; after everything of the harbour, a dot of 3 px radius at each light in its colour. Taps, in this order: a light (within 6 px) selects `env_harbour_light`, a building `env_harbour_building`, a breakwater rect `env_breakwater`, then today's quay and yacht taps as they are, and last the land (`env_quay`), so the land never swallows a quay or yacht tap.

**Budget** (`scripts/budget.mjs`): add cases with `extra` `&pl=marina&ml=tight&tr=busy` for the cameras `helm` and `side-port`, both details, against the same `BUDGET` (High 300 calls, 250,000 triangles; Low 150 calls, 120,000 triangles). Measured before M73 (2026-11-02, the planning session): `helm`, tight, busy: 356 calls at High, 228 at Low (already over: 47 yachts × 2 meshes (hull, mast) and 25 ring meshes). Batching the yachts (3 calls) and the rings (1) removes about 115 calls; the new detail adds about 14 (breakwater 1, lights 4, land 1, building walls, roofs and windows 3, lamp posts 2, bollards 1, floats 1, the deck-line loops gone): expected about 255 at High and 127 at Low, within the budget. The cases: after the existing loop, a second loop over `detail` in `high`, `low` and `cam` in `helm`, `side-port`, Easy ropes only, query `?debug=1&held=1&sea=flat&clock=0&mm=0&cam=${cam}&detail=${detail}&pl=marina&ml=tight&tr=busy`, label `budget ${detail} ${cam} marina`, the same pass/fail lines as the existing cases.

### 15.6 Strings and registry

Registry (`content/registry/parts.json`, after `env_moored_yacht`, `status: "draft"`, `group: "harbour"`, `kind: "environment"`, `phase: 10`, `sources: []`):

| Id | related | showMe |
|---|---|---|
| `env_breakwater` | `env_quay`, `env_harbour_light` | `?cam=map&sel=env_breakwater&pl=marina&pe=-95.0&pn=1468.0&hdg=270` |
| `env_harbour_light` | `env_breakwater` | `?cam=bow&sel=env_harbour_light&pl=marina&pe=-230.0&pn=1476.0&hdg=270&ws=0` |
| `env_harbour_building` | `env_quay` | `?cam=side-port&sel=env_harbour_building&pl=marina&pe=2.8&pn=1490.4&hdg=180` |

Glossary (English final; Russian drafts in `content/lang/ru/glossary.json`, `textStatus: "draft"`; a cell "—" is an empty array for `alternatives` and `mistakes`, and the key left out for `showMe`; the shape is today's entries', for example `env_quay`):

| Id | name | alternatives | short | what | onThisBoat | mistakes | showMe |
|---|---|---|---|---|---|---|---|
| `env_breakwater` | Breakwater | mole; harbour wall | The rock wall that keeps the waves out of the harbour. | A breakwater is a long pile of rocks or a concrete wall round a harbour. Inside it the water stays calm, so boats can moor. Boats come in and go out through a gap in it, the entrance. | The app's marina has a breakwater on the south and west with the entrance facing west, and the quay carried on as a north mole. | Cutting close round the end of the breakwater → keep well off: rocks spread out under the water near its foot. | The breakwater from above. |
| `env_harbour_light` | Harbour entrance light | entrance light | The red or green light on each side of a harbour entrance. | In Europe (IALA region A) a boat coming in from the sea keeps the red light on her left (port) side and the green light on her right (starboard) side. At night they flash, so you can find the gap. | Red on the north mole, green on the west arm: coming in heading east, red is on the left. | Passing the lights the wrong way round → coming in from the sea, red stays on the left. | The entrance from the helm. |
| `env_harbour_building` | Harbour buildings | — | The houses behind the quay: the harbour office, cafés, shops. | A marina's office (where you check in and pay) is usually on the quay, with showers, cafés and shops nearby. | Drawn only: six low buildings behind the quay. | — | The buildings from the boat. |

Russian drafts (each cell `English / Russian`): Breakwater / Волнолом (alternatives: мол; оградительная стена); Harbour entrance light / Входной огонь гавани (alternatives: огонь входа); Harbour buildings / Портовые здания. The builder writes the Russian `short`, `what`, `onThisBoat`, `mistakes` and `showMe` following PHASE4_SPEC 3.3, `textStatus: "draft"`, then runs `npm run review-doc -- ru`.

### 15.7 Tests

1. `tests/marina.test.ts`: the breakwater, entrance, lights and land values of 15.3 for `medium`/`half`; the tight and spacious values (south mole north 1441 / 1423, entrance south 1461 / 1443). The existing `marinaBounds` expectation (line 143 as built) changes to `{ west: -150, east: 120, south: 1421, north: 1515 }` (3.7: this test checks what M73 changes). `marinaObstacles(marinaGeometry('medium', 'half'))` has `3 + 3 + 28` entries, the three new ids with `partId: 'env_breakwater'`.
2. **PT-61** (`tests/physicsTruths10.test.ts`, "PT-61 coming in from the sea the red light is on the left"): for each layout, the entrance faces west, so a boat coming in heads east (090°); the red light is to port (north) of the entrance's middle and the green light to starboard (south): `red[1] > (entrance.southM + entrance.northM) / 2 > green[1]`, and both lights are within `moleWidthM` of the entrance line (`|light[0] − entrance.eastM| ≤ 12`).
3. `tests/contact.test.ts`, the merge (`stepContact`, default data: `separateS` 0.5, `mergeS` 3; `dt` 0.1; key `quay:stern`, `obstacleId: 'quay'`, `part: 'stern'`, `fender: false`): t = 0 a hit at 0.10 m/s → one report, `touch`. No hits for ten frames (to t = 1.0): `touching` empty, one report. t = 1.1 a hit at 0.30 m/s → still one report, severity `bump`, `impactMps` 0.30, `atS` 0, and `reports[0]` is not the object of the first report. No hits to t = 2.2; t = 2.3 a hit at 0.05 → one report, the same object as after t = 1.1. No hits to t = 5.4; t = 5.5 a hit at 0.05 → two reports. A second obstacle (`yacht-0-11:port`) touched at t = 1.2 makes its own report (merging is per obstacle and part).
4. `tests/places.test.ts` (new): `solidAround('open', 0, 0, g)` is `{ marina: false, bay: false }`; `('open', 0, 1405, g)` → `marina: true`; `('open', -1300, 0, g)` → `bay: true`; `('open', -1280, 0, g)` → `bay: false`; `('marina', 0, 0, g)` → `marina: true`; `('bay', 0, 0, g)` → `bay: true` (g = medium/half).
5. **Solid from open water** (`tests/store.test.ts`): `s = parseUrlState('?wd=0&ws=0&mf=0&jf=0&js=100&ap=off&sea=flat&eng=0')`, then `s = { ...s, boat: { ...s.boat, eastM: 0, northM: 1405, headingDeg: 0, speedMps: 2.0 } }` (the bow at north 1411.95, 9 m from the south mole's south face at 1421 for the default medium layout; with no engine she carries her way, PT-49); stepping `reduce(s, { type: 'step', dt: 0.05 })`, within 30 s of app time a report with `obstacleId: 'breakwater-south'` is in `contact.reports` (the place stays `open`). The same with the boat at `eastM: −1330, northM: 300, headingDeg: 270, speedMps: 2.0`: within 30 s a report with `obstacleId` `bottom` or `land`. With the boat at (0, 0) heading 0 at 1.0 m/s for 30 s: no report, and the `external` hook is not built (spy not needed: check that `contact` is the same object after every frame).
6. Every existing test stays green (Phase 7's contact, lines, seabed and anchor tests; 3.7 for the one changed line).

### 15.8 Browser checks (`scripts/shots-m73.mjs`)

Scenes (phone size first, as every milestone): `marina-entrance` (`?pl=marina&m=harbour&pe=-230.0&pn=1476.0&hdg=270&ws=0&cam=bow`: the entrance ahead, red light on the left), `marina-side` (`?pl=marina&m=harbour&tr=busy&cam=side-port&ws=0&detail=high`), `marina-map` (`?pl=marina&m=harbour&tr=busy&cam=map`), `marina-low` (`?pl=marina&m=harbour&tr=busy&cam=side-port&ws=0&detail=low`).

Live checks: (1) `m73 tap breakwater`: on `marina-map`, tap the middle of the south mole on the map (`__sailMap.toScreen(-15, 1427)`): the info card names "Breakwater". (2) `m73 tap light`: on `marina-entrance`, tap the red light in 3D (its screen point from a new debug hook, added by M73 to `window.__sailDebug` in `src/render3d/scene.ts`: `marinaPartScreen(partId)` returns the CSS-pixel point of the centre of the first visible mesh (for an `InstancedMesh`, instance 0) carrying that `partId` in the marina or harbour-detail groups, projected with the current camera, or `null` when it is off screen): the card names "Harbour entrance light". (3) `m73 yacht tap`: on `marina-side`, tap `__sailDebug.marinaPartScreen('env_moored_yacht')` (`debug=1`): the card names "Moored yacht". (4) `m73 bump once`, test clock: `?pl=marina&m=harbour&pe=2.8&pn=1490.4&hdg=180&ws=0&debug=1`; through `window.__sailExercise.dispatch` (it exists with `debug=1` in any mode) send `engine { leverPct: -40 }`, wait 3 s, send `{ leverPct: 0 }`, wait 6 s; `showSection(page, 'status')`: the damage list holds at most two `li.damage-item` (as `scripts/shots-m55.mjs` counts them; only the quay can be touched there) (before M73 a bounce gave three or more; the PR reports the number). The accessibility audit runs on `?pl=marina&m=harbour` with the Place section open.

CI (`.github/workflows/ci.yml`): after the part `live, M72`, add three parts of the same shape (`env: SHOTS_NO_SCENES=1 SHOTS_NO_TAPS=1 SHOTS_ONLY=…`): `live, M73-M74` (`m73,m74`), `live, M75-M76` (`m75,m76`), `live, M77-M78` (`m77,m78`) — a name with no group yet is skipped — and append `,m73,m74,m75,m76,m77,m78` after `m72` in the `SHOTS_SKIP` list of `live, M30 on`. The budget check runs on every PR already.

### 15.9 Done when

The marina looks as 15.5 on a phone at both details; tapping the breakwater, a light, a building and a yacht names them; a boat driven from open water into the marina or the bay bumps; a bounce on the quay makes one damage line; the budget check passes with the marina cases; every test and browser check passes.

### 15.10 Not in M73

Moving boats (owner, answer 3: Ideas); night lighting of the lamps; lights that flash; a fuel dock; the exercises (M74–M78); any change to the yachts' outlines or the berths (the tight berths stay 4.9 m: 22.3).


### 15.11 Decided in the M73 PR (recommended; merging accepts it)

- **Built as 15.2–15.5 say**, with no tuning; the numbers of 15.3 came out as worked out.
- **Older tests changed (3.7), only the lines that test what M73 changes:** `tests/marina.test.ts` (the `marinaBounds` expectation; test 21 now reads the three instanced yacht meshes and the one instanced ring mesh instead of one extruded hull per yacht), `tests/contact.test.ts` (a hit coming back within `mergeS` is now the same report; the "weaker report" test touches again after 4 s instead of 3 s; the obstacle list has the three breakwater rects), `tests/glossary.test.ts` (the harbour group has 19 entries). `tests/windModes.test.ts` (the 20° shifty wind) and `tests/waveFeedback.test.ts` (×16) sail ten minutes north from the start and now reach the marina's breakwater (about 6 minutes in), which is the new behaviour; both start 1,500 m further south (`northM: -1500`) so they stay in open water. Nothing else changed.
- **`marinaPartScreen`** (15.8) returns the first instance **that is on screen** (not only instance 0, which can be behind the camera), at the middle of the mesh's box but no higher than 1.5 m above its foot, so a tap lands on a yacht's hull and a light's tower, not in the air beside a thin mast.
- **Browser-check links:** the yacht tap and the "marina-side" scene start in the middle of the fairway (`pe=-30.0&pn=1468.0&hdg=90`): from the marina's start (east −95) the nearest berth is 29 m away and no yacht is in the side view. The light is tapped on the desktop size, from a start 33 m south of the red light heading at it (`pe=-147.0&pn=1465.0&hdg=0&cam=helm`): from the entrance scene's start the helm view shows the cockpit and the entrance is out to the left, and the light sits under the Time bar. The bump check runs the lever at −40 for 6 s then 0 for 8 s: she touches the quay after about 8 s (3 s of astern did not reach it). The PR reports the numbers: in this scene a bounce gave one report before M73 as well, so "three or more" did not reproduce; the merge is proved by `tests/contact.test.ts` (M73 test 3).
- **Entrance link (review fix):** the spec's `pe=-200.0&pn=1476.0&hdg=90&cam=helm` showed only the cockpit (the sprayhood hides the gap). The entrance link, the scene `marina-entrance`, PT-61's "How to see it" and the light's "Show me" now use `pe=-230.0&pn=1476.0&hdg=270&cam=bow` (the camera stands ahead of the boat and looks into the harbour). A fifth live check taps a building on the map (`m73 tap building`, `__sailMap.toScreen(-90, 1528)`).
- **`IALA`** joins `content/lang/latin-words.json` (the Russian text of the entrance light names it, like `B&G`).
- **Map colours:** the land's colour is `COLOURS.harbourLand` (the bay chart already has `COLOURS.land`).
- **Lamp posts** west of the quay (on the north mole) stand on the quay's height, so their feet are inside the rocks; only the tops show.
- **CI:** the three parts of 15.8 are added; `m73` … `m78` are in the `SHOTS_SKIP` list of `live, M30 on`. The browser-check problem for a favicon request (a 404 on the very first page of a browser) is not new.

---

## 16. M74: The harbour coach, and leaving the berth

**Independent review: required** (new check fields read shared harbour state; mistakes from damage reports, some serious; a new run option in links; new logged actions in `reduce`).

What the owner sees: a new group "Harbour and anchor" in the Exercises list with **Leaving the berth**: the boat lies stern-to in our berth with the lines on and the engine running; the setup card has a **Level** row (Easy, Normal, Hard); the steps tick off as the lazy line and the stern lines are let go and she motors out and turns towards the entrance; a magenta outline shows where to go; a light touch pauses with an explanation, a hard knock ends the exercise; the debrief lists the line, thruster and fender actions.

### 16.1 Files

New: `src/render3d/exerciseTarget.ts` (and `SCENE.exerciseTarget` in `src/render3d/sceneConfig.ts`), `tests/harbourPilot.ts` (the scripted good runs, 16.7; a helper, not a test file), `tests/harbourExercises.test.ts`, `scripts/shots-m74.mjs`. Changed: `content/exercises/exercises.json` (`leave-berth`), both `exercises.json` texts, `src/model/exercises.ts` (16.3), `src/app/exerciseRun.ts` (contact triggers, `level`, `shownTarget`, the new logged actions), `src/app/urlState.ts` (`exl`, `levels`), `src/render3d/scene.ts` (adds the target), `src/ui/mapView.ts` (the target on both maps), `src/ui/exercisePanel.ts` (Level row; `opens` `harbour` and `anchor`; group), `src/ui/exerciseCoach.ts` (two new target rows), `src/ui/exerciseDebrief.ts` (`actionText` for the new actions), `src/style.css`, both `ui.json`, `content/registry/parts.json` (`env_exercise_target`), both glossaries, `docs/review/ru.md`, `docs/review/ru-exercises.md`, `tests/exercises.test.ts`, `tests/exerciseRun.test.ts`, `tests/urlState.test.ts`, `tests/debrief.test.ts`, `scripts/shots.mjs`, `scripts/ui.mjs` (`TAB_OF_JS` unchanged; a helper `exerciseLevel(page, level)` that taps `exercise-level-<level>`), `docs/WORKFLOW.md` (ticks), `src/app/app.ts` (`__sailExercise.read()` gains the fields of 16.8), `docs/EXERCISES.md` (EX-A "Leaving" now an exercise; the harbour mistakes in "When an exercise pauses"), `docs/CODE_MAP.md`.

### 16.2 Data

Append to `exercises` (`content/exercises/exercises.json`):

```json
{
  "id": "leave-berth", "group": "harbour", "ropes": "easy", "crew": false,
  "sections": ["engine", "harbour", "autopilot", "helm", "ropes", "status", "conditions", "learn"],
  "start": "?pl=marina&ml=spacious&tr=empty&pe=3.3&pn=1490.4&hdg=180&ln=sp:2.6,ss:2.6,ll:12.33&wd=-90&ws=4&eng=1&lv=0&ap=off&sea=flat&fd=1&bs=0",
  "levels": { "normal": "?ml=medium&tr=half&pe=2.8&ws=8", "hard": "?ml=medium&tr=busy&pe=2.8&ws=14" },
  "targets": [{ "id": "fairway", "shape": "fairway" }],
  "steps": [
    { "id": "lazy-off", "opens": "harbour", "holdS": 1, "check": { "linesOff": ["ll"] } },
    { "id": "stern-off", "opens": "harbour", "holdS": 1, "check": { "linesOff": ["sp", "ss"] } },
    { "id": "motor-out", "opens": "engine", "holdS": 1, "show": "fairway", "check": { "target": { "id": "fairway", "point": "stern" } } },
    { "id": "turn-out", "opens": "engine", "holdS": 3, "show": "fairway", "check": { "target": { "id": "fairway", "point": "centre" }, "headingDeg": { "to": 270, "within": 15 }, "speedKn": [0.3, 4] } }
  ],
  "mistakes": [
    { "id": "touch", "serious": false, "on": { "alert": "contact", "severity": ["touch", "bump"], "obstacle": ["yacht", "harbour"] } },
    { "id": "hard-hit", "serious": true, "on": { "alert": "contact", "severity": ["knock", "hit"], "obstacle": ["yacht", "harbour"] } },
    { "id": "propeller", "serious": true, "on": { "alert": "contact", "obstacle": ["propeller"] } }
  ]
}
```

The **marina mistakes** are these three (`touch`, `hard-hit`, `propeller`); the **bay mistakes** (M76's buoy, M77) are `aground` (`["touch", "bump"]`, `["ground"]`, not serious), `aground-hard` (`["knock", "hit"]`, `["ground"]`, serious) and `propeller`. A contact with a fender between (`fender`) is never a mistake (owner, answer 4).

### 16.3 Model and app logic

`src/model/exercises.ts`:

```ts
export type ExerciseGroup = 'sailing' | 'wind' | 'sails' | 'harbour';
export type ExerciseOpens = 'ropes' | 'autopilot' | 'engine' | 'sails' | 'harbour' | 'anchor';
export type ExerciseLevel = 'easy' | 'normal' | 'hard';
export type BoatPoint = 'bow' | 'stern' | 'centre';
export type ObstacleKind = 'yacht' | 'harbour' | 'ground' | 'propeller' | 'fender';
export type ExerciseTarget =
  | { id: string; shape: 'circle'; eastM: number; northM: number; radiusM: number }
  | { id: string; shape: 'fairway' }   // the marina's fairway rect for the state's layout
  | { id: string; shape: 'berth' };    // our berth: |east − centre| ≤ width/2, north from F − sternGap − berthZone to F − sternGap
export interface ExerciseCheck {
  // … as today, and (M74):
  target?: { id: string; point: BoatPoint; inside?: boolean };
  headingDeg?: { to: number; within: number };
  quayGapM?: Range; berthOffsetM?: Range;
  linesOn?: readonly LineCode[]; linesOff?: readonly LineCode[]; linesTight?: readonly LineCode[];
  fendersOut?: boolean;
  anchor?: { phase?: readonly AnchorPhase[]; chainOutM?: Range; scopeOk?: boolean };
}
export interface ExerciseStep { id: string; opens: ExerciseOpens; holdS: number; show?: string; check: ExerciseCheck }
export type MistakeTrigger =
  | { alert: AlertKind; accidental?: boolean; severity?: readonly Severity[]; obstacle?: readonly ObstacleKind[] }
  | { condition: ExerciseCheck; forS: number };
export interface ExerciseDef {
  // … as today, and:
  levels?: Partial<Record<'normal' | 'hard', string>>;  // query keys that replace the start's for that level; the start is Easy
  targets?: readonly ExerciseTarget[];
}
export interface CheckSource {
  wind: WindNow; boat: BoatState; motion: MotionReport | null; rig: RigState; controls: Controls; engine: EngineState;
  harbour?: HarbourState; lines?: LinesState; anchor?: AnchorState;   // M74: optional, so older hand-built test sources still compile; AppState has all three
}
export interface CheckContext { events: readonly ExerciseEvent[]; gusts: number; targets?: readonly ExerciseTarget[] }

/** A point of the boat on the map (PHASE10_SPEC 16.3): bow = the stem, transomX + loa forward of the transom; stern = the transom's middle; centre = the boat's origin. */
export function boatPoint(boat: BoatState, point: BoatPoint, data?: BoatData): [number, number];
/** The kind of thing a damage report's obstacle is. */
export function obstacleKind(obstacleId: string): ObstacleKind;
/** A target as a shape on the map for the state's layout. */
export type ResolvedTarget = { shape: 'circle'; eastM: number; northM: number; radiusM: number } | { shape: 'rect'; rect: Rect };
export function resolveTarget(target: ExerciseTarget, harbour: HarbourState, areaData: AreaData = area): ResolvedTarget; // marinaGeometry(harbour.layout, harbour.traffic, areaData)
export function insideTarget(target: ResolvedTarget, eastM: number, northM: number): boolean;
```

- `boatPoint`: with `h = headingDeg` in radians, a point at boat x is `(eastM + x·sin h, northM + x·cos h)`; bow x = `hull.transomX + hull.loa` (−8.6 + 15.55 = 6.95), stern x = `hull.transomX` (−8.6), centre x = 0. Read `boat` at call time (3.4).
- `obstacleKind`: `'yacht-…'` → `yacht`; `quay`, `wall`, `pontoon` and `breakwater-…` → `harbour`; `bottom`, `land` → `ground`; `propeller` → `propeller`; `fender` → `fender`; anything else → `harbour`.
- `resolveTarget`: `circle` as given; `fairway` → `{ shape: 'rect', rect: marinaGeometry(harbour.layout, harbour.traffic).fairway }`; `berth` → the rect `{ west: c − w/2, east: c + w/2, south: F − g − Z, north: F − g }` with `c` = `ourBerth.centreEastM`, `w` = `ourBerth.widthM`, `F`, `g`, `Z` = `quayFaceNorthM`, `sternGapM`, `berthZoneM`. `insideTarget`: distance ≤ radius, or `insideRect`.
- **Where the numbers come from:** `quayFaceNorthM`, `sternGapM`, `berthZoneM` from `area.marina` (the module's `area` import from `./area`); `ourBerth` and `fairway` from `marinaGeometry(harbour.layout, harbour.traffic)`. `checkPasses` keeps its three parameters. Everything stays pure (`src/model` imports only `src/model`).
- **`checkPasses`, the new fields** (all must hold; each false when the source lacks `harbour`, `lines` or `anchor` it needs):

| Field | Holds when |
|---|---|
| `target` | `insideTarget(resolveTarget(t), …boatPoint(boat, point)) === (inside ?? true)`, `t` = `context.targets` entry with that id (no entry: false) |
| `headingDeg` | `Math.abs(wrap180(boat.headingDeg − to)) ≤ within` |
| `quayGapM` | `harbour.place === 'marina'` and `quayFaceNorthM − boatPoint(boat, 'stern')[1]` in range |
| `berthOffsetM` | `harbour.place === 'marina'` and `|boatPoint(boat, 'stern')[0] − ourBerth.centreEastM|` in range |
| `linesOn` | every code is in `lines.lines` |
| `linesOff` | no code is in `lines.lines` and none is `lines.crew?.code` |
| `linesTight` | every code is in `lines.lines` and `!canTighten(code, { lines, boat, harbour, geometry: marinaGeometry(harbour.layout, harbour.traffic), engine, area })` (hand tight; the same `LinesInputs` that `store.ts`'s private `linesInputs` builds, made here from the source) |
| `fendersOut` | `harbour.fendersOut === fendersOut` |
| `anchor.phase` | `anchor.phase` is in the list |
| `anchor.chainOutM` | `anchor.chainOutM` in range |
| `anchor.scopeOk` | `(phase is 'bottom' or 'set' and chainOutM ≥ scopeNeededM(depthAt(anchor.eastM, anchor.northM), wind.twsKn)) === scopeOk` |

- The loader's check (6.7 test 1) accepts these fields, `show`, `levels` and `targets`; a step's `show` and a check's `target.id` must name a target of the def; `levels` keys only `normal`, `hard`.
- **`checkTargets`** gains two rows after the control rows: `{ kind: 'heading'; to; within }` from `headingDeg` and `{ kind: 'quayGap'; range: Range }` from `quayGapM`; `TargetRow` gets both kinds, and `targetReading` two branches: `heading` → `{ ok: |wrap180(heading − to)| ≤ within, value: Math.round(((heading % 360) + 360) % 360) }`; `quayGap` → `{ ok: as the check, value: Math.round(gap · 10) / 10 }` (`null` outside the marina). `exerciseCoach.ts` adds the two labels and `nowText` branches (16.5).

`src/app/exerciseRun.ts`:

- `ExerciseOptions` gains `level: ExerciseLevel`; `DEFAULT_OPTIONS.level = 'easy'`. The level is chosen by loading the start link again (16.4, 16.5), because the marina is rebuilt: `setRunOptions` ignores a `level` key in `{ options }` (the run keeps its level). (The code's `ExerciseOptions.pauseOnStep` and `LoggedAction`'s realistic `on?` stay as built; 4.1's listing predates them.)
- `stepExercise` passes `context.targets = def.targets ?? []` and the source is `next` (it has `harbour`, `lines`, `anchor`).
- **Alert mistakes:** after today's `alert` and `accidental` tests, a trigger with `severity` matches only an entry with `entry.contact` whose `severity` is in the list; with `obstacle` only an entry with `entry.contact` whose `obstacleKind(entry.contact.obstacleId)` is in the list. (So `{ alert: 'contact', obstacle: ['propeller'] }` matches the propeller report.) Everything else (the repeat gap, `steps`, the settle second, serious ends the run) is M67's.
- `export function shownTarget(state: AppState): ResolvedTarget | null`: with a run in `setup`, `running`, `mistake` or `failed` whose current step (`steps[run.step]`) has `show`, `resolveTarget(def.targets.find((t) => t.id === show), state.harbour)`; otherwise `null`.
- **Logged actions** (`logAction`, M68 8.3), added to `LoggedAction`:

```ts
| { type: 'line'; code: LineCode; command: 'take' | 'tighten' | 'ease' | 'letGo'; times?: number }
| { type: 'thruster'; which: 'bow' | 'stern'; dir: -1 | 1 }      // only a press (dir ≠ 0); letting go is not logged
| { type: 'windlass'; motion: 'down' | 'up' }                     // only a press; 'off' is not logged
| { type: 'fenders'; out: boolean }
```

  from the actions `line`, `thruster`, `windlass`, `setFenders` (`store.ts` already calls `logAction` for every action while the run is running or in `mistake`; only `logAction`'s cases in `exerciseRun.ts` change). Merging: a `line` action whose `code` and `command` equal the last logged entry's, within `settings.controlMergeS` of it, raises that entry's `times` (from 1; absent = 1) instead of adding an entry; `thruster`, `windlass` and `fenders` entries never merge (each press is one entry). A different `code`, `command`, `which`, `dir`, `motion` or `out` is a new entry. A refused action (the state did not change: `next.lines === state.lines` for `line`, likewise `thrusters`, `anchor.windlass`, `harbour.fendersOut`) is not logged.

`src/ui/exerciseDebrief.ts` `actionText`: `line` → `t('debrief.line', { line: t('lines.name.' + code), command })` with `command` = `t('lines.take.' + code)` for `take`, else `t('lines.' + command)`; then if `times > 1`, `t('debrief.times', { text, n: times })`. `thruster` → `t('debrief.thruster.' + which, { side: t(dir > 0 ? 'debrief.side.starboard' : 'debrief.side.port') })`. `windlass` → `t('debrief.windlass.' + motion)`. `fenders` → `t(out ? 'debrief.fenders.out' : 'debrief.fenders.in')`.

### 16.4 Store and URL

| Key | Values | Default | Written |
|---|---|---|---|
| `exl` | `normal`, `hard` | `easy` (no key) | in an exercise's start or waypoint link when the run's `level` is not `easy` |

- **Parsing `ex` with `exl`** (no `exw`), a def with `levels`: start from `def.start`'s keys; the level's query keys replace or add keys (`levels[level]`); then the viewer's keys (4.3); `options.level = level`. A def without `levels`, or an unknown value: `level` stays `easy` and no keys change. With `exw` (a waypoint link) the waypoint's own keys are used and `exl` only sets the option.
- `exerciseStartLink(id, state, ropes, options?: Partial<ExerciseOptions>)`: the options are the current run's (`state.exercise?.options`, else `DEFAULT_OPTIONS`) with the fourth argument over them (the Level row passes `{ level }`); so `serializeUrlState`'s existing three-argument call keeps the run's level. It writes `exl` last, after `exc`, when the level is not `easy`. `waypointLink` writes `exl` the same way (last); the waypoint branch of the parser adds `exl` to the keys it reads and deletes (`ex`, `exw`, `exp`, `exs`, `exc`, `exl`) before `parseUrlState` reads the rest.
- `store.ts`: no change (16.3: `logAction` is already called for every action). The locked actions of 4.2 stay locked; `line`, `thruster`, `windlass`, `setFenders` and `clearPropeller` are the learner's and stay allowed.

### 16.5 UI and 3D

- **List:** a fourth group heading `t('exercise.group.harbour')` after "Setting and furling the sails".
- **Setup card:** for a def with `levels`, a row **Level** (`t('exercise.level')`) after the Ropes row: three toggle buttons `exercise-level-easy`, `exercise-level-normal`, `exercise-level-hard` (`aria-pressed` on the chosen one, `t('exercise.level.easy')` …) and `t('exercise.level.hint')`. A tap on another level calls `loadExercise(store, id, state.settings.ropesMode, { level })`; `loadExercise` gains the fourth parameter `options?: Partial<ExerciseOptions>` and passes it to `exerciseStartLink`. Style: the same segment buttons as the Ropes row (`.exercise-ropes-choices`), touch target ≥ 44 px.
- **"Show the controls"** (6.5): `opens: 'harbour'` shows the Harbour gear section (available in both ropes modes); `opens: 'anchor'` shows the Anchor section, or, when `sectionAvailable('anchor', …)` is false (Realistic ropes), the Ropes section (the Bow station is there): add this remap beside today's `engine`/`autopilot` → `helm` remap in `exercisePanel.ts`.
- **Hint window rows** (`exerciseCoach.ts`): `heading` → `t('exercise.target.heading', { to: pad3(to), within })` with the reading `t('exercise.target.nowDeg', { value: pad3(value) })`; `quayGap` → `t('exercise.target.quayGap', { min, max })` with `t('exercise.target.nowM', { value })` (one decimal). `pad3(n)` is a private function in `exerciseCoach.ts`: `String(Math.round(((n % 360) + 360) % 360)).padStart(3, '0')` (270 → "270", 90 → "090").
- **3D target** (`src/render3d/exerciseTarget.ts`, `buildExerciseTarget(): { object: THREE.Group; update(state: AppState): void }`, added to the world group like `marina.ts`): each frame reads `shownTarget(state)`; `null` hides it. A circle is a flat ring (`THREE.RingGeometry` from `radius − 0.15` to `radius`, 64 segments), a rect is four flat strips 0.3 m wide along its edges; both lie at `y = 0.12` above the still water level (the marina's `sea=flat`; the bay's `sheltered` waves are small), colour `SCENE.exerciseTarget.colour` `'#d63cff'`, `opacity` 0.85, `depthWrite: false`; `userData.partId = 'env_exercise_target'`. Rebuilt only when the resolved target changes (compare a key string of its numbers). Put `exerciseTarget: { colour: '#d63cff', opacity: 0.85, lineM: 0.3, aboveM: 0.12 }` into `SCENE`.
- **Maps:** `mapView.ts` draws `shownTarget(state)` after the harbour and before the boat on both maps (`drawMap` and `drawMiniMap`), with the same map-to-screen transform each uses for the harbour (the mini-map's canvas clips what lies outside): a dashed line (`setLineDash([6, 4])`, 2 px, colour `#d63cff`) round the circle or rect.

### 16.6 Texts and strings

`content/lang/en/exercises.json`, appended (Russian drafts in the ru file, same keys):

```json
"leave-berth": {
  "title": "Leaving the berth",
  "summary": "Let go the lazy line and the stern lines, motor out of the berth and turn towards the entrance.",
  "see": "She lies stern-to in her berth: two stern lines to the quay, the lazy line (a sunk rope from the quay) holding the bow, the engine running in neutral. Other yachts may lie on both sides.",
  "happening": "Once the lines are off, nothing holds her. A side wind pushes a slow boat sideways and blows the bow off, so go out at a steady pace and turn as soon as the stern is clear of the other boats' bows.",
  "action": "Let go the lazy line first, then both stern lines; motor slowly ahead out of the berth; when the stern is clear, stop and turn her with both thrusters until she points west to the entrance; then motor ahead.",
  "mistake": "Turning too early: the stern swings sideways into the boat next door. Or going too fast and hitting the boats across the fairway (the lane between the rows).",
  "done": "You are out of the berth and heading for the entrance. Lazy line first, stern lines next, out slowly, and turn only when the stern is clear.",
  "steps": {
    "lazy-off": { "goal": "Let go the lazy line.", "how": "Open Harbour gear. Under Lines, tap Let go on \"Lazy line (to the bow)\". It sinks to the bottom, clear of the propeller." },
    "stern-off": { "goal": "Let go both stern lines.", "how": "In Harbour gear, tap Let go on both stern lines. Now only the engine and the thrusters hold her." },
    "motor-out": { "goal": "Motor ahead until the stern is out of the berth, in the fairway (inside the magenta outline).", "how": "Open Engine. Drag the engine lever just past Neutral towards Ahead (the line under it says \"In gear: ahead\"): slow ahead. Keep the wheel straight. In a strong side wind push it a little further (about a third of the way to Ahead) so she does not drift onto the boat next door." },
    "turn-out": { "goal": "Turn until she points west (270°, towards the entrance) and motor slowly ahead.", "how": "Lever back to Neutral. Hold the bow thruster to starboard and the stern thruster to port: she turns on the spot to the right. When the compass shows about 270°, let go of both and give slow ahead." }
  },
  "mistakes": { "touch": T, "hard-hit": T, "propeller": T }
}
```

`T` stands for the texts of the table below: each exercise's `mistakes` object holds, for every mistake id its data lists, `{ "name", "what", "why", "fix" }` copied from this table (the same words in every exercise), plus the exercise's own mistakes given in its section. The harbour mistakes' texts:

| Id | name | what | why | fix |
|---|---|---|---|---|
| `touch` | A light touch | She touched another boat or the quay without a fender between. | Slow boats drift with the wind; a touch at walking pace scratches the gelcoat but rarely does more. | Slow down, use the thrusters to hold her off, and put the fenders out on the side that is close. |
| `hard-hit` | A hard knock | She hit another boat or the quay hard. The exercise stops here. | At more than about one knot, ten tonnes of boat dents a hull or breaks a rail, even with fenders. | Go slower near other boats and the quay: in a harbour, never faster than you would walk. Tap Try again. |
| `propeller` | A rope round the propeller | A rope in the water caught round the propeller and the engine stopped. The exercise stops here. | A slack line near the stern is sucked into a turning propeller (PT-52). Without the engine you cannot steer in the harbour. | Keep the engine in neutral while a line is slack in the water or the crew is handling one; tighten or let go the line first. Tap Try again. |
| `aground` | Touched the bottom | The keel touched the bottom. | The water there is shallower than her keel (2.4 m); watch the depth on the strip. | Go gently astern into deeper water and keep where the depth shows more than 3 m. |
| `aground-hard` | Ran aground | She ran onto the bottom or the rocks hard. The exercise stops here. | Fast onto the bottom the keel sticks and the hull can be damaged (PT-53). | Watch the depth and come in slowly. Tap Try again. |

Russian drafts of these and of every text in this part are written by the builder (PHASE4_SPEC 3.3), `"$status": "draft"`.

`ui.json` (both, after the keys of the same prefix; Russian drafts):

| Key | English |
|---|---|
| `exercise.group.harbour` | Harbour and anchor |
| `exercise.level` | Level |
| `exercise.level.easy` | Easy |
| `exercise.level.normal` | Normal |
| `exercise.level.hard` | Hard |
| `exercise.level.hint` | Easy: wide berths, an empty marina, a light wind. Normal: medium berths, half full, a moderate side wind. Hard: every berth taken and a strong side wind. |
| `exercise.target.heading` | Heading {to}° (±{within}°) |
| `exercise.target.quayGap` | Stern {min}–{max} m from the quay |
| `exercise.target.nowM` | now {value} m |
| `debrief.line` | {line}: {command} |
| `debrief.times` | {text} ×{n} |
| `debrief.thruster.bow` | Bow thruster {side} |
| `debrief.thruster.stern` | Stern thruster {side} |
| `debrief.side.port` | to port |
| `debrief.side.starboard` | to starboard |
| `debrief.windlass.down` | Chain out |
| `debrief.windlass.up` | Chain in |
| `debrief.fenders.out` | Fenders out |
| `debrief.fenders.in` | Fenders in |

Registry: `env_exercise_target` (`kind: "environment"`, `phase: 10`, `group: "harbour"`, `status: "draft"`, `sources: []`, `related: []`, no `showMe`), glossary: name "Exercise target" / «Цель упражнения», short "Where the exercise wants the boat to go: a magenta outline on the water and on the map.", what "Drawn only while an exercise step needs it. It is not on the real water: it is the app's way of pointing.", onThisBoat "—", no mistakes. `NOT_DRAWN` does not list it (it is drawn).

### 16.7 Tests

**The pilots** (`tests/harbourPilot.ts`): a scripted learner per exercise, used by the good-run tests of M74–M78 (and the browser checks may copy their logic). Each is a factory returning `(s: AppState, t: number) => AppState`, called once per frame before `reduce(s, { type: 'step', dt: 0.05 })`; `t` is the test loop's app seconds since Start (the sum of the frames' `dt`); a pilot reads `s.exercise!.step` (or keeps its own phase, as `enterPilot` does) and dispatches with `reduce`. A pilot may send an action that is refused (it changes nothing). Shared helpers (exact; `boatPoint` and `wrap180` imported from `src/model/exercises.ts` and `src/model/angles.ts`):

```ts
const A = (s: AppState, a: unknown) => reduce(s, a as Action);
const H = (s: AppState) => ((s.boat.headingDeg % 360) + 360) % 360;
export const lever = (s: AppState, p: number) => (s.engine.leverPct === p ? s : A(s, { type: 'engine', command: { leverPct: p } }));
export const rudder = (s: AppState, d: number) => (s.controls.ctl_rudder === d ? s : A(s, { type: 'setControls', values: { ctl_rudder: d } }));
export const line = (s: AppState, code: LineCode, command: 'take' | 'tighten' | 'ease' | 'letGo') => A(s, { type: 'line', code, command });
export const thr = (s: AppState, which: 'bow' | 'stern', dir: -1 | 0 | 1) => (s.thrusters[which] === dir ? s : A(s, { type: 'thruster', which, dir }));
export const windlass = (s: AppState, motion: 'off' | 'down' | 'up') => (s.anchor.windlass === motion ? s : A(s, { type: 'windlass', motion }));
const stern = (s: AppState) => boatPoint(s.boat, 'stern');
const bow = (s: AppState) => boatPoint(s.boat, 'bow');
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
```

M74's pilot, `leavePilot(level: ExerciseLevel)` (`lv = level === 'hard' ? 30 : 15`, `turned = false` in the closure): step 0 → `line(s, 'll', 'letGo')`; step 1 → let go `sp` and `ss`; step 2 → `lever(s, lv)`; step 3 → while `!turned && |H(s) − 270| > 10`: `thr(thr(rudder(lever(s, 0), 30), 'bow', 1), 'stern', -1)`; then `turned = true` and `thr(thr(rudder(lever(s, 15), 0), 'bow', 0), 'stern', 0)`.

**The good-run test** (`tests/harbourExercises.test.ts`): open the start link with `parseUrlState(exerciseStartLink(id, initialState(), 'easy', { level }))`, dispatch `start`, then each frame `s = pilot(s, t)` and `s = reduce(s, step 0.05)` until the run is `done` or the limit; record each step's time (`elapsedS` at each `step` log entry). Each step must finish within its limit (app seconds from the step's start; prototype 2026-11-02 in brackets); the run must end `done` with no `mistake` log entry:

| Level | lazy-off | stern-off | motor-out | turn-out |
|---|---|---|---|---|
| easy | ≤ 3 (1.0) | ≤ 3 (1.0) | ≤ 50 (34.2) | ≤ 38 (25.1) |
| normal | ≤ 3 (1.0) | ≤ 3 (1.0) | ≤ 49 (33.6) | ≤ 38 (25.2) |
| hard | ≤ 3 (1.0) | ≤ 3 (1.0) | ≤ 38 (24.8) | ≤ 36 (23.1) |

The prototype found no contact other than `fender` in these runs (at Hard the neighbours' fenders touch: not a mistake).

Other tests:
1. `tests/exercises.test.ts`: the loader accepts `leave-berth`; rejects a step `show` naming no target, an unknown check field, a `levels` key other than `normal`/`hard`.
2. `checkPasses` per new field, on hand-built sources: `boatPoint` at heading 180 from (2.8, 1490.4): stern (2.8, 1499.0), bow (2.8, 1483.45); `quayGapM [0.5, 1.5]` holds there (gap 1.0) and fails with `place: 'open'`; `berthOffsetM [0, 0.1]` holds for medium (centre 2.75: offset 0.05); `linesOff ['ll']` fails while `crew.code === 'll'`; `anchor.scopeOk` true with `phase 'set'`, `chainOutM 50`, the anchor at (−1600, 0) and 6 kn (needed `scopeNeededM(depthAt(-1600, 0), 6)` = 47.2 m: the depth there is 10.0 m), false with 40 m; `target` `fairway`/`centre` holds at (−95, 1468) for medium, fails at (−95, 1490).
3. `obstacleKind`: `yacht-0-11` → yacht, `breakwater-west` → harbour, `quay` → harbour, `bottom` → ground, `land` → ground, `propeller` → propeller, `fender` → fender.
4. `tests/exerciseRun.test.ts` (an entry built as the existing tests build the gybe entries: `{ n: run.seenAlertN + 1, kind: 'contact', atS, severity: 'warning', contact: report }` added to `next.alerts.entries` with `written` raised, after the settle second): a `contact` alert entry with `severity: 'bump'`, `obstacleId: 'yacht-0-11'` fires `touch` (status `mistake`); `knock` fires `hard-hit` (status `failed`); `fender` fires nothing; `propeller` fires `propeller` (`failed`).
5. Logging (on the started `leave-berth` run): `line ll letGo` logs `{ type: 'line', code: 'll', command: 'letGo' }`; three `line sp ease` within 3 s log one entry with `times: 3` (easing always works below the line's maximum length); `thruster bow 1` then `thruster bow 0` log one entry; on a started `enter-berth` run (no lines on, the stern 35 m from the quay) `line sp take` is refused and logs nothing. `actionText` gives "Stern line, port: Ease ×3" and "Bow thruster to starboard".
6. `tests/urlState.test.ts`: `exl=hard` with `ex=leave-berth` opens `ml=medium`, `tr=busy`, `ws=14`, `options.level === 'hard'`; `exerciseStartLink` writes `exl=hard` and no `exl` for easy; `exl=hard` on `ex=points-of-sail` is ignored (`level 'easy'`, no change); an old exercise link is unchanged.
7. `shownTarget`: in setup at step 2 of `leave-berth`, the fairway rect of the start's layout (spacious: `{ west: −110, east: 110, south: 1443, north: 1483 }`); at step 0 `null`.

### 16.8 Browser checks (`scripts/shots-m74.mjs`, test clock)

`window.__sailExercise.read()` (`app.ts`) keeps its fields and gains `eastM`, `northM`, `headingDeg`, `speedMps` (`state.boat`), `leverPct` (`state.engine.leverPct`), `thrusters` (`{ bow: -1 | 0 | 1; stern: -1 | 0 | 1 }`, `state.thrusters`), `lines: string[]` (the codes on), `crew: string | null` (`lines.crew?.code`), `anchorPhase` and `chainOutM` (`state.anchor`) so the checks can run a pilot's logic.

Scenes: `leave-setup` (`?m=exercise&ex=leave-berth`), `leave-setup-hard` (`?m=exercise&ex=leave-berth&exl=hard`). The outline pictures are taken in live check (2): after steps 0–1 pass (step 2 shows the fairway), a screenshot `leave-target` with `cam=top` and `leave-map` with the map open (`setCamera`).

Live checks: (1) `m74 level`: on `leave-setup` tap `exercise-level-hard`: the address has `exl=hard`, the Hard button is pressed, `read().twsKn` is 14. (2) `m74 good run` (phone only, as M69's long runs): Start, then drive the steps through `window.__sailExercise.dispatch` with `leavePilot('easy')`'s logic (port it to the page: poll `state()` every 0.25 s of app time with `page.waitForTimeout(250)`), until "Well done!"; the debrief shows "Lazy line (to the bow): Let go". (3) `m74 touch`: `?m=exercise&ex=leave-berth&exl=normal&debug=1`, Start, let go all lines, `engine { leverPct: -40 }` for 4 s (she backs into the quay with her transom, where no fender hangs): the mistake card shows "A light touch" or "A hard knock" (whichever the speed gives; the check accepts either). (4) The accessibility audit with the setup card (Level row) shown.

### 16.9 Done when

Leaving the berth works at every level on a phone; the outline shows on the 3D view and both maps; a knock ends the run with its card; the debrief names line, thruster and fender actions; old exercise links work as before; all checks pass.

### 16.9a Owner request added in the M73 PR: the moored yachts' bow lines (drawn in M74; the Hard obstacle is built in M75, 17.4)

Owner (PR 157 chat): in a real marina every moored yacht lies on a bow line (the lazy line, a rope from her bow down into the water at about 45°), and these lines narrow the room to manoeuvre. Wanted in M74, not a later milestone:

- **Drawn at both levels:** a thin line from each moored yacht's bow down into the water, about 45° (the instanced moored yachts of M73 are the place to add it). The M73 budget is tight (250 draw calls at High of 300; 110 at Low of 150), so the lines must share one instanced mesh and the budget cases must still pass.
- **Counted in Hard only (the realistic version):** the lines are obstacles. The boat's bow can hit one, and the engine can suck one in (the existing `propeller` mistake of 16.2, which today covers the boat's own lines). In Easy the lines are only drawn and nothing happens.
- **Settled by the refresh before M75 (22.4):** no obstacle shape and no force: a line is a slope in the water ahead of each moored yacht's bow; on Hard our propeller over one in gear fouls (the `propeller` mistake), our keel or rudder over one makes a `touch` report of kind `lazy-line` and its own mistake, `lazy-line`; the part id is `rope_lazy_line` (no new registry or glossary entry). Built in M75 (17.4).

### 16.11 Decided in the M74 PR (recommended; merging accepts it)

- **Built as 16.1–16.8 say**, with these differences: the start link of `leave-berth` has `wd=-90` instead of `wd=270` (the wind control runs from −180 to 180, so `wd=270` was ignored and the wind blew from 60°; −90 is the same west wind); the good-run limits of 16.7 held without tuning (measured step times in app seconds: easy 1.0, 1.0, 34.6, 25.3; normal 1.0, 1.0, 35.0, 26.1; hard 1.0, 1.0, 26.3, 26.4).
- **New files not named in 16.1:** `tests/harbourChecks.test.ts` holds tests 2–7 of 16.7 (new check fields, `obstacleKind`, the contact mistakes, the logged actions, `exl`, `shownTarget`) instead of spreading them over four older test files; the loader test of `tests/exercises.test.ts` also checks that every `show` and check `target` names a target and that `levels` has only `normal` and `hard`. `tests/languages.test.ts` lists `debrief.line` and `debrief.times` as texts that are the same in Russian (placeholders only).
- **16.9a, the bow lines:** drawn at both levels as one instanced mesh of thin rods (8 m ahead and 8 m down from each moored yacht's bow, `SCENE.harbour.bowLine`), carrying the part id of the lazy line (`rope_lazy_line`: a tap names it; no new registry entry). **Not built:** the Hard obstacle (the bow hits a line, the engine sucks one in). The model's obstacles depend only on the layout and the traffic, not on the exercise's level, so a Hard-only obstacle needs a new piece of state and a link key; the shape, the `lazy-line` kind (already in `ObstacleKind`) and whether a touch is a `touch` or its own mistake are for `/plan 10 refresh`. This is question 1 in the PR.
- **`loadExercise` from the list** keeps the current run's level when it opens another exercise with levels (an exercise without levels ignores it).

### 16.10 Not in M74

Texts per ropes mode (13.3 still applies: the How texts describe the Easy controls); moving boats; a score.

---

## 17. M75: Entering the berth stern-to

**Independent review: required** (it teaches docking speeds and when the engine must stay in neutral near a line, PT-52: a wrong text teaches an unsafe habit; on Hard the neighbours' bow lines change the shared step, 17.4).

What the owner sees: **Entering the berth stern-to**, with the three levels: fenders out, line up in front of the berth, back in slowly, stern lines, lazy line, tighten it; the stern stops a step from the quay. On Hard the neighbours' bow lines count (owner, 16.9a): the keel or rudder over one pauses with "Over a neighbour's lazy line", the propeller over one in gear ends the run with "A rope round the propeller".

### 17.1 Files

New: `scripts/shots-m75.mjs`. Changed: `content/exercises/exercises.json` (`enter-berth`; the `lazy-line` mistake appended to `leave-berth`), both `exercises.json` texts (`enter-berth`; the `lazy-line` mistake text in `leave-berth`), `tests/harbourPilot.ts` (`enterPilot`), `tests/harbourExercises.test.ts`, `tests/physicsTruths7.test.ts` (no change: PT-50 and PT-51 keep their own tests; 17.6 adds exercise tests named after them in `tests/harbourExercises.test.ts`), `docs/review/ru-exercises.md`, `docs/WORKFLOW.md` (ticks), `docs/CODE_MAP.md`, `scripts/shots.mjs`.

The bow lines on Hard (17.4): `content/areas/adriatic.json` (`marina.bowLine`, `marina.bowLineNote`), `src/model/area.ts` (their types), `src/model/marina.ts` (`bowLines`, `bowLinesUnder`, `bowLineHits`), `src/model/mooringLines.ts` (`LinesInputs.overBowLine`), `src/model/alerts.ts` (`alertLearnId`), `src/app/store.ts` (the `step` case), `src/ui/damageReport.ts` (`damageText`), `content/lang/en/ui.json` and `content/lang/ru/ui.json` (two damage strings), `docs/review/ru.md` (the two Russian strings), `tests/marina.test.ts`, `tests/mooringLines.test.ts`, `tests/alerts.test.ts`, `docs/BOAT_REFERENCE.md` (the `bowLine` row is already there, added by the refresh: no change unless a value changes). `docs/PHYSICS_TRUTHS.md` needs no change. CI (`ci.yml`, part `live, M75-M76`) and `shots.mjs`'s group matching already cover `m75`: register the new file in `shots.mjs` (import, `SCENES`, `liveGroups`) as 3.6 says, nothing else.

### 17.2 Data

```json
{
  "id": "enter-berth", "group": "harbour", "ropes": "easy", "crew": false,
  "sections": ["engine", "harbour", "autopilot", "helm", "ropes", "status", "conditions", "learn"],
  "start": "?pl=marina&ml=spacious&tr=empty&pe=-31.8&pn=1463.0&hdg=90&bs=0.5&wd=-90&ws=4&eng=1&lv=0&ap=off&sea=flat",
  "levels": { "normal": "?ml=medium&tr=half&pe=-32.3&pn=1468.0&ws=8", "hard": "?ml=medium&tr=busy&pe=-32.3&pn=1468.0&ws=14" },
  "targets": [{ "id": "berth", "shape": "berth" }],
  "steps": [
    { "id": "fenders", "opens": "harbour", "holdS": 1, "check": { "fendersOut": true } },
    { "id": "line-up", "opens": "engine", "holdS": 2, "show": "berth", "check": { "headingDeg": { "to": 180, "within": 15 }, "berthOffsetM": [0, 3], "speedKn": [-0.6, 0.6] } },
    { "id": "reverse-in", "opens": "engine", "holdS": 2, "show": "berth", "check": { "quayGapM": [0.5, 2.8], "berthOffsetM": [0, 1], "headingDeg": { "to": 180, "within": 10 }, "speedKn": [-0.2, 0.2] } },
    { "id": "stern-lines", "opens": "harbour", "holdS": 1, "check": { "linesOn": ["sp", "ss"] } },
    { "id": "lazy-line", "opens": "harbour", "holdS": 1, "check": { "linesOn": ["ll"] } },
    { "id": "made-fast", "opens": "harbour", "holdS": 5, "check": { "linesTight": ["ll"], "engine": { "gear": "neutral" }, "quayGapM": [0.3, 3.0], "headingDeg": { "to": 180, "within": 15 } } }
  ],
  "mistakes": [
    { "id": "touch", "serious": false, "on": { "alert": "contact", "severity": ["touch", "bump"], "obstacle": ["yacht", "harbour"] } },
    { "id": "hard-hit", "serious": true, "on": { "alert": "contact", "severity": ["knock", "hit"], "obstacle": ["yacht", "harbour"] } },
    { "id": "propeller", "serious": true, "on": { "alert": "contact", "obstacle": ["propeller"] } },
    { "id": "lazy-line", "serious": false, "on": { "alert": "contact", "obstacle": ["lazy-line"] } },
    { "id": "fenders-in", "serious": false, "on": { "alert": "fendersIn" } }
  ]
}
```

`wd=-90`, not `wd=270` (refresh, 22.4): the wind control runs from −180 to 180 and drops 270, as M74 found. −90 is the west wind of 22.2. `leave-berth` (built in M74) gets the same `lazy-line` mistake appended at the end of its `mistakes`.

`content/areas/adriatic.json`, `marina`, after `fendersHintNote`:

```json
"bowLine": { "deckAboveM": 1.3, "slope": 1, "catchM": 0.3 },
"bowLineNote": "assumption (owner, PR 157; PHASE10_SPEC 17.4): each moored yacht's lazy line leaves her bow 1.3 m above the water and runs straight ahead, 1 m down for every metre ahead (45°), as drawn (SCENE.harbour.hullAboveM, bowLine.runM); a part of our hull catches it when it is within 0.3 m to the side of the line (half the propeller's 0.5 m, plus the rope) where the line is not deeper than that part"
```

**Tunable:** none. `deckAboveM` must equal `SCENE.harbour.hullAboveM` (1.3) and `slope` must be 1 (the drawn rod runs `bowLine.runM` ahead and the same down), so the line the model uses is the one on the screen; a test checks both (17.6).

### 17.3 Texts (appended; `touch`, `hard-hit`, `propeller` as 16.6)

```json
"enter-berth": {
  "title": "Entering the berth stern-to",
  "summary": "Fenders out, line up, back in slowly, stern lines, lazy line, tighten.",
  "see": "You are in the fairway, the lane between the two rows of boats, motoring slowly east. Your berth is the gap with the yellow stripe on the quay, on the left; the magenta outline marks it.",
  "happening": "In the Mediterranean you go in stern first: the stern lines go to the quay and a lazy line from the quay holds the bow. Going astern, the propeller also pushes the stern sideways (prop walk; in the app to port), and a side wind pushes a slow boat sideways. On Hard the other boats' lazy lines count too: each runs from a boat's bow down into the fairway, so keep your keel and propeller clear of their bows.",
  "action": "Fenders out on both sides; motor just past the berth, stop, and turn her with the thrusters until the stern points at the berth; back in slowly, correcting with the thrusters; stop a step from the quay; the crew throws the stern lines, then picks up the lazy line and takes it to the bow; tighten it.",
  "mistake": "Coming in too fast: at more than walking pace you hit the quay or the boat next door. Or putting the engine in gear while the crew is handling a line: it can wrap round the propeller.",
  "done": "She is moored stern-to. Slow is the secret: stop first, then lines, then tighten the lazy line with the engine in neutral.",
  "steps": {
    "fenders": { "goal": "Put the fenders out.", "how": "Open Harbour gear and choose Fenders: Out. In a tight berth they take the knocks." },
    "line-up": { "goal": "Stop past the berth and turn until the stern points at it (bow 180°, south), the stern within 3 m of the berth's middle.", "how": "Engine: lever just past Neutral towards Ahead (slow ahead) until the mast is about 18 m before the berth, then the lever a third of the way towards Astern until she stops (the wind is behind her, so she glides further than you expect), then Neutral. Hold the bow thruster to starboard and the stern thruster to port until the compass shows 180°." },
    "reverse-in": { "goal": "Back into the berth slowly and stop with the stern 0.5–2.8 m from the quay.", "how": "Engine slow astern: the lever just past Neutral towards Astern (\"In gear: astern\"). Keep her straight with the thrusters: if the stern drifts left, a short push of the stern thruster to starboard, and the other way round. Near the quay, Neutral, and a touch ahead to stop." },
    "stern-lines": { "goal": "Throw both stern lines to the quay.", "how": "Harbour gear → Lines: tap \"Throw it to the quay\" on both stern lines. The stern must be within 4 m and nearly stopped." },
    "lazy-line": { "goal": "Pick up the lazy line and take it to the bow.", "how": "Tap \"Pick it up\" on the lazy line. The crew walks it to the bow (about 20 s). Keep the engine in neutral meanwhile." },
    "made-fast": { "goal": "Tighten the lazy line until it is hand tight, engine in neutral.", "how": "Tap Tighten on the lazy line until it says hand tight. It holds the bow off, the stern lines hold the stern: she cannot swing." }
  },
  "mistakes": {
    "touch": T, "hard-hit": T, "propeller": T, "lazy-line": L,
    // T: copy the object of that id from leave-berth's "mistakes" in the same file; L: the object below. Both in the Russian file too.
    "fenders-in": { "name": "Fenders still in", "what": "You are backing into the berth with the fenders in the locker.", "why": "Without fenders the first touch of the boat next door scratches both hulls.", "fix": "Harbour gear → Fenders: Out, before you come close." }
  }
}
```

`L`, the `lazy-line` mistake's text, the same in `enter-berth` and `leave-berth` (`content/lang/en/exercises.json`; the Russian is drafted by the builder, `draft`, and listed in `docs/review/ru-exercises.md`):

```json
"lazy-line": {
  "name": "Over a neighbour's lazy line",
  "what": "Your keel or rudder is over the lazy line of a boat next door, where the rope is still shallow.",
  "why": "The rope can catch on the keel or the rudder and pull her bow off; if the propeller turns over it, it winds round the propeller.",
  "fix": "Engine in neutral and let her drift clear. Then keep further from the other boats' bows: their lazy lines run out from there into the fairway."
}
```

`content/lang/en/ui.json`, after `damage.ground.rudder.hit`: `"damage.lazyLine.keel": "A neighbour's lazy line is under our keel: it can catch. Neutral, and drift clear."` and `"damage.lazyLine.rudder": "A neighbour's lazy line is under our rudder: it can catch. Neutral, and drift clear."`. Russian drafts in `content/lang/ru/ui.json`, listed in `docs/review/ru.md`.

### 17.4 Model, store, UI: the neighbours' bow lines on Hard (16.9a)

Everything else is M74's fields, levels, targets and mistakes. No new state, no new link key: the level is already in the run (`state.exercise.options.level`, link key `exl`). No force: a sunk rope does not stop a 15 t yacht, it catches on what is under her (22.4).

`src/model/marina.ts`:

```ts
/** A moored yacht's bow line (PHASE10_SPEC 17.4): from her bow straight ahead and down. */
export interface BowLine {
  /** The yacht's id with `yacht` replaced by `lazy-line`: `lazy-line-0-11`. */
  id: string;
  bowEastM: number;
  bowNorthM: number;
  /** The yacht's heading (her berth's `headingDeg`): the line runs this way from her bow. */
  headingDeg: number;
}
/** One per moored yacht, in `geometry.yachts` order; the same array for the same geometry (a WeakMap cache, as `marinaObstacles`). */
export function bowLines(geometry: MarinaGeometry): BowLine[];

export type BowLinePart = 'saildrive' | 'keel' | 'rudder';
export interface BowLineCatch { lineId: string; part: BowLinePart }
/** The parts of our hull over a bow line where it is not deeper than they are. */
export function bowLinesUnder(
  boat: BoatState,
  lines: readonly BowLine[],
  areaData: AreaData = area,
  data: BoatData = hanse508,
): readonly BowLineCatch[];
/** Shared empty result. */
export const NO_CATCHES: readonly BowLineCatch[];
/** The keel's and the rudder's catches as contact hits (the saildrive's make none). */
export function bowLineHits(catches: readonly BowLineCatch[]): ContactHit[];
```

New imports in `src/model/marina.ts`: `import { boat as hanse508, type BoatData } from './boat'`, `import type { ContactHit } from './lowSpeed'`, `import type { BoatState } from './motion'` (`area`, `AreaData` and `boatToMap` are imported already). In `src/app/store.ts`, add `bowLines`, `bowLinesUnder`, `bowLineHits` and `NO_CATCHES` to the existing import from `'../model/marina'`.

- `bowLines`: for each yacht, `h = yacht.berth.headingDeg` in radians; `bowEastM = berth.centreEastM + lengthM·sin h`, `bowNorthM = berth.sternNorthM + lengthM·cos h` (the point `src/render3d/marina.ts` `buildBowLines` draws from).
- `bowLinesUnder`: four points of our hull on its centreline (boat frame x, z = 0), each with its depth below the water `d`: the saildrive (`hull.saildrive.x` −4.4, `d = −hull.saildrive.bottomY` 1.45), the keel bulb's front (`hull.keel.bulb.fwdX` −0.08) and back (`bulb.aftX` −2.69, both `d = −bulb.bottomY` 2.4), the rudder (`hull.rudder.stockX` −7.75, `d = −hull.rudder.bottomY` 1.95). Map point `P = (boat.eastM, boat.northM) + boatToMap(x, 0, boat.headingDeg)` (`src/model/mapFrame.ts`). For each line, `fe = sin(H)`, `fn = cos(H)` with `H` the line's heading in radians, `de = Pe − bowEastM`, `dn = Pn − bowNorthM`: `along = de·fe + dn·fn` (metres ahead of the bow), `side = |de·fn − dn·fe|`, `reach = (d + bowLine.deckAboveM) / bowLine.slope` (saildrive 2.75 m, keel 3.7 m, rudder 3.25 m). The point is over the line when `0 ≤ along ≤ reach` and `side ≤ bowLine.catchM`. Result: lines in order, and within a line `saildrive`, `keel`, `rudder`; one entry per line and part (the two keel points make one `keel`). None: `NO_CATCHES`.
- `bowLineHits`: a `keel` catch → `{ key: '<lineId>:keel', obstacleId: lineId, partId: 'rope_lazy_line', part: 'keel', approachMps: 0, fender: false }`; a `rudder` catch → the same with `part: 'stern'` and key `'<lineId>:stern'`. `approachMps: 0` makes the report a `touch` (`contactSeverity`), and `stepContact` keeps it one report while she stays over the line (the key stays in `touching`) and merges a return within `mergeS`.

`src/model/mooringLines.ts`: `LinesInputs` gains `/** PHASE10_SPEC 17.4: on Hard, the propeller is over a moored yacht's bow line. */ overBowLine?: boolean`. In `stepLines`, `slack = crew !== null || inputs.overBowLine === true || state.lines.some(…)` (the rest as today: in gear for `foulAfterS`, 2 s, fouls it).

`src/app/store.ts`, the `step` case: move the two lines that compute `solidGeometry` and `solid` up, before "The crew's walk" (they read only `state`). Then:

```ts
const hardLines = solid.marina && state.exercise?.options.level === 'hard';
const catches = hardLines ? bowLinesUnder(state.boat, bowLines(solidGeometry)) : NO_CATCHES;
const overBowLine = catches.some((c) => c.part === 'saildrive');
if (lines.lines.length > 0 || lines.crew !== null || lines.foulS !== 0 || overBowLine) {
  lines = stepLines({ ...linesInputs(state), engine, overBowLine }, dt);
}
```

and where `stepContact` is called: `stepContact(contact, catches.length === 0 ? moving.report.contacts : [...moving.report.contacts, ...bowLineHits(catches)], rig.timeS, dt)`. The catches use the boat before the frame's move (as `stepLines` does). Easy, Normal, free sailing and the bay: `catches` is `NO_CATCHES`, nothing changes.

`src/model/alerts.ts`, `alertLearnId`: a contact entry whose `obstacleId` starts with `lazy-line` → `'rope_lazy_line'`. `src/ui/damageReport.ts`, `damageText`: a report whose `obstacleId` starts with `lazy-line` → `t(r.part === 'stern' ? 'damage.lazyLine.rudder' : 'damage.lazyLine.keel')` (before the general line; the speed of 0.0 kn would mislead). `obstacleKind` already returns `lazy-line` for these ids (M74).

UI and 3D: nothing new; the lines are drawn at every level since M74.

### 17.5 Pilot (`enterPilot(level)`, `tests/harbourPilot.ts`)

`c` = our berth's centre for the level's layout (`marinaGeometry(s.harbour.layout, s.harbour.traffic).ourBerth.centreEastM`), `gap(s) = quayFaceNorthM − stern(s)[1]`, `phase = 0`, `lastT = 0`. `keep(s, lat = true)`: `e = stern(s)[0] − c`, `h = H(s) − 180`; stern thruster `lat ? (e > 0.3 ? 1 : e < −0.3 ? −1 : 0) : 0`, bow thruster `h > 2 ? −1 : h < −2 ? 1 : 0`. Per frame by phase:

`boat.eastM` is the boat's middle (`boatPoint` `centre`), near the mast, as the How text says; `lever` sets `s.engine.leverPct` (the engine runs from the link's `eng=1`); phase 5's "the lever is 0" is `s.engine.leverPct === 0`; phase 8 tightens until the run is `done` (the run's end stops the loop). 0: `setFenders { out: true }`, `lever 15`, phase 1. 1: when `boat.eastM > c − 18`: `lever −30`, phase 2 (refresh, 22.4: with the west wind behind her, `lever −15` from `c − 10` slid her 21 m past the berth and she backed into `yacht-0-13`; −30 from 14, 18 or 22 m all finish the three levels). 2: when `boat.speedMps < 0.1`: `lever 0`, bow thruster 1, stern thruster −1, phase 3. 3: when `|H − 180| < 5`: both thrusters 0, phase 4. 4: `want = gap > 10 ? −0.6 : gap > 5 ? −0.3 : −0.12`; `keep`; `lever(v > want ? −15 : v < want − 0.15 ? 15 : 0)` with `v = boat.speedMps`; when `gap < 2.6`: phase 5. 5: `keep`; `lever(v < −0.03 ? 15 : 0)`; when `|v| < 0.03` and the lever is 0: phase 6. 6: `keep`; take `sp`, take `ss`; when both are on: take `ll`, phase 7. 7: `keep(s, false)`; when `ll` is on: bow thruster 0, phase 8. 8: when `t − lastT > 0.5`: `lastT = t`, `line ll tighten`.

### 17.6 Tests (`tests/harbourExercises.test.ts`)

Good runs (prototype values in brackets, refresh 2026-11-03 with `wd=-90` and the pilot of 17.5; the limits are the prototype values plus 30 %, rounded up, final as written; `line-up` and `reverse-in` share one limit because the pilot lines her up while it backs in). Use `goodRun` of `tests/harbourExercises.test.ts` with `limitS` 400 (the runs take 180–200 s), and compare `durations[1] + durations[2]` with the shared limit. Every run ends `done` with no mistake; on Hard no report has `obstacleKind` `lazy-line` (the prototype's closest approach of the saildrive, keel and rudder to a line's catching part: 4.9 m):

| Level | fenders | line-up + reverse-in | stern-lines | lazy-line | made-fast |
|---|---|---|---|---|---|
| easy | ≤ 3 (1.0) | ≤ 216 (83.1 + 82.6) | ≤ 4 (1.3) | ≤ 31 (20.0) | ≤ 34 (26.1) |
| normal | ≤ 3 (1.0) | ≤ 206 (72.1 + 85.9) | ≤ 4 (1.3) | ≤ 31 (20.0) | ≤ 27 (20.1) |
| hard | ≤ 3 (1.0) | ≤ 225 (75.0 + 97.8) | ≤ 4 (1.3) | ≤ 31 (20.0) | ≤ 12 (8.6) |

M74's `leave-berth` good runs keep passing unchanged at all three levels (Hard: the prototype's closest approach to a line's catching part is 1.76 m, the keel bulb's front).

Named tests: `it('PT-51 the entering exercise ends with the lazy line holding the bow')`: after the normal run is `done`, 30 s more of `step` frames without the pilot (the engine stays in neutral): the heading stays within 180 ± 15° and the stern gap within 0.3–3.0 m. `it('PT-50 the hard level is finished with no mistake')`: the hard run ends `done` with no `mistake` entry (its `fender` reports, if any, are not mistakes). `it('PT-52 the engine in gear while the crew walks the lazy line fouls the propeller')`: in the normal run, once step 4 (`lazy-line`) begins (the crew walking: `lines.crew` set), dispatch `engine { leverPct: 30 }` and stop calling the pilot: within 5 s the run is `failed` with `propeller` (`stepLines` fouls after `foulAfterS`, 2 s; prototype 2.0 s). A run that skips phase 0's `setFenders` (the fenders step never passes, so the pilot's later phases run with the coach still on step 0): the loop ends when the run is `mistake` or after 170 s; it must end `mistake` with `fenders-in` (the M59 alert fires backing within 15 m of the rings at more than 0.1 m/s astern; prototype 128.7 s).

**The bow lines on Hard** (medium layout; `yacht-0-11`'s bow is at (−2.75, 1483.5), heading 180; `yacht-0-13`'s, taken at Normal, at (8.25, 1485.0)):

1. `tests/marina.test.ts`: `bowLines(marinaGeometry('medium', 'busy'))` has 47 entries; `lazy-line-0-11` is `{ bowEastM: -2.75, bowNorthM: 1483.5, headingDeg: 180 }`; `lazy-line-1-11` is `{ bowEastM: -2.75, bowNorthM: 1449, headingDeg: 0 }`; a second call returns the same array; `bowLines(marinaGeometry('spacious', 'empty'))` is empty. `area.marina.bowLine.deckAboveM === SCENE.harbour.hullAboveM` and `area.marina.bowLine.slope === 1` (`SCENE` from `src/render3d/sceneConfig.ts`).
2. `tests/marina.test.ts`, `bowLinesUnder(boat, bowLines(marinaGeometry('medium', 'busy')))` with `boat = { ...initialState().boat, eastM, northM, headingDeg: 90 }`: (1.65, 1480.9) → `[{ lineId: 'lazy-line-0-11', part: 'saildrive' }]` (the propeller 2.6 m ahead of the bow, on the line); (−2.67, 1480.0) → `[{ lineId: 'lazy-line-0-11', part: 'keel' }]` (3.5 m ahead ≤ 3.7); (5.0, 1481.0) → `[{ lineId: 'lazy-line-0-11', part: 'rudder' }]` (2.5 m ≤ 3.25); (1.65, 1480.0) → empty (the propeller 3.5 m ahead, where the line is deeper than it); (2.0, 1480.9) → empty (0.35 m to the side). `bowLineHits` of the keel and rudder catches: the two hits of 17.4, parts `keel` and `stern`; of the saildrive catch: empty.
3. `tests/mooringLines.test.ts`: `stepLines` with no lines, `crew: null`, the engine running in gear ahead and `overBowLine: true`: `fouled` after 2.0 s of 0.05 s frames (not at 1.95 s); with the gear in neutral: the same state object back every frame.
4. `tests/alerts.test.ts`: `alertLearnId` of a `contact` entry with `obstacleId: 'lazy-line-0-11'` is `rope_lazy_line`.
5. `tests/harbourExercises.test.ts`, the store (helper: the level's start link, `exercise start`, 1.2 s of `step` frames, so the settle second (`settleS` 1 s) is over before the boat is placed, then `boat = { ...s.boat, eastM, northM, headingDeg: 90, speedMps: 0 }`, `engine { leverPct }`, then `step` frames of 0.05 s; the prototype's boat drifted at most 0.15 m in 5 s at these places and touched nothing else):
   - `it('PT-52 a neighbour\'s lazy line under the propeller in gear fouls it (Hard)')`: hard, (1.65, 1480.9), lever 15: after 1.5 s `lines.fouled` is false; after 3.0 s it is true (in gear after the 0.5 s gear delay, fouled 2 s later), the newest report is `propeller`, the run is `failed` with `propeller`.
   - hard, (1.65, 1480.9), lever 0, 5 s: not fouled, no report, the run `running` (in neutral over a line nothing happens: PT-52's lesson).
   - normal, (12.65, 1482.4) (the propeller 2.6 m ahead of `yacht-0-13`'s bow), lever 15, 3 s: not fouled, no report, `running` (Normal only draws the lines).
   - hard, (−2.67, 1480.0), lever 0, 3 s: exactly one report, `{ obstacleId: 'lazy-line-0-11', partId: 'rope_lazy_line', part: 'keel', severity: 'touch' }`; the run is `mistake` with one `lazy-line` entry.
   - hard, (5.0, 1481.0), lever 0, 3 s: one report with `part: 'stern'`; the run `mistake` with `lazy-line`.

### 17.7 Browser checks (`scripts/shots-m75.mjs`, test clock)

Scenes: `enter-setup` (`?m=exercise&ex=enter-berth`). The berth outline pictures `enter-reverse` (`cam=top`) and `enter-map` are taken in live check (1) once step 1 shows the berth. Live: (1) `m75 good run` (phone only): `enterPilot('normal')`'s logic through `__sailExercise.dispatch`, until "Well done!". (2) `m75 fenders in`: Start, skip the fenders, back towards the berth (`engine -15` after turning with the thrusters as in the pilot): the card "Fenders still in". (3) Russian setup card has no overflow (`lang=ru`). Scene `enter-hard-lines` (`?m=exercise&ex=enter-berth&exl=hard&cam=top`): the bow lines of the busy marina. The bow-line mistakes are checked by the store tests of 17.6 (a link cannot place the boat during a run).

### 17.7a Decided in the M75 PR (recommended; merging accepts it)

- **Built as 17.1–17.7 say.** The start link keeps `wd=-90`; the three Normal/Hard/Easy good runs finish with the pilot of 17.5 and the limits of 17.6 unchanged.
- **Test names:** the three named tests of 17.6 (PT-51, PT-50, PT-52 for the exercise), the Hard bow-line store tests (PT-52 for the propeller) and the fenders-in run are in `tests/harbourExercises.test.ts`; the bow-line model tests are in `tests/marina.test.ts`, `tests/mooringLines.test.ts` and `tests/alerts.test.ts`.
- **Browser checks:** the good run steps the app 0.2 s per decision on the test clock (the pilot's 0.05 s frames are too slow through the page); its result is the same card "Well done!".
- **Russian texts** (the `enter-berth` card, the `lazy-line` mistake, the two damage strings) are AI drafts, `draft`, in the review documents. The Russian uses the buttons' own words (*Муринг*, *Подать на причал*, *За бортом*).

### 17.8 Done when / not in M75

Done: the three levels can be finished on a phone; on Hard the keel over a neighbour's bow line pauses and the propeller over one in gear ends the run; the checks pass. Not in M75: coming alongside (Ideas), our own anchor (M78), moving boats; a bow line that pulls the boat or the neighbour (no force, 22.4); bow lines outside the Hard level.

---

## 18. M76: Turning in her own length; picking up and leaving a mooring buoy

**Independent review: required** (a new rule, PT-62; the texts state how this boat's prop walk turns her, an assumption of PT-27).

### 18.1 Files

New: `scripts/shots-m76.mjs`. Changed: `content/exercises/exercises.json` (two exercises), both texts, `tests/harbourPilot.ts` (`turnPilot`, `buoyPilot`), `tests/harbourExercises.test.ts`, `tests/physicsTruths10.test.ts` (PT-62), `docs/PHYSICS_TRUTHS.md` (PT-62's test), `docs/review/ru-exercises.md`, `docs/WORKFLOW.md`, `docs/EXERCISES.md` (EX-D is an exercise), `scripts/shots.mjs`, `docs/CODE_MAP.md`.

### 18.2 Data

```json
{
  "id": "turn-own-length", "group": "harbour", "ropes": "easy", "crew": false,
  "sections": ["engine", "harbour", "autopilot", "helm", "ropes", "status", "conditions", "learn"],
  "start": "?pl=marina&ml=medium&tr=half&pe=-40.0&pn=1468.0&hdg=90&bs=0&wd=-90&ws=8&eng=1&lv=0&ap=off&sea=flat",
  "targets": [{ "id": "circle", "shape": "circle", "eastM": -40, "northM": 1468, "radiusM": 10 }],
  "steps": [
    { "id": "kick", "opens": "engine", "holdS": 1, "show": "circle", "check": { "headingDeg": { "to": 120, "within": 15 }, "target": { "id": "circle", "point": "centre" } } },
    { "id": "spin", "opens": "engine", "holdS": 3, "show": "circle", "check": { "headingDeg": { "to": 270, "within": 10 }, "target": { "id": "circle", "point": "centre" }, "speedKn": [-0.5, 0.5] } }
  ],
  "mistakes": [
    { "id": "touch", "serious": false, "on": { "alert": "contact", "severity": ["touch", "bump"], "obstacle": ["yacht", "harbour"] } },
    { "id": "hard-hit", "serious": true, "on": { "alert": "contact", "severity": ["knock", "hit"], "obstacle": ["yacht", "harbour"] } },
    { "id": "left-circle", "serious": false, "steps": ["kick", "spin"], "on": { "condition": { "target": { "id": "circle", "point": "centre", "inside": false } }, "forS": 1 } }
  ]
},
{
  "id": "mooring-buoy", "group": "harbour", "ropes": "easy", "crew": false,
  "sections": ["engine", "harbour", "autopilot", "helm", "ropes", "status", "conditions", "learn"],
  "start": "?pl=bay&pe=-1380.0&pn=0.0&hdg=270&bs=0&wd=-90&ws=8&eng=1&lv=0&ap=off&sea=sheltered",
  "targets": [
    { "id": "buoy", "shape": "circle", "eastM": -1450, "northM": 0, "radiusM": 2.5 },
    { "id": "clear", "shape": "circle", "eastM": -1450, "northM": 0, "radiusM": 15 }
  ],
  "steps": [
    { "id": "approach", "opens": "engine", "holdS": 1, "show": "buoy", "check": { "target": { "id": "buoy", "point": "bow" }, "speedKn": [-0.5, 0.5] } },
    { "id": "bow-line", "opens": "harbour", "holdS": 1, "check": { "linesOn": ["bl"] } },
    { "id": "lie", "opens": "engine", "holdS": 10, "check": { "linesOn": ["bl"], "engine": { "gear": "neutral" } } },
    { "id": "let-go", "opens": "harbour", "holdS": 1, "check": { "linesOff": ["bl"] } },
    { "id": "back-away", "opens": "engine", "holdS": 2, "show": "clear", "check": { "target": { "id": "clear", "point": "centre", "inside": false } } }
  ],
  "mistakes": [
    { "id": "aground", "serious": false, "on": { "alert": "contact", "severity": ["touch", "bump"], "obstacle": ["ground"] } },
    { "id": "aground-hard", "serious": true, "on": { "alert": "contact", "severity": ["knock", "hit"], "obstacle": ["ground"] } }
  ]
}
```

No `propeller` mistake here: the model never fouls the propeller with the buoy's bow line (`slackInWater` is false for `bl`, M45). The buoy circle's radius is `physics.lines.buoyReachM` (2.5 m: the bow must be this close to pick it up). Of the bay's three buoys the middle one (−1450, 0) is the target; the start (−1380, 0) is inside the bay's mouth (the coast runs north–south at east −1350, the bay cut in west of it) in 15 m or more of water; the wind blows out of the bay (from the west, `wd=-90`: the link drops `wd=270`, refresh 22.4), so the approach is into the wind (PT-62). Both links of M76 use `wd=-90`.

### 18.3 Texts (appended)

```json
"turn-own-length": {
  "title": "Turning in her own length",
  "summary": "Turn her round in the fairway inside a circle not much wider than her length: a kick ahead, prop walk astern, then the thrusters.",
  "see": "She is stopped in the fairway pointing east, with boats moored on both sides. The magenta circle is all the room you have.",
  "happening": "A burst ahead with the wheel hard over turns her before she gathers speed (kick ahead). Going astern the propeller pushes the stern sideways (prop walk): on this boat the app has it push the stern to port (an assumption until a skipper confirms it, PT-27), which turns the bow to starboard, the same way. The thrusters push the bow and the stern sideways: together, in opposite directions, they spin her on the spot.",
  "action": "Wheel hard to starboard; short bursts ahead and astern until she points about 120°; then hold the bow thruster to starboard and the stern thruster to port until she points west (270°).",
  "mistake": "Long bursts: she gathers speed and leaves the circle towards the moored boats.",
  "done": "She turned in her own length. Short bursts keep her on the spot; the thrusters finish the job.",
  "steps": {
    "kick": { "goal": "Turn her to about 120° (105°–135°) with the engine and the wheel, staying in the circle.", "how": "Steering: wheel hard to starboard (slider right to the end). Engine: push the lever about two thirds towards Ahead for 2 seconds, then Neutral; after 4 seconds pull it about two thirds towards Astern until she starts moving back, then Neutral. Repeat once." },
    "spin": { "goal": "Spin her on the spot until she points west (260°–280°) and stop.", "how": "Wheel straight. Hold the bow thruster to starboard and the stern thruster to port. Let go when the compass shows 270°." }
  },
  "mistakes": {
    "touch": T, "hard-hit": T,
    "left-circle": { "name": "Out of the circle", "what": "She left the circle.", "why": "Long bursts build up speed; in a marina there is no room for that.", "fix": "Shorter bursts, and Neutral as soon as she moves. Tap Back to try the step again." }
  }
},
"mooring-buoy": {
  "title": "Picking up a mooring buoy",
  "summary": "Approach the buoy into the wind at a crawl, pick it up at the bow, lie to it, then let go and back away.",
  "see": "You are motoring into the bay towards three white buoys; the magenta ring marks the middle one. The wind blows out of the bay, towards you.",
  "happening": "Into the wind the boat stops by herself as soon as you take the engine out of gear, so you can creep up to the buoy. The crew picks it up with the boat hook and makes the bow line fast. Lying to it, the wind keeps her bow towards the buoy.",
  "action": "Motor slowly straight at the buoy, into the wind; slow down to a crawl in the last boat length; pick it up at the bow; engine in neutral; to leave, let go and go gently astern away from it.",
  "mistake": "Coming in fast or with the wind behind you: she cannot stop and runs past or over the buoy.",
  "done": "You picked up the buoy and left it. Into the wind and at a crawl.",
  "steps": {
    "approach": { "goal": "Bring the bow to the buoy (inside the small ring) at under half a knot.", "how": "Engine slow ahead (the lever just past Neutral towards Ahead) and steer straight at the buoy. About 10 m before it, Neutral; if she still runs on, a moment just past Neutral towards Astern, then Neutral again." },
    "bow-line": { "goal": "Pick up the buoy with the bow line.", "how": "Harbour gear → Lines: tap \"Pick up the buoy\". It works only with the bow within 2.5 m and almost stopped." },
    "lie": { "goal": "Lie to the buoy for 10 seconds with the engine in neutral.", "how": "Lever to Neutral and wait: the wind keeps her bow to the buoy." },
    "let-go": { "goal": "Let go the bow line.", "how": "Harbour gear → Lines: Let go on \"Bow line to the buoy\"." },
    "back-away": { "goal": "Back away until you are well clear of the buoy (outside the big ring).", "how": "Engine slow astern: the lever just past Neutral towards Astern (\"In gear: astern\"). The buoy stays ahead, clear of the propeller." }
  },
  "mistakes": { "aground": T, "aground-hard": T }
}
```

(`T` = the texts of 16.6's table, as there.)

### 18.4 PHYSICS_TRUTHS

**PT-62** (row written by the planning PR in `docs/PHYSICS_TRUTHS.md`, `to-verify`; M76 only adds the test file to its "How to see it"): *Pick up a mooring buoy heading into the wind (or the current), slowly, with the buoy brought to the bow.* Test: `tests/physicsTruths10.test.ts`, `it('PT-62 the buoy is picked up into the wind')`: in `buoyPilot()`'s good run, at the frame the `approach` step passes, `Math.abs(twaSignedDeg(s)) ≤ 30` and `mpsToKn(|speedMps|) ≤ 0.5`, and the next step's `line bl take` is accepted (the bow line is on one frame later).

### 18.5 Pilots

`turnPilot()`: step 0, with `st` = app seconds since the step began and `k = st % 15`: `rudder 35`, lever `k < 2 ? 60 : k < 7 ? 0 : (k < 11 && boat.speedMps > −0.3) ? −60 : 0` (refresh, 22.4: with 3 s bursts the west wind behind her carried her 10.3 m from the centre, out of the circle; with 2 s she stays within 3.7 m). Step 1: `rudder 0`, `lever 0`, both thrusters `|H − 270| > 5 ? (bow 1, stern −1) : 0`.

`buoyPilot()`: step 0: `d` = distance from `bow(s)` to (−1450, 0); `want = d > 30 ? 1.0 : d > 8 ? 0.5 : 0.15` (m/s); `brg` = the bearing from the boat to the buoy (`atan2(−1450 − eastM, 0 − northM)` in degrees); `rudder(clamp(2 · wrap180(brg − headingDeg), −20, 20))`; `lever(v < want − 0.05 ? 15 : v > want + 0.1 ? −15 : 0)`. Step 1: `lever 0`, `rudder 0`, `line bl take`. Step 2: nothing. Step 3: `line bl letGo`. Step 4: `lever −15`.

### 18.6 Tests (good runs; prototype in brackets)

| Exercise | Limits per step |
|---|---|
| turn-own-length | kick ≤ 28 (21.6); spin ≤ 50 (34.1); the centre never more than 10 m from (−40, 1468) (prototype: 3.7 m) |
| mooring-buoy | approach ≤ 137 (115.1); bow-line ≤ 3 (1.0); lie ≤ 15 (10.0); let-go ≤ 3 (1.0); back-away ≤ 92 (38.8) |

Prototype values from the refresh (2026-11-03, `wd=-90`); the limits are the planning PR's and still hold. PT-62's run: at the pick-up the wind is 0.5° off the bow and she makes 0.33 kn. PT-33's spin: the centre moves 3.7 m.

`it('PT-27 PT-48 the kick step turns her to starboard')`: the `kick` step passes (heading 105–135° from 090°) within 28 s with the wheel hard to starboard and only engine bursts (no thruster dispatched). `it('PT-33 the thrusters spin her on the spot')`: during the `spin` step the centre stays within 10 m of where it was when the step began.

### 18.7 Browser checks (`scripts/shots-m76.mjs`, test clock)

Scenes: `turn-setup` (`?m=exercise&ex=turn-own-length`), `turn-circle` (`?m=exercise&ex=turn-own-length&cam=top`), `buoy-setup` (`?m=exercise&ex=mooring-buoy`), `buoy-ring` (`?m=exercise&ex=mooring-buoy&cam=helm`) (step 0 shows the target, so the setup card's link shows it). Live: `m76 turn` and `m76 buoy` good runs (phone only, the pilots' logic through `__sailExercise.dispatch`); `m76 left circle`: Start the turn, `engine { leverPct: 60 }` for 10 s: the card "Out of the circle".

### 18.8 Done when / not in M76

Done: both exercises can be finished on a phone; PT-62's test passes; checks pass. Not in M76: sailing onto a buoy (Ideas); a boat hook in 3D.

### 18.9 Decided in the M76 PR (recommended; merging accepts it)

- Nothing in `src/` changed: both exercises use checks, targets, mistakes and the bow line that M74 and M75 built. The pilots, the data and the limits are exactly 18.2, 18.5 and 18.6; the good runs in `tests/harbourExercises.test.ts` took, per step: turn 21.6 s and 34.1 s (centre never more than 10 m from the start); buoy 115.1, 1.0, 10.0, 1.0 and 38.8 s.
- PT-62 stays `to-verify` in `docs/PHYSICS_TRUTHS.md`: M76 only adds the test, no source could be opened (the planning PR's note stands). A sailor should confirm the texts' claims.
- The Russian drafts call the buoy «бочка», as the app's `ui.json` already does («Взять бочку», «Носовой конец на бочку»); the exercise is «Швартовка к бочке». The text says "Try again" as «Ещё раз» like the other exercises.
- (Review of the M76 PR, accepted.) The "Out of the circle" card's fix text names the button the screen shows: "Tap \"Back to the start…\" to try the step again." (Russian to match); the Russian drafts say «заброс кормы» for prop walk, the app's glossary term, also in M75's `enter-berth` text. Left as they are: the white buoys on the 3D scene against orange on the mini-map (older than M76), and the 4 s / 5 s wait in the kick step's "How?" against the pilot.
- The live checks drive the pilots with `ctl_rudder` set through `setControls` (the debug hook has no rudder reading); they run on the test clock with one decision per 0.2 app seconds, like M75's.

---

## 19. M77: Anchoring in the bay with a line ashore

**Independent review: required** (anchoring teaches safety: scope, setting, a line to the rocks; checks on the anchor's state).

### 19.1 Files

New: `scripts/shots-m77.mjs`. Changed (run `npm run review-doc -- ru` after the Russian texts, section 0): `content/exercises/exercises.json`, both texts, `tests/harbourPilot.ts` (`anchorPilot`), `tests/harbourExercises.test.ts`, `docs/review/ru-exercises.md`, `docs/WORKFLOW.md`, `docs/EXERCISES.md` (EX-B; the night time-lapse stays for part 10c), `scripts/shots.mjs`, `docs/CODE_MAP.md`.

### 19.2 Data

```json
{
  "id": "anchor-shore", "group": "harbour", "ropes": "easy", "crew": false,
  "sections": ["engine", "anchor", "harbour", "autopilot", "helm", "ropes", "status", "conditions", "learn"],
  "start": "?pl=bay&pe=-1585.0&pn=0.0&hdg=90&bs=0&wd=90&ws=6&eng=1&lv=0&ap=off&sea=sheltered",
  "targets": [{ "id": "drop", "shape": "circle", "eastM": -1600, "northM": 0, "radiusM": 5 }],
  "steps": [
    { "id": "to-spot", "opens": "engine", "holdS": 2, "show": "drop", "check": { "target": { "id": "drop", "point": "bow" }, "speedKn": [-0.5, 0.5] } },
    { "id": "let-go-anchor", "opens": "anchor", "holdS": 1, "check": { "anchor": { "phase": ["bottom", "set"] } } },
    { "id": "scope", "opens": "anchor", "holdS": 1, "check": { "anchor": { "scopeOk": true } } },
    { "id": "dig-in", "opens": "engine", "holdS": 2, "check": { "anchor": { "phase": ["set"] } } },
    { "id": "shore-line", "opens": "harbour", "holdS": 1, "check": { "linesOn": ["sl"] } },
    { "id": "settled", "opens": "harbour", "holdS": 10, "check": { "linesTight": ["sl"], "anchor": { "phase": ["set"] }, "engine": { "gear": "neutral" } } }
  ],
  "mistakes": [
    { "id": "aground", "serious": false, "on": { "alert": "contact", "severity": ["touch", "bump"], "obstacle": ["ground"] } },
    { "id": "aground-hard", "serious": true, "on": { "alert": "contact", "severity": ["knock", "hit"], "obstacle": ["ground"] } },
    { "id": "propeller", "serious": true, "on": { "alert": "contact", "obstacle": ["propeller"] } },
    { "id": "dragging", "serious": false, "on": { "alert": "anchorAlarm" } }
  ]
}
```

The drop spot (−1600, 0) is sand, 10.0 m deep (`depthAt`); the chain needed is `scopeNeededM(10.0, 6)` = 47.2 m (4 × (10.0 + 1.8)) of the 70 m aboard; the west shore's rings are at east −1700. The wind (6 kn from the east) blows towards the shore: the anchor holds her off the rocks.

### 19.3 Texts (appended)

```json
"anchor-shore": {
  "title": "Anchoring with a line ashore",
  "summary": "Drop the anchor on the spot, let out enough chain, dig it in, then back towards the rocks and take a line ashore.",
  "see": "You are in the bay, bow pointing out to sea, the rocky shore behind you. The magenta ring is where the anchor should go: sand, 10 m deep.",
  "happening": "An anchor holds only with enough chain: at least four times the depth plus the height of the bow roller, and here three boat lengths (about 47 m) is the larger rule (PT-31). On the bottom it must be dug in by going gently astern (PT-57). A line from the stern to a ring on the rocks then stops her swinging, so she can lie close to the shore.",
  "action": "Back slowly until the bow is over the spot; let the anchor go; keep going slowly astern while the chain runs out until it is long enough; stop the chain and go astern a little harder to dig it in; let out a little more, back towards the shore and send the crew ashore with the line; tighten it.",
  "mistake": "Too little chain: the anchor drags and she drifts onto the rocks. Or backing too far: the rudder and the keel touch the bottom near the shore.",
  "done": "She lies anchored with a line ashore. Enough chain, dig it in, then the shore line.",
  "steps": {
    "to-spot": { "goal": "Back slowly until the bow is over the spot (inside the ring), nearly stopped.", "how": "Engine slow astern: the lever just past Neutral towards Astern (\"In gear: astern\"). Keep her straight with the bow thruster. Over the spot, Neutral, and a touch ahead to stop." },
    "let-go-anchor": { "goal": "Let the anchor go to the bottom.", "how": "Open Anchor and hold \"Chain out ▼\". Watch the chain counter: the anchor reaches the bottom at about 12 m." },
    "scope": { "goal": "Let out enough chain (the Anchor section shows how much is needed: about 47 m).", "how": "Keep \"Chain out\" going (or hold it again) while the engine goes slow astern, so the chain lies along the bottom, not in a heap." },
    "dig-in": { "goal": "Dig the anchor in.", "how": "Stop the chain. Engine astern a little harder (the lever about 40 % of the way towards Astern) for about half a minute: the chain comes tight and the anchor digs in. The Anchor section then says it is set." },
    "shore-line": { "goal": "Back towards the shore and take a line to a ring.", "how": "Let out chain again and go slowly astern until the stern is within about 35 m of the shore, then Neutral. Harbour gear → Lines: \"Take a line ashore\". The crew swims it to a ring (about 30 s)." },
    "settled": { "goal": "Tighten the shore line and lie still with the engine in neutral.", "how": "Tap Tighten on the shore line until it is hand tight. The anchor holds the bow, the line the stern." }
  },
  "mistakes": {
    "aground": T, "aground-hard": T, "propeller": T,
    "dragging": { "name": "The anchor is dragging", "what": "The anchor alarm went off: the anchor is sliding along the bottom.", "why": "With too little chain, or not dug in, the pull lifts the anchor out (PT-54).", "fix": "Let out more chain, then dig it in again going gently astern." }
  }
}
```

### 19.4 Pilot (`anchorPilot()`)

`hold(s)` = bow thruster `H − 90 > 3 ? −1 : H − 90 < −3 ? 1 : 0`; `d` = distance from `bow(s)` to (−1600, 0); `v = boat.speedMps`; `more = false`, `lastT = 0`. Step 0: `hold`; `lever(d > 3 ? (v > −0.3 ? −15 : 0) : (v < −0.05 ? 15 : 0))`. Step 1: `lever 0`, `windlass down`. Step 2: `hold`, `lever(v > −0.25 ? −15 : 0)` (the windlass keeps going). Step 3: `windlass off`, `hold`, `lever −40`. Step 4: while `!more`: `windlass down`, `hold`, `lever(v > −0.2 ? −15 : 0)`; when `stern(s)[0] < −1665`: `windlass off`, `lever 0`, bow thruster 0, `more = true`; then every frame while `sl` is not on and `lines.crew` is null: `line sl take` (the crew takes it once she is slow enough: `takeMaxSpeedMps`, and the nearest ring within `shoreReachM` 40 m, ring (−1700, 0)). Step 5: when `t − lastT > 0.5`: `lastT = t`, `line sl tighten`.

### 19.5 Tests (good run; prototype in brackets)

to-spot ≤ 105 (76.9); let-go-anchor ≤ 37 (24.2); scope ≤ 97 (70.1); dig-in ≤ 59 (41.1); shore-line ≤ 82 (59.3); settled ≤ 107 (78.7); at the end the chain is 55–70 m (61.3; refresh 2026-11-03, the link's `wd=90` was always read) and the anchor `set`. `it('PT-31 the scope step needs the chain the rules ask for')`: at the frame the `scope` step passes, `chainOutM ≥ scopeNeededM(depthAt(anchor.eastM, anchor.northM), 6)` (the anchor lies anywhere in the ring, 9.5–10.5 m deep: 45.2–49.2 m), and while `chainOutM` was less than that the run was still at the `scope` step (the step passes after its 1 s hold, so the frame before the pass already has enough chain: prototype 47.12 m one frame before, 46.62 m 1.1 s before, need 46.65 m). `it('PT-57 the anchor is set only after going astern')`: at the start of `dig-in` the anchor is `bottom`, not `set`. `it('PT-53 the good run never touches the bottom')`: no report in the run has `obstacleKind(report.obstacleId) === 'ground'`.


### 19.6 Browser checks (`scripts/shots-m77.mjs`, test clock)

Scenes: `anchor-setup` (`?m=exercise&ex=anchor-shore`), `anchor-ring` (`?m=exercise&ex=anchor-shore&cam=top`), `anchor-map` (`…&cam=map`). Live: `m77 good run` (phone only, `anchorPilot`'s logic); Russian setup card without overflow.

### 19.7 Done when / not in M77

Done: the exercise can be finished on a phone and the checks pass. Not in M77: the wind changing over the night (part 10c), choosing the spot freely (the ring is fixed), two anchors.

### 19.8 Decided in the M77 PR (recommended; merging accepts it)

- Nothing in `src/` changed: the exercise uses the `anchor` and `linesTight` checks, the `anchorAlarm` mistake, the windlass and the shore line that M46, M74 and M75 built. The data, texts and pilot are exactly 19.2–19.4. The good run in `tests/harbourExercises.test.ts` took, per step: 76.9, 24.2, 70.1, 41.1, 59.3 and 78.7 s, the same as the prototype; at the end 61.3 m of chain, the anchor `set`, no report.
- The mistake texts `aground`, `aground-hard` (as in M76's buoy) and `propeller` (as in M74's and M75's) are copied from the earlier exercises' words. In Russian the buttons are named as the app's `ui.json` has them: «Травить цепь ▼» and «Завести конец на берег»; the exercise is «Якорь и конец на берег». The Russian texts are AI drafts.
- One test beyond 19.5: `too little chain` stops the chain at 25 m and goes astern hard (lever −60); the anchor sets after about 150 s and then drags, and the card "The anchor is dragging" appears (about 158 s). This is what the WORKFLOW's second check tells the owner to try.
- PT-31, PT-53, PT-54 and PT-57 keep their status in `docs/PHYSICS_TRUTHS.md`: M77 adds only the exercise's tests. The texts' claims about scope (PT-31) and setting the anchor (PT-57) rest on those rows' sources.
- **Owner's test findings (PR 163; decided in the M77 PR; recommended; merging accepts it):** (1) the crew taking the shore line ashore goes out in a small boat clear of the stern, so it no longer counts as a rope near the propeller: `stepLines` in `src/model/mooringLines.ts` counts only the crew walking the lazy line (`walkLazy`) as slack. A line already in the water that lies slack near the stern still fouls. This is a small change to the model that 19.8's first bullet did not expect. (2) A stopped engine counts as neutral in a `check.engine.gear` test (`checkPasses`), so the last step can end with the engine off or in neutral. Tests: `tests/mooringLines.test.ts` (crew ashore, no foul) and `tests/exercises.test.ts` (stopped engine is neutral).
- The live check drives `anchorPilot`'s logic through `window.__sailExercise` (one decision per 0.2 app seconds, the windlass and the bow thruster only when they change), like M75's and M76's. The stern's position comes from the boat's data (`transomX`).

---

## 20. M78: Stern-to on your own anchor (sign-off of part 10b)

**Independent review: not needed** (data, texts and checks of M74–M77; PT-51's second case is tested since M47).

### 20.1 Files

New: `scripts/shots-m78.mjs`. Changed (run `npm run review-doc -- ru` after the Russian texts, section 0): `content/exercises/exercises.json`, both texts, `tests/harbourPilot.ts` (`sternAnchorPilot`), `tests/harbourExercises.test.ts`, `docs/review/ru-exercises.md`, `docs/WORKFLOW.md`, `docs/EXERCISES.md`, `docs/ROADMAP.md` (the Phase 10 row's status cell: "**10b specified** (M73–M78 …)" becomes "10b done (M73–M78, PHASE10_SPEC 15–22)"), `README.md` (after the sentence about Exercises mode add: "Harbour and anchor exercises (leaving and entering a berth stern-to, turning in a tight space, a mooring buoy, anchoring with a line ashore) work in a marina with a breakwater and in the bay."), `scripts/shots.mjs`, `docs/CODE_MAP.md`.

### 20.2 Data

```json
{
  "id": "stern-to-anchor", "group": "harbour", "ropes": "easy", "crew": false,
  "sections": ["engine", "anchor", "harbour", "autopilot", "helm", "ropes", "status", "conditions", "learn"],
  "start": "?pl=marina&ml=medium&tr=half&pe=2.8&pn=1466.0&hdg=180&bs=0&wd=-90&ws=8&eng=1&lv=0&ap=off&sea=flat&fd=1",
  "targets": [
    { "id": "drop", "shape": "circle", "eastM": 2.75, "northM": 1442, "radiusM": 3 },
    { "id": "berth", "shape": "berth" }
  ],
  "steps": [
    { "id": "to-spot", "opens": "engine", "holdS": 2, "show": "drop", "check": { "target": { "id": "drop", "point": "bow" }, "speedKn": [-0.5, 0.5] } },
    { "id": "let-go-anchor", "opens": "anchor", "holdS": 1, "check": { "anchor": { "phase": ["bottom", "set"] } } },
    { "id": "reverse-in", "opens": "engine", "holdS": 2, "show": "berth", "check": { "quayGapM": [0.5, 2.8], "berthOffsetM": [0, 1], "headingDeg": { "to": 180, "within": 10 }, "speedKn": [-0.2, 0.2], "anchor": { "chainOutM": [30, 70] } } },
    { "id": "stern-lines", "opens": "harbour", "holdS": 1, "check": { "linesOn": ["sp", "ss"] } },
    { "id": "chain-tight", "opens": "anchor", "holdS": 5, "check": { "anchor": { "phase": ["set"] }, "linesOn": ["sp", "ss"], "quayGapM": [0.3, 3.0], "headingDeg": { "to": 180, "within": 10 }, "engine": { "gear": "neutral" } } }
  ],
  "mistakes": [
    { "id": "touch", "serious": false, "on": { "alert": "contact", "severity": ["touch", "bump"], "obstacle": ["yacht", "harbour"] } },
    { "id": "hard-hit", "serious": true, "on": { "alert": "contact", "severity": ["knock", "hit"], "obstacle": ["yacht", "harbour"] } },
    { "id": "propeller", "serious": true, "on": { "alert": "contact", "obstacle": ["propeller"] } },
    { "id": "fenders-in", "serious": false, "on": { "alert": "fendersIn" } }
  ]
}
```

The drop spot is in the empty berth opposite ours (south row, index 12: the `half` list of berth indices applies to both rows and has no 12, nor 11 or 14), 6 m off the pontoon's north face (1436): from there to the bow of our boat moored (north 1483.45) is about 41.5 m, so the chain ends at about 41–43 m (prototype 41.1 m). The 3-boat-lengths rule (46.65 m) is for swinging at anchor; stern-to the stern lines hold her and the check asks for 30 m or more, which is more than 4 × (5 + 1.8) = 27.2 m (PT-31's depth rule).

### 20.3 Texts (appended)

```json
"stern-to-anchor": {
  "title": "Stern-to on your own anchor",
  "summary": "Drop the anchor across the fairway, back into the berth letting the chain out, stern lines, then take in chain until it is tight.",
  "see": "You are in the fairway in front of your berth, bow pointing south. This quay has no lazy lines, so your own anchor will hold the bow. The magenta ring is where to drop it: in the empty berth across the fairway.",
  "happening": "The anchor and its chain do the lazy line's job: laid out ahead, then tightened, they hold the bow off the quay while the stern lines hold the stern.",
  "action": "Motor slowly forward until the bow is over the ring; let the anchor go; back towards your berth, letting out chain as she goes; stop a step from the quay; stern lines; take in chain until it is tight and the anchor is set.",
  "mistake": "Not letting out chain as you back: the anchor drags behind you and holds nothing. Or taking in chain so hard that it pulls the stern off the quay: the windlass cuts out.",
  "done": "She is stern-to on her own anchor. Lay the chain out as you back in, then tighten it.",
  "steps": {
    "to-spot": { "goal": "Motor slowly forward until the bow is over the ring, nearly stopped.", "how": "Engine slow ahead (the lever just past Neutral towards Ahead); she already points south at the empty berth across the fairway: keep her straight with the thrusters. Neutral over the ring, a touch astern to stop." },
    "let-go-anchor": { "goal": "Let the anchor go to the bottom (5 m).", "how": "Anchor: hold \"Chain out ▼\" until the anchor is on the bottom." },
    "reverse-in": { "goal": "Back into your berth, letting out chain, and stop with the stern 0.5–2.8 m from the quay.", "how": "Engine slow astern. Tap \"Chain out\" whenever the chain counter is less than the distance to the anchor plus a few metres, so the chain is never tight while you move. Keep her straight with the thrusters. Neutral near the quay." },
    "stern-lines": { "goal": "Throw both stern lines to the quay.", "how": "Harbour gear → Lines: \"Throw it to the quay\" on both stern lines." },
    "chain-tight": { "goal": "Take in chain until the anchor is set and the chain holds the bow, engine in neutral.", "how": "Anchor: hold \"Chain in ▲\" until the section says the anchor is set. If the windlass cuts out, the chain is too tight: let out 1 m." }
  },
  "mistakes": { "touch": T, "hard-hit": T, "propeller": T, "fenders-in": T17 }
}
```

`T17` = the `fenders-in` texts of 17.3; `touch`, `hard-hit` and `propeller` from 16.6.

### 20.4 Pilot (`sternAnchorPilot()`)

`c` = our berth's centre (2.75), `gap`, `keep` as `enterPilot`; `phase = 0`. Step 0: `keep`; `lever(d > 3 ? (v < 0.3 ? 15 : 0) : (v > 0.05 ? −15 : 0))` with `d` from `bow(s)` to (c, 1442). Step 1: `lever 0`, `keep`, `windlass down`. Step 2: while `phase === 0`: `far` = horizontal distance from `bow(s)` to the anchor; `windlass(chainOutM < hypot(far, 6.8) + 4 ? 'down' : 'off')` (6.8 = 5 m depth + 1.8 m roller); `want = gap > 10 ? −0.4 : gap > 5 ? −0.25 : −0.12`; `keep`; `lever(v > want ? −15 : v < want − 0.15 ? 15 : 0)`; when `gap < 2.6`: `windlass off`, `phase = 1`. Then `keep`, `lever(v < −0.03 ? 15 : 0)` until the step passes by itself (the coach moves on when its check holds). Step 3: `lever 0`, `keep`, take `sp` and `ss`. Step 4: while the anchor is not `set` and not `cutOut`: `keep`, `windlass up`; then `windlass off`, both thrusters 0.

### 20.5 Tests (good run; prototype in brackets)

to-spot ≤ 79 (57.1); let-go-anchor ≤ 24 (14.6); reverse-in ≤ 206 (146.6); stern-lines ≤ 3 (1.0); chain-tight ≤ 29 (17.6); the chain at the end 38–46 m (41.1), no `mistake` in the log (prototype values from the refresh, 2026-11-03, `wd=-90`; the limits still hold). PT-51's 30 s: heading 176.7°, gap 2.51 m. `it('PT-31 stern-to the chain is more than four times the depth')`: at the end `chainOutM ≥ 4 × (5 + 1.8)` = 27.2. **PT-51** (`it('PT-51 the anchor holds the bow stern-to')`): after `done`, 30 s more in neutral: heading within 180 ± 10°, stern gap 0.3–3.0 m.

### 20.6 Browser checks (`scripts/shots-m78.mjs`, test clock)

Scenes: `stern-anchor-setup`, `stern-anchor-ring` (`cam=top`), `harbour-list` (`?m=exercise`: the Harbour and anchor group with six exercises). Live: `m78 good run` (phone only); the six harbour exercises' setup cards in Russian without overflow; the accessibility audit on the list.

### 20.7 Done when, and sign-off of part 10b

The exercise can be finished on a phone; every item of section 21 is ticked in the PR; ROADMAP's Phase 10 row says "10a and 10b done, 10c planned".

### 20.8 Decided in the M78 PR (recommended; merging accepts it)

- Nothing in `src/model` changed. The data, texts and pilot are exactly 20.2–20.4. The good run in `tests/harbourExercises.test.ts` took, per step: 57.1, 14.6, 146.6, 1.0 and 17.6 s, the same as the prototype; at the end 41.1 m of chain, the anchor `set`, no report.
- The tests named in 20.5 are `PT-31 stern-to the chain is more than four times the depth` (chain at the end at least 27.2 m) and `PT-51 the anchor holds the bow stern-to` (30 s more in neutral: heading within 10° of 180°, stern gap 0.3–3.0 m). The PT-51 test keeps the engine lever in neutral for the 30 s, as the stern-to chain-tight step requires.
- The mistake texts `touch`, `hard-hit`, `propeller` and `fenders-in` are copied from Entering the berth (16.6, 17.3), in English and Russian. In Russian the buttons are named as the app's `ui.json` has them: «Травить цепь ▼», «Выбирать цепь ▲», «Подать на причал»; the exercise is «Якорь и корма к причалу». The Russian texts are AI drafts.
- The debug read-out of `window.__sailExercise.read()` (only with `debug=1`) gained `anchorEastM`, `anchorNorthM` and `anchorCutOut`, so the live good run can pay the chain out like `sternAnchorPilot` does. No other code in `src/` changed.
- The Phase 10 row of the ROADMAP says "10a and 10b done, 10c planned"; the README's Phase 10 sentence names the harbour and anchor exercises.
- Every item of section 21 is ticked in the PR description (the browser checks and the tests of M73–M78 are cited there).

---

## 21. Definition of Done (part 10b)

- [ ] The marina has the breakwater, the entrance lights, the quay furniture, the buildings and the detailed yachts at both details; the budget check passes in the busy marina (M73).
- [ ] Open water is solid near the marina and the bay; a bounce makes one damage report (M73).
- [ ] Six harbour exercises in the "Harbour and anchor" group, each finished on a phone at least once (Leaving and Entering at all three levels) (M74–M78).
- [ ] The target outline shows in 3D and on both maps; the Level row works and is kept in links (`exl`) (M74).
- [ ] A touch pauses with its card; a hard knock, a hard grounding and a rope round the propeller end the run; the debrief lists line, thruster, windlass and fender actions (M74).
- [ ] PT-61 and PT-62 have tests named after them; the exercise tests named after PT-27, PT-31, PT-33, PT-48, PT-50, PT-51, PT-52, PT-53 and PT-57 (M75–M78) pass; every earlier test passes.
- [ ] Russian texts of the new exercises and strings are drafts (`draft`), in the review documents.
- [ ] `docs/EXERCISES.md`, `docs/CODE_MAP.md`, `docs/WORKFLOW.md` and `docs/ROADMAP.md` are current.

## 22. Decisions and open questions (part 10b)

### 22.1 Owner's answers (planning chat, 2026-11-02: "Accept all")

1. **The more detailed marina** is: a breakwater with an entrance and red and green lights, a quay with rings, bollards and lamp posts, a few low buildings, a pontoon on floats, and yachts with a cabin, mast, boom and rolled sail; built by code (M73).
2. **The marina is solid from every place**, and so are the bay's shore and bottom; no separate "too close to the harbour" warning. One map: each exercise starts in its place (M73).
3. **No moving boats**: traffic is how many berths are taken; moving boats go to Ideas.
4. **Which bumps are mistakes:** a fender contact is fine (in the debrief); a touch or bump pauses and explains; a knock or a hit ends the exercise; grounding the same way; a rope round the propeller always ends it.
5. **One Level row** for entering and leaving: Easy, Normal, Hard (traffic, berths and wind together).
6. **A target outline** in 3D and on both maps while the exercise runs.
7. **One damage report per bump**: touches of the same object with the same part within 3 s are one report, the worst.
8. **The harbour exercises start in Easy ropes**, Realistic can be chosen on the setup card; **no Alone / With crew row** (the app's crew always handles the lines).

### 22.2 Recommended (merging the planning PR accepts them)

- **Hard uses medium berths, not the tight ones** (recommended; merging accepts it): the tight layout's berths are 4.9 m, exactly this boat's beam, so with yachts on both sides she is wedged and cannot leave at any throttle (prototype, 2026-11-02). Hard is therefore every berth taken and 14 kn of side wind in medium (5.5 m) berths. Making the tight berths wider is a separate question (it would change Phase 7's layout).
- **Easy is the default level** (recommended; merging accepts it): a beginner starts with room and a light wind.
- **The side wind blows from the west** (from the open side, along the fairway's exit) in Leaving and Entering (recommended; merging accepts it): with the wind from the east the prototype's careful learner touched a neighbour once at Normal.
- **The breakwater's entrance faces west**, where the fairway is already open; the boat starts inside, as today's marina place does (recommended; merging accepts it). Exercises that start outside the harbour can come later.
- **Stern-to with the anchor checks 30 m of chain or more**, not the 3-boat-lengths rule (recommended; merging accepts it): the rule is for swinging at anchor; from the berth opposite to our moored bow is about 41.5 m, so the chain ends at about 41–43 m, and the stern lines hold her (20.2).
- **The How texts describe the Easy controls** (13.3's known limitation stays).
- **Part 10c outline** (unchanged): scripted wind; the Adriatic winds (sources needed); each exercise's own start time; the night time-lapse of the bay anchoring; the Exercises list grouped by place.

### 22.3 Known limitations (part 10b)

- Turning in her own length with the engine alone (back-and-filling without thrusters) did not work in the prototype: long bursts drift her 30 m onto the moored boats. The exercise teaches the kick ahead and prop walk for the first 30° and the thrusters for the rest.
- The anchor chain of other boats and the pontoon's moorings are not modelled (as M47).
- The buoy's pick-up does not draw a boat hook.
- (Refresh, 2026-11-03) A neighbour's bow line has no force: the keel over one makes a report and the mistake, but she does not stop or swing, and the neighbour's bow does not move. Fouling over a neighbour's line takes the same 2 s in gear as a slack line of our own (`foulAfterS`).

- (Decided in the M75 PR, recommended; merging accepts it) The ball fender (M33) hangs in the middle of the stern, behind the transom, not at the port corner (owner's bug report on the M75 preview). The crew's lazy-line walk is drawn: a line trailing in the water from the quay's edge beside the hull to the crew's hand (`lazyWalk` in `src/model/mooringLines.ts`); the rule is as specified, a line the crew handles can foul the propeller. A neighbour's line under the rudder only reports; the propeller is about a metre ahead of the rudder, so it fouls only when the line passes under the propeller itself.

### 22.4 Refresh (2026-11-03, `/plan 10 refresh` before M75: the Hard bow lines, and the wind of M75–M78)

Checked against what M73 and M74 built (16.11 and the M74 PR, where the owner accepted deferring question 1 to this refresh). Changed:

1. **The Hard obstacle of the bow lines is settled** (16.9a, built in M75, 17.4). No obstacle polygon and no force: a sunk rope does not stop a 15 t yacht, the danger is what it catches on under her. A line is a slope ahead of each moored yacht's bow (out of the deck 1.3 m above the water, 45° down, as drawn). On Hard only, through the level the run already has (`exercise.options.level`, link key `exl`; no new state or key): our **propeller** over a line, not deeper than 1.45 m, with the engine in gear fouls it after 2 s, as a slack line of our own does (PT-52; the existing `propeller` mistake ends the run); our **keel or rudder** over a line makes a `touch` report of kind `lazy-line` (part id `rope_lazy_line`, no new registry or glossary entry) and its own mistake, **`lazy-line`, "Over a neighbour's lazy line"**, not serious (it pauses and explains). Added to Entering the berth and to Leaving the berth (built in M74). Recommended; merging accepts it.
2. **M75's start link: `wd=-90`, not `wd=270`.** The link drops 270 (the control runs from −180 to 180, as M74 found), so the first prototype ran with the wind from 60° and its numbers did not hold. With the west wind of 22.2, the first pilot's slow astern could not stop her downwind (she slid 21 m past the berth and backed into `yacht-0-13`, a hard hit at Normal). The pilot now starts stopping 18 m before the berth with the lever a third astern (−30); 14, 18 and 22 m all finish every level. The How text of `line-up` says so. The good-run limits, the PT-51 and PT-52 checks and the fenders-in limit (170 s) were measured again (17.6). The good runs stay at least 4.9 m from any line's catching part, M74's Hard run 1.76 m.
3. **M76 and M78 had the same `wd=270`** (M76's turn and buoy links, M78's link; M77's `wd=90` was always read). All now `wd=-90`, and their pilots were run again on today's model (same session, after the owner asked for it). Every limit of 18.6 and 20.5 still holds; only the prototype values change. Two fixes: **Turning in her own length** left the circle with 3 s ahead bursts in the west wind (10.3 m from the centre), so the bursts are 2 s (pilot and How text; 3.7 m). **Picking up a mooring buoy** needed the west wind anyway: with the wind from 60° she picked the buoy up downwind (147.6° off the bow), against PT-62; now 0.5°. M77's PT-31 test wording is fixed: the step passes after a 1 s hold, so the frame before the pass already has enough chain.

Not changed: everything else of 15–21 (names, paths, keys, ids and signatures used by M75 exist as built: `obstacleKind` with `lazy-line`, `ExerciseOptions.level`, `exl`, `boatPoint`, `marinaGeometry(...).ourBerth`, `stepLines`, `withPropellerReport`, `SCENE.harbour.bowLine`, `rope_lazy_line`).

---

## 23. Part 10c: wind and clock (shared design, read before your milestone) **(10c)**

Planned on 2026-11-09 (`/plan 10c`; the owner accepted every recommendation in the planning chat: "Accept all"). Every part-10c builder reads sections 0–5, **this section**, then their own (24–28). Where this section and sections 3–4 differ for a 10c milestone, this section wins.

### 23.1 Goal

The wind starts to behave like the Adriatic's and follows the clock: a calm morning, the **maestral** (the summer sea breeze) building from about 10:00 and strongest around 14:00, gone by sunset, and a light **burin** (land breeze) off the land at night; a **bura** (a sudden, gusty north-east wind) or a **jugo** (a steady south-east wind) on choice. Exercises can carry their own wind timetable (a **scripted wind**) and their own start time, and a step can speed time up for the learner. A **time-lapse** (×60, ×240) lets hours pass at anchor. Three new exercises use all this: *The afternoon maestral*, *A bura is coming* and *A night at anchor*.

> **What the learner should feel:** "The wind has a day of its own. At noon it is light; by one o'clock I have rolled the jib in because the maestral is coming. When the bura hits, I am glad the sails were already small. After anchoring for the night, I watch twelve hours go by in three minutes and see whether my chain holds when a squall comes at four in the morning."

### 23.2 Scope

**In (part 10c):** local winds as wind modes from the area file (M94); the time-lapse speeds ×60 and ×240 at anchor, moored or held still, with the frame cut into slices (M95); the start time in the list and on the setup card, a step's speed-up, two new check fields, *The afternoon maestral* (M96); scripted wind in an exercise and *A bura is coming* (M97); *A night at anchor* and the sign-off (M98).

**Out:** wind that differs from place to place (a channel, a lee); clouds, rain, forecasts and the dark "cap" cloud of a bura; navigation and anchor lights; a jugo that builds over days (it starts at its strength, 24.3); the time-lapse while sailing (×16 stays the top at sea, owner answer 4); start times for the 14 older exercises (owner answer 7: they keep noon); grouping the list by place (owner answer 8: the groups stay, rows get a place tag); the physics-engine work of `PHYSICS_ENGINE_ANALYSIS.md` (owner answer 9: after 10c).

**No sailing physics changes:** no formula that moves the boat, the rig, the ropes or the anchor changes. The wind is an input to them; the time-lapse runs the same step in slices no longer than the longest step the app takes today (×16 × 0.1 s = 1.6 s).

### 23.3 Conventions

| Topic | Convention |
|---|---|
| Wind direction | Compass, where the wind **comes from**, signed (−180, 180], as `ctl_wind_dir` and `WindNow.dirDeg`: −45 = from the north-west, 45 = north-east, 135 = south-east, −90 = west, 90 = east. |
| Local time | `localParts(state.clock.utcMs, area)` (`src/model/clock.ts`); a **local hour** is `hour + minute / 60 + second / 3600`. "HH:MM" in data is local time in the area's time zone (summer time included). |
| Sunrise, sunset | `sunTimes(year, month, day, area.position.latitudeDeg, area.position.longitudeDeg)` (`src/model/sun.ts`) for the local date of `utcMs`. On 1 June 2026 in the Adriatic area: sunrise 05:16, sunset 20:28 local. With `polar` (never in the Adriatic) the land breeze and the bura's night part are 0. |
| Clock winds | `summer`, `bura`, `jugo` (the **local winds**, M94) and `scripted` (M97). In a clock wind **the mean wind is not set by hand**: the store writes it into `controls.ctl_wind_dir` and `controls.ctl_wind_speed` every step (exact numbers, not rounded), so everything that reads "the mean" today (the gust counter, the GUST badge, the anchor panel's scope, the map, the water) keeps working. `setControls` drops those two keys while a clock wind is on. |
| Gusts in a clock wind | A clock wind gives a mean and a **gust size** (`gustPct`); the true wind is `windAt(mean.dirDeg, mean.twsKn, { mode: 'gusty', seed: windMode.seed, size: gustPct, startS: windMode.startS }, timeS)` (Phase 2's gusty pattern), or the mean itself when `gustPct` is 0. |
| Smoothstep | `ss(a, b, x)`: `u = clamp((x − a) / (b − a), 0, 1)`, `u²(3 − 2u)` (the same as `smoothstep` in `windModes.ts`; export that one as `smoothstep` and use it). |
| Pattern time | `patternS = max(0, timeS − windMode.startS)`, `timeS` = the rig clock (`state.rig.timeS`). |
| Time-lapse | Scales above 16 (`windModes.timeLapseScales`, M95). Available only when `timeLapseAvailable` (24.3) is true. |
| Step speed-up | A step's `speedUp` (M96): the time scale the coach sets while that step runs (23.7). |

### 23.4 Shared helpers

| Helper | File | Signature | Behaviour |
|---|---|---|---|
| `smoothstep` | `src/model/windModes.ts` (M94: exported) | `smoothstep(edge0: number, edge1: number, x: number): number` | 23.3. |
| `isClockWind`, `isLocalWind` | `src/model/windModes.ts` (M94; `scripted` from M97) | `(mode: WindModeId) => boolean` | Clock wind: a local wind or `scripted`. Local: `summer`, `bura`, `jugo`. |
| `sizeRange` | `src/model/windModes.ts` (M94: local winds added) | `sizeRange(mode: WindModeId, data?: BoatData, areaData?: AreaData): SizeRange \| null` | Local winds: `areaData.localWinds[mode].sizeKn`; `scripted`: null. |
| `localWindMean` | `src/model/localWinds.ts` (M94) | `localWindMean(id: LocalWindId, sizeKn: number, utcMs: number, patternS: number, areaData?: AreaData): WindMean` | 24.3. |
| `WindKey` (M94), `scriptMean` (M97) | `src/model/localWinds.ts` | `scriptMean(points: readonly WindKey[], utcMs: number, areaData?: AreaData): WindMean` | 27.3. |
| `windMean` | `src/model/localWinds.ts` (M94; `scripted` from M97) | `windMean(windMode: WindModeState, controls: Controls, utcMs: number, timeS: number, script: readonly WindKey[] \| null, areaData?: AreaData): WindMean` | The mean of a clock wind; for any other mode `{ dirDeg: controls.ctl_wind_dir, twsKn: controls.ctl_wind_speed, gustPct: 0 }`. |
| `trueWind` | `src/model/localWinds.ts` (M94) | `trueWind(windMode, controls, utcMs, timeS, script, areaData?, data?): WindNow` | Clock wind: the mean with its gusts (23.3); any other mode: exactly today's `windAt(controls.ctl_wind_dir, controls.ctl_wind_speed, windMode, timeS, data)`. |
| `timeLapseAvailable`, `isTimeLapseScale` | `src/model/timeScale.ts` (M95) | 25.3 | Where ×60 and ×240 may be chosen. |
| `stepSpeedUp` | `src/app/exerciseRun.ts` (M96) | `stepSpeedUp(state: AppState): number \| null` | The current step's `speedUp` while the run is `running`, else null. |
| `localHourOf` | `src/model/localWinds.ts` (M96) | `localHourOf(utcMs: number, areaData?: AreaData): number` | The local hour (23.3); used by the `localHour` check. |

### 23.5 Sources

New rules (added to `docs/PHYSICS_TRUTHS.md`, "Phase 10 rules", by this planning PR; each milestone adds its tests and links):

- **PT-63** (M94) the maestral: a summer sea breeze from the north-west on the eastern Adriatic coast; it comes up in the late morning, is strongest in the early afternoon and dies by sunset. **source-checked** for the direction, the season and the day's course: Wikipedia *Mistral (wind)*, section on the Adriatic maestral [45], and Wikipedia *Sea breeze* [46]. The hours (10:00, 14:00, 15:00) are assumptions in BOAT_REFERENCE "Local winds" (the charter guides that give them do not open from the build environment).
- **PT-64** (M94) the land breeze: at night a lighter breeze blows from the land out to sea and dies in the morning. **source-checked** [46]. Its name on the Adriatic, *burin*, is from the charter guides (draft in the glossary).
- **PT-65** (M94, M97) the bura: from the north to north-east, it can start suddenly in calm weather, blows in gusts, is stronger at night and raises short, steep waves. **source-checked** [47].
- **PT-66** (M94) the jugo: from the south-east, steady with few gusts; a real one builds over a day or two and raises big waves. **to-verify**: Wikipedia *Sirocco* [48] gives only the southerly origin, the rain and that it can last from half a day to several days; marinafrapa.hr, yacht.de, meteo.hr and hr.wikipedia.org do not open from the build environment (2026-11-09).

The exercises also test PT-25, PT-29 and PT-13 (M96, M97, through their good runs and mistakes) and PT-31 (M98).

### 23.6 Common mistakes (10c)

- **Hours are local, not UTC.** `new Date(utcMs).getHours()` reads the device's time zone: never use it. Use `localParts(utcMs, area)`.
- **Sunset of which day?** `sunTimes` takes the local date of `utcMs`. After midnight the land breeze and the bura's night factor read "before sunrise" (`utcMs < sunsetUtcMs` of today), which is what 24.3 wants; do not look up yesterday's sunset.
- **Directions add as vectors, not as angles.** The maestral and the land breeze are summed as vectors (24.3); averaging −45 and 45 as numbers gives 0 (north), which is wrong whenever their speeds differ.
- **The mean goes into `controls` every step,** before the autopilot and the rig read them (24.4). A state where `controls.ctl_wind_speed` is the user's old value while `wind` comes from the maestral breaks the gust counter and the GUST badge.
- **Never round the mean in the store.** Rounding happens only when a clock wind is left for a hand-set mode (24.4).
- **The link of a clock wind has no `wd` or `ws`** (they would be stale) and a scripted run's link has no `wm` (the exercise brings the script).
- **Time-lapse slices, not one big step.** A frame at ×240 is cut into slices of at most `timeLapseSliceS` (1.6 s); one 4-second step would make the anchor and the contact springs jump.
- **A slice is a whole `reduce`** (the alert history, the coach and the log included), so a squall at 04:00 is caught in the slice it happens.
- **Set the speed-up through the step, not in the pilot.** The coach sets and resets it (23.7); a pilot that sets `timeScale` itself breaks Show me.
- **The script's first point is the start time.** A script is read from its first point's time onwards and the exercise's `clk` is that time; the data test checks both (27.2).

### 23.7 Architecture (10c)

**State.** No new top-level field. `WindModeId` gains `'summer' | 'bura' | 'jugo'` (M94) and `'scripted'` (M97). `ExerciseStep` gains `speedUp?: number` (M96). `ExerciseDef` gains `wind?: { points: readonly WindKey[] }` (M97). `ExerciseCheck` gains `meanWindKn?: Range` and `localHour?: Range` (M96). `CheckSource` gains `clock?: ClockState` (M96). The area file gains `localWinds` (M94); the boat file's `windModes` gains `timeLapseScales` and `timeLapseSliceS` (M95).

**The step (`case 'step'` in `src/app/store.ts`), M94:** after `dt` and before anything else: `utcMs = state.clock.utcMs + dt × 1000` (the clock at the end of the step, as today); `controls = withWindMean(state.controls, state.windMode, utcMs, state.rig.timeS + dt, script)` (24.4); `wind = trueWind(state.windMode, controls, utcMs, state.rig.timeS + dt, script)`; then everything as today, reading this `controls`. `script` is `scriptOf(state)` (M97; null in M94–M96).

**`reduce`, M95:** a `step` (not paused) whose scaled time is more than `timeLapseSliceS` is run as `n = ceil(scaled / timeLapseSliceS)` equal slices, each a whole `reduce` call (25.3). At ×16 and below `n` is 1: nothing changes.

**The order in the exported `reduce`** (M95–M97): (1) the time-lapse slicing (M95; a sliced frame returns the result of its slices, each a whole `reduce`); (2) the `demo` branch as today; (3) `next = reduceUnlogged(state, action)`; (4) `logAction` as today; (5) the end of a scripted run (M97, not for `load`); (6) `applyStepSpeed` (M96, not for `load`). Write `reduce` so (5) and (6) run on every path that today returns `next` without `logAction` too (e.g. `step`, `exercise`).

**The coach, M96:** after every action but `load` and `demo`, `applyStepSpeed(previous, next)` (26.3): when the step speed-up of the run changes, the time scale is set to the new one (if allowed) or back to ×1.

**URL keys (10c).**

| Key | Milestone | Values | Default | Written |
|---|---|---|---|---|
| `wm` | M94 | adds `summer`, `bura`, `jugo` | steady (no key) | as today; never `scripted` |
| `wg` | M94 | a local wind's strength, knots, whole, in its `sizeKn` range | the `sizeKn.default` (no key) | when not the default |
| `wd`, `ws` | M94 | as today | | **not written** while a clock wind is on; ignored when the link's `wm` is a local wind |
| `tx` | M95 | adds `60`, `240` | 1 | as today; a link with 60 or 240 opens at ×1 unless `timeLapseAvailable` holds for the opened state |

Old links have none of the new values: nothing changes.

**Files by milestone (summary; each milestone's own list wins).**

| Milestone | New | Changed (main) |
|---|---|---|
| M94 | `src/model/localWinds.ts`, `tests/localWinds.test.ts`, `scripts/shots-m94.mjs` | `content/areas/adriatic.json`, `src/model/windModes.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/ui/windModePanel.ts`, `src/ui/windPanel.ts`, both `ui.json`, registry, both glossaries, `tests/physicsTruths10.test.ts`, `tests/store.test.ts`, `tests/urlState.test.ts`, docs |
| M95 | `scripts/shots-m95.mjs` | `content/boat/hanse508.json`, `src/model/timeScale.ts`, `src/model/settings.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/ui/timeBar.ts`, both `ui.json`, `tests/timeBar.test.ts`, `tests/store.test.ts`, `tests/stepCost.test.ts`, docs |
| M96 | `scripts/shots-m96.mjs` | `content/exercises/exercises.json`, both `exercises.json` texts, `src/model/localWinds.ts`, `src/model/exercises.ts`, `src/app/exerciseRun.ts`, `src/app/exercisePilots.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/app/app.ts`, `src/ui/exercisePanel.ts`, `src/ui/stepCard.ts`, `src/ui/timeBar.ts`, both `ui.json`, tests, docs |
| M97 | `scripts/shots-m97.mjs` | `content/exercises/exercises.json`, both texts, `src/model/windModes.ts`, `src/model/localWinds.ts`, `src/model/exercises.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/ui/windModePanel.ts`, `src/app/exercisePilots.ts`, tests, docs |
| M98 | `scripts/shots-m98.mjs` | `content/exercises/exercises.json`, both texts, `src/app/exercisePilots.ts`, `tests/harbourExercises.test.ts`, `tests/exercisePilots.test.ts`, docs, `README.md` |

### 23.8 How the numbers were made (2026-11-09)

Throwaway Vitest files opened the links with `parseUrlState`, stepped `reduce` with real `step` actions and wrote the wind into `controls` and `windMode` each frame by the formulas of 24.3 and 27.3 (the code did not exist yet), exactly as the store will. Results:

- **Summer day, size 14, 1 June** (24.3 formula): 06:00 3.06 kn from 045; 08:00 and 10:00 1.50 (calm); 11:00 2.19; 12:00 7.00; 12:30 9.57; 13:00 11.81; 14:00 and 15:00 14.00 from 315; 17:00 9.75; 19:00 2.49; 20:00 and 21:00 1.50; 22:00 1.50 from 045; 23:00 5.17; 01:00, 03:00 and 05:00 6.00 from 045. Size 20 reaches a mean of 15 kn at 12:41.
- **The afternoon maestral** (size 20, start 12:20, beam reach on port tack heading 045, frames of 1/60 s at ×16): see 26.7. A learner who never reduces sail heels 27.5° and gets the first `overpowered` at 13:24; the good run heels at most 17.2° and has no alert.
- **A bura is coming** (script 27.2, heading 135, frames of 0.05 s at ×1): gusts of 20 % over the mean at 399, 500, 680, 737, 767 and 800 s after 08:00. Doing nothing: heel 35.2°, 17 `overpowered`. Jib rolled away and the main at 45 %: at most 6.4° (with the main eased in gusts) or 9.5° (not eased), no alert. Jib at 20 %: 10.8°.
- **The night** (the anchor-shore good run from 18:30, then the night script of 28.2 in slices of 1.6 s, 0.4 ms each): see 28.5. The owner's draft squall (18 kn mean, gusts 30 %, up to 25.6 kn) dragged even 61 m of chain about 10 m and put the stern on the bottom near the rocks; at 14 kn mean (gusts up to 19.9 kn) 61 m holds (3.8 m of creep, no alarm, no touch) and 50 m drags with the alarm at 03:57. The script uses 14 kn (decided by this plan, 30.2).
- **Open water** has land only round the marina (north of about 1,400 m, east −300 … 300) and the bay's headland (east −2,000 … −1,350, north −1,500 … 1,500). The sailing exercises of part 10c head east of north or south-east, so in two hours at 9 kn they stay in open water (a first run heading 255 ran aground on the headland after six minutes).

### 23.9 Milestones (10c)

| Milestone | Section | What the owner sees | Rules tested | Depends on | Independent review |
|---|---|---|---|---|---|
| M94 | 24 | Conditions → Wind has "Local winds": Summer day (maestral and the night land breeze), Bura, Jugo, each with a strength slider; the dial shows the wind and is locked with a note; Learn has the burin | PT-63, PT-64, PT-65, PT-66 | M93 | **required** (new wind formulas, the mean written into shared state every step, URL keys) |
| M95 | 25 | ×60 and ×240 in the time card at anchor, moored or held still; a night passes in about three minutes | — | M94 | **required** (the step cut into slices, a rule that drops the speed in the shared step) |
| M96 | 26 | New exercise *The afternoon maestral* (starts 12:20, time runs ×16 while you wait); every list row shows its place, and the start time when it has one; the setup card says when it starts | PT-25 | M95 | **required** (the coach changes the time scale, new check fields, the demo's speed, links of runs) |
| M97 | 27 | New exercise *A bura is coming*: calm at 08:00, the bura hits at 08:04–08:06 with gusts near 30 kn (the first scripted wind) | PT-65 (PT-25, PT-13 through the good run) | M96 | **required** (a scripted wind in shared state and links; teaches what to do when a strong wind comes suddenly) |
| M98 | 28 | New exercise *A night at anchor*: anchor with a line ashore at 18:30, then the night in time-lapse with a squall at 04:00; sign-off of part 10c | PT-31, PT-64 | M97 | **required** (anchoring safety; a serious mistake that ends the run in the night) |

Built in order M94 → M98, each needing the ones before it merged.

---

## 24. M94: The Adriatic winds **(10c)**

**Independent review: required** (new wind formulas; the mean written into shared state every step; new URL values; three new rules).

What the owner sees: in Conditions → Wind, under "Wind changes", a second row **Local winds**: *Summer day*, *Bura*, *Jugo*. Choosing one locks the dial and the speed (a note says why), shows a strength slider, and the wind follows the clock: on a summer day it is calm in the morning, the maestral comes from the north-west and builds to its peak at 14:00, it dies by sunset, and after dark a light breeze blows off the land until the morning.

### 24.1 Files

New: `src/model/localWinds.ts`, `tests/localWinds.test.ts`, `scripts/shots-m94.mjs`.
Changed: `content/areas/adriatic.json` (`localWinds`), `src/model/windModes.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/ui/windModePanel.ts`, `src/ui/windPanel.ts`, `src/ui/instrumentStrip.ts` (the GUST badge, 24.5), `src/style.css` (the locked look, 24.5), `tests/stepCost.test.ts` (24.7), both `ui.json`, `content/registry/parts.json` (`term_burin`, source `wiki:sea-breeze`), both `glossary.json`, `tests/physicsTruths10.test.ts`, `tests/store.test.ts`, `tests/urlState.test.ts`, `scripts/shots.mjs` (import, `SCENES`, `liveGroups`), `.github/ci-times.json` (`m94`: 300), `docs/PHYSICS_TRUTHS.md` (PT-63 … PT-66: test names), `docs/BOAT_REFERENCE.md` ("Local winds": already written by the planning PR; check the numbers match), `docs/CODE_MAP.md`, `docs/review/ru.md` (`npm run review-doc -- ru`).

### 24.2 Data (`content/areas/adriatic.json`, a new top-level key after `clock`)

```json
"localWinds": {
  "$comment": "PHASE10_SPEC 24.2: the area's local winds (wind modes summer, bura, jugo). fromDeg: compass, where the wind comes from, signed (-180, 180]. Hours are local time. sizeKn: the strength slider (summer: the maestral's peak; bura and jugo: their mean). Sources: PHYSICS_TRUTHS PT-63 to PT-66; the numbers are assumptions (BOAT_REFERENCE 'Local winds').",
  "calmKn": 1.5,
  "summer": {
    "seaBreeze": { "fromDeg": -45, "startH": 10, "peakH": 14, "fallFromH": 15, "gustPct": 15 },
    "landBreeze": { "fromDeg": 45, "kn": 6, "riseFromSunsetH": 1, "fullFromSunsetH": 3, "fallAfterSunriseH": 1.5, "gustPct": 10 },
    "sizeKn": { "min": 8, "max": 22, "default": 14 }
  },
  "bura": { "fromDeg": 45, "riseS": 120, "nightPct": 20, "nightRampH": 1, "gustPct": 50, "sizeKn": { "min": 10, "max": 24, "default": 18 } },
  "jugo": { "fromDeg": 135, "riseS": 120, "gustPct": 10, "sizeKn": { "min": 10, "max": 28, "default": 16 } }
}
```

**Tunable** (section 0's rule): `calmKn`, every `gustPct`, `landBreeze.kn`, the three ramps (`riseFromSunsetH`, `fullFromSunsetH`, `fallAfterSunriseH`), `riseS`, `nightPct`, `nightRampH` and the `sizeKn` defaults. **Not tunable:** the directions and `startH`, `peakH`, `fallFromH` (they carry the sources' facts). `sizeKn.max` of the bura (24) keeps its night mean (24 × 1.2 = 28.8) inside the speed control's 30 kn.

`AreaData` is `typeof adriatic` (`src/model/area.ts`), so the new key is typed without changes there; add `export type LocalWindsData = AreaData['localWinds'];` to `src/model/localWinds.ts`.

### 24.3 Model

**`src/model/windModes.ts`:**

```ts
export type PatternModeId = 'steady' | 'gusty' | 'shifty' | 'building' | 'dying';
export type LocalWindId = 'summer' | 'bura' | 'jugo';
export type WindModeId = PatternModeId | LocalWindId;          // M97 adds | 'scripted'
export const WIND_MODE_IDS: readonly PatternModeId[] = ['steady', 'gusty', 'shifty', 'building', 'dying']; // unchanged: the "Wind changes" row
export const LOCAL_WIND_IDS: readonly LocalWindId[] = ['summer', 'bura', 'jugo'];
export function isWindModeId(value: string): value is WindModeId; // any of the two lists (M97: and 'scripted')
export function isLocalWind(mode: WindModeId): mode is LocalWindId;
export function isClockWind(mode: WindModeId): boolean;          // M94: = isLocalWind; M97: || mode === 'scripted'
export function smoothstep(edge0: number, edge1: number, x: number): number; // the existing private one, exported
export function sizeRange(mode: WindModeId, data: BoatData = boat, areaData: AreaData = area): SizeRange | null;
// local winds: { min, max, default } = areaData.localWinds[mode].sizeKn
```

`isWindModeId` accepts every id (its callers keep working unchanged). `WindKey.at` is local time "HH:MM" (23.3). `windAt` treats the local winds (and later `scripted`) as `steady` (add them to the `case 'steady':` branch): `trueWind` never passes them in, but the switch stays exhaustive. `initialWindMode({ mode: 'bura' })` gives `size: 18` through `sizeRange`. `windModes.ts` now imports `area` from `./area` (check that `area.ts` does not import `windModes.ts`; it does not today).

**`src/model/localWinds.ts` (new, pure):**

```ts
export interface WindMean { dirDeg: number; twsKn: number; gustPct: number }
export function localWindMean(id: LocalWindId, sizeKn: number, utcMs: number, patternS: number, areaData: AreaData = area): WindMean;
export function windMean(windMode: WindModeState, controls: Controls, utcMs: number, timeS: number, script: readonly WindKey[] | null, areaData: AreaData = area): WindMean;
export function trueWind(windMode: WindModeState, controls: Controls, utcMs: number, timeS: number, script: readonly WindKey[] | null, areaData: AreaData = area, data: BoatData = boat): WindNow;
```

(`scriptMean` comes in M97; M94 already declares `export interface WindKey { at: string; fromDeg: number; kn: number; gustPct: number }` and passes `null` everywhere.)

For `localWindMean`, with `p = localParts(utcMs, areaData)`, `h = p.hour + p.minute / 60 + p.second / 3600`, `t = sunTimes(p.year, p.month, p.day, lat, lon)`, `H = 3,600,000` ms, `L = areaData.localWinds`, `ss = smoothstep`:

- **summer.**
  - `sunsetH = h + (t.sunsetUtcMs − utcMs) / H` (the local hour of today's sunset).
  - Sea breeze factor `f = ss(startH, peakH, h) × (1 − ss(fallFromH, max(sunsetH, fallFromH + 0.5), h))` (the `max` only matters for a winter date reached through `clk`, when the sun sets before 15:30; in the Adriatic it sets after 16:00 all year).
  - Land breeze factor `g`: if `utcMs ≥ t.sunsetUtcMs`: `ss(sunset + riseFromSunsetH·H, sunset + fullFromSunsetH·H, utcMs)`; else `1 − ss(sunrise, sunrise + fallAfterSunriseH·H, utcMs)` (so it is 1 from midnight until sunrise and 0 by 06:46 in June). With `polar`, `g = 0`.
  - Speeds `ks = sizeKn × f` from `seaBreeze.fromDeg`, `kl = landBreeze.kn × g` from `landBreeze.fromDeg`. As vectors (where the wind comes from): `x = ks·sin(ds) + kl·sin(dl)`, `y = ks·cos(ds) + kl·cos(dl)` (degrees to radians), `m = hypot(x, y)`.
  - `dirDeg = m < 0.1 ? seaBreeze.fromDeg : wrap180(atan2(x, y) in degrees)`; `twsKn = max(calmKn, m)`; `gustPct = ks + kl > 0 ? (seaBreeze.gustPct·ks + landBreeze.gustPct·kl) / (ks + kl) : 0`.
- **bura.**
  - Night factor `n`: if `utcMs ≥ t.sunsetUtcMs`: `ss(sunset, sunset + nightRampH·H, utcMs)`; else `1 − ss(sunrise, sunrise + nightRampH·H, utcMs)`. With `polar`, `n = 0`.
  - `twsKn = max(calmKn, sizeKn × (1 + nightPct/100 × n) × ss(0, riseS, patternS))`; `dirDeg = bura.fromDeg`; `gustPct = bura.gustPct`.
- **jugo.** `twsKn = max(calmKn, sizeKn × ss(0, riseS, patternS))`; `dirDeg = jugo.fromDeg`; `gustPct = jugo.gustPct`. (A real jugo builds over a day or two, PT-66; here it reaches its strength in two minutes, like the bura: a known limitation, 30.3.)

`windMean`: a local wind → `localWindMean(mode, windMode.size, utcMs, max(0, timeS − windMode.startS), areaData)`; any other mode → `{ dirDeg: controls.ctl_wind_dir, twsKn: controls.ctl_wind_speed, gustPct: 0 }`.

`trueWind`: a clock wind → `m = windMean(…)`; `windAt(m.dirDeg, m.twsKn, m.gustPct > 0 ? { mode: 'gusty', seed: windMode.seed, size: m.gustPct, startS: windMode.startS } : { mode: 'steady', seed: windMode.seed, size: 0, startS: windMode.startS }, timeS, data)`; any other mode → `windAt(controls.ctl_wind_dir, controls.ctl_wind_speed, windMode, timeS, data)` (exactly today).

**Edge cases.** `windAt` clamps every wind to `windModes.maxTwsKn` (40 kn): a bura of 24 kn at night with a full gust (24 × 1.2 × 1.65 = 47.5) is cut to 40. Paused (`dt = 0`): the clock and `rig.timeS` do not move, so the mean and the wind stay. Held still: the wind follows the clock as in Sailing (the clock runs). The mean can be below 1.5 kn only through `calmKn` changes; the gusty pattern multiplies the mean, so a calm stays calm.

### 24.4 Store and URL

**`src/app/store.ts`:**

- `windNow(controls, windMode, timeS)` is replaced by `trueWind(windMode, controls, utcMs, timeS, null)` at every call (`initialState`, `setWindMode`, `setWindSize`, `newWindPattern`, `step`).
- New private helper `withWindMean(controls: Controls, windMode: WindModeState, utcMs: number, timeS: number, script: readonly WindKey[] | null): Controls`: for a clock wind, `withControls(controls, …)` is **not** used (it snaps to the control's step); return `{ ...controls, ctl_wind_dir: m.dirDeg, ctl_wind_speed: m.twsKn }` with `m = windMean(…)`, or `controls` itself when both are already equal; otherwise `controls` unchanged.
- **`step`:** `utcMs = state.clock.utcMs + dt × 1000` first; `controls = withWindMean(state.controls, state.windMode, utcMs, state.rig.timeS + dt, null)`; `wind = trueWind(state.windMode, controls, utcMs, state.rig.timeS + dt, null)`; the rest of the step starts from this `controls` (where it says `let controls = state.controls` today) and `clock = dt === 0 ? state.clock : { utcMs }`.
- **`initialState`:** introduce `const clockUtcMs = overrides.clockUtcMs ?? defaultClockUtcMs()` (used for `clock` too); make `controls` a `let`; after `controls` and `windMode`, `controls = withWindMean(controls, windMode, clockUtcMs, 0, null)`, then `wind = trueWind(windMode, controls, clockUtcMs, 0, null)`; every later use in `initialState` (`engageAutopilot`, the rig, the boat) reads this `controls`. The existing `patterned` test (`windMode.mode !== 'steady'`, which hands `wind` to the rig and the boat) is true for the clock winds, as wanted.
- **`setControls`:** drop `ctl_wind_dir` and `ctl_wind_speed` while `state.exercise !== null` (as today) **or** `isClockWind(state.windMode.mode)`; return `state` if nothing is left. (The presets dispatch `setControls` too; the UI also disables them, 24.5.)
- **`setWindMode`:** as today, then: into a clock wind → `controls = withWindMean(…)` at `state.clock.utcMs`, `state.rig.timeS`; **out of a clock wind** into a pattern mode → `ctl_wind_dir: Math.round(controls.ctl_wind_dir)` (`normalizeWindFrom`), `ctl_wind_speed: Math.min(30, Math.max(0, Math.round(controls.ctl_wind_speed)))`, so the hand-set wind starts from what was blowing. `wind` from `trueWind` in both cases; `withTimeRule` as today.
- **`setWindSize`:** uses `sizeRange(state.windMode.mode)` (now also the local winds), then `withWindMean` and `trueWind`.
- **`newWindPattern`:** as today (a local wind gets a new gust seed; the bura and the jugo start their two-minute rise again), then `withWindMean` and `trueWind`.
- **`setClock`:** after the new clock, `controls = withWindMean(…)` and `wind = trueWind(…)` at the new `utcMs` (a clock wind jumps to that hour's wind; other modes do not change). It does not restart a bura's or jugo's rise (`startS` stays).
- **Accepted as they are:** `setWindSize` and `newWindPattern` restart a bura's or jugo's two-minute rise (as they restart a pattern today); `inPlace` (going to another place) sets `startS: 0` and so restarts it too; `reset` gives Steady. `withWindMean` makes a new `controls` object every step while the mean changes; the panels that compare `controls` per frame redraw then, which is cheap.

**`src/app/urlState.ts`:**

- `WIND_MODE_PARAMS` gains `summer: 'summer'`, `bura: 'bura'`, `jugo: 'jugo'` (type `Record<Exclude<WindModeId, 'steady' | 'scripted'>, string>` from M97).
- `parseWindMode` reads them with `wg` in the local wind's `sizeKn` range (outside it: the default) and `seed` as today.
- When the link's `wm` is a local wind, `wd` and `ws` are parsed as today but have no effect: `initialState` overwrites the controls' wind with the mean. `parseBoat(params, controls.ctl_wind_dir ?? 60, …)` keeps reading the link's `wd` (or 60) for its default autopilot target, which matters only for a link with an autopilot and no `apt` (accepted).
- `serializeUrlState` writes no `wd` and no `ws` while `isClockWind(state.windMode.mode)`.
- `clk` as today. Old links: unchanged.

### 24.5 UI

**`src/ui/windModePanel.ts`:** a second fieldset after the "Wind changes" fieldset, before the size field: legend `wind.local.label`, hint `wind.local.hint`, three radios with `name: 'wind-mode'` (one group with the five; a choice in either row unchecks the other row), `data-testid` `wind-mode-summer`, `wind-mode-bura`, `wind-mode-jugo`, labels `wind.mode.summer`, `wind.mode.bura`, `wind.mode.jugo`, the same `segments segments-wrap` look as the first row. The fieldset carries `data-testid="wind-local"` and `data-part-id="env_wind"`. `refresh` sets `checked` on all eight inputs (both rows), so a link or another action shows the right one. The mode hint under the first row (`wind-mode-hint`) shows the chosen mode's hint for every mode (also the local ones). `SIZE_STEP` gets `summer: 1, bura: 1, jugo: 1` (M97 adds `scripted: 1`). The size slider shows for the local winds with the labels `wind.size.summer`, `wind.size.bura`, `wind.size.jugo` (only `{value}`; no `{min}`); the label element `sizeName` gets `data-testid="wind-size-name"`. "New pattern" stays.

**`src/ui/windPanel.ts`:** while `isClockWind(state.windMode.mode)`:
- the dial ignores dragging and taps (its arrow still turns with the mean);
- the − / + buttons, the speed slider (give it `data-testid="wind-speed"`) and the five presets get `disabled`;
- the speed hint (`wind-speed-hint`, "In a wind mode the slider moves…") is hidden (the note below replaces it);
- a note under the dial, `<p class="hint wind-locked-note" data-testid="wind-locked-note">`, shows `wind.locked` with `{wind}` = the mode's name (`t('wind.mode.<mode>')`).

The dial gets `aria-disabled="true"` and the class `is-locked`, which in `src/style.css` sets `opacity: 0.45` (the look of `.autopilot .segment:disabled`; no new colour).

**`src/ui/instrumentStrip.ts`:** the GUST badge shows for the clock winds too: `(state.windMode.mode === 'gusty' || isClockWind(state.windMode.mode)) && state.wind.twsKn > gustBadgeFraction × state.controls.ctl_wind_speed` (the controls hold the mean, 23.3). "Wind now" under the dial keeps showing the true wind.

At phone size the new row wraps like the first (three segments fit on a 360 px screen at the existing segment width); touch targets stay at least 44 px (`--touch`).

### 24.6 Strings and registry

`content/lang/en/ui.json`, after `wind.mode.dying.hint` (Russian drafts in the same place in `ru/ui.json`):

| Key | English |
|---|---|
| `wind.local.label` | `Local winds` |
| `wind.local.hint` | `Winds of this sailing area that follow the clock on board. They set the wind themselves; speed up time to watch them change.` |
| `wind.mode.summer` | `Summer day` |
| `wind.mode.bura` | `Bura` |
| `wind.mode.jugo` | `Jugo` |
| `wind.mode.summer.hint` | `A summer day on the Adriatic: calm in the morning; from about 10:00 the maestral (a sea breeze) comes in from the north-west, strongest around 14:00 and gone by sunset; after dark a light breeze (the burin) blows off the land until the morning.` |
| `wind.mode.bura.hint` | `A strong north-east wind that pours down from the mountains: it starts within two minutes, comes in hard gusts and blows harder at night.` |
| `wind.mode.jugo.hint` | `A steady south-east wind from the sea with few gusts. A real jugo builds over a day or two and raises big waves; here it starts at its strength.` |
| `wind.size.summer` | `Maestral at its strongest {value} kn` |
| `wind.size.bura` | `Bura {value} kn, gusts up to half as strong again` |
| `wind.size.jugo` | `Jugo {value} kn` |
| `wind.locked` | `The {wind} sets the wind. Choose Steady to set it yourself.` |

`wind.locked` reads "The Summer day sets the wind." for the summer mode; that is accepted (the name is the mode's).

Registry: a new source `"wiki:sea-breeze": "https://en.wikipedia.org/wiki/Sea_breeze"` and, after `term_maestral`, `{"id": "term_burin", "kind": "term", "phase": 10, "group": "wind", "status": "draft", "sources": ["wiki:sea-breeze"], "related": ["term_maestral", "term_bora"]}`; add `"term_burin"` to `term_maestral`'s `related`. Glossary (English, after `term_maestral`): `"term_burin": { "name": "Burin", "alternatives": [{ "term": "land breeze" }], "short": "The light night breeze that blows off the land on the Adriatic coast.", "what": "At night the land cools faster than the sea, so a light breeze blows from the land out to sea: the burin. It is weaker than the day's sea breeze (the maestral) and dies in the morning.", "textStatus": "draft" }`; Russian draft in the same place, `textStatus: "draft"`.

### 24.7 Tests

`tests/localWinds.test.ts` (dates are 1 June 2026, `utcFromLocal(2026, 6, 1, h, m, area)`; ± is the band):

1. **Summer, size 14** (`localWindMean('summer', 14, utc, 0)`), `twsKn` and `dirDeg`: 08:00 1.50 ± 0.01 from −45; 11:00 2.19 ± 0.02; 12:00 7.00 ± 0.02; 13:00 11.81 ± 0.02; 14:00 and 15:00 14.00 ± 0.01 from −45; 17:00 9.75 ± 0.05; 19:00 2.49 ± 0.05; 21:00 1.50 ± 0.01; 23:00 5.17 ± 0.05 from 45 ± 0.5; 2 June 01:00 6.00 ± 0.01 from 45; 2 June 06:00 3.06 ± 0.05 from 45. `gustPct` at 14:00 is 15, at 01:00 is 10.
2. **Size 20** first reaches a mean of 15 kn between 12:40 and 12:43 (minute steps from 12:00).
3. **Bura, size 18:** at 12:00 with `patternS` 0 → 1.5; 60 → 9.0 ± 0.01; 120 → 18.0 ± 0.01; at 23:00 with `patternS` 600 → 21.6 ± 0.01; 2 June 03:00 → 21.6; 2 June 06:30 → 18.0 ± 0.05 (sunrise 05:16 + 1 h ramp); `dirDeg` 45, `gustPct` 50.
4. **Jugo, size 16:** `patternS` 120 → 16.0 ± 0.01 from 135, `gustPct` 10.
5. `sizeRange('summer')` = `{ min: 8, max: 22, default: 14 }`; `'bura'` `{10, 24, 18}`; `'jugo'` `{10, 28, 16}`; `initialWindMode({ mode: 'jugo' }).size` = 16.
6. **`trueWind`** for a pattern mode equals today's `windAt(controls…)` for the same arguments (steady and gusty, seed 1, 0–600 s every 7 s); for summer, size 20, at 14:00, seed 1, `startS` 0: over 0–900 s every second, every `twsKn` in [16.0, 25.0] and their mean in 20.4 ± 0.5 (prototype: 17.34 … 24.52, mean 20.40; gusts add more than lulls take away).

`tests/physicsTruths10.test.ts` (named after the rules):

- `PT-63 the maestral blows from the north-west in the afternoon and is gone by sunset`: summer, default size, 14:00: `dirDeg` −45 and `twsKn` ≥ 0.95 × 14; 08:00 and 21:00: `twsKn` = `calmKn`.
- `PT-64 at night a lighter breeze blows off the land`: summer, 2 June 01:00: `dirDeg` = `landBreeze.fromDeg` (45) and `twsKn` < the 14:00 mean; 2 June 09:00: `twsKn` = `calmKn`.
- `PT-65 the bura comes suddenly, in gusts, and is stronger at night`: default size; `patternS` 120 → ≥ 0.99 × size; the mean at 2 June 02:00 ≥ 1.15 × the mean at 12:00; `trueWind` at 12:00, seed 1, `startS` −120 (so the rise is over), over 0–900 s every second: its largest `twsKn` ≥ 1.4 × the mean (prototype 1.67).
- `PT-66 the jugo is a steady south-east wind`: `dirDeg` 135; `trueWind`, seed 1, `startS` −120, over 0–900 s every second: every `twsKn` within ± 20 % of the mean (prototype −10.4 % … +16.3 %).

`tests/stepCost.test.ts`: a case like its gusty one with `?wm=summer&clk=202606011400` at ×16: within its 3 ms a frame (each step computes `localParts` and `sunTimes`; prototype cost unchanged within measurement).

`tests/store.test.ts` (each case opens its link with `parseUrlState`, then dispatches): (a) `setWindMode summer` with the clock at 14:00 (`?clk=202606011400`): `controls.ctl_wind_speed` 14.00 ± 0.01 and `ctl_wind_dir` −45; (b) `setControls { ctl_wind_speed: 5 }` then changes nothing; (c) from `?clk=202606011959`, `setWindMode summer`, `setTimeScale 16`, then 600 steps of 0.05 s: the mean falls (each step's `ctl_wind_speed` ≤ the one before, within 1e-9); (d) `setClock` to 23:00 → `ctl_wind_dir` 45 ± 0.5; (e) `setWindMode steady` from summer at 13:00 → `ctl_wind_speed` 12 (11.81 rounded), `ctl_wind_dir` −45, and `setControls { ctl_wind_speed: 5 }` works again.

`tests/urlState.test.ts`: `?wm=bura&wg=20` opens bura with size 20; `?wm=bura&wg=40` opens size 18; `?wm=summer&wd=90&ws=3&clk=202606011400` opens with the mean 14 from −45 (wd and ws ignored); serializing that state has `wm=summer`, `clk=202606011400`, no `wd`, no `ws`; an old link without `wm` serializes exactly as before.

### 24.8 Browser checks (`scripts/shots-m94.mjs`)

Scenes (phone and the other sizes, as usual): `local-summer` = `?wm=summer&clk=202606011400&cam=top` with the Conditions section open (as M70's conditions scenes open it); `local-bura` = `?wm=bura&clk=202606010800&cam=top`.

Live checks (test clock):
1. Open `?clk=202606011400`, open Conditions, tap `wind-mode-summer`: it is checked, `wind-locked-note` is visible and says "Summer day", `wind-speed` is `disabled`; after `page.waitForTimeout(2000)` the `wind-now` text says "from" a bearing between 315° and 326° (a gust veers it up to 10°, `gusty.veerMaxDeg`).
2. Open `?wm=summer&clk=202606012330`: after `page.waitForTimeout(2000)`, `wind-now` says "from" a bearing between 045° and 056° (the burin). (`setClock`'s refresh is covered by the store test.)
3. Tap `wind-mode-steady`: `wind-locked-note` is hidden and the speed slider is enabled.
4. Open `?wm=bura&wg=20&clk=202606011200`: `wind-mode-bura` is checked and `wind-size-name` starts with "Bura 20 kn"; after `page.waitForTimeout(150000)` the number in `strip-true` (the true wind speed) is at least 10.

### 24.9 Done when / not in M94

Done: the three local winds work from Conditions and from links, on a phone and a computer; the tests above and the earlier ones pass; `SHOTS_ONLY=m94,general,m70` pass locally (m70 for the gust counter that now reads the mean), then CI with `CI groups: all` in the PR description (the store, the URL and the Conditions section change). Not in M94: the scripted wind and the exercises (M96–M98), the time-lapse (M95), local winds in Learn's "Try it", a gust preview on the water for the local winds (the dark patches stay for the Gusty mode only: `gustProfile` returns null for other modes, unchanged).

### 24.10 Decided in the M94 PR (recommended; merging accepts it)

- Built as specified, with the spec's numbers: every band of 24.7 held on the first run (summer, size 14, 11:00 2.19, 13:00 11.81, 23:00 5.17; the bura's 9.0 and 21.6; the size 20 maestral reaches 15 kn at 12:41; the trueWind band 16.0–25.0 with a mean of 20.4). Nothing tuned.
- The locked look also disables the − / + buttons next to the dial and the five presets (not only the dial and the slider): the store already refuses their values, the disabled look tells the learner why.
- `tests/glossary.test.ts`: the wind group has 13 entries (the new `term_burin`); `tests/ciPlan.test.ts` counts 92 groups and `m94` is among the four newest.
- `.github/ci-times.json`: `m94` is 300 until its time is known.
- Question recorded in the PR: the jugo starts at its strength within two minutes (30.2). Recommended; merging accepts it.

---

## 25. M95: Time-lapse **(10c)**

**Independent review: required** (the step is cut into slices in `reduce`; a rule in the shared step drops the speed; a new link value).

What the owner sees: at anchor, moored or held still, the time card has a **Time-lapse** row with ×60 and ×240; at ×240 an hour passes in 15 seconds and a whole night in about three minutes, the sky turning dark and light again. At sea the row is replaced by a one-line hint. Raising the anchor or letting the last line go drops the speed back to ×1.

### 25.1 Files

New: `scripts/shots-m95.mjs`.
Changed: `content/boat/hanse508.json` (`windModes`; `BoatData` is `typeof hanse508`, so the type follows), `src/model/timeScale.ts`, `src/model/settings.ts` (the `timeScale` comment: "one of `windModes.timeScales` or `timeLapseScales`"), `src/app/store.ts`, `src/app/urlState.ts`, `src/ui/timeBar.ts`, both `ui.json` (Russian drafts), `docs/review/ru.md` (`npm run review-doc -- ru`), `tests/timeBar.test.ts` (where the time-scale helpers are tested today), `tests/store.test.ts`, `tests/stepCost.test.ts`, `tests/urlState.test.ts`, `scripts/shots.mjs` (import, `SCENES`, `liveGroups`), `.github/ci-times.json` (`m95`: 300), `docs/CODE_MAP.md`. Not `docs/BOAT_REFERENCE.md`: these are app values, not boat facts.

### 25.2 Data (`content/boat/hanse508.json`, `windModes`, after `timeScales`)

```json
"timeLapseScales": [60, 240],
"timeLapseSliceS": 1.6,
```

Not tunable: 1.6 s is `MAX_STEP_S` (0.1 s) × 16, the longest step the model takes today, so a slice is never longer than what the model is already tested with.

### 25.3 Model and store

**`src/model/timeScale.ts`:**

```ts
export function isTimeScale(value: number, data?: BoatData): boolean;      // now: in timeScales or timeLapseScales
export function isTimeLapseScale(value: number, data?: BoatData): boolean; // in timeLapseScales
/** ×60 and ×240: where the speed part shows (timeSpeedAvailable) and the boat is held still, anchored (on the bottom or set) or has a mooring line made fast. */
export function timeLapseAvailable(
  boatMode: 'sailing' | 'held',
  windMode: WindModeId,
  timeBar: boolean,
  anchorPhase: AnchorPhase,
  linesMadeFast: number,
): boolean;
// = timeSpeedAvailable(boatMode, windMode, timeBar) && (boatMode === 'held' || anchorPhase === 'bottom' || anchorPhase === 'set' || linesMadeFast > 0)
```

`stepTimeScale`, `slowestTimeScale` and `fastestTimeScale` keep reading `timeScales` only (nothing in the UI calls `stepTimeScale` today; from 60 or 240 it would step from ×1, as for any value not on the list). `timeScaleText(60)` is "60", `(240)` "240". `timeScale.ts` imports `AnchorPhase` with `import type` from `./anchor` (no runtime import). A line counts as made fast when it is in `lines.lines` (the crew's walk with a line is `lines.crew`, not in the list). A private store helper `lapseOk(state)` = `timeLapseAvailable(state.boat.mode, state.windMode.mode, state.settings.timeBar, state.anchor.phase, state.lines.lines.length)`; wherever it is used it reads the state it is given (the new state in `withTimeRule` and at the end of `step`).

**`src/app/store.ts`:**

- **`setTimeScale`:** a time-lapse scale is refused (returns `state`) unless `lapseOk(state)`; the other scales as today.
- **`withTimeRule`:** after today's rules, a time-lapse scale with `!lapseOk(next)` becomes 1.
- **`step`:** at the end of the `case 'step'` branch, on the state it returns: if `isTimeLapseScale(settings.timeScale)` and `!lapseOk(result)`, return it with `timeScale: 1` (the windlass lifted the anchor off the bottom, the last line was let go, or Sailing was chosen with nothing holding her).
- **`reduce` (the exported one, which today wraps `reduceUnlogged` and the log):** add at its very top, before the `demo` branch:

```ts
  if (action.type === 'step' && !state.paused) {
    const frame = Math.min(MAX_STEP_S, Math.max(0, action.dt));
    const slices = Math.ceil((frame * state.settings.timeScale) / boatData.windModes.timeLapseSliceS - 1e-9);
    if (slices > 1) {
      let next = state;
      for (let i = 0; i < slices; i += 1) next = reduce(next, { type: 'step', dt: frame / slices });
      return next;
    }
  }
```

Each slice is a whole `reduce` call (one level deep: a slice's `frame × timeScale` is at most `timeLapseSliceS`, so it does not slice again), so the alert history, the coach and the log see every slice. At ×16 or slower `slices` is 1 for every frame up to `MAX_STEP_S`: nothing changes there. The remaining slices of a frame run as later frames would: if a slice paused the app (a mistake) the next slices step 0 s; if a slice dropped the speed to ×1 (the rule above) they run at ×1.

**`src/app/urlState.ts`:** `tx` accepts 60 and 240 through `isTimeScale`. `initialState` ends in `withTimeRule`, before `parseUrlState` attaches the anchor and the lines (around its lines 252–258), so a time-lapse `tx` is at ×1 there. After the anchor and the lines are attached, if the link's `tx` is a time-lapse scale and `timeLapseAvailable` holds for that final state, set `settings.timeScale` to it; otherwise leave it at ×1. Old links: unchanged.

Edge cases: Paused: no slices (`dt` is 0). Held still with a steady wind: `timeSpeedAvailable` is false, so no time-lapse (nothing changes with time there); held still with a local wind: available. The exercise demo (Watch, Show me) keeps its ×4 cap until M96, so a demo at ×60 or ×240 runs at ×4 and the time card's existing `time-demo-capped` hint shows (as for ×8 and ×16 today).

### 25.4 UI (`src/ui/timeBar.ts`)

In the time card, after the speed section's `.time-scales` row and inside the same `section.time-speed`:
- a heading `h3.time-card-heading` `time.lapseHeading`;
- a row `div.time-scales` with `data-testid="time-lapse"` and two buttons built like the seven (`class="time-scale"`, `data-testid` `time-scale-60` and `time-scale-240`, `aria-label` `time.scaleAria`), whose text is `'×' + timeScaleText(scale)` ("×60", "×240": unlike the seven, where only ×1 has the sign, so the row reads as speeds on its own); push them onto the same `scaleButtons` list, so the existing loop sets `aria-pressed` and `is-current` on them too; the row and its heading are shown only while `lapseOk`;
- a hint `<p class="hint" data-testid="time-lapse-hint">` with `time.lapseHint`, shown instead while the speed part shows and `lapseOk` is false.

`lapseOk` goes into `refresh`'s `key` array, so the row and the hint change when the anchor lands or lifts or a line is made fast or let go. The time widget's chip shows "Time ×240" as for any scale. No CSS change: `.time-scales` and `.time-scale` already lay out a row of buttons at 44 px touch height.

### 25.5 Strings

After the `time.speedHeading` key in both `ui.json` (Russian drafts in `ru/ui.json`): `time.lapseHeading` = `Time-lapse`; `time.lapseHint` = `Time-lapse (×60 and ×240) works at anchor, tied up or held still.`

### 25.6 Tests

- `tests/timeBar.test.ts`: `isTimeScale(60)`, `isTimeScale(240)` true, `isTimeScale(32)` false; `isTimeLapseScale(16)` false; `timeLapseAvailable`: sailing, steady, bar on, anchor `set`, 0 lines → true; same with `hanging` → false; `stowed` with 1 line → true; held, gusty → true; held, summer → true; held, steady → false; sailing, `bottom`, bar off → false; `fastestTimeScale()` still 16.
- `tests/store.test.ts`: (a) open water, Sailing: `setTimeScale 240` is refused; (b) the link `?pl=bay&pe=-1660.0&pn=0.0&hdg=90&bs=0&an=60&ax=-1600.0,0.0&as=1&wd=90&ws=6&sea=sheltered` (anchor set): `setTimeScale 240` is accepted; one `step` of `1/60` s advances `rig.timeS` by 4.000 ± 1e-9 and gives the same state (`toEqual`) as three `reduce` calls of `{ type: 'step', dt: (1 / 60) / 3 }` (the slicer's own expression, so the arithmetic is identical; each call is one slice); (c) from (b) at ×240, `windlass 'up'` held until the anchor's phase is `hanging`: in the step where it becomes `hanging` the scale goes to 1.
- `tests/stepCost.test.ts` (as its other cases): the **anchored state** = the anchor-shore good run (`anchorPilot` from `tests/harbourPilot.ts`, which re-exports `src/app/exercisePilots.ts`; frames of 0.05 s as `anchorRun` in `tests/harbourExercises.test.ts`) at the frame its run's status becomes `done`, then `{ ...s, exercise: null, paused: false }` and `setTimeScale 240`: 600 frames of `1/60` s cost at most 6 ms each on average (prototype: 0.3–0.4 ms per slice, three slices a frame).
- **Slices give the same night** (`tests/store.test.ts`, `{ timeout: 60000 }`): from that anchored state (its wind mode is Steady, so `setControls { ctl_wind_dir: 90, ctl_wind_speed: 6 }` applies), run 3600 s of app time three ways: ×1 with `dt` 0.05, ×16 with `dt` 0.1, ×240 with `dt` 1/60. The final `boat.eastM`, `boat.northM` of the ×16 and ×240 runs are within 0.05 m of the ×1 run's and `headingDeg` within 0.1° (prototype: equal to 0.01 m and 0.1°, at about −1668.5, 1.3, heading 96.7).
- `tests/urlState.test.ts`: the anchored link of (b) with `&tx=240` opens at ×240; `?tx=240` (open water) opens at ×1; `?tx=16` unchanged.

### 25.7 Browser checks (`scripts/shots-m95.mjs`, test clock)

Scenes: `lapse-card` = the anchored link of 25.6 (b) with `&clk=202606012000&cam=top`, the time card opened by a tap on `time-open`.

Live checks:
1. Open the anchored link with `clk=202606012000`; open the time card (tap `time-open`): `time-lapse` is visible with two buttons; tap `time-scale-240`: `time-status` says "×240"; `page.waitForTimeout(15000)` (3600 s of app time): `clock-chip` reads 21:00 or 21:01.
2. Open `?clk=202606012000` (open water, Sailing): the time card shows `time-lapse-hint` and no `time-scale-240`.
3. On the anchored page at ×240, open the Anchor section and press and hold `windlass-up` (the Anchor section's Up button; mouse down, then poll with `page.waitForTimeout(500)`) until the anchor leaves the bottom: `time-status` says "×1".

### 25.8 Done when / not in M95

Done: ×60 and ×240 work at anchor, tied up and held still, on a phone and a computer; the step cost test passes (the owner checks the phone's frame rate with the WORKFLOW checklist); tests and `SHOTS_ONLY=m95,general,m92` pass, then CI (name `m92` in `CI groups:`). As every milestone: a decisions-log row in ROADMAP and "Decided in the M95 PR" notes here (CLAUDE.md). Not in M95: the speed-up of exercise steps and the demo at time-lapse speed (M96), time-lapse while sailing (owner answer 4), sound at time-lapse speed (the sound engine reads the state as it is; nothing is changed for it).

### 25.9 Decided in the M95 PR (recommended; merging accepts it)

- Built as specified. The step cost at ×240 at anchor and the "same night" test passed on the first run (the numbers are in the PR's Tests section). Nothing tuned.
- `tests/harbourPilot.ts` gets `anchoredState()` (the anchor-shore good run to its `done` frame, then out of the exercise), used by the store and step-cost tests.
- `tests/ciPlan.test.ts` counts 93 groups and `m95` is among the four newest; `.github/ci-times.json`: `m95` is 60 (measured 30 s locally).
- The Russian drafts: `time.lapseHeading` = "Ускорение времени", `time.lapseHint` = "Ускорение времени (×60 и ×240) работает на якоре, у причала или когда яхту держат на месте." (`npm run review-doc -- ru` run).
- Question recorded in the PR: the time-lapse row is hidden (not greyed) while she is sailing free, with the hint in its place. Recommended; merging accepts it.

---

## 26. M96: A step's speed-up, an exercise's start time, and "The afternoon maestral" **(10c)**

**Independent review: required** (the coach changes the time scale; new check fields and target rows; the demo's speed cap; links of runs).

What the owner sees: a new exercise **The afternoon maestral** in "Wind and weather": it starts at 12:20 in a light wind; time runs ×16 by itself while the learner waits for the maestral to reach 15 knots, then the learner rolls the jib and the main in, and time runs ×16 again until 13:30. Every row of the exercise list shows where it happens ("Open water", "Marina", "Bay") and, when it has one, its start time; the setup card says when it starts. (The scripted wind comes in M97, with the first exercise that needs it.)

### 26.1 Files

New: `scripts/shots-m96.mjs`.
Changed: `content/exercises/exercises.json` (the exercise), both `exercises.json` texts, `src/model/localWinds.ts` (`localHourOf`), `src/model/exercises.ts` (types, `checkPasses`, `checkTargets`, `targetReading`), `src/app/exerciseRun.ts` (`stepSpeedUp`, `applyStepSpeed`), `src/app/exercisePilots.ts` (`maestralPilot`, `pilotFor`), `src/app/store.ts` (`applyStepSpeed` in `reduce`), `src/app/urlState.ts` (no `tx` in a run's link), `src/app/app.ts` (the demo's speed), `src/ui/exercisePanel.ts` (list row, setup card), `src/ui/stepCard.ts` (the two new target rows), `src/ui/timeBar.ts` (the demo-capped hint), `src/style.css`, both `ui.json`, `tests/exercises.test.ts`, `tests/exerciseRun.test.ts`, `tests/exercisePilots.test.ts`, `tests/localWinds.test.ts`, `tests/urlState.test.ts`, `tests/physicsTruths10.test.ts`, `docs/review/ru.md` and `docs/review/ru-exercises.md` (`npm run review-doc -- ru`), `scripts/shots.mjs` (import, `SCENES`, `liveGroups`), `.github/ci-times.json` (`m96`: 300), `docs/CODE_MAP.md`. `docs/WORKFLOW.md` and `docs/EXERCISES.md` are already written by the planning PR.

### 26.2 Data

**Types (`src/model/exercises.ts`):**

```ts
export interface ExerciseStep  { /* as today, and: */ speedUp?: number }   // a value of timeScales or timeLapseScales, > 1
export interface ExerciseCheck { /* as today, and: */ meanWindKn?: Range; localHour?: Range }
export interface CheckSource   { /* as today, and, optional like the other extras: */ clock?: ClockState }
```

| Field | Holds when |
|---|---|
| `meanWindKn` | `source.controls.ctl_wind_speed` (the mean wind, 23.3) in range |
| `localHour` | `source.clock` is given and `localHourOf(source.clock.utcMs)` is in range (false without a clock) |

`AppState` has `clock`, so the store passes it as today's sources do. **Target rows** (`checkTargets`, `targetReading`, `src/ui/stepCard.ts`), after the existing ones in this order: `{ kind: 'meanWind'; range }` (value: `Math.round(controls.ctl_wind_speed)`) and `{ kind: 'localHour'; range }` (value: the local time as "HH:MM"). Their texts (26.5): `meanWind` shows `exercise.target.meanWindFrom` when `range[1] ≥ 99`, else `exercise.target.meanWind`; the reading `exercise.target.nowKn`. `localHour` shows `exercise.target.timeFrom` when `range[1] ≥ 24`, else `exercise.target.time` (the hours as "HH:MM": 13.5 → "13:30"); the reading `exercise.target.nowWord`.

**Validation** (in `tests/exercises.test.ts`, where the data is checked today): add `meanWindKn` and `localHour` to `FIELDS`; `checkProblems` reports a range with `min > max` for them; the test "has valid ids, groups, ropes, checks and mistakes" also checks every `speedUp` is in `timeScales` or `timeLapseScales` and > 1. The test "every start link parses, with the wind it names" compares `wd`/`ws` only for a start that has both and no `wm` of a local wind and no `wind` (the maestral, bura and night starts have neither; say so in a comment). A new data test: every start's `pl` is absent, `open`, `marina` or `bay` (each has an `exercise.place.*` string).

**The exercise** (appended to `exercises`; it shows in "Wind and weather" after *Too much wind*):

```json
{
  "id": "maestral", "group": "wind", "ropes": "easy", "crew": false,
  "sections": ["ropes", "sails", "autopilot", "conditions", "learn"],
  "start": "?hdg=45&ms=40&js=60&ap=wind&apt=-90&sea=flat&wm=summer&wg=20&clk=202606011220",
  "steps": [
    { "id": "wait", "opens": "ropes", "holdS": 0, "speedUp": 16, "check": { "meanWindKn": [15, 99] }, "bar": ["control:ctl_mainsheet"] },
    { "id": "jib-in", "opens": "ropes", "holdS": 2, "check": { "jibOutPct": [0, 45] }, "bar": ["control:ctl_jib_sheet", "control:ctl_jib_furl"] },
    { "id": "main-in", "opens": "ropes", "holdS": 2, "check": { "mainOutPct": [50, 65] }, "bar": ["control:ctl_jib_sheet", "control:ctl_main_furl"] },
    { "id": "peak", "opens": "ropes", "holdS": 0, "speedUp": 16, "check": { "localHour": [13.5, 24], "heelDeg": [0, 22] }, "bar": ["control:ctl_mainsheet"] }
  ],
  "mistakes": [
    { "id": "overpowered", "serious": false, "on": { "alert": "overpowered" } },
    { "id": "round-up", "serious": false, "on": { "alert": "roundUp" } },
    { "id": "sail-worn", "serious": false, "on": { "alert": "sailWorn" } }
  ]
}
```

The maestral (`wm=summer`, strength 20) blows from 315; at 12:20 its mean is 12.48 kn (24.3). Heading 045 puts it on the port beam (`apt=-90`: the Wind autopilot holds 90° with the wind on the port side) and sails her away from the land (23.8). The `peak` step's heel limit (22°) is far above the good run's 17.2°, so a gust at the moment 13:30 comes does not fail it.

### 26.3 Model and app logic

**`src/model/localWinds.ts`:** `export function localHourOf(utcMs: number, areaData: AreaData = area): number` (23.3).

**`src/app/exerciseRun.ts`:**

```ts
/** The current step's speed-up while the run is `running` (also while "pause after each step" holds it), else null. */
export function stepSpeedUp(state: AppState): number | null;
/** When the speed-up differs between two states: set the new one (if allowed), or ×1 when the new state has none. */
export function applyStepSpeed(previous: AppState, next: AppState): AppState;
```

`applyStepSpeed`:
- `a = stepSpeedUp(previous)`, `b = stepSpeedUp(next)`; if `a === b`, return `next`.
- If `b !== null`, set `settings.timeScale = b` when it is allowed, else leave the scale. Allowed means:
  - for a time-lapse scale, `timeLapseAvailable(next.boat.mode, next.windMode.mode, next.settings.timeBar, next.anchor.phase, next.lines.lines.length)` (import from `src/model/timeScale.ts`);
  - otherwise `timeSpeedAvailable(next.boat.mode, next.windMode.mode, next.settings.timeBar)`.
- If `b === null`, set `settings.timeScale = 1`.

`src/app/store.ts`: in the exported `reduce`, after `reduceUnlogged` and `logAction`, for **every action except `load` and `demo`**: `next = applyStepSpeed(state, next)`. So Start, a step passing, Back, a mistake (status `mistake`: ×1), Carry on (the step's speed-up again), the end of the run (done, failed, Stop), leaving Exercises mode and Reset all set the speed. The learner can still choose another speed during a step; it is kept until the step changes. With the Time bar switch off (Settings) the speed part is not available, so a speed-up does not apply (30.3).

**Links of a run.** `exerciseStartLink` writes no `tx` (as today). From M96 `serializeUrlState` leaves `tx` out of a waypoint link too: the coach sets the speed on Start and Back.

Leaving the maestral run keeps the Summer day wind (a local wind is an ordinary wind mode).

**`src/app/app.ts` (the demo, PHASE10_PHONE_SPEC 4.2):** in the demo branch:
- `const up = stepSpeedUp(state)`;
- `scale = Math.min(settings.timeScale, Math.max(DEMO_MAX_SCALE, up ?? 0))`;
- the part length is `isTimeLapseScale(scale) ? boatData.windModes.timeLapseSliceS : DEMO_PART_S` (the night's step, M98: its pilot does nothing then, so the 0.05 s tuning does not matter);
- the `dt` dispatched stays `appDt / parts / settings.timeScale`.
- (A learner cannot choose ×60 or ×240 during the maestral: at sea the time-lapse is not available, 25.3.)

`src/ui/timeBar.ts`'s `demoCapped` compares with the same `Math.max(DEMO_MAX_SCALE, stepSpeedUp(state) ?? 0)`. In unit tests there is no `app.ts`: the speed is what `applyStepSpeed` set.

**The pilot (`src/app/exercisePilots.ts`):**

```ts
export function maestralPilot(): Pilot  // step 0: nothing; step 1: inStep(s) < 1 ? jib sheet 100 : jib sheet 100 and jib out 40;
                                        // step 2: jib sheet 75 and main out 60; step 3: main sheet 40.
```

A control the pilot does not set keeps its value (the start link's `ms=40`, `js=60` until a step changes them), as in every pilot. `pilotFor('maestral', 'easy', 'easy')` returns it; in Realistic ropes it returns `null` (as the other sailing exercises).

### 26.4 UI (`src/ui/exercisePanel.ts`)

- **List row:** after the summary, `<span class="hint exercise-item-meta" data-testid="exercise-meta-<id>">` with the place and, when the start link has `clk`, the start time:
  - the place is `exercise.place.<pl>`, with `pl` from `new URLSearchParams(def.start).get('pl')` (`open` when absent);
  - the time is `` `${clk.slice(8, 10)}:${clk.slice(10, 12)}` `` (`clk` is `YYYYMMDDHHmm`);
  - the text is `{place}`, or `{place} · {starts}` with `{starts}` = `t('exercise.startsAt', { time })`.

  Every row gets the tag (owner answer 8).
- **Setup card:** under the summary, when the start has `clk`, a line `<p class="hint" data-testid="exercise-setup-start">` with `exercise.setup.startsAt` (same `{time}`).
- `.exercise-item-meta` in `src/style.css`: `display: block`, the existing `.hint` colour and size, no new colour.

### 26.5 Texts and strings

Both `ui.json` (Russian drafts in `ru`): after the `exercise.group.*` keys:

| Key | English |
|---|---|
| `exercise.place.open` | `Open water` |
| `exercise.place.marina` | `Marina` |
| `exercise.place.bay` | `Bay` |
| `exercise.startsAt` | `starts {time}` |
| `exercise.setup.startsAt` | `Starts at {time} (time on board).` |

After `exercise.target.quayGap`:

| Key | English |
|---|---|
| `exercise.target.meanWindFrom` | `Wind {min} kn or more` |
| `exercise.target.meanWind` | `Wind {min}–{max} kn` |
| `exercise.target.nowKn` | `now {value} kn` |
| `exercise.target.timeFrom` | `Time on board {from} or later` |
| `exercise.target.time` | `Time on board {from}–{to}` |

`content/lang/en/exercises.json`, appended:

```json
"maestral": {
  "title": "The afternoon maestral",
  "summary": "Sail in the light midday wind and roll the sails in as the maestral builds, before it gets strong.",
  "see": "A summer day, 12:20: about 12 knots from the north-west and full sails on a beam reach (the wind from the side). On the Adriatic in summer the wind gets stronger every afternoon.",
  "happening": "The maestral is a sea breeze: the land warms up faster than the sea, and air from the sea flows in under the warm air rising over the land. It comes up in the late morning, is strongest around two o'clock and dies by sunset. Today it reaches 20 knots.",
  "action": "Watch the wind speed. When it reaches 15 knots, roll the jib in to about 40 % (ease its sheet first), then roll the main in to about 60 %. Sail on until half past one.",
  "mistake": "Waiting until she heels too far: rolling sails in is harder and slower in a strong wind. Reduce sail early.",
  "done": "You reduced sail before the maestral was at its strongest. On the Adriatic, plan the afternoon: the wind at two is stronger than at noon.",
  "steps": {
    "wait": { "goal": "Sail on until the wind reaches 15 knots.", "how": "Nothing to do yet: time runs 16 times faster in this step. Watch TWS (the true wind speed) in the numbers at the top. Pause works as usual." },
    "jib-in": { "goal": "Roll the jib in to 45 % or less: ease its sheet first.", "how": "In Ropes, set Jib sheet to 100 %, then Jib out to 40 %. With the sheet tight the jib does not roll." },
    "main-in": { "goal": "Roll the main in to between 50 and 65 %.", "how": "In Ropes, set Jib sheet to about 75 % so the jib stops flapping, then set Mainsail out to 60 %." },
    "peak": { "goal": "Sail on until 13:30 with less than 22° of heel.", "how": "Time runs 16 times faster again. Set Main sheet to about 40 %. If she heels too far in a gust, ease the main sheet." }
  },
  "mistakes": { "overpowered": <copy of reduce-sail's>, "round-up": <copy of reduce-sail's>, "sail-worn": <copy of reduce-sail's> }
}
```

(`<copy of reduce-sail's>`: the same object, all its keys (`name`, `what`, `why`, `fix`; the code's `ExerciseText` mistakes have `name`), as `reduce-sail` has in the same file.) Russian: drafts of all of it, same keys in the same order (section 0).

### 26.6 Tests

- `tests/localWinds.test.ts`: `localHourOf(utcFromLocal(2026, 6, 1, 13, 30, area))` = 13.5.
- `tests/exercises.test.ts`: `checkPasses` for `meanWindKn` and `localHour` (inside, on the edges, outside; `localHour` false without `clock`); `checkTargets` of the maestral's `wait` step gives `[meanWind]` and of its `peak` step `[localHour]` (`heelDeg` has no row); the validation additions of 26.2.
- `tests/exerciseRun.test.ts` (`applyStepSpeed`): Start of `maestral` sets ×16; passing `wait` sets ×1; entering `peak` sets ×16; a mistake sets ×1 and Carry on ×16 again; done sets ×1; `setAppMode easy` during `wait` sets ×1.
- `tests/exercisePilots.test.ts`: `SAILING_LIMITS.maestral = [101, 8, 7, 220]`. These are frame seconds of the test's 0.05 s frames, `ceil(1.2 × prototype + 3)`; the prototype in app seconds is 1301.3, 4.0, 2.9 and 2891.7, at ×16, ×1, ×1 and ×16. The good run, Show me from every step and the bar coverage tests pick it up from the table. In the good run (`goodRunStates`), the end state's clock reads 13:30 to 13:31; a loop like `goodRunStates` that records the largest `|boat.heelDeg|` finds at most 22° (prototype 17.2° at 1/60 s frames; the test's frames are 0.8 s of app time at ×16, so if this band fails, report it rather than widening it).
- `tests/urlState.test.ts`: `?m=exercise&ex=maestral` opens in setup at 12:20 with `wm` summer, size 20 and the mean 12.5 ± 0.1 kn from −45; its start link and a waypoint link carry no `wd`, `ws` or `tx`.
- `tests/physicsTruths10.test.ts`:
  - `PT-25 the afternoon maestral: reducing sail keeps her upright` — the good run: largest heel ≤ 22°, no `overpowered`.
  - A run with no action from Start until 13:30 (`reduce(s, { type: 'exercise', command: { options: { pauseOnMistake: false } } })` in setup) records at least one `overpowered` (prototype: first at 13:24).

### 26.7 Browser checks (`scripts/shots-m96.mjs`, test clock)

Scenes: `maestral-setup` (`?m=exercise&ex=maestral`), `exercise-list-meta` (`?m=exercise`, the list scrolled to "Wind and weather").

Live checks:
1. The list shows `exercise-meta-maestral` = "Open water · starts 12:20", `exercise-meta-anchor-shore` = "Bay", `exercise-meta-leave-berth` = "Marina".
2. Open the maestral setup card: `exercise-setup-start` says "Starts at 12:20". Start: `time-status` says "×16". `page.waitForTimeout(100000)`: the step card is on step 2.
3. Watch (the demo) from setup: after `page.waitForTimeout(30000)` the `clock-chip` has moved at least 6 minutes (the demo runs the wait step at ×16).
4. The Russian setup card (`?m=exercise&ex=maestral&lang=ru`) has no overflow (the overflow check of M70's Russian setup cards).

### 26.8 Done when / not in M96

Done: the maestral exercise can be finished on a phone; the list's tags and the setup card's start time show in English and Russian; tests and `SHOTS_ONLY=m96,m66,m70,m81` pass, then CI with `CI groups: all` (the store's `reduce` changes). Not in M96: the scripted wind and the bura (M97), the night (M98), start times for the older exercises (owner answer 7).

### 26.9 Decided in the M96 PR (recommended; merging accepts it)

- Built as specified; no number was tuned. `SAILING_LIMITS.maestral = [101, 8, 7, 220]` and the PT-25 bands (heel at most 22°, no `overpowered`; with no action at least one `overpowered` before 13:30) passed on the first run.
- `localHourOf` already existed (M94, `src/model/localWinds.ts`); M96 adds its test only.
- A `load` (opening a link) is never touched by the coach: an exercise link opens in setup at ×1, and Start sets the speed. A waypoint link carries no `tx` (the coach sets it on Start and Back).
- `hourText(hours)` in `src/model/exercises.ts` writes the time of a target row ("13:30"); the minute is rounded down, so the edge of a range reads as written.
- `tests/ciPlan.test.ts` counts 94 groups and `m96` is among the four newest; `.github/ci-times.json`: `m96` is 200 (measured 202 s locally).
- The full browser set (`CI groups: all`) found two old live checks that listed the exercises by name or count: `scripts/shots-m69.mjs` (the exact list) and `scripts/shots-m71.mjs` (14 items). Both now include `exercise-item-maestral` (15 items).
- Questions recorded in the PR: whether the 14 older exercises should also get a start time (owner answer 7: no, they keep noon), and whether the place line should be dropped from a row that is "Open water" only because no place is named. Recommended; merging accepts it.

---

## 27. M97: Scripted wind, and "A bura is coming" **(10c)**

**Independent review: required** (a scripted wind in shared state and links; ending a run changes the wind; it teaches what to do when a strong wind comes suddenly).

What the owner sees: a new exercise **A bura is coming** in "Wind and weather" (after *The afternoon maestral*): 08:00, almost calm; the step card says to roll the sails in now; at 08:04 the wind starts to rise and by 08:06 the bura blows 18 knots from the north-east with gusts near 30. With small sails she stays upright through three gusts (time runs ×4 while you wait for them).

### 27.1 Files

New: `scripts/shots-m97.mjs`.
Changed: `content/exercises/exercises.json`, both texts, `src/model/windModes.ts` (`'scripted'`), `src/model/localWinds.ts` (`scriptMean`, `windMean` for `scripted`), `src/model/exercises.ts` (`ExerciseDef.wind`), `src/app/store.ts` (`scriptOf`, the end of a scripted run), `src/app/urlState.ts` (`parseExercise`, `WIND_MODE_PARAMS`), `src/ui/windModePanel.ts` (`SIZE_STEP.scripted`, the hint), `src/ui/windPanel.ts` (the note), both `ui.json`, `docs/review/ru.md`, `src/app/exercisePilots.ts` (`buraPilot`, `pilotFor`), `tests/localWinds.test.ts`, `tests/exercises.test.ts`, `tests/exerciseRun.test.ts`, `tests/exercisePilots.test.ts`, `tests/urlState.test.ts`, `tests/physicsTruths10.test.ts`, `docs/PHYSICS_TRUTHS.md` (PT-65's M97 test name), `docs/review/ru-exercises.md`, `scripts/shots.mjs`, `.github/ci-times.json` (`m97`: 300), `docs/CODE_MAP.md`.

### 27.2 Data

`ExerciseDef` gains `wind?: { points: readonly WindKey[] }` (`WindKey` from `src/model/localWinds.ts`, 24.3).

**Validation** (`tests/exercises.test.ts`, test "has valid ids, groups, ropes, checks and mistakes"), for a def with `wind`:
- at least 2 points;
- each `at` matches `^([01]\d|2[0-3]):[0-5]\d$`;
- the offsets `(minutes(at) − minutes(points[0].at) + 1440) % 1440` strictly increase;
- `fromDeg` in (−180, 180], `kn` in [0, 30], `gustPct` in [0, 60];
- `start` has a `clk` whose hour and minute equal `points[0].at`, and no `wm`.

A second test feeds one bad def per rule to a helper `windProblems(def): string[]` (in the test file, next to `checkProblems`) and expects one problem each.

**The exercise** (appended):

```json
{
  "id": "bura", "group": "wind", "ropes": "easy", "crew": false,
  "sections": ["ropes", "sails", "autopilot", "conditions", "learn"],
  "start": "?hdg=135&ms=50&js=60&ap=wind&apt=-90&sea=sheltered&clk=202606010800",
  "wind": { "points": [
    { "at": "08:00", "fromDeg": 45, "kn": 3, "gustPct": 0 },
    { "at": "08:04", "fromDeg": 45, "kn": 3, "gustPct": 0 },
    { "at": "08:06", "fromDeg": 45, "kn": 18, "gustPct": 50 },
    { "at": "10:00", "fromDeg": 45, "kn": 18, "gustPct": 50 }
  ] },
  "steps": [
    { "id": "jib-away", "opens": "ropes", "holdS": 2, "check": { "jibOutPct": [0, 25] }, "bar": ["control:ctl_jib_sheet", "control:ctl_jib_furl"] },
    { "id": "main-small", "opens": "ropes", "holdS": 2, "check": { "mainOutPct": [30, 55] }, "bar": ["control:ctl_main_furl", "control:ctl_mainsheet"] },
    { "id": "three-gusts", "opens": "ropes", "holdS": 0, "speedUp": 4, "check": { "gusts": 3 }, "bar": ["control:ctl_mainsheet"] }
  ],
  "mistakes": [
    { "id": "overpowered", "serious": false, "on": { "alert": "overpowered" } },
    { "id": "round-up", "serious": false, "on": { "alert": "roundUp" } },
    { "id": "sail-worn", "serious": false, "on": { "alert": "sailWorn" } }
  ]
}
```

Heading 135 with the wind from 045 is a beam reach on port tack, out to the open sea (23.8). The gusts are 50 % of the mean: up to 30.1 kn with seed 1 over the first 900 s (1.67 × the mean: the gust term's 1.65 plus the pattern's small noise). The gust counter (`settings.gust`) counts a rise to 20 % over the mean, which is now the scripted mean (23.3). `sea=sheltered`: the bura's short waves build over three minutes (`waves.buildTimeS`).

### 27.3 Model and app logic

**`src/model/windModes.ts`:**
- `WindModeId` gains `'scripted'`; `isWindModeId('scripted')` and `isClockWind('scripted')` are true.
- `sizeRange('scripted')` is null; `windAt` treats it as steady.

**`src/model/localWinds.ts`:** `export function scriptMean(points: readonly WindKey[], utcMs: number, areaData: AreaData = area): WindMean`:
1. Minutes: `mm(at)` = hours × 60 + minutes; `first = mm(points[0].at)`; `off[i] = (mm(points[i].at) − first + 1440) % 1440`.
2. `now` = local minutes of `utcMs` (`hour × 60 + minute + second / 60`), and `x = (now − first + 1440) % 1440`.
3. `x ≤ off[0]` (= 0): the first point. Between points `i − 1` and `i` (`x ≤ off[i]`): `u = (x − off[i−1]) / (off[i] − off[i−1])`, with:
   - `dirDeg = wrap180(a.fromDeg + u × wrap180(b.fromDeg − a.fromDeg))` (the shorter way round; a turn of exactly 180°, as 90 → −90 in M98's night, goes through 180, south: `wrap180(−180)` is 180);
   - `twsKn = a.kn + u × (b.kn − a.kn)`;
   - `gustPct` likewise.
4. After the last point: the last point's values.

A script is read from its first point onwards and covers less than 24 hours (the increasing offsets guarantee it). `windMean` for `scripted`: `script === null ? { controls' dir and speed, gustPct 0 } : scriptMean(script, utcMs, areaData)`.

**`src/app/store.ts`:**
- `export function scriptOf(state: AppState): readonly WindKey[] | null` = `state.windMode.mode === 'scripted' && state.exercise !== null ? exerciseDef(state.exercise.id)?.wind?.points ?? null : null`. Every `withWindMean` and `trueWind` call of M94 passes `scriptOf(state)` instead of `null` (in `step`, the state before the step; in `initialState`, the state it builds, whose `exercise` comes from `overrides.exercise`).
- `export function refreshWind(state: AppState): AppState`: the controls' mean (`withWindMean`) and `wind` (`trueWind`) for `state.clock.utcMs`, `state.rig.timeS` and `scriptOf(state)`.
- **`setWindMode` to `scripted`** is ignored (returns `state`): only an exercise link sets it. During a run every `setWindMode` is locked already (`LOCKED_DURING_EXERCISE`), so the learner cannot leave the script mid-run.
- **`initialState` needs nothing for `scripted`:** it is built before `parseExercise` sets the mode (its `scriptOf` is null and the mean comes from the controls); `parseExercise`'s `refreshWind` then sets the scripted mean.
- **The Conditions panel in a scripted run** (`src/ui/windModePanel.ts`, `src/ui/windPanel.ts`): no radio is checked; `wind-mode-hint` shows `wind.mode.scripted.hint` = `The exercise sets the wind and changes it on its own timetable.`; `wind-locked-note` shows `wind.lockedScript` = `The exercise sets the wind.` (both keys after `wind.locked` in both `ui.json`, Russian drafts). `src/ui/windPanel.ts` and both `ui.json` join 27.1's list.
- **The end of a scripted run.** In the exported `reduce`, right after `reduceUnlogged` (so for every action but `demo`), with `next` its result: if `action.type !== 'load'`, `state.exercise !== null`, `next.exercise === null` and `next.windMode.mode === 'scripted'`, the wind becomes Steady at what was blowing:
  - `windMode = initialWindMode({ mode: 'steady', seed: next.windMode.seed, startS: next.rig.timeS })`;
  - the controls' wind rounded as in M94's `setWindMode` out of a clock wind;
  - `wind` from `trueWind`.

  (Leaving Exercises mode ends a run, 4.2.)

**`src/app/urlState.ts`:**
- `WIND_MODE_PARAMS` is typed `Record<Exclude<WindModeId, 'steady' | 'scripted'>, string>`; `windModeParams` writes nothing for `scripted` (no `wm`, `seed`, `wg`); M94's rule already leaves out `wd`/`ws`.
- `parseExercise`: in **both** its branches (the start link and the early-returning waypoint branch), when the def has `wind`, set `windMode: { mode: 'scripted', seed: <the link's seed or 1>, size: 0, startS: 0 }` on the state that already has its `exercise`, then `refreshWind` (`urlState.ts` already imports from `store.ts`).

**`src/ui/windModePanel.ts`:** `SIZE_STEP.scripted = 1` (the type needs it; the panel never shows `scripted`'s size).

**The pilot (`src/app/exercisePilots.ts`):**

```ts
export function buraPilot(): Pilot  // step 0: inStep(s) < 1 ? jib sheet 100 : jib sheet 100 and jib out 0;
                                    // step 1: main out 45;
                                    // step 2: main sheet = s.wind.twsKn > 1.1 × s.controls.ctl_wind_speed ? 70 : 45.
```

`pilotFor('bura', 'easy', 'easy')` returns it; in Realistic ropes `null`.

### 27.4 Texts (appended to `content/lang/en/exercises.json`)

```json
"bura": {
  "title": "A bura is coming",
  "summary": "A calm morning, then a bura hits with gusts near 30 knots. Make the sails small before it arrives.",
  "see": "08:00, almost calm: 3 knots from the north-east and full sails. In about four minutes a bura will pour down from the mountains to the north-east.",
  "happening": "The bura is a cold north-east wind that falls from the mountains onto the sea. It can start suddenly on a calm, clear day and comes in hard gusts, here up to about 30 knots. Rolling the sails in takes a moment in a calm, and is hard and slow once the wind has come.",
  "action": "Roll the jib in completely now, then roll the main in to about half. When the gusts come, ease the main sheet in each gust and pull it in again after it.",
  "mistake": "Waiting to see how strong it gets: with full sails the first gust lays her over.",
  "done": "Small sails before the wind came, so she stayed upright through the gusts. When a bura is likely, reduce sail in the calm before it.",
  "steps": {
    "jib-away": { "goal": "Roll the jib in to 25 % or less, before the bura arrives.", "how": "In Ropes, set Jib sheet to 100 %, then Jib out to 0 %." },
    "main-small": { "goal": "Roll the main in to between 30 and 55 %.", "how": "In Ropes, set Mainsail out to 45 %." },
    "three-gusts": { "goal": "Keep her upright through three gusts.", "how": "Time runs 4 times faster in this step. In each gust set Main sheet to about 70 %, and back to about 45 % when it has passed." }
  },
  "mistakes": { "overpowered": <copy of reduce-sail's>, "round-up": <copy of reduce-sail's>, "sail-worn": <copy of reduce-sail's> }
}
```

### 27.5 Tests

- `tests/localWinds.test.ts`:
  - `scriptMean` of the bura's points: 08:02 → 3 kn, 0 %; 08:03:59 → 3 kn; 08:05 → 10.5 kn, 25 %; 08:06 → 18 kn; 09:00 → 18 kn, 50 %; 11:00 → 18 kn.
  - A script from 23:00 (from −90, 6 kn) to 01:00 (from 90, 2 kn): 00:00 → 4 kn, from 180 (a turn of exactly 180° goes through south; ± 0.01).
  - A script 23:00 (from −80, 6) to 01:00 (from 80, 2): 00:00 → from 0 ± 0.01 (the shorter way, through north).
- `tests/exercises.test.ts`: the validation of 27.2, one bad def per rule.
- `tests/urlState.test.ts`: `?m=exercise&ex=bura` opens in setup with `windMode.mode` `scripted` and the mean 3 kn from 45; its waypoint link (after the first step) also opens `scripted`; neither link has `wm`, `wd`, `ws` or `tx`.
- `tests/exerciseRun.test.ts`: a bura run left by `setAppMode easy` becomes Steady with whole-number controls (3 kn from 45 at 08:00).
- `tests/exercisePilots.test.ts`: `SAILING_LIMITS.bura = [8, 7, 121]` (frame seconds; the prototype's app seconds are 3.6, 2.7 and 392.3, the last at ×4). A loop like `goodRunStates` that records the largest `|boat.heelDeg|` finds at most 10° (prototypes: 4.1° with this pilot; 6.4° in the run of 23.8 that eased the main from 130 s; 9.5° never easing).
- `tests/physicsTruths10.test.ts`:
  - `PT-65 the bura arrives suddenly: a run that does nothing is overpowered` — `pauseOnMistake` off in setup (`{ type: 'exercise', command: { options: { pauseOnMistake: false } } }`), Start, no action for 900 s of app time: at least one `overpowered` entry and the heel above 30° at some frame (prototype with `sea=sheltered`: the first entry at 341 s, while the wind is still rising between 08:04 and 08:06; heel up to 35.7°; 23.8's 35.2° was with flat water).
  - The good run is also the test of PT-25 and PT-13 (reduce sail, roll the jib with its sheet eased); they get no test of their own.

### 27.6 Browser checks (`scripts/shots-m97.mjs`, test clock)

Scenes: `bura-setup` (`?m=exercise&ex=bura`). Live: `m97 good run` (phone only, `buraPilot`'s logic through `window.__sailExercise`, one decision per 0.2 app seconds): done, no mistake card; during the run, when the step card shows step 3, save a screenshot `bura-gust` (`cam=top` is not needed). The Russian setup card (`?m=exercise&ex=bura&lang=ru`) has no overflow (as M70's).

### 27.7 Done when / not in M97

Done: the exercise can be finished on a phone; tests and `SHOTS_ONLY=m97,m96,m70` pass, then CI with `CI groups: all` (links and the store change). Not in M97: a bura that differs across the area (stronger under the mountains), the cap cloud, the bura's waves beyond the usual fetch.

### 27.8 Decided in the M97 PR (recommended; merging accepts it)

- Built as specified; no number was tuned. `SAILING_LIMITS.bura = [8, 7, 121]` passed at once: the good run takes 3.6, 2.7 and 392.4 app seconds (98.1 frame seconds at ×4), the largest heel is 6.2° (limit 10°, the prototype's 4.1° was with a slightly different pilot timing), no mistake. PT-65: with no action the first `overpowered` comes 341.8 s after Start, while the wind is still rising, and the heel reaches 35.6° (bands: at least one entry, above 30°).
- **A slip in 27.5, and what was tested.** 27.5 lists the turn of exactly 180° as "from −90 to from 90, 00:00 → from 180". 27.3's formula (`wrap180(a + u × wrap180(b − a))`) gives south for **90 → −90** (the night of M98) but north (0) for −90 → 90. The code follows the formula; the test uses 90 → −90, so the case M98 needs is the one checked. A script that turns −90 → 90 exactly would pass through north.
- `scriptMean` with no points returns a calm 0 kn (never reached: the data test needs two points).
- `initialState` keeps its `scripted` branch only for tests that build a state with `windMode: { mode: 'scripted' }` and an `exercise` override; a link sets the mode afterwards (`withScriptedWind` in `urlState.ts`).
- `parseExercise` reads the link's `seed` (1 … 99,999) for the scripted wind; a link written by the app has none (a scripted run's link carries no `wm`, `seed` or `wg`), so it is 1.
- The waypoint's `windMode` stays `scripted` inside the saved state (its `exercise` is null there); `restoreWaypoint` brings back the run and the timetable with it.
- `tests/ciPlan.test.ts`: 95 groups, `m97` is among the four newest (`m93` drops out of the PR set). `.github/ci-times.json`: `m97` is 144 (measured 144 s locally; the spec's 300 was a placeholder, and 300 made the full set 21 parts, over the test's limit of 20).
- Recorded in the PR for the owner: the scripted wind has no owner-visible control; the Conditions card shows "The exercise sets the wind." while a bura run is open.

---

## 28. M98: A night at anchor (sign-off of part 10c) **(10c)**

**Independent review: required** (anchoring safety; a serious mistake in the night; the time-lapse inside an exercise).

What the owner sees: a new exercise **A night at anchor** in "Harbour and anchor": at 18:30 in the bay, the learner anchors with a line ashore exactly as in *Anchoring with a line ashore* (with about 60 m of chain), then a last step runs the night at ×240: the evening breeze dies, it goes calm, a land breeze blows off the rocks after dark, and at 04:00 a squall from the north-east brings gusts to 20 knots. With a good setup she holds and the run ends at 07:00; if the anchor drags in the night, the run ends there and the debrief says why.

### 28.1 Files

New: `scripts/shots-m98.mjs`. Changed: `content/exercises/exercises.json`, both texts, `src/app/exercisePilots.ts` (`nightPilot`, `pilotFor`), `tests/harbourExercises.test.ts`, `tests/exerciseRun.test.ts`, `tests/exercisePilots.test.ts` (`HARBOUR_SHOW_ME` and the bar-coverage list), `docs/review/ru-exercises.md`, `docs/EXERCISES.md` (EX-B: "the night time-lapse: built in M98 as *A night at anchor*"), `docs/ROADMAP.md` (Phase 10's status cell: "10a, 10b and 10c done"), `README.md` (after the harbour sentence add: "A night at anchor runs twelve hours in a few minutes, and the wind follows the clock: the Adriatic's maestral, bura and jugo."), `scripts/shots.mjs`, `.github/ci-times.json` (`m98`: 300), `docs/CODE_MAP.md`.

### 28.2 Data (appended)

```json
{
  "id": "night-anchor", "group": "harbour", "ropes": "easy", "crew": false,
  "sections": ["engine", "anchor", "harbour", "autopilot", "helm", "ropes", "status", "conditions", "learn"],
  "start": "?pl=bay&pe=-1585.0&pn=0.0&hdg=90&bs=0&eng=1&lv=0&ap=off&sea=sheltered&clk=202606011830",
  "wind": { "points": [
    { "at": "18:30", "fromDeg": 90, "kn": 6, "gustPct": 10 },
    { "at": "20:00", "fromDeg": 90, "kn": 6, "gustPct": 10 },
    { "at": "21:00", "fromDeg": 90, "kn": 2, "gustPct": 0 },
    { "at": "22:00", "fromDeg": 90, "kn": 2, "gustPct": 0 },
    { "at": "23:00", "fromDeg": -90, "kn": 6, "gustPct": 10 },
    { "at": "03:50", "fromDeg": -90, "kn": 6, "gustPct": 10 },
    { "at": "04:00", "fromDeg": 45, "kn": 14, "gustPct": 30 },
    { "at": "04:45", "fromDeg": 45, "kn": 14, "gustPct": 30 },
    { "at": "05:15", "fromDeg": 45, "kn": 4, "gustPct": 10 },
    { "at": "07:00", "fromDeg": 45, "kn": 2, "gustPct": 0 }
  ] },
  "targets": [{ "id": "drop", "shape": "circle", "eastM": -1600, "northM": 0, "radiusM": 5 }],
  "steps": [
    <the six steps of anchor-shore, copied exactly (ids, opens, holdS, show, check, bar)>,
    { "id": "the-night", "opens": "anchor", "holdS": 0, "speedUp": 240, "check": { "localHour": [7, 12] }, "bar": ["windlass", "engine"] }
  ],
  "mistakes": [
    { "id": "aground", "serious": false, "on": { "alert": "contact", "severity": ["touch", "bump"], "obstacle": ["ground"] } },
    { "id": "aground-hard", "serious": true, "on": { "alert": "contact", "severity": ["knock", "hit"], "obstacle": ["ground"] } },
    { "id": "propeller", "serious": true, "on": { "alert": "contact", "obstacle": ["propeller"] } },
    { "id": "dragging", "serious": false, "steps": ["to-spot", "let-go-anchor", "scope", "dig-in", "shore-line", "settled"], "on": { "alert": "anchorAlarm" } },
    { "id": "dragged-at-night", "serious": true, "steps": ["the-night"], "on": { "alert": "anchorAlarm" } }
  ]
}
```

The wind, in the bay whose shore is to the west: the evening sea breeze from the sea (east, as *Anchoring with a line ashore* has it), calm after sunset (20:28), a land breeze off the rocks from 23:00 (PT-64), a squall from the north-east at 04:00 (PT-65; 14 kn with 30 % gusts, up to 19.9 kn: 30.2 says why not 25), calm by the morning. `localHour [7, 12]` first holds at 07:00 the next morning (the run starts at 18:30). The turn from 090 to −090 between 22:00 and 23:00 is exactly 180° and goes through south (27.3), which is intended: the wind dies to 2 kn first, so the turn is slow and light. `dragging` has a `steps` list here (anchor-shore's has none) so that an alarm in the night is the serious `dragged-at-night` instead. Nothing checks that the learner lets out about 60 m (the texts say it; `scope` passes at about 47 m): 30.2 says why.

### 28.3 Pilot

```ts
export function nightPilot(): Pilot {
  const anchor = anchorPilot(); // it already lets the chain out to about 61 m while backing to the shore
  return (s, t) => (s.exercise?.step === 6 ? s : anchor(s, t)); // step 6 (the night): nothing; anchorPilot's default branch would tighten the line forever
}
```

`pilotFor('night-anchor', level, ropes)` returns it (harbour group, like `anchor-shore`).

### 28.4 Texts (appended)

```json
"night-anchor": {
  "title": "A night at anchor",
  "summary": "Anchor with a line ashore in the evening, then watch the night go by in time-lapse: does she hold?",
  "see": "18:30 in the bay, the evening sea breeze (6 knots) blowing in from the sea. The magenta ring is where the anchor should go. You will spend the night here.",
  "happening": "The wind changes through a night: the sea breeze dies at sunset, it goes calm, a light breeze blows off the land after dark, and a squall can come before dawn. An anchor that held at six in the evening has to hold through all of that.",
  "action": "Anchor as in Anchoring with a line ashore: the bow over the spot, let the anchor go, enough chain, dig it in, back towards the rocks letting more chain out, the line ashore and tight. For a night, let out as much chain as the line allows, about 60 m. Then watch the night.",
  "mistake": "Too little chain, or an anchor that was not dug in: in the squall before dawn she drags towards the rocks.",
  "done": "She held all night: the evening breeze, the calm, the land breeze and the squall. Plenty of chain, dug in, and a line ashore.",
  "steps": { <the six step texts of anchor-shore, copied exactly and in the same order, except that the shore-line step's "how" ends with the added sentence " For a night: about 60 m of chain by the time the line is ashore.">,
    "the-night": { "goal": "Watch the night: the wind turns, and a squall comes at 04:00.", "how": "Nothing to do: time runs 240 times faster (a time-lapse) until 07:00. Tap Pause to stop and look around." } },
  "mistakes": { "aground": <copy of anchor-shore's>, "aground-hard": <copy>, "propeller": <copy>, "dragging": <copy>,
    "dragged-at-night": { "name": "dragging in the night", "what": "The anchor dragged during the night.", "why": "The squall pulled harder than the anchor could hold: too little chain, or the anchor was not dug in well.", "fix": "Start again and let out more chain, about 60 m, before the line goes ashore." } }
}
```

### 28.5 Tests (prototype in brackets)

- `tests/exercisePilots.test.ts`: `HARBOUR_SHOW_ME['night-anchor'] = { easy: [96, 33, 88, 53, 75, 99, 227] }` (Show me from each waypoint, frame seconds: anchor-shore's six Show me limits, kept because Show me starts each step from its waypoint as anchor-shore's does, then the night: 44,700 app seconds at ×240 is about 186 frame seconds, `ceil(1.2 × 186 + 3)` = 227); add `['night-anchor', 'easy']` to the bar-coverage test's `all` list.
- `tests/harbourExercises.test.ts`, `night-anchor good run`: a loop like `anchorRun` (copy it as `nightRun`: the id `night-anchor`, `nightPilot()`, the limit `t < 650` frame seconds; frames of 0.05 s; the coach sets ×240 in the last step, so a frame there is 12 s of app time in 8 slices of 1.5 s). Per-step limits in frame seconds: `[96, 33, 88, 53, 73, 47, 227]` (`ceil(1.2 × prototype + 3)` of 77.3, 24.2, 70.1, 41.2, 58.0, 36.5 and about 186; `settled` takes 36.5 s here against 78.7 s in M77's prototype: with the script's 10 % gusts the shore line came tight sooner, a measured difference, not a rule). Then:
  - status `done`, no mistake;
  - at the end, local time 07:00:00 to 07:00:30 on 2 June;
  - the chain 55–64 m (60.6);
  - the anchor `set`, `alarm` false;
  - no contact report with `obstacleKind` `ground` (none).
- In `tests/harbourExercises.test.ts` (where M77's PT tests are), `it('PT-31 the night needs the chain the rules ask for')`: at the frame the `scope` step passes, `chainOutM ≥ scopeNeededM(depth, 6)` (as M77's test).
- `it('PT-64 the land breeze blows off the rocks at night')`: in the good run at 01:00, `wind.dirDeg` is −90 ± 15 (the gusts veer it a little) and the mean 6 ± 0.01.
- `tests/exerciseRun.test.ts`, `it('an anchor alarm in the night ends the run; before the night it pauses')` (as M67's alert-mistake tests): `state = restoreWaypoint(goodRunEnd, 6)` (the good run's last state holds every waypoint; waypoint 6 is the start of `the-night`), then Start/Carry on so its status is `running` if it is not; build `next` from it by appending one entry `{ n: alerts.written + 1, kind: 'anchorAlarm', atS: rig.timeS + 0.05, severity: ALERT_INFO.anchorAlarm.severity }` to `alerts.entries`, `written + 1`, and adding 0.05 s to `rig.timeS` and 50 ms to `clock.utcMs`; `stepExercise(state, next)` gives status `failed` and the log's last mistake `dragged-at-night`. The same from `restoreWaypoint(goodRunEnd, 2)` (waypoint 2 is the start of `scope`; waypoint 0 is Start) gives status `mistake` with `dragging`.

### 28.6 Browser checks (`scripts/shots-m98.mjs`, test clock)

Scenes: `night-setup` (`?m=exercise&ex=night-anchor`). Live: `m98 good run` (phone only, `nightPilot`'s logic through `window.__sailExercise`, one decision per 0.2 app seconds; the night step at ×240 takes about 186 s of `page.waitForTimeout`): during the night, poll `clock-chip` every `page.waitForTimeout(1000)` and, when it first reads 04:05 or later, switch to `cam=top` (the camera menu) and save a screenshot `night-0400`; the done card at 07:00; the list's `exercise-meta-night-anchor` = "Bay · starts 18:30"; the Russian setup card (`?m=exercise&ex=night-anchor&lang=ru`) has no overflow (as M70's).

### 28.7 Done when (sign-off of part 10c)

The exercise can be finished on a phone; every item of section 29 is ticked in the PR; the ROADMAP's Phase 10 row says "10a, 10b and 10c done"; `SHOTS_ONLY=m98,m77,m95` pass, then CI. Not in M98: choosing the anchoring spot freely, two anchors, an anchor light, an anchor watch alarm sound beyond M89's.

---

## 29. Definition of Done (part 10c) **(10c)**

- [ ] M94–M98 merged in order, each with its tests named after its rules (PT-63 … PT-66; PT-25, PT-31, PT-64, PT-65 through the exercises).
- [ ] Every older test and browser check still passes; old links open as before (no `wm`, `tx` or `clk` change for them).
- [ ] The three new exercises can be finished on a phone, in English and Russian (Russian AI drafts, `docs/review/ru-exercises.md` regenerated).
- [ ] Local winds, the time-lapse, the list tags and the setup card's start time work on a phone, a foldable and a computer.
- [ ] `docs/CODE_MAP.md`, `docs/EXERCISES.md` (section 1 EX-B, section 4), `docs/BOAT_REFERENCE.md` ("Local winds"), `docs/PHYSICS_TRUTHS.md` (test links of PT-63 … PT-66) and `README.md` are current.
- [ ] The ROADMAP's Phase 10 row: "10a, 10b and 10c done".

## 30. Decisions and open questions (part 10c) **(10c)**

### 30.1 Owner's answers (planning chat, 2026-11-09: "Accept all")

1. All three local winds: Summer day (maestral and the night land breeze), Bura and Jugo. 2. They work outside exercises too, from Conditions. 3. The dial is locked while a local wind is on, with a note. 4. ×60 and ×240 only at anchor, tied up or held still; ×16 stays the top at sea. 5. In the night exercise the learner sets the anchor up; Back to a waypoint retries. 6. The night has a squall from the north-east at 04:00 (its strength: 30.2). 7. The 14 older exercises keep noon; only the new ones have their own start times (12:20, 08:00, 18:30). 8. The list keeps its groups; each row gets a place tag and its start time. 9. Part 10c is built before the physics-engine work.

### 30.2 Decided by this plan (recommended; merging accepts it)

- **The squall is 14 kn with 30 % gusts (up to 19.9 kn), not "up to 25 kn"** (recommended; merging accepts it): at 18 kn with gusts up to 25.6 kn even the good setup (61 m of chain) dragged about 10 m and its stern touched the bottom by the rocks in the prototype, so a learner who did everything right would fail. At 14 kn the good setup holds (3.8–4.3 m of creep, no alarm, no touch).
- **The night tests the setup but rarely fails it** (recommended; merging accepts it): the line ashore reaches the ring only with about 50 m of chain or more (with 47–48 m the crew cannot reach the rocks), and between 50 and 56 m the squall drags her 5–7 m, sounding the alarm in one run of three (53 m). So a learner who finishes the setup almost always holds; the night shows how the wind turns through a night and that the setup holds. A harder night would need a weaker bottom or a stronger squall, which ground the good setup too.
- **A step can speed time up** (`speedUp`; recommended; merging accepts it): ×16 while waiting for the maestral, ×4 through the bura's gusts, ×240 for the night; the coach sets it and goes back to ×1 after, so a beginner does not have to find the time card; Watch plays these steps at that speed too.
- **The sailing exercises of 10c head away from the land** (maestral heading 045, bura 135): open water has the marina to the north and the bay's headland to the west, and a two-hour run at 9 kn covers 30 km.
- **A local wind writes its mean into the wind controls** every step (recommended; merging accepts it): the gust counter, the GUST badge, the anchor panel's scope and the water all read "the mean" there today, so they keep working without changes.
- **The jugo starts at its strength in two minutes** (recommended; merging accepts it): its days-long build cannot be shown in an app session; the hint says so.
- **The burin's Learn entry is a draft**: Wikipedia's *Sea breeze* supports the land breeze, not the Adriatic name.

### 30.3 Known limitations (part 10c)

- The wind is the same everywhere in the area (no stronger bura under the mountains, no lee behind the headland).
- The jugo builds in two minutes, not over days, and the waves still come from the Waves setting's fetch, so the jugo's big sea is not shown.
- No clouds, rain or the bura's cap cloud; the sky only follows the sun.
- In the night at ×240 the boat's swing round the anchor is drawn once a frame (four seconds of app time), so it looks jerky in the squall; the model itself steps in 1.33 s slices.
- With the Time bar switch off (Settings), a step's speed-up does not apply (the speed part is not available): the maestral's wait then takes about 22 minutes at ×1 and the night 12 hours. The texts say how to speed up; switching the Time bar off is rare.
- A too-short chain seldom fails the night (30.2).

### 30.4 Open questions for the owner (in the planning PR, each with a recommendation)

None beyond 30.2's recommendations.
