# Rigging detail: the gennaker, other downwind sails and the main traveller (M105–M110)

Planned with `/plan issue 232` on 2026-11-18. A sailor asked for real rigging detail: where each sheet runs, how a spinnaker and its guy are rigged, how a main traveller is rigged, and the kinds of spinnaker. The owner's answers are in section 13.

## 0. How to use this spec

- Six milestones, built in order, **one PR each**, titled `M<N>: <name>` (names in section 6), each saying `Closes #<n>` for the issues its section names. Each milestone has its own GitHub issue (#246–#251, section 6), a short card for the owner that links back here; this spec is the source the builder follows.
- Read sections 0–5, then **only your milestone's section** (7 for M105, 8 M106, 9 M107, 10 M108, 11 M109, 12 M110). The general rules are in CLAUDE.md. Names (files, functions, store actions, `data-testid`s, string keys, registry ids, URL keys) are required. Numbers are final unless marked **tunable**.
- **Text is data.** The English strings here are final. German, Norwegian and Russian strings are AI drafts the builder writes (CLAUDE.md, "Russian text"; the same holds for every language but English): every new key exists in `content/lang/{de,no,ru}/*.json`, glossary entries with `textStatus: "draft"`, and the builder runs `npm run review-doc -- de`, `-- no` and `-- ru` after changing them.
- **If a test band fails:** check section 4 first, then the formulas against the milestone's own "common mistakes", then tune only keys marked **tunable** and report the before and after values in the PR. Never widen a band. The bands of M106 come from a prototype run against the real `steadyState` (section 8.3); a formula typed as written reproduces them.
- Keep the signatures written here. Decisions taken while building go in a new last subsection of your section, "Decided in the M<N> PR", marked "recommended; merging accepts it", with a ROADMAP decisions-log row pointing to it (CLAUDE.md). Every milestone also updates `docs/CODE_MAP.md` for its files, `docs/BOAT_REFERENCE.md` for its new assumptions, `.github/ci-times.json` when its group's measured time changes by more than half, and the status of its PT rules in `docs/PHYSICS_TRUTHS.md` (the rows exist).
- **Build order:** each milestone starts after the one before it is merged; the names it uses from earlier milestones are as merged (if one differs from this spec, use the merged one and say so in the PR).
- Every earlier phase keeps working: an old link (no `gn`, `pic` or new control key) opens exactly the picture it opened before, and every earlier unit test and browser check stays green, except the ones a milestone's "Older checks" subsection names.

## 1. Goal and scope

**Goal.** Teach how a downwind sail is rigged and handled, on this boat's own optional gennaker (an asymmetric spinnaker): where each line runs, the order you rig it in, then hoisting, trimming, gybing and taking it down. Beside it, show the other kinds of downwind sail (the symmetric spinnaker with its pole and guy, the code 0) and a mainsheet traveller as labelled 3D pictures with Learn entries.

**In scope:** issue #232. The gennaker can be rigged step by step and sailed in Easy ropes (M105, M106) and in Realistic ropes on the aft winches (M107); three exercises (M108); pictures of a symmetric spinnaker and a code 0 (M109) and of a traveller (M110).

**Out of scope (owner, section 13):** sailing with a symmetric spinnaker or a code 0; a traveller you can sail with (the boat keeps its German mainsheet); a top-down furler for the gennaker (it uses a sock); the tack line's length as a control (fixed); reefing; other boats' rigs; a man-overboard with the gennaker up; the gennaker wrapping round the forestay.

## 2. Conventions

- **Boat frame** (as everywhere, `docs/BOAT_REFERENCE.md`): metres, origin at the mast on the waterline on the centreline, **x forward, y up, z to starboard**. Points in the boat file are `[x, y, z]`.
- **Side**: `1` = starboard, `-1` = port. "The gennaker's side" is the side its clew (back lower corner) and working sheet are on.
- **Angles**: `awaDeg` is the apparent wind angle, −180…180, **+ = wind over starboard** (`rig.wind.awaDeg`). The leeward side is `−sign(awaDeg)` (`awaDeg = 0` → starboard, +1). Degrees in data and state; radians only inside `Math` calls (`DEG` from `src/model/angles.ts`).
- **Rope controls** run 0…100 as the existing ones do: **0 = hauled (sheet in) or down / furled, 100 = eased (sheet out) or up / unrolled.**
- **Words** (English, PHASE_FEEDBACK_SPEC 2): ropes are "lines" in text a person reads; ids keep `rope_`.

## 3. Shared helpers

| Name | File | Signature | Behaviour |
|---|---|---|---|
| `leewardSide` | `src/model/gennaker.ts` (M105) | `(awaDeg: number): 1 \| -1` | `awaDeg > 0` → −1, otherwise +1. |
| `gennakerClew` | `src/model/gennaker.ts` (M105) | `(thetaDeg: number, data?: BoatData): Vec3` | The set sail's clew for the signed foot angle θ (8.2). |
| `sheetLead` | `src/model/gennaker.ts` (M105) | `(side: 1 \| -1, data?: BoatData): Vec3[]` | The route of one sheet from the first deck-edge point to the winch's foot, outside the lifelines (7.3). |
| `smoothstep` | `src/model/angles.ts` if it exists there (grep `smoothstep` in `src/model`), otherwise a new export of `src/model/gennaker.ts` | `(edge0: number, edge1: number, x: number): number` | 0 below `edge0`, 1 above `edge1`, `u²(3 − 2u)` between. Reuse the existing one when there is one. |
| `PICTURE_ONLY` | `src/model/glossary.ts` (M109) | `ReadonlySet<string>` | Ids drawn only inside a picture (11.6): Learn hides "Where is it?" for them. |

## 4. Common mistakes

- **Side sign flipped.** Wind over starboard (`awaDeg > 0`) puts the gennaker on **port** (`side = −1`); its clew then has `z < 0`. Tests 7.7.2 and 8.6.3 check both tacks.
- **The `NOT_DRAWN` rule** (`tests/glossary.test.ts` section 11): an id in `NOT_DRAWN` must not appear quoted anywhere in `src/` or `content/boat/`, and every drawn id must. `sail_gennaker` stays in `NOT_DRAWN` until M106 draws the sail, and is not written in code or the boat file before then.
- **A gennaker number in code.** Every position, angle and coefficient is in `content/boat/hanse508.json` under `sails.gennaker` (or `pictures` for M109–M110), mirrored in `docs/BOAT_REFERENCE.md` as an assumption.
- **State not reset.** `stage` 0 means nothing of the gennaker is drawn or acts, whatever the two gennaker controls say; a link without `gn` must leave the gennaker stowed.
- **Degrees vs radians** in `gennakerClew` and the pictures' angles.
- **The sock and the sail.** Area scales with the sock (`area = officialAreaM2 · sockUp`), not the fill: a half-hoisted sock is a smaller sail, not a flogging one (8.3).

## 5. Architecture

**New state** (`src/app/store.ts`, `AppState`):

```ts
gennaker: GennakerSetup; // M105 (crossS from M106)
picture: PictureId | null; // M109 ('traveller' added by M110)
travellerCarPct: number; // M110, −100…100
```

```ts
// src/model/gennaker.ts
export type GennakerStage = 0 | 1 | 2 | 3 | 4; // stowed, tack line on, sheets led, halyard on, hoisted in its sock
export interface GennakerSetup {
  stage: GennakerStage;
  /** The clew's side and so the working sheet's: 1 starboard, −1 port. */
  side: 1 | -1;
  /** M106: seconds left of a gybe of the gennaker (the clew crossing in front of the boat); 0 = none. */
  crossS: number;
  /** M106: |θ| (degrees) of the clew when the crossing started; 0 when none. */
  crossFromDeg: number;
}
export const STOWED: GennakerSetup = { stage: 0, side: 1, crossS: 0, crossFromDeg: 0 };
```

**New controls** (M106; `src/model/controls.ts` `CONTROL_IDS`, `content/boat/hanse508.json` `controls.list`): `ctl_gennaker_sheet` (0 hauled … 100 eased, default 50) and `ctl_gennaker_sock` (0 down … 100 up, default 0).

**New store actions:** `{ type: 'gennaker'; command: GennakerCommand }` (M105; `'gybe'` from M106) `{ type: 'setPicture'; picture: PictureId | null }` (M109) and `{ type: 'setTravellerCar'; pct: number }` (M110).

**Step order** (`reduce`'s `step` case, store.ts): M106 adds one line before the rig step: `gennaker = stepGennaker(state.gennaker, dt)` (counts `crossS` down), and passes `{ …, gennaker }` in the rig step's `StepOptions`. Nothing else moves.

**New URL keys** (`src/app/urlState.ts`): `gn` stage 0–4 (M105), `gx` side `p` / `s` (M105), `gs` gennaker sheet and `gu` gennaker sock (M106, in `URL_CONTROLS`), `pic` picture (M109), `tv` traveller car (M110). Old links have none of them and open as before (defaults: stowed, no picture).

**Files added**, by milestone: M105 `src/model/gennaker.ts`, `src/render3d/boat/gennaker.ts`, `tests/gennaker.test.ts`, `scripts/shots-m105.mjs`; M106 `tests/physicsTruthsRigging.test.ts`, `scripts/shots-m106.mjs`; M107 `scripts/shots-m107.mjs`; M108 `scripts/shots-m108.mjs`; M109 `src/model/pictures.ts`, `src/render3d/pictures.ts`, `src/ui/pictureBanner.ts`, `tests/pictures.test.ts`, `scripts/shots-m109.mjs`; M110 `scripts/shots-m110.mjs`. Each adds its files to `docs/CODE_MAP.md`.

**Browser checks.** The set is at its cap (77 groups, `tests/ciPlan.test.ts`): every milestone joins an existing group with `members(...)` and a `GROUP_ALIASES` entry, as M104 did with `m18` (PHASE_HORIZON_SPEC 1.10). The groups chosen are the ones with the lowest recorded times.

## 6. Milestones overview

| Milestone | What the owner sees | Issues (milestone issue first) | Rules tested | Depends on | Independent review |
|---|---|---|---|---|---|
| **M105: Gennaker rigged** | Settings → Gennaker: Stowed / Rigged. In the Sails section, four rigging steps in order: tack line, sheets (outside everything, to blocks at the stern and the aft winches), halyard, hoist in its sock. Learn entries for each part | #246; #232 | PT-69 (the sheets' route) | — | **required** (new shared state, URL keys and store action) |
| **M106: Sailing with the gennaker** | Pull the sock up and the sail fills; trim it with − / +; faster on a broad reach, overpowered when too close to the wind, hidden behind the main dead downwind; Gybe button; take it down | #247; #232 | PT-67, PT-68, PT-69, PT-70 | M105 | **required** (sail forces, new controls) |
| **M107: Gennaker sheets on the winches** | In Realistic ropes the working sheet goes on its aft winch: wrap, crank, ease; it has no clutch, so off the winch it runs out | #248; #232 | none (Realistic rules PT-16, PT-18 keep passing) | M106 | **required** (Realistic model) |
| **M108: Gennaker exercises** | Three exercises in the Sails group: rig and hoist, gybe, take it down, each with Watch | #249; #232 | PT-69, PT-70 (through the exercises) | M106 | **required** (teaches a handling order) |
| **M109: Spinnaker and code 0 pictures** | Learn's Show it working shows a labelled 3D picture on the boat: a symmetric spinnaker with pole, guy, sheet, pole lift and downhaul; a code 0 on its furler; a "Downwind sails" entry comparing the three | #250; #232 | PT-71, PT-73 | M106 | **required** (new state and URL key; what it teaches) |
| **M110: Main traveller picture** | A picture of a traveller in place of the German mainsheet; a slider moves the car and the boom follows; the entry compares the two systems | #251; #232 | PT-72 | M109 | **required** (store state, URL key, the drawn boom overridden) |

## 7. M105: Gennaker rigged

**Independent review: required** (new shared state, store action and URL keys; the rigging order it teaches).

### 7.1 Files

`content/boat/hanse508.json`, `content/registry/parts.json`, `content/lang/{en,de,no,ru}/glossary.json`, `content/lang/{en,de,no,ru}/ui.json`, `src/model/gennaker.ts` (new), `src/model/ropePaths.ts`, `src/model/panelEntries.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/render3d/boat/gennaker.ts` (new), `src/render3d/boat/index.ts`, `src/render3d/sceneConfig.ts`, `src/ui/ropeColours.ts`, `src/ui/settingsMenu.ts`, `src/ui/sailsPanel.ts`, `src/ui/ropesTab.ts`, `tests/gennaker.test.ts` (new), `scripts/shots-m105.mjs` (new), `scripts/shots.mjs`, `scripts/ci-plan.mjs`, `docs/CODE_MAP.md`, `docs/BOAT_REFERENCE.md`.

### 7.2 Data (`content/boat/hanse508.json`)

Replace `sails.gennaker` with (every value an **assumption**, recorded in `BOAT_REFERENCE.md` under a new "Gennaker (M105)" heading; positions **tunable** only to fix a drawing clash, and the PR says so):

```json
"gennaker": {
  "enabled": true,
  "note": "Brochure option: 176.4 m2 in the brochure, 200 m2 in the manual (the app uses the manual's), own halyard (SPI HALYARD) and two sheets. Stowed unless rigged (Settings, or the Sails section's rigging steps). Shape and positions: assumptions (BOAT_REFERENCE, Gennaker).",
  "officialAreaM2": 200,
  "tackFitting": [6.92, 1.80, 0.0],
  "tack": [6.95, 2.40, 0.0],
  "head": [0.35, 21.0, 0.0],
  "footM": 11.4,
  "footElevationDeg": 4,
  "snuffedClewOffset": [-0.3, 0.8, 0.0],
  "bag": { "centre": [5.95, 1.95, -0.35], "radiusM": 0.22, "lengthM": 0.6, "mouth": [6.2, 2.15, -0.25] },
  "sock": { "radiusM": 0.18, "lineEnd": [6.5, 1.85, 0.15], "lineFromTackM": 0.4 },
  "sheetBlock": { "x": -8.0, "y": 1.5, "z": 2.1, "radiusM": 0.05, "widthM": 0.035 },
  "sheetVia": [[5.6, 0.15, 0.15], [4.0, 0.1, 0.15], [2.0, 0.1, 0.15], [0.0, 0.1, 0.15], [-2.0, 0.1, 0.15], [-4.0, 0.1, 0.15], [-6.0, 0.1, 0.15]],
  "sheetSlackM": 0.3,
  "lazySheetVia": [[7.35, 3.4, 0.0], [4.5, 2.55, 1.15]]
}
```

- `sheetVia` entries are `[x, liftM, outM]`: the point `(x, sheerAt(x) + liftM, side · (halfBeamAt(x) + outM))` (`src/model/hullShape.ts`): along the deck edge, just outside the stanchions and lifelines.
- `tackFitting` sits on the bow roller's tip (`deckFittings.bowRoller`: `tipX` 6.97, `plateY` 1.71); the tack hangs 0.6 m above it on the tack line (no bowsprit). The bag lies on the foredeck just behind the stem (x 5.65–6.25), to port of the jib's furling drum; its mouth is placed so the halyard clears the forestay (test 7.8.4: 0.067 m at the closest).
- `sheetBlock` is the starboard block, on the toerail near the stern (the deck edge is at z 2.06 there); the port one mirrors `z`. The bow rail (pulpit) is not modelled, so the first via (x 5.6) only keeps the sheets outside the hull's edge from the bow on. The vias are 2 m apart because the deck edge curves: straight lines between them stay at least 0.12 m outside it (checked against the hull table). `lazySheetVia` points are `[x, y, zOut]` with `z = −side · zOut` (on the windward side); used from M106.
- `ropes.list`: add, after `rope_spi_halyard`:
  `{"id": "rope_gennaker_tack_line", "controlId": null, "static": true, "colorKey": "gennaker"}`,
  `{"id": "rope_gennaker_sheet_port", "controlId": null, "static": true, "colorKey": "gennaker"}`,
  `{"id": "rope_gennaker_sheet_starboard", "controlId": null, "static": true, "colorKey": "gennaker"}`,
  `{"id": "rope_gennaker_sock_line", "controlId": null, "static": true, "colorKey": "gennaker"}`.
  (M106 sets the controls of the two sheets and the sock line.) Keep `"enabled"` but set it `true` (the boat can carry it). Change `rope_spi_halyard`'s note to `"The gennaker's halyard: parked down the front of the mast while the gennaker is stowed."`.
- `runningRigging.ropes`: `rope_gennaker_sheet_port` and `_starboard` `{ "diameterMm": 12, "lengthM": 28, "tracer": "red" }` (the manual's table, BOAT_REFERENCE row "Gennaker halyard / sheets (option)"); `rope_gennaker_tack_line` `{ "diameterMm": 10, "lengthM": 4, "tracer": "red" }` and `rope_gennaker_sock_line` `{ "diameterMm": 8, "lengthM": 44, "tracer": "red" }` (assumptions).
- `clutchPanel.staticRopeNotes`: `rope_spi_halyard` becomes `"gennaker"`; add the same value for the four new ropes. `StaticNote` (`src/model/panelEntries.ts`) replaces `'notRigged'` with `'gennaker'`; the string `ropes.static.notRigged` is removed from every `ui.json` and `ropes.static.gennaker` added.
- `src/render3d/sceneConfig.ts` `SCENE.ropes.colors`: add `gennaker: '#d55e00'` (vermilion, the colour-blind-safe set the others come from; the real sheets' tracer is red). `src/ui/ropeColours.ts` `ROPE_DASH`: `gennaker: '6 2 1 2'`.

### 7.3 Model (`src/model/gennaker.ts`, pure)

The types and `STOWED` of section 5 (in M105 `crossS` is always 0), `leewardSide` (section 3), and:

```ts
export type GennakerCommand = 'next' | 'back' | 'rig' | 'stow'; // M106 adds 'gybe'
export function gennakerCommand(setup: GennakerSetup, command: GennakerCommand, awaDeg: number, sockPct: number): GennakerSetup;
export function sheetLead(side: 1 | -1, data: BoatData = boat): Vec3[];
export interface GennakerDrawing {
  bag: boolean;
  tackLine: Vec3[] | null;
  sheets: { port: Vec3[]; starboard: Vec3[] } | null;
  /** The halyard from the masthead; null while it is parked (the existing parked drawing stays). */
  halyard: Vec3[] | null;
  /** The sock's tube, bottom to top (the snuffed sail inside it). */
  sock: { from: Vec3; to: Vec3 } | null;
  sockLine: Vec3[] | null;
}
export function gennakerDrawing(setup: GennakerSetup, data: BoatData = boat): GennakerDrawing;
```

- **`gennakerCommand`** (every result keeps `crossS` and `crossFromDeg` at 0 except the gybe of M106): `next`: stage + 1 when stage < 4; on reaching 2 set `side = leewardSide(awaDeg)`. `back`: stage − 1 when stage > 0, and from stage 4 only when `sockPct ≤ 0` (the sock is down). `rig`: stage 4, `side = leewardSide(awaDeg)` (from stage 0–3; at stage 4 unchanged). `stow`: returns `STOWED` from any stage (the Settings shortcut; from M106 the store also sets `ctl_gennaker_sock` to 0 and `ctl_gennaker_sheet` to its default 50; `rig` sets the sock to 0 too). Every other case returns `setup` unchanged (same object).
- **`sheetLead(side)`**: for each `sheetVia` entry the point of 7.2, then the block `(x, y, side · z)`, then the winch's foot: the primary winch on that side (`cockpitHardware.winches`, `winch_primary_port` / `_starboard`), `[w.x, w.y + 0.05, w.z]`. Nine points. `H` below is read from the spi halyard's `lineSpec('rope_spi_halyard', …).parked` with the same guard `halyards()` in `ropePaths.ts` uses. `gennaker.ts` imports from `hullShape.ts`, `vec3.ts` and the boat only (never from `ropePaths.ts`), so `ropePaths.ts` can import it without a cycle.
- **`gennakerDrawing`** by stage (m = `bag.mouth`, `H` = the spi halyard's `rig.lineLead.lines` entry `parked.masthead`, `T` = `tack`, `Hd` = `head`, `C0` = `T + snuffedClewOffset`):

| stage | bag | tackLine | sheets (each side s, port s = −1) | halyard | sock | sockLine |
|---|---|---|---|---|---|---|
| 0 | false | null | null | null | null | null |
| 1 | true | `[tackFitting, m]` | null | null | null | null |
| 2 | true | `[tackFitting, m]` | `[m, ...sheetLead(s)]` | null | null | null |
| 3 | true | `[tackFitting, m]` | `[m, ...sheetLead(s)]` | `[H, m]` | null | null |
| 4 | false | `[tackFitting, T]` | `[C0, ...sheetLead(s)]` | `[H, Hd]` | `{ from: T, to: Hd }` | `[T + lineFromTackM · unit(Hd − T), sock.lineEnd]` |

- `src/model/ropePaths.ts`: `RopeId` gets the four new ids. `ropeDrawings(rig, data, winches?, gennaker: GennakerSetup = STOWED)` (new last parameter): the spi halyard is drawn as today while `halyard` is null, otherwise as one strand along `halyard` plus its tail as today (state `'taut'`); each non-null line of the drawing becomes a `RopeDrawing` with that id: `tackLine` and `halyard` `'taut'` (straight segments), sheets and `sockLine` `'slack'`. A slack line is drawn segment by segment with `sagCurve(a, b, sheetSlackM, data.visual.ropeSagSegments, data)` (no floor) and the segments joined; each line is one strand, `feed: 0`, no `tailEnd`. Stage 0 draws none of the four new ropes, so a check that compares the drawn rope ids with `ropes.list` compares at stage 0 only with the ropes drawn (7.10). No 3D label is added for the new ropes.
- `src/model/panelEntries.ts`: `StaticNote` gets `'gennaker'`. The four new static ropes become static entries as `rope_spi_halyard` is.

### 7.4 Store and URL

- `AppState.gennaker: GennakerSetup`, initial `STOWED`. Action `{ type: 'gennaker'; command: GennakerCommand }` → `gennaker: gennakerCommand(state.gennaker, command, state.rig.wind.awaDeg, 0)` (M106 passes the sock control). `reset` returns to `STOWED`.
- During an exercise the action works (the exercises of M108 use it); `load` (a link) sets the gennaker from the link.
- **URL**: `gn` = stage, integer 0–4, written only when > 0; anything else → 0. `gx` = `p` or `s`, read and written only when stage ≥ 2 (ignored below); missing or invalid with stage ≥ 2 → `leewardSide(wrap180(wd − hdg))` (the true wind angle as `steadyState` forms it; the side is fixed at load, so apparent vs true does not matter). An exercise's start link may carry `gn` and `gx` (M108); Reset returns to stowed. `crossS` is never in the link (0). `gn` and `gx` are boat state, not viewer keys (not in `VIEWER_KEYS`). Old links: no `gn` → stowed.

### 7.5 UI

- **Settings** (`settingsMenu.ts`, after the `boat` row): a radio row like Step size, `data-testid="gennaker-setting"`, label `t('settings.gennaker.label')`, two buttons `data-testid="gennaker-stowed"` / `"gennaker-rigged"`, hint `t('settings.gennaker.hint')`. Stowed is pressed at stage 0, Rigged at 1–4. Tapping Rigged dispatches `rig`, Stowed dispatches `stow`. Strings `settings.gennaker.label`, `settings.gennaker.stowed`, `settings.gennaker.rigged`, `settings.gennaker.hint` (the namespace of `settings.miniMap.*`).
- **Sails section** (`sailsPanel.ts`, `createSailsPanel`): a block `data-testid="gennaker-block"` under the existing content, shown when stage ≥ 1 or when the running exercise's current step's `bar` names a `gennaker:` row (M108). Contents: a heading `t('gennaker.title')`; an ordered list `data-testid="gennaker-steps"` of the four steps (`t('gennaker.step1')` … `step4`), each a row with a tick (✓) when done (`stage ≥ n`) and the next one marked as current; two buttons, `data-testid="gennaker-back"` (`t('gennaker.back')`, disabled at stage 0 and at stage 4 while the sock is up) and `data-testid="gennaker-next"` (`t('gennaker.next')`, disabled at stage 4). Buttons follow the section's existing button style and are at least 44 px tall. At stage 0 outside an exercise the block is hidden and the Settings row is the way in.
- **Ropes list** (`ropesTab.ts`) and the Realistic panel's static list (`realisticPanel.ts`, the same filter): `panelEntries()` still returns all entries (it is cached per boat); the lists filter by stage: the tack line from stage 1, the sheets from 2, the sock line at 4. `rope_spi_halyard` always shows, with the note `t('ropes.static.gennaker')`.

### 7.6 3D (`src/render3d/boat/gennaker.ts`, `boat/index.ts`)

```ts
export interface GennakerModel { objects: THREE.Object3D[]; update(drawing: GennakerDrawing): void }
export function buildGennaker(materials: BoatMaterials, detail: Detail): GennakerModel;
```

- **Bag**: `partMesh('part_gennaker_bag', [cylinder], materials.sail)`, radius `bag.radiusM`, length `bag.lengthM`, axis along x, centred on `bag.centre`. Visible when `drawing.bag`.
- **Sock**: `partMesh('part_gennaker_sock', [cylinder of radius sock.radiusM, unit length], materials.sail)`, scaled to the length of `sock.from → sock.to` and turned along it each update. Visible when `drawing.sock`.
- **Blocks**: `partMesh('fit_gennaker_block', [cylinder], <the material the mainsheet deck blocks use>)`, radius `sheetBlock.radiusM`, length `widthM`, axle across the boat (z), its centre `radiusM` above the block point, one per side; visible at stage ≥ 2.
- Both details build the same meshes (cylinders with 16 segments at high detail, 8 at low). The ids are written as literals in this file (the `NOT_DRAWN` test, section 4).
- The ropes come from `ropeDrawings` (7.3) through the existing `buildRopes`; no rope is built here.
- **Wiring**: `BoatModel.update(…)` (`boat/index.ts`) gets a new last parameter `gennaker: GennakerSetup`; it passes it to `ropeDrawings` and calls `gennakerModel.update(gennakerDrawing(gennaker))` when the setup changed (compare `stage`, `side`). `scene.ts` passes `state.gennaker` at its call of `update`.
- **Debug hook** (`scene.ts`, inside the `?debug=1` `__sailDebug` object): `partVisible(id: string): boolean`: true when a mesh of the boat's root with `userData.partId === id` is visible with all its parents. Later milestones' checks use it.

### 7.7 Strings, registry and Learn

Registry (`content/registry/parts.json`, after `sail_gennaker`), all `"phase": 105, "status": "draft", "sources": []`:

| id | kind | group | related |
|---|---|---|---|
| `rope_gennaker_tack_line` | rope | ropes | `sail_gennaker`, `sailpart_tack` |
| `rope_gennaker_sheet_port` | rope | ropes | `rope_gennaker_sheet_starboard`, `fit_gennaker_block`, `term_sheet` |
| `rope_gennaker_sheet_starboard` | rope | ropes | `rope_gennaker_sheet_port`, `fit_gennaker_block`, `term_sheet` |
| `rope_gennaker_sock_line` | rope | ropes | `part_gennaker_sock` |
| `part_gennaker_sock` | part | sails | `rope_gennaker_sock_line`, `sail_gennaker` |
| `part_gennaker_bag` | part | deck | `sail_gennaker` |
| `fit_gennaker_block` | fitting | deck | `rope_gennaker_sheet_port`, `rope_gennaker_sheet_starboard` |

Each gets `"showMe": "?gn=4&wd=120&ws=10&ms=60&jf=0&held=1&sea=flat&cam=side-port&sel=<that entry's own id>"` (wind over starboard, so the working side is port, towards the camera) except the bag, whose link uses `gn=3`. `related` as in the table; no new id goes into `tests/languages.test.ts` or `tests/registry.test.ts` lists unless a test there fails without it. `sail_gennaker`: `related` adds the seven ids; `phase` stays 99 until M106.

English glossary entries (`content/lang/en/glossary.json`, final; `textStatus: "draft"`; de / no / ru AI drafts):

- `rope_gennaker_tack_line`: name "Gennaker tack line"; short "Holds the gennaker's front lower corner down at the bow."; what "A short line from a fitting at the bow to the gennaker's tack (its front lower corner). It is the first thing you attach when you rig the gennaker. On many boats it can be eased to let the front of the sail lift; in the app it has a fixed length."
- `rope_gennaker_sheet_port` / `_starboard`: names "Gennaker sheet (port)" / "Gennaker sheet (starboard)"; short "One of the gennaker's two sheets; the one on the side away from the wind does the work."; what "The gennaker has two sheets, one on each side, both tied to its clew (back lower corner). Each runs outside everything: outside the shrouds, the stanchions and the lifelines, to a block near the stern and on to the aft winch on its side. The sheet on the side away from the wind (leeward) trims the sail; the other one, the lazy sheet, hangs slack until you gybe."
- `rope_gennaker_sock_line`: name "Sock line"; short "Pulls the sock up to set the gennaker and down to take it in."; what "The gennaker goes up inside a long cloth tube, the sock (or snuffer). The sock line is a loop: pull one part and the sock rides up the sail, which opens and fills; pull the other part and the sock comes down over the sail and smothers it."
- `part_gennaker_sock`: name "Gennaker sock"; alternatives ["Snuffer"]; short "A cloth tube that keeps the gennaker gathered until you want it."; what "A long tube of cloth with a ring at its bottom. The gennaker is hoisted inside it, so it goes up as a harmless sausage. Pulling the sock up lets the sail out; pulling it down gathers it again."
- `part_gennaker_bag`: name "Gennaker bag"; short "Where the gennaker lives when it is not up."; what "The gennaker is packed in its sock inside a bag. To rig it, the bag goes to the bow and is tied down, with the head, tack and clew at its mouth, so the tack line, the sheets and the halyard can be clipped on before it goes up."
- `fit_gennaker_block`: name "Gennaker sheet block"; short "A block near the stern that turns the gennaker sheet towards the winch."; what "One on each side, on the toerail near the stern. The sheet comes from the sail outside everything and turns here, forward to the aft winch."
- `sail_gennaker` changes: `short` "A large, light sail for wind from the side or behind; an option on this boat."; `onThisBoat` "An option on the Hanse 508 (the manual gives 200 m²; the brochure 176.4 m²). It is rigged with a tack line at the bow, two sheets and its own halyard (\"SPI HALYARD\"). Settings → Gennaker rigs it."

`ui.json` (English final): `settings.gennaker.label` "Gennaker"; `settings.gennaker.stowed` "Stowed"; `settings.gennaker.rigged` "Rigged"; `settings.gennaker.hint` "Rigged puts it up in its sock, ready to set. The Sails section shows the steps."; `gennaker.title` "Gennaker"; `gennaker.step1` "Bag to the bow, tack line on"; `gennaker.step2` "Sheets led outside everything, to the stern blocks"; `gennaker.step3` "Halyard on the head, in front of the forestay"; `gennaker.step4` "Hoisted in its sock"; `gennaker.next` "Next step"; `gennaker.back` "Undo a step"; `ropes.static.gennaker` "Part of the gennaker: see Sails → Gennaker."

`tests/glossary.test.ts` "the groups have the expected sizes": `[9, 10, 13, 9, 18, …]` becomes `[13, 11, 13, 9, 20, 22, 13, 14, 32, 10, 20]` (ropes +4, sails +1, deck +2).

### 7.8 Tests (`tests/gennaker.test.ts`)

1. **Commands**: from `STOWED`, `next` ×2 with `awaDeg = 30` gives stage 2, side −1; with `awaDeg = −30`, side 1; `next` at 4 returns the same object; `back` at 4 with `sockPct = 40` returns the same object, with 0 gives 3; `rig` from 0 with `awaDeg = 100` gives `{ stage: 4, side: −1, crossS: 0, crossFromDeg: 0 }`; `stow` from 3 gives stage 0.
2. **Sides**: `sheetLead(1)` and `sheetLead(−1)` have 9 points, mirror images (`z` negated, x and y equal within 1e-9); the starboard block point is `[−8.0, 1.5, 2.1]`; the last point is the winch's foot `[−7.25, 1.60, 1.6]`.
3. **PT-69 the sheets run outside everything**: for both sides, `sheetLead(s)` from its first point to its last `sheetVia` point (the straight segments, sampled every 0.25 m) has `|z| ≥ halfBeamAt(x) + 0.05` wherever x lies within the lifelines' run (`modelDetail.lifelines.aftX` … `fwdX`); the block itself has `|z| ≥ halfBeamAt(−8.0)` (on the deck edge).
4. **The halyard clears the forestay**: at stage 3, the halyard segment `[H, m]` sampled at y = 4, 5, …, 20 lies ahead of the forestay (`x_halyard(y) − x_forestay(y) ≥ 0.05`, the forestay from `rig.forestay.bottom` to `top`; the prototype's smallest margin is 0.067); at stage 4 the sock's axis `T → Hd` at y = 3 … 20 (smallest margin 0.34).
5. **Drawing table**: each stage's nulls and non-nulls as in 7.3; stage 0 equals the drawing of a link without `gn`.
6. **URL**: `?gn=3&gx=p` round-trips; `?gn=7` → stage 0; `?gn=2&wd=60` (no `gx`) → side −1; `?gn=0&gx=p` → `STOWED`; a link without `gn` serializes without `gn` and `gx`; stage 1 writes `gn=1` and no `gx`.
7. **Store**: `reduce(state, { type: 'gennaker', command: 'rig' })` gives stage 4; `reset` returns `STOWED`.

### 7.9 Browser checks (`scripts/shots-m105.mjs`, joins group `m8`, test clock)

**Budget**: no new group (the cap). `GROUP_ALIASES` gets `m105: 'm8'`; in `shots.mjs` import `liveM105Checks` and `M105_SCENES` (scenes registered in `SCENES` as `{ ...scene, name: \`m105-${scene.name}\` }`), and turn the plain `m8` entry into `m8: members(['m8', () => liveM8Checks(live)], ['m105', () => liveM105Checks(onTestClock)])`. `m8` recorded 75 s; expected addition 40 s; if the measured group time is over 112 s (half again) update its line in `.github/ci-times.json`, and if it is over 120 s name `m8` in `.github/ci-budget.json` with the reason. Nothing becomes redundant.

**Scenes** (`M105_SCENES`, all sizes, `sheet: 'peek'`, `waitMs: 2500`; `B = '?wd=120&ws=10&ms=60&jf=0&held=1&sea=flat'`):

| name | query | shows |
|---|---|---|
| `bag` | `B&gn=1&cam=bow` | the bag at the bow, the tack line on |
| `sheets` | `B&gn=2&cam=top` | both sheets along the deck edges, outside the lifelines, to the stern blocks and winches |
| `hoisted` | `B&gn=4&cam=side-port` | the sock from the bow to the masthead, the halyard, the sheets |

**Live checks** (phone viewport, `B&cam=side-port&debug=1`, helpers from `scripts/ui.mjs`):

1. `openSettings(page)`; tap `gennaker-rigged` with a touch tap (`locator.tap()`); `waitForLink` until the link has `gn=4`; `__sailDebug.partVisible('part_gennaker_sock')` is true.
2. Tap `gennaker-stowed`: `gn` leaves the link and `partVisible('part_gennaker_sock')` is false.
3. Open `B&gn=1`; `showSection(page, 'sails')`; `gennaker-steps` shows step 1 ticked; tap `gennaker-next` twice (touch): the link has `gn=3`; `gennaker-back` once: `gn=2`.
4. Ropes list at `B&gn=2`: the entries of `rope_gennaker_sheet_port` and `_starboard` are listed, the sock line's is not.

### 7.10 Older checks and tests this milestone changes

- `tests/glossary.test.ts`: the group sizes (7.7).
- `tests/boatModel.test.ts` (about lines 195–210): the expectation that `sails.gennaker.enabled` is false and that no `sail_gennaker` part is drawn becomes `enabled` true (no `sail_gennaker` mesh until M106 stays); the drawn ropes sorted against `ropes.list` compare against the list without the four new ropes at stage 0.
- `tests/m5Ropes.test.ts` (about line 118): `ropeDrawings(rig)` at stage 0 draws `ropes.list` minus the four new ids.
- `tests/panelEntries.test.ts` (about lines 30–35 and 89): the exact key list gains the four static entries; `'notRigged'` becomes `'gennaker'`.
- `grep -n "notRigged\|rope_spi_halyard" tests/ scripts/shots-m*.mjs src/`: every remaining use of the old note.
- `grep -n "RopeColorKey\|ROPE_DASH\|ropes.colors" tests/`: a test counting the colour keys gains `gennaker`.
- Settings: `grep -n "toHaveCount" scripts/shots-m*.mjs` near Settings checks (m25, m54, m56) for a count of Settings rows; the row is added after Boat.
- `tests/ciPlan.test.ts` keeps 77 groups (alias).

**PR line:** `CI groups: all` (store, URL and scene setup change).

### 7.11 Done when / not in this milestone

PR: `Closes #246`. Done when the four steps draw as in 7.3 on both tacks, Settings and the Sails block work by touch, the links round-trip, every test of 7.8 and check of 7.9 passes, `npm run check` passes and the CI run with `CI groups: all` is green.

Not in this milestone: the sail itself, the sock going up, forces, the gennaker controls (M106); Realistic winches (M107); a tack line control.

### 7.12 Decided in the M105 PR (recommended; merging accepts it)

1. **The sheets go round the bow ahead of the forestay at steps 2 and 3.** The independent review found that a sheet led straight from the bag's mouth to the far deck edge crossed the foredeck behind the forestay, against PT-69. New data key `sails.gennaker.sheetBowVia` `[6.55, 1.95, 0]`; the two sheets at stages 2 and 3 are `[m, sheetBowVia, ...sheetLead(s)]` (11 points); at stage 4 they stay `[C0, ...sheetLead(s)]`. A PT-69 test checks the crossing.
2. **`sheetSlackM` is 0.03, not 0.3, and the last piece of a sheet (block to winch) is drawn straight.** At 0.3 each 2 m piece hung 0.5 m down the topsides and the last piece dipped into the hull. Drawing only; a test keeps the drawn sheets outside the deck edge below the sheer.
3. **Rope meshes are created when a rope is first drawn** (`buildRopes(initial, detail, onAdd)`), so a boat at stage 0 has the same meshes as before; a rope that stops being drawn is hidden.
4. **Learn's "Where is it?" rigs the gennaker as far as the part needs** (`stageToShow`), then flies to it, so the entry works from stowed. M106 must handle a sock that is up (the bag cannot be shown then).
5. **Every new Learn entry has a `showMe` text** in all four languages (`tests/glossary.test.ts` requires one wherever the registry has a `showMe` link).
6. **The interface texts of the review documents moved to `docs/review/<code>-ui.md`** (as the exercise texts did in M71), because `ru.md` passed the 450 KiB GitHub shows as Markdown. `npm run review-doc -- <code>` writes the three files; `tests/glossary.test.ts` checks them.
7. **The Sails block shows from stage 1 only**; the exercise-bar condition of 7.5 is M108's. The Realistic panel needs no change: the gennaker's ropes have no clutch, so they are not in its list.
8. **Settings → Gennaker is two buttons with `aria-pressed`** (not radio inputs), so a touch tap works on the visible button.

## 8. M106: Sailing with the gennaker

**Independent review: required** (sail forces, two new controls, the step order; PT rules).

### 8.1 Files

`content/boat/hanse508.json`, `content/registry/parts.json`, glossaries and `ui.json` (×4), `src/model/gennaker.ts`, `src/model/controls.ts`, `src/model/sim.ts`, `src/model/sailForces.ts`, `src/model/motion.ts` (`steadyState` option), `src/model/sailShape.ts`, `src/model/glossary.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/render3d/boat/gennaker.ts`, `src/render3d/boat/index.ts`, `src/ui/sailsPanel.ts`, `src/ui/ropesTab.ts`, `tests/gennaker.test.ts`, `tests/physicsTruthsRigging.test.ts` (new), `scripts/shots-m106.mjs` (new), `scripts/shots.mjs`, `scripts/ci-plan.mjs`, `docs/PHYSICS_TRUTHS.md` (statuses only), `docs/CODE_MAP.md`, `docs/BOAT_REFERENCE.md`.

### 8.2 Data

Add to `sails.gennaker` (assumptions; **tunable** as marked):

```json
"sheet": { "phiHauledDeg": 15, "phiEasedDeg": 85, "loadFraction": 0.45 },
"aero": {
  "entryDeg": 25,
  "fillStartAoaDeg": 2,
  "fillFullAoaDeg": 8,
  "stallAboveAoaDeg": 30,
  "liftByAoaDeg": [[0, 0], [5, 0.7], [10, 1.3], [15, 1.5], [25, 1.35], [40, 1.05], [60, 0.7], [90, 0.3]],
  "dragByAoaDeg": [[0, 0.1], [10, 0.15], [15, 0.25], [25, 0.45], [40, 0.7], [60, 0.95], [90, 1.2]]
},
"blanket": { "fromAwaDeg": 145, "fullAwaDeg": 165, "factorAtFull": 0.1 },
"backedBelowAwaDeg": 170,
"look": { "camberRatio": 0.22, "twistDeg": 8, "sockBunchM": 1.5 },
"gybeCrossS": 5
```

The flogging drag of a gennaker that is not filled uses the shared `physics.sails.floggingDragCoefficient` (0.15), as the prototype did. Tunable: `entryDeg`, `stallAboveAoaDeg`, both tables, `blanket.*`, `look.*`, `gybeCrossS`, `sheet.loadFraction`. Not tunable: `phiHauledDeg`, `phiEasedDeg`, `officialAreaM2`.

`controls.list` adds `{"id": "ctl_gennaker_sheet", "label": "Gennaker sheet", "unit": "% eased", "min": 0, "max": 100, "default": 50}` and `{"id": "ctl_gennaker_sock", "label": "Gennaker sock", "unit": "% up", "min": 0, "max": 100, "default": 0}`. `ropes.list`: the two sheets get `"controlId": "ctl_gennaker_sheet"`, the sock line `"controlId": "ctl_gennaker_sock"`; all three lose `"static": true` (the tack line stays static). `CONTROL_IDS` gets both ids (after `ctl_jib_furl`); `SHEET_CONTROL_IDS` gets `ctl_gennaker_sheet` (its − / + read Trim / Ease); `AppliedControls` gets `gennakerSheet`, `gennakerSock`, lagged like `jibSheet`. A link may carry `gs` / `gu` with any stage; below stage 4 they are kept but act on nothing.

### 8.3 Model

In `src/model/gennaker.ts`:

```ts
export type GennakerTrimState = 'stowed' | 'snuffed' | 'crossing' | 'backed' | 'blanketed' | 'pressed' | 'luffing' | 'good' | 'stalled';
export interface GennakerSolution {
  set: boolean;        // stage 4 and sockUp > 0
  sockUp: number;      // 0…1, applied sock / 100; 0 below stage 4
  thetaDeg: number;    // signed foot angle: + = clew to starboard; |θ| = φ off the centreline, measured from astern
  phiDeg: number;      // |θ| outside a crossing
  aoaDeg: number;      // 0…90
  blanket: number;     // factorAtFull…1
  backed: boolean;
  fill: number;        // 0…1
  side: 1 | -1;
}
export function solveGennaker(setup: GennakerSetup, sheetPct: number, sockPct: number, awaDeg: number, data: BoatData = boat): GennakerSolution;
export function gennakerTrimState(setup: GennakerSetup, sol: GennakerSolution, data: BoatData = boat): GennakerTrimState;
export function stepGennaker(setup: GennakerSetup, dt: number): GennakerSetup;
```

**`solveGennaker`** (b = |awaDeg|, degrees; g = `sails.gennaker`):

- `sockUp = stage === 4 ? clamp(sockPct / 100, 0, 1) : 0`; `set = stage === 4 && sockUp > 0`.
- `φT = g.sheet.phiHauledDeg + (g.sheet.phiEasedDeg − g.sheet.phiHauledDeg) · sheetPct / 100`.
- `φ = min(φT, max(g.sheet.phiHauledDeg, b − g.aero.entryDeg))` (the wind cannot push the clew past where the sail lies along it).
- `aoa = clamp(b − φ − g.aero.entryDeg, 0, 90)`.
- `blanket = 1 − (1 − g.blanket.factorAtFull) · smoothstep(g.blanket.fromAwaDeg, g.blanket.fullAwaDeg, b)` (the main hides it on a run).
- `backed = set && crossS === 0 && side === −leewardSide(awaDeg) && b > 0 && b < g.backedBelowAwaDeg` (on the windward side after the boat gybed; within 10° of dead downwind neither side counts as wrong, so `backed` does not flicker on a run).
- `fill = set && !backed && crossS === 0 ? smoothstep(g.aero.fillStartAoaDeg, g.aero.fillFullAoaDeg, aoa) · blanket : 0`.
- `θ`: outside a crossing `side · φ`. During a crossing (`crossS > 0`), `u = 1 − crossS / g.gybeCrossS`, `φ0 = crossFromDeg`, `φE = g.sheet.phiEasedDeg` and `θ = −side · (φ0 + (360 − φ0 − φE) · u)`, wrapped to −180…180: from where the clew was on the old side, round the front of the boat (|θ| = 180 at `u = (180 − φ0) / (360 − φ0 − φE)`), to the new side fully eased (the outside gybe). `phiDeg = |θ|`.
- Stage < 4: every number 0 except `side` and `blanket = 1`, `thetaDeg = side · phiHauledDeg`.
- `awaDeg = 0` gives b = 0, aoa 0, fill 0; no NaN anywhere.

**`gennakerClew(θ)`** (M105 helper, used from here): `T + footM · (−cos θ · cos e, sin e, sin θ · cos e)`, `e = footElevationDeg`, θ in degrees converted with `DEG`. θ = 15 → `[−4.035, 3.195, 2.943]` (± 0.001).

**`gennakerTrimState`**, first match: stage < 4 → `stowed`; `sockUp ≤ 0.05` → `snuffed`; `crossS > 0` → `crossing`; `backed` → `backed`; `blanket < 0.5` → `blanketed`; `fill < 0.5` → `luffing`; `aoa > stallAboveAoaDeg` → `stalled`; else `good`.

**`stepGennaker`**: `crossS = max(0, crossS − dt)`; when it reaches 0, `crossFromDeg = 0`; nothing else.

**Gybe command** (`gennakerCommand(setup, 'gybe', awaDeg, sockPct, phiNowDeg)`; the new optional fifth parameter is the current `rig.gennaker.phiDeg`, default 0): only at stage 4 with `crossS === 0`: `side = −side`; when `sockPct > 0` also `crossS = g.gybeCrossS` and `crossFromDeg = phiNowDeg` (a snuffed sail just swaps sheets). The store, on a gybe that started a crossing, sets `rig.applied.gennakerSheet = 100` (the old sheet let go, the new one starts fully eased and the lag brings it to the target) — that is the only place the store writes into `rig.applied`.

**Forces** (`src/model/sailForces.ts`): `SailForces` gets `gennaker: SailForce`. `oneSail(sail, q, beta, heelFactor, data, tables = data.physics.sails)`: the new last parameter holds `liftByAoaDeg` and `dragByAoaDeg` (the main and jib keep the default; the gennaker passes `g.aero`); `floggingDragCoefficient` stays read from `physics.sails`. `SailDamage`, `NO_DAMAGE` and `SailName` get no gennaker; the gennaker input: `areaM2 = g.officialAreaM2 · sockUp`, `furled = !set`, `byTheLee = false`, `aoaDeg = aoa`, `fill`, `ceHeightM = (T.y + Hd.y + gennakerClew(θ).y) / 3`, heel factor `k` as for the main (no tear factor: the gennaker is never torn). `driveN`, `sideN` and `heelMomentNm` add the gennaker's terms exactly as the jib's. `sailForces` gets the solution through its `rig` argument: the `Pick` adds `'gennaker'`.

**Realistic ropes before M107**: the two gennaker controls have no clutch or winch (`tailSpecs` has no entry for them); in Realistic ropes they are worked only by the Sails block's steppers, which dispatch `setControls` as in Easy ropes, and applied as Realistic applies any control (instantly). Tests that loop over `ropes.list` controls in `tests/realistic*.test.ts` skip ropes with no tail spec, or are changed to; name each in the PR. On a gybe in Realistic ropes the sheet therefore jumps to its target at once.

**Rig** (`src/model/sim.ts`): `RigState.gennaker: GennakerSolution`; `StepOptions.gennaker?: GennakerSetup` (default `STOWED`); `step` solves it every frame after the jib (no cache: it is a few lines of arithmetic; no lag beyond the controls' own), with `rope.gennakerSheet`, `rope.gennakerSock` and `wind.awaDeg`, and `forcesOf` passes it on. `initialRig(controls, data, history, motion, trueWind, gennaker = STOWED)` (a new sixth parameter); `steadyState`'s `opts` gets `gennaker?: GennakerSetup`, passed to its `initialRig` call. **The store**: the initial-state builder that calls `steadyState` for a link's start speed (store.ts, near its `steadyState` call) gets the link's `GennakerSetup` as a new parameter and passes it on, and so does its `initialRig` call, so a `gn=4&gu=100` link starts at the speed with the gennaker. The gennaker's centre of effort is its `SailInput.ceHeightM` (computed as above); `ceHeights` is unchanged. Every `RigState` literal and `Pick` that must now carry `gennaker` is found with `grep -rn "jibSolution" src/ tests/`.

**Sheet load** (`src/model/sheetLoads.ts`): `gennakerSheetLoadN(forces: SailForces, data) = hypot(liftN, dragN) of forces.gennaker · g.sheet.loadFraction` (no purchase: the sheet runs straight to the winch; used by M107). At tws 12, twa 120, ms 60, gs 25 (steady state, heel on) it is 2,500 N (hand estimate from the prototype's forces: aws 10.9 kn, aoa 15.4°, Cl 1.49, Cd 0.27, cos² of 11.6° heel), band 2,200–2,800 N.

### 8.4 Prototype values and bands

Run with `steadyState(controls, 0, boat, { heel: true, gennaker: { stage: 4, side: leeward, crossS: 0 } })`, `ctl_gennaker_sock = 100`, `ctl_jib_furl = 0` with the gennaker; without it the existing best over `MAIN_SHEETS` and `JIB_SHEETS` (`tests/motionHelpers.ts` `best`). The gennaker's best is over mainsheet {0, 10, …, 100} × gennaker sheet {0, 5, …, 100}.

| case | prototype | band |
|---|---|---|
| tws 12, twa 120: best with gennaker (at ms 60, gs 25) | 9.20 kn | 8.90–9.50 |
| same, best without (jib) | 7.07 kn | 6.80–7.35 |
| tws 12, twa 60: best with gennaker | 5.92 kn | ≤ base − 1.2 (base 7.64) |
| tws 18, twa 75, ms 40, gs 0: heel | 43.9° | 40–48°, and ≥ base heel (21.9° at ms 40, js 100) + 15 |
| tws 12, twa 180, gs 50: fill; trim state | 0.10; `blanketed` | 0.09–0.11 |
| tws 12, twa 180: gain over the best without | 0.61 kn | ≤ 0.8 |
| tws 12, twa 150: gain | 2.14 kn | ≥ 1.6 |
| `solveGennaker` at a fixed `awaDeg = 74` (the apparent angle of the best trim at tws 12, twa 120; no steady state, which is not monotonic near the curl): first integer gs with fill < 0.5 (the curl) | 42 (φ > 44° gives aoa < 5°) | exactly 42 |
| steady state tws 12, twa 120, ms 60, at gs = curl − 15 (27) vs the best | 9.17 vs 9.20 | ≥ 0.97 · best |
| same, gs 0: speed; trim state; heel vs gs 30 | 8.57 kn; `stalled`; 13.1° vs 10.6° (after the fix below: 9.02 kn; `pressed`; 12.6° vs 11.6° at gs 25) | 8.9–9.1; `pressed`; heel(gs 0) > heel(gs 25) |

### 8.5 Store, URL, UI, 3D

- **Store**: `GennakerCommand` gets `'gybe'`. The `stow` command also sets `ctl_gennaker_sock` to 0. `setControls` for the two gennaker controls works only at stage 4 (otherwise ignored). The `step` case per section 5.
- **URL**: `URL_CONTROLS` gets `['gs', 'ctl_gennaker_sheet']`, `['gu', 'ctl_gennaker_sock']` (written only when they differ from their defaults, as the others are).
- **Sails block** (M105) at stage 4 adds: a trim line `data-testid="gennaker-trim"` with `t('gennaker.trim.<state>')`; the sock row and the sheet row, the existing rope stepper (`stepper.ts`, the same − / + and step size (Settings → Step size) as the jib sheet's, `data-testid="gennaker-sock-row"` / `"gennaker-sheet-row"`); a button `data-testid="gennaker-gybe"` `t('gennaker.gybe')`, disabled while crossing; it dispatches the gybe with `rig.gennaker.phiDeg`. The Ropes list shows the sheet and sock entries (with − / +) only at stage 4.
- **3D**: from M106, `GennakerModel.update(drawing: GennakerDrawing, sol: GennakerSolution, windSpeedKn: number, timeS: number)` runs every frame, and `gennakerDrawing(setup, sol?: GennakerSolution)` takes the solution: at stage 4 with `sol.sockUp > 0.05` the sheets start at `gennakerClew(sol.thetaDeg)` and the sock line at the sock's mouth; otherwise as in M105 (from `C0`). `ropeDrawings`' fourth parameter stays the setup; it reads the solution from `rig.gennaker`. The sail mesh, `buildSailMesh('sail_gennaker', materials, grid)`, is visible while `sockUp > 0.05`. `src/model/sailShape.ts`: the private `SailGridInput` gets `camberRatio?: number` (default: the existing `data.visual.mainSail.camberRatio`; rows and columns stay `visual.mainSail`'s); row i has `v = i / rows` from the tack (0) to the head (1) and its luff point `tack + v · (head − tack)`, as `sailGrid` computes them; new exports `gennakerSailCorners(thetaDeg, data)` (`{ tack: g.tack, head: g.head, clew: gennakerClew(θ) }`) and `gennakerSailGrid(input: { thetaDeg; fill; windSpeedKn; timeS; sockUp }, data)`: `sailGrid` with those corners, `twistDeg = g.look.twistDeg`, `side = sign(sin θ)` (θ = 0 or 180 → `setup.side`), `camberRatio = g.look.camberRatio`; then the **sock**: mouth fraction `v_m = sockUp · (1 − look.sockBunchM / |Hd − T|)`, every row with `v > v_m` has each point replaced by its luff point (the sail still in the sock). The sock tube is drawn from `T + v_m · (Hd − T)` to `Hd` (at `sockUp = 0` it is M105's whole sock). The ropes: the working sheet (side `setup.side`) runs `[clew, block(side), winch foot(side)]`, `'taut'`; the lazy one `[clew, ...lazySheetVia (z = −side · zOut), ...sheetLead(−side) from its second point on]`, `'slack'`; the sock line from the mouth to `sock.lineEnd`. During a crossing both sheets are `'slack'`.
- `src/model/glossary.ts`: remove `sail_gennaker` from `NOT_DRAWN`.

### 8.6 Strings, registry, tests

- `ui.json`: `gennaker.trim.snuffed` "In its sock"; `.crossing` "Going round the front to the other side"; `.backed` "On the wrong side: gybe it"; `.blanketed` "Hidden behind the main: steer a little higher"; `.luffing` "Front edge curling: trim a little"; `.good` "Drawing well"; `.stalled` "Trimmed too hard: ease until the edge curls"; `gennaker.gybe` "Gybe the gennaker"; `gennaker.sock` "Sock"; `gennaker.sheet` "Sheet".
- Registry: `sail_gennaker` `"phase": 106`; a new `term_lazy_sheet` (kind term, group sailing, phase 106, draft, related the two sheets); glossary: name "Lazy sheet", short "The sheet that is not working, on the side the wind comes from.", what "A sail with two sheets uses one at a time: the leeward one trims, the windward one is lazy and hangs slack. When you gybe, the lazy sheet becomes the working one: pull it in and let the old one go." Group sizes in 8.8.
- `gennakerTrimState` never returns `stowed` while the block shows the trim line (stage 4); the state exists for the exercises (M108), so it has no string.
- **Tests** (`tests/physicsTruthsRigging.test.ts`, one `it` per band of 8.4, named after the rule; the twa 180 case uses `side = leewardSide(180)` = −1): "PT-67 a gennaker pays on a broad reach", "PT-67 too close to the wind the gennaker is slower and overpowers", "PT-67 dead downwind the main hides it", "PT-68 trim to the curl", "PT-70 the sock: down is no sail". PT-70: at stage 4, `gu = 0` gives `areaM2 = 0`, `driveN = 0` of the gennaker and trim `snuffed`; `gu = 50` gives half the area.
- `tests/gennaker.test.ts` adds: both tacks mirror (twa ±120: equal speed within 0.01 kn, heel signs opposite, clew z signs opposite); "PT-69 a gybe sends the clew round the front": after `gybe` with the sock up and `phiNowDeg = 40`, at `u = (180 − 40) / (360 − 40 − 85)` |θ| is 180 (± 0.5) and the clew's x > `T.x`; at `u = 0` θ is −side_new · 40 (the old side, no jump); after `gybeCrossS` seconds of `stepGennaker`, `crossS = 0`, side flipped, trim not `crossing`; backed: side = windward gives fill 0 and `backed`; the gybe with `gu = 0` sets no crossing; `stow` sets the sock control to 0; `awaDeg = 0` gives no NaN; `gennakerSheetLoadN` at tws 12 twa 120 ms 60 gs 25 within 2,200–2,800 N (8.3).

### 8.7 Browser checks (`scripts/shots-m106.mjs`, joins group `m26`, test clock)

`GROUP_ALIASES` `m106: 'm26'`; the plain `m26` entry becomes `m26: members(['m26', () => liveM26Checks(live)], ['m106', () => liveM106Checks(onTestClock)])`. `m26` recorded 73 s (the lowest-time group with room); expected addition 45 s; over 110 s update `ci-times.json`, over 120 s name it in `ci-budget.json` with the reason.

Scenes (`sheet: 'peek'`; `S = '?wd=120&ws=12&ms=60&jf=0&gn=4&gx=p&gs=25&gu=100&ap=wind&apt=120&sea=flat'`): `set` (`S&cam=side-port`: the sail full on the camera's side), `helm` (`S&cam=helm`), `run` (`?wd=180&ws=12&ms=100&jf=0&gn=4&gx=p&gu=100&gs=80&sea=flat&cam=top`: collapsed behind the main).

Live (phone, test clock, `showSection(page, 'sails')`): (1) open `S` without `gu` (sock down): `gennaker-trim` reads "In its sock"; tap the sock row's + (touch) until the link has `gu=100`; within 10 s app time the trim reads "Drawing well", and within 30 s the strip's speed is at least 1 kn higher than before the first tap. (2) Tap `gennaker-gybe` (touch) without turning the boat: the trim reads the crossing text, and within `gybeCrossS` + 2 s the backed text (the sail is now on the windward side); tap it again: within 15 s it reads "Drawing well". (3) Tap the sheet row's + until `gs=100`: the trim reads the luffing text.

### 8.8 Older checks and tests this milestone changes

`grep -n "CONTROL_IDS\|SHEET_CONTROL_IDS\|ctl_jib_furl\]" tests/` for lists or counts of the control ids (+2); `tests/urlState.test.ts` lists of `URL_CONTROLS`; `grep -rn "jibSolution" tests/` for rig literals; `grep -n "SailForces\|driveN" tests/` for `SailForces` literals; `grep -n "ropes-.*toHaveCount\|ropeEntry" scripts/shots-m*.mjs` for checks counting the Ropes list's rows (the gennaker rows show only at stage 4, so older links are unchanged); `tests/glossary.test.ts` group sizes `[13, 11, 13, 9, 20, 22, 13, 14, 33, 10, 20]` and section 11 (`sail_gennaker` now drawn); M105's live check 4 (`scripts/shots-m105.mjs`): the sheets are now controlled entries shown at stage 4, so it opens `B&gn=4` and expects the sheet's entry with − / +. **PR line:** `CI groups: all`.

### 8.9 Done when / not in this milestone

PR: `Closes #247`. Done when every band of 8.4 holds, both tacks mirror, the gybe crosses in front, `npm run check` and CI with `CI groups: all` are green.

Not in this milestone: Realistic winches (M107; until then the Sails block's steppers work in both rope modes); exercises; a gennaker alert of its own (the existing overpowered and round-up alerts cover it); the jib and the gennaker shading each other (the learner furls the jib; the exercises say so).

### 8.10 Decided in the M106 PR (recommended; merging accepts it)

1. **Every band of 8.4 held on the first run**; no tunable key was changed. Speeds at tws 12, twa 120: 9.20 kn with the gennaker, 7.07 without.
2. **`gennakerDrawing(setup, sol?, data)` takes the solution second and the boat data third** (M105's callers passed the data second; they were updated). `GennakerDrawing` gets `workingSide`: the side of the taut sheet, null while the sail is not set or is crossing (both sheets then hang).
3. **The two sheets are one control**: both sheet entries of `ropes.list` carry `oneAtATime: true`, so the Ropes tab does not say they "work against each other". The Ropes list shows the sheet and the sock line from stage 4 only; a sheet tapped in 3D at stage 2 or 3 opens a strip whose slider acts on nothing (the store ignores the control below stage 4).
4. **`createControl` takes an id suffix**, so the Sails block's two rows and the Ropes strip's do not share an input id.
5. **The sock tube is drawn from the mouth at every sock height** (at 0 it is M105's whole sock); the sock line starts 0.4 m above the mouth. The sail's mesh is built with the boat and hidden while the sock is down. `gennakerSailGrid` takes an optional `fallbackSide` for a foot angle of exactly 0° or 180°.
6. **Learn's Where is it? on the sail itself** rigs the gennaker if needed and pulls the sock up, because the sail is drawn only with the sock up.
7. **The new sheet stays fully eased for the whole crossing** (`step` holds `applied.gennakerSheet` while `crossS > 0`) and comes in through the lag afterwards, so the clew does not jump at the end of a gybe (independent review).
8. **Browser group time**: the M106 checks take 50 s on this slower machine (the whole `m26` group 275 s here against 73 s recorded in CI), so `ci-times.json` is left as it is; CI's own timing will show whether it needs a new line.

## 9. M107: Gennaker sheets on the winches

**Independent review: required** (the Realistic model's tails and holding).

### 9.1 Files

`content/boat/hanse508.json`, `src/model/realistic.ts`, `src/app/store.ts` (the stage passed to `reduceRealistic`), `src/app/urlState.ts`, `src/ui/realisticPanel.ts`, `src/ui/stationDrawing.ts`, `src/ui/mastDrawing.ts`, `src/ui/exerciseBar.ts`, `src/ui/sailsPanel.ts`, `content/lang/{en,de,no,ru}/ui.json`, `tests/realistic.test.ts`, `scripts/shots-m107.mjs`, `scripts/shots.mjs`, `scripts/ci-plan.mjs`, plus the documents of section 0.

### 9.2 Data

`cockpitHardware.winchLeads` (new, after `jibRollClutch`): lines led straight to a winch, with no clutch.

```json
"winchLeads": {
  "key": "g",
  "minStage": 2,
  "leads": [
    { "slot": 1, "ropeId": "rope_gennaker_sheet_port", "label": "GENNAKER SHEET", "station": "port" },
    { "slot": 2, "ropeId": "rope_gennaker_sheet_starboard", "label": "GENNAKER SHEET", "station": "starboard" }
  ]
}
```

Tail keys are `g1` (port sheet) and `g2` (starboard sheet): a letter and a digit, like the clutch tails' `a5` or `r1`, so the existing key pattern (`WINCH_VALUE` in `urlState.ts`, `/^([a-z]\d+)\.(-?\d)\.([th])$/`) reads them unchanged. No 3D label, no `boatLabels.ts` entry. `BOAT_REFERENCE.md`: the leads are an assumption (the brochure's option has no clutch for the sheets).

### 9.3 Model (`src/model/realistic.ts`)

- `TailSpec` gets `clutch: boolean` (true for every existing tail). `tailSpecs` appends, **after** the existing specs, one spec per lead: `key: 'g' + slot`, `bankId: 'winchLeads'`, `slot`, `label`, `ropeId`, `tail: null`, `station` from the lead (not from `stationOf`, which only knows clutch banks), `winchId` = that station's `winch` in `realisticMode.stations`, `controlId: 'ctl_gennaker_sheet'`, `payOutSign: 1`, `metresPerPct = ropeTravelM(ropeId) / 100`, `clutch: false`.
- `ropeTravelM` for both gennaker sheets (one value; the sides mirror): `|gennakerClew(85) − B| − |gennakerClew(15) − B|` with `B = [sheetBlock.x, sheetBlock.y, sheetBlock.z]` (both on the starboard side; `gennakerClew` imported from `gennaker.ts`) = **12.43 m** (± 0.02; the sheet's travel from fully hauled to fully eased).
- **No clutch = always open**: add and export `isOpen(state: RealisticState, spec: TailSpec): boolean` (`!spec.clutch || state.open[spec.key] === true`) and use it at every read of `.open[...]`: in `realistic.ts` (`grep -n "open\[" src/model/realistic.ts`), and in the UI reads `grep -n "open\[" src/ui/realisticPanel.ts src/ui/exerciseBar.ts src/ui/mastDrawing.ts` (the OPEN sticker and button, the bar's clutch button, `runsFree`), so a lead never reads as closed. `state.open` never stores a lead's key. The clutch action on a lead returns the state unchanged. In `urlState.ts`, `parseRealistic` skips lead keys in `co=` and the writer never writes them; it reads `gn` from the same params and drops a lead on a winch (`wp` / `wsb`) when `gn` is below `minStage`.
- **Stage**: `reduceRealistic(state, action, data = boat, gennakerStage: GennakerStage = 0)` (new last parameter; the store passes `state.gennaker.stage`). Below `winchLeads.minStage` every action on a lead returns `withNotice(state, 'notHere', key)`, as for a tail of another station. `stepRealistic` gets the stage through `rig.gennaker` (below stage 4 `rig.gennaker.set` is false, which is all it needs).
- **Load**: `ropePullN` gets a case for both gennaker sheets: the working tail (`g1` when `rig.gennaker.side === −1`, `g2` when 1) while `rig.gennaker.set` pulls `gennakerSheetLoadN(rig.forces)` (8.3); the other one, and both while not set, pull 0. No `fixedN` entry.
- **Only the working sheet moves the control**: in the grouping of tails by control (`groups()`, from `panelEntries` entries with a `controlId`: both sheets are in the `ctl_gennaker_sheet` entry, one `linked` group), the lazy tail (chosen by side: `g2` when `rig.gennaker.side === −1`, `g1` when 1) is left out of the group's drivers, so it never moves `ctl_gennaker_sheet`; the working tail drives the control even when its load is 0 (a luffing or snuffed sail can still be hauled in). A lazy tail can still be wrapped, tailed and cranked: its drum turns, nothing else changes, no notice.
- From there the existing hold rules apply unchanged: on the winch with turns it holds (PT-16); off the winch, with no clutch, it runs out while the load beats the friction (PT-18's rule for an open clutch), easing `ctl_gennaker_sheet`. As the sail luffs the load falls, so the run-out may stop short of 100: the tests below ask for a rise, not for 100.

### 9.4 URL and UI

- `wp` / `wsb` accept `g1` / `g2` (no change to the pattern); a lead on a winch in a link is dropped when the link's `gn` is below `minStage`. `wsb=g2.3.t` = the starboard gennaker sheet, 3 turns, in the self-tailer.
- **Every UI loop over `tailSpecs()`** (`stationDrawing.ts`, `realisticPanel.ts`, the key help: `grep -n "tailSpecs(" src/ui`) skips the leads while `state.gennaker.stage < minStage`. `createStationDrawing` builds its picture once: it is rebuilt when the stage crosses `minStage` (keyed on `stage ≥ minStage`), the same way it is built today.
- **Stations** (`stationDrawing.ts`, `realisticPanel.ts`): while the stage is ≥ `minStage`, the station's bank drawing gets one more position after its last clutch, for the lead: its tail knob as for a clutch tail (`.real-knob`, `data-drag="tail:g1"` / `"tail:g2"`), its label from the data, and no clutch body, lever or OPEN sticker. Below `minStage` the drawing is exactly today's (the unit width counts the extra position only while it is shown), so older checks without `gn` see no change.
- **Sails block**: in Realistic ropes (`settings.ropesMode === 'realistic'`, read on every render of the block) the sheet row (M106) is replaced by the line `t('gennaker.sheetOnWinch')` "Work the sheet at the winch on its side (Port or Starboard station)."; the sock row and the Gybe button stay. The Ropes list keeps the gennaker sheet's entry in both modes, as it does for the jib sheet.

### 9.5 Tests (`tests/realistic.test.ts`)

- The exact key list (about line 80) gains `'g1', 'g2'` at the end; the loops over every spec (about line 103) and over the specs with a `controlId` (about line 661) pass with the new specs (their `winchId` is the station's winch, `metresPerPct > 0`); `clutch` is false for the two leads and true for the rest.
- `ropeTravelM` for both gennaker sheets is 12.43 (± 0.02).
- At stage 4, side −1, sock up, steady at tws 12, twa 120, `ctl_gennaker_sheet` 25: (a) `g1` off the winch with no hand: the control rises by at least 20 points within 20 s; (b) `g1` on the winch with 3 turns in the self-tailer: the control changes by less than 1 point over 10 s; (c) `g2` (lazy) on its winch, cranked for 5 s: the control is unchanged and its pull is 0.
- A clutch action on `g1` returns the same state; at stage 1 an action on `g1` sets the notice `notHere`; `wsb=g2.3.t` with `gn=4` round-trips, with `gn=1` it is dropped.

### 9.6 Browser checks (`scripts/shots-m107.mjs`, joins group `m33`, test clock)

`GROUP_ALIASES` `m107: 'm33'`; the plain `m33` entry becomes `m33: members(['m33', () => liveM33Checks(live)], ['m107', () => liveM107Checks(onTestClock)])`. `m33` recorded 76 s; expected addition 40 s; over 114 s update `ci-times.json`, over 120 s name it in `ci-budget.json`. Live (phone): `?mode=realistic&st=port&wd=120&ws=12&ms=60&jf=0&gn=4&gx=p&gu=100&gs=25&sea=flat&cam=helm` (wind over starboard: the port sheet works): `[data-drag="tail:g1"]` is shown and its position has no clutch lever; after 5 s app time `gennaker-trim` reads the luffing text (the sheet ran out); put `g1` on the winch with three turns and into the self-tailer, then crank, with the same gestures `scripts/shots-m4b.mjs` uses for the jib sheet (touch where it uses touch): the trim reaches "Drawing well".

### 9.7 Older checks, done when

`tests/realistic.test.ts` as in 9.5; `grep -n "tail:\|data-key\|real-knob" scripts/shots-m4b.mjs scripts/shots-m4c.mjs scripts/shots-m82.mjs` for positions or counts of a station's tails (unchanged without `gn`). **PR line:** `CI groups: all` (the store and the URL state change). PR: `Closes #248`. Done when 9.5 and 9.6 pass and every Realistic test and the groups named stay green. Not in this milestone: a clutch for the gennaker sheets; the tack line or the sock line on a winch; Realistic versions of the exercises.

## 10. M108: Gennaker exercises

**Independent review: required** (the handling order it teaches).

### 10.1 Files

`content/exercises/exercises.json`, `content/lang/{en,de,no,ru}/exercises.json`, `content/lang/{en,de,no,ru}/ui.json`, `src/model/exercises.ts`, `src/app/exerciseRun.ts` (`LoggedAction`, `loggedActions()`, `merge()`), `src/app/exerciseBar.ts`, `src/ui/exerciseBar.ts`, `src/ui/exerciseDebrief.ts` (the debrief's switch over `LoggedAction`), `src/app/exercisePilots.ts`, `tests/exercises.test.ts`, `tests/exercisePilots.test.ts`, `scripts/shots-m108.mjs`, `scripts/shots.mjs`, `scripts/ci-plan.mjs`, `docs/EXERCISES.md` (a row per exercise in its catalogue table, in the Sails group, in the existing columns), plus the documents of section 0. Needs M106 merged (not M107).

### 10.2 Model and bar

- `ExerciseCheck` gets `gennakerStage?: Range` and `gennakerTrim?: readonly GennakerTrimState[]`. `CheckSource` gets an optional `gennaker?: { stage: GennakerStage; trim: GennakerTrimState }` (built from `state.gennaker` and `gennakerTrimState(state.gennaker, state.rig.gennaker)` in the function that builds a `CheckSource` from the `AppState`: `grep -n "CheckSource" src/app`; absent in hand-built test sources, where a check naming these fields fails). `checkPasses` checks them like the other fields. `tests/exercises.test.ts`: `FIELDS` adds both; `checkProblems` validates `gennakerStage` as a range and `gennakerTrim` against the list of `GennakerTrimState`s.
- **Target rows** (`TargetRow`, `checkTargets`, `targetReading`): `gennakerStage` shows `t('exercise.target.gennakerStage')` "Gennaker: step {now} of 4"; `gennakerTrim` shows `t('exercise.target.gennakerTrim')` "Gennaker: {state}" with the state's `gennaker.trim.*` text (`stowed` reads `t('exercise.target.gennakerStowed')` "stowed").
- **Bar rows**: `gennaker:steps` (the current step's line from `gennaker.step<n>`, and the buttons `bar-gennaker-back` / `bar-gennaker-next` with the strings `gennaker.back` / `gennaker.next`) and `gennaker:gybe` (button `bar-gennaker-gybe`, `gennaker.gybe`); both in `PLAIN_ROWS`; `barRowOf` maps the `gennaker` action to them (`gybe` → `gennaker:gybe`, the rest → `gennaker:steps`). `LoggedAction` gets the `gennaker` action, with debrief strings `debrief.gennaker.next` "Gennaker: next step", `.back` "Gennaker: undo a step", `.gybe` "Gennaker: gybed", `.rig` "Gennaker: rigged", `.stow` "Gennaker: stowed". The gennaker's controls use the existing `control:ctl_gennaker_sheet` / `control:ctl_gennaker_sock` rows.

### 10.3 Data (`content/exercises/exercises.json`, group `sails`, `ropes: "easy"`, `crew: false`, `sections: ["ropes", "sails", "autopilot", "conditions", "learn"]`)

`twaDeg` in a check is the angle off the wind without its sign (`checkPasses` compares `|twa|`); the side is `tack` (`starboard` = wind over starboard). `opens`: `sails` for gennaker steps, `ropes` for a control row, `autopilot` for turns.

**`gennaker-rig`**: start `?wd=0&ws=12&hdg=240&ms=60&js=50&ap=wind&apt=120&sea=flat` (wind over starboard, a broad reach, jib out); `feelIt: ["sail_gennaker", "rope_gennaker_tack_line", "part_gennaker_sock"]`.

| step id | opens | check | holdS | bar |
|---|---|---|---|---|
| `tack-line` | sails | `gennakerStage [1, 4]` | 0 | `gennaker:steps` |
| `sheets` | sails | `gennakerStage [2, 4]` | 0 | `gennaker:steps` |
| `halyard` | sails | `gennakerStage [3, 4]` | 0 | `gennaker:steps` |
| `furl-jib` | ropes | `jibOutPct [0, 5]` | 0 | `control:ctl_jib_furl` |
| `hoist` | sails | `gennakerStage [4, 4]` | 0 | `gennaker:steps` |
| `sock-up` | sails | `controls { ctl_gennaker_sock: [95, 100] }` | 0 | `control:ctl_gennaker_sock` |
| `trim` | sails | `gennakerTrim ["good"]`, `tack "starboard"` | 5 | `control:ctl_gennaker_sheet` |

Mistakes: `jib-still-out` (not serious, `steps: ["hoist", "sock-up", "trim"]`) `{ condition: { gennakerStage: [4, 4], jibOutPct: [20, 100] }, forS: 1 }`; `overpowered` and `round-up` copied from `gusts`.

**`gennaker-gybe`**: start `?wd=0&ws=12&hdg=225&ms=70&jf=0&gn=4&gx=p&gu=100&gs=40&ap=wind&apt=135&sea=flat` (wind over starboard at 135°, gennaker set to port; at 135° true the apparent angle is near 90°, where sheet 40 gives an angle of attack near 22°, well inside `good`); `feelIt: ["term_lazy_sheet"]`.

| step id | opens | check | holdS | bar |
|---|---|---|---|---|
| `bear-away` | autopilot | `twaDeg [160, 175]`, `tack "starboard"` | 2 | `autopilot:turn` |
| `haul-main` | ropes | `boomDeg [0, 16]`, `tack "starboard"` | 2 | `control:ctl_mainsheet` |
| `gybe-main` | autopilot | `event "controlledGybe"`, `tack "port"`, `twaDeg [150, 175]` | 2 | `autopilot:tack` |
| `gybe-gennaker` | sails | `gennakerTrim ["luffing", "good", "stalled", "blanketed"]`, `tack "port"` | 0 | `gennaker:gybe` |
| `come-up` | autopilot | `twaDeg [125, 145]`, `tack "port"`, `gennakerTrim ["good"]` | 5 | `autopilot:turn`, `control:ctl_mainsheet`, `control:ctl_gennaker_sheet` |

(The autopilot's Tack button reads Gybe on a run, as in `gybing`.) Mistakes: `backed` (not serious, `steps: ["gybe-gennaker", "come-up"]`) `{ condition: { gennakerTrim: ["backed"] }, forS: 10 }`; `accidental-gybe` as in `gybing` with `steps: ["bear-away", "haul-main", "gybe-main"]`.

**`gennaker-douse`**: start `?wd=0&ws=12&hdg=240&ms=60&jf=0&gn=4&gx=p&gu=100&gs=30&ap=wind&apt=120&sea=flat`; `feelIt: ["rope_gennaker_sock_line"]`.

| step id | opens | check | holdS | bar |
|---|---|---|---|---|
| `bear-away` | autopilot | `twaDeg [170, 180]`, `gennakerTrim ["blanketed"]` | 2 | `autopilot:turn` |
| `ease` | ropes | `controls { ctl_gennaker_sheet: [70, 100] }` | 0 | `control:ctl_gennaker_sheet` |
| `sock-down` | sails | `controls { ctl_gennaker_sock: [0, 2] }` | 0 | `control:ctl_gennaker_sock` |
| `lower` | sails | `gennakerStage [0, 0]` | 0 | `gennaker:steps` |
| `jib-out` | ropes | `jibOutPct [95, 100]` | 2 | `control:ctl_jib_furl` |

The main hides the gennaker only close to dead downwind: by the formulas of 8.3, at 12 kn true wind a true angle of 170° gives an apparent angle near 160° and the trim `blanketed`, while 165° true still leaves it drawing (apparent near 151°). Mistakes: `douse-in-wind` (not serious, `steps: ["ease", "sock-down"]`) `{ condition: { gennakerTrim: ["good", "luffing", "stalled"], controls: { ctl_gennaker_sock: [1, 90] } }, forS: 2 }` (pulling the sock down while the sail still has wind); `accidental-gybe` as in `gybing` with `steps: ["bear-away", "ease", "sock-down", "lower"]`.

**Texts** (`content/lang/en/exercises.json`, the shape of `gybing`'s: `title`, `summary`, `see`, `happening`, `action`, `mistake`, `done`, each step `{ goal, how }`, each mistake `{ name, what, why, fix }`). Final English below: `title`, `summary`, each step's `goal` and each mistake's `name`. The builder writes the other fields in `gybing`'s style from the facts of this section and sections 7–8 only, and records them as decided in the PR.

- `gennaker-rig`: title "Rig and hoist the gennaker"; summary "Rig the gennaker step by step, in the order a crew does it at the bow, then set and trim it on a broad reach."; goals "Take the bag to the bow and clip the tack line to the gennaker's tack." / "Lead both sheets outside everything (shrouds, stanchions, lifelines) to the blocks at the stern." / "Clip the halyard to the head, in front of the forestay." / "Roll the jib away: it would take the gennaker's wind." / "Hoist the gennaker in its sock." / "Pull the sock up: the sail opens." / "Ease the sheet until the front edge starts to curl, then trim a little and hold it there."; mistake `jib-still-out` "The jib was still out with the gennaker up".
- `gennaker-gybe`: title "Gybe the gennaker"; summary "Turn from one broad reach to the other with the gennaker up: the boat gybes, then the gennaker goes round the front to the new side."; goals "Bear away towards a run." / "Trim the main until the boom is near the centre." / "Gybe: turn the stern through the wind." / "Gybe the gennaker: the new sheet takes over and the sail goes round the front." / "Come up to a broad reach on the new side, ease the main and trim the gennaker."; mistake `backed` "The gennaker stayed on the wrong side".
- `gennaker-douse`: title "Take the gennaker down"; summary "Bring it down behind the main, where it has no wind, and put it away in its bag."; goals "Bear away until the main hides the gennaker." / "Ease the sheet." / "Pull the sock down over the sail." / "Lower it and unclip everything, in the reverse order." / "Unroll the jib."; mistake `douse-in-wind` "The sock came down while the sail still had wind".

### 10.4 Pilots (`src/app/exercisePilots.ts`, one function and one `pilotFor` case per id)

The autopilot's turns are relative (`turns(s, n, deg)`, `ap(s, { turnDeg })`; in wind mode the new target is `wrap180(target − turnDeg)`), so a turn that moves the target from +135 to +165, or from −165 to −135, is `turns(x, 3, −10)`. Each step's action is done once (`onceMaker`, as `gybingPilot`).

- `gennaker-rig`: steps 0, 1, 2 and 4 dispatch `{ type: 'gennaker', command: 'next' }`; step 3 sets `ctl_jib_furl` 0; step 5 `ctl_gennaker_sock` 100; step 6 `ctl_gennaker_sheet` 25.
- `gennaker-gybe`: step 0 `turns(x, 3, −10)` (to 165); step 1 `ctl_mainsheet` 5; step 2 `ap(x, 'tack')` (as `gybingPilot`); step 3 the gybe action with `rig.gennaker.phiDeg`; step 4 `turns(x, 3, −10)` (to −135), `ctl_mainsheet` 70, `ctl_gennaker_sheet` 40.
- `gennaker-douse`: step 0 `turns(x, 10, −5)` (+120 to +170); step 1 `ctl_gennaker_sheet` 100; step 2 `ctl_gennaker_sock` 0; step 3 four `back` commands, one per frame (a counter in the pilot's closure: `onceMaker` fires once per key); step 4 `ctl_jib_furl` 100.
- `tests/exercisePilots.test.ts`: each good run passes every step with no mistake; its per-step time limits are measured and set by the file's existing rule (`ceil(1.2 × measured + 3)`), as for every other exercise.

### 10.5 Browser checks (`scripts/shots-m108.mjs`, joins group `m103`, test clock)

`GROUP_ALIASES` `m108: 'm103'`; the plain `m103` entry becomes `m103: members(['m103', () => liveM103Checks(onTestClock)], ['m108', () => liveM108Checks(onTestClock)])`. `m103` recorded 56 s; expected addition 60 s (three Watch runs at ×16, phone size, English only); over 84 s update `ci-times.json`, over 120 s name it in `ci-budget.json` with the reason. Live (phone): each exercise's Watch run reaches its done card; in `gennaker-rig`, Do it myself: the bar shows `bar-gennaker-next`; a touch tap ticks the first step.

### 10.6 Older checks, done when

`tests/exerciseListIds.test.ts` follows `EXERCISES.length` (19 → 22); `grep -n "exercise-item\|exerciseItemTestIds" scripts/shots-m*.mjs` for checks of the Sails group's list. **PR line:** `CI groups: m66, m103`. PR: `Closes #249`. Done when the three Watch runs and the pilot tests pass. Not in this milestone: Realistic-rope versions of the exercises.

## 11. M109: Spinnaker and code 0 pictures

**Independent review: required** (new state and URL key; what the pictures teach).

### 11.1 Files

`content/boat/hanse508.json` (`pictures`), `content/registry/parts.json`, glossaries and `ui.json` (×4), `src/model/pictures.ts` (new), `src/model/glossary.ts`, `src/model/sailShape.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/render3d/pictures.ts` (new), `src/render3d/boat/index.ts`, `src/ui/pictureBanner.ts` (new), `src/ui/learnTab.ts`, `src/app/app.ts`, `tests/glossary.test.ts`, `tests/pictures.test.ts` (new), `tests/physicsTruthsRigging.test.ts`, `scripts/shots-m109.mjs`, `scripts/shots.mjs`, `scripts/ci-plan.mjs`, `docs/CODE_MAP.md`, `docs/BOAT_REFERENCE.md`.

### 11.2 Data (`pictures`, new top-level key of the boat file; assumptions)

```json
"pictures": {
  "spinnaker": {
    "poleHeel": [0.2, 3.2, 0.0], "poleLengthM": 5.85, "poleRadiusM": 0.04, "poleMinDeg": 10, "poleMaxDeg": 85,
    "clewExtraDeg": 30, "clewY": 3.2, "head": [0.35, 21.0, 0.0],
    "poleLiftFrom": [0.2, 12.0, 0.0], "downhaulTo": [1.5, 1.62, 0.0], "camberRatio": 0.25
  },
  "codeZero": { "tack": [6.95, 2.10, 0.0], "head": [0.35, 21.0, 0.0], "footM": 7.5, "phiDeg": 12, "clewY": 2.6, "drumRadiusM": 0.12, "drumLengthM": 0.25, "camberRatio": 0.08 }
}
```

`poleLengthM` is the manual's spinnaker pole (`dimensions.rigDimensionsMm.spinnakerPole` 5850); the rest are assumptions, recorded in `BOAT_REFERENCE.md` under a new "Pictures (M109)" heading. The code 0's tack sits on the bow roller's tip like the gennaker's, lower (its luff is held by its own furler's cable, no stay is drawn).

### 11.3 Model (`src/model/pictures.ts`, pure)

```ts
export type PictureId = 'spinnaker' | 'code0'; // M110 adds 'traveller'
export function polePlanDeg(awaDeg: number, data?: BoatData): number; // clamp(|awa| − 90, poleMinDeg, poleMaxDeg)
export interface SpinnakerPicture { side: 1 | -1; poleEnd: Vec3; head: Vec3; clew: Vec3; sheet: Vec3[]; guy: Vec3[]; poleLift: Vec3[]; downhaul: Vec3[] }
export function spinnakerPicture(awaDeg: number, data?: BoatData): SpinnakerPicture;
export interface CodeZeroPicture { side: 1 | -1; tack: Vec3; head: Vec3; clew: Vec3; sheet: Vec3[] }
export function codeZeroPicture(awaDeg: number, data?: BoatData): CodeZeroPicture;
```

- **Spinnaker**: `s = −leewardSide(awa)` (the **windward** side: the pole goes to windward), ψ = `polePlanDeg(awa)` (at right angles to the apparent wind: `|awa| − 90`, so nearly square to the boat on a dead run, where the clamp stops it at 85° short of the shrouds, and further forward on a reach). `poleEnd = poleHeel + L · (cos ψ, 0, s · sin ψ)` (the tack is at the pole's outer end). `clew = [poleHeel.x + L · cos(ψ + clewExtraDeg), clewY, −s · L · sin(ψ + clewExtraDeg)]`. `sheet = [clew, ...sheetLead(−s)]`, `guy = [poleEnd, ...sheetLead(s)]` (outside everything, as the gennaker's; the guy runs from the tack through the pole's outer end), `poleLift = [poleLiftFrom, poleEnd]`, `downhaul = [poleEnd, downhaulTo]`. The variable names `s` here and in the code 0 below are local: the spinnaker's is the windward side, the code 0's the leeward side.
- **Code 0**: `s = leewardSide(awa)`; `clew = tack + footM · (−cos φ, 0, s · sin φ)` with y set to `clewY`; `sheet = [clew, ...sheetLead(s)]`.

### 11.4 Store, URL

`AppState.picture: PictureId | null` (initial null in the default state; `reset` and every `load` without `pic` clear it, because `load` takes the parsed state whole). Action `setPicture`. URL `pic` = `spinnaker` / `code0`, written in `serializeUrlState` while set; anything else → null. While a picture is set nothing in the model changes; the links hold the boat still with `held=1`, and closing the picture leaves the boat as the link set it (still held). The picture follows the live `rig.wind.awaDeg` (with a held boat in a steady wind it does not move).

### 11.5 3D and UI

- **Wiring**: `BoatModel.update(…)` gets a new last parameter `view: { picture: PictureId | null }` (an options object M110 extends), passed by `scene.ts` from `state.picture`.
- `src/render3d/pictures.ts`: `buildPictures(materials, detail): { objects: THREE.Object3D[]; update(picture: PictureId | null, awaDeg: number): void }`; `boat/index.ts` adds `objects` to the boat's root (so the spotlight finds the meshes) and calls `update` each frame with `view.picture`; the geometry is rebuilt only when the picture or `Math.round(awaDeg)` changed. Meshes (ids written as literals in this file, section 4): the spinnaker sail `sail_spinnaker` and the code 0 sail `sail_code_zero` with `buildSailMesh` and `materials.sail`, from a new export of `sailShape.ts`, `pictureSailGrid(corners: SailCorners, side: 1 | -1, camberRatio: number, data)` = the private `sailGrid` with those corners, `twistDeg 0`, `fill 1`, `windSpeedKn 0`, `timeS 0` and that `camberRatio` (the optional `SailGridInput.camberRatio` M106 adds) (the spinnaker: corners `{ tack: poleEnd, head, clew }`, `side = −s`; the code 0: `{ tack, head, clew }`, `side = s`); the pole `part_spinnaker_pole` (a cylinder of `poleRadiusM`, the boom's material from `rig.ts`); the drum `part_code_zero_furler` (a vertical cylinder of `drumRadiusM` × `drumLengthM` centred on the code 0's tack, the same material); the ropes as tubes of `visual.ropeRenderRadius` along their points in the gennaker colour: `rope_spinnaker_sheet`, `rope_spinnaker_guy`, `rope_pole_lift`, `rope_pole_downhaul`, `rope_code_zero_sheet`. Only the meshes of the picture shown are visible. While any picture shows, the gennaker's meshes and ropes are hidden; the main and the jib are drawn as the link sets them (the links furl the jib and set the main).
- `src/ui/pictureBanner.ts`: `createPictureBanner(store): HTMLElement`; `app.ts` appends it to `layout.view`, as `infoCard.ts` appends the info card, and it takes the info card's place on each layout (`.info-area` in `style.css`: just above the chip row on a phone, at the top of the view in the side layout); the show-me links carry no `sel`, so the info card is closed while a picture shows. `data-testid="picture-banner"`, `role="status"`: text `t('picture.<id>')` and a button `data-testid="picture-close"` `t('picture.close')` (at least 44 px) that dispatches `setPicture null`. Hidden when no picture. In the style of the info card (its colours, radius and shadow). On a phone it must not cover the sail in the links' camera (checked in 11.8).
- `src/model/glossary.ts` (after `FAR_AWAY`): `PICTURE_ONLY = new Set(['sail_spinnaker', 'part_spinnaker_pole', 'rope_spinnaker_sheet', 'rope_spinnaker_guy', 'rope_pole_lift', 'rope_pole_downhaul', 'sail_code_zero', 'part_code_zero_furler', 'rope_code_zero_sheet'])`; `learnTab.ts`: the "Where is it?" condition also requires `!PICTURE_ONLY.has(entry.id)`. Their "Show it working" link sets the picture; the spotlight call that follows runs before the picture's meshes are built, finds none and ends as it does today (accepted: the picture itself is what is shown; no change to the spotlight).

### 11.6 Strings, registry, Learn

Registry (`"phase": 109, "status": "draft", "sources": ["wiki:spinnaker"]`, with `"wiki:spinnaker": "https://en.wikipedia.org/wiki/Spinnaker"` added to `sourceKeys`, as the existing `wiki:jibe`): `sail_spinnaker` (sail, sails), `part_spinnaker_pole` (part, rig), `rope_spinnaker_sheet`, `rope_spinnaker_guy`, `rope_pole_lift`, `rope_pole_downhaul`, `rope_code_zero_sheet` (rope, ropes), `sail_code_zero` (sail, sails), `part_code_zero_furler` (part, rig), `term_downwind_sails` (term, sailing). `related`: the spinnaker's five ids each other plus `term_downwind_sails`; the code 0's three each other plus `term_downwind_sails`; `term_downwind_sails`: `sail_gennaker`, `sail_spinnaker`, `sail_code_zero`. Show-me links (no `sel`): the spinnaker's ids and `term_downwind_sails` `?pic=spinnaker&wd=150&ws=12&ms=100&jf=0&held=1&sea=flat&cam=side-starboard`; the code 0's ids `?pic=code0&wd=70&ws=10&ms=40&jf=0&held=1&sea=flat&cam=side-port`.

English glossary (final): `sail_spinnaker` "Spinnaker (symmetric)", short "A big, balloon-like sail for running and broad reaching, set on a pole; not on this boat.", what "Both edges are the same length and either can lead. Its windward corner (the tack) sits at the end of a pole that sticks out from the mast on the side the wind comes from; the corner on the other side (the clew) is trimmed with the sheet. The pole is set at about right angles to the wind you feel; moving it aft as you turn downwind is what the guy does." `part_spinnaker_pole`: "Spinnaker pole", short "Holds the spinnaker's tack out to windward.", what "A pole clipped to a ring on the front of the mast at one end; the guy runs through the jaw at its other end. A pole lift (topping lift) holds it up and a downhaul holds it down. This boat's manual gives 5.85 m for its pole." `rope_spinnaker_guy`: "Guy", short "The windward sheet of a symmetric spinnaker: it sets the pole's angle.", what "It runs from the tack through the end of the pole, back to a block at the stern and a winch. Pulling it brings the pole aft; easing it lets the pole go forward." `rope_spinnaker_sheet`: "Spinnaker sheet", short "The leeward sheet: trims the spinnaker's clew.", what "Like a jib sheet, on the side away from the wind; after a gybe the guy and the sheet swap jobs." `rope_pole_lift`: "Pole lift", alternatives ["Topping lift (pole)", "Uphaul"], short "Holds the spinnaker pole up.", what "A line from the mast down to the outer end of the pole, so the pole stays level with the clew." `rope_pole_downhaul`: "Pole downhaul", alternatives ["Foreguy"], short "Holds the spinnaker pole down.", what "From the outer end of the pole down to the deck, so the sail cannot lift the pole." `sail_code_zero`: "Code 0", short "A flat, light sail for close reaching, rolled on its own furler; not on this boat.", what "Flatter than a gennaker and set on its own furler at the bow, so it is unrolled and rolled away like a jib. It is for light wind from ahead of the beam to a beam reach, where a gennaker would only flap." `part_code_zero_furler`: "Code 0 furler", short "The drum the code 0 rolls up on.", what "A drum at the bow with its own line; the sail's luff has a cable inside that turns with the drum." `rope_code_zero_sheet`: "Code 0 sheet", short "Trims the code 0.", what "Led like the gennaker's sheet, outside everything to a block at the stern." `term_downwind_sails`: "Downwind sails", short "The gennaker, the spinnaker and the code 0 compared.", what "A gennaker (asymmetric spinnaker) is tacked at the bow and needs no pole: easy for a small crew, best on a broad reach. A symmetric spinnaker flies on a pole to windward: best deep downwind, more lines and more work (guy, sheet, pole lift, downhaul). A code 0 is flat and on a furler: for light wind closer to the wind than a gennaker can go. This boat's option is the gennaker." Each "not on this boat" entry's `onThisBoat`: "Not on this boat: shown as a picture only (Show it working)."

`ui.json`: `picture.spinnaker` "Picture: a symmetric spinnaker, not on this boat."; `picture.code0` "Picture: a code 0, not on this boat."; `picture.close` "Close picture".

`tests/glossary.test.ts` group sizes after M109: `[18, 13, 15, 9, 20, 22, 13, 14, 34, 10, 20]`.

### 11.7 Tests

`tests/physicsTruthsRigging.test.ts`: "PT-71 the pole goes to windward at right angles to the apparent wind": `polePlanDeg(180) = 85` (clamped; 90 without the clamp is beyond `poleMaxDeg`), `polePlanDeg(130) = 40`, `polePlanDeg(95) = 10`; `spinnakerPicture(150).poleEnd.z > 0` and `spinnakerPicture(−150).poleEnd.z < 0` (wind over starboard: pole to starboard), the clew on the other side; the guy starts at `poleEnd` and ends at the windward winch. "PT-73 the code 0 is a close-reaching sail": `codeZeroPicture(70).clew.z < 0` and `codeZeroPicture(−70).clew.z > 0` (the clew to leeward). `tests/pictures.test.ts`: `pic` round-trips, a bad value is null, `load` without `pic` clears it; the pole's length from heel to end is 5.85 (± 1e-9).

### 11.8 Browser checks (`scripts/shots-m109.mjs`, joins group `m101`, test clock)

`GROUP_ALIASES` `m109: 'm101'`; the plain `m101` entry becomes `m101: members(['m101', () => liveM101Checks(onTestClock)], ['m109', () => liveM109Checks(onTestClock)])`. `m101` recorded 50 s; expected addition 45 s; over 75 s update `ci-times.json`. Scenes (`M109_SCENES`, phone and desktop, `sheet: 'peek'`, registered as `m109-<name>`): `spinnaker` and `code0`, the two show-me links. Live (phone, `debug=1`): open `?m=learn&learn=sail_spinnaker`; `learn-show-on-boat` is absent; tap `learn-show-me` (touch); `waitForLink` until `pic=spinnaker`; `picture-banner` is visible; `__sailDebug.partVisible('sail_spinnaker')` true and `partVisible('part_gennaker_sock')` false; the banner's page bounding box does not contain the point `__sailDebug.partPoint('sail_spinnaker', 0.5)` (canvas pixels) plus the canvas's page offset; tap `picture-close` (touch): the banner is hidden and `pic` leaves the link.

### 11.9 Older checks, done when

`tests/glossary.test.ts` group sizes; `grep -n "learn-show-on-boat" scripts/shots-m*.mjs` (unchanged for other entries). **PR line:** `CI groups: all` (store and URL). PR: `Closes #250`. Not in this milestone: sailing with either sail; the traveller (M110).

## 12. M110: Main traveller picture

**Independent review: required** (new store state, action and URL key; it overrides the drawn boom).

### 12.1 Files

`content/boat/hanse508.json` (`pictures.traveller`), `content/registry/parts.json`, `content/lang/{en,de,no,ru}/glossary.json` and `ui.json`, `src/model/pictures.ts`, `src/model/glossary.ts` (`PICTURE_ONLY`), `src/app/store.ts`, `src/app/urlState.ts`, `src/render3d/pictures.ts`, `src/render3d/boat/index.ts`, `src/render3d/scene.ts`, `src/ui/pictureBanner.ts`, `tests/pictures.test.ts`, `tests/physicsTruthsRigging.test.ts`, `tests/glossary.test.ts`, `scripts/shots-m110.mjs`, `scripts/shots.mjs`, `scripts/ci-plan.mjs`, plus the documents of section 0.

### 12.2 Data and model

`pictures.traveller`: `{ "halfLengthM": 0.9, "carSizeM": 0.12, "trackSectionM": [0.04, 0.03] }` (assumptions; `halfLengthM` **tunable** down if the track overhangs the coachroof's aft end in the PNGs, recorded in the PR). The track lies across the boat at `trackX = rig.boom.gooseneck[0] − rig.mainsheet.boomDistance` (−3.125: under the boom's sheet blocks when the boom is on the centreline) and `trackY = rig.mainsheet.deckBlocks.y` (1.98, the coachroof's aft end, where this boat's mainsheet deck blocks are). `PictureId` adds `'traveller'`.

```ts
export interface TravellerPicture { car: Vec3; boomDeg: number; boomPoint: Vec3; sheetLengthM: number }
export function travellerPicture(carPct: number, data?: BoatData): TravellerPicture;
```

- `z = clamp(carPct, −100, 100) / 100 · halfLengthM`; `car = [trackX, trackY, z]`.
- `boomDeg = asin(z / r) / DEG`, `r = rig.mainsheet.boomDistance` (+ = boom to starboard): the boom swings until its sheet point is over the car across the boat. The picture holds the boom level (pitch 0).
- `boomPoint = [g.x − r · cos(boomDeg), g.y, r · sin(boomDeg)]` with `g = rig.boom.gooseneck` (its z equals the car's).
- `sheetLengthM = |boomPoint − car|` (the tackle leans fore and aft by at most `r · (1 − cos boomDeg)` = 0.14 m at the track's ends).

### 12.3 Store, URL, 3D, UI

- **State**: `AppState.travellerCarPct: number` (initial 0). Action `{ type: 'setTravellerCar'; pct: number }`: rounds to an integer and clamps to −100…100. `setPicture` (any value) and `reset` set it to 0.
- **URL** `tv`: an integer −100…100 (`/^-?\d+$/`), read only together with `pic=traveller`, written only while the picture is `traveller` and the value ≠ 0; anything else → 0.
- **3D** (`src/render3d/pictures.ts`): the track `part_traveller_track` (a box `2 · halfLengthM` across the boat with section `trackSectionM`, on `trackY`), the car `part_traveller_car` (a cube of `carSizeM` at `car`), the sheet `rope_traveller_mainsheet` (one tube of `visual.ropeRenderRadius` from the car's top to `boomPoint`, in the mainsheet colour; the tackle's separate parts are not drawn). While the traveller picture shows, `rope_mainsheet` (every strand) and `fit_mainsheet_deck_blocks` are hidden; `fit_mainsheet_boom_blocks` stays (the tackle's upper end).
- **The boom**: M109's `view` object gets `boomYawDeg: number | null`; `scene.ts` sets it to `state.picture === 'traveller' ? travellerPicture(state.travellerCarPct).boomDeg : null`. When it is not null, the update draws from a copy of the rig with `theta: { value: boomYawDeg, velocity: 0 }` and `psi: { value: 0, velocity: 0 }` (the Springs `drawnPose` and `mainSailInputFor` read), so the boom, the mainsail, the vang and the boom's ropes follow together; `rig.solution` and `rig.applied` stay. The model's own rig is not changed; the 3D labels, the danger zone and the telltales keep using it (accepted for a still picture). The hidden mainsheet: the drawings are filtered before `ropes.update`, and `boatModel.ropeDrawings()` returns the filtered list.
- **Banner** (M109's `pictureBanner.ts`): text `t('picture.traveller')`, and while the traveller shows, a native range input `data-testid="traveller-car"` (−100…100, step 5, at least 44 px tall, label `t('picture.travellerCar')`) that dispatches `setTravellerCar` on `input`.

### 12.4 Strings and registry

Registry (`"phase": 110, "status": "draft", "sources": ["wiki:traveller"]`, with `"wiki:traveller": "https://en.wikipedia.org/wiki/Traveller_(nautical_fitting)"` added to `sourceKeys`): `part_traveller_track` and `part_traveller_car` (kind part, group `deck`, related each other, `rope_traveller_mainsheet`, `rope_mainsheet`), `rope_traveller_mainsheet` (kind rope, group `ropes`, related `part_traveller_car`, `rope_mainsheet`); all three in `PICTURE_ONLY`. Each entry's `showMe`: `?pic=traveller&tv=-60&wd=60&ws=10&ms=30&jf=0&held=1&sea=flat&cam=top` (wind over starboard; the car 60 % to port, the leeward side, so the boom is out to port).

English glossary (final): `part_traveller_track`: name "Traveller", short "A track across the boat that the mainsheet's lower block slides on; not on this boat.", what "Many boats have a track across the cockpit or the coachroof with a car on it; the mainsheet runs from the car up to the boom. Sliding the car to leeward lets the boom out; sliding it back towards the middle brings the boom in, and the sheet's pull on the sail stays the same. So the car sets the boom's angle and the sheet sets how tight the back edge of the sail is. This boat has a German mainsheet instead: two blocks on the coachroof and both ends led to the cockpit, so the sheet does both jobs at once.", onThisBoat "Not on this boat: shown as a picture only (Show it working)." `part_traveller_car`: name "Traveller car", short "The car that slides on the traveller track; the mainsheet's lower block is on it.", onThisBoat as the track's. `rope_traveller_mainsheet`: name "Mainsheet (on a traveller)", short "On a boat with a traveller, the mainsheet runs from the car up to the boom.", onThisBoat as the track's. `ui.json`: `picture.traveller` "Picture: a mainsheet traveller, not on this boat."; `picture.travellerCar` "Car". `tests/glossary.test.ts` group sizes after M110: `[19, 13, 15, 9, 22, 22, 13, 14, 34, 10, 20]`.

### 12.5 Tests

- `tests/physicsTruthsRigging.test.ts`, "PT-72 the car sets the boom's angle; the sheet's length hardly changes": `travellerPicture(0).boomDeg = 0`; `travellerPicture(100).boomDeg = 17.92` (± 0.01; asin(0.9 / 2.925)) and `travellerPicture(−100).boomDeg = −17.92`; `boomPoint.z` equals `car.z` (± 1e-9) at −100, −60, 0, 60, 100; the largest and smallest `sheetLengthM` over those five differ by less than 1 % of the smallest.
- `tests/pictures.test.ts`: `?pic=traveller&tv=-60` round-trips; `?tv=40` without `pic` gives 0 and is not written; `tv=12.5` and `tv=200` give 0; `setTravellerCar` with 63.4 gives 63 and with −300 gives −100; `setPicture(null)` resets it to 0.

### 12.6 Browser checks (`scripts/shots-m110.mjs`, joins group `m17`, test clock)

`GROUP_ALIASES` `m110: 'm17'`; `m17` is a plain entry today: make it `m17: members(['m17', () => liveM17Checks(live)], ['m110', () => liveM110Checks(onTestClock)])` (`onTestClock` is the runner the `m101` and `m103` entries already pass). `m17` recorded 72 s; expected addition 30 s; update `.github/ci-times.json` if the measured time exceeds 108 s (half again) and report it either way. Scene `traveller` (phone and desktop, `sheet: 'peek'`): the `showMe` link. Live (phone): open the `showMe` link with `debug=1`; `picture-banner` and `traveller-car` visible; `__sailDebug.partVisible('rope_mainsheet')` false (the hook M105 adds), `partVisible('part_traveller_car')` true; the boom's box `__sailDebug.partBox('part_boom')` (boat coordinates) has its z centre < 0 (boom to port); set the slider to 60 with `locator.evaluate((el) => { el.value = '60'; el.dispatchEvent(new Event('input', { bubbles: true })); })` and wait with `waitForLink` (`scripts/ui.mjs`) for `tv=60`: the box's z centre > 0; tap `picture-close` (touch): `pic` and `tv` leave the link and `partVisible('rope_mainsheet')` is true.

### 12.7 Older checks, done when

`tests/glossary.test.ts` group sizes (12.4). **PR line:** `CI groups: all` (store and URL state). PR: `Closes #251`, `Closes #232`. Done when 12.5 and 12.6 pass and `npm run check` and CI are green. Not in this milestone: a traveller you can sail with; the tackle's separate parts and blocks.

## 13. Owner's answers and decisions

### 13.1 Owner's answers (planning chat, 2026-11-18: "Accept all")

1. The gennaker can be **sailed**, not only shown: it is this boat's real option.
2. It is set and taken down with a **sock** (snuffer), not a top-down furler.
3. **Settings → Gennaker: Stowed / Rigged**, stowed by default and kept in the link, so old links and exercises are unchanged.
4. **Both rope modes**: the sheets are in the Ropes list, and in Realistic ropes they go on the aft winches.
5. The symmetric spinnaker is a **labelled picture**, not sailable.
6. The traveller is a **picture with a slider**, not a second mainsheet setup.

### 13.2 Decided in planning (recommended; merging accepts it)

1. **Six milestones, not five.** Realistic winches got their own milestone (M107) so M106 stays reviewable.
2. **The sail area is the manual's 200 m²** (the brochure says 176.4 m²), the same choice as for the main and jib, which use the manual's figures.
3. **Four rigging steps** (tack line, sheets, halyard, hoist) in the Sails section, with Settings' Rigged as a shortcut to all four.
4. **The gybe is an outside gybe** (the clew goes round in front of the boat), the one Wikipedia's *Spinnaker* describes with the sheets outside the forestay; the inside gybe is left out.
5. **The gennaker's sheets have no clutch** in Realistic ropes: off the winch, under load, they run out.
6. **Browser checks join existing groups** (the set is at its 77-group cap).
7. **This plan supersedes** the sailor-feedback plan's decision that #232 waits for "other yacht setups" (PHASE_FEEDBACK_SPEC 11, answer 2): the owner asked for it now.

**Fix after M106 (owner's bug report; decided in the fix PR, recommended; merging accepts it).** (1) The gennaker cannot go through the mainsail: when the boom is on the gennaker's side and the main is out, the clew stays at least `sails.gennaker.mainClearanceDeg` (5°) outboard of the boom seen from the mast (`mainStopPhiDeg`, `solveGennaker`'s last argument). A sheet hauled harder than that leaves the sail lying against the main: `pressed`, trim line "Pressed against the main: ease the sheet" (before `luffing`, after `blanketed`). With the boom on the other side, or the main furled, `stalled` still applies. (2) Dead astern is one wind: `leewardSide` returns no side within `visual.deadAsternBandDeg` (0.1°) of ±180°, so the boom's side, the sail's curve and "by the lee" no longer flip every few seconds on an exact run.
