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

The checklists of merged milestones (M0 to M118) are in [`archive/CHECKLISTS.md`](archive/CHECKLISTS.md). A milestone that is not built yet has its checklist here, under a "Checklists" heading, once its phase is planned; the PR of the phase part's sign-off milestone moves the earlier ones to the archive, and the next planning PR moves the last.

### Checklists

Console, part A ([PHASE_CONSOLE_SPEC](PHASE_CONSOLE_SPEC.md)). Check on a computer, and on the Fold unfolded where a line says so; the phone checks are on a phone.

#### M119: Console shell

- [ ] The console: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=40 — on a computer: the boat fills the whole window; a dark band along the bottom holds Steering, Engine and Sails; the side columns are gone.
- [ ] The menu: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=40 — click Lines in the menu at the top right: a drawer with the lines opens; click Learn: the drawer changes to Learn; press Esc: it closes.
- [ ] Fold: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=40 — on the Fold unfolded, held both ways: the console both ways. Folded (the cover screen): the phone layout with the sheet.
- [ ] Realistic: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=40&mode=realistic — the middle block shows the Helm station.
- [ ] Phone unchanged: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=40 — on the phone: the sheet and its tabs as before, no band.
- [ ] Dinghy: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=60&ws=8&ms=40 — the band shows the tiller and the Balance controls; the menu has no Harbour gear or Place.

#### M120: Wheel and engine

- [ ] Wheel: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=40 — drag the wheel round with the mouse (on the Fold, with a finger): the angle under it changes and the boat turns.
- [ ] Autopilot: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=40 — press Auto: the wheel stops taking a drag and a line says the autopilot is steering; press Standby: you steer again.
- [ ] Engine: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=40 — press Start, then drag the lever up: it says Ahead and the rpm rises.
- [ ] Thrusters at sea: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=40 — hold the right half of the bow thruster (or the D key): the bow swings, in open water.
- [ ] Sails strip: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=95 — the strip above the wheel says "Main: Luffing"; More opens the Sails drawer.
- [ ] Walk to the helm: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=40&mode=realistic&st=starboard — the wheel is covered by a "walk to the helm" button; press it: the captain walks, then the wheel works.
- [ ] Tiller: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=60&ws=8&ms=40 — drag the tiller to the left: the dinghy turns to the right.

#### M121: Port and starboard lines

- [ ] Easy lines: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=40 — the left block has topping lift, main sheet, vang and jib furling; the right block has main sheet, main furling and jib sheet; + on one main sheet moves both.
- [ ] Keys: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=40 — W and S move the main sheet, R and F the jib sheet.
- [ ] Realistic: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=40&mode=realistic&st=starboard — both clutch banks with their winches show; the left one says "Walk to port"; press it: the captain walks across and the winch tools move to the left.
- [ ] Fold: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=40&mode=realistic&st=starboard — on the Fold unfolded: the winch tools rise above the right block without covering the wheel.
- [ ] Dinghy: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=60&ws=8&ms=40 — its two lines (main sheet, kicker) on the left.

#### M122: Harbour gear and conditions

- [ ] Folded: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?pl=marina&wd=60&ws=8 — a narrow "Harbour gear" strip at the right end of the band; click it: fenders, mooring lines and the anchor unfold and the other blocks get narrower; click again: it folds.
- [ ] Fold: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?pl=marina&wd=60&ws=8 — on the Fold unfolded: the harbour gear rises above the band on the right.
- [ ] Anchor in Realistic: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?pl=bay&mode=realistic&wd=60&ws=8 — unfold the harbour gear and hold Down: chain goes out.
- [ ] Compass: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=40 — the compass at the top right shows 12 kn; click it: Conditions open; choosing a wave size does nothing until you turn Set up on, then it works.

#### M123: Exercises on the console

- [ ] Outline: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12 — choose Exercise in the mode chip and start "Trim through the points of sail" with Do it myself: both main sheet rows, Main and Jib in the sails strip and the compass have a slow orange outline; the other blocks are dimmed; there is no step bar.
- [ ] Show me: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12 — in the same exercise, press Show me on the step card: the app plays the step.
- [ ] Realistic: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?mode=realistic — choose Exercise and start "Setting the sails" with Do it myself: on the step that needs the starboard winch, the outline shows where to walk and which clutch to open.
- [ ] Harbour: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?pl=marina — choose Exercise and start "Entering the berth stern-to" with Do it myself: at the fenders step the harbour gear unfolds by itself with the fenders outlined.
- [ ] Phone unchanged: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12 — on the phone, the same exercise has its step bar as before.

#### M124: What you are doing, and controls

- [ ] Two choices: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=40 — the chip at the bottom right says "Sail freely · Easy"; open it: "What you are doing" and "Controls"; choose Realistic: the chip says "Sail freely · Realistic" and the line blocks show the clutch banks.
- [ ] Learn: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=40 — choose Learn: the chip says "Learn".
- [ ] Old harbour link: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?m=harbour&pl=marina&wd=60&ws=8 — opens Sail freely at the marina; on the phone the Controls tab starts with the engine, as Harbour mode did.
- [ ] Phone: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=12&ms=40 — on the phone the Mode tab shows the two groups.
