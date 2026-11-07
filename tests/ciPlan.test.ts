import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FULL_CAP_S,
  PR_CAP_S,
  SCENE_SHARDS,
  ciMatrix,
  isDocsOnly,
  liveGroupNames,
  packParts,
  prGroups,
} from '../scripts/ci-plan.mjs';

const shotsSource = readFileSync('scripts/shots.mjs', 'utf8');
const times = JSON.parse(readFileSync('.github/ci-times.json', 'utf8')) as Record<string, number>;
const groups = liveGroupNames(shotsSource);
const newest = ['m90', 'm89', 'm88', 'm87'];

describe('liveGroupNames', () => {
  it('reads the groups of the real scripts/shots.mjs', () => {
    for (const name of ['general', 'm4b', 'm60b', 'budget', 'm87', 'm88', 'm89', 'm90'])
      expect(groups).toContain(name);
    expect(new Set(groups).size).toBe(groups.length);
    // Counted at M90: general, m4b, m4c, m5 to m82 with m60b, m85, m87, m88, m89, m90, and budget.
    expect(groups.length).toBe(88);
  });

  it('throws when the object is not found', () => {
    expect(() => liveGroupNames('const other = {};')).toThrow();
  });

  it('stops at the end of the object', () => {
    const source = [
      '  const liveGroups = {',
      '    a1: () => x(),',
      '    b2: async () => {',
      '  };',
      '    c3: () => y(),',
    ];
    expect(liveGroupNames(source.join('\n'))).toEqual(['a1', 'b2']);
  });
});

describe('ci-times.json', () => {
  it('has a line for every group and no other', () => {
    expect(Object.keys(times).sort()).toEqual([...groups].sort());
  });
});

describe('isDocsOnly', () => {
  it('knows documentation', () => {
    expect(isDocsOnly(['docs/A.md', 'README.md'])).toBe(true);
    expect(isDocsOnly(['.claude/skills/plan/SKILL.md'])).toBe(true);
    expect(isDocsOnly(['docs/mockups/x.html'])).toBe(true);
    expect(isDocsOnly(['LICENSE', '.github/ISSUE_TEMPLATE/bug.yml'])).toBe(true);
  });

  it('does not count code, content or workflows', () => {
    expect(isDocsOnly(['docs/A.md', 'src/x.ts'])).toBe(false);
    expect(isDocsOnly(['content/lang/en/ui.json'])).toBe(false);
    expect(isDocsOnly(['.github/workflows/ci.yml'])).toBe(false);
    expect(isDocsOnly(['scripts/shots.mjs'])).toBe(false);
  });

  it('is false for an empty list', () => {
    expect(isDocsOnly([])).toBe(false);
  });
});

describe('prGroups', () => {
  const run = (title: string, body = '') => prGroups({ title, body, groups });

  it('runs general, the milestone of the title and the four newest', () => {
    const result = run('M60: x');
    expect(result).toEqual(expect.arrayContaining(['general', 'm60', 'm60b', ...newest]));
    expect(result).not.toContain('m61');
  });

  it('runs a letter milestone by its id', () => {
    expect(run('M4b: x')).toContain('m4b');
    expect(run('M4b: x')).not.toContain('m4c');
  });

  it('runs only general and the newest for a title without a milestone', () => {
    expect(run('Fix the winch')).toEqual(['general', ...newest.slice().reverse()]);
  });

  it('adds the named groups', () => {
    expect(run('Fix', 'CI groups: m68, m75')).toEqual(expect.arrayContaining(['m68', 'm75']));
    expect(run('Fix', 'Tests\nCI groups: m68 m75\nmore')).toEqual(
      expect.arrayContaining(['m68', 'm75']),
    );
  });

  it('runs everything for "CI groups: all"', () => {
    expect(run('Fix', 'text\nCI groups: all\n')).toBe('all');
  });

  it('ignores names that are not groups', () => {
    const base = run('Fix');
    expect(run('Fix', 'CI groups: m999; rm -rf /')).toEqual(base);
  });

  it('keeps the order of the groups', () => {
    const result = run('M60: x') as string[];
    expect(result).toEqual(groups.filter((name) => result.includes(name)));
  });
});

describe('packParts', () => {
  const secondsOf = (name: string) => times[name] ?? 300;

  it('packs every group once, within the cap', () => {
    const parts = packParts(groups, times, FULL_CAP_S);
    expect(parts.flat().sort()).toEqual([...groups].sort());
    for (const part of parts) {
      const total = part.reduce((sum, name) => sum + secondsOf(name), 0);
      if (part.length > 1) expect(total).toBeLessThanOrEqual(FULL_CAP_S);
    }
    // A group longer than the cap (m68 at M83's first numbers, m67 after the refresh) sits alone.
    for (const name of groups.filter((n) => secondsOf(n) > FULL_CAP_S)) {
      expect(parts.find((part) => part.includes(name))).toEqual([name]);
    }
  });

  it('is deterministic and counts a missing time as 300 s', () => {
    expect(packParts(groups, times, FULL_CAP_S)).toEqual(packParts(groups, times, FULL_CAP_S));
    expect(packParts(['a', 'b', 'c'], {}, 600)).toEqual([['a', 'b'], ['c']]);
  });
});

describe('ciMatrix', () => {
  it('has at most 20 entries for the full set', () => {
    const { include } = ciMatrix({ groups, times, capS: FULL_CAP_S });
    expect(include.length).toBeLessThanOrEqual(20);
    expect(include.slice(0, SCENE_SHARDS).map((entry) => entry.part)).toEqual([
      'scenes 1/4',
      'scenes 2/4',
      'scenes 3/4',
      'scenes 4/4',
    ]);
    expect(include[SCENE_SHARDS]?.part).toBe('taps');
    for (const entry of include) expect(entry.env).toMatch(/^[A-Z_=0-9a-z,/ ]+$/);
  });

  it('has only scene and tap parts for no groups', () => {
    expect(ciMatrix({ groups: [], times, capS: PR_CAP_S }).include).toHaveLength(SCENE_SHARDS + 1);
  });

  it('keeps every live part of the PR set within 600 s', () => {
    const chosen = prGroups({ title: 'M83: Faster CI', body: '', groups }) as string[];
    const { include } = ciMatrix({ groups: chosen, times, capS: PR_CAP_S });
    const live = include.filter((entry) => entry.env.includes('SHOTS_ONLY='));
    expect(live.length).toBeGreaterThan(0);
    for (const entry of live) {
      const names = (/SHOTS_ONLY=(\S+)/.exec(entry.env)?.[1] ?? '').split(',');
      const total = names.reduce((sum, name) => sum + (times[name] ?? 300), 0);
      expect(total).toBeLessThanOrEqual(PR_CAP_S);
    }
  });
});

describe('CI browser', () => {
  it('uses the same Playwright version in package.json and in the workflow container, if any', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const version = pkg.devDependencies?.playwright ?? pkg.dependencies?.playwright;
    const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
    for (const match of workflow.matchAll(/playwright:v([\d.]+)-/g)) {
      expect(match[1]).toBe(version);
    }
  });
});
