# v1.1.0: what changed since v1.0.0

For the release description on GitHub (Releases → v1.1.0 → Edit) and for the announcement. v1.0.0 was published on 15 November 2026. Everything below was merged between then and 26 November 2026 (PRs #218 to #291, milestones M100 to M118).

## For learners

**A second boat: the Training dinghy** (Settings → Boat, or the welcome card)

- A small one-person boat, 3.45 m long, with one sail, a tiller and a centreboard (the fin under the hull that stops her sliding sideways). Everything it does not have (jib, winches, wheel, engine, autopilot, anchor, harbour gear, cabin) is hidden. The Hanse 508 is still the boat you start on (M113).
- Your own weight matters: sit on the high side or lean out to keep her flat, raise the board and she slides sideways. A new Balance section holds where you sit, the centreboard and the outhaul (the rope that flattens the sail) (M114).
- A sailor figure sits on the high side, leans out and crosses the boat in a tack, and a Sailor view replaces the Helm view (M115).
- Too much lean tips her over. A card tells you what to do in two steps: swim round to the centreboard and stand on it (M116).
- Learn shows only what is on the boat you are using, with its own texts for the dinghy, and two new entries, Leaning out and Capsize (M117).
- Four dinghy exercises: Go and stop, Tack, Gybe, and Capsize and right her (M118).

**The gennaker** (the big light sail for sailing with the wind behind you)

- Settings → Gennaker (Stowed / Rigged). Four rigging steps in the Sails section show how it is set up; the sheets (ropes) lead round the bow, outside everything (M105).
- Sail it with a sock control (the sleeve that lifts to set it and drops to take it down) and a sheet control. A Gybe button sends it round the front of the boat. The mainsail hides it and stops it being sheeted in when you run dead downwind (M106).
- In Realistic ropes the working sheet goes on its winch like any rope. It has no clutch, so it runs out when you let go (M107).
- Three exercises: rig and hoist, gybe, take it down (M108).
- Learn's Show it working draws a labelled spinnaker and a code 0 (two other downwind sails this boat does not have), and the mainsheet traveller (the track that moves the mainsheet sideways) (M109, M110).

**The captain on board**

- A captain figure stands behind the wheel, or at the rope station you choose in Realistic mode. Tap him to open his Learn entry (M111).
- In Realistic ropes he walks between stations along the side the wind comes from, and a rope end waits for him to arrive (M112).

**Sailor feedback** (first comments from sailors after the launch)

- The English text says line, trim and ease; Learn has new entries for line and cunningham (M100).
- On a computer: ← → steer, W / S and R / F work the sheets, P switches the autopilot, H or ? lists the keys (M101).
- The mini-map draws the six points of sail round the boat, marks the one you are on and names it (M102).
- A Feel it button on a Learn entry plays a matching exercise in Watch mode. Two new exercises: Header and lift, and Weather helm (M103).

**Distant land**

- Mountains, hills and islands round the horizon, fixed to the compass, so a turn shows against them (M104).

**More languages** (all AI drafts until a sailor has reviewed them)

- German (#218) and Norwegian (#220), with a Language dialog in Settings to choose between them.

**Exercises: 26 now, up from 17.** Two on words (M103), three on the gennaker (M108) and four on the dinghy (M118).

**Fixes**

- The gennaker no longer goes through the mainsail, and sailing dead downwind by the lee no longer flickers (#257).
- Dinghy: a tack by steering now completes (M115). The centreboard case shows from above, no water shows under the side decks, the maps draw no jib, and the boom swings the right way in a capsize (#290).
- Gennaker follow-ups: the picture spinnaker flies in front of the forestay, the set gennaker has a 3D label, the keyboard works the sheet drawing, the exercise bar shows the walk, the debrief counts repeats (#291).

## For contributors and the owner (nothing changes in the app)

- A language is a folder of JSON files, with review documents for a sailor to answer (`docs/LANGUAGES.md`, `docs/review/`).
- The browser-check jobs are pinned to `ubuntu-24.04` (#221).
- README links fixed (#219, #222).

## Known limitations

- The German, Norwegian and Russian texts are AI drafts until a sailor reviews them (issue #233).
- The dinghy has no Hanse-style Harbour or Realistic ropes, on purpose: it is for learning the basics.
- Issue #224 (exercise text covering the boat on a small phone) is still open.
- The sound and the physics are simplified on purpose. Sailors' corrections are welcome (Settings → Share links to exactly what you see).
