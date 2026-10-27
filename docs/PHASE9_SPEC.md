# Phase 9 specification: visual quality

Status: **planned** (owner's answers in the visual quality study, 2026-10-27) · Last updated: 2026-10-27

Read [`ROADMAP.md`](ROADMAP.md) first, then this file. Phase 9 builds on the 3D boat of Phases 1 and 6 (`src/render3d/boat/*.ts`, all shapes built by code from `content/boat/hanse508.json`, the M3b rule), the ropes of M5 and M34 (`src/model/ropePaths.ts`, `src/model/ropeBin.ts`, `src/render3d/boat/ropes.ts`), the camera presets (`src/render3d/cameraPresets.ts`, `src/render3d/cameraRig.ts`), the engine, autopilot and thrusters of Phases 2 and 7, and the boat profiles of M57 and M58 (`src/model/boatProfile.ts`). The owner's request, the approaches weighed and every answer are in [`VISUAL_QUALITY_ANALYSIS.md`](VISUAL_QUALITY_ANALYSIS.md); this spec turns its section 11 into six milestones. The earlier specs still describe everything the app already does.

**Phase numbers changed on 2026-10-27** (owner): this phase was inserted as Phase 9, so the exercises are now **Phase 10** and more languages **Phase 11** (ROADMAP).

## 0. How to use this spec (for the coding agent)

- Do **one milestone** (sections 6–11), on the branch your session gives you, in one PR titled `M<N>: <name>`. Read sections 0–5 first every time; they apply to all milestones. Then read only your milestone's section. Milestones are built in order (M60 → M65); each needs the ones before it merged.
- Build order inside a milestone: data → pure helpers + tests → store/URL → 3D → UI → browser checks → docs.
- **Numbers are final.** Every number in this spec was chosen or prototyped on 2026-10-27 against the real code (3.5 says how). Boat numbers go into `content/boat/hanse508.json`, presentation numbers into `src/render3d/sceneConfig.ts` (`SCENE`) or the CSS, as each section says; never into code as bare literals. A number marked **tunable** may be changed only if a check fails after you have checked your code against 3.4 "common mistakes", or if the picture on the phone is clearly wrong: change it, report the before and after values in the PR, and never widen a test band. A band that still fails is a question for the owner in the PR.
- **Text is data.** Every English string in this spec is final: copy it exactly. Russian strings are AI drafts (CLAUDE.md): copy the ones given; where none is given, write a draft yourself following PHASE4_SPEC 3.3 and keep `textStatus: "draft"`. After any change to `content/lang/ru/*.json` run `npm run review-doc -- ru`.
- **Signatures, test ids, CSS classes.** Function names, signatures, `data-testid`s and classes named here are required, so milestones fit together and the browser checks find things. Keep them; add private helpers freely.
- **Write back.** If you decide something this spec leaves open, write it into your milestone's section under "Decided in the M<N> PR".
- **Everything earlier keeps working.** Every unit test stays green, every PHYSICS_TRUTHS test passes, every old link opens the same boat, wind, place and camera. Pictures change (that is the point of the phase); layouts, taps and the panel do not, except where a section says so.
- **No sailing physics changes in this phase.** No formula of `src/model` that moves the boat, the rig or the ropes changes. Rope lengths, loads, the clutch and winch logic and every rope path of `ropeDrawings` stay as they are: the smoothing of M60 works on a copy, for drawing only.
- Sailing terms in UI text get a short explanation the first time they appear on a screen (CLAUDE.md).

## 1. Goal

The boat looks finished when you come close, and the helm shows what the boat is doing.

What the learner should feel:

> **It looks like a real boat up close.** The ropes bend smoothly round their blocks and over the edges, and their ends are whipped. The blocks have cheeks, a sheave and a shackle; the coamings and boxes have rounded edges. Each wheel has a pedestal with a small panel: the compass turns as she turns, the wind display shows the wind I feel, the engine lever and the tachometer show the engine, the joysticks show the thrusters and the keypad shows the autopilot. From the helm I can look ahead, at the panel or at my ropes, and change to the other wheel.

## 2. Scope

### In scope (Phase 9)

1. **Ropes** (M60): every corner of every rope drawn as a smooth arc; rounder tubes at High (12 sides) without pinches or twists; a whipped end on every rope's tail; a braided surface at High; a triangle and draw-call budget, checked in every preset view; old imported boat profiles keep working when the boat file gains keys.
2. **Blocks and rounded hardware** (M61): every rope block with two cheeks, a sheave and a shackle; rounded edges on the coamings, the rope tail boxes and the clutches with their levers (High).
3. **Helm pedestals and panels** (M62): a pedestal at each wheel with a guard rail and a panel (compass, wind display, tachometer and engine lever, thruster joysticks, autopilot keypad); a better wheel; a rest for the winch handle between the wheels; their Learn entries.
4. **Live panel** (M63): the panel's instruments show the app's values: the compass card turns with the heading, the wind display shows the apparent wind, the tachometer needle the rpm, the lever stands where the Engine section's lever is, the joysticks lean while a thruster is held, the keypad shows Standby / Auto / Wind and the set course.
5. **Helm camera** (M64): the Helm view at either wheel, looking Ahead, at the Panel or at the Ropes, with three buttons over the 3D view and two link keys.
6. **Small fittings, finish and sign-off** (M65): stanchion base plates, lifeline end sleeves, turnbuckles and chainplate plates on the shrouds, deck hatches with frames, hull portlights, soft contact shadows under the deck fittings (High); the frame rate confirmed on the phone.

### Out of scope

- **Model or texture files** of any kind (glTF, images): everything is built by code (owner, study answer 1, the M3b rule).
- **The B&G multifunction display** (a touch-screen navigation unit) and any chart or map on the panel (owner, study answer 6: navigation is a later module; the mini-map stays in the interface).
- **Working controls in 3D**: the panel's lever, joysticks and keys only show what the app's controls do; a tap opens the part's Learn entry (owner, study 10.3).
- **One unit between the wheels** (owner, study 10.1: a panel at each wheel).
- A pulpit and pushpit (the rails at the bow and stern; not drawn today), a bimini or sprayhood redesign, sails, the hull shape, the water and the sky.
- The camera following a Realistic station walk (today walking to a station does not move the camera; that stays).
- Exercises (Phase 10), new languages (Phase 11), any change to sailing, harbour or anchor physics.

If something here looks necessary, stop and ask in the PR.

## 3. Conventions and shared helpers

### 3.1 Conventions

| Topic | Convention |
|---|---|
| Boat frame | `meta.frame` of the boat file: origin at the mast on the waterline, **x forward, y up, z to starboard**, metres. `side` is +1 for starboard, −1 for port. |
| Angles | Degrees in data, state and the link; radians only inside a formula (`DEG` from `src/model/angles.ts`). Headings 0 = north, clockwise, [0, 360). Apparent wind angle `awaDeg` (−180, 180], + = from starboard (`src/model/apparentWind.ts`). |
| Detail | `settings.detail` `'high' \| 'low'` (phones start on Low). Built at **both** levels (owner, study answer 4): the smooth rope bends and whipped ends (M60), the real blocks (M61), the helm pedestal and panel (M62, M63). **High only:** 12-sided ropes and the braid (M60), rounded edges (M61), the small fittings and contact shadows (M65). A detail change rebuilds the whole boat (`src/render3d/scene.ts`, `buildBoat(controls, rig, detail)`), so every builder takes `detail` and needs no live switch. |
| Part ids | Every new mesh carries a registry id (`partMesh` / `smallPartMesh`, `src/render3d/boat/parts.ts`). A part drawn as several meshes (one per material) uses the same id on each, as the winches and the gearbox do. Tiny parts get `hitPoints` so they stay tappable. |
| Pure vs drawing | Positions, frames and readings are pure functions in `src/model` with tests; `src/render3d` only turns them into meshes. |
| Words on the instruments | The panel's printed words (`STBY`, `AUTO`, `WIND`, `AWA`, `AWS`, `kn`, `RPM`, `N`, `E`, `S`, `W`) are the instrument's own markings, in English in every language, like the clutch labels on the boat; they are drawn on canvases, never through `t()`. |
| Touch targets | At least 44 × 44 px (`--touch`) for the M64 buttons. |
| Language | Every visible DOM string through `t()`, in both `ui.json` files, same keys, same order. |

### 3.2 Shared helpers

| Helper | File | Signature | Behaviour |
|---|---|---|---|
| `roundCorners` | `src/model/ropeSmooth.ts` (M60) | `roundCorners(points: readonly Vec3[], radiusM: number, arcPoints: number, maxShare: number): Vec3[]` | 6.3. Each interior point becomes `arcPoints` points on an arc; the ends stay. M62 uses it for the guard rail. |
| `smoothDrawings` | `src/model/ropeSmooth.ts` (M60) | `smoothDrawings(drawings: readonly RopeDrawing[], data?: BoatData): DrawnRope[]` | The ropes as drawn: rounded corners and the whipping points (6.3). |
| `transportFrames` | `src/model/ropeSmooth.ts` (M60) | `transportFrames(points: readonly Vec3[]): { tangent: Vec3; normal: Vec3 }[]` | Steady tube frames along a line (6.3). |
| `fillAddedKeys` | `src/model/boatProfile.ts` (M60) | `fillAddedKeys(boat: Record<string, unknown>, reference: BoatData): Record<string, unknown>` | 6.6. |
| `roundedBoxAt` | `src/render3d/boat/parts.ts` (M61) | `roundedBoxAt(centre: Vec3, size: Vec3, radiusM: number, detail: Detail): THREE.BufferGeometry` | High: three.js `RoundedBoxGeometry` (`three/addons/geometries/RoundedBoxGeometry.js`, part of the pinned three, no new dependency) with `SCENE.boat.roundedSegments` segments and the radius clamped to 0.45 × the smallest side; Low: `boxAt(centre, size)`. |
| `blockGeometry` / `blockMeshes` | `src/render3d/boat/parts.ts` (M61) | 7.3 | A real block in three parts and its three meshes. Replaces `sheaveBlock`. |
| `helmPedestal` | `src/model/helmPedestal.ts` (M62) | `helmPedestal(helmId: string, data?: BoatData): HelmPedestalGeometry` | Every position and frame of one pedestal and its panel (8.3). |
| `panelReadings` | `src/model/helmPanel.ts` (M63) | `panelReadings(state: PanelSource, data?: BoatData): PanelReadings` | What the panel shows (9.3). |
| `helmPose` | `src/render3d/cameraPresets.ts` (M64, exported) | `helmPose(view: HelmView, data?: BoatData): CameraPose` | The Helm camera at a wheel and a direction (10.3). |
| `checkBudget` | `scripts/budget.mjs` (M60) | 6.8 | The browser check of the triangle and draw-call budget. |

### 3.3 Sources

This phase adds no sailing rule and no PHYSICS_TRUTHS entry. The owner has no further photos (study section 6): every new shape is drawn from general knowledge and the two helm photos (`docs/reference/photos/engine-control.jpg`: an Allpa single lever, a tachometer, START / STOP / POWER; `docs/reference/photos/cockpit-winch-clutches.jpg`: a compass and a B&G autopilot control at the starboard helm). Each new size or place is a row in `docs/BOAT_REFERENCE.md` section 5 marked **Assumption**, under a "Phase 9" heading; new registry entries have `status: "draft"`.

### 3.4 Common mistakes (check these first when something fails)

- **Smoothing changes only the drawing.** `ropeDrawings` stays as it is; tests on rope paths, lengths, clutches and winches use it unchanged. Only `src/render3d/boat/ropes.ts` draws the smoothed copy. Labels in 3D (`labelAnchors`) and `__sailDebug.partPoint` keep reading `BoatModel.ropeDrawings()` (the raw lines); the rope's pick segments come from the drawn points.
- **Stable point counts.** A strand's drawn point count depends only on its raw point count and whether it ends in a tail (6.3): the renderer reuses its buffers. A corner that is straight or degenerate still gets its `arcPoints` points.
- **The arc's sides.** The arc lies **inside** the corner (a fillet): its start is on the incoming segment, its end on the outgoing one, both at distance `t` from the corner. If the arc bulges outwards, `n` has the wrong sign.
- **Frames.** A tube frame from "up" at each point flips where a rope turns through vertical. Use `transportFrames` (each normal is the previous one with its part along the new tangent removed), never `cross(tangent, UP)` per point.
- **Indexed geometry.** `RoundedBoxGeometry` is indexed and has no groups to keep; `merge` (`parts.ts`) already makes everything non-indexed. Do not call `mergeGeometries` directly.
- **Hidden meshes are not tappable**, but a mesh outside the frustum still is in `picking.ts` if it is visible. The panel's faces are hidden beyond `SCENE.helmPanel.showWithinM` (9.4): set `visible = false` on each face mesh, not only on a group (`picking.ts` checks the mesh's own `visible`).
- **A canvas texture redraws only when told.** After drawing on a canvas set `texture.needsUpdate = true`; never redraw every frame (9.4).
- **The boat object is shared.** Read `boat.…` at call time or take `data: BoatData = boat`; never copy it into a module constant (PHASE8_SPEC 3.4).
- **A new boat-file key breaks old profiles** unless it is listed in `ADDED_KEYS` (6.6). Every milestone that adds a key adds its path there in the same PR.
- **`tests/boatData.test.ts`** has generic checks on the boat file ("sizes are small" and others). New coordinate-like keys (positions that may be 0 or negative) are listed where that test lists such keys, as the M50 PR did for `winchHandle.rest`.

### 3.5 How the numbers were made

- **Rope smoothing (M60)**: a throwaway Vitest file ran 6.3's `roundCorners` (radius 0.045 m, 4 arc points, share 0.45) on `ropeDrawings(initialRig(defaultControls()))`. Easy, default controls: 9 ropes, 22 strands, 267 raw points → **936** drawn points (`2·22 + (267 − 44)·4`), 11 of the strands end in a tail (box). Per rope (strands / drawn points): mainsheet 6/284, vang 2/96, topping lift 2/96, outhaul 2/56, main furling line 2/100, jib sheet 4/144, jib furling line 1/58, main halyard 1/50, gennaker halyard 2/52. The largest raw turn is 128° (the mainsheet tails at the deck blocks). With the starboard mainsheet tail on its winch (3 turns, in the self-tailer) and the port tail held in the hand: 370 raw → **1,348** drawn points. No corner was degenerate; one corner was clamped (radius 0.031 m). Worst values over every strand: the closest arc point to its corner 0.0635 m; a strand drawn shorter than its raw line by at most 0.1348 m; the largest turn between two drawn segments 42.8°; `transportFrames` never turned a normal more than its tangent turned (0.000°). Cost: 0.37 ms for all strands per frame in Node.
- **Budget (M60)**: measured with `__sailDebug.stats()` on the built app (1,280 × 800, `debug=1&held=1&sea=flat&clock=0&mm=0`, 2.5 s after load), before Phase 9:

  | View | High: calls / triangles | Low: calls / triangles |
  |---|---|---|
  | Side (port or starboard) | 197 / 91,068 (Realistic 201 / 91,236) | 105 / 48,782 (107 / 48,866) |
  | Top | 193 / 90,564 (197 / 90,732) | 101 / 48,278 (103 / 48,362) |
  | Bow | 197 / 91,068 (201 / 91,236) | 105 / 48,782 (107 / 48,866) |
  | Helm | 171 / 88,888 (173 / 88,972) | 79 / 47,046 (79 / 47,046) |

  The ropes at High after M60: `958 × 12 × 2` = **22,992** triangles (936 points plus 2 whipping points on each of the 11 tails; 12 sides; two triangles per side and segment, plus the end caps), against 3,204 today. At Low: 11,496.
- **Helm pedestal (M62, M64)**: a script ran 8.3's formulas. Port pedestal: pod centre (−7.04, 2.01, −0.76); face normal `w` (−0.8781, 0.4695, −0.0923), `u` (−0.1045, 0, 0.9945), `v` (0.4669, 0.8829, 0.0491); face centre (−7.0663, 2.0241, −0.7628). The pod's corners span x −7.1433 … −6.9367 (3.2 cm clear of the wheel rim at −7.175), y 1.89 … 2.13, z −0.9676 … −0.5524. From the Helm eye (−8.2, 2.65, −0.88) the face centre is 1.3003 m away, 28.78° down and 5.90° towards the middle, and the face looks straight back at the eye (cosine 0.9999). The Ropes target (−6.90, 1.60, −1.60) is 1.8196 m away, 35.24° down and 28.98° outboard. Starboard is the mirror image (z and the z parts of the vectors change sign; `u` keeps pointing to the viewer's right, so the layout on the face is the same on both panels).

### 3.6 Browser-check conventions (every milestone)

- Each milestone has `scripts/shots-m<N>.mjs`, registered in `scripts/shots.mjs` (import, `SCENES`, `liveGroups`) with names written without the prefix, as Phases 5, 7 and 8. Close-ups are taken **inside the live checks** with `__sailDebug.setView(position, target, fovDeg)` and `page.screenshot`, as `scripts/shots-m50.mjs` does (with `debug=1&held=1&sea=flat` and the debug overlay hidden as there); `M<N>_SCENES` stays empty unless a section lists scenes.
- **What `openPage` adds:** Phase 9 labels (`m60` … `m65`) are treated like Phase 8 ones. The M60 PR appends `|6[0-5]` inside each of the five label groups of `openPage` (`scripts/shots.mjs`): the four default rules (`held`, `sea`, `clock`, `mm`) and the "older checks open Ropes" rule, giving for example `/m(1[4-9]|2[5-9]|3[6-9]|4[0-7]|4[89]|5\d|6[0-5])/` and `/m(27|29|35|36|37|38|39|4[89]|5\d|6[0-5])/`.
- **Live checks run on the test clock** where app time matters (CLAUDE.md): `openPage(viewport, label, query, { testClock: true })` (M63's redraws, M64's glides).
- Every close-up is taken at **both** detail levels (`detail=high`, `detail=low`) on the phone (390 × 844) and the 1,440 × 900 desktop, unless the section says otherwise. File names: `<prefix><name>-<detail>-<viewport label>.png`.
- **CI** (`.github/workflows/ci.yml`): the M60 PR adds a part `live, M60-M65` with `env: SHOTS_NO_SCENES=1 SHOTS_NO_TAPS=1 SHOTS_ONLY=budget,m60,m61,m62,m63,m64,m65` (a name with no group yet is skipped) and appends `,budget,m60,m61,m62,m63,m64,m65` to the `SHOTS_SKIP` list of the part `live, M30 on`.
- **The budget check runs on every PR from M60 on** (the `budget` group, 6.8), so every later milestone is held to it without new code.

### 3.7 General rules for every milestone

- **Changing an older check.** A milestone changes an older browser check or unit test only where its section names it, and only the lines that test what the milestone changes (a mesh count, an expected colour, a pick point). The check's purpose stays; say in the PR which checks changed and why.
- **Pictures change, layouts do not.** Older scenes may differ in pixels (rounder ropes, new blocks); the script's layout, scroll and tap checks must still pass.
- **Strings.** New keys go into both `ui.json` files after the keys of the same prefix. `tests/languages.test.ts` must stay green.
- **Registry and glossary.** New ids go into `content/registry/parts.json` first (`status: "draft"`), then into every `content/lang/<code>/glossary.json` (`textStatus: "draft"`). `tests/registry.test.ts` and `tests/glossary.test.ts` stay green; the M24 review document is regenerated (`npm run review-doc -- ru`).
- **Accessibility.** The M64 buttons have accessible names; the audit (`scripts/a11y-audit.mjs`, `auditPage`) runs with them shown.
- **Code map.** Every PR that adds, removes or renames a file, or moves a responsibility, updates `docs/CODE_MAP.md`.
- **Boat reference.** Every new boat-file number is a row in `docs/BOAT_REFERENCE.md` section 5 ("Phase 9" rows), marked **Assumption** unless the section names a source.
- **No new dependencies.** `RoundedBoxGeometry` is in the pinned `three` package's add-ons.

## 4. Architecture

### 4.1 New state

One new state field, in M64:

```ts
// src/model/settings.ts (M64)
export type HelmWheel = 'port' | 'starboard';
export type HelmLook = 'ahead' | 'panel' | 'ropes';
export interface HelmView { wheel: HelmWheel; look: HelmLook }
export interface CameraState {
  preset: CameraPreset;
  /** The Helm camera's wheel and direction (M64). Kept while another preset shows. */
  helm: HelmView;
}
export const DEFAULT_HELM_VIEW: Readonly<HelmView> = { wheel: 'port', look: 'ahead' };
```

UI state (not in the store): none new. Render-only state: the panel's last drawn readings (`src/render3d/boat/helmPedestal.ts`, M63).

### 4.2 URL keys

| Key | Milestone | Values | Default | Written |
|---|---|---|---|---|
| `hw` | M64 | `p` (port wheel), `s` (starboard wheel) | `p` (no key) | only when `cam=helm` and the wheel is starboard |
| `hl` | M64 | `a` (Ahead), `p` (Panel), `r` (Ropes) | `a` (no key) | only when `cam=helm` and the look is not Ahead |

Both keys are read whatever `cam` is (a link with `hw=s` and another camera keeps the starboard wheel for the next Helm). An unknown value gives the default. Old links have neither key: they open the port wheel looking Ahead, exactly today's Helm picture (10.7 test 1). `hd` is the winch handle's key (M50) and stays as it is.

### 4.3 Boat-file additions (all milestones)

| Milestone | New keys (section) |
|---|---|
| M60 | `visual.ropeBend` (6.2) |
| M61 | `modelDetail.block.cheekThicknessM`, `sheaveRadiusShare`, `sheaveWidthM`, `shackleRadiusShare`, `shackleWireRadiusM`; `modelDetail.edgeRadius` (7.2) |
| M62 | `modelDetail.helmPedestal` (8.2) |
| M65 | `deckFittings.hatches`, `deckFittings.portlights`, `modelDetail.lifelines.basePlate`, `modelDetail.lifelines.endSleeve`, `modelDetail.shroudFittings` (11.2) |

Each path is added to `ADDED_KEYS` (6.6) in the same PR.

### 4.4 Files by milestone

A summary; each milestone's own "Files" list is the complete one and wins where they differ.

| Milestone | New | Changed (main) |
|---|---|---|
| M60 | `src/model/ropeSmooth.ts`, `tests/ropeSmooth.test.ts`, `scripts/budget.mjs`, `scripts/shots-m60.mjs` | `content/boat/hanse508.json`, `src/model/ropePaths.ts` (`tailEnd`), `src/model/boatProfile.ts`, `src/render3d/boat/ropes.ts`, `src/render3d/boat/textures.ts`, `src/render3d/boat/index.ts`, `src/render3d/sceneConfig.ts`, `tests/boatProfile.test.ts`, `scripts/shots.mjs`, `.github/workflows/ci.yml` |
| M61 | `tests/blocks.test.ts`, `scripts/shots-m61.mjs` | `content/boat/hanse508.json`, `src/render3d/boat/parts.ts`, `src/render3d/boat/rig.ts`, `src/render3d/boat/hull.ts`, `src/render3d/boat/cockpitHardware.ts`, `src/model/boatProfile.ts`, `src/render3d/sceneConfig.ts` |
| M62 | `src/model/helmPedestal.ts`, `src/model/helmPanel.ts`, `src/render3d/boat/helmPedestal.ts`, `src/render3d/boat/panelFaces.ts`, `tests/helmPedestal.test.ts`, `scripts/shots-m62.mjs` | `content/boat/hanse508.json`, `content/registry/parts.json`, both `glossary.json`, `src/model/glossary.ts` (`NOT_DRAWN`), `src/render3d/boat/cockpitHardware.ts`, `src/render3d/boat/materials.ts`, `src/render3d/boat/index.ts`, `src/render3d/sceneConfig.ts`, `src/model/boatProfile.ts` |
| M63 | `tests/helmPanel.test.ts`, `scripts/shots-m63.mjs` | `src/model/helmPanel.ts`, `src/render3d/boat/helmPedestal.ts`, `src/render3d/boat/index.ts`, `src/render3d/scene.ts`, `src/render3d/sceneConfig.ts`, both `glossary.json` |
| M64 | `src/ui/helmViews.ts`, `scripts/shots-m64.mjs` | `src/model/settings.ts`, `src/app/store.ts`, `src/app/urlState.ts`, `src/render3d/cameraPresets.ts`, `src/render3d/cameraRig.ts`, `src/render3d/scene.ts`, `src/render3d/sceneConfig.ts`, `src/app/app.ts`, `src/style.css`, both `ui.json`, `tests/cameraPresets.test.ts`, `tests/urlState.test.ts`, `tests/store.test.ts`, `scripts/ui.mjs` |
| M65 | `src/model/smallFittings.ts`, `src/render3d/boat/smallFittings.ts`, `tests/smallFittings.test.ts`, `scripts/shots-m65.mjs` | `content/boat/hanse508.json`, `content/registry/parts.json`, both `glossary.json`, `src/render3d/boat/deckGear.ts`, `src/render3d/boat/index.ts`, `src/render3d/boat/parts.ts`, `src/render3d/picking.ts`, `src/render3d/sceneConfig.ts`, `src/model/boatProfile.ts` |

## 5. Milestones overview

Each milestone is one PR, small enough to check on a phone in 15 minutes. **Independent review: required** means the owner runs `/review <PR>` (new Code session, Opus, high effort) as soon as the PR opens, before testing it on the phone.

| Milestone | Section | What the owner sees | Depends on | Independent review |
|---|---|---|---|---|
| M60 | 6 | Ropes bend smoothly round blocks and edges, look round up close, have whipped ends and (High) a braided surface | Phase 8 | **required** (every rope's drawing, a new pure module, the boat profile check, the budget check every later PR runs) |
| M61 | 7 | Blocks with cheeks, sheave and shackle; rounded coamings, rope boxes and clutches | M60 | not needed (shapes and materials only; ids and taps unchanged) |
| M62 | 8 | A pedestal with a guard rail and a panel at each wheel; a better wheel; the handle's rest; their Learn entries | M61 | not needed (shapes, data and Learn texts; nothing in the store or the link) |
| M63 | 9 | The panel shows live values: compass, wind, rpm, lever, joysticks, autopilot | M62 | **required** (reads shared state every frame in 3D; the redraw rule; a wrong reading teaches the wrong thing) |
| M64 | 10 | Helm view at either wheel, looking Ahead, at the Panel or at the Ropes; two link keys | M63 | **required** (new state, URL keys and old links; the camera rig) |
| M65 | 11 | Stanchion bases, lifeline sleeves, turnbuckles, hatches, portlights, contact shadows (High); sign-off | M64 | not needed (shapes at High only, checks and docs) |

---

## 6. M60: Ropes

**Independent review: required** (it changes how every rope is drawn, adds a pure module the renderer depends on, changes the boat profile check that imported boats go through, and adds the budget check every later PR runs).

Study section 11, milestone 1; owner's answers 3 (whipped ends) and 4 (bends and whipping at both levels; 12 sides and the braid at High).

### 6.1 Files

New: `src/model/ropeSmooth.ts`, `tests/ropeSmooth.test.ts`, `scripts/budget.mjs`, `scripts/shots-m60.mjs`. Changed: `content/boat/hanse508.json` (6.2), `src/model/ropePaths.ts` (`RopeStrand.tailEnd`, 6.3), `src/model/boatProfile.ts` (6.6), `src/render3d/boat/ropes.ts` (6.4), `src/render3d/boat/textures.ts` (`braidNormalTexture`), `src/render3d/boat/index.ts` (`buildRopes` gets the detail; `BoatModel.ropeStats`), `src/render3d/scene.ts` (debug hooks `ropeStats`, `partBox`), `src/render3d/sceneConfig.ts` (6.4), `tests/boatProfile.test.ts`, `tests/ropePaths.test.ts` (6.7 item 12), `scripts/shots.mjs` (register `m60` and `budget`; the label rule of 3.6), `scripts/ui.mjs` (`closeUpOn`), `.github/workflows/ci.yml` (3.6), `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md`.

### 6.2 Data (`content/boat/hanse508.json`)

New block `visual.ropeBend`, after `visual.ropeMaxSagM`:

```json
"ropeBend": {
  "$comment": "M60 (Phase 9): how ropes are drawn round their corners, for the picture only (rope paths and lengths do not change). Every corner of a rope's drawn line becomes an arc of radiusM (the turning blocks' sheave radius, modelDetail.mastBaseTurningBlocks.blockDiameter / 2), drawn with arcPoints points; on a short segment the arc is made smaller so it uses at most maxShareOfSegment of each segment next to it. Each rope's tail (the end in the rope box, on the box, or in a coil) is whipped: the last whipLengthM is drawn in the whipping colour.",
  "radiusM": 0.045,
  "arcPoints": 4,
  "maxShareOfSegment": 0.45,
  "whipLengthM": 0.03,
  "whipEdgeM": 0.001
}
```

`radiusM` and `whipLengthM` are **tunable**; `arcPoints` and `maxShareOfSegment` are not (the point counts in 3.5 and the tests depend on them).

### 6.3 Model

**`RopeStrand` (`src/model/ropePaths.ts`)** gains one optional field:

```ts
export interface RopeStrand {
  points: Vec3[];
  feed: number;
  /** M60: true when the strand's last point is the rope's own end (its tail): it is whipped. */
  tailEnd?: true;
}
```

Set `tailEnd: true` on exactly the strands whose points end with the spread `...lead(…)` (the local `lead` in `ropeDrawings`, and the `lead` passed to `jibRopes` and `halyards`): today the two mainsheet tails, the vang's and the topping lift's second strand, the outhaul's second strand, both main furling tails, the jib sheet's and jib furling line's tail strands and both halyard tails. With default controls in Easy that is **11** strands (3.5). No point of any strand changes.

**`src/model/ropeSmooth.ts` (pure):**

```ts
import type { RopeDrawing } from './ropePaths';
export interface DrawnStrand {
  points: Vec3[];
  feed: number;
  /** Index of the first whipped point (the whipping runs from it to the end), or null. */
  whipFrom: number | null;
}
export interface DrawnRope { id: RopeDrawing['id']; state: RopeDrawing['state']; strands: DrawnStrand[] }

export function roundCorners(points: readonly Vec3[], radiusM: number, arcPoints: number, maxShare: number): Vec3[];
export function insertWhipping(points: readonly Vec3[], whipM: number, edgeM: number): { points: Vec3[]; whipFrom: number };
export function smoothDrawings(drawings: readonly RopeDrawing[], data: BoatData = boat): DrawnRope[];
export function transportFrames(points: readonly Vec3[]): { tangent: Vec3; normal: Vec3 }[];
```

`roundCorners(points, R, K, share)`:

- Fewer than 3 points: return a copy.
- The output starts with `points[0]`, ends with the last point, and replaces **each interior point** `P = points[i]` (with `A = points[i − 1]`, `B = points[i + 1]`) by exactly `K` points:
  - `la = |P − A|`, `lb = |B − P|`. If `la < 1e-6` or `lb < 1e-6` (degenerate): `K` copies of `P`.
  - `u = (P − A)/la`, `v = (B − P)/lb`, `turn = acos(clamp(u·v, −1, 1))` (radians, 0 = straight on).
  - If `turn > π − 1e-4` (the line doubles back on itself): `K` copies of `P`.
  - `tmax = share · min(la, lb)`. If `turn < 1e-4` (straight): the points `P + u·s_k` with `s_k = (−1 + 2k/(K − 1)) · min(tmax, R)`, k = 0 … K − 1.
  - Otherwise: `t = R · tan(turn/2)`, `r = R`; if `t > tmax`: `t = tmax`, `r = t / tan(turn/2)`. `T1 = P − u·t`; `n = normalize(v − u·(u·v))` (towards the inside of the corner); `C = T1 + n·r` (the arc's centre). For k = 0 … K − 1: `φ = turn · k/(K − 1)`, point `C − n·r·cos φ + u·r·sin φ`. (k = 0 gives `T1`, k = K − 1 gives `P + v·t`.)
- So a line of `n ≥ 2` points gives `2 + (n − 2)·K` points (n = 2: the same 2).

`insertWhipping(points, w, e)` (a line of at least 2 points): walk back from the last point along the line and insert two points, `Q1` at length `w + e` from the end and `Q2` at length `w` from the end (each on the segment that contains that length, by linear interpolation; if both fall in one segment, `Q1` comes first). Return the line with them inserted and `whipFrom` = the index of `Q2`. If the whole line is shorter than `w + e`, insert `Q1` and `Q2` at 25 % and 50 % of its length from the start instead. Always exactly 2 points more.

`smoothDrawings(drawings, data)`: for each rope and each strand, `pts = roundCorners(strand.points, rb.radiusM, rb.arcPoints, rb.maxShareOfSegment)` with `rb = data.visual.ropeBend`; then, if `strand.tailEnd`, `insertWhipping(pts, rb.whipLengthM, rb.whipEdgeM)`; else `whipFrom = null`. `feed`, `id` and `state` are copied. The input is not changed.

`transportFrames(points)` (steady tube frames, "parallel transport"):

- Tangent at `i`: `normalize(p[i+1] − p[i−1])` (`p[1] − p[0]` at the start, `p[n−1] − p[n−2]` at the end); if that vector is shorter than `1e-9`, the previous point's tangent (`[1, 0, 0]` if there is none yet).
- First normal: `normalize(cross(t0, [0, 1, 0]))`, or `normalize(cross(t0, [1, 0, 0]))` when `|t0·[0,1,0]| > 0.9`.
- Each next normal: `m = n_{i−1} − t_i·(t_i·n_{i−1})`; `n_i = normalize(m)`; if `|m| < 1e-6`, use the first-normal rule with `t_i`.

### 6.4 3D (`src/render3d/boat/ropes.ts`, `textures.ts`, `index.ts`, `sceneConfig.ts`)

`SCENE.ropes` changes: `radialSegments: 6` becomes `radialSegmentsHigh: 12` and `radialSegmentsLow: 6`; new keys:

```ts
/** M60: the whipping at each rope's tail (multiplied with the rope's colour). */
whipColour: '#2b2724',
/** M60: braided surface at High: one braid repeat along the rope, in metres, and the bump strength. */
braid: { periodM: 0.025, aroundRepeats: 2, strength: 2.0, texelsAlong: 32, texelsAround: 16 },
```

(`braid.periodM` and `braid.strength` are **tunable**.) Any other block that holds `radialSegments: 6` (the mooring lines, `sceneConfig.ts` near the top) keeps its own value.

- `buildRopes(initial: readonly RopeDrawing[], detail: Detail): RopeMeshes` (today `buildRopes(initial)`); `buildBoat` passes its `detail`. `RADIAL` is `radialSegmentsHigh` or `radialSegmentsLow`.
- `update(drawings, view?, flashing?)` keeps its signature and first calls `smoothDrawings(drawings)`; everything after works on the drawn strands. A strand's buffer layout (ring count) is `drawn.points.length`; it is rebuilt only when that count changes, as today.
- **Rings:** at each drawn point `p` with frame `(t, n)` from `transportFrames` and `b = cross(t, n)`, the ring vertex `j` is `p + r·(cos θ_j·n + sin θ_j·b)`, `θ_j = 2πj/RADIAL`, and its normal `cos θ_j·n + sin θ_j·b`. `r` is `radiusAt(p, view)` as today (the thinner drum radius on a winch drum, the screen minimum far away). The end caps stay as M34 made them (a centre vertex `0.5·r` beyond the end ring along the end tangent, a fan), with the transported frame's rings.
- **Whipping:** every rope mesh gets a `color` attribute (3 floats per vertex) and its material `vertexColors: true`. Vertices of rings with index ≥ `whipFrom`, and the end cap's centre of a whipped strand, get `SCENE.ropes.whipColour`; all others white (1, 1, 1). The flashing and fighting colours stay on the material colour, as today (multiplied).
- **UVs** stay: `u = (arc + feed)/stripePeriodM`, `v = j/RADIAL`, with `arc` measured along the drawn points.
- **Braid (High only):** `braidNormalTexture(): THREE.DataTexture` (`textures.ts`), RGBA, `texelsAlong × texelsAround` (32 × 16), `RepeatWrapping` both ways, `colorSpace` none (`THREE.NoColorSpace`). For texel `(i, k)` with `s = (i + 0.5)/32`, `q = (k + 0.5)/16`: height `h(s, q) = max(0.5 + 0.5·cos 2π(2s + q), 0.5 + 0.5·cos 2π(2s − q))` (two crossing sets of strands); `dh/ds` and `dh/dq` by central differences over one texel with wrap-around; normal `normalize(−strength·dh/ds / 32, −strength·dh/dq / 16, 1)` written as `(x + 1)/2·255`, alpha 255. Made once per boat build. At High each rope material gets `normalMap` = that texture (one shared texture), `normalMap.repeat.set(stripePeriodM / braid.periodM, braid.aroundRepeats)`; at Low no normal map. The material stays `MeshLambertMaterial` (it supports normal maps in the pinned three).
- **Pick segments** are the drawn points' segments (more of them; `picking.ts` is unchanged).
- `RopeMeshes` gains `stats(): RopeStats` and `BoatModel` gains `ropeStats(): RopeStats`:

```ts
export interface RopeStats { strands: number; points: number; whipped: number; radialSegments: number; finite: boolean }
```

`points` is the sum of drawn points over all strands, `whipped` the strands with `whipFrom !== null`, `finite` false if any position written in the last update is not a finite number.

### 6.5 Debug hooks (`src/render3d/scene.ts`, `window.__sailDebug`, `debug=1` only)

- `ropeStats(): RopeStats` (6.4).
- `partBox(partId: string): { min: Vec3; max: Vec3 } | null`: the box round every **visible** mesh with that `userData.partId`, in boat coordinates (the frame `setView` and `project` use), or null when none is visible. Later milestones aim their close-ups with it.

`scripts/ui.mjs` gains:

```js
/** M60: aims the camera at a part (debug=1): target = the middle of partBox(partId), camera `distanceM` from it along `from` (a boat-frame direction), lens `fovDeg`. Returns false when the part is not drawn. */
export async function closeUpOn(page, partId, from, distanceM, fovDeg = 40) {}
```

### 6.6 Old boat profiles (`src/model/boatProfile.ts`)

A profile saved before Phase 9 has no `visual.ropeBend` and would fail with "missing". The check fills the keys Phase 9 adds (owner question 1 in the planning PR; recommended):

```ts
/** Boat-file paths added after profile version 1 (Phase 9). A profile without one gets the reference's value. Each milestone appends the paths it adds (4.3). */
export const ADDED_KEYS: readonly string[] = ['visual.ropeBend'];
/** A copy of `boat` with every ADDED_KEYS path that is missing (its parent object present) set to a deep copy of the reference's value. */
export function fillAddedKeys(boat: Record<string, unknown>, reference: BoatData): Record<string, unknown>;
```

`checkBoatProfile` calls `fillAddedKeys(raw.boat, reference)` after the header check and walks, range-checks and returns **the filled copy** (`profile.boat`). A path whose parent object is missing is not filled (the walk then reports the parent as missing). A present value is never replaced: a wrong one fails as today. `BOAT_PROFILE_VERSION` stays 1. `boatStore.ts` checks every stored boat again at start (M58), so stored boats are filled too. Add one line to `docs/BOAT_PROFILE.md`: "Profiles saved before Phase 9 still work: the numbers added since are taken from the Hanse 508."

### 6.7 Tests (`tests/ropeSmooth.test.ts`, `tests/boatProfile.test.ts`)

R = 0.045, K = 4, share = 0.45 unless stated; `toBeCloseTo(…, 9)` for coordinates.

1. Counts: 2 points → the same 2; 5 points (any non-degenerate shape) → 14.
2. A 90° corner `[(0,0,0), (1,0,0), (1,1,0)]` → 6 points; `out[1]` = (0.955, 0, 0), `out[4]` = (1, 0.045, 0); `out[1..4]` are all 0.045 from (0.955, 0.045, 0); the ends unchanged.
3. Clamped: `[(0,0,0), (0.05,0,0), (0.05,1,0)]` → `out[1]` = (0.0275, 0, 0), `out[4]` = (0.05, 0.0225, 0).
4. Straight: `[(0,0,0), (1,0,0), (2,0,0)]` → `out[1..4]` = x 0.955, 0.985, 1.015, 1.045 on the x axis.
5. Degenerate: `[(0,0,0), (0,0,0), (1,0,0)]` → 6 points, `out[1..4]` = (0,0,0), nothing NaN. Doubling back: `[(0,0,0), (1,0,0), (0,0,0)]` → `out[1..4]` = (1, 0, 0).
6. `insertWhipping([(0,0,0), (0.5,0,0), (1,0,0)], 0.03, 0.001)` → `[(0,0,0), (0.5,0,0), (0.969,0,0), (0.97,0,0), (1,0,0)]`, `whipFrom` 3. A line 0.02 m long `[(0,0,0), (0.02,0,0)]` → points at x 0.005 and 0.01, `whipFrom` 2.
7. Easy, default controls (`ropeDrawings(initialRig(defaultControls()))`): `smoothDrawings` gives 22 strands, **958** points in all, 11 strands with `whipFrom !== null` (exactly those with `tailEnd`, and each of those ends in the rope box: its last raw point is `ropeBinBox(side).frontX − ropeBin.entry.depthM`).
8. Same drawings, every strand: drawn length (before whipping) ≤ raw length and ≥ raw length − 0.14 m; for every interior raw point, the closest of its K drawn points is within 0.07 m (`modelDetail.block.radius`) of it; the turn between two consecutive drawn segments is at most 45°.
9. Realistic: `winches` = starboard mainsheet tail on `winch_primary_starboard` (3 turns, self-tailer) and port mainsheet tail on `winch_primary_port` (0 turns, held): **1,370** drawn points, all finite.
10. `transportFrames` on every drawn strand of items 7 and 9: each normal has length 1 ± 1e-9 and `|normal·tangent| < 1e-9`; the angle between consecutive normals is at most the angle between the same two tangents + 1e-6°.
11. `smoothDrawings` leaves its input unchanged (deep equal to a `structuredClone` taken before).
12. `tests/ropePaths.test.ts`: the M5/M34 expectations stay; add one test that `tailEnd` is true on exactly 11 strands of item 7's drawings.
13. Profiles: `makeBoatProfile('test-boat', 'Test', clone)` where `clone` is the Hanse 508 without `visual.ropeBend` passes `checkBoatProfile`, and `profile.boat.visual.ropeBend` deep-equals the Hanse 508's; with `visual.ropeBend.radiusM` = `'big'` it fails with one problem `boat.visual.ropeBend.radiusM`, kind `type`; without `visual` at all it fails with `boat.visual` missing; every path of `ADDED_KEYS` exists in `HANSE_508`.

### 6.8 Budget check (`scripts/budget.mjs`, group `budget`)

```js
export const BUDGET = { high: { calls: 300, triangles: 250000 }, low: { calls: 150, triangles: 120000 } };
/** Opens each preset view at both details, in Easy and Realistic ropes, on a 1,280 × 800 page, and fails over budget. */
export async function checkBudget({ openPage, problems }) {}
```

For each `detail` of `high`, `low`, each `cam` of `side-port`, `side-starboard`, `top`, `bow`, `helm` and each of `''` and `&mode=realistic`: open `?debug=1&held=1&sea=flat&clock=0&mm=0&cam=<cam>&detail=<detail><extra>` with the label `budget <detail> <cam>` on a viewport `{ width: 1280, height: 800, label: 'budget' }`, wait 2,500 ms (real time), read `__sailDebug.stats()` and print `budget <detail> <cam> <ropes>: <calls> calls, <triangles> triangles`; a value over `BUDGET[detail]` is a problem. Register it in `scripts/shots.mjs` as `budget: () => checkBudget(live)` in `liveGroups` (not on the test clock). The numbers in 3.5 are today's; the owner confirms the frame rate on the phone at the M65 sign-off.

### 6.9 Browser checks (`scripts/shots-m60.mjs`, `debug=1&held=1&sea=flat`)

Close-ups (3.6: both details, phone and desktop), each aimed with `closeUpOn`:

| Name | Link (after the base) | Part | From | Distance, fov |
|---|---|---|---|---|
| `mast-foot` | `cam=side-port` | `fit_mast_base_turning_blocks` | (−1, 0.8, −0.6) | 1.4 m, 40° |
| `clutches-starboard` | `cam=side-starboard` | `clutch_bank_a` | (0.6, 0.9, −0.8) | 1.2 m, 40° |
| `winch-wrap` | `mode=realistic&wp=b5.3.t&cam=side-port` | `winch_primary_port` | (0.4, 0.9, 0.6) | 0.9 m, 40° |
| `boom-blocks` | `cam=side-port` | `fit_mainsheet_boom_blocks` | (−0.3, −0.6, −1) | 1.6 m, 40° |

One more close-up, `box-gap-port` (`cam=side-port`), aimed with `__sailDebug.setView` because `fit_rope_bin` covers both boxes: target (−7.45, 1.45, −1.55) (the port box's `bodyEndX`, the gap, the tail lanes), position target + 1.5 m along `normalize(0.7, 0.9, 0.5)`, fov 40°.

Live (phone, then desktop):

1. `?debug=1&held=1&sea=flat&cam=side-port&detail=high`: `ropeStats()` is `{ strands: 22, points: 958, whipped: 11, radialSegments: 12, finite: true }`.
2. The same with `detail=low`: `radialSegments` 6, `points` 958.
3. `?debug=1&held=1&sea=flat&mode=realistic&wp=b5.3.t&cam=side-port`: `points` > 958, `whipped` 11, `finite` true.
4. Taps still work: in 1, tap the canvas at `project(...partPoint('rope_vang', 0.5))` → `waitForLink(page, ['sel=rope_vang'])`.

### 6.10 Done when

Every rope bends in arcs at the mast foot, the clutches, the box gap, the winches and the blocks; ropes are round at High; each tail end is whipped; the braid shows at High; old profiles import; typecheck, lint, tests, build, `SHOTS_ONLY=m60,budget,m34,m5` pass (M34 and M5 are the rope-end and rope checks).

### 6.11 Not in M60

Moving any rope's path (a rope that runs through a part stays so; M61 draws the blocks round the corners), new rope colours, ropes on the mooring lines (`src/render3d/mooringLines.ts` keeps its 6-sided tubes), the anchor chain.

### 6.12 Decided in the M60 PR

- Decided in planning (recommended; merging accepts it): profiles saved before Phase 9 take the new keys from the Hanse 508 (6.6); no profile version change.
- Decided in planning (recommended; merging accepts it): the budget is High 300 draw calls and 250,000 triangles, Low 150 and 120,000, in every preset view, Easy and Realistic ropes (6.8).

---

## 7. M61: Blocks and rounded hardware

**Independent review: not needed** (shapes and materials only; every part keeps its id, its tap points and its place).

Study section 11, milestone 2; owner's answer 4 (real blocks at both levels; rounded edges at High only).

### 7.1 Files

New: `tests/blocks.test.ts`, `scripts/shots-m61.mjs`. Changed: `content/boat/hanse508.json` (7.2), `src/render3d/boat/parts.ts` (`roundedBoxAt`, `blockGeometry`, `blockMeshes`; `sheaveBlock` removed), `src/render3d/boat/rig.ts` (the four block builders), `src/render3d/boat/hull.ts` (`buildHull(materials, detail)`, the coamings), `src/render3d/boat/cockpitHardware.ts` (rope boxes, clutches), `src/render3d/boat/index.ts` (pass `detail`), `src/render3d/boat/materials.ts` (`sheave`), `src/render3d/sceneConfig.ts` (`SCENE.boat.sheave`, `SCENE.boat.roundedSegments`), `src/model/boatProfile.ts` (`ADDED_KEYS`), `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md`, `scripts/shots.mjs`.

### 7.2 Data (`content/boat/hanse508.json`)

`modelDetail.block` (today `{ "radius": 0.07 }`) becomes:

```json
"block": {
  "radius": 0.07,
  "source": "assumption (M61, Phase 9: a block's two cheeks, its sheave and a shackle, sized for the drawn rope; no photo measured)",
  "cheekThicknessM": 0.008,
  "cheekClearanceM": 0.006,
  "sheaveRadiusShare": 0.78,
  "axleRadiusShare": 0.12,
  "shackleWireRadiusM": 0.006,
  "shackleRiseShare": 0.9
}
```

New block `modelDetail.edgeRadius`, after `block`:

```json
"edgeRadius": {
  "source": "assumption (M61, Phase 9: moulded and cast parts have rounded edges; radii estimated)",
  "coamingM": 0.03,
  "ropeBinM": 0.025,
  "clutchBodyM": 0.01,
  "clutchLeverM": 0.004
}
```

All radii are **tunable**. `ADDED_KEYS` gains `'modelDetail.block.source'`, `'modelDetail.block.cheekThicknessM'`, `'modelDetail.block.cheekClearanceM'`, `'modelDetail.block.sheaveRadiusShare'`, `'modelDetail.block.axleRadiusShare'`, `'modelDetail.block.shackleWireRadiusM'`, `'modelDetail.block.shackleRiseShare'`, `'modelDetail.edgeRadius'`.

`SCENE.boat` gains `sheave: '#6b7076'` (after `block`) and `roundedSegments: 3`.

### 7.3 Blocks (`src/render3d/boat/parts.ts`)

```ts
export interface BlockGeometry {
  /** The two side plates (and, for the deck blocks, the post under them): materials.block. */
  cheeks: THREE.BufferGeometry[];
  /** The wheel the rope runs on: materials.sheave. */
  sheave: THREE.BufferGeometry[];
  /** The axle pin and the shackle: materials.chrome. */
  fittings: THREE.BufferGeometry[];
}
export function blockGeometry(centre: Vec3, axle: Vec3, radius: number, towards: Vec3, radialSegments = 16): BlockGeometry;
/** One mesh per material, all with `partId` and the same hit points; a mesh with no geometry is left out. */
export function blockMeshes(partId: string, blocks: readonly BlockGeometry[], materials: BoatMaterials, hitPoints: Vec3[]): THREE.Mesh[];
```

With `b = boat.modelDetail.block`, `a = normalize(axle)`, `d = normalize(towards)`, `gap = 2·boat.visual.ropeRenderRadius + b.cheekClearanceM` (0.056 m: the drawn rope fits between the cheeks with 3 mm each side), `ct = b.cheekThicknessM`:

- **Cheeks:** two discs of radius `radius`, `radialSegments` sides (`cylinderBetween`): from `centre + a·gap/2` to `centre + a·(gap/2 + ct)`, and the same on the `−a` side.
- **Sheave:** a cylinder of radius `radius·b.sheaveRadiusShare`, `radialSegments` sides, from `centre − a·(gap/2 − 0.001)` to `centre + a·(gap/2 − 0.001)`.
- **Axle pin:** a cylinder of radius `radius·b.axleRadiusShare`, 8 sides, from `centre − a·(gap/2 + ct + 0.004)` to `centre + a·(gap/2 + ct + 0.004)`.
- **Shackle:** a half ring: `new THREE.TorusGeometry(R, b.shackleWireRadiusM, 6, 12, Math.PI)` with `R = gap/2 + ct + b.shackleWireRadiusM`, turned so its local x is `a`, its local y is `d` and its local z is `cross(a, d)` (a `Matrix4.makeBasis`), and moved to `centre + d·radius·b.shackleRiseShare`. The ring then runs from the `+a` cheek over the `d` side to the `−a` cheek.

The four builders in `rig.ts` keep their centres, axles, radii, `towards` and hit points and switch from `sheaveBlock` to `blockGeometry` + `blockMeshes`:

| Builder | Part id | Radius | Extra |
|---|---|---|---|
| backstay block (`buildBackstay`) | `part_backstay` | `block.radius` | hit point: the block's centre (today it has none: add it) |
| `buildBoom` | `fit_mainsheet_boom_blocks` | `block.radius` | inside the boom's pivot group, as today |
| `buildDeckBlocks` | `fit_mainsheet_deck_blocks` | `block.radius` | the post from the roof to the block goes into `cheeks` |
| `buildTurningBlocks` | `fit_mast_base_turning_blocks` | `blockDiameter / 2` (0.045) | 12 sides, as today |

So each block set is three meshes (+8 draw calls in all). Low draws the same blocks (owner's answer 4).

### 7.4 Rounded hardware (High only)

`roundedBoxAt(centre, size, radiusM, detail)` (3.2): at High `new RoundedBoxGeometry(size[0], size[1], size[2], SCENE.boat.roundedSegments, min(radiusM, 0.45·min(size)))` translated to `centre`; at Low exactly `boxAt(centre, size)`. Used for:

| Where | Today | Radius |
|---|---|---|
| The two coamings (`hull.ts`, `cockpit()`: the `coamings` boxes) | `boxAt` | `edgeRadius.coamingM` |
| The rope tail boxes (`cockpitHardware.ts`, `buildRopeBins`: the `block`; the dark `mouth` stays a box) | `boxAt` | `edgeRadius.ropeBinM` |
| Each clutch body (`buildClutch`: `bodies`) | `boxAt` | `edgeRadius.clutchBodyM` |
| Each clutch lever (`buildClutch`: the `lever`, before its `rotateZ` and `translate`) | `boxAt` | `edgeRadius.clutchLeverM` |

`buildHull(materials, detail)`, `buildRopeBins(materials, detail)` and `buildClutch(…, materials, detail)` take the detail from `buildBoat`. The cleats (M32) are already round and stay. Everything else in these builders is unchanged.

### 7.5 Tests (`tests/blocks.test.ts`, node, three.js geometry only)

1. `blockGeometry([0,0,0], [0,0,1], 0.07, [0,1,0])`: the cheeks' bounding box spans z ±(0.028 … 0.036) (two plates: one with z from 0.028 to 0.036, one from −0.036 to −0.028; ±1e-9), x and y ±0.07; the sheave spans z ±0.027 and has radius 0.0546 (x, y ±0.0546); the shackle's highest point is at y 0.063 + 0.042 + 0.006 = 0.111 (± 0.002; `R` = 0.042), on the `towards` side.
2. The drawn rope fits: `gap/2 − ropeRenderRadius` = 0.003 m ≥ 0.002.
3. A block with `towards` (1, 0, 0) and axle (0, 1, 0) puts the shackle on +x (its box's min x > 0).
4. `blockMeshes('fit_mainsheet_deck_blocks', [g], materials, [[0,0,0]])` returns 3 meshes, each with `userData.partId` `'fit_mainsheet_deck_blocks'` and the hit point.
5. `roundedBoxAt([1,2,3], [0.4,0.2,0.1], 0.03, 'high')`: bounding box min (0.8, 1.9, 2.95), max (1.2, 2.1, 3.05) (± 1e-6) and more than 12 triangles; with `'low'` the same box and exactly the vertex count of `boxAt([1,2,3], [0.4,0.2,0.1])`.
6. `tests/boatModel.test.ts`: the boat still builds at both details, and every mesh still has a registry id (existing test).

### 7.6 Browser checks (`scripts/shots-m61.mjs`, `debug=1&held=1&sea=flat`)

Close-ups (both details, phone and desktop) with `closeUpOn`:

| Name | Link | Part | From | Distance |
|---|---|---|---|---|
| `boom-blocks` | `cam=side-port` | `fit_mainsheet_boom_blocks` | (−0.3, −0.6, −1) | 1.2 m |
| `deck-blocks` | `cam=side-port` | `fit_mainsheet_deck_blocks` | (−1, 0.8, −0.5) | 1.2 m |
| `turning-blocks` | `cam=side-port` | `fit_mast_base_turning_blocks` | (−1, 0.8, −0.6) | 1.0 m |
| `backstay-block` | `cam=side-port` | `part_backstay` (aim with `setView`: target (−5.52, 8.25, 0), position target + 1.2·normalize(−0.5, 0, −1)) | — | — |
| `clutches-port` | `cam=side-port` | `clutch_bank_b` | (0.6, 0.9, 0.8) | 1.0 m |
| `coaming-and-box-port` | `cam=side-port` | — (`setView`: target (−7.6, 1.5, −1.55), position (−6.6, 2.3, −0.4)) | — | — |

Live: each of the four block parts is still tappable: for each id, `hitCentres()` holds it, a tap there gives `sel=<id>` (`waitForLink`).

### 7.7 Done when

The blocks show cheeks, a sheave the rope sits in and a shackle at both details; the coamings, boxes and clutches have rounded edges at High and look as before at Low; taps work; typecheck, lint, tests, build, `SHOTS_ONLY=m61,m60,budget,m34` pass.

### 7.8 Not in M61

New blocks (the vang tackle, the outhaul sheave at the boom end, the jib car's sheave keep their look), the winches' shape, the cleats, the wheel and pedestal (M62).

### 7.9 Decided in the M61 PR

(nothing yet)

---

## 8. M62: Helm pedestals and panels

**Independent review: not needed** (new shapes, data and Learn texts; nothing in the store or the link; the panel shows fixed values until M63).

Study section 11, milestone 3; sections 9 and 10 (a panel on **each** wheel's pedestal, the same content on both, the autopilot keypad on it, its controls only show; the handle rests between the pedestals); owner's answer 4 (the helm panel at both detail levels).

### 8.1 Files

New: `src/model/helmPedestal.ts`, `src/model/helmPanel.ts` (the readings type and the resting values; M63 fills in the rest), `src/render3d/boat/helmPedestal.ts`, `src/render3d/boat/panelFaces.ts`, `tests/helmPedestal.test.ts`, `scripts/shots-m62.mjs`. Changed: `content/boat/hanse508.json` (8.2), `content/registry/parts.json`, `content/lang/en/glossary.json`, `content/lang/ru/glossary.json`, `src/model/glossary.ts` (`fit_compass` leaves `NOT_DRAWN`), `src/render3d/boat/cockpitHardware.ts` (`buildWheel`: the pedestal box goes, the rim and hub change), `src/render3d/boat/materials.ts` (`leather`), `src/render3d/boat/index.ts` (build the pedestals; `BoatModel.setPanelEye`), `src/render3d/scene.ts` (call `setPanelEye` each frame), `src/render3d/sceneConfig.ts` (8.5), `src/model/boatProfile.ts` (`ADDED_KEYS`), `docs/BOAT_REFERENCE.md`, `docs/review/ru.md` (regenerated), `docs/CODE_MAP.md`, `scripts/shots.mjs`.

### 8.2 Data (`content/boat/hanse508.json`)

New block `modelDetail.helmPedestal`, after `modelDetail.wheel`:

```json
"helmPedestal": {
  "source": "assumption (M62, Phase 9): no photo of the pedestal. A column just ahead of each wheel, a panel on top set a little towards the middle and facing the helmsman, a steel guard rail standing on the cockpit floor ahead of it; the same panel at both wheels (VISUAL_QUALITY_ANALYSIS 9 and 10). The engine control's look follows docs/reference/photos/engine-control.jpg.",
  "column": { "aheadOfWheelM": 0.16, "lengthM": 0.16, "widthM": 0.2, "topAboveHubM": 0.1, "edgeRadiusM": 0.03 },
  "pod": {
    "aboveColumnM": 0.06,
    "inboardM": 0.12,
    "widthM": 0.4,
    "heightM": 0.24,
    "thicknessM": 0.06,
    "faceElevationDeg": 28,
    "faceYawOutboardDeg": 6,
    "edgeRadiusM": 0.02
  },
  "faces": {
    "proudM": 0.003,
    "compass": { "u": 0, "v": 0.045, "diameterM": 0.12 },
    "wind": { "u": -0.13, "v": 0.045, "sizeM": 0.1 },
    "tachometer": { "u": 0.13, "v": 0.045, "diameterM": 0.09 },
    "keypad": { "u": -0.1, "v": -0.07, "widthM": 0.14, "heightM": 0.06 },
    "lever": { "u": 0.14, "v": -0.07, "baseM": [0.05, 0.04, 0.02], "armLengthM": 0.1, "armRadiusM": 0.007, "knobRadiusM": 0.016, "maxDeg": 45 },
    "joysticks": {
      "bow": { "u": 0.03, "v": -0.075 },
      "stern": { "u": 0.075, "v": -0.075 },
      "baseRadiusM": 0.015,
      "stickLengthM": 0.04,
      "stickRadiusM": 0.004,
      "knobRadiusM": 0.009,
      "maxTiltDeg": 25
    }
  },
  "guardRail": { "aheadOfColumnM": 0.05, "sideClearanceM": 0.04, "topAbovePodM": 0.06, "tubeRadiusM": 0.0125, "bendRadiusM": 0.05 },
  "handleRest": { "padM": [0.36, 0.004, 0.16], "stopM": [0.02, 0.025, 0.14], "stopGapM": 0.03 }
}
```

`modelDetail.wheel` gains `"hubCapRadiusM": 0.05`. Sizes and places are **tunable** (they are guesses); `faces.lever.maxDeg` and `faces.joysticks.maxTiltDeg` are used from M63 on. `ADDED_KEYS` gains `'modelDetail.helmPedestal'` and `'modelDetail.wheel.hubCapRadiusM'`. `modelDetail.wheel.pedestalWidth` stays (the hub's length into the column uses it, as today).

### 8.3 Model (`src/model/helmPedestal.ts`, pure)

```ts
export interface PanelFrame {
  /** A point (the pod's middle, or the face's middle). */
  centre: Vec3;
  /** Unit vectors: u to the helmsman's right, v up the face, w out of the face towards the helmsman. u × v = w. */
  u: Vec3; v: Vec3; w: Vec3;
}
export interface HelmPedestalGeometry {
  helmId: string;
  side: 1 | -1;
  /** Axis-aligned: centre and size (x, y, z). */
  column: { centre: Vec3; size: Vec3 };
  /** The pod box: its middle and frame; size along u, v, w. */
  pod: PanelFrame & { size: Vec3 };
  /** The face (the pod's side towards the helmsman): pod.centre + w·thickness/2, same u, v, w. */
  face: PanelFrame;
  /** The middle of each instrument on the face plane (proudM not added). */
  compass: Vec3; wind: Vec3; tachometer: Vec3; keypad: Vec3; lever: Vec3; joystickBow: Vec3; joystickStern: Vec3;
  /** The guard rail's centre line, corners rounded. */
  guardRail: Vec3[];
}
export function helmPedestal(helmId: string, data: BoatData = boat): HelmPedestalGeometry;
/** A point on a frame's plane: centre + u·du + v·dv + w·dw. */
export function framePoint(frame: PanelFrame, du: number, dv: number, dw?: number): Vec3;
/** The winch handle's rest between the wheels: the pad and the two stops, axis-aligned boxes. */
export function handleRest(data: BoatData = boat): { pad: { centre: Vec3; size: Vec3 }; stops: { centre: Vec3; size: Vec3 }[] };
```

With `h` = the helm of `cockpitHardware.helms` with that id (throw if there is none), `p = modelDetail.helmPedestal`, `s = sign(h.z)` (+1 starboard), `hub = cockpitHardware.wheelHubY`, `sole = deck.cockpit.soleY`:

- **Column:** `topY = hub + p.column.topAboveHubM` (1.95); centre `(h.x + p.column.aheadOfWheelM, (sole + topY)/2, h.z)`, size `(p.column.lengthM, topY − sole, p.column.widthM)`. Port: centre (−7.04, 1.475, −0.88), size (0.16, 0.95, 0.2).
- **Pod:** centre `(h.x + p.column.aheadOfWheelM, topY + p.pod.aboveColumnM, h.z − s·p.pod.inboardM)` (port (−7.04, 2.01, −0.76)). With `e = faceElevationDeg`, `y = faceYawOutboardDeg`: `w = (−cos e·cos y, sin e, s·cos e·sin y)` (the face looks aft, up and a little outboard, at the helmsman behind the wheel), `u = normalize(cross([0,1,0], w))`, `v = cross(w, u)`. Size `(widthM, heightM, thicknessM)`.
- **Face:** centre `pod.centre + w·thicknessM/2`.
- **Instruments:** `framePoint(face, f.u, f.v)` for `compass`, `wind`, `tachometer`, `keypad`, `lever` and the two joysticks (`faces.joysticks.bow`, `.stern`).
- **Guard rail:** `rx = column.centre.x + lengthM/2 + guardRail.aheadOfColumnM` (−6.91); `zA = pod.centre.z − (widthM/2 + sideClearanceM)`, `zB = pod.centre.z + (widthM/2 + sideClearanceM)`; `yTop` = the highest y of the pod box's eight corners + `topAbovePodM`; raw line `[(rx, sole, zA), (rx, yTop, zA), (rx, yTop, zB), (rx, sole, zB)]`, then `roundCorners(raw, bendRadiusM, 4, 0.45)` (M60) → 10 points. (It stands on the cockpit floor ahead of the pedestal, an inverted U round the front of the panel.)
- **Handle rest:** with `r = modelDetail.winchHandle.rest.helm`, `L = realisticMode.winchHandle.lengthM`, `g = modelDetail.winchHandle.gripLength`, `q = p.handleRest`: the pad's centre `(r.x, sole + q.padM[1]/2, r.z + g/2)`, size `q.padM`; two stops, centres `(r.x ∓ (L/2 + q.stopGapM), sole + q.stopM[1]/2, r.z + g/2)`, size `q.stopM`. (The handle's stowed helm pose of M50 lies on the pad between the stops: its arm runs from x `r.x − L/2` to `r.x + L/2` and its grip from z `r.z` to `r.z + g`.)

**`src/model/helmPanel.ts` (pure; M63 adds `panelReadings`):**

```ts
export type ThrustDir = -1 | 0 | 1;
export interface PanelReadings {
  headingDeg: number;      // [0, 360)
  awaDeg: number;          // (−180, 180], + from starboard
  awsKn: number;
  rpm: number;
  running: boolean;
  leverPct: number;        // −100 … 100, + ahead
  bow: ThrustDir;          // −1 to port, +1 to starboard, 0 let go
  stern: ThrustDir;
  autopilot: 'off' | 'heading' | 'wind';
  /** The keypad's display line (9.3). */
  courseText: string;
}
export const PANEL_AT_REST: Readonly<PanelReadings> = {
  headingDeg: 0, awaDeg: 0, awsKn: 0, rpm: 0, running: false, leverPct: 0, bow: 0, stern: 0,
  autopilot: 'off', courseText: 'STANDBY',
};
```

(`ThrustDir` is re-exported from `src/model/thrusters.ts` if it already exists there with the same values; do not define it twice.)

### 8.4 3D (`src/render3d/boat/helmPedestal.ts`, `panelFaces.ts`, `cockpitHardware.ts`, `index.ts`)

`buildHelmPedestals(materials: BoatMaterials, detail: Detail): HelmPedestals`, called by `buildBoat` after `buildCockpitHardware`:

```ts
export interface HelmPedestals {
  objects: THREE.Object3D[];
  /** Hides each panel's instrument meshes when `eye` (boat frame) is farther than SCENE.helmPanel.showWithinM from its pod. */
  setEye(eye: Vec3): void;
  /** Redraws the faces and poses the lever and joysticks (M62 calls it once with PANEL_AT_REST). */
  show(readings: PanelReadings): void;
}
```

Per helm (`helmPedestal(helm.id)`), all meshes built in the boat frame:

| Mesh | Shape | Material | Id |
|---|---|---|---|
| Column | `roundedBoxAt(column.centre, column.size, column.edgeRadiusM, detail)` | `materials.dark` | `fit_helm_pedestal` |
| Pod | `roundedBoxAt([0,0,0], pod.size, pod.edgeRadiusM, detail)` turned by the basis `(u, v, w)` (`Matrix4.makeBasis`) and moved to `pod.centre` | `materials.gelcoat` (the white moulding of the photo) | `fit_helm_pedestal` |
| Guard rail | `cylinderBetween` between each pair of consecutive `guardRail` points, radius `tubeRadiusM`, 8 sides at High, 6 at Low | `materials.chrome` | `fit_helm_pedestal` |
| Compass face | `CircleGeometry(diameterM/2, 32)` in the face plane at `compass + w·proudM` | `MeshBasicMaterial({ map: compassTexture })` | `fit_compass` |
| Wind face | `PlaneGeometry(sizeM, sizeM)` at `wind + w·proudM` | basic, `windTexture` | `fit_instrument_display` |
| Tachometer face | `CircleGeometry(diameterM/2, 32)` at `tachometer + w·proudM` | basic, `tachTexture` | `engine_control` |
| Keypad face | `PlaneGeometry(widthM, heightM)` at `keypad + w·proudM` | basic, `keypadTexture` | `fit_autopilot_control` |
| Lever | a `THREE.Group` at `lever + w·proudM` whose quaternion maps its local x, y, z to `u`, `v`, `w` (`Matrix4.makeBasis(u, v, w)`); in local coordinates: a base box `baseM` centred at (0, 0, `baseM[2]/2`), and a child mesh `arm` built along local +z (a cylinder of `armRadiusM` from z = `baseM[2]` to `baseM[2] + armLengthM`, a knob sphere of `knobRadiusM`, 12 × 8, at its end) whose `rotation.x = −a·DEG` with `a = leverPct/100·maxDeg` (the arm then points along `cos a·w + sin a·v`: ahead leans it forward). M62: a = 0. | base and arm `materials.dark` | `engine_control` (base and arm each a `smallPartMesh` with a hit point at the knob, in the arm's local frame) |
| Joysticks | for each end the boat has (`hasThruster(end)`, M57) a `THREE.Group` at its point + `w·proudM` with the same basis as the lever: a base disc (`baseRadiusM`, 0.006 thick along local z) and a child mesh `stick` built along local +z (a cylinder of `stickRadiusM` from z = 0.006 for `stickLengthM`, a knob sphere of `knobRadiusM` at its end) whose `rotation.y = b·DEG` with `b = dir·maxTiltDeg` (the stick then leans along `cos b·w + sin b·u`: +1 to starboard, the helmsman's right). M62: b = 0. A boat without thrusters has none. | `materials.dark` | `fit_thruster_joysticks` (base and stick each a `smallPartMesh` with a hit point at the knob) |

The four face materials share one `CanvasTexture` per instrument for **both** panels (drawn once, used twice). Their meshes get `renderOrder = 1` and the materials `polygonOffset: true, polygonOffsetFactor: −1`, so they never flicker on the pod. Every mesh is a `partMesh` / `smallPartMesh` with a hit point at its middle (the lever's and each joystick's at the knob).

The wheel (`buildWheel` in `cockpitHardware.ts`): the old pedestal box and its return value go (the column above replaces it); the rim uses the new `materials.leather` (colour `SCENE.boat.leather` `#3a2b22`, roughness 0.85, at both details); the spokes and the hub keep `materials.dark`; a hub cap is added on the hub's aft end: a half sphere (`SphereGeometry(hubCapRadiusM, 16, 8, 0, 2π, 0, π/2)` turned so its dome points aft, −x) at the hub's aft end, `materials.chrome`. The wheel's meshes keep the id `helm_port` / `helm_starboard` and their rim pick segments.

The handle rest (`handleRest()`): the pad and the two stops as `roundedBoxAt` boxes (radius 0.002 for the pad, 0.004 for the stops), `materials.dark`, id `fit_winch_handle_rest`, one `smallPartMesh` with a hit point at the pad's centre.

**Faces at rest (`src/render3d/boat/panelFaces.ts`).** Canvases: compass, wind and tachometer `SCENE.helmPanel.facePx` (256 × 256), keypad 256 × 128. The words are the instrument's own (3.1). Fonts `bold <n>px system-ui, sans-serif`.

```ts
export function drawCompass(ctx: CanvasRenderingContext2D, headingDeg: number): void;
export function drawWind(ctx: CanvasRenderingContext2D, awaDeg: number, awsKn: number): void;
export function drawTach(ctx: CanvasRenderingContext2D, rpm: number, running: boolean): void;
export function drawKeypad(ctx: CanvasRenderingContext2D, mode: PanelReadings['autopilot'], courseText: string): void;
```

- **Compass** (256 px, centre 128, 128): black disc radius 126. The card, turned by `−headingDeg` about the centre: ticks every 10° from radius 112 to 122 (white, 2 px), every 30° from 100 to 122 (3 px); at 0°, 90°, 180°, 270° the letters `N`, `E`, `S`, `W` (28 px, `N` in `#e0392f`, the others white) at radius 82; at the other multiples of 30° the number in tens (`3`, `6`, `12`, `15`, `21`, `24`, `30`, `33`; 20 px, white) at radius 82. Not turned: an orange (`#ff8a1f`) triangle at the top (points (128, 4), (118, 22), (138, 22)): the lubber line (the heading is read under it).
- **Wind** (256 px): background `#101418`; a ring radius 100 (2 px, `#8a939c`); a red arc (`#d6453d`, 8 px, radius 100) from −60° to −20° and a green one (`#2fa05a`) from 20° to 60° (0° at the top, clockwise); a small white boat shape in the middle pointing up (a closed path through (128, 92), (142, 130), (136, 162), (120, 162), (114, 130)); a yellow (`#ffd23f`, 5 px) needle from the centre to radius 92 at `awaDeg` (0 up, clockwise); top-left text `AWA` (18 px, `#8a939c`) at (16, 28) and the angle `|round(awaDeg)|°` (30 px, white) at (16, 60); bottom text `AWS <one decimal> kn` (24 px, white) centred at (128, 238).
- **Tachometer** (256 px): black disc radius 126; the scale is the Engine section's (`src/ui/enginePanel.ts`, `TACH`: 0 … 3,000 rpm over the upper half circle, 0 on the left, 3,000 on the right): an arc radius 100 (3 px, white), a red arc (`#d6453d`, 6 px) from 2,500 to 3,000, ticks every 500 rpm (radius 88 to 100), the numbers `0`, `1`, `2`, `3` (20 px) at 0, 1,000, 2,000 and 3,000 rpm, radius 72, and `RPM ×1000` (16 px, `#8a939c`) centred at (128, 150); a white needle (4 px) from the centre to radius 92 at the rpm's angle (`π·(1 − min(rpm, 3000)/3000)` from the left, as `tachPoint` in `enginePanel.ts`); under it `START` and `STOP` (16 px) at (84, 200) and (172, 200), each over a small dot (radius 6) at (84, 216) and (172, 216): the START dot `#2fa05a` while `running`, else `#3a3f45`; the STOP dot always `#3a3f45`.
- **Keypad** (256 × 128): background `#1b1f24`; a display strip (8, 8)–(248, 56) `#0e2a1f` with `courseText` (24 px, `#7dffb5`) centred in it; two keys (16, 70)–(120, 118) `STBY` and (136, 70)–(240, 118) `AUTO` (20 px), the key of the mode lit (`#ffb000` background, black text; `heading` and `wind` light AUTO, `off` lights STBY), the other `#2c3239` with white text.

M62 calls `show(PANEL_AT_REST)` once after building, so the faces show the resting values (0° heading, no wind, 0 rpm, STANDBY).

**Hidden when far.** `SCENE.helmPanel.showWithinM` = 6.0 (**tunable**). `BoatModel.setPanelEye(eye: Vec3)` forwards to `setEye`; for each panel, its instrument meshes (the four faces, the lever, the joysticks) get `visible = (distance(eye, pod.centre) ≤ showWithinM)`; the column, pod and rail always show. `scene.ts` calls it every frame with the camera position in the boat frame (`boatModel.root.worldToLocal(camera.position.clone())`).

### 8.5 `SCENE` additions (`src/render3d/sceneConfig.ts`)

```ts
// in SCENE.boat (the colour table):
leather: '#3a2b22',
// new top-level block, after SCENE.ropes:
helmPanel: {
  /** M62: the panel's instruments are hidden when the camera is farther than this from the pod, metres. */
  showWithinM: 6.0,
  /** Canvas size of the round faces and the wind display, px (the keypad is facePx × facePx/2). */
  facePx: 256,
},
```

### 8.6 Strings, registry and Learn

Registry (`content/registry/parts.json`, after `fit_instrument_display`), all `"kind": "fitting"`, `"phase": 9`, `"group": "cockpit"`, `"status": "draft"`:

| Id | Sources | Related | showMe |
|---|---|---|---|
| `fit_helm_pedestal` | `["owner"]` | `helm_port`, `helm_starboard`, `fit_compass`, `engine_control`, `fit_autopilot_control` | `?cam=helm&sel=fit_helm_pedestal&held=1&sea=flat` |
| `fit_thruster_joysticks` | `["owner"]` | `part_bow_thruster`, `part_stern_thruster`, `engine_control` | `?m=harbour&cam=helm&sel=fit_thruster_joysticks&held=1&sea=flat` |
| `fit_winch_handle_rest` | `["owner"]` | `part_winch_handle`, `helm_port` | `?mode=realistic&hd=helm.s&cam=helm&sel=fit_winch_handle_rest&held=1&sea=flat` |

`fit_compass` leaves `NOT_DRAWN` (`src/model/glossary.ts`); it is drawn now. `fit_compass`, `engine_control`, `fit_instrument_display` and `fit_autopilot_control` keep their entries (M63 updates their "On this boat").

English glossary (`content/lang/en/glossary.json`, `textStatus: "draft"`):

- `fit_helm_pedestal`: name "Wheel pedestal"; alternatives `[{ "term": "binnacle" }]`; short "The column in front of each wheel that carries the compass and the controls."; what "The wheel's axle runs into the pedestal. On top sits a small panel with the compass and the instruments, and a steel guard rail in front of it gives you something to hold and keeps knees and ropes off the instruments."; onThisBoat "One pedestal at each wheel, each with the same panel: the compass, the wind display, the engine lever and the rev counter, the thruster joysticks and the autopilot keys. The drawing is a guess: there is no photo of the pedestal yet."
- `fit_thruster_joysticks`: name "Thruster joysticks"; alternatives `[]`; short "Two small sticks that push the bow or the stern sideways."; what "While you push a stick to one side, its thruster (a propeller in a tunnel through the hull) pushes that end of the boat that way. One stick is for the bow thruster, one for the stern thruster. They help at low speed in a marina; at more than a few knots they do little."; onThisBoat "Two joysticks at the helm, one for each thruster. In the app the Engine section and the quick row work the thrusters."
- `fit_winch_handle_rest`: name "Winch handle rest"; alternatives `[]`; short "Where the winch handle lies at the helm."; what "A winch handle left loose can slide away or go over the side, so it is kept in a holder or a pocket when it is not in a winch."; onThisBoat "In the app the handle lies on a pad on the cockpit floor between the two wheels, between two small stops."

Russian (`content/lang/ru/glossary.json`): names «колонка штурвала», «джойстики подруливающих устройств», «место для ручки лебёдки»; the texts are drafts written by the builder (0). Then `npm run review-doc -- ru`.

### 8.7 Tests (`tests/helmPedestal.test.ts`)

Coordinates ± 0.0005 unless stated.

1. Port column: centre (−7.04, 1.475, −0.88), size (0.16, 0.95, 0.2).
2. Port pod centre (−7.04, 2.01, −0.76); `w` (−0.8781, 0.4695, −0.0923), `u` (−0.1045, 0, 0.9945), `v` (0.4669, 0.8829, 0.0491) (± 0.0001); each unit length, pairwise at right angles (|dot| < 1e-9), `cross(u, v)` = `w` (± 1e-9).
3. Port face centre (−7.0663, 2.0241, −0.7628); compass (−7.0453, 2.0638, −0.7606), wind (−7.0317, 2.0638, −0.8898), tachometer (−7.0589, 2.0638, −0.6313), keypad (−7.0886, 1.9623, −0.8657), lever (−7.1137, 1.9623, −0.6270).
4. Starboard: pod centre (−7.04, 2.01, 0.76), `w` (−0.8781, 0.4695, 0.0923), `u` (0.1045, 0, 0.9945); wind (−7.0589, 2.0638, 0.6313), tachometer (−7.0317, 2.0638, 0.8898) (the layout is the same as seen from behind the wheel: the wind on the left, the rev counter on the right).
5. The pod clears the wheel: every pod corner has x > helm.x + `wheel.rimTubeRadius` + 0.02 (port and starboard; the smallest is −7.1433).
6. The pod sits on the column: the lowest pod corner's y (1.89) is below the column's top (1.95).
7. Guard rail (port): 10 points; the first (−6.91, 1.0, −1.0), the last (−6.91, 1.0, −0.52); every x = −6.91; highest y ≤ 2.19; the rail is ahead of the pod: −6.91 − `tubeRadiusM` > the pod's largest corner x (−6.9367).
8. Handle rest: pad centre (−7.2, 1.002, 0.05); stops at x −7.357 and −7.043; the M50 helm stowed pose (`handlePose` with `{ place: 'stowed', station: 'helm' }`) has its spigot end x (origin.x − `spigotDiameter`/2) > −7.347 and its grip's outer x (origin.x + L + `gripDiameter`/2) < −7.053.
9. Another boat: with a clone whose `cockpitHardware.helms` z are ±1.0, the port pod centre z is −0.88 and the column's z −1.0.
10. `helmPedestal('helm_none')` throws.
11. `tests/glossary.test.ts` / `tests/registry.test.ts`: green with the three new ids (existing tests).

### 8.8 Browser checks (`scripts/shots-m62.mjs`, `debug=1&held=1&sea=flat`)

Close-ups (both details, phone and desktop), with `__sailDebug.setView(position, target, fov)`:

| Name | Link | Target | Position | Fov |
|---|---|---|---|---|
| `panel-port` | `cam=helm` | (−7.0663, 2.0241, −0.7628) | (−7.856, 2.447, −0.846) | 40 |
| `panel-starboard` | `cam=helm` | (−7.0663, 2.0241, 0.7628) | (−7.856, 2.447, 0.846) | 40 |
| `pedestals-from-aft` | `cam=helm` | (−7.0, 1.6, 0) | (−9.0, 2.8, 0) | 50 |
| `pedestal-side` | `cam=helm` | (−7.0, 1.6, −0.8) | (−7.2, 2.2, −2.4) | 45 |
| `handle-rest` | `mode=realistic&hd=helm.s&cam=helm` | (−7.2, 1.0, 0.05) | (−7.7, 1.8, 0.75) | 40 |

Live (phone, then desktop), from the `panel-port` view: for each of `fit_compass`, `fit_instrument_display`, `engine_control`, `fit_autopilot_control`, `fit_thruster_joysticks`, `fit_helm_pedestal`, a tap on its `hitCentres()` point gives `sel=<id>`; from `?debug=1&held=1&sea=flat&cam=side-port` (camera far away) `hitCentres()` has no `fit_compass` (hidden beyond 6 m); `?m=learn&learn=fit_compass` shows the `learn-show-on-boat` button ("Where is it?") and tapping it starts the spotlight (`__sailDebug.spotlight()` not null).

### 8.9 Done when

Both wheels have a pedestal, a panel with the five instruments (joysticks only for the thrusters the boat has), a guard rail; the wheel has a leather rim and a hub cap; the handle lies on its rest in Realistic; the faces show the resting values; taps and Learn work; typecheck, lint, tests, build, `SHOTS_ONLY=m62,m50,budget` pass (M50 checks the handle at the helm).

### 8.10 Not in M62

Live values (M63), the Helm camera's new directions (M64), the B&G multifunction display, a chart or map, a cockpit table, a bimini.

### 8.11 Decided in the M62 PR

- Decided in planning (recommended; merging accepts it): both panels show the same instruments, the engine control included (study 9; on the real boat it is probably at one wheel only; a teaching simplification, written as an assumption in `BOAT_REFERENCE.md`).

---

## 9. M63: Live panel

**Independent review: required** (the 3D view now reads the boat's heading, wind, engine, thrusters and autopilot every frame; a wrong sign or a stale value would teach the wrong thing; the redraw rule decides the phone's frame cost).

Study section 11, milestone 4; owner's answers 2 (live data) and 10.3 (the panel only shows: the Engine section, the Autopilot section and the quick row stay the controls).

### 9.1 Files

New: `tests/helmPanel.test.ts`, `scripts/shots-m63.mjs`. Changed: `src/model/helmPanel.ts` (9.3), `src/render3d/boat/helmPedestal.ts` (the redraw rule, the poses), `src/render3d/boat/panelFaces.ts` (only if a drawing needs a fix), `src/render3d/boat/index.ts` (`BoatModel.showPanel`), `src/render3d/scene.ts` (call it each frame; debug hooks), `src/render3d/sceneConfig.ts` (9.4), both `glossary.json` (9.5), `docs/review/ru.md` (regenerated), `docs/CODE_MAP.md`, `scripts/shots.mjs`.

### 9.2 Data

No boat-file change. `SCENE.helmPanel` gains:

```ts
/** M63: the faces are redrawn at most this often, and only while the camera is within liveWithinM of a pod. */
redrawHz: 5,
liveWithinM: 4.0,
```

(both **tunable**).

### 9.3 Model (`src/model/helmPanel.ts`, pure)

```ts
export type PanelSource = Pick<AppState, 'boat' | 'rig' | 'engine' | 'thrusters' | 'autopilot'>;
export function panelReadings(state: PanelSource, data: BoatData = boat): PanelReadings;
export function courseText(autopilot: AutopilotState): string;
/** Rounded values: two readings with the same key draw the same faces. One key per face. */
export function readingsKeys(r: PanelReadings): { compass: string; wind: string; tachometer: string; keypad: string };
export function leverAngleDeg(leverPct: number, data: BoatData = boat): number;
export function joystickTiltDeg(dir: ThrustDir, data: BoatData = boat): number;
/** The tachometer needle: radians from the left end of the half-circle scale (the Engine section's TACH). */
export function tachNeedleRad(rpm: number): number;
```

(`AppState` is imported as a type only, from `src/app/store.ts`, as other model files that read the state shape do; if no model file does that yet, declare `PanelSource` with the five fields' own types instead: `BoatState`, `RigState`, `EngineState`, `ThrusterState`, `AutopilotState`.)

- `headingDeg`: `state.boat.headingDeg` normalised to [0, 360) (`((h % 360) + 360) % 360`).
- `awaDeg`, `awsKn`: `state.rig.wind.awaDeg`, `state.rig.wind.awsKn` (the values the wind dial of the instrument strip shows).
- `rpm`, `running`, `leverPct`: `state.engine.rpm`, `.running`, `.leverPct`.
- `bow`, `stern`: `state.thrusters.bow`, `.stern`.
- `autopilot`: `state.autopilot.mode`; `courseText(state.autopilot)`:
  - `off` → `STANDBY`;
  - `heading` → `HDG ` + the target rounded to a whole degree, mod 360, three digits, + `°` (`HDG 045°`, `HDG 000°` for 359.6);
  - `wind` → `WIND ` + `|round(targetDeg)|` + `° ` + `S` when `targetDeg ≥ 0` (wind from starboard), else `P` (`WIND 40° S`, `WIND 135° P`).
- `readingsKeys`: compass `round(headingDeg)`; wind `round(awaDeg)` and `round(awsKn·10)`; tachometer `round(rpm/10)` and `running`; keypad `autopilot` and `courseText` (each joined with `|`).
- `leverAngleDeg(p)` = `p/100 · modelDetail.helmPedestal.faces.lever.maxDeg`; `joystickTiltDeg(d)` = `d · faces.joysticks.maxTiltDeg`.
- `tachNeedleRad(rpm)` = `π · (1 − min(max(rpm, 0), 3000)/3000)` (0 rpm: π, on the left; 3,000: 0, on the right; the same as `tachPoint` in `src/ui/enginePanel.ts`).

The panel shows the same values in Held still, Sailing, Harbour and Realistic, with Easy or Realistic ropes: it reads the state, it never changes it.

### 9.4 3D (`src/render3d/boat/helmPedestal.ts`, `index.ts`, `scene.ts`)

`BoatModel.showPanel(readings: PanelReadings, eye: Vec3, nowMs: number)` replaces M62's separate `setPanelEye` (keep `setPanelEye` as the part of it that sets `visible`). Each frame `scene.ts` calls it with `panelReadings(state)`, the camera position in the boat frame (8.4) and the frame's time (the same `now` the frame loop passes on; on the test clock it is the test clock's).

- `near` = the smallest distance from `eye` to the two pods' centres.
- **Visibility** (M62): each panel's instruments show when within `showWithinM` (6 m) of its pod.
- **Lever and joysticks** (cheap, every frame while `near ≤ showWithinM`): the lever arm's `rotation.x = −leverAngleDeg(leverPct)·DEG`; each stick's `rotation.y = joystickTiltDeg(dir)·DEG`.
- **Faces** (canvases): only when `near ≤ liveWithinM` **and** at least `1000/redrawHz` ms have passed since the last redraw; then each face whose key (`readingsKeys`) differs from the key it was last drawn with is redrawn (`drawCompass` / `drawWind` / `drawTach` / `drawKeypad` with the readings) and its texture gets `needsUpdate = true`. Both panels share the textures (one redraw serves both). Beyond `liveWithinM` nothing is redrawn: the faces keep the last values drawn.
- The redraw time is taken when at least one face was redrawn.

Debug hooks (`window.__sailDebug`, `debug=1`):

- `panelShown(): { readings: PanelReadings; redraws: number }`: the readings the faces were last drawn with (`PANEL_AT_REST` until the first live redraw) and how many redraw rounds have run since the boat was built.
- `panelPose(): { leverDeg: number; bowDeg: number; sternDeg: number }`: the angles last applied (0 for a joystick the boat does not have).

### 9.5 Learn texts

English `onThisBoat` (`content/lang/en/glossary.json`; the Russian drafts follow, written by the builder):

- `fit_compass`: "One compass on the panel in front of each wheel. In the app its card turns as the boat turns: read the heading under the orange mark at the top."
- `fit_instrument_display`: "A B&G display at the helm. In the app each helm panel has a wind display with AWA and AWS, the wind the sails feel; the strip at the top of the 3D view shows the same numbers and more (tap it for the wind dial)."
- `engine_control`: today's text, then one more sentence: " On each helm panel the lever stands where the Engine section's lever is, and the rev counter beside it shows the rpm."
- `fit_autopilot_control`: "A B&G control at the helm. On each helm panel of the app its keys show the mode (STBY lit on Standby, AUTO lit while it steers) and the line above them the course it holds. The Autopilot section is where you work it."

### 9.6 Tests (`tests/helmPanel.test.ts`)

1. `panelReadings` of `initialState()` (store): `headingDeg` equals the state's (normalised), `awaDeg` and `awsKn` equal `state.rig.wind`'s, `autopilot` equals `state.autopilot.mode`.
2. Heading −10 → 350; 370 → 10; 0 → 0.
3. `courseText`: off → `STANDBY`; heading 45.4 → `HDG 045°`; 359.6 → `HDG 000°`; 7 → `HDG 007°`; wind 40 → `WIND 40° S`; −135.2 → `WIND 135° P`; wind 0 → `WIND 0° S`.
4. Engine and thrusters are copied: `{ running: true, rpm: 1850, leverPct: 66 }` and `{ bow: 1, stern: -1 }`.
5. `readingsKeys`: headings 90.2 and 90.4 give the same compass key, 90.2 and 91.0 different; rpm 1,851 and 1,849 the same tachometer key (185), 1,851 and 1,866 different; AWS 12.31 and 12.34 the same wind key, 12.31 and 12.36 different.
6. `leverAngleDeg`: 100 → 45, −100 → −45, 66 → 29.7, 0 → 0. `joystickTiltDeg`: 1 → 25, −1 → −25, 0 → 0.
7. `tachNeedleRad`: 0 → π, 1,500 → π/2, 3,000 → 0, 4,000 → 0, −50 → π.

### 9.7 Browser checks (`scripts/shots-m63.mjs`, test clock, `debug=1&sea=flat`)

Live (phone, then desktop):

1. `?debug=1&held=1&sea=flat&cam=helm&hdg=90`: after 1,000 ms `panelShown().readings.headingDeg` is 90 and `redraws` ≥ 1.
2. `?debug=1&held=1&sea=flat&cam=helm&eng=1&lv=66`: after 3,000 ms `readings.rpm` is between 1,800 and 1,900, `readings.leverPct` 66, `panelPose().leverDeg` 29.7 ± 0.1.
3. Far: `?debug=1&held=1&sea=flat&cam=side-port&hdg=90`: after 1,000 ms `panelShown()` is `{ readings: PANEL_AT_REST values, redraws: 0 }` (the camera is more than 4 m from both pods).
4. Autopilot: `?debug=1&sea=flat&cam=helm&ws=12&wd=60&ap=hdg&hdg=45`: after 1,000 ms `readings.autopilot` `'heading'` and `readings.courseText` `HDG 045°`.
5. Thruster: `?debug=1&held=1&sea=flat&m=harbour&cam=helm`: hold the D key (bow thruster to starboard, M41) for 500 ms: `readings.bow` 1 and `panelPose().bowDeg` 25; release: within 500 ms both 0.
6. Redraw rate: `?debug=1&sea=flat&cam=helm&ws=15&wm=gusty`: read `redraws`, wait 2,000 ms, read again: the difference is at most 11 (5 a second, plus one).

Close-ups (both details, phone and desktop; the M62 `panel-port` view): `live-panel-sailing` (`?debug=1&sea=flat&cam=helm&ws=12&wd=60&ap=hdg&hdg=90&eng=1&lv=66`, after 3,000 ms) and `live-panel-harbour` (`?debug=1&held=1&sea=flat&m=harbour&cam=helm`, D held).

### 9.8 Done when

Turning the boat turns the compass card, the wind display follows the apparent wind, the rev counter and the lever follow the engine, the joysticks lean while a thruster is held, the keypad shows the autopilot's mode and course; nothing is redrawn while the camera is away; typecheck, lint, tests, build, `SHOTS_ONLY=m63,m62,budget` pass, and the frame time on the phone with the Helm view is no worse than before M63 (the PR states both numbers from `?debug=1&cam=helm&detail=high`).

### 9.9 Not in M63

Working the controls by a tap in 3D (owner, 10.3), the B&G display, a depth or speed display on the panel (the strip shows them), night lighting of the instruments.

### 9.10 Decided in the M63 PR

- Decided in planning (recommended; merging accepts it): the instrument faces carry their own English markings in every language (3.1), as real instruments do.

---

## 10. M64: Helm camera

**Independent review: required** (new camera state in the store and the link, old links, the camera rig's glide, and buttons over the 3D view on every layout).

Study section 11, milestone 5, and section 9 ("The Helm camera in more detail"): either wheel, Ahead / Panel / Ropes, Other wheel, smooth turns, two link keys; dragging leaves the directions as it leaves a preset today.

### 10.1 Files

New: `src/ui/helmViews.ts`, `scripts/shots-m64.mjs`. Changed: `src/model/settings.ts` (4.1), `src/app/store.ts` (10.4), `src/app/urlState.ts` (4.2), `src/render3d/cameraPresets.ts` (`helmPose` exported, `PresetOptions.helm`), `src/render3d/cameraRig.ts` (`setHelmView`, the straight glide), `src/render3d/scene.ts` (10.5), `src/render3d/sceneConfig.ts` (10.3), `src/app/app.ts` (create the buttons), `src/style.css` (10.6), both `ui.json`, `tests/cameraPresets.test.ts`, `tests/urlState.test.ts`, `tests/store.test.ts`, `scripts/ui.mjs` (`helmView`), `docs/CODE_MAP.md`, `scripts/shots.mjs`.

### 10.2 State and actions

`CameraState`, `HelmView`, `HelmWheel`, `HelmLook` and `DEFAULT_HELM_VIEW` as 4.1; `DEFAULT_CAMERA` becomes `{ preset: 'side-port', helm: DEFAULT_HELM_VIEW }`. Every place that builds a `CameraState` gives `helm` (the store's `initialState`, `load`, `parseUrlState`).

New action `{ type: 'setHelmView'; wheel?: HelmWheel; look?: HelmLook }`: `camera.helm` becomes `{ ...camera.helm, ...given fields }` and `camera.preset` becomes `'helm'`. `setCameraPreset` with `preset: 'helm'` also sets `camera.helm.look = 'ahead'` and keeps the wheel ("Helm opens the last-used wheel looking Ahead"); any other preset leaves `camera.helm` as it is. `reset` returns `camera.helm` to the default with the rest of the camera.

### 10.3 Poses (`src/render3d/cameraPresets.ts`)

```ts
export interface PresetOptions { topBowUp?: boolean; /** M64 */ helm?: HelmView }
export function helmPose(view: HelmView, data: BoatData = boat): CameraPose;
```

`presetPose('helm', lens, options, data)` returns `helmPose(options.helm ?? DEFAULT_HELM_VIEW, data)`; today's private `helmPose(data)` goes.

With `cam = SCENE.camera`, `h` = the helm with id `helm_<view.wheel>` (if the boat has none, `cockpitHardware.helms[0]`), `s = sign(h.z)`, eye `E = (h.x − cam.helmBehindWheel, deck.cockpit.soleY + cam.helmEyeHeight, h.z)`, `d = cam.helmLookDownDeg`, `y = cam.helmYawToPortDeg` (the name stays; it is now the yaw towards the wheel's own side):

| Look | Position | Target | fovDeg |
|---|---|---|---|
| `ahead` | `E` | `E + cam.helmTargetDistance · (cos d·cos y, −sin d, s·cos d·sin y)` | `cam.helmVerticalFovDeg` (64) |
| `panel` | `E` | `helmPedestal(h.id, data).face.centre` (M62) | `cam.helmPanelFovDeg` (44) |
| `ropes` | `E` | `(w.x + cam.helmRopesAheadOfWinchM, w.y + cam.helmRopesAboveWinchM, w.z)` with `w` = the winch on that side (`present !== false`, `sign(w.z) = s`, the smallest `|w.x − h.x|`); if there is none, the `ahead` target | `cam.helmRopesFovDeg` (56) |

New keys in `SCENE.camera` (after `helmVerticalFovDeg`): `helmPanelFovDeg: 44`, `helmRopesFovDeg: 56`, `helmRopesAheadOfWinchM: 0.35`, `helmRopesAboveWinchM: 0.05` (all **tunable**). For the port wheel Ahead this is exactly today's pose (s = −1).

### 10.4 Link (`src/app/urlState.ts`)

4.2: parse `hw` (`p` → port, `s` → starboard, anything else → port) and `hl` (`a`, `p`, `r` → ahead, panel, ropes; anything else → ahead) into `camera.helm`, whatever `cam` is. Write them right after `cam=`: `hw=s` only when `cam` is `helm` and the wheel is starboard, `hl=p` / `hl=r` only when `cam` is `helm` and the look is not Ahead. A link that opens with `cam=helm` and an `hl` keeps that look (the load does not go through `setCameraPreset`).

### 10.5 Camera rig and scene (`src/render3d/cameraRig.ts`, `scene.ts`)

- `CameraRig.setHelmView(view: HelmView, animate: boolean): void`: stores `view` in the rig's preset options (`options = { ...options, helm: view }`); if the current preset is `'helm'` and no spotlight focus is on, it glides (`animate`) or jumps to `presetPose('helm', lens, options)`. The glide of `setHelmView` is a **straight** glide; every other glide stays as today.
- `setViewport(…, presetOptions, …)` keeps the stored `helm`: `options = { ...presetOptions, helm: options.helm }`.
- `interpolatePose(from, to, t, mode: 'orbit' | 'straight' = 'orbit')`: `'straight'` moves the position, the target and the fov in straight lines (`lerp`) with the same `easeInOut(t)` and `SCENE.camera.transitionS` (0.5 s); the tween remembers its mode. So turning from Ahead to Panel keeps the eye where it is, and Other wheel moves the eye straight across the cockpit.
- `scene.ts`: at build, `rig.setHelmView(state.camera.helm, false)` before the first `rig.goTo`. In the store subscription, when `state.camera.helm` is not the previous object: if `state.camera.preset` also changed to `'helm'`, call `rig.setHelmView(view, false)` and then let the existing `rig.goTo('helm')` run its glide; otherwise end the spotlight as a preset change does (`stopSpotlight(null)`) and call `rig.setHelmView(view, true)`.
- Dragging the view switches to Free as today (the M25 rule); `camera.helm` is kept for the next Helm.
- Walking to a Realistic station does not move the camera (as today, 2).

### 10.6 UI (`src/ui/helmViews.ts`, `app.ts`, `style.css`)

```ts
/** The three Helm-camera buttons over the 3D view (M64); shown only while the camera is on Helm. */
export function createHelmViews(view: HTMLElement, store: Store): HTMLElement;
```

`app.ts` calls it right after `createCameraChip`. A `div.helm-views` (`data-testid="helm-views"`, `role="group"`, `aria-label` `t('helmView.group')`) holds three buttons with class `view-chip helm-view-button`:

| Test id | Text | `aria-label` | Tap |
|---|---|---|---|
| `helm-look-ropes` | `t('helmView.ropes')` | `t('helmView.ropesLabel')` | `setHelmView({ look: look === 'ropes' ? 'ahead' : 'ropes' })` |
| `helm-look-panel` | `t('helmView.panel')` | `t('helmView.panelLabel')` | `setHelmView({ look: look === 'panel' ? 'ahead' : 'panel' })` |
| `helm-other-wheel` | `t('helmView.otherWheel')` | `t('helmView.otherWheelLabel')` | `setHelmView({ wheel: the other wheel })` (the look stays) |

The Ropes and Panel buttons have `aria-pressed` `"true"` while their look is on. The group is `hidden` unless `state.camera.preset === 'helm'` (so also on the map and in Free). CSS:

```css
/* M64: the Helm camera's buttons, top right of the 3D view, under the instrument strip. */
.helm-views {
  position: absolute;
  top: calc(var(--view-top-h, 0px) + 8px);
  right: 8px;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}
.helm-views[hidden] { display: none; }
.helm-view-button { min-width: var(--touch); min-height: var(--touch); }
.helm-view-button[aria-pressed='true'] { border-color: var(--focus); }
```

(If `--view-top-h` is not set on the phone layout, use the same top offset the alert stack uses under the strip there, and write the choice under "Decided in the M64 PR".) The buttons keep the existing chip look (`.view-chip`: white, rounded, a soft shadow); no new colours, no icons.

Strings (both `ui.json`, after the `cam.` keys):

| Key | English | Russian (draft) |
|---|---|---|
| `helmView.group` | Helm view | Вид от штурвала |
| `helmView.ropes` | Ropes | Тросы |
| `helmView.ropesLabel` | Look at this side's ropes and winch | Посмотреть на тросы и лебёдку этого борта |
| `helmView.panel` | Panel | Панель |
| `helmView.panelLabel` | Look at the panel on the pedestal | Посмотреть на панель на колонке |
| `helmView.otherWheel` | Other wheel | Другой штурвал |
| `helmView.otherWheelLabel` | Go to the other wheel | Перейти к другому штурвалу |

`scripts/ui.mjs` gains:

```js
/** M64: taps a Helm-camera button: 'ropes' | 'panel' | 'other'. */
export async function helmView(page, which) {}
```

### 10.7 Tests

`tests/cameraPresets.test.ts` (± 0.0005):

1. `helmPose({ wheel: 'port', look: 'ahead' })`: position (−8.2, 2.65, −0.88), target (−3.6042, 0.9399, −1.8569), fov 64; and `presetPose('helm', lens)` with no `helm` option gives the same.
2. Starboard Ahead: position (−8.2, 2.65, 0.88), target (−3.6042, 0.9399, 1.8569).
3. Port Panel: position (−8.2, 2.65, −0.88), target (−7.0663, 2.0241, −0.7628), fov 44; the distance is 1.3003 ± 0.001; `dot(normalize(position − target), face.w)` > 0.999.
4. Ropes: port target (−6.90, 1.60, −1.60), starboard (−6.90, 1.60, 1.60), fov 56.

`tests/urlState.test.ts`:

5. `?cam=helm&hw=s&hl=p` → `camera` `{ preset: 'helm', helm: { wheel: 'starboard', look: 'panel' } }`; written back as `…cam=helm&hw=s&hl=p…` (in that order).
6. `?cam=helm` → `helm` = `DEFAULT_HELM_VIEW`; the written link has neither key.
7. `?cam=helm&hw=x&hl=q` → the defaults. `?cam=side-port&hw=s` → wheel starboard; the written link has no `hw`.

`tests/store.test.ts`:

8. From `side-port`, `setHelmView({ look: 'panel' })` → preset `helm`, look `panel`, wheel `port`; then `setHelmView({ wheel: 'starboard' })` → look stays `panel`; then `setCameraPreset('side-port')` and `setCameraPreset('helm')` → wheel `starboard`, look `ahead`.

### 10.8 Browser checks (`scripts/shots-m64.mjs`, test clock, `debug=1&held=1&sea=flat`)

Live (phone, then desktop):

1. `?cam=helm`: `helm-views` shows three buttons; `?cam=side-port`: hidden.
2. Tap Panel (`helmView(page, 'panel')`) → `waitForLink(page, ['hl=p'])`; after 600 ms `cameraPose().target` is within 0.01 of (−7.0663, 2.0241, −0.7628) and the button has `aria-pressed="true"`.
3. 250 ms after a tap on Ropes, `cameraPose().position` is still within 0.01 of (−8.2, 2.65, −0.88) (the straight glide turns the head, the eye stays); after 600 ms the target is within 0.01 of (−6.90, 1.60, −1.60) and the link has `hl=r`.
4. Tap Ropes again → the link has no `hl`; the target is back at the Ahead target (± 0.01).
5. Tap Other wheel → `hw=s`; after 600 ms the position's z is 0.88 ± 0.01.
6. `setCamera(page, 'side-port')`, then `setCamera(page, 'helm')` → `hw=s` and no `hl`.
7. Drag the 3D view (as the M25 checks do) → the camera chip reads Free and `helm-views` is hidden.
8. Old link `?cam=helm`: `cameraPose()` position (−8.2, 2.65, −0.88) and target (−3.6042, 0.9399, −1.8569) (± 0.01).
9. `?lang=ru&cam=helm`: each button's `scrollWidth ≤ clientWidth` and the group fits inside the 3D view; the accessibility audit (`auditPage`) passes with the buttons shown.

Pictures (phone and desktop, High): `helm-port-ahead`, `helm-port-panel`, `helm-port-ropes`, `helm-starboard-ahead`, `helm-starboard-panel`, `helm-starboard-ropes` (each opened by its link, 1,000 ms after load).

### 10.9 Done when

The Helm view opens at the last wheel looking Ahead; Ropes, Panel and Other wheel turn the camera smoothly and the link keeps them; old links open as before; typecheck, lint, tests, build, `SHOTS_ONLY=m64,m25,m49,general,budget` pass (M25 is the camera chip; M49 the spotlight's glides).

### 10.10 Not in M64

A camera that follows the Realistic station walk, a wheel turned by dragging in 3D, a seated eye height, Helm views on the map.

### 10.11 Decided in the M64 PR

- Decided in planning (recommended; merging accepts it): the link keys are `hw` and `hl` (`hd` is the winch handle's); they are written only with `cam=helm`.

---

## 11. M65: Small fittings, finish and sign-off

**Independent review: not needed** (shapes at High only, a one-line picking rule, checks and docs).

Study section 11, milestone 6; owner's answer 4 (small fittings and the shading at High only). No photos: every size and place is an assumption.

### 11.1 Files

New: `src/model/smallFittings.ts`, `src/render3d/boat/smallFittings.ts`, `tests/smallFittings.test.ts`, `scripts/shots-m65.mjs`. Changed: `content/boat/hanse508.json` (11.2), `content/registry/parts.json`, both `glossary.json`, `src/render3d/boat/deckGear.ts` (`buildLifelines`: base plates and sleeves), `src/render3d/boat/index.ts` (build the fittings at High), `src/render3d/picking.ts` (`noPick`), `src/render3d/boat/parts.ts` (`PartUserData.noPick`), `src/render3d/sceneConfig.ts` (11.4), `src/model/boatProfile.ts` (`ADDED_KEYS`), `docs/BOAT_REFERENCE.md`, `docs/review/ru.md`, `docs/CODE_MAP.md`, `docs/ROADMAP.md` (Phase 9 done), `scripts/shots.mjs`.

### 11.2 Data (`content/boat/hanse508.json`)

In `modelDetail.lifelines`, after `wireRadius`:

```json
"basePlate": { "diameterM": 0.09, "thicknessM": 0.008 },
"endSleeve": { "lengthM": 0.04, "radiusM": 0.009 }
```

New block `modelDetail.shroudFittings`, after `lifelines`:

```json
"shroudFittings": {
  "source": "assumption (M65, Phase 9): a stainless strap at each chainplate, a toggle and a turnbuckle (the screw that tensions the wire) at the foot of each shroud; sizes estimated for 10-12 mm wire",
  "strapM": [0.04, 0.07, 0.01],
  "strapAboveM": 0.02,
  "toggleLengthM": 0.05,
  "toggleRadiusM": 0.005,
  "turnbuckleLengthM": 0.16,
  "turnbuckleRadiusM": 0.012
}
```

In `deckFittings`, after `ballFender`:

```json
"hatches": {
  "source": "assumption (M65, Phase 9): flush deck hatches with a raised frame and a tinted lid; places chosen clear of the mast, the self-tacking track, the line channels and the mainsheet blocks",
  "frameWidthM": 0.04,
  "frameHeightM": 0.03,
  "lidThicknessM": 0.012,
  "list": [
    { "on": "coachroof", "x": 1.05, "z": 0, "lengthM": 0.55, "widthM": 0.55 },
    { "on": "coachroof", "x": -1.6, "z": 0, "lengthM": 0.5, "widthM": 0.5 },
    { "on": "foredeck", "x": 3.6, "z": 0, "lengthM": 0.6, "widthM": 0.6 }
  ]
},
"portlights": {
  "source": "assumption (M65, Phase 9): long tinted hull windows below the deck edge, the same on both sides",
  "belowSheerM": 0.28,
  "heightM": 0.11,
  "proudM": 0.004,
  "columns": 8,
  "list": [
    { "x": 1.7, "lengthM": 0.5 },
    { "x": 0.4, "lengthM": 1.2 },
    { "x": -1.2, "lengthM": 0.6 }
  ]
}
```

Everything is **tunable**. `ADDED_KEYS` gains `'modelDetail.lifelines.basePlate'`, `'modelDetail.lifelines.endSleeve'`, `'modelDetail.shroudFittings'`, `'deckFittings.hatches'`, `'deckFittings.portlights'`. (`hatches.list` and `portlights.list` are tables: a profile that has them must give the same number of rows as the Hanse 508, the M57 rule; a profile without them gets the Hanse 508's.)

### 11.3 Model (`src/model/smallFittings.ts`, pure)

```ts
/** The hull's half-width at height y on station x: the z of sectionPoint(x, s) where its y equals `y` (bisection over s in [0, 1], 40 steps). y above the sheer gives the deck edge's half-beam; below the keel line, 0. */
export function hullHalfWidthAt(x: number, y: number, data: BoatData = boat): number;
/** One portlight on one side: rows of points on the hull (top row, then bottom row), `columns + 1` points each, `proudM` outside the hull. */
export function portlightGrid(light: { x: number; lengthM: number }, side: 1 | -1, data: BoatData = boat): [Vec3[], Vec3[]];
export interface ShroudFoot { strap: { centre: Vec3; size: Vec3 }; fittings: { toggle: [Vec3, Vec3]; turnbuckle: [Vec3, Vec3] }[] }
/** The fittings at one side's chainplate: the strap, and for each shroud starting there its toggle and turnbuckle (centre lines). */
export function shroudFoot(side: 1 | -1, data: BoatData = boat): ShroudFoot;
/** The stanchions' bases, as buildLifelines places them. */
export function stanchionBases(data: BoatData = boat): Vec3[];
export interface HatchBox { frame: { centre: Vec3; size: Vec3 }[]; lid: { centre: Vec3; size: Vec3 } }
export function hatchBoxes(data: BoatData = boat): HatchBox[];
export interface ShadowSpot { centre: Vec3; sizeX: number; sizeZ: number }
export interface ShadowSizes { stanchionM: number; winchM: number; cleatM: [number, number]; deckBlockM: number; pedestalM: [number, number] }
export function contactShadowSpots(sizes: ShadowSizes, data: BoatData = boat): ShadowSpot[];
```

- **Portlight grid:** for column `k = 0 … columns`: `x_k = light.x − lengthM/2 + lengthM·k/columns`; top `yT = sheerAt(x_k) − belowSheerM`, bottom `yB = yT − heightM`; points `(x_k, yT, side·(hullHalfWidthAt(x_k, yT) + proudM))` and the same at `yB`.
- **Shroud foot:** the chainplate `c = (rig.shrouds.chainplate.x, rig.shrouds.chainplate.y, side·rig.shrouds.chainplate.halfZ)`; strap centre `c + (0, strapAboveM, 0)`, size `strapM`; for every segment of `shroudSegments(side)` (`src/model/rigGeometry.ts`) whose `a` is within 1e-6 of `c` (the cap shroud's first segment and the lower shroud on this boat: 2 a side): `dir = normalize(b − a)`, toggle from `c` to `c + dir·toggleLengthM`, turnbuckle from there to `c + dir·(toggleLengthM + turnbuckleLengthM)`.
- **Stanchion bases:** `count = max(2, round((fwdX − aftX)/stanchionSpacing) + 1)` (7 on this boat), for each side `[x, sheerAt(x), side·(halfBeamAt(x) − inset)]` with `x = aftX + (fwdX − aftX)·i/(count − 1)`: the same formula as `buildLifelines` (which then uses this function).
- **Hatches:** deck height `yD` = `deck.coachroof.topY` for `on: "coachroof"`, `sheerAt(x)` for `on: "foredeck"`; four frame bars round the opening (two along x of length `lengthM`, two along z of length `widthM − 2·frameWidthM`, each `frameWidthM` wide and `frameHeightM` high, standing on `yD`); the lid `(lengthM − 2·frameWidthM) × lidThicknessM × (widthM − 2·frameWidthM)` with its top at `yD + frameHeightM`.
- **Shadow spots** (`sizes` are `SCENE.contactShadow`'s, 11.4, passed in by the renderer: the model does not read `SCENE`): one under each stanchion base (`stanchionM` square), each present winch (`(x, y, z)` of the winch, `winchM` square), each mooring cleat (`cleatPlaces()`: its `base`, `cleatM` = [along, across]), each mainsheet deck block (`deckBlocks()` x and z at `deck.coachroof.topY`, `deckBlockM` square) and each helm pedestal's column foot (`helmPedestal(id).column` x and z at `deck.cockpit.soleY`, `pedestalM`). On this boat: 14 + 2 + 6 + 2 + 2 = **26** spots.

### 11.4 3D (`src/render3d/boat/smallFittings.ts`, `deckGear.ts`, `index.ts`, `picking.ts`), High only

`buildSmallFittings(materials: BoatMaterials): THREE.Object3D[]`, called by `buildBoat` only when `detail === 'high'`:

| What | Shape | Material | Id |
|---|---|---|---|
| Base plates | a disc (`cylinderBetween`, 16 sides) of `basePlate.diameterM` from each base up `thicknessM`; added to the stanchions' mesh in `buildLifelines` at High | `materials.fitting` | `part_lifelines` |
| End sleeves | at each stanchion, on each of the two wires, a cylinder of `endSleeve.radiusM` and `lengthM` along the wire, centred on the stanchion; added to the stanchions' mesh at High | `materials.fitting` | `part_lifelines` |
| Strap, toggle, turnbuckle | `roundedBoxAt(strap)` (radius 0.003); toggle `cylinderBetween(…, toggleRadiusM, 8)`; turnbuckle `cylinderBetween(…, turnbuckleRadiusM, 12)` | `materials.chrome` | `part_shroud` (one mesh, `thin`, its pick segments the turnbuckles' centre lines) |
| Hatches | the frame bars as `roundedBoxAt` (radius 0.008); the lid a box | frame `materials.gelcoat`, lid `materials.glass` | `fit_deck_hatch` (two meshes) |
| Portlights | each grid as a triangle strip (`triangles`, two triangles per column), facing outwards | `materials.glass` | `fit_portlight` |
| Contact shadows | one flat square per spot at `centre.y + liftM`, merged into one mesh; a radial-gradient `CanvasTexture` (`texturePx` square: black, alpha `opacity` at the centre falling to 0 at the edge) on `MeshBasicMaterial({ transparent: true, depthWrite: false, map })` | that material | `part_deck`, with `userData.noPick = true` |

`picking.ts` skips an object whose `userData.noPick` is true, in both its passes (the small-part hit areas and the ray hits); `PartUserData` gains `noPick?: boolean`. So a tap through a shadow still finds the coaming, the deck or the fitting under it.

`SCENE.contactShadow` (new, after `SCENE.helmPanel`):

```ts
/** M65: soft dark patches under deck fittings (High only), so they sit on the deck. */
contactShadow: {
  opacity: 0.35, texturePx: 64, liftM: 0.002,
  stanchionM: 0.16, winchM: 0.45, cleatM: [0.34, 0.16], deckBlockM: 0.2, pedestalM: [0.32, 0.36],
},
```

(`opacity` and the sizes are **tunable**.) At Low nothing of this section is built.

### 11.5 Registry and Learn

Registry (after `fit_winch_handle_rest`), `"kind": "fitting"`, `"phase": 9`, `"status": "draft"`, `"sources": ["owner"]`:

| Id | Group | Related | showMe |
|---|---|---|---|
| `fit_deck_hatch` | `deck` | `part_coachroof`, `part_deck`, `part_companionway` | `?cam=top&sel=fit_deck_hatch&held=1&sea=flat&detail=high` |
| `fit_portlight` | `hull` | `part_hull` | `?cam=side-port&sel=fit_portlight&held=1&sea=flat&detail=high` |

English glossary (`textStatus: "draft"`):

- `fit_deck_hatch`: name "Deck hatch"; alternatives `[]`; short "A window in the deck that opens for light and air below."; what "A hatch is a strong window in a frame, hinged so it can be opened. Closed and locked it keeps the water out; at sea it stays shut, because a wave over the deck pours in through an open hatch."; onThisBoat "Two hatches on the coachroof and one on the foredeck in the app. Their places are a guess. At Detail Low they are not drawn."
- `fit_portlight`: name "Hull window"; alternatives `[{ "term": "portlight" }]`; short "A long fixed window in the side of the hull."; what "Hull windows give light and a view from the cabin. They do not open, and they are made strong enough for the waves that hit the side."; onThisBoat "Three windows on each side in the app. Their sizes and places are a guess. At Detail Low they are not drawn."

Russian names: «палубный люк», «окно в корпусе»; the texts are drafts by the builder; `npm run review-doc -- ru`. Both ids show only at High: `learnEntry` keeps them in the Learn list; "Where is it?" at Low finds nothing visible and behaves as for any hidden part (M49).

### 11.6 Tests (`tests/smallFittings.test.ts`)

1. `hullHalfWidthAt(0.4, sheerAt(0.4) − 0.28)`: the `y` of `sectionPoint(0.4, s*)` is within 1e-6 of the height; the result is below `halfBeamAt(0.4)` and above `halfBeamAt(0.4) − 0.2`. At `sheerAt(0.4) + 0.1` it is `halfBeamAt(0.4)`.
2. `portlightGrid(list[1], 1)`: two rows of 9 points; every z > 0; top-row y = `sheerAt(x) − 0.28`, bottom-row y = that − 0.11 (± 1e-9); side −1 mirrors z.
3. `shroudFoot(1)`: 2 fittings; the strap's centre (−0.865, 1.59, 2.18); each turnbuckle runs from `c + dir·0.05` for 0.16 m, `dir` a unit vector along its shroud; side −1 mirrors z.
4. `stanchionBases()`: 14 points; the first (−8.2, `sheerAt(−8.2)`, `halfBeamAt(−8.2) − 0.06`), every |z| < `halfBeamAt(x)`.
5. `hatchBoxes()`: 3 hatches; each has 4 frame bars; the coachroof lids' tops at 1.99 (1.96 + 0.03); the foredeck lid's top at `sheerAt(3.6) + 0.03`; the forward coachroof hatch's frame starts at x 0.775 (ahead of the self-tacking track at 0.28) and the aft one ends at x −1.35.
6. `contactShadowSpots(SCENE.contactShadow sizes)`: 26 spots.
7. `tests/boatModel.test.ts`: at High the boat has meshes with `fit_deck_hatch` and `fit_portlight`; at Low none.

### 11.7 Browser checks (`scripts/shots-m65.mjs`, `debug=1&held=1&sea=flat&detail=high`)

Close-ups (High only, phone and desktop), with `setView`:

| Name | Target | Position | Fov |
|---|---|---|---|
| `stanchion-base` | (−2.0, 1.6, 2.25) | (−1.4, 2.2, 3.2) | 40 |
| `chainplate` | (−0.865, 1.7, 2.18) | (−0.2, 2.3, 3.2) | 40 |
| `hatches-top` | (0.5, 1.96, 0) | (0.5, 8.0, 0.5) | 50 |
| `foredeck-hatch` | (3.6, 1.66, 0) | (2.2, 2.8, 1.4) | 45 |
| `portlights-side` | (0.4, 1.3, 2.0) | (0.4, 1.8, 7.0) | 45 |
| `cockpit-shadows` | (−7.0, 1.5, 0) | (−9.5, 3.2, 1.0) | 50 |

Live: a tap at `hitCentres()`'s `fit_deck_hatch` and `fit_portlight` points gives `sel=` with that id (High); with `detail=low` neither is in `hitCentres()`; a tap on the coaming top at a winch's shadow (canvas point of `project(-7.25, 1.56, 1.6 − 0.3)`) does not give `sel=part_deck`.

**Sign-off checks** (`budget` group green; the frame rate on the phone is the owner's check, WORKFLOW).

### 11.8 Done when

The small fittings and shadows show at High and nothing changes at Low; taps through the shadows still find the part under them; every item of 12 (Definition of Done) is ticked in the PR; typecheck, lint, tests, build, `SHOTS_ONLY=m65,m60,m61,m62,m63,m64,budget` pass; the ROADMAP marks Phase 9 done.

### 11.9 Not in M65

A pulpit and pushpit, a boarding gate, deck lights, solar panels, a bimini, a cockpit table, a stern platform redesign, baked shading in the shapes themselves (the contact patches are the shading).

### 11.10 Decided in the M65 PR

(nothing yet)

---

## 12. Definition of Done (Phase 9)

- [ ] M60–M65 merged, each with its checklist in `docs/WORKFLOW.md` ticked by the owner.
- [ ] Ropes: smooth bends everywhere they turn, 12 sides at High, whipped tails, braid at High; rope paths, lengths and every rope test unchanged.
- [ ] Blocks with cheeks, sheave and shackle at both details; rounded coamings, boxes and clutches at High.
- [ ] A pedestal, guard rail and panel at each wheel; the panel's five instruments show live values while the camera is near and are hidden beyond 6 m.
- [ ] The Helm camera at either wheel with Ahead, Panel and Ropes; `hw` and `hl` in the link; old links open as before.
- [ ] Small fittings and contact shadows at High; nothing new at Low but the bends, whipping, blocks and the helm.
- [ ] The `budget` check is green on the last PR: High at most 300 draw calls and 250,000 triangles, Low 150 and 120,000, in every preset view.
- [ ] The owner confirms the frame rate on the phone at Low and at High (WORKFLOW M65): 50 fps or more in the Helm view and the Side view.
- [ ] Old imported boat profiles still import (`ADDED_KEYS`), and a boat without thrusters has no joysticks.
- [ ] Every new id is in the registry and every glossary (`draft`), every new number in `BOAT_REFERENCE.md` marked as an assumption; `CODE_MAP.md` current.
- [ ] Every Phase 1 to 8 test and browser check still passes.
