// Quiet output for the browser checks (scripts/shots.mjs). The checks call `console.log` directly;
// while a unit (a scene, a tap sweep, a live group) runs, the lines go into a buffer instead.
// The buffer is printed only if the unit went wrong: a line with WRONG or STOPPED, an HTTP error
// line, or a new entry in `problems` (a console error, a page error, a layout problem).
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
  let current = '';
  let problemsAtStart = 0;
  let installed = false;
  const counts = { units: 0, quiet: 0, shown: 0 };

  function capture(...args) {
    if (buffer) buffer.push(format(...args));
    else out(format(...args));
  }

  return {
    /** Replaces the global console.log for the rest of the run (no-op in verbose mode). */
    install() {
      if (verbose || installed) return;
      installed = true;
      console.log = capture;
    },
    /** Starts a unit: lines are held back until `end`. A unit still open is ended first. */
    begin(name) {
      this.end();
      if (verbose) return;
      buffer = [];
      current = name;
      problemsAtStart = problems.length;
    },
    /** Ends the unit; prints its lines (under its name) only if it went wrong. */
    end() {
      if (!buffer) return;
      const lines = buffer;
      buffer = null;
      counts.units += 1;
      const bad = problems.length > problemsAtStart || lines.some((line) => BAD_LINE.test(line));
      if (!bad) {
        counts.quiet += 1;
        return;
      }
      counts.shown += 1;
      out(`--- ${current}`);
      for (const line of lines) out(line);
    },
    /** Always printed, also inside a unit and in quiet mode. */
    say(...args) {
      out(format(...args));
    },
    counts,
    /** Puts the real console.log back. */
    restore() {
      if (installed) console.log = real;
      installed = false;
    },
  };
}
