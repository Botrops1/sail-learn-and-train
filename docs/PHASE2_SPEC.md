# Phase 2 specification: wind and feedback

Status: **ready for M6** (owner's review of the plan, 2026-10-10) · Last updated: 2026-10-10

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
9. Wind modes: Steady, Gusty, Shifty, Building, Dying; repeatable from a link; time speed-up.
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
| M6 | `angles.ts`, `mapFrame.ts`, `apparentWind.ts`, `sailForces.ts`, `hullResistance.ts`, `motion.ts`, `autopilot.ts` | `ui/instrumentStrip.ts`, `ui/autopilotPanel.ts`, `render3d/world.ts`, `render3d/wake.ts` |
| M7 | `track.ts`, `pointsOfSail.ts` | `ui/mapView.ts`, `ui/windInstrument.ts` |
| M8 | `heel.ts`, `sheetLoads.ts` | (changes only) |
| M9 | `trim.ts` | `render3d/boat/telltales.ts`, `ui/sailsPanel.ts` |
| M10 | `windModes.ts`, `random.ts` | `ui/windModePanel.ts` |
| M11 | `gybe.ts` | `render3d/dangerZone.ts`, `ui/gybeReport.ts` |
| M12 | `engine.ts` | `ui/enginePanel.ts`, Helm-station lever in `ui/stationDrawing.ts` |

Tests go in `tests/` (flat, as Phase 1): `tests/motion.test.ts`, `tests/autopilot.test.ts`, `tests/apparentWind.test.ts`, … Physics-truth tests are named after their id (`it('PT-20 …')`) and may live in `tests/physicsTruths2.test.ts`.

## 5. Milestones overview

Each milestone is one PR, small enough to check on a phone. Section numbers match milestone numbers.

| Milestone | Section | What the owner sees | Rules tested |
|---|---|---|---|
| M6 | 6 | The boat sails, apparent wind, instruments, autopilot, Held still switch | PT-20, 21, 22, 28, 35, 36 (resistance wall) |
| M7 | 7 | Bird's-eye map, wind instrument dial | (display) |
| M8 | 8 | Heel, weather helm, round-up, loads in kN | PT-25, 29, 32, 36 |
| M9 | 9 | Trim states, telltales, blanketed jib, torn sails | PT-23, 37, 38 |
| M10 | 10 | Gusty, shifty, building, dying wind; time speed-up | (determinism) |
| M11 | 11 | Gybe energy, peak load, danger zone | PT-24, 26 |
| M12 | 12 | Engine | PT-35 (engine case) |
| M13 | 13 | Polish and sign-off | all |

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
- **Screenshots script:** the older scenes and live checks open Held still (`held=1` is added to their links unless the label contains "m6"), because they are about the ropes and sails; `SHOTS_ONLY_M6=1` runs only the M6 scenes and checks.
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
- **Telltales** (`render3d/boat/telltales.ts`, part id `part_telltale`): for each sail, 3 heights × 2 faces. Each is a thin ribbon 0.35 m × 0.03 m, placed 0.6 m (main) or 0.8 m (jib) aft of the luff along the chord, 0.03 m off each face. Port face red, starboard face green (presentation choice). Animation per frame:
  - streaming: lies along the chord with a small wiggle (±5°, 3 Hz);
  - lifting: tilted 60° upwards and fluttering (±25°, 8 Hz);
  - stalled: hangs 70° down and fluttering slowly (±15°, 2 Hz).
- **Torn sail:** a dark zig-zag line across the sail at mid-height (a thin line mesh on the sail grid), and the panel row says "Torn".
- Instrument strip: a small `⚠ sail` badge when any damage ≥ `warnAt`.

### 9.4 Strings and registry

The state chips, hints and buttons above as `trim.*` keys. Registry: `part_telltale` (draft; "Short ribbons on the sail near its front edge. Both streaming aft: good trim. The windward one lifting: luffing. The leeward one hanging: stalled."; `term_telltale` exists, link it in `short`).

### 9.5 Tests

1. **PT-23**: TWS 12, TWA 60, steady state at main sheet 40 → main `good`; at main sheet 0 → `stalled`, the main's drive is lower and its side force higher than at 40.
2. Telltales: with the main `good` but twist 10°, the top windward telltale lifts first when easing (a sweep of the main sheet finds a setting where the top one lifts and the bottom one does not).
3. **PT-37**: TWA 175, TWS 12: jib `blanketed`, `blanketFactor ≤ 0.2`. TWA 120: factor 1.
4. **PT-38**: Held still, wind 25 kn from 0° (head to wind, both sails luffing): after `lifeS · (20/25)²` = 384 s ± 1 s of steps the main is torn. With wind 6 kn: no damage after 1 hour.
5. Calibration after blanketing: `bestSpeedKn(12, 175, heel)` 3.7–5.0 kn (estimate about 4.2 kn: only the main pulls on a run).

### 9.6 Screenshots, done when

`m9-telltales-good` (`?wd=60&ws=12&ms=40&js=50&cam=side-starboard`, close up), `m9-stalled` (`ms=0`), `m9-sails-panel`. Done when all M9 checks pass.

---

## 10. M10: Wind modes

Branch `m10-wind-modes`.

### 10.1 Data (top-level `windModes` in `hanse508.json`)

```json
"windModes": {
  "$comment": "PHASE2_SPEC 10. Teaching wind patterns; all values are assumptions (EXERCISES.md 4).",
  "maxTwsKn": 40,
  "timeScales": [1, 4, 16],
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
  - `noise = noisePct/100 · (0.6·sin(2πt/23 + p1) + 0.4·sin(2πt/37 + p2))`, with `p1 = 2π·rnd()` and `p2 = 2π·rnd()` drawn first from the same stream.
  - `dirDeg = meanDir + Σ_gusts e·veer` (gusts veer clockwise; lulls do not change direction).
- `shifty`: `rnd = mulberry32(seed)`; draw `p1, p2, p3 = 2π·rnd()` in that order. `dirDeg = meanDir + size·(0.6·sin(2πt/180 + p1) + 0.4·sin(2πt/67 + p2))`; `twsKn = meanKn·(1 + speedNoisePct/100·sin(2πt/29 + p3))`.
- `building`: `twsKn = meanKn + size·smoothstep(0, rampS, t)`. `dying`: `max(0, meanKn − size·smoothstep(0, rampS, t))`.
- `AppState.windMode` (default `steady`, `seed` 1, `size` = the mode's default). Changing the mode, the size or the seed sets `startS = rig.timeS`. The store passes `windAt(...)` to `step` (4.3, `StepOptions.wind`) and to `stepBoat`. The autopilot's wind mode uses the **current** wind direction (so it follows shifts).
- Time speed-up `AppState.settings.timeScale ∈ {1, 4, 16}`: `dtSim = min(MAX_STEP_S, dt) · timeScale`; the rig is solved once per frame; the boat substeps as usual. Realistic mode's hand gestures are unaffected (they act on frames).

### 10.3 UI and URL

- Wind tab, under the speed slider: `Wind changes: [Steady] [Gusty] [Shifty] [Building] [Dying]`. Under it, a slider for the size with its unit: `Gust strength 30 %`, `Shift size 15°`, `Change 10 kn over 10 min`. Then a `New pattern` button (new random seed 1…99,999) and `Time: [×1] [×4] [×16]`.
- The compass dial shows the mean (draggable) and a thin second arrow for the wind now.
- Instrument strip: a `GUST` badge when TWS > `gustBadgeFraction` × mean; `×4` / `×16` badge when sped up.
- The water's ripple strength scales with the current TWS / 12 kn (clamped 0.3 … 2).
- URL: `wm` = `gusty` | `shifty` | `build` | `die` (absent = steady), `seed` (integer), `wg` (size), `tx` (`4` or `16`; absent = 1). The time in the mode is not stored: a link starts the pattern at its beginning.

### 10.4 Tests

1. Determinism: `windAt` at t = 0…600 s every 1 s is identical for the same seed, whether computed directly or by stepping the store at 30 or 60 fps.
2. Gusty, 30 %, mean 12 kn, 1 h of samples at 1 Hz: max TWS within 14.4–17.4 kn; time-average within ±5 % of 12; at least 30 gusts.
3. Shifty, 15°: direction always within mean ± 15°, and beyond ± 10° at least once within 10 min.
4. Building +10 kn: 12 kn at t = 0, 17 ± 0.2 at 300 s, 22 ± 0.1 at 600 s and after. Dying clamps at 0.
5. Time ×16: 60 s of frames at 60 fps advance `rig.timeS` by 960 ± 1 s; no substep longer than `maxStepS`.
6. Autopilot wind mode in a 20° shifty wind: after 5 min, |TWA − target| < 6° 90 % of the time.
7. URL round trip of `wm`, `seed`, `wg`, `tx`.

### 10.5 Screenshots, done when

`m10-wind-tab-gusty`, `m10-gust` (strip with the GUST badge). Done when all M10 checks pass.

---

## 11. M11: Gybes (energy, load, danger zone)

Branch `m11-gybes`. No preventer (owner: the boat has none).

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

---

## 12. M12: Engine

Branch `m12-engine`.

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

---

## 13. M13: Polish and Phase 2 sign-off

Branch `m13-phase2-signoff`.

- Performance on the owner's phone: debug overlay FPS and Slowest at Detail Low and High, while sailing with gusts at ×16 (the heaviest case). Target as Phase 1 (≥ 50 fps, never below 30). If the step time is the problem, solve the rig every second frame at ×16 only.
- Accessibility audit (`scripts/a11y-audit.mjs`) covers the new controls: autopilot, Held still switch, wind modes, engine, map buttons, sails panel.
- Final screenshot set; README describes Phase 2; `BOAT_REFERENCE.md` lists every Phase 2 assumption; PHYSICS_TRUTHS statuses updated from the sources read.
- **Done when:** every item of section 14 is ticked in the PR.

## 14. Definition of Done (Phase 2)

- [ ] The boat sails, turns, stops in irons and cannot steer without speed; the instruments show plausible true and apparent wind.
- [ ] The autopilot holds a heading or a true wind angle, tacks, and goes to Standby when the wheel is touched.
- [ ] The sails trim to the apparent wind; luffing, good and stalled trim are visible on the sails, the telltales and in the panel.
- [ ] Heel, weather helm and round-up happen by themselves from too much sail or wrong trim, and easing fixes them.
- [ ] Realistic mode's loads come from the sail forces: a gust can make a rope slip or a winch cut out.
- [ ] Wind modes work and are repeatable from a link; time speed-up works.
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
