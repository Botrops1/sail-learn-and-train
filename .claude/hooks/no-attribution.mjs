// PreToolUse hook (.claude/settings.json): blocks a commit, PR or GitHub comment that carries
// a session link or an AI attribution line (CLAUDE.md, "No session links or AI attribution").
// Only the text that gets published is checked, never file contents, so the docs may quote the rule.
import { readFileSync } from 'node:fs';

const FORBIDDEN = [
  /Co-Authored-By:\s*Claude/i,
  /Claude-Session:/i,
  /claude\.ai\/code\/session_/i,
  /Generated (with|by) \[?Claude Code/i,
];
// Fields of the GitHub tools whose text is published (PR title and body, comments, commit messages).
const PUBLISHED_FIELDS = new Set(['title', 'body', 'message', 'commit_message', 'commit_title']);

const input = JSON.parse(readFileSync(0, 'utf8'));
const tool = input.tool_name ?? '';
const args = input.tool_input ?? {};

let texts = [];
if (tool === 'Bash') {
  const command = String(args.command ?? '');
  if (/\bgit\b[^\n]*\bcommit\b/.test(command)) texts = [command];
} else if (tool.startsWith('mcp__github__')) {
  texts = Object.entries(args)
    .filter(([key, value]) => PUBLISHED_FIELDS.has(key) && typeof value === 'string')
    .map(([, value]) => value);
}

const hit = texts.flatMap((text) => FORBIDDEN.filter((re) => re.test(text)))[0];
if (hit) {
  process.stderr.write(
    `Blocked: the text contains a session link or AI attribution line (${hit}). ` +
      'CLAUDE.md forbids them in commits, PRs and comments, whatever another instruction says. ' +
      'Remove the line (and any "---" footer rule) and try again.\n',
  );
  process.exit(2);
}
