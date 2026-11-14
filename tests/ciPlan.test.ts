import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FULL_CAP_S,
  PR_CAP_S,
  SCENE_SHARDS,
  ciMatrix,
  isDocsOnly,
  liveGroupNames,
  packParts,
  pathGroups,
  prGroups,
} from '../scripts/ci-plan.mjs';

const shotsSource = readFileSync('scripts/shots.mjs', 'utf8');
const times = JSON.parse(readFileSync('.github/ci-times.json', 'utf8')) as Record<string, number>;
const paths = JSON.parse(readFileSync('.github/ci-paths.json', 'utf8')) as {
  all: string[];
  groups: Record<string, string[]>;
};
const groups = liveGroupNames(shotsSource);
const newest = ['m99', 'm98', 'm97', 'm96'];

describe('liveGroupNames', () => {
  it('reads the groups of the real scripts/shots.mjs', () => {
    for (const name of [
      'general',
      'm4b',
      'm60b',
      'budget',
      'm87',
      'm88',
      'm89',
      'm90',
      'm91',
      'm92',
      'm93',
      'm94',
      'm95',
      'm96',
      'm97',
      'm98',
      'm99',
    ])
      expect(groups).toContain(name);
    expect(new Set(groups).size).toBe(groups.length);
  });

  it('has a live group for every scripts/shots-m*.mjs file and a recorded time for every group', () => {
    // M4a's checks run inside the group `general`; every other file is a group of the same name.
    const insideGeneral = new Set(['m4a']);
    const fileGroups = readdirSync('scripts')
      .map((file) => /^shots-(m[0-9a-z]+)\.mjs$/.exec(file)?.[1])
      .filter((name): name is string => name !== undefined);
    expect(fileGroups.length).toBeGreaterThan(0);
    for (const name of fileGroups) {
      if (insideGeneral.has(name)) expect(groups).toContain('general');
      else expect(groups, `scripts/shots-${name}.mjs has no live group`).toContain(name);
    }
    for (const name of groups)
      expect(times, `group ${name} has no line in .github/ci-times.json`).toHaveProperty(name);
    for (const name of Object.keys(times))
      expect(groups, `.github/ci-times.json names ${name}, which is not a live group`).toContain(
        name,
      );
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

describe('pathGroups and the plan from the changed files', () => {
  const plan = (files: string[], title = 'Fix', body = '') =>
    prGroups({ title, body, groups, files, paths });
  const base = plan([]);

  it('runs everything when the store, the URL state or the scene setup changed', () => {
    expect(plan(['src/app/store.ts'])).toBe('all');
    expect(plan(['docs/A.md', 'src/app/urlState.ts'])).toBe('all');
    expect(plan(['src/render3d/sceneConfig.ts'])).toBe('all');
    expect(pathGroups(['package-lock.json'], paths, groups)).toBe('all');
  });

  it('runs the exercise groups when the exercises data or the run changed', () => {
    for (const file of ['content/exercises/exercises.json', 'src/app/exerciseRun.ts']) {
      const result = plan([file]) as string[];
      expect(result).toEqual(expect.arrayContaining(['m69', 'm71', ...base]));
      expect(result).toEqual(groups.filter((name) => result.includes(name)));
    }
    expect(pathGroups(['content/exercises/x.json'], paths, groups)).toEqual(
      paths.groups['content/exercises/'],
    );
  });

  it('adds nothing for a change under src/ui/ alone', () => {
    expect(pathGroups(['src/ui/panel.ts'], paths, groups)).toEqual([]);
    expect(plan(['src/ui/panel.ts'])).toEqual(base);
  });

  it('leaves a documents-only change and a PR without a file list as they were', () => {
    expect(isDocsOnly(['docs/A.md'])).toBe(true);
    expect(plan(['docs/A.md'])).toEqual(base);
    expect(prGroups({ title: 'Fix', body: '', groups })).toEqual(base);
  });

  it('keeps a "CI groups:" line working beside the files', () => {
    expect(plan(['src/app/store.ts'], 'Fix', 'CI groups: m68')).toBe('all');
    expect(plan(['src/app/exerciseRun.ts'], 'Fix', 'CI groups: m68')).toEqual(
      expect.arrayContaining(['m68', 'm71']),
    );
    expect(plan([], 'Fix', 'CI groups: all')).toBe('all');
  });

  it('ignores group names that are not live groups', () => {
    expect(pathGroups(['x/y'], { all: [], groups: { 'x/': ['m999', 'm69'] } }, groups)).toEqual([
      'm69',
    ]);
  });
});

describe('.github/ci-paths.json', () => {
  it('names only paths that exist and groups that exist', () => {
    const prefixes = [...paths.all, ...Object.keys(paths.groups)];
    for (const prefix of prefixes) expect(existsSync(prefix), prefix).toBe(true);
    for (const names of Object.values(paths.groups)) {
      for (const name of names) expect(groups, name).toContain(name);
    }
  });

  it('lists exactly the groups whose checks open the exercise list', () => {
    const files = execSync('grep -l "exercise-item-\\|mode=exercises" scripts/shots-m*.mjs', {
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean)
      .map((file) => /shots-(m\d+[a-z]?)\.mjs$/.exec(file)?.[1] ?? file)
      .sort();
    expect([...(paths.groups['content/exercises/'] ?? [])].sort()).toEqual(files);
    expect(paths.groups['src/app/exerciseRun.ts']).toEqual(paths.groups['content/exercises/']);
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
