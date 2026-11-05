// Hook (.claude/settings.json) for PR descriptions (owner, after PR 169: milestone PRs went out
// with `pr-<N>` links that do not open).
// - PreToolUse: blocks a PR description or GitHub comment that still carries a placeholder for the
//   PR number (scripts/pr-body.mjs says which forms). A new PR therefore opens with a one-line
//   body, and the full description is written once the number is known.
// - PostToolUse on create_pull_request: reminds the session, in its context, to write the full
//   description now with the real number and read it back.
// Only the text that gets published is checked, never file contents.
import { readFileSync } from 'node:fs';
import { COMMENT_PLACEHOLDERS, PR_PLACEHOLDERS, placeholders } from '../../scripts/pr-body.mjs';

const PR_TOOLS = new Set(['mcp__github__create_pull_request', 'mcp__github__update_pull_request']);
const COMMENT_TOOLS = new Set([
  'mcp__github__add_issue_comment',
  'mcp__github__add_reply_to_pull_request_comment',
  'mcp__github__add_comment_to_pending_review',
  'mcp__github__pull_request_review_write',
  'mcp__github__update_issue_comment',
]);

const input = JSON.parse(readFileSync(0, 'utf8'));
const tool = input.tool_name ?? '';
const args = input.tool_input ?? {};

if (input.hook_event_name === 'PostToolUse') {
  if (tool === 'mcp__github__create_pull_request') {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext:
            'PR opened. Next, before anything else: write the full description from the CLAUDE.md ' +
            'template with update_pull_request, every preview link and the review line with this ' +
            "PR's real number, every checklist item of docs/WORKFLOW.md as a full link; then read " +
            'it back (pull_request_read get) and check nothing is missing. The "PR description" ' +
            'CI check fails until it is complete.',
        },
      }),
    );
  }
  process.exit(0);
}

const patterns = PR_TOOLS.has(tool)
  ? PR_PLACEHOLDERS
  : COMMENT_TOOLS.has(tool)
    ? COMMENT_PLACEHOLDERS
    : null;
if (patterns) {
  const text = ['title', 'body']
    .map((key) => args[key])
    .filter((value) => typeof value === 'string')
    .join('\n');
  const hits = placeholders(text, patterns);
  if (hits.length > 0) {
    process.stderr.write(
      `Blocked: the text still has a placeholder for the PR number (${hits.join(', ')}). ` +
        'Put in the real number. For a new PR: open it with a one-line body ("Description ' +
        'follows."), then write the full description with update_pull_request.\n',
    );
    process.exit(2);
  }
}
