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
| Winches | 2 × Lewmar self-tailing, **electric** (push button; owner), size about 55 per the brochure, **one per side** next to the wheel, with the clutch bank just in front of it. No secondary winches. Port winch takes bank B and JIB ROLL, starboard winch bank A, one rope at a time. Each side's ropes go to that side's winch (owner). One winch handle on board, used mainly at the mast furling gearbox (IN/OUT switch) to roll the main in by hand when the furling line slips; the model on the drum is not marked (owner), so the EVO 55 power ratios 13.8 / 54 are a stand-in. | Brochure; photo `cockpit-winch-clutches.jpg`; ratios: PHYSICS_TRUTHS source [7] |
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
| Outhaul | one part (1:1) from the clew aft along the top of the boom to a sheave 6.20 m from the gooseneck, forward inside the boom (not drawn), out at the gooseneck, down the mast. **Route and purchase unconfirmed.** The manual says 16 m of rope; this route needs about 21 m with the sail furled (see section 5 and open question 6) |
| Control-line lead (M3b) | each line leaves the mast (topping lift, jib sheet: through the mast wall; outhaul: straight down behind the mast from the gooseneck; furling tails: off the drum under the gearbox) and drops at about 77.5° to its own turning block on a ring of radius 0.30 m around the mast foot (`rig.lineLead.lines`: block angle and exit point per line). From the block it runs flat aft into a covered channel on its side (`rig.lineLead.channel.path`: from x = −0.70, z = ±0.80 on the coachroof to its aft end at z = ±1.02, down onto the coaming at x ≈ −3.8, z = ±1.59, and along it to x = −6.30), one lane per clutch slot 4.5 cm apart, then into its clutch. The main sheet ends first go forward from the deck blocks to the innermost turning blocks (manual lead plan). **All points are estimates** |
| Coachroof | x = −3.05 … +2.00, top y = 1.96 (manual). Half-width 1.15 at the aft end (drawing), widening to about 1.45 at the mast (**photo estimate**: the self-tacking track ends at the edges of the raised deck in front of the mast) and staying that wide to x = 1.20; front corners cut to half-width 0.92 at x = 2.00; front face slopes back to x = 1.60 at the top (from the reference sketches) |
| Self-tacking track | straight, about 0.28 m in front of the mast, about 2.8 m end to end (photo estimate; the drawing suggested 1.8 m). The jib sheet's block on the car is taken 0.125 m above the track (`sheetBlockHeight`, **assumption**) |
| Jib | tack (6.23, 1.89), head (0.20, 20.52), luff 19.58 m, LP 5.26 m (manual); clew about 0.6 m forward of the mast, 2.3 m above the waterline. Fully hauled, the jib sits about 14° out with the car just at the end of the track (clew about 0.53 m from the car's sheet block, ℓ_hauled); the fully eased sheet (1.4 m beyond that, `sheet.maxEaseBeyondHauled`) lets it out to about 31° |
| Wheels | x = −7.20, z = ±0.88 |
| Winches | x = −7.25, z = ±1.60 (the drawing also shows optional winches at x = −6.33; not on the reference boat) |
| Clutch banks | x = −6.70, z = ±1.59, just forward of each winch |
| JIB ROLL clutch | port side deck next to the sprayhood, about x = −3.4 (estimated). M3b: the line continues past it aft along the side deck (z = −2.05), over the coaming outboard of clutch bank B, onto the port winch from forward on its inboard side, two turns clockwise and into the self-tailer (`cockpitHardware.jibRollClutch.leadToWinch`, estimate) |

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
| Winch turns (Realistic mode) | about 4 turns to winch under load, about 2 to ease under control | **Owner's experience** (2026-10-09); matches the capstan rule (PHYSICS_TRUTHS PT-16) |
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
| Sprayhood | M3b: just aft of the mainsheet deck blocks, x = −3.20 … −4.45, over the companionway and the front of the cockpit; its side edges rest on the line channels (half-width 1.0 at the front, 1.59 aft), its front edge at coachroof height, crown 0.76 m above the coachroof, front sloping up over 0.6 m, open at the back (`modelDetail.sprayhood`). Before M3b it sat on the coachroof (x = −3.05 … −1.75), where the main sheet passed through it | **Estimate.** Photo `mainsheet-german.jpg` shows the deck blocks just in front of the hood's front edge; `side-deck-jib-roll.jpg` shows the hood beside the JIB ROLL clutch. Length and shape not measured |
| Turning blocks at the mast foot | one block per line (10, including the two halyards) on a ring of radius 0.30 m, at angles from straight aft chosen so the lines do not cross on the way to the channels (`rig.lineLead.lines`); the port main sheet tail and the vang swap lanes inside the covered channel | **Assumption** (photos show a ring of about 8–10 blocks on the aft half of the mast foot) |
| Line exits on the mast | heights chosen so each line drops to its block at about 77.5° from horizontal (75–80°, owner, matches `mast-base-turning-blocks.jpg`): topping lift y = 2.77, jib sheet 2.82, outhaul 2.20 (behind the mast, port of the gearbox), furling tails 2.38 (drum) | **Assumption** |
| Line channels | covered channels 0.30 m wide, 7.5 cm high, path in `rig.lineLead.channel` | Channels **confirmed** by photo; path and size estimated |
| Main furling gearbox | on the mast's aft face under the sail slot, a little to port, y = 2.50 (`rig.mainFurlingGearbox.position`) | Photo `mast-furling-gearbox.jpg` shows the slot above it; side and height **estimated**. From straight above the boom now hides it |
| Jib sheet into the mast | from the car to a sheave on the mast front about 0.6 m above the deck (y = 2.60), down inside the mast, out on its starboard side | Photo `foredeck-self-tacking-track.jpg`; height **estimated** |
| Side decks | teak (owner request, M3b) | The side-deck photo (`side-deck-jib-roll.jpg`) shows white non-slip on the reference boat: see open question 8 |
| Look of the 3D model (M3b) | gelcoat hull with anti-fouling below the waterline and a thin dark boot stripe, teak cockpit sole and aft platform, non-slip foredeck and coachroof top, silver anodised mast and boom, dark spreaders, black clutches and winch drums with chrome tops, sailcloth panels 0.95 m high, mainsail grid 16 × 12 with one column following the cap shroud and 2 cm kept clear of the rig (`modelDetail.sail*`, `visual.mainSail`) | Not important: chosen from the photos to look right |
| Lifelines | stanchions every ~2.1 m along both deck edges from x = −8.2 to +5.4, 0.65 m high, wires at 0.65 and 0.33 m (`modelDetail.lifelines`) | Estimated from photos |
| Clutch height | the data's y is approximate; the model stands each clutch on the coaming top (banks A and B) or the deck (JIB ROLL) | Not important |
| Clutch types | the two halyard clutches (Main halyard, SPI HALYARD) are a bigger type with a lever; the others are the compact type with a white sticker (`clutchPanel.largeClutchRopes`). Only used by the Ropes-tab drawing | **Photo** (`clutch-bank-a.jpg`, `clutch-bank-b.jpg`) |
| Wheel and rudder sign | + rudder = back edge to starboard, wheel turned clockwise, boat would turn to starboard (`steering.rudderSign`); 2.5 wheel turns lock to lock (`cockpitHardware.wheelTurnsLockToLock`) | Sign: general (wheel steering). Turns: **assumption** |
| Vang tackle purchase | 4 parts (`rig.vang.tacklePurchase`) | **Assumption**: only changes the "metres paid out" shown for the vang (about 1.0 m from fully hauled to fully eased). Fits the manual's 15 m vang rope: 4 parts of about 1.9 m plus about 7.5 m of lead to the clutch |
| Main furling line travel | 8 m of line pass the clutch between fully furled and fully out (`rig.mainFurlingGearbox.lineTravelM`; about 20 turns of a 0.13 m drum) | **Assumption**: only changes the "metres paid out" shown for the two furling tails. The manual's table has no main furling line (its 45 m "Vorläufer" is probably the jib's), so there is no total length to cap it |
| Boom pitch limits from the topping lift | hauled +4°, eased −6° (`rig.boom.pitch.toppingLiftHauledDeg` / `toppingLiftEasedDeg`). +4° is below the vang's default limit, so at default settings a hauled topping lift visibly carries the boom | **Assumption**, approved by the owner (M2 review) |
| Rigid vang strut stop | −2° (`rig.vang.strutStopDeg`): the strut stops the boom drooping more than about 2° below level, so a fully hauled main sheet cannot pull the boom end far down. The boom's lowest pitch is max(topping-lift limit, strut stop), so a topping lift eased past about 60 % hangs slack with spare rope while the strut carries the boom | **Assumption**, approved by the owner (after M2: separated from the topping lift's eased limit) |
| Paid-out cap | every "metres paid out" value is capped at the rope's total length from `runningRigging` (main sheet 50 m, vang 15 m, outhaul 16 m, topping lift 49 m, jib sheet 40 m, jib furling line 45 m) | From the manual; with the current geometry no value comes near its cap (the released jib sheet of a rolled-up jib shows about 11 m) |
| Outhaul | 1:1, one part along the top of the boom from the clew to a sheave 6.20 m from the gooseneck, back inside the boom to the mast; 1 m of outhaul moves the clew 1 m (`rig.outhaul`) | **Route and purchase unconfirmed** (owner decisions after M2 and M3: keep this mechanically valid route). The manual says 16 m of rope; this route needs about 21 m. The photo (`mast-gooseneck-vang-outhaul.jpg`) shows two lines at the clew, which could mean 2:1. Sheave position estimated. The owner will try to photograph the boom end |
| Jib sheet block on the car | 0.125 m above the track (`rig.selfTackingTrack.sheetBlockHeight`); the 3D car is drawn up to this point, so the drawing and the sheet maths use one value | **Assumption** |
| Fully hauled jib | the jib about 14° out with the car just at the end of the track; `sheet.maxEaseBeyondHauled` 1.4 m to fully eased (about 31°) | **Assumption** after the M3 review (on self-tacking jibs the track's ends set how far in the jib can be pulled) |
| Jib sheet released at 100 % | at `sails.jib.sheet.releasedAtPct` (100 %) the jib sheet runs out as far as furling needs, so the jib rolls away completely, keeping its angle and flapping; below it, furling stops where the sheet is too short | **Owner decision** after M3, refined in the M3 review (teaching approximation; on the boat the clutch is opened and the sheet runs) |
| Jib furling line travel | 12 m of line pass the JIB ROLL clutch between fully furled and fully out (`rig.jibFurler.lineTravelM`) | **Assumption**: only changes the "metres paid out" shown for the jib furling line; capped at the 45 m "Vorläufer" |
| Control-line lead from the mast foot to the clutches | waypoints in `rig.lineLead` | Channels **confirmed** by photo; exact path estimated, only affects the drawing |
| Rope and sail drawing details | vang tackle drawn 7 cm beside the strut, outhaul parts 6 cm apart, masthead wind indicator 0.6 m long, 0.15 m above the mast (`modelDetail`) | Not important |
| Realistic mode: stations and clutch keys | Port station = bank B + JIB ROLL + port winch; Starboard = bank A + starboard winch; Helm = the wheel (`realisticMode.stations`). Clutch keys for links: bank key + slot (`a`, `b`, `r` in `cockpitHardware`) | Which rope goes to which winch: **owner** (2026-10-09). Keys: naming only |
| Realistic mode: capstan rule | friction μ = 0.2, hand on the tail 150 N, self-tailer grip 200 N (100 N until the owner's answers after M4c: the jaw holds at least as well as a hand), pulling in by hand without a winch up to 300 N, up to 5 turns (`realisticMode.capstan`) | μ from PHYSICS_TRUTHS [4]; the forces are **assumptions** from PHASE1_SPEC 7.2.2; the owner accepted the 200 N self-tailer grip after M4c as a starting value, to be made configurable later |
| Realistic mode: smooth easing | easing by hand is smooth while the hand still feels at least 30 N (load ÷ capstan factor); below that the rope eases in jerks (`capstan.smoothEaseMinTailN`) | **Assumption**, chosen so 2 turns ease smoothly and 4 turns jerk on a loaded jib sheet (owner's experience: about 2 turns to ease) |
| Realistic mode: sheet loads | rule of PHYSICS_TRUTHS [8] on the official sail areas (main 61 m², jib 51.5 m²), times the sail's fill and how much of it is out; per tail divided by the purchase (jib sheet 2, main sheet 2 × partsPerSide = 4). A slack sheet carries nothing | Rule: source [8], applied to the main as the spec asks; the main-sheet division by 4 is an **assumption** (both tails held) |
| Realistic mode: fixed loads | vang 400 N and topping lift 250 N while taut; furling lines 200 N (main "in" tail) and 250 N (JIB ROLL) while the wind blows; outhaul 150 N to haul; a fighting rope, a rope hauled to its end or a blocked furl 12 kN (`realisticMode.loads`) | **Assumptions** ("small fixed loads", PHASE1_SPEC 7.2.2); 12 kN is simply more than the winch's cut-out |
| Realistic mode: running ropes | friction 40 N; speed 6 m/s × min(1, (excess ÷ 1000 N)²) (`realisticMode.running`): the jib sheet at 20 kn runs out in well under a second, the main sheet flies out in about a second, at 4 kn hardly anything moves | **Assumption**, tuned to PT-18 |
| Realistic mode: electric winch | 0.4 m/s (24 m/min) with no load, slowing to 30 % of that at the cut-out, cut-out at 7 kN on the tail, restart below 85 % of it; drum spin-up 0.25 s (drawing only) (`realisticMode.electricWinch`) | Behaviour from PHYSICS_TRUTHS [9]; **all values are assumptions**: the winch on the boat is not marked (owner) and the numbers were not found for a size-55 electric winch |
| Realistic mode: hand | easing up to 0.6 m/s, pulling in by hand 0.3 m/s, jerky easing moves 30 % of every 0.6 s, the Ease button lets out 0.25 m per step; the hand lets out at most 2 m ahead of the rope, and in the station drawing 1 unit of tail pulled away lets out 0.012 m (`realisticMode.hand`; the last two moved from the code in M4c, M4b review) | **Assumption**, only changes how fast things look |
| Realistic mode: winch handle (M4c) | one handle (owner), kept at the Port station (`winchHandle.startStation`, **owner**); 10-inch (0.254 m) handle; power ratios 13.8 clockwise (1st gear) and 54 anticlockwise (2nd gear); a person pushes at most 250 N and cranks at most 1.2 turns a second with no load, slower in proportion to the force (`realisticMode.winchHandle`) | Count: **owner**. Ratios: Lewmar EVO 55 (PHYSICS_TRUTHS [7]) as a **stand-in**, the winch is not marked. Clockwise is 1st gear: **owner**. Length, force and speed: **assumptions** |
| Realistic mode: strain bar (M4c) | shown while a winch works: the motor's load against its 7 kN cut-out, or the handle force against 250 N; orange from 80 % (`realisticMode.strain.warnFraction`), red at the limit | **Assumption** (display only) |
| Realistic mode: mast furling gearbox (M4c) | IN/OUT switch, a toggle: IN to the left, OUT to the right (`switchPositions`), starting on OUT; a winch-handle socket; about 40 handle turns from fully out to fully in (`handleTurnsFullFurl`, adjustable), so about 0.2 m of furling line per turn and a power ratio of about 8; cranking either way turns the mandrel the way the switch says (`realisticMode.mastGearbox`) | Gearbox, switch and socket: **photo** `mast-furling-gearbox.jpg` and **owner**. Toggle sides and 40 turns: **owner** (after M4c). Cranking either way drives the mandrel: **owner** (after M4c). Start position: **assumption** (open question 12) |
| Realistic mode: furling a loaded main (M4c) | hauling the "in" furling tail, or cranking the gearbox IN, feels 15 % of the main's sheet-rule load on top of its own (`realisticMode.loads.mainFurlSailLoadFraction`): about 1.0 kN with the main full at 20 kn (one turn on the winch slips, two hold; raised from 10 % when the self-tailer grip went up to 200 N), nothing when the main luffs | **Assumption** (the owner accepted 15 % after M4c as a starting value, to be made configurable later), chosen so the spec's scenario (the furling line slips with too few turns) can happen; matches the usual advice to luff before furling |
| Realistic mode: practice scenario (M4c) | "the main furling line slips": a link in `realisticMode.scenarios` (wind 60° at 20 kn, main sheet 30 %, the "in" tail on the starboard winch with 1 turn, "out" tail and outhaul open) | Teaching scenario (PHASE1_SPEC 7.2.2), not from the boat |

## 6. Open questions for the skipper / next time aboard

1. When unfurling, is the outhaul hauled together with the "out" furling line, or only tensioned at the end?
2. What does the red button on the engine lever do? (Typically: disengage the gear to rev in neutral; confirm.)
3. Is the topping lift ("Boom lift") normally eased while sailing, given the rigid vang holds the boom up?
4. How many parts does the vang tackle have (count the rope parts between the two blocks on the strut)?
5. Roughly how much main furling line comes out of the "in" clutch when the main goes from fully furled to fully out (a guess in metres is fine)?
6. How does the outhaul run along the boom, and how many parts does it have at the clew? Since M3 the app draws one part (1:1) from the clew aft to a sheave at the boom end, then inside the boom forward to the mast (owner decision). Any route that pulls the clew aft from the cockpit still needs about 21 m of rope with the sail furled (clew to boom end 6.2 m, back along the boom 6.2 m, mast and lead to the clutch about 8.3 m), more than the manual's 16 m, so the real route (or the table entry) must differ. A photo of the boom end and the outhaul exit at the mast would settle it.
7. When furling the jib on the boat, is the jib sheet's clutch simply opened so the sheet runs out? (The app now treats 100 % jib sheet as "released" for furling, owner decision after M3; rolling the jib needs about 5.7 m more working length, about 11 m of rope at 2:1.)
8. Side decks: teak or white non-slip? The owner asked for teak in M3b; the side-deck photo looks like white non-slip. Where exactly does the sprayhood start and end (fore and aft), and does the main sheet pass in front of it?
9. Where exactly do the control-line channels run on the coachroof and into the cockpit, and how high does each line leave the mast?
10. Bow and stern thrusters (owner: one at each end): what is the control at the helm (joystick, two buttons, toggle)? A photo would settle it; power unknown.
11. Roughly how fast does the electric winch pull with no load, and at what load does it stop (if the manual or a label says)? M4b draws one button beside each winch (owner: one button per winch) and uses 24 m/min and 7 kN as guesses.
12. The mast furling gearbox (M4c): which way does the IN/OUT switch stand while sailing, and does cranking the handle either way turn the sail, or only one way? Is the handle 8 or 10 inches long? (Answered after M4c: cranking either way turns the sail; about 40 turns for a full furl; the switch is a toggle, IN left, OUT right; the handle is kept at the port side; clockwise is 1st gear.)

Answered from the October photos and the owner: two-line main furling (right clutch unfurls), straight track, single forestay, straight self-tacking track about 2.8 m long, one winch per side, rigid vang, topping lift line exists, bank sides. 2026-10-09: winches are electric; one winch handle, used mainly at the mast gearbox; each side's ropes go to that side's winch; winch model not marked (Lewmar only); one button per electric winch; bow and stern thrusters fitted. After M4c: the winch handle is kept at the port side; about 40 handle turns roll the main in at the gearbox; the gearbox switch is a toggle, IN left, OUT right; clockwise is 1st gear on the winch.

### Photo checklist (if you are near a Hanse 508 again)

The foredeck from above · the mainsheet from the boom to the deck, both sides · the cockpit from above showing which rope goes to which winch · the furling drum at the bow · the boom: vang, topping lift and outhaul exit · the wind instrument while sailing · the telltales on the sails · the builder's plate.
