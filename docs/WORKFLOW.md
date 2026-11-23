# Workflow: building the app from a phone

For the owner. How to run each milestone with Claude Code in the cloud, and how to check the result without sailing knowledge.

Live site (the latest release): **https://botrops1.github.io/sail-learn-and-train/**. What is merged into `main` but not released yet: `https://botrops1.github.io/sail-learn-and-train/next/`.

Not sure what to do next? New session, type **`/status`**: it lists the open PRs, what waits on you and the next command.

Each open pull request (PR) also has its own **preview** at `https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/` (`<N>` = the PR number). A bot comment on the PR carries the link and is updated on every push; the preview is deleted when the PR is merged or closed. Test there **before** merging.

## 1. One-time setup

1. **GitHub Pages** (done): Settings → Pages → Deploy from a branch → `gh-pages`, `/ (root)`.
2. **Claude app → Code tab:** GitHub connected and `Botrops1/sail-learn-and-train` selectable. The default cloud environment is fine.
3. **Two GitHub settings** (about 3 minutes, in the phone's browser on github.com with "Desktop site" on, or on the PC):
   - **Merge only when the checks pass:** Settings → Branches → Add branch protection rule (or "Add classic branch protection rule") → Branch name pattern `main` → tick **Require status checks to pass before merging** → in the search box add `check` and `browser-checks` → **Create**. The Merge button then stays grey while a check is red or still running.
   - **Tidy branches:** Settings → General → Pull Requests → tick **Automatically delete head branches**.

## 2. The loop for each milestone

1. Start a **new** Code session on `Botrops1/sail-learn-and-train`. Model: **Sonnet**, effort **high** (section 4).
2. Type **`/milestone 11`** (the milestone's number). Nothing else to paste.
3. Wait. Claude builds and tests, then has the work **reviewed by a second, independent Claude** (Opus for physics milestones, Sonnet for the others) and fixes everything the review marks "should fix". Then it opens a PR and **watches it** until CI is green and nothing waits on it, then stops (about 45 minutes later) and says so on the PR. You can close the app meanwhile.
4. In the PR (GitHub app): read "What changed", check that CI is green (`check`, `browser-checks`, `preview`).
   **The review is the PR's first comment**: each finding, and under it what was fixed. You do not have to start anything. If you disagree with a fix, comment e.g. "undo review fix 2". For a second opinion on a risky PR you can still start a new session (**Opus**, medium) and type **`/review <PR number>`**.
5. Open the preview from the bot comment. Check that the **version in Settings → About** matches the PR's latest commit (first 7 characters, PR → Commits).
6. Go through the checklist links in the PR description. Tick what works.
7. **Answer and report problems as one comment on the PR**, in the GitHub app: your answers to the questions, any review fix to undo, and anything you found. Every question has a recommendation, so "accept all" is a valid answer, or "accept all except 2: …". For a bug, use the template in 3.2. The recommended answers are already recorded, so if everything works you just merge: **merging means "accept all"**. If the session is still watching, it picks your comment up by itself, fixes, records changed answers and replies on the PR. If the PR says **"Stopped watching"**, start a new session (Sonnet, high) and type **`/milestone resume <PR number>`**: it reads your comment from the PR and does the same. No copying between sessions.
8. Test again on the updated preview (the reply names the new version in Settings → About).
9. **Merge** when the preview works and CI is green. About 2 minutes later the newest work is at `https://botrops1.github.io/sail-learn-and-train/next/` and the preview is removed. The normal address changes only when you publish a release (below).

**CI on a PR** (from M83): the browser checks run the smaller PR set (about 15 minutes); a PR that only changes documents runs none. The full set runs every night on `main` and before every release.

An issue called *Nightly checks failed* means the full checks found a problem on `main` overnight. Open a new Code session and type the line the issue gives (`/bug …`). An issue called *Flaky check: …* means a check failed once and passed when run again; it needs no action from you, the next session that meets it fixes it.

**One milestone at a time.** Two milestones in parallel edit the same files and need a third session to sort out the overlap. A planning or review session next to the milestone is fine.

**How to publish a release** (M84). Do this on github.com in the phone's browser (the GitHub app may not show the button): Actions → **Release** → Run workflow → branch `main`, version without the v (e.g. `0.9.0`; the rule is in CONTRIBUTING: `0.9.0` quiet beta, `1.0.0` announcement day, `1.x.0` features, `1.x.y` fixes only) → Run. It takes about 35 minutes (the full checks run first, about 30 minutes, then the publish). When it is green: the live site shows the new version in Settings → About, and Releases lists it with its notes and a `.zip` of the site. If only the last step ("Create the release") fails, run it again with the same version. If a version number already exists, the run stops at once and says so. Do not merge anything while it runs (about 35 minutes): in the rare case that a merge lands while a "Deploy next" is still running, GitHub cancels the waiting Release. If it shows **Cancelled**, nothing was published; run it again with the same version.

If a merge breaks the site, only `/next/` is broken (the live site changes only with a release). Open the merged PR in the GitHub app and tap **Revert**. That creates a PR that undoes it; merge that. If a bad *release* reached the live site, revert the PR the same way, merge it, then run **Release** again with the next number (e.g. `0.9.1`): an old version number cannot be published again, because its tag already exists.

## 3. Commands and templates

### 3.1 Commands (type them in a Code session)

| Command | When |
|---|---|
| `/milestone <N>` | Build milestone M<N> (section 2) |
| `/milestone resume <PR number>` | Continue a milestone or bug PR whose session has stopped watching: write your comment on the PR first (Sonnet, high) |
| `/review <PR number>` | A second opinion on an open PR (Opus, medium). Optional: every milestone is already reviewed inside `/milestone`, before its PR opens |
| `/bug <link> <what happened>` or `/bug issue <number>` | A bug on the **live** site, after merge, or a failed nightly check. Get the link from Settings → Share. Claude fixes it in a small PR and watches it. A problem on a PR's preview is not a `/bug`: comment on that PR |
| `/status` | What waits on you and what to type next (Haiku; about a minute; it changes nothing) |
| `/plan <phase number>` | Before a new phase (Opus, high). Claude asks you its questions first (each with a recommendation), then writes the spec and checklists in a docs-only PR. `/plan issue <N>` plans an extra milestone from an issue. A big phase (more than 6 milestones) is planned in parts: `/plan <N>b` in a new session for the next part. The planning session stops once the PR is open; merging accepts every recommendation. To change an answer, comment on the PR, then type `/plan answers <PR number>` in a **new** session (Sonnet, medium). After merging, start with `/milestone <N>` (Sonnet) |

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
| `/milestone`, `/milestone resume` | Sonnet | high |
| `/plan` | Opus | high |
| `/review` (second opinion) | Opus | medium |
| `/bug`, `/plan answers`, small doc changes | Sonnet | medium |
| `/status` | Haiku | low |

The review inside `/milestone` picks its own model (Opus, medium, for milestones the spec marks "review required"; Sonnet, medium, for the others): nothing to set.

Opus 5.5 at medium does as well as earlier Opus models at high on coding and code review, and at each level it thinks more than they did (Anthropic's prompting guide, 2026-10-24). So `/review` runs at medium; `/plan` stays at high because every gap in a spec becomes a builder's guess. Do not use `xhigh` or `max`: they cost more with no gain shown here. If a session thinks for too long, lower the effort; asking it in words to think less works less well.

The commands also name their model (`/milestone` and `/bug` Sonnet, `/plan` and `/review` Opus, `/status` Haiku), so a wrong model setting is corrected while the command runs. Still set the model and effort when you start the session: the later rounds (your PR comments) run on the session's own model, and effort is not set by the command.

Usage: cloud sessions share your plan's limits with normal chat. What costs the most is a long session: every step re-reads everything said so far. So one session per milestone, and start a new one for unrelated work instead of continuing an old one. If you have corrected a session twice on the same problem and it still gets it wrong, stop: start a new session and describe the problem once, completely (what you did, what you saw, what you expected, the Share link). A fresh session with a better message almost always does better than a long one full of corrections.

## 5. Checklists (what to look for on the phone)

Test links set the app to a known state. Base: the PR's preview, `https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/` (the links below use the live site; the same `?…` part works after the preview address). Parameters: `wd` wind from (°, + = starboard), `ws` wind speed (kn), `ms` mainsheet, `js` jib sheet, `vg` vang, `tl` topping lift, `mf` mainsail out, `jf` jib out (all %), `cam` camera. Since M4a also `rd` wheel (° of rudder, + = to starboard), `sel` the selected rope or part, `jr` how far the jib is out when the sheet was hauled against a furled jib (written by Share), `lg=0` legend hidden. Since M4b also `mode=realistic`, `st` the station (`starboard`, `helm`), `co` the open clutches (e.g. `co=a5` = Genoa sheet), `wp` / `wsb` the rope on the port / starboard winch (e.g. `wsb=a5.3.t` = Genoa sheet, 3 turns, tail in the self-tailer). Since M4c also `st=mast`, `hd` where the winch handle is (`c` = you carry it, and your hand is full: no rope can be worked, `mast.w` = in the gearbox socket, `starboard.w` = in the starboard winch, `port.s` = lying at Port, where it starts), `gb=in` the gearbox switch. Since M5 also `lb=0` labels in 3D off (they are on by default).

The checklists of merged milestones (M0 to M103) are in [`archive/CHECKLISTS.md`](archive/CHECKLISTS.md). A milestone that is not built yet has its checklist here, under a "Checklists" heading, once its phase is planned; the PR of the phase part's sign-off milestone moves the earlier ones to the archive, and the next planning PR moves the last.

### Checklists

#### Rigging detail (M105–M110, [PHASE_RIGGING_SPEC](PHASE_RIGGING_SPEC.md))

New link settings: `gn` gennaker rigging step (0 stowed, 1 tack line on, 2 sheets led, 3 halyard on, 4 hoisted in its sock), `gx` its side (`p` / `s`), `gs` gennaker sheet (% eased), `gu` gennaker sock (% up), `pic` a picture (`spinnaker`, `code0`, `traveller`), `tv` the traveller car (−100…100).

#### M105: Gennaker rigged

- [ ] Rig it from Settings: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=120&ws=10&ms=60&jf=0&held=1&sea=flat&cam=side-starboard — open Settings, find Gennaker and tap Rigged: a long tube (the sock with the sail inside) runs from the bow to the top of the mast, with red lines (the sheets) along both sides to the stern. Tap Stowed: it disappears.
- [ ] Step 1, the bag: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=120&ws=10&ms=60&jf=0&held=1&sea=flat&gn=1&cam=bow — a bag at the bow with a short red line (the tack line) from the bow fitting to it.
- [ ] Step 2, the sheets: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=120&ws=10&ms=60&jf=0&held=1&sea=flat&gn=2&cam=top — two red lines from the bag along the outside of each side, outside the posts and wires round the deck, to a block near the stern and on to the big winch on that side.
- [ ] Step 3, the halyard: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=120&ws=10&ms=60&jf=0&held=1&sea=flat&gn=3&cam=side-starboard — the halyard comes down from the top of the mast in front of the forestay to the bag.
- [ ] Step by step: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=120&ws=10&ms=60&jf=0&held=1&sea=flat&gn=1&cam=side-starboard — in the Sails section, the Gennaker block lists four steps, the first ticked. Tap Next step three times and watch each step appear; tap Undo a step once and the last one goes.
- [ ] Learn: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?m=learn&learn=rope_gennaker_sheet_port — the entry explains the two sheets and the lazy one. Tap Where is it?: the camera flies to the port sheet.
- [ ] Computer size: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=120&ws=10&ms=60&jf=0&held=1&sea=flat&gn=4&cam=side-starboard — the same picture on a computer.

#### M106: Sailing with the gennaker

- [ ] Set it: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=120&ws=12&ms=60&jf=0&gn=4&gx=p&gs=25&ap=wind&apt=120&sea=flat&cam=side-port — the gennaker is up in its sock. In the Sails section press + on Sock until 100: the sock rides up, the big sail opens on the near (port) side and the speed goes up by about 3 to 4 knots (from about 5.7 to about 9.2).
- [ ] Trim to the curl: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=120&ws=12&ms=60&jf=0&gn=4&gx=p&gs=25&ap=wind&apt=120&sea=flat&gu=100&cam=helm — in the Sails section press + on Sheet a few times: the trim line says "Front edge curling: trim a little". Press − twice: "Drawing well".
- [ ] Trimmed too hard: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=120&ws=12&ms=60&jf=0&gn=4&gx=p&ap=wind&apt=120&sea=flat&gu=100&gs=0&cam=side-starboard — the trim line says "Pressed against the main: ease the sheet": the sail lies against the main and does not go through it; the boat leans more and is slower than at 25. Press + on Sheet until the line reads "Drawing well".
- [ ] Too close to the wind: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=75&ws=18&ms=40&jf=0&gn=4&gx=p&gu=100&gs=0&ap=wind&apt=75&sea=flat&cam=side-starboard — the boat heels a lot and the "overpowered" alert shows.
- [ ] Dead downwind: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=180&ws=12&ms=100&jf=0&gn=4&gx=p&gu=100&gs=80&sea=flat&cam=top — the gennaker hangs limp behind the main; the trim line says "Hidden behind the main".
- [ ] Gybe it: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=120&ws=12&ms=60&jf=0&gn=4&gx=p&gs=25&ap=wind&apt=120&sea=flat&gu=100&cam=top — tap Gybe the gennaker: the sail swings round in front of the bow to the other side, where it has no wind (the boat has not turned), and the Sails section says "On the wrong side: gybe it". Tap it again: it comes back and fills.
- [ ] Take it in: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=120&ws=12&ms=60&jf=0&gn=4&gx=p&gs=25&ap=wind&apt=120&sea=flat&gu=100&cam=side-starboard — press − on Sock to 0: the sock comes down over the sail.

#### M107: Gennaker sheets on the winches

- [ ] No clutch: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?mode=realistic&st=port&wd=120&ws=12&ms=60&jf=0&gn=4&gx=p&gs=25&ap=wind&apt=120&sea=flat&gu=100&cam=helm — at the Port station the gennaker sheet is shown with no clutch. Wait a few seconds: the sheet runs out and the sail flaps.
- [ ] On the winch: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?mode=realistic&st=port&wd=120&ws=12&ms=60&jf=0&gn=4&gx=p&gs=25&ap=wind&apt=120&sea=flat&gu=100&cam=helm — put the gennaker sheet on the winch (three turns, into the self-tailer) and crank: the sail fills and the trim line says "Drawing well".
- [ ] The lazy sheet does nothing: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?mode=realistic&st=starboard&wd=120&ws=12&ms=60&jf=0&gn=4&gx=p&gs=25&ap=wind&apt=120&sea=flat&gu=100&cam=helm&wp=g1.3.t — the working sheet is already held on the Port winch. At the Starboard station put the other gennaker sheet on the winch and crank it: the sail does not change, because that one is the lazy sheet.

#### M108: Gennaker exercises

- [ ] The list: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?m=exercise — in the Sails group there are three new exercises: Rig and hoist the gennaker, Gybe the gennaker, Take the gennaker down.
- [ ] Watch: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?m=exercise&ex=gennaker-rig — tap Watch it: the app rigs, hoists, sets and trims the gennaker step by step.
- [ ] Do it yourself: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?m=exercise&ex=gennaker-rig — tap Do it myself and follow the steps with the buttons in the bar.
- [ ] Gybe: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?m=exercise&ex=gennaker-gybe — Watch it, then try it.
- [ ] Take it down: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?m=exercise&ex=gennaker-douse — Watch it: the boat turns downwind first, so the main hides the gennaker before the sock comes down.

#### M109: Spinnaker and code 0 pictures

- [ ] Spinnaker: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?m=learn&learn=sail_spinnaker — the entry says it is not on this boat. Tap Show it working: a big sail ahead of the mast on a pole that sticks out to starboard (the side the wind comes from, so towards you in this view), with a card saying it is a picture. Tap Close picture.
- [ ] The guy: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?m=learn&learn=rope_spinnaker_guy — Show it working: the line from the pole's end back to the stern (the guy) is drawn along the deck edge; it is not lit up, the picture shows every line in the same colour.
- [ ] Code 0: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?m=learn&learn=sail_code_zero — Show it working: a flat sail from the bow on its own roller, wind from ahead of the side.
- [ ] Compare: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?m=learn&learn=term_downwind_sails — the entry compares the gennaker, the spinnaker and the code 0.

#### M110: Main traveller picture

- [ ] Traveller: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?m=learn&learn=part_traveller_track — Show it working: a track across the back of the coachroof with a car, the mainsheet going from the car up to the boom; this boat's own mainsheet is hidden. Pinch to zoom in on the back of the coachroof: the track is dark, the car is an orange cube and the sheet is an orange line up to the boom.
- [ ] Move the car: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?pic=traveller&tv=-60&wd=60&ws=10&ms=30&jf=0&held=1&sea=flat&cam=top — the car is to the left (port) and the boom is out to that side. Drag the Car slider to the middle: the boom comes in to the centre; the sheet stays nearly straight up and down.
- [ ] Back to normal: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?pic=traveller&tv=-60&wd=60&ws=10&ms=30&jf=0&held=1&sea=flat&cam=top — tap Close picture: the German mainsheet is back.

#### People on board, part 1 (M111–M112, [PHASE_PEOPLE_SPEC](PHASE_PEOPLE_SPEC.md))

No new link settings: `st` is still the Realistic station and `tx` the time speed.

#### M111: The captain on board

- [ ] At the wheel: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=10&ms=40&js=60&held=1&sea=flat&cam=side-port — a man in a dark blue jacket and a white captain's cap, with black curly hair and beard, stands behind the near (port) wheel with his hands on it, and leans with the boat.
- [ ] Through his eyes: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=10&ms=40&js=60&held=1&sea=flat&cam=helm — the Helm view: you do not see him, because you are him. Tap Other wheel: still not visible. Choose Side (port) from the camera chip: he now stands behind the far (starboard) wheel.
- [ ] Tap him: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=10&ms=40&js=60&held=1&sea=flat&cam=side-port — tap the captain: the card says "Captain (you)"; tap More for his Learn entry.
- [ ] At the bow: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?mode=realistic&st=bow&wd=60&ws=10&ms=40&js=60&held=1&sea=flat&cam=side-starboard — Realistic ropes: he stands on the foredeck behind the anchor winch. In the Ropes section tap Port: he is at once beside the port winch, next to the wheel.
- [ ] At the mast: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?mode=realistic&st=mast&wd=60&ws=10&ms=40&js=60&held=1&sea=flat&cam=side-port — he stands on the cabin roof just behind the mast.
- [ ] Low detail: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=10&ms=40&js=60&held=1&sea=flat&cam=side-port&detail=low — a simpler captain (chunkier hair) in the same place.
- [ ] Still smooth: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=10&ms=40&js=60&sea=flat&cam=side-port — turn the view round with a finger: it moves as smoothly as before the captain came.
- [ ] Computer size: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=10&ms=40&js=60&held=1&sea=flat&cam=side-port — the same picture on a computer.

#### M112: The captain walks

- [ ] Walk to the bow: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?mode=realistic&st=port&wd=60&ws=10&ms=40&js=60&sea=flat&cam=top — in the Ropes section tap Bow: he walks past the wheels, out over the rope box behind the winch onto the right-hand (starboard) side deck outside the cockpit wall, the side the wind comes from, and along it to the foredeck, without crossing the cockpit's hood. Under the station buttons "Walking to Bow… 9 s" counts down.
- [ ] Wind from the other side: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?mode=realistic&st=port&wd=-60&ws=10&ms=40&js=60&sea=flat&cam=top — tap Bow: this time he walks along the left-hand (port) side deck.
- [ ] Wait until you get there: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?mode=realistic&st=port&wd=60&ws=10&ms=40&js=60&sea=flat&cam=top — tap Starboard and at once try to put a line on the winch there: "Still walking: wait until you get there." A second or two later it works.
- [ ] Turn back: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?mode=realistic&st=port&wd=60&ws=10&ms=40&js=60&sea=flat&cam=top — tap Bow, and a few seconds later tap Port: he turns round and walks back to the port winch.
- [ ] Exercise: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?m=exercise&ex=set-sails — choose Watch it: the captain walks between the winches and the wheel as each step needs, and the exercise finishes.
- [ ] Computer size: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?mode=realistic&st=port&wd=60&ws=10&ms=40&js=60&sea=flat&cam=top — the same walk on a computer.
