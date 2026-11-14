import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FULL_CAP_S,
  GROUP_ALIASES,
  PR_CAP_S,
  SCENE_SHARDS,
  ciMatrix,
  groupOf,
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
      'm85',
      'm87',
      'm93',
      'm94',
      'm96',
      'm97',
      'm98',
      'm99',
    ])
      expect(groups).toContain(name);
    expect(new Set(groups).size).toBe(groups.length);
  });

  it('has a live group for every scripts/shots-m*.mjs file and a recorded time for every group', () => {
    // M4a's checks run inside the group `general`; a merged milestone (GROUP_ALIASES) runs inside
    // the group it was merged into; every other file is a group of the same name.
    const insideGeneral = new Set(['m4a']);
    const fileGroups = readdirSync('scripts')
      .map((file) => /^shots-(m[0-9a-z]+)\.mjs$/.exec(file)?.[1])
      .filter((name): name is string => name !== undefined);
    expect(fileGroups.length).toBeGreaterThan(0);
    for (const name of fileGroups) {
      if (insideGeneral.has(name)) expect(groups).toContain('general');
      else expect(groups, `scripts/shots-${name}.mjs has no live group`).toContain(groupOf(name));
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
      .map((file) => groupOf(/shots-(m\d+[a-z]?)\.mjs$/.exec(file)?.[1] ?? file))
      .sort();
    expect([...(paths.groups['content/exercises/'] ?? [])].sort()).toEqual([...new Set(files)]);
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

describe('GROUP_ALIASES (groups merged into others)', () => {
  it('points every old name at a live group, with its file still there', () => {
    for (const [old, target] of Object.entries(GROUP_ALIASES)) {
      expect(groups, `${old} is merged into ${target}, which is not a live group`).toContain(
        target,
      );
      expect(groups, `${old} is still a live group of its own`).not.toContain(old);
      expect(GROUP_ALIASES, `${target} is itself merged`).not.toHaveProperty(target);
      expect(existsSync(`scripts/shots-${old}.mjs`), `scripts/shots-${old}.mjs`).toBe(true);
      // The group is named after the oldest of its set.
      const number = (name: string) => Number(/^m(\d+)/.exec(name)?.[1]);
      expect(number(target)).toBeLessThan(number(old));
    }
  });

  it('runs the group of a merged milestone for its PR title, its CI groups word and its files', () => {
    expect(prGroups({ title: 'M7: x', body: '', groups })).toContain('m6');
    expect(prGroups({ title: 'M95: x', body: '', groups })).toContain('m85');
    expect(prGroups({ title: 'M80: x', body: '', groups })).toContain('m14');
    expect(prGroups({ title: 'Fix', body: 'CI groups: m88, m59', groups })).toEqual(
      expect.arrayContaining(['m87', 'm47']),
    );
    expect(groupOf('m42')).toBe('m40');
    expect(groupOf('m40')).toBe('m40');
    expect(groupOf('m66')).toBe('m66');
    expect(
      pathGroups(['x/y'], { all: [], groups: { 'x/': ['m80', 'm14', 'm69'] } }, groups),
    ).toEqual(['m14', 'm69']);
  });

  it('runs the checks of every merged milestone inside its group', () => {
    for (const [old, target] of Object.entries(GROUP_ALIASES)) {
      const start = shotsSource.indexOf(`    ${target}: members(`);
      expect(start, `${target} is not a members(...) group in shots.mjs`).toBeGreaterThan(-1);
      const end = shotsSource.indexOf('\n    ),\n', start);
      const body = shotsSource.slice(start, end);
      expect(body, `${target} does not run liveM${old.slice(1)}Checks`).toContain(
        `liveM${old.slice(1)}Checks(`,
      );
    }
  });

  it('keeps a group for every milestone number that had one', () => {
    const old = readdirSync('scripts')
      .map((file) => /^shots-(m[0-9]+[a-z]?)\.mjs$/.exec(file)?.[1])
      .filter((name): name is string => name !== undefined);
    for (const name of old.filter((n) => n !== 'm4a')) {
      const title = `${name[0]?.toUpperCase()}${name.slice(1)}: x`;
      const result = prGroups({ title, body: '', groups }) as string[];
      expect(result, `a PR titled ${name} runs no group of its own`).toContain(groupOf(name));
    }
  });
});

describe('the size of the browser-check set (H2)', () => {
  // The groups that existed when H2 merged. A group added later has a recorded time of at most
  // 120 s, or a reason in `.github/ci-budget.json`.
  const baseline = new Set(
    'general m4b m4c m5 m6 m8 m9 m10 m11 m12 m14 m15 m16 m17 m18 m20 m23 m24 m25 m26 m27 m28 m29 m30 m31 m32 m33 m34 m35 m36 m37 m38 m39 m40 m44 m47 m48 m49 m50 m51 m52 m54 m56 m58 m60 m60b m61 m62 budget m63 m64 m65 m66 m67 m68 m69 m70 m71 m73 m74 m75 m76 m77 m78 m79 m81 m82 m85 m87 m93 m94 m96 m97 m98 m99'.split(
      ' ',
    ),
  );
  const budget = JSON.parse(readFileSync('.github/ci-budget.json', 'utf8')) as Record<
    string,
    string
  >;

  it('has at most 75 groups and packs into at most 14 parts, also when the times grow by 5 %', () => {
    expect(groups.length).toBeLessThanOrEqual(75);
    expect(packParts(groups, times, FULL_CAP_S).length).toBeLessThanOrEqual(14);
    const slower = Object.fromEntries(Object.entries(times).map(([name, s]) => [name, s * 1.05]));
    expect(packParts(groups, slower, FULL_CAP_S).length).toBeLessThanOrEqual(14);
  });

  it('knows the baseline groups', () => {
    for (const name of baseline) expect(groups, name).toContain(name);
    expect(baseline.size).toBe(groups.length);
  });

  it('keeps a group that is not in the baseline at 120 s or less, or names it in ci-budget.json with a reason', () => {
    for (const name of groups) {
      if (baseline.has(name) || (times[name] ?? 300) <= 120) continue;
      const reason = budget[name];
      expect(
        typeof reason === 'string' && reason.trim().length > 0,
        `${name} is recorded at ${times[name]} s: say why in .github/ci-budget.json`,
      ).toBe(true);
    }
  });

  it('has a ci-budget.json that names only live groups and gives each a reason', () => {
    for (const [name, reason] of Object.entries(budget)) {
      expect(groups, name).toContain(name);
      expect(reason.trim().length, name).toBeGreaterThan(0);
    }
  });
});
