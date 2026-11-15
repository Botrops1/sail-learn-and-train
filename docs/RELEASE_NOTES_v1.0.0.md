# v1.0.0: what changed since v0.9.0

For the release description on GitHub (Releases → v1.0.0 → Edit) and for the announcement. v0.9.0 was the quiet beta (7 November 2026); v1.0.0 is the announcement version. Everything below was merged between those two dates (PRs #181 to #217, milestones M87 to M99).

## For learners

**Sound** (new, off by default, switch it on with the speaker chip or in Settings → Sound)
- The wind, the whistle in the rigging, waves and the hull, all following what the boat is doing (M87).
- Sails flapping and rushing, the engine, and a thump when the boat touches something (M88).
- Winches, ropes running, the windlass and anchor chain, bow and stern thrusters (M89).
- Marina sounds (halyards slapping masts, water lapping) and gulls and small birds (M90).
- Soft generated music that changes slowly over a visit. Each kind of sound has its own volume slider (M91).

**Time and wind**
- The time bar and the clock are one widget (M92).
- Time-lapse ×60 and ×240, to watch a whole afternoon or night go by (M95).
- Local Adriatic winds you can switch on: the summer sea breeze, the bura (a cold, gusty wind coming off the land) and the jugo (a warm wind from the south) (M94).
- A step in an exercise can run faster by itself while you wait, and an exercise can start at a chosen time of day (M96).

**Three new exercises** (17 now, up from 14)
- *The afternoon maestral* (the afternoon sea breeze) (M96).
- *A bura is coming*: the wind is scripted, so it rises as you work (M97).
- *A night at anchor* (M98).

**Easier to follow an exercise**
- One step card over the 3D view holds the step, its hint and the "Step done" button, instead of three separate pieces. On a phone the top row is back to two rows (M93).

**Easier camera**
- Zoom goes toward where you point, the camera cannot flip over the top or twist, it keeps out of the hull, and a double tap centres on the part you tap. A help line explains it (M99).

**Fixes**
- A still tap, or a tap during a camera move, no longer switches the camera to Free (nightly failures #203 and #205).

## For contributors and the owner (nothing changes in the app)

- Only the owner can instruct the coding sessions; pull requests from forks are treated as untrusted code (rules in CLAUDE.md and CONTRIBUTING).
- Faster and steadier checks: CI picks the browser-check groups from the changed files, small groups were merged and repeated checks deleted, slow exercise groups run at a higher time scale, a failed group is retried once and recorded, and there is a time budget for new checks.
- `npm run check` runs typecheck, lint, tests and build with one line per step, and the browser-check output is quiet.
- The PR description check also catches links in backticks and questions without a recommendation.
- The review is now part of `/milestone`; `/status` was added; CODE_MAP, the decisions log and the old checklists were slimmed down or archived.

## Known limitations

- The Russian texts are AI drafts until a sailor reviews them.
- The sound and the physics are simplified on purpose. Sailors' corrections are welcome (Settings → Share links to exactly what you see).
