import { describe, expect, it } from 'vitest';
import { shouldWelcome } from '../src/ui/welcome';
import en from '../content/lang/en/ui.json';
import ru from '../content/lang/ru/ui.json';

describe('M85 welcome', () => {
  it('shows on a first visit to the bare address only', () => {
    expect(shouldWelcome('', false)).toBe(true);
    expect(shouldWelcome('', true)).toBe(false);
    expect(shouldWelcome('?v=1&m=easy', false)).toBe(false);
    // location.search is '' for a bare address; a lone '?' is not '' and counts as a link.
    expect(shouldWelcome('?', false)).toBe(false);
  });

  it('has its seven strings in en and ru', () => {
    for (const key of ['title', 'body', 'watch', 'look', 'close', 'later', 'again']) {
      const full = `welcome.${key}`;
      expect((en as Record<string, string>)[full], `en ${full}`).toBeTruthy();
      expect((ru as Record<string, string>)[full], `ru ${full}`).toBeTruthy();
    }
  });
});
