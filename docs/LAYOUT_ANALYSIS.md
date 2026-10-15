# Layout analysis (input for `/plan 5`)

**Context for planning Phase 5 (new layout and modes). Not a spec.** Written 2026-10-14 after Phase 4's M22, from the owner's request and answers in a planning chat. `/plan 5` reads this in full, asks the open questions in section 8, and turns the chosen structure into `docs/PHASE5_SPEC.md`. No mockup was made; the plan describes the layout in words and the milestones' browser checks show it.

## 1. Why

The app grew over 24 milestones by adding blocks to four tabs. Measured on a 390 × 844 phone (2026-10-14, `main` after M22, Easy mode):

| Region | Height |
|---|---|
| 3D view (with the overlays on top) | 440 px |
| Panel: tab bar | 45 px |
| Panel: visible content | 359 px |

| Tab | Content height | Phone screens of scrolling | Blocks, top to bottom |
|---|---|---|---|
| Ropes | about 2,090 px | 5.8 | Easy/Realistic switch and hint, clutch drawing, selected-rope info, Sails, All ropes and the wheel, Autopilot, Engine, Rope colours, About this tab |
| Wind | about 2,000 px | 5.6 | True-wind text, Boat (Held still / Sailing), wind instrument dial and its explanation, Wind direction, Wind changes (modes), Waves, Wind presets |
| View | about 1,370 px | 3.8 | Camera, Step size, Detail, Debug, Rope colours, Labels in 3D, Time bar, Clock, Language (M23), Share, Reset |
| Learn | about 680 px plus the entry | 1.9 | Search, groups, one entry at a time |

Over the 3D view: the instrument strip, the time bar, the clock chip, the alert stack (gybe, by the lee, heel, round-up), the info card, seven camera chips (Port, Stbd, Top, Bow, Helm, Free, Map) and the 3D labels.

The problems:

- **Long scrolls:** the controls a learner needs at a given moment (e.g. the main sheet while watching the sail) are several screens away from each other, and the 3D view is small on a phone.
- **Settings mixed with actions:** Detail, debug, labels, legend, time bar, clock, language, Share and Reset sit next to the camera buttons.
- **Explanations always open:** hints and "About this tab" are always expanded.
- **Too many chips:** seven camera chips take a full row over the 3D view.
- **No room to grow:** Phase 7 (marina and anchor) adds the windlass, thrusters, fenders, mooring lines and the marina setting, and Phase 8 adds exercises. In today's tabs they would make the scrolls longer still.

## 2. Inventory: every element, where it is, what it is for

`/plan 5` must give each row a place in the new layout (or say why it is removed).

| Element | Today | Kind | Used |
|---|---|---|---|
| Instrument strip (speed, heading, heel, autopilot badge, true and apparent wind) | over 3D, top left; tap opens the Wind tab | status | all the time while sailing |
| Time bar (speed ¼–16, Pause) / "Held still" chip | over 3D, top | control | often |
| Clock chip and card | over 3D, top right | status + setting | rarely |
| Alert stack (gybe, by the lee, heel, round-up, gybe report) | over 3D | status | when it happens |
| Info card (tapped part, More → Learn) | over 3D, bottom on a phone (140 px) | info | often in learning |
| 3D labels | in 3D | info | learning |
| Camera chips ×7 (incl. Map) | over 3D, bottom row | control | sometimes |
| Map (`cam=map`) | replaces the 3D view | view | sometimes |
| Easy/Realistic switch | Ropes tab | mode | rarely |
| Clutch drawing / Realistic stations (Port, Starboard, Helm, Mast) | Ropes tab | control | all the time while trimming |
| Sails (trim state, telltales, damage, Repair) | Ropes tab | status | while trimming |
| All ropes and the wheel (sliders, − / +) | Ropes tab (Easy) | control | all the time while trimming |
| Autopilot | Ropes tab | control | while sailing |
| Engine (Start/Stop, lever, tachometer) | Ropes tab; lever at the Helm station | control | harbour, no wind |
| Rope colours (legend) | Ropes tab + View switch | info | learning |
| Boat: Held still / Sailing | Wind tab | mode | sometimes |
| Wind direction and speed | Wind tab | setting | sometimes |
| Wind instrument dial | Wind tab | status | while sailing |
| Wind changes (modes, size, new pattern) | Wind tab | setting | rarely |
| Waves (Flat … Open sea) | Wind tab | setting | rarely |
| Wind presets | Wind tab | setting | sometimes |
| Step size, Detail, Debug, Labels, Time bar shown, Clock shown, Language | View tab | setting | rarely |
| Share, Reset | View tab | action | rarely |
| Learn list, search, entry, Show me | Learn tab | learning | learning |
| Footer (disclaimer, version, source) | under the panel | info | rarely |
| Debug overlay | over 3D | developer | testing only |

## 3. The owner's decisions (2026-10-14)

1. **Order:** finish Phase 4 (M23, M24) as planned, then **Phase 5 new layout and modes**, then **Phase 6 boat details**, then marina and anchor (Phase 7), exercises (Phase 8), more languages (Phase 9).
2. **Phone: full-screen 3D with a pull-up sheet** (game style), with small chips and a mini-map over the 3D.
3. **Desktop gets its own layout that shows more at once.** Be realistic: some features cannot be shown comfortably on a phone even with a good layout. They may be reduced there (one block at a time, the full-height sheet) as long as they still work; the plan names them (section 6).
4. **Modes:** **Learn, Easy, Realistic, Harbour** and **Exercises**. A mode changes the layout and what is shown first. Switching modes never loses the boat's state, and everything stays reachable from every mode. Harbour comes with the marina phase (Phase 7) and Exercises with the exercises phase (Phase 8); Phase 5 builds the mode system so that adding them is adding data and sections.
5. **Mini-map** like in games: a small map in a corner, bigger on a tap, turned on and off in the settings.
6. **Fewer, foldable controls:** e.g. one camera chip instead of seven; folding sections; buttons for whole sections hidden until needed.

## 4. Options considered

| | A. Tidy the tabs | B. Game style: 3D + pull-up sheet | C. Mode-driven panel |
|---|---|---|---|
| Phone | 3D on top, panel below, as now, with folding sections | 3D fills the screen; a sheet with three heights (peek, half, full) holds the controls | the mode picks the sections and their order |
| Desktop | as now | side panel always open, plus extra blocks | the same mode data, more sections open at once |
| 3D on a phone | 440 px (no gain) | full screen at peek height, about half at half height | depends on A or B |
| Work | small | large (new shell, gestures, every browser check moves) | medium (sections need ids) |
| Room for Phases 7–8 | poor | good | good |

**Chosen: B for the shell and C for the content** (owner's answers 2 and 4), with a **separate desktop arrangement** (answer 3). A and C alone were rejected because the phone's 3D view would stay small.

## 5. Proposed structure (draft; `/plan 5` makes it final)

### 5.1 Building blocks

- **Sections.** Every block in section 2 becomes a *section* with an id (e.g. `sails`, `ropes-easy`, `stations`, `autopilot`, `engine`, `wind`, `waves`, `wind-modes`, `learn`). A section renders the same way wherever it is placed. Its explanation text is folded behind a small "?" (open on the first visit is a question for the plan).
- **Modes as data.** A mode is a list of sections for the sheet (or the side panel), in order, each open or folded, plus which overlay chips show and a few defaults (e.g. labels on in Learn). It is kept in one data file or table (`src/ui/modes.ts` or `content/ui/modes.json`; the plan picks one). A new phase adds sections and a mode entry, not a new tab.
- **Settings menu** (gear icon). Everything with the kind "setting" that is not about the sea or the wind: language, detail, labels, legend, step size, time bar shown, clock shown, mini-map shown, debug, Share, Reset, about (the footer). It removes the View tab.
- **Conditions card.** The wind, waves, wind modes, presets, Held still / Sailing and the clock, opened from the instrument strip (today the strip already opens the Wind tab). The plan decides whether it is a section in the sheet or its own card.
- **One camera chip.** It shows the current view ("Port ▾") and opens a small menu with the presets. Map leaves the camera list (it is the mini-map's expanded view).
- **Mini-map.** A corner map (boat, heading, wind arrow, buoys, track) drawn by the existing `mapView.ts` at a small size. A tap opens the full map (today's `cam=map`), and a tap or Back returns. It has a switch in the settings and is stored in the link.

### 5.2 Phone (stacked layout)

- **The 3D fills the screen.**
- **Over the 3D:**
  - top: instrument strip, time bar, clock chip, alerts;
  - corners: the mode chip, the camera chip, the mini-map and the gear.
- **The sheet** has three heights:
  - **Peek:** one row of the mode's quick controls, e.g. the sail-trim state and the selected rope's − / + in Easy.
  - **Half:** the mode's sections.
  - **Full:** for the big drawings (Realistic stations, a Learn entry).
  - Drag the handle or tap it to change height.
- The info card sits above the sheet.

### 5.3 Desktop and foldables (side-by-side layout)

- The 3D on the left; on the right, a panel that is always open with the mode's sections, more of them open at once.
- Room for a second column on wide screens (e.g. the Learn entry next to the controls, or the wind dial always visible).
- The mini-map is larger.
- No pull-up sheet.

### 5.4 Modes (first draft of what each shows first)

| Mode | Phase | Sheet / panel, in order | Over the 3D | Defaults |
|---|---|---|---|---|
| Learn | 5 | Learn (search, entry), Rope colours | labels on, info card | none changed in the boat (the boat stays as it is) |
| Easy | 5 | Sails, ropes (sliders, grouped: main, jib, furling, other), wheel and autopilot, engine (folded) | instruments, time bar | today's Easy |
| Realistic | 5 | Stations (Port, Starboard, Helm, Mast), Sails (folded) | instruments, time bar | today's Realistic |
| Harbour | 7 | Engine, thrusters, fenders, lines, windlass | instruments | marina scene |
| Exercises | 8 | Exercise card (task, checks, debrief) + the sections the exercise asks for | as the exercise sets | from the exercise |

## 6. Phone realism: what may be reduced on a phone

Candidates (the plan confirms each one with the owner):

- **Realistic stations:** the clutch drawing plus the winch and the handle need the full sheet height. One station at a time, as today.
- **The full map:** on a phone it replaces the 3D view (as `cam=map` does today). On a desktop it can sit next to the 3D view.
- **A Learn entry with Show me next to the controls:** desktop only. On a phone the entry takes the sheet.
- **The wind instrument dial always visible:** desktop only. On a phone it is in the Conditions card.
- **The debug overlay and the frame times:** fine on any size, but not tuned for a phone.

## 7. Constraints the plan must respect

- **Old links open the same picture.**
  - Every URL key keeps its meaning.
  - **`mode` already means the ropes mode** (`mode=realistic`), so the app mode needs another key or a mapping. The plan decides which (e.g. `m=learn|easy|realistic`, with `mode=realistic` read as Realistic).
  - `cam=map` keeps opening the map.
  - `learn=<id>` opens Learn.
  - Show-me scenes keep working, and so does Back.
- **Phase 1–4 behaviour unchanged:**
  - Easy and Realistic mode work exactly as now; only where they are drawn changes.
  - Tap-to-identify, More → Learn and the info card keep working.
  - Every PHYSICS_TRUTHS test passes.
- **Browser checks:** about twenty `scripts/shots-m*.mjs` files open tabs and tap chips by their place on screen. The first Phase 5 milestone adds helpers in `scripts/shots.mjs` (e.g. `openSection(page, id)`, `setCamera(page, preset)`) and moves the old checks onto them in the same PR, so later milestones change only the helpers. CI's `browser-checks` stays green throughout.
- **Two languages:** after M23 every new string is added to `content/lang/en/ui.json` and `content/lang/ru/ui.json` (Russian as a draft). Mode names in Russian go into the M24 review list, or into a later review if M24 is already merged.
- **Phone rules:** touch targets ≥ 44 px, no page scroll, 60 fps, and the accessibility audit (`scripts/a11y-audit.mjs`) covers the sheet, the menus and the mini-map.
- **No UI framework** (ROADMAP decisions, 2026-10-08) unless the plan shows a clear need. The sheet gestures can be built with pointer events, as the Realistic gestures are.
- **`src/model` stays pure.** The mode and the sheet height are UI state in the store, not model state.

## 8. Open questions for `/plan 5` (ask the owner, each with a recommendation)

1. **The mode at first open, without a link.**
   - Recommended: **Easy**, because today's first screen is Easy, Sailing, and a beginner sees the boat move straight away. Learn is one tap away.
2. **The sheet's height at first open on a phone.**
   - Recommended: **half**, because the controls are visible without hiding most of the boat.
3. **The mini-map at first open.**
   - Recommended: **on, while Sailing**, because it shows the wind and the course. It is hidden in Held still, where it shows nothing new.
4. **Mini-map orientation.**
   - Recommended: **north up, with the boat turning**, because today's map works that way, and so does the wind fixed on the map (Phase 2 decision).
5. **Explanations ("?" folded).**
   - Recommended: **folded, with a first-visit hint that the "?" opens them**, because the hints are what makes today's tabs long.
6. **Is the Wind tab split between the Conditions card and the settings, or kept as one section?**
   - Recommended: **one Conditions section** (wind, waves, modes, presets, Held still / Sailing, clock), because the learner thinks of them as "the weather".
7. **Milestone split.** Draft:
   - M25: settings menu, one camera chip, the browser-check helpers;
   - M26: the phone shell with the pull-up sheet, and the desktop panel;
   - M27: modes Learn, Easy and Realistic, with sections and folding;
   - M28: mini-map;
   - M29: desktop extras, polish and sign-off.
   - Recommended: **this order**, because each step can be checked on the phone on its own and the riskiest change (the shell) comes after the helpers that protect the old checks.
