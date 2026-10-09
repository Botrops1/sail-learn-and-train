# Exercises, failure modes and wind modes (plan)

**Context only. Do not build ahead.** This is the catalogue the later phases draw from. Each item names the phase that makes it possible (the physics and scenery) and the phase that turns it into a guided exercise (Phase 6). Ideas from the owner (2026-10-09) are marked *owner*.

Every exercise uses the same format (ROADMAP Phase 6): **what you see → what is happening → the right action → the typical mistake**. Each one ends with a **debrief**: a short timeline of what the user did, what the boat did, and, if something went wrong, which action caused it (see "Failure modes").

## 1. Harbour and anchorage exercises

| Id | Exercise | Needs | What is checked |
|---|---|---|---|
| EX-A | **Leaving and entering a marina** *(owner)*. Marina layouts: tight, medium, spacious. Traffic: busy, half busy, empty (number of other yachts). Stern-to with lazy lines (the sunk lines you pick up from the pier and take to the bow), or alongside. Engine, prop walk (the propeller pushing the stern sideways in reverse), bow and stern thrusters, crosswind. | Phase 5 (marina, other yachts, collision shapes, fenders, thrusters); engine from Phase 2 | No contact; if contact: **damage report** (what was hit, how hard, which part of our boat). Fenders count: a fender between the hulls at the contact point turns a "scrape" into "fender took it". Time, number of corrections. |
| EX-B | **Anchoring in a bay, stern line to the shore** *(owner)*. A bay with changing depth (seabed map, shallow rocks). Choose a spot, drop the anchor in the right place, let out enough chain, back towards the shore, take a line to a rock or ring, tighten, end up in the chosen sector and direction. Then a **time-lapse test**: the wind changes over hours (e.g. evening calm, a night land breeze, a morning gust) to see whether the setup holds. | Phase 5 (bay, depth, anchor and windlass, shore lines, anchor holding/dragging); Phase 2 wind modes | Chain let out vs. depth (see the scope rule below); swing and shore clearance; final position and heading. **Damage report** for touching the bottom or rocks, or the anchor dragging into another boat. |
| EX-C | **Setting and furling the sails** *(owner)*. Point the boat to the right wind angle (motor on, slow ahead, so she keeps steering), unfurl the main and the jib in the right order, turn onto course, stop the engine. Then the reverse: head up, furl, motor on. | Phase 2 (boat moves, engine); Realistic mode (M4b/M4c) | Wind angle while unfurling (main: close to head to wind so it doesn't load up), sheet and furling-line handling, no rope running out, nothing flogging for long. |
| EX-D | **Picking up a mooring buoy** *(owner)* and leaving it. | Phase 5 (buoy, boat hook, bow line) | Approach upwind/up-current, speed at the buoy near zero, buoy reached at the bow, no line in the propeller. |
| EX-E | **Standard skills** (beginner syllabus, RYA Competent Crew / Day Skipper practical topics) | Phases 2–5 | See section 2. |

**Anchor scope rule.** The owner's instructor rule is "at least 3 boat lengths of chain" (about 47 m for this boat). The common written rule is **chain at least 4 × the effective depth** (water depth plus the bow roller's height above the water), more in strong wind (4 × depth plus 2 boat lengths in lively conditions). The app shows both and checks the larger; in a typical 5–10 m Croatian bay the instructor's rule is the larger, in 15 m or more the depth rule is. Source: PHYSICS_TRUTHS PT-31.

## 2. Standard sailing exercises (EX-E, to be detailed in Phase 6)

- Trim through the points of sail: close-hauled → reach → run, sheets eased progressively (PT-22).
- Tacking (self-tacking jib: just the wheel) and the no-go zone (PT-21).
- Controlled gybe (main sheet hauled in first) vs. accidental gybe (PT-05, PT-24), preventer.
- Gust response: ease the main, luff up a little, then bear away again.
- Reducing sail as the wind rises: furl the jib partly, then the main (in-mast furling instead of reefing).
- Heaving-to / stopping the boat; getting out of irons.
- Man overboard: shout, point, mark, turn back, approach slowly from downwind.
- Motoring in a confined space: turning in the boat's length using prop walk and thrusters.
- Coming alongside a pontoon with springs; leaving with a spring.
- Sailing onto and off an anchor or buoy (later, advanced).

## 3. Failure modes: "how the boat gets out of control"

The physics phases must make these **happen by themselves** from wrong actions, not as scripted animations. Phase 6 adds the debrief that explains them. Rules in PHYSICS_TRUTHS where they exist; the rest are `to-verify` until sourced.

| Failure | What causes it | What the user sees | Phase |
|---|---|---|---|
| Round-up (the boat turns into the wind by itself, the wheel can't stop it) | Too much sail for the wind, main sheeted hard in a gust, too much heel | Heel grows, the wheel pulls, the rudder loses grip, the boat swings up into the wind, sails flog | 2 (heel, weather helm, rudder stall) |
| Excessive heel | Over-trimmed sails, not easing in gusts, too much sail out | Heel past about 30°, speed drops, water near the side deck | 2 |
| Accidental gybe | Running too deep, wind shift, steering error | Boom crosses violently, peak load on the main sheet, "GYBE" | 1 (side), 2 (energy, loads) |
| In irons (stuck head to wind) | Tacking too slowly, pointing too high | Boat stops, sails flog, no steering | 2 |
| Rope running out | Opening a loaded clutch without the winch (PT-18) | Sail flies out, rope tail whips | 1 (M4b) |
| Winch cut-out | Winching against a fighting rope or too much load (PT-19a) | Winch stops | 1 (M4b) |
| Sail damage | Long flogging in strong wind, furling under full load | Warning, then a torn-sail state | 2 |
| Lost fender | Fenders left out while sailing above a few knots | Fender bounces, then is gone (counted in the debrief) | 5 |
| Line in the propeller | Lazy line, shore line or sheet in the water while the engine is in gear | Engine stalls, steering by engine lost | 5 |
| Anchor dragging | Too little chain, bad holding ground, wind increase | Position drifts, anchor alarm | 5 |
| Grounding / hitting rocks | Too shallow, wrong position in the bay | Hard stop, damage report | 5 |
| Collision with a yacht or the pier | Too fast, crosswind, wrong use of prop walk or thrusters | Damage report (fenders taken into account) | 5 |

## 4. Wind modes

A setting in the Wind tab from Phase 2 on; exercises pick one. Phase 1's hand-set test wind stays as "Manual".

| Mode | Behaviour | Phase |
|---|---|---|
| Manual | The current dial and speed slider | 1 |
| Steady | Constant direction and speed | 2 |
| Gusty | Short gusts (stronger, often veering) and lulls around a mean; strength and frequency adjustable | 2 |
| Shifty | The direction swings back and forth around a mean | 2 |
| Building / dying | Speed rises or falls over minutes (time-lapse available) | 2 |
| Scripted | A sequence used by an exercise (e.g. the EX-B night) | 6 |
| Adriatic presets *(to-verify, needs sources)* | **Maestral**: afternoon sea breeze from the NW, builds around midday, dies in the evening. **Bura**: from the NE, cold, very gusty and sudden, strongest near the mountains. **Jugo**: from the SE, steady, builds big waves, often with rain and low cloud. | 6 |

## 5. Equipment these need (added to BOAT_REFERENCE when built)

- **Bow and stern thrusters** *(owner)*: one tunnel thruster at the bow and one at the stern (each tunnel has an opening on both sides, so four openings in total). Control and power unknown: a photo of the thruster control at the helm would help. Thrusters push the bow or stern sideways and work best at low speed (to-verify).
- **Fenders** *(owner; RU кранцы)*: soft fenders hung over both sides for harbour work; taken in before sailing, or they bounce and can be lost.
- **Anchor and windlass**: electric windlass at the bow with a remote at the helm, chain counter (BOAT_REFERENCE "Foredeck").
- **Shore lines and lazy lines**, boat hook, mooring buoys, rocks and rings in bays.
