---
name: milestone
description: Build one milestone of sail-learn-and-train from the current phase spec (e.g. "/milestone 11"), open its PR with full preview test links, then watch the PR and act on the owner's comments until it is merged.
argument-hint: <milestone number, e.g. 11>
disable-model-invocation: true
---

# Build milestone M$ARGUMENTS

The owner typed `/milestone $ARGUMENTS`. If no number was given, ask for it and stop.

## 1. Before you start

- `npm ci` (the cloud container starts without `node_modules`).
- Check that the milestone before M$ARGUMENTS is merged into `main` (`git log origin/main --oneline | head`, the spec's milestone table). If it is not, or a PR for M$ARGUMENTS is already open, stop and tell the owner in two sentences what to do first.
- Read narrowly, as CLAUDE.md "What to read" says: CLAUDE.md, the current phase spec's general sections (0–5 in PHASE2_SPEC), the section of M$ARGUMENTS and the Definition of Done, the PHYSICS_TRUTHS rules your milestone tests, and the M$ARGUMENTS checklist in `docs/WORKFLOW.md`. Use `grep` for everything else; do not read whole files you only need a line of.

## 2. Build

- Follow the spec section in its order: data → model + tests → store/URL → UI → 3D → strings and registry → browser checks.
- Use the spec's formulas, data values and function signatures exactly. If a test band fails, follow spec section 0: check the formulas first, tune only keys marked tunable, report before/after numbers. Never widen a band.
- Anything the spec leaves open that you decide: write it into the milestone's section, marked "decided in the M$ARGUMENTS PR".
- Commit in small steps with clear messages (no attribution lines, CLAUDE.md).

## 3. Verify

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- Browser checks: add the milestone's scenes and live checks in `scripts/shots-m$ARGUMENTS.mjs`, register them in `scripts/shots.mjs`, run `SHOTS_ONLY=m$ARGUMENTS npm run shots`.
- Look at 6–10 of the PNGs in `shots/` that show what changed (phone first, then one wider size). Do not commit them.
- If you changed shared code (layout, store, URL, renderer, panel), also run `SHOTS_SIZES=phone npm run shots` (the full set; it takes a while, run it in the background). Otherwise CI runs it.

## 4. Open the PR

- Push, open the PR against `main` (title `M$ARGUMENTS: <name>`), then edit the description to put the real PR number into every link.
- Use the template in CLAUDE.md: plain language; every check a full preview link with what to do after opening it; **no screenshots**; every question ends with "Recommended: …, because …" and the "accept all" line.
- Then subscribe to the PR's activity (`subscribe_pr_activity`) so the owner's comments in the GitHub app reach this session.
- Tell the owner in chat, in three or four lines: the PR link, what to check first, how many questions there are. Then end your turn.

## 5. While the PR is open

Each time the PR wakes you:

- **CI red** (`check` or `browser-checks`): find the cause and push a fix. Do not ask the owner about red CI.
- **A comment from the owner:** do what it says. "accept all" means apply every recommendation. Then:
  - record the answers in the same PR: a row in the ROADMAP decisions log, and "decided in the M$ARGUMENTS PR" notes in the spec section;
  - run the checks again (section 3), push, and reply on the PR in a few lines: what changed, the new commit's first 7 characters (the preview footer shows it), anything left to check.
- **A review comment** (it starts with "Independent review" or ends with a Claude Code footer): do not act on it by yourself. The owner replies with which items to fix.
- Bug reports from the owner usually carry a link from the app's Share button: open the same state in the browser checks to reproduce it before fixing.
- **Merged or closed:** unsubscribe and stop. Do not start the next milestone.
