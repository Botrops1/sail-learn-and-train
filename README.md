# sail-learn-and-train

A free web app that shows a complete beginner how a cruising yacht's ropes, sheets and sails behave. It runs in the browser, on a phone first.

The reference boat is a **Hanse 508** (in-mast furling main, self-tacking jib, German mainsheet, twin wheels, two electric winches). Clarity over realism: the boat stands still, you set a test wind by hand, and you see what each rope does.

**Live site:** https://botrops1.github.io/sail-learn-and-train/

## What you can do

- **Look at the boat in 3D.** Drag to turn it, pinch to zoom, or use the camera buttons (port side, starboard side, top, bow, helm). Tap any part or rope to see its name, the label written on the boat and what it does. The names are also written on the boat itself (**Labels in 3D**, View tab).
- **Set a test wind** (Wind tab): direction on a dial, speed in knots, five presets. The sails and the boom react; a sail that is let out too far flaps.
- **Work the ropes** (Ropes tab). The two clutch banks are drawn as on the boat, with their real labels ("Genoa sheet" is the jib sheet).
  - **Easy mode:** every rope is a slider (1 % or 5 % steps). The main idea: *ropes limit, wind pushes*: easing a sheet only lets the wind push the sail further.
  - **Realistic mode:** one place at a time (port, starboard, helm, mast), clutches opened and closed, ropes wrapped on the electric winches with turns, the self-tailer, ropes that slip or run out when not held, the winch handle and the mast furling gearbox, and Pause.
- **Share what you see:** the address (or View → Share) reproduces the exact state, useful for questions and bug reports.

Phase 1 (this boat and its controls) ends with milestone M5, signed off by the owner after testing on a phone. Later phases add a moving boat, waves, a learning layer with Russian names, harbours and exercises: see [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Documents

| File | What it is |
|---|---|
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | All phases, architecture principles, decisions log |
| [`docs/PHASE1_SPEC.md`](docs/PHASE1_SPEC.md) | What Phase 1 builds, how, and when it is done |
| [`docs/BOAT_REFERENCE.md`](docs/BOAT_REFERENCE.md) | Facts about the boat, sources, assumptions, open questions |
| [`docs/PHYSICS_TRUTHS.md`](docs/PHYSICS_TRUTHS.md) | Sailing rules the simulation must obey, with sources and tests |
| [`docs/WORKFLOW.md`](docs/WORKFLOW.md) | How to build and check each milestone from a phone |
| [`docs/EXERCISES.md`](docs/EXERCISES.md) | Planned exercises, failure modes and wind modes (later phases) |
| [`CLAUDE.md`](CLAUDE.md) | Instructions for the coding agent |
| [`content/`](content) | Boat geometry and the term registry (data, not code) |

## How it is built

Developed with Claude Code in the cloud and reviewed from a phone. Stack: Vite, TypeScript, three.js, Vitest; deployed with GitHub Actions to GitHub Pages.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build into `dist/` |
| `npm test` | Unit and data tests (Vitest) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint and Prettier check |
| `npm run shots` | Build, then screenshots into `docs/screenshots/<milestone>/` |
| `node scripts/visual-shots.mjs` | After a build: camera presets and close-ups at both detail levels, plus draw calls, triangles and FPS |

Add `?debug=1` to the address to see the frame rate, the slowest frame and the work per frame (for performance reports).

## Disclaimer

A learning aid for understanding, **not** a substitute for sailing instruction or the skipper's briefing. Geometry and behaviour are simplified. Terms marked "draft" have not been reviewed by a sailor yet.

Hanse and Hanse 508 are names of their owner; this project is not affiliated with Hanse Yachts. No manufacturer material is included; boat figures are cited from the public specification.

## License

GPL-3.0-only. See [`LICENSE`](LICENSE).
