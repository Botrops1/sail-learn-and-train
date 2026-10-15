# sail-learn-and-train

A free web app that shows a complete beginner how a cruising yacht's ropes, sheets and sails behave. It runs in the browser, on a phone first.

The reference boat is a **Hanse 508** (in-mast furling main, self-tacking jib, German mainsheet, twin wheels, two electric winches). Clarity over realism: you set a test wind, work the ropes, and see what each rope does. Since Phase 2 the boat also sails: the wind pushes her, and what you do with the ropes, the wheel, the autopilot and the engine changes what she does.

**Live site:** https://botrops1.github.io/sail-learn-and-train/

## What you can do

- **Look at the boat in 3D.** Drag to turn it, pinch to zoom, or use the camera chip (port side, starboard side, top, bow, helm, map). Tap any part or rope to see its name, the label written on the boat and what it does. The names are also written on the boat itself (**Labels in 3D**, in Settings).
- **Set a test wind** (Wind tab): direction on a dial, speed in knots, five presets. The sails and the boom react; a sail that is let out too far flaps.
- **Work the ropes** (Ropes tab). The two clutch banks are drawn as on the boat, with their real labels ("Genoa sheet" is the jib sheet).
  - **Easy mode:** every rope is a slider (1 % or 5 % steps). The main idea: *ropes limit, wind pushes*: easing a sheet only lets the wind push the sail further.
  - **Realistic mode:** one place at a time (port, starboard, helm, mast), clutches opened and closed, ropes wrapped on the electric winches with turns, the self-tailer, ropes that slip or run out when not held, the winch handle and the mast furling gearbox, and Pause.
- **Sail her** (Phase 2). Held still / Sailing switch (Held still is the Phase 1 picture). The boat makes her own wind: the instrument strip and the wind dial show the true and the apparent wind (the wind you feel on board). The wheel turns her only while she moves; the **autopilot** (Standby, hold a heading, or hold a wind angle) tacks and gybes on a button.
- **See what the trim does.** Sails show luffing (flapping), good or stalled trim, with telltales (short ribbons) on the sails; the boat heels, gets weather helm (pulls to windward) and can round up; the main blankets the jib on a run; a sail left flogging wears out. Loads on the sheets come from the real sail forces, in kN.
- **Bird's-eye map** with the boat, her track, both winds, the no-go zone and the points of sail.
- **Wind modes** (Steady, Gusty, Shifty, Building, Dying), repeatable from a link, and a **time bar** (slow motion, pause, up to ×16).
- **Gybes.** An accidental gybe shows the boom's speed, energy and the peak load on the main sheet, and a danger zone on the map; a controlled gybe (main sheet hauled in first) is gentle. The boat has no preventer.
- **Engine:** Start/Stop, one lever from full astern to full ahead with neutral in the middle, rpm, and the engine's Helm-station lever in Realistic mode.
- **Waves and the sky** (Phase 3). A **Waves** setting in the Wind tab (Flat, Sheltered, Coastal, Open sea): the waves grow with the wind and with the fetch (how far the wind has blown over open water) and build up over minutes. The boat heaves, pitches (nose up and down) and rolls on them; the rocking swings the wind the sails feel so they flick, waves from behind at an angle knock the bow off course so the helm keeps correcting, and waves from ahead slow her. Held still bobs but its sails ignore the rocking.
- **Wind on the water.** The water darkens with the wind, white horses (white wave tops) appear from about 7 knots, and in gusty wind a gust shows as a dark patch upwind before it arrives. Four yellow practice buoys mark the start area, in 3D and on the map (tap one to learn what it is); the boat sails through them.
- **Clock, sun and sky.** A clock and date chip over the 3D view (it folds; a switch in Settings) shows the time on board in Croatia (Adriatic, Split), runs with the time bar and starts now, at a time you set, or at noon on 1 June. Sunrise and sunset are right for the place; the sun lights the boat from the right side and the sky goes through day, sunset, twilight and night with stars (the boat stays readable at night).
- **Learn** (Phase 4). Every part, rope and sailing word has an entry in the Learn tab: what it is called (and what else sailors call it), what it does, how it works on this boat, typical mistakes with their fixes, and how sure the app is of each fact (with sources). **More** on a part's card opens its entry, **Show me** sets up a ready scene (the phone's Back button returns), and a search finds names, other names and the words printed on the boat.
- **Language.** The whole app in English or in Russian, one at a time (Settings, or `lang=ru` in the link). The Russian text is an AI draft, marked as not yet checked by a sailor; `docs/review/ru.md` is the document a Russian-speaking sailor reviews.
- **Share what you see:** the address (or Settings → Share) reproduces the exact state, useful for questions and bug reports.

Phase 1 (this boat and its controls) ended with milestone M5, signed off by the owner after testing on a phone. Phase 2 (the moving boat, M6–M13) is done. Phase 3 (waves, wind on the water, clock and sky, M14–M19) and Phase 4 (the learning layer in English and Russian, M20–M24) are done; the Russian text waits for a sailor's review. Link settings added in Phase 3: `sea` (`flat`, `sheltered`, `coastal`, `open`), `clk` (the time on board, local time `YYYYMMDDHHMM`) and `clock` (`0` hides the clock chip). Link settings added in Phase 4: `learn` (opens that entry in the Learn tab, for example `learn=rope_vang`) and `lang` (`ru` shows the app in Russian). Later phases add a new layout and modes, boat details, harbours and anchoring, exercises, and more languages: see [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Documents

| File | What it is |
|---|---|
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | All phases, architecture principles, decisions log |
| [`docs/PHASE1_SPEC.md`](docs/PHASE1_SPEC.md) | What Phase 1 builds, how, and when it is done |
| [`docs/PHASE2_SPEC.md`](docs/PHASE2_SPEC.md) | What Phase 2 builds (the moving boat), milestone by milestone, with the Definition of Done |
| [`docs/PHASE3_SPEC.md`](docs/PHASE3_SPEC.md) | What Phase 3 builds (waves, wind on the water, clock and sky), milestone by milestone, with the Definition of Done |
| [`docs/PHASE4_SPEC.md`](docs/PHASE4_SPEC.md) | What Phase 4 builds (the Learn tab, glossary and search, sailing words, the Russian app, the review document), milestone by milestone, with the Definition of Done |
| [`docs/LANGUAGES.md`](docs/LANGUAGES.md) | How to add a language (one folder of two JSON files) |
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
| `npm run shots` | Build, then browser checks and screenshots into `shots/` (not committed; options at the top of `scripts/shots.mjs`) |
| `node scripts/visual-shots.mjs` | After a build: camera presets and close-ups at both detail levels, plus draw calls, triangles and FPS |

Add `?debug=1` to the address to see the frame rate, the slowest frame and the work per frame (for performance reports).

## Disclaimer

A learning aid for understanding, **not** a substitute for sailing instruction or the skipper's briefing. Geometry and behaviour are simplified. Terms marked "draft" have not been reviewed by a sailor yet.

Hanse and Hanse 508 are names of their owner; this project is not affiliated with Hanse Yachts. No manufacturer material is included; boat figures are cited from the public specification.

## License

GPL-3.0-only. See [`LICENSE`](LICENSE).
