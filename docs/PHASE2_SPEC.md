# Phase 2 specification: wind and feedback

Status: **M6–M13 built**, waiting for the owner's sign-off (M13 PR) · Last updated: 2026-10-14

Read [`ROADMAP.md`](ROADMAP.md) first, then this file. Phase 1 is done; [`PHASE1_SPEC.md`](PHASE1_SPEC.md) still describes everything Phase 2 builds on (layout, rig solver, ropes, Realistic mode, URL state). This file says only what Phase 2 adds or changes. Boat facts: [`BOAT_REFERENCE.md`](BOAT_REFERENCE.md) and [`content/boat/hanse508.json`](../content/boat/hanse508.json). Behaviour rules: [`PHYSICS_TRUTHS.md`](PHYSICS_TRUTHS.md).

## 0. How to use this spec (for the coding agent)

- Do **one milestone** (sections 6–13), on its branch, in one PR. Read sections 1–5 first every time; they apply to all milestones.
- Each milestone section lists, in this order: **files**, **data** (JSON to add, verbatim), **model** (formulas and function signatures), **store and URL**, **UI**, **3D**, **strings**, **registry**, **tests**, **screenshots**, **done when**, **not in this milestone**. Build them in that order: data → model + tests → store/URL → UI → 3D → screenshots.
- **Numbers.** Every number in a data block is the value to use. The model was prototyped with these exact formulas and values against the real Phase 1 rig solver (2026-10-10). The test bands in each milestone come from that prototype. If a band fails, first re-check your code against the formulas (common mistakes are listed in 3.4). Only if the formulas are implemented exactly and a band still fails may you tune the keys marked **tunable** in the milestone, and you must say so in the PR with the before/after numbers. Never widen a test band to make it pass.
- **Signatures.** Function names and signatures are given so that milestones fit together. Keep them. Add private helpers freely.
- **Write back.** If you decide something this spec leaves open, write it into the milestone's section, marked "decided in the M<N> PR".
- **Phase 1 must keep working.** All existing tests stay green. A Phase 1 test may only be changed where a milestone section says so, and only in the way it says.
- Sailing terms in UI text get a short explanation the first time they appear on a screen (CLAUDE.md).

## 1. Goal

The boat now **moves**, and what the user does with the ropes, the wheel and the autopilot **changes what the boat does**.

The single idea Phase 2 must teach:

> **The boat makes its own wind.** Once she moves, the sails feel the *apparent wind* (the true wind plus the headwind of her own speed), which comes from further ahead. Trim the sails to that wind: too far in and she heels and stalls, too far out and the sails luff and she slows.

## 2. Scope

### In scope (Phase 2)

1. Boat motion on open water: speed, heading, position. The wheel turns the boat; a stopped boat cannot steer.
2. Apparent wind from the true wind and the boat's speed; the Phase 1 rig solver trims the sails to it.
3. **Held still / Sailing** switch (owner, 2026-10-10). Held still = Phase 1 exactly. Sailing is the default, also for old links.
4. **Autopilot** (owner, 2026-10-10): Standby, hold the compass **heading**, or hold the **true wind angle** (owner: the boat's B&G holds the true wind direction or the compass course). Tack/gybe button.
5. Instruments: boat speed, heading, TWA/TWS, AWA/AWS; a wind instrument dial.
6. Bird's-eye map: boat, track, both winds, no-go zone, points of sail.
7. Forces and heel: sail forces, heel from the manual's righting moment, heel reducing drive, weather helm, round-up. Sheet loads from the forces replace Realistic mode's Phase 1 estimates.
8. Trim quality: luffing / good / stalled, telltales, the main blanketing the jib downwind, sails torn by long flogging.
9. Wind modes: Steady, Gusty, Shifty, Building, Dying; repeatable from a link; time bar with slow motion and speed-up (issue #25).
10. Gybes: boom swing energy, peak sheet load, danger zone, controlled vs accidental gybe.
11. Engine: start/stop, single lever ahead/neutral/astern, rpm.

### Out of scope

- **Preventer: not built.** The reference boat does not carry one (owner, 2026-10-10). M11 teaches the controlled gybe instead.
- Waves and wave motion (Phase 3).
- Land, buoys, harbour, depth, other boats, collisions, anchor, thrusters, fenders, prop walk (Phase 5).
- Guided exercises, scripted wind, debriefs, Adriatic presets (Phase 6).
- Leeway (sideways drift), currents and tides, sound, a Russian UI, gennaker/reacher, and the learning layer beyond the one-line tooltip.

If something here looks necessary, stop and ask in the PR.

## 3. Conventions and shared helpers

### 3.1 Conventions (new or changed; everything in PHASE1_SPEC 4 still holds)

| Topic | Convention |
|---|---|
| Map frame | Flat open water. Position in metres **east** (`eastM`) and **north** (`northM`) of where the boat started. Pure model; the 3D scene stays centred on the boat and the water moves past it. |
| Heading | `headingDeg`, compass, 0 = north, 90 = east, clockwise, range [0, 360). |
| True wind direction | **`ctl_wind_dir` changes meaning:** it is now the compass direction the true wind comes **from**, stored signed in its existing range (−180, 180] (so −60 means 300°). Its range, default (60), step and URL key (`wd`) do not change. Display it as a compass bearing 0–359 (`compassDeg`). With heading 0 it equals Phase 1's angle to the bow, so **old links show the same picture**. |
| True wind speed | `ctl_wind_speed`, knots, range 0–30 as before. In M10 it becomes the **mean**; the wind the boat feels can be higher in gusts (up to `windModes.maxTwsKn`). |
| TWA, AWA | True / apparent wind angle relative to the bow, (−180, 180], **+ = from starboard**: exactly Phase 1's `windFrom`. `TWA = wrap180(windDir − heading)`. |
| Boat speed | `speedMps`, m/s along the bow (+ ahead, − astern). UI in knots, 1 decimal. Speed through the water = speed over the ground (no current). |
| Yaw rate | `yawRateDegS`, + = heading increasing (turning to starboard). Rudder + turns the boat to starboard (PHASE1_SPEC 4). |
| Heel | `heelDeg`, **+ = heeled to starboard** (starboard rail down). Wind from starboard heels the boat to port (heel < 0). In three.js: the boat group's `rotation.x = heelDeg · π/180` (a positive rotation about +x moves the masthead towards +z, starboard). |
| Forces | Newtons in the model, kN with 1 decimal in the UI. |
| Time | `step` stays the only clock; paused: `dt = 0`. The boat physics runs in substeps of at most `physics.integration.maxStepS`. M10's time speed-up multiplies `dt` before substepping. |
| Tuning | All physical constants live in `hanse508.json → physics` (and `windModes`). Presentation sizes (map pixels, wake width) live in `src/render3d/sceneConfig.ts` or the UI module, as in Phase 1. |

### 3.2 Shared helpers (create in M6: `src/model/angles.ts`)

```ts
export const DEG = Math.PI / 180;
/** Wraps to (−180, 180]. */
export function wrap180(deg: number): number { const a = ((((deg + 180) % 360) + 360) % 360) - 180; return a === -180 ? 180 : a; }
/** Wraps to [0, 360). */
export function wrap360(deg: number): number { return ((deg % 360) + 360) % 360; }
/** Signed (−180, 180] → compass [0, 360). */
export const compassDeg = wrap360;
export function knToMps(kn: number, data: BoatData = boat): number { return kn * data.physics.constants.knotMps; }
export function mpsToKn(mps: number, data: BoatData = boat): number { return mps / data.physics.constants.knotMps; }
/** Piecewise-linear interpolation in a table of [x, y] rows sorted by x; clamps at both ends. */
export function interpTable(table: readonly (readonly [number, number])[], x: number): number;
```

`controls.ts` already has `normalizeWindFrom`; keep it, and make it call `wrap180` (same result).

Map ↔ boat frame (`src/model/mapFrame.ts`, M6):

```ts
/** A map offset (east, north) seen from the boat: x forward, z starboard. */
export function mapToBoat(eastM: number, northM: number, headingDeg: number): [x: number, z: number] {
  const h = headingDeg * DEG;
  return [northM * Math.cos(h) + eastM * Math.sin(h), eastM * Math.cos(h) - northM * Math.sin(h)];
}
```

Check: heading 90 (bow east), a point 1 m east → `[1, 0]` (ahead). Heading 0, 1 m east → `[0, 1]` (starboard).

### 3.3 Sources

Rules in PHYSICS_TRUTHS for Phase 2 carry candidate sources. The milestone that implements a rule reads its source and changes the status to `source-checked` only if the source supports the rule. Model constants (drag tables, coefficients) are **assumptions**: list each in `BOAT_REFERENCE.md` section 5, as the Phase 1 values are.

### 3.4 Common mistakes (check these first when a test fails)

- Degrees vs radians: `Math.sin/cos/atan2` take and give radians.
- `atan2(z, x)`: the first argument is the starboard component.
- Wrapping: compare angles only after `wrap180` of their difference.
- Knots vs m/s: apparent wind is computed in m/s, displayed in knots.
- Signs: heel is opposite in sign to AWA; weather helm turns the boat **towards** the wind (rudder offset sign = −heel sign).
- The rig solver caches on exact input equality: quantise AWA and AWS before calling it (section 4.3).
- A substep loop must use the substep `dt`, not the frame `dt`.

## 4. Architecture (applies from M6)

### 4.1 New state (`src/app/store.ts`)

```ts
export interface BoatState {          // src/model/motion.ts
  mode: 'sailing' | 'held';
  headingDeg: number;                 // [0, 360)
  speedMps: number;                   // + ahead
  yawRateDegS: number;
  heelDeg: number;                    // M8; 0 before
  heelRateDegS: number;               // M8; 0 before
  eastM: number;
  northM: number;
}
export interface AutopilotState {     // src/model/autopilot.ts
  mode: 'off' | 'heading' | 'wind';
  /** Heading mode: compass target [0, 360). Wind mode: target TWA, signed (−180, 180]. */
  targetDeg: number;
  integralDeg: number;
}
```

`AppState` gains `boat: BoatState`, `autopilot: AutopilotState` and `motion: MotionReport | null` (the latest report of `stepBoat`, for the strip and the debug overlay) (M6), `track: TrackPoint[]` (M7), `sailDamage` (M9), `windMode` (M10), `engine` (M12). `RigState` gains `wind: { awaDeg: number; awsKn: number; twsKn: number; twaDeg: number }` (what the rig was solved for; renderers read it) and, in M8, `forces: SailForces`.

### 4.2 Order of work in the store's `step` action (Sailing)

1. `dtSim = paused ? 0 : min(MAX_STEP_S, dt) · timeScale` (`timeScale` = 1 until M10).
2. Current true wind: `windDirDeg`, `twsKn` (= the controls until M10; `windAt()` from M10).
3. Autopilot (if not `off`): `stepAutopilot` → new `ctl_rudder` target (rate-limited).
4. Realistic mode (if active): `stepRealistic` as in Phase 1.
5. Rig: `step(sim, dtSim, motion)` with `motion = { velocity: [boat.speedMps, 0, 0], headingDeg: boat.headingDeg }` and the current true wind: the rig is solved for the **apparent** wind (4.3).
6. Boat: `stepBoat(boat, inputs, dtSim)` in substeps (section 6.4) using the rig from step 5.
7. M7: append to the track. M9: flogging damage. M11: gybe dynamics live inside 5/6 (see M11).

**Held still:** steps 3 and 6 are skipped (the autopilot is greyed out). The boat keeps speed 0, heel 0 and its heading. The apparent wind equals the true wind, so everything is Phase 1.

### 4.3 The rig solver and the apparent wind (`src/model/sim.ts`)

- `BoatMotion` keeps its shape (`velocity: Vec3`, `headingDeg`). `velocity[0]` is the boat's speed along the bow in m/s; the other components are 0 in Phase 2.
- `step()` replaces `void motion` with:
  `twa = wrap180(controls.ctl_wind_dir − motion.headingDeg)`, then `apparentWind(twsKn, twa, motion.velocity[0])`. It **quantises**: `awa = round(awa / 0.1) · 0.1` and `aws = round(aws / 0.05) · 0.05` (`physics.integration.solverAwaStepDeg`, `solverAwsStepKn`). Then it builds `BoomInput` / `JibInput` with `windFromDeg = awa`, `windSpeedKn = aws`.
- `step()` gets an optional `wind?: { dirDeg: number; twsKn: number }` in `StepOptions` (default: the controls). M10 passes the current gusty wind here.
- `initialRig(controls, data, history, motion = AT_REST, wind?)` does the same, so a link opens with the rig settled for the apparent wind.
- With `AT_REST` (speed 0, heading 0) the apparent wind is exactly `ctl_wind_dir` / `ctl_wind_speed`: **every Phase 1 test passes unchanged.**
- `RigState.wind` stores `{ awaDeg, awsKn, twaDeg, twsKn }` (the quantised values).

### 4.4 Files added in Phase 2 (by milestone)

| Milestone | Model (`src/model/`) | UI / 3D |
|---|---|---|
| M6 | `angles.ts`, `mapFrame.ts`, `apparentWind.ts`, `sailForces.ts`, `hullResistance.ts`, `motion.ts`, `autopilot.ts` | `ui/instrumentStrip.ts`, `ui/autopilotPanel.ts`, `render3d/world.ts`, `render3d/wake.ts` | done | done |
| M7 | `track.ts`, `pointsOfSail.ts` | `ui/mapView.ts`, `ui/windInstrument.ts` | done | done |
| M8 | `heel.ts`, `sheetLoads.ts` | (changes only) | done | done |
| M9 | `trim.ts` | `render3d/boat/telltales.ts`, `ui/sailsPanel.ts` | done | done |
| M10 | `windModes.ts`, `random.ts` | `ui/windModePanel.ts`, `ui/timeBar.ts` (replaces `ui/pauseButton.ts`) | done | done |
| M11 | `gybe.ts` | `render3d/dangerZone.ts`, `ui/gybeReport.ts` | **required** | **required** |
| M12 | `engine.ts` | `ui/enginePanel.ts`, Helm-station lever in `ui/stationDrawing.ts` | **required** | **required** |

Tests go in `tests/` (flat, as Phase 1): `tests/motion.test.ts`, `tests/autopilot.test.ts`, `tests/apparentWind.test.ts`, … Physics-truth tests are named after their id (`it('PT-20 …')`) and may live in `tests/physicsTruths2.test.ts`.

## 5. Milestones overview

Each milestone is one PR, small enough to check on a phone. Section numbers match milestone numbers. **Independent review** (added after M10): "required" means the owner runs `/review <PR>` with Opus as soon as the PR opens, before testing it on the phone (new physics whose errors tests and a phone check can miss).

| Milestone | Section | What the owner sees | Rules tested | Independent review |
|---|---|---|---|---|
| M6 | 6 | The boat sails, apparent wind, instruments, autopilot, Held still switch | PT-20, 21, 22, 28, 35, 36 (resistance wall) | done |
| M7 | 7 | Bird's-eye map, wind instrument dial | (display) | done |
| M8 | 8 | Heel, weather helm, round-up, loads in kN | PT-25, 29, 32, 36 | done |
| M9 | 9 | Trim states, telltales, blanketed jib, torn sails | PT-23, 37, 38 | done |
| M10 | 10 | Gusty, shifty, building, dying wind; time bar (slow motion, pause, speed-up) | (determinism) | done |
| M11 | 11 | Gybe energy, peak load, danger zone | PT-24, 26 | **required** |
| M12 | 12 | Engine | PT-35 (engine case) | **required** |
| M13 | 13 | Polish and sign-off | all | not needed |

---

## 6. M6: The boat sails (with the autopilot)

Branch `m6-boat-sails`.

### 6.1 Files

New: see 4.4. Changed: `src/model/sim.ts` (4.3), `src/model/controls.ts` (`normalizeWindFrom` → `wrap180`), `src/app/store.ts`, `src/app/urlState.ts`, `src/app/app.ts` (instrument strip instead of the wind chip), `src/ui/windPanel.ts` (compass dial, Held still / Sailing switch, presets relative to the bow), `src/ui/ropesTab.ts` (autopilot under the wheel), `src/ui/stationDrawing.ts` (autopilot at the Helm station), `src/ui/debugOverlay.ts`, `src/render3d/scene.ts` (world group, wake, wind streaks and windex from the apparent wind), `content/boat/hanse508.json`, `content/i18n/en.json`, `content/registry/parts.json`, `docs/BOAT_REFERENCE.md`.

### 6.2 Data (add to `hanse508.json` as top-level `physics`)

```json
"physics": {
  "$comment": "Phase 2 motion model (PHASE2_SPEC 6, 8, 11, 12). A teaching model, not a velocity prediction program. Every value is an assumption unless a source is named; see docs/BOAT_REFERENCE.md section 5. Prototyped 2026-10-10 against the Phase 1 rig solver.",
  "constants": {
    "airDensityKgM3": 1.225, "waterDensityKgM3": 1025, "gravityMps2": 9.81,
    "waterViscosityM2s": 1.19e-6, "knotMps": 0.514444,
    "source": "standard values (sea water about 15 °C); 1 kn = 1852 m / 3600 s"
  },
  "integration": { "maxStepS": 0.05, "solverAwaStepDeg": 0.1, "solverAwsStepKn": 0.05 },
  "mass": {
    "payloadKg": 1000,
    "payloadNote": "assumption: crew, water, fuel and gear added to dimensions.massesKg.lightCraftStandardKeel (14,739 kg, manual)",
    "addedMassFraction": 0.05
  },
  "hull": {
    "wettedSurfaceM2": 48,
    "wettedSurfaceNote": "assumption: canoe body about 37 m² (≈ 2.6 √(volume × LWL)), keel about 9 m², rudder about 2 m²",
    "frictionLengthFraction": 0.7,
    "formFactor": 0.1,
    "linearDragNPerMps": 80,
    "residuaryPerWeightByFroude": [[0, 0], [0.1, 0], [0.15, 0.0002], [0.2, 0.0008], [0.25, 0.002], [0.3, 0.0045], [0.35, 0.01], [0.4, 0.022], [0.45, 0.05], [0.5, 0.09], [0.55, 0.13], [0.6, 0.17]],
    "residuaryNote": "assumption: wave-making resistance as a fraction of the boat's weight against the Froude number V/√(g·LWL); the steep rise from 0.4 (8.9 kn) is the 'hull speed' wall (PT-36). Shape after typical sailing-yacht hull series results; tuned so full sail in 30 kn gives at most about 10.6 kn.",
    "effectiveDraftM": 2.04,
    "clrDepthM": 1.0,
    "clrNote": "assumption: centre of lateral resistance (where the keel's sideways push acts) 1 m below the waterline",
    "inducedMinSpeedMps": 2.0,
    "asternResistanceFactor": 4.0,
    "rudderAreaM2": 1.5,
    "rudderDragCoefficient": 1.0
  },
  "windage": { "areaM2": 8, "dragCoefficient": 0.7 },
  "sails": {
    "liftByAoaDeg": [[0, 0], [2, 0], [10, 0.85], [20, 1.45], [30, 1.35], [45, 1.05], [60, 0.65], [90, 0]],
    "dragByAoaDeg": [[0, 0.15], [2, 0.15], [10, 0.1], [20, 0.17], [30, 0.35], [45, 0.7], [60, 1.0], [90, 1.25]],
    "floggingDragCoefficient": 0.15,
    "coefficientsNote": "assumption: lift and drag coefficients of a soft sail against its angle of attack (the AoA of PHASE1_SPEC 8.4): lift peaks near 20°, then the sail stalls; at 90° it is pure drag. Same table for both sails."
  },
  "steering": { "turnLengthM": 16, "yawLagS": 1.5,
    "turnNote": "assumption: yaw rate = speed × tan(rudder) / turnLengthM; at full rudder (35°) the turning circle is about 46 m across (3 boat lengths)" },
  "autopilot": {
    "kp": 2.0, "kdS": 5.0, "kiPerS": 0.15, "integralBandDeg": 5, "integralLimitDeg": 10,
    "maxRudderDeg": 25, "rudderRateDegPerS": 8, "smallStepDeg": 1, "largeStepDeg": 10,
    "note": "assumption: a simple PID on the heading error, tuned in the prototype: a 20° course change at 12 kn settles within ±2° in about 11 s with less than 2° overshoot"
  }
}
```

**Tunable in M6 (only if a band in 6.11 fails after an exact implementation):** `hull.residuaryPerWeightByFroude` (scale all values by one factor), `hull.linearDragNPerMps`, `steering.turnLengthM`, the autopilot gains.

Also add to `docs/BOAT_REFERENCE.md` section 5 one row per key above (value, "assumption", one-line reason).

### 6.3 Model formulas

**Constants used below.** `ρa = airDensityKgM3`, `ρw = waterDensityKgM3`, `g`, `ν = waterViscosityM2s`. `m = massesKg.lightCraftStandardKeel + mass.payloadKg` (15,739 kg). `mEff = m · (1 + mass.addedMassFraction)`. `LWL = dimensions.lwl` (13.54 m).

**Apparent wind** (`apparentWind.ts`):

```ts
export interface ApparentWind { awsKn: number; awaDeg: number }
export function apparentWind(twsKn: number, twaDeg: number, speedMps: number, data = boat): ApparentWind
// ax = knToMps(tws)·cos(twa) + V ; az = knToMps(tws)·sin(twa)
// aws = mpsToKn(hypot(ax, az)) ; awa = atan2(az, ax) in degrees ; if aws < 1e-6: awa = twa
```

Expected values (tests): TWS 12, TWA 90, V = 6 kn → AWS 13.42 kn, AWA 63.43°. TWS 12, TWA 0, V 6 kn → 18, 0. TWS 12, TWA 180, V 6 kn → 6, 180. TWS 12, TWA 135, V 6 kn → 8.84 kn, 106.3°. TWS 12, TWA −90, V 6 kn → 13.42, −63.43.

**Sail centre-of-effort heights** (computed once from the data, `sailForces.ts`):
`hMain = (2·(rig.boom.gooseneck[1] + sails.main.tackHeightAboveBoom) + sails.main.headY) / 3` (≈ 9.66 m), `hJib = (sails.jib.tack[1] + sails.jib.head[1] + sails.jib.clewTrimmedRef[1]) / 3` (≈ 8.25 m).

**Sail forces** (`sailForces.ts`):

```ts
export interface SailForce { areaM2: number; aoaDeg: number; fill: number; liftN: number; dragN: number; driveN: number; sideN: number; ceHeightM: number }
export interface SailForces { main: SailForce; jib: SailForce; driveN: number; sideN: number; heelMomentNm: number; windageN: number }
export function sailForces(rig: RigState, controls: Controls, awsKn: number, awaDeg: number, heelDeg: number, data = boat): SailForces
```

For each sail:
- Main: `area = sails.main.officialAreaM2 · rig.applied.mainFurl / 100`; solution `s = rig.solution`. Jib: `area = sails.jib.officialAreaM2 · rig.jibSolution.unfurled`; `s = rig.jibSolution`. A furled sail (`s.furled`) has area 0.
- `α = s.byTheLee ? 90 : min(90, s.aoaDeg)`; `f = s.fill` (the solver's fill, not the drawn one).
- `CL = interp(liftByAoaDeg, α) · f`; `CD = interp(dragByAoaDeg, α) · f + floggingDragCoefficient · (1 − f)`.
- `q = ½ · ρa · knToMps(aws)²`; `L = q·area·CL`; `D = q·area·CD`.
- `β = |awa|` in radians. `drive = L·sin β − D·cos β`; `side = L·cos β + D·sin β` (a magnitude, towards leeward).
- Heel factor `k = cos²(heelDeg)` (M8; heel is 0 in M6, so k = 1): drive, side, lift and drag are each multiplied by k.

Totals: `driveN = Σ drive`, `sideN = Σ side`. `heelMomentNm = −sign(awa) · Σ side_i · (ceHeight_i + physics.hull.clrDepthM)`; it is used from M8 on (computed from M6). Its sign is negative when the wind is from starboard: it heels her to port. `windageN = −q · windage.areaM2 · windage.dragCoefficient · cos(awa)`: it pushes the boat back when the wind is from ahead.

**Hull resistance** (`hullResistance.ts`):

```ts
export interface Resistance { totalN: number; frictionN: number; residuaryN: number; linearN: number; inducedN: number; heelN: number; rudderN: number }
export function hullResistance(speedMps: number, sideForceN: number, heelDeg: number, rudderDeg: number, data = boat): Resistance
```

Let `V = |speedMps|`. All parts are ≥ 0; the caller applies them against the motion.
- `Re = max(1e5, V · frictionLengthFraction · LWL / ν)`, `Cf = 0.075 / (log10(Re) − 2)²`, `friction = ½·ρw·V²·wettedSurfaceM2·Cf·(1 + formFactor)`.
- `Fn = V / √(g·LWL)`, `residuary = interp(residuaryPerWeightByFroude, Fn) · m · g`.
- `linear = linearDragNPerMps · V`.
- `induced = side² / (½·ρw·max(V, vi)²·π·effectiveDraftM²) · min(1, V / vi)`, `vi = inducedMinSpeedMps` (only when `speedMps > 0`, else 0).
- `heel = (friction + residuary) · heel.resistanceIncreaseAt20Deg · (heelDeg / 20)²` (M8; 0 in M6).
- `rudder = ½·ρw·V²·rudderAreaM2·rudderDragCoefficient·sin²(rudderDeg)`.
- Going astern (`speedMps < 0`): `total = asternResistanceFactor · (friction + residuary + linear) + rudder`. Ahead: `total = friction + residuary + linear + induced + heel + rudder`.

Reference values with zero side force, upright, rudder 0 (tests, ±3 %): 4 kn 0.56 kN, 6 kn 1.36 kN, 8 kn 3.27 kN, 8.9 kn 5.04 kN, 9 kn 5.32 kN, 10 kn 9.52 kN.

**Boat motion** (`motion.ts`):

```ts
export interface MotionInputs { windDirDeg: number; twsKn: number; rudderDeg: number; rig: RigState; controls: Controls; engineThrustN: number }
export interface MotionReport { forces: SailForces; resistance: Resistance; awsKn: number; awaDeg: number; twaDeg: number }
export function stepBoat(boat: BoatState, inputs: MotionInputs, dt: number, data = boat): { boat: BoatState; report: MotionReport }
```

- Held still (`mode === 'held'`): return the boat unchanged; the report uses speed 0.
- Otherwise `n = ceil(dt / maxStepS)` substeps of `h = dt / n`. Per substep:
  1. `twa = wrap180(windDirDeg − heading)`, `(aws, awa) = apparentWind(tws, twa, V)` (not quantised).
  2. `F = sailForces(rig, controls, aws, awa, heel)`; `R = hullResistance(V, F.sideN, heel, rudderDeg)`.
  3. `a = (F.driveN + F.windageN + engineThrustN − sign(V)·R.totalN) / mEff` (with `V = 0` the resistance is 0). `V += a·h`. If V changed sign in this substep while `|driveN + windageN + engineThrustN| < R.totalN` at the new speed, set V = 0 (no jitter around zero).
  4. Yaw: `δeff = rudderDeg` in M6 (M8 adds grip and weather helm). `rTarget = V · tan(δeff·DEG) / turnLengthM` (rad/s). `r += (rTarget − r)·(1 − exp(−h / yawLagS))`, with r in rad/s; store it in deg/s.
  5. `heading = wrap360(heading + r·h)` (in degrees). `eastM += V·h·sin(heading)`, `northM += V·h·cos(heading)`.
- `rudderDeg` is `rig.applied.rudder` (the lagged wheel). A stopped boat does not turn (PT-35), and going astern turns the other way.

**Steady state** (for links without `bs`, Reset, and the calibration tests):

```ts
export function steadyState(controls: Controls, headingDeg: number, data = boat, opts: { heel?: boolean; windDirDeg?: number; twsKn?: number } = {}): { speedMps: number; heelDeg: number; awsKn: number; awaDeg: number }
```

Start with V = 0 and heel = 0, then repeat 40 times:
- `(aws, awa) = apparentWind(tws, twa, V)`.
- `rig = initialRig(controls, data, {}, { velocity: [V, 0, 0], headingDeg })`.
- `F = sailForces(rig, controls, aws, awa, heel)`.
- If `opts.heel` (M8): find `|heel|` in [0, 60] by 30 bisection steps on `|sailForces(rig, controls, aws, awa, x).heelMomentNm| − |rightingMomentNm(x)|` (recompute the forces at each trial heel x), give it the sign of `−awa`, then set `heel = ½·heel + ½·found` and recompute F at that heel.
- Find `Veq` in [0, 10] m/s by 30 bisection steps on `F.driveN + F.windageN − hullResistance(V, F.sideN, heel, 0).totalN` (F held fixed). Set `V = ½·V + ½·Veq`.

Return the final values. The test helper `bestSpeedKn(tws, twa, heel)` runs `steadyState` for every main sheet in {0, 2, 4, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100} × jib sheet in {0, 25, 50, 75, 100} (other controls at their defaults; wind direction = twa, heading 0) and returns the fastest.

**Autopilot** (`autopilot.ts`):

```ts
export function engageAutopilot(mode: 'heading' | 'wind', boat: BoatState, windDirDeg: number): AutopilotState
  // heading: target = round(boat.headingDeg); wind: target = round(wrap180(windDirDeg − boat.headingDeg)); integral 0
export function adjustAutopilot(ap: AutopilotState, turnDeg: number): AutopilotState
  // turnDeg + = turn the boat to starboard. heading: target = wrap360(target + turnDeg); wind: target = wrap180(target − turnDeg)
  // the integral resets to 0 when |turnDeg| > integralBandDeg
export function tackAutopilot(ap: AutopilotState, boat: BoatState, windDirDeg: number): AutopilotState
  // mirror across the wind: wind mode target = −target; heading mode target = wrap360(windDirDeg + wrap180(windDirDeg − heading)); integral 0
  // (the button reads "Tack" when |TWA| < 90, "Gybe" otherwise; both do this)
export function autopilotHeadingDeg(ap: AutopilotState, windDirDeg: number): number
  // heading mode: target; wind mode: wrap360(windDirDeg − target)
export function stepAutopilot(ap: AutopilotState, boat: BoatState, windDirDeg: number, rudderTargetDeg: number, dt: number, data = boat): { autopilot: AutopilotState; rudderTargetDeg: number }
```

`stepAutopilot`:
- `e = wrap180(autopilotHeadingDeg(ap, windDirDeg) − boat.headingDeg)`.
- If `|e| < integralBandDeg`: `integral = clamp(integral + kiPerS·e·dt, ±integralLimitDeg)`.
- `u = clamp(kp·e − kdS·boat.yawRateDegS + integral, ±maxRudderDeg)`.
- `rudderTarget += clamp(u − rudderTarget, ±rudderRateDegPerS·dt)`.

It writes `controls.ctl_rudder` inside the store's `step` (not through `setControls`, so it does not switch itself off).

### 6.4 Store and URL

- `AppState.boat`, `AppState.autopilot` as in 4.1.
- Actions: `{ type: 'setBoatMode'; mode: 'sailing' | 'held' }`. Sailing → Held: speed, yaw rate and heel become 0 at once, heading kept. Held → Sailing: starts from speed 0 (she accelerates).
  `{ type: 'autopilot'; command: 'off' | 'heading' | 'wind' | 'tack' | { turnDeg: number } }`.
- `setControls` with `ctl_rudder` in its values switches the autopilot to `off` and shows the notice "Autopilot on Standby: you took the wheel" for 3 s.
- `reset`: heading 0, position 0, Sailing, speed = `steadyState(defaultControls, 0)`, autopilot `heading` holding 0.
- Wind presets (Wind tab) now put the wind at the preset's angle **to the bow**: `ctl_wind_dir = wrap180(heading + preset.windFromDeg)`.
- `initialState`: `InitialOverrides` gains `boat?: Partial<BoatState>` and `autopilot?: AutopilotState`. The boat comes from the link (below). If Sailing and the link has no `bs`, `speedMps = steadyState(controls, heading).speedMps`. The autopilot comes from the link; **without `ap` it is `heading`, holding the link's heading**, so an old link shows the boat sailing on, not wandering.
- URL parameters (`urlState.ts`; written only when not the default, except `bs`):

| Key | Meaning | Default | Written |
|---|---|---|---|
| `hdg` | heading, integer 0–359 | 0 | when ≠ 0 |
| `bs` | boat speed, knots, 1 decimal, −10 … 15 | steady speed | always while Sailing |
| `held` | `1` = Held still | Sailing | when held |
| `ap` | `off`, `hdg`, `wind` | `hdg` (holding `hdg`) | when ≠ `hdg` or a target differs from the heading |
| `apt` | autopilot target: compass 0–359 (`hdg`) or signed TWA (`wind`) | current heading / TWA | with `ap` |

`wd` keeps its key and range; it now means the compass direction of the true wind (3.1). Out-of-range values fall back to the default, as in Phase 1.

### 6.5 UI

**Instrument strip** (`ui/instrumentStrip.ts`, replaces the wind chip of `windIndicator.ts`; the alerts below it stay in `windIndicator.ts`). Top left of the 3D view, `data-testid="instrument-strip"`, `data-part-id="fit_instrument_display"`, two lines, min font 13 px, tap opens the Wind tab (as the chip did):
- Line 1: speed `6.3 kn` (bold, 20 px), `HDG 315°`, and the autopilot badge: `AUTO 315°` (heading), `AUTO wind 45° S` (wind), nothing on Standby. Held still: `Held still` instead of the speed.
- Line 2: `True 45° S · 12 kn` and `App 30° S · 17 kn` (S = from starboard, P = from port; the apparent one is the AWA).
- Update the text only when a displayed (rounded) value changes.

**Wind tab** (`windPanel.ts`), top to bottom:
1. Segmented switch `Boat: [Held still] [Sailing]` (`data-testid="boat-mode"`).
2. The dial becomes a **compass**: N at the top, ticks every 10°, N/E/S/W labels; the boat icon in the middle rotated to the heading; the wind arrow comes from `compassDeg(ctl_wind_dir)`. Dragging sets the true wind's compass direction (snapped to the step); − / + move it by the step. Under the dial: `True wind from 060° · 60° to starboard of the bow` (use `windFromText(twa)` for the second part).
3. Speed slider as before.
4. Presets as before, now relative to the bow (6.4); hint text "Puts the wind at this angle to the bow."

**Autopilot** (`ui/autopilotPanel.ts`, `data-part-id="fit_autopilot_control"`): in the Ropes tab directly under the wheel row (Easy mode), and at the Helm station under the wheel (Realistic mode).
- Row 1: `[Standby] [Heading] [Wind]` (segmented, the active one pressed).
- Row 2: `[−10] [−1] [+1] [+10]` and `[Tack]` (or `[Gybe]` when |TWA| ≥ 90). Disabled on Standby.
- Text: `Holding 315°` / `Holding the wind at 45° to starboard` / `Standby: you steer`.
- Held still: the whole block is disabled with "The autopilot steers only while sailing."
- Buttons are at least 44 px high.

**Debug overlay** adds: `V`, `yaw`, `TWA/TWS`, `AWA/AWS`, `drive / side / resistance (kN)`, `autopilot e / integral`.

### 6.6 3D

- **World group** (`render3d/world.ts`): move the water plane and its grid into a group `world`. Each frame: `world.rotation.y = boat.headingDeg · DEG`, and the water mesh's local position `= (−mod(northM, s), y, −mod(eastM, s))` with `s` = the grid spacing (`SCENE.grid` spacing), so the grid streams past at the boat's speed and turns as she turns. The ripple texture keeps its drift. Held still: nothing moves (Phase 1).
- **Wind streaks and windex** use the **apparent** wind (`rig.wind.awaDeg`, `awsKn`) instead of the controls.
- **Wake** (`render3d/wake.ts`, `partId` `env_wake`): a ring buffer of 48 map positions of the transom centre (`hull.transomX` on the centreline), one every 0.25 s of sim time (12 s). Each frame, convert each point to the boat frame with `mapToBoat(point − boatPosition, heading)` and build a flat ribbon at y = 0.02: half-width `0.6 + 0.075·age` m; opacity `min(1, |V| / 8 kn) · (1 − age / 12) · 0.6`; white, `transparent`, `depthWrite: false`. Not drawn when Held still or below 0.3 kn. Sizes in `SCENE.wake`.
- The camera presets are in the boat frame already: the camera follows the boat.

### 6.7 Strings (`en.json`, new keys)

`boat.mode.label` "Boat", `boat.mode.held` "Held still", `boat.mode.sailing` "Sailing", `boat.mode.hint` "Held still: the boat does not move, as in Phase 1. Sailing: the boat moves and the sails feel the apparent wind (the wind you feel on a moving boat).", `instruments.speed` "{speed} kn", `instruments.heading` "HDG {deg}°", `instruments.held` "Held still", `instruments.true` "True {deg}° {side} · {speed} kn", `instruments.apparent` "App {deg}° {side} · {speed} kn", `instruments.side.s` "S", `instruments.side.p` "P", `instruments.auto.heading` "AUTO {deg}°", `instruments.auto.wind` "AUTO wind {deg}° {side}", `wind.compass` "True wind from {compass}° · {relative}", `wind.presets.hint2` "Puts the wind at this angle to the bow.", `autopilot.label` "Autopilot", `autopilot.off` "Standby", `autopilot.heading` "Heading", `autopilot.wind` "Wind", `autopilot.tack` "Tack", `autopilot.gybe` "Gybe", `autopilot.holdingHeading` "Holding {deg}°", `autopilot.holdingWind` "Holding the wind at {deg}° to {side}", `autopilot.standby` "Standby: you steer", `autopilot.heldStill` "The autopilot steers only while sailing.", `autopilot.tookWheel` "Autopilot on Standby: you took the wheel", `autopilot.minus10` "10° to port", `autopilot.minus1` "1° to port", `autopilot.plus1` "1° to starboard", `autopilot.plus10` "10° to starboard". Remove `wind.hint`'s "The boat does not move" sentence (Sailing is the default now): new text "The true wind (the wind over the water). While sailing, the sails feel the apparent wind."

### 6.8 Registry

Add `env_wake` (kind `env`, phase 2, names en "Wake", ru "кильватерный след", status en `draft`, ru `draft`, short "The disturbed water the boat leaves behind; it grows with speed."). `fit_instrument_display` and `fit_autopilot_control` exist; update their `short` text to describe what the app shows.

### 6.9 Tests (all must pass)

`tests/apparentWind.test.ts`, `tests/motion.test.ts`, `tests/autopilot.test.ts`, `tests/physicsTruths2.test.ts`, plus URL tests in `tests/urlState.test.ts`.

1. **PT-20**: the five `apparentWind` cases of 6.3 (±0.05 kn, ±0.1°).
2. **Resistance reference values** of 6.3 (±3 %), and the **PT-36 wall**: `R(10 kn) / R(8.9 kn) > 1.6` and `R(8.9 kn) / R(6 kn) > 3`.
3. **Calibration bands** (no heel; `bestSpeedKn`): TWS 12: TWA 45 → 6.3–7.4 kn; TWA 90 → 7.7–8.8; TWA 135 → 5.6–6.7; TWA 175 → 4.8–5.9. TWS 6, TWA 90 → 4.9–5.9. (Prototype: 6.86, 8.29, 6.15, 5.38, 5.40.)
4. **PT-21 no-go zone**: `bestSpeedKn(12, 20) < 1.5` and `bestSpeedKn(12, 45) > 2 · bestSpeedKn(12, 25)` (prototype 1.10, 6.86, 2.37). Time domain: Sailing, wind 12 kn from 0°, heading 0, start at 6 kn, main sheet 10, jib sheet 10, rudder 0, autopilot off: after 60 s |speed| is below 1 kn (she may drift backwards a little) and both sails are luffing (fill < 0.1).
5. **PT-22**: the best main sheet % found by `bestSpeedKn` at TWS 12 does not decrease from TWA 45 → 90 → 135 (prototype 12 → 40 → 100).
6. **PT-28 / tack**: wind 12 kn from 0°, heading 315 (TWA 45), main sheet 12, jib sheet 0, start at the steady speed, autopilot `wind` at 45. At t = 20 s `tack`. Within 50 s after the tack: TWA within −50 … −40, the jib's side has changed, both sheets unchanged, speed > 2 kn. (Prototype: new tack reached in 35–43 s, lowest speed about 2.5 kn.)
7. **PT-35**: Sailing, wind 0 kn, speed 0, rudder 35 for 10 s: heading changes by less than 0.5°. (M12 adds: with the engine at idle ahead the same rudder turns her.)
8. **Autopilot**: wind 12 kn from 90°, heading 0, main sheet 40, jib 100, steady speed, `heading` 0; after 60 s `turnDeg +20`. Overshoot ≤ 3°, within ±2° of 20 from 20 s after the change, |rudder| < 6° at the end. Same at 6 kn of wind (within ±2° after 30 s).
9. **Held still = Phase 1**: with `mode: 'held'`, 10 s of steps at 60 fps give a rig identical (θ, ψ, φ within 1e-9) to Phase 1's `step` with `AT_REST`, speed stays 0, heading unchanged.
10. **Symmetry**: `steadyState` at TWA +60 and −60 (same trim) give the same speed (±0.01 kn).
11. **Frame-rate independence**: from the beam-reach steady state, 30 s with rudder 10° then 30 s with rudder 0, stepped through the store at 30, 60 and 120 fps: final heading within 0.5°, speed within 0.05 kn, position within 1 m.
12. **No NaN / no runaway**: TWS {0, 12, 30} × TWA every 30° × main sheet {0, 100}, 60 s each at 10 fps through the store: every value finite, |speed| < 12 kn, heading in [0, 360).
13. **URL**: round trip of `hdg`, `bs`, `held`, `ap`, `apt`. An old link (`?wd=90&ws=12&ms=40`) opens with heading 0, TWA 90, Sailing, autopilot holding 0, speed = the steady speed.
14. All Phase 1 tests green. **The one allowed change to them:** a Phase 1 test that builds a store or state with `initialState(...)` and steps it gets `boat: { mode: 'held' }` added to its overrides (`InitialOverrides.boat?: Partial<BoatState>`), because the app now opens Sailing; and a URL test comparing a whole serialised string may expect the new `bs=` part. Nothing else in a Phase 1 test changes.

### 6.10 Screenshots (`scripts/shots.mjs`)

Add scenes at the three viewport sizes: `m6-beam-reach` (`?wd=90&ws=12&ms=40&js=100`, Side (port) and Helm), `m6-close-hauled` (`?wd=45&ws=12&ms=12&js=0&cam=top`), `m6-held` (`?wd=90&ws=12&held=1`), `m6-wind-tab` (Wind tab open), `m6-autopilot` (Ropes tab with the autopilot). Let the scene run 3 s before the shot so the wake and the strip show.

### 6.11 Done when

All M6 checks in `WORKFLOW.md` 7.2 pass on the phone; the tests above pass; screenshots looked at.

### 6.12 Not in M6

No heel, weather helm or round-up (M8). No map (M7). Loads in Realistic mode stay the Phase 1 estimates, using the true wind speed (M8 replaces them).

### 6.13 Decided in the M6 PR

Things the spec left open (each is "decided in the M6 PR"):

- **Branch** `m6-the-boat-sails` (the owner's prompt), not `m6-boat-sails`.
- **Quantising the apparent wind** (4.3) is skipped when the boat is exactly at rest and no wind override is passed: the rig then gets the controls' wind unrounded, so Phase 1 stays bit-exact for any wind speed. A moving boat, or `StepOptions.wind` / `initialRig(…, wind)`, always rounds to 0.1° and 0.05 kn. `RigState.wind` also holds `twaDeg` and `twsKn`; `rigWind()` in `sim.ts` builds it.
- **`steadyState`** has no `heel` option yet (M8 adds it with `heel.ts`); the signature is otherwise as in 6.3. A link with `held=1` or the Held switch gives a boat whose `stepBoat` returns the same object.
- **Drawn sails** follow the apparent wind: `mainSailInputFor` / `jibInputFor` take an optional third argument (the wind to draw; default: the controls' wind, so Phase 1 tests are unchanged) and the 3D boat passes `rig.wind`. The masthead wind indicator and the wind streaks also use the apparent wind. The Ropes tab's "jib in the main's wind shadow" note uses the apparent angle.
- **Autopilot commands:** tapping the mode that is already on does nothing (it keeps the target); the ±1/±10 buttons and Tack/Gybe do nothing on Standby (they are disabled). `AppState.autopilotNoticeS` counts the 3 s of "Autopilot on Standby: you took the wheel" (shown in the autopilot block and as an alert over the 3D view). The notice appears only if the autopilot was on, and only when the wheel value really changes.
- **Where the autopilot block sits:** Easy mode: full width in the compact rope list, directly after the wheel's row. Realistic mode: in the Helm station block under the wheel control (`realisticPanel.ts`), not inside the station drawing. Both are the same component (`ui/autopilotPanel.ts`).
- **Strip:** a tap opens the Wind tab (`Panel.showTab`). The side letter is left out for a wind straight ahead or astern. The alerts (Gybe, Tack, by the lee) moved 30 px lower to clear the two-line strip.
- **Wind tab text:** `True wind from 060° · 60° to starboard of the bow` (own strings `wind.relative.*`; Phase 1's `windFromText` and its strings were removed, nothing used them any more). The dial's Home / End keys set north / south. The − / + buttons turn the arrow one step clockwise / anticlockwise.
- **URL:** the boat parameters are written after `mode` and before the Realistic parameters. `ap=off` writes no `apt`. `apt` for heading mode is the compass target; for wind mode the signed TWA. A heading outside 0–359 or a speed outside −10…15 kn falls back (heading 0; the steady speed). The address bar is updated at most every 300 ms (the latest link when the timer runs out) instead of after the controls stop changing, because a boat under way changes `bs` and `hdg` all the time.
- **Phase 1 tests changed** (spec 6.9 item 14): tests that build a state and step it, or compare a whole state after a URL round trip, got `boat: { mode: 'held' }` (or a 6.8 kn speed that a link writes exactly); URL strings expect `bs=6.8`; the store's Reset test sets the boat held after the reset because Reset opens Sailing; one URL test adds `held=1`. Nothing else.
- **Screenshots script:** the older scenes and live checks open Held still (`held=1` is added to their links unless the label contains "m6"), because they are about the ropes and sails; `SHOTS_ONLY=m6` runs only the M6 scenes and checks.
- **Wake and water:** the wake is not tappable (the water under it is). The water plane steps along the grid with the boat, and the ripple texture is shifted by the plane's map position so the ripples stay fixed on the map. The registry kind of `env_wake` is `environment`, like the other environment parts.
- **Sources:** PT-20 and PT-36 stay `to-verify`: the candidate sources (Wikipedia) cannot be reached from the build environment (blocked by its network policy), so they were not read.

---

## 7. M7: Bird's-eye map and wind instrument

Branch `m7-map`.

### 7.1 Files

New: `src/model/track.ts`, `src/model/pointsOfSail.ts`, `src/ui/mapView.ts`, `src/ui/windInstrument.ts`. Changed: `src/model/settings.ts` (camera preset `map`), `src/ui/cameraBar.ts`, `src/app/app.ts` (skip the 3D render while the map shows), `src/app/store.ts` (track), `src/ui/windPanel.ts` (instrument dial), `content/i18n/en.json`, `content/registry/parts.json`.

### 7.2 Data

```json
"display": {
  "$comment": "Teaching display values (PHASE2_SPEC 7).",
  "noGoHalfAngleDeg": 45,
  "noGoSource": "PHYSICS_TRUTHS PT-21 [1]: about 45° either side of the true wind",
  "pointsOfSail": [
    { "id": "no_go", "fromDeg": 0, "toDeg": 40, "termId": "term_no_go_zone" },
    { "id": "close_hauled", "fromDeg": 40, "toDeg": 55, "termId": "term_close_hauled" },
    { "id": "close_reach", "fromDeg": 55, "toDeg": 80, "termId": "term_close_reach" },
    { "id": "beam_reach", "fromDeg": 80, "toDeg": 100, "termId": "term_beam_reach" },
    { "id": "broad_reach", "fromDeg": 100, "toDeg": 150, "termId": "term_broad_reach" },
    { "id": "run", "fromDeg": 150, "toDeg": 180, "termId": "term_run" }
  ],
  "pointsOfSailSource": "PHYSICS_TRUTHS [1] (Wikipedia, Point of sail): band edges are teaching choices",
  "trackSampleS": 1,
  "trackMaxPoints": 900
}
```

Add it as `physics.display`.

### 7.3 Model

```ts
export interface TrackPoint { eastM: number; northM: number; timeS: number }
export function appendTrack(track: readonly TrackPoint[], boat: BoatState, timeS: number, data = boat): TrackPoint[]
// appends when the last point is ≥ trackSampleS older; keeps the last trackMaxPoints; returns the same array object when nothing changes
export function pointOfSail(twaDeg: number, data = boat): PointOfSail   // by |TWA| band; edges belong to the higher band
```

`AppState.track` is filled in the store's `step` (Sailing only), cleared by `reset` and by `setBoatMode('sailing')`. Not in the URL.

### 7.4 UI: the map (`ui/mapView.ts`)

- `cam=map` adds `'map'` to `CAMERA_PRESETS`; the camera bar gets a `Map` button. While the map shows, the three.js canvas is hidden and `scene.render` is not called (saves battery); the labels in 3D are hidden.
- A `<canvas>` filling the 3D view, device pixel ratio capped at 2, redrawn at most 30 times a second.
- **Scale:** zoom levels 0.5, 1, 2, 4, 8 metres per CSS pixel (default 1); `+` / `−` buttons (44 px) bottom right; a scale bar bottom left ("100 m", or the nearest of 50/100/200/500/1000 m to 80 px).
- **Orientation:** north up by default; a `North up / Boat up` toggle top right. In Boat up the map rotates so the heading points up.
- **Grid:** thin lines every 50 m, stronger every 250 m, scrolling with the boat (the boat stays in the centre).
- **Track:** the `track` points as a polyline (2 px, grey), fading over its length.
- **Boat:** a hull outline to scale (LOA × beam, pointed bow); if it would be shorter than 24 px, draw it 24 px long and show "boat enlarged" under the scale bar. The boom (a line from the mast, at the drawn θ) and the jib chord on it. A dashed heading line 200 m ahead.
- **No-go zone:** a wedge from the boat towards where the true wind comes from, ±`noGoHalfAngleDeg`, radius 90 px, translucent red, label "No-go zone".
- **Points of sail:** faint labels round the boat at radius 120 px, at true-wind-relative angles 45 (close-hauled), 67 (close reach), 90 (beam reach), 125 (broad reach) and 180 (run), on both sides. The current one (`pointOfSail(TWA)`) is bold.
- **True wind:** a box top left with a north arrow, a big arrow showing where the wind blows to, and "True wind 12 kn from 060°". Plus a 3 × 3 field of faint arrows across the map, drifting downwind slowly (speed ∝ TWS).
- **Apparent wind:** a blue arrow at the boat towards the masthead, from the AWA direction, length 20 px + 3 px per knot of AWS, label "Apparent 17 kn".
- **Tapping** selects (and opens the info card): the boat → `part_hull`; the no-go wedge → `term_no_go_zone`; the true-wind box → `env_wind`; the apparent arrow → `term_apparent_wind`; a point-of-sail label → its `termId`.

### 7.5 UI: the wind instrument (`ui/windInstrument.ts`, `data-part-id="fit_instrument_display"`)

In the Wind tab under the switch, above the compass dial. An SVG dial, **boat up**:
- Ticks every 10°, labels 0, 30, 60, 90, 120, 150, 180 on both sides.
- A red arc on the port side and a green arc on the starboard side, from 20° to 60°. This is the usual close-hauled sector of wind instruments; it is a display convention, not a claim.
- The AWA needle is solid dark. The TWA needle is an outline with a "T" at its tip.
- In the centre, `AWS 17.1` in large type and `TWS 12.0` in small type. Under the dial: `Speed 6.3 kn · Heading 315°`. Held still: both needles coincide.

### 7.6 Strings and registry

Strings: `camera.map` "Map", `map.northUp` "North up", `map.boatUp` "Boat up", `map.zoomIn` "Zoom in", `map.zoomOut` "Zoom out", `map.enlarged` "boat enlarged", `map.noGo` "No-go zone", `map.trueWind` "True wind {speed} kn from {compass}°", `map.apparent` "Apparent {speed} kn", `pos.no_go` "In the no-go zone", `pos.close_hauled` "Close-hauled", `pos.close_reach` "Close reach", `pos.beam_reach` "Beam reach", `pos.broad_reach` "Broad reach", `pos.run` "Run", `instrument.aws` "AWS", `instrument.tws` "TWS", `instrument.under` "Speed {speed} kn · Heading {deg}°". Registry: add `term_close_reach` (draft; short "Sailing with the wind forward of the beam but not as close as close-hauled, about 60° off the wind.").

### 7.7 Tests

- `pointOfSail` band edges (39.9 → no_go, 40 → close_hauled, 180 → run, −90 → beam_reach).
- `appendTrack`: sampling every 1 s, at most 900 points, unchanged array when nothing is added.
- URL: `cam=map` round trip; an unknown `cam` falls back.
- Map maths: a pure helper `mapToScreen(eastM, northM, view)` (in `mapView.ts`, exported) tested for north-up and boat-up (a point 100 m ahead of the boat is straight up from the centre in Boat up).

### 7.8 Screenshots, done when

Screenshots `m7-map-close-hauled` (`?wd=45&ws=12&ms=12&js=0&cam=map`, after 20 s so a track shows), `m7-map-run` (`?wd=175&ws=12&ms=100&cam=map`), `m7-instrument` (Wind tab). Done when all M7 checks in `WORKFLOW.md` pass.

### 7.9 Decided in the M7 PR

Things the spec left open (each is "decided in the M7 PR"):

- **Branch** `m7-Map-and-wind-instrument` (the owner's prompt), not `m7-map`.
- **Strings:** the camera strings follow Phase 1's keys (`cam.map`, `cam.short.map`), not the spec's `camera.map`. New keys beyond 7.6: `map.label`, `map.orient`, `map.hint`, `instrument.hint`, `instrument.aria`, `instrument.fromStarboard`, `instrument.fromPort`; `cam.hint` gained a sentence about the map. `term_close_reach` is in the registry (draft) as the spec says.
- **The map is a camera preset, not a 3D view.** `CAMERA_PRESETS` ends with `map` (so the camera bar and the View tab list it after Free). The 3D camera keeps its pose while the map shows; `presetPose('map')` returns the default view only for a link that opens on the map. The map exists only when the 3D scene could be built (the camera bar, its only way back, comes with the scene).
- **Hiding the 3D scene:** the host gets `data-map` while the map shows. The stylesheet hides the three.js canvas (with `!important`, because three.js sets `display: block` inline) and the labels in 3D; the frame loop skips `scene.render` and calls `map.update` instead. The sim keeps running.
- **Track clock:** `appendTrack` is called with the rig's own clock (`rig.timeS`, which stands still while paused), so no new time field was added to the state. Held still adds no points and keeps the track drawn so far; switching back to Sailing and Reset clear it.
- **`MapViewport`** (exported from `ui/mapView.ts`) holds the boat's pixel position (`centreXPx`, `centreYPx`) as well as the size: the boat sits 24 px below the middle (`MAP.centreDownPx`) so that the strip and the wind box at the top do not hide the labels of the points of sail ahead of her. `mapToScreen(eastM, northM, view)` is as in 7.7; `view.upDeg` is 0 (north up) or the heading (boat up).
- **Zoom and North up / Boat up are the map's own state** (not in the link, not in the store): they reset when the page is reloaded.
- **Zoom levels and the default (owner's request on the PR):** the levels are 0.1, 0.2, 0.5, 1, 2, 4 and 8 m per pixel, and the map **opens on 0.1** (the spec had 0.5 … 8 and a default of 1). At 0.1 m/px the boat is about 155 px long, 5 times her length at the old closest zoom. Because of that: the scale bar also offers 5, 10 and 20 m; the grid has a faint 10 m level (the 50 m and 250 m levels as before); the no-go wedge and the ring of point-of-sail labels are 90 and 120 px for a small boat but grow with her (wedge = half her length + 45 px, labels = wedge + 30 px) so they stay off her hull, as far as the canvas allows: the ring never reaches higher than 120 px below the top of the view (under the strip and the wind box) or closer than 40 px to the sides, and the wedge stays 28 px inside it (on a phone about 92 px, on a big screen about 123 px); the blue arrow's head stops at the hull.
- **Boat drawing:** the deck outline from `hull.deckEdgeHalfBeam` (both sides), the boom at the drawn swing and pitch, the jib's chord from its tack to `jibClew(drawn φ, unfurled)`. She is true to scale at every level up to 0.5 m/px; at 1 m/px or less detail she would be under 24 px long, so she is drawn 24 px long (scale 24 / LOA) with "boat enlarged".
- **Points of sail labels:** the label of a point of sail sits in the direction a boat on that point of sail would **head**, i.e. at the true wind's bearing ± the angle (45, 67, 90, 125, 180). A label that would cover one already placed moves outwards in 16 px steps (the bold current one is placed first). The wedge's own label ("No-go zone", or "In the no-go zone" in bold while she is in it) sits off the wedge's middle line on the side away from the blue arrow and moves if it would cover "Apparent 17 kn" (a run, with the arrow along the middle line).
- **Taps:** the boat (an ellipse as long and as wide as she is drawn, at least 44 px each way, so a fingertip on a tiny boat hits her), then the blue arrow, then a point-of-sail label, then the wedge. Open water selects nothing. The wind box is an HTML button over the canvas (`data-part-id` `env_wind`), as are the zoom buttons, the scale bar and the North up / Boat up pair (top right, under Pause). The selected shape is outlined in orange.
- **Wind field and grid:** the 3 × 3 faint arrows are fixed to the screen, each drifting along the wind (2 px per knot per second, over 80 px, fading in and out); the grid is drawn in map space (50 m minor lines, 250 m major, minor lines left out when closer than 8 px).
- **Instrument dial:** the numbers 0…180 sit inside the ticks, the red and green close-hauled arcs outside the ring; the needles start outside the numbers in the middle (AWS big, TWS small). It is above the compass dial in the Wind tab, below the boat switch, with a hint that spells out AWA, AWS, TWA and TWS. The dial updates only when a rounded value changes.
- **A short hint on the map** ("Tap the red wedge, the blue arrow or a name to learn what it is.") shows between the scale bar and the zoom buttons for about 8 s each time the map opens (a CSS animation, no state), then fades out so that it never covers the labels; the explanations are the info cards (the registry texts) and the sentence about the map in the View tab's camera hint.
- **Debug:** with `?debug=1` the page has `window.__sailMap` (`trackPoints()`, `currentPointOfSail()`, `centre()`) for the screenshot script, like `__sailDebug`.
- **Screenshots script:** `SHOTS_ONLY=m7` runs only the M7 scenes and checks; scenes and checks with "m7" in the label open Sailing; the default output folder is `docs/screenshots/m7` and the prefix `m7-`.
- **PHYSICS_TRUTHS:** M7 adds no rules. The tests that draw PT-20 (the apparent wind arrow) and PT-21 (the no-go wedge) are named after those ids.

---

## 8. M8: Heel, forces and weather helm

Branch `m8-heel-forces`.

### 8.1 Files

New: `src/model/heel.ts`, `src/model/sheetLoads.ts`. Changed: `motion.ts` (heel, weather helm, grip), `sailForces.ts` (heel factor already there), `realistic.ts` (loads), `sim.ts` (`RigState.forces`), `render3d/scene.ts` (heel rotation), `ui/instrumentStrip.ts` (heel), the Ropes tab strip and the Realistic strip (loads in kN), `windIndicator.ts` (round-up and "overpowered" alerts), `hanse508.json`, `en.json`, `BOAT_REFERENCE.md`. Delete `realisticMode.loads.sheetLbPerFt2PerMph2` and `sheetSource`, and the `sheetLoadAtSailN` helper.

### 8.2 Data (add to `physics`)

```json
"heel": {
  "rightingCurveNote": "assumption: RM(φ) = RM30 · sin(1.5 φ) / sin 45° with RM30 = dimensions.rightingMomentKNmAt30Deg (98.3 kNm, manual), peaking at 60°; GM ≈ 1.36 m at small angles",
  "rollGyrationBeamFraction": 0.35,
  "rollAddedInertiaFraction": 0.2,
  "rollDampingRatio": 0.6,
  "maxHeelDeg": 60,
  "resistanceIncreaseAt20Deg": 0.06,
  "weatherHelmDegPerDegHeel": 0.3,
  "weatherHelmNote": "assumption: heel adds a turn towards the wind like 0.3° of rudder per degree of heel (about 5° of rudder at 17° of heel, cf. PHYSICS_TRUTHS [16]: more than 5–7° of rudder means too much heel)",
  "rudderGripByHeelDeg": [[0, 1], [20, 1], [40, 0.2], [90, 0.2]],
  "rudderGripNote": "assumption: the rudder loses grip as she heels past 20° (it comes out of the water and stalls)",
  "overpoweredHeelDeg": 25,
  "roundUpMinHeelDeg": 25,
  "roundUpMinYawRateDegS": 2
},
"loads": {
  "jibSheetLoadFraction": 1.0,
  "jibSheetLoadNote": "assumption: the jib sheet carries about the whole jib force (consistent with PHYSICS_TRUTHS [8])",
  "mainCeAlongFootFraction": 0.333
}
```

The righting moment stays in `dimensions.rightingMomentKNmAt30Deg`; do not copy it. **Tunable in M8:** `weatherHelmDegPerDegHeel`, `rudderGripByHeelDeg`, `rollDampingRatio`.

### 8.3 Model

- `heel.ts`:

```ts
export function rightingMomentNm(heelDeg: number, data = boat): number  // signed like heelDeg: RM30·1000·sin(1.5·min(|φ|,60)°)/sin45° · sign(φ)
export function rollInertia(data = boat): number   // m·(rollGyrationBeamFraction·beam)²·(1 + rollAddedInertiaFraction) ≈ 52,000 kg·m²
export function rollDamping(data = boat): number   // 2·ζ·√(I·k0), k0 = RM30·1000·1.5/sin45° per radian ≈ 208,600 N·m/rad
```

- In each `stepBoat` substep, after the forces: `p += (F.heelMomentNm − rightingMomentNm(φ) − c·p) / I · h` (p in rad/s), `φ += p·h` (degrees). Clamp |φ| ≤ `maxHeelDeg` (then p = 0). `sailForces` uses the current φ (cos² factor), and `hullResistance` uses it too.
- Yaw: `grip = interp(rudderGripByHeelDeg, |φ|)`, `δeff = grip · rudderDeg − weatherHelmDegPerDegHeel · φ`. Check: wind from starboard → φ < 0 → +δ → turns to starboard, into the wind.
- **Round-up** (a flag for the alert): `|φ| ≥ roundUpMinHeelDeg` and the boat turns towards the wind at more than `roundUpMinYawRateDegS` (sign(yawRate) = sign(TWA)) while |rudder| ≥ 90 % of its limit (the autopilot's 25° or the wheel's 35°) against the turn. It stays set for 3 s.
- `steadyState(…, { heel: true })` as in 6.3.
- Held still: heel stays 0 (Phase 1). The forces are still computed (for the loads), with heel 0.
- `sheetLoads.ts`:

```ts
export interface SheetLoads { mainSailForceN: number; jibSailForceN: number; mainSheetBlocksN: number; mainSheetRopeN: number; jibSheetRopeN: number }
export function sheetLoads(rig: RigState, forces: SailForces, data = boat): SheetLoads
```

  - `mainSailForceN = hypot(main.liftN, main.dragN)`; `dCE = sails.main.footLength · mainFurl/100 · mainCeAlongFootFraction`.
  - `mainSheetBlocksN = mainSailForceN · dCE / rig.mainsheet.boomDistance` when the main sheet is `taut`, else 0.
  - `mainSheetRopeN = mainSheetBlocksN / (2 · rig.mainsheet.partsPerSide)`.
  - `jibSailForceN = hypot(jib.liftN, jib.dragN)`. `jibSheetRopeN = jibSailForceN · jibSheetLoadFraction / sails.jib.sheet.purchase` when the jib sheet is `taut`, else 0.
- `RigState.forces` holds the frame's `SailForces`. In Realistic mode, `ropePullN` uses `sheetLoads(...).mainSheetRopeN` / `jibSheetRopeN` for the two sheets, and `mainSailLoadN` returns `mainSailForceN · dCE / boomDistance`. Vang, topping lift, furling lines and the fighting load are unchanged. Because the forces use the **apparent** wind, a gust or a faster boat raises the loads.

### 8.4 UI and 3D

- 3D: the boat group (hull, rig, sails, ropes; not the water or the wake) gets `rotation.x = heelDeg·DEG`. The camera does not heel.
- Instrument strip line 1: `Heel 17° P` (P = the port rail down, S = starboard).
- Alerts (`windIndicator.ts` alert stack): **"Heeling a lot: ease the main sheet or roll some sail away"** when |heel| > `overpoweredHeelDeg` for more than 2 s; **"ROUND-UP: she turned into the wind by herself. Ease the main sheet!"** while the round-up flag is set.
- Ropes tab, the selected rope's strip and the Realistic station strip: for the main and jib sheets, `Load 1.8 kN (about 180 kg)`. The kg figure is N / 9.81, rounded to 10 kg.
- Debug: heel, heel rate, heeling moment and righting moment (kNm), grip, δeff.

### 8.5 Strings

`instruments.heel` "Heel {deg}° {side}", `alert.overpowered` "Heeling a lot: ease the main sheet or roll some sail away", `alert.roundUp` "ROUND-UP: she turned into the wind by herself. Ease the main sheet!", `ropes.load` "Load {kn} kN (about {kg} kg)".

### 8.6 Tests

1. `rightingMomentNm(30) = 98,300 ± 1`, `(−30) = −98,300`, increasing up to 60°.
2. **Calibration with heel** (`bestSpeedKn(..., heel = true)`): TWS 12: TWA 45 → 6.0–7.1 kn with heel 14–21°; TWA 90 → 7.6–8.7. TWS 20: TWA 45 → 7.3–8.5 kn with heel 25–36°. (Prototype 6.55 / 17.3°, 8.19, 7.90 / 30.7°.)
3. **PT-25**: TWS 20, TWA 60, jib sheet 25, steady state: heel at main sheet 60 is smaller than at main sheet 25; heel with the main 50 % furled (`ctl_main_furl` 50) is smaller than with it full.
4. **PT-29**: steady speed at TWS 20, TWA 45 (best trim) is lower with heel than without (prototype 7.90 vs 8.48); and the autopilot's steady |rudder| holding TWA 50 is larger at TWS 20 than at TWS 10.
5. **PT-32 round-up**: wind from 0°, TWS 18, heading 310 (TWA 50), main sheet 15, jib sheet 20, steady state, autopilot `heading` 310. At t = 60 s set TWS 28. Within 30 s the heading has moved at least 10° towards the wind (TWA < 40) and the round-up flag was set. Same run, but at t = 62 s main sheet → 50: the heading stays within 5° of 310. (Prototype: rounded up to TWA 29; eased: stayed at 314.)
6. **PT-36 top speed**: `bestSpeedKn(30, TWA, heel)` ≤ 11.0 kn for TWA in {60, 90, 110, 135}; and on a beam reach the gain from TWS 20 → 30 is less than the gain from 12 → 20 (prototype +1.38 then +0.64; 30 kn best about 10.6 kn).
7. **Loads**: wind 12 kn from 90°, Held still, main sheet 40: `mainSheetRopeN` between 200 and 700 N. `jibSheetRopeN` > 0 only when the jib sheet is taut.
8. Phase 1's PT-16, PT-18 and PT-19a tests still pass with the new loads. If one fails, do not change the capstan or winch values: report the numbers in the PR.

### 8.7 Screenshots, done when

`m8-heeled` (`?wd=45&ws=20&ms=15&js=0`, Bow and Side views), `m8-load` (Ropes tab, main sheet selected). Done when all M8 checks in `WORKFLOW.md` pass.

### 8.8 Decided in the M8 PR

Things the spec left open or got wrong (each is "decided in the M8 PR"):

- **Branch:** the owner's prompt named `m8-heel-forces`; the cloud session's designated branch is `claude/m8-heel-forces-2xocvk`, so the PR comes from that. (The prompt also called M8 "Map and wind instrument"; that was M7, already merged. This PR is section 8, heel and forces.)
- **State:** `BoatState` gains `roundUpS` (seconds the round-up alert still shows, set to 3 while the round-up test is met) and `overpoweredS` (seconds spent beyond `overpoweredHeelDeg`; the alert shows after 2 s). `MotionReport` gains `heelMomentNm`, `rightingMomentNm`, `grip`, `effectiveRudderDeg` and `roundUp`. `MotionInputs` gains an optional `rudderLimitDeg` (the autopilot's 25° while it steers, else the wheel's 35°) for the round-up test. `BoatMotion` gains an optional `heelDeg` (missing = upright), so `initialRig` and `step` can compute `RigState.forces` at the boat's heel; `sailForces` takes `Pick<RigState, 'applied' | 'solution' | 'jibSolution'>`.
- **Order inside a substep:** forces and resistance at the heel the substep starts with, then speed, then the roll (`p`, `φ`), then the yaw with the new grip and heel. The round-up test uses the yaw rate and the rudder of the substep that has just run.
- **Opening state:** a Sailing link opens at its steady speed **and steady heel** (`steadyState(…, { heel: true })`); with `bs` in the link the speed comes from the link and the heel from the steady state (it settles within a few seconds). The wheel and autopilot integral are not preset, so an old link still wanders about 1° while the autopilot finds the rudder that balances the weather helm (about 10 s).
- **Strip:** the heel is hidden below 1° (and while Held still); the side letter follows the sign of the heel (+ = starboard rail down = `S`). The alerts may now wrap onto two lines on a phone.
- **Loads:** the strip shows `Load … kN (about … kg)` only while the sheet is taut (the main uses `mainSheetRopeN`, the tail the crew holds). Realistic mode's `mainSailLoadN` is `mainSailForceAtBlocksN` (the main's force × `dCE` / `boomDistance`, the same lever as the sheet blocks). Held still computes the forces with heel 0.
- **Tuned (spec 0, tunable keys, before → after):**
  - `weatherHelmDegPerDegHeel` 0.30 → **0.32**: with 0.30 the round-up of PT-32 turned her at most 1.91°/s, just under the 2°/s of `roundUpMinYawRateDegS`, so the flag never set; now 2.08°/s (min TWA 31.6). Also why the pre-gust heading is 311.7, not 311.4.
  - `rollDampingRatio` 0.6 → **1.2**: with the spec's values the lowest speed of the M6 PT-28 tack (spec 6.9, item 6: "speed > 2 kn", prototype 2.5 kn **without heel**) was 1.97 kn, because she now starts the tack at her heeled steady speed (6.35 kn, not 6.86 kn); with 1.2 it is 2.005 kn, a margin of only 0.005 kn. **Owner's answer (2026-10-12): keep 0.32 and 1.2; if the PT-28 tack test fails in a later milestone, lower its minimum to 1.5 kn ("she does not stop") rather than retuning.** 0.6 → 1.2 is also easier on a beginner (no rocking); 1.4 would pass PT-28 with a margin but made the PT-32 flag fail at 0.30.
  - `rudderGripByHeelDeg` unchanged.
- **Phase 1 and M6 tests changed** (spec 8.6 item 8 asks for a report, not a change):
  - Realistic mode's sheet loads now come from the sail forces, which are lower than the Phase 1 rule (jib sheet at 20 kn true wind from abeam: 1.9 kN, was 2.8 kN; main at 20 kn, wind 60°: about 3.7 kN at the blocks, was 6.7 kN). The capstan and winch values are untouched. Tests that need the old load got the wind that gives it back (the thresholds are unchanged): `tests/realistic.test.ts` PT-16 (20 → 24 kn; title says 24 kn), `tests/realisticHandle.test.ts` PT-19 heavy jib sheet (25 → 30 kn), the strain-bar test (20 → 24 kn), the two main-furling-line tests (20 → 27 kn). The same tests' `start()` helper opens **Held still** (spec 6.9 item 14 rule: a test that builds a state and steps it). The practice scenario `furlLineSlips` in `hanse508.json` and its text and the M4c checklist link in WORKFLOW went from 20 to 27 kn for the same reason. **Owner's answer (2026-10-12): keep the new loads; do not raise `jibSheetLoadFraction` or `mainCeAlongFootFraction`** (source [8] is a gear-sizing rule of thumb, expected to be on the high side); the test changes and the 27 kn practice link are accepted; the PT-16 and PT-18 "How to see it" lines in PHYSICS_TRUTHS go to 24 kn in M9.
  - `tests/physicsTruths2.test.ts`, "Sailing to Held": the heading is compared with the heading just before the switch (it was compared with the literal 130°, which weather helm now moves by about 0.7°), and the heel is checked to be 0.
  - `tests/urlState.test.ts`: the `jr` test opens Held still (the autopilot's wheel now balances the weather helm, `rd=-3`); the two "steady speed" tests compare with `steadyState(…, { heel: true })`.
- **Debug overlay:** three rows: heel and heel rate, heeling and righting moment (kNm), grip and `δeff`.
- **Sources:** [16] and [17] could not be opened from the build environment (the hosts do not resolve), so PT-25, PT-29 and PT-32 stay `to-verify`.
- **Screenshots script:** `SHOTS_ONLY=m8` runs only the M8 scenes and live checks (heel, alert, easing, Held still, the round-up with the main hard in and eased, the load line); scenes and checks with "m8" in the label open Sailing; the default output folder is `docs/screenshots/m8` and the prefix `m8-`. The script empties its folder at the start, so a run with `SHOTS_SCENE` leaves only that scene.

---

## 9. M9: Trim quality and telltales

Branch `m9-trim`.

### 9.1 Data (add to `physics`)

```json
"trim": {
  "luffingBelowFill": 0.5,
  "stallAboveAoaDeg": 25,
  "stallNote": "assumption: just past the peak of liftByAoaDeg (20°)",
  "pushedFromAwaDeg": 150,
  "telltaleHeights": [0.25, 0.5, 0.75],
  "telltaleLuffAoaDeg": 6,
  "blanket": { "fromAwaDeg": 150, "fullAwaDeg": 170, "jibForceFactorAtFull": 0.15 },
  "blanketNote": "assumption: on a run the main takes the jib's wind (PT-37)",
  "flogging": { "minAwsKn": 8, "referenceAwsKn": 20, "lifeS": 600, "warnAt": 0.5, "tornForceFactor": 0.4 },
  "floggingNote": "assumption: 10 minutes of flogging at 20 kn apparent wind tears a sail; damage grows with the square of the wind"
}
```

### 9.2 Model (`trim.ts`)

```ts
export type TrimState = 'furled' | 'luffing' | 'good' | 'stalled' | 'pushed' | 'blanketed';
export interface SailTrim { state: TrimState; telltales: { heightFraction: number; windward: 'streaming' | 'lifting'; leeward: 'streaming' | 'stalled' }[] }
export function sailTrim(sail: 'main' | 'jib', rig: RigState, awaDeg: number, data = boat): SailTrim
export function blanketFactor(awaDeg: number, data = boat): number   // 1 below fromAwaDeg, smoothstep down to jibForceFactorAtFull at fullAwaDeg and beyond
```

- The state is checked in this order: `furled` (area 0); `blanketed` (jib only, `blanketFactor < 0.5`); `pushed` (|AWA| ≥ `pushedFromAwaDeg` or by the lee: on a run the sail is pushed, telltales do not apply); `luffing` (fill < `luffingBelowFill`); `stalled` (AoA > `stallAboveAoaDeg`); otherwise `good`.
- Telltales at each height fraction h: local AoA `αh = AoA − twistTop · h`, where `twistTop` is `mainSailTwistDeg(ψ)` (main) or the jib solution's `twistDeg` (jib). The windward one is `lifting` if `αh < telltaleLuffAoaDeg`, else `streaming`. The leeward one is `stalled` if `αh > stallAboveAoaDeg`, else `streaming`. So with twist the top luffs first.
- `sailForces`: the jib's area is multiplied by `blanketFactor(awa)`.
- Flogging damage `AppState.sailDamage = { main: number; jib: number }` (0…1): in the store's `step`, for each sail with state `luffing` and AWS ≥ `minAwsKn`, add `dt · (AWS / referenceAwsKn)² / lifeS`. At ≥ 1 the sail is **torn**: its forces × `tornForceFactor`. Damage is not in the URL. Reset and the "Repair sails" button set it to 0.

### 9.3 UI and 3D

- **Sails panel** (`ui/sailsPanel.ts`) in the Ropes tab above the rope list: one row per sail: name, state chip (`Good` green, `Luffing` amber, `Stalled` red, `Pushed (running)` grey, `Blanketed by the main` grey, `Furled` grey), and the hint for that state:
  - luffing: "Pull the sheet in until the front stops flapping."
  - stalled: "Ease the sheet: the leeward telltales hang."
  - good: "Both telltales stream."
  - pushed: "On a run the wind just pushes the sail."
  - blanketed: "The mainsail is taking the jib's wind."
  
  Colour is never the only signal (the text says it). A damage bar appears when damage > 0, with "Flogging wears the sail" from `warnAt`, and "Torn" plus a `Repair sails` button at 1.
- **Telltales** (`render3d/boat/telltales.ts`, part id `part_telltale`): for each sail, 3 heights × 2 faces. Each is a thin ribbon 0.35 m × 0.03 m (0.06 m wide, decided in the M9 PR), placed 0.6 m (main) or 0.8 m (jib) aft of the luff along the chord, 0.03 m off each face. Port face red, starboard face green (presentation choice). Animation per frame:
  - streaming: lies along the chord with a small wiggle (±5°, 3 Hz);
  - lifting: tilted 60° upwards and fluttering (±25°, 8 Hz);
  - stalled: hangs 70° down and fluttering slowly (±15°, 2 Hz).
- **Torn sail:** a dark zig-zag line across the sail at mid-height (a thin line mesh on the sail grid), and the panel row says "Torn".
- Instrument strip: a small `⚠ sail` badge when any damage ≥ `warnAt`.

### 9.4 Strings and registry

The state chips, hints and buttons above as `trim.*` keys. Registry: `part_telltale` (draft; "Short ribbons on the sail near its front edge. Both streaming aft: good trim. The windward one lifting: luffing. The leeward one hanging: stalled."; `term_telltale` exists, link it in `short`).

### 9.5 Tests

1. **PT-23**: TWS 12, TWA 60, steady state at main sheet 25 (was 40; decided in the M9 PR) → main `good`; at main sheet 0 → `stalled`, the main's drive is lower and its side force higher than at 40.
2. Telltales: with the main `good` but twist 10°, the top windward telltale lifts first when easing (a sweep of the main sheet finds a setting where the top one lifts and the bottom one does not).
3. **PT-37**: TWA 175, TWS 12: jib `blanketed`, `blanketFactor ≤ 0.2`. TWA 120: factor 1.
4. **PT-38**: Held still, wind 25 kn from 0° (head to wind, both sails luffing): after `lifeS · (20/25)²` = 384 s ± 1 s of steps the main is torn. With wind 6 kn: no damage after 1 hour.
5. Calibration after blanketing: `bestSpeedKn(12, 175, heel)` 3.7–5.0 kn (estimate about 4.2 kn: only the main pulls on a run).

### 9.6 Screenshots, done when

`m9-telltales-good` (`?wd=60&ws=12&ms=25&js=50&cam=side-starboard`, close up; `ms=25` instead of 40, decided in the M9 PR), `m9-stalled` (`ms=0`), `m9-sails-panel`. Done when all M9 checks pass.

### 9.7 Decided in the M9 PR

Things the spec left open or got wrong (each is "decided in the M9 PR"):

- **Branch:** the owner's prompt named `m9-trim`; the cloud session's designated branch is `claude/quirky-sagan-3cpy78`, so the PR comes from that (as in M8).
- **The sheet values of the spec's test and checklist (9.5 item 1, WORKFLOW M9) do not give "good" trim.** With the Phase 1 rig solver, at TWS 12 and TWA 60 (steady state, with or without heel) main sheet 40 is already **luffing** (apparent wind about 42°, angle of attack about 2°, the boom can swing out to about 42°) and main sheet 0 is **stalled** (angle of attack 40°). Good trim, with the angle of attack between the luffing edge (6°) and the stall edge (25°), is main sheet **18–28** (best speed at 20–22: 7.5 kn). The formulas of 9.2 are implemented exactly; nothing tunable was changed. So the PT-23 test and the screenshots use main sheet **25** (angle of attack 16°, all telltales stream) in place of 40, and the WORKFLOW checklist links were changed to `ms=25`. Owner's answer: accepted; 40 was the beam-reach setting, and the Phase 1 sheet scale needs no review.
- **The M6 calibration band for TWA 175 changed** (`tests/motion.test.ts`): blanketing lowers the best speed on a run from 5.4 to 4.7 kn (no heel), so the M6 band 4.8–5.9 became 3.7–5.0, the band 9.5 item 5 gives for the same case (with heel the best speed is the same, 4.7 kn). Accepted by the owner. Nothing else in an M6 or M8 test changed.
- **Where the damage and the blanketing enter:** `sailForces(rig, controls, aws, awa, heel, data, damage = NO_DAMAGE)` takes the damage as a trailing argument; the jib's area is multiplied by `blanketFactor(awa)`, a torn sail's lift and drag by `tornForceFactor` (0.4). `step` (`StepOptions.damage`) and `stepBoat` (`MotionInputs.damage`) pass it on, so a torn sail also lowers `RigState.forces` and the Realistic mode loads. `initialRig` and `steadyState` use whole sails (damage is not in the link).
- **State of a torn sail:** its trim state is still the solver's (a torn sail can be luffing and goes on wearing, capped at 1); the panel chip says "Torn" in place of the state, unless the sail is furled.
- **Flogging damage uses the rig's quantised apparent wind** (`rig.wind`), the sim time step with the pause (dt = 0 while paused) and the speed-up of M10 when it arrives (it multiplies `dt` before `step`).
- **Telltales when the state is `pushed`, `blanketed` or `furled`:** none are drawn (`SailTrim.telltales` is empty). The ribbon angle is measured in the sail's plane from the chord (+ = up the sail), moved to a new state with a 0.15 s time constant so a state change is not a jump. They are placed from the drawn sail grid (curve, twist, flapping), at the height fractions of the rows (the main's rows are not evenly spaced in height, so 25/50/75 % are approximate). The leeward face is the side the sail curves to (`curveSide`), as the sail drawing uses.
- **Ribbon size: 0.35 m × 0.06 m** (owner's answer on the PR: wider than the spec's 0.03 m, so they show better; `SCENE.telltales.widthM`).
- **The jib is drawn emptier when blanketed:** the drawn fill is multiplied by `blanketFactor` (render layer only, `render3d/boat/index.ts`), so on a run the jib hangs and flaps ("hangs empty" in the WORKFLOW check). Phase 1's drawing functions are untouched.
- **Torn sail look:** a dark zig-zag strip (two quads thick, 6 cm wide, one each side of the sail) across the mid-height of the sail; it is part of the sail (`sail_main` / `sail_jib`), so a tap on it identifies the sail. `SCENE.telltales` holds the sizes.
- **Sails block:** one block (`ui/sailsPanel.ts`) in the Ropes tab after the selected rope's strip and above the rope list in Easy mode; in Realistic mode the same block moves to the top of the Ropes tab. The wear bar shows from the first damage (percent), "Flogging wears the sail" from `warnAt`, "Torn" at 1; the Repair sails button shows when a sail is torn and sets both sails to new. The instrument strip shows `⚠ sail` from `warnAt`.
- **Registry:** `part_telltale` (draft); its short text mentions the `term_telltale` term (the registry has no link field).
- **Debug hook:** with `?debug=1`, `__sailDebug.setDamage(main, jib)` sets the damage so the torn look can be shot at once; the screenshot script uses it.
- **Screenshots script:** `SHOTS_ONLY=m9` runs only the M9 scenes and live checks; scenes and checks with "m9" in the label open Sailing; the default output folder is `docs/screenshots/m9` and the prefix `m9-`.
- **Sources:** [13] and [14] (Wikipedia, Practical Sailor) could not be opened from the build environment (403), so PT-23, PT-37 and PT-38 stay `to-verify`.

---

## 10. M10: Wind modes

Branch `m10-wind-modes`.

### 10.1 Data (top-level `windModes` in `hanse508.json`)

```json
"windModes": {
  "$comment": "PHASE2_SPEC 10. Teaching wind patterns; all values are assumptions (EXERCISES.md 4).",
  "maxTwsKn": 40,
  "timeScales": [0.25, 0.5, 1, 2, 4, 8, 16],
  "gusty": { "meanIntervalS": 45, "riseS": 3, "holdMinS": 4, "holdMaxS": 10, "fallS": 5,
             "strengthDefaultPct": 30, "strengthMinPct": 10, "strengthMaxPct": 60,
             "veerMaxDeg": 10, "lullFraction": 0.5, "noisePct": 5, "noisePeriodsS": [23, 37] },
  "shifty": { "periodsS": [180, 67], "weights": [0.6, 0.4], "sizeDefaultDeg": 15, "sizeMinDeg": 5, "sizeMaxDeg": 40, "speedNoisePct": 5 },
  "building": { "changeDefaultKn": 10, "changeMaxKn": 20, "rampS": 600 },
  "dying": { "changeDefaultKn": 8, "changeMaxKn": 20, "rampS": 600 },
  "gustBadgeFraction": 1.1
}
```

### 10.2 Model (`random.ts`, `windModes.ts`)

```ts
export function mulberry32(seed: number): () => number   // standard mulberry32, returns [0, 1)
export type WindModeId = 'steady' | 'gusty' | 'shifty' | 'building' | 'dying';
export interface WindModeState { mode: WindModeId; seed: number; size: number; startS: number }   // size: % (gusty), ° (shifty), kn (building/dying)
export function windAt(meanDirDeg: number, meanKn: number, wm: WindModeState, timeS: number, data = boat): { dirDeg: number; twsKn: number }
```

`windAt` is a **pure function of its arguments** (same seed and time → same wind, whatever the frame rate). `t = timeS − wm.startS` (≥ 0). Result: `twsKn` clamped to [0, maxTwsKn], `dirDeg = wrap180(...)`.
- `steady`: the means.
- `gusty`: rebuild the event list from `t = 0` on every call (it is short):
  - `rnd = mulberry32(seed)`, `at = 0`. Repeat while `at < t`:
    - gap `= −meanIntervalS · ln(1 − rnd())`, `at += gap`;
    - `hold = holdMinS + rnd()·(holdMaxS − holdMinS)`, `amp = 0.7 + 0.6·rnd()`, `veer = rnd()·veerMaxDeg`;
    - the events alternate: gust, lull, gust, …;
    - each event's envelope `e(τ)`: from 0 to 1 over `riseS`, 1 for `hold`, back to 0 over `fallS` (smoothstep on the ramps), with τ the time since `at`.
  - `twsKn = meanKn · (1 + noise + Σ_events e·k)`, where `k = +size/100·amp` for a gust and `−lullFraction·size/100·amp` for a lull.
    **Changed on the M10 PR (owner, 2026-10-12):** the summed event term `Σ_events e·k` is capped at what one event can reach, between `−lullFraction·size/100·1.3` and `+size/100·1.3` (1.3 = the largest `amp`), so overlapping gusts cannot pile up. The noise is added after the cap, and the random draws are unchanged. See 10.6.
  - `noise = noisePct/100 · (0.6·sin(2πt/23 + p1) + 0.4·sin(2πt/37 + p2))`, with `p1 = 2π·rnd()` and `p2 = 2π·rnd()` drawn first from the same stream.
  - `dirDeg = meanDir + Σ_gusts e·veer` (gusts veer clockwise; lulls do not change direction).
- `shifty`: `rnd = mulberry32(seed)`; draw `p1, p2, p3 = 2π·rnd()` in that order. `dirDeg = meanDir + size·(0.6·sin(2πt/180 + p1) + 0.4·sin(2πt/67 + p2))`; `twsKn = meanKn·(1 + speedNoisePct/100·sin(2πt/29 + p3))`.
- `building`: `twsKn = meanKn + size·smoothstep(0, rampS, t)`. `dying`: `max(0, meanKn − size·smoothstep(0, rampS, t))`.
- `AppState.windMode` (default `steady`, `seed` 1, `size` = the mode's default). Changing the mode, the size or the seed sets `startS = rig.timeS`. The store passes `windAt(...)` to `step` (4.3, `StepOptions.wind`) and to `stepBoat`. The autopilot's wind mode uses the **current** wind direction (so it follows shifts).
- Time scale `AppState.settings.timeScale ∈ windModes.timeScales` (¼ … 16, issue #25): `dtSim = min(MAX_STEP_S, dt) · timeScale`; the rig is solved once per frame; the boat substeps as usual. Realistic mode's hand gestures are unaffected (they act on frames).

### 10.3 UI and URL

- Wind tab, under the speed slider: `Wind changes: [Steady] [Gusty] [Shifty] [Building] [Dying]`. Under it, a slider for the size with its unit: `Gust strength 30 %`, `Shift size 15°`, `Change 10 kn over 10 min`. Then a `New pattern` button (new random seed 1…99,999).
- **Time bar** (`ui/timeBar.ts`, issue #25; replaces the Phase 1 Pause button at the top of the 3D view, `data-testid="time-bar"`). One compact row: `Time ×1  [<<] [<] [II] [>] [>>]`. `<` / `>` one step down / up the `timeScales` list, `<<` / `>>` straight to ¼ / ×16, `II` = Pause / Resume exactly as in Phase 1 (`pause.*` strings and behaviour kept). The status shows `×¼`, `×½`, `×1` … `×16`; tapping it returns to ×1. Buttons at least 44 px high; on a phone the row must fit the 3D view's width beside the instrument strip, or it goes under it.
  - **Fold:** tapping the word `Time` folds the bar to the Pause button alone and back. Remembered on the device (try/catch around storage), not in the link.
  - **Where it shows:** Pause shows always (both boat modes, both rope modes, as in Phase 1). The speed part shows while Sailing, or in Held still when the wind mode is not Steady; otherwise only Pause shows (nothing else changes with time there), and the time scale goes back to ×1.
  - **Setting:** View tab switch `Time bar` (on by default); off = only the Pause button, time scale ×1. URL `tb=0` when off.
- The compass dial shows the mean (draggable) and a thin second arrow for the wind now.
- Instrument strip: a `GUST` badge when TWS > `gustBadgeFraction` × mean; a `×4` / `×½` badge when the time scale is not 1 (so a folded bar still shows it).
- The water's ripple strength scales with the current TWS / 12 kn (clamped 0.3 … 2).
- URL: `wm` = `gusty` | `shifty` | `build` | `die` (absent = steady), `seed` (integer), `wg` (size), `tx` (`0.25`, `0.5`, `2`, `4`, `8` or `16`; absent = 1), `tb=0` (time bar off). The time in the mode is not stored: a link starts the pattern at its beginning.

### 10.4 Tests

1. Determinism: `windAt` at t = 0…600 s every 1 s is identical for the same seed, whether computed directly or by stepping the store at 30 or 60 fps.
2. Gusty, 30 %, mean 12 kn, 1 h of samples at 1 Hz: max TWS within 14.4–17.4 kn; time-average within ±5 % of 12; at least 30 gusts.
3. Shifty, 15°: direction always within mean ± 15°, and beyond ± 10° at least once within 10 min.
4. Building +10 kn: 12 kn at t = 0, 17 ± 0.2 at 300 s, 22 ± 0.1 at 600 s and after. Dying clamps at 0.
5. Time ×16: 60 s of frames at 60 fps advance `rig.timeS` by 960 ± 1 s; no substep longer than `maxStepS`. Time ×¼: 60 s of frames advance it by 15 ± 0.1 s. The time bar's steps: `>` from ×1 gives ×2, `<<` gives ×¼, `>` at ×16 stays ×16; tapping the status gives ×1.
6. Autopilot wind mode in a 20° shifty wind: after 5 min, |TWA − target| < 6° 90 % of the time.
7. URL round trip of `wm`, `seed`, `wg`, `tx`, `tb`.
8. Held still with Steady wind: the time bar shows only Pause and the time scale is 1.

### 10.5 Screenshots, done when

`m10-wind-tab-gusty`, `m10-gust` (strip with the GUST badge), `m10-time-bar` (the bar at ×4, and folded). Done when all M10 checks pass.


### 10.6 Decided in the M10 PR

Things the spec left open or did not foresee (each is "decided in the M10 PR"):

- **Branch:** `m10-wind-modes`, as the spec and the owner's prompt say. M9 is developed in parallel, so `store.ts`, `hanse508.json`, `en.json`, `parts.json`, `shots.mjs` and this file may conflict with the M9 PR in their obvious places (both add lines next to each other).
- **State:** `AppState.windMode` is `{ mode, seed, size, startS }` (10.2). `AppState.wind` is new: the true wind **now** (`windAt` at the rig clock after this step), so `state.wind` always equals `windAt(mean, state.windMode, state.rig.timeS)`. The dial shows the mean (`controls`); the speed slider shows the mean when the wind is steady and the wind now in a wind mode (issue #33; dragging it still sets the mean); the sails, the boat, the autopilot (Tack and Gybe included), the map, the strip's wind lines, the debug overlay and the "calm" notes read `state.wind` / `rig.wind`. Reset gives a steady wind at ×1. `settings.timeScale` is the time scale of the time bar (¼, ½, 1, 2, 4, 8 or 16; `windModes.timeScales`), `settings.timeBar` the View tab's switch (default on).
- **Steady wind is Phase 1 and M6–M9 exactly:** `step` gets `StepOptions.wind` only when a mode other than Steady is on (4.3 rounds the apparent wind whenever a wind is passed), so a steady link behaves bit for bit as before.
- **Held still:** wind modes work there too (the sails answer; the boat stays still).
- **Which time:** the pattern is evaluated at the **end** of the step (`rig.timeS + dtSim`), and a paused app (dt = 0) freezes the pattern. Changing the mode, the size or the seed restarts it (`startS = rig.timeS`); moving the dial or the speed slider does not.
- **Sizes:** the mode's default comes with the mode. The slider's range is the data's (gusty 10–60 %, shifty 5–40°); for Building and Dying it is 1 kn to `changeMaxKn` (20). Steps: gusty 5 %, others 1. The label "Change 10 kn over 10 min" takes its minutes from `rampS / 60`.
- **New pattern:** the button draws a seed from 1 to 99,999 in the UI (the reducer stays pure: `newWindPattern` carries the seed). For Building and Dying there is nothing random, so it simply starts the change again; it is hidden (with the slider) on Steady.
- **GUST badge:** shown only in **Gusty** mode, while the wind now is more than `gustBadgeFraction` × the mean (a building wind is not a gust). `×¼` … `×16` shows whenever the time scale is not 1 (also while the bar is folded). Both sit on a third row of the strip that exists only while one of them shows (on a phone the first row is full); the alerts, the map's controls and the debug box sit below the top area (see the time bar bullet).
- **Time bar** (issue #25, merged into the M10 spec from `claude/epic-clarke-38g7ia`; built as 10.3 says): `ui/timeBar.ts` replaces `ui/pauseButton.ts` (deleted). The bar is `Time ×1 [«] [‹] [Pause] [›] [»]`: the arrows are the glyphs « ‹ › » (the spec's `<<` `<` `>` `>>`), `‹` / `›` one step down / up `windModes.timeScales`, `«` / `»` to ¼ / ×16, a tap on the status goes to ×1; at an end the two buttons for that direction are disabled. Pause is the Phase 1 button inside the bar with the same `data-testid="pause-button"`, class and `pause.*` strings. Logic is pure and tested: `src/model/timeScale.ts` (`stepTimeScale`, `slowestTimeScale`, `fastestTimeScale`, `timeScaleText`, `timeSpeedAvailable`, `isTimeScale`).
  - **Rule in the store:** the speed part shows only when `timeSpeedAvailable(boat mode, wind mode, settings.timeBar)`: Sailing, or Held still with a wind mode other than Steady, and the View tab's switch on. Whenever that stops being true (Held still with Steady wind, the wind set to Steady while held, the switch turned off) the time scale goes back to ×1 and **stays** ×1 when it becomes available again; `setTimeScale` is refused while it is not available. `setTimeBar` is the new action; `tx` and `tb=0` in a link follow the same rule when it opens.
  - **Fold:** the word `Time` (with `aria-expanded`) folds the bar. Decided in the M10 PR: the spec says "to the Pause button alone and back", but something must stay to tap to open it again, so a folded bar shows the small word `Time` (in the accent colour) next to Pause. The fold is kept in `localStorage` under `sail-learn.timeBarFolded` (inside try/catch), not in the link. Where the bar has no speed part the word is not shown either: only Pause, as in Phase 1.
  - **Layout:** a new container `.view-top` holds the instrument strip and the bar (the strip is no longer absolutely positioned). It is a wrapping flex row: where the view is wide enough the bar sits at the right of the strip (as Pause did); otherwise it wraps under the strip, aligned right (phones in portrait). The strip's old `max-width: calc(100% - 94px)` is gone. `trackTopHeight` keeps `--view-top-h` on the view (the bottom edge of the top area), and everything that used to sit at a fixed 58–78 px under the top (the alerts in the stacked layout, the debug box, the map's wind box and its North up / Boat up switch) now sits at that edge plus its old gap, so none of them is covered when the bar is under the strip. The earlier `:has()` rule that moved the alerts for the strip's third row is replaced by this.
  - **Camera framing under the bar:** where the bar wraps under the strip (phones in portrait) it would cover the top of the 3D picture (in the Top view the bow, with the jib furler). `CameraRig.setViewport` and `SceneView.resize` therefore take a `topInset` as well as the bottom inset: the whole-boat presets are framed in the area between the bar and the camera buttons (`topClearance` in `ui/timeBar.ts`, measured from the bar; 0 where the bar sits beside the strip, so those views are framed as before). The picture is smaller on a phone while the bar is open; folding the bar or switching it off gives the whole view back. The framing follows when the bar folds or the badge row appears (`trackTopHeight`'s callback).
  - **Wind tab:** the `Time: [×1] [×4] [×16]` buttons are removed (the bar replaces them); the `wind.time.*` strings are removed. View tab: new switch `Time bar` (`view.timeBar.*`).
  - **Labels in 3D** keep clear of the bar (`.time-bar` replaces `.pause-button` in the labels' blocking list).
- **Merged with M9 (PR #30):** the stores combine (`sailDamage`, `repairSails` next to `windMode`, `wind`, `setTimeBar`); flogging damage is counted in **simulated** time (`floggingDamage(…, dt)` gets the scaled step), so a sail that flogs for 10 minutes tears after 10 simulated minutes, i.e. in 37 s at ×16 (and 40 minutes at ×¼); M9's `⚠ sail` badge moved from the first line of the strip into the third row with `GUST` and `×N` (the first line is full on a phone), and that row shows while any of the three shows. M9's shots script and mine are merged: both `SHOTS_ONLY_M9` and `SHOTS_ONLY_M10` exist.
- **Dial:** the thin arrow and the line "Wind now: 12 kn from 097° (thin arrow)" show only while a mode is on. The thick arrow is still the mean and is still what you drag.
- **Time speed-up and Realistic mode (accepted by the owner, 2026-10-12):** the step is multiplied for **everything the world does** (rig, boat, autopilot, and `stepRealistic`, so a running rope or the winch motor speeds up with the boat). Hand gestures are discrete actions (a drag, a tap): they are not scaled, and notices that count seconds for the screen (the autopilot's "you took the wheel") stay in real time. The boat substeps by `maxStepS`, so ×16 at 10 fps (a 1.6 s step, 32 substeps) is as stable as at 60 fps (checked: the autopilot in a 20° shifty wind holds within 4° at ×16 at both rates).
- **Ripples:** the high-detail water's normal-map strength scales with the wind now, `clamp(TWS / 12 kn, 0.3, 2)` (`SCENE.water.rippleReferenceKn`, `rippleScaleMin`, `rippleScaleMax`). It is not visible at Detail: Low.
- **URL:** `wm` (`gusty`, `shifty`, `build`, `die`; `steady` and anything unknown fall back to no mode), `seed` (1–99,999), `wg` (an integer inside the mode's range, else the mode's default), `tx` (`0.25`, `0.5`, `2`, `4`, `8` or `16`; a link with `tb=0`, or Held still with a steady wind, opens at ×1), `tb=0`. Written only when not the default (`seed` 1, the mode's default size, `×1`, bar on). The link does not store where in the pattern you are: it starts at the beginning, and the boat opens at the steady speed for the wind at that moment.
- **Seeds and the test band (10.4 item 2), decided by the owner on the M10 PR (2026-10-12):** with the formulas exactly as in 10.2 two gusts could overlap and pile up: 59 of the seeds 1–200 peaked above 17.4 kn in an hour (the highest 20.0 kn). Instead of a minimum gap between events (which would change every pattern), the **summed gust/lull term is capped** at what a single event can reach: a gust at most `+size · 1.3`, a lull at least `−lullFraction · size · 1.3`. The random draws are unchanged, so a pattern differs from the uncapped one only where events overlapped. Result at 30 %, mean 12 kn, one hour at 1 Hz, seeds 1–200: the peak is 16.5–17.3 kn (the band 14.4–17.4 holds for **every** seed), the average 12.14–12.31 kn (within 5 %), the lowest value 9.1 kn. The test covers all 200 seeds. "At least 30 gusts" stays on fixed seeds (1 and 7): 2 of the seeds 1–200 have fewer, which the owner accepts. The wind's direction is not capped: overlapping gusts can veer it up to 19° (seeds 1–200) where one gust veers at most `veerMaxDeg` (10°). **Open question:** cap the veer too?
- **Test 6 (autopilot in a 20° shifty wind):** the autopilot is set to Wind at the angle she is sailing when it is switched on (the wind at t = 0 is already shifted by up to 20°). After 5 minutes of settling, measured over the next 5 minutes, the error is under 6° for 100 % of the time (worst 4.1°) at 20°; at the slider's largest shift, 40°, the error reaches 12° and is under 6° only about two thirds of the time (the autopilot has no feed-forward for a moving target).
- **Helper exports for tests:** `gustyEvents(seed, t)` (the gusts and lulls begun by `t`), `substepCount(dt)` in `motion.ts` (what `stepBoat` uses), `sizeRange(mode)`, `initialWindMode()`.
- **PHYSICS_TRUTHS:** M10 adds and changes no rules (the spec's "rules tested" is "determinism"); the tests are in `tests/windModes.test.ts`.
- **Screenshots script:** `SHOTS_ONLY=m10` runs only the M10 scenes and live checks (the Wind tab with each mode, the dial's thin arrow, the badges, the time bar open, folded, slow, over the map and held still, a building and a dying wind, the link); scenes and checks with "m10" in the label open Sailing; the default output folder is now `docs/screenshots/m10` and the prefix `m10-`. The Reset check of M4a (`shots-m4a.mjs`) now ignores `rd` and `bs` (live since M6 and M8).

---

## 11. M11: Gybes (energy, load, danger zone)

Branch `m11-gybes`. No preventer (owner: the boat has none).

**Independent review: required** (new gybe physics: boom energy and peak sheet load; mistakes here teach the wrong danger).

### 11.1 Data (add to `physics`)

```json
"gybe": {
  "boomMassKg": 60, "sailMassKg": 40,
  "massNote": "assumption: Seldén B250 boom with fittings about 60 kg, in-mast furling main about 40 kg",
  "driveCoefficient": 0.6,
  "normalForceCoefficient": 1.2,
  "sheetStretchM": 0.4,
  "stretchNote": "assumption: how far the sheet system gives at the boom blocks when the swing is stopped (rope stretch, blocks, deck springs)",
  "controlledMaxBoomDeg": 20,
  "dangerFlashS": 1.5,
  "reportS": 8,
  "impactLoadDurationS": 0.3
}
```

### 11.2 Model (`gybe.ts`)

The **trigger** stays Phase 1's (PHASE1_SPEC 8.1: 15° by the lee, `solution.gybe`). What changes is how the boom crosses: no longer the fast spring (`gybeSwingTimeS`) but the wind's push.

```ts
export function boomInertia(data = boat): number
// m_b·Lb²/3 + m_s·E²/6 + ρa·π·(E/2)²·P·0.5·dCE², Lb = rig.boom.length, E = sails.main.footLength, P = headY − tackY, dCE = E/3  (≈ 2,440 kg·m²)
export interface GybeSwing { thetaDeg: number; omegaDegS: number; startDeg: number; stopDeg: number }
export function gybeStep(s: GybeSwing, awsKn: number, mainOut: number, heelDeg: number, h: number, data = boat): GybeSwing
// toward the new side (sign of stopDeg): M = sign·½ρa·aws²·A·driveCoefficient·dCE·cos²φ − cAir·ω|ω|, cAir = ½ρa·A·normalForceCoefficient·dCE³,
// A = main area out, dCE = E·mainOut/3 ; ω += M/I·h ; θ += ω·h (radians inside)
export interface GybeReport { accidental: boolean; endSpeedMps: number; energyJ: number; peakBlocksN: number; peakRopeN: number; atS: number }
export function gybeImpact(s: GybeSwing, timeS: number, data = boat): GybeReport
// E = ½·I·ω²; peakBlocksN = 2E / sheetStretchM; peakRopeN = peakBlocksN / (2·partsPerSide);
// endSpeed = |ω|·boom length; accidental = |startDeg| > controlledMaxBoomDeg
```

In `sim.ts`, while `rig.gybing`: the boom's θ is driven by `gybeStep` in the boat's substeps (the store passes the AWS). When |θ| reaches |stopDeg| (the solved θ on the new side), call `gybeImpact`, store it in `rig.lastGybe`, set the θ spring to `stopDeg` with velocity 0, and end `gybing`. In Held still the same happens with the true wind. A Phase 1 test that steps a gybe for less time than the swing now takes (about 1–4 s) may get more simulated time (e.g. 5 s); what it asserts must not change.

In Realistic mode, `peakRopeN` is added to the main sheet tails' pull for `impactLoadDurationS`, so a sheet held by hand on a winch with few turns slips.

### 11.3 UI and 3D

- **Danger zone** (`render3d/dangerZone.ts`, part id `env_boom_danger_zone`): a translucent red sector at the gooseneck's height, from the start angle to the stop angle, radius = boom length. It shows while the boom crosses and for `dangerFlashS` after. A faint outline of the same sector shows whenever the solution is by the lee (the risk).
- **Gybe report** (`ui/gybeReport.ts`), for `reportS` seconds after each gybe, in the alert stack:
  - accidental: "Accidental gybe! Boom end 17.7 m/s · energy 10.3 kJ · peak main sheet load 12.8 kN (about 1.3 tonnes). Anyone in the boom's way could be badly hurt. Safer: haul the main sheet in before turning (controlled gybe)."
  - controlled: "Controlled gybe: boom end 5.5 m/s · peak main sheet load 1.3 kN."
- The by-the-lee alert becomes stronger after 3 s by the lee: "By the lee: the boom can come across any moment."

### 11.4 Strings and registry

`gybe.accidental`, `gybe.controlled`, `alert.byTheLeeStrong` as above. Registry `env_boom_danger_zone` (draft; "The area the boom sweeps through when it swings across. Keep heads and bodies out of it on a run.").

### 11.5 Tests

Use `gybeStep` and `gybeImpact` directly (h = 0.001 s), main fully out, heel 0. Prototype values in brackets.
1. `boomInertia` 2,300–2,600 kg·m².
2. **PT-24**: AWS 15 kn, from +72° to −72°: crossing time 1.6–2.5 s [2.04], energy 8.5–12.5 kJ [10.3], `peakRopeN` 10–16 kN [12.8], `accidental` true. From +10° to −10° (main sheet hauled in): energy < 1.5 kJ [1.0], peak rope < 2 kN [1.3], `accidental` false.
3. Energy grows with the wind: 8, 15, 25 kn → [2.9, 10.3, 28.6] kJ (strictly increasing, each ±20 %).
4. **PT-26**: Sailing, TWS 12, TWA 175, main sheet 100, Shifty 25° (M10), autopilot heading: within 10 min at least one accidental gybe occurs (the wind swings more than 15° by the lee). At TWA 135 with the same wind, none.
5. PT-05 still passes (with more time if needed, see 11.2).

### 11.6 Screenshots, done when

`m11-gybe-danger` (mid-crossing: Top view during a gybe, set up by a link with `wd` such that the boat is 20° by the lee, plus a 0.5 s wait), `m11-report`. Done when all M11 checks pass.

### 11.7 Decided in the M11 PR

Things the spec left open or did not foresee (each is "decided in the M11 PR"):

- **The spec's torque alone is too weak (needs the owner's eye).** 11.2's formula gives about 4.5 kJ (2.3 s) at 15 kn for the swing from +72° to −72°, where 11.5 item 2 wants 8.5–12.5 kJ (1.6–2.5 s); no constant factor also keeps the hauled-in swing (±10°) under 1.5 kJ, because the prototype's push is clearly larger for a wide swing than for a small one. The spec leaves `cos²φ` undefined; it is read as `φ` = the heel (`gybeStep` has `heelDeg` and nothing else for it). A **shape factor** was added and tuned (not in the spec; the keys are in `physics.gybe`, marked as assumptions in `driveNote`): `driveGain × (driveFloor + (1 − driveFloor) × |sin startDeg|) × (driveStartFraction + (1 − driveStartFraction) × share of the swing done)` = `3.2 × (0.5 + 0.5 |sin start|) × (0.3 + 0.7 × done)`. A boom swung wide is hit broadside and the push builds as the sail comes round; one hauled in is hit at a glancing angle. Result, before → after: 15 kn, ±72°: 2.3 s, 4.5 kJ, 5.6 kN → **2.07 s, 9.7 kJ, 12.2 kN** (prototype 2.04 s, 10.3 kJ, 12.8 kN); boom end speed 17.7 m/s (the spec's example text says 17.7); hauled in ±10°: **1.0 kJ, 1.3 kN** (prototype 1.0, 1.3); 8 / 25 kn: 2.8 / 27.0 kJ (prototype 2.9 / 28.6, band ±20 %). No band was widened. Moment of inertia: 2,436 kg·m².
- **Where the swing is computed:** inside `sim.ts → step` (`stepGybe`), in substeps of `physics.gybe.substepS` (0.005 s) within the frame's `dt`, so a ×16 time speed-up and a paused app (dt = 0) both work. The wind is the rig's apparent wind (`rig.wind.awsKn`), the heel is `motion.heelDeg`, the sail out is the applied furl (`rope.mainFurl / 100`).
- **Start and stop:** a swing starts from the drawn boom angle (`theta.value`) when Phase 1's trigger fires (`solution.gybe`) and stops at the solved angle on the new side (`solution.thetaDeg`, followed if the trim changes during the swing). Direction = sign of `stopDeg − startDeg` (the spec's "sign of `stopDeg`" breaks for a boom nearly in the middle). A tack, or a main furled below 2 %, has no swing and uses the normal boom spring; a swing that has not arrived after 8 s, or with no wind, is stopped there (so a boom can never hang).
- **`gybeSwingTimeS`** (Phase 1's fast spring) is removed from the boat file: nothing uses it any more.
- **`GybeReport`** also carries `startDeg` and `stopDeg` (the danger zone needs them). `RigState` gets `gybeSwing`, `gybeElapsedS`, `lastGybe` and `byTheLeeS` (seconds by the lee; the warning gets stronger after 3 s).
- **Phase 1 tests** that stepped a gybe for less time than the swing now takes got more simulated time, asserting the same things: PT-05 (1 s → 5 s, twice) and the GYBE label test (an extra 3 s before `gybing` must be false).
- **Realistic mode:** `peakRopeN` is added to `rope_mainsheet`'s pull for `impactLoadDurationS` after the boom is stopped (`gybeImpactPullN`, in `realistic.ts`). The load shown on the Easy-mode sliders is not changed (a 0.3 s spike would flicker).
- **Danger zone:** `render3d/dangerZone.ts`, a fan at the gooseneck's height (5 cm below), never a tap target. While the boom is by the lee but has not crossed: a faint outline from the boom's angle to its mirror image (an estimate of the new side).
- **The report** shows for `reportS` after the impact; "peak main sheet load" is `peakRopeN` (one part of the rope, what the tail carries); "about N tonnes" is that load divided by g. Under a gybe's own label (the red GYBE flash of Phase 1, 2 s).
- **PT-26 test:** seeds 1, 2 and 3 (Shifty 25°, 10 minutes, 30 fps in the test): an accidental gybe at TWA 175 for each; none at 135 for each.
- **Screenshots:** `m11-gybe-danger` and `m11-report` are live checks (a gybe cannot be set up by a link alone: the boom opens on the right side for the wind), saved as `live-phone-gybe-danger.png`, `live-phone-gybe-report.png`; `SHOTS_ONLY=m11` runs them.
- **Owner's answers on the M11 PR (2026-10-13):** the shape factor stays (question 1); the Easy-mode sliders do not show the 0.3 s jerk (question 2). The independent review's items 1, 2 and 6 were fixed in the PR: (1) the Phase 1 test "PT-05 the gybe swing is faster than an ordinary boom move" now compares the **top boom speed** of the two moves (gybe at least 1.5 × the ordinary move; measured at 12 kn: 128 °/s against 62 °/s) instead of positions after different times; (2) the by-the-lee fan has a faint red fill (`SCENE.dangerZone.riskFillOpacity`, 14 %) under its outline, because phones draw lines 1 pixel wide; (6) the "still showing just after the gybe" check in `tests/gybe.test.ts` cannot be skipped any more.
- **Left for later (review items 4 and 5):** the peak load assumes the sheet always gives 0.4 m, so a controlled gybe's load is probably shown about 3× too low and an accidental one at 30 kn too high (48.5 kN in one rope part; a spring-like rope would give about 24 kN); the spec's rule is kept because its own test bands depend on it: revisit in M13. A gybe in almost no wind (about 2 kn) does not finish in `GYBE_MAX_S` (8 s), jumps the rest and reports "Accidental gybe" with 0.0 kJ; M13 should let the boom finish on the normal spring, show no report below a small energy, and move `GYBE_MAX_S` and `MIN_MAIN_OUT` from `sim.ts` into `hanse508.json`.

---

## 12. M12: Engine

Branch `m12-engine`.

**Independent review: required** (new physics: engine thrust against the hull resistance, PT-35 engine case).

### 12.1 Data (add to `physics`)

```json
"engine": {
  "idleRpm": 800, "maxRpm": 2500,
  "maxRpmSource": "photo: rpm limit sticker on the engine control (cockpitHardware.engineControl.rpmLimitSticker)",
  "maxThrustN": 6800, "thrustExponent": 2.5, "asternThrustFactor": 0.55,
  "thrustNote": "assumption: thrust = maxThrust·(rpm/maxRpm)^2.5 in gear. Gives about 3.3 kn at idle in gear, 8 kn at about 1,850 rpm (owner: comfortable cruise 8 kn) and 9.4 kn at 2,500 rpm (owner thinks about 10 kn: an 80 hp engine cannot push this hull much past 9.5 kn, see PT-36). About 5 kn full astern.",
  "neutralBandPct": 10, "rpmResponseS": 1.0, "gearShiftDelayS": 0.5
}
```

### 12.2 Model (`engine.ts`)

```ts
export interface EngineState { running: boolean; leverPct: number; rpm: number; gear: 'ahead' | 'neutral' | 'astern'; shiftS: number }
export function targetRpm(leverPct: number, data = boat): number
// |lever| ≤ band → idle; else idle + (|lever| − band)/(100 − band)·(max − idle)
export function stepEngine(e: EngineState, dt: number, data = boat): EngineState
// rpm lags to targetRpm (rpmResponseS) while running, to 0 when stopped. Gear follows the lever's side; going from ahead to astern (or back) passes through neutral for gearShiftDelayS.
export function engineThrustN(e: EngineState, data = boat): number
// 0 if not running or neutral; else ±maxThrust·(rpm/maxRpm)^exp·(astern ? asternThrustFactor : 1)
```

`AppState.engine` (default stopped, lever 0). The thrust goes into `stepBoat` (`engineThrustN`). The engine works in Held still too (but the boat does not move).

### 12.3 UI and URL

- **Easy mode** (Ropes tab, under the autopilot): an `Engine` row with a `Start` / `Stop` button and a horizontal lever slider −100…+100, marked `Astern | Neutral | Ahead` (the neutral band shaded), and `850 rpm` with a small tachometer arc 0–3,000 (red from 2,500). Keyboard: arrows move the lever by the step.
- **Realistic mode, Helm station:** the single lever drawn beside the wheel (as photo `engine-control.jpg`: a lever on the side of the pedestal, forward = ahead), dragged forward and back, with the Start/Stop button and the rpm. `data-part-id="engine_control"`.
- Instrument strip: `Engine 1,850 rpm` while running.
- URL: `eng=1` (running), `lv` (lever %, −100…100; absent 0).

### 12.4 Strings

`engine.label` "Engine", `engine.start` "Start", `engine.stop` "Stop", `engine.astern` "Astern", `engine.neutral` "Neutral", `engine.ahead` "Ahead", `engine.rpm` "{rpm} rpm", `instruments.engine` "Engine {rpm} rpm", `engine.hint` "Single lever: forward = ahead, back = astern; further = more rpm. Through the middle the gearbox shifts through neutral."

### 12.5 Tests

Calm water (TWS 0), heading held, steady speed after 120 s:
1. Idle ahead (lever 11) 3.0–3.7 kn [3.33]; rpm 1,850 (lever 65.6) 7.6–8.4 kn [7.97]; full ahead 9.0–9.8 kn [9.35]; full astern 4.5–5.7 kn astern [5.1].
2. Neutral and stopped: no thrust. Lever from +100 to −100 at once: thrust 0 for `gearShiftDelayS`, then astern.
3. Motor-sailing: TWS 12, TWA 60, best sails + rpm 1,850 is faster than either alone and ≤ 11 kn.
4. PT-35 still holds with the engine stopped; with the engine at idle ahead and no wind the rudder turns her.
5. URL round trip of `eng`, `lv`.

### 12.6 Screenshots, done when

`m12-engine-easy`, `m12-engine-helm`, `m12-motoring` (`?ws=0&eng=1&lv=65`). Done when all M12 checks pass.

### 12.7 Decided in the M12 PR

Things the spec left open or did not foresee (each is "decided in the M12 PR"):

- **Calibration (no tuning needed):** from rest in calm water with the wheel centred, the speed settles at 3.26 kn at idle (lever 11), 7.87 kn at about 1,860 rpm (lever 66), 9.28 kn at full ahead and 4.88 kn astern, all inside the bands of 12.5; the spec's prototype values (3.33, 7.97, 9.35, 5.1) are 1–2 % higher. Idle is slow to settle (about 50 s time constant): at 120 s it is still 3.01 kn, only 0.01 above its lower band, and 3.20 kn at 180 s. **Decided after the independent review (owner, 2026-10-13):** the tests measure the steady speed after **300 s** (idle 3.25 kn), as the spec's "steady speed" asks, so a later small change to the hull drag cannot trip an idle test that passed by 0.01 kn. No data value was changed and no band widened. `initialEngine` rounds the lever to whole percent, so the cruise tests use lever 66 (1,858 rpm), not 65.6 (the spec's 1,850 rpm).
- **A link opens settled, with the engine's push:** `steadyState` takes an optional `engineThrustN`, so `?eng=1&lv=66` opens at the 8 kn it gives instead of accelerating from 0 (as links without `bs` open at the sails' steady speed). Astern thrust is not part of it (the search is for speeds ahead): a link with the lever astern opens at rest and she backs away.
- **The autopilot does not steer while she goes astern** (`speed < 0`): the rudder turns her the other way then, so a heading hold would turn her away (in the first run she circled). It stays in its mode and the Autopilot block says "The autopilot does not steer while she goes astern (backwards): you steer."
- **Gearbox (changed after the independent review, owner, 2026-10-13):** whenever the gearbox leaves a gear (to the other side, or into the neutral band) it goes to neutral at once and stays there for `gearShiftDelayS` (0.5 s) before any gear goes in, however the lever moves afterwards: a finger dragging the lever through the middle waits just as a jump over it does (first version: only a jump waited; a drag engaged the other gear on the next frame). A gear goes in at once if the gearbox has already sat in neutral that long. The rpm keeps following the lever in neutral (the engine revs, then the gear goes in with the thrust of those rpm).
- **Held still:** the engine runs, the rpm shows, the boat stays put. Reset stops the engine and centres the lever.
- **Where the lever is drawn:** the Helm lever is in `ui/enginePanel.ts` (`createEngineLever`) with the Easy-mode block (`createEnginePanel`), not in `ui/stationDrawing.ts`: the Helm station has no drawing there and the file is already very long. The lever is a vertical track (ahead at the top, astern at the bottom, the neutral band shaded), dragged with a finger, also a keyboard slider (arrows move it by the step; the Easy slider uses the same step).
- **Strip:** `Engine 1,850 rpm` (rpm rounded to 10) sits in the strip's badge row, the third line, which shows only while a badge does.
- **Tests:** `tests/engine.test.ts` (model, calm-water bands at 300 s, shifting by a jump and frame by frame through the middle, motor-sailing, PT-35 engine cases, autopilot astern, store, link). Motor-sailing uses `steadyState` with heel and the sheet grid of 6.3: sails alone vs engine alone (sails furled) vs both.
- **Owner's answers on the M12 PR (2026-10-13), after the independent review:** the autopilot stays off while she goes astern (question 1); the engine's push does not fall with boat speed, full ahead stays about 9.3 kn (question 2); the Helm lever stays a simple vertical slot with a knob (question 3). Review items fixed in the PR: (1) the gearbox wait also applies to a lever dragged through the middle; (2) the labels under the Easy lever no longer overlap (the shaded band was taking up space in the row); (3) the calm-water tests measure the settled speed (300 s); (6) the cruise tests use lever 66 and the tachometer's spoken label takes the red-zone rpm from `physics.engine.maxRpm`.
- **Left for later (review items 4 and 5):** the engine starts in gear (Start works with the lever ahead and she drives off): on many boats a safety switch allows starting only in neutral, so a new question for the skipper was added to `BOAT_REFERENCE.md` section 6 (question 17); to revisit in M13 once it is answered. Motoring for a long time with the sails set wears them out by flogging (about 32 % after 30 minutes at full ahead in no wind, the M9 flogging rule): correct behaviour (you roll the sails away when motoring), noted in the PR's known limitations.

---

## 13. M13: Polish and Phase 2 sign-off

Branch `m13-phase2-signoff`.

**Independent review: not needed** (polish and sign-off; the owner's phone check covers it).

- Performance on the owner's phone: debug overlay FPS and Slowest at Detail Low and High, while sailing with gusts at ×16 (the heaviest case). Target as Phase 1 (≥ 50 fps, never below 30). If the step time is the problem, solve the rig every second frame at ×16 only.
- Accessibility audit (`scripts/a11y-audit.mjs`) covers the new controls: autopilot, Held still switch, wind modes, engine, map buttons, sails panel.
- Final screenshot set; README describes Phase 2; `BOAT_REFERENCE.md` lists every Phase 2 assumption; PHYSICS_TRUTHS statuses updated from the sources read.
- **Done when:** every item of section 14 is ticked in the PR.

### 13.1 Decided in the M13 PR

Things the spec left open or did not foresee (each is "decided in the M13 PR"):

- **Performance.** The model's cost per simulated frame in the heaviest case (gusty wind, ×16, sails working, 60 fps steps) is about 0.1 ms on a build machine (0.04 ms at ×1); `tests/stepCost.test.ts` guards it with a limit of 3 ms. The debug overlay's "step" (the store step plus every panel update) read 1.1–2.3 ms per frame in headless Chromium at ×16, where frames are slow and each step covers a long `dt`. So the "solve the rig every second frame at ×16" fallback was **not built**. The 3D drawing is the heavy part (headless software rendering: 6–15 ms of CPU work, 0–15 fps); the frame rate on the owner's phone is read from the overlay with the checklist link.
- **Accessibility audit.** `scripts/shots-m13.mjs` runs `auditPage` on the autopilot block, the Sails block, the Wind tab with the Held still / Sailing switch and the gusty and shifty modes (time bar at ×4), and the engine at Detail Low. Earlier milestones already audit the map (M7), the instrument dial (M7), the time bar (M10), the gybe report (M11) and the engine (M12). All clean, nothing had to change.
- **Gybe in almost no wind (left by M11, fixed).** A swing that has not finished after `physics.gybe.maxSwingS` (8 s), or with no wind, is handed to the normal boom spring from where it is: no jump and no report. A swing that does arrive is reported only if its energy is at least `physics.gybe.minReportJ` (50 J; a 4 kn gybe is about 690 J). `GYBE_MAX_S` and `MIN_MAIN_OUT` moved from `sim.ts` into the boat file (`maxSwingS`, `minMainOut`). Before → after at 2 kn: the boom jumped to the new side at 8 s and reported "Accidental gybe" with 29 J (0.0 kJ shown); now it keeps moving on the spring (about −38° at 8 s) and arrives with no report.
- **Left as it is, put to the owner (M11 review items 4 and 5):** the peak load assumes the sheet gives 0.4 m; the spec's PT-24 bands depend on it. **Engine starts in gear** (M12 review): skipper question 17 in `BOAT_REFERENCE.md` is still unanswered, so nothing was changed.
- **Owner's answers on the M13 PR (2026-10-13, "accept all"):** on the owner's phone the heaviest case (gusty wind, ×16, debug overlay) runs at **60 FPS with the slowest frame 17 ms**, which meets the target (≥ 50 fps, never below 30). Question 1: the 0.4 m sheet give stays (ask the skipper for a real figure, revisit in Phase 3). Question 2: the engine keeps starting in gear until the skipper answers question 17.
- **Sources.** PT-38 got a candidate source (North Sails); the page could not be opened, so it stays `to-verify` (`PHYSICS_TRUTHS.md`, M13 note). No other status changed. Every Phase 2 assumption has a row in `BOAT_REFERENCE.md` section 5 (the M13 weak-wind keys were added).

## 14. Definition of Done (Phase 2)

- [ ] The boat sails, turns, stops in irons and cannot steer without speed; the instruments show plausible true and apparent wind.
- [ ] The autopilot holds a heading or a true wind angle, tacks, and goes to Standby when the wheel is touched.
- [ ] The sails trim to the apparent wind; luffing, good and stalled trim are visible on the sails, the telltales and in the panel.
- [ ] Heel, weather helm and round-up happen by themselves from too much sail or wrong trim, and easing fixes them.
- [ ] Realistic mode's loads come from the sail forces: a gust can make a rope slip or a winch cut out.
- [ ] Wind modes work and are repeatable from a link; the time bar slows, pauses and speeds up time.
- [ ] An accidental gybe shows its energy and load and the danger zone; a controlled gybe is gentle.
- [ ] The engine moves the boat ahead and astern at plausible speeds.
- [ ] The map shows the boat, the track, both winds, the no-go zone and the points of sail.
- [ ] Held still behaves exactly as Phase 1.
- [ ] State round-trips through the URL; Phase 1 links still open with the same picture.
- [ ] Smooth on the owner's phone; all tests green in CI; no console errors.
- [ ] Docs updated: README, conventions, assumptions in `BOAT_REFERENCE.md`, sources in `PHYSICS_TRUTHS.md`.

## 15. Decisions and open questions

Decided with the owner (2026-10-10): wind fixed on the map; Held still / Sailing switch opening on Sailing; autopilot (heading or true wind angle) built with M6; map right after M6; no preventer (the boat has none); no published polar, so speeds come from the physics model above; engine cruise 8 kn, owner's estimate of the maximum about 10 kn (the model gives about 9.4 kn, PT-36).

Decided in planning: Phase 1's "Manual" wind and "Steady" are the same mode (the dial); links without `ap` open with the autopilot holding the link's heading; links without `bs` open at the steady speed.

Open (none blocks a milestone): the gennaker halyard's parking place (BOAT_REFERENCE question 13).
