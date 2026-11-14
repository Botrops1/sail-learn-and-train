import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  escapeCommand,
  flakyEntries,
  parseEnv,
  retryPlan,
  runPart,
  warningLines,
  type Failed,
} from '../scripts/ci-shots.mjs';
import { issueBody, mergeFlaky, openIssues, summaryMarkdown } from '../scripts/flaky-report.mjs';
import { createQuietLog } from '../scripts/quiet-log.mjs';

const LIVE = 'SHOTS_NO_SCENES=1 SHOTS_NO_TAPS=1 SHOTS_ONLY=m9,m10,m11';

describe('retry of a failed browser part (spec F)', () => {
  it("reads a part's settings", () => {
    expect(parseEnv(LIVE)).toEqual({
      SHOTS_NO_SCENES: '1',
      SHOTS_NO_TAPS: '1',
      SHOTS_ONLY: 'm9,m10,m11',
    });
    expect(parseEnv(undefined)).toEqual({});
  });

  it('reruns only the groups that failed', () => {
    const failed: Failed = {
      whole: false,
      groups: [{ name: 'm10', lines: ['live m10 x: 3 WRONG'] }],
      problems: [],
    };
    const plan = retryPlan(parseEnv(LIVE), 'live 1: m9, m10, m11', failed);
    expect(plan).toEqual({
      env: { SHOTS_NO_SCENES: '1', SHOTS_NO_TAPS: '1', SHOTS_ONLY: 'm10' },
      names: ['m10'],
      whole: false,
    });
  });

  it('reruns the whole part for scenes, taps, an unowned problem or no record', () => {
    const scenes = parseEnv('SHOTS_NO_LIVE=1 SHOTS_NO_TAPS=1 SHOTS_SHARD=2/4');
    const unowned: Failed = { whole: true, groups: [], problems: ['scene a: console error'] };
    for (const failed of [unowned, null]) {
      const plan = retryPlan(scenes, 'scenes 2/4', failed);
      expect(plan.whole).toBe(true);
      expect(plan.env).toEqual(scenes);
      expect(plan.names).toEqual(['scenes 2/4']);
    }
    const mixed: Failed = { whole: true, groups: [{ name: 'm9', lines: [] }], problems: [] };
    const plan = retryPlan(parseEnv(LIVE), 'live 1', mixed);
    expect(plan.env.SHOTS_ONLY).toBe('m9,m10,m11');
    expect(plan.names).toEqual(['m9']);
  });

  it('names the WRONG lines in the record, clipped', () => {
    const failed: Failed = {
      whole: false,
      groups: [
        { name: 'm9', lines: Array.from({ length: 20 }, (_, i) => `l${i} ${'x'.repeat(400)}`) },
      ],
      problems: ['p'],
    };
    const entries = flakyEntries(retryPlan({}, 'part', failed), failed);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.lines).toHaveLength(10);
    expect(entries[0]?.lines[0]?.length).toBe(300);
    const bare: Failed = { whole: false, groups: [{ name: 'm9', lines: [] }], problems: ['boom'] };
    expect(flakyEntries(retryPlan({}, 'part', bare), bare)[0]?.lines).toEqual(['boom']);
  });

  it('escapes a message so one line cannot end the workflow command', () => {
    expect(escapeCommand('a%b\nc\r')).toBe('a%25b%0Ac%0D');
    expect(warningLines([{ name: 'm9', lines: ['x WRONG', 'y'] }])).toEqual([
      '::warning title=Flaky check::m9: x WRONG | y',
    ]);
  });

  describe('runPart', () => {
    function setup(statuses: number[], failed?: Failed) {
      const dir = mkdtempSync(path.join(tmpdir(), 'ci-shots-'));
      const failedFile = path.join(dir, 'failed.json');
      const flakyFile = path.join(dir, 'flaky.json');
      if (failed) writeFileSync(failedFile, JSON.stringify(failed));
      const runs: Record<string, string>[] = [];
      const printed: string[] = [];
      const status = runPart({
        partEnv: parseEnv(LIVE),
        partName: 'live 1',
        failedFile,
        retryFailedFile: path.join(dir, 'retry.json'),
        flakyFile,
        run: (env) => {
          runs.push(env);
          return statuses[runs.length - 1] ?? 0;
        },
        print: (line) => printed.push(line),
      });
      return { status, runs, printed, flakyFile };
    }
    const failedM10: Failed = {
      whole: false,
      groups: [{ name: 'm10', lines: ['live m10 a: 1 WRONG'] }],
      problems: ['live m10 a: 1'],
    };

    it('a part that passes is run once and records nothing', () => {
      const { status, runs, printed } = setup([0]);
      expect(status).toBe(0);
      expect(runs).toHaveLength(1);
      expect(printed).toEqual([]);
    });

    it('fails once, passes on the retry: green, warning and a record', () => {
      const { status, runs, printed, flakyFile } = setup([1, 0], failedM10);
      expect(status).toBe(0);
      expect(runs).toHaveLength(2);
      expect(runs[1]?.SHOTS_ONLY).toBe('m10');
      expect(
        printed.some((line) =>
          line.startsWith('::warning title=Flaky check::m10: live m10 a: 1 WRONG'),
        ),
      ).toBe(true);
      expect(JSON.parse(readFileSync(flakyFile, 'utf8'))).toEqual([
        { name: 'm10', lines: ['live m10 a: 1 WRONG'] },
      ]);
    });

    it('fails twice: red, no warning, no record', () => {
      const { status, runs, printed } = setup([1, 1], failedM10);
      expect(status).toBe(1);
      expect(runs).toHaveLength(2);
      expect(printed.some((line) => line.startsWith('::warning'))).toBe(false);
    });
  });
});

describe('the runner names the groups that failed', () => {
  it('records failed units with their WRONG lines and the problems they added', () => {
    const problems: string[] = [];
    const log = createQuietLog({ problems, print: () => undefined });
    log.install();
    try {
      log.begin('live group m9');
      console.log('ok line');
      log.end();
      log.begin('live group m10');
      console.log('live m10 a: 1 WRONG');
      problems.push('live m10 a: 1');
      log.end();
    } finally {
      log.restore();
    }
    expect(log.failed.map((unit) => unit.name)).toEqual(['live group m10']);
    expect(log.failed[0]?.reason).toEqual(['live m10 a: 1 WRONG']);
    expect(log.failed[0]?.problems).toBe(1);
  });
});

describe('flaky report', () => {
  it("merges the parts' records by name", () => {
    expect(
      mergeFlaky([
        [{ name: 'm9', lines: ['a'] }],
        [
          { name: 'm9', lines: ['a', 'b'] },
          { name: 'taps', lines: [] },
        ],
        'junk',
      ]),
    ).toEqual([
      { name: 'm9', lines: ['a', 'b'] },
      { name: 'taps', lines: [] },
    ]);
    expect(summaryMarkdown([])).toBe('');
    expect(summaryMarkdown([{ name: 'm9', lines: ['a'] }])).toContain('**m9**');
  });

  it('opens an issue for a new name and comments on an open one', () => {
    const calls: string[][] = [];
    const run = (args: string[]) => {
      calls.push(args);
      return args[0] === 'issue' && args[1] === 'list'
        ? JSON.stringify([{ number: 7, title: 'Flaky check: m9' }])
        : '';
    };
    openIssues(
      [
        { name: 'm9', lines: ['x ``` y'] },
        { name: 'm10', lines: [] },
      ],
      'http://run',
      run,
    );
    const kinds = calls.map((args) => args.slice(0, 2).join(' '));
    expect(kinds).toContain('issue comment');
    expect(kinds).toContain('issue create');
    expect(calls.find((args) => args[1] === 'comment')?.[2]).toBe('7');
    const create = calls.find((args) => args[0] === 'issue' && args[1] === 'create');
    expect(create).toContain('Flaky check: m10');
    expect(create).toContain('flaky');
    expect(issueBody({ name: 'm9', lines: ['x ``` y'] }, 'http://run')).not.toContain('x ``` y');
  });
});
