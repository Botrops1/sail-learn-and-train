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

The checklists of merged milestones (M0 to M112) are in [`archive/CHECKLISTS.md`](archive/CHECKLISTS.md). A milestone that is not built yet has its checklist here, under a "Checklists" heading, once its phase is planned; the PR of the phase part's sign-off milestone moves the earlier ones to the archive, and the next planning PR moves the last.

### Checklists

#### Training dinghy (M113–M118, [PHASE_DINGHY_SPEC](PHASE_DINGHY_SPEC.md))

New link settings (on the dinghy only): `boat=dinghy` the Training dinghy, `sp` where you sit (`in`, `side`, `out`), `cb` centreboard (% down), `oh` outhaul (% eased), `cap` capsized on that side (`p` / `s`). `cam=helm` is the Sailor view on the dinghy.

#### M113: Choose the training dinghy

- [ ] Welcome: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/ — open it in a private window (or after clearing the site's data): the welcome card has "Start on the training dinghy". Tap it: a small open boat with one sail appears.
- [ ] The boat: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=60&ws=8&ms=40&held=1&sea=flat&cam=side-port — a 3.5 m dinghy: open cockpit, the fin (centreboard) under it, the rudder on the back with a tiller and a thin stick on it (the extension), one sail on a mast with no wires. No wheel, no winches, no cabin, no captain yet.
- [ ] From above: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=60&ws=8&ms=40&held=1&sea=flat&cam=top — straps on the floor, a block on the floor where the mainsheet comes down, the tiller over the back.
- [ ] Choose a boat: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=8 — Settings → Boat: the list has "Hanse 508 (built in)" and "Training dinghy (built in)". Choose the dinghy: the app starts again on it; "Download this boat's profile" is gone. Choose the Hanse again: everything is back.
- [ ] Only what it has: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=60&ws=8&ms=40 — the mode choice has only Learn and Easy; Controls has two lines (Mainsheet, Kicker) and the steering; no Engine, Anchor, Place or Harbour anywhere; the camera menu has no Helm.
- [ ] Steering: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=60&ws=8&ms=40&cam=top — steer to the right with the steering buttons: the boat turns right and the tiller swings to the left.
- [ ] Hanse unchanged: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?wd=60&ws=10&ms=40&js=60&cam=side-port — the Hanse 508 with the captain, as before.
- [ ] Computer size: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=60&ws=8&ms=40&held=1&sea=flat&cam=side-port — the same on a computer.

#### M114: Dinghy sailing

- [ ] Your weight: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=90&ws=16&ms=55&oh=100&sea=flat&cam=bow — in the Balance section tap Sit in: she heels far over. Sit on the side: she comes up to a small lean. Lean out: nearly upright.
- [ ] Light wind: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=90&ws=3&ms=50&sp=side&sea=flat&cam=bow — she leans towards you and a warning says "Heeling towards you: sit further in". Tap Sit in: she comes back up.
- [ ] Let it go: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=60&ws=14&ms=30&sp=side&sea=flat&cam=bow — ease the mainsheet to 100 %: the sail flaps, she comes upright and stops.
- [ ] Centreboard: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=45&ws=10&ms=20&sp=side&cb=0&sea=flat&cam=top — with the board up she slides sideways (watch the wake). Tap + on Centreboard to 100 %: she goes straight.
- [ ] Outhaul: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=90&ws=12&ms=50&sp=side&sea=flat — Outhaul − to 0 %: a little less heel and speed; + to 100 %: a little more.
- [ ] Computer size: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=90&ws=12&ms=50&sp=side&sea=flat&cam=side-port — the Balance section on a computer.

#### M115: The sailor in the dinghy

- [ ] Sitting: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=60&ws=12&ms=40&held=1&sea=flat&cam=side-starboard — a sailor sits against the near side, one hand on the tiller stick, the other holding the mainsheet.
- [ ] On the side and leaning out: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=60&ws=12&ms=40&sp=side&held=1&sea=flat&cam=side-starboard — on the side deck; tap Lean out: feet under the straps, body out over the water.
- [ ] Tack: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=0&ws=10&hdg=315&ms=30&sp=side&sea=flat&cam=top — steer to the right until the wind is on the other side: the boom crosses and the sailor moves across to the new high side.
- [ ] Sailor view: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=60&ws=12&ms=40&sp=side&sea=flat&cam=helm — you look forward from the sailor's seat; the camera menu calls it Sailor.
- [ ] Computer size: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=60&ws=12&ms=40&sp=out&held=1&sea=flat&cam=side-port — the same on a computer.

#### M116: Capsize and righting

- [ ] Going over: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=90&ws=16&ms=55&sp=in&sea=flat&cam=side-starboard — within a few seconds she tips over: "Capsized!", mast and sail on the water, the sailor in the water.
- [ ] Right her: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=90&ws=12&cap=s&sea=flat&cam=side-starboard — tap "Swim round to the centreboard", wait, then "Stand on the centreboard": she comes up, the mainsheet loose, the sailor climbs in.
- [ ] Board up: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=90&ws=12&cap=s&cb=0&sea=flat&cam=side-starboard — after swimming round it says the board is up; tap "Push the centreboard down", then stand on it.
- [ ] Locked: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=90&ws=12&cap=s&sea=flat — while she is over, the mainsheet and steering buttons are greyed with "Right the boat first".
- [ ] Computer size: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&wd=90&ws=12&cap=s&sea=flat&cam=side-starboard — the same on a computer.

#### M117: Learn for the dinghy

- [ ] Only its parts: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&m=learn — search "winch": nothing; search "tiller": Tiller and Tiller extension.
- [ ] Kicker: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&learn=rope_vang — the entry is called Kicker and talks about the dinghy.
- [ ] New entries: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&learn=term_capsize — "Capsize" says what to do; also try https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy&learn=term_hiking
- [ ] Hanse unchanged: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?learn=rope_vang — the Hanse's Vang entry as before.

#### M118: Dinghy exercises

- [ ] The list: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy — choose the Exercise mode: one group, Dinghy, with Go and stop, Tack, Gybe, Capsize and right her.
- [ ] Watch: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy — start "Capsize and right her" with Watch it: the pilot swims round, pushes the board down, stands on it and climbs in.
- [ ] Do it yourself: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy — start "Go and stop" with Do it myself and follow the step card to the end.
- [ ] Tack yourself: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?boat=dinghy — start "Tack" with Do it myself: after the tack the card asks you to sit on the new high side.
- [ ] Hanse unchanged: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/ — on the Hanse the exercise list is as before, without the Dinghy group.
