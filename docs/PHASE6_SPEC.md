# Phase 6 specification: boat details

Status: **planned**, owner's answers recorded (planning chat, 2026-10-15) · Last updated: 2026-10-15

Read [`ROADMAP.md`](ROADMAP.md) first, then this file. [`BOAT_DETAILS_ANALYSIS.md`](BOAT_DETAILS_ANALYSIS.md) explains why; this spec is what to build. **Phase 5 (M25–M29) is merged before M30 starts**: this spec uses Phase 5's sections, modes, chip row and browser-check helpers ([`PHASE5_SPEC.md`](PHASE5_SPEC.md) 3–4) by their real names. Phase 6 changes how the boat **looks**, adds the parts a marina needs (anchor, cleats, fenders), and one switch. It changes no physics and adds no PHYSICS_TRUTHS rule.

## 0. How to use this spec (for the coding agent)

- Do **one milestone** (sections 6–10), on the branch your session gives you, in one PR titled `M<N>: <name>`. Read sections 0–5 first every time; they apply to all milestones. Then read only your milestone's section. Milestones are built in order (M30 → M34); each needs the ones before it merged.
- Build order inside a milestone: data → pure helpers in `src/model` + tests → 3D → store/URL/UI (M33) → registry and glossaries → browser checks → docs.
- **Numbers are final.** Every size and position in this spec is in the JSON blocks you add to `content/boat/hanse508.json` (no numbers in code, CLAUDE.md). The values are not changed: the tests use them. If a browser picture shows two parts cutting into each other, say so in the PR with the PNG's name and a proposed value; the owner decides. The expected values in the tests were computed from the formulas and data in this spec on 2026-10-15 with the real `sheerAt` / `halfBeamAt`; if a test fails, check 3.4 "common mistakes" first. Never change an expected value to make a test pass; report it in the PR.
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
5. **Rope ends and sign-off** (M34): every rope end is sealed (a closed, rounded tip instead of an open tube); the spare rope lies coiled in the rope tail boxes; the rope on the winch drums (Realistic mode) is drawn thinner. Frame rate, accessibility audit, docs.

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
| Frame | The boat frame of PHASE1_SPEC: origin at the mast on the waterline and the centreline; **x forward, y up, z starboard**; metres. "Side" is `+1` starboard, `−1` port: the type `Side` (`1 | -1`), exported from `src/model/deckVolumes.ts` from M30 (today a local `type Side` there). Every position in this spec is starboard (`z > 0`) unless it says port; a pair is mirrored (`z → −z`). |
| Deck edge | `sheerAt(x)` and `halfBeamAt(x)` (`src/model/hullShape.ts`) are the height and half-width of the deck edge at station x. Nothing else describes the deck edge. |
| On the toerail | A fitting "on the toerail" at station x stands at `[x, sheerAt(x) + toerail.height, side × (halfBeamAt(x) − toerail.width / 2)]`, its length along x. |
| Detail | `detail: 'high' \| 'low'` is passed to every new builder (as `buildDeckGear(materials, detail)` today). Segment counts per detail are in 3.3; nothing is hidden at Low (owner's answer 7). |
| Ids | Every new mesh carries a registry id through `partMesh` / `smallPartMesh` (`src/render3d/boat/parts.ts`). Small fittings (cleats, fairleads, windlass) use `smallPartMesh` with one hit point per fitting (its top centre) so a fingertip finds them. Thin parts (chain, fender lines) are `asThin`. |
| Materials | The existing materials of `src/render3d/boat/materials.ts` (`gelcoat`, `fitting`, `chrome`, `dark`, …), plus three new ones added to `BoatMaterials`: `fender` and `fenderLine` (M33) and `coil` (M34), each made with the file's own `make({ color })` helper (double-sided, Lambert at Low, Standard at High, like the others) in the colour its section gives. |
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
- **Face order:** the boat's materials are double-sided (`make()` in `materials.ts`), so a face's corner order never makes a hole; a hole in a close-up is a missing face. Still list each new face's corners counter-clockwise as seen from outside the solid (`pushQuad(positions, a, b, c, d)`), and reverse the order for a port part made by mirroring (`z → −z`), so computed normals point outwards.
- **A new id not in the registry:** `requirePartId` throws at start. Add the registry entry and both glossary entries first.
- **`NOT_DRAWN` out of step:** an id drawn for the first time leaves `NOT_DRAWN` (`src/model/glossary.ts`); `tests/glossary.test.ts` (11) fails otherwise.
- **Glossary order:** the glossaries list the ids in registry order (test 1); insert a new id in both glossaries at the same place as in the registry.
- **Group sizes:** `tests/glossary.test.ts` "the groups have the expected sizes" counts the Learn list's groups; each milestone that adds deck ids updates the `deck` number to the value its section gives (the only change allowed in that test).
- **Hidden parts tapped:** fenders in the locker are `visible = false`; `picking.ts` already skips invisible objects, so they cannot be tapped. Do not remove them from the scene.
- **The review document:** a Russian string changed without `npm run review-doc -- ru` fails `tests/glossary.test.ts`.
- **Show me links:** must survive `serializeUrlState(parseUrlState(link))` key by key (`tests/glossary.test.ts` test 6).

### 3.5 Browser-check conventions (every milestone)

- As PHASE5_SPEC 3.6: scene names without the prefix in `scripts/shots-m<N>.mjs`, registered in `scripts/shots.mjs` with `m<N>-` (import, `SCENES`, `liveGroups`); live-check labels contain `m<N>`; read links with `waitForLink`; find things by `data-testid` or `exact: true`; panel, settings and camera only through the helpers of `scripts/ui.mjs`.
- **Phase 6 labels (`m30` … `m34`) match none of the `held`, `sea` and `clock` label tests of `openPage`**, so every Phase 6 check opens Held still on flat water with the clock chip hidden (the Phase 1 picture). A check that wants Sailing writes `held=0` in its link (`openPage` then adds nothing; `held=0` parses as Sailing).
- **Close-ups are live checks, not scenes** (a scene cannot move the camera): `scripts/shots-m<N>.mjs` exports `M<N>_SCENES` (may be `[]`) and `liveM<N>Checks(live)`, built like `liveM5Checks` in `scripts/shots-m5.mjs`: its `check`, `shot(page, name)` (writes `${prefix}${name}.png` in `outDir`) and `closeUp(page, view)` helpers, and the phone viewport `live.viewports[0]`. The link has `debug=1` (`window.__sailDebug` exists only then); `closeUp` hides the overlay and calls `__sailDebug.setView`. Each close-up is taken at **High and Low** (`detail=high` / `detail=low` in the link), saved as `shot(page, `${name}-${detail}`)`, 1,500 ms after `closeUp`. Unless a section gives another, the close-up link is `?wd=0&ws=0&lb=0&debug=1&detail=<high|low>`.
- **The mini-map:** from M28 `openPage` adds `mm=0` to every label that is not `m28` or `m29`, so Phase 6 checks never show it; do not write `mm` yourself.
- **Earlier checks that count things.** `scripts/shots-m24.mjs` checks the number of registry ids, Learn entry buttons and Show me buttons, and its header comment and `docs/CODE_MAP.md` repeat them (131 and 60 today). A milestone that adds ids or Show me scenes updates those numbers to the values its section gives (an update, not a weakening).
- CI runs scenes at phone size and every live check. Phase 6 milestones change shared 3D code (the boat builder): run the full set (`SHOTS_SIZES=phone npm run shots`) before opening the PR.

## 4. Architecture

### 4.1 New data (`content/boat/hanse508.json`)

One new top-level object **`deckFittings`**, after `modelDetail`, built up milestone by milestone (each section gives the keys it adds, verbatim). M34 adds keys to `modelDetail.winchRope` and `modelDetail.ropeBin` instead. `src/model/boat.ts` needs no change: `BoatData` is inferred from the JSON (`typeof hanse508`).

### 4.2 New state (M33 only)

```ts
// src/model/harbour.ts (M33, new, pure)
export interface HarbourState {
  /** The fenders hang over the side (true) or are in the locker (false). In the link as `fd=1`. */
  fendersOut: boolean;
}
export const DEFAULT_HARBOUR: Readonly<HarbourState> = { fendersOut: false };
/** True when the "Bring the fenders in before you sail" hint shows: fenders out and Sailing. */
export function fenderHintShown(harbour: HarbourState, boatMode: BoatState['mode']): boolean;

// src/app/store.ts (M33)
interface AppState {
  /** Harbour gear (M33): the fenders. Phase 7 adds the windlass and the lines here. */
  harbour: HarbourState;
}
// Action (M33):
| { type: 'setFenders'; out: boolean }
// InitialOverrides gains: harbour?: HarbourState
```

`BoatState` is imported from `src/model/motion.ts` (`BoatState['mode']` is `'sailing' | 'held'`).

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
| M30 | `tests/deckDetails.test.ts`, `scripts/shots-m30.mjs` | `content/boat/hanse508.json`, `src/model/deckVolumes.ts`, `src/render3d/boat/hull.ts`, `src/render3d/boat/deckGear.ts`, `scripts/shots.mjs`, `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md` |
| M31 | `src/model/bowGear.ts`, `src/render3d/boat/bowGear.ts`, `tests/bowGear.test.ts`, `scripts/shots-m31.mjs` | `content/boat/hanse508.json`, `src/render3d/boat/index.ts`, `content/registry/parts.json`, both `glossary.json`, `src/model/glossary.ts` (`NOT_DRAWN`), `tests/glossary.test.ts` (group size, `COMPLETE_IDS`), `tests/boatModel.test.ts` (7.4), `docs/review/ru.md`, `scripts/shots.mjs`, `scripts/shots-m24.mjs` (counts), `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md` |
| M32 | `src/model/mooringFittings.ts`, `src/render3d/boat/mooringFittings.ts`, `tests/mooringFittings.test.ts`, `scripts/shots-m32.mjs` | as M31, without `bowGear` and without `tests/boatModel.test.ts` |
| M33 | `src/model/harbour.ts`, `src/render3d/boat/fenders.ts`, `src/ui/harbourPanel.ts`, `tests/harbour.test.ts`, `scripts/shots-m33.mjs` | `content/boat/hanse508.json`, `src/model/mooringFittings.ts` (fender placements), `src/app/store.ts`, `src/app/urlState.ts`, `src/app/urlSync.ts` (the subscriber), `src/ui/modes.ts`, `src/ui/panel.ts`, `src/render3d/boat/index.ts`, `src/render3d/boat/materials.ts`, `src/render3d/scene.ts`, `src/style.css`, both `ui.json`, both `glossary.json`, `content/registry/parts.json`, `tests/glossary.test.ts`, `tests/boatModel.test.ts` (9.7), `scripts/shots-m24.mjs`, `scripts/shots-m27.mjs`, `scripts/shots-m29.mjs`, `tests/modes.test.ts`, `tests/urlState.test.ts`, `tests/mooringFittings.test.ts`, `docs/review/ru.md`, `scripts/ui.mjs`, `scripts/shots.mjs`, `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md` |
| M34 | `src/model/ropeCoil.ts`, `tests/ropeEnds.test.ts`, `scripts/shots-m34.mjs` | `content/boat/hanse508.json`, `src/model/ropePaths.ts`, `src/render3d/boat/ropes.ts`, `src/render3d/boat/cockpitHardware.ts`, `src/render3d/boat/materials.ts`, `tests/m5Ropes.test.ts` (10.3 only), `scripts/shots.mjs`, `README.md`, `docs/ROADMAP.md`, `docs/BOAT_DETAILS_ANALYSIS.md`, `docs/BOAT_REFERENCE.md`, `docs/CODE_MAP.md`, this spec |

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

The owner's two screenshots (planning chat) and the planning session's close-ups show one place, on both sides: where each **covered rope channel** (`fit_line_channels`, `buildLineChannels` in `src/render3d/boat/deckGear.ts`) leaves the coachroof's aft end and slopes down to the coaming top (path points `[-3.12, 1.96, 1.02]` → `[-3.48, 1.62, 1.5]` → `[-3.8, 1.55, 1.59]`, `rig.lineLead.channel.path`), the cover is a thin hump floating above the teak side deck (about half a metre of air at the coachroof's end), so the deck and the cockpit show through underneath it: a white "wedge" beside the coachroof and a teak "pocket" under it. On the real boat this is one solid moulding (owner's photo from the helm). Next to it, between the coachroof's aft corner (`x` −3.05, half-width 1.15) and the cockpit front (`x` −3.1), a small notch of the side deck is missing (the side deck's inner edge jumps from the coachroof edge to the well edge at 1.3 m). Separately, the hull and the deck meet edge to edge with nothing on the joint; the real boat has a raised **toerail** there (owner's cleat photo).

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

These values are fixed (the tests use them). The lifelines are unchanged: the stanchion feet (centred `modelDetail.lifelines.inset` 0.06 inside the deck edge, radius 0.03) stand 2 cm into the rim's inner side, so they look fixed to it; accepted.

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
- `channelFairingRings(side)`: take `channelPath(side)` (mast end first). Ring stations: `xs` = `roof.aftX + DECK_OVERLAP` (interpolated on the path segment that contains it), then every path point with `x < roof.aftX` down to and including the **first** point whose `y <= cockpit.coamingTopY + DECK_EPS` (the point where the channel lies on the coaming top). For each station with path point `p` (`[x, y, z]`, z already signed) and `h = rig.lineLead.channel.width / 2`: inner z = `p.z − side × h`, outer z = `p.z + side × h`; top y = `p.y`; each bottom corner's y = `cockpit.soleY` if `x < cockpit.frontX` and `|z| < cockpit.wellHalfWidth` (that corner stands over the open cockpit well, so the moulding comes down to the cockpit floor), else `sheerAt(x) − DECK_OVERLAP`. Ring = `[[x, bottomInner, inner], [x, top, inner], [x, top, outer], [x, bottomOuter, outer]]`. The fairing has no top face: the channel cover sits on it and closes it.

Worked values (starboard; tested):

| | value |
|---|---|
| `sideDeckInnerHalfWidth(-3.2)` | 1.3 |
| `sideDeckInnerHalfWidth(-3.1)` | 1.05 |
| `sideDeckInnerHalfWidth(-3.0)` | 1.055 (±0.001) |
| `toerailSection(0.5)` | `[[1.48, 1.957], [1.63, 1.957], [1.63, 1.903], [1.57, 1.903]]` (±0.001) |
| `channelFairingRings(1)` stations x | `[-2.95, -3.12, -3.48, -3.8]` |
| ring 0 (x −2.95) | z 0.839 / 1.139, top 1.96, bottom 1.418 (±0.001) |
| ring 1 (x −3.12) | z 0.87 / 1.17, top 1.96, bottom 1.0 at both corners (over the well) |
| ring 2 (x −3.48) | z 1.35 / 1.65, top 1.62, bottom 1.409 at both corners (±0.001) |
| ring 3 (x −3.8) | z 1.44 / 1.74, top 1.55, bottom 1.404 (±0.001) |

### 6.4 3D

- `hull.ts` `deck()`: the side decks' inner edge uses `sideDeckInnerHalfWidth(x)` (replacing the local `inner`). The deck stations gain `cockpit.frontX − 2 × DECK_EPS` (−3.12; `cockpit.frontX` is already one), so the inner edge steps from 1.3 to the coachroof's edge within 2 cm instead of tapering over a whole station gap (which would lay teak over part of the open well).
- `hull.ts` new `toerail(materials)`: for each side, the `toerailSection` rings at every hull station from `t.fwdX` to `t.aftX` (both ends added as stations), quads between neighbouring rings (four faces), and a flat cap at each end. Material `gelcoat`, id **`part_deck`** (the toerail is part of the deck moulding; no new id). Added to `buildHull`'s list.
- `deckGear.ts` new `buildChannelFairings(materials)`: for each side, quads between neighbouring `channelFairingRings` rings (inner side, outer side, bottom), plus the two end caps. Material `gelcoat`, id **`part_coachroof`**. Added to `buildDeckGear`'s list. The existing channel cover is unchanged and sits on top of it.
- Lifelines: only the data change of 6.2.

### 6.5 Tests (`tests/deckDetails.test.ts`)

1. The worked values of 6.3.
2. For every hull station x between `t.fwdX` and `t.aftX`: the toerail's outer z ≥ `halfBeamAt(x)` (it never sinks into the hull) and its top is above `sheerAt(x)`.
3. For both sides and every fairing ring: top > bottom, and inner z and outer z have the side's sign. The port rings are the starboard rings with z negated.

### 6.6 Browser checks (`scripts/shots-m30.mjs`)

Close-ups (3.5), each at High and Low:

| Name | position | target | fov |
|---|---|---|---|
| `junction-starboard` | `[-1.5, 4.2, 2.6]` | `[-3.1, 1.5, 1.3]` | 45 |
| `junction-port` | `[-1.5, 4.2, -2.6]` | `[-3.1, 1.5, -1.3]` | 45 |
| `junction-low-angle` | `[-0.5, 2.4, 2.1]` | `[-3.6, 1.6, 1.5]` | 50 |
| `deck-edge-midship` | `[0.5, 2.6, 5.5]` | `[0.0, 1.6, 2.3]` | 45 |
| `stern-quarter` | `[-11.5, 2.8, 4.5]` | `[-8.0, 1.3, 1.5]` | 45 |

Link: `?wd=60&ws=12&lb=0&debug=1&detail=<high|low>`. `M30_SCENES` is `[]`.

Live check `m30 junction tap`: open `?wd=60&ws=12&lb=0&debug=1`, `closeUp` with position `[-2.0, 2.4, 3.2]`, target `[-3.3, 1.60, 1.41]`, fov 40, wait 1,500 ms; find the screen point of `[-3.3, 1.60, 1.41]` (on the fairing's outer side, just above the coaming top at 1.55 and 0.27 m below the channel's pick line) with `window.__sailDebug.project(x, y, z)` (CSS px inside the 3D canvas; add the canvas's page offset) and tap it: the info card's `data-part-id` is `part_coachroof` (the fairing) or `fit_line_channels` (the picker may prefer the channel's pick line), and never `part_deck`, `part_cockpit` or a rope (any of those would mean the tap went through a hole).

**Look at** the `junction-*` and `deck-edge-midship` PNGs at both details: no deck or water shows under the channel's slope; the toerail is a continuous rim with no flicker.

### 6.7 Done when / not in this milestone

Done when: the tests of 6.5 pass; the close-ups and the tap check show no hole; every earlier test and browser check passes; `BOAT_REFERENCE.md` lists the toerail and the fairing as assumptions; CODE_MAP mentions the new helpers.
Not in this milestone: cleats on the toerail (M32), any change to the coaming height or the clutches.

---

## 7. M31: Anchor and windlass

**Independent review: required** (new registry ids, new and changed sailing text in two languages, `NOT_DRAWN`).

### 7.1 Data (add to `deckFittings`)

```json
"bowRoller": {
  "aftX": 5.75,
  "tipX": 6.97,
  "centreZ": 0.20,
  "halfWidth": 0.06,
  "plateY": 1.71,
  "plateThickness": 0.02,
  "cheekHeight": 0.10,
  "cheekThickness": 0.012,
  "rollerX": 6.92,
  "rollerRadius": 0.035,
  "source": "photo bow-jib-furler.jpg (the chain runs in a stainless channel to starboard of the furler drum) + assumption (sizes)"
},
"anchor": {
  "shackle": [6.0, 1.755, 0.20],
  "crown": [6.99, 1.825, 0.20],
  "shankWidth": 0.05,
  "flukeTip": [0.03, -0.42, 0.0],
  "flukeWing": [-0.10, -0.16, 0.17],
  "flukeThickness": 0.02,
  "source": "assumption (a plough anchor of about 25 kg, the usual type on boats of this size; the photo shows only the chain)"
},
"chain": {
  "from": [5.475, 1.786, 0.20],
  "to": [6.0, 1.755, 0.20],
  "pitch": 0.045,
  "linkLength": 0.06,
  "linkWidth": 0.036,
  "wireRadius": 0.007,
  "source": "photo bow-jib-furler.jpg + assumption (drawn larger than a real 10 mm chain so it can be seen)"
},
"windlass": {
  "x": 5.40,
  "z": 0.20,
  "recessRadius": 0.14,
  "profile": [[0.11, 0.0], [0.11, 0.05], [0.075, 0.05], [0.075, 0.13], [0.09, 0.13], [0.06, 0.16], [0.0, 0.17]],
  "source": "photo bow-jib-furler.jpg (a vertical windlass in a round recess behind the roller) + assumption (sizes, position)"
}
```

`plateY` is the bottom of the roller's base plate (its top is `plateY + plateThickness` = 1.73: above the deck at the stem, 1.72, and 2.5 cm above it at `aftX`). The shank rests on the roller: `crown.y` = plate top + `2 × rollerRadius` + `shankWidth / 2`. `flukeTip` and `flukeWing` are offsets from `crown` (`flukeWing` with its z sign for the starboard wing; the port wing has `−z`). `windlass.profile` is `[radius, height above the deck]`, bottom to top, for a lathe. `chain.from` is where the chain leaves the windlass's gypsy (`windlass.x + 0.075`, deck + 0.09). These values are fixed (the tests use them). Small cuts of the fluke through the end of the roller plate are accepted.

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

Worked values (tested with `Math.abs(actual − expected) < 0.001`): `windlassBaseY()` 1.6955; `chainLinks().length` 12; link 0 centre `[5.4969, 1.7847, 0.20]`; `anchorFluke()[0][2]` (tip) `[7.02, 1.405, 0.20]`; `anchorFluke()[0][1]` (starboard wing) `[6.89, 1.665, 0.37]`; `anchorFluke()[1][1]` (port wing) `[6.89, 1.665, 0.03]`.

### 7.3 3D (`src/render3d/boat/bowGear.ts`)

`buildBowGear(materials: BoatMaterials, detail: Detail): THREE.Object3D[]`, called from `buildBoat` in `index.ts` after `buildDeckGear`:

- **Bow roller** (`fit_bow_roller`, material `fitting`): a base plate box from `aftX` to `tipX`, y from `plateY` to `plateY + plateThickness`, `2 × halfWidth` wide, centred on `centreZ`; two cheeks (boxes `cheekThickness` wide, `cheekHeight` high standing on the plate top, from `aftX` to `tipX`) centred on `centreZ ± (halfWidth − cheekThickness / 2)`; the roller (`cylinderBetween` along z from one cheek's inner face to the other's, radius `rollerRadius`, at x `rollerX`, its centre `rollerRadius` above the plate top). One `smallPartMesh` with hit point `[rollerX, plateY + plateThickness + cheekHeight, centreZ]`.
- **Anchor** (`fit_anchor`, material `chrome`, one `smallPartMesh` with hit point `crown`): the shank as `cylinderBetween(shackle, crown, shankWidth / 2)` (radial per 3.3); the fluke as two closed slabs, one per `anchorFluke` triangle: the triangle moved `+flukeThickness / 2` and `−flukeThickness / 2` along its normal, plus the three side quads; a shackle ring at `shackle` (`TorusGeometry`, ring radius 0.03, tube `chain.wireRadius`, segments as a chain link in 3.3, its axis along z).
- **Chain** (`fit_anchor_chain`, material `dark`, `asThin`, pick segment `[chain.from, chain.to]`): per `chainLinks` entry a `TorusGeometry(ringRadius = (linkWidth − 2 × wireRadius) / 2, tube = wireRadius)` (it lies in its x–y plane), scaled along its x by `linkLength / linkWidth` (so its long axis is x), rotated by `turn` about x, then rotated so that x points along `along`, and moved to `centre`; all merged into one mesh.
- **Windlass** (`fit_anchor_windlass`): the recess as a dark disc (`CircleGeometry(recessRadius, 24 at High / 12 at Low)`, rotated −90° about x so it faces up, material `dark`) at `[x, windlassBaseY() + DECK_EPS, z]`; the windlass a `LatheGeometry` of `profile` (segments per 3.3, material `chrome`) standing on the disc at the same point. Both meshes carry `fit_anchor_windlass`; the lathe is a `smallPartMesh` with hit point `[x, windlassBaseY() + DECK_EPS + 0.17, z]`.

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

`tests/glossary.test.ts`: add `fit_anchor` and `fit_anchor_chain` to `COMPLETE_IDS`; the `deck` group size becomes **14** (from 12). (No "mistakes" for the anchor yet: how to anchor needs sources, and comes with Phase 7.)

**Counts in earlier checks** (3.5): `scripts/shots-m24.mjs` and CODE_MAP: **133** registry ids and Learn entry buttons, **61** Show me ids and buttons.

**`tests/boatModel.test.ts`** "overall size matches the data": the boat now reaches past `hull.bowFittingTipX` (the anchor's fluke tip is at x 7.02). Change only the length line, to `expect(box.max.x - box.min.x).toBeCloseTo(anchorFluke()[0][2][0] - boat.hull.transomX, 1)` (15.62; the slab's half thickness is inside the tolerance). Nothing else in that test changes.

### 7.5 Tests (`tests/bowGear.test.ts`)

1. The worked values of 7.2.
2. Every chain link centre lies on the segment `from`–`to`; neighbouring links' `turn` differ.
3. `chain.to` equals `anchor.shackle`; the roller's cheeks (`centreZ ± halfWidth`) stay clear of the furler drum (at `rig.jibFurler.drum`, on the centreline, radius `modelDetail.jibFurlerDrumDiameter / 2` = 0.13): `centreZ − halfWidth > jibFurlerDrumDiameter / 2` (0.14 > 0.13).
4. The windlass's widest radius plus its `z` is less than `halfBeamAt(windlass.x) − toerail.width` (it stands on the deck, inside the toerail), and `windlass.z + recessRadius` (0.34) is less than `halfBeamAt(lifelines.fwdX) − lifelines.inset − lifelines.footDiameter / 2` (0.359: the foremost lifeline post stands beside the recess, not on it).

### 7.6 Browser checks (`scripts/shots-m31.mjs`)

- Scene `anchor-bow`: `?wd=0&ws=0&cam=bow&sel=fit_anchor&held=1&sea=flat` (the Show me link).
- `M31_SCENES`: the scene below. Close-ups (3.5, High and Low, the default close-up link): `bow-from-above` position `[4.2, 3.4, 1.4]`, target `[6.2, 1.7, 0.15]`, fov 45; `bow-from-side` position `[6.6, 1.9, 2.6]`, target `[6.6, 1.6, 0.15]`, fov 45.
- Live check `m31 show me anchor`: open `?learn=fit_anchor&m=learn`, the Learn entry shows "Anchor"; tap `learn-show-me` (the Show me button's test id from M20), the link contains `sel=fit_anchor` and `cam=bow`; the phone's Back (`page.goBack()`) returns to the entry.
- Live check `m31 tap`: open the close-up link, `closeUp` as `bow-from-side`, then for `fit_anchor` (hit point `crown`), `fit_bow_roller` and `fit_anchor_windlass` (their hit points, 7.3) tap the projected point (`__sailDebug.project`, as in M30) and check the info card's `data-part-id`. The chain is not tapped (it is thin and lies between the others; the picker prefers small parts' hit areas).
- Live check `m31 show on the boat`: in the `fit_bow_roller` and `fit_anchor_windlass` entries the "Show on the boat" button (`learn-show-on-boat`) is present (it was hidden while they were in `NOT_DRAWN`).

**Look at** the `bow-*` PNGs: the anchor hangs in front of the stem to starboard of the furler drum, the chain lies in the roller channel and reaches the windlass, nothing cuts through the drum or the pulpit.

### 7.7 Done when / not in this milestone

Done when: 7.5 passes; the glossary tests pass with the new counts; the Show me scene shows the anchor; `BOAT_REFERENCE.md` lists the anchor type and the windlass position as assumptions.
Not in this milestone: a windlass remote at the helm (no photo shows one), the chain counter, anything that moves.

### 7.8 Decided in the M31 PR

- **`tests/picking.test.ts`, "an isolated small fitting still responds to a tap 20 px away"** used the jib furler drum. With the roller, anchor and windlass drawn, their tap points lie 8 to 12 px from the drum's in the whole-boat phone side view, so the drum is no longer an isolated fitting there and a tap 20 px from it can belong to a neighbour (found by running the test; the two other offsets still found the drum). The test now uses the mainsheet boom blocks, the only centreline fitting that still passes all three offsets; its comment says why. This is a change to an existing test that 7.4 does not list: the owner accepted this in the M31 PR ("accept all", PR #74): the bow tap points stay as 7.3 gives them.
- **Tap check (`m31 tap`):** found by running it: in the `bow-from-side` close-up on a phone (a frame about 1 m wide) the windlass (x 5.40) is out of frame, and the roller's own tap point (the top centre between the cheeks) lies under the anchor's shank, so a tap there correctly finds the anchor. Each part is therefore tapped on a fresh page: the anchor at its tap point and the roller on its starboard cheek, both in `bow-from-side`; the windlass at its tap point in `bow-from-above`. The anchor's and the windlass's points come from `__sailDebug.hitCentres()` (no copy of the deck height in the script); the roller's cheek point is computed from `deckFittings.bowRoller`. The tap points themselves are unchanged (owner, PR #74, "accept all": leave them as they are).

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

`stations` are x values; every station has one fitting on each side. These values are fixed (the tests use them).

### 8.2 Model (`src/model/mooringFittings.ts`, pure)

```ts
export interface FittingPlace {
  /** Centre of the fitting's footprint on top of the toerail (3.1). */
  base: Vec3;
  /** Unit direction along the toerail (forward, in the x–z plane): the fitting's long axis. */
  along: Vec3;
  side: Side;
}
/** One place per station and side, starboard first for each station, stations in data order. */
export function cleatPlaces(data: BoatData = boat): FittingPlace[];
export function fairleadPlaces(data: BoatData = boat): FittingPlace[];
```

`base` = `[x, sheerAt(x) + toerail.height, side × (halfBeamAt(x) − toerail.width / 2)]` (3.1). `along` = `[1, 0, side × k]` normalised, with `k = (halfBeamAt(x + 0.05) − halfBeamAt(x − 0.05)) / 0.1` (the deck edge's slope; near the bow it runs about 20° off the x axis). The `Side` type is the one exported from `deckVolumes.ts` (3.1).

Worked values (starboard; tested, ±0.001): cleats `[5.0, 1.735, 0.579]`, `[-1.2, 1.599, 2.2]`, `[-7.5, 1.459, 2.085]`; fairleads `[5.25, 1.741, 0.483]`, `[-7.95, 1.447, 2.037]`. `cleatPlaces().length` 6, `fairleadPlaces().length` 4. `along` of the starboard cleats: `[0.935, 0, -0.354]`, `[0.991, 0, -0.131]`, `[0.994, 0, 0.107]`; of the starboard bow fairlead `[0.930, 0, -0.367]`.

### 8.3 3D (`src/render3d/boat/mooringFittings.ts`)

`buildMooringFittings(materials: BoatMaterials, detail: Detail): THREE.Object3D[]`, called from `buildBoat` after `buildBowGear`:

Each fitting is built in a local frame (u along its long axis, v up, w across) and placed by rotating u onto `along` (a rotation about y) and moving the origin to `base − [0, DECK_EPS, 0]` (sunk 1 cm into the toerail top, 3.4).

- **Cleats** (`fit_mooring_cleat`, material `chrome`, one merged `smallPartMesh` for all six, one hit point per cleat at `base + [0, baseThickness + legHeight + hornHeight − DECK_EPS, 0]`): a base plate box `baseLength` (u) × `baseThickness` (v) × `baseWidth` (w), its bottom at v 0; two legs (`cylinderBetween`, radius `legRadius`) at u `± legSpacing / 2` from v `baseThickness` up `legHeight`; the horn: `extrudeProfile` of the six (u, v) points `(−length/2, v0 + hornHeight/2)`, `(−length/2 + hornHeight/2, v0)`, `(length/2 − hornHeight/2, v0)`, `(length/2, v0 + hornHeight/2)`, `(length/2, v0 + hornHeight)`, `(−length/2, v0 + hornHeight)` with `v0 = baseThickness + legHeight` (the two lower ends cut at 45°), extruded `hornWidth` across w, centred.
- **Fairleads** (`fit_fairlead`, material `chrome`, one merged `smallPartMesh`, a hit point per fairlead at `base + [0, baseThickness + jawHeight − DECK_EPS, 0]`): a base box `length` (u) × `baseThickness` (v) × `width` (w); two jaws, boxes `jawThickness` (u) × `jawHeight` (v) × `width` (w), standing on the base at its two ends (u `± (length − jawThickness) / 2`). The slot between them runs across the boat (w), the way a mooring line leaves it.

### 8.4 Registry and glossaries

Registry: `fit_mooring_cleat` keeps its entry (`"phase": 6`, set by the planning PR); its `related` gains `"fit_fairlead"`, and if `sourceKeys` has a `photo:cleat` key when you build (the planning PR adds it only if the owner uploads `cleat-closeup.jpg`), its `sources` gain `"photo:cleat"`. Insert after `fit_anchor_chain`:

```json
{"id": "fit_fairlead", "kind": "fitting", "phase": 6, "group": "deck", "status": "draft", "sources": [], "related": ["fit_mooring_cleat", "part_deck"]},
```

`NOT_DRAWN`: remove `fit_mooring_cleat`.

English, new entry:

```json
"fit_fairlead": {
  "name": "Fairlead",
  "alternatives": [],
  "short": "A smooth guide on the deck edge that a mooring line runs through.",
  "what": "A fairlead keeps a mooring line in place where it leaves the boat, so it does not rub on the deck edge or jump off.",
  "onThisBoat": "One on each side near the bow and near the stern, beside the cleats. Their exact places are a guess.",
  "textStatus": "draft"
}
```

Changed English text: `fit_mooring_cleat.onThisBoat` = "Three on each side, on the raised rim at the deck edge: at the bow, in the middle and at the stern. The bow cleats are in a photo; the other places are partly a guess."

Russian: name `fit_fairlead` «киповая планка», `alternatives: []` («клюз» is the hole the anchor chain runs through, a different part); texts drafted by you; `fit_mooring_cleat.onThisBoat` redrafted to match.

`tests/glossary.test.ts`: add `fit_fairlead` to `COMPLETE_IDS`; `deck` group size **15**. `fit_fairlead` is drawn from the start, so it never goes into `NOT_DRAWN` (test 11 finds its id in `mooringFittings.ts`).

**Counts in earlier checks** (3.5): **134** registry ids and Learn entry buttons, **61** Show me.

### 8.5 Tests (`tests/mooringFittings.test.ts`)

1. The worked values of 8.2; the port places are the starboard ones with z negated.
2. `along` matches the worked values (±0.001) and has length 1; every cleat and fairlead base lies within the toerail's width: `halfBeamAt(x) − toerail.width ≤ |z| ≤ halfBeamAt(x)`, and `x` is between `toerail.aftX` and `toerail.fwdX`.
3. No fairlead overlaps a cleat along x (their x ranges `x ± length / 2` do not intersect) and the bow fairlead stays clear of the windlass recess (`|z| − width/2 > windlass.z + recessRadius` or `x − length/2 > windlass.x + recessRadius`).

### 8.6 Browser checks (`scripts/shots-m32.mjs`)

- Close-ups (High and Low, the default close-up link): `cleat-bow` position `[4.3, 2.3, 1.4]`, target `[5.0, 1.75, 0.58]`, fov 40; `cleat-midship` position `[-0.2, 2.2, 3.4]`, target `[-1.2, 1.6, 2.2]`, fov 40; `cleat-stern` position `[-9.6, 2.4, 3.2]`, target `[-7.6, 1.46, 2.08]`, fov 40.
- Scene `cleats-side`: `?wd=0&ws=0&cam=side-starboard&sel=fit_mooring_cleat&held=1&sea=flat`.
- Live check `m32 show cleat`: open `?learn=fit_mooring_cleat&m=learn&wd=0&ws=0&cam=side-starboard&lb=0`, tap `learn-show-on-boat`: `waitForLink(page, ['sel=fit_mooring_cleat'])`, and the info card's `data-part-id` is `fit_mooring_cleat`.
- Live check `m32 tap cleat`: open `?wd=0&ws=0&lb=0&debug=1`, `closeUp` as `cleat-midship`, tap the screen point of the starboard midship cleat's hit point (`__sailDebug.project`, as in M30): the info card names "Mooring cleat".

**Look at** the `cleat-*` PNGs: a recognisable horn cleat standing on the rim, a fairlead beside the bow and stern cleats, nothing floating.

### 8.7 Done when / not in this milestone

Done when: 8.5 passes; the glossary tests pass; positions without a photo are assumptions in `BOAT_REFERENCE.md`.
Not in this milestone: mooring lines on the cleats (Phase 7).

### 8.8 Decided in the M32 PR

- **`tests/picking.test.ts`, "an isolated small fitting still responds to a tap 20 px away"** (changed in M31 to the mainsheet boom blocks). With the cleats drawn, the port midship cleat's tap point lies close to the boom blocks' in the whole-boat phone side view, so a tap 14 px aside correctly finds the cleat and the boom blocks are no longer isolated there (found by running the test). The test now uses the masthead wind indicator (`part_windex`), a small fitting with nothing near it that passes all three offsets. This is a change to an existing test that 8.4 does not list; the cleat tap points stay as 8.3 gives them. Listed here for the owner to confirm.
- **Tap check (`m32 tap`):** the spec asks for a tap on the starboard midship cleat. Because the six cleats share one mesh, the script takes the cleat hit point nearest the middle of the screen from `__sailDebug.hitCentres()` (the close-up looks at the starboard cleat), so the deck height is not copied into the script. A second tap check does the same for the bow fairlead (`cleat-bow` close-up), because the WORKFLOW checklist says "tap a fairlead: Fairlead".
- **Tap sweep (`scripts/shots.mjs`):** CI's tap sweep failed with "never identified winch_primary_port". On `main` the port winch was found by exactly one tap in the whole sweep (in the desktop starboard view); the starboard cleats and fairleads now take that tap (the winch's tap area is a few pixels across next to the clutch banks and rope boxes). The winch is still tappable (the small-parts check passes). The sweep gained one view, the desktop helm view, where the winch is large on screen; no check was weakened.
- **Owner's answers (PR #75, "accept all"):** both questions accepted as recommended: the picking test uses the wind indicator; the fairleads' and the stern cleat's places stay as given.
- **No `photo:cleat` source** was added to the registry: `sourceKeys` has no such key (the owner has not uploaded `cleat-closeup.jpg`).

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

`fenders.profile` is `[radius, distance down from the fender's top]` for a lathe (`LatheGeometry` takes `(radius, height)` points from bottom to top: use height = −distance, **reverse the list** so it runs bottom to top (otherwise the faces point inwards), and place the lathe's origin at the fender's `top`). These values are fixed (the tests use them).

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

**Panel** (`panel.ts`): builds the section with `createSection('harbour', t('harbour.title'), createHarbourPanel(store), true)` in the same place and the same way as the seven sections of PHASE5_SPEC 8.5 (eight from now on); the ordering, the open states and `showSection('harbour')` then work from `MODE_LAYOUTS` with no other change. The Russian strings are Cyrillic only, so the M23 Latin scan passes.

**Phase 5 browser checks that list the sections** are updated to eight, `harbour` last (an update, not a weakening): `scripts/shots-m27.mjs` (the check that the sections are in the order of PHASE5_SPEC 4.4: use `MODE_LAYOUTS`' new rows) and `scripts/shots-m29.mjs` (the checks that "all seven" `[data-section]` elements are children of `.panel-body`: eight). Nothing else in them changes.

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

The same pattern as the Held still / Sailing switch (`createBoatModeSwitch`, `src/ui/windPanel.ts`): a change dispatches `setFenders`; a store subscriber checks the right radio and sets `hidden` on `fenders-hint` to `!fenderHintShown(state.harbour, state.boat.mode)`. The hint is a live status line (no `explain` class); `style.css` gains `[data-testid='fenders-hint'][hidden] { display: none; }`. `scripts/ui.mjs` `showSection` accepts `harbour`. Browser checks choose an option by clicking its label: `page.locator('label:has([data-testid="fenders-out"])').click()`.

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

New materials (3.1): `fender` (`MeshLambertMaterial`, `fenders.colour`) and `fenderLine` (`MeshLambertMaterial`, `fenders.lineColour`).

- **Fenders** (`fit_fender`): one mesh in `fender` (a `LatheGeometry` of `profile` per `fenderPlaces` entry, its origin at `top`, segments per 3.3, merged); one `asThin` mesh in `fenderLine` with, per fender, an eye (`TorusGeometry`, ring radius 0.02, tube 0.006, segments as a chain link in 3.3, in the x–y plane, centred at `top + [0, 0.02, 0]`) and the line (`cylinderBetween(top + [0, 0.04, 0], lineEnd, lineRadius)`), merged. Both meshes carry `fit_fender`.
- **Ball fender** (`fit_fender_ball`): one mesh in `fender` (`SphereGeometry(diameter / 2, …)` per 3.3, at `centre`); one `asThin` mesh in `fenderLine` with the eye at `centre + [0, diameter / 2 + 0.02, 0]` and the line from `centre + [0, diameter / 2 + 0.04, 0]` to `lineEnd` (`lineRadius`). Both carry `fit_fender_ball`.
- `setOut(out)` sets `visible` on every object. They start hidden.

`buildBoat` (`index.ts`) adds them, and the `BoatModel` it returns gains `setFendersOut(out: boolean): void`. `scene.ts` calls it after **each** of its two `buildBoat` calls (the first build, and the rebuild when Detail changes) with the current `state.harbour.fendersOut`, and whenever that value changes: a check of its own in the state subscriber, not a branch of the existing `if (detail changed) … else if (selection changed)` chain (a Show me changes the selection and the fenders at once). Compare with the previous value; never every frame.

With the fenders in the locker, "Show on the boat" for a fender lights nothing (they are not on deck); the entry says where they are. A Show me scene or a Realistic practice scenario (`realisticPanel.ts`) loads its own link, so it puts out fenders back in the locker, like every other setting of the scene; Back restores them after a Show me. All intended.

**`tests/boatModel.test.ts`** "overall size matches the data": `Box3.setFromObject` counts hidden meshes, so the fenders would widen the boat. Compute the box over the meshes whose `userData.partId` is not `fit_fender` or `fit_fender_ball` (traverse the root and `expandByObject` each other mesh); nothing else in the test changes.

### 9.6 Registry and glossaries

Insert after `fit_fairlead`:

```json
{"id": "fit_fender", "kind": "fitting", "phase": 6, "group": "deck", "status": "photo-confirmed", "sources": ["photo:fenders", "owner"], "related": ["fit_fender_ball", "fit_mooring_cleat", "part_lifelines"], "showMe": "?wd=0&ws=0&cam=side-port&sel=fit_fender&held=1&sea=flat&fd=1"},
{"id": "fit_fender_ball", "kind": "fitting", "phase": 6, "group": "deck", "status": "draft", "sources": ["owner"], "related": ["fit_fender", "part_stern"], "showMe": "?wd=0&ws=0&cam=side-port&sel=fit_fender_ball&held=1&sea=flat&fd=1"},
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
  "showMe": "The boat from the port side with the fenders out: the ball fender hangs at the back corner.",
  "textStatus": "draft"
}
```

Russian names: `fit_fender` «кранец», `fit_fender_ball` «кранец-шар», both `alternatives: []`; texts drafted by you.

`tests/glossary.test.ts`: add both to `COMPLETE_IDS`; `deck` group size **17**. Scene tests in its section 7 ("show-me scenes show what their text says"): for `fit_fender` and `fit_fender_ball`, `scene(showMe(id)).harbour.fendersOut` is `true`.

**Counts in earlier checks** (3.5): **136** registry ids and Learn entry buttons, **63** Show me.

### 9.7 Tests

`tests/harbour.test.ts`:
1. `DEFAULT_HARBOUR.fendersOut` is false; the initial state has it.
2. `setFenders` true then false; the same object back when nothing changes.
3. `reset` puts them back in the locker.
4. `fenderHintShown`: true only for (out, sailing); false for (out, held), (stowed, sailing), (stowed, held).
5. URL: `fd=1` round-trips; a link without `fd` and a link with `fd=0` open with them in the locker; `serializeUrlState` writes no `fd` when stowed; with `fd=1` it comes after the clock keys and before the first Realistic key (check the key order in `serializeUrlState(parseUrlState('?clock=0&fd=1&mode=realistic&st=starboard'))`: `clock=0` comes before `fd=1`, and `fd=1` before `st=starboard`).

`tests/mooringFittings.test.ts`: the worked values of 9.2; every fender clears the hull: for each place and every y between `top.y − length` and `top.y`, `|top.z| − diameter / 2 ≥` the hull's half-width at that height (sample `sectionPoint(x, s)` for s in 0…1 step 0.01 and take the largest z whose y is within 0.02 of the sample height).

`tests/urlState.test.ts`: only add `fd` cases if the file has a table of every key (keep its pattern).

### 9.8 Browser checks (`scripts/shots-m33.mjs`)

- `M33_SCENES`: `fenders-out` `?wd=0&ws=0&cam=side-port&sel=fit_fender&held=1&sea=flat&fd=1`, and `harbour-ru` (below). Close-up (High and Low) `ball-fender`: link `?wd=0&ws=0&lb=0&debug=1&fd=1&detail=<high|low>`, position `[-11.0, 1.6, -4.5]`, target `[-8.2, 0.9, -2.3]`, fov 45.
- Live check `m33 switch`: open `?wd=60&ws=12` (Held still, added by `openPage`), `showSection(page, 'harbour')`, click the `fenders-out` label: `waitForLink(page, ['fd=1'])`; click the `fenders-stowed` label: `waitForLink(page, [], ['fd='])`. `fenders-hint` stays hidden (Held still).
- Live check `m33 hint`: open `?wd=60&ws=12&held=0&fd=1`, `showSection(page, 'harbour')`: `fenders-hint` is visible with the English text.
- Live check `m33 old link`: open `?wd=60&ws=12`: the link has no `fd`; `fenders-stowed` is checked.
- Live check `m33 show me`: open `?learn=fit_fender&m=learn`, tap Show me: the link contains `fd=1`; `page.goBack()`: the link has no `fd`.
- Russian: scene `harbour-ru`: `?lang=ru&wd=60&ws=12&held=1` with the `harbour` section shown (`section: 'harbour'`): nothing is cut off.

**Look at** the `fenders-out` and `ball-fender` PNGs: the fenders hang against the topsides (the hull's sides above the water) without cutting into the hull, each with a line up to the rim; the ball fender at the port corner of the stern.

### 9.9 Done when / not in this milestone

Done when: 9.7 passes; the Harbour gear block is last in every mode and folded; old links open with the fenders in the locker; `BOAT_REFERENCE.md` lists the fender sizes and stations as assumptions; CODE_MAP lists the new files and the `setFenders` action.
Not in this milestone: fenders moving, bouncing or being lost (Phase 7), Harbour mode (Phase 7), fenders in other places (the stern platform), more than one ball fender.

### 9.10 Decided in the M33 PR

- **No `photo:fenders` source:** `sourceKeys` has no such key (the owner has not uploaded `side-at-anchor-fenders.jpg`), so `fit_fender` is `status: "draft"` with `sources: ["owner"]`, as 9.6 says for this case. Its `BOAT_REFERENCE.md` row already names the photo as the source of the shape.
- **`tests/modes.test.ts`:** besides the new rows (taken from `MODE_LAYOUTS` itself), the "the rest always" list gained `harbour`.
- **Eye and line sizes** are two constants in `src/render3d/boat/fenders.ts` (ring radius 0.02, tube 0.006, as 9.5 gives); the line's radius is `deckFittings.fenders.lineRadius`.

---

## 10. M34: Rope ends and Phase 6 sign-off

**Independent review: not needed** (drawing of the rope ends, browser checks and docs; the rope paths and every model value stay as they are).

### 10.1 Data

`modelDetail.winchRope` gains `"drumRenderRadius": 0.011` (the rope's radius on a winch drum; with `capstan.maxTurns` 5 turns it fills the drum from `wrapBottomAboveBase` to exactly `wrapTopAboveBase`, 5 × 2 × 0.011 = 0.11 m). `modelDetail.ropeBin` gains:

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

These values are fixed. The coil rope has the drum's thickness: both are the rope drawn at its own size, close up; the ropes running across the boat keep `visual.ropeRenderRadius` (0.025) so they can be seen from afar.

### 10.2 Sealed rope ends (`src/render3d/boat/ropes.ts`)

Every strand gets a closed, rounded cap at both ends (a strand end that goes into a block or the mast is inside it, so its cap is never seen; the caps there cost nothing). No taper.

- **Layout.** A strand with `n` points has `n × RADIAL` ring vertices (as today), then the **start centre** at index `base + n × RADIAL` and the **end centre** at `base + n × RADIAL + 1`. `buildGeometry`'s vertex count becomes `layout.reduce((sum, n) => sum + n * RADIAL + 2, 0)`, and both its own loop and `update` advance `base` by `n * RADIAL + 2` per strand.
- **Triangles** (added in `buildGeometry` after each strand's side quads), with `a(j)` = `base + j` (first ring) and `z(j)` = `base + (n − 1) × RADIAL + j` (last ring), `j` = 0 … RADIAL − 1, `j1 = (j + 1) % RADIAL`: start cap `(startCentre, a(j1), a(j))`, end cap `(endCentre, z(j), z(j1))`. (A ring's index runs anticlockwise seen from ahead of the tangent, `binormal = tangent × normal` in `writeStrand`, so these face outwards. The existing side quads happen to face inwards; leave them, the rope material is drawn from both sides only through its own settings, and the caps are still to be wound as written here.)
- **Positions** (`writeStrand`): the start centre at the first point minus `tangent × radius × 0.5`, the end centre at the last point plus `tangent × radius × 0.5` (a rounded tip), where `radius` is that end ring's radius as written (after `radiusAt`, so the on-screen minimum counts) and `tangent` is the end ring's tangent. `tangent` is a shared module-level vector overwritten for every point, so save the first ring's tangent and radius (copies) when writing point 0, and use the values of the last point after the loop. Normals: `−tangent` and `+tangent`. `uv`: the end ring's `u`, v 0.5.

### 10.3 Thinner rope on the winch drums

- `src/model/ropePaths.ts` `winchWrapPoints`: the helix's radius, its rise and the jaw use `data.modelDetail.winchRope.drumRenderRadius` in place of `data.visual.ropeRenderRadius` (the local `radius`): `r = size.diameter / 2 + drumRenderRadius`, `top = min(winch.y + wrapTopAboveBase, bottom + 2 × drumRenderRadius × turns)`, jaw radius `size.diameter / 2 − drumRenderRadius` and jaw height `winch.y + size.height − drumRenderRadius`. Nothing else in it changes. This covers every rope on a winch, the JIB ROLL line too.
- `ropePaths.ts` new export: `onWinchDrum(p: Vec3, data: BoatData = boat): boolean`: true when, for some **present** winch of `cockpitHardware.winches` (skip `present: false`, as `tailToBin` does), `hypot(p.x − winch.x, p.z − winch.z) ≤ modelDetail.winch.diameter / 2 + drumRenderRadius + 1e-6` and `winch.y + wrapBottomAboveBase − 1e-6 ≤ p.y ≤ winch.y + modelDetail.winch.height`. It is true for the helix points and for the self-tailer's jaw point (inside the drum's radius, below its top), so the rope going into the jaw is thin too; the tails never come that close (`tests/m5Ropes.test.ts` keeps them outside `1.2 × drum radius + ropeRenderRadius`).
- `ropes.ts` `writeStrand`: a point with `onWinchDrum(p)` uses `drumRenderRadius` as its base radius in `radiusAt` (the on-screen minimum still applies); every other point keeps `ropeRenderRadius`. The tube narrows over the one segment from the last thick point to the first drum point (and widens again towards the hand): accepted.
- **Known limitation (accepted):** the drum is drawn waisted (narrower in the middle), so the thin turns stand a few millimetres off its waist, and the top turns of a 5-turn wrap touch the self-tailer's ring. Note it in the PR; do not change the winch.
- **Existing tests** (`tests/m5Ropes.test.ts`), the only changes allowed in this milestone: where a drum radius or a turn's rise is meant, `RADIUS` becomes `boat.modelDetail.winchRope.drumRenderRadius`: the `onDrum` filter in `turned()` (`DRUM + RADIUS`), the lower bound `(DRUM + RADIUS) × cos(π / WINCH_WRAP_POINTS_PER_TURN)`, and `expect(rise).toBeCloseTo(2 * RADIUS, 6)`. The coaming check (`p[1] - RADIUS`) and every other use of `RADIUS` stay. The test "wraps rise up the drum between the data heights" keeps its expected heights (5 turns still reach `wrapTopAboveBase`).

### 10.4 Coiled tails in the tail boxes

`src/model/ropeCoil.ts` (pure):

```ts
/** A flat coil lying on the tail box's floor: one polyline per layer, centred on the box. */
export function coilLayers(box: { x: number; z: number }, pointsPerTurn: number, data: BoatData = boat): Vec3[][];
```

Layer `k` (0-based) is a spiral from `innerRadius` out to `outerRadius` over `turns` turns: `r(θ) = innerRadius + (outerRadius − innerRadius) × θ / (2π × turns)`, θ from 0 to `2π × turns` in `round(turns × pointsPerTurn)` steps (that many + 1 points), at height `y = coamingTopY + 0.004 + ropeRadius + k × 2 × ropeRadius` (on the box's dark floor plate, which is 0.004 thick). Even layers: point `[box.x + r cos θ, y, box.z + r sin θ]`; odd layers: `[box.x + r cos θ, y, box.z − r sin θ]` (the same spiral wound the other way, so the two layers cross instead of lying exactly over each other).

The tails keep their paths (`tailToBin`): they dive into the box through the coil, which reads as rope piled in the box; the top layer stands about 3 cm above the rim. The coil's two tube ends are left open (they are hidden in the pile and at its edge). All three are intended.

`cockpitHardware.ts`: `buildRopeBins(materials, detail)` (the new `detail` parameter is passed by `buildCockpitHardware`) adds, per box and layer, a `TubeGeometry(new THREE.CatmullRomCurve3(points), points.length − 1, ropeRadius, radial, false)` (radial and points per turn from 3.3), merged per box into one `smallPartMesh` with id `fit_rope_bin`, material `coil` (`MeshLambertMaterial`, `coil.colour`, 3.1) and the box's existing hit point.

Worked values (tested): `coilLayers({ x: -7.58, z: 1.6 }, 32)` has 2 layers of 81 points; layer 0 starts at `[-7.55, 1.565, 1.6]` and ends at distance 0.085 from the box centre; layer 1 is at y 1.587 (all ±0.001); `outerRadius + ropeRadius` (0.096) is less than `min(ropeBin.length, ropeBin.width) / 2 − ropeBin.rimWidth` (0.10).

### 10.5 Tests (`tests/ropeEnds.test.ts`)

1. The worked values of 10.4.
2. For each winch and 1 … 5 turns, self-tailer and hand, with the tails port `b2`, `b3`, `b4`, `b5`, `r1` and starboard `a1`, `a2`, `a3`, `a5` (`r1` is JIB ROLL; copy the local helper `realisticWith` from `tests/m5Ropes.test.ts`, it is not exported), through `ropeDrawings(rig, boat, winchWraps(...))`: in the rope's strand, every `onWinchDrum` point except the jaw point (the last point with a self-tailer) lies at distance `diameter / 2 + drumRenderRadius` (±1e-6) from the winch axis, and at least `round(turns × WINCH_WRAP_POINTS_PER_TURN)` points are `onWinchDrum`.
4. `buildRopes(ropeDrawings(rig))`: each rope mesh's position count is `Σ (points × RADIAL + 2)` over its strands, and its index count is `Σ ((points − 1) × RADIAL × 6 + 2 × RADIAL × 3)`.
3. In Easy mode (`ropeDrawings(rig)` without winches) no point of any strand is `onWinchDrum`.

### 10.6 Browser checks (`scripts/shots-m34.mjs`) and the sign-off

- `M34_SCENES` is `[]`. Close-ups (High and Low):
  - `tail-box`: link `?wd=90&ws=12&lb=0&debug=1&detail=<high|low>`, position `[-6.6, 2.4, 2.4]`, target `[-7.58, 1.55, 1.6]`, fov 40.
  - `winch-wraps`: link `?mode=realistic&wd=90&ws=12&cam=helm&wp=b5.3.t&wsb=a5.2.h&lb=0&debug=1&detail=<high|low>` (the `realistic-rope-wrapped-helm` scene of `shots-m5.mjs`: a rope wrapped on each winch, the starboard one ending in the hand), target the starboard winch (`winch_primary_starboard` in `cockpitHardware.winches`) raised by `wrapTopAboveBase`, position that target + `[0.7, 0.5, 0.9]`, fov 40.
  - `rope-end-hand`: same link, target the hand point (`[winch.x − handAftM, coamingTopY + handAboveCoamingM, winch.z − handInboardM]` for the starboard winch), position that target + `[0, 0.5, 0.8]` (above and outboard), fov 40.
- **Accessibility:** in `liveM34Checks`, open `?wd=60&ws=12`, `showSection(page, 'harbour')`, and call `auditPage(page, 'm34 harbour')` from `scripts/a11y-audit.mjs` (it is exported); fix anything it reports.
- The full set at phone size, and the frame-rate check in the PR's checklist: `?debug=1&wd=60&ws=20&wm=gusty&fd=1&detail=low` (the owner writes the number).
- **Look at** the `tail-box`, `winch-wraps` and `rope-end-hand` PNGs: coils in the boxes, thin turns lying side by side on the drums, a rounded tip on the rope in the hand.

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
