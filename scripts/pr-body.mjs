// Checks a PR description against the CLAUDE.md template (owner, after PR 169: milestone PRs went
// out with `pr-<N>` links that do not open). Used in two places:
// - `.claude/hooks/pr-body.mjs` blocks a PR description or comment that still carries a placeholder;
// - `.github/workflows/pr-body.yml` runs `node scripts/pr-body.mjs <pr.json>` on every PR and fails
//   when a milestone PR's description is a stub, misses a template section, or misses a link of
//   its `docs/WORKFLOW.md` checklist.
// The text is only ever read as data here, never run.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Placeholders that must be replaced by the real PR number in a PR title or description: a
 * preview link, and the review line of the CLAUDE.md template. Only these exact forms, because a
 * plan PR may mention "/review <PR>" as advice for the milestone PRs to come.
 */
export const PR_PLACEHOLDERS = [
  /pr-preview\/pr-<[^>\s]*>/i,
  /Independent review required[^\n]*\/review\s+<[^>\n]*>/i,
];

/**
 * In comments: a preview link, and the lines the skills give with the real number ("Stopped
 * watching this PR … /milestone resume <PR number>", the review's last line). A review may quote
 * other placeholders in backticks.
 */
export const COMMENT_PLACEHOLDERS = [
  /pr-preview\/pr-<[^>\s]*>/i,
  /Stopped watching this PR[^\n]*\/milestone\s+resume\s+<[^>\n]*>/i,
  /\/milestone\s+resume\s+<[^>\n]*>`?\s+in a new session/i,
];

/** The sections of the CLAUDE.md PR template a milestone PR must have. */
export const REQUIRED_SECTIONS = [
  '## What changed',
  '## How to check on your phone',
  '## Tests',
  '## Questions for the owner',
];

/** The placeholder texts found in `text` (empty when there are none). */
export function placeholders(text, patterns = PR_PLACEHOLDERS) {
  const found = [];
  for (const pattern of patterns) {
    const match = String(text ?? '').match(pattern);
    if (match) found.push(match[0]);
  }
  return found;
}

/** The milestone id of a milestone PR title (`M80: …` → `80`, `M4b: …` → `4b`), else null. */
export function milestoneOf(title) {
  const match = /^M(\d+[a-z]?):/.exec(String(title ?? '').trim());
  return match ? match[1] : null;
}

/** The preview links of milestone `id`'s checklist in WORKFLOW.md, with the real PR number. */
export function workflowLinks(workflow, id, number) {
  const lines = String(workflow).split('\n');
  const start = lines.findIndex((line) => new RegExp(`^#{3,4} M${id}:`).test(line));
  if (start < 0) return [];
  const links = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,4} /.test(line)) break;
    for (const url of line.match(/https:\/\/\S*pr-preview\/pr-<N>\/\S*/g) ?? []) {
      links.push(url.replace('pr-<N>', `pr-${number}`).replace(/[.,;)]+$/, ''));
    }
  }
  return links;
}

/** Problems with a PR's title and description, in plain words (empty when it is fine). */
export function checkPrBody({ title, body, number }, workflow = '') {
  const text = String(body ?? '');
  const problems = placeholders(`${title ?? ''}\n${text}`).map(
    (hit) => `Placeholder "${hit}" left in: put in the real PR number (${number}).`,
  );
  const id = milestoneOf(title);
  if (id === null) return problems;
  if (text.trim().length < 200) {
    problems.push('The description is empty or a stub: write it from the CLAUDE.md template.');
    return problems;
  }
  for (const section of REQUIRED_SECTIONS) {
    if (!text.includes(section)) problems.push(`Section "${section}" is missing.`);
  }
  if (!text.includes(`pr-preview/pr-${number}/`)) {
    problems.push(`No link to this PR's preview (pr-preview/pr-${number}/).`);
  }
  for (const link of workflowLinks(workflow, id, number)) {
    if (!text.includes(link))
      problems.push(`Checklist link from docs/WORKFLOW.md missing: ${link}`);
  }
  return problems;
}

// `node scripts/pr-body.mjs <pr.json>` (the JSON of `GET /repos/{owner}/{repo}/pulls/{n}`).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const pr = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const workflowPath = new URL('../docs/WORKFLOW.md', import.meta.url);
  const problems = checkPrBody(pr, readFileSync(workflowPath, 'utf8'));
  if (problems.length > 0) {
    console.log(`PR ${pr.number} description: ${problems.length} problem(s)`);
    for (const problem of problems) console.log(`- ${problem}`);
    console.log(
      'Fix the description on GitHub (update_pull_request); this check reruns on the edit.',
    );
    process.exit(1);
  }
  console.log(`PR ${pr.number} description: ok`);
}
