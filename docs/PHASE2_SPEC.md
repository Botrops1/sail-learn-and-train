# Phase 2 specification: wind and feedback

Status: **draft for the owner's review** (planning PR, before M6) · Last updated: 2026-10-10 (owner's answers on the plan: wind fixed on the map, a "Held still / Sailing" switch that opens on Sailing, an autopilot (heading or wind angle) built with M6, the map view right after M6)

Read [`ROADMAP.md`](ROADMAP.md) first, then this file. Phase 1 is done and its spec, [`PHASE1_SPEC.md`](PHASE1_SPEC.md), still describes everything Phase 2 builds on (layout, rig solver, ropes, Realistic mode, URL state). This file only says what Phase 2 adds or changes. Boat facts live in [`BOAT_REFERENCE.md`](BOAT_REFERENCE.md) and [`content/boat/hanse508.json`](../content/boat/hanse508.json); behaviour rules in [`PHYSICS_TRUTHS.md`](PHYSICS_TRUTHS.md).

This spec is filled in milestone by milestone, as Phase 1's was: each milestone PR writes its details into its section (marked "proposed in the M<N> PR" until the owner has reviewed them). The modelling notes below are the plan, not a promise of exact formulas; any formula that changes on the way is written back here.

## 1. Goal

The boat now **moves**, and what the user does with the ropes and the wheel **changes what the boat does**.

The single idea Phase 2 must teach:

> **The boat makes its own wind.** Once she moves, the sails feel the *apparent wind* (the true wind plus the headwind of her own speed), which comes from further ahead. Trim the sails to that wind: too far in and she heels and stalls, too far out and the sails luff and she slows.

Everything else serves that idea: heel and weather helm show what too much power feels like, the map shows where the wind really comes from, the wind modes make the user react, the gybe shows why the boom is dangerous.

## 2. Users and devices

Unchanged from PHASE1_SPEC 2: a beginner on a phone first (390×844 portrait), foldables, desktop. Same frame-rate target (≥ 50 fps, never below 30).

## 3. Scope

### In scope (Phase 2)

1. **Boat motion** on open water: speed, heading, position; the wheel turns the boat; no steering without speed through the water.
2. **Apparent wind** from the true wind and the boat's motion; the existing rig solver trims the sails to it.
3. **Held still / Sailing switch** (owner, 2026-10-10). *Held still* is Phase 1 exactly (the boat does not move, apparent wind = true wind). *Sailing* is the default, also for old links.
4. **Autopilot** (owner, 2026-10-10; the boat has a B&G autopilot at the helm): Standby, hold the compass **heading**, or hold the **wind angle**. It turns the wheel, so the user sees the rudder it needs.
5. **Instruments**: boat speed, heading, true and apparent wind angle and speed (TWA, TWS, AWA, AWS). A compact strip from M6; a wind instrument dial in M7.
6. **Bird's-eye map** (2D): the boat, its track, the true and apparent wind arrows, the no-go zone and the points of sail.
7. **Forces and heel**: sail forces in kN, heel from the manual's righting moment, heel reducing drive, weather helm, round-up. **Sheet loads from these forces replace Realistic mode's Phase 1 estimates.**
8. **Trim quality**: luffing / good / stalled per sail from sourced rules, telltales drawn on the sails, the main blanketing the jib downwind, a warning (then a torn sail) for long flogging.
9. **Wind modes**: Manual (Phase 1), Steady, Gusty, Shifty, Building, Dying; repeatable from a link; a time speed-up for the slow ones.
10. **Gybes**: boom energy and the peak load in an accidental gybe, the boom's danger zone, a controlled gybe, a **preventer**.
11. **Engine lever**: ahead / neutral / astern with rpm; motoring speed.

### Out of scope (do not build yet)

Waves and boat motion from waves (pitch, roll from waves, heave): Phase 3. Land, buoys, harbour, depth, other boats, collisions, anchor, thrusters, fenders, prop walk: Phase 5. Guided exercises, scripted wind, debriefs, Adriatic presets: Phase 6. Leeway (sideways drift) beyond what M8 needs for weather helm, currents and tides, sound, a Russian UI, gennaker/reacher. The learning layer beyond the one-line tooltip (Phase 4).

If something here looks necessary to finish a milestone, stop and ask in the PR instead of building it.

## 4. Conventions (new or changed in Phase 2)

Everything in PHASE1_SPEC 4 still holds (boat frame x forward / y up / z starboard, boom angle signs, 0 % = hauled, ids, text through `t()`).

| Topic | Convention |
|---|---|
| Map frame | Flat open water. Position in metres, **east** and **north** from where the boat started. Pure model, no three.js; the 3D scene stays centred on the boat (the water moves past it). |
| Heading `hdg` | Compass direction the bow points, degrees, 0 = north, 90 = east, clockwise, 0 … 360. |
| True wind `wd`, `ws` | `wd` = the compass direction the true wind comes **from** (owner, 2026-10-10: the wind is fixed on the map, the boat turns under it). `ws` = true wind speed (TWS), knots. **Old links keep their picture:** they have no heading, so `hdg` = 0 and the wind's direction on the map equals Phase 1's angle to the bow. |
| Wind angles | `TWA = wd − hdg`, wrapped to −180 … +180, **+ = wind from starboard**: exactly Phase 1's `windFrom`. AWA is the same for the apparent wind. The rig solver (PHASE1_SPEC 8) is fed **AWA and AWS** instead of the test wind. |
| Boat speed | Knots in the UI, m/s inside the model. Speed through the water; with no current it is also speed over ground. |
| Heel `φ` | Degrees, **+ = heeled to starboard** (starboard rail down). With the wind from starboard the boat heels to port (φ < 0). |
| Time | `step(state, dt)` remains the only clock. Paused: `dt = 0`. Time speed-up (M10) multiplies `dt`, in substeps of at most `physics.maxStepS`. |
| Tuning | Every physical constant (drag, lift curves, inertia, autopilot gains, rpm/thrust) lives in a new `physics` block of `hanse508.json`, sourced or marked as an assumption in `BOAT_REFERENCE.md`. No magic numbers. |

## 5. Layout changes

- **Instrument strip** (M6): a single line over the top of the 3D view: speed, heading, TWA/TWS, AWA/AWS, and in M8 heel. Large digits, readable at phone size. Tapping it opens the Wind tab.
- **Wind tab**: the dial now sets the true wind's compass direction and shows the boat's heading on it. The Held still / Sailing switch and the autopilot sit here (M6). Wind modes are added in M10, and the instrument dial in M7.
- **Wheel**: the wheel control stays in the Ropes tab (Easy mode and the Helm station). Moving it by hand puts the autopilot on Standby, as on the real boat.
- **Map** (M7): a camera choice `Map` beside Side, Top, Bow, Helm. It replaces the 3D view with the 2D map, and the panel stays as it is. Whether a small inset map should also show over the 3D view is decided in the M7 PR.

## 6. Model plan (pure TypeScript in `src/model`, no DOM, no three.js)

The aim stays **clarity over realism**: a few forces that are each easy to explain, tuned so the numbers look right for a 15 m cruising yacht. Not a velocity prediction program.

### 6.1 Boat state and motion (M6)

- State: position (E, N), heading, boat speed `V` along the heading, yaw rate. Heel and its rate are added in M8.
- **Surge**: `(m + m_added) · dV/dt = Drive − Resistance(V) (+ engine thrust in M12)`. `m` = the light displacement from the manual (14.7 t); the added mass is an assumption.
- **Resistance**: a friction part growing with V² plus a wave part that grows steeply near **hull speed** (1.34 · √LWL in feet ≈ 8.9 kn; PT-36). Tuned so the steady speeds land in the bands of 6.5 below.
- **Steering**: a simple turning model: yaw rate follows `V · tan(rudder) / turningLength` with a short lag. It is zero without speed through the water, so a stopped boat cannot steer (PT-35). In M8 the heel adds a turning push into the wind (weather helm).
- **Held still**: V, the yaw rate and heel are held at 0 and the heading is fixed. Apparent wind = true wind, so everything behaves as in Phase 1.

### 6.2 Apparent wind (M6)

The apparent wind is the vector of the true wind minus the boat's velocity, both in the boat's frame (PT-20). The apparent wind speed (AWS) and angle (AWA) replace the test wind as input to the boom and jib solvers. The wind streaks and the masthead indicator show the apparent wind, and the map (M7) shows both winds.

### 6.3 Sail forces and drive (M6, extended in M8)

- Each sail gives lift and drag from its angle to the apparent wind (the AoA the solver already computes) and its fill: `F = ½ ρ · A_out · AWS² · C(AoA)`, where `A_out` is the area out (furling). `C_L` and `C_D` are simple curves in the boat file: they rise to a peak, then fall off when the sail stalls (M9 names the regions).
- **Drive** is the part of the sail force along the heading; the **side force** is the part across it. Close to the wind the drive goes to zero and then negative, so the **no-go zone emerges by itself**: point too high, the sails luff, the boat slows and stops "in irons" (PT-21). No angle is hard-coded.
- In M6 the keel takes all the side force (no leeway); M8 turns it into heel.

### 6.4 Heel, weather helm and loads (M8)

- **Heeling moment** = side force × the height of the sails' centre of effort above the keel's centre of lateral resistance. **Righting moment** from the manual (98.3 kNm at 30°), a simple curve through it (assumption). The heel follows the balance of the two with a roll lag (assumption).
- Heel **reduces drive** (the sails see less wind and the hull drags more; PT-29) and adds a **turning push into the wind** (weather helm). The rudder needed to hold course shows on the wheel and the autopilot. Beyond the rudder's grip the boat **rounds up** (PT-32). Easing the main or furling reduces both (PT-25).
- **Loads**: the main sheet load from the main's force about the gooseneck, and the jib sheet from the jib's force at the clew. They replace `realisticMode.loads` (the Phase 1 sheet rule), so a gust can make a rope slip on the winch or the electric winch cut out (PT-16, PT-18 and PT-19a keep their tests, with new values). Forces are shown in kN in the Ropes tab.

### 6.5 Steady speeds to tune against (assumptions)

There is no published polar (speed table) for the Hanse 508. Keelindex gives only estimates (hull speed 8.9 kn). Until better data turns up (an ORC certificate of a sister ship, BOAT_REFERENCE question 15), the model is tuned so that, in 12 kn of true wind with good trim, the boat sails at roughly: close-hauled (TWA ≈ 45°) 6–7 kn, beam reach 7–8 kn, broad reach 6.5–7.5 kn, run 5–6 kn, and never above about 9 kn in any wind. A unit test checks these bands; they are assumptions, safe to change.

### 6.6 Autopilot (M6)

Modes: **Standby**, **Heading** (holds the compass heading it had when switched on), **Wind** (holds the true wind angle it had when switched on). Buttons −10°, −1°, +1°, +10° change the target, as on the boat's B&G control. It steers by moving the rudder control, with a limited rudder speed (assumption), so the wheel turns on screen. Moving the wheel by hand puts it on Standby. In Wind mode it follows a wind shift, which is the point of that mode (M10 shows it).

*Open:* the real B&G can hold the apparent or the true wind angle. Phase 2 holds the true angle because it is steadier and easier to explain. Owner: tell us if the boat's pilot shows otherwise.

### 6.7 Trim quality and telltales (M9)

Per sail: **luffing** (the AoA below the luffing threshold, as in Phase 1), **good**, **stalled** (the AoA past the peak of `C_L`). Telltales near the front edge of each sail: both stream when the trim is good; the windward one lifts when luffing; the leeward one flutters or hangs when stalled (PT-23). Downwind (AWA beyond about 150°) the main **blankets** the jib, which then collapses (PT-37). Flogging (luffing in strong wind) adds up over time: a warning, then a torn sail that gives less force, until Reset (PT-38).

### 6.8 Wind modes (M10)

Manual (Phase 1's dial, constant) and Steady are the same model with the dial as the mean. **Gusty**: short gusts (stronger, often veering) and lulls around the mean, strength and how often adjustable. **Shifty**: the direction swings around the mean. **Building / Dying**: the speed rises or falls over minutes. All modes come from a seeded random sequence, so a link (`wm`, `seed`) reproduces the same gusts. A time speed-up (×1, ×4, ×16) for the slow modes.

### 6.9 Gybes and the preventer (M11)

While the boom crosses in an accidental gybe it is moved by the wind on the sail (not just by a fast spring). The model gives its swing speed, its energy (½ I ω²) and the peak main-sheet load when the sheet snaps tight on the new side (PT-24). A **danger zone**, the area the boom sweeps across the cockpit, flashes during a crossing. A **controlled gybe** (main hauled in first, then turn, then ease) gives a small energy. A **preventer** holds the boom on its side. How it is rigged on the charter boat is an open question (BOAT_REFERENCE question 14). The planned version is a line from the boom end forward to the bow and back to a cockpit winch: a new rope, new registry id `rope_preventer` (draft). By-the-lee warnings get stronger (PT-26).

### 6.10 Engine (M12)

A single lever (the boat has an Allpa single-lever control, `engine_control`): Ahead / Neutral / Astern, rpm from idle to the 2,500 rpm on the sticker. Thrust grows with rpm (assumption), less astern. It is tuned so full ahead in calm water gives a plausible cruising speed (assumption until the owner reports the boat's speed at cruising rpm). No prop walk (Phase 5).

## 7. State, URL and architecture

- Module boundaries as in PHASE1_SPEC 9.1. New pure modules (names indicative): `src/model/motion.ts` (surge, steering, position), `apparentWind.ts`, `sailForces.ts`, `heel.ts` (M8), `autopilot.ts`, `windModes.ts` (M10), `engine.ts` (M12). `step(state, dt)` already takes the boat's motion (`BoatMotion`, zero in Phase 1); Phase 2 fills it.
- **New URL parameters** (written only when they differ from the default, like Phase 1's):

| Parameter | Meaning | Milestone |
|---|---|---|
| `hdg` | Heading, compass degrees (default 0) | M6 |
| `bs` | Boat speed in knots when the link was made. Without it the boat starts at the steady speed of its trim, so a test link shows the boat already sailing | M6 |
| `held=1` | Held still (default: Sailing) | M6 |
| `ap` | Autopilot `hdg` or `wind`, with its target in `apt` (degrees) | M6 |
| `wm`, `seed`, `wg` | Wind mode, its random seed, gust strength or shift size | M10 |
| `tx` | Time speed-up (1, 4, 16) | M10 |
| `pv` | Preventer rigged (`1`) | M11 |
| `eng`, `rpm` | Engine lever `a`/`n`/`r` and rpm | M12 |

  The position, the track, the heel and the gust timing are not stored: a link starts the boat at the map's centre, with the heel of its trim.
- `cam=map` (M7) for the bird's-eye map.
- Debug overlay adds: V, yaw rate, heel, drive / side force / resistance in kN, AWA/AWS, the autopilot's target and error.

## 8. Testing

As PHASE1_SPEC 11, plus:

- Every Phase 2 rule in PHYSICS_TRUTHS gets at least one test named after its id (`PT-20 …`).
- **Held still = Phase 1**: with `held=1` every Phase 1 test still passes unchanged (run the Phase 1 rule tests in both modes where they apply).
- **Mirror symmetry**: the same trim on port and starboard tack gives the same speed and a mirrored heel and rudder.
- **Steady-speed bands** of 6.5.
- **No NaN, no runaway**: sweeps of wind angle × wind speed (0–40 kn) × trim run for several simulated minutes. The speed stays finite and below a hard cap, and the heading stays in 0–360.
- **Frame-rate independence**: the same scenario stepped at 30, 60 and 120 fps ends within a small tolerance.
- **Screenshots** (`npm run shots`): sailing scenes at the three viewport sizes, plus the map from M7.

## 9. Milestones

Each milestone is **one PR**, branch `m<N>-<short-name>`. Numbering continues from Phase 1 so branch names never clash. End each PR description with the milestone's checklist from [`WORKFLOW.md`](WORKFLOW.md), every check a full link to the PR preview.

### M6: The boat sails (with the autopilot)

- Boat motion (6.1), apparent wind (6.2), sail drive (6.3); the Held still / Sailing switch; the instrument strip; the Wind tab dial with the heading; the autopilot (6.6).
- 3D: the boat stays centred and the water, ripples and wind streaks move past it; a simple wake behind the transom grows with speed.
- New `physics` block in `hanse508.json`; values in `BOAT_REFERENCE.md` (sourced or marked as assumptions).
- URL: `hdg`, `bs`, `held`, `ap`, `apt`.
- Tests: PT-20, PT-21, PT-22, PT-28, PT-35, PT-36; held still = Phase 1; steady-speed bands; symmetry; frame-rate independence.
- **Done when:** all M6 checks in `WORKFLOW.md` pass on the phone.

### M7: Bird's-eye map and wind instrument

- `cam=map`: the boat to scale on a grid, its track (last few minutes), the true wind (arrow and the wind's compass direction) and the apparent wind (arrow at the masthead), the no-go zone as a shaded wedge either side of the true wind, the points of sail labelled around the boat (close-hauled, beam reach, broad reach, run), north up with a toggle for boat up.
- A wind instrument dial in the Wind tab: AWA and TWA needles on a boat-up dial, AWS and TWS as numbers. It is styled like a generic instrument; no maker's branding.
- Tapping the map selects as the 3D view does (the boat, the wind).
- **Done when:** all M7 checks pass.

### M8: Heel, forces and weather helm

- 6.4: heel in 3D (the whole boat leans), heel in the instrument strip, drive reduced by heel, weather helm, round-up, forces in kN, Realistic-mode loads from the forces.
- Tests: PT-25, PT-29, PT-32; PT-16/18/19a still pass with the new loads.
- **Done when:** all M8 checks pass.

### M9: Trim quality and telltales

- 6.7: luffing / good / stalled per sail in the panel and on the sails; telltales in 3D; the main blanketing the jib; flogging warning and torn sail.
- Tests: PT-23, PT-37, PT-38.
- **Done when:** all M9 checks pass.

### M10: Wind modes

- 6.8: the mode selector in the Wind tab, seeded gusts and shifts, building/dying, time speed-up. A gust visibly heels the boat and loads the ropes (M8), and in Wind mode the autopilot follows a shift.
- **Done when:** all M10 checks pass.

### M11: Gybes and the preventer

- 6.9: boom dynamics in a gybe, energy and peak load, danger zone, controlled gybe, preventer (rope, control, Realistic-mode handling as for the other sheets).
- Tests: PT-24, PT-26.
- **Done when:** all M11 checks pass.

### M12: Engine

- 6.10: engine lever and rpm in the Ropes tab's Helm station and in Easy mode, the tachometer in the instrument strip while running, motoring and motor-sailing.
- **Done when:** all M12 checks pass.

### M13: Polish and Phase 2 sign-off

- Performance on the owner's phone, accessibility audit for the new controls, final screenshots, README.
- **Done when:** every item of the Definition of Done below is ticked in the PR.

## 10. Definition of Done (Phase 2)

- [ ] The boat sails, turns, stops in irons and cannot steer without speed; the instruments show plausible true and apparent wind.
- [ ] The sails trim to the apparent wind; luffing, good and stalled trim are visible on the sails, the telltales and in the panel.
- [ ] Heel, weather helm and round-up happen by themselves from too much sail or wrong trim, and easing fixes them.
- [ ] Realistic mode's loads come from the sail forces: a gust can make a rope slip or a winch cut out.
- [ ] Wind modes work and are repeatable from a link.
- [ ] An accidental gybe shows its energy and load; a preventer and a controlled gybe prevent it.
- [ ] The engine moves the boat ahead and astern.
- [ ] The map shows the boat, the track, both winds and the no-go zone.
- [ ] Held still behaves exactly as Phase 1.
- [ ] State round-trips through the URL; old Phase 1 links still open.
- [ ] Smooth on the owner's phone; all tests green in CI; no console errors.
- [ ] Docs updated: README, conventions, new assumptions in `BOAT_REFERENCE.md`, sources in `PHYSICS_TRUTHS.md`.

## 11. Open questions (none blocks M6)

1. Is there an ORC certificate or a speed table (polar) for any Hanse 508? It would replace the assumed speeds of 6.5. (BOAT_REFERENCE question 15)
2. Does the charter boat carry a preventer, and how is it rigged? (BOAT_REFERENCE question 14; needed for M11)
3. Roughly what speed does the boat motor at, at what rpm? (BOAT_REFERENCE question 16; for M12)
4. On the boat's B&G autopilot, does "wind" mode hold the apparent or the true wind angle? (6.6)
