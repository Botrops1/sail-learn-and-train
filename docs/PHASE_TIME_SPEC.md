# Time widget: the time bar and the clock in one (M92)

Extra milestone for issue #172 ("Combine clock and time bar"), planned and built in one session on 2026-11-07 (the owner asked to "plan and implement issue #172"). The owner's design from the issue was taken as given; the open points were decided with recommendations (section 1.10), which merging the PR accepts.

## 0. How to use this spec

- One milestone, **M92**, one PR titled `M92: Time and clock in one widget`, saying `Closes #172`.
- Read section 1 only; the general rules are in CLAUDE.md. Names (files, functions, `data-testid`s, string keys) are required.
- Text is data: the English strings here are final. Russian strings are AI drafts (CLAUDE.md); run `npm run review-doc -- ru` after a change to `content/lang/ru/*.json`.
- **No sailing physics changes.** Every earlier unit test and browser check stays green; old links open as before (no URL key is added or removed: `tx`, `tb`, `clock`, `clk` keep their meaning).
- Decisions taken while building go under 1.10, "Decided in the M92 PR".

## 1. M92: Time and clock in one widget

**Independent review: not needed** (UI layout and text only; no model, no store, no URL change; the one behaviour change, the Carry on button, dispatches the existing `exercise` `continue` command).

### 1.1 Goal

Before M92 the top of the 3D view on a phone held the instrument strip with the clock chip beside it, and under them the time bar (`Time ×1 « ‹ Pause › »`) in a row of its own: 108 px of a 390 × 844 phone. The owner (issue #172): make it one widget of two rows, the speed and the clock on the left, Pause on the right; a tap on the left opens the speeds and the clock settings in one card, almost as wide as the screen; and one button for every stop of time, Pause and the exercises' Carry on included, its name following what it does.

```
| Time ×1 | Pause |
| 12:00   |       |
```

### 1.2 Files

- `src/ui/timeBar.ts`: `createTimeBar(host, view, store, layout)` builds the widget and the time card (replaces the old bar; the fold is gone). `FOLD_KEY` stays exported (setup files and Settings → Reset still name it); nothing reads the fold.
- `src/ui/clockPanel.ts`: `createClockParts(store): ClockParts` (`chip`, `section`, `opened()`, `shown(state)`) and `clockAria(utcMs)`, used by the widget; `createClockPanel` is gone.
- `src/app/app.ts`: calls `createTimeBar(topRight, layout.view, store, layout)`; no `createClockPanel`, no `createExerciseResume`.
- `src/ui/exerciseResume.ts`: **removed** (the Resume / Carry on button over the 3D view of PR 152; the widget's button does its work).
- `src/style.css`: the widget, the card, the phone row; the old time-bar, jump-button, clock-chip, clock-card and exercise-resume rules go.
- `content/lang/{en,ru}/ui.json`: strings in 1.6.
- `scripts/shots-m92.mjs` (new, registered in `scripts/shots.mjs`), `.github/ci-times.json` (`m92`), `tests/ciPlan.test.ts` (group count and newest groups); the older checks that used the removed parts: m10, m37, m56, m67, m69, m79, m80, m81.
- Docs: this file, `docs/CODE_MAP.md`, `docs/WORKFLOW.md` (section 20), `docs/ROADMAP.md` (phases table and decisions log), `docs/review/ru.md` (generated).

### 1.3 The widget (top right of the 3D view)

One rounded box (white at 90 %, 1 px `--line` border, 14 px radius, the look of the old time bar), two parts side by side, at least 44 px high:

- **Left part** `time-open` (a button; `aria-expanded`, `aria-controls="time-card"`): line 1 the word "Time" (muted) and the speed `time-status` (`×¼` … `×16`, tabular digits, at least `2.9ch` wide so the box never changes width with the speed); line 2 the local time `clock-chip` (`12:00`). A tap opens or closes the card. Its accessible name: `"{time.status}. {clock.chipAria}. {time.openHint}"`, leaving out what is hidden.
  - The speed line shows only where the speed can change (`timeSpeedAvailable`: Sailing, or a wind that changes, and the Settings switch **Time bar** on); the clock line only while the Settings switch **Clock** is on. Neither: no left part.
- **Right part**, one of:
  - `pause-button`: **Pause** (time runs), **Resume** (paused: the button turns orange `#ff9f1c`, as before), or **Carry on** (an exercise stopped time for a mistake: orange; the tap dispatches `{ type: 'exercise', command: 'continue' }`, the same as the mistake card's Carry on). The button keeps the width of the wider of "Pause" and "Resume" (two invisible zero-height pseudo-elements carrying `data-ghost-pause` / `data-ghost-resume`), so Pause ↔ Resume never moves the strip beside it; "Carry on" may widen it while the mistake card shows.
  - Disabled (35 % opacity) while a failed card or the setup card shows, while Show me's "Now you" card shows (M81), and in Alone while the run goes (M71, with its title), exactly as the old Pause.
  - `held-chip` **Held still** where nothing changes with time (`pauseAvailable` false, issue #34); its note `held-note` as before.
- The ×4 note of a played exercise (`time-demo-capped`, M81) shows under the widget for 6 s, now whether or not anything is open (the widget has no fold).
- `data-speed`, `data-held` and `data-stopped` on `time-bar` say which parts show (for the checks).

**Phone (stacked layout):** the widget sits at the right of the strip in the same row (`.view-top` does not wrap); the strip gives up the width: its first line wraps (AUTO goes under the speed) and the wind line is 12 px. Paddings are tight (strip 4 px, gap 4 px, text 13 px) so the widget is about 133 px wide and the wind line still fits one line: **the top area is 73 px high** in English (was 108), 90 px in Russian. **Beside the panel (side layout):** the widget is at the top of the right column, the Attention chip under it, as the bar was.

### 1.4 The time card (`time-card`)

Opened by the left part; under the top area (`top: var(--view-top-h) + 4px`), over the 3D view, `z-index` 11 (over the Attention card, which starts open beside the panel). On a phone it spans the view from 8 px to 8 px (the owner: "almost full screen wide to save vertical space"); beside the panel it hangs at the right, `min(420px, 100% - 16px)` wide. It scrolls inside when the view is short. It closes with its × (`time-card-close`, focus returns to the left part), a second tap on the left part, or Escape. Its open state is not stored.

1. **Time speed** (`time-speed`; only where the speed shows): the heading, then **one row of seven choices** `time-scale-<value>` (`time-scale-0.25`, `-0.5`, `-1`, `-2`, `-4`, `-8`, `-16`; labels `¼ ½ ×1 2 4 8 16`), the current one filled with `--accent` and `aria-pressed="true"`. A tap sets the speed (`setTimeScale`; the link writes `tx` as before). One tap to any speed replaces « ‹ › » and "tap the speed for ×1".
2. **Clock** (`clock-card`; only while the clock shows), separated by a rule: the heading; the date line `clock-date` (`Monday 1 June 2026 · 12:00`); one line with the area and zone, `clock-sun` (sunrise · sunset) and the light; then **the setting buttons in their logical order**: one row with the date input, the time input and **Set** (`clock-date-input`, `clock-time-input`, `clock-set`), one row with **Now** and **Noon, 1 June** (`clock-now`, `clock-default`); the hint. In an exercise the buttons are disabled and `exercise-locked-clock` says why, as before. The "Set a time:" label is gone (the inputs say what they are).

### 1.5 Exercises: one button for every stop of time

| The run | Before M92 | M92 widget button |
|---|---|---|
| running, time going | Pause | Pause |
| paused by the learner, or "Pause after each step" | Resume (and a Resume button over the 3D view for the step pause) | Resume |
| a mistake card (time stopped) | Pause disabled; Carry on on the card and over the 3D view | **Carry on** (enabled) |
| failed card, setup card, "Now you" card | disabled | disabled |
| Alone, running | disabled with a title | disabled with a title |

The separate button over the 3D view (`exercise-resume`, owner on PR 152) is removed: it did the same as the widget's button now does, which is the "unified" button of the issue. The mistake card's own Carry on and Back stay.

### 1.6 Strings (`ui.json`, English final; Russian drafts)

New: `time.speedHeading` "Time speed"; `time.scaleAria` "Time speed ×{scale}"; `time.openHint` "Tap to change the time speed or set the clock"; `time.close` "Close the time card"; `pause.carryOnAria` "Carry on: close the mistake and let time run again".
Changed: `time.status` "Time speed ×{scale}"; `clock.chipAria` "Clock {time}, {date}"; `clock.hint` "The clock runs with the time speed: ×16 makes the sun move 16 times faster, and Pause stops it."
Removed (unused): `time.fold`, `time.unfoldSpeed`, `time.slowest`, `time.slower`, `time.faster`, `time.fastest`, `clock.setLabel`, `clock.close`.
No registry ids (no mesh or rope is added).

### 1.7 Tests

No model change, so no new unit test; `tests/ciPlan.test.ts` counts the new `m92` group (90 groups; newest m92, m91, m90, m89).

### 1.8 Browser checks (`scripts/shots-m92.mjs`, group `m92`, test clock)

Scenes (all sizes): `m92-widget`, `m92-card` (left part tapped), `m92-paused`, `m92-held`, `m92-ru-card`.
Live checks:
1. Phone: the widget beside the strip in the same row; the top area ≤ 80 px; the clock under the speed in the left part; `×1` and `12:00`; ≥ 44 px high. Pause → orange Resume, same width; Resume → Pause. The card: ≥ view width − 20 px, inside the view, the seven speeds in one row, under the top area, Set inside the view; `aria-expanded`; accessibility audit. `4` → `×4`, `tx=4` in the link, same widget width. × closes; a second tap on the left part closes.
2. Settings: Clock off → the speed stays, no clock, the card has only the speeds; Time bar off too → only Pause.
3. Held still, steady, flat: the clock and "Held still", no speed, no Pause; the card has only the clock.
4. Computer (1440 × 900): the widget beside the strip, the Attention chip under it; the card ≤ 420 px and on top of the Attention card; audit.
5. Russian: "Пауза", the widget inside the view; the card heading "Скорость времени".

Carry on in an exercise is checked by `m67` (the widget's button says Carry on, a tap runs the exercise, then it says Pause), the step pause's Resume by `m69`, the ×4 note by `m81`, the compact widget during a run by `m80`.

### 1.9 Done when / not in this milestone

Done when: the phone's top area is one row (≤ 80 px in English); the card works on a phone and a computer; the button carries on after a mistake; every check of 1.8 and every older group touched (m10, m17, m37, m56, m67, m69, m79, m80, m81) passes; typecheck, lint, tests and build pass.

Not in this milestone: keyboard shortcuts for time (none exist); moving the Attention chip; a new URL key; changing what the exercises lock.

### 1.10 Decided in the M92 PR (recommended; merging accepts it)

1. **Speeds as seven direct choices** in the card instead of « ‹ × › »: one tap to any speed, and it fits a phone's width in one row.
2. **The Resume / Carry on button over the 3D view (PR 152) is removed**: the widget's button now does both, so two buttons doing the same is what the issue asks to end. The mistake card keeps its own Carry on and Back.
3. **The fold of the time bar (M37) is removed**: the widget is always compact. Setup files keep `device.timeBarFolded` (written as whatever the device still has, normally false) so old and new files read the same.
4. **The Settings switches stay as they are** ("Time bar" hides the speed, "Clock" hides the clock; both off leave only Pause), so `tb=0` and `clock=0` links open as before.
5. **On a phone the strip gives up width** (AUTO wraps under the speed, the wind line is 12 px instead of 13 px) rather than the widget taking a row: 73 px instead of 108 px at the top.
6. **The card sits over the Attention card** on a computer (the learner just asked for it).
