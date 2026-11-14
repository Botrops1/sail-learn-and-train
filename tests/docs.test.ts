import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkPrBody, workflowLinks } from '../scripts/pr-body.mjs';

const read = (path: string): string => readFileSync(path, 'utf8');
const CODE_MAP = read('docs/CODE_MAP.md');

/** Files under `dir`, as repo-relative paths with `/`. */
function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
    return statSync(join(path)).isDirectory() ? filesUnder(path) : [path];
  });
}

const REPO_ROOTS = ['src/', 'scripts/', 'tests/', 'content/', '.github/'];
const isPattern = (token: string): boolean => token.includes('<') || token.includes('*');

/**
 * Every path CODE_MAP names in backticks: a full path (starts with a repo root), or a name in the
 * first cell of a table row, read against the `## \`dir/\`` heading above it.
 */
function namedPaths(): string[] {
  const paths: string[] = [];
  let dir = '';
  for (const line of CODE_MAP.split('\n')) {
    const heading = /^## `([^`]+\/)`/.exec(line);
    if (heading) dir = heading[1] ?? '';
    else if (line.startsWith('## ')) dir = '';
    for (const [, token = ''] of line.matchAll(/`([^`\s]+)`/g)) {
      if (REPO_ROOTS.some((root) => token.startsWith(root)) && !isPattern(token)) paths.push(token);
    }
    const firstCell = /^\| ((?:`[^`]+`(?: \([a-z]+\))?(?:, )?)+) \|/.exec(line);
    if (firstCell && dir !== '') {
      for (const [, token = ''] of (firstCell[1] ?? '').matchAll(/`([^`]+)`/g)) {
        if (!isPattern(token) && /\.[a-z]+$/.test(token)) paths.push(`${dir}${token}`);
      }
    }
  }
  return paths;
}

describe('docs/CODE_MAP.md', () => {
  const named = namedPaths();

  it('names every file under src/', () => {
    const named_ = new Set(named);
    const missing = filesUnder('src').filter((file) => !named_.has(file));
    expect(missing).toEqual([]);
  });

  it('names only paths that exist', () => {
    const gone = [...new Set(named)].filter((path) => !existsSync(path));
    expect(gone).toEqual([]);
  });

  it('has no line longer than 600 characters', () => {
    const long = CODE_MAP.split('\n')
      .map((line, index) => ({ line: index + 1, length: line.length }))
      .filter((entry) => entry.length > 600);
    expect(long).toEqual([]);
  });
});

describe('docs/ROADMAP.md', () => {
  it('keeps a decision row dated after 2026-11-14 to 80 words (the decision is in its spec)', () => {
    const rows = read('docs/ROADMAP.md')
      .split('\n')
      .map((line) => /^\| (\d{4}-\d{2}-\d{2}) \| (.*) \|$/.exec(line))
      .filter((match): match is RegExpExecArray => match !== null)
      .filter((match) => (match[1] ?? '') > '2026-11-14');
    const tooLong = rows
      .map((match) => ({ date: match[1], words: (match[2] ?? '').split(/\s+/).length }))
      .filter((row) => row.words > 80);
    expect(tooLong).toEqual([]);
  });

  it('points to the archive of older decisions, which exists', () => {
    expect(read('docs/ROADMAP.md')).toContain('docs/archive/DECISIONS.md');
    expect(existsSync('docs/archive/DECISIONS.md')).toBe(true);
  });
});

describe('docs/WORKFLOW.md and the checklist archive', () => {
  const milestoneHeading = /^#{3,4} M\d+[a-z]?:/m;

  it('keeps no checklist of a merged milestone: those are in docs/archive/CHECKLISTS.md', () => {
    expect(read('docs/WORKFLOW.md')).not.toMatch(milestoneHeading);
    expect(read('docs/archive/CHECKLISTS.md')).toMatch(/^#{3,4} M99:/m);
  });

  it("is where scripts/pr-body.mjs reads the checklist of the PR's own milestone", () => {
    // A milestone that is not merged yet has its checklist in WORKFLOW (under a "Checklists"
    // heading) until the sign-off or the next planning PR moves it to the archive; the archive is never read.
    const workflow = [
      '## Checklists',
      '',
      '#### M100: A new milestone',
      '',
      '- [ ] Try it: https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-<N>/?m=easy — tap.',
    ].join('\n');
    const link = 'https://botrops1.github.io/sail-learn-and-train/pr-preview/pr-212/?m=easy';
    expect(workflowLinks(workflow, '100', 212)).toEqual([link]);
    const problems = checkPrBody(
      { title: 'M100: A new milestone', body: 'x'.repeat(250), number: 212 },
      workflow,
    );
    expect(problems.some((problem) => problem.includes(link))).toBe(true);
    expect(workflowLinks(read('docs/archive/CHECKLISTS.md'), '99', 212).length).toBeGreaterThan(0);
  });
});
