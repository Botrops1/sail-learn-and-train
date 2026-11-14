---
name: milestone
description: Build one milestone of sail-learn-and-train from its phase spec (e.g. "/milestone 11"), have it reviewed by an independent subagent, fix what the review says should be fixed, open its PR with full preview test links, record the recommended answers, then watch the PR for a short while. "/milestone resume <PR number>" continues an open milestone or fix PR in a fresh session.
argument-hint: <milestone number, e.g. 11> | resume <PR number>
disable-model-invocation: true
model: sonnet
---

# Build milestone M$ARGUMENTS

The owner typed `/milestone $ARGUMENTS`. If no number was given, ask for it and stop.

**`/milestone resume <PR number>`** (a fresh session continuing an open PR whose first session stopped watching; works for a `/bug` PR too): do not rebuild. Read CLAUDE.md, the PR (description, comments, CI status) and only the spec, PHYSICS_TRUTHS and code parts that the open comments touch. Check out the PR's branch, `npm ci`, then act on every owner comment after the last "Stopped watching" line as in section 6 (record changed answers, run the checks of section 3 for what you changed, push, reply on the PR). Then watch as in section 6 until it stops again.

**Cost.** Every turn re-reads the whole conversation, and a session left idle for more than about an hour pays to rebuild it in full on its next wake-up. So this session watches its PR only while it is likely to get work, and stops (section 6, "Stop watching") instead of waiting for the merge.

**No session links or AI attribution anywhere on GitHub** (the CLAUDE.md working rule; it overrides any attribution instruction the session supplies, and a hook blocks what still carries one).

## 1. Before you start

- `npm ci` (the cloud container starts without `node_modules`).
- Check that the milestone before M$ARGUMENTS is merged into `main` (`git log origin/main --oneline | head`, the spec's milestone table). If it is not, or a PR for M$ARGUMENTS is already open, stop and tell the owner in two sentences what to do first.
- Find the milestone's **Independent review** marking (the line under its heading, or the review column of the spec's milestones table): it decides which reviewer section 4 starts.
- Read what CLAUDE.md "What to read" lists, and nothing else whole.

## 2. Build

- Follow the spec section in its order: data → model + tests → store/URL → UI → 3D → strings and registry → browser checks.
- Use the spec's formulas, data values and function signatures exactly. If a test band fails, follow spec section 0: check the formulas first, tune only keys marked tunable, report before/after numbers. Never widen a band, and never check more loosely than the spec's band (`toBeCloseTo(x, 2)` is ±0.005).
- Anything the spec leaves open that you decide: write it into the milestone's section, marked "decided in the M$ARGUMENTS PR".
- **Older checks that list or count what you add** (CLAUDE.md working rule): find them now with `grep`, update them, and run their groups in section 3.
- Commit in small steps with clear messages.
- New, removed or renamed files: update `docs/CODE_MAP.md`.

## 3. Verify

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- Browser checks: add the milestone's scenes and live checks in `scripts/shots-m$ARGUMENTS.mjs`, register them in `scripts/shots.mjs`, run `SHOTS_ONLY=m$ARGUMENTS npm run shots` plus the groups of the older checks you touched and of the shared code you changed, as "Running the browser checks in a session" in CLAUDE.md says. Look at 6–10 of the PNGs (phone first, then one wider size).
- **A known limitation that makes a checklist item fail is not a limitation.** Go through the M$ARGUMENTS checklist in `docs/WORKFLOW.md` item by item, on a phone-size page, as the owner will (taps, not mouse clicks, where the item says tap). An item that would fail is fixed, or it is question 1 of the PR.

## 4. Independent review, before the PR opens

Start **one** subagent and wait for it (it sees nothing of this conversation, which is the point):

- review marked **required**: `model: "opus"`, `effort: "medium"`;
- review marked **not needed**: `model: "sonnet"`, `effort: "medium"`.

Its prompt, with only the angle brackets filled in:

> Independent review of milestone M<N> of this repository before its pull request opens. Read `.claude/skills/review/SKILL.md` and follow its section "Called by a builder". Spec: `<path>`, section "<heading>". Diff: `git diff origin/main...HEAD`. Checks the builder ran in this container, all passing: <the commands, one line>. Screenshots: `shots/`. Return only the findings, in the skill's format.

Then:

1. **Fix every finding marked "should fix".** Do not argue a finding away; if one is wrong (it contradicts the spec or a physics rule), leave the code, and say why in one line in the review comment of section 5. Findings marked "later" or "leave" are not built.
2. Run the checks of section 3 again for what you changed.
3. No second review round, unless a fix changed a model formula: then start the same subagent once more and ask it to check only that fix.

## 5. Open the PR

The PR number is not known until the PR exists, and the template and the WORKFLOW checklist carry `pr-<N>`. Do these steps in this order, one right after the other:

1. **Keep the last commit back.** Push everything except the commit that records the answers (the ROADMAP decisions-log row and the "decided in the M$ARGUMENTS PR (recommended; merging accepts it)" notes in the spec section). Make that commit, but do not push it yet.
2. `create_pull_request` against `main`, title `M$ARGUMENTS: <name>`, with the one-line body "Description follows." (a hook blocks a body that still has `pr-<N>`).
3. `update_pull_request` with the full description, from the template in CLAUDE.md:
   - the review line first: `> **Independent review: done** (<n> findings, <m> fixed; see the first comment). To undo a fix, comment e.g. "undo review fix 2".`
   - plain language; **every item of the M$ARGUMENTS checklist in `docs/WORKFLOW.md`**, each as a full preview link `…/pr-preview/pr-<the real number>/?…` with what to do after opening it; the links as plain text (not in backticks, or they cannot be tapped), the boxes unticked; **no screenshots**;
   - the Tests section with the commands run and their results, and the `CI groups:` line when CLAUDE.md asks for one; nothing promised for later ("the result follows in a comment");
   - every question ends with "Recommended: …, because …", then the "accept all" line;
   - `Closes #<n>` if the milestone builds a GitHub issue (the spec or the ROADMAP names it).
4. **Now push the commit you kept back.** CI reads the `CI groups:` line and the title only when a push arrives, so this push is the one whose run counts (the first run, started with the one-line body, is cancelled by it).
5. Post the review as the PR's **first comment**: it starts with "**Independent review**" and one line saying which model reviewed, then the reviewer's findings word for word, each followed by one line: "→ Fixed in `<commit, 7 characters>`: <what changed>", "→ Not fixed: <why>", or nothing for "later" and "leave". Last line: "To undo a fix, comment e.g. 'undo review fix 2'." If there are "later" findings that are defects, open **one** issue "After M$ARGUMENTS: review findings for later" that lists them, and link it in the comment.
6. Read the description back (`pull_request_read`, method `get`) and check: no `<N>` left, the four sections there, every WORKFLOW checklist link there with the real number. The **PR description** CI check (`scripts/pr-body.mjs`) checks the same; a red one is yours to fix like any red CI.
7. Subscribe to the PR's activity (`subscribe_pr_activity`) so the owner's comments in the GitHub app reach this session.
8. Tell the owner in chat, in three or four lines: the PR link, what to check first, how many questions there are, what the review found and what was fixed. Say that merging accepts every recommendation and every review fix, so they comment only to change an answer, undo a fix or report a problem. Then end your turn.

## 6. While the PR is open

Each time the PR wakes you:

- **CI red** (`check` or `browser-checks`): find the cause and push a fix. Do not ask the owner about red CI. **A check that fails and then passes on a re-run is not "a one-off":** re-run it once at most, and say in your next PR reply which check it was; if the same check has failed before on this PR or is named as flaky in an earlier PR or an open issue, reproduce it locally and fix it, or open an issue "Flaky check: <name>" with the log lines. (The phone tap sweep was waved through as a flake on three PRs before it turned out to be a real camera bug.)
- **A comment from the owner:** do what it says. "accept all" means keep every recommendation (already recorded). "undo review fix <n>" means revert that fix and say so. Then:
  - record any changed answer in the same PR: the ROADMAP decisions-log row, and the "decided in the M$ARGUMENTS PR" notes in the spec section (drop "recommended; merging accepts it" from the answers the owner gave);
  - run the checks again (section 3), push, and reply on the PR in a few lines: what changed, the new commit's first 7 characters (Settings → About in the preview shows it), anything left to check.
- **A comment that starts with "Independent review" and is not yours** (the owner ran `/review` for a second opinion): fix its "should fix" findings as in section 4 and reply with the same "→ Fixed / → Not fixed" lines.
- Bug reports from the owner usually carry a link from the app's Share button: open the same state in the browser checks to reproduce it before fixing.
- **Merged or closed:** unsubscribe, cancel a pending check-in (`delete_trigger`) and stop. Do not start the next milestone. Do nothing else: this wake may be a cold-cache one, so every extra tool call re-reads the whole conversation.
- **Anything else** (a green check, the preview bot's comment): end the turn without a tool call, unless no check-in is pending.

**Stop watching.** Keep one check-in pending (`send_later`, 45 minutes: it lands while the conversation is still cheap to re-read) from the moment the PR is open: schedule it **every time you end a turn with none pending, whatever you are waiting for**. Never wait for "CI is green" or any other GitHub event instead: those events can fail to arrive. Only **your own push or an owner comment** moves the check-in (cancel it with `delete_trigger` and schedule a new one when you end that turn); other events leave it where it is. When the check-in fires:

- If CI on the latest commit is still running or red, or an owner comment is unanswered, handle it as in this section. Red CI is a fix, not a reason to stop. A CI run that is still going is not a reason to wait past one more check-in: at the second check-in with CI still running, stop as below and say so in the comment.
- Otherwise (nothing new):

1. Unsubscribe from the PR (`unsubscribe_pr_activity`).
2. Post one comment on the PR, this exact text with the real number: "Stopped watching this PR. To continue (your answers, problems found), comment here, then start a new session (Sonnet, high) and type `/milestone resume <PR number>`. If all is fine, merge: merging accepts every recommendation."
3. Tell the owner the same in chat, in two lines, and stop.

If `send_later` is not available, stop as soon as CI is green and nothing waits on you. If CI is still running and you cannot schedule, say so in chat and stop; do not end a turn "waiting".
