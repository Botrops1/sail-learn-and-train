import { describe, expect, it } from 'vitest';
import { lastLines, runChecks, stepsFrom, STEPS, testSummary } from '../scripts/check.mjs';
import { createQuietLog } from '../scripts/quiet-log.mjs';

describe('quiet browser-check log', () => {
  function run(body: (log: ReturnType<typeof createQuietLog>, problems: string[]) => void) {
    const problems: string[] = [];
    const printed: string[] = [];
    const log = createQuietLog({ problems, print: (line) => printed.push(line) });
    log.install();
    try {
      body(log, problems);
    } finally {
      log.restore();
    }
    return printed;
  }

  it('prints nothing for a unit that went well', () => {
    const printed = run((log) => {
      log.begin('scene a');
      console.log('shots/a.png layout=stacked');
      log.end();
    });
    expect(printed).toEqual([]);
  });

  it('prints the unit under its name when a line says WRONG, STOPPED or HTTP 404', () => {
    for (const line of ['live x: 3 WRONG', 'live x STOPPED: boom', 'p: HTTP 404 http://h/a']) {
      const printed = run((log) => {
        log.begin('group x');
        console.log('first line');
        console.log(line);
        log.end();
      });
      expect(printed).toEqual(['--- group x', 'first line', line]);
    }
  });

  it('prints the unit when it added a problem (a console error)', () => {
    const printed = run((log, problems) => {
      log.begin('scene b');
      console.log('line');
      problems.push('scene b: console error: x');
      log.end();
    });
    expect(printed).toEqual(['--- scene b', 'line']);
  });

  it('keeps one unit apart from the next, and say() always prints', () => {
    const printed = run((log) => {
      log.begin('one');
      console.log('a WRONG');
      log.begin('two');
      console.log('fine');
      log.say('live group two: 4 s');
      log.end();
    });
    expect(printed).toEqual(['--- one', 'a WRONG', 'live group two: 4 s']);
  });

  it('prints every line as it comes in verbose mode', () => {
    const printed: string[] = [];
    const log = createQuietLog({ verbose: true, problems: [], print: (l) => printed.push(l) });
    log.install();
    log.begin('x');
    log.say('hello');
    log.end();
    log.restore();
    expect(printed).toEqual(['hello']);
  });
});

describe('npm run check', () => {
  it('runs typecheck, lint, format, test and build in that order', () => {
    expect(STEPS.map((step) => step.name)).toEqual([
      'typecheck',
      'lint',
      'format',
      'test',
      'build',
    ]);
  });

  it('starts at a later step with --from, and rejects an unknown one', () => {
    expect(stepsFrom('test').map((step) => step.name)).toEqual(['test', 'build']);
    expect(stepsFrom(undefined)).toHaveLength(STEPS.length);
    expect(() => stepsFrom('nope')).toThrow(/unknown step/);
  });

  it('reads the number of passed tests from the closing lines', () => {
    expect(testSummary(' Test Files  4 passed (4)\n      Tests  1613 passed (1613)\n')).toBe(
      '1613 passed',
    );
    expect(testSummary('      Tests  3 passed | 2 skipped (5)\n')).toBe('3 passed, 2 skipped');
    expect(testSummary('nothing')).toBe('');
  });

  it('keeps the last lines of an output, without colour codes', () => {
    const text = Array.from({ length: 100 }, (_, i) => `\u001b[31mline ${i}\u001b[0m`).join('\n');
    const lines = lastLines(text, 80);
    expect(lines).toHaveLength(80);
    expect(lines[0]).toBe('line 20');
    expect(lines[79]).toBe('line 99');
  });

  it('prints one line per passing step, and the tail and FAILED for the first failure', async () => {
    const printed: string[] = [];
    const steps = [
      { name: 'one', bin: 'true-step', args: [] },
      { name: 'two', bin: 'false-step', args: [] },
      { name: 'three', bin: 'true-step', args: [] },
    ];
    const code = await runChecks({
      root: process.cwd(),
      print: (line) => printed.push(line),
      steps,
    });
    // Neither program exists in node_modules/.bin: the first step already fails, with a hint.
    expect(code).toBe(1);
    expect(printed.at(-1)).toMatch(/^FAILED: one \(\d+ s\)$/);
    expect(printed.join('\n')).toContain('npm ci');
  });
});
