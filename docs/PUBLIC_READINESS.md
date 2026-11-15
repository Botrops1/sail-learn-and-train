# Ready for outside contributors? (2026-11-14)

A check of the eight workflows, the agent commands and the contributor path, before the repository is announced and other people send pull requests (PRs). Made by reading the workflow files, `scripts/pr-body.mjs`, the PR-planning part of `scripts/ci-plan.mjs`, `CONTRIBUTING.md` and the commands. **The repository's settings on github.com could not be read from the session**: section 3 lists what to check there.

## 1. In short

- The workflows are safe for PRs from forks (copies of the repository in a contributor's account): none gives a fork's code a token that can write, and none runs text from a PR as a command.
- The real risks were on the **agent** side, and are closed by rules in this PR: a stranger's comment could have been taken as an instruction, and `/review` would have installed and run a stranger's code inside the owner's session.
- One thing would have annoyed every contributor: the PR template carried a placeholder that makes the **PR description** check fail. Fixed here.
- Four small hardening steps are left as spec G for a later Sonnet session, and five settings for the owner.

## 2. Findings

| # | Finding | How serious | Status |
|---|---|---|---|
| 1 | **A comment by anyone could steer a session.** `/milestone` said "a comment from the owner: do what it says" and recognised a review by its first words. All sessions post under the owner's account, so the author is the only reliable sign | High once public | Fixed here: CLAUDE.md "Who may instruct you on GitHub", and a line in each command |
| 2 | **`/review` on a fork's PR ran the fork's code** (`npm ci` runs install scripts; a changed `.claude/hooks/` file runs on the session's next tool call) in a session that can push to this repository | High once public | Fixed here: CLAUDE.md "A PR from a fork is untrusted code"; `/review` has a section "A PR from a fork" (safety read of the diff first; nothing is run when build or agent files change; `npm ci --ignore-scripts` otherwise) |
| 3 | **The PR template made the PR description check fail for outsiders**: its hidden comment contained a preview address with the `<N>` placeholder, which the check searches for | Medium (every outside PR red) | Fixed here (template). Spec G1 makes the check ignore hidden comments |
| 4 | **CONTRIBUTING said "CI runs everything on your pull request"**; it runs a part, and the `CI groups:` line is read only at a push | Low | Fixed here |
| 5 | **A fork's PR gets no preview**, so the owner cannot test it on the phone | By design (a preview needs a write token) | Procedure added to `/review`: after a clean review the owner can ask a session for "a preview of PR <number>" |
| 6 | `strip-attribution.yml` runs on `pull_request_target` with write access to issues and PRs. It never checks out or runs PR code and treats the text as data only | Safe as written | Spec G2: limit it to the owner's posts, so it never edits a stranger's text |
| 7 | `ci.yml` puts `${{ matrix.env }}` into a command line. The value comes from `scripts/ci-plan.mjs`, which only lets known group names through, and a fork's run has a read-only token and no secrets | Safe as written | Spec G3 passes it through `env:` anyway |
| 8 | GitHub's own actions (`actions/checkout`, `setup-node`, `cache`, `upload-artifact`, `github-script`) are pinned by version tag; the two third-party actions are pinned by commit | Low | Spec G4: pin all by commit |
| 9 | `pr-preview.yml` builds a PR's code in a job that can write to the repository. It is skipped for forks, so it only matters for people given write access | Low while the owner is the only one with write access | Section 3, setting 5 |
| 10 | `deploy.yml`, `release.yml`, `nightly.yml`, `cleanup-branches.yml`: started only by a push to `main`, a timer or the owner; no PR text reaches them | Safe | Nothing to do |

## 3. Settings for the owner (github.com in the phone's browser, "Desktop site")

Each takes a minute. I could not see how they are set today.

1. **Settings → Actions → General → "Fork pull request workflows from outside collaborators"**: choose **Require approval for all external contributors**. CI then waits for your tap on every outside PR, not only a person's first one.
2. **Settings → Actions → General → "Workflow permissions"**: **Read repository contents and packages permissions**, and leave "Allow GitHub Actions to create and approve pull requests" unticked. The workflows that need more ask for it themselves.
3. **Settings → Branches → the rule for `main`**: besides the two required checks (`check`, `browser-checks`), tick **Require a pull request before merging** and **Do not allow bypassing the above settings**. Leave "Require approvals" at 0: you are the only maintainer and cannot approve your own PR.
4. **Settings → Code security** (or "Advanced Security"): switch on **Private vulnerability reporting** (SECURITY.md sends people there), **Dependabot alerts**, **Secret scanning** and **Push protection**.
5. **Settings → Collaborators**: give nobody write access for now. Outside work comes through forks. A person with write access could start a release and gets a preview built with a write token (finding 9).

## 4. How an outside PR goes (after this PR)

1. A contributor opens a PR from a fork. CI waits for your approval (setting 1). Do not approve yet.
2. New session, Opus, medium: `/review <PR number>`. It reads the diff first and says whether the PR touches build or agent files; only if not does it install and run the checks. It posts one comment for the contributor and you.
3. If the review says "safe": approve the CI run in the GitHub app. If you want to see it on your phone, ask a session for "a preview of PR <number>".
4. The contributor fixes the "should fix" findings. Your sessions do not push to forks.
5. Merge when CI is green and the preview works. `/status` marks outside PRs and reminds you of step 2.

## 5. Spec G for a later Sonnet session: `Hardening for outside pull requests`

One PR, Sonnet, high. `CI groups: general` (only workflow files and one script change). Before opening the PR, run the review of `/milestone` section 4 with Opus.

1. **G1, `scripts/pr-body.mjs`:** remove HTML comments (`<!-- … -->`, also over several lines) from the description before `placeholders` and the section checks look at it. Tests: a description that is the unedited `.github/pull_request_template.md` has no placeholder problem; a visible placeholder still fails.
2. **G2, `.github/workflows/strip-attribution.yml`:** at the top of the script, return unless the author of the text is the repository owner: `comment.author_association`, `review.author_association`, `pull_request.author_association` or `issue.author_association` equals `OWNER`. Keep everything else.
3. **G3, `.github/workflows/ci.yml`, job `browser-part`:** replace `run: env SHOTS_SIZES=phone ${{ matrix.env }} npm run shots` by a step with `env: PART_ENV: ${{ matrix.env }}` and `run: env SHOTS_SIZES=phone $PART_ENV npm run shots` (word splitting is wanted here; add a comment that the value holds only `NAME=value` words from `scripts/ci-plan.mjs`), and add a test in `tests/ciPlan.test.ts` that every `env` string of `ciMatrix` matches `^([A-Z_]+=[A-Za-z0-9_,/.-]+)( [A-Z_]+=[A-Za-z0-9_,/.-]+)*$`.
4. **G4, all workflows:** pin `actions/checkout`, `actions/setup-node`, `actions/cache`, `actions/upload-artifact` and `actions/github-script` to the full commit id of the version in use, with the version as a comment, as the two third-party actions already are. Take each id from the action's own releases page on github.com; if it cannot be reached from the session, leave that action as it is and say so in the PR.
5. **G5, new `.github/dependabot.yml`:** weekly updates for `github-actions` only (so the pinned ids of G4 do not go stale), at most 3 open PRs. Not for `npm`: the project pins its few dependencies by hand.
6. **Done when:** `npm test` passes; a PR from this repository still gets its preview and its PR description check; the unedited template passes the check. Update CODE_MAP and CONTRIBUTING where they name what changed.

## 6. Not checked

- The settings of section 3, the Pages settings and who has access to the repository.
- A licence and copyright pass over `content/` and `docs/reference/` (a fresh session is cheaper for that).
- No fork PR was opened to try the path of section 4; the first real one is the test.
