# Phase 7 specification: detailed surroundings (marina and anchor)

Status: **planned ahead** (owner's answers in the planning chat, 2026-10-15), written while Phase 5 (M25 done, M26–M29 to come) and Phase 6 (boat details, not planned yet) were unfinished · Last updated: 2026-10-15

Read [`ROADMAP.md`](ROADMAP.md) first, then this file. Phase 7 starts after Phase 6 is signed off. It builds on the slow-speed motion of Phase 2 (`src/model/motion.ts`, `src/model/engine.ts`), the area data of Phase 3 (`content/areas/adriatic.json`, `src/model/area.ts`), the mode and section system of Phase 5 (`src/ui/modes.ts`, M27) and the anchor, cleats and fenders drawn in Phase 6. The earlier specs still describe everything the app already does.

## 0. How to use this spec (for the coding agent)

- **Before M40: the refresh check.** This spec was written before Phases 5 and 6 were built. Before the first Phase 7 milestone, the owner starts one Opus session with `/plan 7 refresh`. That session compares sections 3–4 and every "Phase 6 provides" and "Phase 5 provides" line of this spec with the code as it is then (`src/ui/modes.ts`, `src/ui/sections.ts`, `src/ui/quickRow.ts`, `src/ui/miniMap.ts`, the Phase 6 data in `content/boat/hanse508.json`, the registry), fixes every name, path, key and number that changed, and records the changes in section 15 under "Refresh". It opens a docs-only PR. **Do not build M40 from a spec that has no "Refresh" entry in section 15.**
- Do **one milestone** (sections 6–13), on the branch your session gives you, in one PR titled `M<N>: <name>`. Read sections 0–5 first every time; they apply to all milestones. Then read only your milestone's section. Milestones are built in order (M40 → M47); each needs the ones before it merged.
- Build order inside a milestone: data → pure model + tests → store/URL → UI → 3D → map → browser checks → docs.
- **Numbers are final.** Every number in this spec was chosen or prototyped on 2026-10-15 against the real model code (section 3.5 says how). Boat and place numbers go into the data files named in each section, never into code. Numbers marked **tunable** may be changed only if a test band fails after you have checked your formulas against 3.4 "common mistakes": change the tunable key, report the before and after values in the PR, and never widen a band. A band that still fails after tuning is a question for the owner in the PR.
- **Text is data.** Every English string in this spec is final: copy it exactly. Russian strings marked as drafts are AI drafts (CLAUDE.md): copy them; where none is given, write a draft yourself following PHASE4_SPEC 3.3. After any change to `content/lang/ru/*.json` run `npm run review-doc -- ru`.
- **Signatures.** Function names, signatures, CSS classes and `data-testid`s are given so milestones fit together and the browser checks can find things. Keep them; add private helpers freely.
- **Write back.** If you decide something this spec leaves open, write it into your milestone's section under "Decided in the M<N> PR".
- **Everything earlier keeps working.** Every existing test stays green, every PHYSICS_TRUTHS test passes, sailing in open water behaves exactly as before (M40 was prototyped against the whole test suite: 741 tests passed unchanged), and every old link opens the same picture. An existing unit test may only be changed where your milestone section says so.
- Sailing terms in UI text get a short explanation the first time they appear on a screen (CLAUDE.md).

## 1. Goal

The learner can bring the Hanse 508 into a Mediterranean marina and out again, anchor in a bay, and see why things go wrong.

What the learner should feel:

> **Slow is hard.** Below two knots the keel stops gripping: the wind pushes her sideways and blows the bow off, going astern the stern walks to one side, and she keeps moving long after the engine is in neutral. The thrusters, a burst of engine with the wheel over, the lines and the anchor are the tools that hold her. If she touches something, a report says what, where and how hard, and whether a fender took it.

## 2. Scope

### In scope (Phase 7)

1. **Slow-speed handling** (M40): the boat can slide sideways (sway) and turn on the spot when pushed; the wind on the hull and rig pushes her sideways and turns her bow downwind at low speed; prop walk going astern; prop wash over the rudder going ahead; the hook through which later forces (thrusters, lines, anchor, contact) act on the boat. Sailing above about 2 knots is unchanged.
2. **Thrusters and Harbour mode** (M41): a bow and a stern thruster, each worked with a left–right joystick (owner); a **Harbour** mode in the mode chip (Phase 5's mode system) that puts the engine and thrusters first; the Helm station of Realistic mode gets the joysticks.
3. **Places, the marina** (M42): a place chooser (Open water, Marina; Bay from M45) that puts the boat there ready for harbour work; a marina with a quay, a pontoon, a fairway and berths, moored yachts by traffic level (busy, half, empty; they never move) and three layouts (tight, medium, spacious); the place, the layout, the traffic and the position in the link; the marina on the map and the mini-map.
4. **Contact, damage report and fenders** (M43): the hull bumps off the quay, the pontoon and moored yachts; a damage report (what was hit, where on our hull, how hard, whether a fender took it); fenders out or in (drawn by Phase 6); fenders left out while sailing are torn off.
5. **Mooring lines, Med stern-to** (M44): the crew throws the stern lines to the quay, picks up the lazy line and takes it to the bow; − / + tighten or ease each line; the lines hold the boat; a slack line with the engine in gear can foul the propeller and stop the engine.
6. **The bay** (M45): a bay with a depth map, sand, weed and rocks; the depth on the instrument strip; the keel touches the bottom where it is too shallow; a shore line to a ring on the rocks; mooring buoys picked up with a bow line.
7. **Anchor and windlass** (M46): the electric windlass (down / up) in the Anchor section, on a new **Bow station** in Realistic mode and on the remote at the helm; a chain counter; the chain hanging from the bow roller (catenary) and lying on the seabed; the anchor sets, holds or drags by scope, seabed and wind; the scope check of PT-31; an anchor alarm.
8. **Stern-to with the anchor, polish and sign-off** (M47): Med mooring with our own anchor instead of a lazy line (the usual way in a town quay without lazy lines), accessibility and frame-rate checks, docs.

### Out of scope

- **Moving traffic.** Other yachts never move (owner: moored only). Moving boats can come with the exercises (Phase 8).
- **Lasting damage.** A contact is a bump and a report; nothing breaks or handles differently afterwards (owner).
- **Chain physics link by link.** The chain is one catenary curve (owner: simple and visible).
- **Exercises, debriefs, scores, timers** (Phase 8). The damage report lists contacts; it does not grade.
- Thruster overheating and running time limits, battery state, the engine starting only in neutral (skipper question 17), currents and tides (the Adriatic has almost none), crew walking on deck in 3D, dinghies, passerelle (gangway), electricity and water on the quay.
- Changing sailing behaviour above 2 knots, the sails, the rig, the sail forces, Phase 2's hull resistance.
- New areas (the Adriatic stays the only area; the marina and the bay are part of its data).

If something here looks necessary, stop and ask in the PR.

## 3. Conventions and shared helpers

### 3.1 Conventions

| Topic | Convention |
|---|---|
| Map frame | Metres **east** and **north** of the area's origin (the open-water start point, where the practice buoys are centred), as `BoatState.eastM` / `northM` and `area.marks.buoys`. Every place item in the area file is given in this frame. |
| Heading | Compass degrees, [0, 360), 0 = north, 90 = east; + yaw rate = heading increasing = turning to starboard (clockwise seen from above). |
| Boat frame | `meta.frame` of the boat file: origin at the mast on the waterline, **x forward, y up, z to starboard**. `mapToBoat` / `boatToMap` (`src/model/mapFrame.ts`) turn vectors between the frames. |
| Turning point | `physics.lowSpeed.cgX` (−1.0 m): the boat turns about this point on the centreline; all moments are taken about it. `swayMps` is the sideways speed of this point. `eastM` / `northM` stay the position of the boat-frame origin (the mast), as today. |
| Forces | Newtons, in the boat frame: `surgeN` along +x, `sideN` along +z (to starboard), `momentNm` about the turning point, + = turns her to starboard. A force (fx, fz) at the boat point (x, z) gives `momentNm = (x − cgX)·fz − z·fx`. |
| Speeds | m/s in the model; knots on screen (`mpsToKn`, 1 decimal). Surge `speedMps` + ahead; sway `swayMps` + to starboard. |
| Wind | `ctl_wind_dir` is the compass direction the wind comes from (Phase 2), so the marina's crosswind is wind from the east or the west (the berths point north–south, 8.2). |
| Sides | `'port' \| 'starboard'`; a thruster or joystick direction `-1` = pushes that end to port, `+1` = to starboard, `0` = off. |
| Time | Everything advances with the store's scaled `dt` (time bar ×¼ … ×16, Pause = 0), as Phase 2. Crew tasks (lines, 10.3) also count scaled time. |
| Held still | Nothing moves (Phase 1): no external forces, no contact, no dragging; the windlass and the crew tasks still run, as the engine does. |
| Touch targets | At least 44 × 44 px (`--touch`). Hold-to-act controls (thruster joysticks, windlass buttons) act on `pointerdown` and stop on `pointerup`, `pointercancel` and `pointerleave`, and on `blur`; with the keyboard they act while Space, Enter or an arrow key is held (keydown / keyup). |
| Language | Every visible string through `t()`, in both `ui.json` files, same keys, same order. |
| Test ids | Every `data-testid` named in this spec is required. |
| Ids | Every new mesh and rope gets a registry id (6–13 list them), added with `status: "draft"` unless stated, and an entry in both glossaries. A control without a rope uses the id of the part it works (the wheel uses `part_rudder`): the bow joystick uses `part_bow_thruster`, the stern joystick `part_stern_thruster`, the windlass buttons `fit_anchor_windlass`. |

### 3.2 Shared helpers

| Helper | File | Signature | Behaviour |
|---|---|---|---|
| `forceAt` | `src/model/lowSpeed.ts` (M40) | `forceAt(xM: number, zM: number, fxN: number, fzN: number, data?: BoatData): ExternalForces` | The force (fx, fz), boat frame, applied at boat point (x, z): `{ surgeN: fx, sideN: fz, momentNm: (x − cgX)·fz − z·fx }`. |
| `addForces` | `src/model/lowSpeed.ts` (M40) | `addForces(...parts: ExternalForces[]): ExternalForces` | Sums the three components (and, from M43, concatenates `contacts`). `addForces()` = zero. |
| `pointToMap` | `src/model/lowSpeed.ts` (M40) | `pointToMap(boat: BoatState, xM: number, zM: number): [east: number, north: number]` | Map position of a boat point: `[boat.eastM, boat.northM] + boatToMap(x, z, boat.headingDeg)`. |
| `pointVelocity` | `src/model/lowSpeed.ts` (M40) | `pointVelocity(boat: BoatState, xM: number, zM: number, data?: BoatData): [east: number, north: number]` | Map velocity (m/s) of a boat point: body velocity `vx = speedMps − r·z`, `vz = swayMps + r·(x − cgX)` with `r = yawRateDegS·DEG`, turned with `boatToMap(vx, vz, headingDeg)`. |
| `vectorToBoat` | `src/model/lowSpeed.ts` (M40) | `vectorToBoat(eastN: number, northN: number, headingDeg: number): [fx: number, fz: number]` | `mapToBoat` applied to a vector (a force or velocity given in east/north). |
| `depthAt` | `src/model/seabed.ts` (M45) | `depthAt(eastM: number, northM: number, areaData?: AreaData): number` | Water depth in metres (≤ 0 = land) from the area data (11.3). Before M45 the function does not exist; M42–M44 use `area.marina.depthM` / `area.openDepthM` directly where they need a depth. |
| `seabedAt` | `src/model/seabed.ts` (M45) | `seabedAt(eastM: number, northM: number, areaData?: AreaData): SeabedType` | `'sand' \| 'mud' \| 'weed' \| 'rock'` (11.3). |
| `interpTable` | `src/model/angles.ts` (exists) | `interpTable(table, x)` | Linear interpolation in `[x, y]` pairs, clamped at the ends. Used for every table in this spec. |

### 3.3 Sources

Rules and their sources are in `docs/PHYSICS_TRUTHS.md` (PT-27, PT-31, PT-33, PT-34, PT-47 … PT-57). Boat numbers that are guesses are rows in `docs/BOAT_REFERENCE.md` section 5 ("Phase 7" rows) and stay marked as assumptions. Skipper questions 18–21 (BOAT_REFERENCE section 6) ask for the real values: the side the stern walks to in reverse, the thrusters' power, the anchor and chain, the windlass.

### 3.4 Common mistakes (check these first when something fails)

- **Sign of the moment.** A push to starboard (+z) **ahead** of the turning point turns her to starboard (+); **behind** it, to port. Check `forceAt` with a force at the bow and one at the stern before anything else.
- **Sway in the wrong frame.** `swayMps` is in the boat frame; the position update turns it into east/north with the heading (6.3). Forgetting the `r·(−cgX)` term makes the mast slide sideways when she spins on the spot.
- **Degrees and radians.** `yawRateDegS` is stored in degrees per second; every formula in this spec uses `r` in rad/s (`r = yawRateDegS·DEG`). The apparent-wind angle `awaDeg` is in degrees; `Math.sin` needs radians.
- **Constant forces across substeps.** Lines, contact and the chain are stiff springs: they must be evaluated **every substep** through `MotionInputs.external` (6.3), never once per frame. At ×16 a frame is up to 1.6 s and 32 substeps.
- **The jib does not furl with a tight sheet** (PT-13). Every test that wants the sails away sets `ctl_main_furl: 0`, `ctl_jib_furl: 0` **and** `ctl_jib_sheet: 100`; with the sheet at 30 % the jib stays 85 % out and drives the boat (found while prototyping).
- **The autopilot steers in tests.** `initialState` turns the autopilot on in heading mode; a test of the rudder or of turning must set `autopilot.mode = 'off'` first (helper `harbourStart`, 6.7).
- **State not reset.** Choosing a place (M42) clears the lines, the anchor, the contact list, the track and the crew task; forgetting one leaves a line tied to a quay a kilometre away.
- **Held still.** In Held still `stepBoat` returns early; external forces, contact, chain drag and grounding must not run (3.1).
- **Old links.** A link without the Phase 7 keys must give exactly the state it gives today (sway 0, open water, no lines, anchor stowed, thrusters off). `tests/urlState.test.ts` compares serialized links: no new key may be written for that state.

### 3.5 How the numbers were made

The M40 model was prototyped on 2026-10-15 as a throwaway change to `stepBoat` with the data of 6.2. With it, the whole test suite passed (741 tests). The bands in 6.6 are the prototype's values with the margins stated there. The anchor (12.3) was prototyped with the same model, the catenary of 12.3, and gusty wind seed 1. Line and contact springs (9.3, 10.3) were checked for stability at the largest substep (0.05 s): `k·h²/m` ≤ 0.1 and `c·h/m` ≤ 0.5 for the lightest effective mass (a force at the bow turning the boat, about 6,000 kg).

### 3.6 Browser-check conventions (every milestone)

- Each milestone has `scripts/shots-m<N>.mjs`, registered in `scripts/shots.mjs` (import, `SCENES`, `liveGroups`) with names written without the prefix, as Phase 5 (PHASE5_SPEC 3.6).
- **What `openPage` adds:** Phase 7 labels (`m4[0-7]`) are treated like Phase 5 ones: no `held=1`, `sea=flat` or `clock=0` is added, and no `mm=0` (extend the label regular expressions of PHASE5_SPEC 3.6 with `|4[0-7]`).
- Checks find things by `data-testid` or with `exact: true`; links are read with `waitForLink`.
- New helpers in `scripts/ui.mjs` (each milestone adds its own; signatures below): every check uses them, never raw selectors for these controls.

```js
/** M41: holds a thruster joystick (which: 'bow' | 'stern', dir: -1 | 1) for `ms` milliseconds of real time. */
export async function holdThruster(page, which, dir, ms) {}
/** M42: chooses a place ('open' | 'marina' | 'bay') in the Place section. */
export async function choosePlace(page, place) {}
/** M44: taps a line action: code ('sp' | 'ss' | 'll' | 'bl' | 'sl'), action ('take' | 'tighten' | 'ease' | 'letGo'). */
export async function lineAction(page, code, action) {}
/** M46: holds the windlass button ('down' | 'up') for `ms` milliseconds of real time. */
export async function holdWindlass(page, dir, ms) {}
```

- A Phase 7 check that needs the boat to move for a while sets the time bar to ×16 through the link (`tx=16`) rather than waiting.
- CI: scenes at phone size, live checks in the parts of `ci.yml`; add the new files to the Phase 7 part (the M40 PR creates a `phase7` part, as M25 did for Phase 5).

## 4. Architecture

### 4.1 New state

```ts
// src/model/motion.ts (M40)
interface BoatState {
  /** Sideways speed of the turning point (cgX), m/s, + = to starboard. Not in the link (0 when a link opens). */
  swayMps: number;
}
interface MotionInputs {
  /** Forces from outside the boat (thrusters, lines, chain, contact, ground), evaluated every substep (M40). */
  external?: (boat: BoatState) => ExternalForces;
}
// src/model/lowSpeed.ts (M40)
export interface ExternalForces { surgeN: number; sideN: number; momentNm: number; contacts?: ContactHit[] /* M43 */ }

// src/app/store.ts
interface AppState {
  thrusters: ThrusterState;          // M41: { bow: -1 | 0 | 1; stern: -1 | 0 | 1 }
  harbour: HarbourState;             // M42: { place: PlaceId; layout: MarinaLayoutId; traffic: TrafficId }
  contact: ContactState;             // M43: { touching: string[]; reports: ContactReport[]; noticeS: number }
  lines: LinesState;                 // M44: { lines: MooringLine[]; crew: CrewTask | null; fouled: boolean }
  anchor: AnchorState;               // M46
}
// src/app/appMode.ts (M41): APP_MODES = ['learn', 'easy', 'realistic', 'harbour']
// src/model/realistic.ts (M46): STATION_IDS = ['port', 'starboard', 'helm', 'mast', 'bow']
```

**Phase 6 provides** (from the contract in `BOAT_DETAILS_ANALYSIS.md` section 6; the refresh check confirms the real names): `AppState.fenders: { out: boolean }`, the action `{ type: 'setFenders'; out: boolean }`, the link key `fd=1` (fenders out), the data `deck.cleats`, `deck.fenders`, `deck.anchor` (geometry), and the registry ids `fit_anchor`, `fit_anchor_chain`, `fit_fender`, `fit_mooring_cleat`, `fit_fairlead`, `fit_bow_roller`, `fit_anchor_windlass`. M43 adds `lost: string[]` to the fender state.

### 4.2 URL keys

| Key | Milestone | Values | Default | Written |
|---|---|---|---|---|
| `m` | M41 | `harbour` (and Phase 5's `learn`) | none | right after `cam`, in Harbour mode |
| `pl` | M42 | `marina`, `bay` (M45) | open water (no key) | after the engine keys, when the place is not open water |
| `ml` | M42 | `tight`, `medium`, `spacious` | `medium` | after `pl`, only with `pl=marina`, when not `medium` |
| `tr` | M42 | `busy`, `half`, `empty` | `half` | after `ml`, only with `pl=marina`, when not `half` |
| `fd` | Phase 6 | `1` = fenders out | in | where Phase 6 put it (the refresh check names the place) |
| `pe`, `pn` | M42 | position east / north, metres, 1 decimal | — | after `tr`, only when `pl` is written |
| `ln` | M44, M45 | lines: `sp:4.2,ss:4.1,ll:21.5` in the marina (10.4), `bl1:3.2`, `sl2:31.5` in the bay (11.4) | none | after `pn`, when a line is on |
| `an`, `ap`, `as` | M46 | chain out (m, 1 decimal); anchor position `east,north` (1 decimal); `1` = set | anchor stowed | after `ln`, when the anchor is not stowed |

Old links (none of these keys): open water, no lines, anchor stowed, sway 0, thrusters off: the same picture as today. `pe`/`pn` are not written in open water, so links of earlier phases keep their exact text. Wrong values are ignored (the default is used), as every other key.

### 4.3 Step order

The `step` action of `store.ts` keeps its order (CODE_MAP, PHASE2_SPEC 4.2); Phase 7 adds:

1. … wind, sea, clock, autopilot, Realistic mode (unchanged).
2. `stepEngine` (unchanged); then **M44** `stepCrew` (crew task timer) and the line-in-propeller check; **M46** `stepWindlass` (chain in or out, before the forces are built).
3. `step` (the rig, unchanged).
4. **Build the external force function** for this frame: `harbourForces(state, frameInputs)` (`src/model/harbourForces.ts`, M41) returns `(boat) => ExternalForces`, summing: thrusters (M41), contact (M43), lines (M44), ground (M45), chain (M46).
5. `stepBoat(…, { …, external }, dt)` (M40 adds the `external` input).
6. **After the boat moved:** M43 `stepContact` (reports from `report.contacts`, fenders lost); M46 `stepAnchor` (dragging, setting, alarm, from the chain pull at the end of the frame); `appendTrack`, `floggingDamage` (unchanged).

### 4.4 Sections and modes (adds to PHASE5_SPEC 4.4)

Phase 5 provides `SECTION_IDS`, `MODE_LAYOUTS`, `sectionAvailable`, `createSection` (PHASE5_SPEC 4.4, 8.4). Phase 7 adds four sections and one mode:

| Section | Milestone | Content | `sectionAvailable` | Title key |
|---|---|---|---|---|
| `thrusters` | M41 | two joysticks (bow, stern) | `settings.ropesMode === 'easy'` | `thrusters.label` |
| `place` | M42 | place chooser, marina layout and traffic, damage report (M43) | always | `place.label` |
| `mooring` | M43 | fenders (M43), lines (M44, M45) | always | `mooring.label` |
| `anchor` | M46 | windlass, chain counter, scope | `settings.ropesMode === 'easy'` | `anchor.label` |

Final `MODE_LAYOUTS` after M46 (each milestone's section gives the table as it is after that milestone):

| Mode | `order` | `open` | `openSide` | `second` |
|---|---|---|---|---|
| `easy` | ropes, sails, autopilot, engine, conditions, learn, legend, place, thrusters, mooring, anchor | ropes, sails | ropes, sails, autopilot, engine | conditions, learn |
| `realistic` | ropes, sails, conditions, learn, legend, autopilot, engine, place, thrusters, mooring, anchor | ropes | ropes, sails | conditions, learn |
| `learn` | learn, legend, ropes, sails, autopilot, engine, conditions, place, thrusters, mooring, anchor | learn | learn, legend | conditions, ropes |
| `harbour` | engine, thrusters, mooring, anchor, place, conditions, sails, ropes, autopilot, learn, legend | engine, thrusters | engine, thrusters, mooring, anchor | place, conditions |

**Harbour and the ropes mode.** Harbour keeps the ropes mode as it is (like Learn). The invariant of PHASE5_SPEC 3.1 becomes: `appMode` is `learn` or `harbour`, or equals `settings.ropesMode`. In Harbour with Realistic ropes, the engine, thruster and anchor sections are unavailable (they are at the Helm and Bow stations, as the engine already is).

### 4.5 Files by milestone

| Milestone | New | Changed |
|---|---|---|
| M40 | `src/model/lowSpeed.ts`, `tests/lowSpeed.test.ts`, `tests/physicsTruths7.test.ts`, `scripts/shots-m40.mjs` | `src/model/motion.ts`, `content/boat/hanse508.json` (`physics.lowSpeed`), `src/ui/debugOverlay.ts`, `scripts/shots.mjs`, `.github/workflows/ci.yml`, both glossaries, `content/registry/parts.json`, `docs/review/ru.md`, `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md` |
| M41 | `src/model/thrusters.ts`, `src/model/harbourForces.ts`, `src/ui/thrusterPanel.ts`, `tests/thrusters.test.ts`, `scripts/shots-m41.mjs` | `src/app/appMode.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/ui/modes.ts`, `src/ui/panel.ts`, `src/ui/quickRow.ts`, `src/ui/modeChip.ts`, `src/ui/realisticPanel.ts` (Helm station), `src/render3d/boat/` (thruster tunnels), `content/boat/hanse508.json` (`physics.thrusters`, `hull.thrusters`), `tests/modes.test.ts`, both `ui.json`, glossaries, registry, `scripts/ui.mjs` |
| M42 | `src/model/places.ts`, `src/model/marina.ts`, `src/render3d/marina.ts`, `src/ui/placePanel.ts`, `tests/marina.test.ts`, `scripts/shots-m42.mjs` | `content/areas/adriatic.json`, `src/model/area.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/ui/mapView.ts`, `src/ui/miniMap.ts`, `src/render3d/scene.ts`, `src/render3d/picking.ts`, `src/ui/modes.ts`, both `ui.json`, glossaries, registry, `scripts/ui.mjs` |
| M43 | `src/model/contact.ts`, `src/ui/damageReport.ts`, `src/ui/mooringPanel.ts`, `tests/contact.test.ts`, `scripts/shots-m43.mjs` | `src/model/lowSpeed.ts` (`contacts`), `src/model/motion.ts` (`report.contacts`), `src/model/harbourForces.ts`, `src/app/store.ts`, `src/ui/placePanel.ts`, `src/ui/modes.ts`, `content/boat/hanse508.json` (`physics.contact`), both `ui.json`, glossaries, registry |
| M44 | `src/model/mooringLines.ts`, `src/render3d/mooringLines.ts`, `tests/mooringLines.test.ts`, `scripts/shots-m44.mjs` | `src/model/harbourForces.ts`, `src/model/marina.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/ui/mooringPanel.ts`, `src/ui/damageReport.ts`, `src/ui/enginePanel.ts`, `src/ui/ropeLegend.ts`, `src/render3d/sceneConfig.ts`, `content/boat/hanse508.json` (`physics.lines`), `content/areas/adriatic.json` (lazy lines), both `ui.json`, glossaries, registry, `scripts/ui.mjs` |
| M45 | `src/model/seabed.ts`, `src/render3d/seabed.ts`, `src/render3d/bay.ts`, `tests/seabed.test.ts`, `scripts/shots-m45.mjs` | `content/areas/adriatic.json` (`bay`), `src/model/places.ts`, `src/model/mooringLines.ts`, `src/model/harbourForces.ts`, `src/ui/instrumentStrip.ts`, `src/ui/mapView.ts`, `src/ui/mooringPanel.ts`, `src/app/urlState.ts`, both `ui.json`, glossaries, registry |
| M46 | `src/model/anchor.ts`, `src/ui/anchorPanel.ts`, `src/render3d/anchorChain.ts`, `tests/anchor.test.ts`, `scripts/shots-m46.mjs` | `src/model/realistic.ts` (Bow station), `src/ui/realisticPanel.ts`, `src/ui/stationDrawing.ts`, `src/model/harbourForces.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/ui/mapView.ts`, `src/ui/modes.ts`, `content/boat/hanse508.json` (`physics.anchor`, station `bow`), both `ui.json`, glossaries, registry, `scripts/ui.mjs` |
| M47 | `scripts/shots-m47.mjs` | `src/ui/mooringPanel.ts` (stern-to with the anchor hint), both `ui.json`, `README.md`, `docs/ROADMAP.md`, `docs/CODE_MAP.md`, this spec |

## 5. Milestones overview

Each milestone is one PR, small enough to check on a phone in 15 minutes. **Independent review: required** means the owner runs `/review <PR>` (new Code session, Opus, high effort) as soon as the PR opens, before testing it on the phone.

| Milestone | Section | What the owner sees | Rules tested | Depends on | Independent review |
|---|---|---|---|---|---|
| M40 | 6 | Stopped in a crosswind she slides sideways and the bow blows off; going astern the stern walks to port; a burst ahead with the wheel over turns her; she keeps moving in neutral | PT-27, PT-47, PT-48, PT-49 | Phase 6 signed off, refresh check | **required** (new motion physics in the shared step; every sailing test must stay green) |
| M41 | 7 | "Harbour ▾" mode; two thruster joysticks spin her or push her sideways; little effect at speed | PT-33 | M40 | **required** (new mode in shared state and links, new forces) |
| M42 | 8 | "Place: Marina" puts her in the fairway; quay, pontoon and moored yachts by layout and traffic; on the map and the mini-map; the link keeps it all | — | M41 | **required** (area data, link keys, old links) |
| M43 | 9 | Bumping the quay or a yacht stops her and a damage report says what, where and how hard; fenders out soften it; fenders left out while sailing are torn off | PT-34, PT-50 | M42 | **required** (contact physics) |
| M44 | 10 | Stern-to: throw the stern lines, pick up the lazy line, tighten it: she lies still in a crosswind; a slack line with the engine in gear stops the engine | PT-51, PT-52 | M43 | **required** (line forces, safety teaching) |
| M45 | 11 | "Place: Bay": depth on the strip, sand, weed and rocks; the keel touches the bottom in the shallows; a shore line to a ring; pick up a mooring buoy | PT-53 | M44 | **required** (depth and grounding physics) |
| M46 | 12 | Anchor section and Bow station: let the chain out, see the scope check, the boat swings head to wind; too little chain on weed in gusts drags, with the alarm | PT-31, PT-54, PT-55, PT-56, PT-57 | M45 | **required** (anchor physics, safety teaching) |
| M47 | 13 | Stern-to with our own anchor; checks and sign-off | — (all earlier rule tests stay green) | M46 | not needed (combines M44 and M46 without new formulas; checks and docs) |

---

## 6. M40: Slow-speed handling

**Independent review: required** (new motion physics inside the shared `stepBoat`; every Phase 1–3 test must stay green)

### 6.1 Files

New: `src/model/lowSpeed.ts`, `tests/lowSpeed.test.ts`, `tests/physicsTruths7.test.ts`, `scripts/shots-m40.mjs`. Changed: `src/model/motion.ts`, `content/boat/hanse508.json`, `tests/motionHelpers.ts` (the helper of 6.7), `src/ui/debugOverlay.ts`, `scripts/shots.mjs`, `.github/workflows/ci.yml` (the `phase7` part), `content/registry/parts.json`, both `glossary.json`, `docs/review/ru.md`, `docs/BOAT_REFERENCE.md` (section 5 rows of 6.2, question 18), `docs/CODE_MAP.md`.

### 6.2 Data (`content/boat/hanse508.json`, new block `physics.lowSpeed`, after `physics.steering`)

```json
"lowSpeed": {
  "cgX": -1.0,
  "cgNote": "assumption: the point she turns about at low speed, 1 m aft of the mast (between the mast and the keel)",
  "steerFullSpeedMps": 0.5,
  "steerFullSpeedAsternMps": 2.5,
  "steerNote": "tunable: below these speeds (ahead / astern) the rudder's steering and the hull's own grip fade linearly to nothing; astern the hull is unstable, so the grip comes back only at 5 kn",
  "swayAddedMassFraction": 0.8,
  "lateralAreaM2": 14,
  "lateralDragCoefficient": 1.2,
  "lateralNote": "assumption: underwater side area (canoe body about 8 m², keel about 3.5 m², rudder 1.5 m², saildrive) and its drag pushed broadside",
  "keelLiftNPerMps2": 9000,
  "keelLiftNote": "assumption: with way on, the keel resists sliding: sideways force per (m/s ahead × m/s sideways), ½·ρ·(keel + rudder area ≈ 5 m²)·lift slope 3.5 per radian",
  "swayLinearDragNPerMps": 400,
  "radiusOfGyrationM": 3.9,
  "yawAddedInertiaFraction": 0.6,
  "yawLinearDampingNmPerRadS": 2000,
  "windageSideAreaM2": 32,
  "windageSideDragCoefficient": 1.0,
  "windageSideNote": "assumption: side area above the water (hull about 22 m², coachroof and sprayhood 3 m², mast 5 m², furled sails and rails 2 m²)",
  "windageArmM": 0.3,
  "windageArmSwingM": 1.2,
  "windageArmNote": "tunable: where the side wind acts, ahead of the turning point: windageArmM + windageArmSwingM·cos(apparent wind angle). Wind from ahead acts far forward (the bow blows off), from astern behind the turning point; she lies with the wind about 105° off the bow",
  "windageFadeSpeedMps": 1.0,
  "propWalkFraction": 0.2,
  "propWalkSide": 1,
  "propWalkNote": "assumption: going astern the propeller pushes the stern sideways with this share of the astern thrust; propWalkSide 1 = the stern goes to port (right-handed propeller, skipper question 18), -1 = to starboard",
  "propWalkFadeSpeedMps": 2.0,
  "propWashFraction": 0.5,
  "propWashFadeSpeedMps": 2.0,
  "propWashNote": "tunable: ahead, the propeller blows this share of its thrust over the rudder, so the rudder turns her before she has way on (a 'kick ahead')"
}
```

All values are assumptions (rows in BOAT_REFERENCE section 5, "Phase 7: slow-speed handling"). The keys marked tunable in their notes are the only ones a failing band may change (section 0).

### 6.3 Model

**`src/model/lowSpeed.ts`** (new, pure): `ExternalForces`, `forceAt`, `addForces`, `pointToMap`, `pointVelocity`, `vectorToBoat` (3.2), and:

```ts
export interface ExternalForces { surgeN: number; sideN: number; momentNm: number }
export const NO_FORCES: ExternalForces; // all 0
/** Mass pushed sideways, kg: boatMassKg·(1 + swayAddedMassFraction). */
export function swayMassKg(data?: BoatData): number;
/** Inertia about the turning point, kg·m²: boatMassKg·radiusOfGyrationM²·(1 + yawAddedInertiaFraction). */
export function yawInertiaKgM2(data?: BoatData): number;
/** The quadratic yaw drag of the hull turning on the spot, N·m per (rad/s)²: ½·ρw·Cd·(lateralAreaM2 / lwl)·lwl⁴ / 32. */
export function yawQuadDragNm(data?: BoatData): number;
/** How much the rudder and hull grip at this speed (0 … 1): min(1, |u| / steerFullSpeed(Astern)Mps). */
export function steerShare(speedMps: number, data?: BoatData): number;
/** The low-speed forces of the hull itself (wind on the hull and rig, prop walk, prop wash), boat frame. */
export function hullLowSpeedForces(
  speedMps: number, swayMps: number, twsKn: number, twaDeg: number,
  engineThrustN: number, rudderDeg: number, data?: BoatData,
): ExternalForces & { awaHullDeg: number };
```

`hullLowSpeedForces` (all with `u = speedMps`, `v = swayMps`; `ls = data.physics.lowSpeed`):

- Hull wind: `hw = apparentWind(twsKn, twaDeg, u, data, v)`; `q = ½·airDensity·(hw.awsKn·knotMps)²`.
- `fadeW = max(0, 1 − |u| / ls.windageFadeSpeedMps)`.
- Side wind: `windN = −q·ls.windageSideAreaM2·ls.windageSideDragCoefficient·sin(hw.awaDeg·DEG)·fadeW` (wind from starboard, `awa > 0`, pushes to port).
- Its arm ahead of the turning point: `arm = ls.windageArmM + ls.windageArmSwingM·cos(hw.awaDeg·DEG)`.
- Prop walk (astern only, `T = engineThrustN < 0`): `walkN = −ls.propWalkSide·ls.propWalkFraction·|T|·max(0, 1 − |u| / ls.propWalkFadeSpeedMps)`, at `xp = hull.saildrive.x`. Ahead or neutral: 0.
- Prop wash (ahead only, `T > 0`): `washN = −ls.propWashFraction·T·sin(rudderDeg·DEG)·max(0, 1 − |u| / ls.propWashFadeSpeedMps)`, at `xr = hull.rudder.stockX`. Astern or neutral: 0.
- Result: `surgeN = 0`; `sideN = windN + walkN + washN`; `momentNm = arm·windN + (xp − cgX)·walkN + (xr − cgX)·washN`; `awaHullDeg = hw.awaDeg`.

Checks of the signs: wheel to starboard (`rudderDeg > 0`) with thrust ahead gives `washN < 0` at the stern, so `momentNm > 0` (she turns to starboard, as she does with way on). Astern with `propWalkSide = 1` gives `walkN < 0` (stern to port) and `momentNm > 0` (bow to starboard).

**`src/model/motion.ts`** changes:

- `BoatState.swayMps` (4.1); `initialBoat` sets it to 0. `MotionInputs.external?: (boat: BoatState) => ExternalForces`.
- `MotionReport` gains `swayMps`, `lowSpeed: ExternalForces` (the hull's own low-speed forces of the last substep) and `external: ExternalForces` (the external function's result in the last substep; `NO_FORCES` without one). Held still: both `NO_FORCES`, `swayMps` 0.
- In each substep (not Held still), in this order:
  1. `ext = inputs.external ? inputs.external(now) : NO_FORCES`, where `now` is the boat as it stands at the start of the substep (every field of `BoatState` from the loop's local variables, including `swayMps`, `eastM`, `northM`).
  2. The sails' apparent wind gets the sway as well: the `sideMps` argument becomes `rocking.sideMps + swayMps`.
  3. Surge as today with `push = driveN + windageN + engineThrustN + ext.surgeN` (the zero-crossing rule uses the same `push`).
  4. Roll, grip, `effectiveRudderDeg`, `waveYaw` and `rTarget` as today (with the new `speedMps`).
  5. `low = hullLowSpeedForces(speedMps, swayMps, inputs.twsKn, twaDeg, inputs.engineThrustN, inputs.rudderDeg, data)`.
  6. Sway: `drag = (keelLiftNPerMps2·|u| + swayLinearDragNPerMps)·v + ½·ρw·lateralDragCoefficient·lateralAreaM2·|v|·v`; `v += ((low.sideN + ext.sideN − drag) / swayMassKg)·h`.
  7. Yaw: `w = steerShare(u)`, `s = 1 − w`, `r0 = yawRateDegS·DEG`; `r = r0 + w·(rTarget − r0)·(1 − exp(−h / yawLagS))`; then `r += ((low.momentNm + ext.momentNm − s·(yawLinearDampingNmPerRadS·r + yawQuadDragNm·|r|·r)) / yawInertiaKgM2)·h`; `yawRateDegS = r / DEG`.
  8. `headingDeg = wrap360(headingDeg + yawRateDegS·h)`; with `ψ` the new heading in radians and `vo = v + r·(−cgX)` (the mast's sideways speed): `eastM += (u·sin ψ + vo·cos ψ)·h`, `northM += (u·cos ψ − vo·sin ψ)·h`.
  9. Round-up and the report as today.
- Above `steerFullSpeedMps` ahead (`w = 1`, `s = 0`) with no external forces and the engine not ahead below 2 m/s, the yaw is exactly today's; the side wind is 0 above 1 m/s. That is why sailing is unchanged.
- `steadyState` is unchanged (it never sways).

**Edge cases:** zero wind → `q = 0`, no side wind; Held still → nothing of this runs (the early `break` as today) and `swayMps` stays as it was (0); `twsKn = 0` and engine off → a sliding boat slows by `drag` alone; NaN guard: `apparentWind` already returns `awaDeg = twaDeg` for a zero wind.

**Debug overlay** (`debugOverlay.ts`): one more line `sway <v kn> · yaw <r °/s> · ext <surgeN>/<sideN> N`.

### 6.4 Store and URL

Nothing new in the state but `boat.swayMps`. Links: `swayMps` is not written; a link opens with 0. `reset` and `load` give 0. The `step` action passes no `external` yet (M41 adds it).

### 6.5 Strings and registry

Registry (both `status: "draft"`, `phase: 7`, `kind: "term"`, `group: "sailing"`):

- `term_prop_walk`: related `part_saildrive`, `engine_control`; `showMe`: `?wd=0&ws=0&mf=0&jf=0&js=100&bs=0&ap=off&eng=1&lv=-50&cam=top&sea=flat`.
- `term_windage`: related `env_wind`, `part_hull`; `showMe`: `?wd=45&ws=15&mf=0&jf=0&js=100&bs=0&ap=off&cam=top&sea=flat`.

Glossary (English final; Russian drafts):

| Id | Field | English | Russian (draft) |
|---|---|---|---|
| `term_prop_walk` | name | Prop walk | Заброс кормы |
| | alternatives | paddle-wheel effect | эффект гребного винта |
| | short | Going astern, the propeller pushes the stern sideways. | На заднем ходу винт уводит корму в сторону. |
| | what | A propeller does not only push backwards: going astern it also pushes the stern to one side, most when she has no way on yet. Which side depends on which way the propeller turns. Skippers use it: with the stern walking to port, they come alongside port side to. | Винт не только толкает назад: на заднем ходу он уводит корму в сторону, сильнее всего, пока лодка ещё стоит. Сторона зависит от направления вращения винта. Шкиперы этим пользуются: если корму уводит влево, швартуются левым бортом. |
| | onThisBoat | A saildrive with a fixed two-blade propeller. In the app the stern walks to port going astern (an assumption until the skipper checks): about 6° of turn in 15 s at half astern. A saildrive walks less than a shaft drive. | Саилдрайв с фиксированным двухлопастным винтом. В приложении на заднем ходу корму уводит влево (предположение, пока шкипер не проверит): около 6° за 15 с на половине заднего хода. Саилдрайв даёт меньший заброс, чем вал. |
| | mistakes | "Reversing straight into a berth and being surprised that she turns." / "Expect the walk: start the turn early, or use a short burst ahead with the wheel over to correct." | «Идти задним ходом прямо в место и удивляться, что лодку разворачивает.» / «Учитывайте заброс: начинайте поворот раньше или поправляйте коротким импульсом вперёд с переложенным рулём.» |
| | showMe | No wind, engine half astern from a standstill: watch the bow swing to starboard as the stern walks to port. | Без ветра, половина заднего хода с места: нос уходит вправо, корму уводит влево. |
| `term_windage` | name | Windage | Парусность корпуса |
| | alternatives | — | — |
| | short | The wind's push on the hull, mast and furled sails. | Давление ветра на корпус, мачту и свёрнутые паруса. |
| | what | Even with the sails rolled away, the wind pushes on everything above the water. With way on, the keel holds her straight. Below about two knots it no longer does: she slides sideways, and the bow, high and light, blows downwind faster than the stern, until she lies about beam-on. | Даже со свёрнутыми парусами ветер давит на всё, что над водой. На ходу киль держит лодку. Медленнее примерно двух узлов уже нет: лодку сносит боком, а высокий лёгкий нос уваливается под ветер быстрее кормы, пока она не встанет примерно лагом. |
| | onThisBoat | High topsides, a 20 m mast and the furled main inside it: in 15 kn from the side she drifts at about half a knot, and in 30 s the bow falls off about 30°. | Высокий борт, мачта 20 м и грот, свёрнутый внутри неё: при 15 узлах сбоку её сносит примерно на пол-узла, а за 30 с нос уваливается примерно на 30°. |
| | mistakes | "Stopping in the fairway to wait: the bow blows off and she drifts onto the moored boats." / "Keep a little way on, or hold her with the engine and the thrusters." | «Остановиться в проходе и ждать: нос уваливается, и лодку сносит на стоящие яхты.» / «Держите небольшой ход или удерживайте лодку двигателем и подруливающими устройствами.» |
| | showMe | Sails rolled away, wind 15 kn from 45° on the starboard bow, standing still: the bow blows off to port. | Паруса свёрнуты, ветер 15 узлов 45° справа по носу, лодка стоит: нос уваливается влево. |

(`mistakes` is one entry: the text before "/" is `mistake`, after it `fix`.)

### 6.6 Tests

`tests/lowSpeed.test.ts`:

1. `forceAt`: (fx 0, fz 100 N) at x = 6.9 → `momentNm` = 790 (= (6.9 + 1.0)·100); at x = −8.0 → −700; (fx 100, fz 0) at z = 2 → −200. `addForces()` is all 0.
2. `pointVelocity`: boat at rest with `yawRateDegS = 10`: the point x = 6.9 moves at `(6.9 + 1.0)·10·DEG` = 1.379 m/s to starboard (heading 0: east +1.379, north 0, ±0.001).
3. `hullLowSpeedForces`: twsKn 15, twaDeg 90, u = v = 0, no engine: `sideN` in [−1,200, −1,135] (q = 36.47 Pa × 32 m² = 1,167 N), `momentNm` = `arm·sideN` with `arm` = 0.3 + 1.2·cos(90°) = 0.3 (±0.001); at u = 1.0 m/s the side wind is 0.
4. Prop walk sign: T = −1,000 N, u = 0 → `sideN` = −200, `momentNm` = +680 (= (−4.4 + 1.0)·−200); `propWalkSide = −1` flips both. T = +1,000 → no walk.
5. Prop wash sign: T = +1,000, rudderDeg 35, u = 0 → `sideN` = −286.8 (±0.5), `momentNm` = +1,936 (±3) (= (−7.75 + 1.0)·−286.8).
6. **Sailing unchanged:** beam reach, 15 kn, sails out (`ctl_main_furl: 100, ctl_jib_furl: 100, ctl_mainsheet: 30, ctl_jib_sheet: 30`), steady speed, autopilot off, 60 s at 60 fps: `|swayMps| < 1e-6` in every frame.

`tests/physicsTruths7.test.ts` (Phase 7 rules; every run uses `harbourStart` of 6.7 and `run(state, seconds)` of `tests/motionHelpers.ts` at 60 fps; prototype values in brackets):

- **PT-47** side wind: wind 90°, 15 kn, at rest, engine off: after 30 s `swayMps` in [−0.40, −0.24] (−0.312) and `wrap180(headingDeg)` in [−18, −9] (−13.1); after 300 s she lies with the true wind angle `wrap180(controls.ctl_wind_dir − headingDeg)` in [96, 116] (106). Also `|sway|` at 30 s grows with the wind: 10 kn (−0.206) < 15 kn < 20 kn (−0.395) in size.
- **PT-47** bow blows off: wind 45°, 15 kn, at rest: after 30 s `wrap180(headingDeg)` in [−40, −25] (−32.3); wind −45° gives the mirror (equal size, opposite sign, within 0.01°).
- **PT-27** prop walk: no wind, engine running, lever −50, at rest: after 15 s `wrap180(headingDeg)` in [4.0, 8.5] (6.21), `speedMps` < 0; lever −30: [2.5, 6.0] (4.28); with `physics.lowSpeed.propWalkSide = −1` (set on a copy of the boat data, or restored in `finally`) the heading after 15 s at lever −50 is the mirror within 0.01°. Lever +50 with the wheel at 0: `|wrap180(headingDeg)|` < 0.01 after 15 s.
- **PT-48** kick ahead: no wind, engine running in neutral, `ctl_rudder` 35, at rest: 1 s, lever 60 for 3 s, lever 0 for 5 s: heading in [4.5, 8.5] (6.52) while the speed is in [0.45, 0.75] kn (0.60); the same with `ctl_rudder` 0 gives `|heading| < 0.01`; with `ctl_rudder` −35 the mirror; with `propWashFraction = 0` the heading is below 4.0 (2.95).
- **PT-49** carrying way: no wind, engine running in neutral, starting at 4 kn (`speedMps` 4 × 0.514444): the time until the speed drops below 0.5 kn is in [190, 270] s (229) and she runs [140, 200] m (171) in that time. With the lever at −50 from 4 kn she stops (`speedMps ≤ 0`) within [21, 30] s (25.5) and [20, 29] m (24.4).

All Phase 1–3 tests unchanged.

### 6.7 Test helper (`tests/motionHelpers.ts`)

```ts
/** A boat at rest (or at `speedKn`) with the sails away and the autopilot off (PHASE7_SPEC 6.7). */
export function harbourStart(o: { windDirDeg?: number; twsKn?: number; speedKn?: number; rudderDeg?: number; engine?: { running: boolean; leverPct: number }; headingDeg?: number }): AppState;
```

`initialState({ controls: { ctl_wind_dir: windDirDeg ?? 0, ctl_wind_speed: twsKn ?? 0, ctl_main_furl: 0, ctl_jib_furl: 0, ctl_jib_sheet: 100, ctl_rudder: rudderDeg ?? 0 }, boat: { mode: 'sailing', headingDeg: headingDeg ?? 0, speedMps: (speedKn ?? 0)·0.514444 }, engine })`, then `autopilot.mode = 'off'` (a copy of the state with `autopilot: { ...autopilot, mode: 'off' }`). Lever changes inside a test: `act(state, { type: 'engine', command: { leverPct } })`.

### 6.8 Browser checks (`scripts/shots-m40.mjs`)

Scenes (phone size; 6–10 PNGs looked at by the builder):

| Name | Link | What it shows |
|---|---|---|
| `drift-beam` | `?wd=90&ws=15&mf=0&jf=0&js=100&bs=0&ap=off&cam=top&tx=16` after 4 s | the boat turned with the bow to port of north, the track sliding west |
| `bow-off` | `?wd=45&ws=15&mf=0&jf=0&js=100&bs=0&ap=off&cam=top&tx=16` after 4 s | the bow turned to port |
| `prop-walk` | `?wd=0&ws=0&mf=0&jf=0&js=100&bs=0&ap=off&eng=1&lv=-50&cam=top&tx=4` after 4 s | the bow to starboard of north |

Live checks:

1. `m40 drift`: open `drift-beam`'s link without `tx`; set ×16 in the time bar; wait 3 s; read the debug overlay (`debug=1` in the link): the sway reads a negative value; the heading on the instrument strip is between 330° and 359°.
2. `m40 sailing unchanged`: `?wd=90&ws=15&ms=30&js=30&ap=off&debug=1`: after 5 s the debug line's sway is `0.0 kn`.

### 6.9 Done when

Section 6.6 passes with every earlier test; the debug overlay shows the sway; the browser checks pass; the owner sees the drift, the bow blowing off, the prop walk and the kick ahead on the phone (WORKFLOW checklist).

### 6.10 Not in M40

Thrusters, places, lines, anchor, contact (later milestones); any visible control (M40 adds no button); the side the stern really walks to (skipper question 18; one data value).

### 6.11 Decided in the M40 PR

(empty)

---

## 7. M41: Thrusters and Harbour mode

**Independent review: required** (a new mode in the shared state and the links, new forces through the M40 hook)

### 7.1 Files

New: `src/model/thrusters.ts`, `src/model/harbourForces.ts`, `src/ui/thrusterPanel.ts`, `src/render3d/boat/thrusters.ts`, `tests/thrusters.test.ts`, `scripts/shots-m41.mjs`. Changed: `src/app/appMode.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/app/urlSync.ts`, `src/ui/modes.ts`, `src/ui/panel.ts`, `src/ui/quickRow.ts`, `src/ui/modeChip.ts`, `src/ui/realisticPanel.ts`, `src/render3d/boat/index.ts`, `content/boat/hanse508.json`, `tests/modes.test.ts`, `tests/urlState.test.ts`, `tests/physicsTruths7.test.ts`, both `ui.json`, both glossaries, `docs/review/ru.md`, the registry, `scripts/ui.mjs`, `scripts/shots.mjs`, `docs/BOAT_REFERENCE.md` (question 10, section 5 rows), `docs/CODE_MAP.md`.

### 7.2 Data (`content/boat/hanse508.json`)

In `hull` (after `saildrive`):

```json
"thrusters": [
  { "id": "part_bow_thruster", "end": "bow", "kind": "tunnel", "x": 4.3, "diameter": 0.2 },
  { "id": "part_stern_thruster", "end": "stern", "kind": "pod", "x": -6.2, "diameter": 0.25, "podLength": 0.6 }
],
"thrustersSource": "owner (one at each end, two left-right joysticks at the helm, 2026-10-15); places and sizes: assumption"
```

In `physics` (after `lowSpeed`):

```json
"thrusters": {
  "bowThrustN": 1300,
  "sternThrustN": 1000,
  "thrustNote": "assumption: about 130 kgf at the bow and 100 kgf at the stern, usual sizes for a 50 ft yacht (skipper question 10: power)",
  "speedFactorByKn": [[0, 1], [1, 0.9], [2, 0.6], [3, 0.4], [4, 0.3], [6, 0.2]],
  "speedFactorNote": "assumption (PT-33): a tunnel thruster loses most of its push once water flows past the hull"
}
```

The tunnel's centre height is computed, not stored: bow tunnel `y = keelLineAt(x) / 2` (halfway between the waterline and the hull bottom; −0.15 m at x = 4.3); stern pod `y = keelLineAt(x) − 0.15` (`keelLineAt` in `src/model/hullShape.ts`). The stern thruster is a pod under the hull because the hull bottom aft of x = −6.5 is less than 0.2 m below the waterline.

### 7.3 Model

`src/model/thrusters.ts` (pure):

```ts
export type ThrustDir = -1 | 0 | 1;
export interface ThrusterState { bow: ThrustDir; stern: ThrustDir }
export const THRUSTERS_OFF: ThrusterState; // { bow: 0, stern: 0 }
/** The share of the thrust left at this boat speed (speedFactorByKn, by |speedMps| in knots). */
export function thrusterSpeedFactor(speedMps: number, data?: BoatData): number;
/** Both thrusters' push on the boat now (boat frame), at their x on the centreline. */
export function thrusterForces(t: ThrusterState, boat: BoatState, data?: BoatData): ExternalForces;
```

`thrusterForces`: `f = thrusterSpeedFactor(boat.speedMps)`; bow `fb = t.bow·bowThrustN·f` at `x = hull.thrusters[bow].x`, stern `fs = t.stern·sternThrustN·f` at the stern x; result `addForces(forceAt(xb, 0, 0, fb), forceAt(xs, 0, 0, fs))`. A `+1` pushes that end to starboard.

`src/model/harbourForces.ts` (pure; grows in M43–M46):

```ts
export interface HarbourInputs { thrusters: ThrusterState }
/** The external force function for one frame (PHASE7_SPEC 4.3 step 4). */
export function harbourForces(inputs: HarbourInputs, data?: BoatData): (boat: BoatState) => ExternalForces;
```

M41: `(boat) => thrusterForces(inputs.thrusters, boat, data)`.

### 7.4 Store and URL

- `AppState.thrusters: ThrusterState`; `initialState`, `reset` and `load`: `THRUSTERS_OFF`. Not in the link.
- Action `{ type: 'thruster'; which: 'bow' | 'stern'; dir: ThrustDir }`: sets that thruster; returns the same state if unchanged.
- `step`: passes `external: harbourForces({ thrusters: state.thrusters })` to `stepBoat` (only when a thruster is on; otherwise `undefined`, so open-water sailing does no extra work).
- **Harbour mode.** `APP_MODES = ['learn', 'easy', 'realistic', 'harbour']`. `setAppMode('harbour')` → `appMode: 'harbour'`, the ropes mode kept (as Learn). `setRopesMode` sets `appMode` to the ropes mode only when `appMode` is not `learn` or `harbour`. `initialState`: `overrides.appMode` if it is `learn` or `harbour`, otherwise the ropes mode. `reset`: `easy`, as Phase 5.
- **URL:** parse `m=harbour` → Harbour (before the `learn=` rule: `m=harbour` wins over a `learn=` key; `learn` is then dropped). Serialize `m=harbour` right after `cam` in Harbour mode. `urlSync.openScene` and the Practice button keep Harbour as they keep Learn (`appMode: state.appMode === 'learn' || state.appMode === 'harbour' ? state.appMode : next.appMode`).

### 7.5 Sections and modes (`src/ui/modes.ts`)

`SECTION_IDS` gains `'thrusters'` (last). `sectionAvailable('thrusters')`: `settings.ropesMode === 'easy'`. `MODE_LAYOUTS` after M41:

| Mode | `order` | `open` | `openSide` | `second` |
|---|---|---|---|---|
| `easy` | ropes, sails, autopilot, engine, conditions, learn, legend, thrusters | ropes, sails | ropes, sails, autopilot, engine | conditions, learn |
| `realistic` | ropes, sails, conditions, learn, legend, autopilot, engine, thrusters | ropes | ropes, sails | conditions, learn |
| `learn` | learn, legend, ropes, sails, autopilot, engine, conditions, thrusters | learn | learn, legend | conditions, ropes |
| `harbour` | engine, thrusters, conditions, sails, ropes, autopilot, learn, legend | engine, thrusters | engine, thrusters, conditions | conditions, learn |

`tests/modes.test.ts`: the existing checks (every id once in `order`, `second` has 2 entries, `open` ⊆ `order`) now run over four modes; add: Harbour keeps the ropes mode (`setAppMode('harbour')` from Realistic leaves `settings.ropesMode === 'realistic'`).

### 7.6 UI

**Thruster section** (`src/ui/thrusterPanel.ts`): `createThrusterPanel(store: Store): HTMLElement[]` returns, in order: the bow joystick, the stern joystick, a status line `thrusters-status` (live, no `explain`), and the explanation `p.explain` with `thrusters.hint`.

**Joystick** (`createThrusterJoystick(store: Store, which: 'bow' | 'stern', compact: boolean): HTMLElement`):

```html
<div class="thruster-joystick" data-testid="thruster-bow" data-part-id="part_bow_thruster" data-dir="0" role="group" aria-label="Bow thruster">
  <span class="joystick-label">Bow</span>              <!-- not in the compact one -->
  <div class="joystick-track">
    <button type="button" class="joystick-half" data-testid="thruster-bow-port" aria-label="Bow thruster: push the bow to port">◀</button>
    <span class="joystick-knob" aria-hidden="true"></span>
    <button type="button" class="joystick-half" data-testid="thruster-bow-starboard" aria-label="Bow thruster: push the bow to starboard">▶</button>
  </div>
</div>
```

- Track 132 × 44 px (compact: 80 × 44); each half button covers half the track (the hold zones), the glyph at its outer end. The knob (24 px circle) sits in the middle at `data-dir="0"` and moves to the pressed end (`translateX(±(trackWidth/2 − 16px))`, 100 ms).
- Hold-to-act (3.1): `pointerdown` on a half → `setPointerCapture`, dispatch `thruster` with −1 or +1; `pointerup` / `pointercancel` / `lostpointercapture` / `blur` → dispatch 0. Keyboard on a focused half: keydown Space / Enter → on, keyup → 0. `document` `visibilitychange` to hidden and `window` `blur` → both thrusters 0 (one listener, in `thrusterPanel.ts`).
- The joystick follows `state.thrusters` (`data-dir`, `aria-pressed` on the halves), so the section, the quick row and the Helm station stay in step.
- Status line: both off → `thrusters.off`; otherwise `thrusters.on` with the parts that run (`thrusters.bowPort`, … joined with ", "), and, when `thrusterSpeedFactor(speed) < 0.5`, `thrusters.weak` appended.

**Mode chip:** a fourth item `mode-option-harbour` with `t('mode.harbour')` and the hint `t('mode.harbour.hint')`.

**Quick row in Harbour mode** (`quickRow.ts`): `[−] <Engine value> [+]` then the two compact joysticks. − / + change `engine.leverPct` by 10 (clamped to ±100) with the `engine` action; the value text is `t('quick.harbour.lever', { value })` with `value` = `t('engine.ahead')`/`t('engine.astern')` + ` ` + |lever| %, or `t('engine.neutral')` inside the neutral band; with the engine stopped the buttons are disabled and the value is `t('quick.harbour.engineOff')`. Test ids: `quick-lever-less`, `quick-lever-value`, `quick-lever-more`; the compact joysticks keep `thruster-bow` / `thruster-stern` test ids **with the suffix `-quick`** (`thruster-bow-quick`, `thruster-bow-quick-port`, …) so ids stay unique. Width at 360 px: 44 + 48 + 44 + 80 + 80 + 4 gaps of 8 = 328 px.

**Realistic mode, Helm station** (`realisticPanel.ts`): under the engine lever, a block `thruster-helm` with both joysticks (not compact) and test ids suffixed `-helm`.

**3D** (`src/render3d/boat/thrusters.ts`, added by `boat/index.ts`): the bow tunnel as two dark discs (diameter 0.2 m) flush with the hull on both sides at (4.3, −0.15, ±halfwidth of the hull at that height, from `sectionPoint`) and a dark cylinder through the hull between them; the stern pod as a grey cylinder (diameter 0.25, length 0.6, axis across the boat) under the hull at (−6.2, keelLineAt − 0.15, 0) on a short strut to the hull. Both carry their registry ids for picking. While a thruster runs, a white translucent cone (length 0.8 m, opacity 0.5) shows the water jet leaving on the side opposite to the push (pushing the bow to starboard blows water out to port).

### 7.7 Strings and registry

Registry (`kind: "part"`, `group: "hull"`, `phase: 7`, `status: "draft"`, `sources: ["owner"]`): `part_bow_thruster` (related `part_stern_thruster`, `part_bow`; `showMe`: `?m=harbour&wd=0&ws=0&mf=0&jf=0&js=100&bs=0&ap=off&eng=1&lv=0&cam=top&sel=part_bow_thruster`), `part_stern_thruster` (related `part_bow_thruster`, `part_stern`; same `showMe` with its own `sel`).

UI strings (`ui.json`; Russian drafts):

| Key | English | Russian (draft) |
|---|---|---|
| `mode.harbour` | Harbour | Гавань |
| `mode.harbour.hint` | Engine, thrusters, lines and anchor first | Сначала двигатель, подруливающие, швартовы и якорь |
| `thrusters.label` | Thrusters | Подруливающие устройства |
| `thrusters.bow` | Bow | Нос |
| `thrusters.stern` | Stern | Корма |
| `thrusters.bowGroup` | Bow thruster | Носовое подруливающее устройство |
| `thrusters.sternGroup` | Stern thruster | Кормовое подруливающее устройство |
| `thrusters.bowPortAria` | Bow thruster: push the bow to port | Носовое подруливающее: нос влево |
| `thrusters.bowStarboardAria` | Bow thruster: push the bow to starboard | Носовое подруливающее: нос вправо |
| `thrusters.sternPortAria` | Stern thruster: push the stern to port | Кормовое подруливающее: корму влево |
| `thrusters.sternStarboardAria` | Stern thruster: push the stern to starboard | Кормовое подруливающее: корму вправо |
| `thrusters.off` | Thrusters off. Hold a joystick to the side you want that end to go. | Подруливающие выключены. Держите джойстик в ту сторону, куда должен пойти нос или корма. |
| `thrusters.on` | Running: {parts} | Работают: {parts} |
| `thrusters.bowPort` | bow to port | нос влево |
| `thrusters.bowStarboard` | bow to starboard | нос вправо |
| `thrusters.sternPort` | stern to port | корма влево |
| `thrusters.sternStarboard` | stern to starboard | корма вправо |
| `thrusters.weak` | (little effect at this speed) | (на такой скорости почти не действуют) |
| `thrusters.hint` | A thruster is a propeller in a tunnel across the hull (thruster: a small sideways propeller). It pushes one end of the boat sideways while you hold the joystick. Bow and stern the same way move her sideways; opposite ways turn her on the spot. They only work well below 2 knots. | Подруливающее устройство: винт в туннеле поперёк корпуса. Пока вы держите джойстик, оно толкает нос или корму вбок. Нос и корма в одну сторону: лодка идёт лагом; в разные стороны: разворачивается на месте. Хорошо работают только медленнее 2 узлов. |
| `quick.harbour.lever` | Engine: {value} | Двигатель: {value} |
| `quick.harbour.engineOff` | Engine off | Двигатель выключен |

The `aria-label` of each group is `thrusters.bowGroup` / `thrusters.sternGroup`; the half buttons' are the four `*Aria` keys.

Glossary (English final; Russian drafts). In this table and the later glossary tables each cell is `English / Russian`; in `mistakes`, `→` separates the mistake from its fix.

| Id | name | alternatives | short | what | onThisBoat | mistakes (mistake / fix) | showMe |
|---|---|---|---|---|---|---|---|
| `part_bow_thruster` | Bow thruster / Носовое подруливающее устройство | bow prop / подруливающее, «подрулька» | A small propeller in a tunnel across the bow that pushes the bow sideways. / Небольшой винт в туннеле поперёк носа, толкающий нос вбок. | It pushes the bow to port or starboard while the joystick is held. It is strong when the boat is nearly stopped and weak once she moves faster than about 2 knots, because the water flowing past carries its jet away. / Пока джойстик удерживается, оно толкает нос влево или вправо. Сильно, когда лодка почти стоит, и слабо, если она идёт быстрее примерно 2 узлов: набегающая вода сносит струю. | A tunnel about 2 m behind the stem, worked with the left joystick at the helm (owner). In the app it pushes about 130 kgf (an assumption). / Туннель примерно в 2 м за форштевнем, управляется левым джойстиком у штурвала (владелец). В приложении тяга около 130 кгс (предположение). | Holding it at speed and wondering why nothing happens. → Slow down first, then use short bursts. / Держать его на ходу и удивляться, что ничего не происходит. → Сначала сбросьте ход, затем используйте короткие импульсы. | No wind, standing still: hold the bow joystick to starboard and watch her turn. / Без ветра, лодка стоит: держите носовой джойстик вправо и смотрите, как она разворачивается. |
| `part_stern_thruster` | Stern thruster / Кормовое подруливающее устройство | — / — | A small propeller under the stern that pushes the stern sideways. / Небольшой винт под кормой, толкающий корму вбок. | It moves the stern to port or starboard. Used with the bow thruster it turns the boat on the spot or moves her sideways towards the quay. / Двигает корму влево или вправо. Вместе с носовым разворачивает лодку на месте или ведёт её лагом к причалу. | A pod under the hull aft (an assumption: the hull is too shallow there for a tunnel), worked with the right joystick at the helm (owner). About 100 kgf in the app. / Гондола под корпусом в корме (предположение: там корпус слишком мелкий для туннеля), управляется правым джойстиком у штурвала (владелец). В приложении около 100 кгс. | Counting on both thrusters against a strong crosswind. → In strong wind they are not enough: plan the approach so the wind helps, or keep way on. / Рассчитывать на оба подруливающих против сильного бокового ветра. → В сильный ветер их не хватает: заходите так, чтобы ветер помогал, или держите ход. | No wind, standing still: hold both joysticks to starboard: she moves sideways. / Без ветра, лодка стоит: держите оба джойстика вправо: лодка идёт лагом. |

### 7.8 Tests

`tests/thrusters.test.ts`:

1. `thrusterSpeedFactor`: 0 kn → 1; 1.5 kn → 0.75; 4 kn → 0.3; 10 kn → 0.2.
2. `thrusterForces`, at rest: bow +1 → `sideN` 1,300, `momentNm` 6,890 (= (4.3 + 1.0)·1,300); stern +1 → 1,000 and −5,200; bow +1, stern −1 → `sideN` 300, `momentNm` 12,090.
3. Store: `thruster` action sets and clears; `reset` and `load` give `THRUSTERS_OFF`; Held still with a thruster on: the boat does not move in 5 s.
4. URL: `m=harbour` round-trips; `?m=harbour&learn=part_boom` opens in Harbour without `learn`; a link without `m` is unchanged (existing tests).

`tests/physicsTruths7.test.ts` (prototype values in brackets; `harbourStart` with no wind and the thrusters set in the state):

- **PT-33** thrusters at rest: bow +1 for 10 s → heading in [28, 44] (36.0), `swayMps` > 0; stern +1 → [−36, −22] (−29.0); bow +1 and stern −1 → [44, 64] (54.2); both +1 → `|heading|` < 16 (11.1) and `swayMps` in [0.35, 0.55] m/s (0.88 kn = 0.45 m/s).
- **PT-33** fades with speed: from 4 kn with the lever at 40, the heading change made by bow +1 over 10 s (compared with the same run without it) is less than 0.2 × the change at rest (3.68° against 36.0°).
- **PT-33** against the wind: wind from 270 (`ctl_wind_dir` −90), both thrusters −1 for 30 s: at 10 kn `eastM` < 0 (−9.7: they win), at 25 kn `eastM` > 0 (+5.7: the wind wins).

### 7.9 Browser checks (`scripts/shots-m41.mjs`)

Helper `holdThruster(page, which, dir, ms)` (3.6): `pointerdown` on `thruster-<which>-<port|starboard>` (the section's), waits `ms`, `pointerup`.

Scenes: `harbour-mode` (`?m=harbour&wd=0&ws=0&mf=0&jf=0&js=100&bs=0&ap=off&eng=1&lv=0&cam=top`: the sheet at half shows Engine and Thrusters open), `harbour-peek` (same at peek: the quick row with the lever and two joysticks), `helm-thrusters` (`…&mode=realistic&st=helm`: the joysticks under the lever).

Live checks:

1. `m41 spin`: the `harbour-mode` link plus `tx=4`; `holdThruster(page, 'bow', 1, 2500)`: the heading on the strip has grown by 10° or more; the status line read during the hold names "bow to starboard".
2. `m41 mode link`: choose Harbour in the mode chip; `waitForLink(page, ['m=harbour'])`; reload: the chip reads "Harbour".
3. `m41 release`: during a hold, dispatch a `blur` on the window: `data-dir` returns to `0`.

### 7.10 Done when

7.8 passes; Harbour is in the mode chip and the link; the joysticks work in the section, the quick row and at the Helm station; the owner spins and crabs the boat on the phone.

### 7.11 Not in M41

Proportional thrusters, running-time limits, batteries; places and the marina (M42).

### 7.12 Decided in the M41 PR

(empty)

---

## 8. M42: Places and the marina

**Independent review: required** (new area data, five link keys and old links, a new world object in the scene, the map and the mini-map)

### 8.1 Files

New: `src/model/places.ts`, `src/model/marina.ts`, `src/render3d/marina.ts`, `src/ui/placePanel.ts`, `tests/marina.test.ts`, `scripts/shots-m42.mjs`. Changed: `content/areas/adriatic.json`, `src/model/area.ts` (types only), `src/model/glossary.ts` (`GROUPS` gains `harbour`), `src/app/store.ts`, `src/app/urlState.ts`, `src/ui/modes.ts`, `src/ui/panel.ts`, `src/ui/mapView.ts`, `src/ui/miniMap.ts`, `src/render3d/scene.ts`, `src/render3d/sceneConfig.ts` (`SCENE.harbour`), `src/render3d/picking.ts`, `tests/urlState.test.ts`, `tests/modes.test.ts`, both `ui.json`, both glossaries, `docs/review/ru.md`, the registry, `scripts/ui.mjs`, `docs/CODE_MAP.md`.

### 8.2 Data (`content/areas/adriatic.json`, new keys after `marks`)

```json
"openDepthM": 40,
"places": [
  { "id": "open", "eastM": 0, "northM": 0, "headingDeg": 0 },
  { "id": "marina", "sea": "flat" }
],
"marina": {
  "$comment": "A made-up Mediterranean marina (PHASE7_SPEC 8.2). Boats lie stern-to: the north row with the stern to the quay, the south row with the stern to the pontoon; the fairway runs east-west and is open to the west.",
  "quayFaceNorthM": 1500,
  "quayWidthM": 15,
  "quayHeightM": 1.0,
  "westEndEastM": -110,
  "eastEndEastM": 110,
  "wallWidthM": 10,
  "pontoonWidthM": 3,
  "pontoonHeightM": 0.5,
  "depthM": 5,
  "berthsPerRow": 24,
  "ourBerth": 12,
  "sternGapM": 1.0,
  "berthZoneM": 16,
  "startInsetM": 15,
  "layouts": {
    "tight": { "berthWidthM": 4.9, "fairwayM": 22 },
    "medium": { "berthWidthM": 5.5, "fairwayM": 30 },
    "spacious": { "berthWidthM": 6.5, "fairwayM": 40 }
  },
  "yachts": [
    { "lengthM": 12.0, "beamM": 3.9 },
    { "lengthM": 14.0, "beamM": 4.3 },
    { "lengthM": 15.5, "beamM": 4.75 }
  ],
  "traffic": {
    "busy": "all",
    "half": [0, 2, 3, 5, 7, 8, 10, 13, 15, 16, 18, 20, 21, 23],
    "empty": []
  }
}
```

Every value is a design choice for teaching (berth widths: the beam 4.75 m plus 0.15 / 0.75 / 1.75 m; fairways about 1.4, 1.9 and 2.6 boat lengths). `ourBerth` 12 of the north row is never taken. "half" lists the taken berth indices of each row (one neighbour of ours, 13, is taken).

### 8.3 Model

`src/model/marina.ts` (pure):

```ts
export type MarinaLayoutId = 'tight' | 'medium' | 'spacious';
export type TrafficId = 'busy' | 'half' | 'empty';
export type Rect = { west: number; east: number; south: number; north: number }; // map metres
export interface Berth { row: 'north' | 'south'; index: number; centreEastM: number; sternNorthM: number; headingDeg: number; widthM: number }
export interface MooredYacht { id: string; berth: Berth; lengthM: number; beamM: number; outline: [number, number][] /* map east, north, closed polygon */ }
export interface MarinaGeometry {
  quay: Rect; pontoon: Rect; wall: Rect;
  fairway: Rect;                // the water between the rows' bow ends
  berths: Berth[];              // both rows, north row first
  ourBerth: Berth;
  rings: [number, number][];    // quay rings (east, north): at every berth edge of the north row, on the quay face
  yachts: MooredYacht[];
}
export function marinaGeometry(layout: MarinaLayoutId, traffic: TrafficId, areaData?: AreaData): MarinaGeometry;
/** A moored yacht's outline in its own frame (x from the stern centre towards the bow, z to its starboard), then placed. */
export function yachtOutline(lengthM: number, beamM: number): [number, number][];
```

With `F = quayFaceNorthM`, `w = berthWidthM`, `f = fairwayM`, `n = berthsPerRow`, `Z = berthZoneM`, `g = sternGapM`:

- Berth centres: `x_i = (i − (n − 1)/2)·w`, `i = 0 … n − 1`.
- North row: `sternNorthM = F − g`, `headingDeg = 180` (bow to the south); its bows reach at most `F − g − Z`.
- Fairway: `north = F − g − Z`, `south = F − g − Z − f`.
- South row: bow ends at the fairway's south edge, sterns at `F − g − 2Z − f`, `headingDeg = 0` (bow to the north): `sternNorthM = F − g − 2Z − f`.
- Pontoon: `north = F − 2g − 2Z − f` (`g` south of the south row's sterns), `south = north − pontoonWidthM`, `west = westEndEastM`, `east = eastEndEastM`.
- `quay = { west: westEndEastM, east: eastEndEastM + wallWidthM, south: F, north: F + quayWidthM }`; `wall = { west: eastEndEastM, east: eastEndEastM + wallWidthM, south: pontoon.south, north: F }`; `fairway = { west: westEndEastM, east: eastEndEastM, south: F − g − Z − f, north: F − g − Z }`.
- Rings: `(x_i − w/2, F)` for every `i` and `(x_{n−1} + w/2, F)`.
- Yachts: for each row (`north` = row 0, `south` = row 1) and each taken index (`busy`: every index; otherwise the list) except the north row's `ourBerth`: the type `yachts[(i + row) % 3]`, id `yacht-<row>-<i>`, its stern centre at `(x_i, sternNorthM)`, its bow towards `headingDeg`.
- `yachtOutline(L, B)` = `[(0, −0.45B), (0.45L, −0.5B), (0.8L, −0.3B), (L, 0), (0.8L, 0.3B), (0.45L, 0.5B), (0, 0.45B)]`.

Worked values (medium: w 5.5, f 30): fairway north 1483, south 1453; south row sterns at 1437; pontoon north 1436, south 1433; our berth centre east 2.75, stern at north 1499 facing south; the start (8.3 below) at (−95, 1468).

`src/model/places.ts` (pure):

```ts
export type PlaceId = 'open' | 'marina';   // M45 adds 'bay'
export interface HarbourState { place: PlaceId; layout: MarinaLayoutId; traffic: TrafficId }
export const DEFAULT_HARBOUR: HarbourState; // { place: 'open', layout: 'medium', traffic: 'half' }
export interface PlaceStart { eastM: number; northM: number; headingDeg: number; sea: SeaSetting | null }
export function placeStart(h: HarbourState, areaData?: AreaData): PlaceStart;
```

`placeStart`: open water → the `open` entry, `sea: null` (unchanged); marina → `eastM = westEndEastM + startInsetM`, `northM` = the fairway's middle, `headingDeg = 90`, `sea: 'flat'`.

### 8.4 Store and URL

- `AppState.harbour: HarbourState`; `initialState` takes `overrides.harbour` (default `DEFAULT_HARBOUR`).
- Action `{ type: 'goToPlace'; place: PlaceId }`: builds a fresh state with `initialState({...})`, passing on the current `settings`, `appMode`, `camera`, `windMode`, `clockUtcMs` (`state.clock.utcMs`), `learn`, and: `harbour: { ...state.harbour, place }`; `boat: { mode: 'sailing', eastM, northM, headingDeg, speedMps: 0 }` from `placeStart`; `sea`: the place's (or the current one for open water); for the marina (and the bay, M45) also `controls: { ...state.controls, ctl_main_furl: 0, ctl_jib_furl: 0, ctl_jib_sheet: 100, ctl_rudder: 0 }` and `engine: { running: true, leverPct: 0 }`; for open water the current controls and engine. Then `autopilot.mode = 'off'` for the marina and the bay. Everything else starts fresh (track, thrusters, and from later milestones contacts, lines, anchor). Choosing the place already chosen does the same (it puts the boat back at the start).
- Actions `{ type: 'setMarinaLayout'; layout }` and `{ type: 'setTraffic'; traffic }`: set the field; if the place is the marina, then do `goToPlace('marina')` with the new value (the boat goes back to the start, so she is never inside a yacht).
- **URL** (`harbourParams`, written after `engineParams`): `pl=marina` when the place is not open; when `pl` is written: `ml` if the layout is not `medium`, `tr` if the traffic is not `half`, then `pe` and `pn` (the boat's `eastM` / `northM`, `toFixed(1)`). Parse: `pl` a valid place → that place; `ml`, `tr` valid → those; `pe`, `pn` numbers within ±5,000 → the position, otherwise `placeStart`. Without `pl`, `pe`/`pn`/`ml`/`tr` are ignored. Heading, speed, engine, controls come from their keys as today.

### 8.5 Sections and modes

`SECTION_IDS` gains `'place'` (after `'thrusters'`), always available. `MODE_LAYOUTS` after M42: Easy, Realistic and Learn add `place` at the end of `order` (closed). Harbour: `order` engine, thrusters, place, conditions, sails, ropes, autopilot, learn, legend; `open` engine, thrusters; `openSide` engine, thrusters, place; `second` place, conditions.

### 8.6 UI

**Place section** (`src/ui/placePanel.ts`, `createPlacePanel(store): HTMLElement[]`):

1. A segmented row `place-choice` (`role="group"`, `aria-label` `t('place.label')`) of buttons `place-open`, `place-marina` (`aria-pressed` for the current place). A tap dispatches `goToPlace` (also on the pressed one: back to the start).
2. Shown only while the place is the marina: a segmented row `marina-layout` (`marina-layout-tight`, `-medium`, `-spacious`) and a row `marina-traffic` (`marina-traffic-busy`, `-half`, `-empty`), each with its label.
3. A status line `place-status`: open water `place.status.open`; marina `place.status.marina`.
4. `p.explain` `place.hint`.

**3D** (`src/render3d/marina.ts`, `buildMarina(areaData): { object: THREE.Group; update(state: AppState): void }`, added to `world.group` in `scene.ts` as `marks` is, and placed the same way: each frame its position is the marina's offset from the boat in the world group's frame):

- Quay and wall: boxes from 1.0 m below to `quayHeightM` above the water, concrete grey (`SCENE.harbour.quayColour` `#b9b4a8`). Pontoon: a box from 0.3 m below to `pontoonHeightM` above, wood brown (`#8a6a4a`). Rings: dark tori (0.12 m) on the quay face at 0.6 m height. Our berth: a yellow stripe (`#f2c94c`, 0.15 m wide) along the quay edge between our two rings.
- Moored yachts: the outline extruded from 0.2 m below the water to 1.3 m above (white hull `#f4f4f2`, a grey deck line), a mast (diameter 0.15, height `0.9·L + 2` m, at `0.4·L` from the stern), id `env_moored_yacht` for picking. Rebuilt when the layout or traffic changes (compare `state.harbour` with the last one built).
- Shown only within `SCENE.harbour.maxDrawM` = 1500 m of the boat (the distance to the nearest point of the quay's rectangle).
- At Detail Low the same meshes without shadows (no extra cost at High besides shadows).

**Map** (`mapView.ts`): `drawHarbour(ctx, state, view)` after `drawGrid` and before `drawTrack`: quay, wall and pontoon filled `#b9b4a8` with a `#7b776d` 1 px edge; berth separators as 1 px lines `#d0d4d8` between the berths' stern ends and `berthZoneM` out; yachts filled white with a grey edge; our berth outlined in yellow (2 px). The mini-map (`miniMap.ts`) calls the same function. `pickMap` returns `env_quay` for a tap on the quay, wall or pontoon and `env_moored_yacht` on a yacht.

**Picking** (`picking.ts`): the marina's meshes carry `env_quay` and `env_moored_yacht`.

### 8.7 Strings and registry

`GROUPS` (`glossary.ts`) gains `'harbour'` after `'sea'`; `learn.group.harbour`: "Harbour and anchoring ({count})" / «Гавань и якорная стоянка ({count})».

Registry (`kind: "environment"`, `group: "harbour"`, `phase: 7`, `status: "draft"`): `env_quay` (related `env_moored_yacht`, `term_med_mooring` from M44 — add the relation in M44; `showMe` `?pl=marina&m=harbour&cam=top`), `env_moored_yacht` (related `env_quay`; `showMe` `?pl=marina&tr=busy&m=harbour&cam=top`).

| Key | English | Russian (draft) |
|---|---|---|
| `place.label` | Place | Место |
| `place.open` | Open water | Открытая вода |
| `place.marina` | Marina | Марина |
| `place.layout` | Marina layout | Планировка марины |
| `place.layout.tight` | Tight | Тесная |
| `place.layout.medium` | Medium | Средняя |
| `place.layout.spacious` | Spacious | Просторная |
| `place.traffic` | Other yachts | Другие яхты |
| `place.traffic.busy` | Busy | Много |
| `place.traffic.half` | Half full | Половина |
| `place.traffic.empty` | Empty | Нет |
| `place.status.open` | Open water near the practice buoys. | Открытая вода у тренировочных буёв. |
| `place.status.marina` | In the marina's fairway. Your berth is marked yellow on the quay: go in stern first (stern-to). | В проходе марины. Ваше место отмечено жёлтым на причале: заходите кормой (кормой к причалу). |
| `place.hint` | Choosing a place puts the boat there, ready for harbour work: sails rolled away, engine running in neutral. Choosing it again puts her back at the start. The other yachts never move. | Выбор места переносит лодку туда, готовой к манёврам в гавани: паруса свёрнуты, двигатель работает на нейтрали. Повторный выбор возвращает её к началу. Другие яхты не двигаются. |

Glossary (each cell `English / Russian`):

| Id | name | alternatives | short | what | onThisBoat | mistakes | showMe |
|---|---|---|---|---|---|---|---|
| `env_quay` | Quay / Причал | pier, pontoon / пирс, понтон, стенка | The fixed edge of the marina that boats tie up to. / Неподвижный край марины, к которому швартуются лодки. | In a Mediterranean marina boats lie side by side with their sterns to the quay (stern-to), held by stern lines to the quay and a lazy line at the bow. A pontoon is a floating quay. / В средиземноморской марине лодки стоят бок о бок кормой к причалу, на кормовых швартовах и муринге с носа. Понтон: плавучий причал. | The app's marina has a quay to the north and a pontoon to the south, with a fairway between them. / В марине приложения причал на севере и понтон на юге, между ними проход. | Coming in bow first like in a car park. → In the Mediterranean you go in stern first. / Заходить носом, как на парковку. → В Средиземноморье заходят кормой. | The marina from above. / Марина сверху. |
| `env_moored_yacht` | Moored yacht / Яхта у причала | neighbour / сосед | Another boat in the marina; it never moves in the app. / Другая лодка в марине; в приложении она не двигается. | Your neighbours are the hardest part of a tight berth: their hulls are a few tens of centimetres away. Fenders on both sides protect both boats. / Соседи: самое трудное в тесном месте: их борта в нескольких десятках сантиметров. Кранцы с обеих сторон защищают обе лодки. | Busy: every berth taken but yours. Half full: one neighbour. Empty: none. / Много: заняты все места, кроме вашего. Половина: один сосед. Нет: никого. | Watching only the quay. → Watch the bows of the neighbours: the wind pushes your bow onto theirs. / Смотреть только на причал. → Следите за носами соседей: ветер сносит ваш нос на них. | A busy marina from above. / Полная марина сверху. |

### 8.8 Tests (`tests/marina.test.ts`)

1. `marinaGeometry('medium', 'half')`: the worked values of 8.3 (±0.01); 48 berths; `ourBerth` row north, index 12; no yacht at our berth; the yachts in the north row are exactly the half list minus nothing (12 is not in it) → 14, south row 14.
2. `busy` → 47 yachts; `empty` → 0. Tight: the fairway is 22 m and the berth width 4.9.
3. No two yachts' outlines overlap (polygon test), and none overlaps the quay, wall, pontoon or our berth's rectangle (`x_12 ± w/2`, `F − g − Z … F`), for all 9 layout × traffic pairs.
4. `placeStart` marina medium = (−95, 1468, 90, 'flat').
5. Store: `goToPlace('marina')` → position as `placeStart`, speed 0, engine running at lever 0, sails 0 % out, jib sheet 100, sea flat, track empty, autopilot off, `appMode` unchanged; `setMarinaLayout('tight')` in the marina moves her to the tight start (−95, 1472).
6. URL: a marina state round-trips (`pl`, `ml`, `tr`, `pe`, `pn`, heading, speed); open water writes none of the five keys (an existing link test's exact text is unchanged); `?pe=10&pn=20` without `pl` opens at (0, 0).

### 8.9 Browser checks (`scripts/shots-m42.mjs`)

Helper `choosePlace(page, place)`: `showSection(page, 'place')`, click `place-<place>`.

Scenes: `marina-top` (`?pl=marina&m=harbour&cam=top`), `marina-busy-tight` (`?pl=marina&ml=tight&tr=busy&m=harbour&cam=top`), `marina-map` (`?pl=marina&m=harbour&cam=map`, zoomed out twice with −), `marina-side` (`?pl=marina&m=harbour&cam=side-port`).

Live checks:

1. `m42 choose`: open `?m=harbour`; `choosePlace(page, 'marina')`; `waitForLink(page, ['pl=marina', 'pe=-95.0', 'pn=1468.0'])`; the chip row and the 3D show the quay (a tap on the quay identifies `env_quay`).
2. `m42 layout`: in the marina, tap `marina-layout-tight`: the link gets `ml=tight` and `pn=1472.0`.
3. `m42 old link`: `?wd=60&ws=12`: no `pl` in the written link.

### 8.10 Done when

8.8 passes; the owner chooses Marina on the phone and sees the quay, the yachts and the yellow berth, changes the layout and the traffic, and a shared link opens in the same spot.

### 8.11 Not in M42

Bumping into anything (M43: in M42 the boat passes through the quay and the yachts; the PR says so); lines (M44); the bay (M45).

### 8.12 Decided in the M42 PR

(empty)

---

## 9. M43: Contact, damage report and fenders

**Independent review: required** (contact physics inside the shared step; what the report says teaches what damage is)

### 9.1 Files

New: `src/model/contact.ts`, `src/ui/damageReport.ts`, `src/ui/mooringPanel.ts`, `tests/contact.test.ts`, `scripts/shots-m43.mjs`. Changed: `src/model/lowSpeed.ts` (`ContactHit`, `contacts` in `ExternalForces` and `addForces`), `src/model/motion.ts` (`report.contacts`), `src/model/harbourForces.ts`, `src/model/marina.ts` (`marinaObstacles`), `src/app/store.ts`, `src/ui/placePanel.ts`, `src/ui/modes.ts`, `src/ui/panel.ts`, `src/ui/windIndicator.ts` (the alert stack gets the damage alert), `content/boat/hanse508.json` (`physics.contact`), `tests/physicsTruths7.test.ts`, `tests/modes.test.ts`, both `ui.json`, `docs/review/ru.md`, `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md`.

**Phase 6 provides** (refresh check): the fenders drawn on both sides, `AppState.fenders: { out: boolean }`, `setFenders`, link key `fd=1`, and `deck.fenders.points`: `[{ "id": "fender_port_1", "side": "port", "x": 1.0 }, { "id": "fender_port_2", "side": "port", "x": -1.5 }, { "id": "fender_port_3", "side": "port", "x": -4.0 }, and the same three for starboard]` (the contract in BOAT_DETAILS_ANALYSIS section 6; three per side, the last one at the widest part of the hull, x −3.8). If Phase 6 built them differently, the refresh check rewrites this paragraph; if it did not build them, M43 adds exactly this data, the state, the action, `fd` (after `tr`, before `pe`) and simple fenders (white cylinders, diameter 0.25 m, length 0.8 m, hanging from the deck edge at those x to 0.3 m above the water, id `fit_fender`).

### 9.2 Data (`content/boat/hanse508.json`, `physics.contact`, after `physics.thrusters`)

```json
"contact": {
  "hullStiffnessNPerM": 400000,
  "hullDampingNsPerM": 40000,
  "fenderStiffnessNPerM": 100000,
  "fenderDampingNsPerM": 60000,
  "fenderThicknessM": 0.25,
  "fenderReachM": 1.0,
  "friction": 0.2,
  "nearM": 60,
  "separateS": 0.5,
  "severityMps": { "touch": 0.15, "bump": 0.4, "knock": 0.8 },
  "fenderMaxMps": 0.5,
  "fenderLossSpeedMps": 2.6,
  "fenderLossAfterS": 30,
  "fenderLossEveryS": 20,
  "note": "assumptions for teaching: a contact under 0.15 m/s (0.3 kn) is a touch, under 0.4 m/s (0.8 kn) a bump, under 0.8 m/s (1.6 kn) a knock, faster a hit; a fender takes a contact up to 0.5 m/s (1 kn); fenders left out above 5 kn are torn off after 30 s, then one every 20 s (PT-34)"
}
```

### 9.3 Model

`src/model/lowSpeed.ts`:

```ts
export type HullPart = 'bow' | 'stern' | 'port' | 'starboard' | 'keel';
export interface ContactHit {
  /** `<obstacle id>:<part>`: one contact between one obstacle and one part of our hull. */
  key: string;
  obstacleId: string;   // 'quay', 'wall', 'pontoon', 'yacht-north-11', … (M45: 'land', 'rock-<n>', 'bottom')
  partId: string;       // the registry id of what was hit: 'env_quay', 'env_moored_yacht', …
  part: HullPart;
  /** How fast our hull moved into it at that point, m/s (≥ 0). */
  approachMps: number;
  /** A fender was between them. */
  fender: boolean;
}
export interface ExternalForces { surgeN: number; sideN: number; momentNm: number; contacts?: ContactHit[] }
```

`addForces` concatenates `contacts`. `motion.ts`: `MotionReport.contacts: ContactHit[]`: over all substeps of the step, one entry per `key`, with the largest `approachMps` and `fender` true if any of them had it.

`src/model/contact.ts` (pure):

```ts
export interface Obstacle { id: string; partId: string; polygon: [number, number][] /* map (east, north), convex, counter-clockwise */ }
export interface FenderSet { out: boolean; lost: readonly string[] }
/** Our hull's contact points, boat frame, with the part each belongs to. */
export function hullContactPoints(data?: BoatData): { x: number; z: number; part: HullPart }[];
/** The forces of every contact now, and the hits. */
export function contactForces(boat: BoatState, obstacles: readonly Obstacle[], fenders: FenderSet, data?: BoatData): ExternalForces;
export type Severity = 'fender' | 'touch' | 'bump' | 'knock' | 'hit';
export function contactSeverity(approachMps: number, fender: boolean, data?: BoatData): Severity;
```

- **Contact points:** every `[x, hb]` of `hull.deckEdgeHalfBeam.points` on both sides (`z = −hb` port, `+hb` starboard), plus `(bowFittingTipX, 0)` and `(transomX, 0)`. Part: `bow` if `x ≥ 4.0`; `stern` if `x ≤ transomX + 1.0`; otherwise `port` (`z < 0`) or `starboard`. Our hull polygon is the same points in order (starboard bow to stern, then port stern to bow), which is convex.
- Only obstacles whose bounding box is within `nearM` of the boat's position are tested.
- **Our point inside an obstacle.** For each point `(x, z)`: `fendered` = fenders out, part `port` or `starboard`, and a fender of that side not in `lost` with `|fender.x − x| ≤ fenderReachM`. The tested position is `pointToMap(boat, x, z')` with `z' = z ± fenderThicknessM` outward when fendered, `z' = z` otherwise. If it is inside the polygon: `d` = the smallest distance to the polygon's edges, `n` = that edge's outward normal (map, unit). `v = pointVelocity(boat, x, z)`, `vn = max(0, −(v·n))` (the speed into the obstacle). Normal force: fendered `F = fenderStiffness·min(d, t) + hullStiffness·max(0, d − t) + fenderDamping·vn` (`t` = fenderThicknessM); not fendered `F = hullStiffness·d + hullDamping·vn`. Friction: `vt = v − (v·n)·n`; if `|vt| > 0.01`, `Ff = −friction·F·vt / |vt|`. The force `F·n + Ff` (map) is turned into the boat frame (`vectorToBoat`) and applied at `(x, z)` (`forceAt`). Hit: `{ key: id + ':' + part, obstacleId, partId, part, approachMps: vn, fender: fendered }`.
- **An obstacle's corner inside our hull** (a neighbour's pointed bow between two of our points): for each polygon vertex `V` inside our hull polygon: `d` = the smallest distance to our hull's edges, `m` = that edge's outward normal (map); `(xv, zv) = mapToBoat(V − position)`; `v = pointVelocity(boat, xv, zv)`, `vn = max(0, v·m)`; force `−(hullStiffness·d + hullDamping·vn)·m` at `(xv, zv)`; the part by `xv`, `zv` as above; `fender` false (fenders do not help here).
- `contactSeverity`: `fender && approach ≤ fenderMaxMps` → `'fender'`; else `< touch` → `'touch'`, `< bump` → `'bump'`, `< knock` → `'knock'`, otherwise `'hit'`.

`src/model/marina.ts`: `marinaObstacles(g: MarinaGeometry): Obstacle[]`: `quay` (`env_quay`), `wall` (`env_quay`), `pontoon` (`env_quay`), and each yacht (`yacht.id`, `env_moored_yacht`) with its outline turned counter-clockwise.

`harbourForces` inputs gain `obstacles: readonly Obstacle[]` and `fenders: FenderSet`; the function adds `contactForces(boat, obstacles, fenders)`. The store passes the marina's obstacles (cached by layout and traffic) in every place: the marina is always there.

### 9.4 Store

- `AppState.contact: ContactState`:

```ts
export interface ContactReport { atS: number; obstacleId: string; partId: string; part: HullPart; impactMps: number; fender: boolean; severity: Severity }
export interface ContactState {
  /** Contacts going on now, by key, with the seconds since last seen. */
  touching: Readonly<Record<string, number>>;
  /** Newest first, at most 20. */
  reports: readonly ContactReport[];
  /** Simulated time (rig.timeS) until which the alert shows the newest report. */
  noticeUntilS: number;
}
```

- `stepContact(contact, hits, timeS, dt): ContactState` (pure, in `contact.ts`), after `stepBoat`: every hit whose key is not in `touching` makes a new report (`impactMps = approachMps`, `severity = contactSeverity(...)`), `noticeUntilS = timeS + 8`; every hit sets its key's age to 0; keys not hit this step age by `dt` and are dropped after `separateS`.
- Fenders (`AppState.fenders` from Phase 6, gains `lost: string[]` and `overSpeedS: number`): `stepFenders(fenders, speedMps, dt)`: while `out` and `|speedMps| > fenderLossSpeedMps`, `overSpeedS += dt`, else `overSpeedS = 0`; whenever `overSpeedS ≥ fenderLossAfterS + k·fenderLossEveryS` for `k` = the number of fenders already lost, the next fender of `deck.fenders.points` (data order) not yet lost is added to `lost`, and a report `{ obstacleId: 'fender', partId: 'fit_fender', part: <its side>, impactMps: 0, fender: false, severity: 'hit' }` is added with `noticeUntilS = timeS + 8`. `setFenders(true)` does not bring lost fenders back; `goToPlace` and `reset` do.
- Action `{ type: 'clearDamageReport' }`: `reports` empty.
- Held still: no hits (stepBoat does nothing), and the fender timer stands still.
- Not in the link (a link opens with no reports and no lost fenders).

### 9.5 Sections and modes

`SECTION_IDS` gains `'mooring'` (after `'place'`), always available. Easy, Realistic and Learn add `mooring` at the end of `order`. Harbour: `order` engine, thrusters, mooring, place, conditions, sails, ropes, autopilot, learn, legend; `open` engine, thrusters; `openSide` engine, thrusters, mooring; `second` place, conditions.

### 9.6 UI

**Mooring section** (`src/ui/mooringPanel.ts`, `createMooringPanel(store): HTMLElement[]`; M44 and M45 add to it): a switch `fenders-toggle` (`role="switch"`, `aria-checked`, label `mooring.fenders`) that dispatches `setFenders`; a status line `fenders-status` (`mooring.fenders.in` / `mooring.fenders.out` with `{count}` = the fenders not lost / plus `mooring.fenders.lost` with `{count}` when some are lost); `p.explain` `mooring.fenders.hint`. If Phase 6 placed a fender switch elsewhere, it stays there too (both dispatch the same action).

**Damage report** (`src/ui/damageReport.ts`):
- `createDamageAlert(alerts, store)`: `div.rig-alert.rig-alert-report` `data-testid="damage-alert"` in the alert stack (as `createGybeReport`), shown while `rig.timeS < contact.noticeUntilS`, text `damageText(reports[0])`; class `is-hit` for `knock` and `hit`.
- `createDamageList(store): HTMLElement`, appended to the Place section after the status line: an `h3` `damage.title` with the count, a list `damage-list` of the newest 5 reports (`li.damage-item`, text `damageText`), an empty line `damage.none`, and a button `damage-clear` (`damage.clear`).
- `damageText(r)`: a lost fender → `t('damage.fenderLost', { side })`; otherwise `t('damage.line', { what: part(r.partId).name, where: t('damage.part.' + r.part), speed: mpsToKn(r.impactMps).toFixed(1), verdict: t('damage.severity.' + r.severity) })`.

### 9.7 Strings

| Key | English | Russian (draft) |
|---|---|---|
| `mooring.label` | Fenders and lines | Кранцы и швартовы |
| `mooring.fenders` | Fenders out | Кранцы за бортом |
| `mooring.fenders.in` | Fenders in (stowed). | Кранцы убраны. |
| `mooring.fenders.out` | {count} fenders hanging over the side. | За бортом {count} кранцев. |
| `mooring.fenders.lost` | {count} lost while sailing. | {count} потеряно на ходу. |
| `mooring.fenders.hint` | Fenders (soft rubber buffers) hang between the hull and the quay or the next boat. Put them out before you come in; take them in before you sail, or they are torn off. | Кранцы (мягкие резиновые подушки) висят между корпусом и причалом или соседней лодкой. Вывешивайте их до захода; убирайте перед выходом, иначе их оторвёт. |
| `damage.title` | Damage report ({count}) | Отчёт о повреждениях ({count}) |
| `damage.none` | No contact yet. | Касаний пока не было. |
| `damage.clear` | Clear | Очистить |
| `damage.line` | {what}, at our {where}, {speed} kn: {verdict} | {what}, наш {where}, {speed} уз: {verdict} |
| `damage.part.bow` | bow | нос |
| `damage.part.stern` | stern | корма |
| `damage.part.port` | port side | левый борт |
| `damage.part.starboard` | starboard side | правый борт |
| `damage.part.keel` | keel | киль |
| `damage.severity.fender` | the fender took it. No damage. | кранец принял удар. Повреждений нет. |
| `damage.severity.touch` | a touch. No damage. | касание. Повреждений нет. |
| `damage.severity.bump` | a bump: scratched gelcoat. | толчок: поцарапан гелькоут. |
| `damage.severity.knock` | a knock: gelcoat cracked, a repair job. | удар: трещины в гелькоуте, нужен ремонт. |
| `damage.severity.hit` | a hard hit: the hull may be damaged. Check for water inside. | сильный удар: корпус может быть повреждён. Проверьте, нет ли воды внутри. |
| `damage.fenderLost` | A {side} fender was torn off and lost (fenders out at speed). | Оторвало и потеряли кранец с {side} борта (кранцы за бортом на ходу). |

(`{side}` in `damage.fenderLost` is `t('side.port')` / `t('side.starboard')`, which exist; the Russian form uses «левого» / «правого», so add `side.port.gen` «левого» and `side.starboard.gen` «правого» for Russian and use them there; English `side.port.gen` = "port", `side.starboard.gen` = "starboard".)

### 9.8 Tests

`tests/contact.test.ts`:

1. `hullContactPoints`: 86 points (42 × 2 + 2); parts at x 6.9 → bow, x −8.6 → stern, (0.33, −1.99) → port.
2. `contactForces`, boat at rest at (0, 0), heading 0; a wall polygon east of x = 2.875 (`[[2.875, −20], [10, −20], [10, 20], [2.875, 20]]`, counter-clockwise): `eastM = 0.1` puts the widest points 0.1 − 0.5 + … use: shift the boat east so the point (−3.77, +2.375) is 0.02 m inside (`eastM = 0.52`): one or more hits with part `starboard`, `sideN < 0`, and `sideN` about −(400,000 × 0.02) per point inside (check the total against the points the test itself finds inside, ±1 %).
3. Fenders out with the contract's points: the same position gives `fender: true` hits and a smaller force (the fender's stiffness).
4. `contactSeverity`: (0.1, false) touch; (0.3, false) bump; (0.6, false) knock; (0.9, false) hit; (0.3, true) fender; (0.6, true) knock.
5. `stepContact`: a hit for 3 steps gives one report; gone for 0.6 s and back gives a second one; `clearDamageReport` empties the list.
6. Fender loss (`stepFenders`): out, 3.0 m/s: no loss at 29.9 s; one at 30.0 s; two at 50.0 s; speed 2.0 m/s for any time: none; `out: false`: none.

`tests/physicsTruths7.test.ts` (`harbourStart` without wind; the boat at rest with `swayMps` set in `initialState`'s boat override, and `external = (b) => contactForces(b, [wall], fenders)` with the wall of test 2 at x ≥ 2.875; 60 fps, 4 s; prototype values in brackets):

- **PT-50** fenders take a slow contact: `swayMps` 0.3 toward the wall, fenders in: the first hit's `approachMps` in [0.22, 0.28] (0.251), severity `bump`, and no point goes more than 0.03 m into the wall (0.019). Fenders out: every hit has `fender: true` (no hull contact), approach [0.24, 0.30] (0.274), severity `fender`. At 1.0 m/s with fenders out: approach [0.85, 0.97] (0.92), severity `hit`.
- **PT-34** fenders come in before sailing: fenders out, motoring at lever 66 from its steady speed (about 8 kn): after 29 s none lost, after 31 s one, after 71 s three; with fenders in, none.

### 9.9 Browser checks (`scripts/shots-m43.mjs`)

Scenes: `damage-alert` (the marina, busy, the boat placed 3 m from a neighbour's side drifting into it: `?pl=marina&tr=busy&m=harbour&pe=-6.0&pn=1490.0&hdg=180&bs=0&cam=top&tx=4` after 3 s — the alert shows), `mooring-section` (`?pl=marina&m=harbour&fd=1` with the Fenders and lines section open).

Live checks:

1. `m43 bump`: `?pl=marina&m=harbour&cam=top`; set the lever to ahead 60 % in the quick row (6 taps on `quick-lever-more`) and wait (×4) until the alert shows or 20 s pass: `damage-alert` is visible and the damage list has one item naming the wall or the quay (the boat ran east along the fairway into the wall).
2. `m43 fenders`: tap `fenders-toggle`: the link gets `fd=1`; the status reads 6 fenders.
3. `m43 lost`: `?wd=90&ws=12&ms=30&js=30&fd=1&tx=16`: within 6 s real time the alert reads that a fender was lost.

### 9.10 Done when

9.8 passes; the owner bumps the quay and a yacht on the phone and reads the report; fenders out turn the same bump into "the fender took it"; fenders out at sea are lost.

### 9.11 Not in M43

Lines (M44); damage that changes the boat (owner: out of scope); the neighbour moving after a bump (they never move).

### 9.12 Decided in the M43 PR

(empty)

---

## 10. M44: Mooring lines (Med stern-to)

**Independent review: required** (line forces in the shared step; the line-in-the-propeller rule teaches a safety habit)

### 10.1 Files

New: `src/model/mooringLines.ts`, `src/render3d/mooringLines.ts`, `tests/mooringLines.test.ts`, `scripts/shots-m44.mjs`. Changed: `src/model/harbourForces.ts`, `src/model/marina.ts` (lazy-line sinkers), `src/app/store.ts`, `src/app/urlState.ts`, `src/ui/mooringPanel.ts`, `src/ui/damageReport.ts` (the fouled alert), `src/ui/enginePanel.ts` (Start is refused while fouled), `src/ui/ropeLegend.ts` (the mooring colour), `src/render3d/sceneConfig.ts` (`SCENE.ropes.colors.mooring`), `src/render3d/scene.ts`, `content/boat/hanse508.json` (`physics.lines`), `content/areas/adriatic.json` (`marina.lazyLineLengthM`), `tests/physicsTruths7.test.ts`, `tests/urlState.test.ts`, both `ui.json`, both glossaries, `docs/review/ru.md`, the registry, `scripts/ui.mjs`, `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md`.

**Phase 6 provides** (refresh check): `deck.cleats`, each `{ "id", "role": "bow" | "mid" | "stern", "side": "port" | "starboard", "x", "y", "z" }`, with the contract's values `cleat_bow_port` (5.6, 1.75, −0.30), `cleat_bow_starboard` (5.6, 1.75, 0.30), `cleat_mid_port` (−1.0, 1.55, −2.05), `cleat_mid_starboard` (−1.0, 1.55, 2.05), `cleat_stern_port` (−8.2, 1.40, −1.85), `cleat_stern_starboard` (−8.2, 1.40, 1.85). If Phase 6 did not add them, M44 adds exactly these (data only; the cleats are then drawn by M44 as small dark boxes 0.25 × 0.05 × 0.08 m, id `fit_mooring_cleat`).

### 10.2 Data

`content/boat/hanse508.json`, `physics.lines` (after `physics.contact`):

```json
"lines": {
  "lineEAN": 150000,
  "lineNote": "assumption: 16 mm polyamide (nylon) mooring line, axial stiffness EA; tension = EA / length × stretch",
  "lineDampingNsPerM": 3000,
  "crewPullN": 400,
  "crewPullNote": "assumption: what one person pulls on a line by hand",
  "tightenStepM": 0.2,
  "takeSlackM": 0.3,
  "throwReachM": 4.0,
  "takeMaxSpeedMps": 0.5,
  "lazyWalkS": 20,
  "maxLengthM": { "stern": 30, "lazy": 40 },
  "slackInWaterM": 1.0,
  "foulAfterS": 2.0
}
```

`content/areas/adriatic.json`, in `marina`: `"lazyLineLengthM": 25` (the sinker block of each north-row berth lies 25 m south of the quay face, on the bottom, on the berth's centre line).

### 10.3 Model

`src/model/mooringLines.ts` (pure):

```ts
export type LineCode = 'sp' | 'ss' | 'll';          // M45 adds 'bl' (bow line to a buoy) and 'sl' (shore line)
export interface FarEnd { eastM: number; northM: number; heightM: number /* above the water; negative = on the bottom */ }
export interface MooringLine { code: LineCode; cleatId: string; far: FarEnd; lengthM: number }
export interface CrewTask { kind: 'walkLazy'; code: LineCode; remainingS: number }   // M45 adds 'swimShore'
export interface LinesState { lines: readonly MooringLine[]; crew: CrewTask | null; fouled: boolean; foulS: number }
export const NO_LINES: LinesState;

/** Where a line's ends are now and how hard it pulls (N, ≥ 0). */
export function lineTension(line: MooringLine, boat: BoatState, data?: BoatData): { tensionN: number; distanceM: number };
/** The pull of every line on the boat now. */
export function lineForces(lines: readonly MooringLine[], boat: BoatState, data?: BoatData): ExternalForces;
/** Whether a line can be taken now, and if not, why (a UI string key). */
export function canTake(code: LineCode, state: LinesInputs): { ok: true } | { ok: false; reason: string };
export interface LinesInputs { lines: LinesState; boat: BoatState; harbour: HarbourState; geometry: MarinaGeometry; engineRunning: boolean; gear: Gear }
/** Applies one line command. */
export function lineCommand(code: LineCode, command: 'take' | 'tighten' | 'ease' | 'letGo', inputs: LinesInputs, data?: BoatData): LinesState;
/** The crew task timer, the walk's end, and the line-in-the-propeller check. */
export function stepLines(inputs: LinesInputs, dt: number, data?: BoatData): LinesState;
```

- **Line tension.** The cleat in the map: `pointToMap(boat, cleat.x, cleat.z)` at height `cleat.y`. `d` = 3D distance to `far` (`heightM` as the vertical coordinate). If `d ≤ lengthM`: 0. Otherwise `T = (lineEAN / lengthM)·(d − lengthM) + lineDampingNsPerM·max(0, rate)`, where `rate` is the speed at which the cleat moves away from the far end (`pointVelocity` at the cleat, against the horizontal unit vector from the cleat to the far end). The horizontal part of the pull, `T·(horizontal distance / d)` towards the far end, is applied at `(cleat.x, cleat.z)` with `vectorToBoat` and `forceAt`.
- **Stern lines** `sp` (`cleat_stern_port`) and `ss` (`cleat_stern_starboard`): the far end is the quay ring (marina geometry `rings`, `heightM = quayHeightM`) nearest to that cleat at the moment it is taken. `canTake`: the place is the marina; the line is not on; the ring is within `throwReachM` (horizontal) of the cleat; the boat's speed (√(speed² + sway²)) is at most `takeMaxSpeedMps`. Take: `lengthM = d + takeSlackM`.
- **Lazy line** `ll`: `canTake`: a stern line is on, the lazy line is not on, there is no crew task, and the nearest quay ring is within `throwReachM` of a stern cleat (the crew picks it up at the quay). Take: crew task `walkLazy`, `remainingS = lazyWalkS`. When the walk ends (`stepLines`), the line is made fast on the bow cleat nearer to the berth's sinker (`cleat_bow_port` on a tie) with the far end at the sinker of the berth whose ring the stern line went to (`(x_i, F − lazyLineLengthM, −marina.depthM)`) and `lengthM = d + takeSlackM`.
- **Tighten:** `lengthM −= tightenStepM` unless the line's tension is already `≥ crewPullN` (then the state is unchanged and the UI shows `lines.tooTight`); never below 0.5 m. **Ease:** `+= tightenStepM`, at most `maxLengthM.stern` (stern lines) or `maxLengthM.lazy`. **Let go:** the line is removed (a lazy line being walked: the task ends).
- **Line in the propeller** (`stepLines`): a line is *slack in the water* when it is a stern line or the lazy line, and `d < lengthM − slackInWaterM`; a lazy line being walked counts as slack in the water. While the engine is running in gear (`ahead` or `astern`) and at least one line is slack in the water, `foulS += dt`, otherwise `foulS = 0`. At `foulS ≥ foulAfterS`: `fouled = true`. The store then stops the engine (`running: false`) and refuses `start` while `fouled`.
- Action `{ type: 'clearPropeller' }`: `fouled = false`, `foulS = 0` (the diver has cut it free; the line stays as it was).
- **Held still:** lines pull nothing (stepBoat does nothing); the crew task still counts down; no fouling (the engine pushes nothing).

`harbourForces` inputs gain `lines: readonly MooringLine[]`; it adds `lineForces`.

### 10.4 Store and URL

- `AppState.lines: LinesState` (`NO_LINES` at start, `reset`, `goToPlace`).
- Action `{ type: 'line'; code: LineCode; command: 'take' | 'tighten' | 'ease' | 'letGo' }` → `lineCommand`; `clearPropeller`.
- `step`: `stepLines` after `stepEngine` (4.3 step 2); if it sets `fouled`, the engine gets `running: false` in the same step, and the contact list gets a report `{ obstacleId: 'propeller', partId: 'part_saildrive', part: 'stern', impactMps: 0, fender: false, severity: 'hit' }` with the alert.
- **URL** `ln` (after `pn`): the lines that are on, in the order `sp`, `ss`, `ll`, as `<code>:<lengthM to 1 decimal>`, comma separated (`ln=sp:4.2,ss:4.1,ll:21.5`). Parse (only with `pl=marina`): each valid code and length 0.5 … its maximum; the far end is found as at take time (the nearest ring to the cleat; the lazy line's sinker of that berth). A crew task, `fouled` and `foulS` are not stored.

### 10.5 UI

**Mooring section** (after the fenders): an `h3` `lines.title`, then one row per line code available in the place (marina: `sp`, `ss`, `ll`), `div.line-row` `data-testid="line-<code>"` `data-part-id` = the rope id (10.6):

- the name (`lines.name.<code>`) and a status `line-<code>-status`: off → `lines.off`; walking → `lines.walking` with `{seconds}` (whole seconds left); on → `lines.on` with `{length}` (1 decimal) and `{kn}` (the tension in kN, 1 decimal);
- off: a button `line-<code>-take` (`lines.take.<code>`), disabled when `canTake` says no, with the reason under it (`line-<code>-reason`, `t(reason)`);
- on: buttons `line-<code>-tighten` (`lines.tighten`), `line-<code>-ease` (`lines.ease`), `line-<code>-letGo` (`lines.letGo`); 44 px, in one row.

Under the rows: `p.explain` `lines.hint`. While `fouled`: a status line `prop-fouled` (`lines.fouled`) and a button `prop-clear` (`lines.clearProp`); the engine's Start shows `engine.fouled` instead of starting.

**3D** (`src/render3d/mooringLines.ts`, added to the world group, placed as the marina): each line that is on as a rope (a new colour `SCENE.ropes.colors.mooring` = `#2f6db5` in `sceneConfig.ts`; the rope legend lists it as "Mooring lines" / «Швартовы», key `legend.mooring`; radius `visual.ropeRenderRadius`, at least `SCENE.ropes.minScreenWidthPx` on screen like the other ropes) from its cleat to its far end; slack lines sag as a parabola with the sag `min(1.5, (lengthM − d)·0.5)` m, taut ones are straight. Our berth's lazy line, while not taken, is drawn from its quay ring down the quay face into the water towards the sinker (so the learner can see what to pick up), in the same colour at 50 % opacity.

### 10.6 Strings and registry

Registry (`phase: 7`, `status: "draft"`): `rope_stern_line_port`, `rope_stern_line_starboard` (`kind: "rope"`, `group: "harbour"`, related `env_quay_ring`, `term_med_mooring`), `rope_lazy_line` (`kind: "rope"`, `group: "harbour"`, related `term_med_mooring`, `env_quay`), `env_quay_ring` (`kind: "environment"`, `group: "harbour"`), `term_med_mooring` (`kind: "term"`, `group: "harbour"`, related `rope_lazy_line`, `rope_stern_line_port`, `env_quay`; `showMe`: `?pl=marina&m=harbour&pe=2.8&pn=1490.4&hdg=180&bs=0&ln=sp:3.5,ss:3.5,ll:24.9&cam=top`). `env_quay` gains `related` `term_med_mooring`.

| Key | English | Russian (draft) |
|---|---|---|
| `lines.title` | Lines | Швартовы |
| `lines.name.sp` | Stern line, port | Кормовой швартов, левый |
| `lines.name.ss` | Stern line, starboard | Кормовой швартов, правый |
| `lines.name.ll` | Lazy line (to the bow) | Муринг (на нос) |
| `lines.off` | Not tied. | Не закреплён. |
| `lines.walking` | The crew is walking it to the bow… {seconds} s | Экипаж ведёт его на нос… {seconds} с |
| `lines.on` | Tied: {length} m, pulling {kn} kN | Закреплён: {length} м, тянет {kn} кН |
| `lines.take.sp` | Throw it to the quay | Подать на причал |
| `lines.take.ss` | Throw it to the quay | Подать на причал |
| `lines.take.ll` | Pick it up | Поднять |
| `lines.tighten` | Tighten | Выбрать |
| `lines.ease` | Ease | Потравить |
| `lines.letGo` | Let go | Отдать |
| `lines.tooTight` | Too tight to pull by hand. | Слишком туго, руками не выбрать. |
| `lines.reason.place` | Only in the marina. | Только в марине. |
| `lines.reason.far` | The quay is too far: come within 4 m with the stern. | Причал слишком далеко: подойдите кормой ближе 4 м. |
| `lines.reason.fast` | Too fast: stop the boat first. | Слишком быстро: сначала остановите лодку. |
| `lines.reason.sternFirst` | Tie a stern line first. | Сначала закрепите кормовой швартов. |
| `lines.reason.busy` | The crew is busy. | Экипаж занят. |
| `lines.hint` | Stern-to (the usual way in the Mediterranean): reverse slowly into the berth, throw both stern lines to the quay when the stern is close, then pick up the lazy line (a line from the quay to a weight on the bottom ahead of the boat), walk it to the bow and pull it tight. The lazy line holds the bow against the wind. Keep the engine in neutral while a line is slack near the propeller. | Кормой к причалу (обычно в Средиземноморье): медленно заходите задним ходом, подайте оба кормовых швартова на причал, когда корма близко, затем поднимите муринг (конец от причала к грузу на дне перед лодкой), проведите его на нос и выберите втугую. Муринг держит нос против ветра. Пока у винта слабый конец, держите двигатель на нейтрали. |
| `lines.fouled` | A line is caught in the propeller. The engine has stopped. | Конец намотался на винт. Двигатель заглох. |
| `lines.clearProp` | Clear the propeller (a diver frees it) | Освободить винт (водолаз снимает конец) |
| `engine.fouled` | The propeller is fouled by a line: clear it first. | На винт намотан конец: сначала освободите винт. |

Glossary (`English / Russian`):

| Id | name | alternatives | short | what | onThisBoat | mistakes | showMe |
|---|---|---|---|---|---|---|---|
| `term_med_mooring` | Stern-to mooring / Швартовка кормой | Med mooring / средиземноморская швартовка | Lying with the stern to the quay, held by stern lines and a lazy line or the anchor at the bow. / Стоянка кормой к причалу на кормовых швартовах и муринге или якоре с носа. | Boats lie side by side, stern to the quay, so many fit along it. Two stern lines go to rings on the quay; at the bow a lazy line (or your own anchor) holds her off the quay and against the wind. / Лодки стоят бок о бок кормой к причалу, так их помещается больше. Два кормовых швартова идут к рымам на причале; с носа муринг (или свой якорь) держит лодку от причала и против ветра. | Reverse in: the stern walks to port (M40), so start the turn early. / Заходите задним ходом: корму уводит влево, начинайте поворот раньше. | Picking up the lazy line with the engine in gear. → Neutral first: a slack line near the propeller fouls it. / Поднимать муринг с включённой передачей. → Сначала нейтраль: слабый конец у винта наматывается. | In the berth with both stern lines and the lazy line tight. / На месте, оба кормовых швартова и муринг выбраны. |
| `rope_lazy_line` | Lazy line / Муринг | mooring line / муринговый конец | A line from the quay to a weight on the bottom, taken to the bow. / Конец от причала к грузу на дне, заводимый на нос. | It lies on the bottom between berths; the crew lifts it with the boat hook at the stern, walks it forward along the side deck and makes it fast on a bow cleat, pulling it tight. / Он лежит на дне между местами; экипаж поднимает его отпорным крюком с кормы, ведёт вперёд по палубе и крепит на носовой утке, выбирая втугую. | In the app the crew takes 20 s to walk it forward. / В приложении экипаж ведёт его на нос 20 с. | Leaving it slack. → Pull it as tight as you can by hand, or the bow swings onto the neighbour. / Оставить слабым. → Выбирайте руками как можно туже, иначе нос сносит на соседа. | The berth's lazy line, waiting on the quay face. / Муринг вашего места у стенки причала. |
| `rope_stern_line_port` / `rope_stern_line_starboard` | Stern line (port / starboard) / Кормовой швартов (левый / правый) | — / — | A line from a stern cleat to a ring on the quay. / Конец с кормовой утки на рым причала. | The two stern lines hold the stern a short step from the quay. / Два кормовых швартова держат корму в шаге от причала. | Cleats on each quarter of the stern. / Утки на раковинах кормы. | Throwing them before the stern is close. → Wait until the stern is within about 4 m. / Подавать их, пока корма далеко. → Ждите, пока корма ближе примерно 4 м. | Both stern lines on the quay rings. / Оба кормовых швартова на рымах причала. |
| `env_quay_ring` | Quay ring / Рым на причале | bollard / кнехт, тумба | A ring on the quay that lines are tied to. / Кольцо на причале, к которому крепят швартовы. | — / — | One at each berth's edge in the app's marina. / По одному на краю каждого места в марине приложения. | — / — | — / — |

(Fields given as `—` are left out of the entry; `what` is required, so `env_quay_ring`'s `what` is its `short`.)

### 10.7 Tests

`tests/mooringLines.test.ts`:

1. `lineTension`: a line 5 m long, the cleat 5.1 m from the far end, at rest → `150000 / 5 × 0.1` = 3,000 N; at 4.9 m → 0.
2. `canTake('sp')` in the marina at the start (fairway) → `lines.reason.far`; with the boat in the berth (east 2.75, north 1490.4, heading 180, at rest) → ok; at 0.6 m/s → `lines.reason.fast`. `canTake('ll')` without a stern line → `lines.reason.sternFirst`.
3. Lazy walk: take `ll` → `crew.remainingS` 20; after 20 s of `stepLines` the lazy line is on the bow cleat with the sinker at (2.75, 1475, −5).
4. Tighten stops at `crewPullN`; ease stops at the maximum; let go removes.
5. Fouling: a stern line with 2 m slack, the engine astern: `fouled` after 2.0 s, not after 1.9 s; in neutral never.
6. URL: `ln=sp:3.5,ss:3.5,ll:24.9` with `pl=marina` round-trips; without `pl` it is ignored.

`tests/physicsTruths7.test.ts` (the boat in the berth as test 2, wind from 90 (east), `ln` lengths as prototyped: stern lines `d + 0.3`, lazy line `d − 0.07` (hand tight, about 400 N); 120 s at 60 fps; prototype values in brackets):

- **PT-51** a lazy line holds the bow: 15 kn: the largest heading deviation from 180 in [0, 12]° (7.3); 25 kn: [0, 15]° (9.7); the transom stays within 0.5 m of where it started (0.14 / 0.24 m). Without the lazy line at 15 kn the bow swings more than 35° (47.6).
- **PT-52** a slack line fouls the propeller: in the berth with a stern line eased to 2 m slack and the lever at −30: after 3 s the engine is stopped and `fouled` is true; with the lever in neutral, after 10 s not.

### 10.8 Browser checks (`scripts/shots-m44.mjs`)

Helper `lineAction(page, code, action)`: `showSection(page, 'mooring')`, click `line-<code>-<action>`.

Scenes: `berth-lines` (the `term_med_mooring` `showMe` link: both stern lines and the lazy line drawn), `lines-section` (the same link with the Fenders and lines section open, side layout size too), `lazy-waiting` (`?pl=marina&m=harbour&pe=2.8&pn=1490.4&hdg=180&bs=0&cam=side-port`: the lazy line hanging at the quay).

Live checks:

1. `m44 stern-to`: `?pl=marina&m=harbour&pe=2.8&pn=1490.4&hdg=180&bs=0&tx=4`: `lineAction` take `sp`, take `ss`, take `ll`; wait until `line-ll-status` reads tied (at most 8 s real time); `waitForLink(page, ['ln=sp:', 'ss:', 'll:'])`.
2. `m44 fouled`: same link with `eng=1&lv=0`; take `sp`, ease it 10 times; set the lever astern 3 taps in the quick row; within 2 s real time (×4) `prop-fouled` shows and the strip shows the engine stopped.

### 10.9 Done when

10.7 passes; on the phone the owner reverses into the berth, throws the stern lines, picks up the lazy line and tightens it, and the boat lies still in a crosswind; a slack line with the engine in gear stops the engine.

### 10.10 Not in M44

Alongside mooring with springs (side-to; Phase 8 exercises may add it); the passerelle; the crew in 3D; lines on moored yachts.

### 10.11 Decided in the M44 PR

(empty)

---

## 11. M45: The bay: depth, seabed, shore lines and buoys

**Independent review: required** (depth and grounding physics; new area data and link codes)

### 11.1 Files

New: `src/model/seabed.ts`, `src/render3d/seabed.ts`, `src/render3d/bay.ts`, `tests/seabed.test.ts`, `scripts/shots-m45.mjs`. Changed: `content/areas/adriatic.json` (`bay`, `marina.basin`, the `bay` place), `src/model/area.ts` (types), `src/model/places.ts`, `src/model/mooringLines.ts` (`bl`, `sl`), `src/model/harbourForces.ts` (ground, land), `src/app/store.ts`, `src/app/urlState.ts`, `src/ui/instrumentStrip.ts`, `src/ui/mapView.ts`, `src/ui/miniMap.ts`, `src/ui/placePanel.ts`, `src/ui/mooringPanel.ts`, `src/render3d/scene.ts`, `src/render3d/sceneConfig.ts`, `content/boat/hanse508.json` (`physics.ground`, `physics.lines` additions), `tests/physicsTruths7.test.ts`, `tests/mooringLines.test.ts`, `tests/urlState.test.ts`, both `ui.json`, both glossaries, `docs/review/ru.md`, the registry, `docs/CODE_MAP.md`.

### 11.2 Data

`content/areas/adriatic.json`: in `places` add `{ "id": "bay", "eastM": -1250, "northM": 0, "headingDeg": 270, "sea": "sheltered" }`; in `marina` add `"basin": { "west": -110, "east": 110, "south": 1420, "north": 1500 }` and `"seabed": "mud"`; and a new block:

```json
"bay": {
  "$comment": "A made-up Croatian bay 1.3 km west of the start (PHASE7_SPEC 11.2), cut into a coast that runs north-south at east -1350: open to the east, sand with a patch of sea grass, rocky shores, three hidden rocks, rings on the shore for shore lines, three mooring buoys.",
  "coast": [[-4000, -2000], [-1350, -2000], [-1350, -150], [-1700, -150], [-1700, 150], [-1350, 150], [-1350, 2000], [-4000, 2000]],
  "landObstacles": [
    { "west": -4000, "east": -1350, "south": 150, "north": 2000 },
    { "west": -4000, "east": -1350, "south": -2000, "north": -150 },
    { "west": -4000, "east": -1700, "south": -150, "north": 150 }
  ],
  "slope": 0.1,
  "landSlope": 0.15,
  "landMaxHeightM": 15,
  "rocks": [
    { "eastM": -1600, "northM": 120, "radiusM": 6, "topDepthM": 0.5 },
    { "eastM": -1480, "northM": -60, "radiusM": 5, "topDepthM": 1.5 },
    { "eastM": -1360, "northM": 140, "radiusM": 8, "topDepthM": 0.3 }
  ],
  "weed": [{ "eastM": -1580, "northM": -40, "radiusM": 60 }],
  "rockShoreM": 15,
  "rings": [[-1700, -60], [-1700, 0], [-1700, 60], [-1640, 150], [-1560, 150]],
  "ringHeightM": 1.0,
  "buoys": [[-1450, -100], [-1450, 0], [-1450, 100]],
  "buoyRingHeightM": 0.3
}
```

`content/boat/hanse508.json`: `physics.ground` (after `physics.lines`):

```json
"ground": {
  "stiffnessNPerM": 40000,
  "friction": 0.5,
  "dampingNsPerM": 2000,
  "maxSlope": 1.0,
  "gradientStepM": 0.5,
  "note": "assumption for teaching: the bottom presses on the keel in proportion to how deep it is in; touching at 2 kn or less, full astern gets her off; at 3 kn she sticks"
}
```

and in `physics.lines`: `"shoreReachM": 40, "shoreSwimS": 30, "buoyReachM": 2.5, "buoyMaxSpeedMps": 0.3, "buoySlackM": 1.0, "shoreSlackM": 0.5`.

### 11.3 Model

`src/model/seabed.ts` (pure):

```ts
export type SeabedType = 'sand' | 'mud' | 'weed' | 'rock';
export function depthAt(eastM: number, northM: number, areaData?: AreaData): number;
export function seabedAt(eastM: number, northM: number, areaData?: AreaData): SeabedType;
/** Horizontal gradient of the depth (towards deeper water), by central differences of gradientStepM. */
export function depthGradient(eastM: number, northM: number, areaData?: AreaData, data?: BoatData): [number, number];
/** The points of our hull that can touch the bottom, boat frame, with the depth each needs. */
export const GROUND_POINTS: { x: number; needM: number; part: HullPart }[]; // keel (x −1.4, dimensions.draft 2.4, 'keel'); rudder (hull.rudder.stockX, −hull.rudder.bottomY 1.95, 'stern')
export function groundForces(boat: BoatState, areaData?: AreaData, data?: BoatData): ExternalForces;
```

- `depthAt`, in this order: inside `marina.basin` → `marina.depthM`; otherwise `b` = the distance to the `coast` polygon's edges; inside the coast polygon (land, ray casting) → `−min(landMaxHeightM, landSlope·b)`; outside (water) → `min(openDepthM, slope·b)`, then, inside any rock's circle, `min(that, rock.topDepthM)`.
- `seabedAt`: inside a rock's circle, or water within `rockShoreM` of the coast → `rock`; inside a `weed` circle → `weed`; inside `marina.basin` → `marina.seabed` (`mud`); otherwise `sand`.
- `groundForces`: for each ground point (z = 0): `D = depthAt(pointToMap(boat, x, 0))`, `pen = needM − D`; if `pen ≤ 0` nothing. `N = stiffnessNPerM·pen`. `g = depthGradient(...)`, `slope = min(maxSlope, |g|)`, `ĝ = g / |g|` (no push if `|g| < 1e−6`). `v = pointVelocity(boat, x, 0)`, `sp = |v|`. The force (map) `N·slope·ĝ − (sp > 0.01 ? friction·N·v / sp : 0) − dampingNsPerM·v`, applied at `(x, 0)`. Hit `{ key: 'bottom:' + part, obstacleId: 'bottom', partId: 'env_seabed', part, approachMps: sp, fender: false }`.
- **Land:** `landObstacles` become `Obstacle`s (`id` `land`, `partId` `env_shore`) for `contactForces` (M43), with the marina's.
- `harbourForces` adds `groundForces` in every place (the marina basin is 5 m deep, so nothing touches there).

**Places:** `PlaceId` gains `'bay'`; `placeStart('bay')` = the place's data, `sea: 'sheltered'`; `goToPlace('bay')` gets the marina's ready state (sails away, engine in neutral, autopilot off).

**Lines** (`mooringLines.ts`): `LineCode` gains `'bl'` and `'sl'`; `MooringLine` gains `farIndex: number` (the buoy's or ring's index; −1 for the marina's lines); `CrewTask.kind` gains `'swimShore'`.

- `bl` (bow line to a mooring buoy): `canTake`: the place is the bay; the bow fitting tip `(bowFittingTipX, 0)` within `buoyReachM` of a buoy; the speed at most `buoyMaxSpeedMps`. Take: from the bow cleat nearer to the buoy to `(buoy, buoyRingHeightM)`, `lengthM = d + buoySlackM`. Reasons: `lines.reason.bay`, `lines.reason.buoyFar`, `lines.reason.fast`.
- `sl` (shore line): `canTake`: the place is the bay; no shore line on; no crew task; a stern cleat within `shoreReachM` (horizontal) of a ring. Take: crew task `swimShore` (`shoreSwimS`); at its end the line goes from the stern cleat nearer to that ring (the nearest ring when the task started) to the ring at `ringHeightM`, `lengthM = d + shoreSlackM`. Reasons: `lines.reason.bay`, `lines.reason.shoreFar`, `lines.reason.busy`.
- `sl` counts for the line-in-the-propeller rule (a stern line); `bl` does not.

### 11.4 Store and URL

- `pl=bay` (8.4). `ln` codes for the bay: `bl<i>:<length>` and `sl<i>:<length>` (`ln=bl1:3.2`, `ln=sl2:31.5`); parsed only with `pl=bay`; `sp`, `ss`, `ll` only with `pl=marina`.
- The contact list gets ground hits (M43's `stepContact`).

### 11.5 UI

- **Place section:** `place-bay` (`place.bay`); status `place.status.bay`.
- **Instrument strip:** a `strip-depth` item (on the first line after the heel) with `t('instruments.depth', { m: depth.toFixed(1) })`, where `depth = depthAt(pointToMap(boat, hull.saildrive.x, 0))` (the sounder under the hull); shown when the depth is below 30 m or the place is not open water; class `is-shallow` (red text) when below `dimensions.draft + 1.0` m.
- **Mooring section:** in the bay, rows for `bl` and `sl` (10.5), with `line-sl-status` showing `lines.swimming` while the crew task runs.
- **Map** (`mapView.ts`, `drawSeabed` before `drawHarbour`): the depth as shaded cells (cell size `max(4 m, 4 px × metresPerPx)`; only cells in the view and only where `depthAt < openDepthM`): depth < `draft` → `#e9b7a8` (too shallow for us), < 5 m → `#cfe6f2`, < 10 m → `#a9d3ea`, < 20 m → `#86bfdf`; land `#d8cfa6`; the rocks as a black `+` with four dots (the chart symbol for a dangerous underwater rock), the rings as black dots (3 px), the buoys as orange dots (5 px). The mini-map draws the same, with cells of at least 8 px.
- **3D** (`src/render3d/seabed.ts`): one terrain mesh over `[−2000, −1100] × [−700, 700]` (east × north) with vertices every 10 m (20 m at Detail Low), height `−depthAt` (land above the water, seabed below it), vertex colours sand `#d8c79a`, weed `#4f6b3a`, rock `#7a7066`, land `#8f9a5b` (above 6 m `#a39c8a`); the marina basin's bottom as a flat plane at −5 m in mud `#6b5b45`. Shown within 2,000 m of the boat. `src/render3d/bay.ts`: the rings (a 0.8 m post with a 0.15 m torus, id `env_shore_ring`), the buoys (a white sphere of 0.35 m radius with a small ring on top, id `env_mooring_buoy`), floating on `heightAt` as the practice buoys do.
- Picking: the terrain above the water `env_shore`, below `env_seabed`.

### 11.6 Strings and registry

Registry (`phase: 7`, `status: "draft"`, `group: "harbour"`): `env_seabed` (`environment`), `env_shore` (`environment`), `env_rock` (`environment`), `env_shore_ring` (`environment`), `env_mooring_buoy` (`environment`), `rope_bow_line` (`rope`), `rope_shore_line` (`rope`), `term_grounding` (`term`, related `env_seabed`, `fit_instrument_display`; `showMe` `?pl=bay&m=harbour&pe=-1676.4&pn=0.0&hdg=270&bs=1.0&eng=1&lv=0&cam=side-port`).

| Key | English | Russian (draft) |
|---|---|---|
| `place.bay` | Bay | Бухта |
| `place.status.bay` | At the entrance of a bay. Watch the depth: rocks hide in the middle and along the shores. | У входа в бухту. Следите за глубиной: камни скрываются посередине и у берегов. |
| `instruments.depth` | Depth {m} m | Глубина {m} м |
| `lines.name.bl` | Bow line to the buoy | Носовой конец на бочку |
| `lines.name.sl` | Shore line | Береговой швартов |
| `lines.take.bl` | Pick up the buoy | Взять бочку |
| `lines.take.sl` | Take a line ashore | Завести конец на берег |
| `lines.swimming` | The crew is taking the line ashore… {seconds} s | Экипаж заводит конец на берег… {seconds} с |
| `lines.reason.bay` | Only in the bay. | Только в бухте. |
| `lines.reason.buoyFar` | Bring the bow within 2.5 m of a buoy, nearly stopped. | Подведите нос ближе 2,5 м к бочке, почти без хода. |
| `lines.reason.shoreFar` | A ring on the shore must be within 40 m of the stern. | Рым на берегу должен быть ближе 40 м от кормы. |

Glossary (`English / Russian`):

| Id | name | alternatives | short | what | onThisBoat | mistakes | showMe |
|---|---|---|---|---|---|---|---|
| `term_grounding` | Running aground / Посадка на мель | touching the bottom / касание грунта | The keel touches the bottom where the water is shallower than the draft. / Киль касается дна там, где глубина меньше осадки. | The keel goes deepest: 2.4 m on this boat. Touch gently and full astern usually gets you off the way you came; come in fast and she sticks. Watch the depth before it is too late. / Глубже всего сидит киль: 2,4 м у этой лодки. При лёгком касании полный назад обычно снимает лодку тем же путём; на скорости она застревает. Следите за глубиной заранее. | Draft 2.4 m (standard keel). The depth on the strip turns red under 3.4 m. In the app a touch at 2 kn or less comes off with full astern; at 3 kn she sticks. / Осадка 2,4 м (стандартный киль). Глубина на полосе приборов краснеет меньше 3,4 м. В приложении при касании до 2 уз лодка снимается полным назад; на 3 уз застревает. | Motoring into a bay at cruising speed. → Slow down near the shore and watch the depth. / Входить в бухту крейсерской скоростью. → Сбавьте ход у берега и следите за глубиной. | Coming in slowly towards the shallow end of the bay. / Медленный заход к мелкому краю бухты. |
| `env_seabed` | Seabed / Грунт | bottom / дно | What the bottom is made of: sand, mud, weed or rock. / Из чего дно: песок, ил, трава или камень. | It decides how well an anchor holds: sand and mud hold well, weed and rock poorly. / От него зависит держание якоря: песок и ил держат хорошо, трава и камень плохо. | The bay has sand, a patch of sea grass and rocky shores. / В бухте песок, пятно морской травы и каменистые берега. | — / — | — / — |
| `env_shore` | Shore / Берег | — / — | The land around the bay. / Суша вокруг бухты. | — / — | — / — | — / — | — / — |
| `env_rock` | Underwater rock / Подводный камень | — / — | A rock that does not show above the water. / Камень, не видный над водой. | The chart marks it with a cross and dots. / На карте он обозначен крестиком с точками. | Three in the bay, one in the middle. / Три в бухте, один посередине. | — / — | — / — |
| `env_shore_ring` | Shore ring / Рым на берегу | — / — | A ring fixed in the rock for a shore line. / Кольцо, вбитое в скалу для берегового швартова. | — / — | Five rings on the back and the north shore. / Пять рымов на дальнем и северном берегу. | — / — | — / — |
| `env_mooring_buoy` | Mooring buoy / Швартовная бочка | buoy / буй | A buoy fixed to a weight on the bottom that you tie your bow to. / Буй на якоре-грузе, к которому крепят нос. | Come up to it slowly into the wind, pick it up with the boat hook at the bow and tie a bow line through its ring. / Подходите медленно против ветра, возьмите её отпорным крюком с носа и проведите носовой конец через рым. | Three buoys at the mouth of the bay. / Три бочки у входа в бухту. | Approaching downwind. → Come up into the wind so you can stop at it. / Подходить по ветру. → Подходите против ветра, чтобы остановиться у неё. | — / — |
| `rope_bow_line` | Bow line / Носовой конец | — / — | A line from a bow cleat. / Конец с носовой утки. | — / — | — / — | — / — | — / — |
| `rope_shore_line` | Shore line / Береговой швартов | — / — | A line from the stern to a ring or a rock on the shore. / Конец с кормы на рым или камень на берегу. | Used with the anchor so the boat lies with her stern to the shore and does not swing. / Применяется с якорем, чтобы лодка стояла кормой к берегу и не разворачивалась. | The crew takes it ashore in 30 s in the app. / В приложении экипаж заводит его за 30 с. | — / — | — / — |

### 11.7 Tests

`tests/seabed.test.ts`:

1. `depthAt`: (−1650, 0) → 5.0; (0, 0) → 40; (−1480, −60) → 1.5 (rock); (0, 1460) → 5 (marina basin); (−1800, 0) → −15 (land).
2. `seabedAt`: (−1580, −40) weed; (−1690, 0) rock; (−1650, 50) sand; (0, 1460) mud.
3. `depthGradient` at (−1650, 0) points east (towards deeper water) with size 0.1 (±0.001).
4. Every `landObstacles` rectangle lies inside the `coast` polygon; every ring is on the coast (within 0.01 m of an edge); every buoy is in water deeper than 10 m.
5. `groundForces` with the keel 0.2 m too deep (pen 0.2): `N` = 8,000 N, the push along the gradient 800 N; a hit `bottom:keel`.

`tests/mooringLines.test.ts` additions: `bl` take near buoy 1 at 0.2 m/s works, at 0.4 m/s gives `lines.reason.fast`; `sl` take starts a 30 s crew task and ends with the line on the nearer stern cleat.

`tests/physicsTruths7.test.ts` (the boat heading 270 at north 0 with the keel 1 m east of the line where the depth is 2.4 m: `eastM = −1676.4`; engine running in neutral; at 15 s the lever goes to −100; 45 s at 20 Hz steps or 60 fps; prototype values in brackets):

- **PT-53** the keel touches where it is too shallow: starting at 1 kn: the keel goes [0.07, 0.14] m too deep (0.10); the report has a `bottom` hit at the `keel` with severity `knock`; by 45 s she is off (the keel's depth more than 2.4 m) and has gone back more than 20 m (48.7). Starting at 3 kn: [0.25, 0.37] m (0.31), severity `hit`; at 45 s still aground, back less than 3 m (1.3).

### 11.8 Browser checks (`scripts/shots-m45.mjs`)

Scenes: `bay-entrance` (`?pl=bay&m=harbour&cam=top`), `bay-map` (`?pl=bay&m=harbour&cam=map`, zoomed out three times), `bay-shallow` (the `term_grounding` `showMe` link: the depth on the strip red), `bay-buoy` (`?pl=bay&m=harbour&pe=-1457.0&pn=0.0&hdg=90&bs=0&cam=side-port`: the bow at a buoy).

Live checks:

1. `m45 depth`: `?pl=bay&m=harbour`: `strip-depth` shows a number; after `choosePlace(page, 'open')` it is hidden.
2. `m45 buoy`: the `bay-buoy` link; `lineAction(page, 'bl', 'take')`; `waitForLink(page, ['ln=bl1:'])`.
3. `m45 aground`: the `term_grounding` link with `tx=4`: within 3 s real time the damage alert names the bottom at the keel.

### 11.9 Done when

11.7 passes; the owner motors into the bay watching the depth, touches the bottom gently and backs off, picks up a mooring buoy, and takes a shore line.

### 11.10 Not in M45

The anchor (M46); tides; the dinghy; swimming crew in 3D.

### 11.11 Decided in the M45 PR

(empty)

---

## 12. M46: Anchor and windlass

**Independent review: required** (anchor physics in the shared step; the scope rule and the alarm teach safety)

### 12.1 Files

New: `src/model/anchor.ts`, `src/ui/anchorPanel.ts`, `src/render3d/anchorChain.ts`, `tests/anchor.test.ts`, `scripts/shots-m46.mjs`. Changed: `src/model/realistic.ts` (`STATION_IDS` gains `'bow'`), `src/ui/realisticPanel.ts`, `src/ui/stationDrawing.ts` (the Bow station and the helm remote), `src/model/harbourForces.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/ui/modes.ts`, `src/ui/panel.ts`, `src/ui/mapView.ts`, `src/ui/miniMap.ts`, `src/ui/damageReport.ts` (the alarm alert), `src/render3d/boat/index.ts` (the anchor mesh moves), `content/boat/hanse508.json` (`physics.anchor`, the `bow` station), `tests/physicsTruths7.test.ts`, `tests/realistic.test.ts` (the station list), `tests/urlState.test.ts`, `tests/modes.test.ts`, both `ui.json`, both glossaries, `docs/review/ru.md`, the registry, `scripts/ui.mjs`, `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md`.

**Phase 6 provides** (refresh check): `deck.anchor` with `rollerTip: { x: 6.9, y: 1.7, z: 0 }` (where the chain leaves the bow roller), the anchor mesh (`fit_anchor`) stowed in the roller, a short chain mesh to the windlass (`fit_anchor_chain`), the windlass (`fit_anchor_windlass`). If they are missing, M46 adds `deck.anchor.rollerTip` with this value and draws the anchor as a dark grey plough shape (two triangles and a shank, 0.9 m long).

### 12.2 Data (`content/boat/hanse508.json`)

`physics.anchor` (after `physics.ground`):

```json
"anchor": {
  "massKg": 40,
  "chainLengthM": 70,
  "chainKgPerM": 2.2,
  "steelDensityKgM3": 7850,
  "anchorNote": "assumption: a 40 kg plough-type anchor and 70 m of 10 mm chain (skipper questions 19 and 20)",
  "windlassDownMps": 0.5,
  "windlassUpMps": 0.4,
  "windlassMaxPullN": 8000,
  "windlassNote": "assumption: an electric windlass of about 1,500 W (skipper question 21)",
  "holdingRatio": { "sand": 25, "mud": 15, "weed": 5, "rock": 2 },
  "holdingNote": "assumption (PT-55): how many times its own weight the set anchor holds on each bottom",
  "scopeHolding": [[1, 0], [2, 0.4], [3, 0.65], [4, 0.8], [5, 0.9], [7, 1.0]],
  "scopeNote": "assumption (PT-54): the share of the holding at a scope (chain out / effective depth)",
  "liftedHoldingShare": 0.3,
  "unsetHoldingShare": 0.15,
  "setDistanceM": 1.0,
  "dragResistanceNsPerM": 4000,
  "maxDragMps": 0.5,
  "snubStiffnessNPerM": 20000,
  "breakOutMarginM": 0.5,
  "alarmAfterS": 5,
  "strongWindKn": 20
}
```

`realisticMode.stations` gains `{ "id": "bow", "windlass": "fit_anchor_windlass" }` (last).

### 12.3 Model (`src/model/anchor.ts`, pure)

```ts
export type AnchorPhase = 'stowed' | 'hanging' | 'bottom' | 'set';
export type WindlassMotion = 'off' | 'down' | 'up';
export interface AnchorState {
  phase: AnchorPhase;
  chainOutM: number;
  /** On the bottom (phases 'bottom' and 'set'): where the anchor lies, map metres. */
  eastM: number; northM: number;
  windlass: WindlassMotion;
  /** The windlass stopped under load; cleared by the next press. */
  cutOut: boolean;
  /** Metres dragged since it reached the bottom (to set it) and seconds it has been dragging without a break. */
  draggedM: number; dragS: number;
  dragging: boolean; alarm: boolean;
}
export const ANCHOR_STOWED: AnchorState;
export interface SeabedEnv { depthAt(e: number, n: number): number; seabedAt(e: number, n: number): SeabedType }
/** Chain weight in water per metre, N: chainKgPerM·g·(1 − waterDensity / steelDensity) = 18.77 N/m. */
export function chainWeightNPerM(data?: BoatData): number;
/** The chain's horizontal pull at the roller (N) for chain out L, effective depth D and horizontal distance X; and whether it is lifted off the bottom all the way to the anchor. */
export function chainPull(L: number, D: number, X: number, data?: BoatData): { pullN: number; lifted: boolean; a: number };
/** The anchor's holding now (N). */
export function holdingN(state: AnchorState, D: number, lifted: boolean, seabed: SeabedType, data?: BoatData): number;
/** The chain's force on the boat now (boat frame, at the roller). */
export function chainForces(state: AnchorState, boat: BoatState, env: SeabedEnv, data?: BoatData): ExternalForces;
/** The windlass: chain in or out (before the boat moves). */
export function stepWindlass(state: AnchorState, boat: BoatState, env: SeabedEnv, dt: number, data?: BoatData): AnchorState;
/** After the boat moved: dragging, setting, the alarm. */
export function stepAnchor(state: AnchorState, boat: BoatState, env: SeabedEnv, dt: number, data?: BoatData): AnchorState;
/** PT-31: the chain the rules ask for here (m). */
export function scopeNeededM(depthM: number, twsKn: number, data?: BoatData): number;
/** Points of the chain from the roller to the anchor, map (east, north, height), for drawing. */
export function chainPoints(state: AnchorState, boat: BoatState, env: SeabedEnv, count: number, data?: BoatData): [number, number, number][];
```

- **Effective depth** `D` = `env.depthAt(anchor)` (on the bottom) or `env.depthAt(roller)` (hanging) `+ rollerTip.y`.
- **`chainPull(L, D, X)`** (`w = chainWeightNPerM`): `L ≤ D` → `{ 0, lifted: true }`. `X0 = L − D`; `X ≤ X0` → `{ 0, lifted: false }`. `aLift = (L² − D²) / (2D)`, `XLift = aLift·asinh(L / aLift)`; `X ≥ XLift` → `{ w·aLift + snubStiffnessNPerM·(X − XLift), lifted: true }`. Otherwise find `a` in `(1e−6, aLift)` with `X(a) = L − s + a·asinh(s / a)`, `s = √(D² + 2aD)`, equal to `X` (50 bisection steps); `pullN = w·a`, `lifted: false`. (Worked: L 30, D 6, w 18.77: X 27 → 68 N, X 29 → 869 N, X 29.5 → 7,484 N.)
- **`holdingN`**: `massKg·g·holdingRatio[seabed]·interpTable(scopeHolding, chainOutM / D)·(lifted ? liftedHoldingShare : 1)·(phase === 'set' ? 1 : unsetHoldingShare)`.
- **`chainForces`**: phases `bottom` and `set` only. The roller in the map `R = pointToMap(boat, rollerTip.x, 0)`; `X` = horizontal distance from `R` to the anchor; `pullN` from `chainPull(chainOutM, D, X)`; the force `pullN` towards the anchor (horizontal), applied at `(rollerTip.x, 0)`.
- **`stepWindlass`** (also in Held still):
  - `down`: `chainOutM += windlassDownMps·dt`, at most `chainLengthM` (then `windlass: 'off'`). Phase `stowed` → `hanging` as soon as `chainOutM > 0`. `hanging` and `chainOutM ≥ D` (at the roller) → `bottom` at the point straight below the roller (`R`), `draggedM = 0`.
  - `up`: the pull `P` (phases `bottom` / `set`: `chainPull` now; otherwise 0). If `P > windlassMaxPullN` → `windlass: 'off'`, `cutOut: true`. Otherwise `chainOutM −= windlassUpMps·max(0.2, 1 − P / windlassMaxPullN)·dt`. On the bottom and `chainOutM ≤ D + breakOutMarginM` → the anchor breaks out: `hanging`. `chainOutM ≤ 0` → `ANCHOR_STOWED`.
  - Pressing either direction clears `cutOut` and `alarm`.
- **`stepAnchor`** (not in Held still): phases `bottom`/`set` only. `P`, `lifted` from `chainPull`; `H = holdingN(...)` with the seabed under the anchor. If `P > H`: the anchor moves towards `R` by `min(maxDragMps, (P − H) / dragResistanceNsPerM)·dt`, `draggedM` grows by the same, `dragging: true`, `dragS += dt`; if the phase is `bottom`, the seabed is not `rock` and `draggedM ≥ setDistanceM` → `set`. Otherwise `dragging: false`, `dragS = 0`. `alarm` becomes true when the phase is `set` and `dragS ≥ alarmAfterS`; it stays until a windlass press, `goToPlace` or `reset`.
- **`scopeNeededM(depth, tws)`**: `max(4·(depth + rollerTip.y) + (tws ≥ strongWindKn ? 2·dimensions.loa : 0), 3·dimensions.loa)`.
- **`chainPoints`**: hanging → from the roller straight down to the anchor at `rollerTip.y − chainOutM` below it; on the bottom → the catenary from `R` (height `rollerTip.y`) to the touchdown point (`count` points along the curve `y(x) = a·(cosh(x/a) − 1)` measured from the touchdown, with the suspended length `s` and span from `chainPull`), then a straight line on the bottom (`−depthAt`) to the anchor; when lifted, the curve runs to the anchor itself.

`harbourForces` inputs gain `anchor: AnchorState` and `env: SeabedEnv` and add `chainForces`. The store passes `env = { depthAt, seabedAt }` (M45).

### 12.4 Store and URL

- `AppState.anchor: AnchorState` (`ANCHOR_STOWED` at start, `reset`, `goToPlace`).
- Action `{ type: 'windlass'; motion: WindlassMotion }` (hold-to-act: `down`/`up` on press, `off` on release).
- `step`: `stepWindlass` before the external forces (4.3 step 2), `stepAnchor` after `stepBoat` (step 6).
- **URL** (after `ln`): `an=<chainOutM, 1 decimal>` when not stowed; `ap=<east>,<north>` (1 decimal) on the bottom; `as=1` when set. Parse: `an` 0 < value ≤ `chainLengthM`; with a valid `ap` → `bottom` (or `set` with `as=1`) at that point; without `ap` → `hanging`. Not stored: the windlass motion, `cutOut`, `draggedM`, `dragS`, `dragging`, `alarm`.

### 12.5 Sections, stations and modes

- `SECTION_IDS` gains `'anchor'` (last); `sectionAvailable('anchor')`: `settings.ropesMode === 'easy'`. `MODE_LAYOUTS` becomes the final table of 4.4.
- **Realistic mode:** `STATION_IDS = ['port', 'starboard', 'helm', 'mast', 'bow']`; the station bar gets "Bow". The Bow station shows the windlass panel (12.6) and, in the bay, the `bl` line row (10.5). The Helm station gets the windlass remote (the same two hold buttons and the counter, test ids suffixed `-helm`) under the thruster joysticks. The link key `st=bow` works as the other stations.

### 12.6 UI

**Anchor section** (`src/ui/anchorPanel.ts`, `createAnchorPanel(store, suffix = ''): HTMLElement[]`, reused at the Bow station with suffix `-bow` and, without the explanations, at the helm with `-helm`):

1. Two hold buttons (3.1) `windlass-down` (`anchor.down`) and `windlass-up` (`anchor.up`), 44 px tall, side by side, `data-part-id="fit_anchor_windlass"`.
2. The chain counter `chain-counter`: `t('anchor.counter', { m: Math.round(chainOutM) })`, large digits (`font-size: 1.6rem`).
3. A status line `anchor-status`: `anchor.phase.<phase>`, then, when dragging, `anchor.dragging`; when cut out, `anchor.cutOut`.
4. The scope line `anchor-scope` (on the bottom): `t('anchor.scope', { depth, ratio })` with `depth` = the depth at the anchor (1 decimal) and `ratio` = `chainOutM / D` (1 decimal); and the check `anchor-check`: `chainOutM ≥ scopeNeededM` → `anchor.enough`, otherwise `t('anchor.more', { m: Math.ceil(needed − chainOutM), need: Math.round(needed) })`.
5. While `alarm`: `anchor-alarm` (`anchor.alarm`, red) with a button `alarm-silence` (`anchor.silence`) that dispatches `windlass` `off` (which clears the alarm).
6. `p.explain` `anchor.hint`.

**Alert stack:** while `alarm`, an alert `anchor-alarm-alert` (red) with `anchor.alarm`.

**Map and mini-map:** the anchor as a ⚓ glyph at its position (on the bottom), a line from the bow to it, and a dashed circle of radius `√(max(0, chainOutM² − D²)) + loa` round it (where the boat can swing).

**3D** (`src/render3d/anchorChain.ts`, in the world group): the chain from `chainPoints` (24 points) as a dark grey tube of 0.03 m radius (at least the rope minimum width on screen); the anchor mesh (`fit_anchor`, Phase 6) moves from the roller to the chain's end and lies on the bottom; the chain part under water is seen through the water as the keel is.

### 12.7 Strings and registry

Registry (`phase: 7`, `status: "draft"`): `fit_windlass_remote` (`fitting`, `cockpit`, related `fit_anchor_windlass`), `term_scope` (`term`, `harbour`, related `fit_anchor_chain`, `fit_anchor`, `env_seabed`; `showMe` `?pl=bay&m=harbour&pe=-1640.0&pn=0.0&hdg=90&bs=0&an=34.0&ap=-1615.0,0.0&as=1&wd=90&ws=15&cam=top`). `fit_anchor`, `fit_anchor_chain`, `fit_anchor_windlass` and `fit_bow_roller` keep the phase Phase 6 gave them; M46 adds `term_scope` to their `related`.

| Key | English | Russian (draft) |
|---|---|---|
| `anchor.label` | Anchor | Якорь |
| `anchor.down` | Chain out ▼ | Травить цепь ▼ |
| `anchor.up` | Chain in ▲ | Выбирать цепь ▲ |
| `anchor.counter` | {m} m | {m} м |
| `anchor.phase.stowed` | Anchor in the bow roller. | Якорь в носовом ролике. |
| `anchor.phase.hanging` | Anchor hanging under the bow. | Якорь висит под носом. |
| `anchor.phase.bottom` | Anchor on the bottom, not set yet. | Якорь на грунте, ещё не забрал. |
| `anchor.phase.set` | Anchor set (dug in). | Якорь забрал (зарылся в грунт). |
| `anchor.dragging` | Dragging! | Ползёт! |
| `anchor.cutOut` | The windlass stopped: too much load. Motor gently towards the anchor. | Брашпиль остановился: слишком большая нагрузка. Подойдите малым ходом к якорю. |
| `anchor.scope` | Depth {depth} m · scope {ratio} : 1 | Глубина {depth} м · длина цепи {ratio} : 1 |
| `anchor.enough` | Enough chain for the rules. | Цепи достаточно по правилам. |
| `anchor.more` | Let out {m} m more (the rules ask for {need} m). | Вытравите ещё {m} м (по правилам нужно {need} м). |
| `anchor.alarm` | Anchor alarm: the anchor is dragging. | Якорная тревога: якорь ползёт. |
| `anchor.silence` | OK | ОК |
| `anchor.hint` | To anchor: head into the wind and stop, let the chain out as she drifts back until the check says enough (scope: chain out against the depth; at least 4 × the depth plus the roller's height, or 3 boat lengths, whichever is more), then go gently astern (a third) for a few seconds to dig the anchor in. Sand and mud hold well, weed and rock poorly. | Постановка на якорь: встаньте носом к ветру, остановитесь, травите цепь, пока лодку сносит назад, до отметки «достаточно» (длина цепи к глубине: не меньше 4 глубин с высотой ролика или 3 длин корпуса, что больше), затем дайте малый назад (на треть) на несколько секунд, чтобы якорь зарылся. Песок и ил держат хорошо, трава и камень плохо. |

Glossary (`English / Russian`):

| Id | name | alternatives | short | what | onThisBoat | mistakes | showMe |
|---|---|---|---|---|---|---|---|
| `term_scope` | Scope / Длина вытравленной цепи | — / — | How much chain is out compared with the depth. / Сколько цепи вытравлено по сравнению с глубиной. | The more chain, the flatter it pulls on the anchor, and the better the anchor holds; the chain's weight also softens the jerks. With too little chain the pull lifts the anchor's shank and it drags. / Чем больше цепи, тем более горизонтально она тянет якорь и тем лучше он держит; вес цепи ещё и смягчает рывки. При короткой цепи тяга поднимает веретено якоря, и он ползёт. | 70 m of chain (an assumption). In 5 m of water the instructor's rule (3 boat lengths, 47 m) is more than 4 × the effective depth (27 m). / 70 м цепи (предположение). На глубине 5 м правило инструктора (3 длины корпуса, 47 м) больше, чем 4 эффективные глубины (27 м). | Letting out just the depth and switching off. → Let out what the check asks for, then set the anchor by going gently astern. / Вытравить цепь на глубину и успокоиться. → Вытравите сколько требует проверка, затем заставьте якорь забрать малым задним ходом. | Anchored in the bay with 34 m of chain, wind 15 kn. / На якоре в бухте, 34 м цепи, ветер 15 узлов. |
| `fit_windlass_remote` | Windlass remote / Пульт брашпиля | — / — | Buttons at the helm that run the windlass. / Кнопки у штурвала, управляющие брашпилем. | Lets the helmsman let the chain out or bring it in without going forward. / Позволяют рулевому травить или выбирать цепь, не уходя на нос. | At the helm (EXERCISES.md 5, owner). / У штурвала (владелец). | — / — | — / — |

### 12.8 Tests

`tests/anchor.test.ts` (with a flat test environment: `env = { depthAt: () => 5, seabedAt: () => <type> }`):

1. `chainWeightNPerM` = 18.77 (±0.01). `chainPull` worked values of 12.3 (±1 %); `X ≤ L − D` → 0; `L ≤ D` → lifted.
2. `holdingN`: set, sand, scope 5.1, not lifted → 40·9.81·25·interp(5.1) (0.905) = 8,878 N (±1 %); unset → × 0.15; lifted → × 0.3.
3. `stepWindlass`: down for 10 s from stowed → 5.0 m, `hanging`; at `chainOutM ≥ 6.7` → `bottom` under the roller; up under a 9,000 N pull → `cutOut`; up from 10.0 m on the bottom (no pull) → `bottom` until the chain passes 7.2 m (5 + 1.7 + 0.5), then `hanging`, and stowed at 0.
4. `scopeNeededM`: (5, 10) → 46.65; (15, 10) → 66.8; (5, 25) → 57.9 (= 26.8 + 31.1).
5. URL: `an=34.0&ap=-1615.0,0.0&as=1` with `pl=bay` round-trips; `an=5.0` alone → `hanging`.

`tests/physicsTruths7.test.ts` (the boat at (0, 0) heading 10 in sailing mode, sails away, autopilot off, engine running in neutral; wind from 0; the anchor on the bottom at (0, 0.8·L) with chain `L`, phase `bottom`; the flat environment of 5 m; the gusty runs use wind mode `gusty`, seed 1, the default size; 300 s; prototype values in brackets):

- **PT-54** short scope drags: weed, L 20 (scope 3.0), 25 kn gusty: dragged [10, 30] m (18.5) and the alarm comes on; weed, L 47 (7.0): dragged less than 3 m (1.5); weed, L 34 (5.1): [1.5, 5] m (2.9).
- **PT-55** the bottom matters: sand, L 20, 25 kn gusty: dragged less than 2 m (1.1); rock, L 34, 15 kn, lever −60 from 30 s to 50 s: never `set`, dragged [4, 12] m (7.7).
- **PT-56** swings head to wind: sand, L 34, 15 kn steady: after 300 s `|wrap180(headingDeg − 0)|` ≤ 35° (24).
- **PT-57** setting by backing down: sand, L 34, 15 kn steady: without the engine still `bottom` (not set) after 300 s; with the lever at −40 from 30 s to 50 s: `set` by 120 s, dragged [1.0, 2.0] m (1.3).
- **PT-31** scope: `scopeNeededM` as test 4, and the Anchor section's check reads "Let out 13 m more" at 34 m in 5 m (needs 46.65 → 13).

### 12.9 Browser checks (`scripts/shots-m46.mjs`)

Helper `holdWindlass(page, dir, ms)` (3.6), on `windlass-<dir>`.

Scenes: `anchored-top` (the `term_scope` `showMe` link), `anchored-map` (the same with `cam=map`), `anchored-side` (`cam=side-port`: the chain into the water), `bow-station` (the same with `mode=realistic&st=bow`), `anchor-section` (the same with the Anchor section open).

Live checks:

1. `m46 let go`: `?pl=bay&m=harbour&pe=-1640.0&pn=0.0&hdg=90&bs=0&wd=90&ws=10&tx=4`: `holdWindlass(page, 'down', 4000)` (×4: 16 s, 8 m of chain; the water under the roller is 6.7 m deep, so the anchor still hangs: `anchor-status` reads hanging), then `holdWindlass(page, 'down', 10000)`: `anchor-status` reads on the bottom; `waitForLink(page, ['an=', 'ap='])`.
2. `m46 check`: the `term_scope` link: `anchor-check` reads "Let out 13 m more".
3. `m46 bow station`: `…&mode=realistic&st=bow`: the windlass buttons `windlass-down-bow` are there; the station bar has five stations.

### 12.10 Done when

12.8 passes; on the phone the owner anchors in the bay (lets the chain out, sees the check, backs down to set it), watches her swing to the wind, and sees a short-scope anchor on weed drag with the alarm.

### 12.11 Not in M46

Anchoring under sail; a second anchor; a snubber or bridle as separate lines; chain markings; tripping lines.

### 12.12 Decided in the M46 PR

(empty)

---

## 13. M47: Stern-to with the anchor, polish and sign-off

**Independent review: not needed** (combines the lines of M44–M45 with the anchor of M46 without new formulas; checks and docs)

### 13.1 Files

New: `scripts/shots-m47.mjs`. Changed: `src/model/mooringLines.ts` (stern lines also with the anchor down, 13.2), `src/ui/mooringPanel.ts` (the step hint), both `ui.json`, `docs/review/ru.md`, `README.md`, `docs/ROADMAP.md`, `docs/CODE_MAP.md`, `docs/PHYSICS_TRUTHS.md` (statuses), this spec (section 15), `tests/physicsTruths7.test.ts`.

### 13.2 Stern-to with our own anchor

Two ways the learner can lie stern-to with the anchor instead of a lazy line, both already possible with M44–M46 pieces; M47 makes them work together and explains them:

1. **At the marina quay** (a town quay without lazy lines): drop the anchor about three to four boat lengths off the berth, reverse in letting the chain out, take the stern lines, then take the chain in until it is tight. `canTake('sp' | 'ss')` is unchanged; `canTake('ll')` stays as it is (the lazy line is simply not used). No new rule: the chain holds the bow as the lazy line did.
2. **In the bay with a shore line** (EXERCISES EX-B): anchor, back towards the shore, and take a shore line from the stern to a ring (M45).

The Mooring section shows a step hint `mooring.sternToAnchor` when the anchor is on the bottom and a stern or shore line is on (`p.explain`, under the lines).

### 13.3 Strings

| Key | English | Russian (draft) |
|---|---|---|
| `mooring.sternToAnchor` | Stern-to on your own anchor: the chain holds the bow as a lazy line would. Take in the chain until it is tight, and keep the stern lines a step from the quay. | Кормой к причалу на своём якоре: цепь держит нос, как муринг. Выбирайте цепь втугую и держите корму в шаге от причала. |

### 13.4 Tests (`tests/physicsTruths7.test.ts`)

**PT-51** (second case) the anchor holds the bow with a shore line aft: the bay, the boat at (−1675, 0) heading 90 at rest, the anchor set at (−1615, 0) with 60 m of chain (the real `depthAt`: 8.5 m there), a shore line from `cleat_stern_port` to ring 1 (−1700, 0) with `lengthM = d + 0.5`; wind from 0; 300 s. Prototype values in brackets: 15 kn: the largest heading deviation from 90 is at most 12° (6.7); 25 kn: at most 16° (10.5); without the shore line at 15 kn more than 20° (30.2).

### 13.5 Accessibility, frame rate, checks

- `scripts/a11y-audit.mjs` covers: the thruster joysticks (section, quick row, helm), the place section with the marina options and the damage report, the mooring section with all line rows, the anchor section and the Bow station.
- **Frame rate:** the heaviest case is `?pl=marina&ml=tight&tr=busy&m=harbour&detail=high&cam=side-port&tx=16` with both thrusters held, and `?pl=bay&m=harbour&detail=high&an=60.0&ap=-1615.0,0.0&as=1&cam=side-port`. The owner checks the debug overlay's FPS on the phone (target as before: 50 fps or more, never below 30). The model's cost per frame at ×16 in the busy marina is measured by a test like `tests/stepCost.test.ts` (no more than twice the Phase 3 case).
- A full `SHOTS_SIZES=phone npm run shots` passes.

### 13.6 Docs

- `README.md`: Harbour mode, places, the anchor in one paragraph.
- `docs/ROADMAP.md`: Phase 7 marked done when the owner writes "Phase 7 signed off"; the decisions log gets the PR's answers.
- `docs/PHYSICS_TRUTHS.md`: each Phase 7 rule's status checked against its sources once more.
- `docs/CODE_MAP.md`: every Phase 7 file.

### 13.7 Done when

Every Phase 7 rule test passes, the audits and the full browser checks pass, and the owner has done on the phone: a stern-to in the marina with the lazy line, the same with our own anchor, anchoring in the bay with a shore line, and a mooring buoy.

### 13.8 Not in M47

Exercises with scores and debriefs, scripted winds, the night time-lapse (Phase 8).

### 13.9 Decided in the M47 PR

(empty)

---

## 14. Definition of Done (Phase 7)

- [ ] M40–M47 merged, each with its WORKFLOW checklist ticked by the owner.
- [ ] Every Phase 7 rule (PT-27, PT-31, PT-33, PT-34, PT-47 … PT-57) has a test named after it in `tests/physicsTruths7.test.ts`; every Phase 1–3 rule test passes unchanged.
- [ ] Old links open the same picture (the URL tests of every phase pass unchanged).
- [ ] Harbour mode in the mode chip and the link; the place chooser with open water, the marina and the bay.
- [ ] Contact, the damage report and fenders; mooring lines with the line-in-the-propeller rule; depth, grounding, shore lines and buoys; the anchor with the windlass, the scope check and the alarm; the Bow station and the helm remote.
- [ ] The frame-rate check on the owner's phone in the heaviest case (13.5).
- [ ] New Russian strings are drafts (status `draft`); the review document regenerated.
- [ ] `docs/BOAT_REFERENCE.md` lists every Phase 7 assumption and the skipper questions 18–21.

## 15. Decisions and open questions

### Owner's answers in the planning chat (2026-10-15)

1. Plan Phase 7 now, before Phases 5 and 6 are finished, with as little overlap as possible.
2. The spec is `docs/PHASE7_SPEC.md`; CLAUDE.md and the `/milestone` and `/review` skills read "the spec that contains your milestone", so a spec planned ahead does not confuse the builders of Phases 5 and 6.
3. Phase 7 milestones are M40–M47 (Phase 6 has M30–M39).
4. Phase 7 sets what it needs from Phase 6 (BOAT_DETAILS_ANALYSIS section 6); a refresh check before M40 compares this spec with what Phases 5 and 6 built.
5. The marina comes first, the bay and the anchor after.
6. Other yachts are moored only; traffic is how many berths are taken.
7. Lines are tap actions done by the crew, then tighten or ease.
8. A place chooser (open water, marina, bay); the places are on one map about 1.3–1.5 km apart.
9. Prop walk side unknown: the stern goes to port in reverse (assumption, skipper question 18).
10. Thrusters: **two left–right joysticks at the helm, one for the bow thruster, one for the stern thruster** (owner, a fact about the boat).
11. A contact is a bump and a damage report, never lasting damage.
12. The anchor: simple and visible (one catenary, no link-by-link chain).
13. Realistic mode gets a Bow station; the helm gets the windlass remote and the thruster joysticks.

### Decided in planning

- The low-speed model fades in below 1 kn ahead and 5 kn astern (6.2), so sailing above about 2 kn is unchanged; prototyped against the whole test suite.
- The stern thruster is a pod under the hull (the hull is too shallow aft for a tunnel).
- The marina and the bay are made-up places in the Adriatic area file, not copies of real ones.
- Choosing the marina sets the waves to Flat and the bay to Sheltered (a normal settings change the learner can undo).

### Refresh (before M40)

(The `/plan 7 refresh` session writes here what it changed after Phases 5 and 6, or "no changes needed". M40 does not start until this entry exists.)

### Open

None.
