import { APP_MODES, type AppMode } from '../app/appMode';
import type { Store } from '../app/store';
import { el } from './dom';
import { t } from './i18n';

/**
 * The mode list (M38, issue #91; M51 moved it here from `modeSection.ts`): one button per mode
 * with a description under its name; the current one is checked. Choosing works exactly as the
 * chip's menu does (`setAppMode`), then `onChosen` runs (the phone's Mode tab goes to Controls or
 * Learn). It is the body of the Mode section (the phone's Mode tab and, until M52, the wide
 * layout) and later of the computer's Mode card (M52). Adding a mode (Harbour, M41) is an entry
 * in `APP_MODES`, its name and its `mode.<id>.desc` strings.
 */
export function createModePicker(store: Store, onChosen?: () => void): HTMLElement {
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
    button.addEventListener('click', () => {
      store.dispatch({ type: 'setAppMode', mode });
      onChosen?.();
    });
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
  return group;
}
