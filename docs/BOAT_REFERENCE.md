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
| Foredeck | Anchor windlass, bow roller with chain, mooring cleats (drawn in Phase 6, working in Phase 7; renumbered 2026-10-14) | Photo `bow-jib-furler.jpg` |

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

`npm run shots` also renders the 3D model at the sketches' scale with the sketch laid on top (`shots/compare-*-model-vs-sketch.png`), to check the proportions.

## 4. Ropes, clutches and controls

Photos: [`reference/photos/`](reference/photos). Russian names are AI drafts until a sailor checks them.

### Clutch bank A: **starboard** side (confirmed by the owner). Photo: `clutch-bank-a.jpg`

| Slot | Label on the boat | What it is | Russian (draft) | App control |
|---|---|---|---|---|
| 1 | Main sheet | Mainsheet, starboard end | гика-шкот | `ctl_mainsheet` |
| 2 | Main furling (left) | Furling line: this tail rolls the main **in** | линь закрутки грота | `ctl_main_furl` |
| 3 | Main furling (right) | Furling line: this tail rolls the main **out** (confirmed by the owner) | линь закрутки грота | `ctl_main_furl` |
| 4 | Main halyard | Main halyard, stays up with in-mast furling | грота-фал | static |
| 5 | Genoa sheet | **Jib sheet** of the self-tacking jib | стаксель-шкот | `ctl_jib_sheet` |

### Clutch bank B: **port** side (confirmed by the owner). Photo: `clutch-bank-b.jpg`

| Slot | Label on the boat | What it is | Russian (draft) | App control |
|---|---|---|---|---|
| 1 | SPI HALYARD | Gennaker/spinnaker halyard, parked | фал геннакера / спинакер-фал | static |
| 2 | Boom lift | Topping lift | топенант гика | `ctl_topping_lift` |
| 3 | Main outhaul | Outhaul: pulls the sail out along the top of the boom; hauled with the "out" furling tail | оттяжка шкотового угла | `ctl_main_furl` (coupled) |
| 4 | MAIN SHEET | Mainsheet, port end | гика-шкот | `ctl_mainsheet` |
| 5 | Vang | Vang tackle on the rigid vang strut | оттяжка гика | `ctl_vang` |

### Single clutch on the **port** side deck. Photos: `jib-roll-clutch.jpg`, `side-deck-jib-roll.jpg`

| Label | What it is | Russian (draft) | App control |
|---|---|---|---|
| JIB ROLL | Jib furling line | линь закрутки стакселя | `ctl_jib_furl` |

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
- **Shared in the `/plan 6` chat (2026-10-15), not yet in the repo** (the planning PR asks the owner to upload them under these names): `side-at-anchor-fenders.jpg` (port side at anchor, three dark fenders hanging, chain from the bow, bathing platform down), `helm-port-winch.jpg` (port coaming from the helm: winch, clutch bank, covered channel, tail box lid, a rope coiled on the side deck), `side-view-anchored.jpg` (the whole boat from the side), `side-deck-port-forward.jpg` (port side deck looking forward: toerail, chainplates, a cleat behind the shrouds, coachroof windows), `coachroof-aft-view-port.jpg` and `coachroof-aft-view-starboard.jpg` (from the mast looking aft: coachroof, line channels under the sprayhood, side decks), `cleat-closeup.jpg` (an open-base horn cleat on the raised toerail), `helm-port-engine.jpg` (port helm: wheel, engine lever, mooring lines coiled on the pushpit).

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
| Line exits on the mast | heights chosen so each line drops to its block at about 77.5° from horizontal (75–80°, owner, matches `mast-base-turning-blocks.jpg`): topping lift y = 2.77, jib sheet 2.82, outhaul 2.20 (behind the mast, port of the gearbox), furling tails 2.38 (drum); M5: main halyard 2.87 (starboard side), gennaker halyard 2.94 (port side) | **Assumption** |
| Halyards in 3D (M5) | Main halyard: only its tail is drawn (inside the mast with in-mast furling). Gennaker halyard: parked, from the mast front at y = 21.3 (above the forestay) straight down the front of the mast, 6 cm to port of the centreline, to its shackle at the mast foot (y = 2.12); its tail from the mast foot to "SPI HALYARD" (`rig.lineLead.lines`: `exit`, `parked`) | **Assumption**: where the gennaker halyard leaves the mast and where its end is parked is not known (open question 13) |
| Rope tail boxes (M5, redrawn in M34) | one box on each side behind the winch where the rope ends are stored (**owner**, PR #19). **M34 (owner, PR #81, photo from the helm):** a solid block as wide as the coaming under the winch (0.55 m), flush with the coaming top, from a **30 cm gap** behind the coaming's end to the transom (0.85 m long, `cockpitHardware.ropeBins`, `modelDetail.ropeBin`); the coaming ends 4.4 cm behind the winch's base; the cockpit floor is flat to the transom (no raised aft deck any more) and the stern is open above it (owner, PR #81). Every tail runs past the drum on its inboard side, drops into the gap and goes in through a dark entry on the box's front face | Box and gap: **owner**. Sizes: **estimate** (gap 30 cm: owner's choice) |
| Ropes on the winches in 3D (M5, changed in M34) | Realistic mode (Easy mode: nothing on the winches, owner PR #19): from the clutch's aft face onto the drum, turns one thin rope's width apart from 6 to 17 cm above the winch's base. **M34 (owner, PR #81):** whatever the number of turns, the rope's end (through the self-tailer's jaw if it is in it) leaves the drum and lies as a short straight loose end, 0.4 m long, on top of the rope box; a rope held in the hand (no turns) runs past the winch, across the gap and ends in a flat 2-turn coil on the box, in its own colour (`modelDetail.winchRope`, `ropeBin.inHandCoil`) | **Owner** (what it looks like); sizes: **assumptions**. Drawing only |
| Labels in 3D (M5) | each label's point on the boat (`visual.labels3d`): fixed points for the mast, stays, keel, rudder, track, furler and gearbox; the middle of each sail; a point along the boom and along each rope; above each winch, wheel and clutch bank | Not important: chosen to sit on or next to each part |
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
| Physics: constants (M6) | air 1.225 kg/m³, sea water 1025 kg/m³, g 9.81 m/s², viscosity 1.19e-6 m²/s, 1 kn = 0.514444 m/s (`physics.constants`) | Standard values (sea water about 15 °C); 1 kn = 1852 m / 3600 s |
| Physics: integration (M6) | boat physics in substeps of at most 0.05 s; the rig solver is fed the apparent wind rounded to 0.1° and 0.05 kn so its cache works (`physics.integration`) | **Assumption** (numerics only) |
| Physics: mass (M6) | 14,739 kg light craft (manual) + 1,000 kg crew, water, fuel and gear = 15,739 kg; the water dragged along adds 5 % when accelerating (`physics.mass`) | Payload and 5 %: **assumptions** |
| Physics: wetted surface (M6) | 48 m²: canoe body about 37 m², keel about 9 m², rudder about 2 m² (`physics.hull.wettedSurfaceM2`) | **Assumption** (no figure in the manual) |
| Physics: friction (M6) | friction line Cf = 0.075 / (log10 Re − 2)², Reynolds length 0.7 × LWL, form factor 0.1 (`physics.hull.frictionLengthFraction`, `formFactor`) | **Assumptions** (standard textbook friction line; the two factors are guesses) |
| Physics: linear drag (M6) | 80 N per m/s (`physics.hull.linearDragNPerMps`) | **Assumption**: the one tuning term for low speeds (appendage and misc. drag) |
| Physics: wave-making and hull speed (M6) | wave resistance as a fraction of the boat's weight against Froude number, table `physics.hull.residuaryPerWeightByFroude`: steep rise from 0.4 (8.9 kn): at 10 kn 9.5 kN, 2 × the 8.9 kn value (PT-36) | **Assumption**: shape after typical sailing-yacht hull series, tuned so full sail in 30 kn gives at most about 10.6 kn. The 8.9 kn rule of thumb is source [18] of PHYSICS_TRUTHS (to read) |
| Physics: induced drag (M6) | side force² / (½ ρ V² π draft²), draft 2.04 m (the manual's 2.40 m is the deepest point), faded out below 2 m/s (`physics.hull.effectiveDraftM`, `inducedMinSpeedMps`) | **Assumption** |
| Physics: centre of lateral resistance (M6) | 1 m below the waterline (`physics.hull.clrDepthM`); used for the heeling moment (computed in M6, used from M8) | **Assumption** |
| Physics: going astern (M6) | resistance 4 × the ahead value (`physics.hull.asternResistanceFactor`) | **Assumption** |
| Physics: rudder (M6) | area 1.5 m², drag coefficient 1.0, drag ½ ρ V² A Cd sin²(angle) (`physics.hull.rudderAreaM2`, `rudderDragCoefficient`) | **Assumption** |
| Physics: windage (M6) | hull and rig air drag: 8 m² × 0.7 (`physics.windage`): with the wind from ahead it pushes the boat back (in irons) | **Assumption** |
| Physics: sail coefficients (M6) | lift and drag against angle of attack, same table for both sails (`physics.sails.liftByAoaDeg`, `dragByAoaDeg`): lift peaks near 20° (1.45), stalls above, pure drag at 90°; a flapping sail drags 0.15 (`floggingDragCoefficient`); both scaled by the solver's fill | **Assumption** (a soft sail's coefficients are not published for this boat) |
| Physics: sail centres of effort (M6) | main: 2/3 of the way up from the gooseneck (about 9.7 m above the waterline); jib: the mean height of tack, head and clew (about 8.2 m); computed from the sail data, not stored | **Assumption** (a third of the way up a triangle) |
| Physics: turning (M6) | yaw rate = speed × tan(rudder) / 16 m, following the wheel with a 1.5 s lag (`physics.steering`); at full wheel (35°) the turning circle is about 46 m across (3 boat lengths) | **Assumption** |
| Physics: autopilot (M6) | PID on the heading error: kp 2.0, kd 5 s, ki 0.15 per s (only within 5° of the target, limited to ±10°), rudder at most 25° and 8°/s; buttons ±1° and ±10° (`physics.autopilot`) | **Assumption**; the real boat has a B&G autopilot (owner, 2026-10-10) whose behaviour is not known |
| Physics: righting moment (M8) | RM(φ) = 98.3 kNm · sin(1.5 φ) / sin 45°, so exactly 98.3 kNm at 30° (manual) and a peak at 60° (`dimensions.rightingMomentKNmAt30Deg`, `physics.heel`) | 98.3 kNm at 30°: manual. **The shape between and beyond is an assumption** (GM about 1.36 m at small angles follows from it) |
| Physics: roll inertia and damping (M8) | gyration radius 0.35 × beam, +20 % for the water dragged along: about 52,000 kg·m²; damping ratio 1.2 of critical (`physics.heel.rollGyrationBeamFraction`, `rollAddedInertiaFraction`, `rollDampingRatio`) | **Assumptions**. The damping ratio was tuned in M8 from the spec's 0.6 to 1.2 (a little over critical: the heel eases to its angle without rocking; with 0.6 the autopilot tack of PT-28 dipped to 1.97 kn) |
| Physics: heel limits (M8) | heel clamps at 60° (`maxHeelDeg`); the "heeling a lot" alert from 25° held for 2 s (`overpoweredHeelDeg`); the round-up test from 25° of heel and 2°/s of turn towards the wind (`roundUpMinHeelDeg`, `roundUpMinYawRateDegS`) | **Assumptions** (teaching thresholds) |
| Physics: heel resistance (M8) | friction and wave resistance grow by 6 % at 20° of heel, with the square of the heel (`physics.heel.resistanceIncreaseAt20Deg`) | **Assumption** |
| Physics: weather helm (M8) | heel turns her to windward like 0.32° of rudder per degree of heel (about 5.4° at 17° of heel) (`physics.heel.weatherHelmDegPerDegHeel`) | **Assumption**; PHYSICS_TRUTHS [16] (to read) is the idea that more than 5–7° of rudder means too much heel. Tuned in M8 from the spec's 0.30 so that the round-up of PT-32 starts (yaw rate above 2°/s: 1.91 → 2.05°/s) |
| Physics: rudder grip (M8) | full grip up to 20° of heel, 0.2 at 40° and more (`physics.heel.rudderGripByHeelDeg`) | **Assumption** (the rudder comes out of the water and stalls) |
| Physics: sheet loads (M8) | jib sheet rope = jib force / 2 (purchase 2:1) × `jibSheetLoadFraction` 1.0; main sheet rope = main force × (foot 6.15 m × furled fraction × 0.333) / 2.925 m (sheet blocks from the mast) / (2 × 2 rope parts) (`physics.loads`) | **Assumptions** (consistent with PHYSICS_TRUTHS [8]). The sail forces come from the apparent wind, so at 20 kn true wind the jib sheet carries about 1.9 kN where the Phase 1 rule gave 2.8 kN (see the M8 note in PHASE2_SPEC) |
| Map: no-go wedge (M7) | ±45° of the true wind, drawn 90 px long on the map (`physics.display.noGoHalfAngleDeg`) | PHYSICS_TRUTHS PT-21 [1]: about 45° either side (30–50° depending on the boat); the drawn wedge is a teaching picture, the model has no hard edge |
| Map: points of sail (M7) | bands of the angle between the bow and the true wind: no-go 0–40°, close-hauled 40–55°, close reach 55–80°, beam reach 80–100°, broad reach 100–150°, run 150–180° (`physics.display.pointsOfSail`); the map labels sit at 45°, 67°, 90°, 125° and 180° | **Assumption**: names after Wikipedia, *Point of sail* [1]; the band edges are teaching choices |
| Map: track (M7) | one point a second, the last 900 kept: 15 minutes of track (`physics.display.trackSampleS`, `trackMaxPoints`) | **Assumption** (a screen limit, not boat data) |
| Wind modes: gusty (M10) | about one event every 45 s on average, alternating a gust and a lull; rise 3 s, hold 4–10 s, fall 5 s; a gust adds 30 % of the mean (10–60 % on the slider) times a random 0.7–1.3, a lull takes away half of that; the sum of overlapping events never goes beyond one event's largest (gust +30 % × 1.3, lull −15 % × 1.3); each gust veers the wind up to 10° clockwise; plus ±5 % slow noise (`windModes.gusty`) | **Assumptions**: a teaching pattern (EXERCISES.md 4), not measured weather. At a 12 kn mean the one-hour peak is 16.5–17.3 kn for every seed 1–200 (owner's cap, 2026-10-12) |
| Wind modes: shifty (M10) | the direction swings ±15° (5–40° on the slider) as the sum of two slow waves (180 s and 67 s, weights 0.6 and 0.4); the speed varies ±5 % (`windModes.shifty`) | **Assumptions** |
| Wind modes: building and dying (M10) | the speed changes by 10 kn (building) or 8 kn (dying), up to 20 kn on the slider, over 10 minutes with a smooth start and end; the wind never goes below 0 or above 40 kn (`windModes.building`, `dying`, `maxTwsKn`) | **Assumptions** |
| Wind modes: GUST badge (M10) | shown in gusty mode while the wind is more than 1.1 × the mean (`windModes.gustBadgeFraction`) | **Assumption** (a display threshold) |
| Wind modes: time bar (M10) | ¼, ½, 1, 2, 4, 8 or 16 (`windModes.timeScales`); the world runs at that speed, the rope and winch physics with it; hand gestures do not | **Assumption** (a teaching convenience; speeds above ×16 are decided in Phase 6) |
| Trim: states (M9) | luffing when the sail's fill is below 0.5 (angle of attack under about 6°); stalled above 25° (just past the peak of the lift table, 20°); apparent wind from 150° (or by the lee) is "pushed (running)" (`physics.trim.luffingBelowFill`, `stallAboveAoaDeg`, `pushedFromAwaDeg`) | **Assumption** (teaching thresholds); PHYSICS_TRUTHS PT-23, candidate sources [13], [14] (to read) |
| Trim: telltales (M9) | three ribbons per face at 25, 50 and 75 % of the sail's height; the windward one lifts where the local angle of attack (angle of attack minus twist × height) is under 6°, the leeward one hangs above 25° (`physics.trim.telltaleHeights`, `telltaleLuffAoaDeg`); drawn 0.35 m × 0.06 m, 0.6 m (main) or 0.8 m (jib) aft of the luff (`SCENE.telltales`) | **Assumption**: the idea (windward lifts when too far out, leeward hangs when too far in) is from the usual telltale advice, [13], [14] (to read); the numbers and the ribbon sizes are teaching choices (the real boat has no telltales marked in the photos) |
| Trim: blanketing (M9) | the jib's area is multiplied by a factor that falls smoothly from 1 at 150° apparent wind angle to 0.15 at 170° and beyond (`physics.trim.blanket`) | **Assumption** (PT-37: on a run the main takes the jib's wind); the real shadow depends on the sail shapes |
| Trim: flogging damage (M9) | a luffing sail wears by (apparent wind / 20 kn)² / 600 per second once the apparent wind is at least 8 kn: 10 minutes at 20 kn, 6.4 minutes at 25 kn, torn at 1; a torn sail gives 40 % of its force (`physics.trim.flogging`) | **Assumption** (PT-38); no figure for a Hanse sail; damage is not in the link |
| Gybe: boom, sail and air mass (M11) | boom 60 kg, mainsail 40 kg, plus the air the sail drags along; moment of inertia about the mast about 2,440 kg·m² (`physics.gybe.boomMassKg`, `sailMassKg`) | **Assumptions**: Seldén B250 boom with fittings about 60 kg, in-mast furling main about 40 kg |
| Gybe: the wind's push (M11) | torque = ½ ρ aws² × main area × 0.6 × (foot/3) × cos²(heel) × a shape factor; air drag on the swinging sail = ½ ρ A × 1.2 × (foot/3)³ × ω² (`physics.gybe.driveCoefficient`, `normalForceCoefficient`, `driveGain`, `driveFloor`, `driveStartFraction`) | **Assumptions**. The shape factor (3.2 × (0.5 + 0.5 × \|sin start angle\|) × (0.3 + 0.7 × the share of the swing done)) is **not in the spec**: the spec's torque alone gave too little energy (about 4.5 kJ against the spec's 8.5–12.5 kJ), so it was added and tuned in the M11 PR. Results at 15 kn apparent wind, main fully out: swing 2.1 s, boom end 17.7 m/s, 9.7 kJ, 12.2 kN in one sheet part; hauled in (±10°): 1.0 kJ, 1.3 kN |
| Gybe: sheet stretch (M11) | the swing stops over 0.4 m of give in the sheet system, so peak load on the boom blocks = 2 × energy / 0.4 m, shared by 4 rope parts (`physics.gybe.sheetStretchM`) | **Assumption** (rope stretch, blocks and deck springs) |
| Gybe: what counts as accidental (M11) | the boom started more than 20° from the middle (`physics.gybe.controlledMaxBoomDeg`); the red sector shows while it crosses and 1.5 s after, the report 8 s, the impact load acts on the winch tail for 0.3 s (`dangerFlashS`, `reportS`, `impactLoadDurationS`) | **Assumptions** (teaching thresholds) |
| Alert history (M36) | keeps the last 50 entries; a warning that comes and goes (by the lee, heeling a lot) is written again only after 5 s; the heel warning shows after 2 s over the limit (`physics.alerts.historyMax`, `repeatGapS`, `overpoweredAfterS`) | **Assumptions** (display and teaching choices, not boat data) |
| Gybe: almost no wind (M13) | a swing that has not finished after 8 s is handed to the normal boom spring with no report; a main out less than 2 % has no sail to push the boom (normal spring); a bump under 50 J is not reported (`physics.gybe.maxSwingS`, `minMainOut`, `minReportJ`) | **Assumptions** (numerics and a display threshold): a gybe in about 2 kn of wind used to jump the last part and report 0.0 kJ |
| Engine: rpm range (M12) | idle 800 rpm, maximum 2,500 rpm (`physics.engine.idleRpm`, `maxRpm`) | Maximum: **photo** (the rpm limit sticker on the engine control, `cockpitHardware.engineControl.rpmLimitSticker`). Idle: **assumption** (typical for a small marine diesel; the real boat's idle is not known) |
| Engine: thrust (M12) | thrust = 6,800 N × (rpm / 2,500)^2.5 in gear, astern 0.55 of that (`physics.engine.maxThrustN`, `thrustExponent`, `asternThrustFactor`) | **Assumptions**, set so that the owner's figures come out: about 3.3 kn at idle, 8 kn at about 1,850 rpm (owner: comfortable cruise 8 kn), about 9.3 kn at 2,500 rpm (owner thinks about 10 kn; an 80 hp engine cannot push this hull much past 9.5 kn, PT-36), about 4.9 kn full astern. Settled values in the M12 tests: 3.26, 7.87, 9.28 and −4.88 kn. The thrust does not fall with boat speed (a real propeller loses thrust as the boat speeds up) |
| Engine: lever and gearbox (M12) | the middle ±10 % of the lever is neutral (rpm stays at idle); the rpm follows the lever with a 1 s lag; going from ahead to astern or back waits 0.5 s in neutral (`physics.engine.neutralBandPct`, `rpmResponseS`, `gearShiftDelayS`) | **Assumptions** (teaching values; the real Allpa control and gearbox timing are not known) |
| Waves: growth (Phase 3, M14) | significant height and peak period from the JONSWAP fetch-limited formulas, capped at a fully developed sea (`waves.growth`); 15 kn over 30 km → 0.68 m every 3.8 s, 20 kn over 150 km → 2.0 m every 7.2 s | **Published formulas** (US Army Corps of Engineers manuals; page not reachable, to-verify); the trend is source-checked (PHYSICS_TRUTHS PT-39) |
| Waves: fetch per setting (Phase 3, M14) | Sheltered 5 km, Coastal 30 km, Open sea 150 km (`content/areas/adriatic.json` `sea.fetchKm`) | **Assumptions** for the Adriatic: a bay or island channel, the coast and outer islands, the open Adriatic (150–200 km wide) |
| Waves: build-up time (Phase 3, M14) | the waves follow the wind with a 3-minute time constant (`waves.buildTimeS` 180) | **Assumption**, much faster than real (hours) for teaching (owner) |
| Waves: trains (Phase 3, M14) | three trains: the main one at the peak period from the wind, two at 0.8 and 0.65 of the period from 25° and −35°, weights 1 / 0.6 / 0.4 (`waves.trains`) | **Assumption** (an irregular-looking sea from a few trains, ROADMAP "clarity over realism") |
| Boat in waves: response (Phase 3, M14) | heave, pitch and roll follow the water sampled at 5 points along the waterline and ±1.9 m across, fully (follow 1), with a 0.5 s lag (`physics.waveResponse`) | **Assumptions**, true to size (owner: not exaggerated) |
| Boat in waves: course push (Phase 3, M15) | 5° of extra rudder per degree of wave roll, × 0.1 (from ahead) … 1 (from 135°, quartering) (`physics.waveFeedback.yawDegPerDegRoll`, `yawFactorByRelDeg`) | **Assumption**, a teaching fit: the autopilot works the wheel about ±5° in Coastal waves from 135° |
| Boat in waves: extra resistance (Phase 3, M15) | 0.0017 × ρw·g·Hs·beam² × 1 (from ahead) … 0.05 (from astern) × min(1, speed / 2 m/s) (`physics.waveFeedback.addedResistance…`) | **Assumption**, a teaching fit: about 4 % slower close-hauled in Coastal waves, about 12 % in the Open sea |
| White horses (Phase 3, M16) | the crest band that may break white: 0 below 7 kn, 2 % of the sea at 10 kn, 6 % at 16 kn, 12 % at 21 kn, 20 % at 27 kn (`waves.whitecaps.coverageByWindKn`); foam shows only in scattered patches about 3 m across (6 m at Low detail) on about a quarter of that band (`patchSizeM`, `patchFrom`, `patchTo`), so the foam seen is about 2 % of the sea at 16 kn, 4 % at 22 kn, 6 % at 27 kn | Onset from the **Beaufort scale** (PHYSICS_TRUTHS [30]); the fractions and the patch size are assumptions. Measured cover is lower: about 1 % at 20 kn and 3 % at 27 kn (Monahan and O'Muircheartaigh 1980, W = 3.84·10⁻⁶ · U₁₀^3.41, from search summaries, to-verify), so the teaching sea shows two to four times more foam so that it can be seen |
| Gust preview (Phase 3, M16) | a gust travels downwind at the mean wind speed; the water shows it up to 300 m upwind (`windModes.gustPreview`) | **Assumption** |
| Practice buoys (Phase 3, M16) | four yellow buoys 200 m north, east, south and west of the start (`content/areas/adriatic.json` `marks`) | **Owner** (Phase 3 plan); not real buoys |
| Sailing area (Phase 3, M14/M17) | Split, 43.508° N 16.44° E; CET/CEST with EU summer time; clock default noon, 1 June 2026 (`content/areas/adriatic.json`) | **Owner** (Split as the reference point; issue #26 default); position read off a map; time zone rule: PHYSICS_TRUTHS [34] |
| Waves: default setting (Phase 3, M14) | links and Reset open on Coastal (`waves.defaultSetting` `coastal`); a state built without a setting is Flat so Phase 1 and 2 tests are unchanged | **Owner** (Phase 3 plan) |
| Frame-rate keys (Phase 3, M19) | `SCENE.performance` in `src/render3d/sceneConfig.ts`: `outerColoursEveryNthFrame` 1, `innerHalfSizeLowM` 100, `fadeStartLowM` 70 (values that change nothing); fallback steps if the owner's phone misses 50 FPS, one per comment: 2 / 80 and 56 / `SCENE.reflections.minIntervalS` 5 | **Assumptions**; the agent cannot measure a phone, the owner measures (WORKFLOW M19): on the owner's phone, heaviest case, 60 FPS and slowest frame 17 ms (PR #51), so the values stay |
| Toerail (Phase 6, M30) | a raised rim along the deck edge, 0.05 m high and 0.05 m wide, from x 5.6 to −8.5 (`deckFittings.toerail`); the lifeline posts stand against its inner side | Rim seen in the owner's cleat photo (planning chat, 2026-10-15); size and ends are **assumptions** |
| Channel fairing (Phase 6, M30) | the rope channel's slope from the coachroof down to the coaming is a solid moulding, the channel's own width, down to the deck (to the cockpit floor where it stands over the cockpit) (`deckFittings.channelFairing`) | Owner's photo from the helm (solid moulding); shape is an **assumption** |
| Anchor and bow roller (Phase 6, M31) | a plough anchor of about 25 kg in its own roller to starboard of the jib furler (channel centre z 0.20 m), shank 1 m, fluke 0.42 m deep (`deckFittings.bowRoller`, `anchor`) | Chain to starboard of the furler in `bow-jib-furler.jpg`; anchor type and sizes are **assumptions** (the photo shows only the chain) |
| Windlass (Phase 6, M31) | vertical windlass in a round recess 0.28 m across, at x 5.40, z 0.20; chain drawn with 45 mm links, larger than a real 10 mm chain so it can be seen (`deckFittings.windlass`, `chain`) | Windlass and recess in `bow-jib-furler.jpg`; position and sizes are **assumptions** |
| Mooring cleats (Phase 6, M32) | six open-base horn cleats, 0.28 m long, on the toerail at x 5.0 (bow), −1.2 (midship, behind the shrouds) and −7.5 (stern), both sides (`deckFittings.cleats`) | Bow cleat in `bow-jib-furler.jpg`, cleat shape and midship cleat in the owner's photos (planning chat); stern position and sizes are **assumptions** |
| Fairleads (Phase 6, M32) | four closed fairleads on the toerail, forward of the bow cleats (x 5.25) and aft of the stern cleats (x −7.95) (`deckFittings.fairleads`) | **Assumption**: no photo shows them |
| Fenders (Phase 6, M33) | eight dark fenders 0.24 m × 0.80 m, four a side at x 3.0, 0.5, −2.5 and −5.5, tops 0.35 m below the deck edge; one ball fender 0.55 m across at the port corner of the stern (x −8.2); all in a locker while sailing (`deckFittings.fenders`, `ballFender`) | **Owner** (four a side, one ball fender behind the helm, kept in a locker); dark fenders along the side in the owner's photo at anchor; sizes, stations and the ball fender's side are **assumptions** |
| Sealed rope ends (Phase 6, M34) | every rope strand ends in a closed, rounded tip (a cap half a rope radius long) instead of an open tube; no taper | Drawing only; **assumption** (looks) |
| Rope on the winch drums (Phase 6, M34) | on a drum the rope is drawn 1.1 cm in radius (`modelDetail.winchRope.drumRenderRadius`) so 5 turns fill the drum from 6 to 17 cm above its base; the ropes across the boat keep 2.5 cm so they can be seen from afar. The drum is drawn waisted, so the thin turns stand a few millimetres off its waist and the top turns touch the self-tailer's ring (accepted) | Drawing only; **assumption** |
| Lines not in use (Phase 6, M34) | every line that is not on a winch or in the hand ends inside its box, out of sight (owner, PR #81) | **Owner** |
| Backstay (M34, owner on PR #81) | one backstay from the masthead down to a block two thirds of the way down (x −5.52, y 8.25 on the centreline, on the line to the old lower end), then two ends in a V down into the top of the two rope boxes, ending inside them 0.15 m in front of their aft face and 0.1 m below their top (`rig.backstay.block`, `legDropM`, `legInsetM`). Before M34 a single stay ended in the air at x −8.2, y 1.4 where the raised aft deck used to be | **Owner** (block and V); the block's height and the V are **estimates**; whether the reference boat's backstay is split is unknown |

| Phase 7: slow-speed handling (M40, built) | turning point 1 m aft of the mast; the rudder's grip fades in from 0 to 1 kn ahead (0 to 5 kn astern); side wind on 32 m² × 1.0 acting 0.3 + 1.2·cos(wind angle) m ahead of the turning point, faded out by 2 kn; underwater side area 14 m² × 1.2; keel lift 9,000 N per (m/s)²; 80 % added mass sideways, radius of gyration 3.9 m, 60 % added inertia (`physics.lowSpeed`) | **Assumptions**, prototyped against the whole test suite: in 15 kn on the beam she drifts at about 0.6 kn, with the wind 45° on the bow the bow falls off about 30° in 30 s |
| Phase 7: prop walk (M40) | going astern the propeller pushes the stern sideways with 20 % of the astern thrust, fading out by 4 kn; **the stern goes to port** (`propWalkSide` 1) | **Assumption** (a right-handed propeller walks the stern to port, PHYSICS_TRUTHS [35]); which way this boat's goes: question 18 |
| Phase 7: prop wash (M40) | ahead, 50 % of the thrust blows over the rudder below 4 kn ("kick ahead") | **Assumption** |
| Phase 7: thrusters (M41) | bow thruster 1,300 N in a tunnel at x 4.3; stern thruster 1,000 N in a pod under the hull at x −6.2 (the hull is too shallow aft for a tunnel); the push falls with speed (100 % at rest, 60 % at 2 kn, 30 % at 4 kn, 20 % from 6 kn) | **Owner** (one at each end, two left-right joysticks at the helm); power, places and the fall-off: **assumptions** (question 10) |
| Phase 7: contact (M43) | hull 400 kN/m, fender 100 kN/m over 0.24 m (its diameter); a fender takes a contact up to 0.5 m/s (1 kn); under 0.15 m/s a touch, under 0.4 a bump, under 0.8 a knock, faster a hit; fenders left out above 5 kn are lost after 30 s, then one every 20 s | **Assumptions** for teaching |
| Phase 7: cleats, fenders and roller (from Phase 6) | lines are made fast to Phase 6's cleats (x 5.0, −1.2, −7.5); the eight fenders protect the hull 1.5 m each way from their stations (half the largest gap between them), the ball fender none; the chain leaves the roller at its top, (6.92, 1.80, 0.20) (PHASE7_SPEC 4.1) | Positions: Phase 6's (see the rows above); the 1.5 m reach: **assumption** |
| Phase 7: mooring lines (M44) | 16 mm polyamide, EA 150 kN; two crew pull 900 N by hand ("hand tight"); lines are thrown when the stern is within 4 m of the quay; the crew walks the lazy line forward in 20 s; a slack line near the propeller with the engine in gear for 2 s fouls it | **Assumptions** |
| Phase 7: grounding (M45) | the keel (deepest point x −1.4, 2.4 m) and the rudder (1.95 m) touch the bottom; the bottom pushes back 40 kN per metre too deep, friction 0.5: touching at 2 kn or less, full astern gets her off, at 3 kn she sticks | **Assumptions** for teaching |
| Phase 7: anchor and chain (M46) | a 40 kg plough-type anchor; 70 m of 10 mm chain (2.2 kg/m); the chain leaves the bow roller 1.80 m above the water (Phase 6's roller); Phase 6 draws a plough of about 25 kg, while the holding uses 40 kg, the usual size for a 15 t boat (question 19 settles both); holds 25 × its weight in sand, 15 in mud, 5 in weed, 2 on rock, less with short scope (65 % at 3:1, 90 % at 5:1, 100 % from 7:1) | **Assumptions** (questions 19 and 20) |
| Phase 7: windlass (M46) | chain out 0.5 m/s, in 0.4 m/s slowing with the load, cuts out above 8 kN; remote at the helm | Remote: EXERCISES.md 5 (owner); speeds and cut-out: **assumptions** (question 21) |

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
10. Bow and stern thrusters (owner: one at each end): ~~what is the control at the helm?~~ Answered 2026-10-15: two joysticks, left-right, one for the bow thruster and one for the stern thruster. Still open: their power (the app assumes 130 kgf and 100 kgf), and whether the stern thruster is a tunnel or a pod under the hull.
11. Roughly how fast does the electric winch pull with no load, and at what load does it stop (if the manual or a label says)? M4b draws one button beside each winch (owner: one button per winch) and uses 24 m/min and 7 kN as guesses.
12. The mast furling gearbox (M4c): which way does the IN/OUT switch stand while sailing, and does cranking the handle either way turn the sail, or only one way? Is the handle 8 or 10 inches long? (Answered after M4c: cranking either way turns the sail; about 40 turns for a full furl; the switch is a toggle, IN left, OUT right; the handle is kept at the port side; clockwise is 1st gear.)
13. The gennaker halyard (M5): when the gennaker is not up, where is the halyard's shackle end (the end at the top of the mast) parked: clipped at the mast foot, at the bow pulpit, somewhere else? Does it leave the mast at the masthead above the forestay? The app draws it down the front of the mast to the mast foot. (Owner, PR #19: the other ends, the tails of all lines, are stored in a box behind each winch; now drawn.)
14. ~~Preventer~~ Answered 2026-10-10: the boat carries no preventer.
15. ~~Speed table~~ Answered 2026-10-10: none available; Phase 2 computes speeds from a physics model (PHASE2_SPEC 6).
16. ~~Engine speed~~ Answered 2026-10-10: comfortable cruise 8 kn; maximum thought to be about 10 kn but uncomfortable. Idle rpm and the rpm for 8 kn are still unknown (the model assumes 800 rpm and about 1,850 rpm).
17. Does the engine start only with the lever in neutral (a safety switch on the Allpa control)? The M12 engine starts in any lever position and she drives off if it is ahead; if the real boat only starts in neutral, M13 should do the same (found in the M12 independent review).

18. Going astern from a standstill, which way does the stern swing (prop walk)? The app assumes to port (Phase 7, M40); one value in the boat file flips it.
19. The anchor: its type (plough, claw, Rocna-style …) and weight? The app assumes a 40 kg plough-type anchor.
20. The anchor chain: its length and size (10 mm?), and are there coloured length marks? The app assumes 70 m of 10 mm chain.
21. The windlass: how fast does it bring the chain in, does it let the chain out by motor or by a clutch (free fall), and where is the remote (at the helm, on a cable at the bow)?

Answered from the October photos and the owner: two-line main furling (right clutch unfurls), straight track, single forestay, straight self-tacking track about 2.8 m long, one winch per side, rigid vang, topping lift line exists, bank sides. 2026-10-09: winches are electric; one winch handle, used mainly at the mast gearbox; each side's ropes go to that side's winch; winch model not marked (Lewmar only); one button per electric winch; bow and stern thrusters fitted. After M4c: the winch handle is kept at the port side; about 40 handle turns roll the main in at the gearbox; the gearbox switch is a toggle, IN left, OUT right; clockwise is 1st gear on the winch.

### Photo checklist (if you are near a Hanse 508 again)

The foredeck from above · the mainsheet from the boom to the deck, both sides · the cockpit from above showing which rope goes to which winch · the furling drum at the bow · the boom: vang, topping lift and outhaul exit · the wind instrument while sailing · the telltales on the sails · the builder's plate.
