# Console, part A: the computer and tablet console (M119–M124)

Planned with `/plan` on 2026-11-28 from the concept of PR #293 ([`UI_CONCEPT_ANALYSIS.md`](UI_CONCEPT_ANALYSIS.md), mockup [`mockups/ui-concept.html`](mockups/ui-concept.html)). The owner's answers to the concept's ten questions are in the PR #293 comment of 2026-11-27, and the answers to this plan's four questions are in chat on 2026-11-28. Both are written out in section 13. The look the console follows is drawn in [`mockups/console-look.html`](mockups/console-look.html) (section 2.3). Part B (the phone's Watch) is planned later with `/plan console b`, in its own file.

## 0. How to use this spec

- Six milestones, built in order, **one PR each**, titled `M<N>: <name>` (names in section 6), each saying `Closes #<n>` for its own milestone issue; only M124 also closes #161 (#272 stays open for part B). Each milestone has its own GitHub issue (#296–#301, section 6): a short card for the owner that links back here. This spec is what the builder follows.
- Read sections 0–5, then **only your milestone's section** (7 for M119, 8 M120, 9 M121, 10 M122, 11 M123, 12 M124). The general rules are in CLAUDE.md. Names (files, functions, store actions, `data-testid`s, CSS custom properties, string keys, URL keys) are required. Numbers are final unless marked **tunable**: a tunable number may change, and the PR reports the old and the new value.
- **Nothing in `src/model` changes in M119–M123**, and every PHYSICS_TRUTHS test keeps passing untouched. M124 changes the store and the URL (section 12), not the sailing.
- **Text is data.** The English strings here are final. German, Norwegian and Russian strings are AI drafts the builder writes. Every new key exists in `content/lang/{de,no,ru}/ui.json`, and the builder runs `npm run review-doc -- de`, `-- no` and `-- ru` after changing them.
- **The phone layout does not change** in this part (the sheet, tabs, step bar, Watch, Show me), except the mode picker's two choices of M124 (12.6). A phone check that fails is a bug of the milestone, never a reason to change the phone.
- Keep the signatures written here. Decisions taken while building go in a new last subsection of your section, "Decided in the M<N> PR", marked "recommended; merging accepts it", with a ROADMAP decisions-log row pointing to it. Every milestone also updates `docs/CODE_MAP.md` for its files and its moved responsibilities, and `.github/ci-times.json` when its group's measured time changes by more than half.
- **Build order:** each milestone starts after the one before it is merged; names it uses from earlier milestones are as merged (if one differs from this spec, use the merged one and say so in the PR).
- **The live site.** The console replaces today's computer layout from M119 (owner, question 3). The live site changes only when the owner runs Release, so the M124 PR tells the owner the part is ready for a release; the M119–M123 PRs say "do not release before M124" in their Known limitations.

## 1. Goal and scope

**Goal.** On a computer, a tablet held sideways and an unfolded foldable, the 3D view fills the window. Along the bottom, a **console** of control blocks is always visible, as the controls of a real boat are: the port lines on the left, the wheel and autopilot in the centre with the engine and thrusters beside it, the starboard lines on the right, a small sails-status strip above the wheel and engine, and the harbour gear folded at the right end. A **menu** at the top right opens one **drawer** at a time for everything you read or set up. During an exercise, only the controls the step needs are outlined, and the rest of the console is dimmed. Mode becomes two choices: what you are doing and how you control the boat.

**In scope:** issue #161 and the computer half of #272. The console layout rule, the shell, the menu and drawers (M119); the wheel, autopilot, engine and thrusters blocks in the new look (M120); the port and starboard line blocks in Easy and Realistic (M121); the harbour-gear block and the conditions widget (M122); exercises on the console (M123); activity and control style as two choices, Harbour as a place, sign-off (M124).

**Out of scope (owner, section 13):** the phone's Watch and highlight on the boat (part B); moving or resizing blocks in the app; first person, where the Mast and Bow stations come back; the navigation chart (its place is kept, 10.5); arcade, race, quest; a manual winch at the mast; a fold for the whole console; anything in the sailing model.

## 2. Conventions

### 2.1 Layouts

- **Console layout**: the window's CSS size `w × h` has `w ≥ 800`, `h ≥ 560` and `w / h ≥ 0.8` (owner: the unfolded Galaxy Z Fold 6, reported at about 904 × 968, must get it). **Phone layout** (today's `stacked`): every other window. Today's `side` and `wide` layouts are gone from M119: a 700–799 px wide window, a phone held sideways (844 × 390) and an upright tablet (768 × 1024, 0.75) get the phone layout.
- `<html data-layout="console">` or `"stacked"`. `data-wide` is removed. **Narrow console**: a console window under 1,280 px wide, `<html data-console="narrow">`; from 1,280 px `data-console="wide"`. Sizes below differ between the two only where they say so.
- Viewports the checks use (from M119, `scripts/shots.mjs` `VIEWPORTS`): `phone-390x844` (phone layout), `foldable-820x1000` (narrow console, 0.82), `desktop-1440x900` (wide console), `phone-landscape-844x390` (phone layout now, h < 560). M119 adds `fold6-904x840` (narrow console: the Fold 6 unfolded with the browser's bars) to the resize test only, not to `VIEWPORTS`.

### 2.2 Screen areas on the console layout

Measured from the window's edges, in CSS px. "Band" = the console's bottom band.

| Area | Where | Size |
|---|---|---|
| Band | bottom, full width | height `--console-h`: 240 px when `h ≥ 720`, else 208 px |
| Sails strip | sits on the band's top edge, over the wheel and engine blocks, same left and right edges as those two together | 40 px tall |
| Instruments | top left, 8 px from both edges | as today's strip |
| Time widget | top left, right of the instrument strip, 8 px gap (moved there from today's top-right group, 7.6) | as today |
| Step card | wide console: top centre, width `min(560px, 100% − 880px)`; narrow console: under the instrument row, 8 px from the left, width `min(560px, 100% − 160px)` | as today's card inside |
| Menu | top right, 8 px from both edges | 128 px wide, one button per drawer (labels, no icons) |
| Drawer | top right, 8 px left of the menu, 8 px from the top | 380 px wide, height up to the band's top − 16 px |
| Conditions widget (M122) | top right, under the menu | 128 × 128 (narrow: 96 × 96) |
| Mini-map | bottom left, 8 px above the band | as today |
| Chip row | bottom right, 8 px above the band | as today (camera, sound, mode, settings) |

### 2.3 The console look ("instrument night", owner question 2: A)

Drawn in `docs/mockups/console-look.html` (the planning PR's picture page; the builder opens it in a browser and matches it). Tokens, declared once in `src/style.css` under `html[data-layout='console']` (M119):

| Token | Value | Use |
|---|---|---|
| `--console-band` | `rgb(10 24 38 / 0.78)` | the band's background, with `backdrop-filter: blur(8px)` |
| `--console-block` | `rgb(22 42 62 / 0.92)` | each block, the sails strip, the menu |
| `--console-edge` | `rgb(150 190 220 / 0.22)` | 1 px block borders, dividers |
| `--console-text` | `#eef4f8` | text, numbers |
| `--console-muted` | `#9fb3c3` | block titles, units, key hints |
| `--console-accent` | `#4fb3e8` | pressed buttons, the wheel's rim mark, slider fill |
| `--console-need` | `#ff9f1c` | the exercise outline (M123) only |
| `--console-ok` | `#4cc38a` | Good trim, engine running |
| `--console-warn` | `#f0b429` | Luffing, Stalled, warnings |
| `--console-radius` | `12px` | blocks; buttons use 10 px |

- **Block**: background `--console-block`, border `1px solid var(--console-edge)`, radius `--console-radius`, padding 10 px, gap 8 px between blocks. **Block title**: 12 px, weight 600, uppercase, letter-spacing 0.08em, `--console-muted`, top left of the block.
- **Buttons** (`.console-button`): at least 44 × 44 px, background `rgb(255 255 255 / 0.06)`, border `1px solid var(--console-edge)`, radius 10 px, text `--console-text` 15 px weight 600; hover background `rgb(255 255 255 / 0.12)`; pressed or on: border and text `--console-accent`, background `rgb(79 179 232 / 0.18)`; `:focus-visible` 2 px outline `--focus`.
- **Numbers**: `font-variant-numeric: tabular-nums`, 20 px weight 600 for the main reading of a block (rpm, heading, a line's %), units in `--console-muted` 12 px.
- **Key hints**: a small key cap after a control's label, 11 px, 1 px border `--console-edge`, radius 4 px, padding 0 4 px, `--console-muted` (`<kbd class="key-cap">W</kbd>`).
- **Drawers and their sections keep today's light look** (`--surface`, `--text`): they are for reading. The drawer has radius 12 px, shadow `0 8px 24px rgb(0 0 0 / 0.25)` and a header with its title and × (`drawer-close`).
- **Avoid**: glossy bevels and fake metal or wood, gradients beyond the mockup's, neon glows, today's white cards inside the console, emoji as icons, text under 11 px, motion that is not the M123 pulse.

### 2.4 Sides and words

- **Port** = left block, **starboard** = right block, as you look forward from the helm, which is how the camera starts. The sides never swap when the camera turns.
- Ropes are "lines" in English text (PHASE_FEEDBACK_SPEC 2); ids keep `rope_`.
- Every control in the console that has a key shows it as a key cap (2.3).

## 3. Shared helpers

| Name | File | Signature | Behaviour |
|---|---|---|---|
| `layoutModeFor` | `src/ui/layoutMode.ts` (M119, changed) | `(w: number, h: number): LayoutMode` | `'console'` by the rule of 2.1, else `'stacked'`. `type LayoutMode = 'stacked' \| 'console'`. |
| `consoleWidthOf` | `src/ui/layoutMode.ts` (M119) | `(w: number): 'narrow' \| 'wide'` | `w < 1280 ? 'narrow' : 'wide'`. |
| `createConsole` | `src/ui/console.ts` (M119) | `(view: HTMLElement, store: Store, layout: LayoutShell): ConsoleView` | Builds the band, its block slots and the sails strip (section 7.5). |
| `ConsoleView` | `src/ui/console.ts` | `{ root: HTMLElement; slot(id: BlockId): HTMLElement; top(): number }`; M122 adds `setHarbourOpen(open: boolean): void; harbourOpen(): boolean` | `top()` is the smallest `getBoundingClientRect().top` of the band and the sails strip, for the camera. |
| `BlockId` | `src/ui/console.ts` | `'port' \| 'wheel' \| 'engine' \| 'starboard' \| 'harbour' \| 'sails'` | The six slots. |
| `createMenu` | `src/ui/consoleMenu.ts` (M119) | `(view: HTMLElement, store: Store, items: MenuItem[]): ConsoleMenu` | The menu and its one drawer (7.6). |
| `ConsoleMenu` | `src/ui/consoleMenu.ts` | `{ open(id: DrawerId): void; close(): void; openId(): DrawerId \| null; update(): void; onChange(fn: (id: DrawerId \| null) => void): void }` | `update()` shows or hides items by `MenuItem.shown()`; `onChange` is told every open and close. |
| `linesOfSide` | `src/ui/consoleLines.ts` (M121) | `(side: 'port' \| 'starboard', data?: BoatData): PanelEntry[]` | The Easy entries on that side, in clutch-slot order (9.3). Pure: no DOM. |
| `consoleTargets` | `src/app/consoleTargets.ts` (M123) | `(def: ExerciseDef, step: number, ropes: RopesMode): ConsoleTarget[]` | What the step outlines (11.3). Pure. |

## 4. Common mistakes

- **A control mounted twice with the same DOM id.** `createEnginePanel` (`engine-lever`, `engine-status`), `createWindPanel` (`wind-speed`, radio name `boat-mode`) and `createHarbourPanel` (radio name `fenders`) are not safe to build twice. The console **moves** the one built section content (as `panel.ts`'s `place()` does today) or builds a new control with new ids; it never builds a second copy of those three.
- **Testids changed by accident.** Older checks find controls by testid (`autopilot-*`, `engine-*`, `thruster-*`, `line-*`, `windlass-*`, `station-drawing-*`, `act-*`, `trim-*`). A new control that replaces an old one keeps the old testid on the element that does the same thing. New testids are only for new things.
- **The phone layout changed.** Every console style is under `html[data-layout='console']`, and every console element is created only when the layout is console, or hidden with `[hidden]` on the phone. Run the phone group `m79` after any change to `panel.ts`, `modes.ts` or `app.ts`.
- **The camera frames behind the band.** The 3D view's bottom inset on the console is `viewBox.bottom − min(chipRow.top, barTop, console.top())` (7.7). Forgetting the sails strip or the harbour block's raised panel hides the boat's stern.
- **A key that types into a field.** The new keys (1, 2, Tab is not used) go through `keyAction` and `isTypingTarget` as today's keys do.
- **Realistic: acting at a station the captain is not at.** The walk (M112) stays: a control of another station first starts the walk (`realistic` action `station`), and the block says "Walking…" until he arrives (9.4).
- **The dinghy.** Every block reads `hasFeature` / `isDinghy` at render time (`src/model/boat.ts`), never a module constant (PHASE_DINGHY_SPEC 4).

## 5. Architecture

**Layout.** `src/ui/layout.ts` keeps `createLayout(host): LayoutShell`; `Viewport` becomes `{ width; height; mode: LayoutMode; console: 'narrow' | 'wide' | null }` (`wide` is removed). `src/ui/modes.ts` `LayoutKind` becomes `'stacked' | 'console'`; `layoutKindOf` follows. On the console layout `.shell` has one grid column (the view); `section.panel` stays in the DOM, `hidden`, so `panel.ts` keeps building every section once and **places** each section's element into a console slot or the drawer (7.4).

**Where each section goes on the console** (the table `CONSOLE_PLACE` in `src/ui/modes.ts`, M119; later milestones change its rows as their sections say):

| Section | M119 | From |
|---|---|---|
| `autopilot` (Easy: wheel and autopilot), `helm` (Realistic: the Helm station) | slot `wheel` | M120: one wheel block for both |
| `engine` | slot `engine` | M120: the new engine block |
| `dinghy` (Balance) | slot `engine` on the dinghy | — |
| `sails` | slot `sails` | M120: drawer `sails`; the slot holds the new sails strip |
| `ropes` | drawer `lines` | M121: slots `port` and `starboard` |
| `harbour`, `anchor` | drawer `harbour` | M122: slot `harbour` |
| `conditions` | drawer `conditions` | M122: the conditions widget |
| `exercises` | drawer `exercises` | — |
| `learn`, `place`, `status` | drawers of the same names | — |
| `mode`, `settings` | not placed (the chip row's mode chip and gear open their cards, as today on a computer) | M124: the mode chip opens the two choices |

`type DrawerId = 'exercises' | 'learn' | 'lines' | 'harbour' | 'conditions' | 'place' | 'status'` (M119; M120 adds `sails`; `lines` goes in M121, `harbour` and `conditions` in M122).

**Removed in M119:** `src/ui/columnHandles.ts`, `src/ui/columnWidths.ts`, `src/ui/sectionLayout.ts`, `src/ui/sectionMove.ts`, the second column (`second-column`), the `side` and `wide` styles, and their tests. `src/ui/deviceSettings.ts` keeps **reading** the `columns` and `layout` keys of an old setup file and ignores them (7.8); it no longer writes them.

**State.** M119–M123 add no `AppState` field. The harbour block's fold, the open drawer and the conditions widget's Set up switch are UI state inside their modules, not in the link and not stored. M124 changes how the mode is held (12.4).

**Files added**, by milestone: M119 `src/ui/console.ts`, `src/ui/consoleMenu.ts`, `tests/consoleLayout.test.ts`, `scripts/shots-m119.mjs`; M120 `src/ui/consoleWheel.ts`, `src/ui/consoleEngine.ts`, `scripts/shots-m120.mjs`; M121 `src/ui/consoleLines.ts`, `tests/consoleLines.test.ts`, `scripts/shots-m121.mjs`; M122 `src/ui/consoleHarbour.ts`, `src/ui/conditionsWidget.ts`, `scripts/shots-m122.mjs`; M123 `src/app/consoleTargets.ts`, `tests/consoleTargets.test.ts`, `scripts/shots-m123.mjs`; M124 `src/app/activity.ts`, `tests/activity.test.ts`, `scripts/shots-m124.mjs`. Each adds its files to `docs/CODE_MAP.md`.

**Browser checks.** The set is at its cap (77 groups, `tests/ciPlan.test.ts`). M119 deletes the groups `m39` (columns) and `m54` (movable sections) with their files and adds group `m119` (76 groups); M121 adds group `m121` (77). Every other milestone joins a group with `members(...)` and a `GROUP_ALIASES` entry, as its section says. `scripts/ui.mjs` keeps its helper names; M119 changes what `showSection`, `sectionShown`, `eachSection` and `openSettings` do on the console layout (7.9), so most of the 223 `showSection` calls keep working unchanged.

## 6. Milestones overview

| Milestone | What the owner sees | Issues (milestone issue first) | Rules tested | Depends on | Independent review |
|---|---|---|---|---|---|
| **M119: Console shell** | On a computer, tablet or unfolded Fold the 3D view fills the window; a dark console band along the bottom holds today's steering, engine and sails controls; a menu at the top right opens Exercises, Learn, Lines, Harbour, Conditions, Place and Status as drawers; the side columns are gone | #296; #161, #272 | none (all earlier rules keep passing) | — | **required** (the layout shell, every older browser check, old setup files) |
| **M120: Wheel and engine** | A drawn wheel you drag, the autopilot buttons, an engine lever you drag with Start/Stop and rpm, the thrusters always there and working; the sails strip above them; key caps on every control | #297; #161 | none | M119 | **not needed** (controls that dispatch the existing actions) |
| **M121: Port and starboard lines** | Port lines on the left, starboard lines on the right, each where its clutch is on the boat; in Realistic both clutch banks and winches always visible, the captain walking across when you use the other side; no Mast or Bow station on the computer | #298; #161 | none | M120 | **required** (Realistic gestures, the walk, which line is on which side) |
| **M122: Harbour gear and conditions** | A folded Harbour strip at the right end that unfolds (fenders, mooring lines, anchor and windlass) and narrows the other blocks; a wind compass at the top right that unfolds to the wind and waves, with Set up to change them | #299; #161 | none | M121 | **not needed** (moves existing controls) |
| **M123: Exercises on the console** | No step bar on the computer; the exact control the step needs (a line, a button, one sail's status, the wind compass) has a slow orange pulsing outline and the rest of the console is dimmed; the exercise list in its drawer | #300; #161 | none | M122 | **required** (what an exercise marks teaches the handling; older exercise checks) |
| **M124: What you are doing, and controls** | The mode chip offers "What you are doing" (Learn, Sail freely, Exercise) and "Controls" (Easy, Realistic); Harbour is now Sail freely at the marina or in the bay; every old link opens as before; part A signed off | #301; #272 | none | M123 | **required** (store, URL keys and old links) |

## 7. M119: Console shell

**Independent review: required** (the layout shell, the camera's framing, every older browser check that ran on the side layout, old setup files).

### 7.1 Files

- **Add** `src/ui/console.ts`, `src/ui/consoleMenu.ts`, `tests/consoleLayout.test.ts`, `scripts/shots-m119.mjs`.
- **Change** `src/ui/layoutMode.ts`, `src/ui/layout.ts`, `src/ui/modes.ts` (`LayoutKind`, `layoutKindOf`, `sectionAvailable`'s default `'console'`, the new `CONSOLE_PLACE` and `drawerOf`), `src/ui/panel.ts` (placing on the console, `showSection` opens a drawer), `src/app/app.ts` (builds the console and the menu on the console layout; the camera inset of 7.7), `src/ui/panel.ts`'s `layoutKind === 'wide'` and `src/ui/debugOverlay.ts`'s `mode === 'side'` (each becomes a `'console'` test; the `layoutKindOf(…) !== 'stacked'` tests in `exerciseBar.ts`, `stepCard.ts` and `timeBar.ts` need no change), `src/ui/deviceSettings.ts` and `src/app/setupFile.ts` (7.8), `src/ui/settingsMenu.ts` (the "Your setup" rows of the columns and the arrangement go; its `viewport().wide` uses, lines 171 and 173, read `viewport().console === 'wide'`), `src/ui/modeChip.ts` (the same for its label, lines 25–35), `tests/physicsTruthsDinghy.test.ts` (line 23 imports `completeLayout` from the deleted `sectionLayout.ts`: it reads `MODE_LAYOUTS[mode].order` instead; the test's assertion does not change), `src/style.css` (44 rules use `data-layout='side'` or `data-wide`: each becomes `data-layout='console'` or goes; the tokens of 2.3), `content/lang/*/ui.json`, `scripts/ui.mjs` (7.9), `scripts/shots.mjs` (`VIEWPORTS`, the resize test, the groups), `tests/layoutMode.test.ts`, `tests/modes.test.ts`, `tests/setupFile.test.ts`.
- **Delete** `src/ui/columnHandles.ts`, `src/ui/columnWidths.ts`, `src/ui/sectionLayout.ts`, `src/ui/sectionMove.ts`, `tests/columnWidths.test.ts`, `tests/sectionLayout.test.ts`, `scripts/shots-m39.mjs`, `scripts/shots-m54.mjs` (their groups `m39` and `m54` leave `liveGroups`, `.github/ci-times.json` and any `GROUP_ALIASES` entry pointing to them).

### 7.2 Data

None. No boat or area key changes.

### 7.3 Layout rule (`src/ui/layoutMode.ts`)

```ts
export const CONSOLE_MIN_WIDTH_PX = 800;
export const CONSOLE_MIN_HEIGHT_PX = 560;
export const CONSOLE_MIN_ASPECT = 0.8;   // width / height
export const CONSOLE_WIDE_MIN_PX = 1280;
export type LayoutMode = 'stacked' | 'console';
export function layoutModeFor(w: number, h: number): LayoutMode; // 'console' when w ≥ 800 && h ≥ 560 && w / h ≥ 0.8; 'stacked' for anything else, 0 and NaN included
export function consoleWidthOf(w: number): 'narrow' | 'wide';   // w < 1280 → 'narrow'
```

`SIDE_BY_SIDE_MIN_WIDTH_PX`, `SIDE_BY_SIDE_MIN_ASPECT`, `WIDE_MIN_WIDTH_PX` and `isWide` are removed. `layout.ts` sets `<html data-layout>` to the mode and `data-console` to `narrow` / `wide` on the console layout (removed on the phone layout), and stops setting `data-wide`. `Viewport` is `{ width; height; mode; console: 'narrow' | 'wide' | null }`.

### 7.4 Placing the sections (`src/ui/modes.ts`, `src/ui/panel.ts`)

```ts
export type BlockId = 'port' | 'wheel' | 'engine' | 'starboard' | 'harbour' | 'sails'; // re-exported from console.ts
export type DrawerId = 'exercises' | 'learn' | 'lines' | 'harbour' | 'conditions' | 'place' | 'status';
export type ConsolePlace = { block: BlockId } | { drawer: DrawerId } | { replacedBy: BlockId } | null; // replacedBy: from M120, a block draws its own controls for this section
export function consolePlace(id: SectionId, ropes: RopesMode): ConsolePlace;
```

| Section | `consolePlace` in M119 |
|---|---|
| `autopilot` | `{ block: 'wheel' }` when `ropes === 'easy'`; `null` when `realistic` |
| `helm` | `{ block: 'wheel' }` when `ropes === 'realistic'`; `null` when `easy` |
| `engine` | `{ block: 'engine' }` |
| `dinghy` | `{ block: 'engine' }` (the dinghy has no engine) |
| `sails` | `{ block: 'sails' }` |
| `ropes` | `{ drawer: 'lines' }` |
| `harbour`, `anchor` | `{ drawer: 'harbour' }` |
| `conditions` | `{ drawer: 'conditions' }` |
| `exercises`, `learn`, `place`, `status` | `{ drawer: <same name> }` |
| `mode`, `settings` | `null` (not placed; the chip row's mode chip and gear open their cards as on today's computer layout) |

`sectionAvailable(id, state, layout)` keeps its rules, with `'console'` where it said `'side'` or `'wide'`: a section placed in a block shows there only while available (an unavailable section leaves its block `hidden`). `panel.ts`'s `place()` on the console layout moves each built section element into `console.slot(block)` or into the menu's drawer body for its drawer, in the order of `MODE_LAYOUTS[mode].order`; on the phone layout it does what it does today. A section inside a block or a drawer is always open (`setOpen(true)`), and its fold header is hidden by CSS (`.console-slot .section-toggle, .console-drawer .section-toggle { display: none }`). The "?" explain button stays.

**No testid twice.** On the console layout a section whose place is `null` or `{ replacedBy }` has its `.panel-section` element taken out of the document (`element.remove()`; `built` keeps it) and put back when the layout becomes the phone's, so a console block can reuse the old testids (section 4). For `mode` and `settings` this is the empty section shell: their content moves into the chip cards as today. A drawer or block that holds two sections orders them by `MODE_LAYOUTS[mode].order`. **An empty block** (none of its sections available, or none placed) is `hidden`, title included; the band's flex closes the gap. The block's title is that of its first placed section. Inside a block or drawer each section's `.section-toggle` is hidden and the section is open; its "?" explain button moves into the block's title row (drawer: stays in the section).

`panel.showSection(id)` on the console layout: if `consolePlace` gives a drawer, `menu.open(drawer)` and scroll the section into view inside the drawer; if it gives a block or `{ replacedBy }`, do nothing (the block is always visible). `openHarbourFirst` does nothing on the console. A Learn entry, a rope tap on the boat and a link that opens a section today open the drawer the same way.

### 7.5 The console (`src/ui/console.ts`)

`createConsole(view, store, layout): ConsoleView` appends to `view`:

```html
<section class="console" data-testid="console" aria-label="{console.label}">
  <div class="console-band">
    <div class="console-block console-slot" data-testid="console-block-port" data-block="port" hidden></div>
    <div class="console-block console-slot" data-testid="console-block-wheel" data-block="wheel"></div>
    <div class="console-block console-slot" data-testid="console-block-engine" data-block="engine"></div>
    <div class="console-block console-sails console-slot" data-testid="console-block-sails" data-block="sails"></div>
    <div class="console-block console-slot" data-testid="console-block-starboard" data-block="starboard" hidden></div>
    <div class="console-block console-slot" data-testid="console-block-harbour" data-block="harbour" hidden></div>
  </div>
</section>
```

- `.console` is `position: absolute; left: 0; right: 0; bottom: 0`, `hidden` on the phone layout. The band is `height: var(--console-h)`, padding 12 px, `display: flex; gap: 8px`, background `--console-band` with `backdrop-filter: blur(8px)` and a 1 px top border `--console-edge`. `--console-h` is 240 px, and 208 px under `@media (max-height: 719px)`.
- **In M119 the sails slot is a block inside the band**, after the engine block (the HTML above); M120 moves it out of the band to become the strip (8.4). Slots `port`, `starboard` and `harbour` stay `hidden` until M121 and M122.
- Block widths in M119: `wheel` 320 px, `engine` 240 px, `sails` `flex: 1 1 280px`; on the narrow console `wheel` 260 px, `engine` 200 px. A block's content scrolls vertically inside it (`overflow-y: auto`) if taller.
- Each block gets a title (2.3) from its section's title (`SECTION_TITLES`), in a `div.console-title`.
- **The old controls in the new look.** The section bodies placed in M119 are today's controls. Inside `.console-slot` the light tokens are redefined so they read on the dark block: `--surface: transparent; --bg: transparent; --text: var(--console-text); --muted: var(--console-muted); --line: var(--console-edge); --accent: var(--console-accent); --accent-soft: rgb(79 179 232 / 0.18)`. Any colour in those controls that is not a token and fails the contrast audit (7.12, check 9) gets a console rule in `style.css`.
- **Do not use `--view-bottom-inset`** on the console: the view's height is `calc(100% - var(--view-bottom-inset))` (`style.css`, the phone's sheet), and the view must stay full height. A new `--console-inset` is `var(--console-h)` under `html[data-layout='console']` and 0 otherwise; the mini-map, the chip row and the exercise stack add it to their `bottom` (`calc(var(--view-bottom-inset, 0px) + var(--console-inset, 0px) + 8px)`), so they stand above the band. `top()` returns the smallest top of `.console-band` and of `.console-sails` when that one is outside the band (from M120).
- **Built once, on every layout.** `app.ts` creates the console, the menu and (M122) the widget at start whatever the layout, with `hidden` on the phone layout, and toggles `hidden` on every layout change (the resize check goes both ways). `window.__sailPanel` is set at start on every layout.

### 7.6 The menu and the drawer (`src/ui/consoleMenu.ts`)

```ts
export interface MenuItem { id: DrawerId; label: string; sections: SectionId[]; shown: () => boolean }
export function createMenu(view: HTMLElement, store: Store, items: MenuItem[]): ConsoleMenu;
```

- `nav.console-menu` (`data-testid="console-menu"`), top right as 2.2 says, look of 2.3 (the mockup's menu). One `button.console-menu-item` per item (`data-testid="menu-<id>"`, `aria-pressed`, `aria-controls="console-drawer"`), in the order exercises, learn, lines, harbour, conditions, place, status. An item is `hidden` while `shown()` is false; `shown` is "some section of `sections` is available" (`sectionAvailable(…, 'console')`).
- `aside.console-drawer#console-drawer` (`data-testid="drawer"`, `data-drawer="<id>"` while open, `hidden` while closed, `role="dialog"`, `aria-modal="false"`, `aria-labelledby="drawer-title"`): position and size as 2.2; a header with `h2#drawer-title` (`data-testid="drawer-title"`, the item's label) and a × button (`data-testid="drawer-close"`, `aria-label` `{drawer.close}`); a body `div.drawer-body` (`data-testid="drawer-body"`, `overflow-y: auto`) that holds the item's section elements. The drawer keeps the light look (2.3).
- A click on an item opens its drawer, or closes it if it is the open one. Another item replaces it. × and Escape close it (Escape only when the focus is not in a text field, `isTypingTarget`). Opening moves the focus to the drawer's title; closing returns it to the item. A tap on the 3D view does **not** close it (the drawer is not modal, as the chip cards are not). Opening a chip card (mode, settings, camera, time) closes the drawer, and opening the drawer closes an open chip card (`createChipCard`'s "one overlay at a time" applies to the drawer too: the drawer registers with it).
- Each item's `sections` are the sections whose `consolePlace` is that drawer; its `label` is `t('menu.<id>')` (a language change reloads the page, so no re-render is needed). The drawer registers with the chip cards' one-overlay rule the way the cards do (`grep -n "overlay" src/ui/chipCard.ts` for the function): a click in the mode card that chooses Exercise closes the card, then the drawer opens.
- When the mode becomes Exercise, the Exercises drawer opens through `panel.showSection('exercises')`, which `panel.ts` already calls there. A drawer whose item becomes hidden closes. Nothing else opens a drawer by itself.
- **Everything at the top right moves left of the menu**: the alert-centre chips and the alert stack keep their present order and gap, with their right edge at `8 + 128 + 8` px from the window's right. The time widget's element moves (on the console layout, by `app.ts`) from `.top-right` to right after the instrument strip in the top-left group, 8 px gap, and back on the phone layout (2.2).
- The drawer's height is CSS: `max-height: calc(100% - var(--console-h) - 40px - 24px)` (the band, the sails strip from M120, the gaps).

### 7.7 Camera framing (`src/app/app.ts`, `resize`)

On the console layout the inset passed to `view.resize` is `viewBox.bottom − Math.min(chipRow.top, barTop, console.top())` and the top inset is `topClearance(top)` as today; `stacked` is `false`. The ResizeObserver also observes the console's root, so a change of `--console-h` or of the sails strip re-frames. No number in `sceneConfig.ts` changes.

### 7.8 Setup files and device settings

`DeviceSettings` loses `columns` and `layout`. `readSetupFile` still accepts a file that has them and ignores them (no problem reported); `makeSetupFile` no longer writes them. `COLUMNS_KEY` and `LAYOUT_KEY` move (same strings) from the deleted `columnWidths.ts` and `sectionLayout.ts` into `deviceSettings.ts` as `OLD_DEVICE_KEYS`; `readDeviceSettings` ignores them and `app.ts` removes both from `localStorage` once at start (`try`/`catch`). `makeSetupFile`'s `device` argument loses `columns` and `layout` (its callers in `settingsMenu.ts` follow). `panel.ts`'s arrangement read and write (`readArrangement` and its save) go. The time bar's fold key stays.

### 7.9 Browser-check helpers (`scripts/ui.mjs`, types in `scripts/ui.d.mts`)

| Helper | On the console layout from M119 |
|---|---|
| `isStacked(page)` | unchanged |
| `isConsole(page)` (new) | `document.documentElement.dataset.layout === 'console'` |
| `isWide(page)` | removed from `ui.mjs`; `shots-m38.mjs` uses `isConsole` (line 65 means the width: `dataset.console === 'wide'`), and `shots-m29.mjs`'s own copy (line 45) becomes the same test; m39 is deleted |
| `showSection(page, id)` | reads `window.__sailPanel.placeOf(id)` (a debug hook `panel.ts` sets on the console layout; it returns `consolePlace(id, ropes)`). `{ drawer }`: click `menu-<drawer>` unless `drawer` already has `data-drawer="<drawer>"`, wait for `section-<id>` visible, scroll it into view. `{ block }`: scroll it into view. `null`: open its card (`mode` → `setMode`'s card, `settings` → `openSettings`) |
| `sectionShown(page, id)` | visible (in an open drawer or a block) and not hidden |
| `eachSection(page, fn)` | for each section in the order of `sectionIds`, `showSection` then `fn` |
| `sectionIds(page)` | the visible `[data-section]` in the blocks, then those of every shown menu item's drawer (opening each in turn), in menu order |
| `columnSections`, `moveSectionBy` | removed with their only users (m39, m54) |
| `openSettings`, `setMode`, `showTab`, `setSheet`, `dragHandle` | unchanged (the chip row keeps the mode chip and the gear; the sheet helpers act only on the phone) |

`window.__sailPanel = { placeOf }` is set on every console page (read-only, like `__sailMap`), so the helpers need no `debug=1`.

### 7.10 Strings and registry

New `ui.json` keys (English): `console.label` "Boat controls", `menu.label` "Menu", `menu.exercises` "Exercises", `menu.learn` "Learn", `menu.lines` "Lines", `menu.harbour` "Harbour gear", `menu.conditions` "Conditions", `menu.place` "Place", `menu.status` "Status", `drawer.close` "Close". `layout.side` is renamed `layout.console` "Console" (debug overlay). The settings strings of the removed "Your setup" rows for columns and arrangement go from every language. No registry id.

### 7.11 Tests

1. `tests/layoutMode.test.ts` (rewritten): `layoutModeFor` gives `stacked` for 390×844, 844×390, 699×600, 799×600, 800×559, 768×1024, 800×1001, 0×0, NaN×NaN; `console` for 800×560, 800×1000 (exactly 0.8), 820×1000, 904×968, 904×840, 1024×768, 1440×900, 1920×1080. `consoleWidthOf(1279)` is `narrow`, `(1280)` `wide`.
2. `tests/modes.test.ts`: `mode` and `settings` are available only on `'stacked'` (false on `'console'` and the default); `consolePlace` gives the table of 7.4 for both ropes modes (`autopilot` → `null` in Realistic, `helm` → `null` in Easy).
3. `tests/consoleLayout.test.ts`: every `SECTION_ID` has a `consolePlace` defined for both ropes modes; every drawer id of `DrawerId` is the place of at least one section; no section is placed in a block and a drawer at once.
4. `tests/setupFile.test.ts`: a setup file with `columns` and `layout` (copy one written by today's `makeSetupFile`) reads with no problem; a new file has neither key; the round trip keeps the time-bar fold.

### 7.12 Browser checks (`scripts/shots-m119.mjs`, new group `m119`, test clock)

**Budget**: group `m119` replaces groups `m39` (141 s) and `m54` (161 s), which are deleted with their files (their columns, grips and movable sections no longer exist); 76 groups. Expected time 80 s; add `"m119": <measured>` to `.github/ci-times.json`. `shots.mjs` imports `liveM119Checks` and `M119_SCENES`.

**Scenes** (desktop 1440×900 and foldable 820×1000 only, `waitMs: 2500`; `E = '?wd=60&ws=12&ms=40&held=1&sea=flat'`):

| name | query | shows |
|---|---|---|
| `console-easy` | `E` | the full-width view; the band with the wheel (Steering), engine and sails blocks; the menu |
| `console-realistic` | `E&mode=realistic` | the wheel block holding the Helm station |
| `console-drawer` | `E` then `menu-lines` clicked (a scene `act`) | the Lines drawer open over the right of the view |

**Live checks** (desktop unless named; `openPage(viewport, label, query, { testClock: true })`):

1. `E`: `data-layout` is `console`, `data-console` is `wide`; `console` is visible, its bottom equals the window's height, `.console-band`'s height is 240; `[data-testid="sheet"]` is hidden; the view is 1,440 px wide; `console-block-wheel` contains `autopilot-heading`, `console-block-engine` contains `engine-startstop`, the sails block contains `trim-row-main`; nothing matches `[data-testid^="column-chip-"]`, `[data-testid^="column-grip-"]`, `[data-testid="second-column"]`, `[data-testid="layout-menu"]` or `[data-testid^="section-grip-"]`.
2. Menu: the visible items are, in order, `menu-learn`, `menu-lines`, `menu-harbour`, `menu-conditions`, `menu-place`, `menu-status` (no `menu-exercises` outside Exercise mode). Click `menu-lines`: `drawer` visible with `data-drawer="lines"` and `ropes-easy` inside `drawer-body`; click `menu-learn`: `data-drawer="learn"`; press Escape: `drawer` hidden; click `menu-status`, then `drawer-close`: hidden.
3. `showSection(page, 'ropes')` opens the Lines drawer and `sectionShown(page, 'ropes')` is true; `showSection(page, 'engine')` leaves the drawer as it was and the engine block in view.
4. Framing: with `debug=1`, `__sailDebug.project(0, -2.4, 0)` (the keel) and `project(-7.85, 2.2, 0)` (the transom) are above the top of `console` and of the chip row.
5. Mode chip: `setMode(page, 'exercise')` opens the Exercises drawer (`data-drawer="exercises"`) with the exercise list.
6. Resize (one page): 1440×900 console, 820×1000 console with `data-console="narrow"`, 844×390 `stacked` with the sheet visible and `console` hidden, back to 1440×900: console again, the drawer closed, no console errors.
7. Tablet with a finger: a context with `hasTouch: true` at 1024×768, `E`: `locator.tap()` on `menu-learn` opens the drawer; `tap()` on `autopilot-heading` turns the autopilot on (`waitForLink` shows `ap=`).
8. Phone 390×844 `E`: `console` and `console-menu` are hidden, the sheet and its tabs work as before (`showTab(page, 'controls')` shows the Ropes section).
9. `auditPage(page, 'm119 a11y console')` on `E` at 1440×900 with the Lines drawer open: no new findings (contrast of the old controls on the dark blocks, 7.5).
10. Dinghy `?boat=dinghy&wd=60&ws=8&ms=40&held=1&sea=flat`: `console-block-engine` contains `section-dinghy`; `menu-harbour` and `menu-place` are hidden.

### 7.13 Older checks and tests this milestone changes

- `scripts/shots.mjs`: `VIEWPORTS` layouts become `foldable-820x1000` `console`, `desktop-1440x900` `console`, `phone-landscape-844x390` `stacked` (its `only:` list stays; those scenes now show the phone layout); its lines 966 and 1098 need no change. `scripts/ci-plan.mjs` (its group list near line 344) drops `m39` and `m54`. The resize test in `liveGeneralChecks` steps 390×844 stacked, 844×390 stacked, 699×600 stacked, 800×600 console, 800×1001 stacked, 820×1000 console, 904×840 console, 1440×900 console.
- **Checks that expected the side layout at 844 × 390** (now the phone layout): `scripts/shots-m26.mjs` (lines 228–262: the landscape page now expects `stacked` and the sheet), `scripts/shots-m35.mjs` (line 153: the 34 px headers of a short side window: **delete** that check; the rule went with the side layout), `scripts/shots-m36.mjs` (lines 179–183: landscape starts as the phone does), `scripts/shots-m29.mjs` (line 123).
- **Checks on the side or wide computer layout** (now the console): `shots-m25.mjs` (149–310, the settings card above the chip row: still true), `shots-m28.mjs` (209–210, tablet 1024×768: console), `shots-m29.mjs` (`isWide` → `isConsole`), `shots-m37.mjs` (267–291: the step bar above the chips: still true, the chips are above the band), `shots-m38.mjs` (338–382: "a window below 1,280 px has the mode chip and the gear" stays true on the narrow console; the mode chip reads "Easy" on the narrow console and "Mode: Easy" on the wide one), `shots-m52.mjs` (the `side` / `wide` names become `narrow` / `wide`; "the three chips are visible" stays), `shots-m56.mjs` (the setup-file checks: drop the column and arrangement parts, 13 lines), `shots-m59.mjs` (1 line), `shots-m79.mjs` (line 307, `viewports[1]`), `shots-m87.mjs` (line 169, 1024×768), `shots-m93.mjs` (300–313). Every other `isStacked(...)` false branch (m4c, m5, m9, m66, m67, m68) was written for the side layout and holds on the console when it reaches the panel only through `scripts/ui.mjs`: `grep -n "panel-body\|second-column\|\.panel\b\|section-toggle" scripts/shots-m*.mjs` and move each direct use to a helper.
- `tests/docs.test.ts`: CODE_MAP lists the new files and none of the deleted ones. `tests/ciPlan.test.ts` keeps its cap of 77 (76 groups now).

**PR line:** `CI groups: all` (the layout shell changes).

### 7.14 Settled in planning

1. Today's `wide` and `side` layouts are not kept anywhere, not even behind a setting: one computer layout.
2. The exercise step bar stays on the console in M119–M122 as it is today (between the mini-map and the chips, or above the chips); M123 removes it there.
3. The chip row keeps the mode chip, the camera chip, the sound chip and the gear in today's order.
4. The `ropes` section stays one section in M119 (the Lines drawer); M121 splits it.
5. The Realistic Helm station in the wheel block keeps its own engine lever, thrusters and windlass remote in M119; M120 removes them from there (the engine block has them).

6. `sectionShown(page, id)` on the console: the section's element is in the document, not `hidden`, and inside a block or the open drawer (no `data-open` test there: placed sections are always open). `sectionIds` leaves the last drawer it opened open. A section whose place is `{ replacedBy }` has no `section-<id>` on the console: `showSection` scrolls the replacing block into view and `sectionShown` returns true when that block is shown (M120 on).
7. The live check 7's `E` starts with the autopilot in Standby (no `ap` key), so the tap turns it on.

### 7.15 Done when / not in this milestone

PR: `Closes #296`. Done when the console layout follows 7.3 at every size, the view is full width, every section is reachable in a block or a drawer, the old columns, grips and movable sections are gone, the phone layout is unchanged, every test of 7.11 and check of 7.12 passes, `npm run check` passes and the CI run with `CI groups: all` is green.

Not in this milestone: the drawn wheel and engine lever, the sails strip and key caps (M120); the line blocks (M121); the harbour block and the conditions widget (M122); exercise outlines (M123); the two choices (M124).

## 8. M120: Wheel and engine

**Independent review: not needed** (new drawings of controls that dispatch the existing actions; no model, store or URL change).

### 8.1 Files

- **Add** `src/ui/consoleWheel.ts`, `src/ui/consoleEngine.ts`, `scripts/shots-m120.mjs`.
- **Change** `src/ui/modes.ts` (`consolePlace`: `autopilot` and `helm` → `{ replacedBy: 'wheel' }`, `engine` → `{ replacedBy: 'engine' }`, `sails` → `{ drawer: 'sails' }`; `DrawerId` gains `'sails'`), `src/ui/consoleMenu.ts` (item `sails` after `lines`), `src/ui/console.ts` (the sails strip moves out of the band), `src/ui/keyboard.ts`, `src/ui/keyHelp.ts`, `src/ui/thrusterPanel.ts` (8.6), `src/style.css`, `content/lang/*/ui.json`, `docs/CODE_MAP.md`.

### 8.2 The wheel block (`src/ui/consoleWheel.ts`)

```ts
export function createConsoleWheel(store: Store): HTMLElement; // the content of slot 'wheel'
export const WHEEL_DEG_PER_RUDDER_DEG: () => number;          // (wheelTurnsLockToLock × 360) / (ctl_rudder.max − ctl_rudder.min), read from the boat at call time
```

On the Hanse 508 `WHEEL_DEG_PER_RUDDER_DEG()` is 2.5 × 360 / 70 = 12.857.

- **The wheel**: an inline SVG 132 × 132 px (narrow console 112 × 112) as the mockup draws it: rim 7 px `rgb(255 255 255 / 0.55)`, three spokes, hub, and a 14 px top mark in `--console-accent` (the king spoke, which is at the top when the rudder is amidships). Drawn turned by `ctl_rudder × WHEEL_DEG_PER_RUDDER_DEG()` degrees, clockwise for a positive rudder (`boat.steering.rudderSign`).
- The SVG's wrapper is `div.console-wheel` with `role="slider"`, `tabindex="0"`, `aria-label` `{wheel.label}`, `aria-valuemin` −35, `aria-valuemax` 35, `aria-valuenow` the rudder angle rounded, `aria-valuetext` from `{wheel.valueText}` ("Rudder {deg}° to {side}" / "Rudder amidships"), `data-testid="wheel-drag"`.
- **Drag** (pointer events, mouse, pen and finger alike, `touch-action: none`, `setPointerCapture`): the pointer's angle round the wheel's centre, `φ = atan2(dx, −dy)` in degrees; on each move the change `Δφ` (wrapped to −180…180) turns the rudder by `Δφ / WHEEL_DEG_PER_RUDDER_DEG()`, clamped to the control's min and max, dispatched as `{ type: 'setControls', values: { ctl_rudder } }` at most once per animation frame. A drag that starts within 18 px of the centre does nothing (no angle there).
- **Mouse wheel** over the wheel: each notch (`deltaY` sign) moves the rudder by `state.settings.step` degrees, scrolling down turns to starboard; `preventDefault` so the page does not scroll.
- **Keys** while the wheel has the focus: ← → as `keyAction` already does (it is the page-wide key; nothing new). Home centres the rudder (`ctl_rudder: 0`).
- **Under the wheel**: the rudder's angle as text, 20 px (`data-testid="wheel-angle"`, "0°", "12° stbd", "8° port", `{wheel.port}` / `{wheel.stbd}`) and today's range input `#control-ctl_rudder` restyled as a thin bar 6 px tall in the console look, kept so the older checks that set it keep working (`grep -n "control-ctl_rudder" scripts/shots-m*.mjs`).
- **Autopilot** (when the boat has it): the Standby / Heading / Wind segmented buttons (today's strings `autopilot.off`, `autopilot.heading`, `autopilot.wind`; the mockup's "Auto" is Heading) and −10 −1 +1 +10 and Tack, built by `createAutopilotPanel(store, { heading: false })` into the block (no second title) (its testids `autopilot-*` unchanged), restyled with `.console-button`. While the autopilot is not in Standby the wheel drawing follows the rudder the autopilot sets, does not take a drag (`cursor: not-allowed`, `aria-disabled="true"`), and a line under it says `{wheel.autoNote}`.
- **Realistic ropes** (the captain may be elsewhere): the block's root has `data-testid="helm-station"`. While `realistic.station !== 'helm'` or `realistic.walk !== null`, a layer over the block (`data-testid="helm-away"`, background `rgb(10 24 38 / 0.6)`, the mockup's "walk" layer) shows `{real.helm.away}` with the station's name, or the walk text (`walkText`) while walking, and a button `data-testid="helm-go"` (`{real.helm.go}`, today's string) dispatching `{ type: 'realistic', action: { type: 'station', station: 'helm' } }`. The wheel and the autopilot sit in `div[data-testid="helm-controls"]`, `inert` while the layer shows. The Helm station's engine lever, thrusters and windlass remote are not in this block (they are in the engine and harbour blocks).
- **The dinghy**: the block's title is `{control.tiller}` (today's string). In place of the wheel an SVG 160 × 120 px of the tiller seen from above: the transom line, the rudder stock and the tiller bar drawn at `tillerAngleDeg(rudder)` (`src/model/dinghy.ts`). Drag sideways: the rudder changes by `−dx / 4` degrees per px (the tiller moves with the pointer, so the rudder goes the other way, PHASE_DINGHY_SPEC 2), clamped. Same `role="slider"`, `data-testid="wheel-drag"`, mouse wheel and the range input. The dinghy's capsize line stays above it (`createSteeringPanel` puts it there today: keep it).

### 8.3 The engine block (`src/ui/consoleEngine.ts`)

```ts
export function createConsoleEngine(store: Store): HTMLElement; // the content of slot 'engine'
```

Shown on a boat with `hasFeature('engine')`; on the dinghy the slot holds the `dinghy` section as in M119.

- **Lever**: today's range input, `id="engine-lever"`, `data-testid="engine-lever"`, min −100 max 100 step `settings.step`, made vertical (`writing-mode: vertical-lr; direction: rtl`), 140 px tall (narrow console 116 px), with a drawn track (8 px, `rgb(255 255 255 / 0.12)`), the neutral band shaded across the middle (the `gearOf` neutral range, read from `src/model/engine.ts`), a thumb 32 × 16 px radius 6 px `--console-text`, and the words `{engine.ahead}` at the top and `{engine.astern}` at the bottom in 9 px muted capitals. Dragging it, the arrow keys while it has the focus, and the mouse wheel over it (one `settings.step` per notch, up = ahead) dispatch `{ type: 'engine', command: { leverPct } }`. `engine-lever-value` shows `leverText` under the lever.
- **Start/Stop**: `createStartStopButton(store)` (testid `engine-startstop`), a `.console-button` 44 px tall; while running the block title gets a dot and `{engine.on}` in `--console-ok`.
- **rpm**: `engine-rpm` as the block's main number (20 px), unit "rpm", and `engine-status` under it (today's text). `engine-tach` is the wrapper of the number and the unit (no dial). `engine-fouled` as today, in `--console-warn`.
- **Thrusters** (owner, question 4: always there and always working, at sea too): on a boat that has any (`hasAnyThruster()`), `createThrusterPair(store, 'section')` under the rpm (testids `thruster-bow-port`, `thruster-bow-starboard`, `thruster-stern-*` unchanged), restyled as two `.console-button` halves per thruster with the key caps A / D (bow) and J / L (stern).

### 8.4 The sails strip (`src/ui/console.ts`) and the Sails drawer

- The strip `div.console-sails` (`data-testid="console-block-sails"`) leaves the band: `position: absolute`, `bottom: var(--console-h)`, its left edge at the wheel block's left and its width that of the wheel and engine blocks with the gap between them (set in JS from their boxes on every resize), 40 px tall, background `--console-block`, border `--console-edge` on three sides, radius 12 px at the top only.
- It holds one item per sail the Sails section shows a trim row for (the same rule as `trim-row-<sail>` there: `main`, `jib`, and `gennaker` while it flies; the dinghy: `main`): `span[data-testid="sails-strip-<sail>"]` with an 8 px dot (`--console-ok` Good, `--console-warn` Luffing, Stalled or torn, `--console-muted` otherwise) and `{name}: {word}`: the name `t('trim.<sail>')` ("Mainsail", "Jib"; the gennaker's name key as its trim row uses), the word exactly as that sail's trim row shows it (read it through the same function `sailsPanel.ts` uses; `trim.state.*`, or `gennaker.trim.*` for the gennaker), 14 px weight 600. Each item is a `button` that opens the sail's Learn entry (`openLearnEntry` with the sail's registry id, `sail_main`, `sail_jib`, `sail_gennaker`). At the strip's right end a button `data-testid="sails-strip-more"` (`{sails.more}`) opens the Sails drawer.
- Sail wear and Repair stay in the Status section (`createSailWear`, `statusPanel.ts`), unchanged; the strip has no Repair button.
- The `sails` section (trim rows and the gennaker block) goes into the new Sails drawer (`menu-sails`, `{menu.sails}`), unchanged; its testids stay there.

### 8.5 Band widths from M120

From M120 the band is a CSS grid (it replaces M119's flex) with five named columns, always in this order: `grid-template-columns: [port] minmax(200px, 1fr) [wheel] 300px [engine] 220px [starboard] minmax(200px, 1fr) [harbour] 0px` (wide console) and `[port] minmax(160px, 1fr) [wheel] 220px [engine] 160px [starboard] minmax(160px, 1fr) [harbour] 0px` (narrow), gap 8 px. Each slot has `grid-column: <its name>`, so a hidden slot leaves its column empty rather than moving the others. Until M121 the port and starboard columns are empty (the wheel and engine stand in the middle); M122 gives the harbour column 40 px. On the dinghy the engine column holds the Balance section at 260 px (narrow 220 px). Inside the wheel block: the wheel on the left, and on the right, stacked, the angle text, the range bar, the mode buttons and the turn buttons (−10 −1 +1 +10, Tack), with the auto note under them; inside the engine block the mockup's two columns (lever left; rpm, status, Start/Stop and thrusters right). What does not fit the block's height scrolls inside it (`overflow-y: auto`).

### 8.6 Keys and key caps

- Key caps (2.3) after: the autopilot buttons (P on Standby/Auto), the wheel's angle text (← →), the main sheet and jib sheet rows (W S, R F: M121), the thruster buttons (A D, J L).
- The thruster keys A, D, J, L work on the console layout in every mode on a boat with thrusters (`thrusterKeysOn` returns true when `layoutModeFor(window.innerWidth, window.innerHeight) === 'console'`; the phone keeps today's rule). `keyHelp.ts` lists them on the console.

### 8.7 Strings

`wheel.label` "Wheel", `wheel.title` "Wheel", `engine.title` "Engine", `wheel.valueText` "Rudder {deg}° to {side}", `wheel.amidships` "Rudder amidships", `wheel.port` "port", `wheel.stbd` "stbd", `wheel.autoNote` "The autopilot is steering. Press Standby to steer.", `engine.on` "on", `sails.more` "More", `menu.sails` "Sails". Reused: `control.tiller`, `real.helm.away`, `real.helm.go`, `engine.ahead`, `engine.astern`, `trim.*`.

### 8.8 Tests

1. `tests/consoleLayout.test.ts`: `WHEEL_DEG_PER_RUDDER_DEG()` is 12.857 ± 0.001 on the Hanse; the drag formula as a pure function `rudderAfterDrag(rudder: number, fromDeg: number, toDeg: number): number` exported from `consoleWheel.ts`: (0, 0, 90) → 7.0 ± 0.01; (0, 170, −170) → 1.556 ± 0.01 (the wrap); (34, 0, 90) → 35 (the clamp); (0, 0, −90) → −7.0 ± 0.01.
2. `tests/modes.test.ts`: `consolePlace` of `autopilot`, `helm` → `{ replacedBy: 'wheel' }`, `engine` → `{ replacedBy: 'engine' }`, `sails` → `{ drawer: 'sails' }`.

### 8.9 Browser checks (`scripts/shots-m120.mjs`, joins group `m119`, test clock)

**Budget**: `GROUP_ALIASES` gets `m120: 'm119'`; `m119` becomes `members(['m119', …], ['m120', () => liveM120Checks(live)])`. Expected addition 45 s (125 s in all): if the measured time is over 120 s, name `m119` in `.github/ci-budget.json` ("the console's shell and its first blocks"). Nothing becomes redundant.

**Scenes** (desktop and foldable, `E` of 7.12): `wheel-engine` (`E`), `wheel-realistic-away` (`E&mode=realistic&st=starboard`: the away layer), `tiller` (`?boat=dinghy&wd=60&ws=8&ms=40&held=1&sea=flat`).

**Live checks** (desktop unless named):

Queries: `S = '?wd=60&ws=12&ms=40&sea=flat'` (sailing, not held: `held=1` freezes the boat and disables the autopilot's mode buttons, so checks 3, 5 and 7 use `S`).

1. Drag the wheel with the mouse: from the wheel's top point to its right point round the rim (a quarter turn clockwise, 12 steps): `waitForLink` shows `rd=7` (the rudder key of today's links, ± 1) and `wheel-angle` reads "7° stbd" (± 1).
2. Tablet 1024×768 with `hasTouch`: the same quarter turn with touch events (`page.touchscreen` is single-point; dispatch `pointerdown` / `pointermove` / `pointerup` with `pointerType: 'touch'` on `wheel-drag`): the rudder moves by the same amount.
3. Autopilot (`S`): click `autopilot-heading`: `wheel-drag` has `aria-disabled="true"`; a drag leaves the rudder unchanged; click `autopilot-off`: the drag works again.
4. Engine: click `engine-startstop`; focus `engine-lever` and press ↑ 10 times: `engine-lever-value` reads "Ahead" with a number; `engine-rpm` rises above idle within 5 s of app time.
5. Thrusters at sea: `S` (open water), hold `thruster-bow-starboard` for 2 s (`holdThruster(page, 'bow', 1, 2000)`): the heading changes by more than 1°. Press and hold D for 2 s: the same.
6. Realistic `E&mode=realistic&st=starboard`: `helm-away` is visible; click `helm-go`: the walk runs (`waitForWalk`), then `helm-away` is hidden and `wheel-drag` works.
7. Sails strip: `?wd=60&ws=12&ms=95&sea=flat` (main eased far): `sails-strip-main` reads "Mainsail: Luffing"; `sails-strip-more` opens the drawer `data-drawer="sails"` with `trim-row-main` inside.
8. Dinghy: `tiller` scene query: drag `wheel-drag` 40 px to the left: the rudder goes to starboard by 10° (`rd=10`, ± 1).

### 8.10 Older checks and tests this milestone changes

- `grep -n "engine-tach\|engine-lever-drawing\|engine-helm" scripts/shots-m*.mjs`: on the console the Helm station's lever drawing is gone; a check that used `engine-lever-drawing` or `engine-helm` at a console size uses `engine-lever` (the phone keeps both).
- `grep -n "thruster-helm\|windlass-helm" scripts/shots-m*.mjs`: those exist only on the phone now; a check at a console size uses `thruster-bow-*` / the harbour drawer's windlass.
- `grep -n "trim-row-\|trim-chip-\|repair-sails\|gennaker-" scripts/shots-m*.mjs`: at a console size those are inside the Sails drawer; checks reach them through `showSection(page, 'sails')`, which opens it (no change where they already call it).
- Group `m119`'s time in `.github/ci-times.json`.

**PR line:** `CI groups: all` (the steering, engine and sails controls every group reaches move).

### 8.10a Settled in planning

1. **Who builds the blocks.** `app.ts` builds `createConsoleWheel` and `createConsoleEngine` once, into slots `wheel` and `engine`, at start (7.5: built on every layout, hidden on the phone). Each block redraws itself from the store (it subscribes); none is rebuilt on a ropes-mode change. Titles: the wheel block `{wheel.title}` "Wheel" (dinghy `{control.tiller}`), the engine block `{engine.title}` "Engine" (dinghy: the Balance section's own title).
2. **Shown when**: the wheel block always; the engine block on a boat with `hasFeature('engine')`, in both ropes modes (the `engine` section's Easy-only rule does not apply to it; `sectionAvailable` is not asked for a `replacedBy` section). On the dinghy the engine slot holds the `dinghy` section (`{ block: 'engine' }`, as M119).
3. **`consolePlace` in M120** for both ropes modes: `autopilot` and `helm` → `{ replacedBy: 'wheel' }`; `engine` → `{ replacedBy: 'engine' }`. The removed `helm` section takes the Helm station's handle slot (`real.helm.slot`) with it on the console: the handle is put down at the winches (M121's tools have the handle bar).
4. **Not reused**: `createHelmStation` and `createEnginePanel` are not mounted on the console; the new blocks build their own parts and reuse the testids listed in 8.2 and 8.3 (the old sections are out of the document there). `createAutopilotPanel`, `createStartStopButton` and `createThrusterPair` are reused (they hold no ids).
5. **The autopilot and the wheel**: while the autopilot steers, `wheel-drag`, the range input `#control-ctl_rudder`, the mouse wheel and Home are all inert; the ← → keys keep `keyAction`'s rule (they turn the autopilot's course). `autopilot.tookWheel` is then not reachable from the console's wheel; that is wanted.
6. **The dinghy**: `WHEEL_DEG_PER_RUDDER_DEG()` is only used on a boat with `hasFeature('wheel')`; `aria-valuemin` / `aria-valuemax` are the `ctl_rudder` control's `min` / `max` from the boat. While capsized, `wheel-drag` and the range input are locked (`lockWhileCapsized`, `capsizePanel.ts`), and `createConsoleWheel` puts `createCapsizeLockedLine` above the tiller.
7. **No snapping**: the drag sets the exact rudder angle, rounded to 0.5°; only the buttons and keys move by `settings.step`.
8. **The lever's keys**: ↑ moves it towards Ahead, ↓ towards Astern, whatever the browser does with a vertical range input (handle `keydown` on it and `preventDefault`).
9. **Thruster keys** (8.6): `thrusterKeysOn(state, onConsole = false)`; the keyboard listener passes `document.documentElement.dataset.layout === 'console'`.
10. **The away layer** shows `helm-go` only while not walking to the helm; while walking it shows `walkText`.
11. **Older checks**: also `grep -n "section-autopilot\|section-helm\|engine-panel\|thrusters-block\|thrusters-status\|section-engine" scripts/shots-m*.mjs scripts/ui.mjs`: at a console size each becomes the block (`console-block-wheel`, `console-block-engine`); `holdThruster(page, …, 'section')` on the console uses the engine block's joysticks without `showSection`.

### 8.11 Done when / not in this milestone

PR: `Closes #297`. Done when the wheel, autopilot, engine, thrusters and the sails strip work by mouse, finger and keys as 8.2–8.6 say, on the Hanse in both ropes modes and on the dinghy, every test of 8.8 and check of 8.9 passes, `npm run check` passes and CI is green.

Not in this milestone: the line blocks (M121); the harbour block (M122); exercise outlines (M123).

## 9. M121: Port and starboard lines

**Independent review: required** (Realistic gestures and the walk on two stations at once; which line is shown on which side of the boat).

### 9.1 Files

- **Add** `src/ui/consoleLines.ts`, `tests/consoleLines.test.ts`, `scripts/shots-m121.mjs`.
- **Change** `src/ui/modes.ts` (`consolePlace('ropes')` → `{ replacedBy: 'port' }`; `DrawerId` loses `'lines'`), `src/ui/consoleMenu.ts` (no Lines item), `src/ui/console.ts` (slots `port` and `starboard` shown), `src/ui/realisticPanel.ts` (its parts exported for the blocks, 9.4), `src/ui/stationDrawing.ts` (the walk layer, 9.4), `scripts/ui.mjs` (`goToStation`, 9.7), `src/style.css`, `content/lang/*/ui.json`, `docs/CODE_MAP.md`.

### 9.2 Data

None. The side of each line comes from the boat file as it is: `cockpitHardware.clutchBanks[].side` (bank A starboard, bank B port), the JIB ROLL clutch's `z` (negative: port), and `cockpitHardware.winchLeads.leads[].station` (the gennaker sheets).

### 9.3 Which line is on which side (`src/ui/consoleLines.ts`, pure part)

```ts
export type Side = 'port' | 'starboard';
export function sidesOfEntry(entry: PanelEntry, data?: BoatData): Side[]; // the sides where the entry's own ropes are held by a clutch or led to a winch; [] if none
export function linesOfSide(side: Side, data?: BoatData, gennakerStage?: number): PanelEntry[]; // gennakerStage defaults to 0
```

- **An entry's own ropes** are its `selectId` and any of its `partIds` that a `cockpitHardware.winchLeads.leads[].ropeId` names (the two gennaker sheets). Other `partIds` are ropes the control moves with it but that are not worked there (the outhaul inside the in-mast furling, `ctl_main_furl`): they do not give a side. The JIB ROLL clutch is on port because its `z` is negative. A boat without `cockpitHardware.clutchBanks` (the dinghy) gives every entry `[]`.
- `linesOfSide` takes `panelEntries(data)` that have a `controlId` other than `ctl_rudder`, minus the gennaker rows not yet listed at `gennakerStage` (the Ropes section's rule, `ropesTab.ts`: `ctl_gennaker_sheet` and `ctl_gennaker_sock` from stage 4; move that table into `consoleLines.ts` and import it in `ropesTab.ts`) (lines without a control, such as the main halyard on this boat, are not in the console; Learn has them). An entry is on a side when `sidesOfEntry` includes it; an entry with no side goes to `port`.
- Order on a side: by the lowest clutch slot of that side's bank that holds the entry's rope, then the JIB ROLL clutch, then the winch leads by slot, then the entries with no side, in `panelEntries` order.
- **The Hanse 508** (test 9.6.1): port: topping lift (b2), main sheet (b4), vang (b5), jib furling (r1), gennaker sheet (g1), gennaker sock (no side); starboard: main sheet (a1), main furling (a2), jib sheet (a5), gennaker sheet (g2). The gennaker rows show only while the ropes list shows them today (the rigging stage; the same availability the Ropes section uses).
- **The dinghy**: everything on `port` (no clutches); the `starboard` slot stays hidden and the band's columns are `minmax(220px, 1fr) 300px 260px` (narrow: `minmax(180px, 1fr) 220px 220px`).

### 9.4 The line blocks

```ts
export function createConsoleLines(store: Store, side: Side, openEntry: (id: string) => void): HTMLElement; // the content of slot 'port' or 'starboard'
```

Block titles: Easy `{lines.port}` / `{lines.starboard}`; Realistic `{lines.port} · {lines.bank} B` and `{lines.starboard} · {lines.bank} A` (the bank's `key` upper-cased).

**Easy ropes.** One row per entry of `linesOfSide(side)` (`div.console-line`, `data-testid="line-row-<controlId>"`; the second row of an entry that is on both sides, the port one, has `data-testid="line-row-<controlId>-port"`). A row is 40 px tall: the line's name (`partInfo` name, 14 px weight 600, ellipsis), key caps for W S (main sheet) and R F (jib sheet), the value `{n} %` (16 px tabular), a − and a + `.console-button` (32 × 32 px; 44 × 44 on a touch device, `@media (pointer: coarse)`) with today's `aria-label`s, and a 4 px bar along the row's bottom showing the value (`--console-accent` fill). A click on the name selects the rope (`{ type: 'select', partId }`, as `rope-item` does) and the row gets `aria-pressed="true"` and a 1 px `--console-accent` border. − and + dispatch `setControls` by `settings.step`, held for repeat as the stepper does (`src/ui/stepper.ts`). The mouse wheel over a row moves it one step per notch (down = ease). Both rows of a two-sided entry show the same value and move together (one control). The block scrolls (`overflow-y: auto`) when its rows do not fit; the selected row is scrolled into view.

**Realistic ropes.** Each block holds `createStationDrawing(store, side, { onSelect })` (testid `station-drawing-port` / `-starboard`), as tall as the block's content area (the SVG's `height: 100%`, `width: auto`). Both drawings are always visible.

- **The walk.** While `realistic.station !== side` or a walk is running, a layer covers the drawing (`data-testid="station-walk-<side>"`, the mockup's "walk" layer): `{lines.walkTo}` with the side's name, or `walkText` while walking. A click or tap anywhere on the layer dispatches `{ type: 'realistic', action: { type: 'station', station: side } }` (the walk of M112). The layer is a `button` (keyboard: Enter and Space).
- **The current station's tools** (`realistic.station` is `port` or `starboard`, not walking) sit in that station's block, beside the drawing when the block is at least 420 px wide, otherwise in a panel that rises above the block (absolute, `bottom: 100%`, the block's width but at least 280 px, background `--console-block`, radius 12 px at the top): the selected line's strip (`real-strip` with its `act-*` buttons), the handle bar (`handle-bar`, `handle-where`), the station's alerts (`station-alerts`), `walk-status`, the paused line and `practice`. `createRealisticPanel` exports a `createRealisticTools(store, openEntry, showSection): { element: HTMLElement; update(): void }` built from those parts (they keep their testids); the phone keeps `createRealisticPanel` as it is.
- **Mast and Bow** (owner: only in first person, later): not built on the console. A link with `st=mast` or `st=bow` still puts the captain there (the state is unchanged); both blocks show their walk layer. The mast gearbox is not reachable on the console (the main furling line on bank A does the same work).

### 9.5 Strings

`lines.port` "Port lines", `lines.starboard` "Starboard lines", `lines.bank` "clutch bank", `lines.walkTo` "Walk to {side}" with `{side}` from `real.station.port` / `real.station.starboard` (today's names).

### 9.6 Tests (`tests/consoleLines.test.ts`)

1. `linesOfSide('port', hanse, 4)` gives the control ids `ctl_topping_lift, ctl_mainsheet, ctl_vang, ctl_jib_furl, ctl_gennaker_sheet, ctl_gennaker_sock`; `linesOfSide('starboard', hanse, 4)` gives `ctl_mainsheet, ctl_main_furl, ctl_jib_sheet, ctl_gennaker_sheet`. With stage 0 the two gennaker ids are absent.
2. `sidesOfEntry` of the main sheet entry is `{starboard, port}` (as a set); of the vang `['port']`; of the jib sheet `['starboard']`; of main furling `['starboard']` (not port: the outhaul rule); of the gennaker sheet `{port, starboard}`; of the sock `[]`.
3. On the dinghy `linesOfSide('port')` gives `ctl_mainsheet, ctl_vang` (its two lines, PHASE_DINGHY_SPEC 7) and `linesOfSide('starboard')` is empty.
4. No entry with `controlId === 'ctl_rudder'` on either side.

### 9.7 Browser checks (`scripts/shots-m121.mjs`, new group `m121`, test clock)

**Budget**: new group `m121` (77 groups, the cap). Expected 90 s. `scripts/ui.mjs` `goToStation(page, station)` on the console layout clicks `station-walk-<station>` for `port` / `starboard` and `helm-go` for `helm`, then `waitForWalk`; for `mast` / `bow` it throws `'no mast or bow station on the console layout'` (the checks that use them run at the phone size, 9.8).

**Scenes** (desktop and foldable): `lines-easy` (`E`), `lines-realistic` (`E&mode=realistic&st=starboard`), `lines-gennaker` (the M105 group's rigged-gennaker query with `&mode=easy`).

**Live checks**:

1. Easy `E`: `console-block-port` holds `line-row-ctl_vang` and `line-row-ctl_mainsheet-port`; `console-block-starboard` holds `line-row-ctl_jib_sheet` and `line-row-ctl_mainsheet`; there is no `menu-lines`. Click + on `line-row-ctl_mainsheet` 3 times: `waitForLink` shows `ms=` up by 3 × step, and `line-row-ctl_mainsheet-port` shows the same value. Press W: the value goes down one step in both rows.
2. Mouse wheel: `page.mouse.wheel(0, 100)` over `line-row-ctl_jib_sheet`: the jib sheet eases one step.
3. Realistic `E&mode=realistic&st=starboard`: both `station-drawing-port` and `station-drawing-starboard` are visible; `station-walk-port` is visible, `station-walk-starboard` is not; `real-strip` is inside `console-block-starboard`. Click `station-walk-port`: `waitForWalk`, then `station-walk-starboard` is visible and `station-walk-port` is not, and `real-strip` is in the port block.
4. Realistic gesture: `E&mode=realistic&st=starboard&sel=rope_jib_sheet`: the strip in the starboard block reads the jib sheet; click the drawing's clutch `[data-key="a5"] .clutch-body` (the selector of the m4b helpers): it opens (its `aria-label` changes from closed to open, `clutchAriaLabel`).
5. Narrow console 820×1000 Realistic at starboard: the tools panel rises above the starboard block (its bottom equals the block's top ± 1 px) and does not cover the wheel block.
6. Tablet `hasTouch` 1024×768 Easy: `locator.tap()` on + of `line-row-ctl_jib_sheet` moves it one step.
7. `E&mode=realistic&st=mast`: both walk layers show; no `station-drawing-mast` in the document.

### 9.8 Older checks and tests this milestone changes

- `scripts/shots-m4c.mjs`, `shots-m27.mjs`, `shots-m46.mjs`, `shots-m111.mjs` use the Mast or Bow station, `station-bar`, `gearbox-switch` or `bow-station`: each such check runs on the phone viewport only (`viewports[0]`) from M121, and the PR says so; the rest of those files is unchanged.
- `grep -n "rope-item\|rope-strip\|ropes-easy\|ropes-realistic" scripts/shots-m*.mjs`: at a console size those elements no longer exist. A check that selects a rope and moves it there uses `line-row-<controlId>`'s buttons; a check that only reads the Ropes list runs on the phone viewport only. List each file changed in the PR.
- The groups of the files changed: name them in the PR's `CI groups:` line.

**PR line:** `CI groups: all` (`goToStation`, a shared helper, and every rope control on the computer change).

### 9.8a Settled in planning

1. **The tools and `walk-status`**: `createRealisticTools` is built once and always in the document on the console; it moves into the current station's block (port or starboard). At `helm`, `mast` or `bow`, and while walking, it sits in the block of the side the captain last stood at (port at load), with the strip and handle bar hidden and `walk-status` shown, so `waitForWalk` keeps working. The walk text on the layers and in `walk-status` may both show: that is wanted (one is on the drawing, one in the tools).
2. **Beside or above**: at 1,440 px each side column is about 412 px (under 420), and on the narrow console about 170 px, so with today's sizes the tools always rise above the block; the 420 px rule is for wider windows. The raised tools are `z-index` above the sails strip and below the drawer; the camera ignores them (they stand at the side).
3. **Selection**: one selection for both drawings (the store's `select`); a clutch tapped on the other side's drawing does nothing but walk (the layer is on top). A walk layer clicked while a walk runs dispatches the `station` action as M112 decides (it turns the walk round or keeps it).
4. **Rebuilding the drawings**: when `leadsShown` changes (the gennaker stage crosses `winchLeads.minStage`), both blocks rebuild their drawing, as `realisticPanel.ts` does at its line 637. The walk layer belongs to `consoleLines.ts` (a sibling over the drawing), not to `stationDrawing.ts`.
5. **Easy rows**: the value is the number only (`{n} %`); the status line, metres out and load of today's strip are in Learn and the phone, not in the row. Key caps: `W` by −, `S` by + (main sheet, both rows), `R` by −, `F` by + (jib sheet). The mouse wheel: scrolling down is the + direction of the control (the same as the + button), whatever the line; `preventDefault`; one step per wheel event with `|deltaY| ≥ 4`. Row height 40 px, or 48 px under `@media (pointer: coarse)` with 44 × 44 buttons. Tab order: name, −, +. The name is a `button` (`select` with the entry's `selectId`); `aria-pressed` on every row of the selected entry.
6. **The `-port` row** of a two-sided entry is the one in the port block, always.
7. **Realistic on the dinghy** does not exist (no winches, `modesForBoat`); an old dinghy link with `mode=realistic` opens Easy as today.
8. **Older checks**: also `grep -n "station-button\|station-bar\|real-strip\|handle-bar\|station-alerts\|section-ropes\|showSection(page, 'ropes')\|menu-lines" scripts/shots-m*.mjs tests/`; the M119 checks of the Lines drawer (7.12 checks 2, 3, 9) and `tests/consoleLayout.test.ts` 7.11.3 change to the line blocks in this PR. `showSection(page, 'ropes')` on the console scrolls the port block into view (`replacedBy: 'port'`).

### 9.9 Done when / not in this milestone

PR: `Closes #298`. Done when the port and starboard blocks show the lines of 9.3 in Easy and both stations in Realistic, the walk works from either block, the Lines drawer is gone, the dinghy shows its lines on the left, every test of 9.6 and check of 9.7 passes, `npm run check` passes and CI is green.

Not in this milestone: the bow line and windlass (M122, the harbour block); exercise outlines (M123).

## 10. M122: Harbour gear and conditions

**Independent review: not needed** (moves the existing harbour, anchor and conditions sections into a folding block and a widget; no model, store or URL change).

### 10.1 Files

- **Add** `src/ui/consoleHarbour.ts`, `src/ui/conditionsWidget.ts`, `scripts/shots-m122.mjs`.
- **Change** `src/ui/modes.ts` (`consolePlace`: `harbour`, `anchor` → `{ block: 'harbour' }`; `sectionAvailable('anchor', …, 'console')` no longer needs Easy ropes, 10.3; `DrawerId` loses `'harbour'`), `src/ui/consoleMenu.ts` (no Harbour or Conditions item; the Conditions drawer is opened by the widget), `src/ui/console.ts` (`setHarbourOpen`, the band's columns), `scripts/ui.mjs` (10.7), `src/style.css`, `content/lang/*/ui.json`, `docs/CODE_MAP.md`.

### 10.2 The harbour block, folded (`src/ui/consoleHarbour.ts`)

```ts
export function createConsoleHarbour(store: Store, consoleView: ConsoleView): HTMLElement; // the slot's fold button and its content wrapper
```

- Shown on a boat with `hasFeature('harbour')` (not on the dinghy), in every place and mode, **folded** at every page load: the 40 px column of 8.5 is one button (`data-testid="harbour-toggle"`, `aria-expanded="false"`, `aria-controls` the content), the whole column tall, with the vertical words `{harbour.fold}` "Harbour gear" and ▸ (the mockup), 12 px weight 600 capitals `--console-muted`. Hover: background `rgb(255 255 255 / 0.08)`.
- Click, Enter or Space unfolds it (`consoleView.setHarbourOpen(true)`), and the button turns into the block's title bar ("Harbour gear ◂", `aria-expanded="true"`); the same button folds it again. Nothing else folds it. The fold is not stored and not in the link.

### 10.3 The harbour block, unfolded

- Content: the `harbour` section (fenders, the fender hints, the mooring lines block with its line rows, clear the propeller) and the `anchor` section (windlass Down / Up held, chain counter, status, scope, check, alarm), moved there (their testids unchanged: `fenders-*`, `line-<code>-*`, `windlass-down`, `windlass-up`, `chain-counter`, `anchor-*`, `alarm-silence`, `prop-clear`). The light tokens are redefined inside the slot as in M119 (7.5).
- On the console the anchor is available in both ropes modes (the Bow station that held it in Realistic is not on the console, 9.4); the phone keeps today's rule.
- **Wide console and narrow console from 1,000 px wide: the band narrows the other blocks.** The harbour column becomes 420 px (from 1,000 to 1,279 px wide: 300 px), and the port and starboard columns become `minmax(120px, 1fr)` (their rows keep the name, value and − + buttons; the name is ellipsised). At 420 px the content is in two columns (`harbour` left, `anchor` right); at 300 px one column. The content scrolls vertically if taller than the block. The change is a 200 ms `grid-template-columns` transition (none with `prefers-reduced-motion`).
- **Narrow console under 1,000 px wide** (the foldable sizes): there is no room to narrow the blocks, so the unfolded content rises **above** the band at the right: absolute, `right: 12px`, `bottom: calc(var(--console-h) + 12px)`, 300 × 240 px, the block look, its content scrolling (the mockup's frame 3). The 40 px column stays in the band as the fold button. The raised panel does not change the camera's framing (`top()` ignores it): it stands at the right edge, over the sea, not over the boat.
- An exercise step that needs a harbour control unfolds the block (M123, 11.4).

### 10.4 The conditions widget (`src/ui/conditionsWidget.ts`)

```ts
export function createConditionsWidget(view: HTMLElement, store: Store, menu: ConsoleMenu): HTMLElement;
```

- A `button.conditions-widget` (`data-testid="conditions-widget"`, `aria-label` `{conditions.widget}` with the wind's speed and direction, `aria-expanded`), top right under the menu: its right edge 8 px from the window's, its top 8 px below the menu's bottom, 128 × 128 px (narrow console 96 × 96), the block look of 2.3, radius 12 px.
- It draws, scaled to its size, the picture the Conditions section's `wind-dial` draws (`src/ui/windPanel.ts`, its compass with north at the top, the boat turned to `boat.headingDeg` and the arrow of where the wind comes from), in the console colours: ring `rgb(150 190 220 / 0.35)`, N `--console-muted`, the arrow `--console-accent`, the boat `--console-text`; and the true wind speed in the middle (`{n} kn`, 16 px weight 600, `data-testid="conditions-widget-speed"`). It updates when the heading, the wind's direction or speed change (on the same state the dial reads).
- A click opens the Conditions drawer (`menu.open('conditions')`, the drawer of M119 holding the `conditions` section, unchanged); a second click, × or Escape closes it.
- **Set up.** The Conditions drawer's header has a toggle `button` `data-testid="conditions-setup"` (`{conditions.setup}` "Set up", `aria-pressed`), off when the drawer opens. While off, the section's body is `inert` with `opacity: 0.85` and a line at its top `{conditions.setupNote}`: the readings show, nothing changes by a stray click. On: the controls work as today. Closing the drawer turns it off.
- **Navigation later** (owner, answer 4): a later milestone may put a small chart with depths beside or in place of this widget and the mini-map; nothing is built for it now, and the widget's place in 2.2 is the place it will use.

### 10.5 Strings

`harbour.fold` "Harbour gear", `conditions.widget` "Conditions: wind {kn} kn from {deg}°", `conditions.setup` "Set up", `conditions.setupNote` "Turn on Set up to change the wind and waves."

### 10.6 Tests

1. `tests/modes.test.ts`: `consolePlace` of `harbour` and `anchor` → `{ block: 'harbour' }`; `sectionAvailable('anchor', <a Hanse state with Realistic ropes>, 'console')` is true and on `'stacked'` it keeps today's answer.
2. `tests/consoleLayout.test.ts`: `DrawerId` has no `harbour` or `lines`; every drawer except `conditions` has a menu item (read the item list `consoleMenu.ts` exports as `MENU_ITEMS`).

### 10.7 Browser checks (`scripts/shots-m122.mjs`, joins group `m121`, test clock)

**Budget**: `GROUP_ALIASES` gets `m122: 'm121'`; expected addition 45 s (135 s in all): name `m121` in `.github/ci-budget.json` ("the line blocks, harbour gear and conditions of the console"). `scripts/ui.mjs` `showSection(page, 'harbour' | 'anchor')` on the console clicks `harbour-toggle` if `aria-expanded` is false, then scrolls the section into view; `showSection(page, 'conditions')` clicks `conditions-widget` unless the drawer is open on it, then turns `conditions-setup` on.

**Scenes** (desktop and foldable): `harbour-folded` (`?pl=marina&wd=60&ws=8`), `harbour-open` (the same, `harbour-toggle` clicked), `conditions-open` (`E`, `conditions-widget` clicked).

**Live checks**:

Custom sizes use `page.setViewportSize`; widths are read after `page.realWaitForTimeout(300)` (the CSS transition runs in real time).

1. `?pl=marina&wd=60&ws=8` at 1440×900: `harbour-toggle` is visible with `aria-expanded="false"` and the block is 40 px wide; click it: the block is 420 px wide, `fenders` and `windlass-down` are visible inside `console-block-harbour`, and `console-block-port` is narrower than before. Click again: 40 px.
2. At 1100×800 (narrow, ≥ 1,000): unfolded width 300 px, in the band.
3. At 820×1000: unfolded, the content's box is above the band (its bottom ≤ the band's top) and the band's blocks keep their widths.
4. Realistic in the bay `?pl=bay&mode=realistic&wd=60&ws=8`: unfolded, `windlass-down` held for 2 s (`holdWindlass(page, 'down', 2000, '')`) lets chain out (`chain-counter` > 0).
5. Conditions: `E`: `conditions-widget-speed` reads "12 kn"; click the widget: `drawer` has `data-drawer="conditions"` and the Conditions section's body has the `inert` attribute; click `conditions-setup`: `inert` is gone; click `sea-coastal`: `waitForLink` shows `sea=coastal`. Close with Escape: open again: `conditions-setup` is off.
6. The widget follows the wind: in Set up, move `wind-speed` to 20: `conditions-widget-speed` reads "20 kn".

### 10.8 Older checks and tests this milestone changes

- `grep -ln "showSection(page, 'conditions')\|showSection(page, \"conditions\")" scripts/shots-m*.mjs`: unchanged (the helper turns Set up on). A check that clicks a Conditions control at a console size without `showSection` gets a `showSection(page, 'conditions')` first; list them in the PR.
- `grep -ln "'harbour'\|'anchor'" scripts/shots-m*.mjs` that open those sections: unchanged (the helper unfolds the block); `menu-harbour` and `menu-lines` (M119, M121 checks) become `harbour-toggle`.

**PR line:** `CI groups: all` (`showSection`, a shared helper, changes for three sections).

### 10.8a Settled in planning

1. **An exercise's lock wins over Set up.** While an exercise is loaded (`state.exercise !== null`) the Conditions section stays locked as today (`applyLocked`, `panel.ts`), `conditions-setup` is `disabled` and the exercise's own locked note shows (no `conditions.setupNote`). Set up owns `inert` only while no exercise is loaded.
2. **Band columns from M122**: the harbour column is 40 px folded (both widths) and 420 / 300 px unfolded as 10.3 says; on a boat without the harbour feature it stays 0 px. The 1,000 px rule is a media query (`@media (min-width: 1000px)`), not a new `data-console` value.
3. **The block's DOM**: the slot holds one `button.harbour-toggle` and one `div#console-harbour-content` (`aria-controls`). Folded: the content is `hidden` and the button is the 40 px column with vertical text. Unfolded: the button is a 32 px title bar along the block's top (horizontal text), the content under it; the slot has `data-open="true"` (the CSS reads it). The focus stays on the button. Inside, `harbour` comes before `anchor` (one column) or left of it (two columns); each section's toggle is hidden and the section open, as in M119. The raised panel (under 1,000 px) has `z-index` above the band, the sails strip, the mini-map and the chip row.
4. **Shown when**: the fold button shows while the harbour or the anchor section is available; until M123, an exercise that leaves both out of its `sections` hides the whole slot.
5. **The anchor in Realistic** works from the harbour block without walking (as the Helm station's windlass remote did). The `-helm` and `-bow` anchor panels belong to sections that are out of the document on the console, so no testid is doubled.
6. **The widget's picture**: move the dial's drawing out of `createWindPanel` into an exported `drawWindDial(svg: SVGSVGElement, state: AppState, colours: DialColours): void` in `windPanel.ts`, used by the dial and the widget. The widget's arrow is the wind now (the dial's `dial-wind-now`), its number the true wind now (`instrument-tws`'s value) rounded to a whole knot, with the string `conditions.speed` "{kn} kn". `{deg}` in its label is the direction the wind comes from, 0–359. Its top is set from the menu's box (`getBoundingClientRect().bottom + 8`) on every resize and `menu.update()`; its right edge is 8 px from the window's, whatever its size.
7. **Drawer header extras**: `MenuItem` gains `header?: () => HTMLElement` (the Conditions drawer's Set up toggle); the Conditions drawer's title is `menu.conditions` (the key stays). The widget follows the drawer through `menu.onChange` (`aria-expanded`). `consoleMenu.ts` exports `MENU_ORDER: readonly DrawerId[]` (the items' order), which test 10.6.2 reads.
8. **Contrast**: the M119 audit (7.12 check 9) runs again with the harbour block unfolded at the marina; the anchor's alarm and the fouled-propeller hint get console colours if it finds them.
9. **Older checks**: `menu-harbour` → `harbour-toggle`, `menu-conditions` → `conditions-widget`; in the grep for `'harbour'`, only `showSection(page, 'harbour')` / `'anchor'` calls are about these sections (`setMode(page, 'harbour')` is the mode: M124).

### 10.9 Done when / not in this milestone

PR: `Closes #299`. Done when the harbour block folds and unfolds as 10.2–10.3 say at the three widths, the anchor works in both ropes modes on the console, the conditions widget shows the wind and opens the Conditions drawer with Set up, every test of 10.6 and check of 10.7 passes, `npm run check` passes and CI is green.

Not in this milestone: the navigation chart; exercise outlines (M123).

## 11. M123: Exercises on the console

**Independent review: required** (what an exercise marks teaches the handling; the step bar's keys and older exercise checks change on the computer).

### 11.1 Files

- **Add** `src/app/consoleTargets.ts`, `tests/consoleTargets.test.ts`, `scripts/shots-m123.mjs`.
- **Change** `src/ui/exerciseBar.ts` (not shown on the console layout), `src/ui/stepCard.ts` (Show me and Stop on the console), `src/ui/keyboard.ts` (11.6), `src/ui/console.ts` (the outlines, 11.4), `src/ui/consoleWheel.ts`, `src/ui/consoleEngine.ts`, `src/ui/consoleLines.ts`, `src/ui/consoleHarbour.ts`, `src/ui/stationDrawing.ts`, `src/ui/sailsPanel.ts`, `src/ui/dinghyPanel.ts`, `src/ui/capsizePanel.ts`, `src/ui/conditionsWidget.ts` (each puts `data-target` on its parts, 11.3), `src/ui/modes.ts` (11.5), `src/ui/consoleMenu.ts` (11.5), `src/style.css`, `content/lang/*/ui.json`, `docs/CODE_MAP.md`.

### 11.2 What a step outlines (`src/app/consoleTargets.ts`, pure)

```ts
export type ConsoleTarget = string; // a BarRowId (src/app/exerciseBar.ts) or 'sail:main' | 'sail:jib' | 'sail:gennaker' | 'wind'
export function consoleTargets(def: ExerciseDef, step: number, ropes: RopesMode): ConsoleTarget[];
```

1. The rows: `ropes === 'realistic' && s.barRealistic` ? `s.barRealistic` : `s.bar` (`s = def.steps[step]`). **Not** `barRowsFor` (it folds Realistic rows into one `ropes` row for the phone).
2. In Realistic, a row `control:<id>` other than `control:ctl_rudder` becomes one `clutch:<side>:<key>` per clutch that holds a rope of that control's entry (`panelEntries`, `cockpitHardware.clutchBanks`, the JIB ROLL clutch: its key `r1`), sides as 9.3, in bank order A then B then r.
3. Then, from the step's `check`: `mainTrim` adds `sail:main`, `jibTrim` adds `sail:jib`, `gennakerTrim` adds `sail:gennaker`, `twaDeg` adds `wind` (the angle to the wind is read on the wind compass).
4. No duplicates; order as above. A step index outside the steps gives `[]`.

### 11.3 Where each target is (`data-target`)

Every console part a target can name carries `data-target` with the target ids it answers, space-separated (`el.dataset.target`), set when the part is built:

| Target | Element |
|---|---|
| `control:ctl_rudder` | `wheel-drag` (and the tiller drawing on the dinghy) |
| `control:<id>` (Easy) | `line-row-<id>` and `line-row-<id>-port` |
| `autopilot:mode`, `autopilot:turn`, `autopilot:tack` | the Standby/Auto/Wind group, the −10…+10 group, `autopilot-tack` |
| `engine` | the lever and Start/Stop together (the block's content without the thrusters) |
| `thrusters` | the thruster pair |
| `fenders`, `windlass`, `line:<code>` | the `fenders` fieldset, the windlass buttons, `line-<code>` (inside the harbour block) |
| `clutch:<st>:<key>`, `winch:<st>:<winch>:<key>` | the clutch's and the winch's groups in `station-drawing-<st>` (SVG `g` elements: `stationDrawing.ts` adds the attribute) |
| `gennaker:steps`, `gennaker:gybe` | `gennaker-steps`, `gennaker-gybe` (Sails drawer) |
| `dinghy:sit`, `dinghy:board` | the sit choices and the centreboard stepper (Balance section, engine slot) |
| `capsize:steps` | the capsize card's step buttons |
| `sail:<sail>` | `sails-strip-<sail>` |
| `wind` | `conditions-widget` |

### 11.4 The outline and the dimming (`src/ui/console.ts`)

```ts
export function markTargets(root: ParentNode, targets: readonly ConsoleTarget[]): void; // sets data-need on matches, data-dim on blocks without one
```

- Called on every store change while an exercise run is `running` or `mistake` (the states `barShown` names), with `consoleTargets(def, run.step, ropes)`; with any other state, or no run, every `data-need` and `data-dim` is removed.
- Each element whose `data-target` list contains a target gets `data-need="true"`. CSS: `outline: 2px solid var(--console-need); outline-offset: 2px; border-radius: 10px; animation: console-need 2s ease-in-out infinite` with `@keyframes console-need { 0%, 100% { outline-color: rgb(255 159 28 / 1) } 50% { outline-color: rgb(255 159 28 / 0.35) } }`; under `prefers-reduced-motion: reduce` no animation (a steady outline). SVG groups use `stroke: var(--console-need); stroke-width: 3` on their outline shape instead of `outline` (SVG has no outline), with the same keyframes on `stroke-opacity`.
- Each `.console-block`, the sails strip and the conditions widget with no `data-need` inside get `data-dim="true"`: `opacity: 0.5`, `transition: opacity 200ms`. Dimmed controls still work (owner: every control stays visible and usable).
- **A target the learner cannot see yet** is brought into view at the step's start (once per step, not on every store change): in a folded harbour block → `setHarbourOpen(true)`; in a drawer (`gennaker:*` in Sails) → `menu.open` of that drawer; in a block's scrolled rows → `scrollIntoView({ block: 'nearest' })`; behind a Realistic walk layer → the layer (`station-walk-<st>`) also gets `data-need`, because walking there is the first move.
- The 3D view's magenta target outline (`render3d/exerciseTarget.ts`) is unchanged.

### 11.5 The exercise on the console

- **No step bar.** `createExerciseBar` shows nothing on the console layout (`barShown(state) && layoutKindOf(viewport) === 'stacked'` …): its stack is `hidden` and `--exercise-stack-h` is 0; the phone is unchanged.
- **The step card** (`stepCard.ts`) on the console gets, at its bottom right, the buttons the bar's head had: ▶ Show me (`data-testid="step-card-showme"`, same action and rules as `exercise-bar-showme`) and, while the app plays, Stop (`step-card-stopdemo`, as `exercise-bar-stopdemo`). "All controls" (`exercise-bar-all`) has no place on the console (every control is visible).
- **Every block stays shown** during a run on the console: the rule "a loaded exercise hides every section not in `def.sections`" applies on the console only to drawers (their menu items hide); sections in blocks or `replacedBy` are never hidden by it (`sectionAvailable(id, state, 'console')` skips the `def.sections` test for them).
- **The Exercises drawer** opens when the mode becomes Exercise (M119), stays open through the setup card, **closes when the run starts** (status becomes `running`; the step card carries the step), and opens again on `done` or `failed` (the debrief).

### 11.6 Keys during a run on the console

`keyAction(code, key, shift, state, onConsole = false)`: with `onConsole` true, ← → steer during a run as outside one (the bar that used them is not there), W S, R F as always. `createKeyboard` passes `layoutModeFor(innerWidth, innerHeight) === 'console'`. Enter presses `step-card-showme` when it is shown (as the bar's Enter did). The bar's 1–4, − + = and Space do nothing on the console.

### 11.7 Strings

The step card's buttons use the bar's strings `exercise.bar.showMe` "▶ Show me" and `exercise.bar.stopDemo` "Stop watching"; no new key. `keys.bar` in the key list (`keyHelp.ts`) is shown only on the phone layout; on the console the list says Enter for Show me (`keys.showMe` "Enter: Show me (in an exercise)", new key).

### 11.8 Tests (`tests/consoleTargets.test.ts`)

1. `points-of-sail`, step 0, Easy: `['control:ctl_mainsheet', 'sail:main', 'sail:jib', 'wind']`.
2. `points-of-sail`, step 2, Easy: `['autopilot:turn', 'control:ctl_mainsheet', 'control:ctl_jib_sheet', 'sail:main', 'wind']`.
3. `set-sails`, step 1, Realistic: `['clutch:starboard:a2', 'winch:starboard:winch_primary_starboard:a3']`.
4. `set-sails`, step 2, Realistic: `['clutch:starboard:a2', 'winch:starboard:winch_primary_starboard:a3', 'autopilot:mode', 'autopilot:turn', 'sail:main', 'wind']`.
5. `gennaker-rig`, step 0, Easy: `['gennaker:steps']`.
6. Every step of every exercise, in its own ropes mode: every target is a valid `BarRowId` (`isBarRowId`) or one of the four extra ids; no step gives a target the boat lacks (`boatHasControl`, `hasFeature`). This test walks all 26 exercises.
7. `keyAction('ArrowRight', …, <a running exercise state>, true)` steers; with `false` it returns `null` (today's rule).
8. A hand-built Realistic def whose step has `bar: ['control:ctl_jib_sheet']` and no `barRealistic`: `['clutch:starboard:a5']` (11.2 rule 2). For test 7 build the running state with `reduce` from `parseUrlState` and the `exercise` actions the exercise tests use (`grep -n "type: 'exercise'" tests/exerciseRun*.test.ts`), with `ap=off`.

### 11.9 Browser checks (`scripts/shots-m123.mjs`, joins group `m93`, test clock)

**Budget**: `GROUP_ALIASES` gets `m123: 'm93'`; expected addition 60 s (180 s): name `m93` in `.github/ci-budget.json` ("the step card on both layouts"). Each run goes at the highest time speed the app allows for a pilot (`scripts/exercise-drive.mjs`).

**Scenes** (desktop): `exercise-step` (the `points-of-sail` start link from `exerciseStartLink`, started with Do it myself: the main sheet rows, the main and jib status and the compass outlined, the rest dimmed).

**Live checks**:

1. `points-of-sail`, Do it myself, desktop: no `exercise-bar` visible; `line-row-ctl_mainsheet` and `line-row-ctl_mainsheet-port` have `data-need="true"`, `sails-strip-main` and `conditions-widget` too; `console-block-engine` has `data-dim="true"`; `engine-startstop` still works (click: the engine starts).
2. The same, after clicking `autopilot-off` (its start link has `ap=wind`): press → 3 times: `waitForLink` shows `rd=` changed (the arrow keys steer on the console during a run).
3. `step-card-showme` plays the step; `step-card-stopdemo` shows while it plays; Enter presses Show me.
4. `set-sails` (Realistic), Do it myself, with `&st=port` added to its start link, step 0 done with `scripts/exercise-drive.mjs` (its helpers for the engine and heading steps): at step 1 the starboard walk layer `station-walk-starboard` has `data-need="true"` and the a2 clutch group in `station-drawing-starboard` has `data-need="true"`.
5. `enter-berth` (its step 0 has the `fenders` row): at step 0 the harbour block is unfolded and `fenders` has `data-need="true"`.
6. Reduced motion: an `emulateMedia({ reducedMotion: 'reduce' })` page: `getComputedStyle` of a `data-need` element has `animation-name` `none`.
7. The Exercises drawer: open on setup; closed once the run starts; open again on done (the `points-of-sail` run driven to the end with `exercise-drive.mjs`).

### 11.10 Older checks and tests this milestone changes

- `grep -n "exercise-bar\|exercise-stack\|bar-row-\|bar-station\|bar-clutch\|bar-winch" scripts/shots-m*.mjs`: the grep finds m79 (`viewports[1]`), m81, m82, m93 and m118; each use at a console size changes. Each such check either runs on the phone viewport only (the bar is the phone's) or uses the console part that does the same (`step-card-showme` for `exercise-bar-showme`, the line rows for `bar-row-control-*`); In `shots-m37.mjs` look at lines 267–291 first: if they check the exercise step bar on a computer, delete them (there is no bar there); if they check another bar (the time bar), keep them.
- `tests/keyboard.test.ts` (or the file that tests `keyAction`: `grep -ln "keyAction" tests/`): the new parameter, default `false`, keeps every old case.
- The exercise checks that start runs at the desktop size with Do it myself (`grep -ln "Do it myself\|exercise-doit" scripts/shots-m*.mjs`): their steps are done with the console controls; list each in the PR.

**PR line:** `CI groups: all` (the step bar and the arrow keys change on every computer page with an exercise).

### 11.10a Settled in planning

1. **Order** in 11.2 rule 3 is fixed (main, jib, gennaker, wind), whatever the order of the keys in `check`.
2. **Rule 2** (Realistic `control:<id>` without `barRealistic`) is not reached by today's data (both Realistic exercises give `barRealistic` where they have control rows); test it with a hand-built two-step def in 11.8 (test 8). Keys are the clutch keys of the data (`a5`, `b4`, `r1`), as the `clutch:` rows use; a control row never gives a `winch:` target.
3. **Test 6** runs each exercise on its own boat (`useBoat` for `boat: "dinghy"`, as the M118 tests do). `sail:*` and `wind` are always valid; a `sail:<sail>` whose strip item is not shown at that moment outlines nothing (no error).
4. **Who marks**: `console.ts` subscribes to the store and calls `markTargets(consoleRoot, …)` with `exerciseDef(run.id)`; the step card, the menu and the chip row are never dimmed. During Watch and Show me the outlines stay (they show what the app works). "Once per step" means once each time `run.step` changes or the run leaves `mistake` for `running`. A target in the folded harbour block: the block is unfolded first, then marked, so it is never dimmed.
5. **Drawers during a run**: the Place and Status items follow `def.sections` as today. If the Sails drawer was opened for a `gennaker:*` target, `done` or `failed` still opens the Exercises drawer (it replaces Sails).
6. **The Enter key** on the console: `stepCard.ts` owns a `keydown` listener (as the bar did: not while typing, not while an overlay is open, not when `defaultPrevented`, not while the app plays) that clicks `step-card-showme` when shown. `stepCard.ts` gets the layout from its `layout` argument (`layoutKindOf(layout.viewport())`). The Show me button is in every running-step state of the card; not in setup, mistake, failed or done.
7. **`control:ctl_rudder` in Realistic** marks `wheel-drag` too (11.2 rule 2 leaves the rudder row as it is). SVG targets: `stationDrawing.ts` gives the clutch's body `rect` and the winch's drum `circle` the class `need-shape`; the CSS strokes `[data-need] .need-shape`. Read `data-target` with `getAttribute` on SVG elements.
8. **The scene** `exercise-step` is taken at desktop and foldable sizes.

### 11.11 Done when / not in this milestone

PR: `Closes #300`. Done when an exercise on the console shows no step bar, outlines exactly the targets of 11.2 with the pulse of 11.4, dims the other blocks, brings a hidden target into view, the step card carries Show me, the keys of 11.6 work, every test of 11.8 and check of 11.9 passes, `npm run check` passes and CI is green.

Not in this milestone: lighting the part on the 3D boat (part B); new exercise data fields.

## 12. M124: What you are doing, and controls

**Independent review: required** (the store's mode, the URL's `m` key and old links, the phone's mode picker; the part's sign-off).

### 12.1 Files

- **Add** `src/app/activity.ts`, `tests/activity.test.ts`, `scripts/shots-m124.mjs`.
- **Change** `src/app/appMode.ts` (`'harbour'` leaves `APP_MODES`), `src/app/urlState.ts` (12.4), `src/app/urlSync.ts`, `src/app/store.ts` (`setAppMode` for the four modes), `src/app/app.ts`, `src/ui/modePicker.ts`, `src/ui/modeChip.ts`, `src/ui/modes.ts` (`MODE_LAYOUTS` loses `harbour`; 12.5), `src/ui/panel.ts`, `src/ui/quickRow.ts`, `src/ui/thrusterPanel.ts`, `src/ui/realisticPanel.ts` (each `appMode === 'harbour'` test, 12.3), `src/ui/panelTabs.ts` (line 103: the phone's Mode tab label), `tests/dinghyBoat.test.ts` (its list of the Hanse's modes, lines 295–302: four now), `tests/physicsTruthsDinghy.test.ts` (it walks `MODE_LAYOUTS`; one case fewer), `content/lang/*/ui.json`, `scripts/ui.mjs` (`setMode`, 12.7), `docs/WORKFLOW.md`, `docs/archive/CHECKLISTS.md`, `docs/ROADMAP.md`, `docs/CODE_MAP.md`.

### 12.2 Activity (`src/app/activity.ts`, pure)

```ts
export type Activity = 'learn' | 'sail' | 'exercise';
export const ACTIVITIES: readonly Activity[];                        // ['learn', 'sail', 'exercise']
export function activityOf(mode: AppMode): Activity;                  // learn → learn, exercise → exercise, easy and realistic → sail
export function modeFor(activity: Activity, ropes: RopesMode): AppMode; // sail → ropes; the others → themselves
export function sailingInPlace(state: Pick<AppState, 'appMode' | 'harbour'>): boolean; // activityOf(appMode) === 'sail' && harbour.place !== 'open'
export function activitiesForBoat(data?: BoatData, id?: string): Activity[]; // 'exercise' only when the boat has exercises (as modesForBoat today)
```

`AppMode` becomes `'learn' | 'easy' | 'realistic' | 'exercise'`; `keepsRopesMode` is true for `learn` and `exercise`. No new store action: choosing an activity dispatches `{ type: 'setAppMode', mode: modeFor(activity, settings.ropesMode) }`; choosing controls dispatches `{ type: 'setRopesMode', mode }` (which already keeps Learn and Exercise and otherwise sets `appMode` to the ropes mode).

### 12.3 What Harbour mode did, now by the place

Every `state.appMode === 'harbour'` in `src/` becomes `sailingInPlace(state)`: the thruster keys on the phone (`thrusterPanel.ts` `thrusterKeysOn`), the quick row's engine lever and joysticks (`quickRow.ts`), the engine-first order and `openHarbourFirst` (`panel.ts`), the info card that stays instead of switching to Learn (`app.ts`), and the two kept-mode tests in `realisticPanel.ts` and `urlSync.ts` (there: `appMode` stays as it is when it is `learn`; the place no longer decides the mode). On the phone, Sail freely in a place uses the section order today's Harbour mode used (12.5), so the phone's harbour picture is the same.

### 12.4 URL and old links (`src/app/urlState.ts`)

- `m` is written for `learn` and `exercise` only (as today, without `harbour`). `URL_STATE_VERSION` stays 1.
- **Old links**: `m=harbour` is read as no `m` (the mode follows `mode=`, Easy by default); every other key, the place `pl` included, is read as before. So `?m=harbour&pl=marina` opens Sail freely, Easy, at the marina; `?m=harbour&mode=realistic` opens Sail freely, Realistic, in open water (the place the link names, as today: Harbour mode never set the place).
- Setup files hold the link, so an old setup file with `m=harbour` reads the same way.

### 12.5 Sections (`src/ui/modes.ts`)

`MODE_LAYOUTS` has `learn`, `easy`, `realistic`, `exercise`. `layoutOrder(state): readonly SectionId[]` (new, exported) gives `MODE_LAYOUTS[appMode].order`, except that while `sailingInPlace(state)` it gives today's Harbour order: `mode, engine, helm, harbour, status, anchor, place, conditions, sails, ropes, dinghy, autopilot, learn, exercises, settings`. `panel.ts` orders by `layoutOrder`. On the console the order only orders the drawers' contents (7.4).

### 12.6 The mode chip and picker (`src/ui/modePicker.ts`, `src/ui/modeChip.ts`)

The picker (the phone's Mode tab and the console's mode card) has two groups, in this order:

1. **`{mode.activity}` "What you are doing"**: a radiogroup `data-testid="activity-choices"` with `activity-choice-learn`, `activity-choice-sail`, `activity-choice-exercise` (the last only when `activitiesForBoat` has it), each a `.mode-choice` with its name and one line: `activity.learn` "Learn" / `activity.learn.desc` "Look round the boat and read what each part does. Tap any part to read about it."; `activity.sail` "Sail freely" / `activity.sail.desc` "Sail where you like: in open water, at the marina or in the bay (choose it under Place)."; `activity.exercise` "Exercise" / `activity.exercise.desc` today's `mode.exercise.desc`.
2. **`{mode.controls}` "Controls"**: a radiogroup `data-testid="controls-choices"` with `controls-choice-easy` and `controls-choice-realistic` (the latter only on a boat with winches): `controls.easy` "Easy" / today's `mode.easy.desc`; `controls.realistic` "Realistic" / today's `mode.realistic.desc`. While an exercise is loaded the group is disabled (`aria-disabled`, the exercise sets its own ropes mode, as today).

`mode.harbour` and `mode.harbour.desc` leave every language; `mode.learn`, `mode.easy`, `mode.realistic`, `mode.exercise` and their `.desc` keys go too once nothing reads them (`grep`). The **mode chip** reads `{activity}` for Learn and Exercise and `{activity} · {controls}` for Sail freely ("Sail freely · Easy"), on both console widths. Its testid stays `mode-chip`, the card's `mode-card`.

### 12.7 Strings and helpers

New keys of 12.6: `mode.activity`, `mode.controls`, `activity.learn`, `activity.learn.desc`, `activity.sail`, `activity.sail.desc`, `activity.exercise`, `activity.exercise.desc`, `controls.easy`, `controls.easy.desc`, `controls.realistic`, `controls.realistic.desc`. `scripts/ui.mjs` `setMode(page, mode)` keeps its name and argument: `learn` and `exercise` click `activity-choice-<mode>`; `easy` and `realistic` click `activity-choice-sail` then `controls-choice-<mode>`; `harbour` clicks `activity-choice-sail` and then, through `choosePlace(page, 'marina')`, the marina (the checks that chose Harbour wanted the harbour picture; `grep -n "setMode([^)]*'harbour'" scripts/shots-m*.mjs` and check each still holds).

### 12.8 Tests (`tests/activity.test.ts`, `tests/modes.test.ts`)

1. `activityOf` for the four modes; `modeFor('sail', 'realistic')` is `realistic`; `modeFor('learn', 'realistic')` is `learn`.
2. Old links: `?m=harbour` parses to `appMode: 'easy'` and place `open`; `?m=harbour&pl=marina` to `easy` at `marina`; `?m=harbour&mode=realistic` to `realistic`; serialising any of them writes no `m`.
3. Round trip: every `AppMode` through `serializeUrlState` and `parseUrlState` comes back the same; `m=learn` still comes after `cam` (today's test).
4. `layoutOrder`: Easy in open water gives `MODE_LAYOUTS.easy.order`; Easy at the marina gives the Harbour order of 12.5; Learn at the marina gives `MODE_LAYOUTS.learn.order`.
5. `sailingInPlace` is false for Learn and Exercise in any place.
6. `activitiesForBoat` on the dinghy and the Hanse both include `exercise` (both have exercises); a boat profile without exercises gives `['learn', 'sail']`.
7. The `modes.test.ts` cases for Harbour mode ("Harbour keeps the ropes mode, engine first") become the `layoutOrder` and `sailingInPlace` cases above.

### 12.9 Browser checks (`scripts/shots-m124.mjs`, joins group `m38`, test clock)

**Budget**: `GROUP_ALIASES` gets `m124: 'm38'`; expected addition 40 s (150 s): name `m38` in `.github/ci-budget.json` ("the chip row and the mode picker on both layouts").

**Live checks** (desktop unless named):

1. `E`: the mode chip reads "Sail freely · Easy"; open it: `activity-choices` and `controls-choices` show, `activity-choice-sail` and `controls-choice-easy` are checked. Click `controls-choice-realistic`: the chip reads "Sail freely · Realistic", the link has `mode=realistic`, `station-drawing-port` and `station-drawing-starboard` are visible.
2. Click `activity-choice-learn`: the link has `m=learn`; the chip reads "Learn"; `controls-choice-realistic` stays checked.
3. Old link `?m=harbour&pl=marina&wd=60&ws=8`: the chip reads "Sail freely · Easy"; on the phone (390×844) the Controls tab lists the engine section first.
4. Phone 390×844 `E`: the Mode tab shows the two groups; `activity-choice-exercise` opens the exercise list as `mode-choice-exercise` did.
5. Dinghy: no `controls-choice-realistic`.

### 12.10 Older checks and tests this milestone changes

- `grep -n "mode-choice-\|mode-choices" scripts/shots-m*.mjs tests/`: each becomes `activity-choice-*` / `controls-choice-*`, or goes through `setMode` (preferred).
- `grep -n "'harbour'" tests/*.test.ts` for `appMode: 'harbour'` states and `m=harbour` links: each becomes Easy (or Realistic) with the place it needs, and the expectation of 12.3.
- `scripts/shots-m38.mjs` ("the mode chip reads Easy"): reads "Sail freely · Easy".
- **Sign-off.** The checklists `#### M119` to `#### M123` move from `docs/WORKFLOW.md` to `docs/archive/CHECKLISTS.md`, unchanged (M124's stays until the next planning PR). `docs/ROADMAP.md`: the "Console" row becomes "Part A done (M119–M124); part B (the phone's Watch) to plan with `/plan console b`". The PR's description tells the owner the part is ready for a release.

**PR line:** `CI groups: all` (the store's mode and the URL state change).

### 12.10a Settled in planning

1. **Labels**: the phone's Mode tab (`panelTabs.ts` line 103) and `panel.ts` line 386 read the chip's text (12.6); `mode.section` ("Mode: {name}") and `mode.chip` ("Mode: {name}. Tap to change it.") stay as the aria labels with `{name}` = that text. The chip loses its visible "Mode:" prefix on both widths. The separator " · " is part of a new key `mode.sailWith` "{activity} · {controls}".
2. **Order of tests in `quickRow.ts`**: `sailingInPlace(state)` is tested before the `easy` branch (line 101) and before the Realistic branch (line 137), so Easy at the marina shows the lever and joysticks.
3. **Every `appMode === 'harbour'`** in `src/` becomes `sailingInPlace(state)`, including `app.ts` lines 217 (`shownInPanel`) and 223 (`showLearn`) and `panel.ts` line 500 (a selected rope does not switch the open section).
4. **A place change re-orders**: `panel.ts` re-runs its mode step when `harbour.place` changes (it subscribes to `appMode` only today), and opens the engine first on entering a place in Sail freely, as entering Harbour mode did.
5. **`m=harbour&learn=x`** keeps today's rule: `learn` is ignored after `m=harbour`.
6. **`modesForBoat`** stays (without `harbour`) and `activitiesForBoat` maps it through `activityOf` (no duplicates). Both default to the boat in use (`boat`, `boatId`); an unknown id has no exercises.
7. **Tests through `initialState`**: 12.8 test 2 builds the state with `initialState(parseUrlState(…))` (the parser leaves `appMode` undefined; `initialState` takes it from the ropes mode).
8. **Open water**: an old `m=harbour` link without `pl` opens plain Sail freely in open water: no engine-first order and, on the phone, no thruster keys (they need a place there; on the console they always work, M120). This is the one picture that changes, and the PR says so.
9. **Which choice leaves the phone's Mode tab**: the three activity choices call `onChosen` (as a mode choice does today); the two Controls choices do not.
10. **Controls disabled** while `state.exercise !== null`; `activity-choice-exercise` is checked while `appMode === 'exercise'`. Choosing Sail freely or Learn while an exercise is loaded ends it, as choosing another mode does today.
11. **Strings that say "Harbour mode"**: `thrusters.hint`, `keys.bowThruster`, `keys.sternThruster` (and any other `grep -n "Harbour mode" content/lang/en/ui.json` finds) say "at the marina or in the bay" instead, in every language.
12. **Check 3** reads the state, not the address bar: the chip's text and the phone's tab order (the address bar is rewritten only on the next change).
13. The sign-off also adds the part's ROADMAP decisions-log row and `docs/CODE_MAP.md` entries for every file of the part that is still missing.

### 12.11 Done when / not in this milestone

PR: `Closes #301`, `Closes #161`. Done when the picker offers the two choices on both layouts, Harbour mode is gone and Sail freely in a place does what it did, every old link of 12.4 opens as it says, every test of 12.8 and check of 12.9 passes, `npm run check` passes and the CI run with `CI groups: all` is green.

Not in this milestone: new activities (Quest, Race, Arcade, First person: later, section 1).

## 13. Decisions (owner)

**PR #293, comment of 2026-11-27** (the concept's ten questions):

1. Which screens get the console: agreed, then widened in chat (below): 2.1.
2. Do it myself on a phone stays, Watch first, Realistic exercises Watch only on a phone: agreed, for part B.
3. Mode split into "What you are doing" and "Controls", Harbour as a place: agreed: section 12.
4. Layout A, rearranged: every control always visible (no fold for the console); the wheel in the centre, the engine beside it always showing the thrusters; port and starboard lines as two blocks left and right; the sails status a small block over the wheel and engine; Mast and Bow only in a later first-person mode; no manual winch at the mast in Realistic; the anchor's controls in Harbour gear; Harbour gear always there, folded, unfolding by narrowing the other blocks; the conditions widget shows the compass and unfolds, with a setup mode for changing the wind; a place kept for a future navigation widget (compass and a small chart): sections 2.2, 8, 9, 10.
5. No moving or resizing of blocks in the app: agreed (section 1, out of scope).
6. Outline only the exact control a step needs (a line, one sail's status, the wind's direction), the way to be set by the plan: section 11 (a 2 s orange pulsing outline, the rest dimmed).
7. Phone: no glow; fade everything but the part, as Show it working does; zoom close to small parts: part B.
8.–10. Phone views and conditions, computer first, the later ideas kept for later: agreed.
- **The look**: "make controls more aesthetic and nice looking": section 2.3 and the picture page.
- **The pasted layout** (1920 × 1080, layout A): its sizes are used for the band (240 px), the blocks (216 px tall, 12 px in from the band's edges), the menu (128 px), the drawer (380 × 560), the step card (560 px) and the mini-map and chips (above the band); the order of the blocks follows answer 4.

**Chat, 2026-11-28** (this plan's four questions; owner: "Accept all except 3, thruster should be always unable. I have Samsung Fold 6, it should work with PC layout"):

1. In Realistic the captain still walks to the other side (or the helm) before its controls work: section 9.4, 8.2 (recommended; accepted).
2. The look: A, "instrument night" (recommended; accepted).
3. The order of work: the console replaces the computer layout from M119; no release before M124 (recommended; accepted). **Read as accepted**: the owner's "except 3" is read as meaning question 4, because the words that follow are about the thrusters. If that reading is wrong, the owner says so on the planning PR (question 1 there).
4. Thrusters: always there and always working, at sea too (owner; the recommendation was "only in a place"): 8.3, 8.6.
- **Fold 6**: the console rule takes in a nearly square window (`w / h ≥ 0.8`, at least 800 × 560): 2.1. The Fold 6's unfolded size, about 904 × 968 CSS px, is from a third-party listing of screen sizes (tinyfont-me.pages.dev), not from Samsung; the rule leaves room either way.
