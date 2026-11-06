# Launch: faster CI, releases, a welcome and the launch texts (M83–M86)

Extra milestones for issue #165 (public launch), planned with the owner on 2026-11-06. Item 1 of the issue (exercises on a normal phone) was built in M79–M82 ([PHASE10_PHONE_SPEC](PHASE10_PHONE_SPEC.md)). This spec covers what is left that needs code: CI fast enough to work with (#171 and the issue's housekeeping item), publishing by releases (item 4), a welcome for first-time visitors (item 6), and the launch texts with a visitor counter (items 2, 5, 8 and 9). The web address stays `https://botrops1.github.io/sail-learn-and-train/` (item 3, owner). The owner's own steps (devices, beta, announcement) are in section 11.

## 0. How to use this spec (for the coding agent)

- Do **one milestone** per PR, titled `M<N>: <name>`, in order **M83 → M84 → M85 → M86**, each after the one before is merged. M84 needs M83 (the release runs M83's full checks). M85 does not need M84, but is built after it. M86 needs M84 (the counter is only in release builds) and M85 (the README describes the welcome).
- Read sections 0–5 of this file, then your milestone's section. Do not read the other milestone sections.
- Build order inside a milestone: data → pure helpers + tests → workflows or UI → browser checks → docs.
- **Text is data.** Every English string here is final: copy it exactly. Russian strings are AI drafts (CLAUDE.md): write them yourself following PHASE4_SPEC 3.3, and run `npm run review-doc -- ru` after any change to `content/lang/ru/*.json`.
- **Names are required.** File names, function names, signatures, `data-testid`s, workflow and job names, environment variables and storage keys named here are required, so milestones fit together. Add private helpers freely.
- **Numbers marked tunable** may be changed only when a check shows they are wrong: say before and after in the PR.
- **Write back.** If you decide something this spec leaves open, write it into your milestone's section under "Decided in the M<N> PR".
- **Everything earlier keeps working.** Every unit test, PHYSICS_TRUTHS test and browser check stays green; every old link opens as before (`v=1`, see 3.1). **No sailing physics changes** anywhere in this spec.
- **The PRs say `Part of #165`**, not `Closes #165` (it is a checklist issue). M83 also says `Closes #171`. The owner ticks the issue's boxes.

## 1. Goal

Before the public sees the app: a PR's checks finish in about 15 minutes instead of close to an hour, and a PR that only changes documents in about 5 (M83). The live site changes only when the owner publishes a release, the latest work is at `/next/` for testing, and Settings → About shows the version (M84). Someone arriving from an announcement link gets a short welcome with one tap to watch the first exercise (M85). The README, the About text and the privacy note are true at launch; a privacy-friendly counter shows whether anyone came; the beta sailors get a one-page guide; the announcement texts are drafted (M86).

## 2. Scope

### In scope

- CI: the browser test browser cached; documents-only PRs skip the browser checks; PRs run a smaller set (scenes, taps, the general checks, the PR's own milestone, the newest milestones and any groups the PR names); the full set runs every night on `main`, on demand, and before every release; the parts are packed automatically by recorded times; a failed night opens an issue (M83).
- Releases: a **Release** workflow the owner runs with a version number; `main` published to `/next/`; the version in Settings → About; notes and a `.zip` on each release (M84).
- The welcome card on a first visit without a link, and "Show the welcome again" in Settings → About (M85).
- README refresh, `docs/BETA.md`, `docs/ANNOUNCE.md`, GoatCounter in release builds only, the privacy lines in About and README (M86).

### Out of scope

- A custom domain (owner: stay on GitHub Pages for now; 7.9 records what a later domain would mean for links).
- Keeping the `gh-pages` branch from growing (the issue's optional housekeeping): later, if the branch gets slow to clone.
- Fixes found in the beta: each one is a `/bug` PR.
- The other open issues (#161 rest, #145, #155, #172, #136) and Phase 10c: after launch (owner, 2026-11-06). #153 is fixed before the beta with `/bug` (section 8).
- Any change to the app's behaviour outside the welcome card and the About lines.

## 3. Conventions and shared helpers

### 3.1 Conventions

- **Channels.** A build is one of three channels: `release` (the root of the site, made by the Release workflow), `next` (`/next/`, made from every push to `main`), `preview` (a PR preview, and local builds). The channel comes from the environment variable `APP_CHANNEL`; the version from `APP_VERSION` (`v1.2.3`). Anything else, or nothing, is `preview`.
- **Versions** (owner, issue #165 item 4): `v0.9.0` for the quiet beta, `v1.0.0` on announcement day, `v1.x.0` per batch of features, `v1.x.y` for fixes only. Tags are `v` + three numbers; the workflow input is the three numbers without the `v`.
- **Old links keep opening** (standing rule): a link with `v=1` (`URL_STATE_VERSION`) opens the same state in every later release. A change that would break that bumps `URL_STATE_VERSION` and keeps a reader for the old version. Nothing in this spec changes the URL format.
- **Storage keys** start with `sail-learn.` and every read or write is wrapped in `try`/`catch` (as `src/ui/timeBar.ts` does): a browser that blocks storage still works.
- **Workflow inputs from users** (a PR title or description) reach scripts only through environment variables, never written into a `run:` line with `${{ }}`.

### 3.2 Shared helpers (new)

| Name | File | Signature | Behaviour |
|---|---|---|---|
| `liveGroupNames` | `scripts/ci-plan.mjs` | `(shotsSource: string) => string[]` | The keys of `const liveGroups = { … };` in `scripts/shots.mjs`, in order (M83) |
| `isDocsOnly` | `scripts/ci-plan.mjs` | `(files: string[]) => boolean` | True when the list is not empty and every file is documentation (6.3) |
| `prGroups` | `scripts/ci-plan.mjs` | `(input: { title: string; body: string; groups: string[] }) => string[] \| 'all'` | The live groups a PR runs (6.3) |
| `packParts` | `scripts/ci-plan.mjs` | `(groups: string[], times: Record<string, number>, capS: number) => string[][]` | Groups packed into parts (6.3) |
| `ciMatrix` | `scripts/ci-plan.mjs` | `(input: { groups: string[]; times: Record<string, number>; capS: number }) => { include: { part: string; env: string }[] }` | The browser-part matrix (6.3) |
| `parseBuildEnv` | `src/app/buildChannel.ts` | `(channel: string \| undefined, version: string \| undefined) => { channel: BuildChannel; version: string }` | 3.1; throws for `release` without a valid version (M84) |
| `versionLine` | `src/app/buildChannel.ts` | `(info: { channel: BuildChannel; version: string; shortHash: string; date: string }) => { key: 'footer.release' \| 'footer.next' \| 'footer.version'; params: Record<string, string> }` | Which About line to show (M84) |
| `goatCounterTags` | `src/app/buildChannel.ts` | `(channel: BuildChannel, code: string) => string` | The counter's HTML for `index.html`; `''` unless `release` (M86) |
| `shouldWelcome` | `src/ui/welcome.ts` | `(search: string, seen: boolean) => boolean` | `search === '' && !seen` (M85) |

`BuildChannel` is `'release' | 'next' | 'preview'`, exported from `src/app/buildChannel.ts`. That file has no `declare const` and no imports from the rest of `src/`, so `vite.config.ts` can import it.

### 3.3 Sources

- GitHub Actions: reusable workflows (`workflow_call`), `schedule`, matrix from JSON (`fromJSON`), job permissions in called workflows (a called workflow cannot get more permissions than its caller): docs.github.com, "Reusing workflows" and "Events that trigger workflows".
- `JamesIves/github-pages-deploy-action` v4.9.0 README: `target-folder`, `clean`, `clean-exclude` (a newline list).
- `gh release create --generate-notes`: cli.github.com manual.
- Playwright: "Browsers" page (`npx playwright install chromium`, `install-deps`, the browser cache folder `~/.cache/ms-playwright`) and the Docker page (`mcr.microsoft.com/playwright:v<version>-noble`).
- GoatCounter: goatcounter.com/help/js (the script, its settings, the versioned `count.v4.js` with its integrity hash) and goatcounter.com/help/gdpr (no cookies, no personal data).
- CI timings: CI run 42244895893 (PR 174, 2026-11-06), each part's log ("live group …: N s"). Installing the browser took 8, 11, 11 and 19 minutes in four of its 27 parts.

### 3.4 Common mistakes (check these first when something fails)

- A matrix with an empty `include` makes the workflow invalid: skip the job instead (6.4).
- A called workflow asking for a permission the caller did not give fails before it starts: the nightly issue is opened by `nightly.yml`, not by `ci.yml` (6.4).
- `${{ github.event.pull_request.body }}` written into a `run:` line lets a PR description run commands: pass it through `env:`.
- `pull_request` checks out GitHub's merge commit: the changed files are `git diff --name-only <base sha> HEAD` (two dots), with `fetch-depth: 0`.
- The welcome card in every older browser check would cover the page: `openPage` marks it seen unless asked (9.6).
- `vite.config.ts` importing a file that reads `__BUILD_HASH__` crashes the build: only `src/app/buildChannel.ts` is imported there.
- The Release deploy must not delete `pr-preview/` and `next/`; the `/next/` deploy must not touch the root.

## 4. Architecture

### 4.1 Files by milestone

| Milestone | New | Changed |
|---|---|---|
| M83 | `scripts/ci-plan.mjs`, `scripts/ci-plan.d.mts`, `.github/ci-times.json`, `.github/workflows/nightly.yml`, `tests/ciPlan.test.ts` | `.github/workflows/ci.yml`, `CLAUDE.md`, `.claude/skills/milestone/SKILL.md` (only lines about CI parts, if any), `docs/WORKFLOW.md` (owner note), `docs/CODE_MAP.md` |
| M84 | `src/app/buildChannel.ts`, `.github/workflows/release.yml`, `tests/buildChannel.test.ts` | `vite.config.ts`, `src/app/buildInfo.ts`, `src/ui/settingsMenu.ts`, `src/ui/debugOverlay.ts`, `.github/workflows/deploy.yml`, `content/lang/{en,ru}/ui.json`, `CLAUDE.md` (Deploy paragraph), `CONTRIBUTING.md`, `docs/WORKFLOW.md` (how to release), `docs/CODE_MAP.md` |
| M85 | `src/ui/welcome.ts`, `tests/welcome.test.ts`, `scripts/shots-m85.mjs` | `.github/ci-times.json`, `src/app/app.ts`, `src/ui/settingsMenu.ts`, `src/style.css`, `content/lang/{en,ru}/ui.json`, `scripts/shots.mjs` (`openPage`, registration), other scripts that open pages (9.6), `docs/CODE_MAP.md` |
| M86 | `docs/BETA.md`, `docs/ANNOUNCE.md` | `vite.config.ts`, `src/app/buildChannel.ts`, `tests/buildChannel.test.ts`, `content/lang/{en,ru}/ui.json`, `docs/review/ru.md` (by `npm run review-doc -- ru`), `README.md`, `docs/ROADMAP.md` (decisions row), `docs/CODE_MAP.md` |

From M83 on, **a milestone no longer adds a part to `ci.yml`**: its PR title brings its group into the PR's checks (6.3), and the full set packs it by itself. A milestone that adds a live group adds its line to `.github/ci-times.json` (300 if its time is not known yet; the test of 6.6 fails otherwise): M85 adds `"m85": 300`.

## 5. Milestones overview

| Milestone | Section | What the owner sees | Depends on | Independent review |
|---|---|---|---|---|
| M83 | 6 | A PR's checks finish in about 15 minutes, a documents-only PR's in about 5; the full set runs at night and opens an issue when it fails | M82 | **required** (it decides what is no longer checked on every PR; workflow security) |
| M84 | 7 | The live site changes only when the owner runs **Release**; `main` is at `/next/`; About shows `Version v0.9.0` | M83 | **required** (a mistake can take the live site down or delete the previews) |
| — | 8 | Fix #153 (the winch cuts out in Setting the sails) with `/bug`, before the beta | M84 | the `/bug` PR changes the rope model: run `/review` on it |
| M85 | 9 | A welcome card on the first visit without a link: Watch the first exercise, Look around the boat, Close | M84 | not needed (one new card; no state, URL or physics change) |
| M86 | 10 | README and About true at launch; a visitor counter on the live site only; a beta guide and announcement drafts | M85 | **required** (the privacy promise to the public; a third-party script) |

---

## 6. M83: Faster CI

**Independent review: required** (it decides what is no longer checked on every PR, and it reads PR text in a workflow).

### 6.1 Files

As 4.1.

### 6.2 Data: `.github/ci-times.json` (verbatim; seconds per live group, from CI run 42244895893; **tunable**: refresh from a nightly run's summary when a group's time changes by more than half)

```json
{"general":177,"m4b":270,"m4c":108,"m5":368,"m6":53,"m7":47,"m8":78,"m9":453,"m10":180,"m11":75,"m12":44,"m13":48,"m14":44,"m15":104,"m16":75,"m17":60,"m18":49,"m19":38,"m20":38,"m21":27,"m22":15,"m23":69,"m24":159,"m25":74,"m26":47,"m27":82,"m28":50,"m29":228,"m30":85,"m31":94,"m32":97,"m33":54,"m34":183,"m35":51,"m36":56,"m37":443,"m38":68,"m39":88,"m40":10,"m41":21,"m42":21,"m43":23,"m44":27,"m45":17,"m46":21,"m47":18,"m48":97,"m49":249,"m50":389,"m51":21,"m52":267,"m53":50,"m54":166,"m55":57,"m56":117,"m57":56,"m58":97,"m59":59,"m60":371,"m60b":526,"m61":346,"m62":618,"budget":155,"m63":418,"m64":284,"m65":387,"m66":374,"m67":779,"m68":1390,"m69":339,"m70":404,"m71":343,"m72":26,"m73":68,"m74":193,"m75":526,"m76":298,"m77":573,"m78":433,"m79":236,"m80":36,"m81":176,"m82":156}
```

`npm run lint` runs `prettier --check .`, so write the file as `npm run format` leaves it; the values stay as above. A group missing from the file counts as **300 s**.

Caps (constants in `scripts/ci-plan.mjs`, **tunable**): `PR_CAP_S = 600`, `FULL_CAP_S = 1200`, `SCENE_SHARDS = 4`, `RECENT_GROUPS = 4`.

### 6.3 `scripts/ci-plan.mjs` (pure functions plus a small command-line part)

- `liveGroupNames(source)`: find the line `const liveGroups = {`, then take every following line that matches `/^\s{4}([a-z0-9]+): (async )?\(\) =>/` until the line `  };`; return the names in order. Throws if none are found (so a renamed object fails the tests, not the CI silently).
- `isDocsOnly(files)`: false for an empty list; else true when every path matches one of: starts with `docs/`; ends with `.md` (any folder); starts with `.claude/`; starts with `.github/ISSUE_TEMPLATE/`; equals `LICENSE`. Nothing else (`content/`, `scripts/`, `.github/workflows/`, `public/` are not documentation).
- `prGroups({ title, body, groups })`:
  1. If `body` has a line matching `/^CI groups:\s*all\s*$/im`, return `'all'`.
  2. Start with `['general']`.
  3. The title's milestone id from `milestoneOf` (imported from `scripts/pr-body.mjs`): with `id = 'm' + milestoneOf(title).toLowerCase()`, every name in `groups` equal to `id` or to `id` followed by one lowercase letter (`M60:` → `m60`, `m60b`; `M4b:` → `m4b`; `M85:` → `m85`).
  4. The `RECENT_GROUPS` names in `groups` with the highest number (the number after `m`; `general` and `budget` have none and are never "recent"; ties by name).
  5. A body line `/^CI groups:\s*(.+)$/im`: split on commas and spaces; keep the names found in `groups` (others are ignored, never run).
  6. Return the union in the order of `groups`.
- `packParts(groups, times, capS)`: sort by time (missing = 300) descending, ties by name; first-fit: put each group into the first part whose total plus the group stays ≤ `capS`, else open a new part; a group over `capS` gets its own part. Inside a part, keep the order of `groups`. Return parts in the order they were opened. Deterministic.
- `ciMatrix({ groups, times, capS })`: `include` = `SCENE_SHARDS` scene parts `{ part: 'scenes k/4', env: 'SHOTS_NO_LIVE=1 SHOTS_NO_TAPS=1 SHOTS_SHARD=k/4' }`, then `{ part: 'taps', env: 'SHOTS_NO_SCENES=1 SHOTS_NO_LIVE=1' }`, then one live part per packed part: `{ part: 'live <i>: <names joined by ", ">', env: 'SHOTS_NO_SCENES=1 SHOTS_NO_TAPS=1 SHOTS_ONLY=<names joined by ",">' }` (`i` from 1). With `groups` empty, only the scene and tap parts.
- **Command line** (`node scripts/ci-plan.mjs`, run only by `ci.yml`; the part runs only when the file is executed directly, `import.meta.url === pathToFileURL(process.argv[1]).href`, so the tests can import it; without `GITHUB_OUTPUT` / `GITHUB_STEP_SUMMARY` it prints to the console instead): reads `CI_SCOPE` (`full` or `pr`), `PR_TITLE`, `PR_BODY`, `CHANGED_FILES` (a path to a file with one path per line; may be missing for `full`), reads `scripts/shots.mjs` and `.github/ci-times.json`. A missing `CHANGED_FILES` file counts as "not documents only". Scope `pr`: if `isDocsOnly` → `docs=true` and `matrix={"include":[]}`; else the groups of `prGroups` (`'all'` = every group, packed with `FULL_CAP_S`; else packed with `PR_CAP_S`). Scope `full`: every group, `FULL_CAP_S`. Appends `docs=<true|false>` and `matrix=<one-line JSON>` to `$GITHUB_OUTPUT`, and to `$GITHUB_STEP_SUMMARY` a short Markdown list: the scope, why (docs only / title / recent / named / "CI groups: all" / full), and each part with its groups and their **recorded** seconds (from `ci-times.json`; the measured times are in each part's log, "live group m9: 120 s", and those are what a refresh of `ci-times.json` uses).
- `scripts/ci-plan.d.mts`: types for the exports (as `scripts/pr-body.d.mts` does).

### 6.4 Workflows

**`.github/workflows/ci.yml`**

- Triggers: `pull_request` (as today, default types: a `CI groups:` line or title change takes effect at the **next push**; `edited` is not added, because it would cancel and restart the run on every description edit), `workflow_dispatch` with input `scope` (choice `full` / `pr`, default `full`), `workflow_call` with input `scope` (string, default `full`). No `schedule` here.
- `concurrency`: group `ci-${{ github.ref }}-${{ github.event_name }}`, `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`.
- Job **`plan`** (new): checkout with `fetch-depth: 0` on pull requests (default otherwise); on `pull_request`, `git diff --name-only ${{ github.event.pull_request.base.sha }} HEAD > "$RUNNER_TEMP/changed.txt"`; then `node scripts/ci-plan.mjs` with `env:` `CI_SCOPE` (`pr` on `pull_request`, else the `scope` input), `PR_TITLE: ${{ github.event.pull_request.title }}`, `PR_BODY: ${{ github.event.pull_request.body }}`, `CHANGED_FILES: ${{ runner.temp }}/changed.txt`. Outputs `docs` and `matrix`. Node 22, no `npm ci` (the script uses only Node's own modules).
- Job **`check`**: unchanged (it runs for documents-only PRs too).
- Job **`browser-part`**: `needs: plan`, `if: needs.plan.outputs.docs != 'true'`, `strategy.matrix: ${{ fromJSON(needs.plan.outputs.matrix) }}`, `fail-fast: false`, `timeout-minutes: 35`. Steps as today, except the browser install:
  - **A (try first):** a step reading the Playwright version (`node -p "require('playwright/package.json').version"`, after `npm ci`) into an output; `actions/cache@v4` on `~/.cache/ms-playwright` with key `playwright-${{ runner.os }}-<version>`; then `npx playwright install chromium` (no `--with-deps`; it does nothing when the cache restored the browser).
  - **B (if A fails on the PR's first CI run: Chromium does not launch, "error while loading shared libraries" or "Host system is missing dependencies"):** drop A; run the job in `container: mcr.microsoft.com/playwright:v1.56.1-noble` (the version of `playwright` in `package.json`; add a test in `tests/ciPlan.test.ts` that reads both and fails when they differ), which has the browser and its libraries; keep `actions/setup-node` and `npm ci`; the fonts step without `sudo` (`apt-get update && apt-get install -y --no-install-recommends fonts-inter`, then the same fontconfig copy to `~/.config/fontconfig/`). Write which one you used under "Decided in the M83 PR".
  - The fonts step and the run step stay as today (`env SHOTS_SIZES=phone ${{ matrix.env }} npm run shots`); the upload on failure stays.
- Job **`browser-checks`** (the required check; keeps its name): `needs: [plan, browser-part]`, `if: always()`, passes when `needs.plan.result == 'success'` and `needs.browser-part.result` is `success` or `skipped`.

**`.github/workflows/nightly.yml`** (new)

- `on: schedule: - cron: '17 2 * * *'` (02:17 UTC) and `workflow_dispatch`.
- `permissions: contents: read, issues: write`.
- Job `full`: `uses: ./.github/workflows/ci.yml` with `scope: full`.
- Job `report`: `needs: full`, `if: failure()` (any failed job of the full run, `check` included), `runs-on: ubuntu-latest`, no checkout. With `gh` (env `GH_TOKEN: ${{ github.token }}`, `GH_REPO: ${{ github.repository }}`): first `gh label create nightly --color B60205 --force`; then if `gh issue list --label nightly --state open` finds an issue, comment on it; else open an issue with the title `Nightly checks failed` and that label. The body (and the comment): `The full checks failed on main (commit <first 7 characters of GITHUB_SHA>). Run: <run URL>. To fix it, open a new Code session and type /bug, then the link of this issue (copy it from the address bar), then: nightly checks failed` (the run URL is `${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}`).

### 6.5 Docs

- `CLAUDE.md`: every sentence that says the full set runs on every PR or that a part is moved by hand in `ci.yml` (`grep -n "every PR\|full set\|ci.yml\|10 minutes" CLAUDE.md`: the Verification bullets, "Running the browser checks in a session" and the Deploy paragraph) is rewritten: replace the sentences saying the full set runs on every PR with: the PR runs the scenes, the taps, `general`, its own milestone's group (from the PR title), the four newest milestones' groups and any groups named in a `CI groups: m68, m75` line in the PR description (`CI groups: all` runs everything: use it when you changed the store, the URL state, the layout shell or the scene setup); the full set runs every night on `main` and before every release; a milestone no longer adds a part to `ci.yml`. Keep "run locally the groups most likely to be hit" and add "and name them in `CI groups:`". In the PR template's `## Tests` (in `CLAUDE.md` and in `.github/pull_request_template.md`), add the optional line `CI groups: <groups>` and the note "read at the next push". `scripts/pr-body.mjs` does not change.
- `.claude/skills/milestone/SKILL.md`: the line saying CI runs the full set in parallel parts (`grep -n "full set"`) says the PR set and `CI groups:` instead. `.claude/skills/bug/SKILL.md` has no such line: unchanged.
- `docs/WORKFLOW.md`, in the owner's part near the top (the section about CI or checks; `grep -n "browser-checks"`): two lines: "An issue called *Nightly checks failed* means the full checks found a problem on `main` overnight. Open a new Code session and type the line the issue gives (`/bug …`)."
- `docs/CODE_MAP.md`: the new files.

### 6.6 Tests (`tests/ciPlan.test.ts`)

- `liveGroupNames` on the real `scripts/shots.mjs`: includes `general`, `m4b`, `m60b`, `budget`, `m82`; no duplicates; the same count as `Object.keys` of the object would give (83 at M82; read the number at build time and write it in the test).
- Every name of `liveGroupNames` is a key of `.github/ci-times.json`, and every key of the file is a name (the file and the groups stay in step; a new milestone adds its line, 300 s if unknown).
- `isDocsOnly`: `['docs/A.md', 'README.md']` true; `['docs/A.md', 'src/x.ts']` false; `['content/lang/en/ui.json']` false; `['.claude/skills/plan/SKILL.md']` true; `['docs/mockups/x.html']` true; `[]` false; `['.github/workflows/ci.yml']` false.
- `prGroups` with the real names: title `M60: x`, empty body → contains `general`, `m60`, `m60b` and the four newest; title `Fix the winch` → `general` and the four newest only; body `CI groups: m68, m75` adds both; body with `CI groups: all` → `'all'`; body `CI groups: m999; rm -rf /` adds nothing.
- `packParts` with the real times and `FULL_CAP_S`: every group exactly once; every part ≤ 1200 s except a part holding one group; `m68` alone; the same result twice.
- `ciMatrix` full: at most **20** entries (GitHub's parallel jobs for this account) — 4 scenes, 1 taps, at most 15 live parts; every `env` matches `/^[A-Z_=0-9a-z,\/ ]+$/`.
- `ciMatrix` for the PR set of `M83: Faster CI` with today's names and `PR_CAP_S`: every live part sums to at most 600 s.

### 6.7 Browser checks

No new group (`scripts/shots-m83.mjs` is not made). The PR's own CI is the check. A workflow (and a new input) can be started by hand only once it is on `main`, so before the merge: (1) the PR's run shows the PR set; (2) then put `CI groups: all` in the description and push a commit: the run shows the full set packed (at most 20 jobs); (3) remove the line and push again. In the PR's `## Tests`, list both runs' parts and times, the time from push to `browser-checks` green, and whether A or B was used for the browser. After the merge, the session (while it watches) or the owner runs **Nightly** once with **Run workflow**: it must be green; write the time in a PR comment.

### 6.8 Done when

- A PR that changes code gets `browser-checks` green in at most **20 minutes** after the push when the runners are free (measured on this PR; target 15).
- Documents-only PRs: covered by the `isDocsOnly` tests; the next documents-only PR after the merge shows `browser-checks` green without browser parts (the owner sees it on that PR).
- The failure report of `nightly.yml` is checked by reading (the `/review`), not by a forced failure.
- `npm run typecheck`, `lint`, `test`, `build` pass.

### 6.9 Not in M83

Rewriting slow groups (m68 alone takes 23 minutes; a later PR may split its checks); changing what any check tests.

### 6.10 Decided in the M83 PR (recommended; merging accepts it)

- **Browser: option A** (the Playwright browser cached with `actions/cache@v4`, no `--with-deps`, no container). Chromium launched on the runner in the PR's first run without missing libraries; B was not needed. The fonts step now runs `sudo apt-get update` first, because `playwright install --with-deps` no longer does it. The test in `tests/ciPlan.test.ts` that compares the Playwright versions checks any `playwright:v<version>-` container in `ci.yml` (none today), so a later switch to B stays in step with `package.json`.
- **`.github/ci-times.json` refreshed from the PR's full run** (6.2 allows it when a time changes by more than half; **tunable**). Run 2 of this PR printed every group's time (`live group m9: 120 s`): the 83 groups summed to 17,300 s against 15,517 s recorded, and 28 groups moved by more than half (e.g. `m67` 779 → 1462, `m68` 1390 → 707, `m37` 443 → 795, `m29` 228 → 434, `m66` 374 → 697, `m62` 618 → 377). Before the refresh the part holding `m63` and `m67` took 34.6 minutes (the job limit is 35). After it, the full set packs into 15 live parts (20 jobs with the scenes and the taps) of at most 1200 s measured each, `m67` alone in an over-cap part; the PR set for this title is `general, m79, m80, m81, m82` in two parts of 599 s and 544 s.
- **Expressions:** `fetch-depth: ${{ … && '0' || '1' }}` uses strings, because `0` is false in a workflow expression and `&& 0 || 1` gave 1 (the first push of this PR failed in `plan` for that reason).
- **Question 1 (recommended; merging accepts it):** the nightly run starts at 02:17 UTC, as written in 6.4.
- **Measured times:** see the PR's Tests section (the PR set, the full set, push to green).

---

## 7. M84: Releases

**Independent review: required** (a mistake can take the live site down or delete the PR previews).

### 7.1 Files

As 4.1.

### 7.2 `src/app/buildChannel.ts`

- `export type BuildChannel = 'release' | 'next' | 'preview';`
- `parseBuildEnv(channel, version)`: `channel` `'release'` → `version` must match `/^v\d+\.\d+\.\d+$/`, else throw `Error('APP_CHANNEL=release needs APP_VERSION like v1.2.3')`; returns `{ channel: 'release', version }`. `'next'` → `{ channel: 'next', version: '' }`. Anything else → `{ channel: 'preview', version: '' }`.
- `versionLine(info)`: `release` → `{ key: 'footer.release', params: { version, hash: shortHash, date } }`; `next` → `{ key: 'footer.next', params: { hash, date } }`; `preview` → `{ key: 'footer.version', params: { hash, date } }`.

### 7.3 Build (`vite.config.ts`, `src/app/buildInfo.ts`)

- `vite.config.ts`: `const build = parseBuildEnv(process.env.APP_CHANNEL, process.env.APP_VERSION);` and in `define`: `__BUILD_CHANNEL__: JSON.stringify(build.channel)`, `__BUILD_VERSION__: JSON.stringify(build.version)`.
- `buildInfo.ts`: `BuildInfo` gets `channel: BuildChannel` and `version: string`; `makeBuildInfo(hash, date, channel = 'preview', version = '')`; `BUILD_INFO` passes the two new constants (declared like the others). `vite.config.ts` is also the Vitest config, so the tests get the two constants from the same `define`.
- `src/ui/settingsMenu.ts`: the `build-version` span shows `t(line.key, line.params)` with `line = versionLine(BUILD_INFO)`.
- `src/ui/debugOverlay.ts`: the build row shows `${BUILD_INFO.version} ` before the hash when the version is not empty.

### 7.4 Strings (`content/lang/en/ui.json`, after `footer.version`; Russian drafts in `ru`)

- `"footer.release": "Version {version} · {hash} · {date}"`
- `"footer.next": "Test version (next) · {hash} · {date}"`

Russian drafts: `"footer.release": "Версия {version} · {hash} · {date}"`, `"footer.next": "Тестовая версия (next) · {hash} · {date}"`; then `npm run review-doc -- ru`.

### 7.5 Workflows

**`deploy.yml`** (push to `main`, and `workflow_dispatch`; the job has `if: github.ref == 'refs/heads/main'`, so a manual run on another branch never overwrites `/next/`): the same checks as today (typecheck, lint, test, without `APP_CHANNEL`), then the build step **replaced** by `env APP_CHANNEL=next npm run build -- --base=/sail-learn-and-train/next/`, and the `touch dist/.nojekyll` step **removed** (the root's file covers `/next/`); deploy with `JamesIves/github-pages-deploy-action` (same pinned SHA) `branch: gh-pages`, `folder: dist`, `target-folder: next`, `clean: true`, `force: false`. Rename the workflow `Deploy next` (`grep -rn "Deploy to GitHub Pages" .` first and update any reference). The root of the site is no longer touched by a merge. `pr-preview.yml` stays as it is (it also pushes to `gh-pages`, under its own concurrency group, as today; the deploy action retries a rejected push).

**`release.yml`** (new), name `Release`:

- `on: workflow_dispatch` with input `version` (string, required, description `Version without the v, e.g. 0.9.0`).
- `permissions: contents: write`. `concurrency: group: pages, cancel-in-progress: false` (the same group as `deploy.yml`).
- Job `validate`: `actions/checkout@v5` (default depth), then one `run:` step with `env: VERSION: ${{ inputs.version }}` that fails unless `github.ref == 'refs/heads/main'` (pass `${{ github.ref }}` through `env:` too), `$VERSION` matches `^[0-9]+\.[0-9]+\.[0-9]+$`, and `git ls-remote --tags origin "refs/tags/v$VERSION"` prints nothing (the tag does not exist).
- Job `checks`: `needs: validate`, `uses: ./.github/workflows/ci.yml` with `with: scope: full` (the `workflow_call` input M83 added, 6.4), `permissions: contents: read`. Inside the call, `github.event_name` is the caller's (`workflow_dispatch`), so M83's concurrency group is `ci-refs/heads/main-workflow_dispatch` with no cancelling: a manual full CI run on `main` at the same moment queues, it does not cancel the release's checks. No `APP_CHANNEL` anywhere in `ci.yml` (with `release` and no version, `vite.config.ts`, which is also Vitest's config, throws).
- Job `publish`: `needs: checks`. Checkout; Node 22; `npm ci`; `env APP_CHANNEL=release APP_VERSION=v$VERSION npm run build`; `touch dist/.nojekyll`; deploy the root with the same action: `branch: gh-pages`, `folder: dist`, `clean: true`, `clean-exclude` the two lines `pr-preview/` and `next/`, `force: false`; then `(cd dist && zip -qr "../sail-learn-and-train-v$VERSION.zip" .)`; then `gh release create "v$VERSION" "sail-learn-and-train-v$VERSION.zip" --target "$GITHUB_SHA" --title "v$VERSION" --generate-notes --notes "Live at https://botrops1.github.io/sail-learn-and-train/ . The .zip holds the built site; it expects to be served at /sail-learn-and-train/."` (env `GH_TOKEN: ${{ github.token }}`, `VERSION: ${{ inputs.version }}`). Not a draft, not a prerelease (also not `v0.9.0`). `--notes` is added above the generated list of merged PRs.
- Deploy before creating the release: if the release step fails, run the workflow again with the same version (the tag does not exist yet). Write this in the workflow's top comment.

The first run after merge: `main` goes to `/next/`; the root keeps the last site deployed from `main` until the owner runs **Release** (no gap, no downtime).

### 7.6 Docs

- `CLAUDE.md`, the "Deploy:" paragraph: `deploy.yml` publishes `main` to `/next/`; `release.yml` (the owner runs it) runs the full checks and publishes the root, with a tag, notes and a `.zip`; previews as today; Settings → About shows the version (release), "Test version (next)" (`/next/`) or the commit (previews).
- `CONTRIBUTING.md`: a short "Releases" paragraph (the version rule of 3.1; the live site is the latest release; `/next/` is the latest `main`).
- `docs/WORKFLOW.md`, owner part: **How to publish a release** — on github.com in the phone's browser (the GitHub app may not show the button): Actions → Release → Run workflow → branch `main`, version (e.g. `0.9.0`) → Run. About 30 minutes (the full checks run first; M83's PR records the full set's time: write that time + 5 minutes here). When it is green: the live site shows the new version in Settings → About, and Releases lists it with its notes.
- `docs/CODE_MAP.md`: `buildChannel.ts`, `release.yml`, the changed `deploy.yml`.

### 7.7 Tests (`tests/buildChannel.test.ts`)

- `parseBuildEnv('release', 'v0.9.0')` → release / `v0.9.0`; `('release', '0.9.0')`, `('release', undefined)` and `('release', 'v1.2')` throw; `('next', 'v1.0.0')` → next / `''`; `(undefined, undefined)` and `('prod', 'v1.0.0')` → preview / `''`.
- `versionLine` for each channel gives the key and params of 7.2; with `t()` (set up English as `tests/i18n.test.ts` does), `footer.release` reads `Version v0.9.0 · abc1234 · 2026-11-10`.
- `makeBuildInfo('abcdef123', '2026-11-10')` keeps today's fields and has `channel: 'preview'`, `version: ''` (the i18n tests of `footer.version` stay).

### 7.8 Browser checks

No new group. The existing checks read `build-version` (`scripts/shots.mjs`, `shots-m23.mjs`, `shots-m25.mjs`, `shots-m38.mjs`); they keep passing because a check build is `preview`. Run `SHOTS_ONLY=general,m23,m25,m38` locally and put `CI groups: m23, m25, m38` in the PR description. The debug overlay shows nothing extra on `/next/` (only a release has a version).

### 7.9 Done when / decided in the M84 PR

- Checks pass. In the PR: the preview's About still shows `Version <hash> · <date>`. After the merge the owner opens `https://botrops1.github.io/sail-learn-and-train/next/` (About: "Test version (next)") and the root (unchanged).
- **A domain later** (owner: GitHub hosting "for the beginning"): look up on docs.github.com whether, with a custom domain set on this project site, `botrops1.github.io/sail-learn-and-train/…` addresses redirect to the domain with the path and query kept. Write the answer, with the page's address, here and in the ROADMAP row of this PR; if the page cannot be opened from the session, write "not checked: docs.github.com could not be reached" and put it in the PR's questions. No code.

#### Decided in the M84 PR (recommended; merging accepts it)

(The builder writes here.)

### 7.10 Not in M84

Shrinking `gh-pages` history; a release from a branch other than `main`; a changelog file in the repo.

---

## 8. Fix #153 before the beta (a `/bug` PR, not a milestone)

The beta sailors will try *Setting the sails* in Realistic ropes, where the winch cuts out at once when the Genoa sheet (the front sail's rope) is hauled with the jib rolled up (issue #153, `src/model/realistic.ts`, `motorCutOut`). After M84 is merged, in a new Code session (Sonnet, high effort), the owner types:

`/bug https://github.com/Botrops1/sail-learn-and-train/issues/153 In Setting the sails (Realistic ropes), the winch cuts out as soon as I haul the Genoa sheet with the jib rolled up; it should pull it in.`

The `/bug` PR changes the rope model, so the owner runs `/review <PR>` on it before merging. The `/bug` session follows its own skill; this section only fixes the order.

---

## 9. M85: Welcome

**Independent review: not needed** (one new card; no state, URL or physics change; the gap check covers it).

### 9.1 Files

As 4.1.

### 9.2 When it shows

- `shouldWelcome(search, seen)` = `search === '' && !seen`.
- `seen`: `localStorage.getItem('sail-learn.welcome') === '1'` (false if storage throws).
- `app.ts`: read `const firstSearch = window.location.search;` as the **first line** of `startApp` (before `startUrlSync` writes the address bar). After the panel, sheet and scene exist, `createWelcome(...)`; if `shouldWelcome(firstSearch, seen)`, open it.
- Any way of closing it (a button, the backdrop, Escape) writes `'1'`. A link with anything after `?` (a shared link, an exercise link, an announcement link with settings) never shows it.

### 9.3 `src/ui/welcome.ts`

`createWelcome(store: Store, layout: LayoutShell, sheet: Sheet, canWatch: boolean, showLearn: () => void): { open(): void }`. The backdrop is appended to `document.body` (it covers the whole window); while it is open, `layout.root` gets the `inert` attribute (nothing behind it can be tabbed to), removed on close, and the focus returns to the element focused before. `canWatch` is `scene !== undefined`; `showLearn` is `() => panel.showSection('learn')`. Time keeps running behind it (Held still is the default, so nothing moves away). The storage key is `const WELCOME_KEY = 'sail-learn.welcome'` in `welcome.ts`, read and written through `globalThis.localStorage?.` in `try`/`catch`, as `timeBar.ts` does.

- CSS (`src/style.css`, a new block): `.welcome-backdrop` (`data-testid="welcome-backdrop"`): `position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: rgb(0 0 0 / 0.35)`. `.welcome-card` (`role="dialog"`, `aria-modal="true"`, `aria-labelledby` its title, `data-testid="welcome"`): `width: min(360px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); overflow: auto; display: flex; flex-direction: column; gap: 12px; padding: 16px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 8px 28px rgb(0 0 0 / 0.22)` (the values of `.chip-card`, copied: that class itself is positioned for the chip row). `.welcome-title`: `margin: 0; font-size: 1.15rem; font-weight: 600`. `.welcome-body`, `.welcome-later`: `margin: 0`; the later note `font-size: 0.85rem; color` as the app's secondary text. Buttons: the classes `exercise-start` (min-height `var(--touch)`, 44 px), `width: 100%`, stacked. Not a new style: no gradients, no images, no icons.
- Contents, in order: title `welcome.title`; paragraph `welcome.body`; button `welcome.watch` (`data-testid="welcome-watch"`, only if `canWatch`); button `welcome.look` (`welcome-look`); button `welcome.close` (`welcome-close`, the secondary look: class `exercise-button`, as the exercise list's back button in `src/ui/exercisePanel.ts`, instead of `exercise-start`); small note `welcome.later`.
- On open (also from Settings), focus `welcome-watch` (or `welcome-look` without it). Escape (a `keydown` listener on `document` in the capture phase, added on open and removed on close, calling `stopImmediatePropagation`, so an open Settings card behind it stays open) and a tap on the backdrop (not on the card) = Close.
- **Watch the first exercise:** close; `loadExercise(store, 'points-of-sail', 'easy')` (from `src/ui/exercisePanel.ts`); `store.dispatch({ type: 'exercise', command: { demo: 'watch' } })`; `store.dispatch({ type: 'exercise', command: 'start' })`; if `layout.viewport().mode === 'stacked'`, `sheet.setHeight('peek')` — the same as the Watch it button of the setup card (`exercisePanel.ts`, M81).
- **Look around the boat:** close; `store.dispatch({ type: 'setAppMode', mode: 'learn' })`; `showLearn()` (on a phone the Learn tab opens; elsewhere the Learn section comes into view).
- Watch from Settings → About (9.4) replaces what the visitor had (a `load`, as the exercise list's Start does); that is intended.
- **Close:** close.
- `open()` shows it again (used by Settings), whatever the address.

### 9.4 Settings → About

`createSettingsContent(store, showWelcome: () => void)` (`grep -rn "createSettingsContent(" src tests` and update every caller): a `<button type="button">` `welcome.again` (`data-testid="welcome-again"`, class `about-button`) right after the report link. CSS `.footer .about-button`: no border or background, `padding: 0`, `font: inherit`, the colour and underline of `.footer a`, `min-height: var(--touch)`, `flex-basis: 100%`, `text-align: start`. `app.ts` passes `() => { if (layout.viewport().mode === 'stacked') sheet.setHeight('peek'); welcome?.open(); }` with `let welcome` assigned further down (as `reframe` is).

### 9.5 Strings (`content/lang/en/ui.json`, a new block; Russian drafts in `ru`)

- `"welcome.title": "Welcome aboard"`
- `"welcome.body": "This app shows a complete beginner what every rope, sheet and sail of a cruising yacht does. You work the controls; the 3D boat shows what happens. No sailing knowledge needed."`
- `"welcome.watch": "Watch the first exercise"`
- `"welcome.look": "Look around the boat"`
- `"welcome.close": "Close"`
- `"welcome.later": "Settings → About shows this again."`
- `"welcome.again": "Show the welcome again"`

### 9.6 Older browser checks

`openPage(viewport, label, query, { testClock = false, welcome = false } = {})` in `scripts/shots.mjs`: unless `welcome` is true, `await context.addInitScript(() => { try { localStorage.setItem('sail-learn.welcome', '1'); } catch {} });` on the **context**, before `newPage`. Do the same on every other context the scripts make (`grep -n "newContext(\|newPage(" scripts/*.mjs`: today `shots-m5.mjs` (two), `visual-shots.mjs`, and the compare browser's page in `shots.mjs`). Most older checks add settings to the query anyway (`openPage` adds `held=1`, `sea=flat`, … unless the label matches the newer milestones' pattern), but a check without them would see the card.

### 9.7 Tests (`tests/welcome.test.ts`)

- `shouldWelcome('', false)` true; `('', true)` false; `('?v=1&m=easy', false)` false; `('?', false)` false (a bare `?` reads as `''` from `location.search`; the test documents that `'?'` itself is not `''`).
- The seven `welcome.*` keys exist in `en` and `ru` (the existing key-parity test may already cover it; then nothing to add).

### 9.8 Browser checks (`scripts/shots-m85.mjs`, group `m85`, registered in `shots.mjs`)

Every label starts with `m85-` (so `openPage`'s label rule keeps the query empty, `shots.mjs` around line 471: extend its `8\d` pattern if `m85` does not match). Export `liveM85Checks(onTestClock)`; no scenes (`M85_SCENES` is not made); register as `m85: () => liveM85Checks(onTestClock)`.

1. **Phone 390 × 844, no query, `welcome: true`:** `welcome` visible; the three buttons each ≥ 44 px tall and inside the viewport; no page scroll; screenshot `m85-welcome-phone.png`. Tap `welcome-close`: gone; `localStorage['sail-learn.welcome'] === '1'`. Then a **new page in the same context** opened at the bare address (no query): no `welcome` (the stored flag works; a reload would not prove it, the address already has settings).
2. **A link:** `?v=1&m=easy`, `welcome: true`: no `welcome`.
3. **Watch** (test clock, `welcome: true`, no query): tap `welcome-watch`; after `page.waitForTimeout(1000)` the address has `ex=points-of-sail`, and `exerciseLine(page)` (`scripts/ui.mjs`; the sheet is at `peek`) starts with `Watching ·`.
4. **Look around:** tap `welcome-look`: the address has `m=learn`; no `welcome`.
5. **Again:** `?v=1&m=easy` (welcome not shown); `openSettings(page)` (`scripts/ui.mjs`), tap `welcome-again`: `welcome` visible; Escape closes it.
6. **Wide 1440 × 900, no query, `welcome: true`:** `welcome` centred in the window (its centre within 20 px of the window's centre); screenshot `m85-welcome-wide.png`.
7. **Without WebGL** is not checked in the browser (the headless browser has WebGL); `canWatch` false hides Watch by code, covered by reading 9.3.

Run `SHOTS_ONLY=general,m5,m85` locally; put `CI groups: m5, m23, m38` in the PR description before the last push (they read Settings → About or open their own pages). Add `"m85": 300` to `.github/ci-times.json` (4.1).

#### Decided in the M85 PR (recommended; merging accepts it)

(The builder writes here.)

### 9.9 Done when / not in M85

Checks and tests pass; the owner's phone check (WORKFLOW). Not in M85: a tour with several steps; a different welcome per language beyond the strings; showing it again after a new release.

---

## 10. M86: Launch texts and the visitor counter

**Independent review: required** (the privacy promise to the public; a third-party script on the live site).

### 10.1 Before the session (owner)

Create a free GoatCounter account at goatcounter.com with the site code **`sail-learn-and-train`** (the counter's address becomes `https://sail-learn-and-train.goatcounter.com`); leave its settings as they are. The builder always writes `sail-learn-and-train`. If that code was taken and the owner chose another, the owner comments the code on the M86 PR and the session watching it changes the one constant (10.2).

### 10.2 The counter (release builds only)

- `src/app/buildChannel.ts`: `goatCounterTags(channel, code)`: throws unless `code` matches `/^[a-z0-9-]+$/`; `''` unless `channel === 'release'`; else two tags joined by `'\n    '` (the indentation of `index.html`'s head): an inline script `window.goatcounter = { path: function () { return location.pathname; } };` (count the page, never the settings in the query; check the setting's name on goatcounter.com/help/js, and if it differs, use the documented one and write it under "Decided"), and the counter script `<script data-goatcounter="https://<code>.goatcounter.com/count" async src="https://gc.zgo.at/count.v4.js" crossorigin="anonymous" integrity="<hash from goatcounter.com/help/js>"></script>`. If the session cannot open that page, leave out `integrity` (and keep `count.v4.js`) and say so in the PR's Known limitations; the same if the `path` setting cannot be confirmed (keep the line as written). The tests of 10.7 do not depend on `integrity`.
- `vite.config.ts`: `const GOATCOUNTER_CODE = 'sail-learn-and-train';` (or the owner's code from the PR); `build` (M84's `parseBuildEnv` result) is a module-level constant above `siteUrl`, which reads it; the plugin's `transformIndexHtml` also inserts `goatCounterTags(build.channel, GOATCOUNTER_CODE)` before `</head>`.
- Previews, `/next/`, local builds and the browser checks never load it (they are not `release`).

### 10.3 Privacy texts

- `content/lang/en/ui.json`, `footer.privacy` becomes: `"Privacy: the app sends nothing about you. Visits to the live site are counted anonymously with GoatCounter (no cookies, no personal data). What you set stays on this device. The site is hosted on GitHub Pages."` Russian draft in `ru`.
- `README.md`, `## Privacy`: the same meaning, with links to https://www.goatcounter.com/help/gdpr and GitHub's privacy statement (there today); the list of what stays in the browser adds "whether you have seen the welcome". Add: "Test versions (`/next/` and PR previews) count nothing." The About line is the same in every channel (it speaks of the live site).

### 10.4 README (review it against the live app at `/next/` and `docs/ROADMAP.md`)

- The `> Honest limits today.` box: **remove** the sentence that exercises are very hard on a normal phone; keep "the Russian text is an AI draft". (The frame rate stays where it is, under "Open limits".)
- **Exercises** list: add the step bar over the 3D view, **Watch it** (the app sails it and stops after each step) and **Show me** (one step, then your turn).
- A line at the top under Try it: the welcome card on the first visit.
- **Where the project stands**: done adds "exercises on a normal phone, releases, a welcome"; **Next** is rewritten (remove the phone controls and the launch plan, which are done): wind and clock exercises (10c), the camera controls (#145), the computer controls outside exercises (#161), a sailor's review of the Russian text, more languages; the launch checklist link stays. The count "Fourteen exercises" is right (14 in `content/exercises/exercises.json`).
- **For developers → Documents**: add `PHASE10_PHONE_SPEC.md` (exercises on a phone, M79–M82) and `PHASE_LAUNCH_SPEC.md` (launch, M83–M86), `docs/BETA.md`, `docs/ANNOUNCE.md`; mention `/next/` and releases (one line each).
- Every claim must be true on `/next/`; nothing built may be missing (issue #165 item 2's "done when").

### 10.5 `docs/BETA.md` (English; for the 3–5 sailors of the quiet beta; at most one phone screen of reading per section)

1. What it is (two sentences) and the link to the live site.
2. Five things to try, each a full link to the **live site** (`https://botrops1.github.io/sail-learn-and-train/` + the part below; the beta starts after `v0.9.0` is published) and one line saying what to tap: *Points of sail* (`?v=1&m=exercise&ex=points-of-sail`: tap **Watch it**); *Tacking* (`?v=1&m=exercise&ex=tacking`: tap **Do it myself**); *Setting the sails* (`?v=1&m=exercise&ex=set-sails`: choose **Realistic** ropes on the card, then **Do it myself**); *Leaving the berth* (`?v=1&m=exercise&ex=leave-berth`: **Do it myself**; it starts in the marina); the Learn list (`?v=1&m=learn`: tap any part of the boat, or search for "vang").
3. What we want to hear: anything that is wrong for a real yacht (most important), anything confusing, anything that does not work on your device.
4. How to report: Settings → Share gives a link to exactly what you see; the issue forms (link to `/issues/new/choose`), or a message to the owner with the link.
5. A short form to copy: device and browser, what you tried, what happened, the Share link.

### 10.6 `docs/ANNOUNCE.md` (drafts for the owner; English only until the Russian review)

A first line for the owner: "The link-preview picture appears by itself when you paste the link." Then one section per place, each with: the rules page to read before posting, a title, a text of at most 150 words (Show HN: a title of at most 80 characters and a first comment of at most 120 words), and the site's address `https://botrops1.github.io/sail-learn-and-train/`. Places and rules pages: r/sailing (https://www.reddit.com/r/sailing/about/rules), r/learntosail (https://www.reddit.com/r/learntosail/about/rules), Cruisers Forum (https://www.cruisersforum.com/forums/, its rules page; suggest the forum's training or beginners section), the three.js forum's Showcase (https://discourse.threejs.org/c/showcase), Hacker News Show HN (https://news.ycombinator.com/showhn.html). A last section, **Russian (after the sailor's review)**: "Russian sailing Telegram groups the owner knows; the text is written after the review of `docs/review/ru.md`." Plain words, no superlatives, say it is free, open source (GPL) and made by one person with an AI coding assistant, and ask for corrections from sailors.

### 10.7 Tests

`tests/buildChannel.test.ts`: `goatCounterTags('preview', 'x')` and `('next', 'x')` are `''`; `('release', 'sail-learn-and-train')` contains `https://sail-learn-and-train.goatcounter.com/count`, `count.v4.js` and `location.pathname`.

### 10.8 Browser checks

No new group. `npm run build` (preview) has no `goatcounter` in `dist/index.html` (`grep -c goatcounter dist/index.html` is 0; write the result in the PR). `env APP_CHANNEL=release APP_VERSION=v0.0.1 npm run build` has it (1 or more); rebuild without the variables afterwards.

### 10.9 Done when / not in M86

Tests pass; the owner reads the README, `BETA.md` and `ANNOUNCE.md` on the PR. Not in M86: posting anything; the Russian announcement text.

#### Decided in the M86 PR (recommended; merging accepts it)

(The builder writes here, and adds a ROADMAP decisions row.)

---

## 11. After M86: the owner's launch steps (no code)

1. **Release `v0.9.0`** (WORKFLOW: How to publish a release).
2. **Devices** (#165 item 7), on the live site: a cheap Android phone (Chrome), an iPhone (Safari), a tablet, a laptop (Chrome, Firefox, Safari). On each: the welcome, Watch the first exercise, one exercise done yourself. The frame rate: open `https://botrops1.github.io/sail-learn-and-train/?debug=1` and read the FPS figure while Sailing; below 25 on a phone is a finding (Phase 9's open check). Each problem: `/bug` with the Share link.
3. **Quiet beta** (item 8): send `docs/BETA.md` to 3–5 sailors; each finding becomes a `/bug` PR (or a `/plan issue` if it is big). Ask a Russian-speaking sailor to review `docs/review/ru.md`.
4. **Release `v1.0.0`** when the beta findings are fixed.
5. **Announce** (item 9) with the texts of `docs/ANNOUNCE.md`, in English; Russian after the review.

## 12. Planning decisions (owner, 2026-11-06: "accept all")

1. Web address: stay on `botrops1.github.io/sail-learn-and-train/` for now (owner).
2. Visitor counter: GoatCounter, without cookies, on the live site only.
3. Welcome: Watch the first exercise / Look around the boat / Close; once per device; never on a link with settings.
4. Versions: `v0.9.0` for the quiet beta at the normal address, `v1.0.0` on announcement day.
5. Before launch only #153 is fixed; #161 (rest), #145, #172, #155, #136 and Phase 10c after launch.
6. CI: PRs run a smaller set; the full set runs every night on `main`, on demand, and before every release (a release cannot publish without it).
