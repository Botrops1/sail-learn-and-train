# People on board, part 1: the captain (M111–M112)

Planned on 2026-11-21 from the physics study's section 8 ([PHYSICS_ENGINE_ANALYSIS](PHYSICS_ENGINE_ANALYSIS.md) 8, owner on PR #193) and the owner's sailor mockup ([`docs/mockups/sailor-draft.html`](mockups/sailor-draft.html)). The owner's answers are in section 9.

## 0. How to use this spec

- Two milestones, built in order, **one PR each**, titled `M<N>: <name>` (names in section 6), each saying `Closes #<n>` for its milestone issue (section 6). The issue is a short card for the owner; this spec is the source the builder follows.
- Read sections 0–5, then **only your milestone's section** (7 for M111, 8 for M112). The general rules are in CLAUDE.md. Names (files, functions, store actions, `data-testid`s, string keys, registry ids, data keys) are required. Numbers are final unless marked **tunable**.
- **Text is data.** The English strings here are final. German, Norwegian and Russian strings are AI drafts the builder writes: every new key exists in `content/lang/{de,no,ru}/*.json`, glossary entries with `textStatus: "draft"`, and the builder runs `npm run review-doc -- de`, `-- no` and `-- ru` after changing them.
- **If a test band fails:** check section 4 first, then tune only keys marked **tunable** and report the before and after values in the PR. Never widen a band.
- Keep the signatures written here. Decisions taken while building go in a new last subsection of your section, "Decided in the M<N> PR", marked "recommended; merging accepts it", with a ROADMAP decisions-log row pointing to it (CLAUDE.md). Every milestone also updates `docs/CODE_MAP.md` for its files, `docs/BOAT_REFERENCE.md` for its new assumptions and `.github/ci-times.json` when its group's measured time changes by more than half.
- **Build order:** M112 starts after M111 is merged. Both are independent of the Rigging phase's M108–M110 (PHASE_RIGGING_SPEC) and may be built before or after them; where a file both touch has changed (a glossary group count, `shots.mjs`, `ci-plan.mjs`), use what is on `main` and say so in the PR.
- Every earlier phase keeps working: an old link opens the same picture plus the captain, and every earlier unit test and browser check stays green, except the ones a milestone's "Older checks" subsection names.

## 1. Goal and scope

**Goal.** Show the user on the boat as one figure, the captain, so it is always clear where you stand: at the wheel when you steer, at the station you work in Realistic ropes. Then make moving between stations take the time it takes on a real deck, along the side the wind comes from.

**In scope:** the captain figure from the owner's mockup, drawn at both details within the phone budget (M111); standing at the helm in Easy ropes and at the chosen station in Realistic ropes (M111); walking between stations along the deck in Realistic ropes (M112).

**Out of scope (owner, section 9):** a crew (part 2), the people's weight in the heel and trim (part 2, after the physics study's fixed step), the long coat, the wool cap, the pipe and the wave pose of the mockup, a setting for the captain's look, the camera following the walk, walking between the two wheels, a 3D label for the captain, a physics engine.

## 2. Conventions

- **Boat frame** (as everywhere, `docs/BOAT_REFERENCE.md`): metres, origin at the mast on the waterline on the centreline, **x forward, y up, z to starboard**. Points in the boat file are `[x, y, z]`.
- **Side**: `1` = starboard, `-1` = port. A deck point's suffix `_s` / `_p` names its side.
- **Facing** (`faceDeg`): the direction the figure faces, in degrees from forward (+x) towards starboard (+z): 0 forward, 90 starboard, −90 port, 180 aft. A facing from a direction `(dx, dz)` is `atan2(dz, dx)` in degrees.
- **Apparent wind**: `awaDeg` is −180…180, **+ = wind over starboard** (`rig.wind.awaDeg`). The windward side is `+1` when `awaDeg > 0`, `−1` when `awaDeg < 0`.
- **Time**: everything that moves uses the step's `dt` (0 while paused, scaled by the time speed); nothing reads the wall clock. The figure's small idle movements in the renderer use the frame time the scene already gets (`render(now)`), which the browser checks' test clock controls.
- Degrees in data and state; radians only inside `Math` and three.js calls (`DEG` from `src/model/angles.ts`).

## 3. Shared helpers

| Name | File | Signature | Behaviour |
|---|---|---|---|
| `deckPoints` | `src/model/people.ts` (M111) | `(data?: BoatData): Record<string, DeckPoint>` | Every deck point by id, sided points expanded (7.3). Cached per `data` object. |
| `stationSpot` | `src/model/people.ts` (M111) | `(station: StationId, helmSide: 1 \| -1, data?: BoatData): string` | The point id where the captain stands at a Realistic station (7.3). |
| `captainPlacement` | `src/model/people.ts` (M111; walking from M112) | `(input: CaptainInput, data?: BoatData): CaptainPlacement` | Where the captain stands, which way he faces and in which pose (7.3, 8.3). |
| `figureJoints` | `src/model/figurePose.ts` (M111) | `(pose: FigurePose, t: number, walkedM: number, data?: BoatData): JointAngles` | The joint angles of a pose at time `t` (s); the walk's phase comes from the distance walked (7.3). |
| `deckRoute` | `src/model/people.ts` (M112) | `(from: string, to: string, windward: 1 \| -1, data?: BoatData): DeckRoute` | The shortest way along the walkways, using only the windward side's deck points (8.3). |

## 4. Common mistakes

- **The figure faces +z in the mockup.** Turn its root by `(90 − faceDeg)·DEG` about y, so `faceDeg = 0` faces forward (+x).
- **Port and starboard swapped.** `helm_p` has `z < 0`. `camera.helm.wheel === 'port'` means side −1.
- **A number in code.** Deck points, walkways, walking speed and the stride are in `content/boat/hanse508.json` under `people`; the figure's proportions and colours are picture numbers in `src/render3d/sceneConfig.ts` under `SCENE.people` (they are not boat geometry).
- **Too many draw calls.** The mockup is 89 meshes in 21 materials. The app's captain is **one** `SkinnedMesh` with vertex colours (7.6); High is already at 246 of 300 draw calls.
- **The wall clock.** The walk advances with `dt` in the store; the stride's phase comes from the distance walked, not from time, so the feet do not slide and a paused walk stands still.
- **State not reset.** A link, Reset and the setup file never start mid-walk: `walk` is `null` after `load` and `reset` (M112).

## 5. Architecture

**State.** M111 adds none: the captain's place follows from `settings.ropesMode`, `realistic.station`, `realistic.winches` and `camera.helm.wheel`. M112 adds one field to `RealisticState` (`src/model/realistic.ts`):

```ts
/** M112: the walk to the current station, or null when the captain stands at it. */
walk: WalkState | null;
```

**Model.** `src/model/people.ts` (deck points, placement, routes) and `src/model/figurePose.ts` (the pose's joint angles) are pure. The renderer only reads `captainPlacement(…)` and `figureJoints(…)`.

**Render.** `src/render3d/people/figureMesh.ts` builds the skinned figure from the mockup's builder; `src/render3d/people/captain.ts` wraps it as `CaptainModel`; `buildBoat` adds it to the boat's `root` (so it heels, pitches and heaves with the boat) and `BoatModel.setCaptain(…)` places it each frame.

**Step order** (M112): `stepRealistic` advances `walk` (8.3); nothing else moves.

**URL**: no new key. The link's `st` is the station the captain is at or walking to; a link opens with him standing there.

**Files added**, by milestone: M111 `src/model/people.ts`, `src/model/figurePose.ts`, `src/render3d/people/figureMesh.ts`, `src/render3d/people/captain.ts`, `tests/people.test.ts`, `tests/captainFigure.test.ts`, `scripts/shots-m111.mjs`; M112 `scripts/shots-m112.mjs`. Each adds its files to `docs/CODE_MAP.md`.

**Browser checks.** The set is at its cap (77 groups, `tests/ciPlan.test.ts`): each milestone joins an existing group with `members(...)` and a `GROUP_ALIASES` entry, as M104 did with `m18` (PHASE_HORIZON_SPEC 1.10): M111 joins `m73` (recorded 64 s), M112 joins `m17` (72 s).

## 6. Milestones overview

| Milestone | What the owner sees | Issue | Rules tested | Depends on | Independent review |
|---|---|---|---|---|---|
| **M111: The captain on board** | A captain in a dark blue jacket and cap stands behind the wheel in every mode; in Realistic ropes he stands at the station you pick (still a jump); hidden in the Helm view, where you see through his eyes; tap him for his Learn entry | #260 | none | — | **required** (a new kind of 3D object, the skinned figure, inside the phone budget; shared boat model and scene) |
| **M112: The captain walks** | In Realistic ropes, picking a station makes him walk there along the deck, on the windward side, in the seconds it takes (up to 19 s to the bow); lines can be worked when he arrives; the two Realistic exercises take the walk into account | #261 | PT-74 | M111 | **required** (shared Realistic state and model, every Realistic exercise and older checks) |

## 7. M111: The captain on board

**Independent review: required** (a new kind of 3D object inside the phone budget; changes the shared boat model and scene).

### 7.1 Files

`content/boat/hanse508.json`, `content/registry/parts.json`, `content/lang/{en,de,no,ru}/glossary.json`, `src/model/people.ts` (new), `src/model/figurePose.ts` (new), `src/model/boatProfile.ts`, `src/render3d/sceneConfig.ts`, `src/render3d/people/figureMesh.ts` (new), `src/render3d/people/captain.ts` (new), `src/render3d/boat/index.ts`, `src/render3d/scene.ts`, `tests/people.test.ts` (new), `tests/captainFigure.test.ts` (new), `tests/glossary.test.ts`, `tests/boatModel.test.ts` and `tests/labels3d.test.ts` (only if 7.10 finds a count or list to change), `scripts/shots-m111.mjs` (new), `scripts/shots.mjs`, `scripts/ci-plan.mjs`, `.github/ci-times.json`, `docs/CODE_MAP.md`, `docs/BOAT_REFERENCE.md`, `docs/ROADMAP.md` (the decisions row), `docs/review/{de,no,ru}.md` (regenerated).

### 7.2 Data (`content/boat/hanse508.json`)

A new top-level key `people`, after `realisticMode`. Every value is an **assumption**, recorded in `BOAT_REFERENCE.md` under a new heading "People on board (M111)"; the points were measured from this file's deck (`sheerAt`, `sideDeckInnerHalfWidth`, `halfBeamAt`, `deck.cockpit.soleY`, `deck.coachroof.topY`) clear of the wheels, pedestals, rope boxes, shroud feet, stanchions and hatches (the tests in 7.8 check this). Points are **tunable** only to fix a clash seen in a picture, and the PR says so.

```json
"people": {
  "source": "assumption (PHASE_PEOPLE_SPEC 7.2): spots and walkways measured from this file's deck, clear of the wheels, pedestals, rope boxes, shroud feet, stanchions and hatches",
  "strideM": 1.39,
  "strideMNote": "One full walking cycle (two steps) of the mockup's figure: legs 0.85 m, thigh swing 0.42 rad",
  "points": {
    "helm": { "at": [-7.85, 1.0, 0.88], "sided": true, "faceDeg": 0 },
    "winch": { "at": [-7.75, 1.0, 1.08], "sided": true, "faceDeg": 45 },
    "aftCentre": { "at": [-7.95, 1.0, 0] },
    "cockpitCentre": { "at": [-6.5, 1.0, 0] },
    "cockpitFront": { "at": [-3.6, 1.0, 1.0], "sided": true, "deck": true },
    "sideDeckAft": { "at": [-3.6, 1.507, 1.85], "sided": true, "deck": true },
    "sideDeckRoof": { "at": [-3.0, 1.518, 2.05], "sided": true, "deck": true },
    "sideDeckMast": { "at": [-0.6, 1.56, 1.77], "sided": true, "deck": true },
    "coachroofSide": { "at": [-0.6, 1.96, 1.0], "sided": true, "deck": true },
    "sideDeckFwd": { "at": [1.2, 1.594, 1.5], "sided": true, "deck": true },
    "foredeckSide": { "at": [2.8, 1.626, 0.8], "sided": true, "deck": true },
    "mast": { "at": [-0.75, 1.96, -0.2], "faceDeg": 0 },
    "bow": { "at": [4.85, 1.682, 0], "faceDeg": 0 }
  },
  "walkways": [
    ["helm", "winch"], ["helm", "aftCentre"], ["aftCentre", "cockpitCentre"],
    ["cockpitCentre", "cockpitFront"], ["cockpitFront", "sideDeckAft"], ["sideDeckAft", "sideDeckRoof"],
    ["sideDeckRoof", "sideDeckMast"], ["sideDeckMast", "coachroofSide"], ["coachroofSide", "mast"],
    ["sideDeckMast", "sideDeckFwd"], ["sideDeckFwd", "foredeckSide"], ["foredeckSide", "bow"]
  ],
  "stationSpots": { "port": "winch_p", "starboard": "winch_s", "helm": "helm", "mast": "mast", "bow": "bow" }
}
```

What the points are: `helm` behind each wheel (the wheel plane is at x −7.2); `winch` beside it, facing the primary winch (the Port and Starboard stations); `aftCentre` and `cockpitCentre` the walkway between the two wheels; `cockpitFront` the front of the cockpit; `sideDeck*` along each side deck, between the coachroof and the toerail; `coachroofSide` up on the coachroof beside the mast; `mast` behind the mast by the furling gearbox (the Mast station); `foredeckSide` and `bow` on the foredeck, behind the windlass (the Bow station). `mast` is one spot a little to port of the centreline (beside the gearbox), reached from either side's `coachroofSide`; `bow` is on the centreline. `walkways` is used from M112; M111 only reads the spots. `walkSpeedMps` is added by M112.

`src/model/boatProfile.ts`: `ADDED_KEYS` gains `'people'`, so an imported profile without it gets the Hanse 508's (BOAT_PROFILE). The point ids, `walkways` and `stationSpots` are names the code looks up: a new `WHOLE_NAMING_PATHS: ReadonlySet<string> = new Set(['boat.people.walkways', 'boat.people.stationSpots'])` (full paths, as `FREE_NAMING_PATHS` writes `boat.meta.id`) is checked at the top of `walk`, before the type dispatch: at those paths the value must equal the reference as `JSON.stringify` text, otherwise one problem `(path, 'ids', 'expected the reference value')`, and the walk does not descend into them (`walkArray` would read the rows of strings as a numeric table). For `boat.people.points` the walk also reports a key the reference does not have (`(path + '.' + key, 'ids', 'unexpected point')`), since `walk` only visits the reference's keys. The points' coordinates may differ.

### 7.3 Model

`src/model/people.ts` (pure):

```ts
export interface DeckPoint {
  id: string;
  at: Vec3;
  /** 1 starboard, −1 port, 0 a point on (or near) the centreline that has no side. */
  side: 1 | -1 | 0;
  /** Out of the cockpit, on the side deck, coachroof or foredeck: M112's windward rule applies. */
  deck: boolean;
  /** Only the spots where the captain stops have one. */
  faceDeg: number | null;
}
export type FigurePose = 'stand' | 'steer' | 'work' | 'walk';
export interface CaptainInput {
  ropesMode: RopesMode;
  realistic: RealisticState;
  helmWheel: HelmWheel;
}
export interface CaptainPlacement {
  /** Where the feet stand, boat frame. */
  feet: Vec3;
  faceDeg: number;
  pose: FigurePose;
  /** Metres walked in the current walk (0 when standing): the stride's phase. */
  walkedM: number;
}
export function deckPoints(data?: BoatData): Record<string, DeckPoint>;
export function stationSpot(station: StationId, helmSide: 1 | -1, data?: BoatData): string;
export function captainPlacement(input: CaptainInput, data?: BoatData): CaptainPlacement;
```

- **`deckPoints`**: a point without `sided` keeps its id, `side` 0. A point with `sided: true` becomes two: `<id>_s` with `at` as written, `side` 1, and `<id>_p` with `z` negated, `side` −1; `faceDeg` is negated for `_p` (45 → −45; 0 stays 0). `deck` is `true` only where the data says so; `faceDeg` is `null` where the data has none.
- **`stationSpot`**: the `stationSpots` entry of the station. If it is an id of `deckPoints()` (an expanded id such as `winch_p`, or a centre point such as `mast`), return it. Otherwise it is a key of `people.points` with `sided: true` (`helm`): append `_s` for `helmSide` 1 and `_p` for −1. So `stationSpot('port', …)` is `winch_p`, `stationSpot('helm', -1)` is `helm_p`.
- **`captainPlacement`** (M111): with `helmSide = helmWheel === 'starboard' ? 1 : -1`:
  - `ropesMode === 'easy'`: the spot is `stationSpot('helm', helmSide)`.
  - `ropesMode === 'realistic'`: the spot is `stationSpot(realistic.station, helmSide)`.
  - `feet` is the spot's `at`, `faceDeg` its `faceDeg`, `walkedM` 0.
  - `pose`: `'steer'` at a `helm_*` spot; at a `winch_*` spot `'work'` while the station's winch button is held (`const w = stationWinch(station); w !== null && realistic.winches[w]?.button === true`), otherwise `'stand'`; `'stand'` at `mast` and `bow` (the gearbox crank and the windlass do not change the pose). In Easy ropes always `'steer'`, whatever `realistic` holds.

`src/model/figurePose.ts` (pure): the poses of the mockup (`POSES` inside its builder), with `pull` renamed `work`, `idle` renamed `stand`, `wave` dropped, a new `steer`, and the walk driven by distance.

```ts
export interface JointAngles {
  rootY: number; torsoX: number; torsoY: number; torsoZ: number;
  headX: number; headY: number; headZ: number; brow: number; browTilt: number;
  lSx: number; lSz: number; lEx: number; lEz: number; rSx: number; rSz: number; rEx: number; rEz: number;
  lHx: number; lKx: number; lAx: number; rHx: number; rKx: number; rAx: number;
}
export const REST_JOINTS: JointAngles; // the mockup's REST, value for value
export function figureJoints(pose: FigurePose, t: number, walkedM: number, data?: BoatData): JointAngles;
```

`figureJoints` returns `{ ...REST_JOINTS, ...pose values }` (angles in radians, `rootY` in metres). The values are the mockup's, typed as written there, with these changes:

- `stand`: the mockup's `idle(t)`.
- `work`: the mockup's `pull(t)`.
- `walk`: the mockup's `walk(t)` with its phase `ph = t * 5.6` replaced by `ph = 2π · walkedM / people.strideM` (`t` unused).
- `steer` (new; **tunable** only so that the hands rest on the rim in the `m111-helm` scene, and the PR says so): `{ lSx: -1.0, rSx: -1.0, lEx: -0.5, rEx: -0.5, lSz: 0.12, rSz: -0.12, torsoX: 0.03, headX: -0.05, headY: Math.sin(t * 0.4) * 0.15, brow: Math.max(0, Math.sin(t * 1.1)) * 0.4, rootY: Math.sin(t * 1.6) * 0.002 }`.
- The leg length the walk uses (`L` in the mockup) is `0.85` (`thigh + shin`), exported as `FIGURE_LEG_M` from this file (the model cannot import `SCENE`); test 13 ties it to `SCENE.people.body`.

### 7.4 Store and URL

No change. `scene.ts` computes the placement each frame from the state (7.6).

### 7.5 UI

No panel change. Tapping the captain in the 3D view opens the existing part card (`infoCard.ts`) for `person_captain`, as for any part; "More" opens his Learn entry.

### 7.6 3D (`src/render3d/people/figureMesh.ts`, `captain.ts`, `boat/index.ts`, `scene.ts`)

**Reference.** The figure is the mockup's: the code between `SAILOR BUILDER (portable)` and `END SAILOR` in `docs/mockups/sailor-draft.html`, ported to TypeScript with the same shapes, sizes, positions and joint hierarchy, with the owner's look (section 9): the **dark blue jacket** and the **captain's cap**. Left out: the pipe (bowl, stem, rim, ember) and the mouth that holds it, the long coat and its parts (skirts, buttons, lapels, shirt, tie), the wool cap, the crown hair shown without a hat, `setLook` and the `wave` pose. Kept: hair and beard balls, eyebrows (no eyes or nose, as in the mockup), the epaulettes, the jacket's zip, pocket flaps and collar.

**Numbers.** The mockup's `C` colours (the kept ones: `skin`, `skinShade`, `jacket`, `jacketLight`, `trousers`, `shoe`, `sole`, `gold`, `zip`, `hair`, `capWhite`, `capBand`, `visor`) go into `SCENE.people.colours`; its `D` proportions into `SCENE.people.body` and `HD` into `SCENE.people.head`, value for value. Also `SCENE.people.hideNearEyeM: 0.9`, `SCENE.people.smoothingPerS: 10` (the mockup's `1 - exp(-10·dt)`) and `SCENE.people.turnDegPerS: 360` (how fast the body turns to a new facing).

**One skinned mesh** (`figureMesh.ts`):

```ts
export const BONE_NAMES = ['root', 'torso', 'neck', 'browHolder_l', 'brow_l', 'browHolder_r', 'brow_r', 'shoulder_l', 'elbow_l', 'shoulder_r', 'elbow_r', 'hip_l', 'knee_l', 'ankle_l', 'hip_r', 'knee_r', 'ankle_r'] as const;
export interface FigureMesh { mesh: THREE.SkinnedMesh; bones: Record<(typeof BONE_NAMES)[number], THREE.Bone> }
export function buildFigureMesh(detail: Detail): FigureMesh;
```

1. Build the ported hierarchy (groups for the joints, meshes for the parts) with every joint rotation 0, and `updateMatrixWorld(true)` with the figure's root at the origin. Index `[0]` of the mockup's joint arrays is `_l`, `[1]` is `_r`; the brows are the two `P.brow` groups (`userData.side` 1 → `brow_l`), each inside its `holder` group. `root` is the figure root (the mockup's `root`, at the feet).
2. Make one `THREE.Bone` per joint group, named from `BONE_NAMES`. A bone's rest transform is its joint group's transform relative to the parent joint's group, composing any plain groups between them (such as the head's offset group). The two eyebrow `holder` groups have a rotation (`place` and `rotateZ`), so each becomes its own bone (`browHolder_l` / `_r`, parent `neck`, rest = the holder's transform relative to the neck group); `brow_l` / `_r` are its children with the brow pivot's local transform. The `head` group between `neck` and the holders has only an offset and is folded into their rest transforms. Groups with a rotation that only hold meshes (the epaulettes, the cap, the visor) are not between two joints: their transforms are baked into the vertices in step 3 and need no bone. If any other group with a rotation does stand between two joints, it becomes a fixed bone like the holders, and the PR names it. The bone tree then equals the group tree, and the joints animate exactly as the mockup's `update` sets its groups (absolute rotations; `brow` sets the brow bone's `position.y` and `rotation.z`).
3. For each mesh that is drawn in the kept look: its bone is the nearest ancestor joint group (`root` if none). Clone its geometry; for an `InstancedMesh` (the hair and beard balls) make one copy per instance with `instanceMatrix` applied; apply the mesh's `matrixWorld`; convert to non-indexed; keep only `position` and `normal`; add `color` (its material's colour, the same for every vertex), `skinIndex` (`Uint16BufferAttribute`, `[bone, 0, 0, 0]`) and `skinWeight` (`[1, 0, 0, 0]`).
4. `mergeGeometries` (from `three/addons/utils/BufferGeometryUtils.js`, as `boat/parts.ts` does) into one geometry; `new THREE.SkinnedMesh(geometry, material)`; add the `root` bone to it; `mesh.bind(new THREE.Skeleton(bones))` with `bones` in `BONE_NAMES` order; `mesh.frustumCulled = false` (one small object; a walking pose may leave the rest pose's bounds).
5. Material: High `new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, side: THREE.DoubleSide })`, Low `new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })` (the mockup's lofts are open: the collar, sleeve tops and cap band need both sides). One roughness for the whole figure is intended: the gold, the shoes and the visor lose their own shine, which is too small to see at boat scale.
6. **The hair and beard** keep the mockup's `rnd` seed and its skip round the mouth (`mouthDir` and `mouth` stay as points, without the mouth mesh), so the beard leaves the same gap. A removed part that drew from `rnd` before the balls changes their scatter slightly; that is accepted.
7. **Low detail**: every `SphereGeometry`, `CylinderGeometry`, `TorusGeometry` and the head's own warped sphere use half their segments in each direction, rounded up (at least 6 round, 3 along, a torus's tube at least 3); a loft keeps its sections and halves its points round (at least 6); each hair and beard ball is an `OctahedronGeometry(1, 0)` at the same place and size.
8. **Limits** (tested in 7.8): High at most **13,500** triangles (the mockup measured 13,180 in this look, pipe included), Low at most **4,000** (an estimate). If Low is outside its band, change only rule 7's shares until it is inside and report the counts; if High is over, give the hair and beard balls fewer segments (they are 7,840 of the mockup's triangles) and report it. One draw call (two at High, with its shadow).

**The model** (`captain.ts`):

```ts
export interface CaptainModel {
  object: THREE.Group;
  /** Places and poses the figure; `t` and `dt` in seconds (the scene's frame time). */
  update(placement: CaptainPlacement, hidden: boolean, t: number, dt: number): void;
  triangles(): number;
}
export function buildCaptain(detail: Detail): CaptainModel;
```

- `object` holds the skinned mesh and a **pick proxy**: a `CylinderGeometry(0.2, 0.2, 1.8, 8)` mesh centred 0.9 m above the feet (from the side views it does not cover the wheel, which stands 0.65 m forward of the helm spot; a tap that hits both goes to the nearer, as today), with a `MeshBasicMaterial({ visible: false })` (the material is invisible, the object stays `visible`: `picking.ts` skips objects that are not visible, while three's raycast ignores the material, so the proxy takes taps and is never drawn; never set `proxy.visible = false`). The proxy's `userData` is `{ partId: 'person_captain' }`; the skinned mesh's is `{ partId: 'person_captain', noPick: true }` (so the highlight lights it and taps hit the proxy). The id is written as a literal in this file (the `NOT_DRAWN` test).
- `object` is a `THREE.Group` named `'captain'`. `update`: `object.visible = !hidden`; `object.position` = `placement.feet`; `object.rotation.y` (the body's yaw; the skinned mesh and the proxy turn with it) turns towards `(90 − placement.faceDeg) · DEG` the short way round by at most `turnDegPerS · dt`; the joint angles move towards `figureJoints(placement.pose, t, placement.walkedM)` by `1 − exp(−smoothingPerS · dt)`, then set the bones as the mockup's `update` sets its groups (`root.position.y = rootY`; torso, neck, brows, shoulders, elbows, hips, knees, ankles). **The first call after `buildCaptain`** sets the yaw and the joints to their targets at once (so a fresh page, a detail change and a frozen test clock show the pose itself, not the rest pose).
- `triangles()`: the mesh's index-less vertex count / 3.

**Wiring.** `buildBoat` (`boat/index.ts`) builds `buildCaptain(detail)` and adds `object` to `root` **after** the shadow traverse sets `castShadow` and `receiveShadow`; then for the skinned mesh `castShadow = true`, `receiveShadow = false`, for the proxy both false. `BoatModel` gets `setCaptain(placement: CaptainPlacement, hidden: boolean, t: number, dt: number): void`, which calls the captain's `update`. A detail change rebuilds the boat as today, so the captain comes back with the new detail.

**Each frame** (`scene.ts`, in `render(now)` after `boatModel.update(…)`; `now` is the frame's time in ms): `placement = captainPlacement({ ropesMode: state.settings.ropesMode, realistic: state.realistic, helmWheel: state.camera.helm.wheel })`; `hidden` = the camera preset is `'helm'` and the horizontal distance (x, z, boat frame) between `placement.feet` and `helmPose(state.camera.helm).position` is below `SCENE.people.hideNearEyeM` (the eye is 1.0 m behind the wheel: 0.35 m from `helm_*`, 0.49 m from `winch_*` of the same side, 1.8 m from the other wheel's spots, which stay visible; the eye's frame ignores the heel, which is negligible at these distances). A new `let captainAtMs: number | null = null` in the scene gives `dt = captainAtMs === null ? 0 : Math.min(0.1, (now − captainAtMs) / 1000)`, then `captainAtMs = now`; it is reset to `null` when the boat is rebuilt. Call `boatModel.setCaptain(placement, hidden, now / 1000, dt)`.

**Debug hook** (`scene.ts`, in the `?debug=1` `__sailDebug` object): `captain(): { x: number; y: number; z: number; faceDeg: number; pose: FigurePose; hidden: boolean; walkedM: number } | null`, the last placement passed and whether it was hidden; `null` before the first frame. `helmPose` is imported from `./cameraPresets`; the preset read is `state.camera.preset` (the state's, not the camera rig's gliding one).

### 7.7 Strings, registry and Learn

Registry (`content/registry/parts.json`, after the last `cockpit` entry): `{ "id": "person_captain", "kind": "part", "phase": 111, "group": "cockpit", "status": "draft", "sources": [], "related": ["helm_port", "helm_starboard", "term_windward"], "showMe": "?wd=60&ws=10&ms=40&js=60&held=1&sea=flat&cam=side-port&sel=person_captain" }`.

English glossary entry (`content/lang/en/glossary.json`, final; `textStatus: "draft"`; de / no / ru AI drafts):

- `person_captain`: name "Captain (you)"; alternatives `[{ "term": "Skipper" }]`; short "The person in charge of the boat: in the app, you."; what "The figure on deck is you, the captain (also called the skipper): the person responsible for the boat and everyone on board. When you steer, you stand behind a wheel. In Realistic mode you stand at the station you work from: by a winch, at the mast or at the bow. The Helm view looks through your eyes, so there you do not see yourself."; showMe "The captain stands behind the port wheel, steering."

`tests/glossary.test.ts` "the groups have the expected sizes": the sixth number (the `cockpit` group) goes up by 1 (22 → 23 on today's `main`).

No `ui.json` change.

### 7.8 Tests

`tests/people.test.ts`:

1. **Points**: `deckPoints()` has 22 points (9 sided × 2 + 4); `helm_p.at` is `[-7.85, 1.0, -0.88]`, `faceDeg` 0; `winch_p.faceDeg` −45, `winch_s.faceDeg` 45; every `_p` point mirrors its `_s` point (`z` negated, x and y equal within 1e-9).
2. **Spots**: `stationSpot('port', 1)` `winch_p`; `stationSpot('starboard', -1)` `winch_s`; `stationSpot('helm', 1)` `helm_s`; `stationSpot('helm', -1)` `helm_p`; `stationSpot('mast', 1)` `mast`; `stationSpot('bow', -1)` `bow`.
3. **On the deck**: every point in the cockpit (`helm`, `winch`, `aftCentre`, `cockpitCentre`, `cockpitFront`) has `y` equal to `deck.cockpit.soleY` and `|z| ≤ deck.cockpit.wellHalfWidth − 0.2`; the `sideDeck*` points have `|y − sheerAt(x)| ≤ 0.005` and `sideDeckInnerHalfWidth(x) + 0.15 ≤ |z| ≤ halfBeamAt(x) − 0.15`; `foredeckSide` and `bow` have `|y − sheerAt(x)| ≤ 0.005` and `|z| ≤ halfBeamAt(x) − 0.3`; `coachroofSide` and `mast` have `y` equal to `deck.coachroof.topY` and `|z| ≤ sideDeckInnerHalfWidth(x) − 0.2`.
4. **Clear of the gear**: every walkway (both sides expanded) sampled every 0.05 m in (x, z) stays at least 0.25 m from each `shroudFoot(±1).strap.centre` and each `stanchionBases()` point (the prototype's smallest clearance is 0.262 m, on `sideDeckMast_s`–`sideDeckFwd_s`).
5. **Placement**: Easy ropes, `helmWheel 'port'`: feet `[-7.85, 1.0, -0.88]`, `faceDeg` 0, pose `'steer'`. `'starboard'`: z 0.88. Realistic, station `'port'`, no winch button held: feet `winch_p`, pose `'stand'`; with `winches.winch_primary_port.button = true`: `'work'`. Station `'bow'`: feet `[4.85, 1.682, 0]`, `'stand'`. Station `'helm'` with `helmWheel 'starboard'`: `helm_s`, `'steer'`.

`tests/people.test.ts`, continued (the poses of `figurePose.ts`):

6. `figureJoints('stand', 1, 0)` has `headY = Math.sin(0.7) * 0.35` (within 1e-12) and every key of `REST_JOINTS`.
7. `figureJoints('walk', t, w)` equals `figureJoints('walk', t, w + 1.39)` for w = 0, 0.3, 0.9 (each key within 1e-9), and `rootY ≤ 0` for 20 values of w from 0 to 1.39.
8. `figureJoints('steer', 0, 0).lSx` is −1.0.

`tests/captainFigure.test.ts` (three.js in Node, as `tests/boatModel.test.ts` builds the boat):

9. `buildCaptain('high').triangles()` is between 8,000 and 13,500; `buildCaptain('low').triangles()` is between 1,500 and 4,000.
10. Each holds exactly one `SkinnedMesh`, `frustumCulled` false, with `skeleton.bones.map((b) => b.name)` equal to `BONE_NAMES` and the attributes `position`, `normal`, `color`, `skinIndex`, `skinWeight` (every `skinWeight` row `[1, 0, 0, 0]`); its `userData` is `{ partId: 'person_captain', noPick: true }`; the proxy mesh has `partId` `'person_captain'` and `material.visible === false`.
11. At the rest pose, the mesh's bounding box (geometry, figure root at the origin) has `min.y` within 0.02 of 0 and a height between 1.78 and 1.88 m (1.75 m plus the cap).
12. `buildBoat()`'s `root` contains the group named `'captain'` (`root.getObjectByName('captain')`), and `castShadow` is true on the skinned mesh and false on the proxy.
13. `SCENE.people.body.thigh + SCENE.people.body.shin` equals `FIGURE_LEG_M` (within 1e-9).
14. Profile (build the profile with `makeBoatProfile('test', 'Test', structuredClone(boat))`, then change its `boat`): `checkBoatProfile` reports a problem with `people.stationSpots.port` changed to `'winch_s'`, with a walkway removed, and with an extra point `people.points.extra`; none with one point's `at` changed; and the unchanged profile passes.

### 7.9 Browser checks (`scripts/shots-m111.mjs`, joins group `m73`, test clock)

**Budget**: no new group (the cap). `GROUP_ALIASES` gets `m111: 'm73'`; in `shots.mjs` import `liveM111Checks` and `M111_SCENES` (scenes registered in `SCENES` as `{ ...scene, name: \`m111-${scene.name}\` }`), and turn the `m73` entry into `m73: members(['m73', () => liveM73Checks(onTestClock)], ['m111', () => liveM111Checks(onTestClock)])`. `m73` recorded 64 s; expected addition 35 s (an estimate), so the group will likely pass 96 s (half again): update its line in `.github/ci-times.json` with the measured time; if it is over 120 s, name `m73` in `.github/ci-budget.json` with the reason. Nothing becomes redundant. The `budget` group (every PR) must stay green with the captain in the picture.

**Scenes** (`M111_SCENES`, all sizes, `sheet: 'peek'`, `waitMs: 2500`; `B = '?wd=60&ws=10&ms=40&js=60&held=1&sea=flat'`):

| name | query | shows |
|---|---|---|
| `helm` | `B&cam=side-port` | the captain behind the port wheel, hands on the rim |
| `helm-low` | `B&cam=side-port&detail=low` | the same at Low detail |
| `bow` | `B&mode=realistic&st=bow&cam=side-starboard` | the captain on the foredeck behind the windlass |
| `mast` | `B&mode=realistic&st=mast&cam=side-port` | the captain on the coachroof behind the mast |

**Live checks** (phone viewport, `B&debug=1`, test clock, helpers from `scripts/ui.mjs`):

1. `B&cam=side-port&debug=1`: `__sailDebug.captain()` has pose `'steer'`, x within 0.01 of −7.85, z within 0.01 of −0.88, `hidden` false; `partVisible('person_captain')` true.
2. `setCamera(page, 'helm')`: `captain().hidden` true and `partVisible('person_captain')` false. `helmView(page, 'other')` (the Other wheel button): `captain().z` within 0.01 of 0.88 and `hidden` still true. `setCamera(page, 'side-port')`: `hidden` false.
3. `B&mode=realistic&st=port&cam=top&debug=1`: `captain()` x −7.75, z −1.08 (within 0.01), pose `'stand'`. Show the Ropes section and touch-tap the station button `.station-button[data-station="bow"]`: `captain()` x within 0.01 of 4.85 (a jump in M111).
4. Tap him: `B&cam=side-port&debug=1`; `p = __sailDebug.project(-7.85, 2.2, -0.88)`; `page.touchscreen.tap(p.x, p.y)` on the canvas (his chest, 0.65 m aft of the wheel, so he is the nearest hit); `info-card` is visible and contains "Captain (you)".

### 7.10 Older checks and tests this milestone changes

- `tests/glossary.test.ts`: the group sizes (7.7).
- `tests/boatModel.test.ts`, `tests/labels3d.test.ts`: `grep -n "partId\|children.length\|traverse" ` for checks that count the boat's meshes or list every drawn part id; each gains the captain's two meshes or `person_captain`. If a test gives every drawn part a 3D label, `person_captain` becomes an exception (no label, section 1); if none does, nothing changes.
- `scripts/budget.mjs`: no change; its numbers rise by the captain's (7.6 limits) and stay within `BUDGET`.
- The tap sweep and the scenes of every group now show the captain at the helm: `grep -n "partAt\|hitCentres\|tapAt" scripts/shots-m*.mjs` for a check that taps the cockpit behind the port wheel and expects another id there (the M5 `tapAt` and the M63 helm panel checks): move its tap point off the captain or open it with `cam=helm` (where he is hidden), and list each change in the PR.
- `tests/ciPlan.test.ts` keeps 77 groups (alias).

**PR line:** `CI groups: all` (the scene setup changes: every picture now holds the captain).

### 7.11 Done when / not in this milestone

PR: `Closes #260`. Done when the captain stands where 7.3 says in every mode on both wheels, is hidden in the Helm view of his own wheel, opens his card on a touch tap, keeps within the limits of 7.6 at both details, every test of 7.8 and check of 7.9 passes, `npm run check` passes and the CI run with `CI groups: all` is green (with `budget`).

Not in this milestone: walking (M112), a crew, weight in the heel, other looks, a label.

### 7.12 Decided in the M111 PR (recommended; merging accepts it)

1. **English glossary text says "Realistic mode", not "Realistic ropes".** The M100 rule (tests/sailorWords) forbids the word "rope" in English text, and the mode's name in the app is "Realistic". The German, Norwegian and Russian drafts follow their own mode names.
2. **Triangle counts**: 12,604 at High and 3,416 at Low, inside the limits of 7.6. The rule 7 shares were not changed.
3. **The hair's crown is left out with the cap's alternatives**: only the hair and beard balls that the cap leaves visible are built, so the `rnd` scatter of the balls is unchanged from the mockup's (the crown is built after them).
4. **A tap on his body wins over a fitting's tap area.** Where the two overlap (for example a rope bin beside the wheel), a tap on his body opens his card; 7.6's "the nearer wins" holds between everything else. His invisible tap area is ignored while he is hidden (the Helm view), so it never takes a tap there.
5. **The profile check also compares each point's `sided` flag**, because it decides the point names (`_s`, `_p`) the code looks up; test 14 covers it. The scene frees the figure's bone texture when the boat is rebuilt.

## 8. M112: The captain walks

**Independent review: required** (shared Realistic state and model, every Realistic exercise and many older checks).

### 8.1 Files

`content/boat/hanse508.json`, `content/lang/{en,de,no,ru}/glossary.json`, `content/lang/{en,de,no,ru}/ui.json`, `src/model/people.ts`, `src/model/realistic.ts`, `src/app/store.ts`, `src/app/exercisePilots.ts`, `src/ui/realisticPanel.ts`, `src/ui/stationDrawing.ts`, `src/render3d/scene.ts` (only if the debug hook needs `walkedM` wiring), `tests/people.test.ts`, `tests/realistic.test.ts`, `tests/exercisePilots.test.ts`, `tests/motionHelpers.ts`, the tests named in 8.8, `scripts/ui.mjs`, `scripts/ui.d.mts`, `scripts/shots-m112.mjs` (new), `scripts/shots.mjs`, `scripts/ci-plan.mjs`, the checks named in 8.8, `.github/ci-times.json`, `docs/PHYSICS_TRUTHS.md`, `docs/CODE_MAP.md`, `docs/BOAT_REFERENCE.md`, `docs/ROADMAP.md` (the decisions row), `docs/review/{de,no,ru}.md` and `-ui.md` (regenerated).

### 8.2 Data

`people.walkSpeedMps: 0.8` (after `strideM`; the model and the panel read it as `data.people.walkSpeedMps` / `boat.people.walkSpeedMps`, through `walkSecondsLeft` for the panel, 8.3), with `"walkSpeedMpsNote": "A careful walk on a moving deck, one hand for the boat; assumption"`, recorded in `BOAT_REFERENCE.md`. **Tunable** only if the owner asks for faster or slower walks.

### 8.3 Model

`src/model/people.ts`:

```ts
export interface DeckRoute { nodes: string[]; lengthM: number }
export interface WalkState {
  /** The station being walked to (also `RealisticState.station`). */
  to: StationId;
  /** Where the walk started (a deck point's `at`, or where a turned-back walk was). */
  start: Vec3;
  /**
   * The deck point at the other end of the first piece's walkway: the point the walk started
   * on, or, for a turned-back walk, the end of the walkway that was not chosen.
   */
  from: string;
  /** The deck points walked through after `start`, the last one the station's spot. */
  nodes: string[];
  /** Total length of start → nodes (m) and how much of it is walked. */
  lengthM: number;
  doneM: number;
}
export function deckRoute(from: string, to: string, windward: 1 | -1, data?: BoatData): DeckRoute;
export function walkPosition(walk: WalkState, data?: BoatData): { feet: Vec3; faceDeg: number };
export function startWalk(fromFeet: Vec3, from: string | [string, string], to: StationId, toSpot: string, awaDeg: number, data?: BoatData): WalkState;
export function windwardSide(awaDeg: number, startSide: 1 | -1 | 0): 1 | -1;
/** Whole seconds left of the walk, for the panel: `Math.ceil((lengthM − doneM) / walkSpeedMps)`. */
export function walkSecondsLeft(walk: WalkState, data?: BoatData): number;
```

- **Walkways**: each `walkways` pair expands as the points do: a pair with a sided point becomes one pair per side (`X_s` with `Y_s` or the centre point `Y`; `X_p` likewise); a pair of two centre points stays one. 23 walkways in all. Lengths are 3D distances.
- **`windwardSide(awaDeg, startSide)`**: `1` when `awaDeg > 0`, `−1` when `awaDeg < 0`; at exactly 0 or ±180, `startSide` (`0` → `1`). **PT-74.**
- **`deckRoute(from, to, windward)`**: Dijkstra over the expanded walkways. A point with `deck: true` whose side is not `windward` is left out, except `from` and `to` themselves. Returns the points from `from` to `to` inclusive and the length; `from === to` gives `{ nodes: [from], lengthM: 0 }`. If no route exists under the windward rule (a wind shift mid-walk can leave the captain on a now-leeward deck point), search again with every point allowed; if there is still none, throw (the data is broken). Prototype values (tests in 8.6): `helm_p → bow`, windward 1: 15.211 m, through `cockpitFront_s … foredeckSide_s`; windward −1: 15.211 m, the `_p` side; `winch_p → mast`, windward 1: 11.743 m; −1: 11.347 m; `winch_p → winch_s`: 2.219 m (`winch_p helm_p aftCentre helm_s winch_s`); `mast → bow`, windward 1: 7.845 m; `bow → winch_s`, windward −1: 15.434 m.
- **`startWalk`**: `from` is the deck point id the captain stands on, or, when he is turned back mid-walk, the two ends `[a, b]` of the walkway he is on (`b` the end he was walking towards). `windward = windwardSide(awaDeg, side of from (for a pair: of b))`, where a point's side is its `DeckPoint.side` (0 for the centre points `aftCentre`, `cockpitCentre`, `mast`, `bow`); a deck point's position is `deckPoints(data)[id].at` throughout (`at(id)` below); `doneM = 0`; `start = fromFeet`.
  - One id: `route = deckRoute(from, toSpot, windward)`; `nodes = route.nodes.slice(1)`; `WalkState.from = from`; `lengthM = route.lengthM`. If `toSpot === from`, `nodes` is empty and `lengthM` 0: the walk ends on the next step.
  - A pair: for each end `e`, `cost(e) = |fromFeet − at(e)| + deckRoute(e, toSpot, windward).lengthM`; choose the smaller (ties: `b`). `nodes` = the chosen route's nodes (starting with `e`); `WalkState.from` = the other end; `lengthM = cost(e)`.
- **The piece the captain is on** (used to turn back): the polyline is `[start, at(nodes[0]), at(nodes[1]), …]` with cumulative lengths `c0 = 0 < c1 ≤ c2 …`; the piece is the `i` with `c_i < doneM ≤ c_(i+1)`, piece 0 when `doneM = 0`, the last piece when `doneM ≥ lengthM`. Piece 0's walkway is `[walk.from, nodes[0]]`; piece `i ≥ 1`'s is `[nodes[i − 1], nodes[i]]`. With empty `nodes` (only a walk from a single id to the same spot; a turned-back walk always has nodes) the captain stands at `walk.from`.
- **`walkPosition`**: the point at distance `doneM` along `start → nodes`. `faceDeg` is `atan2(dz, dx)` of the current piece; a piece with no horizontal length (a turn-back exactly on a deck point gives one) takes the facing of the nearest piece before it with horizontal length, else of the nearest one after it, else the destination spot's `faceDeg`. At `doneM ≥ lengthM`, the last node's `at` and its `faceDeg`; with empty `nodes`, `start` and the destination spot's `faceDeg`. (The body turns to it smoothly in the renderer, 7.6.)
- **`captainPlacement`** (M112 adds): in Realistic ropes, while `realistic.walk !== null`, `feet` and `faceDeg` come from `walkPosition(walk)`, `pose` is `'walk'` and `walkedM` is `walk.doneM`.

`src/model/realistic.ts`:

- `RealisticState.walk: WalkState | null` (section 5); `initialRealistic()` sets `null` (the link's `parseRealistic` starts from it; waypoints copy the state as it is). Whenever `walk` is not null, `walk.to === station`.
- `NoticeKey` gains `'walking'`.
- `reduceRealistic(state, action, data = boat, gennakerStage = 0, walk?: WalkContext)` with `export interface WalkContext { awaDeg: number; helmSide: 1 | -1 }`. Without `walk` (the unit tests of earlier milestones that call it directly) a station change stays instant, as today.
- With `walk` given:
  - **A gesture while walking**: every action is refused with `withNotice(state, 'walking', key)` (`key` the action's `key` if it has one, else `null`) **except** these, which act as today: `station`; `button` with `held: false`; `pull` with `key: null`; `crank` with `turnsPerS: 0`; `clearNotice` (letting go always works). This check comes first, before the carried-handle check.
  - **`station`** (the same station as `state.station` → unchanged, walking or not): `toSpot = stationSpot(action.station, walk.helmSide)`. If `state.walk === null`, the captain stands at `from = stationSpot(state.station, walk.helmSide)`, `fromFeet` its `at`. If a walk is going on, `fromFeet = walkPosition(state.walk).feet` and `from` is the walkway of the piece he is on (8.3, "The piece the captain is on"), as `[a, b]`; with empty `nodes`, the single id `walk.from`. Then `walk: startWalk(fromFeet, from, action.station, toSpot, walk.awaDeg)`, plus everything today's `station` case does (buttons released, crank 0, the carried handle's station, `notice: null`, `pull: null`, `ease: {}`, `station: action.station`).
  - Walking back to the station he is walking from is allowed (it is a new walk).
  - The destination's spot is fixed when the walk starts: if the Other wheel button changes `camera.helm.wheel` during a walk to the helm, the captain arrives at the old wheel's spot and then stands at the new one at once (the M111 rule; walking between the wheels is out of scope).
  - A carried winch handle goes with him as today (`handle.station` is the destination at once); a carried handle is not drawn, so nothing shows ahead of him.
- **`stepRealistic`**: first, if `state.walk !== null` and `dt > 0`, the state it carries on with has `walk` = `{ ...walk, doneM: walk.doneM + walkSpeedMps · dt }`, or `null` once `doneM ≥ lengthM`; the returned `RealisticStep`'s state includes it. Then everything as today. (It runs only in Realistic ropes, so switching to Easy ropes mid-walk holds the walk, and the captain stands at the helm until Realistic ropes come back.)

`src/app/store.ts`: the `realistic` case passes `{ awaDeg: state.rig.wind.awaDeg, helmSide: state.camera.helm.wheel === 'starboard' ? 1 : -1 }` as the fifth argument (`undefined` stays the third, as today) **only while `settings.ropesMode === 'realistic'`**; in Easy ropes it passes none, so a station change there stays instant (no Easy-ropes control sends one today, and a walk that `stepRealistic` would never advance cannot start). `load` and `reset` give `walk: null` (from `initialRealistic`).

### 8.4 UI (`src/ui/realisticPanel.ts`)

- Under the station bar (`data-testid="station-bar"`): a line `data-testid="walk-status"`, shown while `real.walk !== null`, text `t('real.walking', { station: t('real.station.<to>'), s: walkSecondsLeft(walk) })`; hidden otherwise (the panel itself shows only in Realistic ropes). Class `hint`, the class of the panel's other one-line hints.
- While walking, `helm-controls` stay hidden even when the station is `helm` (the wheel is reached on arrival), and in the Helm section the `helm-away` line shows the same walking text instead of "You are at the … station.", so the section is not blank.
- `noticeText` (`stationDrawing.ts`) shows `t('real.notice.walking')` for the new key. It appears where refusals appear today: the destination station's `.station-notice` (Port, Starboard and Mast have one; the Bow and Helm stations have no line gestures to refuse).

Strings (`ui.json`, English final): `real.walking` "Walking to {station}… {s} s"; `real.notice.walking` "Still walking: wait until you get there."

Glossary: `person_captain` `what` gains, after "…by a winch, at the mast or at the bow.": " Picking another station makes you walk there along the deck, on the side the wind comes from, and you can work its lines when you arrive."

### 8.5 Exercises (`src/app/exercisePilots.ts`)

The two Realistic pilots (`setSailsRealisticPilot`, `furlSailsRealisticPilot`) now wait for the walk:

```ts
/** M112: true once the captain stands at `station` (no walk going on). */
const arrived = (s: AppState, station: StationId) => s.realistic.station === station && s.realistic.walk === null;
```

`onceMaker()` returns its function with one more property, `ran(s: AppState, key: string): boolean` (true once that key ran in the current step). Every place that sends a `station` action and then acts in the same call (nine calls of `{ type: 'station' }` today, besides `atHelm`'s definition, and every use of `atHelm`, whatever follows it: Realistic gestures, the engine, the autopilot or `turns`) is split into segments: `once(s, '<key>-go', (x) => real(x, { type: 'station', station }))`, then `if (once.ran(s, '<key>-go') && arrived(s, station)) s = once(s, '<key>', (x) => …the actions as before…)`. Where one step visits several stations in turn, each later `-go` segment also waits for `once.ran(s, '<previous key>')`, so the order stays as today even when a station is visited twice. Keys: the existing key plus `-go`, and for a second station in one function the existing key plus `2`, `2-go`, and so on. The release blocks that already wait on a rope's state (`if (s.controls… ) s = once(s, 'r', …)`) stay as they are: their condition cannot hold before the winch has run. The comment "a station change acts at once" changes to say the pilot waits for the walk.

`tests/exercisePilots.test.ts` `REALISTIC_LIMITS`: re-measure each step's time with the new pilots (in the unit `goodRun`'s `durations` gives, as the current values) and set each limit to `ceil(1.2 × measured + 3)` (the rule of PHASE10_PHONE_SPEC 8.6); write the measured values in a comment as the M103 lines do, and in the PR. Only Port, Starboard and Helm are used, so each station change adds at most 2.8 s. The "Show me from every step" test needs no change of its own: the pilot waits for any walk in progress.

### 8.6 Tests

`tests/people.test.ts`:

1. `deckRoute` gives the prototype lengths of 8.3 within 0.001 m and the node lists written there.
2. **PT-74 go forward on the windward side**: `startWalk` from `helm_p` to the Bow with `awaDeg = 40` passes only `_s` deck points (and the centre ones); with `awaDeg = −40` only `_p`; with `awaDeg = 0` from `helm_p`, the `_p` side.
3. `walkPosition`: halfway along `helm_p → bow` (windward 1, `doneM = 7.6055`, half of 15.211) the feet lie on the walkway `sideDeckAft_s`–`sideDeckRoof_s` or `sideDeckRoof_s`–`sideDeckMast_s` (within 1e-6 of the segment), and `faceDeg` is between −30 and 30 (walking forward).
4. **Turning back**: a walk `helm_p → bow` (windward 1) at `doneM = 5.0` is on `cockpitCentre`–`cockpitFront_s`, 2.664 m past `cockpitCentre`; `startWalk` to `winch_p` from there goes back through `cockpitCentre aftCentre helm_p winch_p`, `lengthM` 5.224 within 0.01.

`tests/realistic.test.ts`:

5. With a `WalkContext` `{ awaDeg: 40, helmSide: -1 }` (call `reduceRealistic(state, action, boat, 0, ctx)`): from `initialRealistic()` (Port, `winch_p`) a `station` Bow sets `station: 'bow'` and a walk with `lengthM` 15.434 within 0.002 (`winch_p helm_p` then the starboard side); a `clutch` action then returns the notice `'walking'` and changes nothing else; a `button` with `held: false` is not refused.
6. `stepRealistic(real, s.controls, s.rig, 1)` with `s = initialState()` (store.ts) and `real` the walking state of test 5 moves `doneM` by 0.8; after enough steps the walk is `null` and a `clutch` at the Bow works as today.
7. Without a `WalkContext`, `station` acts at once (`walk` stays `null`), as before.
8. Store: `reduce` with `{ type: 'realistic', action: { type: 'station', station: 'mast' } }` in Realistic ropes starts a walk; the store's `load` action with `parseUrlState('?mode=realistic&st=mast')` (as `tests/urlState.test.ts` loads links) gives `walk: null` and station `mast`; `reset` gives `walk: null`.
9. `walkSecondsLeft` of the walk of test 5 (`awaDeg` 40) at `doneM = 0` is 20 (15.434 / 0.8 = 19.3, rounded up).

### 8.7 Browser checks (`scripts/shots-m112.mjs`, joins group `m17`, test clock)

**Helper** (`scripts/ui.mjs`, type in `ui.d.mts`): `goToStation(page, station)`: for `helm` it calls `goToHelm(page)`; otherwise `showSection(page, 'ropes')`, touch-tap `.station-button[data-station="<station>"]`, then wait until `walk-status` is hidden, polling with `page.waitForTimeout(250)` at most 120 times (as `waitForLink` does; 30 s of app time on the test clock, enough for the longest walk at ×1 or faster), and throw if it is still shown. `goToHelm(page)` (`showSection(page, 'helm')`, `helm-go` only if visible) then waits the same way for `walk-status`; its callers (`holdThruster`, `holdWindlass`) gain at most a few seconds. A tap on the station the captain already stands at starts no walk and returns at once.

**Budget**: no new group. `GROUP_ALIASES` gets `m112: 'm17'`; `m17: members(['m17', () => liveM17Checks(live)], ['m112', () => liveM112Checks(onTestClock)])`. `m17` recorded 72 s; expected addition 40 s (the long walks at ×4); update `.github/ci-times.json` if over 108 s, and `ci-budget.json` if over 120 s.

**Scenes**: none (`M112_SCENES = []`): a scene cannot wait in the middle of a walk; live check 1 saves the picture instead.

**Live checks** (phone viewport, test clock; `W = '?mode=realistic&st=port&wd=60&ws=10&ms=40&js=60&ap=wind&apt=60&sea=flat&cam=top&debug=1'`: the autopilot holds the wind at 60° over starboard, so the windward side is starboard throughout; `tx=4` is the link's time speed ×4):

Before each tap: `showSection(page, 'ropes')` (the station bar is in it); the taps here are plain touch taps, not `goToStation`, which waits for the arrival. "At once" means after `page.waitForTimeout(100)` (one frame of app time on the test clock).

1. `W&tx=4`: touch-tap `.station-button[data-station="bow"]`; at once `walk-status` is visible and contains "Bow", `captain().pose` is `'walk'`. After `page.waitForTimeout(2500)` (10 s of app time, 8.0 m walked) `captain()` has `x` between −3.0 and −0.6 and `z > 1.5` (on the starboard, windward side deck), and the check saves `page.screenshot` as `m112-walking-<viewport>.png` in the shots folder. Then poll until `walk-status` is hidden (at most 4 s of page time): `captain()` x within 0.01 of 4.85, pose `'stand'`, and the link has `st=bow`.
2. Refused while walking: `W` (×1); touch-tap the Starboard station, then at once tap the jib sheet's line end in its drawing, `[data-station="starboard"] [data-key="a5"]`, and the `act-clutch` button (as `shots-m4b.mjs` opens a clutch): `[data-station="starboard"] .station-notice` reads "Still walking: wait until you get there." and the link has no `co=a5`; after `waitForTimeout(3500)` the same two taps give `co=a5` in the link.
3. Turning back: `W&tx=4`; tap Bow; after `waitForTimeout(750)` (3 s of app time, between `aftCentre` and `cockpitCentre`) tap Port: `captain().pose` stays `'walk'`, and within 2 s of page time `walk-status` is hidden and `captain()` is at `winch_p` (x −7.75, z −1.08, within 0.01).

### 8.8 Older checks and tests this milestone changes

- **Browser checks that tap a station and act at once**: `grep -n "data-station\|helm-go\|goThere" scripts/shots-m*.mjs` (keep only the lines that tap a station button, not the ones that read a station's drawing) lists the taps (on today's `main`: m4b 5, m4c 4, m23 1, m50 1, m53 1; `goToHelm` is used through `ui.mjs`). Replace each tap that changes the station and is followed by an action with `goToStation(page, station)`; m23's loop over the stations uses it in the loop. A tap on the station the captain is already at, or one followed only by reading the panel, needs no change. List each changed line in the PR. Exercise checks that drive the Realistic exercises (m71; `grep -n "set-sails\|furl-sails" scripts/shots-m*.mjs`) follow the pilots: re-run them; if one of their step time limits fails, raise it by the walk's seconds and say so.
- **Unit tests that change station through the store and act at once** (`grep -n "type: 'station'" tests/*.ts`: today `exerciseRun.test.ts` 7, `exerciseBar.test.ts` 1, `physicsTruths10.test.ts` 1, `exercisePilots.test.ts` 1): after the station action, step until the walk is over with a helper in `tests/motionHelpers.ts`: `export function walkThere(s: AppState): AppState` (`while (s.realistic.walk) s = reduce(s, { type: 'step', dt: 0.25 })`, at most 400 steps; it throws if the walk is still going, e.g. on a paused state). Tests that call `reduceRealistic` directly (`realistic.test.ts`, `realisticHandle.test.ts`) pass no `WalkContext` and need no change.
- `REALISTIC_LIMITS` (8.5).
- `docs/PHYSICS_TRUTHS.md`: PT-74's status as in section 9.
- `tests/ciPlan.test.ts` keeps 77 groups (alias).

**PR line:** `CI groups: all` (the Realistic state and the store change).

### 8.9 Done when / not in this milestone

PR: `Closes #261`. Done when a station change walks along the windward side at 0.8 m/s, gestures wait for the arrival with the notice, a walk can be turned back, links and Reset never start mid-walk, the two Realistic exercises pass with the new limits (Watch and Show me included), every test of 8.6 and check of 8.7 passes, the older checks of 8.8 are green, `npm run check` passes and the CI run with `CI groups: all` is green.

Not in this milestone: the camera following the walk, walking between the wheels (the Other wheel button still moves the captain at once), walking in Easy ropes, a crew, weight.

### 8.10 Decided in the M112 PR (recommended; merging accepts it)

1. **A paused walk stands still, and so does the refusal.** While time is paused a station change still starts the walk (the buttons and the link follow at once) but it only goes on when time runs; line ends are refused with "Still walking" meanwhile. The M4b pause check was rewritten for this: a clutch prepared while paused, the walk waiting, and on Resume the rope runs, he walks, and the second clutch is opened on arrival.
2. **"You are at the helm." (`real-at-helm`) is hidden while he walks to the helm**, because he is not there yet; the Helm section shows the walking line instead (8.4).
3. **`walkWalkway(walk)`** (`src/model/people.ts`) is the "piece he is on" rule of 8.3, exported so the store-side `station` case and the tests use one function.
4. **`REALISTIC_LIMITS`** were re-measured as 8.5 asks: set-sails 7.8, 23.15, 34.35, 34.4 and 7.55 s; furl-sails 2.35, 36.55, 14.1 and 24.55 s; limits `ceil(1.2 × measured + 3)`.
5. **Older checks changed**: `tests/realistic.test.ts` and `tests/realisticHandle.test.ts` walk out a station change in their `act` helper unless time is paused (one test, the open JIB ROLL one, stands him at the winch at once, because the open roll lets the wind unroll the jib while he walks); `exerciseRun` and `physicsTruths10` use `walkThere`. Browser checks: m4b (pause), m4c (two taps), m53 (waits after Go to the helm) and m111 (the Bow arrival) wait for the walk. The m23 language scan only reads text at each station, so it does not wait for the long walks (it would add about 25 s per language).
6. **Group `m17` is recorded at 141 s** (measured locally with the three walk pages; it was 72 s) and named in `.github/ci-budget.json` with the reason, as 8.7 asks above 120 s. `m4b`, `m4c`, `m51`, `m71`, `m82`, `m23` and the other groups run were not re-recorded: their times moved within the machine's noise, except `m23` (250 s here against 90 s recorded, a page the walks do not touch), left to the nightly run.
7. **A station change without a walk context ends a walk that was held** (Easy ropes after a walk began in Realistic ropes), so `walk.to === station` always holds (found by the review).

## 9. Decisions (owner, 2026-11-21, in chat: "Accept all")

Asked before planning, each with its recommendation; the owner accepted all six:

1. **Build the captain before the physics part.** M111–M112 come first; they need nothing from the physics study's milestones 1–5. The crew and the people's weight are part 2, planned later (the weight needs the fixed physics step).
2. **One look**: the dark blue jacket and the captain's cap; no look setting.
3. **No pipe** in the app (the mockup keeps it as the owner drew it).
4. **Hidden in the Helm view**, where you see through his eyes (7.6).
5. **He stands at the wheel the Helm view uses** (`camera.helm.wheel`), so the figure and the view always agree.
6. **Tappable**, with a Learn entry "Captain (you)" (7.7).

Recorded by this plan (recommended; merging accepts it):

7. **Walking speed 0.8 m/s** (8.2): up to 19 s from the helm to the bow, about 3 s between the two winches.
8. **Go forward on the windward side** (PT-74): the walk uses the side deck on the side the wind comes from. Status `to-verify`: the two sources (US Sailing, Yachting Monthly) could not be opened from the planning session.
9. **Gestures wait for the arrival**, with a notice, and a walk can be turned back; a link opens with the captain at its station.
10. **The checks join existing groups** (`m73`, `m17`), the set being at its cap.
11. **The Rigging phase's checklists stay in WORKFLOW** until its sign-off (M110) moves them; this plan adds its own after them.
