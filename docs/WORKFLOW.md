# Workflow: building the app from a phone

For the owner. How to run each milestone with Claude Code in the cloud, what to paste, and how to check the result without sailing knowledge.

Live site (what is merged into `main`): **https://botrops1.github.io/sail-learn-and-train/**

Each open pull request (PR) also has its own **preview** at `https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/` (`<N>` = the PR number). A bot comment on the PR carries the link and is updated on every push; the preview is deleted when the PR is merged or closed. Test there **before** merging.

## 1. One-time setup (about 10 minutes)

1. **Merge the starter-pack PR** (this file arrives with it) in the GitHub app.
2. **Turn on GitHub Pages.** The GitHub app may not show this setting, so use the mobile browser: github.com → `Botrops1/sail-learn-and-train` → **Settings** → **Pages** → *Build and deployment* → Source: **Deploy from a branch**, Branch: **gh-pages**, folder **/ (root)**, **Save**. (If the menu is hidden, use the browser's "Desktop site" option.) The `gh-pages` branch appears after the first deploy from `main` or the first PR preview; until it exists the branch is not in the list.
3. **Claude app → Code tab:** make sure GitHub is connected and `Botrops1/sail-learn-and-train` is selectable. The default cloud environment is fine; nothing to configure.

## 2. The loop for each milestone

1. Start a **new** Code session on `Botrops1/sail-learn-and-train` (one session per milestone keeps it focused and saves usage).
2. Set model and effort (table in section 4), then paste the milestone prompt from section 3.
3. Wait. Claude works, runs the tests, takes screenshots and opens a PR. You can close the app meanwhile.
4. In the PR (GitHub app): read "What changed", open the screenshots, check that CI is green.
5. **Open the preview link in the PR comment** ("PR Preview Action"). It appears about 2 minutes after each push; pull to refresh the PR if it is not there yet. Check that the **version in the footer** matches the PR's latest commit (the first 7 characters, shown in the PR's Commits tab). The test links in the PR description already point at the preview.
6. Go through the milestone checklist (section 5) on the preview. Tick what works.
7. Problems? In the same session, describe them with the bug template (section 3.4). Claude pushes fixes to the same PR; the preview updates by itself.
8. Optional for M2 and M3: run the **review prompt** (3.3) in a fresh session before merging. A second pair of eyes is cheap compared with debugging later.
9. **Merge** when the preview works. About 2 minutes later the live site updates (footer shows the merged commit) and the preview is removed.

If a merge breaks the site, open the merged PR in the GitHub app and tap **Revert**. That creates a PR that undoes it; merge that.

## 3. Prompts (copy and paste)

### 3.1 First session (M0)

```
Read CLAUDE.md and every document it lists, then implement milestone M0 from docs/PHASE1_SPEC.md, and only M0.
Work on a branch named m0-scaffold and open a PR when done.
Before opening the PR: run typecheck, lint, tests and build; take screenshots with Playwright at the three viewport sizes and look at them; commit them to docs/screenshots/.
In the PR, use the template in CLAUDE.md and copy the M0 checklist from docs/WORKFLOW.md.
If anything in the spec is unclear or contradictory, list it in the PR instead of guessing.
```

### 3.2 Each following milestone (replace N and the name)

```
Read CLAUDE.md and every document it lists. Milestones up to M<N-1> are merged.
Implement milestone M<N> (<name>) from docs/PHASE1_SPEC.md, and only that milestone.
Branch: m<N>-<short-name>. Same verification and PR rules as before (tests named after PHYSICS_TRUTHS ids, screenshots you have looked at, checklist from docs/WORKFLOW.md).
List open questions in the PR instead of guessing.
In the PR description, embed the 6–10 most important screenshots as images (https://github.com/Botrops1/sail-learn-and-train/blob/<branch>/docs/screenshots/<file>.png?raw=true), phone size first, so they show in the GitHub app.
```

### 3.3 Independent review (fresh session, optional)

```
You are reviewing PR #<number> in this repo. Do not change code.
Read CLAUDE.md, docs/PHASE1_SPEC.md and docs/PHYSICS_TRUTHS.md.
Check the PR against the milestone's scope and Definition of Done, the conventions (frame, signs, ids, no magic numbers), and every physics truth relevant to this milestone.
Look at the screenshots in docs/screenshots/.
Report: (1) bugs or rule violations, ranked by severity, with file and line; (2) things that work but look wrong to a sailor; (3) scope creep. Be concrete and brief.
Post the result as a comment on the PR.
```

### 3.4 Bug report (paste into the session)

```
Bug on the preview of PR #<N> or the live site (version <footer hash>), phone <model>, <portrait/landscape/unfolded>.
Link that shows it: <copy link from View tab → Share>
What I did: ...
What I expected: ...
What I saw: ...
(Screenshot attached if useful.)
```

### 3.5 Ask instead of build

When you are not sure whether something is right (for example "should the boom go that high?"), ask in the session: "Explain in plain words why the boom does X in this link, and which rule in PHYSICS_TRUTHS covers it. Do not change code." It is cheaper than a fix and you learn sailing on the way.

## 4. Model and effort

In a session you can type `/model opus` or `/model sonnet`, and `/effort high` or `/effort medium`.

| Work | Model | Effort | Why |
|---|---|---|---|
| M0 scaffold, M1 boat model | Opus | high | Architecture and geometry decisions are expensive to redo |
| M2 mainsail solver, M3 jib solver | Opus | high | The core maths; mistakes are subtle |
| M4 clutch-bank panel | Sonnet | medium (switch to Opus if it struggles) | Mostly UI work |
| M4b/M4c Realistic mode | Opus | high | Gestures plus a small physics model (capstan rule, loads) |
| M5 polish, small fixes | Sonnet | medium | Fast, light on usage |
| Reviews (3.3) | Opus | high | Finding subtle problems |

Usage: cloud sessions share your plan's limits with normal chat. One session at a time is enough. If a session gets very long, type `/compact`.

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
- [ ] Main furling line slipping: https://botrops1.github.io/sail-learn-and-train/?mode=realistic&wd=60&ws=20&ms=30&mf=100&st=starboard&co=a3,b3&wsb=a2.1.t&sel=rope_main_furling_line&cam=side-starboard (the "Set it up" button in Ropes → Realistic → "Practice: the main furling line slips" opens the same). Hold the winch button: the line slips. Go to Port, tap the handle to take it, go to Mast, drag the handle into the socket, flip the switch to IN, circle the grip: the main rolls in, as long as the "out" line and outhaul clutches are open.
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
- Then plan Phase 2 here in chat before starting it in Claude Code, the same way as Phase 1. (Done 2026-10-10: [`PHASE2_SPEC.md`](PHASE2_SPEC.md) and section 7 below.)

## 7. Phase 2

Same loop as section 2: one session and one PR per milestone (M6 … M13, [`PHASE2_SPEC.md`](PHASE2_SPEC.md) section 5). The spec gives every formula, number and test, so **Sonnet at high effort** can build each milestone (`/model sonnet`, `/effort high`). For M6, M8 and M11 (the physics), an Opus review (prompt 3.3) before merging is worth it.

### 7.1 Prompt for each Phase 2 milestone (replace N and the name)

```
Read CLAUDE.md and every document it lists. Phase 1 is done; Phase 2 milestones before M<N> are merged.
Implement milestone M<N> (<name>) from docs/PHASE2_SPEC.md, and only that milestone. Read sections 0–5 of the spec first, then section <N>.
Follow the spec's formulas, data values and function signatures exactly. If a test band fails, follow section 0 (check the formulas first; tune only the keys marked tunable; report it).
Branch: m<N>-<short-name>. Same verification and PR rules as before (tests named after PHYSICS_TRUTHS ids, screenshots you have looked at, the M<N> checklist from docs/WORKFLOW.md section 7.2 with every link pointing at this PR's preview).
Write anything you decide that the spec leaves open into the milestone's section of docs/PHASE2_SPEC.md, marked "decided in the M<N> PR".
List open questions in the PR instead of guessing.
In the PR description, embed the 6–10 most important screenshots as images, phone size first.
```

### 7.2 Checklists

New link settings (PHASE2_SPEC 6.4 and later): `hdg` heading (compass °, default 0), `wd` the true wind's compass direction (old links: heading 0, so the picture is the same), `held=1` boat held still, `bs` boat speed at the start (kn; without it the boat starts at her steady speed), `ap=off|hdg|wind` autopilot (default: holding the heading) with its target `apt`; M7 `cam=map`; M10 `wm`, `seed`, `wg`, `tx`; M12 `eng=1`, `lv`. Replace `<N>` with the PR number.

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

- [ ] The map: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=45&ws=12&ms=12&js=0&cam=map — the boat in the middle, a red wedge (the no-go zone, where she cannot sail) pointing into the wind, "Close-hauled" in bold, the box "True wind 12 kn from 045°", a blue arrow for the apparent wind. Wait 30 s: a grey track appears behind her.
- [ ] Zoom and turn: same link — + and − change the scale bar; "Boat up" turns the map so the bow points up.
- [ ] Running downwind: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=175&ws=12&ms=100&js=100&cam=map — "Run" is in bold, the no-go wedge points behind you.
- [ ] Tap the red wedge: the card says "No-go zone". Tap the blue arrow: "Apparent wind".
- [ ] Wind instrument: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=12&ms=40&js=100 — Wind tab: the solid needle (apparent) at about 56°, the outlined one (true) at 90°, AWS about 14.5, TWS 12. With `&held=1` added both needles point the same way.
- [ ] Back to 3D: tap "Side" on the camera bar: the boat is drawn again.

#### M8: Heel, forces and weather helm

- [ ] Heel: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=45&ws=20&ms=15&js=0&cam=bow — the boat leans to port (left) about 25–36°, the strip says "Heel … P", and "Heeling a lot" shows after 2 s.
- [ ] Easing helps: same link — Ropes tab → main sheet to 60: the heel gets smaller. Roll the main half in ("Mainsail out" 50): smaller again. (PT-25)
- [ ] Round-up (the boat turns into the wind by herself): https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=50&ws=18&ms=15&js=20 — Wind tab → speed to 28 kn: within half a minute she heels hard, turns towards the wind although the autopilot holds full rudder, and "ROUND-UP" shows. Open the link again, set the main sheet to 50 first, then 28 kn: she holds her course. (PT-32)
- [ ] Weather helm (the boat's pull towards the wind): https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=50&ws=10&ms=15&js=20 then https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=50&ws=20&ms=15&js=20 — Ropes tab: the wheel (turned by the autopilot) is turned further in the stronger wind. (PT-29)
- [ ] Rope loads: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=90&ws=12&ms=40&js=100&sel=rope_mainsheet — the strip shows "Load … kN"; Wind tab → 24 kn: the load grows.
- [ ] A gust makes a rope slip: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?mode=realistic&wd=90&ws=20&js=30&st=starboard&wsb=a5.2.h — open the Genoa sheet clutch: the sheet slips on the winch. With `ws=8` it holds.

#### M9: Trim quality and telltales

- [ ] Good trim: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=40&js=50&cam=side-starboard — Ropes tab → "Sails": Mainsail "Good". Zoom in on the front of the main: the little ribbons (telltales) on both sides stream straight back.
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
- [ ] Wind tab: the five mode buttons, the size slider, "New pattern" and ×1 / ×4 / ×16 work; the dial shows a thin arrow for the wind right now.

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
