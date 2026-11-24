# Training dinghy: a second built-in boat (M113–M118)

Planned with `/plan issue 273` on 2026-11-23. The owner asked for "a simple training boat… a few metres long, with a single small sail and basic control elements fitting real learning boats", with "all non-existing controls hidden from the UI when the boat is chosen". The owner's answers are in section 13.

## 0. How to use this spec

- Six milestones, built in order, **one PR each**, titled `M<N>: <name>` (names in section 6), each saying `Closes #<n>` for the issues its section names. Each milestone has its own GitHub issue (#274–#279, section 6), a short card for the owner that links back here; this spec is the source the builder follows.
- Read sections 0–5, then **only your milestone's section** (7 for M113, 8 M114, 9 M115, 10 M116, 11 M117, 12 M118). The general rules are in CLAUDE.md. Names (files, functions, store actions, `data-testid`s, string keys, registry ids, URL keys, data keys) are required. Numbers are final unless marked **tunable**.
- **Text is data.** The English strings here are final. German, Norwegian and Russian strings are AI drafts the builder writes: every new key exists in `content/lang/{de,no,ru}/*.json`, glossary entries with `textStatus: "draft"`, and the builder runs `npm run review-doc -- de`, `-- no` and `-- ru` after changing them.
- **If a test band fails:** check section 4 first, then the formulas against your section, then tune only keys marked **tunable** and report the before and after values in the PR. Never widen a band. The M114 bands come from a prototype run against the real `sailForces`, `initialRig` and `hullResistance` (section 8.4); a formula typed as written reproduces them.
- Keep the signatures written here. Decisions taken while building go in a new last subsection of your section, "Decided in the M<N> PR", marked "recommended; merging accepts it", with a ROADMAP decisions-log row pointing to it. Every milestone also updates `docs/CODE_MAP.md` for its files, `docs/BOAT_REFERENCE.md` for its new assumptions, `.github/ci-times.json` when its group's measured time changes by more than half, and the status of its PT rules in `docs/PHYSICS_TRUTHS.md` (the rows exist).
- **Build order:** each milestone starts after the one before it is merged; the names it uses from earlier milestones are as merged (if one differs from this spec, use the merged one and say so in the PR).
- **The Hanse 508 does not change.** Every old link (no `boat=dinghy`) opens exactly the picture it opened before, and every earlier unit test and browser check stays green, except the ones a milestone's "Older checks" subsection names. Every new model term is reached only through `boat.dinghy` (section 5), which the Hanse file does not have.

## 1. Goal and scope

**Goal.** A second built-in boat, the **Training dinghy**: a one-person, 3.45 m dinghy with one sail on an unstayed mast, a tiller and a centreboard, of the kind a first sailing course uses. The learner chooses it beside the Hanse 508, sails it in Easy mode with the controls a real trainer has (tiller, mainsheet in the hand, kicker, outhaul, centreboard, where you sit), feels that their own weight holds the boat up, can capsize it and right it, reads Learn entries written for it, and does four exercises on it. Everything the dinghy does not have is hidden.

**In scope:** issue #273. Choosing and drawing the dinghy, hiding what it lacks (M113); its sailing: the sailor's weight, centreboard, outhaul, leeway (M114); the sailor figure and the Sailor camera view (M115); capsize and righting (M116); Learn per boat (M117); four dinghy exercises (M118).

**Out of scope (owner, section 13):** a two-person dinghy or a jib; planing as its own model, trapeze, spinnaker; launching from a beach or slipway; Realistic ropes and Harbour mode on the dinghy; the marina and the bay on the dinghy; a dinghy boat profile (download or import; imported profiles stay Hanse-shaped); the Hanse exercises on the dinghy; a cunningham or a lifting rudder; a capsize where the mast points into the wind or the boat turns upside down (inversion); sounds of its own.

## 2. Conventions

- **Boat frame** (as everywhere, `docs/BOAT_REFERENCE.md`): metres, origin at the mast on the waterline on the centreline, **x forward, y up, z to starboard**. On the dinghy the mast stands 1.25 m behind the bow.
- **Side**: `1` = starboard, `-1` = port. **Heel**: `heelDeg` + = heeled to starboard (`BoatState.heelDeg`). The sails' `heelMomentNm` is negative when the wind is over starboard (`sailForces.ts`).
- **Angles**: `awaDeg` −180…180, + = wind over starboard; degrees in data and state, radians only inside `Math` calls (`DEG` from `src/model/angles.ts`).
- **The sailor's side** `sailorSide`: the side the sailor sits on, always the side opposite the boom (`−rig.solution.side`), which is the windward side except by the lee.
- **Where you sit** `Sit = 'in' | 'side' | 'out'`: "Sit in" (on the floor, against the windward side), "Sit on the side" (on the side deck), "Lean out" (feet under the toe straps, body outboard).
- **Percent controls** run 0…100 as the existing ones do. **Centreboard** `boardPct`: 0 = fully up, 100 = fully down. **Outhaul** `outhaulPct`: 0 = hauled tight (flat sail), 100 = eased (full sail), as the rope controls (0 = hauled).
- **Tiller**: the existing `ctl_rudder` keeps its meaning (+ = the rudder's back edge to starboard = the boat turns to starboard). The tiller is drawn on the opposite side: **tiller angle = −rudder angle**. Pushing the tiller to port turns the bow to starboard.
- **Words** (PHASE_FEEDBACK_SPEC 2): ropes are "lines" in English text; ids keep `rope_`.

## 3. Shared helpers

| Name | File | Signature | Behaviour |
|---|---|---|---|
| `mergeBoat` | `src/model/boatMerge.ts` (M113) | `(base: BoatData, overlay: Record<string, unknown>): BoatData` | Deep copy of `base` with `overlay` laid over it (7.3). Pure. |
| `BUILT_IN_BOATS` | `src/model/boat.ts` (M113) | `readonly { id: string; name: string; data: BoatData }[]` | The Hanse 508, then the Training dinghy. |
| `builtInBoat` | `src/model/boat.ts` (M113) | `(id: string): { id; name; data } \| undefined` | Looks the id up in `BUILT_IN_BOATS`. |
| `hasFeature` | `src/model/boat.ts` (M113) | `(f: FeatureId, data?: BoatData): boolean` | `data.features[f]`; reads `boat` at call time. |
| `isDinghy` | `src/model/boat.ts` (M113) | `(data?: BoatData): boolean` | `data.dinghy !== undefined`. |
| `boatHasControl` | `src/model/boat.ts` (M113) | `(id: ControlId, data?: BoatData): boolean` | True for `ctl_rudder`, `ctl_wind_dir`, `ctl_wind_speed`, and for every control some entry of `data.ropes.list` names as its `controlId`. |
| `crewMomentNm`, `dinghyRightingNm`, `nextSailorSide` | `src/model/dinghy.ts` (M114) | 8.3 | The sailor's weight, the hull's own stability, the sailor's side. |

## 4. Common mistakes

- **Heel sign.** Wind over starboard (`awaDeg > 0`): the sail heels her to port (negative), the sailor sits on starboard and his weight pushes **positive**. Tests in 8.6 check both tacks.
- **A Hanse path reached on the dinghy.** Code that looks up a Hanse-only rope, winch, station, cleat or fender by id must not run when its feature is off. Test 7.8.3 steps the dinghy for 60 s through every control and fails on any throw.
- **A dinghy number in code.** Every dinghy position, mass, arm, table and duration is in `content/boat/dinghy.json`, mirrored in `docs/BOAT_REFERENCE.md` (section 7, "Training dinghy", which the planning PR starts, all marked as assumptions unless a source is named).
- **Copying `boat` into a module constant** (`boat.ts` header): read `boat` at call time, or the dinghy shows Hanse numbers after a boat change.
- **State not reset.** Choosing a boat starts the app fresh (`startOnBoat`); Reset puts `dinghy` back to its defaults; a link without `sp`, `cb`, `oh` or `cap` gives the defaults.
- **The tiller drawn the wrong way round**: tiller angle = −rudder angle (section 2).
- **Hanse keys in a dinghy link** (`js`, `mf`, `ap`, `pl`, …): ignored on the dinghy (7.4), never written.

## 5. Architecture

**Data.** `content/boat/dinghy.json` is an **overlay**: `"base": "hanse508"` and only the keys that differ. `src/model/boat.ts` builds the dinghy once with `mergeBoat(HANSE_508_DATA, dinghyJson)`. So `BoatData` stays the Hanse file's type (`typeof hanse508`) widened by one optional block:

```ts
// src/model/boat.ts (M113)
export type FeatureId =
  | 'jib' | 'mainFurling' | 'gennaker' | 'winches' | 'wheel' | 'engine'
  | 'autopilot' | 'anchor' | 'harbour' | 'cabin' | 'standingRigging' | 'toppingLift';
export type BoatData = typeof hanse508 & { dinghy?: DinghyData };
// DinghyData: the shape of dinghy.json's "dinghy" block (7.2, grown by 8.2, 9.2, 10.2), as an interface in src/model/dinghy.ts (types only in M113).
```

`hanse508.json` gets a `features` block with all twelve `true` (7.2). What each feature covers is the table in 7.5; it is the one list the UI, the store, the model and the 3D read.

**New state** (`src/app/store.ts`, `AppState`, M113 creates it, later milestones add fields):

```ts
dinghy: DinghyState; // defaults from boat.dinghy; unused on the Hanse
// src/model/dinghy.ts
export type Sit = 'in' | 'side' | 'out';
export interface DinghyState {
  sit: Sit;              // M114
  boardPct: number;      // M114, 0 up … 100 down
  outhaulPct: number;    // M114, 0 tight … 100 eased
  sailorSide: 1 | -1;    // M114
  capsize: CapsizeState; // M116
}
```

M113 creates `DinghyState` with only the four M114 fields at their defaults and no store action for them; M114 adds the action and their effect.

**New store action:** `{ type: 'dinghy'; command: DinghyCommand }` (M114; commands grow in M116).

**Step order** (`reduce`'s `step` case): M114 adds `dinghy = stepDinghy(state.dinghy, rig)` right after the rig step (it reads the boom's side) and passes `crew` and `boardPct` to `stepBoat` (8.3). M116 adds the capsize to the same call. Nothing moves on the Hanse.

**New URL keys** (`src/app/urlState.ts`), read and written **only when the boat in use is the dinghy**: `sp` sit (`in` / `side` / `out`), `cb` centreboard 0–100, `oh` outhaul 0–100 (M114), `cap` capsized side `p` / `s` (M116). `boat=dinghy` (M113) uses the existing `boat` key.

**Files added**, by milestone: M113 `content/boat/dinghy.json`, `src/model/boatMerge.ts`, `src/model/dinghy.ts` (types), `src/render3d/boat/dinghy.ts`, `tests/dinghyBoat.test.ts`, `scripts/shots-m113.mjs`; M114 `src/ui/dinghyPanel.ts`, `tests/physicsTruthsDinghy.test.ts`, `scripts/shots-m114.mjs`; M115 `scripts/shots-m115.mjs`; M116 `src/ui/capsizePanel.ts`, `scripts/shots-m116.mjs`; M117 `scripts/shots-m117.mjs`; M118 `scripts/shots-m118.mjs`. Each adds its files to `docs/CODE_MAP.md`.

**Reading the state in a browser check.** With `debug=1`, `window.__sailExercise.read()` (`src/app/app.ts`) gives the state the checks read: M113 adds `boatId`, M114 adds `dinghy` (the whole `DinghyState`, with `capsize` from M116); the heel is its existing `heelDeg`. Where a check below says `__sailDebug` reports the boat, the heel or the capsize phase, it means these fields; `__sailDebug` (`scene.ts`) keeps what it has (`captain()`, `partVisible`, `project`).

**Browser checks.** The set is at its cap (77 groups, `tests/ciPlan.test.ts`): every milestone joins an existing group with `members(...)` and a `GROUP_ALIASES` entry, as M111 did with `m73`. Each section names its group.

## 6. Milestones overview

| Milestone | What the owner sees | Issues (milestone issue first) | Rules tested | Depends on | Independent review |
|---|---|---|---|---|---|
| **M113: Choose the training dinghy** | Settings → Boat lists the Hanse 508 and the Training dinghy; the welcome card has "Start on the training dinghy". The dinghy is drawn (hull, centreboard, rudder and tiller, mast, boom, one sail, mainsheet) and sails; every section, mode, button and key it lacks is hidden | #274; #273 | PT-75 | — | **required** (a second boat through the store, URL, profile checks and every panel) |
| **M114: Dinghy sailing** | A Dinghy section: where you sit (Sit in / Sit on the side / Lean out), centreboard up/down, outhaul; your weight holds the boat up, leaning out keeps it flat in a breeze, sitting out in light wind tips it towards you, with the board up it slides sideways | #275; #273 | PT-76, PT-77, PT-78, PT-79, PT-80 | M113 | **required** (heel and sideways-motion formulas) |
| **M115: The sailor in the dinghy** | A sailor figure sits on the high side holding the tiller extension and the mainsheet, crosses the boat in a tack or gybe, leans out when told; a Sailor camera view from their seat | #276; #273 | PT-80 (drawn) | M114 | **not needed** (a figure and a camera; no model change) |
| **M116: Capsize and righting** | Too much heel tips the dinghy over; a card says what happened; two steps right it: swim round to the centreboard, stand on it | #277; #273 | PT-81 | M114 (M115 for the figure) | **required** (what to do in a capsize; new state and URL key) |
| **M117: Learn for the dinghy** | Learn lists only what is on the boat in use, with dinghy texts for the shared parts (kicker, mainsheet, rudder, mast, captain) and new entries (leaning out, capsize) | #278; #273 | none | M116 | **not needed** (texts and a filter) |
| **M118: Dinghy exercises** | Four exercises in a Dinghy group, each with Watch: go and stop, tack, gybe, right a capsize | #279; #273 | PT-78, PT-80, PT-81 (through the exercises) | M117 | **required** (teaches handling; exercise checks) |

## 7. M113: Choose the training dinghy

**Independent review: required** (a second boat through the store, the URL, the profile checks, every panel and the 3D build).

### 7.1 Files

New: `content/boat/dinghy.json`, `src/model/boatMerge.ts`, `src/model/dinghy.ts` (the `DinghyData`, `DinghyState` and `Sit` types and `initialDinghy(data?)` only), `src/render3d/boat/dinghy.ts`, `tests/dinghyBoat.test.ts`, `scripts/shots-m113.mjs`.
Changed: `content/boat/hanse508.json` (`features`), `src/model/boat.ts`, `src/model/boatProfile.ts`, `src/main.ts`, `src/app/boatStore.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/app/setupFile.ts`, `src/app/appMode.ts`, `src/model/exercises.ts`, `src/model/ropePaths.ts`, `src/model/panelEntries.ts`, `src/ui/modes.ts`, `src/ui/modePicker.ts`, `src/ui/settingsMenu.ts`, `src/ui/welcome.ts`, `src/ui/autopilotPanel.ts`, `src/ui/sailsPanel.ts`, `src/ui/keyboard.ts`, `src/ui/keyHelp.ts`, `src/ui/cameraChip.ts`, `src/ui/instrumentStrip.ts`, `src/ui/exercisePanel.ts`, `src/ui/learnTab.ts`, `src/render3d/boat/index.ts`, `src/render3d/cameraPresets.ts`, `content/registry/parts.json`, `content/lang/*/ui.json`, `content/lang/*/glossary.json`, `docs/BOAT_PROFILE.md`, `docs/BOAT_REFERENCE.md`, `scripts/shots.mjs`, `scripts/ci-plan.mjs`.

### 7.2 Data

**`content/boat/hanse508.json`**: a new block right after `meta`:

```json
"features": {
  "$comment": "What this boat has (PHASE_DINGHY_SPEC 7.5). A missing feature hides its sections, controls, keys and parts.",
  "jib": true, "mainFurling": true, "gennaker": true, "winches": true, "wheel": true, "engine": true,
  "autopilot": true, "anchor": true, "harbour": true, "cabin": true, "standingRigging": true, "toppingLift": true
}
```

**`content/boat/dinghy.json`** (new; an overlay on the Hanse 508, 7.3). Values marked **tunable** may be tuned under section 0's rule; the rest are final. Sources: Wikipedia *Topper (dinghy)* (3.38 m, beam 1.19 m, hull 43 kg, cat rig, daggerboard) and *Laser Pico* (3.50 m, beam 1.43 m, hull 60 kg, main 5.1 m²): the dinghy is a generic trainer between the two, every number an assumption in `BOAT_REFERENCE.md` section 7.

```json
{
  "$comment": "Training dinghy for sail-learn-and-train: an overlay on hanse508.json (src/model/boatMerge.ts). Only the keys that differ. A generic one-person trainer between a Topper and a Laser Pico (docs/BOAT_REFERENCE.md section 7).",
  "base": "hanse508",
  "meta": {
    "id": "dinghy",
    "name": "Training dinghy",
    "model": "Generic one-person training dinghy",
    "variant": "Cat rig (one sail) on an unstayed two-piece mast, daggerboard-type centreboard, transom-hung rudder with a tiller and extension, mainsheet from the boom end to a ratchet block on the floor"
  },
  "features": {
    "jib": false, "mainFurling": false, "gennaker": false, "winches": false, "wheel": false, "engine": false,
    "autopilot": false, "anchor": false, "harbour": false, "cabin": false, "standingRigging": false, "toppingLift": false
  },
  "dimensions": {
    "source": "assumption between the Topper and the Laser Pico (Wikipedia class pages, 2026-11-23)",
    "loa": 3.45, "hullLength": 3.45, "lwl": 3.2, "beam": 1.3, "draft": 0.9,
    "displacementTonnes": 0.125, "mastAboveWaterline": 5.8, "engineHp": 0,
    "sailAreaM2": { "mainInMastFurling": 5.2, "mainStandardBattened": 5.2, "selfTackingJib": 0, "gennaker": 0, "reacher": 0, "source": "assumption (5.2 m2 main only)" },
    "massesKg": { "lightshipStandardKeel": 55, "lightCraftStandardKeel": 55, "fullyLoadedStandardKeelCatA": 125, "rigSheetDisplacement": 55, "ballast": 0 },
    "rightingMomentKNmAt30Deg": 0.6,
    "rightingMomentSource": "assumption for M113 only: the hull and a sailor sitting on the side together; M114 replaces it by dinghy.rightingNmByHeelDeg and the sailor's weight"
  },
  "hull": {
    "stemX": 1.25, "transomX": -2.2,
    "deckEdgeHalfBeam": { "points": [[1.25, 0.03], [1.1, 0.2], [0.8, 0.38], [0.4, 0.53], [0, 0.61], [-0.5, 0.65], [-1.0, 0.65], [-1.6, 0.62], [-2.2, 0.55]] },
    "sheerHeight": { "points": [[1.25, 0.45], [0.5, 0.38], [-0.5, 0.35], [-2.2, 0.33]] },
    "waterline": { "fwdX": 1.15, "aftX": -2.05, "transomBottomY": 0.04 },
    "canoeBody": { "maxDepthBelowWL": 0.16, "deepestX": -0.4 },
    "rudder": { "stockX": -2.27, "topY": 0.3, "bottomY": -0.6, "chordTop": 0.26, "chordBottom": 0.2, "maxAngleDeg": 35, "maxAngleSource": "assumption" },
    "thrusters": []
  },
  "rig": {
    "mast": { "x": 0, "footY": 0.37, "topY": 5.8, "airDraftY": 5.8, "sectionForeAft": 0.065, "sectionAthwart": 0.065, "sectionSource": "assumption: round aluminium tube, unstayed" },
    "boom": { "gooseneck": [0, 1.05, 0], "length": 2.4, "maxSwingDeg": 75, "maxSwingSource": "assumption: no shrouds; the sheet stops the boom; 75 keeps the gybe rule startPushFactor (0.85) above sin2(maxSwing - gybeHysteresis) = 0.75" },
    "mainsheet": { "system": "Centre mainsheet: boom end block to a ratchet block on the floor, tail in the sailor's hand", "boomDistance": 2.2, "deckBlocks": { "x": -1.55, "y": 0.18, "halfZ": 0.04 }, "partsPerSide": 1 },
    "vang": { "mastPoint": [0, 0.5, 0], "boomDistance": 0.55, "type": "Kicker: a rope tackle from the mast foot to the boom", "render": "A rope tackle", "strutStopDeg": -12, "strutStopSource": "assumption: no strut; the boom droops until the sail's leech holds it" }
  },
  "sails": {
    "main": { "type": "Dacron sail with a sleeve round the mast, no furling", "tackHeightAboveBoom": 0.07, "headY": 5.7, "footLength": 2.3, "modelledAreaM2": 5.27, "officialAreaM2": 5.2 },
    "jib": { "officialAreaM2": 0 },
    "gennaker": { "officialAreaM2": 0 }
  },
  "ropes": {
    "list": [
      { "id": "rope_mainsheet", "controlId": "ctl_mainsheet", "working": "boom end block <-> ratchet block on the floor, tail to the hand", "colorKey": "mainsheet" },
      { "id": "rope_vang", "controlId": "ctl_vang", "working": "mast foot <-> boom (kicker tackle)", "colorKey": "control" }
    ]
  },
  "controls": {
    "list": [
      { "id": "ctl_mainsheet", "default": 50 },
      { "id": "ctl_vang", "label": "Kicker", "default": 50 },
      { "id": "ctl_topping_lift", "default": 100 },
      { "id": "ctl_main_furl", "default": 100 },
      { "id": "ctl_rudder", "label": "Tiller", "min": -35, "max": 35, "default": 0 },
      { "id": "ctl_wind_speed", "max": 25, "default": 8 }
    ]
  },
  "steering": {
    "rudderSign": "ctl_rudder > 0: the rudder's back edge to starboard and the tiller to port; the boat turns to starboard. The tiller is always moved the opposite way to where the bow should go.",
    "rudderSignSource": "Wikipedia, Tiller"
  },
  "modelDetail": { "hullSectionExponent": 3 },
  "physics": {
    "mass": { "payloadKg": 70, "payloadNote": "assumption: one adult sailor" },
    "hull": { "wettedSurfaceM2": 2.6, "linearDragNPerMps": 3, "effectiveDraftM": 0.9, "clrDepthM": 0.35, "rudderAreaM2": 0.12 },
    "windage": { "areaM2": 0.8 },
    "steering": { "turnLengthM": 4, "yawLagS": 0.6 },
    "lowSpeed": { "cgX": -0.5, "keelLiftNPerMps2": 700, "lateralAreaM2": 0.15, "lateralDragCoefficient": 0.6, "swayLinearDragNPerMps": 10, "radiusOfGyrationM": 0.9, "yawLinearDampingNmPerRadS": 40, "windageSideAreaM2": 1.2 },
    "heel": { "maxHeelDeg": 50, "overpoweredHeelDeg": 20, "roundUpMinHeelDeg": 20 },
    "gybe": { "boomMassKg": 3, "sailMassKg": 2 }
  },
  "dinghy": {
    "$comment": "Parts only the dinghy has (PHASE_DINGHY_SPEC 7.2). M114 adds crew, rightingNmByHeelDeg, board and outhaul; M115 seats; M116 capsize.",
    "centreboard": { "x": -0.15, "chordM": 0.32, "depthBelowHullM": 0.75, "thicknessM": 0.02, "caseTopY": 0.3 },
    "tiller": { "pivot": [-2.27, 0.42, 0], "lengthM": 1.0, "extensionM": 0.75 },
    "toeStraps": { "fromX": -1.6, "toX": -0.6, "halfZ": 0.2, "y": 0.14 },
    "ratchetBlock": [-1.55, 0.18, 0],
    "sheetHand": [-1.4, 0.55, 0.45],
    "cockpit": { "fwdX": -0.45, "aftX": -2.1, "halfWidth": 0.48, "floorY": 0.14 },
    "sideDeckWidthM": 0.16
  }
}
```

The `physics.lowSpeed.*`, `physics.hull.*` and `physics.steering.*` values are **tunable**; the geometry is final. Every physics key not in the overlay is inherited on purpose: the dimensionless tables (`residuaryPerWeightByFroude`, `sails`, `trim`, `rudderGripByHeelDeg`, the gybe and alert factors) are what the prototype used; `contact`, `lines`, `ground`, `anchor`, `engine`, `thrusters`, `autopilot` are never reached (features off; open water has no obstacles). `hull.keel` and `hull.saildrive` are inherited and unused (their readers `marina.ts`, `seabed.ts` and the keel builder run only with `harbour` or on the Hanse). `ropes.list` entries have no `tails`: code that reads `tails` runs only with `winches`.

### 7.3 Model

**`mergeBoat(base, overlay)`** (`src/model/boatMerge.ts`, pure): returns a deep copy of `base` where, recursively, for each key of `overlay` except `base` and `$comment`:
- both values plain objects → merged by the same rule;
- the key is `list` directly under `controls` → **merged by `id`**: an overlay entry's fields replace those of the base entry with the same `id` (the other fields stay); an overlay entry with a new `id` is appended;
- otherwise (numbers, strings, arrays, including `ropes.list` and `hull.thrusters`) → the overlay's value replaces the base's.

`overlay.base` must equal `"hanse508"`; `mergeBoat` throws otherwise.

**`src/model/boat.ts`**: `HANSE_508` stays; add `DINGHY = { id: 'dinghy', name: 'Training dinghy', data: mergeBoat(hanse508, dinghyJson) }`, `BUILT_IN_BOATS = [HANSE_508_ENTRY, DINGHY]` (the Hanse entry wraps today's `HANSE_508`), `builtInBoat`, `hasFeature`, `isDinghy`, `boatHasControl` (section 3), and the types of section 5. `useBoat` is unchanged.

**Every control of an absent rope stays defined** (merge by id), so `controlSpec` never throws; `boatHasControl` says which ones the boat shows and links. The model keeps solving the jib and the gennaker on the dinghy: their sail areas are 0, so they add no force (`sailForces` unchanged), and nothing draws them.

**Hull, keel and appendages**: the hull loft (`hullShape.ts`) is generic and draws the dinghy from 7.2. Nothing else in `src/model` changes in M113: the dinghy heels with today's `rightingMomentNm` from its `rightingMomentKNmAt30Deg` (0.6, the interim value of 7.2), steers with today's steering on its own `turnLengthM`.

**`src/model/boatProfile.ts`**:
- `ADDED_KEYS` gets `features` (old profiles take the Hanse's block); `WHOLE_NAMING_PATHS` gets `features` (a profile's block must equal the Hanse's: profiles describe Hanse-shaped boats only).
- A profile whose header id is a built-in id (`hanse508` or `dinghy`) fails with the existing `builtIn` problem; the string `boat.problem.builtIn` becomes "This is a built-in boat: give your boat its own id."
- A profile with a top-level `dinghy` or `base` key fails with the problem `<key>: not in a boat profile`.

**`src/model/ropePaths.ts`**: on the dinghy (`isDinghy()`) the rope paths are `dinghyRopePaths(rig, data)`: the mainsheet from the boom at `rig.mainsheet.boomDistance` down to `dinghy.ratchetBlock`, then a 0.5 m tail rising to the hand point `dinghy.sheetHand` with z multiplied by `sailorSide` (M113: `sailorSide = −rig.solution.side`); the kicker from `rig.vang.mastPoint` to the boom at `rig.vang.boomDistance`. No other rope is drawn. `ropeLengths`, `ropeBin`, `handlePose` and `realistic.ts` are not called on the dinghy (their features are off).

### 7.4 Store and URL

- **Choosing a boat** (`src/main.ts`, `src/app/boatStore.ts`): `startBoatId` returns a built-in id or a stored one; `main.ts` calls `useBoat` with `builtInBoat(id)` when it exists, otherwise the stored profile as today. `BUILT_IN_ID` becomes `BUILT_IN_IDS: ReadonlySet<string>` (`hanse508`, `dinghy`); `saveBoat` returns `'builtIn'` for either; `storedBoats` drops both; with no query, the last chosen boat is used if it is built in or stored.
- **`AppState.dinghy`**: `initialDinghy(boat)` (section 5's fields: `sit: 'in'`, `boardPct: 100`, `outhaulPct: 50`, `sailorSide: 1`; M114 reads defaults from data). Reset and `load` restore it. On the Hanse it is never read.
- **URL** (`urlState.ts`): `boat=dinghy` is written whenever `boatId !== 'hanse508'` (unchanged rule). On the dinghy, **parsing ignores and writing omits**: every `URL_CONTROLS` key whose control fails `boatHasControl` (`js`, `tl`, `mf`, `jf`, `gs`, `gu`), and the keys of absent features: autopilot (`ap`, `apt` and the other autopilot keys), engine and thrusters, place and harbour (`pl`, the marina, bay, fenders and lines keys), anchor, `gn`/`gx`, `pic`/`tv`, Realistic (`mode=realistic`, `st` and the winch keys), `mode=harbour`. `mode=realistic` or `mode=harbour` in a dinghy link opens Easy. `cam=helm` on the dinghy opens `side-port` in M113 (M115 gives it the Sailor view).
- **`setupFile.ts`**: a built-in boat (either id) is written by id with no profile, as the Hanse is today; reading one with `boat: 'dinghy'` starts the dinghy.
- **Exercises**: `ExerciseDef` gets `boat?: string` (missing = `'hanse508'`). `exercisesForBoat(id): ExerciseDef[]` in `src/model/exercises.ts` filters the list; the Exercises list, Feel it (`feelItFor`) and the exercise links use it. A link `ex=<id>` for an exercise of another boat opens without the exercise.
- **Modes** (`appMode.ts`): `modesForBoat(data: BoatData, id: string): AppMode[]` = all five, minus `realistic` without `winches`, minus `harbour` without `harbour`, minus `exercise` when `exercisesForBoat(boatId)` is empty. The mode chip and the mode picker list only these.

### 7.5 UI: what each feature hides

The one table the code follows. "Hidden" means not built or `hidden`, never greyed. Where a section loses every block, the section is unavailable (`sectionAvailable` in `src/ui/modes.ts` gets the boat checks).

| Feature off | Hidden |
|---|---|
| `jib` | the jib's rope controls (Ropes section), the jib row of the Sails section, the keys R / F and their key-list lines, the jib sail, car, track and furler meshes |
| `mainFurling` | the main furling controls, the furling gearbox mesh; `ctl_main_furl` held at 100 |
| `gennaker` | Settings → Gennaker, the gennaker block of the Sails section, its rigging steps, bag and blocks; Learn's spinnaker, code 0 and traveller pictures (Show it working for them is hidden) |
| `winches` | the Realistic mode choice, the `helm` section, winches, clutches, rope bins, the winch handle, the mast base turning blocks |
| `wheel` | the wheels, the helm pedestals and their instrument faces, the Helm view buttons (Ropes, Panel, Other wheel); the steering label reads "Tiller"; the camera menu has no Helm in M113 |
| `engine` | the `engine` section, the engine row of the quick row and the step bar, the rpm cell of the instrument strip, the saildrive mesh |
| `autopilot` | inside the `autopilot` section (titled Steering): the autopilot's Standby / Heading / Wind buttons and the P key; the steering control stays |
| `anchor` | the `anchor` section, the bow roller, anchor, chain and windlass meshes |
| `harbour` | the Harbour mode choice, the `place` and `harbour` sections, fenders, cleats, fairleads and the ball fender meshes; the place is always open water |
| `cabin` | the coachroof, companionway, sprayhood, deck hatches, portlights, line channels, lifelines and the Hanse cockpit (the dinghy's open cockpit is drawn by `render3d/boat/dinghy.ts`) |
| `standingRigging` | spreaders, shrouds, forestay, backstay and its block |
| `toppingLift` | the topping lift's control and rope; `ctl_topping_lift` held at 100 |
| (thrusters) | unchanged: `hull.thrusters: []` already hides them |

**Settings → Boat** (`buildBoatField`): the list starts with every built-in boat, each `t('boat.builtIn', { name })` (the dinghy's name through `t('boat.name.dinghy')` = "Training dinghy"), then the stored boats. On the dinghy, "Download this boat's profile" and its hint are hidden (no dinghy profiles), and "Remove this boat" is hidden as for the Hanse. `boat.hint` becomes "A boat profile is a file with every number of a boat. Start from the Hanse 508's to describe a similar yacht."

**Welcome card** (`welcome.ts`): a third button between "Look around the boat" and "Close": `data-testid="welcome-dinghy"`, class `exercise-button`, text `welcome.dinghy` = "Start on the training dinghy". It sets the chosen boat to `dinghy` (`setChosenBoat`) and starts on it as the Settings list does. Not shown when the boat in use is already the dinghy.

**Learn**: the "written for the Hanse 508" note (`learnTab.ts`) is not shown on a built-in boat (M117 writes the dinghy texts; until then the shared entries read as they do).

**Captain**: hidden on the dinghy in M113 (`captain.ts` does not build him when `isDinghy()`); M115 draws the sailor.

### 7.6 3D (`src/render3d/boat/index.ts`, `src/render3d/boat/dinghy.ts`)

- `buildBoat` calls each Hanse builder only when its feature is on (7.5 table): `buildKeel` and `buildSaildrive` only when `!isDinghy()` / `engine`; `buildCockpitHardware` only with `winches`; `buildHelmPedestals` and the wheels only with `wheel`; `buildDeckGear`'s parts per feature; `buildBowGear` with `anchor`; `buildMooringFittings` and `buildFenders` with `harbour`; `buildGennaker` with `gennaker`; `buildPictures` with `gennaker`; `buildSmallFittings` with `cabin`; the jib mesh with `jib`. `buildHull` draws its deck parts (coachroof, companionway, cockpit well, toerail, channels) only with `cabin`; its hull shell always.
- **`buildDinghyParts(materials, detail): DinghyParts`** in `render3d/boat/dinghy.ts`, called when `isDinghy()`. All from `boat.dinghy` and `boat.hull`:
  - the deck: a foredeck closing the hull from `cockpit.fwdX` to the bow, and side decks `sideDeckWidthM` wide along the sheer, id `part_deck`; the open cockpit: a floor at `cockpit.floorY` between `cockpit.aftX` and `cockpit.fwdX`, `±cockpit.halfWidth`, id `part_cockpit`;
  - the centreboard case (a box 0.06 wide, chord + 0.04 long, from the floor to `caseTopY`, id `part_centreboard`) and the centreboard (`chordM` × (`depthBelowHullM` + hull depth there) × `thicknessM`, its bottom at `−(canoeBody depth at x) − depthBelowHullM · boardPct/100`, id `part_centreboard`), moved each frame from `state.dinghy.boardPct` (M113: always 100);
  - the rudder: today's `buildRudder` from `hull.rudder` (it hangs on the transom);
  - the tiller: a 0.035 × 0.03 bar `lengthM` long from `tiller.pivot` forward, id `part_tiller`, and the extension: a 0.016 round bar `extensionM` long hinged at the tiller's front end, lying along it in M113, id `part_tiller_extension`; both turn about the rudder stock by **−rudder angle** (section 2);
  - the toe straps: two flat straps 0.05 wide from `fromX` to `toX` at `±halfZ`, `y`, id `fit_toe_straps`;
  - the ratchet block: a block (`parts.ts` block helper) at `ratchetBlock`, id `fit_ratchet_block`.
- The mast is drawn from `rig.mast` (shorter and thinner), the boom from `rig.boom`, the main from `sails.main`, the kicker as a rope (7.3), no stays. The windex stays at the masthead.
- **Camera presets** (`cameraPresets.ts`): they already fit the boat's bounding box (`fitDistance`); no change. The scenes of 7.9 check the framing.
- **Budget**: the dinghy's draw calls and triangles are below the Hanse's at both details (it has far fewer parts); the `budget` check (`scripts/budget.mjs`) runs on the Hanse only, unchanged.

### 7.7 Strings, registry and Learn

- `ui.json` (en; de, no, ru drafts): `boat.name.dinghy` "Training dinghy", `welcome.dinghy` "Start on the training dinghy", `control.tiller` "Tiller" (read by `CONTROL_VIEWS` in `src/ui/ropeControls.ts` for `ctl_rudder` on a boat without `wheel`, where the Hanse shows `control.wheel`; the data's `label` is for the documents only), the changed `boat.problem.builtIn` and `boat.hint` (7.3, 7.5), `boat.problem.notInProfile` "{key}: not in a boat profile".
- Registry (`content/registry/parts.json`), `status: "draft"`, sources Wikipedia *Tiller* and *Centreboard* (`wiki:tiller`, `wiki:centreboard`; `fit_toe_straps` cites `wiki:tiller` until M117 adds `wiki:hiking`): `part_tiller` (group `cockpit`), `part_tiller_extension` (`cockpit`), `part_centreboard` (`hull`), `fit_toe_straps` (`cockpit`), `fit_ratchet_block` (`cockpit`). Each has `showMe` to its mesh.
- Glossary (en; de, no, ru drafts, `textStatus: "draft"`), name and text:
  - `part_tiller` — **Tiller**: "The bar fixed to the top of the rudder that you steer a small boat with. Push it to one side and the bow turns the other way: tiller to port, the boat turns to starboard."
  - `part_tiller_extension` — **Tiller extension**: "A light stick hinged to the end of the tiller, so you can steer while sitting on the side or leaning out."
  - `part_centreboard` — **Centreboard**: "The fin you push down through a slot in the bottom of a dinghy. Down, it stops the boat sliding sideways; up, it lets her slide. On many trainers it lifts straight up and is called a daggerboard."
  - `fit_toe_straps` — **Toe straps**: "Straps along the floor of the cockpit. You hook your feet under them to lean out over the side without falling in."
  - `fit_ratchet_block` — **Ratchet block**: "The block the mainsheet runs through on the floor. It turns freely one way and grips the line the other way, so you can hold the sheet with less effort."
- `tests/glossary.test.ts` group sizes change by these five ids (7.10).

### 7.8 Tests (`tests/dinghyBoat.test.ts` unless named)

1. `mergeBoat`: objects merge, arrays replace, `controls.list` merges by id (an override keeps the other fields; a new id appends), `base` other than `hanse508` throws; the Hanse data object is not changed (deep-equal to the JSON before and after).
2. The dinghy's data: `DINGHY.data.dimensions.loa` 3.45, `hull.thrusters` `[]`, `ropes.list` ids `['rope_mainsheet', 'rope_vang']`, every `CONTROL_IDS` id has a `controlSpec`, `ctl_rudder` label "Tiller", `ctl_wind_speed` default 8 and max 25, all twelve features false; the Hanse's all true.
3. **No Hanse path on the dinghy**: `useBoat('dinghy', …)`, a store from `initialState`, 60 s of `step` at dt 1/30 while every 2 s one of `ctl_mainsheet` (0, 100), `ctl_vang` (0, 100) and `ctl_rudder` (−35, 35) changes, wind 12 kn from 0, 90 and 180 in turn: no throw, no NaN in `boat` and `rig`; `heelDeg` stays within ±50. Then `useBoat` back to the Hanse (later tests unchanged).
4. **PT-75 the tiller moves opposite to the turn**: with `ctl_rudder` = 20 on the dinghy at 4 kn, after 3 s `yawRateDegS > 0` (turning to starboard), and the tiller's drawn angle (the pure helper `tillerAngleDeg(rudderDeg)` in `src/model/dinghy.ts`, = −rudderDeg) is −20 (to port).
5. URL: on the dinghy, `?boat=dinghy&js=30&mf=0&ap=wind&pl=marina&mode=realistic` parses to the defaults for those (jib sheet default, main furl 100, autopilot standby, open water, Easy); writing a dinghy state contains `boat=dinghy` and none of `js`, `mf`, `ap`, `pl`, `mode=realistic`. The Hanse's round trip is unchanged (the existing tests).
6. `modesForBoat`: Hanse → the five modes; dinghy → `['learn', 'easy']`. `sectionAvailable` on the dinghy, with `settings.ropesMode` `'easy'`: `engine`, `anchor`, `place`, `harbour`, `helm` false; `autopilot` (Steering) and `ropes` true.
7. Profiles (`tests/boatProfile.test.ts`): the downloaded Hanse profile still passes; an old profile without `features` passes (filled); a profile with `features.jib: false` fails; a profile with id `dinghy` fails `builtIn`; one with a `dinghy` key fails `dinghy: not in a boat profile`.
8. `boatStore` (`tests/boatStore.test.ts`): `saveBoat` of id `dinghy` returns `'builtIn'`; `startBoatId('')` with `dinghy` chosen returns `dinghy`.
9. `exercisesForBoat('hanse508')` has the 22 exercises; `exercisesForBoat('dinghy')` is empty.

### 7.9 Browser checks (`scripts/shots-m113.mjs`, joins group `m58`, live context)

**Budget**: no new group (the cap). `GROUP_ALIASES` gets `m113: 'm58'`; `shots.mjs` imports `liveM113Checks` and `M113_SCENES` (registered as `{ ...scene, name: \`m113-${scene.name}\` }`) and `m58` becomes `members(['m58', () => liveM58Checks(live)], ['m113', () => liveM113Checks(live)])` (nothing in M113 is timed, so the `live` context m58 already uses). `m58` recorded 99 s; expected addition 40 s, so it will pass 120 s: update its line in `.github/ci-times.json` with the measured time and name `m58` in `.github/ci-budget.json` ("two built-in boats: the chooser and the hidden sections"). Nothing becomes redundant.

**Scenes** (`D = '?boat=dinghy&wd=60&ws=8&ms=40&held=1&sea=flat'`, all sizes, `sheet: 'peek'`, `waitMs: 2500`):

| name | query | shows |
|---|---|---|
| `side` | `D&cam=side-port` | the whole dinghy: open cockpit, centreboard down, tiller and extension, mast, boom, one sail, mainsheet, kicker; no stays, no wheel, no captain |
| `top` | `D&cam=top` | the cockpit from above: toe straps, ratchet block, the tiller over the transom |
| `bow` | `D&cam=bow` | the unstayed mast and the sail from ahead |

**Live checks** (phone viewport unless named, helpers from `scripts/ui.mjs`):

1. Fresh page (no query, no storage): the welcome card shows `welcome-dinghy`; a finger tap (`locator.tap()`) on it reloads into `?boat=dinghy…` and `__sailDebug` reports `boatId === 'dinghy'`.
2. `?boat=hanse508`: `openSettings(page)`; `boat-select` has the options `hanse508` and `dinghy` in that order; selecting `dinghy` starts the dinghy (the URL has `boat=dinghy`); `boat-download` is hidden.
3. `D&debug=1` (stacked): open the mode picker: exactly the Learn and Easy choices. The phone tabs' Controls tab shows the Ropes section with two rows (Mainsheet, Kicker by `data-control` `ctl_mainsheet`, `ctl_vang`) and the Steering section with the steering control and no autopilot buttons; no `engine`, `anchor`, `place`, `harbour` section in any tab.
4. `D&cam=helm`: the camera chip shows Side (not Helm); the camera menu has no Helm entry.
5. `D&debug=1`: `partVisible` is true for `part_tiller`, `part_centreboard`, `fit_toe_straps`, `fit_ratchet_block`, and false for `sail_jib`, `fit_winch`, `helm_port`, `fit_anchor_windlass`, `fit_fender`, `part_shroud`, `person_captain`.
6. Wide layout (1,440 × 900) `D`: pressing R and P changes nothing in the URL; the key list (H) has no R / F or P line.

### 7.10 Older checks and tests this milestone changes

- `tests/glossary.test.ts`: the `cockpit` group +4 (`part_tiller`, `part_tiller_extension`, `fit_toe_straps`, `fit_ratchet_block`), `hull` +1 (`part_centreboard`).
- `tests/boatProfile.test.ts`, `tests/boatStore.test.ts`, `tests/setupFile.test.ts`: `grep -n "builtIn\|BUILT_IN\|hanse508" ` for the built-in rules; each keeps its Hanse case and gains the dinghy cases of 7.8.
- `scripts/shots-m58.mjs`: `grep -n "boat-select\|option"` for a count of the list's options (it was 1 + stored): it becomes 2 + stored.
- `scripts/shots-m85.mjs` (the welcome card): `grep -n "welcome-"` for a count of its buttons: 3 becomes 4.
- `tests/docs.test.ts`: CODE_MAP lists the new files.
- `tests/ciPlan.test.ts` keeps 77 groups (alias).

**PR line:** `CI groups: all` (the store, the URL state and the scene setup change).

### 7.10a Settled in planning (points a builder would otherwise guess)

1. **Overlay types**: every overlay leaf has the same JSON type as the base leaf it replaces (object, array, number, string); a test in 7.8.1 walks the overlay and checks it (except `base`, `$comment` and `dinghy`). `mergeBoat` returns `BoatData` by a cast after that check.
2. **`useBoat`**: `const b = builtInBoat(id); if (b) useBoat(b.id, b.name, b.data)`. `chosenBoat()` returns the stored choice when it is a built-in id or a stored profile's id, else `hanse508`; every use of `BUILT_IN_ID` in `boatStore.ts` becomes a `BUILT_IN_IDS.has(…)` test.
3. **The rope drawing**: the renderer builds one drawing per entry of `ropes.list` from `lineSpec` (`grep -n "lineSpec(" src/render3d`); on the dinghy it takes the two paths from `dinghyRopePaths(rig, data)` instead, keyed by rope id.
4. **`panelEntries.ts`**: its `ctl_rudder` entry reads `cockpitHardware.helms` for where the steering is; on a boat without `wheel` it uses `dinghy.tiller.pivot`.
5. **URL keys ignored on the dinghy**, by the state they fill: every key `urlState.ts` parses into `autopilot`, `engine`, `thrusters`, `harbour` (place, marina layout, traffic, fenders), `lines`, `anchor`, `realistic` (stations, clutches, winches, handle, gearbox), `gennaker`, `picture`, `travellerCarPct` and the Helm view (`hw`, `hl`), plus the `URL_CONTROLS` keys failing `boatHasControl`.
6. **Welcome card** on the dinghy: "Watch the first exercise" is hidden while `exercisesForBoat(boatId)` is empty; the new button has the look of Close (`exercise-button`).
7. **Pictures** (spinnaker, code 0, traveller: `sail_spinnaker`, `sail_code_zero`, `part_traveller_track`, `part_traveller_car`, `rope_traveller_mainsheet` and their Show it working) are built on the Hanse's geometry: hidden on a boat without `gennaker`, the traveller included.
8. **Registry entries** of 7.7: the same fields as `part_rudder`'s entry; `related`: `part_tiller` ↔ `part_tiller_extension`, `part_rudder`; `part_centreboard` → `part_hull`; `fit_ratchet_block` → `rope_mainsheet`; `fit_toe_straps` → `part_cockpit`; `controls`: `part_tiller` and `part_tiller_extension` → `ctl_rudder`, the others none; `showMe`: `?boat=dinghy&wd=60&ws=8&ms=40&held=1&sea=flat&cam=top&sel=<id>`. New source keys `wiki:tiller` and `wiki:centreboard` (and their `sourceLink` URLs, section 1's pages).
9. **Test 7.8.3** uses the store helper the store tests use today (`grep -n "createStore\|reduce(" tests/store*.test.ts`); each wind direction lasts 20 s. **Test 7.8.4** starts from a boat state with `speedMps` 2.06, wind 8 kn from 90.
10. **Setup file** (`tests/setupFile.test.ts`): a dinghy setup round-trips (`boat: 'dinghy'`, no profile inside).
11. **Live check 5** also expects `partVisible` true for `part_deck` and `part_cockpit`.
12. Also changed: `docs/CODE_MAP.md`, `src/render3d/pictures.ts`, `src/render3d/boat/appendages.ts` (callers only), `src/ui/ropeControls.ts`, `src/ui/welcome.ts`.

### 7.11 Done when / not in this milestone

PR: `Closes #274`. Done when the dinghy can be chosen in Settings and from the welcome card, is drawn as 7.6 says at both details, sails in Easy mode with the tiller and the two lines, shows nothing of 7.5's hidden list, the Hanse is unchanged, every test of 7.8 and check of 7.9 passes, `npm run check` passes and the CI run with `CI groups: all` is green.

Not in this milestone: the sailor's weight, the centreboard and outhaul controls (M114), the sailor figure and the Sailor view (M115), capsize (M116), dinghy Learn texts (M117), exercises (M118).

### 7.12 Decided in the M113 PR (recommended; merging accepts it)

1. **Drawn sizes, camera box and label points.** `dinghy.json` also holds `modelDetail` (boom 0.06 × 0.045 m, gooseneck 0.05 m, block radius 0.025 m, rudder 0.03 m, kicker offset 0.03 m), `visual.ropeRenderRadius` 0.008 m, `visual.labels3d.list` (only the dinghy's parts) and `hull.bowFittingTipX` 1.25 m. With the Hanse's values the boom would be 24 cm tall, the lines 5 cm thick, the camera would frame an 8 m boat and 3D labels would name a keel and a jib. Only the picture changes.
2. **The tiller turns with the rudder.** It is a child of the rudder's pivot, so it makes the same turn about the stock; its front end then goes to the side opposite the rudder's back edge ("tiller angle = −rudder angle", `tillerAngleDeg`).
3. **Hand steering and names.** The dinghy's autopilot is always Standby (`ap`, `apt` are ignored; the Steering section holds the tiller control only). The panel names are "Tiller" and "Kicker" (`control.tiller`, `control.kicker`); the tiller's buttons and note use `tiller.less`, `tiller.more` and `tiller.note`. The 3D tag of the kicker line still says "Vang" until M117 writes the dinghy's Learn names.
4. **Mainsheet tail**: 0.5 m long from the ratchet block towards the hand point (`DINGHY_SHEET_TAIL_M` in `ropePaths.ts`, the number is in 7.3).
5. **Keys.** The key list drops the thruster rows (A / D, J / L) on a boat without thrusters, and the R / F and P rows and keys on the dinghy.
6. **Welcome and chooser.** "Start on the training dinghy" opens `?v=1&boat=dinghy` (keeping the language) and remembers the choice; "Watch the first exercise" is hidden while a boat has no exercises. On the dinghy the profile download, its hint and "Remove" are hidden.
7. **Profile problems.** A `dinghy` or `base` key, at the top of the file or in `boat`, is reported as `<key>: not in a boat profile` (`boat.problem.notInProfile`, translated).
8. **Browser group time.** Group m58's recorded time is 125 s: an estimate from the local share of the M113 pages (70 s of 342 s), not measured on CI; the CI run measures it (`.github/ci-budget.json` names the group).
9. **Seen and left for M114.** The centreboard case (x −0.33 … 0.03) lies under the foredeck (the open cockpit starts at x −0.45), so the case cannot be seen from above; M114's planning should move the board aft or `cockpit.fwdX` forward.

## 8. M114: Dinghy sailing

**Independent review: required** (heel and sideways-motion formulas, a new store action and URL keys).

### 8.1 Files

New: `src/ui/dinghyPanel.ts`, `tests/physicsTruthsDinghy.test.ts`, `scripts/shots-m114.mjs`.
Changed: `content/boat/dinghy.json`, `src/model/dinghy.ts`, `src/model/heel.ts`, `src/model/motion.ts`, `src/model/hullResistance.ts`, `src/model/sailForces.ts`, `src/model/alerts.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/ui/modes.ts`, `src/ui/panel.ts`, `src/render3d/boat/dinghy.ts`, `content/lang/*/ui.json`, `docs/PHYSICS_TRUTHS.md`, `docs/BOAT_REFERENCE.md`, `scripts/shots.mjs`, `scripts/ci-plan.mjs`.

### 8.2 Data (`content/boat/dinghy.json`)

`dimensions.rightingMomentKNmAt30Deg` becomes `0.26` (the table's value at 30°, kept for the documents and the profile ranges) and its source "dinghy.rightingNmByHeelDeg at 30 degrees". Added to the `dinghy` block:

```json
"crew": {
  "armM": { "in": 0.15, "side": 0.6, "out": 1.0 },
  "armNote": "assumption: horizontal distance from the centreline to the sailor's centre of mass: sitting on the floor against the high side, sitting on the side deck, leaning out with the feet under the toe straps (Hiking (sailing): the crew's weight moved to windward increases the moment against heeling). The mass is physics.mass.payloadKg.",
  "defaultSit": "in"
},
"rightingNmByHeelDeg": [[0, 0], [5, 110], [10, 200], [15, 260], [20, 290], [30, 260], [40, 170], [50, 60]],
"rightingNote": "assumption: the hull's own righting moment with the sailor on the centreline, peaking at 20 degrees as the side goes under; small, because a dinghy has no ballast keel. Tunable.",
"board": { "defaultPct": 100, "wettedM2": 0.5, "liftUpNPerMps2": 30, "note": "assumption: both faces of the board add wetted surface when down; with the board up the hull alone resists sliding (Centreboard: lateral resistance; raised to cut drag when not needed). Tunable." },
"outhaul": { "defaultPct": 50, "powerAtTight": 0.85, "note": "assumption: hauled tight, the flatter sail gives 85 % of the force of a full one. Tunable." },
"windwardHeelAlertDeg": 10
```

`rightingNmByHeelDeg`, `board.liftUpNPerMps2`, `board.wettedM2` and `outhaul.powerAtTight` are **tunable**.

### 8.3 Model (`src/model/dinghy.ts`, pure, and the calls into it)

All of the following run only when `data.dinghy` exists; on the Hanse every function below is either not called or returns exactly today's value.

```ts
/** The sailor's weight about the centreline, signed like heelDeg (Nm). */
export function crewMomentNm(heelDeg: number, sit: Sit, side: 1 | -1, data?: BoatData): number;
//   = side · physics.mass.payloadKg · g · dinghy.crew.armM[sit] · cos(heelDeg·DEG)
/** The hull's own righting moment, signed like heelDeg (Nm). */
export function dinghyRightingNm(heelDeg: number, data?: BoatData): number;
//   = sign(heelDeg) · interpTable(dinghy.rightingNmByHeelDeg, min(|heelDeg|, physics.heel.maxHeelDeg))
/** Sideways grip of hull and board (N per (m/s ahead · m/s sideways)). */
export function boardLift(boardPct: number, data?: BoatData): number;
//   = board.liftUpNPerMps2 + (physics.lowSpeed.keelLiftNPerMps2 − board.liftUpNPerMps2) · boardPct/100
/** Share of the mainsail's force the outhaul leaves (0..1). */
export function outhaulPower(outhaulPct: number, data?: BoatData): number;
//   = outhaul.powerAtTight + (1 − outhaul.powerAtTight) · outhaulPct/100
/** The sailor sits opposite the boom. */
export function nextSailorSide(boomSide: 1 | -1): 1 | -1; // = −boomSide
export function stepDinghy(state: DinghyState, rig: RigState): DinghyState;
//   M114: { ...state, sailorSide: nextSailorSide(rig.solution.side) }
export function initialDinghy(data?: BoatData, rig?: RigState): DinghyState; // sit defaultSit, boardPct board.defaultPct, outhaulPct outhaul.defaultPct, sailorSide −rig.solution.side (1 without a rig)
```

Changes to existing modules:

- `heel.ts`: `rightingMomentNm` returns `dinghyRightingNm(heelDeg, data)` when `data.dinghy`. `rollDamping` uses, for the dinghy, `k0 = (table[1][1] / table[1][0]) / DEG` (the table's first slope in Nm per radian) instead of the RM30 expression.
- `sailForces.ts`: a new last parameter `mainPower = 1` multiplies the mainsail's `driveN`, `sideN` and its share of `heelMomentNm`. The store passes `outhaulPower(dinghy.outhaulPct)` on the dinghy, 1 on the Hanse.
- `hullResistance.ts`: a new last parameter `boardPct = 100`; on the dinghy the wetted surface is `wettedSurfaceM2 + board.wettedM2 · boardPct/100`.
- `motion.ts` `stepBoat`: its inputs get `dinghy?: { sit: Sit; side: 1 | -1; boardPct: number; mainPower: number }` (absent on the Hanse). With it:
  - roll: `rollRate += ((forces.heelMomentNm + crewMomentNm(heelDeg, sit, side) − rightingMomentNm(heelDeg) − damping·rollRate) / inertia) · h` (the clamp at `maxHeelDeg` stays);
  - sway: the sails push her sideways: `swayMps += ((low.sideN + ext.sideN − sign(awaDeg)·forces.sideN − swayDrag) / swayMass) · h`, and `swayDrag` uses `boardLift(boardPct)` in place of `ls.keelLiftNPerMps2`. (`−sign(awaDeg)`: wind over starboard pushes her to port.) The Hanse's sway is unchanged.
- `motion.ts` `steadyState`: its options get `dinghy?: { sit: Sit; side?: 1 | -1; boardPct: number; outhaulPct: number }` (`side` defaults to the windward side `awaDeg ≥ 0 ? 1 : −1`), and its result gets `capsize: 'none' | 'leeward' | 'windward'` and `leewayDeg: number` (both `'none'` / 0 on the Hanse). On the dinghy the heel is found by walking, not by bisection over 0…max: with `f(φ) = heelMoment(φ) + crewMomentNm(φ) − rightingMomentNm(φ)`, step φ from 0 by 0.25° in the direction of `sign(f(0))` until `f` changes sign, then bisect that step 30 times; if `|φ|` passes `maxHeelDeg` first, the heel is `±maxHeelDeg` and `capsize` is `'leeward'` when that side is the leeward one, else `'windward'`. `leewayDeg = atan2(s, v)/DEG` with `s` the positive root of `a·s² + b·s − F = 0`, `a = ½·ρ·lateralDragCoefficient·lateralAreaM2`, `b = boardLift(boardPct)·v + swayLinearDragNPerMps`, `F = forces.sideN`, `v` the found speed (0 when `v` is 0).
- `store.ts` `step`: after the rig step, `dinghy = stepDinghy(state.dinghy, rig)`; `stepBoat` gets `dinghy: { sit, side: dinghy.sailorSide, boardPct, mainPower: outhaulPower(outhaulPct) }` when `isDinghy()`.
- **Alerts** (`alerts.ts`): a new kind `windwardHeel` (`learnId: 'term_heel'`, `warning`): on the dinghy, the heel is towards the sailor's side and more than `windwardHeelAlertDeg` for 1 s. On the dinghy the `overpowered` alert uses the text `alert.overpowered.dinghy`.

**Edge cases.** Zero wind: no sail force; the sailor's weight alone heels her towards him (sitting in: a few degrees; on the side or leaning out: she goes over to `maxHeelDeg`, PT-77). Head to wind: the boom centres; `rig.solution.side` keeps its last side, so the sailor stays. Held still (`held=1`): the boat is upright, as today on both boats (`stepBoat`'s held branch and the opening state set the heel to 0). Paused: dt 0, nothing changes. Until M116, a heel at `maxHeelDeg` stays clamped there (the `overpowered` or `windwardHeel` alert shows).

### 8.4 Prototype values and bands

From a prototype against the real `initialRig`, `sailForces` and `hullResistance` with 8.2's data, heading 0, wind direction as given (so `twa` = direction), outhaul 100 unless named, steady state as 8.3 describes. Heel + = to starboard; the wind is over starboard in every case, so leeward is negative.

| Case | Prototype | Band |
|---|---|---|
| 16 kn, 90°, sheet 55, board 100: sit in | capsize leeward | `capsize === 'leeward'` |
| same, sit on the side | heel −8.0°, 7.3 kn | heel −11…−5, speed 6.3…8.3 kn |
| same, lean out | heel +4.8° | +2…+8 |
| 3 kn, 90°, sheet 50: sit in | heel +3.5° | +1.5…+5.5 |
| same, sit on the side / lean out | capsize windward | `capsize === 'windward'` (both) |
| 14 kn, 60°, sit in: sheet 30 | capsize leeward | `'leeward'` |
| same, sheet 60 | heel −0.5° | −3…+2, `'none'` |
| same, sheet 100 | heel +1.8°, 0 kn | 0…+4, speed ≤ 0.5 kn |
| 10 kn, 45°, sheet 20, sit on the side: board 100 | leeway 2.6° | 1.4…3.8 |
| same, board 50 | leeway 5.0° | 3.5…6.5 |
| same, board 0 | leeway 28° | 20…36 |
| 10 kn, 160°, sheet 90, sit in: board 0 against board 100 | 3.89 against 3.82 kn | board 0 strictly faster |
| 8 kn (default), sit in, sheet 0…100 in steps of 5, the fastest sheet, at 45°, 60°, 90°, 120°, 150°, 170° | no capsize; heels −13.4…+3.8 | `'none'` at every angle, heel −16…+6 |
| 8 kn, 90°, sit in, fastest sheet | 4.54 kn | 4.0…5.1 kn |

### 8.5 Store and URL

- Action `{ type: 'dinghy'; command: DinghyCommand }`, `DinghyCommand = { kind: 'sit'; sit: Sit } | { kind: 'board'; pct: number } | { kind: 'outhaul'; pct: number }`; percentages clamped to 0…100. Ignored when `!isDinghy()`.
- URL (dinghy only, section 5): `sp` = `in` | `side` | `out` (default `in`), `cb` = integer 0–100 (default 100), `oh` = integer 0–100 (default 50); written only when not the default; anything else in them is ignored.

### 8.6 UI (`src/ui/dinghyPanel.ts`)

- A new section `dinghy` in `SECTION_IDS` (`src/ui/modes.ts`), title `section.dinghy` = "Balance", phone tab `controls`, placed right after `ropes` in the Easy and Learn layouts, available only when `isDinghy()`.
- Three blocks, at phone size first, every button ≥ 44 px high, the app's existing styles (`.action-button` choices as in the Place section's Open water / Marina / Bay row; the − / + steppers of `stepper.ts` as in the Ropes section). No new colours, no icons.
  - **Where you sit** (`dinghy.sit.label`): three buttons in one row, `data-testid` `sit-in`, `sit-side`, `sit-out`, texts `dinghy.sit.in` "Sit in", `dinghy.sit.side` "Sit on the side", `dinghy.sit.out` "Lean out", the chosen one `aria-pressed="true"`. Under them one line, `dinghy.sit.hint`: "Your weight holds the boat up. Lean out when she heels a lot; sit in when the wind is light."
  - **Centreboard** (`dinghy.board.label`): − / + stepper, test ids in 8.9a.9, value `dinghy.board.value` "Down {pct} %"; − raises (towards 0), + lowers. Hint `dinghy.board.hint`: "Down when sailing towards the wind; half up on a reach; up when the wind is behind."
  - **Outhaul** (`dinghy.outhaul.label`): − / + stepper, test ids in 8.9a.9, value `dinghy.outhaul.value` "Eased {pct} %"; − hauls (flatter), + eases. Hint `dinghy.outhaul.hint`: "Haul it in a strong wind to flatten the sail; ease it in light wind for more power."
  - Steppers move by the step size of Settings → Step size; a held button repeats as the Ropes steppers do.
- Alert strings: `alert.windwardHeel` "Heeling towards you: sit further in", `alert.overpowered.dinghy` "Heeling a lot: lean out or ease the mainsheet".
- **3D**: the centreboard mesh follows `boardPct` (7.6); the sail's depth is unchanged (the outhaul is not drawn as a shape change).

### 8.7 PHYSICS_TRUTHS rules (rows added by the planning PR; this milestone tests them)

Tests in `tests/physicsTruthsDinghy.test.ts`, named "PT-<id> …", each with `useBoat` the dinghy before and the Hanse after:

1. **PT-76 Leaning out keeps her flatter**: the three 16 kn rows of 8.4.
2. **PT-77 In light wind, sit in**: the two 3 kn rows; plus a `stepBoat` run: 0.5 kn, sit on the side, 20 s from upright: `heelDeg` reaches +40 or more (towards the sailor) and the `windwardHeel` alert fired.
3. **PT-78 Let the sheet go to come upright and slow down**: the three 14 kn rows.
4. **PT-79 Centreboard down to sail towards the wind, up with the wind behind**: the leeway rows and the downwind speed row; plus a `stepBoat` run, 10 kn, 45°, sheet 20, sit on the side, 60 s from 2 m/s: the mean `atan2(swayMps, speedMps)` over the last 10 s with board 0 is at least 5× that with board 100.
5. **PT-80 The sailor sits opposite the boom**: `nextSailorSide(−1) === 1`; a store run on the dinghy, wind 12 kn from 45° (starboard tack): `sailorSide` 1; tack: `ctl_rudder` +30 (towards the wind) until `awaDeg < −20`: `sailorSide` −1, and the crew moment's sign changed with it.
6. **Default sailing is safe**: the 8 kn rows of 8.4 (a test named "dinghy default wind", not a PT rule).
7. **The Hanse is untouched**: `steadyState` on the Hanse at 12 kn, 60°, the M8 controls returns the same speed and heel as before (to 1e-9) and `capsize` `'none'`.

### 8.8 Browser checks (`scripts/shots-m114.mjs`, joins group `m8`, test clock)

**Budget**: `GROUP_ALIASES` gets `m114: 'm8'`; `m8` becomes `members(['m8', …], ['m105', …], ['m114', () => liveM114Checks(onTestClock)])`. `m8` recorded 75 s (with M105); expected addition 30 s. Update `.github/ci-times.json` if it moves by more than half. The model rules are unit tests (8.7); the browser checks only the section and a finger tap.

**Scenes** (`D = '?boat=dinghy&wd=90&ws=16&ms=55&oh=100&sea=flat'`, phone and one wide size, `sheet: 'half'` with the Balance section open):

| name | query | shows |
|---|---|---|
| `balance` | `D&sp=side&held=1&cam=side-port` | the Balance section with "Sit on the side" pressed (held still: upright) |
| `board-up` | `D&cb=0&held=1&cam=side-port` | the centreboard drawn up in its case |

**Live checks** (phone viewport, test clock):

1. `D&sp=side&debug=1`, Sailing: show the Balance section; `locator.tap()` on `sit-out`: the URL gets `sp=out` (`waitForLink`), after 5 s of test time `__sailDebug` heel is above −3 (flatter than on the side).
2. Tap `sit-in`: after 5 s the `overpowered` alert shows in the alert stack (found the way `scripts/shots-m8.mjs` finds it: `grep -n "overpowered" scripts/shots-m8.mjs`) and the heel is −50 (clamped until M116).
3. `?boat=dinghy&ws=8&debug=1`: tap `dinghy-board-minus` five times (Step size 5, the default): `dinghy-board-value` reads "Down 75 %" and the URL has `cb=75`.

### 8.9 Older checks and tests this milestone changes

- `tests/ui.modes.test.ts` (or the file that lists `SECTION_IDS`; `grep -rn "SECTION_IDS" tests`): the list gains `dinghy`.
- `tests/alerts.test.ts`: `grep -n "ALERT_KINDS"` for a count of kinds: +1.
- `tests/physicsTruths*.test.ts` of Phases 1–2 keep passing unchanged (the Hanse paths are untouched).
- `tests/languages.test.ts`: the new keys in every language.

**PR line:** `CI groups: m8, m58` (`m8` holds the heel checks; `m58` the dinghy's M113 checks, which the store change can break).

### 8.9a Settled in planning (points a builder would otherwise guess)

1. **Alerts**: on the dinghy `overpowered` counts only a heel away from the sailor (`heelDeg · sailorSide < −overpoweredHeelDeg`); a heel towards him is `windwardHeel`'s. `BoatState` gets `windwardHeelS` (seconds the heel has been towards the sailor by more than `windwardHeelAlertDeg`), counted in `stepBoat` when `inputs.dinghy` is given, 0 otherwise, reset where `overpoweredS` is reset; the alert fires at 1 s. Texts: `ALERT_TEXT` in `src/ui/alertCentre.ts` gets `windwardHeel`; the overpowered label in `src/ui/windIndicator.ts` and `ALERT_TEXT` use `alert.overpowered.dinghy` when `isDinghy()`.
2. **`stepBoat`** keys every dinghy term on `inputs.dinghy` (absent → today's behaviour, also with dinghy data). The store passes it on the dinghy in every call: `step`, the opening state, Reset, `load` and the exercise starts; the same for `steadyState`'s `dinghy` option (so a `sp=side` link opens at its own heel).
3. **`steadyState`**: the walk and `capsize` run only with `heel: true`; with `heel: false` the heel is 0 and `capsize` `'none'`. The heel keeps today's half-and-half averaging between iterations, except that an iteration with no root sets the heel to `±maxHeelDeg` at once; `capsize` is the last iteration's. `leewayDeg` is 0 when `v < 0.05` m/s. ρ is `physics.constants.waterDensityKgM3`, g `gravityMps2`, `DEG` = π/180 (so `k0 = slope_per_degree / DEG` is per radian). The sail forces inside it get `mainPower`; the sway does not feed back into the apparent wind.
4. **`sailForces`' `mainPower`** comes after `damage`: callers pass `NO_DAMAGE` explicitly. It scales every force field of the main (`liftN`, `dragN`, `driveN`, `sideN`) before they are summed, so the moment follows.
5. **`initialDinghy`** sets `sailorSide` to `−rig.solution.side` of the opening rig (1 only when there is no rig). `stepDinghy(state, rig)` has no `dt` in M114 (M116 adds `boat` and `dt`).
6. **Hull drag**: `effectiveDraftM` (induced drag) does not change with the board (the prototype did the same).
7. **Tests**: 8.7.2's store run: wind 0.5 kn from 90, heading 0, sheet 50, outhaul 100, sit on the side, 20 s, alerts recorded by the store. 8.7.4's run: wind 10 kn from 45, heading 0, outhaul 100, sit on the side; compare `|leeway|`. 8.7.5: heading 0, sheet 30, `ctl_rudder` +30 held until `awaDeg < −20` (at most 30 s).
8. **The 8 kn rows of 8.4** use outhaul 100 (more power than the default 50, so the default is safer still).
9. **Steppers**: `stepButton` from `src/ui/stepper.ts` with a value span: test ids `dinghy-board-minus`, `dinghy-board-plus`, `dinghy-board-value`, `dinghy-outhaul-minus`, `dinghy-outhaul-plus`, `dinghy-outhaul-value`; aria labels `dinghy.board.raise` "Raise the centreboard", `dinghy.board.lower` "Lower the centreboard", `dinghy.outhaul.haul` "Haul the outhaul", `dinghy.outhaul.ease` "Ease the outhaul". (No `data-control`: these are not rope controls.)
10. **Section `dinghy`**: `TAB_OF` → `controls`; after `ropes` in every mode's order (Realistic and Harbour never show on the dinghy); `src/ui/sectionLayout.ts` adds it after `ropes` to a saved arrangement that lacks it. Scenes and live checks open it with `showSection(page, 'dinghy')` (`scripts/ui.mjs`).
11. **URL**: `sp`, `cb`, `oh` are written after the existing keys, in that order. The setup file carries them through the link (no change).
12. Also changed: `src/ui/alertCentre.ts`, `src/ui/windIndicator.ts`, `src/ui/sectionLayout.ts`, `tests/alerts.test.ts`, `docs/CODE_MAP.md`.

### 8.10 Done when / not in this milestone

PR: `Closes #275`. Done when the Balance section works at phone size, the dinghy heels and slides as 8.4 says, every PT test of 8.7 passes, the Hanse's tests are unchanged, `npm run check` passes and CI is green.

Not in this milestone: the sailor figure and moving across (M115; the side changes at once here), capsize as an event (M116), the sail's shape changing with the outhaul.

### 8.11 Decided in the M114 PR (recommended; merging accepts it)

1. **Righting table at 50°: 100 Nm (the spec had 60).** `rightingNmByHeelDeg`'s last value is tunable. With 60, a sailor sitting in (66 Nm at 50°) held her at the clamp: the light-wind check (open on the side, tap Sit in) never came back. With 100 she returns to about +4° in 10 s. Every band of 8.4 and every PT test passed before and after (the walk to the balance stops well before 50°).
2. **English outhaul texts say "pull tight", not "haul".** `tests/sailorWords.test.ts` (M100) forbids "haul" in English text, so `dinghy.outhaul.hint` is "Pull it tight in a strong wind to flatten the sail; ease it in light wind for more power." and `dinghy.outhaul.haul` is "Pull the outhaul tight". The key names are unchanged.
3. **The heel warning's time is data.** `dinghy.windwardHeelAfterS` (1 s) sits beside `windwardHeelAlertDeg`; no number is left in code. The warning has its own label over the view (`windward-heel-label`) as well as its entry in the alert history.
4. **PT-80's store test changes the wind's side.** The model cannot yet steer the dinghy through the wind: at the spec's numbers (and on `main` before M114) she stops with the wind 13–17° on the bow and falls back. The test turns the wind from 60° to −60° at 12 kn instead and checks that the boom, the sailor and his weight cross. The tack by steering is issue #283, for the start of M115 (its "Tack" check and M118's tack exercise need it).
5. **Outhaul and computer-size checks use `ws=16&ms=55&oh=100&sp=side`.** At 12 kn with the tiller left alone the dinghy heeled towards the sailor and bore away, so a try ten seconds after opening compared a different course. The new link shows the effect in the first seconds (heel −8.5° to −3.3° and 7.2 to 6.2 kn at outhaul 0, back up at 100). The "Let it go" check opens sitting in (no `sp=side`), as `PHYSICS_TRUTHS` PT-78 says: a sailor on the side deck with the sheet fully eased tips her over to windward (PT-77).
6. **Small additions.** `ExerciseSection` gains `dinghy` (so M118's exercises can keep the section); the debug read gains `dinghy` (the whole `DinghyState`); the browser-check helper's tab table gains `dinghy`.
7. **Not changed.** The centreboard case still lies under the foredeck (see 7.12, point 9); M114 only draws the board up and down. The group m8's recorded time is not changed (the local run took 14 s more than the baseline on this machine).

## 9. M115: The sailor in the dinghy

**Independent review: not needed** for the figure and the camera view. The tack fix of 9.10.1 changes the model (dinghy only); it was reviewed by a Sonnet subagent in the M115 PR (formulas checked on both tacks and on the Hanse).

### 9.1 Files

Changed: `content/boat/dinghy.json`, `src/model/dinghy.ts` (the `DinghyData` interface), `src/model/people.ts`, `src/model/figurePose.ts`, `src/model/ropePaths.ts`, `src/render3d/people/captain.ts`, `src/render3d/boat/dinghy.ts`, `src/render3d/boat/ropes.ts` (the tail's last point while crossing), `src/render3d/scene.ts`, `src/render3d/cameraPresets.ts`, `src/ui/cameraChip.ts`, `src/app/urlState.ts`, `content/lang/*/ui.json`, `content/lang/*/glossary.json` (none in M115; M117 writes the sailor's text), `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md`, `docs/PHYSICS_TRUTHS.md` (PT-80's status), `scripts/shots.mjs` (import `liveM115Checks`, `M115_SCENES`, register the scenes as `m115-<name>`), `scripts/ci-plan.mjs` (`m115: 'm73'`). New: `scripts/shots-m115.mjs`.

### 9.2 Data (`dinghy` block of `content/boat/dinghy.json`)

```json
"seats": {
  "$comment": "Where the sailor's hips and feet are for each Sit, on the starboard side (z mirrored for port), and how far the whole body leans outboard from upright (degrees). Assumption, chosen to look right.",
  "in":   { "hip": [-1.25, 0.26, 0.3],  "feet": [-0.9, 0.14, 0.05], "leanDeg": 0 },
  "side": { "hip": [-1.25, 0.43, 0.6],  "feet": [-0.95, 0.14, 0.3], "leanDeg": 15 },
  "out":  { "hip": [-1.25, 0.45, 0.72], "feet": [-1.0, 0.16, 0.2],  "leanDeg": 60 }
},
"crossS": 1.5,
"sailorEye": { "aboveHipM": 0.75, "lookDownDeg": 10, "lookToLeewardDeg": 15 }
```

`feet` of `out` lie under the toe straps (`toeStraps.halfZ` 0.2, `y` 0.14 + the strap's thickness).

### 9.3 Model (pure)

- **`src/model/people.ts`**: `FigurePose` gets `'sit'` and `'hike'`. `CaptainPlacement` gets two optional fields, `hip?: Vec3` and `leanDeg?: number`; the Hanse never sets them. `import type { Sit } from './dinghy'` (type-only, no cycle).
- `sailorPlacement(sit: Sit, side: 1 | -1, data?: BoatData): CaptainPlacement & { hip: Vec3; leanDeg: number; hand: { aft: Vec3; fwd: Vec3 } }`: `hip` and `feet` from 9.2 with z multiplied by `side`; `leanDeg` from 9.2; `pose` `'hike'` for `out`, else `'sit'`; `walkedM` 0; **facing**: the body's front points along the boat-frame vector `(0.5, 0, −side·0.866)` (across the boat to the other side, turned 30° towards the bow), and `faceDeg` is the value that makes the existing figure's front point there under `captain.ts`'s rule `yaw = (90 − faceDeg)·DEG` (test 9.6.4 checks it). `hand.aft` and `hand.fwd` are returned **with the lean applied**: the offsets `[0.1, 0.35, −side·0.25]` and `[0.35, 0.3, −side·0.15]` from the hip, rotated by `leanDeg` outboard about the boat's x axis through the hip.
- `crossingHip(from: Vec3, to: Vec3, u: number): Vec3` = `from + (to − from)·u − [0, 0.1·sin(π·u), 0]`, `u` in 0…1.
- **`src/model/figurePose.ts`**: `figureJoints`'s switch gets `'sit'` and `'hike'` (exhaustive). The lean is not a joint: the whole figure is rotated by `leanDeg` (9.4), so the joints only bend legs and arms. `'sit'`: hips bent 90°, knees bent 90°; `'hike'`: hips bent 30°, knees bent 20°; both: the aft arm back and down, the forward arm forward and down. The builder picks the arm angles by eye from the scenes (no distance test: the skeleton has no inverse kinematics); rest joints as `REST_JOINTS`.
- **`src/model/ropePaths.ts`**: `dinghyRopePaths(rig, data, sit, sailorSide)` (M113's function gets the two new arguments): the mainsheet's tail ends at `sailorPlacement(sit, sailorSide).hand.fwd`.

### 9.4 3D and camera

- **Placement** (`render3d/people/captain.ts`, `scene.ts`): on the dinghy the captain figure is built (M113 hid him) and `setCaptain` gets `sailorPlacement(state.dinghy.sit, shownSide)`. When a placement has `hip`, `CaptainModel` puts the pelvis at `hip` (not the feet at `feet`: the legs follow the joints), turns the body by `faceDeg`, then rotates the whole figure by `leanDeg` outboard about the boat's x axis through the hip. The tap id stays `person_captain`. `__sailDebug.captain()` adds `hip: [x, y, z]` (the drawn pelvis, during a crossing too) and keeps `x, y, z` as the feet.
- **Crossing** (drawing only; no store state): `scene.ts` keeps `shownSide` and a timer `t`. When `state.dinghy.sailorSide` differs from `shownSide`, a crossing starts: `t` advances by the same app-time step the captain's walk uses (`captainDt`: 0 while paused or held still); `u = smoothstep(0, crossS, t)`; the drawn hip is `crossingHip(seat(old side), seat(new side), u)` of the current `sit`; pose `'sit'`; `leanDeg` drawn as `leanDeg · |1 − 2u|`; at `t ≥ crossS`, `shownSide` = the new side. A `sit` change during a crossing changes the seats the crossing runs between. A `sit` change otherwise moves the hip at once (the joints blend as they do today). A link, Reset or a boat start shows the sailor at once on the state's side (`shownSide` = `sailorSide`, no crossing).
- **The mainsheet's tail while crossing** (`render3d/boat/ropes.ts`): its last point is the drawn figure's forward hand (`hip` drawn + the rotated `hand.fwd` offset), so the sheet goes with the hand.
- **The tiller extension**: its hinge is at the tiller's front end (which moves with the tiller angle); it keeps its `extensionM` length and points from the hinge at the drawn aft hand (`hand.aft` rotated with the lean). It does not have to touch the hand.
- **Sailor view** (`cameraPresets.ts`): `presetPose` for `helm` calls `sailorPose(state, data)` when `!hasFeature('wheel')`, `helmPose` otherwise (`helmPose` is never called on the dinghy). `sailorPose`: eye at the drawn hip + `[0, aboveHipM, 0]`; it looks along the bow direction turned `lookToLeewardDeg` towards `−sailorSide` (port when the sailor sits to starboard) and `lookDownDeg` down; `fovDeg: cam.helmVerticalFovDeg`. The figure is hidden while the preset is `helm` on the dinghy (`captainHidden = preset === 'helm'` there, in place of the eye-distance rule). The Helm view buttons stay hidden (no `wheel`). `cam=helm` on the dinghy opens the Sailor view (M113 sent it to `side-port`); `hw` / `hl` are not read or written on the dinghy.
- **Camera chip** (`cameraChip.ts`): on a boat without `wheel` the `helm` entry and the chip use `cam.sailor` "Sailor" and `cam.short.sailor` "Sailor" in place of `cam.helm` and `cam.short.helm`; the menu's help line for it is `cam.sailor.hint` "From the sailor's seat, looking forward." (shown where `cam.helm`'s help shows today).

### 9.5 Strings

`cam.sailor`, `cam.short.sailor`, `cam.sailor.hint` (en as 9.4; de, no, ru drafts; then `npm run review-doc` for each).

### 9.6 Tests (`tests/people.test.ts`)

1. `sailorPlacement('side', 1)`: hip `[-1.25, 0.43, 0.6]`, feet `[-0.95, 0.14, 0.3]`; `('side', −1)`: hip z −0.6; `('out', 1)`: pose `'hike'`, `leanDeg` 60.
2. `figureJoints('sit')` and `('hike')`: every joint finite.
3. **PT-80 the sailor sits opposite the boom**: `sailorPlacement(sit, nextSailorSide(boomSide))` has hip z of the opposite sign to `boomSide` for every sit and both sides; `crossingHip(a, b, 0)` = a, `(…, 1)` = b, `(…, 0.5)` is 0.1 below the midpoint.
4. The facing: with `faceDeg` from `sailorPlacement('side', 1)`, the yaw `(90 − faceDeg)·DEG` applied to the figure's front axis (as `captain.ts` does) gives a vector within 1° of `(0.5, 0, −0.866)`; the same with side −1 and `(0.5, 0, 0.866)`.
5. `dinghyRopePaths`: the mainsheet's last point equals `hand.fwd` for each sit and side.

### 9.7 Browser checks (`scripts/shots-m115.mjs`, joins group `m73`, test clock)

**Budget**: `GROUP_ALIASES` gets `m115: 'm73'`; `m73`'s `members` (in `shots.mjs`) gets `['m115', () => liveM115Checks(onTestClock)]`. `m73` recorded 88 s; expected addition 30 s; update `.github/ci-times.json`; if over 120 s, name `m73` in `.github/ci-budget.json` ("the captain and the dinghy sailor").

**Scenes** (`D = '?boat=dinghy&wd=60&ws=12&ms=40&held=1&sea=flat'`: heading 0, wind over starboard, boom to port, the sailor on starboard; `E` the same with `wd=-60`, the sailor on port; all sizes, `sheet: 'peek'`, `waitMs: 2500`):

| name | query | shows |
|---|---|---|
| `sit-in` | `D&sp=in&cam=side-starboard` | the sailor sitting on the floor against the starboard side, a hand towards the extension, the sheet in the other hand |
| `sit-side` | `D&sp=side&cam=side-starboard` | on the starboard side deck |
| `lean-out` | `D&sp=out&cam=side-port` | leaning out over the starboard side, feet under the straps (seen from across the boat) |
| `lean-out-port` | `E&sp=out&cam=side-starboard` | the same on the port side |
| `sailor-view` | `D&sp=side&cam=helm` | the view from the sailor's seat: the bow ahead, the sail on the port side |

**Live checks** (phone viewport, test clock):

1. `D&sp=side&debug=1`: `__sailDebug.captain()` pose `'sit'`, `hip[2]` within 0.01 of 0.6, `hidden` false.
2. Tack: `?boat=dinghy&wd=0&ws=10&hdg=315&ms=30&sp=side&rd=30&sea=flat&debug=1` (Sailing; the rudder held at +30 turns her through the wind): wait with `page.waitForTimeout` in 0.5 s steps until `captain().hip[2] < 0` (at most 20 s of test time), then 2 s more: `hip[2]` within 0.01 of −0.6.
3. Finger tap on the camera chip: the menu has "Sailor" and no "Helm"; tap Sailor: `captain().hidden` true and the URL has `cam=helm`.

### 9.8 Older checks and tests this milestone changes

- `grep -rn "FigurePose\|Record<FigurePose" src tests` for an exhaustive table of poses (a `Record<FigurePose, …>` must gain the two new poses).
- M113's live check 4 (`scripts/shots-m113.mjs`, "no Helm entry; `cam=helm` opens Side"): it becomes "the menu has Sailor; `cam=helm` opens the Sailor view". This is why the PR line names `m58`. Say so in the PR.

**PR line:** `CI groups: m58, m73`.

### 9.9 Done when / not in this milestone

PR: `Closes #276`. Done when the sailor sits, leans out and crosses as 9.4 says on both tacks, the Sailor view works, the scenes look right at phone size, `npm run check` passes and CI is green.

Not in this milestone: a capsize pose (M116), the sailor's weight moving gradually during the crossing (the model switches at once, M114), a second person.

### 9.10 Decided in the M115 PR (recommended; merging accepts it)

1. **The tack by steering works (issue #283), by two dinghy-only changes.** At the start she could not turn through the wind: as the sail luffed, the sailor's side-deck weight tipped her over to windward, the rudder lost its grip and she bore away. (a) `physics.steering.turnLengthM` 4 → 2.5 m (a turning circle of about 9 m across at 30° of rudder; **tunable**). (b) The sailor comes into the middle while the bow is within 10° of the wind and is out on his side again beyond 25° (`dinghy.crew.tack`, `crewOutShare` in `src/model/dinghy.ts`, `crewMomentNm` takes the apparent wind as an optional last argument; **tunable**). A close-hauled dinghy sails at about 30° apparent, so steady sailing and every earlier band are unchanged; the Hanse is untouched. Close-hauled at 10 kn with the tiller at +30 she is through the wind in about 3 s and the sailor on the other side (`tests/physicsTruthsDinghy.test.ts`, PT-80). Limits: at 20 kn with the sheet at 15 she is overpowered and does not tack (heel reaches 50° even without steering), so the tack links use 10 kn; and while the bow is within 10° of the wind the model has his weight in the middle but the drawing keeps him on his old side until the boom crosses.
2. **The tack links start with the sheet at 15, not 30.** With the sheet at 30 (the spec's link) a sailor on the side deck at 45° to the wind tips the slow boat over to windward before the start (heel 50°, speed 1 kn), so there is nothing sensible to tack from. At 15 she starts at about 4 kn and −6.5° of heel. The WORKFLOW checklist, PT-80's link and live check 2 use `ms=15`.
3. **Hand offsets and the facing turn are data**, not constants in code (CLAUDE.md, no magic numbers): `dinghy.sailorHands` (`aft`, `fwd`) and `dinghy.faceTurnDeg`. `dinghy.sheetHand` (M113) is removed: the mainsheet's tail now ends in the sailor's forward hand, so nothing reads it.
4. **Port side.** One pose serves both sides: when the pelvis is on the port side the renderer swaps the left and right limbs and the turns about the up axis (`mirrorJoints`), and the lean's direction follows the side of the hip. During a crossing the face turns through "ahead" (`faceDeg` scales with `1 − 2u`) and the Sailor view's look direction follows the same signed side.
5. **The sheet and the extension follow the drawn hands.** `ropeDrawings` and `dinghyRopePaths` take the drawn sailor (`DrawnSailor`: seat, side, optional hand points); the code sits in `ropePaths.ts`, not `render3d/boat/ropes.ts` (which only builds meshes from the drawings). The tiller extension hangs on a hinge at the tiller's front end and is aimed by `aimExtension` each frame.
6. **The camera.** The camera rig gets `setSailorEye`, called when the drawn hip moves, so the Sailor view's eye follows a crossing. The Helm buttons (Ropes, Panel, Other wheel) stay hidden on the dinghy. The menu entry's help line "From the sailor's seat, looking forward." is the entry's tooltip (`title`); the menu has no other per-entry help line.
7. **Crossing time.** The crossing advances with the frame time and stops while paused. If the side flips back while a crossing is running (two tacks within 1.5 s), the figure goes back to his old seat at once. A link, a Reset or a boat start shows him at once on the state's side (the simulation time going back is what the drawing notices).
8. **Older checks changed:** M114's live check "Sit in" (`scripts/shots-m114.mjs`, group m8): with the tighter turning she heels to about −40° and the warning shows, then she rounds up into the wind and comes back up, before the old wait for the −49° clamp could see it (it passed at a turn length of 4 m only). It now watches the worst heel (−30° or more) and the warning for 15 s of test time. M113's `7.9.5` test and live check 5 (the sailor is now drawn), its check 4 (the camera menu has Sailor and `cam=helm` opens it), and its URL test (`cam=helm` stays `helm`). PR line: `CI groups: m8, m58, m73`.

## 10. M116: Capsize and righting

**Independent review: required** (what to do in a capsize is safety teaching; new state, store commands and a URL key).

### 10.1 Files

New: `src/ui/capsizePanel.ts`, `scripts/shots-m116.mjs`. Changed: `content/boat/dinghy.json`, `src/model/dinghy.ts`, `src/model/motion.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/model/alerts.ts`, `src/model/people.ts`, `src/model/figurePose.ts`, `src/render3d/people/captain.ts`, `src/render3d/boat/dinghy.ts`, `src/ui/dinghyPanel.ts`, `src/ui/ropesTab.ts`, `src/ui/autopilotPanel.ts`, `content/lang/*/ui.json`, `content/registry/parts.json` (none new), `docs/PHYSICS_TRUTHS.md`, `scripts/shots.mjs`, `scripts/ci-plan.mjs`.

### 10.2 Data (`dinghy` block)

```json
"capsize": {
  "$comment": "PHASE_DINGHY_SPEC 10. Assumptions except where a source is named.",
  "atHeelDeg": 48,
  "lyingHeelDeg": 85,
  "goingOverS": 1.5,
  "swimS": 4,
  "rightingS": 3,
  "minBoardPct": 50,
  "driftMps": 0.25,
  "stopTimeS": 2,
  "sailor": {
    "$comment": "Where the sailor's hips are in a capsize, in the boat's heading frame (turned with the heading, not rolled), z multiplied by the side she lies on. Assumption, chosen to look right.",
    "inWater": [-1.0, -0.45, 1.1],
    "astern": [-2.9, -0.45, 0],
    "atBoard": [-0.15, -0.45, -1.3],
    "standHip": [-0.15, 1.05, -1.0],
    "standFeet": [-0.15, 0.22, -0.7]
  },
  "source": "Wikipedia, Capsizing: a dinghy can normally be righted by standing or pulling down on the centreboard; capsizing is an inherent part of dinghy sailing"
}
```

### 10.3 Model (`src/model/dinghy.ts`)

```ts
export type CapsizePhase = 'upright' | 'goingOver' | 'over' | 'swimming' | 'righting';
export interface CapsizeState { phase: CapsizePhase; side: 1 | -1; t: number } // side: the side she lies on; t: seconds in this phase
export const UPRIGHT: CapsizeState = { phase: 'upright', side: 1, t: 0 };
export type CapsizeCommand = 'swim' | 'boardDown' | 'stand';
export function stepCapsize(c: CapsizeState, heelDeg: number, dt: number, data?: BoatData): CapsizeState;
export function capsizeCommand(c: CapsizeState, cmd: CapsizeCommand, boardPct: number, data?: BoatData): { capsize: CapsizeState; boardPct: number };
export function capsizeHeelDeg(c: CapsizeState, data?: BoatData): number | null; // the drawn and model heel while not upright, else null
```

- **Going over**: `upright` and `|heelDeg| ≥ atHeelDeg` → `goingOver`, `side = sign(heelDeg)`. (It may be either way: leeward from too much wind, windward from sitting out in a lull.)
- `goingOver` lasts `goingOverS`, then `over`. `capsizeHeelDeg`: in `goingOver` `side · (atHeelDeg + (lyingHeelDeg − atHeelDeg) · smoothstep(0, goingOverS, t))`; in `over` and `swimming` `side · lyingHeelDeg`; in `righting` `side · lyingHeelDeg · (1 − smoothstep(0, rightingS, t))` (`smoothstep` as in `src/model/gennaker.ts`).
- **Commands**: `'swim'` only in `over` → `swimming` (t 0); the sailor reaches the board when `t ≥ swimS` and the phase stays `swimming` until `'stand'`. `'boardDown'` in `goingOver`, `over` or `swimming` (not `righting`) sets `boardPct` to 100 (the sailor pushes it down from the water). `'stand'` only in `swimming` with `t ≥ swimS` and `boardPct ≥ minBoardPct` → `righting`; with less board it is refused (the UI shows why, 10.5). `righting` lasts `rightingS`, then `upright`; at that moment the store sets `ctl_mainsheet` to 100 (the sheet let go so she does not sail off), `sit` to `'in'`, `heelDeg` 0, `heelRateDegS` 0.
- **`stepBoat` while not upright**: the heel is `capsizeHeelDeg` (the roll integration is skipped), the sails give no force, `speedMps` decays to 0 with the time constant `stopTimeS`, the yaw rate is 0, and she drifts downwind at `driftMps` (east and north from the true wind's direction). Steering does nothing.
- `stepDinghy(state, rig, boat: BoatState, dt)` (M116's signature) calls `stepCapsize` with `boat.heelDeg` of the last step (`state.boat`).

### 10.4 Store and URL

- `DinghyState.capsize: CapsizeState` (default `UPRIGHT`). `DinghyCommand` gets `{ kind: 'capsize'; command: CapsizeCommand }`.
- While not upright the store ignores `setControls` for `ctl_mainsheet`, `ctl_vang`, `ctl_rudder` and the `sit` and `outhaul` commands (the board command stays: 10.3's `'boardDown'`).
- URL `cap` (dinghy only): `p` or `s` opens capsized in phase `over` on that side (heel ±85); written in every phase but `upright` (a link reopens `over`). Reset → `UPRIGHT`.
- Alert `capsized` (`learnId: 'term_capsize'` from M117; in M116 `'part_centreboard'`, `danger`), fired once when `goingOver` starts: `alert.capsized` "Capsized! Swim round to the centreboard and stand on it".

### 10.5 UI (`src/ui/capsizePanel.ts`) and 3D

- While the phase is not `upright`, a capsize card shows over the 3D view (`data-testid="capsize-card"`; where and how: 10.8a.8). Its parts:
  - Title `capsize.title` "Capsized".
  - Step 1: button `capsize-swim`, `capsize.swim` "Swim round to the centreboard", enabled in `over`; while swimming it reads `capsize.swimming` "Swimming round the stern…".
  - Step 2: button `capsize-stand`, `capsize.stand` "Stand on the centreboard", enabled once at the board. If `boardPct < minBoardPct`, a line `capsize.boardUp` "The centreboard is up: push it down first" and a button `capsize-board`, `capsize.boardDown` "Push the centreboard down".
  - One line under them, `capsize.hint`: "Stay with the boat. Let the mainsheet go before she comes up, then climb in over the side."
- The locked controls and the `capsize.locked` line "Right the boat first": 10.8a.6 (the board stepper stays enabled).
- **3D**: the hull lies at the capsize heel (the boat group rolls about its centreline at the waterline, so mast and sail lie on the water); the centreboard sticks out of the high side. The sailor: in `goingOver` and `over` in the water beside the cockpit on the low side (pose `'swim'`: upright in the water to the chest, arms forward); in `swimming` moving round the stern to the board's side over `swimS`; at the board and in `righting`, standing on the board with both hands on the side deck (pose `'standBoard'`); after righting, `'sit'` in. `FigurePose` gets `'swim'` and `'standBoard'`, defined in `figurePose.ts` like 9.3.

### 10.6 PHYSICS_TRUTHS rule

**PT-81 A capsized dinghy is righted by standing on the centreboard; the board must be down.** Tests in `tests/physicsTruthsDinghy.test.ts`:

1. A store on the dinghy, 16 kn from 90°, sheet 55, sit in, Sailing: within 10 s the phase is `goingOver` then `over` with `side` −1 (to leeward); the `capsized` alert fired once.
2. From `over`: `'stand'` before `'swim'` is refused; `'swim'`, 4.1 s, `'stand'` → `righting`; 3.1 s later `upright`, heel 0, `ctl_mainsheet` 100, sit `'in'`.
3. From `cap=s` with `cb=0`: after `'swim'` and 4.1 s, `'stand'` is refused; `'boardDown'` → `boardPct` 100; `'stand'` now works.
4. While `over`, 20 s: `speedMps` < 0.05, the position moved downwind by 5 m ± 1, heading unchanged, `setControls({ ctl_rudder: 30 })` changes nothing.
5. Windward capsize: 0.5 kn, sit on the side: the phase becomes `goingOver` with `side` = the sailor's side.

### 10.7 Browser checks (`scripts/shots-m116.mjs`, joins group `m101`, test clock)

**Budget**: `GROUP_ALIASES` `m116: 'm101'`; `m101` recorded 50 s; expected addition 40 s.

**Scenes** (`C = '?boat=dinghy&wd=90&ws=12&cap=s&held=1&sea=flat'`, all sizes, `sheet: 'half'`):

| name | query | shows |
|---|---|---|
| `over` | `C&cam=side-starboard` | the dinghy on its side, mast and sail on the water, the sailor in the water; the capsize card |
| `board-up` | `C&cb=0&cam=side-starboard` | the same with the board up |

**Live checks** (phone viewport, `C&debug=1` without `held`, test clock):

1. `capsize-card` shows; `locator.tap()` on `capsize-swim`; 4.1 s; `capsize-stand` enabled; tap it; 3.1 s: the card is gone, `__sailDebug` heel within ±2, the URL has no `cap`.
2. `C&cb=0&debug=1`: after swim and 4.1 s, the board line and `capsize-board` show; tap it, then `capsize-stand`: righting starts.
3. `?boat=dinghy&wd=90&ws=16&ms=55&sp=in&debug=1`: within 10 s of test time the `capsized` alert shows.

### 10.8 Older checks and tests this milestone changes

- M114's test 8.7.2 and live check 8.8.2 (heel clamped at `maxHeelDeg`): with capsize, the heel goes past `atHeelDeg` into `goingOver`. They become "the phase leaves `upright`" (unit) and "the `capsized` or `overpowered` alert shows" (browser); say so in the PR.
- `tests/alerts.test.ts` kinds +1; `FigurePose` lists +2.

**PR line:** `CI groups: m8, m58, m73, m101`.

### 10.8a Settled in planning (points a builder would otherwise guess)

1. **`stepBoat`**: `inputs.dinghy` gets `capsize: CapsizeState`. While it is not `upright`: the heel is `capsizeHeelDeg`, `heelRateDegS`, `swayMps`, `yawRateDegS`, `overpoweredS`, `windwardHeelS` and `roundUpS` are 0; no sail, windage, rudder or engine force; `speedMps` decays as `speed · exp(−h / stopTimeS)`; the position moves towards wind-from + 180° at `driftMps` while the true wind is above 0 (east and north in metres, as today); the wave motion goes on.
2. **The end of righting** (store, `step`): when the phase goes from `righting` to `upright`, the store sets `ctl_mainsheet` 100, `dinghy.sit` `'in'`, `boat.heelDeg` 0 and `heelRateDegS` 0. The sailor's crossing (M115) may start then; that is fine.
3. **Held still and paused**: the phase timers do not advance (dt 0 for them); the boat lies at the phase's heel; the commands are accepted. A held upright boat cannot go over (its heel is 0).
4. **Boundaries**: "at the board" is `t >= swimS − 1e-9`; the tests wait 4.1 s and 3.1 s. `goingOver` interpolates from `atHeelDeg` (a jump of at most 2° from the clamp is accepted).
5. **The board**: `'boardDown'` works in `goingOver`, `over` and `swimming`, not in `righting`; the ordinary `{ kind: 'board' }` command and the Balance section's board stepper stay enabled in every phase.
6. **Locked controls**: `setControls` is filtered per key (the wind keys pass; `ctl_mainsheet`, `ctl_vang`, `ctl_rudder` are dropped), so keys and buttons that dispatch it do nothing. The `sit` and `outhaul` commands are dropped. The Ropes section's steppers, the Steering control, the Sit buttons and the outhaul stepper are disabled, with one `capsize.locked` line at the top of the Ropes, Steering and Balance sections.
7. **`cap`**: `p` = side −1, `s` = +1. While not upright the link writes `cap` (any phase), so a shared link reopens `over`. The `capsized` alert fires when `upright` turns `goingOver` (once per capsize), not when a link opens `over`.
8. **Where the capsize block shows**: one card over the 3D view, `data-testid="capsize-card"`, in the step card's place above the chip row (on every layout; with an exercise running it sits above the step card), not modal, built like `stepCard.ts`. It is not repeated in the Balance section.
9. **Button states**: `goingOver`: all three disabled. `over`: Swim enabled, Stand disabled. `swimming`, `t < swimS`: Swim shows `capsize.swimming`, Stand disabled. `swimming`, at the board: Stand enabled if `boardPct ≥ minBoardPct`, else disabled with the board line and `capsize-board`. The board line and `capsize-board` show in `over` and `swimming` whenever `boardPct < minBoardPct`. `righting`: all disabled, the title reads `capsize.righting` "Coming up…".
10. **The sailor in 3D**: drawn in the heading frame (not a child of the rolled boat group), from 10.2's `sailor` points with z × `side`. `goingOver`, `over`: hip at `inWater`, pose `'swim'`. `swimming`: the hip moves along `inWater` → `astern` → `atBoard` at a constant speed over `swimS`, pose `'swim'`; at the board, pose `'swim'` at `atBoard`. `righting`: pose `'standBoard'`, hip at `standHip`, feet at `standFeet`. `upright`: M115's placement. The Sailor view's eye follows the drawn hip. The centreboard and the rig are drawn in the rolled boat group (the board sticks out on the high side by itself).
11. **Tests**: 10.6.1 starts upright at heading 0, speed 0, and allows 15 s; other alerts may fire too. 10.6.5 allows 30 s.
12. **Older**: M113's test 7.8.3 ("heel within ±50") becomes "within ±50 while upright". PT-81's row exists in `PHYSICS_TRUTHS.md`; update its status.
13. Also changed: `src/ui/alertCentre.ts` (`ALERT_TEXT`), `src/render3d/scene.ts`, `docs/CODE_MAP.md`.

### 10.9 Done when / not in this milestone

PR: `Closes #277`. Done when the dinghy goes over both ways, the two-step righting works on a phone, every test of 10.6 and check of 10.7 passes, `npm run check` passes and CI is green.

Not in this milestone: the mast pointing into the wind and the boat flipping again, turning upside down (turtling), the sailor climbing in as an animation step of its own, a capsize on the Hanse (impossible: it has no `dinghy`).

## 11. M117: Learn for the dinghy

**Independent review: not needed** (texts and a filter; no model change).

### 11.1 Files

Changed: `content/registry/parts.json`, `content/lang/*/glossary.json`, `src/model/registry.ts`, `src/model/glossary.ts`, `src/ui/learnTab.ts`, `src/ui/i18n.ts`, `src/model/alerts.ts`, `tests/glossary.test.ts`, `scripts/review-doc.mjs` (only if it must skip `@` keys), `docs/review/*.md` (regenerated), `scripts/shots.mjs`, `scripts/ci-plan.mjs`. New: `scripts/shots-m117.mjs`.

### 11.2 Data

- **Registry `boats`**: an optional field `boats: string[]` on a registry entry, the boat ids the part is on; missing = every boat. Set `"boats": ["hanse508"]` on every id of the groups `hull`, `deck`, `cockpit`, `rig`, `ropes` and `harbour`, **except** these, which both boats have: `part_hull`, `part_bow`, `part_stern`, `part_rudder`, `part_deck`, `part_cockpit`, `part_mast`, `part_boom`, `part_gooseneck`, `part_windex`, `rope_mainsheet`, `rope_vang`, `person_captain`, `env_exercise_target`; and also on `sail_jib`, `sail_gennaker`, `part_gennaker_sock`, `sail_spinnaker`, `sail_code_zero`, `term_lazy_sheet`, `term_prop_walk`, `term_downwind_sails`, `term_med_mooring`. Set `"boats": ["dinghy"]` on `part_tiller`, `part_tiller_extension`, `part_centreboard`, `fit_toe_straps`, `fit_ratchet_block`, `term_hiking`, `term_capsize`.
- **New ids** (group `sailing`, `status: "draft"`, sources Wikipedia *Hiking (sailing)* and *Capsizing*): `term_hiking`, `term_capsize`. The `capsized` alert's `learnId` becomes `term_capsize`, `windwardHeel` stays `term_heel`.
- **Per-boat entries**: a glossary key `<id>@<boatId>` replaces the whole entry `<id>` while that boat is in use. Each such entry, and each new id, has every field a glossary entry has: `name` as below, `alternatives` `[]` (`term_hiking`: `["hiking", "sitting out"]`), `what` = the text below, `short` = its first sentence, `onThisBoat` `""`, `mistakes` `[]`, `textStatus` `"draft"`. Add `rope_outhaul` to the shared list above and the entry `rope_outhaul@dinghy` — **Outhaul**: "The line that pulls the bottom back corner of the sail out along the boom. Hauled tight, the sail is flatter and easier to hold in a strong wind; eased, it is fuller and more powerful in light wind." English texts (de, no, ru drafts):
  - `term_hiking` — **Leaning out (hiking)**: "Sitting on the side with your feet under the toe straps and your body out over the water. Your weight then holds the boat up against the wind's push on the sail. The harder it blows, the further you lean out; in light wind you sit in, or the boat tips towards you."
  - `term_capsize` — **Capsize**: "When a dinghy tips over and lies on its side. It is part of learning to sail one. Stay with the boat, swim round the stern to the centreboard, make sure it is pushed down, and stand on it: your weight brings her up. Let the mainsheet go before she comes up so she does not sail off without you."
  - `rope_vang@dinghy` — **Kicker**: "The line from the bottom of the mast to the boom. Pulled tight it holds the boom down, so the sail stays flatter and does not twist open at the top; eased, the boom lifts and the top of the sail spills wind."
  - `rope_mainsheet@dinghy` — **Mainsheet**: "The line that pulls the boom in. On this dinghy it runs from the end of the boom to a ratchet block on the floor and you hold it in your hand. Let it go and the sail flaps: the boat slows down and comes upright."
  - `part_rudder@dinghy` — **Rudder**: "The blade hung on the back of the boat that steers her. You move it with the tiller: tiller to port, the boat turns to starboard."
  - `part_mast@dinghy` — **Mast**: "The pole that holds the sail up. On this dinghy it has no wires holding it: it stands in a hole in the deck and bends a little in a gust."
  - `person_captain@dinghy` — **Sailor (you)**: "That is you. You sit on the side opposite the boom, the tiller extension in your back hand and the mainsheet in your front hand. In a tack or a gybe you move across the boat."
  - `term_heel@dinghy` — **Heel**: "The boat leaning over. A dinghy has no heavy keel: your own weight holds her up. Lean out to keep her flat, or let the mainsheet out; if she leans towards you, sit in."

### 11.3 Model and UI

- `registry.ts`: `partOnBoat(id: string, boatId: string): boolean` from `boats`. `glossary.ts` `learnEntry(id, lang)` and `i18n.ts` `part(id)` read `<id>@<boatId>` first (the boat in use), then `<id>`.
- **Learn list and search** (`learnTab.ts`, `searchGlossary`): only ids with `partOnBoat(id, boatId)`; See also and Related links to an id not on the boat are not shown; "Where is it?" and "Show it working" only for ids on the boat. `Feel it` uses `exercisesForBoat` (M113), so it shows on the dinghy from M118 on (M118 gives its exercises `feelIt`).
- The info card (tap on a part) shows the per-boat name and text.
- On the Hanse nothing changes: no `@hanse508` keys exist, every id it shows today is on it.

### 11.4 Tests (`tests/glossary.test.ts`, `tests/registry.test.ts`)

1. Every `@` key names a registry id and a built-in boat id; every language has the same `@` keys as `en`.
2. `partOnBoat('fit_winch', 'dinghy')` false, `('part_tiller', 'hanse508')` false, `('rope_mainsheet', 'dinghy')` true.
3. With the dinghy in use, `part('rope_vang').name` is "Kicker"; with the Hanse, today's name.
4. Every id in `NOT_DRAWN` rules still holds; the drawn-id rule counts an id as drawn if either boat draws it.
5. Group sizes: `sailing` +2.

### 11.5 Browser checks (`scripts/shots-m117.mjs`, joins group `m23`, test clock)

**Budget**: `GROUP_ALIASES` `m117: 'm23'`; `m23` recorded 90 s; expected addition 20 s.

**Live checks** (phone viewport):

1. `?boat=dinghy`: open Learn, search "winch": no result; search "tiller": Tiller and Tiller extension.
2. `?boat=dinghy&learn=rope_vang`: the entry's name is "Kicker".
3. `?learn=rope_vang` (Hanse): today's name.

### 11.6 Older checks and tests this milestone changes

- `scripts/shots-m24.mjs` opens every Learn entry per language from the registry counts: it opens only the Hanse's entries (it runs on the Hanse) — `grep -n "entries\|registry"` and make its count `partOnBoat(id, 'hanse508')`. Say so in the PR.
- `npm run review-doc -- de`, `-- no`, `-- ru`: the review documents gain the new entries.

**PR line:** `CI groups: m23, m24, m58`.

### 11.6a Settled in planning (points a builder would otherwise guess)

1. **One read path**: `glossaryText(id, lang)` (the function `partInfo`, `part`, `learnEntry` and `searchGlossary` all reach) reads `<id>@<boatId>` first, with `boatId` read from `src/model/boat.ts` at call time. On a boat other than the Hanse, the "On this boat" block is hidden for an id without an `@` entry (its Hanse text would be wrong).
2. **Other groups**: the sails, sailing, sea, wind and directions terms not named in 11.2 are general sailing words and stay on both boats (`term_cunningham`, `term_halyard`, `term_reef`, `term_preventer`, …).
3. **Sources**: new source keys `wiki:hiking` and `wiki:capsizing` with their `sourceLink` URLs (`PHYSICS_TRUTHS.md` sources 56, 58).
4. **Show it working on the dinghy** shows only for ids whose registry `showMe` contains `boat=dinghy`. New `showMe`: `term_hiking` `?boat=dinghy&wd=90&ws=16&ms=55&sp=out&sea=flat&cam=bow`, `term_capsize` `?boat=dinghy&wd=90&ws=12&cap=s&sea=flat&cam=side-starboard`.
5. **Clutch labels**: `boatLabelsFor` returns none on a boat without `winches`.
6. **Counts**: the group headers' counts and `groupEntries` count only ids on the boat.
7. **Glossary tests**: the test that a language's `entries` keys equal the registry ids becomes "equal the registry ids plus the `@` keys of `en`"; the review document lists each `@` entry under its id as "On the training dinghy:", once; `scripts/review-doc.mjs` changes for that.
8. **`NOT_DRAWN`**: `term_hiking` and `term_capsize` are terms and follow the existing rule for terms; an id counts as drawn if either boat draws it.
9. **`learn=<id>`** for an id not on the boat opens Learn without an entry.
10. **Group `m23`** is a single live group today: it becomes `m23: members(['m23', () => liveM23Checks(live)], ['m117', () => liveM117Checks(live)])`. `m24` is in the PR line because its entry count changes (11.6).
11. Also changed: `src/model/boat.ts` (none), `tests/registry.test.ts`, `scripts/shots-m24.mjs`, `docs/CODE_MAP.md`; the registry's checks accept the `boats` field (an array of built-in ids).

### 11.7 Done when / not in this milestone

PR: `Closes #278`. Done when Learn on the dinghy lists only its parts and terms with the texts of 11.2, the Hanse's Learn is unchanged, the tests pass, `npm run check` passes and CI is green.

Not in this milestone: dinghy texts beyond 11.2 (a later "Learn texts per boat" pass can add more `@dinghy` keys as data).

## 12. M118: Dinghy exercises

**Independent review: required** (teaches handling and what to do in a capsize; new exercise checks).

### 12.1 Files

Changed: `content/exercises/exercises.json`, `content/lang/*/exercises.json`, `content/lang/*/ui.json`, `src/model/exercises.ts`, `src/app/exerciseRun.ts`, `src/app/exerciseBar.ts`, `src/ui/exerciseBar.ts`, `src/app/exercisePilots.ts`, `src/ui/exercisePanel.ts`, `tests/exercises*.test.ts`, `scripts/shots.mjs`, `scripts/ci-plan.mjs`. New: `scripts/shots-m118.mjs`.

### 12.2 Exercise data

- A new group `dinghy`, `exercise.group.dinghy` "Dinghy", listed only when the dinghy is in use (it is the only group then).
- `ExerciseCheck` gets `dinghy?: { sit?: readonly Sit[]; boardPct?: Range; capsize?: readonly CapsizePhase[] }` (false without a dinghy in the source). Bar row ids: `dinghy:sit`, `dinghy:board`, `capsize:steps` (`isBarRowId`).
- Four exercises, each `"boat": "dinghy"`, `"group": "dinghy"`, `"ropes": "easy"`, `"crew": false`, `"sections": ["ropes", "dinghy", "autopilot", "conditions", "learn"]`:

| id | start | steps (id: check, hold, bar) | mistakes |
|---|---|---|---|
| `dinghy-go-stop` | `?boat=dinghy&wd=0&ws=8&hdg=270&ms=100&sea=flat` | `pull-in`: `mainTrim ["good"]`, `speedKn [3, 99]`, 5 s, `control:ctl_mainsheet` · `stop`: `controls {ctl_mainsheet: [90, 100]}`, `speedKn [0, 1.5]`, 3 s, `control:ctl_mainsheet` · `go-again`: `mainTrim ["good"]`, `speedKn [3, 99]`, 5 s, `control:ctl_mainsheet` | `capsized` (serious: on the `capsized` alert) |
| `dinghy-tack` | `?boat=dinghy&wd=0&ws=10&hdg=315&ms=30&sp=side&sea=flat` | `close-hauled`: `tack "starboard"`, `twaDeg [38, 55]`, `mainTrim ["good"]`, 5 s, `control:ctl_rudder`, `control:ctl_mainsheet` · `tack`: `event "tackByHand"`, `tack "port"`, 0 s, `control:ctl_rudder` · `settle`: `tack "port"`, `twaDeg [38, 60]`, `speedKn [2, 99]`, `dinghy {sit: ["side", "out"]}`, 5 s, `control:ctl_rudder`, `dinghy:sit` | `in-irons` (as `tacking`'s), `capsized` |
| `dinghy-gybe` | `?boat=dinghy&wd=0&ws=10&hdg=205&ms=80&cb=40&sea=flat` | `run`: `tack "starboard"`, `twaDeg [150, 172]`, 5 s, `control:ctl_rudder`, `control:ctl_mainsheet`, `dinghy:board` · `gybe`: `event "controlledGybe"`, `tack "port"`, 0 s, `control:ctl_rudder`, `control:ctl_mainsheet` · `broad-reach`: `tack "port"`, `twaDeg [120, 150]`, `heelDeg [-20, 20]`, 5 s, `control:ctl_rudder` | `accidental-gybe` (as `points-of-sail`'s), `capsized` |
| `dinghy-capsize` | `?boat=dinghy&wd=90&ws=10&cap=s&cb=0&sea=flat` | `swim`: `dinghy {capsize: ["swimming"]}`, 0 s, `capsize:steps` · `board`: `dinghy {boardPct: [50, 100], capsize: ["swimming"]}`, 0 s, `capsize:steps` · `stand`: `dinghy {capsize: ["righting", "upright"]}`, 0 s, `capsize:steps` · `climb-in`: `dinghy {capsize: ["upright"], sit: ["side"]}`, `controls {ctl_mainsheet: [90, 100]}`, 2 s, `dinghy:sit` | none |

- The `capsized` mistake: `{ "id": "capsized", "serious": true, "on": { "alert": "capsized" } }`.
- **Texts** (`content/lang/en/exercises.json`, de/no/ru drafts), by exercise and step id:
  - `dinghy-go-stop`: title "Go and stop"; intro "A dinghy goes when the sail pulls and stops when you let the mainsheet go."; `pull-in` "Pull the mainsheet in until the sail stops flapping and the boat picks up speed."; `stop` "Let the mainsheet go: the sail flaps and the boat slows down."; `go-again` "Pull it in again and sail on."; mistake `capsized` "She went over. Next time let the mainsheet out as soon as she heels a lot."
  - `dinghy-tack`: title "Tack"; intro "Turn the bow through the wind; you move across to the new high side."; `close-hauled` "Sail as close to the wind as the sail allows: push the tiller away if she points too high and the sail flaps."; `tack` "Push the tiller away from you, towards the sail, and keep it there: the bow turns through the wind."; `settle` "Centre the tiller on the new course and sit on the new high side."
  - `dinghy-gybe`: title "Gybe"; intro "Turn the stern through the wind. The boom crosses fast: duck."; `run` "Bear away until the wind is behind you, the centreboard mostly up."; `gybe` "Pull the tiller towards you and keep the mainsheet in hand: the boom swings across. Keep your head down."; `broad-reach` "Steer straight on the new side and keep her flat."
  - `dinghy-capsize`: title "Capsize and right her"; intro "The boat is on her side. This is how you get her back up."; `swim` "Swim round the stern to the centreboard. Stay with the boat."; `board` "The centreboard is up: push it down."; `stand` "Stand on the centreboard and lean back: your weight brings her up."; `climb-in` "Climb in over the side and sit on the high side, the mainsheet still free."
- The start links follow the rule of the first screen: each opens Sailing in the wind its query names, the sheet as named, the sailor as `sp` says (default in), and the camera the exercise list uses today.

### 12.3 Pilots (`src/app/exercisePilots.ts`)

A pilot for each exercise, for Watch, Show me and the tests: steering by `ctl_rudder` with a heading-hold `rudder = clamp(1.5 · (targetTwa − twa), −30, 30)` towards the step's middle `twaDeg`; the tack: rudder +30 (towards the wind on starboard tack) until `tack` is `port`, then the hold; the gybe: rudder −30 until the `controlledGybe` event, with `ctl_mainsheet` at 60 during the turn; `dinghy:sit` and `capsize:steps` by their commands in order, waiting for each phase. The go-and-stop pilot sets the sheet to 40, 100, 40.

### 12.4 Tests

1. Each pilot completes its exercise (`goodRun`, `tests/harbourPilot.ts`) without a mistake, in under 120 s of app time.
2. `dinghy-tack`: a run that leaves the sit on `in` after the tack does not pass `settle`.
3. `dinghy-capsize`: `stand` before `board` is refused (the step does not pass); the PT-81 path passes.
4. `dinghy-go-stop` with the sheet held at 0 in 16 kn (a test start) fails with `capsized` (PT-78 through the exercise).
5. `exercisesForBoat('dinghy')` has the four, `('hanse508')` the 22 (M113's test updated).

### 12.5 Browser checks (`scripts/shots-m118.mjs`, joins group `m103`, test clock)

**Budget**: `GROUP_ALIASES` `m118: 'm103'`; `m103` recorded 56 s; expected addition 50 s (one Watch run at ×4, one Do it myself start). The four runs are unit tests (12.4).

**Live checks** (phone viewport):

1. `?boat=dinghy`: the mode picker has Exercise; the Exercises list shows one group, Dinghy, with four items; the Hanse's groups do not show.
2. Start `dinghy-capsize` with Watch (finger tap): the step card passes `swim` and the capsize card follows the pilot's commands; the run ends with the done card within 60 s of test time at ×4.
3. `dinghy-go-stop` with Do it myself: the step bar shows the mainsheet row; tap its − until the sheet is 40 (the start is 100): within 15 s of test time the step card moves to `stop` (driven with `scripts/exercise-drive.mjs`).

### 12.6 Older checks and tests this milestone changes

- `scripts/ui.mjs` `exerciseItemTestIds()` reads every exercise from the JSON: it must read only the Hanse's (no `boat` or `boat: "hanse508"`) for the checks that run on the Hanse, and `scripts/shots-m*.mjs` that count the list (`grep -n "exerciseItemTestIds\|22"`) keep their counts on the Hanse.
- M113's `modesForBoat` test: the dinghy now has `['learn', 'easy', 'exercise']`.
- `tests/exercises.test.ts`: the count of exercises (22 → 26) and of groups (4 → 5) where they are listed; every exercise's start link passes the first-screen rule (the existing test) on its own boat.

**PR line:** `CI groups: m58, m66, m103`.

### 12.6a Settled in planning (points a builder would otherwise guess)

1. **`opens`**: `ExerciseOpens` gets `'dinghy'` (opens the Balance section; the capsize card shows over the 3D view whatever is open). go-stop: every step `ropes`; tack: `close-hauled` and `tack` `autopilot` (the Steering section), `settle` `dinghy`; gybe: every step `autopilot`; capsize: every step `dinghy`.
2. **Types and lists**: `ExerciseGroup` and `ExerciseSection` get `'dinghy'`; `EXERCISE_GROUP_ORDER` (`scripts/ui.mjs`, `ui.d.mts`) gets `dinghy` last. The check source gets `dinghy?: DinghyState` from `AppState` when `isDinghy()` (false-y otherwise, like `gennaker`).
3. **Bar rows**: `dinghy:sit` = the three Sit buttons (test ids `bar-sit-in`, `bar-sit-side`, `bar-sit-out`); `dinghy:board` = the board stepper (`bar-board-minus`, `bar-board-plus`); `capsize:steps` = the capsize card's three buttons (`bar-capsize-swim`, `bar-capsize-board`, `bar-capsize-stand`), dispatching the same commands. The gybe's `run` step also has `dinghy:board`.
4. **`feelIt`**: `dinghy-tack` `["term_tacking"]`, `dinghy-gybe` `["term_gybe"]`, `dinghy-capsize` `["term_capsize"]`, `dinghy-go-stop` none. Text keys follow the layout of the existing entries in `content/lang/en/exercises.json` (copy `tacking`'s).
5. **Pilots**: go-stop holds `twaDeg` 90 with the heading-hold rule; tack sets `sit` `'side'` once on port tack; capsize: swim, wait 4.1 s, board down, stand, wait for `upright`, sit `'side'`. `tackByHand` fires as on the Hanse (the autopilot is always on standby on the dinghy).
6. **`goodRun`** (`tests/harbourPilot.ts`) uses the boat its start link names (`boat=dinghy` → `useBoat` the dinghy, the Hanse after).
7. **Test 12.4.4** starts from `?boat=dinghy&wd=0&ws=16&hdg=270&ms=0&sp=in&sea=flat` with a pilot that holds the sheet at 0.
8. **Watch** shows the pilot's commands as state changes (the step card and the capsize card update); the check reads the step ids and `__sailDebug`'s capsize phase. The dinghy has the Hanse's time speeds.
9. **Groups**: `m103` becomes `members(['m103', …], ['m118', () => liveM118Checks(onTestClock)])`. PR line: `m58` (the modes check changes), `m66` (the exercise list's counts), `m103`.
10. **`exerciseItemTestIds(boat = 'hanse508')`** gets the boat argument; the checks that run on the Hanse keep their counts.
11. **Older**: M113's live check 3 ("exactly the Learn and Easy choices") becomes "Learn, Easy and Exercise".
12. Also changed: `scripts/ui.mjs`, `scripts/ui.d.mts`, `scripts/exercise-drive.mjs`, `src/model/alerts.ts` (none), `tests/harbourPilot.ts`, `docs/CODE_MAP.md`.

### 12.7 Done when / not in this milestone

PR: `Closes #279`. Done when the four exercises run with Watch and Do it myself on a phone, every test of 12.4 passes, the Hanse's exercises are unchanged, `npm run check` passes and CI is green. This milestone closes the phase: its PR moves the checklists of M113–M117 from WORKFLOW to `docs/archive/CHECKLISTS.md` and marks the phase done in the ROADMAP.

Not in this milestone: more dinghy exercises (man overboard, coming to a buoy), a debrief text of its own.

## 13. Decisions (owner, 2026-11-23, in chat: "accept all")

1. **The boat**: a generic "Training dinghy", 3.45 m, one 5.2 m² sail, numbers between the Topper and the Laser Pico (7.2).
2. **Default boat**: the Hanse 508 stays the start boat for a first visit and every old link; the welcome card gets "Start on the training dinghy"; Settings → Boat lists both (7.5).
3. **Controls**: tiller, mainsheet by hand, centreboard, kicker, outhaul, where you sit; no cunningham, no lifting rudder (7.2, 8.6).
4. **Capsize**: yes, with the two-step righting, in its own milestone (M116, section 10).
5. **Modes and places on the dinghy**: Learn and Easy only (Exercise from M118), open water with the practice buoys (7.4, 7.5).
6. **Wind**: the dinghy starts in 8 kn; the heel warnings come from its own numbers (7.2, 8.3).
7. **Camera**: the Helm view becomes a Sailor view on the dinghy (M115, 9.4).

Taken in planning (recommended; merging accepts them): the overlay file and the feature list (section 5); M113's interim righting moment until M114; the sailor's three sitting places and their arms (8.2); leeway under sail for the dinghy only, the Hanse's motion unchanged (8.3); the crossing drawn without changing the model (9.4); Learn per boat by registry `boats` and `@boat` keys (11.2); the browser checks joining `m58`, `m8`, `m73`, `m101`, `m23` and `m103`.
