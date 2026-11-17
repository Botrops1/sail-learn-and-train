# Distant land on the horizon (M104)

Extra milestone for issue #200 ("Add distant mountains on horizon"), planned with `/plan issue 200` on 2026-11-17. The owner accepted every recommendation in the planning chat ("Accept all"); the answers are in section 1.12.

## 0. How to use this spec

- One milestone, **M104**, one PR titled `M104: Distant land on the horizon`, saying `Closes #243` (its milestone issue) and `Closes #200` (section 1.11).
- Read section 1 only; the general rules are in CLAUDE.md. Names (files, functions, fields, `data-testid`s, string keys, ids) are required. Numbers are final unless marked **tunable**.
- **Text is data.** The English strings here are final. German, Norwegian and Russian strings are AI drafts the builder writes, `textStatus: "draft"`; run `npm run review-doc -- de`, `-- no` and `-- ru` after changing them.
- **No sailing physics changes.** `src/model` gets one pure, non-sailing helper (the land's outline). No state field, store action or URL key is added; old links open as before, now with land on the horizon.
- If a band fails: check 1.9 ("common mistakes") first, then tune only keys marked **tunable** and report the before and after values in the PR. Never widen a band.
- Decisions taken while building go under 1.12, "Decided in the M104 PR", marked "recommended; merging accepts it".

## 1. M104: Distant land on the horizon

**Independent review: not needed** (visuals only: no model formula, state, URL key or step-order change; the one new model file is pure geometry with unit tests).

### 1.1 Goal

Before M104 the sea runs to an empty horizon in every direction, so a turn shows only the water and the sky turning. M104 draws **distant land** round the horizon: high mountains to the north, lower hills in front of them and behind the bay, mountains far off to the east-south-east, a long island to the south, a small islet to the east, and one clear stretch of **open sea to the south-west** (bearings 215°–240°). The land is fixed to the compass, so it slides past as the boat turns, and it is **out of reach**: it stays the same distance from the camera however far the boat sails (the sky dome's trick). It shows in every place, sea setting, camera and time of day. There is no setting and no URL key.

The layout fits this app's own geography: the marina lies 1.5 km north of the open-water start (mainland to the north) and the bay's shore 1.35 km west (land to the west). The heights follow the real view from Split: the mountains behind the town rise about 5.5° above the horizon (Mosor, 1,339 m, about 14 km away: atan(1339 / 14000) = 5.5°).

### 1.2 Files

- `content/areas/adriatic.json`: new top-level block `horizonLand` (1.3).
- `src/model/horizonLand.ts` (new): the types and the pure outline functions (1.4).
- `src/model/area.ts`: `AreaData` gets `horizonLand: HorizonLandData` (1.4).
- `src/render3d/sceneConfig.ts`: new `SCENE.horizonLand` block (1.5).
- `src/render3d/horizonLand.ts` (new): `buildHorizonLand` (1.5).
- `src/render3d/scene.ts`: builds it, updates it each frame, two debug hooks (1.5, 1.6).
- `src/model/glossary.ts`: new export `FAR_AWAY`; `src/ui/learnTab.ts`: no "Where is it?" for those ids (1.7).
- `content/registry/parts.json`, `content/lang/{en,de,no,ru}/glossary.json`: the id `env_distant_land` (1.7).
- `tests/horizonLand.test.ts` (new) (1.8).
- `scripts/shots-m104.mjs` (new), `scripts/shots.mjs` (import, `SCENES`, the `m18` live group), `scripts/ci-plan.mjs` (`GROUP_ALIASES`: `m104: 'm18'`), `.github/ci-times.json` (`m18` line) (1.10).
- Docs: this file, `docs/CODE_MAP.md` (in `src/model/`, a row `horizonLand.ts`: "The distant land's outline from the area's ridges (pure)."; in `src/render3d/`, a row after `skyDome.ts, skyColours.ts`: `horizonLand.ts`: "The distant land: two rings of hills round the horizon, fixed to the compass, following the camera so it is never reached."; the `glossary.ts` row also names `FAR_AWAY`), `docs/BOAT_REFERENCE.md` (one assumption row, 1.3), `docs/ROADMAP.md` (decisions-log row), `docs/review/{de,no,ru}.md` (generated).

### 1.3 Data (`content/areas/adriatic.json`, new top-level key after `bay`)

Bearings are compass degrees (0 = north, clockwise). Heights are **degrees above the horizon** as seen from sea level at the land's distance (section 1.5's radius turns them into metres). A ridge's `toDeg` may pass 360 to cross north (330 → 435 means 330° round to 75°); its peaks use the same unwrapped bearings. The shapes are final; any later change is the owner's call, not tuning.

```json
"horizonLand": {
  "$comment": "Distant land round the horizon (M104, issue #200): scenery only, never reached. Bearings in compass degrees, toDeg may pass 360 to cross north; heights in degrees above the horizon. Laid out to fit this area's marina (north) and bay (west); heights after the view from Split (docs/BOAT_REFERENCE.md 5).",
  "ridges": [
    { "name": "mountains north", "layer": "far", "fromDeg": 315, "toDeg": 435, "rippleDeg": 0.35,
      "peaks": [[330, 2.6], [350, 4.8], [375, 5.6], [395, 3.8], [415, 2.4]] },
    { "name": "mountains west", "layer": "far", "fromDeg": 245, "toDeg": 285, "rippleDeg": 0.35,
      "peaks": [[255, 1.6], [270, 2.2]] },
    { "name": "mountains east-south-east", "layer": "far", "fromDeg": 95, "toDeg": 150, "rippleDeg": 0.35,
      "peaks": [[110, 1.6], [125, 2.4], [140, 1.2]] },
    { "name": "hills behind the bay", "layer": "near", "fromDeg": 240, "toDeg": 330, "rippleDeg": 0.2,
      "peaks": [[250, 0.6], [275, 1.0], [300, 0.7], [320, 1.2]] },
    { "name": "hills north", "layer": "near", "fromDeg": 330, "toDeg": 420, "rippleDeg": 0.2,
      "peaks": [[345, 1.6], [365, 1.2], [390, 1.5], [410, 0.8]] },
    { "name": "islet east", "layer": "near", "fromDeg": 70, "toDeg": 95, "rippleDeg": 0.2,
      "peaks": [[82, 0.5]] },
    { "name": "island south", "layer": "near", "fromDeg": 150, "toDeg": 215, "rippleDeg": 0.2,
      "peaks": [[160, 0.7], [180, 1.3], [200, 0.9]] }
  ]
}
```

`docs/BOAT_REFERENCE.md` section 5, a row after "Sailing area": `| Distant land (M104) | mountains up to 5.6° above the horizon to the north, hills up to 1.7°, an island to the south, open sea at 215°–240° (`content/areas/adriatic.json` `horizonLand`) | **Assumption**: laid out to fit the app's marina (north) and bay (west), not the real view from Split; heights after Split's view (Mosor 1,339 m at about 14 km ≈ 5.5°) |`.

### 1.4 Model (`src/model/horizonLand.ts`, pure: no DOM, no three.js)

```ts
export type HorizonLayer = 'far' | 'near';
export const HORIZON_LAYERS: readonly HorizonLayer[] = ['far', 'near'];
export interface HorizonRidge {
  name: string;
  layer: HorizonLayer;
  fromDeg: number;
  toDeg: number;
  rippleDeg: number;
  peaks: readonly (readonly [number, number])[]; // [bearingDeg, heightDeg], bearings rising, inside (fromDeg, toDeg)
}
export interface HorizonLandData {
  ridges: readonly HorizonRidge[];
}

/** Height in degrees of one ridge at an unwrapped bearing; 0 outside the open interval (fromDeg, toDeg). */
export function ridgeHeightDeg(ridge: HorizonRidge, bearingDeg: number): number;

/** The outline of one layer: element i is the height at bearing i · stepDeg, for i = 0 … 360 / stepDeg − 1. */
export function horizonProfile(
  ridges: readonly HorizonRidge[],
  layer: HorizonLayer,
  stepDeg = 1,
): number[];
```

`ridgeHeightDeg`, for `b = bearingDeg`:

1. If `b <= fromDeg` or `b >= toDeg`: return 0.
2. `lin` = the straight-line interpolation through the points `[fromDeg, 0]`, then each peak, then `[toDeg, 0]`, at `b` (the segment whose ends hold `b`).
3. `ripple = rippleDeg · (0.6 · sin(23 · b · DEG) + 0.4 · sin(61 · b · DEG)) · min(1, lin / rippleDeg)` (`DEG` from `src/model/angles.ts`; the factor makes the ripple fade out where the ridge meets the sea). When `rippleDeg === 0`, `ripple = 0` (no division).
4. Return `max(0, lin + ripple)`.

`horizonProfile`: for each `i`, `b = i · stepDeg`; the value is the largest `ridgeHeightDeg(r, x)` over the ridges `r` of that layer and `x ∈ {b, b + 360, b − 360}` (so a ridge that crosses north counts on both sides). It throws an `Error` when `360 % stepDeg !== 0` or `stepDeg <= 0`.

`src/model/area.ts` (import the type from `./horizonLand`; the existing `as unknown as AreaData` cast of the JSON stays):

```ts
export type AreaData = Omit<typeof adriatic, 'places' | 'marina' | 'bay' | 'horizonLand'> & {
  places: PlaceData[];
  marina: MarinaData;
  bay: BayData;
  horizonLand: HorizonLandData;
};
```

Prototype values (the script ran these formulas on the data in 1.3): far layer at 0° = 5.120, at 15° = 5.509 (near at 15° = 1.268), highest 5.582 at 19°; near layer at 0° = 1.300, at 180° = 1.300, highest 1.695 at 349°; far at 125° = 2.509; both layers 0 at every bearing 215°–240°.

### 1.5 3D (`src/render3d/horizonLand.ts`, `sceneConfig.ts`, `scene.ts`)

`SCENE.horizonLand` (in `sceneConfig.ts`, after `sky`):

```ts
horizonLand: {
  /** Degrees between outline points (must divide 360). */
  stepDeg: 1,
  /** Inside the 1000 m far plane (`SCENE.camera.far`) and the water's reach: the water is a 2000 m square centred on the boat (`SCENE.water.size`), the orbit camera stays within 140 m of her (`maxDistance`), so water lies at least 1000 − 140 = 860 m from the camera in every direction. */
  far: { radiusM: 840, dayColour: '#6b7d8c', haze: 0.5 },   // dayColour, haze tunable
  near: { radiusM: 800, dayColour: '#4f5f4c', haze: 0.25 }, // dayColour, haze tunable
  /** At full night the land is this fraction of the horizon colour: a dark shape just visible against the sky. Tunable. */
  nightShade: 0.6,
},
```

```ts
export interface HorizonLand {
  object: THREE.Group;
  layers: Readonly<Record<HorizonLayer, THREE.Mesh>>;
  update(camera: THREE.Camera, headingDeg: number, horizon: THREE.Color, night: number): void;
}
export function buildHorizonLand(areaData: AreaData = area): HorizonLand;
```

- **Geometry**, one mesh per layer: `p = horizonProfile(areaData.horizonLand.ridges, layer, SCENE.horizonLand.stepDeg)`, `n = p.length`, `R = radiusM`. For `i = 0 … n` (n + 1 columns, column n repeats column 0's height at bearing 360), bearing `b = i · stepDeg`, two vertices in the group's local frame (**x = north, z = east, y = up**, the world group's frame): foot `(R cos b, 0, R sin b)` and top `(R cos b, R tan(p[i mod n] · DEG), R sin b)`. Vertex `2i` is column i's foot, `2i + 1` its top; the triangles of column pair i are `(2i, 2i + 2, 2i + 1)` and `(2i + 1, 2i + 2, 2i + 3)`, as an index buffer: 2(n + 1) vertices, 2n triangles (722 vertices and 720 triangles per layer at 1°). The foot sits at sea level: beyond 100 m the water is the flat outer water (`waterSurface.ts`), so the foot meets it and its fog without a gap.
- **Material**: `THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, fog: false, toneMapped: false })` (no fog: the scene's fog ends at 900 m and would turn the land into plain horizon colour; the haze is in the colour below; not tone-mapped, as the sky dome, so its colours match the sky's). `mesh.userData.partId = requirePartId('env_distant_land')`; `mesh.name = 'horizon-land-' + layer`; default `renderOrder` (opaque, drawn after the sky dome, whose `renderOrder` is −1 and which ignores depth). `dayColour` is made with `new THREE.Color(hex)` (three.js turns the sRGB hex into its linear working colours, as for every scene colour).
- **update** (every frame; the rig's camera has no parent, so `camera.position` is already in the scene's space, as `skyDome.ts` uses it): `object.position.set(camera.position.x, 0, camera.position.z)` (follows the camera across, never up or down: unreachable); `object.rotation.y = headingDeg · DEG` (exactly as `world.ts` turns the world group, so a bearing stays on the compass); each layer's `material.color` = `dayColour` lerped towards `horizon` by `haze`, then lerped towards `horizon × nightShade` by `night` (three.js `Color.lerp`, two scratch colours made once; `horizon` is the shared object `skyColours` returns and is never changed).
- **`scene.ts`**: `const horizonLand = buildHorizonLand();` next to the other builders, `scene.add(horizonLand.object)` (a child of the scene, **not** of `world.group`, which is shifted with the map; **not** in the picker's list, **not** in the reflection scene). In the render function, right after `dome.update(…)`: `horizonLand.update(camera, boatState.headingDeg, colours.horizon, light.night);` and `drawnHeadingDeg = boatState.headingDeg;` (a new `let drawnHeadingDeg = 0;` declared next to `const horizonLand`, read by the probe in 1.6).
- **Spotlight**: the land is part of the normal scene pass, so the spotlight's veil darkens it like the water; it is not one of the spotlit meshes.
- The Top camera looks almost straight down, so the land barely shows there; the map views draw nothing of it (no change to `mapView.ts`).

### 1.6 Debug hooks (`scene.ts`, inside the existing `?debug=1` `__sailDebug` object)

- `horizonLandState(): { position: Vec3; cameraPosition: Vec3; rotationYDeg: number; vertices: { far: number; near: number } }`: the group's position, the camera's position, `object.rotation.y / DEG`, and each layer's vertex count.
- `horizonLandProbe(bearingDeg: number, elevationDeg: number): { x: number; y: number; inside: boolean; hit: HorizonLayer | null }`: a ray from the camera towards compass bearing `bearingDeg`, `elevationDeg` above the camera's level. Its direction in the boat frame is built **without** the land's own transform, from the model's `mapToBoat` (`src/model/mapFrame.ts`): `[fwd, stbd] = mapToBoat(sin b, cos b, headingDeg)` (east, north), direction `normalize(fwd, tan(elevationDeg · DEG), stbd)`, with `drawnHeadingDeg` (1.5). Before casting, `horizonLand.object.updateMatrixWorld(true)`. `hit` is the layer of the first of the two land meshes a `THREE.Raycaster` from `camera.position` (the camera's own position, not the rig's target) along it meets, or null. `x`, `y` are the CSS pixels on the canvas of `camera.position + 100 · direction` (`Vector3.project(camera)`, then `((ndc.x + 1) / 2) · width`, `((1 − ndc.y) / 2) · height` of the canvas's bounding rectangle); `inside` is true when both lie on the canvas and `ndc.z < 1`. CSS pixels need no device-pixel-ratio factor (the bounding rectangle is in CSS pixels).

### 1.7 Learn entry, registry and strings

Registry (`content/registry/parts.json`, after `env_shore`): `{"id": "env_distant_land", "kind": "environment", "phase": 104, "group": "sea", "status": "draft", "sources": [], "related": ["term_heading", "env_water", "helm_starboard"], "showMe": "?wd=0&ws=12&ms=40&js=100&cam=side-starboard&hdg=90&ap=hdg&sea=flat"}`. The link sails east with the camera on the starboard side looking across the boat to the north, at the highest mountains.

`content/lang/en/glossary.json`, `entries.env_distant_land` (final English):

- `name`: "Distant land"
- `alternatives`: ["Mountains", "Horizon"]
- `short`: "Hills, mountains and islands far away on the horizon."
- `what`: "Far away round the sea: high mountains to the north, lower hills in front of them and behind the bay, a long island to the south and open sea to the south-west. In the app you can never reach them: they stay the same distance away however far you sail. They turn round you as the boat turns, so they show how far and how fast you are turning. A helmsman (the person steering) often picks a point far ahead, such as a peak, and steers towards it to keep a straight course."
- `showMe`: "Sailing east: the camera looks across the boat to the north, at the mountains. Steer, and the land slides past behind the boat."
- `textStatus`: "draft"

German, Norwegian and Russian: the same fields as AI drafts, `textStatus: "draft"`.

**No "Where is it?" for far-away land.** The spotlight flies the camera close to a part, which cannot work for land 800 m away and out of the camera's 140 m reach. `src/model/glossary.ts` gets, after `NOT_DRAWN`: `/** Drawn, but too far away for "Where is it?" to fly to (the entry's Show it working shows it instead). */ export const FAR_AWAY: ReadonlySet<string> = new Set(['env_distant_land']);`. `learnTab.ts`: the condition for the `learn-show-on-boat` button becomes `entry.kind !== 'term' && !NOT_DRAWN.has(entry.id) && !FAR_AWAY.has(entry.id)`. The id is **not** added to `NOT_DRAWN` (a mesh carries it; `tests/glossary.test.ts` section 11 checks that).

No `ui.json` string is added.

### 1.8 Tests (`tests/horizonLand.test.ts`, Vitest)

Unit tests (no browser), on `area.horizonLand` from `src/model/area.ts`:

1. **Data**: every ridge has `toDeg > fromDeg`, `toDeg − fromDeg < 360`, `rippleDeg ≥ 0`, peaks with bearings strictly rising and strictly inside `(fromDeg, toDeg)` and heights in `[0, 8]`; `layer` is `far` or `near`.
2. **`ridgeHeightDeg`**: 0 at and outside both ends; at a peak it equals the peak height plus the ripple (`toBeCloseTo`, 6 digits) for "mountains north" at 375; never negative over 0.1° steps across every ridge.
3. **`horizonProfile`** (stepDeg 1, length 360), bands from the prototype (1.4) ± 0.01: far[0] = 5.120, far[15] = 5.509, far max 5.582 at index 19, far[125] = 2.509; near[0] = 1.300, near[180] = 1.300, near max 1.695 at index 349; both 0 for every index 215–240 (**the open-sea gap**); `stepDeg = 2` gives length 180 and its element 7 equals the stepDeg-1 element 14; `stepDeg = 7` throws.
4. **Mesh** (`buildHorizonLand()`, three.js in Node as `tests/boatModel.test.ts` does; vertex order as in 1.5): two meshes, each with 722 vertices; the far layer's foot vertex at bearing 90 (vertex 180) has `x ≈ 0`, `y = 0`, `z ≈ 840` (`toBeCloseTo`, 3 digits), and its top vertex at bearing 15 (vertex 31) has `x ≈ 840 cos 15°`, `z ≈ 840 sin 15°`, `y ≈ 840 · tan(5.509°)` (± 0.2 m); `userData.partId === 'env_distant_land'`; `material.fog === false`.
5. **Compass frame**: after `update(camera at (12, 5, −7), headingDeg 90, horizon colour, night 0)` and `object.updateMatrixWorld(true)`, the group's position is `(12, 0, −7)`, and the far layer's foot vertex at bearing 90, taken to world space (`localToWorld`), lies at `x ≈ 12 + 840`, `z ≈ −7` (**east is dead ahead on heading 90**); with heading 0 the foot vertex at bearing 0 lies ahead (`x ≈ 12 + 840`) and the one at bearing 90 to starboard (`z ≈ −7 + 840`).
6. **Colour**: with `night = 1` each layer's colour equals `horizon.clone().multiplyScalar(nightShade)` (compare `getHex()` of both; the expected value is built from the same `THREE.Color`, so both are in the same colour space); with `night = 0` and horizon `#d6e7f2` the far colour lies closer to the horizon than the near colour (sum of absolute RGB differences).

`tests/glossary.test.ts`: section 11 finds `'env_distant_land'` in `src/render3d/horizonLand.ts` unchanged. **Change** "the groups have the expected sizes and members": the `sea` group (index 9 of `GROUPS`) grows from 9 to 10, so the list becomes `[9, 10, 13, 9, 18, 22, 13, 14, 32, 10, 20]`. **Add** in section 11 (import `FAR_AWAY` from `../src/model/glossary` beside `NOT_DRAWN`): `FAR_AWAY` ids are registry ids and none is in `NOT_DRAWN`.

### 1.9 Common mistakes

- **Land parented to `world.group`**: the world group is shifted with the map, so the land would come closer as the boat sails. It is a scene child that copies the camera's x and z.
- **Bearing in the wrong frame**: in the group's local frame x is north and z is east (`(R cos b, …, R sin b)`), the same frame as `world.group`; swapping sin and cos mirrors the land east–west. Test 1.8.5 catches it.
- **Degrees vs radians**: `ridgeHeightDeg` takes and returns degrees; `Math.tan` and `rotation.y` take radians (`· DEG`).
- **Fog left on**: the land disappears into plain horizon colour. `fog: false` on the material.
- **Radius beyond 860 m**: past the water's reach the land would float above the sky's below-horizon colour, and past 1000 m the far plane cuts it. Keep 800 and 840.
- **The probe built from the land's own transform**: the check would then agree with any mistake. `horizonLandProbe` uses `mapToBoat`.

### 1.10 Browser checks (`scripts/shots-m104.mjs`, joins group `m18`, the sky's group)

**Budget**: no new group. `scripts/ci-plan.mjs` `GROUP_ALIASES` gets `m104: 'm18'` (so `SHOTS_ONLY=m104` and the PR title run it); in `scripts/shots.mjs` import `liveM104Checks` and `M104_SCENES` from `./shots-m104.mjs` and turn the `m18` live group into `m18: members(['m18', () => liveM18Checks(live)], ['m104', () => liveM104Checks(live)]),` (the form `tests/ciPlan.test.ts` requires for a merged milestone, as `m6` does). Expected addition about 30 s (m18 recorded 78 s); change the `m18` line in `.github/ci-times.json` only if the measured time exceeds 117 s (more than half again: CLAUDE.md), and report the measured time in the PR either way; above 120 s, say so in the PR. Nothing becomes redundant. The outline, the frame and the colours are unit tests (1.8); the browser checks only what needs the real 3D view.

**Scenes** (`M104_SCENES`, all sizes, each `waitMs: 2500`, each with `sheet: 'peek'` (so the sheet does not cover the lower view on a phone), registered in `SCENES` as `{ ...scene, name: \`m104-${scene.name}\` }` as `M18_SCENES` is; `openPage`'s label rules apply as they match (`m104` matches the `m1\d` rule, so the boat is held still, and `mm=0` is added: both harmless here); `BASE = '?wd=0&ws=12&ms=40&js=100&tb=0&clock=0&sea=flat'`):

| name | query | shows |
|---|---|---|
| `land-north` | `BASE&cam=side-starboard&hdg=90` | the highest mountains behind the boat, hills in front of them |
| `land-south` | `BASE&cam=side-port&hdg=90` | the island to the south |
| `land-sunset` | `?wd=90&ws=12&ms=40&js=100&tb=0&clock=0&sea=flat&cam=side-starboard&hdg=30&clk=202606012020` | looking west-north-west (300°): the low sun over the hills behind the bay, land warm-tinted |
| `land-night` | `BASE&cam=side-starboard&hdg=90&clk=202606012300` | dark mountains just visible against the night sky |

(The `side-starboard` camera sits on the boat's starboard side looking to port, towards bearing heading − 90: heading 90 puts north behind the boat; `side-port` looks towards heading + 90: south.)

**Live checks** (`export async function liveM104Checks({ openPage, viewports, outDir, prefix, problems })`, the same `check` and `shot` pattern as `liveM18Checks`; phone viewport only). Each page: `?wd=0&ws=0&held=1&tb=0&clock=0&mm=0&sea=flat&detail=low&debug=1&cam=helm&mf=0&jf=0&hdg=<H>` plus `&clk=202606012300` for night; `page.waitForTimeout(1500)`; then `setSheet(page, 'peek')` and the overlay-hiding style tag (see the block luminance below), then `__sailDebug.setView([10, 3, 0], [25, 3, 0], 40)` (the camera just ahead of the bow, level, looking ahead: no part of the boat in the way) and `page.waitForTimeout(800)`; only then read the probes and blocks (the peek resizes the view, so it comes before the view is set). Page labels: `m104 land noon`, `m104 gap noon`, `m104 land night`, `m104 gap night`, `m104 learn`; the `check` helper pushes `live M104 <what>: <detail>`.

1. **Noon, H = 15**: `horizonLandState()`: position x and z equal the camera's within 0.01 m, y = 0; `rotationYDeg` = 15 ± 0.01; 722 vertices per layer. `horizonLandProbe`: (15, 0.6) inside and `near`; (15, 3) inside and `far`; (15, 7) null; (125, 1.5) `far`; (180, 0.6) `near`; (228, 0.5) null; (228, 3) null. Read `landNoon` = the mean luminance of the 9 × 9 px block at probe (15, 3).
2. **Noon, H = 228** (open sea ahead): probe (228, 3) inside and null; `skyNoon` = its block's luminance. Check `landNoon < 0.95 · skyNoon`.
3. **Night, H = 15**: `landNight` at probe (15, 3). **Night, H = 228**: `skyNight` at probe (228, 3). Check `landNight < 0.9 · skyNight`.
4. **Learn**: `?m=learn&learn=env_distant_land&sea=flat`: the entry's name "Distant land" shows, `learn-show-me` is there, `learn-show-on-boat` is not.

The thresholds come from the colours of 1.5 (prototype, sRGB luminance): at noon the horizon is 0.895, the far land 0.726 (ratio 0.81), the near land 0.558; at full night the horizon is 0.075 and both layers 0.051 (ratio 0.68). The sky block at 3° is not the pure horizon colour: `skyDome.ts` mixes towards the zenith by `pow(sin el, 0.6)`, 0.17 at 3°, which brings the expected sky to about 0.85 at noon (land ratio about 0.85) and 0.066 at night (ratio about 0.77): both still under 0.95 and 0.9. A star inside the sky block only raises `skyNight`, which helps the check.

The block luminance: a helper `blockLuminance(page, x, y)` in `shots-m104.mjs`. The page has already been peeked and its overlays hidden with the same `addStyleTag` as `canvasStats` in `shots-m18.mjs` (`setSheet` from `./ui.mjs`), in the order above. For each block it screenshots the canvas clip `{ x: canvas.x + x − 4, y: canvas.y + y − 4, width: 9, height: 9 }`, decodes it in the page and returns the mean of `(0.2126 R + 0.7152 G + 0.0722 B) / 255`. Save `live-phone-land-noon`, `-gap-noon`, `-night`, `-gap-night`.

**Older checks and tests this milestone changes.** No count or list grows (no exercise, chip, section, URL key or group is added). The scenes and live checks of `m16`, `m17` and `m18` now show land on the horizon; none of them measures the horizon's pixels (`m17`'s sun check reads the sun's projected position, `m18`'s sky-only view looks steeply up, its night check reads the boat's square), so none changes. `scripts/budget.mjs` keeps its limits (two draw calls and 1,440 triangles more). `tests/ciPlan.test.ts`: the group list and its cap are unchanged (m104 is an alias; the test checks that `scripts/shots-m104.mjs` exists and that `m18` runs `liveM104Checks(` through `members(`). `tests/glossary.test.ts`: the group sizes, as in 1.8.

**PR line:** `CI groups: all` (the scene setup changes: CLAUDE.md).

### 1.11 Done when / not in this milestone

PR: `Closes #243`, `Closes #200`.

Done when: the land shows round the horizon at all sizes, with the open-sea gap to the south-west; it turns with the boat and never gets closer; the far layer is paler than the near one; at night it is a dark shape against the sky; every test of 1.8 and check of 1.10 passes, and `npm run check` passes; the CI run with `CI groups: all` is green.

Not in this milestone: names on the land; tapping it; the land on the mini-map or the bird's-eye map; the land in High detail's water reflections; lights of towns at night; real coasts that can be reached (they wait for bigger maps); a setting or URL key to hide it; other areas' land (an area without `horizonLand` is not supported yet: the Adriatic is the only area).

### 1.12 Decided (owner in the planning chat, 2026-11-17: "Accept all")

1. **The land fits this app's marina and bay** (mainland to the north and west, islands to the south and east, open sea to the south-west), not the real view from Split harbour, which would put islands where the app's bay is. The heights follow the real view (1.1).
2. **A Learn entry "Distant land"** (draft): out of reach, turns round you as you turn, a helmsman steers by a mark far ahead (1.7).
3. **Always shown**, in every place, sea setting, camera and time of day; no switch, no URL key (1.1).
