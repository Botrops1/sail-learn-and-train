import { APP_MODES, type AppMode } from '../app/appMode';
import type { Store } from '../app/store';
import { createChipMenu } from './chipMenu';
import { el } from './dom';
import { t } from './i18n';

/**
 * The mode chip ("Easy ▾", PHASE5_SPEC 8.5): first in the chip row. Its menu lists Learn, Easy and
 * Realistic with a line about each. Created with or without WebGL.
 */
export function createModeChip(row: HTMLElement, store: Store): void {
  const view = row.parentElement;
  if (!view) return;

  const label = el('span', { class: 'chip-label' });
  const chip = el(
    'button',
    { type: 'button', class: 'view-chip mode-chip', 'data-testid': 'mode-chip' },
    [label, el('span', { class: 'chip-caret', 'aria-hidden': 'true' }, ['▾'])],
  );
  row.prepend(chip);

  const menu = createChipMenu(
    view,
    chip,
    APP_MODES.map((mode) => ({
      id: mode,
      testId: `mode-option-${mode}`,
      content: [
        el('span', { class: 'mode-option-name' }, [t(`mode.${mode}` as const)]),
        el('span', { class: 'mode-option-hint' }, [t(`mode.${mode}.hint` as const)]),
      ],
    })),
    (id) => store.dispatch({ type: 'setAppMode', mode: id as AppMode }),
    { label: t('mode.label'), testId: 'mode-menu' },
  );

  const sync = (state = store.getState(), previous?: typeof state) => {
    if (previous && state.appMode === previous.appMode) return;
    const name = t(`mode.${state.appMode}` as const);
    label.textContent = name;
    chip.setAttribute('aria-label', t('mode.chip', { name }));
    menu.setChecked(state.appMode);
  };
  store.subscribe(sync);
  sync();
}
