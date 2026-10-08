import type { Store } from './store';
import { serializeUrlState } from './urlState';

/** Debounce for URL updates (PHASE1_SPEC 9.2). */
const URL_UPDATE_DEBOUNCE_MS = 300;

/**
 * Keeps the address bar in sync with the store, using history.replaceState. The rig changes
 * every frame, so only a change of what the URL shows (re)starts the debounce timer.
 */
export function startUrlSync(store: Store): void {
  let timer: number | undefined;
  let pending = serializeUrlState(store.getState());
  const write = () => {
    if (pending !== window.location.search) {
      const url = `${window.location.pathname}${pending}${window.location.hash}`;
      window.history.replaceState(null, '', url);
    }
  };
  store.subscribe((state, previous) => {
    if (
      state.controls === previous.controls &&
      state.camera === previous.camera &&
      state.settings === previous.settings &&
      state.selection === previous.selection
    ) {
      return;
    }
    const next = serializeUrlState(state);
    if (next === pending) return;
    pending = next;
    window.clearTimeout(timer);
    timer = window.setTimeout(write, URL_UPDATE_DEBOUNCE_MS);
  });
  write();
}
