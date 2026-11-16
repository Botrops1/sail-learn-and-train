# Sailor feedback: sailor words, keys, point of sail, word tours (M100–M103)

A small phase made from the first public feedback (Reddit, r/sailing, November 2026), planned with `/plan issues 220 and from 223 to 233` on 2026-11-16. The owner's answers are in section 10.

## 0. How to use this spec

- Four milestones, built in order, **one PR each**, titled `M<N>: <name>` (the names are in section 6), each saying `Closes #<n>` for the issues its section names.
- Read sections 0–5, then **only your milestone's section** (7 for M100, 8 for M101, 9 for M102, 11 for M103). The general rules are in CLAUDE.md. Names (files, functions, store actions, `data-testid`s, string keys, ids) are required. Numbers are final unless marked **tunable**.
- **Text is data.** The English strings in this spec are final. German, Norwegian and Russian strings are AI drafts the builder writes (CLAUDE.md, "Russian text"; the same rule holds for every language but English): every new key exists in `content/lang/{de,no,ru}/*.json` with `textStatus: "draft"` where the file has that field, and the builder runs `npm run review-doc -- de`, `-- no` and `-- ru` after changing them.
- **No sailing physics changes** in M100–M102: `src/model` gets no new formula. M103 adds exercise data only (scripted wind, autopilot settings) and one model-free field to the exercise definition type.
- If a test band fails: check section 4 ("common mistakes") first, then tune only keys marked **tunable**, and report the before and after values in the PR. Never widen a band.
- Keep the signatures written here. Decisions taken while building go under the milestone's "Decided in the M<N> PR" subsection, marked "recommended; merging accepts it".
- Every earlier phase keeps working: old links open the same picture, and every earlier unit test and browser check stays green, except the ones a milestone's "Older checks" subsection names.

## 1. Goal and scope

**Goal.** Act on what sailors told us after the launch: talk like sailors (lines, trim, ease), let a computer user sail from the keyboard, show the point of sail where the eye already is (the wind dial), and let a learner "feel" a word with a short guided scene.

**In scope:** issues #223 (sailor words), #225 (simple in / out, already the Easy mode: covered by M100's words and M101's keys), #226 (keyboard), #229 (point of sail on the wind dial), #230 (word tours), and a "not on this boat" Learn entry for the cunningham (#231).

**Out of scope (owner, section 10):**

- **#224** (the exercise card covers the boat on a phone) and **#227** (winch turns, a held sheet that would not come in): bugs, fixed with `/bug`, not here.
- **#231 / #232** (cunningham, traveller, spinnaker): the reference boat has none of them (in-mast furling main, German mainsheet without a traveller, no gennaker rigged). They wait for the "other yacht setups" item in the ROADMAP's *Later* row. M100 adds only the Learn entry that says why.
- **#233** (sailor review of the language packs): the owner's task, started after M100 merges.
- Changing words in German, Norwegian or Russian (section 7.4), remappable keys, keys on a phone, lee helm in the model (section 11.9).

## 2. Conventions

- **Words (from M100 on):** in English, the boat's ropes are **lines**; pulling a sheet in is **trim**, letting any line out is **ease**. The registry keeps its ids and kinds (`rope_*`, `kind: "rope"`, `group: "ropes"`), the code keeps its names (`ropeId`, `ropesMode`, `RopeState`), and URL keys keep their names and values. Only text a person reads changes.
- **Angles:** the true wind angle `twaDeg` is signed, −180…180, + = wind over starboard, as everywhere in the model. The point of sail is worked out from `|twaDeg|` by the existing `pointOfSail` (`src/model/pointsOfSail.ts`).
- **Keys:** `KeyboardEvent.code` (the physical key, so the keys sit in the same place on a German or Norwegian keyboard), except `?`, which is read from `event.key`.

## 3. Shared helpers

Only M101 and M103 share anything:

| Name | File | Signature | Behaviour |
|---|---|---|---|
| `isTypingTarget` | `src/ui/dom.ts` (new export) | `(target: EventTarget \| null): boolean` | True for an `INPUT`, `SELECT`, `TEXTAREA` or content-editable element. Moved out of `exerciseBar.ts` (`typing`) and `thrusterPanel.ts` so the three keyboard handlers read the same rule. M101 adds it; M103 does not use it. |

## 4. Common mistakes

- **M100: changing an id, a URL value or a code name** because it contains "rope". Only the text in `content/lang/en/*.json` (and English text written in `src/ui/*.ts`, if any) changes.
- **M100: a check that matched the old text.** Run the grep in 7.8 before pushing; a missed one fails first in the nightly run.
- **M101: a key that fires while the learner types** (the glossary search, a number field), or that steals the arrows from a focused slider, tab row or menu. Section 8.3 lists where the global keys are off.
- **M101: two handlers for one key.** A, D, J and L stay the thruster keys; during an exercise the exercise bar keeps ←, →, −, +, =, space, Enter and 1–4.
- **M102: the arrow on the wrong side.** The point-of-sail arrow follows `twaDeg`'s sign (wind over starboard: arrow on the starboard, right-hand side of the dial), like the true-wind needle already does.
- **M103: a tour that moves the learner's own setup.** A tour is an exercise run: it starts from its own `start` link state and, on leaving, the app does what it does after any exercise.

## 5. Architecture

- No new state field in M100 or M102. M101 adds one setting, `settings.keys: boolean` (default `true`), so a learner who does not want keys can turn them off in Settings (section 8.4). M103 adds one optional exercise field, `tour: { term: PartId }`, and the Learn button that starts it.
- No change to the step order.
- New files: M101 `src/ui/keyboard.ts`, `src/ui/keyHelp.ts`, `scripts/shots-m101.mjs`; M102 `scripts/shots-m102.mjs` (or the checks join a group, section 9.8); M103 `scripts/shots-m103.mjs`.

## 6. Milestones overview

| Milestone | What the owner sees | Issues | Rules tested | Depends on | Independent review |
|---|---|---|---|---|---|
| **M100: Sailor words** | English says "line(s)" for the boat's ropes and "Trim / Ease" for sheets; a Learn entry "Cunningham: not on this boat" | #223, #225 (words), #231 (Learn entry) | none | — | not needed |
| **M101: Keyboard** | On a computer the boat answers keys at once: arrows steer, W / S the mainsheet, R / F the jib sheet, P the autopilot, H or ? the key list | #226, #225 (keys) | none | M100 (the key list uses its words) | not needed |
| **M102: Point of sail on the wind dial** | The wind dial names the point of sail under the wind speed, with a marker on its ring | #229 | PT-21, PT-22 (bands only, existing) | — | not needed |
| **M103: Word tours** | Three Learn entries get "Feel it": a short scene plays on the boat (wind shift: header and lift; weather helm; points of sail) | #230 | PT-21, PT-22, PT-25 (existing) | M100 | **required** |

