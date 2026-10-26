# How to make a boat profile

A boat profile is one file with every number of a boat. The app ships with the Hanse 508 only; with a profile you describe a similar yacht (a lighter one, a longer one, one without a thruster) and, from the next milestone on, import it into the app.

This guide is for someone who is not a developer. You need a text editor (Notepad is enough) and the boat's numbers.

## What a boat profile is

- One text file in the JSON format, named like `my-boat.boat.json`.
- It holds the whole boat file of the Hanse 508 (`content/boat/hanse508.json`): sizes, weights, the rig, the ropes, the winches, the hull shape, the physics numbers. You start from the Hanse 508's own numbers and change the ones that differ on your boat.
- At the top it has a short header: which app it is for, its kind (`boatProfile`), a version, the boat's `id` and `name`.

## Which boats it can describe

A profile describes a boat laid out like the Hanse 508. The layout (what is where, and how many) stays; the numbers are free.

The layout is:

- an in-mast furling mainsail with a two-line furling drive at the mast;
- a self-tacking jib on a furler;
- a German mainsheet (one rope with blocks under the boom, no traveller);
- a rigid vang (the strut that holds the boom down);
- electric primary winches, one per side;
- two clutch banks (the rope stoppers by the helm);
- twin wheels;
- one bow anchor with an electric windlass;
- a bow thruster and a stern thruster, **each optional**: a boat may have both, only one, or none.

Free to change: lengths, widths, weights, sail areas, the engine, the winches' power, the rope lengths and the positions of fittings, the hull shape, the wind and wave numbers, and all free text (sources and notes).

## Not supported yet

- A genoa on tracks, slab reefing (reefing the main by tying it down in steps), a mainsheet traveller, a single wheel, two anchors, a gennaker in use.
- Another list of ropes or controls: the ropes keep their ids and their order.

These are planned as "nice to have" for later, after the main functions are polished.

## How to make one

1. In the app open **Settings → Boat** and tap **Download this boat's profile**. A file such as `hanse508.boat.json` is saved.
2. Open the file in a text editor.
3. Near the top change `"id"` (small letters, digits and `-`, 1 to 40 characters, for example `my-boat`) and `"name"` (up to 60 characters, for example `My boat`). The header and the `boat.meta` block each hold the id and the name; the header is the one the app uses.
4. Change the numbers of the boat. **Keep every key and every rope id**; do not delete lines, do not reorder lists, do not rename ids.
5. The boat frame: the origin is the mast on the waterline; **x** points forward (towards the bow), **y** up from the waterline, **z** to starboard (the right side looking forward); everything in **metres**, angles in **degrees**.
6. To take a thruster away, delete its entry from the list `hull.thrusters` (keep the other one, or leave the list empty `[]` for a boat with none).
7. Save the file. Check that it still reads as JSON: every number is a plain number (`15.55`, not `"15.55"`), commas between entries, none after the last one.

## The checks

The app checks a profile before it uses it. A check names the place in the file, `boat.dimensions.loa` for example, and what is wrong.

| Problem | What it means |
|---|---|
| `header` | The top of the file is wrong: not a boat profile, a bad `id` or `name`, a newer version than the app knows. Nothing else is checked until this is fixed. |
| `missing` | A key of the Hanse 508 is not in your file (`beam missing`). Put it back. |
| `type` | A value has the wrong kind: text where a number belongs (`expected a number`), or the other way round. |
| `ids` | A name the app looks up was changed or a list lost an entry: rope ids, control ids, clutch names, part ids. Put the original back. |
| `length` | A list or a table has a different length than the Hanse 508's (positions need their three numbers, tables need at least two rows and every row as long as the original's, lists of plain entries such as the spreaders must keep their entries in the same order). |
| `thrusters` | `hull.thrusters` must hold none, one or two entries, each with `end` `bow` or `stern`, and no end twice. |
| `range` | A number is outside what the model can sail sensibly (table below). |

Ranges:

| Number | Allowed |
|---|---|
| `dimensions.loa` (length overall) | 6 to 25 m |
| `dimensions.beam` | 2 to 7 m |
| `dimensions.draft` | 0.8 to 4.5 m |
| `dimensions.displacementTonnes` | 1 to 60 t |
| `dimensions.massesKg.lightCraftStandardKeel` | 500 to 60,000 kg |
| `dimensions.engineHp` | 5 to 400 hp |
| `rig.mast.topY` | 6 to 40 m |
| `hull.stemX` minus `hull.transomX` (the hull length) | 5 to 25 m |
| `physics.thrusters.bowThrustN`, `sternThrustN` | 0 to 10,000 N |
| `realisticMode.winchHandle.lengthM` | 0.15 to 0.4 m |
| `physics.integration.maxStepS` | 0.005 to 0.1 s |
| `physics.integration.solverAwaStepDeg` | 0.01 to 5° |
| `physics.integration.solverAwsStepKn` | 0.01 to 5 kn |
| `physics.mass.payloadKg` | 0 to 20,000 kg |
| `physics.mass.addedMassFraction` | 0 to 2 |

At most 20 problems are listed; fix them and check again.

## Good to know

- The app was checked with the Hanse 508 only. A boat whose numbers pass the checks will sail, but nobody has verified that it sails like the real yacht.
- Speeds, heel and loads all come from your numbers (the weights, the sail areas, the keel, the thrust). If a number is a guess, the boat is a guess.
- The Learn texts ("On this boat") describe the Hanse 508, whatever boat you use.
- A boat without thrusters (or with one) hides the joysticks it does not have. The hint texts still mention both ends.
