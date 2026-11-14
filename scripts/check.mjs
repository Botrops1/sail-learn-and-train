// `npm run check`: typecheck, lint, format, unit tests and build in one command, one line per step.
// Each step's output is captured. A step that passes costs one line; the first that fails prints
// the last lines of its output, then `FAILED: <step>`, and the run stops with exit code 1.
// `npm run check -- --from test` starts at a later step. CI keeps calling the separate scripts
// (`npm run typecheck`, `lint`, `test`, `build`), so its log stays complete.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The steps in order. `bin` is a program in node_modules/.bin. */
export const STEPS = [
  { name: 'typecheck', bin: 'tsc', args: ['--noEmit'] },
  { name: 'lint', bin: 'eslint', args: ['.'] },
  { name: 'format', bin: 'prettier', args: ['--check', '.'] },
  { name: 'test', bin: 'vitest', args: ['run', '--reporter=dot'], summary: testSummary },
  { name: 'build', bin: 'vite', args: ['build'] },
];

/** How many lines of a failed step are printed. */
export const TAIL_LINES = 80;

const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`, 'g');

/** The last `count` non-empty lines of `text`, without colour codes. */
export function lastLines(text, count = TAIL_LINES) {
  const lines = text
    .replace(ANSI, '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd());
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.slice(-count);
}

/** "1613 passed" (or "1613 passed, 2 skipped") from Vitest's closing lines; '' if not found. */
export function testSummary(output) {
  const text = output.replace(ANSI, '');
  const line = text.split(/\r?\n/).find((row) => /^\s*Tests\s/.test(row));
  if (!line) return '';
  const passed = /(\d+) passed/.exec(line)?.[1];
  const skipped = /(\d+) skipped/.exec(line)?.[1];
  if (!passed) return '';
  return skipped ? `${passed} passed, ${skipped} skipped` : `${passed} passed`;
}

/** The steps from `from` on (a step's name); throws for an unknown name. */
export function stepsFrom(from, steps = STEPS) {
  if (!from) return steps;
  const index = steps.findIndex((step) => step.name === from);
  if (index < 0) {
    throw new Error(`unknown step "${from}"; steps: ${steps.map((step) => step.name).join(', ')}`);
  }
  return steps.slice(index);
}

/** Runs one program and resolves with its exit code and its combined output. */
function runStep(root, step) {
  return new Promise((resolve) => {
    const bin = path.join(root, 'node_modules', '.bin', step.bin);
    if (!existsSync(bin)) {
      resolve({ code: 1, output: `${bin} not found: run "npm ci" first` });
      return;
    }
    const chunks = [];
    const child = spawn(bin, step.args, {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1', CI: 'true' },
    });
    child.stdout.on('data', (data) => chunks.push(data));
    child.stderr.on('data', (data) => chunks.push(data));
    child.on('error', (error) => resolve({ code: 1, output: String(error) }));
    child.on('close', (code) =>
      resolve({ code: code ?? 1, output: Buffer.concat(chunks).toString() }),
    );
  });
}

/** Runs the steps; returns the exit code. `print` takes one line. */
export async function runChecks({ root, from, print = console.log, steps = STEPS }) {
  const started = Date.now();
  for (const step of stepsFrom(from, steps)) {
    const stepStarted = Date.now();
    const { code, output } = await runStep(root, step);
    const seconds = Math.round((Date.now() - stepStarted) / 1000);
    if (code !== 0) {
      for (const line of lastLines(output)) print(line);
      print(`FAILED: ${step.name} (${seconds} s)`);
      return 1;
    }
    const detail = step.summary?.(output);
    print(`${step.name}: ok${detail ? `, ${detail}` : ''} (${seconds} s)`);
  }
  print(`check: all ok (${Math.round((Date.now() - started) / 1000)} s)`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const flag = process.argv.indexOf('--from');
  const from = flag >= 0 ? process.argv[flag + 1] : undefined;
  try {
    process.exitCode = await runChecks({ root, from });
  } catch (error) {
    console.log(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
