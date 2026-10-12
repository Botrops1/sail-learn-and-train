---
name: bug
description: Fix a bug the owner found on the live sail-learn-and-train site (e.g. "/bug <share link> the boom goes the wrong way"). Reproduces it, fixes it in a small PR with a test, then watches the PR.
argument-hint: <link from the Share button> <what happened, what you expected>
disable-model-invocation: true
---

# Fix a bug

The owner typed `/bug $ARGUMENTS`. If it is unclear what went wrong, ask one short question and stop.

1. `npm ci`. Read CLAUDE.md, then only the spec and PHYSICS_TRUTHS parts that cover the behaviour.
2. **Reproduce it first:** open the owner's link state in the browser checks (a scene or live check in `scripts/shots.mjs`) or in a unit test. If you cannot reproduce it, say so and ask for the phone model, orientation and the footer version.
3. If the behaviour is actually correct sailing, do not change code: explain in plain words why, with the rule from PHYSICS_TRUTHS, and stop.
4. Fix it with the smallest change; add a test (or live check) that fails before and passes after. Run typecheck, lint, tests, build and the browser checks of the milestone involved.
5. Open a PR titled `Fix: <what>`, using the CLAUDE.md template (a full preview link that shows the fix; questions with recommendations). Subscribe to its activity and act on the owner's comments as in `/milestone` section 5.
6. Tell the owner in chat: the PR link and the one link to check.
