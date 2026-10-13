# Phase 3 specification: basic environment

Status: **planned** (owner's answers recorded 2026-10-13) · Last updated: 2026-10-13

Read [`ROADMAP.md`](ROADMAP.md) first, then this file. Phases 1 and 2 are done; [`PHASE1_SPEC.md`](PHASE1_SPEC.md) and [`PHASE2_SPEC.md`](PHASE2_SPEC.md) still describe everything Phase 3 builds on (layout, rig solver, boat motion, heel, wind modes, time bar, URL state). This file says only what Phase 3 adds or changes. Boat facts: [`BOAT_REFERENCE.md`](BOAT_REFERENCE.md) and [`content/boat/hanse508.json`](../content/boat/hanse508.json). Behaviour rules: [`PHYSICS_TRUTHS.md`](PHYSICS_TRUTHS.md).

## 0. How to use this spec (for the coding agent)

- Do **one milestone** (sections 6–11), on the branch your session gives you, in one PR titled `M<N>: <name>`. Read sections 0–5 first every time; they apply to all milestones. Then read only your milestone's section.
- Build order inside a milestone: data → model + tests → store/URL → UI → 3D → browser checks. Milestones are built in order (M14 → M19); each needs the ones before it merged.
- **Numbers.** Every number in a data block is the value to use. The wave model, the boat's response and the feedback were prototyped with these exact formulas and values against the real Phase 2 model (`src/model`, 2026-10-13). The test bands come from that prototype (prototype value in brackets). If a band fails, first re-check your code against the formulas and section 3.4 (common mistakes). Only if the formulas are implemented exactly and a band still fails may you tune the keys your milestone marks **tunable**, and you must say so in the PR with the before/after numbers. **Never widen a test band** to make it pass.
- **Signatures.** Function names and signatures are given so that milestones fit together. Keep them. Add private helpers freely.
- **Write back.** If you decide something this spec leaves open, write it into your milestone's section under "Decided in the M<N> PR".
- **Phases 1 and 2 must keep working.** All existing tests stay green. An existing test may only be changed where your milestone section says so, and only in the way it says.
- Sailing terms in UI text get a short explanation the first time they appear on a screen (CLAUDE.md).

## 1. Goal

The sea becomes real enough to learn from, and the day has a time.

The idea Phase 3 must teach:

> **Waves come from the wind, and they move the boat.** The stronger the wind and the longer the stretch of open water it blows over, the bigger the waves. The boat rises and falls (heave), tips nose up and down (pitch) and rolls side to side. That rocking swings the wind the sails feel, so they flick; waves from behind at an angle knock the bow off course, so the helm keeps correcting; waves from ahead slow her down.

## 2. Scope

### In scope (Phase 3)

1. **Waves** (M14): three wave trains sized by the wind and the fetch (how far the wind has blown over open water), from a Wind-tab setting `Flat / Sheltered / Coastal / Open sea` (default Coastal, also for old links; owner). They build and fade over minutes, not with each gust (owner). The boat heaves, pitches and rolls on them, true to size (owner). Pause freezes the water and the wind streaks (issue #32).
2. **Feedback** (M15): the rocking moves the sails through the air (the apparent wind at the sails swings), waves knock the bow off course, head seas slow her.
3. **Wind on the water** (M16): the water darkens with the wind, white horses (whitecaps) from Beaufort 3, and in gusty wind **a gust shows as a dark patch upwind before it arrives** (owner). Four yellow buoys as fixed marks, in 3D and on the map (owner). Water out to the horizon.
4. **Sailing area and clock** (M17, issue #26): the Adriatic as a data file loaded by id (ROADMAP architecture hook), the reference point Split (owner); a clock and date over the 3D view that folds; start time now, custom or the default (noon, 1 June); sunrise and sunset; the sun lights the boat from the right side.
5. **Sky through the day** (M18): sky colours, sun glow and light for day, low sun, twilight and night with stars; night stays readable, as in moonlight (owner).
6. **Polish and sign-off** (M19).

### Out of scope

- Land, harbours, depth, currents, tides, collisions (the boat sails through the buoys), anchor, thrusters, fenders (Phase 5).
- Winds that follow the clock (Maestral sea breeze), scripted wind, exercises (Phase 6). Time scales faster than ×16 (Phase 6, owner 2026-10-12).
- Navigation lights and rules of the road (later "Navigation" module, owner). Swell from a distant storm (waves come from the local wind only). Breaking waves, spray, the boat's own bow wave, water on deck, seasickness.
- Waves in shallow water (the model is for deep water). The camera does not ride the waves (as it does not heel since M8).
- Issues **#33** (wind slider in changing wind) and **#34** (Pause button in Held still): fixed with `/bug` before M14, not in this phase (owner).

If something here looks necessary, stop and ask in the PR.

## 3. Conventions and shared helpers

### 3.1 Conventions (new; everything in PHASE1_SPEC 4 and PHASE2_SPEC 3.1 still holds)

| Topic | Convention |
|---|---|
| Wave direction | `SeaState.dirDeg`, the compass direction the waves **come from**, stored signed in (−180, 180] like `ctl_wind_dir`. The main train comes from `dirDeg`; the others from `dirDeg + dirOffsetDeg`. A train **travels towards** the bearing `fromDeg + 180`. |
| Map offset | `(ΔE, ΔN)`: metres east and north of the boat's current position (`boat.eastM`, `boat.northM`). Wave heights are always evaluated at map offsets from the boat (section 6.3, "phase at the boat"). |
| Elevation | `η` (eta), metres above the calm waterline (y = 0), + = up. |
| Heave | `waves.heaveM`, + = the boat is lifted. In three.js: the boat holder's `position.y`. |
| Pitch | `waves.pitchDeg`, **+ = bow up**. In three.js: the holder's `rotation.z = pitchDeg · DEG` (a positive turn about +z moves +x, the bow, towards +y). |
| Wave roll | `waves.rollDeg`, same sign as heel: **+ = starboard rail down**. The boat is drawn at heel + wave roll: `rotation.x = (heelDeg + rollDeg) · DEG`. The sails' heel factor (cos², M8) uses `heelDeg` only. |
| Euler order | The holder keeps three.js's default order `'XYZ'`: `holder.rotation.set(rollRad, 0, pitchRad)`. |
| Time | `step` stays the only clock: waves, buoys, streaks, ripples and the on-board clock all advance with the simulated `dt` (×16 speeds them up; paused, they stand still). Nothing in `src/render3d` reads `performance.now()` or the frame time for motion; the camera's preset transition (`cameraRig.ts`) is the one exception. |
| On-board clock | `AppState.clock.utcMs`, milliseconds since 1970-01-01 UTC. Shown in the area's local time (CET/CEST for the Adriatic). |
| Sun | `elevationDeg` above the horizon (no refraction), `azimuthDeg` compass, 0 = north, clockwise. |
| Units | Metres, seconds, degrees in the data and the state; radians only inside formulas; knots in the UI and in `ctl_wind_speed`. Wind speed in the wave formulas is in m/s (`knToMps`). |
| Tuning | Wave and sea values live in `hanse508.json` (top-level `waves`, like `windModes`; the boat's response in `physics.waveResponse` and `physics.waveFeedback`). Place values (position, time zone, fetch, buoys, default clock) live in the area file `content/areas/adriatic.json`. Presentation (mesh sizes, colours, fog, sky colours) lives in `src/render3d/sceneConfig.ts`. |

### 3.2 Shared helpers

`src/model/mapFrame.ts` gains the inverse of `mapToBoat` (M14):

```ts
/** A point in the boat frame (x forward, z starboard) as a map offset (east, north). */
export function boatToMap(xM: number, zM: number, headingDeg: number): [east: number, north: number] {
  const h = headingDeg * DEG;
  return [xM * Math.sin(h) + zM * Math.cos(h), xM * Math.cos(h) - zM * Math.sin(h)];
}
```

Check: heading 90, x = 1 → `[1, 0]` (east). Heading 0, z = 1 → `[1, 0]`. `mapToBoat(...boatToMap(x, z, h), h)` returns `[x, z]`.

`src/model/angles.ts` gains (M14):

```ts
/** 0 below edge0, 1 above edge1, smooth (3t² − 2t³) between. Same as boomSolver's. */
export function smoothstep(edge0: number, edge1: number, x: number): number;
/** First-order lag over dt: value + (target − value)·(1 − e^(−dt/tau)). tau ≤ 0 → target. dt = 0 → value. */
export function lagTowards(value: number, target: number, dt: number, tau: number): number;
```

`boomSolver.ts` keeps its own `smoothstep` export (re-export the new one from it so nothing else changes).

### 3.3 Sources

Rules in PHYSICS_TRUTHS for Phase 3 (PT-39 … PT-46) carry their sources; statuses were set when this plan was written (sources read 2026-10-13). A milestone that implements a rule does not need to re-read a `source-checked` source; it reads the candidate sources of `to-verify` rules and changes the status only if a source supports the rule. Model constants are **assumptions**: each milestone adds one row per new data key to `BOAT_REFERENCE.md` section 5 (the planning PR already added the Phase 3 rows; update them if you tune).

### 3.4 Common mistakes (check these first when a test fails)

- **Wave direction:** `dirDeg` is where waves come **from**; they travel towards `fromDeg + 180`. The travel unit vector is `(dirEast, dirNorth) = (sin(to), cos(to))` (east first).
- **Phase at the boat** (6.3): the phase advances by `(k·(d·v) − ω)·h`, with the boat's map velocity `v`. Forgetting `k·(d·v)` makes the waves travel with the boat (wrong encounter period).
- **Map axes in three.js:** the world group's local **x is north and z is east** (PHASE2_SPEC 6.6). A vertex at local `(x, z)` is at map offset `ΔN = shift.x + x`, `ΔE = shift.z + z`.
- **Roll sign:** water higher on the starboard side lifts the starboard side: heel **negative** (port rail down).
- **Lag with h = 0** (paused): return the state unchanged; never divide by `h` to get a rate when `h` is 0.
- **Degrees vs radians** in `atan`, `sin`, `cos`; the sun formulas mix both (6.3, 9.3): convert at every trig call.
- **Flat must be Phase 2 exactly:** with `setting: 'flat'` (no trains) nothing may differ from Phase 2: no rig velocity, no extra resistance, no yaw push.
- **Time zones:** keep `utcMs` in the state; convert to local time only for display and the link. Never use the device's time zone (`Date#getHours`, `toLocaleString`): use `localParts` (9.3).
- A substep loop uses the substep `h`, not the frame `dt`.

## 4. Architecture

### 4.1 New state

```ts
// src/model/waves.ts (M14)
export type SeaSetting = 'flat' | 'sheltered' | 'coastal' | 'open';
export interface SeaState {
  setting: SeaSetting;
  /** The wind the waves are made by: the true wind speed, lagged by `waves.buildTimeS`, knots. */
  windKn: number;
  /** Where the waves come from: the true wind direction, lagged the same way; signed, (−180, 180]. */
  dirDeg: number;
}

// src/model/waveMotion.ts (M14)
export interface WaveMotion {
  /** Phase of each train at the boat's position, radians in [0, 2π); one per `waves.trains` row. */
  phases: number[];
  heaveM: number; heaveRateMps: number;
  pitchDeg: number; pitchRateDegS: number;
  rollDeg: number; rollRateDegS: number;
}

// src/model/clock.ts (M17)
export interface ClockState { utcMs: number }
```

- `AppState.sea: SeaState` (M14).
- `BoatState.waves: WaveMotion` (M14). `initialBoat()` fills it with `initialWaveMotion()`.
- `AppState.clock: ClockState` and `Settings.clock: boolean` (the clock shown; M17).
- `InitialOverrides` gains `sea?: SeaSetting` (M14) and `clockUtcMs?: number` (M17).
- **Default sea:** `initialState()` without `sea` gives **`'flat'`**, so every Phase 1 and Phase 2 test that builds a state is unchanged. The app's default is `waves.defaultSetting` (`'coastal'`): `parseUrlState` passes it when the link has no `sea`, and `reset` passes it.

### 4.2 Order of work in the store's `step` action (from M14; M15 additions marked)

1. `frame`, `dt` as now (`dt = 0` while paused; × time scale).
2. The true wind now: `wind = windNow(...)` as now.
3. **Sea** (M14): `sea = stepSea(state.sea, wind, dt)`; `trains = waveTrains(sea)`.
4. **Clock** (M17): `clock = { utcMs: state.clock.utcMs + dt · 1000 }`.
5. Autopilot, Realistic mode, engine: as now.
6. Rig: `step(..., motionOf(state.boat), ...)` as now. **M15:** while Sailing, `motionOf` adds the sails' motion from the rocking (7.3): `velocity = [speedMps + forwardMps, 0, sideMps]`. Held still: `velocity = [0, 0, 0]`.
7. Boat: `stepBoat(state.boat, { ...inputs, trains }, dt)`: in each substep the wave motion first (M14), then the Phase 2 physics (M15 adds the feedback in it). Held still runs the wave motion only.
8. Track, flogging damage as now. Return the new `sea` (and `clock`).

**Held still** (owner): the boat bobs on the waves (heave, pitch, roll drawn), but nothing feeds back: the rig gets `velocity [0, 0, 0]`, exactly Phase 1.

### 4.3 Files added in Phase 3 (by milestone)

| Milestone | Model (`src/model/`) | UI / 3D / content |
|---|---|---|
| M14 | `waves.ts`, `waveMotion.ts`, `area.ts` | `content/areas/adriatic.json`, `render3d/waterSurface.ts` (replaces `buildWater` in `scene.ts`), `ui/wavesPanel.ts` |
| M15 | (changes: `waveMotion.ts`, `motion.ts`, `apparentWind.ts`, `sim.ts`) | (changes only) |
| M16 | `windOnWater.ts` | `render3d/marks.ts` |
| M17 | `clock.ts`, `sun.ts` | `render3d/daylight.ts`, `ui/clockPanel.ts` |
| M18 | — | `render3d/skyDome.ts`, `render3d/skyColours.ts` |
| M19 | — | (changes only) |

Tests go in `tests/` (flat): `tests/waves.test.ts`, `tests/waveFeedback.test.ts`, `tests/windOnWater.test.ts`, `tests/clock.test.ts`, `tests/sun.test.ts`; physics-truth tests are named after their id (`it('PT-39 …')`) and live in `tests/physicsTruths3.test.ts`.

## 5. Milestones overview

Each milestone is one PR, small enough to check on a phone in 15 minutes. **Independent review: required** means the owner runs `/review <PR>` (new Code session, Opus, high effort) as soon as the PR opens, before testing it on the phone.

| Milestone | Section | What the owner sees | Rules tested | Depends on | Independent review |
|---|---|---|---|---|---|
| M14 | 6 | Waves sized by the wind and the Waves setting; the boat rides them; Pause freezes the water (#32) | PT-39, PT-40 | Phase 2 | **required** (new wave model, new shared state, step order and URL key) |
| M15 | 7 | The sails flick, the autopilot works harder in waves from behind, head seas slow her | PT-41, PT-42, PT-43 | M14 | **required** (changes the boat's physics) |
| M16 | 8 | Darker water in wind, white horses, gusts visible upwind, four buoys, the horizon | PT-44, PT-45 | M15 | not needed (visuals; the gust preview reuses `windAt` unchanged) |
| M17 | 9 | Clock and date chip (#26), sunrise/sunset, the sun's light from the right side | PT-46 | M16 | **required** (new shared state, URL keys and time/sun formulas) |
| M18 | 10 | Sky colours for day, sunset, twilight, night with stars | (display) | M17 | not needed (visuals) |
| M19 | 11 | Frame rate on the phone, accessibility, docs, sign-off | all | M18 | not needed (polish) |

---

## 6. M14: Waves

**Independent review: required** (new wave model, new shared state in the store's step, a new URL key and a changed default for old links).

### 6.1 Files

New: `content/areas/adriatic.json`, `src/model/area.ts`, `src/model/waves.ts`, `src/model/waveMotion.ts`, `src/render3d/waterSurface.ts`, `src/ui/wavesPanel.ts`, `tests/waves.test.ts`, `tests/physicsTruths3.test.ts`, `scripts/shots-m14.mjs`.
Changed: `content/boat/hanse508.json` (top-level `waves`, `physics.waveResponse`), `src/model/angles.ts` and `src/model/boomSolver.ts` (3.2), `src/model/mapFrame.ts` (`boatToMap`), `src/model/motion.ts` (`BoatState.waves`, `stepBoat`), `src/app/store.ts`, `src/app/urlState.ts`, `src/render3d/scene.ts`, `src/render3d/world.ts`, `src/render3d/wake.ts`, `src/render3d/picking.ts` (only the water target it is given), `src/render3d/sceneConfig.ts`, `src/ui/windPanel.ts`, `src/ui/debugOverlay.ts`, `content/i18n/en.json`, `content/registry/parts.json`, `scripts/shots.mjs`, `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md`.

### 6.2 Data

**The area file** `content/areas/adriatic.json` (new; M16 adds `marks`, M17 adds `clock`):

```json
{
  "$comment": "Sailing area (ROADMAP architecture hook 'Sailing areas as data'): loaded by id, no area names or numbers in code. PHASE3_SPEC 6.2. Other areas later = other files with the same keys.",
  "id": "adriatic",
  "names": { "en": "Adriatic (Split)", "ru": "Адриатика (Сплит)" },
  "namesStatus": { "en": "draft", "ru": "draft" },
  "position": {
    "latitudeDeg": 43.508,
    "longitudeDeg": 16.44,
    "source": "Split harbour, read off a map (owner, Phase 3 plan: Split is the reference point). Sunrise and sunset differ by only a few minutes along the Croatian coast."
  },
  "timeZone": {
    "name": "Europe/Zagreb",
    "standardOffsetMin": 60,
    "summerOffsetMin": 120,
    "standardAbbreviation": "CET",
    "summerAbbreviation": "CEST",
    "summerTime": "EU",
    "source": "Wikipedia, Summer time in Europe: EU summer time runs from 01:00 UTC on the last Sunday in March to 01:00 UTC on the last Sunday in October; Croatia is on CET (UTC+1) / CEST (UTC+2)."
  },
  "sea": {
    "fetchKm": { "flat": 0, "sheltered": 5, "coastal": 30, "open": 150 },
    "fetchNote": "assumption: how far the wind blows over open water before it reaches the boat. Sheltered: a bay or a channel between islands; coastal: along the Croatian coast and between the outer islands; open: the open Adriatic (it is about 150–200 km wide)."
  }
}
```

`src/model/area.ts`:

```ts
import adriatic from '../../content/areas/adriatic.json';
/** A sailing area's data (content/areas/<id>.json). */
export type AreaData = typeof adriatic;
export const AREAS: Readonly<Record<string, AreaData>> = { adriatic };
export const DEFAULT_AREA_ID = 'adriatic';
/** The area in use (the only one in Phase 3). */
export const area: AreaData = adriatic;
```

**`hanse508.json`**, new top-level key `waves` (next to `windModes`):

```json
"waves": {
  "$comment": "PHASE3_SPEC 6 (M14). Wind waves as three wave trains sized by the wind and the fetch (content/areas/<id>.json sea.fetchKm). Growth: JONSWAP fetch-limited formulas capped at a fully developed sea (PHYSICS_TRUTHS PT-39). The trains, their weights and phases and the build-up time are teaching assumptions (BOAT_REFERENCE section 5).",
  "settings": ["flat", "sheltered", "coastal", "open"],
  "defaultSetting": "coastal",
  "growth": {
    "heightCoefficient": 0.0016,
    "periodCoefficient": 0.286,
    "fullyDevelopedHeight": 0.2433,
    "fullyDevelopedPeriod": 8.134,
    "source": "JONSWAP fetch-limited growth, g·Hs/U² = 0.0016·(g·F/U²)^0.5 and g·Tp/U = 0.286·(g·F/U²)^(1/3), capped at the Pierson-Moskowitz fully developed sea (0.2433 and 8.134), as given in the US Army Corps of Engineers Shore Protection Manual and Coastal Engineering Manual (to-verify: not reachable from the cloud environment). U = wind speed (m/s), F = fetch (m)."
  },
  "minPeriodS": 1,
  "minHeightM": 0.02,
  "buildTimeS": 180,
  "buildNote": "assumption: the waves follow the wind with a 3-minute time constant, so a gust (about 10 s) hardly changes them and a building wind (10 min) grows them visibly. Real waves take hours to reach their full size (Wikipedia, Wind wave); shortened for teaching (owner, Phase 3 plan).",
  "trains": [
    { "periodFactor": 1, "dirOffsetDeg": 0, "weight": 1, "phaseRad": 0 },
    { "periodFactor": 0.8, "dirOffsetDeg": 25, "weight": 0.6, "phaseRad": 2.1 },
    { "periodFactor": 0.65, "dirOffsetDeg": -35, "weight": 0.4, "phaseRad": 4.2 }
  ],
  "trainsNote": "assumption: a main train from the wind's direction at the peak period and two shorter, smaller trains from 25° and 35° either side, so the sea looks irregular. Amplitudes are scaled so that the significant wave height of the sum (4 × its standard deviation) equals the formula's height."
}
```

**`hanse508.json` → `physics.waveResponse`** (new):

```json
"waveResponse": {
  "$comment": "PHASE3_SPEC 6.3 (M14). How the boat follows the water: the surface height is sampled along the waterline and across the beam; heave, pitch and roll follow the samples with a lag. Assumptions (BOAT_REFERENCE section 5).",
  "sampleFractions": [-0.4, -0.2, 0, 0.2, 0.4],
  "sampleNote": "assumption: five points along the centreline at these fractions of the waterline length either side of the waterline's middle; a wave shorter than the boat is averaged out",
  "rollSampleBeamFraction": 0.4,
  "heaveFollow": 1,
  "pitchFollow": 1,
  "rollFollow": 1,
  "heaveLagS": 0.5,
  "pitchLagS": 0.5,
  "rollLagS": 0.5,
  "lagNote": "assumption: the hull's inertia as a 0.5 s first-order lag behind the water; true to size (owner: not exaggerated)"
}
```

**Tunable in M14** (only if a band in 6.9 fails after an exact implementation): `heaveLagS`, `pitchLagS`, `rollLagS` (the same value for all three).

### 6.3 Model

**Constants.** `g = physics.constants.gravityMps2`. `LWL = dimensions.lwl`. `xC = (hull.waterline.fwdX + hull.waterline.aftX) / 2` (−0.57 m, the waterline's middle). `zS = rollSampleBeamFraction · dimensions.beam` (1.9 m).

`src/model/waves.ts`:

```ts
export interface SeaSize { heightM: number; periodS: number; wavelengthM: number }
export interface WaveTrain {
  amplitudeM: number;
  periodS: number;
  /** Angular frequency 2π/T (rad/s) and wave number ω²/g (rad/m). */
  omega: number;
  k: number;
  /** Compass direction the train comes from, signed (−180, 180]. */
  fromDeg: number;
  /** Unit vector of travel (towards fromDeg + 180): east and north components. */
  dirEast: number;
  dirNorth: number;
}
export function isSeaSetting(value: string): value is SeaSetting;
/** The area's fetch for a setting, km (`flat` → 0). */
export function fetchKm(setting: SeaSetting, areaData: AreaData = area): number;
export function seaSize(windKn: number, fetchKm: number, data: BoatData = boat): SeaSize;
export function waveTrains(sea: SeaState, data: BoatData = boat, areaData: AreaData = area): WaveTrain[];
/** The significant wave height of a set of trains: 2√2 · √(Σ a²). 0 for none. */
export function significantHeightM(trains: readonly WaveTrain[]): number;
export function initialSea(setting: SeaSetting, wind: { dirDeg: number; twsKn: number }): SeaState;
export function stepSea(sea: SeaState, wind: { dirDeg: number; twsKn: number }, dt: number, data: BoatData = boat): SeaState;
export function setSeaSetting(sea: SeaState, setting: SeaSetting): SeaState;
/** Surface height at a map offset (ΔE, ΔN) from the boat, with the trains' phases at the boat. */
export function elevation(trains: readonly WaveTrain[], phases: readonly number[], dEastM: number, dNorthM: number): number;
/** Height and its slopes ∂η/∂E, ∂η/∂N at a map offset (for the 3D normals). */
export function elevationAndSlope(trains: readonly WaveTrain[], phases: readonly number[], dEastM: number, dNorthM: number): { eta: number; dEast: number; dNorth: number };
```

- `seaSize(windKn, F)`: `U = knToMps(windKn)`. If `F ≤ 0` or `U < 0.1`: `{ heightM: 0, periodS: minPeriodS, wavelengthM: g·minPeriodS²/(2π) }`. Else `X = g · F·1000 / U²`; `heightM = min(heightCoefficient·√X, fullyDevelopedHeight) · U²/g`; `periodS = max(minPeriodS, min(periodCoefficient·∛X, fullyDevelopedPeriod) · U/g)`; `wavelengthM = g·periodS²/(2π)` (deep water).
- `waveTrains(sea)`: `F = fetchKm(sea.setting)`; `{ heightM: Hs, periodS: Tp } = seaSize(sea.windKn, F)`. If `Hs < minHeightM`: `[]`. Else `norm = 2√2 · √(Σ weight²)`, and for each row `i` of `waves.trains`: `amplitudeM = weight·Hs/norm`, `periodS = Tp·periodFactor`, `omega = 2π/periodS`, `k = omega²/g`, `fromDeg = wrap180(sea.dirDeg + dirOffsetDeg)`, `to = (fromDeg + 180)·DEG`, `dirEast = sin(to)`, `dirNorth = cos(to)`. Then `significantHeightM(trains) = Hs`.
- `elevation(trains, phases, ΔE, ΔN) = Σ aᵢ · cos(phasesᵢ + kᵢ·(dirEastᵢ·ΔE + dirNorthᵢ·ΔN))`. `elevationAndSlope` also returns `dEast = −Σ aᵢ·kᵢ·dirEastᵢ·sin(argᵢ)` and `dNorth = −Σ aᵢ·kᵢ·dirNorthᵢ·sin(argᵢ)`.
- `initialSea(setting, wind)`: `{ setting, windKn: wind.twsKn, dirDeg: wind.dirDeg }` (a link opens with waves already matching its wind; owner).
- `stepSea(sea, wind, dt)`: `dt === 0` → return `sea` (same object). Else `windKn = lagTowards(sea.windKn, wind.twsKn, dt, buildTimeS)`; `dirDeg = wrap180(sea.dirDeg + wrap180(wind.dirDeg − sea.dirDeg) · (1 − e^(−dt/buildTimeS)))`. The setting is kept. (Gusts last seconds, so they barely move the waves; a shift or a building wind does, over minutes.)
- `setSeaSetting(sea, setting)`: the new setting at once, `windKn` and `dirDeg` kept (a different place, same wind: the waves change size at once).

**Phase at the boat.** A train's height at a fixed map point `p` is `a·cos(k·(d·p) − ω·t + φ₀)`. The boat sails kilometres, and `k` and `d` change slowly as the wind changes, so the model never evaluates `k·(d·p)` at large distances: it keeps each train's phase **at the boat** and evaluates the surface at offsets from her. A boat moving with map velocity `v` sees the phase change at the rate `k·(d·v) − ω` (the encounter frequency). This makes the waves fixed on the map while she sails through them, and keeps a change of the wind from making the waves jump.

`src/model/waveMotion.ts`:

```ts
export function initialWaveMotion(data: BoatData = boat): WaveMotion;
// phases = waves.trains[i].phaseRad; heave, pitch, roll and their rates 0
export function waveTargets(trains: readonly WaveTrain[], phases: readonly number[], headingDeg: number, data: BoatData = boat): { heaveM: number; pitchDeg: number; rollDeg: number };
export function stepWaveMotion(wm: WaveMotion, trains: readonly WaveTrain[], speedMps: number, headingDeg: number, h: number, data: BoatData = boat): WaveMotion;
```

- `waveTargets`: centreline samples `xⱼ = xC + sampleFractionsⱼ · LWL` (z = 0); `ηⱼ = elevation(trains, phases, ...boatToMap(xⱼ, 0, heading))`.
  - `heaveM = heaveFollow · mean(ηⱼ)`.
  - `slope = Σ (xⱼ − xC)·ηⱼ / Σ (xⱼ − xC)²` (least squares; water higher at the bow → positive); `pitchDeg = pitchFollow · atan(slope) / DEG`.
  - `ηS = elevation(..., ...boatToMap(xC, +zS, heading))`, `ηP = elevation(..., ...boatToMap(xC, −zS, heading))`; `rollDeg = −rollFollow · atan((ηS − ηP) / (2·zS)) / DEG`.
  - No trains: all three 0.
- `stepWaveMotion(wm, trains, V, heading, h)`:
  1. `h === 0` → return `wm` (same object). No trains and heave, pitch, roll and all rates exactly 0 → return `wm`.
  2. Phases: `vE = V·sin(heading·DEG)`, `vN = V·cos(heading·DEG)`; for each train `phasesᵢ = modulo(phasesᵢ + (kᵢ·(dirEastᵢ·vE + dirNorthᵢ·vN) − ωᵢ)·h, 2π)` (`modulo` from `mapFrame.ts`). With no trains the phases are kept.
  3. Targets from `waveTargets` with the new phases.
  4. `heave' = lagTowards(heave, target, h, heaveLagS)`, same for pitch (`pitchLagS`) and roll (`rollLagS`); rates `= (new − old) / h`.
  - Switching to Flat: the targets are 0, so the boat settles back to level within about 2 s.

**`stepBoat`** (`motion.ts`), M14 changes only:
- `MotionInputs` gains `trains?: readonly WaveTrain[]` (missing = none).
- Sailing: in each substep, **first** `waves = stepWaveMotion(waves, trains, speedMps, headingDeg, h)` with the speed and heading the substep starts with, then the Phase 2 physics exactly as now. Nothing in the physics reads `waves` in M14.
- Held still: run `count = substepCount(dt)` substeps of `stepWaveMotion(waves, trains, 0, headingDeg, dt / count)` and nothing else (the report as now). If the wave motion did not change (same object), return `boatState` itself (Phase 2 tests check this).
- Return `waves` in the new `BoatState`.

### 6.4 Store and URL

- `AppState.sea: SeaState`. `initialState`: `sea = initialSea(overrides.sea ?? 'flat', wind)` (4.1: tests default to flat). `boat.waves = initialWaveMotion()`.
- Action `{ type: 'setSeaSetting'; setting: SeaSetting }` → `setSeaSetting`; unknown or unchanged → same state.
- `step`: as 4.2 (items 3 and 7).
- `reset`: `initialState({ settings: { debug, detail }, sea: boat.waves.defaultSetting })` (the rest as now).
- `setBoatMode`: unchanged; the wave motion is kept.
- **URL** `sea` = `flat` | `sheltered` | `coastal` | `open`. Written only when not `coastal`, after the wind-mode parameters. A link without `sea`, or with an unknown value, opens **Coastal** (owner: old links open with Coastal waves). The time in the waves is not stored: a link starts the waves at their initial phases.
- `parseUrlState` passes `sea: <the link's setting, or waves.defaultSetting>` to `initialState`.

### 6.5 UI

**Waves block** (`ui/wavesPanel.ts`, `createWavesPanel(store): HTMLElement`), in the Wind tab directly after the wind-change block (`...createWindModePanel(store)`) and before the presets (`createWindPanel`'s returned list). A `fieldset` with `class="field segmented"`, `data-part-id="env_water"`, `data-testid="sea-setting"`:
- Legend `Waves`.
- Four buttons `Flat` `Sheltered` `Coastal` `Open sea` (`aria-pressed`, at least 44 px high, the same segmented style as the wind modes), each dispatching `setSeaSetting`.
- Status line (`data-testid="sea-status"`, `aria-live="polite"`), updated only when its text changes:
  - Flat: `Flat water: no waves.`
  - No trains (wind too light): `Almost flat: the wind is too light to make waves.`
  - Otherwise: `Waves 0.7 m high, one every 3.8 s, from 045°` (height: `significantHeightM(trains)` with 1 decimal; period: the main train's `periodS` with 1 decimal; direction: `compassDeg(sea.dirDeg)`, 3 digits).
- Hint (`p.hint`): `How big the waves get depends on the wind and on how far it blows over open water: little in a sheltered bay, more along the coast, most in the open sea. The height is that of the bigger waves; single waves can be almost twice as high. Waves build up over a few minutes when the wind changes.`

**Debug overlay**: two rows after the motion rows: `waves` `Hs 0.68 m · Tp 3.8 s · from 045°`; `wave motion` `heave 0.12 m · pitch 1.2° · roll 2.0°`.

### 6.6 3D

**Water surface** (`render3d/waterSurface.ts`, replacing `buildWater` and the `GridHelper` in `scene.ts`):

```ts
export interface WaterSurface {
  /** Added to the world group (moved by `world.update`). */
  object: THREE.Group;
  /** The flat invisible plane the picker hits (part id env_water). */
  pickTarget: THREE.Object3D;
  setDetail(detail: Detail): void;
  /** Heights, normals and ripples for the state; `shift` is what world.update returned. */
  update(state: AppState, shift: { x: number; z: number; centreEastM: number; centreNorthM: number }): void;
}
export function buildWaterSurface(ripples: THREE.Texture): WaterSurface;
```

- New `SCENE.water` keys: `waves: { cellM: 2, cellLowM: 4, halfSizeM: 100, fadeStartM: 70 }`, `stepM: 20`, `outerCellM: 20`. `SCENE.water.size` stays 600 (M16 changes it). `SCENE.grid.size` is removed (the grid is now the wave mesh's lines); `SCENE.grid.cellSize` is removed (it is the wave cell).
- `world.update` shifts the water group by `waterShift(eastM, northM, SCENE.water.stepM)` (was the grid cell). Every vertex of both meshes then sits on a fixed map point (multiples of 2 m), so nothing swims when the group steps. `world.update` returns `{ x, z, centreEastM, centreNorthM }` (add `x`, `z`).
- **Inner wave mesh**: a square grid of `(2·halfSizeM / cell + 1)²` vertices, `cell = cellM` at High detail and `cellLowM` at Low (rebuilt by `setDetail`). Vertex local position `(x, y, z)` with `x, z ∈ [−halfSizeM, halfSizeM]` (local x = north, z = east). Each frame, for each vertex: `ΔN = shift.x + x`, `ΔE = shift.z + z`; `f = 1 − smoothstep(fadeStartM, halfSizeM, max(|x|, |z|))`; `{eta, dEast, dNorth} = elevationAndSlope(trains, phases, ΔE, ΔN)`; `y = f·eta`; normal = normalize(`−f·dNorth`, 1, `−f·dEast`) in local (x, y, z). Write `position` and `normal` and set `needsUpdate`; `frustumCulled = false`. With no trains: set every y to 0 and every normal to (0, 1, 0) once, then skip the work until trains return. `trains = waveTrains(state.sea)`, `phases = state.boat.waves.phases`.
- **UVs** for the ripple normal map (both meshes): `u = x / rippleTileM`, `v = −z / rippleTileM` (the plane's u runs north, its v runs west, as before); `ripples.repeat = (1, 1)`; the offset as now, from the plane centre's map position (`centreNorthM`, `centreEastM`) and the drift, with the drift's time from **`state.rig.timeS`** (was the frame time: issue #32).
- **Grid lines**: `THREE.LineSegments` that share the inner mesh's `position` attribute, with an index joining neighbouring vertices along every row and every column (so the lines follow the waves and are 2 m apart at High, 4 m at Low). Same colour and opacities as the old grid (`SCENE.grid.color`, `opacity`, `opacityHigh`), `depthWrite: false`, `renderOrder` one higher than the water.
- **Outer water**: a flat mesh at y = 0 covering `SCENE.water.size` in cells of `outerCellM`, built once, with the triangles of every cell whose centre lies inside the inner square (`max(|cx|, |cz|) < halfSizeM`) left out; same materials and UV rule as the inner mesh. Inner and outer meet at the square's edge, where the fade has brought the waves to y = 0.
- Materials as before (`high` standard, `low` Lambert; colours, opacity, `depthWrite: false`); `receiveShadow` on the inner mesh. Both meshes and the grid carry `userData.partId = 'env_water'`.
- **Pick target**: a flat `PlaneGeometry(SCENE.water.size, SCENE.water.size)` mesh at y = 0 with `new THREE.MeshBasicMaterial({ visible: false })` (the raycaster still hits it), part id `env_water`, in the water group. `createPicker(camera, holder, water.pickTarget)`.
- **Boat**: `holder.position.y = boat.waves.heaveM`; `holder.rotation.set((boat.heelDeg + boat.waves.rollDeg)·DEG, 0, boat.waves.pitchDeg·DEG)`. The camera, the water, the wake and the streaks do not rock.
- **Wake** (`wake.ts`): each ribbon point's `y = SCENE.wake.y + elevation(trains, phases, point.eastM − boat.eastM, point.northM − boat.northM)`. `Wake.update(state, timeS, heightAt)` gains `heightAt: (dEastM: number, dNorthM: number) => number`.
- **Wind streaks**: `streaks.update(awa, aws, state.rig.timeS)` (was the frame time: issue #32). With the ripples, nothing in the 3D view moves while paused except a camera move.

### 6.7 Strings and registry

`en.json`: `waves.label` "Waves", `waves.flat` "Flat", `waves.sheltered` "Sheltered", `waves.coastal` "Coastal", `waves.open` "Open sea", `waves.hint` (6.5), `waves.status` "Waves {height} m high, one every {period} s, from {compass}°", `waves.statusFlat` "Flat water: no waves.", `waves.statusCalm` "Almost flat: the wind is too light to make waves.", `debug.waves` "waves", `debug.waveMotion` "wave motion".

Registry: `env_water` gets a new `short.en`: "The sea surface. Waves grow with the wind and with how far it has blown over open water (Wind tab → Waves); the boat rises, pitches and rolls on them. See-through so the keel and rudder stay visible." (status stays `draft`).

### 6.8 Tests

`tests/waves.test.ts`, `tests/physicsTruths3.test.ts`, URL cases in `tests/urlState.test.ts`. Prototype values in brackets.

1. **PT-39 wave size** (`seaSize`, ±0.005 m, ±0.01 s): 15 kn, 30 km → 0.683 m, 3.832 s; 20 kn, 150 km → 2.036 m, 7.212 s; 12 kn, 5 km → 0.223 m, 1.958 s; 25 kn, 30 km → 1.138 m, 4.543 s; 30 kn, 10⁷ km (fully developed) → 5.907 m, 12.797 s; 0 kn or fetch 0 → height 0. Height strictly increases with the wind (fetch 30 km, 2 … 30 kn in 1 kn steps) and with the fetch (15 kn; 1, 5, 30, 150, 1000 km) until the fully developed cap.
2. `waveTrains`: Flat → `[]`; Coastal at 1 kn → `[]` (height 0.007 m); Coastal at 2 kn → 3 trains (0.026 m, period 1.0 s). `significantHeightM(waveTrains(...))` equals `seaSize(...).heightM` (1e-9). Main train `fromDeg` = `sea.dirDeg`; with `dirDeg` 0 the main train travels south (`dirEast` 0, `dirNorth` −1, 1e-12).
3. **Phase at the boat** is the map-fixed wave: Coastal 15 kn, a boat sailing at 6 m/s on heading 30 for 60 s (60 fps, `stepWaveMotion`); then for 5 map points within 50 m of her, `elevation(trains, wm.phases, p − boat)` equals `Σ aᵢ cos(kᵢ·(dᵢ·p) − ωᵢ·60 + phaseRadᵢ)` within 1e-6 m (p in map coordinates from the start).
4. `stepSea`: wind 10 → 20 kn at t = 0, after 180 s (60 fps) `windKn` = 16.32 ± 0.01; the same at 30 and 120 fps within 1e-6; direction 0 → 90 after 180 s: 56.9° ± 0.1; 170 → −170 after 180 s: −177.4° ± 0.1 (it turns 20° across ±180, not 340°); `dt = 0` returns the same object.
5. **PT-40 the boat follows the waves** (store, `boat: { mode: 'held' }`, `sea: 'coastal'`, 30 fps, 120 s, measured as the largest absolute value between t = 40 s and 120 s): wind 15 kn from 0 (waves from ahead, heading 0): pitch 2.3–3.5° [2.90] and roll smaller than pitch [1.79]; wind 15 kn from 90 (beam on): roll 4.1–6.1° [5.08] and pitch smaller than roll [1.29]; `sea: 'open'`, wind 20 kn from 0: heave 0.65–1.0 m [0.83], pitch 4.0–6.0° [4.96].
6. **M14 does not change the sailing**: Sailing, wind 15 kn from 135, main sheet 100, jib sheet 100, autopilot heading, 60 s at 30 fps, once with `sea: 'coastal'` and once with `'flat'`: `speedMps`, `headingDeg`, `heelDeg`, `eastM`, `northM` and `rig.wind` are identical (`toBe` / `toEqual`); the coastal run's wave motion is not zero.
7. **Flat**: 60 s Sailing and 60 s Held still with `sea: 'flat'`: the wave motion stays exactly 0 and the phases unchanged; Held still + Flat: `stepBoat` returns the same object.
8. **Pause** (issue #32): with `paused: true`, 100 steps leave `sea` and `boat.waves` unchanged (same objects).
9. Frame-rate independence of the motion: Held still, Coastal, wind 15 kn from 45, 60 s at 30, 60 and 120 fps: heave within 0.01 m, pitch and roll within 0.1° of each other at t = 60 s.
10. **URL**: round trip of every setting; `?wd=60` → Coastal; `?sea=storm` → Coastal; Coastal writes no `sea`; Flat writes `sea=flat`. Reset → Coastal with `sea.windKn` = the wind now.
11. All Phase 1 and Phase 2 tests green **unchanged** (they build states with `initialState`, which defaults to Flat). One allowed change: a URL test that compares a parsed old link with a state built by `initialState(...)` may add `sea: 'coastal'` to the overrides.

### 6.9 Browser checks (`scripts/shots-m14.mjs`)

Scenes (`M14_SCENES`, every size; labels contain "m14" so they open Sailing):
- `waves-coastal`: `?wd=90&ws=15&ms=50&js=100&cam=side-port`, wait 3 s.
- `waves-open`: `?wd=45&ws=20&ms=20&js=0&sea=open&cam=bow`, wait 3 s.
- `waves-flat`: `?wd=90&ws=15&ms=50&js=100&sea=flat`, wait 3 s.
- `waves-panel`: `?wd=90&ws=15`, Wind tab, scrolled to `[data-testid="sea-setting"]`.

Live checks (`liveM14Checks`):
- Coastal link: the status line reads `Waves 0.7 m high, one every 3.8 s, from 090°`; after 2 s the debug overlay (`&debug=1`) shows a non-zero heave.
- Tap `Open sea`: the status changes to a height of 1.5 m (15 kn over 150 km), the address bar gets `sea=open`; tap `Coastal`: `sea` disappears from the address bar.
- Pause (#32): with `?wd=90&ws=15&debug=1`, press Pause, take two screenshots 1 s apart: the canvases are pixel-identical (compare the PNG buffers).
- `?wd=90&ws=15&held=1&debug=1`: Held still, the wave motion rows show a non-zero roll; the strip still says "Held still".
- Tap on open water: the info card shows "Water surface".
- Register in `shots.mjs`: import, `...M14_SCENES` with the `m14-` prefix, `liveGroups.m14`.
- **Older scenes and checks keep their Phase 2 picture:** `openPage` in `shots.mjs` adds `sea=flat` to the link of every scene and check whose label does not match `/m1[4-9]/` and whose query has no `sea=` (the same way it adds `held=1` for the Phase 1 ones). Without it the boat would rock under the tap sweep and the Phase 2 checks.

### 6.10 Done when

All M14 checks in `WORKFLOW.md` (section 8) pass on the phone; the tests above pass; the PNGs of the four scenes looked at (phone size first). `BOAT_REFERENCE.md` rows for the new keys checked; `CODE_MAP.md` updated. The PR description says `Closes #32`.

### 6.11 Not in M14

No feedback from the waves into the sailing (M15). No whitecaps, gust patches, buoys or horizon change (M16). No clock (M17).

---

## 7. M15: Waves change the sailing

**Independent review: required** (changes the boat's physics: apparent wind, resistance and steering; a mistake teaches the wrong feel for waves).

### 7.1 Files

New: `tests/waveFeedback.test.ts`, `scripts/shots-m15.mjs`.
Changed: `content/boat/hanse508.json` (`physics.waveFeedback`), `src/model/apparentWind.ts`, `src/model/sim.ts` (`rigWind`), `src/model/waveMotion.ts`, `src/model/motion.ts` (`stepBoat`, `steadyState`, `MotionReport`), `src/app/store.ts` (`motionOf`, `boatFor`), `src/ui/wavesPanel.ts` (one hint sentence), `src/ui/debugOverlay.ts`, `content/i18n/en.json`, `tests/physicsTruths3.test.ts`, `tests/stepCost.test.ts` (one new case), `scripts/shots.mjs`, `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md`.

### 7.2 Data (`hanse508.json` → `physics.waveFeedback`, new)

```json
"waveFeedback": {
  "$comment": "PHASE3_SPEC 7 (M15). How the waves act on the sailing. The rig's motion through the air uses the mainsail's centre of effort (sailForces ceHeights().main). Assumptions (BOAT_REFERENCE section 5).",
  "yawDegPerDegRoll": 5,
  "yawFactorByRelDeg": [[0, 0.1], [45, 0.4], [90, 0.3], [135, 1], [180, 0.5]],
  "yawNote": "assumption: waves turn the boat like extra rudder, 5° per degree of wave roll, scaled by where the waves come from relative to the bow (0 = from ahead): most from behind at an angle (quartering, 135°), least head-on (PT-42)",
  "addedResistanceCoefficient": 0.0017,
  "addedResistanceByRelDeg": [[0, 1], [45, 0.9], [90, 0.35], [135, 0.1], [180, 0.05]],
  "addedResistanceFullSpeedMps": 2,
  "addedResistanceNote": "assumption: extra resistance in waves R = c·ρw·g·Hs·beam²·f(angle)·min(1, V / 2 m/s): about 0.24 kN in 0.7 m waves and 0.7 kN in 2 m waves from 45° off the bow, so she loses about 4 % of her speed close-hauled in Coastal waves and about 12 % in the Open sea (PT-43). A teaching fit, not a seakeeping calculation"
}
```

**Tunable in M15:** `yawDegPerDegRoll`, `addedResistanceCoefficient`.

### 7.3 Model

`apparentWind` gains a sideways speed (default 0, so every caller is unchanged):

```ts
export function apparentWind(twsKn: number, twaDeg: number, speedMps: number, data: BoatData = boat, sideMps = 0): ApparentWind
// ax = tws·cos(twa) + speedMps ; az = tws·sin(twa) + sideMps   (moving to starboard, the wind seems to come more from starboard)
```

`rigWind` (`sim.ts`) uses `motion.velocity[2]` as `sideMps`. The exact (not quantised) path stays for `speed === 0 && side === 0 && !wind`, so Held still and a boat at rest are Phase 1 exactly. `BoatMotion`'s comment changes: `velocity[0]` is the speed of the sails along the bow (the boat's speed plus the rig's pitching), `velocity[2]` the sails' sideways speed from rolling, + = to starboard.

`waveMotion.ts` gains:

```ts
/** How fast the sails move through the air because she pitches and rolls (m/s, boat frame). */
export function rigMotion(wm: WaveMotion, data: BoatData = boat): { forwardMps: number; sideMps: number };
// h = ceHeights(data).main (9.66 m above the waterline)
// forwardMps = −wm.pitchRateDegS·DEG·h   (bow coming up: the rig swings aft)
// sideMps    = +wm.rollRateDegS·DEG·h    (rolling towards starboard rail down: the rig swings to starboard)
/** The wave's push on the steering, as degrees of extra rudder (+ = turns her to starboard). */
export function waveYawDeg(wm: WaveMotion, trains: readonly WaveTrain[], headingDeg: number, data: BoatData = boat): number;
// no trains → 0; rel = |wrap180(trains[0].fromDeg − headingDeg)|; yawDegPerDegRoll · wm.rollDeg · interp(yawFactorByRelDeg, rel)
/** Extra resistance from the waves, N (≥ 0). */
export function addedResistanceN(speedMps: number, headingDeg: number, trains: readonly WaveTrain[], data: BoatData = boat): number;
// no trains or speedMps ≤ 0 → 0; Hs = significantHeightM(trains); rel as above;
// addedResistanceCoefficient · ρw · g · Hs · beam² · interp(addedResistanceByRelDeg, rel) · min(1, speedMps / addedResistanceFullSpeedMps)
```

Only the wave roll (`wm.rollRateDegS`) moves the rig sideways, not the heel's own rate: with Flat everything is Phase 2 exactly.

**`stepBoat`, per Sailing substep** (after the wave motion of 6.3; everything else as now):
1. `{ forwardMps, sideMps } = rigMotion(waves)`.
2. `wind = apparentWind(tws, twa, speedMps + forwardMps, data, sideMps)`; the forces from this wind (the sails flick with the rocking).
3. `raw = addedResistanceN(speedMps, headingDeg, trains)`; `acceleration = (push − sign(V)·R.totalN − raw) / mEff`. The zero-crossing test is unchanged.
4. Yaw: `turnRudderDeg = grip·rudderDeg − weatherHelmDegPerDegHeel·heelDeg + waveYawDeg(waves, trains, headingDeg)`.
5. `MotionReport` gains `waveResistanceN` (raw), `waveYawDeg` and `rigSideMps` (sideMps) of the last substep (0 in Held still).

**`steadyState`** gains `opts.trains?: readonly WaveTrain[]`: inside the speed bisection, `net −= addedResistanceN(mid, headingDeg, opts.trains)`. The rocking is left out (it averages out), so a link opens close to the speed she settles at.

**Store:**
- `motionOf(boat)`: Held still → `velocity [0, 0, 0]`; Sailing → `const m = rigMotion(boat.waves)`; `velocity [boat.speedMps + m.forwardMps, 0, m.sideMps]`.
- `boatFor(...)` (Sailing) passes `trains: waveTrains(initialSea(setting, wind))` to `steadyState`.

### 7.4 UI

- The Waves hint (6.5) gains a last sentence: `Waves rock the boat: the sails feel the rocking and flick, waves from behind at an angle knock the bow off course, and waves from ahead slow her down.` (`waves.effects`).
- Debug overlay, new row `wave push`: `resistance 0.24 kN · yaw 1.2° · sails sideways 0.4 m/s` (from the report).
- Nothing else: the owner sees it in the sails, the wind instrument's needles, the wheel (autopilot) and the speed.

### 7.5 Strings

`waves.effects` (7.4), `debug.wavePush` "wave push".

### 7.6 Tests

`tests/waveFeedback.test.ts` and `tests/physicsTruths3.test.ts`. Runs through the store (`initialState({ controls: { ctl_wind_dir: TWA, ctl_wind_speed: TWS, ctl_mainsheet, ctl_jib_sheet }, sea })`: Sailing, heading 0, the autopilot holding 0), 30 fps for 300 s; statistics over the frames from t = 100 s to 300 s. Prototype values in brackets.

1. Signs: `rigMotion` with pitch rate +10 °/s → `forwardMps` −1.686 ± 0.005; roll rate +10 °/s → `sideMps` +1.686 ± 0.005. `apparentWind(0, 0, 0, boat, 1)` → AWA +90, AWS 1.94 kn. No trains: `waveYawDeg` 0, `addedResistanceN` 0.
2. **PT-41 the sails feel the rocking**: Coastal, 15 kn from 90, main 50, jib 100: standard deviation of `rig.wind.awaDeg` 1.6–3.4° [2.42], max − min ≥ 6° [10.2]. The same with Flat: standard deviation < 0.05°. Sheltered, 12 kn from 60, main 20, jib 25: 1.4–2.8° [2.07].
3. **PT-42 waves knock her off course**: Coastal, 15 kn from 135, main 100, jib 100: standard deviation of `rig.applied.rudder` 3.5–7° [5.16] and of the heading 0.8–2.2° [1.35]; with the wind from 45 (main 15, jib 0) the rudder's standard deviation is less than half of that at 135 [0.93]; Flat at 135: < 0.3°.
4. **PT-43 head seas slow her most**: mean speed with Flat minus mean speed in the Open sea, 20 kn: from 45 (main 20, jib 0) 0.6–1.3 kn [0.89]; from 135 (main 100, jib 100) < 0.4 kn [0.13], and the loss at 45 is more than 3 × the loss at 135. Coastal, 15 kn from 45 (main 15, jib 0): 0.15–0.45 kn [0.27].
5. **Held still ignores the waves**: Held still, Coastal vs Flat, wind 15 kn from 90, 30 s: the rig states are equal (`toEqual`); the wave motion differs.
6. Frame-rate independence: Coastal, 15 kn from 135, main 100, jib 100, 600 s at 30, 60 and 120 fps: mean speed within 0.05 kn, rudder standard deviation within 10 % of each other [7.11 kn, 5.13° at all three]. Time ×16 at 10 fps (1.6 s steps): every value finite, |speed| < 12 kn, rudder standard deviation < 10° [6.98].
7. `steadyState(trimmed(20, 45, 20, 0), 0, boat, { heel: true, trains: <Open, 20 kn from 45> })` is lower than without `trains`.
8. `tests/stepCost.test.ts`: a new case, Open sea, Gusty 30 %, ×16, 60 fps, under the existing 3 ms limit.
9. All Phase 1 and Phase 2 tests green (they default to Flat). **One allowed change:** the two URL tests in `tests/urlState.test.ts` that compare a parsed link's opening speed with `steadyState(…, { heel: true })` ("an old link opens … at her steady speed" and the `bs` fallback) pass `trains: waveTrains(state.sea)` to `steadyState`, because a link without `sea` now opens in Coastal waves.

### 7.7 Browser checks (`scripts/shots-m15.mjs`)

Scenes: `feedback-quartering` (`?wd=135&ws=15&ms=100&js=100&cam=helm`, wait 3 s), `feedback-head` (`?wd=45&ws=20&ms=20&js=0&sea=open&cam=bow`, wait 3 s).
Live checks (`liveM15Checks`):
- `?wd=135&ws=15&ms=100&js=100&debug=1`: over 10 s the `rd` value in the address bar takes at least 3 different values (the autopilot keeps correcting); with `&sea=flat` it takes at most 2.
- `?wd=90&ws=15&ms=50&js=100`: the "App" angle in the strip (`strip-apparent`) shows at least 3 different values over 10 s; with `&sea=flat` at most 2.
- Speed: `?wd=45&ws=20&ms=20&js=0&sea=open` vs `&sea=flat`, after 30 s: the strip speed with Open sea is at least 0.5 kn lower.

### 7.8 Done when

All M15 checks in `WORKFLOW.md` pass on the phone; the tests above pass; the scenes looked at; `BOAT_REFERENCE.md` rows checked.

### 7.9 Not in M15

No change to heel dynamics (the waves do not push the heel; the wave roll is drawn on top). No broaching (the boat cannot be thrown round by a big wave), no surfing down waves, no slamming. The windex and the wind instrument show the sails' wind (`rig.wind`), not a separate masthead wind.

---

## 8. M16: Wind on the water, buoys and the horizon

**Independent review: not needed** (visuals and fixed marks; the gust preview only reads `windAt` at other times, its formula is unchanged).

### 8.1 Files

New: `src/model/windOnWater.ts`, `src/render3d/marks.ts`, `tests/windOnWater.test.ts`, `scripts/shots-m16.mjs`.
Changed: `content/areas/adriatic.json` (`marks`), `content/boat/hanse508.json` (`waves.whitecaps`, `windModes.gustPreview`), `src/render3d/waterSurface.ts` (vertex colours), `src/render3d/scene.ts` (marks, fog, debug hook), `src/render3d/picking.ts` (extra roots), `src/render3d/sceneConfig.ts`, `src/ui/mapView.ts` (buoys), `content/registry/parts.json`, `tests/map.test.ts`, `tests/physicsTruths3.test.ts`, `scripts/shots.mjs`, `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md`.

### 8.2 Data

`content/areas/adriatic.json`, new key:

```json
"marks": {
  "$comment": "Practice buoys (PHASE3_SPEC 8, owner): fixed marks in metres east and north of where the boat starts. Not real buoys.",
  "buoys": [
    { "id": "N", "eastM": 0, "northM": 200 },
    { "id": "E", "eastM": 200, "northM": 0 },
    { "id": "S", "eastM": 0, "northM": -200 },
    { "id": "W", "eastM": -200, "northM": 0 }
  ]
}
```

`hanse508.json` → `waves`, new key:

```json
"whitecaps": {
  "coverageByWindKn": [[0, 0], [7, 0], [10, 0.02], [16, 0.06], [21, 0.12], [27, 0.2], [33, 0.3], [40, 0.4]],
  "source": "Beaufort scale (Wikipedia): perhaps scattered white horses at force 3 (7–10 kn), fairly frequent at 4 (11–16 kn), many at 5 (17–21 kn), more extensive at 6 (22–27 kn), blown in streaks at 7 (28–33 kn). The coverage fractions are a teaching assumption (PT-44)."
}
```

`hanse508.json` → `windModes`, new key:

```json
"gustPreview": {
  "fromM": -100,
  "toM": 300,
  "stepM": 20,
  "note": "assumption: a gust or lull travels downwind at the mean wind speed, so the patch of water it darkens 300 m upwind reaches the boat 300 m / wind speed later (PT-45)"
}
```

### 8.3 Model (`src/model/windOnWater.ts`)

```ts
/** Fraction of the wave crests that break white, 0 … 1 (interp of whitecaps.coverageByWindKn). */
export function whitecapCoverage(twsKn: number, data: BoatData = boat): number;
/** How far upwind a map offset lies (m): + = towards where the wind comes from. */
export function upwindDistanceM(dEastM: number, dNorthM: number, windDirDeg: number): number;
// dEast·sin(windDir·DEG) + dNorth·cos(windDir·DEG)
export interface GustProfile { fromM: number; stepM: number; values: number[] }
/**
 * Gusty wind only: how strong the gust or lull is at each upwind distance on the water now,
 * −1 (deepest lull) … +1 (a full gust). Null for other wind modes or a mean wind under 1 m/s.
 */
export function gustProfile(controls: Controls, windMode: WindModeState, timeS: number, data: BoatData = boat): GustProfile | null;
// U = knToMps(ctl_wind_speed); for b = 0 … (toM − fromM)/stepM: u = fromM + b·stepM;
// tws = windAt(ctl_wind_dir, ctl_wind_speed, windMode, timeS + u / U).twsKn;
// values[b] = clamp((tws − ctl_wind_speed) / (ctl_wind_speed · windMode.size / 100), −1, 1)
/** Linear interpolation in the profile, clamped at both ends. */
export function gustAt(profile: GustProfile, upwindM: number): number;
/** Where each buoy is relative to the boat (map offset), with its id. */
export function buoyOffsets(boatState: Pick<BoatState, 'eastM' | 'northM'>, areaData: AreaData = area): { id: string; dEastM: number; dNorthM: number }[];
```

The value at `u = 0` is the gust at the boat now (the same `windAt` the store uses at `rig.timeS`); the value at `u = 120 m` is the wind the boat will feel `120 / U` seconds later. That is what the dark patch shows.

### 8.4 3D

- **Horizon**: `SCENE.water.size` 600 → **2000** (outer water and pick plane), `SCENE.fogNear` 60 → **150**, `SCENE.fogFar` 260 → **900** (the camera's far plane stays 1000). The water now reaches the fogged horizon from every preset.
- **Vertex colours** on the inner and outer water meshes (`color` attribute, 3 floats; both materials get `vertexColors: true` and a white `color`; the detail's base colour, `SCENE.water.color` or `lowColor`, goes into the vertex colours). New `SCENE.water` keys: `windyColor: '#16586a'`, `windDarkFromKn: 4`, `windDarkToKn: 24`, `windDarkAmount: 0.5`, `gustColor: '#0b3442'`, `gustAmount: 0.45`, `lullColor: '#5aa7bd'`, `lullAmount: 0.3`, `whitecapColor: '#f2f6f7'`. Per vertex, every frame (colours mixed with `THREE.Color.lerp`):
  1. `c = base.lerp(windyColor, windDarkAmount · smoothstep(windDarkFromKn, windDarkToKn, state.wind.twsKn))` (more wind, darker water).
  2. `profile = gustProfile(state.controls, state.windMode, state.rig.timeS)`; if not null: `g = gustAt(profile, upwindDistanceM(ΔE, ΔN, state.controls.ctl_wind_dir))`; `g > 0`: `c.lerp(gustColor, gustAmount·g)`; `g < 0`: `c.lerp(lullColor, lullAmount·(−g))`. The profile is computed once per frame (21 `windAt` calls), not per vertex.
  3. Inner mesh only: `cov = whitecapCoverage(state.wind.twsKn)`; if `cov > 0`: `A = Σ amplitudeM`; `w = f · smoothstep(1 − 2·cov, 1 − cov, eta / A)` (f = the fade of 6.6); `c.lerp(whitecapColor, w)`. The crests where the trains add up turn white, more of them in more wind.
  - The outer mesh's colours are recomputed only when the profile is not null or `state.wind.twsKn` changed since the last frame.
- **Buoys** (`render3d/marks.ts`, `buildMarks(areaData = area): Marks` with `object: THREE.Group` and `update(state: AppState, heightAt: (dE: number, dN: number) => number): void`), added to the **world group** (not the water group: they must not step with it). Each buoy: a sphere radius 0.6 m (16 × 12 segments), a pole (cylinder radius 0.04 m from y 0.5 to 1.9 m) and a topmark of two boxes 0.5 × 0.08 × 0.08 m crossing in an X at y 1.9 m (one turned +45° and one −45° about the buoy's local z axis). All `MeshStandardMaterial` colour `SCENE.marks.color` `'#f5c400'`, roughness 0.5. Every mesh `userData.partId = 'env_buoy'`; the sphere also gets `hitPoints: [[0, 0, 0]]` (the 24 px tap area of small parts, picking.ts), because 200 m away a buoy is only a few pixels on a phone. Each frame: local position `x = buoy.northM − boat.northM`, `z = buoy.eastM − boat.eastM` (world-group axes: x north, z east), `y = heightAt(ΔE, ΔN) + 0.2`; hidden beyond `SCENE.marks.maxDrawM` (1000 m). No collisions: the boat passes through.
- **Picking**: `createPicker(camera, boatRoot, water, extraRoots: THREE.Object3D[] = [])`: `collect` also traverses `extraRoots`; the ray tests `[boatRoot, ...extraRoots, water]`. The scene passes `[marks.object]`.
- **Debug hook** (`?debug=1`): `window.__sailWater = { gustProfile: () => GustProfile | null; buoyScreen: (id: string) => { x: number; y: number } | null }` (the profile of the last frame; a buoy's centre on the canvas in CSS px, null when behind the camera), for the browser checks.

### 8.5 UI: the map

- `mapView.ts` draws the buoys after the track and before the no-go wedge: a filled circle, colour `#f5c400` (a `MAP` constant in `mapView.ts`), with a 1.5 px dark outline (`#3a3000`), radius `max(5, 0.6 · pxPerM)` px, and its letter (`N`, `E`, `S`, `W`, 12 px, bold) 8 px to the right. Buoys off the canvas are skipped.
- `pickMap`: after the boat and the apparent-wind arrow, a tap within `MAP.hitPx` (22 px) of a buoy's centre returns `env_buoy`.

### 8.6 Strings and registry

Registry: `env_buoy` (kind `environment`, phase 3, names en "Practice buoy", ru "учебный буй", status en `draft`, ru `draft`, short en "A yellow buoy used as a fixed mark, 200 m north, east, south and west of where the boat started. Watch it to judge your speed, drift and turns. The boat passes through it: there are no collisions yet."). `env_water`'s short text gains: "Darker patches are stronger wind (in gusty wind you can see a gust coming); white crests (white horses) appear from about 7 knots and grow with the wind."

### 8.7 Tests

`tests/windOnWater.test.ts`, `tests/physicsTruths3.test.ts`, `tests/map.test.ts`.

1. **PT-44 white horses**: `whitecapCoverage` is 0 at 0 and 6.9 kn, > 0 at 8 kn, 0.02 at 10 kn, 0.06 at 16 kn, 0.2 at 27 kn (1e-9), and strictly increases from 7 to 40 kn.
2. **PT-45 a gust shows upwind before it arrives**: Gusty, seed 1, size 30, mean 12 kn from 0, `startS` 0. Take the first gust of `gustyEvents(1, 3600)` and its peak time `tp = atS + riseS + holdS / 2`. With `U = knToMps(12)`: `gustAt(gustProfile(..., tp − 120 / U), 120)` equals `gustAt(gustProfile(..., tp), 0)` (1e-9), and that value is > 0.5. `gustAt(profile, 0)` equals `(state.wind.twsKn − 12) / (12 · 0.3)` for a store stepped to the same time (1e-9). Steady, Shifty, Building, Dying → null; Gusty with mean 1.5 kn → null.
3. `upwindDistanceM`: wind from 0, a point 100 m north → +100; wind from 90, 100 m east → +100; wind from 90, 100 m west → −100.
4. `buoyOffsets` with the boat at east 50, north −20: N → (−50, 220), E → (150, 20).
5. Map: at 4 m per pixel, North up, the boat at the start, `pickMap` 50 px above the boat's centre returns `env_buoy`; 30 px to the right of that returns `null` or another id, not `env_buoy`.

### 8.8 Browser checks (`scripts/shots-m16.mjs`)

Scenes: `water-windy` (`?wd=90&ws=22&ms=50&js=100&sea=open&cam=side-port`, wait 3 s: dark water, white crests), `water-light` (`?wd=90&ws=6&ms=50&js=100&cam=side-port`: no white horses), `buoy-ahead` (`?wd=90&ws=12&ms=40&js=100&cam=helm`, heading 0: the N buoy ahead), `horizon` (`?wd=90&ws=12&cam=side-starboard`).
Live checks (`liveM16Checks`):
- Gust coming: `?wd=0&ws=12&ms=12&js=0&wm=gusty&seed=7&cam=helm&debug=1`: poll `__sailWater.gustProfile()` every 0.5 s (at most 120 s) until a value between 60 and 200 m upwind is > 0.5 while the value at 0 m is < 0.2; screenshot (`live-phone-gust-coming.png`); then within `200 m / U + 5 s` the strip shows `GUST`.
- Buoy on the map: `?wd=90&ws=12&cam=map`, tap − four times (0.1 → 0.2 → 0.5 → 1 → 2 m/px), tap 100 px above the boat's centre: the info card says "Practice buoy".
- Buoy in 3D: `?wd=90&ws=12&ms=40&js=100&cam=helm&debug=1`: `__sailWater.buoyScreen('N')` lies inside the canvas, and a tap there opens "Practice buoy".

### 8.9 Done when

All M16 checks in `WORKFLOW.md` pass on the phone; the tests pass; the scenes looked at (phone first).

### 8.10 Not in M16

No collisions with the buoys, no other marks or land (Phase 5). No streaks of foam blown downwind at force 7, no spray. The wind streaks in the air stay as they are.

---

## 9. M17: Clock and sailing area (issue #26)

**Independent review: required** (new shared state and URL keys, time-zone and sun-position formulas; a wrong offset or sign shows the wrong sky for every link).

### 9.1 Files

New: `src/model/clock.ts`, `src/model/sun.ts`, `src/render3d/daylight.ts`, `src/ui/clockPanel.ts`, `tests/clock.test.ts`, `tests/sun.test.ts`, `scripts/shots-m17.mjs`.
Changed: `content/areas/adriatic.json` (`clock`), `src/model/settings.ts` (`Settings.clock`), `src/app/store.ts`, `src/app/urlState.ts`, `src/app/app.ts` (the clock in `.view-top`), `src/ui/panel.ts` (View tab switch), `src/render3d/scene.ts` (lights from the sun), `src/render3d/waterSurface.ts` (night water), `src/render3d/sceneConfig.ts`, `src/style.css`, `content/i18n/en.json`, `tests/physicsTruths3.test.ts`, `scripts/shots.mjs`, `scripts/a11y-audit.mjs` targets if needed, `docs/CODE_MAP.md`.

### 9.2 Data (`content/areas/adriatic.json`, new key)

```json
"clock": {
  "defaultLocal": "2026-06-01T12:00",
  "note": "owner (issue #26, Phase 3 plan): without a time in the link the clock starts at noon, 1 June (local time)"
}
```

### 9.3 Model

`src/model/clock.ts` (pure; uses only `Date.UTC` and `getUTC…` methods, never the device's time zone):

```ts
export interface ClockState { utcMs: number }
export interface LocalParts { year: number; month: number; day: number; hour: number; minute: number; second: number; weekday: number; offsetMin: number; summer: boolean }
// month 1–12, weekday 0 = Sunday … 6 = Saturday
/** 01:00 UTC on the last Sunday of `month` (1–12) in `year`, as UTC ms. */
export function lastSundayUtcMs(year: number, month: number): number;
export function isSummerTime(utcMs: number, areaData: AreaData = area): boolean;
// summerTime 'EU': lastSundayUtcMs(year, 3) ≤ utcMs < lastSundayUtcMs(year, 10), with year = new Date(utcMs).getUTCFullYear()
export function localParts(utcMs: number, areaData: AreaData = area): LocalParts;
// offsetMin = summer ? summerOffsetMin : standardOffsetMin; read new Date(utcMs + offsetMin·60000) with getUTC… (seconds floored)
export function utcFromLocal(year: number, month: number, day: number, hour: number, minute: number, areaData: AreaData = area): number;
// u = Date.UTC(year, month − 1, day, hour, minute) − summerOffsetMin·60000; if isSummerTime(u) return u;
// else return Date.UTC(…) − standardOffsetMin·60000
// (a time that does not exist on the spring-forward night, 02:00–02:59, comes out an hour later; on the autumn night 02:00–02:59 means the first, summer-time one)
export function defaultClockUtcMs(areaData: AreaData = area): number;   // clock.defaultLocal through utcFromLocal: 1,780,308,000,000 (2026-06-01 10:00 UTC)
/** The link's form of a time: local 'YYYYMMDDHHmm'. */
export function clockParam(utcMs: number, areaData: AreaData = area): string;
/** A 'YYYYMMDDHHmm' local time → UTC ms, or null if it is not 12 digits or not a real date and time (year 1900–2100). */
export function parseClockParam(value: string, areaData: AreaData = area): number | null;
export type Daylight = 'day' | 'golden' | 'twilight' | 'night';
export function daylight(sunElevationDeg: number): Daylight;   // ≥ 6 day; ≥ 0 golden; ≥ −6 twilight; else night
```

`src/model/sun.ts` (the NOAA solar calculator's equations, after Meeus; `r = π/180`, all trig in radians):

```ts
export interface SunPosition { elevationDeg: number; azimuthDeg: number }
export function sunPosition(utcMs: number, latitudeDeg: number, longitudeDeg: number): SunPosition;
export interface SunTimes { noonUtcMs: number; sunriseUtcMs: number | null; sunsetUtcMs: number | null; polar: 'none' | 'day' | 'night' }
/** For a calendar date (UTC midnight of year-month-day), at a place. */
export function sunTimes(year: number, month: number, day: number, latitudeDeg: number, longitudeDeg: number): SunTimes;
```

`solarTerms(utcMs)` (private): `JD = utcMs / 86,400,000 + 2,440,587.5`; `T = (JD − 2,451,545) / 36,525`;
`L0 = wrap360(280.46646 + T·(36000.76983 + 0.0003032·T))`; `M = 357.52911 + T·(35999.05029 − 0.0001537·T)`; `e = 0.016708634 − T·(0.000042037 + 0.0000001267·T)`;
`C = sin(M)·(1.914602 − T·(0.004817 + 0.000014·T)) + sin(2M)·(0.019993 − 0.000101·T) + sin(3M)·0.000289`;
`Ω = 125.04 − 1934.136·T`; `λ = L0 + C − 0.00569 − 0.00478·sin(Ω)`;
`ε0 = 23 + (26 + (21.448 − T·(46.815 + T·(0.00059 − 0.001813·T))) / 60) / 60`; `ε = ε0 + 0.00256·cos(Ω)`;
`δ = asin(sin ε · sin λ)` (declination); `y = tan²(ε/2)`;
`EoT = 4·deg(y·sin 2L0 − 2e·sin M + 4e·y·sin M·cos 2L0 − ½y²·sin 4L0 − 1.25e²·sin 2M)` minutes.

`sunPosition`: `minutes` = minutes since UTC midnight of `utcMs`; `TST = minutes + EoT + 4·longitude`; `HA = TST/4 − 180` (add 360 if < −180); `cos Z = sin φ sin δ + cos φ cos δ cos HA` (clamped to [−1, 1]); `elevationDeg = 90 − Z`; `azimuthDeg = wrap360(deg(atan2(sin HA, cos HA·sin φ − tan δ·cos φ)) + 180)`. No refraction correction.

`sunTimes`: `day0 = Date.UTC(year, month − 1, day)`; `noon = 720 − 4·longitude` minutes, then twice: `noon = 720 − 4·longitude − EoT(day0 + noon·60,000)`. With `δ` at `day0 + noon`: `arg = cos(90.833°) / (cos φ cos δ) − tan φ tan δ`. `arg > 1` → `polar: 'night'`, both times null; `arg < −1` → `polar: 'day'`, both null; else `H = deg(acos arg)`, sunrise `= day0 + (noon − 4H)·60,000`, sunset `= day0 + (noon + 4H)·60,000`, `polar: 'none'`. (90.833° = the sun's disc fully below the horizon with refraction: Wikipedia, Sunrise equation.)

### 9.4 Store and URL

- `AppState.clock: ClockState`; `Settings.clock: boolean` (default `true`). `initialState`: `clock = { utcMs: overrides.clockUtcMs ?? defaultClockUtcMs() }`.
- `step`: `clock = dt === 0 ? state.clock : { utcMs: state.clock.utcMs + dt·1000 }` (4.2 item 4): the clock runs with the time bar (×16 → 16 times faster) and stops when paused (owner). It runs in both boat modes.
- Actions: `{ type: 'setClock'; utcMs: number }` (ignored unless finite and `localParts` gives a year 1900–2100) and `{ type: 'setClockShown'; shown: boolean }`. "Now" is read from the device by the UI (`Date.now()`) and dispatched as `setClock`: the reducer stays pure and the real clock is read only when the user taps Now (ROADMAP architecture hook).
- `reset`: the default clock; `settings.clock` back to `true`.
- **URL**: `clk` = `clockParam(state.clock.utcMs)`, written when it differs from `clockParam(defaultClockUtcMs())` (so a link stores the time on board when it was shared, to the minute, and opens with the same sky: owner); `clock=0` when the clock is hidden. Parse: `parseClockParam`; missing or invalid → the default. Old links open at noon, 1 June.

### 9.5 UI

**Clock chip** (`ui/clockPanel.ts`, `createClockPanel(top: HTMLElement, store): HTMLElement`, appended to `.view-top` after the time bar in `app.ts`):
- A button `data-testid="clock-chip"`, class `clock-chip`, at least 44 × 44 px, text the local time `14:32` (24 h, from `localParts`), `aria-label` `Clock: 14:32, Monday 1 June 2026. Tap for the date, sunrise and sunset.` Hidden when `settings.clock` is false. It sits to the right of the time bar where the row has room, else it wraps under it aligned right (the `.view-top` flex row; `trackTopHeight` keeps the camera framing below it). The text is updated only when the minute changes.
- Tapping the chip opens or closes the **clock card** (`data-testid="clock-card"`, a `section` with `aria-label="Clock"`), positioned under the top area (`top: calc(var(--view-top-h) + 4px)`, `right: 8px`, `max-width: min(320px, calc(100% - 16px))`, above the 3D view like the alerts). Its open state is not stored. Content, top to bottom:
  1. `Monday 1 June 2026 · 14:32` (`data-testid="clock-date"`).
  2. `Adriatic (Split) · CEST (UTC+2)` (area name from `names.en`, abbreviation and offset from `localParts`).
  3. `Sunrise 05:16 · Sunset 20:28` (`data-testid="clock-sun"`, local times of `sunTimes` for the local date); polar day: `The sun does not set today.`; polar night: `The sun does not rise today.`
  4. `Light: Day` (`daylight(...)`: `Day`, `Low sun (sunrise or sunset light)`, `Twilight (the sun is just below the horizon)`, `Night`).
  5. Buttons `Now` (`clock-now`) and `Noon, 1 June` (`clock-default`), at least 44 px high.
  6. `Set a time:` a date input (`type="date"`, `clock-date-input`) and a time input (`type="time"`, `step="60"`, `clock-time-input`), both filled with the current local date and time when the card opens, and a `Set` button (`clock-set`) → `setClock(utcFromLocal(...))`; empty or invalid inputs do nothing.
  7. Hint: `The clock runs with the time bar: ×16 makes the sun move 16 times faster, and Pause stops it.`
  8. A close button `×` (44 px, `aria-label` `Close the clock`).
- **View tab**: a switch `Clock` (same component as the `Time bar` switch) with the hint `Shows the time on board over the 3D view.` → `setClockShown`.
- Debug overlay row `sun`: `elev 68.6° az 180.0° · Day`.

### 9.6 3D: the sun's light (`render3d/daylight.ts`)

```ts
export interface Daylighting { sunDirection: THREE.Vector3; sun: number; sky: number; warm: number; night: number }
export function daylighting(elevationDeg: number, azimuthDeg: number, headingDeg: number): Daylighting;
```
- Direction towards the sun in the boat frame: `east = sin(az)·cos(el)`, `north = cos(az)·cos(el)`, `up = sin(el)` (radians inside); `[x, z] = mapToBoat(east, north, heading)`; `sunDirection = (x, up, z)` normalised. For the light's position the elevation is never below 2° (`el' = max(el, 2°)`), so the shadow camera never looks up from below the water.
- `sun = smoothstep(−1, 8, el)`, `sky = 0.25 + 0.75·smoothstep(−12, 10, el)`, `warm = 1 − smoothstep(2, 25, el)`, `night = 1 − smoothstep(−12, 0, el)`.
- Each frame in `scene.render`: `{ elevationDeg, azimuthDeg } = sunPosition(state.clock.utcMs, area.position.latitudeDeg, area.position.longitudeDeg)`; then
  - sun light: position = `SCENE.shadowCentre + sunDirection(el') · SCENE.shadows.distance`, target the shadow centre; intensity = the detail's sun intensity × `sun`; colour = white lerped to `SCENE.daylight.warmSun` (`'#ffb46b'`) by `warm`; `castShadow` only at High detail and while `sun > 0.05`. `configureSunShadow` no longer places the light (it keeps the camera box).
  - hemisphere light intensity × `sky`; fill light intensity × `sky`, colour white lerped to `SCENE.daylight.moonColour` (`'#9fb3ff'`) by `night` (the moonlit night: owner).
  - `scene.backgroundIntensity = 0.15 + 0.85·smoothstep(−12, 6, el)` and the fog colour = `SCENE.sky.horizon` × the same factor (until M18 replaces the sky).
  - Water base colour (M16 vertex colours) lerped to `SCENE.daylight.nightWater` (`'#0b2230'`) by `night`.
- `SCENE.light.sunDirection` is removed (the clock decides). The old sky texture still has its fixed sun glow until M18.

### 9.7 Strings and registry

`en.json`: `clock.label` "Clock", `clock.chipAria` "Clock: {time}, {date}. Tap for the date, sunrise and sunset.", `clock.zone` "{area} · {abbr} (UTC+{hours})", `clock.sun` "Sunrise {rise} · Sunset {set}", `clock.polarDay` "The sun does not set today.", `clock.polarNight` "The sun does not rise today.", `clock.light` "Light: {light}", `clock.light.day` "Day", `clock.light.golden` "Low sun (sunrise or sunset light)", `clock.light.twilight` "Twilight (the sun is just below the horizon)", `clock.light.night` "Night", `clock.now` "Now", `clock.default` "Noon, 1 June", `clock.setLabel` "Set a time:", `clock.set` "Set", `clock.hint` (9.5), `clock.close` "Close the clock", `clock.weekday.0` … `clock.weekday.6` "Sunday" … "Saturday", `clock.month.1` … `clock.month.12` "January" … "December", `view.clock.label` "Clock", `view.clock.hint` "Shows the time on board over the 3D view.", `debug.sun` "sun". No registry entries (the chip is a control without a part).

### 9.8 Tests

`tests/clock.test.ts`, `tests/sun.test.ts`, `tests/physicsTruths3.test.ts`, URL cases in `tests/urlState.test.ts`. Sun values come from the prototype of these equations (2026-10-13); the equations' published accuracy is about 1–2 minutes.

1. `lastSundayUtcMs(2026, 3)` = 2026-03-29 01:00 UTC (1,774,746,000,000); `(2026, 10)` = 2026-10-25 01:00 UTC; `(2027, 3)` = 2027-03-28; `(2027, 10)` = 2027-10-31.
2. `localParts`: 2026-06-01 10:00 UTC → 12:00, Monday (weekday 1), offset 120, summer; 2026-12-21 11:00 UTC → 12:00, offset 60; one second before and at 2026-03-29 01:00 UTC → 01:59:59 CET and 03:00:00 CEST.
3. `utcFromLocal`: (2026, 6, 1, 12, 0) = `defaultClockUtcMs()` = 1,780,308,000,000; (2026, 12, 21, 12, 0) = 2026-12-21 11:00 UTC; (2026, 3, 29, 2, 30) = 01:30 UTC; (2026, 10, 25, 2, 30) = 00:30 UTC. Round trip `localParts(utcFromLocal(...))` for every hour of 2026-06-01 and 2026-12-21.
4. `parseClockParam`: `202612211200` → 2026-12-21 11:00 UTC; `202602301200`, `202613011200`, `202606012460`, `12`, `abc` → null; `clockParam(defaultClockUtcMs())` = `202606011200`.
5. `sunTimes` at Split (43.508, 16.44), each ± 2 min (UTC): 2026-06-01 sunrise 03:16, sunset 18:28, noon 10:52; 2026-06-21 03:13, 18:39; 2026-12-21 06:24, 15:21; 2026-03-20 04:57, 17:06, noon 11:02. Latitude 80, 2026-12-21 → `polar: 'night'`, times null (no NaN); latitude 80, 2026-06-21 → `polar: 'day'`.
6. `sunPosition` at Split on 2026-06-01 (± 0.3°): 04:00 UTC elevation 6.15, azimuth 65.27; 06:00 → 27.06, 84.46; 10:00 → 66.01, 149.10; 14:00 → 45.86, 256.52; 18:00 → 3.63, 297.40; at the noon of test 5: elevation 68.6.
7. **PT-46 the sun's path**: Split 2026-06-01: the azimuth at sunrise is 45–90° (north-east to east), at sunset 270–315° (west to north-west), at noon 180° ± 1 (due south); the day on 2026-06-01 is more than 5 h longer than on 2026-12-21 (prototype 15 h 12 min vs 8 h 57 min).
8. `daylight`: 10 → day, 3 → golden, −3 → twilight, −10 → night. `daylighting` at elevation 30: sun 1, sky 1, night 0; at −20: sun 0, sky 0.25, night 1; azimuth 180, elevation 10, heading 0 → `sunDirection.x < −0.9` (the sun astern when sailing north); heading 90 → `sunDirection.z > 0.9` (to starboard when sailing east).
9. Store: 60 s of frames at 60 fps with ×16 advance the clock by 960 ± 1 s; paused: unchanged (same object); Held still with Steady wind (time bar shows Pause only): it advances at ×1. `setClock` with NaN or year 2200 → unchanged. Reset → default clock.
10. **URL**: `?clk=202612211200` opens at 2026-12-21 11:00 UTC; round trip; the default writes no `clk`; 61 s after the default the link has `clk=202606011201`; `clock=0` round trip; an invalid `clk` opens the default.

### 9.9 Browser checks (`scripts/shots-m17.mjs`)

Scenes: `clock-chip` (`?wd=90&ws=12&ms=40&js=100`), `clock-card` (same, the chip tapped), `light-low-sun` (`?wd=90&ws=12&ms=40&js=100&clk=202606012010&cam=side-starboard`), `light-night` (`?wd=90&ws=12&ms=40&js=100&clk=202606012300&cam=side-starboard`).
Live checks (`liveM17Checks`):
- Default link: the chip reads `12:00`; tap it: the card shows `Sunrise 05:16 · Sunset 20:28` and `Light: Day`.
- With `&tx=16`, after 15 s the chip reads `12:04` (± 1 minute); press Pause, wait 3 s: unchanged.
- In the card, set 2026-12-21 12:00 and tap Set: `Sunrise 07:24 · Sunset 16:21`, the address bar has `clk=202612211200`.
- Tap Now: the address bar's `clk` changes to a valid 12-digit time.
- View tab → Clock off: the chip disappears and the address bar has `clock=0`.
- The night scene's canvas is darker than the noon scene's (mean luminance of the canvas below 50 % of noon's).
- Accessibility audit (`auditPage`) on the open clock card.

### 9.10 Done when

All M17 checks in `WORKFLOW.md` pass on the phone; the tests pass; the scenes looked at. The PR description says `Closes #26`.

### 9.11 Not in M17

No new sky colours, stars or sun glow in the right place (M18). No moon. Winds do not follow the clock (Phase 6). No other areas or area chooser (later).

---

## 10. M18: Sky through the day

**Independent review: not needed** (visuals only: sky colours, glow, stars, reflections; no model, state or link change).

### 10.1 Files

New: `src/render3d/skyDome.ts`, `src/render3d/skyColours.ts`, `tests/skyColours.test.ts`, `scripts/shots-m18.mjs`.
Changed: `src/render3d/scene.ts` (dome instead of the background texture, fog colour, reflections), `src/render3d/environment.ts` (`skyTexture` → `cloudTexture`), `src/render3d/sceneConfig.ts` (`SCENE.skyByElevation`), `scripts/shots.mjs`, `docs/CODE_MAP.md`.

### 10.2 Data (`sceneConfig.ts`, presentation)

`SCENE.skyByElevation`, rows sorted by the sun's elevation (degrees); colours are interpolated between neighbouring rows in three.js's linear working space (`Color.lerp`), numbers linearly; below the first row and above the last the end row is used. The rows at 20° and 90° are today's sky (`SCENE.sky`):

| elevDeg | zenith | horizon | glow | cloud | glowStrength | haloStrength | stars |
|---|---|---|---|---|---|---|---|
| −18 | `#03060f` | `#0b1424` | `#1a2440` | `#141a26` | 0 | 0 | 1 |
| −6 | `#0e1a3a` | `#3a3f63` | `#7a5a7a` | `#3a3a55` | 0.3 | 0.3 | 0.6 |
| 0 | `#2c4a7a` | `#f0a070` | `#ffb070` | `#e0a090` | 1 | 1 | 0 |
| 6 | `#4a7ab0` | `#f2c9a0` | `#ffd9a0` | `#f4e0d0` | 0.9 | 0.6 | 0 |
| 20 | `#5f97c8` | `#d6e7f2` | `#fff6e0` | `#ffffff` | 0.8 | 0.15 | 0 |
| 90 | `#5f97c8` | `#d6e7f2` | `#fff6e0` | `#ffffff` | 0.8 | 0.1 | 0 |

Write it in `sceneConfig.ts` as an array of `{ elevDeg, zenith, horizon, glow, cloud, glowStrength, haloStrength, stars }`. `SCENE.sky.belowHorizon` stays; at night it is lerped to `'#030a10'` by M17's `night`.

### 10.3 Sky colours (`render3d/skyColours.ts`)

```ts
export interface SkyColours { zenith: THREE.Color; horizon: THREE.Color; glow: THREE.Color; cloud: THREE.Color; glowStrength: number; haloStrength: number; stars: number }
export function skyColours(elevationDeg: number): SkyColours;
```

### 10.4 The sky dome (`render3d/skyDome.ts`)

```ts
export interface SkyDome { object: THREE.Mesh; update(camera: THREE.Camera, colours: SkyColours, sunDirection: THREE.Vector3, headingDeg: number, below: THREE.Color): void }
export function buildSkyDome(clouds: THREE.Texture): SkyDome;
```
- `new THREE.SphereGeometry(900, 48, 24)` with a `THREE.ShaderMaterial` (`side: THREE.BackSide`, `depthWrite: false`, `depthTest: false`, `fog: false`), `renderOrder = −1`, `frustumCulled = false`. Each frame its position is copied from the camera, so the sky is always 900 m away in every direction (the camera's far plane is 1000).
- Uniforms: `uZenith`, `uHorizon`, `uBelow`, `uGlow`, `uCloud` (vec3), `uSunDir` (vec3, boat frame, unit), `uGlowStrength`, `uHalo`, `uStars`, `uHeading` (radians), `uCloudOpacity` (`SCENE.sky.cloudOpacity`), `uClouds` (sampler2D).
- Vertex shader: `vDir = position` (the sphere is centred on the camera); standard `gl_Position`.
- Fragment shader, in this order:
  1. `d = normalize(vDir)`; `el = asin(clamp(d.y, −1, 1))`.
  2. Gradient as the old texture: `t = el < 0 ? min(1, −el / 0.25) : pow(max(0, sin(el)), 0.6)`; `col = mix(uHorizon, el < 0 ? uBelow : uZenith, t)`.
  3. The direction on the map (clouds and stars stay fixed on the map while she turns; the world group turns the map by +heading about y, so undo it): `mx = d.x·cos(h) − d.z·sin(h)`, `mz = d.x·sin(h) + d.z·cos(h)`, `my = d.y`, with `h = uHeading`.
  4. Clouds: `u = atan(mz, mx) / (2π) + 0.5`, `v = el / π + 0.5`; `a = texture2D(uClouds, vec2(u, v)).a`; `band = el > 0 ? sin(min(1, el / 0.9)·π) : 0`; `col = mix(col, uCloud, a·band·uCloudOpacity)`.
  5. Sun: `s = max(0, dot(d, uSunDir))`; `col += uGlow·(pow(s, 48)·0.8·uGlowStrength + pow(s, 4)·0.25·uHalo)`.
  6. Stars (only when `uStars > 0` and `el > 0`): `cell = floor(vec2(atan(mz, mx), asin(my)) · (180/π) · 2)` (half-degree cells); `n = fract(sin(dot(cell, vec2(12.9898, 78.233)))·43758.5453)`; `col += vec3(step(0.996, n)·uStars·smoothstep(0, 0.15, el))`.
  7. `gl_FragColor = vec4(col, 1)`, followed by `#include <tonemapping_fragment>` and `#include <colorspace_fragment>` so it matches the rest of the scene.
- `environment.ts`: `skyTexture()` becomes `cloudTexture()`: the same noise octaves and the same `smoothstep(0.5, 0.72, n / weight)` cloud amount, written as an RGBA `DataTexture` (1024 × 512, white, alpha = the cloud amount, no band and no colours), linear filtering, `RepeatWrapping` in u.

### 10.5 Scene changes

- `scene.background` is no longer set (the dome draws the sky); M17's `backgroundIntensity` line goes. Each frame: `colours = skyColours(el)`; `dome.update(camera, colours, daylighting.sunDirection, boat.headingDeg, below)`; `scene.fog.color.copy(colours.horizon)`.
- **Reflections (High detail)**: `scene.environment` comes from a small scene holding a second mesh with the dome's geometry and material at the origin: `pmrem.fromScene(skyScene, 0, 0.1, 1000).texture`. It is regenerated when High detail is first used, and afterwards only when the sun's boat-frame direction has turned by 3° or more since the last one (heading changes count), at most once per second of real time (this throttle is the second allowed use of the frame time `now`, after the camera tween); the old render target is disposed. Low detail never makes one.
- Night readability (owner): the M17 floor (`sky ≥ 0.25`, the moon-coloured fill light) stays; nothing else is needed.

### 10.6 Tests

`tests/skyColours.test.ts`: `skyColours(20)` and `skyColours(90)` give today's zenith `#5f97c8` and horizon `#d6e7f2` (`getHexString`); `skyColours(−30).stars` = 1; `skyColours(3).glowStrength` = 0.95 (halfway between 0° and 6°); `skyColours(−6).horizon` = `#3a3f63`.

### 10.7 Browser checks (`scripts/shots-m18.mjs`)

Scenes (`cam=side-starboard` and `cam=helm`, link base `?wd=90&ws=12&ms=40&js=100`): `sky-noon` (no `clk`), `sky-low-sun` (`clk=202606012005`), `sky-sunset` (`clk=202606012028`), `sky-twilight` (`clk=202606012050`), `sky-night` (`clk=202606012300`), `sky-sunrise` (`clk=202606010530`).
Live checks (`liveM18Checks`):
- Night: the mean luminance of the top fifth of the canvas is below 25 % of noon's; at least 5 pixels of that area are brighter than its mean + 0.3 (stars); the mean luminance of a 60 × 60 px square at the canvas centre (the boat) is above 0.08 (readable).
- Sunset (`clk=202606012028&debug=1`): the debug overlay's `sun` row shows an elevation between −1° and +1°; the mean luminance of the top fifth of the canvas is between the night's and noon's.
- No console errors from the shader at both details.

### 10.8 Done when

All M18 checks in `WORKFLOW.md` pass on the phone; the scenes looked at (phone first, then one wider size).

### 10.9 Not in M18

No moon, no weather (rain, fog banks, cloud cover changes), no light pollution or coastline lights.

---

## 11. M19: Polish and Phase 3 sign-off

**Independent review: not needed** (polish and sign-off; the owner's phone check covers it).

- **Performance on the owner's phone**, the heaviest case: `?wd=90&ws=20&ms=40&js=100&sea=open&wm=gusty&tx=16&clk=202606012030&debug=1` at Detail Low and High. Target as before: FPS 50 or more, "Slowest" never above 33 ms. If it misses, apply these in order and re-measure after each (each is a presentation value in `SCENE`): (1) Low detail: the outer water's colours every second frame; (2) Low detail: the inner wave mesh's `halfSizeM` 100 → 80 (fade 56 → 80); (3) High detail: reflections regenerated at most every 3 s. Report before/after in the PR.
- **Accessibility audit** (`scripts/a11y-audit.mjs`): the Waves block, the clock chip and card, the View tab's Clock switch, the map with buoys.
- `tests/stepCost.test.ts` keeps its 3 ms limit with the M15 case.
- **Docs**: README describes Phase 3; `BOAT_REFERENCE.md` lists every Phase 3 assumption; `PHYSICS_TRUTHS.md` statuses updated from the sources read; ROADMAP Phase 3 status; `CODE_MAP.md` current.
- **Done when:** every item of section 12 is ticked in the PR.

## 12. Definition of Done (Phase 3)

- [ ] Waves grow with the wind and the Waves setting (Flat, Sheltered, Coastal, Open sea), build over minutes, and are fixed on the map while she sails through them.
- [ ] The boat heaves, pitches and rolls on them: head seas pitch, beam seas roll; Held still bobs but its sails are Phase 1.
- [ ] The sails feel the rocking (the apparent wind swings), waves from behind at an angle make the autopilot work, head seas slow her; Flat is Phase 2 exactly.
- [ ] Pause freezes everything in the 3D view (issue #32).
- [ ] The water darkens in wind, white horses appear from about 7 kn, and a gust can be seen coming in gusty wind.
- [ ] Four buoys mark the start area in 3D and on the map and can be tapped.
- [ ] The clock shows local time and date, runs with the time bar, starts now, at a chosen time or at noon, 1 June; sunrise and sunset are right for Split (issue #26).
- [ ] The sun lights the boat from the right side; the sky goes through day, sunset, twilight and night with stars, and the boat stays readable at night.
- [ ] State round-trips through the URL (`sea`, `clk`, `clock`); Phase 1 and 2 links still open (with Coastal waves at noon, 1 June).
- [ ] Smooth on the owner's phone; all tests green in CI; no console errors.
- [ ] Docs updated: README, `BOAT_REFERENCE.md`, `PHYSICS_TRUTHS.md`, ROADMAP, `CODE_MAP.md`.

## 13. Decisions and open questions

Decided with the owner (2026-10-13, "accept all" on the planning outline): waves first (M14–M16), then the clock (M17–M18); a Waves setting Flat / Sheltered / Coastal / Open sea opening on Coastal; waves follow the wind over minutes, not gusts, and a link opens with waves matching its wind; old links open with Coastal waves; Held still bobs but its sails ignore the motion; motion true to size; gusts visible on the water; the wind streaks stay; four yellow buoys 200 m N, E, S and W of the start, also on the map and tappable, no collisions; the Adriatic reference point is Split; night is dark blue with stars but readable, no navigation lights; the clock runs with simulated time (×16 faster, Pause stops it); the link stores the time on board (to the minute), "Now" reads the device clock once; issues #33 and #34 are fixed with `/bug` before M14, #32 in M14; the 0.4 m sheet give of the gybe load stays until the skipper answers.

Decided in planning: the waves' phase is kept at the boat (6.3), so the waves stay fixed on the map over kilometres and a changing wind never makes them jump; `initialState()` defaults to Flat so Phase 1 and 2 tests stay unchanged, while links and Reset default to Coastal; the clock is stored as UTC and shown in the area's time zone by a pure EU summer-time rule (no device time zone); the wave growth formula is JONSWAP's, capped at a fully developed sea; the feedback values (yaw push, extra resistance) are teaching fits calibrated in the prototype.

Open (none blocks a milestone): the JONSWAP coefficients' source page (US Army Corps of Engineers) could not be opened from the cloud environment; PT-43 and PT-45 have no reachable source yet (see PHYSICS_TRUTHS).
