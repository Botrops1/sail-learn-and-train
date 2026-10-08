import type { Store } from './store';
import { serializeUrlState } from './urlState';

/** Debounce for URL updates (PHASE1_SPEC 9.2). */
const URL_UPDATE_DEBOUNCE_MS = 300;

/** Keeps the address bar in sync with the store, using history.replaceState. */
export function startUrlSync(store: Store): void {
  let timer: number | undefined;
  const write = () => {
    const search = serializeUrlState(store.getState());
    if (search !== window.location.search) {
      const url = `${window.location.pathname}${search}${window.location.hash}`;
      window.history.replaceState(null, '', url);
    }
  };
  store.subscribe(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(write, URL_UPDATE_DEBOUNCE_MS);
  });
  write();
}
