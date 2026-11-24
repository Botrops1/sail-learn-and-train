import { capsized, type AppState, type Store } from '../app/store';
import { boat, isDinghy } from '../model/boat';
import { atBoard } from '../model/dinghy';
import type { CapsizeCommand } from '../model/dinghy';
import { el } from './dom';
import { t } from './i18n';
import { setText } from './stepper';

/**
 * The capsize card (M116, PHASE_DINGHY_SPEC 10.5, 10.8a.8 and 10.8a.9): a box over the 3D view
 * while the dinghy is not upright. It says what to do, in two steps (swim round to the centreboard,
 * stand on it), and the centreboard line with its button when the board is up. Not modal; built
 * only from the state, it dispatches `dinghy` capsize commands.
 */
export function createCapsizeCard(top: HTMLElement, store: Store): void {
  if (!isDinghy()) return;
  const title = el('h3', { class: 'capsize-title', 'data-testid': 'capsize-title' });
  const command = (testid: string, text: string, primary: boolean, c: CapsizeCommand) => {
    const button = el(
      'button',
      {
        type: 'button',
        class: primary ? 'exercise-start' : 'exercise-button',
        'data-testid': testid,
      },
      [text],
    );
    button.addEventListener('click', () =>
      store.dispatch({ type: 'dinghy', command: { kind: 'capsize', command: c } }),
    );
    return button;
  };
  const swim = command('capsize-swim', t('capsize.swim'), true, 'swim');
  const stand = command('capsize-stand', t('capsize.stand'), true, 'stand');
  const boardLine = el('p', { class: 'capsize-board-line', 'data-testid': 'capsize-board-line' }, [
    t('capsize.boardUp'),
  ]);
  const boardButton = command('capsize-board', t('capsize.boardDown'), false, 'boardDown');
  const root = el(
    'section',
    {
      class: 'capsize-card',
      'data-testid': 'capsize-card',
      'aria-label': t('capsize.title'),
      hidden: '',
    },
    [
      title,
      el('div', { class: 'exercise-buttons' }, [swim]),
      boardLine,
      el('div', { class: 'exercise-buttons' }, [boardButton]),
      el('div', { class: 'exercise-buttons' }, [stand]),
      el('p', { class: 'capsize-hint', 'data-testid': 'capsize-hint' }, [t('capsize.hint')]),
    ],
  );
  top.append(root);

  let shown = '';
  const refresh = (state: AppState) => {
    const c = state.dinghy.capsize;
    const over = capsized(state);
    // Only what changes the card's look rebuilds it.
    const boatBoardUp = state.dinghy.boardPct < (boat.dinghy?.capsize.minBoardPct ?? 0);
    const key = over ? `${c.phase}|${atBoard(c)}|${boatBoardUp}` : 'upright';
    if (key === shown) return;
    shown = key;
    if (root.hidden === over) root.hidden = !over;
    if (!over) return;
    setText(title, t(c.phase === 'righting' ? 'capsize.righting' : 'capsize.title'));
    const swimming = c.phase === 'swimming';
    setText(swim, t(swimming ? 'capsize.swimming' : 'capsize.swim'));
    swim.toggleAttribute('disabled', c.phase !== 'over');
    const boardShows = (c.phase === 'over' || swimming) && boatBoardUp;
    boardLine.hidden = !boardShows;
    boardButton.parentElement?.toggleAttribute('hidden', !boardShows);
    boardButton.toggleAttribute('disabled', !boardShows);
    stand.toggleAttribute('disabled', !(swimming && atBoard(c) && !boatBoardUp));
  };
  store.subscribe(refresh);
  refresh(store.getState());
}

/** The "Right the boat first" line at the top of the Ropes, Steering and Balance sections; shown only while she is over. */
export function createCapsizeLockedLine(store: Store): HTMLElement {
  const line = el(
    'p',
    { class: 'hint capsize-locked', 'data-testid': 'capsize-locked', hidden: '' },
    [t('capsize.locked')],
  );
  const refresh = (state: AppState) => {
    const over = capsized(state);
    if (line.hidden === over) line.hidden = !over;
  };
  store.subscribe(refresh);
  refresh(store.getState());
  return line;
}

/**
 * While she is over, the buttons and sliders inside `root` are disabled (10.8a.6), except those
 * `keep` accepts (the centreboard stepper). What it disabled it enables again when she is up.
 */
export function lockWhileCapsized(
  store: Store,
  root: HTMLElement,
  keep: (control: HTMLElement) => boolean = () => false,
): void {
  const locked = new Set<HTMLElement>();
  const refresh = (state: AppState) => {
    const over = capsized(state);
    if (over) {
      for (const control of root.querySelectorAll<HTMLInputElement | HTMLButtonElement>(
        'input, button',
      )) {
        if (control.disabled || keep(control)) continue;
        control.disabled = true;
        locked.add(control);
      }
    } else if (locked.size > 0) {
      for (const control of locked) (control as HTMLButtonElement).disabled = false;
      locked.clear();
    }
  };
  store.subscribe(refresh);
  refresh(store.getState());
}
