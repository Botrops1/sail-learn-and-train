# Phase 3 specification: basic environment

Status: **done** (M14–M19; M19 in PR #51), signed off by the owner · Last updated: 2026-10-14

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
- Issues **#33** (wind slider in changing wind) and **#34** (Pause button in Held still): fixed before Phase 3 (PR #42). M14 extends #34's rule for waves (6.4).

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
| Time | `step` stays the only clock: waves, buoys, streaks, ripples and the on-board clock all advance with the simulated `dt` (×16 speeds them up; paused, they stand still). Nothing in `src/render3d` reads `performance.now()` or the frame time for motion. Two exceptions, neither of them motion: the camera's preset transition (`cameraRig.ts`) and the throttle on regenerating reflections (M18). |
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

Each milestone is one PR, small enough to check on a phone in 15 minutes. **Independent review: required** means the owner runs `/review <PR>` (new Code session, Opus, medium effort) as soon as the PR opens, before testing it on the phone.

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
Changed: `content/boat/hanse508.json` (top-level `waves`, `physics.waveResponse`), `src/app/urlSync.ts`, `src/model/angles.ts` and `src/model/boomSolver.ts` (3.2), `src/model/mapFrame.ts` (`boatToMap`), `src/model/timeScale.ts` (`pauseAvailable`), `src/ui/timeBar.ts` (its call), `tests/timeBar.test.ts` (new cases), `src/model/motion.ts` (`BoatState.waves`, `stepBoat`), `src/app/store.ts`, `src/app/urlState.ts`, `src/render3d/scene.ts`, `src/render3d/world.ts`, `src/render3d/wake.ts`, `src/render3d/sceneConfig.ts`, `src/ui/windPanel.ts`, `src/ui/debugOverlay.ts`, `content/i18n/en.json`, `content/registry/parts.json`, `tests/urlState.test.ts` (and the tests allowed in 6.8 item 11), `scripts/shots.mjs`, `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md`.

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

**Tunable in M14** (only if a band in 6.8 fails after an exact implementation): `heaveLagS`, `pitchLagS`, `rollLagS` (the same value for all three).

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
/** `waves.defaultSetting` as a SeaSetting (the JSON value is a plain string; falls back to 'coastal'). */
export function defaultSeaSetting(data: BoatData = boat): SeaSetting;
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
- `initialSea(setting, wind)`: `{ setting, windKn: wind.twsKn, dirDeg: wrap180(wind.dirDeg) }` (a link opens with waves already matching its wind; owner).
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
- `reset`: `initialState({ settings: { debug, detail }, sea: defaultSeaSetting() })` (the rest as now).
- `setBoatMode`: unchanged; the wave motion is kept.
- **Pause in Held still** (extends issue #34, PR #42): `pauseAvailable(boatMode, windMode, ropesMode, seaSetting: SeaSetting = 'flat')` in `timeScale.ts` is also true when `seaSetting !== 'flat'` (the waves move, so Pause means something again; the "Held still" chip shows only with Flat water, a steady wind and Easy ropes). `store.ts` (`withTimeRule`) and `timeBar.ts` pass `state.sea.setting`; `setSeaSetting` goes through `withTimeRule` (switching to Flat while paused in Held still un-pauses, as #34's rule does). New cases in `tests/timeBar.test.ts`: `pauseAvailable('held', 'steady', 'easy', 'coastal')` true, `(…, 'flat')` false. The existing #34 browser checks open Flat (the `openPage` rule in 6.9), so they keep seeing the chip.
- **URL** `sea` = `flat` | `sheltered` | `coastal` | `open`. Written only when not `coastal`, after the `windModeParams` and before the `engineParams` (`…&bs=6.8&sea=flat&debug=1`). A link without `sea`, or with an unknown value, opens **Coastal** (owner: old links open with Coastal waves). The time in the waves is not stored: a link starts the waves at their initial phases.
- `parseUrlState` passes `sea: <the link's setting if isSeaSetting, else defaultSeaSetting()>` to `initialState`.
- `urlSync.ts`: the early return ("nothing the link shows changed") also requires `state.sea.setting === previous.sea.setting`; otherwise tapping a Waves button would not reach the address bar.

### 6.5 UI

**Waves block** (`ui/wavesPanel.ts`, `createWavesPanel(store): HTMLElement`), in the Wind tab directly after the wind-change block (`...createWindModePanel(store)`) and before the presets (`createWindPanel`'s returned list). A `fieldset` built exactly like the wind-mode block (`windModePanel.ts`: radio inputs inside `label.segment`, styled by `.segment:has(input:checked)`), `class="field segmented"`, `data-part-id="env_water"`, `data-testid="sea-setting"`:
- Legend `Waves`.
- Four radio segments `Flat` `Sheltered` `Coastal` `Open sea` (`name="sea-setting"`, `data-testid` `sea-flat`, `sea-sheltered`, `sea-coastal`, `sea-open`, at least 44 px high), each dispatching `setSeaSetting`.
- Status line (`data-testid="sea-status"`, `aria-live="polite"`), updated only when its text changes:
  - Flat: `Flat water: no waves.`
  - No trains (wind too light): `Almost flat: the wind is too light to make waves.`
  - Otherwise: `Waves 0.7 m high, one every 3.8 s, from 045°` (height: `significantHeightM(trains)` with 1 decimal; period: the main train's `periodS` with 1 decimal; direction: `String(Math.round(compassDeg(sea.dirDeg)) % 360).padStart(3, '0')`, as `windPanel.ts` writes bearings).
- Hint (`p.hint`): `How big the waves get depends on the wind and on how far it blows over open water: little in a sheltered bay, more along the coast, most in the open sea. The height is that of the bigger waves; single waves can be almost twice as high. Waves build up over a few minutes when the wind changes.`

**Debug overlay**: two rows at the end of the list: `waves` `Hs 0.68 m · Tp 3.8 s · from 045°` (`–` with no trains); `wave motion` `heave 0.12 m · pitch 1.2° · roll 2.0°`.

### 6.6 3D

**Water surface** (`render3d/waterSurface.ts`, replacing `buildWater` and the `GridHelper` in `scene.ts`):

```ts
export interface WaterSurface {
  /** Added to the world group (moved by `world.update`). */
  object: THREE.Group;
  /** The flat invisible plane the picker hits (part id env_water). */
  pickTarget: THREE.Object3D;
  setDetail(detail: Detail): void;
  /** Heights, normals and ripples for the state; `shift` is what world.update returned; `trains` = waveTrains(state.sea), computed once per frame in scene.render. */
  update(state: AppState, shift: { x: number; z: number; centreEastM: number; centreNorthM: number }, trains: readonly WaveTrain[]): void;
  /** The drawn surface height at a map offset from the boat: elevation × the inner mesh's fade at that point (0 beyond the inner mesh), for the wake and (M16) the buoys. */
  heightAt(dEastM: number, dNorthM: number): number;
}
export function buildWaterSurface(ripples: THREE.Texture): WaterSurface;
```

- New `SCENE.water` keys: `waves: { cellM: 2, cellLowM: 4, halfSizeM: 100, fadeStartM: 70 }`, `stepM: 20`, `outerCellM: 20`. `SCENE.water.size` stays 600 (M16 changes it). `SCENE.grid.size` is removed (the grid is now the wave mesh's lines); `SCENE.grid.cellSize` is removed (it is the wave cell).
- `world.update` shifts the water group by `waterShift(eastM, northM, SCENE.water.stepM)` (was the grid cell). Every vertex of both meshes then sits on a fixed map point (multiples of 2 m), so nothing swims when the group steps. `world.update` returns `{ x, z, centreEastM, centreNorthM }` (the `waterShift` result; it used to return `{ northM, eastM }`: update `scene.ts`).
- **Inner wave mesh**: a square grid of `(2·halfSizeM / cell + 1)²` vertices, `cell = cellM` at High detail and `cellLowM` at Low (rebuilt by `setDetail`). Vertex local position `(x, y, z)` with `x, z ∈ [−halfSizeM, halfSizeM]` (local x = north, z = east). Each frame, for each vertex: `ΔN = shift.x + x`, `ΔE = shift.z + z`; `f = 1 − smoothstep(fadeStartM, halfSizeM, max(|x|, |z|))`; `{eta, dEast, dNorth} = elevationAndSlope(trains, phases, ΔE, ΔN)`; `y = f·eta`; normal = normalize(`−f·dNorth`, 1, `−f·dEast`) in local (x, y, z). Write `position` and `normal` and set `needsUpdate`; `frustumCulled = false`. With no trains: set every y to 0 and every normal to (0, 1, 0) once, then skip the height work until trains return (`setDetail` rebuilds the mesh and clears that "already flat" flag). `heightAt(ΔE, ΔN)`: local `x = ΔN − shift.x`, `z = ΔE − shift.z`, the same fade `f`, `f · elevation(...)`. `trains = waveTrains(state.sea)`, `phases = state.boat.waves.phases`.
- **UVs** for the ripple normal map (both meshes): `u = x / rippleTileM`, `v = −z / rippleTileM` (the plane's u runs north, its v runs west, as before); `ripples.repeat = (1, 1)`; the offset as now, from the plane centre's map position (`centreNorthM`, `centreEastM`) and the drift, with the drift's time from **`state.rig.timeS`** (was the frame time: issue #32). The ripple strength keeps scaling with the wind now (`state.wind.twsKn`, as M10 did).
- **Grid lines**: `THREE.LineSegments` that share the inner mesh's `position` attribute, with an index joining neighbouring vertices along every row and every column (so the lines follow the waves and are 2 m apart at High, 4 m at Low). Same colour and opacities as the old grid (`SCENE.grid.color`, `opacity`, `opacityHigh`), `depthWrite: false`, `renderOrder` one higher than the water.
- **Outer water**: a flat mesh at y = 0 covering `SCENE.water.size` in cells of `outerCellM`, with the triangles of every cell whose centre lies inside the inner square (`max(|cx|, |cz|) < ` the inner mesh's current half-size) left out (rebuilt in `setDetail`, because M19 may give Low detail a smaller inner mesh); same materials and UV rule as the inner mesh. Inner and outer meet at the square's edge, where the fade has brought the waves to y = 0.
- Materials as before (`high` standard, `low` Lambert; colours, opacity, `depthWrite: false`); `receiveShadow` on the inner mesh. Both meshes and the grid carry `userData.partId = 'env_water'`.
- **Pick target**: a flat `PlaneGeometry(SCENE.water.size, SCENE.water.size)` mesh at y = 0 with `new THREE.MeshBasicMaterial({ visible: false })` (the raycaster still hits it), part id `env_water`, in the water group. `createPicker(camera, holder, water.pickTarget)` (`picking.ts` itself needs no change).
- **Boat**: `holder.position.y = boat.waves.heaveM`; `holder.rotation.set((boat.heelDeg + boat.waves.rollDeg)·DEG, 0, boat.waves.pitchDeg·DEG)`. The camera, the water, the wake and the streaks do not rock.
- **Wake** (`wake.ts`): each ribbon point's `y = SCENE.wake.y + water.heightAt(point.eastM − boat.eastM, point.northM − boat.northM)`. `Wake.update(state, timeS, heightAt)` gains `heightAt: (dEastM: number, dNorthM: number) => number` (scene.ts passes `water.heightAt`).
- **Wind streaks**: `streaks.update(awa, aws, state.rig.timeS)` (was the frame time: issue #32). With the ripples, nothing in the 3D view moves while paused except a camera move.

### 6.7 Strings and registry

`en.json`: `waves.label` "Waves", `waves.flat` "Flat", `waves.sheltered` "Sheltered", `waves.coastal` "Coastal", `waves.open` "Open sea", `waves.hint` (6.5), `waves.status` "Waves {height} m high, one every {period} s, from {compass}°", `waves.statusFlat` "Flat water: no waves.", `waves.statusCalm` "Almost flat: the wind is too light to make waves.", `debug.waves` "waves", `debug.waveMotion` "wave motion".

Registry: `env_water` gets a new `short.en`: "The sea surface. Waves grow with the wind and with how far it has blown over open water (Wind tab → Waves); the boat rises, pitches and rolls on them. See-through so the keel and rudder stay visible." (status stays `draft`).

### 6.8 Tests

`tests/waves.test.ts`, `tests/physicsTruths3.test.ts`, URL cases in `tests/urlState.test.ts`. Prototype values in brackets.

1. **PT-39 wave size** (`seaSize`, ±0.005 m, ±0.01 s): 15 kn, 30 km → 0.683 m, 3.832 s; 20 kn, 150 km → 2.036 m, 7.212 s; 12 kn, 5 km → 0.223 m, 1.958 s; 25 kn, 30 km → 1.138 m, 4.543 s; 30 kn, 10⁷ km (fully developed) → 5.907 m, 12.797 s; 0 kn or fetch 0 → height 0. Height strictly increases with the wind (fetch 30 km, 2 … 30 kn in 1 kn steps) and with the fetch at 15 kn over 1, 5 and 30 km; at 15 kn, 150 km and 1000 km give the same height, the fully developed `0.2433·U²/g` = 1.477 m (Open sea at 15 kn is already fully developed).
2. `waveTrains`: Flat → `[]`; Coastal at 1 kn → `[]` (height 0.007 m); Coastal at 2 kn → 3 trains (0.026 m, period 1.0 s). `significantHeightM(waveTrains(...))` equals `seaSize(...).heightM` (1e-9). Main train `fromDeg` = `sea.dirDeg`; with `dirDeg` 0 the main train travels south (`dirEast` 0, `dirNorth` −1, 1e-12).
3. **Phase at the boat** is the map-fixed wave: `trains = waveTrains(initialSea('coastal', { dirDeg: 20, twsKn: 15 }))`, kept the same throughout; a boat starting at the map origin sails at 6 m/s on heading 30 for 60 s: 3,600 calls of `stepWaveMotion(wm, trains, 6, 30, 1/60)`, the test integrating her position itself (`east += 6·sin(30°)/60`, `north += 6·cos(30°)/60`). Then for the map points p = (pE, pN) = (0, 0), (30, −20), (−40, 10), (12, 45), (−25, −35) (east, north, from the origin), `elevation(trains, wm.phases, pE − east, pN − north)` equals `Σ aᵢ cos(kᵢ·(dᵢ·p) − ωᵢ·60 + phaseRadᵢ)` (p in map coordinates from the origin) within 1e-6 m.
4. `stepSea`: start `initialSea('coastal', { dirDeg: 0, twsKn: 10 })`, then 10,800 calls `stepSea(sea, { dirDeg: 0, twsKn: 20 }, 1/60)`: `windKn` = 16.32 ± 0.01; the same at 30 and 120 fps within 1e-6; direction 0 → 90 after 180 s: 56.9° ± 0.1; 170 → −170 after 180 s: −177.4° ± 0.1 (it turns 20° across ±180, not 340°); `dt = 0` returns the same object.
5. **PT-40 the boat follows the waves** (`initialState({ sea: 'coastal', boat: { mode: 'held' }, controls: { ctl_wind_dir, ctl_wind_speed } })`, then 3,600 `step` actions of `dt` 1/30 through `reduce`; the largest absolute value of `boat.waves.pitchDeg`, `rollDeg`, `heaveM` over the frames with t ≥ 40 s): wind 15 kn from 0 (waves from ahead, heading 0): pitch 2.3–3.5° [2.90] and roll smaller than pitch [1.79]; wind 15 kn from 90 (beam on): roll 4.1–6.1° [5.08] and pitch smaller than roll [1.29]; `sea: 'open'`, wind 20 kn from 0: heave 0.65–1.0 m [0.83], pitch 4.0–6.0° [4.96].
6. **M14 does not change the sailing**: Sailing, wind 15 kn from 135, main sheet 100, jib sheet 100, autopilot heading, 60 s at 30 fps, once with `sea: 'coastal'` and once with `'flat'`: `speedMps`, `headingDeg`, `heelDeg`, `eastM`, `northM` and `rig.wind` are identical (`toBe` / `toEqual`); the coastal run's wave motion is not zero.
7. **Flat**: 60 s Sailing and 60 s Held still with `sea: 'flat'`: the wave motion stays exactly 0 and the phases unchanged; Held still + Flat: `stepBoat(...).boat` is the input boat object (`toBe`).
8. **Pause** (issue #32): `{ ...initialState({ sea: 'coastal' }), paused: true }`, 100 steps: `sea` and `boat.waves` are the same objects (`toBe`).
9. Frame-rate independence of the motion: Held still, Coastal, wind 15 kn from 45, 60 s at 30, 60 and 120 fps: heave within 0.01 m, pitch and roll within 0.1° of each other at t = 60 s.
10. **URL**: round trip of every setting; `?wd=60` → Coastal; `?sea=storm` → Coastal; Coastal writes no `sea`; Flat writes `sea=flat`. Reset → Coastal with `sea.windKn` = the wind now.
11. All Phase 1 and Phase 2 tests green **unchanged** (they build states with `initialState`, which defaults to Flat). Allowed changes, nothing else: (a) a URL test that compares a parsed old link with a state built by `initialState(...)` may add `sea: 'coastal'` to the overrides; (b) a URL test that compares `serializeUrlState(initialState(...))` with an exact string passes `sea: 'coastal'` to that `initialState` (every such test in `tests/urlState.test.ts`); (c) a Phase 1/2 test that opens a link with `parseUrlState` and then steps it or compares the boat gets `&sea=flat` appended to its link. The PR lists every changed test file.

### 6.9 Browser checks (`scripts/shots-m14.mjs`)

Scenes (`M14_SCENES`, every size; labels contain "m14" so they open Sailing):
- `waves-coastal`: `?wd=90&ws=15&ms=50&js=100&cam=side-port`, wait 3 s.
- `waves-open`: `?wd=45&ws=20&ms=20&js=0&sea=open&cam=bow`, wait 3 s.
- `waves-flat`: `?wd=90&ws=15&ms=50&js=100&sea=flat`, wait 3 s.
- `waves-panel`: `?wd=90&ws=15`, Wind tab, scrolled to `[data-testid="sea-setting"]`.

Live checks (`liveM14Checks`):
- Coastal link: the status line reads `Waves 0.7 m high, one every 3.8 s, from 090°`; after 2 s the debug overlay (`&debug=1`) shows a heave (`/heave (-?\d+\.\d+)/`) whose absolute value is above 0.005 at least once in 5 readings 0.5 s apart.
- Tap `sea-open`: the status changes to a height of 1.5 m (15 kn over 150 km), the address bar gets `sea=open`; tap `sea-coastal`: `sea` disappears from the address bar.
- Pause (#32): with `?wd=90&ws=15`, press Pause (`pause-button`), wait 300 ms, take two element screenshots of `canvas.scene-canvas` 1 s apart: the PNG buffers are identical.
- `?wd=90&ws=15&held=1&debug=1`: Held still, the wave motion rows show a non-zero roll; the top line (the instrument strip) still says "Held still", while the time bar shows Pause instead of its "Held still" chip (the water moves).
- Tap on open water: the info card shows "Water surface".
- Register in `shots.mjs`: import, `...M14_SCENES` with the `m14-` prefix, `liveGroups.m14`.
- **Older scenes and checks keep their Phase 2 picture:** `openPage` in `shots.mjs` adds `sea=flat` to the link of every scene and check whose label does not match `/m1[4-9]/` and whose query has no `sea=` (the same way it adds `held=1` for the Phase 1 ones; skip it when the query already has `sea=`). Without it the boat would rock under the tap sweep and the Phase 2 checks. The general checks that compare the whole address bar (`expectUrl` in `shots.mjs`, the strings ending in `&held=1`) expect `sea=flat` in the place `serializeUrlState` writes it (after the boat and wind-mode parameters, so `…&held=1&sea=flat…`); any other check that compares `window.location.search` gets the same.

### 6.10 Done when

All M14 checks in `WORKFLOW.md` (section 8) pass on the phone; the tests above pass; the PNGs of the four scenes looked at (phone size first). `BOAT_REFERENCE.md` rows for the new keys checked; `CODE_MAP.md` updated. The PR description says `Closes #32`.

### 6.11 Not in M14

No feedback from the waves into the sailing (M15). No whitecaps, gust patches, buoys or horizon change (M16). No clock (M17). The camera does not ride the waves: in the Open sea the Helm view's eye can dip towards the cockpit at a crest (accepted, as with heel).


### 6.12 Decided in the M14 PR

Open points decided while building (the owner's answers on the PR are added below when they come):

- **Debug rows:** the two wave rows (`waves`, `wave motion`) come after the `Build` row, as "at the end of the list" says.
- **Time bar in Held still with waves:** Pause shows (6.4), but the speed part (`timeSpeedAvailable`) is unchanged: with a steady wind in Held still it stays hidden, so the waves cannot be sped up there. Sailing, or any wind mode other than Steady, shows it as before. (Owner, after the independent review: kept as it is; a version with speed buttons was tried and reverted.)
- **Wake height:** `heightAt` is evaluated at each ribbon edge vertex (its own map offset from the boat), not once per ribbon point, so the ribbon lies on the waves across its width.
- **`isSeaSetting`** takes the boat data as an optional second argument (like the other helpers), so the list of settings stays in `hanse508.json` (`waves.settings`).
- **Tap plane:** the invisible pick plane is the old flat plane (turned flat, 600 m); the wave mesh and the grid are not tappable on their own.
- **Test changes (6.8 item 11):** only `tests/urlState.test.ts`, rule (b): the four tests that compare `serializeUrlState(initialState(...))` with an exact string pass `sea: 'coastal'`. New cases were added to `tests/timeBar.test.ts` and `tests/urlState.test.ts`; nothing else of Phases 1 and 2 was touched.
- **Browser checks:** the `sea=flat` rule of 6.9 is in `openPage` (`shots.mjs`); the five general `expectUrl` strings now end in `…&held=1&sea=flat` (and `&sea=flat&debug=1`).

---

## 7. M15: Waves change the sailing

**Independent review: required** (changes the boat's physics: apparent wind, resistance and steering; a mistake teaches the wrong feel for waves).

### 7.1 Files

New: `tests/waveFeedback.test.ts`, `scripts/shots-m15.mjs`.
Changed: `content/boat/hanse508.json` (`physics.waveFeedback`), `src/model/apparentWind.ts`, `src/model/sim.ts` (`rigWind`), `src/model/waveMotion.ts`, `src/model/motion.ts` (`stepBoat`, `steadyState`, `MotionReport`), `src/app/store.ts` (`initialState`, `motionOf`, `boatFor`), `src/ui/wavesPanel.ts` (one hint sentence), `src/ui/debugOverlay.ts`, `content/i18n/en.json`, `tests/motionHelpers.ts` (a statistics helper), `tests/physicsTruths3.test.ts`, `tests/stepCost.test.ts` (one new case), `tests/waves.test.ts` (item 6 removed, see 7.6 item 9), `tests/urlState.test.ts` and the Phase 1/2 tests named in 7.6 item 9, `scripts/shots.mjs`, `docs/PHYSICS_TRUTHS.md` (PT-43 status only if a source is found), `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md`.

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

**Tunable in M15:** `yawDegPerDegRoll` (only for the rudder and heading bands of PT-42) and `addedResistanceCoefficient` (only for the speed bands of PT-43). The two angle tables are not tunable. PT-41's bands have no tunable key in M15: if they fail, stop and ask in the PR.

### 7.3 Model

`apparentWind` gains a sideways speed (default 0, so every caller is unchanged):

```ts
export function apparentWind(twsKn: number, twaDeg: number, speedMps: number, data: BoatData = boat, sideMps = 0): ApparentWind
// ax = tws·cos(twa) + speedMps ; az = tws·sin(twa) + sideMps   (moving to starboard, the wind seems to come more from starboard)
```

`rigWind` (`sim.ts`) uses `motion.velocity[2]` as `sideMps`. The exact (not quantised) path stays for `speed === 0 && side === 0 && !wind`, so Held still (always `velocity [0, 0, 0]`) and a boat at rest on Flat water are Phase 1 exactly; a Sailing boat at speed 0 in waves takes the quantised path. `BoatMotion`'s comment changes: `velocity[0]` is the speed of the sails along the bow (the boat's speed plus the rig's pitching), `velocity[2]` the sails' sideways speed from rolling, + = to starboard.

`waveMotion.ts` gains:

```ts
/** How fast the sails move through the air because she pitches and rolls (m/s, boat frame). */
export function rigMotion(wm: WaveMotion, data: BoatData = boat): { forwardMps: number; sideMps: number };
// h = ceHeights(data).main (9.66 m above the waterline; compute it once per data object, not per substep)
// forwardMps = −wm.pitchRateDegS·DEG·h   (bow coming up: the rig swings aft)
// sideMps    = +wm.rollRateDegS·DEG·h    (rolling towards starboard rail down: the rig swings to starboard)
/** The wave's push on the steering, as degrees of extra rudder (+ = turns her to starboard). */
export function waveYawDeg(wm: WaveMotion, trains: readonly WaveTrain[], headingDeg: number, data: BoatData = boat): number;
// no trains → 0; rel = |wrap180(trains[0].fromDeg − headingDeg)| (trains[0] is the main train, dirOffsetDeg 0);
// yawDegPerDegRoll · wm.rollDeg · interpTable(yawFactorByRelDeg, rel). The sign (+ roll → + yaw) is the prototype's: do not flip it.
/** Extra resistance from the waves, N (≥ 0). */
export function addedResistanceN(speedMps: number, headingDeg: number, trains: readonly WaveTrain[], data: BoatData = boat): number;
// no trains or speedMps ≤ 0 → 0; Hs = significantHeightM(trains); rel as above;
// addedResistanceCoefficient · ρw · g · Hs · beam² · interpTable(addedResistanceByRelDeg, rel) · min(1, speedMps / addedResistanceFullSpeedMps)
```

Only the wave roll (`wm.rollRateDegS`) moves the rig sideways, not the heel's own rate: with Flat everything is Phase 2 exactly.

**`stepBoat`, per Sailing substep** (after the wave motion of 6.3; everything else as now):
1. `{ forwardMps, sideMps } = rigMotion(waves)`.
2. `wind = apparentWind(tws, twa, speedMps + forwardMps, data, sideMps)`; the forces from this wind (the sails flick with the rocking).
3. `raw = addedResistanceN(speedMps, headingDeg, trains)`; `acceleration = (push − sign(V)·R.totalN − raw) / mEff`. The zero-crossing test is unchanged.
4. Yaw: `turnRudderDeg = grip·rudderDeg − weatherHelmDegPerDegHeel·heelDeg + waveYawDeg(waves, trains, headingDeg)`.
5. `MotionReport` gains `waveResistanceN` (raw), `waveYawDeg` and `rigSideMps` (sideMps) of the last substep (0 in Held still). `effectiveRudderDeg` keeps its Phase 2 meaning (`grip·rudderDeg − weatherHelm·heelDeg`, without the wave term). The round-up test is unchanged (it may now also see the waves' yaw; it still needs the rudder at 90 % of its limit against the turn).

**`steadyState`** gains `opts.trains?: readonly WaveTrain[]`: inside the speed bisection, `net −= addedResistanceN(mid, headingDeg, opts.trains)`. The rocking is left out (it averages out), so a link opens close to the speed she settles at.

**Store:**
- `motionOf(boat)`: Held still → `velocity [0, 0, 0]`; Sailing → `const m = rigMotion(boat.waves)`; `velocity [boat.speedMps + m.forwardMps, 0, m.sideMps]`. `headingDeg` and `heelDeg` as now.
- `initialState` computes `sea = initialSea(overrides.sea ?? 'flat', windNow(controls, windMode, 0))` first (every wind mode), then `trains = waveTrains(sea)`, and passes `trains` to `boatFor` as a new last parameter `trains: readonly WaveTrain[] = []`; `boatFor` (Sailing) passes it to `steadyState` as `opts.trains`. Held still ignores it.

### 7.4 UI

- The Waves hint (6.5) gains a last sentence: `Waves rock the boat: the sails feel the rocking and flick, waves from behind at an angle knock the bow off course, and waves from ahead slow her down.` (`waves.effects`).
- Debug overlay, new row `wave push`: `resistance 0.24 kN · yaw +1.2° · sails sideways 0.4 m/s` (from the report; kN with 2 decimals, yaw signed with 1, m/s with 1; the format is inline like the other rows).
- `waves.effects` is its own string, appended to the same hint paragraph after a space.
- Nothing else: the owner sees it in the sails, the wind instrument's needles, the wheel (autopilot) and the speed.

### 7.5 Strings

`waves.effects` (7.4), `debug.wavePush` "wave push".

### 7.6 Tests

Items 2–4 go in `tests/physicsTruths3.test.ts` (`it('PT-41 …')` etc.), the rest in `tests/waveFeedback.test.ts`. Runs go through the store: `initialState({ controls: { ctl_wind_dir: TWA, ctl_wind_speed: TWS, ctl_mainsheet, ctl_jib_sheet }, sea })` (Sailing, heading 0, the autopilot holding 0), stepped with `run` from `tests/motionHelpers.ts` at 30 fps for 300 s. **Statistics:** one sample per frame for the frames with 100 s ≤ t ≤ 300 s (600 s runs: t ≥ 200 s); standard deviation = population (÷ N); the heading is sampled as `wrap180(boat.headingDeg)` (she holds 0, so it never wraps); AWA = `rig.wind.awaDeg`, rudder = `rig.applied.rudder`, speed = `mpsToKn(boat.speedMps)`. Add a helper `sampleRun(state, seconds, fps, fromS, pick)` to `motionHelpers.ts` that returns the samples. Give each `it` a timeout of 120,000 ms. "Within x % of each other" means (max − min) / min ≤ x. Prototype values in brackets.

1. Signs and values: `rigMotion` with pitch rate +10 °/s → `forwardMps` −1.686 ± 0.005; roll rate +10 °/s → `sideMps` +1.686 ± 0.005. `apparentWind(0, 0, 0, boat, 1)` → AWA 90 (1e-9), AWS 1.944 ± 0.005 kn. `addedResistanceN(6, 0, waveTrains(initialSea('coastal', { dirDeg: 45, twsKn: 15 })))` = 237 ± 3 N; 0 at speed 0 and −1, 0 with no trains. `waveYawDeg` with roll 2°, the main train from 135, heading 0 → +10.0° (1e-9). No trains: `waveYawDeg` 0.
2. **PT-41 the sails feel the rocking**: Coastal, 15 kn from 90, main 50, jib 100: standard deviation of `rig.wind.awaDeg` 1.6–3.4° [2.42], max − min ≥ 6° [10.2]. The same with Flat: standard deviation < 0.05°. Sheltered, 12 kn from 60, main 20, jib 25: 1.4–2.8° [2.07].
3. **PT-42 waves knock her off course**: Coastal, 15 kn from 135, main 100, jib 100: standard deviation of `rig.applied.rudder` 3.5–7° [5.16] and of the heading 0.8–2.2° [1.35]; with the wind from 45 (main 15, jib 0) the rudder's standard deviation is less than half of that at 135 [0.93]; Flat at 135: < 0.3°.
4. **PT-43 head seas slow her most**: mean speed with Flat minus mean speed in the Open sea, 20 kn: from 45 (main 20, jib 0) 0.6–1.3 kn [0.89]; from 135 (main 100, jib 100) < 0.4 kn [0.13], and the loss at 45 is more than 3 × the loss at 135. Coastal, 15 kn from 45 (main 15, jib 0): 0.15–0.45 kn [0.27].
5. **Held still ignores the waves**: Held still, Coastal vs Flat, wind 15 kn from 90, default sheets, `run(state, 30, 60)`: the rig states are equal (`toEqual`); the wave motion differs.
6. Frame-rate independence: Coastal, 15 kn from 135, main 100, jib 100, 600 s at 30, 60 and 120 fps, samples t ≥ 200 s: mean speed within 0.05 kn, rudder standard deviation within 10 % of each other [7.11 kn, 5.13° at all three]. Time ×16: the same state with `setTimeScale 16`, frames of `dt` 0.1 s (the store's cap, so 1.6 s of simulated time per frame) until 600 simulated seconds: `speedMps`, `headingDeg`, `heelDeg`, `rig.wind.*`, every field of `boat.waves` and of `sea` finite, |speed| < 12 kn, rudder standard deviation (t ≥ 200 s) < 10° [6.98].
7. `steadyState(trimmed(20, 45, 20, 0), 0, boat, { heel: true, trains: waveTrains(initialSea('open', { dirDeg: 45, twsKn: 20 })) })` is lower than without `trains`.
8. `tests/stepCost.test.ts`: a new case like the existing heaviest one but with `sea: 'open'`: `initialState({ sea: 'open', controls: { ctl_wind_dir: 90, ctl_wind_speed: 16, ctl_mainsheet: 40, ctl_jib_sheet: 100 } })`, `setWindMode gusty`, `setTimeScale 16`, a 10 s warm-up, then 600 frames at 1/60 s, under the existing 3 ms limit per frame.
9. All Phase 1 and Phase 2 tests green. Tests built with `initialState` default to Flat and need nothing. **Allowed changes, nothing else:** (a) a Phase 1/2 test that opens a link with `parseUrlState` and then steps it or checks a speed gets `&sea=flat` appended to its link (run the whole suite to find them; candidates: `engine.test.ts`, `windModes.test.ts`, `realisticHandle.test.ts`, `map.test.ts`, `timeBar.test.ts`), and the PR lists every changed file; (b) M14's test 6 in `tests/waves.test.ts` ("M14 does not change the sailing") is deleted: M15 makes the sailing differ on purpose, and its own tests replace it; (c) the two URL tests in `tests/urlState.test.ts` that compare a parsed link's opening speed with `steadyState(…, { heel: true })` ("an old link opens … at her steady speed" and the `bs` fallback) pass `trains: waveTrains(state.sea)` to `steadyState`, because a link without `sea` now opens in Coastal waves.

### 7.7 Browser checks (`scripts/shots-m15.mjs`)

Scenes (`M15_SCENES`, labels with `m15`, registered in `shots.mjs` like M14: import, `m15-` prefix, `liveGroups.m15`): `feedback-quartering` (`?wd=135&ws=15&ms=100&js=100&cam=helm`, wait 3 s), `feedback-head` (`?wd=45&ws=20&ms=20&js=0&sea=open&cam=bow`, wait 3 s).
Live checks (`liveM15Checks`; every sampling below: every 250 ms from 2 s to 12 s after the page loaded):
- `?wd=135&ws=15&ms=100&js=100`: the `rd` value in the address bar takes at least 3 different values (the autopilot keeps correcting); the same link with `&sea=flat` at most 2.
- `?wd=90&ws=15&ms=50&js=100`: the angle in the strip's "App" text (`strip-apparent`, parsed with `/App (-?\d+)°/`) takes at least 3 different values; with `&sea=flat` at most 2.
- Speed: `?wd=45&ws=20&ms=20&js=0&sea=open` vs the same with `sea=flat`: the mean of 10 strip speeds read over 5 s starting 30 s after load is at least 0.5 kn lower with Open sea.
- PT-43 is `to-verify`: try its candidate sources; if none is reachable or none supports it, leave the status and say so in the PR.

### 7.8 Done when

All M15 checks in `WORKFLOW.md` pass on the phone; the tests above pass; the scenes looked at; `BOAT_REFERENCE.md` rows checked.

### 7.9 Not in M15

No change to heel dynamics (the waves do not push the heel; the wave roll is drawn on top). No broaching (the boat cannot be thrown round by a big wave), no surfing down waves, no slamming. The windex and the wind instrument show the sails' wind (`rig.wind`), not a separate masthead wind.


### 7.10 Decided in the M15 PR

Built as specified; every test band passed on the first run with the spec's data, so no tunable key was touched. The measured values equal the prototype's: PT-41 standard deviation 2.42° (range 10.1°), Flat 3e-12°; Sheltered 2.07°; PT-42 rudder 5.15°, heading 1.35°, from 45: 0.93°, Flat 8e-7°; PT-43 loss 0.89 kn (Open sea, from 45), 0.13 kn (from 135), 0.27 kn (Coastal, from 45).

What the spec left open (decided in the M15 PR):

- **Where the heading comes from.** `waveYawDeg` and `addedResistanceN` use the heading at the start of the substep; `rigMotion` uses the wave motion after that substep's `stepWaveMotion`, as 7.3 says.
- **Cached height.** `rigMotion` computes the mainsail's centre-of-effort height once per data object (a `WeakMap` in `waveMotion.ts`).
- **Held still.** `motionOf` returns `velocity [0, 0, 0]` when `boat.mode === 'held'`; the three new `MotionReport` fields are 0 there.
- **Debug row.** `wave push` writes a negative yaw with a true minus sign (`−1.2`) and a positive one with `+`.
- **Test helpers.** `tests/motionHelpers.ts` gains `sampleRun` (as 7.6 asks), plus `mean` and `stdDev` (population).
- **Browser checks.** The speed check opens the Open-sea and Flat pages side by side and reads both after the same 30 s; the strip's speed is parsed as the first decimal number in its text.
- **PT-43 source.** Tried again (a web search for added resistance of a sailing boat in head waves): only ship papers (added resistance is largest in head seas) and a forum thread turned up, nothing about a cruising yacht's heading. Status stays `to-verify`.
- **Tests changed in older files** (7.6 item 9): only `tests/urlState.test.ts` (the two speed tests pass `trains: waveTrains(state.sea)` to `steadyState`) and M14's "does not change the sailing" test in `tests/physicsTruths3.test.ts` (deleted; the spec names `tests/waves.test.ts`, but M14 wrote it in `physicsTruths3.test.ts`). No Phase 1/2 test needed `&sea=flat`.

Owner's answers (PR comment, "accept all" after the independent review):

- **PT-43 stays `to-verify`**; the Sailing World article "sailing in chop" (Bill Gladstone, 2020) is added to its candidate sources in `PHYSICS_TRUTHS.md`. It supports only the first half of the rule (head seas slow her).
- **Which way the waves turn the bow is unchecked** (review finding 1). The code turns the bow towards the side that rolls down (`yaw = +5 × roll × factor`, `waveYawDeg`), as the spec's prototype did. Sailors describe a wave from behind turning the bow towards the waves and the wind (a broach), which would be the opposite sign. No test depends on the sign and the phone shows only that the wheel moves. **To do before Phase 3 ends: `/plan` or a sailor checks the direction** (M19 should not sign off without it); if it is backwards, flip the sign of `waveYawDeg` and its tests.
- Review findings 3 (PT-42's ranking 1.0 from behind against 0.4 from ahead stays a marked assumption), 4 (the Heeling-a-lot banner on the head-seas link is M8 heel physics) and 5 (the debug row's hyphen and `-0.0`) are left as they are.

---

## 8. M16: Wind on the water, buoys and the horizon

**Independent review: not needed** (visuals and fixed marks; the gust preview only reads `windAt` at other times, its formula is unchanged).

### 8.1 Files

New: `src/model/windOnWater.ts`, `src/render3d/marks.ts`, `tests/windOnWater.test.ts`, `scripts/shots-m16.mjs`.
Changed: `content/areas/adriatic.json` (`marks`), `content/boat/hanse508.json` (`waves.whitecaps`, `windModes.gustPreview`), `src/render3d/waterSurface.ts` (vertex colours), `src/render3d/scene.ts` (marks, fog, debug hook), `src/render3d/picking.ts` (extra roots), `src/render3d/sceneConfig.ts`, `src/ui/mapView.ts` (buoys), `content/registry/parts.json`, `tests/map.test.ts`, `tests/picking.test.ts`, `docs/PHYSICS_TRUTHS.md` (PT-45 status only if a source is found), `tests/physicsTruths3.test.ts`, `scripts/shots.mjs`, `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md`.

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
  "crestEdgeFactor": 1.3,
  "crestEdgeWidth": 0.1,
  "crestNote": "assumption: a point is white where the surface height, as a fraction of the sum of the trains' amplitudes, is above hi = 1 − crestEdgeFactor·√coverage (soft over crestEdgeWidth below it); with three trains this whitens about the coverage fraction of the surface (checked by a test)",
  "source": "Beaufort scale (Wikipedia): perhaps scattered white horses at force 3 (7–10 kn), fairly frequent at 4 (11–16 kn), many at 5 (17–21 kn), more extensive at 6 (22–27 kn), blown in streaks at 7 (28–33 kn). The coverage fractions are a teaching assumption (PT-44)."
}
```

`hanse508.json` → `windModes`, new key:

```json
"gustPreview": {
  "fromM": -100,
  "toM": 300,
  "stepM": 20,
  "minWindMps": 1,
  "note": "assumption: a gust or lull travels downwind at the mean wind speed, so the patch of water it darkens 300 m upwind reaches the boat 300 m / wind speed later (PT-45)"
}
```

### 8.3 Model (`src/model/windOnWater.ts`)

```ts
/** Fraction of the sea surface that breaks white, 0 … 1 (`interpTable(whitecaps.coverageByWindKn, twsKn)`, from `angles.ts`). */
export function whitecapCoverage(twsKn: number, data: BoatData = boat): number;
/** How white a point is, 0 … 1: hi = 1 − crestEdgeFactor·√coverage, lo = hi − crestEdgeWidth, smoothstep(lo, hi, eta / amplitudeSum). 0 when coverage or amplitudeSum is 0. */
export function whitecapAmount(eta: number, amplitudeSum: number, coverage: number, data: BoatData = boat): number;
/** How far upwind a map offset lies (m): + = towards where the wind comes from. */
export function upwindDistanceM(dEastM: number, dNorthM: number, windDirDeg: number): number;
// dEast·sin(windDir·DEG) + dNorth·cos(windDir·DEG)
export interface GustProfile { fromM: number; stepM: number; values: number[] }
/**
 * Gusty wind only: how strong the gust or lull is at each upwind distance on the water now,
 * −1 (deepest lull) … +1 (a full gust). Null for other wind modes or a mean wind under 1 m/s.
 */
export function gustProfile(controls: Controls, windMode: WindModeState, timeS: number, data: BoatData = boat): GustProfile | null;
// null unless windMode.mode === 'gusty' and U = knToMps(ctl_wind_speed) ≥ gustPreview.minWindMps;
// for b = 0 … (toM − fromM)/stepM (21 values; index of u = (u − fromM)/stepM): u = fromM + b·stepM;
// tws = windAt(ctl_wind_dir, ctl_wind_speed, windMode, timeS + u / U).twsKn;
// values[b] = clamp((tws − ctl_wind_speed) / (ctl_wind_speed · windMode.size / 100), −1, 1)
/** Linear interpolation in the profile; outside fromM … toM it fades linearly to 0 over one stepM (so the far water is not tinted). */
export function gustAt(profile: GustProfile, upwindM: number): number;
/** Where each buoy is relative to the boat (map offset), with its id. */
export function buoyOffsets(boatState: Pick<BoatState, 'eastM' | 'northM'>, areaData: AreaData = area): { id: string; dEastM: number; dNorthM: number }[];
```

The value at `u = 0` is the gust at the boat now (the same `windAt` the store uses: after a step, `state.wind` is the wind at the returned `state.rig.timeS`, PHASE2_SPEC 10.6); the value at `u = 120 m` is the wind the boat will feel `120 / U` seconds later. That is what the dark patch shows. A strong gust saturates at +1 (amplitudes reach 1.3 × the size plus noise). Known limitation: the profile is measured from the boat, so on a moving boat the patch moves over the water at the wind speed plus her own speed towards it.

### 8.4 3D

- **Horizon**: `SCENE.water.size` 600 → **2000** (outer water and pick plane), `SCENE.fogNear` 60 → **150**, `SCENE.fogFar` 260 → **900** (the camera's far plane stays 1000). The water now reaches the fogged horizon from every preset.
- **Vertex colours** on the inner and outer water meshes (`color` attribute, 3 floats; both materials get `vertexColors: true` and a white `color`; the detail's base colour, `SCENE.water.color` or `lowColor`, goes into the vertex colours). New `SCENE.water` keys: `windyColor: '#16586a'`, `windDarkFromKn: 4`, `windDarkToKn: 24`, `windDarkAmount: 0.5`, `gustColor: '#0b3442'`, `gustAmount: 0.45`, `lullColor: '#5aa7bd'`, `lullAmount: 0.3`, `whitecapColor: '#f2f6f7'`. Per vertex, every frame (colours mixed with `THREE.Color.lerp`):
  1. `c = base.lerp(windyColor, windDarkAmount · smoothstep(windDarkFromKn, windDarkToKn, state.wind.twsKn))` (more wind, darker water).
  2. `profile = gustProfile(state.controls, state.windMode, state.rig.timeS)`; if not null: `g = gustAt(profile, upwindDistanceM(ΔE, ΔN, state.controls.ctl_wind_dir))`; `g > 0`: `c.lerp(gustColor, gustAmount·g)`; `g < 0`: `c.lerp(lullColor, lullAmount·(−g))`. The profile is computed once per frame (21 `windAt` calls), not per vertex.
  3. Inner mesh only, when there are trains: `cov = whitecapCoverage(state.wind.twsKn)` (the wind now: crests whiten in a gust); `A = Σ amplitudeM`; `w = f · whitecapAmount(eta, A, cov)` (f = the fade of 6.6); `c.lerp(whitecapColor, w)`. The crests where the trains add up turn white, more of them in more wind. No trains: no whitecaps (steps 1 and 2 still apply, so the M14 "skip the height work" never skips the colours).
  - Set `needsUpdate` on the `color` attribute when written. The outer mesh's colours are recomputed on the first frame, after `setDetail`, and when the profile is not null or `state.wind.twsKn` changed since the last frame.
- **Buoys** (`render3d/marks.ts`, `buildMarks(areaData = area): Marks` with `object: THREE.Group`, `update(state: AppState, heightAt: (dE: number, dN: number) => number): void` and `buoyObject(id: string): THREE.Object3D | undefined`), `marks.object` added to the **world group** (not the water group: they must not step with it); `scene.ts` calls `marks.update(state, water.heightAt)` after `world.update`. New `SCENE.marks`: `{ color: '#f5c400', roughness: 0.5, sphereRadiusM: 0.6, poleRadiusM: 0.04, poleBottomY: 0.5, poleTopY: 1.9, topmarkLengthM: 0.5, topmarkThicknessM: 0.08, floatY: 0.2, maxDrawM: 1000 }`. Each buoy is a group named `buoy_<id>`: a sphere (16 × 12 segments), a pole (cylinder from `poleBottomY` to `poleTopY`) and a child group `topmark` at `poleTopY` with two boxes `topmarkLengthM × topmarkThicknessM × topmarkThicknessM` crossing in an X (one turned +45°, one −45° about the topmark's local z axis). All `MeshStandardMaterial` in `color`, `roughness`. Every mesh `userData.partId = 'env_buoy'`; the sphere also gets `hitPoints: [[0, 0, 0]]` (the 24 px tap area of small parts, picking.ts), because 200 m away a buoy is only a few pixels on a phone. Each frame: local position `x = buoy.northM − boat.northM`, `z = buoy.eastM − boat.eastM` (world-group axes: x north, z east), `y = heightAt(ΔE, ΔN) + floatY` (the drawn surface: beyond the inner wave mesh it is flat, so a far buoy floats still); `topmark.rotation.y = Math.atan2(ΔN, ΔE)` so the X faces the boat. Beyond `maxDrawM` each **mesh** gets `visible = false` (the raycaster ignores a parent's visibility). No collisions: the boat passes through.
- **Picking**: `createPicker(camera, boatRoot, water, extraRoots: THREE.Object3D[] = [])` (the first three arguments as today: the scene passes `holder` and `water.pickTarget`): `collect` also traverses `extraRoots`; the ray tests `[boatRoot, ...extraRoots, water]`. The scene passes `[marks.object]`.
- **Debug hook** (`?debug=1`): `window.__sailWater = { gustProfile: () => GustProfile | null; buoyScreen: (id: string) => { x: number; y: number } | null }` (the profile of the last frame; a buoy's sphere centre, from `buoyObject(id)`'s world position projected with the camera, on the canvas in CSS px, null when behind the camera), for the browser checks.

### 8.5 UI: the map

- `mapView.ts` draws the buoys after the point-of-sail labels and before the boat (on top of the labels): a filled circle in `COLOURS.buoy` `'#f5c400'` with a 1.5 px outline `COLOURS.buoyOutline` `'#3a3000'`, radius `max(5, 0.6 · pxPerM)` px, and its letter (`N`, `E`, `S`, `W`, 12 px, bold) 8 px to the right. Buoys off the canvas are skipped.
- `pickMap`, in this order: the boat, **a buoy** (a tap within `MAP.hitPx`, 22 px, of its centre → `env_buoy`), the apparent-wind arrow, the point-of-sail labels, the wedge.

### 8.6 Strings and registry

Registry: `env_buoy` (kind `environment`, phase 3, names en "Practice buoy", ru "учебный буй", `aliases` `{ "en": ["mark"], "ru": [] }`, `sources: []`, status en `draft`, ru `draft`, short en "A yellow buoy used as a fixed mark, 200 m north, east, south and west of where the boat started. Watch it to judge your speed, drift and turns. The boat passes through it: there are no collisions yet."). `env_water`'s short text (M14's) gets this appended: "Darker patches are stronger wind (in gusty wind you can see a gust coming); white crests (white horses) appear from about 7 knots and grow with the wind."

### 8.7 Tests

`tests/windOnWater.test.ts`, `tests/physicsTruths3.test.ts`, `tests/map.test.ts`.

1. **PT-44 white horses**: `whitecapCoverage` is 0 at 0 and 6.9 kn, > 0 at 8 kn, 0.02 at 10 kn, 0.06 at 16 kn, 0.2 at 27 kn (1e-9), and strictly increases from 7 to 40 kn. Share of the sea that is white: Coastal trains at 16 kn (`waveTrains(initialSea('coastal', { dirDeg: 0, twsKn: 16 }))`, initial phases), a 200 × 200 grid of map points 1 m apart: the fraction with `whitecapAmount(eta, A, 0.06) > 0.5` is 0.04–0.12 [0.082]; the same at 27 kn with coverage 0.2: 0.11–0.32 [0.216] (bands: prototype ± 50 %). (**Tunable** if this fails: `crestEdgeFactor`, `crestEdgeWidth`.) `whitecapAmount(…, A = 0, …)` = 0 (no NaN).
2. **PT-45 a gust shows upwind before it arrives**: Gusty, seed 1, size 30, mean 12 kn from 0, `startS` 0. Take the first gust of `gustyEvents(1, 3600)` (it begins at 33.7 s) and its peak time `tp = atS + riseS + holdS / 2` (41.7 s). With `U = knToMps(12)`: `gustAt(gustProfile(..., tp − 120 / U), 120)` equals `gustAt(gustProfile(..., tp), 0)` (1e-9), and that value is 1 (the gust saturates: unclamped 1.37). For a store (`initialState` with these controls, `setWindMode gusty`, stepped 50 s at 60 fps): `gustAt(gustProfile(controls, windMode, state.rig.timeS), 0)` equals `clamp((state.wind.twsKn − 12) / (12 · 0.3), −1, 1)` (1e-9). Outside the range: `gustAt(profile, 310)` is half of `values[last]`, `gustAt(profile, 320)` = 0. Steady, Shifty, Building, Dying → null; Gusty with mean 1.5 kn → null.
3. `upwindDistanceM` (`toBeCloseTo`): wind from 0, a point 100 m north → +100; wind from 90, 100 m east → +100; wind from 90, 100 m west → −100.
4. `buoyOffsets` with the boat at east 50, north −20: N → (−50, 220), E → (150, 20).
5. Map (`tests/map.test.ts`, its `viewport({ metresPerPx: 4 })` helper, `initialState()` defaults): `pickMap` at (180, 160) (the N buoy, 50 px above the boat's centre) returns `env_buoy`; at (210, 160) it does not.
6. Picking (`tests/picking.test.ts`): an object with `hitPoints` under an extra root passed to `createPicker` is found by a tap on it; with its mesh `visible = false` it is not.

### 8.8 Browser checks (`scripts/shots-m16.mjs`)

Scenes (`M16_SCENES`, labels with `m16`, registered like M14: import, `m16-` prefix, `liveGroups.m16`; every scene waits 3 s): `water-windy` (`?wd=90&ws=22&ms=50&js=100&sea=open&cam=side-port`: dark water, white crests), `water-light` (`?wd=90&ws=6&ms=50&js=100&cam=side-port`: no white horses), `buoy-ahead` (`?wd=90&ws=12&ms=40&js=100&held=1&cam=helm`: the N buoy ahead), `horizon` (`?wd=90&ws=12&cam=side-starboard`).
Live checks (`liveM16Checks`):
- Gust coming: `?wd=0&ws=12&ms=12&js=0&wm=gusty&seed=1&cam=helm&debug=1` (seed 1's first gust begins 33.7 s in): poll `__sailWater.gustProfile()` every 0.5 s (at most 60 s) until one of `values[8]` … `values[15]` (60–200 m upwind) is > 0.5 while `values[5]` (0 m) is < 0.2; screenshot (`live-phone-gust-coming.png`); then within 40 s the strip shows `GUST`.
- Buoy on the map: `?wd=90&ws=12&held=1&cam=map`, tap − four times (0.1 → 0.2 → 0.5 → 1 → 2 m/px), tap 100 px above the boat's centre: the info card says "Practice buoy".
- Buoy in 3D: `?wd=90&ws=12&held=1&debug=1`, then `__sailDebug.setView([6.5, 2.5, 0], [60, 0.5, 0])` (from the bow, looking ahead, nothing of the boat in the way), wait 0.5 s: `__sailWater.buoyScreen('N')` lies inside the canvas, and a tap there opens "Practice buoy".
- PT-45 is `to-verify`: try to find a source; if none is reachable or none supports it, leave the status and say so in the PR.

### 8.9 Done when

All M16 checks in `WORKFLOW.md` pass on the phone; the tests pass; the scenes looked at (phone first).

### 8.10 Not in M16

No collisions with the buoys, no other marks or land (Phase 5). No streaks of foam blown downwind at force 7, no spray. The wind streaks in the air stay as they are.


### 8.11 Decided in the M16 PR

Built as specified; the model tests (PT-44 shares, PT-45 gust timing) passed on the first run with the spec's data, so no tunable key was touched.

What the spec left open (decided in the M16 PR):

- **Outer water is an indexed grid.** With 2000 m of water the old non-indexed cells would have been about 60,000 vertices to recolour; the outer mesh now shares its vertices (about 10,000), same cells and holes as before.
- **Where the tests live.** PT-44 and PT-45 are in `tests/physicsTruths3.test.ts`; the other model tests are in `tests/windOnWater.test.ts`.
- **Debug hook.** `__sailWater.gustProfile()` reads `water.gustProfile()` (a new method of the water surface that returns the last frame's profile); `buoyScreen` is in `scene.ts`.
- **Map buoy circle.** Its radius uses the real scale (`0.6 m / metresPerPx`, at least 5 px), not the enlarged boat's scale.
- **Browser check on the map** opens with `debug=1` to read the boat's centre.
- **PT-45 source.** A web search found sailing and weather pages that describe a cat's paw as a dark patch of ruffled water made by a gust (among them the AMS Glossary entry), but the glossary page could not be opened from the cloud environment and the others were not read in full, so the status stays `to-verify`.

Owner's feedback after trying the preview (PR comment, 2026-10-14): **the white crests were far too big** (bands several boat lengths wide) and "is it realistic?". Decided in the M16 PR: no, it was not. Real white horses are scattered foam patches a few metres across, and measured cover is about 1 % of the sea at 20 kn. Fix (`whitecaps.patchSizeM` 3, `patchFrom` 0.6, `patchTo` 0.72; `SCENE.water.whitecapMax` 0.85; `whitecapPatch` in `windOnWater.ts`): the crest band of 8.3 is unchanged (so the spec's PT-44 test bands and `coverageByWindKn` hold as written), but a vertex only turns white where a fixed noise pattern on the map allows it (about a quarter of the band; patches at least 1.5 vertex cells across, so 6 m at Low detail), and never fully white (85 %). The foam seen is about 2 % of the sea at 16 kn, 4 % at 22 kn, 6 % at 27 kn. New tests in `tests/windOnWater.test.ts`; new browser scenes `water-windy-top` and the live shot `live-phone-foam-wide`.

Owner's answer (PR comment, "accept all"): **the map keeps opening zoomed in close** (0.1 m per pixel); the buoys show after zooming out with −. No code change.

---

## 9. M17: Clock and sailing area (issue #26)

**Independent review: required** (new shared state and URL keys, time-zone and sun-position formulas; a wrong offset or sign shows the wrong sky for every link).

### 9.1 Files

New: `src/model/clock.ts`, `src/model/sun.ts`, `src/render3d/daylight.ts`, `src/ui/clockPanel.ts`, `tests/clock.test.ts`, `tests/sun.test.ts`, `scripts/shots-m17.mjs`.
Changed: `content/areas/adriatic.json` (`clock`), `src/model/settings.ts` (`Settings.clock`), `src/app/store.ts`, `src/app/urlState.ts`, `src/app/urlSync.ts`, `src/app/app.ts` (the clock in `.view-top`), `src/ui/panel.ts` (View tab switch), `src/ui/timeBar.ts` (`topClearance`), `src/ui/debugOverlay.ts`, `src/render3d/scene.ts` (lights from the sun), `src/render3d/environment.ts`, `src/render3d/waterSurface.ts` (night water), `src/render3d/sceneConfig.ts`, `src/style.css`, `content/i18n/en.json`, `tests/physicsTruths3.test.ts`, `tests/urlState.test.ts`, `scripts/shots.mjs`, `scripts/compare/main.ts`, `docs/CODE_MAP.md`. `docs/BOAT_REFERENCE.md`: no new rows (the clock and sun have no tuning keys; the area's row was added in planning).

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
// rejects a date whose fields do not round-trip through Date.UTC (30 February), hour > 23, minute > 59
export type Daylight = 'day' | 'golden' | 'twilight' | 'night';
export function daylight(sunElevationDeg: number): Daylight;   // ≥ 6 day; ≥ 0 golden; ≥ −6 twilight; else night
// the three edges are named constants in clock.ts (DAY_FROM_DEG 6, GOLDEN_FROM_DEG 0, TWILIGHT_FROM_DEG −6: civil twilight ends 6° below the horizon)
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

`sunPosition`: `minutes = modulo(utcMs, 86,400,000) / 60,000` (fractional, so the sun moves smoothly); `TST = minutes + EoT + 4·longitude`; `HA = wrap180(TST/4 − 180)`; `cos Z = sin φ sin δ + cos φ cos δ cos HA` (clamped to [−1, 1]); `elevationDeg = 90 − Z`; `azimuthDeg = wrap360(deg(atan2(sin HA, cos HA·sin φ − tan δ·cos φ)) + 180)`. No refraction correction.

`sunTimes`: `day0 = Date.UTC(year, month − 1, day)`; `noon = 720 − 4·longitude` minutes, then twice: `noon = 720 − 4·longitude − EoT(day0 + noon·60,000)`. With `δ` at `day0 + noon`: `arg = cos(90.833°) / (cos φ cos δ) − tan φ tan δ`. `arg > 1` → `polar: 'night'`, both times null; `arg < −1` → `polar: 'day'`, both null; else `H = deg(acos arg)`, sunrise `= day0 + (noon − 4H)·60,000`, sunset `= day0 + (noon + 4H)·60,000`, `polar: 'none'`. (90.833° = the sun's disc fully below the horizon with refraction: Wikipedia, Sunrise equation; a named constant `SUNRISE_ZENITH_DEG` in `sun.ts`.)

### 9.4 Store and URL

- `AppState.clock: ClockState`; `Settings.clock: boolean` (default `true`). `initialState`: `clock = { utcMs: overrides.clockUtcMs ?? defaultClockUtcMs() }`.
- `step`: `clock = dt === 0 ? state.clock : { utcMs: state.clock.utcMs + dt·1000 }` (4.2 item 4): the clock runs with the time bar (×16 → 16 times faster) and stops when paused (owner). It runs in both boat modes.
- Actions: `{ type: 'setClock'; utcMs: number }` (ignored unless finite and `localParts` gives a year 1900–2100) and `{ type: 'setClockShown'; shown: boolean }`. "Now" is read from the device by the UI (`Date.now()`) and dispatched as `setClock`: the reducer stays pure and the real clock is read only when the user taps Now (ROADMAP architecture hook).
- `reset`: the default clock; `settings.clock` back to `true`.
- **URL**: `clk` = `clockParam(state.clock.utcMs)`, written when it differs from `clockParam(defaultClockUtcMs())` (so a link stores the time on board when it was shared, to the minute, and opens with the same sky: owner); `clock=0` when the clock is hidden. Both are written after the engine parameters and before the Realistic ones. Parse: `parseClockParam`; missing or invalid → the default. Old links open at noon, 1 June.
- `urlSync.ts`: the early return also requires `clockParam(state.clock.utcMs) === clockParam(previous.clock.utcMs)` (compare the strings only when `state.clock !== previous.clock`), so a new minute, Now and Set reach the address bar. (`clock=0` is a setting, already covered.)
- Known limitation: a time inside the spring-forward hour (`202603290230`) opens an hour later, and the second 02:xx of the autumn night is written as the first; both are one night a year.

### 9.5 UI

**Clock chip and card** (`ui/clockPanel.ts`, called in `app.ts` right after `createTimeBar`):
- `createClockPanel(top: HTMLElement, view: HTMLElement, store): void`: the chip goes into `top` (`.view-top`), the card into `view` (the 3D view, where `--view-top-h` is set).
- A button `data-testid="clock-chip"`, class `clock-chip`, at least 44 × 44 px, text the local time `14:32` (24 h, from `localParts`), `aria-label` `Clock: 14:32, Monday 1 June 2026. Tap for the date, sunrise and sunset.` Hidden when `settings.clock` is false. It sits to the right of the time bar where the row has room, else it wraps under it aligned right (the `.view-top` flex row; `trackTopHeight` keeps the camera framing below it). `topClearance` (`timeBar.ts`) changes to the bottom of the lowest child of `.view-top` that wraps under the strip (not only `.time-bar`), so a wrapped chip is cleared too. The text is updated only when the minute changes.
- Tapping the chip opens or closes the **clock card** (`data-testid="clock-card"`, a `section` with `aria-label="Clock"`), positioned under the top area (`position: absolute; top: calc(var(--view-top-h) + 4px); right: 8px; max-width: min(320px, calc(100% - 16px)); z-index: 6; pointer-events: auto; overflow-wrap: anywhere`); while open it covers the debug box and the map's North up / Boat up switch (they sit in the same corner). Its open state is not stored. The chip toggles it; the `×` button and the Escape key close it. Content, top to bottom:
  1. `Monday 1 June 2026 · 14:32` (`data-testid="clock-date"`).
  2. `Adriatic (Split) · CEST (UTC+2)` (area name from `names.en`; abbreviation `summerAbbreviation` or `standardAbbreviation` and `hours = offsetMin / 60` from `localParts`).
  3. `Sunrise 05:16 · Sunset 20:28` (`data-testid="clock-sun"`, local times of `sunTimes` for the local date, each **rounded to the nearest minute** before `localParts`: `Math.round(ms / 60000) · 60000`; the chip and `clk` floor); polar day: `The sun does not set today.`; polar night: `The sun does not rise today.`
  4. `Light: Day` (`daylight(...)`: `Day`, `Low sun (sunrise or sunset light)`, `Twilight (the sun is just below the horizon)`, `Night`).
  5. Buttons `Now` (`clock-now`) and `Noon, 1 June` (`clock-default`), at least 44 px high.
  6. `Set a time:` a date input (`type="date"`, `min="1900-01-01"`, `max="2100-12-31"`, `aria-label` `Date`, `clock-date-input`) and a time input (`type="time"`, `step="60"`, `aria-label` `Time`, `clock-time-input`), both at least 44 px high with a 16 px font, filled with the current local date and time **when the card opens** (not overwritten while it is open), and a `Set` button (`clock-set`) → `setClock(utcFromLocal(...))`; empty or invalid inputs do nothing.
  7. Hint: `The clock runs with the time bar: ×16 makes the sun move 16 times faster, and Pause stops it.`
  8. A close button `×` (44 px, `aria-label` `Close the clock`).
- **View tab**: a switch `Clock` directly after the `Time bar` switch in `panel.ts`, built the same way, `data-testid="clock-switch"`, with the hint `Shows the time on board over the 3D view.` → `setClockShown`.
- The weekday and month names come from `t(`clock.weekday.${n}` as StringKey)` (a cast is fine).
- Debug overlay row `sun` (`debugOverlay.ts`): `elev 68.6° az 180.0° · Day`.

### 9.6 3D: the sun's light (`render3d/daylight.ts`)

```ts
export interface Daylighting { sunDirection: THREE.Vector3; sun: number; sky: number; warm: number; night: number }
export function daylighting(elevationDeg: number, azimuthDeg: number, headingDeg: number): Daylighting;
```
- Direction towards the sun in the boat frame, using `el' = max(el, 2°)` (so the light and the shadow camera never come from below the water; `sunDirection` is always built from `el'`): `east = sin(az)·cos(el')`, `north = cos(az)·cos(el')`, `up = sin(el')` (radians inside); `[x, z] = mapToBoat(east, north, heading)`; `sunDirection = (x, up, z)` normalised.
- `sun = smoothstep(−1, 8, el)`, `sky = 0.25 + 0.75·smoothstep(−12, 10, el)`, `warm = 1 − smoothstep(2, 25, el)`, `night = 1 − smoothstep(−12, 0, el)` (with the true `el`). These numbers and the colours below live in a new `SCENE.daylight` block: `{ sunFromDeg: −1, sunToDeg: 8, skyFloor: 0.25, skyFromDeg: −12, skyToDeg: 10, warmFromDeg: 2, warmToDeg: 25, nightFromDeg: −12, nightToDeg: 0, warmSun: '#ffb46b', moonColour: '#9fb3ff', nightWater: '#0b2230', nightWhitecapDim: 0.7, backgroundFloor: 0.15, backgroundFromDeg: −12, backgroundToDeg: 6 }`.
- Each frame in `scene.render`: `{ elevationDeg, azimuthDeg } = sunPosition(state.clock.utcMs, area.position.latitudeDeg, area.position.longitudeDeg)`; then
  - sun light: position = `SCENE.shadowCentre + sunDirection · SCENE.shadows.distance`, target the shadow centre; intensity = the detail's sun intensity × `sun`; colour = white lerped to `SCENE.daylight.warmSun` by `warm`; `castShadow` only at High detail and while `sun > 0.05`. `configureSunShadow` no longer places the light (it keeps the camera box); `applyDetail` no longer sets `sun.castShadow` or the light intensities (`render` sets them every frame from the detail's base values).
  - hemisphere light intensity × `sky`; fill light intensity × `sky`, colour white lerped to `SCENE.daylight.moonColour` by `night` (the moonlit night: owner); `scene.environmentIntensity = SCENE.light.environmentIntensity × sky` (otherwise the day-sky reflections light the boat at night at High detail).
  - `scene.backgroundIntensity = backgroundFloor + (1 − backgroundFloor)·smoothstep(backgroundFromDeg, backgroundToDeg, el)` and the fog colour = `SCENE.sky.horizon` × the same factor (until M18 replaces the sky).
  - Water: `waterSurface.update(state, shift, trains, night)` gains `night` as a fourth parameter. The base colour of M16's step 1 is first lerped to `SCENE.daylight.nightWater` by `night` (`base = detailBase.lerp(nightWater, night)`, then the wind darkening); the white crests use `whitecapColor` lerped to `nightWater` by `nightWhitecapDim · night`. The outer mesh's colours are also recomputed when `night` changed since the last frame.
- `SCENE.light.sunDirection` moves to `SCENE.sky.glowDirection` (same value): `environment.ts` reads it for the old sky texture's fixed glow (until M18), and `scene.ts` no longer imports `sunDirection()`. `scripts/compare/main.ts` (the model-vs-sketch comparison) uses `SCENE.sky.glowDirection` instead of `SCENE.light.sunDirection`.

### 9.7 Strings and registry

`en.json`: `clock.label` "Clock", `clock.chipAria` "Clock: {time}, {date}. Tap for the date, sunrise and sunset.", `clock.zone` "{area} · {abbr} (UTC+{hours})", `clock.sun` "Sunrise {rise} · Sunset {set}", `clock.polarDay` "The sun does not set today.", `clock.polarNight` "The sun does not rise today.", `clock.light` "Light: {light}", `clock.light.day` "Day", `clock.light.golden` "Low sun (sunrise or sunset light)", `clock.light.twilight` "Twilight (the sun is just below the horizon)", `clock.light.night` "Night", `clock.now` "Now", `clock.default` "Noon, 1 June", `clock.setLabel` "Set a time:", `clock.set` "Set", `clock.hint` (9.5), `clock.close` "Close the clock", `clock.weekday.0` … `clock.weekday.6` "Sunday" … "Saturday", `clock.month.1` … `clock.month.12` "January" … "December", `view.clock.label` "Clock", `view.clock.hint` "Shows the time on board over the 3D view.", `debug.sun` "sun". No registry entries (the chip is a control without a part).

### 9.8 Tests

`tests/clock.test.ts` (items 1–4, 8, 9), `tests/sun.test.ts` (5, 6), `tests/physicsTruths3.test.ts` (7), URL cases in `tests/urlState.test.ts` (10). Sun values come from the prototype of these equations (2026-10-13); the equations' published accuracy is about 1–2 minutes.

1. `lastSundayUtcMs(2026, 3)` = 2026-03-29 01:00 UTC (1,774,746,000,000); `(2026, 10)` = 2026-10-25 01:00 UTC; `(2027, 3)` = 2027-03-28; `(2027, 10)` = 2027-10-31.
2. `localParts`: 2026-06-01 10:00 UTC → 12:00, Monday (weekday 1), offset 120, summer; 2026-12-21 11:00 UTC → 12:00, offset 60; one second before and at 2026-03-29 01:00 UTC → 01:59:59 CET and 03:00:00 CEST.
3. `utcFromLocal`: (2026, 6, 1, 12, 0) = `defaultClockUtcMs()` = 1,780,308,000,000; (2026, 12, 21, 12, 0) = 2026-12-21 11:00 UTC; (2026, 3, 29, 2, 30) = 01:30 UTC; (2026, 10, 25, 2, 30) = 00:30 UTC. Round trip `localParts(utcFromLocal(...))` for every hour of 2026-06-01 and 2026-12-21.
4. `parseClockParam`: `202612211200` → 2026-12-21 11:00 UTC; `202603290230` → 01:30 UTC (the spring-forward hour, see 9.4); `202602301200`, `202613011200`, `202606012460`, `12`, `abc` → null; `clockParam(defaultClockUtcMs())` = `202606011200`.
5. `sunTimes` at Split (43.508, 16.44), each ± 2 min (UTC): 2026-06-01 sunrise 03:16, sunset 18:28, noon 10:52; 2026-06-21 03:13, 18:39; 2026-12-21 06:24, 15:21; 2026-03-20 04:57, 17:06, noon 11:02. Latitude 80, 2026-12-21 → `polar: 'night'`, times null (no NaN); latitude 80, 2026-06-21 → `polar: 'day'`.
6. `sunPosition` at Split on 2026-06-01 (± 0.3°): 04:00 UTC elevation 6.15, azimuth 65.27; 06:00 → 27.06, 84.46; 10:00 → 66.01, 149.10; 14:00 → 45.86, 256.52; 18:00 → 3.63, 297.40; at `sunTimes(2026, 6, 1, …).noonUtcMs`: elevation 68.6.
7. **PT-46 the sun's path**: Split 2026-06-01: the azimuth at sunrise is 45–90° (north-east to east), at sunset 270–315° (west to north-west), at noon 180° ± 1 (due south); the day on 2026-06-01 is more than 5 h longer than on 2026-12-21 (prototype 15 h 12 min vs 8 h 57 min).
8. `daylight`: 10 → day, 3 → golden, −3 → twilight, −10 → night. `daylighting` at elevation 30: sun 1, sky 1, night 0; at −20: sun 0, sky 0.25, night 1; azimuth 180, elevation 10, heading 0 → `sunDirection.x < −0.9` (the sun astern when sailing north); heading 90 → `sunDirection.z > 0.9` (to starboard when sailing east).
9. Store: 60 s of frames at 60 fps with ×16 advance the clock by 960 ± 1 s; paused: `state.clock` unchanged (the same object); Held still with Steady wind: it advances at ×1 (with Flat water the bar shows the "Held still" chip, PR #42, and the clock still runs). `setClock` with NaN or year 2200 → unchanged. Reset → default clock.
10. **URL**: `?clk=202612211200` opens at 2026-12-21 11:00 UTC; round trip; the default writes no `clk`; 61 s after the default the link has `clk=202606011201`; `clock=0` round trip; an invalid `clk` opens the default.

### 9.9 Browser checks (`scripts/shots-m17.mjs`)

Scenes: `clock-chip` (`?wd=90&ws=12&ms=40&js=100`), `clock-card` (same, the chip tapped), `light-low-sun` (`?wd=90&ws=12&ms=40&js=100&clk=202606012010&cam=side-port&detail=low`: sailing north, the low sun is on her port bow), `light-night` (`?wd=90&ws=12&ms=40&js=100&clk=202606012300&cam=side-port&detail=low`).
- `openPage` adds `clock=0` to the link of every scene and check whose label does not match `/m1[7-9]/` and whose query has no `clock=` (the tap sweep must not open the clock card).
Live checks (`liveM17Checks`):
- Default link: the chip reads `12:00`; tap it: the card shows `Sunrise 05:16 · Sunset 20:28` and `Light: Day`.
- With `&tx=16`, poll until the chip reads `12:04` or later (at most 60 s: headless rendering can be slower than 10 fps, and a frame never advances more than 0.1 s × 16); press Pause, wait 3 s: unchanged.
- In the card, set 2026-12-21 12:00 and tap Set: `Sunrise 07:24 · Sunset 16:21`, the address bar has `clk=202612211200`.
- Tap Now: the address bar's `clk` changes to a valid 12-digit time.
- View tab → Clock off: the chip disappears and the address bar has `clock=0`.
- The night scene's canvas is darker than the noon scene's: mean luminance below 50 % of noon's, same viewport and `detail=low`. Recipe (used again in M18): `page.locator('canvas.scene-canvas').screenshot()`, then inside `page.evaluate` draw the PNG (as a `data:` URL) into a 2D canvas and average `0.2126·R + 0.7152·G + 0.0722·B` (0 … 1) over the area wanted.
- Accessibility audit (`auditPage`) on the open clock card.

### 9.10 Done when

All M17 checks in `WORKFLOW.md` pass on the phone; the tests pass; the scenes looked at. The PR description says `Closes #26`.

### 9.11 Not in M17

No new sky colours, stars or sun glow in the right place (M18). No moon. Winds do not follow the clock (Phase 6). No other areas or area chooser (later).


### 9.12 Decided in the M17 PR

What the spec left open (decided in the M17 PR):

1. **`isClockTime(utcMs)`** (in `clock.ts`): what `setClock` checks (finite, inside JavaScript's date range, local year 1900–2100). The 9.3 list did not name it.
2. **Night water keeps its wind colours dark.** 9.6 lerps only the base colour to `nightWater` and then darkens it towards `windyColor` (`#16586a`), which is lighter than `nightWater` and would light the water at night in wind. So the wind, gust and lull colours are lerped to `nightWater` by `night` too before they are applied (`waterSurface.ts`).
3. **Two more `SCENE.daylight` keys:** `minLightElevationDeg: 2` (the 2° of 9.6) and `shadowMinSun: 0.05` (the "`sun > 0.05`" of 9.6), so no number is left in `scene.ts` or `daylight.ts`.
4. **The clock card scrolls** (`max-height` to the bottom of the view, `overflow-y: auto`): on a phone in portrait the 3D view is about 430 px high and the card is taller.
5. **Debug row `sun`** shows the short light name (`Day`, `Low sun`, `Twilight`, `Night`: the text before the bracket).
6. **Browser check recipe:** the luminance is measured over the right-hand 30 % of the canvas (between the strip and the camera buttons), because a screenshot of the canvas also contains the DOM overlays on top of it (strip, chips, labels), which are equally bright by night and day.
7. **`setClock` ignores a time equal to the current one** (the state stays the same object).
8. **Review of the M17 PR (owner: "address corrections 2 to 7"):** the chip comes **before** the time bar in `.view-top`, so on a phone it sits at the right of the instrument strip's row (the top area stays 116 px high instead of 166); in the side-by-side layout CSS `order` puts it after the bar as in 9.5. The card's right padding for the × is only on its first line, the card's other padding is smaller, and the date and time boxes share a row with the Set button where they fit; the Set button lies inside the card without scrolling on a 390 px phone (checked in `shots-m17.mjs`). Night wake, streaks and grid lines: left for M18 (line added to 10.5). The wording of the PR's night question was corrected (the night sky is already dark grey; M18 adds the night blue, the stars and the sun's glow). The warm colour of the low sun is gentle at Detail Low (no shadows, direct light about a third at 2.5°): left as the spec's numbers give it. The date and time boxes follow the phone's own format: left.
9. **The sun is drawn** (owner's bug on the preview: at 20:10 "the sun is not visible, but its glint on the water is"): the glint came from a fixed glow baked into the old sky texture (`SCENE.sky.glowDirection`), reflected in the water at High detail, unrelated to the clock. The baked glow is gone (`SCENE.sky.sunGlow` removed; `glowDirection` stays only for `scripts/compare`), and the sun is a soft disc on a sprite (`render3d/sunDisc.ts`, `SCENE.daylight.sunDisc`: 800 m away along the sun's real direction, 14° across with a bright core, warm when low, fading out between −1.5° and 1° of sun height). It is not reflected in the water: M18 does the glow and reflections.

Owner's answers on the PR: (none yet)

---

## 10. M18: Sky through the day

**Independent review: not needed** (visuals only: sky colours, glow, stars, reflections; no model, state or link change).

### 10.1 Files

New: `src/render3d/skyDome.ts`, `src/render3d/skyColours.ts`, `tests/skyColours.test.ts`, `scripts/shots-m18.mjs`.
Changed: `src/render3d/scene.ts` (the dome instead of the background texture, fog colour, reflections; the fog is constructed with colour `0xffffff` and `render` sets it every frame), `src/render3d/environment.ts` (`skyTexture` → `cloudTexture`; `srgbTable`, `toByte` and `sunDirection` removed), `src/render3d/daylight.ts` (`skyDirection`), `src/render3d/sceneConfig.ts`, `scripts/shots.mjs`, `docs/CODE_MAP.md`.

### 10.2 Data (`sceneConfig.ts`, presentation)

`SCENE.skyByElevation`: rows sorted by the sun's elevation (degrees). Colours are interpolated between neighbouring rows in three.js's linear working space (`Color.lerp`), numbers linearly; below the first row and above the last the end row is used. The rows at 20° and 90° reproduce today's sky.

| elevDeg | zenith | horizon | glow | cloud | glowStrength | haloStrength | stars |
|---|---|---|---|---|---|---|---|
| −18 | `#03060f` | `#0b1424` | `#1a2440` | `#141a26` | 0 | 0 | 1 |
| −6 | `#0e1a3a` | `#3a3f63` | `#7a5a7a` | `#3a3a55` | 0.3 | 0.3 | 0.6 |
| 0 | `#2c4a7a` | `#f0a070` | `#ffb070` | `#e0a090` | 1 | 1 | 0 |
| 6 | `#4a7ab0` | `#f2c9a0` | `#ffd9a0` | `#f4e0d0` | 0.9 | 0.6 | 0 |
| 20 | `#5f97c8` | `#d6e7f2` | `#fff6e0` | `#ffffff` | 0.8 | 0 | 0 |
| 90 | `#5f97c8` | `#d6e7f2` | `#fff6e0` | `#ffffff` | 0.8 | 0 | 0 |

Write it as an array of `{ elevDeg, zenith, horizon, glow, cloud, glowStrength, haloStrength, stars }`. Other new keys: `SCENE.sky.domeRadiusM: 900`, `domeWidthSegments: 48`, `domeHeightSegments: 24`, `starThreshold: 0.99`, `starCellsPerDeg: 2`; `SCENE.daylight.nightBelow: '#030a10'` (`SCENE.sky.belowHorizon` is lerped to it by M17's `night`); `SCENE.reflections: { minTurnDeg: 5, minIntervalS: 2, size: 128 }`. Removed from `SCENE.sky` (now in the table or unused): `zenith`, `horizon`, `sunGlow`, `cloud`, `cloudCount`. Kept: `width`, `height`, `cloudOpacity`, `belowHorizon`, and `glowDirection` (only `scripts/compare/main.ts` still reads it). Removed from `SCENE.daylight`: `backgroundFloor`, `backgroundFromDeg`, `backgroundToDeg` (the background line goes).

### 10.3 Sky colours (`render3d/skyColours.ts`)

```ts
export interface SkyColours { zenith: THREE.Color; horizon: THREE.Color; glow: THREE.Color; cloud: THREE.Color; glowStrength: number; haloStrength: number; stars: number }
/** The sky for a sun elevation. Returns the same object every call (module-level colours, refilled): it runs every frame. */
export function skyColours(elevationDeg: number): SkyColours;
```

### 10.4 The sky dome (`render3d/skyDome.ts`)

```ts
export interface SkyDome {
  object: THREE.Mesh;
  /** After rig.update and camera.updateMatrixWorld. `skyDirection`: towards the sun at its true elevation, boat frame. */
  update(camera: THREE.Camera, colours: SkyColours, skyDirection: THREE.Vector3, headingDeg: number, below: THREE.Color): void;
}
export function buildSkyDome(clouds: THREE.Texture): SkyDome;
```
- `new THREE.SphereGeometry(domeRadiusM, domeWidthSegments, domeHeightSegments)` with a `THREE.ShaderMaterial` (`side: THREE.BackSide`, `depthWrite: false`, `depthTest: false`, `fog: false`, **`toneMapped: false`**: like the old background texture, the sky is not tone-mapped, so it meets the fogged water at the same colour), `renderOrder = −1`, `frustumCulled = false`. Each frame its position is copied from the camera.
- Uniforms: `uZenith`, `uHorizon`, `uBelow`, `uGlow`, `uCloud` (`THREE.Color`, linear), `uSunDir` (vec3, unit), `uGlowStrength`, `uHalo`, `uStars`, `uHeading` (radians: `headingDeg · DEG`), `uCloudOpacity` (`SCENE.sky.cloudOpacity`), `uStarThreshold`, `uStarCells` (`starCellsPerDeg`), `uClouds` (sampler2D).
- Vertex shader (complete):
  ```glsl
  varying vec3 vDir;
  void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  ```
- Fragment shader, in this order. **Every literal is a float** (`48.0`, `0.0`, `1.0`): three.js compiles GLSL ES 3.0, which does not turn integers into floats.
  1. `vec3 d = normalize(vDir); float el = asin(clamp(d.y, -1.0, 1.0));`
  2. Gradient as the old texture: `float t = el < 0.0 ? min(1.0, -el / 0.25) : pow(max(0.0, sin(el)), 0.6); vec3 col = mix(uHorizon, el < 0.0 ? uBelow : uZenith, t);`
  3. The direction on the map (clouds and stars stay fixed over the sea while she turns; the world group turns the map by +heading about y, so undo it): `float mx = d.x * cos(uHeading) - d.z * sin(uHeading); float mz = d.x * sin(uHeading) + d.z * cos(uHeading);`
  4. Clouds: `float u = atan(mz, mx) / 6.2831853 + 0.5; float v = el / 3.1415927 + 0.5; float a = texture2D(uClouds, vec2(u, v)).a; float band = el > 0.0 ? sin(min(1.0, el / 0.9) * 3.1415927) : 0.0; col = mix(col, uCloud, a * band * uCloudOpacity);`
  5. Sun, mixed as the old texture did (at noon the result equals today's sky): `float s = max(0.0, dot(d, uSunDir)); col = mix(col, uGlow, clamp(pow(s, 48.0) * uGlowStrength + pow(s, 4.0) * 0.25 * uHalo, 0.0, 1.0));`
  6. Stars (when `uStars > 0.0` and `el > 0.0`), with a hash that has no `sin` (the same field on every GPU) and cells that stay square towards the zenith: `vec2 g = vec2(degrees(atan(mz, mx)) * cos(el), degrees(el)) * uStarCells; vec2 cell = floor(g); vec2 p = fract(cell * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); float n = fract((p.x + p.y) * p.x); float r = length(fract(g) - 0.5); col += vec3(step(uStarThreshold, n) * (1.0 - smoothstep(0.05, 0.15, r)) * uStars * smoothstep(0.0, 0.15, el));` (a small dot in one cell of a hundred).
  7. `gl_FragColor = vec4(col, 1.0);` then `#include <colorspace_fragment>` (no tone-mapping include).
- `environment.ts`: `skyTexture()` becomes `cloudTexture()`: 1024 × 512 (`SCENE.sky.width`, `height`), the same octaves and the same noise call as now (`elevation = ((y + 0.5) / height − 0.5)·π`, `v = elevation / (π/2)`, `n = Σ amplitude · noise(u · period, v · period · 0.5)`), alpha = `smoothstep(0.5, 0.72, n / weight)` for rows above the horizon and 0 below; RGB white. RGBA `DataTexture`, `colorSpace` `NoColorSpace`, `flipY` false, linear filtering, `wrapS = RepeatWrapping`.

### 10.5 Scene changes

- `daylight.ts`: `Daylighting` gains `skyDirection` (towards the sun at its **true** elevation, same formula as `sunDirection` without the 2° clamp); the dome uses it, the light keeps `sunDirection`.
- `scene.background` is no longer set (the dome draws the sky); M17's `backgroundIntensity` line goes. Each frame, after `rig.update(now)` and `camera.updateMatrixWorld()`: `colours = skyColours(el)`; `below = SCENE.sky.belowHorizon` lerped to `SCENE.daylight.nightBelow` by `night`; `dome.update(camera, colours, daylighting.skyDirection, boat.headingDeg, below)`; `scene.fog.color.copy(colours.horizon)`.
- **Reflections (High detail only)**: a second mesh with the dome's geometry and material at the origin, in its own small `skyScene`. One `PMREMGenerator`, created at the first need and kept. `applyDetail` no longer makes reflections: at Low it sets `scene.environment = null`; at High it marks them stale. In `render`, at High, regenerate `pmrem.fromScene(skyScene, 0, 0.1, SCENE.sky.domeRadiusM + 10, { size: SCENE.reflections.size })` when they are stale, or when the boat-frame `skyDirection` has turned by `minTurnDeg` or more since the last one; never more often than every `minIntervalS` seconds of real time (the frame time `now`). Keep the returned `WebGLRenderTarget` and dispose the previous one; `scene.environment = target.texture`.
- **Night readability** (owner): the browser check below must pass at both details. If the boat's square is too dark at High detail, raise `SCENE.daylight.skyFloor` (M17's 0.25) in steps of 0.05 until it passes, and report it in the PR.
- **Added in the M17 PR (review point 4, owner's sun bug):** (a) M17 draws the sun as a sprite (`render3d/sunDisc.ts`, `SCENE.daylight.sunDisc`) and no longer bakes a fixed glow into the old sky texture; M18 deletes `sunDisc.ts` and its key and draws the sun in the dome instead (`daylight.ts` already has `sunDirectionAt(elevationDeg, azimuthDeg, headingDeg)`, the true-elevation direction `skyDirection` needs). (b) At night the wake (`wake.ts`), the wind streaks (`wind.ts`) and the water's grid lines (`waterSurface.ts`) are drawn with materials that ignore light and stay bright white on the dark water: give them the night dimming (a colour or opacity lerped by `night`), and include them in the night-readability check.
- From a camera 100 m or more up (zoomed far out) the edge of the 2,000 m water shows a few degrees below the horizon against the dome's "below" colour. Accepted.

### 10.6 Tests

`tests/skyColours.test.ts`: `skyColours(20)` and `skyColours(90)` give zenith `5f97c8` and horizon `d6e7f2` (`getHexString()`); `skyColours(−30).stars` = 1; `skyColours(3).glowStrength` = 0.95; `skyColours(−6).horizon` = `3a3f63`; `SCENE.skyByElevation` is sorted by `elevDeg`. `cloudTexture()`: 1024 × 512, alpha 0 in the bottom half, maximum alpha above 128.

### 10.7 Browser checks (`scripts/shots-m18.mjs`)

Luminance: as in M17 (screenshot of `canvas.scene-canvas`, drawn into a 2D canvas inside `page.evaluate`), 8-bit sRGB values, `(0.2126·R + 0.7152·G + 0.0722·B) / 255`, 0 … 1.

Scenes (`M18_SCENES`, base `?wd=90&ws=12&ms=40&js=100&tb=0&clock=0`, each at `cam=side-starboard` and `cam=helm`, named `sky-<time>-side` / `sky-<time>-helm`): `noon` (no `clk`), `low-sun` (`clk=202606012005`), `sunset` (`clk=202606012028`), `twilight` (`clk=202606012050`), `night` (`clk=202606012300`), `sunrise` (`clk=202606010530`).
Live checks (`liveM18Checks`, phone size):
- **Sky only, noon vs night**: `?wd=90&ws=0&held=1&tb=0&clock=0&detail=low&debug=1` (no wind, so no waves; held, so the heading stays), then `__sailDebug.setView([-40, 2, 0], [-120, 40, 0])`, wait 1 s; once without `clk` and once with `clk=202606012300`. Night: mean luminance of the whole canvas below 25 % of noon's, and at least 10 pixels brighter than the night mean + 0.3 (stars).
- **The boat at night**: `?wd=90&ws=12&ms=40&js=100&held=1&tb=0&clock=0&clk=202606012300&cam=side-starboard`, at `detail=low` and `detail=high`: the mean luminance of the 60 × 60 px square at the canvas centre is above 0.08.
- **Sunset**: `?wd=90&ws=12&ms=40&js=100&clk=202606012028&debug=1`: the elevation parsed with `/elev (-?[\d.]+)/` from `[data-testid="debug-overlay"]` is between −1 and +1.
- No console errors from the shader at both details (the script already fails on console errors).

### 10.8 Done when

All M18 checks in `WORKFLOW.md` pass on the phone; the scenes looked at (phone first, then one wider size).

### 10.9 Not in M18

No moon, no weather (rain, fog banks, changing cloud cover), no lights on land.


### 10.10 Decided in the M18 PR

What the spec left open (decided in the M18 PR):

1. **The sun's disc is drawn in the dome.** 10.5 says M18 draws the sun in the dome, but the fragment shader of 10.4 only has the glow (a wide soft patch). So the shader has one more step after the glow: a bright core (`uSunCore`, `uSunCoreCos`) mixed towards a near-white version of the glow colour, between two angular radii, fading out as the sun sets. Presentation keys in `SCENE.sky.sunCore`: `innerDeg: 0.8`, `outerDeg: 1.8`, `fadeFromDeg: -1.5`, `fadeToDeg: 1` (the values of M17's sprite). `sunDisc.ts` and `SCENE.daylight.sunDisc` are deleted; the debug hook `__sailWater.sunScreen()` (used by the M17 browser check) now projects the dome's sun direction and is null once the sun is below −1.5°.
2. **Night dimming of the wake, the wind streaks and the grid lines** (10.5, added in the M17 PR): their material colour is multiplied by `1 − nightLineDim · night`, `SCENE.daylight.nightLineDim: 0.8` (new key).
3. **Night readability** (owner, on the PR: the boat at night was too dark to tell from the water): `SCENE.daylight.skyFloor` goes from M17's 0.25 to **0.65** (the spec's 10.5 allows raising it; tried 0.5 and 0.65 on the phone-size night scenes, 0.65 shows the hull and both sails clearly). Before the change the boat's centre square measured 0.434 at Low and 0.307 at High (limit 0.08), the sky alone 0.033 against 0.624 at noon. Navigation lights, which will help further, come later (with the rules of the road).
4. **Reflections:** `scene.environment` is `null` at High until the first regeneration in `render`, which happens in the frame that switches to High (the throttle starts at "never made"). Changing the detail marks them stale; the old render target is kept when going back to Low and disposed when the next one is made.
5. **Browser check recipe:** the luminance is measured with the DOM overlays hidden (`.view > :not(canvas.scene-canvas)`), so the whole canvas can be used as 10.7 says; the 2D canvas is created with `willReadFrequently`, or Chromium warns on the console and the script fails.

Owner's answers on the PR ("Accept all"): the sun's disc stays as it is; the night dimming of the wake, streaks and grid lines stays; and the boat at night must be lighter (item 3).

---

## 11. M19: Polish and Phase 3 sign-off

**Independent review: not needed** (polish and sign-off; the owner's phone check covers it).

### 11.1 Files

New: `scripts/shots-m19.mjs` (`M19_SCENES` empty, `liveM19Checks`, registered as `liveGroups.m19`).
Changed: `src/render3d/sceneConfig.ts`, `src/render3d/waterSurface.ts` and `src/render3d/scene.ts` (the performance keys below), `README.md`, `docs/BOAT_REFERENCE.md`, `docs/PHYSICS_TRUTHS.md`, `docs/ROADMAP.md`, `docs/PHASE3_SPEC.md` (status line, "Decided in the M19 PR"), `docs/CODE_MAP.md`.

### 11.2 Performance

The agent cannot measure a phone (headless software rendering says nothing about FPS, PHASE2_SPEC 13.1). So:
- Add `SCENE.performance = { outerColoursEveryNthFrame: 1, innerHalfSizeLowM: 100, fadeStartLowM: 70 }` (values that change nothing: Low detail uses the last two for its inner mesh and the outer mesh's cut-out; High keeps `SCENE.water.waves.halfSizeM` and `fadeStartM`). The three tuning steps below use these keys and `SCENE.reflections.minIntervalS` (M18). When `outerColoursEveryNthFrame` is 2, the outer water's colours, when they are recomputed (M16 8.4), are written only every second rendered frame.
- `liveM19Checks`: the M13 guard on the new heaviest case `?wd=90&ws=20&ms=40&js=100&sea=open&wm=gusty&tx=16&clk=202606012030&debug=1` at both details: the debug overlay's `step` stays under 8 ms per frame.
- The owner measures with the WORKFLOW M19 link and posts FPS and Slowest in the PR. If they miss the target (FPS 50 or more, Slowest never above 33 ms), apply one step per owner comment, in this order, and ask for a new measurement: (1) `outerColoursEveryNthFrame: 2`; (2) `innerHalfSizeLowM: 80, fadeStartLowM: 56`; (3) `SCENE.reflections.minIntervalS: 5`. Report each step's before/after in the PR.

### 11.3 Accessibility audit

`liveM19Checks` calls `auditPage` on: the Wind tab with the Waves block (`?wd=90&ws=12&sea=open`); the clock chip (default link) and the open clock card; the View tab with the Clock switch; the map with buoys (`cam=map`, zoomed out to 2 m/px). Fix whatever it reports.

### 11.4 Docs

- README: a "Phase 3" section in the same style as the Phase 2 one (what the learner sees: waves, rocking and its effects, wind on the water, buoys, clock and sky; the new link settings `sea`, `clk`, `clock`).
- `BOAT_REFERENCE.md` section 5: one row for every Phase 3 key in `hanse508.json` (`waves`, `physics.waveResponse`, `physics.waveFeedback`, `windModes.gustPreview`) and `content/areas/adriatic.json`, with the value in use (tuned values updated).
- `PHYSICS_TRUTHS.md`: try the candidate sources of PT-43 and PT-45 once more; change a status only if a source supports the rule, else leave `to-verify` and say so.
- ROADMAP: Phase 3 status "Done (M19, PR #<n>)" once the owner signs off, and a decisions-log row; this spec's status line likewise.

### 11.5 Done when

Every item of section 12 is ticked in the PR: the agent ticks what tests, CI and the browser checks show; the owner ticks the phone-only items ("smooth on the owner's phone", "the boat stays readable at night") from the checklist. CI `browser-checks` is green. The direction the waves turn the bow (7.10, "Decided in the M15 PR") has been checked by `/plan` or a sailor. No `Closes` line (#26 and #32 were closed by M17 and M14).

### 11.6 Decided in the M19 PR

What the spec left open (decided in the M19 PR):

1. **`SCENE.performance` is read in `waterSurface.ts`:** `half` and `fadeStart` are set per detail in `setDetail` (High keeps `SCENE.water.waves`, Low uses `innerHalfSizeLowM` and `fadeStartLowM`). The outer water's colours are recomputed when something changed (wind, night, a gust profile, a rebuild) and written on a frame whose counter is a multiple of `outerColoursEveryNthFrame`; a change that arrives on a skipped frame is kept (`outerPending`) and written on the next due frame. With the value 1 nothing differs from M18. `scene.ts` needed no change (the reflections already read `SCENE.reflections.minIntervalS`).
2. **Browser checks:** no screenshot scenes (`M19_SCENES` is empty). `liveM19Checks` audits the Wind tab with the Waves block, the clock chip, the open clock card, the View tab with the Clock switch and the map zoomed out to 2 m/px (all clean on the first run, nothing to fix), and runs the 8 ms guard on the heaviest case at both details on the phone and the foldable size (step 1.2–1.6 ms).
3. **PT-43 and PT-45 sources, tried again:** search summaries only; the pages could not be opened from the cloud environment (DNS failure on `glossary.ametsoc.org` and `baynature.org`), so both rules stay `to-verify` (PHYSICS_TRUTHS notes the new candidates).
4. **Owner's answers on the PR (2026-10-14):** the phone measures 60 FPS and 17 ms for the slowest frame in the heaviest case, so none of the three speed steps is applied (the values in 11.2 stay). The direction the waves turn the bow (7.10) stays as built until the skipper or `/plan` checks it; PT-43 and PT-45 stay `to-verify`; Phase 3 is Done when the owner has ticked the night check and said "Phase 3 signed off".
5. **Not done by the agent:** the phone measurement (FPS, Slowest), "the boat stays readable at night" and the direction the waves turn the bow (7.10) are left to the owner and to `/plan` or a sailor, as 11.5 says.

---

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

**Owner's answers on the planning PR (#41, 2026-10-13, "accept all"):** PT-43, PT-45 and the JONSWAP coefficients stay `to-verify` (the milestones and M19 try their sources again); the Open-sea fetch stays 150 km.

Open (none blocks a milestone): the JONSWAP coefficients' source page (US Army Corps of Engineers) could not be opened from the cloud environment; PT-43 and PT-45 have no reachable source yet (see PHYSICS_TRUTHS).
