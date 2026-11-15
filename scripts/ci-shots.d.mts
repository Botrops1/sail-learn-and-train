export interface Failed {
  whole: boolean;
  groups: { name: string; lines: string[] }[];
  problems: string[];
}
export interface FlakyEntry {
  name: string;
  lines: string[];
}
export interface RetryPlan {
  env: Record<string, string>;
  names: string[];
  whole: boolean;
}
export function parseEnv(text: string | undefined): Record<string, string>;
export function readFailed(path: string | undefined): Failed | null;
export function retryPlan(
  partEnv: Record<string, string>,
  partName: string,
  failed: Failed | null,
): RetryPlan;
export function flakyEntries(plan: RetryPlan, failed: Failed | null): FlakyEntry[];
export function escapeCommand(text: string): string;
export function warningLines(entries: FlakyEntry[]): string[];
export function runPart(options: {
  partEnv: Record<string, string>;
  partName: string;
  failedFile: string;
  retryFailedFile: string;
  flakyFile?: string;
  run: (env: Record<string, string>) => number;
  print: (line: string) => void;
}): number;
