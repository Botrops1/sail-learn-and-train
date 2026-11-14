export interface FlakyEntry {
  name: string;
  lines: string[];
}
export function mergeFlaky(records: unknown[]): FlakyEntry[];
export function readRecords(dir: string | undefined): unknown[];
export function summaryMarkdown(flaky: FlakyEntry[]): string;
export function issueTitle(name: string): string;
export function issueBody(entry: FlakyEntry, runUrl: string): string;
export function openIssues(
  flaky: FlakyEntry[],
  runUrl: string,
  run?: (args: string[]) => string,
): void;
