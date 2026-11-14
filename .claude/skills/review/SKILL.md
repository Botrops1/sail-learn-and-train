---
name: review
description: Independent review of a sail-learn-and-train milestone or PR against its spec, the physics rules and the project conventions. Normally started by /milestone as a subagent before the PR opens (it returns findings; the builder fixes the ones marked "should fix"). "/review 32" in a new session gives a second opinion on an open PR and posts one comment; it changes no code.
argument-hint: <PR number>
disable-model-invocation: true
model: opus
---

# Review

**Do not change code or push**, in either mode. No session links or AI attribution anywhere on GitHub (the CLAUDE.md working rule; a hook blocks them).

## What to check (both modes)

Read narrowly: CLAUDE.md, the phase spec that contains the milestone (`grep -l "^## .*M<N>:" docs/PHASE*_SPEC.md`) with its sections 0–5 and the milestone's section, the PHYSICS_TRUTHS rules the milestone tests, and the diff. For a bug fix: the issue or the owner's report instead of a spec section.

- **Correctness:** the code against the spec's formulas, numbers and signatures; sign and frame conventions. When a claim can be tested in a minute, test it with a throwaway model test (`scripts/_<name>.mjs` or a scratch test file, deleted after) instead of reasoning about it.
- **Tests:** each test of the spec section exists, checks the rule its name promises, and is as tight as the spec's band (not widened, not `toBeCloseTo` with too few digits). For a bug fix: the new test replays the steps of the report, with every control the report names.
- **What the learner meets first:** the opening screen agrees with the text beside it (wind, speed, sails); a gesture the milestone adds works with a finger on a phone-size page, not only with a mouse (touch and pointer events differ); nothing covers the thing to be tapped.
- **Sailing sense:** does anything behave in a way a sailor would find wrong? Cite the rule or the source. Sources: every rule was checked once on 2026-10-12. Re-check only what the milestone touches: a rule it implements or whose behaviour it changes, and any still `to-verify`. Open the cited source (fetch it from the container with `curl`; the sailing sites are allowed in the cloud environment) and say per rule whether it still supports what the code now does; recommend status changes, do not edit them.
- **Older checks:** `grep` `scripts/shots-m*.mjs` and `tests/` for lists and counts of the thing the milestone adds (exercises, chips, buttons, sections, CI groups). One that was not updated will fail the nightly run: "should fix".
- **Rules:** no magic numbers outside `hanse508.json`, ids from the registry, `src/model` pure, scope kept, CODE_MAP updated; a "Known limitation" that makes a checklist item fail.

## The findings (both modes)

Numbered, most important first, at most 12, each in this form and in plain words (the owner reads them on a phone):

```
<n>. **<what is wrong, one line>** <two to four sentences: what happens, what should happen> Where: `<file>:<line>`. **Should fix** | **Later** | **Leave**, because <one line>. <for "should fix": the smallest fix, one or two lines>
```

- **Should fix:** wrong against the spec, a physics rule or a project rule; a missing or loose test of the milestone's own rule; anything that fails the owner's phone checklist or the nightly run; a one-line doc or comment that is now untrue. The builder fixes these without asking.
- **Later:** a real defect outside this milestone's scope. It goes into an issue.
- **Leave:** follows the spec, or a matter of taste. Say so in one line; do not list more than three.

No praise, no summary of what was built, no list of what is fine beyond one line.

## Called by a builder (a subagent, before the PR opens)

The prompt gives the milestone, the spec section, the diff command and the checks the builder already ran in this container.

- Do **not** run `npm ci`, typecheck, lint, the whole test suite or the browser checks again: they passed minutes ago in this container, and CI runs them on the PR. Run only what a finding needs (one test file, a throwaway model test). Look at the PNGs in `shots/` that show the change (phone size first).
- There is no PR yet, so there is no description to check and nothing to post.
- **Return** one line "Safe to merge once the should-fix findings are fixed" or "Not safe: <why>", then the findings, then one line per source re-checked. Nothing else: your whole answer is pasted into the PR.

## `/review <PR number>` (the owner, a new session, a second opinion)

The owner typed `/review $ARGUMENTS`. If no number was given, ask for it and stop.

1. Read the PR (description, diff, comments, CI status) with the GitHub tools. Check out its branch, `npm ci`. Run `npm run typecheck`, `npm run lint`, `npm test` and `SHOTS_ONLY=m<N> npm run shots` only if CI has not run them green on the PR's latest commit.
2. Check as above, and also **the PR description:** the checklist links are tappable (plain, not in backticks) and match the spec; every question has a recommendation; what the Tests section claims is true (the groups a `CI groups:` line names did run in CI on the latest commit: the line is read each time CI runs, and a description edit starts no run). Do not repeat a finding the first review comment already lists, unless its fix is wrong.
3. Post **one** comment on the PR. Start it with "**Independent review**" and one or two sentences (is it safe to merge?), then the findings. **Right before posting, fetch the PR's comments again.** If they contain the builder's "Stopped watching this PR" line, end with: "The milestone session has stopped watching: start a new session (Sonnet, high) and type `/milestone resume <PR number>`; it fixes the should-fix findings." Otherwise end with: "The milestone session fixes the should-fix findings while it is still watching; if it has stopped by then (it says so on the PR), use `/milestone resume <PR number>` in a new session."
4. Tell the owner in chat: the verdict in one line, the link to the comment, and which of the two ways to continue applies.
