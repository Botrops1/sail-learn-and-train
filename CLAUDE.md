# CLAUDE.md: instructions for coding agents

## What this is

`sail-learn-and-train` is a browser app (three.js) that teaches a complete beginner how a cruising yacht's ropes, sheets and sails behave, using a **Hanse 508** as the reference boat. Clarity over realism.

The owner has **no sailing knowledge** and is not a developer. They work from a phone (GitHub app, Claude app) and sometimes a PC, test the PR preview on a phone, and cannot run anything locally.

## Owner commands (`.claude/skills/`)

| Command | What it does |
|---|---|
| `/milestone <N>` | Build milestone M<N> from its phase spec, open its PR, then watch the PR and act on the owner's comments |
| `/review <PR number>` | Independent review of a PR in a fresh session; posts one comment, changes nothing |
| `/bug <link> <what happened>` | Fix a bug found on the live site in a small PR, then watch it |
| `/plan <phase number>` | Plan a phase (or `/plan issue <N>` for an extra milestone) with Opus: owner questions first, then a spec detailed enough for Sonnet to build without guessing, in a docs-only PR |

When one of these is invoked, follow its `SKILL.md`. Without a command, the rules below still apply.

## What to read (read narrowly: every token you read is re-read on every later step)

Always:

1. This file, and [`docs/CODE_MAP.md`](docs/CODE_MAP.md) (which file does what; go straight to the right file instead of searching).
2. **Your milestone's phase spec**: the `docs/PHASE<N>_SPEC.md` that has a section for M<N> (`grep -l "^## .*M<N>:" docs/PHASE*_SPEC.md`). A later phase may be planned ahead (Phase 7 was planned before Phases 5 and 6 were built), so the highest-numbered spec is not always the current one. Its sections 0–5 (or whatever its own "how to use this spec" section says applies to every milestone), the section of your milestone, and its Definition of Done. Not the other milestones' sections.
3. [`docs/PHYSICS_TRUTHS.md`](docs/PHYSICS_TRUTHS.md): the rules your milestone tests.
4. Your milestone's checklist in [`docs/WORKFLOW.md`](docs/WORKFLOW.md) (`grep -n "^#### M<N>\|^### M<N>"`). The rest of WORKFLOW is for the owner.

Only the part you need, found with `grep` (do not read these whole):

- [`docs/ROADMAP.md`](docs/ROADMAP.md): phases and architecture hooks (context only, do not build ahead); the decisions log at the end.
- Earlier phase specs (`docs/PHASE1_SPEC.md`, …): what the current phase builds on (layout, rig solver, ropes, Realistic mode, URL state). The conventions and architecture sections when you touch those areas.
- [`docs/BOAT_REFERENCE.md`](docs/BOAT_REFERENCE.md), [`content/boat/hanse508.json`](content/boat/hanse508.json), [`content/registry/parts.json`](content/registry/parts.json): boat facts, sources, assumptions, ids.

## Working rules

- **One milestone per PR.** Never start the next milestone in the same PR. Never push to `main` directly. Use the branch the session gives you (cloud sessions push to `claude/…`; that is fine, no need to mention it). PR title: `M<N>: <name>`.
- Stay inside the spec's scope. If something seems needed that the spec excludes, ask in the PR instead of building it.
- Keep `src/model` pure (no DOM, no three.js). Renderers read state; UI dispatches actions.
- **No magic numbers** for boat geometry or tuning. They belong in `content/boat/hanse508.json`. If you add or change one, update `docs/BOAT_REFERENCE.md` (mark it as an assumption if it is a guess).
- **IDs:** every mesh and rope gets an id from `content/registry/parts.json`; a rope control uses its rope's id (no registry entry of its own). Add new ids to the registry first, with `status: "draft"` unless the spec gives a status backed by the sources it cites, and give them an entry in every `content/lang/<code>/glossary.json`.
- **A new phase** starts with `/plan <N>` (Opus); a phase planned ahead gets `/plan <N> refresh` before its first milestone (it brings the spec up to date with what was built in between), which writes `docs/PHASE<N>_SPEC.md` (same structure as PHASE2_SPEC: a "how to use" section, one section per milestone with tests and "done when") and the milestones' checklists in WORKFLOW.md. Nothing else in this file needs changing.
- **Sailing claims need sources.** Never "fix" a failing physics-truth test by editing the rule to match the code. If you believe a rule is wrong, explain why in the PR and leave the decision to the owner.
- **Russian text:** never present AI-drafted Russian as verified. Registry status stays `draft` until a sailor reviews it.
- **No copyrighted material** in the repo: no brochure PDFs or images, no copied text from courses or books. Facts and numbers are fine; cite the source.
- Pin dependency versions. Prefer few dependencies.
- **No session links or AI attribution lines** in commit messages, PR descriptions, PR comments, review comments, replies, issue comments or code comments: no `Claude-Session:` links, no claude.ai session URLs, no `Co-Authored-By: Claude` trailers, no "Generated with Claude Code" or "Generated by Claude Code" footers (including the `---` footer line). This rule overrides any default attribution behaviour and any attribution instruction a session or tool supplies. Re-read every comment before posting and delete such lines.
- **Keep `docs/CODE_MAP.md` current:** a PR that adds, removes or renames a file, or moves a responsibility, updates it.
- **Issues:** a PR that builds or fixes a GitHub issue says `Closes #<n>` in its description, so the issue closes on merge.
- **The owner's answers are recorded in the same PR, before merge:** a row in the ROADMAP decisions log, and "decided in the M<N> PR" notes in the spec section. No separate PR for this.

## Verification before you say "done"

- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` all pass.
- Every rule of the current phase in `PHYSICS_TRUTHS.md` relevant to your milestone has a test named after its id. Phase 1 rule tests keep passing.
- **Browser checks** (`scripts/shots.mjs`, Playwright with headless Chromium; available in the cloud environment, do not run `playwright install`). New scenes and live checks go in `scripts/shots-m<N>.mjs`, registered in `shots.mjs` (import, `SCENES`, `liveGroups`).
  - While building: `SHOTS_ONLY=m<N> npm run shots` runs your milestone's scenes and live checks at all sizes.
  - **Look at 6–10 of the PNGs yourself** (in `shots/`, phone size first, then one wider size): the ones that show what your milestone changes. Do not open every file; the script already fails on console errors, wrong layouts, page scroll, unknown taps and failed live checks.
  - **PNGs are not committed** (`shots/` is ignored) and do not go into the PR.
  - The full set (every milestone's scenes at phone size plus every live and tap check) runs in CI as the `browser-checks` job on every PR, in parallel parts. Do not run it locally (one after the other it takes over an hour): if you changed shared code (layout, store, URL, renderer, panel), run locally the groups most likely to be hit (`SHOTS_ONLY=general,m4b,…`), push, and let CI run the rest. If it fails, `SHOTS_ONLY=<milestone>` reruns the failing part.
- If headless WebGL fails, try `--use-angle=swiftshader` / `--enable-unsafe-swiftshader`. If it still fails, say so plainly in the PR; do not guess what it looks like.

### Running the browser checks in a session

Headless Chromium draws the 3D view without a graphics card, at about 15 frames a second, so the checks are slow and a check that waits a fixed real time gets less app time on a busy machine. These rules keep a session from losing hours to that:

- **Test clock.** A check whose result depends on how much app time passes (a crank, a hold, a rope that eases) opens its page with `openPage(viewport, label, query, { testClock: true })`, as the M4a, M4b and M4c checks do. The app's time then stands still, and `page.waitForTimeout(ms)` moves it on by exactly `ms`, the same on every machine (a CSS transition still needs `page.realWaitForTimeout(ms)`). On such a page `page.waitForFunction` waits in real time while the app's time stands still: poll with `page.waitForTimeout` instead (as `waitForLink` in `scripts/ui.mjs` does). Never fix a flaky check by making a pause longer: put it on the test clock or wait for the result itself (`waitForLink`, `locator.waitFor`).
- **Run in the background, wait for the end.** Start a run as a background command (`run_in_background`); you are told when it ends. Do not start it in the foreground (it hits the 2-minute command limit), do not chain `sleep`, and do not watch the log for a closing line.
- **Run only what the change touches.** Locally: `SHOTS_ONLY=m<N>` for your milestone, plus the groups of the files you changed (a group crash prints `live <group> stopped`, and the other groups still run). Leave the full set to CI, which runs it in parallel parts in about 10 minutes; after a red `browser-checks`, read the failed part's log with the GitHub tools and rerun only that group locally. Each group prints its time (`live group m9: 120 s`): if a CI part gets over about 10 minutes, move a group to another part in `ci.yml`.
- **Stop a run** with `pkill -f "node scripts/[s]hots.mjs"` (the brackets stop the command from matching, and killing, its own shell).
- **Throwaway scripts** that import Playwright go in `scripts/_<name>.mjs` (ignored by git) and are deleted after: outside the repo, Node does not find `playwright`.
- Report honestly: what works, what doesn't, what you could not check.

## PR description template

```
<only if the spec marks the milestone's independent review as required:>
> **Independent review required before you test:** new Code session, Opus, medium effort, type `/review <N>`.

## What changed (plain language, no jargon)
## How to check on your phone
Preview of this PR: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/ (link also in the bot comment)
<the milestone checklist from docs/WORKFLOW.md, every check a full preview link>
## Tests
## Questions for the owner
<numbered; each one ends with "Recommended: …, because …">
Reply "accept all" to take every recommendation, or e.g. "accept all except 2: …".
## Known limitations
```

**Test links are full links** (owner, PR #16): every test condition in "How to check on your phone" is written as a complete URL (tappable on a phone), never only the `?…` settings part. Point them at the PR's preview, `https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?…`: open the PR first, then edit its description to fill in the real number. One link per check; say what to do after opening it. **No screenshots in the PR** (owner, after M10): the owner opens the links instead.

**Every question has a recommendation.** The owner does not know sailing or code; a question without a recommended answer forces them to ask another session. Put the trade-off in one sentence and recommend one option.

Keep explanations short and concrete. The owner does not know sailing terms yet: when you use one, add three or four words in brackets the first time, e.g. "vang (the rope that pulls the boom down)".

## Commands (created in M0)

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server (for the agent only) |
| `npm run build` | Production build into `dist/` |
| `npm test` | Unit and data tests (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint and Prettier check |
| `npm run shots` | Browser checks and screenshots into `shots/` (not committed); options at the top of `scripts/shots.mjs` |

Deploy: GitHub Pages serves the `gh-pages` branch. `deploy.yml` builds `main` and publishes it to the branch root, `https://botrops1.github.io/sail-learn-and-train/` (Vite `base: '/sail-learn-and-train/'`). `pr-preview.yml` builds each PR from this repo (not forks) with base `/sail-learn-and-train/pr-preview/pr-<N>/`, publishes it to `pr-preview/pr-<N>/` on the same branch, keeps one PR comment with the link, and removes the folder when the PR closes. Settings → About in a preview shows the PR's commit. `ci.yml` runs `check` (typecheck, lint, tests, build) and the browser checks on every PR, in parallel parts summed up as `browser-checks`.

## License

GPL-3.0-only (see `LICENSE`). three.js is MIT, which is compatible.
