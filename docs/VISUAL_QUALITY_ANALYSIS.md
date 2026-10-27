# Visual quality analysis (input for a later `/plan`)

**Context for planning Phase 9 (visual quality). Not a spec.** Written 2026-10-27, after Phase 8, from the owner's request; the owner's answers are in section 8. Nothing here is built yet. `/plan 9` reads this in full and writes `docs/PHASE9_SPEC.md`.

## 1. The owner's request (2026-10-27)

- Better quality at **rope ends** and where ropes **bend and turn**.
- **More realistic details**: the small parts that finish the boat (end fittings, joints, blocks (the pulleys ropes run through)).
- A **detailed helm** (the steering position) for the close Helm view: autopilot control, compass, a wind data display and the engine control next to the wheels.
- Frame rate is a steady 60 fps on the owner's phone (Phase 1, 3, 7 and 8 sign-offs), so there is room for better visuals.
- Find out **what is possible, how, and at what cost**. This is a study only; nothing is modelled now.

## 2. How the 3D boat is made today

- **All shapes are built by code** at start-up from the numbers in `content/boat/hanse508.json` (`src/render3d/boat/*.ts`). There are no model files or picture files. This is the M3b decision (2026-10-08, decisions log): "procedural only, no model or texture files", confirmed again for Phase 6.
- **Every boat uses the same code.** Since M57/M58 a person can import another boat as a profile (a copy of the boat file with other numbers). The shapes follow the numbers, so an imported boat is drawn correctly without any extra work. A profile must have the same keys as the Hanse 508 file (`checkBoatProfile`), which matters if new numbers are added (section 7).
- **Ropes** are worked out in `src/model/ropePaths.ts` as lines of points (pure maths, tested) and drawn in `src/render3d/boat/ropes.ts` as tubes with **6 sides**, refilled every frame. Corners are as sharp as the points: a rope going round a block (pulley) changes direction at one point, at the block's centre.
- **Hardware** is made of simple three.js shapes: boxes, cylinders, a torus (ring) for the wheel rim, and lathe shapes (a profile turned round an axis) for the winches (the drums ropes are wound on). Boxes have sharp edges.
- **Materials:** at Detail High, shiny "standard" materials with sky reflections and soft shadows; at Low (phones start there), a flatter, cheaper material without reflections or shadows. Textures (teak lines, non-slip deck) are drawn by code (`textures.ts`).
- **Measured now** (headless browser on the cloud machine, Held still, flat sea, 1,280 × 800):

  | View | Detail | Draw calls | Triangles |
  |---|---|---|---|
  | Port side | High | 197 | 91,068 |
  | Port side | Low | 105 | 48,782 |
  | Helm | High | 171 | 88,888 |
  | Helm | Low | 79 | 47,046 |

  The ropes are only **about 3,200 triangles** (9 ropes, 22 strands, 267 points). Draw calls (one per object and material the graphics chip draws) and triangles are both small for a phone: a mid-range phone usually draws 300,000 or more triangles and 200–300 draw calls at 60 fps. The debug overlay (`?debug=1`) and `window.__sailDebug.stats()` already report both.

## 3. What looks rough today (close-ups taken for this study)

- **Ropes**
  - Six flat sides show as facets up close.
  - **Sharp kinks** where a rope turns: at the mast-foot turning blocks, at the clutches (the rope stoppers), where the tails drop from the coaming into the rope tail box (a visible staircase of bends), at the boom blocks. A real rope bends round a sheave (the wheel inside a block) in a smooth arc.
  - The tube's sides are oriented from "up" at each point, so at a sharp bend the tube **pinches or twists**.
  - Ends are a rounded cap (M34). Up close a few ends poke out of the block they should sit in (seen at the mast foot).
  - The teaching stripes are flat bands; there is no braided surface.
- **Blocks** are a small cylinder and a stub. A real block has two cheeks (side plates), a sheave and a shackle (the U-shaped metal link that holds it).
- **Hard edges everywhere**: coamings (the raised cockpit sides), the rope tail boxes, the clutches, the cleats and the wheel pedestals are sharp-cornered boxes. Real fibreglass and cast parts have rounded edges, and the highlight on a rounded edge is most of what makes a model look "finished".
- **Helm**: each wheel stands on a plain black box. There is no compass, no display, no autopilot control and no engine control, although the boat file already notes them (`cockpitHardware.helmInstruments`, `engineControl`) and the owner's photos show some of them.
  - `engine-control.jpg`: an Allpa single lever (one lever for gear and throttle), a tachometer (rev counter) and START / STOP / POWER buttons, set into a white moulding.
  - `cockpit-winch-clutches.jpg`: at the starboard helm, a compass, a B&G autopilot remote by the winch, and a B&G display (blurred in the photo).
  - **Missing:** a photo of a wheel pedestal itself (what sits on top of it, where the compass and the display are mounted).

## 4. Three ways to get better visuals

### A. Better shapes built by code (keep the M3b rule) — recommended

Keep building everything from the boat file, with better tools. All are in three.js already (no new dependency):

- **Rounded boxes** (`RoundedBoxGeometry`, in three.js's add-ons) and **extruded outlines with a bevel** (`ExtrudeGeometry`) for coamings, boxes, clutches, cleats, pedestals.
- **Lathe and tube shapes** for round fittings: blocks, sheaves, stanchion bases (the feet of the lifeline posts), turnbuckles (the screws that tension the wires), shackles.
- **Smooth rope bends**: the pure model rounds each corner with an arc of the sheave's or fairlead's radius and smooths the sag with a curve; the renderer draws 10–12 sides at High (6 at Low) and keeps the tube's orientation steady along the rope ("parallel transport"), so it never pinches.
- **Pictures drawn by code** (`CanvasTexture`): the compass card, the B&G display, the autopilot keypad, the tachometer face. Because the picture is drawn by code, it can show **live values** from the app: the compass card turns with the heading, the display shows the real apparent wind (the wind felt on the moving boat), speed and depth, the autopilot shows its mode and course, the tachometer needle follows the engine. That is a teaching gain, not only decoration: the 3D helm shows what the instrument strip shows.
- **Surface detail drawn by code**: a braided-rope pattern and a non-slip deck pattern as small normal maps (pictures that fake bumps in the lighting), made at start-up like today's teak texture.

Good: works for every imported boat; nothing to download; taps, Learn entries and the spotlight keep working, because every mesh still gets its registry id; the agent can build and test it alone.
Limits: organic shapes (a moulded helm seat, a curved instrument pod) come out simpler than a hand-made model. Each new shape needs its numbers in the boat file.

### B. A small library of hand-made model files for standard parts

Winches, blocks, clutches, cleats, the wheel and the instrument pod made once in a 3D program (Blender), saved as glTF files (the web's standard 3D format), loaded with three.js's `GLTFLoader` and placed and scaled from the boat file.

Good: the best look for small, detailed parts.
Costs and risks:
- Reverses the M3b decision (the owner decides).
- **Someone has to make the models.** The owner cannot, and an agent cannot look at Blender while modelling: it could write Blender scripts, but the cloud environment has no Blender and the result could only be judged from screenshots. Free models from the internet need a licence check (CC0 is fine; CC-BY needs credits; most "free" Sketchfab models do not fit GPL-3.0) and never match each other's style.
- Every part must be split and named so each tappable piece keeps its registry id.
- Download size grows (typically 50–300 KB per part), and a part that fails to load needs a fallback.

### C. One complete model of the Hanse 508

Not recommended. There is no licensed hull model (the builder's drawings and brochure images are copyrighted, and the repo takes none), imported boats would no longer be drawn correctly, and ropes, tap targets and the hull's contact points are all worked out from the boat file's numbers, so a fixed model would disagree with them.

### Recommendation

**A for everything.** Keep B as a later, separate decision for one or two parts only if A's result on the phone disappoints. Do not do C.

## 5. Catalogue: what could be added, and its cost

Costs are estimates. "Triangles" and "draw calls" are added on top of the High numbers in section 2; work is in milestones of the size of Phase 6's.

| Item | What it looks like | Triangles | Draw calls | Work | Needs |
|---|---|---|---|---|---|
| **Smooth rope bends** | arcs round sheaves, fairleads, clutches and the box gap; smooth sag | +5,000 | 0 | ½ milestone | nothing new; tests in the pure model (the arc stays on the sheave, rope lengths unchanged) |
| **Rounder ropes** | 10–12 sides at High, steady orientation, no pinches | +6,000 | 0 | (same milestone) | — |
| **Better rope ends** | a whipped end (a short darker binding) or a tape end; ends tucked inside their block or the box | +500 | 0 | (same milestone) | whipped end (owner, 2026-10-27) |
| **Braided rope surface** | a small braid normal map moving with the rope | 0 | 0 | small | High only |
| **Real blocks** | two cheeks, a sheave the rope sits on, a shackle | +10,000 (about 20 blocks, drawn once as instances, i.e. copies) | +3 | ½ milestone | sizes per block type in the boat file (assumptions unless a photo shows them) |
| **Rounded hardware** | bevelled coamings, rope boxes, clutches (with their levers), cleats, pedestals | +8,000 | 0 | ½ milestone | — |
| **Small fittings** | stanchion bases, pulpit and pushpit joints (the rails at bow and stern), turnbuckles on the shrouds (side wires), chainplates (where they meet the deck), mast step, boom-end fittings, deck hatches with frames, portlights (hull windows) | +15,000–25,000 | +5–10 | 1 milestone | no photos: marked assumptions (section 6) |
| **Helm pedestal and panel** | moulded pedestal with a guard rail (the steel hoop to hold on to), wheel with a leather-look rim and proper hub, a control panel angled towards the middle (section 9) | +6,000 per helm | +4 | ½ milestone | no photo: assumptions |
| **Live panel** | compass card turning with the heading; wind dial with apparent wind angle and speed; engine lever at its position and a tachometer needle; thruster joysticks while held; autopilot keypad with Standby / Auto and the set course (question 2 in section 10). The B&G multifunction display is not simulated (owner) | +2,000 | +4–8 | 1 milestone | new registry ids and Learn entries (English and a Russian draft); their pictures redraw a few times a second only while the camera is close |
| **Corner shading** | slightly darker inside corners (painted into the shapes once, "baked") so parts sit on the deck instead of floating | 0 | 0 | small | — |

**Totals if everything is built:** about **+60,000–75,000 triangles** and **+20–30 draw calls** at High, so about 160,000 triangles and 230 draw calls. The Helm view's instruments only add when the camera is near (they are hidden beyond a few metres), and Low keeps the cheaper versions (6-sided ropes, no braid map, fewer fittings). Per-frame work grows only in the ropes (about 800 points instead of 267, still well under a millisecond).

**A budget the checks enforce** (proposed): High at most 250,000 triangles and 300 draw calls; Low at most 120,000 and 150, in every preset view. A browser check reads `__sailDebug.stats()` and fails over budget, and the owner confirms the frame rate on the phone at each sign-off, as in earlier phases.

## 6. Photos

The owner has **no further photos** (2026-10-27). Every new part is drawn from general knowledge and the two existing helm photos (`engine-control.jpg`, `cockpit-winch-clutches.jpg`) and marked as an assumption in `BOAT_REFERENCE.md`; registry status stays `draft`.

## 7. What the plan has to keep working

- **Imported boats:** new numbers (block sizes, pedestal, instruments) go into the boat file with the Hanse 508's values. Because a profile must match the reference's keys, a profile exported before the change would fail the check. The plan decides between filling missing new keys from the Hanse 508 on import (recommended, so old profiles keep working) or a profile version bump with a clear message.
- **Pure model:** the rounding of rope corners is maths and lives in `src/model` with tests; the renderer only draws. Physics, rope lengths and the clutch/winch logic do not change: the smoothing is for drawing only.
- **Taps and Learn:** every new mesh gets an id from `content/registry/parts.json` (status `draft` unless a photo confirms it) and a glossary entry in every language. Tiny parts stay tappable through the existing pick segments.
- **Spotlight, labels in 3D, camera presets, browser checks:** close-up scenes for each milestone (`scripts/shots-m<N>.mjs`); the existing scenes may change pixels but not layouts.
- **Low detail stays light:** phones start on Low.

## 8. The owner's answers (2026-10-27)

1. **Build everything by code, no model files** (approach A): accepted.
2. **Helm instruments show live data:** accepted.
3. **Rope ends:** a whipped end (a short dark binding near the tip): accepted.
4. **Low detail:** smooth rope bends, real blocks and the helm panel at both levels; rounder ropes, braid texture, small fittings and corner shading at High only: accepted.
5. **When:** the next phase, **Phase 9**; the exercises become Phase 10 and more languages Phase 11 (ROADMAP, decisions log 2026-10-27): accepted.
6. **Photos:** none. **The B&G multifunction display is not simulated** (it is a touch-screen navigation unit; navigation stays a later module). Instead the helm gets a **control panel** with:
   - the **engine control**: the single lever (gear and throttle) with the **tachometer** (rev counter) and START / STOP;
   - the **thruster joysticks** next to it (only the thrusters the boat has, as in M57);
   - a **compass**;
   - **wind data** (apparent wind angle and speed);
   - no map: the mini-map is already in the interface.

   The owner also asked whether the panel should be **one unit in the middle between the wheels**, with a new Helm camera (section 9).

## 9. The helm: one panel in the middle, or one at each wheel?

### The owner's idea

- One control unit **between the two wheels**.
- The Helm camera stands at **either wheel** and has **three directions**, picked with small switches over the 3D view:
  - **Ahead** (the default): as today's Helm view.
  - **Panel**: turned a little towards the middle and down, onto the control unit.
  - **Ropes**: turned a little outboard and down, onto that side's clutches (rope stoppers) and winch.
  - A third switch, **Other wheel**, moves to the other side.
- The **winch handle's resting place** at the Helm station is at the control unit.

### What the boat file says

- The wheels are 1.0 m across, their centres 0.88 m each side of the centreline: the gap between the two rims is **about 0.76 m**.
- That gap is the **way aft** to the stern platform (bathing platform). On a twin-wheel yacht it is kept clear on purpose: the crew walks through it to step ashore stern-to and to handle the stern lines, which the app teaches in Harbour mode.
- On the real boat the compass is at **each** wheel (brochure, `BOAT_REFERENCE.md`), and the B&G autopilot remote sits on the coaming (the raised side) by the starboard wheel (photo).
- The Realistic **Helm station** is already one station for both wheels, and the handle already rests on the cockpit floor **on the centreline between the wheels** (`modelDetail.winchHandle.rest.helm`).

### Recommendation: the same small panel on top of **each** wheel pedestal, angled towards the middle

- The owner's camera works unchanged: from either wheel, the **Panel** direction (a little towards the middle and down) lands on that wheel's own panel. **Ropes** and **Other wheel** are as proposed.
- The way aft stays clear, and the compass at each wheel matches the real boat.
- **Same content on both panels** (a teaching simplification, written in the spec): engine lever and tachometer, thruster joysticks, compass, wind data. On the real boat the engine control is probably at one wheel only; the photo does not show which (an assumption either way). Drawn once and copied, the second panel costs about 2,000 triangles and a few draw calls.
- **Winch handle:** it rests in a holder on the cockpit floor between the pedestals, where it lies today, so both Panel views show it.
- **Is the central unit worth it instead?** It would cost about the same and the camera idea works with it too, but it would block the way aft (a 0.35 m unit leaves about 0.2 m each side) and differ from the real boat. It is not worth that. If the owner still prefers it, the plan builds it in the same milestone.

### The Helm camera in more detail (for the spec)

- The camera chip's **Helm** opens the last-used wheel (port at first) looking Ahead. Three small buttons over the 3D view, only in the Helm camera: **Ropes**, **Panel**, **Other wheel**. Tapping the lit Ropes or Panel button again turns back to Ahead. The camera turns smoothly, as the spotlight's flight does (M49).
- The link remembers the wheel and the direction (two new keys, e.g. `hw=p|s`, `hd=a|p|r`; names fixed in the spec).
- Free orbit still works; dragging leaves the three directions, as dragging leaves a preset today.
- In Realistic mode, walking to the Helm station (M53) uses the same camera.

## 10. Remaining questions (the `/plan 9` session asks them, each with this recommendation)

1. **Panels at both wheels (section 9) instead of one in the middle?** Recommended: both wheels, because it keeps the way aft clear and matches the real boat; the camera works the same.
2. **Autopilot remote on the panel?** The first request named it, the last list did not. Recommended: yes, a small keypad showing Standby / Auto and the set course from the existing autopilot, because the app already steers by autopilot and the photo shows a remote at the helm.
3. **Do the panel's lever, joysticks and buttons work when tapped in 3D**, or only show what the panel below does? Recommended: show only in Phase 9 (taps open the part's Learn entry, as every part does), because working controls in a small 3D view are hard to hit on a phone; the Engine section and the quick row stay the controls.

## 11. Milestones (draft; `/plan 9` makes them final)

1. **Ropes:** smooth bends round sheaves and fairleads, rounder tubes without pinches, ends tucked into blocks and boxes, whipped ends, braid surface at High; a browser check that holds the triangle and draw-call budget.
2. **Blocks and rounded hardware:** real blocks (copies of one shape), bevelled coamings, boxes, clutches with levers, cleats.
3. **Helm pedestals and control panels:** pedestal with guard rail, better wheels, the panel at each wheel (engine lever, tachometer, thruster joysticks, compass, wind data, the autopilot keypad if question 2 is yes), the handle holder; new registry ids and Learn entries (English and a Russian draft).
4. **Live panel:** compass card turning with the heading, wind needle and numbers, tachometer needle, lever position, joysticks while held, autopilot mode and course; redrawn a few times a second only while the camera is near.
5. **Helm camera:** either wheel, Ahead / Panel / Ropes, Other wheel, smooth turns, link keys.
6. **Small fittings, finish and sign-off:** stanchion bases, rail joints, turnbuckles, chainplates, hatches, portlights, corner shading; frame rate confirmed on the phone.

Six milestones: one phase without parts. Independent review recommended for milestones 1 (it touches every rope), 4 (live data in 3D) and 5 (camera and link).
