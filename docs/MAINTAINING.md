# Looking after contributions (for the owner)

How to handle issues and pull requests from other people, from a phone. Contributors read [`CONTRIBUTING.md`](../CONTRIBUTING.md); this page is the other side of it.

## Once a week (about 30 minutes)

Pick a fixed time. Open the repository's **Issues** and **Pull requests** tabs, newest first.

## An issue arrives

Most contributions will be issues (bug reports, sailing corrections, ideas), not code.

1. **Answer within a week.** Thank them, add a label, and ask for what is missing: a Share link for a bug, a source for a sailing fact.
2. **Labels:**
   - `bug`, `enhancement`, `translation`: what kind it is (most forms add these).
   - `exercise idea`, `boat or area`: added by their forms.
   - `needs source`: a sailing claim without a reference; it waits.
   - `good first issue`: small, clear and safe for a newcomer. Keep 3–5 of these open.
   - `help wanted`: you would welcome someone else building it.
3. **A sailing correction:** start a Claude session and ask "check issue #N against `docs/PHYSICS_TRUTHS.md` and its sources; is the claim right?". You decide; nothing changes without a source.
4. **Build it** the way you build everything: `/bug` for a fix, `/plan issue <N>` for something bigger.
5. **Saying no is fine.** "Thank you, this is outside what the app is for right now" and close it with the reason *not planned*. The app stays small on purpose.

## A pull request arrives

1. **CI waits for you** the first time someone contributes (the yellow *Approve and run* button). Before you press it, open **Files changed** and look at the file names:
   - If anything under `.github/` changed, or the `scripts` lines of `package.json`, **do not approve yet**. Ask a `/review` session first. This is the one real security risk: CI would run their changed instructions.
   - Otherwise approve, and the checks run.
2. **Review:** start a new Code session (Opus) and type `/review <PR number>`. It posts one comment that says in plain words what the change does and what is wrong.
3. **Try it:** a pull request from a fork gets no preview link. If you want to try it on your phone, ask a Claude session: "copy PR #N to a branch here so it gets a preview".
4. **Ask for changes** in a comment (a Claude session can draft it), or **merge** with **Squash and merge** (all their commits become one commit on `main`). The ruleset on `main` already blocks a merge until `check` and `browser-checks` pass.
5. **It goes live with the next release.** Merged work appears on [`/next/`](https://botrops1.github.io/sail-learn-and-train/next/) at once; the live site changes only when you run **Release**.

Outside pull requests do not follow the milestone layout (`M<N>: …`); the PR-description check asks for the template's sections only on milestone PRs, so theirs pass it.

## Things to keep in mind

- **Code you merge is yours to look after.** Merge only what fits the roadmap and what you would be happy to keep.
- **One thing at a time:** ask for a big pull request to be split, the same as your own milestones.
- **Stale pull requests:** if nobody answers for about 30 days, close it kindly ("closing for now; reopen any time").
- **Conduct problems:** hide or delete the comment, and point to the [Code of Conduct](../CODE_OF_CONDUCT.md). Reports reach you through GitHub's *Report to repository admins*.
- **Security reports** arrive privately in the **Security** tab ([`SECURITY.md`](../SECURITY.md)); answer them there, never in a public issue.
