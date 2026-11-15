// Runs one browser part of CI (`npm run shots` with the part's settings) and, when it fails, runs
// the groups that failed once more (spec F of docs/WORKFLOW_REVIEW.md). A part that passes the
// second time is green with a warning "Flaky check" and a record (FLAKY_FILE, read by the
// `browser-checks` job and by nightly.yml); a part that fails twice stays red. Only the
// `browser-part` job of .github/workflows/ci.yml runs the command line. Uses only Node's own modules.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const MAX_LINES = 10;
const MAX_LINE_CHARS = 300;

/** `SHOTS_NO_SCENES=1 SHOTS_ONLY=m9,m10` -> `{ SHOTS_NO_SCENES: '1', SHOTS_ONLY: 'm9,m10' }`. */
export function parseEnv(text) {
  const env = {};
  for (const word of (text ?? '').split(/\s+/)) {
    const at = word.indexOf('=');
    if (at > 0) env[word.slice(0, at)] = word.slice(at + 1);
  }
  return env;
}

/** The first run's record of what failed (`SHOTS_FAILED_FILE`), or null if it was not written. */
export function readFailed(path) {
  if (!path || !existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'));
    if (data && typeof data === 'object' && Array.isArray(data.groups)) return data;
  } catch {
    // An unreadable record means the run stopped early: the caller reruns the whole part.
  }
  return null;
}

/**
 * What the second run is: only the failed live groups (`SHOTS_ONLY`), or the whole part again
 * (a scene part, the taps, a failure no group owns, or no record at all).
 * @returns {{ env: Record<string, string>, names: string[], whole: boolean }}
 */
export function retryPlan(partEnv, partName, failed) {
  const groups = failed && !failed.whole ? failed.groups.map((group) => group.name) : [];
  if (groups.length > 0) {
    return { env: { ...partEnv, SHOTS_ONLY: groups.join(',') }, names: groups, whole: false };
  }
  const named = failed?.groups.map((group) => group.name) ?? [];
  return { env: { ...partEnv }, names: named.length > 0 ? named : [partName], whole: true };
}

/** The entries of the flaky record: `{ name, lines }` for each name that failed once. */
export function flakyEntries(plan, failed) {
  const clip = (lines) =>
    lines.slice(0, MAX_LINES).map((line) => String(line).slice(0, MAX_LINE_CHARS));
  const fallback = clip(failed?.problems ?? []);
  return plan.names.map((name) => {
    const own = failed?.groups.find((group) => group.name === name);
    return { name, lines: own && own.lines.length > 0 ? clip(own.lines) : fallback };
  });
}

/** A workflow-command message: `%`, CR and LF are escaped so a line cannot end the command. */
export function escapeCommand(text) {
  return text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

/** The `::warning` lines for the flaky entries. */
export function warningLines(entries) {
  return entries.map((entry) =>
    escapeCommand(
      `::warning title=Flaky check::${entry.name}: ${entry.lines.join(' | ') || 'no line recorded'}`,
    ),
  );
}

/**
 * Runs the part, retries once, writes the record. `run(env)` returns the exit status of
 * `npm run shots` with that environment added.
 * @returns {number} the exit status of the job step
 */
export function runPart({ partEnv, partName, failedFile, retryFailedFile, flakyFile, run, print }) {
  const first = run({ ...partEnv, SHOTS_FAILED_FILE: failedFile });
  if (first === 0) return 0;
  const failed = readFailed(failedFile);
  const plan = retryPlan(partEnv, partName, failed);
  print(
    `::group::First run failed (exit ${first}); running ${plan.whole ? 'the whole part' : plan.names.join(', ')} once more`,
  );
  print('::endgroup::');
  const second = run({ ...plan.env, SHOTS_FAILED_FILE: retryFailedFile });
  if (second !== 0) {
    print(`The retry failed too (exit ${second}): not a flaky check.`);
    return second;
  }
  const entries = flakyEntries(plan, failed);
  for (const line of warningLines(entries)) print(line);
  if (flakyFile) writeFileSync(flakyFile, JSON.stringify(entries));
  return 0;
}

function main(env) {
  const tmp = env.RUNNER_TEMP ?? '.';
  const run = (extra) =>
    spawnSync('npm', ['run', 'shots'], {
      stdio: 'inherit',
      env: { ...env, SHOTS_SIZES: 'phone', ...extra },
    }).status ?? 1;
  const status = runPart({
    partEnv: parseEnv(env.PART_ENV),
    partName: env.PART_NAME || 'browser part',
    failedFile: env.FAILED_FILE ?? `${tmp}/shots-failed.json`,
    retryFailedFile: `${tmp}/shots-failed-retry.json`,
    flakyFile: env.FLAKY_FILE,
    run,
    print: (line) => console.log(line),
  });
  process.exit(status);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.env);
