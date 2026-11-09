# Physics engine analysis (input for a later `/plan`)

**Context for planning a physics phase. Not a spec.** Written 2026-11-09, after M93, from the owner's request and a draft plan the owner brought from another tool. Nothing here is built. A later `/plan` reads this in full, asks the questions in section 8 (unless the owner has answered them on the PR that added this file) and writes the spec. Line numbers are as of commit `e8434b3`; function names are the stable reference.

## 1. The owner's request (2026-11-09)

- **Add a physics engine** to the app. The owner brought a draft plan that recommends **Rapier 3D** (a rigid-body physics engine compiled to WebAssembly, `@dimforge/rapier3d`): one rigid body for the yacht, custom TypeScript forces for the sails, keel, rudder, buoyancy and hull resistance, flat water before waves, ropes and sail cloth kept non-physical, and a fixed physics timestep with smoothing for the picture.
- The draft was written **without reading the code** (it says so itself). It assumes the app is still the Phase 1 rig model, where the boat does not move, and plans to build boat motion from the start.
- Asked why (this session), the owner chose **all four** reasons:
  1. **Check whether an engine is worth it at all**, given what is already built.
  2. **More realistic motion**: heel, pitch, roll and heave from real forces.
  3. **Better collisions**: bumping the quay, other yachts, the bottom.
  4. **Future features**: man overboard (MOB), coming alongside with springs (the mooring lines that stop a boat moving forward or back), other boats moving, a dinghy.
- The owner asked for **this study only** (option "Analysis doc"), as a starting point for detailed planning.

## 2. The draft against the code

The app is far past Phase 1. Phases 2 (the boat moves), 3 (waves and the boat's motion on them) and 7 (marina, contact, lines, anchor, thrusters) built a custom model in `src/model`, all pure TypeScript and tested. Most of what the draft proposes as increments 1–4 already exists, under other names.

| Draft item | In the code today | Where |
|---|---|---|
| Keep the rig rules deterministic and above the physics | **Done.** The rig solver (boom, jib, furling, ropes) is solved for the apparent wind and feeds the forces | `sim.ts`, `boomSolver.ts`, `jib.ts` |
| Pure model, no three.js or DOM | **Done** (an architecture hook since Phase 1) | ROADMAP "Architecture hooks" |
| Coordinate, sign and unit conventions written down first | **Done.** Compass heading, wind "from", AWA/TWA + from starboard, heel + to starboard, boat frame x forward / z starboard, map east/north, newtons and metres | PHASE2_SPEC 3.1, PHASE7_SPEC 3 |
| Apparent wind | **Done** (also swings with the rocking of the waves) | `apparentWind.ts`, `waveMotion.ts` `rigMotion` |
| Sail force: one force point per sail, lift/drag curves, trim state | **Done.** Lift and drag tables by angle of attack, sail fill, heel (cos²), torn sails, the main blanketing the jib | `sailForces.ts`, `trim.ts` |
| Hull resistance | **Done**, and richer than the draft: friction line, wave-making "hull speed" wall, induced drag, heel and rudder drag, astern ×4 | `hullResistance.ts` |
| Heel from forces | **Done** as a second-order roll (a spring and damper) with the manual's righting moment (the force that pulls her upright) | `heel.ts`, `motion.ts` `stepBoat` |
| Keel side force, leeway (sideways drift) | **Partly.** Only at low speed (below about 2 kn); under sail there is no leeway | `lowSpeed.ts`, `motion.ts` |
| Rudder force, stall | **Partly.** Steering is a turning-rate formula (speed × rudder angle), weakened by heel; not a force on the rudder | `motion.ts`, `steering.ts` |
| Buoyancy points, heave, pitch, roll | **Partly.** Heave, pitch and wave roll follow the wave surface at 5 points with a 0.5 s lag; there are no buoyancy forces | `waveMotion.ts` |
| Waves (draft: last) | **Done** (three wave trains sized by wind and fetch) | `waves.ts` |
| Force at a point, summed into one push and turn | **Done** for the flat plane: `forceAt`, `addForces`, `ExternalForces` | `lowSpeed.ts` |
| Collisions | **Done** in 2D: 86 hull points against the marina, the moored yachts and the land, with fenders, a damage report and the bottom | `contact.ts`, `seabed.ts`, `harbourForces.ts` |
| Fixed physics step, accumulator, smoothing between steps | **Missing.** The step follows each screen frame (section 3.2) | `app.ts`, `store.ts` |
| All tuning values in one place | **Done**: `hanse508.json → physics`, each marked assumption or tunable | `content/boat/hanse508.json`, `BOAT_REFERENCE.md` |
| Tests named after rules (PT-xx) | **Done**: about 1,530 tests, five `physicsTruths*.test.ts` files | `tests/` |
| A `src/physics/` folder, a `RigState` interface, `YachtBody.ts` and so on | **Not applicable.** The code has its own names and layout (`docs/CODE_MAP.md`) | |
| Rapier, the WASM loading spike, mobile check | **Missing** | |

So the draft's architecture (rig rules on top, custom forces in the middle, an integrator at the bottom, three.js only drawing) **is already the app's architecture**. The integrator is hand-written instead of an engine. The real question is therefore not "how to add physics" but **"what would an engine add to physics that already exists, and is it worth the cost?"**

## 3. How the physics works today

### 3.1 What moves, and how (`src/model/motion.ts` `stepBoat`)

| Motion | How it is worked out |
|---|---|
| **Surge** (forward speed, `speedMps`) | Integrated: (sail drive + windage + engine + outside forces − hull resistance − added resistance in waves) ÷ mass (with 5 % added mass). A "sticks at zero" rule stops it jittering around zero. |
| **Sway** (sideways speed, `swayMps`) | Integrated, but only from the low-speed forces (hull windage, prop walk, prop wash) and the outside forces (thrusters, lines, chain, contact). **The sails' side force is not applied** (`motion.ts:311`), so under sail she does not drift sideways. |
| **Yaw** (turning, `yawRateDegS`) | At speed: a turning rate `speed × tan(rudder) ÷ 16 m`, reached with a 1.5 s lag (a "bicycle" formula, not a force). At low speed this fades out (`steerShare`) and integrated moments take over (thrusters, prop walk, wind on the hull, lines, contact). |
| **Heel** (`heelDeg`) | Integrated, second order: sail heeling moment − righting moment (from the manual's 98.3 kNm at 30°) − damping (damping ratio 1.2, so she settles without rocking). Clamped at 60°. |
| **Heave, pitch, wave roll** (`waves.*`) | Not from forces: the water height is sampled at 5 points (bow, stern, both sides, middle) and the hull follows with a 0.5 s lag (`waveMotion.ts`). Wave roll is kept apart from heel; the two are only added when drawn. |
| **Position** (`eastM`, `northM`) | Integrated from surge, sway and yaw. |

The boat is a **flat 3-axis body** (surge, sway, yaw) plus a separate heel axis, with the waves' up-and-down motion laid on top. A full rigid body would have six axes, all driven by forces.

`steadyState` (`motion.ts`) is a separate solver that finds the settled speed and heel for a link, Reset and the calibration tests.

### 3.2 Time

- `app.ts`: each screen frame measures the real time since the last one and dispatches `{ type: 'step', dt }`. The step and the picture are one to one; there is **no fixed timestep and no accumulator**.
- `store.ts` (`case 'step'`): `dt = min(0.1 s, frame) × timeScale` (time bar ×0.25 to ×16), and 0 while paused.
- `stepBoat` cuts `dt` into equal substeps of at most `physics.integration.maxStepS` = 0.05 s. **The substep size therefore depends on the frame rate**: at 60 fps one substep of 1/60 s, at 30 fps one of 1/30 s. The same actions give slightly different results on a slow and a fast phone.
- Integration is semi-implicit Euler (speeds first, then positions); forces are evaluated at the start of each substep. Gybe swings of the boom use their own 0.005 s substeps.
- The rig (sails, boom) is solved **once per frame, before** the boat moves, from the previous frame's motion. Inside the substeps the sail forces are recomputed for the new apparent wind and heel, but the boom and sail shape are those of the frame's start.

### 3.3 Harbour forces (Phase 7)

`harbourForces.ts` builds one function that `stepBoat` calls **every substep**. It adds up:

- **Contact** (`contact.ts`): 86 hull points (both deck edges, the bow tip, the transom) tested against flat polygons on the map (quay, pontoon, moored yachts, breakwater, land). A point inside is pushed out by a spring (400 kN/m) and a damper (40 kN·s/m) that resists only approach, plus friction. Where a fender hangs, a softer first stage (100 kN/m). Obstacle corners inside our hull are caught too.
- **Mooring lines** (`mooringLines.ts`): springs that pull only when stretched.
- **The anchor chain** (`anchor.ts`): a catenary (the hanging chain's curve) gives the pull at the bow roller; a snub spring when the chain is bar tight.
- **The ground** (`seabed.ts`): the keel bulb and the rudder's bottom pushed sideways along the slope when too deep.
- **Thrusters** (`thrusters.ts`).

Everything is in the **flat plane**: contact makes surge, sway and turn, never heel, pitch or lift. The springs' stiffness was chosen to stay stable at 0.05 s substeps for one point at a time (PHASE7_SPEC 3.5: "do not raise a stiffness or damping above the spec's value").

### 3.4 The picture

- The boat stays at the centre of the scene and the world moves past her. `scene.ts` (`render`): `holder.position.y = waves.heaveM`, rotation from `heelDeg + waves.rollDeg` and `waves.pitchDeg`; the heading turns the world group (`world.ts`).
- The picture reads the latest state; there is **no smoothing between physics steps** (there is nothing to smooth, since the step follows the frame).

### 3.5 What depends on today's behaviour

- **Tests.** About 1,530 tests. The physics tests check **bands** (ranges) made by prototype runs, not exact numbers (e.g. 12 kn wind at 45° gives 6.3–7.4 kn). The specs say: never widen a band to make a test pass.
- **The exercise pilots** (`src/app/exercisePilots.ts`, scripted learners). They finish all 14 exercises within time limits taken from the prototype (`tests/exercisePilots.test.ts`, `tests/harbourExercises.test.ts`). Since M81 the same pilots play **Watch** and **Show me** in the app, so a change in how the boat moves can break a feature the learner sees, not only a test.
- **Cost.** `tests/stepCost.test.ts` limits the model to 3 ms a frame (×16, gusty) and 6 ms in the busiest marina; today it takes about 0.1 ms. The owner's phone holds 60 fps.
- **Repeatability.** A link, Reset and the exercise waypoints (Back) restore a saved state; the wind is seeded; the browser checks run on a test clock where each slice is exactly one 0.1 s step.

## 4. What is simplified today, by the owner's reasons

### 4.1 More realistic motion

1. **No leeway under sail.** The sails push sideways (it is computed, and it heels her), but she does not drift sideways; the keel's grip is assumed perfect. PHASE2_SPEC 2 left leeway out on purpose; ROADMAP's M40 row records "with the sails up their side force does not slide her". A learner never sees her crab to leeward close-hauled, or slip sideways when she slows in a tack.
2. **Steering is a formula, not a rudder force.** The turning rate is set by speed and rudder angle; there is no rudder lift, no stall at a big angle (beyond the heel grip table), no keel lift resisting the turn.
3. **Heave, pitch and wave roll follow the water** with a lag; there is no buoyancy. Heel and wave roll are two separate numbers added at the end, so a gust and a wave do not interact in the roll.
4. **Contact cannot heel her or lift her**: a hard hit only stops and turns her.
5. **The result depends on the frame rate** (section 3.2): small, but real.
6. **The rig is a frame behind the boat**: invisible at 60 fps, a little coarser at ×16.

### 4.2 Better collisions

1. **2D only.** Freeboard (the hull's height above the water) and the deck edge's height are ignored; a low pontoon and a high quay wall are the same.
2. **Stability is per point.** Several hull points touching at once add their stiffness; the margin of PHASE7_SPEC 3.5 shrinks and nothing guards it.
3. **"The wall bounces her back too much"** (ROADMAP M43 row; left as the spec's number for a later plan).
4. **The ground** pushes her sideways from two points; she is never lifted or heeled by a rock or a shoal.
5. **No continuous collision detection** (a check that nothing passes through a thin obstacle between two steps). Low risk at today's speeds: 1 m per 0.05 s substep needs 20 m/s.

### 4.3 Future features

The roadmap's ideas (ROADMAP "Later" row) include man overboard (a person in the water), coming alongside with springs, a second built-in boat and moored yachts that move. These need **more than one moving body** (the person, a dinghy, another boat) and, for some, **joints** (a line between two moving bodies). Today's model has exactly one moving body; everything else is fixed on the map or a spring to a fixed point.

## 5. What an engine (Rapier) would and would not do here

**Would do:** integrate rigid bodies in six axes (position, rotation and their speeds) from the forces and moments we give it; solve contact between 3D shapes (hull against quay, keel against rocks, our boat against another moving boat) stably, with friction and continuous collision detection; joints between bodies; many bodies at once.

**Would not do:** wind, sails, apparent wind, keel and rudder lift, buoyancy, hull resistance, waves. These stay our own TypeScript under every option (the draft says the same). They are most of the physics in this app, and they are already written.

**Constraints it meets in this app:**

| Constraint | Why it matters |
|---|---|
| **Pure model, one store** | `src/model` is pure and `AppState` is a plain object: links, Reset and the exercise waypoints (Back) restore a saved state at any moment. Rapier keeps its own mutable world in WebAssembly memory. Every restore would have to rebuild or rewrite the Rapier body from the state, and the step would no longer be a pure function. |
| **Repeatability** | The tests, the test clock and the pilots need the same result from the same steps. Rapier offers a separate cross-platform deterministic build (`@dimforge/rapier3d-deterministic-compat`). Whether it gives identical results in Node (tests) and every phone browser must be measured. |
| **Tests run in Node** (Vitest) | WebAssembly must load there too; the `-compat` builds embed the WASM in the JavaScript for this. Every physics test would start with an async init. |
| **A second dependency** | CLAUDE.md: "Pin dependency versions. Prefer few dependencies." Today the only runtime dependency is three.js. Rapier is Apache-2.0, which can be used in this GPL-3.0 project. Version 0.21.0 (2026-09-25). The npm packages unpack to 5 MB (plain) and 15 MB (compat); what a phone downloads (gzip, first visit) is not known and must be measured. |
| **Hosting** | The site lives at `/sail-learn-and-train/`, `/next/` and `/pr-preview/pr-<N>/`: a separate `.wasm` file must come through Vite's asset handling, never an absolute path. There is no service worker or CSP (Content Security Policy) in the way; `src/main.ts` already loads the app asynchronously, so an `await init()` fits there. |
| **Phone cost** | Within 3 ms / 6 ms a frame (section 3.5) and 50+ fps, including the WASM start-up time on a first visit. |
| **Axes** | Rapier is y up; the app's boat frame is x forward, z starboard, with a compass heading. One adapter file would convert, and mirror tests would guard it. |
| **Re-calibration** | Swapping the integrator changes every trajectory a little: every prototype band, every pilot time limit, Watch and Show me would need re-prototyping and checking. Independent review is required for each such milestone (`/plan` skill, "When a review is required"). |

**For one boat body, Rapier mostly replaces the integration steps** of `stepBoat`'s substep loop (a few lines per axis) and the contact springs. The forces (the bulk of the work and of the teaching) stay. The engine pays for itself when there are **several bodies, joints or 3D shapes in contact**, which is section 4.3, not 4.1.

## 6. Options

| Option | What it is | Gains | Costs and risks |
|---|---|---|---|
| **A. Keep as is** | No change | Nothing to re-calibrate; stays at 0.1 ms a frame | None of the four reasons is met |
| **B. Upgrade our own model** (pure TypeScript) | A fixed timestep with smoothing; leeway under sail; rudder and keel as forces; heave, pitch and roll from buoyancy points on the existing wave surface (a 6-axis body in our own code); calmer contact (a stiffer but stable method, contact that can heel her) | Meets reasons 1–3; no dependency; the store, links, waypoints and test clock keep working as they are; each step can be built and checked on its own | Every milestone re-prototypes bands and pilot limits; a 6-axis buoyancy model needs care to stay stable; collisions stay 2D-plus-heel, not full 3D shapes |
| **C. Rapier for the one boat** | Rapier integrates the boat and solves contact; our forces are applied to it | Proper 3D contact and a ready base for more bodies | Breaks the pure step (section 5); a dependency and a WASM download; determinism and Node to be proven; all re-calibration of B and more; little gain while there is only one body |
| **D. B now, Rapier when several bodies are planned** | Option B in steps; a Rapier spike (a throwaway test) is the gate before the first feature that needs several moving bodies (MOB, a dinghy, moving boats) | Reasons 1–3 met without the costs of C; reason 4 decided with measurements, when a real feature needs it | Two decisions instead of one; if Rapier is adopted later, part of B's contact work is replaced |

## 7. Recommendation and draft milestones

**Recommended: option D.** Every reason except "several bodies" can be met without a dependency and without breaking the pure store, the links and the waypoints. The hard part (the forces) is our own code under every option. An engine earns its cost only when there are several moving bodies, so the decision is best taken with measurements when such a feature is planned.

Draft milestones for `/plan` (one line each; every one **independent review: required**, since each changes physics formulas or the step order):

1. **A fixed physics step.** The model steps in fixed slices (an accumulator in the store), the picture smooths between the last two states; the same actions give the same result on any phone. Needed under every option; it also makes later changes easier to test.
2. **Leeway under sail.** The sails' side force reaches sway, the keel resists it with lift that grows with speed; she crabs a few degrees close-hauled and slips sideways when slow. New rule, shown on the map.
3. **Rudder and keel as forces.** Steering from rudder lift (with stall at large angles) and the keel's resistance to turning, in place of the turning-rate formula; a stopped boat still cannot steer (PT-35).
4. **Heave, pitch and roll from buoyancy.** Buoyancy points on the existing wave surface give heave, pitch and roll as one body; heel and wave roll become one roll.
5. **Calmer, fuller contact.** A contact method stable with many points touching; the wall stops bouncing her back; a hit can heel her; the ground can lift a keel.
6. **The engine gate (a spike).** Before MOB, a dinghy or moving boats: measure Rapier's download size, start-up time, determinism in Node and on the phone, and the preview deploy; then decide.

1 comes first; 2–5 can be reordered by the owner. Each one keeps the Phase 1–10 rule tests passing or explains, in its PR, which band moved and why.

## 8. Questions for the owner

1. **Which option?** Recommended: **D** (upgrade our own model now, decide on Rapier when a feature needs several moving bodies), because the engine adds little while there is one boat and costs a dependency, a download and the pure store.
2. **May the exercises feel a little different?** More realistic motion changes how fast she turns and stops, so the exercise time limits and the Watch / Show me demos are re-timed. Recommended: **yes**, re-timed in each milestone from a prototype, because keeping them frozen would block every realism change.
3. **Show leeway to the learner?** When she drifts sideways, show the heading and the actual track on the map (two lines). Recommended: **yes**, because seeing the difference is the lesson; real chartplotters show it the same way.
4. **Fixed physics step first?** Recommended: **yes**, because it is needed under every option and makes every later milestone testable the same way on every phone.
5. **Which future feature should trigger the engine gate?** Recommended: **man overboard** (the first idea on the roadmap that needs a second moving body); coming alongside with springs can be done with today's line springs.

## 9. For the planning session to verify or measure

- Rapier: the gzip size of the chosen build in a production `vite build`, its start-up time on the owner's phone, whether `-deterministic-compat` gives identical results in Node and Chromium, and loading from a PR preview (only in milestone 6).
- How sensitive the bands and the pilots are: run the test suite with a prototype of each milestone before writing its bands.
- Sources for the new rules (section 10), from sailing-school or naval-architecture material, as `docs/PHYSICS_TRUTHS.md` asks.
- The Hanse 508 numbers each milestone needs (keel and rudder area and span, a lateral area, buoyancy points from the hull lines in `hanse508.json`); unknown ones become assumptions in `BOAT_REFERENCE.md`, never invented as facts.

## 10. Candidate rules (for `/plan` to add to `PHYSICS_TRUTHS.md`, status `to-verify`)

- **Leeway:** close-hauled she drifts a few degrees to leeward; more when slow, less when fast.
- **Fixed step:** the same actions give the same motion at 30 and 60 fps (within a small tolerance).
- **Buoyancy:** at rest she floats at her waterline; a small roll or pitch disturbance dies away without growing.
- **Rudder:** steering grows with water flow over the rudder; a very large rudder angle turns her less and slows her more (stall).
- **Mirror:** the same situation on port and starboard gives mirrored motion.
