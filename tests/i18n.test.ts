import { describe, expect, it } from 'vitest';
import en from '../content/i18n/en.json';
import { t } from '../src/ui/i18n';

describe('UI strings (content/i18n/en.json)', () => {
  it('every string is non-empty', () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value.trim(), key).not.toBe('');
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
