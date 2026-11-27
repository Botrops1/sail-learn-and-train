# UI concept: computer console and phone Watch (input for a later `/plan`)

A concept, not a spec: issues #161 (the computer's controls) and #272 (rethink the UI), written 2026-11-27 from the owner's `/plan issues 161 and 272` ("a concept before we go to an actual plan"). Nothing is decided yet. The owner answers the questions in section 9; a later `/plan` turns the answers into specs, one part at a time (section 8).

**Clickable mockup:** [`docs/mockups/ui-concept.html`](mockups/ui-concept.html). Open it on a computer: every box on the computer screen can be dragged and resized (**Arrange**), for four screen sizes and three layouts, with Easy or Realistic lines, sailing, an exercise or the marina. **Copy layout** gives a line of text to paste into the PR, so the plan can use the owner's arrangement. Its other two pages show the phone's Watch mode (with four highlight styles to compare) and the first-person idea.

## 1. Why

Measured on `main` after M118 (screenshots taken for this concept, not committed):

- **Laptop 1440 × 900:** the 3D view gets 680 px of the 1,440 (47 %). The two panel columns take the rest, and most of it shows folded section headers (Lines, Helm, Sails, Place, Harbour gear, Status, Conditions, Learn). To trim a sheet and steer, the learner opens Lines, then Helm, and the first one folds ("one open at a time per column").
- **Tablet 1024 × 768:** the 3D view gets 700 px; one column of ten folded sections.
- **During an exercise on a laptop:** the step is written twice (the step card over the 3D view and the Exercises section in the column), the step bar floats in the middle of the sea, and the controls the step needs are in a third place (the step bar or a section).
- **Phone 390 × 844:** the controls sit in the sheet under five tabs. Exercises work there since M79–M82 (the step bar, Watch, Show me), but anything beyond one or two rows of controls (the Realistic stations, harbour work) needs the full sheet and hides the boat.

What the owner asks:

- **#161:** use the mouse and keyboard on a computer; a panel along the bottom with the thrusters, engine lever, autopilot and wheel; a switch for the port and starboard side that shows that side's ropes, clutches and winch; no folding and unfolding of sections; the exercise stays open. A clickable mockup first, where everything can be moved and resized.
- **#272:** two set-ups. **Phone, portrait:** learning (look at the boat, tap parts) and exercises as **Watch only**, with the working part highlighted on the boat (colour, blinking, outline, the rest faded), plain words and small buttons; simpler conditions, map and views (behind the boat, or free); an arcade-style mode later. **Computer and tablet, landscape:** reworked to be more direct, in three control styles, **A. Easy**, **B. Realistic**, **C. Immersive** (first person, later), and activities **Exercise**, **Learning**, later **Quest**, **Race** and **Arcade**.

## 2. The idea in one picture

Three separate choices, where today one "Mode" mixes them:

| Choice | Values | Who decides |
|---|---|---|
| **Screen shape** | Console layout (wide and tall enough), phone layout (everything else) | The app, from the window size |
| **What you are doing** (activity) | Learn, Sail freely, Exercise; later Quest, Race, Arcade | The learner |
| **How you control the boat** (control style) | Easy, Realistic; later First person | The learner (an exercise may set it) |

Today's modes map onto it: Learn = Learn; Easy = Sail freely + Easy; Realistic = Sail freely + Realistic; Exercises = Exercise; **Harbour** becomes Sail freely in a place (the marina or the bay), where the console adds the thrusters and the harbour gear. Old links keep opening the same picture (`m=harbour` opens Sail freely at its place).

## 3. Console layout (computer, tablet in landscape)

**Rule (proposed):** the console layout when the window is at least 900 px wide **and** 560 px tall and wider than tall; otherwise the phone layout. A phone held sideways (844 × 390) gets the phone layout: a console there leaves almost no sea (the mockup shows it).

**What is on the screen** (layout A of the mockup, the one #161 describes):

- **The 3D view fills the whole window.** The camera frames the boat in the sea the console leaves free (as it does today above the phone's sheet).
- **Top:** instruments (left), time widget (right), the exercise's step card (middle, only in an exercise).
- **Bottom: the console**, one band about 240 px high, always open, folded away with one key (Tab) or its button. It holds everything you **operate** while sailing, side by side, nothing folded:
  - **Wheel and autopilot:** a wheel to drag (or ← →), Standby / Auto / Wind and −10 −1 +1 +10.
  - **Engine and thrusters:** the lever to drag, Start/Stop, rpm; the bow and stern thruster buttons only in a place.
  - **Lines:** in Easy, every line as a row with − slider + and its keys (W/S main sheet, R/F jib sheet), the mouse wheel over a row moves it. In Realistic, the station you stand at (Port, Mast, Bow, Starboard; keys 1–4) with its clutch bank and winch drawn large: click a clutch, drag round the winch to crank. Port and Starboard are the same drawing mirrored, as #161 asks.
  - **Sails:** the trim words (Main: Good, Jib: Luffing), telltales, damage and Repair.
  - **Harbour gear** (only in a place): fenders, mooring lines, the windlass.
- **Right edge: a menu** (Exercises, Learn, Conditions, Place, Status, Settings). Each opens a **drawer** over the 3D view, one at a time, closed with × or Esc. Everything you **read or set up** lives there; nothing you need while sailing does.
- **Bottom corners:** the mini-map (left), the view and sound chips (right).

**During an exercise** there is no separate step bar on this layout: the step card says what to do (with Show me and How?), and the console marks the controls the step needs (an orange ring) and dims the rest. The exercise list and setup (crew, level, Watch it or Do it myself) open in the Exercises drawer.

**Mouse and keyboard:** the keys that exist today stay (`ui/keyboard.ts`), and each control shows its key. New: Tab hides the console, 1–4 choose the station, the mouse wheel moves a line, drags turn the wheel, the lever and the winch.

**What goes away on the computer:** the two panel columns, their fold chips and width grips (`ui/columnHandles.ts`), and movable sections (`ui/sectionMove.ts`), because the drawer shows one thing at a time and the console is fixed. The phone keeps its sheet.

**Layouts B and C** are in the mockup to compare: B puts the wheel in the bottom-left and the lines in the bottom-right corner, with no band (game style); C keeps a dock on the right with the lines always open (closest to today). The owner picks one after trying them (question 4).

## 4. Phone layout: watch and learn

- **Learn** as today: tap a part, read its entry, Show it working.
- **Exercises: Watch first.** The app sails the exercise; a card at the bottom says in plain words what is happening now, with four small buttons: Again (this step), Pause/Play, Next, speed ×2. The part that is working **lights up on the boat** and the rest fades; the camera turns to it. The mockup lets the owner compare colour glow, blinking, outline and fading.
- **Do it myself on a phone** (question 2): built in M79–M82 and working for the Easy exercises; the concept keeps it as the second choice, and the Realistic exercises become Watch only on a phone, with a line "Do it yourself on a computer or tablet".
- **Simpler settings:** Conditions as four wind presets (Light, Moderate, Fresh, Strong) and the wind's direction; the views reduced to **Behind the boat** (a new camera that follows the boat from astern) and **Free**; the mini-map as today. The full settings stay on the computer and in links.
- **Sail (later):** an arcade-style mode where you only steer and set the speed and the app trims the sails; useful once there is something to sail to (buoys, a course, a race).

**The highlight is shared work.** The same "light up this part, fade the rest" serves Watch on the phone, Show me on the computer and the Learn entries. `ui/spotlight.ts` already flies the camera close and darkens the rest; the concept extends it to light the part itself during a run.

## 5. Later ideas (not planned now)

- **First person (#272 C):** you stand where the captain stands and work the real winch, clutches, wheel and panel on the 3D model (the mockup's third page, over today's Helm view). It builds on the captain figure (M111, M112), the Helm camera (M53, M64) and the Realistic stations. Large: its own phase after the console.
- **Arcade** (phone and computer), **Race** (a course round the practice buoys in a set wind; the buoys exist since Phase 3) and **Quest** (visit places, stay the night, needs real surroundings). Each is an activity in the table of section 2, so they can be added without changing the layouts.

## 6. What stays as it is

- `src/model` and the sailing: nothing in the physics changes. Every PHYSICS_TRUTHS test keeps passing.
- Every control the console shows already exists as a store action (`setControls`, `realistic`, `autopilot`, `engine`, `thruster`, `line`, `windlass`, …); the console only draws them differently.
- Links: every URL key keeps its meaning; `m=` gains values only if question 3 is answered yes, and old values are read as section 2 says.
- The phone's sheet, tabs, step bar, Watch and Show me.

## 7. Risks and costs

- **Browser checks:** 5 of 113 check files use the wide columns (`isWide`, `columnSections`, `moveSectionBy`) and 5 use the step bar; 322 calls reach the panel through `showSection` / `showTab` in `scripts/ui.mjs`. The first milestone moves those helpers onto the drawer and the console, so most old checks keep working unchanged (as Phase 5's first milestone did).
- **Camera framing:** `render3d/cameraRig.ts` already frames the boat in the area left by the sheet, the chips and the step stack; the console becomes one more such area.
- **Two layouts to keep working:** every later milestone checks both (as today with stacked and side).
- **Touch on a tablet:** the console's drags (wheel, lever, winch) work with a finger too (pointer events, as the Realistic gestures already do).

## 8. Proposed parts (draft for `/plan`)

**Part A: the console on the computer and tablet** (answers #161; about 6 milestones):

1. The console shell: the layout rule, the full-width 3D view, the menu and its drawers in place of the columns, the console band with its fold, the browser-check helpers moved.
2. Wheel, autopilot, engine and thrusters in the console, with drags and keys.
3. Lines in Easy: the compact rows, keys, mouse wheel; Sails beside them.
4. Lines in Realistic: the station switch (Port, Mast, Bow, Starboard) with the clutch bank and winch drawn large.
5. Exercises in the console: the step card plus marked controls, no step bar on this layout, the exercise list in its drawer; harbour gear in a place.
6. Activity and control style as two choices (if question 3 is yes), old links, sign-off.

**Part B: the phone's watch and learn** (#272 part 1; about 4 milestones): the highlight (light up and fade the rest) in Watch, Show me and Learn; the Watch card with its four buttons; Behind-the-boat and Free views and the simple Conditions; Do it on a phone limited to what fits (question 2), sign-off.

**Part C, later:** first person; Arcade, Race, Quest (section 5).

## 9. Questions for the owner (each with a recommendation)

1. **Which screens get the console?** Recommended: wider than tall, at least 900 × 560 px (computers, tablets held sideways, an open foldable); everything else the phone layout, because below 560 px tall the console leaves too little sea.
2. **Do it myself on a phone:** keep it or remove it? Recommended: keep it for the Easy exercises (built and working since M79–M82), make Watch the first choice, and make the Realistic exercises Watch only on a phone, because removing it costs a milestone and loses something that works.
3. **Split Mode into "What you are doing" and "Controls"**, with Harbour becoming "Sail freely at the marina or in the bay"? Recommended: yes, because Quest, Race, Arcade and First person then fit without new modes, and old links keep working.
4. **Which computer layout: A bottom console, B corners, C side dock?** Recommended: A, because it is what #161 describes, keeps the whole width for the 3D view and puts every control one glance below the boat. Try all three in the mockup first; a pasted "Copy layout" text becomes the plan's numbers.
5. **Can the learner move the boxes in the real app?** Recommended: no; one fixed layout chosen from the mockup, with the console folded by Tab, because free arranging needs saving, resetting and checks for every arrangement, and today's movable sections and column widths go away with the columns.
6. **During an exercise on a computer: mark the needed controls in the console instead of a separate step bar?** Recommended: yes, ring what the step needs and dim the rest, because the console already holds every control and the step is then in one place (the card).
7. **The phone's highlight style.** Recommended: colour glow plus fading the rest, no blinking, because blinking reads as a warning and tires the eye in a long Watch; compare all four in the mockup.
8. **The phone's views and conditions:** Behind the boat and Free only; four wind presets and the direction? Recommended: yes, with the full Conditions still opened by a link, because the phone becomes a place to watch, not to set up.
9. **Order:** Part A (computer) first, then Part B (phone)? Recommended: A first, because the phone already works for exercises while the computer is where the controls are hardest today (#161).
10. **First person, Arcade, Race, Quest:** keep them in the ROADMAP's "Later" without a plan now? Recommended: yes, because each needs the console or new surroundings first.
