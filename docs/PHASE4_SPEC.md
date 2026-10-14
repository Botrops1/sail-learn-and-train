# Phase 4 specification: learning layer

Status: **planned**, owner's answers recorded (planning chat and planning PR #53, 2026-10-14) · Last updated: 2026-10-14

Read [`ROADMAP.md`](ROADMAP.md) first, then this file. Phases 1–3 are done; [`PHASE1_SPEC.md`](PHASE1_SPEC.md), [`PHASE2_SPEC.md`](PHASE2_SPEC.md) and [`PHASE3_SPEC.md`](PHASE3_SPEC.md) still describe everything Phase 4 builds on (layout, panel and tabs, info card, registry ids, URL state, browser checks). This file says only what Phase 4 adds or changes. Phase 4 changes no physics.

## 0. How to use this spec (for the coding agent)

- Do **one milestone** (sections 6–10), on the branch your session gives you, in one PR titled `M<N>: <name>`. Read sections 0–5 first every time; they apply to all milestones. Then read only your milestone's section.
- Build order inside a milestone: data → model + tests → store/URL → UI → browser checks → docs. Milestones are built in order (M20 → M24); each needs the ones before it merged.
- **Text is data.** Every English text in a JSON block of this spec is final: copy it exactly (same words, same punctuation, typographic quotes “ ” and the apostrophe ’ as written). Do not improve, shorten or extend it. If a text looks wrong to you as a sailing fact, copy it anyway and say so in the PR.
- **Russian text is yours to write** (draft, `textStatus: "draft"`), following the rules in 3.3. Russian **names and alternative terms are given** in each milestone: copy them exactly.
- **Numbers.** The "Show me" links were run against the real model (2026-10-14, the prototype); the test bands in brackets come from that run. If a band fails, first check that the link is copied exactly and that the scene is stepped as the test says (3.5). **Never widen a band** and never change a link to make a test pass; report it in the PR.
- **Signatures.** Function names and signatures are given so that milestones fit together. Keep them. Add private helpers freely.
- **Write back.** If you decide something this spec leaves open, write it into your milestone's section under "Decided in the M<N> PR".
- **Phases 1–3 must keep working.** All existing tests stay green. An existing test may only be changed where your milestone section says so, and only in the way it says.
- Sailing terms in English UI strings get a short explanation in brackets the first time they appear on a screen (CLAUDE.md). The glossary texts below already follow this.

## 1. Goal

Every part, rope and sailing word in the app can be opened and learned, in the learner's own language.

The idea Phase 4 must teach:

> **Every thing on a yacht has a name, often more than one, and a job.** Tap it to learn what it is called (and what else sailors call it), what it does, how it works on this boat, the typical mistakes and their fixes, and how sure the app is of each fact. Find any word with search. Read the whole app in English or in Russian.

## 2. Scope

### In scope (Phase 4)

1. **Entries and the Learn tab** (M20): a new fourth tab, **Learn**, shows one entry at a time: name, alternative names in the same language, the words printed on the boat, a one-liner, "What it does", "On this boat", "Typical mistakes" (each with its fix), a **Show me** button (opens a ready scene; the phone's Back button returns), "Show on the boat", "Try it in the Ropes tab", "See also" links, and "How sure we are" (fact status and sources). The info card gets a **More** button that opens the entry. Text for ropes, sails and sail parts.
2. **Glossary and search** (M21): the Learn tab's list of every entry in groups, with search over names, alternative names and the words on the boat in the current language. Text for the hull, rig, deck gear, cockpit gear and the things around the boat.
3. **Sailing words** (M22): the existing 25 sailing words get full text; 33 new words the app uses but did not explain (directions, wind, manoeuvres, waves); "Show me" scenes for them.
4. **Russian app** (M23): a **Language** setting in the View tab switches the whole app (buttons, hints, 3D labels, Learn entries) to Russian. One language at a time, never mixed (owner). Adding a language later = adding one folder of JSON files (owner).
5. **Sign-off** (M24): a completeness check of every language, a review document for a Russian-speaking sailor, accessibility, docs.

### Out of scope

- Pictures or drawings per entry, sound, quizzes, guided exercises (Phase 6). Languages other than English and Russian (Phase 7; the architecture is ready).
- Tappable sailing words inside the panel hints (owner: hints stay plain; only links inside the Learn entries).
- Showing both languages at once (owner: one language at a time; alternatives are always in the same language).
- Decimal commas: numbers keep the dot in every language (owner: `12.5 уз`).
- New physics, new boat parts in 3D, new camera presets, searching inside the explanation texts.
- Phase 3 leftovers (section 12): the direction the waves turn the bow is a separate `/bug` fix, not part of any Phase 4 milestone.

If something here looks necessary, stop and ask in the PR.

## 3. Conventions and shared helpers

### 3.1 Conventions

| Topic | Convention |
|---|---|
| Language code | Lower-case ISO 639-1 (`en`, `ru`), the name of the language's folder `content/lang/<code>/`. `en` is the **source language**: every fact is written in English first and every other language translates it. |
| A language | One folder `content/lang/<code>/` with exactly two files: `ui.json` (every UI string, flat keys as today's `en.json`) and `glossary.json` (the Learn entries). A language is **available** when both files exist. Nothing else is needed to add a language (owner). |
| One language at a time | The app shows one language. There is **no runtime fallback** from a missing glossary field to another language: a missing field hides its section (tests make sure nothing is missing). `t()` keeps a fallback to the English string only as a safety net that tests make unreachable. |
| Alternative names | `alternatives` lists other names **in the same language** for the same thing (owner), each with an optional `note` in that language (where and by whom it is used, where it comes from). They never repeat the entry's `name` or a label printed on the boat. Other languages' words never appear as alternatives. |
| Words printed on the boat | The labels of the clutches in `content/boat/hanse508.json` (`boatLabelsFor(id)` in `src/model/boatLabels.ts`; decided in the M20 PR: the registry's old `boatLabel` copies were removed, owner on PR #54), shown in every language exactly as printed (they are English on this boat), in quotes, under "Written on the boat". They are facts about the boat, not translations. |
| Fact status | `status` in the registry, one per entry (language-neutral): `draft`, `source-checked`, `photo-confirmed`, `sailor-reviewed` (the values of `statusValues`). |
| Text status | `textStatus` per entry per language: `draft` (AI-written, not checked by a sailor in that language) or `sailor-reviewed`. Shown only for languages other than `en`. |
| Show-me links | `showMe` in the registry: a query string starting with `?`, **canonical**: every `key=value` in it comes back unchanged from `serializeUrlState(parseUrlState(query))` (so `bs=6.0`, not `bs=6`; no default-only keys like `seed=1`). It never contains `learn`, `detail`, `debug` or `lang`; those are kept from the current state. |
| Quotes | English text uses “ ” for labels and names; Russian uses « ». |
| Numbers | A dot as the decimal mark in every language; Russian units `уз`, `м`, `кН`, `°`, `%`, `с`, `об/мин`. |
| Ids | Every entry is a registry id (`content/registry/parts.json`). New ids (M22) go into the registry first, `status` as given. |

### 3.2 Data formats

**Registry entry** (`content/registry/parts.json`, `schemaVersion: 2` from M20). Language-neutral facts only:

```json
{
  "id": "rope_vang",
  "kind": "rope",
  "phase": 1,
  "group": "ropes",
  "status": "photo-confirmed",
  "sources": ["photo:clutch-bank-b", "photo:vang", "sailingworld:vang"],
  "controls": ["rope_vang"],
  "related": ["part_vang_strut", "part_boom", "rope_topping_lift", "term_twist"],
  "showMe": "?wd=90&ws=20&ms=40&vg=100&cam=side-port&sel=rope_vang&held=1&sea=flat"
}
```

| Key | Type | Meaning |
|---|---|---|
| `id`, `kind`, `phase`, `sources` | as today | unchanged (`boatLabel` was removed in M20: the words on the boat come from the boat file, 3.1) |
| `status` | string | the fact status (was `status.en`; `status.ru` moves to the Russian glossary as `textStatus`) |
| `group` | string | the Learn list's group (added to every entry in M21, 7.2) |
| `controls` | string[] (optional, default `[]`) | registry ids whose Ropes-tab control works this thing; each must satisfy `entryFor(id) !== undefined` (`src/model/panelEntries.ts`) |
| `related` | string[] (optional, default `[]`) | "See also" ids, in this order; each a registry id other than the entry's own |
| `showMe` | string (optional) | the canonical query of the "Show me" scene |

Removed from the registry in M20: `names`, `aliases`, `short` (they move to the glossaries) and the per-language `status` object.

**Glossary file** (`content/lang/<code>/glossary.json`):

```json
{
  "$comment": "Learn entries in one language (PHASE4_SPEC 3.2). Keys are registry ids. English is the source language; other languages translate it.",
  "language": "en",
  "entries": {
    "rope_vang": {
      "name": "Vang",
      "alternatives": [{ "term": "kicker", "note": "British" }, { "term": "boom vang" }],
      "short": "Pulls the boom down, which keeps the mainsail flatter and stops its top twisting open.",
      "what": "…",
      "onThisBoat": "…",
      "mistakes": [{ "mistake": "…", "fix": "…" }],
      "showMe": "…",
      "textStatus": "draft"
    }
  }
}
```

| Key | Required | Meaning |
|---|---|---|
| `name` | always | the name in this language |
| `alternatives` | always (may be `[]`) | `{ term, note? }` |
| `textStatus` | always | `draft` or `sailor-reviewed` |
| `short` | `en`: always. Others: from the milestone that completes the entry | the one-liner (info card, Ropes strip, Learn) |
| `what` | from the entry's milestone | 1–3 sentences |
| `onThisBoat` | where the spec gives it | 1–3 sentences about the reference boat |
| `mistakes` | where the spec gives them (same count in every language) | `{ mistake, fix }` |
| `showMe` | exactly when the registry entry has `showMe` | what the scene shows and what to try |

An entry is **complete** in a language when it has `short`, `what`, and every optional field that the English entry has (`onThisBoat`, `mistakes` with the same count, `showMe`).

**UI strings** (`content/lang/<code>/ui.json`): flat `"key": "text"` as today's `content/i18n/en.json`, plus `"language.name"` (the language's own name: `English`, `Русский`). M20 moves `content/i18n/en.json` there (`git mv`), M23 adds `ru`.

### 3.3 Writing rules for Russian (M20–M23)

- Use the Russian **names exactly as given** for every registry id, also when the thing is mentioned in another entry's text or in a UI string (one term for one thing everywhere). The names of the M20–M22 entries are the term list.
- Polite plural imperative for actions (`Потравите шкот`, `Выберите`), short sentences, plain words; the first time a sailing word appears in an entry or on a screen, add three or four plain words in brackets, as the English does.
- Translate the meaning of the English text sentence by sentence; add nothing, leave nothing out. Keep numbers and units (3.1). Quote boat labels as printed, in « » (`«Main sheet»`).
- No plural agreement with a number placeholder: write strings so the noun does not follow `{n}` (`Оборотов на барабане: {turns}`, not `{turns} оборота`).
- Every Russian text stays `textStatus: "draft"` until a sailor reviews it (M24 makes the review document). Never call it verified.

### 3.4 Shared helpers

`src/model/glossary.ts` (new in M20; M21 adds search, 7.3):

```ts
export type FactStatus = 'draft' | 'source-checked' | 'photo-confirmed' | 'sailor-reviewed';
export type TextStatus = 'draft' | 'sailor-reviewed';
export interface Alternative { term: string; note?: string }
export interface Mistake { mistake: string; fix: string }
export interface GlossaryText {
  name: string;
  alternatives: Alternative[];
  short?: string;
  what?: string;
  onThisBoat?: string;
  mistakes?: Mistake[];
  showMe?: string;
  textStatus: TextStatus;
}
export interface GlossaryFile { language: string; entries: Record<string, GlossaryText> }

/** Every content/lang/<code>/glossary.json, by code (the folder name). Found with import.meta.glob, so a new folder needs no code. */
export const GLOSSARIES: Readonly<Record<string, GlossaryFile>>;
export const SOURCE_LANGUAGE = 'en';
/** The text of one entry in one language; undefined if that language or entry is missing (no fallback). */
export function glossaryText(id: string, language: string = SOURCE_LANGUAGE): GlossaryText | undefined;

/** Everything the Learn tab shows for an entry: registry facts plus the text in one language. */
export interface LearnEntry {
  id: string;
  kind: string;
  status: FactStatus;
  sources: string[];
  boatLabels: string[];
  controls: string[];
  related: string[];
  showMeQuery: string | null;
  text: GlossaryText;
}
export function learnEntry(id: string, language: string = SOURCE_LANGUAGE): LearnEntry | undefined;
```

Loading: `import.meta.glob<GlossaryFile>('../../content/lang/*/glossary.json', { eager: true, import: 'default' })`; the code is the path segment after `lang/` (`/lang\/([^/]+)\/glossary\.json$/`). The same pattern loads every `ui.json` in `src/model/languages.ts` (M23), which `src/ui/i18n.ts` imports.

`partInfo(id, language = 'en')` (`src/model/registry.ts`) keeps its signature and result; from M20 it takes `name` and `short` from `glossaryText(id, language)` (`''` when missing) and `boatLabels` from `boatLabelsFor(id)` (the boat file, 3.1).

### 3.5 Show-me scenes in tests

A scene test: boat speed in knots is `mpsToKn(state.boat.speedMps)` (`src/model/angles.ts`). `let state = parseUrlState(entry.showMe, 'low')`, then `state = reduce(state, { type: 'step', dt: 1 / 60 })` 300 times (5 s), unless the test says otherwise; read the values named. The round-trip test: for every `[key, value]` of `new URLSearchParams(query)`, `new URLSearchParams(serializeUrlState(parseUrlState(query, 'low'))).get(key) === value`.

### 3.6 Sources

Phase 4 adds no rules to `PHYSICS_TRUTHS.md`. Entry facts cite registry `sources` (keys of `sourceKeys`); each milestone adds the keys it uses, exactly as given. Phase 4 entries also cite pages that earlier phases read and summarised in `PHYSICS_TRUTHS.md` (its sources [1], [19]–[25], [27]–[32]: *Point of sail*, *Forces on sails*, *Jibe*, *Weather helm*, *Hull speed*, *Wind wave*, *Wind fetch*, *Significant wave height*, *Ship motions*, *Seakeeping*); their `source-checked` statuses rest on those summaries. Pages read on 2026-10-14 for this plan: the Wikipedia pages *Broach (nautical)*, *Beaufort scale*, *Wind direction*, *Bora (wind)*, *Sirocco*, *Mistral (wind)* (section "Maestral … in the Adriatic"), *Points of the compass*, *Glossary of nautical terms (A–L)*.

**Russian terms** (checked on 2026-10-14, after the M20–M22 entries were written; the results are in 9.2.1 and 9.2.2). A Russian *name* counts as supported when one of these sources uses it for the same thing. The *texts* stay `textStatus: "draft"` (3.3) whatever the sources say; only a sailor's review changes that.

| Key | Source | Use |
|---|---|---|
| [R1] | А. Б. Стекольщиков, А. О. Маслов, «Основы управления крейсерской парусной яхтой для начинающих яхтсменов», часть I (тихий, лёгкий, слабый ветер), 2-е изд., Москва, А.Б.С. Морская академия, 2019 | the usage of a Russian yacht school (names of sheets, halyards, furling, points of sail, manoeuvres) |
| [R2] | the same authors, часть II (умеренный, свежий и сильный ветер), 2019; recommended as a textbook by the qualification commission of the Russian Sailing Federation | as [R1]; reefing, broaching |
| [R3] | А. Б. Стекольщиков, часть III (сильный, крепкий и штормовой ветер), 2019; the same recommendation | as [R2]; the engine lever, storm sails |
| [R4] | Russian Wikipedia articles, read 2026-10-14: *Шкот*, *Фал*, *Гик*, *Топенант*, *Ахтерштаг*, *Штаг*, *Ванты*, *Краспица*, *Стаксель*, *Грот (парус)*, *Геннакер*, *Генуя (парус)*, *Устройство паруса*, *Бегучий такелаж*, *Стоячий такелаж*, *Курс относительно ветра* (with *Галс*, *Левентик*, *Бейдевинд*, *Галфвинд*, *Фордевинд*), *Оверштаг*, *Брочинг*, *Вымпельный ветер*, *Истинный ветер*, *Качка*, *Крен*, *Румб*, *Штирборт*, *Шкала Бофорта*, *Бора (ветер)*, *Сирокко*, *Узел (единица измерения)*, *Брашпиль*, *Леер*, *Судовой руль*, *Авторулевой*, *Лебёдка*, *Срыв потока* | definitions, spellings, Dutch origins (бакборт, штирборт, шкот, фал, гик, топенант, штаг, ахтерштаг, оверштаг, фордевинд and others) |
| [R5] | Russian Wikipedia, *Морские термины* (a glossary), read 2026-10-14 | шлаг, ходовой конец, травить, выбирать, траверз, перо руля, взятие рифов, кокпит, «ветер заходит — становится круче; ветер отходит — становится полнее» |
| [R6] | К. И. Самойлов, «Морской словарь» (on dic.academic.ru) | завал-тали, раковина |
| [R7] | Ushakov's and Ozhegov's dictionaries (on dic.academic.ru) | «рифление» means only making a surface rough or ribbed, with no sailing meaning |
| [R8] | Russian Wiktionary, *норд*, *ост*, *зюйд*, *вест*, read 2026-10-14 | each «происходит от нидерл.» noord, oost, zuid, west: the Dutch notes of `term_north` … `term_west` are confirmed |

The three textbooks [R1]–[R3] were given by the owner as PDFs. They are copyrighted and are **not in the repo**: cite them by key and page, never copy their text. Not reachable from the cloud environment (bot filters or connection resets): gramota.ru, itboat.com, yachtall.com, ru.ruwiki.ru, parusniy-sport.org (where the textbooks come from). Words that no source above uses (for example «твист», «колдунчики», «мёртвая зона», «стопор» for a rope clutch) are common yacht-club usage but stay unconfirmed; the sailor's review (M24) decides them.

### 3.7 Common mistakes (check these first when a test fails)

- **Mixing languages:** a Russian screen showing an English name because a lookup fell back to `en`. There is no fallback for glossary fields (3.1).
- **Alternatives copied from the wrong language:** the old registry `aliases.en` go to `en`, `aliases.ru` to `ru`, never both into one file.
- **Selecting a part jumps to the Ropes tab:** the panel switches to Ropes when a rope is selected (PHASE1_SPEC); while the Learn tab is open it must not (6.5).
- **A Show-me link that is not canonical:** `bs=6` comes back as `bs=6.0`; `seed=1` is not written. Copy the links exactly.
- **History:** Show me must push the current link **before** loading the scene, or Back leaves the page.
- **Hidden text:** an entry section with an empty or missing field must be hidden, not shown with a heading and no text.
- `import.meta.glob` paths are relative to the file that calls it.

## 4. Architecture

### 4.1 New state

```ts
// src/app/store.ts (M20)
interface AppState {
  /** The entry the Learn tab shows (a registry id), or null for the list (M21) or the empty page (M20). In the link as `learn`. */
  learn: string | null;
}
// Action (M20): open an entry in the Learn tab, or go back to the list with null. Unknown ids are refused (same state).
| { type: 'openLearn'; id: string | null }
// InitialOverrides gains: learn?: string | null

// src/model/settings.ts (M23)
interface Settings {
  /** The language of the whole app (a folder of content/lang). Changing it reloads the page. In the link as `lang` when not 'en'. */
  language: string;
}
```

### 4.2 URL keys

| Key | Milestone | Values | Default | Written |
|---|---|---|---|---|
| `learn` | M20 | a registry id | none (`null`) | right after `sel`, when not null |
| `lang` | M23 | an available language code | `en` | right after `detail`, when not `en` |

Unknown values are ignored (as for every key). Old links have neither key and open as before: English, no entry open.

### 4.3 Files by milestone

| Milestone | Model / app | UI / content / scripts |
|---|---|---|
| M20 | `src/model/glossary.ts` (new); `registry.ts`, `store.ts`, `urlState.ts`, `urlSync.ts` (changed) | `content/lang/en/ui.json` (moved), `content/lang/en/glossary.json`, `content/lang/ru/glossary.json` (new); `content/registry/parts.json` v2; `src/ui/learnTab.ts` (new); `panel.ts`, `infoCard.ts`, `ropesTab.ts`, `realisticPanel.ts`, `i18n.ts`, `app.ts`, `style.css` (changed); `scripts/shots-m20.mjs` |
| M21 | `glossary.ts` (search) | `learnTab.ts` (list and search), glossary texts, `scripts/shots-m21.mjs` |
| M22 | — | registry (33 new ids), glossary texts, `scripts/shots-m22.mjs` |
| M23 | `settings.ts`, `urlState.ts`, `urlSync.ts`, `store.ts` | `content/lang/ru/ui.json` (new), `i18n.ts`, `panel.ts` (Language), UI callers of `partInfo`, `enginePanel.ts` (number grouping), `scripts/shots-m23.mjs` |
| M24 | — | `scripts/review-doc.mjs`, `docs/review/ru.md` (generated), `scripts/shots-m24.mjs`, docs |

Tests go in `tests/` (flat): `tests/glossary.test.ts` (M20, extended by M21–M24), `tests/learn.test.ts` (M20: store and URL), `tests/search.test.ts` (M21), `tests/languages.test.ts` (M23).

## 5. Milestones overview

Each milestone is one PR, small enough to check on a phone in 15 minutes. **Independent review: required** means the owner runs `/review <PR>` (new Code session, Opus, high effort) as soon as the PR opens, before testing it on the phone.

| Milestone | Section | What the owner sees | Rules tested | Depends on | Independent review |
|---|---|---|---|---|---|
| M20 | 6 | A Learn tab; "More" on the info card opens the full entry of a rope or sail, with "Show me" (Back returns) | — (show-me scene tests) | Phase 3 | **required** (new shared state, URL key, history and Back, registry format change, teaching text) |
| M21 | 7 | Every entry in groups and a search box; texts for hull, rig, deck and cockpit gear | — | M20 | **required** (55 teaching texts in two languages, search) |
| M22 | 8 | Sailing words, directions and winds with full text and "Show me" | — | M21 | **required** (58 teaching texts in two languages, new ids) |
| M23 | 9 | Language setting: the whole app in Russian | — | M22 | **required** (new URL key, settings, every UI string, page reload) |
| M24 | 10 | Review document for a sailor, accessibility, docs, sign-off | — | M23 | not needed (checks and docs) |

---
## 6. M20: Entries and the Learn tab

**Independent review: required** (new shared state and URL key, the browser history (Back), a changed registry format used everywhere, and teaching text).

### 6.1 Files

New: `src/model/glossary.ts`, `src/ui/learnTab.ts`, `content/lang/en/glossary.json`, `content/lang/ru/glossary.json`, `tests/glossary.test.ts`, `tests/learn.test.ts`, `scripts/shots-m20.mjs`.
Moved: `content/i18n/en.json` → `content/lang/en/ui.json` (`git mv`; update its imports in `src/ui/i18n.ts` and `tests/i18n.test.ts`).
Changed: `content/registry/parts.json` (v2, 6.2), `src/model/registry.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/app/urlSync.ts`, `src/app/app.ts`, `src/ui/panel.ts`, `src/ui/infoCard.ts`, `src/ui/ropesTab.ts`, `src/ui/realisticPanel.ts`, `src/style.css`, `tests/registry.test.ts`, `tests/i18n.test.ts`, `scripts/shots.mjs`, `.github/workflows/ci.yml` (a Phase 4 part, 6.9), `docs/CODE_MAP.md`, `CLAUDE.md` (the "IDs" bullet only, 6.11).

### 6.2 Data: the registry becomes version 2

Do this with a one-off script (not committed) over `content/registry/parts.json`, then check the diff:

1. `schemaVersion: 2`. Replace `$comment` with: `ID registry for everything the user can see, touch or learn about. Every 3D object (mesh.userData.partId) and every rope points to one id here. UI controls have no entries of their own: a rope control's data-part-id is its rope's id (decision 2026-10-08). Since schemaVersion 2 (PHASE4_SPEC 3.2) the registry holds language-neutral facts only; names and texts are in content/lang/<code>/glossary.json.`
2. For every entry: `status` becomes the old `status.en` (a string). Remove `names`, `aliases`, `short`. Keep `id`, `kind`, `phase`, `boatLabel`, `sources` and the key order `id, kind, phase, boatLabel, status, sources` (decided in the M20 PR, owner on PR #54: `boatLabel` was then removed too; the same words come from the boat file, 3.1) (then `controls`, `related`, `showMe` where given). Keep one entry per line, as now.
3. Add `controls`, `related` and `showMe` to the 18 M20 entries exactly as in this table (other entries get theirs in M21 and M22):

| id | controls | related | showMe |
|---|---|---|---|
| `rope_mainsheet` | `rope_mainsheet` | `part_boom`, `fit_mainsheet_boom_blocks`, `fit_mainsheet_deck_blocks`, `term_ease`, `term_gybe` | `?wd=90&ws=12&ms=60&cam=top&sel=rope_mainsheet&held=1&sea=flat` |
| `rope_jib_sheet` | `rope_jib_sheet` | `sail_jib`, `fit_self_tacking_car`, `fit_self_tacking_track`, `rope_jib_furling_line` | `?wd=90&ws=12&js=100&cam=bow&sel=rope_jib_sheet&held=1&sea=flat` |
| `rope_vang` | `rope_vang` | `part_vang_strut`, `part_boom`, `rope_topping_lift`, `term_twist` | `?wd=90&ws=20&ms=40&vg=100&cam=side-port&sel=rope_vang&held=1&sea=flat` |
| `rope_topping_lift` | `rope_topping_lift` | `rope_vang`, `part_boom`, `part_vang_strut` | `?wd=0&ws=0&vg=0&tl=0&cam=side-port&sel=rope_topping_lift&held=1&sea=flat` |
| `rope_outhaul` | `rope_outhaul` | `sailpart_clew`, `rope_main_furling_line`, `part_boom` | `?wd=90&ws=12&ms=40&mf=100&cam=top&sel=rope_outhaul&held=1&sea=flat` |
| `rope_main_furling_line` | `rope_main_furling_line` | `sail_main`, `rope_outhaul`, `part_main_furling_gearbox`, `term_reef` | `?wd=90&ws=12&ms=40&mf=30&cam=top&sel=rope_main_furling_line&held=1&sea=flat` |
| `rope_jib_furling_line` | `rope_jib_furling_line` | `part_jib_furler`, `clutch_jib_roll`, `rope_jib_sheet` | `?wd=90&ws=12&js=100&jf=40&cam=bow&sel=rope_jib_furling_line&held=1&sea=flat` |
| `rope_main_halyard` | `rope_main_halyard` | `term_halyard`, `sailpart_head` | — |
| `rope_spi_halyard` | `rope_spi_halyard` | `sail_gennaker`, `term_halyard` | — |
| `sail_main` | `rope_mainsheet`, `rope_vang`, `rope_main_furling_line` | `part_boom`, `part_mast`, `term_luffing`, `term_telltale` | `?wd=60&ws=12&ms=25&js=50&cam=side-starboard&sel=sail_main&sea=flat` |
| `sail_jib` | `rope_jib_sheet`, `rope_jib_furling_line` | `fit_self_tacking_track`, `fit_self_tacking_car`, `part_jib_furler`, `part_forestay` | `?wd=30&ws=12&ms=10&js=0&cam=bow&sel=sail_jib&held=1&sea=flat` |
| `sail_gennaker` | — | `rope_spi_halyard` | — |
| `sailpart_head` | — | `rope_main_halyard`, `sailpart_tack`, `sailpart_clew` | — |
| `sailpart_tack` | — | `sailpart_head`, `sailpart_clew`, `part_gooseneck` | — |
| `sailpart_clew` | — | `rope_outhaul`, `rope_mainsheet`, `rope_jib_sheet` | — |
| `sailpart_luff` | — | `term_luffing`, `sailpart_leech` | — |
| `sailpart_leech` | — | `term_twist`, `sailpart_luff` | — |
| `sailpart_foot` | — | `rope_outhaul`, `part_boom` | — |

("—": leave the key out.)

### 6.3 Data: the glossaries

**`content/lang/en/glossary.json`**: `$comment` as in 3.2, `"language": "en"`, and one entry for **every** registry id, in registry order:
- For the 18 M20 ids: exactly the entries in the block below.
- For every other id (filled in M21 and M22): `name` = the old `names.en`; `alternatives` = the old `aliases.en`, each as `{ "term": "<alias>" }`, leaving out any alias equal (ignoring case) to the name or to a `boatLabel`; `short` = the old `short.en`; `textStatus: "draft"`.

**`content/lang/ru/glossary.json`**: `"language": "ru"`, one entry for every registry id, in registry order:
- For every id: `name` and `alternatives` as given in 6.3.2 for the M20 ids, otherwise `name` = the old `names.ru` and `alternatives` = the old `aliases.ru` as `{ "term" }` (same leaving-out rule); `textStatus: "draft"`.
- For the 18 M20 ids also `short`, `what`, and every field the English entry has (`onThisBoat`, `mistakes` with the same count, `showMe`): your translation of the English (3.3).
- Other ids have no `short` yet in Russian (M21, M22 add it; the info card is English-only until M23 anyway).

#### 6.3.1 English entries (copy exactly)

```json
"rope_mainsheet": {
  "name": "Mainsheet",
  "alternatives": [],
  "short": "The rope that lets the boom and mainsail swing out, or pulls them back in.",
  "what": "Easing (letting out) the mainsheet lets the wind push the boom further out; hauling it in pulls the boom back towards the middle. The rope only limits how far the boom can go: with the wind from ahead, easing it just makes it slack. Near the middle a little rope moves the boom a lot; far out, a lot of rope moves it only a little.",
  "onThisBoat": "A German mainsheet: one rope with two ends, one at each side of the cockpit (the clutches say “Main sheet” and “MAIN SHEET”). It runs through three blocks under the boom and two spring-mounted blocks at the back of the coachroof. There is no traveller (a sliding car for the lower blocks).",
  "mistakes": [
    { "mistake": "Easing it far more than the wind needs.", "fix": "The mainsail flaps along its front edge. Haul in until the flapping just stops." },
    { "mistake": "Keeping it hauled hard in a gust.", "fix": "The boat heels a lot and turns into the wind by herself. Ease the mainsheet to let the gust out." },
    { "mistake": "Opening its clutch under load with the rope not on a winch.", "fix": "The rope runs out fast and the boom flies out. Put the rope on the winch first, then open the clutch." }
  ],
  "showMe": "Wind from the side and the mainsheet eased to 60 %: the boom has swung well out. Tap “Mainsheet” below and haul it in: the boom comes back towards the middle.",
  "textStatus": "draft"
},
"rope_jib_sheet": {
  "name": "Jib sheet",
  "alternatives": [{ "term": "headsail sheet" }],
  "short": "The rope that sets how far the jib can swing out.",
  "what": "Hauling the jib sheet in pulls the jib’s back corner towards the boat; easing it lets the wind push the jib out. On a self-tacking jib, easing mostly lets the top of the sail twist open rather than swinging the whole sail out.",
  "onThisBoat": "One sheet runs from the jib’s back corner to a car on a short track in front of the mast, with a 2:1 purchase (a pulley system that halves the pull), then down the mast and aft to the starboard clutches. The clutch says “Genoa sheet”, but the sail is a jib. Fully eased, the jib only reaches about 30° out.",
  "mistakes": [
    { "mistake": "Easing it on a reach and expecting the jib to swing far out.", "fix": "A self-tacking jib cannot go far out; easing more only twists its top open. Ease until its telltales stream, no further." },
    { "mistake": "Furling the jib with the sheet still tight.", "fix": "The jib stops rolling up. Ease the jib sheet first, then pull the furling line." },
    { "mistake": "Hauling it hard in with the wind from the side.", "fix": "The jib stalls: the telltales on its far side droop. Ease until they stream." }
  ],
  "showMe": "Wind from the side and the jib sheet fully eased: the jib is only about 30° out, but its top has twisted open. Tap “Jib sheet” below and haul it in to see the jib flatten.",
  "textStatus": "draft"
},
"rope_vang": {
  "name": "Vang",
  "alternatives": [{ "term": "kicker", "note": "British" }, { "term": "kicking strap", "note": "British" }, { "term": "boom vang" }],
  "short": "Pulls the boom down, which keeps the mainsail flatter and stops its top twisting open.",
  "what": "The vang runs from low on the mast to the underside of the boom. Hauled, it holds the boom down, so the sail stays flatter with less twist. Eased, the boom end rises and the top of the sail twists open. Once the mainsheet is eased well out, the vang, not the sheet, decides how high the boom sits.",
  "onThisBoat": "A rigid vang (a strut with a gas spring inside) with a rope tackle. The spring holds the boom up, so the boom does not drop when the vang is eased; the rope only pulls it down. Its clutch is on the port side, labelled “Vang”.",
  "mistakes": [
    { "mistake": "Relying on the mainsheet to hold the boom down on a reach.", "fix": "Far out, the sheet pulls sideways, not down, and the boom lifts. Haul the vang to hold it down." },
    { "mistake": "Hauling the vang and the topping lift tight at the same time.", "fix": "They pull against each other (both ropes turn red in the app). Ease the topping lift once the sail is set." }
  ],
  "showMe": "Wind 20 kn from the side, vang eased all the way: the boom end has lifted and the top of the mainsail twists open. Tap “Vang” below and haul it in: the boom comes down and the sail flattens.",
  "textStatus": "draft"
},
"rope_topping_lift": {
  "name": "Topping lift",
  "alternatives": [],
  "short": "A line from the top of the mast to the end of the boom that can hold the boom up.",
  "what": "The topping lift carries the boom when the sail is not holding it up, for example with the sail rolled away. Hauled tight while sailing, it fights the vang and spoils the sail’s shape, so it is eased once the sail is set.",
  "onThisBoat": "Labelled “Boom lift” on the port clutches. The rigid vang’s spring already holds the boom up, so on this boat the topping lift only carries the boom when it is hauled higher than the spring holds it.",
  "mistakes": [
    { "mistake": "Leaving it tight while sailing with the vang hauled.", "fix": "The two ropes fight (both turn red in the app). Ease the topping lift." }
  ],
  "showMe": "No wind, the topping lift and the vang both hauled tight: they pull against each other and both ropes turn red. Tap “Topping lift” below and ease it to end the fight.",
  "textStatus": "draft"
},
"rope_outhaul": {
  "name": "Outhaul",
  "alternatives": [{ "term": "clew outhaul" }],
  "short": "Pulls the mainsail’s back bottom corner (the clew) out along the boom.",
  "what": "The outhaul pulls the clew towards the end of the boom. With in-mast furling it also pulls the sail out of the mast as it unrolls: it is hauled together with the furling line’s “out” tail, and eased when the sail is rolled in.",
  "onThisBoat": "Labelled “Main outhaul” on the port clutches. In the app’s Easy mode it moves together with “Mainsail out”. How the rope runs inside the boom is not yet confirmed on the real boat.",
  "mistakes": [
    { "mistake": "Rolling the main in without easing the outhaul.", "fix": "The outhaul holds the clew out and the sail cannot roll in. Ease the outhaul as you pull the “in” furling line." },
    { "mistake": "Unrolling the main without hauling the outhaul.", "fix": "The sail comes out baggy and does not reach the end of the boom. Haul the outhaul together with the “out” line." }
  ],
  "showMe": "Mainsail fully out: the outhaul holds its back corner at the end of the boom. Tap “Outhaul” below and roll the main in a little: the corner slides towards the mast.",
  "textStatus": "draft"
},
"rope_main_furling_line": {
  "name": "Main furling line",
  "alternatives": [{ "term": "furling line" }],
  "short": "Rolls the mainsail into the mast, or lets it out.",
  "what": "In-mast furling rolls the mainsail up inside the mast like a blind. The furling line has two tails: hauling the “in” tail rolls the sail in; hauling the “out” tail, together with the outhaul, rolls it out while the “in” tail is eased. Rolling the sail partly in makes it smaller in strong wind (instead of reefing).",
  "onThisBoat": "Two clutches on the starboard side, both labelled “Main furling”: the left one rolls the main in, the right one rolls it out. If the line slips, the main can be rolled in by hand with the winch handle in the gearbox at the foot of the mast (about 40 turns).",
  "mistakes": [
    { "mistake": "Hauling the “in” tail without easing the “out” tail and the outhaul.", "fix": "Nothing moves, or the line jams. Ease the other two first." },
    { "mistake": "Rolling the main in while it is full of wind.", "fix": "The load is heavy and the line can slip. Ease the mainsheet, or turn closer to the wind, so the sail is not pulling, then roll it in." }
  ],
  "showMe": "Mainsail 30 % out: most of it is rolled inside the mast. Tap “Main furling line” below and set “Mainsail out” to 100 % to unroll it.",
  "textStatus": "draft"
},
"rope_jib_furling_line": {
  "name": "Jib furling line",
  "alternatives": [{ "term": "furling line" }],
  "short": "Rolls the jib up round the forestay, or lets it unroll.",
  "what": "Pulling the line turns the drum at the bottom of the forestay and rolls the jib up around it. Easing it while pulling the sheet lets the jib unroll. A partly rolled jib is smaller, which helps in strong wind.",
  "onThisBoat": "A Furlex furler at the bow. The line runs back along the port side deck through a single clutch labelled “JIB ROLL” to the port winch. The jib sheet must be eased for the jib to roll up.",
  "mistakes": [
    { "mistake": "Pulling the furling line with the jib sheet tight.", "fix": "The jib stops rolling. Ease the jib sheet, then keep furling." },
    { "mistake": "Letting the line run free when unrolling in strong wind.", "fix": "The jib flies out and flaps hard. Keep a turn of the line on the winch and let it out under control." },
    { "mistake": "Leaving the jib flapping for a long time in strong wind.", "fix": "The sail wears and can tear. Roll it in or sheet it in quickly." }
  ],
  "showMe": "Jib 40 % out with its sheet eased: the rest is rolled round the forestay. Tap “Jib furling line” below and change “Jib out” to roll it in or out.",
  "textStatus": "draft"
},
"rope_main_halyard": {
  "name": "Main halyard",
  "alternatives": [],
  "short": "Holds the top of the mainsail up the mast.",
  "what": "A halyard hoists a sail. The main halyard holds the mainsail’s top corner (the head) at the top of the mast.",
  "onThisBoat": "With in-mast furling the sail stays hoisted inside the mast; it is rolled in and out instead of being lowered. The halyard’s clutch on the starboard side (“Main halyard”) normally stays shut. The app does not adjust it.",
  "mistakes": [
    { "mistake": "Opening the main halyard clutch by mistake (it sits next to the sheets).", "fix": "The sail’s head can slide down inside the mast. Leave this clutch shut, and read the label before opening any clutch." }
  ],
  "textStatus": "draft"
},
"rope_spi_halyard": {
  "name": "Gennaker halyard",
  "alternatives": [{ "term": "spinnaker halyard" }],
  "short": "The halyard for a gennaker; on this boat it is kept parked.",
  "what": "A halyard for hoisting a gennaker (a large, light sail for wind from behind) to the top of the mast.",
  "onThisBoat": "The boat has no gennaker on board, but the halyard is fitted; its clutch on the port side is labelled “SPI HALYARD”. The app draws its top end parked down the front of the mast (where it is really kept is not yet known).",
  "mistakes": [
    { "mistake": "Leaving the parked halyard loose.", "fix": "It slaps against the mast and can wrap round the forestay or the jib. Keep it parked and tight." }
  ],
  "textStatus": "draft"
},
"sail_main": {
  "name": "Mainsail",
  "alternatives": [{ "term": "main" }],
  "short": "The sail behind the mast, held by the mast and the boom.",
  "what": "The mainsail is set on the mast and the boom. The mainsheet sets its angle to the wind, the vang its twist, and the outhaul pulls it out along the boom. Trimmed right, it drives the boat; pulled in too far it stalls, let out too far it flaps.",
  "onThisBoat": "61 m², rolled into the mast (in-mast furling), with no battens (stiffening strips). In strong wind it is made smaller by rolling part of it into the mast.",
  "mistakes": [
    { "mistake": "Pulling it in too far for the wind angle.", "fix": "It stalls: less drive and more heel, and the telltales on its far side droop. Ease until they stream." },
    { "mistake": "Letting it out too far.", "fix": "Its front edge flaps. Haul in until the flapping just stops." },
    { "mistake": "Keeping all of it out as the wind gets strong.", "fix": "The boat heels too much and turns into the wind by herself. Roll part of it in." }
  ],
  "showMe": "Sailing 60° off the wind with the mainsail trimmed well: its telltales stream and it drives the boat at about 7 kn. Tap “Mainsheet” below and ease it fully: the front edge starts to flap and she slows down.",
  "textStatus": "draft"
},
"sail_jib": {
  "name": "Self-tacking jib",
  "alternatives": [{ "term": "jib" }, { "term": "headsail" }],
  "short": "The front sail; it changes sides by itself when the boat tacks.",
  "what": "The jib is set on the forestay in front of the mast. Its sheet runs to a car on a track across the deck, and the car slides to the other side by itself when the bow turns through the wind, so tacking needs no sheet work.",
  "onThisBoat": "51.5 m², on a Furlex roller furler at the bow. The track is short and straight, so the jib cannot be eased far out: fully eased it reaches about 30°. The clutch says “Genoa sheet”, but the sail is a jib, smaller than a genoa and not overlapping the mast.",
  "mistakes": [
    { "mistake": "Keeping all of the jib out in strong wind.", "fix": "She heels too much and turns into the wind. Roll part of the main in first, then part of the jib if needed." },
    { "mistake": "Furling the jib with the sheet tight.", "fix": "Ease the sheet; then the jib rolls up." }
  ],
  "showMe": "Wind 30° from starboard: the jib’s car sits at the port end of its track. In the Wind tab, turn the wind to the other side of the bow: the car slides across by itself.",
  "textStatus": "draft"
},
"sail_gennaker": {
  "name": "Gennaker",
  "alternatives": [{ "term": "asymmetric spinnaker" }],
  "short": "A large, light sail for wind from behind; not on board this boat.",
  "what": "A gennaker is a big, light, curved sail flown from the bow and the top of the mast when the wind comes from behind the side. It is set and taken down for each use.",
  "onThisBoat": "Not on the reference boat; only its halyard (“SPI HALYARD”) is fitted. The manual gives 200 m² for the optional gennaker. The app does not show the sail.",
  "textStatus": "draft"
},
"sailpart_head": {
  "name": "Head",
  "alternatives": [],
  "short": "The top corner of a sail.",
  "what": "The head is the corner the halyard pulls up.",
  "onThisBoat": "The mainsail’s head stays at the top of the mast, inside the furling slot; the jib’s head is at the top of the forestay.",
  "textStatus": "draft"
},
"sailpart_tack": {
  "name": "Tack (corner)",
  "alternatives": [],
  "short": "The front bottom corner of a sail.",
  "what": "The tack is fixed at the front bottom of the sail: the mainsail’s at the gooseneck (where the boom meets the mast), the jib’s at the furler drum on the bow. “Tack” also means turning the bow through the wind, and the side the wind comes from: see “Tacking” and “Starboard tack”.",
  "textStatus": "draft"
},
"sailpart_clew": {
  "name": "Clew",
  "alternatives": [],
  "short": "The back bottom corner of a sail, where the sheet pulls.",
  "what": "The sheet pulls on the clew and so sets the sail’s angle to the wind. On the mainsail the outhaul also pulls the clew along the boom.",
  "onThisBoat": "When the mainsail is rolled in, its clew moves along the boom to the mast; when the jib is rolled in, its clew moves forward round the forestay.",
  "textStatus": "draft"
},
"sailpart_luff": {
  "name": "Luff",
  "alternatives": [{ "term": "leading edge" }],
  "short": "The front edge of a sail.",
  "what": "The wind meets the sail at the luff. When a sail is let out too far, the luff starts to flap first: that is “luffing”.",
  "onThisBoat": "The mainsail’s luff runs up inside the mast’s furling slot; the jib’s runs along the forestay.",
  "textStatus": "draft"
},
"sailpart_leech": {
  "name": "Leech",
  "alternatives": [{ "term": "trailing edge" }],
  "short": "The back edge of a sail.",
  "what": "The wind leaves the sail at the leech. Twist is how much the top of the leech falls away to the side; the vang controls it on the mainsail, the sheet on the jib.",
  "textStatus": "draft"
},
"sailpart_foot": {
  "name": "Foot",
  "alternatives": [],
  "short": "The bottom edge of a sail.",
  "what": "The foot runs from the tack to the clew. The mainsail’s foot runs along the boom, and the outhaul stretches it.",
  "textStatus": "draft"
}
```

#### 6.3.2 Russian names and alternatives (copy exactly)

(Built as given. M23 changes some of these names after checking them against sources: see 9.2.1.)

| id | `name` | `alternatives` (term — note) |
|---|---|---|
| `rope_mainsheet` | гика-шкот | грота-шкот; шкот грота |
| `rope_jib_sheet` | стаксель-шкот | шкот стакселя |
| `rope_vang` | оттяжка гика | кикер — от английского kicker |
| `rope_topping_lift` | топенант гика | топенант |
| `rope_outhaul` | оттяжка шкотового угла | аутхол — от английского outhaul |
| `rope_main_furling_line` | закруточный конец грота | линь закрутки грота |
| `rope_jib_furling_line` | закруточный конец стакселя | линь закрутки стакселя |
| `rope_main_halyard` | грота-фал | фал грота |
| `rope_spi_halyard` | фал генакера | спинакер-фал |
| `sail_main` | грот | — |
| `sail_jib` | самоповоротный стаксель | стаксель |
| `sail_gennaker` | генакер | геннакер — другое написание |
| `sailpart_head` | фаловый угол | — |
| `sailpart_tack` | галсовый угол | — |
| `sailpart_clew` | шкотовый угол | — |
| `sailpart_luff` | передняя шкаторина | — |
| `sailpart_leech` | задняя шкаторина | — |
| `sailpart_foot` | нижняя шкаторина | — |

("—" in the alternatives column: `[]`. Alternatives are separated by `;`; inside one, the text after ` — ` is its `note`, and a term without ` — ` has no `note`. Notes never contain `;`.)

### 6.4 Model

- `src/model/glossary.ts` as in 3.4. `learnEntry(id, language)`: `undefined` if the id is not in the registry or `glossaryText(id, language)` is undefined; otherwise the registry's `kind`, `status`, `sources`, `boatLabelsFor(id)`, `controls ?? []`, `related ?? []`, `showMe ?? null`, and the text.
- `src/model/registry.ts`: `partInfo(id, language = 'en')` as in 3.4. Imports: `glossary.ts` imports `content/registry/parts.json` directly (not `registry.ts`); only `registry.ts` imports `glossary.ts`, so there is no import cycle. `KNOWN_IDS`, `isRegisteredPartId` and `requirePartId` unchanged.
- **Source links** (pure, in `glossary.ts`, used by the Learn tab):

```ts
export type SourceLink =
  | { kind: 'url'; href: string; text: string }       // value starts with "http": text = decodeURI(the URL without "https://" and "www.")
  | { kind: 'photo'; href: string; name: string }     // value starts with "docs/reference/photos/": href = `${repoUrl}/blob/main/${value}`, name = file name without ".jpg"
  | { kind: 'brochure' }                              // key "brochure"
  | { kind: 'owner' };                                // key "owner"
export function sourceLink(key: string, repoUrl: string): SourceLink | undefined; // undefined for a key not in sourceKeys
```

### 6.5 Store and URL

- `AppState.learn` and the `openLearn` action as in 4.1. `reduce`: `openLearn` with an id that is not a registry id → the same state; with the id already open → the same state; else `{ ...state, learn: action.id }`. `initialState`: `learn: overrides.learn ?? null`. `reset` gives `null` (it builds from `initialState`). `load` takes the loaded state's `learn` as it is.
- URL `learn` (4.2): `parseUrlState` reads it like `sel` (`isRegisteredPartId`) and passes it to `initialState`; `serializeUrlState` writes it right after `sel`. `urlSync.ts`: the early return also requires `state.learn === previous.learn`.
- **Show me** (`src/app/urlSync.ts`):

```ts
/**
 * Opens a "Show me" scene (PHASE4_SPEC 6.5): the current link goes into the browser history first,
 * so the phone's Back button returns to it. Detail, debug and the open entry are kept.
 */
export function openScene(store: Store, query: string): void;
```

  1. `state = store.getState()`; `here = pathname + serializeUrlState(state) + hash`.
  2. `history.replaceState(null, '', here)` (writes the debounced link now), then `history.pushState(null, '', here)`.
  3. `next = parseUrlState(query, state.settings.detail)`; dispatch `{ type: 'load', state: { ...next, settings: { ...next.settings, detail, debug, step, legend, labels }, learn: state.learn } }` with those five settings taken from the current state (the viewer's own preferences; everything else comes from the scene). The URL sync then writes the scene's link over the pushed entry.
- **Opening an entry does not push history**: `openLearn` only replaces the link (as every other change does), so the phone's Back button leaves the Learn tab only through Show me's entries. This is intended.
- The practice-scenario button in `realisticPanel.ts` (its `load` of a parsed link) also keeps `learn: state.learn`.
- **Back** (`startUrlSync`): add a `popstate` listener: `next = parseUrlState(location.search, current detail)`; dispatch `load` with `settings.detail` and `settings.debug` kept from the current state (the other settings come from the link, which holds them), and set the sync's `pending` to `location.search` first so the debounced writer does not push the old link back.

### 6.6 UI

**Tabs** (`panel.ts`): `TAB_IDS = ['ropes', 'wind', 'view', 'learn']`, label `tab.learn` "Learn". The pane gets `createLearnTab(store, (tab) => select(tab))`.
- The rule "selecting a part that has a Ropes-tab entry opens the Ropes tab" now applies only while the active tab is **not** `learn` (the Learn tab stays open when a part is shown on the boat from it).
- When `state.learn` changes to a non-null id, `select('learn')` (also when it is already active: this scrolls the panel to the top). At start, after `select('ropes')`: if `state.learn` is not null, `select('learn')`.

**Learn tab** (`src/ui/learnTab.ts`): `export function createLearnTab(store: Store, showTab: (tab: TabId) => void): HTMLElement[]`. It re-renders when `state.learn` changes. Language: `'en'` in M20 (M23 passes the current one). Top to bottom, phone first, every button at least 44 px high, built from existing classes (`.field`, `.hint`, `.action-button`) plus new `learn-*` classes in `style.css`:

- `state.learn === null`: one paragraph `learn.empty` (`data-testid="learn-empty"`).
- An entry (`data-testid="learn-entry"`, `data-part-id` = id):
  1. Name, `h2` (`learn-name`), with the kind under it in small text (`learn-kind`, from `learn.kind.<kind>`).
  2. Alternatives (`learn-alternatives`, hidden when there are none): `learn.alternatives` with `{terms}` = the terms joined by `, `; a term with a note is written `learn.alternativeWithNote` (`{term} ({note})`).
  3. Written on the boat (`learn-boat-label`, hidden when none): `learn.boatLabel` with `{labels}` = the labels in quotes joined by `, `, as the info card writes them (“Vang”).
  4. The one-liner `short` (`learn-short`), in bold (hidden when missing).
  5. `h3` `learn.what` ("What it does"; for kind `term`: `learn.whatTerm` "What it means") and `what` (`learn-what`), only if present (in M20 only the 18 M20 entries have it; the others show their name, the one-liner and the rest).
  6. `h3` `learn.onThisBoat` and `onThisBoat` (`learn-on-this-boat`), only if present.
  7. `h3` `learn.mistakes` and a list (`learn-mistakes`), each item two lines: `learn.mistake` + the mistake, `learn.fix` + the fix. Only if present.
  8. **Show me** (only if `showMeQuery`): the text `showMe` (`learn-show-me-text`), then the button `learn.showMe` (`learn-show-me`) → `openScene(store, query)`; then the status line (`learn-status`, `aria-live="polite"`) says `learn.showMeDone`.
  9. **Show on the boat** (every kind except `term`, and not for the ids in `NOT_DRAWN`): button `learn.showOnBoat` (`learn-show-on-boat`) → `select` this id (the part lights up; the Learn tab stays). `glossary.ts` exports `NOT_DRAWN: ReadonlySet<string>` with exactly the ids that no mesh or rope carries: `sail_gennaker`, `sailpart_head`, `sailpart_tack`, `sailpart_clew`, `sailpart_luff`, `sailpart_leech`, `sailpart_foot`, `fit_clutch`, `fit_winch`, `fit_compass`, `fit_anchor_windlass`, `fit_bow_roller`, `fit_mooring_cleat`.
  10. **Try it in the Ropes tab** (only if `controls` is not empty): label `learn.tryIt`, then one button per control (`learn-try-<id>`), its text the glossary name of that id → `select` `entryFor(id).selectId`, then `showTab('ropes')`.
  11. **See also** (only if `related` is not empty): label `learn.related`, one button per id (`learn-related-<id>`), its text the glossary name → `openLearn` that id.
  12. **How sure we are**: `h3` `learn.howSure`; the line `learn.status.<status>` (`learn-fact-status`); for languages other than `en` with `textStatus` `draft` the line `learn.textDraft` (`learn-text-status`; never shown in M20); then `learn.sources` and the sources (`learn-sources`), one per line: a link (`target="_blank"`, `rel="noopener"`) for `url` (its text) and `photo` (`learn.source.photo` with `{name}`), plain text `learn.source.brochure` and `learn.source.owner`. Hidden when `sources` is empty.

**More** buttons (each dispatches `openLearn` with the id; the panel then opens the Learn tab):
- Info card (`infoCard.ts`): a button `card.more` (`data-testid="card-more"`) after the one-liner, for the selected id.
- Ropes tab strip (`ropesTab.ts`, inside the `moreAbout` fold): a button `ropes.strip.learn` (`data-testid="strip-learn"`) for `entry.selectId`.
- Realistic mode (`realisticPanel.ts`, inside the fold that holds `.real-more-text`): the same button (`data-testid="real-learn"`); its click handler reads the currently selected tail's `spec.ropeId` at click time (the fold is hidden with the strip when nothing is selected).
- Only one `strip-learn` is visible at a time (one per Ropes-tab entry, the others hidden); browser checks select it as `.rope-strip > :not([hidden]) [data-testid="strip-learn"]`.
- **Accessibility (the existing audit, `scripts/a11y-audit.mjs`):** every button and link added here (`card-more`, `strip-learn`, `real-learn`, every Learn button, and the source links in `learn-sources`) is at least 44 × 44 px with text of at least 13 px, and has a visible `:focus-visible` outline in `style.css`; the kind line (`learn-kind`) is 13 px or more.
- `app.ts`: `store.subscribe` also calls `card.refresh()` when `state.learn` changes (the card's hidden rule depends on it).
- `app.ts`: `shownInPanel` also hides the card in the stacked layout while the Learn tab is active and `state.learn` equals the selected id.

### 6.7 Strings (`content/lang/en/ui.json`, new keys, exact text)

| Key | Text |
|---|---|
| `language.name` | English |
| `tab.learn` | Learn |
| `card.more` | More |
| `ropes.strip.learn` | Read more in Learn |
| `learn.empty` | Tap any part of the boat, then “More” on its card, to read about it here. |
| `learn.kind.rope` | Rope |
| `learn.kind.sail` | Sail |
| `learn.kind.sailpart` | Part of a sail |
| `learn.kind.part` | Part of the boat |
| `learn.kind.fitting` | Deck and cockpit gear |
| `learn.kind.term` | Sailing word |
| `learn.kind.environment` | Around the boat |
| `learn.alternatives` | Also called: {terms} |
| `learn.boatLabel` | Written on the boat: {labels} |
| `learn.alternativeWithNote` | {term} ({note}) |
| `learn.what` | What it does |
| `learn.whatTerm` | What it means |
| `learn.onThisBoat` | On this boat |
| `learn.mistakes` | Typical mistakes |
| `learn.mistake` | Mistake: |
| `learn.fix` | Fix: |
| `learn.showMe` | Show me |
| `learn.showMeDone` | Showing it. Your phone’s Back button takes you back to where you were. |
| `learn.showOnBoat` | Show on the boat |
| `learn.tryIt` | Try it in the Ropes tab: |
| `learn.related` | See also: |
| `learn.howSure` | How sure we are |
| `learn.status.draft` | Not yet checked: written by AI from general sailing knowledge. |
| `learn.status.source-checked` | Checked against a written source. |
| `learn.status.photo-confirmed` | Seen on the reference boat (photo). |
| `learn.status.sailor-reviewed` | Reviewed by an experienced sailor. |
| `learn.textDraft` | This translation has not yet been checked by a sailor. |
| `learn.sources` | Sources: |
| `learn.source.photo` | Photo: {name} |
| `learn.source.brochure` | Hanse 508 brochure (not in the app) |
| `learn.source.owner` | The boat’s owner, checked on board |

### 6.8 Tests

`tests/glossary.test.ts` (keep a constant `COMPLETE_IDS` with the 18 M20 ids; M21 and M22 add theirs):
1. Every registry id has an entry in every glossary file, and no glossary has an id the registry does not have. Each file's `language` equals its folder.
2. Every entry, every language: non-empty `name`; `alternatives` is an array of `{ term }` with a non-empty `term` and, if present, a non-empty `note`; no term equals (ignoring case) the entry's name, another term of the same entry, or a word on the boat (`boatLabelsFor`); `textStatus` is `draft` or `sailor-reviewed`.
3. `en`: every entry has a non-empty `short`. Every id in `COMPLETE_IDS` is complete (3.2) in every language.
4. For every entry with a registry `showMe`, every complete language has `showMe` text, and no language has `showMe` text for an entry without one.
5. Registry: `schemaVersion` 2; `status` is one of `statusValues`; every source key is in `sourceKeys` and `sourceLink` returns a link for it; every `controls` id has `entryFor(id)`; every `related` id is a registry id other than the entry's own, with no repeats; no entry still has `names`, `aliases` or `short`.
6. Every `showMe` round-trips (3.5) and contains none of `learn`, `detail`, `debug`, `lang`.
7. Show-me scenes (3.5; prototype values in brackets):
   - `rope_mainsheet`: `|rig.theta.value|` 44–54° [48.7]; the same query with `ms=0`: below 2°.
   - `rope_jib_sheet`: `|rig.jibSolution.headingDeg|` 29–33° [31.0]; with `js=0`: 12–16° [14.3].
   - `rope_vang`: `rig.psi.value` at least 8° [9.5]; with `vg=0`: at most 0° [−2].
   - `rope_topping_lift`: `rig.solution.vang.state` and `rig.solution.toppingLift.state` are both `'fighting'`.
   - `rope_jib_furling_line`: `rig.jibSolution.unfurled` 0.38–0.42 [0.40].
   - `sail_main`: after 10 s (600 steps), boat speed 6.8–7.8 kn [7.2].
   - `sail_jib`: `rig.jibSolution.side` is −1; the same query with `wd=-30`: +1.
8. `partInfo('rope_topping_lift')` still gives "Topping lift", `['Boom lift']` and a one-liner mentioning the boom (`tests/registry.test.ts`, adapted to v2: its "names/short/status" test becomes items 2, 3 and 5 here).

`tests/learn.test.ts`:
9. `openLearn('rope_vang')` sets `learn`; `openLearn('part_made_up')` and opening the same id again return the same state object; `openLearn(null)` clears it; `reset` clears it.
10. URL: `?learn=rope_vang` → `learn` `rope_vang`; `?learn=part_made_up` → null; serialize writes `learn` right after `sel` (`…&sel=rope_vang&learn=rope_vang&step=…`); a state without `learn` writes none; old links unchanged (the existing URL tests pass untouched).
11. (`tests/glossary.test.ts`) `NOT_DRAWN`: every listed id is a registry id; every registry id that is not a term and not in `NOT_DRAWN` occurs in `src/` or `content/boat/` (a text search over the files), and no `NOT_DRAWN` id does.

`tests/i18n.test.ts`: only its import path changes.

### 6.9 Browser checks (`scripts/shots-m20.mjs`)

**CI:** add a matrix part to `.github/workflows/ci.yml` after "live, Phase 2 on": `part: live, Phase 4`, `env: SHOTS_NO_SCENES=1 SHOTS_NO_TAPS=1 SHOTS_ONLY=m20,m21,m22,m23,m24`, and add `m20,m21,m22,m23,m24` to the `SHOTS_SKIP` list of "live, Phase 2 on" (`SHOTS_ONLY` and `SHOTS_SKIP` simply match no group for names not registered yet, so later milestones need no CI change).

Labels contain `m20`; `openPage` adds `held=1`, `sea=flat` and `clock=0` to queries without them (its regexes do not match `m2x`), which these checks want. Register in `shots.mjs` (import, `M20_SCENES` with the `m20-` prefix, `liveGroups.m20`).

Scenes (`M20_SCENES`, every size): `learn-vang` `?learn=rope_vang&sel=rope_vang`; `learn-mainsail` `?learn=sail_main`; `card-more` `?sel=sail_main` (the info card with More).

Live checks (`liveM20Checks`, phone unless said). Every expectation about the address bar polls up to 1 s (`waitForFunction`), because the link is written 300 ms after a change:
1. `?sel=sail_main`: tap `card-more` → `#tab-learn` has `aria-selected="true"`, `learn-name` reads "Mainsail", the address bar has `learn=sail_main`.
2. `?learn=rope_vang`: the Learn tab is open; `learn-alternatives` contains "kicker (British)"; `learn-boat-label` contains “Vang”; `learn-fact-status` reads `learn.status.photo-confirmed`'s text. Tap `learn-show-me` → within 1 s the address bar contains `vg=100` and `learn=rope_vang`; `page.goBack()` → within 1 s the address bar no longer contains `vg=100`, still contains `learn=rope_vang`, and `learn-name` reads "Vang".
3. `?sel=rope_vang`: open the Ropes strip's fold (`.rope-strip > :not([hidden]) details.strip-more > summary`), tap the visible `strip-learn` (selector in 6.6) → Learn tab, "Vang". Then tap `learn-try-rope_vang` → `#tab-ropes` selected and the address bar has `sel=rope_vang`.
4. `?learn=rope_vang`: tap `learn-show-on-boat` → the address bar has `sel=rope_vang` and `#tab-learn` still has `aria-selected="true"` (a rope selection must not switch to Ropes here). Then tap `learn-related-part_boom` → `learn-name` reads "Boom"; tap `learn-show-on-boat` → `sel=part_boom`.
5. `?sel=rope_mainsheet&mode=realistic`: open the Realistic strip's fold (`[data-testid="real-strip"] details.strip-more > summary`), tap `real-learn` → `#tab-learn` selected, `learn-name` "Mainsheet", the address bar has `learn=rope_mainsheet`.
6. Desktop size, `?sel=sail_jib`: the side-by-side info card shows `card-more`; tap it → Learn tab, "Self-tacking jib".
7. Accessibility: `auditPage` (`scripts/a11y-audit.mjs`) on `?learn=rope_vang` with the Learn tab open, phone: clean.

### 6.10 Done when

All M20 checks in `WORKFLOW.md` (section 9) pass on the phone; the tests above pass; the scenes looked at (phone first); `CODE_MAP.md` updated (new files, the moved strings file, the registry's new role, `openLearn` in "Store actions").

### 6.11 Not in M20

No list or search (M21). No Russian on screen (M23): the Russian glossary is written but not shown. No texts for other entries (M21, M22). `CLAUDE.md`: only the "IDs" bullet changes, to: `**IDs:** every mesh and rope gets an id from content/registry/parts.json; a rope control uses its rope's id (no registry entry of its own). Add new ids to the registry first, with status: "draft" unless the spec gives a status backed by the sources it cites, and give them an entry in every content/lang/<code>/glossary.json.`

### 6.12 Decided in the M20 PR

(The builder adds what it decided here; the owner's answers on the PR are added below.)

- **Russian texts (decided in the M21 PR).** The 55 Russian entries are drafts written from the English (3.3), with the names and alternatives of 7.2.2 copied by script; every one stays `textStatus: "draft"`. Nothing Russian is shown on screen before M23. Where an English text names a tab or a mode, the Russian names the tab «Концы», «Ветер» or «Вид» and the modes «Реалистичный режим», the stations «Мачта», «Левый борт», «Правый борт», and the autopilot's modes «Ожидание», «Курс», «Ветер», «Поворот»; M23 must use these exact words in the Russian UI strings (or change the entries to match). Numbers of four digits that are engine speeds are written with a no-break space (`1 850 об/мин`), as the engine panel will show them in M23.
- **Search box placeholder (decided in the M21 PR, owner on PR #55).** The first text of `learn.searchPlaceholder` ("Search a name, another name or a word on the boat") did not fit the box on a phone. It is now "Search names and words on the boat" (7.5 changed); the placeholder is 14 px and would end in an ellipsis if a longer text is ever used. The label for screen readers is the short `learn.search`.
- **An extra scene (decided in the M21 PR).** `scripts/shots-m21.mjs` has a fourth scene, `learn-winch` (`?learn=fit_winch`): an open entry with its Back button, at every size.
- **Back button (decided in the M21 PR).** `learn-back` uses the existing `learn-button` style (44 px, blue) and sits above the entry's name, under the search box.
- **Test bands (decided in the M21 PR).** All bands of 7.6 passed as given on the first run (danger zone: outline at 4.0–4.2 s and sweep at 6.0–7.0 s, rudder 25, engine 7.6–8.2 kn and 1,800–1,900 rpm, waves 2.03–2.04 m, car side −1); nothing was tuned.

Owner's answers on PR #55 ("accept all open questions", and "fix 1, 2, 5 and 6" of the independent review):

- **Wind direction in the `env_wind` mistake (owner, PR #55; review item 1).** 060° is east-north-east, not north-east. The fix now reads "A wind “from 060°” blows from the east-north-east towards the west-south-west." (7.2.1 and the English entry changed; the Russian says `дует с востоко-северо-востока на западо-юго-запад`).
- **Russian terms (owner, PR #55; review item 2).** One name for the autopilot's control: «авторулевой» everywhere (the three places that said «автопилот» changed; «пульт автопилота» stays an alternative name of the entry), and «Однорычажное» is one word.
- **Russian tab and mode names (owner, PR #55; answer to question 2).** Kept as written above: «Концы», «Ветер», «Вид», «Реалистичный режим», «Ожидание», «Курс», «Поворот»; M23 uses them in the Russian UI.
- **Shorter search hint (owner, PR #55; answer to question 1; review item 6).** See the placeholder note above.
- **Left as is (review items 3, 4 and 7).** The Russian term for "sailing by the lee" is a question for the sailor who reviews the Russian in M24 (3); "Rigid vang strut" before "Vang" under "kicker" follows the sort rule of 7.3 (4); the live checks' log prints their failure text next to passing checks (7).

- **Info card height (decided in the M20 PR).** In the stacked layout the card's maximum height went from 104 px to 140 px, so the 44 px "More" button under a two-line one-liner is not cut off. A longer one-liner still scrolls inside the card.
- **Russian text (decided in the M20 PR).** The 18 Russian entries are drafts written from the English, with the given names and alternatives; sentences that mention a sailing term that has its own Russian name use that name (`оттяжка гика`, `топенант`, `колдунчики`, `стопор`, `лебёдка`). All stay `textStatus: "draft"`. Nothing Russian is shown on screen before M23.
- **Owner's answers on PR #54** (after the independent review, "accept open questions recommendations, accept 1 to 4"):
  - Question 1: the stacked info card stays 140 px high (above).
  - Question 2: opening an entry adds no step to the browser history; only Show me does (as 6.5 says).
  - Review 1 and the owner's test: **"More", "Read more in Learn" (Ropes and Realistic strips) also open the Learn tab when that entry is already open.** The panel gives the card and the Ropes tab a `showLearn` callback; a live check covers it.
  - Review 2: the jib's first mistake now says "She heels too much and turns into the wind. Roll part of the main in first, then part of the jib if needed." (6.3.1 changed, and the Russian with it), following the cited source on weather helm (PT-29, source [23]).
  - Review 3: the Russian tack-corner sentence no longer says «галс» is the turn: «Галсом» также называют сторону, с которой дует ветер (см. «Правый галс»); сам поворот носа через ветер — «Поворот оверштаг». Still a draft.
  - Review 4: **Show me tapped twice adds only one history step** (`openScene` pushes no new step when every setting of the scene is already in the link, `showsScene`), and Back clears the line "Showing it…".
  - Owner's test: **the words written on the boat come from the boat file**: `boatLabelsFor(id)` (`src/model/boatLabels.ts`) reads the clutch labels in `content/boat/hanse508.json` (`cockpitHardware.clutchBanks`, `jibRollClutch`); the registry's `boatLabel` copies were removed (they were the same words, a test pins them). 3.1, 3.2, 3.4, 6.4, 6.8 and M23 (9.2) were updated.
- **One-off migration.** The registry and both glossaries were produced from the old registry and the spec's text by a script that is not committed; the English entries of the 18 M20 ids are the spec's text unchanged (copied by the script, not retyped).

---
## 7. M21: Glossary and search

**Independent review: required** (55 teaching texts in two languages, a new pure search function, and the registry gains `group` everywhere).

### 7.1 Files

New: `tests/search.test.ts`, `scripts/shots-m21.mjs`.
Changed: `content/registry/parts.json` (`group` for every entry; `controls`, `related`, `showMe` for the M21 entries), `content/lang/en/glossary.json` and `content/lang/ru/glossary.json` (the M21 entries), `content/lang/en/ui.json`, `src/model/glossary.ts` (search, groups), `src/ui/learnTab.ts` (list, search, back), `src/style.css`, `tests/glossary.test.ts` (`COMPLETE_IDS` += the M21 ids; groups), `scripts/shots.mjs` (registration, and a new scene option `type: { testId, text }` that fills an input after the page opens and the scene's `tab` and `click` steps), `docs/CODE_MAP.md`.

### 7.2 Data

**Groups.** Add `"group"` to every registry entry (after `phase`), exactly:

| group | ids |
|---|---|
| `ropes` | `rope_mainsheet`, `rope_jib_sheet`, `rope_vang`, `rope_topping_lift`, `rope_outhaul`, `rope_main_furling_line`, `rope_jib_furling_line`, `rope_main_halyard`, `rope_spi_halyard` |
| `sails` | `sail_main`, `sail_jib`, `sail_gennaker`, `sailpart_head`, `sailpart_tack`, `sailpart_clew`, `sailpart_luff`, `sailpart_leech`, `sailpart_foot`, `part_telltale` |
| `rig` | `part_mast`, `part_boom`, `part_gooseneck`, `part_spreader`, `part_shroud`, `part_forestay`, `part_backstay`, `part_windex`, `part_vang_strut`, `part_main_furling_gearbox`, `part_jib_furler`, `fit_mast_base_turning_blocks`, `fit_mainsheet_boom_blocks` |
| `hull` | `part_hull`, `part_bow`, `part_stern`, `part_keel`, `part_rudder`, `part_saildrive` |
| `deck` | `part_deck`, `part_coachroof`, `part_companionway`, `part_lifelines`, `fit_sprayhood`, `fit_line_channels`, `fit_mainsheet_deck_blocks`, `fit_self_tacking_track`, `fit_self_tacking_car`, `fit_anchor_windlass`, `fit_bow_roller`, `fit_mooring_cleat` |
| `cockpit` | `part_cockpit`, `fit_clutch`, `clutch_bank_a`, `clutch_bank_b`, `clutch_jib_roll`, `fit_rope_bin`, `fit_winch`, `winch_primary_port`, `winch_primary_starboard`, `part_winch_handle`, `winch_secondary_port`, `winch_secondary_starboard`, `helm_port`, `helm_starboard`, `fit_compass`, `engine_control`, `fit_autopilot_control`, `fit_instrument_display` |
| `wind` | `env_wind`, `term_true_wind`, `term_apparent_wind` |
| `directions` | `term_port`, `term_starboard`, `term_windward`, `term_leeward` |
| `sailing` | `term_sheet`, `term_halyard`, `term_starboard_tack`, `term_port_tack`, `term_tacking`, `term_gybe`, `term_luffing`, `term_ease`, `term_trim`, `term_twist`, `term_telltale`, `term_no_go_zone`, `term_close_hauled`, `term_close_reach`, `term_beam_reach`, `term_broad_reach`, `term_run`, `term_reef`, `term_preventer`, `env_boom_danger_zone` |
| `sea` | `env_water`, `env_wake`, `env_buoy` |

The group order (the list's order) is the table's order. In `glossary.ts`: `export const GROUPS = ['ropes', 'sails', 'rig', 'hull', 'deck', 'cockpit', 'wind', 'directions', 'sailing', 'sea'] as const; export type GroupId = (typeof GROUPS)[number];`.

**Registry fields of the M21 entries** (status and sources stay as they are; "—": leave the key out):

| id | controls | related | showMe |
|---|---|---|---|
| `part_hull` | — | `part_keel`, `part_bow`, `part_stern`, `part_deck` | — |
| `part_bow` | — | `part_stern`, `part_jib_furler`, `fit_anchor_windlass` | — |
| `part_stern` | — | `part_bow`, `helm_port`, `part_rudder` | — |
| `part_deck` | — | `part_coachroof`, `part_lifelines`, `fit_line_channels` | — |
| `part_coachroof` | — | `part_mast`, `fit_mainsheet_deck_blocks`, `fit_line_channels`, `fit_sprayhood` | — |
| `part_cockpit` | — | `helm_port`, `fit_winch`, `fit_clutch`, `part_companionway` | — |
| `part_companionway` | — | `part_cockpit`, `fit_sprayhood` | — |
| `part_keel` | — | `part_hull`, `part_rudder` | — |
| `part_rudder` | `part_rudder` | `helm_port`, `helm_starboard`, `part_keel`, `fit_autopilot_control` | `?wd=90&ws=12&rd=25&cam=top&sel=part_rudder&held=1&sea=flat` |
| `part_saildrive` | — | `engine_control`, `part_hull` | — |
| `part_lifelines` | — | `part_deck` | — |
| `part_mast` | — | `part_shroud`, `part_forestay`, `part_backstay`, `part_spreader`, `sail_main`, `part_main_furling_gearbox` | — |
| `part_boom` | `rope_mainsheet`, `rope_vang`, `rope_topping_lift` | `part_gooseneck`, `part_vang_strut`, `env_boom_danger_zone`, `rope_mainsheet` | `?wd=90&ws=12&ms=40&cam=side-port&sel=part_boom&held=1&sea=flat` |
| `part_gooseneck` | — | `part_boom`, `part_mast`, `sailpart_tack` | — |
| `part_spreader` | — | `part_shroud`, `part_mast` | — |
| `part_shroud` | — | `part_spreader`, `part_mast`, `part_forestay`, `part_backstay` | — |
| `part_forestay` | — | `sail_jib`, `part_jib_furler`, `part_backstay`, `part_mast` | — |
| `part_backstay` | — | `part_forestay`, `part_mast`, `part_stern` | — |
| `part_windex` | — | `part_mast`, `fit_instrument_display`, `term_apparent_wind` | — |
| `part_telltale` | `rope_mainsheet`, `rope_jib_sheet` | `term_telltale`, `sail_main`, `sail_jib`, `term_luffing` | `?wd=60&ws=12&ms=25&js=50&cam=side-starboard&sel=part_telltale&sea=flat` |
| `part_vang_strut` | `rope_vang` | `rope_vang`, `part_boom`, `rope_topping_lift` | — |
| `fit_sprayhood` | — | `part_cockpit`, `part_companionway`, `part_coachroof` | — |
| `part_main_furling_gearbox` | `rope_main_furling_line` | `rope_main_furling_line`, `part_winch_handle`, `part_mast` | `?sel=part_main_furling_gearbox&mode=realistic&held=1&sea=flat&st=mast` |
| `part_jib_furler` | `rope_jib_furling_line` | `rope_jib_furling_line`, `sail_jib`, `part_forestay`, `clutch_jib_roll` | `?wd=90&ws=12&js=100&jf=40&cam=bow&sel=part_jib_furler&held=1&sea=flat` |
| `fit_mainsheet_boom_blocks` | `rope_mainsheet` | `rope_mainsheet`, `fit_mainsheet_deck_blocks`, `part_boom` | — |
| `fit_mainsheet_deck_blocks` | `rope_mainsheet` | `rope_mainsheet`, `fit_mainsheet_boom_blocks`, `part_coachroof` | — |
| `fit_self_tacking_track` | `rope_jib_sheet` | `fit_self_tacking_car`, `sail_jib`, `rope_jib_sheet` | `?wd=30&ws=12&ms=10&js=0&cam=bow&sel=fit_self_tacking_track&held=1&sea=flat` |
| `fit_self_tacking_car` | `rope_jib_sheet` | `fit_self_tacking_track`, `rope_jib_sheet`, `sail_jib` | — |
| `fit_clutch` | — | `clutch_bank_a`, `clutch_bank_b`, `clutch_jib_roll`, `fit_winch` | `?wd=90&ws=12&ms=40&sel=fit_clutch&mode=realistic&held=1&sea=flat` |
| `clutch_bank_a` | — | `fit_clutch`, `winch_primary_starboard`, `clutch_bank_b` | — |
| `clutch_bank_b` | — | `fit_clutch`, `winch_primary_port`, `clutch_bank_a` | — |
| `clutch_jib_roll` | `clutch_jib_roll` | `rope_jib_furling_line`, `part_jib_furler`, `fit_clutch` | — |
| `fit_rope_bin` | — | `fit_winch`, `fit_clutch`, `part_cockpit` | — |
| `fit_winch` | — | `fit_clutch`, `part_winch_handle`, `winch_primary_port`, `winch_primary_starboard` | `?wd=90&ws=20&js=30&sel=fit_winch&mode=realistic&held=1&sea=flat&st=starboard&wsb=a5.2.h` |
| `winch_primary_port` | — | `fit_winch`, `clutch_bank_b`, `clutch_jib_roll`, `part_winch_handle` | — |
| `winch_primary_starboard` | — | `fit_winch`, `clutch_bank_a` | — |
| `part_winch_handle` | — | `fit_winch`, `part_main_furling_gearbox`, `winch_primary_port` | `?sel=part_winch_handle&mode=realistic&held=1&sea=flat` |
| `winch_secondary_port` | — | `fit_winch`, `winch_primary_port` | — |
| `winch_secondary_starboard` | — | `fit_winch`, `winch_primary_starboard` | — |
| `helm_port` | `helm_port` | `part_rudder`, `helm_starboard`, `fit_compass`, `fit_autopilot_control` | — |
| `helm_starboard` | `helm_starboard` | `part_rudder`, `helm_port`, `fit_compass`, `fit_autopilot_control` | — |
| `fit_compass` | — | `helm_port`, `helm_starboard`, `fit_autopilot_control` | — |
| `engine_control` | — | `part_saildrive`, `helm_port` | `?ws=0&cam=side-port&sel=engine_control&sea=flat&eng=1&lv=66` |
| `fit_mast_base_turning_blocks` | — | `part_mast`, `fit_line_channels` | — |
| `fit_line_channels` | — | `fit_mast_base_turning_blocks`, `clutch_bank_a`, `clutch_bank_b`, `part_coachroof` | — |
| `fit_anchor_windlass` | — | `fit_bow_roller`, `part_bow` | — |
| `fit_bow_roller` | — | `fit_anchor_windlass`, `part_bow` | — |
| `fit_mooring_cleat` | — | `part_bow`, `part_stern` | — |
| `fit_autopilot_control` | — | `helm_port`, `fit_compass`, `fit_instrument_display` | `?wd=90&ws=12&ms=40&js=100&sel=fit_autopilot_control&ap=wind&sea=flat` |
| `fit_instrument_display` | — | `fit_autopilot_control`, `term_apparent_wind`, `term_true_wind`, `part_windex` | — |
| `env_water` | — | `env_wake`, `env_wind`, `env_buoy` | `?wd=90&ws=20&ms=40&js=100&cam=side-port&sel=env_water&sea=open` |
| `env_wind` | — | `term_true_wind`, `term_apparent_wind`, `part_windex`, `fit_instrument_display` | `?wd=60&ws=12&cam=top&sel=env_wind&held=1&sea=flat` |
| `env_wake` | — | `env_water`, `part_stern` | `?wd=90&ws=15&ms=40&js=100&cam=top&sel=env_wake&sea=flat` |
| `env_boom_danger_zone` | — | `part_boom`, `term_gybe`, `term_preventer`, `term_run` | `?wd=175&ws=15&ms=100&js=100&cam=top&sel=env_boom_danger_zone&ap=hdg&apt=330&sea=flat` |
| `env_buoy` | — | `env_water` | `?wd=90&ws=12&cam=map&sel=env_buoy` |

#### 7.2.1 English entries (copy exactly; they replace the M20 placeholders)

```json
"part_hull": {
  "name": "Hull",
  "alternatives": [],
  "short": "The body of the boat, which floats.",
  "what": "The hull is the watertight body that floats and carries everything else. Its shape under the water decides how easily she moves and how far she leans.",
  "onThisBoat": "15.55 m long overall, 4.75 m wide, 13.54 m on the waterline, and about 14.7 tonnes empty.",
  "textStatus": "draft"
},
"part_bow": {
  "name": "Bow",
  "alternatives": [],
  "short": "The front of the boat.",
  "what": "The bow is the front end of the boat. Directions on board are given from it: ahead is in front of the bow.",
  "onThisBoat": "The jib furler, the anchor roller and the anchor windlass sit on the bow.",
  "textStatus": "draft"
},
"part_stern": {
  "name": "Stern",
  "alternatives": [],
  "short": "The back of the boat.",
  "what": "The stern is the back end of the boat. Astern means behind it.",
  "onThisBoat": "A wide, flat stern; the two wheels stand just in front of it.",
  "textStatus": "draft"
},
"part_deck": {
  "name": "Deck",
  "alternatives": [],
  "short": "The top of the hull that you walk on.",
  "what": "The deck closes the hull from above. Ropes, blocks and fittings are fixed to it, and the crew walks along it to go forward.",
  "onThisBoat": "The side decks run from the cockpit to the bow on each side of the coachroof.",
  "textStatus": "draft"
},
"part_coachroof": {
  "name": "Coachroof",
  "alternatives": [{ "term": "cabin top" }, { "term": "deckhouse" }],
  "short": "The raised roof over the cabin, between the mast and the cockpit.",
  "what": "The coachroof raises the deck over the living space below to give headroom. Ropes from the mast run aft over it to the cockpit.",
  "onThisBoat": "The mast stands on it. The mainsheet’s two deck blocks sit at its back end, and covered channels carry the ropes from the foot of the mast to the clutches.",
  "textStatus": "draft"
},
"part_cockpit": {
  "name": "Cockpit",
  "alternatives": [],
  "short": "The open, sunken area at the back where the crew sits and steers.",
  "what": "The cockpit is where the crew sits, steers and works most of the ropes. It lies lower than the deck, so it feels safer at sea.",
  "onThisBoat": "Two wheels at the back, one winch and one clutch bank on each side, the engine lever at the helm, and the instruments and the autopilot control by the wheels.",
  "textStatus": "draft"
},
"part_companionway": {
  "name": "Companionway",
  "alternatives": [],
  "short": "The entrance with steps from the cockpit down into the cabin.",
  "what": "The companionway is the hatch and steps that lead below.",
  "mistakes": [
    { "mistake": "Leaving it open when waves start coming aboard.", "fix": "Water can pour below. Close it in rough weather." }
  ],
  "textStatus": "draft"
},
"part_keel": {
  "name": "Keel",
  "alternatives": [],
  "short": "The heavy fin under the boat that stops her sliding sideways and keeps her upright.",
  "what": "The keel does two jobs. Moving through the water, it works like a wing and stops the wind pushing the boat sideways, so she can sail across and towards the wind. Its weight, low down, pulls her back upright when the wind heels her.",
  "onThisBoat": "An L-shaped keel 2.40 m deep (a shorter 1.98 m keel is an option) with a 4-tonne ballast bulb at the bottom.",
  "textStatus": "draft"
},
"part_rudder": {
  "name": "Rudder",
  "alternatives": [],
  "short": "The blade under the back of the boat that steers her.",
  "what": "Turning the wheel turns the rudder. The water flowing past it pushes the stern sideways, and the boat turns. With no speed through the water there is no flow, so the rudder does nothing.",
  "onThisBoat": "One rudder, turned by either of the two wheels; an emergency tiller can be fitted if the steering fails. In the app the wheel turns the rudder up to 35° each way.",
  "mistakes": [
    { "mistake": "Turning the wheel hard over while the boat is stopped.", "fix": "Nothing happens: the rudder needs water flowing past it. Get her moving first, with the sails or the engine." },
    { "mistake": "Turning the wheel further and further against a boat that turns into the wind in a gust.", "fix": "A rudder turned too far stops gripping. Ease the mainsheet instead, so she stops turning." }
  ],
  "showMe": "The wheel is turned 25° to starboard: look through the water under the stern to see the rudder blade turned. Under way, this turns the boat to starboard.",
  "textStatus": "draft"
},
"part_saildrive": {
  "name": "Saildrive and propeller",
  "alternatives": [],
  "short": "The engine’s drive leg and propeller under the hull.",
  "what": "A saildrive is a leg that comes down through the bottom of the hull from the engine, with the propeller on its end. It pushes the boat ahead or astern when the engine is in gear.",
  "onThisBoat": "A diesel engine of about 80 hp, a saildrive and a fixed two-blade propeller. In the app, full throttle (2,500 rpm) gives about 9.3 kn.",
  "mistakes": [
    { "mistake": "Putting the engine in gear with a rope in the water near the stern.", "fix": "The propeller can catch the rope and stop the engine. Get all ropes on board before you engage gear." }
  ],
  "textStatus": "draft"
},
"part_lifelines": {
  "name": "Lifelines and stanchions",
  "alternatives": [{ "term": "guardrails" }],
  "short": "The wires round the edge of the deck, held up by posts.",
  "what": "Lifelines are wires along the edge of the deck, held up by posts (stanchions). They help stop people falling overboard, but they are low: hold on to the boat as well.",
  "mistakes": [
    { "mistake": "Leaning or sitting with your weight on the lifelines.", "fix": "They can bend or give way. Hold on to something solid and keep your weight inside the boat." }
  ],
  "textStatus": "draft"
},
"part_mast": {
  "name": "Mast",
  "alternatives": [],
  "short": "The tall pole that holds the sails up.",
  "what": "The mast holds up the sails. Wires (the standing rigging) hold it in place from the sides, the front and the back.",
  "onThisBoat": "A Seldén aluminium mast standing on the coachroof, its top about 22 m above the water, with two sets of swept-back spreaders. The mainsail rolls up inside it.",
  "textStatus": "draft"
},
"part_boom": {
  "name": "Boom",
  "alternatives": [],
  "short": "The pole along the bottom of the mainsail.",
  "what": "The boom holds the bottom of the mainsail out from the mast. It swings across the boat when the wind changes side; the mainsheet, the vang and the topping lift set where it sits.",
  "onThisBoat": "6.25 m long, joined to the mast by the gooseneck. It can swing about 72° out to each side before it would touch the shrouds.",
  "mistakes": [
    { "mistake": "Standing or sitting in the boom’s path with the wind from behind.", "fix": "In an accidental gybe the boom crosses the boat fast and hard. Keep your head out of the red danger zone the app draws." }
  ],
  "showMe": "Wind from the side: the boom has swung out to the side away from the wind. Try “Mainsheet” or “Vang” below to see it move.",
  "textStatus": "draft"
},
"part_gooseneck": {
  "name": "Gooseneck",
  "alternatives": [],
  "short": "The joint between the boom and the mast.",
  "what": "The gooseneck lets the boom swing from side to side and tilt up and down.",
  "textStatus": "draft"
},
"part_spreader": {
  "name": "Spreaders",
  "alternatives": [],
  "short": "Short struts out from the sides of the mast that spread the shrouds.",
  "what": "Spreaders push the shrouds out from the mast, so the wires hold it at a better angle.",
  "onThisBoat": "Two sets, about 6 m and 12 m above the foot of the mast, swept back 24°. With the boom far out, the mainsail presses against them.",
  "textStatus": "draft"
},
"part_shroud": {
  "name": "Shrouds",
  "alternatives": [],
  "short": "The wires that hold the mast up from the sides.",
  "what": "Shrouds run from the mast down to each side of the deck. They stop the mast falling sideways and take much of the sails’ load.",
  "onThisBoat": "The outer shrouds stop the boom at about 72° out.",
  "textStatus": "draft"
},
"part_forestay": {
  "name": "Forestay",
  "alternatives": [],
  "short": "The wire from high on the mast to the bow; the jib is set on it.",
  "what": "The forestay holds the mast from the front. The jib’s front edge runs along it, and the furler rolls the jib up round it.",
  "onThisBoat": "One forestay, with the Furlex jib furler at its foot.",
  "textStatus": "draft"
},
"part_backstay": {
  "name": "Backstay",
  "alternatives": [],
  "short": "The wire from the top of the mast to the stern.",
  "what": "The backstay holds the mast from behind, against the pull of the forestay and the jib.",
  "textStatus": "draft"
},
"part_windex": {
  "name": "Masthead wind indicator",
  "alternatives": [{ "term": "Windex", "note": "a brand name, used for any such indicator" }],
  "short": "The little arrow at the top of the mast that shows where the wind comes from.",
  "what": "It turns like a weathervane and points into the wind the boat feels (the apparent wind). Look up at it to check the wind’s angle.",
  "textStatus": "draft"
},
"part_telltale": {
  "name": "Telltale",
  "alternatives": [{ "term": "tell-tale" }],
  "short": "A short ribbon on a sail that shows how the air flows over it.",
  "what": "Telltales are short ribbons near the front of a sail, one on each side. Both streaming straight back: the sail is trimmed well. The one on the side away from the wind drooping or spinning: the sail is pulled in too far. The one on the wind’s side lifting: it is let out too far.",
  "onThisBoat": "The app draws telltales near the front edge of both sails.",
  "mistakes": [
    { "mistake": "Hauling in until the sail stops flapping, then hauling more “to be safe”.", "fix": "The telltales on the far side droop: the sail has stalled. Ease until both sides stream." }
  ],
  "showMe": "Good trim: zoom in (pinch) on the front edge of the mainsail near the mast. The telltales on both sides stream straight back.",
  "textStatus": "draft"
},
"part_vang_strut": {
  "name": "Rigid vang strut",
  "alternatives": [{ "term": "rigid kicker", "note": "British" }],
  "short": "A spring-loaded strut under the boom that holds it up; the vang rope pulls it down.",
  "what": "A rigid vang is a strut from low on the mast to the underside of the boom, with a spring inside. The spring pushes the boom up; the vang’s rope tackle pulls it down. With it, the boom does not drop when the sail is rolled away.",
  "onThisBoat": "A Seldén Rodkicker with a gas spring.",
  "textStatus": "draft"
},
"fit_sprayhood": {
  "name": "Sprayhood",
  "alternatives": [{ "term": "dodger", "note": "American" }],
  "short": "The folding canvas shelter at the front of the cockpit.",
  "what": "The sprayhood shields the companionway and the front of the cockpit from spray and wind. It folds down when it is not needed.",
  "textStatus": "draft"
},
"part_main_furling_gearbox": {
  "name": "In-mast furling gearbox",
  "alternatives": [],
  "short": "The gearbox at the foot of the mast that turns the mainsail’s furling rod.",
  "what": "The furling line turns a drum on this gearbox, which turns a rod inside the mast and rolls the sail in or out. A socket for the winch handle lets you roll the sail by hand.",
  "onThisBoat": "A Seldén gearbox with an IN/OUT switch (IN to the left, OUT to the right). With the winch handle, about 40 turns roll the main in. In Realistic mode it is at the Mast station.",
  "mistakes": [
    { "mistake": "Cranking with the switch on OUT when you want to roll the main in.", "fix": "The sail comes further out. Set the switch to IN first." }
  ],
  "showMe": "Realistic mode, Mast station: the gearbox with its IN/OUT switch and the socket for the winch handle.",
  "textStatus": "draft"
},
"part_jib_furler": {
  "name": "Jib furler",
  "alternatives": [{ "term": "roller furler" }, { "term": "Furlex", "note": "the maker’s name for this furler" }],
  "short": "The drum and swivel on the forestay that roll the jib up.",
  "what": "Pulling the furling line turns the drum at the bottom of the forestay, and the jib rolls up round the stay like a blind. It can stop part way, to make the jib smaller.",
  "onThisBoat": "A Seldén Furlex 404S at the bow. Its line runs aft along the port side deck to the “JIB ROLL” clutch.",
  "showMe": "Jib 40 % out: the rest is rolled round the forestay, above the furler’s drum.",
  "textStatus": "draft"
},
"fit_mainsheet_boom_blocks": {
  "name": "Mainsheet blocks on the boom",
  "alternatives": [],
  "short": "The three pulleys under the boom that the mainsheet runs through.",
  "what": "The mainsheet runs back and forth between these blocks and the deck blocks. Each extra part of rope makes it easier to pull (more purchase).",
  "onThisBoat": "Three blocks under the boom, 2.9 m from the mast.",
  "textStatus": "draft"
},
"fit_mainsheet_deck_blocks": {
  "name": "Mainsheet deck blocks",
  "alternatives": [],
  "short": "The two spring-mounted pulleys at the back of the coachroof for the mainsheet.",
  "what": "Each end of the mainsheet comes down from the boom to one of these blocks. The springs keep the blocks standing up.",
  "onThisBoat": "One block each side of the middle, with two parts of rope between the boom and each block. From each block the rope runs forward to the foot of the mast, then aft in the covered channel to a clutch. There is no traveller.",
  "textStatus": "draft"
},
"fit_self_tacking_track": {
  "name": "Self-tacking track",
  "alternatives": [],
  "short": "The short rail across the deck in front of the mast for the jib’s car.",
  "what": "The jib sheet’s car slides along this track. When the boat tacks, the wind pushes the jib across and the car runs to the other end by itself.",
  "onThisBoat": "Straight, about 2.8 m long, just in front of the mast. Because it is short, the jib cannot be eased far out.",
  "showMe": "The car sits at the port end of the track, away from the wind. Turn the wind to the other side of the bow in the Wind tab and watch it slide across.",
  "textStatus": "draft"
},
"fit_self_tacking_car": {
  "name": "Jib car",
  "alternatives": [{ "term": "self-tacking car" }],
  "short": "The sliding block on the track that the jib sheet runs through.",
  "what": "The car rides on the self-tacking track and carries the jib sheet’s block. It slides to the side away from the wind by itself.",
  "textStatus": "draft"
},
"fit_clutch": {
  "name": "Rope clutch",
  "alternatives": [{ "term": "jammer" }, { "term": "rope stopper" }],
  "short": "A lever that grips a rope so it cannot run out.",
  "what": "A closed clutch holds the rope: it can still be pulled in, but not let out. To let a rope out, take its load on a winch, then open the clutch (lever up).",
  "onThisBoat": "A bank of five clutches in front of each winch, and one single clutch for the jib furling line on the port side deck. In Realistic mode you open and close them with the lever.",
  "mistakes": [
    { "mistake": "Opening a loaded clutch with the rope not on the winch.", "fix": "The rope runs out fast and can burn hands. Put the rope on the winch with a few turns first." },
    { "mistake": "Shutting a clutch on a rope that is running out under load.", "fix": "It can damage the rope. Take the load on the winch first, then close the clutch." }
  ],
  "showMe": "Realistic mode: the clutches of this side are the levers in the drawing. Lever up is open; tap a clutch to select it, tap it again to open or close it.",
  "textStatus": "draft"
},
"clutch_bank_a": {
  "name": "Clutch bank A",
  "alternatives": [],
  "short": "The five clutches on the starboard side.",
  "what": "The row of clutches in front of the starboard winch. Each rope from the mast ends at one of them, and any one of them can be put on the winch.",
  "onThisBoat": "In order: “Main sheet”, “Main furling” (rolls the main in), “Main furling” (rolls it out), “Main halyard”, “Genoa sheet” (the jib sheet).",
  "textStatus": "draft"
},
"clutch_bank_b": {
  "name": "Clutch bank B",
  "alternatives": [],
  "short": "The five clutches on the port side.",
  "what": "The row of clutches in front of the port winch. Each rope from the mast ends at one of them, and any one of them can be put on the winch.",
  "onThisBoat": "In order: “SPI HALYARD” (the gennaker halyard), “Boom lift” (the topping lift), “Main outhaul”, “MAIN SHEET” (the other end of the mainsheet), “Vang”.",
  "textStatus": "draft"
},
"clutch_jib_roll": {
  "name": "Jib furling clutch",
  "alternatives": [],
  "short": "The single clutch on the port side deck for the jib furling line.",
  "what": "It holds the jib furling line, so the jib stays rolled up as far as it is.",
  "onThisBoat": "Labelled “JIB ROLL”, beside the sprayhood; from it the line runs aft to the port winch.",
  "textStatus": "draft"
},
"fit_rope_bin": {
  "name": "Rope tail box",
  "alternatives": [],
  "short": "A box behind each winch where the loose ends of the ropes go.",
  "what": "The loose ends (tails) of the ropes go into the box, so the cockpit stays clear and the ropes can run out freely when eased.",
  "mistakes": [
    { "mistake": "Leaving loose rope lying on the cockpit floor.", "fix": "Someone can trip, or the rope tangles as it runs out. Put it in the box." }
  ],
  "textStatus": "draft"
},
"fit_winch": {
  "name": "Winch",
  "alternatives": [],
  "short": "A drum that gives you the power to pull in a heavily loaded rope.",
  "what": "The rope is wrapped clockwise round the drum. The turns hold the load (each extra turn multiplies the grip), and turning the drum pulls the rope in. A self-tailer on top grips the tail, so one person can winch alone.",
  "onThisBoat": "One electric Lewmar self-tailing winch on each side, worked with a push button; the winch handle is a backup. The winch slows as the load grows and cuts out when the load is too high.",
  "mistakes": [
    { "mistake": "Wrapping the rope anticlockwise.", "fix": "The drum only turns clockwise, so the rope is not held. Wrap it clockwise, seen from above." },
    { "mistake": "Too few turns on a loaded rope.", "fix": "It slips when the clutch opens. Use about 4 turns to winch under load, 2 to ease under control." },
    { "mistake": "Keeping the button pressed when the winch cuts out.", "fix": "The load is too high, often two ropes pulling against each other. Find out why (a closed clutch, the topping lift against the vang) and fix that first." }
  ],
  "showMe": "Realistic mode, starboard: the jib sheet is on the winch with 2 turns, held by hand. Add turns, put it in the self-tailer, and press the winch button.",
  "textStatus": "draft"
},
"winch_primary_port": {
  "name": "Port winch",
  "alternatives": [],
  "short": "The winch on the left side of the cockpit.",
  "what": "It works the ropes of clutch bank B and the jib furling line.",
  "onThisBoat": "Electric, with a self-tailer. The winch handle is kept on this side.",
  "textStatus": "draft"
},
"winch_primary_starboard": {
  "name": "Starboard winch",
  "alternatives": [],
  "short": "The winch on the right side of the cockpit.",
  "what": "It works the ropes of clutch bank A.",
  "onThisBoat": "Electric, with a self-tailer.",
  "textStatus": "draft"
},
"part_winch_handle": {
  "name": "Winch handle",
  "alternatives": [],
  "short": "A removable crank for turning a winch, or the furling gearbox at the mast, by hand.",
  "what": "It fits into the top of a winch. Cranking one way turns the drum fast but weakly (1st gear), the other way slowly but strongly (2nd gear); the drum turns the same way both times.",
  "onThisBoat": "One handle on board, kept at the port side. It is used mostly at the mast, to roll the main in by hand if the furling line slips. While you carry it, your hands are full.",
  "mistakes": [
    { "mistake": "Leaving the handle in the winch after use.", "fix": "It can whip round or fall overboard. Take it out and put it back in its place." },
    { "mistake": "Cranking in 1st gear against a heavy load.", "fix": "It hardly moves. Crank the other way (2nd gear)." }
  ],
  "showMe": "Realistic mode, Port station: the winch handle sits in its slot. Tap the handle to pick it up.",
  "textStatus": "draft"
},
"winch_secondary_port": {
  "name": "Port secondary winch (optional)",
  "alternatives": [],
  "short": "A second winch some boats have on the left side; not on this boat.",
  "what": "The builder offers a second winch on each side, so more ropes can be worked at once. The reference boat does not have them, so the app does not draw them.",
  "textStatus": "draft"
},
"winch_secondary_starboard": {
  "name": "Starboard secondary winch (optional)",
  "alternatives": [],
  "short": "A second winch some boats have on the right side; not on this boat.",
  "what": "The builder offers a second winch on each side, so more ropes can be worked at once. The reference boat does not have them, so the app does not draw them.",
  "textStatus": "draft"
},
"helm_port": {
  "name": "Port wheel",
  "alternatives": [],
  "short": "The steering wheel on the left side.",
  "what": "Either wheel turns the same rudder. Steering from the side lets you see past the sails.",
  "onThisBoat": "Twin wheels, each with a compass in front of it.",
  "textStatus": "draft"
},
"helm_starboard": {
  "name": "Starboard wheel",
  "alternatives": [],
  "short": "The steering wheel on the right side.",
  "what": "Either wheel turns the same rudder. Steering from the side lets you see past the sails.",
  "onThisBoat": "Twin wheels, each with a compass in front of it.",
  "textStatus": "draft"
},
"fit_compass": {
  "name": "Compass",
  "alternatives": [],
  "short": "Shows which way the boat is heading.",
  "what": "The compass shows the boat’s heading in degrees: 0 north, 90 east, 180 south, 270 west.",
  "onThisBoat": "One compass in front of each wheel.",
  "textStatus": "draft"
},
"engine_control": {
  "name": "Engine control lever",
  "alternatives": [{ "term": "throttle" }, { "term": "single-lever control" }],
  "short": "One lever for both the gear and the throttle.",
  "what": "Pushed forward from the middle, the lever puts the engine in ahead gear, then gives more power; pulled back, astern. In the middle the engine is in neutral. Pause in neutral when you change direction.",
  "onThisBoat": "An Allpa single-lever control with START, STOP and POWER buttons and a “MAX 2500 RPM” sticker. In the app the lever two-thirds ahead gives about 1,850 rpm and 8 kn; full ahead about 9.3 kn.",
  "mistakes": [
    { "mistake": "Moving the lever from ahead straight to astern.", "fix": "The gearbox suffers. Stop in neutral for a moment, then go astern." },
    { "mistake": "Starting the engine with the lever in gear.", "fix": "She moves off at once. Put the lever in neutral before you start." }
  ],
  "showMe": "No wind, engine running with the lever two-thirds ahead: about 1,850 rpm and 8 kn. The engine block in the Ropes tab has the lever.",
  "textStatus": "draft"
},
"fit_mast_base_turning_blocks": {
  "name": "Turning blocks at the mast foot",
  "alternatives": [],
  "short": "The ring of pulleys at the foot of the mast that turn the ropes aft.",
  "what": "Ropes come down the mast and turn at these blocks to run aft along the coachroof to the cockpit, so they can be worked from there.",
  "onThisBoat": "Seldén blocks in a ring round the foot of the mast, one block for each rope.",
  "textStatus": "draft"
},
"fit_line_channels": {
  "name": "Line channels",
  "alternatives": [],
  "short": "Covered channels on the coachroof that carry the ropes to the cockpit.",
  "what": "They keep the ropes from the mast tidy and out from under the crew’s feet on their way aft.",
  "onThisBoat": "One channel on each side, ending at the clutch banks in front of the winches.",
  "textStatus": "draft"
},
"fit_anchor_windlass": {
  "name": "Anchor windlass",
  "alternatives": [],
  "short": "The electric winch on the bow that lets the anchor chain out and pulls it in.",
  "what": "The windlass lowers the anchor and hauls it back up, worked by switches at the bow or a remote at the helm.",
  "onThisBoat": "On the foredeck behind the anchor roller. The app does not draw it yet; anchoring comes in a later phase.",
  "mistakes": [
    { "mistake": "Putting fingers or feet near the chain while the windlass runs.", "fix": "The chain can trap them. Keep clear, and stop the windlass before you touch the chain." }
  ],
  "textStatus": "draft"
},
"fit_bow_roller": {
  "name": "Bow roller",
  "alternatives": [],
  "short": "The roller at the bow that the anchor chain runs over.",
  "what": "The anchor sits in the bow roller, and its chain runs over it to the windlass.",
  "textStatus": "draft"
},
"fit_mooring_cleat": {
  "name": "Mooring cleat",
  "alternatives": [],
  "short": "A strong fitting for tying the mooring lines to.",
  "what": "Lines to a pier or a buoy are made fast round a cleat.",
  "onThisBoat": "Cleats at the bow (photo). The app does not draw them yet.",
  "textStatus": "draft"
},
"fit_autopilot_control": {
  "name": "Autopilot control",
  "alternatives": [],
  "short": "The control panel that lets the autopilot steer.",
  "what": "The autopilot steers for you. On Standby you steer; Heading holds the compass course; Wind holds the angle to the true wind. Tack turns the boat through the wind.",
  "onThisBoat": "A B&G control at the helm. The autopilot block in the Ropes tab is the app’s version of it.",
  "mistakes": [
    { "mistake": "Holding a compass heading and forgetting the wind.", "fix": "If the wind shifts, she can end up in the no-go zone or gybe. Watch the sails, or let the autopilot hold the wind angle." },
    { "mistake": "Turning the wheel by hand with the autopilot on.", "fix": "It goes to Standby (you took the wheel). Choose a mode again when you want it to steer." }
  ],
  "showMe": "The autopilot is holding the angle to the wind. Its block is in the Ropes tab: change the angle with its buttons.",
  "textStatus": "draft"
},
"fit_instrument_display": {
  "name": "Instrument display",
  "alternatives": [],
  "short": "The screen at the helm that shows speed, heading and the wind.",
  "what": "It shows the boat’s speed, her heading and the wind: AWA and AWS, the apparent wind’s angle and speed (what the sails feel), and TWA and TWS, the true wind’s.",
  "onThisBoat": "A B&G display at the helm. In the app, the strip at the top of the 3D view shows the same numbers; tap it for the wind dial.",
  "textStatus": "draft"
},
"env_water": {
  "name": "Water surface",
  "alternatives": [],
  "short": "The sea around the boat; its waves grow with the wind.",
  "what": "Waves grow with the wind’s strength and with the distance it blows over open water. The boat rises and falls, pitches and rolls on them; waves from ahead slow her, waves from behind at an angle push her off course. In the app the water is see-through, so the keel and rudder stay visible.",
  "showMe": "Open sea in 20 kn of wind from the side: waves about 2 m high roll the boat. Change “Waves” in the Wind tab to compare.",
  "textStatus": "draft"
},
"env_wind": {
  "name": "Wind",
  "alternatives": [],
  "short": "The air moving over the water; in the app you set it in the Wind tab.",
  "what": "The wind is described by where it comes from and by its speed in knots. The streaks in the 3D view show it. The Wind tab sets its direction (from 0° north, clockwise) and speed, and can make it gusty, shifty, building or dying.",
  "mistakes": [
    { "mistake": "Reading a wind direction as where the wind blows to.", "fix": "A wind “from 060°” blows from the east-north-east towards the west-south-west." }
  ],
  "showMe": "Wind 12 kn from 060°: the streaks show it blowing past the boat. Turn the dial in the Wind tab to change it.",
  "textStatus": "draft"
},
"env_wake": {
  "name": "Wake",
  "alternatives": [],
  "short": "The trail of stirred-up water the boat leaves behind her.",
  "what": "The wake is the trail of water stirred up behind the boat as she moves. A straight wake means a steady course; a curved one shows she has been turning.",
  "showMe": "Sailing fast with the wind from the side: the wake trails out behind her. Turn the wheel a little to see it curve.",
  "textStatus": "draft"
},
"env_boom_danger_zone": {
  "name": "Boom danger zone",
  "alternatives": [],
  "short": "The red area the app draws where the boom would sweep in a gybe.",
  "what": "With the wind from behind, the boom can swing across the whole cockpit in an accidental gybe, fast and hard enough to injure someone. The app draws the area it would sweep in red, so you know where not to stand.",
  "mistakes": [
    { "mistake": "Steering so far downwind that the wind gets behind the mainsail (sailing by the lee).", "fix": "The boom can cross at any moment. Steer a little back towards the wind, or gybe on purpose with the mainsheet hauled in." }
  ],
  "showMe": "Running, the autopilot turns her through dead downwind with the mainsheet eased: an accidental gybe. The red area shows where the boom sweeps across. Keep heads out of it.",
  "textStatus": "draft"
},
"env_buoy": {
  "name": "Practice buoy",
  "alternatives": [],
  "short": "One of four yellow buoys near the start, to sail round.",
  "what": "Four yellow buoys stand 200 m north, east, south and west of where the boat starts. Use them as marks: sail round them, or check how far you have gone.",
  "showMe": "The map from above: zoom out with − four times to see the four buoys round the start.",
  "textStatus": "draft"
}
```

#### 7.2.2 Russian names and alternatives (copy exactly)

(Built as given. M23 changes some of these names after checking them against sources: see 9.2.1.)

Same notation as 6.3.2: `;` separates alternatives, ` — ` starts a note, `—` alone means none.

| id | `name` | `alternatives` (term — note) |
|---|---|---|
| `part_hull` | корпус | — |
| `part_bow` | нос | — |
| `part_stern` | корма | — |
| `part_deck` | палуба | — |
| `part_coachroof` | рубка | надстройка |
| `part_cockpit` | кокпит | — |
| `part_companionway` | сходной люк | — |
| `part_keel` | киль | — |
| `part_rudder` | перо руля | руль |
| `part_saildrive` | колонка сейлдрайв и гребной винт | сейлдрайв — от английского saildrive |
| `part_lifelines` | леера и леерные стойки | — |
| `part_mast` | мачта | — |
| `part_boom` | гик | — |
| `part_gooseneck` | гусёк | — |
| `part_spreader` | краспицы | — |
| `part_shroud` | ванты | — |
| `part_forestay` | штаг | форштаг |
| `part_backstay` | ахтерштаг | — |
| `part_windex` | флюгер на топе мачты | виндекс — от названия марки |
| `part_telltale` | колдунчик | — |
| `part_vang_strut` | жёсткая оттяжка гика | жёсткий кикер |
| `fit_sprayhood` | козырёк кокпита | спрейхуд — от английского sprayhood |
| `part_main_furling_gearbox` | редуктор закрутки грота | — |
| `part_jib_furler` | закрутка стакселя | фурлинг — от английского furling |
| `fit_mainsheet_boom_blocks` | блоки гика-шкота на гике | — |
| `fit_mainsheet_deck_blocks` | палубные блоки гика-шкота | — |
| `fit_self_tacking_track` | погон самоповоротного стакселя | — |
| `fit_self_tacking_car` | каретка стакселя | ползун |
| `fit_clutch` | стопор | — |
| `clutch_bank_a` | правый блок стопоров | — |
| `clutch_bank_b` | левый блок стопоров | — |
| `clutch_jib_roll` | стопор закрутки стакселя | — |
| `fit_rope_bin` | ящик для концов | — |
| `fit_winch` | лебёдка | винч — от английского winch |
| `winch_primary_port` | левая лебёдка | — |
| `winch_primary_starboard` | правая лебёдка | — |
| `part_winch_handle` | ручка лебёдки | вымбовка — старое морское слово |
| `winch_secondary_port` | дополнительная левая лебёдка | — |
| `winch_secondary_starboard` | дополнительная правая лебёдка | — |
| `helm_port` | левый штурвал | — |
| `helm_starboard` | правый штурвал | — |
| `fit_compass` | компас | — |
| `engine_control` | рукоятка газ-реверс | ручка газа |
| `fit_mast_base_turning_blocks` | отводные блоки у основания мачты | — |
| `fit_line_channels` | закрытые каналы для концов | — |
| `fit_anchor_windlass` | якорная лебёдка | брашпиль |
| `fit_bow_roller` | носовой якорный роульс | — |
| `fit_mooring_cleat` | швартовная утка | утка |
| `fit_autopilot_control` | пульт авторулевого | пульт автопилота |
| `fit_instrument_display` | дисплей приборов | — |
| `env_water` | поверхность воды | — |
| `env_wind` | ветер | — |
| `env_wake` | кильватерный след | кильватер |
| `env_boom_danger_zone` | опасная зона гика | — |
| `env_buoy` | учебный буй | — |

The Russian texts of these 55 entries (`short`, `what` and every field the English has) are written by you (3.3).

### 7.3 Model: search (`src/model/glossary.ts`)

```ts
/** Lower case, accents and other marks removed (NFD, then drop \p{M}), hyphens and dashes as spaces, runs of spaces as one, trimmed. ё → е and й → и follow from dropping the marks. */
export function normalizeSearch(text: string): string;
export interface SearchHit {
  id: string;
  /** The entry's name in the language. */
  name: string;
  /** What matched when it was not the name: an alternative's term or a boat label, as written; null when the name matched. */
  matched: string | null;
}
/** Entries whose name, alternatives (same language only) or boat labels contain the query. Empty query → []. */
export function searchGlossary(query: string, language: string = SOURCE_LANGUAGE): SearchHit[];
/** The ids of a group, sorted by their name in the language (localeCompare with the language code). */
export function groupEntries(group: GroupId, language: string = SOURCE_LANGUAGE): string[];
```

`normalizeSearch`: the characters `-`, `‐`, `‑`, `‒`, `–`, `—`, `―` and `_` become a space. `searchGlossary`: `q = normalizeSearch(query)`; `''` → `[]`. Every comparison below is between normalized texts (name, terms and labels pass through `normalizeSearch` too); `matched` returns the original text. For each registry id with a glossary entry in the language, take the best (lowest) rank: **0** the normalized name starts with `q`; **1** the name contains `q`; **2** an alternative's term contains `q` (`matched` = that term, the first such in its order); **3** a boat label contains `q` (`matched` = that label). No rank: not a hit. Sort by rank, then by name (`localeCompare(other, language)`). Only names, alternatives and boat labels are searched: never another language's words, never the explanation texts.

### 7.4 UI (`learnTab.ts`)

Top of the Learn tab, always shown (also above an open entry):
- **Search** (`label` `learn.search` visually hidden, `input type="search"`, `data-testid="learn-search"`, placeholder `learn.searchPlaceholder`, `autocomplete="off"`, at least 44 px high). Typing updates the results at once (`input` event). The text stays when an entry is opened and when coming back: create the `input` **once** and re-render only the area below it (keep the query in a variable of `createLearnTab`), so typing never loses focus. The search is **empty** when `normalizeSearch(text) === ''` (so spaces alone show the groups).

Below it:
- `state.learn === null` and the search is empty: the **groups** (`learn-groups`): one `details` per group in `GROUPS` order, closed each time the list is rebuilt (also after `learn-back`), its `summary` `learn.group.<group>` with `{count}`, inside one button per entry (`learn-entry-<id>`, the name; at least 44 px high) → `openLearn`.
- `state.learn === null` and the search has text: the **results**: one button per hit (`learn-hit-<id>`): the name, and when `matched` is not null a second line `learn.matched` (`{term}`, at least 13 px). No hit: `learn.noMatch`. The results container (`learn-results`, `aria-live="polite"`) exists, empty, whenever the list shows, so changes are announced.
- **Sizes and names (the accessibility audit):** the search label is a real `label for` the input's `id`, visually hidden with the existing `.visually-hidden` class; every `learn-entry-*`, `learn-hit-*`, `learn-back` and every group `summary` is at least 44 px high; all text at least 13 px.
- `learn.empty` stays in `ui.json` (unused from M21).
- An entry open (as M20, 6.6), now with a button `learn.back` (`learn-back`) above the name → `openLearn(null)` (back to the groups or the results).
- Typing in the search box while an entry is open dispatches `openLearn(null)` first, so the results show.
- `learn.empty` (M20) is no longer shown.

### 7.5 Strings (`content/lang/en/ui.json`, new keys, exact text)

| Key | Text |
|---|---|
| `learn.search` | Search |
| `learn.searchPlaceholder` | Search names and words on the boat |
| `learn.matched` | also: {term} |
| `learn.noMatch` | Nothing found. Try another word, or a word printed on the boat. |
| `learn.back` | ‹ All entries |
| `learn.group.ropes` | Ropes ({count}) |
| `learn.group.sails` | Sails and their parts ({count}) |
| `learn.group.rig` | Mast and rigging ({count}) |
| `learn.group.hull` | Hull and underwater ({count}) |
| `learn.group.deck` | On deck ({count}) |
| `learn.group.cockpit` | In the cockpit ({count}) |
| `learn.group.wind` | Wind and weather ({count}) |
| `learn.group.directions` | Directions and sides ({count}) |
| `learn.group.sailing` | Sailing and manoeuvres ({count}) |
| `learn.group.sea` | Water and waves ({count}) |

### 7.6 Tests

`tests/glossary.test.ts`: `COMPLETE_IDS` gains the 55 M21 ids (so items 1–6 of 6.8 cover them); every registry entry has exactly one `group`, from `GROUPS`; the group sizes are, in `GROUPS` order, 9, 10, 13, 6, 12, 18, 3, 4, 20, 3 (M22 changes the last four), and `rope_vang`, `part_telltale`, `part_mast`, `part_keel`, `part_deck`, `fit_winch`, `env_wind`, `term_port`, `term_gybe`, `env_water` are in `ropes`, `sails`, `rig`, `hull`, `deck`, `cockpit`, `wind`, `directions`, `sailing`, `sea`.
Show-me scenes (3.5): `env_boom_danger_zone`: `dangerZone(state.rig)` (`src/model/gybe.ts`) has `kind` `'risk'` (the faint by-the-lee outline) first at 4.0–4.2 s [4.05] and `kind` `'sweep'` (the boom crossing) first at 6.0–7.0 s [6.52]; `part_rudder`: `rig.applied.rudder` is 25 (exactly); `engine_control`: after 30 s (1,800 steps), `mpsToKn(boat.speedMps)` 7.6–8.2 kn [7.87] and `engine.rpm` 1,800–1,900 [1,858]; `env_water`: `significantHeightM(waveTrains(state.sea))` 2.03–2.04 m [2.036]; `fit_self_tacking_track`: `rig.jibSolution.side` −1.

`tests/search.test.ts`:
1. `normalizeSearch('  Гика-Шкот ')` = `'гика шкот'`; `normalizeSearch('ЁЛКА')` = `'елка'`; `normalizeSearch('Seldén')` = `'selden'`.
2. `searchGlossary('vang')`: the first hit is `rope_vang` (rank 0), and `part_vang_strut` is a hit.
3. `searchGlossary('kicker')`: `rope_vang` with `matched` `'kicker'` (rank 2; one hit per entry); `part_vang_strut` is also a hit (`matched` `'rigid kicker'`).
4. `searchGlossary('genoa')`: `rope_jib_sheet` with `matched` `'Genoa sheet'` (a boat label).
5. `searchGlossary('шкот', 'ru')`: contains `rope_mainsheet` and `rope_jib_sheet`; `searchGlossary('mainsheet', 'ru')` is empty (no English in Russian search; `MAIN SHEET` is a boat label and does not contain `mainsheet`); `searchGlossary('main sheet', 'ru')` finds `rope_mainsheet` through its boat label `Main sheet`.
6. `searchGlossary('')` and `searchGlossary('   ')` are `[]`; `searchGlossary('zzzz')` is `[]`.
7. `groupEntries('ropes')` has 9 ids, sorted by English name (`Gennaker halyard` first, `Vang` last).

### 7.7 Browser checks (`scripts/shots-m21.mjs`)

Scenes (`M21_SCENES`, every size; the scene loop's options): `learn-groups` `?wd=90&ws=12`, `tab: 'Learn'`; `learn-search-vang` the same with `type: { testId: 'learn-search', text: 'vang' }`; `learn-danger-zone` `?learn=env_boom_danger_zone`, `click: ['learn-show-me']`, wait 8,000 ms (she gybes at about 6.5 s; look at it: the red sweep should show; if it does not, say so in the PR).
Live checks (`liveM21Checks`, phone):
1. Learn tab, no entry: 10 group `details`; open "Ropes (9)", tap `learn-entry-rope_vang` → `learn-name` "Vang"; tap `learn-back` → the groups again.
2. Type `kicker` → `learn-hit-rope_vang` shows "also: kicker"; tap it → "Vang". Clear the box and type `kickerxx` → the `learn.noMatch` text.
3. Type `Genoa` → `learn-hit-rope_jib_sheet` with "also: Genoa sheet".
4. `?learn=part_winch_handle`: tap `learn-show-me` → the address bar has `mode=realistic`; `page.goBack()` → no `mode=realistic`.
5. Accessibility: `auditPage` on the Learn tab with the groups, with one group open, and with search results: clean.

### 7.8 Done when

All M21 checks in `WORKFLOW.md` pass on the phone; the tests above pass; the scenes looked at; `CODE_MAP.md` updated (search in `glossary.ts`).

### 7.9 Not in M21

No new ids and no texts for the sailing words (M22). No Russian on screen (M23). No search in the explanation texts.

### 7.10 Decided in the M21 PR

(The builder adds what it decided here; the owner's answers on the PR are added below.)

---
## 8. M22: Sailing words, directions and winds

**Independent review: required** (58 teaching texts in two languages, 33 new registry ids, sources and statuses).

### 8.1 Files

New: `scripts/shots-m22.mjs`.
Changed: `content/registry/parts.json` (33 new entries, `sourceKeys`, fields of the existing terms), `content/lang/en/glossary.json`, `content/lang/ru/glossary.json`, `tests/glossary.test.ts` (`COMPLETE_IDS` += the M22 ids; scenes), `tests/search.test.ts` (new cases), `scripts/shots.mjs` (no `CODE_MAP.md` change: it covers `shots-m<N>.mjs` already).

### 8.2 Data: the registry

**New source keys** (add to `sourceKeys`, after the existing ones, exactly):

```json
"wiki:forces-on-sails": "https://en.wikipedia.org/wiki/Forces_on_sails",
"wiki:jibe": "https://en.wikipedia.org/wiki/Jibe",
"wiki:weather-helm": "https://en.wikipedia.org/wiki/Weather_helm",
"wiki:hull-speed": "https://en.wikipedia.org/wiki/Hull_speed",
"wiki:broach": "https://en.wikipedia.org/wiki/Broach_(nautical)",
"wiki:wind-direction": "https://en.wikipedia.org/wiki/Wind_direction",
"wiki:compass-points": "https://en.wikipedia.org/wiki/Points_of_the_compass",
"wiki:nautical-terms-a-l": "https://en.wikipedia.org/wiki/Glossary_of_nautical_terms_(A%E2%80%93L)",
"wiki:seakeeping": "https://en.wikipedia.org/wiki/Seakeeping",
"wiki:beaufort": "https://en.wikipedia.org/wiki/Beaufort_scale",
"wiki:bora": "https://en.wikipedia.org/wiki/Bora_(wind)",
"wiki:sirocco": "https://en.wikipedia.org/wiki/Sirocco",
"wiki:maestral": "https://en.wikipedia.org/wiki/Mistral_(wind)",
"wiki:wind-fetch": "https://en.wikipedia.org/wiki/Wind_fetch",
"wiki:wind-wave": "https://en.wikipedia.org/wiki/Wind_wave",
"wiki:significant-wave-height": "https://en.wikipedia.org/wiki/Significant_wave_height",
"wiki:ship-motions": "https://en.wikipedia.org/wiki/Ship_motions"
```

**The 25 existing sailing words** (`kind: "term"`): `status` and `sources` stay, except where this table gives new ones (the cell lists the new status first, then the complete new sources list); `controls` none:

| id | status, sources (only if changed) | related | showMe |
|---|---|---|---|
| `term_sheet` | — | `rope_mainsheet`, `rope_jib_sheet`, `term_ease`, `term_trim` | — |
| `term_halyard` | — | `rope_main_halyard`, `rope_spi_halyard`, `sailpart_head` | — |
| `term_port` | — | `term_starboard`, `term_port_tack`, `part_bow` | — |
| `term_starboard` | — | `term_port`, `term_starboard_tack`, `part_bow` | — |
| `term_windward` | — | `term_leeward`, `term_starboard_tack`, `term_wind_direction` | `?wd=90&ws=12&ms=40&cam=top&held=1&sea=flat` |
| `term_leeward` | — | `term_windward`, `term_heel`, `part_boom` | `?wd=90&ws=12&ms=40&cam=top&held=1&sea=flat` |
| `term_true_wind` | `source-checked`, `wiki:forces-on-sails` | `term_apparent_wind`, `env_wind`, `fit_instrument_display` | `?wd=90&ws=12&ms=40&js=100&cam=map&sea=flat` |
| `term_apparent_wind` | `source-checked`, `wiki:forces-on-sails` | `term_true_wind`, `part_windex`, `fit_instrument_display` | `?wd=90&ws=12&ms=40&js=100&cam=map&sea=flat` |
| `term_starboard_tack` | — | `term_port_tack`, `term_starboard`, `term_tacking` | `?wd=90&ws=12&ms=40&cam=top&held=1&sea=flat` |
| `term_port_tack` | — | `term_starboard_tack`, `term_port`, `term_tacking` | `?wd=-90&ws=12&ms=40&cam=top&held=1&sea=flat` |
| `term_tacking` | — | `term_no_go_zone`, `term_in_irons`, `term_gybe`, `sail_jib` | `?wd=45&ws=12&ms=12&js=0&cam=top&ap=wind&sea=flat` |
| `term_gybe` | `source-checked`, `wiki:point-of-sail`, `wiki:jibe` | `env_boom_danger_zone`, `term_run`, `term_preventer`, `term_tacking` | `?wd=175&ws=15&ms=100&js=100&cam=top&ap=hdg&apt=330&sea=flat` |
| `term_luffing` | — | `sailpart_luff`, `term_telltale`, `term_stall` | `?wd=60&ws=12&ms=100&js=50&cam=side-starboard&sea=flat` |
| `term_ease` | — | `term_trim`, `term_sheet`, `rope_mainsheet` | — |
| `term_trim` | — | `term_ease`, `term_sheet`, `term_telltale` | — |
| `term_twist` | — | `rope_vang`, `sailpart_leech`, `rope_jib_sheet` | `?wd=90&ws=20&ms=40&vg=100&cam=side-port&held=1&sea=flat` |
| `term_telltale` | — | `part_telltale`, `term_luffing`, `term_stall` | `?wd=60&ws=12&ms=25&js=50&cam=side-starboard&sea=flat` |
| `term_no_go_zone` | — | `term_close_hauled`, `term_in_irons`, `term_tacking` | `?wd=45&ws=12&ms=12&js=0&cam=map&sea=flat` |
| `term_close_hauled` | — | `term_no_go_zone`, `term_close_reach`, `term_heel` | `?wd=45&ws=12&ms=12&js=0&cam=top&sea=flat` |
| `term_close_reach` | — | `term_close_hauled`, `term_beam_reach` | `?wd=60&ws=12&ms=20&js=25&cam=top&sea=flat` |
| `term_beam_reach` | — | `term_close_reach`, `term_broad_reach`, `term_abeam` | `?wd=90&ws=12&ms=40&js=100&cam=top&sea=flat` |
| `term_broad_reach` | — | `term_beam_reach`, `term_run`, `term_quarter` | `?wd=135&ws=12&ms=100&js=100&cam=top&sea=flat` |
| `term_run` | — | `term_broad_reach`, `term_gybe`, `env_boom_danger_zone` | `?wd=175&ws=12&ms=100&js=100&cam=top&sea=flat` |
| `term_reef` | — | `rope_main_furling_line`, `rope_jib_furling_line`, `term_heel` | `?wd=90&ws=12&ms=40&mf=50&cam=side-port&held=1&sea=flat` |
| `term_preventer` | — | `term_gybe`, `env_boom_danger_zone`, `part_boom` | — |

**The 33 new ids** (insert after `term_preventer`, one per line; the statuses given here are backed by the cited sources and override CLAUDE.md's default `draft`; `"kind": "term"`, `"phase": 4`, no `controls`):

| id | group | status | sources | related | showMe |
|---|---|---|---|---|---|
| `term_north` | `directions` | `source-checked` | `wiki:compass-points`, `wiki:wind-direction` | `term_east`, `term_south`, `term_west`, `term_compass_point` | — |
| `term_east` | `directions` | `source-checked` | `wiki:compass-points` | `term_north`, `term_south`, `term_west` | — |
| `term_south` | `directions` | `source-checked` | `wiki:compass-points` | `term_north`, `term_east`, `term_west` | — |
| `term_west` | `directions` | `source-checked` | `wiki:compass-points` | `term_north`, `term_east`, `term_south` | — |
| `term_compass_point` | `directions` | `source-checked` | `wiki:compass-points` | `term_north`, `term_heading`, `fit_compass` | — |
| `term_ahead` | `directions` | `draft` | — | `term_astern`, `term_abeam`, `part_bow` | — |
| `term_astern` | `directions` | `draft` | — | `term_ahead`, `term_quarter`, `part_stern` | — |
| `term_abeam` | `directions` | `source-checked` | `wiki:nautical-terms-a-l` | `term_ahead`, `term_quarter`, `term_beam_reach` | — |
| `term_quarter` | `directions` | `source-checked` | `wiki:seakeeping` | `term_abeam`, `term_astern`, `term_broad_reach` | `?wd=135&ws=15&ms=100&js=100&cam=helm` |
| `term_heading` | `directions` | `draft` | — | `fit_compass`, `term_north`, `fit_autopilot_control` | `?wd=150&ws=12&ms=40&js=100&cam=map&hdg=60&sea=flat` |
| `term_wind_direction` | `wind` | `source-checked` | `wiki:wind-direction` | `env_wind`, `term_north`, `term_true_wind` | `?wd=60&ws=12&cam=top&held=1&sea=flat` |
| `term_knot` | `wind` | `draft` | — | `term_beaufort`, `env_wind` | — |
| `term_beaufort` | `wind` | `source-checked` | `wiki:beaufort` | `term_knot`, `term_white_horses`, `term_gust` | `?wd=90&ws=10&ms=40&js=100&cam=side-port` |
| `term_gust` | `wind` | `draft` | — | `term_lull`, `term_heel`, `term_round_up` | `?wd=60&ws=12&ms=20&js=25&cam=helm&wm=gusty` |
| `term_lull` | `wind` | `draft` | — | `term_gust`, `term_apparent_wind` | — |
| `term_wind_shift` | `wind` | `draft` | — | `term_gust`, `term_head_up`, `term_bear_away` | `?wd=90&ws=12&ms=40&js=100&ap=wind&wm=shifty&wg=20` |
| `term_bora` | `wind` | `source-checked` | `wiki:bora` | `term_jugo`, `term_maestral`, `term_gust` | — |
| `term_jugo` | `wind` | `source-checked` | `wiki:sirocco`, `wiki:compass-points` | `term_bora`, `term_maestral` | — |
| `term_maestral` | `wind` | `source-checked` | `wiki:maestral` | `term_bora`, `term_jugo` | — |
| `term_heel` | `sailing` | `source-checked` | `wiki:weather-helm` | `term_weather_helm`, `part_keel`, `term_reef` | `?wd=50&ws=20&ms=15&js=20&cam=bow&sea=flat` |
| `term_weather_helm` | `sailing` | `source-checked` | `wiki:weather-helm` | `term_heel`, `term_round_up`, `part_rudder` | `?wd=50&ws=20&ms=15&js=20&cam=helm&sea=flat` |
| `term_round_up` | `sailing` | `source-checked` | `wiki:weather-helm`, `wiki:broach` | `term_weather_helm`, `term_gust`, `term_heel` | — |
| `term_in_irons` | `sailing` | `source-checked` | `wiki:point-of-sail` | `term_no_go_zone`, `term_tacking`, `part_rudder` | `?wd=0&ws=12&ms=10&js=10&bs=6.0&ap=off&sea=flat` |
| `term_head_up` | `sailing` | `draft` | — | `term_bear_away`, `term_no_go_zone` | — |
| `term_bear_away` | `sailing` | `draft` | — | `term_head_up`, `term_gybe` | — |
| `term_stall` | `sailing` | `source-checked` | `wiki:forces-on-sails` | `term_telltale`, `term_luffing`, `term_trim` | `?wd=60&ws=12&ms=0&js=50&cam=side-starboard&sea=flat` |
| `term_hull_speed` | `sailing` | `source-checked` | `wiki:hull-speed` | `part_hull`, `engine_control` | `?ws=0&cam=side-port&sea=flat&eng=1&lv=100` |
| `term_fetch` | `sea` | `source-checked` | `wiki:wind-fetch` | `env_water`, `term_wave_height` | `?wd=90&ws=15&ms=40&js=100&cam=side-port&sea=sheltered` |
| `term_white_horses` | `sea` | `source-checked` | `wiki:beaufort` | `term_beaufort`, `env_water` | `?wd=90&ws=22&ms=50&js=100&cam=side-port&sea=open` |
| `term_wave_height` | `sea` | `source-checked` | `wiki:significant-wave-height`, `wiki:wind-wave` | `term_fetch`, `env_water` | `?wd=90&ws=15&ms=40&js=100&cam=side-port` |
| `term_heave` | `sea` | `source-checked` | `wiki:ship-motions` | `term_pitch`, `term_roll` | `?wd=0&ws=20&cam=side-port&held=1&sea=open` |
| `term_pitch` | `sea` | `source-checked` | `wiki:ship-motions` | `term_heave`, `term_roll` | `?wd=0&ws=15&cam=side-port&held=1` |
| `term_roll` | `sea` | `source-checked` | `wiki:ship-motions` | `term_heave`, `term_pitch` | `?wd=90&ws=15&cam=bow&held=1` |

(`—` in sources: `"sources": []`.) The `group` of the 33 new ids is as given; the existing terms keep the M21 groups.

### 8.3 Data: English entries (copy exactly; they replace the placeholders and add the new ids)

```json
"term_sheet": {
  "name": "Sheet",
  "alternatives": [],
  "short": "A rope that sets a sail’s angle to the wind.",
  "what": "A sheet pulls on a sail’s clew (its back bottom corner) and so sets how far the sail can swing out. Each sail has its own: the mainsheet and the jib sheet. On a boat a sheet is a rope, not the sail.",
  "textStatus": "draft"
},
"term_halyard": {
  "name": "Halyard",
  "alternatives": [],
  "short": "A rope that hoists a sail.",
  "what": "A halyard pulls a sail’s head (its top corner) up the mast or the forestay and holds it there.",
  "onThisBoat": "The main stays hoisted and rolls into the mast, and the jib rolls round the forestay, so the halyards are hardly ever touched; the gennaker halyard is parked.",
  "textStatus": "draft"
},
"term_port": {
  "name": "Port",
  "alternatives": [{ "term": "larboard", "note": "an old word, no longer used" }],
  "short": "The left side of the boat, looking forward.",
  "what": "Port is the left side when you face the bow, whichever way you stand. Its navigation light is red.",
  "mistakes": [
    { "mistake": "Saying “left” while facing the stern.", "fix": "Port never changes: it is always the left side looking forward. Use port and starboard on board." }
  ],
  "textStatus": "draft"
},
"term_starboard": {
  "name": "Starboard",
  "alternatives": [],
  "short": "The right side of the boat, looking forward.",
  "what": "Starboard is the right side when you face the bow. Its navigation light is green.",
  "mistakes": [
    { "mistake": "Mixing up port and starboard in a hurry.", "fix": "A memory aid: “port” and “left” both have four letters." }
  ],
  "textStatus": "draft"
},
"term_windward": {
  "name": "Windward",
  "alternatives": [],
  "short": "The side the wind comes from.",
  "what": "The windward side of the boat is the side the wind blows onto. Windward also means towards the wind.",
  "showMe": "Wind from starboard: starboard is the windward side, and the boom has swung out to port, the leeward side.",
  "textStatus": "draft"
},
"term_leeward": {
  "name": "Leeward",
  "alternatives": [{ "term": "lee" }],
  "short": "The side away from the wind.",
  "what": "Leeward (sailors say “loo-ard”) is the side the wind blows away from. The sails and the boom lie on the leeward side, and the boat heels towards it.",
  "showMe": "Wind from starboard: the boom and the sails lie to port, the leeward side.",
  "textStatus": "draft"
},
"term_true_wind": {
  "name": "True wind",
  "alternatives": [],
  "short": "The wind as it blows over the water, as a boat standing still feels it.",
  "what": "The true wind is the wind’s own direction and speed over the water. The Wind tab sets it, and the instruments show it as TWA and TWS.",
  "showMe": "The map shows the true wind and, while she sails, the apparent wind she feels.",
  "textStatus": "draft"
},
"term_apparent_wind": {
  "name": "Apparent wind",
  "alternatives": [],
  "short": "The wind the boat feels: the true wind plus the wind from her own speed.",
  "what": "When the boat moves, her own speed adds a headwind. Together with the true wind it makes the apparent wind, which is what the sails feel and the masthead arrow shows. Sailing towards the wind or across it, the apparent wind comes from further ahead than the true wind and is stronger; running away from it, it is weaker.",
  "mistakes": [
    { "mistake": "Trimming the sails to the true wind.", "fix": "The sails feel the apparent wind, which comes from further ahead when she moves. Trim to the telltales and the masthead arrow." }
  ],
  "showMe": "Sailing with the wind from the side: the map shows the apparent wind coming from further ahead than the true wind.",
  "textStatus": "draft"
},
"term_starboard_tack": {
  "name": "Starboard tack",
  "alternatives": [],
  "short": "Sailing with the wind coming over the starboard side.",
  "what": "On starboard tack the wind comes from the starboard side, and the boom and the sails are out to port.",
  "showMe": "Wind from starboard, boom out to port: she is on starboard tack.",
  "textStatus": "draft"
},
"term_port_tack": {
  "name": "Port tack",
  "alternatives": [],
  "short": "Sailing with the wind coming over the port side.",
  "what": "On port tack the wind comes from the port side, and the boom and the sails are out to starboard.",
  "showMe": "Wind from port, boom out to starboard: she is on port tack.",
  "textStatus": "draft"
},
"term_tacking": {
  "name": "Tacking",
  "alternatives": [{ "term": "going about" }, { "term": "coming about" }],
  "short": "Turning the bow through the wind to the other side.",
  "what": "To tack, the boat turns towards the wind, through the no-go zone and on until the wind comes over the other side. With a self-tacking jib only the wheel is needed: the jib and the main swing across by themselves.",
  "mistakes": [
    { "mistake": "Turning too slowly.", "fix": "She stops head to wind (in irons). Turn steadily and keep her moving." }
  ],
  "showMe": "Close-hauled, the autopilot holding the wind angle: press “Tack” in the autopilot block of the Ropes tab and watch the bow turn through the wind and the jib cross by itself.",
  "textStatus": "draft"
},
"term_gybe": {
  "name": "Gybe",
  "alternatives": [{ "term": "jibe", "note": "American spelling" }],
  "short": "Turning the stern through the wind, so the boom crosses to the other side.",
  "what": "In a gybe the stern turns through the wind and the boom swings across the whole boat. Done on purpose, the mainsheet is hauled in first so the boom crosses a short way, under control. By accident (an accidental gybe) it crosses fast and hard: it can injure people and break gear.",
  "mistakes": [
    { "mistake": "Gybing with the mainsheet eased right out.", "fix": "The boom slams across. Haul the mainsheet in before turning, then ease it out on the new side." },
    { "mistake": "Steering too far downwind.", "fix": "The wind gets behind the main and it can gybe by itself. Stay a little off dead downwind." }
  ],
  "showMe": "The autopilot turns her through dead downwind with the mainsheet eased: the boom crosses fast (an accidental gybe) and the red area shows its path. In a controlled gybe the mainsheet is hauled in first.",
  "textStatus": "draft"
},
"term_luffing": {
  "name": "Luffing (sail flapping)",
  "alternatives": [],
  "short": "A sail flapping at its front edge because it is let out too far.",
  "what": "When a sail is eased more than the wind angle needs, or the boat turns too close to the wind, the air reaches both sides of the front edge and the sail flaps. It no longer drives the boat, and long flapping in strong wind wears it out.",
  "mistakes": [
    { "mistake": "Leaving a sail flapping in strong wind.", "fix": "It wears and can tear. Haul it in, or roll it away." }
  ],
  "showMe": "The mainsheet is eased right out: the mainsail flaps along its front edge. Haul the mainsheet in (Ropes tab) until the flapping just stops.",
  "textStatus": "draft"
},
"term_ease": {
  "name": "Ease",
  "alternatives": [{ "term": "let out" }],
  "short": "To let a rope out.",
  "what": "Easing lets a rope out slowly and under control, so a sail can go further out or a load comes off.",
  "textStatus": "draft"
},
"term_trim": {
  "name": "Trim / haul in",
  "alternatives": [{ "term": "sheet in" }],
  "short": "To pull a rope in; also, setting the sails to the wind.",
  "what": "Hauling in pulls a rope in. Trimming means setting each sail to the wind: haul in until it stops flapping, ease until it is not stalled.",
  "textStatus": "draft"
},
"term_twist": {
  "name": "Twist",
  "alternatives": [],
  "short": "How much the top of a sail opens out compared with its bottom.",
  "what": "With twist, the top of the sail stands further out than the bottom. A little twist is normal; more twist spills power, which helps in strong wind. The vang controls it on the mainsail, the sheet on the jib.",
  "showMe": "The vang is eased all the way: the top of the mainsail twists open. Haul the vang (Ropes tab) and the twist closes.",
  "textStatus": "draft"
},
"term_telltale": {
  "name": "Telltales",
  "alternatives": [{ "term": "tell-tales" }],
  "short": "Ribbons on the sails that show how the air flows.",
  "what": "Telltales are short ribbons near the front of the sails. Both sides streaming straight back: good trim. The far side drooping: pulled in too far. The near side lifting: let out too far.",
  "showMe": "Good trim: zoom in on the front of the mainsail; the telltales on both sides stream straight back.",
  "textStatus": "draft"
},
"term_no_go_zone": {
  "name": "No-go zone",
  "alternatives": [],
  "short": "The directions, about 45° either side of the wind, a sailing boat cannot sail in.",
  "what": "No sailing boat can sail straight into the wind. Within about 45° of it (30–50°, depending on the boat) the sails flap and she slows to a stop. To get upwind she zigzags, tacking from one side to the other.",
  "mistakes": [
    { "mistake": "Steering into the no-go zone.", "fix": "The sails flap and she stops. Turn away from the wind until the sails fill." }
  ],
  "showMe": "The map shows the no-go zone as a wedge towards the wind. She is sailing just outside it, close-hauled.",
  "textStatus": "draft"
},
"term_close_hauled": {
  "name": "Close-hauled",
  "alternatives": [{ "term": "beating", "note": "sailing close-hauled to get upwind" }],
  "short": "Sailing as close to the wind as she can, about 45° off it.",
  "what": "Close-hauled, the sails are pulled in tight and the boat sails as near to the wind as she can, just outside the no-go zone. She heels most on this point of sail.",
  "showMe": "Close-hauled: the wind 45° off the bow, both sails pulled in; she heels about 17°.",
  "textStatus": "draft"
},
"term_close_reach": {
  "name": "Close reach",
  "alternatives": [],
  "short": "Sailing with the wind about 60° off the bow, between close-hauled and a beam reach.",
  "what": "On a close reach the sails are eased a little from close-hauled. She sails fast and still heels well.",
  "showMe": "Close reach: the wind 60° off the bow, the sails eased a little; she sails at about 7.5 kn.",
  "textStatus": "draft"
},
"term_beam_reach": {
  "name": "Beam reach",
  "alternatives": [],
  "short": "Sailing with the wind at right angles to the boat.",
  "what": "On a beam reach the wind comes from the side, 90° off the bow, and the sails are eased about halfway. For many boats it is the fastest point of sail.",
  "showMe": "Beam reach: the wind from the side, the sails eased about halfway; she sails at about 8 kn.",
  "textStatus": "draft"
},
"term_broad_reach": {
  "name": "Broad reach",
  "alternatives": [],
  "short": "Sailing with the wind from behind the side, about 135° off the bow.",
  "what": "On a broad reach the wind comes over the back corner of the boat. The sails are eased well out; she heels little and the ride is easy.",
  "showMe": "Broad reach: the wind 135° off the bow, the sails eased right out; she hardly heels.",
  "textStatus": "draft"
},
"term_run": {
  "name": "Running",
  "alternatives": [{ "term": "run" }, { "term": "running downwind" }],
  "short": "Sailing with the wind from behind.",
  "what": "Running, the wind comes from (almost) straight behind and the sails are eased right out. She is slower than on a reach, and the boom can gybe across if the wind gets behind the mainsail.",
  "mistakes": [
    { "mistake": "Running dead downwind.", "fix": "The boom can gybe by accident. Steer a little off dead downwind, so the wind stays clearly on one side." }
  ],
  "showMe": "Running: the wind from almost straight behind, the sails right out; about 4.7 kn, slower than on a reach.",
  "textStatus": "draft"
},
"term_reef": {
  "name": "Reefing",
  "alternatives": [{ "term": "reducing sail" }],
  "short": "Making a sail smaller for strong wind.",
  "what": "Reefing makes the sails smaller, so the boat heels less and is easier to control in strong wind. Reef early, before the wind is strong.",
  "onThisBoat": "There are no reef lines: the main is made smaller by rolling part of it into the mast, and the jib by rolling part of it round the forestay; usually the jib first, then the main.",
  "mistakes": [
    { "mistake": "Waiting until the wind is already strong.", "fix": "Rolling sail away is harder and riskier under load. Make the sails smaller as soon as she heels too much." }
  ],
  "showMe": "The mainsail is rolled halfway into the mast: half the sail, less push.",
  "textStatus": "draft"
},
"term_preventer": {
  "name": "Preventer",
  "alternatives": [],
  "short": "A line that holds the boom out so it cannot gybe across.",
  "what": "A preventer runs from the end of the boom forward and back to the cockpit, holding the boom out when running, so it cannot swing across in an accidental gybe.",
  "onThisBoat": "This boat carries none, so the app teaches the controlled gybe: the mainsheet hauled in first.",
  "textStatus": "draft"
},
"term_north": {
  "name": "North",
  "alternatives": [{ "term": "N", "note": "short form" }],
  "short": "The direction 0° on the compass.",
  "what": "North is 0° (or 360°) on the compass; east is 90°, south 180°, west 270°. Winds are named for where they come from, so a north wind blows from the north.",
  "textStatus": "draft"
},
"term_east": {
  "name": "East",
  "alternatives": [{ "term": "E", "note": "short form" }],
  "short": "The direction 90° on the compass.",
  "what": "East is 90° on the compass, where the sun rises. An east wind blows from the east.",
  "textStatus": "draft"
},
"term_south": {
  "name": "South",
  "alternatives": [{ "term": "S", "note": "short form" }],
  "short": "The direction 180° on the compass.",
  "what": "South is 180° on the compass. A south wind blows from the south.",
  "textStatus": "draft"
},
"term_west": {
  "name": "West",
  "alternatives": [{ "term": "W", "note": "short form" }],
  "short": "The direction 270° on the compass.",
  "what": "West is 270° on the compass, where the sun sets. A west wind blows from the west.",
  "textStatus": "draft"
},
"term_compass_point": {
  "name": "Compass point",
  "alternatives": [{ "term": "point" }],
  "short": "One of the 32 named directions of the compass, 11¼° apart.",
  "what": "Before degrees, sailors named 32 directions: north, east, south and west, the four between them (north-east, south-east, south-west, north-west), and more between those. One point is 11¼°, so “two points off the bow” is about 22° to one side of straight ahead.",
  "textStatus": "draft"
},
"term_ahead": {
  "name": "Ahead",
  "alternatives": [],
  "short": "In front of the bow.",
  "what": "Ahead means in the direction the bow points; “dead ahead” is straight in front. With the engine, going ahead means moving forwards.",
  "textStatus": "draft"
},
"term_astern": {
  "name": "Astern",
  "alternatives": [],
  "short": "Behind the boat; also, moving backwards.",
  "what": "Astern means behind the stern. With the engine, going astern means moving backwards (reverse gear).",
  "textStatus": "draft"
},
"term_abeam": {
  "name": "Abeam",
  "alternatives": [{ "term": "on the beam" }],
  "short": "At right angles to the boat, straight out to one side.",
  "what": "Something abeam is at 90° to the boat’s centreline, level with her middle, to port or to starboard. A wind from abeam makes a beam reach.",
  "textStatus": "draft"
},
"term_quarter": {
  "name": "Quarter",
  "alternatives": [],
  "short": "The back corners of the boat, between abeam and astern.",
  "what": "The quarters are the back corners of the boat. Wind or waves “on the quarter” come from behind at an angle, about 135° off the bow; waves from there are the hardest to steer in.",
  "showMe": "Wind and waves on the starboard quarter: watch the wheel (the autopilot) keep correcting as the waves push her off course.",
  "textStatus": "draft"
},
"term_heading": {
  "name": "Heading",
  "alternatives": [{ "term": "course", "note": "strictly, the direction she moves over the ground" }],
  "short": "The compass direction the bow points.",
  "what": "The heading is the direction the bow points, in degrees from north: 0 north, 90 east, 180 south, 270 west. The autopilot’s Heading mode holds it.",
  "showMe": "The map shows her heading 060°, towards the north-east, with the wind from the side.",
  "textStatus": "draft"
},
"term_wind_direction": {
  "name": "Wind direction",
  "alternatives": [],
  "short": "Where the wind comes from, in degrees or compass names.",
  "what": "A wind is named for where it comes from: a north wind (a northerly) blows from the north towards the south. In degrees, a wind “from 060°” comes from the north-east.",
  "mistakes": [
    { "mistake": "Reading a wind “from 060°” as blowing towards 060°.", "fix": "It blows from 060° towards 240°: look towards 060° to face it." }
  ],
  "showMe": "Wind from 060° (north-east): the streaks blow from there across the boat.",
  "textStatus": "draft"
},
"term_knot": {
  "name": "Knot",
  "alternatives": [{ "term": "kn", "note": "short form" }],
  "short": "One nautical mile per hour: how speed is measured at sea.",
  "what": "Boat and wind speeds at sea are given in knots. One knot is one nautical mile (1,852 m) per hour, about 0.5 m/s or 1.85 km/h.",
  "textStatus": "draft"
},
"term_beaufort": {
  "name": "Beaufort scale",
  "alternatives": [{ "term": "force", "note": "as in “force 4”" }],
  "short": "Wind strength as a number from 0 to 12, judged by its effect on the sea.",
  "what": "The Beaufort scale names wind strengths from 0 (calm) to 12 (hurricane). Force 3 (7–10 kn) brings the first scattered white horses; force 4 (11–16 kn) fairly frequent ones; force 5 (17–21 kn) many.",
  "showMe": "10 kn, the top of force 3: the first scattered white horses. Raise the wind in the Wind tab to see more.",
  "textStatus": "draft"
},
"term_gust": {
  "name": "Gust",
  "alternatives": [{ "term": "puff" }],
  "short": "A sudden, short increase in the wind.",
  "what": "A gust is a burst of stronger wind lasting seconds, often from a slightly different direction. It can show on the water as a darker, rougher patch coming towards you. In a gust the boat heels more.",
  "mistakes": [
    { "mistake": "Holding the mainsheet tight through a strong gust.", "fix": "She heels hard and turns into the wind. Ease the main as the gust hits, and trim again when it has passed." }
  ],
  "showMe": "Gusty wind: watch upwind for a dark patch on the water. When it arrives, the strip shows GUST and she heels more.",
  "textStatus": "draft"
},
"term_lull": {
  "name": "Lull",
  "alternatives": [],
  "short": "A short drop in the wind.",
  "what": "A lull is a moment of weaker wind, often between gusts. The boat stands up and slows down, and the wind the sails feel comes from a little further ahead.",
  "textStatus": "draft"
},
"term_wind_shift": {
  "name": "Wind shift",
  "alternatives": [{ "term": "veer", "note": "the wind turns clockwise" }, { "term": "back", "note": "the wind turns anticlockwise" }],
  "short": "A change in the wind’s direction.",
  "what": "The wind’s direction keeps changing a little. A shift that comes from further ahead is a header: she has to bear away, or the sails flap. One from further behind is a lift: she can point closer to the wind.",
  "showMe": "Shifty wind with the autopilot holding the wind angle: watch her heading swing as the wind shifts.",
  "textStatus": "draft"
},
"term_bora": {
  "name": "Bora",
  "alternatives": [{ "term": "bura", "note": "the Croatian name, also used by sailors there" }],
  "short": "A cold, very gusty wind from the north-east in the Adriatic.",
  "what": "The bora blows from the north to north-east, down from the mountains onto the Adriatic coast, most often in winter. It comes in sudden, strong gusts and raises short, high waves with white crests.",
  "textStatus": "draft"
},
"term_jugo": {
  "name": "Jugo",
  "alternatives": [{ "term": "sirocco", "note": "the Italian name for the same kind of wind" }],
  "short": "A warm, humid wind from the south-east in the Adriatic.",
  "what": "The jugo blows from the south-east, warm and moist, and can bring rain and storms. Its name means “southern” in Croatian.",
  "textStatus": "draft"
},
"term_maestral": {
  "name": "Maestral",
  "alternatives": [],
  "short": "The summer sea breeze from the north-west on the Adriatic coast.",
  "what": "On summer days, when the coast gets warmer than the sea, a mild wind blows in from the sea from the north-west: the maestral.",
  "textStatus": "draft"
},
"term_heel": {
  "name": "Heel",
  "alternatives": [{ "term": "heeling" }],
  "short": "The boat leaning over to one side.",
  "what": "The wind’s push on the sails tips the boat over to leeward; the keel’s weight pulls her back. Some heel is normal; too much slows her and makes her hard to steer. Easing the sheets or making the sails smaller reduces it.",
  "mistakes": [
    { "mistake": "Hauling the sheets in harder when she heels too much.", "fix": "That makes more heel. Ease the mainsheet, or roll part of the sails in." }
  ],
  "showMe": "20 kn with the sails pulled in: she heels about 30°. Ease the mainsheet in the Ropes tab and she stands up.",
  "textStatus": "draft"
},
"term_weather_helm": {
  "name": "Weather helm",
  "alternatives": [],
  "short": "The boat’s pull to turn into the wind, felt on the wheel.",
  "what": "A heeling boat wants to turn her bow into the wind. To keep a straight course, the wheel must be held turned away from the wind. A little is normal; a lot means too much heel or too much mainsail: ease the main.",
  "showMe": "Heeled hard in 20 kn: the autopilot holds the wheel turned away from the wind to keep her straight. Ease the mainsheet and the wheel comes back towards the middle.",
  "textStatus": "draft"
},
"term_round_up": {
  "name": "Round-up",
  "alternatives": [{ "term": "broach", "note": "a violent round-up, often with waves from behind" }],
  "short": "The boat turning into the wind by herself, and the wheel cannot stop her.",
  "what": "Overpowered in a gust, the boat heels, the rudder loses its grip and she swings up into the wind with the sails flapping. Easing the mainsheet early stops it.",
  "mistakes": [
    { "mistake": "Fighting it with the wheel alone.", "fix": "A rudder turned hard over stops gripping. Ease the mainsheet: that takes away the force that turns her." }
  ],
  "textStatus": "draft"
},
"term_in_irons": {
  "name": "In irons",
  "alternatives": [],
  "short": "Stopped head to wind, with no steering.",
  "what": "Turned straight into the wind, the boat loses her drive: the sails flap, she slows and stops, and with no water flowing past the rudder the wheel does nothing. To get out, let her drift backwards with the wheel turned until the bow falls off the wind, or use the engine.",
  "showMe": "Heading straight into the wind at 6 kn: the sails flap, she slows down and stops, and the wheel no longer turns her.",
  "textStatus": "draft"
},
"term_head_up": {
  "name": "Head up",
  "alternatives": [{ "term": "luff up" }, { "term": "come up" }],
  "short": "To turn the bow towards the wind.",
  "what": "Heading up turns the bow closer to the wind; the sails then need hauling in, or they flap. The opposite is bearing away.",
  "textStatus": "draft"
},
"term_bear_away": {
  "name": "Bear away",
  "alternatives": [{ "term": "bear off" }, { "term": "fall off" }],
  "short": "To turn the bow away from the wind.",
  "what": "Bearing away turns the bow further from the wind; the sails then need easing out. Bearing away too far with the wind behind risks an accidental gybe.",
  "textStatus": "draft"
},
"term_stall": {
  "name": "Stall",
  "alternatives": [],
  "short": "A sail pulled in too far, so the air no longer flows smoothly round it.",
  "what": "A stalled sail looks full but drives poorly and makes more heel; the telltales on its far side droop or spin. Ease the sheet until they stream.",
  "showMe": "The mainsheet is hauled right in with the wind 60° off the bow: the main is stalled. Ease it to about 25 % in the Ropes tab and she speeds up.",
  "textStatus": "draft"
},
"term_hull_speed": {
  "name": "Hull speed",
  "alternatives": [],
  "short": "The speed a heavy boat can hardly go beyond: about 9 kn for this one.",
  "what": "A heavy boat pushes a wave along with her. Near about 1.34 × √(waterline length in feet) knots she sits in that wave, and more power hardly makes her faster. For this boat that is about 8.9 kn.",
  "showMe": "Full throttle, no wind: 2,500 rpm gives about 9.3 kn. With a third less throttle she still makes about 8 kn: the last of the power adds little speed.",
  "textStatus": "draft"
},
"term_fetch": {
  "name": "Fetch",
  "alternatives": [],
  "short": "How far the wind has blown over open water to reach you.",
  "what": "The longer the fetch and the stronger the wind, the bigger the waves. In a sheltered bay the fetch is short and the sea stays small; in the open sea it is long.",
  "showMe": "Sheltered water in 15 kn: small waves. Set “Waves” in the Wind tab to “Open sea”: the same wind makes much bigger waves.",
  "textStatus": "draft"
},
"term_white_horses": {
  "name": "White horses",
  "alternatives": [{ "term": "whitecaps" }],
  "short": "Breaking wave crests that show white.",
  "what": "When the wind reaches about 7–10 kn (force 3), the first wave crests break into white foam; the stronger the wind, the more of them.",
  "showMe": "22 kn in the open sea: white horses everywhere. At 6 kn there are none.",
  "textStatus": "draft"
},
"term_wave_height": {
  "name": "Wave height",
  "alternatives": [{ "term": "significant wave height" }],
  "short": "How high the bigger waves are, from trough to crest.",
  "what": "The wave height given in forecasts is the average of the highest third of the waves; single waves can be almost twice as high. The Waves block in the Wind tab shows it.",
  "showMe": "Coastal waves in 15 kn: the Waves block in the Wind tab says they are 0.7 m high, one every 3.8 s.",
  "textStatus": "draft"
},
"term_heave": {
  "name": "Heave",
  "alternatives": [],
  "short": "The boat rising and falling on the waves.",
  "what": "Heave is the up-and-down motion as the waves pass under the boat.",
  "showMe": "Open sea in 20 kn, the boat held still: she rises and falls by about 0.9 m each way.",
  "textStatus": "draft"
},
"term_pitch": {
  "name": "Pitch",
  "alternatives": [{ "term": "pitching" }],
  "short": "The bow rising and falling as the waves pass.",
  "what": "Pitch is the boat tipping nose up and nose down. Waves from ahead or from behind make her pitch most.",
  "showMe": "Waves from ahead: she pitches, bow up and down, by about 3°.",
  "textStatus": "draft"
},
"term_roll": {
  "name": "Roll",
  "alternatives": [{ "term": "rolling" }],
  "short": "The boat rocking from side to side.",
  "what": "Roll is the boat tipping from side to side. Waves from the side make her roll most.",
  "showMe": "Waves from the side: she rolls by about 5° each way.",
  "textStatus": "draft"
}
```

### 8.4 Data: Russian names and alternatives (copy exactly)

(Built as given. M23 changes some of these names after checking them against sources: see 9.2.1.)

These are drafts for the Russian-speaking reviewer (M24). The notes on Dutch origins could not be checked against a source from the cloud environment. Cells as in 6.3.2: alternatives are separated by `;`, and a ` — ` inside one separates its `term` from its `note`.

| id | `name` | `alternatives` (term — note) |
|---|---|---|
| `term_sheet` | шкот | — |
| `term_halyard` | фал | — |
| `term_port` | левый борт | бакборт — от голландского bakboord, старое морское слово |
| `term_starboard` | правый борт | штирборт — от голландского stuurboord, старое морское слово |
| `term_windward` | наветренный | — |
| `term_leeward` | подветренный | — |
| `term_true_wind` | истинный ветер | — |
| `term_apparent_wind` | вымпельный ветер | кажущийся ветер |
| `term_starboard_tack` | правый галс | — |
| `term_port_tack` | левый галс | — |
| `term_tacking` | поворот оверштаг | оверштаг |
| `term_gybe` | поворот фордевинд | — |
| `term_luffing` | заполаскивание | парус полощет — так говорят о самом парусе |
| `term_ease` | потравить | травить |
| `term_trim` | выбрать | подобрать |
| `term_twist` | твист | — |
| `term_telltale` | колдунчики | — |
| `term_no_go_zone` | мёртвая зона | левентик — строго говоря, положение носом точно на ветер |
| `term_close_hauled` | крутой бейдевинд | бейдевинд |
| `term_close_reach` | полный бейдевинд | — |
| `term_beam_reach` | галфвинд | — |
| `term_broad_reach` | бакштаг | — |
| `term_run` | фордевинд | курс фордевинд |
| `term_reef` | рифление | брать рифы |
| `term_preventer` | завал-тали | превентер — от английского preventer |
| `term_north` | север | норд — от голландского noord, так говорят на море и так же называют северный ветер; С — сокращение |
| `term_east` | восток | ост — от голландского oost, так говорят на море; В — сокращение |
| `term_south` | юг | зюйд — от голландского zuid, так говорят на море; Ю — сокращение |
| `term_west` | запад | вест — от голландского west, так говорят на море; З — сокращение |
| `term_compass_point` | румб | — |
| `term_ahead` | впереди | по носу — так говорят на судне |
| `term_astern` | за кормой | позади |
| `term_abeam` | на траверзе | траверз — направление под прямым углом к борту |
| `term_quarter` | раковина | — |
| `term_heading` | курс | — |
| `term_wind_direction` | направление ветра | — |
| `term_knot` | узел | уз — сокращение |
| `term_beaufort` | шкала Бофорта | баллы — «ветер 4 балла» |
| `term_gust` | порыв | — |
| `term_lull` | ослабление ветра | затишье |
| `term_wind_shift` | смена направления ветра | ветер заходит — смещается к носу; ветер отходит — смещается к корме |
| `term_bora` | бора | бура — хорватское название |
| `term_jugo` | юго | сирокко — итальянское название такого ветра |
| `term_maestral` | маэстрал | — |
| `term_heel` | крен | — |
| `term_weather_helm` | тенденция к приведению | — |
| `term_round_up` | приведение | брочинг — от английского broaching, резкое неуправляемое приведение |
| `term_in_irons` | в левентике | — |
| `term_head_up` | привестись | приводиться |
| `term_bear_away` | увалиться | уваливаться |
| `term_stall` | срыв потока | перетянутый парус |
| `term_hull_speed` | скорость корпуса | предельная водоизмещающая скорость |
| `term_fetch` | разгон волны | разгон |
| `term_white_horses` | барашки | белые гребни |
| `term_wave_height` | высота волны | значительная высота волны |
| `term_heave` | вертикальная качка | — |
| `term_pitch` | килевая качка | — |
| `term_roll` | бортовая качка | — |

Russian notes may contain a Latin word only where it names the original foreign word: exactly the words of `content/lang/latin-words.json` (9.2) after `CEST`; M23's Latin-letter check allows exactly those.

The Russian texts of these 58 entries are written by you (3.3). Several English texts quote UI labels (“Tack”, “Waves”, “Open sea”, GUST, the Ropes tab, the Wind tab); the Russian UI is written only in M23, so choose the Russian wording for each quoted label, use it the same way everywhere, and record it as an exported constant in `tests/glossary.test.ts`: `export const QUOTED_UI_LABELS: Record<string, string>` with the keys `autopilot.tack`, `waves.label`, `waves.open`, `instruments.gust`, `tab.ropes`, `tab.wind` and your Russian wording as values (check the exact key names in `content/lang/en/ui.json`; use the key whose English value is the quoted label). A test asserts that every Russian glossary text quoting one of these labels contains its wording. List it in "Decided in the M22 PR" too. `term_wind_shift`: the Russian alternatives (заходит / отходит: towards the bow / the stern) are not the same idea as the English veer / back (clockwise / anticlockwise); that is correct for each language, and the review document will show it.

### 8.5 Tests

`tests/glossary.test.ts`: `COMPLETE_IDS` gains the 58 M22 ids, so **every** registry id is now complete in `en` and `ru`. The groups test now expects the 7.2 table plus the 33 new ids in their groups (directions 14, wind 12, sailing 28, sea 9 entries). New show-me scenes (3.5; prototype values in brackets):
- `term_heel`: after 20 s (1,200 steps) `|boat.heelDeg|` 28–34° [30.8]; the same query with `ms=60`: 13–19° [16.0].
- `term_in_irons`: after 40 s (2,400 steps) boat speed below 1.5 kn [0.60].
- `term_hull_speed`: after 60 s, 9.1–9.5 kn [9.28]; `engine.rpm` 2,500.
- `term_close_hauled`: after 20 s, 6.0–6.7 kn [6.35] and `|boat.heelDeg|` 15–19° [17.0]; `term_beam_reach`: 7.9–8.5 kn [8.18]; `term_run`: 4.4–5.0 kn [4.72].
- `term_white_horses`: `significantHeightM(waveTrains(state.sea))` 2.15–2.35 m [2.24].
- `term_heading`: `boat.headingDeg` 60 at the start; after 20 s boat speed above 7 kn [8.18].
- `term_port_tack`: `rig.solution.side` +1 (boom to starboard); `term_starboard_tack`: −1.
- `term_gybe`: `dangerZone(state.rig)?.kind === 'sweep'` first at 6.0–7.0 s [6.52].
- `term_close_reach`: after 20 s, 7.2–7.8 kn [7.48].
- `term_wave_height`: `significantHeightM` 0.65–0.72 m [0.683] and the main train's `periodS` 3.7–3.9 s [3.83].
- Wave motion, the largest absolute value over the steps with 20 s < t ≤ 60 s: `term_heave` `boat.waves.heaveM` 0.80–1.05 m [0.92]; `term_pitch` `boat.waves.pitchDeg` 2.4–3.1° [2.76]; `term_roll` `boat.waves.rollDeg` 4.3–5.4° [4.84].
- `term_beaufort`: `significantHeightM` above 0 (waves at 10 kn).
All speeds are `mpsToKn(state.boat.speedMps)`.
`tests/search.test.ts` new cases: `searchGlossary('норд', 'ru')` finds `term_north` with `matched` `'норд'`; `searchGlossary('бакборт', 'ru')` finds `term_port`; `searchGlossary('jibe')` finds `term_gybe`; `searchGlossary('north', 'ru')` is empty.

Before you finish, run every M22 show-me link once in the scene helper and read the values the text claims (speeds, heel, wave height); report them in the PR. A text that the scene does not show is a finding for the owner, not something to rewrite.

### 8.6 Browser checks (`scripts/shots-m22.mjs`)

Scenes (`M22_SCENES`, every size): `learn-port` `?learn=term_port`; `learn-north` `?learn=term_north`; `learn-gybe` `?learn=term_gybe`.
Live checks (`liveM22Checks`, phone): open the Learn tab's "Directions and sides (14)" group: 14 buttons. Search `force` → `term_beaufort` with "also: force". `?learn=term_heel`: tap `learn-show-me` → address bar has `ws=20`; Back → no `ws=20`. `auditPage` on `?learn=term_north`: clean.

### 8.7 Done when

All M22 checks in `WORKFLOW.md` pass on the phone; the tests above pass; every registry id is complete in English and Russian; the scene values reported in the PR.

### 8.8 Not in M22

No Russian on screen (M23). No pictures. No rules of the road (later "Navigation" module).

### 8.9 Decided in the M22 PR

(The builder adds what it decided here; the owner's answers on the PR are added below.)

---
## 9. M23: The app in Russian

**Independent review: required** (a new setting and URL key, every UI string, a page reload on change, and the language rules that every later language will follow).

### 9.1 Files

New: `content/lang/ru/ui.json`, `content/lang/latin-words.json`, `src/model/languages.ts`, `tests/languages.test.ts`, `scripts/shots-m23.mjs`.
Changed: `content/lang/en/ui.json` (new keys 9.6), `content/areas/adriatic.json` (`names`, `namesStatus` removed), `src/model/settings.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/app/urlSync.ts`, `src/app/app.ts`, `src/ui/i18n.ts`, `src/ui/panel.ts`, `src/ui/learnTab.ts`, `src/ui/clockPanel.ts`, `src/ui/enginePanel.ts`, every file in `src/ui` that calls `partInfo` (`clutchDrawing.ts`, `infoCard.ts`, `labels3d.ts`, `realisticPanel.ts`, `ropeControls.ts`, `ropesTab.ts`, `stationDrawing.ts`: 10 call sites in these 7 files, the complete set), `src/ui/mapView.ts` (scale and buoy letters, 9.3), `content/lang/ru/glossary.json` (the name changes and added alternatives of 9.2.1, and anything the Latin rule of 9.6 finds), `tests/urlState.test.ts` (new cases), `tests/i18n.test.ts` (iterates every language of `UI_STRINGS`), `scripts/shots.mjs`, `docs/CODE_MAP.md`, `docs/BOAT_REFERENCE.md` (the Russian rope names in its tables follow 9.2.1). The `Language` type in `i18n.ts` is removed (codes are strings). `AreaData` (`typeof adriatic`) loses `names`; its only user is `clockPanel.ts`.

### 9.2 Data

- **`content/lang/ru/ui.json`**: every key of `content/lang/en/ui.json`, in the same order, translated (3.3); `"language.name": "Русский"`. Placeholders (`{name}`) stay exactly as in English. Abbreviations printed on the boat's instruments stay as printed: `AWA`, `AWS`, `TWA`, `TWS`, the `T` on the true-wind needle (explained in Russian, as the English hint explains them). Compass letters drawn by the app (`wind.dial.north` and the like) become Russian (`С`).
- **Area names**: new keys `area.adriatic` in both `ui.json` files (`Adriatic (Split)`, `Адриатика (Сплит)`); remove `names` and `namesStatus` from `content/areas/adriatic.json` (the strings files hold every visible text). `clockPanel.ts` writes `t(`area.${area.id}`)`.
- **`content/lang/latin-words.json`** (Latin words allowed on a Russian screen; the M23 tests and browser checks use it):

```json
{
  "$comment": "PHASE4_SPEC 9.2. Words in Latin letters allowed on a screen in a language with another script: instrument abbreviations, makers' names, buttons printed on the boat, time zones, and the foreign words that alternative-name notes quote. The words of every label on the boat (boatLabelsFor) are allowed too (added in code).",
  "words": ["AWA", "AWS", "TWA", "TWS", "T", "English", "WebGL", "B&G", "Hanse", "Seldén", "Lewmar", "Furlex", "Allpa", "Rodkicker", "GitHub", "START", "STOP", "POWER", "IN", "OUT", "MAX", "RPM", "UTC", "CET", "CEST", "bakboord", "stuurboord", "noord", "oost", "zuid", "west", "broaching", "saildrive", "furling", "winch", "sprayhood", "outhaul", "kicker", "preventer"]
}
```

#### 9.2.1 Russian names checked against sources: changes to make (copy exactly)

The Russian names of M20–M22 were checked against the sources of 3.6 ([R1]–[R8]). Most are confirmed (list at the end of this section). Change the following in `content/lang/ru/glossary.json`. Keep every other field and the order of the entries. Then apply rule 3.3 (one term for one thing everywhere): in **every** Russian text field of every entry (`short`, `what`, `onThisBoat`, `mistakes`, `showMe`), replace the old words with the new ones in the right grammatical case, and change nothing else in those sentences.

**Name changes** (the `alternatives` given here replace the old list completely):

| id | old `name` | new `name` | new `alternatives` | why (source) |
|---|---|---|---|---|
| `sail_gennaker` | генакер | геннакер | `[{ "term": "генакер", "note": "другое написание" }]` | Russian Wikipedia's article is *Геннакер* [R4] |
| `rope_spi_halyard` | фал генакера | фал геннакера | unchanged: `[{ "term": "спинакер-фал" }]` | follows `sail_gennaker` |
| `rope_jib_furling_line` | закруточный конец стакселя | линь закрутки стакселя | `[]` | the yacht-school textbooks call it «линь закрутки стакселя» ([R1] p. 10, [R3] p. 13); «закруточный конец» is in no source |
| `rope_main_furling_line` | закруточный конец грота | линь закрутки грота | `[]` | the same word for the mainsail's line (by analogy with [R1], [R3]: the textbooks describe only jib furling) |
| `part_gooseneck` | гусёк | вертлюг гика | `[{ "term": "гусёк", "note": "так тоже говорят на яхтах" }]` | «вертлюг гика» is in Russian Wikipedia's *Устройство паруса* [R4]; in Russian dictionaries «гусёк» has no sailing meaning |
| `term_reef` | рифление | взятие рифов | `[{ "term": "брать рифы" }]` | «взятие рифов», «взять рифы» [R5], «на гроте взяты рифы» ([R3] p. 22); «рифление» means roughening a surface [R7] |
| `term_round_up` | приведение | брочинг | `[{ "term": "приведение", "note": "резкое неуправляемое приведение к ветру" }]` | Russian Wikipedia's *Брочинг*: sudden uncontrollable turns of the yacht towards the wind [R4]; the textbooks use «брочинг» ([R2] p. 33, [R3] pp. 27–28) |

**Replacements in the texts** (all entries, every case form; keep a capital letter where the old word had one: Геннакер, Линь закрутки, Вал закрутки, Вертлюг гика, Взятие рифов, Брочинг. A rope's name quoted as a button or label in `showMe`, such as «Закруточный конец грота», becomes the new name with a capital: «Линь закрутки грота»):

| old | new | forms |
|---|---|---|
| генакер | геннакер | генакера → геннакера, генакером → геннакером and so on (the new alternative «генакер» itself stays) |
| закруточный конец (грота / стакселя) | линь закрутки (грота / стакселя) | закруточного конца → линя закрутки; закруточному концу → линю закрутки; закруточным концом → линём закрутки; закруточном конце → лине закрутки |
| закруточный стержень грота, and any other «стержень» for the same thing (in `part_main_furling_gearbox`, for example «вращает стержень внутри мачты» → «вращает вал внутри мачты») | вал закрутки грота, вал | вала закрутки, валом закрутки |
| гусёк (in `part_gooseneck`'s texts) | вертлюг гика | вертлюга гика, вертлюгом гика |
| рифление (in `term_reef`'s texts) | взятие рифов | взятия рифов, взятием рифов |
| приведение (in `term_round_up`'s texts only) | брочинг | брочинга, брочингом. «тенденция к приведению» (`term_weather_helm`) stays: that is a different thing |

**One text to rewrite** (`term_starboard`, `mistakes[0].fix`): the English tip counts the letters of the English words “port” and “left”, which means nothing on a Russian screen (one language at a time, 3.1). Replace the Russian fix with exactly: `Подсказка: ночью левый борт показывает красный ходовой огонь, правый — зелёный.` (Russian Wikipedia, *Штирборт* [R4]: штирборт is marked by a green light at night, бакборт by a red one.) The English text stays as it is.

**Alternatives to add** (append at the end of the entry's `alternatives`, in this order):

| id | add | source |
|---|---|---|
| `term_close_hauled` | `{ "term": "острый бейдевинд" }` | [R1] p. 30, [R2] p. 40, [R3] p. 47 |
| `term_beam_reach` | `{ "term": "галфинд", "note": "другое написание" }`, then `{ "term": "полветра" }` | [R1] p. 22 («Галфвинд» или «Галфинд»); [R4] *Курс относительно ветра* |
| `term_run` | `{ "term": "полный ветер", "note": "так говорят: «идти полным ветром»" }` | [R4] *Курс относительно ветра* |
| `term_gybe` | `{ "term": "поворот через фордевинд" }` | [R1] p. 26, [R4] *Оверштаг*, [R5] |
| `term_trim` | `{ "term": "добрать", "note": "выбрать до конца" }` | [R1] p. 8, [R2] p. 15 («полностью добран») |
| `engine_control` | `{ "term": "РУД", "note": "ручка управления двигателем" }` | [R3] p. 6 |
| `part_jib_furler` | `{ "term": "барабан закрутки", "note": "так называют нижнюю часть закрутки, на которую наматывается линь" }` | [R1] pp. 9–10, [R2] pp. 13–14, [R3] p. 13 |

**Confirmed, no change** (for the record and the M24 reviewer; nothing to do): гика-шкот and стаксель-шкот ([R1] p. 4, [R4] *Шкот*); грота-фал ([R2] p. 15, [R3] p. 47); оттяжка гика, топенант, завал-тали ([R4] *Гик*, [R6]); оттяжка шкотового угла; закрутка стакселя ([R1] p. 29); штаг and форштаг, ахтерштаг, ванты, краспицы ([R4], [R1] p. 3); шкаторины and the corners фаловый, галсовый, шкотовый угол ([R4] *Устройство паруса*); перо руля ([R2] p. 5, [R5]); штурвал ([R1] p. 4); лебёдка ([R3] p. 43); левый and правый борт with бакборт and штирборт ([R4] *Штирборт*); наветренный, подветренный ([R3] p. 28); истинный and вымпельный ветер, «кажущийся ветер» as the alternative ([R4]); правый and левый галс, поворот оверштаг, поворот фордевинд, крутой and полный бейдевинд, галфвинд, бакштаг, фордевинд, левентик ([R1], [R2], [R4], [R5]); «ветер заходит / отходит» ([R5]); норд, ост, зюйд, вест ([R8]); румб, траверз, раковина ([R4], [R5], [R6]); узел and `уз` ([R4]); шкала Бофорта and баллы ([R4], [R3] p. 4); бора, сирокко ([R4]); крен, бортовая, килевая and вертикальная качка ([R4] *Качка*); срыв потока ([R4]); брашпиль, леер, кокпит, авторулевой ([R4], [R5]).

#### 9.2.2 Words for the Russian UI (`content/lang/ru/ui.json`; use exactly)

Translate every `ui.json` string sentence by sentence (3.3), but use these words for these things, changing only the grammatical case. The registry names of M20–M22 (with 9.2.1) win everywhere else: a rope, sail, part or sailing word in a UI string is called by its glossary `name`. Sources are given where one exists; the rest are this plan's choices (draft, for the sailor's review).

| English in `ui.json` | Russian | source / note |
|---|---|---|
| rope (a line on the boat) | конец, концы | the tab is «Концы» (M22, `QUOTED_UI_LABELS`); where «конец» would be read as "end", write «снасть» |
| tail, end of a rope (the part you hold) | ходовой конец | [R5] |
| sheet / main sheet / jib sheet | шкот / гика-шкот / стаксель-шкот | [R1] p. 4 |
| halyard | фал | [R4] |
| haul in, pull in, trim | выбрать, выбирать | [R1] p. 11, [R5] |
| ease, let out | потравить, травить | [R2] p. 21, [R5] |
| paid out (rope let out) | вытравлено | write `Вытравлено: {m} м` (no noun after a number, 3.3) |
| eased (a control in %) | потравлено | `Потравлено: {value} %` |
| furl / roll in | закрутить (убрать) | [R1] p. 10: «закручивание (уборка)» |
| unfurl / roll out | раскрутить (поставить) | [R1] p. 10: «раскручивание (постановка)» |
| furling line | линь закрутки | 9.2.1 |
| hoist | поднять | [R1] p. 8 |
| taut / slack | выбран втугую / провис | `state.slackBy`: `провис, запас: {m} м` |
| fighting (two ropes pulling against each other) | перетягивание | like a tug of war; `legend.fighting`: `Красный: этот конец тянет против другого (перетягивание)` |
| clutch / clutch bank | стопор / блок стопоров | glossary names |
| open / closed (clutch) | открыт / закрыт | `real.clutch.openShort`: `ОТКРЫТ` |
| winch / winch handle / drum | лебёдка / ручка лебёдки / барабан | glossary names, [R3] p. 43 |
| turn (of rope on a winch) | шлаг | [R5]; `{n} ↻ по часовой` (number before a symbol, not a noun) |
| self-tailer, jaw | самостопорящий зажим | plan's choice |
| winch in | выбрать лебёдкой | |
| crank / 1st gear / 2nd gear | вращать ручку / 1-я скорость / 2-я скорость | |
| cut out (electric winch) | отключилась | |
| station (where you stand) | место | `real.stations.label`: `Где вы стоите`; Port / Starboard / Helm / Mast: `Левый борт` / `Правый борт` / `Штурвал` / `Мачта` |
| side deck | боковая палуба | |
| in-mast furling gearbox / socket / switch | редуктор закрутки грота / гнездо / переключатель | glossary name |
| wheel / rudder | штурвал / перо руля | [R1] p. 4, [R2] p. 5 |
| bow / stern | нос / корма | |
| port / starboard (long) | левый борт / правый борт | `wind.side.*`, `wind.dial.port` / `wind.dial.starboard` (`левый борт` / `правый борт` in lower case), `real.station.*`, `cam.side-*` (`Борт (левый)` / `Борт (правый)`) |
| Port / Stbd (camera short labels `cam.short.side-port` / `cam.short.side-starboard`) | ЛБ / ПБ | |
| P / S (instrument side letters `instruments.side.p` / `instruments.side.s`) | Л / П | `instruments.label` explains them: `Л — левый борт, П — правый борт` |
| windward / leeward | наветренный / подветренный | [R3] p. 28 |
| luff up (turn towards the wind) | привестись | [R1] p. 26 |
| bear away | увалиться | [R1] p. 12 |
| head to wind | левентик | `wind.preset.head`: `Левентик (носом на ветер)`; [R1] p. 7 |
| points of sail `pos.*` | the glossary names, capitalised: `В мёртвой зоне`, `Крутой бейдевинд`, `Полный бейдевинд`, `Галфвинд`, `Бакштаг`, `Фордевинд` | `pos.no_go`: `В мёртвой зоне` |
| wind presets `wind.preset.*` | `Левентик (носом на ветер)`, `45° правого галса`, `Галфвинд правого галса`, `Бакштаг правого галса`, `Фордевинд (175°)` | «бейдевинд правого галса» [R1] p. 24 |
| tack (manoeuvre) / gybe | поворот оверштаг / поворот фордевинд | the autopilot buttons: `Поворот` (pinned) and `Фордевинд` |
| accidental / controlled gybe | неуправляемый / управляемый поворот фордевинд | |
| by the lee | ветер с подветренного борта | `alert.byTheLee`: `Ветер с подветренного борта: опасность поворота фордевинд` |
| GYBE! / ROUND-UP (alerts) | ФОРДЕВИНД! / БРОЧИНГ | capitals as in English; `ROUND-UP` follows 9.2.1 |
| heel | крен | `Крен {deg}° {side}` |
| heading / HDG | курс / КУРС | |
| AUTO | АВТО | |
| True / App (strip) | Ист. / Вымп. | |
| true wind / apparent wind | истинный ветер / вымпельный ветер | [R4] |
| no-go zone | мёртвая зона | glossary name |
| telltales / streaming | колдунчики / вытянуты назад | glossary name |
| luffing (a sail) / stalled / blanketed | полощет / срыв потока / в ветровой тени грота | a verb, so it differs from the entry name «заполаскивание» on purpose; [R4] *Курс относительно ветра* («полощут»), [R2] p. 38 («в ветровой тени грота») |
| flogging / wear | полоскание / износ | |
| kn | уз | 3.1 |
| Beaufort {force} | `по Бофорту: {force}` | no noun after a number (3.3) |
| gust / lull / shift | порыв / ослабление ветра / смена направления ветра | glossary names; `GUST` → `ПОРЫВ` (pinned) |
| waves: Flat / Sheltered / Coastal / Open sea | Гладкая вода / Закрытая бухта / У берега / Открытое море | `Открытое море` pinned; `waves.label`: `Волны` (pinned) |
| engine Ahead / Neutral / Astern | Вперёд / Нейтраль / Назад | `engine.gear.astern`: `Передача: задний ход, винт толкает яхту назад` |
| engine lever / rpm | рукоятка газ-реверс / об/мин | glossary name; 3.1 |
| propeller | гребной винт | [R1] p. 29 |
| autopilot Standby / Heading / Wind | Ожидание / Курс / Ветер | |
| Held still | Яхта стоит | |
| tabs Ropes / Wind / View / Learn | Концы / Ветер / Вид / Обучение | `Концы` and `Ветер` pinned (M22); `Обучение`: this plan's choice |
| Learn-tab labels | `learn.alternatives`: `Также называют: {terms}`; `learn.textDraft`: `Этот перевод ещё не проверен моряком.` | the M23 checklist in WORKFLOW quotes them |

### 9.3 Model and app

`src/model/languages.ts` (pure, data only):

```ts
/** content/lang/<code>/ui.json, by code (import.meta.glob, eager). */
export const UI_STRINGS: Readonly<Record<string, Readonly<Record<string, string>>>>;
export const DEFAULT_LANGUAGE = 'en';
/** Codes that have both ui.json and glossary.json: 'en' first, then the others sorted. */
export const LANGUAGES: readonly string[];
export function isLanguage(code: string): boolean;
/** A language's own name (its ui.json "language.name"). */
export function languageName(code: string): string;
/** Allowed Latin words (latin-words.json plus every word of every label on the boat, boatLabelsFor). */
export function latinAllowed(): ReadonlySet<string>;
```

- `Settings.language: string` (4.1), `DEFAULT_SETTINGS.language = 'en'`.
- URL `lang` (4.2): read if `isLanguage`, written right after `detail` when not `en`.
- `reset` keeps `language` (as it keeps `detail` and `debug`). `openScene` keeps it (with `detail` and `debug`). The `popstate` handler: if the link's language differs from the current one, `location.reload()` (the address bar already holds it); otherwise as in M20.
- **Changing the language reloads the page** (one way, chosen because every element is built once with `t()`): the View tab's Language control calls `window.location.replace(pathname + serializeUrlState({ ...state, settings: { ...state.settings, language: code } }) + hash)`.
- `app.ts`, right after `parseUrlState` and before anything is built: `setLanguage(state.settings.language)`; `document.documentElement.lang = currentLanguage()`; then `document.title = t('app.title')` as now.

`src/ui/i18n.ts`:

```ts
import en from '../../content/lang/en/ui.json';
export type StringKey = keyof typeof en;
/** Sets the language for t() and part(); an unknown code gives 'en'. */
export function setLanguage(code: string): void;
export function currentLanguage(): string;
/** As before; the string of the current language (the English string only if a key were missing, which the tests rule out). */
export function t(key: StringKey, params?: Record<string, string | number>): string;
/** partInfo in the current language. Every UI caller uses this instead of partInfo. */
export function part(id: string): PartInfo | undefined;
/** Whole number with the language's thousands separator (`number.thousandsSeparator`): en 2,500; ru 2 500 (no-break space). */
export function formatThousands(value: number): string;
```

- Every `partInfo(` call in `src/ui` becomes `part(`; `learnTab.ts` uses `learnEntry(id, currentLanguage())`, `searchGlossary(q, currentLanguage())`, `groupEntries(g, currentLanguage())`.
- `enginePanel.ts`: both `toLocaleString('en-US')` calls become `formatThousands`.
- `clockPanel.ts` `dateText`: `t('clock.date', { weekday, day, month, year })` (new key; English `{weekday} {day} {month} {year}` gives today's text). Russian months in `clock.month.*` are in the genitive (`июня`), weekdays lower case.

**More rules (from the builder check):**
- **Load keeps the language:** the `load` reducer returns `{ ...action.state, settings: { ...action.state.settings, language: state.settings.language } }` (this covers the practice button in `realisticPanel.ts`, `openScene` and `popstate`). `reset` takes `language` with `debug` and `detail` from the current settings.
- **Popstate with another language:** set the sync's `pending = location.search` first, then `location.reload()`.
- **`app.ts`:** parse the link into a variable first (`const initial = parseUrlState(...)`), call `setLanguage(initial.settings.language)`, set `document.documentElement.lang` and `document.title`, then `createStore(initial)`.
- **Quote marks:** new key `quote.label` (`“{text}”` in English, `«{text}»` in Russian) and `export function quoted(text: string): string` in `i18n.ts`; the five places that write “ ” by hand (`infoCard.ts`, `ropesTab.ts`, `ropeControls.ts`, `realisticPanel.ts` twice) and the Learn tab's `learn.boatLabel` use it.
- **Map:** the scale bar text uses a new key `map.scale` (`{metres} m` / `{metres} м`); the buoys' letters on the map are drawn through `wind.dial.north`, `wind.dial.east`, `wind.dial.south`, `wind.dial.west` (the area file keeps `N`/`E`/`S`/`W` as ids).
- **Engine:** the tachometer's aria label also passes its `rpm` through `formatThousands`.
- **Learn tab:** every call of `learnEntry`, `glossaryText`, `searchGlossary` and `groupEntries` in `learnTab.ts` passes `currentLanguage()`.
- **Strings that must be translated, not kept:** every visible English word that is not in `latin-words.json` or a boat label, including the strip's `HDG`, `AUTO`, `App`, the strip's `GUST` (`instruments.gust`), the alerts `GYBE` and `ROUND-UP` (`alert.*`), the `OPEN` badge, and `Beaufort`. **The debug overlay stays English** (a developer tool): its `debug.*` keys may stay English in `ru`, and the overlay is not scanned.
- `t(`area.${area.id}` as StringKey)` (a template key needs the cast, as elsewhere).

### 9.4 UI

**View tab, first block** (`panel.ts`, before the camera block): a `fieldset class="field segmented"` (`data-testid="language-setting"`), legend `view.language.label`, one radio segment per entry of `LANGUAGES` (`data-testid="language-<code>"`), each labelled with `languageName(code)` (every language is named in its own language, never translated), the current one checked; hint `view.language.hint`. Choosing one reloads the page (9.3).

Russian text may be longer than English: on the phone every button and segment must still show its whole text (wrap to two lines rather than clip). Fix layouts with CSS (`white-space: normal`, `min-height` instead of `height`, `overflow-wrap: anywhere` on long words) only where the browser check below finds clipped text; do not shorten the Russian below the meaning of the English.

### 9.5 Strings

New keys in **both** `ui.json` files:

| Key | English | Russian |
|---|---|---|
| `view.language.label` | Language | Язык |
| `view.language.hint` | The whole app switches to this language. The page reloads. | Всё приложение переходит на этот язык. Страница перезагрузится. |
| `number.thousandsSeparator` | , | (U+00A0, no-break space) |
| `clock.date` | {weekday} {day} {month} {year} | {weekday}, {day} {month} {year} |
| `area.adriatic` | Adriatic (Split) | Адриатика (Сплит) |
| `quote.label` | “{text}” | «{text}» |
| `map.scale` | {metres} m | {metres} м |

### 9.6 Tests

`tests/languages.test.ts`:
1. `LANGUAGES` is `['en', 'ru']`; `languageName('ru')` is `Русский`.
2. Every language's `ui.json` has exactly the keys of `en`, every value non-empty (`trim()` for all keys except `number.thousandsSeparator`, which only needs `length > 0`: `trim()` removes U+00A0), and for every key the same set of `{placeholders}` as `en`. `tests/i18n.test.ts` applies its non-empty check the same way to every language.
3. **Latin scan**, for every language whose `language.name` has no Latin letter (today `ru`): in every `ui.json` value except the `debug.*` keys, and every glossary text field (`name`, alternatives' `term` and `note`, `short`, `what`, `onThisBoat`, `mistakes`, `showMe`): remove `{placeholders}` (`/\{\w+\}/g`), normalise to NFC, then every run of 2 or more Latin letters (`/[A-Za-zÀ-ÿ&]{2,}/g`) must be in `latinAllowed()` (compared case-insensitively; boat-label words are `label.match(/[A-Za-zÀ-ÿ&]+/g)`). The same values and fields of a language other than `en` contain no “ or ” (U+201C, U+201D). The `ru` values identical to English (`ui.json` only, `debug.*` not counted) are fewer than 20 and each is listed in the test with its reason (known: `view.step.option`, `instruments.timeScale`, `instrument.aws`, `instrument.tws`, `real.gearbox.in`, `real.gearbox.out`). If the scan finds Latin words in the M20–M22 Russian glossary texts, translate them; add a word to `latin-words.json` only for a quoted foreign word in an alternative's note or a maker's name, and list additions in 9.10.
4. For every key of `QUOTED_UI_LABELS` (M22, `tests/glossary.test.ts`), the `ru` value of that key contains the recorded wording; if M23 chooses a better Russian label, it changes the constant and the glossary texts to match in the same PR.
5. Every `GROUPS` group has a `learn.group.<group>` key, every distinct registry `kind` a `learn.kind.<kind>` key, every key of the registry's `statusValues` a `learn.status.<status>` key, every area id (`AREAS`) an `area.<id>` key.
6. `t()` after `setLanguage('ru')` returns the Russian text; `setLanguage('xx')` gives English; `part('rope_vang')` in `ru` has the name `оттяжка гика`; `formatThousands(2500)` is `2,500` in `en` and `2 500` in `ru`. Reset the language to `en` after each test.
7. URL (`tests/urlState.test.ts`): `?lang=ru` → `settings.language` `ru`; `?lang=xx` → `en`; serialize writes `…&detail=low&lang=ru…` and nothing for `en`; `reset` keeps `ru`; existing URL tests pass unchanged.
8. **Checked Russian names (9.2.1)** (`tests/languages.test.ts`): for the seven ids of the name-change table, `glossaryText(id, 'ru')` has the new `name` and exactly the given `alternatives`; each added alternative of 9.2.1 is in its entry's `alternatives` (same `term` and `note`). No Russian `name`, `short`, `what`, `onThisBoat`, `mistakes` or `showMe` of any entry matches `/генакер|закруточн|рифлени|гусёк/i` (the words may stay only as alternatives). For `close_hauled`, `close_reach`, `beam_reach`, `broad_reach` and `run`, the `ru` value of `pos.<key>` is the Russian `name` of `term_<key>` with its first letter in upper case; `tab.view` is `Вид` and `tab.learn` is `Обучение`.

### 9.7 Browser checks (`scripts/shots-m23.mjs`)

Labels contain `m23` (so `openPage` adds `held=1&sea=flat&clock=0` unless the query has them). Scenes (`M23_SCENES`, every size, all with `lang=ru`; tabs opened with the scene loop's `tab` option, by the tab's Russian name): `ru-ropes` `?lang=ru&wd=90&ws=12&sel=rope_vang`; `ru-wind` `?lang=ru&wd=90&ws=12` on the Wind tab; `ru-view` the same on the View tab; `ru-map` `?lang=ru&wd=90&ws=12&cam=map`; `ru-learn` `?lang=ru&learn=rope_vang`; `ru-realistic` `?lang=ru&mode=realistic`; `ru-clock` `?lang=ru&clock=1`, then tap `clock-chip` (the card open). `clock=1` is not a link key (it is ignored), but its presence stops `openPage` from adding `clock=0`.
Live checks (`liveM23Checks`, phone):
1. `?lang=ru`: `html[lang="ru"]`; the four tabs read the `ru` values of `tab.*`; `language-ru` is checked.
2. **Latin scan:** for each tab of `?lang=ru&wd=90&ws=12` (Ropes, Wind, View, Learn with `learn=rope_vang`), for `?lang=ru&mode=realistic` and for `?lang=ru&cam=map`: every visible text node not inside `a`, `input`, `textarea`, `[data-testid="build-version"]` or the debug overlay (debug off): each run of 2+ Latin letters is in the allowed set (`latin-words.json` plus the boat-label words, passed in from Node, compared case-insensitively). Also: no “ or ” (U+201C, U+201D) in any text node. (The buoy letters on the map are drawn on the canvas, which the scan cannot read; the `wind.dial.*` keys' test covers them.)
3. **Clipping:** in the same views (the map included), every `button`, `.segment`, `.tab` and `label` whose bounding box is at least 2 × 2 px, that is not inside `[hidden]` or `[aria-hidden="true"]` and is not `.visually-hidden`: `scrollWidth <= clientWidth + 1`.
4. Open the View tab; click the `label.segment` that contains `[data-testid="language-en"]` (the radio itself is invisible) → the page reloads; the address bar has no `lang`; `#tab-ropes` reads "Ropes". Open the View tab again and choose Русский the same way → reloads with `lang=ru`.
5. `?lang=ru&learn=term_north`: `learn-name` is `север`; `learn-alternatives` contains `норд`; `learn-text-status` is visible. Search `норд` from the groups → `learn-hit-term_north`.
6. `?lang=ru&learn=sail_gennaker`: `learn-name` is `геннакер`, `learn-alternatives` contains `генакер`; `?lang=ru&learn=term_round_up`: `learn-name` is `брочинг`.
7. `?lang=ru&learn=rope_vang`: set `window.__m23 = 1`, tap `learn-show-me`, then Back → the address bar keeps `lang=ru` both times, and `window.__m23` is still 1 (no reload).
8. `auditPage` on the Learn tab and the View tab in Russian: clean.

### 9.8 Done when

All M23 checks in `WORKFLOW.md` pass on the phone; the tests above pass; the six scenes looked at at phone size; nothing clipped; `CODE_MAP.md` updated (`languages.ts`, `ui.json` per language).

### 9.9 Not in M23

No third language. No decimal comma. The debug overlay stays English. The browser's own date and time boxes (clock card) follow the phone's language, and `index.html`'s description and `<noscript>` text stay English (known limitations, said in the PR). No right-to-left layout. No translation of the words printed on the boat or of the instrument abbreviations. No sailor review (M24 prepares it).

### 9.10 Decided in the M23 PR

(The builder adds what it decided here; the owner's answers on the PR are added below.)

---

## 10. M24: Review document and sign-off

**Independent review: not needed** (a generated document, checks and docs; no behaviour changes).

### 10.1 Files

New: `scripts/review-doc.mjs`, `scripts/review-doc.d.mts` (`export function buildReviewDoc(code: string): string;`, so the TypeScript test can import it), `docs/review/ru.md` (generated, committed), `docs/LANGUAGES.md`, `scripts/shots-m24.mjs`.
Changed: `package.json` (script `review-doc`), `tests/glossary.test.ts` (the review document is up to date), `README.md`, `docs/ROADMAP.md`, `docs/PHASE4_SPEC.md` (status line, "Decided in the M24 PR"), `docs/CODE_MAP.md` (`scripts/review-doc.mjs` and its `.d.mts`, `scripts/shots-m24.mjs`, `docs/LANGUAGES.md`, `docs/review/`), `scripts/shots.mjs`.

### 10.2 The review document

`scripts/review-doc.mjs` exports `buildReviewDoc(code)` (returns the Markdown text) and, when run as `node scripts/review-doc.mjs <code>` (`npm run review-doc -- ru`), writes `docs/review/<code>.md`. It reads the JSON files directly (no build) and holds a small **wording table** keyed by language code with the fixed texts below; it supports `ru` only, and for any other code exits with `no review wording for <code>; add one to scripts/review-doc.mjs` (a later language adds its wording there; `LANGUAGES.md` says so). The output is deterministic (no date or time in it).

Content, in this order (fixed `ru` wording in quotes, verbatim):
1. `# Проверка русского текста`, then the paragraph: `Это черновой перевод, сделанный ИИ. Пожалуйста, проверьте названия, другие названия (варианты) и тексты. Для каждой записи напишите «ок» или как правильно, указав её код (например: term_north — ок). Особенно важно: принятые на яхтах русские термины и слова голландского происхождения.`
2. For each group in `GROUPS` order: `## <label>`, where the label is `learn.group.<group>` from `content/lang/ru/ui.json` with `/\s*\(?\{count\}\)?/` removed and trimmed. Then each entry whose registry `group` is that group, sorted by Russian `name` with `a.localeCompare(b, 'ru')`: `### <Russian name> (`<id>`)` and a three-column table `| Поле | English | Русский |` with these rows, always all of them, in this order:
   - `Название` | English name | Russian name
   - `Другие названия` | the English alternatives | the Russian ones; each written `term — note` or `term`, joined with `<br>`; none: `—`
   - `Коротко` | `short` | `short`
   - `Что делает / что значит` | `what` | `what`
   - `На этой яхте` | `onThisBoat` | `onThisBoat`
   - `Типичные ошибки` | each `mistake → fix`, joined with `<br>` | the same
   - `«Покажи»` | `showMe` | `showMe`
   - `Достоверность` | the fact status, as `learn.status.<status>` in English | the same key in Russian
   - `Статус текста` | — | `черновик` for `draft`, `проверен моряком` for `sailor-reviewed`
   - `Проверка (ок / как правильно)` | (empty) | (empty)
   A field missing in both languages is written `—` in both cells. A field the English entry has but the Russian lacks is an error: the script exits with a non-zero code naming the id and field. In every cell, `|` becomes `\|` and a line break becomes `<br>`.
3. `## Кнопки и подсказки` and a table `| key | English | Русский |` with every key in `ru/ui.json` order; a value that is only white space is written as its code point (`U+00A0`).
4. The script fails (non-zero) if the result is larger than 450 KB (GitHub shows bigger Markdown files as raw text).

`tests/glossary.test.ts` gains: `buildReviewDoc('ru')` equals the committed `docs/review/ru.md` (so a text change without regenerating the document fails CI; the message says to run `npm run review-doc -- ru`).

### 10.3 Checks

`scripts/shots-m24.mjs`: no scenes (`M24_SCENES = []`), `liveM24Checks` only (label contains `m24`, so `openPage` adds `held=1&sea=flat&clock=0`). Run on the phone size, for `en` (`?`) and `ru` (`?lang=ru`), each in **one page**:
1. Read `content/registry/parts.json` in Node: the expected ids (131), groups (10) and Show-me ids (60).
2. Open the Learn tab. There are 10 group `details`. For each entry button `[data-testid^="learn-entry-"]` (131 in all): open its group first (`details.open = true` through `evaluate`, because the list is rebuilt after `learn-back`), tap it, wait for `learn-name` to read the expected name (from the language's glossary file), check every `h3` in the entry has a next sibling with non-empty text, then tap `learn-back`.
3. In `en` only, inside the same loop, for each of the 60 entries with Show me: `waitForFunction` until `location.search` contains `learn=<id>` (the link is written 300 ms after a change), record it, tap `learn-show-me`, `waitForFunction` until `location.search` differs, then call `page.goBack()` and ignore its return value (it is `null` for same-page history), and wait until `location.search` equals the recorded value and `learn-name` shows the same name again.
4. No console error during the whole run.
5. `auditPage` on: the entry with the most `h3` (found in the loop), the groups with one group open, and search results for `ma` (both languages): clean.

The Phase 4 browser checks run in their own CI part (added in M20, 6.9), which already lists `m24`.

### 10.4 Docs

- `docs/LANGUAGES.md` (new, short, plain words): how to add a language: copy `content/lang/en/` to `content/lang/<code>/`; translate both files following the rules of PHASE4_SPEC 3.3 adapted to the language (its own traditional alternative terms, never another language's); set every `textStatus` to `draft`; if the language does not use Latin letters, the Latin scan applies to it too and `latin-words.json` lists the allowed exceptions; run `npm test` (the tests list every missing or extra key and every incomplete entry); add the language's wording to `scripts/review-doc.mjs` and run `npm run review-doc -- <code>` for a reviewer. Nothing else changes: the Language setting lists the new language by itself.
- README: in "What you can do", a new item **Learn** (the Learn tab, More, Show me, search, how sure the app is) and an item **Language** (English or Russian, `lang=ru`); the line "Later phases add waves, a learning layer with Russian names, …" is rewritten to say that Phases 1–4 are done and name what later phases add (harbours and anchoring, exercises, more languages); the documents table gains `PHASE3_SPEC.md`, `PHASE4_SPEC.md` and `LANGUAGES.md`.
- ROADMAP: Phase 4 status "Done (M24, PR #<n>), Russian text awaiting a sailor's review" once the owner signs off, and a decisions-log row; this spec's status line likewise.

### 10.5 Done when

Every item of section 11 is ticked in the PR. **The agent ticks** items 1, 4, 5, 6, 7, 8 and 10, and item 3 from the browser checks; **the owner ticks** item 2, item 3 on the phone, and item 9 ("smooth on the owner's phone"). CI `browser-checks` green. The PR description links `docs/review/ru.md` with a link to the PR's latest commit (`https://github.com/Botrops1/sail-learn-and-train/blob/<sha>/docs/review/ru.md`, since merged branches are deleted) and says that the reviewer answers by id (for example `term_north: ок`). The sailor's corrections come later, in a `/bug` PR that also sets their entries' `textStatus` to `sailor-reviewed`.

---

## 11. Definition of Done (Phase 4)

- [ ] Every registry id (131) has a complete entry in English and Russian: name, alternatives in the same language, one-liner, what it does or means, and where given on this boat, typical mistakes with fixes, and the Show me text.
- [ ] The info card's More, the Ropes strip and Realistic mode open the entry in the Learn tab; See also, Show on the boat and Try it in the Ropes tab work.
- [ ] Show me opens its scene and the phone's Back button returns to where the learner was (60 scenes).
- [ ] The Learn tab lists every entry in 10 groups; search finds names, alternative names and words on the boat in the current language only.
- [ ] How sure we are: fact status and sources on every entry; Russian text marked as not yet checked by a sailor.
- [ ] Language setting: the whole app in English or Russian, one at a time; `lang` and `learn` round-trip through the link; old links open in English with no entry open.
- [ ] Adding a language needs only a new folder of two JSON files (`docs/LANGUAGES.md`); the tests say what is missing.
- [ ] The review document for a Russian-speaking sailor exists (`docs/review/ru.md`).
- [ ] Smooth on the owner's phone; all tests green in CI; no console errors; accessibility audit clean.
- [ ] Docs updated: README, ROADMAP, `CODE_MAP.md`, `LANGUAGES.md`.

## 12. Decisions and open questions

**Owner's answers on the planning outline (2026-10-14, "accept all except Q4"):** the long explanation opens in a new **Learn** tab; **Show me** buttons with the phone's Back button returning; the app starts in English, the language is a setting stored in the link; the Russian is an AI draft marked "not yet checked by a sailor" until a Russian-speaking sailor reviews it from one document (M24); every entry says how sure the facts are, with sources; entries are short (about 30 seconds to read); the panel hints stay plain text; entries first, the Russian app last (M23); numbers keep the dot. **Q4 changed by the owner:** the screen shows **one language only**, never both; each language has its **own traditional alternative terms** (for example Russian sea words of Dutch origin such as норд, бакборт), never terms from other languages; switching the language switches the whole app; a new language is added by adding JSON files with a complete translation. Phase 4 starts at M20 (M19 is done, its PR waiting for CI).

**Owner's answers on the planning PR (#53, 2026-10-14, "accept all"):** (1) the direction the waves turn the bow is fixed in a small `/bug` PR (flip the sign of `waveYawDeg`, as below); (2) in Russian mode the words printed on the boat stay as printed (English, in « ») and are found by search; (3) the wind instrument's abbreviations (AWA, AWS, TWA, TWS, the "T") stay as printed on the display, explained in Russian; (4) the debug overlay stays English; (5) Phase 4 may be marked Done while the Russian text waits for a sailor's review; the corrections come later in a `/bug` PR that sets `textStatus` to `sailor-reviewed`.

**Owner's answers on the M23 terms plan (PR #57, 2026-10-14, "accept all"):** (1) M23 makes the five name changes of 9.2.1 (геннакер, линь закрутки, вертлюг гика, взятие рифов, брочинг) and adds the alternatives; (2) the Learn tab is «Обучение» in Russian; (3) the Ropes tab stays «Концы» (the textbooks' «Снасти» is not used).

Decided in planning: the registry keeps only language-neutral facts and each language is a folder of two files (`ui.json`, `glossary.json`), found by the code without a list, so a new language needs no code; there is no fallback between languages; the English texts of every entry are written in this spec (the builders translate them into Russian and write nothing new in English); Show me scenes are ordinary links run through `load`, with `pushState` so Back works, and they were run against the model for this plan (every link round-trips; the bands in the tests are the measured values); changing the language reloads the page.

**Phase 3 leftover (owner, Q11 accepted: checked by this plan).** M15 turns the bow towards the side the boat rolls down to (`waveYawDeg = +5 × roll × factor`, PHASE3_SPEC 7.10). Wikipedia, *Broach (nautical)* (read 2026-10-14): a broach is "an abrupt, involuntary change in a vessel's course, towards the wind", which happens "when the stern is lifted in the water by an overtaking wave", leaving the vessel "beam-on to the sea". With wind and waves from the starboard quarter, the crest under the starboard quarter lifts that side, so she rolls to port (port rail down), and the source says the bow then goes towards the wind, to starboard: towards the side rolling **up**. The heeled-boat rule of PT-29/PT-32 (a boat heeled to leeward turns towards the wind) points the same way. So the sign in `waveYawDeg` looks **backwards**. Recommended fix, outside Phase 4: a small `/bug` PR after M19 is merged that flips the sign of `waveYawDeg` (`src/model/waveMotion.ts`) and its value test in `tests/waveFeedback.test.ts` (+10.0° becomes −10.0°), runs the PT-42 band tests (they measure spreads, which the sign does not change), and adds `wiki:broach` as a source to PT-42 in `PHYSICS_TRUTHS.md`.

Open (none blocks a milestone): every Russian text is a draft for a Russian-speaking sailor. The Russian names were checked against a yacht school's textbooks, Russian Wikipedia and dictionaries on 2026-10-14 (3.6, 9.2.1), and the Dutch origins are confirmed; the names no source uses (for example «твист», «колдунчики», «мёртвая зона», «стопор») wait for the sailor; `term_ahead`, `term_astern`, `term_heading`, `term_knot`, `term_gust`, `term_lull`, `term_wind_shift`, `term_head_up`, `term_bear_away` have no source yet (fact status `draft`, shown as such).
