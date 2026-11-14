// Reports the browser checks that failed once and passed on the retry (scripts/ci-shots.mjs;
// spec F of docs/WORKFLOW_REVIEW.md). Two commands, run only by workflows:
//   node scripts/flaky-report.mjs summary <dir>   (`browser-checks` job): merges the records the
//     parts uploaded into <dir>, writes the job summary and the output `flaky` (one line of JSON)
//   node scripts/flaky-report.mjs issues          (nightly.yml): env FLAKY (that JSON); opens or
//     comments on the issue "Flaky check: <name>" (label `flaky`) for each name
// Check output is data: it goes into files, env and `gh` arguments, never into a shell line.
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Merges the records (arrays of `{ name, lines }`): one entry per name, lines kept once. */
export function mergeFlaky(records) {
  const byName = new Map();
  for (const record of records) {
    if (!Array.isArray(record)) continue;
    for (const entry of record) {
      if (!entry || typeof entry.name !== 'string') continue;
      const lines = Array.isArray(entry.lines) ? entry.lines.map(String) : [];
      const known = byName.get(entry.name) ?? [];
      for (const line of lines) if (!known.includes(line)) known.push(line);
      byName.set(entry.name, known);
    }
  }
  return [...byName].map(([name, lines]) => ({ name, lines }));
}

/** Reads every `*.json` record in a folder (a missing folder or a broken file counts as none). */
export function readRecords(dir) {
  if (!dir || !existsSync(dir)) return [];
  const records = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    try {
      records.push(JSON.parse(readFileSync(`${dir}/${file}`, 'utf8')));
    } catch {
      // A record that cannot be read is left out; the warning in the part's log still names it.
    }
  }
  return records;
}

/** The job summary text. */
export function summaryMarkdown(flaky) {
  if (flaky.length === 0) return '';
  const lines = [
    '### Flaky checks',
    '',
    'These failed once and passed on the retry, so the job is green. Reproduce and fix them; do not just re-run.',
    '',
  ];
  for (const entry of flaky) {
    lines.push(`- **${entry.name}**`);
    for (const line of entry.lines) lines.push(`  - \`${line.replace(/`/g, "'")}\``);
  }
  return lines.join('\n');
}

export function issueTitle(name) {
  return `Flaky check: ${name}`;
}

/** The text of an issue or a comment for one flaky name. */
export function issueBody(entry, runUrl) {
  const fence = entry.lines.map((line) => line.replace(/```/g, "'''")).join('\n');
  return [
    `The browser check \`${entry.name}\` failed on its first run and passed on the retry (run: ${runUrl}).`,
    '',
    'To fix it, open a new Code session and type /bug, then the link of this issue, then: flaky check. Reproduce it locally first (`SHOTS_ONLY=<group> npm run shots`); do not close it by re-running.',
    '',
    '```',
    fence || 'no line recorded',
    '```',
  ].join('\n');
}

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8' });
}

export function openIssues(flaky, runUrl, run = gh) {
  run(['label', 'create', 'flaky', '--color', 'FBCA04', '--force']);
  for (const entry of flaky) {
    const title = issueTitle(entry.name);
    const found = JSON.parse(
      run(['issue', 'list', '--label', 'flaky', '--state', 'open', '--json', 'number,title']),
    ).find((issue) => issue.title === title);
    const body = issueBody(entry, runUrl);
    if (found) run(['issue', 'comment', String(found.number), '--body', body]);
    else run(['issue', 'create', '--title', title, '--label', 'flaky', '--body', body]);
  }
}

function main(argv, env) {
  if (argv[0] === 'summary') {
    const flaky = mergeFlaky(readRecords(argv[1]));
    if (env.GITHUB_STEP_SUMMARY && flaky.length > 0)
      appendFileSync(env.GITHUB_STEP_SUMMARY, `${summaryMarkdown(flaky)}\n`);
    if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `flaky=${JSON.stringify(flaky)}\n`);
    console.log(
      flaky.length > 0 ? `Flaky: ${flaky.map((e) => e.name).join(', ')}` : 'No flaky checks.',
    );
  } else if (argv[0] === 'issues') {
    let flaky = [];
    try {
      flaky = mergeFlaky([JSON.parse(env.FLAKY || '[]')]);
    } catch {
      console.log('FLAKY is not JSON: nothing to report.');
    }
    openIssues(flaky, env.RUN_URL ?? '');
  } else {
    console.error('usage: flaky-report.mjs summary <dir> | issues');
    process.exit(2);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main(process.argv.slice(2), process.env);
