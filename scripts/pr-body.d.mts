export const PR_PLACEHOLDERS: RegExp[];
export const COMMENT_PLACEHOLDERS: RegExp[];
export const REQUIRED_SECTIONS: string[];
export function placeholders(text: string, patterns?: RegExp[]): string[];
export function milestoneOf(title: string): string | null;
export function workflowLinks(workflow: string, id: string, number: number): string[];
export function checkPrBody(
  pr: { title: string; body: string | null; number: number },
  workflow?: string,
): string[];
