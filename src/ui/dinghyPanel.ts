import type { AppState, Store } from '../app/store';
import type { Sit } from '../model/dinghy';
import { createCapsizeLockedLine, lockWhileCapsized } from './capsizePanel';
import { el } from './dom';
import { t, type StringKey } from './i18n';
import { setText, stepButton } from './stepper';

/** The three seats, in the order of the row. */
const SITS: readonly Sit[] = ['in', 'side', 'out'];

/**
 * The Balance section of the Training dinghy (M114, PHASE_DINGHY_SPEC 8.6): where the sailor
 * sits, the centreboard and the outhaul. UI only: it dispatches `dinghy` actions and reads the
 * state. The steppers move by the step size of Settings, and a held button repeats.
 */
export function createDinghyPanel(store: Store): HTMLElement[] {
  const seatButtons = SITS.map((sit) => {
    const button = el(
      'button',
      {
        type: 'button',
        class: 'segment',
        'aria-pressed': 'false',
        'data-testid': `sit-${sit}`,
      },
      [t(`dinghy.sit.${sit}` as StringKey)],
    );
    button.addEventListener('click', () =>
      store.dispatch({ type: 'dinghy', command: { kind: 'sit', sit } }),
    );
    return { sit, button };
  });
  const seats = el('div', { class: 'field', 'data-testid': 'dinghy-sit' }, [
    el('span', { class: 'place-label' }, [t('dinghy.sit.label')]),
    el('div', { class: 'segmented' }, [
      el(
        'div',
        { class: 'segments', role: 'group', 'aria-label': t('dinghy.sit.label') },
        seatButtons.map((entry) => entry.button),
      ),
    ]),
  ]);
  const seatHint = el('p', { class: 'hint explain' }, [t('dinghy.sit.hint')]);

  /** A − / + block with a value line and a hint; the steppers move by the step size. */
  function stepperBlock(
    name: 'board' | 'outhaul',
    kinds: { less: StringKey; more: StringKey },
    valueKey: StringKey,
    read: (state: AppState) => number,
  ): { block: HTMLElement; value: HTMLElement; sync(state: AppState): void } {
    const nudge = (direction: -1 | 1) => {
      const state = store.getState();
      store.dispatch({
        type: 'dinghy',
        command: { kind: name, pct: read(state) + direction * state.settings.step },
      });
    };
    const value = el('span', { class: 'control-value', 'data-testid': `dinghy-${name}-value` });
    const minus = stepButton('−', t(kinds.less), () => nudge(-1));
    minus.dataset.testid = `dinghy-${name}-minus`;
    const plus = stepButton('+', t(kinds.more), () => nudge(1));
    plus.dataset.testid = `dinghy-${name}-plus`;
    const block = el('div', { class: 'control', 'data-testid': `dinghy-${name}` }, [
      el('div', { class: 'control-head' }, [
        el('span', { class: 'control-name' }, [t(`dinghy.${name}.label` as StringKey)]),
        value,
      ]),
      el('div', { class: 'control-row' }, [minus, el('div', { class: 'control-fill' }), plus]),
      el('p', { class: 'hint explain' }, [t(`dinghy.${name}.hint` as StringKey)]),
    ]);
    return {
      block,
      value,
      sync(state) {
        setText(value, t(valueKey, { pct: read(state) }));
      },
    };
  }

  const board = stepperBlock(
    'board',
    { less: 'dinghy.board.raise', more: 'dinghy.board.lower' },
    'dinghy.board.value',
    (state) => state.dinghy.boardPct,
  );
  const outhaul = stepperBlock(
    'outhaul',
    { less: 'dinghy.outhaul.haul', more: 'dinghy.outhaul.ease' },
    'dinghy.outhaul.value',
    (state) => state.dinghy.outhaulPct,
  );

  const sync = (state: AppState) => {
    for (const { sit, button } of seatButtons) {
      const pressed = String(state.dinghy.sit === sit);
      if (button.getAttribute('aria-pressed') !== pressed)
        button.setAttribute('aria-pressed', pressed);
    }
    board.sync(state);
    outhaul.sync(state);
  };
  store.subscribe(sync);
  sync(store.getState());
  // M116: while she is over the seat and the outhaul are locked; the board stepper is not.
  lockWhileCapsized(store, seats);
  lockWhileCapsized(store, outhaul.block);
  return [createCapsizeLockedLine(store), seats, seatHint, board.block, outhaul.block];
}
