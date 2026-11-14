# Code map

Where things are, so a session can go straight to the right file instead of searching. One entry per file, saying what it does now (no history: `git log` has it; the file's own header comment has the details). **Keep it current:** a PR that adds, removes or renames a file, or moves a responsibility, updates this map in the same PR. `tests/docs.test.ts` checks that every file under `src/` is named here, that every path named here exists, and that no line is over 600 characters.

## How a frame runs

`src/main.ts` puts the chosen or linked boat in place (`useBoat`), then loads the app → `app/app.ts` builds the layout, the 3D scene and the panel, then runs the frame loop: each `requestAnimationFrame` dispatches `{ type: 'step', dt }` to the store (`app/store.ts`), which advances the pure model (`model/sim.ts` and the sailing modules, order in PHASE2_SPEC 4.2); then the renderers and panels read the new state.

The 3D view fills the page; over it sit the chip row, the mini-map, the time widget and the info card. The panel is a sheet with five tabs on a phone (`ui/sheet.ts`, `ui/panelTabs.ts`), docked on the right in the side layout, with a second column from 1,280 px wide (`ui/panel.ts`); its content is a list of sections ordered and opened by the mode (`ui/modes.ts`). UI code only dispatches actions; it never changes state directly. `src/style.css` holds all the styles. `app/urlSync.ts` writes the state into the address bar.

Store actions (see `store.ts`): `step`, `setControls`, `select`, `openLearn`, `reset`, `load` (from a link), `setCameraPreset`, `setDetail`, `setLabels`, `setDebug`, `setStep`, `setPaused`, `setRopesMode`, `realistic` (Realistic-mode gestures), `setBoatMode`, `autopilot`, `engine`, `setWindMode`, `newWindPattern`, `setWindSize`, `setClock`, `setClockShown`, `setTimeBar`, `setTimeScale`, `setSeaSetting`, `setMiniMap`, `setFenders`, `thruster`, `line`, `clearPropeller`, `windlass`, `silenceAnchorAlarm`, `goToPlace`, `setMarinaLayout`, `setTraffic`, `repairSails`, `demo`.

## `content/` (data, no code)

| File | What |
|---|---|
| `exercises/exercises.json`, `lang/<code>/exercises.json` | The exercises (steps, checks, mistakes, start links; language-neutral) and their texts by the same ids (English source, Russian draft). |
| `boat/hanse508.json` | All boat geometry, ropes, clutch banks, winches, stations, `physics`, `windModes`, tuning values. No numbers in code. |
| `audio/sounds.json` | Every number of the sound: group gains, smoothing, the wind, waves, hull, sails, engine, gear, marina, birds and the `music` block. No sound number in code. |
| `registry/parts.json` | Every id a mesh, rope or control may carry, with language-neutral facts only (kind, `group`, fact status, sources, `controls`, `related`, `showMe`). Names and texts are in the glossaries. |
| `lang/<code>/ui.json` | UI strings of one language, read through `t()`; `en` and `ru` have the same keys in the same order. |
| `lang/latin-words.json` | The Latin words allowed on a Russian screen (instrument letters, makers, quoted foreign words). |
| `lang/<code>/glossary.json` | The Learn entries of one language by registry id. `en` is the source; `ru` is an AI draft. Read through `model/glossary.ts`. |
| `areas/adriatic.json` | A sailing area: position, time zone, fetch per Waves setting, practice buoys, default clock, local winds, places, marina and bay. Loaded by id (`model/area.ts`). |

## `src/app/` (state and wiring)

| File | What |
|---|---|
| `app.ts` | Builds everything, runs the frame loop, FPS and frame times for the debug overlay; shows the note for a link to a boat not on this device. |
| `boatStore.ts` | The imported boats on this device (`localStorage`): `storedBoats`, `saveBoat`, `removeBoat`, `chosenBoat`, `setChosenBoat`, `linkBoatId`, `startBoatId`. Imports only `model/boat` and `model/boatProfile`, because `main.ts` reads it first. |
| `store.ts` | The single store: `AppState`, all actions, the `step` order. `reduce` cuts a fast time-lapse frame into slices and applies a step's speed-up; the `demo` action replays a pilot without logging it. |
| `appMode.ts` | `AppMode` (`learn`, `easy`, `realistic`, `harbour`) and the mode chip's choices. |
| `exerciseRun.ts` | The coach, pure: `ExerciseRun`, `newRun`, `startRun`, `stepExercise` (a step's check and hold), mistakes from alerts and held conditions, waypoints and `restoreWaypoint`, the action log, run events (tack, gybe, gusts), crew and level options, the demo and a step's speed-up. |
| `exerciseBar.ts` | The step bar's pure part: which control rows a step shows (`barRowsFor`), which row an action works (`barRowOf`), Realistic-ropes rows and stations. |
| `exerciseProgress.ts` | The ticks, best times and watched marks of the exercises on this device (`localStorage`). |
| `exercisePilots.ts` | The scripted learners of every exercise (`pilotFor`, `pilotActions`), used by Watch and Show me and by the tests. |
| `urlState.ts` | URL parameters ↔ state: schema version, defaults, old links, place, boat, exercise and waypoint keys. |
| `urlSync.ts` | Debounced address-bar updates; Back loads the link (or reloads for another language or boat); `openScene` for Learn's "Show me". |
| `buildChannel.ts` | The build channel (`release`, `next`, `preview`) and version, the About line and the visitor counter's HTML (release only). Imported by `vite.config.ts`, so it imports nothing from the rest of `src/`. |
| `buildInfo.ts` | Commit hash, date, channel and version for Settings → About and the debug overlay; `REPO_URL`, `ISSUES_URL`. |
| `setupFile.ts` | The setup file, pure: `makeSetupFile`, `readSetupFile` (checks it), `setupFileName`, `DeviceSettings`. Holds the link and what this device remembers, never the alert history or damage. |

## `src/model/` (pure: no DOM, no three.js)

| File | What |
|---|---|
| `sim.ts` | Per-frame rig state and `step`: controls → boom, jib, sails, ropes. |
| `boat.ts` | The boat in use as live bindings (`boat`, `boatId`, `boatName`): the Hanse 508 unless `useBoat()` ran first. Read `boat` at call time, never copy it into a module constant. |
| `boatProfile.ts` | The boat profile file: `makeBoatProfile`, `checkBoatProfile` (shape against the Hanse 508, then ranges), `fillAddedKeys` for old profiles. Guide: `docs/BOAT_PROFILE.md`. |
| `rigGeometry.ts`, `hullShape.ts`, `deckVolumes.ts` | Boat data and the static geometry derived from it: hull sections, deck volumes, toerail, channel lanes, the coachroof outline. |
| `bowGear.ts` | The anchor's fluke, the chain's links and the windlass's deck height as numbers. |
| `mooringFittings.ts` | Where the mooring cleats, fairleads, fenders and the ball fender stand or hang. |
| `alerts.ts` | The alert history as numbers: `recordAlerts`, the kinds and their Learn entry and colour (`ALERT_INFO`), tags (`alertTag`), repeat gaps. |
| `exercises.ts` | The exercise data types and loader, `checkPasses` (every field of a check must hold), targets and their hint rows, `exerciseText`. |
| `debrief.ts` | The run's log as debrief rows (`debriefRows`, with the actions that caused a mistake) and `debriefSummary`. |
| `lowSpeed.ts` | Slow-speed handling: `ExternalForces` (the hook for thrusters, lines, anchor and contact), wind on the hull, prop walk and wash, sway and yaw inertia. |
| `thrusters.ts`, `harbourForces.ts` | The bow and stern thruster as numbers (a boat may have none, one or both); `harbourForces` builds the `external` force function `stepBoat` calls every substep (thrusters, contact, lines, ground, chain). |
| `contact.ts` | Contact as numbers: the hull's contact points, spring-damper `contactForces`, severity, one damage report per new contact (merged within 3 s), fenders torn off at speed. |
| `mooringLines.ts` | Mooring lines as numbers: springs that pull only when stretched, line commands (take, tighten, ease, let go), the crew task, a line round the propeller, the bay's bow and shore lines. |
| `seabed.ts` | The bay as numbers: water depth, bottom kind, ground forces on a keel that is too deep, the shore as obstacles. |
| `anchor.ts` | The anchor and windlass as numbers: `AnchorState`, the chain's pull and curve, holding by bottom and scope, windlass motion, dragging and the alarm. |
| `marina.ts`, `places.ts` | The marina as numbers (quay, pontoon, berths, rings, moored yachts, breakwater, buildings, bow lines) and its obstacles for contact; the places and where the boat starts in each. |
| `harbour.ts` | `HarbourState`: fenders out or in, place, marina layout and traffic, fenders lost, and the hints for fenders and fenders-in. |
| `controls.ts`, `settings.ts`, `steering.ts`, `wind.ts` | Control targets, settings, wheel/rudder, test-wind helpers. |
| `boomSolver.ts`, `pitchLimits.ts`, `mainsheet.ts`, `mainFurl.ts` | Mainsail and boom: free angle, vang/topping-lift limits, German mainsheet, in-mast furling. |
| `jib.ts` | Self-tacking jib: car, sheet, furling. |
| `sailShape.ts` | Sail surface grids for both sails. |
| `ropePaths.ts`, `ropeLengths.ts` | Where each rope runs (polylines), the manual's rope lengths, wraps on winch drums, tails into the rope box, guide blocks on the channel's line. |
| `ropeSmooth.ts` | The ropes as drawn, for the picture only: rounded corners, whipped tails, steady tube frames. Rope lengths are unchanged. |
| `backstay.ts` | Where the backstay's block and its two ends stand. |
| `ropeBin.ts` | The rope tail box behind each winch as numbers, and the coil a rope held in the hand ends in. |
| `panelEntries.ts` | What the Ropes tab offers, derived from the boat data. |
| `handlePose.ts` | Where the winch handle is drawn: lying at a station, in a winch's or the gearbox's socket, or null while carried. |
| `smallFittings.ts` | Small fittings as numbers: hull width at a height, portlights, shroud feet, stanchion bases, hatches, contact shadows. |
| `helmPedestal.ts`, `helmPanel.ts` | The helm pedestal's places and frames; what the panel's instruments show (`panelReadings`, lever, joystick and needle angles). |
| `realistic.ts`, `winch.ts` | Realistic mode: stations, clutches, wraps, self-tailer, handle, gearbox; capstan rule and winch physics. |
| `labels3d.ts`, `registry.ts` | Where 3D labels sit; registry lookups (`partInfo`: name and one-liner from the glossary, words on the boat from `boatLabels.ts`). |
| `boatLabels.ts` | The words printed on the boat for an id, from the clutch labels in the boat file. |
| `languages.ts` | The available languages (from every `content/lang/*/ui.json`) and `latinAllowed`. |
| `glossary.ts` | The glossaries by language, `learnEntry`, `NOT_DRAWN`, `sourceLink`, groups and `searchGlossary`. |
| `angles.ts`, `vec3.ts`, `random.ts` | Shared helpers: angles and units, vectors, seeded random. |
| `apparentWind.ts`, `sailForces.ts`, `hullResistance.ts`, `motion.ts` | Apparent wind, lift/drag, resistance, speed/heading/position, sideways motion and turning on the spot at low speed. `stepBoat` merges the contacts of its substeps. |
| `heel.ts`, `sheetLoads.ts` | Heel and weather helm; sheet loads from the sail forces. |
| `autopilot.ts` | Standby / heading / wind-angle autopilot. |
| `trim.ts` | Trim states (luffing, good, stalled, …), telltales, blanketing, flogging damage. |
| `engine.ts` | Engine: lever → rpm and gear (through neutral), thrust along the bow. |
| `gybe.ts` | Gybes: the boom's swing under the wind's push, impact energy and sheet load, the danger-zone sector to draw. |
| `windModes.ts`, `timeScale.ts` | Steady/gusty/shifty/building/dying/scripted wind and the local wind ids; the time scales (with the time-lapse ones), where the speed part shows and where Pause is replaced by "Held still". |
| `localWinds.ts` | The Adriatic's local winds as functions of the clock (`localWindMean`, `windMean`, `trueWind`, `localHourOf`) and the scripted wind's timetable (`scriptMean`). |
| `pointsOfSail.ts`, `mapFrame.ts`, `track.ts` | Map helpers: points of sail, map frame (`mapToBoat`/`boatToMap`, water shift), the track. |
| `waves.ts`, `waveMotion.ts`, `area.ts` | Wave size from wind and fetch, the wave trains and surface height; heave, pitch and roll and what the rocking does to sails, steering and speed; the area's data. |
| `clock.ts`, `sun.ts` | The on-board clock (UTC ms, local and summer time, the `clk` link form) and the sun (height, direction, sunrise and sunset). |
| `windOnWater.ts` | How many white horses a wind makes, the gust profile upwind, and where the practice buoys are relative to the boat. |

## `src/render3d/` (three.js; reads state, never changes it)

| File | What |
|---|---|
| `scene.ts`, `sceneConfig.ts` | Renderer, lights (the sun's from the clock), per-frame update; colours, sizes, camera framing, frame-rate keys (`SCENE.performance`). |
| `cameraRig.ts`, `cameraPresets.ts` | Camera control and the presets (Side, Top, Bow, Helm). Frames the boat in the area left by the sheet, chips and step stack (eased when only those change); the spotlight's close-up and way back; helm views; the hand camera (zoom to the pointer, slide, stop above the water, stay out of the hull, turn round a double-tapped point). |
| `picking.ts` | Tap-to-identify hit testing; double-tap detection and the surface point a tap's ray hits. |
| `environment.ts`, `world.ts`, `wake.ts`, `wind.ts` | The cloud and ripple textures, the world group (steps the water along the map), the wake, wind streaks. |
| `waterSurface.ts` | The water: wave mesh with its grid lines, flat outer water to the horizon, the tap plane; vertex colours (wind darkening, gust patch, white crests); `heightAt`. |
| `daylight.ts` | The sun's light from the clock: its direction in the boat frame and at its true height for the sky, and how strong the sun, the sky light and the night are. |
| `skyDome.ts`, `skyColours.ts` | The sky as a shader on a sphere round the camera (gradient, clouds, sun, stars) and the sky colours for a sun height; also rendered into a small cube map for High detail's reflections. |
| `marina.ts` | The marina in 3D (quay, wall, pontoon, rings, our berth's stripe and arrow, moored yachts as instanced meshes), built at map positions in the world group and moved with the boat. |
| `harbourDetail.ts` | The marina's surroundings: the rock breakwater, entrance lights, paved land, buildings, lamp posts, bollards and the pontoon's floats. |
| `exerciseTarget.ts` | The magenta outline of the current step's target, hidden when no step shows one. |
| `seabed.ts`, `bay.ts` | The bay in 3D: terrain (shore and bottom as vertex-coloured meshes), the marina basin's bottom, the shore rings and the mooring buoys. |
| `anchorChain.ts` | The anchor chain in 3D (hanging, lying or catenary) and the anchor at its end; the boat's own anchor hides while it is down. |
| `marks.ts` | The four practice buoys (sphere, pole, X topmark) floating on the drawn water, tappable. |
| `dangerZone.ts` | The red sector the boom sweeps in a gybe, and its faint outline by the lee. |
| `mooringLines.ts` | The mooring lines in 3D: each line that is on as a tube from its cleat (slack ones sag), our berth's lazy line, and the one the crew walks. |
| `boat/index.ts` | Builds the boat and applies the solved rig each frame. |
| `boat/hull.ts`, `boat/appendages.ts`, `boat/deckGear.ts`, `boat/cockpitHardware.ts`, `boat/rig.ts`, `boat/parts.ts` | Hull (toerail, coamings, roof lip), keel/rudder, deck gear and rope-channel mouldings, wheels/winches/clutches/rope boxes, mast/boom/stays/backstay/guide blocks/furling gearbox, part helpers (blocks, rounded boxes). |
| `boat/bowGear.ts` | The bow roller, anchor, chain and windlass on the foredeck; static. |
| `boat/mooringFittings.ts` | The horn cleats and fairleads on the toerail; static. |
| `boat/thrusters.ts` | Each thruster's tunnel (only the ends the boat has) and the water jets shown while a joystick is held. |
| `boat/fenders.ts` | The eight fenders and the ball fender; hidden in the locker. |
| `boat/sailMesh.ts`, `boat/ropes.ts`, `boat/telltales.ts` | Sails, ropes (capped ends, smooth tubes, whipped tails, braid normal map), telltales and the tear mark; `BoatModel.ropeStats()` reads what was drawn. |
| `boat/winchHandle.ts` | The one winch handle, placed from `handlePose`, hidden when carried or in Easy ropes. |
| `boat/smallFittings.ts` | High detail only: shroud feet, deck hatches, hull windows and soft contact patches (not pickable). |
| `boat/helmPedestal.ts`, `boat/panelFaces.ts` | The column, pod, guard rail and instrument faces at each wheel (canvas textures redrawn only when readings change, only when near), the lever and joysticks; `panelFaces.ts` draws the compass, wind, tachometer and keypad faces. |
| `boat/materials.ts`, `boat/textures.ts` | Materials and procedural textures. |

## `src/audio/` (sound made by the app; reads state, never changes it)

| File | What |
|---|---|
| `types.ts`, `soundData.ts`, `prefs.ts`, `pulses.ts`, `levels.ts`, `support.ts` | Pure: shared types and tables, `content/audio/sounds.json` typed (`SOUND`), the device setting (`localStorage`), pulse timing, `soundTargets` (gain, pitch and rate of each voice and group from the state), `soundSupported`. |
| `engine.ts` | `createSoundEngine(store)`: makes the `AudioContext` and the graph only inside a tap or key press once Sound is on, suspends it when off or hidden, and moves each voice towards `soundTargets` every frame. Sets `window.__sailSound` for the browser checks. Not imported by tests. |
| `boatVoices.ts` | The sail flaps and rushes, the engine, and the start and hull-contact one-shots. |
| `gearVoices.ts` | The winch motor and ratchet, the chain, a rope running out, the windlass, the thrusters, and the winch cut-out and anchor one-shots. |
| `placeVoices.ts` | The marina's halyards and lapping, gulls and small birds (Poisson voices). |
| `musicScore.ts`, `music.ts` | The generated music: `musicScore.ts` is pure (seeded chords and notes, a slowly moving key and density); `music.ts` plays them (pad, notes, low-pass filter, echo) only while the music group is audible. |
| `voice.ts`, `noise.ts`, `surroundingsVoices.ts` | The voice contract and one-shot counter, the seeded noise buffer, and the wind, whistle, waves and hull voices. |

## `src/ui/` (DOM, no framework; dispatches actions)

| File | What |
|---|---|
| `layout.ts`, `layoutMode.ts`, `dom.ts` | Page layout (stacked / side by side / `wide` from 1,280 px, `<html data-wide>`), DOM helper. |
| `columnHandles.ts`, `columnWidths.ts` | On the wide layout the two panel columns fold (a chip each) and resize (a grip on the left edge); `columnHandles.ts` builds them and keeps the choice in `localStorage`, `columnWidths.ts` is the pure part (limits, defaults, saved text). |
| `sheet.ts`, `sheetGeometry.ts` | On a phone the panel is a sheet with three heights (peek, half, full), moved by dragging, tapping or keys on its handle or tabs row; tells the 3D view how much of the bottom it covers. `sheetGeometry.ts` is the pure part (heights, snapping). |
| `i18n.ts` | Strings: `setLanguage`/`currentLanguage`, `t()`, `part()` (name and one-liner), `quoted()`, `formatThousands`. |
| `panelTabs.ts` | The phone's five tabs (Mode, Controls, Conditions, Learn, Settings) under the sheet's handle; only says which is chosen, `panel.ts` decides what shows. |
| `sectionLayout.ts`, `sectionMove.ts` | Movable sections on the wide layout: the pure arrangement (default, complete, move, parse, serialize) and the DOM part (grip, drag, menu, keys). |
| `panel.ts` | The panel as a list of sections built once and ordered by the mode; one open at a time per column; the second column; the saved arrangement; which sections show under each phone tab; opens a section for a link, a rope or a Learn entry; moves the mode picker and settings content between the phone's tabs and the cards. |
| `modes.ts`, `sections.ts` | `modes.ts` (pure) is the table of sections and what each mode does with them (order, phone tab of each, availability with an exercise loaded). `sections.ts` is one section: fold header, optional "?" button for its `.explain` texts. |
| `modeChip.ts`, `modePicker.ts`, `quickRow.ts` | The mode chip (opens the mode card), the mode picker (body of the Mode tab and card), and the quick row in the sheet's head (the selected rope's − / +, or in Harbour the engine lever and thruster joysticks). |
| `files.ts`, `deviceSettings.ts` | `downloadJson`, `pickJsonFile`; reading and writing the device's saved settings (columns, time-bar fold, layout) in their stored formats. |
| `settingsMenu.ts` | The gear's settings card, or on a phone the Settings section: Language, Sound, Labels, Time, Clock, Mini-map, Step size, Detail, Boat (profile download, chooser, import), Your setup, Share, Reset, Debug, About. `createConfirmButton` is the two-tap button. |
| `welcome.ts` | The welcome card for a first visit (Watch the first exercise, Look around the boat, Close); a link with settings never shows it. |
| `soundSettings.ts`, `soundChip.ts` | The Sound block of Settings (on, Music, Surroundings, Boat sounds, volume) and the speaker chip. |
| `chipCard.ts` | `createChipCard`: the card that opens above a chip over the 3D view (header with ×, scrolling body, not modal, one overlay at a time). |
| `cameraChip.ts`, `chipMenu.ts` | The chip row over the bottom of the 3D view, the camera chip and its menu (with the help line), the Close-map chip; `chipMenu.ts` is the menu behaviour. |
| `helmViews.ts` | The three Helm-camera buttons (Ropes, Panel, Other wheel), shown only while the camera is on Helm. |
| `learnTab.ts` | The Learn section: search box, entries in groups, one entry at a time (names, text, "Show it working", "Where is it?", Try it, See also, how sure we are). |
| `ropesTab.ts`, `ropeControls.ts`, `stepper.ts`, `ropeColours.ts` | The Ropes section (rope list and the selected rope's strip, the Realistic stations), − / + buttons, rope colours and dash patterns. |
| `realisticPanel.ts`, `stationDrawing.ts`, `mastDrawing.ts`, `handleDrawing.ts` | Realistic mode: the four stations (Port, Starboard, Mast, Bow), gestures, winch handle and strain bar, the Helm station's body and the windlass remote. |
| `windPanel.ts`, `windModePanel.ts`, `wavesPanel.ts`, `windIndicator.ts`, `windInstrument.ts` | The Conditions section (wind dial, speed, wind modes with the local winds row, waves, presets), the alert stack over the 3D view, the wind instrument dial. |
| `thrusterPanel.ts` | The Thrusters block under the engine lever and the joystick itself (also in the quick row and at the Helm station); hidden when the boat has none; A / D and J / L keys in Harbour. |
| `anchorPanel.ts` | The Anchor section: the windlass buttons (held to act), the chain counter, the status, the scope check and the alarm; also the Bow station's block and the Helm station's remote. |
| `placePanel.ts` | The Place section: Open water / Marina / Bay, the marina's layout and traffic, the berth arrow box and a status line. |
| `harbourPanel.ts` | The Harbour gear section: fenders, the fender hints, the mooring Lines block (take, tighten, ease, let go), clear the propeller, the bay's bow and shore lines. |
| `damageReport.ts` | The damage alert in the alert stack and the damage list (`damageText`). |
| `alertCentre.ts` | The alert history list with tag chips and filter, the Attention button and the history card. |
| `enginePanel.ts` | The Engine section (Start/Stop, lever slider, tachometer) and the lever at the Helm station. |
| `gybeReport.ts` | The gybe report (boom speed, energy, peak main sheet load) in the alert stack. |
| `statusPanel.ts` | The Status section: Sails, Gear, Damage and What happened (history with tag filter). |
| `instrumentStrip.ts`, `autopilotPanel.ts`, `sailsPanel.ts`, `timeBar.ts` | The instrument strip (cells, badges that open their Learn entry, depth in a place), the Steering and Sails sections, and the time widget (`Time ×1` over the clock; its card has the speeds, the time-lapse row and the clock; the right button is Pause, Resume, Carry on or "Held still"). |
| `clockPanel.ts` | The clock's parts for the time widget: the local time chip and the time card's clock part (date, area, sunrise and sunset, Set, Now, Noon). |
| `exerciseBar.ts` (ui) | The step bar over the bottom of the 3D view while an exercise runs: one row per control the step needs (steppers, autopilot, engine, thrusters, lines, fenders, windlass, Realistic stations, clutches and winches), "All controls", keys, ▶ Show me; sets `--exercise-stack-h` so the chips sit above it. |
| `stepCard.ts` | The one card over the 3D view while an exercise runs: Now you, Step done, mistake, stopped, done, the running step with its fold, the hold ring, the live target rows. |
| `exerciseDemo.ts` | The pilot of Watch and Show me (a closure, never in `AppState`); `app.ts` calls `frame()` before each part of a frame; lets go of held buttons when a demo ends. |
| `exercisePanel.ts`, `exerciseDebrief.ts` | The Exercises section: the list (groups, place lines, Watched marks), the setup card (crew, level, start time, Watch it or Do it myself), the step, mistake, failed and done cards, waypoints; `exerciseDebrief.ts` draws the debrief. |
| `mapView.ts` | The bird's-eye map (`cam=map`) and the mini-map's drawing: buoys, the marina, breakwater and buildings, the seabed, rocks, rings, gust bands and the anchor sign; taps name what they hit; `__sailMap` for the checks. |
| `miniMap.ts` | The mini-map button at the bottom left of the 3D view while Sailing; a tap opens the full map. |
| `spotlight.ts` | The tiny event channel between the Learn buttons and the 3D view, which flies the camera close, darkens the rest and ends on the next tap. |
| `infoCard.ts`, `labels3d.ts`, `debugOverlay.ts`, `errorBoundary.ts` | The part card over the 3D view, 3D labels, the debug overlay, error messages. |

## Tests and scripts

- `tests/*.test.ts` (Vitest): one file per area of the model, the exercises, the sound, the UI's pure parts, the data and the scripts. `physicsTruths*.test.ts` hold the tests named after `PHYSICS_TRUTHS.md` ids (one file per phase). `docs.test.ts` keeps this map, WORKFLOW and the ROADMAP's new decision rows in order. `languages.test.ts` checks every language's strings and the Latin scan.
- Test helpers (not test files): `tests/quotedLabels.ts` (the Russian wording of the labels the glossary quotes), `tests/motionHelpers.ts`, `tests/geometry.ts`, `tests/harbourPilot.ts` (`goodRun`, `runFrom` for the exercise tests).
- `scripts/shots.mjs`: the browser checks and screenshots (options at its top). `scripts/shots-m<N>.mjs`: each milestone's scenes and live checks; the comment at the top of each file says what it checks. `scripts/ui.mjs` (types in `scripts/ui.d.mts`): the helpers the checks use to open the panel, the settings, a section, a tab, the camera and a link, and `exerciseItemTestIds()`, which reads the exercise list from `content/exercises/exercises.json` so no check names the exercises. Checks reach the panel only through these helpers.
- `scripts/exercise-drive.mjs`: drives an exercise run from a check (read it, turn, set the controls, wait for a step) and sets the time scale, so a run that only leads to the state a check looks at goes at ×16 (a scripted pilot at ×4).
- `scripts/budget.mjs`: the `budget` browser check run on every PR: draw calls and triangles in each preset view, both details, Easy and Realistic ropes, against `BUDGET`. `scripts/a11y-audit.mjs`: accessibility audit. `scripts/visual-shots.mjs`: detail-level close-ups. `scripts/compare/`: model against a reference sketch.
- `scripts/review-doc.mjs` (types in `review-doc.d.mts`): `npm run review-doc -- ru` writes the review document for a sailor who reads one language (`docs/review/ru.md` and `docs/review/ru-exercises.md`); `tests/glossary.test.ts` fails when the committed files are out of date. `docs/LANGUAGES.md`: how to add a language.
- `scripts/ci-plan.mjs` (types in `ci-plan.d.mts`, tests in `tests/ciPlan.test.ts`): plans the browser checks of CI (live groups, docs-only PRs, groups by changed path, packing into parts, the matrix); the `plan` job runs its command line.
- `GROUP_ALIASES` in `scripts/ci-plan.mjs` names the milestones whose checks run inside an older group (the groups are listed in `liveGroups` of `shots.mjs`).
- `.github/ci-paths.json`: the changed-file prefixes that run every group or named groups.
- `.github/ci-times.json`: the recorded seconds of every live group, used to pack the parts; a new live group adds a line with its measured time.
- `.github/ci-budget.json`: a reason for each group that is over 120 s and was added after the groups were merged (a test checks it).
- `scripts/pr-body.mjs` (types in `pr-body.d.mts`, tests in `tests/prBody.test.ts`): the PR description rules shared by the hook and `pr-body.yml`: no placeholder for the PR number; a milestone PR (`M<N>: …`) has the template's sections, a link to its own preview and every link of its `docs/WORKFLOW.md` checklist.
- `.github/workflows/` (CI): `ci.yml` (`check`; `plan` chooses the browser parts and reads the PR's title and description from the API at run time; `browser-part` runs each; `browser-checks` sums them up; also started by `nightly.yml` and by hand), `nightly.yml` (the full set every night on `main`; a failure opens or updates the issue *Nightly checks failed*).
- `.github/workflows/` (the rest): `pr-preview.yml`, `deploy.yml` (`main` to `/next/` on every push), `release.yml` (run by the owner with a version: runs the full checks, publishes the root of `gh-pages`, makes the tag, notes and `.zip`), `cleanup-branches.yml`, `strip-attribution.yml` (removes AI footers and session links from PR and issue text), `pr-body.yml` (the PR description check).
- `.claude/skills/`: the owner's commands (`/milestone`, `/plan`, `/review`, `/bug`, `/status`). `.claude/settings.json`, `.claude/hooks/no-attribution.mjs` (blocks commits, PRs and comments with a session link or AI attribution line), `.claude/hooks/pr-body.mjs` (blocks a PR description with a `pr-<N>` placeholder and reminds the session to write the full description after `create_pull_request`).
- `index.html`, `public/`, `vite.config.ts`: the app icon and link-preview picture (`public/icon.svg`, `public/apple-touch-icon.png`, `public/og-image.jpg`), the `siteUrl` plugin that turns `%SITE_URL%` into the site's address, and the build constants `__BUILD_CHANNEL__` / `__BUILD_VERSION__` (see `src/app/buildChannel.ts`).
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `.github/ISSUE_TEMPLATE/` (forms for a bug, a sailing fact, a translation and an idea), `.github/pull_request_template.md` (the PR layout of `CLAUDE.md`).
- `docs/`: `ROADMAP.md`, `WORKFLOW.md` (the owner's guide; the checklists of merged milestones are in `docs/archive/CHECKLISTS.md`, the older decisions in `docs/archive/DECISIONS.md`), `WORKFLOW_REVIEW.md`, `PUBLIC_READINESS.md`, `PHYSICS_TRUTHS.md`, `BOAT_REFERENCE.md`, `BOAT_PROFILE.md` (how to make a boat profile), `EXERCISES.md`, `LANGUAGES.md`, `BETA.md` and `ANNOUNCE.md` (launch texts), `review/` (documents for a sailor's review), `mockups/` (clickable mockups agreed in planning PRs), `reference/`.
- `docs/PHASE<N>_SPEC.md` and `docs/PHASE_<NAME>_SPEC.md`: the spec of each phase and extra milestone group (camera, launch, time widget, step card, audio, the phone exercises). `docs/LAYOUT_ANALYSIS.md`, `BOAT_DETAILS_ANALYSIS.md`, `VISUAL_QUALITY_ANALYSIS.md`, `PHYSICS_ENGINE_ANALYSIS.md`: the studies that preceded a phase, input for a later `/plan`.
