# Boat reference: Hanse 508 (the reference boat)

Everything we know about the real boat, where each fact comes from, and what is still a guess. The machine-readable version is [`content/boat/hanse508.json`](../content/boat/hanse508.json); keep both in sync.

## 1. Which boat, exactly

| Item | The reference boat | Evidence |
|---|---|---|
| Model | Hanse 508 (Judel/Vrolijk design, built from 2018) | Hanse spec sheet |
| Mainsail | **In-mast furling** (Seldén, manual), no battens. Two furling lines: one rolls the sail in, the other rolls it out; backup by winch handle at the mast | Photos of the gearbox and the furled clew in the mast slot; clutches "Main furling" ×2; owner; brochure option XE1001 |
| Headsail | **Self-tacking jib** on a Seldén Furlex 404S manual furler, one sheet with 2:1 purchase to a car on a **straight** track just in front of the mast. One forestay. | Photos (bow, foredeck, track); brochure. The clutch says "Genoa sheet" but it is the jib sheet. |
| Mainsheet | **German mainsheet**: one rope, three blocks under the boom, two spring-mounted deck blocks on the coachroof aft end, 2 parts per side, both ends led to the cockpit, no traveller | Photo `mainsheet-german.jpg`; clutch labels on both banks |
| Vang | **Rigid vang**: Seldén Rodkicker (size 30) strut with rope tackle. Its gas spring holds the boom up; the tackle pulls it down | Photo `mast-gooseneck-vang-outhaul.jpg` |
| Topping lift | Line from the boom end up the mast ("Boom lift") | Photo `mainsheet-german.jpg` |
| Mast and lines | Two swept-back spreader sets. Lines come down the mast, turn at Seldén blocks around the mast foot and run aft in covered channels on the coachroof | Photos `mast-spreaders.jpg`, `mast-base-turning-blocks*.jpg` |
| Gennaker | Not rigged (the halyard exists: "SPI HALYARD") | Owner; clutch label |
| Steering | Twin wheels, emergency tiller, compass at each wheel; B&G instrument display and autopilot control at the helm | Brochure; photo `cockpit-winch-clutches.jpg` |
| Engine | Diesel about 80 hp, saildrive, 2-blade fixed propeller; single-lever control; 2500 rpm limit sticker | Brochure; photo |
| Winches | 2 × Lewmar 55 self-tailing, **one per side** next to the wheel, with the clutch bank just in front of it. No secondary winches. | Brochure; photo `cockpit-winch-clutches.jpg` |
| Foredeck | Anchor windlass, bow roller with chain, mooring cleats (Phase 5) | Photo `bow-jib-furler.jpg` |

## 2. Official figures

Sources: the brochure (price list and specification `H508.22_PL_EN_20221216`) and the **owner's manual** (German edition, rig and hull data pages, photographed by the owner). Neither is stored in this repo because both are copyrighted; only the numbers are used. Where they differ, the manual wins.

| | Value | Source |
|---|---|---|
| Length overall / hull length / waterline | 15.55 / 14.93 / 13.54 m | both |
| Beam | 4.75 m | both |
| Draft (standard L-keel / short keel) | 2.40 / 1.98 m | both |
| Mass empty / light / fully loaded (standard keel, cat. A) | 14,406 / 14,739 / 19,969 kg | manual |
| Ballast | 4,000 kg | manual |
| Righting moment | 98.3 kNm at 30° heel | manual (useful for heel in Phase 2) |
| Rig | fractional, deck-stepped, tapered, 2-spreader sloop; Seldén C304 mast, B250 boom | manual |
| Mast | 20.11 m from the mast foot; deck at the mast 1.96 m above the waterline; height above WL about 22.05 m | manual |
| Forestay height above deck (FH) / foretriangle base (J) | 18.71 m / 6.13 m | manual |
| Main luff (P) / foot (E) / boom height above deck (BH) | 18.35 / 6.15 / 1.51 m | manual |
| Mainsheet position on the boom (S) | 2.925 m | manual |
| Self-tacking jib LP | 5.26 m | manual |
| Spreaders | at 6.15 m and 12.36 m above the mast foot; 2.25 m and 1.70 m long; swept back 24° | manual |
| Cap-shroud chainplates | 2.18 m out from the centreline, 0.865 m aft of the mast; aft lowers 2.15 m / 0.929 m | manual |
| Sail areas | in-mast main 61.0 m² (brochure 58.7), battened main 66.5, self-tacking jib 51.5 (brochure 51.3), reacher 87, gennaker 200 m² | manual |
| Keel (standard L-keel) | top chord 1.96 m, bulb length 2.61 m, height 1.76 m, bulb width 0.46 m | manual |
| Saildrive | bottom 3.00 m below deck | manual |
| Jib furler | Seldén Furlex 404-12 | manual + photo |

### Mast-foot lead organiser (Seldén 510-142, manual)

Port: 1 gennaker halyard · 2 jib halyard · 3 reef 2 · 4 mainsheet port. Aft: 5 vang ("kicker lead only") · 6 outhaul. Starboard: 7 mainsheet starboard · 8 reef 1 · 9 main halyard · 10 self-tacking jib sheet. The plan is for the standard (battened) rig. On our in-mast boat the reef positions carry the furling lines. It agrees with the bank sides the owner confirmed: main halyard and jib sheet go to the starboard bank A. Both mainsheet ends go forward to the mast foot before running aft.

### Running rigging (manual, in-mast option)

| Rope | Diameter | Length | Tracer colour (as delivered) |
|---|---|---|---|
| Main halyard | 12 mm | 49 m | blue/blue |
| Vang | 12 mm | 15 m | white |
| Outhaul | 10 mm | 16 m | white |
| Mainsheet | 14 mm | 50 m | white |
| Jib sheet | 14 mm | 40 m | white/black |
| Topping lift | 8 mm | 49 m | white |
| "Vorläufer" (probably the jib furling line) | 10 mm | 45 m | white |
| Gennaker halyard / sheets (option) | 12 mm | 51 m / 28 m | white/yellow / red |

The charter boat's ropes have been replaced over time (photos show white with blue or black flecks), so these colours are only a reference.

## 3. Measured geometry

Positions in [`hanse508.json`](../content/boat/hanse508.json) use the manual's figures where it gives them (rig heights, spreaders, chainplates, boom, keel). The rest was measured from the brochure's side view and deck plan:

- Side view about 35.4 px/m; deck plan about 107 px/m.
- Checked against the official numbers: hull length, beam and mast height agree within about 2 %.
- An overlay of the model's key lines on the brochure drawing matched the mast, boom, forestay, jib, spreader heights, keel bulb and rudder.
- Expect ±0.15 m on positions. Good enough for teaching, not for anything else.

Frame: origin at the mast, on the waterline, on the centreline; **x forward, y up, z starboard**.

| Feature | Position / size |
|---|---|
| Stem / bow fitting tip / transom | x = +6.30 / +6.90 / −8.60 |
| Mast | x = 0, foot on the coachroof at y = 1.96, tube top y = 22.04 (manual) |
| Spreaders | y = 8.11 and 14.32, 2.25 m and 1.70 m long, swept 24° (manual) |
| Cap shrouds | chainplates at x = −0.865, z = ±2.18; attach to the mast at y = 20.42 (manual) |
| Forestay | bow (6.28, 1.75) → mast (0.15, 20.67) (manual J and FH) |
| Boom | gooseneck (−0.20, 3.47), length 6.25 m, swings up to about 72° before touching the cap shroud (manual BH and chainplates) |
| Mainsheet | boom point 2.925 m from the gooseneck (manual S); deck blocks at x = −3.08, z = ±0.42 on the coachroof aft end |
| Vang | mast (−0.18, 2.15) → boom 2.12 m from the gooseneck |
| Outhaul | from the clew along the top of the boom to a block 6.20 m from the gooseneck, back forward to the gooseneck, down the mast (**estimate**) |
| Control-line lead | out of the mast at about y = 2.75, turning blocks at the mast foot (organiser, manual lead plan), aft along the coachroof edge (z ≈ ±1.08 at its aft end), down onto the coaming (x ≈ −3.4) and aft to the clutch banks (**estimate**, `rig.lineLead`). The main sheet ends go forward from the deck blocks to the organiser first (manual lead plan) |
| Coachroof | x = −3.05 … +2.00, top y = 1.96 (manual). Half-width 1.15 at the aft end (drawing), widening to about 1.45 at the mast (**photo estimate**: the self-tacking track ends at the edges of the raised deck in front of the mast) and staying that wide to x = 1.20; front corners cut to half-width 0.92 at x = 2.00; front face slopes back to x = 1.60 at the top (from the reference sketches) |
| Self-tacking track | straight, about 0.28 m in front of the mast, about 2.8 m end to end (photo estimate; the drawing suggested 1.8 m) |
| Jib | tack (6.23, 1.89), head (0.20, 20.52), luff 19.58 m, LP 5.26 m (manual); clew about 0.6 m forward of the mast, 2.3 m above the waterline |
| Wheels | x = −7.20, z = ±0.88 |
| Winches | x = −7.25, z = ±1.60 (the drawing also shows optional winches at x = −6.33; not on the reference boat) |
| Clutch banks | x = −6.70, z = ±1.59, just forward of each winch |
| JIB ROLL clutch | port side deck next to the sprayhood, about x = −3.4 (estimated) |

Reference sketches generated from the data file (they show exactly what the 3D model is built from):

- [`reference/hanse508-side.svg`](reference/hanse508-side.svg)
- [`reference/hanse508-plan.svg`](reference/hanse508-plan.svg)

`npm run shots` also renders the 3D model at the sketches' scale with the sketch laid on top (`docs/screenshots/<milestone>/compare-*-model-vs-sketch.png`), to check the proportions.

## 4. Ropes, clutches and controls

Photos: [`reference/photos/`](reference/photos). Russian names are AI drafts until a sailor checks them.

### Clutch bank A: **starboard** side (confirmed by the owner). Photo: `clutch-bank-a.jpg`

| Slot | Label on the boat | What it is | Russian (draft) | App control |
|---|---|---|---|---|
| 1 | Main sheet | Mainsheet, starboard end | гика-шкот | `ctl_mainsheet` |
| 2 | Main furling (left) | Furling line: this tail rolls the main **in** | закруточный конец грота | `ctl_main_furl` |
| 3 | Main furling (right) | Furling line: this tail rolls the main **out** (confirmed by the owner) | закруточный конец грота | `ctl_main_furl` |
| 4 | Main halyard | Main halyard, stays up with in-mast furling | грота-фал | static |
| 5 | Genoa sheet | **Jib sheet** of the self-tacking jib | стаксель-шкот | `ctl_jib_sheet` |

### Clutch bank B: **port** side (confirmed by the owner). Photo: `clutch-bank-b.jpg`

| Slot | Label on the boat | What it is | Russian (draft) | App control |
|---|---|---|---|---|
| 1 | SPI HALYARD | Gennaker/spinnaker halyard, parked | фал генакера / спинакер-фал | static |
| 2 | Boom lift | Topping lift | топенант гика | `ctl_topping_lift` |
| 3 | Main outhaul | Outhaul: pulls the sail out along the top of the boom; hauled with the "out" furling tail | оттяжка шкотового угла | `ctl_main_furl` (coupled) |
| 4 | MAIN SHEET | Mainsheet, port end | гика-шкот | `ctl_mainsheet` |
| 5 | Vang | Vang tackle on the rigid vang strut | оттяжка гика | `ctl_vang` |

### Single clutch on the **port** side deck. Photos: `jib-roll-clutch.jpg`, `side-deck-jib-roll.jpg`

| Label | What it is | Russian (draft) | App control |
|---|---|---|---|
| JIB ROLL | Jib furling line | закруточный конец стакселя | `ctl_jib_furl` |

### Other photos

- `engine-control.jpg`: single-lever gear and throttle (Allpa), tachometer, START / STOP / POWER buttons, "MAX 2500 RPM" sticker added by the boat operator. Phase 2.
- `mast-furling-gearbox.jpg`: Seldén in-mast furling gearbox at the mast foot with the furling line drum and a winch-handle socket (IN/OUT), used as a backup to furl by hand.
- `mainsheet-german.jpg`: three blocks under the boom, two rope parts down to each spring-mounted deck block; topping lift at the boom end; outhaul lines along the top of the boom. (Lettering on the boom blurred.)
- `mast-gooseneck-vang-outhaul.jpg`: gooseneck, rigid vang strut "Seldén … 30" with tackle, furled mainsail clew in the mast slot with two outhaul lines to the boom, furling gearbox.
- `mast-base-turning-blocks.jpg`, `mast-base-turning-blocks-2.jpg`: ring of turning blocks at the mast foot, lines leading aft; one end of the self-tacking track with car.
- `self-tacking-track-full.jpg`: the whole self-tacking track across the deck in front of the mast, car at the port end with the jib sheet; lines from the mast foot running aft in channels on both sides. (Boom lettering and sprayhood windows blurred.)
- `foredeck-self-tacking-track.jpg`: straight self-tacking track in front of the mast; jib sheet with two parts from the clew to the car; furled jib.
- `bow-jib-furler.jpg`: Seldén Furlex 404S furler drum, anchor roller and chain, windlass, cleats.
- `side-deck-jib-roll.jpg`: port side deck, JIB ROLL clutch, furling line led forward along the stanchion bases.
- `mast-spreaders.jpg`: two swept-back spreader sets.
- `cockpit-winch-clutches.jpg`: starboard helm: one Lewmar winch, clutch bank in front of it, lines arriving in a covered channel, compass, autopilot control (instrument screen blurred).

### Same rope, different names (key teaching point)

| One thing | Names you will meet |
|---|---|
| Jib sheet | "Genoa sheet" (our clutch label), headsail sheet, стаксель-шкот |
| Mainsheet | "Main sheet" and "MAIN SHEET" (two clutches, **one rope, two ends**), гика-шкот, грота-шкот |
| Vang | kicker, kicking strap, boom vang, оттяжка гика, кикер |
| Topping lift | "Boom lift" (our label), топенант |
| Outhaul | "Main outhaul", аутхол |
| Gennaker halyard | "SPI HALYARD", spinnaker halyard |

## 5. Assumptions (safe to tune)

| Assumption | Value used | Status |
|---|---|---|
| Bank sides | A starboard, B port | **Confirmed** by the owner |
| JIB ROLL clutch | port side deck, x ≈ −3.4 | Side **confirmed** by photo; position estimated |
| Mainsheet purchase | 2 parts per side | **Confirmed** by photo |
| Vang type | rigid strut with tackle | **Confirmed** by photo |
| Self-tacking track | straight, ±1.4 m | Shape **confirmed** by photo; length estimated from the photo (±0.3 m) |
| Which "Main furling" clutch furls and which unfurls | left (slot 2) furls, right (slot 3) unfurls | **Confirmed** by the owner |
| Boom maximum swing | 72° | Computed from the manual's chainplate position |
| Spreader length and sweep | 2.25 m / 1.70 m, 24° back | **From the manual** |
| Cockpit sole height, wheel size | 1.0 m above waterline, 1.0 m wheel | Assumption, not important |
| Topping lift exit height | y = 21.86 | Line confirmed by photo; height estimated near the masthead |
| Mast section | 0.30 × 0.18 m | Assumption, not important |
| Coachroof width near the mast | half-width about 1.45 m (`deck.coachroof.maxHalfWidth`), tapering to the drawing's 1.15 m at the aft end | Photo estimate (`self-tacking-track-full.jpg`); the deck-plan drawing showed 1.15 m all along |
| Hull cross-section shape | superellipse, exponent 2.5, between the keel line and the deck edge (`modelDetail.hullSectionExponent`) | Not important; a photo of the hull out of the water would help |
| Keel line (hull bottom on the centreline) | parabola from the deepest point (−0.65 m at x = −1.0) to the waterline ends, then straight up to the transom | Not important |
| Sizes of small parts in the 3D model | `modelDetail` in the data file: boom section 0.24 × 0.14 m, keel fin 0.20 m and bulb 0.55 m wide, rudder 0.09 m thick with 20 % balance, winch drum 0.26 m, clutch bank 0.44 × 0.20 m, coaming 0.55 m wide, wires drawn 5 cm thick, vang strut tubes 8 and 5.5 cm, three boom blocks 0.35 m apart, and similar | Not important: chosen to look right and be tappable on a phone; they do not affect the rig solver |
| Sprayhood | on the coachroof's aft end, x = −3.05 … −1.75, half-width 1.05, 0.75 m high (`modelDetail.sprayhood`) | Estimated from photos |
| Turning blocks at the mast foot | 8 blocks in a ring of radius 0.30 m around the mast (`modelDetail.mastBaseTurningBlocks`) | Count and size estimated from photos |
| Lifelines | stanchions every ~2.1 m along both deck edges from x = −8.2 to +5.4, 0.65 m high, wires at 0.65 and 0.33 m (`modelDetail.lifelines`) | Estimated from photos |
| Clutch height | the data's y is approximate; the model stands each clutch on the coaming top (banks A and B) or the deck (JIB ROLL) | Not important |
| Vang tackle purchase | 4 parts (`rig.vang.tacklePurchase`) | **Assumption**: only changes the "metres paid out" shown for the vang (about 1.0 m from fully hauled to fully eased). Fits the manual's 15 m vang rope: 4 parts of about 1.9 m plus about 7.5 m of lead to the clutch |
| Main furling line travel | 8 m of line pass the clutch between fully furled and fully out (`rig.mainFurlingGearbox.lineTravelM`; about 20 turns of a 0.13 m drum) | **Assumption**: only changes the "metres paid out" shown for the two furling tails. The manual's table has no main furling line (its 45 m "Vorläufer" is probably the jib's), so there is no total length to cap it |
| Boom pitch limits from the topping lift | hauled +4°, eased −2° (`rig.boom.pitch.toppingLiftHauledDeg` / `toppingLiftEasedDeg`). +4° is below the vang's default limit, so at default settings a hauled topping lift visibly carries the boom; −2° is where the rigid vang strut stops the boom drooping, so a fully hauled main sheet cannot pull the boom end far down | **Assumption**, approved by the owner (M2 review) |
| Paid-out cap | every "metres paid out" value is capped at the rope's total length from `runningRigging` (main sheet 50 m, vang 15 m, outhaul 16 m, topping lift 49 m) | From the manual; with the current geometry no value comes near its cap |
| Outhaul | block on the boom 6.20 m from the gooseneck; 1 m of outhaul moves the clew 1 m (`rig.outhaul`) | Two lines on top of the boom **confirmed** by photo; block position and purchase estimated |
| Control-line lead from the mast foot to the clutches | waypoints in `rig.lineLead` | Channels **confirmed** by photo; exact path estimated, only affects the drawing |
| Rope and sail drawing details | vang tackle drawn 7 cm beside the strut, outhaul parts 6 cm apart, masthead wind indicator 0.6 m long, 0.15 m above the mast (`modelDetail`) | Not important |

## 6. Open questions for the skipper / next time aboard

1. When unfurling, is the outhaul hauled together with the "out" furling line, or only tensioned at the end?
2. What does the red button on the engine lever do? (Typically: disengage the gear to rev in neutral; confirm.)
3. Is the topping lift ("Boom lift") normally eased while sailing, given the rigid vang holds the boom up?
4. How many parts does the vang tackle have (count the rope parts between the two blocks on the strut)?
5. Roughly how much main furling line comes out of the "in" clutch when the main goes from fully furled to fully out (a guess in metres is fine)?
6. How does the outhaul run along the boom? The app draws it from the clew aft to a block near the boom end and back forward to the mast. With the sail furled that path alone is about 21 m, but the manual lists a 16 m outhaul, so the real route (or the table entry) must differ. A photo of the boom end and the outhaul exit at the mast would settle it.

Answered from the October photos and the owner: two-line main furling (right clutch unfurls), straight track, single forestay, straight self-tacking track about 2.8 m long, one winch per side, rigid vang, topping lift line exists, bank sides.

### Photo checklist (if you are near a Hanse 508 again)

The foredeck from above · the mainsheet from the boom to the deck, both sides · the cockpit from above showing which rope goes to which winch · the furling drum at the bow · the boom: vang, topping lift and outhaul exit · the wind instrument while sailing · the telltales on the sails · the builder's plate.
