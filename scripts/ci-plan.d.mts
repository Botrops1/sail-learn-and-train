export const PR_CAP_S: number;
export const FULL_CAP_S: number;
export const SCENE_SHARDS: number;
export const RECENT_GROUPS: number;
export const UNKNOWN_GROUP_S: number;
export const GROUP_ALIASES: Record<string, string>;
export function groupOf(name: string): string;
export function liveGroupNames(shotsSource: string): string[];
export function isDocsOnly(files: string[]): boolean;
export type CiPaths = { all: string[]; groups: Record<string, string[]> };
export function pathGroups(files: string[], paths: CiPaths, groups: string[]): string[] | 'all';
export function prGroups(input: {
  title: string;
  body: string;
  groups: string[];
  files?: string[];
  paths?: CiPaths;
}): string[] | 'all';
export function packParts(
  groups: string[],
  times: Record<string, number>,
  capS: number,
): string[][];
export function ciMatrix(input: {
  groups: string[];
  times: Record<string, number>;
  capS: number;
}): { include: { part: string; env: string }[] };
