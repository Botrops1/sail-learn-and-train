import { describe, expect, it } from 'vitest';
import { UI_STRINGS } from '../src/model/languages';
import { t } from '../src/ui/i18n';

describe('UI strings (content/lang/<code>/ui.json)', () => {
  it('every string of every language is non-empty', () => {
    for (const [code, strings] of Object.entries(UI_STRINGS)) {
      for (const [key, value] of Object.entries(strings)) {
        // trim() removes U+00A0, so the thousands separator only needs a length.
        if (key === 'number.thousandsSeparator')
          expect(value.length, `${code}/${key}`).toBeGreaterThan(0);
        else expect(value.trim(), `${code}/${key}`).not.toBe('');
      }
    }
  });

  it('fills placeholders', () => {
    expect(t('footer.version', { hash: 'abc1234', date: '2026-10-08' })).toBe(
      'Version abc1234 · 2026-10-08',
    );
  });

  it('leaves unknown placeholders visible instead of dropping them', () => {
    expect(t('footer.version', { hash: 'abc1234' })).toBe('Version abc1234 · {date}');
  });
});
