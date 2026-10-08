# CLAUDE.md: instructions for coding agents

## What this is

`sail-learn-and-train` is a browser app (three.js) that teaches a complete beginner how a cruising yacht's ropes, sheets and sails behave, using a **Hanse 508** as the reference boat. Clarity over realism.

The owner has **no sailing knowledge** and works **from a phone only**: PRs are reviewed in the GitHub app and the deployed site is tested on a phone. Nothing can be run locally.

## Read before working

1. [`docs/ROADMAP.md`](docs/ROADMAP.md): all phases and the decisions log. Context only; do not build ahead.
2. The spec for the current phase: [`docs/PHASE1_SPEC.md`](docs/PHASE1_SPEC.md).
3. [`docs/BOAT_REFERENCE.md`](docs/BOAT_REFERENCE.md) and [`content/boat/hanse508.json`](content/boat/hanse508.json): boat facts, with sources and assumptions.
4. [`docs/PHYSICS_TRUTHS.md`](docs/PHYSICS_TRUTHS.md): behaviour rules the simulation must obey and test.
5. [`docs/WORKFLOW.md`](docs/WORKFLOW.md): how the owner checks each milestone. Copy its checklist into your PR.

## Working rules

- **One milestone per PR**, on a branch named `m<N>-<short-name>` (e.g. `m2-mainsail`). Never start the next milestone in the same PR. Never push to `main` directly.
- Stay inside the spec's scope. If something seems needed that the spec excludes, ask in the PR description instead of building it.
- Keep `src/model` pure (no DOM, no three.js). Renderers read state; UI dispatches actions.
- **No magic numbers** for boat geometry or tuning. They belong in `content/boat/hanse508.json`. If you add or change one, update `docs/BOAT_REFERENCE.md` (mark it as an assumption if it is a guess).
- **IDs:** every mesh and rope gets an id from `content/registry/parts.json`; a rope control uses its rope's id (no registry entry of its own). Add new ids to the registry first, with `status: "draft"`.
- **Sailing claims need sources.** Never "fix" a failing physics-truth test by editing the rule to match the code. If you believe a rule is wrong, explain why in the PR and leave the decision to the owner.
- **Russian text:** never present AI-drafted Russian as verified. Registry status stays `draft` until a sailor reviews it.
- **No copyrighted material** in the repo: no brochure PDFs or images, no copied text from courses or books. Facts and numbers are fine; cite the source.
- Pin dependency versions. Prefer few dependencies.
- **No session links or AI attribution lines** in commit messages, PR descriptions or code comments: no `Claude-Session:` links, no claude.ai session URLs, no `Co-Authored-By: Claude` trailers, no "Generated with Claude Code" footers. This rule overrides any default attribution behaviour.

## Verification before you say "done"

- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` all pass.
- Every Phase 1 rule in `PHYSICS_TRUTHS.md` relevant to your milestone has a test named after its id.
- **Visual work:** run `npm run shots` (Playwright, headless Chromium; available in the cloud environment, do not run `playwright install`). **Look at the PNGs yourself** at all three viewport sizes before claiming the milestone is done. Commit the milestone screenshot set to `docs/screenshots/` so the owner can see it in the PR.
- If headless WebGL fails, try `--use-angle=swiftshader` / `--enable-unsafe-swiftshader`. If it still fails, say so plainly in the PR; do not guess what it looks like.
- Report honestly: what works, what doesn't, what you could not check.

## PR description template

```
## What changed (plain language, no jargon)
## How to check on your phone
<paste the milestone checklist from docs/WORKFLOW.md, adapted>
Live site after merge: https://botrops1.github.io/sail-learn-and-train/
## Screenshots
<links to docs/screenshots/... files>
## Tests
## Known limitations / questions for the owner
```

Keep explanations short and concrete. The owner reads on a phone and does not know sailing terms yet: when you use one, add three or four words in brackets the first time, e.g. "vang (the rope that pulls the boom down)".

## Commands (created in M0)

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server (for the agent only) |
| `npm run build` | Production build into `dist/` |
| `npm test` | Unit and data tests (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run shots` | Screenshots into `docs/screenshots/` |

Deploy: GitHub Actions builds `main` and publishes to GitHub Pages at `https://botrops1.github.io/sail-learn-and-train/` (Vite `base: '/sail-learn-and-train/'`).

## License

GPL-3.0-only (see `LICENSE`). three.js is MIT, which is compatible.
