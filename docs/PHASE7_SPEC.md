# Phase 7 specification: detailed surroundings (marina and anchor)

Status: **planned ahead** (owner's answers in the planning chat, 2026-10-15), written while Phase 5 (M25 done, M26–M29 to come) and Phase 6 (boat details) were unfinished; aligned with the Phase 6 plan (`PHASE6_SPEC.md`, merged first) on 2026-10-16; **refreshed** against the code after M34 (`/plan 7 refresh`, 2026-10-16; section 15, "Refresh") · Last updated: 2026-10-16

Read [`ROADMAP.md`](ROADMAP.md) first, then this file. Phase 7 starts after Phase 6 is signed off. It builds on the slow-speed motion of Phase 2 (`src/model/motion.ts`, `src/model/engine.ts`), the area data of Phase 3 (`content/areas/adriatic.json`, `src/model/area.ts`), the mode and section system of Phase 5 (`src/ui/modes.ts`, M27) and the anchor, cleats and fenders drawn in Phase 6. The earlier specs still describe everything the app already does.

## 0. How to use this spec (for the coding agent)

- **Before M40: the refresh check (done).** This spec was written before Phases 5 and 6 were built. The `/plan 7 refresh` session (2026-10-16, after M34) compared sections 3–4 and every "Phase 6 provides" and "Phase 5 provides" line with the code and fixed what had changed; section 15 "Refresh" lists the changes. **Do not build M40 from a spec that has no "Refresh" entry in section 15.**
- Do **one milestone** (sections 6–13), on the branch your session gives you, in one PR titled `M<N>: <name>`. Read sections 0–5 first every time; they apply to all milestones. Then read only your milestone's section. Milestones are built in order (M40 → M47); each needs the ones before it merged.
- Build order inside a milestone: data → pure model + tests → store/URL → UI → 3D → map → browser checks → docs.
- **Numbers are final.** Every number in this spec was chosen or prototyped on 2026-10-15 against the real model code (section 3.5 says how). Boat and place numbers go into the data files named in each section, never into code. Numbers marked **tunable** may be changed only if a test band fails after you have checked your formulas against 3.4 "common mistakes": change the tunable key, report the before and after values in the PR, and never widen a band. A band that still fails after tuning is a question for the owner in the PR.
- **Text is data.** Every English string in this spec is final: copy it exactly. Russian strings marked as drafts are AI drafts (CLAUDE.md): copy them; where none is given, write a draft yourself following PHASE4_SPEC 3.3. After any change to `content/lang/ru/*.json` run `npm run review-doc -- ru`.
- **Signatures.** Function names, signatures, CSS classes and `data-testid`s are given so milestones fit together and the browser checks can find things. Keep them; add private helpers freely.
- **Write back.** If you decide something this spec leaves open, write it into your milestone's section under "Decided in the M<N> PR".
- **Everything earlier keeps working.** Every existing test stays green, every PHYSICS_TRUTHS test passes, sailing ahead faster than 2 kn with the engine in neutral (or faster than 4 kn with it in gear) behaves exactly as before (M40 was prototyped against the whole test suite: 741 tests passed unchanged; a builder check implemented M40 from this spec and reproduced every number; the suite has 803 tests after M34, and the Phase 6 tests added since do not step the boat, so the prototype still holds), and every old link opens the same picture. An existing unit test may only be changed where your milestone section says so, or under the general rules of 3.7.
- Sailing terms in UI text get a short explanation the first time they appear on a screen (CLAUDE.md).

## 1. Goal

The learner can bring the Hanse 508 into a Mediterranean marina and out again, anchor in a bay, and see why things go wrong.

What the learner should feel:

> **Slow is hard.** Below two knots the keel stops gripping: the wind pushes her sideways and blows the bow off, going astern the stern walks to one side, and she keeps moving long after the engine is in neutral. The thrusters, a burst of engine with the wheel over, the lines and the anchor are the tools that hold her. If she touches something, a report says what, where and how hard, and whether a fender took it.

## 2. Scope

### In scope (Phase 7)

1. **Slow-speed handling** (M40): the boat can slide sideways (sway) and turn on the spot when pushed; the wind on the hull and rig pushes her sideways and turns her bow downwind at low speed; prop walk going astern; prop wash over the rudder going ahead; the hook through which later forces (thrusters, lines, anchor, contact) act on the boat. Sailing is unchanged once she makes way (the rudder's grip is full from 1 kn ahead and 5 kn astern, the side wind is gone from 2 kn, prop walk and prop wash from 4 kn; 6.2).
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

The M40 model was prototyped on 2026-10-15 as a throwaway change to `stepBoat` with the data of 6.2. With it, the whole test suite passed (741 tests). The bands in 6.6 are the prototype's values with the margins stated there. The anchor (12.3) was prototyped with the same model, the catenary of 12.3, and gusty wind seed 1. Line and contact springs (9.3, 10.3) were run in the prototype at the largest substep (0.05 s) and were stable; for the lightest effective mass (a force at the bow turning the boat, about 6,000 kg) they stay at `k·h²/m` ≤ 0.2 and `c·h/m` ≤ 0.6. Do not raise a stiffness or damping above the spec's value.

### 3.6 Browser-check conventions (every milestone)

- Each milestone has `scripts/shots-m<N>.mjs`, registered in `scripts/shots.mjs` (import, `SCENES`, `liveGroups`) with names written without the prefix, as Phase 5 (PHASE5_SPEC 3.6).
- **What `openPage` adds:** Phase 7 labels (`m40` … `m47`) are treated like Phase 5 ones: no `held=1`, `sea=flat` or `clock=0` is added, and no `mm=0` (Phase 6 labels, `m30` … `m34`, stay as they are: they get all four). In `openPage` (`scripts/shots.mjs`) the four label tests are today `/m([6-9]|1\d|2[5-9])/` (held), `/m(1[4-9]|2[5-9])/` (sea), `/m(1[7-9]|2[5-9])/` (clock) and `/m(28|29)/` (mini-map); the M40 PR appends `|4[0-7]` inside each group, giving `/m([6-9]|1\d|2[5-9]|4[0-7])/`, `/m(1[4-9]|2[5-9]|4[0-7])/`, `/m(1[7-9]|2[5-9]|4[0-7])/` and `/m(28|29|4[0-7])/`, so `m4a`, `m4b`, `m4c` still do not match. Phase 7 checks therefore run with the app's default waves unless their link says `sea=` (a place link sets its own sea, 8.4).
- **Live checks run on the test clock** (CLAUDE.md, "Running the browser checks"): almost every Phase 7 check depends on how much app time passes (a hold, a drift, a crew task, a fender lost), so each Phase 7 group is registered in `liveGroups` as `m4N: () => liveM4NChecks(onTestClock)`, and its pages open on the test clock. Every wait in a live check is `page.waitForTimeout(ms)`, which moves the app's time on by exactly `ms`; "wait 3 s" and "within 2 s" in the milestone sections mean **app time**, the same on every machine. A wait for a result polls with `page.waitForTimeout` (as `waitForLink` does), never with `page.waitForFunction`; a CSS transition still needs `page.realWaitForTimeout(ms)`. Scenes do not use the test clock: a scene "after 4 s" is `waitMs: 4000` in its entry (a picture, not a check).
- Checks find things by `data-testid` or with `exact: true`; links are read with `waitForLink`.
- New helpers in `scripts/ui.mjs` (each milestone adds its own; signatures below): every check uses them, never raw selectors for these controls.

```js
/** M41: holds a thruster joystick (which: 'bow' | 'stern', dir: -1 | 1) for `ms` milliseconds of app time (page.waitForTimeout); via: 'section' (opens the section first) | 'quick' | 'helm'. */
export async function holdThruster(page, which, dir, ms, via = 'section') {}
/** M42: chooses a place ('open' | 'marina' | 'bay') in the Place section. */
export async function choosePlace(page, place) {}
/** M44: taps a line action: code ('sp' | 'ss' | 'll' | 'bl' | 'sl'), action ('take' | 'tighten' | 'ease' | 'letGo'). */
export async function lineAction(page, code, action) {}
/** M46: holds the windlass button ('down' | 'up') for `ms` milliseconds of app time (page.waitForTimeout); suffix '' (the Anchor section, opened first), '-bow' or '-helm'. */
export async function holdWindlass(page, dir, ms, suffix = '') {}
```

- A Phase 7 check that needs the boat to move for a while sets the time bar to ×16 through the link (`tx=16`) rather than waiting.
- CI (`.github/workflows/ci.yml`): scenes at phone size in the two `scenes` parts (nothing to do); live checks in the parts. The M40 PR adds a part `live, M40-M47` with `env: SHOTS_NO_SCENES=1 SHOTS_NO_TAPS=1 SHOTS_ONLY=m40,m41,m42,m43,m44,m45,m46,m47` (the later groups join it as they appear; a name with no group yet is simply skipped) and appends `,m40,m41,m42,m43,m44,m45,m46,m47` to the `SHOTS_SKIP` list of the catch-all part `live, M30 on` (the M39 PR split the old `live, M18 on`, which had reached its 45-minute limit, into `live, M18-M29` and `live, M30 on`). If the new part gets over about 10 minutes (each group prints its time), a later milestone splits it in two.
- A check that sets the time bar does it through the link (`tx=16`), never by tapping.

### 3.7 General rules for every milestone

- **Registry and glossary entries.** Every new registry entry has `id`, `kind`, `phase: 7`, `group`, `status`, `sources` (`[]` when none) and `related`; `showMe` only where given. Every new glossary entry, in both languages, has `textStatus: "draft"`; a field shown as `—` in a table is left out (an empty `alternatives` is `[]`); `what` is required (where it is `—`, use the `short` text).
- **Counts that existing checks hard-code.** Adding registry ids changes numbers that `tests/glossary.test.ts` (the size of each Learn group) and `scripts/shots-m24.mjs` (after M34: 136 ids, 10 groups, 63 Show me ids; the checks "the registry has 136 ids", "the registry has 10 groups", "the registry has 63 Show-me ids", "ten group lists", "136 entry buttons", "all 136 entries show their name", "all 63 Show me buttons…", and its header comment) write out. M40 changes `shots-m24.mjs` to take all of these counts from the registry (`registry.length`, `groups.size`, `showMeIds.length`; the header comment then names no numbers); every milestone that adds ids updates the group sizes in `tests/glossary.test.ts` (M42 also adds the eleventh group, `harbour`, to that list). These are allowed changes.
- **Every drawn id appears in the code.** `tests/glossary.test.ts` test 11 checks that every registry id that is not a `term` appears quoted (`'id'` or `"id"`) somewhere in `src/` or `content/boat/`, unless it is in `NOT_DRAWN` (`src/model/glossary.ts`). Every Phase 7 id that is not a term is carried by a mesh, a map tap, or a control's `data-part-id` as its section says (`env_quay_ring`: the quay rings' meshes from M44, 10.5; `env_rock`: a tap on a rock's chart symbol on the map, 11.5), so none goes into `NOT_DRAWN`.
- **Links are canonical.** Every `showMe` link must be in the form `serializeUrlState` writes (the glossary test checks it): speed as `bs=0.0`, no key at its default (no `lv=0`), no `m=` (PHASE5_SPEC 8.8). If a link in this spec is not canonical, use the canonical form of the same state and say so in the PR. Scene and check links need not be canonical.
- **Data in tests.** A test that changes a boat value (`propWalkSide`, `propWashFraction`, …) changes the imported object (`boat.physics.lowSpeed.…`) inside `try { … } finally { restore }`; copies have no effect, because the model reads the imported data.
- **Floating point.** Time thresholds in tests ("not at 29.9 s, at 30.0 s") are checked with a tolerance of 1e−9 or with steps that add up exactly (0.25 s, 0.5 s); force values with `toBeCloseTo`.
- **Places are solid only where you are.** The marina's quay, pontoon and yachts are obstacles only while `harbour.place === 'marina'`; the bay's land, bottom and rocks only while `harbour.place === 'bay'`. Elsewhere they are drawn (on the map and in 3D) but the boat passes through, so open-water sailing (and every earlier test, some of which sail more than a kilometre) is unchanged.
- **Place links.** A link with `pl=` opens in that place's ready state for every key it does not give (8.4).

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
export interface ExternalForces { surgeN: number; sideN: number; momentNm: number } // M43 adds contacts?: ContactHit[]

// src/app/store.ts
interface AppState {
  thrusters: ThrusterState;          // M41: { bow: -1 | 0 | 1; stern: -1 | 0 | 1 }
  harbour: HarbourState;             // Phase 6 (M33, src/model/harbour.ts): { fendersOut }; M42 adds place, layout, traffic; M43 adds fendersLost, fenderOverSpeedS, fendersLostSinceSlow
  contact: ContactState;             // M43: { touching: Record<string, number>; reports: ContactReport[]; noticeUntilS: number } (9.4)
  lines: LinesState;                 // M44: { lines: MooringLine[]; crew: CrewTask | null; fouled: boolean; foulS: number }
  anchor: AnchorState;               // M46
}
// src/app/appMode.ts (M41): APP_MODES = ['learn', 'easy', 'realistic', 'harbour']
// src/model/realistic.ts (M46): STATION_IDS = ['port', 'starboard', 'helm', 'mast', 'bow']
```

**Phase 6 provides** (PHASE6_SPEC 4.1–4.3, 7.1, 8.1–8.2, 9.1–9.4; the refresh check confirms them against the code): `src/model/harbour.ts` with `HarbourState { fendersOut: boolean }`, `DEFAULT_HARBOUR` and `fenderHintShown`; `AppState.harbour`; the action `{ type: 'setFenders'; out: boolean }`; the link key `fd=1` (fenders out); the **Harbour gear** section (`SectionId` `'harbour'`, last in `SECTION_IDS` and in every mode's `order`; `src/ui/harbourPanel.ts`, `createHarbourPanel(store)`, title `harbour.title`; the Fenders choice with the test ids `fenders-stowed`, `fenders-out` and the hint `fenders-hint`); the data `deckFittings.bowRoller`, `anchor`, `chain`, `windlass`, `cleats`, `fairleads`, `fenders` and `ballFender`; the pure helpers `cleatPlaces()`, `fenderPlaces()` and `ballFenderPlace()` (`src/model/mooringFittings.ts`); and the registry ids `fit_anchor`, `fit_anchor_chain`, `fit_anchor_windlass`, `fit_bow_roller`, `fit_mooring_cleat`, `fit_fairlead`, `fit_fender`, `fit_fender_ball`. Phase 7 extends `HarbourState` (M42, M43) and puts the line controls in the Harbour gear section (M44, M45). PHASE6_SPEC 4.2's comment says Phase 7 adds the windlass and the lines to `AppState.harbour`; this spec keeps their state apart instead (`AppState.lines`, `AppState.anchor`) and only their buttons in the Harbour gear section (lines) and the Anchor section (windlass), so each model stays small and pure. (The doc comments of `HarbourState` in `src/model/harbour.ts` and of `AppState.harbour` in `src/app/store.ts` still say "Phase 7 adds the windlass and the lines here"; M42 rewrites both to name the place, layout and traffic, and M43 adds the fender losses.)

**Confirmed by the refresh (2026-10-16, after M34):** all of the above exists with these names. In addition, as built: `createHarbourPanel(store)` returns `[group, hint]` (the `fieldset` `data-testid="fenders"` with radio inputs `fenders-stowed` / `fenders-out` inside `label.segment`s, and the hint `p.hint` `fenders-hint`, which has no `explain` class); the section is built in `src/ui/panel.ts` (`built.harbour`, `explain: true`; titles in `SECTION_TITLES`); the 3D fenders are hidden in the locker by `visible = false` and shown by `BoatModel.setFendersOut(out)`, which `src/render3d/scene.ts` calls once on build and whenever `state.harbour.fendersOut` changes (Phase 7's thruster jets follow the same pattern, 7.6); the `fd=1` key is written right after the clock keys and before the Realistic keys, and the address-bar subscriber in `src/app/urlSync.ts` compares `state.harbour.fendersOut`.

**Points on our boat that Phase 7 uses**, all computed from that data (never copied as numbers into the code):

- **Cleats:** `cleatPlaces()[i].base` (the top of the toerail under the cleat). Phase 7 names them `cleat_<role>_<side>`, role `bow`, `mid`, `stern` for the three stations in data order: `cleat_bow_starboard` is index 0, `cleat_bow_port` 1, `cleat_mid_starboard` 2, `cleat_mid_port` 3, `cleat_stern_starboard` 4, `cleat_stern_port` 5 (`cleatPlaces` lists starboard first at each station). These names are Phase 7's own; every cleat's registry id stays `fit_mooring_cleat`. `cleatPoint(id, data)` (`src/model/mooringLines.ts`, M44) returns the point in the boat frame. Starboard values (PHASE6_SPEC 8.2; port mirrors z): bow (5.0, 1.735, 0.579), mid (−1.2, 1.599, 2.2), stern (−7.5, 1.459, 2.085).
- **Sides:** Phase 6's `Side` (`1 | -1`, `src/model/deckVolumes.ts`) is turned into Phase 7's names by `sideName(side)` in `src/model/contact.ts` (M43): `1` → `'starboard'`, `-1` → `'port'`. (`boomSolver.ts` has a `Side` of its own; do not mix them.)
- **Fenders:** the eight `fenderPlaces()` (their station x and side) and the ball fender (`ballFenderPlace()`), numbered 0–7 in `fenderPlaces` order and 8 for the ball fender: 0 x 3.0 starboard, 1 x 3.0 port, 2 x 0.5 starboard, 3 x 0.5 port, 4 x −2.5 starboard, 5 x −2.5 port, 6 x −5.5 starboard, 7 x −5.5 port, 8 the ball fender (x −8.2, port). Losses go in this order (the bow-most pair first, the ball fender last). The fender's thickness in contact is `deckFittings.fenders.diameter` (0.24 m).
- **The roller:** `rollerPoint(data)` (`src/model/anchor.ts`, M46) = `{ x: bowRoller.rollerX, y: bowRoller.plateY + bowRoller.plateThickness + 2·bowRoller.rollerRadius, z: bowRoller.centreZ }` = (6.92, 1.80, 0.20): where the chain leaves the top of the roller.

The refresh recomputed these points with the code as built (`cleatPlaces()`, `fenderPlaces()`, `ballFenderPlace()`, `deckFittings.bowRoller`): every value above is unchanged, so nothing that depends on them changes.

### 4.2 URL keys

| Key | Milestone | Values | Default | Written |
|---|---|---|---|---|
| `m` | M41 | `harbour` (and Phase 5's `learn`) | none | right after `cam`, in Harbour mode |
| `pl` | M42 | `marina`, `bay` (M45) | open water (no key) | after `engineParams` and before `clockParams`; `pl`, `ml`, `tr`, `pe`, `pn`, `ln`, `an`, `ax`, `as` form one group there, in this order (`m` is the exception, after `cam`), when the place is not open water |
| `ml` | M42 | `tight`, `medium`, `spacious` | `medium` | after `pl`, only with `pl=marina`, when not `medium` |
| `tr` | M42 | `busy`, `half`, `empty` | `half` | after `ml`, only with `pl=marina`, when not `half` |
| `fd` | Phase 6 (M33) | `1` = fenders out | in the locker | after the clock keys and before the Realistic keys, only when out (PHASE6_SPEC 4.3); not part of the place group |
| `pe`, `pn` | M42 | position east / north, metres, 1 decimal | — | after `tr`, only when `pl` is written |
| `ln` | M44, M45 | lines: `sp:2.55,ss:2.55,ll:12.33` in the marina (10.4), `bl1:3.20`, `sl2:31.50` in the bay (11.4) | none | after `pn`, when a line is on |
| `an`, `ax`, `as` | M46 | chain out (m, 1 decimal); anchor position `east,north` (1 decimal); `1` = set | anchor stowed | after `ln`, when the anchor is not stowed |

Old links (none of these keys): open water, no lines, anchor stowed, sway 0, thrusters off: the same picture as today. `pe`/`pn` are not written in open water, so links of earlier phases keep their exact text. Wrong values are ignored (the default is used), as every other key.

### 4.3 Step order

The `step` action of `store.ts` keeps its order (CODE_MAP, PHASE2_SPEC 4.2); Phase 7 adds:

1. … wind, sea, clock, autopilot, Realistic mode (unchanged).
2. `stepEngine` (unchanged); then **M44** `stepLines` (the crew task timer and the line-in-the-propeller check); **M46** `stepWindlass` (chain in or out, before the forces are built).
3. `step` (the rig, unchanged).
4. **Build the external force function** for this frame: `harbourForces(inputs: HarbourInputs, data)` (`src/model/harbourForces.ts`, M41; `HarbourInputs` gains a field in each milestone that adds a force) returns `(boat) => ExternalForces`, summing: thrusters (M41), contact (M43), lines (M44), ground (M45), chain (M46).
5. `stepBoat(…, { …, external }, dt)` (M40 adds the `external` input).
6. **After the boat moved:** M43 `stepContact` (reports from `report.contacts`, fenders lost); M46 `stepAnchor` (dragging, setting, alarm, from the chain pull at the end of the frame); `appendTrack`, `floggingDamage` (unchanged).

### 4.4 Sections and modes (adds to PHASE5_SPEC 4.4)

Phase 5 provides `SECTION_IDS`, `MODE_LAYOUTS`, `sectionAvailable`, `createSection` (PHASE5_SPEC 4.4, 8.4). Phase 7 adds three sections and one mode, and fills Phase 6's Harbour gear section (`harbour`: the fenders) with the fender status (M43) and the line rows (M44, M45); `harbour` stays always available and last in `SECTION_IDS`:

| Section | Milestone | Content | `sectionAvailable` | Title key |
|---|---|---|---|---|
| `thrusters` | M41 | two joysticks (bow, stern) | `settings.ropesMode === 'easy'` | `thrusters.label` |
| `place` | M42 | place chooser, marina layout and traffic, damage report (M43) | always | `place.label` |
| `anchor` | M46 | windlass, chain counter, scope | `settings.ropesMode === 'easy'` | `anchor.label` |

Final `MODE_LAYOUTS` after M46 (each milestone's section gives the table as it is after that milestone):

| Mode | `order` | `open` | `openSide` | `second` |
|---|---|---|---|---|
| `easy` | ropes, sails, autopilot, engine, conditions, learn, legend, thrusters, place, anchor, harbour | ropes, sails | ropes, sails, autopilot, engine | conditions, learn |
| `realistic` | ropes, sails, conditions, learn, legend, autopilot, engine, thrusters, place, anchor, harbour | ropes | ropes, sails | conditions, learn |
| `learn` | learn, legend, ropes, sails, autopilot, engine, conditions, thrusters, place, anchor, harbour | learn | learn, legend | conditions, ropes |
| `harbour` | engine, thrusters, harbour, anchor, place, conditions, sails, ropes, autopilot, learn, legend | engine, thrusters | engine, thrusters, harbour, anchor | place, conditions |

**Harbour and the ropes mode.** Harbour keeps the ropes mode as it is (like Learn). The invariant of PHASE5_SPEC 3.1 becomes: `appMode` is `learn` or `harbour`, or equals `settings.ropesMode`. In Harbour with Realistic ropes, the engine, thruster and anchor sections are unavailable (they are at the Helm and Bow stations, as the engine already is); the panel then opens `ropes` (which holds the stations) in place of the unavailable `open` sections, and the quick row shows `t('quick.realistic')` as in Realistic mode. In Harbour a selection opens only the info card (no section moves).

Where the code decides this today (Phase 5 as built): `src/app/store.ts` `initialState` (`appMode: overrides.appMode === 'learn' ? 'learn' : settings.ropesMode`), `setRopesMode` and `setAppMode` (Learn is the only mode that keeps the ropes mode); `src/ui/panel.ts`, the store subscriber that opens the Ropes section on a selection (`state.appMode !== 'learn'`: Harbour joins Learn there), and `applyOpen` (the open lists; the Realistic-ropes rule above goes there); `src/ui/quickRow.ts` `render` (branches `easy`, `realistic`, then everything else is treated as Learn: Harbour needs its own branch before the last one); `src/ui/modeChip.ts` (builds its items from `APP_MODES`, names `mode.<id>` and hints `mode.<id>.hint`, so a new mode needs only its strings); `src/app/urlSync.ts` `openScene` and the Practice button in `src/ui/realisticPanel.ts` (both keep Learn with `appMode === 'learn' ? 'learn' : next.appMode`: both keep Harbour too).

**Each milestone adds its sections to `order` in Easy, Realistic and Learn just before `harbour`** (closed; Phase 6's Harbour gear stays last), in the order of the table above; Harbour's row is given in full by each milestone (7.5, 8.5, 9.5, 12.5). (The section `harbour` and the mode `harbour` share a name, as PHASE6_SPEC chose; the mode is `appMode`, the section a `SectionId`.) `openSide` and `second` never share a section.

### 4.5 Files by milestone

A summary; each milestone's own "Files" list (x.1) is the complete one and wins where they differ.

| Milestone | New | Changed |
|---|---|---|
| M40 | `src/model/lowSpeed.ts`, `tests/lowSpeed.test.ts`, `tests/physicsTruths7.test.ts`, `scripts/shots-m40.mjs` | `src/model/motion.ts`, `content/boat/hanse508.json` (`physics.lowSpeed`), `src/ui/debugOverlay.ts`, `scripts/shots.mjs`, `.github/workflows/ci.yml`, both glossaries, `content/registry/parts.json`, `docs/review/ru.md`, `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md` |
| M41 | `src/model/thrusters.ts`, `src/model/harbourForces.ts`, `src/ui/thrusterPanel.ts`, `src/render3d/boat/thrusters.ts`, `tests/thrusters.test.ts`, `scripts/shots-m41.mjs` | `src/app/appMode.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/app/urlSync.ts`, `src/ui/modes.ts`, `src/ui/panel.ts`, `src/ui/quickRow.ts`, `src/ui/modeChip.ts`, `src/ui/realisticPanel.ts` (Helm station, Practice button), `src/render3d/boat/index.ts` (`setThrusters`), `src/render3d/scene.ts`, `content/boat/hanse508.json` (`physics.thrusters`, `hull.thrusters`), `tests/modes.test.ts`, both `ui.json`, glossaries, registry, `scripts/ui.mjs` |
| M42 | `src/model/places.ts`, `src/model/marina.ts`, `src/render3d/marina.ts`, `src/ui/placePanel.ts`, `tests/marina.test.ts`, `scripts/shots-m42.mjs` | `content/areas/adriatic.json`, `src/model/area.ts`, `src/model/harbour.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/app/urlSync.ts`, `src/ui/mapView.ts` (the map and the mini-map's drawing, `drawMiniMap`), `src/render3d/scene.ts`, `src/render3d/picking.ts`, `src/ui/modes.ts`, both `ui.json`, glossaries, registry, `scripts/ui.mjs` |
| M43 | `src/model/contact.ts`, `src/ui/damageReport.ts`, `tests/contact.test.ts`, `scripts/shots-m43.mjs` | `src/model/lowSpeed.ts` (`contacts`), `src/model/motion.ts` (`report.contacts`), `src/model/harbourForces.ts`, `src/model/harbour.ts`, `src/ui/harbourPanel.ts`, `src/app/store.ts`, `src/ui/placePanel.ts`, `src/ui/modes.ts`, `content/boat/hanse508.json` (`physics.contact`), both `ui.json`, glossaries, registry |
| M44 | `src/model/mooringLines.ts`, `src/render3d/mooringLines.ts`, `tests/mooringLines.test.ts`, `scripts/shots-m44.mjs` | `src/model/harbourForces.ts`, `src/model/marina.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/app/urlSync.ts`, `src/ui/harbourPanel.ts`, `src/ui/damageReport.ts`, `src/ui/enginePanel.ts`, `src/ui/ropeLegend.ts`, `src/render3d/sceneConfig.ts`, `content/boat/hanse508.json` (`physics.lines`), `content/areas/adriatic.json` (lazy lines), both `ui.json`, glossaries, registry, `scripts/ui.mjs` |
| M45 | `src/model/seabed.ts`, `src/render3d/seabed.ts`, `src/render3d/bay.ts`, `tests/seabed.test.ts`, `scripts/shots-m45.mjs` | `content/areas/adriatic.json` (`bay`), `src/model/places.ts`, `src/model/mooringLines.ts`, `src/model/harbourForces.ts`, `src/ui/instrumentStrip.ts`, `src/ui/mapView.ts`, `src/ui/harbourPanel.ts`, `src/app/urlState.ts`, both `ui.json`, glossaries, registry |
| M46 | `src/model/anchor.ts`, `src/ui/anchorPanel.ts`, `src/render3d/anchorChain.ts`, `tests/anchor.test.ts`, `scripts/shots-m46.mjs` | `src/model/realistic.ts` (Bow station), `src/ui/realisticPanel.ts`, `src/ui/stationDrawing.ts`, `src/model/harbourForces.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/app/urlSync.ts`, `src/ui/mapView.ts`, `src/ui/modes.ts`, `content/boat/hanse508.json` (`physics.anchor`, station `bow`), both `ui.json`, glossaries, registry, `scripts/ui.mjs` |
| M47 | `scripts/shots-m47.mjs` | as 13.1 |

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
| M47 | 13 | Stern-to with our own anchor; checks and sign-off | PT-51 (second case) | M46 | not needed (combines M44 and M46 without new formulas; checks and docs) |

---

## 6. M40: Slow-speed handling

**Independent review: required** (new motion physics inside the shared `stepBoat`; every Phase 1–3 test must stay green)

### 6.1 Files

New: `src/model/lowSpeed.ts`, `tests/lowSpeed.test.ts`, `tests/physicsTruths7.test.ts`, `scripts/shots-m40.mjs`. Changed: `src/model/motion.ts`, `src/app/store.ts` (`setBoatMode`, 6.4), `content/boat/hanse508.json`, `tests/motionHelpers.ts` (the helper of 6.7), `src/ui/debugOverlay.ts`, both `ui.json` (`debug.lowSpeed`), `scripts/shots.mjs`, `scripts/shots-m24.mjs` (counts from the registry, 3.7), `tests/glossary.test.ts` (group sizes, 3.7), `.github/workflows/ci.yml` (the `live, M40-M47` part, 3.6), `scripts/shots-m24.mjs` header comment, `content/registry/parts.json`, both `glossary.json`, `docs/review/ru.md`, `docs/BOAT_REFERENCE.md` (section 5 rows of 6.2, question 18), `docs/CODE_MAP.md`.

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

All values are assumptions (rows in BOAT_REFERENCE section 5, "Phase 7: slow-speed handling"; written by the planning PR). **Tunable** (section 0): `steerFullSpeedMps`, `steerFullSpeedAsternMps`, `windageArmM`, `windageArmSwingM`, `propWashFraction`, `propWashFadeSpeedMps`; no other key may be changed to pass a band.

### 6.3 Model

**`src/model/lowSpeed.ts`** (new, pure): `ExternalForces`, `forceAt`, `addForces`, `pointToMap`, `pointVelocity`, `vectorToBoat` (3.2), and:

```ts
export interface ExternalForces { surgeN: number; sideN: number; momentNm: number } // M43 adds `contacts?: ContactHit[]` (9.3); M40 leaves it out
export const NO_FORCES: ExternalForces; // all 0, no contacts
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
): ExternalForces;
```

`hullLowSpeedForces` (all with `u = speedMps`, `v = swayMps`; `ls = data.physics.lowSpeed`):

- Hull wind: `hw = apparentWind(twsKn, twaDeg, u, data, v)`; `q = ½·airDensity·(hw.awsKn·knotMps)²`.
- `fadeW = max(0, 1 − |u| / ls.windageFadeSpeedMps)`.
- Side wind: `windN = −q·ls.windageSideAreaM2·ls.windageSideDragCoefficient·sin(hw.awaDeg·DEG)·fadeW` (wind from starboard, `awa > 0`, pushes to port).
- Its arm ahead of the turning point: `arm = ls.windageArmM + ls.windageArmSwingM·cos(hw.awaDeg·DEG)`.
- Prop walk (astern only, `T = engineThrustN < 0`): `walkN = −ls.propWalkSide·ls.propWalkFraction·|T|·max(0, 1 − |u| / ls.propWalkFadeSpeedMps)`, at `xp = data.hull.saildrive.x`. Ahead or neutral: 0.
- Prop wash (ahead only, `T > 0`): `washN = −ls.propWashFraction·T·sin(rudderDeg·DEG)·max(0, 1 − |u| / ls.propWashFadeSpeedMps)`, at `xr = data.hull.rudder.stockX`. Astern or neutral: 0.
- Result: `surgeN = 0`; `sideN = windN + walkN + washN`; `momentNm = arm·windN + (xp − cgX)·walkN + (xr − cgX)·washN`.

Checks of the signs: wheel to starboard (`rudderDeg > 0`) with thrust ahead gives `washN < 0` at the stern, so `momentNm > 0` (she turns to starboard, as she does with way on). Astern with `propWalkSide = 1` gives `walkN < 0` (stern to port) and `momentNm > 0` (bow to starboard).

**`src/model/motion.ts`** changes:

- `BoatState.swayMps` (4.1); `initialBoat` sets it to 0. `MotionInputs.external?: (boat: BoatState) => ExternalForces`.
- `MotionReport` gains `swayMps`, `lowSpeed: ExternalForces` (the hull's own low-speed forces of the last substep) and `external: ExternalForces` (the external function's result in the last substep; `NO_FORCES` without one). Held still: both `NO_FORCES`, `swayMps` 0.
- In each substep (not Held still), in this order:
  1. `ext = inputs.external ? inputs.external(now) : NO_FORCES`, where `now` is the boat as it stands at the start of the substep (every field of `BoatState` from the loop's local variables, including `swayMps`, `eastM`, `northM`).
  2. The sails' apparent wind gets the sway as well: the `sideMps` argument becomes `rocking.sideMps + swayMps` (the rig solver in `sim.ts` does not see the sway; the difference is negligible at the speeds where sway exists, accepted).
  3. Surge as today with `push = driveN + windageN + engineThrustN + ext.surgeN` (the zero-crossing rule uses the same `push`).
  4. Roll, grip, `effectiveRudderDeg`, `waveYaw` and `rTarget` as today (with the new `speedMps`).
  5. `low = hullLowSpeedForces(speedMps, swayMps, inputs.twsKn, twaDeg, inputs.engineThrustN, inputs.rudderDeg, data)`.
  6. Sway: `drag = (keelLiftNPerMps2·|u| + swayLinearDragNPerMps)·v + ½·ρw·lateralDragCoefficient·lateralAreaM2·|v|·v`; `v += ((low.sideN + ext.sideN − drag) / swayMassKg)·h`.
  7. Yaw: `w = steerShare(u)`, `s = 1 − w`, `r0 = yawRateDegS·DEG`; `r = r0 + w·(rTarget − r0)·(1 − exp(−h / yawLagS))`; then `r += ((low.momentNm + ext.momentNm − s·(yawLinearDampingNmPerRadS·r + yawQuadDragNm·|r|·r)) / yawInertiaKgM2)·h`; `yawRateDegS = r / DEG`.
  8. `headingDeg = wrap360(headingDeg + yawRateDegS·h)`; with `ψ` the new heading in radians and `vo = v + r·(−cgX)` (the mast's sideways speed): `eastM += (u·sin ψ + vo·cos ψ)·h`, `northM += (u·cos ψ − vo·sin ψ)·h`.
  9. Round-up and the report as today.
- Ahead faster than `windageFadeSpeedMps` (1.0 m/s, about 2 kn) with no external forces and the engine in neutral (or faster than 2.0 m/s with it in gear), `w = 1`, `s = 0`, the side wind, prop walk and prop wash are all 0, and the yaw is exactly today's. That is why sailing is unchanged.
- `steadyState` is unchanged (it never sways).

**Edge cases:** zero wind → `q = 0`, no side wind; Held still → nothing of this runs (the early `break` as today) and `swayMps` stays as it was (0); `twsKn = 0` and engine off → a sliding boat slows by `drag` alone; NaN guard: `apparentWind` already returns `awaDeg = twaDeg` for a zero wind.

**Debug overlay** (`debugOverlay.ts`): one more row, label `t('debug.lowSpeed')` ("Low speed" in both `ui.json` files: the debug overlay stays English, ROADMAP decision 2026-10-14, as every other `debug.*` key in `content/lang/ru/ui.json`), value `` `sway ${mpsToKn(swayMps).toFixed(1)} kn · yaw ${yawRateDegS.toFixed(1)} °/s · ext ${(surgeN / 1000).toFixed(1)}/${(sideN / 1000).toFixed(1)} kN` `` (the external forces of `report.external`; `0.0/0.0` in M40).

### 6.4 Store and URL

Nothing new in the state but `boat.swayMps`. Links: `swayMps` is not written; a link opens with 0. `reset` and `load` give 0, and `setBoatMode('held')` sets it to 0 as it does `speedMps` and `yawRateDegS`. The `step` action passes no `external` yet (M41 adds it).

### 6.5 Strings and registry

Registry (both `status: "draft"`, `phase: 7`, `kind: "term"`, `group: "sailing"`):

- `term_prop_walk`: related `part_saildrive`, `engine_control`; `showMe`: `?wd=0&ws=0&mf=0&jf=0&js=100&bs=0.0&ap=off&eng=1&lv=-50&cam=top&sea=flat` (canonical form, 3.7).
- `term_windage`: related `env_wind`, `part_hull`; `showMe`: `?wd=45&ws=15&mf=0&jf=0&js=100&bs=0.0&ap=off&cam=top&sea=flat`.

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
| | onThisBoat | High topsides, a 20 m mast and the furled main inside it: in 15 kn on the beam she drifts sideways at about 0.6 kn; with the wind 45° on the bow, the bow falls off about 30° in 30 s. | Высокий борт, мачта 20 м и грот, свёрнутый внутри неё: при 15 узлах в борт её сносит лагом примерно на 0,6 узла; при ветре 45° к носу нос уваливается примерно на 30° за 30 с. |
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
6. **Sailing unchanged:** `initialState({ controls: { ctl_wind_dir: 90, ctl_wind_speed: 15, ctl_main_furl: 100, ctl_jib_furl: 100, ctl_mainsheet: 30, ctl_jib_sheet: 30 } })` (she opens at her steady speed, flat water), then the autopilot set to `off`; 60 s at 60 fps: `speedMps > 1.0` and `|swayMps| < 1e-6` in every frame (prototype: 3.4 kn steady, sway 0).

`tests/physicsTruths7.test.ts` (Phase 7 rules; every run uses `harbourStart` of 6.7 and `run(state, seconds)` of `tests/motionHelpers.ts` at 60 fps; prototype values in brackets):

- **PT-47** side wind: wind 90°, 15 kn, at rest, engine off: after 30 s `swayMps` in [−0.40, −0.24] (−0.312) and `wrap180(headingDeg)` in [−18, −9] (−13.1); after 300 s she lies with the true wind angle `wrap180(controls.ctl_wind_dir − headingDeg)` in [96, 116] (106). Also `|sway|` at 30 s grows with the wind: 10 kn (−0.206) < 15 kn < 20 kn (−0.395) in size.
- **PT-47** bow blows off: wind 45°, 15 kn, at rest: after 30 s `wrap180(headingDeg)` in [−40, −25] (−32.3); wind −45° gives the mirror (equal size, opposite sign, within 0.01°).
- **PT-27** prop walk: no wind, engine running, lever −50, at rest: after 15 s `wrap180(headingDeg)` in [4.0, 8.5] (6.21), `speedMps` < 0; lever −30: [2.5, 6.0] (4.28); with `boat.physics.lowSpeed.propWalkSide = −1` (3.7: on the imported object, restored in `finally`) the heading after 15 s at lever −50 is the mirror within 0.01°. Lever +50 with the wheel at 0: `|wrap180(headingDeg)|` < 0.01 after 15 s.
- **PT-48** kick ahead: no wind, engine running in neutral, `ctl_rudder` 35, at rest: 1 s, lever 60 for 3 s, lever 0 for 5 s, both read at the end (t = 9 s): heading in [4.5, 8.5] (6.52) and speed in [0.45, 0.75] kn (0.60); the same with `ctl_rudder` 0 gives `|heading| < 0.01`; with `ctl_rudder` −35 the mirror; with `boat.physics.lowSpeed.propWashFraction = 0` (restored in `finally`) the heading is below 4.0 (2.95).
- **PT-49** carrying way: no wind, engine running in neutral, starting at 4 kn (`speedMps` 4 × 0.514444): the time until the speed drops below 0.5 kn is in [190, 270] s (229) and she runs [140, 200] m (171; the change of `northM`, heading 0) in that time. With the lever at −50 from 4 kn she stops (`speedMps ≤ 0`) within [21, 30] s (25.5) and [20, 29] m (24.4).

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

1. `m40 drift`: `?wd=90&ws=15&mf=0&jf=0&js=100&bs=0&ap=off&cam=top&tx=16&debug=1`; wait 3 s; the debug overlay's "Low speed" row reads a negative sway; the heading on the instrument strip is between 330° and 359°.
2. `m40 sailing unchanged`: `?wd=90&ws=15&ms=30&js=30&ap=off&debug=1`: after 5 s the debug line's sway is `0.0 kn`.

### 6.9 Done when

Section 6.6 passes with every earlier test; the debug overlay shows the sway; the browser checks pass; the owner sees the drift, the bow blowing off, the prop walk and the kick ahead on the phone (WORKFLOW checklist).

### 6.10 Not in M40

Thrusters, places, lines, anchor, contact (later milestones); any visible control (M40 adds no button); the side the stern really walks to (skipper question 18; one data value).

### 6.11 Decided in the M40 PR

- **Everything in 6.2 and 6.3 was built as written, with no tuning.** All bands of 6.6 passed on the first run; the values match the prototype's: side wind 15 kn after 30 s: sway −0.312 m/s, heading −13.1°, after 300 s the wind lies 106.4° off the bow; bow blows off −32.3°; prop walk 6.21° in 15 s; kick ahead 6.52° and 0.60 kn.
- **`MotionReport` gets `swayMps`, `lowSpeed` and `external`** (6.3). `tests/motionHelpers.ts` gets `harbourStart` (6.7); it passes the engine through `initialState`, so the engine opens already in the gear its lever asks for.
- **`openPage` label tests** (3.6) were appended as `|4[0-7]` to the forms the code has now (after M36–M39 they are `3[6-9]` and `28|29|38|39`, not the forms the refresh quoted); the comment above them names Phase 7's labels.
- **CI.** The new part `live, M40-M47` is added and `,m40,…,m47` appended to the skip list of `live, M30 on`, as 3.6 says.
- **`shots-m24.mjs`** takes its counts from the registry (3.7): its checks now read "a list for every group" and "an entry button for every id", with the counts in the detail text.
- **Group size** in `tests/glossary.test.ts`: `sailing` goes from 28 to 30 (the two new terms).
- **Owner's answers on PR #98 ("accept all", for the PR's question and the independent review):** the stern keeps walking to port until a skipper checks (question 18); the three mirror tests check within 0.01° as the spec says (`toBeCloseTo(…, 2)`); PT-48 gets its source (PHYSICS_TRUTHS [40], Practical Sailor) and is `source-checked`, PT-47 stays `to-verify` (no reachable source), PT-49 stays `general`; with the sails up, the sails' own side force still does not slide her (she only heels): a limitation, not built here, noted for a later milestone; the strip's speed shows forward speed only (a drifting boat reads near 0, the sideways speed is in the debug row), kept as it is and said in the checklist.

---

## 7. M41: Thrusters and Harbour mode

**Independent review: required** (a new mode in the shared state and the links, new forces through the M40 hook)

### 7.1 Files

New: `src/model/thrusters.ts`, `src/model/harbourForces.ts`, `src/ui/thrusterPanel.ts`, `src/render3d/boat/thrusters.ts`, `tests/thrusters.test.ts`, `scripts/shots-m41.mjs`. Changed: `src/app/appMode.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/app/urlSync.ts`, `src/ui/modes.ts`, `src/ui/panel.ts`, `src/ui/quickRow.ts`, `src/ui/modeChip.ts`, `src/ui/realisticPanel.ts`, `src/ui/enginePanel.ts` (export `leverText`), `src/render3d/boat/index.ts` (`BoatModel.setThrusters`), `src/render3d/scene.ts` (calls it), `src/ui/realisticPanel.ts` (the Practice button keeps Harbour, 7.4), `src/render3d/sceneConfig.ts` (`SCENE.thrusters`), `tests/glossary.test.ts` (group sizes), `content/boat/hanse508.json`, `tests/modes.test.ts`, `tests/urlState.test.ts`, `tests/physicsTruths7.test.ts`, both `ui.json`, both glossaries, `docs/review/ru.md`, the registry, `scripts/ui.mjs`, `scripts/shots.mjs`, `docs/BOAT_REFERENCE.md` (question 10, section 5 rows), `docs/CODE_MAP.md`.

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
  "thrustNote": "assumption: about 130 kgf at the bow and 100 kgf at the stern, usual sizes for a 50 ft yacht (skipper question 10: power). Tunable: bowThrustN, sternThrustN, speedFactorByKn",
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

`SECTION_IDS` gains `'thrusters'` (after `'legend'`, before Phase 6's `'harbour'`, which stays last). `sectionAvailable('thrusters')`: `settings.ropesMode === 'easy'`. `MODE_LAYOUTS` after M41:

| Mode | `order` | `open` | `openSide` | `second` |
|---|---|---|---|---|
| `easy` | ropes, sails, autopilot, engine, conditions, learn, legend, thrusters, harbour | ropes, sails | ropes, sails, autopilot, engine | conditions, learn |
| `realistic` | ropes, sails, conditions, learn, legend, autopilot, engine, thrusters, harbour | ropes | ropes, sails | conditions, learn |
| `learn` | learn, legend, ropes, sails, autopilot, engine, conditions, thrusters, harbour | learn | learn, legend | conditions, ropes |
| `harbour` | engine, thrusters, harbour, conditions, sails, ropes, autopilot, learn, legend | engine, thrusters | engine, thrusters | conditions, learn |

`tests/modes.test.ts`: the existing checks (every id once in `order`, `second` has 2 entries, `open` ⊆ `order`) now run over four modes; add: Harbour keeps the ropes mode (`setAppMode('harbour')` from Realistic leaves `settings.ropesMode === 'realistic'`).

### 7.6 UI

**Thruster section** (`src/ui/thrusterPanel.ts`): `createThrusterPanel(store: Store): HTMLElement[]` returns, in order: the bow joystick, the stern joystick, a status line `thrusters-status` (live, no `explain`), and the explanation `p.explain` with `thrusters.hint`.

**Joystick** (`createThrusterJoystick(store: Store, which: 'bow' | 'stern', variant: 'section' | 'quick' | 'helm'): HTMLElement`; test ids below are the section's; the quick row's insert `-quick` and the Helm station's `-helm` after the end name: `thruster-bow-quick`, `thruster-bow-quick-port`, `thruster-bow-helm-starboard`, …):

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

- Track 120 × 44 px (`quick`: 88 × 44, no label); each half button covers half the track (at least 44 × 44, the hold zones), the glyph at its outer end. The knob (24 px circle) sits in the middle at `data-dir="0"` and moves to the pressed end (`translateX(±(trackWidth/2 − 16px))`, 100 ms).
- Hold-to-act (3.1): `pointerdown` on a half → `setPointerCapture`, dispatch `thruster` with −1 or +1; `pointerup`, `pointercancel`, `pointerleave`, `lostpointercapture` and the half's `blur` → dispatch 0. The pointer stays captured by the half that took it: sliding onto the other half does nothing until it is released. Keyboard on a focused half: keydown Space / Enter → on, keyup → 0. `document` `visibilitychange` to hidden and `window` `blur` → both thrusters 0: one pair of listeners per store, added by the first `createThrusterPanel(store)` (a module-level `WeakSet<Store>` remembers which stores have them).
- The joystick follows `state.thrusters` (`data-dir`, `aria-pressed` on the halves), so the section, the quick row and the Helm station stay in step.
- Status line: both off → `thrusters.off`; otherwise `thrusters.on` with the parts that run (`thrusters.bowPort`, … joined with ", "), and, when `thrusterSpeedFactor(speed) < 0.65` (above about 2 kn), `thrusters.weak` appended.

**Mode chip:** a fourth item `mode-option-harbour` with `t('mode.harbour')` and the hint `t('mode.harbour.hint')`.

**Quick row in Harbour mode with Easy ropes** (`quickRow.ts`; with Realistic ropes it shows `t('quick.realistic')`, 4.4): `[−] <value> [+]` then the two `quick` joysticks. − / + change `engine.leverPct` by 10 (always 10, not `settings.step`; clamped to ±100) with the `engine` action. The value cell is 40 px wide in `var(--font-small)`: `t('quick.harbour.short', { arrow, n })` with `▲` ahead, `▼` astern and `n` = |lever|, or `N` when `gearOf(lever) === 'neutral'`; its `aria-label` is the full `leverText(lever)` (exported from `enginePanel.ts`). With the engine stopped the buttons are disabled and the value is `–` with the `aria-label` `t('quick.harbour.engineOff')`. Test ids: `quick-lever-less`, `quick-lever-value`, `quick-lever-more`. Width at 360 px: 44 + 40 + 44 + 88 + 88 + 4 gaps of 8 = 336 px (the row's padding is 12 px each side: 360 − 24 = 336).

**Realistic mode, Helm station** (`realisticPanel.ts`): under the engine lever, a block `data-testid="thruster-helm"` with both joysticks (variant `helm`, full size).

**3D** (`src/render3d/boat/thrusters.ts`, `buildThrusters(data): { object; setState(t: ThrusterState) }`, added by `boat/index.ts`; `BoatModel` gains `setThrusters(t: ThrusterState): void` (= `setState`), which `scene.ts` calls once on build and whenever `state.thrusters` changes, as it does `setFendersOut` (Phase 6); `BoatModel.update` keeps its signature): the bow tunnel as two flat dark discs (diameter 0.2 m, facing ±z, not tilted) at (4.3, −0.15, ±z0), where `z0` is the hull's half-width at y = −0.15 found by bisection on `s` in `sectionPoint(4.3, s)`, and a dark cylinder between them; the stern pod as a grey cylinder (diameter 0.25, length 0.6, axis along z) at (−6.2, keelLineAt(−6.2) − 0.15, 0) with a strut (box 0.08 × 0.05 × 0.3 m) up to the hull. Colours and sizes go in `SCENE.thrusters` (`tunnelColour` `#1d2329`, `podColour` `#6b7177`, `jetColour` `#ffffff`, `jetOpacity` 0.5, `jetLengthM` 0.8, `jetRadiusM` 0.2). Each mesh carries its registry id; they need not be tappable through the water. While a thruster runs, a cone of `jetLengthM` starts at the opening on the side opposite to the push (pushing the bow to starboard blows water out to port) and points outwards along ±z, its wide end `jetRadiusM` across.

### 7.7 Strings and registry

Registry (`kind: "part"`, `group: "hull"`, `phase: 7`, `status: "draft"`, `sources: ["owner"]`): `part_bow_thruster` (related `part_stern_thruster`, `part_bow`; `showMe`: `?wd=0&ws=0&mf=0&jf=0&js=100&cam=top&sel=part_bow_thruster&bs=0.0&ap=off&eng=1`, in the canonical form of 3.7), `part_stern_thruster` (related `part_bow_thruster`, `part_stern`; the same `showMe` with its own `sel`). Show me keeps the mode the learner is in (PHASE5_SPEC); in Learn the Thrusters section is at the end of the panel.

UI strings (`ui.json`; Russian drafts):

| Key | English | Russian (draft) |
|---|---|---|
| `mode.harbour` | Harbour | Гавань |
| `mode.harbour.hint` | Engine and thrusters first. | Сначала двигатель и подруливающие. |
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
| `quick.harbour.short` | {arrow}{n} | {arrow}{n} |
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

Helper `holdThruster(page, which, dir, ms, via = 'section')` (3.6): for `section` it first calls `showSection(page, 'thrusters')`; then `pointerdown` on `thruster-<which>[-quick|-helm]-<port|starboard>`, waits `ms`, `pointerup`. `setMode(page, 'harbour')` (PHASE5_SPEC 3.4) gains the `harbour` value.

Scenes: `harbour-mode` (`?m=harbour&wd=0&ws=0&mf=0&jf=0&js=100&bs=0&ap=off&eng=1&lv=0&cam=top`: the sheet at half shows Engine and Thrusters open), `harbour-peek` (same at peek: the quick row with the lever and two joysticks), `helm-thrusters` (`?wd=0&ws=0&mf=0&jf=0&js=100&bs=0&ap=off&eng=1&lv=0&mode=realistic&st=helm&cam=helm`, without `m=harbour`: the joysticks under the lever).

Live checks:

1. `m41 spin`: the `harbour-mode` link plus `tx=4`; `holdThruster(page, 'bow', 1, 2500)`: the heading on the strip has grown by 10° or more; the status line read during the hold names "bow to starboard".
2. `m41 mode link`: choose Harbour in the mode chip; `waitForLink(page, ['m=harbour'])`; reload: the chip reads "Harbour".
3. `m41 release`: during a hold, dispatch a `blur` on the window: `data-dir` returns to `0`.

### 7.10 Done when

7.8 passes; Harbour is in the mode chip and the link; the joysticks work in the section, the quick row and at the Helm station; the owner spins and crabs the boat on the phone.

### 7.11 Not in M41

Proportional thrusters, running-time limits, batteries; places and the marina (M42).

### 7.12 Decided in the M41 PR

- **Built as written, with no tuning.** Every band of 7.8 passed on the first run with the data of 7.2 (bow +1 for 10 s turns her about 36°, both thrusters the same way slide her about 0.45 m/s, against 10 kn of wind they win, against 25 kn they lose).
- **Owner's answers on PR #99 (comment of 2026-10-19; question 2 "accept"; independent review: "fix 1 and 2"):** (Q1) **the engine and the thrusters are one section**: there is no Thrusters section; the joysticks, their status line and the explanation sit under the engine lever in the Engine section (Easy ropes), and Harbour mode opens that section (with Realistic ropes, Ropes, where the Helm station is). `SectionId` `thrusters` is gone: Harbour's `order` is mode, engine, harbour, conditions, sails, ropes, autopilot, learn, settings. (Q2) the thruster power stays an assumption. Review items 1 (a phone's open block drew under the next header: an open section is now at least its header plus 120 px high, so the panel scrolls instead) and 2 (WORKFLOW checklist) fixed; the arrow-key question (3.1 against 7.6) is settled by the owner's request for keys, below.
- **Owner's changes on PR #99:** (2) the strip in Harbour mode names its groups with small tags, "Engine" and "Thrusters" (`quick-engine`, `quick-thrusters`); (3) **both thrusters are tunnels through the hull, drawn as a hole on each side** (the stern pod is gone: `hull.thrusters` stern `kind` is `tunnel`, 0.2 m across, because the hull is shallow there; `thrusterTunnelPlace(end)` replaces the two place functions); (4) in Harbour mode the keyboard works both thrusters at once: **A / D** push the bow to port / starboard, **J / L** the stern (`KeyboardEvent.code`, so any keyboard layout; ignored while typing in a field or with Ctrl, Alt or Meta held; the hint says so). Space and Enter on a focused half still work.
- **Joystick size:** the track is 120 × 44 px (the spec said 132) so that both joysticks sit side by side in the narrowest panel (320 px); the knob travels 44 px.
- **Left for the owner to schedule (asked in the PR):** (5) Realistic mode with its own Engine section (engine and thrusters) and its own Helm section (autopilot and wheel) in place of the Helm station inside Ropes; (6) the Mode and Settings sections of the wide layout as chips on the right side with a selector; (7) tabs under the phone sheet's handle (Mode, Controls, Conditions, Learn "?", Settings gear). They change the panel structure of every mode and every earlier browser check, so they are not part of M41.
- **Harbour and selections.** In Harbour a tap on a rope or the wheel opens only the info card (no section moves, as in Learn): `panel.ts` and `app.ts` treat Harbour like Learn there.
- **The 3D parts.** The tunnel's discs stand 0.02 m outside the hull so they are not drawn inside it; the jets are see-through cones (no shadow) that carry the thruster's registry id, so the parts list of the boat model stays complete. The tunnels sit below the waterline.
- **Helpers.** `thrusterTunnelPlace` is in `src/model/thrusters.ts` (pure), so the 3D builder and the tests read the same numbers; the bisection of 7.6 is in it. `holdThruster` has an optional sixth argument (`during`), called when half of the hold has passed, so a check can read the status line during the hold.
- **Allowed test changes (3.7).** The `hull` group in `tests/glossary.test.ts` goes from 6 to 8 ids; `tests/languages.test.ts` lists `quick.harbour.short` ("{arrow}{n}") as the same in Russian and English (it has only placeholders); `docs/review/ru.md` is regenerated.

---

## 8. M42: Places and the marina

**Independent review: required** (new area data, five link keys and old links, a new world object in the scene, the map and the mini-map)

### 8.1 Files

New: `src/model/places.ts`, `src/model/marina.ts`, `src/render3d/marina.ts`, `src/ui/placePanel.ts`, `tests/marina.test.ts`, `scripts/shots-m42.mjs`. Changed: `content/areas/adriatic.json`, `src/model/area.ts` (types only), `src/model/harbour.ts` (8.3), `src/app/urlSync.ts` (8.4), `src/model/glossary.ts` (`GROUPS` gains `harbour`), `src/app/store.ts`, `src/app/urlState.ts`, `src/ui/modes.ts`, `src/ui/panel.ts`, `src/ui/mapView.ts` (also the mini-map's `drawMiniMap`), `src/render3d/scene.ts`, `src/render3d/sceneConfig.ts` (`SCENE.harbour`), `src/render3d/picking.ts`, `tests/urlState.test.ts`, `tests/modes.test.ts`, `tests/glossary.test.ts` (the new `harbour` group's size, 3.7), both `ui.json`, both glossaries, `docs/review/ru.md`, the registry, `scripts/ui.mjs`, `docs/CODE_MAP.md`.

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

`area.ts` declares explicit interfaces for these blocks (`PlaceData { id: PlaceId; eastM?: number; northM?: number; headingDeg?: number; sea?: SeaSetting }`, `MarinaData`, later `BayData`) and casts the JSON to them; `sea` values are checked with the existing `isSeaSetting`. Every value is a design choice for teaching (berth widths: the beam 4.75 m plus 0.15 / 0.75 / 1.75 m; fairways about 1.4, 1.9 and 2.6 boat lengths). `ourBerth` 12 of the north row is never taken. "half" lists the taken berth indices of each row (one neighbour of ours, 13, is taken).

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
export interface PlaceStart { eastM: number; northM: number; headingDeg: number; sea: SeaSetting | null }
export function placeStart(h: HarbourState, areaData?: AreaData): PlaceStart;
```

`src/model/harbour.ts` (Phase 6): `HarbourState` gains `place: PlaceId; layout: MarinaLayoutId; traffic: TrafficId` (type imports from `places.ts` and `marina.ts`), and `DEFAULT_HARBOUR` becomes `{ fendersOut: false, place: 'open', layout: 'medium', traffic: 'half' }`.

`placeStart`: open water → the `open` entry's position and heading, `sea: null` (the sea is not changed); marina → `eastM = westEndEastM + startInsetM`, `northM = (fairway.north + fairway.south) / 2`, `headingDeg = 90`, `sea` = the `marina` entry's `sea` (`flat`).

### 8.4 Store and URL

- `AppState.harbour` (Phase 6) carries the new fields; `initialState` takes `overrides.harbour` (default `DEFAULT_HARBOUR`) and `reset` gives `DEFAULT_HARBOUR`, as Phase 6 does (open water, fenders in the locker).
- Action `{ type: 'goToPlace'; place: PlaceId }`: builds a fresh state with `initialState({...})`, passing on unchanged: `settings`, `appMode`, `camera`, `windMode`, `clockUtcMs` (`state.clock.utcMs`), `learn`, `realistic` (the station, clutches and winches); and setting: `harbour: { ...state.harbour, place }`; `boat: { mode: 'sailing', eastM, northM, headingDeg, speedMps: 0 }` from `placeStart` (Held still becomes Sailing); `sea`: the place's (open water: the current one, which may be the flat water the marina set; accepted); for the marina (and the bay, M45) `controls: { ...state.controls, ctl_main_furl: 0, ctl_jib_furl: 0, ctl_jib_sheet: 100, ctl_rudder: 0 }` and `engine: { running: true, leverPct: 0 }`; for open water the current controls and engine. In every place the autopilot is then set to `off`. Dropped: the selection, the track, the thrusters (and from later milestones the contacts, lines and anchor). Choosing the place already chosen does the same (it puts the boat back at the start).
- Actions `{ type: 'setMarinaLayout'; layout }` and `{ type: 'setTraffic'; traffic }`: set the field; if the place is the marina, then do `goToPlace('marina')` with the new value (the boat goes back to the start, so she is never inside a yacht); elsewhere only the field changes (the marina is drawn with it; it is not in the link outside the marina, so a reload there shows the defaults again; accepted).
- **URL** (`harbourParams`, written after `engineParams` and before `clockParams`): `pl=marina` when the place is not open; when `pl` is written: `ml` if the layout is not `medium`, `tr` if the traffic is not `half`, then `pe` and `pn` (the boat's `eastM` / `northM`, `toFixed(1)`). **Parse:** `pl` a valid place → that place; `ml`, `tr` valid → those; `pe` and `pn` both matching `^-?\d{1,4}(\.\d)?$` → the position, otherwise (either missing or wrong) both from `placeStart`. Without `pl`, `pe`/`pn`/`ml`/`tr` are ignored. **The address bar:** the subscriber in `src/app/urlSync.ts` also rewrites the link when `state.harbour` changes (compare `place`, `layout`, `traffic` and `fendersOut`; the fender-loss fields are not in the link). **A place link fills in its ready state for every key it does not give** (3.7): `hdg` → the place's heading; `bs` → 0; no `eng` → engine running, lever 0; no `ap` → off; no `mf`/`jf`/`js` → 0 / 0 / 100; no `sea` → the place's sea. Keys that are given win.

### 8.5 Sections and modes

`SECTION_IDS` gains `'place'` (after `'thrusters'`), always available. `MODE_LAYOUTS` after M42: Easy, Realistic and Learn add `place` just before `harbour` (closed). Harbour: `order` engine, thrusters, harbour, place, conditions, sails, ropes, autopilot, learn, legend; `open` engine, thrusters; `openSide` engine, thrusters; `second` place, conditions.

### 8.6 UI

**Place section** (`src/ui/placePanel.ts`, `createPlacePanel(store): HTMLElement[]`):

1. A segmented row `place-choice` (`role="group"`, `aria-label` `t('place.label')`) of buttons `place-open`, `place-marina` (`aria-pressed` for the current place). A tap dispatches `goToPlace` (also on the pressed one: back to the start).
2. Shown only while the place is the marina: a segmented row `marina-layout` (`marina-layout-tight`, `-medium`, `-spacious`) and a row `marina-traffic` (`marina-traffic-busy`, `-half`, `-empty`), each with its label.
3. A status line `place-status`: open water `place.status.open`; marina `place.status.marina`.
4. `p.explain` `place.hint`.

**3D** (`src/render3d/marina.ts`, `buildMarina(areaData): { object: THREE.Group; update(state: AppState): void }`, added to `world.group` in `scene.ts` as `marks` is). The world group's local frame has x = north and z = east, relative to the boat; so the marina group's position is set each frame to `(−boat.northM, 0, −boat.eastM)` and every mesh inside it is built at its absolute map position `(north, y, east)`. Outlines given as (east, north) become (x = north, z = east) points; build the extruded hulls from a `THREE.Shape` in that (north, east) plane, rotate it so the extrusion goes up (+y), and check the winding with a unit test of one hull's bounding box. The marina is always in the world (and on the map), whatever the place; it is solid only in the marina (3.7). It is added to the picker's extra roots (`createPicker(…, [marks.object, marina.object])`), each mesh with `userData.partId`:

- `SCENE.harbour` (in `sceneConfig.ts`): `quayColour` `#b9b4a8`, `pontoonColour` `#8a6a4a`, `ringColour` `#2b2b2b`, `ringRadiusM` 0.12, `ringTubeM` 0.025, `berthColour` `#f2c94c`, `berthStripeM` 0.15, `hullColour` `#f4f4f2`, `deckLineColour` `#9aa3ab`, `hullBelowM` 0.2, `hullAboveM` 1.3, `mastRadiusM` 0.075, `quayBelowM` 1.0, `pontoonBelowM` 0.3, `maxDrawM` 1000.
- Quay and wall: boxes from `quayBelowM` below to `quayHeightM` above the water. Pontoon: a box from `pontoonBelowM` below to `pontoonHeightM` above. Rings: tori lying flat on the quay's edge (at `quayHeightM`) at the ring positions. Our berth: a stripe `berthStripeM` wide along the quay edge between our two rings.
- Moored yachts: the outline extruded from `hullBelowM` below the water to `hullAboveM` above, with a deck line, and a mast (radius `mastRadiusM`, height `0.9·L + 2` m, at `0.4·L` from the stern). Rebuilt when the layout or traffic changes (compare `state.harbour.layout` and `traffic` with the last ones built).
- The whole marina is shown only while the nearest point of its bounds (the rectangle round quay, wall and pontoon) is within `SCENE.harbour.maxDrawM` (1000 m, the camera's far plane) of the boat. Hide and show **each mesh** (`mesh.visible`), not only the group: the raycaster ignores a parent's visibility (as `src/render3d/marks.ts` does for the buoys), and a hidden group's meshes would still be tapped.
- At Detail Low the same meshes without shadows (no extra cost at High besides shadows).

**Map** (`mapView.ts`): an exported `drawHarbour(ctx, state, view, mini = false)`, called in `drawMap` after `drawWindField` and before `drawTrack` (so the quay covers the wind field): quay, wall and pontoon filled `#b9b4a8` with a `#7b776d` 1 px edge; berth separators as 1 px lines `#d0d4d8` between the berths' stern ends and `berthZoneM` out; yachts filled white with a grey edge; our berth outlined in yellow (2 px). The mini-map's drawing is `drawMiniMap` in `mapView.ts` (`miniMap.ts` only holds the button and sizes its canvas, and does not change): it calls `drawHarbour` between `drawGrid` and `drawTrack` with `mini = true` (no berth separators). `pickMap` tests the marina after the buoys and before the apparent-wind arrow: it projects the rectangles and outlines to the screen with `mapToScreen` and returns `env_quay` for a tap inside the quay, wall or pontoon and `env_moored_yacht` inside a yacht. `createMapView` already sets a debug-only hook `window.__sailMap` (only with `debug=1`: `trackPoints`, `apparentMid`, `centre`, `currentPointOfSail`); M42 adds `toScreen(eastM, northM)` to it (`mapToScreen` with the current viewport, CSS px), so checks can find a map point on the screen. A check that uses it opens its link with `debug=1`.

**Picking** (`picking.ts`): the marina's meshes carry `env_quay` and `env_moored_yacht` (extra roots, above).

### 8.7 Strings and registry

`GROUPS` (`glossary.ts`) gains `'harbour'` after `'sea'`; `learn.group.harbour`: "Harbour and anchoring ({count})" / «Гавань и якорная стоянка ({count})».

Registry (`kind: "environment"`, `group: "harbour"`, `phase: 7`, `status: "draft"`, `sources: []`): `env_quay` (related `env_moored_yacht`; M44 adds `term_med_mooring`; `showMe` `?cam=map&sel=env_quay&pl=marina`, in canonical form, 3.7), `env_moored_yacht` (related `env_quay`; `showMe` `?cam=map&sel=env_moored_yacht&pl=marina&tr=busy`).

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
6. URL: a marina state round-trips (`pl`, `ml`, `tr`, `pe`, `pn`, heading, speed); open water writes none of the five keys (`serializeUrlState(initialState())` is unchanged); `?pe=10&pn=20` without `pl` opens at (0, 0); `?pl=marina` alone opens at the start in the ready state (engine running, sails away, flat water, heading 90); `?pl=marina&pe=1e3&pn=5` opens at the start.

### 8.9 Browser checks (`scripts/shots-m42.mjs`)

Helper `choosePlace(page, place)`: `showSection(page, 'place')`, click `place-<place>`.

Scenes (the camera presets frame the boat, so the marina is seen from the map or from close to it): `marina-map` (`?pl=marina&m=harbour&cam=map`, zoomed out twice with `map-zoom-out`), `marina-busy-tight-map` (`?pl=marina&ml=tight&tr=busy&m=harbour&cam=map`, zoomed out twice), `marina-berth` (`?pl=marina&tr=busy&m=harbour&pe=2.8&pn=1480.0&hdg=180&cam=side-port`: in front of our berth, the neighbours and the yellow stripe in view), `marina-fairway` (`?pl=marina&m=harbour&cam=bow`: the fairway ahead).

Live checks:

1. `m42 choose`: open `?m=harbour&ws=0&debug=1`; `choosePlace(page, 'marina')`; `waitForLink(page, ['pl=marina', 'pe=-95.0', 'pn=1468.0'])` (no wind, so she does not drift); set the camera to Map, zoom out twice (0.5 m per pixel, north up), tap the screen point `__sailMap.toScreen(-60, 1507)` (on the quay, 35 m east and 39 m north of the boat: 70 px right of and 78 px above her on the screen; the quay's middle at east 0 would be 190 px to the right, at the edge of a 390 px phone): the info card names the quay.
2. `m42 layout`: in the marina with `ws=0`, tap `marina-layout-tight`: the link gets `ml=tight` and `pn=1472.0`.
3. `m42 old link`: `?wd=60&ws=12`: no `pl` in the written link.

### 8.10 Done when

8.8 passes; the owner chooses Marina on the phone, sees the marina on the map and, motoring along the fairway, the quay, the yachts and the yellow berth; changes the layout and the traffic; and a shared link opens in the same spot.

### 8.11 Not in M42

Bumping into anything (M43: in M42 the boat passes through the quay and the yachts; the PR says so); lines (M44); the bay (M45).

### 8.12 Decided in the M42 PR

(empty)

---

## 9. M43: Contact, damage report and fenders

**Independent review: required** (contact physics inside the shared step; what the report says teaches what damage is)

### 9.1 Files

New: `src/model/contact.ts`, `src/ui/damageReport.ts`, `tests/contact.test.ts`, `scripts/shots-m43.mjs`. Changed: `src/model/harbour.ts` (the fender-loss fields), `src/ui/harbourPanel.ts` (the fender status), `src/model/lowSpeed.ts` (`ContactHit`, `contacts` in `ExternalForces` and `addForces`), `src/model/motion.ts` (`report.contacts`), `src/model/harbourForces.ts`, `src/model/marina.ts` (`marinaObstacles`), `src/app/store.ts`, `src/ui/placePanel.ts`, `src/ui/modes.ts`, `src/ui/panel.ts`, `src/ui/windIndicator.ts` (the alert stack gets the damage alert), `content/boat/hanse508.json` (`physics.contact`), `src/style.css` (`.rig-alert-report.is-hit`), `tests/physicsTruths7.test.ts`, `tests/modes.test.ts`, both `ui.json`, `docs/review/ru.md`, `docs/BOAT_REFERENCE.md`, `docs/PHYSICS_TRUTHS.md` (statuses), `docs/CODE_MAP.md`.

**Phase 6 provides** (4.1): the fenders drawn (eight and the ball fender, shown while `harbour.fendersOut`), `setFenders`, `fd=1`, the Harbour gear section with the Fenders choice, and `fenderPlaces()` / `ballFenderPlace()`. Phase 7 starts after Phase 6 is signed off; if any of this is missing, stop and ask in the PR.

### 9.2 Data (`content/boat/hanse508.json`, `physics.contact`, after `physics.thrusters`)

```json
"contact": {
  "hullStiffnessNPerM": 400000,
  "hullDampingNsPerM": 40000,
  "fenderStiffnessNPerM": 100000,
  "fenderDampingNsPerM": 60000,
  "fenderReachM": 1.5,
  "friction": 0.2,
  "nearM": 60,
  "separateS": 0.5,
  "severityMps": { "touch": 0.15, "bump": 0.4, "knock": 0.8 },
  "fenderMaxMps": 0.5,
  "fenderLossSpeedMps": 2.6,
  "fenderLossAfterS": 30,
  "fenderLossEveryS": 20,
  "note": "assumptions for teaching: a contact under 0.15 m/s (0.3 kn) is a touch, under 0.4 m/s (0.8 kn) a bump, under 0.8 m/s (1.6 kn) a knock, faster a hit; a fender takes a contact up to 0.5 m/s (1 kn) and covers 1.5 m of the hull each way from its station (half the largest gap, 3 m, between Phase 6's fender stations); fenders left out above 5 kn are torn off after 30 s, then one every 20 s (PT-34)"
}
```

### 9.3 Model

`src/model/lowSpeed.ts`:

```ts
export type HullPart = 'bow' | 'stern' | 'port' | 'starboard' | 'keel';
export interface ContactHit {
  /** `<obstacle id>:<part>`: one contact between one obstacle and one part of our hull. */
  key: string;
  obstacleId: string;   // 'quay', 'wall', 'pontoon', 'yacht-north-11', … (M45: 'land', 'bottom'; rocks are part of the bottom)
  partId: string;       // the registry id of what was hit: 'env_quay', 'env_moored_yacht', …
  part: HullPart;
  /** How fast our hull moved into it at that point, m/s (≥ 0). */
  approachMps: number;
  /** A fender was between them. */
  fender: boolean;
}
export interface ExternalForces { surgeN: number; sideN: number; momentNm: number; contacts?: ContactHit[] }
```

`addForces` concatenates `contacts`. `contactForces` returns one hit per point in contact; `motion.ts` merges them into `MotionReport.contacts: ContactHit[]`: over all substeps of the step, one entry per `key`, with the largest `approachMps`, and `fender` true only if **every** point of that key was fendered (a bare point touching beside a fendered one is a hull contact).

`src/model/contact.ts` (pure):

```ts
export interface Obstacle { id: string; partId: string; polygon: [number, number][] /* map (east, north), convex, counter-clockwise */ }
export interface FenderSet { out: boolean; lost: readonly number[] /* fender numbers, 4.1 */ }
/** Our hull's contact points, boat frame, with the part each belongs to. */
export function hullContactPoints(data?: BoatData): { x: number; z: number; part: HullPart }[];
/** Our hull's outline for inside tests, boat frame (x, z), 84 vertices (below). */
export function hullPolygon(data?: BoatData): [number, number][];
/** The forces of every contact now, and the hits. */
export function contactForces(boat: BoatState, obstacles: readonly Obstacle[], fenders: FenderSet, data?: BoatData): ExternalForces;
export type Severity = 'fender' | 'touch' | 'bump' | 'knock' | 'hit';
export function contactSeverity(approachMps: number, fender: boolean, data?: BoatData): Severity;
```

- **Contact points:** every `[x, hb]` of `data.hull.deckEdgeHalfBeam.points` on both sides (`z = −hb` port, `+hb` starboard), plus `(bowFittingTipX, 0)` and `(transomX, 0)`: 86 points. Part: `bow` if `x ≥ 4.0`; `stern` if `x ≤ transomX + 1.0`; otherwise `port` (`z < 0`) or `starboard`. **Our hull polygon** (`hullPolygon(data)`, boat frame (x, z)): the 84 deck-edge points, starboard from bow to stern then port from stern to bow, without the tip and the transom middle. It is not strictly convex (tracing noise): inside tests use ray casting and the nearest edge, never half-planes. Outward normals of our hull are computed in the boat frame and turned into the map with `boatToMap`.
- Only obstacles whose bounding box is within `nearM` of the boat's position are tested. Obstacle polygons are in the map, counter-clockwise, without a repeated first vertex; a rectangle is `[[W, S], [E, S], [E, N], [W, N]]`; a polygon whose signed area is negative is reversed. Depths `d` are clamped to at most 1.0 m (deeper contacts are not expected and would flip the nearest edge in the 3 m pontoon).
- **Our point inside an obstacle.** For each point `(x, z)`: `fendered` = fenders out, part `port` or `starboard`, and one of the eight `fenderPlaces()` on that side, not in `lost`, with `|fender.top[0] − x| ≤ fenderReachM` (the fenders cover x −7.0 to 4.5; side points from −7.0 aft to the stern part at −7.6 are not covered; the ball fender, number 8, protects no point here: it hangs at the stern corner, where the points are part `stern`; both accepted). With `t` = `deckFittings.fenders.diameter` (0.24), the tested position is `pointToMap(boat, x, z')` with `z' = z ± t` outward when fendered, `z' = z` otherwise. If it is inside the polygon: `d` = the smallest distance to the polygon's edges, `n` = that edge's outward normal (map, unit). `v = pointVelocity(boat, x, z)`, `vn = max(0, −(v·n))` (the speed into the obstacle). Normal force: fendered `F = fenderStiffness·min(d, t) + hullStiffness·max(0, d − t) + fenderDamping·vn` (`t` as above); not fendered `F = hullStiffness·d + hullDamping·vn`. Friction: `vt = v − (v·n)·n`, `Ff = −friction·F·vt / max(|vt|, 0.05)` (smooth near zero, so a boat lying against the quay does not jitter). The fender offset is along the boat's z, not the hull's normal (accepted). The force `F·n + Ff` (map) is turned into the boat frame (`vectorToBoat`) and applied at `(x, z)` (`forceAt`). Hit: `{ key: id + ':' + part, obstacleId, partId, part, approachMps: vn, fender: fendered }`.
- **An obstacle's corner inside our hull** (a neighbour's pointed bow between two of our points), tested in the boat frame (`(xv, zv) = mapToBoat(V − position)`), skipping vertices that lie inside or on another obstacle (the quay and the wall share corners): for each polygon vertex `V` inside our hull polygon: `d` = the smallest distance to our hull's edges, `m` = that edge's outward normal (boat frame, turned into the map); `v = pointVelocity(boat, xv, zv)`, `vn = max(0, v·m)`; force `−(hullStiffness·d + hullDamping·vn)·m` at `(xv, zv)`; the part by `xv`, `zv` as above; `fender` false (fenders do not help here).
- `contactSeverity`: `fender && approach ≤ fenderMaxMps` → `'fender'`; else `< touch` → `'touch'`, `< bump` → `'bump'`, `< knock` → `'knock'`, otherwise `'hit'`.

`src/model/marina.ts`: `marinaObstacles(g: MarinaGeometry): Obstacle[]`: `quay` (`env_quay`), `wall` (`env_quay`), `pontoon` (`env_quay`), and each yacht (`yacht.id`, `env_moored_yacht`) with its outline turned counter-clockwise.

`harbourForces` inputs gain `obstacles: readonly Obstacle[]` and `fenders: FenderSet`; the function adds `contactForces(boat, obstacles, fenders)`. The store passes the marina's obstacles (from `marinaGeometry`, which `marina.ts` memoises by layout and traffic, returning the same object for the same pair; M44's `LinesInputs.geometry` uses the same object) only while the place is the marina (3.7); from M43 the `step` action passes `external` whenever a thruster is on or the place is not open water.

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
- Fenders: `HarbourState` (Phase 6) gains `fendersLost: readonly number[]` (a new array on every change; never mutated) (fender numbers, 4.1), `fenderOverSpeedS: number` and `fendersLostSinceSlow: number` (`[]`, 0, 0 in `DEFAULT_HARBOUR`). `stepFenders(harbour, contact, speedMps, timeS, dt): { harbour, contact }` (in `contact.ts`), after `stepContact` (4.3 step 6): while `fendersOut` and `|speedMps| > fenderLossSpeedMps`, `fenderOverSpeedS += dt`; otherwise `fenderOverSpeedS = 0` and `fendersLostSinceSlow = 0`. In a loop (several losses can fall in one frame at ×16): while `fenderOverSpeedS ≥ (fendersLostSinceSlow === 0 ? fenderLossAfterS : fenderLossEveryS)` and a fender is left, the lowest fender number not yet lost is added to `fendersLost`, `fenderOverSpeedS` is reduced by that threshold, a report `{ atS: timeS, obstacleId: 'fender', partId: 'fit_fender' (number 8: 'fit_fender_ball'), part: 'starboard' or 'port' (its side), impactMps: 0, fender: false, severity: 'hit' }` is added with `noticeUntilS = timeS + 8`, and `fendersLostSinceSlow` grows by 1. (So the first loss comes after 30 s at speed, the next ones every 20 s; slowing down restarts the 30 s.) `setFenders(true)` does not bring lost fenders back; `goToPlace` and `reset` do. `goToPlace` keeps `fendersOut` as it was (it clears only `fendersLost`, `fenderOverSpeedS` and `fendersLostSinceSlow`); `reset` gives `DEFAULT_HARBOUR` (Phase 6). Lost fenders are still drawn (Phase 6 merges all fenders into one mesh; accepted): the status line says how many are left.
- Action `{ type: 'clearDamageReport' }`: `reports` empty.
- Held still: no hits (stepBoat does nothing), and the fender timer stands still.
- Not in the link (a link opens with no reports and no lost fenders; `fd=1` still puts the fenders out, Phase 6).

### 9.5 Sections and modes

No new section: the fender status goes into Phase 6's `harbour` section. `MODE_LAYOUTS` after M43: Easy, Realistic and Learn as after M42. Harbour: `order` engine, thrusters, harbour, place, conditions, sails, ropes, autopilot, learn, legend; `open` engine, thrusters; `openSide` engine, thrusters, harbour; `second` place, conditions.

### 9.6 UI

**Harbour gear section** (`src/ui/harbourPanel.ts`, `createHarbourPanel(store)` of Phase 6; M44 and M45 add to it): after Phase 6's Fenders choice and its hint, a status line `fenders-status`: in the locker → `harbour.fenders.status.in`; out → `harbour.fenders.status.out` with `{count}` = the fenders not lost (9 at most: eight and the ball fender), followed by a space and `harbour.fenders.status.lost` with `{count}` = the lost ones when there are any.

**Damage report** (`src/ui/damageReport.ts`):
- `createDamageAlert(alerts, store)`: `div.rig-alert.rig-alert-report` `data-testid="damage-alert"` in the alert stack (as `createGybeReport`), shown while `rig.timeS < contact.noticeUntilS`, text `damageText(reports[0])`; class `is-hit` for `knock` and `hit`.
- `createDamageList(store): HTMLElement`, appended to the Place section after the status line: an `h3` `damage.title` with the count, a list `damage-list` of the newest 5 reports (`li.damage-item`, text `damageText`), an empty line `damage.none`, and a button `damage-clear` (`damage.clear`).
- `damageText(r)` (`part` is the localised registry lookup of `src/ui/i18n.ts`): a lost fender (`obstacleId === 'fender'`) → `t('damage.fenderLost', { side: t('side.' + r.part + '.gen') })`; otherwise `t('damage.line', { what: part(r.partId)?.name ?? r.partId, where: t('damage.part.' + r.part), speed: mpsToKn(r.impactMps).toFixed(1), verdict: t('damage.severity.' + r.severity) })`. (M44 adds a third case, the propeller.)

### 9.7 Strings

| Key | English | Russian (draft) |
|---|---|---|
| `harbour.fenders.status.in` | Fenders in the locker. | Кранцы в рундуке. |
| `harbour.fenders.status.out` | Fenders over the side: {count}. | Кранцев за бортом: {count}. |
| `harbour.fenders.status.lost` | Lost while sailing: {count}. | Потеряно на ходу: {count}. |
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

(New keys for `{side}`, appended in both `ui.json` files right after `damage.fenderLost`: `side.port.gen` "port" / «левого», `side.starboard.gen` "starboard" / «правого».)

### 9.8 Tests

`tests/contact.test.ts`:

1. `hullContactPoints`: 86 points (42 × 2 + 2); parts at x 6.9 → bow, x −8.6 → stern, (0.33, −1.99) → port. `hullPolygon` has 84 vertices.
2. `contactForces`, boat at rest, heading 0, `eastM = 0.52`, `northM = 0`, fenders in; the wall `[[2.875, −20], [10, −20], [10, 20], [2.875, 20]]`: exactly five starboard points are inside (x −3.03, −3.40, −3.77, −4.15, −4.52, depths 0.005, 0.015, 0.020, 0.015, 0.005): five hits, part `starboard`, `fender: false`, and `sideN` = −400,000 × 0.06 = −24,000 N (`toBeCloseTo`, ±1 %).
3. Fenders out (Phase 6's fender places), `eastM = 0.28` (0.52 − the fender diameter 0.24, so the fender tips sit as deep as the hull did in test 2): the same five points, each within `fenderReachM` (1.5) of the starboard fender at x −2.5 or −5.5, give five hits with `fender: true` and `sideN` = −100,000 × 0.06 = −6,000 N (±1 %).
4. `contactSeverity`: (0.1, false) touch; (0.3, false) bump; (0.6, false) knock; (0.9, false) hit; (0.3, true) fender; (0.6, true) knock.
5. `stepContact`: a hit for 3 steps gives one report; gone for 0.6 s and back gives a second one; `clearDamageReport` empties the list.
6. Fender loss (`stepFenders`, steps of 0.25 s): out, 3.0 m/s: no loss at 29.75 s; one at 30.0 s; two at 50.0 s; three at 70.0 s; slowing to 2.0 m/s for one step and back: the next loss 30 s later; one call with `dt` = 75 s: three losses; `out: false`: none.

`tests/physicsTruths7.test.ts` (the test loops `stepBoat` directly at 60 fps with `MotionInputs` built from a `harbourStart` state without wind (the rig and controls of that state, `engineThrustN` 0), the boat at (0, 0) heading 0 with `swayMps` set by spreading `boat: { ...state.boat, swayMps }`, `external = (b) => contactForces(b, [wall], fenders)` with the wall of test 2, 4 s at 60 fps; "the first hit" is the merged hit of the first frame whose `report.contacts` is not empty; the depth of a point is recomputed from the boat's state each frame; prototype values in brackets):

- **PT-50** fenders take a slow contact: `swayMps` 0.3 toward the wall, fenders in: the first hit's `approachMps` in [0.22, 0.28] (0.251), severity `bump`, and no point goes more than 0.03 m into the wall (0.019). Fenders out: every hit has `fender: true` (no hull contact), approach [0.24, 0.30] (0.273), severity `fender`. At 1.0 m/s with fenders out: approach [0.85, 0.97] (0.917), severity `hit`.
- **PT-34** fenders come in before sailing: `initialState({ engine: { running: true, leverPct: 66 } })` with no wind (she opens at her steady speed under engine, about 8 kn) and fenders out: after 29 s none lost, after 31 s one, after 71 s three; with fenders in, none.

### 9.9 Browser checks (`scripts/shots-m43.mjs`)

Scenes: `damage-alert` (`?pl=marina&tr=busy&m=harbour&pe=2.8&pn=1490.4&hdg=180&wd=-90&ws=20&cam=top&tx=4` after 3 s: in our berth, the west wind pushes her onto the neighbour on the east side (berth 13, its west edge at east 6.1); the alert shows), `harbour-gear` (`?pl=marina&m=harbour&fd=1` with the Harbour gear section open).

Live checks:

1. `m43 bump`: `?pl=marina&m=harbour&ws=0&cam=top&tx=16`; set the lever to ahead 60 % in the quick row (6 taps on `quick-lever-more`) and wait until the alert shows (at most 15 s): `damage-alert` is visible and the damage list has at least one item naming the quay (the boat ran east along the fairway into the wall, which is part of the quay).
2. `m43 fenders`: `showSection(page, 'harbour')`, click the `fenders-out` label (as PHASE6_SPEC 9.8 does): the link gets `fd=1`; `fenders-status` reads "Fenders over the side: 9."
3. `m43 lost`: `?ws=0&eng=1&lv=66&fd=1&tx=16`: polling every 100 ms of app time for at most 6 s (at ×16 the alert shows for 0.5 s: 8 simulated seconds), the alert reads that a fender was lost; afterwards `fenders-status` reads that at least one was lost.

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

New: `src/model/mooringLines.ts`, `src/render3d/mooringLines.ts`, `tests/mooringLines.test.ts`, `scripts/shots-m44.mjs`. Changed: `src/model/harbourForces.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/app/urlSync.ts`, `src/ui/harbourPanel.ts`, `src/ui/damageReport.ts` (the fouled alert), `src/ui/enginePanel.ts` (Start is refused while fouled), `src/ui/ropeLegend.ts` (the mooring colour), `src/render3d/sceneConfig.ts` (`SCENE.ropes.colors.mooring`), `src/render3d/boat/ropes.ts` (export `radiusAt` and `RopeView` for the mooring lines), `src/render3d/scene.ts`, `src/model/marina.ts` (`ourRings`, `ourSinker`: the lazy-line sinker), `content/boat/hanse508.json` (`physics.lines`), `content/areas/adriatic.json` (`marina.lazyLineLengthM`), `tests/motionHelpers.ts` (`berthLines`, 10.7), `tests/physicsTruths7.test.ts`, `tests/urlState.test.ts`, both `ui.json`, both glossaries, `docs/review/ru.md`, the registry, `scripts/ui.mjs`, `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md`.

**Phase 6 provides** (4.1): the six cleats (`cleatPlaces()`), named as in 4.1. Cleat heights are above the still waterline (the marina's water is flat; no heave or heel is applied to them).

### 10.2 Data

`content/boat/hanse508.json`, `physics.lines` (after `physics.contact`):

```json
"lines": {
  "lineEAN": 150000,
  "lineNote": "assumption: 16 mm polyamide (nylon) mooring line, axial stiffness EA; tension = EA / length × stretch",
  "lineDampingNsPerM": 3000,
  "crewPullN": 900,
  "crewPullNote": "assumption: what two crew pull on a line by hand (sources describe two crew hauling the lazy line in a crosswind); 'hand tight'",
  "tightenStepM": 0.2,
  "takeSlackM": 0.3,
  "throwReachM": 4.0,
  "takeMaxSpeedMps": 0.5,
  "lazyWalkS": 20,
  "maxLengthM": { "stern": 30, "lazy": 40, "bow": 10, "shore": 60 },
  "slackInWaterM": 1.0,
  "foulAfterS": 2.0
}
```

`content/areas/adriatic.json`, in `marina`: `"lazyLineLengthM": 25` (the sinker block of each north-row berth lies 25 m south of the quay face, on the bottom, on the berth's centre line).

### 10.3 Model

**Lines go only to our own berth** (north row, `ourBerth`, the yellow one), so every line's far end is fixed by the geometry. `src/model/marina.ts` adds to `MarinaGeometry`: `ourRings: { west: [number, number]; east: [number, number] }` (the rings at `x_12 ∓ w/2` on the quay face, `F`) and `ourSinker: [number, number, number]` (`x_12`, `F − lazyLineLengthM`, `−depthM`: east, north, height).

`src/model/mooringLines.ts` (pure):

```ts
export type LineCode = 'sp' | 'ss' | 'll';          // M45 adds 'bl' (bow line to a buoy) and 'sl' (shore line)
export interface FarEnd { eastM: number; northM: number; heightM: number /* above the water; negative = on the bottom */ }
export type CleatId = `cleat_${'bow' | 'mid' | 'stern'}_${'port' | 'starboard'}`;
export interface MooringLine { code: LineCode; cleatId: CleatId; far: FarEnd; lengthM: number }
/** A cleat's point in the boat frame (x, y, z): `cleatPlaces()[index].base`, index as 4.1. */
export function cleatPoint(id: CleatId, data?: BoatData): [number, number, number];
export interface CrewTask { kind: 'walkLazy'; code: LineCode; remainingS: number }   // M45 adds 'swimShore'
export interface LinesState { lines: readonly MooringLine[]; crew: CrewTask | null; fouled: boolean; foulS: number }
export const NO_LINES: LinesState;
export interface LinesInputs { lines: LinesState; boat: BoatState; harbour: HarbourState; geometry: MarinaGeometry; engine: EngineState }

/** How hard a line pulls now (N, ≥ 0) and the 3D distance between its ends (m). */
export function lineTension(line: MooringLine, boat: BoatState, data?: BoatData): { tensionN: number; distanceM: number };
/** The pull of every line on the boat now. */
export function lineForces(lines: readonly MooringLine[], boat: BoatState, data?: BoatData): ExternalForces;
/** Whether a line can be taken now, and if not, why (a UI string key). */
export function canTake(code: LineCode, inputs: LinesInputs, data?: BoatData): { ok: true } | { ok: false; reason: string; params?: Record<string, number> };
/** Whether Tighten would do anything (false when the line is already hand tight). */
export function canTighten(code: LineCode, inputs: LinesInputs, data?: BoatData): boolean;
/** Applies one line command (a refused one returns the state unchanged). */
export function lineCommand(code: LineCode, command: 'take' | 'tighten' | 'ease' | 'letGo', inputs: LinesInputs, data?: BoatData): LinesState;
/** The crew task timer, the walk's end, and the line-in-the-propeller check. */
export function stepLines(inputs: LinesInputs, dt: number, data?: BoatData): LinesState;
```

- **Line tension.** The cleat (`cleatPoint(line.cleatId)`, called `cleat` below) in the map: `pointToMap(boat, cleat.x, cleat.z)` at height `cleat.y`. `d` = the 3D distance to `far` (`heightM` as the vertical coordinate). If `d ≤ lengthM`: 0. Otherwise, with `u` the horizontal unit vector from the cleat towards the far end and `v = pointVelocity(boat, cleat.x, cleat.z)`: `rate = −(v·u)` (how fast the cleat moves away, horizontal), `T = (lineEAN / lengthM)·(d − lengthM) + lineDampingNsPerM·max(0, rate)`. The horizontal part of the pull, `T·(horizontal distance / d)·u`, is applied at `(cleat.x, cleat.z)` with `vectorToBoat` and `forceAt`.
- **Stern lines** `sp` (`cleat_stern_port`) and `ss` (`cleat_stern_starboard`): `sp` goes to whichever of `ourRings` is nearer to `cleat_stern_port` (in the berth, heading 180: the east ring), `ss` to the other one; `heightM = quayHeightM`. Take: `lengthM = d + takeSlackM`.
- **Lazy line** `ll`: take starts the crew task `walkLazy` (`remainingS = lazyWalkS`). When the walk ends (`stepLines`), the line is made fast on the bow cleat nearer to `ourSinker` (horizontal distance, compared with a tolerance of 1e−6; `cleat_bow_port` on a tie), far end `ourSinker`, `lengthM = d + takeSlackM` (made fast with slack; the learner then tightens it). It is made fast even if the stern lines were let go meanwhile.
- **`canTake`**, in this order (the first that fails gives the reason): the place is the marina (`lines.reason.place`); the line is not on and, for `ll`, no crew task is running (`lines.reason.busy`); for `ll` a stern line is on (`lines.reason.sternFirst`); the horizontal distance from the line's stern cleat (for `ll`: the nearer stern cleat) to its ring is at most `throwReachM` (`lines.reason.far`, with `params: { m: throwReachM }`; the UI shows `t(reason, params)`); the boat's speed `√(speedMps² + swayMps²)` is at most `takeMaxSpeedMps` (`lines.reason.fast`).
- **Tighten:** refused when the tension is already `≥ crewPullN` (`canTighten` false). Otherwise `lengthM = max(lengthM − tightenStepM, Lhand, 0.5)`, where `Lhand = d·lineEAN / (lineEAN + crewPullN)` is the length at which the line pulls `crewPullN` (hand tight). So tapping Tighten ends exactly at hand tight. **Ease:** `+= tightenStepM`, at most the code's `maxLengthM` (`stern` for `sp`/`ss`, `lazy` for `ll`). **Let go:** the line is removed (a lazy line being walked: the task ends).
- **Line in the propeller** (`stepLines`): a line is *slack in the water* when it is `sp`, `ss` or `ll` and `d < lengthM − slackInWaterM`; a lazy line being walked counts as slack in the water (picking it up with the engine in gear fouls it: intended). While `engine.running && engine.gear !== 'neutral'` and at least one line is slack in the water, `foulS += dt`, otherwise `foulS = 0`; in Held still `foulS = 0`. At `foulS ≥ foulAfterS` (tolerance 1e−9): `fouled = true`, `foulS = 0`. The store then stops the engine (`running: false`) and the `engine` reducer ignores `start` while `fouled`.
- Action `{ type: 'clearPropeller' }`: `fouled = false`, `foulS = 0` (a diver has cut it free; the line stays as it was).
- **Held still:** lines pull nothing (stepBoat does nothing); line commands and the crew task still work.

`harbourForces` inputs gain `lines: readonly MooringLine[]`; it adds `lineForces`.

**Worked values** (medium layout; the boat in the berth at east 2.75, north 1490.4, heading 180): stern cleats at (4.835, 1497.90) port and (0.665, 1497.90) starboard; `sp` to the east ring (5.5, 1500), `ss` to the west ring (0, 1500), both `d` = 2.250 m, taken at 2.55 m. Bow cleats at (3.329, 1485.40) port and (2.171, 1485.40) starboard: a tie, so `cleat_bow_port`; `ourSinker` (2.75, 1475, −5); `d` = 12.40 m; hand tight `Lhand` = 12.33 m. The tests use east 2.75 exactly; the links write `pe=2.8` (one decimal), where the stern lines are 2.236 and 2.265 m and the starboard bow cleat is the nearer one, so in the links' scenes the lazy line goes to `cleat_bow_starboard` (lengths 2.55 and 12.33 still hold).

### 10.4 Store and URL

- `AppState.lines: LinesState` (`NO_LINES` at start, `reset`, `load` of a link without `ln`, `goToPlace`).
- `src/app/urlSync.ts`: the subscriber also compares the lines through what the link stores (`linesParams(state).join('&')`, as `sameBoatLink` does; `linesParams` is the `ln` part of `harbourParams`, exported from `urlState.ts`), so taking, tightening or easing a line updates the link.
- Action `{ type: 'line'; code: LineCode; command: 'take' | 'tighten' | 'ease' | 'letGo' }` → `lineCommand`; `clearPropeller`.
- `step`: `stepLines` after `stepEngine` (4.3 step 2); if it sets `fouled`, the engine gets `running: false` in the same step, and the contact list gets a report `{ atS: timeS, obstacleId: 'propeller', partId: 'part_saildrive', part: 'stern', impactMps: 0, fender: false, severity: 'hit' }` with `noticeUntilS = timeS + 8`; `damageText` shows it as `t('damage.propeller')`.
- **URL** `ln` (after `pn`): the lines that are on, in the order `sp`, `ss`, `ll`, as `<code>:<lengthM to 2 decimals>`, comma separated (`ln=sp:2.55,ss:2.55,ll:12.33`). The serializer un-escapes `%3A` to `:` as it does `%2C` to `,`. Parse (only with `pl=marina`, after `pl`, `ml`, `tr`, `pe`, `pn` and `hdg` are known): each valid code with a length from 0.5 to its maximum; the far ends and cleats come from the rules above (our berth); a line whose `d` would be more than `lengthM + 1.0` when the link opens is dropped (it would yank the boat). A crew task, `fouled` and `foulS` are not stored.

### 10.5 UI

**Harbour gear section** (after the fender status): an `h3` `lines.title`, then one row per line code available in the place (marina: `sp`, `ss`, `ll`), `div.line-row` `data-testid="line-<code>"` `data-part-id` = the rope id (10.6):

- the name (`lines.name.<code>`) and a status `line-<code>-status`: off → `lines.off`; walking → `lines.walking` with `{seconds}` (whole seconds left, rounded up); on → `lines.on` with `{length}` (1 decimal) and `{kN}` (the tension in kN, 1 decimal);
- off: a button `line-<code>-take` (`lines.take.<code>`), disabled when `canTake` says no, with the reason under it (`line-<code>-reason`, `t(reason)`);
- on: buttons `line-<code>-tighten` (`lines.tighten`; disabled when `canTighten` is false, with `lines.tooTight` under it as `line-<code>-reason`), `line-<code>-ease` (`lines.ease`), `line-<code>-letGo` (`lines.letGo`); 44 px, in one row.
- The rows are built by an exported `createLineRow(store, code, suffix = '')` (M46 reuses it at the Bow station with the suffix `-bow` added to every test id).

Under the rows: `p.explain` `lines.hint`. While `fouled`: a status line `prop-fouled` (`lines.fouled`) and a button `prop-clear` (`lines.clearProp`); every engine Start button (Engine section, Helm station) is disabled with `engine.fouled` beside it.

**3D** (`src/render3d/mooringLines.ts`, in the world group, placed as the marina): each line that is on as a rope from its cleat to its far end, in a new colour `SCENE.ropes.colors.mooring` = `#56b4e9` (sky blue, from the same colour-blind-safe set as the other rope colours; the first choice, `#2f6db5`, was almost the furling lines' `#0072b2`) (`sceneConfig.ts`; the rope legend gets it as "Mooring lines" / «Швартовы», key `legend.mooring`, dash `'10 2'` in `ROPE_DASH`, last in `LEGEND_ORDER`; the mooring renderer uses the colour directly, since these ropes are not in `boat.ropes.list`), radius `visual.ropeRenderRadius`, at least `SCENE.ropes.minScreenWidthPx` on screen (`radiusAt` exported from `boat/ropes.ts`); slack lines sag as a parabola with the sag `min(1.5, (lengthM − d)·0.5)` m, taut ones are straight. From M44 the marina's ring meshes (8.6) carry `env_quay_ring` instead of `env_quay` (a tap on a ring names it; 3.7). Our berth's lazy line, while not taken, is drawn from the quay edge at the berth's middle (`x_12`, `F`, `quayHeightM`) down the quay face and along the bottom to `ourSinker`, in the same colour at 50 % opacity.

### 10.6 Strings and registry

Registry (`phase: 7`, `status: "draft"`): `rope_stern_line_port`, `rope_stern_line_starboard` (`kind: "rope"`, `group: "harbour"`, related `env_quay_ring`, `term_med_mooring`), `rope_lazy_line` (`kind: "rope"`, `group: "harbour"`, related `term_med_mooring`, `env_quay`), `env_quay_ring` (`kind: "environment"`, `group: "harbour"`), `term_med_mooring` (`kind: "term"`, `group: "harbour"`, related `rope_lazy_line`, `rope_stern_line_port`, `env_quay`; `showMe`: `?cam=top&pl=marina&pe=2.8&pn=1490.4&hdg=180&ln=sp:2.55,ss:2.55,ll:12.33`, canonical form, 3.7). `env_quay` gains `related` `term_med_mooring`.

| Key | English | Russian (draft) |
|---|---|---|
| `lines.title` | Lines | Швартовы |
| `lines.name.sp` | Stern line, port | Кормовой швартов, левый |
| `lines.name.ss` | Stern line, starboard | Кормовой швартов, правый |
| `lines.name.ll` | Lazy line (to the bow) | Муринг (на нос) |
| `lines.off` | Not tied. | Не закреплён. |
| `lines.walking` | The crew is walking it to the bow… {seconds} s | Экипаж ведёт его на нос… {seconds} с |
| `lines.on` | Tied: {length} m, pulling {kN} kN | Закреплён: {length} м, тянет {kN} кН |
| `lines.take.sp` | Throw it to the quay | Подать на причал |
| `lines.take.ss` | Throw it to the quay | Подать на причал |
| `lines.take.ll` | Pick it up | Поднять |
| `lines.tighten` | Tighten | Выбрать |
| `lines.ease` | Ease | Потравить |
| `lines.letGo` | Let go | Отдать |
| `lines.tooTight` | Hand tight: it cannot be pulled tighter by hand. | Выбрано втугую: руками туже не выбрать. |
| `lines.reason.place` | Only in the marina. | Только в марине. |
| `lines.reason.far` | Come within {m} m of your yellow berth with the stern. | Подойдите кормой ближе {m} м к своему (жёлтому) месту. |
| `lines.reason.fast` | Too fast: stop the boat first. | Слишком быстро: сначала остановите лодку. |
| `lines.reason.sternFirst` | Tie a stern line first. | Сначала закрепите кормовой швартов. |
| `lines.reason.busy` | The crew is busy. | Экипаж занят. |
| `lines.hint` | Stern-to (the usual way in the Mediterranean): reverse slowly into the berth, throw both stern lines to the quay when the stern is close, then pick up the lazy line (a line from the quay to a weight on the bottom ahead of the boat), walk it to the bow and pull it tight. The lazy line holds the bow against the wind. Keep the engine in neutral while a line is slack near the propeller. | Кормой к причалу (обычно в Средиземноморье): медленно заходите задним ходом, подайте оба кормовых швартова на причал, когда корма близко, затем поднимите муринг (конец от причала к грузу на дне перед лодкой), проведите его на нос и выберите втугую. Муринг держит нос против ветра. Пока у винта слабый конец, держите двигатель на нейтрали. |
| `lines.fouled` | A line is caught in the propeller. The engine has stopped. | Конец намотался на винт. Двигатель заглох. |
| `lines.clearProp` | Clear the propeller (a diver frees it) | Освободить винт (водолаз снимает конец) |
| `engine.fouled` | The propeller is fouled by a line: clear it first. | На винт намотан конец: сначала освободите винт. |
| `mode.harbour.hint` (changed) | Engine, thrusters, lines and anchor first. | Сначала двигатель, подруливающие, швартовы и якорь. |
| `damage.propeller` | A line got caught in the propeller and stopped the engine. | Конец намотался на винт и заглушил двигатель. |
| `legend.mooring` | Mooring lines | Швартовы |

Glossary (`English / Russian`):

| Id | name | alternatives | short | what | onThisBoat | mistakes | showMe |
|---|---|---|---|---|---|---|---|
| `term_med_mooring` | Stern-to mooring / Швартовка кормой | Med mooring / средиземноморская швартовка | Lying with the stern to the quay, held by stern lines and a lazy line or the anchor at the bow. / Стоянка кормой к причалу на кормовых швартовах и муринге или якоре с носа. | Boats lie side by side, stern to the quay, so many fit along it. Two stern lines go to rings on the quay; at the bow a lazy line (or your own anchor) holds her off the quay and against the wind. / Лодки стоят бок о бок кормой к причалу, так их помещается больше. Два кормовых швартова идут к рымам на причале; с носа муринг (или свой якорь) держит лодку от причала и против ветра. | Reverse in: the stern walks to port (M40), so start the turn early. / Заходите задним ходом: корму уводит влево, начинайте поворот раньше. | Picking up the lazy line with the engine in gear. → Neutral first: a slack line near the propeller fouls it. / Поднимать муринг с включённой передачей. → Сначала нейтраль: слабый конец у винта наматывается. | In the berth with both stern lines and the lazy line tight. / На месте, оба кормовых швартова и муринг выбраны. |
| `rope_lazy_line` | Lazy line / Муринг | mooring line / муринговый конец | A line from the quay to a weight on the bottom, taken to the bow. / Конец от причала к грузу на дне, заводимый на нос. | It lies on the bottom between berths; the crew lifts it with the boat hook at the stern, walks it forward along the side deck and makes it fast on a bow cleat, pulling it tight. / Он лежит на дне между местами; экипаж поднимает его отпорным крюком с кормы, ведёт вперёд по палубе и крепит на носовой утке, выбирая втугую. | In the app the crew takes 20 s to walk it forward. / В приложении экипаж ведёт его на нос 20 с. | Leaving it slack. → Pull it as tight as you can by hand, or the bow swings onto the neighbour. / Оставить слабым. → Выбирайте руками как можно туже, иначе нос сносит на соседа. | The berth's lazy line, waiting on the quay face. / Муринг вашего места у стенки причала. |
| `rope_stern_line_port` / `rope_stern_line_starboard` | Stern line (port / starboard) / Кормовой швартов (левый / правый) | — / — | A line from a stern cleat to a ring on the quay. / Конец с кормовой утки на рым причала. | The two stern lines hold the stern a short step from the quay. / Два кормовых швартова держат корму в шаге от причала. | Cleats on each quarter of the stern. / Утки на раковинах кормы. | Throwing them before the stern is close. → Wait until the stern is within about 4 m. / Подавать их, пока корма далеко. → Ждите, пока корма ближе примерно 4 м. | Both stern lines on the quay rings. / Оба кормовых швартова на рымах причала. |
| `env_quay_ring` | Quay ring / Рым на причале | bollard / кнехт, тумба | A ring on the quay that lines are tied to. / Кольцо на причале, к которому крепят швартовы. | — / — | One at each berth's edge in the app's marina. / По одному на краю каждого места в марине приложения. | — / — | — / — |

(Fields given as `—` are left out of the entry; `what` is required, so `env_quay_ring`'s `what` is its `short`.)

### 10.7 Tests

Helper in `tests/motionHelpers.ts`: `berthLines(state: AppState, o: { sternSlackM: number; lazy: 'handTight' | number | null }): MooringLine[]` builds the lines of our berth for the boat as she lies (stern lines `d + sternSlackM`; the lazy line at `Lhand`, at `d + lazy`, or none), with the far ends and cleats of 10.3. "The transom" is the point `(transomX, 0)`.

`tests/mooringLines.test.ts` (time steps of 0.25 s):

1. `lineTension`: a line 5 m long with its ends 5.1 m apart, at rest → 3,000 N (`toBeCloseTo`); 4.9 m apart → 0.
2. `canTake('sp')` in the marina at the start (fairway) → `lines.reason.far`; with the boat in the berth (east 2.75, north 1490.4, heading 180, at rest) → ok; with `speedMps` 0.6 → `lines.reason.fast`. `canTake('ll')` without a stern line → `lines.reason.sternFirst`. `canTake('sp')` in open water → `lines.reason.place`.
3. Lazy walk: take `sp`, then `ll` → `crew.remainingS` 20; after 80 steps of `stepLines` the lazy line is on `cleat_bow_port` with the far end (2.75, 1475, −5) and `lengthM` 12.70 (±0.01; 10.3 worked values).
4. Tighten the lazy line repeatedly: it stops at 12.33 (±0.01) and `canTighten` is then false; ease stops at 40; let go removes it.
5. Fouling: a stern line with `lengthM = d + 2.0`, the engine running astern: `fouled` at 2.0 s, not at 1.75 s; with the engine in neutral never; with the engine stopped never.
6. URL: with `pl=marina&pe=2.8&pn=1490.4&hdg=180`, `ln=sp:2.55,ss:2.55,ll:12.33` round-trips (the text keeps `:`); without `pl` it is ignored; `ln=sp:0.5` there is dropped (its `d` is more than 1.5).

`tests/physicsTruths7.test.ts` (the place is the marina, layout `medium`, traffic `empty`; the boat in the berth as test 2, at rest, engine stopped (PT-52: running), autopilot off, flat water; `berthLines(state, { sternSlackM: 0.3, lazy: 'handTight' })`; `external` = `lineForces` of those lines only; wind from 90 (east), steady; 120 s at 60 fps; prototype values in brackets):

- **PT-51** a lazy line holds the bow: 15 kn: the largest heading deviation from 180 is in [0, 12]° (8.7); 25 kn: [0, 15]° (11.2); at the end of the run the transom is within 1.0 m of where it started (0.43 / 0.69 m). With `lazy: null` at 15 kn the bow swings more than 35° (60.6).
- **PT-52** a slack line fouls the propeller: in the berth with `berthLines(state, { sternSlackM: 2.0, lazy: null })` and the lever at −30: after 3 s the engine is stopped and `fouled` is true; with the lever in neutral, after 10 s not.

### 10.8 Browser checks (`scripts/shots-m44.mjs`)

Helper `lineAction(page, code, action)`: `showSection(page, 'harbour')`, click `line-<code>-<action>`.

Scenes: `berth-lines` (the `term_med_mooring` `showMe` link: both stern lines and the lazy line drawn), `lines-section` (the same link with the Harbour gear section open, side layout size too), `lazy-waiting` (`?pl=marina&m=harbour&pe=2.8&pn=1490.4&hdg=180&ws=0&cam=side-port`: the lazy line hanging at the quay).

Live checks:

1. `m44 stern-to`: `?pl=marina&m=harbour&pe=2.8&pn=1490.4&hdg=180&ws=0&tx=4`: `lineAction` take `sp`, take `ss`, take `ll`; wait until `line-ll-status` reads tied (polling, at most 8 s of app time); `waitForLink(page, ['ln=sp:', 'ss:', 'll:'])`.
2. `m44 fouled`: the same link (the place starts the engine in neutral); take `sp`, ease it 10 times (2 m of slack); tap `quick-lever-less` 3 times (lever −30; the gear engages at once because it was not in a gear before); within 2 s of app time (×4) `prop-fouled` shows and the strip shows the engine stopped.

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

New: `src/model/seabed.ts`, `src/render3d/seabed.ts`, `src/render3d/bay.ts`, `tests/seabed.test.ts`, `scripts/shots-m45.mjs`. Changed: `content/areas/adriatic.json` (`bay`, `marina.basin`, the `bay` place), `src/model/area.ts` (`BayData`), `src/model/places.ts`, `src/model/mooringLines.ts` (`bl`, `sl`), `src/model/harbourForces.ts` (ground, land), `src/model/contact.ts` (the `bottom` verdicts), `src/app/store.ts`, `src/app/urlState.ts`, `src/ui/instrumentStrip.ts`, `src/ui/mapView.ts` (also the mini-map's `drawMiniMap`), `src/ui/placePanel.ts`, `src/ui/harbourPanel.ts`, `src/ui/damageReport.ts`, `src/render3d/mooringLines.ts` (bay lines), `src/render3d/picking.ts`, `src/render3d/scene.ts`, `src/render3d/sceneConfig.ts` (`SCENE.bay`), `src/style.css`, `content/boat/hanse508.json` (`physics.ground`, `physics.lines` additions), `tests/physicsTruths7.test.ts`, `tests/mooringLines.test.ts`, `tests/urlState.test.ts`, `tests/glossary.test.ts` (group sizes), both `ui.json`, both glossaries, `docs/review/ru.md`, the registry, `docs/BOAT_REFERENCE.md` (`physics.ground` rows), `docs/CODE_MAP.md`.

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
  "weed": [{ "eastM": -1560, "northM": -90, "radiusM": 50 }],
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
  "keelX": -1.4,
  "keelNote": "assumption: the middle of the keel bulb (x -0.08 to -2.69), where the keel is deepest",
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
export function groundPoints(data?: BoatData): { x: number; needM: number; part: HullPart }[]; // keel (physics.ground.keelX −1.4, dimensions.draft 2.4, 'keel'); rudder (data.hull.rudder.stockX −7.75, −data.hull.rudder.bottomY 1.95, 'stern')
export function groundForces(boat: BoatState, areaData?: AreaData, data?: BoatData): ExternalForces;
```

- `depthAt`, in this order: inside `marina.basin` → `marina.depthM`; otherwise `b` = the distance to the `coast` polygon's edges; inside the coast polygon (land, ray casting) → `−min(landMaxHeightM, landSlope·b)`; outside (water) `n = min(openDepthM, slope·b)`, and inside a rock's circle (distance `r` from its centre, radius `R`) the rock rises as a smooth mound: `min(n, topDepthM + (n − topDepthM)·(r / R)²)` (so a keel that hits it is pushed off its side, not stopped by a wall).
- `seabedAt`: inside a rock's circle, or water within `rockShoreM` of the coast → `rock`; inside a `weed` circle → `weed`; inside `marina.basin` → `marina.seabed` (`mud`); otherwise `sand`.
- `groundForces` (`harbourForces` calls it only in the bay, 3.7): for each point of `groundPoints` (z = 0): `D = depthAt(pointToMap(boat, x, 0))`, `pen = needM − D`; if `pen ≤ 0` nothing. `N = stiffnessNPerM·pen`. `g = depthGradient(...)`, `slope = min(maxSlope, |g|)`, `ĝ = g / |g|` (no push if `|g| < 1e−6`, at a rock's exact top). `v = pointVelocity(boat, x, 0)`, `sp = |v|`. The force (map) `N·slope·ĝ − friction·N·v / max(sp, 0.05) − dampingNsPerM·v` (smooth near zero, so a grounded boat does not jitter), applied at `(x, 0)`. Hit `{ key: 'bottom:' + part, obstacleId: 'bottom', partId: 'env_seabed', part, approachMps: sp, fender: false }` (`sp` is the point's whole horizontal speed). On rock-top contact the same formula applies (the mound's slope pushes her off; it takes the lever astern).
- **Land:** `landObstacles` become `Obstacle`s (`id` `land`, `partId` `env_shore`) for `contactForces` (M43), with the marina's.
- `harbourForces` gains the input `place: PlaceId` and adds `groundForces` and the land obstacles only when it is `'bay'`, the marina's obstacles only when it is `'marina'` (3.7); `groundForces` itself does not look at the place.

**Places:** `PlaceId` gains `'bay'`; `placeStart('bay')` = the place's data, `sea: 'sheltered'`; `goToPlace('bay')` gets the marina's ready state (sails away, engine in neutral, autopilot off).

**Lines** (`mooringLines.ts`): `LineCode` gains `'bl'` and `'sl'`; `MooringLine` gains `farIndex: number` (the buoy's or ring's index; −1 for the marina's lines); `CrewTask.kind` gains `'swimShore'`.

- `bl` (bow line to a mooring buoy): `canTake`, in order: the place is the bay (`lines.reason.bay`, reachable only through tests, since the rows are per place); no `bl` on (one at a time; `lines.reason.busy`); the bow fitting tip `(bowFittingTipX, 0)` within `buoyReachM` (horizontal) of a buoy (`lines.reason.buoyFar`); the speed `√(speedMps² + swayMps²)` at most `buoyMaxSpeedMps` (`lines.reason.fast`). Take: from the bow cleat nearer to the buoy (`cleat_bow_port` on a tie, tolerance 1e−6; the same rule when a link opens) to `(buoy, buoyRingHeightM)`, `lengthM = d + buoySlackM`, `farIndex` = the buoy's index (0-based in `bay.buoys`). Maximum length `maxLengthM.bow`.
- `sl` (shore line): `canTake`, in order: the place is the bay; no shore line on and no crew task (`lines.reason.busy`); a stern cleat within `shoreReachM` (horizontal) of a ring (`lines.reason.shoreFar`); the speed at most `takeMaxSpeedMps` (`lines.reason.fast`). Take: the crew task `swimShore` with `remainingS = shoreSwimS`, and the ring (`ringIndex`, 0-based in `bay.rings`, the nearest to the nearer stern cleat) and the cleat (`cleatId`, the stern cleat nearer to that ring, `cleat_stern_port` on a tie with tolerance 1e−6; the same rule when a link opens) fixed at the start (`CrewTask` gains `ringIndex?: number` and `cleatId?: CleatId`). At its end the line goes from that cleat to that ring at `ringHeightM`, `lengthM = d + shoreSlackM`, `farIndex` = the ring's index. Maximum length `maxLengthM.shore`. `LinesInputs` gains `area: AreaData` (for the buoys and rings).
- `sl` counts for the line-in-the-propeller rule (a stern line), and a shore line being taken ashore counts as slack in the water; `bl` does not. `ln` writes the lines in the order `sp`, `ss`, `ll`, `bl`, `sl`.

### 11.4 Store and URL

- `pl=bay` (8.4; a `pl=bay` link fills in the ready state, with `sea=sheltered`). `ln` codes for the bay: `bl<i>:<length>` and `sl<i>:<length>`, `i` the 0-based index into `bay.buoys` / `bay.rings` (`ln=bl1:3.20`, `ln=sl2:31.50`); parsed only with `pl=bay`; `sp`, `ss`, `ll` only with `pl=marina`.
- The contact list gets ground hits (M43's `stepContact`).

### 11.5 UI

- **Place section:** `place-bay` (`place.bay`); status `place.status.bay`.
- **Instrument strip:** a `span` `data-testid="strip-depth"` appended to the flags line (the `span.strip-line.strip-flags` of `instrumentStrip.ts`, which holds the worn-sail badge, GUST, the time scale and the engine; the first line is full on a phone) with `t('instruments.depth', { m: depth.toFixed(1) })`, where `depth = depthAt(pointToMap(boat, data.hull.saildrive.x, 0))` (the sounder under the hull); shown only while the place is not open water (also in Held still, with the depth where she lies); class `is-shallow` (red text, `src/style.css`) when below `dimensions.draft + 1.0` m.
- **Harbour gear section:** in the bay, rows for `bl` and `sl` (10.5), with `line-sl-status` showing `lines.swimming` while the crew task runs. The bay uses `lines.hint.bay` in place of `lines.hint`.
- **Damage report:** `damageText` uses `t('damage.ground.' + severity)` as the verdict for a hit on the `bottom` (`fender` never applies there).
- **Map** (`mapView.ts`, an exported `drawSeabed(ctx, state, view, mini = false)`, called in `drawMap` and `drawMiniMap` just before `drawHarbour`, 8.6): the depth as shaded cells (cell size `max(4 m, 4 px × metresPerPx)`; only cells in the view and only where `depthAt < openDepthM`), drawn into an offscreen canvas that is reused until the view (centre, zoom, rotation or size) changes: depth < `draft` → `#e9b7a8` (too shallow for us), < 5 m → `#cfe6f2`, < 10 m → `#a9d3ea`, < 20 m → `#86bfdf`; land `#d8cfa6`; the rocks as a black `+` with four dots (the chart symbol for a dangerous underwater rock), the rings as black dots (3 px), the buoys as orange dots (5 px). The mini-map draws the same with `mini = true` (cells of at least 8 px, no rings). `pickMap` tests, after the marina's items: a tap within `MAP.hitPx` of a rock's symbol → `env_rock`, of a ring → `env_shore_ring`, of a buoy → `env_mooring_buoy` (only while they are drawn); this is where the id `env_rock`, which no mesh carries, appears in the code (3.7).
- **3D** (`src/render3d/seabed.ts`): one terrain mesh over `[−2600, −1100] × [−1000, 1000]` (east × north) with vertices every 10 m (20 m at Detail Low), height `−depthAt` (land above the water, seabed below it), vertex colours sand `#d8c79a`, weed `#4f6b3a`, rock `#7a7066`, land `#8f9a5b` (above 6 m `#a39c8a`); the marina basin's bottom as a flat plane at −5 m in mud `#6b5b45`. Each is shown while the nearest point of its rectangle is within 1,000 m of the boat (the camera's far plane). Colours and sizes in `SCENE.bay`. `src/render3d/bay.ts`: the rings (a 1.0 m post with a 0.15 m torus on top, id `env_shore_ring`), the buoys (a white sphere of 0.35 m radius with a small ring on top, id `env_mooring_buoy`), floating on `heightAt` as the practice buoys do; both in the world group, placed as the marina (8.6).
- Picking: the terrain above the water `env_shore`, below `env_seabed`; the terrain, the basin plane and the `bay.ts` group join the picker's extra roots in `scene.ts` (as the marina, 8.6), and each mesh is hidden itself while out of range (8.6).

### 11.6 Strings and registry

Registry (`phase: 7`, `status: "draft"`, `group: "harbour"`, `sources: []`): `env_seabed` (`environment`), `env_shore` (`environment`), `env_rock` (`environment`), `env_shore_ring` (`environment`), `env_mooring_buoy` (`environment`), `rope_bow_line` (`rope`, related `env_mooring_buoy`), `rope_shore_line` (`rope`, related `env_shore_ring`), `term_grounding` (`term`, related `env_seabed`, `fit_instrument_display`; `showMe` `?cam=side-port&pl=bay&pe=-1676.4&pn=0.0&hdg=270&bs=1.0`, canonical form, 3.7).

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
| `lines.hint.bay` | In a bay: pick up a mooring buoy with the bow, or anchor and take a shore line from the stern to a ring on the rocks, so she cannot swing. Keep the engine in neutral while a line is slack near the propeller. | В бухте: возьмите швартовную бочку носом или встаньте на якорь и заведите с кормы береговой швартов на рым в скалах, чтобы лодку не разворачивало. Пока у винта слабый конец, держите двигатель на нейтрали. |
| `damage.ground.touch` | the keel brushed the bottom. | киль коснулся дна. |
| `damage.ground.bump` | the keel touched the bottom: check the keel when you can. | киль задел дно: при случае осмотрите киль. |
| `damage.ground.knock` | the keel struck the bottom: have the keel checked. | киль ударился о дно: нужно осмотреть киль. |
| `damage.ground.hit` | the keel hit the bottom hard: have the keel and its bolts checked, and look for water inside. | сильный удар килем о дно: осмотрите киль и его болты, проверьте, нет ли воды внутри. |

Glossary (`English / Russian`):

| Id | name | alternatives | short | what | onThisBoat | mistakes | showMe |
|---|---|---|---|---|---|---|---|
| `term_grounding` | Running aground / Посадка на мель | touching the bottom / касание грунта | The keel touches the bottom where the water is shallower than the draft. / Киль касается дна там, где глубина меньше осадки. | The keel goes deepest: 2.4 m on this boat. Touch gently and full astern usually gets you off the way you came; come in fast and she sticks. Watch the depth before it is too late. / Глубже всего сидит киль: 2,4 м у этой лодки. При лёгком касании полный назад обычно снимает лодку тем же путём; на скорости она застревает. Следите за глубиной заранее. | Draft 2.4 m (standard keel). The depth on the strip turns red under 3.4 m. In the app a touch at 2 kn or less comes off with full astern; at 3 kn she sticks. / Осадка 2,4 м (стандартный киль). Глубина на полосе приборов краснеет меньше 3,4 м. В приложении при касании до 2 уз лодка снимается полным назад; на 3 уз застревает. | Motoring into a bay at cruising speed. → Slow down near the shore and watch the depth. / Входить в бухту крейсерской скоростью. → Сбавьте ход у берега и следите за глубиной. | Coming in slowly towards the shallow end of the bay. / Медленный заход к мелкому краю бухты. |
| `env_seabed` | Seabed / Грунт | bottom / дно | What the bottom is made of: sand, mud, weed or rock. / Из чего дно: песок, ил, трава или камень. | It decides how well an anchor holds: sand and mud hold well, weed and rock poorly. / От него зависит держание якоря: песок и ил держат хорошо, трава и камень плохо. | The bay has sand, a patch of sea grass and rocky shores. / В бухте песок, пятно морской травы и каменистые берега. | — / — | — / — |
| `env_shore` | Shore / Берег | — / — | The land around the bay. / Суша вокруг бухты. | — / — | — / — | — / — | — / — |
| `env_rock` | Underwater rock / Подводный камень | — / — | A rock that does not show above the water. / Камень, не видный над водой. | The chart marks it with a cross and four dots. / На карте он обозначен крестиком с четырьмя точками. | Three in the bay: two near the north shore and one hidden in the southern half. / Три в бухте: два у северного берега и один скрытый в южной половине. | — / — | — / — |
| `env_shore_ring` | Shore ring / Рым на берегу | — / — | A ring fixed in the rock for a shore line. / Кольцо, вбитое в скалу для берегового швартова. | — / — | Five rings on the back and the north shore. / Пять рымов на дальнем и северном берегу. | — / — | — / — |
| `env_mooring_buoy` | Mooring buoy / Швартовная бочка | buoy / буй | A buoy fixed to a weight on the bottom that you tie your bow to. / Буй на якоре-грузе, к которому крепят нос. | Come up to it slowly into the wind, pick it up with the boat hook at the bow and tie a bow line through its ring. / Подходите медленно против ветра, возьмите её отпорным крюком с носа и проведите носовой конец через рым. | Three buoys at the mouth of the bay. / Три бочки у входа в бухту. | Approaching downwind. → Come up into the wind so you can stop at it. / Подходить по ветру. → Подходите против ветра, чтобы остановиться у неё. | — / — |
| `rope_bow_line` | Bow line / Носовой конец | — / — | A line from a bow cleat. / Конец с носовой утки. | — / — | — / — | — / — | — / — |
| `rope_shore_line` | Shore line / Береговой швартов | — / — | A line from the stern to a ring or a rock on the shore. / Конец с кормы на рым или камень на берегу. | Used with the anchor so the boat lies with her stern to the shore and does not swing. / Применяется с якорем, чтобы лодка стояла кормой к берегу и не разворачивалась. | The crew takes it ashore in 30 s in the app. / В приложении экипаж заводит его за 30 с. | — / — | — / — |

### 11.7 Tests

`tests/seabed.test.ts`:

1. `depthAt`: (−1650, 0) → 5.0; (0, 0) → 40; (−1480, −60) → 1.5 (a rock's top); (−1477.5, −60) → 1.5 + (9.0 − 1.5)·0.25 = 3.375 (halfway out on the mound; the natural depth there is 9.0); (0, 1460) → 5 (marina basin); (−1750, 0) → −7.5 (land, 50 m in).
2. `seabedAt`: (−1560, −90) weed; (−1690, 0) rock; (−1650, 50) sand; (−1605, 0) sand; (0, 1460) mud.
3. `depthGradient` at (−1650, 0) points east (towards deeper water) with size 0.1 (±0.001).
4. Every `landObstacles` rectangle lies inside the `coast` polygon or on its edges (test the corners moved 0.01 m towards the rectangle's centre); every ring is on the coast (within 0.01 m of an edge); every buoy is in water deeper than `draft + 2` m (buoys 0 and 2 are in 5.0 m, buoy 1 in 15 m).
5. `groundForces`: the boat at rest at east −1679.4, north 0, heading 270 (the keel at east −1678, depth 2.2 m, 0.2 m too deep; the rudder at east −1671.65, depth 2.8 m, clear): `N` = 8,000 N and the push along the gradient 800 N towards the east, which in the boat frame (bow to the west) is `surgeN` = −800 (±1), `sideN` 0 (±1), `momentNm` 0 (±10); one hit `bottom:keel`.

`tests/mooringLines.test.ts` additions: `bl` take with the bow tip 0.1 m from buoy 1 (index 1, the middle one) at 0.2 m/s works, at 0.4 m/s gives `lines.reason.fast`; `sl` take starts a 30 s crew task and ends with the line on the stern cleat that was nearer the ring when it started.

`tests/physicsTruths7.test.ts` (the place is the bay; the boat heading 270 at north 0 with the keel 1 m east of the line where the depth is 2.4 m: `eastM = −1676.4`; engine running in neutral; at 15 s the lever goes to −100; 45 s at 60 fps; "too deep" is the largest `needM − depth` at the keel over the run; "back" is the increase of `eastM` from the moment the lever goes astern; "off" is the keel's depth above 2.4 m; prototype values in brackets):

- **PT-53** the keel touches where it is too shallow: starting at 1 kn: the keel goes [0.07, 0.14] m too deep (0.10); the report has a `bottom` hit at the `keel` whose `impactMps` is in [0.40, 0.53] (severity `knock`); by 45 s she is off and has gone back more than 20 m (48.7). Starting at 3 kn: [0.25, 0.37] m (0.31), severity `hit`; at 45 s still aground, back less than 3 m (1.3).

### 11.8 Browser checks (`scripts/shots-m45.mjs`)

Scenes: `bay-entrance` (`?pl=bay&m=harbour&cam=top`), `bay-map` (`?pl=bay&m=harbour&cam=map`, `map-zoom-out` three times: 1 m per pixel), `bay-shallow` (the `term_grounding` `showMe` link with `m=harbour`: the depth on the strip red), `bay-buoy` (`?pl=bay&m=harbour&pe=-1457.0&pn=0.0&hdg=90&ws=0&cam=side-port`: the bow tip 0.1 m from buoy 1).

Live checks:

1. `m45 depth`: `?pl=bay&m=harbour`: `strip-depth` shows a number; after `choosePlace(page, 'open')` it is hidden.
2. `m45 buoy`: the `bay-buoy` link; `lineAction(page, 'bl', 'take')`; `waitForLink(page, ['ln=bl1:'])`.
3. `m45 aground`: the `term_grounding` link with `m=harbour&tx=4`: within 3 s of app time the damage alert's text contains the seabed's name and "keel".

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

New: `src/model/anchor.ts`, `src/ui/anchorPanel.ts`, `src/render3d/anchorChain.ts`, `tests/anchor.test.ts`, `scripts/shots-m46.mjs`. Changed: `src/model/realistic.ts` (`STATION_IDS` gains `'bow'`; `StationEntry` gains `windlass?: string`), `src/ui/realisticPanel.ts` (the Bow station; `noClutches` includes `'bow'`), `src/ui/stationDrawing.ts` (the Bow station and the helm remote), `src/model/harbourForces.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/app/urlSync.ts`, `src/ui/modes.ts`, `src/ui/panel.ts`, `src/ui/mapView.ts` (also the mini-map's `drawMiniMap`), `src/ui/damageReport.ts` (the alarm alert), `src/render3d/boat/index.ts` (`BoatModel.setAnchorStowed`, 12.6), `src/render3d/boat/bowGear.ts` (export `buildAnchor`), `src/render3d/scene.ts`, `content/boat/hanse508.json` (`physics.anchor`, the `bow` station), `scripts/shots-m4b.mjs` (the station bar's text gains `Bow`), `scripts/shots-m23.mjs` (the Latin scan visits the Bow station), `tests/physicsTruths7.test.ts`, `tests/urlState.test.ts`, `tests/modes.test.ts`, `tests/glossary.test.ts` (group sizes), both `ui.json`, both glossaries, `docs/review/ru.md`, the registry, `scripts/ui.mjs`, `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md`.

**Phase 6 provides** (4.1): the roller (`rollerPoint`, 4.1), the anchor mesh (`fit_anchor`) stowed in the roller, the short chain to the windlass (`fit_anchor_chain`) and the windlass (`fit_anchor_windlass`).

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
export function chainPull(L: number, D: number, X: number, data?: BoatData): { pullN: number; lifted: boolean; a: number; s: number; spanM: number };
/** The anchor's holding now (N). */
export function holdingN(state: AnchorState, D: number, lifted: boolean, seabed: SeabedType, data?: BoatData): number;
/** The chain's force on the boat now (boat frame, at the roller). */
export function chainForces(state: AnchorState, boat: BoatState, env: SeabedEnv, data?: BoatData): ExternalForces;
/** The windlass: chain in or out (before the boat moves). */
export function stepWindlass(state: AnchorState, boat: BoatState, env: SeabedEnv, dt: number, data?: BoatData): AnchorState;
/** After the boat moved: dragging, setting, the alarm. */
export function stepAnchor(state: AnchorState, boat: BoatState, env: SeabedEnv, dt: number, data?: BoatData): AnchorState;
/** Where the chain leaves the roller, boat frame (4.1): (6.92, 1.80, 0.20). */
export function rollerPoint(data?: BoatData): { x: number; y: number; z: number };
/** PT-31: the chain the rules ask for here (m). */
export function scopeNeededM(depthM: number, twsKn: number, data?: BoatData): number;
/** Points of the chain from the roller to the anchor, map (east, north, height), for drawing. */
export function chainPoints(state: AnchorState, boat: BoatState, env: SeabedEnv, count: number, data?: BoatData): [number, number, number][];
```

- **The roller** `roller` = `rollerPoint(data)` below.
- **Effective depth** `D` = `env.depthAt(anchor)` (on the bottom) or `env.depthAt(roller)` (hanging) `+ roller.y`. If the water there is 0 or less (the anchor dragged or linked onto land), the chain pulls nothing and the anchor does not move further.
- **`chainPull(L, D, X)`** (`w = chainWeightNPerM`): `L ≤ D` → `{ pullN: 0, lifted: true, a: 0, s: L, spanM: 0 }`. `X0 = L − D`; `X ≤ X0` → `{ pullN: 0, lifted: false, a: 0, s: D, spanM: 0 }` (the chain hangs straight down and lies on the bottom). `aLift = (L² − D²) / (2D)`, `XLift = aLift·asinh(L / aLift)`; `X ≥ XLift` → `{ pullN: w·aLift + snubStiffnessNPerM·(X − XLift), lifted: true, a: aLift, s: L, spanM: XLift }`. Otherwise find `a` in `(1e−6, aLift)` with `X(a) = L − s + a·asinh(s / a)`, `s = √(D² + 2aD)`, equal to `X` (50 bisection steps; `X(a)` grows with `a`); `pullN = w·a`, `lifted: false`, `spanM = a·asinh(s / a)` (the suspended part's horizontal length). (Worked: L 30, D 6, w 18.77: X 27 → 68 N, X 29 → 869 N, X 29.5 → 7,484 N.)
- **`holdingN`**: `massKg·g·holdingRatio[seabed]·interpTable(scopeHolding, chainOutM / D)·(lifted ? liftedHoldingShare : 1)·(phase === 'set' ? 1 : unsetHoldingShare)`.
- **`chainForces`**: phases `bottom` and `set` only. The roller in the map `R = pointToMap(boat, roller.x, roller.z)`; `X` = horizontal distance from `R` to the anchor; `pullN` from `chainPull(chainOutM, D, X)`; the force `pullN` towards the anchor (horizontal), applied at `(roller.x, roller.z)`.
- **`stepWindlass`** (also in Held still):
  - `down`: `chainOutM += windlassDownMps·dt`, at most `chainLengthM` (then `windlass: 'off'`). Phase `stowed` → `hanging` as soon as `chainOutM > 0`.
  - `up`: the pull `P` (phases `bottom` / `set`: `chainPull` now; otherwise 0). If `P > windlassMaxPullN` → `windlass: 'off'`, `cutOut: true`. Otherwise `chainOutM −= windlassUpMps·max(0.2, 1 − P / windlassMaxPullN)·dt`. On the bottom and `chainOutM ≤ D + breakOutMarginM` → the anchor breaks out: `hanging`, with `draggedM`, `dragS`, `dragging` and `alarm` reset. `chainOutM ≤ 0` → `ANCHOR_STOWED`.
  - A `hanging` anchor lands at the point straight below the roller (`R`) as `bottom`, with `draggedM = 0`, when `chainOutM ≥ D` while the windlass is `down`, or at any time when `chainOutM ≥ D + breakOutMarginM` (she drifted into shallower water). So an anchor that has just broken out going up does not land again.
  - The action `windlass` with `down` or `up` clears `cutOut` and `alarm`; `off` (a release) changes neither. The alarm is silenced by its own action `{ type: 'silenceAnchorAlarm' }`.
- **`stepAnchor`** (not in Held still; once per frame, after `stepBoat`): phases `bottom`/`set` only. `P`, `lifted` from `chainPull`; `H = holdingN(...)` with the seabed under the anchor. If `P > H`: the anchor moves towards `R` by `min(maxDragMps, (P − H) / dragResistanceNsPerM)·dt` (but not into water shallower than 0), `draggedM` grows by the same, `dragging: true`, `dragS += dt`; if the phase is `bottom`, the seabed is not `rock` and `draggedM ≥ setDistanceM` → `set`. Otherwise `dragging: false`, `dragS = 0`. `alarm` becomes true when `dragS ≥ alarmAfterS` and either the phase is `set`, or the phase is `bottom` and `draggedM ≥ 5 × setDistanceM` (an anchor that drags without ever setting, as on rock); it stays until a windlass press, `silenceAnchorAlarm`, `goToPlace` or `reset`.
- **`scopeNeededM(depth, tws)`**: `max(4·(depth + roller.y) + (tws ≥ strongWindKn ? 2·dimensions.loa : 0), 3·dimensions.loa)`, called with the depth at the anchor (on the bottom) or under the roller (hanging) and `tws` = the wind speed setting `controls.ctl_wind_speed` (not the gusting wind, so the check does not flicker).
- **`chainPoints`**: hanging → from the roller straight down to the anchor at height `max(roller.y − chainOutM, −depthAt(roller))`; on the bottom with `pullN = 0` → straight down from the roller to the bottom, then along the bottom to the anchor; otherwise the catenary from `R` (height `roller.y`) over `spanM` towards the anchor (`count` points of `y(x) = a·(cosh(x/a) − 1)` measured from the touchdown) and a straight line on the bottom (`−depthAt`) to the anchor; when lifted with `X > spanM`, the last point is moved to the anchor.

`harbourForces` inputs gain `anchor: AnchorState` and `env: SeabedEnv` and add `chainForces`. The store passes `env = { depthAt, seabedAt }` (M45).

### 12.4 Store and URL

- `AppState.anchor: AnchorState` (`ANCHOR_STOWED` at start, `reset`, `goToPlace`).
- `src/app/urlSync.ts`: the subscriber also compares the anchor through what the link stores (`anchorParams(state).join('&')`; `anchorParams` is the `an`, `ax`, `as` part of `harbourParams`, exported from `urlState.ts`), so the chain counter (to 0.1 m), the anchor's position and `as=1` update the link.
- Action `{ type: 'windlass'; motion: WindlassMotion }` (hold-to-act: `down`/`up` on press, `off` on release); action `{ type: 'silenceAnchorAlarm' }`.
- `step`: `stepWindlass` before the external forces (4.3 step 2), `stepAnchor` after `stepBoat` (step 6).
- **URL** (after `ln`): `an=<chainOutM, 1 decimal>` when not stowed; `ax=<east>,<north>` (1 decimal) on the bottom; `as=1` when set. Parse: `an` with 0 < value ≤ `chainLengthM`; a valid `ax` (not `ap`, which is the autopilot's key) is used (→ `bottom`, or `set` with `as=1`) only if the water there is deeper than 0, `an ≥ D` there and the horizontal distance from the roller to it is at most `√(an² − D²)` + 1 m; otherwise the anchor opens `hanging`. Not stored: the windlass motion, `cutOut`, `draggedM`, `dragS`, `dragging`, `alarm`.

### 12.5 Sections, stations and modes

- `SECTION_IDS` gains `'anchor'` (after `'place'`, before Phase 6's `'harbour'`); `sectionAvailable('anchor')`: `settings.ropesMode === 'easy'`. `MODE_LAYOUTS` becomes the final table of 4.4.
- **Realistic mode:** `STATION_IDS = ['port', 'starboard', 'helm', 'mast', 'bow']`; the station bar gets "Bow" (`real.station.bow`). The Bow station shows the windlass panel (12.6, `createAnchorPanel(store, '-bow', false)`) and, in the bay, the `bl` line row (`createLineRow(store, 'bl', '-bow')`, 10.5); it has no winch-handle slot (a link with `hd=bow.…` is ignored, the handle stays where it was). The Helm station gets the windlass remote (`createAnchorPanel(store, '-helm', true)`: the two buttons and the counter only) under the thruster joysticks. The link key `st=bow` works as the other stations.

### 12.6 UI

**Anchor section** (`src/ui/anchorPanel.ts`, `createAnchorPanel(store, suffix = '', compact = false): HTMLElement[]`; `compact` leaves out items 3–6; every test id below gets the suffix):

1. Two hold buttons (3.1) `windlass-down` (`anchor.down`) and `windlass-up` (`anchor.up`), 44 px tall, side by side, `data-part-id="fit_anchor_windlass"` (`fit_windlass_remote` at the helm).
2. The chain counter `chain-counter`: `t('anchor.counter', { m: Math.round(chainOutM) })`, large digits (`font-size: 1.6rem`).
3. A status line `anchor-status`: `anchor.phase.<phase>`, then, when dragging, `anchor.dragging`; when cut out, `anchor.cutOut`.
4. The scope line `anchor-scope` (on the bottom or hanging): `t('anchor.scope', { depth, eff, ratio })` with `depth` = the water's depth used by `scopeNeededM` (1 decimal), `eff` = `depth + roller.y` and `ratio` = `chainOutM / eff` (1 decimal); and the check `anchor-check`: `chainOutM ≥ scopeNeededM` → `anchor.enough`, otherwise `t('anchor.more', { m: Math.ceil(needed − chainOutM), need: Math.round(needed) })`.
5. While `alarm`: `anchor-alarm` (`anchor.alarm`, red) with a button `alarm-silence` (`anchor.silence`) that dispatches `silenceAnchorAlarm`.
6. `p.explain` `anchor.hint`.

**Alert stack:** while `alarm`, an alert `anchor-alarm-alert` (red) with `anchor.alarm`.

**Map and mini-map:** the anchor as a ⚓ glyph at its position (on the bottom), a line from the bow to it, and a dashed circle of radius `√(max(0, chainOutM² − D²)) + loa` round it (where the boat can swing).

**3D** (`src/render3d/anchorChain.ts`, in the world group): the chain from `chainPoints` (24 points) as a dark grey tube of 0.03 m radius (at least the rope minimum width on screen); the anchor at the chain's end: Phase 6's anchor in the roller is part of the boat (`buildAnchor` in `src/render3d/boat/bowGear.ts`, built in boat coordinates, shackle at `deckFittings.anchor.shackle`), so M46 exports `buildAnchor`, hides the boat's anchor while `anchor.phase !== 'stowed'` (`BoatModel.setAnchorStowed(stowed: boolean)`, called by `scene.ts` on build and when the phase changes from or to `stowed`, as `setFendersOut`), and `anchorChain.ts` builds a second one with `buildAnchor` inside a group whose child is offset by `−shackle` (so the shackle is the group's origin), placed at the chain's last point and turned about the vertical so the crown points away from the boat (horizontally, along the chain's last segment), lying level; it carries `fit_anchor` and `anchorChain.object` joins the picker's extra roots (`createPicker(…, [marks.object, marina.object, …, anchorChain.object])`); the chain part under water is seen through the water as the keel is.

### 12.7 Strings and registry

Registry (`phase: 7`, `status: "draft"`, `sources: []`): `fit_windlass_remote` (`fitting`, `cockpit`, related `fit_anchor_windlass`), `term_scope` (`term`, `harbour`, related `fit_anchor_chain`, `fit_anchor`, `env_seabed`; `showMe` `?wd=90&ws=15&cam=top&pl=bay&pe=-1640.0&pn=0.0&hdg=90&an=34.0&ax=-1606.0,0.0&as=1`, canonical form, 3.7: the anchor 27 m ahead of the roller in 9.4 m of water, the chain hanging in a curve). `fit_anchor`, `fit_anchor_chain`, `fit_anchor_windlass` and `fit_bow_roller` keep the phase Phase 6 gave them; M46 adds `term_scope` to their `related`.

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
| `anchor.scope` | Depth {depth} m (with the roller {eff} m) · scope {ratio} : 1 | Глубина {depth} м (с роликом {eff} м) · цепь {ratio} : 1 |
| `real.station.bow` | Bow | Нос |
| `real.bow.hint` | At the bow: the windlass lets the anchor chain out and brings it in. Hold a button; let go to stop. | На носу: брашпиль травит и выбирает якорную цепь. Держите кнопку; отпустите, чтобы остановить. |
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
2. `holdingN`: set, sand, scope 5.0 (34 / 6.8), not lifted → 40·9.81·25·interp(5.0) (0.900) = 8,829 N (±1 %); unset → × 0.15; lifted → × 0.3.
3. `stepWindlass` (the flat 5 m environment; `D` = 6.8): down for 10 s from stowed → 5.0 m, `hanging`; on reaching 6.8 m → `bottom` straight below the roller; up with L 30 and the anchor 29.4 m from the roller (a pull of about 9,900 N) → `cutOut`; up from 10.0 m with the anchor on the bottom at the roller's own map position (no pull) → `bottom` until the chain passes 7.3 m (5 + 1.8 + 0.5), then `hanging` (7 s), and stowed at 0 (18 s more).
4. `scopeNeededM`: (5, 10) → 46.65; (15, 10) → 67.2; (5, 25) → 58.3 (= 27.2 + 31.1).
5. URL: `an=34.0&ax=-1606.0,0.0&as=1` with `pl=bay&pe=-1640.0&pn=0.0&hdg=90` round-trips; `an=5.0` alone → `hanging`; `ap=off` next to them is still the autopilot.

`tests/physicsTruths7.test.ts` (the boat at (0, 0) heading 10 in sailing mode, sails away, autopilot off, engine running in neutral; wind from 0; the anchor on the bottom at (0, 0.8·L) with chain `L`, phase `bottom`; the flat environment of 5 m; the gusty runs use wind mode `gusty`, seed 1, the default size; every PT-54 run is 25 kn gusty; `external` = `chainForces` only; `stepAnchor` runs once per frame; 300 s at 60 fps; prototype values in brackets):

- **PT-54** short scope drags: weed, L 20 (scope 2.9), 25 kn gusty: dragged [10, 30] m (19.3) and the alarm comes on; weed, L 47 (6.9): dragged less than 3 m (1.4); weed, L 34 (5.0): [1.5, 5] m (2.8).
- **PT-55** the bottom matters: sand, L 20, 25 kn gusty: dragged less than 2 m (1.1); rock, L 34, 15 kn, lever −60 from 30 s to 50 s: never `set`, dragged [4, 12] m (7.6).
- **PT-56** swings head to wind: sand, L 34, 15 kn steady: after 300 s `|wrap180(headingDeg − 0)|` ≤ 35° (24).
- **PT-57** setting by backing down: sand, L 34, 15 kn steady: without the engine still `bottom` (not set) after 300 s; with the lever at −40 from 30 s to 50 s: `set` by 120 s, dragged [1.0, 2.0] m (1.3).
- **PT-31** scope: `scopeNeededM` as test 4, and the Anchor section's check reads "Let out 13 m more" at 34 m in 5 m (needs 46.65 → 13).

### 12.9 Browser checks (`scripts/shots-m46.mjs`)

Helper `holdWindlass(page, dir, ms, suffix = '')` (3.6), on `windlass-<dir><suffix>`; for no suffix it first calls `showSection(page, 'anchor')`.

Scenes: `anchored-top` (the `term_scope` `showMe` link), `anchored-map` (the same with `cam=map`), `anchored-side` (`cam=side-port`: the chain into the water), `bow-station` (the same with `mode=realistic&st=bow`), `anchor-section` (the same with the Anchor section open).

Live checks:

1. `m46 let go`: `?pl=bay&m=harbour&pe=-1640.0&pn=0.0&hdg=270&wd=-90&ws=10&tx=4` (head to the west wind; she drifts back east, into deeper water): `holdWindlass(page, 'down', 3000)` (3 s of app time at ×4: 12 s, 6 m of chain; the roller is at east −1646.9, 5.3 m deep, plus the 1.80 m roller makes 7.1 m, so the anchor still hangs: `anchor-status` reads hanging), then `holdWindlass(page, 'down', 10000)`: `anchor-status` reads on the bottom; `waitForLink(page, ['an=', 'ap='])`.
2. `m46 check`: the `term_scope` link: `anchor-check` reads "Let out 13 m more".
3. `m46 bow station`: the `term_scope` link with `mode=realistic&st=bow`: the windlass buttons `windlass-down-bow` are there; the station bar's text is `Port|Starboard|Helm|Mast|Bow`.

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

New: `scripts/shots-m47.mjs`. Changed: `src/ui/harbourPanel.ts` (the hint, 13.2), `tests/physicsTruths7.test.ts` (13.4), `tests/stepCost.test.ts` (13.5), `scripts/shots-m47.mjs` calls `auditPage` from `scripts/a11y-audit.mjs` (unchanged), as `shots-m10.mjs` … `shots-m13.mjs` and `shots-m34.mjs` do (13.5), `scripts/shots.mjs` (register `shots-m47.mjs`), `.github/workflows/ci.yml` (the `live, M40-M47` part already lists `m47`; nothing to do unless the part was split), both `ui.json`, `docs/review/ru.md`, `README.md`, `docs/ROADMAP.md`, `docs/CODE_MAP.md`, `docs/PHYSICS_TRUTHS.md` (statuses, 13.6), `docs/BOAT_REFERENCE.md` (check every Phase 7 assumption is listed), this spec (section 15).

### 13.2 Stern-to with our own anchor

Two ways to lie stern-to with the anchor instead of a lazy line. Both already work with M44–M46; M47 only explains them and checks them:

1. **At the marina quay** (as at a town quay without lazy lines): drop the anchor three to four boat lengths off the berth (the chain must be at least `scopeNeededM`, 46.65 m in 5 m of water), reverse in letting the chain out, take the stern lines, then take in chain until it is tight. With 47 m of chain the anchor lies under the south row's berths or the pontoon: the app does not model other boats' chains or the pontoon's moorings, so crossing them is ignored. Taking in chain against the stern lines raises the pull quickly; when the windlass cuts out (8 kN) the chain is too tight: ease the stern lines a little or let out 1 m. No rule changes: the chain holds the bow as the lazy line did.
2. **In the bay with a shore line** (EXERCISES EX-B): anchor, back towards the shore, and take a shore line from the stern to a ring (M45).

The Harbour gear section shows a hint `p.explain` with `data-testid="mooring-anchor-hint"`, placed after `lines.hint`, when `anchor.phase` is `bottom` or `set` and a line is on: in the marina (a line among `sp`, `ss`) `mooring.sternToAnchor`; in the bay (an `sl` line) `mooring.anchorShore`.

### 13.3 Strings

| Key | English | Russian (draft) |
|---|---|---|
| `mooring.sternToAnchor` | Stern-to on your own anchor: the chain holds the bow as a lazy line would. Take in chain until it is tight, and keep the stern a step from the quay. | Кормой к причалу на своём якоре: цепь держит нос, как муринг. Выбирайте цепь втугую и держите корму в шаге от причала. |
| `mooring.anchorShore` | Anchor ahead, shore line astern: she cannot swing. Keep the shore line tight enough that the stern stays clear of the rocks. | Якорь впереди, береговой швартов сзади: лодку не разворачивает. Держите береговой швартов натянутым так, чтобы корма не касалась камней. |

### 13.4 Tests (`tests/physicsTruths7.test.ts`)

**PT-51** (second case) the anchor and a shore line hold her: the place is the bay; `harbourStart({ windDirDeg: 0, twsKn, headingDeg: 90 })` moved to `eastM = −1665`, `northM = 0` (sails away, engine stopped, autopilot off, flat water); the anchor `{ phase: 'set', chainOutM: 60, eastM: −1605, northM: 0, windlass: 'off', cutOut: false, draggedM: 0, dragS: 0, dragging: false, alarm: false }` (sand, 9.5 m deep); a shore line built directly as `{ code: 'sl', cleatId: 'cleat_stern_port', far: { eastM: −1700, northM: 0, heightM: 1.0 }, lengthM: d + 0.5, farIndex: 1 }` with `d` the 3D distance from the cleat to the ring when the test starts (the two stern cleats are equally far from ring 1; port wins the tie); the full `harbourForces` (ground included: the keel stays in more than 3 m of water and the rudder in more than 2.4 m); steady wind; 300 s at 60 fps; the largest heading deviation from 90 over the whole run (prototype values in brackets): 15 kn: at most 10° (4.6); 25 kn: at most 14° (9.0); without the shore line at 15 kn: more than 20° (31.7).

### 13.5 Checks, accessibility, frame rate

**Scenes** (`scripts/shots-m47.mjs`): `marina-anchor` (`?pl=marina&m=harbour&pe=2.8&pn=1490.4&hdg=180&ws=0&ln=sp:2.55,ss:2.55&an=48.0&ax=2.8,1442.0&as=1&cam=top`: stern lines on, the anchor ahead under the south row, the hint shown), `bay-anchor-shore` (`?pl=bay&m=harbour&pe=-1665.0&pn=0.0&hdg=90&wd=0&ws=15&an=60.0&ax=-1605.0,0.0&as=1&ln=sl1:28.08&cam=top`: anchored with a shore line), `harbour-heavy` (`?pl=marina&ml=tight&tr=busy&m=harbour&detail=high&cam=side-port`).

**Live checks:**

1. `m47 marina anchor`: the `marina-anchor` link: `mooring-anchor-hint` is visible after `showSection(page, 'harbour')`.
2. `m47 bay shore`: the `bay-anchor-shore` link with `tx=16`: after 5 s of app time the heading on the strip is between 080° and 100°.
3. `m47 keyboard`: the `harbour-mode` link of M41 with `tx=4`; focus `thruster-bow-starboard`, press Space down, wait 2 s (8 s on board at ×4: about 25° by PT-33's run; without `tx` 2 s on board turn her only about 2°), release: the heading has changed by 5° or more (the hold buttons work from the keyboard).

**Accessibility:** `auditPage` (`scripts/a11y-audit.mjs`) runs on: the M41 `harbour-mode` link with the Thrusters and Engine sections open; `?pl=marina&m=harbour` with the Place and Harbour gear sections open; the `bay-anchor-shore` link with the Anchor section open; the M46 `bow-station` scene; and the M41 `helm-thrusters` scene (from M46 it shows the windlass remote too).

**Model cost:** a new case in `tests/stepCost.test.ts`: `?pl=marina&ml=tight&tr=busy` state in the fairway with both thrusters +1, the time scale ×16, 300 frames of `dt` 0.1: the mean cost of one `step` stays below 6 ms (twice the existing case's 3 ms limit).

**Frame rate on the phone** (the owner, asked in the PR): the debug overlay's FPS and slowest frame in `harbour-heavy` with both thrusters held, and in `bay-anchor-shore` at Detail High. The target is the one of every sign-off since Phase 1 (ROADMAP decisions 2026-10-10): 50 fps or more, never below 30.

CI's `browser-checks` (the full set at phone size, in parallel parts) passes on the M47 PR; do not run the full set locally (CLAUDE.md: it takes over an hour), run `SHOTS_ONLY=m40,…,m47` and the groups of the files you changed.

### 13.6 Docs

- `README.md`: Harbour mode, places, the anchor in one paragraph.
- `docs/ROADMAP.md`: Phase 7 marked done when the owner writes "Phase 7 signed off"; the decisions log gets the PR's answers.
- `docs/PHYSICS_TRUTHS.md`: the Phase 7 rules (PT-27, 31, 33, 34, 47–57) were written by the planning PR; M47 re-opens each `to-verify` source once more and updates the status where the page now opens; any still `to-verify` is listed in the PR.
- `docs/CODE_MAP.md`: every Phase 7 file.

### 13.7 Done when

Every Phase 7 rule test passes; the model-cost test, the accessibility audit and the full browser checks pass; the owner has done on the phone a stern-to in the marina with the lazy line, the same with our own anchor, anchoring in the bay with a shore line, and a mooring buoy, and reported the frame rate.

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
- [ ] The model-cost test, the accessibility audit of 13.5 and CI's `browser-checks` (the full set at phone size) pass.
- [ ] The frame-rate check on the owner's phone in the heaviest cases (13.5).
- [ ] New Russian strings are drafts (status `draft`); the review document regenerated.
- [ ] `docs/BOAT_REFERENCE.md` lists every Phase 7 assumption and the skipper questions 18–21.

## 15. Decisions and open questions

### Owner's answers in the planning chat (2026-10-15)

1. Plan Phase 7 now, before Phases 5 and 6 are finished, with as little overlap as possible.
2. The spec is `docs/PHASE7_SPEC.md`; CLAUDE.md and the `/milestone` and `/review` skills read "the spec that contains your milestone", so a spec planned ahead does not confuse the builders of Phases 5 and 6.
3. Phase 7 milestones are M40–M47 (Phase 6 has M30–M34).
4. Phase 7 was to set what it needs from Phase 6 (a contract in BOAT_DETAILS_ANALYSIS section 6). The Phase 6 plan (`PHASE6_SPEC.md`) was merged first, so on 2026-10-16 this spec was aligned with PHASE6_SPEC's names and numbers instead (4.1: the Harbour gear section, `HarbourState`, the cleats, fenders and roller) and the contract was withdrawn; the bands that depend on those points were prototyped again. A refresh check before M40 compares this spec with what Phases 5 and 6 built.
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

- The low-speed effects fade out with speed (6.2: the steering grip is full from 1 kn ahead and 5 kn astern, the side wind gone from 2 kn, prop walk and prop wash from 4 kn), so sailing is unchanged; prototyped against the whole test suite.
- The stern thruster is a pod under the hull (the hull is too shallow aft for a tunnel).
- The marina and the bay are made-up places in the Adriatic area file, not copies of real ones.
- Choosing the marina sets the waves to Flat and the bay to Sheltered (a normal settings change the learner can undo).

### Refresh (before M40)

**2026-10-16, after M34 (Phase 6 built), `/plan 7 refresh`.** Compared sections 3–4, every "Phase 5 provides" and "Phase 6 provides" line and each milestone's code references with the code and data as built (`src/ui/modes.ts`, `sections.ts`, `panel.ts`, `quickRow.ts`, `modeChip.ts`, `miniMap.ts`, `mapView.ts`, `harbourPanel.ts`, `src/model/harbour.ts`, `mooringFittings.ts`, `motion.ts`, `src/app/store.ts`, `urlState.ts`, `urlSync.ts`, `src/render3d/scene.ts`, `boat/index.ts`, `boat/bowGear.ts`, `marks.ts`, `deckFittings` in the boat file, the registry, `scripts/shots.mjs`, `scripts/ui.mjs`, `ci.yml`, `tests/glossary.test.ts`, `tests/modes.test.ts`).

**Unchanged (checked):** every name, signature, test id and link key of 4.1 that Phase 6 provides; every number that depends on Phase 6 (the six cleat points, the eight fender stations and the ball fender, the roller point (6.92, 1.80, 0.20), the 42 deck-edge points, `transomX`, `bowFittingTipX`, the rudder and saildrive), recomputed with `cleatPlaces()`, `fenderPlaces()` and `ballFenderPlace()`; `stepBoat` and every input of the M40 formulas (no change to `motion.ts`, `engine.ts`, `hullResistance.ts`, `apparentWind.ts` or the physics data since the prototype), so **no prototype was re-run and no band changes**; `SECTION_IDS`, `MODE_LAYOUTS` and `sectionAvailable` as 4.4 expects; the URL order (`m` after `cam`, `engineParams` then `clockParams`, `fd` after the clock keys); `STATION_IDS`, `noClutches`, `leverText` (still private); the M40 and M41 Show me links round-trip with today's serializer (`sel=part_bow_thruster` once the id is registered). The test suite has 803 tests after M34 (741 when M40 was prototyped); none of the Phase 6 tests steps the boat. The 25 kg anchor drawn by Phase 6 against the 40 kg used for holding is already recorded in BOAT_REFERENCE section 5 (question 19 settles both).

**Changed:**

1. **Browser checks run on the test clock** (3.6; CLAUDE.md's rule from 2026-10-15, which the plan did not follow): Phase 7 live groups use `onTestClock`; "real time" waits are now app time; the helpers hold for app time.
2. **`openPage` label tests** (3.6): the four regular expressions written out as they are today and as they become.
3. **CI part** (3.6): `live, M40-M47` with its exact `env`, and the catch-all part is `live, M30 on` (the old `live, M18 on` was split in the M39 PR; Phase 5 got no part of its own, so "as M25 did" was wrong).
4. **Counts in `shots-m24.mjs`** (3.7): today's numbers (136, 10, 63) and the group count, which M42 changes, are taken from the registry too.
5. **Learn test 11 (`NOT_DRAWN`)** (3.7, 10.5, 11.5): every non-term id must appear in the code; the quay rings carry `env_quay_ring` from M44, and a tap on a rock's chart symbol gives `env_rock` (M45). Without this, M44 and M45 would fail that test.
6. **Harbour mode in the code** (4.4): the files and conditions that decide the mode today (`initialState`, `setRopesMode`, `setAppMode`, the panel's selection rule, `quickRow` `render`, `openScene`, the Practice button in `realisticPanel.ts`).
7. **Thrusters in 3D** (7.1, 7.6, 4.5): `BoatModel.setThrusters`, called by `scene.ts` on change, as Phase 6's `setFendersOut`, instead of a seventh argument to `BoatModel.update`.
8. **Debug overlay string** (6.3): `debug.lowSpeed` is "Low speed" in both languages (the overlay stays English, ROADMAP 2026-10-14).
9. **Map** (8.6, 11.5, 12.1, 4.5): the mini-map is drawn by `drawMiniMap` in `mapView.ts` (`miniMap.ts` does not change); `drawHarbour` and `drawSeabed` go after `drawWindField`; the `__sailMap` hook already exists, only with `debug=1`, and gains `toScreen`; the `m42 choose` check opens with `debug=1` and taps the quay at (−60, 1507), which is on a phone screen at 0.5 m per pixel (east 0 was at its edge).
10. **3D visibility** (8.6, 11.5): each marina and bay mesh is hidden itself (the raycaster ignores a hidden parent, as `marks.ts` notes), and the bay's objects join the picker's roots.
11. **The anchor in 3D** (12.1, 12.6): Phase 6's anchor is part of the boat, in boat coordinates; M46 hides it while not stowed (`BoatModel.setAnchorStowed`) and draws a second one with the exported `buildAnchor` at the chain's end.
12. **Mooring-line colour** (10.5): `#56b4e9` instead of `#2f6db5`, which was almost the furling lines' blue (`#0072b2`).
13. **`m47 keyboard`** (13.5): the link gets `tx=4` (2 s on board turns her only about 2°, the check wants 5°).
14. **Sign-off checks** (13.1, 13.5, 14): the accessibility audit is called from `shots-m47.mjs` (no change to `a11y-audit.mjs`), and the full set of browser checks is CI's `browser-checks`, not a local run (CLAUDE.md).
15. **Small text fixes:** `mode.harbour.hint` ends with a full stop like the other mode hints; the `m43 lost` check polls (the alert lasts 0.5 s at ×16) and also reads `fenders-status`; WORKFLOW section 12: its heading number, the anchor keys (`an`, `ax`, `as`, not `ap`, which is the autopilot), and the M43 "fenders left out" link at ×4 so the alert can be read.

**2026-10-17, after M38 (extra milestones M35 to M38, written by the M38 PR).** `modes.ts` changed after the refresh above, and the tables in 4.x, 7.5 and the M42 and M43 sections were written before: (1) M35 removed the `open` and `openSide` lists (every section starts folded, one open at a time per column), so read those two columns as gone; (2) M38 removed the `legend` section (read every `order` without `legend`; Harbour's `order` also ends one entry earlier) and added two sections that exist only on the wide layout: `mode` is the **first** and `settings` the **last** entry of every mode's `order` (Harbour's too), neither in `second`. A new entry in the Mode picker is one more entry in `APP_MODES` (`src/app/appMode.ts`) with its strings `mode.harbour`, `mode.harbour.hint` and `mode.harbour.desc`; both the chip's menu and the Mode section (`src/ui/modeSection.ts`) read that list. A place chooser or a harbour setting that belongs to Settings goes into `buildSettingsBody` (`src/ui/settingsMenu.ts`), which serves the dialog and the Settings section. The mini-map is in the bottom-left corner and the View button in the bottom-right one on the wide layout (the Place chooser's map layer follows the mini-map). Run `/plan 7 refresh` again before M40 if the owner wants every table rewritten; nothing else in this spec depends on these changes.

### Open

1. **Issues #79 and #80 (opened on 2026-10-16) and Phase 7.** #79 asks for every section folded at the start and only one open at a time; #80 asks for a notification centre that keeps the history of alerts. Phase 7 adds three sections and the Harbour mode's open sections (4.4), and four kinds of short alerts (damage, fender lost, line in the propeller, anchor alarm; at ×16 an 8-second alert shows for half a second). As written, Phase 7 puts its alerts in today's alert stack (`.rig-alerts` in `windIndicator.ts`) and opens sections as 4.4 says. If #79 or #80 is built first, its plan updates 4.4, 9.6 and 12.6 of this spec so Phase 7 follows the new rule. **Update (2026-10-17):** #79 was built as M35 and #80 as M36 (PHASE5_SPEC 13 and 14). Phase 7's four alerts therefore also go into the alert history: each adds one kind to `src/model/alerts.ts` (see PHASE5_SPEC 14, "Phase 7"); they still also show in the alert stack as written in 9.6 and 12.6. Original recommendation: build #80 and #79 before M40 (`/plan issue 80`, then `/plan issue 79`, each a small extra milestone), because Phase 7 adds exactly the kind of alerts that are missed today, and building the pattern first avoids changing Phase 7's sections and alerts afterwards.
