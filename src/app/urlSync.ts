import type { AppState, Store } from './store';
import { clockParam } from '../model/clock';
import { boatParams, parseUrlState, realisticParams, serializeUrlState } from './urlState';

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
  // Back (PHASE4_SPEC 6.5): the link in the address bar is the state to show. `pending` is set
  // first, so the debounced writer does not push the old link back.
  window.addEventListener('popstate', () => {
    const current = store.getState();
    const next = parseUrlState(window.location.search, current.settings.detail);
    pending = window.location.search;
    store.dispatch({
      type: 'load',
      state: {
        ...next,
        settings: {
          ...next.settings,
          detail: current.settings.detail,
          debug: current.settings.debug,
        },
      },
    });
  });
  store.subscribe((state, previous) => {
    if (
      state.controls === previous.controls &&
      state.camera === previous.camera &&
      state.settings === previous.settings &&
      state.sea.setting === previous.sea.setting &&
      state.selection === previous.selection &&
      state.learn === previous.learn &&
      state.rig.jibSolution.unfurled === previous.rig.jibSolution.unfurled &&
      sameClockLink(state, previous) &&
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

/** The clock changes every frame: the link stores it to the minute. */
function sameClockLink(state: AppState, previous: AppState): boolean {
  if (state.clock === previous.clock) return true;
  return clockParam(state.clock.utcMs) === clockParam(previous.clock.utcMs);
}

/** Realistic mode changes every frame (drums, reports): compare only what the link stores. */
function sameRealisticLink(state: AppState, previous: AppState): boolean {
  if (state.realistic === previous.realistic) return true;
  return (
    realisticParams(state.realistic).join('&') === realisticParams(previous.realistic).join('&')
  );
}

/**
 * Opens a "Show me" scene (PHASE4_SPEC 6.5): the current link goes into the browser history first,
 * so the phone's Back button returns to it. Detail, debug and the open entry are kept.
 */
export function openScene(store: Store, query: string): void {
  const state = store.getState();
  const { detail, debug, step, legend, labels } = state.settings;
  const here = `${window.location.pathname}${serializeUrlState(state)}${window.location.hash}`;
  window.history.replaceState(null, '', here);
  window.history.pushState(null, '', here);
  const next = parseUrlState(query, detail);
  store.dispatch({
    type: 'load',
    state: {
      ...next,
      settings: { ...next.settings, detail, debug, step, legend, labels },
      learn: state.learn,
    },
  });
}

/** The full link to what is shown now (View tab → Share). */
export function shareLink(state: AppState): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${serializeUrlState(state)}`;
}
