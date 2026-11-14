---
name: bug
description: Fix a bug the owner found on the live sail-learn-and-train site, or a failed nightly check (e.g. "/bug <share link> the boom goes the wrong way", "/bug issue 153"). Reproduces it, fixes it in a small PR with a test, then watches the PR for a short while (as /milestone section 6). A problem on an open PR's preview is not a /bug: comment on that PR.
argument-hint: <link from the Share button, or "issue <number>"> <what happened, what you expected>
disable-model-invocation: true
model: sonnet
---

# Fix a bug

The owner typed `/bug $ARGUMENTS`. If it is unclear what went wrong, ask one short question and stop. No session links or AI attribution anywhere on GitHub (the CLAUDE.md working rule; a hook blocks them).

1. `npm ci`. Read CLAUDE.md, the issue if one is named, then only the spec and PHYSICS_TRUTHS parts that cover the behaviour.
2. **Reproduce it first, by the report's own steps:** open the owner's link state in the browser checks (a scene or live check in `scripts/shots.mjs`) or in a unit test, and do every step the report or the exercise's How? text names (each clutch, each button). If you cannot reproduce it, say so and ask for the phone model, orientation and the version in Settings → About. A failed nightly check: read the failed part's log, rerun only that group.
3. If the behaviour is actually correct sailing, do not change code: explain in plain words why, with the rule from PHYSICS_TRUTHS, and stop.
4. Fix it with the smallest change; add a test (or live check) that replays the same steps, fails before and passes after. Run typecheck, lint, tests, build and the browser checks of the milestone involved (see "Running the browser checks in a session" in CLAUDE.md).
5. **If the fix changes `src/model` or the store:** have it reviewed before the PR opens, as `/milestone` section 4 (the Opus subagent; in the prompt give the issue or the report in place of the spec section), and fix its "should fix" findings.
6. Open a PR titled `Fix: <what>` (with `Closes #<n>` if the bug has an issue) as `/milestone` section 5: the last commit kept back, the one-line body, then the full description from the CLAUDE.md template (one full preview link that shows the fix; questions with recommendations), then the push, the review comment if there was a review, and the read-back. Subscribe and act on the owner's comments as in `/milestone` section 6, including "Stop watching". A later comment is picked up with `/milestone resume <PR number>` in a new session.
7. Tell the owner in chat: the PR link and the one link to check.
