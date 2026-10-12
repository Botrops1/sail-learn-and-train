---
name: plan
description: Plan a phase of sail-learn-and-train (e.g. "/plan 3") or an extra milestone (e.g. "/plan issue 26"). Run with Opus at high effort; writes a spec detailed enough for Sonnet at high effort to build each milestone without guessing, then opens a docs-only PR and watches it.
argument-hint: <phase number> | issue <number> | <short description of an extra milestone>
disable-model-invocation: true
model: opus
---

# Plan: $ARGUMENTS

The owner typed `/plan $ARGUMENTS`. If nothing was given, ask what to plan and stop.

**Who reads what you write.** Each milestone will be built by a separate **Sonnet** session (high effort) that reads only CLAUDE.md, the spec's general sections, its own milestone section, its PHYSICS_TRUTHS rules and its WORKFLOW checklist. That session cannot ask you anything. Every gap you leave becomes a guess, and guesses are where bugs come from. Your job is to make the decisions now, so the builder only has to type them in.

The owner is not a developer and not a sailor. They answer questions in plain words, from a phone.

## 1. Understand (read in full this time)

- CLAUDE.md, `docs/CODE_MAP.md`, `docs/ROADMAP.md` (the phase's row, the architecture hooks, the whole decisions log), `docs/EXERCISES.md`, the open questions in `docs/BOAT_REFERENCE.md`.
- The latest phase spec in full: its structure is the template. For Phase 3 onward, copy PHASE2_SPEC's structure.
- Open GitHub issues (`list_issues`): which ones belong to this plan.
- The code the plan builds on: `src/model`, `src/app/store.ts`, the URL state, the renderers and panels it touches. Note the real function names, file paths and data keys; the spec must use them.
- `content/boat/hanse508.json` and `content/registry/parts.json`: the keys and ids that exist.

## 2. Ask the owner first (in chat, before writing the spec)

Write a short outline: the goal in two sentences, the milestones (one line each, what the owner will see), and what is left out. Then ask every question whose answer changes the design, in plain words, numbered, **each with "Recommended: …, because …"**. Group them so one message covers everything. Typical topics: what the learner should see and do, behaviour on the real boat, defaults, what is out of scope. Stop and wait for the answers. Ask a second round only if an answer opens a new question.

## 3. Write the spec: `docs/PHASE<N>_SPEC.md` (or a new section in the current spec for an extra milestone)

General sections (keep them under about a quarter of the file; every builder reads them):

- **0. How to use this spec**: one milestone per PR; read 0–5 then your section; build order; numbers are final; what to do when a test band fails (check the formulas against 3.x "common mistakes", then tune only keys marked **tunable**, report before/after, never widen a band); keep signatures; write back decisions as "decided in the M<N> PR"; earlier phases keep working.
- **Goal, scope (in / out), conventions** (frames, signs, units, angle ranges: state them, do not assume), **shared helpers** (name, file, signature, one-line behaviour), **sources**, **common mistakes** (sign flips, degrees vs radians, units, frame order, state not reset), **architecture** (new state fields with types, order of work in the step, files added per milestone), **milestones overview** (table: milestone, what the owner sees, rules tested, depends on, **independent review**: required / not needed).

Each milestone section, in this order:

0. **Independent review** line, directly under the heading: `**Independent review: required** (<why, one line>)` or `**Independent review: not needed** (<why>)`. See "When a review is required" below.
1. **Files** to create or change, with paths.
2. **Data**: the JSON to add, verbatim, with every value; mark tunable keys.
3. **Model**: formulas written out, with units; function signatures in TypeScript; edge cases (zero wind, head to wind, paused, held still, both tacks).
4. **Store and URL**: state fields, actions, URL keys with ranges and defaults, and what old links do.
5. **UI** and **3D**: what appears where, at phone size first; text strings (exact English); touch targets ≥ 44 px; what the owner can tap.
6. **Strings and registry**: new keys and ids, `status: "draft"`.
7. **Tests**: named after PHYSICS_TRUTHS ids where they apply; each with inputs and an expected value or **band**. Bands come from a prototype (step 4), not from intuition.
8. **Browser checks**: scenes (name and link) and live checks (what is done, what must be seen) for `scripts/shots-m<N>.mjs`.
9. **Done when** and **Not in this milestone**.

Rules for every section:

- **No "TBD", "as appropriate", "e.g." or "about" in anything the builder must implement.** Unknown sailing facts become owner questions or assumptions marked as such in `BOAT_REFERENCE.md`.
- One way to do each thing. If two approaches are possible, choose one and say why in one line.
- Milestones are small enough to check on a phone in 15 minutes, each mergeable on its own, built in order.
- Refer to existing code by real path and name.

### When a review is required

The owner cannot read code and a phone check only shows what is visible, so mark a milestone **required** when any of these holds:

- it adds or changes **physics or model formulas** (forces, speeds, loads, angles, the rig solver), or a PHYSICS_TRUTHS rule;
- a mistake would **teach the wrong sailing** (danger, what to do in an emergency, safety loads);
- it changes **shared state, the step order, URL keys or old links**, or the behaviour of an earlier phase;
- it is large (many files across model, store and UI).

**Not needed** for UI layout, text, visuals, polish and docs-only work. When unsure, mark it required: a review costs one Opus session; a physics bug found later costs a milestone.

## 4. Prototype the numbers

For every formula with a test band: write a throwaway script (scratchpad, not committed) that runs the formulas with the spec's data values against the real model code (`src/model`), the way the Phase 2 bands were made. Put the resulting values and the bands into the spec (band = prototype value ± a stated margin). If the prototype shows a formula behaving badly (NaN, runaway, wrong sign on the other tack), fix the formula now.

## 5. Check it as the builder would

For each milestone, start a subagent with `model: "sonnet"` and give it only what the builder reads (CLAUDE.md, the general sections, that milestone's section, its rules and checklist). Ask it to list every point where it would have to guess, choose, or look something up that is not given, and any contradiction. Fix each point in the spec. Repeat for a milestone until its list is empty or only trivial.

## 6. The other documents

- `docs/PHYSICS_TRUTHS.md`: new rules with the next free ids, plain-words statement, "how to see it" link settings, and sources. Open each source (web access is allowed for the usual sailing sites; if a site is blocked, name it to the owner): status `source-checked` when the source supports the rule, else `to-verify`.
- `docs/WORKFLOW.md`: a checklist per milestone under `#### M<N>: <name>`, every check a full preview link (`https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?…`) with what to do and what the owner should see, in plain words; the link settings the phase adds.
- `docs/ROADMAP.md`: the phase's status, and a decisions-log row with the owner's answers.
- `docs/BOAT_REFERENCE.md`: new assumptions; `content/` only if the plan says data must exist before M1 of the phase.

## 7. PR

- One docs-only PR: `Phase <N> plan: <theme>` (or `Plan: <milestone>`). Description: what the phase will add, in plain words; the milestones table (with the review column, so the owner sees which milestones need `/review`); the owner's answers as recorded; anything still open, each with a recommendation and the "accept all" line.
- Subscribe to the PR's activity and act on the owner's comments as in `/milestone` section 5 (answers go into the spec and the decisions log in the same PR).
- Tell the owner in chat: the PR link, and that after merging they start the first milestone with `/milestone <N>` (Sonnet, high effort).
