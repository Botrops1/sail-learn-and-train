import type { AppState, Store } from '../app/store';
import { el } from './dom';
import { t } from './i18n';
import { setText } from './stepper';

/**
 * Pause (PHASE1_SPEC 7.2.2, both modes): a button at the top of the 3D view that freezes time.
 * While paused the user can still set things up (switch stations, open clutches, wrap turns);
 * whatever needs time waits and happens together on Resume. Not stored in the link.
 */
export function createPauseButton(host: HTMLElement, store: Store): HTMLButtonElement {
  const button = el('button', {
    type: 'button',
    class: 'pause-button',
    'data-testid': 'pause-button',
    'aria-pressed': 'false',
  });
  button.addEventListener('click', () =>
    store.dispatch({ type: 'setPaused', paused: !store.getState().paused }),
  );
  host.append(button);
  const refresh = (state: AppState, previous?: AppState) => {
    if (previous && state.paused === previous.paused) return;
    button.setAttribute('aria-pressed', String(state.paused));
    button.classList.toggle('is-paused', state.paused);
    setText(button, t(state.paused ? 'pause.resume' : 'pause.pause'));
    button.setAttribute('aria-label', t(state.paused ? 'pause.resumeAria' : 'pause.pauseAria'));
  };
  store.subscribe(refresh);
  refresh(store.getState());
  return button;
}
