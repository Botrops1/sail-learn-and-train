# Boat details analysis (input for `/plan 6`)

**Context for planning Phase 6 (boat details). Not a spec.** Written 2026-10-14 from the owner's request in a planning chat. `/plan 6` reads this in full, the open questions in [`BOAT_REFERENCE.md`](BOAT_REFERENCE.md), and the owner's new photos, then writes `docs/PHASE6_SPEC.md`.

## 1. The owner's request (2026-10-14)

- **Hull gaps:** the body has some gaps. Where exactly is question 1 in section 5.
- **Anchor:** there is none. Draw it with the bow roller, the chain and the windlass.
- **Mooring points for lines in a marina:** there are none. Cleats and fairleads (the fittings a mooring line is tied to or led through).
- **Fenders** (rubber buffers hung over the side in a marina): missing.
- **Line ends** do not look very nice. Which ends is question 2.
- **Sails** are fine; no change.
- **Photos:** the owner has more and can upload them (section 3).

## 2. What exists today

- **Hull:** the hull, deck, coachroof, cockpit, companionway, stern platform and a simple bow fitting (anchor roller) are lofted procedurally in `src/render3d/boat/hull.ts` from `content/boat/hanse508.json`. Joints use a small overlap (`OVERLAP` 0.1 m) and a lift against flicker (`EPS` 0.01 m).
- **Registry ids that are already there but not drawn** (Learn entries exist; `phase: 5` in the registry, meaning the old marina phase): `fit_anchor_windlass`, `fit_bow_roller`, `fit_mooring_cleat`, all `photo-confirmed` from `bow-jib-furler.jpg`. No ids yet for the anchor itself, the chain, fairleads, midship or stern cleats, or fenders.
- **Rope ends:**
  - tails at the clutches and winches;
  - the rope tail boxes behind each winch (M5);
  - Realistic mode's turns on the winch drums ("thick rope on the drums is fine for now, revisit in a later graphics pass", owner on PR #19);
  - the ropes' ends at the sails and blocks.
- **Look:** the M3b decision is procedural only, with no model or texture files. Shadows and reflections only at Detail High. Phones start on Low, and the target is 60 fps on the owner's phone.
- **Photos** (`docs/reference/photos/`): the rig, the mast foot, the clutches, the cockpit, the engine control, and the bow (`bow-jib-furler.jpg`: furler drum, anchor roller and chain, windlass, a cleat). Nothing shows the stern, the bathing platform, the side cleats, fenders, or the hull from outside.

## 3. Photos wanted (the owner's own photos only; no brochure images)

Upload them to `docs/reference/photos/` (GitHub app or web: open the folder → Add file → Upload files, on a new branch). Or attach them in the `/plan 6` chat, and the planning session adds them.

| Photo | What it settles |
|---|---|
| The bow from the front and from the side, on the pier | how the anchor sits in the roller, the stem fitting, the chain's path |
| The stern from behind, platform up and down | transom shape, bathing platform, stern cleats, the gaps at the stern |
| The side deck at midship | midship cleat, fairleads, where fenders are tied to the rail |
| Fenders hanging out, and where they are stowed while sailing | size, number, height, stowage |
| Mooring lines on the cleats in a marina (stern-to) | how lines are led, which cleat is used |
| The hull from the pier, whole length | hull shape and sheer, to check the gaps |
| The rope ends the owner means in question 2 | which ends to improve |

## 4. Proposed scope (draft; `/plan 6` makes it final)

- **Close the hull and deck gaps.** The owner's screenshots show where. Add a browser check that photographs those joints at High and Low detail.
- **Bow:**
  - the anchor in the bow roller, and a short piece of chain to the windlass;
  - the windlass as a mesh with the existing id;
  - a remote at the helm only if it shows in a photo.
  - Static in Phase 6; dropping and weighing the anchor is Phase 7.
- **Cleats and fairleads:** bow, midship and stern on both sides, with new registry ids and Learn entries (English and a Russian draft). Exact places come from the photos, or are marked as assumptions in `BOAT_REFERENCE.md`.
- **Fenders:**
  - drawn, with a simple "Fenders: stowed / out" switch so they can be seen hanging;
  - stored in the link;
  - in Harbour mode later.
  - What happens when they are left out while sailing (bouncing, lost) is Phase 7 (EXERCISES.md, failure modes).
- **Line ends.** Depends on the owner's answer to question 2. Candidates:
  - coiled tails on deck or in the tail boxes;
  - a whipped end instead of a cut tube end;
  - thinner rope on the winch drums.
- **Registry:** the three existing ids move from `phase: 5` to `phase: 6` when they are drawn; new ids are added with `status: "draft"` unless a photo confirms them.

## 5. Open questions for `/plan 6` (ask the owner, each with a recommendation)

1. **Where are the gaps?**
   - Recommended: **send two or three screenshots of the live site with the gap circled** (or the link plus a description), because the standard camera views do not show an obvious hole, so the plan cannot find them alone.
2. **Which line ends look wrong?** The tails at the winches and clutches, the ropes on the winch drums, or the ends at the sails and booms?
   - Recommended: **a screenshot of each**, for the same reason.
3. **Procedural shapes only (M3b decision), or allow one small model file for the anchor?**
   - Recommended: **procedural, low-poly**, because it keeps the rule, the file size and the 60 fps. An anchor, a cleat and a fender are simple shapes.
4. **Fenders:** how many, and are they stored in a locker or tied to the rail while sailing?
   - Recommended: **follow the photos**; if there are none, **six fenders, three per side**, marked as an assumption.
5. **Should the details show at Detail Low on a phone?**
   - Recommended: **yes, simplified** (fewer segments), because the anchor and cleats matter for learning, not only for looks.

## 6. What Phase 7 needs from Phase 6 (contract; owner's answer 2026-10-15)

Phase 7 ([`PHASE7_SPEC.md`](PHASE7_SPEC.md)) was planned before Phase 6, so it states here what it expects Phase 6 to draw and store. **`/plan 6` follows this section** (keys, ids, positions). Where the owner's photos show different positions, Phase 6 uses the photos and writes the change in its spec's decisions; the `/plan 7 refresh` session before M40 then updates PHASE7_SPEC to match. Phase 6 draws these parts; it does not make them work (no forces, no windlass, no lines).

**Data in `content/boat/hanse508.json`, `deck` block** (boat frame: x forward from the mast, y up from the waterline, z to starboard; metres):

```json
"cleats": [
  { "id": "cleat_bow_port", "role": "bow", "side": "port", "x": 5.6, "y": 1.75, "z": -0.30 },
  { "id": "cleat_bow_starboard", "role": "bow", "side": "starboard", "x": 5.6, "y": 1.75, "z": 0.30 },
  { "id": "cleat_mid_port", "role": "mid", "side": "port", "x": -1.0, "y": 1.55, "z": -2.05 },
  { "id": "cleat_mid_starboard", "role": "mid", "side": "starboard", "x": -1.0, "y": 1.55, "z": 2.05 },
  { "id": "cleat_stern_port", "role": "stern", "side": "port", "x": -8.2, "y": 1.40, "z": -1.85 },
  { "id": "cleat_stern_starboard", "role": "stern", "side": "starboard", "x": -8.2, "y": 1.40, "z": 1.85 }
],
"fenders": {
  "diameterM": 0.25,
  "lengthM": 0.8,
  "hangBottomY": 0.3,
  "points": [
    { "id": "fender_port_1", "side": "port", "x": 1.0 },
    { "id": "fender_port_2", "side": "port", "x": -1.5 },
    { "id": "fender_port_3", "side": "port", "x": -4.0 },
    { "id": "fender_starboard_1", "side": "starboard", "x": 1.0 },
    { "id": "fender_starboard_2", "side": "starboard", "x": -1.5 },
    { "id": "fender_starboard_3", "side": "starboard", "x": -4.0 }
  ]
},
"anchor": {
  "rollerTip": { "x": 6.9, "y": 1.7, "z": 0 }
}
```

The positions are assumptions unless the photos settle them: the cleats just inside the deck edge (`hull.deckEdgeHalfBeam`), at deck height (`hull.sheerHeight`); three fenders per side, the last one near the widest part of the hull (x −3.77); the chain leaves the bow roller at its tip (`hull.bowFittingTipX` 6.9), at deck height.

**State, action and link** (fenders only; the rest is static in Phase 6):
- `AppState.fenders: { out: boolean }` (Phase 7 adds `lost`, `overSpeedS`, `lostSinceSlow`);
- action `{ type: 'setFenders'; out: boolean }`;
- link key `fd=1` when out (not written when in);
- a "Fenders out" switch wherever `/plan 6` puts it. Phase 7 adds a second switch in its Fenders and lines section; both dispatch the same action.

**Meshes and registry ids** (each mesh carries its id, as CLAUDE.md requires):
- `fit_mooring_cleat`: all six cleats (exists, `photo-confirmed`);
- `fit_fairlead`: if fairleads are drawn (new);
- `fit_fender`: the fenders, hidden when in (new);
- `fit_bow_roller` (exists);
- `fit_anchor`: the anchor stowed in the roller (new);
- `fit_anchor_chain`: the short chain from the roller to the windlass (new);
- `fit_anchor_windlass` (exists).

Phase 7 moves the anchor mesh to the seabed and draws the chain under water, so the anchor should be one mesh (or group) that can be moved as a whole.

**Out of Phase 6** (Phase 7 does them): the windlass working, the chain running out, lines on the cleats, fenders being lost or protecting the hull.
