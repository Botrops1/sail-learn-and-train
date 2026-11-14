# Workflow review (2026-11-14)

A review of how the agents work in this repository: the commands, the rules, the documents they write and the CI. The aim is fewer tokens per milestone, fewer fix-up rounds and fewer steps for the owner.

**How it was made.** One session, no subagents, no browser checks. Read: the comments and commits of the last 25 merged PRs (#177 to #206), CLAUDE.md, the four skills, the owner sections and the outline of WORKFLOW, and samples of the documents (PHASE10_SPEC sections 0–5 and the M95 section against PR #196, the last 30 decision rows of the ROADMAP, CODE_MAP). Sizes are word counts (`wc -w`); a token is roughly three quarters of a word, so 10,000 words are about 13,000–14,000 tokens. **Token and time savings below are estimates**: this session cannot see what earlier sessions used.

**What this PR already changes** is marked "done here". **What a later session builds** has a spec in section 6.

## 1. The ranked list

Ranked by saving against risk. "Sonnet" means a later Sonnet session (high) builds it from the spec named.

| # | Change | Saving | Risk | Who builds |
|---|---|---|---|---|
| 1 | **The review runs inside `/milestone`**, as an independent subagent before the PR opens; the builder fixes every "should fix" finding and lists them; the owner can undo a fix | Per reviewed milestone: no separate Opus session (it re-read about 40,000 tokens, installed the packages and re-ran all tests and browser checks), no "resume" session in the 5 of 9 cases where the review arrived after the builder had stopped, and 2–3 fewer steps for the owner. Fixes land before the PR opens, so one CI round less | Medium. The builder decides alone that a finding is wrong; the review comment shows every finding word for word, and `/review` stays for a second opinion | Done here (skills) |
| 2 | **The description is complete before the last push**, so CI reads the `CI groups:` line | 7 of 20 code PRs ran fewer browser checks than they claimed; 5 needed an extra push and CI run, 1 let a failure through to the nightly run | Low | Done here (skill order, CLAUDE.md). Spec A makes CI choose the groups from the changed files, so the line is rarely needed |
| 3 | **Older checks that list or count things** are found and updated in the same PR; `/plan` names them in the spec | 9 of 20 code PRs broke an older check (the exercise list in M69/M71 four times running). Each cost a red CI round or a nightly failure and a fix PR | Low | Done here (rule in CLAUDE.md, `/plan`, `/review`). Spec B makes the worst checks read the list from the data |
| 4 | **CODE_MAP cut from 13,300 to about 5,000 words** (no history, no lists of check cases) | About 11,000 tokens less in every session that reads it in full: every build, review, plan and bug session. It is 45 % of what a builder reads before starting | Low (a test keeps it complete) | Rule done here; the cut is spec E (Sonnet) |
| 5 | **A flaky check is recorded the first time, fixed the second** | The phone tap sweep was called "a one-off" on three PRs (#197, #198, #202); it was a real camera bug that then took two nightly failures and two fix PRs (#204, #206) | Low | Done here (skill). Spec F makes CI record it by itself |
| 6 | **Terse test, lint and browser-check output**: one command, one line per step, details only on failure | 3 tool calls less per verification round, and a browser-check log of a few lines instead of hundreds. Every line an agent reads is re-read on each later turn | Low | Spec C (Sonnet) |
| 7 | **The check-in timer is moved only by the session's own push or an owner comment**; a green check or the preview bot's comment ends the turn without a tool call | Fewer wake-ups with tool calls; the session stops 45 minutes after the last real event instead of sliding on (#202 watched for 1 h 50 min) | Low | Done here (skill) |
| 8 | **Archive what nobody needs to read again**: checklists of merged milestones out of WORKFLOW, decision rows older than the last 30 out of the ROADMAP, finished phases in the ROADMAP table cut to a line | WORKFLOW 21,000 → about 3,000 words, ROADMAP 26,600 → about 7,000. These files are searched, not read whole, so the saving is in searches that return less and in `/plan` sessions | Low (text moves, nothing is deleted) | Spec E (Sonnet) |
| 9 | **One place per fact**: a decision is written out once, in its spec section; the ROADMAP row is a pointer of at most 80 words | The newest rows are 130–345 words each and repeat the spec's notes and the PR description; two PRs needed a commit only to make the copies agree (#183, #184) | Low | Done here (CLAUDE.md, `/plan`) |
| 10 | **The PR description check catches more**: a checklist link in backticks, a question without a recommendation | Two review findings of this kind (#196) and one owner annoyance each time | Low | Spec D (Sonnet) |
| 11 | **`/status`**: what waits on the owner and what to type next | No tokens saved; saves the owner opening several PRs to find out. About one minute on Haiku | Low | Done here (new skill) |
| 12 | **`/bug` stays, slimmer**; it takes an issue number, replays the report's steps, and gets the Opus review when it changes the model | #178 fixed the wrong case because its test did not follow the report's steps; the review caught it | Low | Done here (skill) |
| 13 | **Attribution rule said once** (CLAUDE.md) instead of once per skill; the deploy paragraph of CLAUDE.md cut to what a builder needs | About 500 words cut. The new rules of this PR add more than that: CLAUDE.md is about 190 words longer, the skills (read only when a command is used) about 1,000 longer. The lasting cut in what every session reads is item 4 | Low (a hook enforces the rule) | Done here |
| 14 | **A later part of a phase gets its own spec file** instead of growing the first one | PHASE10_SPEC's shared sections grew to 7,900 words with "(10b)" and "(10c)" insertions that every 10c builder read; a part file carries only what its milestones need | Low | Done here (`/plan`) |

**Added later the same day (browser-check growth):**

| # | Change | Saving | Risk | Who builds |
|---|---|---|---|---|
| 15 | **A budget for new browser checks** (join an existing group, at most 120 s for a new one, delete what becomes redundant, logic goes into unit tests) and **a one-time pruning** of the existing set | The set is 97 groups and 19,066 s (5.3 hours of machine time, about 20 parallel jobs) and grew with every milestone; the part cap was raised twice in five milestones. 15 groups hold 47 % of the time; 30 groups take under a minute each and mostly pay for start-up | Medium for the pruning (a deleted check can hide a later break); low for the budget | Budget rule done here (CLAUDE.md, `/plan`, `/review`). Pruning is spec H (Sonnet) |

## 2. History: the last 25 merged PRs

PRs #177 to #206: 20 with code, 4 plans, 1 analysis. 9 had an independent review. The owner's own comments were almost always "accept all" (8 of the 9 reviews were accepted exactly as recommended), which is why fixing "should fix" findings without waiting is safe.

| Kind of mistake | Where | What prevents it |
|---|---|---|
| **The `CI groups:` line was written after the only push**, so CI never read it. The Tests section then claimed checks that had not run | #177, #178, #195, #196, #197, #198, #199 | Skill order (done): the last commit is pushed after the description is written. Spec A: CI picks the groups from the changed files and reads the description live, so a re-run works |
| **An older check has a hard-coded list or count** and breaks when the milestone adds an item | Exercise list in M69/M71: #197, #198, #199 (found in #202). Chip row: #182. Speed buttons: #196. Others: #187, #190, #202. The count in `tests/ciPlan.test.ts`: #179, #182, #186 | Rule (done) for builder, planner and reviewer. Spec B: the list checks read the data |
| **A failed check passed on a re-run and was called a flake** | Tap sweep: #197, #198, #202; real bug fixed in #204 and #206. Three stale checks fixed in #192 | Rule (done): one re-run, then record or fix. Spec F: CI records it |
| **The review arrived after the builder stopped watching**, so a new session had to be started for the fixes | #177, #180, #195, #196, #199 | The review is part of `/milestone` (done) |
| **A slip in the spec that only a phone shows** | Sound did not start on a finger tap (#182); the "almost calm" start had 6 knots of boat speed (#198); the info card covered the boat for the second tap of a double-tap, listed as a "known limitation" (#202) | `/plan` (done): gestures are checked with a finger on a phone-size page; the first screen must agree with its text. `/milestone` (done): a limitation that fails a checklist item is a failure |
| **A test looser than the spec, or a case the test's name promises but does not check** | #196, #199, #202 | Named in the reviewer's checklist and the builder's rules (done) |
| **A bug fix whose test did not follow the report** | #178 (first fix missed the reported case and broke a correct one) | `/bug` (done): replay every step of the report; Opus review when the model changes |
| **The PR description**: a link in backticks that cannot be tapped, boxes ticked by the builder, a result "to follow in a comment", numbers said to be there that were not | #182, #195, #196 | Template and skill (done). Spec D for the two a script can see |
| **The same decision kept in several places drifted apart** | #183, #184 (a commit each to align them), #202 (ROADMAP row incomplete) | One place per fact (done) |
| **A sentence elsewhere became untrue** (SECURITY.md, a WORKFLOW line, a code comment) | #177, #196, #197 | Reviewer's checklist (done). No script can see this |

## 3. Rules: duplicates, outdated lines, and what a script can enforce

**Duplicated**

- The attribution paragraph (about 80 words) stood in CLAUDE.md and in each of the four skills, and two hooks and a workflow enforce it. Now CLAUDE.md has it and each skill has one line.
- The commands are described in four places: the CLAUDE.md table, WORKFLOW 3.1, WORKFLOW section 2 and each skill's description. Kept (the owner reads WORKFLOW, the agent reads CLAUDE.md), but all four now say the same.
- The PR template is in CLAUDE.md, in `.github/pull_request_template.md` and as a section list in `scripts/pr-body.mjs`. Kept: each has a reader. The script is the one that must not drift; spec D adds a test that its section list matches CLAUDE.md.
- "What to read" was repeated in `/milestone`; the skill now points to CLAUDE.md.
- CLAUDE.md's deploy paragraph (about 330 words) repeated CODE_MAP's workflow entry. Cut to about 150 words.

**Outdated (fixed here)**

- WORKFLOW's first line called the live site "what is merged into `main`"; since M84 it is the latest release.
- WORKFLOW 1.3 "once the PR that introduced this section has run its checks"; CLAUDE.md "Commands (created in M0)" and the note on where the long-run rules came from.
- WORKFLOW and the skills told the owner to start `/review` for physics milestones.

**Not changed, but worth knowing**

- Every comment on a PR is posted under the owner's GitHub account, so a session cannot tell an owner comment from an agent comment by its author, only by its first words ("Independent review", "Stopped watching"). The skills rely on those words; keep them exact.
- WORKFLOW's model table says `/bug` runs at medium effort while the "Stopped watching" text says "Sonnet, high" for a resume. Both are right for their case; the table now has a row for each.

**Rules a script or CI could enforce instead of words**

| Rule today | Enforced by | Spec |
|---|---|---|
| "Use `CI groups: all` when you changed the store, the URL state, the layout shell or the scene setup" | `scripts/ci-plan.mjs` reads the changed files | A |
| Exercise lists and counts in older checks | The checks read `content/exercises/exercises.json` | B |
| Checklist links tappable; every question has "Recommended:" | `scripts/pr-body.mjs` | D |
| CODE_MAP names every source file, and only files that exist; entries short | A unit test | E |
| A ROADMAP decision row is at most 80 words | A unit test (new rows only) | E |
| A flaky check is recorded | `ci.yml` retries once and warns | F |

## 4. Documents the agents write

**PHASE10_SPEC** (64,700 words). Sections 0–5, which every builder and reviewer of the phase reads, are 7,900 words; a 10c builder also reads section 23 (2,900). Section 0 alone is 570 words, a third of it "(10b)" and "(10c)" exceptions added by later parts. Section 3.5 "How the numbers were made" (the prototype's story) is for the planner, not the builder. The M95 section (1,700 words) against PR #196: the builder followed it closely, and the PR found only what the spec could not know (a CSS rule, an older check). So the milestone sections are the right level of detail; the padding is in the shared sections and in the repeats: the same decision appears in the milestone's "Decided in the PR" notes, in the part's "Decisions" section, in the ROADMAP row, in the PR description and often in CODE_MAP.

**ROADMAP** (26,600 words). The decisions log has 171 rows and 23,500 words. The last 30 rows average 180 words; the newest (M99) is 345 words and names functions, numbers and test changes that the spec section already holds. The phases table has rows of several hundred words for finished phases.

**CODE_MAP** (13,300 words in 244 lines). One line is 4,300 characters long; 42 lines are over 600. It carries 378 milestone mentions ("M54: …", "from M26 …") and, for each of about 60 browser-check files, a list of its cases. A map should say which file does what now; the history is in `git log` and the cases are in the file.

**WORKFLOW** (21,000 words). About 19,000 are checklists of milestones that are merged.

**Archiving proposal** (spec E; text moves, nothing is deleted):

1. `docs/archive/CHECKLISTS.md`: the checklists of merged milestones, moved when a phase part is finished. WORKFLOW keeps the owner sections and the open milestones' checklists.
2. `docs/archive/DECISIONS.md`: decision rows older than the last 30. The ROADMAP keeps a line that says where they are.
3. ROADMAP phases table: a finished phase is one line (theme, "Done", link to its spec).
4. CODE_MAP: the cut described in spec E.
5. Finished phase specs stay where they are: later specs and tests point to them by name, and they are searched, never read whole, so moving them saves nothing.

## 5. The flow

### 5.1 Review inside `/milestone` (done here)

1. The builder builds and runs the checks.
2. It starts one subagent with a fixed prompt (in `/milestone` section 4). The subagent reads `.claude/skills/review/SKILL.md`, the spec section, the rules and the diff. It does not see the builder's conversation. Opus at medium effort where the spec says "review required", Sonnet at medium where it says "not needed" (this replaces the old "gap check").
3. The reviewer returns at most 12 findings, each marked **should fix**, **later** or **leave**. It does not install packages or re-run the whole test suite: those ran minutes before in the same container, and CI runs them again on the PR.
4. The builder fixes every "should fix" finding, then opens the PR.
5. The PR's first comment is the review, word for word, with "→ Fixed in `abc1234`" or "→ Not fixed: why" under each finding. "Later" findings that are defects go into one issue.
6. **The owner's veto:** comment "undo review fix 2". Merging accepts the fixes.
7. `/review <PR>` still exists, as a second opinion in a fresh session.

What is lost: the old review also checked the PR description and the CI result, which do not exist before the PR opens. The **PR description** check covers the first; the builder watches the second.

### 5.2 `/bug`

Recommended: **keep it**, do not fold it into `/milestone`. A skill costs tokens only when it is used, `/bug` is 400 words, the nightly issue tells the owner to type it, and "bug" is the word a non-developer looks for. A problem on an open PR was never a `/bug`: it is a PR comment, picked up by the watching session or by `/milestone resume`. The skill now says so, takes `issue <number>`, and shares the review and PR steps with `/milestone`.

### 5.3 What the 45-minute watch costs

A wake-up re-reads the whole conversation. While the conversation is in the cache (under about an hour since the last turn) that is charged at the reduced cached rate, so a wake-up that only looks and ends costs a small fraction of a normal turn. A typical watch is 3 to 6 such wake-ups (CI results, the preview bot, the check-in, the stop). Against a build of several hundred turns that is a few percent of the milestone. The expensive cases are different:

- a wake-up after more than an hour (the conversation is rebuilt at full price): the 45-minute check-in exists to prevent it, and it works;
- a "resume" session: it reads CLAUDE.md, the PR and the code again and installs the packages. It was needed in 5 of 9 reviewed milestones only because the review came late. With the review inside `/milestone`, that reason is gone.

So: keep 45 minutes. Shortening it would save little and make the owner start `/milestone resume` more often. What changed here: only the session's own push or an owner comment moves the timer, and other events end the turn without a tool call.

### 5.4 Model for each step

| Step | Model, effort | Why |
|---|---|---|
| `/plan` | Opus, high | A gap in the spec becomes a builder's guess; the slips found in section 2 were spec slips, not coding errors |
| Spec check inside `/plan` (one subagent per milestone) | Sonnet, medium | It plays the builder |
| `/milestone` build, `/milestone resume` | Sonnet, high | The history shows no pattern of Sonnet coding errors; the repeats were process mistakes that rules and scripts fix |
| Review inside `/milestone`, review "required" | Opus, medium (subagent) | Physics, shared state, old links: the 9 reviews found real problems in 8 PRs |
| Review inside `/milestone`, "not needed" | Sonnet, medium (subagent) | UI, text and visuals; it looks for gaps against the spec |
| `/review` (second opinion) | Opus, medium | Rare |
| `/bug`, `/plan answers`, small document changes | Sonnet, medium | Small, narrow |
| `/status` | Haiku, low | Three or four GitHub calls and a short answer |
| The slimming and archiving of spec E | Sonnet, medium | Moves text by rule |

### 5.5 `/status`

Worth adding, as the cheapest possible skill (done here): Haiku, GitHub calls only, no reading of specs or code, at most 12 lines. It answers "which PR waits on me, is anything broken, what do I type next". The alternative, a workflow that keeps a pinned "Status" issue up to date, would cost no session at all but is one more workflow to keep working; not recommended now.

## 6. Specs for a later Sonnet session

Each spec is one PR titled as given, built with `Sonnet, high`, no `/plan` needed. They touch scripts and CI, so each PR description carries `CI groups: all` unless the spec says otherwise. Order: A, B, C, D, E, F. A and B remove the most fix-up rounds.

### Spec A: `CI: choose browser groups from the changed files`

**Why:** the `CI groups:` line is typed by hand and read only at a push.

1. New file `.github/ci-paths.json`: `{ "all": [<path prefixes>], "groups": { "<path prefix>": ["<group>", …] } }`. Starting content, to be checked against `docs/CODE_MAP.md` and corrected in the PR:
   - `all`: `src/app/store.ts`, `src/app/urlState.ts`, `src/app/urlSync.ts`, `src/app/app.ts`, `src/render3d/scene.ts`, `src/render3d/sceneConfig.ts`, `scripts/shots.mjs`, `scripts/ui.mjs`, `index.html`, `vite.config.ts`, `package.json`, `package-lock.json`.
   - `groups`: `content/exercises/` and `src/app/exerciseRun.ts` → every group whose `scripts/shots-m<N>.mjs` contains the text `exercise-item-` or `mode=exercises` (work the list out once with `grep -l` and write it into the file; a unit test fails when the `grep` result and the file differ).
2. `scripts/ci-plan.mjs`: new export `pathGroups(files, paths, groups)` returning `'all'` or a list of group names; `prPlan` adds them with the reason `'files'`. An `all` match behaves exactly as a `CI groups: all` line. Update `scripts/ci-plan.d.mts`.
3. `.github/workflows/ci.yml`, job `plan`: for a pull request, read the title and description **at run time** with the GitHub API (`GET /repos/{owner}/{repo}/pulls/{number}`, the job's token, `pull-requests: read`) instead of from the event payload, write the JSON to a file under `$RUNNER_TEMP`, and pass the file's path in `env:`. The text must still never appear in a `run:` line. If the call fails, fall back to the event payload. Effect: "Re-run jobs" reads the description as it is now.
4. Tests in `tests/ciPlan.test.ts`: a store change gives `'all'`; an exercises-data change gives the exercise groups; a change under `src/ui/` alone gives none from paths; a documents-only PR is unchanged; the `ci-paths.json` paths all exist.
5. Documents: CLAUDE.md's `CI groups:` bullets say the line is now only for groups the files do not imply; the comment above the `plan` job; CODE_MAP.
6. **Done when:** a test PR that changes only `src/app/store.ts` plans the full set with no line in its description. **Not in this spec:** starting CI on a description edit (ticking a checklist box would restart it).

### Spec B: `Checks: read the exercise list from the data`

**Why:** four milestones in a row broke the same two checks.

1. `scripts/shots-m69.mjs` (the "M69 list" live check, the array of `exercise-item-…` ids near line 255–280): build the expected ids from `content/exercises/exercises.json` in the order the app lists them (group by group; use the same grouping helper the panel uses, imported from `src/`, or read the group order from the data), instead of the literal array.
2. `scripts/shots-m71.mjs` (near line 280, `ids.length === 17`): compare with the number of exercises in the data.
3. `tests/ciPlan.test.ts` line 43 (`groups.length` equal to 97): replace the count with "every `scripts/shots-m*.mjs` file has a live group, and every live group has a line in `.github/ci-times.json`".
4. `grep -n "length === [0-9]\|toHaveLength([0-9]" scripts/shots-m*.mjs tests/*.test.ts`: for each hit that counts items of a list the app builds from data (exercises, sections, chips, speed buttons, glossary entries), read the count from the same data; leave counts that are the point of the test. List in the PR which were changed and which were left, one line each.
5. **Done when:** adding a dummy exercise to the data locally (not committed) fails no browser check except those about that exercise's own content. `CI groups: m69, m71` plus the groups of the files changed.

### Spec C: `Tools: one quiet check command, quiet browser checks`

1. New `scripts/check.mjs`, `npm run check`: runs `tsc --noEmit`, `eslint .`, `prettier --check .`, `vitest run --reporter=dot` and `vite build` in that order, each with its output captured. Prints one line per step (`typecheck: ok (14 s)`, `test: ok, 1613 passed (58 s)`). On the first failure it prints the last 80 lines of that step's output, then `FAILED: <step>` and exits 1. `npm run check -- --from test` starts at a later step. The four separate scripts stay; `ci.yml` keeps calling them one by one (a CI log should be complete).
2. `scripts/shots.mjs`: quiet by default. Lines of a scene or a live group are kept in a buffer and printed only if that scene or group has a `WRONG`, a `STOPPED`, a console error or an HTTP error; always printed: `live group <name>: <n> s`, the list of failures and the last line. `SHOTS_VERBOSE=1` prints everything as today. The functions in `scripts/shots-m*.mjs` call `console.log` directly: replace the global `console.log` inside the runner for the length of a group rather than editing 90 files.
3. CLAUDE.md "Verification" and `/milestone` section 3: `npm run check` in place of the four commands; drop the "read only the lines with WRONG…" sentence, which the quiet mode makes unnecessary.
4. **Done when:** a passing `npm run check` prints at most 6 lines; a passing `SHOTS_ONLY=m95 npm run shots` prints at most 5; a deliberately broken live check prints its group's lines. `CI groups: general, m95`.

### Spec D: `PR description check: tappable links, recommendations`

In `scripts/pr-body.mjs`, function that lists the problems of a milestone PR, add:

1. A checklist link of this PR's preview that stands between backticks (`` `https://…/pr-preview/pr-196/?…` `` or with double backticks): "Checklist link is in backticks and cannot be tapped: <link>".
2. In the section "## Questions for the owner": the number of lines that start with a number and a full stop must not be greater than the number of occurrences of "Recommended:" in that section: "Question <n> has no recommendation."
3. A unit test that `REQUIRED_SECTIONS` are all headings of the template in CLAUDE.md and in `.github/pull_request_template.md`.
4. Tests for each in the existing test file of `pr-body.mjs`. Documents-and-scripts PR: `CI groups:` line not needed (no app code changes), say so in the description.

### Spec E: `Docs: slim CODE_MAP, archive old checklists and decisions`

A documents PR (plus one test file). Nothing is deleted from the repository's history; text moves or is shortened.

1. **CODE_MAP.** For every entry: keep what the file does now, in at most 40 words; remove milestone history ("M54: …", "from M26 …", "since M71 …") and lists of a check file's cases. The entries for `scripts/shots-m<N>.mjs` become one entry: "each milestone's scenes and live checks; the comment at the top of each file says what it checks" (first make sure each of those files has such a comment; add a two-line one where it is missing, from the CODE_MAP text being removed). Target: 5,000 words or fewer. Do not reorder sections.
2. **New `tests/docs.test.ts`:** every file under `src/` is named in CODE_MAP; every path CODE_MAP names in backticks that starts with `src/`, `scripts/`, `tests/`, `content/` or `.github/` exists (patterns with `<N>` or `*` are skipped); no CODE_MAP line is longer than 600 characters; every ROADMAP decisions-log row dated after 2026-11-14 has at most 80 words.
3. **WORKFLOW.** Move every `### M…` / `#### M…` checklist whose milestone is merged (M0 to M99) and their phase headings to `docs/archive/CHECKLISTS.md`, in the same order. WORKFLOW keeps sections 1–4, the first paragraph of section 5 (the link settings) and one line pointing to the archive. `scripts/pr-body.mjs` reads the checklist of the PR's own milestone from WORKFLOW, which is not merged yet, so it needs no change; add a test that says so. Update `/plan` section 6 (a new phase's checklists go under a "Checklists" heading in WORKFLOW; when a phase part's last milestone merges, its sign-off milestone moves them to the archive) and `/milestone` (the sign-off milestone does the move).
4. **ROADMAP.** Move all decision rows except the last 30 to `docs/archive/DECISIONS.md` with the same table header; leave one line under the heading: "Older decisions: docs/archive/DECISIONS.md (search it with `grep`)". In the phases table, a phase whose status is done becomes: theme, one sentence, link to its spec, status. The three "Phase numbers changed" paragraphs move to the archive file.
5. Update `/plan` section 1 (the last 12 rows are still in the ROADMAP; older ones are found by `grep` in the archive), CLAUDE.md "What to read" and CODE_MAP for the two new files.
6. **Done when:** `wc -w` gives CODE_MAP ≤ 5,000, WORKFLOW ≤ 4,000, ROADMAP ≤ 8,000; `npm test` passes; `grep -rn "WORKFLOW.md\|ROADMAP.md" scripts tests .github .claude` shows no reader broken by the move.

**Decided in the spec E PR (owner: "accept all"):** `scripts/pr-body.mjs` reads a PR's own checklist from WORKFLOW while the PR is open, so a sign-off milestone cannot move its own checklist. Its PR moves the earlier checklists of its part to the archive; the next `/plan` PR moves the last one. The comments in `scripts/shots.mjs` and `scripts/shots-m4a/b/c.mjs` that still say "WORKFLOW.md checklist" were left, because `shots.mjs` is on the list that runs the full browser set; the next PR that touches those files fixes them. `tests/docs.test.ts` also found `src/ui/anchorPanel.ts` missing from the old map.

### Spec F: `CI: retry a failed browser group once and record it`

1. `.github/workflows/ci.yml`, job `browser-part`: when the `shots` step fails, run the same command once more for only the groups (or the scene part, or the taps) that failed. If the second run passes, the job passes and prints `::warning title=Flaky check::<group>: <the WRONG lines of the first run>`.
2. Job `browser-checks` (the summary): list the flaky names in the job summary. In `nightly.yml`: when a run had a flaky name, open or comment on an issue "Flaky check: <group>" (label `flaky`), with the lines.
3. `/milestone` section 6: the builder no longer re-runs by hand; a warning named on its PR is reported in its reply, and a group with an open "Flaky check" issue is reproduced locally and fixed.
4. **Done when:** a live check made to fail on its first run only (an environment variable read by a test-only group) shows the warning and a green job; a check that fails twice is red as today.

### Spec H: `Checks: prune and merge the browser-check groups`

**Why:** nothing has ever been removed from the set. Recorded times on 2026-11-14 (`.github/ci-times.json`): 97 groups, 19,066 s. The 15 slowest (`m67` 1462, `m37` 795, `m68` 707, `m66` 697, `m98` 600, `m9` 557, `m75` 555, `m63` 551, `m78` 482, `m65` 465, `m29` 434, `m70` 412, `m76` 403, `m60b` 392, `m50` 387) are 47 % of it; 30 groups take under 60 s.

Build it **after specs A, B and C**, in two PRs so each can be checked: H1 (the slow groups), H2 (the small groups). `CI groups: all` on both. Opus review before each PR opens (`/milestone` section 4).

**Rules for both PRs**

- No check is deleted silently. The PR description has a table: every check removed or merged, and the check (file and name) that still covers the same behaviour, or "moved to `tests/<file>`". A check with no cover stays.
- A behaviour that needs no browser (a number from the model, a store rule, a link that opens a state) moves to a unit test with the same expected values.
- Never loosen an expectation to save time. Saving comes from fewer page loads, fewer repeats and faster app time, not from weaker checks.
- Record before and after times per group from a full CI run of the PR, and refresh `.github/ci-times.json`.

**H1: the 15 slowest groups.** For each, in the order above:

1. Put every check that waits for app time on the test clock (CLAUDE.md, "Test clock") if it is not; replace fixed pauses by waiting for the result.
2. Run long scripted runs (a whole exercise, a night at anchor) once per group, at the highest time speed the app allows for that state, not once per size or per language; the Russian and the wide-layout variants check their own layout at one moment of the run, not the whole run again.
3. Share one page between checks that start from the same link and do not change shared state, instead of a new `openPage` each.
4. `m67` is over the part cap (`FULL_CAP_S` in `scripts/ci-plan.mjs`): after the steps above, if it is still over 600 s, split its good-run check from its mistake checks into two groups.
5. **Target:** the 15 groups' total falls from 8,899 s to 5,500 s or less. If a group cannot be brought down without weakening it, say why in the PR and leave it.

**H2: the 30 groups under 60 s and the sign-off groups.**

1. Merge groups that open the same screen (the same section, card or mode) into one group named after the oldest of them; a merged group stays under 120 s. Update `scripts/shots.mjs` (`liveGroups`), `.github/ci-times.json` and, after spec A, `.github/ci-paths.json`. The PR-title rule of `scripts/ci-plan.mjs` (a PR titled `M<N>` runs group `m<N>`) must still find a group for every milestone number that had one: add an alias table (of the form `m53 → m48`) in `scripts/ci-plan.mjs` with a unit test.
2. Phase sign-off groups (`m13`, `m19`, `m24`, `m29`, and the like) that only repeat checks of their phase's other groups: delete the repeats, keep what is unique.
3. Scenes: where two scenes of different milestones show the same link at the same size, keep one.
4. **Target:** at most 75 groups, and the full set's total at most 13,500 s (from 19,066 s, with H1). Lower `FULL_CAP_S` so the full set packs into at most 14 parts.

**New unit test (in H2), so the set stays under control:** `tests/ciPlan.test.ts` fails when a group not in a baseline list (the groups that exist when H2 merges, written into the test) has a recorded time over 120 s and is not named, with a reason, in a new `.github/ci-budget.json` (`{ "<group>": "<reason>" }`).

**Not in this spec:** changing what the app does; the tap sweep's coverage; the nightly schedule.

## 7. What was not checked

- No session was run with the new skills. The first milestone built with them is the test; if the reviewer subagent does not start or returns nothing, the builder should say so in the PR and the owner starts `/review <PR>` as before.
- Whether `model: haiku` is accepted in a skill's header was not tried.
- Token use of past sessions could not be read; the savings are estimates from file sizes and from the PR history.
- The inline code-review threads of the 25 PRs were not read: all reviews in this repository are posted as ordinary PR comments.
