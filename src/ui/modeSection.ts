import { APP_MODES, type AppMode } from '../app/appMode';
import type { Store } from '../app/store';
import { el } from './dom';
import { t } from './i18n';

/**
 * The Mode section (M38, issue #91): on the wide layout the mode picker is the first section of
 * the right column, in place of the mode chip over the 3D view. One button per mode with a
 * description under its name; the current one is checked. Choosing works exactly as the chip's
 * menu does (`setAppMode`). Adding a mode (Harbour, M41) is an entry in `APP_MODES`, its name and
 * its `mode.<id>.desc` strings.
 */
export function createModeSection(store: Store): HTMLElement[] {
  const buttons = APP_MODES.map((mode) => {
    const button = el(
      'button',
      {
        type: 'button',
        class: 'mode-choice',
        role: 'radio',
        'aria-checked': 'false',
        'data-mode': mode,
        'data-testid': `mode-choice-${mode}`,
      },
      [
        el('span', { class: 'mode-option-name' }, [t(`mode.${mode}` as const)]),
        el('span', { class: 'mode-option-hint' }, [t(`mode.${mode}.desc` as const)]),
      ],
    );
    button.addEventListener('click', () => store.dispatch({ type: 'setAppMode', mode }));
    return { mode, button };
  });

  const group = el(
    'div',
    {
      class: 'mode-choices',
      role: 'radiogroup',
      'aria-label': t('mode.label'),
      'data-testid': 'mode-choices',
    },
    buttons.map(({ button }) => button),
  );
  group.addEventListener('keydown', (event) => {
    const index = buttons.findIndex(({ button }) => button === document.activeElement);
    const last = buttons.length - 1;
    let next: number | undefined;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight')
      next = index >= last ? 0 : index + 1;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft')
      next = index <= 0 ? last : index - 1;
    if (next === undefined) return;
    event.preventDefault();
    buttons[next]?.button.focus();
  });

  const sync = (mode: AppMode) => {
    for (const { mode: id, button } of buttons) {
      button.setAttribute('aria-checked', String(id === mode));
    }
  };
  store.subscribe((state, previous) => {
    if (state.appMode !== previous.appMode) sync(state.appMode);
  });
  sync(store.getState().appMode);
  return [group];
}
