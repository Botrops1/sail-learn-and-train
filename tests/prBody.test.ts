import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  COMMENT_PLACEHOLDERS,
  REQUIRED_SECTIONS,
  backtickedLinks,
  checkPrBody,
  milestoneOf,
  placeholders,
  questionsWithoutRecommendation,
  workflowLinks,
} from '../scripts/pr-body.mjs';

const PREVIEW = 'https://botrops1.github.io/sail-learn-and-train/pr-preview';

const WORKFLOW = [
  '#### M80: A clear exercise screen',
  '',
  `- [ ] Points of sail: ${PREVIEW}/pr-<N>/?m=exercise&ex=points-of-sail — tap Start.`,
  '- [ ] Soft move: open and close the hint.',
  '',
  '#### M81: Watch and Show me',
  '',
  `- [ ] Watch: ${PREVIEW}/pr-<N>/?m=exercise&ex=reduce-sail — tap Watch it.`,
].join('\n');

const body = (number: string, extra = '') =>
  [
    `> **Independent review required before you test:** new Code session, Opus, medium effort, type \`/review ${number}\`.`,
    '## What changed (plain language, no jargon)',
    '- The hint starts folded on a phone, so the 3D view is clearer.',
    '## How to check on your phone',
    `Preview of this PR: ${PREVIEW}/pr-${number}/ (link also in the bot comment)`,
    `- [ ] Points of sail: ${PREVIEW}/pr-${number}/?m=exercise&ex=points-of-sail — tap Start.`,
    '## Tests',
    '- npm test: 1352 passed.',
    '## Questions for the owner',
    '1. Keep it? Recommended: yes, because it behaves the same.',
    extra,
  ].join('\n');

describe('PR description check', () => {
  it('reads the milestone from the title', () => {
    expect(milestoneOf('M80: A clear exercise screen')).toBe('80');
    expect(milestoneOf('M4b: Winches')).toBe('4b');
    expect(milestoneOf('Fix: the boom')).toBeNull();
    expect(milestoneOf('Plan: exercises on a phone (M79–M82)')).toBeNull();
  });

  it("takes only the milestone's own checklist links, with the real number", () => {
    expect(workflowLinks(WORKFLOW, '80', 169)).toEqual([
      `${PREVIEW}/pr-169/?m=exercise&ex=points-of-sail`,
    ]);
  });

  it('passes a complete milestone description', () => {
    expect(
      checkPrBody(
        { title: 'M80: A clear exercise screen', body: body('169'), number: 169 },
        WORKFLOW,
      ),
    ).toEqual([]);
  });

  it('fails on placeholders left in (PR 169)', () => {
    const problems = checkPrBody(
      { title: 'M80: A clear exercise screen', body: body('<N>'), number: 169 },
      WORKFLOW,
    );
    expect(problems.some((p) => p.includes('"pr-preview/pr-<N>"'))).toBe(true);
    expect(problems.some((p) => p.includes('/review <N>'))).toBe(true);
    expect(problems.some((p) => p.includes('Checklist link'))).toBe(true);
  });

  it('fails on a stub, a missing section or a missing checklist link', () => {
    const title = 'M80: A clear exercise screen';
    expect(
      checkPrBody({ title, body: 'Description follows.', number: 169 }, WORKFLOW),
    ).toHaveLength(1);
    expect(checkPrBody({ title, body: null, number: 169 }, WORKFLOW)).toHaveLength(1);
    const noTests = body('169').replace('## Tests', '## Checks');
    expect(checkPrBody({ title, body: noTests, number: 169 }, WORKFLOW)).toEqual([
      'Section "## Tests" is missing.',
    ]);
    const noLink = body('169').replace('ex=points-of-sail', 'ex=tacking');
    expect(checkPrBody({ title, body: noLink, number: 169 }, WORKFLOW)).toHaveLength(1);
  });

  it('leaves plan PRs that give advice about /review alone, but not their placeholder links', () => {
    const advice = 'Each milestone PR: start `/review <PR>` before you test.';
    expect(checkPrBody({ title: 'Plan: phase 11', body: advice, number: 170 })).toEqual([]);
    expect(
      checkPrBody({ title: 'Fix: the boom', body: `Check ${PREVIEW}/pr-<N>/?m=easy`, number: 171 }),
    ).toHaveLength(1);
  });

  it('in comments, blocks only real links and the skill lines with a placeholder', () => {
    expect(placeholders('the review line says `/review <N>`', COMMENT_PLACEHOLDERS)).toEqual([]);
    expect(placeholders(`open ${PREVIEW}/pr-<N>/`, COMMENT_PLACEHOLDERS)).toHaveLength(1);
    expect(
      placeholders(
        'Stopped watching this PR. To continue, start a new session and type `/milestone resume <PR number>`.',
        COMMENT_PLACEHOLDERS,
      ),
    ).toHaveLength(1);
    expect(
      placeholders('use `/milestone resume <PR number>` in a new session.', COMMENT_PLACEHOLDERS),
    ).toHaveLength(1);
    expect(
      placeholders('use `/milestone resume 169` in a new session.', COMMENT_PLACEHOLDERS),
    ).toEqual([]);
  });

  it('fails on a checklist link in backticks, single or double (PR 196)', () => {
    const title = 'M80: A clear exercise screen';
    const link = `${PREVIEW}/pr-169/?m=exercise&ex=points-of-sail`;
    for (const tick of ['`', '``']) {
      const wrapped = body('169').replace(link, `${tick}${link}${tick}`);
      expect(checkPrBody({ title, body: wrapped, number: 169 }, WORKFLOW)).toEqual([
        `Checklist link is in backticks and cannot be tapped: ${link}`,
      ]);
    }
    expect(backtickedLinks(`a \`${PREVIEW}/pr-170/?x=1\` b`, 169)).toEqual([]);
    expect(backtickedLinks(`a ${link} b \`npm test\``, 169)).toEqual([]);
  });

  it('fails on a question without a recommendation, and names it', () => {
    const title = 'M80: A clear exercise screen';
    const two = body('169').replace(
      '1. Keep it? Recommended: yes, because it behaves the same.',
      [
        '1. Keep it? Recommended: yes, because it behaves the same.',
        '2. Which colour?',
        '3. Show the hint?',
        '   Recommended: no, because the screen is small.',
      ].join('\n'),
    );
    expect(checkPrBody({ title, body: two, number: 169 }, WORKFLOW)).toEqual([
      'Question 2 has no recommendation.',
    ]);
    expect(questionsWithoutRecommendation('## Questions for the owner\nNone\n## Known')).toEqual(
      [],
    );
    expect(questionsWithoutRecommendation('## Tests\n1. Not a question.')).toEqual([]);
    expect(
      questionsWithoutRecommendation('## Questions for the owner\n1. A?\n## Known limitations\n'),
    ).toEqual(['1']);
  });

  it('REQUIRED_SECTIONS are headings of the CLAUDE.md template and of the PR template', () => {
    for (const file of ['../CLAUDE.md', '../.github/pull_request_template.md']) {
      const lines = readFileSync(new URL(file, import.meta.url), 'utf8').split('\n');
      for (const section of REQUIRED_SECTIONS) {
        expect(
          lines.some((line) => line.startsWith(section)),
          `${section} in ${file}`,
        ).toBe(true);
      }
    }
  });
});
