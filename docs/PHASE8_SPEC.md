# Phase 8 specification: panel, status and your own setup

Status: **planned** (owner's answers in the planning chat, 2026-10-23; issues #77, #82, #100, #109, #110, #111, #112, #113) · Last updated: 2026-10-23

Read [`ROADMAP.md`](ROADMAP.md) first, then this file. Phase 8 builds on the panel of Phase 5 (sections and modes, `src/ui/modes.ts`, `src/ui/panel.ts`; the phone sheet, `src/ui/sheet.ts`; the wide layout's columns, `src/ui/columnHandles.ts`), the alert history of M36 (`src/model/alerts.ts`, `src/ui/alertCentre.ts`), Realistic mode (`src/model/realistic.ts`, `src/ui/realisticPanel.ts`) and the harbour work of Phase 7. The earlier specs still describe everything the app already does.

**Phase numbers changed on 2026-10-23** (owner): this phase was inserted as Phase 8, so the exercises are now **Phase 9** and more languages **Phase 10** (ROADMAP).

## 0. How to use this spec (for the coding agent)

- Do **one milestone** (sections 6–17), on the branch your session gives you, in one PR titled `M<N>: <name>`. Read sections 0–5 first every time; they apply to all milestones. Then read only your milestone's section. Milestones are built in order (M48 → M59); each needs the ones before it merged.
- Build order inside a milestone: data → pure helpers + tests → store/URL → UI → 3D → browser checks → docs.
- **Numbers are final.** Every number in this spec was chosen or prototyped on 2026-10-23 against the real code (3.5 says how). Boat numbers go into `content/boat/hanse508.json`, presentation numbers into `src/render3d/sceneConfig.ts` (`SCENE`) or the CSS, as each section says; never into code as bare literals. A number marked **tunable** may be changed only if a check fails after you have checked your code against 3.4 "common mistakes": change it, report the before and after values in the PR, and never widen a test band. A band that still fails is a question for the owner in the PR.
- **Text is data.** Every English string in this spec is final: copy it exactly. Russian strings are AI drafts (CLAUDE.md): copy the ones given; where none is given, write a draft yourself following PHASE4_SPEC 3.3. After any change to `content/lang/ru/*.json` run `npm run review-doc -- ru`.
- **Signatures, test ids, CSS classes.** Function names, signatures, `data-testid`s and classes named here are required, so milestones fit together and the browser checks find things. Keep them; add private helpers freely.
- **Write back.** If you decide something this spec leaves open, write it into your milestone's section under "Decided in the M<N> PR".
- **Everything earlier keeps working.** Every unit test stays green, every PHYSICS_TRUTHS test passes, every old link opens the same picture (the boat, the wind, the place, the camera; Phase 8 changes only where the panel shows things). An existing unit test or browser check may only be changed where your milestone section says so, or under the general rules of 3.7.
- **No sailing physics changes in this phase.** No formula of `src/model` that moves the boat, the rig or the ropes changes. M55 adds alert kinds; M57 makes the thrusters optional and lets another boat's numbers be used; neither changes a result for the Hanse 508.
- Sailing terms in UI text get a short explanation the first time they appear on a screen (CLAUDE.md).

## 1. Goal

The panel stays clear on a phone and a computer as the app grows, the boat's condition is in one place, and the learner can keep their own setup and try other boats of the same kind.

What the learner should feel:

> **I can find everything.** On a phone, five tabs under the handle say where things are: the mode, the controls, the conditions, Learn and Settings. On a computer the sections stay where I put them. "Where is it?" flies the camera to a part and fades everything else. One Status section tells me what is worn, what was hit, what is out and what went wrong. My setup and my boat travel with me in a file.

## 2. Scope

### In scope (Phase 8)

1. **Ropes as a list in Easy and Learn** (M48, issue #113): the clutch-bank drawing leaves the Ropes section in Easy and Learn mode; the rope chips (the list) and the selected rope's slider stay. Harbour mode with Easy ropes keeps the drawing; Realistic keeps its stations.
2. **"Show it working" and "Where is it?"** (M49, issue #77): Learn's two buttons get names that say what they do; both bring the camera close to the part and fade everything else (the spotlight) until the next tap. "Where is it?" comes closer.
3. **The winch handle in 3D** (M50, issue #82): the one winch handle is drawn where it is (lying at a station, or in a winch's or the mast gearbox's socket); tap once to select it, tap again to take it. The mast furling gearbox is redrawn from the owner's photo.
4. **Phone tabs** (M51, issue #100 item 7): Mode, Controls, Conditions, Learn (?) and Settings (gear) under the sheet's handle. Agreed from the mockup (`docs/mockups/phase8-panel.html`).
5. **Mode and Settings chips on the computer** (M52, issue #100 item 6): the Mode and Settings sections leave the wide layout; a "Mode: Easy ▾" chip and the gear open cards over the 3D view.
6. **Realistic: the Helm section** (M53, issue #100 item 5, owner's answer: the autopilot and the engine are worked from the Helm): the Helm station leaves the Ropes section's station bar and becomes a section of its own with the wheel, the autopilot, the engine lever, the thrusters and the windlass remote.
7. **Sections you can move** (M54, issue #110): on the wide layout a section can be dragged (or moved with a menu or the arrow keys) between the two columns and up or down; the arrangement is saved on the device; "Reset layout" in Settings.
8. **Status section** (M55, issue #109): the sails' wear and Repair, the gear (fenders, anchor, propeller), the damage list and the alert history with tag chips (Danger, Damage, Sail, Rope, Gear, Steering); damage, lost fenders, a fouled propeller and Realistic mode's rope and winch warnings join the history.
9. **Setup in a file** (M56, issue #111): Settings → Your setup: Save to a file, Load from a file (everything the link keeps, the language, and what this device remembers: column widths and folds, the folded time bar, the section layout).
10. **Boat profiles** (M57, M58, issue #112): a boat profile file (the boat file of the Hanse 508 with other numbers), the checks it must pass, "Download this boat's profile", a guide (`docs/BOAT_PROFILE.md`), boats without one or both thrusters; then a boat chooser and "Import a boat profile" in Settings, imported boats kept on the device, the link key `boat=`.
11. **Polish and sign-off** (M59): the M46 leftovers (the anchor sign under the map's wind label, arrow keys on the windlass buttons), a "Put the fenders out" hint when backing into a berth, accessibility and frame-rate checks.

### Out of scope

- **Other kinds of rig** (a genoa on tracks, slab reefing, a mainsheet traveller, a single wheel, two anchors): a profile describes a boat laid out like the Hanse 508 (owner: different yacht setups are a later "nice to have", after the main functions are polished).
- **A second built-in boat** (owner: later; the owner mentioned a "Hanse 303" or another small Hanse; to be chosen then).
- **Learn texts per boat** (owner: to be looked at later): the "On this boat" texts stay the Hanse 508's, with a note when another boat is chosen (M58).
- **Moving sections on a phone or in the one-column side layout** (issue #110: phones have one column; the tabs, M51, do the job there).
- **Sending an imported boat inside a link** (a link carries only the boat's id; the setup file carries the profile, M58).
- Exercises (Phase 9), new languages (Phase 10), any change to sailing, harbour or anchor physics.

If something here looks necessary, stop and ask in the PR.

## 3. Conventions and shared helpers

### 3.1 Conventions

| Topic | Convention |
|---|---|
| Layouts | `stacked` (phone, portrait), `side` (panel beside the view, one column), `wide` (side and 1,280 px or more: two columns), as `src/ui/layoutMode.ts` and `<html data-layout>` / `data-wide` decide today. "Phone" in this spec means `stacked`; "computer" means `wide`; "side" means `side` but not `wide`. |
| Boat frame | `meta.frame` of the boat file: origin at the mast on the waterline, **x forward, y up, z to starboard**, metres. |
| Angles (handle) | `HandleState.angle`: degrees, clockwise seen from above. In 3D the arm of a handle in a **winch** socket points along `(cos a, 0, sin a)` in the boat frame (0° towards the bow, 90° towards starboard). In the **mast gearbox** socket the arm turns in the y–z plane: `(0, cos a, sin a)` (0° up, 90° towards starboard). |
| UI state vs boat state | The open tab (M51), the spotlight (M49), the open cards (M52), the saved layout (M54) and the Status filter (M55) are UI state: never in the store, never in the link. The boat chosen (M58) is in the link (`boat=`). |
| Device storage | `localStorage` keys: `sail-learn.columns` (M39), `sail-learn.timeBarFolded` (M37), **`sail-learn.layout`** (M54), **`sail-learn.boats`** and **`sail-learn.boat`** (M58). Every read and write is in `try { … } catch { … }`; a value that cannot be read gives the default; a stored value is never trusted (parse it, check it). |
| Files | Saved files are JSON, UTF-8, written with `JSON.stringify(value, null, 2)` and offered through a temporary `<a download>` with a `Blob` (`type: 'application/json'`). Files are read with `<input type="file" accept=".json,application/json">` and `File.text()`; a file over 1,000,000 bytes is refused before it is read. |
| Touch targets | At least 44 × 44 px (`--touch`), except the 34 px section headers on a phone (M35) and the 27 px sheet handle strip (M51; its tabs row below it also drags the sheet). |
| Language | Every visible string through `t()`, in both `ui.json` files, same keys, same order. |
| Test ids | Every `data-testid` named in this spec is required. |

### 3.2 Shared helpers

| Helper | File | Signature | Behaviour |
|---|---|---|---|
| `fitDistance` | `src/render3d/cameraPresets.ts` (exists) | `fitDistance(box, target, direction, lens, margin?)` | Smallest camera distance along `direction` at which the box fits the lens with `margin`. M49 calls it with `margin = 1 / fill`, so the box takes `fill` of the view. |
| `focusPose` | `src/render3d/cameraPresets.ts` (M49) | `focusPose(box: { min: Vec3; max: Vec3 }, from: CameraPose, lens: Lens, fill: number, maxDistanceM: number, fovDeg?: number): CameraPose` | 7.3. |
| `requestSpotlight` / `onSpotlight` / `endSpotlight` / `spotlightNow` | `src/ui/spotlight.ts` (M49) | `requestSpotlight(partId: string, kind: 'where' \| 'show'): void`, `onSpotlight(listener: (s: Spotlight \| null) => void): void`, `endSpotlight(): void`, `spotlightNow(): Spotlight \| null` | A tiny event channel between the Learn section and the 3D view (6.3). |
| `handlePose` | `src/model/handlePose.ts` (M50) | `handlePose(realistic: RealisticState, data?: BoatData): HandlePose \| null` | Where the handle is drawn, or null while carried (8.3). |
| `createModePicker` | `src/ui/modePicker.ts` (M51) | `createModePicker(store: Store, onChosen?: () => void): HTMLElement` | The mode list (a button and a sentence per mode), shared by the phone's Mode tab (M51) and the computer's Mode card (M52). Replaces `src/ui/modeSection.ts`. |
| `sectionLayout` helpers | `src/ui/sectionLayout.ts` (M54) | `parseLayout`, `serializeLayout`, `completeLayout`, `moveSection` | 12.3. |
| `alertTag` | `src/model/alerts.ts` (M55) | `alertTag(entry: AlertEntry): AlertTag` | 13.3. |
| `createAlertList` | `src/ui/alertCentre.ts` (M55) | `createAlertList(store: Store, showLearn: (id: string) => void, options: { filter: boolean; idPrefix: 'alert' \| 'status-alert' }): HTMLElement` | The history list, used by the Attention card and the Status section. |
| `downloadJson` / `pickJsonFile` | `src/ui/files.ts` (M56) | `downloadJson(fileName: string, value: unknown): void`, `pickJsonFile(input: HTMLInputElement): Promise<string \| 'tooBig' \| null>` | 3.1 "Files". `null` when nothing was chosen. |
| `checkBoatProfile` | `src/model/boatProfile.ts` (M57) | `checkBoatProfile(raw: unknown, reference?: BoatData): ProfileCheck` | 15.3. |
| `useBoat` | `src/model/boat.ts` (M57) | `useBoat(id: string, name: string, data: BoatData): void` | Puts another boat in place of the Hanse 508 before the app starts (15.3). |

### 3.3 Sources

This phase adds no sailing rule and no PHYSICS_TRUTHS entry. Boat numbers that are guesses (the handle's resting places, the gearbox's sizes, M50) are rows in `docs/BOAT_REFERENCE.md` section 5 marked as assumptions; the gearbox's shape comes from the owner's photo `docs/reference/photos/mast-furling-gearbox.jpg`.

### 3.4 Common mistakes (check these first when something fails)

- **The mode decides the Ropes section's look, not only the ropes mode** (M48): Easy, Learn and Harbour with Easy ropes show the list (no drawing in any mode); Realistic ropes outside Learn show the stations.
- **A section moved, not rebuilt.** Sections are built once and moved between columns and tabs (M29, M51, M54). Building one twice duplicates test ids and listeners.
- **The spotlight is temporary.** It never changes the store's camera preset or the link; when it ends the camera glides back to the pose it left (M49).
- **Hidden meshes are not tappable.** The handle is hidden while carried and in Easy ropes; a hidden mesh must not be picked (`picking.ts` skips invisible objects; check it does for the handle's group).
- **Storage can throw.** Private windows refuse `localStorage`: every access in `try/catch`, the app works without it.
- **Old checks hard-code the panel.** The M25–M39 browser checks know the chip row, the sheet heights, the Mode and Settings sections and the station bar. Each milestone lists the checks it must change; change only those lines, and say so in the PR.
- **The boat object is shared.** `boat` (`src/model/boat.ts`) is read by about 90 files. M57 replaces it before the app starts; never copy it into a module-level constant in new code (read `boat.…` at call time, or take `data: BoatData = boat`).
- **A profile is data from outside.** Check it fully before using it (15.3); never `eval`, never put its strings into `innerHTML`.

### 3.5 How the numbers were made

- **Sheet heights (M51)**: `SHEET.peekPx` 100 → 128 (handle strip 27 + rule 1 + tabs 44 + quick row 56). The prototype ran `src/ui/sheetGeometry.ts` with 128: peek/half/full on 844 × (top 116) = 128 / 422 / 668; `cameraInsetPx('peek')` 188; the peek–half snap point 275 (a tie goes to the larger, so 275 → half, 274 → peek); `sheetHeightPx('half', { viewHeightPx: 160, topAreaPx: 40 })` 128.
- **Spotlight distances (M49)**: `fitDistance` with the lens `{ verticalFovDeg: 40, aspect: 0.8 }`, the pose `{ position: [0, 10, 30], target: [0, 5, 0] }` (direction (0, 0.1644, 0.9864)): a cleat-sized box (min (−0.1, 1.6, 2.1), max (0.1, 1.7, 2.3)) needs 0.794 m at fill 0.5 and 1.481 m at fill 0.25; a winch-sized box (min (−7.38, 1.55, 1.47), max (−7.12, 1.79, 1.73)) 1.041 m and 1.934 m; a boom-sized box (min (−6.5, 2.4, −0.15), max (0, 2.7, 0.15)) 22.496 m and 44.819 m.
- **Another boat (M57)**: the store's default start (`initialState()`, Sailing, 12 kn at 60°) stepped 120 s at 30 fps gives 6.810 kn and heel −10.54° for the Hanse 508; with `dimensions.massesKg.lightCraftStandardKeel` and `dimensions.displacementTonnes` × 0.6 and only the bow thruster it gives 6.903 kn and −9.79°, no NaN.

### 3.6 Browser-check conventions (every milestone)

- Each milestone has `scripts/shots-m<N>.mjs`, registered in `scripts/shots.mjs` (import, `SCENES`, `liveGroups`) with names written without the prefix, as Phases 5 and 7.
- **What `openPage` adds:** Phase 8 labels (`m48` … `m59`) are treated like Phase 7 ones (no `held=1`, `sea=flat`, `clock=0` or `mm=0` added) and, like the M27 and M35–M39 checks, **start with every section folded** (they open what they need). The M48 PR appends `|4[89]|5\d` inside each of the five label groups of `openPage` (`scripts/shots.mjs`): the four default rules (`held`, `sea`, `clock`, `mm`) and the "older checks open Ropes" rule, giving for example `/m([6-9]|1\d|2[5-9]|3[6-9]|4[0-7]|4[89]|5\d)/` and `/m(27|29|35|36|37|38|39|4[89]|5\d)/`. (`m5` and `m4a`/`m4b`/`m4c` do not match `5\d` or `4[89]`.)
- **Live checks run on the test clock** where app time matters (CLAUDE.md): `openPage(viewport, label, query, { testClock: true })`, waits with `page.waitForTimeout(ms)`, results polled with `page.waitForTimeout` (as `waitForLink` does). A CSS transition still needs `page.realWaitForTimeout(ms)`.
- Checks find things by `data-testid` or with `exact: true`; links are read with `waitForLink`. They open the panel, the settings, the mode and the camera **only through `scripts/ui.mjs`** (`showSection`, `openSettings`, `closeSettings`, `setMode`, `setCamera`, `setSheet`): M51 and M52 change those helpers so the older checks keep working.
- New helpers in `scripts/ui.mjs` (each milestone adds its own; signatures below):

```js
/** M51: on a phone, taps a panel tab ('mode' | 'controls' | 'conditions' | 'learn' | 'settings'); elsewhere does nothing. */
export async function showTab(page, tab) {}
/** M51: the open tab on a phone, or null elsewhere. */
export async function tabNow(page) {}
/** M54: moves a section on the wide layout with its grip menu: 'up' | 'down' | 'other'. */
export async function moveSectionBy(page, id, how) {}
/** M54: the section ids of column 1 and column 2 on the wide layout, top to bottom (hidden ones left out). */
export async function columnSections(page) {}
```

- **CI** (`.github/workflows/ci.yml`): the M48 PR adds a part `live, M48-M59` with `env: SHOTS_NO_SCENES=1 SHOTS_NO_TAPS=1 SHOTS_ONLY=m48,m49,m50,m51,m52,m53,m54,m55,m56,m57,m58,m59` (later groups join as they appear; a name with no group yet is skipped) and appends `,m48,m49,m50,m51,m52,m53,m54,m55,m56,m57,m58,m59` to the `SHOTS_SKIP` list of the part `live, M30 on`. If the new part takes more than about 10 minutes (each group prints its time), a later milestone splits it in two.
- Scenes (pictures) of this phase use the phone and the 1,440 × 900 desktop sizes.

### 3.7 General rules for every milestone

- **Changing an older check.** A milestone changes an older browser check only where its section names it, and only the lines that test what the milestone changes (a selector, an expected list, a height). The check's purpose stays; say in the PR which checks changed and why.
- **Strings.** New keys go into both `ui.json` files at the place stated (or, if none is stated, after the keys of the same prefix). Removed keys are removed from both. `tests/languages.test.ts` must stay green.
- **Accessibility.** Every new control has an accessible name; the audit (`scripts/a11y-audit.mjs`, `auditPage`) runs on each new screen in the milestone's checks; `SMALL_OK` gets a selector only where 3.1 allows a smaller target.
- **Code map.** Every PR that adds, removes or renames a file, or moves a responsibility, updates `docs/CODE_MAP.md`.
- **No new dependencies** (CLAUDE.md: few, pinned). Drag and drop, files and JSON need none.

## 4. Architecture

### 4.1 New state

No new `AppState` field in this phase except through existing parts:

```ts
// src/model/alerts.ts (M55): more kinds and three optional fields on an entry
ALERT_KINDS = [...today's nine, 'contact', 'ropeSlipping', 'winchCutOut', 'clutchOnRunning']
interface AlertEntry { …; contact?: ContactReport; rope?: string; winch?: string }
// AlertSource (the parts of AppState the log reads) gains: contact, realistic.

// src/model/boat.ts (M57)
export let boat: BoatData;      // the Hanse 508 unless useBoat() ran first
export let boatId: string;      // 'hanse508'
export let boatName: string;    // 'Hanse 508'
```

UI state (not in the store): the open tab (`src/ui/panelTabs.ts`, M51), the open card (`src/ui/chipCard.ts`, M52), the spotlight (`src/ui/spotlight.ts`, M49), the saved section layout (`src/ui/sectionLayout.ts` + `localStorage`, M54), the Status filter (M55).

### 4.2 URL keys

| Key | Milestone | Values | Default | Written |
|---|---|---|---|---|
| `boat` | M58 | a boat id: lower-case letters, digits and `-`, 1–40 characters | `hanse508` (no key) | first, right after `v=1`, only when the boat is not the Hanse 508 |

No other key changes. `st=helm` keeps its meaning (the user stands at the helm); from M53 it also opens the Helm section. Old links (no `boat=`) open the Hanse 508 exactly as today.

### 4.3 Sections, tabs and layouts

Phase 5 provides `SECTION_IDS`, `MODE_LAYOUTS`, `sectionAvailable`, `WIDE_ONLY_SECTIONS` (`src/ui/modes.ts`) and `createSection` (`src/ui/sections.ts`). Phase 8 changes them as follows (each milestone gives the full table as it is after it):

| Milestone | Change |
|---|---|
| M51 | `mode` and `settings` become available on the **phone** too (they are the Mode and Settings tabs); `WIDE_ONLY_SECTIONS` is replaced by `TAB_OF` (which tab each section belongs to on a phone). |
| M52 | `mode` and `settings` are available **only on the phone** (`stacked`); on `side` and `wide` the chips open cards instead. |
| M53 | New section `helm` (Realistic ropes only), after `ropes`. |
| M54 | On the wide layout the columns come from the saved layout (or `DEFAULT_WIDE_LAYOUT`), not from `MODE_LAYOUTS[mode].second`; `second` is removed. |
| M55 | New section `status`, always available, after `harbour`. |

**Final `SECTION_IDS` (after M55):** `mode, ropes, helm, sails, autopilot, engine, conditions, learn, place, anchor, harbour, status, settings`.

**Final `sectionAvailable(id, state, layout)`** (the third argument becomes the layout kind `'stacked' | 'side' | 'wide'` in M51; today it is a `wide` boolean):

| Section | Available when |
|---|---|
| `autopilot`, `engine`, `anchor` | `settings.ropesMode === 'easy'` (unchanged) |
| `helm` | `settings.ropesMode === 'realistic'` (M53) |
| `mode`, `settings` | `layout === 'stacked'` (M52; M51: always except `side`) |
| every other | always |

### 4.4 Files by milestone

A summary; each milestone's own "Files" list is the complete one and wins where they differ.

| Milestone | New | Changed (main) |
|---|---|---|
| M48 | `scripts/shots-m48.mjs` | `src/ui/ropesTab.ts`, both `ui.json`, `scripts/shots-m4a.mjs`, `scripts/shots.mjs`, `.github/workflows/ci.yml` |
| M49 | `src/ui/spotlight.ts`, `scripts/shots-m49.mjs` | `src/render3d/cameraPresets.ts`, `src/render3d/cameraRig.ts`, `src/render3d/scene.ts`, `src/render3d/sceneConfig.ts`, `src/ui/learnTab.ts`, `src/ui/labels3d.ts`, both `ui.json`, `tests/cameraPresets.test.ts` |
| M50 | `src/model/handlePose.ts`, `src/render3d/boat/winchHandle.ts`, `tests/handlePose.test.ts`, `scripts/shots-m50.mjs` | `content/boat/hanse508.json`, `src/render3d/boat/rig.ts` (gearbox), `src/render3d/boat/index.ts`, `src/render3d/scene.ts`, `docs/BOAT_REFERENCE.md` |
| M51 | `src/ui/panelTabs.ts`, `src/ui/modePicker.ts`, `scripts/shots-m51.mjs` | `src/ui/panel.ts`, `src/ui/modes.ts`, `src/ui/sheet.ts`, `src/ui/sheetGeometry.ts`, `src/ui/modeChip.ts`, `src/ui/settingsMenu.ts`, `src/style.css`, `tests/sheet.test.ts`, `tests/modes.test.ts`, `scripts/ui.mjs`, older checks (9.8) |
| M52 | `src/ui/chipCard.ts`, `scripts/shots-m52.mjs` | `src/app/app.ts`, `src/ui/modeChip.ts`, `src/ui/settingsMenu.ts`, `src/ui/chipMenu.ts`, `src/ui/panel.ts`, `src/ui/modes.ts`, `src/ui/labels3d.ts`, `src/style.css`, `tests/modes.test.ts`, `scripts/ui.mjs`, older checks (10.8) |
| M53 | `scripts/shots-m53.mjs` | `src/ui/realisticPanel.ts`, `src/ui/panel.ts`, `src/ui/modes.ts`, both `ui.json`, `tests/modes.test.ts`, `scripts/ui.mjs`, older checks (11.8) |
| M54 | `src/ui/sectionLayout.ts`, `src/ui/sectionMove.ts`, `tests/sectionLayout.test.ts`, `scripts/shots-m54.mjs` | `src/ui/panel.ts`, `src/ui/sections.ts`, `src/ui/modes.ts`, `src/ui/settingsMenu.ts`, `src/ui/columnHandles.ts`, `src/ui/timeBar.ts`, both `ui.json`, `src/style.css`, older checks (12.8) |
| M55 | `src/ui/statusPanel.ts`, `scripts/shots-m55.mjs` | `src/model/alerts.ts`, `src/ui/sectionLayout.ts`, `scripts/ui.mjs`, `src/ui/alertCentre.ts`, `src/ui/sailsPanel.ts`, `src/ui/placePanel.ts`, `src/ui/panel.ts`, `src/ui/modes.ts`, `content/boat/hanse508.json`, both `ui.json`, `tests/alerts.test.ts`, older checks (13.8) |
| M56 | `src/app/setupFile.ts`, `src/ui/deviceSettings.ts`, `src/ui/files.ts`, `tests/setupFile.test.ts`, `scripts/shots-m56.mjs` | `src/ui/settingsMenu.ts`, both `ui.json` |
| M57 | `src/model/boatProfile.ts`, `tests/boatProfile.test.ts`, `docs/BOAT_PROFILE.md`, `scripts/shots-m57.mjs` | `src/model/boat.ts`, `src/model/thrusters.ts`, `src/app/store.ts`, `src/ui/thrusterPanel.ts`, `src/render3d/boat/thrusters.ts`, `src/ui/settingsMenu.ts`, `content/boat/hanse508.json` (`meta.id`, `meta.name`), both `ui.json` |
| M58 | `src/app/boatStore.ts`, `tests/boatStore.test.ts`, `scripts/shots-m58.mjs` | `src/main.ts`, `src/app/urlState.ts`, `src/app/setupFile.ts`, `src/ui/settingsMenu.ts`, `src/ui/learnTab.ts`, both `ui.json`, `tests/urlState.test.ts` |
| M59 | `scripts/shots-m59.mjs` | as 17.1 |

## 5. Milestones overview

Each milestone is one PR, small enough to check on a phone in 15 minutes. **Independent review: required** means the owner runs `/review <PR>` (new Code session, Opus, high effort) as soon as the PR opens, before testing it on the phone.

| Milestone | Section | What the owner sees | Issue | Depends on | Independent review |
|---|---|---|---|---|---|
| M48 | 6 | Easy and Learn: Ropes is the rope chips and the selected rope's slider, no clutch drawing | #113 | Phase 7 | not needed (one section's content; Harbour and Realistic unchanged) |
| M49 | 7 | "Show it working" and "Where is it?": the camera comes close and the rest fades until the next tap | #77 | M48 | not needed (camera and drawing only; nothing in the store or the link) |
| M50 | 8 | The winch handle on the boat where it lies; tap twice to take it; the mast gearbox as in the photo | #82 | M49 | **required** (a 3D tap now changes Realistic state: the station and the handle) |
| M51 | 9 | Phone: tabs Mode · Controls · Conditions · ? · gear under the handle | #100 (7) | M50, owner's OK on the mockup | **required** (rebuilds the phone panel every earlier check uses; old links and sheet heights) |
| M52 | 10 | Computer: "Mode: Easy ▾" and gear chips with cards; no Mode and Settings sections | #100 (6) | M51 | **required** (rebuilds the settings and mode pickers on two layouts) |
| M53 | 11 | Realistic: a Helm section with the wheel, autopilot, engine, thrusters and windlass remote | #100 (5) | M52 | **required** (Realistic stations, `st=helm` links, an earlier phase's behaviour) |
| M54 | 12 | Computer: drag sections between columns and up or down; Reset layout | #110 | M53 | **required** (the wide layout's placement and stored data) |
| M55 | 13 | Status section: sails, gear, damage, history with tag chips; new history entries | #109 | M54 | **required** (new alert kinds read from shared state; the history model) |
| M56 | 14 | Settings: save your setup to a file, load it again | #111 | M55 | **required** (loads links and stored data from a file) |
| M57 | 15 | Settings: download the boat's profile; the guide; (tests: another boat sails, a boat without thrusters) | #112 | M56 | **required** (the boat data behind every model; optional thrusters) |
| M58 | 16 | Settings: choose a boat, import a profile; the app reloads with it | #112 | M57 | **required** (startup, links, stored profiles) |
| M59 | 17 | Leftovers and sign-off | — | M58 | not needed (small fixes, checks and docs) |

**Mockup agreed:** the owner accepted the mockup on the planning PR #115 ("Accept all", 2026-10-23), so M51 can start once M50 is merged. The mockup is `docs/mockups/phase8-panel.html`.

---
## 6. M48: Ropes as a list in Easy and Learn

**Independent review: not needed** (one section's content changes; Harbour and Realistic keep theirs; no state, model or link change).

Issue #113. Owner's answer 2 (planning chat): "Make Learn and Easy mode ropes the same, only the rope chips are left, remove the visualisation of ropes with clutches."

### 6.1 Files

`src/ui/ropesTab.ts`, `content/lang/en/ui.json`, `content/lang/ru/ui.json`, `docs/review/ru.md` (regenerated), `scripts/shots-m4a.mjs`, `scripts/shots.mjs` (labels, 3.6; register M48), `.github/workflows/ci.yml` (3.6), new `scripts/shots-m48.mjs`, `docs/CODE_MAP.md` (the `ropesTab.ts` line).

### 6.2 What the Ropes section shows

| `appMode` | `settings.ropesMode` | Ropes section shows |
|---|---|---|
| `easy` | `easy` | the strip and the list (**no drawing**) |
| `learn` | `easy` | the strip and the list (**no drawing**) |
| `learn` | `realistic` | the strip and the list, **read-only** (6.3), no drawing, no stations |
| `harbour` | `easy` | the strip and the list (**no drawing**; owner's change on the M48 PR) |
| `harbour` | `realistic` | the stations (as today) |
| `realistic` | `realistic` | the stations (as today) |

In `createRopesTab` (`src/ui/ropesTab.ts`):

- `showMode(state, previous)` runs when `appMode` **or** `ropesMode` changes (today only `ropesMode`). The Easy block (`ropes-easy`) shows when `ropesMode === 'easy' || appMode === 'learn'`; the Realistic block (`ropes-realistic`) shows when `ropesMode === 'realistic' && appMode !== 'learn'`.
- The drawing (`drawing.element`, test id `clutch-drawing`, an SVG element, which has no `hidden` property) and the explain paragraph with `clutch.hint` go into one wrapper `<div class="clutch-block" data-testid="clutch-block">`; the wrapper's `hidden` is set unless `appMode === 'harbour'`. Keep calling `drawing.refresh` (it is cheap; it keeps the drawing right when Harbour shows it).
- The empty strip's text (`.strip-empty`) is `t('ropes.strip.emptyList')` when the drawing is hidden and `t('ropes.strip.empty')` when it shows.
- The explain line `ropes-mode` ("Easy mode: tap a clutch, then use its slider.") shows `ropes.mode.easyShortList` (new, 6.4) while the drawing is hidden and `ropes.mode.easyShort` (unchanged) while it shows (Harbour); it is hidden while the read-only note (6.3) shows.

### 6.3 Read-only in Learn mode with Realistic ropes

With Realistic ropes the clutches, winches and hands move the ropes every step (`stepRealistic`), so a slider would be pulled back at once. In Learn mode with `ropesMode === 'realistic'`:

- every `input` and `button` inside the local `strip` element that `createRopesTab` builds (not the Realistic panel's `real-strip`) is `disabled`, except the "Read more in Learn" button (`strip-learn`); the `details`/`summary` stay usable;
- a note shows under the strip: `<p class="hint" data-testid="ropes-learn-realistic">` with `t('ropes.learnRealistic')`;
- the list rows still select (a tap lights the rope up in 3D and shows its strip with the value).

Switching to Easy ropes, or out of Learn mode, removes `disabled` and hides the note. Use one function `setReadOnly(on: boolean)` in `ropesTab.ts`, called from `showMode` (nothing else in `ropeControls.ts` or `stepper.ts` sets `disabled`, so `setReadOnly(false)` may enable every control of the strip).

### 6.4 Strings

| Key | English | Russian (draft) |
|---|---|---|
| `ropes.strip.emptyList` (new, after `ropes.strip.empty`) | Tap a rope in the 3D view or in the list below to work it. | Нажмите на конец в 3D-виде или в списке ниже, чтобы работать с ним. |
| `ropes.learnRealistic` (new, after `ropes.strip.emptyList`) | Realistic ropes: you work this rope at its station. Choose Realistic mode to work it. | Реалистичные концы: с этим концом работают на его месте. Выберите реалистичный режим, чтобы работать с ним. |
| `ropes.mode.easyShortList` (new, after `ropes.mode.easyShort`) | tap a rope in the list, then use its slider. | нажмите на конец в списке, затем двигайте его ползунок. |
| `quick.easy` (changed) | Tap a rope: its − and + appear here. | Нажмите на конец: здесь появятся − и +. |

`ropes.strip.empty`, `ropes.mode.easyShort` and `clutch.hint` stay (Harbour mode uses them).

### 6.5 Older checks to change

- `scripts/shots-m4a.mjs` (`liveM4aChecks`, run by the live group `general`), the first live block (the loop over `[viewports[0], viewports[2]]`): the clutch part (from "Clutch "Vang" → vang selected" to the static ropes' info lines) needs the drawing, which now shows only in Harbour mode. Inside the same loop iteration: open that part's page with `'?cam=side-port&debug=1&lb=0&m=harbour'` (same `openPage` options as today), call `await showSection(page, 'ropes')` before the first clutch tap (the `setSheet(page, 'full')` stays), and close its context after the static ropes. Then open a second page in the same iteration with today's query (`'?cam=side-port&debug=1&lb=0'`) for the rest (the 3D tap on the topping lift, the step size, the wheel), which keeps its lines unchanged (it starts with `showSection(page, 'conditions')` and `setSheet(page, 'peek')` as today). The "Share" block after the loop is untouched.
- `scripts/a11y-audit.mjs`: no change (`.clutch-drawing .clutch` still exists in Harbour mode).

### 6.6 Tests

No unit test changes (the section is DOM). `npm test` stays green.

### 6.7 Browser checks (`scripts/shots-m48.mjs`)

Scenes (phone and desktop): `easy-ropes-list` `?sel=rope_vang&cam=side-port` and `learn-realistic-ropes` `?mode=realistic&m=learn&sel=rope_vang&cam=side-port`, each with `section: 'ropes'` in its entry (as the `m4a-ropes-list` scene does: it raises the sheet before opening).

Live checks (registered as `m48: () => liveM48Checks(live)`: no app-time dependence; phone, then the 1,440 × 900 desktop; `showSection(page, 'ropes')` first in each):

1. **Easy, no drawing:** `?cam=side-port`: `clutch-drawing` is hidden, `ropes-easy` is visible, the list has at least 10 `.rope-item` rows; tap `[data-select="rope_vang"]` → `waitForLink(page, ['sel=rope_vang'])`, the Vang slider (`getByLabel('Vang', { exact: true })`) is visible; the empty-strip text before the tap (`[data-testid="ropes-easy"] .strip-empty`) is "Tap a rope in the 3D view or in the list below to work it.".
2. **Learn with Easy ropes:** `?m=learn&sel=rope_vang&vg=50`: no drawing; tap the strip's + button (`getByRole('button', { name: 'More: Vang' })`) → `waitForLink(page, ['vg=55'])` (the default step is 5 %).
3. **Learn with Realistic ropes:** `?mode=realistic&m=learn&sel=rope_vang`: `ropes-easy` visible, `ropes-realistic` hidden, `ropes-learn-realistic` visible, the + button is disabled; then `setMode(page, 'easy')` (choosing Easy also sets the ropes mode to Easy) and `showSection(page, 'ropes')` again → the note is hidden and the + button is enabled.
4. **Harbour keeps the drawing:** `?m=harbour`: `clutch-drawing` visible after `showSection(page, 'ropes')`.
5. **Realistic keeps the stations:** `?mode=realistic`: `ropes-realistic` visible, `clutch-drawing` hidden.
6. **Quick row (phone only):** `?cam=side-port`, `setSheet(page, 'peek')`: the quick row's text is "Tap a rope: its − and + appear here.".
7. `auditPage(page, 'm48 ropes list')` on the phone with Ropes open: no problems.

### 6.8 Done when

The table of 6.2 holds in all six rows on a phone and a computer; the M4a checks pass in their new form; typecheck, lint, tests, build and `SHOTS_ONLY=general,m48,m27,m35` pass (`general` runs the M4a checks).

### 6.9 Not in M48

Removing the drawing's code (Harbour uses it), changing the list's look, the Realistic stations, the quick row in other modes.

### 6.10 Decided in the M48 PR

- **Owner's answer on PR #116:** "in harbour mode clutch-bank drawing to be removed, it should be aligned with Easy and Learn. Accepted open question." So **no mode draws the clutch banks any more**: `clutchDrawing.ts` is deleted, and the keys `ropes.strip.empty`, `ropes.mode.easyShort` and `clutch.hint` are removed from both `ui.json` files. This replaces 6.2's Harbour row, 3.4's first bullet, the `clutch-block` wrapper and check 4 of 6.7 (Harbour now checks the list and no drawing), and 6.5: the M4a clutch checks click the list rows instead of the drawing, on one page and without `m=harbour`. The question about 9 rows is accepted (decided in the M48 PR).
- The ropes-mode explain line is one paragraph (`ropes-mode`) whose text part is swapped in `showMode`; the whole paragraph is hidden while the read-only note shows (decided in the M48 PR).
- The list has 9 `.rope-item` rows (the entries of `panelEntries()`), not 10 as 6.7 check 1 said; the check asks for at least 9 (decided in the M48 PR).
- `showMode` also sets the empty-strip text and the drawing wrapper, so a mode change (not only a ropes-mode change) updates the section (decided in the M48 PR).

---

## 7. M49: "Show it working" and "Where is it?"

**Independent review: not needed** (the camera and the drawing only; nothing in the store or the link; no model change).

Issue #77. Owner's answer 3: keep both buttons with clearer names; both zoom in and fade the rest until the next tap; "Where is it?" zooms in closer.

### 7.1 Files

New `src/ui/spotlight.ts`, `scripts/shots-m49.mjs`. Changed: `src/render3d/cameraPresets.ts` (`focusPose`), `src/render3d/cameraRig.ts` (`focus`, `endFocus`), `src/render3d/scene.ts` (spotlight drawing, debug hooks), `src/render3d/sceneConfig.ts` (`SCENE.spotlight`), `src/ui/learnTab.ts`, `src/ui/panel.ts` (passes the sheet to `createLearnTab`), `src/ui/labels3d.ts` (fade the other labels), `src/ui/sheet.ts` only if needed for 7.5 (use the existing `setHeight`), `src/style.css`, both `ui.json`, `docs/review/ru.md`, `tests/cameraPresets.test.ts`, `scripts/shots.mjs`, `docs/CODE_MAP.md`.

### 7.2 Data (`src/render3d/sceneConfig.ts`, new block `SCENE.spotlight`, after `highlight`)

```ts
/** M49 (issue #77): the spotlight of "Where is it?" and "Show it working". */
spotlight: {
  /** The veil over everything else. */
  dimColor: '#06121c',
  dimOpacity: 0.62,
  /** Share of the free view the part's box takes: "Where is it?" (closer) and "Show it working". */
  whereFill: 0.8, // decided in the M49 PR (was 0.5), 7.12
  showFill: 0.25,
  /** Never closer than this, metres (the orbit's own limit is SCENE.camera.minDistance, 3 m). */
  minDistanceM: 1.2,
  /** A part drawn several times in one mesh (cleats, fenders): the box around the nearest one, half-size in metres. */
  instanceHalfM: 0.15, // decided in the M49 PR (was 0.3), 7.12
  /** Labels in 3D of other parts fade to this opacity. */
  otherLabelOpacity: 0.25,
},
```

All six are presentation values (**tunable**, 0 §"Numbers are final").

### 7.3 Pure helper and the event channel

`focusPose` in `src/render3d/cameraPresets.ts`:

```ts
/**
 * M49: the camera pose that shows `box` filling `fill` of the view: the target moves to the box's
 * centre, the direction from the target to the camera stays as in `from`, the distance is
 * max(SCENE.spotlight.minDistanceM, fitDistance(box, centre, direction, lens, 1 / fill)),
 * at most `maxDistanceM`.
 */
export function focusPose(box, from: CameraPose, lens: Lens, fill: number, maxDistanceM: number, fovDeg: number = SCENE.camera.verticalFovDeg): CameraPose
```

- `direction = normalize(from.position − from.target)`; if that length is below 1e−6 use `viewDirection(90, 6)` (the side view).
- `position = centre + direction · distance`, `target = centre`, `fovDeg` as given (the fit uses `lens`).

`src/ui/spotlight.ts` (no DOM, no three.js):

```ts
export type SpotlightKind = 'where' | 'show';
export interface Spotlight { partId: string; kind: SpotlightKind }
export function requestSpotlight(partId: string, kind: SpotlightKind): void; // replaces any spotlight
export function endSpotlight(): void;                                      // no-op when none
export function spotlightNow(): Spotlight | null;
export function onSpotlight(listener: (spotlight: Spotlight | null) => void): void;
```

### 7.4 3D (`src/render3d/scene.ts`, `cameraRig.ts`)

**Which meshes.** The spotlit meshes are the meshes **under `boatModel.root`** whose `userData.partId` is in `highlightIds(partId)` (`src/model/panelEntries.ts`, as the highlight uses) and that are visible (`object.visible` up the tree). If there are none (a part drawn in the world group, like `env_quay`, or a hidden part), the request does nothing beyond today's selection, and `spotlightNow()` is reset to null.

**Box (world space; the camera works in world space).** For each spotlit mesh: if it has more than one `userData.hitPoints` (a part drawn several times in one mesh, such as the six cleats, the fenders, the fairleads), take the hit point nearest to the camera (the points are in the mesh's frame: apply `mesh.matrixWorld`) and a cube of half-size `SCENE.spotlight.instanceHalfM` (0.15 m, tuned in the M49 PR) around it: one instance; otherwise the mesh's world box (`new THREE.Box3().setFromObject(mesh)`). The box is the union of these. It is computed **once** when the spotlight starts (and again on a viewport change, below); the boat's rocking afterwards is not followed.

**Camera.** `CameraRig` gets:

```ts
/** M49: glides (SCENE.camera.transitionS) to focusPose(box, from, lens, fill, maxDistanceM); `from` is the pose the
 * camera is at or gliding to. Stores box, fill and maxDistanceM while the focus lasts. Lets the orbit come as close as
 * the focus distance (controls.minDistance = min(SCENE.camera.minDistance, d · 0.999)). */
focus(box: { min: Vec3; max: Vec3 }, fill: number, maxDistanceM: number): void;
/** M49: ends the focus. glide = true: glides back to the pose of the current preset recomputed for the current lens
 * (presetPose, or lastFreePose for a free camera), then puts the orbit limits back. glide = false (the user dragged):
 * stays; controls.minDistance goes back to SCENE.camera.minDistance only once the camera is that far out (until then it
 * stays at the current distance). No-op without a focus. */
endFocus(glide: boolean): void;
/** M49: runs once per hand gesture, on its first real movement (the first OrbitControls 'change' while interacting), whatever the preset. */
onUserDrag(listener: () => void): void;
/** M49: the pose now (position, target, field of view); the debug hooks read it. */
pose(): CameraPose;
```

- `focusPose` gets the rig's whole-boat `lens` (the one `setViewport` builds) and returns `fovDeg: SCENE.camera.verticalFovDeg`: the focus always uses the standard lens, also when it starts from the Helm view (64°).
- `maxDistanceM`: "Where is it?" `SCENE.camera.maxDistance` (140 m); "Show it working" the distance of `from` (`|position − target|`), so it only ever comes closer.
- **While a focus lasts**, `setViewport` (a sheet height change, a turned phone) recomputes `focusPose` with the stored box, fill and maxDistance from the pose the camera would go back to (`poseFor(currentPreset)`: the preset's new pose, or `lastFreePose` for a free camera moved by hand), instead of going back to the preset; `goTo` (a camera preset chosen) drops the focus without gliding back (its own glide runs) and does not write the focus pose into `lastFreePose`; `update` does not write `lastFreePose` while a focus lasts.

**The veil.** While a spotlight is on, each frame is drawn in three passes with `renderer.autoClear = false` (put it back afterwards):

1. the scene as today (`renderer.clear()`, then `renderer.render(scene, camera)`);
2. a full-screen quad (its own `THREE.Scene` and an `OrthographicCamera(-1, 1, 1, -1, 0, 1)`), `MeshBasicMaterial({ color: SCENE.spotlight.dimColor, transparent: true, opacity: SCENE.spotlight.dimOpacity, depthTest: false, depthWrite: false })`;
3. the spotlit meshes only, again: give them **and every light of the scene** (hemisphere, sun, fill and any other) `layers.enable(1)` while spotlit (three.js lights a mesh only with lights on the camera's layers), set `camera.layers.set(1)` and `renderer.shadowMap.autoUpdate = false` for this pass, render the scene without clearing (the depth buffer of pass 1 keeps the parts of them that something solid hides hidden; the water does not write depth, so a spotlit keel or rudder shows through it, which is wanted), then `camera.layers.set(0)`, `shadowMap.autoUpdate = true`, and `layers.disable(1)` on all of them when the spotlight ends.

`renderer.info.autoReset = false` with `renderer.info.reset()` at the start of each frame, so the debug overlay's draw calls count all passes. The highlight tint (`createHighlighter`) still applies to the selected part.

**Labels in 3D** (`src/ui/labels3d.ts`): the labels' layer element gets the CSS variable `--label-faded` set to `SCENE.spotlight.otherLabelOpacity` when it is created; while a spotlight is on, every label whose id is not in `highlightIds(partId)` gets the class `label-faded` (CSS `opacity: var(--label-faded)`), also a label created while the spotlight is on. (Labels exist only with Labels in 3D on, `lb=1`.)

**Ends.** The spotlight ends (`endSpotlight()`, the veil and the fading go):

- with `rig.endFocus(true)` (glide back): on the next `pointerdown` anywhere in the page **except on the 3D canvas** (a capture listener on `document`, added on the next animation frame after the spotlight starts so the tap that started it does not end it), on the Escape key, and on a **tap on the 3D canvas**: the tap callback of `listenForTaps` in `scene.ts` (it runs on `pointerup`, after OrbitControls' 'start', so the glide it begins is not cancelled) calls `endSpotlight()` and `rig.endFocus(true)` before it dispatches `select`;
- with `rig.endFocus(false)` (stay): on a hand gesture on the 3D view (`rig.onUserDrag`, on its first real movement);
- with no glide (the camera is moved anyway): a change of `state.selection` to a different, non-null part (a tap on the sky selects null: that is the canvas tap above), a change of `appMode`, a change of `settings.detail` (the boat model is rebuilt), `rig.goTo`, and a `popstate` event (Back).

### 7.5 UI (`src/ui/learnTab.ts`)

- The button `learn-show-on-boat` is labelled `t('learn.whereIsIt')`. On a tap: `store.dispatch({ type: 'select', partId: entry.id })` (as today), then on a phone lower a sheet that is at full to half (`sheet.setHeight('half')`; `createLearnTab` gets the sheet's `setHeight` and `height` through a new last parameter `sheetControl?: { height(): SheetHeight; setHeight(h: SheetHeight): void }`, passed by `panel.ts`), then `requestSpotlight(entry.id, 'where')`.
- The button `learn-show-me` is labelled `t('learn.showItWorking')`. On a tap: as today (`setAppMode` learn, `openScene`, the status text), then on a phone lower a full sheet to half as above, then `requestSpotlight(entry.id, 'show')`. The scene's camera preset glides first; `focus` starts from the pose the camera is gliding to (7.4), so the order does not matter.
- The scene subscribes with `onSpotlight` and does 7.4.

### 7.6 Strings

| Key | English | Russian (draft) |
|---|---|---|
| `learn.showItWorking` (replaces `learn.showMe`; same place) | Show it working | Показать в работе |
| `learn.whereIsIt` (replaces `learn.showOnBoat`; same place) | Where is it? | Где это? |
| `learn.spotlightHint` (new, after `learn.whereIsIt`) | Tap anywhere to see the whole boat again. | Нажмите в любом месте, чтобы снова увидеть всю яхту. |

`learn.spotlightHint`: each rendered entry that has at least one of the two buttons gets one `<p class="hint" data-testid="learn-spotlight-hint" hidden>`, placed right after the last of the two button containers it has (`.learn-links`, else `.learn-show-me`). `createLearnTab` subscribes once (`onSpotlight`, outside `render`) and shows the current entry's hint while a spotlight is on. Remove `learn.showMe` and `learn.showOnBoat` from both files; update the code comments that name "Show me" or "Show on the boat" in `learnTab.ts`. (Other files' comments and the earlier specs keep the old names: they describe history.)

### 7.7 Debug hooks (`window.__sailDebug`, `?debug=1` only)

- `spotlight(): { partId: string; kind: 'where' | 'show'; distanceM: number } | null`: the spotlight now and the camera's distance to its target (from `rig.pose()`).
- `cameraPose(): { position: Vec3; target: Vec3 }`: where the camera is now (`rig.pose()`).

### 7.8 Tests (`tests/cameraPresets.test.ts`)

`focusPose`, lens `{ verticalFovDeg: 40, aspect: 0.8 }`, from `{ position: [0, 10, 30], target: [0, 5, 0], fovDeg: 40 }`, `maxDistanceM` 140 unless stated (prototype values, 3.5; `toBeCloseTo(value, 2)`):

1. Cleat box (min (−0.1, 1.6, 2.1), max (0.1, 1.7, 2.3)), fill 0.5 → distance 1.2 (the minimum; the fit alone is 0.794); target (0, 1.65, 2.2).
2. Same box, fill 0.25 → 1.481.
3. Winch box (min (−7.38, 1.55, 1.47), max (−7.12, 1.79, 1.73)), fill 0.5 → 1.2; fill 0.25 → 1.934.
4. Boom box (min (−6.5, 2.4, −0.15), max (0, 2.7, 0.15)), fill 0.5 → 22.496; fill 0.25 with `maxDistanceM` = 30.414 (the from-pose's distance) → 30.414.
5. The direction from the target to the camera is (0, 0.1644, 0.9864) in every case (`toBeCloseTo(…, 4)`).

### 7.9 Browser checks (`scripts/shots-m49.mjs`, test clock, `debug=1`)

Scenes: `where-is-it-winch` (phone): `?m=learn&learn=winch_primary_starboard&debug=1&held=1&sea=flat&lb=1`, after a click on `learn-show-on-boat` (scene `click: ['learn-show-on-boat'], waitMs: 1200`).

Live (phone, then desktop):

Every page here adds `held=1&sea=flat` (the boat does not rock, so the box stays put).

1. `?m=learn&learn=winch_primary_starboard&debug=1&held=1&sea=flat&lb=1`, `showSection(page, 'learn')`, then on the phone `setSheet(page, 'half')`; read `cameraPose()`; tap `learn-show-on-boat`; wait 1 s (app time) and `page.realWaitForTimeout(600)` for the glide → `__sailDebug.spotlight()` is `{ partId: 'winch_primary_starboard', kind: 'where' }` with `distanceM` between 1.15 and 3.0; `learn-spotlight-hint` visible; the link still has the camera it had (`cam=` unchanged, no `cam=free`); on the phone the sheet is at half; at least one 3D label has the class `label-faded`.
2. A tap on the 3D view (an empty point of the sky: the top-left of the canvas plus (20, 120) px) → `spotlight()` is null within 1 s; the hint is hidden; no label has `label-faded`; after `page.realWaitForTimeout(600)` `cameraPose()` is within 0.05 m of the pose read in step 1.
3. **One instance of a part drawn several times:** `?m=learn&learn=fit_mooring_cleat&…`, tap `learn-show-on-boat` → `distanceM` between 1.15 and 3.0 (one cleat, not all six).
4. `?m=learn&learn=rope_vang&debug=1&held=1&sea=flat`: tap `learn-show-me` → `waitForLink` for the scene's link; wait 1 s (app time) and `realWaitForTimeout(600)`; read `spotlight().distanceM`; press Escape, wait 1 s and `realWaitForTimeout(600)`; the distance from `cameraPose()` (position to target) is at least as large.
5. A part with no mesh on the boat (`?m=learn&learn=env_quay&pl=marina&debug=1`): `learn-show-on-boat` → `spotlight()` is null (the quay is in the world group).
6. A drag on the 3D view during a spotlight ends it, and the camera stays where the drag left it (no glide back: `cameraPose()` 1 s later is within 0.05 m of the pose right after the drag).
7. The buttons read "Where is it?" and "Show it working" (English) and «Где это?», «Показать в работе» with `lang=ru`.
8. `auditPage` with the Learn entry open: no problems.

### 7.10 Done when

Both buttons spotlight their part on a phone and a computer, the veil and the hint go on the next tap, the camera comes back, and the link never changes because of a spotlight; typecheck, lint, tests, build and `SHOTS_ONLY=m49,m20,m21,m22,m23,m24,m27,m28,m31,m32,m33,m44,m45,m46` pass (they tap the two buttons; M24 runs every Show me button).

### 7.11 Not in M49

A spotlight from the info card or a 3D tap, a spotlight for parts outside the boat (quay, buoys), pulsing or animated outlines.

### 7.12 Decided in the M49 PR

- `CameraRig.focus` has a fourth, optional parameter `onlyCloser` (default false): the rig caps `maxDistanceM` at the distance of its own `from` pose (the pose the camera is at or gliding to). "Show it working" passes it, because the scene cannot know where a glide started by the scene's preset is heading.
- A spotlight that ends without a glide (a different part selected, a mode or detail change, Back, a drag) leaves the camera where it is (`endFocus(false)`); one ended by a preset change needs no call, since `goTo` drops the focus itself.
- The hint line (`learn-spotlight-hint`) follows `spotlightNow()`, not the listener's argument, because a spotlight that finds nothing to light is ended inside its own request.
- The veil's material is not tone-mapped, so its colour is the one in `SCENE.spotlight.dimColor`.
- **Tuned (tunable keys, 0):** `whereFill` 0.5 → 0.8 and `instanceHalfM` 0.3 → 0.15. On a phone with the sheet at half the free view is only about 8.6° tall (the lens of 3.5 is 40°), so with the spec's values "Where is it?" stopped at 3.74 m from the primary winch and 9.24 m from a cleat, outside check 7.9's band (1.15–3.0 m). A cleat is about 0.25 m long, so a 0.3 m cube still holds it. The band was not changed; the new distances are in the PR.

---

## 8. M50: The winch handle in 3D

**Independent review: required** (a tap in the 3D view now changes Realistic state: it walks to the handle's station and takes the handle).

Issue #82 and its comments. Owner's answer 4: drawn in Realistic ropes only; taking a handle that lies at another station walks you there.

### 8.1 Files

New: `src/model/handlePose.ts`, `src/render3d/boat/winchHandle.ts`, `tests/handlePose.test.ts`, `scripts/shots-m50.mjs`. Changed: `content/boat/hanse508.json` (8.2), `src/render3d/boat/rig.ts` (`buildGearbox`), `src/render3d/boat/index.ts` (`BoatModel.setHandle`), `src/render3d/scene.ts` (update each frame; the tap rule), `docs/BOAT_REFERENCE.md` (section 5, "Phase 8" rows), `docs/CODE_MAP.md`, `scripts/shots.mjs`.

### 8.2 Data (`content/boat/hanse508.json`)

Replace `modelDetail.mainFurlingGearbox` (today `{ "foreAft": 0.18, "height": 0.24, "athwart": 0.16 }`) with the shape of the photo:

```json
"mainFurlingGearbox": {
  "source": "photo (docs/reference/photos/mast-furling-gearbox.jpg: a grey plate on the mast's aft face with the IN/OUT switch window, and below it a round black drum with a steel cap and the star-shaped handle socket facing aft) + assumption (sizes)",
  "plate": { "width": 0.1, "height": 0.34, "thickness": 0.035, "topAboveCentreM": 0.29 },
  "switchWindow": { "width": 0.06, "height": 0.05, "belowPlateTopM": 0.11 },
  "drum": { "diameter": 0.17, "depth": 0.09 },
  "cap": { "diameter": 0.09, "depth": 0.012 },
  "socket": { "diameter": 0.025, "depth": 0.006 }
}
```

`rig.mainFurlingGearbox.position` ([−0.15, 2.5, −0.08]) becomes **the centre of the drum's front face, on the mast's aft face**: the drum is a cylinder along x from x = −0.15 to −0.15 − drum.depth (−0.24), centre y 2.5, z −0.08; the cap a disc on its aft face; the socket a darker disc on the cap's centre (its aft face at x = −0.24 − cap.depth − socket.depth = −0.258). The plate stands on the plane x = −0.15 (the mast's aft-most face, as the M3b box did; the small gap and overhang against the mast's oval section at z −0.08 are accepted) (x from −0.15 to −0.185), centred on z −0.08, from y = 2.5 + 0.29 down to 2.5 + 0.29 − 0.34 = 2.45 (it runs down behind the drum); the switch window is a lighter rectangle on its aft face, its top 0.11 below the plate's top. Update `rig.mainFurlingGearbox.note`: "M50: position is the centre of the drum's front face on the mast's aft face (photo)."

New block `modelDetail.winchHandle`, after `mainFurlingGearbox`:

```json
"winchHandle": {
  "source": "owner (issue #82: where the handle lies at each station) + assumption (sizes and exact places)",
  "armWidth": 0.025,
  "armThickness": 0.012,
  "gripLength": 0.1,
  "gripDiameter": 0.032,
  "spigotLength": 0.04,
  "spigotDiameter": 0.022,
  "rest": {
    "sideGapCentreFromWinchZ": 0.08,
    "mast": { "x": 0.0, "z": 1.05 },
    "helm": { "x": -7.2, "z": 0.0 }
  },
  "restNote": "Port and starboard: lying across the gap between the winch and the rope box, its centre on the gap's middle x, outboard of the winch's centre by sideGapCentreFromWinchZ (clear of the tails, which pass on the inboard side). Mast: on the coachroof abeam the mast to starboard, lying fore and aft, clear of the turning blocks (ring radius 0.3 m), the line channels (from x -0.7 m aft) and the self-tacking track (x 0.28 m). Helm: on the cockpit floor on the centreline between the wheels, lying fore and aft."
}
```

The handle's arm length is `realisticMode.winchHandle.lengthM` (0.254, existing).

### 8.3 Model (`src/model/handlePose.ts`, pure)

```ts
export interface HandlePose {
  /** Where the spigot (the square end that goes into a socket) is, boat frame. */
  origin: Vec3;
  /** Unit vector along the arm, from the spigot to the grip. */
  arm: Vec3;
  /** Unit vector along the grip, from the arm out to its free end. */
  grip: Vec3;
  /** The socket it is in (a winch id or 'part_main_furling_gearbox'), or null when lying. */
  socket: string | null;
}
/** Null while carried. */
export function handlePose(realistic: RealisticState, data: BoatData = boat): HandlePose | null;
```

`const h = realistic.handle`, `a = h.angle·π/180`, `L = realisticMode.winchHandle.lengthM`, `w = modelDetail.winchHandle`:

| `h.place` / station | `origin` | `arm` | `grip` | `socket` |
|---|---|---|---|---|
| `carried` (any) | — returns `null` | | | |
| `socket`, port or starboard | the station's winch (x, y + `modelDetail.winch.height`, z) | (cos a, 0, sin a) | (0, 1, 0) | the winch id |
| `socket`, mast | `rig.mainFurlingGearbox.position` + (−(drum.depth + cap.depth + socket.depth), 0, 0) | (0, cos a, sin a) | (−1, 0, 0) | `'part_main_furling_gearbox'` |
| `stowed`, port or starboard | x = (box.frontX + box.bodyEndX)/2 of `ropeBinBox(side)` (−7.60 on this boat), y = `gapFloorY(x)` + w.gripDiameter/2 (the grip, the thickest part, lies on the floor), z = winch.z + side·w.rest.sideGapCentreFromWinchZ − side·L/2 (so the arm's middle is at winch.z + side·0.08) | (0, 0, side) | (−1, 0, 0) | null |
| `stowed`, mast | x = w.rest.mast.x − L/2, y = `deck.coachroof.topY` + w.gripDiameter/2, z = w.rest.mast.z | (1, 0, 0) | (0, 0, 1) | null |
| `stowed`, helm | x = w.rest.helm.x − L/2, y = `deck.cockpit.soleY` + w.gripDiameter/2, z = w.rest.helm.z | (1, 0, 0) | (0, 0, 1) | null |
| `stowed`, bow | cannot happen (M46: the Bow station has no slot); return the helm pose | | | |
| `socket` at the helm or the bow | cannot happen (no socket there); return the stowed pose of that station (the helm's for the bow) | | | |

`side` is +1 for starboard, −1 for port; "the station's winch" is `socketAt(station)` (`src/model/realistic.ts`) looked up in `cockpitHardware.winches`.

### 8.4 3D (`src/render3d/boat/winchHandle.ts`, `index.ts`, `scene.ts`)

- `buildWinchHandle(materials): THREE.Group`: built around its own origin (where the spigot meets the arm) like the self-tacking car, so moving it moves its hit area. Local geometry: the spigot a cylinder (`spigotDiameter`) from y 0 to y −`spigotLength` on the origin; the arm a box x 0…L, centred on y 0 and z 0 (`L × armThickness × armWidth`); the grip a cylinder (`gripDiameter`) on the axis x = L, from y 0 to y `gripLength`. **Two meshes with the same id** `part_winch_handle` (a part mesh takes one material, as `buildWinch` does): spigot and arm `materials.dark`, the grip `materials.block`; `smallPartMesh` with hit points in the group's local frame: the arm's middle (L/2, 0, 0) and the grip's middle (L, gripLength/2, 0). The group starts hidden (`visible = false` on the group and both meshes), so nothing shows at the origin before the first `setHandle`.
- `BoatModel.setHandle(pose: HandlePose | null, show: boolean)`: hidden when `pose` is null or `show` is false, by setting `visible = false` on the group **and on both part meshes** (`picking.ts` checks only the mesh's own `visible`, so a hidden group alone would still be tappable); otherwise the group's position is `pose.origin` and its rotation maps local +x to `pose.arm` and local +y to `pose.grip` (build a `Matrix4` from the basis `arm`, `grip`, `arm × grip`).
- `scene.ts` calls `setHandle(handlePose(state.realistic), show)` on build and whenever `state.realistic.handle` or `settings.ropesMode` changes, with `show = state.settings.ropesMode === 'realistic'`. While the handle is cranked, `handle.angle` changes every frame, so the check is on the handle object's identity (cheap).
- `buildGearbox` (`rig.ts`) draws 8.2's plate, window, drum, cap and socket, all one part `part_main_furling_gearbox` (materials: the plate its own mid-grey `materials.gearboxPlate`, colour `SCENE.boat.gearboxPlate` `#8a9096` (decided in the M50 PR after the independent review: the photo's plate is grey), the drum `materials.dark`, the window `materials.fitting`, the cap `materials.chrome`, the socket `materials.dark`); its tap point is the drum's centre.

### 8.5 The tap rule (`src/render3d/scene.ts`, the `listenForTaps` callback)

```ts
const partId = picker.pick(x, y, rect.width, rect.height);
const state = store.getState();
if (
  partId === 'part_winch_handle' &&
  state.selection === 'part_winch_handle' &&
  state.settings.ropesMode === 'realistic' &&
  state.realistic.handle.place !== 'carried'
) {
  store.dispatch({ type: 'realistic', action: { type: 'station', station: state.realistic.handle.station } });
  store.dispatch({ type: 'realistic', action: { type: 'handle', to: 'carry' } });
  return;
}
store.dispatch({ type: 'select', partId });
```

The first tap selects (the info card shows "Winch handle", as for any part); the second takes it (**not in Learn**, decided in the M50 PR after the independent review: there the Ropes section shows no stations, so a taken handle could not be put back; in Learn a tap only selects it; add `state.appMode !== 'learn'` to the condition): the user walks to the station where it is (the Ropes section's station bar follows) and carries it, so the handle disappears from the 3D view and the station drawing shows it in the hand. Putting it down stays in the panel ("Stow here" and the socket, as today). Make sure `picking.ts` ignores the handle while it is hidden (3.4).

### 8.6 Strings and registry

No new strings. `part_winch_handle` (registry, exists) is now drawn: check that it is not in `NOT_DRAWN` (it is not) and that its `showMe` link (`?sel=part_winch_handle&mode=realistic&held=1&sea=flat`) now shows the handle lying at the port station.

### 8.7 Tests (`tests/handlePose.test.ts`)

With `initialRealistic()` and edits of its `handle`:

1. Carried → `null`.
2. Stowed at port (the start): `origin` x −7.600 ± 0.001 (`(frontX + bodyEndX)/2` of the port box: frontX = −8.175 + 0.425 = −7.75, bodyEndX = −7.45), y = `gapFloorY(−7.6)` + 0.016 (1.432 ± 0.002), z = −1.6 − 0.08 + 0.127 = −1.553 ± 0.001; `arm` (0, 0, −1); `socket` null.
3. Stowed at starboard: z = 1.6 + 0.08 − 0.127 = 1.553; `arm` (0, 0, 1).
4. Socket at starboard, angle 0: `origin` (−7.25, 1.79, 1.6) ± 0.001, `arm` (1, 0, 0), `grip` (0, 1, 0), `socket` `'winch_primary_starboard'`; angle 90: `arm` (0, 0, 1) (`toBeCloseTo(…, 6)`).
5. Socket at the mast, angle 0: `origin` (−0.258, 2.5, −0.08) ± 0.001, `arm` (0, 1, 0), `grip` (−1, 0, 0); angle 90: `arm` (0, 0, 1).
6. Stowed at the mast: `origin` (−0.127, 1.976, 1.05) ± 0.001, `arm` (1, 0, 0).
7. Stowed at the helm: `origin` (−7.327, 1.016, 0) ± 0.001.
8. Mast rest clear of the rest: for the origin, the arm's end (`origin + arm·L`) and the grip's end (`origin + arm·L + grip·gripLength`): `hypot(x, z) > 0.3` (the turning blocks), `−0.7 < x ≤ 0.2` (the channels start at −0.7, the track is at 0.28), and `1.0 ≤ z ≤ 1.45` (inside the coachroof).
9. A socket at the helm (an impossible state) gives the helm's stowed pose.

### 8.8 Browser checks (`scripts/shots-m50.mjs`, `debug=1`)

Close-ups (phone and desktop), taken **inside the live checks** with `__sailDebug.setView(position, target)` and `shot()`, as `scripts/shots-m30.mjs` does its close-ups (with `debug=1&held=1&sea=flat` and the debug overlay hidden as there): `handle-port-rest` (`?mode=realistic`), `handle-in-winch` (`hd=port.w`), `handle-mast-rest` (`hd=mast.s`), `handle-in-gearbox` (`hd=mast.w`), `handle-helm-rest` (`hd=helm.s`), `gearbox-close-up` (camera 1.2 m behind the drum). Choose each view so the handle fills about a third of the picture.

"Drawn" below means `__sailDebug.hitCentres().find((c) => c.partId === 'part_winch_handle')` is found (it skips hidden meshes; `partPoint` reads only rope segments and is not used). Live (phone, then desktop; every link adds `debug=1&held=1&sea=flat`, so tap points do not drift):

1. `?mode=realistic&cam=side-port`, Ropes open: the handle is drawn (at port).
2. Tap it (the canvas position from `hitCentres`) → `waitForLink(page, ['sel=part_winch_handle'])`; it is still drawn.
3. Tap it again → the link has `hd=c` (carried), it is not drawn, and `.station-button[data-station="port"][aria-pressed="true"]` exists.
4. `?mode=realistic&hd=mast.s&st=port&cam=top`: tap the handle twice → the link has `st=mast` and `hd=c`.
5. Easy ropes (`?cam=side-port`): not drawn.
6. The Winch handle entry's Show it working (`?m=learn&learn=part_winch_handle`, tap `learn-show-me`) → after the scene loads, it is drawn.

### 8.9 Done when

The handle shows at each of the five places of 8.3 and in each socket, turns with the crank, hides when carried and in Easy ropes, two taps take it from any station; the gearbox matches the photo's shape; typecheck, lint, tests, build and `SHOTS_ONLY=m50,m4c` pass (M4c works the handle).

### 8.10 Not in M50

Laying the handle down by a tap in 3D (it stays in the panel), dropping it by dragging in 3D, a handle in Easy mode, a second handle.

### 8.11 Decided in the M50 PR

- Decided in planning: the Winch handle entry's Show it working selects the handle, so the first tap on it afterwards takes it (accepted).
- Decided in the M50 PR (recommended; merging accepts it): the generic "sizes are small" check of `tests/boatData.test.ts` treats `modelDetail.winchHandle.rest.*.x/z` as coordinates (they may be 0 or negative; they only have to lie on the boat), not as sizes; no other older test changed.
- Decided in the M50 PR (recommended; merging accepts it): the tap checks (8.8 items 1 to 4) look straight down at the handle from 3 m (`__sailDebug.setView`) with the debug overlay hidden, and item 1 uses `cam=top`, not `cam=side-port`: from the side the toerail's cleat sits in front of the handle and takes the tap, and the debug overlay and the info card cover the lower canvas. The handle itself stays tappable from the side; only the check's view changed.
- Decided in the M50 PR (owner accepted the independent review's recommendations): in Learn a tap on the handle only selects it (finding 1); the gearbox plate is mid-grey (finding 2); the PR's test-count wording is left as is (finding 3). This narrows the planning decision above to outside Learn.
- Decided in the M50 PR (recommended; merging accepts it): the gearbox is four meshes of the one part `part_main_furling_gearbox` (plate and drum with the tap point, window, cap, socket), as the winches are; `scene.ts` checks the handle in the render loop (an identity check) and rebuilds it after a detail change.

---

## 9. M51: Phone tabs

**Independent review: required** (rebuilds the phone panel that almost every earlier check and link uses; changes the sheet's heights).

Issue #100 item 7. Owner's answer 5: Controls holds every section except Conditions, Learn, Mode and Settings, in the mode's order; the mode chip and the gear leave the chip row; **a mockup is agreed before building**: `docs/mockups/phase8-panel.html` (the phone frame). Build it as the mockup shows; where this section and the mockup differ, this section wins.

### 9.1 Files

New: `src/ui/panelTabs.ts`, `src/ui/modePicker.ts` (replaces `src/ui/modeSection.ts`, which is deleted), `scripts/shots-m51.mjs`. Changed: `src/ui/panel.ts`, `src/ui/modes.ts`, `src/ui/sheet.ts`, `src/ui/sheetGeometry.ts`, `src/ui/settingsMenu.ts`, `src/ui/modeChip.ts` (hidden on the phone), `src/ui/settingsMenu.ts` also exports `gearIcon`, `src/style.css`, `src/app/app.ts` only if needed for 9.4's settings ownership (`alertCentre.ts` needs no change: the "!" already has `margin-left: auto`; only its "before the gear" comment is updated), both `ui.json`, `docs/review/ru.md`, `tests/sheet.test.ts`, `tests/modes.test.ts`, `scripts/ui.mjs`, the older checks of 9.8, `scripts/shots.mjs` (labels, register M51, and the scene field `tab`, 9.9), `docs/CODE_MAP.md`.

### 9.2 Sheet geometry (`src/ui/sheetGeometry.ts`)

`SHEET.peekPx` 100 → **128**, comment: "M51: the handle strip (27), the tabs (44) with the rule above them (1) and the quick row (56)." Nothing else in `SHEET` changes. `tests/sheet.test.ts` changes exactly these expectations (prototype, 3.5): the A list `[100, 422, 668]` → `[128, 422, 668]`; `sheetHeightPx('half', { viewHeightPx: 160, topAreaPx: 40 })` 100 → 128; `cameraInsetPx('peek', A)` 160 → 188; `snapSheet('peek', 261, 0, A)` → `snapSheet('peek', 275, 0, A)` (half) and `snapSheet('peek', 260, 0, A)` → `snapSheet('peek', 274, 0, A)` (peek).

### 9.3 The tabs (`src/ui/panelTabs.ts`)

```ts
export const PANEL_TABS = ['mode', 'controls', 'conditions', 'learn', 'settings'] as const;
export type PanelTab = (typeof PANEL_TABS)[number];
export interface PanelTabs {
  readonly element: HTMLElement;     // the tab row, div.panel-tabs[role=tablist]
  current(): PanelTab;
  /** Shows the tab. notify = true (a tap, a key, `showTab`, code that means "go there"): runs the listeners, also for the tab already shown.
   *  notify = false (`openOnly`, a layout change): only the tab state (`aria-selected`, `data-tab`), no listeners, so the sheet does not move. */
  select(tab: PanelTab, notify?: boolean): void;
  onSelect(listener: (tab: PanelTab, previous: PanelTab) => void): void;
}
export function createPanelTabs(store: Store): PanelTabs;
```

- Five buttons `button.panel-tab[role=tab]`, test ids `panel-tab-<tab>`, ids `panel-tab-<tab>`, `aria-selected`, `aria-controls="panel-body"`; a roving `tabindex` (the selected tab 0, the others −1). Arrow Left / Right move the focus and the choice between tabs, Home / End to the first / last (WAI-ARIA tabs). `.panel-tab:focus-visible` gets the app's focus outline (`3px solid var(--focus)`, offset −3px).
- `.panel-body` gets `id="panel-body"`; on `stacked` also `role="tabpanel"` and `aria-labelledby` the selected tab's id (both removed on the other layouts).
- Labels: **mode tab** the current mode's name, `` t(`mode.${appMode}` as const) `` ("Easy"), with `aria-label` `t('mode.section', { name })` ("Mode: Easy"); updates when the mode changes (owner's answer on the planning PR #115: the mode's name, not the word "Mode"); **controls** `t('tab.controls')`; **conditions** `t('section.conditions')`; **learn** a "?" in a 26 px circle (as the mockup) with `aria-label` `t('tab.learn')`; **settings** the gear icon (`gearIcon()` from `settingsMenu.ts`, exported) with `aria-label` `t('settings.title')`.
- Look (mockup; this section wins where they differ): a grid `grid-template-columns: auto auto auto 48px 48px; justify-content: space-between;`, each tab 44 px high, `padding: 0 6px; white-space: nowrap;`, 15 px semibold text in `--muted` (**tunable**: 14 px if the Russian "Реалистичный" does not fit at 390 px; the row never makes the page scroll sideways); the chosen tab in `--accent` with a 3 px bar at its bottom (10 px in from each side); a 1 px `--line` border above the row (counted in the 128 px) and the line under it drawn as `box-shadow: inset 0 -1px 0 var(--line)` (no extra height).

`TAB_OF` in `src/ui/modes.ts` (replaces `WIDE_ONLY_SECTIONS`):

```ts
/** M51: the phone tab each section is shown under. */
export const TAB_OF: Readonly<Record<SectionId, PanelTab>> = {
  mode: 'mode', ropes: 'controls', sails: 'controls', autopilot: 'controls', engine: 'controls',
  conditions: 'conditions', learn: 'learn', place: 'controls', anchor: 'controls',
  harbour: 'controls', settings: 'settings',
};
```

(M53 adds `helm: 'controls'`, M55 `status: 'controls'`.)

### 9.4 The sheet and the panel (`src/ui/sheet.ts`, `src/ui/panel.ts`)

- `Sheet` gets `readonly tabs: HTMLElement` (an empty `div.sheet-tabs`, between the handle and the head: `sheet.prepend(handle, tabs, head)`). `panel.ts` puts `createPanelTabs(store).element` into it. In the side layout `.sheet-tabs` is hidden (as the handle is).
- The handle strip is **27 px** high (CSS `--sheet-handle-h: 27px` on `.sheet-handle`, stacked only); the grey stripe stays 36 × 5 px.
- **Dragging from the tabs row:** the handle's pointer code (`pointerdown` … `pointerup`, `snapSheet`) becomes `attachDrag(element, { tapCycles: boolean })` in `sheet.ts`, used for the handle (`tapCycles: true`: a tap cycles the height, as today) and for `.sheet-tabs` (`tapCycles: false`: a tap is the tab's own `click`, the sheet does not move; a pointer that moved less than the threshold puts the sheet back to its start height on release, `go(start)`, since `pointermove` may already have resized it). On the tabs row the pointer is captured **only once it has moved more than `SHEET.tapMaxMovePx`** (capturing at `pointerdown` would send the `click` to the row instead of the tab); a drag cancels the `click` that follows (`preventDefault` + `stopPropagation` in a capture `click` listener on `.sheet-tabs`, armed only after a drag). `.sheet-tabs` has `touch-action: none`. Keyboard keys on the tabs move between tabs, not the sheet.
- **Which sections show** (stacked only): `.panel-body` gets `data-tab="<tab>"`; every section element gets `data-tab-of="<TAB_OF[id]>"`; CSS, five rules of the form `html[data-layout='stacked'] .panel-body[data-tab='controls'] > [data-section]:not([data-tab-of='controls']) { display: none; }` (one per tab). Do **not** use the `hidden` attribute for this (it means "not available", which `scripts/ui.mjs` `sectionIds` reads: on the phone `sectionIds` and `eachSection` therefore list every available section, `mode` and `settings` included, which is intended).
- **One-section tabs** (stacked): the Mode, Learn and Settings sections' header rows (`.section-head`) are hidden (as the mockup); the Conditions section keeps its header (its "?" `section-explain-conditions` is used) but its fold toggle does nothing on `stacked`: in the panel's toggle listener, `if (layoutKind === 'stacked' && TAB_OF[id] !== 'controls') section.setOpen(true)` (it stays open while its tab is shown).
- **Selecting a tab** (`tabs.onSelect` in `panel.ts`): a sheet at peek goes to half; for `mode`, `conditions`, `learn` and `settings` the tab's one section opens (`openOnly`); for `controls` the section of that tab that was open last opens again (`lastControls`, set in `openOnly`, cleared when that section is folded by hand, and used only if `sectionAvailable` for it), or none. The panel body scrolls to the top, and `changed()` runs (the info card asks `panel.shows`).
- **Raising the sheet** happens only in the `onSelect` listener (a tap, a key, `showTab`, `showSection`, the picker's choice): a sheet at peek goes to half.
- **Tab and open section stay in step:** on `stacked`, `openOnly(id)` also calls `select(TAB_OF[id], false)` (the sheet does not move); a change of layout to `stacked` selects the tab of the open section, or `controls` if none is open; a rope or the wheel selected in 3D (the subscriber that calls `openOnly('ropes')`) therefore lands on Controls without moving the sheet.
- **`showSection(id)`** (the panel API, used by links, "?" buttons, "Try it", the Attention card's "?", M49) first selects `TAB_OF[id]` on a phone, then works as today. `shows(id)` is also false on a phone when the section's tab is not selected.
- **Mode and Settings on the phone:** `sectionAvailable` (4.3): `mode` and `settings` are available on `stacked` and `wide` (wide until M52), not on `side`. The Settings section on the phone holds `settingsContent` (the same element the dialog and the wide section hold today). Ownership: `panel.ts` `place()` moves it into the section on `stacked` and `wide`; `settingsMenu.ts`'s own `place` closes the dialog and leaves the content alone on `stacked` and `wide`, and takes it into the dialog only on `side`. In `applyOpen` the reopen condition `layoutKind === 'wide'` becomes `layoutKind !== 'side'`.
- **The Mode tab's content** is `[createModePicker(store, onChosen)]` (`src/ui/modePicker.ts`, the code of `modeSection.ts` moved: the `mode-choices` radio group with `mode-choice-<mode>` buttons, names `.mode-option-name` and sentences `.mode-option-hint`). `onChosen` runs after `setAppMode`; on the phone it selects the tab `learn` for Learn mode and `controls` for the others.
- **At the start** the tab is `learn` when the app opens in Learn mode with an entry (`state.learn !== null`), else `controls`. A language change reopens the Settings tab (`takeOpenAfterReload() === 'settings'` now works on `stacked` too, `applyOpen`).
- **The chip row on the phone:** the mode chip (`mode-chip`) and the gear (`settings-button`) are hidden on `stacked` (CSS); the camera chip stays at the left, the Attention button ("!") moves to the right end (it took the gear's `margin-left: auto`; M28's map Close chip keeps its place before it).
- **The settings dialog** (`settings-dialog`) is not used on the phone any more (the gear that opens it is hidden). It stays for the side layout until M52.

### 9.5 Strings

| Key | English | Russian (draft) |
|---|---|---|
| `tab.controls` (new, after `tab.learn`) | Controls | Управление |
| `tabs.label` (new, after `tab.controls`) | Panel | Панель |

`tabs.label` is the tab row's `aria-label`.

### 9.6 Tests

- `tests/sheet.test.ts`: as 9.2.
- `tests/modes.test.ts`: `WIDE_ONLY_SECTIONS` tests become `TAB_OF` tests: every `SectionId` has a tab; exactly `mode`, `conditions`, `learn` and `settings` are not `controls`; `sectionAvailable('mode', state, 'stacked')` and `('settings', state, 'stacked')` are true, `(…, 'side')` false. The third argument of `sectionAvailable` becomes the layout kind (4.3); update its callers.

### 9.7 Helpers (`scripts/ui.mjs`)

- `showTab(page, tab)`, `tabNow(page)` (3.6): on `stacked` (`document.documentElement.dataset.layout === 'stacked'`) they click `panel-tab-<tab>` and read the `aria-selected` tab; elsewhere `showTab` does nothing and `tabNow` returns null.
- `dragHandle(page, dy, steps, delayMs, testId = 'sheet-handle')`: the new last argument lets a check drag from `panel-tab-controls`.
- `showSection(page, id)`: on `stacked`, first `showTab(page, TAB_OF_JS[id])` (a copy of `TAB_OF` in the file, with a comment pointing to `src/ui/modes.ts`), then as today.
- `openSettings(page)`: wide → as today (the section); stacked → `showTab(page, 'settings')`; side → the gear and the dialog (as today). Then waits for `settings-content` to be visible.
- `closeSettings(page)`: stacked → `showTab(page, 'controls')`; wide and side as today.
- `setMode(page, mode)`: stacked → `showTab(page, 'mode')`, then `mode-choice-<mode>`; wide as today; side → the chip's menu (as today).

### 9.8 Older checks to change

Only the lines named; each keeps its purpose.

- `scripts/shots-m25.mjs`: the dialog checks ("m25 settings", "m25 settings use", "m25 settings escape", "m25 russian" (the gear's label)) open on the `foldable` viewport (side layout, where the gear and the dialog stay until M52) instead of `phone`. "m25 menu escape" (the camera menu) stays on the phone.
- `scripts/shots-m26.mjs`: "full → peek" expects `near(box.height, 128)` (was 100); the scenes are unchanged.
- `scripts/shots-m27.mjs` block 2: "Learn is folded until it is opened (M35)" now expects `data-open === 'true'` after `setMode(page, 'learn')` and is renamed "the Learn tab opens its section". `scripts/shots-m27.mjs`: the phone's order checks ("Easy order", "Learn order", "Realistic order") and the "every section folded" string of block 1 expect `mode` first and `settings` last (they are now listed on the phone); "no tabs" (`[role="tab"]` count 0) becomes "five tabs" (count 5); `chipLabel` reads the Mode tab (`panel-tab-mode`) on the phone; "the mode menu in Russian" (block 10) reads `[data-testid="mode-choices"] .mode-option-name` after `showTab(page, 'mode')`; block 11's "m27 a11y menu" audits the Mode tab after `showTab(page, 'mode')`.
- `scripts/shots-m35.mjs`: its header helpers (`headBoxes`, and its own uses of `sectionIds`) compare only the sections that are displayed (`offsetParent !== null`), i.e. the open tab's (blocks 1, 5 and the wide block). Block 2 on the phone uses Sails instead of Conditions (Conditions is alone on its tab and its toggle does not fold there): open Ropes with its toggle, `showSection(page, 'sails')` folds Ropes, check the stacking over the Controls tab's displayed sections, scroll `#section-body-sails`, fold it with `section-toggle-sails`.
- `scripts/shots-m29.mjs`: the phone's "mode menu" audit (`getByTestId('mode-chip').click()`) becomes `showTab(page, 'mode')` and audits that; the Escape after it becomes `showTab(page, 'controls')`.
- `scripts/shots-m36.mjs`: "the Attention button is in the chip row, between the camera chip and the gear" becomes "…, at the right end of the chip row, after the camera chip" (its right edge within 16 px of the chip row's right edge; no gear).
- `scripts/shots-m38.mjs`: its **phone** block (about lines 372–395: the chip row's order with `mode-chip`, the section ids, `.chip-menu`) is rewritten for the tabs: the chip row holds the camera chip and "!", the mode list is under the Mode tab; the wide and 820 px blocks stay (M52 changes them).
- `scripts/shots-m27.mjs`: the scene `mode-menu-open` is removed (the M51 scene `tabs-mode` replaces it; scenes run at every size locally and the tab exists only on the phone).
- `scripts/shots-m41.mjs`: "after a reload the chip reads "Harbour"" reads the Mode tab (`panel-tab-mode`) text on the phone.
- `scripts/a11y-audit.mjs`: add `.sheet-handle` to `SMALL_OK` with the comment "M51: 27 px handle strip; the tabs row under it also drags the sheet".
- Any other check that fails because a section is under another tab: it must go through `showSection`/`openSettings`/`setMode` (3.6); fix it that way and list it in the PR.

### 9.9 Browser checks (`scripts/shots-m51.mjs`, phone; test clock)

Scenes: `tabs-peek` (`?cam=side-port`, sheet peek), `tabs-controls` (`?cam=side-port&sel=rope_vang`), `tabs-mode`, `tabs-conditions`, `tabs-learn`, `tabs-settings` (each with a new scene field `tab: '<name>'`, which the scene loop in `scripts/shots.mjs` runs as `showTab(page, scene.tab)`: a no-op off the phone, so the scenes do not fail at the wider sizes; no `click` on a tab), `tabs-ru` (`?lang=ru`, Controls) and `tabs-ru-realistic` (`?lang=ru&mode=realistic`: the longest Mode tab label).

Live:

1. **Five tabs:** `?cam=side-port`: `panel-tab-mode`, `-controls`, `-conditions`, `-learn`, `-settings` are visible, each at least 44 px high; `panel-tab-controls` is selected; the mode tab reads "Easy"; `mode-chip` and `settings-button` are hidden; `alert-chip` and `camera-chip` visible.
2. **Peek height:** `setSheet(page, 'peek')` → the sheet is 128 ± 2 px high (plus the safe area, 0 in the check); the tabs and the quick row are visible; the panel body is hidden.
3. **A tab at peek raises the sheet:** at peek, tap `panel-tab-conditions` → the sheet is at half, `section-conditions` is open and shown, `section-ropes` is not displayed.
4. **Controls remembers:** open Ropes (`showSection`), tap Conditions, tap Controls → Ropes is open again.
5. **Mode tab:** tap `panel-tab-mode`, tap `mode-choice-learn` → the link has `m=learn`, the selected tab is `learn`, the mode tab reads "Learn"; tap `panel-tab-mode`, `mode-choice-easy` → Controls is selected.
6. **Settings tab:** tap `panel-tab-settings` → `settings-content` visible inside `section-settings`; choose Русский (`language-ru`) → after the reload the Settings tab is selected.
7. **Links:** `?m=learn&learn=rope_vang` opens on the Learn tab with the entry shown; `?sel=rope_vang` opens on Controls with Ropes open; the Attention card's "?" (make an entry: `?ws=22&wd=60` with the boat sailing until "Heeling a lot" is written, or any entry the M36 checks make) opens the Learn tab.
8. **Drag from the tabs:** `dragHandle`-style drag starting on `panel-tab-controls` 200 px up → the sheet is at full and the selected tab did not change; a plain tap on it does not move the sheet.
9. **Keyboard:** focus `panel-tab-controls`, ArrowRight → Conditions selected and focused; End → Settings.
10. **Conditions stays open on its tab:** on the Conditions tab, tap `section-toggle-conditions` → `section-conditions` is still open.
11. **Fits:** with `?lang=ru&mode=realistic` the tab row is inside the screen (no element of it beyond 390 px, the page does not scroll sideways) and `findClipped` (as the M27 Russian check uses) finds nothing in it.
12. `auditPage` with each tab selected: no problems.

### 9.10 Done when

The phone shows the five tabs as the mockup, every section is reachable under its tab, links and "?" buttons land on the right tab, the older checks pass in their changed form; typecheck, lint, tests, build and `SHOTS_ONLY=m25,m26,m27,m29,m35,m36,m41,m51` pass, then CI.

### 9.11 Not in M51

The computer and side layouts (M52), the Helm section (M53), new sections (M55), moving sections (M54).

### 9.12 Decided in the M51 PR

- Decided in the M51 PR (recommended; merging accepts it): the Controls tab with no section remembered (nothing opened there yet, or the last one was folded by hand) shows every Controls title folded, as the app starts; it does not open Ropes by itself.
- Decided in the M51 PR (recommended; merging accepts it): on the tabs row a mouse (not a finger) that leaves the row mid-drag is still followed, so the row listens for `pointermove`, `pointerup` and `pointercancel` on the window (a finger is captured by its row anyway); the pointer is still captured only once it has moved more than `SHEET.tapMaxMovePx`.
- Decided in the M51 PR (recommended; merging accepts it): `sectionAvailable`'s third argument defaults to `'side'` (nothing wide, no phone), so the old two-argument calls in tests keep their meaning of "not wide".
- Decided in the M51 PR (recommended; merging accepts it): `showTab` always taps the tab, also the one already shown (a tap on the shown Controls tab opens the last Controls section again, as 9.3 says listeners run for it too); `showSection` does so too, which is why the older checks need no other change.
- Older checks changed, and only where 9.8 says: `shots-m25` (dialog checks on the side layout; "the panel has no tabs" now expects the five phone tabs), `shots-m26` (peek 128), `shots-m27` (order lists, five tabs, Learn tab opens its section, mode names read from the Mode tab, scene `mode-menu-open` removed), `shots-m29` (the mode list is the Mode tab), `shots-m35` (displayed sections only; Sails in place of Conditions on the phone), `shots-m36` (the "!" at the right end of the row), `shots-m38` (the phone block), `shots-m41` (the Mode tab reads "Harbour"), `a11y-audit` (`.sheet-handle` in `SMALL_OK`); new in `scripts/shots.mjs`: the scene field `tab`.

`eachSection` on the phone now also audits the Mode and Settings sections (M29, M27 block 10): new coverage, expected to pass; it did (nothing to fix).

---

## 10. M52: Mode and Settings chips on the computer

**Independent review: required** (replaces the Mode and Settings sections of the wide layout and the settings dialog of the side layout).

Issue #100 item 6. The mockup's computer frame (`docs/mockups/phase8-panel.html`).

### 10.1 Files

New: `src/ui/chipCard.ts`, `scripts/shots-m52.mjs`. Changed: `src/app/app.ts` (builds the chips; reads `takeOpenAfterReload` once), `src/ui/modeChip.ts`, `src/ui/settingsMenu.ts`, `src/ui/chipMenu.ts` (one open overlay at a time, 10.3), `src/ui/panel.ts`, `src/ui/modes.ts`, `src/ui/labels3d.ts` (the card is an obstacle for labels), `src/style.css`, both `ui.json`, `scripts/ui.mjs`, the older checks of 10.8, `scripts/shots.mjs`, `docs/CODE_MAP.md`. (`cameraChip.ts` needs no change: the row is already mode chip, camera chip, gear.)

### 10.2 What changes

| Layout | Mode | Settings |
|---|---|---|
| phone (`stacked`) | the Mode tab (M51) | the Settings tab (M51) |
| side | the mode chip "Easy ▾" (bottom-left, as today); a tap opens the **mode card** | the gear (bottom-right, as today); a tap opens the **settings card** |
| wide | the chip **"Mode: Easy ▾"** in the bottom-right chip group; a tap opens the mode card | the gear in the same group; a tap opens the settings card |

- On the wide layout the bottom chip row's right end holds, left to right: the mode chip, the camera chip, the gear (8 px apart, 8 px from the 3D view's right and bottom edges, as the mockup). The mini-map stays bottom-left. The mode chip's label there is `t('mode.section', { name })` ("Mode: Easy"); on the side layout it stays `t('mode.<id>')` ("Easy").
- The `mode` and `settings` sections are available only on `stacked` (4.3). **One** settings element (`settingsContent`) and **one** mode picker element (`createModePicker`, built once in `app.ts`) exist; `place()` moves each into its section on `stacked` and into its card's body elsewhere (two pickers would duplicate the `mode-choice-*` test ids). The picker's `onChosen` looks at the layout when it runs: on `stacked` it selects the tab (M51), elsewhere it closes the mode card.
- Signatures: `createModeChip(row: HTMLElement, store: Store, layout: LayoutShell): ChipCard` (the label is "Mode: Easy" on `wide` and "Easy" on `side`, updated on a mode change **and** a layout change; it returns its card); `createSettingsMenu(row: HTMLElement, layout: LayoutShell, reopen: boolean): ChipCard` (the `root` and `settingsContent` arguments go; it returns its card); `createPanel(host, store, sheet, layout, settingsContent, modePicker: HTMLElement, cards: { mode: ChipCard; settings: ChipCard }, reopen: boolean)` (`built.mode` becomes `[modePicker]`; `applyOpen` uses `reopen` instead of calling `takeOpenAfterReload`); the `Panel` API gains `modeChosen(): void` (on `stacked`: select the Learn tab in Learn mode, Controls otherwise).
- Order in `app.ts`: `const reopen = takeOpenAfterReload() === 'settings'`; `let panel: Panel`; `let modeCard: ChipCard`; `const modePicker = createModePicker(store, () => layout.viewport().mode === 'stacked' ? panel.modeChosen() : modeCard.close(true))`; `modeCard = createModeChip(…)`; `const settingsCard = createSettingsMenu(…)`; `panel = createPanel(…, settingsContent, modePicker, { mode: modeCard, settings: settingsCard }, reopen)`. `place()` (`panel.ts`) moves `modePicker` and `settingsContent` into their sections on `stacked` and into `cards.mode.body` / `cards.settings.body` elsewhere. `app.ts` calls `takeOpenAfterReload()` **once** (`const reopen = takeOpenAfterReload() === 'settings'`) and passes `reopen` to the panel (opens the Settings tab on `stacked`) and to the settings menu (opens the card on `side`/`wide`); `panel.ts` no longer calls `takeOpenAfterReload` itself.
- The language choice marks the reopen when it was made inside the Settings section **or a card** (`input.closest('[data-section="settings"], .chip-card')`).
- CSS removed: the rules that hide `.mode-chip` and `.settings-button` on the wide layout, and every `.settings-dialog` rule (`.settings-dialog`, `.settings-dialog[hidden]`, `html[data-layout='side'] .settings-dialog`, `html[data-wide] .settings-dialog`, `.settings-dialog .footer`), `.settings-head`, `.settings-close` (also in the shared focus-ring list, about line 957, where `.chip-card-close:focus-visible` takes its place) and `.chip-menu [data-testid^='mode-option-']` (the card's header gets its own `.chip-card-head` rules). On the wide layout the bottom chip row is right-aligned (mode chip, camera chip, gear); the mini-map stays bottom-left.
- The spec wins over the mockup where they differ: on `side` the chip reads "Easy" (the mockup shows "Mode: Easy" everywhere).
- **The settings dialog is removed** (`settings-dialog`, `settings-close`, the `inert` handling): the card replaces it.
- The chip menu of the mode chip (`chipMenu` items `mode-option-<id>`) is removed: the mode card replaces it. `chipMenu.ts` stays for the camera chip.

### 10.3 The card (`src/ui/chipCard.ts`)

```ts
export interface ChipCard {
  readonly element: HTMLElement;     // section.chip-card[role=dialog][aria-modal=false]
  open(): void;
  close(returnFocus?: boolean): void;
  isOpen(): boolean;
  /** The card's own empty body (it scrolls); `place()` puts the picker or the settings into it. */
  readonly body: HTMLElement;
}
/** A card that opens above its chip, over the 3D view (appended to `chip.closest('.view')`): a header (title and a × with class `chip-card-close`, test id `<testId>-close`) and `body`. */
export function createChipCard(chip: HTMLButtonElement, title: string, testId: string, titleId: string): ChipCard;
```

- Placed by CSS only (no measuring): `position: absolute` in the 3D view, `bottom: calc(var(--view-bottom-inset, 0px) + 60px)`; on `wide` both cards `right: 8px`; on `side` the mode card `left: 8px` and the settings card `right: 8px`; width `min(380px, 100% − 16px)`, max height `min(640px, 100% − var(--view-top-h, 0px) − 76px)`; the body scrolls; `z-index: 13` (above the alert centre, 10, and the chip menus, 12). Closed, the card has `hidden`. Look as the mockup: white, 1 px `--line` border, 12 px radius, shadow `0 8px 28px rgb(0 0 0 / 0.22)`, a sticky header with the title (bold) and a 44 × 44 × button (`aria-label` `t('settings.close')`).
- One overlay open at a time: `chipMenu.ts` exports `registerOverlay(close: () => void): () => void`. A card calls it in each `open()`: it first runs `closeOpenMenus()` (closing any chip menu or the overlay that holds the slot), then takes the slot with `close`; the returned function releases the slot, and the card calls it in `close()`. A chip menu opening (by tap or key) runs `closeOpenMenus()`, which also closes the overlay in the slot.
- A `pointerdown` anywhere outside the card and its chip closes it, also in the panel (intended: "not modal" means the panel is not blocked, not that the card stays open while the panel is used).
- On open the focus goes to the × (`<testId>-close`, so `settings-card-close`) for the settings card and to the checked `mode-choice-*` for the mode card. Escape (a capture-phase `keydown` on `document`, with `stopPropagation`, as `chipMenu` does, so the info card does not also drop the selection) and × call `close(true)` (focus back to the chip); a `pointerdown` outside the card and its chip calls `close(false)` (the tapped thing keeps the focus). A layout change closes both cards.
- The chip has `aria-expanded` and `aria-controls`; the card has `aria-labelledby` its title, whose id is `settings-title` for the settings card (the M25 check reads it) and `mode-card-title` for the mode card.
- `labels3d.ts` adds `.chip-card:not([hidden])` to the elements labels keep clear of.
- Not modal: the 3D view and the panel stay usable while a card is open.
- **Mode card:** test id `mode-card`, title `t('mode.label')`, title id `mode-card-title`; its body gets the one mode picker (10.2): choosing a mode closes the card and the chip shows the new name.
- **Settings card:** test id `settings-card`, title `t('settings.title')`, title id `settings-title`; its body gets `settingsContent`. A language change reloads the page and reopens the card (`openAfterReload('settings')` when the change was made in the card; `takeOpenAfterReload()` opens the card on `side`/`wide`, the tab on `stacked`).

### 10.4 Strings

No new keys. `mode.chip` ("Mode: {name}. Tap to change it.") stays the chip's `aria-label`. The four `mode.<id>.hint` keys (used only by the chip menu) are removed from both `ui.json` files; run `npm run review-doc -- ru`.

### 10.5 Tests

`tests/modes.test.ts`: `sectionAvailable('mode' | 'settings', state, 'wide')` is now false.

### 10.6 Helpers (`scripts/ui.mjs`)

- `openSettings(page)`: stacked → as M51; side and wide → if `settings-card` is already visible, return; else click `settings-button` and wait for `settings-card` visible. `closeSettings(page)`: side and wide → if the card is visible, click `settings-card-close`; wait for it hidden.
- `setMode(page, mode)`: stacked → as M51; side and wide → unless `mode-card` is visible, click `mode-chip`; then `mode-choice-<mode>`.
- `isWide(page)` stays.

### 10.7 Browser checks (`scripts/shots-m52.mjs`)

Scenes: `wide-chips` (1,440 × 900, `?cam=side-port`), `wide-mode-card` (click `mode-chip`), `wide-settings-card` (click `settings-button`), `side-settings-card` (820 × 1000).

Live (wide 1,440 × 900, then side 820 × 1000):

1. No `section-mode` and no `section-settings` is displayed; `mode-chip`, `camera-chip` and `settings-button` are visible; on wide they are in this order left to right, within 8 px of each other, the group's right edge within 12 px of the 3D view's right edge; the mode chip reads "Mode: Easy" (wide) or "Easy" (side).
2. Tap the mode chip → `mode-card` visible, `mode-choice-easy` checked; tap `mode-choice-realistic` → the card closes, the link has `mode=realistic`, the chip reads "Mode: Realistic" (wide).
3. Tap the gear → `settings-card` visible with `settings-content` inside; the 3D view is still clickable (a tap on a part selects it and the card closes); Escape closes it and the focus is on the gear.
4. Open the settings card, then the mode chip → only the mode card is open.
5. A language change in the card → after the reload the settings card is open.
6. `auditPage` with each card open: no problems.

### 10.8 Older checks to change

- `scripts/shots-m25.mjs` (the dialog checks moved to the foldable in M51): `settings-card` in place of `settings-dialog` (lines with `settings-dialog`, about 167–193 and 229); the focus after opening is on `settings-card-close`, after Escape on `settings-button`; "inert while open" and "nothing is inert after closing" (about 197–203) are replaced by "the 3D view still takes a tap while the card is open"; `#settings-title` stays (the card's title keeps that id); the "m25 side layout" check of the dialog's place checks the card's place (inside the view, above the chip row).
- `scripts/shots-m27.mjs`, `scripts/shots-m29.mjs` (about lines 179–210): any remaining chip-menu mode use (`.chip-menu .mode-option-*`) on the side or wide layout reads inside `mode-card`; wide audits that open the settings close the card before going on.
- `scripts/shots-m36.mjs` (about line 245, "the ? keeps the mode", desktop): reads `mode-chip` and expects "Mode: Easy" instead of the Mode section's title.
- `scripts/shots-m38.mjs`: lines 57–64 (column 1 expected `mode, …, settings`) drop `mode` and `settings`; the "Settings section" block (about 204–295: `getByTestId('section-settings').locator(…)` at about 228, `settings-dialog` at about 244) and the foldable blocks (about 322–347 and 355–368) use `settings-card` in place of the dialog and the section; lines 66–70 ("the mode chip and the gear are gone") flip to "visible"; line 77 (the Mode section's title) reads the chip; the corner checks (about 104–141: the camera chip bottom-right, the Close chip left of it) use the gear as the corner chip; the Mode-section choice checks (about 148–190) and "Russian: Settings section open" (about 307–316) check the mode card and the settings card; the narrow block's "turning wide moves the settings into the section" (about 350–368) becomes "turning wide closes the card".
- `scripts/shots-m39.mjs`: if a check counts the sections of column 1 (it expected `mode` first and `settings` last), remove those two from its expected lists.
- `scripts/shots.mjs` (about line 721): the comment about the inert view behind the settings dialog is updated.
- Others failing for the same reason: go through the helpers (3.6) and list them in the PR.

### 10.9 Done when

Wide and side layouts match the mockup's computer frame, no Mode or Settings section is left on them, the dialog code is gone, and the older checks pass in their changed form; typecheck, lint, tests, build and `SHOTS_ONLY=m25,m27,m29,m36,m38,m39,m52` pass, then CI.

### 10.10 Not in M52

Moving the chips elsewhere, a card for the camera (it keeps its menu), the phone (M51).

### 10.11 Decided in the M52 PR

(empty)

---

## 11. M53: Realistic: the Helm section

**Independent review: required** (changes Realistic mode's stations of Phase 1, the `st=helm` links and what opens on a selection).

Issue #100 item 5. Owner's answer 6: in Realistic mode the autopilot and the engine are worked from the Helm.

### 11.1 Files

`src/ui/realisticPanel.ts` (the Helm station's block moves out: `createHelmStation`), `src/ui/panel.ts`, `src/ui/modes.ts`, both `ui.json`, `docs/review/ru.md`, `tests/modes.test.ts`, `scripts/ui.mjs`, the older checks of 11.8, new `scripts/shots-m53.mjs`, `scripts/shots.mjs`, `docs/CODE_MAP.md`.

### 11.2 Sections and modes (`src/ui/modes.ts`)

- `SECTION_IDS` gets `'helm'` after `'ropes'`; `TAB_OF.helm = 'controls'`; title `t('real.station.helm')` ("Helm"); `explain: true` (its hints `real.helm.hint`, `real.helm.slot` are `explain` texts today).
- `sectionAvailable('helm', state)` = `state.settings.ropesMode === 'realistic'`.
- `MODE_LAYOUTS[mode].order`: `helm` right after `ropes` in `easy`, `learn` and `realistic`; in `harbour`: `engine, helm, harbour, anchor, place, conditions, sails, ropes, autopilot, learn` (plus `mode` first and `settings` last, as today). `second` is unchanged (`helm` is in column 1).

### 11.3 The Helm section

- `createHelmStation(store: Store): HTMLElement` in `realisticPanel.ts` (with its own `store.subscribe` for what `refresh()` does for the helm today: `wheel.refresh`, `helmSlot.update`, showing or hiding) returns today's `helm` block (test id `helm-station`: the hints, the handle slot, the wheel, `createAutopilotPanel(store)`, `createEngineLever(store)`, the thrusters `thruster-helm`, the windlass remote `windlass-helm`), moved unchanged, plus two new parts at its top:
  - `<p class="hint" data-testid="helm-away">` with `t('real.helm.away', { station })` ("You are at the Port station."; `station` = `t('real.station.<id>')`) and a button `helm-go` `t('real.helm.go')` ("Go to the helm"), shown only while `realistic.station !== 'helm'`; the button dispatches `{ type: 'realistic', action: { type: 'station', station: 'helm' } }`;
  - the rest of the block is shown only while `realistic.station === 'helm'` (one person, one place: as today, the helm's controls work only when you stand there).
- **Opening the Helm section by its title walks to the helm:** the panel's title-tap handler (`panel.ts`, a `helm` branch next to the `openOnly` call) dispatches the station action `helm` when the Helm section opens and the station is not `helm`. Only the title tap walks; `showSection('helm')` called from code (a selection, Harbour, a link) does not. `panel.ts` also gets the `helm` entries in `SECTION_TITLES` and `built`.
- The station alerts (`station-alerts`: a rope running at another station) and the paused line stay in the Ropes section; at the helm they are seen by opening Ropes, and the badges on the Port, Starboard, Mast and Bow buttons still show (decided in planning; a known limitation for the PR).
- **The Ropes section's station bar** (`realisticPanel.ts`) shows Port, Starboard, Mast, Bow (no Helm button: the bar, `stationButtons` and the badge logic skip `helm`; `STATION_IDS` keeps five). While the station is `helm`, no station button is pressed and the Ropes section shows, directly under the station bar, `<p class="hint" data-testid="real-at-helm">` with `t('real.atHelm')` ("You are at the helm. Choose a station to work the ropes."); the handle bar, Practice and "How to" stay in Ropes.
- **Selections:** in Realistic ropes, selecting the wheel opens the Helm section. "The wheel" is `entryFor(state.selection)?.controlId === 'ctl_rudder'` (it covers `part_rudder` and the two wheel fittings `helm_port`, `helm_starboard`). Both places in `panel.ts` use it: the store subscriber's selection rule (before the Ropes rule) and `applyOpen`'s link rule. The strip's go-there button (`real.strip.go`, "Go to Helm") for the wheel (`realisticPanel.ts`: "if (entry?.controlId === 'ctl_rudder') return station === 'helm' ? null : 'helm';") walks to the helm and calls `showSection('helm')`: `createRopesTab(store, openEntry, showSection)` gets a third parameter and passes it to `createRealisticPanel`.
- **Links:** `applyOpen` (at the start, from a link) checks in this order: Learn mode with an entry (Learn); Harbour (`openHarbourFirst`); a selection that is the wheel, with Realistic ropes (Helm); any other selection with an entry (Ropes); Realistic ropes with `realistic.station === 'helm'` (Helm). In Harbour mode with Realistic ropes, `openHarbourFirst` opens `helm` (today `ropes`).
- The quick row's Realistic text (`quick.realistic`) is unchanged.

### 11.4 Strings

| Key | English | Russian (draft) |
|---|---|---|
| `real.helm.away` (new, after `real.helm.slot`) | You are at the {station} station. | Вы на месте «{station}». |
| `real.helm.go` (new) | Go to the helm | Перейти к штурвалу |
| `real.atHelm` (new) | You are at the helm. Choose a station to work the ropes. | Вы у штурвала. Выберите место, чтобы работать с концами. |

### 11.5 Tests

`tests/modes.test.ts` (new tests; the existing "autopilot/engine only in Easy" test stays as it is): `helm` is available only with Realistic ropes; it follows `ropes` in the Easy, Learn and Realistic orders and `engine` in Harbour; `TAB_OF.helm` is `controls`.

### 11.6 Helpers (`scripts/ui.mjs`)

- `holdThruster(page, which, dir, ms, 'helm')`: opens the Helm section with `showSection(page, 'helm')` instead of the station button, then, if `helm-go` is visible (an already open Helm section does not walk), clicks it.
- `holdWindlass(page, dir, ms, '-helm')`: the same.
- `TAB_OF_JS` (M51's copy in `scripts/ui.mjs`) gets `helm: 'controls'`.

### 11.7 Browser checks (`scripts/shots-m53.mjs`, test clock)

Scenes: `helm-section` (phone and desktop, `?mode=realistic&st=helm&cam=helm`), `harbour-realistic` (`?m=harbour&mode=realistic&pl=marina`).

Live (phone, then desktop):

1. `?mode=realistic&st=helm`: `section-helm` open and shown, `helm-station` visible with the wheel, `engine-helm`, `thruster-helm`, `windlass-helm`; `helm-away` hidden.
2. `?mode=realistic&st=port`: the station bar reads "Port|Starboard|Mast|Bow"; `showSection(page, 'helm')` → the link has `st=helm` and the helm's controls show.
3. **Away from the helm:** `?mode=realistic&st=port&sel=part_rudder` → the Helm section is open (by the selection, without walking): `helm-away` reads "You are at the Port station.", the helm's controls are hidden; tap `helm-go` → `waitForLink(page, ['st=helm'])` and the controls show.
4. The wheel tapped in 3D (`hitCentres` of `helm_starboard`, `?mode=realistic&debug=1&held=1&sea=flat&cam=helm`) → the Helm section is open.
5. `?m=harbour&mode=realistic&pl=marina` → the Helm section is open (not Ropes), with `helm-away` shown (she starts at Port).
6. Easy ropes: `section-helm` is hidden.
7. `auditPage` with Helm open: no problems.

### 11.8 Older checks to change

- `scripts/shots-m4b.mjs` (the "stations" check) and `scripts/shots-m46.mjs` ("bow station: the station bar"): expected `Port|Starboard|Mast|Bow`.
- `scripts/shots-m4c.mjs` "helm slot" (about line 582): add `await showSection(page, 'ropes')` before the tap on the Starboard station button (Helm is open at the start with `st=helm`).
- `scripts/shots-m23.mjs` (the Latin scan of the Realistic stations): the station loop becomes `['starboard', 'mast', 'bow']` with `showSection(page, 'ropes')` before it; the Helm is scanned separately with `showSection(page, 'helm')`. (Its first loop over `sectionIds` now also visits Helm and walks there; that is fine.)
- `scripts/shots-m27.mjs`: `SECTION_ORDER.realistic` gets `'helm'` after `'ropes'`.
- `scripts/shots-m12.mjs` "m12 helm lever" (about line 197), `scripts/shots-m41.mjs` "helm" block (about line 162), `scripts/shots-m46.mjs` "helm remote" (about line 119) and `scripts/shots-m47.mjs` (the `audit('helm thrusters', …, ['ropes'])` call, about lines 117–122): `showSection(page, 'ropes')` / `['ropes']` becomes `'helm'` / `['helm']`.

### 11.9 Done when

The Helm section works as 11.3 on a phone and a computer, the station bar has four stations, `st=helm` links and Harbour with Realistic ropes open Helm; typecheck, lint, tests, build and `SHOTS_ONLY=m4b,m4c,m5,m6,m12,m23,m27,m29,m35,m41,m46,m47,m53` pass, then CI.

### 11.10 Not in M53

Changing the helm's controls themselves, a helm drawing, the autopilot or engine sections in Easy mode.

### 11.11 Decided in the M53 PR

(empty)

---

## 12. M54: Sections you can move (computer)

**Independent review: required** (changes how the wide layout places every section, and stores a layout on the device).

Issue #110 (it replaces #103: sections no longer jump between the columns when the mode changes). Owner's answer 7: one layout for all modes; move between the columns and up or down; computer only. Owner's answer 14 (d): "Reset layout" also resets the column widths and folds (M39) and the folded time bar (M37).

### 12.1 Files

New: `src/ui/sectionLayout.ts` (pure), `src/ui/sectionMove.ts` (DOM: grips, drag, menu, keys), `tests/sectionLayout.test.ts`, `scripts/shots-m54.mjs`. Changed: `src/ui/panel.ts` (`place()` on the wide layout; owns the layout state), `src/ui/modes.ts` (`second` removed), `src/ui/settingsMenu.ts` (Reset layout; Reset's two-tap code extracted into the exported `createConfirmButton(button: HTMLButtonElement, labels: { idle: string; confirm: string }, onConfirm: () => void): void`: it keeps `data-armed="true"` while armed and puts the idle label back after `RESET_ARM_MS`; Reset keeps its class `action-reset` and test id; used by Reset, Reset layout and later M58's Remove), `src/ui/sections.ts` (`SectionView` gets `title(): string`, the current title text; `sectionMove.ts` finds the header with `element.querySelector('.section-head')`), `src/ui/columnWidths.ts` (exports `COLUMNS_KEY = 'sail-learn.columns'`, moved from `columnHandles.ts`), `src/ui/columnHandles.ts` (imports it), `src/ui/timeBar.ts` (exports `FOLD_KEY`), `src/style.css`, both `ui.json`, `docs/review/ru.md`, `tests/modes.test.ts`, the older checks of 12.8, `scripts/ui.mjs`, `scripts/shots.mjs`, `docs/CODE_MAP.md`.

### 12.2 Behaviour

- On the **wide** layout the two columns hold the sections of the **saved layout**, or of `DEFAULT_WIDE_LAYOUT` when nothing is saved, **in every mode** (the mode no longer moves sections between columns; what opens is unchanged). Unavailable sections stay in their place, hidden. `mode` and `settings` (unavailable on `wide` since M52) stay hidden in column 1.
- **Who owns it:** `panel.ts` reads the layout once at the start (`completeLayout(parseLayout(localStorage.getItem(LAYOUT_KEY)))` in `try/catch`), keeps it, and writes it (`serializeLayout`) **only after a move**, never in `place()` (otherwise Reset layout would be undone). It passes the helpers to `createSectionMove` (12.3).
- `MODE_LAYOUTS[mode].second` is removed; `order` stays (the phone's Controls tab and the side layout use it).
- Each section header on the wide layout has a **grip** at its left, put there by `sectionMove.ts` (`head.prepend(grip)` before `.section-toggle`): `button.section-grip`, 44 × 44 px, the icon "⠿" (`aria-hidden`), `data-testid="section-grip-<id>"`, `aria-label` `t('layout.grip', { name })`, `aria-describedby="layout-grip-hint"` (one visually hidden `<p id="layout-grip-hint">` with `t('layout.gripHint')` in the panel), `aria-haspopup="menu"`, `aria-expanded`, `touch-action: none`. Not shown on `stacked` or `side` (CSS `html:not([data-wide='true']) .section-grip { display: none }`).
- **Drag** (mouse, pen or touch): a `pointerdown` on the grip, then a move of more than 8 px, starts a drag (the pointer is captured then): the section gets `.is-dragging` (opacity 0.6); a 3 px `--accent` line (`.drop-marker`, `position: fixed`, an overlay that does not move the headers) shows where it will land: in the column under the pointer (over the 3D view: the nearer column that is not collapsed; if both are collapsed, no marker and no drop), before the first visible section other than the dragged one whose header's vertical middle is below the pointer, else at the column's end. A collapsed column (M39) takes no drop. `pointerup` drops it there, saves and places; Escape or `pointercancel` cancels. A finished or cancelled drag swallows the `click` that follows (so the menu does not open). The page does not scroll sideways during a drag.
- **Tap on the grip** (no drag; Enter and Space too, through `click`): a small menu built by `sectionMove.ts` itself (one shared `div[role=menu]`, `position: fixed`, appended to the panel host, its top at the grip's bottom edge and its left at the grip's left edge, opening above the grip when there is no room below; `role="menuitem"` buttons; registered with `registerOverlay` from `chipMenu.ts` (M52), so it and a chip menu or card never show together; it closes on Escape, an outside tap, a choice, or a scroll of its column), `aria-label` `t('layout.label')`, three items: `t('layout.up')` "Move up", `t('layout.down')` "Move down", `t('layout.other')` "Move to the other column" (test ids `layout-up`, `layout-down`, `layout-other`); an item that cannot apply (first visible in its column for "Move up", last for "Move down") is `aria-disabled="true"`, does nothing and leaves the menu open.
- **Keys** on a focused grip (`preventDefault`, so the column does not scroll): ArrowUp / ArrowDown move the section one visible place up or down in its column; ArrowLeft puts it in column 1, ArrowRight in column 2, at the same visible position (clamped to the end); ArrowLeft in column 1, ArrowRight in column 2 and Up/Down at the ends do nothing and say nothing; the focus stays on the grip; a polite live region (`.layout-live`, visually hidden) says `t('layout.moved', { name, column, position })` ("Ropes: column 2, place 1.") after a move.
- **"Move to the other column"** inserts it at the end of the other column. "Move up/down" swaps it with the previous / next **visible** section. Visible positions become array indexes with `layoutIndex` (12.3).
- After any move into a collapsed column, `columns.reveal(section.element)` opens that column (after the DOM move) and the focus goes back to the grip. If the moved section was open, `openOnly(id)` runs (the moved section wins in its new column); otherwise `keepOneOpenPerColumn()`.
- **Reset layout** (Settings, shown on the wide layout only, after Detail): a field (`div[data-testid="layout-field"]`, built always, hidden by CSS `html:not([data-wide='true']) [data-testid='layout-field'] { display: none }`) with the title `t('layout.label')`, a button `layout-reset` `t('layout.reset')` "Reset layout" with the two-tap confirm (`createConfirmButton`, `t('layout.resetConfirm')` "Tap again to reset the layout", the same `RESET_ARM_MS`), and the hint `t('layout.resetHint')`. The second tap removes `LAYOUT_KEY`, `COLUMNS_KEY` and `FOLD_KEY` from `localStorage`, marks the Settings to reopen (`openAfterReload('settings')`) and loads the page again with `window.location.replace(window.location.pathname + serializeUrlState(store.getState()) + window.location.hash)` (as the language change does: the address bar can lag the store by 300 ms).

### 12.3 Pure helpers (`src/ui/sectionLayout.ts`)

```ts
export type WideSectionId = Exclude<SectionId, 'mode' | 'settings'>;
export interface SectionLayout { columns: [WideSectionId[], WideSectionId[]] }
/** What parseLayout reads: ids not yet checked. */
export interface RawLayout { columns: [string[], string[]] }
export const LAYOUT_KEY = 'sail-learn.layout';
/** The first-time arrangement (the Easy mode's columns before M54). */
export const DEFAULT_WIDE_LAYOUT: SectionLayout = {
  columns: [['ropes', 'helm', 'sails', 'autopilot', 'engine', 'place', 'anchor', 'harbour'], ['conditions', 'learn']],
};
/** Every wide section exactly once: unknown and repeated ids dropped (first kept), missing ones added at the end of the column DEFAULT_WIDE_LAYOUT puts them in. Always returns new arrays (never DEFAULT_WIDE_LAYOUT itself). */
export function completeLayout(layout: RawLayout | SectionLayout | null): SectionLayout;
/** Takes `id` out and puts it at `index` (0…length, clamped) of `column`, counted after taking it out (also within the same column). Returns a new layout. */
export function moveSection(layout: SectionLayout, id: WideSectionId, column: 0 | 1, index: number): SectionLayout;
/**
 * The array index in `column` (with `id` already taken out) for visible position `visiblePos` among `visibleIds`
 * (the column's visible ids, without `id`): visiblePos < visibleIds.length ? column.indexOf(visibleIds[visiblePos]) : column.length.
 */
export function layoutIndex(column: readonly WideSectionId[], visibleIds: readonly WideSectionId[], visiblePos: number): number;
/** `{"v":1,"c":[[…],[…]]}`. */
export function serializeLayout(layout: SectionLayout): string;
/** Null unless the text is JSON `{ v: 1, c: [array, array] }` with exactly two arrays whose members are all strings. */
export function parseLayout(raw: string | null): RawLayout | null;
```

`src/ui/sectionMove.ts`:

```ts
export function createSectionMove(options: {
  sections: Map<SectionId, SectionView>;
  columns: [HTMLElement, HTMLElement];          // .panel-body, .panel-second
  layout(): SectionLayout;                       // panel.ts's current layout
  apply(next: SectionLayout, moved: WideSectionId): void; // panel.ts: keep, save, place(), reveal, open rules, changed()
  isCollapsed(element: HTMLElement): boolean;    // ColumnHandles.isCollapsed
}): void;
```

M55 adds `'status'` at the end of column 0 of `DEFAULT_WIDE_LAYOUT` (and so `completeLayout` adds it to a saved layout that lacks it).

### 12.4 Strings

| Key | English | Russian (draft) |
|---|---|---|
| `layout.grip` | Move {name} | Переместить: {name} |
| `layout.gripHint` | Drag to another place, or use the arrow keys. | Перетащите в другое место или используйте клавиши со стрелками. |
| `layout.up` | Move up | Выше |
| `layout.down` | Move down | Ниже |
| `layout.other` | Move to the other column | В другую колонку |
| `layout.moved` | {name}: column {column}, place {position}. | {name}: колонка {column}, место {position}. |
| `layout.label` | Layout | Расположение |
| `layout.reset` | Reset layout | Сбросить расположение |
| `layout.resetConfirm` | Tap again to reset the layout | Нажмите ещё раз, чтобы сбросить расположение |
| `layout.resetHint` | Puts the sections back in their columns, and the columns and the time bar as they were at the start. | Возвращает разделы в их колонки, а колонки и шкалу времени — как было в начале. |

All new, in this order, after the `settings.*` keys.

### 12.5 Tests (`tests/sectionLayout.test.ts`)

1. `completeLayout(null)` equals `DEFAULT_WIDE_LAYOUT`.
2. `completeLayout({ columns: [['learn', 'ropes', 'ropes', 'bogus'], []] })` → column 0 starts `learn, ropes`, has no `bogus` and one `ropes`; `conditions` is in column 1; every wide section appears exactly once.
3. `moveSection(DEFAULT_WIDE_LAYOUT, 'conditions', 0, 0)` → column 0 starts with `conditions`, column 1 is `['learn']`.
4. `moveSection(…, 'ropes', 0, 99)` → `ropes` is last in column 0.
5. `parseLayout(serializeLayout(x))` equals `x`; `parseLayout('{"v":2,"c":[[],[]]}')`, `parseLayout('{"v":1,"c":[[]]}')`, `parseLayout('{"v":1,"c":[[1],[]]}')`, `parseLayout('[]')`, `parseLayout('nope')` and `parseLayout(null)` are null.
6. `moveSection` within one column: `sails` to index 0 of column 0 → column 0 starts `sails, ropes`.
7. `layoutIndex` with a hidden `helm` between `ropes` and `sails` (the moved section already taken out): `layoutIndex(['ropes', 'helm', 'sails'], ['ropes', 'sails'], pos)`: pos 0 → 0, 1 → 2 (before `sails`), 2 → 3 (the end).
8. `completeLayout(null) !== DEFAULT_WIDE_LAYOUT` and its arrays are new.
9. `tests/modes.test.ts`: delete only the lines that read `.second` (by content: `for (const id of layout.second) …`, `expect(layout.second).toHaveLength(2)`, the two `expect(layout.second).not.toContain('mode' | 'settings')` lines and `expect(harbour.second).toEqual(['place', 'conditions'])`); the tests around them stay; the title "every section once; second is a subset" becomes "every section once".

### 12.6 Helpers (`scripts/ui.mjs`)

`moveSectionBy(page, id, how)`: clicks `section-grip-<id>`, then `layout-up` / `layout-down` / `layout-other`. `columnSections(page)`: `[string[], string[]]`, the displayed `[data-section]` ids of `.panel-body` and `.panel-second`, in page order.

### 12.7 Browser checks (`scripts/shots-m54.mjs`, wide 1,440 × 900)

Every `openPage` makes a new context, so the storage starts empty (no clearing needed; a reload keeps it). Scene: `layout-default`. Pictures of a drag held at the middle and of the moved layout are taken inside the live checks with `shot()` (as `shots-m39.mjs` does).

Live:

1. **Default:** `columnSections` equals `completeLayout(null)` with the hidden sections left out (written as a list in the check: column 1 `ropes, sails, autopilot, engine, place, anchor, harbour`, column 2 `conditions, learn`; M55 adds `status` to this check); the grips are visible and 44 px.
2. **Menu:** `moveSectionBy(page, 'conditions', 'other')` → column 1 ends with `conditions`, column 2 is `learn`; reload → the same (saved).
3. **Mode does not move sections:** after 2, `setMode(page, 'harbour')` → `columnSections` unchanged; `setMode(page, 'learn')` → unchanged.
4. **Drag:** drag `section-grip-learn` (mouse: down, move in 10 steps, up) onto the top of column 1 (above the `ropes` header's middle) → column 1 starts with `learn`.
5. **Keys:** focus `section-grip-sails`, ArrowUp → `sails` before `ropes`… (one visible place up); ArrowRight → `sails` is in column 2; the live region's text contains "column 2".
6. **Up/Down limits:** the first section's "Move up" is `aria-disabled`.
7. **Reset layout:** open the settings, tap `layout-reset` twice → after the reload `columnSections` is the default again, `localStorage['sail-learn.layout']` is null, and the settings are open.
8. **Not on a phone or the side layout:** at 390 × 844 and 820 × 1000 no `.section-grip` is visible and `layout-reset` is hidden.
9. `auditPage` on the wide layout with a grip menu open: no problems.

### 12.8 Older checks to change

- `scripts/shots-m29.mjs` check 1: the tuple `['learn', '?m=learn&learn=rope_vang', ['conditions', 'ropes']]` becomes `['conditions', 'learn']`, and the tuples get a fourth element, the expected open states of column 2 (`['false', 'true']` for the Learn row, whose link opens Learn, now in column 2; `['false', 'false']` for the others), used in place of the "column 2 all folded" assertion; its comments about the mode's second column are updated.
- No other check needs a change for this: `shots-m36.mjs` (about lines 218–240) asserts Learn in column 2 and Ropes not, which the default layout keeps; m39 and m42 assert nothing about columns (do not hunt there).

### 12.9 Done when

Sections move by drag, menu and keys on the wide layout, the arrangement survives a reload and a mode change, Reset layout restores everything; typecheck, lint, tests, build and `SHOTS_ONLY=m29,m35,m36,m38,m39,m42,m54` pass, then CI.

### 12.10 Not in M54

Moving sections on a phone or the side layout, a layout per mode, moving the chips or the instruments.

### 12.11 Decided in the M54 PR

(empty)

---

## 13. M55: Status section

**Independent review: required** (new alert kinds read from shared state every step; the history's model changes).

Issue #109. Owner's answer 8: move the sail wear and Repair (from Sails) and the damage list (from Place) into Status; the history shows in both Status and the Attention card; tag chips such as "Damage", "Sail", "Rope", "Danger"; rope and winch warnings and damage join the history, each at most once every 10 s. (A lost fender and a line round the propeller are already damage reports since M43 and M44: `ContactReport` with `obstacleId` `'fender'` or `'propeller'`; the one new `contact` kind covers them.)

### 13.1 Files

New: `src/ui/statusPanel.ts`, `scripts/shots-m55.mjs`. Changed: `src/model/alerts.ts` (the store already passes the whole state to `recordAlerts`; `store.ts` needs no change), `scripts/ui.mjs` (`TAB_OF_JS.status = 'controls'`, and `helm` too if M53 left it out), `docs/BOAT_REFERENCE.md` (the alert history row: the 10 s repeat gap of the rope and winch warnings), `src/ui/alertCentre.ts` (`createAlertList`, texts and tags of the new kinds), `src/ui/sailsPanel.ts` (the wear rows and Repair move out: `createSailWear`), `src/ui/placePanel.ts` (no longer calls `createDamageList`), `src/ui/damageReport.ts` (unchanged code; the list it builds moves), `src/ui/anchorPanel.ts` (`anchorStatusText`), `src/ui/harbourPanel.ts` (`fenderStatusText`), `src/style.css`, `src/ui/panel.ts`, `src/ui/modes.ts`, `src/ui/sectionLayout.ts` (`status` in the default), `content/boat/hanse508.json` (`physics.alerts.ropeRepeatGapS`), both `ui.json`, `docs/review/ru.md`, `tests/alerts.test.ts`, `tests/modes.test.ts`, the older checks of 13.8, `scripts/shots.mjs`, `docs/CODE_MAP.md`.

### 13.2 Data

`physics.alerts` gets, after `repeatGapS`: `"ropeRepeatGapS": 10` and in its `note`: "M55: the rope and winch warnings of Realistic mode are written again only 10 s after the last one of the same kind and rope or winch (owner, planning of Phase 8)." **Tunable.**

### 13.3 Model (`src/model/alerts.ts`)

New kinds, appended to `ALERT_KINDS` in this order: `contact`, `ropeSlipping`, `winchCutOut`, `clutchOnRunning`.

| Kind | Starts when (between `previous` and `next`) | Entry extras | Severity | Learn id | Tag |
|---|---|---|---|---|---|
| `contact` | the reports of `next.contact.reports` not in `previous.contact.reports` (skip at once when both lists are the same object; else `const known = new Set(previous.contact.reports)`, `next.contact.reports.filter((r) => !known.has(r)).reverse()`: oldest first; Clear or a new place empties the list and adds nothing) | `contact`: the report | `obstacleId === 'propeller'` → `danger`; `'fender'` (a fender torn off) → `warning`; otherwise `severity` `knock` or `hit` → `danger`, `touch` or `bump` → `warning`, `fender` (a fender took it) → `info` | `part_saildrive` for `'propeller'`, `term_grounding` for `'bottom'`, else `fit_fender` | `damage` |
| `ropeSlipping` | a tail's `next.realistic.reports[key].note === 'slipping'` and its previous note was not | `rope`: that tail's rope id (`tailSpecs()` → `ropeId`) | `warning` | `fit_winch` | `rope` |
| `winchCutOut` | a winch's `next.realistic.winches[id].cutOut` and not `previous…cutOut` | `winch`: the winch id | `warning` | `fit_winch` | `rope` |
| `clutchOnRunning` | `next.realistic.notice !== previous.realistic.notice && next.realistic.notice?.key === 'closedOnRunning'` (a new notice object, also when the old one had the same key; the store already clears the notice while paused) | `rope` (the notice's `tail` → `tailSpec(tail).ropeId`) when known | `warning` | `fit_clutch` | `rope` |

- `ropeSlipping`, `winchCutOut` and `clutchOnRunning` are written again only `physics.alerts.ropeRepeatGapS` (10 s) after the last entry **of the same kind and the same key**, the key being `entry.rope ?? entry.winch ?? ''` (a second list `ROPE_REPEATING` next to `FLICKERING`, with that gap and key). A rope still slipping after the gap writes nothing new (the note is caught when it starts).
- `started()` returns kinds only; the kinds that make one entry per report, tail or winch (`contact`, `ropeSlipping`, `winchCutOut`) get their own loops in `recordAlerts`, as `sailWorn` has.
- `ALERT_INFO` (a `Record<AlertKind, …>`) gets an entry for each new kind (its `learnId` and severity as the table; `contact` → `{ learnId: 'fit_fender', severity: 'warning' }` as the fallback, the entry's real severity coming from its report; the registry test checks every `learnId` exists); `alertLearnId(entry)` special-cases `contact` (by `obstacleId`, as the table); `ALERT_TEXT` in `alertCentre.ts` excludes the four new kinds (their texts are built as 13.5 says).
- `AlertSource` gains `contact: ContactState` and `realistic: RealisticState`; `AppState` has them, so the store passes the state as today.
- **Tags:**

```ts
export const ALERT_TAGS = ['danger', 'damage', 'sail', 'rope', 'gear', 'steering'] as const;
export type AlertTag = (typeof ALERT_TAGS)[number];
/** M55: the tag chip of an entry. */
export function alertTag(entry: AlertEntry): AlertTag;
```

Tags of the existing kinds: `gybe` → `danger` if `report.accidental`, else `steering`; `tack` → `steering`; `byTheLee` → `danger`; `overpowered` → `sail`; `roundUp` → `danger`; `tookWheel` → `steering`; `fendersOut` → `gear`; `sailWorn` → `sail`; `anchorAlarm` → `danger`; the new kinds as the table.

### 13.4 The Status section (`src/ui/statusPanel.ts`)

`createStatusPanel(store, showLearn): HTMLElement[]` (`panel.ts` passes `showLearnEntry`, as the Attention card gets: the mode stays). `SectionId` `'status'`, title `t('status.label')`, `explain: true` with one explain line at the top, `<p class="hint explain">` `t('status.hint')`, always available, `TAB_OF.status = 'controls'`; in every mode's `order` right after `harbour`; in `DEFAULT_WIDE_LAYOUT` at the end of column 0. Its body, top to bottom (each block an `h3.section-title` and its content):

1. **Sails** (`t('status.sails')`): `createSailWear(store)` (moved from `sailsPanel.ts`: the two wear rows `trim-wear-main`, `trim-wear-jib`, each now with its sail's name in front, `<span class="trim-name">` `t('trim.main')` / `t('trim.jib')`, and the Repair button `repair-sails`, test ids unchanged; the wear and Repair part of `createSailsPanel`'s refresh moves into `createSailWear` with its own `store.subscribe`) and, while `sailDamage.main === 0 && sailDamage.jib === 0`, `<p class="hint" data-testid="status-sails-good">` `t('status.sailsGood')` (so it is hidden exactly when a wear row shows).
2. **Gear** (`t('status.gear')`): three lines, `status-fenders`, `status-anchor`, `status-propeller`:
   - fenders: the Harbour gear section's text, through a new exported `fenderStatusText(harbour: HarbourState): string` in `harbourPanel.ts` (the inline code there that picks `harbour.fenders.status.in` / `.out` and adds `.lost`, moved into it and used by both);
   - anchor: `t('status.anchor.stowed')` when the anchor is stowed, otherwise the Anchor section's own status text: move the code that builds it inside `createAnchorPanel` (the `text` array that `setText(status, text.join(' '))` writes) into an exported `anchorStatusText(state: AppState): string` in `anchorPanel.ts`, used by both;
   - propeller: `t('status.propeller.clear')`, or `lines.fouled`'s text (`t('lines.fouled')`) while fouled (the Clear the propeller button stays in Harbour gear).
3. **Damage** (`t('status.damage')`): `createDamageList(store)` (from `damageReport.ts`; the Place section no longer calls it; test ids unchanged). Its own title ("Damage report (N)") stays under the block's heading.
4. **History** (`t('status.history')`): `createAlertList(store, showLearn, { filter: true, idPrefix: 'status-alert' })`. With `filter: true` the list builds its own filter row at its top (`div.status-filter[role=group]`, `aria-label` `t('status.filter')`) of seven toggle buttons, 44 px high, `status-filter-all`, `status-filter-danger`, … (`aria-pressed`; All pressed at the start; pressing a tag shows only entries with that tag; pressing All shows all), keeping the filter in a closure; when the filter leaves nothing, the list shows `t('status.filter.none')`. The Status list re-renders on every history change (whether or not the section is open) and never touches the Attention card's "seen" count or badge.

`createAlertList(store, showLearn, options: { filter: boolean; idPrefix: 'alert' | 'status-alert'; renderWhen?: () => boolean })` returns a `div` holding the filter row (when `filter`), the empty message (`<p data-testid="<prefix>-empty">`: `t('alerts.empty')` when there are no entries at all, `t('status.filter.none')` when entries exist but the filter hides them all) and the `ol` (`<prefix>-list`, class `alert-list`, keeping its scrolling CSS); each row is `<li data-testid="<prefix>-item" data-kind="<kind>">`. The open and "seen" logic, the badge and the phone rule that folds the card after a "?" stay in the card: it passes `showLearn` as `(id) => { showLearn(id); if (stacked()) setOpen(false, true); }` and `renderWhen: () => isOpen()` (the card's list renders only while open, as today, so the M36–M38 counts do not change); the Status list renders on every history change. The Attention card calls it with `{ filter: false, idPrefix: 'alert' }`, so its test ids stay `alert-list`, `alert-item`, `alert-empty`, `alert-learn` and its tag chips are `alert-tag`; the Status list's are `status-alert-list`, `status-alert-item`, `status-alert-empty`, `status-alert-learn`, `status-alert-tag` (the Status section is in the page even when folded, so the same ids twice would break the M36–M38 checks).

Each history row (in the Status section **and** the Attention card) gets a tag chip (13 px text at least) after its time: `<span class="alert-tag alert-tag-<tag>" data-testid="alert-tag">` with `t('status.tag.<tag>')`. Tag colours: `danger` the alert red, `damage` orange, `sail` and `rope` the accent blue, `gear` and `steering` grey (CSS tokens of the alert card).

`alert.sailWorn.main` / `.jib` change their last sentence to "Repair it under Status." (13.5), since Repair moved.

### 13.5 Strings

| Key | English | Russian (draft) |
|---|---|---|
| `status.label` | Status | Состояние |
| `status.hint` | The boat's condition in one place: the sails' wear, the gear, what was hit, and everything that happened, newest first. | Состояние яхты в одном месте: износ парусов, снаряжение, столкновения и всё, что произошло, сначала новое. |
| `status.sails` | Sails | Паруса |
| `status.sailsGood` | Both sails are in good shape. | Оба паруса в порядке. |
| `status.gear` | Gear | Снаряжение |
| `status.anchor.stowed` | Anchor: in the bow roller. | Якорь: в носовом ролике. |
| `status.propeller.clear` | Propeller: clear. | Винт: свободен. |
| `status.damage` | Damage | Повреждения |
| `status.history` | What happened | Что произошло |
| `status.filter` | Show | Показать |
| `status.filter.all` | All | Все |
| `status.tag.danger` | Danger | Опасность |
| `status.tag.damage` | Damage | Повреждение |
| `status.tag.sail` | Sail | Парус |
| `status.tag.rope` | Rope | Конец |
| `status.tag.gear` | Gear | Снаряжение |
| `status.tag.steering` | Steering | Управление |
| `alert.ropeSlipping` | {rope}: slipping on the winch drum. Add a turn. | {rope}: проскальзывает на барабане лебёдки. Добавьте шлаг. |
| `alert.winchCutOut` | The {side} winch cut out: too much load. | Лебёдка {side} борта отключилась: слишком большая нагрузка. |
| `alert.clutchOnRunning` | A clutch was shut on a running rope under load: it can be damaged. | Стопор закрыли на бегущем нагруженном конце: он может повредиться. |
| `alert.sailWorn.main` (changed) | The mainsail is worn out from flapping (flogging). Repair it under Status. | Грот изношен от хлопанья (заполаскивания). Почините его в разделе «Состояние». |
| `alert.sailWorn.jib` (changed) | The jib is worn out from flapping (flogging). Repair it under Status. | Стаксель изношен от хлопанья (заполаскивания). Почините его в разделе «Состояние». |

The `status.*` keys are new, after `settings.*` (with `status.filter.none` | Nothing with this tag yet. | Пока ничего с этой меткой. | after `status.filter.all`); the `alert.*` keys after `alert.tack`. `{rope}` is the rope's name (`part(ropeId).name`); `{side}` is `t('side.port.gen')` or `t('side.starboard.gen')`, the side of the station whose `stationWinch(station)` is the winch (`port` or `starboard`; with none, the text without a side is not needed: every winch belongs to one). A `contact` entry's text is `damageText(entry.contact)` (a hit, a lost fender or the propeller, exactly as the damage alert says it).

### 13.6 Tests (`tests/alerts.test.ts`)

Build `previous`/`next` states from `initialState()` and edit the parts:

1. A new contact report (`reports: [report]` with `severity: 'hit'`) → one `contact` entry, `danger`, tag `damage`, `entry.contact === report`.
2. `severity: 'touch'` → `warning`; `severity: 'fender'` → `info`; `obstacleId: 'bottom'` → `alertLearnId` `term_grounding`; the list emptied (Clear) → no entry.
3. Two new reports at once (a lost fender, `obstacleId: 'fender'`, then a hit) → two `contact` entries, oldest first, the fender one `warning`.
4. A report with `obstacleId: 'propeller'` → `danger`, `alertLearnId` `part_saildrive`.
5. A tail's note → `slipping` → one `ropeSlipping` with that rope; the same again 5 s later (`rig.timeS` + 5) → no new entry; 10 s later → a new one; a different rope 1 s later → a new one.
6. A winch's `cutOut` false → true → `winchCutOut` with the winch id.
7. The notice `closedOnRunning` appears → `clutchOnRunning`.
8. `alertTag`: an accidental gybe → `danger`, a controlled one → `steering`; `overpowered` → `sail`; `fendersOut` → `gear`; every kind returns one of `ALERT_TAGS`.
9. The existing nine kinds behave exactly as before (the existing tests stay unchanged).

### 13.7 Browser checks (`scripts/shots-m55.mjs`, test clock)

Scene: `status-section` (phone and desktop): the query of the M43 `damage-list` scene (a bump in the marina) with `waitMs`, `sheet: 'full'` as there, and `section: 'status'`. The picture with the Damage filter pressed is taken in live check 4 (`shot()`).

Live:

1. **Sections:** `showSection(page, 'status')`: the four blocks are visible; `status-sails-good` shows; `status-anchor` reads "Anchor: in the bow roller."; `status-propeller` "Propeller: clear.".
2. **Sails moved:** with `__sailDebug.setDamage(0.9, 0)` (`?debug=1`): `trim-wear-main` is inside `section-status` and not inside `section-sails`, and `status-sails-good` is hidden; then `setDamage(1, 0)` (torn: Repair shows only then) and `repair-sails` (inside Status) clears it and `status-sails-good` shows again.
3. **Damage moved:** in the marina, bump the quay as the M43 checks do (reuse their link and steps) → the damage list inside `section-status` has a row; `section-place` has no damage list; the history has an entry with the tag "Damage".
4. **Filter:** press `status-filter-damage` → only rows tagged Damage are shown; `status-filter-all` → all rows.
5. **Attention card:** the same entries with their tag chips (`alert-tag`) show in the Attention card (`alert-chip`); the Status list has them as `status-alert-item` / `status-alert-tag`.
6. **Rope warning:** Realistic mode, the slipping case of the M4b checks (a rope with too few turns under load; reuse its link) → an entry "…: slipping on the winch drum. Add a turn." tagged Rope; wait 5 s of app time → still exactly one `[data-kind="ropeSlipping"]` row (other kinds may appear in that wind).
7. `auditPage` with Status open, phone and desktop: no problems.

### 13.8 Older checks to change

- `scripts/shots-m9.mjs` (about lines 128–139): the wear text and `repair-sails` are read after `showSection(page, 'status')`, the `trim-chip-main` lines after `showSection(page, 'sails')` (one section open at a time).
- `scripts/shots-m43.mjs`: the scenes `damage-list` and `damage-list-ru` use `section: 'status'`; the damage list, `damage-clear` and `damage-none` checks (about lines 59–67) open Status instead of Place.
- `scripts/shots-m27.mjs` (`SECTION_ORDER`, the "every section folded" string), `scripts/shots-m23.mjs` (about line 158), `scripts/shots-m35.mjs`, and `scripts/shots-m54.mjs` check 1: `status` follows `harbour` (column 1's end on the wide layout).
- Checks using `eachSection` or the audit now also visit Status (its filter buttons are 44 px).

### 13.9 Done when

The Status section shows the four blocks on a phone (Controls tab) and a computer, the new kinds are written once each with the right tag, the filter and the tag chips work in both places; typecheck, lint, tests, build and `SHOTS_ONLY=m9,m23,m27,m35,m36,m37,m38,m43,m44,m45,m55` pass, then CI.

### 13.10 Not in M55

Lasting damage, sounds or vibration, a history in the link, exporting the history.

### 13.11 Decided in the M55 PR

(empty)

---

## 14. M56: Your setup in a file

**Independent review: required** (reads a file from outside into links and device storage).

Issue #111. Owner's answer 9: the file holds what the link holds (the boat, the wind, the place, every setting), the language, and what this device remembers (column widths and folds, the folded time bar, the section layout); not the alert history or the damage list; loading reloads the app.

### 14.1 Files

New: `src/app/setupFile.ts` (pure), `src/ui/deviceSettings.ts`, `src/ui/files.ts`, `tests/setupFile.test.ts`, `scripts/shots-m56.mjs`. Changed: `src/ui/settingsMenu.ts`, both `ui.json` (`COLUMNS_KEY`, `FOLD_KEY` and `LAYOUT_KEY` are exported since M54), `docs/review/ru.md`, `scripts/shots.mjs`, `docs/CODE_MAP.md`.

### 14.2 The file

```json
{
  "app": "sail-learn-and-train",
  "kind": "setup",
  "version": 1,
  "savedAt": "2026-10-23T10:15:00.000Z",
  "link": "?v=1&…",
  "device": {
    "columns": { "w": [400, 360], "c": [0, 0] },
    "timeBarFolded": false,
    "layout": { "v": 1, "c": [["ropes", "…"], ["conditions", "learn"]] }
  }
}
```

- `link` is `serializeUrlState(state)` (it holds `lang` when not English, and every key of the boat, the wind and the place).
- **The file holds the stored shapes**, as above: `device.columns` is `JSON.parse(serializeColumns(columns))` (`{ w, c }`), `device.timeBarFolded` a boolean, `device.layout` `JSON.parse(serializeLayout(layout))` (`{ v, c }`) or `null` when no layout is saved. In memory (`DeviceSettings`, 14.3) they are `ColumnState` and `SectionLayout`.
- Storage formats (as today): `sail-learn.columns` holds `serializeColumns(…)`; `sail-learn.timeBarFolded` holds `'1'` (folded) or `'0'`, anything else reads as not folded; `sail-learn.layout` holds `serializeLayout(…)`.
- The file name: `sail-setup-YYYY-MM-DD.json` (the device's local date).

### 14.3 Pure helpers (`src/app/setupFile.ts`)

```ts
export const SETUP_VERSION = 1;
/** In memory. */
export interface DeviceSettings { columns: ColumnState; timeBarFolded: boolean; layout: SectionLayout | null }
/** As written in the file (14.2). */
export interface SetupFile { app: 'sail-learn-and-train'; kind: 'setup'; version: number; savedAt: string; link: string; device: { columns: unknown; timeBarFolded: boolean; layout: unknown | null } }
export type SetupProblem = 'notJson' | 'notSetup' | 'newer' | 'badLink';
export function makeSetupFile(link: string, device: DeviceSettings, savedAtIso: string): SetupFile;
export function setupFileName(date: Date): string;  // local date
/** Checks a file's text and returns the link and the device settings in memory. The device part is cleaned with parseColumns / parseLayout (bad or missing parts become the defaults, never an error). */
export function readSetupFile(text: string): { ok: true; link: string; device: DeviceSettings } | { ok: false; problem: SetupProblem };
```

- `notJson`: `JSON.parse` throws. `notSetup`: not an object, or `app`/`kind` differ. `newer`: `version` > `SETUP_VERSION` or not a number. `badLink`: `link` is not a string starting with `?` or is longer than 8,000 characters.
- `device` (missing → all defaults): `columns` → `parseColumns(columns === undefined ? null : JSON.stringify(columns))`; `timeBarFolded === true`; `layout` → `layout === undefined || layout === null ? null : parseLayout(JSON.stringify(layout))`.
- `setupFile.ts` touches no `window` or storage (the tests run in Node).

`src/ui/deviceSettings.ts`: `readDeviceSettings(): DeviceSettings` and `writeDeviceSettings(device: DeviceSettings): void`, using `COLUMNS_KEY`, `FOLD_KEY` and `LAYOUT_KEY` and the formats of 14.2; `layout: null` removes `sail-learn.layout` (intended: loading a setup saved on a phone puts a computer back to the default layout, because the file "puts everything back"). Both in `try/catch`.

### 14.4 UI (Settings, after Detail and the Layout row, before Share and Reset)

A field "Your setup" (`t('setup.label')`): two buttons `setup-save` `t('setup.save')` "Save to a file" and `setup-load` `t('setup.load')` "Load from a file", a hidden `<input type="file" data-testid="setup-file" accept=".json,application/json">`, the hint `t('setup.hint')`, a status line `setup-status` (`aria-live="polite"`).

- **Save:** `downloadJson(setupFileName(new Date()), makeSetupFile(serializeUrlState(state), readDeviceSettings(), new Date().toISOString()))`; status `t('setup.saved', { name })`.
- **Load:** the `setup-load` button only calls `input.click()`. The input has **one permanent `change` listener** (so a file given to it directly, as the browser check does, works too): `pickJsonFile(input)` (reads `input.files?.[0]`; none → `null`; `size > 1_000_000` → `'tooBig'`; else `await file.text()`; then `input.value = ''` so the same file can be chosen again) → `'tooBig'` → status `t('setup.problem.tooBig')`; text → `readSetupFile`; a problem → status `t(('setup.problem.' + problem) as StringKey)`; ok → `writeDeviceSettings(device)`, then `window.location.replace(window.location.pathname + link)` (a full load, no history entry: the device settings are read at the start).

### 14.5 Strings

| Key | English | Russian (draft) |
|---|---|---|
| `setup.label` | Your setup | Ваши настройки |
| `setup.save` | Save to a file | Сохранить в файл |
| `setup.load` | Load from a file | Загрузить из файла |
| `setup.hint` | The boat, the wind, the place, every setting and the layout, in one file. Loading it puts everything back. | Яхта, ветер, место, все настройки и расположение — в одном файле. Загрузка возвращает всё как было. |
| `setup.saved` | Saved as {name}. | Сохранено как {name}. |
| `setup.problem.tooBig` | This file is too big to be a setup file. | Файл слишком большой для файла настроек. |
| `setup.problem.notJson` | This file cannot be read: it is not a setup file. | Этот файл не читается: это не файл настроек. |
| `setup.problem.notSetup` | This is not a setup file of this app. | Это не файл настроек этого приложения. |
| `setup.problem.newer` | This setup file comes from a newer version of the app. | Этот файл настроек из более новой версии приложения. |
| `setup.problem.badLink` | This setup file is damaged: its boat settings cannot be read. | Файл настроек повреждён: настройки яхты не читаются. |

New, in this order, after the `layout.*` keys.

### 14.6 Tests (`tests/setupFile.test.ts`)

1. `makeSetupFile` then `JSON.stringify` then `readSetupFile` gives the same link and device, with non-default columns (`widths: [450, 320]`, column 2 folded), `timeBarFolded: true` and a moved layout; the file's `device.columns` is `{ w: [450, 320], c: [0, 1] }` and `device.layout.v` is 1.
2. `setupFileName(new Date(2026, 9, 3))` is `sail-setup-2026-10-03.json`.
3. `'{'` → `notJson`; `'{"app":"x","kind":"setup","version":1}'` → `notSetup`; version 2 → `newer`; `link: 'v=1'` → `badLink`.
4. A file whose `device.columns` is `"garbage"` reads ok with the default columns; a file without `device.columns` and `device.layout` reads ok with the default columns and `layout` null.
5. The link of `initialState()` survives: `parseUrlState(readSetupFile(…).setup.link)` gives the same `serializeUrlState` text.

### 14.7 Browser checks (`scripts/shots-m56.mjs`)

Playwright's `page.waitForEvent('download')` and `setInputFiles`.

Every `openPage` makes a new browser context (empty storage, downloads allowed).

1. **Save** (wide 1,440 × 900): `?wd=90&ws=16&lang=ru&cam=top`; move Conditions to column 1 (`moveSectionBy(page, 'conditions', 'other')`); fold the time bar (tap `time-fold`; it is folded when `time-fold` has `aria-expanded="false"`); `openSettings(page)`; `const download = page.waitForEvent('download')`, tap `setup-save` → the download's name is `sail-setup-<today>.json`; read it (`download.path()`): `kind: 'setup'`, the link has `wd=90`, `ws=16`, `lang=ru`, `device.layout.c[0]` contains `conditions`, `device.timeBarFolded` is true. Close this context.
2. **Load in a fresh page:** a second `openPage` (wide, `?`), `openSettings(page)`, `setInputFiles` on `setup-file` with the saved file, wait for the reload (`page.waitForURL(/wd=90/)`, then the canvas) → the link has `wd=90` and `lang=ru`; `columnSections` shows `conditions` in column 1; `time-fold` has `aria-expanded="false"`.
3. **Bad files** (a fresh English page, phone): set `window.__m56 = 1`; `setInputFiles` with `{ name: 'nope.json', mimeType: 'application/json', buffer: Buffer.from('nope') }` → `setup-status` reads "This file cannot be read: it is not a setup file."; `{"app":"x"}` → "This is not a setup file of this app."; `Buffer.alloc(1_000_001)` → "This file is too big to be a setup file."; `window.__m56` is still 1 (no reload).
4. On the phone the two buttons are 44 px high and inside the Settings tab.
5. `auditPage` with the field shown: no problems.

### 14.8 Done when

A saved file loads back the same picture and layout on another browser; bad files are refused with a clear message; typecheck, lint, tests, build and `SHOTS_ONLY=m54,m56` pass.

### 14.9 Not in M56

The imported boat in the file (M58 adds it), cloud saving, several named setups.

### 14.10 Decided in the M56 PR

(empty)

---

## 15. M57: The boat profile file

**Independent review: required** (the boat data behind every model becomes replaceable; the thrusters become optional).

Issue #112 (part 1). Owner's answers 10–12: a profile describes a boat laid out like the Hanse 508 (same ropes and layout, its own numbers), thrusters none, bow only or both; only the Hanse 508 is built in; other setups later.

### 15.1 Files

New: `src/model/boatProfile.ts` (pure), `tests/boatProfile.test.ts`, `docs/BOAT_PROFILE.md`, `scripts/shots-m57.mjs`. Changed: `src/model/boat.ts`, `content/boat/hanse508.json` (`meta.id`, `meta.name`), `src/model/thrusters.ts`, `src/app/store.ts` (the `thruster` action), `src/ui/thrusterPanel.ts`, `src/ui/quickRow.ts` (the `quick-thrusters` group), `src/ui/realisticPanel.ts` (the `thruster-helm` block in `createHelmStation`), `src/ui/panel.ts` (the Engine section's thruster block), `src/render3d/boat/thrusters.ts`, (`src/model/harbourForces.ts` is not touched: it only calls `thrusterForces`; this list wins over 4.4) `src/ui/settingsMenu.ts` (the Boat field), both `ui.json`, `docs/review/ru.md`, `tests/thrusters.test.ts`, `scripts/shots.mjs`, `docs/CODE_MAP.md`, `docs/BOAT_REFERENCE.md` (one line pointing to `BOAT_PROFILE.md`).

### 15.2 Data

`meta` gets, first: `"id": "hanse508"`, `"name": "Hanse 508"`.

### 15.3 Model

**`src/model/boat.ts`:**

```ts
import hanse508 from '../../content/boat/hanse508.json';
export type BoatData = typeof hanse508;
/** The built-in reference boat (content/boat/hanse508.json). */
export const HANSE_508: BoatData = hanse508;
/** The boat in use: the Hanse 508 unless useBoat() ran before the app was loaded (M58). Read it at call time, never copy it into a module constant. */
export let boat: BoatData = HANSE_508;
export let boatId: string = HANSE_508.meta.id;     // 'hanse508'
export let boatName: string = HANSE_508.meta.name; // 'Hanse 508'
/** M57: puts another boat in place. Called once, before the app's modules are loaded (src/main.ts, M58), and by tests (which put the Hanse 508 back in `finally`). */
export function useBoat(id: string, name: string, data: BoatData): void;
```

(`export let` is a live binding: every `import { boat }` sees the new value, also through `import { boat as hanse508 }` and default parameters `data: BoatData = hanse508`, which are read at call time. The caches keyed by `BoatData` (`WeakMap`s in `contact.ts`, `jib.ts`, `realistic.ts` …) work unchanged. Five modules copy boat values into module constants at load: `src/model/alerts.ts` (lines ~105–106), `src/ui/gybeReport.ts`, `src/ui/windIndicator.ts`, `src/ui/enginePanel.ts`, `src/ui/wavesPanel.ts`; they are right only because `useBoat` runs before the app's modules load (M58's `main.ts` imports the app dynamically). Leave them; new code reads at call time.)

**`src/model/boatProfile.ts`:**

```ts
export const BOAT_PROFILE_VERSION = 1;
export interface BoatProfile { app: 'sail-learn-and-train'; kind: 'boatProfile'; version: number; id: string; name: string; boat: BoatData }
export type ProblemKind = 'header' | 'missing' | 'type' | 'ids' | 'length' | 'range' | 'thrusters';
export interface ProfileProblem { path: string; kind: ProblemKind; detail: string }
export type ProfileCheck = { ok: true; profile: BoatProfile } | { ok: false; problems: ProfileProblem[] };
export const BOAT_ID_PATTERN = /^[a-z0-9-]{1,40}$/;
/** Deep-clones `data` and writes `id` and `name` into its `meta.id` / `meta.name` too. */
export function makeBoatProfile(id: string, name: string, data: BoatData): BoatProfile;
export function checkBoatProfile(raw: unknown, reference: BoatData = HANSE_508): ProfileCheck;
```

`checkBoatProfile` collects problems (at most 20, then stops) with `path` written as `boat.dimensions.loa`, `boat.ropes.list[3].id`:

1. **Header** (`header`): an object; `app === 'sail-learn-and-train'`; `kind === 'boatProfile'`; `version` a number ≤ `BOAT_PROFILE_VERSION`; `id` matches `BOAT_ID_PATTERN`; `name` a string of 1–60 characters; `boat` an object. Stop after header problems.
2. **Shape**, walking the reference and the profile together:
   - reference object → the profile's value is a plain object (not an array, not `null`) and has every key of the reference (`missing` for each absent key); extra keys are allowed and kept;
   - reference number → a finite number (`type`); string → string; boolean → boolean; `null` → `null` or a string (the ropes' `controlId`);
   - **strings that name things must equal the reference** (`ids`): the values of keys `id`, `key`, `ropeId`, `rope`, `bank`, `tail`, `side`, `end`, `partId`, `controlId`, and the members of the string arrays `clutches`, `controls`, `largeClutchRopes`, `settings`, `tails` (the code looks them up; a typo would stop the app). Free text (`source`, `note`, `$comment`, labels…) may change, and so may `boat.meta.id` and `boat.meta.name` (`makeBoatProfile` writes the profile's own id and name there; the check does not compare them with the header);
   - reference array whose first element is an **object with `id`** → the same ids in the same order (`ids`), each element checked against the reference element with that id; **except `boat.hull.thrusters`**: 0, 1 or 2 elements, each with `end` `'bow'` or `'stern'`, no end twice (`thrusters`), each checked against the reference element with the same `end` (so its `id` must be that element's, `part_bow_thruster` or `part_stern_thruster`);
   - reference array whose first element is an **array** (a table, such as `physics.sails.liftByAoaDeg`) → at least 2 rows (`length`), each row the length of the reference's first row (`length`), all finite numbers (`type`);
   - reference array of **numbers** → the same length (`length`), all finite numbers;
   - reference array of **strings** → all strings; any length, except the naming arrays above (equal);
   - reference array of **other objects** (no `id`, such as `rig.spreaders.sets`, the clutches of a bank, `rig.lineLead.lines`, `cockpitHardware.ropeBins.boxes`, `waves.trains`) → the same length (`length`), checked element by element in the same order (the guide says: do not reorder);
   - an empty reference array → any array.
3. **Ranges** (`range`; the boat must still be a cruising yacht the model can sail):

| Path | Range |
|---|---|
| `dimensions.loa` | 6 to 25 m |
| `dimensions.beam` | 2 to 7 m |
| `dimensions.draft` | 0.8 to 4.5 m |
| `dimensions.displacementTonnes` | 1 to 60 t |
| `dimensions.massesKg.lightCraftStandardKeel` | 500 to 60,000 kg |
| `dimensions.engineHp` | 5 to 400 hp |
| `rig.mast.topY` | 6 to 40 m |
| `hull.stemX` − `hull.transomX` (reported at `boat.hull.stemX`) | 5 to 25 m |
| `physics.thrusters.bowThrustN`, `sternThrustN` | 0 to 10,000 N |
| `realisticMode.winchHandle.lengthM` | 0.15 to 0.4 m |
| `physics.integration.maxStepS` | 0.005 to 0.1 s (0 would never end a step) |
| `physics.integration.solverAwaStepDeg` | 0.01 to 5° |
| `physics.integration.solverAwsStepKn` | 0.01 to 5 kn |
| `physics.mass.payloadKg` | 0 to 20,000 kg |
| `physics.mass.addedMassFraction` | 0 to 2 |

A value that already has a `type` problem is not range-checked.

`detail` is a short English text for the guide and the PR (`"expected a number"`, `"6 to 25"`, `"rope_vang missing"`); the Settings field shows `path` and `detail` as they are (they are file paths, not UI text).

**Optional thrusters** (`src/model/thrusters.ts`): `hasThruster(end: 'bow' | 'stern', data: BoatData = hanse508): boolean` (the file imports the boat as `hanse508`, since `boat` is a `BoatState` parameter name there). `thrusterX` and `thrusterTunnelPlace` keep throwing for a missing thruster but are only called after `hasThruster`; `thrusterForces` adds nothing for a missing one. The store's `thruster` action ignores an end the boat does not have (the state stays 0). UI: every caller of `createThrusterPair`, `createThrusterJoystick` and `createThrusterPanel` (grep them) builds a joystick only for a thruster the boat has, and hides the empty wrappers when it has none (`thrusters-block` with its status line in the Engine section, `quick-thrusters` with its "Thrusters" tag in the quick row, `thruster-helm` at the Helm). 3D (`render3d/boat/thrusters.ts`): the tunnel and the jets are built per end behind `hasThruster`, `objects` holds only those, and `setState` skips a missing end. The strings `thrusters.hint` / `thrusters.off` (they name both ends and the J / L keys) stay as they are on a bow-only boat, and the Learn entry of a missing thruster stays (its "Where is it?" finds no mesh): known limitations for the PR.

### 15.4 UI (Settings)

A field "Boat" (`t('boat.label')`), right after Language: the boat's name (`boatName`, `data-testid="boat-name"`), a button `boat-download` `t('boat.download')` "Download this boat's profile" → `downloadJson(\`${boatId}.boat.json\`, makeBoatProfile(boatId, boatName, boat))`, the hint `t('boat.hint')`, and a link `boat-guide` `t('boat.guide')` "How to make a boat profile" to `https://github.com/Botrops1/sail-learn-and-train/blob/main/docs/BOAT_PROFILE.md` (`target="_blank" rel="noopener"`).

### 15.5 Strings

| Key | English | Russian (draft) |
|---|---|---|
| `boat.label` | Boat | Яхта |
| `boat.download` | Download this boat's profile | Скачать профиль этой яхты |
| `boat.hint` | A boat profile is a file with every number of a boat. Start from this one to describe a similar yacht. | Профиль яхты — файл со всеми её числами. Начните с этого, чтобы описать похожую яхту. |
| `boat.guide` | How to make a boat profile | Как сделать профиль яхты |

New, in this order, after `view.language.hint`.

### 15.6 The guide (`docs/BOAT_PROFILE.md`, plain English for a non-developer)

Sections, in this order: **What a boat profile is** (one file, the Hanse 508's numbers as a start); **Which boats it can describe** (the list of 15.3's layout: in-mast furling main with a two-line furling drive at the mast, self-tacking jib on a furler, German mainsheet, a rigid vang, electric primary winches one per side, two clutch banks, twin wheels, one bow anchor with an electric windlass, bow and stern thrusters optional; sizes, weights, sail areas, engine, winch power, rope lengths and positions are free); **Not supported yet** (a genoa on tracks, slab reefing, a mainsheet traveller, a single wheel, two anchors, a gennaker in use; other rope lists); **How to make one** (Settings → Boat → Download; open the file in a text editor; change `id` (small letters, digits, `-`) and `name`; change numbers, keep every key and every rope id; the boat frame: x forward from the mast, y up from the waterline, z to starboard, metres; to remove a thruster delete its entry from `hull.thrusters`); **The checks** (15.3's ranges as a table and what each problem means); **Good to know** (the app was checked with the Hanse 508 only; speeds and loads come from your numbers; the Learn texts describe the Hanse 508). Link it from `docs/BOAT_REFERENCE.md` and `docs/CODE_MAP.md`.

### 15.7 Tests (`tests/boatProfile.test.ts`, `tests/thrusters.test.ts`)

1. `checkBoatProfile(makeBoatProfile('hanse508', 'Hanse 508', HANSE_508))` is ok.
2. A deep clone with `dimensions.beam` deleted → `{ path: 'boat.dimensions.beam', kind: 'missing' }`.
3. `dimensions.loa: '15'` → `type`; `40` → `range`.
4. `ropes.list` without its second entry → `ids`.
5. `hull.thrusters` with the bow one only → ok; with none → ok; with three → `thrusters`; with two `bow` → `thrusters`.
6. `physics.sails.liftByAoaDeg` with 3 rows → ok; with 1 row → `length`; a row of the wrong length → `length`.
7. `kind: 'setup'` → one `header` problem and nothing else; `id: 'My Boat'` → `header`.
8. `boat: {}` → exactly 20 problems.
Tests 1–8 are in `tests/boatProfile.test.ts`; 9, 10 and the `hasThruster` tests in `tests/thrusters.test.ts`. Every test that calls `useBoat` puts the Hanse 508 back in `finally`.

9. **Another boat sails** (prototype, 3.5): a clone with `dimensions.massesKg.lightCraftStandardKeel` and `dimensions.displacementTonnes` × 0.6 and `hull.thrusters` = the bow one only; `useBoat('light-test', 'Light test', clone)`; `run(initialState(), 120, 30)` (from `tests/motionHelpers.ts`) → speed 6.6 to 7.2 kn (prototype 6.903), heel −11.0° to −8.6° (prototype −9.79), no NaN in `boat`; `finally` `useBoat('hanse508', 'Hanse 508', HANSE_508)`. The same run with the Hanse 508 still gives 6.810 kn ± 0.01 (nothing else changed).
10. **No stern thruster:** with that clone in use, `harbourStart` (motionHelpers) and the action `{ type: 'thruster', which: 'stern', dir: 1 }` → `state.thrusters.stern` stays 0; then `{ type: 'thruster', which: 'bow', dir: 1 }` and stepping 5 s does not throw and `swayMps` ≠ 0.
11. **`hasThruster`:** true for both ends on the Hanse 508; on the clone true for the bow, false for the stern. `thrusterForces({ bow: 1, stern: 1 }, boatState, clone)` equals `thrusterForces({ bow: 1, stern: 0 }, boatState, clone)`; `harbourForces` with `thrusters: { bow: 1, stern: 1 }` and the clone does not throw. (Use the real signatures in `thrusters.ts` and `harbourForces.ts`.)
12. `makeBoatProfile('light', 'Light', HANSE_508).boat.meta.id` is `'light'`, and `HANSE_508.meta.id` is still `'hanse508'` (a clone).

(Use the `thruster` action's real shape from `store.ts`.)

### 15.8 Browser checks (`scripts/shots-m57.mjs`)

1. Open the settings: `boat-name` reads "Hanse 508"; `boat-download` gives a download named `hanse508.boat.json` whose JSON has `kind: 'boatProfile'`, `id: 'hanse508'` and `boat.dimensions.loa` 15.55.
2. `boat-guide`'s `href` ends with `docs/BOAT_PROFILE.md` and opens in a new tab (`target="_blank"`).
3. `auditPage` with the field shown: no problems.

### 15.9 Done when

The Hanse 508's own profile passes the checks, a lighter boat without a stern thruster sails in the tests, the Settings field downloads the profile and links the guide; typecheck, lint, tests, build and `SHOTS_ONLY=m41,m57` pass.

### 15.10 Not in M57

Importing and choosing a boat (M58), the boat in the link (M58), other rigs.

### 15.11 Decided in the M57 PR

(empty)

---

## 16. M58: Choose and import a boat

**Independent review: required** (the app's startup, the link and stored profiles change).

Issue #112 (part 2). Owner's answers 11–13: the chooser lists the Hanse 508 and the imported boats; imported boats stay on the device; a link carries the boat's id and opens the Hanse 508 with a note where that boat is missing; Learn's texts get a note.

### 16.1 Files

New: `src/app/boatStore.ts`, `tests/boatStore.test.ts`, `scripts/shots-m58.mjs`. Changed: `src/main.ts`, `src/app/app.ts` (`startApp` options), `src/app/urlState.ts` (`boat=`), `src/app/urlSync.ts` (Back across boats), `src/app/setupFile.ts` (the profile in a setup file), `src/ui/settingsMenu.ts` (the Boat field), `src/ui/learnTab.ts` (the note), `src/style.css`, both `ui.json`, `docs/review/ru.md`, `tests/urlState.test.ts`, `tests/setupFile.test.ts`, `scripts/shots.mjs`, `docs/CODE_MAP.md`, `docs/BOAT_PROFILE.md` (how to import).

### 16.2 Storage (`src/app/boatStore.ts`)

```ts
export const BOATS_KEY = 'sail-learn.boats';   // JSON array of BoatProfile
export const BOAT_KEY = 'sail-learn.boat';     // the id chosen last
export const MAX_BOATS = 10;
/** The imported profiles, each checked again (checkBoatProfile); bad ones are dropped. */
export function storedBoats(): BoatProfile[];
/** Adds or replaces (same id) a checked profile. */
export function saveBoat(profile: BoatProfile): 'ok' | 'builtIn' | 'full' | 'storage';
export function removeBoat(id: string): void;
/** The id chosen last, if it matches BOAT_ID_PATTERN; else 'hanse508'. */
export function chosenBoat(): string;
export function setChosenBoat(id: string): void;
/** Pure: the boat a link names: a valid `boat=` (BOAT_ID_PATTERN), else 'hanse508'. */
export function linkBoatId(search: string): string;
/** The boat to start with: linkBoatId(search) when the address has a query; with no query, chosenBoat() if it is among storedBoats(), else 'hanse508'. */
export function startBoatId(search: string): string;
```

Only the boat select (16.5) and a loaded setup file (16.6) call `setChosenBoat`; opening a link does not.

`boatStore.ts` imports only `../model/boat` and `../model/boatProfile`, and `boatProfile.ts` imports only `./boat` (and types): the static import graph of `main.ts` must not reach any module that reads `boat` at load time (`alerts.ts`, `gybeReport.ts` …). `'builtIn'` for the id `hanse508`; `'full'` when 10 other boats are stored; `'storage'` when `localStorage` refuses (a full or private store). All through `globalThis.localStorage` in `try/catch`, so the tests can put a stand-in on `globalThis`.

### 16.3 Startup (`src/main.ts`, `src/app/app.ts`)

```ts
import './style.css';
import { useBoat } from './model/boat';
import { startBoatId, storedBoats } from './app/boatStore';
const host = document.getElementById('app');
const id = startBoatId(window.location.search);
const profile = id === 'hanse508' ? undefined : storedBoats().find((p) => p.id === id);
if (profile) useBoat(profile.id, profile.name, profile.boat);
void import('./app/app')
  .then(({ startApp }) => {
    if (host) startApp(host, { missingBoat: id !== 'hanse508' && !profile ? id : null });
  })
  .catch((error: unknown) => {
    console.error(error);
    if (host) host.textContent = 'The app could not load. Please reload the page.';
  });
```

(`id !== 'hanse508' && !profile` can happen only when the link names a boat with `boat=`: with no query, `startBoatId` already fell back to the Hanse 508.)

`main.ts` imports nothing else: every other module is loaded by the dynamic import, after `useBoat`, so the module constants that read the boat (`gybeReport.ts`, `enginePanel.ts`, …) read the chosen one. `boatStore.ts` imports only `boat.ts` and `boatProfile.ts`.

`startApp(host, options: { missingBoat?: string | null } = {})`: with a `missingBoat`, a note is appended to the 3D view's element after its top area: `div.boat-note[role=status]`, `data-testid="boat-missing"`, `position: absolute`, left and right 8 px, its top at the top area's bottom plus 8 px (the `--view-top-h` value the time bar keeps up to date, `trackTopHeight`), above the 3D view and below the cards (z-index as the info card); white card look; text `t('boat.missing', { id })` and a × button `boat-missing-close` (44 px, `aria-label` `t('settings.close')`) that only removes the note. The link is then written without `boat=` (the Hanse 508 is shown).

### 16.4 Link (`src/app/urlState.ts`, `urlSync.ts`)

- `serializeUrlState` writes `boat=<boatId>` right after `v=1` when `boatId !== 'hanse508'`. `parseUrlState` ignores `boat` (main.ts reads it).
- Back (`popstate`): when `linkBoatId(location.search) !== boatId`, reload the page, before the `load` dispatch, as the language branch does. (No loop: the first write of `startUrlSync` drops a `boat=` that could not be loaded.)
- `openScene` (Learn's "Show it working") keeps the boat: the scene's link has no `boat=`, the page is not reloaded, and the address bar then gets `boat=` again from `serializeUrlState`.

### 16.5 UI (Settings → Boat, extends M57's field)

- A `<select data-testid="boat-select">` (`aria-label` `t('boat.label')`): "Hanse 508" first (`t('boat.builtIn', { name: 'Hanse 508' })` "Hanse 508 (built in)"), then the stored boats by name. Choosing one: `setChosenBoat(id)`, `openAfterReload('settings')` (as the language choice does), then `window.location.assign(window.location.pathname + '?v=1' + (id === 'hanse508' ? '' : '&boat=' + id) + (language !== 'en' ? '&lang=' + language : ''))` with `language = store.getState().settings.language`: the app starts fresh on that boat, on purpose: nothing of the old boat's state or the other link settings carries over, only the language.
- `boat-import` `t('boat.import')` "Import a boat profile" with a hidden `<input type="file" data-testid="boat-file" accept=".json,application/json">` that has one permanent `change` listener (as M56's setup input; the button only calls `input.click()`). Every message below goes into `<p data-testid="boat-status" aria-live="polite">`: `pickJsonFile` → `'tooBig'` → `t('boat.problem.tooBig')`; not JSON → `t('boat.problem.notJson')`; `checkBoatProfile` problems → `t('boat.problem.check', { count })` and a list (`ul[data-testid="boat-problems"]`) of the first 5 as `path: detail`; `saveBoat` → `builtIn` / `full` / `storage` → `t('boat.problem.<result>')`; ok → `t('boat.imported', { name })`, and the select gains it (not chosen yet); **if the imported id is the boat in use** (`boatId`, a re-import after editing), the page reloads on it at once (`openAfterReload('settings')`, `window.location.reload()`), so the new numbers are used.
- While an imported boat is in use, `boat-remove` `t('boat.remove')` "Remove this boat" with the two-tap confirm of Reset (`t('boat.removeConfirm')`): removes it, chooses the Hanse 508 and reloads as above.
- M57's download, hint and guide link stay.

### 16.6 Learn note and the setup file

- `learnTab.ts`: while `boatId !== 'hanse508'`, an entry's "On this boat" block (only entries that have one; add none to the others) ends with `<p class="hint" data-testid="learn-boat-note">` `t('learn.writtenFor', { name: 'Hanse 508' })` (owner's answer 13).
- `setupFile.ts` (M56, stays pure): `SetupFile` gets an optional `boatProfile?: BoatProfile`. `makeSetupFile(link, device, savedAtIso, boatProfile?)` takes it as a fourth argument (the profile in use when `boatId !== 'hanse508'`, from `storedBoats()`); `readSetupFile` returns it (`{ ok: true, link, device, boatProfile? }`) after `checkBoatProfile`; the new problem `badBoat` (`t('setup.problem.badBoat')`) when the check fails, when its `id` is `hanse508`, or when it differs from `linkBoatId(link)`.
- The Load handler (`settingsMenu.ts`): with a `boatProfile`, `saveBoat` it first; `builtIn` / `full` / `storage` → show `t('boat.problem.<result>')` in `setup-status` and stop (no reload); ok → `setChosenBoat(id)`, then the device settings and the reload as M56.

### 16.7 Strings

| Key | English | Russian (draft) |
|---|---|---|
| `boat.builtIn` | {name} (built in) | {name} (встроенная) |
| `boat.import` | Import a boat profile | Загрузить профиль яхты |
| `boat.imported` | Imported {name}. Choose it above to sail it. | Загружено: {name}. Выберите её выше, чтобы ходить на ней. |
| `boat.remove` | Remove this boat | Удалить эту яхту |
| `boat.removeConfirm` | Tap again to remove it | Нажмите ещё раз, чтобы удалить |
| `boat.missing` | This link is for the boat "{id}", which is not on this device. Showing the Hanse 508. | Эта ссылка для яхты «{id}», которой нет на этом устройстве. Показана Hanse 508. |
| `boat.problem.tooBig` | This file is too big to be a boat profile. | Файл слишком большой для профиля яхты. |
| `boat.problem.notJson` | This file cannot be read: it is not a boat profile. | Этот файл не читается: это не профиль яхты. |
| `boat.problem.check` | This profile has {count} problems. The first ones: | В этом профиле проблем: {count}. Первые из них: |
| `boat.problem.builtIn` | This is the built-in Hanse 508: give your boat its own id. | Это встроенная Hanse 508: дайте своей яхте свой id. |
| `boat.problem.full` | There are already 10 boats on this device: remove one first. | На этом устройстве уже 10 яхт: сначала удалите одну. |
| `boat.problem.storage` | This browser did not let the app keep the boat (private window or full storage). | Браузер не дал приложению сохранить яхту (приватное окно или память заполнена). |
| `learn.writtenFor` | Written for the {name}. | Написано для {name}. |
| `setup.problem.badBoat` | The boat in this setup file does not pass the profile checks. | Яхта в этом файле настроек не проходит проверку профиля. |

`boat.*` after M57's `boat.guide`; `learn.writtenFor` after `learn.spotlightHint`; `setup.problem.badBoat` after `setup.problem.badLink`.

### 16.8 Tests

`tests/boatStore.test.ts` (a stand-in `localStorage` on `globalThis`, removed after):

1. Nothing stored → `storedBoats()` is `[]`, `chosenBoat()` is `hanse508`.
2. `saveBoat` of a checked clone with id `test-boat` → `ok`; stored once; saving it again replaces it (still one).
3. id `hanse508` → `builtIn`; an eleventh boat → `full`; a `localStorage.setItem` that throws → `storage`.
4. A stored entry that fails the checks (edit it in storage) is dropped by `storedBoats()`.
5. `startBoatId('')` → `chosenBoat()`; `startBoatId('?v=1')` → `hanse508`; `startBoatId('?v=1&boat=test-boat')` → `test-boat`; `startBoatId('?boat=Bad%20Id')` → `hanse508`.

`tests/urlState.test.ts`: with `useBoat('test-boat', 'Test', clone)` (restored with `useBoat('hanse508', 'Hanse 508', HANSE_508)` in `finally`), `serializeUrlState(initialState())` starts `v=1&boat=test-boat`; with the Hanse 508 no `boat=` is written and every existing link test is unchanged.

`tests/boatStore.test.ts` also: `linkBoatId('?v=1&boat=a-b')` is `a-b`, `linkBoatId('?v=1')` and `linkBoatId('?boat=A B')` are `hanse508`; with no query and a chosen id that is not stored, `startBoatId('')` is `hanse508`; the import lines of `src/app/boatStore.ts` and `src/model/boatProfile.ts` (read as text) name only the modules allowed in 16.2.

`tests/setupFile.test.ts`: a file with a valid `boatProfile` whose id matches the link's `boat=` reads ok and keeps it; a broken one, one with id `hanse508`, and one whose id differs from the link → `badBoat`.

### 16.9 Browser checks (`scripts/shots-m58.mjs`)

The checks make a test profile in Node: read `content/boat/hanse508.json`, wrap it as `{ app: 'sail-learn-and-train', kind: 'boatProfile', version: 1, id: 'test-light', name: 'Test light', boat }` with `dimensions.loa` 14 and `hull.thrusters` the bow one only, and give it with `page.waitForEvent('filechooser')` + a tap on `boat-import` + `chooser.setFiles({ name, mimeType: 'application/json', buffer })`. Pages that reload are not on the test clock; after each reload wait for `canvas.scene-canvas` and use `waitForLink`. Checks 1, 2, 3 and 7 run in **one** context (the boat lives in that context's storage); checks 4 and 6 open fresh contexts.

1. **Import:** `boat-status` reads "Imported Test light. Choose it above to sail it."; the select has "Test light".
2. **Choose:** select it → the page reloads; the link has `boat=test-light`; `boat-name` reads "Test light"; Harbour mode (`setMode`) shows only the bow joystick.
3. **Learn note:** on the same page, `page.goto` the link `?v=1&boat=test-light&m=learn&learn=rope_vang` → `learn-boat-note` is shown.
4. **Missing boat:** a fresh context (empty storage) opening `?v=1&boat=test-light` → `boat-missing` visible with "test-light"; the link has no `boat=`.
5. **Bad profile:** a profile with `dimensions.loa: 40` → `boat-problems` lists `boat.dimensions.loa: 6 to 25` (M57's `detail` text for that range); nothing stored.
6. **Setup with the boat:** with Test light in use, save the setup (M56); in a fresh context load it → the page opens on Test light.
7. **Remove:** `boat-remove` twice → the page reloads on the Hanse 508 and the select no longer lists Test light.
8. `auditPage` with the Boat field and a problem list shown: no problems.

### 16.10 Done when

A profile imported on a phone can be chosen, sailed, saved in a setup file, opened by its link on the same device, and removed; old links are unchanged; typecheck, lint, tests, build and `SHOTS_ONLY=m56,m57,m58` pass, then CI.

### 16.11 Not in M58

Built-in second boat, boat-specific Learn texts, editing a profile in the app, other rigs.

### 16.12 Decided in the M58 PR

(empty)

---

## 17. M59: Leftovers, polish and sign-off

**Independent review: not needed** (small fixes from earlier PRs, checks and docs; no model formula).

Owner's answer 14 (a)–(c): the anchor sign hidden under the map's wind label and the windlass buttons' arrow keys (both left from M46), and a "put the fenders out" hint when backing into the berth (left from M44). (d) was done in M54.

### 17.1 Files

`src/ui/mapView.ts`, `src/ui/anchorPanel.ts`, `src/model/harbour.ts`, `src/model/area.ts` (the type of the new marina key), `content/areas/adriatic.json`, `src/model/alerts.ts`, `src/ui/harbourPanel.ts`, `src/ui/alertCentre.ts`, both `ui.json`, `docs/review/ru.md`, `tests/harbour.test.ts`, `tests/alerts.test.ts`, new `scripts/shots-m59.mjs`, `scripts/shots.mjs`, `docs/BOAT_REFERENCE.md` (the Phase 8 fenders-hint row: mark it built), `docs/CODE_MAP.md`, docs (17.6).

### 17.2 The anchor sign on top (`src/ui/mapView.ts`)

`drawAnchor` is split: the line from the bow and the dashed circle stay where they are drawn today; a new `drawAnchorMark(ctx, state, view, mini: boolean)` (it calls `anchorPoint` and `drawAnchorSign` with r = mini ? 6 : 10, the sizes used today) is drawn **last**: in `drawMap` after `drawApparent`, in `drawMiniMap` after the wind arrow and the "N". The tap order is unchanged.

With `debug=1`, `drawMap` records the names of its steps in order for the last frame (`'grid'`, `'windField'`, `'seabed'`, `'harbour'`, `'track'`, `'anchor'`, `'noGo'`, `'labels'`, `'buoys'`, `'boat'`, `'apparent'`, `'anchorMark'`), returned by a new `__sailMap.drawOrder()`.

### 17.3 Arrow keys on the windlass buttons (`src/ui/anchorPanel.ts`, `holdButton`)

On either windlass button (Anchor section, Bow station, helm remote): ArrowDown held = chain out (`motion: 'down'`), ArrowUp held = chain in (`'up'`), whichever button has the focus; keydown acts only when `!event.repeat`; keyup of that arrow lets go (`'off'`); `preventDefault` so the panel does not scroll. Space and Enter keep working on the button's own motion.

### 17.4 Fenders hint when backing in (`src/model/harbour.ts`, alerts, Harbour gear)

```ts
/** M59: in the marina, fenders in the locker, going astern, our stern within 15 m of our berth's two rings: time to put the fenders out. */
export function fendersInHintShown(state: { harbour: HarbourState; boat: BoatState }, data?: BoatData, area?: AreaData): boolean;
```

`true` when `harbour.place === 'marina'`, `!harbour.fendersOut`, `boat.speedMps < -0.1` (surge is negative astern) and the distance from the stern point (`pointToMap(boat, hull.transomX, 0)`; with heading 180 the stern is at `northM + 8.6`) to the midpoint of `marinaGeometry(layout, traffic).ourRings.west` and `.east` (both on the quay face) is at most `area.marina.fendersHintM`. The number is **area data, not boat data** (so boat profiles made before M59 stay valid): `content/areas/adriatic.json`, in `marina`, after its last key: `"fendersHintM": 15`, **tunable**, `"fendersHintNote": "M59: the 'put the fenders out' hint shows when the stern is this close to our berth's rings, backing in with the fenders in the locker (assumption)"`; its type in `src/model/area.ts`. `harbour.ts` then imports `marina.ts`, `lowSpeed.ts`, `boat.ts` and `area.ts` as values (no import cycle: only `alerts`, `contact`, `mooringLines` and `places` import `harbour`). A boat backing out near the rings with the fenders in also gets the hint (accepted).

- Harbour gear shows `<p class="hint" data-testid="fenders-in-hint">` `t('harbour.fenders.inHint')` while it is true.
- A new alert kind `fendersIn` (appended to `ALERT_KINDS`) starts when it becomes true (false → true between two states): severity `info`, Learn id `fit_fender` (`ALERT_INFO`), tag `gear` (`alertTag`), text `t('harbour.fenders.inHint')` (`ALERT_TEXT` in `alertCentre.ts`); written again only `physics.alerts.repeatGapS` (5 s) after the last (add it to `FLICKERING`).

| Key | English | Russian (draft) |
|---|---|---|
| `harbour.fenders.inHint` (after `harbour.fenders.hint`) | Put the fenders out before you back into the berth. | Вывесите кранцы, прежде чем входить в место кормой. |

### 17.5 Tests and checks

- `tests/harbour.test.ts`: `fendersInHintShown` false in open water, false with fenders out, false going ahead, true going astern 10 m from the rings, false 20 m away.
- `tests/alerts.test.ts`: `fendersIn` written once when the hint starts, tag `gear`.
- `scripts/shots-m59.mjs` (phone unless stated):
  1. **Anchor on top:** `?wd=90&ws=15&cam=map&pl=bay&pe=-1640.0&pn=0.0&hdg=180&an=34.0&ax=-1610.0,-6.9&as=1&m=harbour&debug=1` (the M46 "Swinging" link of WORKFLOW with the map) → `__sailMap.drawOrder()` ends with `'anchorMark'`.
  2. **Windlass keys** (test clock): `?pl=bay&m=harbour&pe=-1640.0&pn=0.0&hdg=270&wd=-90&ws=10&tx=4` (M46's "let go" start); `showSection(page, 'anchor')`, focus `windlass-down`, `page.keyboard.down('ArrowDown')`, wait 2 s (app time), `keyboard.up` → the link's `an=` is at least 3.0; `keyboard.down('ArrowUp')` 1 s, `up` → `an=` is at least 1.0 smaller.
  3. **Fenders hint** (test clock): `?pl=marina&m=harbour&pe=2.8&pn=1473.4&hdg=180&ws=0&bs=-0.5&tx=4` (the stern 18 m from the rings, backing in): poll with `page.waitForTimeout(500)` up to 30 s for `fenders-in-hint` visible (it crosses 15 m after about 12 s); tap `alert-chip` → an `alert-item` with an `alert-tag` reading "Gear".
  4. **The Phase 8 accessibility sweep** (`auditPage`, no new `SMALL_OK` entries): phone: each tab after `showTab` (`m59 tab <name>`), the Status section with `status-filter-damage` pressed, the Settings tab scrolled to Boat and Your setup; desktop 1,440 × 900: the mode card and the settings card open (`m59 card mode`, `m59 card settings`), a grip menu open (`section-grip-sails` clicked).
  5. **Frame times (report only)**, not on the test clock, desktop size: `?m=learn&learn=fit_winch&debug=1` after `learn-show-on-boat`, and `?pl=marina&ml=tight&tr=busy&m=harbour&detail=high&cam=side-port&debug=1`, each after 5 s: read the debug overlay's row "Slowest" (`t('debug.worstFrame')`) with `/(\d+) ms/` and print it. Headless drawing is slow (about 15 fps), so there is no threshold here; the owner's phone check (60 fps) is the criterion.

### 17.6 Docs and sign-off

- `docs/ROADMAP.md`: in the same PR, a decisions-log row with the owner's answers and Phase 8 marked **Done** once the owner signs off on the M59 PR (as Phase 7); 17.9 gets the "Decided in the M59 PR" notes before merge.
- `docs/WORKFLOW.md`: the owner ticks the M59 checklist on the phone.
- The PR's "Questions for the owner" ask for the sign-off ("Recommended: sign Phase 8 off, because every Definition of Done item is ticked") and the frame rate on the phone; the headless frame times go under "Known limitations".
- `docs/CODE_MAP.md`: complete for Phase 8.
- The decisions of every Phase 8 PR are in section 19 and the ROADMAP decisions log.

### 17.7 Done when

The three leftovers work, the sweep and the frame check pass, the docs are complete; typecheck, lint, tests, build and `SHOTS_ONLY=m46,m47,m59` pass, then CI; the owner signs Phase 8 off.

### 17.8 Not in M59

Anything new: ideas found while testing become issues for Phase 9 or later.

### 17.9 Decided in the M59 PR

(empty)

---

## 18. Definition of Done (Phase 8)

- M48–M59 merged, each with its checks green in CI and its owner's answers recorded (ROADMAP decisions log and the "Decided in the M<N> PR" notes).
- On a phone: five tabs; Ropes in Easy and Learn is a list; "Where is it?" flies to a part; the winch handle is drawn and can be taken in 3D; Realistic has a Helm section; the Status section and its history work; a setup file and a boat profile can be saved and loaded.
- On a computer: Mode and Settings chips with cards; sections move and stay; Reset layout.
- Old links open the same picture; the Hanse 508 sails exactly as before (no PHYSICS_TRUTHS test changed).
- `docs/BOAT_PROFILE.md` exists; `docs/CODE_MAP.md` is complete.
- The owner signs Phase 8 off on the M59 PR (frame rate on the phone reported).

## 19. Decisions and open questions

### Owner's answers in the planning chat (2026-10-23)

1. A new Phase 8 for this work; exercises move to Phase 9, languages to Phase 10. **Yes.**
2. Learn and Easy show the same Ropes section: the rope chips (the list and the selected rope's slider) only; the clutch drawing goes (6). Harbour and Realistic keep theirs (issue #113).
3. Both Learn buttons stay, renamed "Show it working" and "Where is it?"; both zoom and fade the rest until the next tap; **"Where is it?" zooms in closer**, because the learner focuses on one part (7).
4. The handle is drawn in Realistic ropes only; taking a handle at another station walks there (8).
5. Phone tabs as recommended (Controls = every section except Conditions, Learn, Mode, Settings, in the mode's order; the mode chip and gear leave the chip row), **but a mockup is reviewed and agreed before building** (`docs/mockups/phase8-panel.html`; 9).
6. **In Realistic mode the autopilot and the engine are worked from the Helm**: one Helm section (11).
7. One saved layout for all modes; move between columns and within a column; computer only (12).
8. Status as recommended, **with tag chips on the entries such as "Damage", "Sail", "Rope", "Danger" (e.g. the boom's sweep)** (13).
9. The setup file as recommended (14).
10. Profiles for boats laid out like the Hanse 508 (15); **other yacht setups are a "nice to have" for later, after the main functions are polished** (ROADMAP "Later").
11. Only the Hanse 508 built in; **a second built-in boat is a "nice to have" for later** (a smaller Hanse such as the one the owner remembers as "Hanse 303", or another; ROADMAP "Later").
12. Imported boats on the device; the link carries the id; a missing boat opens the Hanse 508 with a note (16).
13. Learn texts on another boat keep the Hanse 508's text with a note; **to be looked at further later** (16.6; ROADMAP "Later").
14. All four extras: (a), (b), (c) in M59, (d) in M54.

### Owner's answers on the planning PR #115 ("Accept all", 2026-10-23)

- **The mockup** (`docs/mockups/phase8-panel.html`) is agreed: M51 builds it (9).
- **The first phone tab** shows the mode's name ("Easy"), not the word "Mode" (9.3).
- **The lowest sheet height** grows from 100 to 128 px to fit the tabs and keep the quick row (9.2).

### Refresh

(none: planned against the code after M47 and the fix of PR #114)
