# Code map

Where things are, so a session can go straight to the right file instead of searching. One line per file; the file's own header comment has the details. **Keep it current:** a PR that adds, removes or renames a file, or moves a responsibility, updates this map in the same PR.

## How a frame runs

`src/main.ts` → `app/app.ts` builds the layout, the 3D scene and the panel, then runs the frame loop: each `requestAnimationFrame` dispatches `{ type: 'step', dt }` to the store (`app/store.ts`), which advances the pure model (`model/sim.ts` and the Phase 2 modules, order in PHASE2_SPEC 4.2), then the renderers and panels read the new state. UI code only dispatches actions; it never changes state directly. `app/urlSync.ts` writes the state into the address bar.

Store actions: `step`, `setClock`, `setClockShown`, `setMiniMap` (M28), `setControls`, `select`, `openLearn` (the Learn tab's entry, M20), `reset`, `load` (from a link), `setCameraPreset`, `setDetail`, `setLabels`, `setLegend`, `setDebug`, `setStep`, `setPaused`, `setRopesMode`, `realistic` (Realistic-mode gestures), `setBoatMode` (Held still / Sailing), `autopilot`, `setWindMode`, `newWindPattern`, `setWindSize`, `setTimeBar`, `setTimeScale`, `setSeaSetting`, `repairSails`, `engine` (start, stop, lever).

## `content/` (data, no code)

| File | What |
|---|---|
| `boat/hanse508.json` | All boat geometry, ropes, clutch banks, winches, stations, `physics`, `windModes`, tuning values. No numbers in code. |
| `registry/parts.json` | `schemaVersion` 2 (M20): every id a mesh, rope or control may carry, with language-neutral facts only (kind, `group` for the Learn list from M21, fact status, sources, `controls`, `related`, `showMe`). Names and texts are in the glossaries. |
| `lang/<code>/ui.json` | UI strings of one language, read through `t()` (`ui/i18n.ts`); `en` and `ru` (M23: same keys in the same order, tests list what is missing). |
| `lang/latin-words.json` | M23: the Latin words allowed on a Russian screen (instrument letters, makers, the foreign words that alternative-name notes quote); the boat's label words are allowed too. Used by `tests/languages.test.ts` and the browser Latin scan. |
| `lang/<code>/glossary.json` | The Learn entries of one language (names, other names, one-liner, what it does, on this boat, mistakes, show-me text), by registry id. `en` is the source language; `ru` is an AI draft (names and full text for every id: the M20, M21 and M22 entries). Read through `model/glossary.ts`. |
| `areas/adriatic.json` | A sailing area (position, time zone, fetch per Waves setting, the practice buoys, the default clock), loaded by id (`model/area.ts`). |

## `src/app/` (state and wiring)

| File | What |
|---|---|
| `app.ts` | Builds everything, frame loop, FPS and frame times for the debug overlay. |
| `store.ts` | The single store: `AppState`, all actions, the `step` order. M27: `appMode` and the `setAppMode` action (the invariant: Learn, or the ropes mode). |
| `appMode.ts` | M27: `AppMode` (`learn`, `easy`, `realistic`), the mode chip's choices. |
| `urlState.ts` | URL parameters ↔ state (schema version, defaults, old links). M27: `m=learn`; `learn=` is written only in Learn mode and an old link with `learn=` opens in Learn mode. M28: `mm=0` (mini-map off). |
| `urlSync.ts` | Debounced address-bar updates; Back (`popstate`) loads the link (or reloads the page if the link has another `lang`, M23); `openScene` (Learn's "Show me": pushes the current link, then loads the scene; `sceneSettings` is the pure part that keeps the viewer's own settings, M28 added the mini-map). |
| `buildInfo.ts` | Commit hash and date for Settings → About. |

## `src/model/` (pure: no DOM, no three.js)

| File | What |
|---|---|
| `sim.ts` | Per-frame rig state and `step`: controls → boom, jib, sails, ropes. |
| `boat.ts`, `rigGeometry.ts`, `hullShape.ts`, `deckVolumes.ts` | Boat data and the static geometry derived from it. |
| `controls.ts`, `settings.ts`, `steering.ts`, `wind.ts` | Control targets, settings, wheel/rudder, test-wind helpers. |
| `boomSolver.ts`, `pitchLimits.ts`, `mainsheet.ts`, `mainFurl.ts` | Mainsail and boom: free angle, vang/topping-lift limits, German mainsheet, in-mast furling. |
| `jib.ts` | Self-tacking jib: car, sheet, furling. |
| `sailShape.ts` | Sail surface grids for both sails. |
| `ropePaths.ts`, `ropeLengths.ts` | Where each rope runs (polylines) and the manual's rope lengths. |
| `panelEntries.ts` | What the Ropes tab offers, derived from the boat data. |
| `realistic.ts`, `winch.ts` | Realistic mode: stations, clutches, wraps, self-tailer, handle, gearbox; capstan rule and winch physics. |
| `labels3d.ts`, `registry.ts` | Where 3D labels sit; registry lookups (`partInfo`: name and one-liner from the glossary, words on the boat from `boatLabels.ts`). |
| `boatLabels.ts` | Phase 4 (M20, owner on PR #54): the words printed on the boat for an id, from the clutch labels in the boat file (`boatLabelsFor`). |
| `languages.ts` | Phase 4 (M23): the available languages (`UI_STRINGS` from every `content/lang/*/ui.json`, `LANGUAGES`, `isLanguage`, `languageName`) and `latinAllowed`. |
| `glossary.ts` | Phase 4 (M20): the glossaries by language (`import.meta.glob`), `learnEntry` (registry facts plus text for the Learn tab), `NOT_DRAWN` (ids with no mesh), `sourceLink`; M21: `GROUPS`, `groupEntries`, `normalizeSearch` and `searchGlossary` (search over names, other names and the words on the boat in one language). |
| `angles.ts`, `vec3.ts`, `random.ts` | Shared helpers: angles and units, vectors, seeded random. |
| `apparentWind.ts`, `sailForces.ts`, `hullResistance.ts`, `motion.ts` | Phase 2 sailing: apparent wind, lift/drag, resistance, speed/heading/position. |
| `heel.ts`, `sheetLoads.ts` | Heel and weather helm; sheet loads from the sail forces. |
| `autopilot.ts` | Standby / heading / wind-angle autopilot. |
| `trim.ts` | Trim states (luffing, good, stalled, …), telltales, blanketing, flogging damage. |
| `engine.ts` | Engine: lever → rpm and gear (through neutral), thrust along the bow. |
| `gybe.ts` | Gybes: the boom's swing under the wind's push, impact energy and sheet load, the danger-zone sector to draw. In almost no wind the swing is handed to the normal boom spring (limits in `physics.gybe`). |
| `windModes.ts`, `timeScale.ts` | Steady/gusty/shifty/building/dying wind; time-bar scales, where the speed part shows, and where Pause is replaced by the "Held still" chip. |
| `pointsOfSail.ts`, `mapFrame.ts`, `track.ts` | Map helpers: points of sail, map frame (`mapToBoat`/`boatToMap`, water shift), the track. |
| `waves.ts`, `waveMotion.ts`, `area.ts` | Phase 3 waves: size from wind and fetch, the three wave trains and the surface height; heave, pitch and roll of the boat on them (phases at the boat), and (M15) what the rocking does to the sails (`rigMotion`), the steering (`waveYawDeg`) and the speed (`addedResistanceN`); the area's data. |
| `clock.ts`, `sun.ts` | Phase 3 (M17): the on-board clock (UTC ms; local time, summer time, the `clk` link form, the light's name) and the sun (height and direction, sunrise and sunset). |
| `windOnWater.ts` | Phase 3 (M16): how many white horses a wind makes and which crests are white, the gust profile upwind (what the dark patch shows), and where the practice buoys are relative to the boat. |

## `src/render3d/` (three.js; reads state, never changes it)

| File | What |
|---|---|
| `scene.ts`, `sceneConfig.ts` | Renderer, lights (the sun's from the clock), per-frame update; colours, sizes, camera framing, frame-rate keys (`SCENE.performance`). |
| `cameraRig.ts`, `cameraPresets.ts` | Camera control and the presets (Side, Top, Bow, Helm). The rig frames the boat above the bottom inset (the sheet and the chip row) and below the top inset, clamped by `SCENE.camera.maxBottomInsetShare` / `maxTopInsetShare` / `minFreePx` (M26). |
| `picking.ts` | Tap-to-identify hit testing. |
| `environment.ts`, `world.ts`, `wake.ts`, `wind.ts` | The cloud texture and the water's ripple texture, the world group (steps the water along the map), the wake, wind streaks. |
| `waterSurface.ts` | The water: wave mesh with its grid lines, flat outer water out to the horizon, the tap plane; vertex colours (wind darkening, gust patch, white crests); `heightAt` for the wake and the buoys. |
| `daylight.ts` | The sun's light from the clock: the direction in the boat frame (for the light, and at its true height for the sky) and how strong the sun, the sky light and the night are. |
| `skyDome.ts`, `skyColours.ts` | Phase 3 (M18): the sky as a shader on a sphere round the camera (gradient, clouds fixed over the sea, the sun's glow and disc, stars) and the sky colours for a sun height (`SCENE.skyByElevation`). The same dome, rendered into a small cube map, gives the reflections at High detail. |
| `marks.ts` | The four practice buoys (sphere, pole, X topmark) floating on the drawn water, tappable. |
| `dangerZone.ts` | The red sector the boom sweeps in a gybe, and its faint outline by the lee. |
| `boat/index.ts` | Builds the boat and applies the solved rig each frame. |
| `boat/hull.ts`, `appendages.ts`, `deckGear.ts`, `cockpitHardware.ts`, `rig.ts`, `parts.ts` | Hull, keel/rudder, deck gear, wheels/winches/clutches, mast/boom/stays, part helpers. |
| `boat/sailMesh.ts`, `ropes.ts`, `telltales.ts` | Sails, ropes, telltales and the tear mark. |
| `boat/materials.ts`, `textures.ts` | Materials and procedural textures. |

## `src/ui/` (DOM, no framework; dispatches actions)

| File | What |
|---|---|
| `layout.ts`, `layoutMode.ts`, `dom.ts` | Page layout (stacked / side by side), DOM helper. |
| `sheet.ts`, `sheetGeometry.ts` | M26: on a phone (stacked layout) the panel is a sheet with three heights (peek, half, full), moved by dragging, tapping or keys on its handle; it writes `--sheet-h` and `--view-bottom-inset` on the shell and tells the 3D view how much of the bottom the sheet covers. `sheetGeometry.ts` is the pure part (heights, snapping, thresholds; `SHEET`). |
| `i18n.ts` | Strings (M23): `setLanguage`/`currentLanguage`, `t()`, `part()` (name and one-liner in the current language), `quoted()` (“ ” or « »), `formatThousands`. |
| `panel.ts` | M27: the panel is a list of sections (no tabs): builds the seven sections once, orders and opens them by the mode (`modes.ts`), `showSection`, `openLearnEntry`, shows the selected rope's strip. M25 moved the View tab and the footer to `settingsMenu.ts` and the camera buttons to `cameraChip.ts`. |
| `modes.ts`, `sections.ts` | M27: `modes.ts` (pure) is the table of sections and what each mode does with them (order, open, open in the side layout, second column) and `sectionAvailable`; `sections.ts` is one section: fold header, "?" button for its `.explain` texts. |
| `modeChip.ts`, `quickRow.ts` | M27: the mode chip ("Easy ▾") and its menu in the chip row; the quick row in the sheet's head, shown by CSS at the lowest height (the selected rope's − / + in Easy). |
| `settingsMenu.ts` | M25: the gear in the chip row and the settings dialog it opens (Language, Labels in 3D, Time bar, Clock, Mini-map, Step size, Detail, Share and Reset, legend, Debug overlay, About with the footer); the view and panel are `inert` while it is open. Choosing a language reloads the page (M23). |
| `cameraChip.ts`, `chipMenu.ts` | M25: the chip row `.view-bottom` over the bottom of the 3D view, the camera chip ("Port ▾") and its menu, and (M28) the Close-map chip that returns from the map; `chipMenu.ts` is the menu behaviour shared with the mode chip (`modeChip.ts`) (items, arrow keys, Escape, outside tap, one open at a time). |
| `learnTab.ts` | Phase 4 (M20): the Learn section (a tab until M27; exports `nameOf`): M21's search box and list of every entry in groups (or the search results), and one entry at a time (Back to the list, names, text, Show me, Show on the boat, Try it, See also, how sure we are). |
| `ropesTab.ts`, `ropeControls.ts`, `stepper.ts`, `ropeLegend.ts` | The Ropes section (Easy sliders and the clutch drawing, or the Realistic stations), − / + buttons, the Rope colours section's legend. |
| `clutchDrawing.ts` | The clutch-bank drawing. |
| `realisticPanel.ts`, `stationDrawing.ts`, `mastDrawing.ts`, `handleDrawing.ts` | Realistic mode: stations, gestures, Mast station, winch handle and strain bar. |
| `windPanel.ts`, `windModePanel.ts`, `wavesPanel.ts`, `windIndicator.ts`, `windInstrument.ts` | The Conditions section (wind dial, speed, wind modes, waves, presets), the alert stack over the 3D view (gybe, by the lee, heel, round-up), wind instrument dial. |
| `enginePanel.ts` | The Engine section (Start/Stop, lever slider, tachometer) and the lever at the Helm station. |
| `gybeReport.ts` | The gybe report (boom speed, energy, peak main sheet load) in the alert stack. |
| `instrumentStrip.ts`, `autopilotPanel.ts`, `sailsPanel.ts`, `timeBar.ts` | Instrument strip, the Autopilot and Sails sections, time bar (with the "Held still" chip in place of Pause). |
| `clockPanel.ts` | The clock chip beside the time bar and the card it opens (date, area, sunrise and sunset, light, Now / Noon / Set a time). |
| `mapView.ts` | Bird's-eye map (`cam=map`), with the four buoys. M28: it remembers the view it was opened from (`before()`), and holds the mini-map's drawing (`MINI_MAP`, `miniMapViewport`, `drawMiniMap`). |
| `miniMap.ts` | M28: the mini-map button in the corner of the 3D view while Sailing (north up, boat in the middle, true-wind arrow, "N", track, buoys); a tap opens the full map. Shown or hidden by one rule (setting, Sailing, not on the map, sheet not full). |
| `infoCard.ts`, `labels3d.ts`, `debugOverlay.ts`, `errorBoundary.ts` | Part card (over the 3D view in both layouts, above the chip row on a phone), 3D labels, debug overlay, error messages. |

## Tests and scripts

- `tests/*.test.ts` (Vitest): one file per model area; `physicsTruths.test.ts` (Phase 1 rules) and `physicsTruths2.test.ts` (Phase 2 rules) and `physicsTruths3.test.ts` (Phase 3 rules) hold the tests named after PT ids; `languages.test.ts` (M23: every language's strings, the Latin scan, the checked Russian names) and `quotedLabels.ts` (the Russian wording of the labels the glossary quotes), `motionHelpers.ts` and `geometry.ts` are shared helpers.
- `scripts/review-doc.mjs` (and `review-doc.d.mts`, so tests can import it): M24's review document for a sailor who reads one language (`npm run review-doc -- ru` writes `docs/review/ru.md`; the wording of each language is a table inside it; `tests/glossary.test.ts` fails when the committed file is out of date). `docs/LANGUAGES.md`: how to add a language.
- `scripts/ui.mjs`: the helpers for the browser checks (`showSection`, `openSettings`, `setCamera`, `viewBottom`, `waitForLink`, and from M26 `setSheet`, `dragHandle`): checks open the panel, the settings and the camera only through them; `scripts/shots.mjs`: browser checks and screenshots (options at its top); `scripts/shots-m<N>.mjs`: each milestone's scenes and live checks (`shots-m24.mjs`: all 131 Learn entries and 60 Show me buttons, in English and Russian); `scripts/a11y-audit.mjs`: accessibility audit; `scripts/visual-shots.mjs`: detail-level close-ups; `scripts/compare/`: model vs reference sketch.
- `.github/workflows/`: `ci.yml` (`check`, `browser-checks`), `pr-preview.yml`, `deploy.yml`, `cleanup-branches.yml`, `strip-attribution.yml` (removes "Generated by Claude Code" footers and session links from PR and issue text after posting).
- `.claude/skills/`: the owner's commands (`/milestone`, `/plan`, `/review`, `/bug`).
