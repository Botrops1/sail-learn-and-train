export const BAD_LINE: RegExp;
export interface QuietUnit {
  name: string;
  bad: boolean;
  lines: string[];
  problems: number;
  reason: string[];
  problemLines: string[];
}
export interface QuietLog {
  install(): void;
  begin(name: string): void;
  end(): QuietUnit | null;
  say(...args: unknown[]): void;
  counts: { units: number; quiet: number; shown: number };
  failed: QuietUnit[];
  restore(): void;
}
export function createQuietLog(options: {
  verbose?: boolean;
  problems: string[];
  print?: (line: string) => void;
}): QuietLog;
