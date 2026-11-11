// Plans the browser checks of CI (PHASE_LAUNCH_SPEC 6, M83). Pure functions plus a small
// command-line part that only `.github/workflows/ci.yml` runs (the `plan` job). Uses only Node's
// own modules, so the job needs no `npm ci`. PR text (title, description) is read as data only.
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { milestoneOf } from './pr-body.mjs';

/** Seconds per part (tunable): a PR's set, and the full set. */
export const PR_CAP_S = 600;
export const FULL_CAP_S = 1300;
/** Scene parts of the matrix, and how many of the newest milestones' groups every PR runs. */
export const SCENE_SHARDS = 4;
export const RECENT_GROUPS = 4;
/** A group missing from `.github/ci-times.json` counts as this many seconds. */
export const UNKNOWN_GROUP_S = 300;

/** The keys of `const liveGroups = { … };` in scripts/shots.mjs, in order. */
export function liveGroupNames(source) {
  const lines = String(source).split('\n');
  const start = lines.findIndex((line) => /^\s*const liveGroups = \{\s*$/.test(line));
  const names = [];
  if (start >= 0) {
    for (const line of lines.slice(start + 1)) {
      if (/^ {2}\};/.test(line)) break;
      const match = /^\s{4}([a-z0-9]+): (async )?\(\) =>/.exec(line);
      if (match) names.push(match[1]);
    }
  }
  if (names.length === 0) throw new Error('No live check groups found in scripts/shots.mjs.');
  return names;
}

/** True when the list is not empty and every file is documentation. */
export function isDocsOnly(files) {
  if (files.length === 0) return false;
  return files.every(
    (file) =>
      file.startsWith('docs/') ||
      file.endsWith('.md') ||
      file.startsWith('.claude/') ||
      file.startsWith('.github/ISSUE_TEMPLATE/') ||
      file === 'LICENSE',
  );
}

const numberOf = (name) => {
  const match = /^m(\d+)/.exec(name);
  return match ? Number(match[1]) : null;
};

/**
 * Why each group of a PR runs: `{ names, reasons }`, or `'all'` for a "CI groups: all" line.
 * (`prGroups` returns only the names.)
 */
function prPlan({ title, body, groups }) {
  const text = String(body ?? '');
  if (/^CI groups:\s*all\s*$/im.test(text)) return 'all';
  const reasons = new Map();
  const add = (name, why) => {
    if (groups.includes(name) && !reasons.has(name)) reasons.set(name, why);
  };
  add('general', 'always');
  const milestone = milestoneOf(title ?? '');
  if (milestone !== null) {
    const id = `m${milestone.toLowerCase()}`;
    for (const name of groups) if (new RegExp(`^${id}[a-z]?$`).test(name)) add(name, 'title');
  }
  const recent = groups
    .filter((name) => numberOf(name) !== null)
    .sort((a, b) => numberOf(b) - numberOf(a) || (a < b ? -1 : a > b ? 1 : 0))
    .slice(0, RECENT_GROUPS);
  for (const name of recent) add(name, 'recent');
  const named = /^CI groups:\s*(.+)$/im.exec(text);
  if (named) {
    for (const word of named[1].split(/[,\s]+/)) add(word, 'named');
  }
  return { names: groups.filter((name) => reasons.has(name)), reasons };
}

/** The live groups a PR runs (6.3), or 'all'. */
export function prGroups(input) {
  const plan = prPlan(input);
  return plan === 'all' ? 'all' : plan.names;
}

/** Groups packed into parts of at most `capS` seconds (first fit, longest first). */
export function packParts(groups, times, capS) {
  const secondsOf = (name) => times[name] ?? UNKNOWN_GROUP_S;
  const sorted = [...groups].sort(
    (a, b) => secondsOf(b) - secondsOf(a) || (a < b ? -1 : a > b ? 1 : 0),
  );
  const parts = [];
  for (const name of sorted) {
    const part = parts.find((p) => p.total + secondsOf(name) <= capS);
    if (part) {
      part.names.push(name);
      part.total += secondsOf(name);
    } else {
      parts.push({ names: [name], total: secondsOf(name) });
    }
  }
  return parts.map((part) => groups.filter((name) => part.names.includes(name)));
}

/** The browser-part matrix: scene parts, the taps, then one entry per packed live part. */
export function ciMatrix({ groups, times, capS }) {
  const include = [];
  for (let k = 1; k <= SCENE_SHARDS; k++) {
    include.push({
      part: `scenes ${k}/${SCENE_SHARDS}`,
      env: `SHOTS_NO_LIVE=1 SHOTS_NO_TAPS=1 SHOTS_SHARD=${k}/${SCENE_SHARDS}`,
    });
  }
  include.push({ part: 'taps', env: 'SHOTS_NO_SCENES=1 SHOTS_NO_LIVE=1' });
  packParts(groups, times, capS).forEach((names, index) => {
    include.push({
      part: `live ${index + 1}: ${names.join(', ')}`,
      env: `SHOTS_NO_SCENES=1 SHOTS_NO_TAPS=1 SHOTS_ONLY=${names.join(',')}`,
    });
  });
  return { include };
}

/** The Markdown list for the job summary. */
function summaryOf({ scope, why, matrix, times, docs }) {
  const lines = [`### Browser checks: ${scope} set`, '', `Why: ${why}`, ''];
  if (docs) {
    lines.push('Documents only: no browser parts.');
    return lines.join('\n');
  }
  for (const entry of matrix.include) {
    const live = /SHOTS_ONLY=(\S+)/.exec(entry.env);
    if (!live) {
      lines.push(`- ${entry.part}`);
      continue;
    }
    const names = live[1].split(',');
    const detail = names.map((n) => `${n} ${times[n] ?? UNKNOWN_GROUP_S} s`).join(', ');
    const total = names.reduce((sum, n) => sum + (times[n] ?? UNKNOWN_GROUP_S), 0);
    lines.push(`- ${entry.part.split(':')[0]}: ${detail} (recorded total ${total} s)`);
  }
  return lines.join('\n');
}

function readList(path) {
  if (!path || !existsSync(path)) return null;
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function main(env) {
  const groups = liveGroupNames(readFileSync('scripts/shots.mjs', 'utf8'));
  const times = JSON.parse(readFileSync('.github/ci-times.json', 'utf8'));
  const scope = env.CI_SCOPE === 'pr' ? 'pr' : 'full';
  let docs = false;
  let chosen = groups;
  let capS = FULL_CAP_S;
  let why = 'full set (every group)';
  if (scope === 'pr') {
    const files = readList(env.CHANGED_FILES);
    const plan = prPlan({ title: env.PR_TITLE ?? '', body: env.PR_BODY ?? '', groups });
    if (files && isDocsOnly(files)) {
      docs = true;
      chosen = [];
      why = 'only documents changed';
    } else if (plan === 'all') {
      why = '"CI groups: all" in the description';
    } else {
      chosen = plan.names;
      capS = PR_CAP_S;
      why = chosen.map((name) => `${name} (${plan.reasons.get(name)})`).join(', ');
    }
  }
  let matrix = docs ? { include: [] } : ciMatrix({ groups: chosen, times, capS });
  // DEBUG (temporary): only the taps part, three copies side by side.
  matrix = {
    include: [1, 2, 3].map((n) => ({ part: `taps debug ${n}`, env: 'SHOTS_NO_SCENES=1 SHOTS_NO_LIVE=1' })),
  };
  const summary = summaryOf({ scope, why, matrix, times, docs });
  const outputs = `docs=${docs}\nmatrix=${JSON.stringify(matrix)}\n`;
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, outputs);
  else console.log(outputs);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  else console.log(summary);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.env);
}
