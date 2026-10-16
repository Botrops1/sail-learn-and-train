import type { AppState, Store } from '../app/store';
import { fenderHintShown } from '../model/harbour';
import { el } from './dom';
import { t } from './i18n';

const FENDER_OPTIONS = [
  { value: 'stowed', out: false },
  { value: 'out', out: true },
] as const;

/**
 * The Harbour gear section (M33, PHASE6_SPEC 9.4): the fenders, In the locker or Out, and a hint
 * while they are out and the boat sails. Built like the Held still / Sailing switch.
 */
export function createHarbourPanel(store: Store): HTMLElement[] {
  const options = el('div', { class: 'segments' });
  const inputs = FENDER_OPTIONS.map(({ value, out }) => {
    const input = el('input', {
      type: 'radio',
      name: 'fenders',
      value,
      'data-testid': `fenders-${value}`,
    });
    input.addEventListener('change', () => {
      if (input.checked) store.dispatch({ type: 'setFenders', out });
    });
    options.append(
      el('label', { class: 'segment' }, [input, el('span', {}, [t(`harbour.fenders.${value}`)])]),
    );
    return { out, input };
  });
  const group = el('fieldset', { class: 'field segmented', 'data-testid': 'fenders' }, [
    el('legend', {}, [t('harbour.fenders')]),
    el('p', { class: 'hint explain' }, [t('harbour.fenders.explain')]),
    options,
  ]);
  const hint = el('p', { class: 'hint', 'data-testid': 'fenders-hint' }, [
    t('harbour.fenders.hint'),
  ]);
  const sync = (state: AppState, previous?: AppState) => {
    if (
      previous &&
      state.harbour.fendersOut === previous.harbour.fendersOut &&
      state.boat.mode === previous.boat.mode
    ) {
      return;
    }
    for (const { out, input } of inputs) input.checked = out === state.harbour.fendersOut;
    hint.hidden = !fenderHintShown(state.harbour, state.boat.mode);
  };
  store.subscribe(sync);
  sync(store.getState());
  return [group, hint];
}
