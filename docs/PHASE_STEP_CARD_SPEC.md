# One step card over the 3D view (M93)

Extra milestone, planned on 2026-11-08 from the owner's comment after testing PR #187 (M92) on a phone and a foldable, with two screenshots:

- **Phone:** M92 made the top row of the 3D view `nowrap`, so the step line ("Watching · Step …") and the hint ("Hide hint" with its text in a narrow column) were squeezed into the same row as the numbers and the time widget. It looks broken. The owner: return them to where they were before M92.
- **Foldable (side layout):** while an exercise runs, four separate boxes cover most of the 3D view: the step line ("Watching · Step 2 done ✓ Paused: read the next step, then press Resume"), the hint ("Show hint"), the "✓ Step 2 done" card with Next step / Let me try it, and the step bar with the controls. The line and the Step done card also say the same thing twice.
- The owner's design: **combine the first three into one card**. The hint is hidden inside the step card and opens when the learner wants to read more; Step done is shown by the same card. The controls stay in their own box at the bottom.

The owner asked for a mockup ("maket") to check before building: [`docs/mockups/step-card.html`](mockups/step-card.html). Section 2 is a short look at how similar apps do it, added as background.

## 0. How to use this spec

- One milestone, **M93**, one PR titled `M93: One step card`. It **builds on M92** (PR #187, the time widget): merge #187 first; this plan's PR is stacked on it.
- Read sections 0–3 and 4 (all of it); the general rules are in CLAUDE.md. Names (files, functions, classes, `data-testid`s, string keys) are required; the English strings are final; Russian strings are AI drafts (run `npm run review-doc -- ru` after changing `content/lang/ru/*.json`).
- **No sailing physics, no store, no URL change.** Every action the card's buttons dispatch exists today. Every earlier unit test stays green; old links open as before.
- Decisions taken while building go under 4.11, "Decided in the M93 PR".

## 1. Goal and scope

**Goal:** while an exercise runs, the 3D view holds at most **two** exercise boxes: the **step card** at the top (what to do now, with the hint, the step-done moment, the mistake and "Now you" inside it) and the **step bar** at the bottom (the controls). On a phone the card is one or two lines until the learner opens it.

In scope: the phone's top row back to two rows (numbers and time widget in row 1, the step card under them, as before M92); the new `src/ui/stepCard.ts` replacing `exerciseLine.ts` and `exerciseCoach.ts`; the demo card (Step done / Now you) moved out of the step bar's stack into the step card; the mistake's why and fix with Carry on and Back in the card; the browser checks that used the old parts.

Out of scope: the step bar's rows and head (Show me, Stop watching, All controls) stay as they are; the Exercises section in the panel stays as it is (its step, mistake and done cards are unchanged); the time widget (M92) is unchanged except the phone row CSS; the camera framing rules (M80) are unchanged (the card reports its height the way the hint did); no new exercise text.

## 2. How similar apps do it (background, 2026-11-08)

| App / guide | What it does | What we take |
|---|---|---|
| Google Maps and Android Auto navigation ([Google's navigation template](https://developers.google.com/cars/design/create-apps/apps-for-drivers/templates/navigation-template)) | **One** card at the top with the current step; an optional small "then …" cue for the next step; the full list of steps only on request. | One card, the current step in large text, everything else behind a tap. |
| Duolingo lessons ([flow captures](https://www.lazyweb.com/canvas/flows/duolingo/start-lesson), [UX case study](https://medium.com/usabilitygeek/ux-case-study-duolingo-ade986ec7450)) | A progress bar, and **the same bottom panel turns green or red** to say right or wrong, with "Continue" in it; no second card. | Step done and a mistake are colours and buttons **of the same card**, not new cards. |
| Game tutorials ([Roblox onboarding guide](https://create.roblox.com/docs/en-us/production/game-design/onboarding-techniques), [NN/g on instructional overlays](https://www.nngroup.com/articles/mobile-instructional-overlay/), [Supersonic](https://supersonic.com/?p=102709)) | The current objective stays on screen until it is done; hints are short and can be dismissed; "don't fill the tutorial UI with too much information at once". | The goal always shows; the How text and the target rows are behind a tap. |
| Microsoft Flight Simulator training ([lesson structure](https://flight.wiki.gg/wiki/Microsoft_Flight_Simulator_(2020)/Flight_Training), [forum complaint](https://forums.flightsimulator.com/t/inconsistent-objectives-in-first-solo-flight-training-lesson/489590)) | An objectives list per lesson; learners complain when the written objective and the live target disagree. | Keep the live ✓ / ○ target rows next to the How text (we already have them). |
| Sailing apps ([2Sail reviews](https://appshunter.io/ios/app/2sail-sailing-simulator/id1536527598), [Sailing Ship Simulator](https://apps.apple.com/app/id6756489123)) | Step-by-step tutorial modes; reviewers say the screen shows too much information, and the info display can be switched off. | A beginner sailing app is judged on a clear view of the boat: fewer boxes. |

None of these shows two boxes that say the same thing (our line + Step done card), and none keeps the hint as a separate box from the instruction.

## 3. Conventions

- "Phone" = the stacked layout (`layoutKindOf(...) === 'stacked'`); "side" and "wide" as in `src/ui/modes.ts`. The foldable in the owner's screenshot is the side layout.
- The card is built only from the run state (`AppState.exercise`), `demoCardKind(state)` (`src/app/exerciseBar.ts`) and the exercise texts (`exerciseText`). No new state field.
- **Class names:** the panel already has `.exercise-card` (its step, mistake and done cards); the new card is **`.step-card`** so the two never share rules.

## 4. M93: One step card

**Independent review: required** (it replaces two UI modules used by six browser-check groups, moves the demo card out of the step bar and changes what the camera framing measures; a mistake would hide an exercise's buttons on a phone).

### 4.1 Files

- `src/ui/stepCard.ts` (new): `createStepCard(top: HTMLElement, store: Store, layout: LayoutShell, onOpen: () => void): void`. Takes over everything `exerciseLine.ts` and `exerciseCoach.ts` do (the ring, the green flash, the Watching / Showing prefix, the mistake text for a few seconds, the How text and the live target rows, the phone fit) plus the demo card's content. `COACH_KEY`, `targetText` move here and stay exported with the same names (`exerciseCoach.ts` exported them; grep for imports and update them).
- `src/ui/exerciseLine.ts`, `src/ui/exerciseCoach.ts`: **removed**.
- `src/ui/exerciseBar.ts`: the demo card goes (the `card` element, its `cardKey` / `cardKind` rendering, the `exercise-demo-card` node); the stack holds only the bar. Nothing else in the bar changes.
- `src/app/app.ts`: `createStepCard(top, store, layout, () => panel.showSection('exercises'))` in place of `createExerciseLine` and `createExerciseCoach`.
- `src/style.css`: the phone top row (4.3), the `.step-card` rules (4.4); the `.exercise-line*`, `.exercise-coach*` and `.exercise-demo-card` rules go (keep `.exercise-ring`, `.exercise-flash` and the `--exercise-ok` colour, now used by the card).
- `content/lang/{en,ru}/ui.json`: 4.7.
- `scripts/shots-m93.mjs` (new, registered in `scripts/shots.mjs`: import, `SCENES`, `liveGroups`), `.github/ci-times.json` (`"m93": 300`), `tests/ciPlan.test.ts` (group count +1; newest groups m93, m92, m91, m90); the older checks that read the removed parts (4.9).
- Docs: `docs/CODE_MAP.md` (the new file, the two removed ones, `exerciseBar.ts` without the demo card), this spec's 4.11, `docs/ROADMAP.md` (decisions row), `docs/review/ru.md` (generated).

### 4.2 What the card shows (first match wins)

`run = state.exercise`. The card is hidden when `run` is null or `run.status === 'setup'` (as the line was).

| # | When | Tone (`data-tone`) | Head text | Body (open?) | Buttons in the body |
|---|---|---|---|---|---|
| 1 | `demoCardKind(state) === 'nowYou'` | `pause` (blue) | `exercise.demo.nowYouTitle` "Now you" | `exercise.demo.nowYou` (always open) | **Back to the start of the step** (`exercise-demo-back`, `{ back: run.demoStep }`) |
| 2 | `demoCardKind(state) === 'stepDone'` (Watch) | `done` (green) | `exercise.demo.stepDone` "✓ Step {n} done" (`n = run.step`) | the finished step's How (`steps[run.step - 1]`), as the demo card did (always open) | **Next step** (`exercise-demo-next`, `setPaused false`), **Let me try it** (`exercise-demo-try`, `{ back: run.step - 1 }`) |
| 3 | `run.status === 'running' && run.stepPause && state.paused` (the learner's "Pause after each step") | `done` | "✓ Step {n} done" (same key) | `exercise.card.next` "Next: {goal}" with the goal of `steps[run.step]` (always open) | **Next step** (`step-card-next`, `setPaused false`) |
| 4 | `run.status === 'mistake'` | `mistake` (orange) | `exercise.linePaused` "Paused: {what}" | the mistake's `why` and `fix` under the headings `exercise.why` / `exercise.fix` (always open) | **Carry on** (`step-card-continue`, command `'continue'`), **Back to the start of step N** (`step-card-back`; label and command exactly as the panel's `exercise-back` in `renderMistake`, `src/ui/exercisePanel.ts`) |
| 5 | `run.status === 'failed'` | `mistake` | `exercise.lineStopped` "Stopped: {what}" | none | the head opens the Exercises section (`onOpen`) |
| 6 | `run.status === 'done'` | `done` | `exercise.lineDone` "Done ✓ {time} · tap for the summary" | none | the head opens the Exercises section |
| 7 | running (everything else) | none (white); `mistake` while the last mistake shows (`EXERCISE_SETTINGS.mistakeShowS`, text `exercise.lineMistake`) | `exercise.line` "{n}/{total} · {goal}", with the hold ring | the step's How (`step-card-how`) and, when there are any, the heading `exercise.coach.targets` "To pass this step" and the live ✓ / ○ rows (`step-card-targets`), then **Open in Exercises** (`step-card-open`, `onOpen`) | — |

- While the app plays (Watch or Show me), every head text starts with the prefix `exercise.watching` / `exercise.showing` in its own span (`step-card-demo`), as the line did.
- Rows 1–4 are "always open": their body shows whatever the fold says, and the head has no chevron and does nothing on a tap (the learner must see the buttons). Rows 5–6 have no body; the head is a button that calls `onOpen`. Row 7 has the fold (4.5).
- The old line's "Step {n} done ✓ Paused: read the next step, then press Resume" (`exercise.linePausedStep`) and "Done. Now you: tap …" (`exercise.demo.lineNow`) are no longer shown: rows 1–3 replace them.
- The green flash (`exercise-flash`) runs on the whole card when `run.step` grows within the same run, as on the line and the hint before.

### 4.3 The phone's top row (back to before M92)

M92 set `html[data-layout='stacked'] .view-top { flex-wrap: nowrap; }`, which pulled the line and the hint into the first row. Change it to:

```css
html[data-layout='stacked'] .view-top {
  flex-wrap: wrap;
  gap: 4px;
}

html[data-layout='stacked'] .instrument-strip {
  flex: 1 1 0;
  min-width: 0;
}

.step-card {
  flex: 1 1 100%;
}
```

Row 1 is the strip and the time widget exactly as M92 made it (the M92 checks "the widget beside the strip in the same row" and "the top area ≤ 80 px" stay true with no card); the card always starts a new row under them and takes the full width. If the strip already has a `flex` rule in the stacked layout, change that rule instead of adding a second one. Side and wide layouts: the card is in the same place as the old line (a row of its own under the strip and the top-right column), with `max-width: 640px` so it does not span a wide view.

### 4.4 The card's look and parts

One box in the look of the old line: `rgb(255 255 255 / 0.92)`, 1 px `var(--line)` border, 12 px radius, `pointer-events: auto`. A 4 px left border carries the tone: `done` `var(--exercise-ok)`, `mistake` `#ff9f1c` (the orange of Resume / Carry on), `pause` `var(--accent)`; no tone: `var(--line)`. No other colour fills (the panel's cards stay the only filled ones).

```
section.step-card [data-testid=step-card, data-tone, data-row=1..7, aria-label="This step"]
  button.step-card-head [data-testid=step-card-head, aria-expanded (row 7 only), aria-controls=step-card-body]
    span.exercise-ring [data-testid=exercise-ring]       (row 7 while holding)
    span.step-card-text [data-testid=step-card-text]
      span.step-card-demo [data-testid=step-card-demo]    (Watching · / Showing ·)
    span.step-card-chevron [aria-hidden]                  ("▾" folded, "▴" open; row 7 only)
  div.step-card-body#step-card-body [data-testid=step-card-body]
    p.step-card-how [data-testid=step-card-how]
    p.step-card-heading                                   ("To pass this step")
    ul.step-card-targets [data-testid=step-card-targets]  (li.ok for ✓)
    div.exercise-buttons                                  (4.2's buttons; .exercise-start for the first, .exercise-button for the others)
```

- Head: at least 44 px high (`min-height: var(--touch)`), 15 px text, padding 4 px 12 px. Its text is clamped to **2 lines** while the body is folded or absent, unclamped when open. In rows 1–4 the head is still a `<button>` (for one structure) but `disabled` is **not** used (it would grey it out): it simply has no click handler and no `aria-expanded`.
- Body: 15 px text, padding 0 12 px 8 px, the buttons as in the panel (`.exercise-buttons`). On a phone the body fits inside the top share of the view the camera counts as covered, scrolling inside (`overflow-y: auto`), with the same formula as `exerciseCoach.ts`'s `fit()` (`SCENE.camera.maxTopInsetShare * view.clientHeight - (head bottom - view top) - 4`, at least 48 px); move that function, do not rewrite it. The order inside the body is always text, then buttons; when the body is taller than the limit it scrolls inside, and the live check in 4.9 makes sure the buttons are inside the view on a 390 × 844 phone for the longest English text (Leave the berth, Watch, step 2 done).
- Accessible name of the head: its visible text; the section's `aria-label` is `exercise.card.label`.

### 4.5 The fold (row 7)

Exactly the hint's rules today: on a phone the body is **folded at every run start and every step change** (and not when coming back from a mistake to the same step), a tap opens it until the next of these, not remembered; on the side and wide layouts the choice is remembered in `localStorage` under `COACH_KEY` (`sail-learn.coach`, `'0'` folded, default open), as now. Rows 1–4 are open whatever the fold says and do not change it.

### 4.6 The step bar

The bar loses its demo card (row 1 and 2 content now live in the card). Its stack (`exercise-stack`) holds only the bar, so `--exercise-stack-h` gets smaller by the card's height while a demo card would have shown; nothing else changes. Show me and Stop watching stay in the bar's head.

### 4.7 Strings (`content/lang/en/ui.json`, final; Russian drafts in `ru`)

New:
- `exercise.card.label`: "This step"
- `exercise.card.next`: "Next: {goal}"
- `exercise.card.open`: "Open in Exercises"

Reused unchanged: `exercise.line`, `exercise.lineDone`, `exercise.lineMistake`, `exercise.linePaused`, `exercise.lineStopped`, `exercise.coach.targets`, `exercise.watching`, `exercise.showing`, `exercise.demo.stepDone`, `exercise.demo.next`, `exercise.demo.try`, `exercise.demo.nowYouTitle`, `exercise.demo.nowYou`, `exercise.demo.back`, `exercise.continue`, `exercise.backTo`, `exercise.backToStart`, `exercise.why`, `exercise.fix`.

Removed when no code uses them any more (check with `grep -rn` over `src`): `exercise.coach.hide`, `exercise.coach.show`, `exercise.coach.label`, `exercise.linePausedStep`, `exercise.demo.lineNow`. No registry ids.

### 4.8 Tests

No model change. `tests/ciPlan.test.ts` counts the `m93` group. If a unit test imports `targetText` or `COACH_KEY` from `exerciseCoach`, change the import to `stepCard`.

### 4.9 Browser checks

`scripts/shots-m93.mjs`, group `m93`, every page with `{ testClock: true }`.

Scenes (all sizes): `m93-running` (Points of sail, step 1, folded), `m93-open` (the same, card opened), `m93-watch-done` (Leave the berth `exl=normal`, Watch, the first Step done), `m93-mistake` (Leave the berth, the "light touch" mistake as in the M92 Carry on check), `m93-ru` (Russian, `m93-open`).

Live checks:
1. **Phone (390 × 844), running:** the strip and the time widget in one row (their tops within 2 px); the card's top below both of their bottoms; the card ≥ view width − 20 px; folded, the card ≤ 72 px high; no element with testid `exercise-coach` or `exercise-demo-card` exists. Tap the head: `aria-expanded="true"`, How and the target rows show, Open in Exercises is visible; tap again: folded. Next step (complete step 1 with the pilot or the test's existing way of finishing it): the card flashes and is folded again.
2. **Phone, Watch:** at the first Step done the card has `data-row="2"`, `data-tone="done"`, Next step and Let me try it are inside the view (for the longest text: Leave the berth step 2), the step bar has no demo card, and there are exactly **two** exercise boxes over the view (`step-card` and `exercise-bar`). Next step: the run goes on (`data-row="7"`). Let me try it, in a second run: the boat goes back to the step's start (as the M81 check does).
3. **Phone, mistake:** `data-row="4"`, why and fix show, Carry on runs time again (the widget says Pause), and Back goes to the step's start.
4. **Phone, "Pause after each step"** (`exs=1`): after step 1, `data-row="3"`, "Next: …" shows step 2's goal; Next step runs time again.
5. **Foldable (`foldable-820x1000`, side layout, the size `scripts/shots.mjs` already uses):** Watch Leave the berth to the first Step done: the card ≤ 640 px wide, two exercise boxes, the card and the bar do not overlap.
6. **Computer (1440 × 900):** the fold is remembered (fold, reload the link, still folded).
7. **Russian:** the card's head and the buttons are inside the view; the accessibility audit on the open card and on the mistake card.

Older groups to update (they read the removed parts; keep what they check, change only the selectors): `m66` (the line tap opened the Exercises section: now the body's Open in Exercises), `m67` (the line's mistake text and class: now `step-card-text` and `data-tone="mistake"` / `data-row`), `m69` (step pause: `data-row="3"`), `m80` (the hint folded on a phone: `step-card-head` and `aria-expanded`), `m81` (the demo card: now rows 1–2 of the step card; its buttons keep their testids), `m82`. Run locally `SHOTS_ONLY=m93,m66,m67,m69,m80,m81,m82,m92,general` and put `CI groups: m66, m67, m69, m80, m81, m82, m92` in the PR description.

### 4.10 Done when / not in this milestone

Done when: on a phone the numbers and the time widget are one row and the step card is under them; while an exercise runs at most two exercise boxes show (the card and the bar); the card shows the hint on a tap, Step done, Now you and the mistake with their buttons; every check of 4.9 and every older group named there passes; typecheck, lint, tests and build pass.

Not in this milestone: changes to the bar's rows or head; the panel's Exercises section; a "then …" preview of the next step while a step runs (the market check's navigation cue; a later idea if the owner wants it); swipe gestures on the card; moving the Attention chip.

### 4.11 Decided in the M93 PR (recommended; merging accepts it)

1. **The card's buttons do the work of the state they show** (Next step, Let me try it, Carry on, Back), even though the time widget's button can also carry on or resume: on a phone the learner reads what happened in the card, so the button belongs under the text (Duolingo's Continue in the feedback panel). The widget's button stays, so both work.
2. **Step done, Now you and the mistake are always open** and cannot be folded: they are the moments the learner must act on; only the running step's hint folds.
3. **The fold rules of M80 are kept** (a phone folds the hint at every step; a computer remembers the choice), so a phone shows one or two lines while sailing.
4. **On the side and wide layouts the card is at most 640 px wide**, so a foldable or a computer keeps most of the 3D view free.
5. **The card's fold and the foot buttons** (decided in the M93 PR, recommended; merging accepts it): on a phone the card's buttons stay at the foot of the card (`position: sticky`) when its text scrolls inside the limit of 4.4, so Next step, Carry on and Back are always inside the view, also for the longest English and Russian texts.
6. **Row 3 and a mistake use the run state only**: the card shows row 3 (Pause after each step) as the old line did (`stepPause` and the app is paused); no new state field.
7. **Two scenes became live-check shots**: `m93-watch-done` and `m93-mistake` need the app to run to the moment, so they are shot by the live checks (`m93-phone-watch-done`, `m93-phone-mistake`, `m93-foldable-watch-done`), not by `SCENES`; `m93-running`, `m93-open` and `m93-ru` are scenes at every size.
8. **The helper `exerciseLine(page)` in `scripts/ui.mjs`** now reads the card's head text (`step-card-text`), so the older groups keep their text checks; `demoStepCard(page)` / `demoStepTitle(page)` stand for the removed demo card (rows 1–2) in m81 and m82.
