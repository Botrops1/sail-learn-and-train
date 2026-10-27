# Visual quality analysis (input for a later `/plan`)

**Context for planning a visual-quality phase. Not a spec.** Written 2026-10-27, after Phase 8, from the owner's request. Nothing here is built yet. A `/plan` session reads this in full, plus the owner's answers to section 8 and any new photos, and writes the phase spec.

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
| **Better rope ends** | a whipped end (a short darker binding) or a tape end; ends tucked inside their block or the box | +500 | 0 | (same milestone) | owner's choice of look |
| **Braided rope surface** | a small braid normal map moving with the rope | 0 | 0 | small | High only |
| **Real blocks** | two cheeks, a sheave the rope sits on, a shackle | +10,000 (about 20 blocks, drawn once as instances, i.e. copies) | +3 | ½ milestone | sizes per block type in the boat file (assumptions unless a photo shows them) |
| **Rounded hardware** | bevelled coamings, rope boxes, clutches (with their levers), cleats, pedestals | +8,000 | 0 | ½ milestone | — |
| **Small fittings** | stanchion bases, pulpit and pushpit joints (the rails at bow and stern), turnbuckles on the shrouds (side wires), chainplates (where they meet the deck), mast step, boom-end fittings, deck hatches with frames, portlights (hull windows) | +15,000–25,000 | +5–10 | 1 milestone | **photos** for each (section 6); otherwise marked assumptions |
| **Helm pedestal** | moulded pedestal with a guard rail (the steel hoop to hold on to), compass on top, wheel with a leather-look rim and proper hub | +6,000 per helm | +4 | ½ milestone | pedestal photo |
| **Live instruments** | compass card turning with the heading; B&G display with apparent wind angle and speed, boat speed, depth; autopilot keypad showing Standby / Auto and the set course; engine lever at its position and a tachometer needle | +2,000 | +4–8 | 1 milestone | new registry ids and Learn entries (English and a Russian draft); their pictures redraw a few times a second only while the camera is close |
| **Corner shading** | slightly darker inside corners (painted into the shapes once, "baked") so parts sit on the deck instead of floating | 0 | 0 | small | — |

**Totals if everything is built:** about **+60,000–75,000 triangles** and **+20–30 draw calls** at High, so about 160,000 triangles and 230 draw calls. The Helm view's instruments only add when the camera is near (they are hidden beyond a few metres), and Low keeps the cheaper versions (6-sided ropes, no braid map, fewer fittings). Per-frame work grows only in the ropes (about 800 points instead of 267, still well under a millisecond).

**A budget the checks enforce** (proposed): High at most 250,000 triangles and 300 draw calls; Low at most 120,000 and 150, in every preset view. A browser check reads `__sailDebug.stats()` and fails over budget, and the owner confirms the frame rate on the phone at each sign-off, as in earlier phases.

## 6. Photos wanted (the owner's own photos only; no brochure images)

Upload them to `docs/reference/photos/` (GitHub app: open the folder → Add file → Upload files, on a new branch), or attach them in the `/plan` chat.

| Photo | What it settles |
|---|---|
| A wheel pedestal from behind (where the helmsman stands) and from the side | pedestal shape, guard rail, where the compass and the B&G display sit |
| The B&G display and the autopilot remote, close, switched on | layout of the screen and the keypad (no need to show personal data) |
| The compass, close | size, card style |
| Where the engine control sits, in a wider shot | which side, how high, relation to the wheel |
| A block at the boom and one at the mast foot, close | block style (cheeks, sheave, shackle) |
| A stanchion base, the pulpit at the bow and the pushpit at the stern | rail joints and feet |
| A shroud's lower end at the deck | turnbuckle and chainplate |
| The hull side from the pier, and the coachroof from above | portlights and deck hatches |
| A rope end or two, close | whipped, taped or melted |

Without a photo, a part is drawn from general knowledge and marked as an assumption in `BOAT_REFERENCE.md`, as the project does already.

## 7. What the plan has to keep working

- **Imported boats:** new numbers (block sizes, pedestal, instruments) go into the boat file with the Hanse 508's values. Because a profile must match the reference's keys, a profile exported before the change would fail the check. The plan decides between filling missing new keys from the Hanse 508 on import (recommended, so old profiles keep working) or a profile version bump with a clear message.
- **Pure model:** the rounding of rope corners is maths and lives in `src/model` with tests; the renderer only draws. Physics, rope lengths and the clutch/winch logic do not change: the smoothing is for drawing only.
- **Taps and Learn:** every new mesh gets an id from `content/registry/parts.json` (status `draft` unless a photo confirms it) and a glossary entry in every language. Tiny parts stay tappable through the existing pick segments.
- **Spotlight, labels in 3D, camera presets, browser checks:** close-up scenes for each milestone (`scripts/shots-m<N>.mjs`); the existing scenes may change pixels but not layouts.
- **Low detail stays light:** phones start on Low.

## 8. Questions for the owner

1. **Keep building everything by code (approach A), with no model files?** Recommended: yes, because it keeps imported boats, taps and Learn working and needs nobody with 3D-modelling skills; model files can still be decided later for a single part.
2. **Should the helm instruments show live data** (compass turning, real wind numbers on the display, autopilot mode and course, engine lever and rev counter moving)? Recommended: yes, because it costs little more than a still picture and teaches what the instruments mean.
3. **Which rope end look?** Recommended: a whipped end (a short dark binding near the tip), because it is what a well-kept cruising yacht has and it reads clearly on a phone.
4. **Should Low detail get the improvements too?** Recommended: smooth rope bends, real blocks and the helm instruments at both levels; rounder ropes, braid texture, small fittings and corner shading at High only, because Low is the phone's default and must stay fast.
5. **When?** Recommended: as the next phase, before the exercises (so the exercises' close-up checks are made once, on the finished look). That renumbers the exercises to Phase 10 and more languages to Phase 11, as was done on 2026-10-23. The alternative is to keep the order and do this as Phase 11.
6. **Photos (section 6):** can you take the pedestal, instruments and engine-control photos on the next visit to the boat? Recommended: yes for the helm ones at least, because the helm is the part you asked for most and is the least known today; the other parts can be drawn as marked assumptions.

## 9. A possible split into milestones (the `/plan` session makes it final)

1. **Ropes:** smooth bends round sheaves and fairleads, rounder tubes without pinches, ends tucked into blocks and boxes, the chosen end look, braid surface at High; a frame-budget browser check.
2. **Blocks and rounded hardware:** real blocks (instanced), bevelled coamings, boxes, clutches with levers, cleats.
3. **Helm:** pedestal with guard rail and compass, better wheels, the engine control where the photo shows it; new ids and Learn entries.
4. **Live instruments:** compass card, B&G wind display, autopilot keypad, tachometer, all from the app's state; shown when the camera is close.
5. **Small fittings and finish:** stanchion bases, rail joints, turnbuckles, chainplates, hatches, portlights, corner shading; phone frame-rate sign-off.

Five milestones, so one phase without parts. Independent review recommended for milestones 1 (it touches every rope) and 4 (live data in 3D).
