# Physics truths

Plain-language rules the simulation must obey. They exist so that someone with no sailing knowledge can check the app, and so that the code is tested against sailing facts, not just against itself.

How to use this file:

- **Agent:** every rule marked for the current phase gets at least one unit test whose name starts with the rule id (e.g. `it('PT-02 boom goes to leeward', ...)`). If a rule seems wrong, do not quietly change the code to disagree with it. Say so in the PR.
- **Owner:** each rule has a "How to see it" line you can try in the app.
- **Status:** `source-checked` = backed by the cited source · `general` = basic mechanics, no source needed · `to-verify` = plausible, needs a source or a sailor's confirmation before Phase 4 teaches it as fact.

Sources are listed at the bottom.

## Phase 1 rules

| Id | Rule | How to see it | Status |
|---|---|---|---|
| PT-01 | **Ropes limit, wind pushes.** Easing a sheet never moves a sail by itself. It only allows the wind to push the sail further. With the wind from dead ahead, easing the mainsheet leaves the boom in the middle and the sheet goes slack. | Wind preset "Head to wind", ease the main sheet from 0 to 100 %: the boom stays centred, the rope sags. | general |
| PT-02 | **The boom goes to the leeward side.** Wind from starboard pushes the boom to port, and vice versa. | Wind +90 (starboard): boom swings to port as you ease. Wind −90: boom swings to starboard. | source-checked [1] |
| PT-03 | **A sail lined up with the wind flaps (luffs).** If the sheet is eased more than the wind needs, the sail just streams like a flag and flaps, starting at the front edge. | Wind +60, ease the main sheet to 100 %: the boom lines up with the wind at about 60°, the sheet goes slack, the sail flaps. Haul in until it stops flapping. | source-checked [1] |
| PT-04 | **The boom cannot swing past the shrouds.** Maximum swing is about 72° from the centreline on this boat (computed from the cap-shroud chainplate position in the owner's manual). | Wind from astern, sheet 100 %: the boom stops at about 72°, not 90°. | general (value: from manual geometry) |
| PT-05 | **With the wind from dead astern, nothing decides the side.** The boom stays where it is until the wind is clearly on the other side of the sail, then swings across the whole boat in one go: an accidental gybe. | Wind 170 → 180 → −170 → −165: the boom stays, then suddenly crosses with a "GYBE" flash. | source-checked [1] (danger: general) |
| PT-06 | **More boom angle needs more mainsheet.** Rope paid out grows steadily with the boom angle, the same on both sides. Near the centreline a little rope gives a lot of angle; far out, a lot of rope gives little angle. | Watch "metres paid out" while easing: the first 10 % moves the boom much more than the last 10 %. | general |
| PT-07 | **Vang eased means the boom rises and the top of the sail twists open.** Vang hauled holds the boom down and keeps the sail flatter, with less twist. | Wind +90, sheet 40 %, wind 20 kn. Ease the vang to 100 %: the boom end lifts, the top of the main opens more than the bottom. | source-checked [2] |
| PT-08 | **Once the mainsheet is eased, the vang (not the sheet) controls boom height.** Near the centreline the German mainsheet pulls almost straight down; far out it mostly pulls sideways. | Sheet 0–10 %: changing the vang hardly changes boom height. Sheet 60 %+: the vang changes it a lot. | source-checked [2] |
| PT-09 | **The topping lift holds the boom up when the sail is not pulling it up.** On our boat the rigid vang's spring also supports the boom, so the topping lift only carries it when hauled higher than that. If both the topping lift and the vang are hauled tight, they fight each other: ease the topping lift after the sail is set. | Wind 0 kn, topping lift hauled: the boom rests on the topping lift. Haul both topping lift and vang to 0 %: both ropes turn red ("fighting"). | to-verify |
| PT-10 | **The self-tacking jib changes sides by itself.** Its car slides to the leeward end of the track when the wind crosses the bow. No sheet handling is needed when tacking. | Wind +30 → −30: the car slides across, the jib fills on the new side. | source-checked [3] |
| PT-11 | **An eased self-tacking jib opens at the top more than it swings out.** Once the car sits at the end of its short track, easing the sheet lets the clew lift and the leech twist off. The jib cannot be eased far out on a reach. | Wind +90, ease the jib sheet 0 → 100 %: the jib's angle grows only to about 30–35°, the top visibly twists. | to-verify |
| PT-12 | **In-mast furling: one line rolls in, the other side rolls out.** The reference boat has two furling lines on the drum (one furls, one unfurls) plus the outhaul. To unfurl, haul the "out" line and the outhaul while easing the "in" line. To furl, haul the "in" line while easing the other two. The sail rolls in from the back edge (leech), so the clew moves towards the mast along the boom. | Change "Mainsail out": the "in" tail moves one way, the "out" tail and the outhaul the other, and the clew slides along the boom. | two-line drive: owner-confirmed; sequence: to-verify |
| PT-13 | **Jib furling needs an eased sheet.** Rolling the jib moves its clew forward. If the jib sheet is too tight, the jib cannot be furled further until the sheet is eased. | Jib sheet 0 %, furl the jib: it stops with a hint. Ease the sheet: furling continues. | to-verify |
| PT-14 | **A furled sail does not push the boom.** The wind pushes and lifts the boom through the sail, so with less mainsail out the push and lift get weaker; with the main rolled away there is nothing to push: the boom stays where it is and rests on the vang strut (or the topping lift), and the sheet goes slack. | Wind +90, main sheet 40 %: set "Mainsail out" to 0 %. The boom drops onto its stop and stays; easing the sheet does not move it; the panel says "furled". | general |
| PT-15 | **A closed clutch holds a rope; it can still be pulled in, but never let out.** To let a rope out, open the clutch. (Realistic mode, M4b) | Realistic mode, Port station, Vang clutch closed: dragging the tail out does nothing ("open the clutch"); winching it in works. | source-checked [5] (pull-through: general) |
| PT-16 | **More turns on the winch hold more.** Holding force grows exponentially with the turns (capstan equation): with polyester on an aluminium drum each turn multiplies the hold by about 3.5. About 4 turns to winch under load, about 2 to ease under control. (M4b) | Jib sheet loaded at 20 kn: with 2 turns and the tail in hand it slips when the clutch opens; with 3 it holds. | source-checked [4] (turn counts: owner's experience, [4]) |
| PT-17 | **Winches turn only one way: clockwise seen from above.** A rope wrapped anticlockwise is not held: the drum turns with the load and the rope runs out. (M4b) | Wrap the jib sheet anticlockwise, open the clutch: the rope runs. | source-checked [6] |
| PT-18 | **Opening a loaded clutch with the rope not on a winch lets the rope run out, fast.** Light loads run slowly or not at all. Take the load on the winch first, then open the clutch. (M4b) | Wind 20 kn, main sheet loaded: open its clutch with nothing on the winch: the boom flies out; at 4 kn it barely moves. | source-checked [5] |
| PT-19 | **A two-speed winch turns the drum the same way in both handle directions:** one direction is fast and weak (1st gear), the other slow and strong (2nd gear). Too much load for 1st gear: switch to 2nd. (M4c) | Realistic mode, heavy load: cranking clockwise struggles, anticlockwise brings the rope in slowly. | source-checked [6] (ratios: [7]; winch generation on the boat unconfirmed) |

## Rules for later phases (do not implement yet; listed so the architecture leaves room)

| Id | Phase | Rule | Status |
|---|---|---|---|
| PT-20 | 2 | **Apparent wind** is the true wind plus the headwind from the boat's own motion. Sailing upwind or on a reach, it comes from further forward, and is usually stronger, than the true wind. | to-verify (standard textbook fact; cite in Phase 2) |
| PT-21 | 2 | **No-go zone:** a sailing boat cannot sail closer than roughly 45° to the true wind (typically 30–50° depending on the boat). Inside it the sails luff and the boat stops ("in irons"). | source-checked [1] |
| PT-22 | 2 | **Close-hauled to run:** as the boat bears away from close-hauled (~45°) towards a run (180°), the sails are progressively eased. | source-checked [1] |
| PT-23 | 2 | **Over-trimmed sails stall:** a sail pulled in too far for its wind angle loses drive and makes more heel. Telltales on the leeward side stop streaming. | to-verify |
| PT-24 | 2 | **Accidental gybe energy:** the boom crosses fast; the shock load on the mainsheet and fittings is large, and a person in the boom's path can be seriously hurt. A preventer stops it. | to-verify |
| PT-25 | 2 | **Heel grows with wind force on the sails.** Easing sheets or reducing sail area reduces heel. | to-verify |
| PT-26 | 2 | **Running dead downwind carries a risk of an accidental gybe.** | source-checked [1] (risk: to-verify) |
| PT-27 | 5 | **Prop walk:** in reverse, a single propeller pushes the stern sideways (direction depends on rotation). | to-verify |
| PT-28 | 2 | **Self-tacking jibs** need no sheet work when tacking, which is why they suit short-handed sailing. | source-checked [3] |
| PT-29 | 2 | **Heel reduces drive.** A boat heeled too far sails slower and pulls harder on the helm (weather helm); easing the main reduces both. | to-verify |
| PT-30 | 3 | **Waves grow with wind strength and fetch** and make the boat pitch and roll, which moves the apparent wind at the masthead and knocks the boat off course. | to-verify |
| PT-31 | 5 | **Anchoring needs scope:** let out several times the water depth in chain, more in strong wind. | to-verify |

## Sources

1. Wikipedia, *Point of sail*. https://en.wikipedia.org/wiki/Point_of_sail. No-go zone about 45° (30–50°) either side of the wind; close-hauled about 45°; sails eased progressively when bearing away; gybing defined; "in irons".
2. Sailing World, *Finer Points: The Boom Vang*. https://www.sailingworld.com/how-to/finer-points-the-boom-vang/. The vang holds the boom down once the mainsheet is eased; without it the boom rises, the top twists off and power spills; too little vang limits how far the sail can usefully be eased.
3. Boating NZ, *Hanse 508 review*. https://boatingnz.wpcharged.nz/boat-reviews/hanse-508/. The standard 95 % self-tacking jib "flicks effortlessly across onto the new tack"; tacking is as simple as turning the wheel.
4. Practical Sailor, *Unwrapping the revealing capstan equation*. https://www.practical-sailor.com/sails-rigging-deckgear/unwrapping-the-revealing-capstan-equation/. Holding force grows exponentially with turns; polyester on aluminium about μ = 0.2; about three turns in moderate wind, more in heavy wind or with slippery covers; one more turn beats a better drum.
5. Practical Sailor, *2009 rope clutch review*. https://www.practical-sailor.com/sails-rigging-deckgear/practical-sailors-2009-rope-clutch-review/. Lines are pulled through closed clutches; releasing a heavily loaded line without winch control is dangerous.
6. MIT Sailing Pavilion wiki, *Winch*. https://sailing.mit.edu/wiki/index.php/Winch. The drum is ratcheted to turn one way (usually clockwise); on two-speed winches the two handle directions turn the drum the same way with different gear ratios; self-tailers hold the tail.
7. Lewmar EVO 55 self-tailing winch, retailer specification (Defender). https://defender.com/en_us/lewmar-evo-size-55-self-tailing-winch. Power ratios 13.8:1 (1st) and 54:1 (2nd), drum 4 1/8 in.
8. Rigging Doctor, *Calculating sheet loads*. https://www.riggingdoctor.com/life-aboard/2015/11/18/calculating-loads. Headsail sheet load (lb) = sail area (ft²) × wind speed² (mph) × 0.00431.

When you add a source, add it here and point the rule's status to it. Prefer sailing-school material (RYA, ASA, NauticEd), manufacturer manuals (Seldén, Lewmar, Hanse) and textbooks over forums.
