# Workflow: building the app from a phone

For the owner. How to run each milestone with Claude Code in the cloud, and how to check the result without sailing knowledge.

Live site (what is merged into `main`): **https://botrops1.github.io/sail-learn-and-train/**

Each open pull request (PR) also has its own **preview** at `https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/` (`<N>` = the PR number). A bot comment on the PR carries the link and is updated on every push; the preview is deleted when the PR is merged or closed. Test there **before** merging.

## 1. One-time setup

1. **GitHub Pages** (done): Settings → Pages → Deploy from a branch → `gh-pages`, `/ (root)`.
2. **Claude app → Code tab:** GitHub connected and `Botrops1/sail-learn-and-train` selectable. The default cloud environment is fine.
3. **Two GitHub settings** (about 3 minutes, in the phone's browser on github.com with "Desktop site" on, or on the PC). Do this once the PR that introduced this section has run its checks:
   - **Merge only when the checks pass:** Settings → Branches → Add branch protection rule (or "Add classic branch protection rule") → Branch name pattern `main` → tick **Require status checks to pass before merging** → in the search box add `check` and `browser-checks` → **Create**. The Merge button then stays grey while a check is red or still running.
   - **Tidy branches:** Settings → General → Pull Requests → tick **Automatically delete head branches**.

## 2. The loop for each milestone

1. Start a **new** Code session on `Botrops1/sail-learn-and-train`. Model: **Sonnet**, effort **high** (section 4).
2. Type **`/milestone 11`** (the milestone's number). Nothing else to paste.
3. Wait. Claude builds, tests, opens a PR and **watches it**. You can close the app meanwhile.
4. In the PR (GitHub app): read "What changed", check that CI is green (`check`, `browser-checks`, `preview`).
   **If the PR starts with "Independent review required"** (the spec marks physics milestones that way): start the review now, before testing: new session, **Opus**, high, type **`/review <PR number>`**. It posts one comment on the PR with findings marked fix now / fix later / leave (about 15–30 minutes). Test while it runs or after it.
5. Open the preview from the bot comment. Check that the **version in Settings → About** matches the PR's latest commit (first 7 characters, PR → Commits).
6. Go through the checklist links in the PR description. Tick what works.
7. **Answer and report problems as one comment on the PR**, in the GitHub app: your answers to the questions, which review findings to fix (e.g. "review: fix 1 and 3"), and anything you found. Every question has a recommendation, so "accept all" is a valid answer, or "accept all except 2: …". For a bug, use the template in 3.2. The session picks the comment up by itself, fixes, records your answers in the decisions log and replies on the PR. No copying between sessions.
8. Test again on the updated preview (the reply names the new version in Settings → About).
9. **Merge** when the preview works and CI is green. About 2 minutes later the live site updates and the preview is removed.

**One milestone at a time.** Two milestones in parallel edit the same files and need a third session to sort out the overlap. A planning or review session next to the milestone is fine.

If a merge breaks the site, open the merged PR in the GitHub app and tap **Revert**. That creates a PR that undoes it; merge that.

## 3. Commands and templates

### 3.1 Commands (type them in a Code session)

| Command | When |
|---|---|
| `/milestone <N>` | Build milestone M<N> (section 2) |
| `/review <PR number>` | Independent review of a PR, right after it opens and before you test (Opus). Required when the PR says so (physics milestones); optional otherwise |
| `/bug <link> <what happened>` | A bug on the **live** site, after merge. Get the link from Settings → Share. Claude fixes it in a small PR and watches it |
| `/plan <phase number>` | Before a new phase (Opus, high). Claude asks you its questions first (each with a recommendation), then writes the spec and checklists in a docs-only PR. `/plan issue <N>` plans an extra milestone from an issue. After merging, start with `/milestone <N>` (Sonnet) |

The commands live in `.claude/skills/` in the repo; Claude can change them if you ask.

### 3.2 Bug report (as a PR comment, or after `/bug`)

```
Phone <model>, <portrait/landscape/unfolded>, version in Settings → About <hash>.
Link that shows it: <copy link from Settings → Share>
What I did: ...
What I expected: ...
What I saw: ...
```

### 3.3 Ask instead of build

When you are not sure whether something is right (for example "should the boom go that high?"), ask in a session or on the PR: "Explain in plain words why the boom does X in this link, and which rule in PHYSICS_TRUTHS covers it. Do not change code." It is cheaper than a fix and you learn sailing on the way.

## 4. Model and effort

In a session you can type `/model opus` or `/model sonnet`, and `/effort high` or `/effort medium`.

| Work | Model | Effort |
|---|---|---|
| `/milestone` | Sonnet | high |
| `/plan`, `/review` | Opus | high |
| `/bug`, small doc changes | Sonnet | medium |

The commands also name their model (`/milestone` and `/bug` Sonnet, `/plan` and `/review` Opus), so a wrong model setting is corrected while the command runs. Still set the model and effort when you start the session: the later rounds (your PR comments) run on the session's own model, and effort is not set by the command.

Usage: cloud sessions share your plan's limits with normal chat. What costs the most is a long session: every step re-reads everything said so far. So one session per milestone, and start a new one for unrelated work instead of continuing an old one.

## 5. Checklists (what to look for on the phone)

Test links set the app to a known state. Base: the PR's preview, `https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/` (the links below use the live site; the same `?…` part works after the preview address). Parameters: `wd` wind from (°, + = starboard), `ws` wind speed (kn), `ms` mainsheet, `js` jib sheet, `vg` vang, `tl` topping lift, `mf` mainsail out, `jf` jib out (all %), `cam` camera. Since M4a also `rd` wheel (° of rudder, + = to starboard), `sel` the selected rope or part, `jr` how far the jib is out when the sheet was hauled against a furled jib (written by Share), `lg=0` legend hidden. Since M4b also `mode=realistic`, `st` the station (`starboard`, `helm`), `co` the open clutches (e.g. `co=a5` = Genoa sheet), `wp` / `wsb` the rope on the port / starboard winch (e.g. `wsb=a5.3.t` = Genoa sheet, 3 turns, tail in the self-tailer). Since M4c also `st=mast`, `hd` where the winch handle is (`c` = you carry it, and your hand is full: no rope can be worked, `mast.w` = in the gearbox socket, `starboard.w` = in the starboard winch, `port.s` = lying at Port, where it starts), `gb=in` the gearbox switch. Since M5 also `lb=0` labels in 3D off (they are on by default).

### M0: Scaffold

- [ ] The site opens. The footer shows a version that matches the PR's latest commit (on the live site: the merged commit).
- [ ] Portrait phone: the 3D area is on top and the panel below. Rotate to landscape or unfold: they switch to side by side.
- [ ] On a computer, narrowing the browser window below about 700 px switches the layout live.
- [ ] `?debug=1` shows the debug overlay with FPS and layout mode.
- [ ] No visible errors; the page itself does not scroll sideways.

### M1: Static boat

- [ ] The boat looks like the side and top sketches in `docs/reference/` (mast about 40 % from the bow, long boom, two wheels at the back, keel under the middle).
- [ ] One-finger drag rotates, pinch zooms, two-finger drag pans. The camera never goes under the water.
- [ ] Camera presets work: Side (port), Side (starboard), Top, Bow, Helm.
- [ ] Tapping the mast, boom, a wheel, a winch, the keel or a stay shows a card with its name and a one-line explanation.
- [ ] Matches the photos in `docs/reference/photos/`: rigid vang strut from the mast foot to the boom, straight jib track just in front of the mast, one winch per side by the wheels, clutch bank in front of each winch, JIB ROLL clutch on the port side deck.

### M2: Mainsail, boom and test wind

- [ ] Wind tab: dragging the dial moves the wind arrow; wind streaks and the masthead indicator follow.
- [ ] `?wd=90&ws=12&ms=0`, then ease the main sheet step by step: the boom swings out to **port** (left when looking forward). Near 100 % it stops at about 72°. (PT-02, PT-04)
- [ ] Same, but the wind from the other side (`wd=-90`): the boom goes to **starboard**. (PT-02)
- [ ] `?wd=0&ws=12`, ease the main sheet 0 → 100 %: the boom stays in the middle, the sheet sags, the sail flaps. (PT-01, PT-03)
- [ ] `?wd=60&ws=12&ms=100`: the boom lines up with the wind, the sheet sags, the sail flaps. Haul in until it stops flapping. (PT-03)
- [ ] `?wd=175&ws=12&ms=100`: running downwind, the boom rests at about 72° and the sail is full, not flapping.
- [ ] Paid-out metres: the first 10 % of easing moves the boom much more than the last 10 %. (PT-06)
- [ ] `?wd=90&ws=20&ms=50&vg=100`, then `vg=0`: with the vang eased, the boom end is higher and the top of the sail is more open. (PT-07)
- [ ] `?ws=0&tl=0&vg=0`: both ropes are shown as "fighting". (PT-09)
- [ ] Wind 170 → 180 → −170 → −165: the boom stays, then swings across with a "GYBE" label. (PT-05)
- [ ] Changing "Mainsail out": the sail gets smaller from the back; the "in" furling tail moves one way, the "out" tail and the outhaul the other. (PT-12)
- [ ] `?wd=90&ws=12&ms=40`, set "Mainsail out" to 0 %: the boom drops onto its stop and stays; easing the main sheet does not move it; the panel says "furled". (PT-14)
- [ ] `?wd=40&ws=12&ms=20`, turn the wind to −40 (across the bow): the boom crosses at normal speed with a "Tack" note, not "GYBE".

### M3: Self-tacking jib

- [ ] `?wd=30`, then `wd=-30`: the car slides across the track and the jib fills on the other side. (PT-10)
- [ ] `?wd=0`: the jib flaps in the middle.
- [ ] `?wd=90&js=0`, ease the jib sheet to 100 %: the jib opens only to about 30–35°, and its top twists more than its bottom. (PT-11)
- [ ] `?js=0`, try to furl the jib: it stops with a hint to ease the sheet. Ease the sheet: furling continues. (PT-13)

### M3b: Visual pass

- [ ] The boat looks more real: white gelcoat hull with a dark stripe at the waterline, teak cockpit and side decks, silver mast and boom, sails with faint seams, a sky with clouds, rippled water, soft shadows (View tab → Detail: High).
- [ ] `?wd=175&ms=100`, look from above (Top) and close up at the lower spreader on the left: the mainsail rests against the spreader tip and the wire, it does not pass through them. Same with `wd=-175` (other side).
- [ ] `?wd=60&ms=100`, Helm view and close up at the sprayhood: no rope goes through the sprayhood. The main sheet comes down just in front of it.
- [ ] Close up at the mast foot: each line comes down the mast almost vertically to its own small block, then runs flat aft into a grey covered channel; no rope cuts straight across from the mast to the cockpit.
- [ ] Follow the JIB ROLL line (blue, left side deck): past its clutch it runs aft to the left winch, wraps round it and ends in the top of the winch.
- [ ] View tab → Detail: High / Low switches the look; the link (Share/address bar) keeps `detail=…`. On a phone it starts on Low.
- [ ] `?debug=1` on your phone, Low and High: note FPS, draw calls and triangles from the overlay.

### M4: Clutch-bank panel

- [ ] Ropes tab: the two clutch banks look like the photos, with the labels exactly as on the boat.
- [ ] Tapping "Vang" highlights the vang in 3D and shows its slider. Tapping a rope in 3D selects it in the panel.
- [ ] Tapping either "Main sheet" clutch highlights the same rope and says "one rope, two ends".
- [ ] "Main halyard" and "SPI HALYARD" show an info line, not a slider.
- [ ] Step size 1 % / 5 % works for the slider and the +/− buttons. Holding a +/− button repeats.
- [ ] The wheel control turns both wheels and the rudder.
- [ ] Share copies a link; opening it in another tab shows exactly the same state. Reset restores the defaults.

### M4b: Realistic mode, part 1

- [ ] Ropes tab → Realistic. Three station buttons: Port, Starboard, Helm. Only the chosen station can be worked; an alert shows when something happens at another one.
- [ ] Port station, `?wd=90&ws=12&mode=realistic`: drag the Vang clutch lever up (open) and down (closed). With it closed, dragging the vang tail out does nothing and says "open the clutch". (PT-15)
- [ ] Drag the vang tail onto the winch, circle clockwise twice: the drum shows 2 turns. Circle anticlockwise: turns come off.
- [ ] Put the tail in the self-tailer, hold the winch button: the vang comes in; let go and it stops.
- [ ] Starboard station, `?wd=90&ws=20&js=30&mode=realistic`, nothing on the winch: open the Genoa sheet clutch. The jib sheet runs out fast, the jib flies out, "running" shows. (PT-18) Same at `ws=4`: it barely moves.
- [ ] Reset, jib sheet on the winch with 2 turns, tail out of the self-tailer, at 20 kn: opening the clutch, the sheet slips. With 3 turns it holds. With 2 turns at 12 kn, dragging the tail eases it smoothly. (PT-16)
- [ ] Wrap anticlockwise instead, open the clutch: the rope runs, "wrapped the wrong way". (PT-17)
- [ ] `?ws=0&tl=0&vg=0&mode=realistic`: put the vang on the port winch and hold the button: the drum slows and cuts out with the hint about a fighting rope. (PT-19a)
- [ ] Pause: open a clutch and wrap a winch while paused; nothing moves. Resume: both happen together.
- [ ] Take a rope off the winch: with 0 turns, drag the "in your hand" dot back up to the rope's clutch and it comes off. With 1 or more turns the drag is refused ("Take the turns off first"); the "Take off winch" button always works.
- [ ] Easy mode still works exactly as before; Share keeps the mode and the clutch states.

### M4c: Realistic mode, part 2

Every check is a full link: tap it, then do what the line says.

- [ ] Holding a winch button shows the strain bar; near the limit the drum slows, at the limit it stops: https://botrops1.github.io/sail-learn-and-train/?mode=realistic&wd=90&ws=20&js=30&st=starboard&wsb=a5.4.t (hold the round button). At the limit, where it stops and says "cut out": https://botrops1.github.io/sail-learn-and-train/?mode=realistic&ws=0&tl=0&vg=0&wp=b5.4.t
- [ ] Take the winch handle to the starboard winch on a loaded jib sheet: cranking clockwise struggles, anticlockwise brings the rope in slowly. (PT-19) Handle already in the winch, 25 kn: https://botrops1.github.io/sail-learn-and-train/?mode=realistic&wd=90&ws=25&js=30&st=starboard&wsb=a5.4.t&hd=starboard.w
- [ ] Main furling line slipping: https://botrops1.github.io/sail-learn-and-train/?mode=realistic&wd=60&ws=27&ms=30&mf=100&st=starboard&co=a3,b3&wsb=a2.1.t&sel=rope_main_furling_line&cam=side-starboard (the "Set it up" button in Ropes → Realistic → "Practice: the main furling line slips" opens the same). Hold the winch button: the line slips. Go to Port, tap the handle to take it, go to Mast, drag the handle into the socket, flip the switch to IN, circle the grip: the main rolls in, as long as the "out" line and outhaul clutches are open.
- [ ] The gearbox switch: IN on the left, OUT on the right; a tap flips it, a slide sets that side: https://botrops1.github.io/sail-learn-and-train/?mode=realistic&st=mast&hd=mast.w&wd=60&ws=20
- [ ] A carried handle fills the hand: https://botrops1.github.io/sail-learn-and-train/?mode=realistic&wd=90&ws=12&hd=c (the handle is with you). Try a clutch lever or the winch button: refused ("You are holding the winch handle"). Tap the handle slot (the dashed box at the left of the winch, orange now) to lay it down: now they work.
- [ ] The handle slot is always there: https://botrops1.github.io/sail-learn-and-train/?mode=realistic&wd=90&ws=12&js=30&st=starboard&wsb=a5.4.t&hd=starboard.w — the handle is in the winch, the dashed box at the left says "empty". Circle the grip wide and sloppy: the handle stays in. Drag the grip and let go anywhere but on the box: it stays in. Drag the grip onto the box: the handle comes out and lies in it. Tap the box: it takes the handle; tap again: it lays it down. Every place has such a box (Port, Starboard, Mast, Helm).
- [ ] A rope wrapped the wrong way does not go into the self-tailer: https://botrops1.github.io/sail-learn-and-train/?mode=realistic&wd=90&ws=12&wp=b5.-2.h&sel=rope_vang (drag the "in your hand" dot into the jaw on top).
- [ ] Clutch shut on a running rope warns: https://botrops1.github.io/sail-learn-and-train/?mode=realistic&wd=90&ws=6&js=10&st=starboard&co=a5&sel=rope_jib_sheet (drag the Genoa sheet lever down).

### M5: Phase 1 sign-off

Every check is a full link: tap it, then do what the line says.

- [ ] Frame rate on your phone: https://botrops1.github.io/sail-learn-and-train/?debug=1 — drag the main sheet slider and turn the boat for a while. The overlay's FPS is mostly 50 or more, and "Slowest" stays under 33 ms (never below 30 fps). Please note FPS, Slowest and Work/frame in the PR, at Detail Low and High (View tab).
- [ ] Labels in 3D (on by default): https://botrops1.github.io/sail-learn-and-train/?wd=60 — names appear on the boat (Mainsail, Mast, Boom, …). Pinch to zoom in: more names appear without covering each other. Tap "Mast": it is selected and its card opens. View tab → untick "Labels in 3D": they go (the link then has `lb=0`).
- [ ] The halyards are drawn: https://botrops1.github.io/sail-learn-and-train/?wd=60&sel=rope_spi_halyard — the gennaker halyard is highlighted, running down the front of the mast. https://botrops1.github.io/sail-learn-and-train/?wd=60&cam=top&sel=rope_main_halyard — the main halyard's tail is highlighted from the mast foot aft to its clutch on the right.
- [ ] A rope on a winch is wrapped on it in 3D: https://botrops1.github.io/sail-learn-and-train/?mode=realistic&wd=90&ws=12&cam=helm&sel=rope_vang&wp=b5.3.t — the pink vang goes round the left winch (3 turns) into the top. In the strip tap "Out of self-tailer", "Remove turn" three times, then "Take off winch": the turns come off one by one and the rope goes back into the box behind the winch.
- [ ] A rope wrapped the wrong way is drawn the wrong way round: https://botrops1.github.io/sail-learn-and-train/?mode=realistic&st=starboard&wd=90&ws=12&cam=side-starboard&wsb=a5.-2.h — zoom in on the right winch: the green jib sheet goes round it the other way and its end hangs to your hand.
- [ ] The rope ends go into a box behind each winch, and in Easy mode nothing is on the winches: https://botrops1.github.io/sail-learn-and-train/?wd=60&cam=helm — the ropes come out of the back of the clutches, run past the left winch on its inside and into the dark box behind it. Tap the box: "Rope tail box".
- [ ] Taller clutches with full-size words: https://botrops1.github.io/sail-learn-and-train/?mode=realistic&wd=60 — each label is written along its clutch, as on the boat, and "closed", "stays shut", "rolls in" are easy to read.
- [ ] Works portrait, landscape and on a foldable or tablet if available: https://botrops1.github.io/sail-learn-and-train/?wd=60
- [ ] Disclaimer in the footer ("Learning aid, not a substitute for sailing instruction."): https://botrops1.github.io/sail-learn-and-train/ — scroll the panel to the bottom. README describes what the app is: https://github.com/Botrops1/sail-learn-and-train#readme
- [ ] Every item of the Definition of Done in `PHASE1_SPEC.md` is ticked in the PR.

## 6. After Phase 1

- Ask a Russian-speaking sailor to look at `content/registry/parts.json` (or a printable list Claude can generate) and the clutch-bank screen. Mark reviewed terms `sailor-reviewed`.
- Answer the open questions in `docs/BOAT_REFERENCE.md` if you get the chance.
- Then plan Phase 2 here in chat before starting it in Claude Code, the same way as Phase 1. (Done 2026-10-10: [`PHASE2_SPEC.md`](PHASE2_SPEC.md) and section 7 below.) Later phases start with `/plan <N>` (section 3.1).

## 7. Phase 2

Same loop as section 2: one session and one PR per milestone (M6 … M13, [`PHASE2_SPEC.md`](PHASE2_SPEC.md) section 5), started with `/milestone <N>`. The spec gives every formula, number and test, so **Sonnet at high effort** can build each milestone. M11 and M12 need a `/review` with Opus (the spec's milestones table has a review column; the PR reminds you).

### 7.1 Checklists

New link settings (PHASE2_SPEC 6.4 and later): `hdg` heading (compass °, default 0), `wd` the true wind's compass direction (old links: heading 0, so the picture is the same), `held=1` boat held still, `bs` boat speed at the start (kn; without it the boat starts at her steady speed), `ap=off|hdg|wind` autopilot (default: holding the heading) with its target `apt`; M7 `cam=map`; M10 `wm`, `seed`, `wg`, `tx`, `tb=0`; M12 `eng=1`, `lv`. Replace `<N>` with the PR number.

#### M6: The boat sails

- [ ] Sailing across the wind: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=12&ms=40&js=100 — the strip at the top shows about 7.7–8.8 kn and "AUTO 0°". "App" (the apparent wind, what the sails feel) is further forward than "True 90° S" (about 55–60°). The water grid streams past and there is a wake behind the boat. (PT-20)
- [ ] Held still is Phase 1: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=12&ms=40&js=100&held=1 — the strip says "Held still", App = True, nothing moves.
- [ ] Stuck head to wind ("in irons"): https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=0&ws=12&ms=10&js=10&bs=6&ap=off — she slows down, both sails flap, and within about a minute she stops (she may drift backwards a little). Ropes tab → turn the wheel: once stopped, she does not turn. (PT-21, PT-35)
- [ ] Autopilot, heading: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=12&ms=40&js=100 — Ropes tab → autopilot "Heading" is on. Tap +10: she turns 10° to starboard (right) and holds it. Then move the wheel: the autopilot goes to Standby with a notice.
- [ ] Autopilot, wind angle: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=12&ms=40&js=100&ap=wind — Wind tab → drag the wind arrow 20° round: the boat turns with the wind and the true angle in the strip stays 90°.
- [ ] Tack with the autopilot: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=45&ws=12&ms=12&js=0&ap=wind — Ropes tab → Tack: she turns through the wind, slows down, the jib crosses by itself (no rope work) and she settles at "True 45° P" within about 40 s. (PT-28)
- [ ] Bear away (turn away from the wind) and ease: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=45&ws=12&ms=12&js=0 — Ropes tab → tap −10 nine times (she turns until the true wind is about 135° on the starboard side): with the sheets still pulled in she is slow; ease the main sheet and the jib sheet to 100 % and the speed comes back to about 6 kn. (PT-22)
- [ ] Wind presets are now relative to the bow: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=12 — Wind tab → tap "45° starboard": the wind arrow moves to 45° from the bow.
- [ ] Old links still work: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60 — the boat sails with the wind 60° on the starboard bow (the Phase 1 picture) and the autopilot holds the course.
- [ ] Frame rate: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=12&ms=40&js=100&debug=1 — FPS mostly 50 or more, "Slowest" under 33 ms. Please note the numbers in the PR.

#### M7: Map and wind instrument

- [ ] The map: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=45&ws=12&ms=12&js=0&cam=map — the boat (large) in the middle, a red wedge (the no-go zone, where she cannot sail) pointing into the wind, "Close-hauled" in bold, the box "True wind 12 kn from 045°", a blue arrow for the apparent wind. Wait 30 s: a grey track appears behind her.
- [ ] Zoom: same link — the map opens at its closest zoom (scale bar "10 m", the boat about 155 px long, drawn to scale). − zooms out (20 m, 50 m, 100 m …); at the 100 m scale she is drawn bigger than true size and the note "boat enlarged" shows. + zooms back in; at the closest zoom + is greyed out.
- [ ] Boat up: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=85&ws=12&ms=12&js=0&hdg=40&cam=map — tap "Boat up": the map turns so her bow points up and the grid turns with it; "North up" turns it back.
- [ ] Running downwind: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=175&ws=12&ms=100&js=100&cam=map — "Run" is in bold, the no-go wedge points behind you.
- [ ] Tap the red wedge: the card says "No-go zone". Tap the blue arrow: "Apparent wind". Tap the boat: "Hull". Tap a name such as "Beam reach": its card. Tap the box at the top left: "Test wind".
- [ ] Wind instrument: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=12&ms=40&js=100 — Wind tab: the solid needle (apparent) at about 56°, the outlined one (true) at 90°, AWS about 14.5, TWS 12. With `&held=1` added both needles point the same way.
- [ ] Back to 3D: tap "Port" (the side view) on the camera bar: the boat is drawn again; "Map" brings the map back.

#### M8: Heel, forces and weather helm

- [ ] Heel: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=45&ws=20&ms=15&js=0&cam=bow — the boat leans to port (left) about 25–36°, the strip says "Heel … P", and "Heeling a lot" shows after 2 s.
- [ ] Easing helps: same link — Ropes tab → main sheet to 60: the heel gets smaller. Roll the main half in ("Mainsail out" 50): smaller again. (PT-25)
- [ ] Round-up (the boat turns into the wind by herself): https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=50&ws=18&ms=15&js=20 — Wind tab → speed to 28 kn: within half a minute she heels hard, turns towards the wind although the autopilot holds full rudder, and "ROUND-UP" shows. Open the link again, set the main sheet to 50 first, then 28 kn: she holds her course. (PT-32)
- [ ] Weather helm (the boat's pull towards the wind): https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=50&ws=10&ms=15&js=20 then https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=50&ws=20&ms=15&js=20 — Ropes tab: the wheel (turned by the autopilot) is turned further in the stronger wind. (PT-29)
- [ ] Rope loads: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=12&ms=40&js=100&sel=rope_mainsheet — the strip shows "Load … kN"; Wind tab → 24 kn: the load grows.
- [ ] A gust makes a rope slip: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?mode=realistic&wd=90&ws=20&js=30&st=starboard&wsb=a5.2.h — open the Genoa sheet clutch: the sheet slips on the winch. With `ws=8` it holds.

#### M9: Trim quality and telltales

- [ ] Good trim: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=25&js=50&cam=side-starboard — Ropes tab → "Sails": Mainsail "Good". Zoom in (pinch) on the front edge of the main, near the mast: the little ribbons (telltales) stream straight back, green ones on this side, red ones on the other.
- [ ] Pulled in too far (stalled): https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=0&js=50&cam=side-starboard — Mainsail "Stalled", the ribbons on the far (leeward) side hang down, the speed is lower. (PT-23)
- [ ] Let out too far (luffing): https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=100&js=50&cam=side-starboard — Mainsail "Luffing", the near-side ribbons lift, the front of the sail flaps.
- [ ] Running, the main blocks the jib: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=175&ws=12&ms=100&js=100 — Jib "Blanketed by the main" and it hangs empty. (PT-37)
- [ ] Flogging tears a sail: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=0&ws=25&held=1 — leave the phone for about 7 minutes: the damage bar fills, then "Torn" and a "Repair sails" button; the torn sail shows a dark tear. Tap Repair. (PT-38)

#### M10: Wind modes

- [ ] Gusts: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=12&ms=40&js=100&wm=gusty&seed=7 — about once a minute "GUST" shows; speed and heel rise in the gust and drop after.
- [ ] Repeatable: open the same link again: the gusts come at the same times (counted from opening).
- [ ] Shifts with the wind autopilot: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=12&ms=40&js=100&wm=shifty&wg=20&ap=wind — the boat's heading swings slowly with the wind; the true angle stays near 90°.
- [ ] Building wind, sped up: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=10&ms=20&js=25&wm=build&wg=12&tx=16 — the strip shows "×16"; within about 40 s the wind rises from 10 to 22 kn and the boat heels more.
- [ ] Dying wind: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=14&ms=20&js=25&wm=die&wg=10&tx=16 — the wind falls to 4 kn; the boat slows.
- [ ] Wind tab: the five mode buttons, the size slider, "New pattern" work; the dial shows a thin arrow for the wind right now.
- [ ] Time bar (issue #25): https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=20&js=25 — over the 3D view: "Time ×1" and five buttons. Tap ">" twice: ×4, the boat moves faster. Tap "<<": ×¼, slow motion. Tap the "×¼": back to ×1. "II" pauses and resumes as before. Tap the word "Time": the bar folds to the Pause button; tap again to open it.
- [ ] Time bar hides where it has nothing to do: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&held=1 — boat held still, steady wind: only the Pause button shows.
- [ ] Time bar switch: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&tb=0 — only the Pause button shows; View tab → "Time bar" brings it back.

#### M11: Gybes

- [ ] Accidental gybe (the boom slams across): https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=175&ws=20&ms=100&js=100 — Ropes tab → autopilot −10, twice: the wind gets behind the main, the boom swings across hard, a red sector flashes where it swept, and a report shows the boom speed, energy and peak main sheet load (several kN). (PT-24, PT-26)
- [ ] Controlled gybe: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=175&ws=20&ms=5&js=100 — same steps: the boom only moves a little, and the report says "Controlled gybe" with a small load. Then ease the main sheet.
- [ ] By-the-lee warning: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=175&ws=15&ms=100&js=100 — autopilot −10 once: "By the lee" shows and a faint outline marks where the boom would swing; after 3 s the warning gets stronger.

#### M12: Engine

- [ ] Idle ahead: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?ws=0&eng=1&lv=11 — "Engine 8xx rpm"; after a minute about 3.3 kn.
- [ ] Cruise: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?ws=0&eng=1&lv=66 — about 1,850 rpm and about 8 kn. Full ahead https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?ws=0&eng=1&lv=100 — about 9.4 kn.
- [ ] Astern: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?ws=0&eng=1&lv=-100 — she goes backwards, up to about 5 kn; the wheel steers the other way.
- [ ] Shifting: same link, drag the lever from astern straight to ahead: it pauses in neutral for half a second.
- [ ] Engine at the Helm station: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?mode=realistic&st=helm&ws=0 — Start, drag the lever forward: rpm and speed rise.
- [ ] Motor-sailing: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=20&js=25&eng=1&lv=66 — faster than with sails alone.

#### M13: Phase 2 sign-off

- [ ] Frame rate on your phone, the heaviest case: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=16&ms=40&js=100&wm=gusty&tx=16&debug=1 — FPS mostly 50 or more at Detail Low and High (View tab); note FPS and Slowest in the PR.
- [ ] Every item of the Phase 2 Definition of Done (PHASE2_SPEC 14) is ticked in the PR.

## 8. Phase 3

Same loop as section 2: one session and one PR per milestone (M14 … M19, [`PHASE3_SPEC.md`](PHASE3_SPEC.md) section 5), started with `/milestone <N>`. The spec gives every formula, number and test, so **Sonnet at high effort** can build each milestone. **M14, M15 and M17 need a `/review` with Opus** before you test them (the spec's milestones table has a review column; the PR reminds you). (Issues #33 and #34 were fixed before M14, PR #42.)

### 8.1 Checklists

New link settings (PHASE3_SPEC): M14 `sea=flat|sheltered|coastal|open` (default coastal; old links open with coastal waves); M17 `clk=YYYYMMDDHHmm` the time on board in local time (default 202606011200, noon 1 June), `clock=0` hides the clock. Replace `<N>` with the PR number.

#### M14: Waves

- [ ] Waves: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=15&ms=50&js=100 — the boat sails across moving waves; she rises and falls and rolls a little. Wind tab → Waves: "Coastal" is pressed and the line says "Waves 0.7 m high, one every 3.8 s, from 090°". (PT-39)
- [ ] Wave size: same link — tap "Open sea": bigger, longer waves (1.5 m); "Sheltered": small ripples (0.3 m); "Flat": flat water, as before.
- [ ] Big waves from 45° off the bow: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=45&ws=20&ms=20&js=0&sea=open&cam=bow — she pitches (nose up and down) clearly in 2 m waves.
- [ ] Pitch and roll, held still: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=0&ws=15&held=1&cam=side-port — waves from ahead: she pitches. https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=15&held=1&cam=bow — waves from the side: she rolls. The top line (speed and heading) says "Held still"; the time bar shows Pause, not the "Held still" chip, because the water moves. (PT-40)
- [ ] Waves build slowly: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=8&ms=40&js=100&tx=16 — Wind tab → speed to 25 kn: the wave line grows over about half a minute (a few minutes at normal speed), not at once.
- [ ] Pause freezes everything (issue #32): https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=15 — press Pause: the waves, the wind streaks and the ripples all stop. Resume: they move again.
- [ ] Old links: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60 — the boat sails in Coastal waves.
- [ ] Frame rate: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=15&ms=50&js=100&debug=1 — FPS mostly 50 or more, "Slowest" under 33 ms, at Detail Low and High (View tab). Please note the numbers in the PR.

#### M15: Waves change the sailing

- [ ] The sails feel the rocking: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=15&ms=50&js=100 — Wind tab: the solid (apparent wind) needle keeps swinging a few degrees and the sails flick; https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=15&ms=50&js=100&sea=flat — the needle is still. (PT-41)
- [ ] Waves knock her off course: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=135&ws=15&ms=100&js=100 — Ropes tab: the wheel (turned by the autopilot) keeps moving to hold the course; with `&sea=flat` added it stays still. (PT-42)
- [ ] Head seas slow her: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=45&ws=20&ms=20&js=0&sea=open — after half a minute note the speed in the strip; then https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=45&ws=20&ms=20&js=0&sea=flat — about 1 kn faster. (PT-43)
- [ ] Running with the waves costs little: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=135&ws=20&ms=100&js=100&sea=open vs https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=135&ws=20&ms=100&js=100&sea=flat — the speeds differ by less than half a knot.
- [ ] Held still is still Phase 1: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=15&held=1 — she bobs, but the sails do not flick and the apparent wind equals the true wind.

#### M16: Wind on the water, buoys, horizon

- [ ] Wind on the water: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=6&ms=50&js=100 — light wind: smooth, light water, no white crests. https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=22&ms=50&js=100&sea=open — strong wind: darker water and many white crests (white horses). (PT-44)
- [ ] See the gust coming: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=0&ws=12&ms=12&js=0&wm=gusty&seed=1&cam=helm — watch the water ahead (where the wind comes from); the first gust comes about half a minute after opening: a dark patch moves towards the boat; when it arrives "GUST" shows and she heels more. (PT-45)
- [ ] Buoys in 3D: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=12&ms=40&js=100&cam=helm — a small yellow buoy straight ahead, 200 m away, getting closer (the X on its top shows once she is within about 50 m). Tap it: "Practice buoy".
- [ ] Buoys on the map: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=12&cam=map — tap − four times: four yellow dots N, E, S, W around the start. Tap one: "Practice buoy".
- [ ] Horizon: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=12&cam=side-starboard — the water reaches the hazy horizon; no edge of the water is visible.

#### M17: Clock and sailing area

- [ ] Clock: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=12&ms=40&js=100 — a small "12:00" over the 3D view. Tap it: "Monday 1 June 2026 · 12:00", "Adriatic (Split) · CEST (UTC+2)", "Sunrise 05:16 · Sunset 20:28", "Light: Day".
- [ ] The clock runs with the time bar: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=12&ms=40&js=100&tx=16 — the clock moves 16 times faster (about 4 minutes every 15 seconds); Pause stops it.
- [ ] Set a time: open the clock, set 21 December 12:00, tap Set — "Sunrise 07:24 · Sunset 16:21", and the sun is low in the south. Tap "Noon, 1 June": back. Tap "Now": your current time in Croatia.
- [ ] Low sun: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=12&ms=40&js=100&clk=202606012010&cam=side-port — warm, low light from the west-north-west. (PT-46)
- [ ] Night: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=12&ms=40&js=100&clk=202606012300&cam=side-starboard — dark, bluish light; the boat is still readable.
- [ ] Clock switch: View tab → "Clock" off: the clock disappears; on: it comes back.

#### M18: Sky through the day

- [ ] Sunset ahead: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=30&ws=12&ms=40&js=100&hdg=300&clk=202606012028&cam=helm — she sails towards the sunset: orange sky and a warm glow ahead; then https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=30&ws=12&ms=40&js=100&hdg=300&clk=202606012028&cam=bow — looking back past her stern the sky is darker.
- [ ] Twilight: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=12&ms=40&js=100&clk=202606012050 — dark blue sky, a faint glow where the sun went down.
- [ ] Night: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=12&ms=40&js=100&clk=202606012300 — stars; the boat is readable. Turn the boat (autopilot +10): the stars stay put over the sea.
- [ ] Sunrise ahead: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=150&ws=12&ms=40&js=100&hdg=60&clk=202606010530&cam=helm — she sails towards the east-north-east: the sky glows low ahead.
- [ ] Time-lapse: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=12&ms=40&js=100&clk=202606011945&tx=16 — the sun sets within a few minutes and the sky goes through orange to dark blue.

#### M19: Phase 3 sign-off

- [ ] Frame rate on your phone, the heaviest case: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=20&ms=40&js=100&sea=open&wm=gusty&tx=16&clk=202606012030&debug=1 — FPS mostly 50 or more at Detail Low and High (View tab); note FPS and Slowest in the PR.
- [ ] Every item of the Phase 3 Definition of Done (PHASE3_SPEC 12) is ticked in the PR.

## 9. Phase 4

Same loop as section 2: one session and one PR per milestone (M20 … M24, [`PHASE4_SPEC.md`](PHASE4_SPEC.md) section 5), started with `/milestone <N>`. The spec gives every English text, Russian name, link and test, so **Sonnet at high effort** can build each milestone. **M20, M21, M22 and M23 need a `/review` with Opus** before you test them (the spec's milestones table has a review column; the PR reminds you).

### 9.1 Checklists

New link settings (PHASE4_SPEC): M20 `learn=<id>` opens that entry in the Learn tab (for example `learn=rope_vang`); M23 `lang=ru` shows the app in Russian (without it: English). Replace `<N>` with the PR number.

#### M20: Entries and the Learn tab

- [ ] More on the card: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?sel=sail_main&held=1 — the card at the top of the panel says "Mainsail"; tap "More": the Learn tab opens with the whole entry: other names, what it does, on this boat, typical mistakes, how sure we are.
- [ ] A rope's entry: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?learn=rope_vang&held=1 — "Vang", "Also called: kicker (British), kicking strap (British), boom vang", "Written on the boat: “Vang”", two typical mistakes, "Seen on the reference boat (photo)" with its sources.
- [ ] Show me and Back: same link — tap "Show me": the boat changes (wind 20 kn, the boom end lifts, the top of the main twists open) and the Learn tab stays. Now press your phone's Back button: the boat goes back to how it was.
- [ ] Try it: same link — tap "Vang" under "Try it in the Ropes tab": the Ropes tab opens with the vang's control.
- [ ] See also and Show on the boat: same link — tap "Boom" under "See also": the Boom entry. Tap "Show on the boat": the boom lights up in 3D and the Learn tab stays open.
- [ ] From the Ropes tab: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?sel=rope_mainsheet&held=1 — open "What does it do?" under the slider, tap "Read more in Learn": the Mainsheet entry.
- [ ] Other ropes and sails: open https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?learn=rope_jib_sheet&held=1, https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?learn=rope_main_furling_line&held=1 and https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?learn=sail_jib&held=1, tap "Show me" on each and read whether the text matches what you see.
- [ ] Old links: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60 — opens as before, on the Ropes tab.

#### M21: Glossary and search

- [ ] The list: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?held=1 — Learn tab: ten groups with counts ("Ropes (9)", "Sails and their parts (10)", …); open one and tap an entry; "‹ All entries" brings the list back.
- [ ] Search: type "kicker": "Vang — also: kicker". Type "genoa": "Jib sheet — also: Genoa sheet" (the word on the clutch). Type "mast": "Mast" comes first, then entries such as "In-mast furling gearbox" and "Masthead wind indicator".
- [ ] New texts: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?learn=fit_winch&held=1 — three typical mistakes; tap "Show me": Realistic mode at the starboard winch with the jib sheet on it; Back returns.
- [ ] Engine: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?learn=engine_control&held=1 — "Show me": the engine runs at about 1,850 rpm and she motors at about 8 kn.
- [ ] Danger zone: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?learn=env_boom_danger_zone&held=1 — "Show me": she runs downwind, and after about 6 seconds the autopilot has turned her through dead downwind: the boom crosses and the red area of its sweep is drawn.

#### M22: Sailing words, directions and winds

- [ ] Directions: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?learn=term_north&held=1 — "North", "0° on the compass"; open the group "Directions and sides (14)" and look through it.
- [ ] Port and starboard: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?learn=term_port&held=1 — "Also called: larboard (an old word, no longer used)", and the mistake with its fix.
- [ ] Winds of the Adriatic: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?learn=term_bora&held=1 — "Bora", from the north-east, gusty, "Checked against a written source"; also open "Jugo" and "Maestral" from "See also".
- [ ] Show me: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?learn=term_heel&held=1 — "Show me": she heels about 30°; in the Ropes tab ease the main sheet: she stands up. Back returns.
- [ ] In irons: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?learn=term_in_irons&held=1 — "Show me": she points straight into the wind, slows down and stops within about 40 seconds.
- [ ] Search: type "jibe": "Gybe — also: jibe".

#### M23: The app in Russian

- [ ] Switch: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?held=1 — View tab → "Language": tap "Русский": the page reloads and everything is in Russian: tabs, buttons, hints, the names over the parts in 3D, the clock card.
- [ ] One language only: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?lang=ru&learn=term_north&held=1 — "север", "Также называют: норд (…), С (сокращение)", no English words except names printed on the boat (in « ») and instrument letters (AWA, TWS …). The line "This translation has not yet been checked by a sailor" appears in Russian.
- [ ] Russian search: in the Learn tab type "бакборт": "левый борт".
- [ ] Names checked against the yacht-school textbooks: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?lang=ru&learn=rope_jib_furling_line&held=1 — the name is "линь закрутки стакселя". Then search "геннакер": "геннакер" (the sail) and "фал геннакера". Then open https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?lang=ru&learn=term_round_up&held=1 — the name is "брочинг".
- [ ] Nothing cut off: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?lang=ru&mode=realistic&held=1 and https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?lang=ru&wd=90&ws=12 — look at every tab: no button or label text is cut off; long words wrap.
- [ ] Engine numbers: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?lang=ru&ws=0&eng=1&lv=66&held=1 — the engine's rpm reads "1 860" (a space, not a comma).
- [ ] Back to English: View tab → "English": the page reloads in English.

#### M24: Phase 4 sign-off

- [ ] The review document: open the link to `docs/review/ru.md` in the PR description (after the merge it is at https://github.com/Botrops1/sail-learn-and-train/blob/main/docs/review/ru.md) and send it to a Russian-speaking sailor (your instructor) if you can. They answer by code, for example "term_north: ок".
- [ ] Every item of the Phase 4 Definition of Done (PHASE4_SPEC 11) is ticked in the PR.

## 10. Phase 5

Same loop as section 2: one session and one PR per milestone (M25 … M29, [`PHASE5_SPEC.md`](PHASE5_SPEC.md) section 5), started with `/milestone <N>` after M24 is merged. The spec gives every size, string and test, so **Sonnet at high effort** can build each milestone. **M25, M26, M27 and M28 need a `/review` with Opus** before you test them (the spec's milestones table has a review column; the PR reminds you).

### 10.1 Checklists

New link settings (PHASE5_SPEC 4.2): M27 `m=learn` opens Learn mode (without it the mode follows `mode`: Easy, or Realistic with `mode=realistic`; an old link with `learn=<id>` opens in Learn); M28 `mm=0` hides the mini-map. Replace `<N>` with the PR number. "The sheet" is the panel that slides up from the bottom of the phone screen (from M26).

#### M25: Settings menu and camera chip

- [ ] Settings: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12 — there is no "View" tab any more. Tap the gear at the bottom right of the 3D view: "Settings" opens with Language, Labels in 3D, Time bar, Clock, Step size, Detail, Share, Reset, Rope colour legend, Debug overlay, and at the end "About" with the version. Turn "Labels in 3D" off and close with ×: the names over the boat are gone.
- [ ] Camera: same link — the chip at the bottom left reads "Port ▾". Tap it: a menu with Side (port), Side (starboard), Top, Bow, Helm, Free, Map. Choose "Top": the view changes and the chip reads "Top ▾". Choose "Map": the map shows. Choose "Side (port)" to come back.
- [ ] Free: drag the 3D view with a finger: the chip reads "Free ▾".
- [ ] Russian: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?lang=ru&wd=60&ws=12 — the gear opens «Настройки»; nothing is cut off.

#### M26: Phone layout with a pull-up sheet

- [ ] Full screen: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12 — the boat fills the screen; the panel covers the lower half, with a grey handle at its top.
- [ ] Heights: tap the handle: the panel goes up to just below the instruments; tap again: it drops to a thin strip at the bottom (the boat is bigger now); tap again: half. Then drag the handle up and down with a finger and let go: it settles at the nearest of the three heights (a quick flick moves it one step).
- [ ] The boat stays in view: at each height (thin and half), the whole boat is between the instruments at the top and the buttons above the panel.
- [ ] Tapping a part: tap the boom: its card appears just above the buttons, not under the panel.
- [ ] Map: tap the camera chip → Map: the map ends at the top of the panel; its + and − buttons are visible.
- [ ] Smooth: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?debug=1&wd=60&ws=20&wm=gusty — the debug box shows 50 fps or more. Write the number in the PR.
- [ ] Turn the phone sideways: the panel moves to the right side as before; turn it back: the sheet is where you left it.

#### M27: Modes and sections

- [ ] Modes: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12 — the chip at the bottom left reads "Easy ▾". Tap it: Learn, Easy, Realistic, each with one line about it. Choose "Realistic": the panel shows the places (Port, Starboard, Helm, Mast) and the clutches. Choose "Learn": the Learn list comes first. Choose "Easy" again: the boat has not changed at any point.
- [ ] Blocks fold: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12 — in Easy, tap the title "Sails": it folds; tap again: it opens. Scroll down: Autopilot, Engine, Conditions, Learn, Rope colours are there, folded.
- [ ] Explanations: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12 — open "Conditions" and tap its "?": the explanations appear; tap "?" again: they hide.
- [ ] Instruments: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12 — tap the instrument box at the top left: the panel opens "Conditions" (wind direction and speed, waves).
- [ ] Quick − / +: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?sel=rope_mainsheet&ms=40&wd=60&ws=12 — tap the handle until the panel is a thin strip: it shows "Main sheet 40 % eased" with − and +. Tap +: 45 % eased, and the boom swings further out.
- [ ] Old learn links: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?learn=term_north&held=1 — opens in Learn mode with "North".
- [ ] More and Show me: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?sel=part_boom&wd=90&ws=12 — in the card tap "More": Learn mode with the Boom entry. Tap "Show me", then the phone's Back button: you are back on the Boom entry, still in Learn mode.
- [ ] Russian: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?lang=ru&wd=60&ws=12 — the mode chip reads «Простой ▾» and its menu «Обучение», «Простой», «Реалистичный»; open each block: nothing is cut off.

#### M28: Mini-map

- [ ] Mini-map: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12 — a small map in the bottom right corner, above the gear: the boat in the middle, a wind arrow at the top left and an "N" at the top right; after about half a minute a track line behind her.
- [ ] Full map: tap the mini-map: the full map opens. Tap "× Close" next to the gear: back to the same 3D view. Pull the panel up to full height: the mini-map hides; lower it: it is back.
- [ ] Held still: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&held=1 — no mini-map. Open "Conditions" and tap "Sailing": it appears.
- [ ] Switch: Settings → "Mini-map" off: it disappears (the link gets `mm=0`); on: it is back.
- [ ] Back button (decided on the planning PR #61): with the full map open, the phone's Back button does not close it (it would reset the boat); "× Close" and the camera chip do.

#### M29: Phase 5 sign-off

- [ ] Wide screen (a computer, window 1,280 px or wider): https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12 — the panel has two columns: the Easy blocks on the left, Conditions and Learn on the right. Make the window narrower: one column again.
- [ ] Phone, all three modes: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12 — switch Learn, Easy, Realistic and move the sheet to each height; nothing is cut off or hidden for good.
- [ ] Smooth: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?debug=1&wd=60&ws=20&wm=gusty — 50 fps or more with the sheet at the thin strip and at half. Write the numbers in the PR.
- [ ] Every item of the Phase 5 Definition of Done (PHASE5_SPEC 11) is ticked in the PR.

## 11. Phase 6

Same loop as section 2: one session and one PR per milestone (M30 … M34, [`PHASE6_SPEC.md`](PHASE6_SPEC.md) section 5), started with `/milestone <N>` after Phase 5 (M29) is merged. **M31, M32 and M33 need a `/review` with Opus** before you test them (the spec's milestones table has a review column; the PR reminds you).

### 11.1 Checklists

New link setting (PHASE6_SPEC 4.3): M33 `fd=1` puts the fenders out (without it they are in the locker). Replace `<N>` with the PR number. Every check works at both Detail settings: for the High one, open Settings (the gear) → Detail → High.

#### M30: Hull and deck closed

- [ ] The two places you circled: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&lb=0&cam=top&held=1&sea=flat — zoom in with two fingers on the back end of the coachroof (the raised cabin roof in front of the sprayhood). Where the covered rope channel comes down to the cockpit's edge on each side, it is now a solid white moulding: no teak and no water show underneath it.
- [ ] Same link, drag the view round to look at it from the side and from behind, low over the deck: still no hole on either side.
- [ ] The rim: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&lb=0&cam=side-starboard&held=1&sea=flat — a low raised rim (the toerail) runs along the deck edge from near the bow to the stern, without flickering, and the lifeline posts stand against its inner side.
- [ ] Detail: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&lb=0&cam=top&held=1&sea=flat&detail=high — the same places at Detail High: no hole, the rim without flicker. Then Settings → Detail → Low: the same.

#### M31: Anchor and windlass

- [ ] Anchor: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=0&ws=0&cam=bow&sel=fit_anchor&held=1&sea=flat — the anchor hangs in a steel roller in front of the bow, beside the jib's furling drum on the boat's right-hand side (starboard; on the left of the screen in this view from ahead), with a short chain back to the windlass, a small drum in a round dark hole in the foredeck.
- [ ] Tapping: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=0&ws=0&cam=side-starboard&held=1&sea=flat — zoom in on the bow with two fingers. Tap the anchor: the card says "Anchor"; the windlass: "Anchor windlass"; the roller: "Bow roller". The chain is thin: open Learn → Anchor chain → "Show on the boat" and it lights up.
- [ ] Learn: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?learn=fit_anchor&m=learn — the Anchor entry. Tap "Show me": the bow view with the anchor; the phone's Back button returns to the entry.
- [ ] Russian: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?lang=ru&learn=fit_anchor&m=learn — the entry is «якорь», marked as not yet checked by a sailor.

#### M32: Cleats and fairleads

- [ ] Cleats: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=0&ws=0&cam=side-starboard&held=1&sea=flat — zoom in: three steel cleats (two horns on two legs) stand on the rim on this side: near the bow, in the middle behind the mast's side wires, and near the stern. Turn to the other side (camera chip → Side (port)): three more.
- [ ] Fairleads: next to the bow cleat (further forward) and the stern cleat (further aft), a small steel guide with a slot on the rim.
- [ ] Tap a cleat: the card says "Mooring cleat"; tap a fairlead: "Fairlead". In Learn, the Mooring cleat entry's "Show on the boat" lights up all six.

#### M33: Fenders and the Harbour gear block

- [ ] Block: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&held=1 — scroll to the bottom of the panel: a folded block "Harbour gear". Open it: "Fenders" with "In the locker" (chosen) and "Out". The boat has no fenders.
- [ ] Tap "Out": eight dark fenders hang down both sides on thin lines, four a side, plus a big round one hanging at the back corner on the left-hand (port) side; the link now has `fd=1`. Tap "In the locker": they are gone.
- [ ] Hint: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&fd=1 — the boat is sailing with the fenders out: the Harbour gear block says "Bring the fenders in before you sail." Open Conditions and tap "Held still": the hint goes away.
- [ ] Old links: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&cam=side-port — no fenders.
- [ ] Learn: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?learn=fit_fender&m=learn — tap "Show me": the boat from the side with the fenders out; Back returns to the entry, and the fenders are back in the locker.
- [ ] Every mode: in Learn, Easy and Realistic (the mode chip), "Harbour gear" is the last block.

#### M34: Rope ends and Phase 6 sign-off

- [ ] Rope boxes, lines not in use: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=12&cam=helm&held=1 — look at the right-hand (starboard) winch from the helm: behind it a 30 cm gap, then a white box as wide as the block under the winch, running back to the stern. The lines drop into the gap and go into the box through a dark opening on its front face; nothing lies on top of the box. The floor is flat all the way back (no step).
- [ ] Line in hand: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?mode=realistic&wd=90&ws=12&cam=helm&wsb=a5.0.h — one line (the jib sheet) comes past the winch, crosses the gap and ends in a coil on top of the box, in its own colour; it does not go into the box.
- [ ] Lines on the winches: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?mode=realistic&wd=90&ws=12&cam=helm&wp=b5.3.t&wsb=a5.2.h — the turns on both winches are thinner than before and lie side by side; each line then has a short straight loose end lying on top of its box, with a closed, rounded tip.
- [ ] Smooth: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?debug=1&wd=60&ws=20&wm=gusty&fd=1&detail=low — 50 fps or more. Write the number in the PR.
- [ ] Every item of the Phase 6 Definition of Done (PHASE6_SPEC 11) is ticked in the PR.

#### M35: Folded sections

- [ ] Start folded: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12 — the panel shows only thin title lines (Ropes, Sails, Autopilot, Engine, Conditions, Learn, Harbour gear); none is open.
- [ ] One at a time: tap "Sails": it opens and the lines above (Ropes) stay at the top and the ones below (Autopilot … Harbour gear) sit at the bottom of the panel. Tap "Conditions": Sails folds, Conditions opens. Tap the open title: it folds.
- [ ] Scroll inside: open "Ropes" (the panel rises to full height by itself) and scroll its content: only the content moves, the title lines above and below stay where they are.
- [ ] A rope in the link: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?sel=rope_mainsheet&wd=60&ws=12 — "Ropes" is open and shows the main sheet.
- [ ] A Learn link: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?learn=term_north&held=1 — opens in Learn mode with "North" shown.
- [ ] Mode: open "Ropes", then tap the "Easy ▾" chip and choose "Realistic": "Ropes" stays open (now with the places Port, Starboard, Helm, Mast).
- [ ] Sideways: turn the phone sideways (https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12): the lines are thin too and all are visible.
- [ ] Computer (window 1,280 px or wider): https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12 — two columns; open "Ropes" on the left and "Conditions" on the right: both stay open; the title lines are the normal, taller size.

#### M36: Notification centre

- [ ] Phone, at the start: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12 — at the top right, above the clock, there is a small round "!" button (the Attention button). No number on it, and nothing else is open.
- [ ] Empty history: tap the "!" button: a small card opens under it saying "No alerts yet…". Tap the button again (or press Escape on a keyboard): it folds.
- [ ] Reminder to bring the fenders in: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&held=1&fd=1 — open "Conditions", choose "Sailing". The "!" button shows a "1". Tap it: the list has "Bring the fenders in before you sail." with the time and a "?" button. The number is gone.
- [ ] The question mark: tap "?" on that line. The card folds and the Learn section shows the entry "Fender".
- [ ] A gybe that is easy to miss: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=175&ws=20&ms=100&js=100&tx=0.5&cam=top — open "Autopilot" and tap "−10°" twice. The boom swings across and a red "GYBE" shows for a few seconds. The "!" button turns red with a "1" or "2". Wait until the red message is gone, then tap the "!" button: the gybe is still there, with its speed and load numbers.
- [ ] Computer (window 1,280 px or wider): https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12 — a small card "Attention" is already open at the top left of the 3D view (on a window narrower than 1,280 px it starts folded: tap the button), saying "No alerts yet…". Tap "−": it folds into the "Attention" button; tap the button: it opens again.
- [ ] Computer, a message: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&held=1&fd=1 — choose "Sailing" in Conditions: the reminder appears in the open card at once.
- [ ] Russian: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&lang=ru — the card opens with Russian text ("Внимание" is its title).

## 12. Phase 7 (planned ahead)

Planned before Phases 5 and 6 were built; brought up to date with what Phases 5 and 6 built by `/plan 7 refresh` (2026-10-16, PHASE7_SPEC 15). Then the same loop as section 2: one session and one PR per milestone (M40 … M47), started with `/milestone <N>`. **M40 to M46 need a `/review` with Opus** before you test them; M47 does not.

### 12.1 Checklists

New link settings (PHASE7_SPEC 4.2): `m=harbour` opens Harbour mode (M41); `pl=marina` or `pl=bay` puts the boat in that place, ready (M42, M45), with `ml=tight|medium|spacious` (the marina's layout), `tr=busy|half|empty` (how many other yachts) and `pe`/`pn` (where she is); `ln=` the mooring lines (M44); `an=` (chain out), `ax=` (where the anchor lies), `as=1` (set) the anchor (M46). `tx=16` makes time run 16 times faster. Replace `<N>` with the PR number.

#### M40: Slow-speed handling

- [ ] Wind on the side: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=15&mf=0&jf=0&js=100&bs=0&ap=off&cam=top — the sails are rolled away and she stands still. Watch for 30 seconds: she slides sideways to the left (west) and her bow turns a little to the left, away from the wind.
- [ ] The bow blows off: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=45&ws=15&mf=0&jf=0&js=100&bs=0&ap=off&cam=top — the wind comes from ahead and to the right. In 30 seconds the bow turns about 30° to the left (downwind).
- [ ] Prop walk (the propeller pushing the stern sideways in reverse): https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=0&ws=0&mf=0&jf=0&js=100&bs=0&ap=off&eng=1&lv=-50&cam=top — no wind, engine half astern. She goes backwards and her bow slowly turns right (the stern goes left), about 6° in 15 seconds.
- [ ] Kick ahead (a short push forward with the wheel turned): https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=0&ws=0&mf=0&jf=0&js=100&bs=0&ap=off&eng=1&lv=0&rd=35&cam=top — wheel hard right. In the Engine block push the lever to 60 % ahead for 3 seconds, then back to the middle. She turns right more than her speed would explain (the propeller blows water over the rudder).
- [ ] She keeps going: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=0&ws=0&mf=0&jf=0&js=100&bs=4&eng=1&lv=0&ap=off&cam=top&tx=4 — 4 knots, engine in neutral. She coasts for a long way (more than 100 m) before she stops.
- [ ] Sailing as before: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12 — sail for a minute: nothing has changed compared with the live site.

#### M41: Thrusters and Harbour mode

- [ ] Harbour mode: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=0&ws=0&mf=0&jf=0&js=100&bs=0&ap=off&eng=1&lv=0&cam=top — tap the mode chip and choose "Harbour": the Engine and Thrusters blocks open first.
- [ ] Bow thruster (a small sideways propeller in the bow): same link, Harbour mode — hold the Bow joystick to the right: the bow swings right, about 36° in 10 seconds. Let go: it stops pushing.
- [ ] Spin and slide: hold Bow right and Stern left: she turns on the spot. Hold both right: she moves sideways.
- [ ] Weak at speed: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?m=harbour&wd=0&ws=0&mf=0&jf=0&js=100&bs=4&eng=1&lv=40&ap=off&cam=top — at 4 knots the bow thruster hardly turns her, and the status says "little effect at this speed".
- [ ] The strip at the bottom (sheet pulled down): the engine − / + and two small joysticks are there and work.
- [ ] Realistic mode: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=0&ws=0&mf=0&jf=0&js=100&bs=0&ap=off&eng=1&lv=0&mode=realistic&st=helm&cam=helm — the two joysticks are under the engine lever.

#### M42: Places and the marina

- [ ] Go to the marina: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?m=harbour&ws=0 — in the Place block tap "Marina": she is in the marina's fairway (the lane between the boats), sails away, engine running. The map shows the quay, the pontoon, the moored yachts and your berth in yellow.
- [ ] Your berth: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?pl=marina&tr=busy&m=harbour&pe=2.8&pn=1480.0&hdg=180&cam=side-port — in front of your berth: the neighbours on both sides and the yellow stripe on the quay.
- [ ] Layout and traffic: in the Place block choose Tight and Busy: the fairway is narrower, every berth but yours is taken, and she goes back to the start.
- [ ] Share: tap Share and open the link in a new tab: the same place, layout, traffic and spot.

#### M43: Bumps, damage report, fenders

- [ ] Bump: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?pl=marina&tr=busy&m=harbour&pe=2.8&pn=1490.4&hdg=180&wd=-90&ws=20&cam=top&tx=4 — the west wind pushes her onto the yacht on her left. A report appears: what was hit, where on our hull, how fast, and how bad.
- [ ] Fenders (soft bumpers hung over the side): same link, in the Harbour gear block choose Fenders "Out" first: the same bump now says "the fender took it".
- [ ] Damage report: the Place block lists the contacts; "Clear" empties it.
- [ ] Fenders left out: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?ws=0&eng=1&lv=66&fd=1&tx=4 — motoring at 8 knots with the fenders out: after about 8 seconds a message says a fender was torn off, and the Harbour gear block says how many were lost.

#### M44: Mooring lines (Med stern-to)

- [ ] Stern-to: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?pl=marina&m=harbour&pe=2.8&pn=1490.4&hdg=180&ws=0&tx=4 — she is in front of her berth. In the Harbour gear block: "Throw it to the quay" for both stern lines, then "Pick it up" for the lazy line (a line from the quay to a weight on the bottom, taken to the bow): the crew walks it to the bow in 20 seconds. Tap "Tighten" on the lazy line until it says hand tight.
- [ ] She holds: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?cam=top&pl=marina&pe=2.8&pn=1490.4&hdg=180&ln=sp:2.55,ss:2.55,ll:12.33&wd=90&ws=15&m=harbour — wind from the side: she stays in her berth, the bow moves only a little.
- [ ] Without the lazy line: the same link with `&tr=busy` added, then "Let go" the lazy line: the bow swings towards the neighbour.
- [ ] Line in the propeller: from the stern-to link, take one stern line, ease it 10 times, then put the engine astern: the engine stops and says a line is caught. "Clear the propeller" frees it.

#### M45: The bay

- [ ] Go to the bay: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?m=harbour — Place: "Bay". The depth shows on the instrument strip; the map shows the bay's depths, the rocks (a cross with dots) and three buoys.
- [ ] Too shallow: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?pl=bay&m=harbour&pe=-1676.4&pn=0.0&hdg=270&bs=1.0&cam=side-port — the depth turns red and the keel touches the bottom: a report says so. Engine full astern: she comes off.
- [ ] Mooring buoy: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?pl=bay&m=harbour&pe=-1457.0&pn=0.0&hdg=90&ws=0&cam=side-port — the bow is at a buoy: "Pick up the buoy". She is now tied to it.
- [ ] Shore line: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?pl=bay&m=harbour&pe=-1665.0&pn=0.0&hdg=90&ws=0&tx=4 — "Take a line ashore": in 30 seconds the crew ties it to a ring on the rocks.

#### M46: Anchor and windlass

- [ ] Anchoring: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?pl=bay&m=harbour&pe=-1640.0&pn=0.0&hdg=270&wd=-90&ws=10&tx=4 — she points into the wind. In the Anchor block hold "Chain out": the counter counts metres; the anchor hangs, then lands on the bottom. The check says how much more chain the rules want (scope: chain against depth).
- [ ] Set it: let out enough chain, then put the engine a third astern for a few seconds: the status says the anchor is set.
- [ ] Swinging: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=15&cam=top&pl=bay&pe=-1640.0&pn=0.0&hdg=180&an=34.0&ax=-1606.0,0.0&as=1&m=harbour — she starts across the wind and swings round to point into it.
- [ ] Dragging: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=0&ws=25&wm=gusty&cam=map&pl=bay&pe=-1560.0&pn=-70.0&hdg=0&an=20.0&ax=-1560.0,-50.0&m=harbour&tx=4 — short chain on the sea grass in gusts: the anchor drags and the alarm goes off.
- [ ] Bow station: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=15&pl=bay&pe=-1640.0&pn=0.0&hdg=90&an=34.0&ax=-1606.0,0.0&as=1&mode=realistic&st=bow — Realistic mode has a fifth station, Bow, with the windlass buttons.

#### M47: Stern-to with the anchor, sign-off

- [ ] Stern-to on your own anchor: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?pl=marina&m=harbour&pe=2.8&pn=1490.4&hdg=180&ws=0&ln=sp:2.55,ss:2.55&an=48.0&ax=2.8,1442.0&as=1&cam=top — stern lines on, the anchor ahead holds the bow; the hint explains it.
- [ ] Anchor and shore line: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?pl=bay&m=harbour&pe=-1665.0&pn=0.0&hdg=90&wd=0&ws=15&an=60.0&ax=-1605.0,0.0&as=1&ln=sl1:28.08&cam=top&tx=16 — she lies still with her stern to the shore.
- [ ] Smooth: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?pl=marina&ml=tight&tr=busy&m=harbour&detail=high&cam=side-port&debug=1 — hold both thrusters: 50 fps or more. Write the numbers in the PR.
- [ ] Every item of the Phase 7 Definition of Done (PHASE7_SPEC 14) is ticked in the PR.
