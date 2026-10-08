# Boat reference: Hanse 508 (the reference boat)

Everything we know about the real boat, where each fact comes from, and what is still a guess. The machine-readable version is [`content/boat/hanse508.json`](../content/boat/hanse508.json); keep both in sync.

## 1. Which boat, exactly

| Item | The reference boat | Evidence |
|---|---|---|
| Model | Hanse 508 (Judel/Vrolijk design, built from 2018) | Hanse spec sheet |
| Mainsail | **In-mast furling** (Seldén, manual), no battens | Photo of the gearbox with IN/OUT arrow; clutches "Main furling" ×2; brochure option XE1001 "manual in-mast furling" |
| Headsail | **Self-tacking jib** on a manual furler, one sheet | Brochure standard equipment. The clutch says "Genoa sheet", but genoa tracks only exist with the optional second forestay, which the reference boat does not appear to have. |
| Mainsheet | **German mainsheet**: one rope, both ends led to the cockpit, no traveller | "Main sheet" on clutch bank A and "MAIN SHEET" on clutch bank B |
| Gennaker | Not rigged (the halyard exists: "SPI HALYARD") | Owner; clutch label |
| Steering | Twin wheels, emergency tiller, compass at each wheel | Brochure |
| Engine | Diesel about 80 hp, saildrive, 2-blade fixed propeller; single-lever control; 2500 rpm limit sticker | Brochure; photo |
| Winches | 2 × Lewmar 55 ST EVO standard. The deck plan also shows 2 optional secondary winches; whether the reference boat has them is unknown. | Brochure (standard + option XC5200) |

## 2. Official figures (brochure)

| | |
|---|---|
| Length overall | 15.55 m |
| Hull length | 14.93 m |
| Waterline length | 13.54 m |
| Beam | 4.75 m |
| Draft (L-keel) | 2.40 m |
| Displacement | about 14.7 t |
| Mast above waterline | about 22.05 m |
| Mainsail, in-mast furling | about 58.7 m² (standard battened main: 66.5 m²) |
| Self-tacking jib | about 51.3 m² |
| Gennaker (option) | about 176.4 m² |
| Reacher on 2nd forestay (option) | about 87.4 m² |

Source: Hanse 508 price list and specification, `H508.22_PL_EN_20221216` (**not stored in this repo** because it is copyrighted).

## 3. Measured geometry

Positions in [`hanse508.json`](../content/boat/hanse508.json) were measured from the brochure's side view and deck plan:

- Side view about 35.4 px/m; deck plan about 107 px/m.
- Checked against the official numbers: hull length, beam and mast height agree within about 2 %.
- An overlay of the model's key lines on the brochure drawing matched the mast, boom, forestay, jib, spreader heights, keel bulb and rudder.
- Expect ±0.15 m on positions. Good enough for teaching, not for anything else.

Frame: origin at the mast, on the waterline, on the centreline; **x forward, y up, z starboard**.

| Feature | Position / size |
|---|---|
| Stem / bow fitting tip / transom | x = +6.30 / +6.90 / −8.60 |
| Mast | x = 0, foot on the coachroof at y = 1.84, tube top y = 21.55 |
| Spreaders | two sets at y ≈ 8.1 and 14.4 |
| Forestay | bow (6.16, 1.75) → mast (0.16, 21.10) |
| Boom | gooseneck (−0.20, 3.08), length 6.25 m |
| Mainsheet | boom point 3.05 m from the gooseneck; deck blocks at x = −3.08, z = ±0.42 on the coachroof aft end |
| Vang | mast (−0.18, 2.05) → boom 2.12 m from the gooseneck |
| Self-tacking track | arc about 0.28 m in front of the mast, 1.8 m wide |
| Jib | tack (6.12, 1.89), head (0.31, 20.60), clew about 0.4 m forward of the mast, 2.2 m above the waterline |
| Wheels | x = −7.20, z = ±0.88 |
| Winches | x = −6.33 (standard) and −7.25 (optional), z = ±1.60 |
| Clutch banks | x = −6.70, z = ±1.59, between the winches |

Reference sketches generated from the data file (they show exactly what the 3D model is built from):

- [`reference/hanse508-side.svg`](reference/hanse508-side.svg)
- [`reference/hanse508-plan.svg`](reference/hanse508-plan.svg)

## 4. Ropes, clutches and controls

Photos: [`reference/photos/`](reference/photos). Russian names are AI drafts until a sailor checks them.

### Clutch bank A (side assumed **port**). Photo: `clutch-bank-a.jpg`

| Slot | Label on the boat | What it is | Russian (draft) | App control |
|---|---|---|---|---|
| 1 | Main sheet | Mainsheet, port end | гика-шкот | `ctl_mainsheet` |
| 2 | Main furling | Main furling line | закруточный конец грота | `ctl_main_furl` |
| 3 | Main furling | Main furling line (second clutch, see open questions) | закруточный конец грота | `ctl_main_furl` |
| 4 | Main halyard | Main halyard, stays up with in-mast furling | грота-фал | static |
| 5 | Genoa sheet | **Jib sheet** of the self-tacking jib | стаксель-шкот | `ctl_jib_sheet` |

### Clutch bank B (side assumed **starboard**). Photo: `clutch-bank-b.jpg`

| Slot | Label on the boat | What it is | Russian (draft) | App control |
|---|---|---|---|---|
| 1 | SPI HALYARD | Gennaker/spinnaker halyard, parked | фал генакера / спинакер-фал | static |
| 2 | Boom lift | Topping lift | топенант гика | `ctl_topping_lift` |
| 3 | Main outhaul | Outhaul, works against the furling line | оттяжка шкотового угла | `ctl_main_furl` (coupled) |
| 4 | MAIN SHEET | Mainsheet, starboard end | гика-шкот | `ctl_mainsheet` |
| 5 | Vang | Vang / kicker | оттяжка гика | `ctl_vang` |

### Single clutch on the side deck. Photo: `jib-roll-clutch.jpg`

| Label | What it is | Russian (draft) | App control |
|---|---|---|---|
| JIB ROLL | Jib furling line | закруточный конец стакселя | `ctl_jib_furl` |

### Other photos

- `engine-control.jpg`: single-lever gear and throttle (Allpa), tachometer, START / STOP / POWER buttons, "MAX 2500 RPM" sticker added by the boat operator. Phase 2.
- `mast-furling-gearbox.jpg`: Seldén in-mast furling gearbox at the mast foot with the furling line drum and a winch-handle socket (IN/OUT), used as a backup to furl by hand.

### Same rope, different names (key teaching point)

| One thing | Names you will meet |
|---|---|
| Jib sheet | "Genoa sheet" (our clutch label), headsail sheet, стаксель-шкот |
| Mainsheet | "Main sheet" and "MAIN SHEET" (two clutches, **one rope, two ends**), гика-шкот, грота-шкот |
| Vang | kicker, kicking strap, boom vang, оттяжка гика, кикер |
| Topping lift | "Boom lift" (our label), топенант |
| Outhaul | "Main outhaul", аутхол |
| Gennaker halyard | "SPI HALYARD", spinnaker halyard |

## 5. Assumptions (safe to tune, please confirm on board)

| Assumption | Value used | How to confirm |
|---|---|---|
| Bank A is port, bank B is starboard | port / starboard | Look at which side each bank is on |
| JIB ROLL clutch side and position | starboard side deck, about 5 m aft of the mast | Look |
| Mainsheet purchase | 2 parts per side | Count the rope parts between boom and deck blocks |
| Boom maximum swing | 80° | Ease the main fully at anchor: angle to the centreline |
| Vang type | rope tackle | Rigid strut (gas spring) or rope only? |
| Spreader span and sweep | 1.05 m / 0.75 m, 20° back | Photo from below the mast |
| Cockpit sole height, wheel size | 1.0 m above waterline, 1.0 m wheel | Not important |
| Topping lift exits near the masthead | y = 21.0 | Look up |
| Mast section | 0.30 × 0.18 m | Not important |

## 6. Open questions for the skipper / next time aboard

1. Why two "Main furling" clutches? A continuous loop (one end to furl, one to unfurl) or two separate lines?
2. Is the self-tacking track a curved rail in front of the mast? (Confirms jib vs. genoa.)
3. One forestay or two?
4. Secondary winches: two winches per side or one?
5. Which winch takes which rope when furling and unfurling the main?
6. Rigid vang or rope vang? Is "Boom lift" a topping lift line?
7. What does the red button on the engine lever do? (Typically: disengage the gear to rev in neutral; confirm.)

### Photo checklist (if you are near a Hanse 508 again)

The foredeck from above · the mainsheet from the boom to the deck, both sides · the cockpit from above showing which rope goes to which winch · the furling drum at the bow · the boom: vang, topping lift and outhaul exit · the wind instrument while sailing · the telltales on the sails · the builder's plate.
