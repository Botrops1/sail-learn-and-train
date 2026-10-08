# sail-learn-and-train

A web-based tool for sailing training and knowledge building: see how a cruising yacht's ropes, sheets and sails react to the wind, and learn what everything is called in English and Russian.

The reference boat is a **Hanse 508** (in-mast furling main, self-tacking jib, German mainsheet, twin wheels).

**Status:** Phase 1 (interactive boat and rope controls) is about to start. Nothing to try yet.
**Live site** (after the first deploy): https://botrops1.github.io/sail-learn-and-train/

## Documents

| File | What it is |
|---|---|
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | All phases, architecture principles, decisions log |
| [`docs/PHASE1_SPEC.md`](docs/PHASE1_SPEC.md) | What Phase 1 builds, how, and when it is done |
| [`docs/BOAT_REFERENCE.md`](docs/BOAT_REFERENCE.md) | Facts about the boat, sources, assumptions, open questions |
| [`docs/PHYSICS_TRUTHS.md`](docs/PHYSICS_TRUTHS.md) | Sailing rules the simulation must obey, with sources and tests |
| [`docs/WORKFLOW.md`](docs/WORKFLOW.md) | How to build and check each milestone from a phone |
| [`CLAUDE.md`](CLAUDE.md) | Instructions for the coding agent |
| [`content/`](content) | Boat geometry and the term registry (data, not code) |

## How it is built

Developed with Claude Code in the cloud and reviewed from a phone. Stack: Vite, TypeScript, three.js, Vitest; deployed with GitHub Actions to GitHub Pages.

## Disclaimer

A learning aid for understanding, **not** a substitute for sailing instruction or the skipper's briefing. Geometry and behaviour are simplified. Terms marked "draft" have not been reviewed by a sailor yet.

Hanse and Hanse 508 are names of their owner; this project is not affiliated with Hanse Yachts. No manufacturer material is included; boat figures are cited from the public specification.

## License

GPL-3.0. See [`LICENSE`](LICENSE).
