# Phase 5 specification: new layout and modes

Status: **planned**, owner's answers recorded (planning chat, 2026-10-15) · Last updated: 2026-10-15

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
| Sheet heights | `peek`, `half`, `full` (3.3). Stacked layout only. In the side layout the panel is docked (no handle, full height). |
| Modes | `AppMode = 'learn' \| 'easy' \| 'realistic'` (M27). Invariant: `appMode === 'learn'` or `appMode === settings.ropesMode`. |
| Sections | `SectionId = 'ropes' \| 'sails' \| 'autopilot' \| 'engine' \| 'conditions' \| 'learn' \| 'legend'` (M27, 4.4). Each section is built once and moved between containers, never duplicated. |
| UI state vs app state | In the store and the link: `appMode` (M27), `settings.miniMap` (M28). Not in the store, not in the link: the sheet height, which sections are open, the "?" state, whether a menu or the settings dialog is open. `src/model` knows nothing of any of them (ROADMAP architecture hooks). |
| Overlays at the bottom of the view | Every element over the 3D view that is placed from the view's bottom uses `bottom: calc(var(--view-bottom-inset, 0px) + <N>px)`. `--view-bottom-inset` is set on `.view` by the sheet (M26): the sheet's height in px in the stacked layout, `0px` in the side layout. |
| Touch targets | At least 44 × 44 px (`--touch`), as everywhere. Menus' items are 44 px tall. |
| Language | Every new visible string goes through `t()`, in `content/lang/en/ui.json` and `content/lang/ru/ui.json` (same keys, same order). |
| Test ids | Every `data-testid` named in this spec is required (the browser checks use them). |

### 3.2 The chip row over the 3D view (M25, used by M26–M28)

`.view-bottom` (`data-testid="view-bottom"`) replaces `.camera-bar`: an absolutely placed row, `left: 8px; right: 8px; bottom: calc(var(--view-bottom-inset, 0px) + 8px)`, `display: flex; align-items: flex-end; gap: 8px; pointer-events: none` (its children `pointer-events: auto`). Left to right: the **mode chip** (M27), the **camera chip** (M25), a flexible gap, the **gear** (M25). The row is 44 px tall; with its 8 px gaps it covers `SHEET.chipRowPx` = 60 px of the view's bottom.

**Chip look** (mode chip, camera chip, gear): `min-height: 44px`, `min-width: 44px`, `padding: 4px 12px`, `border: 1px solid var(--line)`, `border-radius: 8px`, `background: rgb(255 255 255 / 0.88)`, `font-size: var(--font-small)`, `font-weight: 600` (today's `.camera-button` look). A chip's text is followed by `<span class="chip-caret" aria-hidden="true">▾</span>` (mode and camera chips only).

**Chip menus** (camera menu M25, mode menu M27): a `div` with `role="menu"`, absolutely placed in `.view` with its left edge at the chip's left edge and its bottom 8 px above the chip's top, `max-height: calc(100% - 16px)`, `overflow-y: auto`, `background: var(--surface)`, `border-radius: 10px`, `box-shadow: 0 2px 10px rgb(10 20 30 / 0.25)`, `z-index` above the chip row. Items are `button role="menuitemradio"` with `aria-checked`, 44 px tall, full menu width, the checked one styled like today's pressed camera button. The chip has `aria-haspopup="menu"` and `aria-expanded`. Open: focus moves to the checked item. ArrowDown / ArrowUp move focus (wrapping), Home / End to the first / last, Enter / Space choose, Escape closes. Choosing an item closes the menu and returns focus to the chip. A `pointerdown` anywhere outside the menu and the chip closes it. Only one menu (or the settings dialog) is open at a time: opening one closes the other.

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
  /** A full sheet stops this far below the top area (instrument strip, time bar, clock). */
  fullGapPx: 8,
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
- `half` = `Math.round(viewHeightPx × SHEET.halfShare)`.
- `full` = `Math.max(half, Math.round(viewHeightPx − topAreaPx − SHEET.fullGapPx))`.
- `snapSheet`: if `velocity >= SHEET.flingPxPerMs` → `stepSheet(start, +1)`; if `velocity <= −SHEET.flingPxPerMs` → `stepSheet(start, −1)`; otherwise the height whose `sheetHeightPx` is nearest to `endPx`; on an exact tie, the larger height.
- `cameraInsetPx`: `sheetHeightPx(height === 'full' ? 'half' : height, space) + SHEET.chipRowPx` (a full sheet hides the boat anyway; the camera keeps the half-height framing so it does not jump).

Worked values (390 × 844 phone, Sailing: the top area ends at 116 px): peek 100, half 422, full 720; `cameraInsetPx` peek 160, half 482, full 482. (360 × 740, Sailing, top area 166 px): peek 100, half 370, full 566. (360 × 740, Held still, top area 114 px): full 618.

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
```

What each does, by milestone:

| Helper | M25 | M26 | M27 |
|---|---|---|---|
| `showSection` | clicks the tab that holds the section: `ropes`, `sails`, `autopilot`, `engine`, `legend` → `[data-testid="tab-ropes"]`; `conditions` → `tab-wind`; `learn` → `tab-learn` | as M25, then `setSheet(page, 'half')` if the sheet is at peek | if `[data-testid="section-<id>"]` has `data-open="false"`, clicks `section-toggle-<id>`; `setSheet(page, 'half')` if at peek; then `scrollIntoViewIfNeeded` on the section |
| `sectionShown` | the tab's `aria-selected` is `true` | as M25 and the sheet is not at peek | `data-open="true"`, the section is visible, and the sheet is not at peek |
| `openSettings` | clicks `settings-button`, waits for `settings-dialog` visible | same | same |
| `closeSettings` | clicks `settings-close`, waits for it hidden | same | same |
| `setCamera` | clicks `camera-chip`, then `camera-option-<preset>` | same | same |
| `viewBottom` | top of `[data-testid="view-bottom"]` | same | same |
| `setSheet` | — | taps `sheet-handle` until `[data-testid="sheet"]` has `data-sheet="<height>"` (at most 3 taps; side layout: returns at once) | same |
| `setMode` | — | — | clicks `mode-chip`, then `mode-option-<mode>` |

**Scenes** (the `SCENES` entries of `scripts/shots.mjs` and every `scripts/shots-m*.mjs`): the field `tab: '<name>'` is replaced by `section: '<id>'` (Ropes → `ropes`, Wind → `conditions`, Learn → `learn`; the Russian tab names of `shots-m23.mjs` likewise), and the View tab by `settings: true` (open the settings dialog before the shot). The scene runner calls `showSection` / `openSettings`. M27 adds `mode: '<mode>'` (calls `setMode` before the section).

### 3.5 Common mistakes (check these first when something fails)

- **Two elements with the same accessible name** (Playwright's strict mode fails): a section is moved, never copied; the quick row's − / + exist only while the sheet is at peek, when the sheet body is `visibility: hidden` (7.5).
- **The sheet body scrolls the page:** the page must never scroll (the browser checks fail on any page scroll). The sheet is `position: absolute` inside `.shell`, which is `overflow: hidden`.
- **A drag on a slider moves the sheet:** only the handle drags the sheet. The body scrolls normally.
- **Framing jumps while dragging:** the camera reframes once, after the height animation ends (`transitionend`, or at once with `prefers-reduced-motion: reduce`), never during a drag.
- **The camera inset clamp:** `cameraRig.setViewport` clamps the bottom inset to 40 % of the height today; a half sheet needs 57 %. Use `SCENE.camera.maxBottomInsetShare` (M26).
- **Mode and ropes mode out of step:** every path that changes `settings.ropesMode` keeps the invariant of 3.1 (the reducer does it, 7.3); UI code never sets one without the other.
- **A link written in Easy mode with `learn=`:** `learn` is written only in Learn mode (7.3); otherwise a link with `learn=` would open in Learn mode.
- **Folded content still counted:** a folded section's body is `hidden` (not just height 0), so tabbing, the accessibility audit and Playwright skip it.
- **History:** the full map does not push a history step (9.1). Show me still does (PHASE4_SPEC 6.5).
- **The review document:** a Russian string changed without `npm run review-doc -- ru` fails `tests/glossary.test.ts`.

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

Old links: without `m`, a link with a valid `learn=<id>` opens in **Learn** mode (Phase 4 opened the Learn tab), otherwise in the mode of its `mode` key (`mode=realistic` → Realistic, none → Easy). Without `mm` the mini-map is on. Every other key keeps its meaning. `learn` is written only in Learn mode (7.3).

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
| M25 | `src/ui/settingsMenu.ts`, `src/ui/cameraChip.ts` (replaces `cameraBar.ts`, deleted), `scripts/ui.mjs`, `scripts/shots-m25.mjs` | `src/ui/panel.ts` (no View tab, no footer), `src/app/app.ts`, `src/style.css`, both `ui.json`, `scripts/shots.mjs` and every `scripts/shots-m*.mjs` that uses a tab, the View tab or a camera button, `.github/workflows/ci.yml`, `CLAUDE.md` (one line, 6.9), `docs/CODE_MAP.md` |
| M26 | `src/ui/sheet.ts`, `src/ui/sheetGeometry.ts`, `tests/sheet.test.ts`, `scripts/shots-m26.mjs` | `src/ui/layout.ts`, `src/app/app.ts`, `src/ui/infoCard.ts`, `src/ui/panel.ts`, `src/ui/mapView.ts` (canvas box only), `src/render3d/cameraRig.ts`, `src/render3d/sceneConfig.ts`, `src/style.css`, both `ui.json`, `scripts/ui.mjs`, `scripts/shots.mjs` (tap sweeps at peek), `docs/CODE_MAP.md` |
| M27 | `src/app/appMode.ts`, `src/ui/modes.ts`, `src/ui/sections.ts`, `src/ui/modeChip.ts`, `src/ui/quickRow.ts`, `tests/modes.test.ts`, `scripts/shots-m27.mjs` | `src/app/store.ts`, `src/app/urlState.ts`, `src/app/urlSync.ts`, `src/ui/panel.ts` (rewritten: sections, no tabs), `src/ui/ropesTab.ts`, `src/ui/learnTab.ts`, `src/ui/windPanel.ts`, `src/ui/realisticPanel.ts`, `src/ui/infoCard.ts`, `src/ui/instrumentStrip.ts`, `src/app/app.ts`, `src/style.css`, both `ui.json`, both `glossary.json` (8.6), `docs/review/ru.md` (regenerated), `tests/learn.test.ts` (7.8), `scripts/ui.mjs`, the `shots-m*.mjs` selectors of 7.9, `docs/CODE_MAP.md` |
| M28 | `src/ui/miniMap.ts`, `tests/miniMap.test.ts`, `scripts/shots-m28.mjs` | `src/model/settings.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/app/urlSync.ts` (`openScene` keeps `miniMap`), `src/ui/mapView.ts`, `src/ui/settingsMenu.ts`, `src/app/app.ts`, `src/style.css`, both `ui.json`, `docs/CODE_MAP.md` |
| M29 | `scripts/shots-m29.mjs` | `src/ui/layoutMode.ts`, `src/ui/layout.ts`, `src/ui/panel.ts`, `src/style.css`, `scripts/a11y-audit.mjs` (only if a new allowed exception is needed, 10.4), `README.md`, `docs/ROADMAP.md`, `docs/LAYOUT_ANALYSIS.md`, `docs/CODE_MAP.md`, this spec |

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

New: `src/ui/settingsMenu.ts`, `src/ui/cameraChip.ts`, `scripts/ui.mjs`, `scripts/shots-m25.mjs`.
Deleted: `src/ui/cameraBar.ts` (replaced by `cameraChip.ts`).
Changed: `src/ui/panel.ts`, `src/app/app.ts`, `src/style.css`, `content/lang/en/ui.json`, `content/lang/ru/ui.json`, `docs/review/ru.md` (regenerated), `scripts/shots.mjs`, the `scripts/shots-m*.mjs` files listed in 6.8, `.github/workflows/ci.yml`, `CLAUDE.md`, `docs/CODE_MAP.md`.

### 6.2 Data

None.

### 6.3 Model, store and URL

No change. The camera chip dispatches `setCameraPreset`; the settings controls dispatch the same actions as today's View tab.

### 6.4 UI

**The panel** (`panel.ts`): `TAB_IDS = ['ropes', 'wind', 'learn']`; the View tab, `buildViewTab` and the footer are removed from the panel (they move to the settings dialog). Each tab button gets `data-testid="tab-<id>"`. Everything else in `panel.ts` is unchanged.

**The chip row** (3.2): `src/ui/cameraChip.ts` exports `createViewBottom(view: HTMLElement): HTMLElement` (creates `.view-bottom` and appends it to the view) and `createCameraChip(row: HTMLElement, store: Store): void`. `app.ts` creates the row, the camera chip, then the gear (from `settingsMenu.ts`). The 3D framing inset that `app.ts` measured from `.camera-bar` is measured from `.view-bottom` in the same way (`viewBox.bottom − row.getBoundingClientRect().top`).

**Camera chip** (`data-testid="camera-chip"`, class `chip camera-chip`): text = `t('cam.short.<preset>')` of the current preset plus the caret; `aria-label` = `t('cam.chip', { name: t('cam.<preset>') })`. Its menu (`data-testid="camera-menu"`, `aria-label` = `t('cam.label')`) lists every `CAMERA_PRESETS` entry in that order (Side (port), Side (starboard), Top, Bow, Helm, Free, Map), each `data-testid="camera-option-<preset>"` with the text `t('cam.<preset>')`; choosing one dispatches `setCameraPreset`. Dragging the 3D view still switches to Free (the chip then reads "Free ▾").

**Gear** (`data-testid="settings-button"`, class `chip settings-button`, `aria-label` = `t('settings.button')`, `aria-haspopup="dialog"`, `aria-expanded`): 44 × 44, no text, this icon:

```html
<svg viewBox="-12 -12 24 24" width="24" height="24" aria-hidden="true" class="gear-icon">
  <g fill="currentColor">
    <!-- 8 teeth: one rect, rotated by 0, 45, …, 315 degrees -->
    <rect x="-2" y="-11" width="4" height="5" rx="1" transform="rotate(0)" />
  </g>
  <circle r="6.5" fill="none" stroke="currentColor" stroke-width="3" />
  <circle r="2.2" fill="currentColor" />
</svg>
```

**Settings dialog** (`src/ui/settingsMenu.ts`, `export function createSettingsMenu(row: HTMLElement, root: HTMLElement, store: Store): void`; `row` is the chip row for the gear, `root` the layout's root for the dialog):

- `div.settings-dialog`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby` its title, `data-testid="settings-dialog"`, `hidden` when closed.
- Placement: stacked layout `position: fixed; inset: 0`; side layout `position: fixed; top: 0; right: 0; bottom: 0; width: clamp(var(--panel-min), 30%, var(--panel-max))` (it covers the panel column, the 3D stays visible). `background: var(--surface)`, `z-index` above every overlay, its own vertical scroll (`overflow-y: auto`); the page never scrolls.
- Head: `h2` `t('settings.title')` and a close button `×` (`data-testid="settings-close"`, `aria-label` = `t('settings.close')`, 44 × 44, top right).
- Body, in this order, each **exactly as built today in `buildViewTab`** (same elements, ids, `data-testid`s, hints, texts and actions): Language; Labels in 3D; Time bar; Clock; Step size; Detail; Share and Reset; Rope colour legend; Debug overlay. Then `h3` `t('settings.about')` and the footer's three items (disclaimer `data-testid="disclaimer"`, version `data-testid="build-version"`, source link), unchanged.
- The Camera block of the View tab is **not** in the dialog (the camera chip replaces it).
- Opening: the gear toggles it. On open, focus moves to `settings-close`; Escape or `settings-close` closes it and focus returns to the gear. Opening it closes an open chip menu (3.2). Tab stays inside the dialog while it is open (from the last control, Tab goes to `settings-close`; from `settings-close`, Shift+Tab goes to the last control).
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

Removed from both files: `tab.view`, `cam.hint`, `cam.barLabel`. `cam.label` stays (the camera menu's label). `cam.short.*` stay (the chip's text; the Russian short words of M23 stay).

### 6.6 Tests

No new unit tests (no model change). `npm test` must stay green: the language tests (same keys in `en` and `ru`, Latin scan) cover the new strings; regenerate `docs/review/ru.md`.

### 6.7 Helpers (`scripts/ui.mjs`)

Write the helpers of 3.4 with their M25 behaviour.

### 6.8 Browser checks

**Move every existing check onto the helpers** (no check is dropped or weakened):

- every `getByRole('tab', { name: … })` → `showSection(page, <id>)` (Ropes → `ropes`, Wind → `conditions`, Learn → `learn`, and the Russian names in `shots-m23.mjs` likewise); every View-tab click → `openSettings(page)` (then `closeSettings(page)` before the check goes on to the 3D view or the panel);
- `tab:` in scenes → `section:` or `settings: true` (3.4), with the scene runner in `shots.mjs` updated;
- camera buttons (`getByRole('button', { name: 'Top' })`, `'Helm'`, `'Map'`, `'Side (port)'`, and `getByText('Side (starboard)')` in the View tab) → `setCamera(page, <preset>)`;
- `.camera-bar` top in the tap sweeps and small-parts taps → `viewBottom(page)`;
- the M23 checks that walk the tabs walk `showSection` over `ropes`, `conditions`, `learn` and the settings dialog instead;
- the M24 checks (`shots-m24.mjs`) that open the Learn tab → `showSection(page, 'learn')`.

Files that need it today: `shots.mjs`, `shots-m4a.mjs`, `shots-m4b.mjs`, `shots-m5.mjs`, `shots-m6.mjs`, `shots-m7.mjs`, `shots-m8.mjs`, `shots-m10.mjs`, `shots-m11.mjs`, `shots-m13.mjs`, `shots-m14.mjs`, `shots-m17.mjs`, `shots-m19.mjs`, `shots-m21.mjs`, `shots-m23.mjs`, `shots-m24.mjs` (`grep -n "getByRole('tab'\|tab: '\|camera-bar\|name: 'Top'\|name: 'Helm'\|name: 'Map'\|Side (" scripts/*.mjs` finds them all).

`.github/workflows/ci.yml`: a new part `live, Phase 5` with `SHOTS_NO_SCENES=1 SHOTS_NO_TAPS=1 SHOTS_ONLY=m25,m26,m27,m28,m29`, and `m25,m26,m27,m28,m29` added to the `SHOTS_SKIP` list of `live, Phase 2 on`.

`scripts/shots-m25.mjs` (registered in `shots.mjs`: import, `SCENES`, `liveGroups`):

Scenes:
- `settings-open`: `?wd=60&ws=12`, `settings: true`.
- `camera-menu-open`: `?wd=60&ws=12`, then a click on `camera-chip` (scene field `click: ['camera-chip']`).

Live checks (phone size unless said):
1. The panel has exactly three tabs (`tab-ropes`, `tab-wind`, `tab-learn`); no element `#pane-view`.
2. The chip row: `camera-chip` reads "Port" (its text without the caret) on `?`; `setCamera(page, 'top')` → the address bar has `cam=top` and the chip reads "Top"; choose `map` → `cam=map` and the map canvas shows; choose `side-port` → back to 3D.
3. Drag the 3D view (as the general check does) → the chip reads "Free".
4. Camera menu keyboard: focus `camera-chip`, Enter → the menu shows with focus on the checked item; ArrowDown, Enter → the next preset is chosen and focus is back on the chip; Escape on an open menu closes it.
5. Settings: `openSettings` → the dialog shows `language-en`, `#labels-toggle`, `#time-bar-toggle`, `clock-switch`, the step and detail options, `share-button`, `reset-button`, `#legend-toggle`, `#debug-toggle`, `disclaimer`, `build-version`; focus is on `settings-close`; Escape closes it and focus is on `settings-button`.
6. In the dialog: "1 %" → `step=1` in the link; Debug overlay on → `debug=1` and the overlay shows; Labels off → `lb=0`.
7. Russian (`?lang=ru`): the gear's accessible name is "Настройки"; the dialog's title reads "Настройки".
8. Side layout (1440 × 900): the dialog covers the panel column only (its left edge ≥ the panel's left edge − 1 px) and the 3D canvas is still visible.
9. `auditPage` (accessibility audit) on: the settings dialog open (phone and desktop), the camera menu open (phone): clean.

### 6.9 Docs

- `CLAUDE.md`, Deploy paragraph: "The footer of a preview shows the PR's commit." becomes "Settings → About in a preview shows the PR's commit."
- `docs/CODE_MAP.md`: `cameraChip.ts` and `settingsMenu.ts` rows (and `cameraBar.ts` removed); `panel.ts` row (three tabs); `scripts/ui.mjs` in "Tests and scripts".

### 6.10 Done when

The owner, on the phone: the gear opens Settings with every old View-tab setting and the About lines; the camera chip's menu changes the view; there is no View tab. `npm run typecheck`, `lint`, `test`, `build` green; CI `browser-checks` green with every earlier check moved onto the helpers.

### 6.11 Not in M25

The sheet (M26), modes and sections (M27), the mini-map and its switch (M28).

### 6.12 Decided in the M25 PR

(empty)

---

## 7. M26: Phone layout with a pull-up sheet

**Independent review: required** (the shared layout, the camera framing, pointer gestures and the frame rate on a phone).

### 7.1 Files

New: `src/ui/sheet.ts`, `src/ui/sheetGeometry.ts`, `tests/sheet.test.ts`, `scripts/shots-m26.mjs`.
Changed: `src/ui/layout.ts`, `src/app/app.ts`, `src/ui/infoCard.ts`, `src/ui/panel.ts`, `src/ui/mapView.ts` (canvas box), `src/render3d/cameraRig.ts`, `src/render3d/sceneConfig.ts`, `src/style.css`, both `ui.json`, `docs/review/ru.md`, `scripts/ui.mjs`, `scripts/shots.mjs`, `docs/CODE_MAP.md`.

### 7.2 Data

`src/render3d/sceneConfig.ts`, `SCENE.camera` gains:

```ts
/** The camera keeps the boat above at most this share of the view's height at the bottom (a half sheet and the chip row cover 57 % on a phone, PHASE5_SPEC 3.3). */
maxBottomInsetShare: 0.62,
/** The same at the top (the instrument strip and the time bar), as before. */
maxTopInsetShare: 0.4,
```

`cameraRig.setViewport` uses them instead of its two literal `0.4`s. In the side layout the insets stay far below these limits, so nothing changes there.

### 7.3 Pure helpers

`src/ui/sheetGeometry.ts` exactly as 3.3 (no DOM, no imports from the DOM files, so tests import it).

### 7.4 Store and URL

No change. The sheet height is not in the store or the link. A link opens with the sheet at **half** on a phone (owner's answer 3).

### 7.5 UI

**Layout** (`layout.ts`, `style.css`), stacked only (the side layout is unchanged):

- `.shell` is `position: relative; height: 100%; overflow: hidden` (no grid rows). `.view` fills it (`position: absolute; inset: 0`). The panel element is the **sheet**: `position: absolute; left: 0; right: 0; bottom: 0; height: var(--sheet-h)`, `border-radius: 14px 14px 0 0`, `box-shadow: 0 -2px 10px rgb(10 20 30 / 0.18)`, `background: var(--surface)`, `z-index` above the view's overlays, below the chip menus and the settings dialog. `--sheet-h` and `--view-bottom-inset` are set in px by `sheet.ts`.
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
}
export function createSheet(layout: LayoutShell, view: HTMLElement, topArea: HTMLElement): Sheet;
```

- The panel element gets `data-testid="sheet"` and `data-sheet="peek|half|full"`. Inside it, in this order: the **handle** `button.sheet-handle` (`data-testid="sheet-handle"`, full width, 44 px tall, a centred grip bar 36 × 5 px, `border-radius: 3px`, `background: var(--line)`; `aria-label` = `t('sheet.handle', { height: t('sheet.height.<height>') })`), the head (`div.sheet-head`; M26 moves the tab bar `.tabs` into it), then `.panel-body` (scrolls, as today).
- **Drag:** `pointerdown` on the handle captures the pointer; while moving, the sheet's height follows the finger (`height = start height + (start y − y)`, clamped between `sheetHeightPx('peek')` and `sheetHeightPx('full')`), with no CSS transition. On `pointerup`: if the pointer moved less than `SHEET.tapMaxMovePx` in total it is a **tap** (`tapSheet`); otherwise `snapSheet(start, height now, velocity, space)`, where velocity = (height now − height `SHEET.velocityWindowMs` ago, or at the drag's start if it is younger) / that time in ms. `pointercancel` snaps the same way with velocity 0.
- **Keyboard:** Enter or Space on the handle = tap; ArrowUp = `stepSheet(h, +1)`; ArrowDown = `stepSheet(h, −1)`.
- **Animation:** after a release, tap or `setHeight`, the height animates in `SHEET.transitionMs` (`transition: height 200ms ease-out`; none with `prefers-reduced-motion: reduce`). Listeners run on `transitionend` (or at once without animation).
- **At peek** `.panel-body` has `visibility: hidden` (the head stays visible). At half and full it is visible.
- `SheetSpace` comes from the view's `clientHeight` and the top area's bottom (`topArea.offsetTop + topArea.offsetHeight`, the value `trackTopHeight` already writes as `--view-top-h`); the sheet recomputes its px height whenever either changes (ResizeObserver) and on a layout change, without animation.
- **Side layout:** the handle is `hidden`, the panel is docked as today (`--sheet-h` unset, `--view-bottom-inset: 0px`), `data-sheet` keeps the last stacked height so turning the phone back restores it.
- First open: `half`.

**Panel** (`panel.ts`): the tab bar moves into `sheet.head`. Tapping a tab while the sheet is at peek also raises it to half. `showTab` (the instrument strip, More, "Try it") raises a peek sheet to half too.

**Overlays at the bottom of the view**: `.view-bottom`, `.info-area` (stacked), `.map-scale`, `.map-zoom` and any other overlay of `.view` placed with `bottom:` use `calc(var(--view-bottom-inset, 0px) + <today's px>)`. `grep -n "bottom:" src/style.css` lists them. The map's canvas (`.view[data-map] canvas`) ends at the sheet's top: `bottom: var(--view-bottom-inset, 0px)` (its ResizeObserver redraws it).

**Info card, stacked** (`infoCard.ts`): it moves from the top of the panel to over the view: `.info-area` `position: absolute; left: 8px; right: 8px; bottom: calc(var(--view-bottom-inset, 0px) + 60px)`, the card `max-height: 140px; overflow-y: auto; border-radius: 10px; background: rgb(255 255 255 / 0.95); box-shadow: 0 2px 10px rgb(10 20 30 / 0.25)`. `shownInPanel` (the card stays away while the panel shows the same part) applies only when the sheet is not at peek; the card refreshes on every sheet change.

**3D framing** (`app.ts`): in the stacked layout the bottom inset passed to `scene.resize` is `cameraInsetPx(sheet.height(), space)`; in the side layout it is measured from `.view-bottom` as in M25. `resize` also runs on `sheet.onChange`.

### 7.6 Strings

| Key | English | Russian |
|---|---|---|
| `sheet.handle` | Panel: {height}. Tap to change its height, or drag it. | Панель: {height}. Нажмите, чтобы изменить высоту, или потяните. |
| `sheet.height.peek` | low | внизу |
| `sheet.height.half` | half height | на полэкрана |
| `sheet.height.full` | full height | во весь экран |

### 7.7 Tests (`tests/sheet.test.ts`)

Space A = `{ viewHeightPx: 844, topAreaPx: 116 }`; space B = `{ viewHeightPx: 740, topAreaPx: 166 }`; space C = `{ viewHeightPx: 740, topAreaPx: 114 }`.

1. `sheetHeightPx`: A → peek 100, half 422, full 720. B → half 370, full 566. C → full 618. `{ viewHeightPx: 300, topAreaPx: 200 }` → full = half = 150.
2. `cameraInsetPx`: A → peek 160, half 482, full 482.
3. `snapSheet` (space A): (`half`, 600, 0.1) → `full`; (`half`, 430, −0.6) → `peek`; (`peek`, 150, 0.7) → `half`; (`full`, 700, −0.5) → `half`; (`peek`, 261, 0) → `half` (tie: 261 is midway between 100 and 422); (`peek`, 260, 0) → `peek`; (`full`, 800, 0.9) → `full`.
4. `tapSheet`: peek → half → full → peek. `stepSheet`: (peek, −1) → peek; (full, +1) → full; (half, +1) → full.

### 7.8 Helpers and existing checks

`scripts/ui.mjs`: `setSheet`, and `showSection` / `sectionShown` as in 3.4 (M26 column). `scripts/shots.mjs`: the tap sweeps and the small-parts taps on the phone size call `setSheet(page, 'peek')` before tapping (the boat is framed largest there; `viewBottom` then gives the limit). Any other existing check that fails only because the panel now starts at half height calls `setSheet` or `showSection` first; list each such change in the PR.

### 7.9 Browser checks (`scripts/shots-m26.mjs`)

Scenes (phone size, plus the other sizes as usual):
- `sheet-peek`: `?wd=60&ws=12&cam=side-port`, then `setSheet` peek (scene field `sheet: 'peek'`, handled by the scene runner through `setSheet`).
- `sheet-half`: the same link (default half).
- `sheet-full`: the same link, `sheet: 'full'`.
- `sheet-half-realistic`: `?mode=realistic&st=port&cam=side-port`.

Live checks (phone 390 × 844 unless said):
1. Default: `data-sheet="half"`, the sheet's height is 422 ± 1 px, the 3D canvas is 844 px tall, the page does not scroll.
2. Taps on the handle: half → full (height 720 ± 1) → peek (100 ± 1) → half. At peek `.panel-body` is `visibility: hidden`.
3. Drag: from half, drag the handle up 150 px over 600 ms and release → `full`; from full, drag down 120 px in 60 ms (a fling) → `half`; from half, drag down 50 px slowly (over 600 ms) → `half` (nearest).
4. Keyboard: focus the handle, ArrowDown → peek, ArrowUp twice → full.
5. Framing (`?wd=60&ws=12&cam=side-port&debug=1`): at peek and at half, the boat's origin `window.__sailDebug.project(0, 0, 0)` and the point 10 m up the mast `project(0, 10, 0)` (as the small-parts check uses) both lie below the top area's bottom and above the chip row's top (`viewBottom`).
6. Info card: tap the boom at half → the card shows above the chip row and does not overlap the sheet; at peek, select `rope_mainsheet` through the link `?sel=rope_mainsheet` → the card shows (the strip is hidden at peek).
7. Map: `setCamera(page, 'map')` at half → the map canvas's bottom edge is at the sheet's top (± 1 px) and the zoom buttons are visible above the sheet.
8. Side layout (1440 × 900 and 844 × 390): no handle, the panel is on the right as in M25, `--view-bottom-inset` is 0.
9. Rotation: open at 390 × 844 at full, resize to 844 × 390 (side), then back → `data-sheet="full"` again.
10. `auditPage` at peek, half and full (phone): clean.
11. Frame times: with `?debug=1&wd=60&ws=20&wm=gusty&sea=coastal` at 390 × 844, low detail, the debug overlay's average draw time is reported in the PR (headless numbers are not phone numbers; the owner checks the phone, 7.10).

### 7.10 Done when

On the owner's phone: the boat fills the screen, the sheet moves between its three heights by dragging and tapping, nothing hides behind the sheet that cannot be reached, and the frame rate is still smooth (the debug overlay shows 50 fps or more with `?debug=1&wd=60&ws=20&wm=gusty`). If it drops below 50 fps, say so in the PR with the numbers; do not change detail settings in this milestone.

### 7.11 Not in M26

Modes, sections, the quick row and the mode chip (M27). The tabs stay (they move into the sheet's head).

### 7.12 Decided in the M26 PR

(empty)

---

## 8. M27: Modes and sections

**Independent review: required** (new store field and link key `m`, old links, Show me and Back, the panel rebuilt, glossary text edits).

### 8.1 Files

New: `src/app/appMode.ts`, `src/ui/modes.ts`, `src/ui/sections.ts`, `src/ui/modeChip.ts`, `src/ui/quickRow.ts`, `tests/modes.test.ts`, `scripts/shots-m27.mjs`.
Changed: `src/app/store.ts`, `src/app/urlState.ts`, `src/app/urlSync.ts`, `src/ui/panel.ts`, `src/ui/ropesTab.ts`, `src/ui/learnTab.ts`, `src/ui/windPanel.ts`, `src/ui/realisticPanel.ts`, `src/ui/sailsPanel.ts`, `src/ui/autopilotPanel.ts`, `src/ui/enginePanel.ts`, `src/ui/ropeLegend.ts`, `src/ui/infoCard.ts`, `src/ui/instrumentStrip.ts`, `src/app/app.ts`, `src/style.css`, both `ui.json`, both `glossary.json`, `docs/review/ru.md`, `tests/learn.test.ts`, `scripts/ui.mjs`, `scripts/shots.mjs` and the `shots-m*.mjs` of 8.9, `docs/CODE_MAP.md`. The files keep their names (`ropesTab.ts` and `learnTab.ts` now build sections; update their header comments).

### 8.2 Data

`src/ui/modes.ts` exactly as 4.4 (the table is the data).

### 8.3 Store and URL

`src/app/appMode.ts` as 4.1.

**Store** (`store.ts`):
- `AppState.appMode: AppMode`. `initialState`: `appMode = overrides.appMode === 'learn' ? 'learn' : settings.ropesMode` (the settings after overrides).
- `setAppMode`: `'learn'` → `{ ...state, appMode: 'learn' }` (the ropes mode is kept); `'easy'` / `'realistic'` → `appMode` = that mode and `settings.ropesMode` = that mode, through the same `withTimeRule` as `setRopesMode`. Returns the same object when nothing changes.
- `setRopesMode` (still used by links and tests): sets the ropes mode as today, and if `appMode !== 'learn'` also sets `appMode` to it.
- `reset`: `appMode` = `'easy'` (the default ropes mode).
- `load`: takes `appMode` from the loaded state.
- `openLearn` is unchanged (it does not change the mode; the UI dispatches `setAppMode` as well where 8.5 says so).

**URL** (`urlState.ts`):
- Parse: `appMode = 'learn'` if `m=learn`, or if the link has a valid `learn=<id>` (registered id); otherwise the ropes mode from `mode`. Other `m` values are ignored.
- Serialize: right after `cam`, `m=learn` when `appMode === 'learn'`. `learn=<id>` (right after `sel`, as today) only when `appMode === 'learn'` and an entry is open.
- `urlSync.ts`: the subscriber also compares `state.appMode`. `openScene` keeps the mode: `appMode: state.appMode === 'learn' ? 'learn' : next.appMode` (and `learn: state.learn`, as today).

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
      <span class="section-title">Sails</span><span class="section-chevron" aria-hidden="true">▾</span>
    </button>
    <button type="button" class="section-explain" data-testid="section-explain-sails" aria-pressed="false" aria-label="Explain: Sails">?</button>
  </div>
  <div class="section-body" id="section-body-sails">…</div>
</section>
```

- Folded: `data-open="false"`, `aria-expanded="false"`, the body `hidden`, the chevron turned −90°.
- The "?" button (44 × 44) toggles `data-explain` between `open` and `closed` and `aria-pressed`. CSS: `.panel-section:not([data-explain='open']) .explain { display: none; }`. A section without `.explain` elements has no "?" button.
- Section titles: `ropes` `t('tab.ropes')`; `sails` `t('trim.label')`; `autopilot` `t('autopilot.label')`; `engine` `t('engine.label')`; `conditions` `t('section.conditions')`; `learn` `t('tab.learn')`; `legend` `t('legend.title')`. The blocks' own `h3.section-title` headings of the Sails, Autopilot, Engine (Ropes-tab block only, not the Helm lever) and Rope colours blocks are removed (the section head replaces them).

**What each section holds:**

| Section | Content (built once) | Explanations (`class="explain"` added) |
|---|---|---|
| `ropes` | Easy (`.ropes-easy`): the mode line (`ropes-mode`), the clutch drawing, the strip, `h3` "All ropes and the wheel", the list **without** the autopilot and engine blocks, and the two hints `clutch.hint` and `ropes.mode.easyHint`. Realistic (`.ropes-realistic`): everything `createRealisticPanel` returns. Which one shows follows `settings.ropesMode`, as today. Removed: the Easy / Realistic switch (`createModeSwitch`), the "About this tab" heading, and `showMode`'s moving of the Sails block and the legend (they are sections now). | `ropes-mode` line, `clutch.hint`, `ropes.mode.easyHint`, `real.helm.hint`, `real.helm.slot` |
| `sails` | `createSailsPanel` | `trim.intro` |
| `autopilot` | `createAutopilotPanel` (the Easy one; the Helm station keeps its own) | — |
| `engine` | `createEnginePanel` (the Easy one; the Helm station keeps `createEngineLever`) | `engine.hint` (the one in `createEnginePanel` only) |
| `conditions` | everything `createWindPanel` returns, in today's order (true-wind line, Boat switch, wind instrument, direction, speed, wind changes, waves, presets) | `wind.hint`, `boat.mode.hint`, `instrument.hint`, `wind.dial.hint`, `wind.modes.hint`, `wind.newPattern.hint`, the waves hint (`waves.hint` + `waves.effects`), the presets hint |
| `learn` | everything `createLearnTab` returns | — |
| `legend` | `createRopeLegend` | — |

Live status lines stay visible (no `explain`): `wind-now`, `wind-speed-hint`, `wind-mode-hint`, `sea-status`, `autopilot-status`, `engine-status`, the Realistic strip's lines, `action-status`.

### 8.5 UI

**Panel** (`panel.ts`, rewritten): no tabs. `createPanel(host, store, sheet)` builds the seven sections once and returns:

```ts
export interface Panel {
  /** Opens a section, raises a peek sheet to half, and scrolls the section to the top of the panel body. */
  showSection(id: SectionId): void;
  /** True if the section is open and the panel shows it (not at peek). */
  shows(id: SectionId): boolean;
  onChange(listener: () => void): void;
}
```

- The sections are placed in `.panel-body` in `MODE_LAYOUTS[appMode].order`; each unavailable one is `hidden` (`sectionAvailable`). When `appMode` changes, the sections are re-ordered and each is opened or folded as the mode's `open` (stacked) or `openSide` (side layout) says; the "?" states reset to closed. A layout change re-applies the open states the same way. Nothing else resets them.
- **Selection** (replaces Phase 1's "a selected rope opens the Ropes tab"): when `state.selection` changes to an id with `entryFor(id) !== undefined` and `appMode` is `easy` or `realistic`: if the sheet is not at peek, open the `ropes` section and reveal the strip (`revealStrip`, as today). At peek nothing moves (the quick row shows it). In Learn mode nothing moves.
- **Opening an entry** (More on the info card, "Read more in Learn" in the Easy strip `strip-learn` and the Realistic strip `real-learn`): dispatch `setAppMode('learn')`, then `openLearn(id)`, then `showSection('learn')`. See also inside Learn stays in place (`openLearn` only, as today).
- **"Try it"** in a Learn entry (`learn-try-<id>`): dispatch `setAppMode(state.settings.ropesMode)`, `select`, then `showSection('ropes')`. The label text changes (8.7).
- **The instrument strip** opens `showSection('conditions')` (it opened the Wind tab).
- The info card's `shownInPanel(id)`: `panel.shows('ropes') && ropesTabShows(id) && appMode !== 'learn'`, or `panel.shows('learn') && state.learn === id`.

**Mode chip** (`src/ui/modeChip.ts`, `createModeChip(row: HTMLElement, store: Store): void`, first in the chip row): `data-testid="mode-chip"`, class `chip mode-chip`, text `t('mode.<appMode>')` + caret, `aria-label` = `t('mode.chip', { name: t('mode.<appMode>') })`. Its menu (`data-testid="mode-menu"`, `aria-label` = `t('mode.label')`, 3.2) lists Learn, Easy, Realistic (`mode-option-learn`, `-easy`, `-realistic`); each item shows the name on the first line and `t('mode.<mode>.hint')` on a second line in `var(--font-small)` and `var(--muted)` (item min-height 56 px). Choosing dispatches `setAppMode`.

**Quick row** (`src/ui/quickRow.ts`, `createQuickRow(head: HTMLElement, store: Store, sheet: Sheet): void`; `data-testid="quick-row"`, 56 px tall, `display: flex; align-items: center; gap: 8px; padding: 0 12px`): shown only while the sheet is at **peek** (`hidden` at half and full, and in the side layout). Content by mode:

- **Easy**, a selection whose `entryFor(selection)?.controlId` is set: the control's name (`t(controlView(id).name)`, `quick-name`), its value (`valueText`, `quick-value`), and − / + buttons (`stepButton`, with the same aria strings and the same step and snap as `createControl`: `control.less` / `control.more`, `wheel.less` / `wheel.more` for the wheel). Otherwise: `t('quick.easy')` (`quick-hint`).
- **Realistic**: `t('quick.realistic')` (`quick-hint`).
- **Learn**, an entry open: its name (`quick-name`) and a button `t('quick.read')` (`quick-read`) that raises the sheet to half. No entry: `t('quick.learn')` (`quick-hint`).

The tab bar is gone, so at peek the sheet shows the handle (44) and the quick row (56): `SHEET.peekPx` = 100.

**Side layout:** the panel shows the sections as in the stacked layout, opened as `openSide` says; no quick row.

**Removed:** the tabs (`TAB_IDS`, the tab bar and its keyboard code), the Easy / Realistic switch in the Ropes block, the "About this tab" heading.

### 8.6 Glossary text edits (both languages)

The words "Wind tab" and "Ropes tab" no longer mean anything. Replace these English sentences exactly (left → right) in `content/lang/en/glossary.json`, and make the same change in the Russian draft of the same field (Russian: «вкладка «Ветер»» → «раздел «Условия»», «вкладка «Концы»» → «раздел «Концы»», «блок двигателя» → «раздел «Двигатель»», «блок авторулевого» → «раздел «Авторулевой»», with the case the sentence needs). `textStatus` stays `draft` in Russian.

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
| `term_wave_height` showMe | … the Waves block in the Wind tab says they are 0 … | … the Waves block in Conditions says they are 0 … |
| `fit_autopilot_control` onThisBoat | The autopilot block in the Ropes tab is the app’s version of it. | The Autopilot section is the app’s version of it. |
| `fit_autopilot_control` showMe | Its block is in the Ropes tab: change the angle with its buttons. | Its section is under Ropes: change the angle with its buttons. |

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

| Key | New English |
|---|---|
| `learn.tryIt` | Try it: |
| `view.legend.hint` | Shows what each rope colour means, in the Rope colours section. |
| `time.held.note` | Held still is a boat setting, so there is nothing to pause. You can change it in Conditions, under Boat. |
| `ropes.mode.easyHint` | Easy mode: each rope is a slider. Realistic mode (choose it with the Mode button over the 3D view) works the ropes as on the boat: clutches, the winch and your hand. |

Removed from both files: `tab.wind`, `panel.tabsLabel`, `ropes.about.title`, `ropes.mode.label`, `ropes.mode.option.easy`, `ropes.mode.option.realistic`. (`tab.ropes` and `tab.learn` stay as section titles.)

### 8.8 Tests

`tests/modes.test.ts`:
1. `MODE_LAYOUTS`: for each mode, `order` holds every `SECTION_IDS` entry exactly once; `open`, `openSide` and `second` are subsets of `order`; `second` has 2 entries.
2. `sectionAvailable`: `autopilot` and `engine` false when `settings.ropesMode === 'realistic'`, true in Easy; `legend` follows `settings.legend`; the rest always true.
3. Store: `initialState().appMode === 'easy'`; `setAppMode('realistic')` → `appMode` and `settings.ropesMode` both `realistic`; then `setAppMode('learn')` → `appMode` `learn`, ropes mode still `realistic`; then `setRopesMode('easy')` → ropes mode `easy`, `appMode` still `learn`; from Easy, `setRopesMode('realistic')` → `appMode` `realistic`; `reset` → `easy`; `setAppMode` to the current mode returns the same object.
4. URL: `?m=learn` → Learn, `learn` null; `?learn=rope_vang` → Learn (old link); `?learn=part_made_up` → Easy; `?mode=realistic` → Realistic; `?mode=realistic&learn=rope_vang` → Learn with ropes mode `realistic`; `?m=easy` → Easy (ignored value). Serialize: Learn with no entry → contains `&cam=side-port&m=learn&`; Learn with `rope_vang` → contains `m=learn` and `learn=rope_vang`; Easy with `state.learn = 'rope_vang'` → contains neither `m=` nor `learn=`. Round-trip: `parseUrlState(serializeUrlState(s)).appMode === s.appMode` for the three modes.
5. Every registry `showMe` link (Phase 4) still round-trips (PHASE4_SPEC 3.5) and contains no `m=`.

`tests/learn.test.ts` (allowed changes): "is written right after sel" keeps its regex (`&sel=rope_vang&learn=rope_vang&step=`; `m=learn` is written before `sel`); add `appMode: 'learn'` to the "opening an entry changes nothing else" expectation only if the test needs it (it should not: `openLearn` does not change the mode).

### 8.9 Browser checks

`scripts/ui.mjs`: `showSection`, `sectionShown` and `setMode` as 3.4 (M27 column). The scene runner handles `mode:`.

Selectors that change (blocks that moved into their own sections): `.ropes-easy [data-testid="autopilot"]` → `[data-section="autopilot"] [data-testid="autopilot"]`; `.locator('.ropes-easy').getByTestId('autopilot-…')` → `.locator('[data-section="autopilot"]')…`; `.ropes-easy [data-testid="sails-panel"]` → `[data-section="sails"] [data-testid="sails-panel"]`; the engine panel inside `.ropes-easy` → `[data-section="engine"]`. Checks of "a selected rope opens the Ropes tab" (`shots-m4a.mjs`) check `sectionShown(page, 'ropes')` at half height. Checks that switched Easy / Realistic by a link keep the link (`mode=realistic` still works).

`scripts/shots-m27.mjs`:

Scenes: `mode-menu-open` (`?wd=60&ws=12`, `click: ['mode-chip']`); `learn-mode` (`?m=learn&wd=60&ws=12`); `easy-peek-selected` (`?sel=rope_mainsheet&wd=60&ws=12`, `sheet: 'peek'`); `conditions-explain` (`?wd=60&ws=12`, section `conditions`, `click: ['section-explain-conditions']`); `realistic-mode` (`?mode=realistic&st=port`).

Live checks (phone unless said):
1. `?` → `mode-chip` reads "Easy"; sections in the order of 4.4; `ropes` and `sails` open, the rest folded; no `[role="tab"]` in the page.
2. `setMode(page, 'learn')` → the link has `m=learn`; `learn` is first and open. Open "Vang" from the list → the link has `learn=rope_vang`. `setMode(page, 'easy')` → no `m=` and no `learn=` in the link; `setMode(page, 'learn')` → the Vang entry shows again.
3. `setMode(page, 'realistic')` → `mode=realistic` in the link, the station bar shows in `section-ropes`, `section-autopilot` and `section-engine` are hidden.
4. Old links: `?learn=term_north` → Learn mode, "North" shows; `?mode=realistic&sel=rope_mainsheet` → Realistic; `?learn=rope_vang&mode=realistic` → Learn, and `setMode(page, 'realistic')` keeps the Realistic stations.
5. Show me in Learn mode: `?m=learn&learn=rope_vang` → tap `learn-show-me` → the scene loads and the mode chip still reads "Learn"; `page.goBack()` → the link is back to the one before, still Learn.
6. More: tap the boom (or `?sel=part_boom` in Easy) → info card → `card-more` → mode "Learn", `learn=part_boom`, the entry shows. "Try it" on `?m=learn&learn=rope_vang` → mode "Easy", `sel=rope_vang`, the `ropes` section open with the Vang strip.
7. Instrument strip tap → `section-conditions` open and in view, sheet at least half.
8. Folding: `section-toggle-sails` folds and opens `sails`; "?" on `conditions` shows the `wind.hint` text, a second tap hides it.
9. Quick row: `?sel=rope_mainsheet&ms=40&wd=60&ws=12` at peek → `quick-name` "Main sheet", `quick-value` "40 %", tap + → `ms=45` in the link (step 5). At half the quick row is hidden and only one button named "More: Main sheet" exists in the page.
10. Russian `?lang=ru`: the mode menu reads «Обучение», «Простой», «Реалистичный»; the Latin scan and the clipping check of M23 over every section and the mode menu pass.
11. `auditPage`: the mode menu open; Easy at half with every section open; Learn mode with an entry; Realistic at full (phone); Easy on the desktop size: clean.

### 8.10 Done when

On the owner's phone: "Easy ▾" switches between Learn, Easy and Realistic without losing anything on the boat; every block can be found in every mode; explanations open with "?"; tapping the instruments opens Conditions; at the lowest sheet height the selected rope's − / + work; old Phase 4 links (`learn=…`) open in Learn. Tests and CI green.

### 8.11 Not in M27

The mini-map (M28), the second column (M29), remembering folds.

### 8.12 Decided in the M27 PR

(empty)

---

## 9. M28: Mini-map

**Independent review: required** (new setting and link key `mm`, `openScene` change, a second canvas drawn every frame).

### 9.1 Files

New: `src/ui/miniMap.ts`, `tests/miniMap.test.ts`, `scripts/shots-m28.mjs`.
Changed: `src/model/settings.ts`, `src/app/store.ts` (nothing but the default through `DEFAULT_SETTINGS`), `src/app/urlState.ts`, `src/app/urlSync.ts`, `src/ui/mapView.ts`, `src/ui/settingsMenu.ts`, `src/app/app.ts`, `src/style.css`, both `ui.json`, `docs/review/ru.md`, `docs/CODE_MAP.md`.

**Decided in planning:** the phone's Back button does not close the full map. Back reloads the previous link, which would put the boat back at the link's heading and the start position and empty her track. The map's **Close** button and the camera chip return instead. The owner is asked to confirm this in the M28 PR (it differs from the planning outline).

### 9.2 Data and settings

`Settings.miniMap: boolean`, `DEFAULT_SETTINGS.miniMap = true`. URL `mm` (4.2): read `mm=0` → false, `mm=1` → true; written `mm=0` right after `lb`, only when false. `reset` keeps the default (true). `openScene` keeps the viewer's `miniMap` (add it to the settings it keeps: `detail, debug, step, legend, labels, miniMap`).

### 9.3 Pure helpers (`src/ui/mapView.ts`)

```ts
/** Mini-map sizes (PHASE5_SPEC 9.3). */
export const MINI_MAP = {
  metresPerPx: 5,
  sizePx: { stacked: 96, side: 160 },
  maxFps: 10,
} as const;
/** The mini-map's viewport: north up, the boat in the middle of a square canvas. */
export function miniMapViewport(state: AppState, sizePx: number): MapViewport;
/** Draws the mini-map: water, grid, track, buoys, the boat (enlarged as on the map), a true-wind arrow and an "N". No labels, no no-go zone, no apparent wind. */
export function drawMiniMap(ctx: CanvasRenderingContext2D, state: AppState, sizePx: number, width: TextWidth): void;
```

`miniMapViewport`: `centreEastM = state.boat.eastM`, `centreNorthM = state.boat.northM`, `upDeg = 0`, `metresPerPx = MINI_MAP.metresPerPx`, `widthPx = heightPx = sizePx`, `centreXPx = centreYPx = sizePx / 2`.

`drawMiniMap` reuses the map's own drawing functions (`drawGrid`, `drawTrack`, `drawBuoys`, and `drawBoat` with `mapLayout(state, view, width)`) on that viewport. The true-wind arrow: from the canvas's top-left corner area, centre (14, 14), 18 px long, pointing the way the wind blows (`compassDeg(state.wind.dirDeg) + 180`), colour `COLOURS.text`, line width 2, a 6 px head. The "N": `t('wind.dial.north')` (the wind dial's "N", already in both languages), 11 px bold, centred at (sizePx / 2, 9), drawn with the map's `haloText`.

### 9.4 UI

**The mini-map** (`src/ui/miniMap.ts`, `createMiniMap(view: HTMLElement, store: Store, layout: LayoutShell): void`):

- A `button.mini-map` (`data-testid="mini-map"`, `aria-label` = `t('minimap.open')`) holding a `canvas` (`data-testid="mini-map-canvas"`), square: 96 px in the stacked layout, 160 px in the side layout; `border-radius: 10px`, `border: 2px solid rgb(255 255 255 / 0.9)`, `box-shadow: 0 2px 8px rgb(10 20 30 / 0.3)`, `overflow: hidden`.
- Placed `right: 8px; bottom: calc(var(--view-bottom-inset, 0px) + 60px)` (just above the chip row's right end, over the gear).
- **Shown** only when all hold: `settings.miniMap`, `boat.mode === 'sailing'`, `camera.preset !== 'map'`, and the 3D view exists (as the map). Otherwise `hidden` (and not drawn).
- Drawn with `drawMiniMap` at most `MINI_MAP.maxFps` times a second, from the frame loop (`app.ts` calls `miniMap.update(now)` next to `map.update(now)`), with the device pixel ratio capped at 2 as the map does.
- **Tap:** remembers the current camera preset and dispatches `setCameraPreset('map')`. No history step (9.1).
- **Info card** (stacked): when the mini-map shows, `.info-area` gets `right: calc(8px + 96px + 8px)` so the card never covers it.

**The full map's Close button** (`mapView.ts`): `button.map-close` (`data-testid="map-close"`, `aria-label` = `t('map.close')`, text `×`, 44 × 44, top right of the view below the top area: `top: calc(var(--view-top-h, 64px) + 8px); right: 8px`), shown only on the map. It dispatches `setCameraPreset` with the preset the view had before the map (remembered whenever the camera changes to `map`, from any path: mini-map, camera chip, link), or `side-port` if there was none (a link that opened on the map).

**Settings** (`settingsMenu.ts`): a toggle after Clock: `input#mini-map-toggle` (`data-testid="mini-map-switch"`), label `t('settings.miniMap.label')`, hint `t('settings.miniMap.hint')`, dispatching `{ type: 'setMiniMap', miniMap: boolean }` (new store action; it only sets `settings.miniMap`).

### 9.5 Strings

| Key | English | Russian |
|---|---|---|
| `minimap.open` | Mini-map: tap to open the full map. | Мини-карта: нажмите, чтобы открыть карту. |
| `map.close` | Close the map | Закрыть карту |
| `settings.miniMap.label` | Mini-map | Мини-карта |
| `settings.miniMap.hint` | A small map in the corner while sailing: the boat, the wind, her track and the buoys. Tap it for the full map. | Маленькая карта в углу на ходу: яхта, ветер, её след и буи. Нажмите на неё, чтобы открыть полную карту. |

### 9.6 Tests (`tests/miniMap.test.ts`, plus `tests/urlState.test.ts`)

1. `miniMapViewport(initialState(), 96)`: centre (48, 48), `metresPerPx` 5, `upDeg` 0. With `mapToScreen`: the start (0, 0) → (48, 48); 200 m north → (48, 8); 200 m east → (88, 48); 200 m south → (48, 88); 200 m west → (8, 48). With size 160: 200 m north → (80, 40).
2. The boat moved to east 120 m, north −40 m: the start → (48 − 24, 48 − 8) = (24, 40).
3. URL: `parseUrlState('?mm=0', 'low')` → `settings.miniMap` false, and its link contains `&detail=low&mm=0` (with `lb=0` added to the link: `&detail=low&lb=0&mm=0`); `?` → true and no `mm` in the link; `?mm=1` → true and no `mm` written; `reset` → true. (In `serializeUrlState` the `mm` line comes right after the `lb` line and before `mode`.)
4. `openScene` keeps `miniMap` (a unit test through the store with `load`, as the Phase 4 tests do for `detail`).

### 9.7 Browser checks (`scripts/shots-m28.mjs`)

Scenes: `mini-map` (`?wd=60&ws=12`, after 3 s of sailing so a track shows: `waitMs: 3000`); `mini-map-desktop` (the same at 1440 × 900); `mini-map-off` (`?wd=60&ws=12&mm=0`).

Live checks:
1. Phone `?wd=60&ws=12`: `mini-map` visible, 96 × 96 ± 1 px, its bottom edge 8 px above the chip row; not overlapping the sheet.
2. `?wd=60&ws=12&held=1` → hidden; tap Sailing in Conditions → shown.
3. Tap the mini-map → `cam=map`, the full map shows, the mini-map is hidden; `map-close` → `cam=side-port` and the mini-map shows. From `setCamera(page, 'top')`, open the mini-map, Close → `cam=top`.
4. `?cam=map&wd=60&ws=12` → `map-close` → `cam=side-port`.
5. Settings → Mini-map off → `mm=0` in the link and the mini-map hidden; on → shown, `mm` gone.
6. The mini-map's canvas is not blank: the pixel at the canvas centre differs from the water colour (`#d9ebf6`) (the boat).
7. `auditPage` with the mini-map shown (phone and desktop): clean.

### 9.8 Done when

On the owner's phone, while sailing: the mini-map in the corner shows the boat, the wind arrow and the track; a tap opens the full map; Close comes back to the same view; the switch in Settings hides it. Tests and CI green.

### 9.9 Not in M28

The second column (M29).

### 9.10 Decided in the M28 PR

(empty)

---

## 10. M29: Desktop, polish and sign-off

**Independent review: not needed** (layout of wide screens, checks and docs; no state, link or model change).

### 10.1 Files

New: `scripts/shots-m29.mjs`.
Changed: `src/ui/layoutMode.ts`, `src/ui/layout.ts`, `src/ui/panel.ts`, `src/style.css`, `README.md`, `docs/ROADMAP.md`, `docs/LAYOUT_ANALYSIS.md`, `docs/CODE_MAP.md`, this spec (status line, decisions).

### 10.2 Wide layout

- `layoutMode.ts`: `export const WIDE_MIN_WIDTH_PX = 1280;` and `export function isWide(width: number, mode: LayoutMode): boolean` (`mode === 'side' && width >= WIDE_MIN_WIDTH_PX`). `layout.ts` sets `<html data-wide="true">` when wide (removed otherwise), live on resize, and includes `wide: boolean` in `Viewport`.
- Wide `.shell`: `grid-template-columns: minmax(0, 1fr) 400px 360px`. The panel spans the last two columns as two scrolling columns: column 1 is today's `.panel-body`; column 2 is a new `div.panel-second` (`data-testid="second-column"`, `border-left: 1px solid var(--line)`, its own vertical scroll).
- `panel.ts`: when wide, the sections of `MODE_LAYOUTS[appMode].second` move into column 2, in that order, **open**; the rest stay in column 1 in `order`, opened as `openSide` says. When not wide, column 2 is `hidden` and empty, and every section is back in column 1 in `order`. Moving a section never rebuilds it. `showSection` scrolls the column the section is in.
- The mini-map is 160 px in every side layout (M28); nothing else changes in the 3D view.

Tests (`tests/layoutMode.test.ts`, added): `isWide(1440, 'side')` true; `isWide(1279, 'side')` false; `isWide(1440, 'stacked')` false.

### 10.3 Browser checks (`scripts/shots-m29.mjs`)

Scenes at 1440 × 900 (only): `wide-easy` (`?wd=60&ws=12`), `wide-learn` (`?m=learn&learn=rope_vang`), `wide-realistic` (`?mode=realistic&st=port`).

Live checks:
1. 1440 × 900: `second-column` visible; Easy → it holds `section-conditions` then `section-learn`, both open; Learn mode → `section-conditions` then `section-ropes`.
2. 1279 × 900 → `data-wide` absent, `second-column` hidden, all seven sections in column 1.
3. Resize 1440 → 1000 → 1440: the sections move and come back; the wind dial keeps working (drag it: `wd` changes in the link).
4. 820 × 1000 (foldable) and 844 × 390: no second column.

### 10.4 Accessibility and frame rate (the sweep)

`auditPage` (clean, no new exceptions; if an exception seems needed, ask in the PR) on: the phone at peek, half and full in each of the three modes with every available section open; the settings dialog, the camera menu and the mode menu; the mini-map; Russian (`lang=ru`) Easy at half with every section open; 1440 × 900 wide in each mode. Frame times as 7.9 check 11, reported in the PR for the phone size at peek and at half.

### 10.5 Docs

- `README.md`: "What you can do" describes the modes (Learn, Easy, Realistic), the sheet on phones, Settings, the camera chip and the mini-map; the link keys `m` and `mm`; the documents table gains `PHASE5_SPEC.md` and `LAYOUT_ANALYSIS.md`.
- `docs/ROADMAP.md`: Phase 5 status "Done (M29, PR #<n>; spec)" once the owner signs off, and a decisions-log row.
- `docs/LAYOUT_ANALYSIS.md`: one line under the title: "Built in Phase 5 ([PHASE5_SPEC](PHASE5_SPEC.md)); kept as the record of why."
- `docs/CODE_MAP.md`: the "How a frame runs" paragraph mentions the sheet and the sections; every new file has its row.

### 10.6 Done when

Every item of section 11 is ticked in the PR. **The agent ticks** items 1–6 and 8; **the owner ticks** item 7 (smooth on the phone) and confirms items 1–5 on the phone. CI `browser-checks` green.

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

Open (each to confirm in its milestone's PR, with this recommendation):
- M28: the phone's Back button does not close the full map (9.1). Recommended: accept, because Back reloads the link and would reset the boat's position and track.
