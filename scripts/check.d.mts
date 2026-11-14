export interface CheckStep {
  name: string;
  bin: string;
  args: string[];
  summary?: (output: string) => string;
}
export const STEPS: CheckStep[];
export const TAIL_LINES: number;
export function lastLines(text: string, count?: number): string[];
export function testSummary(output: string): string;
export function stepsFrom(from: string | undefined, steps?: CheckStep[]): CheckStep[];
export function runChecks(options: {
  root: string;
  from?: string;
  print?: (line: string) => void;
  steps?: CheckStep[];
}): Promise<number>;
