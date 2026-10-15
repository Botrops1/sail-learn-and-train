# Adding a language

The app shows one language at a time. A language is one folder of two JSON files, `content/lang/<code>/`; the Language setting (View tab) lists every folder it finds, and `?lang=<code>` in the link opens it. No code needs to change for the language itself.

## Steps

1. Copy `content/lang/en/` to `content/lang/<code>/` (`<code>` is the two-letter language code, for example `de`).
2. Translate both files:
   - `ui.json`: every button, hint and label. Keep the keys and their order; change only the texts. Set `"language.name"` to the language's own name (`Русский`, `Deutsch`).
   - `glossary.json`: the Learn entries (names, other names, one-liner, what it does, on this boat, mistakes with fixes, the Show me text), one for each id of `content/registry/parts.json`.
3. Follow the rules of [`PHASE4_SPEC.md`](PHASE4_SPEC.md) section 3.3, adapted to the language: the other names are the language's **own** traditional terms, never another language's; the words printed on the boat stay as printed; numbers keep the dot.
4. Set every `textStatus` to `draft`. It becomes `sailor-reviewed` only after a sailor who speaks the language has checked it (a `/bug` PR does that).
5. If the language does not use Latin letters, the Latin-letter scan applies to it too: `content/lang/latin-words.json` lists the Latin words allowed on its screen (instrument letters, makers, quoted foreign words). Add what a translation really needs there, and nothing else.
6. Run `npm test`. The tests list every missing or extra key and every incomplete entry.
7. For a reviewer, add the language's wording to `scripts/review-doc.mjs` (the `WORDING` table: the title, the introduction, the column and row names) and run `npm run review-doc -- <code>`. It writes `docs/review/<code>.md`: one table per entry, English next to the new language, with an empty row for the reviewer's answer. Commit it; a test fails when a text changes and the document is not regenerated.

Nothing else changes.

## The review document

`docs/review/ru.md` is the Russian review document, for a Russian-speaking sailor. They answer by the entry's code, for example `term_north: ок`. The corrections come back in a `/bug` PR that also sets those entries' `textStatus` to `sailor-reviewed`.
