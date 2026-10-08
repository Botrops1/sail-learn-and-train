# Roadmap

**Context for every session. Do not build ahead.** Only the phase named in your task is in scope. Later phases are listed so today's architecture leaves room for them.

## Purpose

A free, browser-based tool that helps a complete beginner understand what they see on a cruising yacht:

- what each rope and control does;
- how the sheets and sails react to the wind;
- what the terms are, in English and Russian;
- typical problems and their fixes.

The reference boat is a **Hanse 508**. The tool favours clarity over realism.

## Phases

| Phase | Theme | Main content | Status |
|---|---|---|---|
| **1** | **Boat and controls** | 3D Hanse 508, continuous rope controls (1 %/5 % steps), test wind set by hand, boom/jib solver, sagging ropes, cockpit clutch-bank panel, tap-to-identify, URL state, CI and Pages deploy | **Next** ([spec](PHASE1_SPEC.md)) |
| 2 | Wind and feedback | Boat moves: speed, heading, heel. Apparent wind. Sail forces and sheet loads (kN) fed back into the panel. Trim quality (luffing / good / stalled) from sourced rules and telltales. Gusts, lulls, wind shifts as events. Accidental gybe with boom energy and peak load; preventer. Bird's-eye 2D view with wind arrows and the no-go zone. Wind instrument display (AWA/AWS/TWA/TWS). Engine lever (ahead/neutral/astern, rpm). | Planned |
| 3 | Basic environment | Water with simple waves and boat motion, horizon and sky, a few buoys as reference marks, wind made visible on the water. Low-poly, phone-friendly. | Planned |
| 4 | Learning layer | Every object, rope and term can be opened: names in EN/RU, aliases, what it does, which controls affect it, typical mistakes and fixes, source and review status. Glossary and search. Russian UI. | Planned |
| 5 | Detailed surroundings | Marina with pier, lazy lines and mooring (Mediterranean stern-to), prop walk and crosswind for docking practice. | Planned |
| 6 | Exercises | Guided tasks with checks, e.g. trim through the points of sail; gust response; furling/reefing; tack and controlled vs. accidental gybe; Med mooring. Format per exercise: what you see → what is happening → the right action → the typical mistake. Based on an established beginner syllabus (RYA Competent Crew / ASA 101 topics). | Planned |
| 7 | More languages | More languages added as data (German first). | Planned |
| Later | Separate modules | Navigation (charts, instruments, rules of the road); gennaker/reacher behind a settings toggle; other boat models. | Ideas |

## Architecture hooks to keep from Phase 1 onwards

- **IDs everywhere.** Every mesh and rope maps to an id in `content/registry/parts.json`; a rope's UI control uses its rope's id. Phase 4 hangs its content on these ids.
- **Pure model.** `src/model` has no DOM and no three.js. `step(state, dt)` already takes boat velocity and heading (zero in Phase 1).
- **Data-driven boat and sails.** Geometry, ropes, controls and optional sails (gennaker `enabled: false`) come from `content/boat/hanse508.json`. A second boat later means a second data file, not new code paths.
- **i18n from day one.** UI strings through `t()`. Names come from the registry by language code. Adding a language means adding data.
- **Verifiable content.** Sailing claims carry a source and a status (`docs/PHYSICS_TRUTHS.md`, registry `status` and `sources`). Phase 4 can show "unverified" markers.
- **Shareable state.** The URL reproduces what the user sees. Use it for bug reports and later for exercise links.

## Decisions log

| Date | Decision |
|---|---|
| 2026-10-07 | Build it ourselves with Claude Code in the cloud, developed and tested from a phone only. No local installs. |
| 2026-10-07 | Clarity over realism. Quasi-static rig model in Phase 1; dynamics in Phase 2. |
| 2026-10-07 | Languages: English and Russian first, others later as data. |
| 2026-10-07 | Reference boat: Hanse 508 with in-mast furling, self-tacking jib, German mainsheet, twin wheels. Gennaker not rigged; keep a data slot. |
| 2026-10-07 | Phase order: controls → wind and feedback → environment → learning layer → detailed surroundings → exercises → translations. |
| 2026-10-08 | Repo `Botrops1/sail-learn-and-train`, public, GPL-3.0. Hosting: GitHub Pages. |
| 2026-10-08 | Layout: portrait first, also near-square foldables and desktop (stacked vs. side-by-side at 700 px / aspect 0.8). |
| 2026-10-08 | Stack: Vite + TypeScript + three.js + Vitest, no UI framework unless a clear need appears. |
| 2026-10-08 | Control ids: controls do not get their own registry entries. A rope control's `data-part-id` is its rope's id (e.g. `ctl_vang` → `rope_vang`). Ids for controls without a rope (wheel, test wind) are decided in M2. |
| 2026-10-08 | Camera in the URL: only the preset is stored (`cam` = side-port, side-starboard, top, bow, helm or free). Dragging switches to `cam=free`; a link with `cam=free` opens the default view. The free camera position is not stored. |
| 2026-10-08 | License stays GPL-3.0-only. |
| 2026-10-08 | M1 review: lifelines and stanchions are modelled; optional winches are not rendered. Helm view shows the cockpit (wheel, winch, clutch bank in front). Top view: bow up in the stacked layout, bow right side by side. Stacked layout: the info card is a compact strip at the top of the panel. |
| 2026-10-08 | M2: the test-wind controls (dial and speed) use the registry id `env_wind` (also on the wind streaks). Proposed for the wheel control in M4: `part_rudder`. |
| 2026-10-08 | M2 review: spec follows the code. Boom lift uses the fill with the boom at its lowest allowed pitch (not the previous frame's); the first 1 % of mainsheet has its own continuity test; gybe at 15° or more by the lee; ropes sag at right angles to the rope and stop at the deck, never thinner than about 2.5 px on screen; "taut" main sheet only without spare rope; paid-out metres never exceed the manual's total rope length. `part_rudder` for the wheel control in M4 accepted. |
| 2026-10-08 | M2 follow-ups (owner-approved, done in M3): the boom's lowest pitch is max(topping-lift limit, rigid vang strut stop −2°), the topping lift's eased limit is −6° again, so an eased lift hangs slack; the outhaul is modelled 1:1 with one part along the boom (purchase unconfirmed). |
| 2026-10-08 | M3 decisions: 100 % jib sheet = sheet released for furling (available length max(sailing length, length the furl needs)), so the jib furls completely; below 100 % furling stops with the hint. The outhaul keeps its mechanically valid route, marked unconfirmed (manual 16 m, route about 21 m). Up to about 9° per 1 % of "Jib out" next to where the sheet holds the jib on the centreline is accepted. |
| 2026-10-08 | M3 review fixes (owner asked to address the review on PR #6): fully hauled jib = car at the end of the track, about 14° out (PT-10 at 0 % sheet; ease range retuned to 1.4 m so PT-11 stays about 31°); a released sheet lets the furling jib keep its angle and flap instead of pulling it to the centreline; continuity exceptions for "Jib out" and for hauling the jib sheet off 100 % written into PHASE1_SPEC 11; URL round-trip of a "sheet fighting a furled jib" state left for M4 (Share button). |
| 2026-10-08 | M3b visual pass (owner request, between M3 and M4): realistic but low-poly materials and lighting, procedural only (no model or texture files). Shadows and reflections only at **Detail: High** (View tab, `detail=high\|low` in the URL; phones start on Low). The mainsail bends around spreader tips and shrouds; the boom's 72° limit is unchanged. Control lines drop from the mast at 75–80° to one turning block each and run aft in covered channels; the sprayhood stands just aft of the mainsheet deck blocks (photo; placement proposed in the M3b PR) with its edges on the channels; JIB ROLL continues to the port winch's self-tailer. |
| 2026-10-08 | M4 split (owner): M4a = Ropes tab in Easy mode (sliders), clutch-bank drawing, selection sync, hints, legend, wheel, full URL state, Share, Reset; M4b = Realistic mode (clutches and winches worked by hand). The Ropes tab's mode setting is `settings.ropesMode`. The link restores a jib sheet hauled against a partly furled jib (`jr`). |
