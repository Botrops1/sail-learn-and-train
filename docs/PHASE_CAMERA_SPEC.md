# Easier camera control (M99)

Extra milestone, planned on 2026-11-10 from issue #145 ("Adjust free camera controls on both PC and smartphone"): *Current free camera controls are not easy to operate. Check what standard camera control approaches for 3D scenes with a main object are and choose one that fits both touchscreens and PC. One logical approach for PC is like a 3D editor: zoom with the scroll wheel, hold the left button to turn, hold the right button to slide.*

The owner accepted every recommendation of the planning outline ("Accept all", section 6).

## 0. How to use this spec

- One milestone, **M99**, one PR titled `M99: Easier camera control`, with `Closes #145` in its description.
- Read sections 0–4 and 5 (all of it). The general rules are in CLAUDE.md. Names (files, functions, keys, string keys, `data-testid`s) are required. Numbers are final unless marked **tunable**. The English strings are final. The Russian strings are AI drafts (run `npm run review-doc -- ru` after changing `content/lang/ru/ui.json`).
- **No sailing physics, no model, no store, no URL change.** `src/model` is not touched. Every earlier unit test stays green except the one test 5.7 replaces. Old links open as before.
- If a test band in 5.7 fails: check the formulas against section 4 ("common mistakes") first, then tune only the keys marked **tunable**, and report the before and after values in the PR. Never widen a band.
- Keep the signatures in 5.1–5.4. Decisions taken while building go under 5.10, "Decided in the M99 PR".

## 1. Goal and scope

**Goal:** moving the camera by hand feels like a good 3D model viewer, on a phone and on a computer. Zoom goes where you point, you can pick the point the camera turns around, and the camera never squashes against the water, twists or jumps.

### 1.1 What is wrong today (measured on `main` before this plan, `?debug=1&cam=side-port`)

The input layout is already the one the issue proposes (`src/render3d/cameraRig.ts`, three.js `OrbitControls`): wheel = zoom, left drag = turn, right drag = slide, middle drag = zoom; on touch, one finger turns and two fingers pinch and slide. What makes it hard:

1. **Zoom goes to the orbit centre** (half-way up the mast, `[-0.85, 9.82, 0]`), never towards the pointer or the fingers. Five wheel steps over a corner of the view: the target stayed exactly where it was.
2. **Dragging down drives the camera into the water.** A 400 px drag upwards left the camera at y = 0.30 m (the clamp `minHeightAboveWater`) under a target 9.82 m up. The orbit has no polar limit, so `OrbitControls` keeps turning while `clampCameraPosition` holds the camera at the water. This flattens the view and makes it jerk.
3. **Sliding too far twists the view.** A 1,200 px right drag: the target stopped at x = −25.00 (`clampTarget`, `maxTargetOffset`) while the camera went on to x = −28.48, so the camera turned instead of stopping.
4. **Turning close to the hull jumps.** Orbiting at 4 m round `[0, 1, 0]`: the camera jumped from y = 0.7 to y = 1.9 in one frame when it crossed the hull's side below deck level (`clampCameraPosition` lifts it above the deck).
5. There is **no way to say "turn round this part"**, and no help says what the mouse buttons do.

### 1.2 How 3D viewers do it (background)

| Viewer | Mouse | Touch | What we take |
|---|---|---|---|
| Sketchfab | left drag turns, right drag (or Ctrl/Shift + left) slides, wheel zooms; double-click a point to turn round it | one finger turns, pinch zooms, two fingers slide; double-tap focuses | the whole layout, and double-click/tap to set the centre |
| Google `<model-viewer>` | left turns, right slides, wheel zooms | one finger turns, pinch zooms, two fingers slide | same layout; the camera stays outside and above the ground |
| three.js `OrbitControls` (`zoomToCursor`) | zoom towards the pointer | pinch towards the fingers' midpoint | built in; we switch it on |
| Blender and 3D editors | middle drag turns, Shift + middle slides, wheel zooms; "View selected" centres on a part | — | not taken: the middle button is awkward on a laptop, and the owner asked for left to turn |

Chosen: the **Sketchfab layout**. It already matches the app, it is what the issue asks for, and it works the same way with fingers.

### 1.3 In scope

- Zoom to the pointer (wheel) and to the pinch midpoint (`OrbitControls.zoomToCursor`).
- A polar limit, worked out every frame, that stops the orbit 0.3 m above the water.
- The slide stops at the 25 m limit without turning the view.
- The camera is kept out of the hull by moving it outwards along the line from the target (no jump).
- Double-click (computer) or double-tap (phone) on a part, the water or the land: the camera glides (0.5 s) to turn round that point.
- Middle drag slides (was zoom). Shift, Ctrl or Cmd + left drag slides (built into `OrbitControls`).
- A grab cursor on a computer.
- One help line in the camera menu, with different words for touch and mouse.

### 1.4 Out of scope

- Keyboard camera keys (the arrow keys and Space drive the exercise step bar, M79).
- Two-finger twist to turn, and tilt gestures.
- Storing the free camera's position in the link (2026-10-08 decision: `cam=free` opens the default view).
- The presets' poses (Side, Top, Bow, Helm), the spotlight (M49), the Helm views (M64) and the M80 framing. They keep their behaviour. Only the hand-moved camera changes.
- The map view (`cam=map`), which has its own controls.

## 2. Conventions

- **Frame:** the scene's frame, as in `cameraPresets.ts`: x forward (towards the bow), y up, z to starboard, metres. The boat's hull spans x from `boat.hull.transomX` (−8.6) to `boat.hull.stemX` (6.3). The water is y = 0.
- **Polar angle** φ: the `OrbitControls` angle between "straight up" (+y) and the line from the target to the camera, in radians. φ = 0 is straight above, φ = π/2 is level with the target, φ > π/2 is below it.
- "Phone" means touch input. The help text in 5.5 is picked with `window.matchMedia('(pointer: coarse)').matches` (true → touch words). If `matchMedia` is missing, it uses the mouse words.
- Canvas coordinates: CSS px from the canvas's top-left, as `listenForTaps` and `Picker.pick` use today.

## 3. Shared helpers (all new or changed in M99)

| Name | File | Signature | Behaviour |
|---|---|---|---|
| `maxPolarAngle` | `src/render3d/cameraPresets.ts` | `(targetY: number, distance: number, minHeight: number) => number` | The largest φ that keeps the camera at least `minHeight` above the water: `acos(clamp((minHeight − targetY) / distance, −1, 1))`; `distance ≤ 0` → `π / 2`. |
| `clampCameraPosition` | `src/render3d/cameraPresets.ts` | `(position: Vec3, target: Vec3 \| null = null, data: BoatData = boat) => Vec3` | **Changed** (5.2): water first, then out of the hull along the line from `target`; without a target (or when that line never leaves the hull), lift above the deck as today. |
| `insideHull` | `src/render3d/cameraPresets.ts` | `(position: Vec3, data: BoatData = boat) => boolean` | The keep-out solid in 5.2. |
| `centrePose` | `src/render3d/cameraPresets.ts` | `(from: CameraPose, point: Vec3, minDistance: number, maxDistance: number, data: BoatData = boat) => CameraPose` | The pose a double-tap glides to (5.3). |
| `isDoubleTap` | `src/render3d/picking.ts` | `(previous: TapMark \| null, current: TapMark) => boolean` with `export interface TapMark { x: number; y: number; time: number }` | True when `previous` is not null, `current.time − previous.time ≤ SCENE.picking.doubleTapMs` and `hypot(dx, dy) ≤ SCENE.picking.doubleTapMaxPx`. |
| `Picker.point` | `src/render3d/picking.ts` | `point(x: number, y: number, width: number, height: number): Vec3 \| null` | The nearest surface the tap's ray hits (5.4). |
| `CameraRig.centreOn` | `src/render3d/cameraRig.ts` | `centreOn(point: Vec3): void` | Glides to `centrePose` (5.3). |

## 4. Common mistakes

- **Radians, not degrees,** for `maxPolarAngle` and `controls.maxPolarAngle`. The test values in 5.7 are given in both.
- **Set `controls.maxPolarAngle` before `controls.update()`** in the rig's `update`, from the target and distance as they are *before* the update. `OrbitControls` clamps φ inside `update()`.
- **Move the camera by the same amount as the target** when `clampTarget` changes the target (5.2, step 2). Otherwise the view turns, which is today's bug 3.
- **`clampCameraPosition` needs the target** in the rig's `update` (the new second argument). Calls without a target keep today's lift, which is still right for the tests and the presets.
- **`insideHull` must be false outside `transomX − m … stemX + m`.** `halfBeamAt` returns 0 beyond the hull, and a test without the x range makes a thin keep-out strip out to infinity.
- **The second tap of a double tap does not select.** It only centres. The first tap has already selected, and the M50 rule (a second tap on the winch handle takes it) must not fire on a double tap.
- **Keep the spotlight working.** `centreOn` drops a focus without gliding back, as `goTo` does. A drag still ends a spotlight through `onUserDrag`.
- `zoomToCursor` uses the canvas rectangle and the camera's projection. With `setViewOffset` (M10, M80), canvas NDC already map to the offset projection, so nothing extra is needed. Do not add a correction.

## 5. M99: Easier camera control

**Independent review: required** (it changes the shared camera rig that the spotlight, the Helm views and the M80 framing use, the tap handling that every part selection goes through, and the hull keep-out rule).

### 5.1 Files

- `src/render3d/sceneConfig.ts`: the keys in 5.6.
- `src/render3d/cameraPresets.ts`: `maxPolarAngle`, `insideHull`, `centrePose`, and the changed `clampCameraPosition` (5.2, 5.3).
- `src/render3d/cameraRig.ts`: controls setup, `update` order, `centreOn` (5.2, 5.3). Add `centreOn(point: Vec3): void` to the `CameraRig` interface with this doc comment: `/** M99: glides (SCENE.camera.transitionS, straight) so the orbit turns round \`point\` (centrePose); a hand move: the preset becomes free. Drops a spotlight focus without gliding back. */`
- `src/render3d/picking.ts`: `TapMark`, `isDoubleTap`, `Picker.point` (5.4).
- `src/render3d/scene.ts`: `listenForTaps` gets a third parameter `onDoubleTap`. The scene's call centres the camera (5.4).
- `src/ui/cameraChip.ts`: the help line (5.5).
- `content/lang/en/ui.json`, `content/lang/ru/ui.json`: 5.5.
- `tests/cameraPresets.test.ts`: 5.7 (one test replaced, new tests added). `tests/picking.test.ts`: the `isDoubleTap` tests.
- `scripts/shots-m99.mjs` (new, group `m99`; registered in `scripts/shots.mjs`: import, `SCENES` (an empty `M99_SCENES` array is fine), `liveGroups`), `.github/ci-times.json` (`"m99": 300`), `tests/ciPlan.test.ts` (add `'m99'` to the list, count 96 → 97 with the comment "Counted at M99", `newest` becomes `['m99', 'm98', 'm97', 'm96']`).
- `scripts/shots-m50.mjs`: the tap wait in `tapHandle` (5.8, after item 14).
- `docs/WORKFLOW.md`: section 23 (the M99 checklist) was written with this plan; leave it unless a link is wrong.
- Docs: `docs/CODE_MAP.md` (the `cameraRig.ts, cameraPresets.ts` row, `picking.ts` row, `cameraChip.ts` row, `scripts/shots-m99.mjs`, this spec in the docs list), 5.10 of this spec, `docs/ROADMAP.md` (decisions-log row "M99 built"), `docs/review/ru.md` (generated).

### 5.2 The hand-moved camera (`cameraRig.ts`, `cameraPresets.ts`)

**Controls setup** in `createCameraRig`, after the existing lines:

```ts
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN };
controls.zoomToCursor = true;
controls.rotateSpeed = cam.rotateSpeed;
controls.zoomSpeed = cam.zoomSpeed;
controls.panSpeed = cam.panSpeed;
controls.cursorStyle = 'grab';
```

`controls.touches` stays as it is (one finger turns, two fingers pinch and slide). Shift, Ctrl or Cmd + left drag already slides in `OrbitControls` (three 0.186.1). Do not add code for it.

**`update(now)` order** (replace the part after the `tween` block):

1. `const distance = camera.position.distanceTo(controls.target);`
   `controls.maxPolarAngle = maxPolarAngle(controls.target.y, distance, cam.minHeightAboveWater);`
   then `controls.update();` and the existing `pendingMinDistance` lines.
2. **Target clamp without a twist:** `raw = controls.target` as `Vec3`; `target = clampTarget(raw)`; `delta = target − raw`; if `delta` is not zero, add `delta` to `camera.position` as well; then `controls.target.set(...target)`.
3. **Camera clamp:** `position = clampCameraPosition(camera.position as Vec3, target)`; `camera.position.set(...position)`; `camera.lookAt(controls.target)`.
4. The existing `lastFreePose` line.

**How zoom to the pointer works in three 0.186.1** (so the checks are read right): with `zoomToCursor` and `screenSpacePanning` (default true), a wheel step moves the camera along the ray under the pointer and then puts the target straight ahead of the camera at the new distance. Zooming at the middle of the free area (the optical axis, M10/M80 view offset) leaves the target where it is. Zooming off-centre moves the camera and the target sideways towards the pointer. A zoom step can leave the camera a little under the polar limit computed before it; step 3's water clamp lifts it that frame and the next frame's limit holds. This is accepted.

**`maxPolarAngle(targetY, distance, minHeight)`:** `distance <= 0` → `Math.PI / 2`; else `Math.acos(Math.min(1, Math.max(-1, (minHeight - targetY) / distance)))`. With a target 9.82 m up and 45 m away, φ max = 1.7839 rad (102.21°), and the camera's lowest height is exactly `minHeight` (0.30 m). `minPolarAngle` stays 0.

**`insideHull(position, data)`**, with `m = SCENE.camera.hullClearanceM`:

- false if `x <= data.hull.transomX − m` or `x >= data.hull.stemX + m`;
- else with `xc = clamp(x, transomX, stemX)`: true when `|z| < halfBeamAt(xc, data) + m` **and** `y < sheerAt(xc, data) + m`.

**`clampCameraPosition(position, target = null, data = boat)`:**

1. `y = max(y, SCENE.camera.minHeightAboveWater)`.
2. If `!insideHull(p)` → return `p`.
3. If `target` is given: `u` = unit vector from `target` to `p` (if `|p − target| < 1e-6`, skip to step 4). March `s` from `|p − target|` in steps of `SCENE.camera.hullPushStepM` up to `|p − target| + SCENE.camera.hullPushMaxM`. The first point `q = target + u·s` with `!insideHull(q)` and `q.y >= minHeightAboveWater` is returned.
4. Fallback (no target, or the line never leaves the hull: it points down into the boat): return `[x, sheerAt(x, data) + m, z]` (today's lift, with the new clearance key).

This replaces the old lift-only rule. `clearanceAboveDeck` is removed from `SCENE.camera`, and `hullClearanceM` takes its place.

**Prototype (planning session, 2026-11-10, the hull of `content/boat/hanse508.json`):** `halfBeamAt(0) = 2.042`, `sheerAt(0) = 1.570`. Every preset pose (Side both, Top, Bow, Helm at both wheels and all three looks, phone and desktop lenses) is left unchanged. On an orbit of radius 3.5 m at y = 1 round `[0, 1, 0]`, stepped by 0.005 rad, the largest move between steps is 0.203 m (the nearest-face rule tried first gave 1.134 m jumps, so it was dropped). On the same orbit at radius 3 m round `[0, 0, 0]`, it is 0.066 m.

### 5.3 Double-tap to centre (`centrePose`, `centreOn`)

**`centrePose(from, point, minDistance, maxDistance, data)`:**

1. `target = clampTarget(point, data)`.
2. `d = |from.position − target|`; `u = (from.position − target) / d` (if `d < 1e-6`, `u = [0, 0.5, −1]` normalised: from port and a little above).
3. `dist = clamp(d, minDistance, maxDistance)`.
4. `position = clampCameraPosition(target + u·dist, target, data)`.
5. Return `{ position, target, fovDeg: from.fovDeg }`.

So the camera stays where it is and turns its head to the point. It only moves along that line when it would be closer than the near limit or further than the far limit.

**`centreOn(point)`** in the rig:

- `focus = undefined; pendingMinDistance = false; controls.minDistance = cam.minDistance;`
- `from = tween ? tween.to : currentPose()` (the pose it is at or gliding to, as `focus` does); `to = centrePose(from, point, cam.minDistance, controls.maxDistance)` (`controls.maxDistance` on purpose: a preset may have raised it to fit a small phone view, 172 m for Side on a 390 × 844 phone, and a double-tap must not pull the camera in); `allowDistanceOf(to)`;
- `tween = { from: currentPose(), to, start: performance.now(), mode: 'straight' }`;
- `movedByHand = true`; if `currentPreset !== 'free'`: `currentPreset = 'free'` and call the `listeners` (as a drag does; `scene.ts` already dispatches `setCameraPreset: free` from `onUserMove`).
- The `lastFreePose` line in `update` keeps the result once the tween ends. A preset chosen during the glide saves the pose of that moment as `lastFreePose` (as `goTo` does today); this is accepted.

### 5.4 Taps (`picking.ts`, `scene.ts`)

**`Picker.point(x, y, width, height)`:** build the ray exactly as `pick` does (same NDC from the canvas point). Intersect, recursively, the boat root, the water's pick target and the extra roots (the same three things `createPicker` gets). Skip meshes whose `userData.noPick` is true and meshes that are not visible (`visible` false on the mesh or any parent); three's `Raycaster` does not skip them by itself. Count only hits whose object is a `THREE.Mesh` (lines and points are ignored: the default `Raycaster` line threshold is 1 m). Return the nearest such hit's `point` as `Vec3`, or `null` (the sky).

**`listenForTaps(canvas, onTap, onDoubleTap)`:** keep a `lastTap: TapMark | null`. The mark is taken at the release (`pointerup`): canvas coordinates of the release and its `event.timeStamp`. For each tap that passes today's tests:

- if `isDoubleTap(lastTap, mark)`: call `onDoubleTap(x, y)` only (not `onTap`), and set `lastTap = null` (a third tap is a new single tap);
- else call `onTap(x, y)` and set `lastTap = mark`.

Every early return in `finish` (no start, cancelled, two fingers, a right or middle button, moved too far, held too long) sets `lastTap = null` first.

Under the browser checks' test clock, `event.timeStamp` follows the test clock (measured 2026-11-10: it stands still while the clock is paused). So on a test-clock page two taps at one spot with no `page.waitForTimeout` between them are a double tap, and taps with `page.waitForTimeout(400)` between them are two single taps.

**`scene.ts`:** the call becomes `listenForTaps(renderer.domElement, <today's onTap>, (x, y) => { const rect = renderer.domElement.getBoundingClientRect(); const point = picker.point(x, y, rect.width, rect.height); if (point) rig.centreOn(point); })`. While `rig.preset` is `'map'`, nothing happens (the canvas is not shown then anyway). `onDoubleTap` does not call `stopSpotlight`: the first tap already ended a spotlight, and `centreOn` replaces the glide back that started. `touch-action: none` on `.scene-canvas` already stops the browser's own double-tap zoom.

### 5.5 Help line (`cameraChip.ts`) and strings

`cameraChip.ts` passes `hint: \`${t('cam.menuHint')} ${t(touch ? 'cam.moveTouch' : 'cam.moveMouse')}\``, with `touch` worked out as section 2 says (`(pointer: coarse)`; measured on 2026-11-10: true in a Playwright context with `hasTouch: true`, which `openPage` gives every viewport narrower than 1,000 px). It is one paragraph, the existing `.camera-menu-hint` (no new style). Build it once, when the menu is created.

`content/lang/en/ui.json` (final):

- `cam.menuHint` (changed): `"Port is the left side of the boat when you face the bow (the front); starboard is the right side."`
- `cam.moveTouch` (new): `"Move the camera: one finger turns, pinch to zoom, two fingers slide. Double-tap a spot to turn around it."`
- `cam.moveMouse` (new): `"Move the camera: drag to turn, wheel to zoom towards the pointer, right drag (or Shift + drag) to slide. Double-click a spot to turn around it."`

`content/lang/ru/ui.json` (drafts):

- `cam.menuHint`: `"Левый борт — слева, если смотреть на нос (вперёд); правый борт — справа."`
- `cam.moveTouch`: `"Камера: один палец — поворот, щипок — приближение, два пальца — сдвиг. Двойное касание точки — вращение вокруг неё."`
- `cam.moveMouse`: `"Камера: перетаскивание — поворот, колёсико — приближение к указателю, правая кнопка (или Shift + перетаскивание) — сдвиг. Двойной щелчок по точке — вращение вокруг неё."`

No new registry ids, no glossary entries.

### 5.6 Data (`SCENE` in `src/render3d/sceneConfig.ts`)

These are render settings, not boat geometry, so they go in `SCENE` like the other camera keys, not in the boat file. In `SCENE.camera`, remove `clearanceAboveDeck` and add:

```ts
/** M99 (tunable, 0.1–0.3): the camera keeps this far outside the hull's sides, ends and deck edge, metres. */
hullClearanceM: 0.15,
/** M99: the keep-out push marches outwards from the target in steps of this many metres, at most hullPushMaxM. */
hullPushStepM: 0.02,
hullPushMaxM: 20,
/** M99 (tunable, 0.5–2): OrbitControls speeds (1 = three.js default). */
rotateSpeed: 1,
zoomSpeed: 1,
panSpeed: 1,
```

In `SCENE.picking`, add:

```ts
/** M99: a second tap within this time (ms, from the first tap's release) and distance (CSS px) is a double tap. */
doubleTapMs: 350,
doubleTapMaxPx: 24,
```

`maxTargetOffset` (25), `minHeightAboveWater` (0.3), `minDistance` (3), `maxDistance` (140), `dampingFactor` (0.12) and `transitionS` (0.5) are unchanged (owner's answers 4 and 5).

### 5.7 Tests (Vitest)

No PHYSICS_TRUTHS rule applies. In `tests/cameraPresets.test.ts`:

- **every preset is above the water and outside the hull** (existing): change the call to `clampCameraPosition(pose.position, pose.target)`; it must still equal `pose.position` for every preset, both lenses, and for Helm at `{ wheel: 'port', look: 'ahead' }`, `{ wheel: 'starboard', look: 'ropes' }` and `{ wheel: 'port', look: 'panel' }` (pass `{ helm }` as options).
- **lifts a camera inside the hull above the deck** (existing, kept): `clampCameraPosition([0, 0.5, 0])[1]` is greater than `sheerAt(0)`. New expected value: `1.72 ± 0.001` (`sheerAt(0) + 0.15`).
- **lifts a camera under the water**, **leaves a camera outside the boat alone** (existing): unchanged.
- **M99 pushes out along the line from the target:** `clampCameraPosition([0, 1.4, 1.9], [0, 1.4, -3])` → x = 0, y = 1.4, z in [2.192, 2.215].
- **M99 falls back to the lift when the line points into the boat:** `clampCameraPosition([0, 0.5, 0.01], [0, 1, 0])` → `[0, 1.72 ± 0.001, 0.01]`.
- **M99 orbiting close to the hull has no jumps:** target `[0, 1, 0]`; for `a = 0 … 2π` in steps of 0.005 rad, `p = [3.5 sin a, 1, 3.5 cos a]`, clamped with the target. The largest distance between consecutive clamped points is below **0.25 m** (prototype 0.203).
- **M99 insideHull:** true for `[0, 1, 0]`; false for `[0, 1, 2.3]`, `[10, 1, 0]`, `[-8.8, 1, 0]`, `[0, 1.8, 0]`.
- **M99 maxPolarAngle:** `(9.82, 45, 0.3)` → 1.7839 ± 0.0005 rad (102.21°), and `9.82 + 45·cos(that)` = 0.300 ± 0.001; `(0, 10, 0.3)` → 1.5408 ± 0.0005 (88.28°); `(9.82, 3, 0.3)` → π; `(1, 0, 0.3)` → π/2.
- **M99 centrePose keeps the camera and turns to the point:** `from` = `presetPose('side-port', DESKTOP)`; `point = [0, 0, -10]` → `target` = `[0, 0, -10]` and `position` equal to `from.position` within 1e-9.
- **M99 centrePose keeps the near limit:** `from = { position: [-0.85, 14.03, -40.05], target: [-0.85, 9.82, 0], fovDeg: 40 }`, `point = [-0.85, 14.03, -39.05]`, limits 3 and 140 → `position` = `[-0.85, 14.03, -42.05]` within 1e-6.
- **M99 centrePose clamps the target:** `point = [100, 0, 0]` → `target` = `[25, 0, 0]`.

`Picker.point` (in `tests/picking.test.ts`): a 1 m box mesh at the origin as the boat root, an empty `THREE.Group` as the water, a `PerspectiveCamera(40, 1, 0.1, 1000)` at `[0, 0, 10]` looking at the origin (`updateMatrixWorld()` on both): `point(50, 50, 100, 100)` → `[0, 0, 0.5]` within 1e-6; the same with the box's `visible = false` → `null`. `point` must work when the root is itself a mesh and the water is an empty group; the app's real water target is a mesh with an invisible material (`material.visible = false`) but `visible` true, so it is still hit, as it must be.

`isDoubleTap` (in `tests/picking.test.ts`): `(null, {x:0,y:0,time:0})` → false; `({0,0,0}, {10,10,300})` → true; `({0,0,0}, {0,0,400})` → false; `({0,0,0}, {30,0,100})` → false; `({0,0,0}, {24,0,350})` → true (both limits inclusive).

### 5.8 Browser checks (`scripts/shots-m99.mjs`, group `m99`, test clock)

Every page opens with `openPage(viewport, label, query, { testClock: true })` and `debug=1&sea=flat`, and reads the pose from `window.__sailDebug.cameraPose()`. `hitCentres()` and `__sailCamera.freeArea()` are in canvas px: add the canvas's `boundingBox()` x and y before passing a point to `page.mouse` or to a touch (as `shots-m50.mjs` does). Touches go through a helper written in `shots-m99.mjs`: `touch(cdp, type, points)` → `cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points })` with `cdp = await page.context().newCDPSession(page)` (`touchTools` in `shots-m4b.mjs` only swipes with one finger). "Distance" is |position − target|. Wait 800 ms (`page.waitForTimeout`) after each gesture.

Computer (1280 × 800), link `?debug=1&sea=flat&cam=side-port`:

1. **Zoom to the pointer:** the wheel at 25 % of the canvas width and 40 % of its height, 5 × `deltaY −200`: the distance is smaller and the target has moved by more than 0.5 m. Fresh page: the same at the centre of the free area (`__sailCamera.freeArea()` middle, half the width): the target moved less than 0.3 m.
2. **Slide stops without a twist:** read the unit view direction (position − target); right drag 1,200 px to the left in 30 steps: `|target.x| ≤ 25.001` and the view direction differs from the one before by less than 0.01 in every component.
3. **Middle drag slides:** middle button, 100 px to the left: the target moved by more than 0.5 m and the distance changed by less than 2 %.
4. **Shift + drag slides:** the same with `keyboard.down('Shift')` and the left button: the target moved by more than 0.5 m.
5. **Stops above the water:** left drag 600 px upwards in 20 steps; then read the pose 10 times, 100 ms apart: every camera y ≥ 0.299, and the largest change of y between readings < 0.05.
6. **No jump at the hull:** `__sailDebug.setView([0, 1.5, 4], [0, 1, 0])`; left drag 300 px to the right in 20 steps of 15 px, reading the pose after each step (`page.waitForTimeout(60)`): the largest change of y between readings < 0.5 (before M99: 1.2).
7. **Double-click on the water centres:** double-click (`page.mouse.dblclick`) at 50 % of the canvas width and y = `top + 0.9 · (bottom − top)` of the free area (water in front of the boat): the target's y < 0.5; the link has `cam=free` (`waitForLink`); the camera chip reads "Free".
8. **Double-click on a part centres and selects it:** fresh page; take the `fit_` entries of `__sailDebug.hitCentres()` whose point lies inside the free area and the canvas, and use the first one; double-click there: the link has a `sel=` key with some part id (the single tap's `pick` may choose a nearer part than the hit centre's own, which is fine); the target moved by more than 1 m; the target's y is above 0.5 (it is on the boat, not the water). (Not compared with `partBox`: that box is in the boat's frame, the target in the world's.)
9. **A single tap still only selects** (a selection never starts a spotlight; only the Learn buttons do): fresh page; one click on the same hit centre; wait 800 ms: the link has a `sel=` key and the target moved by less than 0.01 m.
10. **Help line:** click `camera-chip`: `.camera-menu-hint` contains "wheel to zoom towards the pointer".

Phone (`openPage` with `{ width: 390, height: 844 }`: `hasTouch` true, `isMobile` false), link `?debug=1&sea=flat&cam=side-port`, touch through a CDP session (`Input.dispatchTouchEvent`) at y = 250 (the 3D view above the half sheet):

11. **Pinch towards the fingers:** two fingers at canvas x = 80 and 170 (canvas y = 250) moving apart by 8 px per step for 10 steps: the distance is smaller and the target moved by more than 0.5 m.
12. **Double-tap on the water:** two taps (touchStart then touchEnd, twice) at the same point with no wait between them (so they are a double tap whatever clock `event.timeStamp` follows), at canvas x = 195 (between the mini-map at the left and the chips at the right) and canvas y = `__sailCamera.freeArea().bottom − 70` (water below the far-away boat): the target's y < 0.5 and the link has `cam=free`.
13. **Help line:** tap `camera-chip`: `.camera-menu-hint` contains "one finger turns".
14. **Russian** (`&lang=ru`): the menu hint contains "один палец" and the menu fits on the screen (its bounding box is inside the viewport).

**`scripts/shots-m50.mjs`:** in `tapHandle`, change the closing `page.waitForTimeout(300)` to `450`, with the comment `// M99: two taps closer than 350 ms are a double tap (centre), not a second tap.` That page is not on the test clock, so this is real time, and it covers all three pairs of taps (the port handle, the mast, and Learn).

**Other checks:** any existing check that taps the same spot twice within 350 ms (real time, or test time on a test-clock page) now gets a double tap. If a group fails for that reason, add `await page.waitForTimeout(400);` before the second tap and change nothing else in that check. Say in the PR which checks needed it.

Groups to run locally: `SHOTS_ONLY=m99,m50,m49,m64,m80,m25,general`. The PR description carries `CI groups: all` (the tap handling changes for every part selection).

### 5.9 Done when / not in this milestone

**Done when:** `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` pass; the `m99` group passes, and so do `m50`, `m49`, `m64`, `m80` and `m25`; the PR's `CI groups: all` run is green; the WORKFLOW checklist (section 23) is in the PR with full links; CODE_MAP, ROADMAP and 5.10 are updated.

**Not in this milestone:** anything in 1.4; changing the presets' poses; any change to how the spotlight frames a part; a reset button (the camera menu's views already bring the boat back).

### 5.10 Decided in the M99 PR

(The builder fills this in.)

## 6. Owner's answers (planning chat, 2026-11-10: "Accept all")

1. Double-tap / double-click centres the camera on the point; a single tap still selects. **Yes.**
2. Zoom goes towards the pointer and the pinch midpoint. **Yes.**
3. The help line sits at the bottom of the camera menu (Port ▾), with different words for touch and mouse; no pop-up.
4. The camera may go down to 0.3 m above the water and stops there smoothly.
5. The slide limit stays 25 m from the boat and stops cleanly.
