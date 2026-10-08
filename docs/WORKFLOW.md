# Workflow: building Phase 1 from a phone

For the owner. How to run each milestone with Claude Code in the cloud, what to paste, and how to check the result without sailing knowledge.

Live site (after the first deploy): **https://botrops1.github.io/sail-learn-and-train/**

## 1. One-time setup (about 10 minutes)

1. **Merge the starter-pack PR** (this file arrives with it) in the GitHub app.
2. **Turn on GitHub Pages.** The GitHub app may not show this setting, so use the mobile browser: github.com → `Botrops1/sail-learn-and-train` → **Settings** → **Pages** → *Build and deployment* → Source: **GitHub Actions**. (If the menu is hidden, use the browser's "Desktop site" option.)
3. **Claude app → Code tab:** make sure GitHub is connected and `Botrops1/sail-learn-and-train` is selectable. The default cloud environment is fine; nothing to configure.

## 2. The loop for each milestone

1. Start a **new** Code session on `Botrops1/sail-learn-and-train` (one session per milestone keeps it focused and saves usage).
2. Set model and effort (table in section 4), then paste the milestone prompt from section 3.
3. Wait. Claude works, runs the tests, takes screenshots and opens a PR. You can close the app meanwhile.
4. In the PR (GitHub app): read "What changed", open the screenshots, check that CI is green.
5. **Merge.** About 2 minutes later the site updates. Pull to refresh on the phone and check that the **version in the footer** matches the merged commit (the first 7 characters).
6. Go through the milestone checklist (section 5). Tick what works.
7. Problems? In the same session, describe them with the bug template (section 3.4). Claude fixes them on a new branch and opens another PR.
8. Optional for M2 and M3: run the **review prompt** (3.3) in a fresh session before merging. A second pair of eyes is cheap compared with debugging later.

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
Bug on the live site (version <footer hash>), phone <model>, <portrait/landscape/unfolded>.
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
| M5 polish, small fixes | Sonnet | medium | Fast, light on usage |
| Reviews (3.3) | Opus | high | Finding subtle problems |

Usage: cloud sessions share your plan's limits with normal chat. One session at a time is enough. If a session gets very long, type `/compact`.

## 5. Checklists (what to look for on the phone)

Test links set the app to a known state. Base: `https://botrops1.github.io/sail-learn-and-train/`. Parameters: `wd` wind from (°, + = starboard), `ws` wind speed (kn), `ms` mainsheet, `js` jib sheet, `vg` vang, `tl` topping lift, `mf` mainsail out, `jf` jib out (all %), `cam` camera.

### M0: Scaffold

- [ ] The site opens. The footer shows a version that matches the merged commit.
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

### M3: Self-tacking jib

- [ ] `?wd=30`, then `wd=-30`: the car slides across the track and the jib fills on the other side. (PT-10)
- [ ] `?wd=0`: the jib flaps in the middle.
- [ ] `?wd=90&js=0`, ease the jib sheet to 100 %: the jib opens only to about 30–35°, and its top twists more than its bottom. (PT-11)
- [ ] `?js=0`, try to furl the jib: it stops with a hint to ease the sheet. Ease the sheet: furling continues. (PT-13)

### M4: Clutch-bank panel

- [ ] Ropes tab: the two clutch banks look like the photos, with the labels exactly as on the boat.
- [ ] Tapping "Vang" highlights the vang in 3D and shows its slider. Tapping a rope in 3D selects it in the panel.
- [ ] Tapping either "Main sheet" clutch highlights the same rope and says "one rope, two ends".
- [ ] "Main halyard" and "SPI HALYARD" show an info line, not a slider.
- [ ] Step size 1 % / 5 % works for the slider and the +/− buttons. Holding a +/− button repeats.
- [ ] The wheel control turns both wheels and the rudder.
- [ ] Share copies a link; opening it in another tab shows exactly the same state. Reset restores the defaults.

### M5: Phase 1 sign-off

- [ ] `?debug=1` on your phone: FPS mostly 50 or more, never below 30 while dragging sliders.
- [ ] Works portrait, landscape and on a foldable or tablet if available.
- [ ] Disclaimer in the footer. README describes what the app is.
- [ ] Every item of the Definition of Done in `PHASE1_SPEC.md` is ticked in the PR.

## 6. After Phase 1

- Ask a Russian-speaking sailor to look at `content/registry/parts.json` (or a printable list Claude can generate) and the clutch-bank screen. Mark reviewed terms `sailor-reviewed`.
- Answer the open questions in `docs/BOAT_REFERENCE.md` if you get the chance.
- Then plan Phase 2 here in chat before starting it in Claude Code, the same way as Phase 1.
