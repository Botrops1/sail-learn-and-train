---
name: review
description: Independent review of a sail-learn-and-train PR (e.g. "/review 32") against its spec, the physics rules and the project conventions. Posts one plain-language comment on the PR with a recommendation per finding; changes no code.
argument-hint: <PR number>
disable-model-invocation: true
model: opus
---

# Review PR #$ARGUMENTS

The owner typed `/review $ARGUMENTS`. If no number was given, ask for it and stop. **Do not change code or push.**

The review normally runs right after the PR opens, before the owner tests on the phone, so that fixes from the review and the owner's findings go into one round.

1. Read the PR (description, diff, CI status) with the GitHub tools. Find its milestone and read, narrowly: CLAUDE.md, the phase spec's sections 0–5 and the milestone's section, and the PHYSICS_TRUTHS rules the milestone tests.
2. Check out the PR's branch, `npm ci`, run `npm run typecheck`, `npm run lint`, `npm test`, and `SHOTS_ONLY=m<N> npm run shots` for its milestone. Look at the few PNGs that matter.
3. Check:
   - **Correctness:** the code against the spec's formulas, numbers and signatures; tests that really test the rule (not bands widened to pass); sign and frame conventions.
   - **Sailing sense:** does anything behave in a way a sailor would find wrong? Cite the rule or the source. For the PHYSICS_TRUTHS rules the milestone tests that are still `to-verify`, open the cited sources (web access is allowed for them) and say per rule whether the source supports it; recommend the status change, do not edit it.
   - **Rules:** no magic numbers outside `hanse508.json`, ids from the registry, `src/model` pure, scope kept, docs updated.
   - **The PR description:** the checklist links work and match the spec; every question has a recommendation.
4. Post **one** comment on the PR. Start it with "**Independent review**", then:
   - one or two sentences: is it safe to merge?
   - numbered findings, most important first. Each one: what is wrong in plain words, where (file:line), and "Recommended: fix now / fix later / leave as is, because …";
   - end with: "Reply e.g. 'fix 1 and 3' and the milestone session will do it."
5. Tell the owner in chat: the verdict in one line and the link to the comment.
