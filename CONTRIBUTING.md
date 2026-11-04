# Contributing

Thank you for wanting to help. **Sail: learn and train** is a free browser app that shows a complete beginner how a cruising yacht's ropes, sheets and sails behave, on a 3D Hanse 508. Try it first: **https://botrops1.github.io/sail-learn-and-train/**

The project owner is learning to sail and is not a developer. The app is built in small, planned steps with an AI coding agent, and every change is checked on a phone before it goes live. That shapes how contributions work (below).

## Ways to help without writing code

These are the most useful contributions right now.

| You are… | You can… | How |
|---|---|---|
| Anyone | Report something that does not work | [Bug form](https://github.com/Botrops1/sail-learn-and-train/issues/new?template=bug.yml). Settings → Share in the app copies a link to exactly what you see: paste it in. |
| A sailor | Correct a wrong or unclear sailing fact | [Sailing fact form](https://github.com/Botrops1/sail-learn-and-train/issues/new?template=sailing-fact.yml). Please name a source (a book, a course, a manual, a rule). |
| A Russian‑speaking sailor | Check the Russian text, which is still an AI draft | Read [`docs/review/ru.md`](docs/review/ru.md) and answer by the entry's code (for example `term_north: ок`) in a [translation form](https://github.com/Botrops1/sail-learn-and-train/issues/new?template=translation.yml). |
| Someone who speaks another language | Add a language | [`docs/LANGUAGES.md`](docs/LANGUAGES.md): a language is one folder of two text files. |
| An owner of a similar yacht | Describe your boat | [`docs/BOAT_PROFILE.md`](docs/BOAT_PROFILE.md): a boat profile is one file of numbers, no code. |
| Anyone | Suggest an idea | [Idea form](https://github.com/Botrops1/sail-learn-and-train/issues/new?template=idea.yml), or ask in [Discussions](https://github.com/Botrops1/sail-learn-and-train/discussions). |

## Contributing code

### Before you start

**Open an issue first** for anything bigger than a small fix. New features are planned phase by phase ([`docs/ROADMAP.md`](docs/ROADMAP.md)), each with a written spec (`docs/PHASE<N>_SPEC.md`), so a pull request that adds an unplanned feature may have to wait for its phase.

### Set up

You need Node.js 22.12 or newer.

```
npm ci
npm run dev          # the app at http://localhost:5173/sail-learn-and-train/
```

[`docs/CODE_MAP.md`](docs/CODE_MAP.md) says which file does what. Stack: Vite, TypeScript, three.js, Vitest, Playwright for the browser checks.

### Checks (all must pass)

```
npm run typecheck
npm run lint
npm test
npm run build
```

`npm run shots` runs the browser checks (headless Chromium). The full set takes over an hour on one machine, so run only the groups your change touches, for example `SHOTS_ONLY=m5 npm run shots`; CI runs everything on your pull request.

### The rules

These are the same rules the coding agent follows ([`CLAUDE.md`](CLAUDE.md)); if you use an AI coding agent too, it will read that file.

1. **One change per pull request**, small enough to check on a phone.
2. **Sailing claims need sources.** The rules the simulation must obey are in [`docs/PHYSICS_TRUTHS.md`](docs/PHYSICS_TRUTHS.md), each with a source and a test. Never change a rule to make a failing test pass; if you think a rule is wrong, say why in the pull request.
3. **No magic numbers.** The boat's sizes and tuning live in [`content/boat/hanse508.json`](content/boat/hanse508.json); a new or changed number is also written in [`docs/BOAT_REFERENCE.md`](docs/BOAT_REFERENCE.md) (marked as an assumption if it is a guess).
4. **`src/model` stays pure:** no DOM and no three.js there. The renderers read the state; the UI sends actions.
5. **Every part and rope has an id** in [`content/registry/parts.json`](content/registry/parts.json) and an entry in every `content/lang/<code>/glossary.json`.
6. **Translations stay `draft`** until a sailor who speaks the language has checked them.
7. **No copyrighted material:** no brochure pages or pictures, no text copied from books or courses. Facts and numbers are fine with their source. Photos must be your own.
8. **Few dependencies, pinned versions.**
9. **Keep [`docs/CODE_MAP.md`](docs/CODE_MAP.md) current** when you add, remove or rename a file.
10. A pull request that fixes an issue says `Closes #<number>` in its description.

### Your pull request

- The description template asks for: what changed in plain words, how to check it (links with the settings, e.g. `?wd=90&ws=12`), the tests you ran, and open questions.
- **The first time you contribute, CI waits** until the owner approves the run.
- Pull requests from forks get no preview site (only branches of this repository do). Say clearly how to check your change; the owner may copy it to a branch here to get a preview.
- Every outside pull request gets an independent code review before it is merged. Please be patient: the owner reviews from a phone.

## Licence

The code and texts are licensed under **GPL‑3.0‑only** ([`LICENSE`](LICENSE)); by contributing you agree that your contribution is licensed the same way. The photos in [`docs/reference/photos/`](docs/reference/photos) are the owner's own, licensed under **CC BY‑SA 4.0**.

## Conduct

Be kind, especially to beginners: that is who the app is for. See the [Code of Conduct](CODE_OF_CONDUCT.md). For a security problem, see [`SECURITY.md`](SECURITY.md) (please do not open a public issue).
