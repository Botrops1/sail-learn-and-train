export const BAD_LINE: RegExp;
export interface QuietLog {
  install(): void;
  begin(name: string): void;
  end(): void;
  say(...args: unknown[]): void;
  counts: { units: number; quiet: number; shown: number };
  restore(): void;
}
export function createQuietLog(options: {
  verbose?: boolean;
  problems: string[];
  print?: (line: string) => void;
}): QuietLog;
