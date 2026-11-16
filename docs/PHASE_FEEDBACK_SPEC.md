# Sailor feedback: sailor words, keys, point of sail, word tours (M100–M103)

A small phase made from the first public feedback (Reddit, r/sailing, November 2026), planned with `/plan issues 220 and from 223 to 233` on 2026-11-16. The owner's answers are in section 11.

## 0. How to use this spec

- Four milestones, built in order, **one PR each**, titled `M<N>: <name>` (the names are in section 6), each saying `Closes #<n>` for the issues its section names. Each milestone has its own GitHub issue (#235–#238), a short plain-words card for the owner that links back here; this spec stays the source the builder follows.
- Read sections 0–5, then **only your milestone's section** (7 for M100, 8 for M101, 9 for M102, 10 for M103). The general rules are in CLAUDE.md. Names (files, functions, store actions, `data-testid`s, string keys, ids) are required. Numbers are final unless marked **tunable**.
- **Text is data.** The English strings in this spec are final. German, Norwegian and Russian strings are AI drafts the builder writes (CLAUDE.md, "Russian text"; the same rule holds for every language but English): every new key exists in `content/lang/{de,no,ru}/*.json` with `textStatus: "draft"` where the file has that field, and the builder runs `npm run review-doc -- de`, `-- no` and `-- ru` after changing them.
- **No sailing physics changes** in M100–M102: `src/model` gets no new formula. M103 adds exercise data only (scripted wind, autopilot settings) and one model-free field to the exercise definition type.
- If a test band fails: check section 4 ("common mistakes") first, then tune only keys marked **tunable**, and report the before and after values in the PR. Never widen a band.
- Keep the signatures written here. Decisions taken while building go under the milestone's "Decided in the M<N> PR" subsection, marked "recommended; merging accepts it".
- Every earlier phase keeps working: old links open the same picture, and every earlier unit test and browser check stays green, except the ones a milestone's "Older checks" subsection names.

## 1. Goal and scope

**Goal.** Act on what sailors told us after the launch: talk like sailors (lines, trim, ease), let a computer user sail from the keyboard, show the point of sail where the eye already is (the wind dial), and let a learner "feel" a word with a short guided scene.

**In scope:** issues #223 (sailor words), #225 (simple in / out, already the Easy mode: covered by M100's words and M101's keys), #226 (keyboard), #229 (point of sail on the wind dial), #230 (word tours), and a "not on this boat" Learn entry for the cunningham (#231).

**Out of scope (owner, section 11):**

- **#224** (the exercise card covers the boat on a phone) and **#227** (winch turns, a held sheet that would not come in): bugs, fixed with `/bug`, not here.
- **#231 / #232** (cunningham, traveller, spinnaker): the reference boat has none of them (in-mast furling main, German mainsheet without a traveller, no gennaker rigged). They wait for the "other yacht setups" item in the ROADMAP's *Later* row. M100 adds only the Learn entry that says why.
- **#233** (sailor review of the language packs): the owner's task, started after M100 merges.
- Changing words in German, Norwegian or Russian (section 7.4), remappable keys, keys on a phone, lee helm in the model (section 10.9).

## 2. Conventions

- **Words (from M100 on):** in English, the boat's ropes are **lines**; pulling a sheet in is **trim**, letting any line out is **ease**. The registry keeps its ids and kinds (`rope_*`, `kind: "rope"`, `group: "ropes"`), the code keeps its names (`ropeId`, `ropesMode`, `RopeState`), and URL keys keep their names and values. Only text a person reads changes.
- **Angles:** the true wind angle `twaDeg` is signed, −180…180, + = wind over starboard, as everywhere in the model. The point of sail is worked out from `|twaDeg|` by the existing `pointOfSail` (`src/model/pointsOfSail.ts`).
- **Keys:** `KeyboardEvent.code` (the physical key, so the keys sit in the same place on a German or Norwegian keyboard), except `?`, which is read from `event.key`.

## 3. Shared helpers

One helper, added by M101:

| Name | File | Signature | Behaviour |
|---|---|---|---|
| `isTypingTarget` | `src/ui/dom.ts` (new export, M101) | `(target: EventTarget \| null): boolean` | True for an `INPUT`, `SELECT` or `TEXTAREA` element or a content-editable one. `thrusterPanel.ts` and the new `keyboard.ts` use it (`exerciseBar.ts` keeps its own `typing`, which also skips buttons and links). |

## 4. Common mistakes

- **M100: changing an id, a URL value or a code name** because it contains "rope". Only the text in `content/lang/en/*.json` (and English text written in `src/ui/*.ts`, if any) changes.
- **M100: a check that matched the old text.** Run the grep in 7.8 before pushing; a missed one fails first in the nightly run.
- **M101: a key that fires while the learner types** (the glossary search, a number field), or that steals the arrows from a focused slider, tab row or menu. Section 8.3 lists where the global keys are off.
- **M101: two handlers for one key.** A, D, J and L stay the thruster keys; during an exercise the exercise bar keeps ←, →, −, +, =, space, Enter and 1–4.
- **M102: the arrow on the wrong side.** The mini-map is north-up and draws bearings, not angles off the bow: the arrow points along the boat's heading, and the current band is the one on the boat's side of the wind (wind over starboard, `twaDeg > 0`: the band lies anticlockwise of the wind, at bearings `windFrom − angle`).
- **M103: a tour that moves the learner's own setup.** A tour is an exercise run: it starts from its own `start` link state and, on leaving, the app does what it does after any exercise.

## 5. Architecture

- **No new state field, store action or URL key in any milestone.** M101's keys dispatch actions that exist; keys are always on (owner on #226: no extra settings). M103 adds one optional field to the exercise definition, `feelIt?: readonly string[]` (registry ids of Learn entries), and the Learn button that reads it.
- No change to the step order.
- New files: M101 `src/ui/keyboard.ts`, `src/ui/keyHelp.ts`, `scripts/shots-m101.mjs`; M102 none (its checks join group `m28`, section 9.8); M103 `scripts/shots-m103.mjs`.

## 6. Milestones overview

| Milestone | What the owner sees | Issues (milestone issue first) | Rules tested | Depends on | Independent review |
|---|---|---|---|---|---|
| **M100: Sailor words** | English says "line(s)" for the boat's ropes and "Trim / Ease" for sheets; a Learn entry "Cunningham: not on this boat" | #235; #223, #225 (words), #231 (Learn entry) | none | — | not needed |
| **M101: Keyboard** | On a computer the boat answers keys at once: ← → steer, W / S the mainsheet, R / F the jib sheet, P the autopilot, H or ? the key list | #236; #226, #225 (keys) | none | M100 (the key list uses its words) | not needed |
| **M102: Point of sail on the mini-map** | The mini-map (bottom left) draws the points of sail around the boat, marks the current one with an arrow and names it | #237; #229 | none (display of the existing bands) | — | not needed |
| **M103: Word tours** | Learn entries get **Feel it**: the app sails a short exercise for the learner (header and lift; weather helm; the points of sail) | #238; #230 | PT-21, PT-29 (existing rules, new tests) | M100 | **required** |

## 7. M100: Sailor words

**Independent review: not needed** (English text, two Learn entries and one aria rule; no model, store, URL or layout change).

PR title `M100: Sailor words`; description says `Closes #235` (this milestone's issue), `Closes #223` and `Closes #225` (#225 is answered by the Easy mode plus M100's words and M101's keys, section 11).

### 7.1 Files

- `content/lang/en/ui.json`, `content/lang/en/glossary.json`, `content/lang/en/exercises.json`: the wording pass (7.2).
- `content/registry/parts.json`: two new terms (7.3).
- `content/lang/{de,no,ru}/glossary.json`: the two new entries as AI drafts (7.3); nothing else in those files changes (7.4).
- `src/model/controls.ts`, `src/ui/ropeControls.ts`, `src/ui/quickRow.ts`, `src/ui/exerciseBar.ts`: the trim / ease labels of the two sheets (7.5).
- `tests/sailorWords.test.ts` (new, 7.7); `docs/review/{de,no,ru}.md` and `-exercises.md` regenerated (`npm run review-doc -- <code>`).
- Older checks that read the old words (7.9).

### 7.2 The wording pass (English only)

Go through every string of the three English files with these rules, in this order. They are the whole decision; do not reword anything else.

1. **rope → line.** Every "rope" / "ropes" / "Rope" / "Ropes" a learner reads becomes "line" / "lines" / "Line" / "Lines", with the article fixed ("a rope" → "a line", "an outhaul rope" stays "an outhaul line"). Compounds: "rope end" → "line end", "rope tail" → "tail", "rope box" / "rope bin" → "line bin", "rope clutch" → "clutch". The panel section and its tab (`tab.ropes`, `debug.ropes`) read **Lines**; `ropes.list.title` reads **All lines and the wheel**; `learn.group.ropes` reads **Lines ({count})** (only the label string changes, not the group id).
2. **The only places "rope" stays** (the explanation the issue asks to keep): the new `term_line` entry (7.3), the `alternatives` lists of any glossary entry, and text in round brackets (rule 5a). Where "rope" means the material or a length ("a little rope moves the boom a lot"), write "line" too.
3. **Sheets and sails: haul in → trim.** For the mainsheet and the jib sheet (and "sheets" in general), and for a sail ("haul it in, or roll it away" → "trim it, or roll it away"), "haul in" / "hauled in" / "hauling in" / "pull in" become "trim" / "trimmed" / "trimming". The control keeps its UI name: "haul the main sheet in before turning" → "trim the main sheet before turning". "Sheet in" also becomes "trim". A string that speaks of sheets and other lines together uses rule 4's "pull in".
4. **Every other line: haul → pull.** For halyards, the vang, the outhaul, the topping lift, furling lines, mooring lines and the anchor chain, "haul (in)" becomes "pull (in)", in every form ("haul the vang" → "pull the vang on", "the outhaul is hauled together with" → "the outhaul is pulled together with"). "Winch in" stays. "Close-hauled" is a point of sail's name and stays.
5. **let out → ease**, for every line and sail ("let the sheet out" → "ease the sheet"; "the sail is let out too far" → "the sail is eased too far"; "no more rope to let out" → "no more line to ease"). The anchor chain is **paid out** ("let out 30 m of chain" → "pay out 30 m of chain"). Other uses are reworded in plain words ("let the gust out" → "spill the gust"). "Let go" (of a mooring line, meaning drop it) stays.
5c. **"lets X out" meaning "allows X to run"** becomes "lets X run out" ("a closed clutch never lets a line run out"); for the chain, "pays X out" ("the windlass pays the chain out"). The anchor itself is raised, not hauled ("hauls it back up" → "raises it again").
5d. **Sails, the vang, the topping lift:** "pulled in too far" (a sail) → "trimmed too far"; "haul the main in" → "trim the main"; "Haul in until the flapping stops" → "Trim until the flapping stops"; the vang or topping lift as subject: "Hauled, it holds…" → "Pulled on, it holds…", "Hauled tight" → "Pulled tight".
5e. **Names:** `fit_rope_bin` is named **Line bin** ("loose ends of the ropes" → "loose ends of the lines"); "rope tackle" → "tackle"; `fit_clutch` is named **Clutch**. The Harbour gear block for mooring lines (`lines.title`, "Lines") becomes **Mooring lines**, so it no longer shares a name with the Lines section; every text that points to it ("Harbour gear → Lines") says "Harbour gear → Mooring lines".
5a. **Words in brackets stay.** An explanation in round brackets may keep the old word for a beginner: "ease (let out)" and "a line (a rope with a job)" are fine. The test in 7.7 ignores text in round brackets.
5b. **Fixed targets** for strings older checks read: `ui.quick.easy` → "Tap a line: its − and + appear here."; `exercise.bar.sheet` "− hauls in · + lets out" → "− pulls in · + eases" (the bar uses it for the vang and the topping lift too, so it stays general; the two sheets' buttons say *Trim* / *Ease* through their labels, 7.5); the gybe hint "haul the main sheet in before turning" → "trim the main sheet before turning"; `ropes.fighting` → "Red: this line pulls against another one (fighting)"; `control.paidOut` → "{m} m of line paid out".
6. Glossary names: `term_trim` becomes **Trim** (was "Trim / haul in"), with alternatives `[{ "term": "haul in" }, { "term": "sheet in" }]`; its `short` becomes "To pull a sheet in; also, setting the sails to the wind." and its `what` "Trimming pulls a sheet in. It also means setting each sail to the wind: trim until it stops flapping, ease until it is not stalled." `term_ease` keeps the name **Ease**, `short` "To let a line run out slowly, under control.", `what` "Easing lets a line run out slowly and under control, so a sail can go further out or a load comes off." `term_sheet`'s last sentence becomes "On a boat a sheet is a line, not the sail."
7. Keep the meaning and the placeholders (`{rope}` stays as a placeholder name: it is a code name). A string under `exercise.bar.*` or `instruments.*` (the step bar and the instrument strip reserve widths) must not get longer; any other string may change length.

### 7.3 Two new Learn entries

Registry (`content/registry/parts.json`, next to `term_sheet`):

```json
{"id": "term_line", "kind": "term", "phase": 100, "group": "sailing", "status": "draft", "sources": ["wiki:nautical-terms-a-l"], "related": ["term_sheet", "term_halyard", "term_trim", "term_ease"]},
{"id": "term_cunningham", "kind": "term", "phase": 100, "group": "sailing", "status": "draft", "sources": ["wiki:nautical-terms-a-l"], "related": ["rope_main_halyard", "rope_outhaul", "rope_main_furling_line"]}
```

English glossary (`content/lang/en/glossary.json`, `entries`):

```json
"term_line": {
  "name": "Line",
  "alternatives": [{ "term": "rope", "note": "the material, before it has a job" }],
  "short": "Any rope that has a job on a boat.",
  "what": "On a boat a rope is named after its job: a sheet trims a sail, a halyard hoists it, a mooring line holds the boat. Together they are the lines. Sailors say “rope” for rope that has no job yet, such as a new coil.",
  "textStatus": "draft"
},
"term_cunningham": {
  "name": "Cunningham",
  "alternatives": [],
  "short": "A line that pulls the front edge of a mainsail down. This boat has none.",
  "what": "On a mainsail that is hoisted up a mast track, the cunningham pulls the sail’s front edge (the luff) down near the bottom. More tension moves the sail’s fullness forward and flattens it in a stronger wind.",
  "onThisBoat": "None, as far as we know (not yet confirmed on the real boat). The mainsail rolls into the mast, so its front edge sits on the furling rod inside the mast and there is nothing to pull it down; its tension comes from the main halyard.",
  "textStatus": "draft"
}
```

German, Norwegian and Russian: the same two entries, translated as AI drafts with `textStatus: "draft"` (the glossary test needs every registry id in every language). `docs/BOAT_REFERENCE.md` section 5 (Assumptions) gets one row: Assumption "No cunningham (in-mast furling main: the luff sits on the furling rod)" | Value used "none" | Status "assumption; open question 23". If `tests/glossary.test.ts` requires `related` links to point both ways or counts the entries of a group, add the back-links and update the counts.

### 7.4 Other languages

German, Norwegian and Russian strings do not change (CLAUDE.md: a term changes only where a sailor confirms the usual word). Regenerate their review documents so the English column shows the new words: `npm run review-doc -- de`, `-- no`, `-- ru`.

### 7.5 The sheets' − / + buttons

The visible labels stay "−" and "+". For `ctl_mainsheet` and `ctl_jib_sheet` only (their value is "% eased", so − pulls the sheet in), the buttons' `aria-label` uses two new strings instead of `control.less` / `control.more` (`stepButton` in `stepper.ts` is unchanged):

| Key | English |
|---|---|
| `control.trim` | `Trim: {name}` |
| `control.ease` | `Ease: {name}` |

Every other control keeps `control.less` / `control.more`. The set lives in `src/model/controls.ts`: `export const SHEET_CONTROL_IDS: ReadonlySet<ControlId> = new Set(['ctl_mainsheet', 'ctl_jib_sheet'])`, and the three places that build these labels use it, inside their non-wheel branch: `src/ui/ropeControls.ts`, `src/ui/quickRow.ts` (lines 111–112 today) and `src/ui/exerciseBar.ts`. The exercise bar's buttons (`exercise.bar.lessAria` / `moreAria`) follow the same rule with two new keys, `exercise.bar.trimAria` "Trim {name}" and `exercise.bar.easeAria` "Ease {name}". De / no / ru get AI drafts of the four keys.

### 7.6 Strings and registry

New: `control.trim`, `control.ease`, `exercise.bar.trimAria`, `exercise.bar.easeAria` (all four languages), `term_line`, `term_cunningham` (registry and four glossaries).

### 7.7 Tests (Vitest)

No PHYSICS_TRUTHS rule applies. New `tests/sailorWords.test.ts`:

- **M100 no "rope" in English text:** walk every string of `content/lang/en/ui.json`, `glossary.json` (`entries`) and `exercises.json`; skip the keys `$comment` and `$status`, every `alternatives` array, and the whole `term_line` entry; remove text in round brackets (`s.replace(/\([^)]*\)/g, '')`) before matching. No string matches `/\bropes?\b/i`. The failure message names the key path.
- **M100 no "haul" / "let out" in English text:** the same walk and bracket removal; no string matches `/(?<![-\w])haul(s|ed|ing)?\b/i` (so "Close-hauled" and "outhaul" pass) or `/\blet(s|ting)?\s+(it\s+|them\s+)?out\b/i` ("let out", "letting out", "let it out"; the test is a safety net, rules 1–5e are the full instruction).
- **M100 new terms:** `term_line` and `term_cunningham` exist in the registry with `status: "draft"` and in all four glossaries.
- The existing language, glossary and review-document tests stay green (they cover the new keys and the regenerated documents).

### 7.8 Browser checks

No new group: the change is text. Run `SHOTS_ONLY=m11,m21,m23,m38,m48,general` locally (the groups 7.9 changes). No new checks are written. Because English text is read by checks all over the set, the PR runs every group in CI.

### 7.9 Older checks and tests this milestone changes

Find every check that reads English text with the old words: `grep -n -E "['\"\`][^'\"\`]*\b([Rr]opes?|[Hh]aul(s|ed|ing)?|[Ll]et(s|ting)? |Lines\b)[^'\"\`]*['\"\`]" scripts/*.mjs tests/*.ts` (the last two catch "lets … out" and the renamed mooring-lines block), and change every hit that is text a learner reads (not ids, test ids, scene names or code names). Known hits (planning, 2026-11-16):

- `scripts/shots-m11.mjs:65` and `tests/gybe.test.ts:241`: the gybe hint → `'trim the main sheet before turning'` (rule 5b).
- `scripts/shots-m21.mjs:58` `'Ropes (9)'` → `'Lines (9)'` (both in the check and its label).
- `scripts/shots-m23.mjs:232` `'Ropes'` (the English section title) → `'Lines'`.
- `scripts/shots-m38.mjs:480` → `'Red: this line pulls against another one'`.
- `scripts/shots-m48.mjs:142` → `'Tap a line: its − and + appear here.'`.
- `scripts/shots.mjs:779` → `'0.0 m of line paid out'`.
- `tests/alerts.test.ts` (around line 372) and any other test that compares English alert text.

Scene names (`learn-realistic-ropes`, `realistic-rope-wrapped-helm`) are names, not text: they stay.

`CI groups: all`

### 7.10 Done when / not in this milestone

**Done when:** `npm run check` passes; the groups in 7.8 pass; the review documents are regenerated; CODE_MAP does not change (it does not list test files one by one); the WORKFLOW checklist is in the PR with full links.

**Not in this milestone:** German, Norwegian or Russian wording; ids, URL keys and code names; the keys (M101); a "simple trim" mode (the Easy mode is it, section 11).

### 7.11 Decided in the M100 PR

All marked "recommended; merging accepts it".

1. **The "no rope" test also ignores `{placeholders}`.** Two strings carry the code name `{rope}` (`alert.ropeSlipping`, `exercise.bar.onWinch`); 7.2 rule 7 keeps it, so `tests/sailorWords.test.ts` removes text in curly braces next to the text in round brackets. Recommended; merging accepts it.
2. **Where a sentence said "pull in" about a line that is not a sheet** (a clutch, the winch, a furling line), it stays "pull in" (rule 4); "trim" is used only for the two sheets and for sails.
3. **The mooring-lines block is "Mooring lines"** (`lines.title`) and the five exercise steps that point to "Harbour gear → Lines" say "Harbour gear → Mooring lines". The Lines section's four titles (`tab.ropes`, `debug.ropes`, `helmView.ropes`, `exercise.ropes`) read "Lines". Recommended; merging accepts it.
4. **Drafts in the other languages** for `control.trim` / `control.ease` and the two exercise-bar keys: German *Trimmen* / *Fieren*, Norwegian *Trim* / *Fire*, Russian *Выбрать* / *Потравить* (sailor verbs, AI drafts). `term_line` is *Leine* / *Line* / *Снасть*. They wait for the sailor reviews (#233). Recommended; merging accepts it.
5. **Older tests:** the glossary test's `sailing` group size is 32 (30 plus the two new terms), and the language test reads "Lines" for `tab.ropes`. Browser checks `m11`, `m21`, `m23`, `m38`, `m4a`, `m48`, `m55`, `m66` and `shots.mjs` read the new words.

## 8. M101: Keyboard

**Independent review: not needed** (UI input only: the keys dispatch store actions that exist, with the same values the buttons send; no model, store, URL or layout change).

PR title `M101: Keyboard`; description says `Closes #236` (this milestone's issue) and `Closes #226`.

### 8.1 Files

- `src/ui/keyboard.ts` (new): `keyAction` (pure) and `createKeyboard` (8.2, 8.3).
- `src/ui/keyHelp.ts` (new): the key list dialog (8.4).
- `src/ui/dom.ts`: `isTypingTarget` (section 3); `src/ui/thrusterPanel.ts` uses it instead of its own test (same behaviour).
- `src/app/app.ts`: create the keyboard **after** `createExerciseBar` (line 147 today), so the bar's listener runs first (8.3, rule 3).
- `src/ui/settingsMenu.ts`: the Keyboard row (8.4). `src/style.css`: the dialog's key caps and the row's phone rule.
- `content/lang/*/ui.json`: the strings of 8.5. `tests/keyboard.test.ts` (new). `scripts/shots-m101.mjs` (new), registered in `scripts/shots.mjs`; `.github/ci-times.json` gets its measured time; `m101` is added to the live groups listed in `tests/ciPlan.test.ts` (around line 342).
- `docs/CODE_MAP.md`: `keyboard.ts` and `keyHelp.ts` in the UI table.

### 8.2 The keys (`keyAction`)

```ts
export type KeyResult = Action | 'help' | null;
/** What a key press does, or null. Pure: reads the state, dispatches nothing. */
export function keyAction(
  code: string,          // KeyboardEvent.code
  key: string,           // KeyboardEvent.key (only for '?')
  shift: boolean,
  state: AppState,
): KeyResult;
```

| Key (`code`) | Does | Action |
|---|---|---|
| `ArrowLeft` / `ArrowRight`, autopilot off (`state.autopilot.mode === 'off'`) | Turns the wheel to port / starboard by one step | `setControls` `{ ctl_rudder: snapControl('ctl_rudder', rudder ∓ step, step) }`, `step = state.settings.step` (the same step the − / + buttons use) |
| `ArrowLeft` / `ArrowRight`, autopilot on (`mode` is `'heading'` or `'wind'`) | Moves the autopilot's course to port / starboard | `{ type: 'autopilot', command: { turnDeg: ∓d } }`, `d = boat.physics.autopilot.smallStepDeg` (1), with Shift `largeStepDeg` (10) |
| `KeyW` / `KeyS` | Mainsheet trim / ease | `setControls` `{ ctl_mainsheet: snapControl('ctl_mainsheet', value ∓ step, step) }`: W subtracts (trims), S adds (eases) |
| `KeyR` / `KeyF` | Jib sheet trim / ease | the same with `ctl_jib_sheet` |
| `KeyP` | Autopilot on / off | mode `'off'` → `{ type: 'autopilot', command: 'heading' }` (holds the present course, as the Heading button does); any other mode → `command: 'off'` |
| `KeyH`, or `key === '?'` | Opens the key list, or closes it if open | `'help'` |

Shift changes only the arrows with the autopilot on. `?` is read from `key` only (on a German keyboard it is Shift + ß, `code` `Minus`), `H` from `code` only. Keys act in every app mode, paused or not, sailing or held still.

`keyAction` returns `null` when:

- the four sheet keys are pressed with `state.settings.ropesMode !== 'easy'` (in Realistic ropes the sheets are worked at the winches; the key list says so);
- the new control value equals the present one (at an end of its range);
- `state.exercise !== null && state.exercise.demo !== null` (the app is playing an exercise for the learner), for every key but the help key;
- the two arrows while `state.exercise !== null` (any phase of a run: in an exercise the step bar owns ← and → on a computer, and a run never needs the wheel from the arrows); the letter keys still act in an exercise;
- any other key. `KeyA`, `KeyD`, `KeyJ`, `KeyL` stay the thruster keys (`thrusterPanel.ts`); `keyAction` returns `null` for them.

### 8.3 `createKeyboard(store: Store, help: KeyHelp): void`

One `keydown` listener on `document` (bubbling phase), and a `keyup` listener that deletes that key's entry from the repeat map. A key press is handled in this order:

1. ignored if `event.ctrlKey || event.altKey || event.metaKey`;
2. ignored if `isTypingTarget(event.target)` (the glossary search, number fields);
3. ignored if `event.defaultPrevented` (another handler, such as the exercise bar's, used it);
4. **the help key** (`H`, `?`): toggles the key list, unless another modal dialog is open (`document.querySelector('.welcome-backdrop:not([data-testid="key-help-backdrop"])') !== null`: the welcome card, the language dialog). It works while a chip menu or chip card is open.
5. **every other key** is ignored while any modal dialog is open (`document.querySelector('.welcome-backdrop') !== null`, the key list included) or `overlayOpen()` (`chipMenu.ts`: a chip menu or card, such as the gear's Settings card, is open);
6. **the two arrows** are ignored unless `event.target` is `document.body` or an `HTMLCanvasElement` (a focused tab row, slider, radio group, menu or drawing keeps its own arrows; e.g. `scripts/shots-m39.mjs` and `shots-m54.mjs` press arrows on focused widgets). The letter keys act whatever has the focus (a focused button does not use W, S, R, F, P or H).

Otherwise `keyAction(event.code, event.key, event.shiftKey, store.getState())`; on a non-null result call `event.preventDefault()`, then dispatch the action or toggle the key list. Escape is not handled here: the open key list closes itself on Escape (8.4).

**Holding a key:** the first `keydown` acts at once; a repeated one (`event.repeat`) acts only when at least **150 ms** (**tunable**) of real time (`performance.now()`) have passed since that key last acted (a `Map<string, number>` from `code` to the time it last acted; `keyup` deletes the entry), so a held W trims at about the rate a held − button does. `KeyP` and the help key ignore repeats.

### 8.4 The key list (`keyHelp.ts`) and the Settings row

`createKeyHelp(): KeyHelp`, with `interface KeyHelp { open(): void; close(): void; toggle(): void; isOpen(): boolean }`. It builds the same kind of dialog as the language dialog in `settingsMenu.ts`, written in `keyHelp.ts` by following that code (do not refactor the language dialog) (`welcome-backdrop` > `welcome-card` with `role="dialog"`, `aria-modal`, the rest of the page `inert` while open, Escape (a capture-phase `keydown` listener on `document` while open, as the language dialog has) and a tap beside the card close it, the focus goes to Close and back to where it was on close). Test ids: `key-help-backdrop`, `key-help` (the card), `key-help-close`.

Content: the title, then a two-column list (`<dl class="key-list">`): the key caps (`<kbd>`, text from code, never translated: `←` `→`, `W` `S`, `R` `F`, `P`, `A` `D`, `J` `L`, `1–4` `Space` `Enter`, `H` `?`) and the description string; then the two notes; then Close (`settings.close`, class `exercise-button`). The card has the classes `welcome-card language-card key-help-card` (the language card's width). `.key-list { display: grid; grid-template-columns: max-content 1fr; gap: 6px 12px; margin: 12px 0; }`, `dt` holds the caps with 4 px between them, `dd { margin: 0; }`; the two notes are `p.hint` under the list. The `<kbd>` style: 1px border in the card's text colour at 40 % opacity, 4 px radius, 2 px 6 px padding, `font: inherit`, `min-width: 1.6em`, centred. No icons.

**Settings row** (in `buildSettingsBody`, after the language field): `el('div', { class: 'field keys-field', 'data-testid': 'settings-keys-field' })` with the title `settings.keys.label`, the hint `settings.keys.hint` and a button `settings.keys.button` (`data-testid="settings-keys"`, class `exercise-button`) that calls `help.open()`. On a phone layout the row is hidden: `html[data-layout="stacked"] .keys-field { display: none; }`. `createKeyHelp()` is made once in `app.ts`, before the settings are built; `createSettingsContent(store, showWelcome)` gets a third parameter `keyHelp: KeyHelp` and passes it to `buildSettingsBody(store, keyHelp)` (every caller of `createSettingsContent` passes it). `createKeyboard(store, keyHelp)` is called after `createExerciseBar`.

**Exercise bar:** `exercise.bar.keys` gets " · H: all keys" at its end (8.5), in all four languages (de / no / ru: the drafts' own wording of it). The bar shows that line on a computer only, as today.

### 8.5 Strings (`ui.json`; English final, de / no / ru AI drafts)

| Key | English |
|---|---|
| `keys.title` | Keyboard keys |
| `keys.steer` | Steer. With the autopilot on: its course, 1° a press (with Shift: 10°). |
| `keys.main` | Mainsheet: trim / ease |
| `keys.jib` | Jib sheet: trim / ease |
| `keys.autopilot` | Autopilot on (holds this course) / off |
| `keys.bowThruster` | Bow thruster to port / starboard (Harbour mode) |
| `keys.sternThruster` | Stern thruster to port / starboard (Harbour mode) |
| `keys.bar` | In an exercise: the step bar's rows, its buttons and Show me |
| `keys.help` | Show or hide this list |
| `keys.noteRopes` | W, S, R and F work the sheets in Easy mode. In Realistic mode you work them at the winches. |
| `keys.noteOff` | Keys do nothing while you type in a field or while the app sails an exercise for you. |
| `settings.keys.label` | Keyboard |
| `settings.keys.hint` | Press H or ? at any time to see the keys. |
| `settings.keys.button` | Show the keys |
| `exercise.bar.keys` (changed) | Keys: 1–4 choose a row · ← → its first or last button · Space: its first button · H: all keys |

The Russian strings name the keys in Latin letters (H, W, S, R, F, P, Shift): add any of them the language test rejects to `content/lang/latin-words.json`, as M99 did for "Shift".

### 8.6 Tests (`tests/keyboard.test.ts`)

No PHYSICS_TRUTHS rule applies. `s0` (below; autopilot off, Easy ropes, step 5):

- `ArrowLeft` → `setControls` with `ctl_rudder: -5`; `ArrowRight` → `5`.
- Autopilot on (`s0` reduced with `{ type: 'autopilot', command: 'heading' }`): `ArrowLeft` → `{ type: 'autopilot', command: { turnDeg: -1 } }`; `ArrowRight` with Shift → `turnDeg: 10`.
- `KeyW` → `ctl_mainsheet: 25`; `KeyS` → `35`; `KeyR` → `ctl_jib_sheet: 25`; `KeyF` → `35`.
- At `ms=0`, `KeyW` → `null`; at `ms=100`, `KeyS` → `null`.
- With `settings.step` 1 (`{ type: 'setStep', step: 1 }`): `KeyW` → `29`.
- Realistic ropes (`{ type: 'setRopesMode', mode: 'realistic' }`): `KeyW`, `KeyS`, `KeyR`, `KeyF` → `null`; `ArrowLeft` still steers.
- `KeyP` with the autopilot off → `command: 'heading'`; on → `command: 'off'`.
- `KeyH` → `'help'`; `code: 'Slash', key: '?'` → `'help'`; `KeyA`, `KeyD`, `KeyJ`, `KeyL`, `KeyQ` → `null`.
- A watched exercise (`?m=exercise&ex=points-of-sail` link state from `exerciseStartLink`, reduced with `{ demo: 'watch' }` then `'start'`): `ArrowLeft`, `KeyW`, `KeyP` → `null`; `KeyH` → `'help'`.
- Every action `keyAction` returns is accepted by `reduce` (the new state differs from the old).

Note for these tests: a link without `ap` starts with the autopilot holding the heading (`parseBoat` in `urlState.ts`), so: `s0 = parseUrlState('?ms=30&js=30&rd=0&ap=off&sea=flat')`.

### 8.7 Browser checks (`scripts/shots-m101.mjs`, group `m101`, test clock)

A new group: no existing group covers global keys. Budget: **60 s** or less (one computer page and one phone page). Every page: `openPage(viewport, label, query, { testClock: true })`; read values from the link with `waitForLink` (`scripts/ui.mjs`); press keys with `page.keyboard.press` after clicking the 3D canvas once at its centre (so the focus is on the canvas, not a button).

Computer (1280 × 800), link `?ms=30&js=30&rd=0&ap=off&sea=flat&lb=0` (a link without `ap` starts with the autopilot holding the heading, `urlState.ts` `parseBoat`; `ap=off` makes the arrows steer the wheel):

1. **Arrows steer:** `ArrowRight` × 3 → the link has `rd=15`.
2. **Sheet keys:** `KeyW` × 2 → `ms=20`; `KeyS` → `ms=25`; `KeyR` → `js=25`; `KeyF` × 2 → `js=35`.
3. **Autopilot:** `KeyP` → the link no longer has `ap=off` (a hold of the present heading writes no `ap`, `boatParams`); then at once `ArrowLeft` × 5 → the link has `apt=355` (the start heading is 0; the test clock stands still between presses, so the boat has not turned yet); `KeyP` → the link has `ap=off` again.
4. **Typing does not trigger keys:** open the Learn section, click `learn-search`, type `ws`: `ms` and `js` in the link are unchanged.
5. **Key list:** click the canvas, press `H`: `key-help` is visible and lists 8 `<dt>` rows; press Escape: hidden. Press `?` (`page.keyboard.press('?')`): visible; click `key-help-backdrop` at its top-left corner: hidden.
6. **Settings row:** open Settings: `settings-keys` is visible; click it: `key-help` is visible; Close.
7. **No steering in an exercise:** open `?m=exercise&ex=points-of-sail`, click `exercise-start` (the card's *Do it myself* button; it has class `exercise-start` and test id `exercise-start`: check with `grep -n "exercise-start" src/ui/exercisePanel.ts` and use the id it has), click the canvas, `ArrowRight` once: the link's `rd` and `apt` are unchanged.

Phone (390 × 844), link `?sea=flat`: open Settings with `openSettings` (`scripts/ui.mjs`): `settings-keys-field` is not visible.

Register the group in `scripts/shots.mjs` (import and `liveGroups`); it has no scenes.

Record the group's time in `.github/ci-times.json` (`"m101"`).

### 8.8 Older checks and tests this milestone changes

- `grep -n "Keys: 1–4" scripts/*.mjs tests/*.ts`: no hit today (planning grep); if one appears, update it to the new string.
- Checks that press arrows on focused widgets (`shots-m4a.mjs:173`, `m25`, `m26`, `m38`, `m39`, `m51`, `m54`) keep working by rule 5 of 8.3; run them: `SHOTS_ONLY=m101,m4a,m25,m26,m38,m39,m51,m54,m41,m81`.
- `m41` holds `KeyA` / `KeyL` for the thrusters: unchanged, run it.

`CI groups: m4a, m25, m26, m38, m39, m51, m54, m41, m81`

### 8.9 Done when / not in this milestone

**Done when:** `npm run check` passes; the groups in 8.8 pass; the PR's checklist has full links; CODE_MAP lists the two new files.

**Not in this milestone:** remapping keys, keys on a phone, keys for the Realistic winches, the clutches, the engine or the furling lines, a keyboard hint in the welcome card.

### 8.10 Decided in the M101 PR

(The builder writes here.)

## 9. M102: Point of sail on the mini-map

**Independent review: not needed** (a drawing on the mini-map from the existing point-of-sail bands; one pure helper with unit tests; no store, URL or physics change).

PR title `M102: Point of sail on the mini-map`; description says `Closes #237` (this milestone's issue) and `Closes #229`.

The sailor's "wind compass in the bottom-left" is the **mini-map** (`src/ui/miniMap.ts`, drawn by `drawMiniMap` in `src/ui/mapView.ts`): north-up, the boat in the middle, the true-wind arrow at the top left, "N" at the top right. It shows while sailing in every mode (unless turned off in Settings or the map camera is open, which already labels every point of sail). M102 adds three things to it: the points of sail as a ring of arcs around the boat, an arrow on the ring along the boat's heading, and the current point of sail's name at the bottom. The instrument strip's heading stays as it is (the issue: keep the numeric heading).

### 9.1 Files

- `src/model/pointsOfSail.ts`: `pointOfSailArcs` (9.2).
- `src/ui/mapView.ts`: `MINI_MAP.pointRose` (9.3) and `drawPointRose`, called from `drawMiniMap` (9.3).
- `src/ui/miniMap.ts`: the button's `data-point-of-sail` attribute and its label (9.4).
- `content/lang/*/ui.json`: 7 strings (9.5). `tests/pointsOfSail.test.ts` (new; no test file covers `pointOfSail` today). `scripts/shots-m28.mjs`: the checks of 9.7.

### 9.2 Model: `pointOfSailArcs` (pure)

```ts
export interface PointOfSailArc {
  id: PointOfSail['id'];
  /** Compass bearings, degrees in [0, 360); the arc runs clockwise from `fromBearingDeg` to `toBearingDeg`. */
  fromBearingDeg: number;
  toBearingDeg: number;
  /** 'starboard': the side where the wind is over starboard (twaDeg > 0). */
  side: 'starboard' | 'port';
  current: boolean;
}
export function pointOfSailArcs(windFromDeg: number, twaDeg: number, data: BoatData = boat): PointOfSailArc[];
```

For each band of `data.physics.display.pointsOfSail` (`fromDeg`, `toDeg` measured off the wind), two arcs, in the data's order, starboard first:

- `starboard`: from `windFrom − toDeg` to `windFrom − fromDeg` (a boat heading there has the wind over starboard: heading = windFrom − TWA);
- `port`: from `windFrom + fromDeg` to `windFrom + toDeg`.

Every bearing is wrapped with `((x % 360) + 360) % 360`. `current` is true for exactly one arc: `id === pointOfSail(twaDeg, data).id` and `side === (twaDeg >= 0 ? 'starboard' : 'port')`. Twelve arcs for the six bands of the Hanse data.

### 9.3 Drawing (`drawPointRose(ctx, state, sizePx)`)

Called in `drawMiniMap` after `drawBuoys` and **before** `drawBoat`, so the boat sits on top. `sizePx` is the `sizePx` `drawMiniMap` gets, the canvas's CSS width (`sizedFor`): **92** on a phone and **156** on a computer (the 96 / 160 px button has a 2 px border). Wrap the drawing in `ctx.save()` / `ctx.restore()` and set `setLineDash([])`, `lineCap = 'butt'` and `lineJoin = 'miter'` at its start (the earlier drawings leave other values). Build the viewport with `miniMapViewport(state, sizePx)` for `bearingToScreen`. Inputs: `windFrom = compassDeg(state.wind.dirDeg)`, `twa = state.rig.wind.twaDeg`, `heading = state.boat.headingDeg`. The map is north-up, so a bearing `b` points to screen direction `(sin b, −cos b)` from the centre (`bearingToScreen` does this; use it).

Data in `MINI_MAP` (all **tunable**, CSS px):

```ts
pointRose: {
  /** Ring radius as a share of the canvas size. */
  radiusShare: 0.34,
  /** Degrees left out at each end of an arc, so the bands read as separate pieces. */
  gapDeg: 2,
  lineWidth: 2,
  currentLineWidth: 4,
  band: 'rgba(20, 50, 90, 0.35)',
  bandCurrent: '#14325a',
  noGo: 'rgba(214, 40, 40, 0.45)',
  noGoCurrent: '#d62828',
  /** The heading arrow: a filled triangle on the ring, pointing outwards. */
  arrowLengthPx: 8,
  arrowBasePx: 7,
  /** The name at the bottom centre: font size, distance of its middle from the bottom edge. */
  nameFontPx: { stacked: 10, side: 12 },
  nameFromBottomPx: 7,
},
```

1. **Arcs:** for each arc of `pointOfSailArcs(windFrom, twa)`, stroke a circle arc of radius `r = radiusShare × sizePx` (CSS px; the context is already scaled by the device pixel ratio) round the canvas centre, from `fromBearingDeg + gapDeg` to `toBearingDeg − gapDeg`, clockwise. Colour: `noGo`/`noGoCurrent` for `no_go`, else `band`/`bandCurrent`; width `currentLineWidth` for the current arc, else `lineWidth`. (Canvas angles: bearing `b` is canvas angle `(b − 90)` in radians, clockwise positive, because canvas y points down.)
2. **Arrow:** a filled triangle in the current arc's colour, its base centred on the ring at bearing `heading`, its tip `arrowLengthPx` further out, base width `arrowBasePx`, with a 2 px stroke in `COLOURS.halo` drawn first.
3. **Name:** `haloText(ctx, t(\`pos.short.${id}\`), sizePx / 2, sizePx − nameFromBottomPx, { bold: true, size })`, `size = nameFontPx.stacked` when `sizePx < 120` else `nameFontPx.side`. If the measured text (`ctx.measureText` after setting the font) is wider than `sizePx − 8`, scale the size down by that ratio, not below 8 px.

Nothing else on the mini-map moves. With `radiusShare` 0.34 the ring (31.3 px on a phone, 53 px on a computer, plus half the line width) stays clear of the wind arrow (its inner end is about 36 px from the centre on a phone), of "N", and of the name (on a phone the ring's lowest point is at y ≈ 79, the name spans y 80–90).

### 9.4 The button (`miniMap.ts`)

After each draw, set `button.dataset.pointOfSail` to the current id and, when it changes, the `aria-label` to (until the first draw the button keeps `minimap.open`, which stays in `ui.json`; a language change reloads the page) `t('minimap.openWithPoint', { point: t(\`pos.short.${id}\`) })`. (The browser checks read the attribute; a screen reader hears the point of sail.)

### 9.5 Strings (`ui.json`; English final, de / no / ru AI drafts)

| Key | English |
|---|---|
| `pos.short.no_go` | No-go |
| `pos.short.close_hauled` | Close-hauled |
| `pos.short.close_reach` | Close reach |
| `pos.short.beam_reach` | Beam reach |
| `pos.short.broad_reach` | Broad reach |
| `pos.short.run` | Run |
| `minimap.openWithPoint` | Mini-map, now {point}: tap to open the full map. |

The point-of-sail names already have glossary entries in every language (`term_no_go_zone` … `term_run`); the issue's "names in the glossary" is met.

### 9.6 Tests

No PHYSICS_TRUTHS rule changes (the bands are PT-21 / PT-22's existing display data). In the test file of 9.1, `tests` named **M102 …**:

- `pointOfSailArcs(0, 45)`: 12 arcs; exactly one `current`: `close_hauled`, `starboard`, from 305 to 320.
- `pointOfSailArcs(90, -120)`: the current arc is `broad_reach`, `port`, from 190 to 240.
- `pointOfSailArcs(0, 0)`: current `no_go`, `starboard`, from 320 to 0.
- `pointOfSailArcs(0, 180)`: current `run`, `starboard`, from 180 to 210.
- For `windFrom` in {0, 137, 300} and `twa` in {1, 45, 90, 135, 179, −1, −45, −90, −179}: the heading bearing `windFrom − twa` (wrapped) lies on the current arc (clockwise from `fromBearingDeg` to `toBearingDeg`, edges included).
- The 12 arcs cover the full circle once: the sum of their clockwise lengths is 360.

### 9.7 Browser checks (join group `m28`, the mini-map's group)

Labels contain "m28" (so `openPage` keeps the mini-map on). Add to `scripts/shots-m28.mjs`, as one live check on the phone page and one on the computer page, about **10 s** in all (the group is 85 s today):

1. **Scene** `m28-point-rose` (in the file's scene list, `waitMs: 3000` as the others): `?wd=0&ws=12&hdg=315&ms=12&js=0&ap=hdg&sea=flat&lb=0` (close-hauled on starboard tack), phone and computer sizes. Add the live checks as numbered blocks after the file's last one, with its `check` helper.
2. **Live, phone (390 × 844) and computer (1280 × 800):** open the scene's link; wait 1 s (`page.waitForTimeout`); the `mini-map` button has `data-point-of-sail="close_hauled"` and its `aria-label` contains "Close-hauled".
2b. **Live, computer, pixels:** open `?wd=0&ws=12&hdg=318&ms=12&js=0&ap=hdg&sea=flat&lb=0` (TWA 42°: close-hauled, the current arc 305–320° with the arrow at 318°); wait 1 s. Read `mini-map-canvas` with `getImageData` in device pixels: centre `(canvas.width / 2, canvas.height / 2)`, radius `0.34 × canvas.width`, point at bearing `b` = `(cx + r sin b, cy − r cos b)`. At bearing **310** (inside the drawn arc 307–318, more than 4° from the arrow) the darkest pixel of the 5 × 5 square round the point has R + G + B **below 300** (`#14325a` sums to 160); at bearing **50** (the same band on the port side, drawn thin and pale) the darkest pixel of its 5 × 5 square sums to **more than 360** (the blend over `#d9ebf6` is about 509; a grid line under the arc brings it to about 435, a crossing of two to about 385). So the check fails if the current arc is not drawn darker.
3. **Live, computer:** open `?wd=0&ws=12&hdg=270&ms=60&js=100&ap=hdg&sea=flat&lb=0` (wind on the beam, starboard side): `data-point-of-sail="beam_reach"` after 1 s.

Record the new time of `m28` in `.github/ci-times.json` if it changes by more than half (it should not).

### 9.8 Older checks and tests this milestone changes

No older check reads the mini-map's `aria-label` text (planning grep for `minimap.open` and "Mini-map: tap", 2026-11-16); if one appears, make it `toContain('tap to open the full map')`. The mini-map now draws more, so run the groups that show it: `SHOTS_ONLY=m28,m29,m30,m52,m79`.

`CI groups: m28, m29, m30, m52, m79`

### 9.9 Done when / not in this milestone

**Done when:** `npm run check` passes; the groups in 9.8 pass; the PR's checklist has full links; CODE_MAP's `pointsOfSail.ts` line says it also gives the mini-map's arcs, and the `miniMap.ts` line that it shows the point of sail.

**Not in this milestone:** points of sail on the 3D view, on the wind dial in the Conditions section or on the instrument strip; changing the bands.

### 9.10 Decided in the M102 PR

(The builder writes here.)

## 10. M103: Word tours ("Feel it")

**Independent review: required** (two new exercises whose checks and texts teach sailing: a wrong band or sentence would teach the wrong thing about wind shifts and weather helm; it adds a field to the exercise definition).

PR title `M103: Word tours`; description says `Closes #238` (this milestone's issue) and `Closes #230`.

A tour is an **exercise played in Watch mode** (M81): the app sails it, stops after each step and shows the step's text; the learner can take over with *Let me try it*. A Learn entry whose term an exercise lists gets a **Feel it** button that starts that exercise in Watch mode. Three tours:

| Learn entries | Exercise | New? |
|---|---|---|
| `term_close_hauled`, `term_close_reach`, `term_beam_reach`, `term_broad_reach`, `term_run` | `points-of-sail` | no (it already has a pilot) |
| `term_wind_shift` (searchable as "header" and "lift") | `wind-shift`, "Header and lift" | yes |
| `term_weather_helm`, `term_heel` | `weather-helm`, "Weather helm" | yes |

Both new exercises also appear in the exercise list like any other (no hidden flag). Lee helm is not in the model (heel only adds weather helm, `physics.heel.weatherHelmDegPerDegHeel`), so the weather-helm tour shows weather helm only (section 11, answer 6).

### 10.1 Files

- `src/model/exercises.ts`: `feelIt?: readonly string[]` on `ExerciseDef`, and `feelItFor(entryId: string): ExerciseDef | undefined` (the first exercise whose `feelIt` lists the id).
- `content/exercises/exercises.json`: the two exercises (10.2) and `"feelIt"` on `points-of-sail`.
- `src/app/exercisePilots.ts`: `windShiftPilot`, `weatherHelmPilot`, and their cases in `pilotFor` (10.3).
- `src/ui/learnTab.ts`: the Feel it button (10.4).
- `content/lang/*/exercises.json`: the two exercises' texts (10.5); `content/lang/*/ui.json`: two strings; `content/lang/*/glossary.json`: `term_wind_shift` alternatives (10.5).
- `tests/exercisePilots.test.ts`, `tests/exercises.test.ts`, `tests/physicsTruths10.test.ts` (10.6). `scripts/shots-m103.mjs` (new), registered in `shots.mjs` (import and `liveGroups`), and `m103` added to the live groups listed in `tests/ciPlan.test.ts` (around line 342) in the same order.
- `docs/EXERCISES.md`: the two exercises in the catalogue, in the format of the others. `docs/CODE_MAP.md`: `feelIt` in the exercises row if the row names the definition's fields.

### 10.2 Data (`content/exercises/exercises.json`)

Add `"feelIt": ["term_close_hauled", "term_close_reach", "term_beam_reach", "term_broad_reach", "term_run"]` to `points-of-sail`. Insert `weather-helm` after `gybing` (end of the *sailing* group) and `wind-shift` after `gusts` (in the *wind* group):

```json
{
  "id": "weather-helm",
  "group": "sailing",
  "ropes": "easy",
  "crew": false,
  "sections": ["ropes", "helm", "sails", "autopilot", "conditions", "learn"],
  "start": "?wd=0&ws=10&hdg=310&ms=15&js=20&ap=hdg&sea=flat&clk=202606011000",
  "feelIt": ["term_weather_helm", "term_heel"],
  "wind": { "points": [
    { "at": "10:00", "fromDeg": 0, "kn": 10, "gustPct": 0 },
    { "at": "10:01", "fromDeg": 0, "kn": 10, "gustPct": 0 },
    { "at": "10:02", "fromDeg": 0, "kn": 20, "gustPct": 0 },
    { "at": "11:00", "fromDeg": 0, "kn": 20, "gustPct": 0 }
  ] },
  "steps": [
    { "id": "feel-the-helm", "opens": "autopilot", "holdS": 5, "speedUp": 4,
      "check": { "localHour": [10.0333, 24], "heelDeg": [25, 40] }, "bar": [] },
    { "id": "ease-main", "opens": "ropes", "holdS": 5,
      "check": { "heelDeg": [10, 22], "controls": { "ctl_mainsheet": [25, 100] } },
      "bar": ["control:ctl_mainsheet"] }
  ],
  "mistakes": [
    { "id": "round-up", "serious": false, "on": { "alert": "roundUp" } }
  ]
},
{
  "id": "wind-shift",
  "group": "wind",
  "ropes": "easy",
  "crew": false,
  "sections": ["ropes", "sails", "autopilot", "conditions", "learn"],
  "start": "?wd=0&ws=12&hdg=315&ms=12&js=0&ap=hdg&sea=flat&clk=202606011000",
  "feelIt": ["term_wind_shift"],
  "wind": { "points": [
    { "at": "10:00", "fromDeg": 0, "kn": 12, "gustPct": 0 },
    { "at": "10:02", "fromDeg": 0, "kn": 12, "gustPct": 0 },
    { "at": "10:03", "fromDeg": -20, "kn": 12, "gustPct": 0 },
    { "at": "10:09", "fromDeg": -20, "kn": 12, "gustPct": 0 },
    { "at": "10:10", "fromDeg": 20, "kn": 12, "gustPct": 0 },
    { "at": "11:00", "fromDeg": 20, "kn": 12, "gustPct": 0 }
  ] },
  "steps": [
    { "id": "header-comes", "opens": "autopilot", "holdS": 0, "speedUp": 8,
      "check": { "localHour": [10.05, 24] }, "bar": [] },
    { "id": "bear-away", "opens": "autopilot", "holdS": 5,
      "check": { "twaDeg": [40, 52], "tack": "starboard", "mainTrim": ["good"], "headingDeg": { "to": 295, "within": 5 } },
      "bar": ["autopilot:turn"] },
    { "id": "lift-comes", "opens": "autopilot", "holdS": 0, "speedUp": 16,
      "check": { "localHour": [10.1667, 24] }, "bar": [] },
    { "id": "head-up", "opens": "autopilot", "holdS": 5,
      "check": { "twaDeg": [40, 52], "tack": "starboard", "mainTrim": ["good"], "headingDeg": { "to": 335, "within": 5 } },
      "bar": ["autopilot:turn"] }
  ],
  "mistakes": [
    { "id": "missed-header", "serious": false, "steps": ["bear-away"],
      "on": { "condition": { "localHour": [10.15, 24] }, "forS": 1 } }
  ]
}
```

What the learner sees first (both exercises open in setup, paused, as every exercise does): **weather-helm**: 10 knots from the north, close-hauled-to-close-reach on starboard tack (TWA 50°), sails Good, heel about 12°, the learner's own camera (an exercise's start never sets the camera: `cam` is one of the viewer's keys, `VIEWER_KEYS` in `urlState.ts`), the autopilot holding 310°; **wind-shift**: 12 knots from the north, close-hauled on starboard tack (TWA 45°), sails Good, about 6.4 knots, the default camera, the autopilot holding 315°.

The timetables and why (prototype on the real model, 2026-11-16, wind changed in one go, 20–60 s settled):

Wind directions in a timetable are written in −180…180 (`windProblems` in `tests/exercises.test.ts`): 340° is `-20`. Each change between two points is a one-minute ramp (`scriptMean` interpolates).

- *wind-shift*: wind 0° → 340° (a 20° header): TWA 45° → **26.1°**, main *luffing*, 6.39 → **2.93** kn. Autopilot −20° (to 295°): TWA **45.1°**, both sails *good*, 5.34 kn. Wind → 20° (a 40° lift from 340°): TWA **85.4°**, both sails *stalled*. Autopilot +40° (to 335°): TWA **44.4°**, both *good*, 6.28 kn. The header is held 10:03–10:09, six app minutes at ×1 for step *bear-away*; the waits run at ×8 and ×16 (values of `windModes.timeScales`).
- *weather-helm*: at 10 kn the autopilot holds **3.8°** of rudder at **11.9°** heel; at 20 kn **18.0°** of rudder at **31.1°** heel (the heading drifts 5° towards the wind while the autopilot catches up); main sheet eased to 30 %: **5.6°** of rudder at **18.0°** heel (the main reads *luffing* from 30 % on; the step checks heel and the sheet, not the main's trim).

`missed-header`: if the learner has not borne away by 10:09 the lift starts and step *bear-away* cannot pass any more; the mistake tells them to tap *Back to the start of the step* (the run's waypoint restores the state, clock and wind included).

### 10.3 Pilots (`src/app/exercisePilots.ts`)

```ts
/** Header and lift: bear away 20° in the header, head up 40° in the lift. */
export function windShiftPilot(): Pilot {
  const once = onceMaker();
  return (s) => {
    switch (s.exercise?.step) {
      case 1: return once(s, 't', (x) => turns(x, 2, -10));
      case 3: return once(s, 't', (x) => turns(x, 4, 10));
      default: return s;
    }
  };
}
/** Weather helm: wait for the wind, then ease the main sheet to 30 %. */
export function weatherHelmPilot(): Pilot {
  return (s) => (s.exercise?.step === 1 ? ctl(s, { ctl_mainsheet: 30 }) : s);
}
```

In `pilotFor`: `case 'wind-shift': return ropes === 'easy' ? windShiftPilot() : null;` and the same for `weather-helm` (both exercises are Easy ropes; follow how `pilotFor` treats the other sailing exercises' `ropes` argument).

### 10.4 Learn: the Feel it button (`learnTab.ts`)

In an entry's view, a block of its own, `div.learn-show-me.learn-feel-it-block` with `data-hide-in-exercise` (as the Show it working block has: no Feel it while a run is going), inserted into `nodes` directly after the Show it working block (every tour term has one); the `learn-spotlight-hint` splice then anchors on this block, so the hint stays after the last button. The block holds, if `feelItFor(entry.id)` returns `def` and `pilotFor(def.id, 'easy', def.ropes) !== null`, show

- a button `learn.feelIt` (`data-testid="learn-feel-it"`, the same class as `learn-show-me`),
- under it a hint `learn.feelItHint` with `{title}` = the exercise's title in the current language (`exerciseText(def.id, lang).title`), class `hint`.

A tap: `loadExercise(store, def.id, def.ropes)` (`exercisePanel.ts`), then `store.dispatch({ type: 'exercise', command: { demo: 'watch' } })`, then `store.dispatch({ type: 'exercise', command: 'start' })`, then the same `lowerSheet()` the Show it working button calls (on a phone the sheet goes down so the boat shows). This is exactly what the exercise card's *Watch it* button does after the list has loaded the exercise, so Watch mode's stops, *Let me try it* and the debrief work unchanged.

### 10.5 Strings

`ui.json` (English final; de / no / ru AI drafts):

| Key | English |
|---|---|
| `learn.feelIt` | Feel it |
| `learn.feelItHint` | The app sails “{title}” for you and stops after each step. |

`glossary.json`, `term_wind_shift.alternatives`: add `{ "term": "header", "note": "a shift from further ahead: bear away" }` and `{ "term": "lift", "note": "a shift from further aft: you can head up" }` in English; the same two as AI drafts in de / no / ru. (`term_wind_shift.what` already explains both header and lift; only the alternatives are added.)

The two exercises' entries go at the same positions in all four `content/lang/*/exercises.json` files as in `content/exercises/exercises.json` (`weather-helm` after `gybing`, `wind-shift` after `gusts`), with the steps and mistakes in the data's order (the en / ru key-order test). Those files have one `$status`, not a status per entry. The Russian drafts follow the language test's Latin-word rule (`content/lang/latin-words.json`).

`exercises.json` (English final; de / no / ru AI drafts with the same keys):

```json
"weather-helm": {
  "title": "Weather helm",
  "summary": "Feel the wheel pull as she heels, and ease the main to make it light again.",
  "see": "You are sailing upwind on starboard tack in 10 knots, the autopilot steering. Choose the Helm camera (the camera chip) to watch the wheel.",
  "happening": "When she heels, the boat wants to turn into the wind. To hold her course the wheel must stay turned away from the wind: that pull is weather helm. More wind, more heel, more helm.",
  "action": "Watch the wheel as the wind rises to 20 knots, then ease the main sheet until she heels less than about 20°.",
  "mistake": "Keeping the main sheet tight: she heels past 30°, the rudder works hard and she can turn into the wind by herself (a round-up).",
  "done": "Easing the main took the heel off and the wheel came back towards the middle. A light helm means the boat is balanced; a heavy one means too much heel.",
  "steps": {
    "feel-the-helm": {
      "goal": "Watch the wheel as the wind rises.",
      "how": "The wind goes from 10 to 20 knots in a minute (time runs ×4). She heels to about 30° and the autopilot turns the wheel further and further away from the wind to hold the course."
    },
    "ease-main": {
      "goal": "Ease the main until she heels less than 22°.",
      "how": "In Lines, ease Main sheet to about 30 %. The heel drops to about 18° and the wheel comes back to only a few degrees."
    }
  },
  "mistakes": {
    "round-up": {
      "name": "a round-up",
      "what": "She turned into the wind by herself (a round-up).",
      "why": "Too much heel with a tight main: the rudder could not hold her against the weather helm.",
      "fix": "Ease the main sheet: with less heel the wheel holds her again."
    }
  }
},
"wind-shift": {
  "title": "Header and lift",
  "summary": "The wind turns: bear away when it heads you, head up when it lifts you.",
  "see": "You are close-hauled on starboard tack in 12 knots, the autopilot holding 315°. Watch the sails and the wind arrow on the mini-map.",
  "happening": "The wind's direction changes a little all the time. A shift from further ahead is a header: on the same course the sails start to flap and she slows down. A shift from further aft is a lift: the sails are now too tight, and you can head up.",
  "action": "In the header, turn the autopilot 20° away from the wind. In the lift, turn it 40° towards the wind.",
  "mistake": "Holding the old course in a header: she sails in the no-go zone, the sails flap and she nearly stops.",
  "done": "You followed the wind: away from it in the header, towards it in the lift. Sailors upwind steer by the wind, not by the compass.",
  "steps": {
    "header-comes": {
      "goal": "Wait for the wind to shift.",
      "how": "Time runs ×8. The wind turns 20° towards the bow: the main starts to flap and the speed falls."
    },
    "bear-away": {
      "goal": "Bear away 20° to fill the sails again.",
      "how": "In Autopilot, tap −10 twice. She turns to 295° and the sails read Good again."
    },
    "lift-comes": {
      "goal": "Wait for the wind to shift back further.",
      "how": "Time runs ×16. The wind turns 40° towards the stern: the sails are now too tight for the wind."
    },
    "head-up": {
      "goal": "Head up 40° to sail close-hauled again.",
      "how": "In Autopilot, tap +10 four times. She turns to 335°: higher than where you started, thanks to the lift."
    }
  },
  "mistakes": {
    "missed-header": {
      "name": "missing the header",
      "what": "The wind shifted back before you bore away.",
      "why": "This step only passes while the header blows.",
      "fix": "Tap Back to the start of the step and bear away as soon as the main flaps."
    }
  }
}
```

(The step texts name buttons by their M100 English labels; check each against `ui.json` after M100 and use the exact label, e.g. the autopilot's −10 / +10 buttons' visible text.)

### 10.6 Tests

- `tests/exercises.test.ts`: **M103 feelIt** — every `feelIt` id is a registry `term` (`kind: "term"`); no id appears in two exercises; every exercise with `feelIt` has a pilot (`pilotFor(id, 'easy', def.ropes) !== null`). `feelItFor('term_wind_shift')?.id === 'wind-shift'`, `feelItFor('term_run')?.id === 'points-of-sail'`, `feelItFor('part_boom') === undefined`. The existing schema, text and order tests cover the two new exercises (update their counts if they count).
- `tests/exercisePilots.test.ts`: add both to `SAILING_LIMITS`. The list serves the good run and the "Show me from each step" test, so measure each step's app seconds both ways and use `ceil(1.2 × the larger + 3)` (the file's rule); write the measured values in a comment as M97 did. These are app seconds at ×1: `reduce` does not apply `speedUp` (only the UI loop in `app.ts` does), so *header-comes* measures about 180 s and *lift-comes* about 360 s. *wind-shift*'s good run lasts more than 600 app seconds, so raise the `t < 600` cap of `goodRunStates` (and of `realisticRunStates`, if it shares the loop) to `t < 900`. Both good runs end `done` with no mistake.
- `tests/physicsTruths10.test.ts` (rule tests named after their ids):
  - In `tests/physicsTruths10.test.ts` define `started` locally (the same two lines as in `exercisePilots.test.ts`, with `{ options: { pauseOnMistake: false } }` as the PT-25 test does, so a mistake does not stop the run), and read the hour with `localHourOf(s.clock.utcMs)`, which the file already imports.
  - **PT-21 header (wind-shift):** start the exercise and step it with **no pilot** (the autopilot holds 315°) until the local hour reaches 10.0833 (10:05, two minutes after the header's ramp ends): `|twaDeg|` in **[20, 32]** (prototype 26.1, settled) and the main's trim is `luffing`.
  - **PT-29 weather helm (weather-helm):** start the exercise and step it with no pilot until 10:04 (local hour 10.0667, two minutes after the wind reached 20 kn): `|controls.ctl_rudder|` ≥ **12** (prototype 18.0) and `|heelDeg|` in **[25, 40]** (prototype 31.1). Then set `ctl_mainsheet` to 30 and step 60 app seconds more: `|ctl_rudder|` ≤ **9** (prototype 5.6) and `|heelDeg|` ≤ **22** (prototype 18.0).
  - If the good run of *weather-helm* raises a mistake (the `round-up` alert at 31° of heel), lower the 20-knot points of its timetable to 18 (**tunable**), re-measure, and report the before and after values in 10.10. Never widen a band.

### 10.7 Browser checks (`scripts/shots-m103.mjs`, group `m103`, test clock)

A new group (a new screen path: Learn → Watch). Budget **90 s**: two pages, one watched step each, on the test clock. `openPage(viewport, label, query, { testClock: true })`.

1. **Phone (390 × 844), touch:** `?learn=term_wind_shift&m=learn` (the Learn entry open). `learn-feel-it` is visible and the hint names "Header and lift". Tap it (a touch tap: `locator.tap()` on a page with `hasTouch`). Then: the link has `m=exercise` and `ex=wind-shift` (`waitForLink`); the step card shows *header-comes*'s goal "Wait for the wind to shift". Then poll with `page.waitForTimeout(1000)`, at most 40 times, until Watch mode's stop button `exercise-demo-next` (*Next step*, `stepCard.ts`) is visible (during the stop `step-card-text` shows the finished step's *how*); tap it; within 5 more polls `step-card-text` contains *bear-away*'s goal "Bear away 20°" (a demo prefix in `step-card-demo` may show first).
2. **Computer (1280 × 800):** `?learn=term_weather_helm&m=learn`: click `learn-feel-it`: the link has `ex=weather-helm`, and the step card shows *feel-the-helm*'s goal "Watch the wheel as the wind rises."
3. **No button where there is no tour:** `?learn=part_boom&m=learn`: `learn-feel-it` count 0.

Record `"m103"` in `.github/ci-times.json`.

### 10.8 Older checks and tests this milestone changes

The exercise list grows from 17 to 19. Run `grep -n -E "17|seventeen|exercise-item-" scripts/shots-m*.mjs tests/*.ts README.md docs/EXERCISES.md | grep -i -E "exerc|item|list|seventeen"` and update every count of the list (the planning grep found no hard-coded 17 in `tests/`; the README says "Seventeen exercises today" and lists them by group: make it "Nineteen", add "weather helm" to the *Sailing* list and "a header and a lift (wind shifts)" to *Wind and weather*). Groups that open the exercise list or Watch mode: `SHOTS_ONLY=m103,m66,m81,m82,m93,m96,m20`.

`CI groups: m66, m81, m82, m93, m96, m20`

### 10.9 Done when / not in this milestone

**Done when:** `npm run check` passes; the groups in 10.8 pass; the PT-21 and PT-29 tests of 10.6 pass in the stated bands; EXERCISES.md lists the two exercises; the PR's checklist has full links.

**Not in this milestone:** lee helm (needs a model change: the rudder force from sail balance, not only from heel); tours for parts that do not move (Where is it? already does that); a tour player separate from Watch mode; more tours (each new one is an exercise with `feelIt`, added later in a small PR).

### 10.10 Decided in the M103 PR

(The builder writes here.)

## 11. Owner's answers (planning chat, 2026-11-16: "Accept all, for 5 find better keys")

The issues behind this plan, as the planning session found them: #220 is the merged Norwegian PR, not an issue; #228 (telltales) was already closed because telltales exist (PT-23).

1. **#225 (simple in / out per line)** is the Easy mode, which is the default: each line has − / + and no winch; only 2 of the 17 exercises use Realistic ropes. It is answered by M100 (Trim / Ease words) and M101 (keys) and closed with them.
2. **#231 (cunningham)**: the reference boat has none (in-mast furling main); closed with that reason, and M100 adds a Learn entry saying why. **#232** (traveller, spinnaker) stays open as the reminder for the later "other yacht setups" phase (ROADMAP, *Later*).
3. **#224 and #227** are bugs, fixed with `/bug`, before or alongside this phase.
4. **Other languages:** M100 changes English only; the review documents are regenerated so sailors review the new English with the old translations. **#233** (the sailor reviews) is the owner's task once M100 is merged.
5. **Keys** (owner: the first proposal put the mainsheet on A, which is a thruster key): ← → steer (the autopilot's course when it is on), **W / S** mainsheet trim / ease, **R / F** jib sheet trim / ease, **P** autopilot, **H** or **?** the key list. A, D, J, L stay the thruster keys; in an exercise the step bar keeps its keys (section 8).
6. **Word tours** are short exercises played in Watch mode, started by *Feel it* in Learn: points of sail, header and lift, weather helm (section 10). Lee helm is left out: the model has no lee helm (recommended; merging accepts it).
7. **The bottom-left "wind compass"** in the sailor's comment is the mini-map, so M102 draws the points of sail there (recommended; merging accepts it).
