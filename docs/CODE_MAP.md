# Code map

Where things are, so a session can go straight to the right file instead of searching. One line per file; the file's own header comment has the details. **Keep it current:** a PR that adds, removes or renames a file, or moves a responsibility, updates this map in the same PR.

## How a frame runs

`src/main.ts` → `app/app.ts` builds the layout, the 3D scene and the panel, then runs the frame loop: each `requestAnimationFrame` dispatches `{ type: 'step', dt }` to the store (`app/store.ts`), which advances the pure model (`model/sim.ts` and the Phase 2 modules, order in PHASE2_SPEC 4.2), then the renderers and panels read the new state. UI code only dispatches actions; it never changes state directly. `app/urlSync.ts` writes the state into the address bar.

Store actions: `step`, `setClock`, `setClockShown`, `setControls`, `select`, `reset`, `load` (from a link), `setCameraPreset`, `setDetail`, `setLabels`, `setLegend`, `setDebug`, `setStep`, `setPaused`, `setRopesMode`, `realistic` (Realistic-mode gestures), `setBoatMode` (Held still / Sailing), `autopilot`, `setWindMode`, `newWindPattern`, `setWindSize`, `setTimeBar`, `setTimeScale`, `setSeaSetting`, `repairSails`, `engine` (start, stop, lever).

## `content/` (data, no code)

| File | What |
|---|---|
| `boat/hanse508.json` | All boat geometry, ropes, clutch banks, winches, stations, `physics`, `windModes`, tuning values. No numbers in code. |
| `registry/parts.json` | Every id a mesh, rope or control may carry, with EN/RU names and review status. |
| `i18n/en.json` | UI strings, read through `t()` (`ui/i18n.ts`). |
| `areas/adriatic.json` | A sailing area (position, time zone, fetch per Waves setting, the practice buoys, the default clock), loaded by id (`model/area.ts`). |

## `src/app/` (state and wiring)

| File | What |
|---|---|
| `app.ts` | Builds everything, frame loop, FPS and frame times for the debug overlay. |
| `store.ts` | The single store: `AppState`, all actions, the `step` order. |
| `urlState.ts` | URL parameters ↔ state (schema version, defaults, old links). |
| `urlSync.ts` | Debounced address-bar updates. |
| `buildInfo.ts` | Commit hash and date for the footer. |

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
| `labels3d.ts`, `registry.ts` | Where 3D labels sit; registry lookups. |
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
| `scene.ts`, `sceneConfig.ts` | Renderer, lights (the sun's from the clock), per-frame update; colours, sizes, camera framing. |
| `cameraRig.ts`, `cameraPresets.ts` | Camera control and the presets (Side, Top, Bow, Helm). |
| `picking.ts` | Tap-to-identify hit testing. |
| `environment.ts`, `world.ts`, `wake.ts`, `wind.ts` | Sky and the ripple texture, the world group (steps the water along the map), the wake, wind streaks. |
| `waterSurface.ts` | The water: wave mesh with its grid lines, flat outer water out to the horizon, the tap plane; vertex colours (wind darkening, gust patch, white crests); `heightAt` for the wake and the buoys. |
| `daylight.ts` | The sun's light from the clock: the direction in the boat frame and how strong the sun, the sky light and the night are. |
| `sunDisc.ts` | The sun as a soft disc in the sky at its real direction (until M18's sky dome replaces it). |
| `marks.ts` | The four practice buoys (sphere, pole, X topmark) floating on the drawn water, tappable. |
| `dangerZone.ts` | The red sector the boom sweeps in a gybe, and its faint outline by the lee. |
| `boat/index.ts` | Builds the boat and applies the solved rig each frame. |
| `boat/hull.ts`, `appendages.ts`, `deckGear.ts`, `cockpitHardware.ts`, `rig.ts`, `parts.ts` | Hull, keel/rudder, deck gear, wheels/winches/clutches, mast/boom/stays, part helpers. |
| `boat/sailMesh.ts`, `ropes.ts`, `telltales.ts` | Sails, ropes, telltales and the tear mark. |
| `boat/materials.ts`, `textures.ts` | Materials and procedural textures. |

## `src/ui/` (DOM, no framework; dispatches actions)

| File | What |
|---|---|
| `layout.ts`, `layoutMode.ts`, `dom.ts`, `i18n.ts` | Page layout (stacked / side by side), DOM helper, strings. |
| `panel.ts` | The three tabs (Ropes, Wind, View) and the footer. |
| `ropesTab.ts`, `ropeControls.ts`, `stepper.ts`, `ropeLegend.ts` | Easy mode: rope sliders, − / + buttons, colour legend. |
| `clutchDrawing.ts` | The clutch-bank drawing. |
| `realisticPanel.ts`, `stationDrawing.ts`, `mastDrawing.ts`, `handleDrawing.ts` | Realistic mode: stations, gestures, Mast station, winch handle and strain bar. |
| `windPanel.ts`, `windModePanel.ts`, `wavesPanel.ts`, `windIndicator.ts`, `windInstrument.ts` | Wind tab, wind modes, the alert stack over the 3D view (gybe, by the lee, heel, round-up), wind instrument dial. |
| `enginePanel.ts` | Engine block of the Ropes tab (Start/Stop, lever slider, tachometer) and the lever at the Helm station. |
| `gybeReport.ts` | The gybe report (boom speed, energy, peak main sheet load) in the alert stack. |
| `instrumentStrip.ts`, `autopilotPanel.ts`, `sailsPanel.ts`, `timeBar.ts` | Instrument strip, autopilot, Sails block, time bar (with the "Held still" chip in place of Pause). |
| `clockPanel.ts` | The clock chip beside the time bar and the card it opens (date, area, sunrise and sunset, light, Now / Noon / Set a time). |
| `mapView.ts` | Bird's-eye map (`cam=map`), with the four buoys. |
| `cameraBar.ts`, `infoCard.ts`, `labels3d.ts`, `debugOverlay.ts`, `errorBoundary.ts` | Camera buttons, part card, 3D labels, debug overlay, error messages. |

## Tests and scripts

- `tests/*.test.ts` (Vitest): one file per model area; `physicsTruths.test.ts` (Phase 1 rules) and `physicsTruths2.test.ts` (Phase 2 rules) and `physicsTruths3.test.ts` (Phase 3 rules) hold the tests named after PT ids; `motionHelpers.ts` and `geometry.ts` are shared helpers.
- `scripts/shots.mjs`: browser checks and screenshots (options at its top); `scripts/shots-m<N>.mjs`: each milestone's scenes and live checks; `scripts/a11y-audit.mjs`: accessibility audit; `scripts/visual-shots.mjs`: detail-level close-ups; `scripts/compare/`: model vs reference sketch.
- `.github/workflows/`: `ci.yml` (`check`, `browser-checks`), `pr-preview.yml`, `deploy.yml`, `cleanup-branches.yml`, `strip-attribution.yml` (removes "Generated by Claude Code" footers and session links from PR and issue text after posting).
- `.claude/skills/`: the owner's commands (`/milestone`, `/plan`, `/review`, `/bug`).
