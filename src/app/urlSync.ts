import type { AppState, Store } from './store';
import { boatParams, realisticParams, serializeUrlState } from './urlState';

/** At most one URL update per this long (PHASE1_SPEC 9.2); the sailing boat changes it all the time. */
const URL_UPDATE_DEBOUNCE_MS = 300;

/**
 * Keeps the address bar in sync with the store, using history.replaceState. The rig changes
 * every frame, so only a change of what the URL shows starts the timer; the latest link is
 * written when it runs out (a boat under way changes it all the time, so the timer is not
 * restarted by every change). Of the rig, only the jib's furl can show in the URL (`jr`); of
 * Realistic mode, the clutches, winches and station; of the boat, the rounded heading, speed,
 * mode and autopilot target.
 */
export function startUrlSync(store: Store): void {
  let timer: number | undefined;
  let pending = serializeUrlState(store.getState());
  const write = () => {
    timer = undefined;
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
      sameRealisticLink(state, previous) &&
      sameBoatLink(state, previous)
    ) {
      return;
    }
    const next = serializeUrlState(state);
    if (next === pending) return;
    pending = next;
    if (timer === undefined) timer = window.setTimeout(write, URL_UPDATE_DEBOUNCE_MS);
  });
  write();
}

/** The boat changes every frame: compare only what the link stores. */
function sameBoatLink(state: AppState, previous: AppState): boolean {
  if (state.boat === previous.boat && state.autopilot === previous.autopilot) return true;
  return boatParams(state).join('&') === boatParams(previous).join('&');
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
