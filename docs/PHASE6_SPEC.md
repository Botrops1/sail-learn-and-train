# Phase 6 specification: boat details

Status: **planned**, owner's answers recorded (planning chat, 2026-10-15) · Last updated: 2026-10-15

Read [`ROADMAP.md`](ROADMAP.md) first, then this file. [`BOAT_DETAILS_ANALYSIS.md`](BOAT_DETAILS_ANALYSIS.md) explains why; this spec is what to build. **Phase 5 (M25–M29) is merged before M30 starts**: this spec uses Phase 5's sections, modes, chip row and browser-check helpers ([`PHASE5_SPEC.md`](PHASE5_SPEC.md) 3–4) by their real names. Phase 6 changes how the boat **looks**, adds the parts a marina needs (anchor, cleats, fenders), and one switch. It changes no physics and adds no PHYSICS_TRUTHS rule.

## 0. How to use this spec (for the coding agent)

- Do **one milestone** (sections 6–10), on the branch your session gives you, in one PR titled `M<N>: <name>`. Read sections 0–5 first every time; they apply to all milestones. Then read only your milestone's section. Milestones are built in order (M30 → M34); each needs the ones before it merged.
- Build order inside a milestone: data → pure helpers in `src/model` + tests → 3D → store/URL/UI (M33) → registry and glossaries → browser checks → docs.
- **Numbers are final.** Every size and position in this spec is in the JSON blocks you add to `content/boat/hanse508.json` (no numbers in code, CLAUDE.md). Keys marked **tunable** may be changed if a browser picture shows two parts cutting into each other; report the before and after values in the PR and in `BOAT_REFERENCE.md`. Other keys are not changed. The expected values in the tests were computed from the formulas and data in this spec on 2026-10-15 with the real `sheerAt` / `halfBeamAt`; if a test fails, check 3.4 "common mistakes" first. Never change an expected value to make a test pass; report it in the PR.
- **Text is data.** Every English string in this spec is final: copy it exactly. Russian **names** and UI strings given here are drafts chosen to match the app's words: copy them exactly. Russian **texts** of the Learn entries are yours to draft, following PHASE4_SPEC 3.3 (`textStatus: "draft"`). After any change to `content/lang/ru/*.json`, run `npm run review-doc -- ru` so `docs/review/ru.md` stays current (a test checks it).
- **Signatures.** Function names, signatures, ids, CSS classes and `data-testid`s are given so milestones fit together and the browser checks can find things. Keep them. Add private helpers freely.
- **Write back.** If you decide something this spec leaves open, write it into your milestone's section under "Decided in the M<N> PR".
- **Everything earlier keeps working.** Every test stays green, every PHYSICS_TRUTHS test passes, Easy and Realistic mode work as before, tap-to-identify, the info card, More → Learn, Show me and Back keep working, and every old link opens the same picture (with the new parts drawn on the boat). An existing unit test may only be changed where your milestone section says so. A browser check may never be weakened or deleted to make it pass.
- Sailing terms in UI text get a short explanation the first time they appear on a screen (CLAUDE.md).

## 1. Goal

The boat looks finished and is ready for the marina (Phase 7).

> **The boat looks like the real one.** No holes in the deck; a rim along the deck edge; the anchor in its roller with the chain to the windlass; cleats at the bow, the middle and the stern; fenders that can be put out; rope ends that look like rope ends. Every new part can be tapped and has a Learn entry.

## 2. Scope

### In scope (Phase 6)

1. **Hull and deck closed** (M30): the hole where the rope channel comes down from the coachroof (the raised cabin roof) to the coaming (the raised edge of the cockpit) is filled with a solid moulding; the small open notch beside the coachroof's aft corner is closed; a **toerail** (the low raised rim along the deck edge, owner's cleat photo) runs along both sides and covers the joint between the hull and the deck. Close-up browser pictures at High and Low detail.
2. **Anchor and windlass** (M31): the anchor in a **bow roller** to starboard of the jib furler, a short piece of chain to the **windlass** in its round recess (photo `bow-jib-furler.jpg`). New ids `fit_anchor`, `fit_anchor_chain`; `fit_anchor_windlass` and `fit_bow_roller` are drawn. Static: nothing moves.
3. **Cleats and fairleads** (M32): six mooring cleats on the toerail (bow, midship, stern, both sides) and four fairleads (bow and stern, both sides). `fit_mooring_cleat` is drawn; new id `fit_fairlead`.
4. **Fenders and the Harbour gear block** (M33): eight fenders (four a side) and one ball fender at the port corner of the stern; a new **Harbour gear** section with "Fenders: In the locker / Out" (link key `fd`); a hint while Sailing with the fenders out. New ids `fit_fender`, `fit_fender_ball`.
5. **Rope ends and sign-off** (M34): every rope end is sealed (a closed, slightly tapered tip instead of an open tube); the spare rope lies coiled in the rope tail boxes; the rope on the winch drums (Realistic mode) is drawn thinner. Frame rate, accessibility audit, docs.

### Out of scope

- Anything that **works**: dropping or weighing the anchor, the windlass remote, chain counter, mooring lines tied to cleats, fenders bouncing or being lost, collisions (all Phase 7).
- The **Harbour mode** itself (Phase 7 adds it as data, PHASE5_SPEC 4.4); Phase 6 only adds the `harbour` section, last in every mode.
- Changing the sails, the rig, rope paths (except the drum radius of 10.3), the coaming height, clutch or winch positions.
- 3D labels for the new parts (the label list in the boat file is unchanged).
- Model or texture files (M3b rule, owner's answer 6): everything is built in code from simple shapes.
- The photos the owner shared in the planning chat are in the repo only if the owner uploads them (12, question 1); nothing in the build depends on the image files.

If something here looks necessary, stop and ask in the PR.

## 3. Conventions and shared helpers

### 3.1 Conventions

| Topic | Convention |
|---|---|
| Frame | The boat frame of PHASE1_SPEC: origin at the mast on the waterline and the centreline; **x forward, y up, z starboard**; metres. "Side" is `+1` starboard, `−1` port. Every position in this spec is starboard (`z > 0`) unless it says port; a pair is mirrored (`z → −z`). |
| Deck edge | `sheerAt(x)` and `halfBeamAt(x)` (`src/model/hullShape.ts`) are the height and half-width of the deck edge at station x. Nothing else describes the deck edge. |
| On the toerail | A fitting "on the toerail" at station x stands at `[x, sheerAt(x) + toerail.height, side × (halfBeamAt(x) − toerail.width / 2)]`, its length along x. |
| Detail | `detail: 'high' \| 'low'` is passed to every new builder (as `buildDeckGear(materials, detail)` today). Segment counts per detail are in 3.3; nothing is hidden at Low (owner's answer 7). |
| Ids | Every new mesh carries a registry id through `partMesh` / `smallPartMesh` (`src/render3d/boat/parts.ts`). Small fittings (cleats, fairleads, windlass) use `smallPartMesh` with one hit point per fitting (its top centre) so a fingertip finds them. Thin parts (chain, fender lines) are `asThin`. |
| Materials | Only the existing materials of `src/render3d/boat/materials.ts` (`gelcoat`, `fitting`, `chrome`, `dark`, …) plus the one new `fender` material of M33. |
| Pure vs 3D | Every position, outline and count is computed in a pure function in `src/model` (tested); the `src/render3d` builder only turns those numbers into meshes. |
| `hidden` | New DOM elements shown and hidden with the `hidden` attribute and a `display` rule get `<selector>[hidden] { display: none; }` (PHASE5_SPEC 3.1). |
| Language | Every new visible string goes through `t()`, in both `ui.json` files (same keys, same order: appended at the end of each file in the order given). |

### 3.2 Constants already in the code

`OVERLAP` (0.1 m) and `EPS` (0.01 m) of `src/render3d/boat/hull.ts` move to `src/model/deckVolumes.ts` as exported `DECK_OVERLAP` and `DECK_EPS` in M30 (`hull.ts` imports them under the old names), because the new pure helpers need them.

### 3.3 Segments per detail level

| Shape | High | Low |
|---|---|---|
| Cylinder (`cylinderBetween` radial) | 10 | 6 |
| Lathe (windlass, fenders) | 24 around, profile as given | 12 around, same profile |
| Sphere (ball fender) | 16 × 12 | 10 × 8 |
| Chain link (torus: tube × around) | 4 × 10 | 3 × 6 |
| Coil (M34: radial × points per turn) | 8 × 32 | 5 × 16 |
| Rope end cap (M34) | as `SCENE.ropes.radialSegments` (6), both levels | same |

### 3.4 Common mistakes (check these first when something fails)

- **Z-fighting** (flicker) where a new face lies exactly on an old one: the toerail's outer face is `toerail.outset` (4 mm) outside the hull shell; a part standing on a surface is raised by `DECK_EPS` or sunk into it by `DECK_OVERLAP`, never placed exactly on it.
- **Port and starboard swapped:** z is **+ to starboard**. The anchor is on the **starboard** side of the furler; the ball fender on the **port** side.
- **Mirroring flips the triangle winding:** a mesh mirrored with `z → −z` must reverse its triangle order (or use the existing `pushQuad` with the points in mirrored order), or its faces show from the inside only.
- **A new id not in the registry:** `requirePartId` throws at start. Add the registry entry and both glossary entries first.
- **`NOT_DRAWN` out of step:** an id drawn for the first time leaves `NOT_DRAWN` (`src/model/glossary.ts`); `tests/glossary.test.ts` (11) fails otherwise.
- **Glossary order:** the glossaries list the ids in registry order (test 1); insert a new id in both glossaries at the same place as in the registry.
- **Group sizes:** `tests/glossary.test.ts` "the groups have the expected sizes" counts the Learn list's groups; each milestone that adds deck ids updates the `deck` number to the value its section gives (the only change allowed in that test).
- **Hidden parts tapped:** fenders in the locker are `visible = false`; `picking.ts` already skips invisible objects, so they cannot be tapped. Do not remove them from the scene.
- **The review document:** a Russian string changed without `npm run review-doc -- ru` fails `tests/glossary.test.ts`.
- **Show me links:** must survive `serializeUrlState(parseUrlState(link))` key by key (`tests/glossary.test.ts` test 6).

### 3.5 Browser-check conventions (every milestone)

- As PHASE5_SPEC 3.6: scene names without the prefix in `scripts/shots-m<N>.mjs`, registered in `scripts/shots.mjs` with `m<N>-` (import, `SCENES`, `liveGroups`); live-check labels contain `m<N>`; read links with `waitForLink`; find things by `data-testid` or `exact: true`; panel, settings and camera only through the helpers of `scripts/ui.mjs`.
- **Phase 6 labels (`m30` … `m34`) match none of the `held`, `sea` and `clock` label tests of `openPage`**, so every Phase 6 check opens Held still on flat water with the clock chip hidden (the Phase 1 picture), and `mm=0` is added (no mini-map). A check that wants Sailing writes `held=0` in its link (`openPage` then adds nothing; `held=0` parses as Sailing).
- **Close-ups** use the debug camera hook as `scripts/shots-m5.mjs` does: open the link with `debug=1`, hide `.debug` (`page.addStyleTag({ content: '.debug { display: none !important; }' })`), then `page.evaluate((v) => window.__sailDebug.setView(v.position, v.target, v.fov), view)`, wait 1,500 ms, and `page.screenshot` to `shots/m<N>-<name>-<detail>.png`. A close-up is taken at **High and Low** (`detail=high` / `detail=low` in the link) at the phone size `VIEWPORTS[0]`.
- CI runs scenes at phone size and every live check. Phase 6 milestones change shared 3D code (the boat builder): run the full set (`SHOTS_SIZES=phone npm run shots`) before opening the PR.

## 4. Architecture

### 4.1 New data (`content/boat/hanse508.json`)

One new top-level object **`deckFittings`**, after `modelDetail`, built up milestone by milestone (each section gives the keys it adds, verbatim). M34 adds keys to `modelDetail.winchRope` and `modelDetail.ropeBin` instead. `src/model/boat.ts` types the new keys (as the other blocks are typed there).

### 4.2 New state (M33 only)

```ts
// src/model/harbour.ts (M33, new, pure)
export interface HarbourState {
  /** The fenders hang over the side (true) or are in the locker (false). In the link as `fd=1`. */
  fendersOut: boolean;
}
export const DEFAULT_HARBOUR: Readonly<HarbourState> = { fendersOut: false };
/** True when the "Bring the fenders in before you sail" hint shows: fenders out and Sailing. */
export function fenderHintShown(harbour: HarbourState, boatMode: BoatMode): boolean;

// src/app/store.ts (M33)
interface AppState {
  /** Harbour gear (M33): the fenders. Phase 7 adds the windlass and the lines here. */
  harbour: HarbourState;
}
// Action (M33):
| { type: 'setFenders'; out: boolean }
// InitialOverrides gains: harbour?: HarbourState
```

`BoatMode` is the existing type of `state.boat.mode` (`'held' | 'sailing'`).

### 4.3 URL keys

| Key | Milestone | Values | Default | Written |
|---|---|---|---|---|
| `fd` | M33 | `1` | fenders in the locker | after the clock keys (`clockParams`) and before the Realistic keys, only when the fenders are out |

Old links (no `fd`) open with the fenders in the locker: the same picture as before Phase 6, apart from the new parts on the boat. Any `fd` value other than `1` reads as "in the locker".

### 4.4 Step order

Unchanged. Phase 6 adds no work to the `step` action.

### 4.5 Files by milestone

| Milestone | New | Changed |
|---|---|---|
| M30 | `tests/deckDetails.test.ts`, `scripts/shots-m30.mjs` | `content/boat/hanse508.json`, `src/model/boat.ts`, `src/model/deckVolumes.ts`, `src/render3d/boat/hull.ts`, `src/render3d/boat/deckGear.ts`, `scripts/shots.mjs`, `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md` |
| M31 | `src/model/bowGear.ts`, `src/render3d/boat/bowGear.ts`, `tests/bowGear.test.ts`, `scripts/shots-m31.mjs` | `content/boat/hanse508.json`, `src/model/boat.ts`, `src/render3d/boat/index.ts`, `content/registry/parts.json`, both `glossary.json`, `src/model/glossary.ts` (`NOT_DRAWN`), `tests/glossary.test.ts` (group size, `COMPLETE_IDS`), `docs/review/ru.md`, `scripts/shots.mjs`, `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md` |
| M32 | `src/model/mooringFittings.ts`, `src/render3d/boat/mooringFittings.ts`, `tests/mooringFittings.test.ts`, `scripts/shots-m32.mjs` | as M31 (without `bowGear`) |
| M33 | `src/model/harbour.ts`, `src/render3d/boat/fenders.ts`, `src/ui/harbourPanel.ts`, `tests/harbour.test.ts`, `scripts/shots-m33.mjs` | `content/boat/hanse508.json`, `src/model/boat.ts`, `src/model/mooringFittings.ts` (fender placements), `src/app/store.ts`, `src/app/urlState.ts`, `src/app/urlSync.ts` (`openScene` comment only if needed), `src/ui/modes.ts`, `src/ui/panel.ts`, `src/render3d/boat/index.ts`, `src/render3d/boat/materials.ts`, `src/render3d/scene.ts`, `src/style.css`, both `ui.json`, both `glossary.json`, `content/registry/parts.json`, `src/model/glossary.ts`, `tests/glossary.test.ts`, `tests/modes.test.ts`, `tests/urlState.test.ts`, `tests/mooringFittings.test.ts`, `docs/review/ru.md`, `scripts/ui.mjs`, `scripts/shots.mjs`, `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md` |
| M34 | `src/model/ropeCoil.ts`, `tests/ropeEnds.test.ts`, `scripts/shots-m34.mjs` | `content/boat/hanse508.json`, `src/model/boat.ts`, `src/model/ropePaths.ts`, `src/render3d/boat/ropes.ts`, `src/render3d/boat/cockpitHardware.ts`, `src/render3d/sceneConfig.ts`, `scripts/shots.mjs`, `scripts/a11y-audit.mjs` (only if a new control is missing), `README.md`, `docs/ROADMAP.md`, `docs/BOAT_DETAILS_ANALYSIS.md`, `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md`, this spec |

## 5. Milestones overview

Each milestone is one PR, small enough to check on a phone in 15 minutes. **Independent review: required** means the owner runs `/review <PR>` (new Code session, Opus, high effort) as soon as the PR opens, before testing it on the phone.

| Milestone | Section | What the owner sees | Rules tested | Depends on | Independent review |
|---|---|---|---|---|---|
| M30 | 6 | No holes beside the coachroof; a rim along the deck edge | — (all earlier tests stay green) | M29 | not needed (visual only; no state, no sailing text) |
| M31 | 7 | The anchor in its roller, chain to the windlass; tappable, Learn entries | — | M30 | **required** (new registry ids and sailing text, `NOT_DRAWN`) |
| M32 | 8 | Six cleats and four fairleads on the rim; tappable, Learn entries | — | M31 | **required** (new registry id and sailing text) |
| M33 | 9 | Harbour gear block with Fenders In the locker / Out; eight fenders and a ball fender; the hint while sailing | — | M32 | **required** (new store field, link key `fd`, new section in every mode, Show me with `fd`) |
| M34 | 10 | Sealed rope ends, coils in the tail boxes, thinner rope on the winches; sign-off | — | M33 | not needed (visuals, checks and docs) |

---

## 6. M30: Hull and deck closed

**Independent review: not needed** (visual only: geometry of the deck mouldings; no state, link or sailing text).

### 6.1 What is wrong today (found in planning)

The owner's two screenshots (planning chat) and the planning session's close-ups show one place, on both sides: where each **covered rope channel** (`fit_line_channels`, `buildLineChannels` in `src/render3d/boat/deckGear.ts`) leaves the coachroof's aft end and slopes down to the coaming top (path points `[-3.12, 1.96, 1.02]` → `[-3.48, 1.62, 1.5]` → `[-3.8, 1.55, 1.59]`, `rig.lineLead.channel.path`), the cover is a thin hump floating up to 0.44 m above the teak side deck, so the deck and the cockpit show through underneath it: a white "wedge" beside the coachroof and a teak "pocket" under it. On the real boat this is one solid moulding (owner's photo from the helm). Next to it, between the coachroof's aft corner (`x` −3.05, half-width 1.15) and the cockpit front (`x` −3.1), a small notch of the side deck is missing (the side deck's inner edge jumps from the coachroof edge to the well edge at 1.3 m). Separately, the hull and the deck meet edge to edge with nothing on the joint; the real boat has a raised **toerail** there (owner's cleat photo).

### 6.2 Data (add to `hanse508.json`)

```json
"deckFittings": {
  "$comment": "Phase 6 (PHASE6_SPEC): deck details. Boat frame (x forward, y up, z starboard), metres. Starboard values; port is mirrored.",
  "toerail": {
    "height": 0.05,
    "width": 0.05,
    "outset": 0.004,
    "fwdX": 5.6,
    "aftX": -8.5,
    "source": "photo (owner, planning chat 2026-10-15: the cleat stands on a raised rim at the deck edge) + assumption (size, ends)"
  },
  "channelFairing": {
    "source": "photo (owner, planning chat 2026-10-15, view from the helm: the channel comes down from the coachroof inside a solid moulding) + assumption (shape: the channel's own width, down to the deck)"
  }
}
```

`toerail.height` and `toerail.width` are **tunable**. `modelDetail.lifelines.inset` changes from `0.06` to `0.09` (the stanchion feet move inboard of the toerail; **tunable**).

### 6.3 Model (`src/model/deckVolumes.ts`)

```ts
export const DECK_OVERLAP = 0.1;
export const DECK_EPS = 0.01;

/** The side deck's inner edge (half-width, m) at station x, aft of the coachroof front. */
export function sideDeckInnerHalfWidth(x: number, data: BoatData = boat): number;

/** The toerail's cross-section at station x, starboard: [outer-bottom, outer-top, inner-top, inner-bottom] as [y, z]. */
export function toerailSection(x: number, data: BoatData = boat): [number, number][];

/** The solid moulding under one channel's slope: rings of [inner-bottom, inner-top, outer-top, outer-bottom], forward ring first. */
export function channelFairingRings(side: Side, data: BoatData = boat): Vec3[][];
```

Formulas (`roof` = `deck.coachroof`, `cockpit` = `deck.cockpit`, `roofHalf(x)` = the half-width of `coachroofHalfOutline(roof.frontX)` at x, linear between its points, as `deck()` in `hull.ts` computes it today; `t` = `deckFittings.toerail`):

- `sideDeckInnerHalfWidth(x)` = `roofHalf(max(x, roof.aftX)) − DECK_OVERLAP` if `x >= cockpit.frontX − DECK_EPS`, else `cockpit.wellHalfWidth`. (Today it switches at `roof.aftX`; the new switch at the cockpit front closes the notch.)
- `toerailSection(x)` with `b = halfBeamAt(x)`, `s = sheerAt(x)`: outer-bottom `[s − DECK_OVERLAP, b + t.outset]`, outer-top `[s + t.height, b + t.outset]`, inner-top `[s + t.height, b − t.width]`, inner-bottom `[s − DECK_EPS, b − t.width]`.
- `channelFairingRings(side)`: take `channelPath(side)` (mast end first). Ring stations: `xs` = `roof.aftX + DECK_OVERLAP` (interpolated on the path segment that contains it), then every path point with `x < roof.aftX` down to and including the **first** point whose `y <= cockpit.coamingTopY + DECK_EPS` (the point where the channel lies on the coaming top). For each station with path point `p` (`[x, y, z]`, z already signed) and `h = rig.lineLead.channel.width / 2`: inner z = `p.z − side × h`, outer z = `p.z + side × h`; top y = `p.y`; bottom y = `sheerAt(x) − DECK_OVERLAP`. Ring = `[[x, bottom, inner], [x, top, inner], [x, top, outer], [x, bottom, outer]]`.

Worked values (starboard; tested):

| | value |
|---|---|
| `sideDeckInnerHalfWidth(-3.2)` | 1.3 |
| `sideDeckInnerHalfWidth(-3.1)` | 1.05 |
| `sideDeckInnerHalfWidth(-3.0)` | 1.055 (±0.001) |
| `toerailSection(0.5)` | `[[1.48, 1.957], [1.63, 1.957], [1.63, 1.903], [1.57, 1.903]]` (±0.001) |
| `channelFairingRings(1)` stations x | `[-2.95, -3.12, -3.48, -3.8]` |
| ring 0 (x −2.95) | z 0.839 / 1.139, top 1.96, bottom 1.418 (±0.001) |
| ring 1 (x −3.12) | z 0.87 / 1.17, top 1.96, bottom 1.415 (±0.001) |
| ring 3 (x −3.8) | z 1.44 / 1.74, top 1.55, bottom 1.404 (±0.001) |

### 6.4 3D

- `hull.ts` `deck()`: the side decks' inner edge uses `sideDeckInnerHalfWidth(x)` (replacing the local `inner`). The deck stations gain `cockpit.frontX`.
- `hull.ts` new `toerail(materials)`: for each side, the `toerailSection` rings at every hull station from `t.fwdX` to `t.aftX` (both ends added as stations), quads between neighbouring rings (four faces), and a flat cap at each end. Material `gelcoat`, id **`part_deck`** (the toerail is part of the deck moulding; no new id). Added to `buildHull`'s list.
- `deckGear.ts` new `buildChannelFairings(materials)`: for each side, quads between neighbouring `channelFairingRings` rings (inner side, outer side, bottom), plus the two end caps. Material `gelcoat`, id **`part_coachroof`**. Added to `buildDeckGear`'s list. The existing channel cover is unchanged and sits on top of it.
- Lifelines: only the data change of 6.2.

### 6.5 Tests (`tests/deckDetails.test.ts`)

1. The worked values of 6.3.
2. For every hull station x between `t.fwdX` and `t.aftX`: the toerail's outer z ≥ `halfBeamAt(x)` (it never sinks into the hull) and its top is above `sheerAt(x)`.
3. For both sides and every fairing ring: top > bottom, and inner z and outer z have the side's sign. The port rings are the starboard rings with z negated.
4. The lifeline stanchion base (`halfBeamAt(x) − lifelines.inset` + the foot radius) stays inboard of the toerail's inner face at every stanchion station.

### 6.6 Browser checks (`scripts/shots-m30.mjs`)

Close-ups (3.5), each at High and Low:

| Name | position | target | fov |
|---|---|---|---|
| `junction-starboard` | `[-1.5, 4.2, 2.6]` | `[-3.1, 1.5, 1.3]` | 45 |
| `junction-port` | `[-1.5, 4.2, -2.6]` | `[-3.1, 1.5, -1.3]` | 45 |
| `junction-low-angle` | `[-0.5, 2.4, 2.1]` | `[-3.6, 1.6, 1.5]` | 50 |
| `deck-edge-midship` | `[0.5, 2.6, 5.5]` | `[0.0, 1.6, 2.3]` | 45 |
| `stern-quarter` | `[-11.5, 2.8, 4.5]` | `[-8.0, 1.3, 1.5]` | 45 |

Link: `?wd=60&ws=12&lb=0&debug=1&detail=<high|low>`. Live check `m30 junction tap`: open `?wd=60&ws=12&lb=0&cam=top`, find the screen point of `[-3.3, 1.7, 1.25]` with `window.__sailDebug.project(x, y, z)` (it returns CSS px inside the 3D canvas; add the canvas's page offset); a tap there must select `part_coachroof` or `fit_line_channels`, never `part_deck` or `part_cockpit`.

**Look at** the `junction-*` and `deck-edge-midship` PNGs at both details: no deck or water shows under the channel's slope; the toerail is a continuous rim with no flicker.

### 6.7 Done when / not in this milestone

Done when: the tests of 6.5 pass; the close-ups show no hole; every earlier test and browser check passes; `BOAT_REFERENCE.md` lists the toerail and the fairing as assumptions; CODE_MAP mentions the new helpers.
Not in this milestone: cleats on the toerail (M32), any change to the coaming height or the clutches.

---

## 7. M31: Anchor and windlass

**Independent review: required** (new registry ids, new and changed sailing text in two languages, `NOT_DRAWN`).

### 7.1 Data (add to `deckFittings`)

```json
"bowRoller": {
  "aftX": 5.75,
  "tipX": 7.0,
  "centreZ": 0.20,
  "halfWidth": 0.06,
  "plateY": 1.70,
  "plateThickness": 0.02,
  "cheekHeight": 0.10,
  "cheekThickness": 0.012,
  "rollerX": 6.94,
  "rollerRadius": 0.035,
  "source": "photo bow-jib-furler.jpg (the chain runs in a stainless channel to starboard of the furler drum) + assumption (sizes)"
},
"anchor": {
  "shackle": [6.0, 1.75, 0.20],
  "crown": [6.99, 1.815, 0.20],
  "shankWidth": 0.035,
  "shankHeight": 0.05,
  "flukeTip": [0.03, -0.42, 0.0],
  "flukeWing": [-0.10, -0.16, 0.17],
  "flukeThickness": 0.02,
  "source": "assumption (a plough anchor of about 25 kg, the usual type on boats of this size; the photo shows only the chain)"
},
"chain": {
  "from": [5.475, 1.786, 0.20],
  "to": [6.0, 1.75, 0.20],
  "pitch": 0.045,
  "linkLength": 0.06,
  "linkWidth": 0.036,
  "wireRadius": 0.007,
  "source": "photo bow-jib-furler.jpg + assumption (drawn larger than a real 10 mm chain so it can be seen)"
},
"windlass": {
  "x": 5.40,
  "z": 0.20,
  "recessRadius": 0.18,
  "profile": [[0.11, 0.0], [0.11, 0.05], [0.075, 0.05], [0.075, 0.13], [0.09, 0.13], [0.06, 0.16], [0.0, 0.17]],
  "source": "photo bow-jib-furler.jpg (a vertical windlass in a round recess behind the roller) + assumption (sizes, position)"
}
```

`flukeTip` and `flukeWing` are offsets from `crown` (`flukeWing` with its z sign for the starboard wing; the port wing has `−z`). `windlass.profile` is `[radius, height above the deck]`, bottom to top, for a lathe. `chain.from` is where the chain leaves the windlass's gypsy (`windlass.x + 0.075`, deck + 0.09). Positions marked tunable: `bowRoller.centreZ`, `windlass.x`, `anchor.crown` (keep `chain.to` = `anchor.shackle` and `chain.from` = the gypsy point if you move them).

### 7.2 Model (`src/model/bowGear.ts`, pure)

```ts
/** The deck height under the windlass (sheerAt(windlass.x)). */
export function windlassBaseY(data: BoatData = boat): number;
/** Chain links: centre, direction along the chain (unit), and the turn about it (0 or π/2, alternating). */
export function chainLinks(data: BoatData = boat): { centre: Vec3; along: Vec3; turn: number }[];
/** The anchor's fluke: two triangles, each [crown, wing, tip]; the starboard half first, then the port half (mirrored wing). */
export function anchorFluke(data: BoatData = boat): [Vec3, Vec3, Vec3][];
```

- `chainLinks`: `length` = |to − from|; `count` = `max(2, round(length / pitch))`; link `i` (0-based) centre = `from + (to − from) × (i + 0.5) / count`; `along` = (to − from) / length; `turn` = `i % 2 === 0 ? 0 : π/2`.
- `anchorFluke`: `[crown, crown + wing, crown + tip]` and `[crown, crown + mirroredWing, crown + tip]` (`mirroredWing` = wing with `−z`). The order is the data order, not the triangle winding: the 3D builder draws both faces of each slab.

Worked values (tested): `windlassBaseY()` 1.696 (±0.001); `chainLinks().length` 12; link 0 centre `[5.497, 1.785, 0.20]` (±0.001); `anchorFluke()[0][2]` (tip) `[7.02, 1.395, 0.20]`; `anchorFluke()[0][1]` (starboard wing) `[6.89, 1.655, 0.37]`, `anchorFluke()[1][1]` (port wing) `[6.89, 1.655, 0.03]` (all ±0.001).

### 7.3 3D (`src/render3d/boat/bowGear.ts`)

`buildBowGear(materials: BoatMaterials, detail: Detail): THREE.Object3D[]`, called from `buildBoat` in `index.ts` after `buildDeckGear`:

- **Bow roller** (`fit_bow_roller`, material `fitting`): a base plate box from `aftX` to `tipX`, `plateThickness` thick with its top at `plateY + plateThickness`, `2 × halfWidth` wide at `centreZ`; two cheeks (boxes `cheekThickness` wide, `cheekHeight` high above the plate top, from `aftX` to `tipX`) at `centreZ ± (halfWidth − cheekThickness / 2)`; the roller (`cylinderBetween` across z between the cheeks, radius `rollerRadius`, at `rollerX`, its centre `rollerRadius` above the plate top). `smallPartMesh` with hit point `[rollerX, plateY + cheekHeight, centreZ]`.
- **Anchor** (`fit_anchor`, material `chrome`): the shank as a box from `shackle` to `crown` (`shankWidth` × `shankHeight` section); the fluke as the two triangles of `anchorFluke`, extruded `flukeThickness` along the triangle normal (a thin slab per triangle, both faces drawn); a shackle ring (torus, radius 0.03, tube `wireRadius`, at `shackle`, in the x–y plane).
- **Chain** (`fit_anchor_chain`, material `dark`, `asThin`): one torus per `chainLinks` entry, tube `wireRadius`, ring radius `(linkWidth − 2 × wireRadius) / 2`, scaled to `linkLength` along `along`, rotated by `turn` about `along`; all merged into one mesh. Pick segment `[from, to]`.
- **Windlass** (`fit_anchor_windlass`): the recess as a dark disc (`CircleGeometry`, radius `recessRadius`, material `dark`) at `windlassBaseY() + DECK_EPS`; the windlass as a lathe of `profile` (material `chrome` for the top two profile points, `fitting` below: two meshes with the same id) standing on the disc at `[x, windlassBaseY() + DECK_EPS, z]`. `smallPartMesh` hit point at the top.

The existing `part_bow` box (`bowFitting` in `hull.ts`, the plate under the furler drum) is unchanged and keeps its id.

### 7.4 Registry and glossaries

Registry (`content/registry/parts.json`): the existing `fit_anchor_windlass` and `fit_bow_roller` are unchanged except `"phase": 6` (already set by the planning PR). Insert right after `fit_mooring_cleat`:

```json
{"id": "fit_anchor", "kind": "fitting", "phase": 6, "group": "deck", "status": "draft", "sources": ["owner"], "related": ["fit_bow_roller", "fit_anchor_chain", "fit_anchor_windlass"], "showMe": "?wd=0&ws=0&cam=bow&sel=fit_anchor&held=1&sea=flat"},
{"id": "fit_anchor_chain", "kind": "fitting", "phase": 6, "group": "deck", "status": "photo-confirmed", "sources": ["photo:bow"], "related": ["fit_anchor", "fit_anchor_windlass", "fit_bow_roller"]},
```

`NOT_DRAWN`: remove `fit_anchor_windlass` and `fit_bow_roller`.

English glossary (`content/lang/en/glossary.json`), new entries in the same place:

```json
"fit_anchor": {
  "name": "Anchor",
  "alternatives": [],
  "short": "The heavy hook that holds the boat to the seabed.",
  "what": "The anchor is let down on its chain until it lies on the seabed, where it digs in and holds the boat in one place.",
  "onThisBoat": "It sits in the bow roller, to starboard of the jib furler, ready to let go. It is drawn but does not work yet; anchoring comes later.",
  "mistakes": [
    {
      "mistake": "Letting the anchor go while the boat is still moving forward.",
      "fix": "Stop the boat first, then lower the anchor and let her drift back as the chain goes out."
    }
  ],
  "showMe": "The bow from the front: the anchor hangs in its roller, with the chain running back to the windlass.",
  "textStatus": "draft"
},
"fit_anchor_chain": {
  "name": "Anchor chain",
  "alternatives": [],
  "short": "The chain that joins the anchor to the boat.",
  "what": "The chain runs from the anchor over the bow roller to the windlass, and from there down into the chain locker under the foredeck.",
  "onThisBoat": "A short piece shows between the windlass and the anchor; the rest is in the locker.",
  "textStatus": "draft"
}
```

Changed English text: `fit_anchor_windlass.onThisBoat` = "On the foredeck behind the anchor roller, in a round recess. It is drawn but does not work yet; anchoring comes later."

Russian (`content/lang/ru/glossary.json`): names `fit_anchor` «якорь», `fit_anchor_chain` «якорная цепь», both `alternatives: []`; every text field the English entry has, drafted by you (PHASE4_SPEC 3.3), `textStatus: "draft"`; `fit_anchor_windlass.onThisBoat` redrafted to say the same as the new English text.

`tests/glossary.test.ts`: add `fit_anchor` and `fit_anchor_chain` to `COMPLETE_IDS`; the `deck` group size becomes **14** (from 12).

### 7.5 Tests (`tests/bowGear.test.ts`)

1. The worked values of 7.2.
2. Every chain link centre lies on the segment `from`–`to`; neighbouring links' `turn` differ.
3. `chain.to` equals `anchor.shackle`; the roller's cheeks (`centreZ ± halfWidth`) stay clear of the furler drum (at `rig.jibFurler.drum`, on the centreline, radius `modelDetail.jibFurlerDrumDiameter / 2` = 0.13): `centreZ − halfWidth > jibFurlerDrumDiameter / 2` (0.14 > 0.13).
4. The windlass's widest radius plus its `z` is less than `halfBeamAt(windlass.x) − toerail.width` (it stands on the deck, inside the toerail).

### 7.6 Browser checks (`scripts/shots-m31.mjs`)

- Scene `anchor-bow`: `?wd=0&ws=0&cam=bow&sel=fit_anchor&held=1&sea=flat` (the Show me link).
- Close-ups (3.5, High and Low): `bow-from-above` position `[4.2, 3.4, 1.4]`, target `[6.2, 1.7, 0.15]`, fov 45; `bow-from-side` position `[6.6, 1.9, 2.6]`, target `[6.6, 1.6, 0.15]`, fov 45.
- Live check `m31 show me anchor`: open `?learn=fit_anchor&m=learn`, the Learn entry shows "Anchor"; tap `learn-show-me` (the Show me button's test id from M20), the link contains `sel=fit_anchor` and `cam=bow`; the phone's Back (`page.goBack()`) returns to the entry.
- Live check `m31 show on the boat`: in the `fit_bow_roller` and `fit_anchor_windlass` entries the "Show on the boat" button (`learn-show-on-boat`) is present (it was hidden while they were in `NOT_DRAWN`).

**Look at** the `bow-*` PNGs: the anchor hangs in front of the stem to starboard of the furler drum, the chain lies in the roller channel and reaches the windlass, nothing cuts through the drum or the pulpit.

### 7.7 Done when / not in this milestone

Done when: 7.5 passes; the glossary tests pass with the new counts; the Show me scene shows the anchor; `BOAT_REFERENCE.md` lists the anchor type and the windlass position as assumptions.
Not in this milestone: a windlass remote at the helm (no photo shows one), the chain counter, anything that moves.

---

## 8. M32: Cleats and fairleads

**Independent review: required** (new registry id and sailing text in two languages; `NOT_DRAWN`).

### 8.1 Data (add to `deckFittings`)

```json
"cleats": {
  "stations": [5.0, -1.2, -7.5],
  "length": 0.28,
  "baseLength": 0.20,
  "baseWidth": 0.05,
  "baseThickness": 0.008,
  "legSpacing": 0.13,
  "legRadius": 0.012,
  "legHeight": 0.045,
  "hornHeight": 0.03,
  "hornWidth": 0.035,
  "source": "photo (owner, planning chat 2026-10-15: an open-base horn cleat on the toerail; bow cleat in bow-jib-furler.jpg; midship cleat behind the shrouds) + assumption (stern position, sizes)"
},
"fairleads": {
  "stations": [5.25, -7.95],
  "length": 0.14,
  "width": 0.05,
  "baseThickness": 0.01,
  "jawHeight": 0.035,
  "jawThickness": 0.012,
  "source": "assumption (one fairlead forward of each bow cleat and aft of each stern cleat; no photo shows them)"
}
```

`stations` are x values; every station has one fitting on each side. All positions **tunable**.

### 8.2 Model (`src/model/mooringFittings.ts`, pure)

```ts
export interface FittingPlace {
  /** Centre of the fitting's base, on top of the toerail. */
  base: Vec3;
  side: Side;
}
/** One place per station and side, starboard first for each station, stations in data order. */
export function cleatPlaces(data: BoatData = boat): FittingPlace[];
export function fairleadPlaces(data: BoatData = boat): FittingPlace[];
```

`base` = `[x, sheerAt(x) + toerail.height, side × (halfBeamAt(x) − toerail.width / 2)]` (3.1).

Worked values (starboard; tested, ±0.001): cleats `[5.0, 1.735, 0.579]`, `[-1.2, 1.599, 2.2]`, `[-7.5, 1.459, 2.085]`; fairleads `[5.25, 1.741, 0.483]`, `[-7.95, 1.447, 2.037]`. `cleatPlaces().length` 6, `fairleadPlaces().length` 4.

### 8.3 3D (`src/render3d/boat/mooringFittings.ts`)

`buildMooringFittings(materials: BoatMaterials, detail: Detail): THREE.Object3D[]`, called from `buildBoat` after `buildBowGear`:

- **Cleats** (`fit_mooring_cleat`, material `chrome`, one merged `smallPartMesh` for all six, one hit point per cleat at `base + [0, legHeight + hornHeight, 0]`): per cleat, along x: a base plate box `baseLength × baseThickness × baseWidth`; two legs (`cylinderBetween`, radius `legRadius`) at `x ± legSpacing / 2` from the plate top up `legHeight`; the horn bar a box `length × hornHeight × hornWidth` on top of the legs, its two ends cut at 45° downwards (a six-sided `extrudeProfile` in the x–y plane, extruded `hornWidth` in z).
- **Fairleads** (`fit_fairlead`, material `chrome`, one merged `smallPartMesh`, a hit point per fairlead at its top centre): a base box `length × baseThickness × width`; two jaws (boxes `length × jawHeight × jawThickness`) along its two long edges, leaving a slot in the middle for the line.

### 8.4 Registry and glossaries

Registry: `fit_mooring_cleat` keeps its entry, with `"phase": 6` (set by the planning PR) and `"sources": ["photo:bow", "photo:cleat"]` if the owner has uploaded `docs/reference/photos/cleat-closeup.jpg` (12, question 1; the planning PR adds the `photo:cleat` source key with the photo), else unchanged. Insert after `fit_anchor_chain`:

```json
{"id": "fit_fairlead", "kind": "fitting", "phase": 6, "group": "deck", "status": "draft", "sources": [], "related": ["fit_mooring_cleat", "part_deck"]},
```

`NOT_DRAWN`: remove `fit_mooring_cleat`.

English, new entry:

```json
"fit_fairlead": {
  "name": "Fairlead",
  "alternatives": [{ "term": "chock", "note": "American" }],
  "short": "A smooth guide on the deck edge that a mooring line runs through.",
  "what": "A fairlead keeps a mooring line in place where it leaves the boat, so it does not rub on the deck edge or jump off.",
  "onThisBoat": "One on each side near the bow and near the stern, beside the cleats. Their exact places are a guess.",
  "textStatus": "draft"
}
```

Changed English text: `fit_mooring_cleat.onThisBoat` = "Three on each side, on the raised rim at the deck edge: at the bow, in the middle and at the stern."

Russian: name `fit_fairlead` «клюз», `alternatives: []`; texts drafted by you; `fit_mooring_cleat.onThisBoat` redrafted to match.

`tests/glossary.test.ts`: add `fit_fairlead` to `COMPLETE_IDS`; `deck` group size **15**.

### 8.5 Tests (`tests/mooringFittings.test.ts`)

1. The worked values of 8.2; the port places are the starboard ones with z negated.
2. Every cleat and fairlead base lies within the toerail's width: `halfBeamAt(x) − toerail.width ≤ |z| ≤ halfBeamAt(x)`, and `x` is between `toerail.aftX` and `toerail.fwdX`.
3. No fairlead overlaps a cleat along x (their x ranges `x ± length / 2` do not intersect) and the bow fairlead stays clear of the windlass recess (`|z| − width/2 > windlass.z + recessRadius` or `x − length/2 > windlass.x + recessRadius`).

### 8.6 Browser checks (`scripts/shots-m32.mjs`)

- Close-ups (High and Low): `cleat-bow` position `[4.3, 2.3, 1.4]`, target `[5.0, 1.75, 0.58]`, fov 40; `cleat-midship` position `[-0.2, 2.2, 3.4]`, target `[-1.2, 1.6, 2.2]`, fov 40; `cleat-stern` position `[-9.6, 2.4, 3.2]`, target `[-7.6, 1.46, 2.08]`, fov 40.
- Scene `cleats-side`: `?wd=0&ws=0&cam=side-starboard&sel=fit_mooring_cleat&held=1&sea=flat`.
- Live check `m32 tap cleat`: open `?wd=0&ws=0&cam=side-starboard&lb=0`, use "Show on the boat" from the `fit_mooring_cleat` Learn entry, and check that the info card names "Mooring cleat".

**Look at** the `cleat-*` PNGs: a recognisable horn cleat standing on the rim, a fairlead beside the bow and stern cleats, nothing floating.

### 8.7 Done when / not in this milestone

Done when: 8.5 passes; the glossary tests pass; positions without a photo are assumptions in `BOAT_REFERENCE.md`.
Not in this milestone: mooring lines on the cleats (Phase 7).

---

## 9. M33: Fenders and the Harbour gear block

**Independent review: required** (new store field, link key `fd` and old links, a new section in every mode, a Show me scene that sets the new key).

### 9.1 Data (add to `deckFittings`)

```json
"fenders": {
  "stations": [3.0, 0.5, -2.5, -5.5],
  "diameter": 0.24,
  "length": 0.80,
  "topBelowSheer": 0.35,
  "gap": 0.01,
  "profile": [[0.0, 0.0], [0.07, 0.01], [0.11, 0.05], [0.12, 0.12], [0.12, 0.68], [0.11, 0.75], [0.07, 0.79], [0.0, 0.80]],
  "lineRadius": 0.005,
  "colour": "#1f2a38",
  "lineColour": "#e8e4da",
  "source": "photo (owner, planning chat 2026-10-15: dark fenders hung along the side at anchor) + owner (four a side, kept in a locker while sailing) + assumption (size, height, stations)"
},
"ballFender": {
  "x": -8.2,
  "side": "port",
  "diameter": 0.55,
  "topBelowSheer": 0.35,
  "source": "owner (planning chat 2026-10-15: one big ball fender at the corner behind the helm) + assumption (side, size)"
}
```

`fenders.profile` is `[radius, distance down from the fender's top]` for a lathe. `stations`, `topBelowSheer` and `ballFender.side` are **tunable**.

### 9.2 Model

`src/model/harbour.ts` as 4.2. `fenderHintShown` = `harbour.fendersOut && boatMode === 'sailing'`.

`src/model/mooringFittings.ts` gains:

```ts
export interface FenderPlace {
  /** Top of the fender (where its line is tied). */
  top: Vec3;
  /** Where the line is made fast: on top of the toerail at the same station. */
  lineEnd: Vec3;
  side: Side;
}
/** Eight fender places: per station, starboard then port. */
export function fenderPlaces(data: BoatData = boat): FenderPlace[];
/** The ball fender: its centre and line end. */
export function ballFenderPlace(data: BoatData = boat): { centre: Vec3; lineEnd: Vec3; side: Side };
```

- Fender at station x, side s: `top` = `[x, sheerAt(x) − topBelowSheer, s × (halfBeamAt(x) + diameter / 2 + gap)]`; `lineEnd` = `[x, sheerAt(x) + toerail.height, s × (halfBeamAt(x) − toerail.width / 2)]`.
- Ball fender, `r` = `diameter / 2`, `s` = −1 for port: `centre` = `[x, sheerAt(x) − topBelowSheer − r, s × (halfBeamAt(x) + r + fenders.gap)]`; `lineEnd` as for the fenders at its x.

Worked values (tested, ±0.001): starboard fender tops `[3.0, 1.28, 1.431]`, `[0.5, 1.23, 2.083]`, `[-2.5, 1.176, 2.472]`, `[-5.5, 1.111, 2.431]`; ball fender centre `[-8.2, 0.765, -2.32]`. A fender's bottom is `top.y − length`; the lowest, at −5.5, is 0.311 above the waterline.

### 9.3 Store and URL

**Store** (`store.ts`):
- `AppState.harbour: HarbourState`; `initialState`: `overrides.harbour ?? DEFAULT_HARBOUR`.
- `setFenders`: returns the same state object when `out === state.harbour.fendersOut`; otherwise `{ ...state, harbour: { ...state.harbour, fendersOut: out } }`. Allowed in every mode, Held still and Sailing.
- `reset`: `harbour` = `DEFAULT_HARBOUR`.
- `load`: takes `harbour` from the loaded state.

**URL** (`urlState.ts`): parse `fd === '1'` → `fendersOut: true`, else false. Serialize `fd=1` after the clock keys and before the Realistic keys, only when out (4.3). `urlSync.ts`'s subscriber compares `state.harbour.fendersOut` too, so the link updates. `openScene` (Show me) loads the scene's own `harbour` (a Show me with `fd=1` puts the fenders out; Back restores the previous link and its fenders).

### 9.4 The Harbour gear section

**Modes** (`src/ui/modes.ts`): `SECTION_IDS` gains `'harbour'` (last). In every row of `MODE_LAYOUTS` it is **last** in `order`, and is in none of `open`, `openSide`, `second`. `sectionAvailable('harbour', …)` is always true. `tests/modes.test.ts` is updated to the new rows (the only change allowed there).

**Panel** (`panel.ts`): builds the section with `createSection('harbour', t('harbour.title'), createHarbourPanel(store), true)`.

**`src/ui/harbourPanel.ts`** `createHarbourPanel(store: Store): HTMLElement[]` returns:

```html
<fieldset class="field segmented" data-testid="fenders">
  <legend>Fenders</legend>
  <p class="hint explain">Rubber buffers hung over the side to protect the hull in a marina. They stay in a locker while sailing.</p>
  <div class="segments">
    <label class="segment"><input type="radio" name="fenders" value="stowed" data-testid="fenders-stowed"><span>In the locker</span></label>
    <label class="segment"><input type="radio" name="fenders" value="out" data-testid="fenders-out"><span>Out</span></label>
  </div>
</fieldset>
<p class="hint" data-testid="fenders-hint" hidden>Bring the fenders in before you sail.</p>
```

The same pattern as the Held still / Sailing switch (`createBoatModeSwitch`, `src/ui/windPanel.ts`): a change dispatches `setFenders`; a store subscriber checks the right radio and sets `hidden` on `fenders-hint` to `!fenderHintShown(state.harbour, state.boat.mode)`. The hint is a live status line (no `explain` class). `scripts/ui.mjs` `showSection` accepts `harbour`.

**Strings** (appended to both `ui.json`, in this order):

| Key | English | Russian (draft) |
|---|---|---|
| `harbour.title` | Harbour gear | Для стоянки |
| `harbour.fenders` | Fenders | Кранцы |
| `harbour.fenders.explain` | Rubber buffers hung over the side to protect the hull in a marina. They stay in a locker while sailing. | Резиновые подушки, которые вывешивают за борт, чтобы защитить корпус у причала. На ходу они лежат в рундуке. |
| `harbour.fenders.stowed` | In the locker | В рундуке |
| `harbour.fenders.out` | Out | За бортом |
| `harbour.fenders.hint` | Bring the fenders in before you sail. | Уберите кранцы, прежде чем идти под парусами. |

### 9.5 3D (`src/render3d/boat/fenders.ts`)

`buildFenders(materials: BoatMaterials, detail: Detail): { objects: THREE.Object3D[]; setOut(out: boolean): void }`:

- **Fenders** (`fit_fender`, material `fender`: a new `MeshLambertMaterial` in `materials.ts` with `deckFittings.fenders.colour`, or `MeshStandardMaterial` at High like the others): one lathe of `profile` per `fenderPlaces` entry, hanging with its top at `top`, merged into one mesh; each with a small eye on top (torus, radius 0.02, tube 0.006). **Lines**: one tube per fender from `top` to `lineEnd` (`cylinderBetween`, radius `lineRadius`, colour `lineColour`), merged, id `fit_fender`, `asThin`.
- **Ball fender** (`fit_fender_ball`, material `fender`): a sphere of `diameter` at `centre`, an eye, and its line to `lineEnd` (id `fit_fender_ball`).
- `setOut(out)` sets `visible` on every object. They start hidden.

`buildBoat` (`index.ts`) adds them and its returned boat view gains `setFendersOut(out: boolean): void`; `scene.ts` calls it once at build and whenever `state.harbour.fendersOut` changes (compare with the previous value; never every frame). A Detail change rebuilds the boat and re-applies the current value.

### 9.6 Registry and glossaries

Insert after `fit_fairlead`:

```json
{"id": "fit_fender", "kind": "fitting", "phase": 6, "group": "deck", "status": "photo-confirmed", "sources": ["photo:fenders", "owner"], "related": ["fit_fender_ball", "fit_mooring_cleat", "part_lifelines"], "showMe": "?wd=0&ws=0&cam=side-port&sel=fit_fender&held=1&sea=flat&fd=1"},
{"id": "fit_fender_ball", "kind": "fitting", "phase": 6, "group": "deck", "status": "draft", "sources": ["owner"], "related": ["fit_fender", "part_stern"]},
```

(`photo:fenders` is the source key the planning PR adds with `docs/reference/photos/side-at-anchor-fenders.jpg`, 12 question 1. If that key is not in `sourceKeys` when you build, use `"status": "draft", "sources": ["owner"]` and say so in the PR.)

English:

```json
"fit_fender": {
  "name": "Fender",
  "alternatives": [],
  "short": "A rubber buffer hung over the side to protect the hull.",
  "what": "Fenders hang between the boat and a pier or another boat, so the hulls do not rub or bump. They are tied on before you come in and taken in before you sail.",
  "onThisBoat": "Eight, four on each side, kept in a locker while sailing. Put them out in the Harbour gear block.",
  "mistakes": [
    {
      "mistake": "Leaving the fenders hanging over the side while sailing.",
      "fix": "They bounce against the hull and can be lost. Bring them in and stow them as soon as you are out of the harbour."
    }
  ],
  "showMe": "The boat from the side with the fenders out, four on each side.",
  "textStatus": "draft"
},
"fit_fender_ball": {
  "name": "Ball fender",
  "alternatives": [],
  "short": "A big round fender for a corner of the boat.",
  "what": "A ball fender protects a corner, where a long fender would slip away, for example the stern when you moor stern-to (with the back of the boat to the pier).",
  "onThisBoat": "One, at the port corner of the stern behind the helm. It goes out and comes in with the other fenders.",
  "textStatus": "draft"
}
```

Russian names: `fit_fender` «кранец», `fit_fender_ball` «кранец-шар», both `alternatives: []`; texts drafted by you.

`tests/glossary.test.ts`: add both to `COMPLETE_IDS`; `deck` group size **17**. A scene test in its section 7 ("show-me scenes show what their text says"): `fit_fender`: `scene(showMe('fit_fender')).harbour.fendersOut` is `true`.

### 9.7 Tests

`tests/harbour.test.ts`:
1. `DEFAULT_HARBOUR.fendersOut` is false; the initial state has it.
2. `setFenders` true then false; the same object back when nothing changes.
3. `reset` puts them back in the locker.
4. `fenderHintShown`: true only for (out, sailing); false for (out, held), (stowed, sailing), (stowed, held).
5. URL: `fd=1` round-trips; a link without `fd` and a link with `fd=0` open with them in the locker; `serializeUrlState` writes no `fd` when stowed; with `fd=1` it comes after the clock keys and before the first Realistic key (check the key order of a link that has both).

`tests/mooringFittings.test.ts`: the worked values of 9.2; every fender clears the hull: for each place and every y between `top.y − length` and `top.y`, `|top.z| − diameter / 2 ≥` the hull's half-width at that height (sample `sectionPoint(x, s)` for s in 0…1 step 0.01 and take the largest z whose y is within 0.02 of the sample height).

`tests/urlState.test.ts`: only add `fd` cases if the file has a table of every key (keep its pattern).

### 9.8 Browser checks (`scripts/shots-m33.mjs`)

- Scene `fenders-out`: `?wd=0&ws=0&cam=side-port&sel=fit_fender&held=1&sea=flat&fd=1`; scene `fenders-stern`: `?wd=0&ws=0&cam=helm&held=1&sea=flat&fd=1`.
- Live check `m33 switch`: open `?wd=60&ws=12` (Held still, added by `openPage`), `showSection(page, 'harbour')`, click `fenders-out`: `waitForLink(page, ['fd=1'])`; click `fenders-stowed`: `waitForLink(page, [], ['fd='])`. `fenders-hint` stays hidden (Held still).
- Live check `m33 hint`: open `?wd=60&ws=12&held=0&fd=1`, `showSection(page, 'harbour')`: `fenders-hint` is visible with the English text.
- Live check `m33 old link`: open `?wd=60&ws=12`: the link has no `fd`; `fenders-stowed` is checked.
- Live check `m33 show me`: open `?learn=fit_fender&m=learn`, tap Show me: the link contains `fd=1`; `page.goBack()`: the link has no `fd`.
- Russian: scene `harbour-ru`: `?lang=ru&wd=60&ws=12&held=1` with the `harbour` section shown (`section: 'harbour'`): nothing is cut off.

**Look at** the `fenders-*` PNGs: the fenders hang against the topsides (the hull's sides above the water) without cutting into the hull, each with a line up to the rim; the ball fender at the port corner of the stern.

### 9.9 Done when / not in this milestone

Done when: 9.7 passes; the Harbour gear block is last in every mode and folded; old links open with the fenders in the locker; `BOAT_REFERENCE.md` lists the fender sizes and stations as assumptions; CODE_MAP lists the new files and the `setFenders` action.
Not in this milestone: fenders moving, bouncing or being lost (Phase 7), Harbour mode (Phase 7), fenders in other places (the stern platform), more than one ball fender.

---

## 10. M34: Rope ends and Phase 6 sign-off

**Independent review: not needed** (drawing of the rope ends, browser checks and docs; the rope paths and every model value stay as they are).

### 10.1 Data

`modelDetail.winchRope` gains `"drumRenderRadius": 0.010` (**tunable**). `modelDetail.ropeBin` gains:

```json
"coil": {
  "turns": 2.5,
  "innerRadius": 0.03,
  "outerRadius": 0.085,
  "ropeRadius": 0.011,
  "layers": 2,
  "colour": "#ece6d6"
}
```

`src/render3d/sceneConfig.ts` `SCENE.ropes` gains `endTaper: 0.7` (the radius of a rope's last ring, as a share of its radius; presentation value).

### 10.2 Sealed rope ends (`src/render3d/boat/ropes.ts`)

`buildGeometry(layout)` adds, per strand, two vertices after the strand's rings (the start centre and the end centre) and a triangle fan from each to its end ring, wound so the cap faces outwards. `writeStrand` writes the first and last ring at `radius × SCENE.ropes.endTaper` and the two centres at the strand's first and last point, pushed out along the tangent by `radius × 0.5` (a rounded tip); their normals point along the tangent outwards; their `u` is the end ring's. Vertex counts: `layout.reduce((sum, n) => sum + n * RADIAL + 2, 0)`; the per-strand `base` offsets in `update` move by `points.length * RADIAL + 2`.

### 10.3 Thinner rope on the winch drums

- `src/model/ropePaths.ts`: `RopeStrand` gains `drumRange?: [number, number]` (point indices: first on the drum, one past the last). `winchWrapPoints` keeps its signature and output; a new exported `winchWrapHelixCount(wrap, data): number` returns how many of its points are the helix on the drum (the rest go to the jaw or the hand). `ropeDrawings`' `lead()` records `drumRange` = `[start, start + winchWrapHelixCount(...)]`, where `start` is the index of the first wrap point in the strand.
- The helix uses `modelDetail.winchRope.drumRenderRadius` instead of `visual.ropeRenderRadius` for its radius (`r = drum diameter / 2 + drumRenderRadius`) and its pitch (`2 × drumRenderRadius` per turn).
- `ropes.ts` `writeStrand`: points inside `drumRange` use `drumRenderRadius` as their base radius in `radiusAt` (the on-screen minimum still applies).
- Existing tests that pin the helix radius or height to `ropeRenderRadius` are updated to `drumRenderRadius` (the only test change allowed in this milestone).

### 10.4 Coiled tails in the tail boxes

`src/model/ropeCoil.ts` (pure):

```ts
/** A flat coil lying on the tail box's floor: one polyline per layer, centred on the box. */
export function coilLayers(box: { x: number; z: number }, pointsPerTurn: number, data: BoatData = boat): Vec3[][];
```

Layer `k` (0-based): a spiral from `innerRadius` to `outerRadius` over `turns` turns (`r(θ) = innerRadius + (outerRadius − innerRadius) × θ / (2π × turns)`), at height `y = coamingTopY + 0.004 + ropeRadius + k × 2 × ropeRadius` (on top of the box's dark floor plate, which is 0.004 thick), points `[box.x + r cos θ, y, box.z + r sin θ]`, `θ` from 0 to `2π × turns` in `round(turns × pointsPerTurn)` steps (+1 point). Odd layers run the other way round (`θ → −θ`).

`cockpitHardware.ts` `buildRopeBins` adds, per box, one tube per layer (`TubeGeometry` of a `CatmullRomCurve3` through the points, or the existing rope tube writer; radius `ropeRadius`, radial and points per turn from 3.3), material a new `MeshLambertMaterial` of `coil.colour`, id `fit_rope_bin`, merged with the box's rim mesh's hit point.

Worked values (tested): `coilLayers({ x: -7.58, z: 1.6 }, 32)` has 2 layers of 81 points; layer 0 starts at `[-7.55, 1.565, 1.6]` (±0.001) and ends at radius 0.085; layer 1's height is 1.587 (±0.001); the outer radius plus `ropeRadius` (0.096) is less than half the box's opening (`min(length, width) / 2 − rimWidth` = 0.10).

### 10.5 Tests (`tests/ropeEnds.test.ts`)

1. The worked values of 10.4.
2. `ropeDrawings` in Realistic mode with a rope wrapped on a winch: the strand's `drumRange` covers exactly the helix points (the first point of the range is the first point after the clutch exit), and every point in the range is within `drum radius + drumRenderRadius + 0.001` of the winch axis.
3. In Easy mode no strand has a `drumRange`.

### 10.6 Browser checks (`scripts/shots-m34.mjs`) and the sign-off

- Close-ups (High and Low): `tail-box` position `[-6.6, 2.4, 2.4]`, target `[-7.58, 1.55, 1.6]`, fov 40; `winch-wraps` with the link of `shots-m5.mjs`'s `realistic-rope-wrapped-helm` scene plus `debug=1` (`?mode=realistic&wd=90&ws=12&cam=helm&wp=b5.3.t&wsb=a5.2.h&debug=1`: a rope wrapped on each winch, the starboard one ending in the hand), position `[-6.3, 2.2, 2.6]`, target: the starboard winch's position from `cockpitHardware` in the boat file (raised by `wrapTopAboveBase`), fov 40; `rope-end-hand`: same link, target the hand point (`winchRope.handInboardM`, `handAftM`, `handAboveCoamingM` from that winch, as `winchWrapPoints` computes it), position 0.8 m outboard and 0.5 m above it, fov 40.
- The full set at phone size, the accessibility audit (`scripts/a11y-audit.mjs`, it must cover the Harbour gear section: add it if it does not), and the frame-rate check: `?debug=1&wd=60&ws=20&wm=gusty&fd=1&detail=low` in the PR's checklist (the owner writes the number).
- **Look at** the `tail-box` and `winch-wraps` PNGs: neat coils in the boxes, thin turns on the drum, no open tube ends anywhere.

**Sign-off docs:** ROADMAP Phase 6 row "Done (M34, PR #…)", README (the new parts and the Harbour gear block, one line), `BOAT_DETAILS_ANALYSIS.md` header "Done in Phase 6", BOAT_REFERENCE assumptions complete, CODE_MAP, this spec's status line.

### 10.7 Done when / not in this milestone

Done when: 10.5 passes; the Phase 6 Definition of Done (11) is ticked in the PR.
Not in this milestone: changing which ropes go into which box, or rope colours.

---

## 11. Definition of Done (Phase 6)

- [ ] 1. No hole or gap where the rope channels come down from the coachroof; a toerail along both deck edges; checked at High and Low.
- [ ] 2. The anchor in the bow roller with its chain to the windlass; tappable; Learn entries with Show me.
- [ ] 3. Six cleats and four fairleads on the toerail; tappable; Learn entries.
- [ ] 4. Harbour gear block with Fenders In the locker / Out (`fd=1`), eight fenders and a ball fender; the hint while Sailing; old links open with the fenders in the locker.
- [ ] 5. Sealed rope ends, coils in the tail boxes, thinner rope on the winch drums.
- [ ] 6. Every earlier test and browser check passes; no console errors; accessibility audit clean; every new Russian name and string in `docs/review/ru.md`.
- [ ] 7. Smooth on the owner's phone (50 fps or more with `fd=1` at Detail Low, gusty wind).
- [ ] 8. Docs updated: README, ROADMAP, CODE_MAP, BOAT_REFERENCE (every new assumption), BOAT_DETAILS_ANALYSIS.

## 12. Decisions and open questions

**Owner's answers in the planning chat (2026-10-15):** (1) the gaps: the owner sent two screenshots of the live site with them circled (both at the place in 6.1); (2) improve all three kinds of rope end: sealed tips, coiled tails in the boxes, thinner rope on the drums; (3) the owner shared eight photos of the boat (12, question 1); (4) **fenders: four on each side, plus one big ball fender at the corner behind the helm; kept in a locker while sailing and put out when needed**; (5) the switch lives in a new **Harbour gear** block, last in every mode, which Phase 7's Harbour mode will open first; (6) shapes are built in code only (M3b rule), no model files; (7) everything shows at Detail Low too, with fewer segments; (8) fenders left out while Sailing: a short hint only ("Bring the fenders in before you sail"); bouncing and losing them is Phase 7.

**Decided in planning:** the anchor sits in its own roller to **starboard** of the jib furler (the furler drum is on the centreline, so the anchor cannot sit there; photo `bow-jib-furler.jpg` shows the chain to starboard of it); the existing `part_bow` plate under the furler stays; one id per kind of fitting (all six cleats are `fit_mooring_cleat`); the toerail and the channel fairing carry existing ids (`part_deck`, `part_coachroof`); fender state lives in a new `harbour` part of the state (not in Settings), so Phase 7 can add the windlass and the lines next to it; Phase 6 adds no PHYSICS_TRUTHS rule.

**Questions in the planning PR** (each with a recommendation; the owner's answers go here before merge): see the PR description.
