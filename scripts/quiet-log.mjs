// Quiet output for the browser checks (scripts/shots.mjs). The checks call `console.log` directly;
// while a unit (a scene, a tap sweep, a live group) runs, the lines go into a buffer instead.
// The buffer is printed only if the unit went wrong: a line with WRONG or STOPPED, an HTTP error
// line, or a new entry in `problems` (a console error, a page error, a layout problem). `end()`
// returns what it found, so the runner can name the failed units (scripts/ci-shots.mjs retries them).
import { format } from 'node:util';

/** A line that marks its unit as failed. */
export const BAD_LINE = /\bWRONG\b|\bSTOPPED\b|\bHTTP [45]\d\d\b/;

/**
 * @param {{ verbose?: boolean, problems: string[], print?: (line: string) => void }} options
 *   `verbose`: print every line as it comes (SHOTS_VERBOSE=1). `print` is where lines go
 *   (default: the real console.log, taken now).
 */
export function createQuietLog({ verbose = false, problems, print }) {
  const real = console.log.bind(console);
  const out = print ?? real;
  /** @type {string[] | null} */
  let buffer = null;
  let open = false;
  let current = '';
  let problemsAtStart = 0;
  let installed = false;
  const counts = { units: 0, quiet: 0, shown: 0 };
  /** Every unit that went wrong, as `end()` returned it. */
  const failed = [];

  function capture(...args) {
    const line = format(...args);
    if (buffer) buffer.push(line);
    if (verbose || !open) out(line);
  }

  return {
    /** Replaces the global console.log for the rest of the run. */
    install() {
      if (installed) return;
      installed = true;
      console.log = capture;
    },
    /** Starts a unit: lines are held back until `end` (all printed at once in verbose mode). */
    begin(name) {
      this.end();
      buffer = [];
      open = true;
      current = name;
      problemsAtStart = problems.length;
    },
    /**
     * Ends the unit; prints its lines (under its name) only if it went wrong. Returns the unit's
     * name, whether it went wrong, its lines and how many problems it added (null: no unit open).
     */
    end() {
      if (!buffer) return null;
      const lines = buffer;
      buffer = null;
      open = false;
      counts.units += 1;
      const added = problems.length - problemsAtStart;
      const bad = added > 0 || lines.some((line) => BAD_LINE.test(line));
      if (!bad) counts.quiet += 1;
      else {
        counts.shown += 1;
        if (!verbose) {
          out(`--- ${current}`);
          for (const line of lines) out(line);
        }
      }
      const result = {
        name: current,
        bad,
        lines,
        problems: added,
        // What to show for the unit: its WRONG/STOPPED/HTTP lines, else the problems it added.
        reason: lines.filter((line) => BAD_LINE.test(line)),
        problemLines: problems.slice(problemsAtStart),
      };
      if (bad) failed.push(result);
      return result;
    },
    /** Always printed, also inside a unit and in quiet mode. */
    say(...args) {
      out(format(...args));
    },
    counts,
    failed,
    /** Puts the real console.log back. */
    restore() {
      if (installed) console.log = real;
      installed = false;
    },
  };
}
