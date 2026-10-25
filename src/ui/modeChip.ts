import type { Store } from '../app/store';
import { createChipCard, type ChipCard } from './chipCard';
import { el } from './dom';
import { t } from './i18n';
import type { LayoutShell } from './layout';

/**
 * The mode chip (PHASE5_SPEC 8.5; M52, PHASE8_SPEC 10.2): first in the chip row, with or without
 * WebGL. A tap opens the mode card, whose body holds the one mode picker (`panel.ts` puts it
 * there). The label reads "Mode: Easy" on the wide layout and "Easy" on the side layout; on a
 * phone the chip is hidden (the Mode tab does its job). Returns the card.
 */
export function createModeChip(row: HTMLElement, store: Store, layout: LayoutShell): ChipCard {
  const label = el('span', { class: 'chip-label' });
  const chip = el(
    'button',
    { type: 'button', class: 'view-chip mode-chip', 'data-testid': 'mode-chip' },
    [label, el('span', { class: 'chip-caret', 'aria-hidden': 'true' }, ['▾'])],
  );
  row.prepend(chip);
  const card = createChipCard(chip, t('mode.label'), 'mode-card', 'mode-card-title');

  const sync = () => {
    const name = t(`mode.${store.getState().appMode}` as const);
    label.textContent = layout.viewport().wide ? t('mode.section', { name }) : name;
    chip.setAttribute('aria-label', t('mode.chip', { name }));
  };
  store.subscribe((state, previous) => {
    if (state.appMode !== previous.appMode) sync();
  });
  // A layout change closes the card and changes the label.
  let kind = `${layout.viewport().mode}${layout.viewport().wide}`;
  layout.onChange((viewport) => {
    sync();
    const now = `${viewport.mode}${viewport.wide}`;
    if (now !== kind) card.close(false);
    kind = now;
  });
  sync();
  return card;
}
