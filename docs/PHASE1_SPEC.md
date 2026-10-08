# Phase 1 specification: interactive boat and rope controls

Status: approved for implementation · Last updated: 2026-10-08 (M2 decisions in 7.1, 8.1, 8.3, 8.6, 8.7, 11; M2 follow-ups in 8.2, 8.3; M3 decisions in 8.5)

Read [`ROADMAP.md`](ROADMAP.md) first for the overall picture, then this file. Boat facts live in [`BOAT_REFERENCE.md`](BOAT_REFERENCE.md) and [`content/boat/hanse508.json`](../content/boat/hanse508.json). Behaviour rules that must hold are listed in [`PHYSICS_TRUTHS.md`](PHYSICS_TRUTHS.md).

## 1. Goal

A browser app showing a simplified 3D Hanse 508. The user moves the real controls (sheets, vang, topping lift, furling lines, wheel) as continuous values and **sees the boom, sails and ropes respond** to a test wind they can rotate by hand.

The single idea Phase 1 must teach:

> **Ropes limit, wind pushes.** A sheet never pushes a sail out; easing it only *allows* the wind to push the sail further. When the sheet is longer than needed, it hangs slack and the sail flaps.

Everything else in Phase 1 serves that idea or prepares the ground for later phases.

## 2. Users and devices

- One learner with **zero sailing knowledge**, using a phone most of the time.
- Must work on:
  - **Portrait phones** (e.g. 390×844 CSS px). Primary target.
  - **Near-square foldables**, inner screen (e.g. ~720×830 and ~880×830 CSS px).
  - **Desktop / laptop** browsers (e.g. 1440×900).
- Touch first, mouse and keyboard as a bonus. Recent Chrome (Android) and Safari (iOS), plus desktop Chrome/Firefox/Safari.

## 3. Scope

### In scope (Phase 1)

1. Simplified 3D model of the Hanse 508 built in code from `hanse508.json` (no downloaded models).
2. Orbit camera with presets.
3. Test wind: direction and speed set by hand. The boat does **not** move.
4. Rig solver for the boom (swing + pitch) and the self-tacking jib.
5. Mainsail and jib furling (unfurled %).
6. Ropes drawn in 3D, straight when taut and sagging when slack.
7. Cockpit / rope panel modelled on the real clutch banks, kept separate from the 3D view.
8. Continuous controls 0–100 % with a selectable step of 1 % or 5 %.
9. Tap-to-identify: tap a part or rope and see its name, boat label and a one-line explanation (English).
10. State shared through the URL; debug overlay; build version shown in the UI.
11. CI with tests; automatic deploy to GitHub Pages.

### Out of scope (do not build yet)

Boat motion, speed, heel, apparent wind, forces in kN, gybe energy, the bird's-eye 2D view, water shading beyond a simple plane, waves, environment (buoys, harbour), engine and prop walk, compass and instruments, the learning layer beyond the one-line tooltip, Russian UI, exercises, clutch open/close logic and winch handling, gennaker/reacher, sound, accounts, backend, analytics.

If something here looks necessary to finish a milestone, stop and ask in the PR instead of building it.

## 4. Conventions (must not change without updating the docs)

| Topic | Convention |
|---|---|
| Units | Metres, seconds, degrees in data and UI; radians only inside maths code. Wind speed in knots. |
| Boat frame | Origin at the mast station, on the waterline, on the centreline. **x forward, y up, z starboard.** Right-handed, same as three.js. |
| Test wind direction (`windFrom`) | Where the wind comes **from**, relative to the bow. 0 = from dead ahead, +90 = from starboard beam, ±180 = from dead astern, −90 = from port beam. |
| Boom angle θ | Horizontal angle of the boom from the aft-pointing centreline. **+ = boom to starboard.** Wind from starboard pushes the boom to port (θ < 0). |
| Boom pitch ψ | + = boom end up. |
| Rope controls | `0 %` = fully hauled in (or fully furled). `100 %` = fully eased (or fully unfurled). Shown as "% eased" or "% unfurled". |
| IDs | Every mesh and rope carries an id from `content/registry/parts.json` (`mesh.userData.partId`). Controls do **not** get their own registry entries: a rope control's `data-part-id` is its rope's id (e.g. `ctl_vang` → `rope_vang`). Ids for controls without a rope (wheel, test wind) are proposed in M2. Never invent ids in code; add them to the registry first. |
| Text | All UI strings through `t('key')` from a strings file (`content/i18n/en.json`). Part names come from the registry by language code. Phase 1 ships English only. |

## 5. Layout

### 5.1 Two layout modes

| Mode | When | Arrangement |
|---|---|---|
| **Stacked** | viewport width < 700 CSS px **or** width / height < 0.8 | 3D view on top (about 52 % of the height, min 260 px). Panel below, scrolls inside itself. |
| **Side by side** | width ≥ 700 **and** width / height ≥ 0.8 | 3D view left (fills the remaining width). Panel right, 320–440 px wide, scrolls inside itself. |

- Switch live on resize, rotation and fold/unfold. No reload.
- Use `dvh`/`svh` units and safe-area insets. The page itself never scrolls in side-by-side mode.
- Touch targets ≥ 44×44 px. Font ≥ 15 px for labels, ≥ 13 px for secondary text.
- `touch-action: none` on the canvas so orbit gestures do not scroll or zoom the page.

### 5.2 Regions

1. **3D view** with a small overlay: camera preset buttons, a compact wind indicator (arrow + "from 60° stbd, 12 kn"), and an info card when something is tapped. In the stacked layout the info card is a compact strip at the top of the panel instead, so it never covers the boat; side by side it is a small, closable card over the 3D view.
2. **Panel** with three tabs:
   - **Ropes** (default): the clutch-bank view and the control strip (see 7).
   - **Wind**: the wind dial and speed slider, plus the five wind presets (see 6.3).
   - **View**: camera presets, toggles (show labels in 3D, rope colour legend, debug overlay), step size (1 % / 5 %), Share link, Reset all.
3. **Footer line** inside the panel: build version (short commit hash + build date) and a link to the GitHub repo.

## 6. 3D scene

### 6.1 Model

Build everything from primitives and simple extrusions using `hanse508.json`. Low-poly but **correct proportions and positions** matter more than looks.

| Item | Build hint |
|---|---|
| Hull | Loft between plan outline (`deckEdgeHalfBeam`), sheer height and a fair canoe-body bottom. A smooth closed shape. Anti-fouling grey below the waterline is optional. |
| Deck, coachroof, cockpit well | Simple extrusions. Cockpit sole at `cockpit.soleY`. |
| Keel, rudder, saildrive | Simple solids. Rudder rotates with `ctl_rudder`. |
| Mast | Box or rounded box, `sectionForeAft × sectionAthwart`, from `footY` to `topY`. |
| Spreaders, shrouds, forestay, backstay | Thin cylinders/lines. Static. |
| Boom | Box, pivoting at the gooseneck with angles θ (swing) and ψ (pitch). Three mainsheet blocks under the middle; outhaul lines along the top. |
| Rigid vang | Two telescoping tubes from the mast foot to the boom (`rig.vang`), shortening/lengthening as the boom pitches, with the vang tackle alongside. Registry id `part_vang_strut` (strut) and `rope_vang` (tackle). |
| Self-tacking track and car | **Straight** bar across the deck just in front of the mast, and a small box car that slides along it. |
| Wheels | Two torus rings with spokes on pedestals. Rotate with the rudder (lock to lock = `wheelTurnsLockToLock`). |
| Winches, clutch banks, deck blocks, furling drums, gearbox, mast-foot turning blocks, sprayhood | Small primitives at the given positions. Render only winches with `present !== false` (one per side). |
| Masthead wind indicator | Small arrow at the masthead pointing into the test wind. |
| Water | A large flat plane at y = 0, semi-transparent so the keel stays visible. A subtle grid helps judge scale. |
| Wind | Light streaks or particles moving across the scene in the test wind direction, speed scaled to wind speed. Must not hide the boat. |

### 6.2 Camera

- Orbit around a target near the boom (mouse drag, one-finger drag), zoom (wheel, pinch), pan (right drag, two-finger drag). Damped.
- Presets with a smooth 0.5 s transition: **Side (port)**, **Side (starboard)**, **Top**, **Bow**, **Helm** (standing eye height behind the port wheel, looking forward and slightly down, with the wheel, winch and clutch bank in the foreground), **Free**.
- **Top** shows the bow pointing up in the stacked (portrait) layout and pointing right in the side-by-side layout.
- Clamp so the camera never goes under the water plane or inside the hull.

### 6.3 Wind presets (for testing and screenshots, not lessons)

| Preset | windFrom | Speed |
|---|---|---|
| Head to wind | 0 | 12 kn |
| Wind 45° starboard | +45 | 12 kn |
| Beam, starboard | +90 | 12 kn |
| Broad, starboard | +135 | 12 kn |
| Run | 175 | 12 kn |

## 7. Ropes and controls

### 7.1 Controls

From `hanse508.json → controls.list`. Each rope control:

- Slider plus `−` / `+` steppers. Press-and-hold on a stepper repeats (accelerating).
- Values snap to the global step (1 % or 5 %, default 5 %). Keyboard arrows move by the step when focused.
- Shows the value ("35 % eased"), the rope's **paid-out length in metres** relative to fully hauled (never more than the rope's total length from `runningRigging`), and a state chip: **taut**, **slack**, or **fighting** (see 8.3, step 4).
- The model does not jump to the new value. The rope length approaches the target with a first-order lag (`visual.controlResponseTimeS`), so the user sees the boom move.

Wheel control: −35° … +35° rudder, slider plus steppers (step 1° or 5° following the same global setting).

Test wind: a draggable dial (compass ring with the boat outline in the middle and an arrow showing where the wind comes from) plus `−` / `+` buttons, and a speed slider 0–30 kn. Show the Beaufort number next to the speed.

### 7.2 Cockpit / clutch-bank view (the "Ropes" tab)

A 2D SVG drawing that looks like the real clutch banks in [`docs/reference/photos/`](reference/photos):

- **Bank B** (port, left as you face forward): SPI HALYARD · Boom lift · Main outhaul · MAIN SHEET · Vang
- **Bank A** (starboard, right): Main sheet · Main furling · Main furling · Main halyard · Genoa sheet
- **JIB ROLL** single clutch on the port side deck, shown separately.

Draw port on the left and starboard on the right, as seen from the helm looking forward.

Each clutch shows the **label exactly as written on the boat** and, smaller, our canonical name (e.g. "Genoa sheet → jib sheet"). Tapping a clutch selects that rope:

- The control strip for that rope appears under the drawing (sticky in stacked mode).
- The rope is highlighted in 3D and the camera does **not** move by itself.
- Ropes that share a control (both main-sheet clutches; the two furling clutches; outhaul with main furling) highlight together. Show the hint "one rope, two ends" or "these work against each other" where it applies.
- Static ropes (main halyard, SPI halyard) open an info line instead of a control ("stays hoisted with in-mast furling", "gennaker not rigged").

Below the banks, a compact list of all controls as a fallback, so every control is reachable without the drawing.

Tapping a rope in 3D selects the same rope in the panel, and vice versa.

### 7.3 Rope colours (teaching colours)

One colour per function, used identically in 3D, the panel and the legend: mainsheet, jib sheet, control lines (vang, topping lift), furling lines plus outhaul, halyards. Choose colours with good contrast on both the water and the white deck, and distinguishable for common colour blindness (pair colour with a dash pattern or label in the panel).

## 8. Rig model (pure TypeScript, no three.js)

The model is a **quasi-static teaching approximation**. Each frame it moves the rig towards an equilibrium that respects the ropes. No forces in Newtons in Phase 1. Every tuning constant lives in `hanse508.json → visual` or `rig.boom.pitch`, never as a magic number in code.

### 8.1 Free angle (where the wind wants the sail)

Without any rope the boom would weathervane and point downwind:

`θ_free = −windFrom`, clamped to `±boom.maxSwingDeg`.

At wind from near dead astern this is ambiguous. Use **hysteresis**: the boom stays on its current side until the wind comes `visual.gybeHysteresisDeg` or more from the other side (sailing "by the lee"; with 15° the boom crosses at exactly −165° when the wind goes 170 → 180 → −170 → −165), then swings across to the other side. Animate the swing and flash a short "GYBE" label. Phase 2 will add the energy of that swing.

The "GYBE" label and the fast swing are only for a crossing with the wind from behind (`|windFrom| > 90°` at the moment the boom changes sides). When the wind crosses the bow the boom changes sides at the normal speed and a quieter "Tack" label shows instead.

The jib's free direction is the same: its chord wants to point downwind. Its side follows the sign of `windFrom` (the car crosses when the wind crosses the bow); within the gybe hysteresis band near dead astern it stays on the same side as the boom.

### 8.2 Mainsheet geometry (German mainsheet)

Boom attachment point for swing θ and pitch ψ:

`B(θ, ψ) = gooseneck + boomDistance · (−cos ψ · cos θ, sin ψ, cos ψ · sin θ)`

Deck blocks `D_port = (x, y, −halfZ)`, `D_stbd = (x, y, +halfZ)`.

Geometric sheet length: `L(θ, ψ) = |B − D_port| + |B − D_stbd|`.

`L` grows with |θ| and with ψ. Prove it with a unit test (sweep), and invert numerically (bisection), not analytically.

Control mapping for `ctl_mainsheet = e %`:

- `L_min = L(0, ψ_lowest)` where `ψ_lowest = min(max(toppingLiftEasedDeg, vang.strutStopDeg), vangHauledDeg)`. This is the boom on the centreline at its lowest (topping lift eased, boom on the vang strut's stop).
- `L_max = L(maxSwingDeg, vangEasedDeg)`. Full ease always allows full swing.
- `L_avail = L_min + e/100 · (L_max − L_min)`.
- Rope paid out from fully hauled = `partsPerSide · (L_avail − L_min)` (about 10 m at 100 % with the current data).

### 8.3 Boom solve (each frame)

1. **Targets.**
   - Free swing `θ_free` from 8.1.
   - Pitch target `ψ_t = gravityDropDeg + fill · windLiftMaxDeg · min(1, speed / windLiftReferenceKn)`. This is a teaching approximation: the loaded sail lifts the boom against gravity; with no wind the rigid vang's spring keeps the boom from drooping more than `gravityDropDeg`. The `fill` here is an estimate that breaks the loop (fill depends on θ, θ on ψ): the fill the main would have with the boom at its **lowest allowed pitch** (the topping-lift limit), where the sheet lets it swing furthest: `fill_lift = fill(|windFrom| − min(|θ_free|, θ_max(lower)))`; 0 below 1 kn, 1 by the lee. (Decided in M2: using the previous frame's fill made the loop bistable near close-hauled, so a 1 % sheet change could move the boom 8–10°.)
   - Wind below 1 kn: no swing target (the boom keeps its current θ), `fill` = 0.
   - **Mainsail out** (`ctl_main_furl`, fraction f): the wind's lift in `ψ_t` and its swing push (the `(|θ_free| − θ)²` term of the cost in step 3) are multiplied by f. Below `visual.solver.furledBelowPct` there is no sail: treat it exactly like no wind (the boom keeps its θ, rests on its stop, the sheet goes slack; PT-14). The panel says "furled".
2. **Hard limits on pitch.**
   - Lower: `max(topping-lift limit, rig.vang.strutStopDeg)`. The topping-lift limit is interpolated `toppingLiftHauledDeg` (0 %) → `toppingLiftEasedDeg` (100 %, −6°). The rigid vang strut stops the boom at about 2° down, so a topping lift eased below that hangs slack with spare rope (measured to its own limit) and is drawn sagging, while the strut carries the boom. (Decided after M2.)
   - Upper: vang, interpolated `vangHauledDeg` (0 %) → `vangEasedDeg` (100 %).
   - If lower > upper, the vang and topping lift are **fighting**: set ψ to the midpoint, θ to what the sheet allows at that ψ, and mark both ropes *fighting*.
3. **Find the pose closest to the targets that the mainsheet allows.**
   - For ψ from `lower` to `min(upper, max(lower, ψ_t))` in 0.25° steps:
     - skip ψ if even `L(0, ψ) > L_avail`;
     - otherwise `θ_max(ψ)` = largest θ with `L(θ, ψ) ≤ L_avail` (bisection), `θ = min(|θ_free|, θ_max)`;
     - cost = `f · (|θ_free| − θ)² + pitchStiffness · (ψ_t − ψ)²` (f = mainsail out, 1 when fully out).
   - Take the lowest cost and put θ on the free side (the side from 8.1, including the gybe hysteresis).
   - If no ψ is feasible, the sheet is pulling the boom lower than the topping lift allows: θ = 0, ψ = lower, mark mainsheet and topping lift *fighting*.
   - This was prototyped with the current data: it is smooth across sheet and wind sweeps; at 20 kn on a beam reach the vang changes boom pitch by about 1° at 5 % sheet but about 10–14° at 40–70 % sheet (PT-07, PT-08). Keep it that way when tuning.
4. **Rope states.**
   - Mainsheet **taut** when it constrains the boom (`|θ_free| − |θ| > 0.5°` or `ψ < ψ_t − 0.5°`) **and** has no spare rope (`L_avail − L(θ, ψ)` below `visual.solver.tautToleranceM`). Otherwise **slack**, with spare rope at the clutch = `partsPerSide · (L_avail − L(θ, ψ))`, the same factor as "paid out" (can be 0 m, e.g. head to wind with the sheet hauled in). So a sheet hanging loose while the vang holds the boom down is never called taut.
   - Vang **taut** when ψ is at its upper limit and `ψ_t` is above it. Its spare rope is the strut's spare extension times `vang.tacklePurchase` (the factor of "paid out").
   - Topping lift **taut** when ψ is at its lower limit, something pulls the boom down (gravity or the sheet), and the lift is hauled above the strut's stop. Otherwise **slack**, with spare rope = its length at its own limit minus its length at ψ.
5. **Smoothing.** Move the displayed θ and ψ towards the solved values with a critically damped spring (time constant about 0.3 s), so changes are visible but quick. A gybe swing uses its own faster spring.

### 8.4 Angle of attack, fill and luffing

- `AoA = |windFrom| − |θ|`, using the **unclamped** wind angle (so on a run with the boom at its 72° stop the sail is filled, not luffing). It is the angle by which the sheet holds the sail in from pure weathervaning. Clamp it at ≥ 0.
- **By the lee** (wind on the same side as the boom, inside the gybe hysteresis band): treat the main as filled from behind (`fill = 1`) and show a small "by the lee: gybe risk" label.
- `fill = smoothstep(luffAoaDeg.fullyLuffing, luffAoaDeg.fullyFilled, AoA)`.
- `fill ≈ 0` means the sail **luffs**: animate flapping that starts at the luff and grows with wind speed.
- `fill = 1` means the sail is **filled**: a smooth camber towards leeward.
- Phase 1 does **not** judge "too tight" or "stalled". That needs sourced trim rules and comes in Phase 2.

### 8.5 Self-tacking jib

- The jib is a rigid triangle hinged on its luff (tack → head, along the forestay). The clew can only rotate around the luff axis by an angle φ. Get the φ = 0 clew (on the centreline) by rotating `clewTrimmedRef` around the luff axis until z = 0; side lengths then stay as in `jib.lengths`.
- When the jib is partly furled, the clew sits at fraction f along the foot from the tack, and the leech shortens accordingly.
- The **car** sits on the straight track at the point nearest the clew's plan position, clamped to the track ends. It is always on the leeward side, which is what makes it self-tacking.
- The jib sheet working length is the distance clew → car (the sheet block on the car, `selfTackingTrack.sheetBlockHeight` above the track). Control mapping: `ℓ_avail = ℓ_geoMin + e/100 · maxEaseBeyondMin`, where `ℓ_geoMin` is computed once at startup as the shortest clew–car distance over the allowed rotation range (the rotation at which the chord heading reaches `boom.maxSwingDeg`; with the current data 0.35 m, with the jib centred). The sheet has a 2:1 purchase (`sheet.purchase`), so rope paid out at the clutch = `purchase · (ℓ_avail − ℓ_geoMin)`.
- Solve: on the free (leeward) side, find the largest φ such that the chord heading does not exceed |θ_free| and `distance(clew(φ), car(clew)) ≤ ℓ_avail`. Use bisection.
- Chord heading `h` = horizontal angle of tack → clew from the aft centreline. Jib `AoA = |windFrom| − h`; fill and luffing work as for the main. (Wind shadow from the main on a run is Phase 2.)
- Jib twist (visual): extra top twist grows with how far the clew has swung beyond the track end (`visual.jibTwistPerDegEasedBeyondTrack`). This shows that an eased self-tacker opens at the top rather than swinging far out.
- **Furling interaction:** furling moves the clew forward, which needs a longer jib sheet. If `ℓ_avail` is too short for the requested furl, the furl stops where the sheet allows (the clew as far forward as it reaches with the jib centred). The jib-furl control then shows the message "Ease the jib sheet fully (100 %) to furl further".
- **100 % = sheet released** (decided after M3): at `sheet.releasedAtPct` (100 %) the sheet counts as released for furling: `ℓ_avail = max(ℓ_geoMin + maxEaseBeyondMin, span(φ = 0, f))`, where `span(0, f)` is the clew–car length the furl needs. The jib then furls completely, with no block. A fully unfurled jib never needs more than the sailing length, so sailing (PT-11) is unchanged; the extra length only exists while the jib is partly furled (below about 71 %, where it holds the jib on the centreline). The release follows the control's setting, not the lagged rope. Below 100 % the furl stops as above.
- A jib furled further than the current sheet allows (furled with the sheet released, then the sheet hauled) stays furled: the furling line holds it, and the jib sheet shows **fighting**.

### 8.6 Mainsail

- Luff on the mast's aft face from the tack (`gooseneck + tackHeightAboveBoom`) to `headY`. The foot runs along the boom to the clew at `f · footLength` (f = unfurled fraction).
- Mesh: a grid between the luff and the leech, at least 12 rows × 6 columns. For each row, rotate by twist that grows from 0 at the foot to `twist` at the head, where `twist = baseTwistDeg + twistPerDegBoomRise · max(0, ψ)`.
- Camber offset towards leeward scales with `fill`. When luffing, add a time-varying ripple near the luff.
- Leeward for the camber and the twist is the side away from the **wind** (`−sign(windFrom)`), not the boom's side: by the lee and while the boom swings across in a gybe, the sail still curves away from the wind. Wind dead ahead or astern: the boom's side.
- **Furling couples three rope ends:** the furling line has two tails (one rolls the sail in, one rolls it out) plus the outhaul. When `ctl_main_furl` goes up (more sail out), the "out" tail and the outhaul are hauled in while the "in" tail pays out; the reverse when furling. Show all three lengths in the panel.

### 8.7 Rope rendering

- Each rope has a path from data: fixed points plus moving points (boom blocks, clew, car, boom end).
- The main sheet is drawn with `mainsheet.partsPerSide` parts from each deck block to the boom blocks (`2 · partsPerSide − 1` blocks, the middle one shared); its spare rope is shared equally by all parts.
- Only the **working segment** can sag. The other segments are straight.
- Sag: for chord length d and slack s, use a parabola with mid-sag `f = sqrt(3·d·s/8)`, capped at `visual.ropeMaxSagM` (1.5 m). Direction: gravity **at right angles to the rope** (the part of "down" across the rope; the same as straight down for a level rope, and still visible on a steep one such as a mainsheet part). A vertical rope sags aft. A sagging rope never hangs below the deck under it.
- The visual radius is `visual.ropeRenderRadius` (thicker than real so ropes are visible on a phone), but a rope is never drawn thinner than `SCENE.ropes.minScreenWidthPx` (about 2.5 CSS px) on screen: far from the camera the tube gets wider, close up the data radius is used.
- Updating geometry every frame is fine for about 10 ropes. Reuse buffers instead of creating new objects every frame.

## 9. State, URL and architecture

### 9.1 Module boundaries

```
src/
  model/        pure TS, no DOM, no three.js: types, data loading, rig solver, rope lengths, step(state, dt)
  render3d/     three.js: scene, boat builder, sails, ropes, camera, picking
  ui/           DOM/SVG: layout, panel, clutch banks, controls, wind dial, info card, debug overlay
  app/          wiring: store, main loop, URL sync, build info
content/        data (JSON) imported at build time
```

- `model/` must never import from `render3d/` or `ui/`. Enforce it with a lint rule or a test.
- One store holds `controls` (targets), `rig` (solved state), `selection`, `camera`, `settings`. UI dispatches actions; renderers read state.
- `step(state, dt)` must already accept a boat velocity and heading, both zero in Phase 1, so Phase 2 adds dynamics without changing the interface.
- Optional sails (gennaker) are data-driven: `sails.gennaker.enabled = false` means nothing is built. Do not hard-code the sail list.

### 9.2 URL state

- Readable query parameters, updated with `history.replaceState` (debounced 300 ms). Example: `?ms=35&js=40&vg=50&tl=20&mf=100&jf=100&rd=0&wd=60&ws=12&cam=side-port&sel=rope_vang&step=5`.
- Camera: only the preset is stored, `cam=side-port|side-starboard|top|bow|helm|free`. Dragging the view switches to `cam=free`. A link with `cam=free` opens the default view: the free camera position is not stored.
- Opening such a URL reproduces the view exactly. A **Share / copy link** button in the View tab copies it.
- Unknown or out-of-range values fall back to defaults silently.
- Add `v=1` for future migrations.

### 9.3 Debug overlay (toggle, off by default; `?debug=1` turns it on)

Shows FPS, layout mode, viewport size and aspect, device pixel ratio, θ/ψ/φ, θ_free, AoA and fill per sail, each rope's state with slack in metres, and the build hash.

## 10. Quality and performance

- Target ≥ 50 fps on a mid-range phone, never below 30 during interaction. Cap device pixel ratio at 2. No real-time shadows in Phase 1. Keep draw calls low (merge static meshes).
- First load under 1.5 MB compressed, excluding three.js; fine to be a bit over if justified.
- No console errors. TypeScript `strict`. ESLint clean.
- Accessibility: every control has an accessible name and keyboard access. Colour is never the only signal.

## 11. Testing

| Kind | What |
|---|---|
| Unit (Vitest) | Every Phase 1 rule in `PHYSICS_TRUTHS.md` marked `Phase 1` gets at least one test named after its id (e.g. `PT-01 ...`). Plus: mirror symmetry (windFrom → −windFrom gives θ → −θ), monotonic sheet length, continuity (a 1 % control change never moves θ by more than 5°, except a gybe and the first 1 % of mainsheet from fully hauled: by the sheet geometry alone (PT-06) that step gives about 5.5°, and is checked by its own test), no NaN anywhere across a sweep of all wind directions × control values. |
| Data | A test loads `hanse508.json` and `parts.json` and checks that every referenced id exists, that every rope with a control points to an existing control, and that the numbers are finite and inside sane ranges. |
| Visual | `npm run shots` (Playwright, headless Chromium) saves PNGs at 390×844, 820×1000 and 1440×900 for the five wind presets × camera presets Side (port) and Top, into `docs/screenshots/`. Look at them before saying visual work is done. Commit the set at the end of each milestone. If WebGL fails headless, try `--use-angle=swiftshader` / `--enable-unsafe-swiftshader`. |
| CI | GitHub Actions on every PR: typecheck, lint, unit tests, build. On `main`: the same plus deploy to Pages. |

## 12. Milestones

Each milestone is **one PR**, small enough to review on a phone. Do not start the next milestone in the same PR. End each PR description with the checklist for the owner (copy it from [`WORKFLOW.md`](WORKFLOW.md)).

### M0: Scaffold and pipeline

- Vite + TypeScript (strict) + three.js (pin exact versions) + Vitest + ESLint + Prettier.
- GitHub Actions: CI on PRs; build and deploy to Pages on `main` (`base: '/sail-learn-and-train/'`).
- Layout shell with both modes, an empty 3D scene (water plane, sky colour, a placeholder box), panel tabs with placeholder content.
- Build info in the footer (short hash + date, injected at build time).
- Debug overlay and URL-state plumbing (only `cam`, `debug`, `step` for now).
- `content/i18n/en.json` with the strings used so far.
- **Done when:** the deployed page opens on a phone, shows the footer hash matching the merged commit, and switches layout correctly when rotated or when the browser window is resized across 700 px.

### M1: Static boat

- The full static model from `hanse508.json` (section 6.1), sails as flat triangles at θ = 0.
- Camera orbit and presets.
- Tap-to-identify with the info card (name, boat label, one-liner from the registry).
- Data test (section 11).
- **Done when:** the side and top screenshots match the proportions of `docs/reference/hanse508-side.svg` and `-plan.svg` (mast position, boom length, keel, wheels, cockpit), and every visible part shows a registry name when tapped.

### M2: Mainsail, boom and test wind

- Wind tab (dial, speed, presets), wind streaks, masthead indicator.
- Rig solver for the boom (8.1–8.4, 8.6), main furling, mainsheet/vang/topping-lift/outhaul/furling-line ropes with sag.
- A temporary simple control list (the clutch-bank drawing comes in M4).
- Unit tests for PT-01 … PT-09 and PT-12.
- **Done when:** all M2 checks in `WORKFLOW.md` pass on the phone.

### M3: Self-tacking jib

- Jib solver (8.5), track and car, jib furling with the sheet interaction, jib luffing and twist.
- Unit tests for PT-10, PT-11, PT-13.
- **Done when:** all M3 checks in `WORKFLOW.md` pass.

### M4: Cockpit / clutch-bank panel

- The Ropes tab as in section 7.2, selection sync between 3D and panel, shared-control hints, static-rope info lines, rope colour legend.
- Rudder/wheel control. Full URL state for all controls, a Share button, Reset.
- **Done when:** all M4 checks in `WORKFLOW.md` pass.

### M5: Polish and Phase 1 sign-off

- Performance pass on a real phone (the owner reports fps from the debug overlay).
- Accessibility pass, empty states, error boundary ("3D not supported on this device"), README update, disclaimer in the footer ("Learning aid, not a substitute for sailing instruction").
- Final screenshots.
- **Done when:** every item of the Definition of Done below is ticked in the PR.

## 13. Definition of Done (Phase 1)

- [ ] All controls in `controls.list` work continuously with a 1 % or 5 % step, from slider, steppers and keyboard.
- [ ] Boom, mainsail and jib react plausibly to the rotatable test wind: correct side, luffing when the sheet is slack, sheet limits the swing, vang and topping lift change boom height and twist, self-tacking car crosses sides, furling works with its coupled ropes.
- [ ] Ropes sag when slack and are straight when taut; fighting vang/topping lift is shown.
- [ ] Clutch-bank panel matches the photos; selecting works both ways between panel and 3D.
- [ ] State round-trips through the URL.
- [ ] Deployed on GitHub Pages; works in stacked and side-by-side layouts; smooth on the owner's phone.
- [ ] All Phase 1 tests green in CI; no console errors.
- [ ] Docs updated: README, any changed convention, new assumptions added to `BOAT_REFERENCE.md`.
