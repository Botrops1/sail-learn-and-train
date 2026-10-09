import type { AppState, Store } from './store';
import { realisticParams, serializeUrlState } from './urlState';

/** Debounce for URL updates (PHASE1_SPEC 9.2). */
const URL_UPDATE_DEBOUNCE_MS = 300;

/**
 * Keeps the address bar in sync with the store, using history.replaceState. The rig changes
 * every frame, so only a change of what the URL shows (re)starts the debounce timer. Of the rig,
 * only the jib's furl can show in the URL (`jr`); of Realistic mode, the clutches, winches and
 * station.
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
      state.selection === previous.selection &&
      state.rig.jibSolution.unfurled === previous.rig.jibSolution.unfurled &&
      sameRealisticLink(state, previous)
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

/** Realistic mode changes every frame (drums, reports): compare only what the link stores. */
function sameRealisticLink(state: AppState, previous: AppState): boolean {
  if (state.realistic === previous.realistic) return true;
  return (
    realisticParams(state.realistic).join('&') === realisticParams(previous.realistic).join('&')
  );
}

/** The full link to what is shown now (View tab → Share). */
export function shareLink(state: AppState): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${serializeUrlState(state)}`;
}
