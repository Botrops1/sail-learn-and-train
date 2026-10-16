# Phase 5 specification: new layout and modes

Status: **planned**, owner's answers recorded (planning chat and planning PR #61, 2026-10-15) · Last updated: 2026-10-15

Read [`ROADMAP.md`](ROADMAP.md) first, then this file. Phases 1–4 are done (M24 is merged before M25 starts, owner's answer 1). [`LAYOUT_ANALYSIS.md`](LAYOUT_ANALYSIS.md) explains why the screen is rebuilt; this spec is what to build. The earlier specs still describe everything the app does; Phase 5 changes **where** things are drawn, not what they do. Phase 5 changes no physics and adds no sailing facts.

## 0. How to use this spec (for the coding agent)

- Do **one milestone** (sections 6–10), on the branch your session gives you, in one PR titled `M<N>: <name>`. Read sections 0–5 first every time; they apply to all milestones. Then read only your milestone's section. Milestones are built in order (M25 → M29); each needs the ones before it merged.
- Build order inside a milestone: pure helpers + tests → store/URL → UI → CSS → browser checks → docs.
- **Text is data.** Every English string in this spec is final: copy it exactly. The Russian strings given here are drafts chosen to match the Russian words already in the app: copy them exactly too. Where a Russian string is not given, write a draft yourself following PHASE4_SPEC 3.3. After any change to `content/lang/ru/*.json`, run `npm run review-doc -- ru` (M24) so `docs/review/ru.md` stays current (a test checks it).
- **Numbers.** Sizes in px, shares and times in this spec are final. They are UI presentation values: they live in the UI file named with them (as `MAP` lives in `src/ui/mapView.ts`), not in the boat file. The expected values in the tests were computed from the formulas in this spec on 2026-10-15. If a test fails, check the formula against 3.5 "common mistakes" first. Never change an expected value to make a test pass; report it in the PR.
- **Signatures.** Function names, signatures, CSS classes and `data-testid`s are given so that milestones fit together and the browser checks can find things. Keep them. Add private helpers freely.
- **Write back.** If you decide something this spec leaves open, write it into your milestone's section under "Decided in the M<N> PR".
- **Everything earlier keeps working.** Every test stays green, every PHYSICS_TRUTHS test passes, Easy and Realistic mode work exactly as before (only where they are drawn changes), tap-to-identify, the info card, More → Learn, Show me and Back keep working, and every old link opens the same picture. An existing unit test may only be changed where your milestone section says so. Browser checks are moved onto the helpers of 3.4 (that is expected); a check may never be weakened or deleted to make it pass.
- Sailing terms in UI text get a short explanation the first time they appear on a screen (CLAUDE.md).

## 1. Goal

The app shows more of the boat and less clutter, and the screen has room for Phases 7 and 8.

What the learner should feel:

> **The boat fills the screen; the controls come up when I need them.** On a phone the 3D view fills the screen and the controls sit in a sheet pulled up from the bottom. A **mode** (Learn, Easy, Realistic) decides which blocks come first. Settings are behind a gear. Nothing is lost: every block can be reached from every mode.

## 2. Scope

### In scope (Phase 5)

1. **Settings menu and one camera chip** (M25): a gear button opens the settings (everything of today's View tab except the camera, plus the footer). The View tab is removed. One camera chip ("Port ▾") with a menu replaces the seven camera buttons. Shared helpers for the browser checks.
2. **Phone shell** (M26): in the stacked layout the 3D view fills the screen and the panel becomes a **sheet** with three heights (peek, half, full), dragged or tapped by its handle. The camera frames the boat in the part of the view the sheet does not cover. The side-by-side layout keeps the panel on the right.
3. **Modes and sections** (M27): a small **mode chip** ("Easy ▾", owner's answer 4) picks Learn, Easy or Realistic; the tabs are removed. The panel is a list of **sections** that fold; each mode is data (which sections, in which order, which start open). Explanations fold behind a "?". The Wind tab becomes the **Conditions** section, opened by tapping the instruments. At peek height the sheet shows a **quick row** (in Easy: the selected rope's − / +). New link key `m`.
4. **Mini-map** (M28): a small north-up map in a corner while Sailing; a tap opens the full map; a Close button returns; a Mini-map switch in the settings (link key `mm`).
5. **Desktop and sign-off** (M29): on screens 1,280 px or wider a second panel column (Conditions and Learn); accessibility audit of everything new; frame-rate check; docs.

### Out of scope

- Harbour and Exercises modes (Phases 7 and 8; they add sections and a mode entry, 4.4).
- Any change to physics, the rig, the 3D boat, the registry ids or the glossary facts. The only glossary edits are the "Wind tab / Ropes tab" sentences of 8.6.
- Remembering folded sections, the "?" state or the sheet height across a reload (not in the link, not in browser storage).
- The phone's Back button closing the full map (decided in planning, 9.1: it would reload the link and reset the boat's position and track).
- A UI framework (ROADMAP decisions, 2026-10-08). Pointer events only, as the Realistic gestures.

If something here looks necessary, stop and ask in the PR.

## 3. Conventions and shared helpers

### 3.1 Conventions

| Topic | Convention |
|---|---|
| Layouts | `stacked` and `side` exactly as `layoutModeFor` (`src/ui/layoutMode.ts`) decides today (narrower than 700 px or width/height < 0.8 → stacked). Unchanged. **Wide** (M29) = side and `window.innerWidth >= 1280`. |
| Units | CSS px; times in ms; velocities in px per ms. "Up" on screen = towards the top. A sheet height is measured from the bottom of the view. |
| Sheet heights | `peek`, `half`, `full` (3.3). Stacked layout only. In the side layout the panel is docked (no handle, full height). **"At peek"** everywhere in this spec means: stacked layout **and** height `peek`. In the side layout the sheet always counts as `half`, whatever `data-sheet` still holds. |
| Modes | `AppMode = 'learn' \| 'easy' \| 'realistic'` (M27). Invariant: `appMode === 'learn'` or `appMode === settings.ropesMode`. |
| Sections | `SectionId = 'ropes' \| 'sails' \| 'autopilot' \| 'engine' \| 'conditions' \| 'learn' \| 'legend'` (M27, 4.4). Each section is built once and moved between containers, never duplicated. |
| UI state vs app state | In the store and the link: `appMode` (M27), `settings.miniMap` (M28). Not in the store, not in the link: the sheet height, which sections are open, the "?" state, whether a menu or the settings dialog is open. `src/model` knows nothing of any of them (ROADMAP architecture hooks). |
| Overlays at the bottom of the view | Every element over the 3D view that is placed from the view's bottom uses `bottom: calc(var(--view-bottom-inset, 0px) + <N>px)`. `--view-bottom-inset` is set on `.shell` by the sheet (M26) and inherited by `.view`: the sheet's height in px in the stacked layout, `0px` in the side layout. |
| Touch targets | At least 44 × 44 px (`--touch`), as everywhere. Menus' items are 44 px tall. |
| Stacking (`z-index`) | Overlays inside `.view` as today (up to 6); `.view-bottom` 8; the sheet 7; `.clock-card` 9 (raised in M26 so a full sheet never covers it); the error banner 10 (as today); chip menus 12; the settings dialog 20. |
| `hidden` | Every new element that is shown and hidden with the `hidden` attribute and has a `display` rule gets `<selector>[hidden] { display: none; }` (as `.map-enlarged[hidden]`). |
| Focus | Every new focusable element has a visible `:focus-visible` style (`outline: 3px solid var(--focus)`, as today's rule at the end of the panel CSS); the accessibility audit fails without it. |
| Without WebGL | The chip row, the gear and (M27) the mode chip are created whether or not the 3D view exists; the camera chip and (M28) the mini-map only when it exists (as the camera bar and the map today). |
| Language | Every new visible string goes through `t()`, in `content/lang/en/ui.json` and `content/lang/ru/ui.json` (same keys, same order). |
| Test ids | Every `data-testid` named in this spec is required (the browser checks use them). |

### 3.2 The chip row over the 3D view (M25, used by M26–M28)

`.view-bottom` (`data-testid="view-bottom"`) replaces `.camera-bar`: an absolutely placed row, `left: 8px; right: 8px; bottom: calc(var(--view-bottom-inset, 0px) + 8px)`, `display: flex; align-items: flex-end; gap: 8px; pointer-events: none` (its children `pointer-events: auto`). Left to right: the **mode chip** (M27), the **camera chip** (M25), a flexible gap, the **gear** (M25). The row is 44 px tall; with its 8 px gaps it covers `SHEET.chipRowPx` = 60 px of the view's bottom.

**Chip look** (class `view-chip`, on the mode chip, the camera chip, the gear and the Close-map chip; not `chip`, which `style.css` already uses for the rope state chips): `min-height: 44px`, `min-width: 44px`, `padding: 4px 12px`, `border: 1px solid var(--line)`, `border-radius: 8px`, `background: rgb(255 255 255 / 0.88)`, `font-size: var(--font-small)`, `font-weight: 600` (today's `.camera-button` look). The mode and camera chips hold `<span class="chip-label">Port</span><span class="chip-caret" aria-hidden="true">▾</span>`; checks read the text of `.chip-label`. The gear has `margin-left: auto` (that is the flexible gap).

**Chip menus** (camera menu M25, mode menu M27): a `div.chip-menu` with `role="menu"`, appended to `.view` (the chip row's parent) and placed when it opens from `chip.getBoundingClientRect()` relative to the view: its left edge at the chip's left edge and its bottom 8 px above the chip's top; `max-height` set in px when it opens to `chipRect.top − viewRect.top − 16` (it then scrolls inside itself); `width: max-content; min-width: 220px; max-width: min(320px, calc(100% - 16px))`; `overflow-y: auto`, `background: var(--surface)`, `border-radius: 10px`, `box-shadow: 0 2px 10px rgb(10 20 30 / 0.25)`, `z-index` above the chip row. Items are `button role="menuitemradio"` with `aria-checked`, 44 px tall, full menu width, the checked one styled like today's pressed camera button. The chip has `aria-haspopup="menu"` and `aria-expanded`. Open: focus moves to the checked item. ArrowDown / ArrowUp move focus (wrapping), Home / End to the first / last, Enter / Space choose, Escape closes. Choosing an item closes the menu and returns focus to the chip. Tab closes the menu and returns focus to the chip. A tap on the chip while its menu is open closes it (the chip toggles). A `pointerdown` anywhere outside the menu and the chip closes it. Only one menu (or the settings dialog) is open at a time: opening one closes the other. While a menu or the settings dialog is open, its Escape listener is registered on `document` in the capture phase (`addEventListener('keydown', …, true)`, removed on close); it closes the menu or dialog and calls `event.stopPropagation()`, so the document-level Escape of the info card (`infoCard.ts`) does not also clear the selection, wherever the focus is.

**Shared menu code** (`src/ui/chipMenu.ts`, M25): `createChipMenu(view: HTMLElement, chip: HTMLButtonElement, items: { id: string; testId: string; content: (string | HTMLElement)[] }[], onChoose: (id: string) => void, options: { label: string; hint?: string }): { setChecked(id: string): void; close(): void }` builds a menu with all of this behaviour, and `closeOpenMenus()` closes whichever menu is open (the settings dialog calls it). The camera chip (M25) and the mode chip (M27) both use it.

### 3.3 Sheet geometry (M26; pure, `src/ui/sheetGeometry.ts`)

```ts
export const SHEET_HEIGHTS = ['peek', 'half', 'full'] as const;
export type SheetHeight = (typeof SHEET_HEIGHTS)[number];

/** Sheet sizes and gesture thresholds (PHASE5_SPEC 3.3). Presentation values, not boat data. */
export const SHEET = {
  /** The handle (44) and, from M27, the quick row (56). */
  peekPx: 100,
  /** Half height: this share of the view's height. */
  halfShare: 0.5,
  /** A full sheet stops this far below the top area, so the chip row (3.2) fits between them. */
  fullGapPx: 60,
  /** A pointer that moved less than this between down and up is a tap. */
  tapMaxMovePx: 8,
  /** Released faster than this (px per ms), the sheet moves one height in the drag's direction. */
  flingPxPerMs: 0.5,
  /** The release velocity is measured over the last this many ms of the drag. */
  velocityWindowMs: 100,
  /** Height animation after a release or a tap, ms (none while dragging). */
  transitionMs: 200,
  /** The chip row (3.2): 44 px chips with 8 px above and below. */
  chipRowPx: 60,
} as const;

/** The view's height and where the top area ends (the `--view-top-h` value), CSS px. */
export interface SheetSpace {
  viewHeightPx: number;
  topAreaPx: number;
}

/** The sheet's height in CSS px. */
export function sheetHeightPx(height: SheetHeight, space: SheetSpace): number;
/** Where a drag that started at `start` ends: `endPx` is the sheet's height at release, `velocity` its rate of growth (px per ms, + = growing). */
export function snapSheet(start: SheetHeight, endPx: number, velocity: number, space: SheetSpace): SheetHeight;
/** A tap on the handle: peek → half → full → peek. */
export function tapSheet(height: SheetHeight): SheetHeight;
/** One height up (+1) or down (−1), stopping at peek and full. */
export function stepSheet(height: SheetHeight, direction: 1 | -1): SheetHeight;
/** CSS px at the bottom of the view the camera must keep the boat above (sheet plus chip row). */
export function cameraInsetPx(height: SheetHeight, space: SheetSpace): number;
```

Formulas:

- `peek` = `SHEET.peekPx`.
- `half` = `Math.max(SHEET.peekPx, Math.round(viewHeightPx × SHEET.halfShare))`.
- `full` = `Math.max(half, Math.round(viewHeightPx − topAreaPx − SHEET.fullGapPx))`.
- `snapSheet`: if `velocity >= SHEET.flingPxPerMs` → `stepSheet(start, +1)`; if `velocity <= −SHEET.flingPxPerMs` → `stepSheet(start, −1)`; otherwise the height whose `sheetHeightPx` is nearest to `endPx`; on an exact tie, the larger height.
- `cameraInsetPx`: `sheetHeightPx(height === 'full' ? 'half' : height, space) + SHEET.chipRowPx` (a full sheet hides the boat anyway; the camera keeps the half-height framing so it does not jump).

Worked values (390 × 844 phone, Sailing: the top area ends at 116 px, measured): peek 100, half 422, full 668; `cameraInsetPx` peek 160, half 482, full 482. (360 × 740, Sailing, top area 166 px, measured): peek 100, half 370, full 514. (360 × 740, Held still, top area 114 px, measured): full 566. At full on 390 × 844 the chip row sits at y 116–176, just under the top area, and the sheet starts at 176.

### 3.4 Browser-check helpers (`scripts/ui.mjs`, M25; changed by M26 and M27)

Every check that opens part of the panel, the settings or a camera view goes through these helpers, so that later milestones change only the helpers. They take a Playwright `page` and never depend on the language (they find things by `data-testid`).

```js
/** Opens a section and scrolls it into view. Ids: ropes, sails, autopilot, engine, legend, conditions, learn. */
export async function showSection(page, id) {}
/** True if the section's content is shown now (its tab selected, from M27 the section open and the sheet not at peek). */
export async function sectionShown(page, id) {}
/** Opens and closes the settings dialog. */
export async function openSettings(page) {}
export async function closeSettings(page) {}
/** Chooses a camera preset from the camera chip's menu. */
export async function setCamera(page, preset) {}
/** The y (CSS px from the page top) of the top of the chip row: taps on the 3D view stay above it. */
export async function viewBottom(page) {}
/** M26: sets the sheet's height by tapping its handle (no-op in the side layout). */
export async function setSheet(page, height) {}
/** M27: chooses a mode from the mode chip's menu (learn, easy, realistic). */
export async function setMode(page, mode) {}
/** Polls the address bar (up to 3 s; the link is written 300 ms after a change) until it contains every string of `has` and none of `hasNot`; returns the link, throws with the link if it never does. */
export async function waitForLink(page, has, hasNot = []) {}
/** M26: drags the sheet's handle by `dy` CSS px (negative = up) in `steps` mouse moves, waiting `delayMs` between them (0 = a fling). */
export async function dragHandle(page, dy, steps, delayMs) {}
/** M27: opens every available section (each visible `[data-section]` with `data-open="false"`), with the sheet at least half. */
export async function openAllSections(page) {}
```

What each does, by milestone:

| Helper | M25 | M26 | M27 |
|---|---|---|---|
| `showSection` | clicks the tab that holds the section: `ropes`, `sails`, `autopilot`, `engine`, `legend` → `[data-testid="tab-ropes"]`; `conditions` → `tab-wind`; `learn` → `tab-learn` (no scrolling yet: there are no section elements) | as M25, then `setSheet(page, 'half')` if the sheet is at peek | if `[data-testid="section-<id>"]` has `data-open="false"`, clicks `section-toggle-<id>`; `setSheet(page, 'half')` if at peek; then `scrollIntoViewIfNeeded` on the section |
| `sectionShown` | the tab's `aria-selected` is `true` | as M25 and not at peek (3.1) | `data-open="true"`, the section is not `hidden`, and not at peek (3.1) |
| `openSettings` | clicks `settings-button`, waits for `settings-dialog` visible | same | same |
| `closeSettings` | clicks `settings-close`, waits for it hidden | same | same |
| `setCamera` | clicks `camera-chip`, then `camera-option-<preset>` | same | same |
| `viewBottom` | top of `[data-testid="view-bottom"]` | same | same |
| `setSheet` | — | taps `sheet-handle` until `[data-testid="sheet"]` has `data-sheet="<height>"` (at most 3 taps), then waits until `data-sheet-moving` is `false`; side layout: returns at once | same |
| `dragHandle` | — | `mouse.move` to the handle's centre, `down`, `steps` moves of `dy / steps` each with `delayMs` waits, `up`; then waits until `data-sheet-moving` is `false` | same |
| `waitForLink` | as its comment (from M25) | same | same |
| `openAllSections` | — | — | as its comment |
| `setMode` | — | — | clicks `mode-chip`, then `mode-option-<mode>` |

**Scenes** (the `SCENES` entries of `scripts/shots.mjs` and every `scripts/shots-m*.mjs`): the field `tab: '<name>'` is replaced by `section: '<id>'` (Ropes → `ropes`, Wind → `conditions`, Learn → `learn`; the Russian tab names of `shots-m23.mjs` likewise), and the View tab by `settings: true` (open the settings dialog before the shot). The scene runner calls `showSection` / `openSettings`. M27 adds `mode: '<mode>'` (calls `setMode` before the section).

### 3.5 Common mistakes (check these first when something fails)

- **Two elements with the same accessible name** (Playwright's strict mode fails): a section is moved, never copied; the quick row's − / + exist only while the sheet is at peek, when the sheet body is `visibility: hidden` (7.5), and both are switched by CSS on `[data-sheet]`, which changes at the start of a height change (never from `onChange`, which runs 200 ms later). Names are also matched as substrings: a section toggle "Sails" and its "?" "Explain: Sails" both match `{ name: 'Sails' }`; checks use `getByTestId` or `exact: true`.
- **The sheet body scrolls the page:** the page must never scroll (the browser checks fail on any page scroll). The sheet is `position: absolute` inside `.shell`, which is `overflow: hidden`.
- **A drag on a slider moves the sheet:** only the handle drags the sheet. The body scrolls normally.
- **Framing jumps while dragging:** the camera reframes once, after the height animation ends (`transitionend`, or at once with `prefers-reduced-motion: reduce`), never during a drag.
- **The camera inset clamp:** `cameraRig.setViewport` clamps the bottom inset to 40 % of the height today; a half sheet needs 57 %. Use `SCENE.camera.maxBottomInsetShare` (M26).
- **Mode and ropes mode out of step:** every path that changes `settings.ropesMode` keeps the invariant of 3.1 (the reducer does it, 8.3); UI code never sets one without the other.
- **A link written in Easy mode with `learn=`:** `learn` is written only in Learn mode (8.3); otherwise a link with `learn=` would open in Learn mode.
- **Re-applying open states too often:** the mode's open states are applied only at start, when the mode changes, or when the layout kind changes (stacked ↔ side; from M29 any change among stacked, side and wide except wide → side, 10.2); never on other resizes, a sheet height change, or a section becoming available.
- **Folded content still counted:** a folded section's body is `hidden` (not just height 0), so tabbing, the accessibility audit and Playwright skip it.
- **History:** the full map does not push a history step (9.1). Show me still does (PHASE4_SPEC 6.5).
- **The review document:** a Russian string changed without `npm run review-doc -- ru` fails `tests/glossary.test.ts`.

### 3.6 Browser-check conventions (every milestone)

- **Scene names** in `scripts/shots-m<N>.mjs` are written without the prefix; `shots.mjs` adds `m<N>-` when it registers them (`...M25_SCENES.map((scene) => ({ ...scene, name: `m25-${scene.name}` }))`), as for every earlier milestone. Live-check labels contain `m<N>` too. Register each file in `shots.mjs`: import, `SCENES`, `liveGroups`.
- **What `openPage` adds** (`scripts/shots.mjs`): today it adds `held=1`, `sea=flat` and `clock=0` to every label outside M6–M19 (so the older checks keep their Phase 1 picture). **M25 extends the three label tests to the Phase 5 milestones**, so Phase 5 checks open as the app opens without a link (Sailing, Coastal waves, the clock chip shown): `held` `/m([6-9]|1\d|2[5-9])/`, `sea` `/m(1[4-9]|2[5-9])/`, `clock` `/m(1[7-9]|2[5-9])/`. A Phase 5 check that wants Held still writes `held=1` in its link. **M28** adds `mm=0` the same way to every label that is not `m28` or `m29` (unless the link has `mm=`), so the mini-map never changes an older check; the exact links that `expectUrl` compares in the general check gain `&mm=0` right after `lb=0` (the order of `serializeUrlState`: `…&detail=low&lb=0&mm=0&held=1&sea=flat&clock=0…`) in that milestone.
- **Links:** the address bar is written 300 ms after a change; read it with `waitForLink`, never right after a tap.
- **Names:** find things by `data-testid` or with `exact: true` (3.5).
- **CI:** scenes run at phone size only, live checks in the parts of `ci.yml`. A picture needed at another size is taken inside a live check (`openPage(VIEWPORTS[2], …)` then `page.screenshot`).
- **A full run** (`SHOTS_SIZES=phone npm run shots`) before opening the PR in every Phase 5 milestone: each one changes shared code (CLAUDE.md).

## 4. Architecture

### 4.1 New state

```ts
// src/app/appMode.ts (M27, new; imported by store.ts and urlState.ts)
export const APP_MODES = ['learn', 'easy', 'realistic'] as const;
export type AppMode = (typeof APP_MODES)[number];
export function isAppMode(value: string): value is AppMode;

// src/app/store.ts (M27)
interface AppState {
  /** The mode (PHASE5_SPEC 4.1): 'learn', or the ropes mode. In the link as `m=learn`. */
  appMode: AppMode;
}
// Action (M27): change the mode. 'easy' and 'realistic' also set settings.ropesMode.
| { type: 'setAppMode'; mode: AppMode }
// InitialOverrides gains: appMode?: AppMode

// src/model/settings.ts (M28)
interface Settings {
  /** The mini-map in the corner of the 3D view while Sailing (settings menu). In the link as `mm=0` when off. */
  miniMap: boolean;   // default true
}
```

### 4.2 URL keys

| Key | Milestone | Values | Default | Written |
|---|---|---|---|---|
| `m` | M27 | `learn` | none (the mode follows `mode`, the ropes mode) | right after `cam`, only in Learn mode |
| `mm` | M28 | `0` | on (`1` is accepted when read) | right after `lb`, only when off |

Old links: without `m`, a link with a valid `learn=<id>` opens in **Learn** mode (Phase 4 opened the Learn tab), otherwise in the mode of its `mode` key (`mode=realistic` → Realistic, none → Easy). Without `mm` the mini-map is on. Every other key keeps its meaning. `learn` is written only in Learn mode (8.3).

### 4.3 Step order

Unchanged. Phase 5 adds no work to the `step` action.

### 4.4 Sections and modes (M27; `src/ui/modes.ts`, pure)

```ts
export const SECTION_IDS = ['ropes', 'sails', 'autopilot', 'engine', 'conditions', 'learn', 'legend'] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export interface ModeLayout {
  /** Every section exactly once, top to bottom (stacked layout, and column 1 of the side layout). */
  order: readonly SectionId[];
  /** Open when the mode is chosen, stacked layout. */
  open: readonly SectionId[];
  /** Open when the mode is chosen, side layout (column 1). */
  openSide: readonly SectionId[];
  /** Wide layout (M29): these leave column 1 and fill column 2, in this order, open. */
  second: readonly SectionId[];
}
export const MODE_LAYOUTS: Readonly<Record<AppMode, ModeLayout>>;
/** True if the section is shown at all in this state (4.4 table). */
export function sectionAvailable(id: SectionId, state: AppState): boolean;
```

| Mode | `order` | `open` | `openSide` | `second` |
|---|---|---|---|---|
| `easy` | ropes, sails, autopilot, engine, conditions, learn, legend | ropes, sails | ropes, sails, autopilot, engine | conditions, learn |
| `realistic` | ropes, sails, conditions, learn, legend, autopilot, engine | ropes | ropes, sails | conditions, learn |
| `learn` | learn, legend, ropes, sails, autopilot, engine, conditions | learn | learn, legend | conditions, ropes |

`sectionAvailable`: `autopilot` and `engine` only when `settings.ropesMode === 'easy'` (in Realistic mode they are at the Helm station, as today); `legend` only when `settings.legend`; the others always. An unavailable section is `hidden`.

**Adding a mode later** (Phases 7, 8): add the id to `APP_MODES`, a row to `MODE_LAYOUTS`, its strings, and any new `SectionId`s with their builders. Nothing else.

### 4.5 Files by milestone

| Milestone | New | Changed |
|---|---|---|
| M25 | `src/ui/settingsMenu.ts`, `src/ui/cameraChip.ts` (replaces `cameraBar.ts`, deleted), `src/ui/chipMenu.ts`, `scripts/ui.mjs`, `scripts/shots-m25.mjs` | `src/ui/panel.ts` (no View tab, no footer), `src/app/app.ts`, `src/ui/labels3d.ts`, `src/style.css`, both `ui.json`, `tests/languages.test.ts` (one line), `scripts/shots.mjs` and every `scripts/shots-m*.mjs` that uses a tab, the View tab or a camera button, `.github/workflows/ci.yml`, `.github/workflows/pr-preview.yml`, `CLAUDE.md`, `README.md`, `docs/WORKFLOW.md`, two skill files (6.9), `docs/CODE_MAP.md` |
| M26 | `src/ui/sheet.ts`, `src/ui/sheetGeometry.ts`, `tests/sheet.test.ts`, `scripts/shots-m26.mjs` | `src/ui/layout.ts`, `src/app/app.ts`, `src/ui/infoCard.ts`, `src/ui/panel.ts`, `docs/review/ru.md`, `src/render3d/cameraRig.ts`, `src/render3d/sceneConfig.ts`, `src/style.css`, both `ui.json`, `scripts/ui.mjs`, `scripts/shots.mjs` (tap sweeps at peek), the `shots-m*.mjs` of 7.8, `docs/CODE_MAP.md` |
| M27 | `src/app/appMode.ts`, `src/ui/modes.ts`, `src/ui/sections.ts`, `src/ui/modeChip.ts`, `src/ui/quickRow.ts`, `tests/modes.test.ts`, `scripts/shots-m27.mjs` | `src/app/store.ts`, `src/app/urlState.ts`, `src/app/urlSync.ts`, `src/ui/panel.ts` (rewritten: sections, no tabs), `src/ui/ropesTab.ts`, `src/ui/learnTab.ts`, `src/ui/windPanel.ts`, `src/ui/windInstrument.ts`, `src/ui/windModePanel.ts`, `src/ui/wavesPanel.ts`, `src/ui/realisticPanel.ts`, `src/ui/sailsPanel.ts`, `src/ui/autopilotPanel.ts`, `src/ui/enginePanel.ts`, `src/ui/ropeLegend.ts`, `src/ui/infoCard.ts`, `src/ui/instrumentStrip.ts`, `src/app/app.ts`, `src/style.css`, both `ui.json`, both `glossary.json` (8.6), `docs/review/ru.md` (regenerated), `tests/glossary.test.ts` and `tests/quotedLabels.ts` (8.8), `scripts/ui.mjs`, the `shots-m*.mjs` of 8.9, `docs/CODE_MAP.md` |
| M28 | `src/ui/miniMap.ts`, `tests/miniMap.test.ts`, `scripts/shots-m28.mjs` | `src/model/settings.ts`, `src/app/store.ts` (action `setMiniMap`), `src/app/urlState.ts`, `src/app/urlSync.ts` (`sceneSettings`), `src/ui/mapView.ts`, `src/ui/cameraChip.ts` (Close-map chip), `src/ui/settingsMenu.ts`, `src/ui/labels3d.ts`, `src/app/app.ts`, `src/style.css`, both `ui.json`, `tests/urlState.test.ts`, `docs/review/ru.md`, `scripts/shots.mjs`, `docs/CODE_MAP.md` |
| M29 | `scripts/shots-m29.mjs` | `src/ui/layoutMode.ts`, `src/ui/layout.ts`, `src/ui/panel.ts`, `src/ui/ropesTab.ts` (`revealStrip`), `src/style.css`, both `ui.json`, `docs/review/ru.md`, `tests/layoutMode.test.ts`, `scripts/shots.mjs`, `README.md`, `docs/ROADMAP.md`, `docs/LAYOUT_ANALYSIS.md`, `docs/CODE_MAP.md`, `docs/WORKFLOW.md` (only if a check's wording must change), this spec |

## 5. Milestones overview

Each milestone is one PR, small enough to check on a phone in 15 minutes. **Independent review: required** means the owner runs `/review <PR>` (new Code session, Opus, high effort) as soon as the PR opens, before testing it on the phone.

| Milestone | Section | What the owner sees | Rules tested | Depends on | Independent review |
|---|---|---|---|---|---|
| M25 | 6 | A gear opens Settings (language, labels, detail, Share, Reset, About); the View tab is gone; one camera chip "Port ▾" with a menu | — (all earlier tests stay green) | M24 | **required** (moves every browser check onto new helpers; changes the screen of every earlier phase) |
| M26 | 7 | On a phone the 3D fills the screen; the panel is a sheet with three heights; the boat is framed above it | — | M25 | **required** (shared layout, camera framing, gestures, performance) |
| M27 | 8 | "Easy ▾" chip with Learn / Easy / Realistic; blocks fold, "?" explanations; Conditions block; quick − / + at the lowest sheet height | — | M26 | **required** (new store field, link key `m`, old links, Show me and Back, glossary text edits) |
| M28 | 9 | A small map in the corner while Sailing; a tap opens the full map; Close returns; a switch in Settings | — | M27 | **required** (new setting and link key `mm`, `openScene` change) |
| M29 | 10 | Wide screens get a second column; accessibility and frame-rate checks; sign-off | — | M28 | not needed (layout, checks and docs) |

---

## 6. M25: Settings menu and camera chip

**Independent review: required** (every browser check moves onto the new helpers; every earlier phase's screen changes).

### 6.1 Files

New: `src/ui/settingsMenu.ts`, `src/ui/cameraChip.ts`, `src/ui/chipMenu.ts` (3.2), `scripts/ui.mjs`, `scripts/shots-m25.mjs`.
Deleted: `src/ui/cameraBar.ts` (replaced by `cameraChip.ts`).
Changed: `src/ui/panel.ts`, `src/app/app.ts`, `src/ui/labels3d.ts`, `src/style.css`, `content/lang/en/ui.json`, `content/lang/ru/ui.json`, `docs/review/ru.md` (regenerated), `tests/languages.test.ts` (6.6), `scripts/shots.mjs`, the `scripts/shots-m*.mjs` files listed in 6.8, `.github/workflows/ci.yml`, `.github/workflows/pr-preview.yml` (a comment), `CLAUDE.md`, `README.md`, `docs/WORKFLOW.md`, `.claude/skills/milestone/SKILL.md`, `.claude/skills/bug/SKILL.md`, `docs/CODE_MAP.md` (6.9).

### 6.2 Data

None.

### 6.3 Model, store and URL

No change. The camera chip dispatches `setCameraPreset`; the settings controls dispatch the same actions as today's View tab.

### 6.4 UI

**The panel** (`panel.ts`): `TAB_IDS = ['ropes', 'wind', 'learn']`; the View tab, `buildViewTab` and the footer are removed from the panel (they move to the settings dialog). Each tab button gets `data-testid="tab-<id>"`. Everything else in `panel.ts` is unchanged.

**The chip row** (3.2): `src/ui/cameraChip.ts` exports `createViewBottom(view: HTMLElement): HTMLElement` (creates `.view-bottom` and appends it to the view) and `createCameraChip(row: HTMLElement, store: Store): void`. `app.ts` creates the row and the gear (from `settingsMenu.ts`) always, and the camera chip only when the 3D view exists (where the camera bar was created; 3.1 "Without WebGL"); the chip is inserted before the gear. The 3D framing inset that `app.ts` measured from `.camera-bar` is measured from `.view-bottom` in the same way (`viewBox.bottom − row.getBoundingClientRect().top`). `src/ui/labels3d.ts`: in `BLOCKING`, `.camera-bar` becomes `.view-bottom` (3D labels keep clear of the row, as of the bar) and its comment says "chip row". In `style.css`, delete the `.camera-bar`, `.camera-button` and `.camera-button[aria-pressed='true']` rules, and in the shared `:focus-visible` selector list replace `.camera-button:focus-visible` with `.view-chip:focus-visible, .chip-menu [role='menuitemradio']:focus-visible, .settings-close:focus-visible`.

**Camera chip** (`data-testid="camera-chip"`, class `view-chip camera-chip`): `.chip-label` = `t('cam.short.<preset>')` of the current preset, then the caret; `aria-label` = `t('cam.chip', { name: t('cam.<preset>') })`. Its menu (`data-testid="camera-menu"`, `aria-label` = `t('cam.label')`) lists every `CAMERA_PRESETS` entry in that order (Side (port), Side (starboard), Top, Bow, Helm, Free, Map), each `data-testid="camera-option-<preset>"` with the text `t('cam.<preset>')`; choosing one dispatches `setCameraPreset`. Under the items, a `p.hint.camera-menu-hint` with `t('cam.menuHint')` (it keeps the explanation of port and starboard that the View tab's camera block had). Dragging the 3D view still switches to Free (the chip then reads "Free ▾").

**Gear** (`data-testid="settings-button"`, class `view-chip settings-button`, `aria-label` = `t('settings.button')`, `aria-haspopup="dialog"`, `aria-expanded`): `padding: 0; width: 44px; height: 44px`, no text, this icon:

```html
<svg viewBox="-12 -12 24 24" width="24" height="24" aria-hidden="true" class="gear-icon">
  <g fill="currentColor">
    <!-- 8 teeth: this rect 8 times, with transform rotate(0), rotate(45), … rotate(315) -->
    <rect x="-2" y="-11" width="4" height="5" rx="1" transform="rotate(0)" />
  </g>
  <circle r="6.5" fill="none" stroke="currentColor" stroke-width="3" />
  <circle r="2.2" fill="currentColor" />
</svg>
```

Built with `document.createElementNS('http://www.w3.org/2000/svg', …)` (as the drawings are; `el()` makes HTML elements only).

**Settings dialog** (`src/ui/settingsMenu.ts`, `export function createSettingsMenu(row: HTMLElement, root: HTMLElement, store: Store): void`; `row` is the chip row for the gear, `root` the layout's root for the dialog):

- `div.settings-dialog`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby="settings-title"`, `data-testid="settings-dialog"`, `hidden` when closed (`.settings-dialog[hidden] { display: none; }`).
- Placement: stacked layout `position: fixed; inset: 0`; side layout `position: fixed; top: 0; right: 0; bottom: 0; width: clamp(var(--panel-min), 30%, var(--panel-max))` (it covers the panel column, the 3D stays visible). `background: var(--surface)`, `z-index: 20`, its own vertical scroll (`overflow-y: auto`); the page never scrolls.
- Head: `h2#settings-title` `t('settings.title')` and a close button `×` (`data-testid="settings-close"`, class `settings-close`, `aria-label` = `t('settings.close')`, 44 × 44, top right).
- Body, in this order, each **exactly as built today in `buildViewTab`** (same elements, ids, `data-testid`s, hints, texts and actions; move the code into `settingsMenu.ts`): Language; Labels in 3D; Time bar; Clock; Step size; Detail; Share and Reset; Rope colour legend; Debug overlay. Then `h3` `t('settings.about')` and today's `footer.footer` element with its three items (disclaimer `data-testid="disclaimer"`, version `data-testid="build-version"`, source link) and its CSS, unchanged.
- The Camera block of the View tab is **not** in the dialog (the camera chip replaces it).
- Opening: the gear opens it. While it is open, `.view` and `.panel` have the `inert` attribute (so Tab, taps and screen readers stay in the dialog in both layouts; the gear itself is then inert, so the dialog closes only with `settings-close` or Escape, never with a tap outside). On open, focus moves to `settings-close`; on close, `inert` is removed and focus returns to the gear. Opening it closes an open chip menu (3.2).
- Choosing a language still reloads the page (M23).

### 6.5 Strings

`content/lang/en/ui.json`, new keys (exact text), and the Russian (copy exactly):

| Key | English | Russian |
|---|---|---|
| `settings.button` | Settings | Настройки |
| `settings.title` | Settings | Настройки |
| `settings.close` | Close | Закрыть |
| `settings.about` | About | О программе |
| `cam.chip` | Camera: {name}. Tap to change the view. | Камера: {name}. Нажмите, чтобы сменить вид. |
| `cam.menuHint` | Port is the left side of the boat when you face the bow (the front); starboard is the right side. Drag the 3D view to look around. | Левый борт — слева, если смотреть на нос (вперёд); правый борт — справа. Потяните 3D-вид, чтобы осмотреться. |

The new keys are appended at the end of both files, in this order. Removed from both files (deleted where they are): `tab.view`, `cam.hint`, `cam.barLabel`. `cam.label` stays (the camera menu's label). `cam.short.*` stay (the chip's text; the Russian short words of M23 stay).

Changed (both files): in `scene.failedHint` and `error.banner`, "View → Share" becomes "Settings → Share", and «Вид» → «Поделиться» becomes «Настройки» → «Поделиться». (`scene.unsupportedHint` already says the settings still work: true, since the gear is created without WebGL.)

### 6.6 Tests

No new unit tests (no model change). The one allowed change: delete the `tab.view` assertion in `tests/languages.test.ts` (`expect(UI_STRINGS.ru?.['tab.view']).toBe('Вид')`). `npm test` must stay green otherwise: the language tests (same keys in the same order in `en` and `ru`, Latin scan) cover the new strings; regenerate `docs/review/ru.md`.

### 6.7 Helpers (`scripts/ui.mjs`)

Write the helpers of 3.4 with their M25 behaviour.

### 6.8 Browser checks

**Move every existing check onto the helpers** (no check is dropped or weakened):

- every `getByRole('tab', { name: … })` → `showSection(page, <id>)` (Ropes → `ropes`, Wind → `conditions`, Learn → `learn`, and the Russian names in `shots-m23.mjs` likewise); every View-tab click → `openSettings(page)` (then `closeSettings(page)` before the check goes on to the 3D view or the panel);
- `tab:` in scenes → `section:` or `settings: true` (3.4), with the scene runner in `shots.mjs` updated;
- camera buttons (`getByRole('button', { name: 'Top' })`, `'Helm'`, `'Map'`, `'Side (port)'`, and `getByText('Side (starboard)')` in the View tab) → `setCamera(page, <preset>)`;
- `.camera-bar` top in the tap sweeps and small-parts taps → `viewBottom(page)`;
- the M23 checks that walk the tabs walk `showSection` over `ropes`, `conditions`, `learn` and the settings dialog instead;
- the M24 checks (`shots-m24.mjs`) that open the Learn tab → `showSection(page, 'learn')`;
- clicks on `#tab-learn`, `#tab-ropes` and the like (`shots-m20.mjs`, `shots-m21.mjs`, `shots-m22.mjs`, `shots-m23.mjs`) → `showSection`;
- tab names held in variables (`shots-m5.mjs`'s audit table with `'View'`, `shots-m13.mjs`'s `tab` column, `shots-m7.mjs`'s `tab` argument) → section ids or `settings`;
- `shots-m23.mjs`: `TAB_NAMES` becomes `['Концы', 'Ветер', 'Обучение']` and the check "the four tabs in Russian" becomes "the three tabs in Russian"; its walk over the View tab walks the settings dialog;
- the footer: `shots-m5.mjs`'s check that reads `footer.footer` calls `openSettings` first; the scene `footer-disclaimer` gets `settings: true` (its `scrollTo` stays);
- the general check (`shots.mjs`): its "Top" click becomes `setCamera(page, 'top')`; right after the drag step, `setCamera(page, 'side-starboard')` (the view behind the dialog is inert, so the camera is set before it opens); then `openSettings` and the clicks on "1 %", "Debug overlay", "High" and "Low" with the dialog open the whole time, and `closeSettings` after the "Low" step. The expected links are unchanged.

The scene runner handles a scene's fields in this order: `section` or `settings` → `open` → `click` → `type` → `scrollTo` → `centre`.

Files that need it today: `shots.mjs`, `shots-m4a.mjs`, `shots-m4b.mjs`, `shots-m5.mjs`, `shots-m6.mjs`, `shots-m7.mjs`, `shots-m8.mjs`, `shots-m10.mjs`, `shots-m11.mjs`, `shots-m13.mjs`, `shots-m14.mjs`, `shots-m17.mjs`, `shots-m19.mjs`, `shots-m20.mjs`, `shots-m21.mjs`, `shots-m22.mjs`, `shots-m23.mjs`, `shots-m24.mjs` (`grep -n "getByRole('tab'\|tab: '\|#tab-\|tab-\|camera-bar\|footer\|name: 'Top'\|name: 'Helm'\|name: 'Map'\|Side (\|'View'" scripts/*.mjs` finds them all). Also `scripts/shots.mjs`'s `openPage` label tests (3.6).

`.github/workflows/ci.yml`: a new part `live, Phase 5` with `SHOTS_NO_SCENES=1 SHOTS_NO_TAPS=1 SHOTS_ONLY=m25,m26,m27,m28,m29`, and `m25,m26,m27,m28,m29` added to the `SHOTS_SKIP` list of `live, Phase 2 on`.

`scripts/shots-m25.mjs` (registered in `shots.mjs`: import, `SCENES`, `liveGroups`):

Scenes:
- `settings-open`: `?wd=60&ws=12`, `settings: true`.
- `camera-menu-open`: `?wd=60&ws=12`, then a click on `camera-chip` (scene field `click: ['camera-chip']`).

Live checks (phone size unless said):
1. The panel has exactly three tabs (`tab-ropes`, `tab-wind`, `tab-learn`); no element `#pane-view`.
2. The chip row: `camera-chip`'s `.chip-label` reads "Port" on `?`; `setCamera(page, 'top')` → `waitForLink(page, ['cam=top'])` and the label reads "Top"; choose `map` → `cam=map` and `map-canvas` is visible; choose `side-port` → back to 3D. The camera menu shows the `cam.menuHint` text.
3. `?lb=0`: drag the 3D view (as the general check does, from a third of the canvas's height) → the label reads "Free".
4. Camera menu keyboard: focus `camera-chip`, Enter → the menu shows with focus on the checked item; ArrowDown, Enter → the next preset is chosen and focus is back on the chip; Escape on an open menu closes it.
5. Settings: `openSettings` → the dialog shows `language-en`, `#labels-toggle`, `#time-bar-toggle`, `clock-switch`, the step and detail options, `share-button`, `reset-button`, `#legend-toggle`, `#debug-toggle`, `disclaimer`, `build-version`; focus is on `settings-close`; Escape closes it and focus is on `settings-button`.
6. In the dialog: "1 %" → `waitForLink(page, ['step=1'])`; Debug overlay on → `debug=1` and the overlay shows; Labels off → `lb=0`. Escape with a part selected (`?sel=part_boom`) and the dialog open closes only the dialog: `sel=part_boom` stays in the link.
7. Russian (`?lang=ru`): `settings-button`'s `aria-label` is exactly "Настройки"; `#settings-title` reads "Настройки".
8. Side layout (1440 × 900): the dialog covers the panel column only (its left edge ≥ the panel's left edge − 1 px) and the 3D canvas is still visible.
9. `auditPage` (accessibility audit) on: the settings dialog open (phone and desktop), the camera menu open (phone): clean.

### 6.9 Docs

- `CLAUDE.md`, Deploy paragraph: "The footer of a preview shows the PR's commit." becomes "Settings → About in a preview shows the PR's commit."
- `docs/CODE_MAP.md`: `cameraChip.ts`, `chipMenu.ts` and `settingsMenu.ts` rows (and `cameraBar.ts` removed); `panel.ts` row (three tabs); `scripts/ui.mjs` in "Tests and scripts".
- Where the docs send the owner to the footer or the View tab (the old milestone checklists in WORKFLOW stay as they are, they are a record): `docs/WORKFLOW.md` sections 2–4 ("version in the footer" / "footer version" → "version in Settings → About"; "View tab → Share" → "Settings → Share", in the `/bug` row and in the bug-report template); `.claude/skills/milestone/SKILL.md` and `.claude/skills/bug/SKILL.md` (the same two phrases where they appear); `README.md` ("camera buttons (port side, starboard side, top, bow, helm)" → "the camera chip (port side, starboard side, top, bow, helm, map)"; "View tab switch" → "a switch in Settings"; "View → Share" → "Settings → Share"); the comment in `.github/workflows/pr-preview.yml` ("the footer" → "Settings → About").

### 6.10 Done when

The owner, on the phone: the gear opens Settings with every old View-tab setting and the About lines; the camera chip's menu changes the view; there is no View tab. `npm run typecheck`, `lint`, `test`, `build` green; CI `browser-checks` green with every earlier check moved onto the helpers.

### 6.11 Not in M25

The sheet (M26), modes and sections (M27), the mini-map and its switch (M28).

### 6.12 Decided in the M25 PR

- `createChipMenu`'s `options` also takes `testId` (the menu's `data-testid`, `camera-menu`) and `hintClass` (the hint's extra class, `camera-menu-hint`), so the shared code stays free of camera words. The hint paragraph sits inside the `role="menu"` element, after the items.
- The settings dialog is a child of `.shell` (the layout's root), next to `.view` and `.panel`; `inert` is set on exactly `:scope > .view` and `:scope > .panel`, so the error banner stays reachable.
- The camera chip's `aria-label` is the long form (`cam.chip`), its visible text the short word; the menu is placed again each time it opens and pushed left if it would pass the view's right edge.
- The long Map and Free explanation of the old `cam.hint` is dropped with the key: the new `cam.menuHint` (spec text) is all the menu says.
- Scene and screenshot names that said "view-tab" now say "settings" (`settings-debug`, `settings-labels-toggle`, `settings-share-reset`, `ru-settings`, `live-desktop-settings-detail-high`).
- `scripts/ui.mjs` is added to the browser-globals block of `eslint.config.js` (its helpers run code inside the page).
- Owner's answers on PR #62 ("accept all questions", "fix 1 and 4 from independent review"): the camera menu keeps the short `cam.menuHint`; the tall menu on a phone is accepted until M26. The settings dialog is padded with `env(safe-area-inset-*)` (the head takes the top inset and stays pinned while the dialog scrolls; the side layout leaves the left inset out). Comments that said "View tab" now say Settings. Left for M29 (owner did not ask for them now): the chip showing the full view name instead of the short word ("Stbd"), and linking the menu hint with `aria-describedby`.
- Only the M25 behaviour of the helpers of 3.4 is written; `setSheet`, `dragHandle`, `setMode` and `openAllSections` come with M26 and M27.

---

## 7. M26: Phone layout with a pull-up sheet

**Independent review: required** (the shared layout, the camera framing, pointer gestures and the frame rate on a phone).

### 7.1 Files

New: `src/ui/sheet.ts`, `src/ui/sheetGeometry.ts`, `tests/sheet.test.ts`, `scripts/shots-m26.mjs`.
Changed: `src/ui/layout.ts`, `src/app/app.ts`, `src/ui/infoCard.ts`, `src/ui/panel.ts`, `src/render3d/cameraRig.ts`, `src/render3d/sceneConfig.ts`, `src/style.css` (also the map canvas's box), both `ui.json`, `docs/review/ru.md`, `scripts/ui.mjs`, `scripts/shots.mjs`, the `shots-m*.mjs` of 7.8, `docs/CODE_MAP.md`.

### 7.2 Data

`src/render3d/sceneConfig.ts`, `SCENE.camera` gains:

```ts
/** The camera keeps the boat above at most this share of the view's height at the bottom (a half sheet and the chip row cover 57 % on a phone, PHASE5_SPEC 3.3). */
maxBottomInsetShare: 0.62,
/** The same at the top (the instrument strip and the time bar), as before. */
maxTopInsetShare: 0.4,
/** The boat is always framed in at least this much height (small phones at half height). */
minFreePx: 120,
```

`cameraRig.setViewport` uses the two shares instead of its two literal `0.4`s. Then, if `height − inset − top < minFreePx`, it lowers `top` first (not below 0), then `inset` (not below 0), until the free height is `minFreePx` or both are 0. In the side layout the insets stay far below these limits, so nothing changes there. (On 390 × 844 at half the free height is 844 − 482 − 116 = 246 px; on 360 × 740 Sailing it is 740 − 430 − 166 = 144 px.)

### 7.3 Pure helpers

`src/ui/sheetGeometry.ts` exactly as 3.3 (no DOM, no imports from the DOM files, so tests import it).

### 7.4 Store and URL

No change. The sheet height is not in the store or the link. A link opens with the sheet at **half** on a phone (owner's answer 3).

### 7.5 UI

**Layout** (`layout.ts`, `style.css`), stacked only (the side layout is unchanged):

- Every rule below is under `html[data-layout='stacked']`. `.shell` is `position: relative; height: 100%; overflow: hidden; padding: 0` (no grid rows). `.view` is `position: absolute; top: env(safe-area-inset-top); left: env(safe-area-inset-left); right: env(safe-area-inset-right); bottom: 0`. The panel element is the **sheet**: `position: absolute; left: 0; right: 0; bottom: 0; height: var(--sheet-h); padding-bottom: env(safe-area-inset-bottom)`, `border-radius: 14px 14px 0 0`, `box-shadow: 0 -2px 10px rgb(10 20 30 / 0.18)`, `background: var(--surface)`, `z-index: 7` (3.1). `--sheet-h` and `--view-bottom-inset` are set in px by `sheet.ts` (on `.shell`, so both the sheet and `.view` see them). `.clock-card` goes to `z-index: 9`.
- The 3D canvas keeps filling the whole view (behind the sheet), so dragging never resizes it.
- `--view-share` and `--view-min` are no longer used in the stacked layout.

**The sheet** (`src/ui/sheet.ts`):

```ts
export interface Sheet {
  height(): SheetHeight;
  /** Animates to a height (stacked layout; ignored in the side layout). */
  setHeight(height: SheetHeight): void;
  /** Runs after a height change has finished animating (and on a layout change). */
  onChange(listener: (height: SheetHeight) => void): void;
  /** The head row under the handle (M26: the tabs; M27: the quick row). */
  head: HTMLElement;
  /** Stacked layout and height 'peek' (3.1). */
  atPeek(): boolean;
  /** The bottom inset for the 3D framing: cameraInsetPx(height, space) plus the sheet's bottom padding (the phone's safe area). Stacked layout only. */
  cameraInset(): number;
}
export function createSheet(layout: LayoutShell, view: HTMLElement, topArea: HTMLElement): Sheet;
```

- The panel element gets the class `sheet`, `data-testid="sheet"`, `data-sheet="peek|half|full"` and `data-sheet-moving="true|false"`. `createSheet` prepends to it, in this order: the **handle** `button.sheet-handle` (`data-testid="sheet-handle"`, full width, 44 px tall, `touch-action: none`, a centred grip bar 36 × 5 px, `border-radius: 3px`, `background: var(--line)`, a `:focus-visible` outline; `aria-label` = `t('sheet.handle', { height: t('sheet.height.<height>') })`) and the head (`div.sheet-head`); `.panel-body` follows (scrolls, as today).
- **Drag:** `pointerdown` on the handle captures the pointer and records `startY` and the start height; while moving, the sheet's height follows the finger (`height = start height + (startY − y)`, clamped between `sheetHeightPx('peek')` and `sheetHeightPx('full')`), with no CSS transition. Samples `(event.timeStamp, height)` are kept. On `pointerup`: if `|y − startY| < SHEET.tapMaxMovePx` it is a **tap** (`tapSheet`); otherwise `snapSheet(start, height now, velocity, space)`, where velocity = (height now − height of the newest sample at least `SHEET.velocityWindowMs` old, or the first sample if none is that old) / `Math.max(1, time between them in ms)`. `pointercancel` snaps the same way with velocity 0.
- **Taps and keys:** taps are handled on `pointerup` only. The button's `click` event acts only when `event.detail === 0` (Enter or Space from the keyboard) and then works as a tap; other clicks are ignored (they follow every pointer tap and drag). ArrowUp = `stepSheet(h, +1)`; ArrowDown = `stepSheet(h, −1)` (both `preventDefault`).
- **During a drag** `--sheet-h` and `--view-bottom-inset` follow the finger on every `pointermove` (no transition).
- **Safe area:** the px that `sheet.ts` writes to `--sheet-h` and `--view-bottom-inset` is the geometry's height plus `parseFloat(getComputedStyle(sheet).paddingBottom)` (the phone's bottom safe area; 0 in Playwright, so the numbers of 7.7 and 7.9 hold).
- **Animation contract:** on a release, tap, key or `setHeight`, `data-sheet`, `height()`, `--sheet-h` and `--view-bottom-inset` change **at once** to the target and `data-sheet-moving` becomes `true` on the sheet and, mirrored, on `.shell`; the height then animates in `SHEET.transitionMs`. The transitions exist only while moving, so drags and resizes never animate: `.shell[data-sheet-moving='true'] .sheet { transition: height 200ms ease-out; }` and `.shell[data-sheet-moving='true'] :is(.view-bottom, .info-area, .mini-map) { transition: bottom 200ms ease-out; }`. With reduced motion (read with `matchMedia('(prefers-reduced-motion: reduce)').matches` at every height change) there is no animation. The change ends on the sheet's own `transitionend` (`event.target === sheet && event.propertyName === 'height'`) or, if that never comes (same height, `transitioncancel`, reduced motion, hidden), on a `setTimeout(SHEET.transitionMs + 100)` fallback, whichever is first, once per change: then `data-sheet-moving` becomes `false` and the `onChange` listeners run. With reduced motion the change ends at once (no timer).
- **At peek** `.panel-body` has `visibility: hidden` (the head stays visible): `html[data-layout='stacked'] .sheet[data-sheet='peek'] .panel-body { visibility: hidden; }` (stacked only: in the side layout `data-sheet` keeps the last stacked height). At half and full it is visible.
- `SheetSpace` comes from the view's `clientHeight` and the top area's bottom (`topArea.offsetTop + topArea.offsetHeight`, the value `trackTopHeight` already writes as `--view-top-h`); the sheet recomputes its px height whenever either changes (ResizeObserver) and on a layout change, without animation.
- **Side layout:** the handle is `hidden`, the panel is docked as today (`--sheet-h` unset, `--view-bottom-inset: 0px`), `data-sheet` keeps the last stacked height so turning the phone back restores it.
- First open: `half`.

**Wiring** (`app.ts`): create the top area (`.view-top`, the strip, the time bar, the clock) first, then `createSheet(layout, layout.view, top)`, then `createPanel(layout.panel, store, sheet)`; the panel appends its `.tabs` to `sheet.head`.

**Panel** (`panel.ts`): a click on a tab, a tab key (ArrowLeft, ArrowRight, Home, End), and `showTab` (used by the instrument strip, More and "Try it"), raise a peek sheet to half. The internal tab switching driven by the store (a rope selected in 3D opens the Ropes tab; the first tab at start) never changes the sheet's height.

**Overlays at the bottom of the view**: `.view-bottom` (8), `.info-area` (stacked, 60), `.map-scale` (60), `.map-zoom` (zoom in 108, zoom out 60) and `.map-hint` (60) use `calc(var(--view-bottom-inset, 0px) + <that px>)`. (`.rig-alerts` is placed from the bottom only in the side layout and stays; the other `bottom:` rules in `style.css` are not overlays.) The map's canvas `.map-canvas` ends at the sheet's top: `height: auto; bottom: var(--view-bottom-inset, 0px)` (its ResizeObserver redraws it).

**Info card, stacked** (`infoCard.ts`): it moves from the top of the panel to over the view (`place` puts it in `layout.view` in both layouts): `.info-area` `position: absolute; left: 8px; right: 8px; bottom: calc(var(--view-bottom-inset, 0px) + 60px); display: flex; justify-content: flex-start; pointer-events: none`; the card (replacing today's stacked `.info-card` rule) `width: 100%; max-height: 140px; overflow-y: auto; border-radius: 10px; background: rgb(255 255 255 / 0.95); box-shadow: 0 2px 10px rgb(10 20 30 / 0.25); pointer-events: auto`. `InfoCardOptions` gains `atPeek?: () => boolean` (`app.ts` passes `sheet.atPeek`); `shownInPanel` applies only when `atPeek()` is false. `app.ts` calls `card.refresh()` in `sheet.onChange`.

**3D framing** (`app.ts`): in the stacked layout the bottom inset passed to `scene.resize` is `sheet.cameraInset()`; in the side layout it is measured from `.view-bottom` as in M25. `resize` also runs on `sheet.onChange`.

### 7.6 Strings

| Key | English | Russian |
|---|---|---|
| `sheet.handle` | Panel: {height}. Tap to change its height, or drag it. | Панель: {height}. Нажмите, чтобы изменить высоту, или потяните. |
| `sheet.height.peek` | low | внизу |
| `sheet.height.half` | half height | на полэкрана |
| `sheet.height.full` | full height | во весь экран |

Appended at the end of both files, in this order.

### 7.7 Tests (`tests/sheet.test.ts`)

Space A = `{ viewHeightPx: 844, topAreaPx: 116 }`; space B = `{ viewHeightPx: 740, topAreaPx: 166 }`; space C = `{ viewHeightPx: 740, topAreaPx: 114 }`.

1. `sheetHeightPx`: A → peek 100, half 422, full 668. B → half 370, full 514. C → full 566. `{ viewHeightPx: 300, topAreaPx: 200 }` → full = half = 150. `{ viewHeightPx: 160, topAreaPx: 40 }` → half 100 (not below peek).
2. `cameraInsetPx`: A → peek 160, half 482, full 482.
3. `snapSheet` (space A): (`half`, 600, 0.1) → `full` (68 from 668, 178 from 422); (`half`, 430, −0.6) → `peek`; (`peek`, 150, 0.7) → `half`; (`full`, 700, −0.5) → `half`; (`peek`, 261, 0) → `half` (tie: 261 is midway between 100 and 422); (`peek`, 260, 0) → `peek`; (`full`, 800, 0.9) → `full`.
4. `tapSheet`: peek → half → full → peek. `stepSheet`: (peek, −1) → peek; (full, +1) → full; (half, +1) → full.

### 7.8 Helpers and existing checks

`scripts/ui.mjs`: `setSheet`, `dragHandle`, and `showSection` / `sectionShown` as in 3.4 (M26 column). The scene runner handles `sheet: '<height>'` (calls `setSheet` right after `section`/`settings`).

Existing checks that the sheet now covers (change exactly these; list any other in the PR):
- `scripts/shots.mjs`: the tap sweeps and the small-parts taps on the phone size call `setSheet(page, 'peek')` before tapping (the boat is framed largest there; `viewBottom` gives the limit).
- `shots-m18.mjs` `canvasStats`: calls `setSheet(page, 'peek')` first; the elements it hides to read the canvas include `[data-testid="sheet"]`; its 60 × 60 square is centred on the free area, at y = (the top area's bottom + `viewBottom(page)`) / 2, measured before the overlays are hidden (the boat is framed there, not at the canvas's centre).
- `shots-m14.mjs` "tap on the water" (at 12 % / 45 % of the canvas, inside the chip row at half height): `setSheet(page, 'peek')` first.
- `shots-m17.mjs` `canvasLuminance`: `setSheet(page, 'peek')` first.
- Taps placed from `__sailDebug.setView`, `partPoint` or `__sailWater.buoyScreen` (`shots-m4a.mjs`, `shots-m5.mjs`, `shots-m9.mjs`, `shots-m16.mjs`): `setSheet(page, 'peek')` first.
- Any other check that fails only because the panel now starts at half height calls `setSheet` or `showSection` first.

### 7.9 Browser checks (`scripts/shots-m26.mjs`)

Scenes (phone size, plus the other sizes as usual):
- `sheet-peek`: `?wd=60&ws=12&cam=side-port`, then `setSheet` peek (scene field `sheet: 'peek'`, handled by the scene runner through `setSheet`).
- `sheet-half`: the same link (default half).
- `sheet-full`: the same link, `sheet: 'full'`.
- `sheet-half-realistic`: `?mode=realistic&st=port&cam=side-port`.

Live checks (phone 390 × 844 unless said; links open Sailing with the clock shown, 3.6, so the top area ends at 116 px):
1. `?wd=60&ws=12`: `data-sheet="half"`, the sheet's height is 422 ± 1 px, the 3D canvas is 844 px tall, the page does not scroll.
2. Taps on the handle (each followed by waiting for `data-sheet-moving="false"`): half → full (height 668 ± 1, its top at or below the chip row's bottom) → peek (100 ± 1) → half. At peek `.panel-body` is `visibility: hidden`.
3. Drag (`dragHandle`): from half, −150 px in 12 steps with 50 ms waits → `full`; from full, +120 px in 6 steps with no waits (a fling) → `half`; from half, +50 px in 12 steps with 50 ms waits → `half` (nearest).
4. Keyboard: focus the handle, ArrowDown → peek, ArrowUp twice → full.
5. Framing (`?wd=60&ws=12&cam=side-port&debug=1`): at peek and at half (`setSheet`, then wait 800 ms for the camera), the boat's origin `window.__sailDebug.project(0, 0, 0)` and the point 10 m up the mast `project(0, 10, 0)` (as the small-parts check uses) both lie below the top area's bottom and above `viewBottom`.
6. Info card: `?sel=part_boom&wd=60&ws=12` at half → the card shows, and its box lies above the chip row's top and above the sheet's top. Then open `?sel=rope_mainsheet&wd=60&ws=12`, `setSheet(page, 'peek')` → the card shows (the strip is hidden at peek).
7. Map: `setCamera(page, 'map')` at half → `[data-testid="map-canvas"]`'s bottom edge is at the sheet's top (± 1 px), and the bottom of `map-zoom-out` is at or above the sheet's top.
8. Side layout (1440 × 900 and 844 × 390): no handle, the panel is on the right as in M25, `--view-bottom-inset` is 0.
9. Rotation: open at 390 × 844 at full, resize to 844 × 390 (side), then back → `data-sheet="full"` again.
10. `auditPage` at peek, half and full (phone): clean.
11. Frame times: `?debug=1&wd=60&ws=20&wm=gusty` at 390 × 844 (low detail): `setSheet` peek, wait 3 s, read the debug overlay's frame figures; the same at half. Reported in the PR only; headless numbers never fail the run (the owner checks the phone, 7.10).
12. Reduced motion: `page.emulateMedia({ reducedMotion: 'reduce' })`, tap the handle → `data-sheet` changes, `data-sheet-moving` is `false` and the px height is the target's within 50 ms.

### 7.10 Done when

On the owner's phone: the boat fills the screen, the sheet moves between its three heights by dragging and tapping, nothing hides behind the sheet that cannot be reached, and the frame rate is still smooth (the debug overlay shows 50 fps or more with `?debug=1&wd=60&ws=20&wm=gusty`). If it drops below 50 fps, say so in the PR with the numbers; do not change detail settings in this milestone.

### 7.11 Not in M26

Modes, sections, the quick row and the mode chip (M27). The tabs stay (they move into the sheet's head).

### 7.12 Decided in the M26 PR

- **The end of a height change** (7.5): the 300 ms fallback timer re-arms itself while the sheet is still animating (`sheet.getAnimations()`), up to 2 s, so a busy main thread that starts the animation late (headless software drawing takes ~100 ms a frame) is not cut short and snapped to its end. A change to the same size, or with reduced motion, ends at once without a timer.
- **The map canvas's box** (7.5): `height: calc(100% - var(--view-bottom-inset, 0px))`, not `height: auto; bottom: …`. A canvas is a replaced element: with `height: auto` it keeps the height of its own drawing buffer, which the map sets from its box, so it shrank on every resize.
- **A drag from peek** keeps the panel body visible while the finger is down (`data-dragging` on the sheet), so the sheet does not rise empty.
- **`setPointerCapture`** is wrapped in `try/catch` (a pointer that is already gone must not stop the drag).
- **Browser checks** (7.8, 7.9): `dragHandle` sends a fling (`delayMs` 0) as pointer events from inside the page in one task, because every real mouse move takes ~100 ms in headless Chromium with software drawing, so a mouse "fling" is slow in wall-clock time and the app rightly does not treat it as a fling; slow drags still use the mouse. The drag checks (live check 3) open on `cam=map`, where frames are cheap. The tap sweeps and small-part taps call `setSheet(page, 'peek')` for every viewport (a no-op in the side layout).
- `--view-share` and `--view-min` are removed from `style.css` (nothing uses them any more).
- Owner's answers on PR #63 ("fix 1, 2, 3 and 4 from independent review", "agree with open question recommendation"): tapping empty water or sky does not lower the sheet. **Camera:** `cameraRig` raises `controls.maxDistance` to the distance a preset needs (`allowDistanceOf`) whenever a preset pose is applied, so the whole boat fits above a half-height sheet; hand zooming keeps `SCENE.camera.maxDistance` once a preset needs less. Live check 5 now tests the masthead (22 m) and the bottom of the keel (−2.4 m), not a point 10 m up the mast. **Info card:** hidden while the sheet is at full (`Sheet.atFull()`, `InfoCardOptions.atFull`), shown again when it comes down. **Slide:** `transitioncancel` ends a change only when nothing is animating any more; a pointer going down on the handle during a slide stops the slide where it is and the drag starts from that height.

---

## 8. M27: Modes and sections

**Independent review: required** (new store field and link key `m`, old links, Show me and Back, the panel rebuilt, glossary text edits).

### 8.1 Files

New: `src/app/appMode.ts`, `src/ui/modes.ts`, `src/ui/sections.ts`, `src/ui/modeChip.ts`, `src/ui/quickRow.ts`, `tests/modes.test.ts`, `scripts/shots-m27.mjs`.
Changed: `src/app/store.ts`, `src/app/urlState.ts`, `src/app/urlSync.ts`, `src/ui/panel.ts`, `src/ui/ropesTab.ts`, `src/ui/learnTab.ts`, `src/ui/windPanel.ts`, `src/ui/windInstrument.ts`, `src/ui/windModePanel.ts`, `src/ui/wavesPanel.ts`, `src/ui/realisticPanel.ts`, `src/ui/sailsPanel.ts`, `src/ui/autopilotPanel.ts`, `src/ui/enginePanel.ts`, `src/ui/ropeLegend.ts`, `src/ui/infoCard.ts`, `src/ui/instrumentStrip.ts`, `src/app/app.ts`, `src/style.css`, both `ui.json`, both `glossary.json`, `docs/review/ru.md`, `tests/glossary.test.ts` and `tests/quotedLabels.ts` (8.8), `scripts/ui.mjs`, `scripts/shots.mjs` and the `shots-m*.mjs` of 8.9, `docs/CODE_MAP.md`. The files keep their names (`ropesTab.ts` and `learnTab.ts` now build sections; update their header comments).

### 8.2 Data

`src/ui/modes.ts` exactly as 4.4 (the table is the data).

### 8.3 Store and URL

`src/app/appMode.ts` as 4.1.

**Store** (`store.ts`):
- `AppState.appMode: AppMode`. `initialState`: `appMode = overrides.appMode === 'learn' ? 'learn' : settings.ropesMode` (the settings after overrides).
- `setAppMode`: `'learn'` → `{ ...state, appMode: 'learn' }` (the ropes mode is kept); `'easy'` / `'realistic'` → `appMode` = that mode and `settings.ropesMode` = that mode, through the same `withTimeRule` as `setRopesMode`. Returns the same object when nothing changes (Learn → Learn; Easy → Easy with the ropes mode already `easy`).
- `setRopesMode` (still used by links and tests): sets the ropes mode as today, and if `appMode !== 'learn'` also sets `appMode` to it.
- `reset`: `appMode` = `'easy'` (the default ropes mode). Reset in Learn mode therefore leaves Learn mode and clears `learn` (as Phase 4's reset cleared it); this is intended.
- `load`: takes `appMode` from the loaded state.
- `openLearn` is unchanged (it does not change the mode; the UI dispatches `setAppMode` as well where 8.5 says so).

**URL** (`urlState.ts`):
- Parse: `appMode = 'learn'` if `m=learn`, or if the link has a valid `learn=<id>` (registered id); otherwise the ropes mode from `mode`. Other `m` values are ignored.
- Serialize: right after `cam`, `m=learn` when `appMode === 'learn'`. `learn=<id>` (right after `sel`, as today) only when `appMode === 'learn'` and an entry is open.
- `urlSync.ts`: the subscriber also compares `state.appMode`. `openScene` keeps the mode: `appMode: state.appMode === 'learn' ? 'learn' : next.appMode` (and `learn: state.learn`, as today).
- **Practice** (`realisticPanel.ts`, the button that loads a practice scenario with `load`): keeps the mode the same way as `openScene` (`appMode: state.appMode === 'learn' ? 'learn' : next.appMode`).
- `popstate` needs no change (`parseUrlState` sets `appMode`).

### 8.4 Sections (`src/ui/sections.ts`)

```ts
export interface SectionView {
  id: SectionId;
  element: HTMLElement;
  /** Opens or folds the section. */
  setOpen(open: boolean): void;
  isOpen(): boolean;
}
/** Wraps a block in a section with a fold header and, if it has explanations, a "?" button. */
export function createSection(id: SectionId, title: string, body: HTMLElement[], hasExplain: boolean): SectionView;
```

DOM (classes and test ids required):

```html
<section class="panel-section" data-section="sails" data-testid="section-sails" data-open="true" data-explain="closed">
  <div class="section-head">
    <button type="button" class="section-toggle" data-testid="section-toggle-sails" aria-expanded="true" aria-controls="section-body-sails">
      <span class="section-head-title">Sails</span><span class="section-chevron" aria-hidden="true">▾</span>
    </button>
    <button type="button" class="section-explain" data-testid="section-explain-sails" aria-pressed="false" aria-label="Explain: Sails">?</button>
  </div>
  <div class="section-body" id="section-body-sails">…</div>
</section>
```

- Folded: `data-open="false"`, `aria-expanded="false"`, the body `hidden`, the chevron turned −90°.
- The "?" button (44 × 44) toggles `data-explain` between `open` and `closed` and `aria-pressed`; its `aria-label` is `t('section.explain', { name: <title> })`. CSS: `.panel-section:not([data-explain='open']) .explain { display: none; }`. A section without `.explain` elements has no "?" button. (The class `section-head-title` is new: the existing global `.section-title` rule styles the `h3`s inside the blocks and must not apply to the head.)
- Section titles: `ropes` `t('tab.ropes')`; `sails` `t('trim.label')`; `autopilot` `t('autopilot.label')`; `engine` `t('engine.label')`; `conditions` `t('section.conditions')`; `learn` `t('tab.learn')`; `legend` `t('legend.title')`. The blocks' own `h3.section-title` headings of the Sails, Autopilot, Engine (Ropes-tab block only, not the Helm lever) and Rope colours blocks are removed (the section head replaces them). The autopilot block is built by the same function for the section and the Helm station: `createAutopilotPanel(store, { heading = true } = {})`; the Autopilot section passes `heading: false`, the Helm station keeps the heading.

**What each section holds:**

| Section | Content (built once) | Explanations (`class="explain"` added) |
|---|---|---|
| `ropes` | Easy (`.ropes-easy`): the mode line (`ropes-mode`), the clutch drawing, the strip, `h3` "All ropes and the wheel", the list **without** the autopilot and engine blocks, and the two hints `clutch.hint` and `ropes.mode.easyHint`. Realistic (`.ropes-realistic`): everything `createRealisticPanel` returns. Which one shows follows `settings.ropesMode`, as today. Removed: the Easy / Realistic switch (`createModeSwitch`), the "About this tab" heading, and `showMode`'s moving of the Sails block and the legend (they are sections now). | `ropes-mode` line, `clutch.hint`, `ropes.mode.easyHint`, `real.helm.hint`, `real.helm.slot` |
| `sails` | `createSailsPanel` | `trim.intro` |
| `autopilot` | `createAutopilotPanel` (the Easy one; the Helm station keeps its own) | — |
| `engine` | `createEnginePanel` (the Easy one; the Helm station keeps `createEngineLever`) | `engine.hint` (the one in `createEnginePanel` only) |
| `conditions` | everything `createWindPanel` returns, in today's order (true-wind line, Boat switch, wind instrument, direction, speed, wind changes, waves, presets) | `wind.hint`, `boat.mode.hint`, `instrument.hint`, `wind.dial.hint`, `wind.modes.hint`, `wind.newPattern.hint`, the waves hint (one `p`: `waves.hint` + `waves.effects`), the presets hint (one `p`: `wind.presets.hint` + `wind.presets.hint2`) |
| `learn` | everything `createLearnTab` returns | — |
| `legend` | `createRopeLegend` | — |

Live status lines stay visible (no `explain`): `wind-now`, `wind-speed-hint`, `wind-mode-hint`, `sea-status`, `autopilot-status`, `engine-status`, the Realistic strip's lines, `action-status`.

### 8.5 UI

**Panel** (`panel.ts`, rewritten): no tabs. `createPanel(host: HTMLElement, store: Store, sheet: Sheet, layout: LayoutShell)` builds the seven sections once (it creates the Sails block, the Easy autopilot, the Easy engine block and the legend itself, once each; `ropesTab.ts` no longer creates or moves them, and its `legend.hidden` toggling is removed: `sectionAvailable` hides the legend section) and returns:

```ts
export interface Panel {
  /** Opens a section, raises a peek sheet to half, and scrolls the section to the top of the panel body. */
  showSection(id: SectionId): void;
  /** True if the section is open, available, and not at peek (3.1). */
  shows(id: SectionId): boolean;
  /** setAppMode('learn'), openLearn(id), then showSection('learn'). */
  openLearnEntry(id: string): void;
  /** Runs after a section opens or folds, the mode changes, the sheet changes height, or the layout changes. */
  onChange(listener: () => void): void;
}
```

Callers: `createRopesTab(store: Store, openEntry: (id: string) => void): HTMLElement[]` returns only the Ropes section's content (Easy and Realistic); it passes `openEntry` on to `createRealisticPanel(store, openEntry)`. `createLearnTab(store: Store, openRopes: () => void): HTMLElement[]` (the `TabId` import goes; `openRopes` = `showSection('ropes')`). `learnTab.ts` exports `nameOf` (the quick row uses it). The info card's `showLearn` option becomes `panel.openLearnEntry`.

- The sections are placed in `.panel-body` in `MODE_LAYOUTS[appMode].order`; each unavailable one is `hidden` (`sectionAvailable`, re-checked on every state change). When `appMode` changes, the sections are re-ordered and each is opened or folded as the mode's `open` (stacked) or `openSide` (side layout) says; the "?" states reset to closed. A change of layout kind (stacked ↔ side) re-applies the open states the same way. Nothing else resets them: not other resizes, not a sheet height change, not a section becoming available or unavailable (it keeps its own open state).
- When `state.learn` changes to an entry while the `learn` section is open, the panel scrolls the `learn` section's top into view (Phase 4's Learn tab scrolled to the top for each entry).
- **Selection** (replaces Phase 1's "a selected rope opens the Ropes tab"): when `state.selection` changes to an id with `entryFor(id) !== undefined` and `appMode` is `easy` or `realistic`: if the sheet is not at peek, open the `ropes` section and reveal the strip: `ropesTab.ts` exports `revealRopeStrip(): void` (finds the visible `[data-testid="rope-strip"]` and calls its `revealStrip`), and the panel calls it after opening the section. At peek nothing moves (the quick row shows it). In Learn mode nothing moves.
- **Opening an entry** (More on the info card, "Read more in Learn" in the Easy strip `strip-learn` and the Realistic strip `real-learn`): `panel.openLearnEntry(id)`. See also inside Learn: `openLearn` only, as today.
- **"Try it"** in a Learn entry (`learn-try-<id>`): dispatch `setAppMode(state.settings.ropesMode)`, `select`, then `showSection('ropes')`. The label text changes (8.7).
- **The instrument strip** opens `showSection('conditions')` (it opened the Wind tab).
- The info card's `shownInPanel(id)`: `panel.shows('ropes') && ropesTabShows(id) && appMode !== 'learn'`, or `panel.shows('learn') && state.learn === id`.

**Mode chip** (`src/ui/modeChip.ts`, `createModeChip(row: HTMLElement, store: Store): void`, first in the chip row, created with or without WebGL): `data-testid="mode-chip"`, class `view-chip mode-chip`, `.chip-label` `t('mode.<appMode>')` then the caret, `aria-label` = `t('mode.chip', { name: t('mode.<appMode>') })`. Its menu (built with `createChipMenu`, 3.2; `data-testid="mode-menu"`, `aria-label` = `t('mode.label')`) lists Learn, Easy, Realistic (`mode-option-learn`, `-easy`, `-realistic`); each item holds `<span class="mode-option-name">` with `t('mode.<mode>')` and under it `<span class="mode-option-hint">` with `t('mode.<mode>.hint')` in `var(--font-small)` and `var(--muted)` (item min-height 56 px). Choosing dispatches `setAppMode`.

**Quick row** (`src/ui/quickRow.ts`, `createQuickRow(head: HTMLElement, store: Store, sheet: Sheet): void`; `data-testid="quick-row"`, 56 px tall, `display: flex; align-items: center; gap: 8px; padding: 0 12px`): shown only at **peek** (3.1), by CSS alone: `html[data-layout='stacked'] .sheet[data-sheet='peek'] .quick-row { display: flex }`, otherwise `display: none` (the sheet body's `visibility: hidden` at peek is switched by the same attribute; never from `onChange`, 3.5). Content by mode:

- **Easy**, a selection whose `entryFor(selection)?.controlId` is set: the control's name (`t(controlView(id).name)`, `quick-name`), its value (`valueText`, `quick-value`), and − / + buttons (`stepButton`, with the same aria strings and the same step and snap as `createControl`: `control.less` / `control.more`, `wheel.less` / `wheel.more` for the wheel). Otherwise: `t('quick.easy')` (`quick-hint`).
- **Realistic**: `t('quick.realistic')` (`quick-hint`).
- **Learn**, an entry open: its name (`nameOf(id)`, `quick-name`) and a button `t('quick.read')` (`quick-read`) that raises the sheet to half. No entry: `t('quick.learn')` (`quick-hint`).

The tab bar is gone, so at peek the sheet shows the handle (44) and the quick row (56): `SHEET.peekPx` = 100.

**Side layout:** the panel shows the sections as in the stacked layout, opened as `openSide` says; no quick row.

**Removed:** the tabs (`TAB_IDS`, the tab bar and its keyboard code), the Easy / Realistic switch in the Ropes block, the "About this tab" heading.

### 8.6 Glossary text edits (both languages)

The words "Wind tab" and "Ropes tab" no longer mean anything. Replace these English sentences exactly (left → right) in `content/lang/en/glossary.json`, and make the same change in the Russian draft of the same field (Russian: «вкладка «Ветер»» → «раздел «Условия»», «вкладка «Концы»» → «раздел «Концы»», «блок авторулевого» → «раздел «Авторулевой»», with the case the sentence needs; `engine_control` showMe «Рычаг находится в блоке двигателя на вкладке «Концы».» becomes «Рычаг находится в разделе «Двигатель».»). `textStatus` stays `draft` in Russian.

| Id, field | Old | New |
|---|---|---|
| `env_water` showMe | Change “Waves” in the Wind tab to compare. | Change “Waves” in Conditions to compare. |
| `env_wind` short | The air moving over the water; in the app you set it in the Wind tab. | The air moving over the water; in the app you set it in Conditions. |
| `env_wind` what | The Wind tab sets its direction (from 0° north, clockwise) and speed, and can make it gusty, shifty, building or dying. | Conditions sets its direction (from 0° north, clockwise) and speed, and can make it gusty, shifty, building or dying. |
| `env_wind` showMe | Turn the dial in the Wind tab to change it. | Turn the dial in Conditions to change it. |
| `sail_jib` showMe | In the Wind tab, turn the wind to the other side of the bow: the car slides across by itself. | In Conditions, turn the wind to the other side of the bow: the car slides across by itself. |
| `fit_self_tacking_track` showMe | Turn the wind to the other side of the bow in the Wind tab and watch it slide across. | Turn the wind to the other side of the bow in Conditions and watch it slide across. |
| `engine_control` showMe | The engine block in the Ropes tab has the lever. | The Engine section has the lever. |
| `term_true_wind` what | The Wind tab sets it, and the instruments show it as TWA and TWS. | Conditions sets it, and the instruments show it as TWA and TWS. |
| `term_tacking` showMe | … press “Tack” in the autopilot block of the Ropes tab and watch … | … press “Tack” in the Autopilot section and watch … |
| `term_luffing` showMe | Haul the mainsheet in (Ropes tab) until the flapping just stops. | Haul the mainsheet in (Ropes section) until the flapping just stops. |
| `term_twist` showMe | Haul the vang (Ropes tab) and the twist closes. | Haul the vang (Ropes section) and the twist closes. |
| `term_beaufort` showMe | Raise the wind in the Wind tab to see more. | Raise the wind in Conditions to see more. |
| `term_heel` showMe | Ease the mainsheet in the Ropes tab and she stands up. | Ease the mainsheet in the Ropes section and she stands up. |
| `term_stall` showMe | Ease it to about 25 % in the Ropes tab and she speeds up. | Ease it to about 25 % in the Ropes section and she speeds up. |
| `term_fetch` showMe | Set “Waves” in the Wind tab to “Open sea”: … | Set “Waves” in Conditions to “Open sea”: … |
| `term_wave_height` what | The Waves block in the Wind tab shows it. | The Waves block in Conditions shows it. |
| `term_wave_height` showMe | … the Waves block in the Wind tab says they are 0.7 m high … | … the Waves block in Conditions says they are 0.7 m high … |
| `fit_autopilot_control` onThisBoat | The autopilot block in the Ropes tab is the app’s version of it. | The Autopilot section is the app’s version of it. |
| `fit_autopilot_control` showMe | Its block is in the Ropes tab: change the angle with its buttons. | Its section is called Autopilot: change the angle with its buttons. |

("…" = the rest of the sentence, unchanged.) After the edits, `grep -c "Wind tab\|Ropes tab\|View tab\|Learn tab" content/lang/en/glossary.json` is 0, and the Russian has no «вкладк». Regenerate `docs/review/ru.md`.

### 8.7 Strings

New (English exact; Russian copy exactly):

| Key | English | Russian |
|---|---|---|
| `mode.label` | Mode | Режим |
| `mode.chip` | Mode: {name}. Tap to change it. | Режим: {name}. Нажмите, чтобы сменить. |
| `mode.learn` | Learn | Обучение |
| `mode.easy` | Easy | Простой |
| `mode.realistic` | Realistic | Реалистичный |
| `mode.learn.hint` | Names and explanations of every part and word. | Названия и объяснения всех частей и слов. |
| `mode.easy.hint` | A slider for every rope. | Ползунок для каждого конца. |
| `mode.realistic.hint` | Clutches and winches, as on the boat. | Стопоры и лебёдки, как на яхте. |
| `section.conditions` | Conditions | Условия |
| `section.explain` | Explain: {name} | Пояснение: {name} |
| `quick.easy` | Tap a rope or a clutch: its − and + appear here. | Нажмите на конец или стопор: здесь появятся − и +. |
| `quick.realistic` | Pull the panel up to work the clutches and winches. | Поднимите панель, чтобы работать стопорами и лебёдками. |
| `quick.learn` | Tap any part of the boat to learn about it. | Нажмите на любую часть яхты, чтобы узнать о ней. |
| `quick.read` | Read | Читать |

Changed (English exact; the Russian draft changed to match):

| Key | New English | New Russian |
|---|---|---|
| `learn.tryIt` | Try it: | Попробуйте: |
| `view.legend.hint` | Shows what each rope colour means, in the Rope colours section. | Показывает, что значит каждый цвет конца, в разделе «Цвета концов». |
| `time.held.note` | Held still is a boat setting, so there is nothing to pause. You can change it in Conditions, under Boat. | «Яхта стоит» — настройка яхты, поэтому ставить на паузу нечего. Её можно изменить в разделе «Условия», в блоке «Яхта». |
| `ropes.mode.easyHint` | Easy mode: each rope is a slider. Realistic mode (choose it with the Mode button over the 3D view) works the ropes as on the boat: clutches, the winch and your hand. | Простой режим: каждый конец — ползунок. Реалистичный режим (выберите его кнопкой режима над 3D-видом) работает с концами как на яхте: стопоры, лебёдка и ваша рука. |

New keys are appended at the end of both files, in the order of the first table; removed keys are deleted where they are.

Removed from both files: `tab.wind`, `panel.tabsLabel`, `ropes.about.title`, `ropes.mode.label`, `ropes.mode.option.easy`, `ropes.mode.option.realistic`. (`tab.ropes` and `tab.learn` stay as section titles.)

### 8.8 Tests

`tests/modes.test.ts`:
1. `MODE_LAYOUTS`: for each mode, `order` holds every `SECTION_IDS` entry exactly once; `open`, `openSide` and `second` are subsets of `order`; `second` has 2 entries.
2. `sectionAvailable`: `autopilot` and `engine` false when `settings.ropesMode === 'realistic'`, true in Easy; `legend` follows `settings.legend`; the rest always true.
3. Store: `initialState().appMode === 'easy'`; `setAppMode('realistic')` → `appMode` and `settings.ropesMode` both `realistic`; then `setAppMode('learn')` → `appMode` `learn`, ropes mode still `realistic`; then `setRopesMode('easy')` → ropes mode `easy`, `appMode` still `learn`; from Easy, `setRopesMode('realistic')` → `appMode` `realistic`; `reset` → `easy`; `setAppMode` to the current mode returns the same object.
4. URL: `?m=learn` → Learn, `learn` null; `?learn=rope_vang` → Learn (old link); `?learn=part_made_up` → Easy; `?mode=realistic` → Realistic; `?mode=realistic&learn=rope_vang` → Learn with ropes mode `realistic`; `?m=easy` → Easy (ignored value). Serialize: Learn with no entry → contains `&cam=side-port&m=learn&`; Learn with `rope_vang` → contains `&m=learn` and `learn=rope_vang`; Easy with `state.learn = 'rope_vang'` → matches neither `/[?&]m=/` nor `/[?&]learn=/` (note: `cam=` contains `m=`, so test with these patterns). Round-trip: `parseUrlState(serializeUrlState(s)).appMode === s.appMode` for the three modes.
5. Every registry `showMe` link (Phase 4) still round-trips (PHASE4_SPEC 3.5) and does not match `/[?&]m=/`.

`tests/learn.test.ts` needs no change: "is written right after sel" keeps its regex (`&sel=rope_vang&learn=rope_vang&step=`; `m=learn` is written before `sel`), and "opening an entry changes nothing else" holds (`openLearn` does not change the mode).

**Allowed changes to existing tests** (the quoted UI labels, PHASE4_SPEC 8.4; the glossary no longer quotes tab names):
- `tests/quotedLabels.ts`: `QUOTED_UI_LABELS` loses `'tab.wind'` and gains `'section.conditions': 'Условия'`, `'autopilot.label': 'Авторулевой'`, `'engine.label': 'Двигатель'` (`'tab.ropes': 'Концы'` stays).
- `tests/glossary.test.ts`, "quoted UI labels": the key list in "the keys are real UI keys" becomes `['autopilot.label', 'autopilot.tack', 'engine.label', 'instruments.gust', 'section.conditions', 'tab.ropes', 'waves.label', 'waves.open']`; `quoting()` matches `tab.ropes` with `\bRopes section\b`, `section.conditions` with `\bConditions\b`, `autopilot.label` with `\bAutopilot section\b`, `engine.label` with `\bEngine section\b` (the other keys as today). The `checked > 10` threshold stays (after 8.6 the count is about 21; report it in the PR).

### 8.9 Browser checks

`scripts/ui.mjs`: `showSection`, `sectionShown` and `setMode` as 3.4 (M27 column). The scene runner handles `mode:`.

Existing checks to change (exactly these; list any other in the PR):
- Blocks that moved into their own sections: `.ropes-easy [data-testid="autopilot"]` → `[data-section="autopilot"] [data-testid="autopilot"]` (`shots-m6.mjs` scenes and checks, `shots-m11.mjs` `turn`, `shots-m13.mjs`); `.ropes-easy [data-testid="sails-panel"]` → `[data-section="sails"] [data-testid="sails-panel"]` (`shots-m13.mjs`, `shots-m9.mjs`'s `SAILS`); the engine panel inside `.ropes-easy` and `.engine-panel` → `[data-section="engine"] [data-testid="engine-panel"]` (`shots-m12.mjs`). Keep this scoping: the Helm station has a second autopilot and an engine lever with the same test ids.
- Folded sections: every scene or check that targets the autopilot, engine, Conditions, Learn or Rope colours (`legend`) section opens it first (`section: '<id>'` in a scene, `showSection` in a check); the Sails section starts open only in Easy. `shots-m4a.mjs`'s scene `ropes-list-and-legend` gets `section: 'legend'`.
- Learn and the link: checks that open the Learn section from Easy and then expect `learn=` in the link (`shots-m20.mjs`, `shots-m21.mjs`) call `setMode(page, 'learn')` first (in Easy `learn=` is not written, 8.3).
- `shots-m10.mjs`: the test of `time.held.note` matches `/Conditions/` instead of `/Wind tab/`.
- `shots-m20.mjs` check 1: where it went to the Ropes tab before tapping `card-more` again, it calls `setMode(page, 'easy')` (the Learn section then folds away and the card shows).
- `shots-m4b.mjs`: the click on the "Easy" switch → `setMode(page, 'easy')`; its `getByTestId('ropes-easy')` check stays.
- `shots-m4a.mjs`: the check that a selected rope opens the Ropes tab checks `sectionShown(page, 'ropes')` at half height.
- Checks that switched Easy / Realistic by a link keep the link (`mode=realistic` still works).
- `shots-m23.mjs`: export its Latin scan and its clipping check as functions (`scanLatin(page)`, `findClipped(page)`) so `shots-m27.mjs` can call them; its own walk covers every section (`openAllSections`) instead of tabs.

`scripts/shots-m27.mjs`:

Scenes: `mode-menu-open` (`?wd=60&ws=12`, `click: ['mode-chip']`); `learn-mode` (`?m=learn&wd=60&ws=12`); `easy-peek-selected` (`?sel=rope_mainsheet&wd=60&ws=12`, `sheet: 'peek'`); `conditions-explain` (`?wd=60&ws=12`, section `conditions`, `click: ['section-explain-conditions']`); `realistic-mode` (`?mode=realistic&st=port`).

Live checks (phone unless said):
1. `?` → `mode-chip`'s `.chip-label` reads "Easy"; sections in the order of 4.4; `ropes` and `sails` open, the rest folded; no `[role="tab"]` in the page.
2. `setMode(page, 'learn')` → `waitForLink(page, ['&m=learn'])`; `learn` is first and open. Open `learn-group-ropes` (set its `details.open`), tap `learn-entry-rope_vang` → `waitForLink(page, ['learn=rope_vang'])`. `setMode(page, 'easy')` → `waitForLink(page, [], ['&m=', 'learn='])`; `setMode(page, 'learn')` → the Vang entry shows again.
3. `setMode(page, 'realistic')` → `mode=realistic` in the link, the station bar shows in `section-ropes`, `section-autopilot` and `section-engine` are hidden.
4. Old links: `?learn=term_north` → Learn mode, "North" shows; `?mode=realistic&sel=rope_mainsheet` → Realistic; `?learn=rope_vang&mode=realistic` → Learn, and `setMode(page, 'realistic')` keeps the Realistic stations.
5. Show me in Learn mode: `?m=learn&learn=rope_vang` → tap `learn-show-me` → the scene loads and the mode chip still reads "Learn"; `page.goBack()` → the link is back to the one before, still Learn.
6. More: tap the boom (or `?sel=part_boom` in Easy) → info card → `card-more` → mode "Learn", `learn=part_boom`, the entry shows. "Try it" on `?m=learn&learn=rope_vang` → mode "Easy", `sel=rope_vang`, the `ropes` section open with the Vang strip.
7. Instrument strip tap → `section-conditions` open and in view, sheet at least half.
8. Folding: `section-toggle-sails` folds and opens `sails`; "?" on `conditions` shows the `wind.hint` text, a second tap hides it.
9. Quick row: `?sel=rope_mainsheet&ms=40&wd=60&ws=12`, `setSheet(page, 'peek')` → `quick-name` "Main sheet", `quick-value` "40 % eased" (`valueText` of the main sheet), tap + → `waitForLink(page, ['ms=45'])` (step 5). `setSheet(page, 'half')` → the quick row is hidden and `getByRole('button', { name: 'More: Main sheet', exact: true })` has count 1.
10. Russian `?lang=ru`: the mode menu's `.mode-option-name`s read «Обучение», «Простой», «Реалистичный»; `scanLatin` and `findClipped` (from `shots-m23.mjs`) pass with every section open (`openAllSections`) and with the mode menu open.
11. `auditPage`: the mode menu open; Easy at half after `openAllSections`; Learn mode with an entry; Realistic at full (phone); Easy on the desktop size: clean. (The audit's Tab walk stops after 150 stops; with every section open it may not reach the end. That is accepted.)
12. Every section in every mode: for each mode and each available section, `showSection` then `sectionShown` is true (phone).

### 8.10 Done when

On the owner's phone: "Easy ▾" switches between Learn, Easy and Realistic without losing anything on the boat; every block can be found in every mode; explanations open with "?"; tapping the instruments opens Conditions; at the lowest sheet height the selected rope's − / + work; old Phase 4 links (`learn=…`) open in Learn. Tests and CI green.

### 8.11 Not in M27

The mini-map (M28), the second column (M29), remembering folds.

### 8.12 Decided in the M27 PR

- **Section helpers** (8.4): `SectionView` also has `resetExplain()` (the panel closes the "?" texts when the mode changes). The engine block's own heading is removed from `.engine-head`, which now holds only the Start / Stop button (the Helm station's lever keeps its heading).
- **`panel.showSection`** (8.5) scrolls the section's top to the top of the panel body at once and again when a raised sheet has finished growing (otherwise the scroll is cut short while the body is still small).
- **The quick row's − / +** have the same accessible names as the strip's (`control.less` / `control.more`); they never exist twice for a reader, because the sheet body is `visibility: hidden` at peek and the quick row is `display: none` otherwise (3.5).
- **"Try it"** (8.5) switches to the ropes mode first (`setAppMode(settings.ropesMode)`), then selects and shows the Ropes section, as the spec says; the Learn entry stays open in the state but is not written to the link in Easy or Realistic.
- **The info card's "More"** calls `panel.openLearnEntry(id)`, which dispatches `setAppMode('learn')`, `openLearn(id)` and shows the Learn section (`InfoCardOptions.showLearn` takes the id).
- **Owner's answers on PR #65 ("Accept all"):** in Easy only Ropes and Sails start open (the other sections start folded), and in Realistic the Autopilot and Engine sections are hidden, as 4.4 says.
- **Browser checks** (8.9): besides the list there, `shots-m25.mjs` check 1 ("three tabs, no View tab") now says "no tabs, no View pane" (there are no tabs any more); `showSection` in `scripts/ui.mjs` raises a sheet at peek before it taps a folded section's header (the header may sit under the sheet's body). `shots-m6.mjs` and `shots-m11.mjs` open the Autopilot section before tapping its buttons; `shots-m12.mjs` opens the Engine section; the scenes of m6, m12 and m13 that scroll to the Autopilot or Engine block got `section:`.

---

## 9. M28: Mini-map

**Independent review: required** (new setting and link key `mm`, `openScene` change, a second canvas drawn every frame).

### 9.1 Files

New: `src/ui/miniMap.ts`, `tests/miniMap.test.ts`, `scripts/shots-m28.mjs`.
Changed: `src/model/settings.ts`, `src/app/store.ts` (new action `setMiniMap`), `src/app/urlState.ts`, `src/app/urlSync.ts` (`sceneSettings`), `src/ui/mapView.ts`, `src/ui/cameraChip.ts` (the Close-map chip), `src/ui/settingsMenu.ts`, `src/ui/labels3d.ts`, `src/app/app.ts`, `src/style.css`, both `ui.json`, `docs/review/ru.md`, `tests/urlState.test.ts`, `scripts/shots.mjs` (registration, `mm=0` in `openPage`, 3.6), `docs/CODE_MAP.md` (files, and `setMiniMap` in the store actions line).

**Decided in planning:** the phone's Back button does not close the full map. Back reloads the previous link, which would put the boat back at the link's heading and the start position and empty her track. The **Close** chip and the camera chip return instead. Accepted by the owner on the planning PR #61 (it differs from the planning outline).

### 9.2 Data, settings and store

- `Settings.miniMap: boolean`, `DEFAULT_SETTINGS.miniMap = true`.
- Store action `{ type: 'setMiniMap'; miniMap: boolean }`: sets only `settings.miniMap` (same object if unchanged). `reset` gives the default (true).
- URL `mm` (4.2): read `mm=0` → false, `mm=1` → true; written `mm=0` only when false, by a line in `serializeUrlState` right after the `lb` line and before `mode`.
- `urlSync.ts`: the settings merge of `openScene` becomes an exported pure function `sceneSettings(current: Settings, next: Settings): Settings` = `{ ...next, detail, debug, step, legend, labels, miniMap }` taken from `current` (today's five plus `miniMap`); `openScene` uses it.

### 9.3 Pure helpers and drawing (`src/ui/mapView.ts`)

```ts
/** Mini-map sizes and drawing (PHASE5_SPEC 9.3). */
export const MINI_MAP = {
  metresPerPx: 5,
  /** The button's outer size, border included (CSS px). */
  sizePx: { stacked: 96, side: 160 },
  borderPx: 2,
  maxFps: 10,
  maxDpr: 2,
  /** The true-wind arrow: centre, length and head size (CSS px). */
  windArrow: { x: 14, y: 14, lengthPx: 18, headPx: 6, lineWidth: 2 },
  /** The "N" at the top right: centre offset from the top-right corner, font size. */
  north: { fromRightPx: 10, fromTopPx: 10, fontPx: 11 },
} as const;
/** The mini-map's viewport: north up, the boat in the middle of a square canvas `sizePx` wide. */
export function miniMapViewport(state: AppState, sizePx: number): MapViewport;
/** Draws the mini-map (see below). */
export function drawMiniMap(ctx: CanvasRenderingContext2D, state: AppState, sizePx: number, width: TextWidth): void;
```

`miniMapViewport`: `centreEastM = state.boat.eastM`, `centreNorthM = state.boat.northM`, `upDeg = 0`, `metresPerPx = MINI_MAP.metresPerPx`, `widthPx = heightPx = sizePx`, `centreXPx = centreYPx = sizePx / 2`.

`drawMiniMap(ctx, state, sizePx, width)`, on `view = miniMapViewport(state, sizePx)`, in this order: the water (`COLOURS.water`, the whole canvas), `drawGrid`, `drawTrack`, `drawBuoys` **without their letters**, `drawBoat` with `mapLayout(state, view, width)` **without the dashed heading line and without the selection colour**, the true-wind arrow, the "N". Give `drawBuoys` and `drawBoat` an options argument for this (`{ letters?: boolean }`, `{ headingLine?: boolean; selection?: boolean }`, both defaulting to today's drawing, so the full map is unchanged). No labels, no no-go zone, no apparent wind. Set `strokeStyle`, `fillStyle`, `lineWidth` and `lineCap` explicitly before the arrow and the "N" (the canvas keeps them from earlier drawing).
- True-wind arrow: direction on screen `dir = bearingToScreen(compassDeg(state.wind.dirDeg) + 180, view)` (the way the wind blows; north up); centre `(windArrow.x, windArrow.y)`; tail = centre − direction × `lengthPx / 2`, head = centre + direction × `lengthPx / 2`; drawn with the map's `arrow(ctx, tail.x, tail.y, dir, lengthPx, headPx)` helper, colour `COLOURS.text`, `lineWidth` 2, head `headPx`.
- "N": `t('wind.dial.north')` (the wind dial's "N", in both languages), bold `fontPx`, centred at `(sizePx − north.fromRightPx, north.fromTopPx)`, drawn with `haloText`.

### 9.4 UI

**The mini-map** (`src/ui/miniMap.ts`, `export interface MiniMap { update(nowMs: number): void; hide(): void }`, `createMiniMap(view: HTMLElement, store: Store, layout: LayoutShell, sheet: Sheet): MiniMap`):

- A `button.mini-map` (`data-testid="mini-map"`, `aria-label` = `t('minimap.open')`, `box-sizing: border-box`, `padding: 0`, `border: 2px solid rgb(255 255 255 / 0.9)`, `border-radius: 10px`, `box-shadow: 0 2px 8px rgb(10 20 30 / 0.3)`, `overflow: hidden`, a `:focus-visible` outline) holding a `canvas` (`data-testid="mini-map-canvas"`, `display: block; width: 100%; height: 100%`). The button is 96 × 96 px in the stacked layout and 160 × 160 in the side layout, border included; the canvas is therefore 92 or 156 px, and `sizePx` passed to `drawMiniMap` is the canvas's `clientWidth`. `.mini-map[hidden] { display: none; }`.
- Placed `position: absolute; right: 8px; bottom: calc(var(--view-bottom-inset, 0px) + 60px)` (just above the chip row's right end, over the gear), `z-index: 4`.
- **Shown** only when all hold: `settings.miniMap`, `boat.mode === 'sailing'`, `camera.preset !== 'map'`, the 3D view exists, and not (stacked layout and the sheet at `full`) (a full sheet leaves no room). Otherwise `hidden` and not drawn. While shown, `.view` has the attribute `data-mini-map`.
- One function `applyVisibility()` applies that rule (and `data-mini-map`, and the canvas size). It runs at once from a `store.subscribe` listener when `camera.preset`, `boat.mode` or `settings.miniMap` change, from `layout.onChange`, from `sheet.onChange`, and at the start of every `update` call (before the frame-rate limit). `hide()` hides the mini-map for good (`applyVisibility` then does nothing).
- Created in `app.ts` only when the 3D view exists, after `createMapView`. `miniMap.update(now)` is called in the frame loop's `else if (scene)` branch after `scene.render`, inside its own `try/catch`: on an error, `console.error`, `reportError`, then `miniMap.hide()`. The catch around `scene.render` (the 3D view failing) also calls `miniMap?.hide()`.
- `update` draws at most `MINI_MAP.maxFps` times a second, with the canvas's pixel size = its CSS size × `min(devicePixelRatio, MINI_MAP.maxDpr)` (as the map does). The text-width function it passes is `(text) => text.length * 7` (no label is drawn; `mapLayout` needs one).
- **Tap:** dispatches `setCameraPreset('map')`; focus moves to `map-close`. No history step (9.1).
- **Info card** (stacked only): `html[data-layout='stacked'] .view[data-mini-map] .info-area { right: calc(8px + 96px + 8px); }`, so the card never covers it. The mini-map's `bottom` animates with the sheet (M26's moving-only transition already names `.mini-map`).
- `src/ui/labels3d.ts`: `BLOCKING` gains `.mini-map:not([hidden])`.

**The previous view** (`mapView.ts`): in its existing store subscription, when `state.camera.preset === 'map'` and `previous.camera.preset !== 'map'`, it remembers `before = previous.camera.preset` (from any path: mini-map, camera chip, a link loaded with `load`). A link that opens on the map has no `before`. `MapView` gains `before(): CameraPreset | undefined`.

**The Close-map chip** (`cameraChip.ts`; `createCameraChip(row, store, map: MapView)` gains the map, which `app.ts` already creates first): `button.view-chip.map-close` (`data-testid="map-close"`, `aria-label` = `t('map.close')`, `.chip-label` = `× ` + `t('map.closeShort')`), in the chip row right before the gear, `hidden` unless `camera.preset === 'map'` (from a store subscription). It dispatches `setCameraPreset(map.before() ?? 'side-port')`; focus then moves to the mini-map if it shows, else to the camera chip. CSS: `.map-close { margin-left: auto; } .map-close:not([hidden]) + .settings-button { margin-left: 0; } .map-close[hidden] { display: none; }`, and so that four chips fit a 360 px phone in Russian: `.view-bottom .view-chip { flex: 0 1 auto; min-width: 44px; } .chip-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }`.

**Settings** (`settingsMenu.ts`): a toggle after Clock, built like the Clock toggle: `input#mini-map-toggle` (`data-testid="mini-map-switch"`) in a `label.toggle` with `t('settings.miniMap.label')`, then `p.hint` `t('settings.miniMap.hint')`; it dispatches `setMiniMap`.

### 9.5 Strings

Appended at the end of both files, in this order:

| Key | English | Russian |
|---|---|---|
| `minimap.open` | Mini-map: tap to open the full map. | Мини-карта: нажмите, чтобы открыть карту. |
| `map.close` | Close the map | Закрыть карту |
| `map.closeShort` | Close | Закрыть |
| `settings.miniMap.label` | Mini-map | Мини-карта |
| `settings.miniMap.hint` | A small map in the corner while sailing: the boat, the wind, her track and the buoys. Tap it for the full map. | Маленькая карта в углу на ходу: яхта, ветер, её след и буи. Нажмите на неё, чтобы открыть полную карту. |

### 9.6 Tests (`tests/miniMap.test.ts`, plus `tests/urlState.test.ts`)

1. `miniMapViewport(initialState(), 96)`: centre (48, 48), `metresPerPx` 5, `upDeg` 0. With `mapToScreen`: the start (0, 0) → (48, 48); 200 m north → (48, 8); 200 m east → (88, 48); 200 m south → (48, 88); 200 m west → (8, 48). With size 160: 200 m north → (80, 40). (96 and 160 are test inputs; the app passes the canvas's own width, 9.4.)
2. The boat moved to east 120 m, north −40 m: the start → (24, 40).
3. URL: `parseUrlState('?mm=0', 'low')` → `settings.miniMap` false, and its link contains `&detail=low&mm=0`; for `?mm=0&lb=0` the link contains `&detail=low&lb=0&mm=0`; `?` → true and no `mm` in the link; `?mm=1` → true and no `mm` written; the store's `reset` → true; `setMiniMap(false)` → false, and the same object when it is already false.
4. `sceneSettings({ ...DEFAULT_SETTINGS, miniMap: false, detail: 'low' }, DEFAULT_SETTINGS)` → `miniMap` false and `detail` 'low'.

### 9.7 Browser checks (`scripts/shots-m28.mjs`)

Labels contain `m28` (3.6: Sailing, Coastal, clock shown; the older checks get `mm=0`).

Scenes: `mini-map` (`?wd=60&ws=12&tx=16`, `waitMs: 3000`: at ×16 three seconds are 48 s of sailing, so the track is longer than the drawn boat); `mini-map-off` (`?wd=60&ws=12&mm=0`). (Every scene runs at every size locally, so the side-layout mini-map is shot too.)

Live checks (phone unless said):
1. `?wd=60&ws=12`: `mini-map` visible, 96 × 96 ± 1 px, its bottom edge 8 ± 1 px above the chip row's top, above the sheet's top. `setSheet(page, 'full')` → hidden; `setSheet(page, 'half')` → shown.
2. `?wd=60&ws=12&held=1` → hidden; `showSection(page, 'conditions')`, then `getByTestId('boat-mode').getByText('Sailing', { exact: true }).click()` → `mini-map` visible.
3. Tap the mini-map → `waitForLink(page, ['cam=map'])`, `map-canvas` visible, the mini-map hidden, focus on `map-close`; `map-close` → `cam=side-port` and the mini-map shows. `setCamera(page, 'top')`, tap the mini-map, `map-close` → `cam=top`.
4. `?cam=map&wd=60&ws=12` → `map-close` → `cam=side-port`.
5. `openSettings`, `getByTestId('mini-map-switch').uncheck()` → `waitForLink(page, ['mm=0'])`, `closeSettings`, the mini-map is `hidden`; switch on again → shown, `mm=` gone from the link.
6. Not blank: open `?wd=60&ws=12&debug=1&tx=16`; poll up to 2 s until the canvas's centre pixel (device pixels, `getImageData`) has alpha 255, then its RGB differs from the water (217, 235, 246) (the boat is drawn there). Then `waitForFunction(() => window.__sailMap.trackPoints() >= 20)` and save `getByTestId('mini-map').screenshot({ path: path.join(OUT_DIR, `${PREFIX}live-m28-mini-map.png`) })`.
7. Show me keeps the setting: `?mm=0&m=learn&learn=rope_vang` → `learn-show-me` → the link still has `mm=0`.
8. `auditPage` with the mini-map shown (phone, and 1440 × 900 through `openPage(VIEWPORTS[2], …)`, where it is 160 px): clean.

### 9.8 Done when

On the owner's phone, while sailing: the mini-map in the corner shows the boat, the wind arrow and the track; a tap opens the full map; Close comes back to the same view; the switch in Settings hides it. Tests and CI green.

### 9.9 Not in M28

The second column (M29).

### 9.10 Decided in the M28 PR

- The link writes only `mm=0` (never `mm=1`): the default is on, and `mm=1` is accepted when read (as 9.2 says; written down so nobody adds a `1` branch).
- `createCameraChip` is only created when the map view exists (`if (map)` in `app.ts`), since it now needs the map for the Close chip; the map is created whenever the 3D view is, so nothing changes for the owner.
- A mini-map that has just appeared is drawn at the next frame, not after the 100 ms frame-rate pause, so it is never an empty box.
- Extra live check 9 in `shots-m28.mjs`: the four chips (mode, camera, Close, gear) fit a 360 px phone in Russian with the map open (the CSS of 9.4 promises it).
- Independent review of PR 68, finding 1 (fixed after the merge): in the side layout the rig alerts (Gybe!, Round-up, Overpowered, autopilot took the wheel) sit centred 64 px above the view's bottom, which is where the 160 px mini-map is, so they were drawn under it at 820 × 1000 and 1024 × 768. While the mini-map shows, they move above it: `html[data-layout='side'] .view[data-mini-map] .rig-alerts { bottom: calc(60px + 160px + 8px); }`. Live check 10 in `shots-m28.mjs` measures it at those two sizes. Findings 2–6 and the PR's two questions: accepted as recommended (2: the checklist ticks were removed; 3 and 5: leave as is; 4: M29, see 10.4; 6: noted; questions 1 and 2: keep the 5 m per pixel scale and hide the mini-map at full height). The phone is unaffected (its alerts are at the top).
- Test 6 of 9.7 reads the centre pixel of the mini-map's canvas: the boat's hull colour (199, 202, 205), not the water.

---

## 10. M29: Desktop, polish and sign-off

**Independent review: not needed** (layout of wide screens, checks and docs; no state, link or model change).

### 10.1 Files

New: `scripts/shots-m29.mjs`.
Changed: `src/ui/layoutMode.ts`, `src/ui/layout.ts`, `src/ui/panel.ts`, `src/ui/ropesTab.ts` (`revealStrip`), `src/style.css`, both `ui.json`, `docs/review/ru.md`, `tests/layoutMode.test.ts`, `scripts/shots.mjs` (registration, `panelOverflow`), `README.md`, `docs/ROADMAP.md`, `docs/LAYOUT_ANALYSIS.md`, `docs/CODE_MAP.md`, `docs/WORKFLOW.md` (only if a check's wording must change), this spec (status line, decisions).

### 10.2 Wide layout

**Rule.** `layoutMode.ts`: `export const WIDE_MIN_WIDTH_PX = 1280;` and `export function isWide(width: number, mode: LayoutMode): boolean` (`mode === 'side' && width >= WIDE_MIN_WIDTH_PX`). `layout.ts` adds `wide: boolean` to `Viewport`, sets `<html data-wide="true">` when wide (removes the attribute otherwise) and calls its `onChange` listeners when `wide` changes (as for the mode).

**CSS** (after the existing side-layout rules):

```css
html[data-layout='side'] .sheet-head { display: none; }
html[data-layout='side'][data-wide='true'] .shell { grid-template-columns: minmax(0, 1fr) 760px; }
html[data-layout='side'][data-wide='true'] .panel { flex-direction: row; }
html[data-layout='side'][data-wide='true'] .panel-body { flex: 0 0 400px; }
.panel-second { flex: 1 1 0; min-width: 0; min-height: 0; overflow-y: auto; overscroll-behavior: contain; border-left: 1px solid var(--line); }
.panel-second[hidden] { display: none; }
html[data-wide='true'] .settings-dialog { width: 760px; }
```

The panel keeps its own `border-left` (on the 3D view's side); the handle is hidden in the side layout (M26) and the head by the first rule. Both scrolling columns get the class `panel-scroll` (`.panel-body` keeps its class too). The settings dialog covers both columns (last rule, CSS only).

**Second column** (`panel.ts`): `div.panel-second.panel-scroll` (`data-testid="second-column"`, `role="region"`, `aria-label` = `t('panel.second')`, `tabindex="0"`, a `:focus-visible` outline), created once, the last child of the panel, `hidden` unless wide.
- When wide: the sections of `MODE_LAYOUTS[appMode].second` move into it, in that order, **open**; the rest stay in `.panel-body` in `order`, opened as `openSide` says.
- When not wide: it is `hidden` and empty; every section is back in `.panel-body` in `order`.
- Placement always follows `wide`. Open states are applied at start, when `appMode` changes, and when the layout kind changes: entering wide opens `second` and applies `openSide` to the rest; entering stacked applies `open`; entering side from stacked applies `openSide`; entering side from wide changes no open state (the sections that return keep theirs). Never on other resizes (3.5). `createPanel` already gets `layout` (M27).
- Moving sections never rebuilds them. If the focused element is inside a moved section, it is focused again afterwards (`focus({ preventScroll: true })`).
- One helper in `panel.ts`, `scrollToSection(element)`: `const column = element.closest('.panel-scroll'); column.scrollTop += element.getBoundingClientRect().top − column.getBoundingClientRect().top`. `showSection` and the scroll when a Learn entry opens (M27) both use it.
- Switching the mode in the wide layout (also through More or "Try it") swaps the sections in column 2; accepted.

**Other code:** `revealStrip` (`ropesTab.ts`) uses `strip.closest('.panel-scroll')`. In `scripts/shots.mjs` the scene facts' `panelOverflow` = `Math.max(0, ...[...document.querySelectorAll('.panel-scroll')].map((e) => e.scrollWidth - e.clientWidth))`. `scripts/ui.mjs` needs no change (`sectionShown` and `setSheet` already ignore `data-sheet` in the side layout, 3.1, 3.4).

**String** (appended at the end of both files): `panel.second` — English "More sections", Russian «Ещё разделы».

**Tests** (`tests/layoutMode.test.ts`, added): `isWide(1440, 'side')` true; `isWide(1280, 'side')` true; `isWide(1279, 'side')` false; `isWide(1440, 'stacked')` false.

**Existing desktop checks:** every 1440 × 900 scene and check is now wide. A check that fails only because Conditions or Learn now sit in column 2 gets its selector or scrolling fixed (never weakened); list each change in the PR.

### 10.3 Browser checks (`scripts/shots-m29.mjs`)

No scenes (CI shoots scenes at phone size only, 3.6). Live checks, each at 1440 × 900 through `openPage(VIEWPORTS[2], …)` unless said; the pictures `live-wide-easy`, `live-wide-learn` and `live-wide-realistic` are taken in check 1:
1. `?wd=60&ws=12` → `second-column` visible; its children matching `:scope > [data-section]` are, in DOM order, `conditions` then `learn`, both `data-open="true"`. `?m=learn&learn=rope_vang` → `conditions` then `ropes`. `?mode=realistic&st=port` → `conditions` then `learn`.
2. `page.setViewportSize({ width: 1279, height: 900 })`, then `waitForFunction(() => !document.documentElement.dataset.wide)` → `second-column` hidden; all seven `[data-section]` elements are children of `.panel-body`.
3. 1440 → 1000 (`waitForFunction` on `data-wide` gone): `second-column` hidden, all seven sections in `.panel-body`, `section-conditions` still `data-open="true"`. → 1440 (`waitForFunction` on `data-wide`): `second-column`'s sections are `conditions`, `learn` again. Then `getByTestId('wind-dial').scrollIntoViewIfNeeded()` and `dial.click({ position: { x: box.width − 8, y: box.height / 2 } })` (east on the dial) → `waitForLink(page, ['wd=90'])`.
4. 820 × 1000 and 844 × 390: no `data-wide`, `second-column` hidden.
5. Every section in every mode, wide: for each mode and each available section (its `[data-section]` element not `hidden`), `showSection` then `sectionShown` is true.
6. The accessibility sweep of 10.4 (labels contain `m29`): for each case, `openAllSections` where it says so, `setSheet`, then `auditPage`.

### 10.4 Accessibility and frame rate (the sweep)

`auditPage` (clean, no new exceptions in `a11y-audit.mjs`; if one seems needed, ask in the PR) on: the phone at peek, half and full in each of the three modes after `openAllSections`; the settings dialog, the camera menu and the mode menu; the mini-map; Russian (`lang=ru`) Easy at half after `openAllSections`; 1440 × 900 wide in each mode. (The audit's Tab walk stops after 150 stops; accepted.) Frame times as 7.9 check 11 (peek and half), reported in the PR only.

**Carried from the M28 review (finding 4, owner: "fix later"):** `miniMap.ts` reads `canvas.clientWidth` on every frame (through `update` → `applyVisibility`), right after the 3D labels have moved, which forces an early layout every frame. The size only changes when the layout or the sheet height changes, and both already call `applyVisibility`. While measuring the frame rate here, compare with and without the per-frame read; if it costs, size the canvas only from `layout.onChange`, `sheet.onChange` and when the mini-map appears.

### 10.5 Docs

- `README.md`: "What you can do" describes the modes (Learn, Easy, Realistic), the sheet on phones, Settings, the camera chip and the mini-map; the link keys `m` and `mm`. Rewrite every mention of the camera buttons, the View tab, the Wind tab and the Ropes tab (after the edit `grep -n 'View tab\|View →\|Wind tab\|Ropes tab\|Learn tab\|camera buttons' README.md` finds nothing). Rewrite "Later phases add … a learning layer with Russian names …" (Phase 4 is built). The status paragraph says Phases 1–5 are done; the documents table gains `PHASE4_SPEC.md`, `PHASE5_SPEC.md` and `LAYOUT_ANALYSIS.md`.
- `docs/ROADMAP.md`, set in the PR (the owner merges after signing off): the Phase 5 row's status becomes "**Done** (M29, PR #<n>; [spec](PHASE5_SPEC.md))", and a decisions-log row with the owner's answers on the PR.
- `docs/LAYOUT_ANALYSIS.md`: replace the "Planned in PHASE5_SPEC …" sentence at the top with "**Built in Phase 5** ([PHASE5_SPEC](PHASE5_SPEC.md)); kept as the record of why."
- `docs/CODE_MAP.md`: the "How a frame runs" paragraph mentions the sheet, the chip row and the sections; every new file has its row.
- This spec's status line: "Status: **built**, M29 PR #<n> waits for the owner's sign-off · Last updated: <date>".

### 10.6 Done when

Every item of section 11 is ticked in the PR. **The agent ticks** items 1–6 and 8; **the owner ticks** item 7 (smooth on the phone) and confirms items 1–5 on the phone. CI `browser-checks` green.

### 10.7 Not in M29

Harbour and Exercises modes (Phases 7, 8); remembering folds; any new section.

### 10.8 Decided in the M29 PR

(empty)

---

## 11. Definition of Done (Phase 5)

- [ ] 1. Phone: the 3D view fills the screen; the sheet has three heights, dragged or tapped; the boat is framed above it.
- [ ] 2. Modes Learn, Easy and Realistic from the "Easy ▾" chip; switching never changes the boat or the settings; every section can be reached in every mode.
- [ ] 3. Settings behind the gear (with About); one camera chip with a menu; sections fold; explanations behind "?"; Conditions opens from the instruments.
- [ ] 4. Mini-map while Sailing, the full map on a tap, Close returns, a switch in Settings.
- [ ] 5. Desktop: the panel on the right; a second column on screens 1,280 px or wider.
- [ ] 6. Old links open the same picture (`mode=realistic`, `learn=…`, `cam=map`, Show me and Back); every earlier test and browser check passes; no console errors; accessibility audit clean.
- [ ] 7. Smooth on the owner's phone (50 fps or more in the heaviest case of 7.10).
- [ ] 8. Docs updated: README, ROADMAP, CODE_MAP, LAYOUT_ANALYSIS; the Russian review document regenerated.

## 12. Decisions and open questions

**Owner's answers on the planning outline (2026-10-15, "accept all except 4"):** (1) M24 is built first, then M25; new Russian strings are drafts for a later review; (2) the app opens in **Easy**; (3) the sheet opens at **half** height on a phone; (4) **changed by the owner:** the mode switch is a **small "Easy ▾" chip**, not three buttons on the sheet; (5) a mode only changes which blocks show, never a setting or the boat; (6) the mini-map shows while Sailing and is hidden in Held still, with a switch in the settings; (7) it is **north up** with the boat turning; (8) **Map stays in the camera menu**; (9) explanations are folded every time behind a "?" (no first-visit tip); (10) reduced on a phone: Realistic one place at a time, the full map replacing the 3D view, the Learn entry taking the sheet, the wind dial in Conditions; (11) desktop: the panel on the right with the mode's blocks open, plus a second column (Conditions and Learn) on screens 1,280 px or wider; (12) five milestones M25–M29 in this order.

**Decided in planning:** the chip row at the bottom of the 3D view (mode chip, camera chip, gear) is shared by every milestone; the sheet's height, folds and "?" states are not stored; `m=learn` is the only value of the new key, the ropes mode keeps `mode`; `learn` is written only in Learn mode; autopilot and engine are separate sections in Easy only (Realistic keeps them at the Helm station, unchanged); the mini-map has no history step (9.1); the camera keeps the half-height framing when the sheet is full.

**Owner's answers on the planning PR (#61, 2026-10-15, "accept all"):** (1) the phone's Back button does not close the full map (9.1): the "× Close" chip and the camera chip do, because Back reloads the link and would reset the boat's position and track; (2) a full-height sheet stops 60 px below the top area (`SHEET.fullGapPx`, 3.3), so the chip row never covers the instruments.

Open: none.
